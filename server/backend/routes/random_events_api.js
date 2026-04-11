/**
 * 随机事件与委托任务 API路由
 * P52-4: 随机事件系统 + 委托任务自动刷新
 * 端点: /api/events/*
 */

const express = require('express');
const router = express.Router();
const path = require('path');

let events;
try {
  events = require('../../game/random_events');
} catch (e) {
  events = {
    RANDOM_EVENTS: { events: [] },
    COMMISSION_TASKS: { templates: [] },
    triggerRandomEvent: () => null,
    resolveEventChoice: () => ({ success: false }),
    generateDailyCommissions: () => [],
    checkCommissionProgress: () => ({}),
    getNextCommissionRefresh: () => null
  };
}

const DB_PATH = path.join(__dirname, '..', 'data', 'game.db');
let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
} catch (e) {
  db = { prepare: () => ({ get: () => null, all: () => [], run: () => {} }) };
}

function getPlayerId(req) {
  return req.query.player_id || req.body?.player_id || 1;
}

// ============ 随机事件 ============

// GET /api/events/trigger - 触发随机事件
router.get('/trigger', (req, res) => {
  const playerId = getPlayerId(req);

  let player = null;
  try {
    player = db.prepare(`SELECT * FROM players WHERE id = ?`).get(playerId);
  } catch (e) {
    player = { id: playerId, active_events: [], daily_events: [] };
  }

  if (player.active_events && typeof player.active_events === 'string') {
    try { player.active_events = JSON.parse(player.active_events); } catch (e) { player.active_events = []; }
  }
  if (player.daily_events && typeof player.daily_events === 'string') {
    try { player.daily_events = JSON.parse(player.daily_events); } catch (e) { player.daily_events = []; }
  }

  const event = events.triggerRandomEvent(player);

  if (event) {
    try {
      db.prepare(`UPDATE players SET active_events = ?, daily_events = ? WHERE id = ?`).run(
        JSON.stringify(player.active_events), JSON.stringify(player.daily_events), playerId
      );
    } catch (e) {}
    res.json({ code: 0, message: '触发随机事件', data: event });
  } else {
    res.json({ code: 0, message: '本次未触发随机事件', data: null });
  }
});

// GET /api/events/active - 获取活跃事件列表
router.get('/active', (req, res) => {
  const playerId = getPlayerId(req);

  let player = null;
  try {
    player = db.prepare(`SELECT active_events FROM players WHERE id = ?`).get(playerId);
  } catch (e) {
    player = { active_events: '[]' };
  }

  let activeEvents = [];
  try { activeEvents = JSON.parse(player.active_events || '[]'); } catch (e) { activeEvents = []; }

  // 过滤未完成且未过期
  const now = new Date();
  const valid = activeEvents.filter(e => !e.completed && (!e.expiresAt || new Date(e.expiresAt) > now));

  res.json({ code: 0, data: valid });
});

// POST /api/events/choice - 处理事件选择
router.post('/choice', (req, res) => {
  const playerId = getPlayerId(req);
  const { event_id, choice_id } = req.body;

  let player = null;
  try {
    player = db.prepare(`SELECT * FROM players WHERE id = ?`).get(playerId);
  } catch (e) {
    player = { id: playerId, active_events: '[]', stones: 0, exp: 0 };
  }

  if (player.active_events && typeof player.active_events === 'string') {
    try { player.active_events = JSON.parse(player.active_events); } catch (e) { player.active_events = []; }
  }

  const result = events.resolveEventChoice(player, event_id, choice_id);

  if (result.success) {
    try {
      db.prepare(`UPDATE players SET active_events = ?, stones = ?, exp = ? WHERE id = ?`).run(
        JSON.stringify(player.active_events), player.stones || 0, player.exp || 0, playerId
      );
    } catch (e) {}
  }

  res.json({ code: result.success ? 0 : 400, message: result.message, data: result });
});

// GET /api/events/history - 获取事件历史
router.get('/history', (req, res) => {
  const playerId = getPlayerId(req);
  const page = parseInt(req.query.page) || 1;
  const pageSize = Math.min(parseInt(req.query.pageSize) || 20, 50);

  // 从active_events中提取已完成的事件
  let player = null;
  try {
    player = db.prepare(`SELECT daily_events FROM players WHERE id = ?`).get(playerId);
  } catch (e) {
    player = { daily_events: '[]' };
  }

  let history = [];
  try { history = JSON.parse(player.daily_events || '[]'); } catch (e) { history = []; }

  const offset = (page - 1) * pageSize;
  const paged = history.slice(offset, offset + pageSize);

  res.json({ code: 0, data: { history: paged, page, pageSize, total: history.length } });
});

// ============ 委托任务 ============

