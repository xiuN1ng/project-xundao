/**
 * 任务触发服务 - quest_trigger_service.js
 * 
 * 监听事件总线上的各类游戏事件，自动更新对应任务进度
 * 
 * 接入事件:
 *   cultivation:start         → daily_quest cultivate
 *   cultivation:breakthrough → daily_quest realm_up + main/side quest realm_breakthrough
 *   chapter:complete         → daily_quest dungeon_clear + main quest chapter_complete
 *   chapter:battle           → daily_quest battle
 *   arena:challenge          → daily_quest arena + side quest arena_battle
 *   forge:make               → side quest forge_success
 *   forge:strengthen         → daily_quest equipment_enhance
 *   dungeon:complete         → side quest dungeon_complete
 *   beast:capture            → side quest beast_capture
 *   sect:join               → side quest sect_join
 *   tribulation:complete     → side quest tribulation_complete
 *   tower:complete           → side quest tower_floor
 *   login                   → daily_quest login
 */

const Logger = {
  info: (...args) => console.log('[questTrigger]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[questTrigger:error]', new Date().toISOString(), ...args),
  warn: (...args) => console.warn('[questTrigger:warn]', new Date().toISOString(), ...args)
};

let eventBus = null;
let questDb = null;
const DB_PATH = require('path').join(__dirname, '..', 'data', 'game.db');

function init() {
  try {
    const Database = require('better-sqlite3');
    questDb = new Database(DB_PATH);
    questDb.pragma('journal_mode = WAL');
    questDb.pragma('busy_timeout = 5000');
    Logger.info('任务触发服务数据库连接成功');
  } catch (err) {
    Logger.error('数据库连接失败:', err.message);
    questDb = null;
  }

  try {
    eventBus = require('./eventBus');
    Logger.info('事件总线加载成功');
  } catch (err) {
    Logger.error('事件总线加载失败:', err.message);
    eventBus = null;
    return;
  }

  // 注册所有事件监听器
  registerListeners();
  Logger.info('任务触发服务初始化完成');
}

function getDailyQuestTemplates() {
  // 每日任务模板（硬编码，确保可用）
  return [
    { id: 1001, type: 'cultivate', title: '修炼', desc: '完成10次修炼', target: 10, category: 'cultivate' },
    { id: 1002, type: 'battle', title: '战斗', desc: '完成5次战斗', target: 5, category: 'battle' },
    { id: 1003, type: 'arena', title: '竞技', desc: '完成3次竞技场挑战', target: 3, category: 'arena' },
    { id: 1004, type: 'dungeon_clear', title: '副本', desc: '完成3个副本', target: 3, category: 'dungeon_clear' },
    { id: 1005, type: 'login', title: '登录', desc: '每日登录1次', target: 1, category: 'login' },
    { id: 1006, type: 'equipment_enhance', title: '强化', desc: '强化装备2次', target: 2, category: 'equipment_enhance' },
    { id: 1007, type: 'realm_up', title: '突破', desc: '完成1次境界突破', target: 1, category: 'realm_up' },
  ];
}

function ensureDailyQuestRecord(userId, questId, category) {
  if (!questDb) return false;
  try {
    const existing = questDb.prepare(
      'SELECT * FROM daily_quest_progress WHERE user_id = ? AND quest_id = ?'
    ).get(userId, questId);
    if (existing) return true;

    questDb.prepare(`
      INSERT OR IGNORE INTO daily_quest_progress (user_id, quest_id, category, progress, target, completed, claimed, date)
      VALUES (?, ?, ?, 0, ?, 0, 0, date('now'))
    `).run(userId, questId, category,
      getDailyQuestTemplates().find(q => q.id === questId)?.target || 1);
    return true;
  } catch (err) {
    // daily_quest_progress 表可能不存在，静默失败
    return false;
  }
}

function updateDailyQuestProgress(userId, category, delta = 1) {
  if (!questDb) return;
  try {
    // 确保表存在
    questDb.exec(`
      CREATE TABLE IF NOT EXISTS daily_quest_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        quest_id INTEGER NOT NULL,
        category TEXT NOT NULL,
        progress INTEGER DEFAULT 0,
        target INTEGER DEFAULT 1,
        completed INTEGER DEFAULT 0,
        claimed INTEGER DEFAULT 0,
        date TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(user_id, quest_id, date)
      )
    `);

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10); // YYYY-MM-DD UTC

    // 查找匹配的每日任务
    const matchingQuest = questDb.prepare(`
      SELECT * FROM daily_quest_progress
      WHERE user_id = ? AND category = ? AND date = ? AND completed = 0
    `).get(userId, category, todayStr);

    if (!matchingQuest) {
      // 尝试用上海时区日期
      const shanghaiDate = new Date(today.getTime() + 8 * 3600 * 1000);
      const shDateStr = shanghaiDate.toISOString().slice(0, 10);
      ensureDailyQuestRecord(userId,
        getDailyQuestTemplates().find(q => q.category === category)?.id || 1,
        category);
    }

    const newProgress = (matchingQuest?.progress || 0) + delta;
    const target = matchingQuest?.target || getDailyQuestTemplates().find(q => q.category === category)?.target || 1;
    const completed = newProgress >= target ? 1 : 0;

    questDb.prepare(`
      UPDATE daily_quest_progress
      SET progress = ?, completed = ?, updated_at = datetime('now')
      WHERE user_id = ? AND category = ? AND date = ?
    `).run(Math.min(newProgress, target), completed, userId, category, todayStr);

    Logger.info(`[dailyQuest] userId=${userId} category=${category} delta=${delta} progress=${newProgress}/${target}`);
  } catch (err) {
    Logger.warn('updateDailyQuestProgress 失败:', err.message);
  }
}

