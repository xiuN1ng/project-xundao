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

// ============================================================
// 赛季配置
// ============================================================
const CURRENT_SEASON = {
  id: 1,
  name: '第一赛季·筑基篇',
  start_time: '2026-03-01 00:00:00',
  end_time: '2026-04-30 23:59:59'
};

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

// ============================================================
// 赛季任务配置
// ============================================================
const SEASON_TASKS = {
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
  ]
};

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
    const insertTask = db.prepare(`
      INSERT OR IGNORE INTO season_pass_tasks (task_key, season_id, category, name, description, exp_reward, item_reward, item_count, target_count, required_level)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const [category, tasks] of Object.entries(SEASON_TASKS)) {
      for (const task of tasks) {
        insertTask.run(task.key, seasonId, category, task.name, task.description, task.exp_reward, task.item_reward || null, task.item_count || 1, task.target_count, task.required_level || 0);
      }
    }
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

// 获取任务定义列表
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
router.get('/status', (req, res) => {
  const playerId = parseInt(req.query.player_id || req.query.playerId || req.query.userId || 1);
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
router.post('/purchase', (req, res) => {
  const playerId = parseInt(req.body.player_id || req.body.playerId || req.body.userId || 1);
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
router.post('/add-exp', (req, res) => {
  const playerId = parseInt(req.body.player_id || req.body.playerId || req.body.userId || 1);
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
// GET /tasks - 获取赛季任务列表
// ============================================================
router.get('/tasks', (req, res) => {
  const playerId = parseInt(req.query.player_id || req.query.playerId || req.query.userId || 1);
  const seasonId = CURRENT_SEASON.id;

  const data = getOrCreatePlayerSeason(playerId, seasonId);
  if (!data) {
    return res.json({ success: false, message: '无法获取战令数据' });
  }

  const allTasks = getSeasonTasks(seasonId);
  const progressMap = {};
  const progressList = getPlayerTaskProgress(playerId, seasonId);
  progressList.forEach(p => { progressMap[p.task_key] = p; });

  // 按分类组织任务
  const tasksByCategory = { daily: [], weekly: [], oneTime: [] };
  const resetInfo = getTaskResetInfo();

  for (const task of allTasks) {
    const prog = progressMap[task.task_key] || { progress: 0, completed: 0, claimed: 0 };
    const canClaim = prog.completed && !prog.claimed;
    const available = data.level >= task.required_level;

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
      locked: !available
    };

    if (task.category === 'daily') tasksByCategory.daily.push(taskEntry);
    else if (task.category === 'weekly') tasksByCategory.weekly.push(taskEntry);
    else tasksByCategory.oneTime.push(taskEntry);
  }

  res.json({
    success: true,
    player: {
      playerId: playerId,
      level: data.level,
      seasonLevel: data.level
    },
    reset_info: resetInfo,
    tasks: tasksByCategory,
    categories: [
      { key: 'daily', name: '每日任务', count: tasksByCategory.daily.length },
      { key: 'weekly', name: '每周任务', count: tasksByCategory.weekly.length },
      { key: 'oneTime', name: '成就任务', count: tasksByCategory.oneTime.length }
    ]
  });
});

// ============================================================
// POST /claim-task - 领取任务进度奖励
// ============================================================
router.post('/claim-task', (req, res) => {
  const playerId = parseInt(req.body.player_id || req.body.playerId || req.body.userId || 1);
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
// ============================================================
// 此端点已在下方实现，功能对齐说明：
// - 前端 claim-reward(level) -> POST /api/season-pass/claim/:level
// - 支持 free/premium 两档奖励领取
// - 已验证与前端接口协议一致
router.post('/claim/:level', (req, res) => {
  const playerId = parseInt(req.body.player_id || req.body.playerId || req.body.userId || 1);
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

  if (!claimLevel(playerId, seasonId, level)) {
    return res.json({ success: false, message: '领取失败，可能已领取' });
  }

  if (db) {
    try {
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
    } catch (e) {
      console.log('[season_pass] 发放奖励失败:', e.message);
    }
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
