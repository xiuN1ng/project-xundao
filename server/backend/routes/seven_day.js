const express = require('express');
const router = express.Router();
const path = require('path');

// 数据库连接
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');
let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  initDB();
} catch (e) {
  console.error('[seven_day] DB连接失败:', e.message);
  db = null;
}

function initDB() {
  if (!db) return;
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS seven_day_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL UNIQUE,
        start_date TEXT NOT NULL,
        current_day INTEGER DEFAULT 1,
        task_progress TEXT DEFAULT '{}',
        claimed_days TEXT DEFAULT '[]',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
    console.log('[seven_day] seven_day_progress 表初始化完成');
  } catch (e) {
    console.error('[seven_day] 建表失败:', e.message);
  }
}

// 七日任务配置
const DAY_TASKS = {
  1: [
    { id: 'login', name: '登录游戏', desc: '登录第一天', target: 1, unit: '次', reward: { lingshi: 100, exp: 50 } },
    { id: 'level_5', name: '升至5级', desc: '角色等级达到5级', target: 5, unit: '级', reward: { lingshi: 200, exp: 100 } },
    { id: 'dungeon_1', name: '完成新手副本', desc: '通关新手副本', target: 1, unit: '次', reward: { lingshi: 300, exp: 200 } }
  ],
  2: [
    { id: 'login', name: '登录游戏', desc: '登录第二天', target: 1, unit: '次', reward: { lingshi: 150, exp: 80 } },
    { id: 'arena', name: '挑战竞技场', desc: '完成1次竞技场挑战', target: 1, unit: '次', reward: { lingshi: 250, exp: 150 } },
    { id: 'daily_quest', name: '完成每日任务', desc: '完成1个每日任务', target: 1, unit: '个', reward: { lingshi: 300, exp: 200 } }
  ],
  3: [
    { id: 'login', name: '登录游戏', desc: '登录第三天', target: 1, unit: '次', reward: { lingshi: 200, exp: 100 } },
    { id: 'level_15', name: '升至15级', desc: '角色等级达到15级', target: 15, unit: '级', reward: { lingshi: 400, exp: 300 } },
    { id: 'worldboss', name: '挑战世界BOSS', desc: '挑战世界BOSS', target: 1, unit: '次', reward: { lingshi: 500, exp: 400 } }
  ],
  4: [
    { id: 'login', name: '登录游戏', desc: '登录第四天', target: 1, unit: '次', reward: { lingshi: 250, exp: 120 } },
    { id: 'join_sect', name: '加入宗门', desc: '成功加入一个宗门', target: 1, unit: '次', reward: { lingshi: 400, exp: 300 } },
    { id: 'dungeon_3', name: '挑战副本', desc: '通关3次副本', target: 3, unit: '次', reward: { lingshi: 600, exp: 500 } }
  ],
  5: [
    { id: 'login', name: '登录游戏', desc: '登录第五天', target: 1, unit: '次', reward: { lingshi: 300, exp: 150 } },
    { id: 'level_25', name: '升至25级', desc: '角色等级达到25级', target: 25, unit: '级', reward: { lingshi: 800, exp: 600 } },
    { id: 'daily_quest_5', name: '完成每日任务', desc: '完成5个每日任务', target: 5, unit: '个', reward: { lingshi: 800, exp: 600 } }
  ],
  6: [
    { id: 'login', name: '登录游戏', desc: '登录第六天', target: 1, unit: '次', reward: { lingshi: 400, exp: 200 } },
    { id: 'daily_quest_10', name: '完成每日任务', desc: '完成10个每日任务', target: 10, unit: '个', reward: { lingshi: 1000, exp: 800 } },
    { id: 'abyss', name: '挑战深渊副本', desc: '挑战深渊副本', target: 1, unit: '次', reward: { lingshi: 1000, exp: 800 } }
  ],
  7: [
    { id: 'login', name: '登录游戏', desc: '登录第七天', target: 1, unit: '次', reward: { lingshi: 1000, exp: 500 } },
    { id: 'level_30', name: '升至30级', desc: '角色等级达到30级', target: 30, unit: '级', reward: { lingshi: 2000, exp: 1000 } },
    { id: 'all_daily', name: '完成全部每日任务', desc: '单日完成所有每日任务', target: 1, unit: '次', reward: { lingshi: 3000, exp: 2000 } }
  ]
};

const DAY_BONUS = {
  1: { lingshi: 50 },
  2: { lingshi: 100 },
  3: { lingshi: 200 },
  4: { lingshi: 300 },
  5: { lingshi: 500 },
  6: { lingshi: 800 },
  7: { lingshi: 1500, item: { id: 'seven_day_chest', name: '七日宝箱', count: 1 } }
};

function getShanghaiDateStr() {
  const d = new Date(Date.now() + 8 * 3600000);
  return d.toISOString().split('T')[0];
}

