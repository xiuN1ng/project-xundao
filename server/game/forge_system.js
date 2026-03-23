/**
 * 炼器系统 v1.0
 * 装备打造系统 - 武器、防具、饰品
 */

// ==================== 装备类型 ====================
const EQUIPMENT_TYPES = {
  weapon: { name: '武器', icon: '⚔️', slot: 'weapon' },
  armor: { name: '防具', icon: '🛡️', slot: 'armor' },
  accessory: { name: '饰品', icon: '💍', slot: 'accessory' }
};

// ==================== 装备品质 ====================
const EQUIPMENT_QUALITY = {
  common: { name: '普通', color: '#8B8B8B', multiplier: 1.0 },
  uncommon: { name: '优秀', color: '#00FF7F', multiplier: 1.2 },
  rare: { name: '稀有', color: '#1E90FF', multiplier: 1.5 },
  epic: { name: '史诗', color: '#FFD700', multiplier: 2.0 },
  legendary: { name: '传说', color: '#FF4500', multiplier: 3.0 }
};

// ==================== 打造配方 ====================
const FORGE_RECIPES = {
  // 武器配方
  'flying_sword': {
    id: 'flying_sword',
    name: '飞剑',
    type: 'weapon',
    description: '基础飞剑，攻击+10',
    materials: { 'iron_ingot': 3 },
    baseStats: { atk: 10 },
    randomStats: { atk: { min: 0, max: 5 } },
    quality: 'common'
  },
  'flame_blade': {
    id: 'flame_blade',
    name: '烈焰刀',
    type: 'weapon',
    description: '附带火焰伤害的武器',
    materials: { 'iron_ingot': 5, 'fire_crystal': 2 },
    baseStats: { atk: 25 },
    randomStats: { atk: { min: 5, max: 15 }, crit_rate: { min: 1, max: 3 } },
    quality: 'uncommon'
  },
  'thunder_sword': {
    id: 'thunder_sword',
    name: '雷霆剑',
    type: 'weapon',
    description: '蕴含雷霆之力的神剑',
    materials: { 'flame_blade': 1, 'thunder_crystal': 3, 'refined_iron': 5 },
    baseStats: { atk: 50 },
    randomStats: { atk: { min: 10, max: 30 }, crit_rate: { min: 3, max: 8 } },
    quality: 'rare'
  },

  // 防具配方
  'battle_armor': {
    id: 'battle_armor',
    name: '战甲',
    type: 'armor',
    description: '基础战甲，防御+10',
    materials: { 'iron_ingot': 3 },
    baseStats: { def: 10 },
    randomStats: { def: { min: 0, max: 5 } },
    quality: 'common'
  },
  'jade_armor': {
    id: 'jade_armor',
    name: '玉鳞甲',
    type: 'armor',
    description: '玉石与钢铁融合的护甲',
    materials: { 'iron_ingot': 5, 'jade': 2 },
    baseStats: { def: 25 },
    randomStats: { def: { min: 5, max: 15 }, hp: { min: 20, max: 50 } },
    quality: 'uncommon'
  },
  'dragon_scale_armor': {
    id: 'dragon_scale_armor',
    name: '龙鳞甲',
    type: 'armor',
    description: '真龙鳞片打造的顶级护甲',
    materials: { 'jade_armor': 1, 'dragon_scale': 3, 'refined_iron': 5 },
    baseStats: { def: 50 },
    randomStats: { def: { min: 10, max: 30 }, hp: { min: 50, max: 100 } },
    quality: 'rare'
  },

  // 饰品配方 - 护符
  'health_pendant': {
    id: 'health_pendant',
    name: '护符',
    type: 'accessory',
    description: '基础护符，气血+50',
    materials: { 'jade': 2 },
    baseStats: { hp: 50 },
    randomStats: { hp: { min: 0, max: 25 } },
    quality: 'common'
  },
  'spirit_pendant': {
    id: 'spirit_pendant',
    name: '灵玉佩',
    type: 'accessory',
    description: '蕴含灵气的玉佩',
    materials: { 'jade': 3, 'spirit_stone': 2 },
    baseStats: { hp: 100, spirit_rate: 5 },
    randomStats: { hp: { min: 20, max: 50 }, spirit_rate: { min: 2, max: 5 } },
    quality: 'uncommon'
  },

  // 饰品配方 - 戒指
  'crit_ring': {
    id: 'crit_ring',
    name: '戒指',
    type: 'accessory',
    description: '基础戒指，暴击+5%',
    materials: { 'jade': 2 },
    baseStats: { crit_rate: 5 },
    randomStats: { crit_rate: { min: 0, max: 3 } },
    quality: 'common'
  },
  'warrior_ring': {
    id: 'warrior_ring',
    name: '战神戒',
    type: 'accessory',
    description: '战士之怒，暴击大幅提升',
    materials: { 'crit_ring': 1, 'fire_crystal': 2, 'thunder_crystal': 1 },
    baseStats: { crit_rate: 15, atk: 10 },
    randomStats: { crit_rate: { min: 3, max: 10 }, atk: { min: 5, max: 15 } },
    quality: 'rare'
  }
};

