/**
 * 灵宠/灵兽培养系统 API
 * 参考梦幻西游宝宝/DNF宠物设计
 *
 * 功能：灵兽获取、升级培养、技能学习、进化突破、血脉系统、灵兽装备
 */

const express = require('express');
const router = express.Router();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'game.db');

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

// ==================== 灵兽类型配置 ====================
const SPIRIT_TYPES = {
  turtle: {
    id: 'turtle', name: '玄武兽', type: 'tank',
    desc: '上古神兽玄武后裔，防御无双',
    baseStats: { hp: 120, attack: 40, defense: 80, speed: 30, magic: 50 },
    qualityRanks: { white: 1.0, green: 1.3, blue: 1.6, purple: 2.0, orange: 2.5 },
    innateSkills: ['龟甲护盾', '重甲防御'],
    evolveTo: 'turtle_2', growRate: 0.8
  },
  dragon: {
    id: 'dragon', name: '青龙兽', type: 'attack',
    desc: '东方神龙血脉，攻击力绝伦',
    baseStats: { hp: 80, attack: 120, defense: 40, speed: 60, magic: 70 },
    qualityRanks: { white: 1.0, green: 1.3, blue: 1.6, purple: 2.0, orange: 2.5 },
    innateSkills: ['龙之吐息', '龙魂斩'],
    evolveTo: 'dragon_2', growRate: 1.2
  },
  tiger: {
    id: 'tiger', name: '白虎兽', type: 'speed',
    desc: '西方白虎化身，快如闪电',
    baseStats: { hp: 70, attack: 90, defense: 50, speed: 130, magic: 40 },
    qualityRanks: { white: 1.0, green: 1.3, blue: 1.6, purple: 2.0, orange: 2.5 },
    innateSkills: ['虎跃斩', '疾风突袭'],
    evolveTo: 'tiger_2', growRate: 1.3
  },
  phoenix: {
    id: 'phoenix', name: '朱雀兽', type: 'magic',
    desc: '南方朱雀降临，法术焚天',
    baseStats: { hp: 75, attack: 60, defense: 45, speed: 70, magic: 130 },
    qualityRanks: { white: 1.0, green: 1.3, blue: 1.6, purple: 2.0, orange: 2.5 },
    innateSkills: ['烈焰风暴', '浴火重生'],
    evolveTo: 'phoenix_2', growRate: 1.1
  },
  qilin: {
    id: 'qilin', name: '麒麟兽', type: 'balanced',
    desc: '祥瑞麒麟，各项能力均衡',
    baseStats: { hp: 90, attack: 80, defense: 60, speed: 80, magic: 80 },
    qualityRanks: { white: 1.0, green: 1.3, blue: 1.6, purple: 2.0, orange: 2.5 },
    innateSkills: ['麒麟吐息', '祥瑞护体'],
    evolveTo: 'qilin_2', growRate: 1.0
  }
};

const QUALITY_NAMES = {
  white: { label: '普通', color: '#cccccc', multiplier: 1.0 },
  green: { label: '优秀', color: '#00cc66', multiplier: 1.3 },
  blue: { label: '稀有', color: '#3399ff', multiplier: 1.6 },
  purple: { label: '史诗', color: '#9933ff', multiplier: 2.0 },
  orange: { label: '传说', color: '#ff9900', multiplier: 2.5 }
};

const BLOOD_LINES = {
  fire: { id: 'fire', name: '火焰血脉', element: '火', statBonus: { attack: 15, magic: 10 }, skillUnlock: '灼烧之息', desc: '增加火焰系伤害' },
  water: { id: 'water', name: '流水血脉', element: '水', statBonus: { hp: 20, defense: 8 }, skillUnlock: '水盾护体', desc: '提升生命恢复' },
  thunder: { id: 'thunder', name: '雷霆血脉', element: '雷', statBonus: { speed: 20, attack: 10 }, skillUnlock: '雷鸣爆轰', desc: '提升速度与暴击' },
  wind: { id: 'wind', name: '风暴血脉', element: '风', statBonus: { speed: 25, attack: 5 }, skillUnlock: '风卷残云', desc: '大幅提升速度' },
  earth: { id: 'earth', name: '大地血脉', element: '土', statBonus: { defense: 20, hp: 10 }, skillUnlock: '大地壁垒', desc: '增强防御与护盾' },
  shadow: { id: 'shadow', name: '暗影血脉', element: '暗', statBonus: { magic: 20, attack: 5 }, skillUnlock: '暗影突袭', desc: '暗属性攻击增强' }
};

