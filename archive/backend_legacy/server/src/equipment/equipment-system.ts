// 装备系统 - 装备强化与精炼
// v25 版本：装备强化、装备精炼

export interface Equipment {
  equipmentId: string
  playerId: string
  templateId: string     // 装备模板ID
  name: string
  nameCN: string
  type: EquipmentType
  quality: EquipmentQuality
  level: number         // 装备等级
  position: EquipmentPosition // 装备位置
  
  // 强化属性
  strengthenLevel: number   // 强化等级 (0-15)
  strengthenAttrs: Record<string, number>  // 强化属性
  
  // 精炼属性
  refineLevel: number       // 精炼等级 (0-10)
  refineAttrs: Record<string, number>  // 精炼属性
  
  // 星级 (装备升星)
  starLevel: number       // 星级 (0-12)
  starAttrs: Record<string, number>  // 星级属性
  
  // 属性
  baseAttributes: Record<string, number>  // 基础属性
  additionalAttributes: Record<string, number>  // 额外属性
  
  // 绑定状态
  bindStatus: 'unbound' | 'bind_on_equip' | 'bound'
  
  // 时间戳
  createdAt: number
  updatedAt: number
}

export type EquipmentType = 
  | 'weapon'      // 武器
  | 'armor'       // 护甲
  | 'helmet'      // 头盔
  | 'boots'       // 靴子
  | 'ring'        // 戒指
  | 'necklace'    // 项链
  | 'bracelet'    // 手镯
  | 'belt'        // 腰带
  | 'cloak'       // 披风
  | 'amulet'      // 护符

export type EquipmentQuality = 
  | 'white'       // 白色 (普通)
  | 'green'       // 绿色 (优秀)
  | 'blue'        // 蓝色 (精良)
  | 'purple'       // 紫色 (史诗)
  | 'orange'      // 橙色 (传说)
  | 'red'         // 红色 (神话)

export type EquipmentPosition = 
  | 'weapon' 
  | 'head' 
  | 'body' 
  | 'legs' 
  | 'feet' 
  | 'hand' 
  | 'necklace' 
  | 'ring1' 
  | 'ring2' 
  | 'bracelet1' 
  | 'bracelet2'

// 装备模板
export interface EquipmentTemplate {
  templateId: string
  name: string
  nameCN: string
  type: EquipmentType
  quality: EquipmentQuality
  level: number           // 装备等级需求
  position: EquipmentPosition
  
  baseAttributes: Record<string, number>
  
  // 强化配置
  strengthen: {
    maxLevel: number
    attrsPerLevel: Record<string, number>
    costs: StrengthenCost[]
  }
  
  // 精炼配置
  refine: {
    maxLevel: number
    attrsPerLevel: Record<string, number>
    costs: RefineCost[]
  }
  
  // 星级配置
  star: {
    maxLevel: number
    attrsPerLevel: Record<string, number>
    costs: StarCost[]
  }
}

export interface StrengthenCost {
  level: number
  gold: number
  stone: number           // 强化石数量
  successRate: number    // 成功率 (0-1)
  protectItem?: string    // 保护道具ID
}

export interface RefineCost {
  level: number
  gold: number
  refineStone: number    // 精炼石数量
  successRate: number
  materials?: RefineMaterial[]
}

export interface RefineMaterial {
  itemId: string
  count: number
}

export interface StarCost {
  level: number
  gold: number
  starStone: number      // 升星石
  successRate: number
  failProtect: boolean   // 失败是否保级
}

// 玩家装备数据
export interface PlayerEquipmentData {
  playerId: string
  equipments: Map<string, Equipment>  // equipmentId -> Equipment
  strengthenStone: number     // 强化石数量
  refineStone: number        // 精炼石数量
  starStone: number          // 升星石数量
  gold: number               // 金币
  lastUpdateTime: number
}

