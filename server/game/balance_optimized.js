/**
 * 挂机修仙 - 数值平衡系统 v3.1 (优化版)
 * 
 * 优化策略：
 * 1. 属性加成系统分离：基础 + 固定加成 + 百分比加成
 * 2. 百分比加成硬上限：最多300%
 * 3. 防止数值溢出
 */

// ==================== 硬上限（绝对上限）====================
const HARD_CAP = {
  ATK: 4.0,    // 攻击最多400%
  DEF: 4.0,    // 防御最多400%
  HP: 5.0,     // 生命最多500%
  SPIRIT_RATE: 5.0,  // 灵气速率最多500%
  REALM_BONUS: 10.0  // 境界加成最高10倍
};

// ==================== 软上限（转化为道韵）====================
const SOFT_CAP = {
  ATK: 3.0,    // 攻击300%后转化为道韵
  DEF: 3.0,    // 防御300%后转化为道韵
  HP: 4.0,     // 生命400%后转化为道韵
  SPIRIT_RATE: 4.0,  // 灵气速率400%后转化为道韵
  REALM_BONUS: 15.0  // 境界加成15倍后转化为道韵
};

// 道韵系统
constDaoYun = {
  name: '道韵',
  description: '超越软上限后获得的特殊货币',
  usage: '用于特殊养成：器灵进阶、境界突破、秘宝强化'
};

function calculateOverflowBonus(percentBonus, softCap, hardCap) {
  if (percentBonus <= softCap) {
    return { effective: percentBonus, overflow: 0, daoyun: 0 };
  }
  
  const overflow = Math.min(percentBonus, hardCap) - softCap;
  const daoyun = Math.floor(overflow * 100); // 每1%溢出转化为100道韵
  
  return {
    effective: softCap + overflow,
    overflow: overflow,
    daoyun: daoyun
  };
}

// 加成类型
const BonusType = {
  FLAT: 'flat',      // 固定加成（加法）
  PERCENT: 'percent' // 百分比加成（乘法）
};

/**
 * 计算玩家属性 - 优化版
 * @param {Object} player - 玩家数据
 * @returns {Object} - 包含 atk, def, hp, maxSpirit, spiritRate
 */
function calculatePlayerStatsOptimized(player) {
  const realm = player.realm || '凡人-前期-1阶';
  const level = player.level || 1;
  
  // 获取境界基础属性
  const REALM_DATA = require('./realm_data_optimized.js');
  const realmData = REALM_DATA.REALM_DATA_V3_OPTIMIZED[realm] || REALM_DATA.REALM_DATA_V3_OPTIMIZED['凡人-前期-1阶'];
  
  // 1. 基础属性 = 境界基础 + 等级成长
  const levelGrowth = level * 2;
  let baseAtk = realmData.atk_base + levelGrowth;
  let baseDef = realmData.def_base + levelGrowth;
  let baseHp = realmData.hp_base + levelGrowth * 10;
  let baseSpirit = realmData.spirit_base;
  let baseSpiritRate = realmData.spirit_rate;
  
  // 2. 收集所有固定加成（加法）
  const flatBonuses = {
    atk: 0,
    def: 0,
    hp: 0,
    spirit: 0,
    spiritRate: 0
  };
  
  // 装备固定加成
  if (player.equipment) {
    for (const slot of ['weapon', 'armor', 'accessory']) {
      const equip = player.equipment[slot];
      if (equip && equip.atk) flatBonuses.atk += equip.atk;
      if (equip && equip.def) flatBonuses.def += equip.def;
      if (equip && equip.hp) flatBonuses.hp += equip.hp;
    }
  }
  
  // 灵根固定加成
  if (player.spiritRoot) {
    const ROOT_BONUS = {
      '天灵根': { atk: 50, def: 30, hp: 500 },
      '地灵根': { atk: 40, def: 40, hp: 400 },
      '水灵根': { atk: 30, def: 50, hp: 600 },
      '火灵根': { atk: 60, def: 20, hp: 300 },
      '土灵根': { atk: 30, def: 60, hp: 500 }
    };
    const rootBonus = ROOT_BONUS[player.spiritRoot] || { atk: 0, def: 0, hp: 0 };
    flatBonuses.atk += rootBonus.atk;
    flatBonuses.def += rootBonus.def;
    flatBonuses.hp += rootBonus.hp;
  }
  
  // 3. 收集所有百分比加成（乘法）
  let percentMultipliers = {
    atk: 1.0,
    def: 1.0,
    hp: realmData.realm_bonus || 1.0,  // 境界加成作为基础
    spiritRate: 1.0
  };
  
  // 功法百分比加成
  if (player.techniques) {
    for (const tech of player.techniques) {
      if (tech && tech.bonus) {
        if (tech.bonus.atk) percentMultipliers.atk *= (1 + tech.bonus.atk);
        if (tech.bonus.def) percentMultipliers.def *= (1 + tech.bonus.def);
        if (tech.bonus.hp) percentMultipliers.hp *= (1 + tech.bonus.hp);
      }
    }
  }
  
  // 洞府百分比加成
  if (player.cave && player.cave.buildings) {
    const caveLevel = player.cave.buildings.jilingzhen?.level || 0;
    const caveBonus = 1 + caveLevel * 0.05;  // 每级5%
    percentMultipliers.spiritRate *= caveBonus;
    percentMultipliers.atk *= caveBonus;
  }
  
  // 灵兽百分比加成
  if (player.beasts) {
    for (const beast of player.beasts) {
      if (beast && beast.quality) {
        const QUALITY_BONUS = {
          'common': 1.05,
          'uncommon': 1.10,
          'rare': 1.15,
          'epic': 1.25,
          'legendary': 1.35,
          'mythical': 1.50
        };
        const beastBonus = QUALITY_BONUS[beast.quality] || 1.0;
        percentMultipliers.atk *= beastBonus;
        percentMultipliers.hp *= beastBonus;
      }
    }
  }
  
  // 4. 应用硬上限
  percentMultipliers.atk = Math.min(percentMultipliers.atk, BONUS_CAP.ATK);
  percentMultipliers.def = Math.min(percentMultipliers.def, BONUS_CAP.DEF);
  percentMultipliers.hp = Math.min(percentMultipliers.hp, BONUS_CAP.HP);
  percentMultipliers.spiritRate = Math.min(percentMultipliers.spiritRate, BONUS_CAP.SPIRIT_RATE);
  
  // 5. 计算最终属性
  const finalAtk = Math.floor((baseAtk + flatBonuses.atk) * percentMultipliers.atk);
  const finalDef = Math.floor((baseDef + flatBonuses.def) * percentMultipliers.def);
  const finalHp = Math.floor((baseHp + flatBonuses.hp) * percentMultipliers.hp);
  const finalSpirit = baseSpirit + flatBonuses.spirit;
  const finalSpiritRate = Math.floor((baseSpiritRate + flatBonuses.spiritRate) * percentMultipliers.spiritRate);
  
  return {
    atk: finalAtk,
    def: finalDef,
    hp: finalHp,
    maxSpirit: finalSpirit,
    spiritRate: finalSpiritRate,
    // 调试信息
    _debug: {
      base: { atk: baseAtk, def: baseDef, hp: baseHp },
      flat: flatBonuses,
      percent: percentMultipliers
    }
  };
}

