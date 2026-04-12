/**
 * 阵法系统 API路由
 * P86-5: 挂机修仙游戏阵法系统
 * 端点: /api/formation/*
 */

const express = require('express');
const router = express.Router();
const path = require('path');

const Logger = {
  info: (...args) => console.log('[formation]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[formation:error]', new Date().toISOString(), ...args)
};

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

// ============ 阵法类型定义 ============
const FORMATION_TYPES = {
  tianfu: {
    id: 'tianfu', name: '天覆阵', icon: '☯️',
    desc: '全体攻击+15%，速度-10%（攻守兼备）',
    baseEffect: { attack: 15, speed: -10, defense: 0 },
    level10Effect: '全体吸血+5%',
    positionBonus: { front: { attack: 20 }, back: { attack: 12 } }
  },
  dizai: {
    id: 'dizai', name: '地载阵', icon: '⛰️',
    desc: '全体防御+20%（防守型）',
    baseEffect: { attack: 0, speed: 0, defense: 20 },
    level10Effect: '全体减伤+8%',
    positionBonus: {}
  },
  fengyang: {
    id: 'fengyang', name: '风扬阵', icon: '🌀',
    desc: '速度+25%，攻击+5%（速攻型）',
    baseEffect: { attack: 5, speed: 25, defense: 0 },
    level10Effect: '先手必杀：速度优势时伤害+15%',
    positionBonus: {}
  },
  yunchui: {
    id: 'yunchui', name: '云垂阵', icon: '🌤️',
    desc: '随机增益：暴击+20%或闪避+20%（策略型）',
    baseEffect: { attack: 0, speed: 0, defense: 0, crit: 20, dodge: 20 },
    level10Effect: '每回合切换增益（暴击↔闪避）',
    positionBonus: {}
  },
  longfei: {
    id: 'longfei', name: '龙飞阵', icon: '🐉',
    desc: '输出位+30%攻击，辅助位+15%防御（平衡型）',
    baseEffect: { attack_dps: 30, defense_support: 15 },
    level10Effect: '龙息：每回合对随机敌人造成10%攻击伤害',
    positionBonus: {}
  },
  huyi: {
    id: 'huyi', name: '虎翼阵', icon: '🐅',
    desc: '前排+25%防御，后排+15%攻击（肉盾型）',
    baseEffect: { attack_front: 0, defense_front: 25, attack_back: 15, defense_back: 0 },
    level10Effect: '虎啸：前排受击时有20%概率反击',
    positionBonus: {}
  },
  niaoxiang: {
    id: 'niaoxiang', name: '鸟翔阵', icon: '🦅',
    desc: '全体速度+20%，闪避+10%（闪避型）',
    baseEffect: { attack: 0, speed: 20, dodge: 10 },
    level10Effect: '全体闪避额外+8%',
    positionBonus: {}
  },
  shepan: {
    id: 'shepan', name: '蛇蟠阵', icon: '🐍',
    desc: '全体反伤+15%，受到伤害5%反弹（反伤型）',
    baseEffect: { attack: 0, speed: 0, defense: 0, reflect: 15, counter_damage: 5 },
    level10Effect: '蛇毒：反伤时有30%概率附加中毒（每回合掉血3%，持续3回合）',
    positionBonus: {}
  },
  xuanwu: {
    id: 'xuanwu', name: '玄武阵', icon: '🐢',
    desc: '全体减伤+20%，速度-15%（肉盾型）',
    baseEffect: { attack: 0, speed: -15, defense: 0, damage_reduction: 20 },
    level10Effect: '玄武护体：生命低于30%时生成护盾（吸收15%最大生命）',
    positionBonus: {}
  },
  zhuque: {
    id: 'zhuque', name: '朱雀阵', icon: '🔥',
    desc: '全体攻击+10%，每回合回复2%血量（续航型）',
    baseEffect: { attack: 10, speed: 0, defense: 0, lifesteal: 2 },
    level10Effect: '涅槃之火：死亡时30%概率复活，恢复30%生命',
    positionBonus: {}
  }
};

