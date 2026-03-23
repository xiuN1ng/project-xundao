/**
 * 挂机修仙 - 游戏配置
 * 包含灵石消耗配置和其他游戏平衡参数
 */

// ==================== 灵石消耗配置 ====================

// 建筑升级消耗配置
const BUILDING_UPGRADE_CONFIG = {
  // 不同类型建筑的升级消耗系数
  buildingTypes: {
    'tianjian': { name: '天剑宗', baseCost: 100, costFactor: 1.5 },
    'tiandao': { name: '天道宫', baseCost: 100, costFactor: 1.5 },
    'buddha': { name: '大佛寺', baseCost: 100, costFactor: 1.5 },
    'demon': { name: '魔渊', baseCost: 100, costFactor: 1.5 },
    'immortal': { name: '逍遥仙府', baseCost: 100, costFactor: 1.5 }
  },
  // 洞府建筑升级消耗（按等级）
  caveBuildings: {
    '聚灵阵': { baseCost: 30, costFactor: 1.8 },
    '灵田': { baseCost: 50, costFactor: 1.8 },
    '炼丹房': { baseCost: 100, costFactor: 2.0 },
    '炼器室': { baseCost: 200, costFactor: 2.2 },
    '藏书阁': { baseCost: 400, costFactor: 2.5 },
    '灵兽园': { baseCost: 800, costFactor: 2.8 },
    '演武场': { baseCost: 600, costFactor: 2.6 }
  },
  // 计算建筑升级消耗
  calculateCost(buildingType, currentLevel) {
    let config = this.caveBuildings[buildingType] || this.buildingTypes[buildingType];
    if (!config) {
      config = { baseCost: 100, costFactor: 1.5 }; // 默认配置
    }
    return Math.floor(config.baseCost * Math.pow(config.costFactor, currentLevel));
  }
};

// 传送消耗配置
const TELEPORT_CONFIG = {
  // 不同地图区域的传送费用
  regions: {
    // 迷雾森林区域
    'forest_village': { name: '迷雾村庄', baseCost: 5, difficulty: 'easy' },
    'forest_deep': { name: '森林深处', baseCost: 10, difficulty: 'normal' },
    'forest_cave': { name: '森林洞穴', baseCost: 15, difficulty: 'normal' },
    
    // 灵山区域
    'mountain_base': { name: '灵山脚下', baseCost: 20, difficulty: 'normal' },
    'mountain_mid': { name: '灵山中部', baseCost: 30, difficulty: 'hard' },
    'mountain_peak': { name: '灵山之巅', baseCost: 50, difficulty: 'hard' },
    
    // 幽暗洞穴区域
    'cave_entrance': { name: '洞穴入口', baseCost: 40, difficulty: 'hard' },
    'cave_deep': { name: '幽暗深处', baseCost: 60, difficulty: 'nightmare' },
    'cave_core': { name: '洞穴核心', baseCost: 80, difficulty: 'nightmare' },
    
    // 魔山区域
    'demon_base': { name: '魔山外围', baseCost: 100, difficulty: 'nightmare' },
    'demon_summit': { name: '魔山之巅', baseCost: 150, difficulty: 'extreme' },
    
    // 蛟龙湖区域
    'dragon_shore': { name: '蛟龙湖畔', baseCost: 200, difficulty: 'extreme' },
    'dragon_palace': { name: '龙宫', baseCost: 300, difficulty: 'legend' }
  },
  // 难度等级费用倍数
  difficultyMultipliers: {
    'easy': 1,
    'normal': 1.5,
    'hard': 2,
    'nightmare': 3,
    'extreme': 5,
    'legend': 10
  },
  // 计算传送费用
  calculateCost(targetLocation) {
    const region = this.regions[targetLocation];
    if (!region) {
      return 10; // 默认费用
    }
    const multiplier = this.difficultyMultipliers[region.difficulty] || 1;
    return Math.floor(region.baseCost * multiplier);
  }
};

// 商店刷新消耗配置
const SHOP_REFRESH_CONFIG = {
  baseCost: 10,        // 首次刷新费用
  costIncrement: 10,  // 每次刷新递增费用
  maxCost: 100,         // 最高费用上限
  dailyReset: true,    // 每日重置
  // 计算刷新费用
  calculateCost(refreshCount) {
    const cost = this.baseCost + (refreshCount * this.costIncrement);
    return Math.min(cost, this.maxCost);
  }
};