// ==================== 材料定义 ====================
const FORGE_MATERIALS = {
  'iron_ingot': { name: '铁锭', icon: '🔩', category: 'metal' },
  'refined_iron': { name: '精炼铁', icon: '⚙️', category: 'metal' },
  'jade': { name: '玉石', icon: '💎', category: 'gem' },
  'fire_crystal': { name: '火焰结晶', icon: '🔥', category: 'element' },
  'thunder_crystal': { name: '雷霆结晶', icon: '⚡', category: 'element' },
  'dragon_scale': { name: '龙鳞', icon: '🐉', category: 'rare' },
  'spirit_stone': { name: '灵石', icon: '💰', category: 'resource' },
  'strengthen_stone': { name: '强化石', icon: '💎', category: 'enhance' }
};

// ==================== 强化配置 ====================
const STRENGTHEN_CONFIG = {
  // 基础成功率（强化等级0时）
  baseSuccessRate: 100,
  // 每级成功率递减
  successRateDecrease: 10,
  // 最低成功率
  minSuccessRate: 20,
  // 最大强化等级
  maxLevel: 15,
  // 强化石消耗系数
  stoneCostFactor: 1.5,
  // 灵石消耗系数
  spiritCostFactor: 2,
  // 成功属性提升系数
  successBonusFactor: 0.1,
  // 强化石材料ID
  stoneMaterialId: 'strengthen_stone',
  // 灵石材料ID
  spiritMaterialId: 'spirit_stone'
};

/**
 * 获取强化消耗
 * @param {number} level - 当前强化等级
 * @returns {object} - 消耗对象 { strengthenStone: number, spiritStones: number }
 */
function getStrengthenCost(level) {
  const baseStoneCost = 5;
  const baseSpiritCost = 100;
  
  const stoneCost = Math.floor(baseStoneCost * Math.pow(STRENGTHEN_CONFIG.stoneCostFactor, level));
  const spiritCost = Math.floor(baseSpiritCost * Math.pow(STRENGTHEN_CONFIG.spiritCostFactor, level));
  
  return {
    strengthenStones: stoneCost,
    spiritStones: spiritCost
  };
}

/**
 * 获取强化成功率
 * @param {number} level - 当前强化等级
 * @returns {number} - 成功率（0-100）
 */
function getStrengthenSuccessRate(level) {
  const rate = STRENGTHEN_CONFIG.baseSuccessRate - (level * STRENGTHEN_CONFIG.successRateDecrease);
  return Math.max(rate, STRENGTHEN_CONFIG.minSuccessRate);
}

/**
 * 计算强化成功后的属性提升
 * @param {object} equipment - 装备对象
 * @returns {object} - 属性提升对象
 */
function calculateStrengthenBonus(equipment) {
  const level = equipment.strengthenLevel || 0;
  const baseBonus = STRENGTHEN_CONFIG.successBonusFactor;
  const totalBonus = level * baseBonus;
  
  const bonus = {};
  if (equipment.stats) {
    for (const [stat, value] of Object.entries(equipment.stats)) {
      bonus[stat] = Math.floor(value * totalBonus);
    }
  }
  return bonus;
}

// ==================== 玩家装备数据 ====================
let playerEquipment = [];