// GET /api/events/commissions - 获取当日委托任务
router.get('/commissions', (req, res) => {
  const playerId = getPlayerId(req);
  const type = req.query.type || 'daily'; // daily/challenge/weekly

  let commissions = [];
  try {
    commissions = db.prepare(`
      SELECT * FROM player_commissions
      WHERE player_id = ? AND type = ? AND status != 'expired'
      ORDER BY assigned_at DESC
    `).all(playerId, type);
  } catch (e) {
    commissions = [];
  }

  if (commissions.length === 0 && type === 'daily') {
    // 自动生成
    let player = null;
    try {
      player = db.prepare(`SELECT level FROM players WHERE id = ?`).get(playerId);
    } catch (e) {
      player = { level: 1 };
    }
    commissions = events.generateDailyCommissions(player);
    
    // 保存到数据库
    for (const c of commissions) {
      try {
        db.prepare(`
          INSERT INTO player_commissions (player_id, task_id, name, type, target, progress, status, assigned_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(playerId, c.id, c.name, c.type, c.target, 0, 'active');
      } catch (e) {}
    }
  }

  const nextRefresh = events.getNextCommissionRefresh({ level: 1 }, type);
  res.json({ code: 0, data: { commissions, nextRefresh } });
});

// POST /api/events/commissions/refresh - 手动刷新委托任务（消耗道具/灵石）
router.post('/commissions/refresh', (req, res) => {
  const playerId = getPlayerId(req);
  const { type = 'daily' } = req.body;

  const refreshCost = type === 'daily' ? 100 : type === 'challenge' ? 500 : 2000;

  // 检查灵石
  const stones = db.prepare(`SELECT stones FROM players WHERE id = ?`).get(playerId)?.stones || 0;
  if (stones < refreshCost) {
    return res.json({ code: 400, message: `刷新需要${refreshCost}灵石` });
  }

  // 删除旧任务
  try {
    db.prepare(`DELETE FROM player_commissions WHERE player_id = ? AND type = ? AND completed = 0 AND claimed = 0`).run(playerId, type);
    db.prepare(`UPDATE players SET stones = stones - ? WHERE id = ?`).run(refreshCost, playerId);
  } catch (e) {}

  // 生成新任务
  let player = null;
  try {
    player = db.prepare(`SELECT level FROM players WHERE id = ?`).get(playerId);
  } catch (e) {
    player = { level: 1 };
  }

  const newCommissions = events.generateDailyCommissions(player);
  for (const c of newCommissions) {
    try {
      db.prepare(`
        INSERT INTO player_commissions (player_id, task_id, name, type, target, progress, status, assigned_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(playerId, c.id, c.name, c.type, c.target, 0, 'active');
    } catch (e) {}
  }

  res.json({ code: 0, message: `刷新成功（消耗${refreshCost}灵石）`, data: { commissions: newCommissions } });
});

// POST /api/events/commissions/progress - 更新委托任务进度
router.post('/commissions/progress', (req, res) => {
  const playerId = getPlayerId(req);
  const { task_id, new_progress } = req.body;

  let task = null;
  try {
    task = db.prepare(`SELECT * FROM player_commissions WHERE player_id = ? AND task_id = ?`).get(playerId, task_id);
  } catch (e) {
    task = null;
  }

  if (!task) {
    return res.json({ code: 404, message: '委托不存在' });
  }

  const check = events.checkCommissionProgress({ level: 1 }, task_id, new_progress);
  if (!check.updated) {
    return res.json({ code: 400, message: '进度更新失败' });
  }

  try {
    db.prepare(`UPDATE player_commissions SET progress = ? WHERE player_id = ? AND task_id = ?`).run(
      check.progress, playerId, task_id
    );

    if (check.completed) {
      db.prepare(`UPDATE player_commissions SET completed = 1 WHERE player_id = ? AND task_id = ?`).run(playerId, task_id);
    }
  } catch (e) {}

  res.json({ code: 0, data: { progress: check.progress, completed: check.completed } });
});

// POST /api/events/commissions/claim - 领取委托奖励
router.post('/commissions/claim', (req, res) => {
  const playerId = getPlayerId(req);
  const { task_id } = req.body;

  let task = null;
  try {
    task = db.prepare(`SELECT * FROM player_commissions WHERE player_id = ? AND task_id = ? AND completed = 1 AND claimed = 0`).get(playerId, task_id);
  } catch (e) {
    task = null;
  }

  if (!task) {
    return res.json({ code: 400, message: '委托未完成或已领取' });
  }

  // 查找奖励模板
  const template = events.COMMISSION_TASKS.templates.find(t => t.id === task.task_id);
  const reward = template?.reward || { stones: 100, exp: 50 };

  try {
    // 发放奖励
    if (reward.stones) db.prepare(`UPDATE players SET stones = stones + ? WHERE id = ?`).run(reward.stones, playerId);
    if (reward.exp) db.prepare(`UPDATE players SET exp = exp + ? WHERE id = ?`).run(reward.exp, playerId);
    // 标记已领取
    db.prepare(`UPDATE player_commissions SET claimed = 1, claimed_at = datetime('now') WHERE player_id = ? AND task_id = ?`).run(playerId, task_id);
  } catch (e) {}

  res.json({ code: 0, message: '奖励领取成功', data: reward });
});

// GET /api/events/commissions/next-refresh - 获取下次刷新时间
router.get('/commissions/next-refresh', (req, res) => {
  const type = req.query.type || 'daily';
  const next = events.getNextCommissionRefresh({}, type);
  res.json({ code: 0, data: { type, nextRefresh: next } });
});

// ============ 事件/委托配置 ============

// GET /api/events/config - 获取事件和委托配置
router.get('/config', (req, res) => {
  res.json({
    code: 0,
    data: {
      event_trigger: events.RANDOM_EVENTS?.trigger,
      commission_rules: events.COMMISSION_TASKS?.auto_refresh,
      commission_templates: events.COMMISSION_TASKS?.templates?.length || 0
    }
  });
});

module.exports = router;
