const express = require('express');
const router = express.Router();
const path = require('path');
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db = null;
function getDb() {
  if (!db) {
    const Database = require('better-sqlite3');
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
  }
  return db;
}

// 渡劫境界配置
const TRIBULATION_TYPES = {
  'qi_refining': {
    id: 'qi_refining', name: '筑基天劫', icon: '🧘', realm: 9,
    description: '凝聚灵气，突破筑基境界',
    baseSuccessRate: 0.70, baseDamage: 300,
    stages: 3, rewardType: 'realm_advancement',
    requiredItems: [], difficultyLevels: ['easy', 'normal', 'hard']
  },
  'golden_core': {
    id: 'golden_core', name: '金丹天劫', icon: '☀️', realm: 14,
    description: '凝炼金丹，突破金丹境界',
    baseSuccessRate: 0.60, baseDamage: 800,
    stages: 5, rewardType: 'realm_advancement',
    requiredItems: [{ id: 'tribulation_pill', name: '渡劫丹', bonus: 0.15 }],
    difficultyLevels: ['easy', 'normal', 'hard', 'nightmare']
  },
  'nascent_soul': {
    id: 'nascent_soul', name: '元婴天劫', icon: '👶', realm: 19,
    description: '孕育元婴，突破元婴境界',
    baseSuccessRate: 0.50, baseDamage: 2000,
    stages: 7, rewardType: 'realm_advancement',
    requiredItems: [{ id: 'superior_tribulation_pill', name: '高级渡劫丹', bonus: 0.25 }],
    difficultyLevels: ['normal', 'hard', 'nightmare', 'hell']
  },
  'cultivation_breakthrough': {
    id: 'cultivation_breakthrough', name: '修为突破', icon: '⚡', realm: 4,
    description: '小境界突破，稳固修为',
    baseSuccessRate: 0.80, baseDamage: 100,
    stages: 1, rewardType: 'cultivation_progress',
    requiredItems: [], difficultyLevels: ['easy', 'normal']
  }
};

// 难度加成
const DIFFICULTY_MODIFIERS = {
  easy: { damageMult: 0.6, rewardMult: 0.7, successBonus: 0.15 },
  normal: { damageMult: 1.0, rewardMult: 1.0, successBonus: 0.0 },
  hard: { damageMult: 1.5, rewardMult: 1.5, successBonus: -0.10 },
  nightmare: { damageMult: 2.0, rewardMult: 2.5, successBonus: -0.20 },
  hell: { damageMult: 3.0, rewardMult: 4.0, successBonus: -0.30 }
};

// 天劫宝箱奖励
const TRIBULATION_REWARDS = {
  success: [
    { type: 'spirit_stones', min: 500, max: 2000, weight: 30 },
    { type: 'experience', min: 1000, max: 5000, weight: 25 },
    { type: 'equipment', quality: 'rare', weight: 15 },
    { type: 'equipment', quality: 'epic', weight: 8 },
    { type: 'tribulation_pill', count: 1, weight: 12 },
    { type: 'realm_material', weight: 10 }
  ],
  failure: [
    { type: 'spirit_stones', min: 50, max: 200, weight: 60 },
    { type: 'experience', min: 100, max: 500, weight: 40 }
  ]
};

// 初始化表
function initTables() {
  const database = getDb();
  try {
    // 确保 tribulation_sessions 表有必要的列
    const sessionCols = database.prepare('PRAGMA table_info(tribulation_sessions)').all().map(c => c.name);
    if (!sessionCols.includes('current_stage')) {
      try { database.exec("ALTER TABLE tribulation_sessions ADD COLUMN current_stage INTEGER DEFAULT 1"); } catch (e) {}
    }
    if (!sessionCols.includes('total_stages')) {
      try { database.exec("ALTER TABLE tribulation_sessions ADD COLUMN total_stages INTEGER DEFAULT 3"); } catch (e) {}
    }
    if (!sessionCols.includes('lightning_count')) {
      try { database.exec("ALTER TABLE tribulation_sessions ADD COLUMN lightning_count INTEGER DEFAULT 0"); } catch (e) {}
    }
    // tribulation_records 表 - 添加缺失的列
    const recCols = database.prepare('PRAGMA table_info(tribulation_records)').all().map(c => c.name);
    if (!recCols.includes('damage_taken')) {
      try { database.exec("ALTER TABLE tribulation_records ADD COLUMN damage_taken INTEGER DEFAULT 0"); } catch (e) {}
    }
    if (!recCols.includes('reward_items')) {
      try { database.exec("ALTER TABLE tribulation_records ADD COLUMN reward_items TEXT DEFAULT '[]'"); } catch (e) {}
    }
    database.exec(`
      CREATE TABLE IF NOT EXISTS tribulation_cooldowns (
        player_id INTEGER PRIMARY KEY,
        last_tribulation TEXT DEFAULT (datetime('now', '+8 hours')),
        daily_attempts INTEGER DEFAULT 0,
        weekly_successes INTEGER DEFAULT 0
      )
    `);
  } catch (e) {
    console.error('[tribulation] init error:', e.message);
  }
}
initTables();

