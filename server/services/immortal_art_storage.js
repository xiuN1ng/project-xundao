/**
 * 仙术系统数据层 (immortal_art_storage.js)
 * 仙术学习/升级/战斗应用/效果公式
 */

const Database = require('better-sqlite3');
const path = require('path');

let db = null;

function getDb() {
  if (!db) {
    const dbPath = path.join(__dirname, '..', 'data', 'game.db');
    db = new Database(dbPath);
  }
  return db;
}

// ============================================================
// 仙术配置
// ============================================================

// 仙术类型
const ART_TYPES = {
  fire: { name: '火系', icon: '🔥', color: '#F44336', desc: '火焰伤害，附带灼烧效果' },
  ice: { name: '冰系', icon: '❄️', color: '#2196F3', desc: '冰冻伤害，附带减速效果' },
  thunder: { name: '雷系', icon: '⚡', color: '#FFEB3B', desc: '雷系伤害，附带麻痹效果' },
  wind: { name: '风系', icon: '💨', color: '#4CAF50', desc: '风系伤害，附带闪避提升' },
  earth: { name: '土系', icon: '🪨', color: '#795548', desc: '土系伤害，附带护盾效果' },
  light: { name: '光系', icon: '☀️', color: '#FFD700', desc: '光系伤害，附带治疗效果' },
  dark: { name: '暗系', icon: '🌑', color: '#9C27B0', desc: '暗系伤害，附带诅咒效果' },
  pure: { name: '纯阳', icon: '🏔️', color: '#E91E63', desc: '无属性伤害，附带穿透效果' },
};

// 仙术品质
const ART_QUALITIES = {
  white: { name: '凡品', color: '#9E9E9E', multiplier: 1.0 },
  green: { name: '良品', color: '#4CAF50', multiplier: 1.3 },
  blue: { name: '精品', color: '#2196F3', multiplier: 1.6 },
  purple: { name: '极品', color: '#9C27B0', multiplier: 2.0 },
  orange: { name: '绝品', color: '#FF9800', multiplier: 2.5 },
  red: { name: '仙品', color: '#E91E63', multiplier: 3.0 },
};

// 境界对应可学仙术等级
const REALM_ART_LEVEL = {
  0: 1,  // 凡人
  1: 2,  // 练气
  2: 3,  // 筑基
  3: 4,  // 金丹
  4: 5,  // 元婴
  5: 6,  // 化神
  6: 7,  // 炼虚
  7: 8,  // 大乘
  8: 9,  // 渡劫
  9: 10, // 飞升
};

