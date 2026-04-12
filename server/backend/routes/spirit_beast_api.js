/**
 * 灵兽野生捕获 / 进化树系统 (P88-6)
 * 野外捕获灵兽、进化树、羁绊系统、灵兽天赋
 */

const express = require('express');
const router = express.Router();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'game.db');

let db = null;
function getDb() {
  if (!db) {
    try {
      const Database = require('better-sqlite3');
      db = new Database(DB_PATH);
      db.pragma('journal_mode=WAL');
      db.pragma('busy_timeout=5000');
      initTables();
    } catch (e) {
      db = null;
    }
  }
  return db;
}

function getPlayerId(req) {
  return parseInt(req.headers['x-player-id'] || req.query.player_id || req.body?.player_id || 1);
}

// ==================== 配置 ====================
// 野外捕获地点
const CATCH_LOCATIONS = [
  { id: 1, name: '青云山麓', icon: '⛰️', minLevel: 1, catchRate: 0.4, beastPool: ['xiaohu', 'cat', 'wolf'], cost: 0 },
  { id: 2, name: '幽冥森林', icon: '🌲', minLevel: 10, catchRate: 0.3, beastPool: ['fox', 'snake', 'bat'], cost: 0 },
  { id: 3, name: '火焰山谷', icon: '🌋', minLevel: 20, catchRate: 0.25, beastPool: ['phoenix', 'lion', 'tiger'], cost: 50 },
  { id: 4, name: '寒冰深渊', icon: '❄️', minLevel: 30, catchRate: 0.2, beastPool: ['dragon', 'turtle', 'qilin'], cost: 100 },
  { id: 5, name: '天道秘境', icon: '🌌', minLevel: 50, catchRate: 0.1, beastPool: ['tianma', 'baize', 'zhu'], cost: 200 },
];

// 捕兽网类型
const NET_TYPES = {
  ordinary: { name: '普通捕兽网', cost: 0, rateBonus: 0 },
  fine: { name: '精细捕兽网', cost: 50, rateBonus: 0.1 },
  golden: { name: '金丝捕兽网', cost: 200, rateBonus: 0.2 },
  mystic: { name: '神秘捕兽网', cost: 500, rateBonus: 0.3 },
};

