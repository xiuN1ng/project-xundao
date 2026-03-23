// 炼丹合成系统 - 药材配方、成功率计算

export interface Herb {
  herbId: string
  name: string
  nameCN: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  level: number // 药材等级需求
  attribute: 'fire' | 'water' | 'earth' | 'metal' | 'wood'
}

export interface PillRecipe {
  recipeId: string
  name: string
  nameCN: string
  pillGrade: 'low' | 'mid' | 'high' | 'super'
  requiredHerbs: { herbId: string; count: number }[]
  requiredCultivationLevel: number
  baseSuccessRate: number // 基础成功率 (0-1)
  effect: {
    type: string
    value: number
    description: string
  }
  requiredSectLevel?: number // 需要的宗门等级
}

export interface PlayerAlchemyData {
  playerId: string
  knownRecipes: string[] // 已解锁的配方
  alchemyCount: number // 炼丹次数
  successCount: number // 成功次数
  totalMaterials: number // 消耗的总材料数
}

// 药材库
export const HERBS: Herb[] = [
  // 普通药材 (common)
  { herbId: 'lingzhi', name: 'Lingzhi', nameCN: '灵芝', rarity: 'common', level: 1, attribute: 'wood' },
  { herbId: 'renshen', name: 'Ginseng', nameCN: '人参', rarity: 'common', level: 1, attribute: 'earth' },
  { herbId: 'huangqi', name: 'Astragalus', nameCN: '黄芪', rarity: 'common', level: 1, attribute: 'earth' },
  { herbId: 'dangshen', name: 'Codonopsis', nameCN: '党参', rarity: 'common', level: 1, attribute: 'earth' },
  { herbId: 'baizhu', name: 'Atractylodes', nameCN: '白术', rarity: 'common', level: 1, attribute: 'earth' },
  { herbId: 'fuling', name: 'Poria', nameCN: '茯苓', rarity: 'common', level: 1, attribute: 'wood' },
  { herbId: 'gouqi', name: 'Goji Berry', nameCN: '枸杞', rarity: 'common', level: 1, attribute: 'fire' },
  { herbId: 'jinyinhua', name: 'Honeysuckle', nameCN: '金银花', rarity: 'common', level: 1, attribute: 'fire' },
  
  // 稀有药材 (rare)
  { herbId: 'xianlingpi', name: 'Xianlingpi', nameCN: '仙灵脾', rarity: 'rare', level: 20, attribute: 'wood' },
  { herbId: 'wanggiao', name: 'Wanggiao', nameCN: '王瓜', rarity: 'rare', level: 20, attribute: 'water' },
  { herbId: 'tianqi', name: 'Tianqi', nameCN: '天齐', rarity: 'rare', level: 20, attribute: 'metal' },
  { herbId: 'yuzhu', name: 'Yu Zhu', nameCN: '玉竹', rarity: 'rare', level: 25, attribute: 'water' },
  { herbId: 'shengdihuang', name: 'Rehmannia', nameCN: '生地黄', rarity: 'rare', level: 25, attribute: 'fire' },
  { herbId: 'maidong', name: 'Ophiopogon', nameCN: '麦冬', rarity: 'rare', level: 25, attribute: 'water' },
  { herbId: 'shanyurou', name: 'Shanyurou', nameCN: '山萸肉', rarity: 'rare', level: 30, attribute: 'wood' },
  { herbId: 'baishao', name: 'White Peony', nameCN: '白芍', rarity: 'rare', level: 30, attribute: 'wood' },
  
  // 史诗药材 (epic)
  { herbId: 'renshen_guo', name: 'Milennial Ginseng', nameCN: '人参果', rarity: 'epic', level: 50, attribute: 'earth' },
  { herbId: 'xianglu', name: 'Xianglu', nameCN: '香炉', rarity: 'epic', level: 50, attribute: 'fire' },
  { herbId: 'qianlima', name: 'Qianlima', nameCN: '千里马', rarity: 'epic', level: 55, attribute: 'metal' },
  { herbId: 'bailian', name: 'Bailian', nameCN: '白莲', rarity: 'epic', level: 55, attribute: 'water' },
  { herbId: 'jinyutuo', name: 'Jinyutuo', nameCN: '金羽拓', rarity: 'epic', level: 60, attribute: 'metal' },
  { herbId: 'cangzhuo', name: 'Cangzhuo', nameCN: '苍卓', rarity: 'epic', level: 60, attribute: 'wood' },
  
  // 传说药材 (legendary)
  { herbId: 'yaohezhi', name: 'Yaohezhi', nameCN: '瑶池芝', rarity: 'legendary', level: 80, attribute: 'water' },
  { herbId: 'jade_herb', name: 'Jade Spirit Herb', nameCN: '玉灵草', rarity: 'legendary', level: 85, attribute: 'wood' },
  { herbId: 'phoenix_herb', name: 'Phoenix Flame Herb', nameCN: '凤凰焰', rarity: 'legendary', level: 90, attribute: 'fire' },
  { herbId: 'thunder_herb', name: 'Thunder Root', nameCN: '雷霆根', rarity: 'legendary', level: 95, attribute: 'metal' },
  { herbId: 'dragon_blood', name: 'Dragon Blood Rose', nameCN: '龙血玫瑰', rarity: 'legendary', level: 100, attribute: 'fire' },
]