// 升级配置：每级需要的材料、灵石、成功率
const UPGRADE_CONFIG = {
  // level: { flagCount, flagQuality, spiritStones, successRate }
  1: { flagCount: 1, flagQuality: 'normal', spiritStones: 1000, successRate: 80 },
  2: { flagCount: 1, flagQuality: 'normal', spiritStones: 5000, successRate: 80 },
  3: { flagCount: 1, flagQuality: 'normal', spiritStones: 5000, successRate: 60 },
  4: { flagCount: 3, flagQuality: 'normal', spiritStones: 20000, successRate: 60 },
  5: { flagCount: 3, flagQuality: 'normal', spiritStones: 20000, successRate: 40 },
  6: { flagCount: 3, flagQuality: 'high', spiritStones: 50000, successRate: 40 },
  7: { flagCount: 5, flagQuality: 'high', spiritStones: 50000, successRate: 20 },
  8: { flagCount: 5, flagQuality: 'high', spiritStones: 50000, successRate: 20 },
  9: { flagCount: 5, flagQuality: 'expert', spiritStones: 50000, successRate: 10 },
  10: null // 满级
};

// 阵眼位置配置（8个位置）
const FORMATION_POSITIONS = ['slot1', 'slot2', 'slot3', 'slot4', 'slot5', 'slot6', 'slot7', 'slot8'];
const POSITION_TYPES = {
  slot1: 'front', slot2: 'front', slot3: 'front', slot4: 'front',
  slot5: 'back', slot6: 'back', slot7: 'back', slot8: 'back'
};
const POSITION_ROLES = {
  slot1: 'dps', slot2: 'dps', slot3: 'support', slot4: 'support',
  slot5: 'dps', slot6: 'dps', slot7: 'support', slot8: 'support'
};

// ============ 数据库初始化 ============
function initFormationTables() {
  const database = getDb();
  try {
    database.exec(`
      CREATE TABLE IF NOT EXISTS player_formations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        formation_type TEXT NOT NULL,
        formation_level INTEGER DEFAULT 1,
        is_active INTEGER DEFAULT 0,
        position_config TEXT DEFAULT '{}',
        activated_at DATETIME,
        UNIQUE(player_id, formation_type)
      )
    `);

    database.exec(`
      CREATE TABLE IF NOT EXISTS formation_bonus (
        player_id INTEGER PRIMARY KEY,
        total_attack_bonus REAL DEFAULT 0,
        total_defense_bonus REAL DEFAULT 0,
        total_speed_bonus REAL DEFAULT 0,
        special_bonus TEXT DEFAULT '{}',
        calculated_at DATETIME
      )
    `);

    Logger.info('阵法表初始化完成');
  } catch (e) {
    Logger.error('阵法表初始化失败:', e.message);
  }
}

// 确保表存在
initFormationTables();

// ============ 辅助函数 ============
function getPlayerId(req) {
  return parseInt(req.query.playerId || req.body?.playerId || req.query.player_id || req.body?.player_id || 1) || 1;
}

function getPlayerData(playerId) {
  const database = getDb();
  try {
    return database.prepare('SELECT * FROM player WHERE id = ?').get(playerId);
  } catch (e) {
    return null;
  }
}

function getPlayerSpiritStones(playerId) {
  const database = getDb();
  try {
    const p = database.prepare('SELECT spirit_stones FROM player WHERE id = ?').get(playerId);
    return p ? Number(p.spirit_stones) : 0;
  } catch (e) {
    return 0;
  }
}

function updatePlayerSpiritStones(playerId, delta) {
  const database = getDb();
  try {
    database.prepare('UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?').run(delta, playerId);
  } catch (e) {
    Logger.error('更新灵石失败:', e.message);
  }
}

// 计算等级加成系数
function getLevelMultiplier(level) {
  if (level <= 3) return 1.0;
  if (level <= 6) return 1.5;
  if (level <= 9) return 2.0;
  return 2.5; // 10级额外+50%
}

// 检查玩家背包中的阵旗数量
function getFormationFlagCount(playerId, quality) {
  const database = getDb();
  try {
    // 阵旗的item_type='formation_flag', quality字段区分普通/高级/专家
    const rows = database.prepare(
      `SELECT count FROM player_items WHERE user_id = ? AND item_type = 'formation_flag' AND quality = ?`
    ).all(playerId, quality);
    return rows.reduce((sum, r) => sum + Number(r.count), 0);
  } catch (e) {
    // 尝试按item_name匹配
    try {
      const nameMap = { normal: '阵旗', high: '高级阵旗', expert: '专家阵旗' };
      const row = database.prepare(
        `SELECT count FROM player_items WHERE user_id = ? AND (item_name = ? OR item_name = ? OR item_name = ?) AND count > 0`
      ).get(playerId, nameMap[quality] || '阵旗', '高级阵旗', '专家阵旗');
      return row ? Number(row.count) : 0;
    } catch (e2) {
      return 0;
    }
  }
}

