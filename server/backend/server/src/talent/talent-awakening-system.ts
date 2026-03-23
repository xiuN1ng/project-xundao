/**
 * 天赋觉醒系统 - v29 版本
 * 天赋系统的觉醒机制，觉醒后获得强大的天赋力量
 */

export type AwakeningType = 'normal' | 'enhanced' | 'mythical' | 'divine'
export type AwakeningState = 'locked' | 'available' | 'awakening' | 'awakened' | 'failed'

export interface TalentAwakening {
  awakeningId: string
  playerId: string
  talentTreeId: string
  type: AwakeningType
  level: number // 觉醒等级 (0-5)
  state: AwakeningState
  exp: number
  maxExp: number
  attributes: AwakeningAttribute
  specialEffects: AwakeningSpecialEffect[]
  successRate: number
  cost: AwakeningCost
  awakenedAt: number | null
}

export interface AwakeningAttribute {
  attack: number
  defense: number
  hp: number
  crit: number
  critDamage: number
  dodge: number
  hit: number
  speed: number
  realmDefense: number // 境界压制
  elementalResist: number // 元素抗性
}

export interface AwakeningSpecialEffect {
  id: string
  name: string
  nameCN: string
  description: string
  type: 'passive' | 'active' | 'trigger'
  trigger?: string // 触发条件
  value: number
  isPercent: boolean
}

export interface AwakeningCost {
  gold: number
  items: Array<{ itemId: string; count: number }>
  requiresItem?: string
  requiresAwakening?: string // 前置觉醒要求
}

export interface PlayerAwakeningData {
  playerId: string
  awakenings: Map<string, TalentAwakening>
  totalAwakenings: number
  successfulAwakenings: number
  lastUpdateTime: number
}

// 觉醒配置
export const AWAKENING_CONFIGS: Record<AwakeningType, {
  baseSuccessRate: number
  expGrowth: number
  attributeGrowth: AwakeningAttribute
  specialEffects: AwakeningSpecialEffect[]
}> = {
  normal: {
    baseSuccessRate: 0.7,
    expGrowth: 2000,
    attributeGrowth: {
      attack: 100, defense: 100, hp: 1000, crit: 10, critDamage: 20,
      dodge: 5, hit: 5, speed: 10, realmDefense: 5, elementalResist: 5
    },
    specialEffects: [
      { id: 'normal_1', name: 'Power Surge', nameCN: '力量涌动', description: '攻击时有5%几率提升50%攻击', type: 'trigger', trigger: 'attack', value: 50, isPercent: true },
      { id: 'normal_2', name: 'Tough Skin', nameCN: '坚韧皮肤', description: '受到的伤害减少5%', type: 'passive', value: 5, isPercent: true }
    ]
  },
  enhanced: {
    baseSuccessRate: 0.5,
    expGrowth: 4000,
    attributeGrowth: {
      attack: 200, defense: 200, hp: 2000, crit: 20, critDamage: 40,
      dodge: 10, hit: 10, speed: 20, realmDefense: 10, elementalResist: 10
    },
    specialEffects: [
      { id: 'enhanced_1', name: 'Fierce Attack', nameCN: '猛烈攻击', description: '攻击时有10%几率提升100%攻击', type: 'trigger', trigger: 'attack', value: 100, isPercent: true },
      { id: 'enhanced_2', name: 'Iron Defense', nameCN: '铁壁防御', description: '受到的伤害减少10%', type: 'passive', value: 10, isPercent: true },
      { id: 'enhanced_3', name: 'Life Steal', nameCN: '生命汲取', description: '攻击时5%几率吸取敌人10%生命', type: 'trigger', trigger: 'attack', value: 10, isPercent: true }
    ]
  },
  mythical: {
    baseSuccessRate: 0.3,
    expGrowth: 8000,
    attributeGrowth: {
      attack: 400, defense: 400, hp: 4000, crit: 35, critDamage: 70,
      dodge: 15, hit: 15, speed: 35, realmDefense: 20, elementalResist: 20
    },
    specialEffects: [
      { id: 'mythical_1', name: 'Divine Strike', nameCN: '神圣打击', description: '攻击时有15%几率提升200%攻击', type: 'trigger', trigger: 'attack', value: 200, isPercent: true },
      { id: 'mythical_2', name: 'Divine Shield', nameCN: '神圣护盾', description: '受到的伤害减少20%', type: 'passive', value: 20, isPercent: true },
      { id: 'mythical_3', name: 'Divine Life Steal', nameCN: '神圣汲取', description: '攻击时10%几率吸取敌人20%生命', type: 'trigger', trigger: 'attack', value: 20, isPercent: true },
      { id: 'mythical_4', name: 'Elemental Shield', nameCN: '元素护盾', description: '全元素抗性+15%', type: 'passive', value: 15, isPercent: true }
    ]
  },
  divine: {
    baseSuccessRate: 0.15,
    expGrowth: 15000,
    attributeGrowth: {
      attack: 800, defense: 800, hp: 8000, crit: 50, critDamage: 100,
      dodge: 25, hit: 25, speed: 50, realmDefense: 35, elementalResist: 35
    },
    specialEffects: [
      { id: 'divine_1', name: 'World Destroyer', nameCN: '毁天灭地', description: '攻击时有20%几率提升500%攻击', type: 'trigger', trigger: 'attack', value: 500, isPercent: true },
      { id: 'divine_2', name: 'Immortal Body', nameCN: '不朽金身', description: '受到的伤害减少35%', type: 'passive', value: 35, isPercent: true },
      { id: 'divine_3', name: 'Divine Essence', nameCN: '神圣本质', description: '攻击时15%几率吸取敌人30%生命', type: 'trigger', trigger: 'attack', value: 30, isPercent: true },
      { id: 'divine_4', name: 'Elemental Mastery', nameCN: '元素主宰', description: '全元素抗性+30%', type: 'passive', value: 30, isPercent: true },
      { id: 'divine_5', name: 'Realm Dominance', nameCN: '境界压制', description: '境界压制效果+30%', type: 'passive', value: 30, isPercent: true },
      { id: 'divine_6', name: 'Divine Wrath', nameCN: '神圣愤怒', description: '暴击伤害提升50%', type: 'passive', value: 50, isPercent: true }
    ]
  }
}

