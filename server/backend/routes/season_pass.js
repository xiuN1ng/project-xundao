/**
 * 战令系统 - season_pass.js
 * 赛季制战令系统，支持等级/XP/奖励领取/购买
 *
 * 端点:
 * GET  /                    - 战令概览
 * GET  /status              - 获取玩家战令状态
 * POST /purchase            - 购买战令
 * POST /claim/:level        - 领取指定等级奖励（与前端 claim-reward 对齐）
 * GET  /tasks               - 获取赛季任务列表
 * POST /claim-task          - 领取任务进度奖励
 * POST /add-exp             - 增加战令经验（其他系统调用）
 */

const express = require('express');
const router = express.Router();
const path = require('path');

// 赛季配置（必须在 initDB 之前定义，因为 initDB → initSeasonTasks 依赖它）
const CURRENT_SEASON = {
  id: 1,
  name: '第一赛季·筑基篇',
  start_time: '2026-03-01 00:00:00',
  end_time: '2026-04-30 23:59:59',
  duration_weeks: 4,  // 赛季时长（周）
  theme: '筑基问道'    // 赛季主题
};

// ============================================================
// 赛季通行证2.0 - 4周赛季任务配置
// 每周一个主题，包含该周专属任务和主题奖励
// ============================================================
const SEASON_THEMES = {
  week1: {
    name: '第一周·炼气期',
    theme: '炼气入门',
    start_day: 1,
    end_day: 7,
    theme_reward: { item: '炼气丹', count: 5, description: '炼气丹×5' },
    bonus_exp: 1.2  // 该周经验加成20%
  },
  week2: {
    name: '第二周·筑基期',
    theme: '筑基金丹',
    start_day: 8,
    end_day: 14,
    theme_reward: { item: '筑基丹', count: 3, description: '筑基丹×3' },
    bonus_exp: 1.3  // 该周经验加成30%
  },
  week3: {
    name: '第三周·结丹期',
    theme: '结丹化神',
    start_day: 15,
    end_day: 21,
    theme_reward: { item: '结丹果', count: 2, description: '结丹果×2' },
    bonus_exp: 1.4  // 该周经验加成40%
  },
  week4: {
    name: '第四周·元婴期',
    theme: '元婴渡劫',
    start_day: 22,
    end_day: 28,
    theme_reward: { item: '渡劫符', count: 1, description: '渡劫符×1' },
    bonus_exp: 1.5  // 该周经验加成50%
  }
};

