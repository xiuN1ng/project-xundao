/**
 * 挂机修仙 - 战力评分系统 v1.0
 * 综合计算玩家战力：基础属性 + 装备 + 境界 + 爵位 + 灵兽 + 功法
 */

// 境界战力系数
const REALM_POWER_MULTIPLIER = {
  0: 1.0,   // 凡人
  1: 1.5,   // 练气期
  2: 2.5,   // 筑基期
  3: 4.0,   // 金丹期
  4: 6.0,   // 元婴期
  5: 8.5,   // 化神期
  6: 12.0,  // 炼虚期
  7: 16.0,  // 合体期
  8: 22.0,  // 大乘期
  9: 30.0,  // 渡劫期
  10: 50.0  // 仙人
};

// 装备品质系数
const EQUIPMENT_QUALITY_MULTIPLIER = {
  1: 1.0,   // 白色
  2: 1.5,   // 绿色
  3: 2.5,   // 蓝色
  4: 4.0,   // 紫色
  5: 6.0,   // 橙色
  6: 10.0   // 红色
};

// 灵兽品质系数
const BEAST_QUALITY_POWER = {
  common: 10,
  uncommon: 30,
  rare: 80,
  epic: 200,
  legendary: 500,
  mythical: 1500
};

// 功法槽位战力贡献
const GONFA_SLOT_POWER = {
  cultivation: 0.3,   // 修炼功法
  combat: 0.4,        // 战斗功法
  defense: 0.3,       // 防御功法
  auxiliary: 0.2      // 辅助功法
};

/**
 * 计算装备战力
 * @param {Object} equipment - 装备对象 {weapon, armor, accessory}
 * @param {Object} EQUIPMENT_DATA - 装备数据
 * @returns {Object} {total, weapon, armor, accessory, details}
 */
function calculateEquipmentPower(equipment, EQUIPMENT_DATA) {
  const result = { total: 0, weapon: 0, armor: 0, accessory: 0, details: [] };
  
  const slots = ['weapon', 'armor', 'accessory'];
  
  for (const slot of slots) {
    const equipKey = equipment[slot];
    if (equipKey && EQUIPMENT_DATA[slot] && EQUIPMENT_DATA[slot][equipKey]) {
      const equip = EQUIPMENT_DATA[slot][equipKey];
      const rarity = equip.rarity || 1;
      const qualityMult = EQUIPMENT_QUALITY_MULTIPLIER[rarity] || 1.0;
      
      // 装备基础战力 = (攻击 + 防御) * 品质系数
      const basePower = (equip.atk || 0) + (equip.def || 0);
      const slotPower = Math.floor(basePower * qualityMult);
      
      result[slot] = slotPower;
      result.total += slotPower;
      result.details.push({
        slot,
        name: equipKey,
        atk: equip.atk || 0,
        def: equip.def || 0,
        rarity,
        power: slotPower
      });
    }
  }
  
  return result;
}

/**
 * 计算境界战力
 * @param {number} realmLevel - 境界等级
 * @param {number} realmRealmLevel - 境界等级(实际境界)
 * @returns {Object} {base, multiplier, total, details}
 */
function calculateRealmPower(realmLevel, realmRealmLevel = 0) {
  const level = realmRealmLevel || realmLevel || 0;
  const multiplier = REALM_POWER_MULTIPLIER[level] || 1.0;
  
  // 基础境界战力 = 境界等级^2 * 100
  const basePower = Math.pow(level, 2) * 100;
  const totalPower = Math.floor(basePower * multiplier);
  
  return {
    base: basePower,
    multiplier,
    level,
    total: totalPower,
    realmName: getRealmName(level)
  };
}

/**
 * 获取境界名称
 */
function getRealmName(level) {
  const names = ['凡人', '练气期', '筑基期', '金丹期', '元婴期', '化神期', '炼虚期', '合体期', '大乘期', '渡劫期', '仙人'];
  return names[level] || '凡人';
}

/**
 * 计算爵位战力
 * @param {number} rankId - 爵位等级
 * @param {Object} RANK_DATA - 爵位数据
 * @returns {Object} {base, bonus, total, details}
 */
