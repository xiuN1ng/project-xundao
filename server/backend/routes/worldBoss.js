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
  initWorldBossTables();
} catch (e) {
  console.log('[worldBoss] DB连接失败:', e.message);
  db = null;
}

function initWorldBossTables() {
  if (!db) return;
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS world_boss_damage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        boss_id INTEGER NOT NULL,
        damage INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, boss_id)
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS world_boss_rewards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        boss_id INTEGER NOT NULL,
        rank INTEGER NOT NULL,
        reward_diamonds INTEGER DEFAULT 0,
        reward_lingshi BIGINT DEFAULT 0,
        reward_mc INTEGER DEFAULT 0,
        settled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, boss_id)
      )
    `);
    // 每周击杀上限表（按周结算）
    db.exec(`
      CREATE TABLE IF NOT EXISTS world_boss_weekly_kills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        boss_id INTEGER NOT NULL,
        week_key TEXT NOT NULL,
        kill_count INTEGER DEFAULT 0,
        UNIQUE(user_id, boss_id, week_key)
      )
    `);
    console.log('[worldBoss] world_boss_damage/rewards 表初始化完成');
  } catch (e) {
    console.error('[worldBoss] 建表失败:', e.message);
  }
}

// 记录伤害到DB（UPSERT）
function recordDamageToDB(userId, bossId, damage) {
  if (!db || !damage || isNaN(damage)) return;
  try {
    const existing = db.prepare('SELECT id, damage FROM world_boss_damage WHERE user_id = ? AND boss_id = ?').get(userId, bossId);
    if (existing) {
      db.prepare('UPDATE world_boss_damage SET damage = damage + ? WHERE user_id = ? AND boss_id = ?').run(damage, userId, bossId);
    } else {
      db.prepare('INSERT INTO world_boss_damage (user_id, boss_id, damage) VALUES (?, ?, ?)').run(userId, bossId, damage);
    }
  } catch (e) {
    console.error('[worldBoss] 记录伤害失败:', e.message);
  }
}

// 从DB获取排名
function getDamageRankingFromDB(bossId, limit = 50) {
  if (!db) return [];
  try {
    return db.prepare(`
      SELECT user_id as userId, damage,
             RANK() OVER (ORDER BY damage DESC) as rank
      FROM world_boss_damage
      WHERE boss_id = ?
      ORDER BY damage DESC
      LIMIT ?
    `).all(bossId, limit);
  } catch (e) {
    console.error('[worldBoss] 查询排名失败:', e.message);
    return [];
  }
}

// 根路径
router.get('/', (req, res) => {
  res.json({
    hasBoss: worldBoss.status === 'alive' && worldBoss.currentBoss !== null,
    bossList: DIFFICULTY_TIERS.flatMap(tier => 
      tier.bosses.map(b => ({
        id: b.id,
        name: b.name,
        level: b.level,
        quality: b.quality,
        tier: tier.tier,
        tierName: tier.name,
        minLevel: tier.minLevel,
        maxLevel: tier.maxLevel
      }))
    ),
    currentBoss: worldBoss.currentBoss ? {
      id: worldBoss.currentBoss.id,
      name: worldBoss.currentBoss.name,
      hp: worldBoss.hp,
      maxHp: worldBoss.maxHp,
      status: worldBoss.status,
      tier: worldBoss.currentTier ? worldBoss.currentTier.tier : null,
      tierName: worldBoss.currentTier ? worldBoss.currentTier.name : null,
    } : null,
    totalParticipants: worldBoss.damageRecords.length,
    defenseReduction: worldBoss.defenseReduction || 0,
    currentTier: worldBoss.currentTier ? { tier: worldBoss.currentTier.tier, name: worldBoss.currentTier.name } : null,
  });
});

// 世界BOSS配置（分级系统 v5.0 — 按玩家等级匹配难度）
const MAX_WEEKLY_KILLS = 3;

// 难度等级配置
const DIFFICULTY_TIERS = [
  {
    tier: 0, name: '幼崽', minLevel: 1, maxLevel: 20,
    bosses: [
      { id: 101, name: '幼年蛟龙', level: 5,  baseHp: 3000,  baseAtk: 300,  quality: 'common',   reward: { lingshi: 150, exp: 50,  magicCrystals: 3  } },
      { id: 102, name: '幼龟',       level: 10, baseHp: 8000,  baseAtk: 600,  quality: 'common',   reward: { lingshi: 200, exp: 80,  magicCrystals: 5  } },
      { id: 103, name: '妖狐幼崽',   level: 15, baseHp: 15000, baseAtk: 1000, quality: 'rare',     reward: { lingshi: 300, exp: 120, magicCrystals: 8  } },
      { id: 104, name: '魔龙之子',   level: 20, baseHp: 30000, baseAtk: 2000, quality: 'epic',    reward: { lingshi: 400, exp: 200, magicCrystals: 15 } },
    ]
  },
  {
    tier: 1, name: '本体', minLevel: 21, maxLevel: 40,
    bosses: [
      { id: 201, name: '上古蛟龙',   level: 22, baseHp: 60000,  baseAtk: 4000,  quality: 'rare',     reward: { lingshi: 400, exp: 150, magicCrystals: 10 } },
      { id: 202, name: '远古巨龟',   level: 28, baseHp: 120000, baseAtk: 8000,  quality: 'epic',    reward: { lingshi: 600, exp: 250, magicCrystals: 20 } },
      { id: 203, name: '暗黑魔龙',   level: 35, baseHp: 250000, baseAtk: 15000, quality: 'legendary',reward: { lingshi: 800, exp: 400, magicCrystals: 35 } },
      { id: 204, name: '九尾妖狐',   level: 40, baseHp: 500000, baseAtk: 30000, quality: 'legendary',reward: { lingshi: 1000,exp: 600, magicCrystals: 50 } },
    ]
  },
  {
    tier: 2, name: '觉醒', minLevel: 41, maxLevel: 60,
    bosses: [
      { id: 301, name: '觉醒蛟龙',   level: 42, baseHp: 800000,  baseAtk: 50000,  quality: 'epic',     reward: { lingshi: 800, exp: 500,  magicCrystals: 40 } },
      { id: 302, name: '觉醒巨龟',   level: 48, baseHp: 1500000, baseAtk: 80000,  quality: 'legendary', reward: { lingshi: 1200,exp: 800,  magicCrystals: 60 } },
      { id: 303, name: '深渊魔龙',   level: 55, baseHp: 3000000, baseAtk: 150000, quality: 'legendary', reward: { lingshi: 1600,exp: 1200, magicCrystals: 90 } },
      { id: 304, name: '九尾妖狐·觉',level: 60, baseHp: 6000000, baseAtk: 300000, quality: 'mythical',  reward: { lingshi: 2000,exp: 1800, magicCrystals: 150 } },
    ]
  },
  {
    tier: 3, name: '完全体', minLevel: 61, maxLevel: 999,
    bosses: [
      { id: 401, name: '真龙残魂',   level: 65, baseHp: 10000000, baseAtk: 500000, quality: 'mythical',  reward: { lingshi: 2000,exp: 1500, magicCrystals: 120 } },
      { id: 402, name: '玄武圣灵',   level: 70, baseHp: 18000000, baseAtk: 800000, quality: 'mythical',  reward: { lingshi: 2500,exp: 2000, magicCrystals: 180 } },
      { id: 403, name: '魔帝残念',   level: 75, baseHp: 30000000, baseAtk: 1500000,quality: 'mythical',  reward: { lingshi: 3000,exp: 2800, magicCrystals: 250 } },
      { id: 404, name: '仙帝残魂',   level: 80, baseHp: 50000000, baseAtk: 3000000,quality: 'mythical',  reward: { lingshi: 4000,exp: 4000, magicCrystals: 400 } },
    ]
  }
];

// 根据玩家等级选择难度
function getDifficultyTierForPlayer(playerLevel) {
  for (const tier of DIFFICULTY_TIERS) {
    if (playerLevel >= tier.minLevel && playerLevel <= tier.maxLevel) {
      return tier;
    }
  }
  // 超出范围默认最高难度
  return DIFFICULTY_TIERS[3];
}

// 难度难度动态BOSS属性（玩家等级会影响BOSS血量/攻击）
function getBossForTier(tier, playerLevel) {
  // 从该难度随机选一个BOSS
  const boss = tier.bosses[Math.floor(Math.random() * tier.bosses.length)];
  // 根据玩家等级做动态缩放（让挑战更有意义）
  // 玩家等级相对BOSS等级的偏移系数
  const levelRatio = Math.max(0.5, Math.min(2.0, playerLevel / Math.max(boss.level, 1)));
  const hpScale = 0.5 + levelRatio * 0.5; // 0.5x ~ 1.5x
  const atkScale = 0.5 + levelRatio * 0.5;
  return {
    id: boss.id,
    name: boss.name,
    level: boss.level,
    tier: tier.tier,
    tierName: tier.name,
    hp: Math.floor(boss.baseHp * hpScale),
    maxHp: Math.floor(boss.baseHp * hpScale),
    attack: Math.floor(boss.baseAtk * atkScale),
    quality: boss.quality,
    reward: boss.reward
  };
}

// 兼容旧配置（用于刷新等场景）
const LEGACY_BOSSES = [
  { id: 1, name: '上古蛟龙', level: 10, hp: 10000, attack: 5000, quality: 'rare', reward: { diamonds: 10, lingshi: 200, magicCrystals: 5 } },
  { id: 2, name: '远古巨龟', level: 20, hp: 50000, attack: 15000, quality: 'epic', reward: { diamonds: 30, lingshi: 400, magicCrystals: 10 } },
  { id: 3, name: '暗黑魔龙', level: 30, hp: 200000, attack: 50000, quality: 'legendary', reward: { diamonds: 50, lingshi: 600, magicCrystals: 20 } },
  { id: 4, name: '九尾妖狐', level: 40, hp: 1000000, attack: 200000, quality: 'legendary', reward: { diamonds: 100, lingshi: 800, magicCrystals: 40 } },
  { id: 5, name: '仙帝残魂', level: 50, hp: 5000000, attack: 1000000, quality: 'mythical', reward: { diamonds: 200, lingshi: 1000, magicCrystals: 100 } }
];

const bossConfig = {
  bosses: LEGACY_BOSSES,
  refreshInterval: 3600000, // 1小时刷新
  maxDamageRecords: 100
};

// 魔晶品质系数（与 server.js MAGIC_CRYSTAL_CONFIG 一致）
const BOSS_QUALITY_MC = {
  rare: 1,
  epic: 1.5,
  legendary: 2,
  mythical: 5,
};

// 世界BOSS数据
let worldBoss = {
  currentBoss: null,
  hp: 0,
  maxHp: 0,
  damageRecords: [], // { userId, name, damage, time }
  lastRefresh: 0,
  status: 'dead', // alive, dead, countdown
  defenseReduction: 0,    // 全服鼓舞降低BOSS防御，每次鼓舞+5%，上限50%
  defenseReductionCount: 0,
  currentTier: null,     // 当前BOSS难度等级
};

// 获取当前BOSS状态
router.get('/status', (req, res) => {
  const { userId } = req.query;
  const now = Date.now();
  
  // 检查是否需要刷新BOSS（基于难度等级）
  if (worldBoss.status === 'dead' && now - worldBoss.lastRefresh > bossConfig.refreshInterval) {
    // 默认选一个BOSS（基于玩家等级）
    let playerLevel = 1;
    if (db && userId) {
      try {
        const player = db.prepare('SELECT level FROM Users WHERE id = ?').get(userId);
        if (player) playerLevel = player.level || 1;
      } catch (e) { /* ignore */ }
    }
    const tier = getDifficultyTierForPlayer(playerLevel);
    const boss = getBossForTier(tier, playerLevel);
    worldBoss = {
      currentBoss: boss,
      hp: boss.hp,
      maxHp: boss.hp,
      damageRecords: [],
      lastRefresh: now,
      status: 'alive',
      defenseReduction: 0,
      defenseReductionCount: 0,
      currentTier: tier
    };
  }
  
  // 读取玩家对当前BOSS的伤害
  let myDamage = 0;
  if (db && userId && worldBoss.currentBoss) {
    try {
      const rec = db.prepare('SELECT damage FROM world_boss_damage WHERE user_id = ? AND boss_id = ?').get(userId, worldBoss.currentBoss.id);
      if (rec) myDamage = rec.damage || 0;
    } catch (e) { /* ignore */ }
  }
  
  res.json({
    boss: worldBoss.currentBoss,
    hp: worldBoss.hp,
    maxHp: worldBoss.maxHp,
    status: worldBoss.status,
    defenseReduction: worldBoss.defenseReduction,
    defenseReductionCount: worldBoss.defenseReductionCount,
    currentTier: worldBoss.currentTier ? { tier: worldBoss.currentTier.tier, name: worldBoss.currentTier.name } : null,
    myDamage,
    difficultyTiers: DIFFICULTY_TIERS.map(t => ({ tier: t.tier, name: t.name, minLevel: t.minLevel, maxLevel: t.maxLevel })),
  });
});

// 攻击BOSS
router.post('/attack', (req, res) => {
  const { userId, userName, difficulty } = req.body;
  
  // 如果BOSS已死亡或不存在，可以选择难度后生成新BOSS
  if (worldBoss.status !== 'alive' || !worldBoss.currentBoss) {
    // 根据难度参数或玩家等级选择BOSS
    let playerLevel = 1;
    if (db && userId) {
      try {
        const player = db.prepare('SELECT level FROM Users WHERE id = ?').get(userId);
        if (player) playerLevel = player.level || 1;
      } catch (e) { /* ignore */ }
    }
    
    let tier;
    if (difficulty !== undefined) {
      // 指定难度
      tier = DIFFICULTY_TIERS.find(t => t.tier === parseInt(difficulty)) || getDifficultyTierForPlayer(playerLevel);
    } else {
      tier = getDifficultyTierForPlayer(playerLevel);
    }
    const boss = getBossForTier(tier, playerLevel);
    worldBoss = {
      currentBoss: boss,
      hp: boss.hp,
      maxHp: boss.hp,
      damageRecords: [],
      lastRefresh: Date.now(),
      status: 'alive',
      defenseReduction: 0,
      defenseReductionCount: 0,
      currentTier: tier
    };
  }
  
  // 从DB读取玩家攻击力
  let playerAttack = 100;
  let playerHp = 1000;
  if (db) {
    try {
      const player = db.prepare('SELECT attack, hp FROM Users WHERE id = ?').get(userId);
      if (player) {
        playerAttack = player.attack || 100;
        playerHp = player.hp || 1000;
      }
    } catch (e) {
      console.log('[worldBoss] 读取玩家属性失败:', e.message);
    }
  }
  
  // 基础伤害 = 玩家攻击 * 1.5
  let damage = Math.max(1, Math.floor(playerAttack * 1.5));
  
  // 单次伤害上限：不超过玩家HP的50%
  const damageCap = Math.floor(playerHp * 0.5);
  damage = Math.min(damage, damageCap);
  
  // BOSS防御减免：每次鼓舞降低BOSS防御5%，等同于玩家伤害+5%
  const defenseReduction = worldBoss.defenseReduction || 0;
  damage = Math.floor(damage * (1 + defenseReduction));
  
  // 狂暴机制：BOSS血量<30%时，伤害翻倍
  const maxHp = worldBoss.currentBoss.maxHp || 1;
  const hpPercent = worldBoss.hp / maxHp;
  const furyMultiplier = hpPercent < 0.3 ? 2 : 1;
  damage = Math.floor(damage * furyMultiplier);

  // 记录伤害到DB
  recordDamageToDB(userId, worldBoss.currentBoss.id, damage);

  // 记录伤害（内存）
  const existing = worldBoss.damageRecords.find(r => r.userId === userId);
  const prevTotalDamage = existing ? existing.damage : 0;
  const newTotalDamage = prevTotalDamage + damage;
  
  if (existing) {
    existing.damage = newTotalDamage;
  } else {
    worldBoss.damageRecords.push({
      userId,
      name: userName,
      damage: newTotalDamage,
      time: Date.now()
    });
  }
  
  // 排序
  worldBoss.damageRecords.sort((a, b) => b.damage - a.damage);
  
  // 限制记录数
  if (worldBoss.damageRecords.length > bossConfig.maxDamageRecords) {
    worldBoss.damageRecords = worldBoss.damageRecords.slice(0, bossConfig.maxDamageRecords);
  }
  
  // 计算攻击后的剩余HP（确保非负数且为有效数字）
  const remainingHp = Math.max(0, Number(worldBoss.hp) - damage);
  worldBoss.hp = remainingHp;
  
  // 检查是否击杀
  let killed = false;
  if (remainingHp <= 0) {
    worldBoss.status = 'dead';
    worldBoss.lastRefresh = Date.now();
    killed = true;
  }
  
  // 计算排名
  const rank = worldBoss.damageRecords.findIndex(r => r.userId === userId) + 1;
  
  // 魔晶奖励预览（根据本次伤害占总血量比例）
  const bossMaxHp = worldBoss.currentBoss.hp || 1;
  const damageRatio = damage / bossMaxHp;
  const mcReward = killed
    ? Math.floor(worldBoss.currentBoss.reward.magicCrystals || 0)
    : Math.floor((worldBoss.currentBoss.reward.magicCrystals || 0) * damageRatio * 0.5);
  
  res.json({
    success: true,
    remainingHp,
    rank,
    totalDamage: newTotalDamage,
    killed,
    furyMultiplier,
    damageCap,
    defenseReduction: worldBoss.defenseReduction || 0,
    bossRewards: killed ? worldBoss.currentBoss.reward : null,
    magicCrystalPreview: Math.max(1, mcReward),
  });
});

// 鼓舞机制：花费50灵石，降低BOSS防御5%（等同于所有玩家伤害+5%，可叠加）
router.post('/encourage', (req, res) => {
  const { userId } = req.body;
  
  if (worldBoss.status !== 'alive' || !worldBoss.currentBoss) {
    return res.json({ success: false, message: 'BOSS未刷新，请等待下次刷新' });
  }
  
  const ENCOURAGE_COST = 50; // 鼓舞消耗灵石
  const DEFENSE_REDUCTION_BONUS = 0.05; // 每次鼓舞降低BOSS防御5%
  const MAX_DEFENSE_REDUCTION = 0.50; // 最多降低50%防御（10次鼓舞）
  
  // 扣除灵石
  if (db) {
    try {
      const player = db.prepare('SELECT lingshi FROM Users WHERE id = ?').get(userId);
      if (!player) {
        return res.json({ success: false, message: '玩家不存在' });
      }
      if ((player.lingshi || 0) < ENCOURAGE_COST) {
        return res.json({ success: false, message: `灵石不足，需要${ENCOURAGE_COST}灵石` });
      }
      db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(ENCOURAGE_COST, userId);
    } catch (e) {
      console.error('[worldBoss] encourage扣灵石失败:', e.message);
      return res.status(500).json({ success: false, message: '数据库错误' });
    }
  }
  
  // 增加防御减免（上限50%）
  if ((worldBoss.defenseReduction || 0) < MAX_DEFENSE_REDUCTION) {
    worldBoss.defenseReduction = Math.min(MAX_DEFENSE_REDUCTION, (worldBoss.defenseReduction || 0) + DEFENSE_REDUCTION_BONUS);
    worldBoss.defenseReductionCount = (worldBoss.defenseReductionCount || 0) + 1;
  }
  
  res.json({
    success: true,
    message: `鼓舞成功！BOSS防御降低${Math.round(worldBoss.defenseReduction * 100)}%，全服玩家伤害提升`,
    defenseReduction: Math.round(worldBoss.defenseReduction * 100),
    defenseReductionCount: worldBoss.defenseReductionCount,
    cost: ENCOURAGE_COST,
  });
});

// 获取伤害排行
router.get('/ranks', (req, res) => {
  if (db && worldBoss.currentBoss) {
    const dbRanks = getDamageRankingFromDB(worldBoss.currentBoss.id, 50);
    return res.json({ success: true, ranks: dbRanks, source: 'db' });
  }
  const ranks = worldBoss.damageRecords.slice(0, 50);
  res.json({ success: true, ranks, source: 'memory' });
});

// 结算BOSS奖励（包含魔晶）
router.post('/settle', (req, res) => {
  const { userId } = req.body;

  if (worldBoss.status !== 'dead') {
    return res.json({ success: false, message: 'BOSS未死亡，无法结算' });
  }

  const boss = worldBoss.currentBoss;
  if (!boss) {
    return res.json({ success: false, message: 'BOSS数据异常' });
  }

  // 检查每周击杀上限
  const now = new Date();
  const year = now.getFullYear();
  const week = Math.ceil((now.getMonth() * 30 + now.getDate()) / 7);
  const weekKey = `${year}-W${week}`;
  let weeklyKills = 0;
  if (db) {
    try {
      const wk = db.prepare('SELECT kill_count FROM world_boss_weekly_kills WHERE user_id = ? AND boss_id = ? AND week_key = ?').get(userId, boss.id, weekKey);
      weeklyKills = wk ? wk.kill_count : 0;
    } catch (e) { weeklyKills = 0; }
  }
  if (weeklyKills >= MAX_WEEKLY_KILLS) {
    return res.json({ success: false, message: `本周该BOSS击杀次数已用尽（${MAX_WEEKLY_KILLS}次）` });
  }

  // 从DB获取排名
  let myRecord = null;
  let myRank = 0;
  if (db) {
    const ranks = getDamageRankingFromDB(boss.id, 1000);
    myRecord = ranks.find(r => r.userId === userId);
    if (myRecord) myRank = myRecord.rank;
  }
  if (!myRecord) {
    const memRecord = worldBoss.damageRecords.find(r => r.userId === userId);
    if (!memRecord) {
      return res.json({ success: false, message: '您未参与本次BOSS战' });
    }
    myRecord = memRecord;
    myRank = worldBoss.damageRecords.findIndex(r => r.userId === userId) + 1;
  }

  const totalDamage = myRecord.damage;

  // 奖励公式重构：基础=level*20，按排名分配，上限500灵石/次
  // 不再使用资产比例（导致通货膨胀）
  const baseReward = boss.level * 20; // 200/400/600/800/1000
  const rankBonus = myRank <= 3 ? Math.floor(baseReward * (0.3 - myRank * 0.05)) : 0; // Top3额外
  const expReward = Math.max(1, Math.floor(baseReward * 0.1 / Math.max(myRank, 1)));
  const stoneReward = Math.min(500, Math.floor(baseReward / Math.max(myRank, 1)) + rankBonus);

  // 魔晶奖励
  const baseMc = boss.reward.magicCrystals || 5;
  const mcReward = Math.max(1, Math.floor(baseMc * 0.5 / Math.max(myRank, 1)));

  // 最后一击额外魔晶
  const topRecord = worldBoss.damageRecords[0];
  const isKiller = topRecord?.userId === userId;
  const killerBonus = isKiller ? Math.floor(baseMc * 0.3) : 0;

  // 实际发放灵石到玩家账户
  if (db && stoneReward > 0) {
    try {
      db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(stoneReward, userId);
    } catch (e) {
      console.error('[worldBoss] 发放灵石失败:', e.message);
    }
  }

  // 写入结算记录
  if (db) {
    try {
      db.prepare(`
        INSERT OR REPLACE INTO world_boss_rewards
        (user_id, boss_id, rank, reward_diamonds, reward_lingshi, reward_mc, settled_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(userId, boss.id, myRank, 0, stoneReward, mcReward + killerBonus);
      // 更新每周击杀计数
      db.prepare(`
        INSERT INTO world_boss_weekly_kills (user_id, boss_id, week_key, kill_count)
        VALUES (?, ?, ?, 1)
        ON CONFLICT(user_id, boss_id, week_key) DO UPDATE SET kill_count = kill_count + 1
      `).run(userId, boss.id, weekKey);
    } catch (e) {
      console.error('[worldBoss] 写入结算记录失败:', e.message);
    }
  }

  res.json({
    success: true,
    rewards: {
      exp: expReward,
      spiritStones: stoneReward,
      magicCrystals: mcReward + killerBonus,
      killerBonus: isKiller ? killerBonus : 0,
    },
    damage: totalDamage,
    rank: myRank,
  });
});