// 赛季任务配置（必须在 initDB 之前定义）
// 新增4周主题任务，每个主题任务有独特奖励
const SEASON_TASKS = {
  // 每周主题任务（Season Pass 2.0新增）
  weekly_theme: [
    // 第一周主题任务
    { key: 'week1_focus_dungeon', name: '【炼气】副本特训', description: '通关副本3次', exp_reward: 150, item_reward: '炼气丹', item_count: 2, target_count: 3, required_level: 0, week: 1 },
    { key: 'week1_focus_arena', name: '【炼气】竞技试炼', description: '竞技场挑战2次', exp_reward: 100, item_reward: '灵石', item_count: 200, target_count: 2, required_level: 0, week: 1 },
    { key: 'week1_focus_gather', name: '【炼气】采集精华', description: '采集药材×5', exp_reward: 80, item_reward: '灵草', item_count: 5, target_count: 5, required_level: 0, week: 1 },
    // 第二周主题任务
    { key: 'week2_focus_dungeon', name: '【筑基】副本特训', description: '通关副本5次', exp_reward: 200, item_reward: '筑基丹', item_count: 2, target_count: 5, required_level: 5, week: 2 },
    { key: 'week2_focus_arena', name: '【筑基】竞技试炼', description: '竞技场挑战3次', exp_reward: 150, item_reward: '灵石', item_count: 300, target_count: 3, required_level: 5, week: 2 },
    { key: 'week2_focus_cultivate', name: '【筑基】功法修炼', description: '修炼功法×10次', exp_reward: 180, item_reward: '经验', item_count: 1000, target_count: 10, required_level: 3, week: 2 },
    // 第三周主题任务
    { key: 'week3_focus_dungeon', name: '【结丹】副本特训', description: '通关副本8次', exp_reward: 300, item_reward: '结丹果', item_count: 1, target_count: 8, required_level: 10, week: 3 },
    { key: 'week3_focus_pvp', name: '【结丹】巅峰对决', description: '竞技场胜利3次', exp_reward: 250, item_reward: '灵石', item_count: 500, target_count: 3, required_level: 8, week: 3 },
    { key: 'week3_focus_sect', name: '【结丹】宗门贡献', description: '完成宗门任务×5', exp_reward: 200, item_reward: '贡献', item_count: 100, target_count: 5, required_level: 5, week: 3 },
    // 第四周主题任务
    { key: 'week4_focus_dungeon', name: '【元婴】副本特训', description: '通关副本10次', exp_reward: 400, item_reward: '渡劫符', item_count: 1, target_count: 10, required_level: 15, week: 4 },
    { key: 'week4_focus_boss', name: '【元婴】 Boss挑战', description: '挑战世界Boss 2次', exp_reward: 350, item_reward: '龙鳞', item_count: 2, target_count: 2, required_level: 12, week: 4 },
    { key: 'week4_focus_realm', name: '【元婴】境界突破', description: '突破境界1次', exp_reward: 500, item_reward: '灵石', item_count: 1000, target_count: 1, required_level: 10, week: 4 },
  ],
  daily: [
    { key: 'daily_login', name: '每日登录', description: '登录游戏', exp_reward: 50, item_reward: '灵石', item_count: 50, target_count: 1, required_level: 0 },
    { key: 'daily_dungeon_1', name: '通关副本×1', description: '完成任意副本1次', exp_reward: 80, item_reward: '灵石', item_count: 100, target_count: 1, required_level: 0 },
    { key: 'daily_dungeon_3', name: '通关副本×3', description: '完成任意副本3次', exp_reward: 150, item_reward: '经验', item_count: 500, target_count: 3, required_level: 5 },
    { key: 'daily_arena_1', name: '竞技场挑战×1', description: '参与竞技场1次', exp_reward: 60, item_reward: '灵石', item_count: 80, target_count: 1, required_level: 0 },
    { key: 'daily_arena_3', name: '竞技场挑战×3', description: '参与竞技场3次', exp_reward: 120, item_reward: 'jade', item_count: 1, target_count: 3, required_level: 8 },
    { key: 'daily_chat', name: '世界频道发言', description: '在世界频道发送一条消息', exp_reward: 30, item_reward: '灵石', item_count: 30, target_count: 1, required_level: 0 },
    { key: 'daily_gather', name: '采集资源×5', description: '采集5次资源点', exp_reward: 70, item_reward: '灵石', item_count: 80, target_count: 5, required_level: 3 },
  ],
  weekly: [
    { key: 'weekly_dungeon_10', name: '本周通关副本×10', description: '本周累计通关副本10次', exp_reward: 300, item_reward: 'fire_crystal', item_count: 2, target_count: 10, required_level: 0 },
    { key: 'weekly_arena_15', name: '本周竞技场×15', description: '本周累计参与竞技场15次', exp_reward: 250, item_reward: 'thunder_crystal', item_count: 1, target_count: 15, required_level: 5 },
    { key: 'weekly_rank_top10', name: '排行榜前10', description: '进入本周排行榜前10名', exp_reward: 500, item_reward: 'spirit_stone', item_count: 1, target_count: 1, required_level: 10 },
    { key: 'weekly_sect_war', name: '参加宗门战', description: '参与一次宗门战', exp_reward: 400, item_reward: 'dragon_scale', item_count: 1, target_count: 1, required_level: 15 },
  ],
  oneTime: [
    { key: 'first_purchase', name: '首次购买战令', description: '购买本赛季战令', exp_reward: 200, item_reward: 'diamonds', item_count: 50, target_count: 1, required_level: 0 },
    { key: 'reach_level_10', name: '达到10级', description: '战令等级达到10级', exp_reward: 300, item_reward: 'spirit_stone', item_count: 2, target_count: 1, required_level: 10 },
    { key: 'reach_level_20', name: '达到20级', description: '战令等级达到20级', exp_reward: 500, item_reward: 'dragon_scale', item_count: 2, target_count: 1, required_level: 20 },
    // Season Pass 2.0 新增成就任务
    { key: 'complete_week1', name: '完成第一周主题', description: '完成第一周所有主题任务', exp_reward: 400, item_reward: '炼气丹', item_count: 5, target_count: 1, required_level: 0 },
    { key: 'complete_week2', name: '完成第二周主题', description: '完成第二周所有主题任务', exp_exp: 500, item_reward: '筑基丹', item_count: 3, target_count: 1, required_level: 5 },
    { key: 'complete_week3', name: '完成第三周主题', description: '完成第三周所有主题任务', exp_reward: 600, item_reward: '结丹果', item_count: 2, target_count: 1, required_level: 10 },
    { key: 'complete_week4', name: '完成第四周主题', description: '完成第四周所有主题任务', exp_reward: 800, item_reward: '渡劫符', item_count: 1, target_count: 1, required_level: 15 },
    { key: 'claim_all_theme_rewards', name: '收集所有主题奖励', description: '领取所有4周的主题奖励', exp_reward: 1000, item_reward: 'diamonds', item_count: 100, target_count: 1, required_level: 0 },
  ]
};

// 数据库连接
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');
let db = null;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  initDB();
} catch (e) {
  console.log('[season_pass] DB连接失败:', e.message);
}

// Redis 缓存
let getSeasonPassTasks, invalidateSeasonPassTasks;
try {
  const cacheMod = require('../utils/cache');
  getSeasonPassTasks = cacheMod.getSeasonPassTasks;
  invalidateSeasonPassTasks = cacheMod.invalidateSeasonPassTasks;
} catch (e) {
  console.warn('[season_pass] 加载Redis缓存模块失败:', e.message);
  getSeasonPassTasks = null;
  invalidateSeasonPassTasks = null;
}

// ============================================================
// P0-1 修复：服务端鉴权中间件
// 从 req.user.id 获取登录用户ID，禁止从 body/query 接收
// ============================================================
function requireAuth(req, res, next) {
  const userId = req.user && req.user.id;
  if (!userId) {
    return res.status(401).json({ success: false, error: '未登录或登录已过期' });
  }
  req.authUserId = userId;
  next();
}