// 装备强化结果
export interface StrengthenResult {
  success: boolean
  newLevel: number
  newAttrs: Record<string, number>
  consumeGold: number
  consumeStone: number
  message: string
}

// 装备精炼结果
export interface RefineResult {
  success: boolean
  newLevel: number
  newAttrs: Record<string, number>
  consumeGold: number
  consumeRefineStone: number
  message: string
}

// 装备升星结果
export interface StarResult {
  success: boolean
  newLevel: number
  newAttrs: Record<string, number>
  consumeGold: number
  consumeStarStone: number
  message: string
}

// 装备强化配置
export const EQUIPMENT_STRENGTHEN_CONFIG = {
  // 强化石消耗表 (等级 -> {gold, stone, successRate})
  // 成功率配置：1-5级90%，6-10级70%，11-15级50%
  costs: [
    { level: 1, gold: 1000, stone: 1, successRate: 0.90 },
    { level: 2, gold: 2000, stone: 2, successRate: 0.90 },
    { level: 3, gold: 3000, stone: 3, successRate: 0.90 },
    { level: 4, gold: 5000, stone: 5, successRate: 0.90 },
    { level: 5, gold: 8000, stone: 8, successRate: 0.90 },
    { level: 6, gold: 12000, stone: 12, successRate: 0.70 },
    { level: 7, gold: 18000, stone: 18, successRate: 0.70 },
    { level: 8, gold: 25000, stone: 25, successRate: 0.70 },
    { level: 9, gold: 35000, stone: 35, successRate: 0.70 },
    { level: 10, gold: 50000, stone: 50, successRate: 0.70 },
    { level: 11, gold: 70000, stone: 70, successRate: 0.50 },
    { level: 12, gold: 100000, stone: 100, successRate: 0.50 },
    { level: 13, gold: 150000, stone: 150, successRate: 0.50 },
    { level: 14, gold: 250000, stone: 250, successRate: 0.50 },
    { level: 15, gold: 500000, stone: 500, successRate: 0.50 },
  ] as StrengthenCost[],
  
  // 强化属性加成 (每级)
  attrsPerLevel: {
    weapon: { attack: 10 },
    armor: { defense: 15, hp: 50 },
    helmet: { defense: 8, hp: 30 },
    boots: { dodge: 2, speed: 5 },
    ring: { attack: 5, crit: 1 },
    necklace: { hp: 30, defense: 5 },
    bracelet: { defense: 5, hp: 30 },
    belt: { hp: 20, defense: 5 },
    cloak: { defense: 10, dodge: 1 },
    amulet: { attack: 5, hp: 20 },
  }
}

// 装备精炼配置
export const EQUIPMENT_REFINE_CONFIG = {
  costs: [
    { level: 1, gold: 2000, refineStone: 2, successRate: 1.0 },
    { level: 2, gold: 4000, refineStone: 4, successRate: 1.0 },
    { level: 3, gold: 6000, refineStone: 6, successRate: 0.95 },
    { level: 4, gold: 10000, refineStone: 10, successRate: 0.90 },
    { level: 5, gold: 15000, refineStone: 15, successRate: 0.85 },
    { level: 6, gold: 25000, refineStone: 25, successRate: 0.80 },
    { level: 7, gold: 40000, refineStone: 40, successRate: 0.75 },
    { level: 8, gold: 60000, refineStone: 60, successRate: 0.70 },
    { level: 9, gold: 100000, refineStone: 100, successRate: 0.65 },
    { level: 10, gold: 200000, refineStone: 200, successRate: 0.60 },
  ] as RefineCost[],
  
  // 精炼属性加成 (每级, 百分比)
  attrsPerLevelPercent: {
    weapon: { attack: 2 },
    armor: { defense: 3, hp: 3 },
    helmet: { defense: 2, hp: 2 },
    boots: { dodge: 0.5, speed: 1 },
    ring: { attack: 1, crit: 0.3 },
    necklace: { hp: 2, defense: 1 },
    bracelet: { defense: 1, hp: 2 },
    belt: { hp: 2, defense: 1 },
    cloak: { defense: 2, dodge: 0.3 },
    amulet: { attack: 1, hp: 2 },
  }
}