// 炼丹配方
export const PILL_RECIPES: PillRecipe[] = [
  // 低阶丹药 (low)
  {
    recipeId: 'qi_boost_low',
    name: 'Qi Boost Pill (Low)',
    nameCN: '聚气丹(低)',
    pillGrade: 'low',
    requiredHerbs: [
      { herbId: 'lingzhi', count: 2 },
      { herbId: 'renshen', count: 1 },
    ],
    requiredCultivationLevel: 1,
    baseSuccessRate: 0.9,
    effect: { type: 'cultivation_exp', value: 100, description: '增加100点修炼经验' }
  },
  {
    recipeId: 'heal_low',
    name: 'Healing Pill (Low)',
    nameCN: '回血丹(低)',
    pillGrade: 'low',
    requiredHerbs: [
      { herbId: 'dangshen', count: 2 },
      { herbId: 'gouqi', count: 1 },
    ],
    requiredCultivationLevel: 1,
    baseSuccessRate: 0.85,
    effect: { type: 'hp_restore', value: 50, description: '恢复50点生命值' }
  },
  {
    recipeId: 'spirit_low',
    name: 'Spirit Pill (Low)',
    nameCN: '养神丹(低)',
    pillGrade: 'low',
    requiredHerbs: [
      { herbId: 'fuling', count: 2 },
      { herbId: 'huangqi', count: 1 },
    ],
    requiredCultivationLevel: 5,
    baseSuccessRate: 0.8,
    effect: { type: 'spirit_restore', value: 30, description: '恢复30点神识' }
  },
  
  // 中阶丹药 (mid)
  {
    recipeId: 'qi_boost_mid',
    name: 'Qi Boost Pill (Mid)',
    nameCN: '聚气丹(中)',
    pillGrade: 'mid',
    requiredHerbs: [
      { herbId: 'xianlingpi', count: 2 },
      { herbId: 'lingzhi', count: 2 },
      { herbId: 'renshen', count: 1 },
    ],
    requiredCultivationLevel: 20,
    baseSuccessRate: 0.7,
    effect: { type: 'cultivation_exp', value: 500, description: '增加500点修炼经验' }
  },
  {
    recipeId: 'heal_mid',
    name: 'Healing Pill (Mid)',
    nameCN: '回血丹(中)',
    pillGrade: 'mid',
    requiredHerbs: [
      { herbId: 'yuzhu', count: 2 },
      { herbId: 'dangshen', count: 2 },
      { herbId: 'gouqi', count: 2 },
    ],
    requiredCultivationLevel: 25,
    baseSuccessRate: 0.65,
    effect: { type: 'hp_restore', value: 200, description: '恢复200点生命值' }
  },
  {
    recipeId: 'attack_boost_mid',
    name: 'Attack Boost Pill (Mid)',
    nameCN: '攻击丹(中)',
    pillGrade: 'mid',
    requiredHerbs: [
      { herbId: 'shengdihuang', count: 2 },
      { herbId: 'xianlingpi', count: 2 },
      { herbId: 'renshen', count: 1 },
    ],
    requiredCultivationLevel: 30,
    baseSuccessRate: 0.6,
    effect: { type: 'attack_boost', value: 10, description: '攻击力+10 (持续1小时)' }
  },
  {
    recipeId: 'defense_boost_mid',
    name: 'Defense Boost Pill (Mid)',
    nameCN: '防御丹(中)',
    pillGrade: 'mid',
    requiredHerbs: [
      { herbId: 'baishao', count: 2 },
      { herbId: 'xianlingpi', count: 2 },
      { herbId: 'huangqi', count: 2 },
    ],
    requiredCultivationLevel: 30,
    baseSuccessRate: 0.6,
    effect: { type: 'defense_boost', value: 10, description: '防御力+10 (持续1小时)' }
  },
  
  // 高阶丹药 (high)
  {
    recipeId: 'qi_boost_high',
    name: 'Qi Boost Pill (High)',
    nameCN: '聚气丹(高)',
    pillGrade: 'high',
    requiredHerbs: [
      { herbId: 'renshen_guo', count: 1 },
      { herbId: 'xianglu', count: 2 },
      { herbId: 'xianlingpi', count: 3 },
    ],
    requiredCultivationLevel: 50,
    baseSuccessRate: 0.5,
    effect: { type: 'cultivation_exp', value: 2000, description: '增加2000点修炼经验' }
  },
  {
    recipeId: 'heal_high',
    name: 'Healing Pill (High)',
    nameCN: '回血丹(高)',
    pillGrade: 'high',
    requiredHerbs: [
      { herbId: 'bailian', count: 2 },
      { herbId: 'yuzhu', count: 3 },
      { herbId: 'maidong', count: 2 },
    ],
    requiredCultivationLevel: 55,
    baseSuccessRate: 0.45,
    effect: { type: 'hp_restore', value: 1000, description: '恢复1000点生命值' }
  },
  {
    recipeId: 'breakthrough_high',
    name: 'Breakthrough Pill (High)',
    nameCN: '突破丹(高)',
    pillGrade: 'high',
    requiredHerbs: [
      { herbId: 'renshen_guo', count: 1 },
      { herbId: 'jinyutuo', count: 2 },
      { herbId: 'cangzhuo', count: 2 },
      { herbId: 'shanyurou', count: 2 },
    ],
    requiredCultivationLevel: 60,
    baseSuccessRate: 0.4,
    effect: { type: 'realm_breakthrough', value: 1, description: '协助突破境界 (成功率+10%)' }
  },
  
  // 超阶丹药 (super)
  {
    recipeId: 'immortal_pill',
    name: 'Immortal Pill',
    nameCN: '仙丹',
    pillGrade: 'super',
    requiredHerbs: [
      { herbId: 'yaohezhi', count: 1 },
      { herbId: 'jade_herb', count: 1 },
      { herbId: 'phoenix_herb', count: 1 },
      { herbId: 'thunder_herb', count: 1 },
      { herbId: 'dragon_blood', count: 1 },
    ],
    requiredCultivationLevel: 80,
    baseSuccessRate: 0.25,
    effect: { type: 'cultivation_exp', value: 10000, description: '增加10000点修炼经验' }
  },
  {
    recipeId: 'immortal_transformation',
    name: 'Immortal Transformation Pill',
    nameCN: '化仙丹',
    pillGrade: 'super',
    requiredHerbs: [
      { herbId: 'dragon_blood', count: 1 },
      { herbId: 'phoenix_herb', count: 2 },
      { herbId: 'jade_herb', count: 2 },
      { herbId: 'yaohezhi', count: 2 },
    ],
    requiredCultivationLevel: 100,
    baseSuccessRate: 0.15,
    effect: { type: 'become_immortal', value: 1, description: '获得仙人身份' },
    requiredSectLevel: 10
  },
]