// ============================================================
// 初始化：建表
// ============================================================
function initDB() {
  if (!db) return;
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS season_pass (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        season_id INTEGER NOT NULL DEFAULT 1,
        level INTEGER NOT NULL DEFAULT 1,
        exp INTEGER NOT NULL DEFAULT 0,
        purchased INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(player_id, season_id)
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS season_pass_claims (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        season_id INTEGER NOT NULL,
        level INTEGER NOT NULL,
        claimed_at TEXT DEFAULT (datetime('now')),
        UNIQUE(player_id, season_id, level)
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS season_pass_seasons (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS season_pass_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_key TEXT NOT NULL UNIQUE,
        season_id INTEGER NOT NULL DEFAULT 1,
        category TEXT NOT NULL DEFAULT 'daily',
        name TEXT NOT NULL,
        description TEXT,
        exp_reward INTEGER NOT NULL DEFAULT 100,
        item_reward TEXT,
        item_count INTEGER DEFAULT 1,
        target_count INTEGER DEFAULT 1,
        required_level INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS season_pass_task_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        season_id INTEGER NOT NULL,
        task_key TEXT NOT NULL,
        progress INTEGER NOT NULL DEFAULT 0,
        completed INTEGER NOT NULL DEFAULT 0,
        claimed INTEGER NOT NULL DEFAULT 0,
        claimed_at TEXT,
        UNIQUE(player_id, season_id, task_key)
      )
    `);

    // 初始化赛季任务
    initSeasonTasks();
  } catch (e) {
    console.log('[season_pass] 建表失败:', e.message);
  }
}

// 战令等级配置 (等级 → {freeExp, premiumExp, rewards})
const SEASON_REWARDS = {
  // 免费档奖励
  free: {
    1: { item: '灵石', count: 100, description: '100灵石' },
    2: { item: '经验', count: 500, description: '500经验' },
    3: { item: 'iron_ingot', count: 5, description: '铁锭×5' },
    4: { item: '灵石', count: 200, description: '200灵石' },
    5: { item: 'jade', count: 2, description: '玉石×2' },
    6: { item: '灵石', count: 300, description: '300灵石' },
    7: { item: 'fire_crystal', count: 1, description: '火晶×1' },
    8: { item: '灵石', count: 400, description: '400灵石' },
    9: { item: '经验', count: 1000, description: '1000经验' },
    10: { item: '灵石', count: 500, description: '500灵石' },
    11: { item: 'iron_ingot', count: 10, description: '铁锭×10' },
    12: { item: '灵石', count: 600, description: '600灵石' },
    13: { item: 'jade', count: 3, description: '玉石×3' },
    14: { item: '灵石', count: 700, description: '700灵石' },
    15: { item: 'refined_iron', count: 2, description: '精炼铁×2' },
    16: { item: '灵石', count: 800, description: '800灵石' },
    17: { item: 'fire_crystal', count: 2, description: '火晶×2' },
    18: { item: '灵石', count: 900, description: '900灵石' },
    19: { item: '经验', count: 2000, description: '2000经验' },
    20: { item: '灵石', count: 1000, description: '1000灵石' },
    21: { item: 'thunder_crystal', count: 1, description: '雷晶×1' },
    22: { item: '灵石', count: 1200, description: '1200灵石' },
    23: { item: 'jade', count: 5, description: '玉石×5' },
    24: { item: '灵石', count: 1400, description: '1400灵石' },
    25: { item: 'dragon_scale', count: 1, description: '龙鳞×1' },
    26: { item: '灵石', count: 1600, description: '1600灵石' },
    27: { item: 'refined_iron', count: 3, description: '精炼铁×3' },
    28: { item: '灵石', count: 1800, description: '1800灵石' },
    29: { item: '经验', count: 3000, description: '3000经验' },
    30: { item: '灵石', count: 2000, description: '2000灵石' }
  },
  // 战令专属奖励 (需购买战令)
  premium: {
    1: { item: 'diamonds', count: 10, description: '钻石×10' },
    2: { item: '灵石', count: 200, description: '200灵石' },
    3: { item: 'fire_essence', count: 1, description: '火焰精华×1' },
    4: { item: '灵石', count: 300, description: '300灵石' },
    5: { item: 'jade', count: 3, description: '玉石×3' },
    6: { item: '灵石', count: 400, description: '400灵石' },
    7: { item: 'fire_crystal', count: 2, description: '火晶×2' },
    8: { item: '灵石', count: 500, description: '500灵石' },
    9: { item: 'thunder_crystal', count: 1, description: '雷晶×1' },
    10: { item: 'spirit_stone', count: 1, description: '魂晶×1' },
    11: { item: '灵石', count: 600, description: '600灵石' },
    12: { item: 'refined_iron', count: 3, description: '精炼铁×3' },
    13: { item: '灵石', count: 700, description: '700灵石' },
    14: { item: 'jade', count: 5, description: '玉石×5' },
    15: { item: 'spirit_stone', count: 2, description: '魂晶×2' },
    16: { item: '灵石', count: 800, description: '800灵石' },
    17: { item: 'fire_essence', count: 2, description: '火焰精华×2' },
    18: { item: '灵石', count: 900, description: '900灵石' },
    19: { item: 'thunder_crystal', count: 2, description: '雷晶×2' },
    20: { item: 'spirit_stone', count: 3, description: '魂晶×3' },
    21: { item: '灵石', count: 1000, description: '1000灵石' },
    22: { item: 'dragon_scale', count: 2, description: '龙鳞×2' },
    23: { item: '灵石', count: 1200, description: '1200灵石' },
    24: { item: 'fire_essence', count: 3, description: '火焰精华×3' },
    25: { item: 'spirit_stone', count: 5, description: '魂晶×5' },
    26: { item: '灵石', count: 1400, description: '1400灵石' },
    27: { item: 'jade', count: 10, description: '玉石×10' },
    28: { item: '灵石', count: 1600, description: '1600灵石' },
    29: { item: 'thunder_crystal', count: 3, description: '雷晶×3' },
    30: { item: '灵石', count: 3000, description: '3000灵石' }
  }
};

// 每级所需经验
const EXP_PER_LEVEL = {
  1: 100, 2: 150, 3: 200, 4: 250, 5: 300,
  6: 350, 7: 400, 8: 450, 9: 500, 10: 600,
  11: 650, 12: 700, 13: 750, 14: 800, 15: 850,
  16: 900, 17: 950, 18: 1000, 19: 1100, 20: 1200,
  21: 1300, 22: 1400, 23: 1500, 24: 1600, 25: 1800,
  26: 2000, 27: 2200, 28: 2400, 29: 2600, 30: 3000
};

// 战令购买价格
const PASS_PRICE = 300; // 钻石

// 任务重置时间配置（UTC）
// daily: 每天 00:00 重置, weekly: 每周一 00:00 重置
function getTaskResetInfo() {
  const now = new Date();
  const utcNow = new Date(now.toISOString());
  const dayOfWeek = utcNow.getUTCDay(); // 0=周日, 1=周一...

  // 下次每日重置
  const nextDaily = new Date(utcNow);
  nextDaily.setUTCHours(0, 0, 0, 0);
  if (utcNow >= nextDaily) nextDaily.setUTCDate(nextDaily.getUTCDate() + 1);

  // 下次每周重置（周一）
  const nextWeekly = new Date(utcNow);
  nextWeekly.setUTCHours(0, 0, 0, 0);
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  nextWeekly.setUTCDate(nextWeekly.getUTCDate() + daysUntilMonday);

  return {
    nextDailyReset: nextDaily.toISOString(),
    nextWeeklyReset: nextWeekly.toISOString(),
    serverTime: utcNow.toISOString()
  };
}

function initSeasonTasks() {
  if (!db) return;
  try {
    const seasonId = CURRENT_SEASON.id;
    
    // 确保表结构支持 week 字段
    try {
      db.exec(`ALTER TABLE season_pass_tasks ADD COLUMN week INTEGER DEFAULT 0`);
    } catch (e) {
      // 列可能已存在，忽略
    }
    
    const insertTask = db.prepare(`
      INSERT OR IGNORE INTO season_pass_tasks (task_key, season_id, category, name, description, exp_reward, item_reward, item_count, target_count, required_level, week)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const [category, tasks] of Object.entries(SEASON_TASKS)) {
      for (const task of tasks) {
        insertTask.run(
          task.key, 
          seasonId, 
          category, 
          task.name, 
          task.description, 
          task.exp_reward, 
          task.item_reward || null, 
          task.item_count || 1, 
          task.target_count, 
          task.required_level || 0,
          task.week || 0
        );
      }
    }
    
    // 初始化赛季主题奖励领取记录表
    db.exec(`
      CREATE TABLE IF NOT EXISTS season_pass_theme_claims (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        season_id INTEGER NOT NULL,
        week INTEGER NOT NULL,
        theme_reward_claimed INTEGER NOT NULL DEFAULT 0,
        claimed_at TEXT,
        UNIQUE(player_id, season_id, week)
      )
    `);
    
    console.log('[season_pass] Season Pass 2.0 任务初始化完成');
  } catch (e) {
    console.log('[season_pass] 初始化任务失败:', e.message);
  }
}