function calculateRankPower(rankId, RANK_DATA) {
  const rank = RANK_DATA[rankId] || RANK_DATA[0];
  
  // 爵位战力 = 基础战力 + 属性战力
  const basePower = rankId * 200;  // 每级200基础
  const bonusPower = (rank.bonus?.atk || 0) * 10 + 
                    (rank.bonus?.def || 0) * 10 + 
                    (rank.bonus?.hp || 0) * 0.5;
  
  const totalPower = Math.floor(basePower + bonusPower);
  
  return {
    base: basePower,
    bonus: bonusPower,
    level: rankId,
    total: totalPower,
    name: rank?.name || '凡人',
    title: rank?.title || '凡夫俗子'
  };
}

/**
 * 计算灵兽战力
 * @param {Array} beasts - 灵兽数组
 * @param {Object} BEAST_DATA - 灵兽数据
 * @returns {Object} {total, count, details}
 */
function calculateBeastPower(beasts, BEAST_DATA) {
  let total = 0;
  const details = [];
  
  if (!beasts || beasts.length === 0) {
    return { total: 0, count: 0, details: [] };
  }
  
  for (const beast of beasts) {
    const beastData = BEAST_DATA[beast.id];
    if (!beastData) continue;
    
    const qualityPower = BEAST_QUALITY_POWER[beastData.quality] || 10;
    const levelBonus = (beast.level || 1) * 5;
    const affectionBonus = Math.floor((beast.affection || 50) * 0.5);
    
    const beastPower = qualityPower + levelBonus + affectionBonus;
    total += beastPower;
    
    details.push({
      id: beast.id,
      name: beastData.name,
      level: beast.level || 1,
      quality: beastData.quality,
      power: beastPower
    });
  }
  
  return { total, count: beasts.length, details };
}

/**
 * 计算功法战力
 * @param {Object} equippedGongfa - 已装备功法 {cultivation, combat, defense, auxiliary}
 * @param {Object} GONFA_DATA - 功法数据
 * @returns {Object} {total, slots, details}
 */
function calculateGongfaPower(equippedGongfa, GONFA_DATA) {
  let total = 0;
  const details = [];
  const slots = {};
  
  if (!equippedGongfa) {
    return { total: 0, slots: {}, details: [] };
  }
  
  for (const [slot, gongfaId] of Object.entries(equippedGongfa)) {
    if (!gongfaId || !GONFA_DATA[slot] || !GONFA_DATA[slot].effects[gongfaId]) {
      slots[slot] = 0;
      continue;
    }
    
    const gongfa = GONFA_DATA[slot].effects[gongfaId];
    const slotMult = GONFA_SLOT_POWER[slot] || 0.2;
    
    // 功法战力基于其加成效果
    let bonusValue = 0;
    if (gongfa.spirit_bonus) bonusValue += (gongfa.spirit_bonus - 1) * 50;
    if (gongfa.atk_bonus) bonusValue += (gongfa.atk_bonus - 1) * 30;
    if (gongfa.def_bonus) bonusValue += (gongfa.def_bonus - 1) * 30;
    if (gongfa.exp_bonus) bonusValue += (gongfa.exp_bonus - 1) * 20;
    if (gongfa.stone_bonus) bonusValue += (gongfa.stone_bonus - 1) * 15;
    
    const slotPower = Math.floor(bonusValue * slotMult * 10);
    slots[slot] = slotPower;
    total += slotPower;
    
    details.push({
      slot,
      name: gongfa.name,
      power: slotPower,
      bonuses: {
        spirit: gongfa.spirit_bonus || 1,
        atk: gongfa.atk_bonus || 1,
        def: gongfa.def_bonus || 1,
        exp: gongfa.exp_bonus || 1,
        stone: gongfa.stone_bonus || 1
      }
    });
  }
  
  return { total, slots, details };
}

/**
 * 计算基础属性战力
 * @param {Object} stats - 玩家属性 {hp, atk, def, maxHp, maxSpirit, spiritRate}
 * @returns {Object} {hp, atk, def, spiritRate, total, details}
 */