// ==================== 炼器系统类 ====================
class ForgeSystem {
  constructor() {
    this.equipmentIdCounter = 1;
  }

  /**
   * 初始化系统
   */
  init(gameState) {
    this.gameState = gameState;
    if (!this.gameState.forge) {
      this.gameState.forge = {
        equipment: [],
        stats: {
          totalForged: 0,
          totalCrafted: 0
        }
      };
    }
    this.playerEquipment = this.gameState.forge.equipment;
    this.stats = this.gameState.forge.stats;
    this.equipmentIdCounter = this.playerEquipment.length > 0 
      ? Math.max(...this.playerEquipment.map(e => e.id)) + 1 
      : 1;
  }

  /**
   * 获取所有配方
   */
  getRecipes() {
    const recipes = [];
    for (const [id, recipe] of Object.entries(FORGE_RECIPES)) {
      recipes.push({
        id: recipe.id,
        name: recipe.name,
        type: recipe.type,
        description: recipe.description,
        materials: { ...recipe.materials },
        baseStats: { ...recipe.baseStats },
        quality: recipe.quality,
        qualityName: EQUIPMENT_QUALITY[recipe.quality]?.name || '普通'
      });
    }
    return recipes;
  }

  /**
   * 按类型获取配方
   */
  getRecipesByType(type) {
    return this.getRecipes().filter(r => r.type === type);
  }

  /**
   * 获取可用材料数量（从洞府资源获取）
   */
  getMaterialCount(materialId) {
    // 尝试从多个来源获取材料数量
    // 1. 洞府资源
    if (this.gameState.cave?.resources?.materials) {
      // materials 字段存的是矿石类材料
      return Math.floor(this.gameState.cave.resources.materials);
    }
    return 0;
  }

  /**
   * 检查玩家是否有所需材料
   */
  canForge(recipeId) {
    const recipe = FORGE_RECIPES[recipeId];
    if (!recipe) {
      return { success: false, message: '配方不存在' };
    }

    // 检查材料是否足够
    const missing = [];
    for (const [materialId, required] of Object.entries(recipe.materials)) {
      const available = this.getMaterialCount(materialId);
      if (available < required) {
        missing.push({
          material: materialId,
          required,
          available,
          name: FORGE_MATERIALS[materialId]?.name || materialId
        });
      }
    }

    if (missing.length > 0) {
      const missingText = missing.map(m => `${m.name}需要${m.required}，现有${m.available}`).join('; ');
      return { success: false, message: `材料不足: ${missingText}` };
    }

    return { success: true, message: '材料充足，可以打造' };
  }

  /**
   * 打造装备
   */
  forge(recipeId) {
    const recipe = FORGE_RECIPES[recipeId];
    if (!recipe) {
      return { success: false, message: '配方不存在' };
    }

    // 检查材料
    const canCheck = this.canForge(recipeId);
    if (!canCheck.success) {
      return canCheck;
    }

    // 扣除材料
    for (const [materialId, required] of Object.entries(recipe.materials)) {
      this.gameState.cave.resources.materials = Math.max(0, 
        Math.floor(this.gameState.cave.resources.materials) - required
      );
    }

    // 生成随机属性
    const finalStats = { ...recipe.baseStats };
    const qualityMultiplier = EQUIPMENT_QUALITY[recipe.quality]?.multiplier || 1.0;

    if (recipe.randomStats) {
      for (const [statName, statRange] of Object.entries(recipe.randomStats)) {
        const randomBonus = Math.floor(
          Math.random() * (statRange.max - statRange.min + 1) + statRange.min
        );
        const bonus = Math.floor(randomBonus * qualityMultiplier);
        finalStats[statName] = (finalStats[statName] || 0) + bonus;
      }
    }

    // 创建装备
    const equipment = {
      id: this.equipmentIdCounter++,
      name: recipe.name,
      type: recipe.type,
      quality: recipe.quality,
      qualityName: EQUIPMENT_QUALITY[recipe.quality]?.name || '普通',
      color: EQUIPMENT_QUALITY[recipe.quality]?.color || '#8B8B8B',
      stats: finalStats,
      bonusStats: {},
      strengthenLevel: 0,
      createdAt: Date.now()
    };

    // 添加到玩家装备
    this.playerEquipment.push(equipment);

    // 更新统计
    this.stats.totalForged = (this.stats.totalForged || 0) + 1;
    this.stats.totalCrafted = (this.stats.totalCrafted || 0) + 1;

    return {
      success: true,
      message: `打造成功！获得 ${equipment.qualityName}级 ${equipment.name}`,
      equipment: equipment
    };
  }