// 更新任务进度（供其他系统调用）
function updateTaskProgress(playerId, taskKey, amount = 1, seasonId = CURRENT_SEASON.id) {
  if (!db) return { updated: false, completed: false, claimed: false };
  try {
    // 获取任务定义
    const taskDef = db.prepare('SELECT * FROM season_pass_tasks WHERE task_key = ? AND season_id = ?').get(taskKey, seasonId);
    if (!taskDef) return { updated: false };

    // 获取或创建进度记录
    let progressRow = db.prepare('SELECT * FROM season_pass_task_progress WHERE player_id = ? AND season_id = ? AND task_key = ?').get(playerId, seasonId, taskKey);

    if (!progressRow) {
      db.prepare('INSERT INTO season_pass_task_progress (player_id, season_id, task_key, progress, completed, claimed) VALUES (?, ?, ?, 0, 0, 0)').run(playerId, seasonId, taskKey);
      progressRow = db.prepare('SELECT * FROM season_pass_task_progress WHERE player_id = ? AND season_id = ? AND task_key = ?').get(playerId, seasonId, taskKey);
    }

    if (progressRow.claimed) return { updated: false, completed: true, claimed: true };
    if (progressRow.completed) return { updated: false, completed: true, claimed: false };

    const newProgress = Math.min(progressRow.progress + amount, taskDef.target_count);
    const isCompleted = newProgress >= taskDef.target_count;

    db.prepare('UPDATE season_pass_task_progress SET progress = ?, completed = ? WHERE player_id = ? AND season_id = ? AND task_key = ?')
      .run(newProgress, isCompleted ? 1 : 0, playerId, seasonId, taskKey);

    return { updated: true, completed: isCompleted, claimed: false, progress: newProgress, target: taskDef.target_count };
  } catch (e) {
    console.log('[season_pass] updateTaskProgress error:', e.message);
    return { updated: false };
  }
}

// 获取玩家任务进度列表
function getPlayerTaskProgress(playerId, seasonId = CURRENT_SEASON.id) {
  if (!db) return [];
  try {
    const rows = db.prepare('SELECT * FROM season_pass_task_progress WHERE player_id = ? AND season_id = ?').all(playerId, seasonId);
    return rows;
  } catch (e) {
    return [];
  }
}

// 获取任务定义列表（带缓存，TTL: 1小时）
async function getSeasonTasksCached(seasonId = CURRENT_SEASON.id) {
  if (getSeasonPassTasks) {
    return getSeasonPassTasks(() =>
      Promise.resolve(
        (() => {
          if (!db) return [];
          try {
            return db.prepare('SELECT * FROM season_pass_tasks WHERE season_id = ?').all(seasonId);
          } catch (e) {
            return [];
          }
        })()
      )
    );
  }
  // 回退：无缓存
  if (!db) return [];
  try {
    return db.prepare('SELECT * FROM season_pass_tasks WHERE season_id = ?').all(seasonId);
  } catch (e) {
    return [];
  }
}

// 获取任务定义列表（同步包装，供内部使用）
function getSeasonTasks(seasonId = CURRENT_SEASON.id) {
  if (!db) return [];
  try {
    return db.prepare('SELECT * FROM season_pass_tasks WHERE season_id = ?').all(seasonId);
  } catch (e) {
    return [];
  }
}

// ============================================================
// 辅助函数
// ============================================================
function getPlayerSeasonData(playerId, seasonId = CURRENT_SEASON.id) {
  if (!db) return null;
  try {
    const stmt = db.prepare('SELECT * FROM season_pass WHERE player_id = ? AND season_id = ?');
    return stmt.get(playerId, seasonId);
  } catch (e) {
    return null;
  }
}

