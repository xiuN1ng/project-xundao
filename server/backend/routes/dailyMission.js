/**
 * dailyMission.js - 师门日常任务系统
 * P0-2: 实现师门每日任务
 * - GET  /api/daily-mission/list     - 获取当日任务列表
 * - POST /api/daily-mission/accept   - 接受一个任务（每日最多10次）
 * - POST /api/daily-mission/submit   - 提交任务（领取奖励）
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db;
try {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
} catch(e) {
  console.error('[dailyMission] DB error:', e.message);
  db = { prepare: () => ({ run: () => {}, get: () => null, all: () => [] }), close: () => {} };
}

// ============================================================
// 10种任务类型配置
// ============================================================
const MISSION_TYPES = [
  { key: 'deliver_letter',   name: '送信任务',     desc: '为师门送信给指定弟子',           exp: 50,  lingshi: 80,  contribution: 20 },
  { key: 'patrol',           name: '巡逻任务',     desc: '在宗门范围内巡逻一次',            exp: 60,  lingshi: 100, contribution: 25 },
  { key: 'gather',           name: '采集任务',     desc: '采集宗门灵药资源',                exp: 70,  lingshi: 120, contribution: 30 },
  { key: 'kill_monster',    name: '杀怪任务',     desc: '击杀宗门领地内的妖兽',            exp: 80,  lingshi: 150, contribution: 35 },
  { key: 'escort',          name: '护送任务',     desc: '护送物资安全抵达目的地',         exp: 90,  lingshi: 180, contribution: 40 },
  { key: 'mining',          name: '采矿任务',     desc: '前往灵石矿脉采集矿石',           exp: 55,  lingshi: 110, contribution: 22 },
  { key: 'herb_gathering',  name: '采药任务',     desc: '采集宗门灵草药材',               exp: 55,  lingshi: 110, contribution: 22 },
  { key: 'beast_hunt',      name: '猎兽任务',     desc: '狩猎指定妖兽获取兽皮材料',       exp: 85,  lingshi: 160, contribution: 38 },
  { key: 'treasure_seek',   name: '寻宝任务',     desc: '在宗门遗迹中寻找宝物',           exp: 100, lingshi: 200, contribution: 45 },
  { key: 'trial_challenge',  name: '试炼挑战',     desc: '完成师门试炼塔挑战',            exp: 120, lingshi: 250, contribution: 50 },
];

// 初始化表
try {
  db.exec(`CREATE TABLE IF NOT EXISTS sect_daily_missions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id TEXT NOT NULL,
    mission_date TEXT NOT NULL,
    mission_key TEXT NOT NULL,
    mission_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'accepted',
    progress INTEGER NOT NULL DEFAULT 0,
    target INTEGER NOT NULL DEFAULT 1,
    reward_lingshi INTEGER NOT NULL DEFAULT 0,
    reward_contribution INTEGER NOT NULL DEFAULT 0,
    reward_exp INTEGER NOT NULL DEFAULT 0,
    completed_at INTEGER,
    UNIQUE(player_id, mission_date, mission_key)
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS sect_daily_stats (
    player_id TEXT PRIMARY KEY,
    accept_count INTEGER NOT NULL DEFAULT 0,
    complete_count INTEGER NOT NULL DEFAULT 0,
    last_date TEXT NOT NULL
  )`);
} catch(e) {
  console.error('[dailyMission] table init error:', e.message);
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getPlayerId(req) {
  return String(req.userId || req.query.userId || req.body?.userId || 1);
}

function ensureTodayStats(playerId) {
  const today = getToday();
  let stats = db.prepare('SELECT * FROM sect_daily_stats WHERE player_id = ?').get(playerId);
  if (!stats) {
    db.prepare('INSERT INTO sect_daily_stats (player_id, accept_count, complete_count, last_date) VALUES (?, 0, 0, ?)').run(playerId, today);
    stats = { player_id: playerId, accept_count: 0, complete_count: 0, last_date: today };
  } else if (stats.last_date !== today) {
    // 新的一天，重置计数
    db.prepare('UPDATE sect_daily_stats SET accept_count=0, complete_count=0, last_date=? WHERE player_id=?').run(today, playerId);
    stats = { player_id: playerId, accept_count: 0, complete_count: 0, last_date: today };
  }
  return stats;
}

// GET /api/daily-mission/list - 获取当日任务列表
router.get('/list', (req, res) => {
  const playerId = getPlayerId(req);
  const today = getToday();

  try {
    const stats = ensureTodayStats(playerId);
    const accepted = db.prepare(
      'SELECT * FROM sect_daily_missions WHERE player_id=? AND mission_date=? ORDER BY id ASC'
    ).all(playerId, today);

    const result = accepted.map(m => {
      const cfg = MISSION_TYPES.find(t => t.key === m.mission_key) || {};
      return {
        key: m.mission_key,
        name: m.mission_name,
        desc: cfg.desc || '',
        progress: m.progress,
        target: m.target,
        status: m.status,
        rewards: {
          lingshi: m.reward_lingshi,
          contribution: m.reward_contribution,
          exp: m.reward_exp,
        },
      };
    });

    res.json({
      success: true,
      stats: { accepted: stats.accept_count, completed: stats.complete_count, max: 10 },
      missions: result,
    });
  } catch(e) {
    console.error('[dailyMission:list]', e.message);
    res.json({ success: false, message: e.message });
  }
});

// POST /api/daily-mission/accept - 接受一个随机任务
router.post('/accept', (req, res) => {
  const playerId = getPlayerId(req);
  const today = getToday();

  try {
    const stats = ensureTodayStats(playerId);

    if (stats.accept_count >= 10) {
      return res.json({ success: false, message: '今日已接受10次任务，无法再接受更多' });
    }

    // 已接受的任务 key 列表
    const accepted = db.prepare(
      'SELECT mission_key FROM sect_daily_missions WHERE player_id=? AND mission_date=?'
    ).all(playerId, today);
    const acceptedKeys = new Set(accepted.map(a => a.mission_key));

    // 可接受的任务（在10种中排除已接受的）
    const available = MISSION_TYPES.filter(t => !acceptedKeys.has(t.key));
    if (available.length === 0) {
      return res.json({ success: false, message: '当前所有任务已全部接受' });
    }

    // 随机选一个
    const chosen = available[Math.floor(Math.random() * available.length)];
    db.prepare(
      `INSERT OR IGNORE INTO sect_daily_missions
       (player_id, mission_date, mission_key, mission_name, progress, target, reward_lingshi, reward_contribution, reward_exp)
       VALUES (?, ?, ?, ?, 0, 1, ?, ?, ?)`
    ).run(playerId, today, chosen.key, chosen.name, chosen.lingshi, chosen.contribution, chosen.exp);

    db.prepare('UPDATE sect_daily_stats SET accept_count = accept_count + 1 WHERE player_id = ?').run(playerId);

    res.json({
      success: true,
      message: `接受了【${chosen.name}】`,
      mission: {
        key: chosen.key,
        name: chosen.name,
        desc: chosen.desc,
        progress: 0,
        target: 1,
        status: 'accepted',
        rewards: { lingshi: chosen.lingshi, contribution: chosen.contribution, exp: chosen.exp },
      },
      stats: { accepted: stats.accept_count + 1, completed: stats.complete_count, max: 10 },
    });
  } catch(e) {
    console.error('[dailyMission:accept]', e.message);
    res.json({ success: false, message: e.message });
  }
});

// POST /api/daily-mission/submit - 提交任务（自动完成 + 领取奖励）
router.post('/submit', (req, res) => {
  const playerId = getPlayerId(req);
  const { mission_key } = req.body;
  const today = getToday();

  if (!mission_key) {
    return res.json({ success: false, message: '请提供 mission_key' });
  }

  try {
    const mission = db.prepare(
      'SELECT * FROM sect_daily_missions WHERE player_id=? AND mission_date=? AND mission_key=?'
    ).get(playerId, today, mission_key);

    if (!mission) {
      return res.json({ success: false, message: '任务不存在或尚未接受此任务' });
    }
    if (mission.status === 'completed') {
      return res.json({ success: false, message: '此任务已领取过奖励' });
    }

    // 完成任务
    db.prepare(
      "UPDATE sect_daily_missions SET status='completed', progress=target, completed_at=? WHERE id=?"
    ).run(Date.now(), mission.id);
    db.prepare('UPDATE sect_daily_stats SET complete_count = complete_count + 1 WHERE player_id = ?').run(playerId);

    // 发放奖励
    db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(mission.reward_lingshi, playerId);

    // 增加师门贡献（写到 sect_members 表）
    try {
      db.prepare('UPDATE sect_members SET contribution = contribution + ? WHERE player_id = ?').run(mission.reward_contribution, playerId);
    } catch(e) { /* no sect membership */ }

    // 增加修为经验
    try {
      db.prepare('UPDATE Cultivations SET value = value + ? WHERE userId = ?').run(mission.reward_exp, playerId);
    } catch(e) { /* no cultivation */ }

    res.json({
      success: true,
      message: `【${mission.mission_name}】已完成！奖励：灵石×${mission.reward_lingshi}、贡献×${mission.reward_contribution}、修为+${mission.reward_exp}`,
      rewards: {
        lingshi: mission.reward_lingshi,
        contribution: mission.reward_contribution,
        exp: mission.reward_exp,
      },
    });
  } catch(e) {
    console.error('[dailyMission:submit]', e.message);
    res.json({ success: false, message: e.message });
  }
});

module.exports = router;