// 炼丹配置
export const ALCHEMY_CONFIG = {
  // 成功率修正
  successRateModifiers: {
    // 炼制同属性丹药加成
    sameAttributeBonus: 0.05,
    // 增加成功率的道具
    alchemyToolBonus: 0.1,
    // 炼丹技能等级加成 (每级)
    skillLevelBonus: 0.02,
    // 炼制低阶丹药成功率修正
    lowGradePenalty: 0.1,
  },
  
  // 失败奖励
  failureRewards: {
    // 返还部分材料 (百分比)
    materialReturn: 0.3,
    // 获得炼丹经验
    alchemyExpGain: 10,
  },
  
  // 熟练度系统
  mastery: {
    // 每次成功增加熟练度
    expPerSuccess: 15,
    // 每次失败增加熟练度
    expPerFailure: 5,
    // 熟练度等级上限
    maxLevel: 100,
    // 每级成功率加成
    bonusPerLevel: 0.005,
  },
  
  // 炼丹CD (毫秒)
  cooldown: 1000,
}

// 炼丹师技能
export interface AlchemySkill {
  playerId: string
  skillLevel: number // 1-100
  totalExp: number
}

export class AlchemySystem {
  private playerData: Map<string, PlayerAlchemyData> = new Map()
  private alchemySkills: Map<string, AlchemySkill> = new Map()
  
