/**
 * 境界压制系统 - 后端逻辑
 * 当玩家A挑战玩家B时，如果A境界高于B，A获得属性加成
 * 
 * 境界体系：凡人 → 练气(1-3层) → 筑基(1-3层) → 金丹(1-3层) → 元婴(1-3层) → 化神(1-3层) → 渡劫(1-3层) → 仙人 → 天仙 → 金仙 → 大罗金仙 → 准圣 → 圣人 → 天道
 */

// ==================== 完整境界体系 ====================
// 每个境界包含：id(唯一标识), name(显示名称), order(境界顺序), levels(层数范围), isPeak(是否大圆满)
const REALM_HIERARCHY = {
  // 凡人和初始境界
  '凡人': { order: 0, name: '凡人', levels: [0], isPeak: 0, displayName: '凡人' },
  '练气': { order: 1, name: '练气', levels: [1, 2, 3], isPeak: 3, displayName: '练气期' },
  '筑基': { order: 2, name: '筑基', levels: [1, 2, 3], isPeak: 3, displayName: '筑基期' },
  '金丹': { order: 3, name: '金丹', levels: [1, 2, 3], isPeak: 3, displayName: '金丹期' },
  '元婴': { order: 4, name: '元婴', levels: [1, 2, 3], isPeak: 3, displayName: '元婴期' },
  '化神': { order: 5, name: '化神', levels: [1, 2, 3], isPeak: 3, displayName: '化神期' },
  '炼虚': { order: 6, name: '炼虚', levels: [1, 2, 3], isPeak: 3, displayName: '炼虚期' },
  '合体': { order: 7, name: '合体', levels: [1, 2, 3], isPeak: 3, displayName: '合体期' },
  '大乘': { order: 8, name: '大乘', levels: [1, 2, 3], isPeak: 3, displayName: '大乘期' },
  '渡劫': { order: 9, name: '渡劫', levels: [1, 2, 3], isPeak: 3, displayName: '渡劫期' },
  
  // 仙人境界序列
  '仙人': { order: 10, name: '仙人', levels: [1], isPeak: 1, displayName: '仙人' },
  '天仙': { order: 11, name: '天仙', levels: [1], isPeak: 1, displayName: '天仙' },
  '金仙': { order: 12, name: '金仙', levels: [1], isPeak: 1, displayName: '金仙' },
  '大罗金仙': { order: 13, name: '大罗金仙', levels: [1], isPeak: 1, displayName: '大罗金仙' },
  '准圣': { order: 14, name: '准圣', levels: [1], isPeak: 1, displayName: '准圣' },
  '圣人': { order: 15, name: '圣人', levels: [1], isPeak: 1, displayName: '圣人' },
  '天道': { order: 16, name: '天道', levels: [1], isPeak: 1, displayName: '天道' }
};

// ==================== 境界压制配置 ====================
const SUPPRESSION_CONFIG = {
  // 是否启用境界压制
  allowRealmSuppression: true,
  
  // 每高1个小境界获得的属性加成 (百分比)
  // 例如：0.05 = 5%
  bonusPerSmallRealm: 0.05,
  
  // 每高1个大境界获得的属性加成 (百分比)
  // 例如：0.15 = 15%
  bonusPerBigRealm: 0.15,
  
  // 最高压制加成上限 (百分比)
  // 例如：0.5 = 50%
  maxSuppressionBonus: 0.5,
  
  // 压制加成应用属性列表
  // 可选: atk, def, hp, maxHp, crit, dodge, spiritRate
  affectedStats: ['atk', 'def', 'hp', 'maxHp'],
  
  // 是否在PVP战斗中使用压制
  enablePVP: true,
  
  // 是否在挑战BOSS中使用压制 (玩家vs怪物)
  enablePVE: false  // 默认不启用，怪物没有境界
};

/**
 * 解析玩家的境界信息
 * @param {Object} player - 玩家对象，需要包含 realm, realmLevel 属性
 * @returns {Object} { order, level, isPeak, realmName }
 */
function parsePlayerRealm(player) {
  const realmName = player.realm || '凡人';
  const realmData = REALM_HIERARCHY[realmName] || REALM_HIERARCHY['凡人'];
  
  // 处理层数 - 有些境界可能有层数系统
  let level = 1; // 默认第1层
  if (player.realmLevel !== undefined) {
    // 如果玩家数据中有 realmLevel，使用它
    level = player.realmLevel;
    // 确保层数在有效范围内
    if (realmData.levels.length > 1) {
      level = Math.min(Math.max(level, realmData.levels[0]), realmData.levels[realmData.levels.length - 1]);
    } else {
      level = realmData.levels[0];
    }
  } else if (player.level !== undefined && realmData.levels.length > 1) {
    // 兼容：如果只有 level，使用它作为层数
    level = Math.min(Math.max(player.level, realmData.levels[0]), realmData.levels[realmData.levels.length - 1]);
  }
  
  // 判断是否大圆满
  const isPeak = level >= realmData.isPeak ? 1 : 0;
  
  return {
    order: realmData.order,
    level: level,
    isPeak: isPeak,
    realmName: realmName,
    displayName: realmData.displayName,
    totalRealmLevel: realmData.order * 10 + level // 用于简单的大小比较
  };
}