// 装备升星配置
export const EQUIPMENT_STAR_CONFIG = {
  costs: [
    { level: 1, gold: 5000, starStone: 1, successRate: 1.0, failProtect: true },
    { level: 2, gold: 10000, starStone: 2, successRate: 1.0, failProtect: true },
    { level: 3, gold: 15000, starStone: 3, successRate: 0.95, failProtect: true },
    { level: 4, gold: 25000, starStone: 5, successRate: 0.90, failProtect: true },
    { level: 5, gold: 40000, starStone: 8, successRate: 0.85, failProtect: false },
    { level: 6, gold: 60000, starStone: 12, successRate: 0.80, failProtect: false },
    { level: 7, gold: 100000, starStone: 20, successRate: 0.75, failProtect: false },
    { level: 8, gold: 150000, starStone: 30, successRate: 0.70, failProtect: false },
    { level: 9, gold: 250000, starStone: 50, successRate: 0.65, failProtect: false },
    { level: 10, gold: 400000, starStone: 80, successRate: 0.60, failProtect: false },
    { level: 11, gold: 600000, starStone: 120, successRate: 0.55, failProtect: false },
    { level: 12, gold: 1000000, starStone: 200, successRate: 0.50, failProtect: false },
  ] as StarCost[],
  
  // 星级属性加成 (每级, 百分比)
  attrsPerLevelPercent: {
    weapon: { attack: 3 },
    armor: { defense: 4, hp: 4 },
    helmet: { defense: 3, hp: 3 },
    boots: { dodge: 1, speed: 2 },
    ring: { attack: 2, crit: 0.5 },
    necklace: { hp: 3, defense: 2 },
    bracelet: { defense: 2, hp: 3 },
    belt: { hp: 3, defense: 2 },
    cloak: { defense: 3, dodge: 0.5 },
    amulet: { attack: 2, hp: 3 },
  }
}

