/**
 * 游戏配置 - 装备分解系统配置
 * 
 * 定义装备分解相关配置
 */

// 装备分解配置
const DECOMPOSE_CONFIG = {
  // 分解规则: 根据装备稀有度返回强化石数量范围
  // rarity: [最小数量, 最大数量]
  // null 表示该稀有度无法分解
  // 稀有度对应: 1=普通(白色), 2=优秀(绿色), 3=精良(蓝色), 4=史诗(紫色), 5=传说(橙色)
  rarity: {
    1: null,       // 普通(白色) - 无法分解
    2: null,       // 优秀(绿色) - 无法分解 (白色/绿色装备无法分解)
    3: [3, 5],     // 精良(蓝色) - 3-5个低级强化石
    4: [8, 12],    // 史诗(紫色) - 8-12个中级强化石
    5: [20, 30]    // 传说(橙色) - 20-30个高级强化石
  },
  
  // 强化石物品ID (统一使用一种强化石，通过数量区分等级)
  strengthenStoneId: 'qianghua_stone',
  
  // 强化石名称
  strengthenStoneName: '强化石',
  
  // 强化石图标
  strengthenStoneIcon: '💎',
  
  // 分解冷却时间(毫秒) - 可选，0表示无冷却
  cooldownMs: 0,
  
  // 每日分解次数限制 - 可选，0表示无限制
  dailyLimit: 0,
  
  // 是否允许分解已装备的装备
  allowEquippedDecompose: false,
  
  // 是否允许分解绑定装备
  allowBoundEquipDecompose: true
};

// 稀有度颜色映射
const RARITY_COLORS = {
  1: '#FFFFFF', // 白色
  2: '#4287f5', // 蓝色
  3: '#9b42f5', // 紫色
  4: '#f5a742', // 橙色
  5: '#f54242'  // 红色
};

// 稀有度名称映射
const RARITY_NAMES = {
  1: '普通',
  2: '优秀',
  3: '精良',
  4: '史诗',
  5: '传说'
};

/**
 * 根据装备稀有度计算可获得的强化石数量
 * @param {number} rarity - 装备稀有度 (1-5)
 * @returns {number|null} - 返回强化石数量，null表示无法分解
 */
function getDecomposeReward(rarity) {
  const config = DECOMPOSE_CONFIG.rarity[rarity];
  if (!config) return null;
  
  const [min, max] = config;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 检查装备是否可以分解
 * @param {Object} equipment - 装备对象
 * @returns {Object} - { canDecompose: boolean, reason: string }
 */
function canDecompose(equipment) {
  // 检查稀有度
  const rarity = equipment.rarity || equipment.rarity || 1;
  const config = DECOMPOSE_CONFIG.rarity[rarity];
  
  if (!config) {
    return { canDecompose: false, reason: `${RARITY_NAMES[rarity] || '普通'}装备无法分解` };
  }
  
  // 检查是否已装备
  if (!DECOMPOSE_CONFIG.allowEquippedDecompose && equipment.is_equipped) {
    return { canDecompose: false, reason: '已穿戴的装备无法分解' };
  }
  
  // 检查绑定状态 (如果有绑定字段)
  if (equipment.is_bound && !DECOMPOSE_CONFIG.allowBoundEquipDecompose) {
    return { canDecompose: false, reason: '绑定装备无法分解' };
  }
  
  return { canDecompose: true, reason: '' };
}

module.exports = {
  DECOMPOSE_CONFIG,
  RARITY_COLORS,
  RARITY_NAMES,
  getDecomposeReward,
  canDecompose
};