  /**
   * 获取玩家所有装备
   */
  getPlayerEquipment() {
    return this.playerEquipment.map(eq => ({
      id: eq.id,
      name: eq.name,
      type: eq.type,
      quality: eq.quality,
      qualityName: eq.qualityName,
      color: eq.color,
      stats: { ...eq.stats },
      bonusStats: { ...(eq.bonusStats || {}) },
      strengthenLevel: eq.strengthenLevel || 0,
      createdAt: eq.createdAt
    }));
  }

  /**
   * 按类型获取玩家装备
   */
  getPlayerEquipmentByType(type) {
    return this.getPlayerEquipment().filter(eq => eq.type === type);
  }

  /**
   * 装备装备到角色槽位
   */
  equipItem(equipmentId) {
    const equipment = this.playerEquipment.find(e => e.id === equipmentId);
    if (!equipment) {
      return { success: false, message: '装备不存在' };
    }

    const slot = equipment.type;
    const oldEquipment = this.gameState.player.equipment[slot];

    // 替换装备
    this.gameState.player.equipment[slot] = equipmentId;

    return {
      success: true,
      message: `装备 ${equipment.name} 成功！`,
      oldEquipment: oldEquipment
    };
  }

  /**
   * 卸下装备
   */
  unequipItem(slot) {
    if (!this.gameState.player.equipment[slot]) {
      return { success: false, message: '该槽位没有装备' };
    }

    const equipmentId = this.gameState.player.equipment[slot];
    this.gameState.player.equipment[slot] = null;

    return {
      success: true,
      message: `卸下装备成功`,
      equipmentId: equipmentId
    };
  }

  /**
   * 获取当前穿戴的装备
   */
  getEquippedItems() {
    const equipped = {};
    for (const [slot, equipmentId] of Object.entries(this.gameState.player.equipment)) {
      if (equipmentId) {
        const equipment = this.playerEquipment.find(e => e.id === equipmentId);
        if (equipment) {
          equipped[slot] = equipment;
        }
      }
    }
    return equipped;
  }

  /**
   * 计算穿戴装备的属性加成
   */
  getEquipmentBonus() {
    const equipped = this.getEquippedItems();
    let bonus = { atk: 0, def: 0, hp: 0, crit_rate: 0, spirit_rate: 0 };

    for (const equipment of Object.values(equipped)) {
      if (equipment.stats) {
        for (const [stat, value] of Object.entries(equipment.stats)) {
          if (bonus[stat] !== undefined) {
            bonus[stat] += value;
          }
        }
      }
      // 加上强化加成
      if (equipment.bonusStats) {
        for (const [stat, value] of Object.entries(equipment.bonusStats)) {
          if (bonus[stat] !== undefined) {
            bonus[stat] += value;
          }
        }
      }
    }

    return bonus;
  }

  /**
   * 回收装备（转换为材料）
   */
  recycleEquipment(equipmentId) {
    const index = this.playerEquipment.findIndex(e => e.id === equipmentId);
    if (index < 0) {
      return { success: false, message: '装备不存在' };
    }

    const equipment = this.playerEquipment[index];
    
    // 检查是否正在穿戴
    for (const [slot, equippedId] of Object.entries(this.gameState.player.equipment)) {
      if (equippedId === equipmentId) {
        return { success: false, message: '请先卸下装备再回收' };
      }
    }

    // 根据品质返还材料
    const recycleRate = EQUIPMENT_QUALITY[equipment.quality]?.multiplier || 0.5;
    const refundMaterials = {};
    
    for (const [materialId, amount] of Object.entries(FORGE_RECIPES[equipment.id]?.materials || {})) {
      const refund = Math.max(1, Math.floor(amount * recycleRate));
      refundMaterials[materialId] = refund;
    }

    // 返还材料到洞府
    this.gameState.cave.resources.materials = Math.floor(
      this.gameState.cave.resources.materials
    ) + Object.values(refundMaterials).reduce((a, b) => a + b, 0);

    // 移除装备
    this.playerEquipment.splice(index, 1);

    return {
      success: true,
      message: `回收成功，获得 ${Object.values(refundMaterials).reduce((a, b) => a + b, 0)} 个材料`,
      refund: refundMaterials
    };
  }