// 消耗阵旗
function consumeFormationFlags(playerId, quality, count) {
  const database = getDb();
  try {
    const nameMap = { normal: '阵旗', high: '高级阵旗', expert: '专家阵旗' };
    const targetName = nameMap[quality] || '阵旗';
    let remaining = count;
    const items = database.prepare(
      `SELECT id, count FROM player_items WHERE user_id = ? AND (item_name = ? OR item_type = 'formation_flag') AND count > 0 ORDER BY id ASC`
    ).all(playerId, targetName);

    for (const item of items) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, Number(item.count));
      if (take >= Number(item.count)) {
        database.prepare('DELETE FROM player_items WHERE id = ?').run(item.id);
      } else {
        database.prepare('UPDATE player_items SET count = count - ? WHERE id = ?').run(take, item.id);
      }
      remaining -= take;
    }
    return remaining <= 0;
  } catch (e) {
    Logger.error('消耗阵旗失败:', e.message);
    return false;
  }
}

// ============ API端点 ============

// GET /api/formation/types - 获取阵法类型列表
router.get('/types', (req, res) => {
  try {
    const types = Object.values(FORMATION_TYPES).map(f => ({
      id: f.id,
      name: f.name,
      icon: f.icon,
      desc: f.desc,
      baseEffect: f.baseEffect,
      level10Effect: f.level10Effect,
      positionBonus: f.positionBonus
    }));
    res.json({ code: 0, data: types });
  } catch (e) {
    Logger.error('/types error:', e.message);
    res.status(500).json({ code: 1, error: '服务器错误' });
  }
});

// GET /api/formation/my - 获取玩家已激活的阵法
router.get('/my', (req, res) => {
  const playerId = getPlayerId(req);
  const database = getDb();

  try {
    const formations = database.prepare(
      `SELECT * FROM player_formations WHERE player_id = ?`
    ).all(playerId);

    const result = formations.map(f => {
      const type = FORMATION_TYPES[f.formation_type];
      const level = Number(f.formation_level);
      const mult = getLevelMultiplier(level);
      const positionConfig = JSON.parse(f.position_config || '{}');

      return {
        formationType: f.formation_type,
        name: type?.name || f.formation_type,
        icon: type?.icon || '☯️',
        level,
        isActive: !!f.is_active,
        activatedAt: f.activated_at,
        positionConfig,
        currentEffect: type?.baseEffect || {},
        level10Effect: level >= 10 ? (type?.level10Effect || null) : null,
        multiplier: mult
      };
    });

    res.json({ code: 0, data: result });
  } catch (e) {
    Logger.error('/my error:', e.message);
    res.status(500).json({ code: 1, error: '服务器错误' });
  }
});

// POST /api/formation/activate - 激活阵法
router.post('/activate', (req, res) => {
  const playerId = getPlayerId(req);
  const { formationType } = req.body;

  if (!formationType || !FORMATION_TYPES[formationType]) {
    return res.status(400).json({ code: 1, error: '无效的阵法类型' });
  }

  const player = getPlayerData(playerId);
  if (!player) {
    return res.status(400).json({ code: 1, error: '玩家不存在' });
  }

  const database = getDb();
  const activateCost = 1000; // 激活需要1000灵石
  const stones = getPlayerSpiritStones(playerId);

  if (stones < activateCost) {
    return res.status(400).json({ code: 1, error: `灵石不足，需要${activateCost}灵石，当前${stones}` });
  }

  try {
    // 检查是否已激活
    const existing = database.prepare(
      `SELECT * FROM player_formations WHERE player_id = ? AND formation_type = ?`
    ).get(playerId, formationType);

    if (existing) {
      return res.status(400).json({ code: 1, error: '该阵法已经激活' });
    }

    // 激活阵法
    database.prepare(
      `INSERT INTO player_formations (player_id, formation_type, formation_level, is_active, activated_at) VALUES (?, ?, 1, 1, datetime('now'))`
    ).run(playerId, formationType);

    // 扣除灵石
    updatePlayerSpiritStones(playerId, -activateCost);

    const newStones = getPlayerSpiritStones(playerId);
    const type = FORMATION_TYPES[formationType];

    // 计算初始加成
    recalcFormationBonus(playerId);

    res.json({
      code: 0,
      data: {
        formationType,
        name: type.name,
        icon: type.icon,
        level: 1,
        isActive: true,
        spiritStonesSpent: activateCost,
        remainingSpiritStones: newStones,
        message: `成功激活【${type.name}】！`
      }
    });
  } catch (e) {
    Logger.error('/activate error:', e.message);
    res.status(500).json({ code: 1, error: '服务器错误: ' + e.message });
  }
});