function updateMainQuestProgress(userId, targetType, delta = 1) {
  if (!questDb) return;
  try {
    // 主线/支线/成就任务映射
    const questTypeMap = {
      'realm_breakthrough': [5, 6, 7],     // 筑基/金丹/元婴突破
      'chapter_complete': [1, 2, 3, 4],     // 章节通关
      'arena_battle': [102],                // 竞技场
      'forge_success': [103],               // 锻造
      'beast_capture': [104],               // 灵兽捕捉
      'sect_join': [105],                   // 加入宗门
      'tribulation_complete': [106],       // 渡劫
      'tower_floor': [107],                 // 通天塔
      'dungeon_complete': [101],            // 副本
    };

    const questIds = questTypeMap[targetType] || [];
    if (questIds.length === 0) return;

    for (const questId of questIds) {
      const template = questDb.prepare(`
        SELECT qt.target, qt.reward FROM (
          SELECT 1 as id, 1 as target, '{}' as reward UNION ALL
          SELECT 2, 3, '{}' UNION ALL SELECT 3, 5, '{}' UNION ALL SELECT 4, 10, '{}'
        ) qt WHERE qt.id = ?
      `).get(questId);

      const existing = questDb.prepare(
        'SELECT progress, completed FROM player_quests WHERE player_id = ? AND quest_id = ?'
      ).get(userId, questId);

      if (!existing) {
        // 初始化任务记录
        const targets = { 1: 1, 2: 3, 3: 5, 4: 10, 5: 2, 6: 3, 7: 4, 101: 10, 102: 5, 103: 3, 104: 1, 105: 1, 106: 1, 107: 50 };
        questDb.prepare(`
          INSERT OR IGNORE INTO player_quests (player_id, quest_id, progress, completed, claimed)
          VALUES (?, ?, 0, 0, 0)
        `).run(userId, questId);
      }

      const currentProgress = existing?.progress || 0;
      const target = template?.target || { 1: 1, 2: 3, 3: 5, 4: 10, 5: 2, 6: 3, 7: 4, 101: 10, 102: 5, 103: 3, 104: 1, 105: 1, 106: 1, 107: 50 }[questId] || 1;
      const newProgress = currentProgress + delta;
      const completed = newProgress >= target ? 1 : 0;

      questDb.prepare(`
        UPDATE player_quests SET progress = ?, completed = ?, updated_at = datetime('now')
        WHERE player_id = ? AND quest_id = ?
      `).run(Math.min(newProgress, target), completed, userId, questId);

      Logger.info(`[quest] userId=${userId} questId=${questId} targetType=${targetType} delta=${delta} progress=${newProgress}/${target}`);
    }
  } catch (err) {
    Logger.warn('updateMainQuestProgress 失败:', err.message);
  }
}

function registerListeners() {
  if (!eventBus) {
    Logger.warn('事件总线不可用，跳过监听器注册');
    return;
  }

  // 修炼开始
  eventBus.on('cultivation:start', ({ userId, gain }) => {
    if (!userId) return;
    updateDailyQuestProgress(userId, 'cultivate', 1);
  });

  // 境界突破
  eventBus.on('cultivation:breakthrough', ({ userId, newRealm }) => {
    if (!userId) return;
    updateDailyQuestProgress(userId, 'realm_up', 1);
    updateMainQuestProgress(userId, 'realm_breakthrough', 1);
  });

  // 章节战斗胜利
  eventBus.on('chapter:battle', ({ userId, chapterId }) => {
    if (!userId) return;
    updateDailyQuestProgress(userId, 'battle', 1);
  });

  // 章节通关（BOSS战胜）
  eventBus.on('chapter:complete', ({ userId, chapterId }) => {
    if (!userId) return;
    updateDailyQuestProgress(userId, 'dungeon_clear', 1);
    updateMainQuestProgress(userId, 'chapter_complete', 1);
  });

  // 竞技场挑战
  eventBus.on('arena:challenge', ({ userId, win, combatPower }) => {
    if (!userId) return;
    updateDailyQuestProgress(userId, 'arena', 1);
    updateMainQuestProgress(userId, 'arena_battle', 1);
  });

  // 锻造完成
  eventBus.on('forge:make', ({ userId, recipeId, quality }) => {
    if (!userId) return;
    updateMainQuestProgress(userId, 'forge_success', 1);
  });

  // 装备强化
  eventBus.on('forge:strengthen', ({ userId, equipId, newLevel }) => {
    if (!userId) return;
    updateDailyQuestProgress(userId, 'equipment_enhance', 1);
  });

  // 副本通关
  eventBus.on('dungeon:complete', ({ userId, dungeonId }) => {
    if (!userId) return;
    updateMainQuestProgress(userId, 'dungeon_complete', 1);
  });

  // 灵兽捕捉
  eventBus.on('beast:obtain', ({ userId, beastId }) => {
    if (!userId) return;
    updateMainQuestProgress(userId, 'beast_capture', 1);
  });

  // 登录
  eventBus.on('login', ({ userId }) => {
    if (!userId) return;
    updateDailyQuestProgress(userId, 'login', 1);
  });

  Logger.info('所有事件监听器注册完成');
}

// 自动初始化
init();

module.exports = { updateDailyQuestProgress, updateMainQuestProgress };