// 灵兽类型定义
const BEAST_TYPES = {
  xiaohu: {
    id: 'xiaohu', name: '小虎', icon: '🐯', type: 'attack',
    baseStats: { hp: 60, attack: 80, defense: 40, speed: 70, magic: 30 },
    evolveTo: 'dahu', evolveLevel: 15,
    qualityRanks: { white: 1.0, green: 1.3, blue: 1.6, purple: 2.0, orange: 2.5 },
  },
  cat: {
    id: 'cat', name: '灵猫', icon: '🐱', type: 'speed',
    baseStats: { hp: 50, attack: 60, defense: 35, speed: 120, magic: 40 },
    evolveTo: 'jade_cat', evolveLevel: 15,
    qualityRanks: { white: 1.0, green: 1.3, blue: 1.6, purple: 2.0, orange: 2.5 },
  },
  wolf: {
    id: 'wolf', name: '妖狼', icon: '🐺', type: 'attack',
    baseStats: { hp: 70, attack: 90, defense: 45, speed: 60, magic: 35 },
    evolveTo: 'fenris', evolveLevel: 20,
    qualityRanks: { white: 1.0, green: 1.3, blue: 1.6, purple: 2.0, orange: 2.5 },
  },
  fox: {
    id: 'fox', name: '灵狐', icon: '🦊', type: 'magic',
    baseStats: { hp: 65, attack: 70, defense: 40, speed: 80, magic: 90 },
    evolveTo: 'nine_tail', evolveLevel: 25,
    qualityRanks: { white: 1.0, green: 1.3, blue: 1.6, purple: 2.0, orange: 2.5 },
  },
  snake: {
    id: 'snake', name: '灵蛇', icon: '🐍', type: 'magic',
    baseStats: { hp: 55, attack: 75, defense: 30, speed: 95, magic: 85 },
    evolveTo: 'python', evolveLevel: 20,
    qualityRanks: { white: 1.0, green: 1.3, blue: 1.6, purple: 2.0, orange: 2.5 },
  },
  bat: {
    id: 'bat', name: '血蝠', icon: '🦇', type: 'speed',
    baseStats: { hp: 45, attack: 65, defense: 25, speed: 110, magic: 50 },
    evolveTo: 'vampire', evolveLevel: 25,
    qualityRanks: { white: 1.0, green: 1.3, blue: 1.6, purple: 2.0, orange: 2.5 },
  },
  phoenix: {
    id: 'phoenix', name: '朱雀', icon: '🦅', type: 'magic',
    baseStats: { hp: 80, attack: 70, defense: 50, speed: 75, magic: 130 },
    evolveTo: 'divine_phoenix', evolveLevel: 40,
    qualityRanks: { white: 1.0, green: 1.3, blue: 1.6, purple: 2.0, orange: 2.5 },
  },
  lion: {
    id: 'lion', name: '金狮', icon: '🦁', type: 'attack',
    baseStats: { hp: 100, attack: 110, defense: 70, speed: 55, magic: 40 },
    evolveTo: 'stone_lion', evolveLevel: 30,
    qualityRanks: { white: 1.0, green: 1.3, blue: 1.6, purple: 2.0, orange: 2.5 },
  },
  tiger: {
    id: 'tiger', name: '白虎', icon: '🐅', type: 'attack',
    baseStats: { hp: 85, attack: 120, defense: 55, speed: 90, magic: 45 },
    evolveTo: 'white_tiger', evolveLevel: 35,
    qualityRanks: { white: 1.0, green: 1.3, blue: 1.6, purple: 2.0, orange: 2.5 },
  },
  dragon: {
    id: 'dragon', name: '青龙', icon: '🐉', type: 'balanced',
    baseStats: { hp: 95, attack: 100, defense: 65, speed: 80, magic: 85 },
    evolveTo: 'true_dragon', evolveLevel: 45,
    qualityRanks: { white: 1.0, green: 1.3, blue: 1.6, purple: 2.0, orange: 2.5 },
  },
  turtle: {
    id: 'turtle', name: '玄龟', icon: '🐢', type: 'tank',
    baseStats: { hp: 130, attack: 50, defense: 100, speed: 30, magic: 60 },
    evolveTo: 'xuan_turtle', evolveLevel: 35,
    qualityRanks: { white: 1.0, green: 1.3, blue: 1.6, purple: 2.0, orange: 2.5 },
  },
  qilin: {
    id: 'qilin', name: '麒麟', icon: '🦄', type: 'balanced',
    baseStats: { hp: 90, attack: 85, defense: 70, speed: 85, magic: 90 },
    evolveTo: 'divine_qilin', evolveLevel: 50,
    qualityRanks: { white: 1.0, green: 1.3, blue: 1.6, purple: 2.0, orange: 2.5 },
  },
  tianma: {
    id: 'tianma', name: '天马', icon: '🐎', type: 'speed',
    baseStats: { hp: 75, attack: 90, defense: 50, speed: 140, magic: 60 },
    evolveTo: 'divine_horse', evolveLevel: 45,
    qualityRanks: { white: 1.0, green: 1.3, blue: 1.6, purple: 2.0, orange: 2.5 },
  },
  baize: {
    id: 'baize', name: '白泽', icon: '🦌', type: 'magic',
    baseStats: { hp: 80, attack: 75, defense: 60, speed: 85, magic: 120 },
    evolveTo: 'divine_baize', evolveLevel: 50,
    qualityRanks: { white: 1.0, green: 1.3, blue: 1.6, purple: 2.0, orange: 2.5 },
  },
  zhu: {
    id: 'zhu', name: '夔牛', icon: '🐂', type: 'tank',
    baseStats: { hp: 150, attack: 80, defense: 110, speed: 25, magic: 50 },
    evolveTo: 'divine_zhu', evolveLevel: 50,
    qualityRanks: { white: 1.0, green: 1.3, blue: 1.6, purple: 2.0, orange: 2.5 },
  },
};