function extractUserId(req) {
  return parseInt(req.body?.player_id || req.query?.player_id || req.userId || 1) || 1;
}

function weightedRandom(rewards) {
  const total = rewards.reduce((s, r) => s + r.weight, 0);
  let r = Math.random() * total;
  for (const reward of rewards) {
    r -= reward.weight;
    if (r <= 0) return reward;
  }
  return rewards[0];
}

// GET /api/tribulation/types - 获取渡劫类型配置
router.get('/types', (req, res) => {
  const userId = extractUserId(req);
  const database = getDb();
  try {
    const player = database.prepare('SELECT realm FROM player WHERE id = ?').get(userId);
    const currentRealm = player?.realm || 1;
    const available = Object.values(TRIBULATION_TYPES).filter(t => t.realm <= currentRealm + 1);
    res.json({ success: true, types: available, currentRealm, nextTier: TRIBULATION_TYPES['qi_refining'] });
  } catch (e) {
    console.error('[tribulation] GET /types error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// GET /api/tribulation/status - 获取渡劫状态
router.get('/status', (req, res) => {
  const userId = extractUserId(req);
  const database = getDb();
  try {
    const session = database.prepare('SELECT * FROM tribulation_sessions WHERE player_id = ? AND status = ? ORDER BY id DESC LIMIT 1').get(userId, 'active');
    const cooldowns = database.prepare('SELECT * FROM tribulation_cooldowns WHERE player_id = ?').get(userId);
    const recentRecords = database.prepare('SELECT tribulation_type, difficulty, success, reward_spirit, created_at FROM tribulation_records WHERE player_id = ? ORDER BY id DESC LIMIT 5').all(userId);
    const stats = database.prepare('SELECT COUNT(*) as total, SUM(CASE WHEN success=1 THEN 1 ELSE 0 END) as successes FROM tribulation_records WHERE player_id = ?').get(userId);
    res.json({
      success: true,
      activeSession: session || null,
      cooldowns: cooldowns || { daily_attempts: 0, weekly_successes: 0 },
      recentRecords,
      stats: { total: stats.total || 0, successes: stats.successes || 0, rate: stats.total ? Math.round((stats.successes / stats.total) * 100) : 0 }
    });
  } catch (e) {
    console.error('[tribulation] GET /status error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// POST /api/tribulation/begin - 开始渡劫
router.post('/begin', (req, res) => {
  const userId = extractUserId(req);
  const { tribulationType, difficulty = 'normal' } = req.body || {};
  const database = getDb();

  if (!tribulationType || !TRIBULATION_TYPES[tribulationType]) {
    return res.json({ success: false, message: '无效的渡劫类型' });
  }

  const tribConfig = TRIBULATION_TYPES[tribulationType];
  const diffConfig = DIFFICULTY_MODIFIERS[difficulty] || DIFFICULTY_MODIFIERS.normal;

  // 检查是否有进行中的渡劫
  const active = database.prepare('SELECT * FROM tribulation_sessions WHERE player_id = ? AND status = ?').get(userId, 'active');
  if (active) {
    return res.json({ success: false, message: '已有进行中的渡劫，请先完成或放弃' });
  }

  // 检查玩家境界是否满足
  const player = database.prepare('SELECT realm, level, hp, attack, defense FROM player WHERE id = ?').get(userId);
  if (!player) return res.json({ success: false, message: '玩家不存在' });
  if (player.realm < tribConfig.realm - 1) {
    return res.json({ success: false, message: `境界不足，需要达到境界${tribConfig.realm - 1}才能渡此天劫` });
  }

  // 检查每日次数限制
  let cooldowns = database.prepare('SELECT * FROM tribulation_cooldowns WHERE player_id = ?').get(userId);
  if (!cooldowns) {
    database.prepare('INSERT INTO tribulation_cooldowns (player_id) VALUES (?)').run(userId);
    cooldowns = { daily_attempts: 0, weekly_successes: 0 };
  }

  // 开始渡劫
  const sessionId = database.prepare(
    'INSERT INTO tribulation_sessions (player_id, tribulation_type, difficulty, status, current_stage, total_stages) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(userId, tribulationType, difficulty, 'active', 1, tribConfig.stages);

  // 更新每日次数
  database.prepare("UPDATE tribulation_cooldowns SET daily_attempts = daily_attempts + 1, last_tribulation = datetime('now', '+8 hours') WHERE player_id = ?").run(userId);

  // 初始天劫信息
  const successRate = Math.max(0.05, Math.min(0.95, tribConfig.baseSuccessRate + diffConfig.successBonus));
  const estimatedDamage = Math.floor(tribConfig.baseDamage * diffConfig.damageMult);

  res.json({
    success: true,
    sessionId: sessionId.lastInsertRowid,
    message: `${tribConfig.icon} ${tribConfig.name}开始！`,
    stage: 1,
    totalStages: tribConfig.stages,
    difficulty,
    successRate: Math.round(successRate * 100) + '%',
    estimatedDamage,
    tip: `渡过${tribConfig.stages}道雷劫即可成功，使用护身符可免疫一次失败惩罚`
  });
});

// POST /api/tribulation/lightning - 迎接天雷（核心渡劫操作）
router.post('/lightning', (req, res) => {
  const userId = extractUserId(req);
  const { sessionId, use_protection = false, use_tribulation_pill = false } = req.body || {};
  const database = getDb();

  if (!sessionId) return res.json({ success: false, message: '缺少渡劫会话ID' });

  const session = database.prepare('SELECT * FROM tribulation_sessions WHERE id = ? AND player_id = ? AND status = ?').get(sessionId, userId, 'active');
  if (!session) return res.json({ success: false, message: '渡劫会话不存在' });

  const tribConfig = TRIBULATION_TYPES[session.tribulation_type];
  const diffConfig = DIFFICULTY_MODIFIERS[session.difficulty] || DIFFICULTY_MODIFIERS.normal;
  const player = database.prepare('SELECT * FROM player WHERE id = ?').get(userId);
  if (!player) return res.json({ success: false, message: '玩家不存在' });

  // 计算成功率
  let successRate = tribConfig.baseSuccessRate + diffConfig.successBonus;
  if (use_tribulation_pill) {
    const pillBonus = tribConfig.requiredItems[0]?.bonus || 0.15;
    successRate = Math.min(0.99, successRate + pillBonus);
  }

  // 消耗物品
  if (use_tribulation_pill) {
    database.prepare('UPDATE player_items SET count = count - 1 WHERE user_id = ? AND item_name LIKE ? AND count > 0').run(userId, '%渡劫丹%');
  }

  const isLastStage = session.current_stage >= session.total_stages;
  const roll = Math.random();
  const success = roll < successRate;

  // 更新会话
  const newLightningCount = session.lightning_count + 1;
  const newStage = success ? session.current_stage + 1 : session.current_stage;
  const status = (!success && !use_protection) ? 'failed' : (newStage > session.total_stages ? 'completed' : 'active');
  const completedAt = status !== 'active' ? new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ') : null;

  database.prepare('UPDATE tribulation_sessions SET current_stage = ?, lightning_count = ?, status = ?, completed_at = ? WHERE id = ?').run(
    newStage, newLightningCount, status, completedAt, sessionId
  );

  if (status === 'failed') {
    // 渡劫失败处理
    const damage = Math.floor(tribConfig.baseDamage * diffConfig.damageMult * 0.5);
    database.prepare('UPDATE player SET hp = MAX(1, hp - ?) WHERE id = ?').run(damage, userId);
    database.prepare('INSERT INTO tribulation_records (player_id, tribulation_type, difficulty, success, damage_taken) VALUES (?, ?, ?, ?, ?)')
      .run(userId, session.tribulation_type, session.difficulty, 0, damage);

    const failureReward = weightedRandom(TRIBULATION_REWARDS.failure);
    let rewardText = '';
    if (failureReward.type === 'spirit_stones') {
      const amount = failureReward.min + Math.floor(Math.random() * (failureReward.max - failureReward.min));
      database.prepare('UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?').run(amount, userId);
      rewardText = `获得${amount}灵石慰藉`;
    }

    return res.json({
      success: false,
      stage: session.current_stage,
      totalStages: session.total_stages,
      lightning: newLightningCount,
      message: `⚡ 第${session.current_stage}道天雷未能渡过！${damage > 0 ? `受到${damage}伤害` : ''}`,
      reward: rewardText,
      hint: '可使用护身符免疫一次失败，渡劫丹可提升成功率'
    });
  }

  if (status === 'completed') {
    // 渡劫成功
    const rewardSpirit = Math.floor((tribConfig.baseDamage * 2 + (player.realm * 100)) * diffConfig.rewardMult);
    database.prepare('UPDATE player SET spirit_stones = spirit_stones + ?, realm = realm + 1 WHERE id = ?').run(rewardSpirit, userId);
    database.prepare('INSERT INTO tribulation_records (player_id, tribulation_type, difficulty, success, damage_taken, reward_spirit) VALUES (?, ?, ?, ?, ?, ?)')
      .run(userId, session.tribulation_type, session.difficulty, 1, 0, rewardSpirit);
    database.prepare('UPDATE tribulation_cooldowns SET weekly_successes = weekly_successes + 1 WHERE player_id = ?').run(userId);

    // 发放额外奖励
    const extraReward = weightedRandom(TRIBULATION_REWARDS.success);
    let extraText = '';
    if (extraReward.type === 'equipment' && extraReward.quality) {
      extraText = `获得${extraReward.quality}品质装备宝箱`;
    } else if (extraReward.type === 'tribulation_pill') {
      database.prepare('INSERT INTO player_items (user_id, item_id, item_name, item_type, count, icon, source, quality) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(userId, 9991, '渡劫丹', 'consumable', 1, '💊', 'tribulation', 'rare');
      extraText = '获得1个渡劫丹';
    }

    return res.json({
      success: true,
      stage: session.total_stages,
      totalStages: session.total_stages,
      lightning: newLightningCount,
      message: `🎉 ${tribConfig.icon} 渡劫成功！突破至境界${player.realm + 1}！`,
      rewards: { spiritStones: rewardSpirit },
      extraReward: extraText,
      newRealm: player.realm + 1
    });
  }

  // 进行中
  const remainingStages = session.total_stages - newStage + 1;
  return res.json({
    success: true,
    stage: newStage,
    totalStages: session.total_stages,
    lightning: newLightningCount,
    message: `⚡ 第${session.current_stage}道天雷渡过！继续坚持！`,
    remainingStages,
    nextSuccessRate: Math.round(Math.max(0.1, successRate - 0.05) * 100) + '%'
  });
});

// POST /api/tribulation/give-up - 放弃渡劫
router.post('/give-up', (req, res) => {
  const userId = extractUserId(req);
  const { sessionId } = req.body || {};
  const database = getDb();
  if (!sessionId) return res.json({ success: false, message: '缺少会话ID' });

  const session = database.prepare('SELECT * FROM tribulation_sessions WHERE id = ? AND player_id = ? AND status = ?').get(sessionId, userId, 'active');
  if (!session) return res.json({ success: false, message: '会话不存在' });

  database.prepare('UPDATE tribulation_sessions SET status = ? WHERE id = ?').run('abandoned', sessionId);
  res.json({ success: true, message: '已放弃本次渡劫' });
});

// GET /api/tribulation/rewards - 渡劫奖励预览
router.get('/rewards', (req, res) => {
  const userId = extractUserId(req);
  const { tribulationType, difficulty } = req.query;
  const database = getDb();

  if (!tribulationType || !TRIBULATION_TYPES[tribulationType]) {
    return res.json({ success: false, message: '无效的渡劫类型' });
  }
  const tribConfig = TRIBULATION_TYPES[tribulationType];
  const diffConfig = DIFFICULTY_MODIFIERS[difficulty] || DIFFICULTY_MODIFIERS.normal;
  const player = database.prepare('SELECT realm FROM player WHERE id = ?').get(userId);

  const baseReward = Math.floor((tribConfig.baseDamage * 2 + ((player?.realm || 1) * 100)) * diffConfig.rewardMult);

  res.json({
    success: true,
    type: tribulationType,
    difficulty: difficulty || 'normal',
    rewards: {
      spiritStones: baseReward,
      bonus: diffConfig.rewardMult > 1.5 ? '稀有装备/高级材料' : '灵石/经验',
      failureConsolation: Math.floor(baseReward * 0.1)
    }
  });
});

module.exports = router;
module.exports.TRIBULATION_TYPES = TRIBULATION_TYPES;