// 觉醒消耗配置
export const AWAKENING_COSTS: Record<AwakeningType, Array<AwakeningCost>> = {
  normal: [
    { gold: 200000, items: [{ itemId: 'awakening_stone', count: 1 }] },
    { gold: 300000, items: [{ itemId: 'awakening_stone', count: 2 }] },
    { gold: 500000, items: [{ itemId: 'awakening_stone', count: 3 }] },
    { gold: 800000, items: [{ itemId: 'awakening_stone', count: 5 }] },
    { gold: 1200000, items: [{ itemId: 'awakening_stone', count: 8 }] }
  ],
  enhanced: [
    { gold: 1000000, items: [{ itemId: 'enhanced_awakening_stone', count: 1 }] },
    { gold: 2000000, items: [{ itemId: 'enhanced_awakening_stone', count: 2 }] },
    { gold: 3500000, items: [{ itemId: 'enhanced_awakening_stone', count: 3 }] },
    { gold: 5000000, items: [{ itemId: 'enhanced_awakening_stone', count: 5 }] },
    { gold: 8000000, items: [{ itemId: 'enhanced_awakening_stone', count: 8 }] }
  ],
  mythical: [
    { gold: 5000000, items: [{ itemId: 'mythical_awakening_stone', count: 1 }], requiresItem: 'mythical_token' },
    { gold: 10000000, items: [{ itemId: 'mythical_awakening_stone', count: 2 }], requiresItem: 'mythical_token' },
    { gold: 18000000, items: [{ itemId: 'mythical_awakening_stone', count: 3 }], requiresItem: 'mythical_token' },
    { gold: 28000000, items: [{ itemId: 'mythical_awakening_stone', count: 5 }], requiresItem: 'mythical_token' },
    { gold: 40000000, items: [{ itemId: 'mythical_awakening_stone', count: 8 }], requiresItem: 'mythical_token' }
  ],
  divine: [
    { gold: 20000000, items: [{ itemId: 'divine_awakening_stone', count: 1 }], requiresItem: 'divine_token' },
    { gold: 40000000, items: [{ itemId: 'divine_awakening_stone', count: 2 }], requiresItem: 'divine_token' },
    { gold: 70000000, items: [{ itemId: 'divine_awakening_stone', count: 3 }], requiresItem: 'divine_token' },
    { gold: 100000000, items: [{ itemId: 'divine_awakening_stone', count: 5 }], requiresItem: 'divine_token' },
    { gold: 150000000, items: [{ itemId: 'divine_awakening_stone', count: 8 }], requiresItem: 'divine_token' }
  ]
}

export const AWAKENING_CONFIG = {
  maxAwakeningLevel: 5,
  minSuccessRate: 0.1,
  protectItem: 'awakening_protect',
}

export class TalentAwakeningSystem {
  private playerData: Map<string, PlayerAwakeningData> = new Map()
  