// 进化树阶段
const EVOLUTION_STAGES = [
  { stage: 0, name: '幼年期', icon: '🥚', unlockTalentPoints: 0 },
  { stage: 1, name: '成长期', icon: '🐣', unlockTalentPoints: 1 },
  { stage: 2, name: '成熟期', icon: '🐾', unlockTalentPoints: 2 },
  { stage: 3, name: '完全体', icon: '🌟', unlockTalentPoints: 3 },
  { stage: 4, name: '究极体', icon: '✨', unlockTalentPoints: 5 },
];

// 10种灵兽天赋
const TALENTS = [
  { id: 'attack', name: '攻击强化', icon: '⚔️', desc: '提升灵兽攻击力' },
  { id: 'defense', name: '防御强化', icon: '🛡️', desc: '提升灵兽防御力' },
  { id: 'hp', name: '生命强化', icon: '❤️', desc: '提升灵兽生命值' },
  { id: 'speed', name: '速度强化', icon: '💨', desc: '提升灵兽速度' },
  { id: 'magic', name: '灵力强化', icon: '🔮', desc: '提升灵兽灵力' },
  { id: 'crit', name: '暴击强化', icon: '💥', desc: '提升暴击率' },
  { id: 'dodge', name: '闪避强化', icon: '🌪️', desc: '提升闪避率' },
  { id: 'lucky', name: '幸运强化', icon: '🍀', desc: '提升灵兽幸运' },
  { id: 'bond', name: '羁绊强化', icon: '🔗', desc: '增强与主人的羁绊' },
  { id: 'grow', name: '成长强化', icon: '📈', desc: '加快升级经验获取' },
];

// 羁绊效果表
const BOND_EFFECTS = [
  { level: 1, name: '初识', effect: '灵兽基础属性+5%', statBonus: 0.05 },
  { level: 2, name: '熟悉', effect: '灵兽基础属性+10%', statBonus: 0.10 },
  { level: 3, name: '默契', effect: '灵兽基础属性+15%', statBonus: 0.15 },
  { level: 4, name: '同心', effect: '灵兽基础属性+20%，主人获得灵兽10%属性加成', statBonus: 0.20 },
  { level: 5, name: '合一', effect: '灵兽基础属性+30%，主人获得灵兽20%属性加成', statBonus: 0.30 },
];

// ==================== 工具函数 ====================
function initTables() {
  const database = getDb();
  if (!database) return;
  database.exec(`
    CREATE TABLE IF NOT EXISTS player_spirits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      spirit_type TEXT NOT NULL,
      name TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      exp INTEGER DEFAULT 0,
      quality TEXT DEFAULT 'white',
      stars INTEGER DEFAULT 0,
      blood_line TEXT DEFAULT NULL,
      blood_awakened INTEGER DEFAULT 0,
      skills TEXT DEFAULT '[]',
      equipped_gear TEXT DEFAULT '{}',
      appearance TEXT DEFAULT NULL,
      current_hp INTEGER DEFAULT 100,
      max_hp INTEGER DEFAULT 100,
      attack INTEGER DEFAULT 10,
      defense INTEGER DEFAULT 10,
      speed INTEGER DEFAULT 10,
      magic INTEGER DEFAULT 10,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS spirit_beast_catch_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      location_id INTEGER NOT NULL,
      beast_type TEXT NOT NULL,
      beast_name TEXT NOT NULL,
      quality TEXT DEFAULT 'white',
      success INTEGER DEFAULT 0,
      net_type TEXT DEFAULT 'ordinary',
      caught_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS spirit_beast_talent_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      beast_id INTEGER NOT NULL,
      talent_id TEXT NOT NULL,
      points INTEGER DEFAULT 0,
      UNIQUE(player_id, beast_id, talent_id)
    );

    CREATE TABLE IF NOT EXISTS spirit_beast_bond (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      beast_id INTEGER NOT NULL,
      bond_level INTEGER DEFAULT 1,
      exp INTEGER DEFAULT 0,
      last_feed_at TEXT DEFAULT (datetime('now')),
      UNIQUE(player_id, beast_id)
    );
  `);
}

// 计算灵兽当前进化阶段
function calcEvolutionStage(beast) {
  const config = BEAST_TYPES[beast.beast_type];
  if (!config || !config.evolveLevel) return 0;
  if (beast.level >= config.evolveLevel + 30) return 4;
  if (beast.level >= config.evolveLevel + 20) return 3;
  if (beast.level >= config.evolveLevel + 10) return 2;
  if (beast.level >= config.evolveLevel) return 1;
  return 0;
}

