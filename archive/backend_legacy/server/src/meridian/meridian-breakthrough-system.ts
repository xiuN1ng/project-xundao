/**
 * 经脉突破系统 - v29 版本
 * 经脉的进阶突破机制，突破后获得强大加成
 */

export type BreakthroughType = 'minor' | 'major' | 'perfect' | 'legendary'
export type BreakthroughState = 'locked' | 'available' | 'breakthroughing' | 'success' | 'failed'

export interface MeridianBreakthrough {
  breakthroughId: string
  playerId: string
  meridianId: string
  type: BreakthroughType
  level: number // 突破等级 (0-10)
  state: BreakthroughState
  exp: number
  maxExp: number
  attributes: BreakthroughAttribute
  bonuses: BreakthroughBonus[]
  successRate: number
  cost: BreakthroughCost
  attemptedAt: number | null
  completedAt: number | null
}

export interface BreakthroughAttribute {
  attack: number
  defense: number
  hp: number
  crit: number
  critDamage: number
  dodge: number
  hit: number
  speed: number
  allAttributes: number
}

export interface BreakthroughBonus {
  type: 'set' | 'special' | 'legendary'
  condition: number // 突破等级要求
  description: string
  value: number
  isPercent: boolean
}

export interface BreakthroughCost {
  gold: number
  spirit: number
  items: Array<{ itemId: string; count: number }>
  requiresItem?: string // 必需道具
}

export interface PlayerBreakthroughData {
  playerId: string
  breakthroughs: Map<string, MeridianBreakthrough>
  totalBreakthroughs: number
  successfulBreakthroughs: number
  lastUpdateTime: number
}

// 经脉突破配置
export const BREAKTHROUGH_CONFIGS: Record<BreakthroughType, {
  baseSuccessRate: number
  expGrowth: number
  attributeGrowth: BreakthroughAttribute
  bonus: BreakthroughBonus[]
}> = {
  minor: {
    baseSuccessRate: 0.8,
    expGrowth: 1000,
    attributeGrowth: {
      attack: 50, defense: 50, hp: 500, crit: 5, critDamage: 10,
      dodge: 3, hit: 3, speed: 5, allAttributes: 0
    },
    bonus: [
      { type: 'set', condition: 3, description: '小成: 全体属性+5%', value: 5, isPercent: true },
      { type: 'set', condition: 5, description: '大成: 全体属性+10%', value: 10, isPercent: true }
    ]
  },
  major: {
    baseSuccessRate: 0.6,
    expGrowth: 2000,
    attributeGrowth: {
      attack: 100, defense: 100, hp: 1000, crit: 10, critDamage: 20,
      dodge: 5, hit: 5, speed: 10, allAttributes: 0
    },
    bonus: [
      { type: 'set', condition: 3, description: '小成: 全体属性+10%', value: 10, isPercent: true },
      { type: 'set', condition: 5, description: '大成: 全体属性+20%', value: 20, isPercent: true },
      { type: 'special', condition: 8, description: '巅峰: 全体属性+30%', value: 30, isPercent: true }
    ]
  },
  perfect: {
    baseSuccessRate: 0.4,
    expGrowth: 3000,
    attributeGrowth: {
      attack: 150, defense: 150, hp: 1500, crit: 15, critDamage: 30,
      dodge: 8, hit: 8, speed: 15, allAttributes: 10
    },
    bonus: [
      { type: 'set', condition: 3, description: '小成: 全体属性+15%', value: 15, isPercent: true },
      { type: 'set', condition: 5, description: '大成: 全体属性+30%', value: 30, isPercent: true },
      { type: 'special', condition: 8, description: '巅峰: 全体属性+40%', value: 40, isPercent: true },
      { type: 'legendary', condition: 10, description: '圆满: 全体属性+50%', value: 50, isPercent: true }
    ]
  },
  legendary: {
    baseSuccessRate: 0.2,
    expGrowth: 5000,
    attributeGrowth: {
      attack: 300, defense: 300, hp: 3000, crit: 25, critDamage: 50,
      dodge: 15, hit: 15, speed: 25, allAttributes: 20
    },
    bonus: [
      { type: 'set', condition: 2, description: '入门: 全体属性+20%', value: 20, isPercent: true },
      { type: 'set', condition: 5, description: '小成: 全体属性+35%', value: 35, isPercent: true },
      { type: 'special', condition: 7, description: '大成: 全体属性+50%', value: 50, isPercent: true },
      { type: 'legendary', condition: 10, description: '传奇: 全体属性+80%', value: 80, isPercent: true }
    ]
  }
}