/**
 * 计算两个玩家之间的境界差距
 * @param {Object} attacker - 攻击方玩家
 * @param {Object} defender - 防御方玩家
 * @returns {Object} { bigRealmDiff, smallRealmDiff, totalDiff }
 */
function calculateRealmDifference(attacker, defender) {
  const attackerRealm = parsePlayerRealm(attacker);
  const defenderRealm = parsePlayerRealm(defender);
  
  // 大境界差 = 境界顺序差
  const bigRealmDiff = attackerRealm.order - defenderRealm.order;
  
  // 小境界差 = 层数差
  const smallRealmDiff = attackerRealm.level - defenderRealm.level;
  
  // 总差距 (用于简单比较)
  const totalDiff = attackerRealm.totalRealmLevel - defenderRealm.totalRealmLevel;
  
  return {
    bigRealmDiff,
    smallRealmDiff,
    totalDiff,
    attackerRealm,
    defenderRealm,
    // 是否存在压制关系
    hasSuppression: bigRealmDiff > 0 || (bigRealmDiff === 0 && smallRealmDiff > 0),
    isSuppressed: bigRealmDiff < 0 || (bigRealmDiff === 0 && smallRealmDiff < 0)
  };
}

/**
 * 计算境界压制加成
 * @param {Object} attacker - 攻击方玩家
 * @param {Object} defender - 防御方玩家
 * @returns {Object} { bonus, multiplier, details }
 */
function calculateSuppressionBonus(attacker, defender) {
  // 检查是否启用境界压制
  if (!SUPPRESSION_CONFIG.allowRealmSuppression) {
    return { bonus: 0, multiplier: 1, enabled: false, details: '境界压制未启用' };
  }
  
  // 计算境界差距
  const diff = calculateRealmDifference(attacker, defender);
  
  // 没有压制关系
  if (!diff.hasSuppression) {
    return { 
      bonus: 0, 
      multiplier: 1, 
      enabled: true,
      suppressed: false,
      details: '无境界差距或被反压制' 
    };
  }
  
  // 计算压制加成
  const bigRealmBonus = diff.bigRealmDiff * SUPPRESSION_CONFIG.bonusPerBigRealm;
  const smallRealmBonus = diff.smallRealmDiff * SUPPRESSION_CONFIG.bonusPerSmallRealm;
  
  // 总加成 (限制最大值)
  let totalBonus = Math.min(
    bigRealmBonus + smallRealmBonus,
    SUPPRESSION_CONFIG.maxSuppressionBonus
  );
  
  // 确保加成不为负
  totalBonus = Math.max(0, totalBonus);
  
  const multiplier = 1 + totalBonus;
  
  return {
    bonus: totalBonus,
    multiplier: multiplier,
    enabled: true,
    suppressed: true,
    bigRealmDiff: diff.bigRealmDiff,
    smallRealmDiff: diff.smallRealmDiff,
    details: `境界压制: ${diff.attackerRealm.displayName} vs ${diff.defenderRealm.displayName}, 差距: 大境界${diff.bigRealmDiff} + 小境界${diff.smallRealmDiff}, 加成: +${(totalBonus * 100).toFixed(1)}%`
  };
}

/**
 * 应用境界压制加成到属性
 * @param {Object} stats - 原始属性对象 { atk, def, hp, maxHp, ... }
 * @param {Object} suppression - 压制加成对象
 * @returns {Object} 应用压制后的属性
 */
function applySuppressionBonus(stats, suppression) {
  if (!suppression.enabled || suppression.bonus === 0) {
    return { ...stats, suppression: suppression };
  }
  
  const affectedStats = SUPPRESSION_CONFIG.affectedStats;
  const multiplier = suppression.multiplier;
  
  const result = { ...stats };
  
  for (const stat of affectedStats) {
    if (result[stat] !== undefined) {
      result[stat] = Math.floor(result[stat] * multiplier);
    }
  }
  
  result.suppression = suppression;
  
  return result;
}