function getDayNum(startDate) {
  if (!startDate) return 1;
  const start = new Date(startDate + 'T00:00:00+08:00');
  const now = new Date(Date.now() + 8 * 3600000);
  const diffMs = now - start;
  const diffDays = Math.floor(diffMs / 86400000);
  return Math.min(7, Math.max(1, diffDays + 1));
}

function initPlayer(playerId) {
  if (!db) return null;
  try {
    const today = getShanghaiDateStr();
    const existing = db.prepare('SELECT * FROM seven_day_progress WHERE player_id = ?').get(playerId);
    if (existing) return existing;

    db.prepare('INSERT INTO seven_day_progress (player_id, start_date, current_day, task_progress, claimed_days) VALUES (?, ?, 1, ?, ?)')
      .run(playerId, today, JSON.stringify({}), JSON.stringify([]));
    return db.prepare('SELECT * FROM seven_day_progress WHERE player_id = ?').get(playerId);
  } catch (e) {
    console.error('[seven_day] initPlayer error:', e.message);
    return null;
  }
}

function getProgress(playerId) {
  const record = initPlayer(playerId);
  if (!record) return { current_day: 1, tasks: {}, claimed_days: [] };

  const taskProgress = JSON.parse(record.task_progress || '{}');
  const claimedDays = JSON.parse(record.claimed_days || '[]');
  const currentDay = getDayNum(record.start_date);

  return {
    player_id: record.player_id,
    start_date: record.start_date,
    current_day: currentDay,
    max_day: 7,
    task_progress: taskProgress,
    claimed_days: claimedDays
  };
}

function updateTaskProgress(playerId, taskId, delta) {
  if (!db) return false;
  try {
    const record = initPlayer(playerId);
    if (!record) return false;

    const taskProgress = JSON.parse(record.task_progress || '{}');
    const currentDay = getDayNum(record.start_date);

    // Update all tasks that match the taskId across current and past days
    for (let day = 1; day <= currentDay; day++) {
      const dayTasks = DAY_TASKS[day] || [];
      const task = dayTasks.find(t => t.id === taskId);
      if (task) {
        const key = `${day}_${taskId}`;
        if (!taskProgress[key]) taskProgress[key] = 0;
        taskProgress[key] = Math.min(taskProgress[key] + delta, task.target);
      }
    }

    const upd = db.prepare("UPDATE seven_day_progress SET task_progress = ?, updated_at = datetime('now') WHERE player_id = ?");
    upd.run(JSON.stringify(taskProgress), playerId);
    return true;
  } catch (e) {
    console.error('[seven_day] updateTaskProgress error:', e.message);
    return false;
  }
}

function areAllTasksComplete(progress, day) {
  const tasks = DAY_TASKS[day] || [];
  const taskProgress = progress.task_progress || {};
  return tasks.every(task => {
    const key = `${day}_${task.id}`;
    return (taskProgress[key] || 0) >= task.target;
  });
}

// Middleware: extract userId
router.use((req, res, next) => {
  const userId = parseInt(req.query.player_id) || parseInt(req.query.userId) ||
    parseInt(req.body && req.body.player_id) || (req.user && req.user.id) || 1;
  req.sevenDayUserId = userId;
  next();
});

// GET /api/seven-day — 获取七日任务状态
router.get('/', (req, res) => {
  const userId = req.sevenDayUserId;
  const progress = getProgress(userId);

  const result = {
    success: true,
    data: {
      current_day: progress.current_day,
      max_day: 7,
      start_date: progress.start_date,
      claimed_days: progress.claimed_days || [],
      days: []
    }
  };

  for (let day = 1; day <= 7; day++) {
    const tasks = DAY_TASKS[day] || [];
    const isUnlocked = day <= progress.current_day;
    const isClaimed = (progress.claimed_days || []).includes(day);
    const isAllComplete = isUnlocked && areAllTasksComplete(progress, day);

    const taskList = tasks.map(task => {
      const key = `${day}_${task.id}`;
      const current = progress.task_progress ? (progress.task_progress[key] || 0) : 0;
      return {
        id: task.id,
        name: task.name,
        desc: task.desc,
        target: task.target,
        current,
        completed: current >= task.target,
        reward: task.reward
      };
    });

    result.data.days.push({
      day,
      isUnlocked,
      isClaimed,
      isAllComplete: isClaimed || isAllComplete,
      canClaim: isUnlocked && isAllComplete && !isClaimed,
      tasks: taskList,
      bonus: DAY_BONUS[day] || {}
    });
  }

  res.json(result);
});

// POST /api/seven-day/progress — 更新任务进度（供外部系统调用）
router.post('/progress', (req, res) => {
  const userId = parseInt(req.body.player_id) || parseInt(req.body.userId) || req.sevenDayUserId;
  const { task_id, delta } = req.body;

  if (!task_id) {
    return res.status(400).json({ success: false, message: '缺少 task_id 参数' });
  }

  const updated = updateTaskProgress(userId, task_id, delta || 1);
  const progress = getProgress(userId);
  res.json({ success: updated, task_id, current_day: progress.current_day });
});

