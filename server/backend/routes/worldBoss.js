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
  if (!db) return;
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
    bossList: bossConfig.bosses.map(b => ({
      id: b.id,
      name: b.name,
      level: b.level,
      quality: b.quality
    })),
    currentBoss: worldBoss.currentBoss ? {
      id: worldBoss.currentBoss.id,
      name: worldBoss.currentBoss.name,
      hp: worldBoss.hp,
      maxHp: worldBoss.maxHp,
      status: worldBoss.status
    } : null,
    totalParticipants: worldBoss.damageRecords.length
  });
});

// 世界BOSS配置（奖励已压缩：基础=level*20，击杀上限3次/周）
const MAX_WEEKLY_KILLS = 3;
const bossConfig = {
  bosses: [
    { id: 1, name: '上古蛟龙', level: 10, hp: 10000, attack: 5000, quality: 'rare', reward: { diamonds: 10, lingshi: 200, magicCrystals: 5 } },
    { id: 2, name: '远古巨龟', level: 20, hp: 50000, attack: 15000, quality: 'epic', reward: { diamonds: 30, lingshi: 400, magicCrystals: 10 } },
    { id: 3, name: '暗黑魔龙', level: 30, hp: 200000, attack: 50000, quality: 'legendary', reward: { diamonds: 50, lingshi: 600, magicCrystals: 20 } },
    { id: 4, name: '九尾妖狐', level: 40, hp: 1000000, attack: 200000, quality: 'legendary', reward: { diamonds: 100, lingshi: 800, magicCrystals: 40 } },
    { id: 5, name: '仙帝残魂', level: 50, hp: 5000000, attack: 1000000, quality: 'mythical', reward: { diamonds: 200, lingshi: 1000, magicCrystals: 100 } }
  ],
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
  status: 'dead' // alive, dead, countdown
};

// 获取当前BOSS状态
router.get('/status', (req, res) => {
  const now = Date.now();
  
  // 检查是否需要刷新BOSS
  if (worldBoss.status === 'dead' && now - worldBoss.lastRefresh > bossConfig.refreshInterval) {
    // 随机选一个BOSS
    const boss = bossConfig.bosses[Math.floor(Math.random() * bossConfig.bosses.length)];
    worldBoss = {
      currentBoss: boss,
      hp: boss.hp,
      maxHp: boss.hp,
      damageRecords: [],
      lastRefresh: now,
      status: 'alive'
    };
  }
  
  res.json({
    boss: worldBoss.currentBoss,
    hp: worldBoss.hp,
    maxHp: worldBoss.maxHp,
    status: worldBoss.status,
    myDamage: 0 // 需传入userId计算
  });
});

// 攻击BOSS
router.post('/attack', (req, res) => {
  const { userId, userName, damage: rawDamage } = req.body;
  
  if (worldBoss.status !== 'alive' || !worldBoss.currentBoss) {
    return res.json({ success: false, message: 'BOSS未刷新' });
  }
  
  // 从DB读取玩家攻击力，计算基础伤害
  let playerAttack = 100;
  if (db) {
    try {
      const player = db.prepare('SELECT attack FROM Users WHERE id = ?').get(userId);
      if (player) playerAttack = player.attack || 100;
    } catch (e) {
      console.log('[worldBoss] 读取玩家攻击失败:', e.message);
    }
  }
  
  // 基础伤害 = 玩家攻击 * 1.5
  let damage = Math.max(1, Math.floor(playerAttack * 1.5));
  
  // 狂暴机制：BOSS血量<30%时，伤害翻倍
  const maxHp = worldBoss.currentBoss.hp || 1;
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
    bossRewards: killed ? worldBoss.currentBoss.reward : null,
    magicCrystalPreview: Math.max(1, mcReward),
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

// 手动刷新BOSS(测试用)
router.post('/refresh', (req, res) => {
  const boss = bossConfig.bosses[Math.floor(Math.random() * bossConfig.bosses.length)];
  worldBoss = {
    currentBoss: boss,
    hp: boss.hp,
    maxHp: boss.hp,
    damageRecords: [],
    lastRefresh: Date.now(),
    status: 'alive'
  };
  
  res.json({ success: true, boss });
});

module.exports = router;