// 装备基础属性模板
export const EQUIPMENT_TEMPLATES: EquipmentTemplate[] = [
  // 武器
  {
    templateId: 'weapon_sword_001',
    name: 'Iron Sword',
    nameCN: '铁剑',
    type: 'weapon',
    quality: 'white',
    level: 1,
    position: 'weapon',
    baseAttributes: { attack: 10 },
    strengthen: { maxLevel: 15, attrsPerLevel: {}, costs: [] },
    refine: { maxLevel: 10, attrsPerLevel: {}, costs: [] },
    star: { maxLevel: 12, attrsPerLevel: {}, costs: [] },
  },
  {
    templateId: 'weapon_sword_002',
    name: 'Steel Sword',
    nameCN: '钢剑',
    type: 'weapon',
    quality: 'green',
    level: 10,
    position: 'weapon',
    baseAttributes: { attack: 25 },
    strengthen: { maxLevel: 15, attrsPerLevel: {}, costs: [] },
    refine: { maxLevel: 10, attrsPerLevel: {}, costs: [] },
    star: { maxLevel: 12, attrsPerLevel: {}, costs: [] },
  },
  {
    templateId: 'weapon_sword_003',
    name: 'Silver Sword',
    nameCN: '银剑',
    type: 'weapon',
    quality: 'blue',
    level: 20,
    position: 'weapon',
    baseAttributes: { attack: 50 },
    strengthen: { maxLevel: 15, attrsPerLevel: {}, costs: [] },
    refine: { maxLevel: 10, attrsPerLevel: {}, costs: [] },
    star: { maxLevel: 12, attrsPerLevel: {}, costs: [] },
  },
  {
    templateId: 'weapon_sword_004',
    name: 'Golden Sword',
    nameCN: '金剑',
    type: 'weapon',
    quality: 'purple',
    level: 40,
    position: 'weapon',
    baseAttributes: { attack: 100 },
    strengthen: { maxLevel: 15, attrsPerLevel: {}, costs: [] },
    refine: { maxLevel: 10, attrsPerLevel: {}, costs: [] },
    star: { maxLevel: 12, attrsPerLevel: {}, costs: [] },
  },
  {
    templateId: 'weapon_sword_005',
    name: 'Dragon Sword',
    nameCN: '龙剑',
    type: 'weapon',
    quality: 'orange',
    level: 60,
    position: 'weapon',
    baseAttributes: { attack: 200 },
    strengthen: { maxLevel: 15, attrsPerLevel: {}, costs: [] },
    refine: { maxLevel: 10, attrsPerLevel: {}, costs: [] },
    star: { maxLevel: 12, attrsPerLevel: {}, costs: [] },
  },
  // 护甲
  {
    templateId: 'armor_001',
    name: 'Cloth Armor',
    nameCN: '布衣',
    type: 'armor',
    quality: 'white',
    level: 1,
    position: 'body',
    baseAttributes: { defense: 5, hp: 20 },
    strengthen: { maxLevel: 15, attrsPerLevel: {}, costs: [] },
    refine: { maxLevel: 10, attrsPerLevel: {}, costs: [] },
    star: { maxLevel: 12, attrsPerLevel: {}, costs: [] },
  },
  {
    templateId: 'armor_002',
    name: 'Leather Armor',
    nameCN: '皮甲',
    type: 'armor',
    quality: 'green',
    level: 10,
    position: 'body',
    baseAttributes: { defense: 15, hp: 50 },
    strengthen: { maxLevel: 15, attrsPerLevel: {}, costs: [] },
    refine: { maxLevel: 10, attrsPerLevel: {}, costs: [] },
    star: { maxLevel: 12, attrsPerLevel: {}, costs: [] },
  },
  {
    templateId: 'armor_003',
    name: 'Iron Armor',
    nameCN: '铁甲',
    type: 'armor',
    quality: 'blue',
    level: 20,
    position: 'body',
    baseAttributes: { defense: 30, hp: 100 },
    strengthen: { maxLevel: 15, attrsPerLevel: {}, costs: [] },
    refine: { maxLevel: 10, attrsPerLevel: {}, costs: [] },
    star: { maxLevel: 12, attrsPerLevel: {}, costs: [] },
  },
  {
    templateId: 'armor_004',
    name: 'Steel Armor',
    nameCN: '钢甲',
    type: 'armor',
    quality: 'purple',
    level: 40,
    position: 'body',
    baseAttributes: { defense: 60, hp: 200 },
    strengthen: { maxLevel: 15, attrsPerLevel: {}, costs: [] },
    refine: { maxLevel: 10, attrsPerLevel: {}, costs: [] },
    star: { maxLevel: 12, attrsPerLevel: {}, costs: [] },
  },
  {
    templateId: 'armor_005',
    name: 'Dragon Armor',
    nameCN: '龙甲',
    type: 'armor',
    quality: 'orange',
    level: 60,
    position: 'body',
    baseAttributes: { defense: 120, hp: 400 },
    strengthen: { maxLevel: 15, attrsPerLevel: {}, costs: [] },
    refine: { maxLevel: 10, attrsPerLevel: {}, costs: [] },
    star: { maxLevel: 12, attrsPerLevel: {}, costs: [] },
  },
  // 头盔
  {
    templateId: 'helmet_001',
    name: 'Cloth Helmet',
    nameCN: '布帽',
    type: 'helmet',
    quality: 'white',
    level: 1,
    position: 'head',
    baseAttributes: { defense: 3, hp: 10 },
    strengthen: { maxLevel: 15, attrsPerLevel: {}, costs: [] },
    refine: { maxLevel: 10, attrsPerLevel: {}, costs: [] },
    star: { maxLevel: 12, attrsPerLevel: {}, costs: [] },
  },
  // 靴子
  {
    templateId: 'boots_001',
    name: 'Cloth Boots',
    nameCN: '布鞋',
    type: 'boots',
    quality: 'white',
    level: 1,
    position: 'feet',
    baseAttributes: { dodge: 1, speed: 5 },
    strengthen: { maxLevel: 15, attrsPerLevel: {}, costs: [] },
    refine: { maxLevel: 10, attrsPerLevel: {}, costs: [] },
    star: { maxLevel: 12, attrsPerLevel: {}, costs: [] },
  },
  // 戒指
  {
    templateId: 'ring_001',
    name: 'Iron Ring',
    nameCN: '铁戒',
    type: 'ring',
    quality: 'white',
    level: 1,
    position: 'ring1',
    baseAttributes: { attack: 3, crit: 0.5 },
    strengthen: { maxLevel: 15, attrsPerLevel: {}, costs: [] },
    refine: { maxLevel: 10, attrsPerLevel: {}, costs: [] },
    star: { maxLevel: 12, attrsPerLevel: {}, costs: [] },
  },
  // 项链
  {
    templateId: 'necklace_001',
    name: 'Iron Necklace',
    nameCN: '铁项链',
    type: 'necklace',
    quality: 'white',
    level: 1,
    position: 'necklace',
    baseAttributes: { hp: 15, defense: 3 },
    strengthen: { maxLevel: 15, attrsPerLevel: {}, costs: [] },
    refine: { maxLevel: 10, attrsPerLevel: {}, costs: [] },
    star: { maxLevel: 12, attrsPerLevel: {}, costs: [] },
  },
  // 手镯
  {
    templateId: 'bracelet_001',
    name: 'Iron Bracelet',
    nameCN: '铁手镯',
    type: 'bracelet',
    quality: 'white',
    level: 1,
    position: 'bracelet1',
    baseAttributes: { defense: 3, hp: 15 },
    strengthen: { maxLevel: 15, attrsPerLevel: {}, costs: [] },
    refine: { maxLevel: 10, attrsPerLevel: {}, costs: [] },
    star: { maxLevel: 12, attrsPerLevel: {}, costs: [] },
  },
]