/**
 * 计算境界副本敌人属性 - 动态难度
 * @param {number} floor - 副本层数
 * @param {Object} playerStats - 玩家属性
 * @returns {Object} - 敌人属性
 */
function calculateDungeonEnemyStats(floor, playerStats) {
  // 基础倍率：每层增加20%
  const baseMultiplier = Math.pow(1.15, floor - 1);
  
  // HP比例：最多8倍玩家HP
  const hpRatio = Math.min(1 + floor * 0.5, 8);
  
  // 攻击比例：最多4倍玩家攻击
  const atkRatio = Math.min(1 + floor * 0.3, 4);
  
  // 防御比例：玩家防御的30%
  const defRatio = 0.3;
  
  return {
    hp: Math.floor(playerStats.hp * hpRatio),
    atk: Math.floor(playerStats.atk * atkRatio),
    def: Math.floor(playerStats.def * defRatio),
    // 掉落奖励（基于玩家属性）
    reward: {
      spirit: Math.floor(playerStats.spiritRate * 60 * floor),  // 每分钟基础收益 × 层数
      exp: Math.floor(100 * baseMultiplier)
    }
  };
}

/**
 * 扫荡境界副本
 * @param {string} realmId - 境界ID
 * @param {number} highestFloor - 历史最高层数
 * @param {Object} playerStats - 玩家属性
 * @returns {Object} - 扫荡奖励
 */
function sweepRealmDungeon(realmId, highestFloor, playerStats) {
  if (highestFloor <= 0) {
    return { success: false, message: '尚未通关任何关卡' };
  }
  
  // 扫荡获得80%奖励
  const sweepMultiplier = 0.8;
  
  let totalSpirit = 0;
  let totalExp = 0;
  
  for (let floor = 1; floor <= highestFloor; floor++) {
    const enemyStats = calculateDungeonEnemyStats(floor, playerStats);
    totalSpirit += Math.floor(enemyStats.reward.spirit * sweepMultiplier);
    totalExp += Math.floor(enemyStats.reward.exp * sweepMultiplier);
  }
  
  return {
    success: true,
    floor: highestFloor,
    reward: {
      spirit: totalSpirit,
      exp: totalExp
    }
  };
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    BONUS_CAP,
    BonusType,
    calculatePlayerStatsOptimized,
    calculateDungeonEnemyStats,
    sweepRealmDungeon
  };
}
