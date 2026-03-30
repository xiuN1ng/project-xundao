/**
 * 渡劫系统 - 后端逻辑
 * 天劫类型、成功率计算、渡劫奖励
 */

// 天劫类型数据
const TRIBULATION_TYPES = {
  // 五行天劫
  metal: {
    id: 'metal',
    name: '金劫',
    element: '金',
    icon: '⚔️',
    color: '#D4AF37',
    description: '金属性雷劫，考验锐利与坚硬',
    baseSuccessRate: 0.8,
    difficulty: 'normal',
    suitableRealm: '炼气→筑基'
  },
  wood: {
    id: 'wood',
    name: '木劫',
    element: '木',
    icon: '🌿',
    color: '#228B22',
    description: '木属性雷劫，考验生长与韧性',
    baseSuccessRate: 0.8,
    difficulty: 'normal',
    suitableRealm: '筑基→金丹'
  },
  water: {
    id: 'water',
    name: '水劫',
    element: '水',
    icon: '💧',
    color: '#1E90FF',
    description: '水属性雷劫，考验流动与变化',
    baseSuccessRate: 0.7,
    difficulty: 'normal',
    suitableRealm: '金丹→元婴'
  },
  fire: {
    id: 'fire',
    name: '火劫',
    element: '火',
    icon: '🔥',
    color: '#FF4500',
    description: '火属性雷劫，考验炽热与毁灭',
    baseSuccessRate: 0.6,
    difficulty: 'hard',
    suitableRealm: '元婴→化神'
  },
  earth: {
    id: 'earth',
    name: '土劫',
    element: '土',
    icon: '🪨',
    color: '#8B4513',
    description: '土属性雷劫，考验厚重与稳固',
    baseSuccessRate: 0.5,
    difficulty: 'hard',
    suitableRealm: '化神→炼虚'
  },
  // 特殊天劫
  heart_demon: {
    id: 'heart_demon',
    name: '心魔劫',
    element: '心',
    icon: '😈',
    color: '#9400D3',
    description: '考验道心，需击败心魔',
    baseSuccessRate: 0.6,
    difficulty: 'hard',
    suitableRealm: '每逢大境界突破'
  },
  heavenly_thunder: {
    id: 'heavenly_thunder',
    name: '九天雷劫',
    element: '雷',
    icon: '⚡',
    color: '#FFFF00',
    description: '九道天雷连续降落，极难渡劫',
    baseSuccessRate: 0.3,
    difficulty: 'nightmare',
    suitableRealm: '炼虚→合体'
  },
  // 合体→大乘天劫
  tribulation_dacheng: {
    id: 'tribulation_dacheng',
    name: '大乘雷劫',
    element: '雷',
    icon: '🔱',
    color: '#FF6600',
    description: '大乘期雷劫，需承受天地法则考验',
    baseSuccessRate: 0.25,
    difficulty: 'nightmare',
    suitableRealm: '合体→大乘'
  },
  // 大乘→渡劫天劫（天魔劫）
  tribulation_dujie: {
    id: 'tribulation_dujie',
    name: '天魔劫',
    element: '心',
    icon: '👹',
    color: '#8B0000',
    description: '天魔扰乱神魂，考验道心坚定',
    baseSuccessRate: 0.15,
    difficulty: 'legendary',
    suitableRealm: '大乘→渡劫'
  },
  // 渡劫→真仙（九九天劫/混沌劫）
  tribulation_zhenxian: {
    id: 'tribulation_zhenxian',
    name: '混沌天劫',
    element: '混沌',
    icon: '🌌',
    color: '#9400D3',
    description: '九十九道混沌神雷，渡此劫者飞升真仙',
    baseSuccessRate: 0.08,
    difficulty: 'legendary',
    suitableRealm: '渡劫→真仙'
  }
};

// 境界数据（9个境界：练气→筑基→金丹→元婴→化神→炼虚→大乘→渡劫→真仙）
const REALM_DATA = {
  '凡人': { order: 0, next: '炼气', spiritRequired: 0 },
  '炼气': { order: 1, next: '筑基', spiritRequired: 1000 },
  '筑基': { order: 2, next: '金丹', spiritRequired: 10000 },
  '金丹': { order: 3, next: '元婴', spiritRequired: 50000 },
  '元婴': { order: 4, next: '化神', spiritRequired: 200000 },
  '化神': { order: 5, next: '炼虚', spiritRequired: 800000 },
  '炼虚': { order: 6, next: '合体', spiritRequired: 3000000 },
  '合体': { order: 7, next: '大乘', spiritRequired: 10000000 },
  '大乘': { order: 8, next: '渡劫', spiritRequired: 50000000 },
  '渡劫': { order: 9, next: '真仙', spiritRequired: 100000000 },
  '真仙': { order: 10, next: null, spiritRequired: 0 }
};