// 所有仙术模板
const ART_TEMPLATES = {
  // ===== 火系仙术 =====
  fireball: {
    id: 'fireball', name: '火球术', type: 'fire', category: 'active',
    desc: '凝聚火焰球攻击敌人，造成火系伤害',
    quality: 'white', baseDamage: 50, manaCost: 10, cooldown: 3,
    unlockRealm: 1, unlockLevel: 5,
    effects: { damage: 50, burn_damage: 10, burn_duration: 3 },
    learnCost: 100, upgradeCostBase: 50,
  },
  flame_wave: {
    id: 'flame_wave', name: '火焰浪潮', type: 'fire', category: 'active',
    desc: '释放火焰浪潮，范围伤害',
    quality: 'green', baseDamage: 120, manaCost: 25, cooldown: 5,
    unlockRealm: 2, unlockLevel: 10,
    effects: { damage: 120, burn_damage: 20, burn_duration: 4 },
    learnCost: 300, upgradeCostBase: 150,
  },
  inferno: {
    id: 'inferno', name: '地狱烈火', type: 'fire', category: 'active',
    desc: '召唤地狱烈火，造成大量火系伤害',
    quality: 'blue', baseDamage: 300, manaCost: 60, cooldown: 8,
    unlockRealm: 3, unlockLevel: 20,
    effects: { damage: 300, burn_damage: 50, burn_duration: 5, aoe: 3 },
    learnCost: 1000, upgradeCostBase: 500,
  },
  sun_avatar: {
    id: 'sun_avatar', name: '大日金焰', type: 'fire', category: 'active',
    desc: '召唤大日金焰，毁灭性火系伤害',
    quality: 'purple', baseDamage: 800, manaCost: 120, cooldown: 15,
    unlockRealm: 5, unlockLevel: 50,
    effects: { damage: 800, burn_damage: 150, burn_duration: 6, true_damage: 0.2 },
    learnCost: 5000, upgradeCostBase: 2500,
  },
  primordial_fire: {
    id: 'primordial_fire', name: '原初之火', type: 'fire', category: 'active',
    desc: '原初之火，焚烧万物',
    quality: 'orange', baseDamage: 2000, manaCost: 200, cooldown: 20,
    unlockRealm: 7, unlockLevel: 80,
    effects: { damage: 2000, burn_damage: 400, burn_duration: 8, true_damage: 0.5 },
    learnCost: 20000, upgradeCostBase: 10000,
  },

  // ===== 冰系仙术 =====
  ice_shard: {
    id: 'ice_shard', name: '冰刺术', type: 'ice', category: 'active',
    desc: '凝聚冰刺攻击敌人',
    quality: 'white', baseDamage: 45, manaCost: 10, cooldown: 3,
    unlockRealm: 1, unlockLevel: 5,
    effects: { damage: 45, slow: 0.2, slow_duration: 2 },
    learnCost: 100, upgradeCostBase: 50,
  },
  blizzard: {
    id: 'blizzard', name: '暴风雪', type: 'ice', category: 'active',
    desc: '召唤暴风雪，范围冰系伤害',
    quality: 'blue', baseDamage: 280, manaCost: 55, cooldown: 8,
    unlockRealm: 3, unlockLevel: 20,
    effects: { damage: 280, slow: 0.4, slow_duration: 4, aoe: 3 },
    learnCost: 1000, upgradeCostBase: 500,
  },
  absolute_zero: {
    id: 'absolute_zero', name: '绝对零度', type: 'ice', category: 'active',
    desc: '冻结一切，附带冰封效果',
    quality: 'purple', baseDamage: 700, manaCost: 110, cooldown: 15,
    unlockRealm: 5, unlockLevel: 50,
    effects: { damage: 700, freeze: 1, slow: 0.6, slow_duration: 5 },
    learnCost: 5000, upgradeCostBase: 2500,
  },

  // ===== 雷系仙术 =====
  thunder_bolt: {
    id: 'thunder_bolt', name: '雷击术', type: 'thunder', category: 'active',
    desc: '引动天雷攻击敌人',
    quality: 'white', baseDamage: 55, manaCost: 12, cooldown: 3,
    unlockRealm: 1, unlockLevel: 5,
    effects: { damage: 55, stun: 0.5, stun_duration: 1 },
    learnCost: 120, upgradeCostBase: 60,
  },
  thunderstorm: {
    id: 'thunderstorm', name: '雷暴', type: 'thunder', category: 'active',
    desc: '召唤雷暴，范围雷系伤害',
    quality: 'blue', baseDamage: 320, manaCost: 65, cooldown: 8,
    unlockRealm: 3, unlockLevel: 20,
    effects: { damage: 320, stun: 1, stun_duration: 1.5, aoe: 3 },
    learnCost: 1200, upgradeCostBase: 600,
  },
  divine_thunder: {
    id: 'divine_thunder', name: '神霄雷法', type: 'thunder', category: 'active',
    desc: '神霄九雷，毁灭性雷系伤害',
    quality: 'purple', baseDamage: 900, manaCost: 130, cooldown: 15,
    unlockRealm: 5, unlockLevel: 50,
    effects: { damage: 900, stun: 2, crit_rate: 0.3, chain_count: 3 },
    learnCost: 6000, upgradeCostBase: 3000,
  },

  // ===== 风系仙术 =====
  wind_blade: {
    id: 'wind_blade', name: '风刃术', type: 'wind', category: 'active',
    desc: '凝聚风刃切割敌人',
    quality: 'white', baseDamage: 40, manaCost: 8, cooldown: 2,
    unlockRealm: 1, unlockLevel: 5,
    effects: { damage: 40, pierce: 1 },
    learnCost: 80, upgradeCostBase: 40,
  },
  typhoon: {
    id: 'typhoon', name: '台风术', type: 'wind', category: 'active',
    desc: '召唤台风，范围风系伤害',
    quality: 'blue', baseDamage: 260, manaCost: 50, cooldown: 7,
    unlockRealm: 3, unlockLevel: 20,
    effects: { damage: 260, knockback: 2, aoe: 4 },
    learnCost: 900, upgradeCostBase: 450,
  },

  // ===== 土系仙术 =====
  rock_shield: {
    id: 'rock_shield', name: '岩盾术', type: 'earth', category: 'active',
    desc: '召唤岩石护盾保护自己',
    quality: 'white', baseDamage: 0, manaCost: 15, cooldown: 10,
    unlockRealm: 1, unlockLevel: 5,
    effects: { shield: 100, shield_duration: 5 },
    learnCost: 100, upgradeCostBase: 50,
  },
  earthquake: {
    id: 'earthquake', name: '地震术', type: 'earth', category: 'active',
    desc: '引发地震，范围土系伤害',
    quality: 'blue', baseDamage: 300, manaCost: 60, cooldown: 10,
    unlockRealm: 3, unlockLevel: 20,
    effects: { damage: 300, stun: 1, stun_duration: 2, aoe: 3 },
    learnCost: 1100, upgradeCostBase: 550,
  },

  // ===== 光系仙术 =====
  holy_light: {
    id: 'holy_light', name: '圣光术', type: 'light', category: 'active',
    desc: '圣光治疗，恢复生命',
    quality: 'white', baseDamage: 0, manaCost: 15, cooldown: 5,
    unlockRealm: 1, unlockLevel: 5,
    effects: { heal: 80 },
    learnCost: 100, upgradeCostBase: 50,
  },
  divine_intervention: {
    id: 'divine_intervention', name: '神恩术', type: 'light', category: 'active',
    desc: '神圣干预，大量治疗并附加护盾',
    quality: 'purple', baseDamage: 0, manaCost: 100, cooldown: 20,
    unlockRealm: 5, unlockLevel: 50,
    effects: { heal: 1000, shield: 500, shield_duration: 10 },
    learnCost: 5000, upgradeCostBase: 2500,
  },

  // ===== 暗系仙术 =====
  shadow_strike: {
    id: 'shadow_strike', name: '暗影打击', type: 'dark', category: 'active',
    desc: '暗影突袭，必定暴击',
    quality: 'green', baseDamage: 100, manaCost: 20, cooldown: 4,
    unlockRealm: 2, unlockLevel: 10,
    effects: { damage: 100, crit_rate: 1.0, lifesteal: 0.3 },
    learnCost: 300, upgradeCostBase: 150,
  },
  curse_of_oblivion: {
    id: 'curse_of_oblivion', name: '遗忘诅咒', type: 'dark', category: 'active',
    desc: '诅咒敌人，降低其属性',
    quality: 'purple', baseDamage: 500, manaCost: 80, cooldown: 12,
    unlockRealm: 5, unlockLevel: 50,
    effects: { damage: 500, debuff_atk: 0.3, debuff_duration: 10 },
    learnCost: 4000, upgradeCostBase: 2000,
  },

  // ===== 纯阳仙术 =====
  void_slash: {
    id: 'void_slash', name: '虚空斩', type: 'pure', category: 'active',
    desc: '斩破虚空，无视防御',
    quality: 'green', baseDamage: 150, manaCost: 30, cooldown: 5,
    unlockRealm: 2, unlockLevel: 10,
    effects: { damage: 150, ignore_def: 0.5 },
    learnCost: 400, upgradeCostBase: 200,
  },
  transcendent_strike: {
    id: 'transcendent_strike', name: '超脱斩', type: 'pure', category: 'active',
    desc: '超脱一切，造成真实伤害',
    quality: 'purple', baseDamage: 600, manaCost: 90, cooldown: 10,
    unlockRealm: 5, unlockLevel: 50,
    effects: { damage: 600, true_damage: 1.0 },
    learnCost: 4500, upgradeCostBase: 2250,
  },
  taiji_smash: {
    id: 'taiji_smash', name: '太极崩天', type: 'pure', category: 'active',
    desc: '太极之力，粉碎乾坤',
    quality: 'orange', baseDamage: 3000, manaCost: 250, cooldown: 25,
    unlockRealm: 8, unlockLevel: 90,
    effects: { damage: 3000, true_damage: 0.8, aoe: 5, lifesteal: 0.5 },
    learnCost: 30000, upgradeCostBase: 15000,
  },

  // ===== 被动仙术 =====
  fire_aura: {
    id: 'fire_aura', name: '火焰光环', type: 'fire', category: 'passive',
    desc: '被动：火焰伤害+15%',
    quality: 'blue', manaCost: 0, cooldown: 0,
    unlockRealm: 3, unlockLevel: 20,
    effects: { passive_fire_damage: 0.15 },
    learnCost: 800, upgradeCostBase: 400,
  },
  ice_aura: {
    id: 'ice_aura', name: '寒冰光环', type: 'ice', category: 'passive',
    desc: '被动：冰冻减速效果+20%',
    quality: 'blue', manaCost: 0, cooldown: 0,
    unlockRealm: 3, unlockLevel: 20,
    effects: { passive_slow: 0.20 },
    learnCost: 800, upgradeCostBase: 400,
  },
  thunder_aura: {
    id: 'thunder_aura', name: '雷霆光环', type: 'thunder', category: 'passive',
    desc: '被动：雷系伤害+15%，暴击+5%',
    quality: 'blue', manaCost: 0, cooldown: 0,
    unlockRealm: 3, unlockLevel: 20,
    effects: { passive_thunder_damage: 0.15, passive_crit: 0.05 },
    learnCost: 1000, upgradeCostBase: 500,
  },
  mana_shield: {
    id: 'mana_shield', name: '法力护盾', type: 'pure', category: 'passive',
    desc: '被动：受到伤害时消耗法力抵消30%',
    quality: 'purple', manaCost: 0, cooldown: 0,
    unlockRealm: 4, unlockLevel: 40,
    effects: { damage_to_mana: 0.3 },
    learnCost: 3000, upgradeCostBase: 1500,
  },
  immortal_body: {
    id: 'immortal_body', name: '仙灵之体', type: 'pure', category: 'passive',
    desc: '被动：所有属性+20%，伤害减免+15%',
    quality: 'orange', manaCost: 0, cooldown: 0,
    unlockRealm: 7, unlockLevel: 80,
    effects: { all_attr: 0.2, damage_reduction: 0.15 },
    learnCost: 25000, upgradeCostBase: 12500,
  },
};