// POST /api/formation/upgrade - 升级阵法
router.post('/upgrade', (req, res) => {
  const playerId = getPlayerId(req);
  const { formationType } = req.body;

  if (!formationType || !FORMATION_TYPES[formationType]) {
    return res.status(400).json({ code: 1, error: '无效的阵法类型' });
  }

  const database = getDb();

  try {
    const record = database.prepare(
      `SELECT * FROM player_formations WHERE player_id = ? AND formation_type = ?`
    ).get(playerId, formationType);

    if (!record) {
      return res.status(400).json({ code: 1, error: '请先激活该阵法' });
    }

    const currentLevel = Number(record.formation_level);
    if (currentLevel >= 10) {
      return res.status(400).json({ code: 1, error: '该阵法已达满级（10级）' });
    }

    const targetLevel = currentLevel + 1;
    const config = UPGRADE_CONFIG[targetLevel];
    if (!config) {
      return res.status(400).json({ code: 1, error: '升级配置错误' });
    }

    // 检查灵石
    const stones = getPlayerSpiritStones(playerId);
    if (stones < config.spiritStones) {
      return res.status(400).json({
        code: 1,
        error: `灵石不足，需要${config.spiritStones}灵石，当前${stones}`
      });
    }

    // 检查阵旗
    const flagCount = getFormationFlagCount(playerId, config.flagQuality);
    if (flagCount < config.flagCount) {
      const nameMap = { normal: '阵旗', high: '高级阵旗', expert: '专家阵旗' };
      return res.status(400).json({
        code: 1,
        error: `阵旗不足，需要${config.flagCount}个${nameMap[config.flagQuality]}，当前${flagCount}个`
      });
    }

    // 随机判定成功率
    const roll = Math.random() * 100;
    const success = roll < config.successRate;

    // 消耗材料（不管成功失败都消耗）
    consumeFormationFlags(playerId, config.flagQuality, config.flagCount);
    updatePlayerSpiritStones(playerId, -config.spiritStones);

    let newLevel = currentLevel;
    let message = '';

    if (success) {
      database.prepare(
        `UPDATE player_formations SET formation_level = ? WHERE player_id = ? AND formation_type = ?`
      ).run(targetLevel, playerId, formationType);
      newLevel = targetLevel;
      const type = FORMATION_TYPES[formationType];
      message = `升级成功！${type.name}提升至${newLevel}级！`;
    } else {
      message = `升级失败（${roll.toFixed(1)}/${config.successRate}），材料已消耗，等级保留在${currentLevel}级`;
    }

    recalcFormationBonus(playerId);
    const newStones = getPlayerSpiritStones(playerId);

    res.json({
      code: 0,
      data: {
        formationType,
        name: FORMATION_TYPES[formationType].name,
        oldLevel: currentLevel,
        newLevel,
        success,
        spiritStonesSpent: config.spiritStones,
        flagsSpent: config.flagCount,
        flagQuality: config.flagQuality,
        roll,
        successRate: config.successRate,
        remainingSpiritStones: newStones,
        message
      }
    });
  } catch (e) {
    Logger.error('/upgrade error:', e.message);
    res.status(500).json({ code: 1, error: '服务器错误: ' + e.message });
  }
});

