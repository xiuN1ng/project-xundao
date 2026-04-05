/**
 * Cave Invasion System - 洞府入侵系统
 * 魔修入侵 → 防守反击 → 奖励/惩罚
 */

const Database = require('better-sqlite3');
const path = require('path');
const DB_PATH = path.join(__dirname, '../data/game.db');
const express = require('express');
const caveInvasionRouter = express.Router();
let _db;

function db() {
  if (!_db) _db = new Database(DB_PATH);
  return _db;
}

// =============================================
// 初始化数据库表
// =============================================
try {
  db().exec(`
    CREATE TABLE IF NOT EXISTS cave_invasion_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invader_id INTEGER NOT NULL,
      target_id INTEGER NOT NULL,
      invader_power INTEGER NOT NULL,
      target_power INTEGER NOT NULL,
      result TEXT NOT NULL CHECK(result IN ('invader_won','target_defended','draw')),
      stolen_spirit INTEGER DEFAULT 0,
      stolen_funds INTEGER DEFAULT 0,
      invader_damage INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db().exec(`
    CREATE TABLE IF NOT EXISTS cave_defense_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      description TEXT,
      attacker_id INTEGER,
      result TEXT,
      rewards INTEGER DEFAULT 0,
      read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db().exec(`
    CREATE TABLE IF NOT EXISTS cave_defense_stats (
      player_id INTEGER PRIMARY KEY,
      total_invasions_received INTEGER DEFAULT 0,
      total_invasions_defended INTEGER DEFAULT 0,
      total_invasions_lost INTEGER DEFAULT 0,
      spirit_lost_total INTEGER DEFAULT 0,
      spirit_gained_total INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
} catch(e) {}

// =============================================
// 工具函数
// =============================================
function getPlayerPower(playerId) {
  try {
    const p = db().prepare(`
      SELECT COALESCE(SUM(attack), 0) as atk, COALESCE(SUM(defense), 0) as def
      FROM equipment WHERE userId = ?
    `).get(playerId);
    return (p.atk || 0) + (p.def || 0) * 2;
  } catch(e) { return 100; }
}

function getPlayerName(playerId) {
  try {
    const p = db().prepare('SELECT username FROM Users WHERE id = ?').get(playerId);
    return p ? p.username : '神秘修士';
  } catch(e) { return '神秘修士'; }
}

// =============================================
// GET /list - 获取入侵事件列表
// =============================================
caveInvasionRouter.get('/list', (req, res) => {
  const playerId = parseInt(req.query.playerId);
  if (!playerId) return res.json({ success: false, message: '缺少playerId' });

  try {
    const events = db().prepare(`
      SELECT * FROM cave_defense_events
      WHERE target_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(playerId);

    const stats = db().prepare(`
      SELECT * FROM cave_defense_stats WHERE player_id = ?
    `).get(playerId) || {};

    const eventsWithNames = events.map(e => ({
      ...e,
      attackerName: getPlayerName(e.attacker_id),
      isPending: e.event_type === 'invasion_pending'
    }));

    res.json({ success: true, events: eventsWithNames, stats });
  } catch(e) {
    res.json({ success: false, message: e.message });
  }
});

// =============================================
// POST /invade - 发起入侵
// =============================================
caveInvasionRouter.post('/invade', (req, res) => {
  const { invaderId, targetId } = req.body;
  if (!invaderId || !targetId) return res.json({ success: false, message: '参数不完整' });
  if (parseInt(invaderId) === parseInt(targetId)) return res.json({ success: false, message: '不能入侵自己的洞府' });

  const invaderPower = getPlayerPower(invaderId);
  const targetPower = getPlayerPower(targetId);

  // 消耗50灵石
  try {
    const invaderFunds = db().prepare('SELECT lingshi FROM Users WHERE id = ?').get(invaderId);
    if (!invaderFunds || invaderFunds.lingshi < 50) return res.json({ success: false, message: '灵石不足（需要50灵石）' });
    db().prepare('UPDATE Users SET lingshi = lingshi - 50 WHERE id = ?').run(invaderId);
  } catch(e) {
    return res.json({ success: false, message: '数据库错误' });
  }

  const roll = Math.random();
  const powerRatio = invaderPower / Math.max(targetPower, 1);
  const winThreshold = Math.min(0.35 + (powerRatio - 1) * 0.15, 0.85);

  let result, stolenSpirit = 0;
  const rand = Math.random;

  if (roll < winThreshold) {
    result = 'invader_won';
    stolenSpirit = Math.floor(Math.random() * 200) + 50;
    db().prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(stolenSpirit, targetId);
    db().prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(stolenSpirit, invaderId);
    db().prepare(`INSERT INTO cave_defense_events (target_id, event_type, description, attacker_id, result, rewards) VALUES (?, 'invasion_pending', ?, ?, 'invader_won', ?)`).run(targetId, `你的洞府遭到入侵！损失${stolenSpirit}灵石`, invaderId, -stolenSpirit);
  } else if (roll > 0.7) {
    result = 'draw';
    db().prepare(`INSERT INTO cave_defense_events (target_id, event_type, description, attacker_id, result) VALUES (?,'invasion_pending','你的洞府遭到入侵！双方势均力敌',?,'draw')`).run(targetId, invaderId);
  } else {
    result = 'target_defended';
    db().prepare(`INSERT INTO cave_defense_events (target_id, event_type, description, attacker_id, result) VALUES (?,'invasion_pending','你遭到入侵！成功防守！',?,'target_defended')`).run(targetId, invaderId);
  }

  const invaderDamage = Math.floor(Math.random() * 80) + 20;
  db().prepare(`INSERT INTO cave_invasion_events (invader_id,target_id,invader_power,target_power,result,stolen_spirit,invader_damage) VALUES (?,?,?,?,?,?,?)`).run(invaderId, targetId, invaderPower, targetPower, result, stolenSpirit, invaderDamage);

  res.json({
    success: true, result, stolenSpirit, invaderDamage,
    invaderPower, targetPower,
    message: result === 'invader_won' ? '入侵成功！' : result === 'target_defended' ? '防守成功！' : '平局收场'
  });
});