// POST /api/seven-day/claim — 领取某日奖励
router.post('/claim', (req, res) => {
  const userId = parseInt(req.body.player_id) || parseInt(req.body.userId) || req.sevenDayUserId;
  const day = parseInt(req.body.day);

  if (!day || day < 1 || day > 7) {
    return res.status(400).json({ success: false, message: '无效的天数' });
  }

  try {
    const progress = getProgress(userId);

    if (day > progress.current_day) {
      return res.json({ success: false, message: '该日尚未解锁' });
    }

    if ((progress.claimed_days || []).includes(day)) {
      return res.json({ success: false, message: '该日奖励已领取' });
    }

    if (!areAllTasksComplete(progress, day)) {
      return res.json({ success: false, message: '任务未全部完成' });
    }

    // Mark as claimed
    const claimedDays = [...(progress.claimed_days || []), day];
    const upd = db.prepare("UPDATE seven_day_progress SET claimed_days = ?, updated_at = datetime('now') WHERE player_id = ?");
    upd.run(JSON.stringify(claimedDays), userId);

    // Calculate rewards
    const tasks = DAY_TASKS[day] || [];
    let totalLingshi = 0;
    let totalExp = 0;
    const items = [];

    tasks.forEach(task => {
      totalLingshi += task.reward.lingshi || 0;
      totalExp += task.reward.exp || 0;
    });

    const bonus = DAY_BONUS[day] || {};
    totalLingshi += bonus.lingshi || 0;
    if (bonus.item) {
      items.push(bonus.item);
    }

    // Issue rewards
    if (db && totalLingshi > 0) {
      db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(totalLingshi, userId);
    }

    res.json({
      success: true,
      message: `第${day}日奖励领取成功`,
      rewards: { lingshi: totalLingshi, exp: totalExp, items },
      claimed_days: claimedDays
    });
  } catch (e) {
    console.error('[seven_day] claim error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/seven-day/trigger — 触发任务进度（供外部调用）
router.post('/trigger', (req, res) => {
  const userId = parseInt(req.body.player_id) || parseInt(req.body.userId) || req.sevenDayUserId;
  const { event_type, event_value } = req.body;

  const eventTaskMap = {
    'login': 'login',
    'arena_win': 'arena',
    'worldboss_attack': 'worldboss',
    'join_sect': 'join_sect',
    'abyss_enter': 'abyss',
    'level_up': () => {
      const level = parseInt(event_value) || 1;
      if (level >= 30) return 'level_30';
      if (level >= 25) return 'level_25';
      if (level >= 15) return 'level_15';
      if (level >= 5) return 'level_5';
      return null;
    },
    'daily_quest_complete': () => {
      const count = parseInt(event_value) || 1;
      if (count >= 10) return 'daily_quest_10';
      if (count >= 5) return 'daily_quest_5';
      return 'daily_quest';
    },
    'dungeon_clear': () => {
      const count = parseInt(event_value) || 1;
      if (count >= 3) return 'dungeon_3';
      return 'dungeon_1';
    }
  };

  let taskId = null;
  const mapper = eventTaskMap[event_type];
  if (typeof mapper === 'function') {
    taskId = mapper();
  } else if (typeof mapper === 'string') {
    taskId = mapper;
  }

  if (taskId) {
    updateTaskProgress(userId, taskId, 1);
  }

  const progress = getProgress(userId);
  res.json({ success: true, task_id: taskId, current_day: progress.current_day });
});

module.exports = router;
module.exports.updateTaskProgress = updateTaskProgress;
module.exports.triggerEvent = (userId, eventType, eventValue) => {
  if (!userId) return false;
  try {
    const eventTaskMap = {
      'login': 'login',
      'arena_win': 'arena',
      'worldboss_attack': 'worldboss',
      'join_sect': 'join_sect',
      'abyss_enter': 'abyss',
      'level_up': () => {
        const level = parseInt(eventValue) || 1;
        if (level >= 30) return 'level_30';
        if (level >= 25) return 'level_25';
        if (level >= 15) return 'level_15';
        if (level >= 5) return 'level_5';
        return null;
      },
      'daily_quest_complete': () => 'daily_quest',
      'dungeon_clear': () => 'dungeon_3'
    };

    let taskId = null;
    const mapper = eventTaskMap[eventType];
    if (typeof mapper === 'function') {
      taskId = mapper();
    } else if (typeof mapper === 'string') {
      taskId = mapper;
    }

    if (taskId) updateTaskProgress(userId, taskId, 1);
    return true;
  } catch (e) {
    console.error('[seven_day] triggerEvent error:', e.message);
    return false;
  }
};