  // 获取玩家数据
  getPlayerData(playerId: string): PlayerAlchemyData {
    if (this.playerData.has(playerId)) {
      return this.playerData.get(playerId)!
    }
    
    const newData: PlayerAlchemyData = {
      playerId,
      knownRecipes: ['qi_boost_low', 'heal_low', 'spirit_low'], // 初始配方
      alchemyCount: 0,
      successCount: 0,
      totalMaterials: 0,
    }
    
    this.playerData.set(playerId, newData)
    return newData
  }
  
  // 获取炼丹技能
  getAlchemySkill(playerId: string): AlchemySkill {
    if (this.alchemySkills.has(playerId)) {
      return this.alchemySkills.get(playerId)!
    }
    
    const newSkill: AlchemySkill = {
      playerId,
      skillLevel: 1,
      totalExp: 0,
    }
    
    this.alchemySkills.set(playerId, newSkill)
    return newSkill
  }
  
  // 计算实际成功率
  calculateSuccessRate(
    playerId: string,
    recipe: PillRecipe,
    playerCultivationLevel: number,
    playerSectLevel: number = 0
  ): number {
    let successRate = recipe.baseSuccessRate
    
    // 检查修为等级是否满足
    if (playerCultivationLevel < recipe.requiredCultivationLevel) {
      return 0 // 修为不足无法炼制
    }
    
    // 检查宗门等级要求（如果有）
    if (recipe.requiredSectLevel && playerSectLevel < recipe.requiredSectLevel) {
      return 0
    }
    
    // 炼丹技能加成
    const skill = this.getAlchemySkill(playerId)
    successRate += skill.skillLevel * ALCHEMY_CONFIG.successRateModifiers.skillLevelBonus
    
    // 限制成功率范围
    return Math.min(0.95, Math.max(0.05, successRate))
  }
  
  // 检查材料是否足够
  checkMaterials(playerHerbs: Map<string, number>, recipe: PillRecipe): boolean {
    for (const required of recipe.requiredHerbs) {
      const playerCount = playerHerbs.get(required.herbId) || 0
      if (playerCount < required.count) {
        return false
      }
    }
    return true
  }
  
  // 消耗材料
  consumeMaterials(playerHerbs: Map<string, number>, recipe: PillRecipe): void {
    for (const required of recipe.requiredHerbs) {
      const current = playerHerbs.get(required.herbId) || 0
      playerHerbs.set(required.herbId, current - required.count)
    }
  }
  
