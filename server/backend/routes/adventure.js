/**
 * 仙侠奇遇系统 Adventure Routes
 * /api/adventure/*
 */
const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');

const router = express.Router();

// ─── Database Setup ───────────────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

function getDb() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode=WAL');
  db.pragma('busy_timeout=5000');
  return db;
}

// ─── Adventure Type Definitions ───────────────────────────────────────────────
const ADVENTURE_TYPES = {
  ruins: {
    id: 'ruins',
    icon: '🏛️',
    name: '遗迹探索',
    description: '探索上古遗迹，寻找失落的法宝与秘笈',
    difficulty: 2,
    rewardPreview: '灵石、功法残页',
    color: '#f093fb',
    minRealm: 1,
    cooldownSeconds: 0,
    unlockedByDefault: true,
    unlockCondition: null,
    rewards: [
      { type: 'spiritStones', min: 100, max: 300 },
      { type: 'exp', min: 50, max: 150 }
    ]
  },
  immortal: {
    id: 'immortal',
    icon: '🧘',
    name: '仙人指路',
    description: '偶遇仙人，获得顿悟与指点',
    difficulty: 3,
    rewardPreview: '顿悟、境界提升',
    color: '#67d6f7',
    minRealm: 3,
    cooldownSeconds: 3600,
    unlockedByDefault: true,
    unlockCondition: 'realm >= 3',
    rewards: [
      { type: 'exp', min: 200, max: 500 },
      { type: 'cultivation', min: 5, max: 20 }
    ]
  },
  beast: {
    id: 'beast',
    icon: '🐉',
    name: '妖兽袭击',
    description: '妖兽来袭，击杀后可获得妖丹与材料',
    difficulty: 1,
    rewardPreview: '妖丹、兽皮',
    color: '#ff6b6b',
    minRealm: 1,
    cooldownSeconds: 0,
    unlockedByDefault: true,
    unlockCondition: null,
    rewards: [
      { type: 'spiritStones', min: 50, max: 150 },
      { type: 'item', name: '妖丹', min: 1, max: 3 },
      { type: 'item', name: '兽皮', min: 1, max: 2 }
    ]
  },
  treasure: {
    id: 'treasure',
    icon: '💎',
    name: '遗失宝物',
    description: '探查流落民间的遗失宝物，有缘者得之',
    difficulty: 2,
    rewardPreview: '稀有装备、灵石',
    color: '#ffd93d',
    minRealm: 5,
    cooldownSeconds: 7200,
    unlockedByDefault: false,
    unlockCondition: 'complete前置奇遇',
    rewards: [
      { type: 'spiritStones', min: 300, max: 800 },
      { type: 'item', name: '灵草', min: 2, max: 5 },
      { type: 'exp', min: 100, max: 300 }
    ]
  },
  cave: {
    id: 'cave',
    icon: '🕳️',
    name: '洞府奇遇',
    description: '发现一处隐秘洞府，内有前人遗留的修炼资源',
    difficulty: 2,
    rewardPreview: '灵石、丹药',
    color: '#a8edea',
    minRealm: 2,
    cooldownSeconds: 1800,
    unlockedByDefault: true,
    unlockCondition: null,
    rewards: [
      { type: 'spiritStones', min: 150, max: 400 },
      { type: 'item', name: '筑基丹', min: 1, max: 2 }
    ]
  },
  ancient: {
    id: 'ancient',
    icon: '📜',
    name: '古修遗址',
    description: '踏入古修士坐化之地，感悟残存道韵',
    difficulty: 3,
    rewardPreview: '功法领悟、灵石',
    color: '#d299c2',
    minRealm: 4,
    cooldownSeconds: 3600,
    unlockedByDefault: true,
    unlockCondition: 'realm >= 4',
    rewards: [
      { type: 'cultivation', min: 10, max: 30 },
      { type: 'spiritStones', min: 200, max: 500 }
    ]
  }
};

// ─── Utility ─────────────────────────────────────────────────────────────────
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getShanghaiDateStr() {
  const d = new Date(Date.now() + 8 * 3600000);
  return d.toISOString().substring(0, 10);
}