function getOrCreatePlayerSeason(playerId, seasonId = CURRENT_SEASON.id) {
  if (!db) return null;
  let data = getPlayerSeasonData(playerId, seasonId);
  if (!data) {
    try {
      const stmt = db.prepare('INSERT INTO season_pass (player_id, season_id, level, exp, purchased) VALUES (?, ?, 1, 0, 0)');
      stmt.run(playerId, seasonId);
      data = getPlayerSeasonData(playerId, seasonId);
    } catch (e) {
      // 可能已创建
      data = getPlayerSeasonData(playerId, seasonId);
    }
  }
  return data;
}

function isLevelClaimed(playerId, seasonId, level) {
  if (!db) return false;
  try {
    const stmt = db.prepare('SELECT 1 FROM season_pass_claims WHERE player_id = ? AND season_id = ? AND level = ?');
    return !!stmt.get(playerId, seasonId, level);
  } catch (e) {
    return false;
  }
}

function claimLevel(playerId, seasonId, level) {
  if (!db) return false;
  try {
    const stmt = db.prepare('INSERT OR IGNORE INTO season_pass_claims (player_id, season_id, level) VALUES (?, ?, ?)');
    return stmt.run(playerId, seasonId, level).changes > 0;
  } catch (e) {
    return false;
  }
}

function getExpToNextLevel(currentLevel) {
  return EXP_PER_LEVEL[currentLevel] || 1000;
}

function calculateLevelFromExp(totalExp) {
  let level = 1;
  let remaining = totalExp;
  for (let i = 1; i <= 30; i++) {
    const needed = EXP_PER_LEVEL[i] || 1000;
    if (remaining >= needed) {
      remaining -= needed;
      level = i + 1;
    } else {
      break;
    }
  }
  return Math.min(level, 30);
}

// ============================================================
// 路由
// ============================================================

// GET / - 战令概览
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: '战令系统 API',
    season: {
      id: CURRENT_SEASON.id,
      name: CURRENT_SEASON.name,
      start_time: CURRENT_SEASON.start_time,
      end_time: CURRENT_SEASON.end_time
    },
    endpoints: {
      'GET /status': '获取玩家战令状态',
      'GET /tasks': '获取赛季任务列表',
      'POST /purchase': '购买战令 {player_id, diamonds}',
      'POST /claim/:level': '领取指定等级奖励',
      'POST /claim-task': '领取任务进度奖励 {task_key}'
    }
  });
});

// GET /status - 获取玩家战令状态
router.get('/status', requireAuth, (req, res) => {
  const playerId = req.authUserId;
  const seasonId = CURRENT_SEASON.id;

  const data = getOrCreatePlayerSeason(playerId, seasonId);

  if (!data) {
    return res.json({ success: false, message: '无法获取战令数据' });
  }

  // 获取已领取的等级
  const claimedLevels = [];
  if (db) {
    try {
      const stmt = db.prepare('SELECT level FROM season_pass_claims WHERE player_id = ? AND season_id = ?');
      const rows = stmt.all(playerId, seasonId);
      rows.forEach(r => claimedLevels.push(r.level));
    } catch (e) {
      // ignore
    }
  }

  // 计算当前等级
  const currentLevel = data.level;
  const expToNext = getExpToNextLevel(currentLevel);
  const expInCurrentLevel = data.exp % expToNext || data.exp;

  // 构build级奖励列表
  const rewards = [];
  for (let i = 1; i <= 30; i++) {
    const freeReward = SEASON_REWARDS.free[i] || { description: '未知奖励' };
    const premiumReward = SEASON_REWARDS.premium[i] || { description: '未知奖励' };
    rewards.push({
      level: i,
      free: {
        ...freeReward,
        claimed: claimedLevels.includes(i) && !data.purchased ? false : claimedLevels.includes(i),
        available: i <= currentLevel && !claimedLevels.includes(i)
      },
      premium: {
        ...premiumReward,
        claimed: claimedLevels.includes(i) && data.purchased ? true : false,
        available: data.purchased && i <= currentLevel && !claimedLevels.includes(i)
      }
    });
  }

  res.json({
    success: true,
    season: {
      id: CURRENT_SEASON.id,
      name: CURRENT_SEASON.name,
      start_time: CURRENT_SEASON.start_time,
      end_time: CURRENT_SEASON.end_time,
      status: new Date() < new Date(CURRENT_SEASON.end_time) ? 'active' : 'ended'
    },
    player: {
      playerId: data.player_id,
      level: currentLevel,
      exp: data.exp,
      expToNext: expToNext,
      expInCurrentLevel: expInCurrentLevel,
      purchased: !!data.purchased,
      claimedLevels: claimedLevels
    },
    rewards: rewards,
    maxLevel: 30
  });
});

// POST /purchase - 购买战令
router.post('/purchase', requireAuth, (req, res) => {
  const playerId = req.authUserId;
  const diamonds = parseInt(req.body.diamonds || 0);
  const seasonId = CURRENT_SEASON.id;

  if (diamonds < PASS_PRICE) {
    return res.json({ success: false, message: `钻石不足，需要 ${PASS_PRICE} 钻石` });
  }

  const data = getOrCreatePlayerSeason(playerId, seasonId);
  if (!data) {
    return res.json({ success: false, message: '无法获取战令数据' });
  }

  if (data.purchased) {
    return res.json({ success: false, message: '当前赛季已购买战令' });
  }

  // 扣钻石
  if (db) {
    try {
      const updateUser = db.prepare('UPDATE Users SET diamonds = diamonds - ? WHERE id = ? AND diamonds >= ?');
      const result = updateUser.run(PASS_PRICE, playerId, PASS_PRICE);
      if (result.changes === 0) {
        return res.json({ success: false, message: '钻石扣除失败，余额可能不足' });
      }

      // 更新战令购买状态
      const updatePass = db.prepare("UPDATE season_pass SET purchased = 1, updated_at = datetime('now') WHERE player_id = ? AND season_id = ?");
      updatePass.run(playerId, seasonId);
    } catch (e) {
      console.log('[season_pass] 购买失败:', e.message);
      return res.json({ success: false, message: '购买失败: ' + e.message });
    }
  }

  res.json({
    success: true,
    message: '战令购买成功！',
    purchased: true,
    playerId: playerId,
    seasonId: seasonId,
    bonus: SEASON_REWARDS.premium[1]
  });
});