  /**
   * 获取系统统计
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * 获取所有可用材料定义
   */
  getMaterialTypes() {
    return { ...FORGE_MATERIALS };
  }

  // ==================== 装备强化系统 ====================

  /**
   * 获取强化消耗
   * @param {number} level - 当前强化等级
   * @returns {object} - 消耗对象
   */
  getStrengthenCost(level) {
    return getStrengthenCost(level);
  }

  /**
   * 获取强化成功率
   * @param {number} level - 当前强化等级
   * @returns {number} - 成功率（0-100）
   */
  getStrengthenSuccessRate(level) {
    return getStrengthenSuccessRate(level);
  }

  /**
   * 检查是否可以强化装备
   * @param {number} equipmentId - 装备ID
   * @returns {object} - 检查结果
   */
  canStrengthen(equipmentId) {
    const equipment = this.playerEquipment.find(e => e.id === equipmentId);
    if (!equipment) {
      return { success: false, message: '装备不存在' };
    }

    const level = equipment.strengthenLevel || 0;
    
    // 检查是否达到最大强化等级
    if (level >= STRENGTHEN_CONFIG.maxLevel) {
      return { success: false, message: `已达到最大强化等级 ${STRENGTHEN_CONFIG.maxLevel}` };
    }

    // 获取强化消耗
    const cost = getStrengthenCost(level);
    
    // 检查强化石数量（从洞府资源获取）
    const strengthenStones = Math.floor(this.gameState.cave.resources.materials || 0);
    if (strengthenStones < cost.strengthenStones) {
      return { 
        success: false, 
        message: `强化石不足: 需要 ${cost.strengthenStones} 个，现有 ${strengthenStones} 个` 
      };
    }

    // 检查灵石数量
    const spiritStones = this.gameState.player.spiritStones || 0;
    if (spiritStones < cost.spiritStones) {
      return { 
        success: false, 
        message: `灵石不足: 需要 ${cost.spiritStones} 个，现有 ${spiritStones} 个` 
      };
    }

    // 获取成功率
    const successRate = getStrengthenSuccessRate(level);
    
    return { 
      success: true, 
      message: `材料充足，可以强化（成功率: ${successRate}%）`,
      cost: cost,
      successRate: successRate,
      currentLevel: level,
      nextLevel: level + 1
    };
  }

  /**
   * 执行装备强化
   * @param {number} equipmentId - 装备ID
   * @returns {object} - 强化结果
   */
  strengthen(equipmentId) {
    // 检查是否可以强化
    const canCheck = this.canStrengthen(equipmentId);
    if (!canCheck.success) {
      return canCheck;
    }

    const equipment = this.playerEquipment.find(e => e.id === equipmentId);
    if (!equipment) {
      return { success: false, message: '装备不存在' };
    }

    const currentLevel = equipment.strengthenLevel || 0;
    const cost = getStrengthenCost(currentLevel);
    const successRate = getStrengthenSuccessRate(currentLevel);

    // 扣除材料
    // 强化石从洞府材料中扣除
    this.gameState.cave.resources.materials = Math.max(0, 
      Math.floor(this.gameState.cave.resources.materials) - cost.strengthenStones
    );
    // 灵石从玩家灵石中扣除
    this.gameState.player.spiritStones -= cost.spiritStones;

    // 随机判定强化成功/失败
    const roll = Math.random() * 100;
    const isSuccess = roll < successRate;

    if (isSuccess) {
      // 强化成功
      const oldLevel = currentLevel;
      const newLevel = currentLevel + 1;
      
      // 更新装备强化等级
      equipment.strengthenLevel = newLevel;
      
      // 计算属性提升
      const oldBonus = calculateStrengthenBonus({ ...equipment, strengthenLevel: oldLevel });
      const newBonus = calculateStrengthenBonus(equipment);
      
      // 应用属性加成到装备
      if (!equipment.stats) equipment.stats = {};
      if (!equipment.bonusStats) equipment.bonusStats = {};
      
      for (const [stat, value] of Object.entries(newBonus)) {
        equipment.bonusStats[stat] = value;
      }

      // 更新统计
      this.stats.totalStrengthenSuccess = (this.stats.totalStrengthenSuccess || 0) + 1;

      return {
        success: true,
        message: `强化成功！${equipment.name} (+${oldLevel} → +${newLevel})`,
        equipment: this.getEquipmentInfo(equipment),
        oldLevel: oldLevel,
        newLevel: newLevel,
        bonus: equipment.bonusStats
      };
    } else {
      // 强化失败，不降级
      this.stats.totalStrengthenFailed = (this.stats.totalStrengthenFailed || 0) + 1;

      return {
        success: false,
        message: `强化失败！${equipment.name} 保持 +${currentLevel} 级（失败不降级）`,
        equipment: this.getEquipmentInfo(equipment),
        currentLevel: currentLevel,
        rolled: roll.toFixed(1),
        successRate: successRate
      };
    }
  }