// 突破消耗配置
export const BREAKTHROUGH_COSTS: Record<BreakthroughType, Array<BreakthroughCost>> = {
  minor: [
    { gold: 100000, spirit: 10000, items: [{ itemId: 'breakthrough_stone', count: 1 }] },
    { gold: 150000, spirit: 15000, items: [{ itemId: 'breakthrough_stone', count: 2 }] },
    { gold: 200000, spirit: 20000, items: [{ itemId: 'breakthrough_stone', count: 3 }] },
    { gold: 300000, spirit: 30000, items: [{ itemId: 'breakthrough_stone', count: 5 }] },
    { gold: 500000, spirit: 50000, items: [{ itemId: 'breakthrough_stone', count: 8 }] },
    { gold: 800000, spirit: 80000, items: [{ itemId: 'breakthrough_stone', count: 10 }] },
    { gold: 1000000, spirit: 100000, items: [{ itemId: 'breakthrough_stone', count: 15 }] },
    { gold: 1500000, spirit: 150000, items: [{ itemId: 'breakthrough_stone', count: 20 }] },
    { gold: 2000000, spirit: 200000, items: [{ itemId: 'breakthrough_stone', count: 30 }] },
    { gold: 3000000, spirit: 300000, items: [{ itemId: 'breakthrough_stone', count: 50 }] }
  ],
  major: [
    { gold: 300000, spirit: 30000, items: [{ itemId: 'major_breakthrough_stone', count: 1 }] },
    { gold: 500000, spirit: 50000, items: [{ itemId: 'major_breakthrough_stone', count: 2 }] },
    { gold: 800000, spirit: 80000, items: [{ itemId: 'major_breakthrough_stone', count: 3 }] },
    { gold: 1200000, spirit: 120000, items: [{ itemId: 'major_breakthrough_stone', count: 5 }] },
    { gold: 1800000, spirit: 180000, items: [{ itemId: 'major_breakthrough_stone', count: 8 }] },
    { gold: 2500000, spirit: 250000, items: [{ itemId: 'major_breakthrough_stone', count: 10 }] },
    { gold: 3500000, spirit: 350000, items: [{ itemId: 'major_breakthrough_stone', count: 15 }] },
    { gold: 5000000, spirit: 500000, items: [{ itemId: 'major_breakthrough_stone', count: 20 }] },
    { gold: 7000000, spirit: 700000, items: [{ itemId: 'major_breakthrough_stone', count: 30 }] },
    { gold: 10000000, spirit: 1000000, items: [{ itemId: 'major_breakthrough_stone', count: 50 }] }
  ],
  perfect: [
    { gold: 1000000, spirit: 100000, items: [{ itemId: 'perfect_breakthrough_stone', count: 1 }], requiresItem: 'perfect_token' },
    { gold: 2000000, spirit: 200000, items: [{ itemId: 'perfect_breakthrough_stone', count: 2 }], requiresItem: 'perfect_token' },
    { gold: 3500000, spirit: 350000, items: [{ itemId: 'perfect_breakthrough_stone', count: 3 }], requiresItem: 'perfect_token' },
    { gold: 5000000, spirit: 500000, items: [{ itemId: 'perfect_breakthrough_stone', count: 5 }], requiresItem: 'perfect_token' },
    { gold: 8000000, spirit: 800000, items: [{ itemId: 'perfect_breakthrough_stone', count: 8 }], requiresItem: 'perfect_token' },
    { gold: 12000000, spirit: 1200000, items: [{ itemId: 'perfect_breakthrough_stone', count: 10 }], requiresItem: 'perfect_token' },
    { gold: 18000000, spirit: 1800000, items: [{ itemId: 'perfect_breakthrough_stone', count: 15 }], requiresItem: 'perfect_token' },
    { gold: 25000000, spirit: 2500000, items: [{ itemId: 'perfect_breakthrough_stone', count: 20 }], requiresItem: 'perfect_token' },
    { gold: 35000000, spirit: 3500000, items: [{ itemId: 'perfect_breakthrough_stone', count: 30 }], requiresItem: 'perfect_token' },
    { gold: 50000000, spirit: 5000000, items: [{ itemId: 'perfect_breakthrough_stone', count: 50 }], requiresItem: 'perfect_token' }
  ],
  legendary: [
    { gold: 10000000, spirit: 1000000, items: [{ itemId: 'legendary_breakthrough_stone', count: 1 }], requiresItem: 'legendary_token' },
    { gold: 20000000, spirit: 2000000, items: [{ itemId: 'legendary_breakthrough_stone', count: 2 }], requiresItem: 'legendary_token' },
    { gold: 40000000, spirit: 4000000, items: [{ itemId: 'legendary_breakthrough_stone', count: 3 }], requiresItem: 'legendary_token' },
    { gold: 70000000, spirit: 7000000, items: [{ itemId: 'legendary_breakthrough_stone', count: 5 }], requiresItem: 'legendary_token' },
    { gold: 100000000, spirit: 10000000, items: [{ itemId: 'legendary_breakthrough_stone', count: 8 }], requiresItem: 'legendary_token' },
    { gold: 150000000, spirit: 15000000, items: [{ itemId: 'legendary_breakthrough_stone', count: 10 }], requiresItem: 'legendary_token' },
    { gold: 220000000, spirit: 22000000, items: [{ itemId: 'legendary_breakthrough_stone', count: 15 }], requiresItem: 'legendary_token' },
    { gold: 300000000, spirit: 30000000, items: [{ itemId: 'legendary_breakthrough_stone', count: 20 }], requiresItem: 'legendary_token' },
    { gold: 400000000, spirit: 40000000, items: [{ itemId: 'legendary_breakthrough_stone', count: 30 }], requiresItem: 'legendary_token' },
    { gold: 500000000, spirit: 50000000, items: [{ itemId: 'legendary_breakthrough_stone', count: 50 }], requiresItem: 'legendary_token' }
  ]
}