// POST /claim/:level - 领取指定等级奖励（与前端 claim-reward 对齐）
// 此端点移至文件末尾，请参见路由定义处
// POST /add-exp - 增加经验（其他系统调用）
router.post('/add-exp', requireAuth, (req, res) => {
  const playerId = req.authUserId;
  const expGain = parseInt(req.body.exp || 0);
  const seasonId = CURRENT_SEASON.id;

  if (expGain <= 0) {
    return res.json({ success: false, message: '经验值无效' });
  }

  const data = getOrCreatePlayerSeason(playerId, seasonId);
  if (!data) {
    return res.json({ success: false, message: '无法获取战令数据' });
  }

  if (db) {
    try {
      // 增加经验
      const updateExp = db.prepare("UPDATE season_pass SET exp = exp + ?, updated_at = datetime('now') WHERE player_id = ? AND season_id = ?");
      updateExp.run(expGain, playerId, seasonId);

      // 重新获取数据检查是否升级
      const newData = getPlayerSeasonData(playerId, seasonId);
      const newLevel = calculateLevelFromExp(newData.exp);

      let leveledUp = false;
      if (newLevel > data.level) {
        const updateLevel = db.prepare('UPDATE season_pass SET level = ? WHERE player_id = ? AND season_id = ?');
        updateLevel.run(newLevel, playerId, seasonId);
        leveledUp = true;
      }

      res.json({
        success: true,
        expGained: expGain,
        totalExp: newData.exp,
        level: leveledUp ? newLevel : data.level,
        leveledUp: leveledUp
      });
    } catch (e) {
      console.log('[season_pass] 增加经验失败:', e.message);
      res.json({ success: false, message: e.message });
    }
  } else {
    res.json({ success: false, message: '数据库未连接' });
  }
});

// ============================================================
// GET /tasks - 获取赛季任务列表（Season Pass 2.0 增强：含周主题任务）
// ============================================================
router.get('/tasks', requireAuth, async (req, res) => {
  const playerId = req.authUserId;
  const seasonId = CURRENT_SEASON.id;

  const data = getOrCreatePlayerSeason(playerId, seasonId);
  if (!data) {
    return res.json({ success: false, message: '无法获取战令数据' });
  }

  const allTasks = await getSeasonTasksCached(seasonId);
  const progressMap = {};
  const progressList = getPlayerTaskProgress(playerId, seasonId);
  progressList.forEach(p => { progressMap[p.task_key] = p; });

  // 按分类组织任务（Season Pass 2.0 新增 weekly_theme 分类）
  const tasksByCategory = { daily: [], weekly: [], weekly_theme: [], oneTime: [] };
  const resetInfo = getTaskResetInfo();
  
  // 获取当前周
  const currentWeek = getCurrentWeek(CURRENT_SEASON.start_time);
  const currentTheme = getThemeInfo(currentWeek);

  for (const task of allTasks) {
    const prog = progressMap[task.task_key] || { progress: 0, completed: 0, claimed: 0 };
    const canClaim = prog.completed && !prog.claimed;
    const available = data.level >= task.required_level;
    
    // 检查周主题任务的可用性
    let isCurrentWeekTask = false;
    if (task.category === 'weekly_theme') {
      const taskWeek = task.week || 0;
      isCurrentWeekTask = taskWeek === currentWeek;
    }

    const taskEntry = {
      key: task.task_key,
      name: task.name,
      description: task.description,
      category: task.category,
      exp_reward: task.exp_reward,
      item_reward: task.item_reward,
      item_count: task.item_count,
      target_count: task.target_count,
      progress: prog.progress || 0,
      completed: !!prog.completed,
      claimed: !!prog.claimed,
      can_claim: canClaim,
      available: available,
      locked: !available,
      week: task.week || null,
      is_current_week: isCurrentWeekTask
    };

    if (task.category === 'daily') tasksByCategory.daily.push(taskEntry);
    else if (task.category === 'weekly') tasksByCategory.weekly.push(taskEntry);
    else if (task.category === 'weekly_theme') {
      // 只显示当前周的主题任务，除非已完成
      if (isCurrentWeekTask || prog.completed || prog.progress > 0) {
        tasksByCategory.weekly_theme.push(taskEntry);
      }
    }
    else tasksByCategory.oneTime.push(taskEntry);
  }

  res.json({
    success: true,
    player: {
      playerId: playerId,
      level: data.level,
      seasonLevel: data.level
    },
    season_theme: {
      current_week: currentWeek,
      theme: currentTheme,
      all_themes: SEASON_THEMES
    },
    reset_info: resetInfo,
    tasks: tasksByCategory,
    categories: [
      { key: 'daily', name: '每日任务', count: tasksByCategory.daily.length },
      { key: 'weekly', name: '每周任务', count: tasksByCategory.weekly.length },
      { key: 'weekly_theme', name: '周主题任务', count: tasksByCategory.weekly_theme.length },
      { key: 'oneTime', name: '成就任务', count: tasksByCategory.oneTime.length }
    ]
  });
});