  getPlayerData(playerId: string): PlayerAwakeningData {
    if (!this.playerData.has(playerId)) {
      this.playerData.set(playerId, {
        playerId,
        awakenings: new Map(),
        totalAwakenings: 0,
        successfulAwakenings: 0,
        lastUpdateTime: Date.now()
      })
    }
    return this.playerData.get(playerId)!
  }
  
  getAwakening(playerId: string, talentTreeId: string, type: AwakeningType): TalentAwakening | null {
    const data = this.getPlayerData(playerId)
    const key = `${talentTreeId}_${type}`
    return data.awakenings.get(key) || null
  }
  
  initAwakening(playerId: string, talentTreeId: string, type: AwakeningType): TalentAwakening {
    const existing = this.getAwakening(playerId, talentTreeId, type)
    if (existing) return existing
    
    const data = this.getPlayerData(playerId)
    const config = AWAKENING_CONFIGS[type]
    const costs = AWAKENING_COSTS[type][0]
    
    const awakening: TalentAwakening = {
      awakeningId: `${playerId}_${talentTreeId}_${type}_${Date.now()}`,
      playerId,
      talentTreeId,
      type,
      level: 0,
      state: 'available',
      exp: 0,
      maxExp: config.expGrowth,
      attributes: { ...config.attributeGrowth },
      specialEffects: [...config.specialEffects],
      successRate: config.baseSuccessRate,
      cost: costs,
      awakenedAt: null
    }
    
    const key = `${talentTreeId}_${type}`
    data.awakenings.set(key, awakening)
    
    return awakening
  }
  
  startAwakening(playerId: string, talentTreeId: string, type: AwakeningType): { success: boolean; message: string; awakening?: TalentAwakening } {
    const awakening = this.getAwakening(playerId, talentTreeId, type)
    
    if (!awakening) {
      return { success: false, message: '天赋觉醒未初始化' }
    }
    
    if (awakening.level >= AWAKENING_CONFIG.maxAwakeningLevel) {
      return { success: false, message: '觉醒等级已达上限' }
    }
    
    if (awakening.state === 'awakening') {
      return { success: false, message: '觉醒进行中' }
    }
    
    // 检查前置觉醒
    if (awakening.cost.requiresAwakening) {
      // 实际应该检查前置觉醒是否完成
    }
    
    // 检查消耗
    // 实际应该检查玩家资源和道具
    
    awakening.state = 'awakening'
    
    const data = this.getPlayerData(playerId)
    data.totalAwakenings++
    
    return { success: true, message: '开始天赋觉醒', awakening }
  }
  
  completeAwakening(playerId: string, talentTreeId: string, type: AwakeningType, useProtect: boolean = false): { success: boolean; message: string; awakening?: TalentAwakening; newLevel?: number } {
    const awakening = this.getAwakening(playerId, talentTreeId, type)
    
    if (!awakening) {
      return { success: false, message: '天赋觉醒未初始化' }
    }
    
    if (awakening.state !== 'awakening') {
      return { success: false, message: '当前未在进行觉醒' }
    }
    
    const data = this.getPlayerData(playerId)
    const levelIndex = awakening.level
    const config = AWAKENING_CONFIGS[type]
    
    // 计算成功率
    let successRate = config.baseSuccessRate - (levelIndex * 0.08)
    successRate = Math.max(successRate, AWAKENING_CONFIG.minSuccessRate)
    
    if (useProtect) {
      successRate = 1.0
    }
    
    const random = Math.random()
    const success = random < successRate
    
    if (success) {
      awakening.level++
      awakening.state = 'awakened'
      awakening.awakenedAt = Date.now()
      
      // 更新消耗和属性
      if (awakening.level < AWAKENING_CONFIG.maxAwakeningLevel) {
        awakening.cost = AWAKENING_COSTS[type][awakening.level]
        awakening.maxExp = config.expGrowth * (awakening.level + 1)
      }
      
      // 更新成功率
      awakening.successRate = Math.max(config.baseSuccessRate - (awakening.level * 0.08), AWAKENING_CONFIG.minSuccessRate)
      
      data.successfulAwakenings++
      
      return {
        success: true,
        message: `天赋觉醒成功！当前觉醒等级: ${awakening.level}`,
        awakening,
        newLevel: awakening.level
      }
    } else {
      awakening.state = 'failed'
      
      return {
        success: false,
        message: '天赋觉醒失败',
        awakening
      }
    }
  }
  