// 我的伤害
router.get('/my-damage/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  if (db && worldBoss.currentBoss) {
    const ranks = getDamageRankingFromDB(worldBoss.currentBoss.id, 1000);
    const record = ranks.find(r => r.userId === userId);
    if (record) {
      return res.json({ damage: record.damage, rank: record.rank, total: ranks.length, source: 'db' });
    }
  }
  // 回退到内存
  const record = worldBoss.damageRecords.find(r => r.userId === userId);
  if (!record) {
    return res.json({ damage: 0, rank: 0 });
  }
  const rank = worldBoss.damageRecords.findIndex(r => r.userId === userId) + 1;
  res.json({ damage: record.damage, rank, total: worldBoss.damageRecords.length, source: 'memory' });
});

// 手动刷新BOSS(测试用)，支持指定难度
router.post('/refresh', (req, res) => {
  const { difficulty, playerLevel } = req.body;
  let tier;
  if (difficulty !== undefined) {
    tier = DIFFICULTY_TIERS.find(t => t.tier === parseInt(difficulty)) || DIFFICULTY_TIERS[0];
  } else {
    const lvl = playerLevel || 1;
    tier = getDifficultyTierForPlayer(lvl);
  }
  const boss = getBossForTier(tier, playerLevel || tier.minLevel);
  worldBoss = {
    currentBoss: boss,
    hp: boss.hp,
    maxHp: boss.hp,
    damageRecords: [],
    lastRefresh: Date.now(),
    status: 'alive',
    defenseReduction: 0,
    defenseReductionCount: 0,
    currentTier: tier
  };
  
  res.json({ success: true, boss, tier: { tier: tier.tier, name: tier.name } });
});

module.exports = router;