// 获取灵兽总天赋点
function getTotalTalentPoints(beast, stage) {
  const stageConfig = EVOLUTION_STAGES[stage] || EVOLUTION_STAGES[0];
  return stageConfig.unlockTalentPoints;
}

// 计算天赋加成
function calcTalentBonus(playerId, beastId, statKey) {
  const database = getDb();
  if (!database) return 0;
  const rows = database.prepare(
    'SELECT SUM(points) as total FROM spirit_beast_talent_points WHERE player_id = ? AND beast_id = ? AND talent_id = ?'
  ).get(playerId, beastId, statKey);
  return (rows?.total || 0) * 0.05; // 每点5%
}

// 获取羁绊等级
function getBondLevel(playerId, beastId) {
  const database = getDb();
  if (!database) return { level: 1, exp: 0, effect: BOND_EFFECTS[0] };
  const row = database.prepare('SELECT bond_level, exp FROM spirit_beast_bond WHERE player_id = ? AND beast_id = ?').get(playerId, beastId);
  if (!row) return { level: 1, exp: 0, effect: BOND_EFFECTS[0] };
  return { level: row.bond_level, exp: row.exp, effect: BOND_EFFECTS[row.bond_level - 1] || BOND_EFFECTS[0] };
}

// 升级羁绊
function addBondExp(playerId, beastId, exp) {
  const database = getDb();
  if (!database) return;
  let bond = database.prepare('SELECT * FROM spirit_beast_bond WHERE player_id = ? AND beast_id = ?').get(playerId, beastId);
  if (!bond) {
    database.prepare('INSERT INTO spirit_beast_bond (player_id, beast_id, bond_level, exp) VALUES (?,?,1,0)').run(playerId, beastId);
    bond = { bond_level: 1, exp: 0 };
  }
  bond.exp += exp;
  // 每100exp升一级，最高5级
  while (bond.exp >= 100 && bond.bond_level < 5) {
    bond.exp -= 100;
    bond.bond_level++;
  }
  database.prepare('UPDATE spirit_beast_bond SET bond_level = ?, exp = ? WHERE player_id = ? AND beast_id = ?')
    .run(bond.bond_level, bond.exp, playerId, beastId);
}

// ==================== 路由 ====================

// GET /api/spirit-beast/locations - 可捕获地点
router.get('/locations', (req, res) => {
  const playerId = getPlayerId(req);
  const database = getDb();
  if (!database) return res.status(500).json({ error: '数据库连接失败' });

  // 获取玩家等级
  let playerLevel = 1;
  try {
    const p = database.prepare('SELECT level FROM Users WHERE id = ?').get(playerId);
    if (p) playerLevel = p.level || 1;
  } catch (e) {}

  const locations = CATCH_LOCATIONS.map(loc => ({
    id: loc.id,
    name: loc.name,
    icon: loc.icon,
    minLevel: loc.minLevel,
    catchRate: loc.catchRate,
    netCost: NET_TYPES.ordinary.cost,
    beasts: loc.beastPool.map(id => ({
      id,
      name: BEAST_TYPES[id]?.name || id,
      icon: BEAST_TYPES[id]?.icon || '❓',
    })),
    unlocked: playerLevel >= loc.minLevel,
  }));

  res.json({ locations });
});