// ============================================================
// 数据库初始化
// ============================================================

function initArtTables() {
  const database = getDb();

  // 玩家已学仙术表
  database.exec(`
    CREATE TABLE IF NOT EXISTS player_immortal_arts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      art_id TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      proficiency INTEGER DEFAULT 0,
      equipped BOOLEAN DEFAULT 0,
      learned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(player_id, art_id)
    )
  `);

  // 仙术熟练度每日记录（用于统计）
  database.exec(`
    CREATE TABLE IF NOT EXISTS art_proficiency_daily (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      art_id TEXT NOT NULL,
      date TEXT NOT NULL,
      proficiency_gain INTEGER DEFAULT 0,
      use_count INTEGER DEFAULT 0,
      UNIQUE(player_id, art_id, date)
    )
  `);
}

// ============================================================
// 仙术效果计算公式
// ============================================================

/**
 * 计算仙术伤害
 * @param {string} artId - 仙术ID
 * @param {number} artLevel - 仙术等级
 * @param {object} caster - 施法者属性 {atk, crit_rate, crit_damage, ...}
 * @param {object} target - 目标属性 {def, ...}
 * @returns {object} 伤害结果
 */
function calcArtDamage(artId, artLevel, caster, target = {}) {
  const art = ART_TEMPLATES[artId];
  if (!art) return { damage: 0 };

  const quality = ART_QUALITIES[art.quality] || ART_QUALITIES.white;
  const levelBonus = 1 + (artLevel - 1) * 0.15; // 每级+15%效果

  // 基础伤害 = 仙术基础伤害 × 品质倍率 × 等级加成 × (1 + 攻击/1000)
  const casterAtk = caster.atk || 100;
  const baseDamage = art.baseDamage * quality.multiplier * levelBonus;
  const atkScaling = 1 + casterAtk / 1000;
  let damage = Math.floor(baseDamage * atkScaling);

  // 防御减免
  const targetDef = target.def || 0;
  const ignoreDef = art.effects.ignore_def || 0;
  const effectiveDef = targetDef * (1 - ignoreDef);
  damage = Math.max(1, Math.floor(damage - effectiveDef));

  // 真实伤害
  if (art.effects.true_damage) {
    const trueDamage = Math.floor(damage * art.effects.true_damage);
    damage += trueDamage;
  }

  // 暴击
  const critRate = (caster.crit_rate || 0) + (art.effects.crit_rate || 0);
  const isCrit = Math.random() < critRate;
  if (isCrit) {
    const critDmg = caster.crit_damage || 1.5;
    damage = Math.floor(damage * critDmg);
  }

  // AOE伤害衰减
  const aoeCount = art.effects.aoe || 1;
  if (aoeCount > 1) {
    damage = Math.floor(damage * 0.7); // 范围伤害衰减30%
  }

  const result = {
    damage,
    isCrit,
    aoeCount,
    effects: {},
  };

  // 附加效果
  if (art.effects.burn_damage) {
    result.effects.burn = {
      damage: Math.floor(art.effects.burn_damage * quality.multiplier * levelBonus * (1 + casterAtk / 2000)),
      duration: art.effects.burn_duration,
    };
  }

  if (art.effects.slow) {
    result.effects.slow = {
      rate: art.effects.slow * levelBonus,
      duration: art.effects.slow_duration,
    };
  }

  if (art.effects.stun) {
    result.effects.stun = {
      duration: art.effects.stun * levelBonus,
    };
  }

  if (art.effects.heal) {
    result.effects.heal = Math.floor(art.effects.heal * quality.multiplier * levelBonus * (1 + casterAtk / 1500));
  }

  if (art.effects.shield) {
    result.effects.shield = Math.floor(art.effects.shield * quality.multiplier * levelBonus);
  }

  if (art.effects.freeze) {
    result.effects.freeze = { duration: art.effects.freeze };
  }

  if (art.effects.lifesteal) {
    result.effects.lifesteal = art.effects.lifesteal * levelBonus;
  }

  if (art.effects.debuff_atk) {
    result.effects.debuff = {
      atkReduction: art.effects.debuff_atk,
      duration: art.effects.debuff_duration,
    };
  }

  return result;
}