// POST /api/formation/position - 配置阵眼位置
router.post('/position', (req, res) => {
  const playerId = getPlayerId(req);
  const { formationType, positionConfig } = req.body;

  if (!formationType || !FORMATION_TYPES[formationType]) {
    return res.status(400).json({ code: 1, error: '无效的阵法类型' });
  }

  if (!positionConfig || typeof positionConfig !== 'object') {
    return res.status(400).json({ code: 1, error: '无效的阵眼配置' });
  }

  const database = getDb();

  try {
    const record = database.prepare(
      `SELECT * FROM player_formations WHERE player_id = ? AND formation_type = ?`
    ).get(playerId, formationType);

    if (!record) {
      return res.status(400).json({ code: 1, error: '请先激活该阵法' });
    }

    // 验证阵眼配置
    const validated = {};
    for (const [slot, targetId] of Object.entries(positionConfig)) {
      if (!FORMATION_POSITIONS.includes(slot)) {
        return res.status(400).json({ code: 1, error: `无效的阵眼位置: ${slot}` });
      }
      validated[slot] = parseInt(targetId) || 0;
    }

    database.prepare(
      `UPDATE player_formations SET position_config = ? WHERE player_id = ? AND formation_type = ?`
    ).run(JSON.stringify(validated), playerId, formationType);

    recalcFormationBonus(playerId);

    res.json({
      code: 0,
      data: {
        formationType,
        name: FORMATION_TYPES[formationType].name,
        positionConfig: validated,
        message: '阵眼配置更新成功'
      }
    });
  } catch (e) {
    Logger.error('/position error:', e.message);
    res.status(500).json({ code: 1, error: '服务器错误: ' + e.message });
  }
});