// POST /api/spirit-beast/catch - 野外捕获
router.post('/catch', (req, res) => {
  const playerId = getPlayerId(req);
  const { locationId, netType = 'ordinary' } = req.body;
  const database = getDb();
  if (!database) return res.status(500).json({ error: '数据库连接失败' });

  if (!locationId) return res.status(400).json({ error: '缺少locationId参数' });

  const loc = CATCH_LOCATIONS.find(l => l.id === parseInt(locationId));
  if (!loc) return res.status(404).json({ error: '地点不存在' });

  const net = NET_TYPES[netType] || NET_TYPES.ordinary;

  // 检查玩家等级
  let playerLevel = 1;
  try {
    const p = database.prepare('SELECT level FROM Users WHERE id = ?').get(playerId);
    if (p) playerLevel = p.level || 1;
  } catch (e) {}
  if (playerLevel < loc.minLevel) {
    return res.status(403).json({ error: `需要等级${loc.minLevel}才能在此地捕获` });
  }

  // 消耗捕兽网灵石
  if (net.cost > 0) {
    try {
      const player = database.prepare('SELECT lingshi FROM Users WHERE id = ?').get(playerId);
      if (!player) return res.status(404).json({ error: '玩家不存在' });
      if ((player.lingshi || 0) < net.cost) {
        return res.status(400).json({ error: '灵石不足', required: net.cost });
      }
      database.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(net.cost, playerId);
    } catch (e) {
      return res.status(500).json({ error: '灵石操作失败' });
    }
  }

  // 计算捕获概率
  const catchRate = Math.min(0.9, loc.catchRate + net.rateBonus);
  const roll = Math.random();

  if (roll > catchRate) {
    // 捕获失败
    database.prepare(
      'INSERT INTO spirit_beast_catch_log (player_id, location_id, beast_type, beast_name, success, net_type) VALUES (?,?,?,?,0,?)'
    ).run(playerId, loc.id, loc.beastPool[0], '???', netType);
    return res.json({ success: false, message: '捕获失败，灵兽逃跑了' });
  }

  // 捕获成功，随机选一个灵兽
  const beastId = loc.beastPool[Math.floor(Math.random() * loc.beastPool.length)];
  const beastConfig = BEAST_TYPES[beastId];
  const qualityRoll = Math.random();
  const qualities = ['white', 'green', 'blue', 'purple', 'orange'];
  const quality = qualityRoll < 0.6 ? 'white' : qualityRoll < 0.85 ? 'green' : qualityRoll < 0.96 ? 'blue' : qualityRoll < 0.995 ? 'purple' : 'orange';
  const qMultiplier = beastConfig.qualityRanks[quality];

  const baseStats = { ...beastConfig.baseStats };
  const finalStats = {
    hp: Math.floor(baseStats.hp * qMultiplier),
    attack: Math.floor(baseStats.attack * qMultiplier),
    defense: Math.floor(baseStats.defense * qMultiplier),
    speed: Math.floor(baseStats.speed * qMultiplier),
    magic: Math.floor(baseStats.magic * qMultiplier),
  };

  // 存入 player_spirits 表
  try {
    database.prepare(`
      INSERT INTO player_spirits (player_id, spirit_type, name, level, exp, quality, stars, blood_awakened, skills, current_hp, max_hp, attack, defense, speed, magic)
      VALUES (?, ?, ?, 1, 0, ?, 0, 0, '[]', ?, ?, ?, ?, ?, ?)
    `).run(playerId, beastId, beastConfig.name, quality, finalStats.hp, finalStats.hp, finalStats.attack, finalStats.defense, finalStats.speed, finalStats.magic);
  } catch (e) {
    return res.status(500).json({ error: '存储灵兽失败: ' + e.message });
  }

  const newBeastId = database.prepare('SELECT last_insert_rowid() as id').get().id;

  // 记录捕获日志
  database.prepare(
    'INSERT INTO spirit_beast_catch_log (player_id, location_id, beast_type, beast_name, quality, success, net_type) VALUES (?,?,?,?,?,1,?)'
  ).run(playerId, loc.id, beastId, beastConfig.name, quality, netType);

  res.json({
    success: true,
    beast: {
      id: newBeastId,
      type: beastId,
      name: beastConfig.name,
      icon: beastConfig.icon,
      quality,
      level: 1,
      stats: finalStats,
    },
  });
});