/**
 * 计算仙术治疗量
 */
function calcArtHealing(artId, artLevel, caster) {
  const art = ART_TEMPLATES[artId];
  if (!art || !art.effects.heal) return 0;

  const quality = ART_QUALITIES[art.quality] || ART_QUALITIES.white;
  const levelBonus = 1 + (artLevel - 1) * 0.15;
  const casterAtk = caster.atk || 100;

  return Math.floor(art.effects.heal * quality.multiplier * levelBonus * (1 + casterAtk / 1500));
}

/**
 * 获取升级所需灵石
 */
function getUpgradeCost(artId, currentLevel) {
  const art = ART_TEMPLATES[artId];
  if (!art) return 0;
  return Math.floor(art.upgradeCostBase * Math.pow(1.5, currentLevel - 1));
}

/**
 * 获取升级所需熟练度
 */
function getProficiencyRequired(artId, currentLevel) {
  const art = ART_TEMPLATES[artId];
  if (!art) return 0;
  return Math.floor(art.upgradeCostBase * 10 * Math.pow(1.5, currentLevel - 1));
}

// ============================================================
// 仙术 CRUD
// ============================================================

/**
 * 学习仙术
 */
function learnArt(playerId, artId, realmLevel, playerLevel) {
  const database = getDb();
  const art = ART_TEMPLATES[artId];
  if (!art) return { success: false, message: '仙术不存在' };

  // 检查境界要求
  if (realmLevel < art.unlockRealm) {
    return { success: false, message: `需要境界 ${art.unlockRealm} 才能学习此仙术` };
  }
  if (playerLevel < art.unlockLevel) {
    return { success: false, message: `需要人物等级 ${art.unlockLevel} 才能学习此仙术` };
  }

  // 检查是否已学习
  const existing = database.prepare(
    'SELECT id FROM player_immortal_arts WHERE player_id = ? AND art_id = ?'
  ).get(playerId, artId);
  if (existing) return { success: false, message: '已学习此仙术' };

  // 检查灵石
  const player = database.prepare('SELECT spirit_stones FROM player WHERE id = ?').get(playerId);
  if (!player || player.spirit_stones < art.learnCost) {
    return { success: false, message: `需要 ${art.learnCost} 灵石` };
  }

  // 扣除灵石
  database.prepare('UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?')
    .run(art.learnCost, playerId);

  // 添加仙术
  database.prepare(
    'INSERT INTO player_immortal_arts (player_id, art_id, level, proficiency, equipped) VALUES (?, ?, 1, 0, 0)'
  ).run(playerId, artId);

  return { success: true, message: `学会 ${art.name}！`, art };
}