const SPIRIT_SKILLS = [
  // 通用被动
  { id: 'spirit_vitality', name: '灵兽生机', type: 'passive', element: 'none', desc: '主人生命+5%', level: 1 },
  { id: 'spirit_strength', name: '灵兽之力', type: 'passive', element: 'none', desc: '主人攻击+5%', level: 1 },
  { id: 'spirit_fortune', name: '灵兽福运', type: 'passive', element: 'none', desc: '稀有掉落+3%', level: 1 },
  // 攻击技能
  { id: 'claw_fury', name: '利爪狂怒', type: 'active', element: 'none', desc: '造成150%伤害', level: 2 },
  { id: 'bite_venom', name: '毒牙撕咬', type: 'active', element: 'poison', desc: '造成120%伤害+中毒', level: 2 },
  { id: 'pounce_assault', name: '猛扑突击', type: 'active', element: 'none', desc: '造成130%伤害，25%眩晕', level: 3 },
  // 防御技能
  { id: 'shell_reflect', name: '龟壳反震', type: 'active', element: 'earth', desc: '嘲讽并反弹30%伤害', level: 2 },
  { id: 'mist_guard', name: '迷雾守护', type: 'active', element: 'water', desc: '闪避率+30%持续2回合', level: 3 },
  { id: 'guardian_roar', name: '守护怒吼', type: 'active', element: 'none', desc: '主人受伤-20%持续2回合', level: 4 },
  // 法术技能
  { id: 'inferno_burst', name: '炽焰爆发', type: 'active', element: 'fire', desc: '造成180%法术伤害', level: 3 },
  { id: 'ice_shard', name: '寒冰碎片', type: 'active', element: 'water', desc: '造成140%法术伤害+减速', level: 2 },
  { id: 'lightning_strike', name: '雷霆一击', type: 'active', element: 'thunder', desc: '造成160%伤害，20%麻痹', level: 3 },
  // 高级技能
  { id: 'dragon_flame', name: '龙焰灭世', type: 'active', element: 'fire', desc: '造成250%法术伤害', level: 5 },
  { id: 'phoenix_rebirth', name: '凤凰涅槃', type: 'passive', element: 'fire', desc: '主人死亡时复活并回血50%', level: 5 },
  { id: 'tiger_gore', name: '白虎撕裂', type: 'active', element: 'none', desc: '造成200%伤害，40%流血', level: 5 }
];

const EQUIPMENT_SLOTS = [
  { slot: 'collar', name: '灵兽项圈', type: 'neck', stats: ['attack', 'crit'], possibleStats: ['attack', 'crit', 'crit_dmg'] },
  { slot: 'charm', name: '灵兽护符', type: 'charm', stats: ['hp', 'defense'], possibleStats: ['hp', 'defense', 'resist'] },
  { slot: 'armor', name: '灵兽铠甲', type: 'armor', stats: ['defense', 'hp'], possibleStats: ['defense', 'hp', 'resist'] }
];

const FEED_ITEMS = {
  spirit_pill: { name: '灵兽丹', exp: 100, type: 'pill' },
  spirit_elixir: { name: '灵兽金丹', exp: 500, type: 'elixir' },
  spirit_essence: { name: '灵兽精华', exp: 2000, type: 'essence' },
  spirit_stone: { name: '灵石喂养', exp: 50, type: 'stone' }
};

