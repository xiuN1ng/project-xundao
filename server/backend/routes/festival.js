const express = require('express');
const router = express.Router();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'game.db');

function getDb() {
  const Database = require('better-sqlite3');
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  return db;
}

function getShanghaiDateStr() {
  const now = new Date(Date.now() + 8 * 3600000);
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ========== Festival Definitions ==========
const FESTIVAL_TEMPLATES = {
  redpacket_rain: {
    type: 'redpacket_rain',
    name: '红包雨',
    description: '每逢节日，仙盟发放大量灵石红包雨！',
    icon: '🧧',
    rewards: [
      { item: 'spirit_stones', amount: 100, probability: 0.6 },
      { item: 'spirit_stones', amount: 500, probability: 0.3 },
      { item: 'spirit_stones', amount: 2000, probability: 0.1 },
    ],
    duration: 3600, // seconds
    cooldown: 86400, // 24h
    minRealm: 1,
  },
  lantern_riddle: {
    type: 'lantern_riddle',
    name: '灯谜大会',
    description: '元宵灯谜，答对获得丰厚奖励！',
    icon: '🏮',
    rewards: [
      { item: 'spirit_stones', amount: 50, probability: 0.5 },
      { item: 'spirit_stones', amount: 200, probability: 0.35 },
      { item: 'spirit_stones', amount: 1000, probability: 0.15 },
    ],
    duration: 1800,
    cooldown: 43200, // 12h
    minRealm: 1,
  },
  fireworks: {
    type: 'fireworks',
    name: '烟花盛典',
    description: '烟花璀璨，璀璨盛典，燃放烟花获得积分兑换好礼！',
    icon: '🎆',
    rewards: [
      { item: 'spirit_stones', amount: 80, probability: 0.55 },
      { item: 'spirit_stones', amount: 300, probability: 0.3 },
      { item: 'spirit_stones', amount: 1500, probability: 0.15 },
    ],
    duration: 7200,
    cooldown: 86400,
    minRealm: 1,
  },
};

// ========== DB Tables ==========
function initFestivalTables() {
  const db = getDb();
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS festival_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        total_participants INTEGER DEFAULT 0,
        total_rewards TEXT DEFAULT '[]',
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS festival_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        player_name TEXT,
        join_time TEXT DEFAULT (datetime('now')),
        rewards_claimed INTEGER DEFAULT 0,
        score INTEGER DEFAULT 0,
        UNIQUE(event_id, player_id)
      );

      CREATE TABLE IF NOT EXISTS festival_rewards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        reward_item TEXT NOT NULL,
        reward_amount INTEGER NOT NULL,
        claimed_at TEXT DEFAULT (datetime('now'))
      );
    `);
  } finally {
    db.close();
  }
}

initFestivalTables();

// ========== Middleware: get player id ==========
function extractUserId(req) {
  return req.userId || parseInt(req.body?.player_id || req.body?.userId || req.query?.player_id || req.query?.userId || 1);
}

function getPlayerName(db, userId) {
  try {
    const row = db.prepare('SELECT nickname FROM Users WHERE id = ?').get(userId);
    return row ? row.nickname : `玩家${userId}`;
  } catch {
    return `玩家${userId}`;
  }
}

// ========== GET /festival — list all active/upcoming festivals ==========
router.get('/', (req, res) => {
  const db = getDb();
  try {
    const today = getShanghaiDateStr();
    const events = db.prepare(`
      SELECT * FROM festival_events
      WHERE date(end_time) >= date(?)
      ORDER BY start_time ASC
    `).all(today);

    const result = events.map(e => {
      const template = FESTIVAL_TEMPLATES[e.type] || {};
      return {
        id: e.id,
        type: e.type,
        name: e.name,
        icon: template.icon || '🎉',
        description: template.description || '',
        startTime: e.start_time,
        endTime: e.end_time,
        status: e.status,
        totalParticipants: e.total_participants,
      };
    });

    // If no events in DB, return all templates as "upcoming"
    if (result.length === 0) {
      const upcoming = Object.values(FESTIVAL_TEMPLATES).map(t => ({
        type: t.type,
        name: t.name,
        icon: t.icon,
        description: t.description,
        status: 'upcoming',
        totalParticipants: 0,
        minRealm: t.minRealm,
      }));
      return res.json({ success: true, festivals: upcoming });
    }

    res.json({ success: true, festivals: result });
  } catch (err) {
    console.error('[Festival] GET / error:', err.message);
    res.json({ success: false, error: err.message });
  } finally {
    db.close();
  }
});

// ========== GET /festival/:type — get specific festival ==========
router.get('/:type', (req, res) => {
  const db = getDb();
  try {
    const { type } = req.params;
    const template = FESTIVAL_TEMPLATES[type];
    if (!template) {
      return res.json({ success: false, error: '未知活动类型' });
    }

    const today = getShanghaiDateStr();
    let event = db.prepare(`
      SELECT * FROM festival_events
      WHERE type = ? AND date(end_time) >= date(?)
      ORDER BY start_time DESC LIMIT 1
    `).get(type, today);

    const userId = extractUserId(req);
    let participant = null;
    if (event) {
      participant = db.prepare(`
        SELECT * FROM festival_participants
        WHERE event_id = ? AND player_id = ?
      `).get(event.id, userId);
    }

    res.json({
      success: true,
      festival: {
        type,
        name: template.name,
        icon: template.icon,
        description: template.description,
        startTime: event?.start_time || null,
        endTime: event?.end_time || null,
        status: event?.status || 'upcoming',
        totalParticipants: event?.total_participants || 0,
        joined: !!participant,
        myScore: participant?.score || 0,
        rewardsClaimed: participant?.rewards_claimed || 0,
      },
    });
  } catch (err) {
    console.error('[Festival] GET /:type error:', err.message);
    res.json({ success: false, error: err.message });
  } finally {
    db.close();
  }
});

// ========== POST /festival/join — join a festival ==========
router.post('/join', (req, res) => {
  const db = getDb();
  try {
    const { type, player_id, userId: bodyUserId } = req.body;
    const userId = bodyUserId || player_id || extractUserId(req);

    if (!type || !FESTIVAL_TEMPLATES[type]) {
      return res.json({ success: false, error: '请指定有效的活动类型' });
    }

    const today = getShanghaiDateStr();
    let event = db.prepare(`
      SELECT * FROM festival_events
      WHERE type = ? AND date(end_time) >= date(?)
      ORDER BY start_time DESC LIMIT 1
    `).get(type, today);

    // Auto-create event if not exists
    if (!event) {
      const now = new Date();
      const endDate = new Date(now.getTime() + 3 * 24 * 3600000); // 3 days from now
      const startStr = now.toISOString().replace('T', ' ').substring(0, 19);
      const endStr = endDate.toISOString().replace('T', ' ').substring(0, 19);

      const template = FESTIVAL_TEMPLATES[type];
      const info = db.prepare(`
        INSERT INTO festival_events (type, name, start_time, end_time, status)
        VALUES (?, ?, ?, ?, 'active')
      `).run(type, template.name, startStr, endStr);

      event = {
        id: info.lastInsertRowid,
        type,
        start_time: startStr,
        end_time: endStr,
        status: 'active',
      };
    }

    const playerName = getPlayerName(db, userId);

    try {
      db.prepare(`
        INSERT INTO festival_participants (event_id, player_id, player_name)
        VALUES (?, ?, ?)
      `).run(event.id, userId, playerName);

      db.prepare(`
        UPDATE festival_events SET total_participants = total_participants + 1
        WHERE id = ?
      `).run(event.id);
    } catch (e) {
      if (e.message.includes('UNIQUE')) {
        // Already joined
      } else {
        throw e;
      }
    }

    res.json({
      success: true,
      message: `成功参加「${FESTIVAL_TEMPLATES[type].name}」！`,
      eventId: event.id,
    });
  } catch (err) {
    console.error('[Festival] POST /join error:', err.message);
    res.json({ success: false, error: err.message });
  } finally {
    db.close();
  }
});

// ========== POST /festival/claim — claim festival rewards ==========
router.post('/claim', (req, res) => {
  const db = getDb();
  try {
    const { type, player_id, userId: bodyUserId } = req.body;
    const userId = bodyUserId || player_id || extractUserId(req);

    if (!type || !FESTIVAL_TEMPLATES[type]) {
      return res.json({ success: false, error: '无效的活动类型' });
    }

    const today = getShanghaiDateStr();
    const event = db.prepare(`
      SELECT * FROM festival_events
      WHERE type = ? AND date(end_time) >= date(?)
      ORDER BY start_time DESC LIMIT 1
    `).get(type, today);

    if (!event) {
      return res.json({ success: false, error: '当前无进行中的该活动' });
    }

    const participant = db.prepare(`
      SELECT * FROM festival_participants
      WHERE event_id = ? AND player_id = ?
    `).get(event.id, userId);

    if (!participant) {
      return res.json({ success: false, error: '请先参加活动' });
    }

    if (participant.rewards_claimed >= 3) {
      return res.json({ success: false, error: '今日奖励已领完（每天最多3次）' });
    }

    const template = FESTIVAL_TEMPLATES[type];
    // Random reward based on probability
    const rand = Math.random();
    let cumulative = 0;
    let rewardItem = 'spirit_stones';
    let rewardAmount = 0;

    for (const r of template.rewards) {
      cumulative += r.probability;
      if (rand <= cumulative) {
        rewardItem = r.item;
        rewardAmount = r.amount;
        break;
      }
    }

    // Update DB
    db.prepare(`
      UPDATE festival_participants
      SET rewards_claimed = rewards_claimed + 1, score = score + ?
      WHERE id = ?
    `).run(rewardAmount, participant.id);

    // Write reward record
    db.prepare(`
      INSERT INTO festival_rewards (event_id, player_id, reward_item, reward_amount)
      VALUES (?, ?, ?, ?)
    `).run(event.id, userId, rewardItem, rewardAmount);

    // Add to player lingshi
    if (rewardItem === 'spirit_stones') {
      try {
        db.prepare(`
          UPDATE Users SET lingshi = lingshi + ? WHERE id = ?
        `).run(rewardAmount, userId);
      } catch (e) {
        console.error('[Festival] Failed to add lingshi:', e.message);
      }
    }

    res.json({
      success: true,
      message: `获得 ${rewardAmount} 灵石！`,
      reward: { item: rewardItem, amount: rewardAmount },
      remainingClaims: 3 - participant.rewards_claimed - 1,
    });
  } catch (err) {
    console.error('[Festival] POST /claim error:', err.message);
    res.json({ success: false, error: err.message });
  } finally {
    db.close();
  }
});

// ========== GET /festival/leaderboard/:type — activity leaderboard ==========
router.get('/leaderboard/:type', (req, res) => {
  const db = getDb();
  try {
    const { type } = req.params;
    const today = getShanghaiDateStr();

    const event = db.prepare(`
      SELECT id FROM festival_events
      WHERE type = ? AND date(end_time) >= date(?)
      ORDER BY start_time DESC LIMIT 1
    `).get(type, today);

    if (!event) {
      return res.json({ success: true, leaderboard: [] });
    }

    const topPlayers = db.prepare(`
      SELECT fp.player_id, fp.player_name, fp.score, fp.join_time,
             u.combat_power, u.level, u.realm
      FROM festival_participants fp
      LEFT JOIN Users u ON u.id = fp.player_id
      WHERE fp.event_id = ?
      ORDER BY fp.score DESC
      LIMIT 20
    `).all(event.id);

    res.json({ success: true, leaderboard: topPlayers });
  } catch (err) {
    console.error('[Festival] GET /leaderboard error:', err.message);
    res.json({ success: false, error: err.message });
  } finally {
    db.close();
  }
});

module.exports = router;