/**
 * 升级仙术（通过灵石）
 */
function upgradeArt(playerId, artId) {
  const database = getDb();

  const record = database.prepare(
    'SELECT * FROM player_immortal_arts WHERE player_id = ? AND art_id = ?'
  ).get(playerId, artId);
  if (!record) return { success: false, message: '未学习此仙术' };

  if (record.level >= 10) return { success: false, message: '仙术已达最高级' };

  const art = ART_TEMPLATES[artId];
  if (!art) return { success: false, message: '仙术不存在' };

  const cost = getUpgradeCost(artId, record.level);
  const player = database.prepare('SELECT spirit_stones FROM player WHERE id = ?').get(playerId);
  if (!player || player.spirit_stones < cost) {
    return { success: false, message: `需要 ${cost} 灵石` };
  }

  database.prepare('UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?').run(cost, playerId);
  database.prepare('UPDATE player_immortal_arts SET level = level + 1 WHERE player_id = ? AND art_id = ?')
    .run(playerId, artId);

  return {
    success: true,
    newLevel: record.level + 1,
    cost,
    message: `${art.name} 升级到 ${record.level + 1} 级！`,
  };
}

/**
 * 增加仙术熟练度（战斗使用后调用）
 */
function addProficiency(playerId, artId, amount = 1) {
  const database = getDb();
  const today = new Date().toISOString().slice(0, 10);

  // 更新熟练度
  database.prepare(
    'UPDATE player_immortal_arts SET proficiency = proficiency + ? WHERE player_id = ? AND art_id = ?'
  ).run(amount, playerId, artId);

  // 记录每日
  database.prepare(`
    INSERT INTO art_proficiency_daily (player_id, art_id, date, proficiency_gain, use_count)
    VALUES (?, ?, ?, ?, 1)
    ON CONFLICT(player_id, art_id, date) DO UPDATE SET
    proficiency_gain = proficiency_gain + ?, use_count = use_count + 1
  `).run(playerId, artId, today, amount, amount);

  // 检查是否可以自动升级
  const record = database.prepare(
    'SELECT * FROM player_immortal_arts WHERE player_id = ? AND art_id = ?'
  ).get(playerId, artId);
  if (record && record.level < 10) {
    const required = getProficiencyRequired(artId, record.level);
    if (record.proficiency >= required) {
      database.prepare('UPDATE player_immortal_arts SET level = level + 1, proficiency = proficiency - ? WHERE player_id = ? AND art_id = ?')
        .run(required, playerId, artId);
      return { leveledUp: true, newLevel: record.level + 1 };
    }
  }

  return { leveledUp: false };
}