// =============================================
// POST /defend - 防守或反击
// =============================================
caveInvasionRouter.post('/defend', (req, res) => {
  const { playerId, eventId, action } = req.body;

  try {
    const evt = db().prepare('SELECT * FROM cave_defense_events WHERE id = ? AND target_id = ?').get(eventId, playerId);
    if (!evt) return res.json({ success: false, message: '入侵事件不存在' });
    if (evt.event_type !== 'invasion_pending') return res.json({ success: false, message: '事件已处理' });

    const myPower = getPlayerPower(playerId);
    const attackerPower = evt.attacker_id ? getPlayerPower(evt.attacker_id) : myPower;

    if (action === 'counter_attack') {
      const counterPower = myPower * 1.5;
      const won = Math.random() < Math.min(counterPower / attackerPower, 0.9);
      if (won) {
        const recovered = Math.abs(evt.rewards) * 2;
        db().prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(recovered, playerId);
        db().prepare(`UPDATE cave_defense_events SET event_type='invasion_counter_won',result='counter_attack_won',rewards=?,read=1 WHERE id=?`).run(recovered, eventId);
        res.json({ success: true, result: 'counter_attack_won', recovered, message: `反击成功！夺回${recovered}灵石` });
      } else {
        const extraLoss = Math.abs(evt.rewards);
        db().prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(extraLoss, playerId);
        db().prepare(`UPDATE cave_defense_events SET event_type='invasion_lost',result='counter_attack_lost',read=1 WHERE id=?`).run(eventId);
        res.json({ success: true, result: 'counter_attack_lost', extraLoss, message: `反击失败...再损失${extraLoss}灵石` });
      }
    } else {
      const won = Math.random() < 0.65;
      if (won) {
        db().prepare(`UPDATE cave_defense_events SET event_type='invasion_defended',result='defended',read=1 WHERE id=?`).run(eventId);
        res.json({ success: true, result: 'defended', message: '防守成功！' });
      } else {
        db().prepare(`UPDATE cave_defense_events SET event_type='invasion_lost',result='lost',read=1 WHERE id=?`).run(eventId);
        res.json({ success: true, result: 'lost', message: '防守失败...' });
      }
    }
  } catch(e) {
    res.json({ success: false, message: e.message });
  }
});

// =============================================
// POST /read - 标记已读
// =============================================
caveInvasionRouter.post('/read', (req, res) => {
  const { playerId, eventId } = req.body;
  try {
    if (eventId) {
      db().prepare('UPDATE cave_defense_events SET read = 1 WHERE id = ? AND target_id = ?').run(eventId, playerId);
    } else {
      db().prepare('UPDATE cave_defense_events SET read = 1 WHERE target_id = ?').run(playerId);
    }
    res.json({ success: true });
  } catch(e) {
    res.json({ success: false, message: e.message });
  }
});

// =============================================
// GET /targets - 获取可入侵目标
// =============================================
caveInvasionRouter.get('/targets', (req, res) => {
  const playerId = parseInt(req.query.playerId);
  if (!playerId) return res.json({ success: false, message: '缺少playerId' });
  try {
    const targets = db().prepare(`
      SELECT id, username, realm FROM Users 
      WHERE id != ? AND realm >= 1
      ORDER BY RANDOM() 
      LIMIT 5
    `).all(playerId);
    const enriched = targets.map(t => ({
      ...t,
      power: getPlayerPower(t.id)
    }));
    res.json({ success: true, targets: enriched });
  } catch(e) {
    res.json({ success: false, message: e.message });
  }
});

module.exports = caveInvasionRouter;