/**
 * 获取压制战斗结果 (用于PVP)
 * @param {Object} attacker - 攻击方玩家数据
 * @param {Object} defender - 防御方玩家数据
 * @param {Object} battleParams - 战斗参数 { attackerStats, defenderStats, ... }
 * @returns {Object} 战斗结果 { winner, suppression, damage, ... }
 */
function calculateSuppressionBattle(attacker, defender, battleParams = {}) {
  // 计算压制加成
  const attackerSuppression = calculateSuppressionBonus(attacker, defender);
  const defenderSuppression = calculateSuppressionBonus(defender, attacker);
  
  // 应用压制到属性
  const attackerStats = applySuppressionBonus(battleParams.attackerStats || {}, attackerSuppression);
  const defenderStats = applySuppressionBonus(battleParams.defenderStats || {}, defenderSuppression);
  
  // 简单的伤害计算 (可以替换为更复杂的战斗系统)
  const attackerDmg = Math.max(1, attackerStats.atk - defenderStats.def * 0.3);
  const defenderDmg = Math.max(1, defenderStats.atk - attackerStats.def * 0.3);
  
  return {
    attackerSuppression,
    defenderSuppression,
    attackerStats,
    defenderStats,
    attackerDmg,
    defenderDmg,
    // 判断胜负
    attackerWins: attackerDmg > defenderDmg,
    details: {
      attackerRealm: attackerSuppression.details,
      defenderRealm: defenderSuppression.details
    }
  };
}

/**
 * 检查玩家是否可以挑战另一个玩家
 * @param {Object} challenger - 挑战者
 * @param {Object} target - 被挑战者
 * @returns {Object} { canChallenge, reason, suppressionBonus }
 */
function canChallengePlayer(challenger, target) {
  const suppression = calculateSuppressionBonus(challenger, target);
  
  // 基本规则：境界差距不能太大，否则没有挑战性
  const diff = calculateRealmDifference(challenger, target);
  
  if (diff.bigRealmDiff < -2) {
    // 挑战者境界太低
    return {
      canChallenge: false,
      reason: '境界差距过大，无法挑战',
      suppression: suppression
    };
  }
  
  return {
    canChallenge: true,
    reason: suppression.suppressed ? `触发境界压制: +${(suppression.bonus * 100).toFixed(1)}%` : '境界差距在合理范围内',
    suppression: suppression
  };
}

/**
 * 获取境界压制系统的配置
 */
function getConfig() {
  return { ...SUPPRESSION_CONFIG };
}

/**
 * 更新境界压制配置
 * @param {Object} newConfig - 新配置
 */
function updateConfig(newConfig) {
  Object.assign(SUPPRESSION_CONFIG, newConfig);
  return SUPPRESSION_CONFIG;
}

/**
 * 获取所有境界信息
 */
function getAllRealms() {
  return Object.entries(REALM_HIERARCHY).map(([key, data]) => ({
    id: key,
    ...data
  }));
}

/**
 * 根据境界名称获取境界数据
 */
function getRealmData(realmName) {
  return REALM_HIERARCHY[realmName] || REALM_HIERARCHY['凡人'];
}

/**
 * 兼容旧版 REALM_DATA 格式 (用于游戏平衡系统)
 * 导出简化版境界数据供其他模块使用
 */
function getLegacyRealmData() {
  const legacyData = {};
  for (const [key, data] of Object.entries(REALM_HIERARCHY)) {
    const baseOrder = data.order;
    // 转换为旧格式
    legacyData[key] = {
      name: data.name,
      level: baseOrder, // 使用 order 作为 level
      cultivation_req: data.isPeak * 100000, // 大圆满需要更多灵气
      spirit_base: Math.floor(50 * Math.pow(2.5, baseOrder)),
      spirit_rate: Math.floor(5 * Math.pow(2.2, baseOrder)),
      hp_base: Math.floor(100 * Math.pow(2.3, baseOrder)),
      atk_base: Math.floor(10 * Math.pow(2.1, baseOrder)),
      def_base: Math.floor(2 * Math.pow(2.0, baseOrder)),
      realm_bonus: 1 + baseOrder * 0.5,
      desc: data.displayName
    };
  }
  return legacyData;
}

// ==================== 导出模块 ====================
module.exports = {
  // 核心函数
  REALM_HIERARCHY,
  parsePlayerRealm,
  calculateRealmDifference,
  calculateSuppressionBonus,
  applySuppressionBonus,
  calculateSuppressionBattle,
  canChallengePlayer,
  
  // 配置相关
  getConfig,
  updateConfig,
  SUPPRESSION_CONFIG,
  
  // 数据获取
  getAllRealms,
  getRealmData,
  getLegacyRealmData
};