// ============================================================
// POST /claim-task - 领取任务进度奖励
// ============================================================
router.post('/claim-task', requireAuth, (req, res) => {
  const playerId = req.authUserId;
  const taskKey = req.body.task_key || req.body.taskKey || '';
  const seasonId = CURRENT_SEASON.id;

  if (!taskKey) {
    return res.json({ success: false, message: '缺少 task_key 参数' });
  }

  const data = getOrCreatePlayerSeason(playerId, seasonId);
  if (!data) {
    return res.json({ success: false, message: '无法获取战令数据' });
  }

  // 获取任务定义
  let taskDef;
  if (db) {
    try {
      taskDef = db.prepare('SELECT * FROM season_pass_tasks WHERE task_key = ? AND season_id = ?').get(taskKey, seasonId);
    } catch (e) {
      return res.json({ success: false, message: '查询任务失败' });
    }
  }

  if (!taskDef) {
    return res.json({ success: false, message: '任务不存在' });
  }

  // 检查等级要求
  if (data.level < taskDef.required_level) {
    return res.json({ success: false, message: `需要战令等级 ${taskDef.required_level} 才能领取此任务奖励` });
  }

  // 检查进度
  let progressRow;
  if (db) {
    try {
      progressRow = db.prepare('SELECT * FROM season_pass_task_progress WHERE player_id = ? AND season_id = ? AND task_key = ?').get(playerId, seasonId, taskKey);
    } catch (e) {
      return res.json({ success: false, message: '查询进度失败' });
    }
  }

  if (!progressRow || !progressRow.completed) {
    return res.json({ success: false, message: '任务未完成，无法领取奖励' });
  }

  if (progressRow.claimed) {
    return res.json({ success: false, message: '该任务奖励已领取' });
  }

  // 标记为已领取
  if (db) {
    try {
      db.prepare("UPDATE season_pass_task_progress SET claimed = 1, claimed_at = datetime('now') WHERE player_id = ? AND season_id = ? AND task_key = ?")
        .run(playerId, seasonId, taskKey);

      // 发放经验奖励（加到战令经验）
      db.prepare("UPDATE season_pass SET exp = exp + ?, updated_at = datetime('now') WHERE player_id = ? AND season_id = ?")
        .run(taskDef.exp_reward, playerId, seasonId);

      // 检查是否升级
      const newData = getPlayerSeasonData(playerId, seasonId);
      const newLevel = calculateLevelFromExp(newData.exp);
      let leveledUp = false;
      if (newLevel > data.level) {
        db.prepare('UPDATE season_pass SET level = ? WHERE player_id = ? AND season_id = ?')
          .run(newLevel, playerId, seasonId);
        leveledUp = true;
      }

      // 发放物品奖励
      let itemGranted = null;
      if (taskDef.item_reward && taskDef.item_count > 0) {
        if (taskDef.item_reward === '灵石') {
          db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(taskDef.item_count, playerId);
          itemGranted = { item: '灵石', count: taskDef.item_count };
        } else if (taskDef.item_reward === '经验') {
          db.prepare("UPDATE season_pass SET exp = exp + ? WHERE player_id = ? AND season_id = ?").run(taskDef.item_count, playerId, seasonId);
          itemGranted = { item: '经验', count: taskDef.item_count };
        } else if (taskDef.item_reward === 'diamonds') {
          db.prepare('UPDATE Users SET diamonds = diamonds + ? WHERE id = ?').run(taskDef.item_count, playerId);
          itemGranted = { item: 'diamonds', count: taskDef.item_count };
        } else {
          // 物品写入 player_items
          try {
            db.prepare(`INSERT INTO player_items (player_id, item_name, item_type, icon, count, source) VALUES (?, ?, ?, ?, ?, ?)`)
              .run(playerId, taskDef.item_reward, taskDef.item_reward, '', taskDef.item_count, 'season_pass_task');
            itemGranted = { item: taskDef.item_reward, count: taskDef.item_count };
          } catch (e) {
            console.log('[season_pass] 发放物品失败:', e.message);
          }
        }
      }

      return res.json({
        success: true,
        message: `成功领取「${taskDef.name}」奖励！`,
        task_key: taskKey,
        exp_reward: taskDef.exp_reward,
        item_reward: itemGranted,
        leveledUp: leveledUp,
        newLevel: leveledUp ? newLevel : data.level,
        playerId: playerId
      });
    } catch (e) {
      console.log('[season_pass] claim-task error:', e.message);
      return res.json({ success: false, message: '领取失败: ' + e.message });
    }
  }

  return res.json({ success: false, message: '数据库未连接' });
});

// ============================================================
// POST /claim/:level - 领取指定等级奖励（与前端 claim-reward 对齐）
// P0-1: 添加鉴权，P0-3: 服务端校验等级和领取状态，P0-4: 添加事务
// ============================================================
router.post('/claim/:level', requireAuth, (req, res) => {
  const playerId = req.authUserId;
  const level = parseInt(req.params.level || req.body.level || 1);
  const seasonId = CURRENT_SEASON.id;

  if (level < 1 || level > 30) {
    return res.json({ success: false, message: '无效的等级' });
  }

  const data = getOrCreatePlayerSeason(playerId, seasonId);
  if (!data) {
    return res.json({ success: false, message: '无法获取战令数据' });
  }

  const currentLevel = data.level;
  if (level > currentLevel) {
    return res.json({ success: false, message: `等级未达到，需要 ${level} 级才能领取` });
  }

  if (isLevelClaimed(playerId, seasonId, level)) {
    return res.json({ success: false, message: '该等级奖励已领取' });
  }

  const freeReward = SEASON_REWARDS.free[level];
  const premiumReward = SEASON_REWARDS.premium[level];

  if (!freeReward) {
    return res.json({ success: false, message: '奖励配置不存在' });
  }

  let rewardItem = freeReward;
  let isPremium = false;

  if (data.purchased && premiumReward) {
    rewardItem = premiumReward;
    isPremium = true;
  }

  // P0-4 修复：使用事务保证原子性（记录领取 + 发放奖励）
  if (!db) {
    return res.json({ success: false, message: '数据库未连接' });
  }

  try {
    const transaction = db.transaction(() => {
      // 再次检查是否已领取（事务内再查防止竞态）
      if (isLevelClaimed(playerId, seasonId, level)) {
        throw new Error('该等级奖励已领取');
      }

      // 标记为已领取
      if (!claimLevel(playerId, seasonId, level)) {
        throw new Error('领取失败，可能已领取');
      }

      // 发放奖励
      if (rewardItem.item === '灵石') {
        db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(rewardItem.count, playerId);
      } else if (rewardItem.item === 'diamonds') {
        db.prepare('UPDATE Users SET diamonds = diamonds + ? WHERE id = ?').run(rewardItem.count, playerId);
      } else if (rewardItem.item === '经验') {
        db.prepare('UPDATE season_pass SET exp = exp + ? WHERE player_id = ? AND season_id = ?').run(rewardItem.count, playerId, seasonId);
      } else {
        db.prepare(`INSERT INTO player_items (player_id, item_name, item_type, icon, count, source) VALUES (?, ?, ?, ?, ?, ?)`)
          .run(playerId, rewardItem.description, rewardItem.item, '', rewardItem.count, 'season_pass');
      }
    });

    transaction();
  } catch (err) {
    return res.json({ success: false, message: err.message });
  }

  res.json({
    success: true,
    message: `成功领取 ${level} 级奖励！`,
    level: level,
    reward: rewardItem,
    isPremium: isPremium,
    playerId: playerId
  });
});