// 装备系统类
export class EquipmentSystem {
  private playerData: Map<string, PlayerEquipmentData> = new Map()
  
  // 获取玩家装备数据
  getPlayerData(playerId: string): PlayerEquipmentData {
    if (!this.playerData.has(playerId)) {
      this.playerData.set(playerId, {
        playerId,
        equipments: new Map(),
        strengthenStone: 100,
        refineStone: 50,
        starStone: 20,
        gold: 1000000,
        lastUpdateTime: Date.now(),
      })
    }
    return this.playerData.get(playerId)!
  }
  
  // 获取玩家装备列表
  getPlayerEquipments(playerId: string): Equipment[] {
    const data = this.getPlayerData(playerId)
    return Array.from(data.equipments.values())
  }
  
  // 获取玩家指定位置装备
  getEquipmentByPosition(playerId: string, position: EquipmentPosition): Equipment | null {
    const data = this.getPlayerData(playerId)
    for (const equip of data.equipments.values()) {
      if (equip.position === position) {
        return equip
      }
    }
    return null
  }
  
  // 装备强化
  strengthenEquipment(playerId: string, equipmentId: string, useProtect: boolean = false): StrengthenResult {
    const data = this.getPlayerData(playerId)
    const equipment = data.equipments.get(equipmentId)
    
    if (!equipment) {
      return {
        success: false,
        newLevel: 0,
        newAttrs: {},
        consumeGold: 0,
        consumeStone: 0,
        message: '装备不存在',
      }
    }
    
    const currentLevel = equipment.strengthenLevel
    const maxLevel = 15
    
    if (currentLevel >= maxLevel) {
      return {
        success: false,
        newLevel: currentLevel,
        newAttrs: equipment.strengthenAttrs,
        consumeGold: 0,
        consumeStone: 0,
        message: '强化等级已达上限',
      }
    }
    
    // 获取强化配置
    const costConfig = EQUIPMENT_STRENGTHEN_CONFIG.costs[currentLevel]
    if (!costConfig) {
      return {
        success: false,
        newLevel: currentLevel,
        newAttrs: equipment.strengthenAttrs,
        consumeGold: 0,
        consumeStone: 0,
        message: '强化配置错误',
      }
    }
    
    // 检查资源
    if (data.gold < costConfig.gold || data.strengthenStone < costConfig.stone) {
      return {
        success: false,
        newLevel: currentLevel,
        newAttrs: equipment.strengthenAttrs,
        consumeGold: costConfig.gold,
        consumeStone: costConfig.stone,
        message: '资源不足',
      }
    }
    
    // 计算成功率
    let successRate = costConfig.successRate
    if (useProtect) {
      // 使用保护道具，成功率提高10%
      successRate = Math.min(1, successRate + 0.1)
    }
    
    // 随机判定
    const random = Math.random()
    const success = random < successRate
    
    if (success) {
      // 消耗资源
      data.gold -= costConfig.gold
      data.strengthenStone -= costConfig.stone
      
      // 升级
      equipment.strengthenLevel += 1
      
      // 计算新属性
      const typeAttrs = EQUIPMENT_STRENGTHEN_CONFIG.attrsPerLevel[equipment.type] || {}
      equipment.strengthenAttrs = {}
      for (const [attr, value] of Object.entries(typeAttrs)) {
        equipment.strengthenAttrs[attr] = value * equipment.strengthenLevel
      }
      
      equipment.updatedAt = Date.now()
      
      return {
        success: true,
        newLevel: equipment.strengthenLevel,
        newAttrs: equipment.strengthenAttrs,
        consumeGold: costConfig.gold,
        consumeStone: costConfig.stone,
        message: `强化成功！装备强化等级提升至${equipment.strengthenLevel}`,
      }
    } else {
      // 失败 - 失败不降级
      data.gold -= costConfig.gold
      data.strengthenStone -= costConfig.stone
      
      return {
        success: false,
        newLevel: currentLevel,
        newAttrs: equipment.strengthenAttrs,
        consumeGold: costConfig.gold,
        consumeStone: costConfig.stone,
        message: `强化失败，装备强化等级保持在${currentLevel}级`,
      }
    }
  }
  