// GET /api/spirit-beast/evolution-tree - 进化树
router.get('/evolution-tree', (req, res) => {
  const playerId = getPlayerId(req);
  const { beastId } = req.query;
  const database = getDb();
  if (!database) return res.status(500).json({ error: '数据库连接失败' });

  if (!beastId) return res.status(400).json({ error: '缺少beastId参数' });

  const beast = database.prepare('SELECT * FROM player_spirits WHERE id = ? AND player_id = ?').get(parseInt(beastId), playerId);
  if (!beast) return res.status(404).json({ error: '灵兽不存在' });

  const config = BEAST_TYPES[beast.spirit_type];
  if (!config) return res.status(404).json({ error: '灵兽类型配置不存在' });

  const currentStage = calcEvolutionStage(beast);

  // 构建进化树
  const tree = EVOLUTION_STAGES.map((stage, idx) => {
    const nextConfig = idx < EVOLUTION_STAGES.length - 1 ? EVOLUTION_STAGES[idx + 1] : null;
    return {
      stage: idx,
      name: stage.name,
      icon: stage.icon,
      unlockTalentPoints: stage.unlockTalentPoints,
      isCurrent: idx === currentStage,
      isUnlocked: idx <= currentStage,
      isEvolved: idx < currentStage,
      // 如果可以进化到下一阶段，显示下一阶段信息
      nextStage: nextConfig ? {
        name: nextConfig.name,
        icon: nextConfig.icon,
        requiredLevel: config.evolveLevel ? config.evolveLevel + (idx * 10) : 999,
      } : null,
    };
  });

  // 天赋点使用情况
  const usedPoints = database.prepare(
    'SELECT SUM(points) as total FROM spirit_beast_talent_points WHERE player_id = ? AND beast_id = ?'
  ).get(playerId, parseInt(beastId));

  const totalPoints = getTotalTalentPoints(beast, currentStage);

  res.json({
    beastId: parseInt(beastId),
    beastName: beast.name,
    currentStage,
    currentLevel: beast.level,
    evolutionTree: tree,
    talentPoints: {
      total: totalPoints,
      used: usedPoints?.total || 0,
      available: totalPoints - (usedPoints?.total || 0),
    },
  });
});

// POST /api/spirit-beast/assign-talent - 分配天赋点
router.post('/assign-talent', (req, res) => {
  const playerId = getPlayerId(req);
  const { beastId, talentId, points = 1 } = req.body;
  const database = getDb();
  if (!database) return res.status(500).json({ error: '数据库连接失败' });

  if (!beastId || !talentId) {
    return res.status(400).json({ error: '缺少beastId或talentId参数' });
  }

  const beast = database.prepare('SELECT * FROM player_spirits WHERE id = ? AND player_id = ?').get(parseInt(beastId), playerId);
  if (!beast) return res.status(404).json({ error: '灵兽不存在' });

  const talent = TALENTS.find(t => t.id === talentId);
  if (!talent) return res.status(404).json({ error: '天赋类型不存在' });

  const currentStage = calcEvolutionStage(beast);
  const totalPoints = getTotalTalentPoints(beast, currentStage);

  const usedPoints = database.prepare(
    'SELECT SUM(points) as total FROM spirit_beast_talent_points WHERE player_id = ? AND beast_id = ?'
  ).get(playerId, parseInt(beastId));

  const availablePoints = totalPoints - (usedPoints?.total || 0);
  const pts = Math.max(1, parseInt(points) || 1);

  if (pts > availablePoints) {
    return res.status(400).json({ error: '天赋点不足', available: availablePoints, requested: pts });
  }

  // 分配天赋点
  try {
    database.prepare(`
      INSERT INTO spirit_beast_talent_points (player_id, beast_id, talent_id, points)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(player_id, beast_id, talent_id) DO UPDATE SET points = points + ?
    `).run(playerId, parseInt(beastId), talentId, pts, pts);
  } catch (e) {
    return res.status(500).json({ error: '分配天赋点失败' });
  }

  // 重新计算灵兽属性（天赋加成）
  const config = BEAST_TYPES[beast.spirit_type];
  const qMultiplier = config.qualityRanks[beast.quality] || 1.0;
  const bondInfo = getBondLevel(playerId, parseInt(beastId));
  const bondBonus = bondInfo.effect.statBonus || 0;

  const baseStats = { ...config.baseStats };
  const newStats = {
    hp: Math.floor(baseStats.hp * qMultiplier * (1 + bondBonus) * (1 + calcTalentBonus(playerId, parseInt(beastId), 'hp'))),
    attack: Math.floor(baseStats.attack * qMultiplier * (1 + bondBonus) * (1 + calcTalentBonus(playerId, parseInt(beastId), 'attack'))),
    defense: Math.floor(baseStats.defense * qMultiplier * (1 + bondBonus) * (1 + calcTalentBonus(playerId, parseInt(beastId), 'defense'))),
    speed: Math.floor(baseStats.speed * qMultiplier * (1 + bondBonus) * (1 + calcTalentBonus(playerId, parseInt(beastId), 'speed'))),
    magic: Math.floor(baseStats.magic * qMultiplier * (1 + bondBonus) * (1 + calcTalentBonus(playerId, parseInt(beastId), 'magic'))),
  };

  // 更新灵兽属性
  database.prepare('UPDATE player_spirits SET attack = ?, defense = ?, max_hp = ?, current_hp = ?, speed = ?, magic = ? WHERE id = ?')
    .run(newStats.attack, newStats.defense, newStats.hp, newStats.hp, newStats.speed, newStats.magic, parseInt(beastId));

  // 获取所有天赋点
  const allTalents = database.prepare(
    'SELECT talent_id, points FROM spirit_beast_talent_points WHERE player_id = ? AND beast_id = ?'
  ).all(playerId, parseInt(beastId));

  res.json({
    success: true,
    beastId: parseInt(beastId),
    newStats,
    talents: allTalents.map(t => ({
      id: t.talent_id,
      name: TALENTS.find(tal => tal.id === t.talent_id)?.name || t.talent_id,
      points: t.points,
    })),
    talentPoints: {
      total: totalPoints,
      used: (usedPoints?.total || 0) + pts,
      available: totalPoints - (usedPoints?.total || 0) - pts,
    },
  });
});