  // 炼制丹药
  async craftPill(
    playerId: string,
    recipeId: string,
    playerHerbs: Map<string, number>,
    playerCultivationLevel: number,
    playerSectLevel: number = 0
  ): Promise<{
    success: boolean
    pill?: { recipeId: string; nameCN: string; effect: any }
    gainedExp: number
    returnedMaterials?: { herbId: string; count: number }[]
    message: string
  }> {
    const recipe = PILL_RECIPES.find(r => r.recipeId === recipeId)
    if (!recipe) {
      return { success: false, gainedExp: 0, message: '未找到该配方' }
    }
    
    // 检查配方是否已解锁
    const playerData = this.getPlayerData(playerId)
    if (!playerData.knownRecipes.includes(recipeId)) {
      return { success: false, gainedExp: 0, message: '未解锁该配方' }
    }
    
    // 检查材料
    if (!this.checkMaterials(playerHerbs, recipe)) {
      return { success: false, gainedExp: 0, message: '材料不足' }
    }
    
    // 计算成功率
    const successRate = this.calculateSuccessRate(playerId, recipe, playerCultivationLevel, playerSectLevel)
    
    // 消耗材料
    this.consumeMaterials(playerHerbs, recipe)
    
    // 记录消耗
    playerData.alchemyCount++
    playerData.totalMaterials += recipe.requiredHerbs.reduce((sum, h) => sum + h.count, 0)
    
    // 随机判定
    const roll = Math.random()
    const isSuccess = roll < successRate
    
    // 更新熟练度
    const skill = this.getAlchemySkill(playerId)
    const expGain = isSuccess 
      ? ALCHEMY_CONFIG.mastery.expPerSuccess 
      : ALCHEMY_CONFIG.mastery.expPerFailure
    
    skill.totalExp += expGain
    // 检查升级
    const newLevel = Math.floor(skill.totalExp / 100) + 1
    if (newLevel > skill.skillLevel && newLevel <= ALCHEMY_CONFIG.mastery.maxLevel) {
      skill.skillLevel = newLevel
    }
    
    if (isSuccess) {
      playerData.successCount++
      
      return {
        success: true,
        pill: {
          recipeId: recipe.recipeId,
          nameCN: recipe.nameCN,
          effect: recipe.effect
        },
        gainedExp: expGain,
        message: `炼制成功！获得${recipe.nameCN}`
      }
    } else {
      // 失败返还部分材料
      const returnedMaterials: { herbId: string; count: number }[] = []
      for (const required of recipe.requiredHerbs) {
        const returnCount = Math.floor(required.count * ALCHEMY_CONFIG.failureRewards.materialReturn)
        if (returnCount > 0) {
          returnedMaterials.push({ herbId: required.herbId, count: returnCount })
          const current = playerHerbs.get(required.herbId) || 0
          playerHerbs.set(required.herbId, current + returnCount)
        }
      }
      
      return {
        success: false,
        gainedExp: expGain,
        returnedMaterials,
        message: '炼制失败，部分材料已返还'
      }
    }
  }
  
  // 解锁配方
  unlockRecipe(playerId: string, recipeId: string): boolean {
    const recipe = PILL_RECIPES.find(r => r.recipeId === recipeId)
    if (!recipe) return false
    
    const playerData = this.getPlayerData(playerId)
    if (playerData.knownRecipes.includes(recipeId)) {
      return false // 已解锁
    }
    
    playerData.knownRecipes.push(recipeId)
    return true
  }
  
  // 获取药材信息
  getHerbInfo(herbId: string): Herb | null {
    return HERBS.find(h => h.herbId === herbId) || null
  }
  
  // 获取配方信息
  getRecipeInfo(recipeId: string): PillRecipe | null {
    return PILL_RECIPES.find(r => r.recipeId === recipeId) || null
  }
  
  // 获取可解锁的配方（基于修为等级）
  getUnlockableRecipes(playerId: string, playerCultivationLevel: number): PillRecipe[] {
    return PILL_RECIPES.filter(r => 
      r.requiredCultivationLevel <= playerCultivationLevel && 
      !this.getPlayerData(playerId).knownRecipes.includes(r.recipeId)
    )
  }
  
  // 获取玩家统计
  getPlayerStats(playerId: string): {
    alchemyCount: number
    successCount: number
    successRate: number
    skillLevel: number
    knownRecipes: number
  } {
    const playerData = this.getPlayerData(playerId)
    const skill = this.getAlchemySkill(playerId)
    
    return {
      alchemyCount: playerData.alchemyCount,
      successCount: playerData.successCount,
      successRate: playerData.alchemyCount > 0 
        ? (playerData.successCount / playerData.alchemyCount * 100).toFixed(1) + '%'
        : '0%',
      skillLevel: skill.skillLevel,
      knownRecipes: playerData.knownRecipes.length
    }
  }
}

export const alchemySystem = new AlchemySystem()
