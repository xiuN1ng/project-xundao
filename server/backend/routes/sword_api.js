/**
 * 飞剑/法宝系统路由 (Flying Sword / Legal Artifact System)
 * 端点:
 *   GET  /api/sword/types           - 获取所有飞剑类型配置
 *   GET  /api/sword/list            - 获取玩家拥有的所有飞剑
 *   GET  /api/sword/equipped         - 获取当前装备的飞剑
 *   POST /api/sword/equip/:swordId  - 装备飞剑
 *   POST /api/sword/unequip         - 卸下飞剑
 *   POST /api/sword/feed            - 喂养飞剑（升级）
 *   POST /api/sword/transform       - 幻化飞剑外观
 *   POST /api/sword/obtain          - 获得飞剑（内部/奖励发放）
 *   GET  /api/sword/appearances     - 获取已解锁的幻化外观列表
 */

const express = require('express');
const router = express.Router();
const path = require('path');

let db = null;

function getDb() {
  if (!db) {
    const Database = require('better-sqlite3');
    const dbPath = path.join(__dirname, '..', 'data', 'game.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
  }
  return db;
}

function setDb(database) {
  db = database;
}

// ==================== 数据库初始化 ====================

function initSwordTables() {
  const database = getDb();
  try {
    database.exec(`
      CREATE TABLE IF NOT EXISTS player_swords (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        sword_type TEXT NOT NULL,
        level INTEGER DEFAULT 1,
        exp INTEGER DEFAULT 0,
        atk_bonus INTEGER DEFAULT 0,
        def_bonus INTEGER DEFAULT 0,
        hp_bonus INTEGER DEFAULT 0,
        crit_bonus INTEGER DEFAULT 0,
        dodge_bonus INTEGER DEFAULT 0,
        is_equipped INTEGER DEFAULT 0,
        appearance_code TEXT,
        obtained_at TEXT DEFAULT (datetime('now')),
        UNIQUE(player_id, sword_type)
      )
    `);

    database.exec(`
      CREATE TABLE IF NOT EXISTS player_sword_appearances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        appearance_code TEXT NOT NULL,
        unlocked_at TEXT DEFAULT (datetime('now')),
        UNIQUE(player_id, appearance_code)
      )
    `);

    console.log('[sword] 表初始化完成');
  } catch (err) {
    console.error('[sword] 表初始化失败:', err.message);
  }
}

// ==================== 飞剑配置数据 ====================

const RARITY_COLORS = {
  green:  '#4CAF50',
  blue:   '#2196F3',
  purple: '#9C27B0',
  orange: '#FF9800',
  red:    '#F44336'
};

const RARITY_NAMES = {
  green:  '普通',
  blue:   '稀有',
  purple: '史诗',
  orange: '传说',
  red:    '神话'
};

const SWORD_TYPES_CONFIG = {
  qixing: {
    code: 'qixing',
    name: '七星剑',
    type: 'attack',
    rarity: 'green',
    requiredRealm: 1,
    levelCap: 20,
    baseAtk: 8, baseDef: 3, baseHp: 15, baseCrit: 1, baseDodge: 0,
    feedExpCost: 30,
    description: '新手试炼剑，锋芒初露'
  },
  qinghong: {
    code: 'qinghong',
    name: '青虹剑',
    type: 'attack',
    rarity: 'blue',
    requiredRealm: 2,
    levelCap: 40,
    baseAtk: 18, baseDef: 8, baseHp: 35, baseCrit: 3, baseDodge: 1,
    feedExpCost: 50,
    description: '青芒如虹，斩敌千里'
  },
  baishuang: {
    code: 'baishuang',
    name: '白霜剑',
    type: 'attack',
    rarity: 'blue',
    requiredRealm: 3,
    levelCap: 50,
    baseAtk: 22, baseDef: 12, baseHp: 45, baseCrit: 4, baseDodge: 2,
    feedExpCost: 60,
    description: '寒霜凝剑，冻彻心扉'
  },
  zidian: {
    code: 'zidian',
    name: '紫电剑',
    type: 'attack',
    rarity: 'purple',
    requiredRealm: 4,
    levelCap: 70,
    baseAtk: 35, baseDef: 15, baseHp: 60, baseCrit: 6, baseDodge: 3,
    feedExpCost: 80,
    description: '紫电青霜，迅如雷霆'
  },
  taie: {
    code: 'taie',
    name: '太阿剑',
    type: 'balanced',
    rarity: 'purple',
    requiredRealm: 5,
    levelCap: 80,
    baseAtk: 30, baseDef: 25, baseHp: 80, baseCrit: 5, baseDodge: 4,
    feedExpCost: 100,
    description: '泰阿倒持，守攻兼备'
  },
  zhanlu: {
    code: 'zhanlu',
    name: '湛卢剑',
    type: 'balanced',
    rarity: 'orange',
    requiredRealm: 6,
    levelCap: 100,
    baseAtk: 45, baseDef: 40, baseHp: 120, baseCrit: 8, baseDodge: 6,
    feedExpCost: 150,
    description: '湛卢无锋，大巧不工'
  },
  xuanyuan: {
    code: 'xuanyuan',
    name: '轩辕剑',
    type: 'attack',
    rarity: 'red',
    requiredRealm: 8,
    levelCap: 150,
    baseAtk: 80, baseDef: 50, baseHp: 200, baseCrit: 12, baseDodge: 8,
    feedExpCost: 300,
    description: '轩辕帝剑，斩妖除魔'
  }
};

// 幻化外观代码映射
const APPEARANCE_CODES = {
  'xuanwu':  { name: '玄武纹', color: '#1A237E', description: '玄武印记，水之守护' },
  'fenghuang': { name: '凤凰纹', color: '#BF360C', description: '凤凰涅槃，浴火重生' },
  'qilin':  { name: '麒麟纹', color: '#1B5E20', description: '麒麟踏祥云，瑞兽保平安' },
  'longwei': { name: '龙纹', color: '#0D47A1', description: '真龙之威，王者象征' },
  'tianlu': { name: '天禄纹', color: '#E65100', description: '天禄辟邪，财源广进' },
  'bingling': { name: '冰棱纹', color: '#4FC3F7', description: '寒冰之灵，冻彻万物' },
  'huoyan': { name: '火焰纹', color: '#FF3D00', description: '烈焰焚天，灼烧一切' },
  'yuanshi': { name: '原始纹', color: '#4E342E', description: '混沌初开，返璞归真' }
};

// ==================== 工具函数 ====================

// 计算升级所需经验
function expForLevel(level) {
  return level * 100;
}

// 计算升一级加成的属性
function levelUpBonus(level) {
  // 每次升级：攻击+5%，防御+3%，生命+8%，暴击+0.5%，闪避+0.3%
  return {
    atk_bonus: Math.floor(3 + level * 0.5),
    def_bonus: Math.floor(2 + level * 0.3),
    hp_bonus: Math.floor(8 + level * 1.2),
    crit_bonus: Math.floor(0.5 * 10) / 10,
    dodge_bonus: Math.floor(0.3 * 10) / 10
  };
}

// 获取 sword config（安全）
function getSwordConfig(code) {
  return SWORD_TYPES_CONFIG[code] || null;
}

// 统一 userId 提取
function extractUserId(req) {
  return parseInt(req.userId) ||
    parseInt(req.query.player_id) ||
    parseInt(req.query.userId) ||
    parseInt(req.body && req.body.player_id) ||
    parseInt(req.body && req.body.userId) ||
    1;
}

// ==================== 路由实现 ====================

// GET /api/sword/types - 获取所有飞剑类型
router.get('/types', (req, res) => {
  try {
    const types = Object.values(SWORD_TYPES_CONFIG).map(s => ({
      code: s.code,
      name: s.name,
      type: s.type,
      rarity: s.rarity,
      rarityName: RARITY_NAMES[s.rarity] || s.rarity,
      rarityColor: RARITY_COLORS[s.rarity] || '#888',
      requiredRealm: s.requiredRealm,
      levelCap: s.levelCap,
      baseAtk: s.baseAtk,
      baseDef: s.baseDef,
      baseHp: s.baseHp,
      baseCrit: s.baseCrit,
      baseDodge: s.baseDodge,
      feedExpCost: s.feedExpCost,
      description: s.description
    }));
    res.json({ success: true, data: types });
  } catch (e) {
    console.error('[sword] 获取飞剑类型失败:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/sword/list - 获取玩家所有飞剑
router.get('/list', (req, res) => {
  try {
    const playerId = extractUserId(req);
    const database = getDb();
    const rows = database.prepare(`
      SELECT id, player_id, sword_type, level, exp,
             atk_bonus, def_bonus, hp_bonus, crit_bonus, dodge_bonus,
             is_equipped, appearance_code, obtained_at
      FROM player_swords WHERE player_id = ?
      ORDER BY is_equipped DESC, level DESC, id ASC
    `).all(playerId);

    const swords = rows.map(row => {
      const cfg = getSwordConfig(row.sword_type);
      return {
        id: row.id,
        swordType: row.sword_type,
        name: cfg ? cfg.name : row.sword_type,
        type: cfg ? cfg.type : 'attack',
        rarity: cfg ? cfg.rarity : 'green',
        rarityName: cfg ? RARITY_NAMES[cfg.rarity] : '普通',
        rarityColor: cfg ? RARITY_COLORS[cfg.rarity] : '#4CAF50',
        level: row.level,
        exp: row.exp,
        expForNextLevel: expForLevel(row.level + 1),
        atkBonus: row.atk_bonus,
        defBonus: row.def_bonus,
        hpBonus: row.hp_bonus,
        critBonus: row.crit_bonus,
        dodgeBonus: row.dodge_bonus,
        isEquipped: row.is_equipped === 1,
        appearanceCode: row.appearance_code,
        obtainedAt: row.obtained_at
      };
    });

    res.json({ success: true, data: swords });
  } catch (e) {
    console.error('[sword] 获取飞剑列表失败:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/sword/equipped - 获取当前装备的飞剑
router.get('/equipped', (req, res) => {
  try {
    const playerId = extractUserId(req);
    const database = getDb();
    const row = database.prepare(`
      SELECT id, player_id, sword_type, level, exp,
             atk_bonus, def_bonus, hp_bonus, crit_bonus, dodge_bonus,
             is_equipped, appearance_code, obtained_at
      FROM player_swords WHERE player_id = ? AND is_equipped = 1
      LIMIT 1
    `).get(playerId);

    if (!row) {
      return res.json({ success: true, data: null, message: '当前未装备飞剑' });
    }

    const cfg = getSwordConfig(row.sword_type);
    const sword = {
      id: row.id,
      swordType: row.sword_type,
      name: cfg ? cfg.name : row.sword_type,
      type: cfg ? cfg.type : 'attack',
      rarity: cfg ? cfg.rarity : 'green',
      rarityName: cfg ? RARITY_NAMES[cfg.rarity] : '普通',
      rarityColor: cfg ? RARITY_COLORS[cfg.rarity] : '#4CAF50',
      level: row.level,
      exp: row.exp,
      expForNextLevel: expForLevel(row.level + 1),
      atkBonus: row.atk_bonus,
      defBonus: row.def_bonus,
      hpBonus: row.hp_bonus,
      critBonus: row.crit_bonus,
      dodgeBonus: row.dodge_bonus,
      isEquipped: true,
      appearanceCode: row.appearance_code,
      obtainedAt: row.obtained_at
    };

    res.json({ success: true, data: sword });
  } catch (e) {
    console.error('[sword] 获取装备飞剑失败:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/sword/equip/:swordId - 装备飞剑
router.post('/equip/:swordId', (req, res) => {
  try {
    const playerId = extractUserId(req);
    const swordId = parseInt(req.params.swordId);
    const database = getDb();

    if (!swordId) {
      return res.status(400).json({ success: false, message: '无效的飞剑ID' });
    }

    // 查找飞剑
    const sword = database.prepare(
      'SELECT * FROM player_swords WHERE id = ? AND player_id = ?'
    ).get(swordId, playerId);

    if (!sword) {
      return res.status(404).json({ success: false, message: '飞剑不存在' });
    }

    // 先卸下当前装备
    database.prepare(
      'UPDATE player_swords SET is_equipped = 0 WHERE player_id = ?'
    ).run(playerId);

    // 装备新飞剑
    database.prepare(
      'UPDATE player_swords SET is_equipped = 1 WHERE id = ?'
    ).run(swordId);

    const cfg = getSwordConfig(sword.sword_type);
    res.json({
      success: true,
      message: `已装备 ${cfg ? cfg.name : sword.sword_type}`,
      data: { id: swordId, name: cfg ? cfg.name : sword.sword_type }
    });
  } catch (e) {
    console.error('[sword] 装备飞剑失败:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/sword/unequip - 卸下飞剑
router.post('/unequip', (req, res) => {
  try {
    const playerId = extractUserId(req);
    const database = getDb();

    const result = database.prepare(
      'UPDATE player_swords SET is_equipped = 0 WHERE player_id = ? AND is_equipped = 1'
    ).run(playerId);

    if (result.changes === 0) {
      return res.json({ success: true, message: '当前未装备飞剑' });
    }

    res.json({ success: true, message: '已卸下飞剑' });
  } catch (e) {
    console.error('[sword] 卸下飞剑失败:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/sword/feed - 喂养飞剑升级
router.post('/feed', (req, res) => {
  try {
    const playerId = extractUserId(req);
    const { sword_id, feed_count } = req.body;
    const database = getDb();

    const swordId = parseInt(sword_id);
    if (!swordId) {
      return res.status(400).json({ success: false, message: '无效的飞剑ID' });
    }

    const sword = database.prepare(
      'SELECT * FROM player_swords WHERE id = ? AND player_id = ?'
    ).get(swordId, playerId);

    if (!sword) {
      return res.status(404).json({ success: false, message: '飞剑不存在' });
    }

    const cfg = getSwordConfig(sword.sword_type);
    const levelCap = cfg ? cfg.levelCap : 100;
    const feedCost = cfg ? cfg.feedExpCost : 30;
    const count = Math.min(Math.max(parseInt(feed_count) || 1, 1), 10); // 最多一次喂10个

    // 计算总经验
    const totalExpGain = feedCost * count;

    let newExp = sword.exp + totalExpGain;
    let newLevel = sword.level;
    let leveledUp = false;
    const levelUpRecords = [];

    while (newExp >= expForLevel(newLevel) && newLevel < levelCap) {
      newExp -= expForLevel(newLevel);
      newLevel++;
      leveledUp = true;

      // 计算升级加成
      const bonus = levelUpBonus(newLevel);
      levelUpRecords.push({
        level: newLevel,
        atkBonus: bonus.atk_bonus,
        defBonus: bonus.def_bonus,
        hpBonus: bonus.hp_bonus,
        critBonus: bonus.crit_bonus,
        dodgeBonus: bonus.dodge_bonus
      });
    }

    // 更新属性（累加）
    let totalAtk = sword.atk_bonus;
    let totalDef = sword.def_bonus;
    let totalHp = sword.hp_bonus;
    let totalCrit = sword.crit_bonus;
    let totalDodge = sword.dodge_bonus;

    if (leveledUp) {
      const baseAtk = cfg ? cfg.baseAtk : 8;
      const baseDef = cfg ? cfg.baseDef : 3;
      const baseHp = cfg ? cfg.baseHp : 15;
      const baseCrit = cfg ? cfg.baseCrit : 1;
      const baseDodge = cfg ? cfg.baseDodge : 0;

      // 重新计算属性（基准 + 等级加成）
      totalAtk = baseAtk + levelUpRecords.reduce((s, r) => s + r.atkBonus, 0);
      totalDef = baseDef + levelUpRecords.reduce((s, r) => s + r.defBonus, 0);
      totalHp = baseHp + levelUpRecords.reduce((s, r) => s + r.hpBonus, 0);
      totalCrit = baseCrit + levelUpRecords.reduce((s, r) => s + r.critBonus, 0);
      totalDodge = baseDodge + levelUpRecords.reduce((s, r) => s + r.dodgeBonus, 0);
    }

    database.prepare(`
      UPDATE player_swords
      SET level = ?, exp = ?, atk_bonus = ?, def_bonus = ?,
          hp_bonus = ?, crit_bonus = ?, dodge_bonus = ?
      WHERE id = ?
    `).run(newLevel, newExp, totalAtk, totalDef, totalHp, totalCrit, totalDodge, swordId);

    res.json({
      success: true,
      message: leveledUp ? `升级了！当前等级 ${newLevel}` : `喂养成功，经验+${totalExpGain}`,
      data: {
        swordId,
        level: newLevel,
        exp: newExp,
        expForNextLevel: expForLevel(newLevel),
        expGain: totalExpGain,
        leveledUp,
        levelUpRecords,
        stats: {
          atkBonus: totalAtk,
          defBonus: totalDef,
          hpBonus: totalHp,
          critBonus: totalCrit,
          dodgeBonus: totalDodge
        }
      }
    });
  } catch (e) {
    console.error('[sword] 喂养飞剑失败:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/sword/transform - 幻化飞剑外观
router.post('/transform', (req, res) => {
  try {
    const playerId = extractUserId(req);
    const { sword_id, appearance_code } = req.body;
    const database = getDb();

    if (!appearance_code) {
      return res.status(400).json({ success: false, message: '缺少外观代码' });
    }

    const validCodes = Object.keys(APPEARANCE_CODES);
    if (!validCodes.includes(appearance_code)) {
      return res.status(400).json({ success: false, message: `无效的外观代码，可用的代码: ${validCodes.join(', ')}` });
    }

    const swordId = parseInt(sword_id);
    const sword = swordId
      ? database.prepare('SELECT * FROM player_swords WHERE id = ? AND player_id = ?').get(swordId, playerId)
      : database.prepare('SELECT * FROM player_swords WHERE player_id = ? AND is_equipped = 1').get(playerId);

    if (!sword) {
      return res.status(404).json({ success: false, message: '飞剑不存在或未指定' });
    }

    // 检查是否已解锁该外观
    const unlocked = database.prepare(
      'SELECT * FROM player_sword_appearances WHERE player_id = ? AND appearance_code = ?'
    ).get(playerId, appearance_code);

    if (!unlocked) {
      return res.status(403).json({
        success: false,
        message: `外观「${APPEARANCE_CODES[appearance_code].name}」尚未解锁，请先通过解锁码获取`
      });
    }

    // 应用外观
    database.prepare(
      'UPDATE player_swords SET appearance_code = ? WHERE id = ?'
    ).run(appearance_code, sword.id);

    res.json({
      success: true,
      message: `幻化成功：${APPEARANCE_CODES[appearance_code].name}`,
      data: { swordId: sword.id, appearanceCode: appearance_code, appearanceName: APPEARANCE_CODES[appearance_code].name }
    });
  } catch (e) {
    console.error('[sword] 幻化失败:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/sword/unlock-appearance - 解锁幻化外观（使用解锁码）
router.post('/unlock-appearance', (req, res) => {
  try {
    const playerId = extractUserId(req);
    const { unlock_code } = req.body;
    const database = getDb();

    if (!unlock_code) {
      return res.status(400).json({ success: false, message: '缺少解锁码' });
    }

    const validCodes = Object.keys(APPEARANCE_CODES);
    if (!validCodes.includes(unlock_code)) {
      return res.status(400).json({ success: false, message: `无效的解锁码` });
    }

    // 检查是否已解锁
    const existing = database.prepare(
      'SELECT * FROM player_sword_appearances WHERE player_id = ? AND appearance_code = ?'
    ).get(playerId, unlock_code);

    if (existing) {
      return res.json({ success: true, message: `外观「${APPEARANCE_CODES[unlock_code].name}」已经解锁过了` });
    }

    // 解锁
    database.prepare(
      'INSERT INTO player_sword_appearances (player_id, appearance_code) VALUES (?, ?)'
    ).run(playerId, unlock_code);

    res.json({
      success: true,
      message: `解锁成功！外观「${APPEARANCE_CODES[unlock_code].name}」已解锁`,
      data: { appearanceCode: unlock_code, name: APPEARANCE_CODES[unlock_code].name }
    });
  } catch (e) {
    console.error('[sword] 解锁外观失败:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/sword/appearances - 获取已解锁的幻化外观列表
router.get('/appearances', (req, res) => {
  try {
    const playerId = extractUserId(req);
    const database = getDb();

    const rows = database.prepare(
      'SELECT appearance_code, unlocked_at FROM player_sword_appearances WHERE player_id = ?'
    ).all(playerId);

    const appearances = rows.map(row => ({
      code: row.appearance_code,
      name: APPEARANCE_CODES[row.appearance_code]?.name || row.appearance_code,
      color: APPEARANCE_CODES[row.appearance_code]?.color || '#888',
      description: APPEARANCE_CODES[row.appearance_code]?.description || '',
      unlockedAt: row.unlocked_at
    }));

    res.json({ success: true, data: appearances });
  } catch (e) {
    console.error('[sword] 获取外观列表失败:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/sword/appearance-codes - 获取所有可用的外观代码（配置）
router.get('/appearance-codes', (req, res) => {
  try {
    const codes = Object.entries(APPEARANCE_CODES).map(([code, info]) => ({
      code, name: info.name, color: info.color, description: info.description
    }));
    res.json({ success: true, data: codes });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/sword/obtain - 获得飞剑（内部奖励发放）
router.post('/obtain', (req, res) => {
  try {
    const playerId = extractUserId(req);
    const { sword_type } = req.body;
    const database = getDb();

    if (!sword_type || !SWORD_TYPES_CONFIG[sword_type]) {
      return res.status(400).json({ success: false, message: '无效的飞剑类型' });
    }

    const cfg = SWORD_TYPES_CONFIG[sword_type];

    // 检查是否已拥有
    const existing = database.prepare(
      'SELECT * FROM player_swords WHERE player_id = ? AND sword_type = ?'
    ).get(playerId, sword_type);

    if (existing) {
      return res.json({
        success: true,
        message: `已拥有 ${cfg.name}，无需重复获得`,
        data: { id: existing.id, name: cfg.name, alreadyOwned: true }
      });
    }

    // 插入新飞剑
    const result = database.prepare(`
      INSERT INTO player_swords (player_id, sword_type, level, exp,
        atk_bonus, def_bonus, hp_bonus, crit_bonus, dodge_bonus, is_equipped, appearance_code)
      VALUES (?, ?, 1, 0, ?, ?, ?, ?, ?, 0, NULL)
    `).run(playerId, sword_type, cfg.baseAtk, cfg.baseDef, cfg.baseHp, cfg.baseCrit, cfg.baseDodge);

    res.json({
      success: true,
      message: `获得飞剑「${cfg.name}」！`,
      data: {
        id: result.lastInsertRowid,
        swordType: sword_type,
        name: cfg.name,
        rarity: cfg.rarity,
        rarityName: RARITY_NAMES[cfg.rarity],
        level: 1,
        atkBonus: cfg.baseAtk,
        defBonus: cfg.baseDef,
        hpBonus: cfg.baseHp,
        critBonus: cfg.baseCrit,
        dodgeBonus: cfg.baseDodge
      }
    });
  } catch (e) {
    console.error('[sword] 获得飞剑失败:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
module.exports.initSwordTables = initSwordTables;
module.exports.setDb = setDb;