/**
 * 装备/卸下仙术
 */
function equipArt(playerId, artId, equipped) {
  const database = getDb();
  database.prepare('UPDATE player_immortal_arts SET equipped = ? WHERE player_id = ? AND art_id = ?')
    .run(equipped ? 1 : 0, playerId, artId);
  return { success: true };
}

/**
 * 获取玩家仙术列表
 */
function getPlayerArts(playerId) {
  const database = getDb();
  const records = database.prepare(
    'SELECT art_id, level, proficiency, equipped, learned_at FROM player_immortal_arts WHERE player_id = ?'
  ).all(playerId);

  return records.map(r => {
    const art = ART_TEMPLATES[r.art_id];
    if (!art) return null;
    return {
      ...art,
      level: r.level,
      proficiency: r.proficiency,
      equipped: !!r.equipped,
      learnedAt: r.learned_at,
      upgradeCost: getUpgradeCost(r.art_id, r.level),
      proficiencyRequired: getProficiencyRequired(r.art_id, r.level),
      canUpgrade: r.level < 10,
    };
  }).filter(Boolean);
}

/**
 * 获取已装备仙术
 */
function getEquippedArts(playerId) {
  const database = getDb();
  const records = database.prepare(
    'SELECT art_id, level, proficiency FROM player_immortal_arts WHERE player_id = ? AND equipped = 1'
  ).all(playerId);

  return records.map(r => {
    const art = ART_TEMPLATES[r.art_id];
    if (!art) return null;
    return { ...art, level: r.level, proficiency: r.proficiency };
  }).filter(Boolean);
}