  // 装备精炼
  refineEquipment(playerId: string, equipmentId: string): RefineResult {
    const data = this.getPlayerData(playerId)
    const equipment = data.equipments.get(equipmentId)
    
    if (!equipment) {
      return {
        success: false,
        newLevel: 0,
        newAttrs: {},
        consumeGold: 0,
        consumeRefineStone: 0,
        message: '装备不存在',
      }
    }
    
    const currentLevel = equipment.refineLevel
    const maxLevel = 10
    
    if (currentLevel >= maxLevel) {
      return {
        success: false,
        newLevel: currentLevel,
        newAttrs: equipment.refineAttrs,
        consumeGold: 0,
        consumeRefineStone: 0,
        message: '精炼等级已达上限',
      }
    }
    
    const costConfig = EQUIPMENT_REFINE_CONFIG.costs[currentLevel]
    if (!costConfig) {
      return {
        success: false,
        newLevel: currentLevel,
        newAttrs: equipment.refineAttrs,
        consumeGold: 0,
        consumeRefineStone: 0,
        message: '精炼配置错误',
      }
    }
    
    if (data.gold < costConfig.gold || data.refineStone < costConfig.refineStone) {
      return {
        success: false,
        newLevel: currentLevel,
        newAttrs: equipment.refineAttrs,
        consumeGold: costConfig.gold,
        consumeRefineStone: costConfig.refineStone,
        message: '资源不足',
      }
    }
    
    const random = Math.random()
    const success = random < costConfig.successRate
    
    if (success) {
      data.gold -= costConfig.gold
      data.refineStone -= costConfig.refineStone
      
      equipment.refineLevel += 1
      
      // 计算精炼属性 (百分比加成)
      const baseAttr = equipment.baseAttributes
      const percentAttr = EQUIPMENT_REFINE_CONFIG.attrsPerLevelPercent[equipment.type] || {}
      equipment.refineAttrs = {}
      for (const [attr, baseValue] of Object.entries(baseAttr)) {
        const percent = percentAttr[attr] || 0
        equipment.refineAttrs[attr] = Math.floor(baseValue * (equipment.refineLevel * percent / 100))
      }
      
      equipment.updatedAt = Date.now()
      
      return {
        success: true,
        newLevel: equipment.refineLevel,
        newAttrs: equipment.refineAttrs,
        consumeGold: costConfig.gold,
        consumeRefineStone: costConfig.refineStone,
        message: `精炼成功！装备精炼等级提升至${equipment.refineLevel}`,
      }
    } else {
      data.gold -= costConfig.gold
      data.refineStone -= costConfig.refineStone
      
      return {
        success: false,
        newLevel: currentLevel,
        newAttrs: equipment.refineAttrs,
        consumeGold: costConfig.gold,
        consumeRefineStone: costConfig.refineStone,
        message: '精炼失败',
      }
    }
  }
  