function calculateBaseStatsPower(stats) {
  // 基础战力公式: 生命*0.1 + 攻击*2 + 防御*1.5 + 灵气速率*5
  const hpPower = Math.floor((stats.maxHp || stats.hp || 0) * 0.1);
  const atkPower = Math.floor((stats.atk || 0) * 2);
  const defPower = Math.floor((stats.def || 0) * 1.5);
  const spiritPower = Math.floor((stats.spiritRate || stats.maxSpirit || 0) * 5);
  
  const total = hpPower + atkPower + defPower + spiritPower;
  
  return {
    hp: hpPower,
    atk: atkPower,
    def: defPower,
    spiritRate: spiritPower,
    total,
    details: {
      hp: { value: stats.maxHp || stats.hp || 0, contribution: hpPower },
      atk: { value: stats.atk || 0, contribution: atkPower },
      def: { value: stats.def || 0, contribution: defPower },
      spiritRate: { value: stats.spiritRate || stats.maxSpirit || 0, contribution: spiritPower }
    }
  };
}

/**
 * 综合计算玩家战力
 * @param {Object} playerData - 玩家完整数据
 * @param {Object} options - 配置选项
 * @returns {Object} 战力详细数据
 */
function calculateCombatPower(playerData, options = {}) {
  const {
    EQUIPMENT_DATA: equipData = {},
    REALM_DATA: realmData = {},
    RANK_DATA: rankData = {},
    BEAST_DATA: beastData = {},
    TECHNIQUE_DATA: gongfaData = {}
  } = options;
  
  const result = {
    total: 0,
    breakdown: {},
    details: {}
  };
  
  // 1. 基础属性战力
  const baseStats = {
    hp: playerData.hp || 100,
    maxHp: playerData.maxHp || 100,
    atk: playerData.atk || 10,
    def: playerData.def || 0,
    spiritRate: playerData.spiritRate || 1,
    maxSpirit: playerData.maxSpirit || 10
  };
  const baseStatsPower = calculateBaseStatsPower(baseStats);
  result.breakdown.baseStats = baseStatsPower.total;
  result.details.baseStats = baseStatsPower;
  result.total += baseStatsPower.total;
  
  // 2. 装备战力
  const equipmentPower = calculateEquipmentPower(
    playerData.equipment || {},
    equipData
  );
  result.breakdown.equipment = equipmentPower.total;
  result.details.equipment = equipmentPower;
  result.total += equipmentPower.total;
  
  // 3. 境界战力
  const realmPower = calculateRealmPower(
    playerData.realmLevel || 0,
    playerData.realmRealmLevel
  );
  result.breakdown.realm = realmPower.total;
  result.details.realm = realmPower;
  result.total += realmPower.total;
  
  // 4. 爵位战力
  const rankPower = calculateRankPower(playerData.rankId || 0, rankData);
  result.breakdown.rank = rankPower.total;
  result.details.rank = rankPower;
  result.total += rankPower.total;
  
  // 5. 灵兽战力
  const beastPower = calculateBeastPower(playerData.beasts || [], beastData);
  result.breakdown.beast = beastPower.total;
  result.details.beast = beastPower;
  result.total += beastPower.total;
  
  // 6. 功法战力
  const gongfaPower = calculateGongfaPower(playerData.equippedGongfa || {}, gongfaData);
  result.breakdown.gongfa = gongfaPower.total;
  result.details.gongfa = gongfaPower;
  result.total += gongfaPower.total;
  
  // 最终战力取整
  result.total = Math.floor(result.total);
  
  return result;
}

/**
 * 快速获取战力数值（不包含详细信息）
 * @param {Object} playerData - 玩家数据
 * @param {Object} options - 配置选项
 * @returns {number} 战力数值
 */
function getQuickCombatPower(playerData, options = {}) {
  const result = calculateCombatPower(playerData, options);
  return result.total;
}

// 导出函数
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateCombatPower,
    getQuickCombatPower,
    calculateEquipmentPower,
    calculateRealmPower,
    calculateRankPower,
    calculateBeastPower,
    calculateGongfaPower,
    calculateBaseStatsPower,
    REALM_POWER_MULTIPLIER,
    EQUIPMENT_QUALITY_MULTIPLIER,
    BEAST_QUALITY_POWER,
    GONFA_SLOT_POWER
  };
}

// 浏览器环境
if (typeof window !== 'undefined') {
  window.CombatPowerSystem = {
    calculateCombatPower,
    getQuickCombatPower,
    calculateEquipmentPower,
    calculateRealmPower,
    calculateRankPower,
    calculateBeastPower,
    calculateGongfaPower,
    calculateBaseStatsPower,
    REALM_POWER_MULTIPLIER,
    EQUIPMENT_QUALITY_MULTIPLIER,
    BEAST_QUALITY_POWER,
    GONFA_SLOT_POWER
  };
}