// 渡劫奖励配置
const TRIBULATION_REWARDS = {
  '炼气→筑基': { spirit: 10000, spiritStones: 500, item: '筑基丹', itemCount: 1 },
  '筑基→金丹': { spirit: 50000, spiritStones: 2000, item: '金丹', itemCount: 1 },
  '金丹→元婴': { spirit: 200000, spiritStones: 10000, item: '元婴丹', itemCount: 1 },
  '元婴→化神': { spirit: 800000, spiritStones: 50000, item: '化神果', itemCount: 1 },
  '化神→炼虚': { spirit: 3000000, spiritStones: 200000, item: '炼虚丹', itemCount: 1 },
  '炼虚→合体': { spirit: 10000000, spiritStones: 1000000, item: '合体期功法碎片', itemCount: 1 },
  '合体→大乘': { spirit: 30000000, spiritStones: 3000000, item: '大乘期功法碎片', itemCount: 1 },
  '大乘→渡劫': { spirit: 50000000, spiritStones: 5000000, item: '仙品装备', itemCount: 1 },
  '渡劫→真仙': { spirit: 100000000, spiritStones: 10000000, item: '真仙套装', itemCount: 1 }
};

// 获取渡劫类型列表
function getTribulationTypes(playerRealm) {
  const realmOrder = REALM_DATA[playerRealm]?.order || 0;
  const types = [];
  
  // 根据境界返回适用的天劫类型
  for (const [key, tribulation] of Object.entries(TRIBULATION_TYPES)) {
    if (tribulation.suitableRealm.includes(playerRealm) || 
        tribulation.suitableRealm === '每逢大境界突破') {
      types.push(tribulation);
    } else if (realmOrder >= 1 && realmOrder <= 5 && 
               tribulation.element !== '心' && tribulation.element !== '雷') {
      // 默认五行天劫
      types.push(tribulation);
    }
  }
  
  // 如果没有匹配的，返回默认五行天劫
  if (types.length === 0) {
    types.push(TRIBULATION_TYPES.water);
  }
  
  return types;
}

// 计算渡劫成功率
function calculateSuccessRate(playerRealm, bonuses = []) {
  const realmOrder = REALM_DATA[playerRealm]?.order || 0;
  
  // 基础成功率 (境界越高，成功率越低)
  const baseRates = {
    0: 0.9,  // 凡人→炼气
    1: 0.9,  // 炼气→筑基
    2: 0.8,  // 筑基→金丹
    3: 0.7,  // 金丹→元婴
    4: 0.6,  // 元婴→化神
    5: 0.5,  // 化神→炼虚
    6: 0.4,  // 炼虚→合体
    7: 0.3,  // 合体→大乘
    8: 0.2,  // 大乘→渡劫
    9: 0.10, // 渡劫→真仙（极其艰难）
    10: 0.05 // 真仙→?（已无更高境界）
  };
  
  let successRate = (baseRates[realmOrder] !== undefined) ? baseRates[realmOrder] : 0.5;
  
  // 加上各种加成
  bonuses.forEach(bonus => {
    successRate += bonus.value;
  });
  
  return Math.min(1, Math.max(0, successRate));
}

// 执行渡劫
function attemptTribulation(playerRealm, tribulationType, bonuses = {}) {
  const currentRealm = REALM_DATA[playerRealm];
  const targetRealm = currentRealm?.next;
  
  if (!targetRealm) {
    return { success: false, message: '已达到最高境界，无需渡劫' };
  }
  
  // 计算成功率
  const bonusList = [];
  if (bonuses.drug) bonusList.push({ type: 'drug', value: bonuses.drug });
  if (bonuses.guardian) bonusList.push({ type: 'guardian', value: bonuses.guardian });
  if (bonuses.technique) bonusList.push({ type: 'technique', value: bonuses.technique });
  
  const successRate = calculateSuccessRate(playerRealm, bonusList);
  const random = Math.random();
  const success = random < successRate;
  
  const result = {
    success,
    currentRealm: playerRealm,
    targetRealm,
    tribulationType: tribulationType,
    successRate: Math.round(successRate * 100),
    actualRandom: Math.round(random * 100)
  };
  
  if (success) {
    // 成功奖励
    const key = `${playerRealm}→${targetRealm}`;
    const rewards = TRIBULATION_REWARDS[key] || { spirit: 10000, spiritStones: 500, item: null, itemCount: 0 };
    result.realm = targetRealm;
    result.rewards = rewards;
    result.message = `🎊 渡劫成功！恭喜突破至${targetRealm}！`;
    
    // 额外奖励判断
    result.extraBonus = [];
    if (bonuses.perfect) {
      result.extraBonus.push({ type: 'spirit', value: Math.round(rewards.spirit * 0.3), name: '完美渡劫奖励' });
    }
    if (bonuses.flawless) {
      result.extraBonus.push({ type: 'spirit', value: Math.round(rewards.spirit * 0.5), name: '无伤渡劫奖励' });
    }
  } else {
    // 失败惩罚
    const penalties = {
      light: { spiritLoss: 0.3, message: '重伤' },
      medium: { spiritLoss: 0.5, message: '殒落' },
      heavy: { spiritLoss: 0.8, message: '轮回' }
    };
    
    // 根据成功率确定惩罚力度
    let penalty = penalties.light;
    if (successRate < 0.4) penalty = penalties.heavy;
    else if (successRate < 0.6) penalty = penalties.medium;
    
    result.penalty = penalty;
    result.message = `💀 渡劫失败！${penalty.message}，损失${Math.round(penalty.spiritLoss * 100)}%当前灵气`;
  }
  
  return result;
}

module.exports = {
  TRIBULATION_TYPES,
  REALM_DATA,
  TRIBULATION_REWARDS,
  getTribulationTypes,
  calculateSuccessRate,
  attemptTribulation
};