  // 装备升星
  starEquipment(playerId: string, equipmentId: string): StarResult {
    const data = this.getPlayerData(playerId)
    const equipment = data.equipments.get(equipmentId)
    
    if (!equipment) {
      return {
        success: false,
        newLevel: 0,
        newAttrs: {},
        consumeGold: 0,
        consumeStarStone: 0,
        message: '装备不存在',
      }
    }
    
    const currentLevel = equipment.starLevel
    const maxLevel = 12
    
    if (currentLevel >= maxLevel) {
      return {
        success: false,
        newLevel: currentLevel,
        newAttrs: equipment.starAttrs,
        consumeGold: 0,
        consumeStarStone: 0,
        message: '星级已达上限',
      }
    }
    
    const costConfig = EQUIPMENT_STAR_CONFIG.costs[currentLevel]
    if (!costConfig) {
      return {
        success: false,
        newLevel: currentLevel,
        newAttrs: equipment.starAttrs,
        consumeGold: 0,
        consumeStarStone: 0,
        message: '升星配置错误',
      }
    }
    
    if (data.gold < costConfig.gold || data.starStone < costConfig.starStone) {
      return {
        success: false,
        newLevel: currentLevel,
        newAttrs: equipment.starAttrs,
        consumeGold: costConfig.gold,
        consumeStarStone: costConfig.starStone,
        message: '资源不足',
      }
    }
    
    const random = Math.random()
    const success = random < costConfig.successRate
    
    if (success) {
      data.gold -= costConfig.gold
      data.starStone -= costConfig.starStone
      
      equipment.starLevel += 1
      
      // 计算星级属性
      const baseAttr = equipment.baseAttributes
      const percentAttr = EQUIPMENT_STAR_CONFIG.attrsPerLevelPercent[equipment.type] || {}
      equipment.starAttrs = {}
      for (const [attr, baseValue] of Object.entries(baseAttr)) {
        const percent = percentAttr[attr] || 0
        equipment.starAttrs[attr] = Math.floor(baseValue * (equipment.starLevel * percent / 100))
      }
      
      equipment.updatedAt = Date.now()
      
      return {
        success: true,
        newLevel: equipment.starLevel,
        newAttrs: equipment.starAttrs,
        consumeGold: costConfig.gold,
        consumeStarStone: costConfig.starStone,
        message: `升星成功！装备星级提升至${equipment.starLevel}星`,
      }
    } else {
      data.gold -= costConfig.gold
      data.starStone -= costConfig.starStone
      
      if (costConfig.failProtect) {
        return {
          success: false,
          newLevel: currentLevel,
          newAttrs: equipment.starAttrs,
          consumeGold: costConfig.gold,
          consumeStarStone: costConfig.starStone,
          message: '升星失败，但星级保护生效',
        }
      } else {
        equipment.starLevel = Math.max(0, equipment.starLevel - 1)
        
        // 重新计算属性
        const baseAttr = equipment.baseAttributes
        const percentAttr = EQUIPMENT_STAR_CONFIG.attrsPerLevelPercent[equipment.type] || {}
        equipment.starAttrs = {}
        for (const [attr, baseValue] of Object.entries(baseAttr)) {
          const percent = percentAttr[attr] || 0
          equipment.starAttrs[attr] = Math.floor(baseValue * (equipment.starLevel * percent / 100))
        }
        
        equipment.updatedAt = Date.now()
        
        return {
          success: false,
          newLevel: equipment.starLevel,
          newAttrs: equipment.starAttrs,
          consumeGold: costConfig.gold,
          consumeStarStone: costConfig.starStone,
          message: `升星失败！装备星级下降至${equipment.starLevel}星`,
        }
      }
    }
  }
  