export const BREAKTHROUGH_CONFIG = {
  maxBreakthroughLevel: 10,
  minSuccessRate: 0.1,
  protectItem: 'breakthrough_protect',
  maxProtectedAttempts: 3,
}

export class MeridianBreakthroughSystem {
  private playerData: Map<string, PlayerBreakthroughData> = new Map()
  
  getPlayerData(playerId: string): PlayerBreakthroughData {
    if (!this.playerData.has(playerId)) {
      this.playerData.set(playerId, {
        playerId,
        breakthroughs: new Map(),
        totalBreakthroughs: 0,
        successfulBreakthroughs: 0,
        lastUpdateTime: Date.now()
      })
    }
    return this.playerData.get(playerId)!
  }
  
  getBreakthrough(playerId: string, meridianId: string, type: BreakthroughType): MeridianBreakthrough | null {
    const data = this.getPlayerData(playerId)
    const key = `${meridianId}_${type}`
    return data.breakthroughs.get(key) || null
  }
  
  initBreakthrough(playerId: string, meridianId: string, type: BreakthroughType): MeridianBreakthrough {
    const existing = this.getBreakthrough(playerId, meridianId, type)
    if (existing) return existing
    
    const data = this.getPlayerData(playerId)
    const config = BREAKTHROUGH_CONFIGS[type]
    const costs = BREAKTHROUGH_COSTS[type][0]
    
    const breakthrough: MeridianBreakthrough = {
      breakthroughId: `${playerId}_${meridianId}_${type}_${Date.now()}`,
      playerId,
      meridianId,
      type,
      level: 0,
      state: 'available',
      exp: 0,
      maxExp: config.expGrowth,
      attributes: { ...config.attributeGrowth },
      bonuses: [...config.bonus],
      successRate: config.baseSuccessRate,
      cost: costs,
      attemptedAt: null,
      completedAt: null
    }
    
    const key = `${meridianId}_${type}`
    data.breakthroughs.set(key, breakthrough)
    
    return breakthrough
  }
  
