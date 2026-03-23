/**
 * 挂机修仙 - 宝石镶嵌系统核心
 * 负责宝石镶嵌的核心业务逻辑
 */

// ==================== 扩展宝石类型定义 ====================

// 装备品质对应的镶嵌槽数量
const EQUIPMENT_QUALITY_SLOTS = {
  1: 1,   // 白色 - 1个槽
  2: 1,   // 绿色 - 1个槽
  3: 2,   // 蓝色 - 2个槽
  4: 2,   // 紫色 - 2个槽
  5: 3,   // 橙色 - 3个槽
  6: 4    // 红色 - 4个槽
};

// 扩展宝石类型定义（包含暴击、闪避等）
const GEM_TYPES_EXTENDED = {
  attack: { 
    id: 'attack', 
    name: '攻击宝石', 
    icon: '⚔️', 
    color: '#ff4444', 
    stat: 'atk', 
    statName: '攻击力',
    description: '增加攻击力',
    baseValue: 10
  },
  defense: { 
    id: 'defense', 
    name: '防御宝石', 
    icon: '🛡️', 
    color: '#4488ff', 
    stat: 'def', 
    statName: '防御力',
    description: '增加防御力',
    baseValue: 10
  },
  life: { 
    id: 'life', 
    name: '生命宝石', 
    icon: '❤️', 
    color: '#44ff44', 
    stat: 'hp', 
    statName: '生命值',
    description: '增加生命值',
    baseValue: 50
  },
  speed: { 
    id: 'speed', 
    name: '敏捷宝石', 
    icon: '⚡', 
    color: '#ffff44', 
    stat: 'speed', 
    statName: '速度',
    description: '增加速度',
    baseValue: 2
  },
  critical: { 
    id: 'critical', 
    name: '暴击宝石', 
    icon: '🔥', 
    color: '#ff8800', 
    stat: 'crit', 
    statName: '暴击率',
    description: '增加暴击率',
    baseValue: 1
  },
  dodge: { 
    id: 'dodge', 
    name: '闪避宝石', 
    icon: '💨', 
    color: '#00ffff', 
    stat: 'dodge', 
    statName: '闪避率',
    description: '增加闪避率',
    baseValue: 1
  }
};

// 宝石等级定义
const GEM_LEVELS = {
  1: { name: '一级', multiplier: 1, exp: 0 },
  2: { name: '二级', multiplier: 2, exp: 100 },
  3: { name: '三级', multiplier: 3, exp: 300 },
  4: { name: '四级', multiplier: 4, exp: 700 },
  5: { name: '五级', multiplier: 5, exp: 1500 },
  6: { name: '六级', multiplier: 6, exp: 3000 },
  7: { name: '七级', multiplier: 7, exp: 6000 },
  8: { name: '八级', multiplier: 8, exp: 12000 },
  9: { name: '九级', multiplier: 9, exp: 25000 },
  10: { name: '十级', multiplier: 10, exp: 50000 }
};

// 宝石商城配置
const GEM_SHOP_PRICES = {
  attack: { base: 100, levelFactor: 2 },
  defense: { base: 100, levelFactor: 2 },
  life: { base: 80, levelFactor: 1.5 },
  speed: { base: 150, levelFactor: 2.5 },
  critical: { base: 200, levelFactor: 3 },
  dodge: { base: 200, levelFactor: 3 }
};

// 副本掉落配置
const GEM_DROP_CONFIG = {
  // 普通副本掉落
  normal: {
    minLevel: 1,
    maxLevel: 3,
    dropRate: 0.1,  // 10%基础掉落率
    types: ['attack', 'defense', 'life']
  },
  // 精英副本掉落
  elite: {
    minLevel: 3,
    maxLevel: 6,
    dropRate: 0.3,
    types: ['attack', 'defense', 'life', 'speed']
  },
  // boss副本掉落
  boss: {
    minLevel: 5,
    maxLevel: 10,
    dropRate: 0.5,
    types: ['attack', 'defense', 'life', 'speed', 'critical', 'dodge']
  }
};

// ==================== 核心业务逻辑 ====================

/**
 * 根据装备品质获取镶嵌槽数量
 * @param {number} quality - 装备品质(1-6)
 * @returns {number} 槽位数量
 */
function getSlotsByQuality(quality) {
  return EQUIPMENT_QUALITY_SLOTS[quality] || 1;
}

/**
 * 获取宝石属性值
 * @param {string} gemType - 宝石类型
 * @param {number} level - 宝石等级
 * @returns {number} 属性值
 */
function getGemStatValue(gemType, level) {
  const typeInfo = GEM_TYPES_EXTENDED[gemType];
  const levelInfo = GEM_LEVELS[level];
  if (!typeInfo || !levelInfo) return 0;
  return Math.floor(typeInfo.baseValue * levelInfo.multiplier);
}

/**
 * 计算宝石商城价格
 * @param {string} gemType - 宝石类型
 * @param {number} level - 宝石等级
 * @returns {number} 价格
 */
function getGemShopPrice(gemType, level) {
  const priceConfig = GEM_SHOP_PRICES[gemType];
  if (!priceConfig) return 0;
  return Math.floor(priceConfig.base * Math.pow(priceConfig.levelFactor, level - 1));
}