// GET /api/formation/bonus - 获取当前阵法加成
router.get('/bonus', (req, res) => {
  const playerId = getPlayerId(req);
  const database = getDb();

  try {
    // 获取玩家激活的阵法
    const formations = database.prepare(
      `SELECT * FROM player_formations WHERE player_id = ? AND is_active = 1`
    ).all(playerId);

    const bonuses = formations.map(f => {
      const type = FORMATION_TYPES[f.formation_type];
      const level = Number(f.formation_level);
      const mult = getLevelMultiplier(level);
      const positionConfig = JSON.parse(f.position_config || '{}');

      // 计算基础效果加成（乘以等级系数）
      const effect = type?.baseEffect || {};
      const scaled = {};
      for (const [k, v] of Object.entries(effect)) {
        scaled[k] = Math.round(v * mult * 10) / 10;
      }

      return {
        formationType: f.formation_type,
        name: type?.name || f.formation_type,
        icon: type?.icon || '☯️',
        level,
        multiplier: mult,
        baseEffect: scaled,
        level10Effect: level >= 10 ? (type?.level10Effect || null) : null,
        positionConfig
      };
    });

    // 计算总加成
    let totalAttackBonus = 0;
    let totalDefenseBonus = 0;
    let totalSpeedBonus = 0;
    const specialBonus = {};

    for (const b of bonuses) {
      totalAttackBonus += b.baseEffect.attack || 0;
      totalDefenseBonus += b.baseEffect.defense || 0;
      totalSpeedBonus += b.baseEffect.speed || 0;
      if (b.baseEffect.crit) specialBonus.crit = (specialBonus.crit || 0) + b.baseEffect.crit;
      if (b.baseEffect.dodge) specialBonus.dodge = (specialBonus.dodge || 0) + b.baseEffect.dodge;
      if (b.baseEffect.reflect) specialBonus.reflect = (specialBonus.reflect || 0) + b.baseEffect.reflect;
      if (b.baseEffect.counter_damage) specialBonus.counter_damage = (specialBonus.counter_damage || 0) + b.baseEffect.counter_damage;
      if (b.baseEffect.damage_reduction) specialBonus.damage_reduction = (specialBonus.damage_reduction || 0) + b.baseEffect.damage_reduction;
      if (b.baseEffect.lifesteal) specialBonus.lifesteal = (specialBonus.lifesteal || 0) + b.baseEffect.lifesteal;
      if (b.level10Effect) specialBonus.level10 = b.level10Effect;
    }

    // 保存到formation_bonus表
    database.prepare(
      `INSERT OR REPLACE INTO formation_bonus (player_id, total_attack_bonus, total_defense_bonus, total_speed_bonus, special_bonus, calculated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    ).run(playerId, totalAttackBonus, totalDefenseBonus, totalSpeedBonus, JSON.stringify(specialBonus));

    res.json({
      code: 0,
      data: {
        formations: bonuses,
        total: {
          attackBonus: Math.round(totalAttackBonus * 10) / 10,
          defenseBonus: Math.round(totalDefenseBonus * 10) / 10,
          speedBonus: Math.round(totalSpeedBonus * 10) / 10,
          special: specialBonus
        }
      }
    });
  } catch (e) {
    Logger.error('/bonus error:', e.message);
    res.status(500).json({ code: 1, error: '服务器错误' });
  }
});

// POST /api/formation/split - 分裂灵石（将灵石转换为阵旗材料）
router.post('/split', (req, res) => {
  const playerId = getPlayerId(req);
  const { quality = 'normal', amount = 1 } = req.body;

  const splitCosts = {
    normal: { stones: 500, givesFlag: 1, name: '阵旗' },
    high: { stones: 2000, givesFlag: 1, name: '高级阵旗' },
    expert: { stones: 10000, givesFlag: 1, name: '专家阵旗' }
  };

  const config = splitCosts[quality];
  if (!config) {
    return res.status(400).json({ code: 1, error: '无效的阵旗品质（normal/high/expert）' });
  }

  const totalCost = config.stones * Math.max(1, parseInt(amount) || 1);
  const stones = getPlayerSpiritStones(playerId);

  if (stones < totalCost) {
    return res.status(400).json({
      code: 1,
      error: `灵石不足，需要${totalCost}灵石，当前${stones}`
    });
  }

  const database = getDb();
  try {
    // 扣除灵石
    updatePlayerSpiritStones(playerId, -totalCost);

    // 添加阵旗到背包
    const flagName = config.name;
    const flagCount = config.givesFlag * Math.max(1, parseInt(amount) || 1);

    const existing = database.prepare(
      `SELECT id, count FROM player_items WHERE user_id = ? AND item_name = ? AND item_type = 'formation_flag'`
    ).get(playerId, flagName);

    if (existing) {
      database.prepare(
        `UPDATE player_items SET count = count + ? WHERE id = ?`
      ).run(flagCount, existing.id);
    } else {
      database.prepare(
        `INSERT INTO player_items (user_id, item_id, item_name, item_type, count, icon, source) VALUES (?, 0, ?, 'formation_flag', ?, '🚩', 'formation_split')`
      ).run(playerId, flagName, flagCount);
    }

    const newStones = getPlayerSpiritStones(playerId);

    res.json({
      code: 0,
      data: {
        quality,
        flagsProduced: flagCount,
        spiritStonesSpent: totalCost,
        remainingSpiritStones: newStones,
        message: `成功分裂出${flagCount}个【${flagName}】！`
      }
    });
  } catch (e) {
    Logger.error('/split error:', e.message);
    // 尝试回滚灵石
    updatePlayerSpiritStones(playerId, totalCost);
    res.status(500).json({ code: 1, error: '服务器错误: ' + e.message });
  }
});

// ============ 内部方法：重新计算阵法加成 ============
function recalcFormationBonus(playerId) {
  const database = getDb();
  try {
    // 重新计算（逻辑与 /bonus 相同，但只写回数据库）
    const formations = database.prepare(
      `SELECT * FROM player_formations WHERE player_id = ? AND is_active = 1`
    ).all(playerId);

    let totalAttackBonus = 0;
    let totalDefenseBonus = 0;
    let totalSpeedBonus = 0;
    const specialBonus = {};

    for (const f of formations) {
      const type = FORMATION_TYPES[f.formation_type];
      const level = Number(f.formation_level);
      const mult = getLevelMultiplier(level);
      const effect = type?.baseEffect || {};

      totalAttackBonus += (effect.attack || 0) * mult;
      totalDefenseBonus += (effect.defense || 0) * mult;
      totalSpeedBonus += (effect.speed || 0) * mult;

      if (effect.crit) specialBonus.crit = (specialBonus.crit || 0) + effect.crit * mult;
      if (effect.dodge) specialBonus.dodge = (specialBonus.dodge || 0) + effect.dodge * mult;
      if (effect.reflect) specialBonus.reflect = (specialBonus.reflect || 0) + effect.reflect * mult;
      if (effect.counter_damage) specialBonus.counter_damage = (specialBonus.counter_damage || 0) + effect.counter_damage * mult;
      if (effect.damage_reduction) specialBonus.damage_reduction = (specialBonus.damage_reduction || 0) + effect.damage_reduction * mult;
      if (effect.lifesteal) specialBonus.lifesteal = (specialBonus.lifesteal || 0) + effect.lifesteal * mult;
      if (level >= 10) specialBonus.level10 = type.level10Effect;
    }

    database.prepare(
      `INSERT OR REPLACE INTO formation_bonus (player_id, total_attack_bonus, total_defense_bonus, total_speed_bonus, special_bonus, calculated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    ).run(playerId, totalAttackBonus, totalDefenseBonus, totalSpeedBonus, JSON.stringify(specialBonus));
  } catch (e) {
    Logger.error('recalcFormationBonus error:', e.message);
  }
}

module.exports = router;