  startBreakthrough(playerId: string, meridianId: string, type: BreakthroughType): { success: boolean; message: string; breakthrough?: MeridianBreakthrough } {
    const breakthrough = this.getBreakthrough(playerId, meridianId, type)
    
    if (!breakthrough) {
      return { success: false, message: '经脉突破未初始化' }
    }
    
    if (breakthrough.level >= BREAKTHROUGH_CONFIG.maxBreakthroughLevel) {
      return { success: false, message: '突破等级已达上限' }
    }
    
    if (breakthrough.state === 'breakthroughing') {
      return { success: false, message: '突破进行中' }
    }
    
    // 检查消耗
    // 实际应该检查玩家资源和道具
    
    breakthrough.state = 'breakthroughing'
    breakthrough.attemptedAt = Date.now()
    
    const data = this.getPlayerData(playerId)
    data.totalBreakthroughs++
    
    return { success: true, message: '开始经脉突破', breakthrough }
  }
  
  completeBreakthrough(playerId: string, meridianId: string, type: BreakthroughType, useProtect: boolean = false): { success: boolean; message: string; breakthrough?: MeridianBreakthrough; newLevel?: number } {
    const breakthrough = this.getBreakthrough(playerId, meridianId, type)
    
    if (!breakthrough) {
      return { success: false, message: '经脉突破未初始化' }
    }
    
    if (breakthrough.state !== 'breakthroughing') {
      return { success: false, message: '当前未在进行突破' }
    }
    
    const data = this.getPlayerData(playerId)
    const levelIndex = breakthrough.level // 当前等级，升级后是 level + 1
    const config = BREAKTHROUGH_CONFIGS[type]
    
    // 计算成功率
    let successRate = config.baseSuccessRate - (levelIndex * 0.05) // 每级降低5%
    successRate = Math.max(successRate, BREAKTHROUGH_CONFIG.minSuccessRate)
    
    if (useProtect) {
      successRate = 1.0 // 使用保护道具必定成功
    }
    
    const random = Math.random()
    const success = random < successRate
    
    if (success) {
      breakthrough.level++
      breakthrough.state = 'success'
      breakthrough.completedAt = Date.now()
      
      // 更新消耗和属性
      if (breakthrough.level < BREAKTHROUGH_CONFIG.maxBreakthroughLevel) {
        breakthrough.cost = BREAKTHROUGH_COSTS[type][breakthrough.level]
        breakthrough.maxExp = config.expGrowth * (breakthrough.level + 1)
      }
      
      // 更新成功率
      breakthrough.successRate = Math.max(config.baseSuccessRate - (breakthrough.level * 0.05), BREAKTHROUGH_CONFIG.minSuccessRate)
      
      data.successfulBreakthroughs++
      
      return {
        success: true,
        message: `经脉突破成功！当前突破等级: ${breakthrough.level}`,
        breakthrough,
        newLevel: breakthrough.level
      }
    } else {
      breakthrough.state = 'failed'
      breakthrough.completedAt = Date.now()
      
      return {
        success: false,
        message: '经脉突破失败',
        breakthrough
      }
    }
  }
  
  addExp(playerId: string, meridianId: string, type: BreakthroughType, exp: number): { success: boolean; message: string; leveledUp?: boolean } {
    let breakthrough = this.getBreakthrough(playerId, meridianId, type)
    
    if (!breakthrough) {
      breakthrough = this.initBreakthrough(playerId, meridianId, type)
    }
    
    if (breakthrough.level >= BREAKTHROUGH_CONFIG.maxBreakthroughLevel) {
      return { success: false, message: '突破等级已达上限' }
    }
    
    breakthrough.exp += exp
    let leveledUp = false
    
    while (breakthrough.exp >= breakthrough.maxExp && breakthrough.level < BREAKTHROUGH_CONFIG.maxBreakthroughLevel) {
      breakthrough.exp -= breakthrough.maxExp
      breakthrough.level++
      breakthrough.maxExp = BREAKTHROUGH_CONFIGS[type].expGrowth * (breakthrough.level + 1)
      leveledUp = true
      
      // 更新属性
      const config = BREAKTHROUGH_CONFIGS[type]
      breakthrough.attributes = {
        attack: breakthrough.attributes.attack + config.attributeGrowth.attack,
        defense: breakthrough.attributes.defense + config.attributeGrowth.defense,
        hp: breakthrough.attributes.hp + config.attributeGrowth.hp,
        crit: breakthrough.attributes.crit + config.attributeGrowth.crit,
        critDamage: breakthrough.attributes.critDamage + config.attributeGrowth.critDamage,
        dodge: breakthrough.attributes.dodge + config.attributeGrowth.dodge,
        hit: breakthrough.attributes.hit + config.attributeGrowth.hit,
        speed: breakthrough.attributes.speed + config.attributeGrowth.speed,
        allAttributes: breakthrough.attributes.allAttributes + config.attributeGrowth.allAttributes
      }
    }
    
    if (breakthrough.state === 'available' && breakthrough.exp > 0) {
      breakthrough.state = 'available'
    }
    
    return { success: true, message: `获得突破经验: ${exp}`, leveledUp }
  }
  