  // 获取装备总属性
  getEquipmentTotalAttributes(playerId: string): Record<string, number> {
    const result: Record<string, number> = {
      attack: 0,
      defense: 0,
      hp: 0,
      crit: 0,
      dodge: 0,
      speed: 0,
    }
    
    const equipments = this.getPlayerEquipments(playerId)
    
    for (const equip of equipments) {
      // 基础属性
      for (const [attr, value] of Object.entries(equip.baseAttributes)) {
        result[attr] = (result[attr] || 0) + value
      }
      
      // 强化属性
      for (const [attr, value] of Object.entries(equip.strengthenAttrs)) {
        result[attr] = (result[attr] || 0) + value
      }
      
      // 精炼属性
      for (const [attr, value] of Object.entries(equip.refineAttrs)) {
        result[attr] = (result[attr] || 0) + value
      }
      
      // 星级属性
      for (const [attr, value] of Object.entries(equip.starAttrs)) {
        result[attr] = (result[attr] || 0) + value
      }
    }
    
    return result
  }
  
  // 创建新装备
  createEquipment(playerId: string, templateId: string): Equipment | null {
    const template = EQUIPMENT_TEMPLATES.find(t => t.templateId === templateId)
    if (!template) return null
    
    const data = this.getPlayerData(playerId)
    
    const equipment: Equipment = {
      equipmentId: `${playerId}_${templateId}_${Date.now()}`,
      playerId,
      templateId: template.templateId,
      name: template.name,
      nameCN: template.nameCN,
      type: template.type,
      quality: template.quality,
      level: template.level,
      position: template.position,
      strengthenLevel: 0,
      strengthenAttrs: {},
      refineLevel: 0,
      refineAttrs: {},
      starLevel: 0,
      starAttrs: {},
      baseAttributes: { ...template.baseAttributes },
      additionalAttributes: {},
      bindStatus: 'unbound',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    
    data.equipments.set(equipment.equipmentId, equipment)
    
    return equipment
  }
  
  // 穿戴装备
  equipItem(playerId: string, equipmentId: string): { success: boolean; message: string } {
    const data = this.getPlayerData(playerId)
    const equipment = data.equipments.get(equipmentId)
    
    if (!equipment) {
      return { success: false, message: '装备不存在' }
    }
    
    // 检查是否已穿戴
    const existingEquip = this.getEquipmentByPosition(playerId, equipment.position)
    if (existingEquip) {
      return { success: false, message: `该位置已有装备: ${existingEquip.nameCN}` }
    }
    
    return { success: true, message: '穿戴成功' }
  }
  
  // 卸下装备
  unequipItem(playerId: string, position: EquipmentPosition): { success