module.exports = router;

// ============================================================
// Season Pass 2.0 新增 API：主题奖励相关
// ============================================================

/**
 * 获取当前赛季主题信息
 */
function getCurrentWeek(seasonStartTime) {
  const now = new Date();
  const start = new Date(seasonStartTime);
  const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  return Math.min(Math.floor(diffDays / 7) + 1, 4);  // 1-4周
}

function getThemeInfo(week) {
  const themes = {
    1: SEASON_THEMES.week1,
    2: SEASON_THEMES.week2,
    3: SEASON_THEMES.week3,
    4: SEASON_THEMES.week4
  };
  return themes[week] || null;
}

/**
 * 检查并返回主题任务列表（带周数信息）
 */
function getWeeklyThemeTasks(week) {
  return SEASON_TASKS.weekly_theme.filter(t => t.week === week);
}

// 在主路由后添加主题相关端点（不通过 router，而是直接挂载）
// 注意：这需要在 module.exports = router 之后添加
// 由于 Express 路由模块化的限制，这里提供一个辅助函数供外部调用

// 导出额外的主题信息
module.exports.getSeasonThemes = function() {
  return SEASON_THEMES;
};

module.exports.getCurrentSeasonTheme = function() {
  const currentWeek = getCurrentWeek(CURRENT_SEASON.start_time);
  return {
    week: currentWeek,
    theme: getThemeInfo(currentWeek),
    allThemes: SEASON_THEMES
  };
};

module.exports.CURRENT_SEASON = CURRENT_SEASON;
module.exports.SEASON_THEMES = SEASON_THEMES;

// ============================================================
// 新增 API: 领取主题奖励
// POST /api/season-pass/claim-theme
// ============================================================
router.post('/claim-theme', requireAuth, (req, res) => {
  const playerId = req.authUserId;
  const week = parseInt(req.body.week || 0);
  const seasonId = CURRENT_SEASON.id;
  
  if (week < 1 || week > 4) {
    return res.json({ success: false, message: '无效的周数' });
  }
  
  // 获取主题信息
  const themeInfo = getThemeInfo(week);
  if (!themeInfo) {
    return res.json({ success: false, message: '主题不存在' });
  }
  
  // 检查是否已领取
  let claimed = false;
  if (db) {
    try {
      const existing = db.prepare('SELECT * FROM season_pass_theme_claims WHERE player_id = ? AND season_id = ? AND week = ?')
        .get(playerId, seasonId, week);
      if (existing && existing.theme_reward_claimed) {
        claimed = true;
      }
    } catch (e) {
      // 表可能不存在，继续
    }
  }
  
  if (claimed) {
    return res.json({ success: false, message: '该周主题奖励已领取' });
  }
  
  // 检查是否满足领取条件（需要达到对应周）
  const currentWeek = getCurrentWeek(CURRENT_SEASON.start_time);
  if (week > currentWeek) {
    return res.json({ success: false, message: '该周主题尚未解锁' });
  }
  
  // 记录领取并发放奖励
  if (db) {
    try {
      // 尝试更新或插入
      db.prepare(`
        INSERT INTO season_pass_theme_claims (player_id, season_id, week, theme_reward_claimed, claimed_at)
        VALUES (?, ?, ?, 1, datetime('now'))
        ON CONFLICT(player_id, season_id, week) DO UPDATE SET theme_reward_claimed = 1, claimed_at = datetime('now')
      `).run(playerId, seasonId, week);
      
      // 发放主题奖励物品
      const reward = themeInfo.theme_reward;
      if (reward && reward.item) {
        if (reward.item === '灵石') {
          db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(reward.count, playerId);
        } else {
          // 其他物品写入 player_items
          db.prepare(`INSERT INTO player_items (player_id, item_name, item_type, icon, count, source) VALUES (?, ?, ?, ?, ?, ?)`)
            .run(playerId, reward.item, reward.item, '', reward.count, 'season_pass_theme');
        }
      }
      
      // 增加经验（带周加成）
      const expBonus = themeInfo.bonus_exp || 1.0;
      const bonusExp = Math.floor(100 * expBonus);
      db.prepare('UPDATE season_pass SET exp = exp + ? WHERE player_id = ? AND season_id = ?')
        .run(bonusExp, playerId, seasonId);
      
      return res.json({
        success: true,
        message: `成功领取第${week}周主题奖励！`,
        week: week,
        theme: themeInfo.name,
        reward: reward,
        bonus_exp: bonusExp
      });
    } catch (e) {
      console.log('[season_pass] claim-theme error:', e.message);
      return res.json({ success: false, message: '领取失败: ' + e.message });
    }
  }
  
  return res.json({ success: false, message: '数据库未连接' });
});
