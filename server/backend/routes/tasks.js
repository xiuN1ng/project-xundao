/**
 * 任务系统 API - /api/tasks/*
 * 现代化 Express Router 版本
 */

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
  console.log('[tasks] DB连接失败:', e.message);
  db = null;
}

function initDB() {
  if (!db) return;
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT,
        target INTEGER DEFAULT 1,
        reward_type TEXT,
        reward_amount INTEGER DEFAULT 0
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS player_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        task_id TEXT NOT NULL,
        progress INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        claimed INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(player_id, task_id)
      )
    `);

    // 插入默认任务模板（如果不存在）
    const defaultTasks = [
      { id: 'daily_cultivate', name: '每日修炼', description: '修炼1小时', type: 'daily', target: 1, reward_type: 'spirit', reward_amount: 100 },
      { id: 'realm_break', name: '境界突破', description: '突破一次境界', type: 'once', target: 1, reward_type: 'spirit', reward_amount: 500 },
      { id: 'enhance_equipment', name: '强化装备', description: '强化一次装备', type: 'daily', target: 1, reward_type: 'spirit', reward_amount: 50 },
      { id: 'battle_daily', name: '每日战斗', description: '完成10次战斗', type: 'daily', target: 10, reward_type: 'spirit', reward_amount: 200 },
      { id: 'collect_herb', name: '采集灵草', description: '采集5株灵草', type: 'daily', target: 5, reward_type: 'spirit', reward_amount: 80 },
    ];

    const insertStmt = db.prepare(`INSERT OR IGNORE INTO tasks (id, name, description, type, target, reward_type, reward_amount) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    defaultTasks.forEach(t => {
      insertStmt.run(t.id, t.name, t.description, t.type, t.target, t.reward_type, t.reward_amount);
    });

    console.log('[tasks] 任务表初始化完成');
  } catch (e) {
    console.error('[tasks] 建表失败:', e.message);
  }
}

// 统一用户ID提取
function extractUserId(req) {
  return parseInt(req.query.player_id) || parseInt(req.query.userId) || parseInt(req.params.player_id) || 1;
}

// 获取任务列表
router.get('/', (req, res) => {
  try {
    const playerId = extractUserId(req);

    let tasks = [];
    if (db) {
      tasks = db.prepare('SELECT * FROM tasks').all();
    }

    // 获取玩家任务进度
    let playerTasks = {};
    if (db && playerId) {
      const rows = db.prepare('SELECT * FROM player_tasks WHERE player_id = ?').all(playerId);
      rows.forEach(row => {
        playerTasks[row.task_id] = {
          progress: row.progress,
          status: row.status,
          claimed: !!row.claimed
        };
      });
    }

    // 合并任务和玩家进度
    const result = tasks.map(task => ({
      ...task,
      progress: playerTasks[task.id] ? playerTasks[task.id].progress : 0,
      status: playerTasks[task.id] ? playerTasks[task.id].status : 'active',
      claimed: playerTasks[task.id] ? playerTasks[task.id].claimed : false,
      completed: playerTasks[task.id] ? (playerTasks[task.id].progress >= task.target) : false
    }));

    res.json({ success: true, tasks: result });
  } catch (error) {
    console.error('[tasks] / GET error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取玩家任务详情
router.get('/:player_id', (req, res) => {
  try {
    const { player_id } = req.params;
    const playerId = parseInt(player_id) || 1;

    let playerTasks = [];
    if (db) {
      playerTasks = db.prepare('SELECT * FROM player_tasks WHERE player_id = ?').all(playerId);
    }

    res.json({ success: true, tasks: playerTasks });
  } catch (error) {
    console.error('[tasks] /:player_id error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 接受任务
router.post('/:task_id/accept', (req, res) => {
  try {
    const { task_id } = req.params;
    const playerId = extractUserId(req);

    if (!playerId) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }

    if (!db) {
      return res.status(500).json({ success: false, error: '数据库未连接' });
    }

    db.prepare('INSERT OR IGNORE INTO player_tasks (player_id, task_id, progress, status) VALUES (?, ?, 0, "active")').run(playerId, task_id);
    res.json({ success: true, message: '任务已接受' });
  } catch (error) {
    console.error('[tasks] /accept error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 完成任务
router.post('/:task_id/complete', (req, res) => {
  try {
    const { task_id } = req.params;
    const playerId = extractUserId(req);

    if (!db) {
      return res.status(500).json({ success: false, error: '数据库未连接' });
    }

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(task_id);
    if (!task) {
      return res.status(404).json({ success: false, message: '任务不存在' });
    }

    db.prepare('UPDATE player_tasks SET status = "completed" WHERE player_id = ? AND task_id = ?').run(playerId, task_id);
    res.json({ success: true, message: '任务完成', reward: task.reward_amount });
  } catch (error) {
    console.error('[tasks] /complete error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 领取奖励
router.post('/:task_id/claim', (req, res) => {
  try {
    const { task_id } = req.params;
    const playerId = extractUserId(req);

    if (!db) {
      return res.status(500).json({ success: false, error: '数据库未连接' });
    }

    db.prepare('UPDATE player_tasks SET claimed = 1 WHERE player_id = ? AND task_id = ?').run(playerId, task_id);
    res.json({ success: true, message: '奖励已领取' });
  } catch (error) {
    console.error('[tasks] /claim error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 更新任务进度
router.post('/update-progress', (req, res) => {
  try {
    const { player_id, task_id, progress } = req.body;

    if (!db) {
      return res.status(500).json({ success: false, error: '数据库未连接' });
    }

    if (player_id && task_id) {
      db.prepare('UPDATE player_tasks SET progress = ? WHERE player_id = ? AND task_id = ?').run(progress, player_id, task_id);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('[tasks] /update-progress error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