  getAllBreakthroughs(playerId: string): MeridianBreakthrough[] {
    const data = this.getPlayerData(playerId)
    return Array.from(data.breakthroughs.values())
  }
  
  getBreakthroughAttributes(playerId: string): BreakthroughAttribute {
    const breakthroughs = this.getAllBreakthroughs(playerId)
    
    const total: BreakthroughAttribute = {
      attack: 0, defense: 0, hp: 0, crit: 0,
      critDamage: 0, dodge: 0, hit: 0, speed: 0, allAttributes: 0
    }
    
    for (const bt of breakthroughs) {
      if (bt.level > 0) {
        // 基础属性
        total.attack += bt.attributes.attack
        total.defense += bt.attributes.defense
        total.hp += bt.attributes.hp
        total.crit += bt.attributes.crit
        total.critDamage += bt.attributes.critDamage
        total.dodge += bt.attributes.dodge
        total.hit += bt.attributes.hit
        total.speed += bt.attributes.speed
        total.allAttributes += bt.attributes.allAttributes
        
        // 百分比加成
        for (const bonus of bt.bonuses) {
          if (bt.level >= bonus.condition && bonus.isPercent) {
            const percentBonus = bonus.value / 100
            total.attack = Math.floor(total.attack * (1 + percentBonus))
            total.defense = Math.floor(total.defense * (1 + percentBonus))
            total.hp = Math.floor(total.hp * (1 + percentBonus))
            total.crit = Math.floor(total.crit * (1 + percentBonus))
            total.critDamage = Math.floor(total.critDamage * (1 + percentBonus))
            total.dodge = Math.floor(total.dodge * (1 + percentBonus))
            total.hit = Math.floor(total.hit * (1 + percentBonus))
            total.speed = Math.floor(total.speed * (1 + percentBonus))
          }
        }
      }
    }
    
    // 应用全体属性加成
    if (total.allAttributes > 0) {
      total.attack += total.allAttributes
      total.defense += total.allAttributes
      total.hp += total.allAttributes * 10
      total.crit += total.allAttributes
      total.critDamage += total.allAttributes
      total.dodge += total.allAttributes
      total.hit += total.allAttributes
      total.speed += total.allAttributes
    }
    
    return total
  }
  
  resetBreakthrough(playerId: string, meridianId: string, type: BreakthroughType): { success: boolean; message: string } {
    const breakthrough = this.getBreakthrough(playerId, meridianId, type)
    
    if (!breakthrough) {
      return { success: false, message: '经脉突破不存在' }
    }
    
    // 重置需要道具
    // 实际应该检查道具
    
    const config = BREAKTHROUGH_CONFIGS[type]
    breakthrough.level = 0
    breakthrough.exp = 0
    breakthrough.maxExp = config.expGrowth
    breakthrough.state = 'available'
    breakthrough.successRate = config.baseSuccessRate
    breakthrough.attributes = { ...config.attributeGrowth }
    breakthrough.attemptedAt = null
    breakthrough.completedAt = null
    
    return { success: true, message: '经脉突破已重置' }
  }
}

// 导出单例
export const meridianBreakthroughSystem = new MeridianBreakthroughSystem()