/**
 * 生成副本掉落宝石
 * @param {string} difficulty - 难度 normal/elite/boss
 * @returns {Object|null} 掉落的宝石 {type, level} 或 null
 */
function generateDungeonDrop(difficulty) {
  const config = GEM_DROP_CONFIG[difficulty];
  if (!config) return null;
  
  // 随机判定是否掉落
  if (Math.random() > config.dropRate) {
    return null;
  }
  
  // 随机选择宝石类型
  const type = config.types[Math.floor(Math.random() * config.types.length)];
  // 随机选择等级
  const level = Math.floor(Math.random() * (config.maxLevel - config.minLevel + 1)) + config.minLevel;
  
  return { type, level };
}

/**
 * 验证宝石镶嵌
 * @param {Object} params - 镶嵌参数
 * @returns {Object} {valid, error}
 */
function validateInlay(params) {
  const { equipmentQuality, slot, gemType, existingGems } = params;
  
  // 验证槽位
  const maxSlots = getSlotsByQuality(equipmentQuality);
  if (slot < 1 || slot > maxSlots) {
    return { valid: false, error: `装备只有${maxSlots}个镶嵌槽，有效槽位为1-${maxSlots}` };
  }
  
  // 验证该槽位是否已有宝石
  if (existingGems && existingGems[slot]) {
    return { valid: false, error: `槽位${slot}已有宝石，请先取下` };
  }
  
  // 验证宝石类型
  if (!GEM_TYPES_EXTENDED[gemType]) {
    return { valid: false, error: '无效的宝石类型' };
  }
  
  return { valid: true };
}

/**
 * 计算装备上所有宝石的总属性加成
 * @param {Array} embeddedGems - 已镶嵌的宝石列表
 * @returns {Object} 属性加成 {atk, def, hp, speed, crit, dodge}
 */
function calculateGemBonuses(embeddedGems) {
  const bonuses = {
    atk: 0,
    def: 0,
    hp: 0,
    speed: 0,
    crit: 0,
    dodge: 0
  };
  
  for (const gem of embeddedGems) {
    if (gem && gem.type && gem.level) {
      const statValue = getGemStatValue(gem.type, gem.level);
      const stat = GEM_TYPES_EXTENDED[gem.type]?.stat;
      if (stat && bonuses.hasOwnProperty(stat)) {
        bonuses[stat] += statValue;
      }
    }
  }
  
  return bonuses;
}

/**
 * 获取宝石详细信息
 * @param {string} gemType - 宝石类型
 * @param {number} level - 宝石等级
 * @returns {Object} 宝石详细信息
 */
function getGemInfo(gemType, level) {
  const typeInfo = GEM_TYPES_EXTENDED[gemType];
  const levelInfo = GEM_LEVELS[level];
  
  if (!typeInfo || !levelInfo) {
    return null;
  }
  
  const statValue = getGemStatValue(gemType, level);
  
  return {
    id: `${gemType}_${level}`,
    type: gemType,
    level: level,
    name: `${typeInfo.name}（${levelInfo.name}）`,
    icon: typeInfo.icon,
    color: typeInfo.color,
    stat: typeInfo.stat,
    statName: typeInfo.statName,
    statValue: statValue,
    description: typeInfo.description,
    shopPrice: getGemShopPrice(gemType, level),
    isMaxLevel: level >= 10
  };
}

/**
 * 获取所有宝石类型列表
 * @returns {Array} 宝石类型列表
 */
function getAllGemTypes() {
  return Object.values(GEM_TYPES_EXTENDED);
}

/**
 * 获取所有宝石等级信息
 * @returns {Object} 等级信息
 */
function getAllGemLevels() {
  return GEM_LEVELS;
}

/**
 * 获取装备槽位信息
 * @param {number} quality - 装备品质
 * @param {Object} existingGems - 已镶嵌的宝石 {slot: gem}
 * @returns {Object} 槽位信息
 */
function getEquipmentSlotsInfo(quality, existingGems = {}) {
  const totalSlots = getSlotsByQuality(quality);
  const slots = [];
  
  for (let i = 1; i <= totalSlots; i++) {
    const gem = existingGems[i];
    slots.push({
      slot: i,
      filled: !!gem,
      gem: gem ? getGemInfo(gem.type, gem.level) : null
    });
  }
  
  return {
    totalSlots,
    filledSlots: Object.keys(existingGems).length,
    slots
  };
}

// ==================== 导出模块 ====================

module.exports = {
  // 装备品质槽位配置
  EQUIPMENT_QUALITY_SLOTS,
  
  // 扩展宝石类型
  GEM_TYPES: GEM_TYPES_EXTENDED,
  
  // 宝石等级
  GEM_LEVELS,
  
  // 商城配置
  GEM_SHOP_PRICES,
  
  // 副本掉落配置
  GEM_DROP_CONFIG,
  
  // 核心函数
  getSlotsByQuality,
  getGemStatValue,
  getGemShopPrice,
  generateDungeonDrop,
  validateInlay,
  calculateGemBonuses,
  getGemInfo,
  getAllGemTypes,
  getAllGemLevels,
  getEquipmentSlotsInfo
};