// ==================== 工具函数 ====================
function initTables() {
  const database = getDb();
  if (!database) return;

  try {
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

      CREATE TABLE IF NOT EXISTS spirit_types_config (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        base_stats TEXT NOT NULL,
        innate_skills TEXT NOT NULL,
        evolve_to TEXT,
        grow_rate REAL DEFAULT 1.0
      );

      CREATE TABLE IF NOT EXISTS spirit_blood_lines_config (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        element TEXT NOT NULL,
        stat_bonus TEXT NOT NULL,
        skill_unlock TEXT NOT NULL,
        stat_bonus_values TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS player_spirit_skills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        spirit_id INTEGER NOT NULL,
        skill_id TEXT NOT NULL,
        slot INTEGER DEFAULT 0,
        source TEXT DEFAULT 'learned',
        created_at INTEGER DEFAULT (strftime('%s','now'))
      );

      CREATE TABLE IF NOT EXISTS spirit_equipment_catalog (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slot TEXT NOT NULL,
        name TEXT NOT NULL,
        quality TEXT NOT NULL,
        stats TEXT NOT NULL,
        price INTEGER DEFAULT 0
      );
    `);

    // Seed spirit types if empty
    const typeCount = database.prepare('SELECT COUNT(*) as c FROM spirit_types_config').get();
    if (typeCount.c === 0) {
      const insertType = database.prepare(
        'INSERT OR REPLACE INTO spirit_types_config (id, name, type, base_stats, innate_skills, evolve_to, grow_rate) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      for (const [id, st] of Object.entries(SPIRIT_TYPES)) {
        insertType.run(id, st.name, st.type, JSON.stringify(st.baseStats), JSON.stringify(st.innateSkills), st.evolveTo, st.growRate);
      }
    }

    // Seed blood lines if empty
    const bloodCount = database.prepare('SELECT COUNT(*) as c FROM spirit_blood_lines_config').get();
    if (bloodCount.c === 0) {
      const insertBlood = database.prepare(
        'INSERT OR REPLACE INTO spirit_blood_lines_config (id, name, element, stat_bonus, skill_unlock, stat_bonus_values) VALUES (?, ?, ?, ?, ?, ?)'
      );
      for (const [id, bl] of Object.entries(BLOOD_LINES)) {
        insertBlood.run(id, bl.name, bl.element, bl.element, bl.skillUnlock, JSON.stringify(bl.statBonus));
      }
    }

    // Seed skills if empty
    const skillCount = database.prepare('SELECT COUNT(*) as c FROM spirit_equipment_catalog').get();
    if (skillCount.c === 0) {
      const insertEquip = database.prepare(
        'INSERT OR REPLACE INTO spirit_equipment_catalog (slot, name, quality, stats, price) VALUES (?, ?, ?, ?, ?)'
      );
      const qualities = ['white', 'green', 'blue', 'purple', 'orange'];
      for (const slot of EQUIPMENT_SLOTS) {
        for (let qi = 0; qi < qualities.length; qi++) {
          const q = qualities[qi];
          const multiplier = QUALITY_NAMES[q].multiplier;
          const basePrice = (qi + 1) * 100;
          const stats = {};
          for (const stat of slot.stats) {
            stats[stat] = Math.floor((10 + qi * 5) * multiplier);
          }
          insertEquip.run(slot.slot, slot.name + '_' + q, q, JSON.stringify(stats), basePrice);
        }
      }
    }
  } catch (e) {
    console.error('[spirit_pet_api] initTables error:', e.message);
  }
}

function calcSpiritStats(spiritType, quality, level, stars, bloodAwakened, bloodLineId) {
  const base = SPIRIT_TYPES[spiritType] || SPIRIT_TYPES.qilin;
  const qMult = QUALITY_NAMES[quality]?.multiplier || 1.0;
  const starBonus = 1 + stars * 0.1;
  const bloodBonus = bloodAwakened > 0 ? (() => {
    const bl = BLOOD_LINES[bloodLineId];
    return bl ? bl.statBonus : {};
  })() : {};

  const stats = {};
  for (const [k, v] of Object.entries(base.baseStats)) {
    const bonus = bloodBonus[k] || 0;
    stats[k] = Math.floor((v * qMult * (1 + (level - 1) * 0.1) * starBonus) + bonus * bloodAwakened);
  }
  return stats;
}

function getLevelExp(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

function getQualityFromRandom(rate) {
  const rand = Math.random();
  if (rand < rate.orange) return 'orange';
  if (rand < rate.purple) return 'purple';
  if (rand < rate.blue) return 'blue';
  if (rand < rate.green) return 'green';
  return 'white';
}

// ==================== API 端点 ====================

/**
 * GET /api/spirit-pet/types
 * 获取灵兽类型配置
 */
router.get('/types', (req, res) => {
  initTables();
  const types = Object.entries(SPIRIT_TYPES).map(([id, t]) => ({
    id, name: t.name, type: t.type, desc: t.desc,
    baseStats: t.baseStats,
    innateSkills: t.innateSkills,
    evolveTo: t.evolveTo,
    growRate: t.growRate,
    qualities: Object.entries(QUALITY_NAMES).map(([q, info]) => ({
      quality: q, label: info.label, color: info.color, multiplier: info.multiplier
    }))
  }));

  res.json({ success: true, types });
});

/**
 * GET /api/spirit-pet/skills
 * 获取灵兽技能列表
 */
router.get('/skills', (req, res) => {
  res.json({ success: true, skills: SPIRIT_SKILLS });
});

/**
 * GET /api/spirit-pet/blood-lines
 * 获取血脉系统配置
 */
router.get('/blood-lines', (req, res) => {
  const lines = Object.entries(BLOOD_LINES).map(([id, bl]) => ({ id, ...bl }));
  res.json({ success: true, bloodLines: lines });
});

/**
 * GET /api/spirit-pet/list
 * 获取玩家灵兽列表
 */
router.get('/list', (req, res) => {
  const database = getDb();
  const playerId = getPlayerId(req);

  if (!database) {
    return res.status(503).json({ success: false, error: '数据库不可用', spirits: [] });
  }

  try {
    const spirits = database.prepare(
      'SELECT * FROM player_spirits WHERE player_id = ? ORDER BY level DESC, stars DESC'
    ).all(playerId);

    const formatted = spirits.map(s => {
      const spiritType = SPIRIT_TYPES[s.spirit_type] || SPIRIT_TYPES.qilin;
      return {
        id: s.id,
        spiritType: s.spirit_type,
        name: s.name,
        level: s.level,
        exp: s.exp,
        expNext: getLevelExp(s.level),
        quality: s.quality,
        qualityLabel: QUALITY_NAMES[s.quality]?.label || s.quality,
        qualityColor: QUALITY_NAMES[s.quality]?.color || '#cccccc',
        stars: s.stars,
        bloodLine: s.blood_line,
        bloodAwakened: s.blood_awakened,
        skills: JSON.parse(s.skills || '[]'),
        equippedGear: JSON.parse(s.equipped_gear || '{}'),
        appearance: s.appearance,
        typeName: spiritType.name,
        typeIcon: spiritType.type,
        stats: JSON.parse(JSON.stringify(
          calcSpiritStats(s.spirit_type, s.quality, s.level, s.stars, s.blood_awakened, s.blood_line)
        ))
      };
    });

    res.json({ success: true, spirits: formatted, count: formatted.length });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message, spirits: [] });
  }
});

/**
 * GET /api/spirit-pet/detail
 * 获取单个灵兽详情
 */
router.get('/detail', (req, res) => {
  const database = getDb();
  const playerId = getPlayerId(req);
  const spiritId = parseInt(req.query.spirit_id || req.query.id);

  if (!spiritId) {
    return res.status(400).json({ success: false, error: '缺少 spirit_id 参数' });
  }

  if (!database) {
    return res.status(503).json({ success: false, error: '数据库不可用' });
  }

  try {
    const s = database.prepare(
      'SELECT * FROM player_spirits WHERE id = ? AND player_id = ?'
    ).get(spiritId, playerId);

    if (!s) {
      return res.status(404).json({ success: false, error: '灵兽不存在' });
    }

    const spiritType = SPIRIT_TYPES[s.spirit_type] || SPIRIT_TYPES.qilin;
    const computedStats = calcSpiritStats(s.spirit_type, s.quality, s.level, s.stars, s.blood_awakened, s.blood_line);

    // 获取装备详情
    const gear = JSON.parse(s.equipped_gear || '{}');
    const gearDetails = {};
    if (database) {
      for (const [slot, equipId] of Object.entries(gear)) {
        const equip = database.prepare('SELECT * FROM spirit_equipment_catalog WHERE id = ?').get(equipId);
        if (equip) gearDetails[slot] = { id: equip.id, name: equip.name, quality: equip.quality, stats: JSON.parse(equip.stats) };
      }
    }

    res.json({
      success: true,
      spirit: {
        id: s.id,
        spiritType: s.spirit_type,
        name: s.name,
        level: s.level,
        exp: s.exp,
        expNext: getLevelExp(s.level),
        quality: s.quality,
        qualityLabel: QUALITY_NAMES[s.quality]?.label || s.quality,
        qualityColor: QUALITY_NAMES[s.quality]?.color || '#cccccc',
        stars: s.stars,
        bloodLine: s.blood_line,
        bloodAwakened: s.blood_awakened,
        skills: JSON.parse(s.skills || '[]'),
        equippedGear: gearDetails,
        appearance: s.appearance,
        typeName: spiritType.name,
        typeDesc: spiritType.desc,
        typeIcon: spiritType.type,
        innateSkills: spiritType.innateSkills,
        stats: computedStats,
        growRate: spiritType.growRate,
        evolveTo: spiritType.evolveTo,
        createdAt: s.created_at
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * POST /api/spirit-pet/obtain
 * 获取灵兽 - 野外捕捉 / 灵兽蛋孵化 / 活动赠送
 *
 * Body: { method: 'capture' | 'hatch' | 'gift', spirit_type?, quality? }
 */
router.post('/obtain', (req, res) => {
  const database = getDb();
  const playerId = getPlayerId(req);
  const { method = 'capture', spirit_type, quality } = req.body;

  if (!database) {
    return res.status(503).json({ success: false, error: '数据库不可用' });
  }

  // 检查灵兽数量上限 (20只)
  const existing = database.prepare('SELECT COUNT(*) as c FROM player_spirits WHERE player_id = ?').get(playerId);
  if (existing.c >= 20) {
    return res.status(400).json({ success: false, error: '灵兽栏已满（上限20只），请放生或升级灵兽栏' });
  }

  try {
    let spiritTypeId = spirit_type;
    let spiritQuality = quality;

    if (method === 'capture') {
      // 野外捕捉：随机灵兽类型 + 概率品质
      const typeKeys = Object.keys(SPIRIT_TYPES);
      spiritTypeId = spiritTypeId || typeKeys[Math.floor(Math.random() * typeKeys.length)];
      spiritQuality = spiritQuality || getQualityFromRandom({
        green: 0.5, blue: 0.25, purple: 0.1, orange: 0.03
      });
    } else if (method === 'hatch') {
      // 灵兽蛋孵化：需要道具 spirit_egg
      spiritTypeId = spirit_type || Object.keys(SPIRIT_TYPES)[Math.floor(Math.random() * Object.keys(SPIRIT_TYPES).length)];
      spiritQuality = spiritQuality || getQualityFromRandom({
        green: 0.4, blue: 0.2, purple: 0.08, orange: 0.02
      });
    } else if (method === 'gift') {
      // 活动赠送：指定类型和品质
      spiritTypeId = spirit_type || 'qilin';
      spiritQuality = spiritQuality || 'blue';
    } else {
      return res.status(400).json({ success: false, error: '无效的获取方式' });
    }

    const spiritType = SPIRIT_TYPES[spiritTypeId] || SPIRIT_TYPES.qilin;
    const name = spiritType.name + (spiritQuality !== 'white' ? QUALITY_NAMES[spiritQuality]?.label : '') + '灵兽';
    const computedStats = calcSpiritStats(spiritTypeId, spiritQuality, 1, 0, 0, null);
    const initialSkills = [...spiritType.innateSkills];

    const result = database.prepare(`
      INSERT INTO player_spirits (player_id, spirit_type, name, level, exp, quality, stars, skills, max_hp, current_hp, attack, defense, speed, magic)
      VALUES (?, ?, ?, 1, 0, ?, 0, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      playerId, spiritTypeId, name, spiritQuality, JSON.stringify(initialSkills),
      computedStats.hp, computedStats.hp, computedStats.attack, computedStats.defense, computedStats.speed, computedStats.magic
    );

    res.json({
      success: true,
      message: `成功获得 ${name}！`,
      spirit: {
        id: result.lastInsertRowid,
        spiritType: spiritTypeId,
        name,
        level: 1,
        quality: spiritQuality,
        qualityLabel: QUALITY_NAMES[spiritQuality]?.label,
        qualityColor: QUALITY_NAMES[spiritQuality]?.color,
        stars: 0,
        innateSkills: initialSkills,
        stats: computedStats
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * POST /api/spirit-pet/feed
 * 喂养灵兽升级
 *
 * Body: { spirit_id, item_type: 'spirit_pill'|'spirit_elixir'|'spirit_essence'|'spirit_stone', count }
 */
router.post('/feed', (req, res) => {
  const database = getDb();
  const playerId = getPlayerId(req);
  const { spirit_id, item_type, count = 1 } = req.body;

  if (!spirit_id || !item_type) {
    return res.status(400).json({ success: false, error: '缺少必要参数' });
  }

  const feedItem = FEED_ITEMS[item_type];
  if (!feedItem) {
    return res.status(400).json({ success: false, error: '无效的喂养道具' });
  }

  if (!database) {
    return res.status(503).json({ success: false, error: '数据库不可用' });
  }

  try {
    const spirit = database.prepare('SELECT * FROM player_spirits WHERE id = ? AND player_id = ?').get(spirit_id, playerId);
    if (!spirit) {
      return res.status(404).json({ success: false, error: '灵兽不存在' });
    }

    // 获取玩家等级作为等级上限参考
    const player = database.prepare('SELECT level FROM player WHERE id = ?').get(playerId);
    const maxLevel = (player?.level || 1) * 2;

    if (spirit.level >= maxLevel) {
      return res.status(400).json({ success: false, error: `灵兽已达当前等级上限（${maxLevel}级）` });
    }

    let totalExp = feedItem.exp * count;
    let newExp = spirit.exp + totalExp;
    let newLevel = spirit.level;
    let leveledUp = false;
    let levelsGained = 0;

    // 升级计算
    while (newLevel < maxLevel && newExp >= getLevelExp(newLevel)) {
      newExp -= getLevelExp(newLevel);
      newLevel++;
      levelsGained++;
      leveledUp = true;
    }

    // 重新计算属性
    const computedStats = calcSpiritStats(spirit.spirit_type, spirit.quality, newLevel, spirit.stars, spirit.blood_awakened, spirit.blood_line);

    database.prepare(`
      UPDATE player_spirits SET exp = ?, level = ?, max_hp = ?, current_hp = ?, attack = ?, defense = ?, speed = ?, magic = ?
      WHERE id = ?
    `).run(newExp, newLevel, computedStats.hp, computedStats.hp, computedStats.attack, computedStats.defense, computedStats.speed, computedStats.magic, spirit_id);

    res.json({
      success: true,
      spiritId: spirit_id,
      expGained: totalExp,
      newExp,
      expNext: getLevelExp(newLevel),
      leveledUp,
      levelsGained,
      newLevel,
      stats: computedStats
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * POST /api/spirit-pet/evolve
 * 升星进化
 *
 * Body: { spirit_id }
 * 规则：1-4星可用灵兽丹/灵石进化，5星需要稀有材料
 */
router.post('/evolve', (req, res) => {
  const database = getDb();
  const playerId = getPlayerId(req);
  const { spirit_id } = req.body;

  if (!spirit_id) {
    return res.status(400).json({ success: false, error: '缺少 spirit_id' });
  }

  if (!database) {
    return res.status(503).json({ success: false, error: '数据库不可用' });
  }

  try {
    const spirit = database.prepare('SELECT * FROM player_spirits WHERE id = ? AND player_id = ?').get(spirit_id, playerId);
    if (!spirit) {
      return res.status(404).json({ success: false, error: '灵兽不存在' });
    }

    if (spirit.stars >= 5) {
      return res.status(400).json({ success: false, error: '灵兽已达最大星级（5星）' });
    }

    const newStars = spirit.stars + 1;
    const computedStats = calcSpiritStats(spirit.spirit_type, spirit.quality, spirit.level, newStars, spirit.blood_awakened, spirit.blood_line);

    // 5星解锁外观幻化
    const newAppearance = newStars >= 5 ? `${spirit.spirit_type}_advanced` : spirit.appearance;

    database.prepare(`
      UPDATE player_spirits SET stars = ?, max_hp = ?, current_hp = ?, attack = ?, defense = ?, speed = ?, magic = ?, appearance = ?
      WHERE id = ?
    `).run(newStars, computedStats.hp, computedStats.hp, computedStats.attack, computedStats.defense, computedStats.speed, computedStats.magic, newAppearance, spirit_id);

    res.json({
      success: true,
      message: `升星成功！灵兽已达 ${newStars} 星`,
      spiritId: spirit_id,
      newStars,
      appearanceUnlocked: newStars >= 5,
      newAppearance,
      stats: computedStats
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * POST /api/spirit-pet/learn-skill
 * 打书 - 技能学习
 *
 * Body: { spirit_id, skill_id, slot? }
 * 规则：最多4个技能栏，天生技能不可覆盖，可打书替换
 */
router.post('/learn-skill', (req, res) => {
  const database = getDb();
  const playerId = getPlayerId(req);
  const { spirit_id, skill_id, slot } = req.body;

  if (!spirit_id || !skill_id) {
    return res.status(400).json({ success: false, error: '缺少必要参数' });
  }

  if (!database) {
    return res.status(503).json({ success: false, error: '数据库不可用' });
  }

  try {
    const spirit = database.prepare('SELECT * FROM player_spirits WHERE id = ? AND player_id = ?').get(spirit_id, playerId);
    if (!spirit) {
      return res.status(404).json({ success: false, error: '灵兽不存在' });
    }

    const spiritType = SPIRIT_TYPES[spirit.spirit_type] || SPIRIT_TYPES.qilin;
    const currentSkills = JSON.parse(spirit.skills || '[]');
    const innateSkills = spiritType.innateSkills || [];

    // 验证技能是否存在
    const skillInfo = SPIRIT_SKILLS.find(s => s.id === skill_id);
    if (!skillInfo) {
      return res.status(404).json({ success: false, error: '技能不存在' });
    }

    // 检查天生技能不可覆盖
    if (innateSkills.includes(skill_id)) {
      return res.status(400).json({ success: false, error: '天生技能不可被覆盖' });
    }

    // 检查是否已有该技能
    if (currentSkills.includes(skill_id)) {
      return res.status(400).json({ success: false, error: '灵兽已学会该技能' });
    }

    // 最多4技能（包含天生）
    if (currentSkills.length >= 4) {
      // 需要替换：从后往前替换（非天生技能优先替换）
      const replaceableIdx = currentSkills.findIndex(s => !innateSkills.includes(s));
      if (replaceableIdx === -1) {
        return res.status(400).json({ success: false, error: '所有技能栏均已锁定，无法学习新技能' });
      }
      currentSkills[replaceableIdx] = skill_id;
    } else {
      currentSkills.push(skill_id);
    }

    database.prepare('UPDATE player_spirits SET skills = ? WHERE id = ?').run(JSON.stringify(currentSkills), spirit_id);

    // 记录到 skill 表
    database.prepare(
      'INSERT INTO player_spirit_skills (player_id, spirit_id, skill_id, slot, source) VALUES (?, ?, ?, ?, ?)'
    ).run(playerId, spirit_id, skill_id, slot || currentSkills.length - 1, 'learned');

    res.json({
      success: true,
      message: `成功学习技能「${skillInfo.name}」`,
      skills: currentSkills,
      newSkill: { id: skill_id, name: skillInfo.name, type: skillInfo.type, desc: skillInfo.desc }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * POST /api/spirit-pet/bloodline-awaken
 * 血脉觉醒
 *
 * Body: { spirit_id, blood_line }
 */
router.post('/bloodline-awaken', (req, res) => {
  const database = getDb();
  const playerId = getPlayerId(req);
  const { spirit_id, blood_line } = req.body;

  if (!spirit_id || !blood_line) {
    return res.status(400).json({ success: false, error: '缺少必要参数' });
  }

  const bloodInfo = BLOOD_LINES[blood_line];
  if (!bloodInfo) {
    return res.status(400).json({ success: false, error: '无效的血脉类型' });
  }

  if (!database) {
    return res.status(503).json({ success: false, error: '数据库不可用' });
  }

  try {
    const spirit = database.prepare('SELECT * FROM player_spirits WHERE id = ? AND player_id = ?').get(spirit_id, playerId);
    if (!spirit) {
      return res.status(404).json({ success: false, error: '灵兽不存在' });
    }

    if (spirit.blood_line && spirit.blood_line !== blood_line) {
      return res.status(400).json({ success: false, error: '灵兽已觉醒其他血脉，请先重置' });
    }

    if (spirit.blood_awakened >= 3) {
      return res.status(400).json({ success: false, error: '血脉已达最大觉醒等级（3阶）' });
    }

    const newAwakened = spirit.blood_awakened + 1;
    const computedStats = calcSpiritStats(spirit.spirit_type, spirit.quality, spirit.level, spirit.stars, newAwakened, blood_line);

    // 添加血脉技能
    const currentSkills = JSON.parse(spirit.skills || '[]');
    if (newAwakened >= 2 && !currentSkills.includes(blood_line + '_awaken')) {
      currentSkills.push(blood_line + '_awaken');
    }

    database.prepare(`
      UPDATE player_spirits SET blood_line = ?, blood_awakened = ?, skills = ?, max_hp = ?, current_hp = ?, attack = ?, defense = ?, speed = ?, magic = ?
      WHERE id = ?
    `).run(blood_line, newAwakened, JSON.stringify(currentSkills), computedStats.hp, computedStats.hp, computedStats.attack, computedStats.defense, computedStats.speed, computedStats.magic, spirit_id);

    res.json({
      success: true,
      message: `${bloodInfo.name}觉醒成功！当前觉醒阶数：${newAwakened}`,
      spiritId: spirit_id,
      bloodLine: blood_line,
      bloodLineName: bloodInfo.name,
      bloodAwakened: newAwakened,
      unlockedSkill: newAwakened >= 2 ? bloodInfo.skillUnlock : null,
      stats: computedStats
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * GET /api/spirit-pet/equipment-slots
 * 获取灵兽装备槽位
 */
router.get('/equipment-slots', (req, res) => {
  const database = getDb();
  const spiritId = parseInt(req.query.spirit_id);

  if (!database) {
    return res.json({ success: true, slots: EQUIPMENT_SLOTS, equipped: {} });
  }

  let equipped = {};
  if (spiritId) {
    const spirit = database.prepare('SELECT equipped_gear FROM player_spirits WHERE id = ?').get(spiritId);
    if (spirit) {
      equipped = JSON.parse(spirit.equipped_gear || '{}');
    }
  }

  // 获取装备详情
  const equippedDetails = {};
  for (const [slot, equipId] of Object.entries(equipped)) {
    const equip = database.prepare('SELECT * FROM spirit_equipment_catalog WHERE id = ?').get(equipId);
    if (equip) {
      equippedDetails[slot] = { id: equip.id, name: equip.name, quality: equip.quality, stats: JSON.parse(equip.stats) };
    }
  }

  res.json({
    success: true,
    slots: EQUIPMENT_SLOTS,
    equipped: equippedDetails
  });
});

/**
 * POST /api/spirit-pet/equip-gear
 * 穿戴灵兽装备
 *
 * Body: { spirit_id, slot, equipment_id }
 * equipment_id = 0 表示卸下装备
 */
router.post('/equip-gear', (req, res) => {
  const database = getDb();
  const playerId = getPlayerId(req);
  const { spirit_id, slot, equipment_id } = req.body;

  if (!spirit_id || !slot) {
    return res.status(400).json({ success: false, error: '缺少必要参数' });
  }

  const slotInfo = EQUIPMENT_SLOTS.find(s => s.slot === slot);
  if (!slotInfo) {
    return res.status(400).json({ success: false, error: '无效的装备槽位' });
  }

  if (!database) {
    return res.status(503).json({ success: false, error: '数据库不可用' });
  }

  try {
    const spirit = database.prepare('SELECT * FROM player_spirits WHERE id = ? AND player_id = ?').get(spirit_id, playerId);
    if (!spirit) {
      return res.status(404).json({ success: false, error: '灵兽不存在' });
    }

    const equippedGear = JSON.parse(spirit.equipped_gear || '{}');

    if (equipment_id && equipment_id > 0) {
      // 穿戴装备：验证装备存在
      const equip = database.prepare('SELECT * FROM spirit_equipment_catalog WHERE id = ?').get(equipment_id);
      if (!equip) {
        return res.status(404).json({ success: false, error: '装备不存在' });
      }
      if (equip.slot !== slot) {
        return res.status(400).json({ success: false, error: `该装备属于${equip.slot}槽位，无法装备到此槽` });
      }
      equippedGear[slot] = equipment_id;
    } else {
      // 卸下装备
      delete equippedGear[slot];
    }

    database.prepare('UPDATE player_spirits SET equipped_gear = ? WHERE id = ?').run(JSON.stringify(equippedGear), spirit_id);

    // 重新计算属性（装备加成）
    const computedStats = calcSpiritStats(spirit.spirit_type, spirit.quality, spirit.level, spirit.stars, spirit.blood_awakened, spirit.blood_line);
    // 加上装备属性
    for (const [eqSlot, eqId] of Object.entries(equippedGear)) {
      const equip = database.prepare('SELECT stats FROM spirit_equipment_catalog WHERE id = ?').get(eqId);
      if (equip) {
        const stats = JSON.parse(equip.stats);
        for (const [k, v] of Object.entries(stats)) {
          if (computedStats[k] !== undefined) computedStats[k] += v;
        }
      }
    }

    res.json({
      success: true,
      message: equipment_id > 0 ? '装备穿戴成功' : '装备已卸下',
      spiritId,
      equippedGear,
      stats: computedStats
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * DELETE /api/spirit-pet/release
 * 放生灵兽
 *
 * Body: { spirit_id }
 */
router.delete('/release', (req, res) => {
  const database = getDb();
  const playerId = getPlayerId(req);
  const { spirit_id } = req.body;

  if (!spirit_id) {
    return res.status(400).json({ success: false, error: '缺少 spirit_id' });
  }

  if (!database) {
    return res.status(503).json({ success: false, error: '数据库不可用' });
  }

  try {
    const spirit = database.prepare('SELECT * FROM player_spirits WHERE id = ? AND player_id = ?').get(spirit_id, playerId);
    if (!spirit) {
      return res.status(404).json({ success: false, error: '灵兽不存在' });
    }

    database.prepare('DELETE FROM player_spirits WHERE id = ?').run(spirit_id);
    database.prepare('DELETE FROM player_spirit_skills WHERE spirit_id = ?').run(spirit_id);

    res.json({ success: true, message: `${spirit.name}已被放生，江湖再见！` });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