  addExp(playerId: string, talentTreeId: string, type: AwakeningType, exp: number): { success: boolean; message: string; leveledUp?: boolean } {
    let awakening = this.getAwakening(playerId, talentTreeId, type)
    
    if (!awakening) {
      awakening = this.initAwakening(playerId, talentTreeId, type)
    }
    
    if (awakening.level >= AWAKENING_CONFIG.maxAwakeningLevel) {
      return { success: false, message: '觉醒等级已达上限' }
    }
    
    awakening.exp += exp
    let leveledUp = false
    
    while (awakening.exp >= awakening.maxExp && awakening.level < AWAKENING_CONFIG.maxAwakeningLevel) {
      awakening.exp -= awakening.maxExp
      awakening.level++
      awakening.maxExp = AWAKENING_CONFIGS[type].expGrowth * (awakening.level + 1)
      leveledUp = true
      
      // 更新属性
      const config = AWAKENING_CONFIGS[type]
      awakening.attributes = {
        attack: awakening.attributes.attack + config.attributeGrowth.attack,
        defense: awakening.attributes.defense + config.attributeGrowth.defense,
        hp: awakening.attributes.hp + config.attributeGrowth.hp,
        crit: awakening.attributes.crit + config.attributeGrowth.crit,
        critDamage: awakening.attributes.critDamage + config.attributeGrowth.critDamage,
        dodge: awakening.attributes.dodge + config.attributeGrowth.dodge,
        hit: awakening.attributes.hit + config.attributeGrowth.hit,
        speed: awakening.attributes.speed + config.attributeGrowth.speed,
        realmDefense: awakening.attributes.realmDefense + config.attributeGrowth.realmDefense,
        elementalResist: awakening.attributes.elementalResist + config.attributeGrowth.elementalResist
      }
    }
    
    if (awakening.state === 'available' && awakening.exp > 0) {
      awakening.state = 'available'
    }
    
    return { success: true, message: `获得觉醒经验: ${exp}`, leveledUp }
  }
  
  getAllAwakenings(playerId: string): TalentAwakening[] {
    const data = this.getPlayerData(playerId)
    return Array.from(data.awakenings.values())
  }
  
  getAwakeningAttributes(playerId: string): AwakeningAttribute {
    const awakenings = this.getAllAwakenings(playerId)
    
    const total: AwakeningAttribute = {
      attack: 0, defense: 0, hp: 0, crit: 0,
      critDamage: 0, dodge: 0, hit: 0, speed: 0,
      realmDefense: 0, elementalResist: 0
    }
    
    for (const aw of awakenings) {
      if (aw.level > 0) {
        total.attack += aw.attributes.attack
        total.defense += aw.attributes.defense
        total.hp += aw.attributes.hp
        total.crit += aw.attributes.crit
        total.critDamage += aw.attributes.critDamage
        total.dodge += aw.attributes.dodge
        total.hit += aw.attributes.hit
        total.speed += aw.attributes.speed
        total.realmDefense += aw.attributes.realmDefense
        total.elementalResist += aw.attributes.elementalResist
      }
    }
    
    return total
  }
  
  getAwakeningSpecialEffects(playerId: string): AwakeningSpecialEffect[] {
    const awakenings = this.getAllAwakenings(playerId)
    const effects: AwakeningSpecialEffect[] = []
    
    for (const aw of awakenings) {
      if (aw.level > 0) {
        effects.push(...aw.specialEffects)
      }
    }
    
    return effects
  }
  
  checkTriggerEffect(playerId: string, trigger: string): { triggered: boolean; effect?: AwakeningSpecialEffect; value?: number } {
    const effects = this.getAwakeningSpecialEffects(playerId)
    
    for (const effect of effects) {
      if (effect.type === 'trigger' && effect.trigger === trigger) {
        const random = Math.random()
        if (random < 0.15) { // 15%基础触发率
          return {
            triggered: true,
            effect,
            value: effect.value
          }
        }
      }
    }
    
    return { triggered: false }
  }
  
  resetAwakening(playerId: string, talentTreeId: string, type: AwakeningType): { success: boolean; message: string } {
    const awakening = this.getAwakening(playerId, talentTreeId, type)
    
    if (!awakening) {
      return { success: false, message: '天赋觉醒不存在' }
    }
    
    // 重置需要特殊道具
    // 实际应该检查道具
    
    const config = AWAKENING_CONFIGS[type]
    awakening.level = 0
    awakening.exp = 0
    awakening.maxExp = config.expGrowth
    awakening.state = 'available'
    awakening.successRate = config.baseSuccessRate
    awakening.attributes = { ...config.attributeGrowth }
    awakening.awakenedAt = null
    
    return { success: true, message: '天赋觉醒已重置' }
  }
}

// 导出单例
export const talentAwakeningSystem = new TalentAwakeningSystem()