  /**
   * 获取装备详细信息（包括强化等级和加成）
   * @param {object} equipment - 装备对象
   * @returns {object} - 装备信息
   */
  getEquipmentInfo(equipment) {
    const level = equipment.strengthenLevel || 0;
    const bonus = equipment.bonusStats || {};
    
    // 合并基础属性和强化加成
    const totalStats = { ...equipment.stats };
    for (const [stat, value] of Object.entries(bonus)) {
      totalStats[stat] = (totalStats[stat] || 0) + value;
    }

    return {
      id: equipment.id,
      name: equipment.name,
      type: equipment.type,
      quality: equipment.quality,
      qualityName: equipment.qualityName,
      color: equipment.color,
      stats: equipment.stats,
      bonusStats: bonus,
      totalStats: totalStats,
      strengthenLevel: level,
      maxLevel: STRENGTHEN_CONFIG.maxLevel,
      createdAt: equipment.createdAt
    };
  }

  /**
   * 获取指定装备的强化信息
   * @param {number} equipmentId - 装备ID
   * @returns {object} - 强化信息
   */
  getStrengthenInfo(equipmentId) {
    const equipment = this.playerEquipment.find(e => e.id === equipmentId);
    if (!equipment) {
      return null;
    }

    const level = equipment.strengthenLevel || 0;
    const cost = getStrengthenCost(level);
    const successRate = getStrengthenSuccessRate(level);
    const nextCost = level < STRENGTHEN_CONFIG.maxLevel ? getStrengthenCost(level + 1) : null;
    const nextSuccessRate = level < STRENGTHEN_CONFIG.maxLevel ? getStrengthenSuccessRate(level + 1) : null;

    return {
      equipmentId: equipmentId,
      equipmentName: equipment.name,
      currentLevel: level,
      maxLevel: STRENGTHEN_CONFIG.maxLevel,
      currentCost: cost,
      currentSuccessRate: successRate,
      nextLevel: level < STRENGTHEN_CONFIG.maxLevel ? level + 1 : null,
      nextCost: nextCost,
      nextSuccessRate: nextSuccessRate,
      bonusStats: equipment.bonusStats || {},
      isMaxLevel: level >= STRENGTHEN_CONFIG.maxLevel
    };
  }

  /**
   * 获取所有可强化的装备列表
   * @returns {array} - 可强化装备列表
   */
  getStrengthenableEquipment() {
    return this.playerEquipment
      .filter(e => (e.strengthenLevel || 0) < STRENGTHEN_CONFIG.maxLevel)
      .map(e => this.getStrengthenInfo(e.id));
  }
}

// 创建全局实例
const forgeSystem = new ForgeSystem();

// 导出
window.FORGE_RECIPES = FORGE_RECIPES;
window.EQUIPMENT_TYPES = EQUIPMENT_TYPES;
window.EQUIPMENT_QUALITY = EQUIPMENT_QUALITY;
window.FORGE_MATERIALS = FORGE_MATERIALS;
window.ForgeSystem = ForgeSystem;
window.forgeSystem = forgeSystem;
