/**
 * 任务系统 API - 完整实现
 * 主线任务、支线任务、成就任务
 */
const express = require('express');
const path = require('path');
const router = express.Router();

const Logger = {
  info: (...args) => console.log('[quest]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[quest:error]', new Date().toISOString(), ...args),
  warn: (...args) => console.warn('[quest:warn]', new Date().toISOString(), ...args)
};

// DB path: server/backend/data/game.db
const DB_PATH = path.join(__dirname, '..', 'data', 'game.db');
let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  Logger.info('任务数据库连接成功');
} catch (err) {
  Logger.error('数据库连接失败:', err.message);
  db = null;
}

// ============ 任务模板 ============
const QUEST_TEMPLATES = [
  // 主线任务
  { id: 1, type: 'main', title: '初入仙途', desc: '击败第一章BOSS', target: 1, targetType: 'chapter_complete', reward: { lingshi: 200, exp: 100 }, difficulty: 1 },
  { id: 2, type: 'main', title: '崭露头角', desc: '击败第三章BOSS', target: 3, targetType: 'chapter_complete', reward: { lingshi: 500, exp: 300 }, difficulty: 2 },
  { id: 3, type: 'main', title: '小有名气', desc: '击败第五章BOSS', target: 5, targetType: 'chapter_complete', reward: { lingshi: 1000, exp: 600 }, difficulty: 3 },
  { id: 4, type: 'main', title: '一飞冲天', desc: '击败第十章BOSS', target: 10, targetType: 'chapter_complete', reward: { lingshi: 2000, exp: 1500 }, difficulty: 4 },
  { id: 5, type: 'main', title: '筑基成功', desc: '突破到筑基境', target: 2, targetType: 'realm_breakthrough', reward: { lingshi: 1000, exp: 500 }, difficulty: 2 },
  { id: 6, type: 'main', title: '金丹成就', desc: '突破到金丹境', target: 3, targetType: 'realm_breakthrough', reward: { lingshi: 3000, exp: 2000 }, difficulty: 3 },
  { id: 7, type: 'main', title: '元婴大能', desc: '突破到元婴境', target: 4, targetType: 'realm_breakthrough', reward: { lingshi: 5000, exp: 5000 }, difficulty: 4 },
  // 修炼任务
  { id: 301, type: 'side', title: '初窥门径', desc: '完成10次修炼', target: 10, targetType: 'cultivate', reward: { lingshi: 200, exp: 150 }, difficulty: 1 },
  { id: 302, type: 'side', title: '渐入佳境', desc: '完成50次修炼', target: 50, targetType: 'cultivate', reward: { lingshi: 500, exp: 400 }, difficulty: 2 },
  { id: 303, type: 'side', title: '勤修不辍', desc: '完成200次修炼', target: 200, targetType: 'cultivate', reward: { lingshi: 1500, exp: 1000 }, difficulty: 3 },
  // 支线任务
  { id: 101, type: 'side', title: '初试身手', desc: '完成10次副本挑战', target: 10, targetType: 'dungeon_complete', reward: { lingshi: 300, exp: 200 }, difficulty: 1 },
  { id: 102, type: 'side', title: '竞技新星', desc: '参与5次竞技场挑战', target: 5, targetType: 'arena_battle', reward: { lingshi: 400, exp: 300 }, difficulty: 1 },
  { id: 103, type: 'side', title: '炼器入门', desc: '成功锻造3件装备', target: 3, targetType: 'forge_success', reward: { lingshi: 200, exp: 150 }, difficulty: 1 },
  { id: 104, type: 'side', title: '灵兽相伴', desc: '捕捉一只灵兽', target: 1, targetType: 'beast_capture', reward: { lingshi: 500, exp: 300 }, difficulty: 2 },
  { id: 105, type: 'side', title: '宗门弟子', desc: '加入一个宗门', target: 1, targetType: 'sect_join', reward: { lingshi: 300, exp: 200 }, difficulty: 1 },
  { id: 106, type: 'side', title: '天劫试炼', desc: '成功渡劫1次', target: 1, targetType: 'tribulation_complete', reward: { lingshi: 800, exp: 500 }, difficulty: 3 },
  { id: 107, type: 'side', title: '通天塔主', desc: '通关50层通天塔', target: 50, targetType: 'tower_floor', reward: { lingshi: 2000, exp: 1500 }, difficulty: 4 },
  { id: 108, type: 'side', title: '每日活跃', desc: '完成5个每日任务', target: 5, targetType: 'daily_quest_complete', reward: { lingshi: 200, exp: 100 }, difficulty: 1 },
  // 成就任务
  { id: 201, type: 'achievement', title: '首充玩家', desc: '累计充值100元', target: 1, targetType: 'recharge', reward: { lingshi: 0, vipPoints: 100 }, difficulty: 5 },
  { id: 202, type: 'achievement', title: '富甲一方', desc: '拥有10000灵石', target: 10000, targetType: 'wealth', reward: { lingshi: 0, title: '财神' }, difficulty: 4 },
  { id: 203, type: 'achievement', title: '战力惊天', desc: '战斗力达到50000', target: 50000, targetType: 'combat_power', reward: { lingshi: 0, title: '战圣' }, difficulty: 5 },
];