// 背包扩展消耗配置
const INVENTORY_EXPAND_CONFIG = {
  baseSlots: 20,       // 基础栏位
  maxSlots: 100,       // 最大栏位
  slotsPerExpand: 5,  // 每次扩展栏位数
  baseCost: 100,       // 基础费用
  costIncrement: 50,  // 费用递增
  // 计算扩展费用
  calculateCost(currentSlots) {
    if (currentSlots >= this.maxSlots) {
      return null; // 已达上限
    }
    const expandCount = Math.floor((currentSlots - this.baseSlots) / this.slotsPerExpand);
    return this.baseCost + (expandCount * this.costIncrement);
  }
};

// 灵兽加速消耗配置
const BEAST_SPEEDUP_CONFIG = {
  costPerHour: 50,     // 每小时加速费用
  maxHours: 24,        // 最大加速时间
  // 计算加速费用
  calculateCost(hours) {
    const validHours = Math.min(Math.max(1, hours), this.maxHours);
    return validHours * this.costPerHour;
  }
};

// ==================== 灵石消耗类型 ====================

const LINGSHI_CONSUME_TYPE = {
  BUILDING_UPGRADE: 'building_upgrade',       // 建筑升级
  TELEPORT: 'teleport',                       // 传送
  SHOP_REFRESH: 'shop_refresh',               // 商店刷新
  INVENTORY_EXPAND: 'inventory_expand',        // 背包扩展
  BEAST_SPEEDUP: 'beast_speedup',             // 灵兽加速
  DISCIPLE_RECRUIT: 'disciple_recruit',       // 弟子招募
  SECT_DONATE: 'sect_donate'                  // 宗门捐赠
};

// ==================== 灵石消耗日志配置 ====================

const LINGSHI_LOG_CONFIG = {
  maxLogsPerPlayer: 100,   // 每个玩家最大日志数
  retentionDays: 30        // 日志保留天数
};

// ==================== 境界压制配置 ====================

const REALM_SUPPRESSION_CONFIG = {
  // 是否启用境界压制 (玩家vs玩家战斗)
  allowRealmSuppression: true,
  
  // 每高1个小境界获得的属性加成 (百分比)
  bonusPerSmallRealm: 0.05,
  
  // 每高1个大境界获得的属性加成 (百分比)
  bonusPerBigRealm: 0.15,
  
  // 最高压制加成上限 (百分比)
  maxSuppressionBonus: 0.5,
  
  // 压制加成应用属性列表
  affectedStats: ['atk', 'def', 'hp', 'maxHp']
};

// ==================== 导出配置 ====================

module.exports = {
  // 灵石消耗配置
  BUILDING_UPGRADE_CONFIG,
  TELEPORT_CONFIG,
  SHOP_REFRESH_CONFIG,
  INVENTORY_EXPAND_CONFIG,
  BEAST_SPEEDUP_CONFIG,
  
  // 境界压制配置
  REALM_SUPPRESSION_CONFIG,
  
  // 消耗类型
  LINGSHI_CONSUME_TYPE,
  
  // 日志配置
  LINGSHI_LOG_CONFIG,
  
  // 便捷函数：计算所有类型的消耗
  calculateCost(type, params) {
    switch (type) {
      case LINGSHI_CONSUME_TYPE.BUILDING_UPGRADE:
        return BUILDING_UPGRADE_CONFIG.calculateCost(params.buildingType, params.currentLevel);
      case LINGSHI_CONSUME_TYPE.TELEPORT:
        return TELEPORT_CONFIG.calculateCost(params.targetLocation);
      case LINGSHI_CONSUME_TYPE.SHOP_REFRESH:
        return SHOP_REFRESH_CONFIG.calculateCost(params.refreshCount);
      case LINGSHI_CONSUME_TYPE.INVENTORY_EXPAND:
        return INVENTORY_EXPAND_CONFIG.calculateCost(params.currentSlots);
      case LINGSHI_CONSUME_TYPE.BEAST_SPEEDUP:
        return BEAST_SPEEDUP_CONFIG.calculateCost(params.hours);
      default:
        return 0;
    }
  }
};