// GET /api/spirit-beast/bond - 羁绊系统
router.get('/bond', (req, res) => {
  const playerId = getPlayerId(req);
  const { beastId } = req.query;
  const database = getDb();
  if (!database) return res.status(500).json({ error: '数据库连接失败' });

  if (!beastId) return res.status(400).json({ error: '缺少beastId参数' });

  const beast = database.prepare('SELECT * FROM player_spirits WHERE id = ? AND player_id = ?').get(parseInt(beastId), playerId);
  if (!beast) return res.status(404).json({ error: '灵兽不存在' });

  const bondInfo = getBondLevel(playerId, parseInt(beastId));
  const config = BEAST_TYPES[beast.spirit_type];
  const qMultiplier = config.qualityRanks[beast.quality] || 1.0;
  const bondBonus = bondInfo.effect.statBonus || 0;

  // 获取羁绊加成效果
  const effects = BOND_EFFECTS.slice(0, bondInfo.level).map(e => ({
    level: e.level,
    name: e.name,
    effect: e.effect,
    active: e.level <= bondInfo.level,
  }));

  // 下级所需经验
  const nextBond = BOND_EFFECTS[bondInfo.level] || null;

  // 羁绊加成后的属性
  const baseStats = { ...config.baseStats };
  const bondStats = {
    hp: Math.floor(baseStats.hp * qMultiplier * (1 + bondBonus)),
    attack: Math.floor(baseStats.attack * qMultiplier * (1 + bondBonus)),
    defense: Math.floor(baseStats.defense * qMultiplier * (1 + bondBonus)),
    speed: Math.floor(baseStats.speed * qMultiplier * (1 + bondBonus)),
    magic: Math.floor(baseStats.magic * qMultiplier * (1 + bondBonus)),
  };

  res.json({
    beastId: parseInt(beastId),
    beastName: beast.name,
    bondLevel: bondInfo.level,
    bondExp: bondInfo.exp,
    maxLevel: 5,
    expToNextLevel: nextBond ? 100 - bondInfo.exp : null,
    currentEffect: bondInfo.effect,
    effects,
    bondStats,
    bondBonusPercent: Math.round(bondBonus * 100),
    // 主人从灵兽获得的属性加成（羁绊4级以上生效）
    ownerBonus: bondInfo.level >= 4 ? {
      attack: Math.floor(bondStats.attack * 0.1),
      defense: Math.floor(bondStats.defense * 0.1),
      hp: Math.floor(bondStats.hp * 0.1),
    } : null,
  });
});

module.exports = router;