// ============ 数据库初始化 ============
function initQuestTables() {
  if (!db) return;
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS player_quests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        quest_id INTEGER NOT NULL,
        progress INTEGER DEFAULT 0,
        completed INTEGER DEFAULT 0,
        claimed INTEGER DEFAULT 0,
        accepted_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(player_id, quest_id)
      );
    `);
    Logger.info('任务表初始化成功');
  } catch (err) {
    Logger.error('任务表初始化失败:', err.message);
  }
}

// ============ 辅助函数 ============
function getUserId(req) {
  return parseInt(req.userId || req.query.player_id || req.query.userId || req.body.player_id || req.body.userId || 1);
}

function getQuestTemplate(questId) {
  return QUEST_TEMPLATES.find(q => q.id === questId) || null;
}

// ============ 任务进度更新（供其他模块调用）============
function updateQuestProgressByType(userId, targetType, delta = 1) {
  if (!db) {
    Logger.warn('updateQuestProgressByType: 数据库未连接');
    return { success: false, updated: 0 };
  }
  try {
    // 查找匹配的任务（仅未完成的任务）
    const matchingQuests = db.prepare(`
      SELECT pq.quest_id, pq.progress
      FROM player_quests pq
      JOIN (
        SELECT 1 as id, ? as targetType UNION ALL
        SELECT 2, ? UNION ALL SELECT 3, ? UNION ALL SELECT 4, ? UNION ALL
        SELECT 5, ? UNION ALL SELECT 6, ? UNION ALL SELECT 7, ? UNION ALL
        SELECT 101, ? UNION ALL SELECT 102, ? UNION ALL SELECT 103, ? UNION ALL
        SELECT 104, ? UNION ALL SELECT 105, ? UNION ALL SELECT 106, ? UNION ALL
        SELECT 107, ? UNION ALL SELECT 108, ? UNION ALL SELECT 301, ? UNION ALL SELECT 302, ? UNION ALL SELECT 303, ?
      ) q ON pq.quest_id = q.id
      WHERE pq.player_id = ? AND pq.completed = 0
    `).all(
      targetType, targetType, targetType, targetType,
      targetType, targetType, targetType,
      targetType, targetType, targetType, targetType, targetType, targetType, targetType, targetType, targetType, targetType, targetType,
      userId
    );

    if (matchingQuests.length === 0) {
      return { success: true, updated: 0 };
    }

    let updated = 0;
    for (const mq of matchingQuests) {
      const template = getQuestTemplate(mq.quest_id);
      if (!template) continue;
      // 仅更新 targetType 匹配的任务
      if (template.targetType !== targetType) continue;
      const newProgress = mq.progress + delta;
      const completed = newProgress >= template.target ? 1 : 0;
      db.prepare(`
        UPDATE player_quests SET progress = ?, completed = ?, updated_at = datetime('now')
        WHERE player_id = ? AND quest_id = ?
      `).run(Math.min(newProgress, template.target), completed, userId, mq.quest_id);
      updated++;
    }
    return { success: true, updated };
  } catch (err) {
    Logger.error('updateQuestProgressByType 失败:', err.message);
    return { success: false, error: err.message };
  }
}

// ============ 路由 ============

// GET /api/quest - 获取玩家任务列表
router.get('/', (req, res) => {
  if (!db) return res.status(500).json({ success: false, error: '数据库未连接' });
  try {
    const userId = getUserId(req);
    const { type } = req.query;

    // 获取玩家任务进度
    const playerQuests = db.prepare(`
      SELECT quest_id, progress, completed, claimed, accepted_at FROM player_quests WHERE player_id = ?
    `).all(userId);

    const questMap = {};
    for (const pq of playerQuests) {
      questMap[pq.quest_id] = pq;
    }

    // 过滤任务模板
    let templates = QUEST_TEMPLATES;
    if (type) {
      templates = templates.filter(q => q.type === type);
    }

    const quests = templates.map(q => {
      const pq = questMap[q.id];
      const progress = pq ? pq.progress : 0;
      const completed = pq ? !!pq.completed : false;
      const claimed = pq ? !!pq.claimed : false;
      return {
        questId: q.id,
        type: q.type,
        title: q.title,
        desc: q.desc,
        target: q.target,
        progress: Math.min(progress, q.target),
        completed,
        claimed,
        reward: q.reward,
        difficulty: q.difficulty,
        accepted: !!pq
      };
    });

    // 统计
    const stats = {
      total: quests.length,
      completed: quests.filter(q => q.completed).length,
      claimed: quests.filter(q => q.claimed).length,
      inProgress: quests.filter(q => q.progress > 0 && !q.completed).length
    };

    res.json({ success: true, data: { quests, stats } });
  } catch (err) {
    Logger.error('获取任务列表失败:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 获取任务列表 (GET /list - 等同于 /)
router.get('/list', (req, res) => {
  if (!db) return res.status(500).json({ success: false, error: '数据库未连接' });
  try {
    const userId = getUserId(req);
    const { type } = req.query;

    const playerQuests = db.prepare(`
      SELECT quest_id, progress, completed, claimed, accepted_at FROM player_quests WHERE player_id = ?
    `).all(userId);

    const questMap = {};
    for (const pq of playerQuests) {
      questMap[pq.quest_id] = pq;
    }

    let templates = QUEST_TEMPLATES;
    if (type) {
      templates = templates.filter(q => q.type === type);
    }

    const quests = templates.map(q => {
      const pq = questMap[q.id];
      const progress = pq ? pq.progress : 0;
      const completed = pq ? !!pq.completed : false;
      const claimed = pq ? !!pq.claimed : false;
      return {
        questId: q.id,
        type: q.type,
        title: q.title,
        desc: q.desc,
        target: q.target,
        progress: Math.min(progress, q.target),
        completed,
        claimed,
        reward: q.reward,
        difficulty: q.difficulty,
        accepted: !!pq
      };
    });

    const stats = {
      total: quests.length,
      completed: quests.filter(q => q.completed).length,
      claimed: quests.filter(q => q.claimed).length,
      inProgress: quests.filter(q => q.progress > 0 && !q.completed).length
    };

    res.json({ success: true, data: { quests, stats } });
  } catch (err) {
    Logger.error('GET /list 获取任务列表失败:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/quest/info - 获取特定任务信息
router.get('/info', (req, res) => {
  if (!db) return res.status(500).json({ success: false, error: '数据库未连接' });
  try {
    const userId = getUserId(req);
    const questId = parseInt(req.query.questId || req.query.quest_id);

    if (!questId) {
      return res.status(400).json({ success: false, error: '缺少questId' });
    }

    const template = getQuestTemplate(questId);
    if (!template) {
      return res.status(404).json({ success: false, error: '任务不存在' });
    }

    const pq = db.prepare('SELECT progress, completed, claimed FROM player_quests WHERE player_id = ? AND quest_id = ?').get(userId, questId);

    res.json({
      success: true,
      data: {
        questId: template.id,
        type: template.type,
        title: template.title,
        desc: template.desc,
        target: template.target,
        progress: pq ? pq.progress : 0,
        completed: pq ? !!pq.completed : false,
        claimed: pq ? !!pq.claimed : false,
        reward: template.reward
      }
    });
  } catch (err) {
    Logger.error('获取任务信息失败:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/quest/accept - 接受任务
router.post('/accept', (req, res) => {
  if (!db) return res.status(500).json({ success: false, error: '数据库未连接' });
  try {
    const userId = getUserId(req);
    const questId = parseInt(req.body.questId || req.body.quest_id);

    if (!questId) {
      return res.status(400).json({ success: false, error: '缺少questId' });
    }

    const template = getQuestTemplate(questId);
    if (!template) {
      return res.status(404).json({ success: false, error: '任务不存在' });
    }

    // 检查是否已接受
    const existing = db.prepare('SELECT id FROM player_quests WHERE player_id = ? AND quest_id = ?').get(userId, questId);
    if (existing) {
      return res.status(400).json({ success: false, error: '已接受该任务' });
    }

    db.prepare('INSERT INTO player_quests (player_id, quest_id, progress, completed, claimed) VALUES (?, ?, 0, 0, 0)').run(userId, questId);

    res.json({ success: true, message: '已接受任务', data: { questId, title: template.title } });
  } catch (err) {
    Logger.error('接受任务失败:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/quest/update-progress - 更新任务进度
router.post('/update-progress', (req, res) => {
  if (!db) return res.status(500).json({ success: false, error: '数据库未连接' });
  try {
    const userId = getUserId(req);
    const { questId, targetType, delta = 1 } = req.body;

    if (!targetType) {
      return res.status(400).json({ success: false, error: '缺少targetType' });
    }

    // 查找匹配的任务
    const matchingQuests = db.prepare(`
      SELECT pq.quest_id, pq.progress
      FROM player_quests pq
      JOIN (
        SELECT 1 as id, ? as targetType UNION ALL
        SELECT 2, ? UNION ALL SELECT 3, ? UNION ALL SELECT 4, ? UNION ALL
        SELECT 5, ? UNION ALL SELECT 6, ? UNION ALL SELECT 7, ? UNION ALL
        SELECT 101, ? UNION ALL SELECT 102, ? UNION ALL SELECT 103, ? UNION ALL
        SELECT 104, ? UNION ALL SELECT 105, ? UNION ALL SELECT 106, ? UNION ALL
        SELECT 107, ? UNION ALL SELECT 108, ? UNION ALL SELECT 301, ? UNION ALL SELECT 302, ? UNION ALL SELECT 303, ?
      ) q ON pq.quest_id = q.id
      WHERE pq.player_id = ? AND pq.completed = 0
    `).all(
      targetType, targetType, targetType, targetType,
      targetType, targetType, targetType,
      targetType, targetType, targetType, targetType, targetType, targetType, targetType, targetType, targetType, targetType, targetType,
      userId
    );

    if (matchingQuests.length === 0) {
      return res.json({ success: true, message: '无可更新进度的任务', updated: 0 });
    }

    let updated = 0;
    for (const mq of matchingQuests) {
      const template = getQuestTemplate(mq.quest_id);
      if (!template) continue;
      // 仅更新 targetType 匹配的任务
      if (template.targetType !== targetType) continue;

      const newProgress = mq.progress + delta;
      const completed = newProgress >= template.target ? 1 : 0;

      db.prepare(`
        UPDATE player_quests SET progress = ?, completed = ?, updated_at = datetime('now')
        WHERE player_id = ? AND quest_id = ?
      `).run(Math.min(newProgress, template.target), completed, userId, mq.quest_id);

      updated++;
    }

    res.json({ success: true, message: `已更新${updated}个任务进度`, updated });
  } catch (err) {
    Logger.error('更新任务进度失败:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/quest/claim - 领取任务奖励
router.post('/claim', (req, res) => {
  if (!db) return res.status(500).json({ success: false, error: '数据库未连接' });
  try {
    const userId = getUserId(req);
    const questId = parseInt(req.body.questId || req.body.quest_id);

    if (!questId) {
      return res.status(400).json({ success: false, error: '缺少questId' });
    }

    const template = getQuestTemplate(questId);
    if (!template) {
      return res.status(404).json({ success: false, error: '任务不存在' });
    }

    const pq = db.prepare('SELECT progress, completed, claimed FROM player_quests WHERE player_id = ? AND quest_id = ?').get(userId, questId);
    if (!pq) {
      return res.status(404).json({ success: false, error: '未接受该任务' });
    }
    if (!pq.completed) {
      return res.status(400).json({ success: false, error: '任务未完成，无法领取奖励' });
    }
    if (pq.claimed) {
      return res.status(400).json({ success: false, error: '奖励已领取' });
    }

    // 发放奖励
    const reward = template.reward || {};
    const rewards = [];

    if (reward.lingshi && reward.lingshi > 0) {
      db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(reward.lingshi, userId);
      rewards.push({ type: 'lingshi', amount: reward.lingshi });
    }
    if (reward.exp && reward.exp > 0) {
      // 经验值写入 player 表
      try {
        db.prepare('UPDATE player SET exp = exp + ? WHERE user_id = ?').run(reward.exp, userId);
      } catch (e) { /* player表可能没有exp列 */ }
      rewards.push({ type: 'exp', amount: reward.exp });
    }
    if (reward.title) {
      rewards.push({ type: 'title', value: reward.title });
    }

    // 标记已领取
    db.prepare('UPDATE player_quests SET claimed = 1, updated_at = datetime("now") WHERE player_id = ? AND quest_id = ?').run(userId, questId);

    res.json({
      success: true,
      message: '奖励已领取',
      data: { questId, rewards }
    });
  } catch (err) {
    Logger.error('领取任务奖励失败:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/quest/templates - 获取任务模板列表
router.get('/templates', (req, res) => {
  const { type } = req.query;
  let templates = QUEST_TEMPLATES;
  if (type) {
    templates = templates.filter(q => q.type === type);
  }
  res.json({ success: true, data: templates.map(q => ({
    questId: q.id, type: q.type, title: q.title, desc: q.desc,
    target: q.target, reward: q.reward, difficulty: q.difficulty
  })) });
});

// 初始化
initQuestTables();

module.exports = { router, updateQuestProgressByType };