/**
 * 获取可学习的仙术列表
 */
function getAvailableArts(realmLevel, playerLevel, playerId) {
  const database = getDb();
  const learned = database.prepare(
    'SELECT art_id FROM player_immortal_arts WHERE player_id = ?'
  ).all(playerId);
  const learnedIds = new Set(learned.map(l => l.art_id));

  return Object.values(ART_TEMPLATES)
    .filter(art => !learnedIds.has(art.id))
    .filter(art => realmLevel >= art.unlockRealm && playerLevel >= art.unlockLevel)
    .map(art => ({
      id: art.id,
      name: art.name,
      type: art.type,
      typeName: ART_TYPES[art.type]?.name || art.type,
      typeIcon: ART_TYPES[art.type]?.icon || '',
      category: art.category,
      quality: art.quality,
      qualityName: ART_QUALITIES[art.quality]?.name || art.quality,
      desc: art.desc,
      baseDamage: art.baseDamage,
      manaCost: art.manaCost,
      cooldown: art.cooldown,
      effects: art.effects,
      unlockRealm: art.unlockRealm,
      unlockLevel: art.unlockLevel,
      learnCost: art.learnCost,
      canLearn: realmLevel >= art.unlockRealm && playerLevel >= art.unlockLevel,
    }));
}

/**
 * 获取仙术详情
 */
function getArtInfo(artId) {
  const art = ART_TEMPLATES[artId];
  if (!art) return null;

  const quality = ART_QUALITIES[art.quality];
  const type = ART_TYPES[art.type];

  return {
    ...art,
    qualityName: quality?.name || art.quality,
    qualityColor: quality?.color || '#9E9E9E',
    typeName: type?.name || art.type,
    typeIcon: type?.icon || '',
    typeColor: type?.color || '#9E9E9E',
  };
}

/**
 * 获取仙术分类列表
 */
function getArtCategories() {
  return Object.entries(ART_TYPES).map(([key, val]) => ({
    id: key,
    ...val,
    arts: Object.values(ART_TEMPLATES).filter(a => a.type === key).map(a => ({
      id: a.id,
      name: a.name,
      quality: a.quality,
      category: a.category,
      unlockRealm: a.unlockRealm,
      unlockLevel: a.unlockLevel,
    })),
  }));
}

// ============================================================
// 导出
// ============================================================

module.exports = {
  initArtTables,
  getDb,
  ART_TYPES,
  ART_QUALITIES,
  REALM_ART_LEVEL,
  ART_TEMPLATES,
  calcArtDamage,
  calcArtHealing,
  getUpgradeCost,
  getProficiencyRequired,
  learnArt,
  upgradeArt,
  addProficiency,
  equipArt,
  getPlayerArts,
  getEquippedArts,
  getAvailableArts,
  getArtInfo,
  getArtCategories,
};