function extractUserId(req) {
  return parseInt(req.userId || req.body?.userId || req.body?.player_id ||
    req.query?.userId || req.query?.player_id || 1);
}

// ─── DB Initialization ───────────────────────────────────────────────────────
function initAdventureTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS adventure_player_stats (
      user_id      INTEGER PRIMARY KEY,
      total_count  INTEGER DEFAULT 0,
      success_count INTEGER DEFAULT 0,
      fail_count   INTEGER DEFAULT 0,
      last_trigger INTEGER DEFAULT 0,
      last_type    TEXT DEFAULT NULL,
      today_count  INTEGER DEFAULT 0,
      last_date    TEXT DEFAULT NULL,
      total_rewards_sp INTEGER DEFAULT 0,
      total_rewards_exp INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS adventure_history (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER,
      adventure_id TEXT,
      adventure_name TEXT,
      icon         TEXT,
      result       TEXT,
      rewards      TEXT,
      created_at   INTEGER DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS adventure_cooldowns (
      user_id      INTEGER,
      adventure_id TEXT,
      last_trigger INTEGER DEFAULT 0,
      PRIMARY KEY (user_id, adventure_id)
    );

    CREATE TABLE IF NOT EXISTS adventure_buffs (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER,
      stat         TEXT,
      value        REAL,
      name         TEXT,
      duration     INTEGER,
      expires_at   INTEGER,
      created_at   INTEGER DEFAULT (strftime('%s','now'))
    );
  `);
}

// ─── GET /api/adventure/types ────────────────────────────────────────────────
router.get('/types', (req, res) => {
  try {
    const db = getDb();
    initAdventureTables(db);
    const userId = extractUserId(req);

    // Get player realm
    let realm = 1;
    try {
      const user = db.prepare('SELECT realm FROM Users WHERE id = ?').get(userId);
      if (user) realm = user.realm || 1;
    } catch (e) {}

    // Get cooldowns
    const cooldowns = {};
    const cdRows = db.prepare('SELECT adventure_id, last_trigger FROM adventure_cooldowns WHERE user_id = ?').all(userId);
    for (const row of cdRows) {
      cooldowns[row.adventure_id] = row.last_trigger;
    }

    // Get player stats
    let stats = null;
    try {
      stats = db.prepare('SELECT * FROM adventure_player_stats WHERE user_id = ?').get(userId);
    } catch (e) {}

    const todayStr = getShanghaiDateStr();
    const todayCount = (stats && stats.last_date === todayStr) ? stats.today_count : 0;
    const lastTrigger = stats ? stats.last_trigger : 0;

    // Build type list with unlock/cooldown status
    const types = Object.values(ADVENTURE_TYPES).map(type => {
      const cooldownEnd = cooldowns[type.id] || 0;
      const nowSec = Math.floor(Date.now() / 1000);
      const remainingCooldown = cooldownEnd > nowSec ? cooldownEnd - nowSec : 0;
      const unlocked = type.unlockedByDefault || realm >= type.minRealm;
      const lockReason = unlocked ? null : `需境界${type.minRealm}`;

      return {
        id: type.id,
        icon: type.icon,
        name: type.name,
        description: type.description,
        difficulty: type.difficulty,
        rewardPreview: type.rewardPreview,
        color: type.color,
        cooldown: remainingCooldown,
        unlocked,
        lockReason: lockReason || (!type.unlockedByDefault ? type.unlockCondition : null)
      };
    });

    res.json({ success: true, types, todayCount, maxDailyAdventures: 10 });
    db.close();
  } catch (err) {
    console.error('[Adventure /types error]', err.message);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ─── GET /api/adventure/stats ────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  try {
    const db = getDb();
    initAdventureTables(db);
    const userId = extractUserId(req);

    let stats = null;
    try {
      stats = db.prepare('SELECT * FROM adventure_player_stats WHERE user_id = ?').get(userId);
    } catch (e) {}

    const todayStr = getShanghaiDateStr();
    const todayCount = (stats && stats.last_date === todayStr) ? stats.today_count : 0;

    // Get active buffs
    const nowSec = Math.floor(Date.now() / 1000);
    const buffs = db.prepare(
      'SELECT * FROM adventure_buffs WHERE user_id = ? AND expires_at > ? ORDER BY id DESC'
    ).all(userId, nowSec);

    // Get cooldowns
    const cooldowns = {};
    const cdRows = db.prepare('SELECT adventure_id, last_trigger FROM adventure_cooldowns WHERE user_id = ?').all(userId);
    for (const row of cdRows) {
      cooldowns[row.adventure_id] = row.last_trigger;
    }

    res.json({
      success: true,
      lastTrigger: stats ? stats.last_trigger : 0,
      totalCount: stats ? stats.total_count : 0,
      successCount: stats ? stats.success_count : 0,
      failCount: stats ? stats.fail_count : 0,
      todayCount,
      maxDailyAdventures: 10,
      buffs: buffs.map(b => ({
        stat: b.stat,
        value: b.value,
        name: b.name,
        duration: b.duration,
        expiresAt: b.expires_at * 1000
      })),
      cooldowns
    });
    db.close();
  } catch (err) {
    console.error('[Adventure /stats error]', err.message);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ─── POST /api/adventure/trigger ─────────────────────────────────────────────
router.post('/trigger', (req, res) => {
  try {
    const db = getDb();
    initAdventureTables(db);
    const userId = extractUserId(req);
    const adventureId = req.body.adventureId || req.body.type;

    // Check daily limit
    let stats = null;
    try {
      stats = db.prepare('SELECT * FROM adventure_player_stats WHERE user_id = ?').get(userId);
    } catch (e) {}

    const todayStr = getShanghaiDateStr();
    const todayCount = (stats && stats.last_date === todayStr) ? stats.today_count : 0;
    if (todayCount >= 10) {
      return res.json({ success: false, message: '今日奇遇次数已用完，明日再来吧！' });
    }

    // Get player realm
    let realm = 1;
    try {
      const user = db.prepare('SELECT realm FROM Users WHERE id = ?').get(userId);
      if (user) realm = user.realm || 1;
    } catch (e) {}

    // Check cooldown for specific adventure
    if (adventureId && ADVENTURE_TYPES[adventureId]) {
      const cdRow = db.prepare('SELECT last_trigger FROM adventure_cooldowns WHERE user_id = ? AND adventure_id = ?').get(userId, adventureId);
      if (cdRow) {
        const nowSec = Math.floor(Date.now() / 1000);
        const remaining = cdRow.last_trigger - nowSec;
        if (remaining > 0) {
          return res.json({ success: false, message: `该奇遇冷却中，请等待${Math.ceil(remaining / 60)}分钟` });
        }
      }
    }

    // Determine adventure type
    let selectedType;
    if (adventureId && ADVENTURE_TYPES[adventureId]) {
      selectedType = ADVENTURE_TYPES[adventureId];
    } else {
      // Random selection, weighted by unlocked
      const available = Object.values(ADVENTURE_TYPES).filter(t =>
        t.unlockedByDefault || realm >= t.minRealm
      );
      if (available.length === 0) {
        return res.json({ success: false, message: '当前境界无可用奇遇' });
      }
      selectedType = available[Math.floor(Math.random() * available.length)];
    }

    // Cooldown check
    const cdRow = db.prepare('SELECT last_trigger FROM adventure_cooldowns WHERE user_id = ? AND adventure_id = ?').get(userId, selectedType.id);
    if (cdRow) {
      const nowSec = Math.floor(Date.now() / 1000);
      const remaining = cdRow.last_trigger - nowSec;
      if (remaining > 0) {
        return res.json({ success: false, message: `冷却中 (${Math.ceil(remaining / 60)}分钟后可再次触发)` });
      }
    }

    // Roll rewards
    const roll = Math.random();
    const success = roll > 0.3; // 70% success rate
    const rewards = [];

    if (success) {
      for (const rewardDef of selectedType.rewards) {
        if (rewardDef.type === 'spiritStones') {
          const val = randomInt(rewardDef.min, rewardDef.max);
          rewards.push({ type: 'spiritStones', value: val });
        } else if (rewardDef.type === 'exp') {
          const val = randomInt(rewardDef.min, rewardDef.max);
          rewards.push({ type: 'exp', value: val });
        } else if (rewardDef.type === 'cultivation') {
          const val = randomInt(rewardDef.min, rewardDef.max);
          rewards.push({ type: 'cultivation', value: val });
        } else if (rewardDef.type === 'item') {
          const count = randomInt(rewardDef.min, rewardDef.max);
          rewards.push({ type: 'item', name: rewardDef.name, count });
        }
      }
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const nowMs = Date.now();

    // Apply rewards to player
    let totalSpGained = 0;
    for (const reward of rewards) {
      if (reward.type === 'spiritStones') {
        totalSpGained += reward.value;
        try {
          db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(reward.value, userId);
        } catch (e) {}
      } else if (reward.type === 'exp') {
        try {
          db.prepare('UPDATE Users SET exp = exp + ? WHERE id = ?').run(reward.value, userId);
        } catch (e) {}
      }
    }
    if (totalSpGained > 0) {
      try {
        db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(totalSpGained, userId);
      } catch (e) {}
    }

    // Update player stats
    upsertPlayerStats(db, userId, {
      total_count: (stats ? stats.total_count : 0) + 1,
      success_count: success ? (stats ? stats.success_count : 0) + 1 : (stats ? stats.success_count : 0),
      fail_count: success ? (stats ? stats.fail_count : 0) : (stats ? stats.fail_count : 0) + 1,
      last_trigger: nowMs,
      last_type: selectedType.id,
      today_count: todayCount + 1,
      last_date: todayStr,
      total_rewards_sp: (stats ? stats.total_rewards_sp : 0) + totalSpGained
    });

    // Set cooldown
    if (selectedType.cooldownSeconds > 0) {
      const cooldownEnd = nowSec + selectedType.cooldownSeconds;
      db.prepare(`
        INSERT INTO adventure_cooldowns (user_id, adventure_id, last_trigger)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, adventure_id) DO UPDATE SET last_trigger = ?
      `).run(userId, selectedType.id, cooldownEnd, cooldownEnd);
    }

    // Record history
    try {
      db.prepare(`
        INSERT INTO adventure_history (user_id, adventure_id, adventure_name, icon, result, rewards, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(userId, selectedType.id, selectedType.name, selectedType.icon,
        success ? 'success' : 'fail', JSON.stringify(rewards), nowSec);
    } catch (e) {}

    // Add buff on success (20% chance)
    if (success && Math.random() < 0.2) {
      const buffTypes = [
        { stat: 'atk', value: 1.1, name: '攻击提升', duration: 1800000 },
        { stat: 'def', value: 1.1, name: '防御提升', duration: 1800000 },
        { stat: 'exp', value: 1.5, name: '经验加成', duration: 3600000 }
      ];
      const buff = buffTypes[Math.floor(Math.random() * buffTypes.length)];
      const expiresAt = nowSec + Math.floor(buff.duration / 1000);
      try {
        db.prepare(`
          INSERT INTO adventure_buffs (user_id, stat, value, name, duration, expires_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(userId, buff.stat, buff.value, buff.name, buff.duration, expiresAt);
        rewards.push({ type: 'buff', stat: buff.stat, value: buff.value, name: buff.name, duration: buff.duration });
      } catch (e) {}
    }

    res.json({
      success: true,
      adventure: {
        id: selectedType.id,
        icon: selectedType.icon,
        name: selectedType.name,
        desc: selectedType.description,
        result: success ? 'success' : 'fail',
        rewards
      }
    });
    db.close();
  } catch (err) {
    console.error('[Adventure /trigger error]', err.message, err.stack);
    res.status(500).json({ success: false, message: '服务器错误: ' + err.message });
  }
});

// ─── GET /api/adventure/history ───────────────────────────────────────────────
router.get('/history', (req, res) => {
  try {
    const db = getDb();
    initAdventureTables(db);
    const userId = extractUserId(req);
    const limit = parseInt(req.query.limit) || 20;

    const rows = db.prepare(`
      SELECT * FROM adventure_history
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(userId, limit);

    const history = rows.map(r => {
      let rewards = [];
      try { rewards = JSON.parse(r.rewards || '[]'); } catch (e) {}
      const date = new Date((r.created_at - 8 * 3600) * 1000);
      return {
        id: r.id,
        icon: r.icon,
        name: r.adventure_name,
        date: date.toISOString().replace('T', ' ').substring(0, 16),
        result: r.result,
        rewards
      };
    });

    res.json({ success: true, history });
    db.close();
  } catch (err) {
    console.error('[Adventure /history error]', err.message);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ─── GET /api/adventure/ ─────────────────────────────────────────────────────
router.get('/', (req, res) => {
  // Root: return brief overview
  try {
    const db = getDb();
    initAdventureTables(db);
    const userId = extractUserId(req);

    let stats = null;
    try {
      stats = db.prepare('SELECT * FROM adventure_player_stats WHERE user_id = ?').get(userId);
    } catch (e) {}

    const todayStr = getShanghaiDateStr();
    const todayCount = (stats && stats.last_date === todayStr) ? stats.today_count : 0;

    res.json({
      success: true,
      totalCount: stats ? stats.total_count : 0,
      successCount: stats ? stats.success_count : 0,
      todayCount,
      maxDailyAdventures: 10
    });
    db.close();
  } catch (err) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ─── GET /api/adventure/status ────────────────────────────────────────────────
router.get('/status', (req, res) => {
  try {
    const db = getDb();
    initAdventureTables(db);
    const userId = extractUserId(req);
    const nowSec = Math.floor(Date.now() / 1000);

    // Get player stats
    let stats = null;
    try {
      stats = db.prepare('SELECT * FROM adventure_player_stats WHERE user_id = ?').get(userId);
    } catch (e) {}

    // Get player realm
    let realm = 1;
    try {
      const user = db.prepare('SELECT realm FROM Users WHERE id = ?').get(userId);
      if (user) realm = user.realm || 1;
    } catch (e) {}

    const todayStr = getShanghaiDateStr();
    const todayCount = (stats && stats.last_date === todayStr) ? stats.today_count : 0;
    const remainingToday = Math.max(0, 10 - todayCount);

    // Get cooldowns
    const cooldowns = {};
    try {
      const cdRows = db.prepare('SELECT adventure_id, last_trigger FROM adventure_cooldowns WHERE user_id = ?').all(userId);
      for (const row of cdRows) {
        const remaining = Math.max(0, row.last_trigger - nowSec);
        cooldowns[row.adventure_id] = {
          onCooldown: remaining > 0,
          remainingSeconds: remaining,
          nextAvailable: remaining > 0 ? new Date((row.last_trigger) * 1000).toISOString() : null
        };
      }
    } catch (e) {}

    // Get active buffs
    const buffs = [];
    try {
      const buffRows = db.prepare('SELECT * FROM adventure_buffs WHERE user_id = ? AND expires_at > ? ORDER BY id DESC').all(userId, nowSec);
      for (const b of buffRows) {
        buffs.push({
          id: b.id,
          name: b.name,
          stat: b.stat,
          value: b.value,
          expiresAt: b.expires_at * 1000,
          remainingMs: Math.max(0, b.expires_at * 1000 - Date.now())
        });
      }
    } catch (e) {}

    // Get pending claims
    const pendingClaims = [];
    try {
      const pending = db.prepare('SELECT * FROM adventure_claims WHERE user_id = ? AND claimed = 0 ORDER BY created_at DESC').all(userId);
      for (const p of pending) {
        let rewards = [];
        try { rewards = JSON.parse(p.rewards || '[]'); } catch (e) {}
        pendingClaims.push({
          id: p.id,
          adventureId: p.adventure_id,
          adventureName: p.adventure_name,
          icon: p.icon,
          rewards,
          canClaim: true,
          createdAt: p.created_at * 1000
        });
      }
    } catch (e) {}

    // Get recent history
    const recentHistory = [];
    try {
      const rows = db.prepare('SELECT * FROM adventure_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 5').all(userId);
      for (const r of rows) {
        let rewards = [];
        try { rewards = JSON.parse(r.rewards || '[]'); } catch (e) {}
        recentHistory.push({
          id: r.id,
          icon: r.icon,
          name: r.adventure_name,
          result: r.result,
          rewards,
          date: new Date((r.created_at - 8 * 3600) * 1000).toISOString().replace('T', ' ').substring(0, 16)
        });
      }
    } catch (e) {}

    // Build available events for this realm
    const availableEvents = Object.values(ADVENTURE_TYPES).filter(t =>
      t.unlockedByDefault || realm >= t.minRealm
    ).map(t => ({
      id: t.id,
      icon: t.icon,
      name: t.name,
      description: t.description,
      difficulty: t.difficulty,
      minRealm: t.minRealm,
      cooldownSeconds: t.cooldownSeconds,
      cooldown: cooldowns[t.id] || { onCooldown: false, remainingSeconds: 0, nextAvailable: null },
      unlocked: t.unlockedByDefault || realm >= t.minRealm
    }));

    res.json({
      success: true,
      playerRealm: realm,
      todayCount,
      remainingToday,
      maxDailyAdventures: 10,
      totalCount: stats ? stats.total_count : 0,
      successCount: stats ? stats.success_count : 0,
      failCount: stats ? stats.fail_count : 0,
      buffs,
      pendingClaims,
      recentHistory,
      availableEvents,
      cooldowns
    });
    db.close();
  } catch (err) {
    console.error('[Adventure /status error]', err.message);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ─── GET /api/adventure/events ───────────────────────────────────────────────
router.get('/events', (req, res) => {
  try {
    const db = getDb();
    initAdventureTables(db);
    const userId = extractUserId(req);
    const nowSec = Math.floor(Date.now() / 1000);

    // Get player realm
    let realm = 1;
    try {
      const user = db.prepare('SELECT realm FROM Users WHERE id = ?').get(userId);
      if (user) realm = user.realm || 1;
    } catch (e) {}

    // Get cooldowns
    const cdMap = {};
    try {
      const cdRows = db.prepare('SELECT adventure_id, last_trigger FROM adventure_cooldowns WHERE user_id = ?').all(userId);
      for (const row of cdRows) {
        const remaining = Math.max(0, row.last_trigger - nowSec);
        cdMap[row.adventure_id] = remaining;
      }
    } catch (e) {}

    // Get today's count
    let stats = null;
    try {
      stats = db.prepare('SELECT * FROM adventure_player_stats WHERE user_id = ?').get(userId);
    } catch (e) {}
    const todayStr = getShanghaiDateStr();
    const todayCount = (stats && stats.last_date === todayStr) ? stats.today_count : 0;

    // Get pending claims
    let pendingCount = 0;
    try {
      const pending = db.prepare('SELECT COUNT(*) as cnt FROM adventure_claims WHERE user_id = ? AND claimed = 0').get(userId);
      pendingCount = pending ? pending.cnt : 0;
    } catch (e) {}

    const events = Object.values(ADVENTURE_TYPES).map(t => {
      const unlocked = t.unlockedByDefault || realm >= t.minRealm;
      const cooldownRem = cdMap[t.id] || 0;
      return {
        id: t.id,
        icon: t.icon,
        name: t.name,
        description: t.description,
        difficulty: t.difficulty,
        rewardPreview: t.rewardPreview,
        color: t.color,
        minRealm: t.minRealm,
        unlocked,
        lockedReason: unlocked ? null : `需要境界达到 ${t.minRealm}`,
        onCooldown: cooldownRem > 0,
        cooldownRemaining: cooldownRem,
        cooldownFormatted: cooldownRem > 0 ? `${Math.floor(cooldownRem / 60)}分钟` : '可用',
        cooldownSeconds: t.cooldownSeconds
      };
    });

    res.json({
      success: true,
      playerRealm: realm,
      todayCount,
      remainingToday: Math.max(0, 10 - todayCount),
      maxDailyAdventures: 10,
      pendingClaimsCount: pendingCount,
      events
    });
    db.close();
  } catch (err) {
    console.error('[Adventure /events error]', err.message);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ─── POST /api/adventure/claim/:eventId ─────────────────────────────────────
router.post('/claim/:eventId', (req, res) => {
  try {
    const db = getDb();
    initAdventureTables(db);
    initClaimTable(db);
    const userId = extractUserId(req);
    const { eventId } = req.params;

    // Find the pending claim
    let claim = null;
    try {
      claim = db.prepare('SELECT * FROM adventure_claims WHERE user_id = ? AND adventure_id = ? AND claimed = 0').get(userId, eventId);
    } catch (e) {}

    if (!claim) {
      return res.json({ success: false, message: '没有可领取的奖励' });
    }

    // Parse and apply rewards
    let rewards = [];
    try { rewards = JSON.parse(claim.rewards || '[]'); } catch (e) {}

    let totalSp = 0;
    let totalExp = 0;
    const appliedRewards = [];

    for (const r of rewards) {
      if (r.type === 'spiritStones' || r.type === 'lingshi') {
        totalSp += r.value;
        appliedRewards.push({ type: 'spiritStones', value: r.value });
      } else if (r.type === 'exp') {
        totalExp += r.value;
        appliedRewards.push({ type: 'exp', value: r.value });
      } else if (r.type === 'item') {
        appliedRewards.push({ type: 'item', name: r.name, count: r.count });
      } else if (r.type === 'cultivation') {
        appliedRewards.push({ type: 'cultivation', value: r.value });
      }
    }

    // Apply to player
    if (totalSp > 0) {
      try {
        db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(totalSp, userId);
      } catch (e) {}
    }
    if (totalExp > 0) {
      try {
        db.prepare('UPDATE Users SET exp = exp + ? WHERE id = ?').run(totalExp, userId);
      } catch (e) {}
    }

    // Mark as claimed
    try {
      db.prepare('UPDATE adventure_claims SET claimed = 1, claimed_at = ? WHERE id = ?').run(Math.floor(Date.now() / 1000), claim.id);
    } catch (e) {}

    res.json({
      success: true,
      message: '奖励领取成功',
      rewards: appliedRewards,
      spiritStonesGained: totalSp,
      expGained: totalExp
    });
    db.close();
  } catch (err) {
    console.error('[Adventure /claim error]', err.message);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ─── Helper: init claim table ────────────────────────────────────────────────
function initClaimTable(db) {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS adventure_claims (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id       INTEGER,
        adventure_id  TEXT,
        adventure_name TEXT,
        icon          TEXT,
        rewards       TEXT,
        claimed       INTEGER DEFAULT 0,
        created_at    INTEGER DEFAULT (strftime('%s','now')),
        claimed_at    INTEGER DEFAULT NULL
      );
    `);
  } catch (e) {}
}

// ─── Helper: upsert player stats ─────────────────────────────────────────────
function upsertPlayerStats(db, userId, fields) {
  const existing = db.prepare('SELECT 1 FROM adventure_player_stats WHERE user_id = ?').get(userId);
  if (existing) {
    const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
    const vals = Object.values(fields);
    db.prepare(`UPDATE adventure_player_stats SET ${sets} WHERE user_id = ?`).run(...vals, userId);
  } else {
    const cols = ['user_id', ...Object.keys(fields)].join(', ');
    const placeholders = ['?', ...Object.keys(fields).map(() => '?')].join(', ');
    const vals = [userId, ...Object.values(fields)];
    db.prepare(`INSERT INTO adventure_player_stats (${cols}) VALUES (${placeholders})`).run(...vals);
  }
}

module.exports = router;
