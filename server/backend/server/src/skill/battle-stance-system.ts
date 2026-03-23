/**
 * 战斗姿态系统 - v29 版本
 * 不同的战斗姿态提供不同的属性加成和战斗策略
 */

export type StanceType = 'offensive' | 'defensive' | 'balanced' | 'swift' | 'berserk' | 'tactical'
export type StanceState = 'locked' | 'unlocked' | 'active'

export interface BattleStance {
  stanceId: string
  playerId: string
  templateId: string
  name: string
  nameCN: string
  type: StanceType
  description: string
  icon: string
  state: StanceState
  level: number
  exp: number
  maxExp: number
  attributes: StanceAttribute
  bonuses: StanceBonus[]
  activeEffects: StanceActiveEffect[]
  unlockCondition: StanceUnlockCondition
  learnedAt: number
}

export interface StanceAttribute {
  attack: number
  defense: number
  hp: number
  crit: number
  critDamage: number
  dodge: number
  hit: number
  speed: number
}

export interface StanceBonus {
  type: 'attack' | 'defense' | 'hp' | 'crit' | 'skill' | 'ultimate'
  condition: number // 等级要求
  value: number
  isPercent: boolean
  description: string
}

export interface StanceActiveEffect {
  type: 'damage_boost' | 'defense_boost' | 'heal' | 'shield' | 'rage' | 'counter'
  value: number
  isPercent: boolean
  duration?: number
  cooldown?: number
  description: string
}

export interface StanceUnlockCondition {
  requireLevel: number
  requireRealm: string
  requireSkillIds: string[]
  goldCost: number
  itemCost: Array<{ itemId: string; count: number }>
}

export interface PlayerStanceData {
  playerId: string
  stances: Map<string, BattleStance>
  activeStanceId: string | null
  stanceSwitches: number
  lastSwitchTime: number
  totalExp: number
}

export interface StanceTemplate {
  templateId: string
  name: string
  nameCN: string
  type: StanceType
  description: string
  icon: string
  unlockCondition: StanceUnlockCondition
  baseAttributes: StanceAttribute
  bonuses: StanceBonus[]
  activeEffects: StanceActiveEffect[]
  expGrowth: number
  maxLevel: number
}

// 战斗姿态模板配置
export const STANCE_TEMPLATES: StanceTemplate[] = [
  // 进攻姿态
  {
    templateId: 'stance_offensive',
    name: 'Offensive Stance',
    nameCN: '进攻姿态',
    type: 'offensive',
    description: '全力以赴的攻击姿态，大幅提升攻击力',
    icon: '⚔️',
    unlockCondition: {
      requireLevel: 10,
      requireRealm: '凡人',
      requireSkillIds: [],
      goldCost: 10000,
      itemCost: []
    },
    baseAttributes: {
      attack: 50,
      defense: 0,
      hp: 0,
      crit: 5,
      critDamage: 10,
      dodge: 0,
      hit: 5,
      speed: 0
    },
    bonuses: [
      { type: 'attack', condition: 5, value: 20, isPercent: true, description: '等级5: 攻击+20%' },
      { type: 'attack', condition: 10, value: 30, isPercent: true, description: '等级10: 攻击+30%' },
      { type: 'crit', condition: 3, value: 10, isPercent: false, description: '等级3: 暴击+10' }
    ],
    activeEffects: [
      { type: 'damage_boost', value: 50, isPercent: true, duration: 10000, cooldown: 60000, description: '主动: 伤害提升50%，持续10秒' }
    ],
    expGrowth: 500,
    maxLevel: 10
  },
  // 防御姿态
  {
    templateId: 'stance_defensive',
    name: 'Defensive Stance',
    nameCN: '防御姿态',
    type: 'defensive',
    description: '固若金汤的防御姿态，大幅提升防御和生命',
    icon: '🛡️',
    unlockCondition: {
      requireLevel: 10,
      requireRealm: '凡人',
      requireSkillIds: [],
      goldCost: 10000,
      itemCost: []
    },
    baseAttributes: {
      attack: 0,
      defense: 50,
      hp: 200,
      crit: 0,
      critDamage: 0,
      dodge: 5,
      hit: 0,
      speed: -10
    },
    bonuses: [
      { type: 'defense', condition: 5, value: 20, isPercent: true, description: '等级5: 防御+20%' },
      { type: 'defense', condition: 10, value: 30, isPercent: true, description: '等级10: 防御+30%' },
      { type: 'hp', condition: 3, value: 500, isPercent: false, description: '等级3: 生命+500' }
    ],
    activeEffects: [
      { type: 'shield', value: 2000, isPercent: false, duration: 15000, cooldown: 60000, description: '主动: 获得2000点护盾，持续15秒' }
    ],
    expGrowth: 500,
    maxLevel: 10
  },
  // 平衡姿态
  {
    templateId: 'stance_balanced',
    name: 'Balanced Stance',
    nameCN: '平衡姿态',
    type: 'balanced',
    description: '攻守兼备的平衡姿态，各项属性均衡提升',
    icon: '⚖️',
    unlockCondition: {
      requireLevel: 20,
      requireRealm: '筑基期',
      requireSkillIds: ['stance_offensive', 'stance_defensive'],
      goldCost: 50000,
      itemCost: [{ itemId: 'balance_essence', count: 10 }]
    },
    baseAttributes: {
      attack: 25,
      defense: 25,
      hp: 100,
      crit: 3,
      critDamage: 5,
      dodge: 3,
      hit: 3,
      speed: 0
    },
    bonuses: [
      { type: 'attack', condition: 5, value: 10, isPercent: true, description: '等级5: 攻击+10%' },
      { type: 'defense', condition: 5, value: 10, isPercent: true, description: '等级5: 防御+10%' },
      { type: 'hp', condition: 5, value: 500, isPercent: false, description: '等级5: 生命+500' },
      { type: 'attack', condition: 10, value: 15, isPercent: true, description: '等级10: 攻击+15%' },
      { type: 'defense', condition: 10, value: 15, isPercent: true, description: '等级10: 防御+15%' }
    ],
    activeEffects: [
      { type: 'heal', value: 20, isPercent: true, cooldown: 60000, description: '主动: 恢复生命值20%' }
    ],
    expGrowth: 600,
    maxLevel: 10
  },
  // 迅捷姿态
  {
    templateId: 'stance_swift',
    name: 'Swift Stance',
    nameCN: '迅捷姿态',
    type: 'swift',
    description: '快如闪电的迅捷姿态，大幅提升速度和闪避',
    icon: '💨',
    unlockCondition: {
      requireLevel: 30,
      requireRealm: '金丹期',
      requireSkillIds: [],
      goldCost: 100000,
      itemCost: [{ itemId: 'swift_feather', count: 20 }]
    },
    baseAttributes: {
      attack: 20,
      defense: 0,
      hp: 0,
      crit: 5,
      critDamage: 5,
      dodge: 15,
      hit: 10,
      speed: 30
    },
    bonuses: [
      { type: 'skill', condition: 5, value: 20, isPercent: true, description: '等级5: 技能冷却-20%' },
      { type: 'dodge', condition: 3, value: 10, isPercent: false, description: '等级3: 闪避+10' },
      { type: 'hit', condition: 5, value: 10, isPercent: false, description: '等级5: 命中+10' }
    ],
    activeEffects: [
      { type: 'damage_boost', value: 30, isPercent: true, duration: 5000, cooldown: 30000, description: '主动: 下3次攻击必定暴击' }
    ],
    expGrowth: 700,
    maxLevel: 10
  },
  // 狂战士姿态
  {
    templateId: 'stance_berserk',
    name: 'Berserk Stance',
    nameCN: '狂战士姿态',
    type: 'berserk',
    description: '燃烧生命的狂暴姿态，以血换攻',
    icon: '🔥',
    unlockCondition: {
      requireLevel: 50,
      requireRealm: '元婴期',
      requireSkillIds: ['stance_offensive'],
      goldCost: 200000,
      itemCost: [
        { itemId: 'berserk_essence', count: 10 },
        { itemId: 'blood_crystal', count: 20 }
      ]
    },
    baseAttributes: {
      attack: 80,
      defense: -20,
      hp: -100,
      crit: 15,
      critDamage: 30,
      dodge: -5,
      hit: 5,
      speed: 10
    },
    bonuses: [
      { type: 'attack', condition: 5, value: 30, isPercent: true, description: '等级5: 攻击+30%' },
      { type: 'crit', condition: 5, value: 15, isPercent: false, description: '等级5: 暴击+15' },
      { type: 'critDamage', condition: 3, value: 20, isPercent: false, description: '等级3: 暴伤+20' }
    ],
    activeEffects: [
      { type: 'rage', value: 100, isPercent: true, duration: 15000, cooldown: 90000, description: '主动: 攻击力翻倍但防御减半，持续15秒' }
    ],
    expGrowth: 1000,
    maxLevel: 10
  },
  // 战术姿态
  {
    templateId: 'stance_tactical',
    name: 'Tactical Stance',
    nameCN: '战术姿态',
    type: 'tactical',
    description: '运筹帷幄的战术姿态，智慧与策略的结合',
    icon: '🎯',
    unlockCondition: {
      requireLevel: 60,
      requireRealm: '化神期',
      requireSkillIds: ['stance_balanced', 'stance_swift'],
      goldCost: 300000,
      itemCost: [
        { itemId: 'tactical_orb', count: 10 },
        { itemId: 'wisdom_crystal', count: 20 }
      ]
    },
    baseAttributes: {
      attack: 30,
      defense: 20,
      hp: 50,
      crit: 10,
      critDamage: 15,
      dodge: 5,
      hit: 15,
      speed: 5
    },
    bonuses: [
      { type: 'skill', condition: 5, value: 30, isPercent: true, description: '等级5: 技能伤害+30%' },
      { type: 'ultimate', condition: 3, value: 20, isPercent: true, description: '等级3: 必杀奥义伤害+20%' },
      { type: 'crit', condition: 10, value: 20, isPercent: false, description: '等级10: 暴击+20' }
    ],
    activeEffects: [
      { type: 'counter', value: 50, isPercent: true, cooldown: 45000, description: '主动: 反击并反制敌人' }
    ],
    expGrowth: 1200,
    maxLevel: 10
  }
]

export const STANCE_CONFIG = {
  initialStances: 1,
  maxStances: 6,
  switchCooldown: 3000, // 3秒切换冷却
  maxSwitchesPerDay: 100,
}

export class BattleStanceSystem {
  private playerData: Map<string, PlayerStanceData> = new Map()
  
  getPlayerData(playerId: string): PlayerStanceData {
    if (!this.playerData.has(playerId)) {
      this.playerData.set(playerId, {
        playerId,
        stances: new Map(),
        activeStanceId: null,
        stanceSwitches: 0,
        lastSwitchTime: 0,
        totalExp: 0
      })
    }
    return this.playerData.get(playerId)!
  }
  
  getPlayerStances(playerId: string): BattleStance[] {
    const data = this.getPlayerData(playerId)
    return Array.from(data.stances.values())
  }
  
  getActiveStance(playerId: string): BattleStance | null {
    const data = this.getPlayerData(playerId)
    if (!data.activeStanceId) return null
    return data.stances.get(data.activeStanceId) || null
  }
  
  unlockStance(playerId: string, templateId: string): { success: boolean; message: string; stance?: BattleStance } {
    const data = this.getPlayerData(playerId)
    const template = STANCE_TEMPLATES.find(t => t.templateId === templateId)
    
    if (!template) {
      return { success: false, message: '战斗姿态模板不存在' }
    }
    
    // 检查是否已解锁
    for (const stance of data.stances.values()) {
      if (stance.templateId === templateId) {
        return { success: false, message: '已解锁该战斗姿态' }
      }
    }
    
    // 检查解锁数量上限
    if (data.stances.size >= STANCE_CONFIG.maxStances) {
      return { success: false, message: '已达战斗姿态解锁上限' }
    }
    
    // 检查解锁条件
    if (!this.checkUnlockCondition(playerId, template.unlockCondition, data.stances)) {
      return { success: false, message: '未满足解锁条件' }
    }
    
    const stance: BattleStance = {
      stanceId: `${playerId}_${templateId}_${Date.now()}`,
      playerId,
      templateId,
      name: template.name,
      nameCN: template.nameCN,
      type: template.type,
      description: template.description,
      icon: template.icon,
      state: 'unlocked',
      level: 1,
      exp: 0,
      maxExp: template.expGrowth,
      attributes: { ...template.baseAttributes },
      bonuses: [...template.bonuses],
      activeEffects: [...template.activeEffects],
      unlockCondition: template.unlockCondition,
      learnedAt: Date.now()
    }
    
    data.stances.set(stance.stanceId, stance)
    
    // 如果是第一个姿态，自动激活
    if (data.stances.size === 1) {
      data.activeStanceId = stance.stanceId
      stance.state = 'active'
    }
    
    return { success: true, message: `成功解锁战斗姿态: ${template.nameCN}`, stance }
  }
  
  private checkUnlockCondition(playerId: string, condition: StanceUnlockCondition, stances: Map<string, BattleStance>): boolean {
    // 简化检查 - 实际应从玩家数据获取等级、境界等信息
    // 检查前置技能
    if (condition.requireSkillIds.length > 0) {
      const unlockedTemplates = new Set(Array.from(stances.values()).map(s => s.templateId))
      for (const reqId of condition.requireSkillIds) {
        if (!unlockedTemplates.has(reqId)) {
          return false
        }
      }
    }
    return true
  }
  
  activateStance(playerId: string, stanceId: string): { success: boolean; message: string; oldStance?: BattleStance; newStance?: BattleStance } {
    const data = this.getPlayerData(playerId)
    const stance = data.stances.get(stanceId)
    
    if (!stance) {
      return { success: false, message: '战斗姿态不存在' }
    }
    
    if (stance.state === 'locked') {
      return { success: false, message: '战斗姿态未解锁' }
    }
    
    // 检查切换冷却
    const now = Date.now()
    if (data.activeStanceId && now - data.lastSwitchTime < STANCE_CONFIG.switchCooldown) {
      return { success: false, message: '切换冷却中' }
    }
    
    // 检查每日切换次数
    if (data.stanceSwitches >= STANCE_CONFIG.maxSwitchesPerDay) {
      return { success: false, message: '今日切换次数已达上限' }
    }
    
    const oldStance = data.activeStanceId ? data.stances.get(data.activeStanceId) || null : null
    
    // 切换姿态
    if (oldStance) {
      oldStance.state = 'unlocked'
    }
    stance.state = 'active'
    data.activeStanceId = stanceId
    data.stanceSwitches++
    data.lastSwitchTime = now
    
    return {
      success: true,
      message: `切换战斗姿态: ${stance.nameCN}`,
      oldStance: oldStance || undefined,
      newStance: stance
    }
  }
  
  upgradeStance(playerId: string, stanceId: string): { success: boolean; message: string; newLevel?: number } {
    const data = this.getPlayerData(playerId)
    const stance = data.stances.get(stanceId)
    
    if (!stance) {
      return { success: false, message: '战斗姿态不存在' }
    }
    
    const template = STANCE_TEMPLATES.find(t => t.templateId === stance.templateId)
    if (!template) {
      return { success: false, message: '战斗姿态模板不存在' }
    }
    
    if (stance.level >= template.maxLevel) {
      return { success: false, message: '战斗姿态等级已达上限' }
    }
    
    if (stance.exp < stance.maxExp) {
      return { success: false, message: '经验不足' }
    }
    
    stance.level++
    stance.exp = 0
    stance.maxExp = template.expGrowth * stance.level
    
    // 更新属性
    this.updateStanceAttributes(stance, template)
    
    return { success: true, message: `战斗姿态升级成功！当前等级: ${stance.level}`, newLevel: stance.level }
  }
  
  private updateStanceAttributes(stance: BattleStance, template: StanceTemplate): void {
    // 基础属性按等级成长
    const levelMultiplier = 1 + (stance.level - 1) * 0.1
    stance.attributes = {
      attack: Math.floor(template.baseAttributes.attack * levelMultiplier),
      defense: Math.floor(template.baseAttributes.defense * levelMultiplier),
      hp: Math.floor(template.baseAttributes.hp * levelMultiplier),
      crit: Math.floor(template.baseAttributes.crit * levelMultiplier),
      critDamage: Math.floor(template.baseAttributes.critDamage * levelMultiplier),
      dodge: Math.floor(template.baseAttributes.dodge * levelMultiplier),
      hit: Math.floor(template.baseAttributes.hit * levelMultiplier),
      speed: Math.floor(template.baseAttributes.speed * levelMultiplier)
    }
  }
  
  addExp(playerId: string, stanceId: string, exp: number): { success: boolean; message: string; leveledUp?: boolean } {
    const data = this.getPlayerData(playerId)
    const stance = data.stances.get(stanceId)
    
    if (!stance) {
      return { success: false, message: '战斗姿态不存在' }
    }
    
    const template = STANCE_TEMPLATES.find(t => t.templateId === stance.templateId)
    if (!template) {
      return { success: false, message: '战斗姿态模板不存在' }
    }
    
    if (stance.level >= template.maxLevel) {
      return { success: false, message: '战斗姿态等级已达上限' }
    }
    
    stance.exp += exp
    data.totalExp += exp
    let leveledUp = false
    
    while (stance.exp >= stance.maxExp && stance.level < template.maxLevel) {
      stance.exp -= stance.maxExp
      this.upgradeStance(playerId, stanceId)
      leveledUp = true
    }
    
    return { success: true, message: `获得经验: ${exp}`, leveledUp }
  }
  
  getStanceBonusAttributes(playerId: string): StanceAttribute {
    const activeStance = this.getActiveStance(playerId)
    if (!activeStance) {
      return {
        attack: 0, defense: 0, hp: 0, crit: 0,
        critDamage: 0, dodge: 0, hit: 0, speed: 0
      }
    }
    
    const bonus: StanceAttribute = {
      attack: 0, defense: 0, hp: 0, crit: 0,
      critDamage: 0, dodge: 0, hit: 0, speed: 0
    }
    
    // 应用等级加成
    const levelMultiplier = 1 + (activeStance.level - 1) * 0.1
    
    // 应用被动加成
    for (const b of activeStance.bonuses) {
      if (activeStance.level >= b.condition) {
        if (b.isPercent) {
          switch (b.type) {
            case 'attack': bonus.attack += Math.floor(activeStance.attributes.attack * b.value / 100); break
            case 'defense': bonus.defense += Math.floor(activeStance.attributes.defense * b.value / 100); break
            case 'hp': bonus.hp += Math.floor(activeStance.attributes.hp * b.value / 100); break
            case 'crit': bonus.crit += Math.floor(activeStance.attributes.crit * b.value / 100); break
          }
        } else {
          switch (b.type) {
            case 'attack': bonus.attack += b.value; break
            case 'defense': bonus.defense += b.value; break
            case 'hp': bonus.hp += b.value; break
            case 'crit': bonus.crit += b.value; break
            case 'skill': case 'ultimate': break // 这些在计算技能伤害时应用
          }
        }
      }
    }
    
    return {
      attack: Math.floor(activeStance.attributes.attack * levelMultiplier) + bonus.attack,
      defense: Math.floor(activeStance.attributes.defense * levelMultiplier) + bonus.defense,
      hp: Math.floor(activeStance.attributes.hp * levelMultiplier) + bonus.hp,
      crit: Math.floor(activeStance.attributes.crit * levelMultiplier) + bonus.crit,
      critDamage: Math.floor(activeStance.attributes.critDamage * levelMultiplier) + bonus.critDamage,
      dodge: Math.floor(activeStance.attributes.dodge * levelMultiplier) + bonus.dodge,
      hit: Math.floor(activeStance.attributes.hit * levelMultiplier) + bonus.hit,
      speed: Math.floor(activeStance.attributes.speed * levelMultiplier) + bonus.speed
    }
  }
  
  getStanceById(playerId: string, stanceId: string): BattleStance | undefined {
    const data = this.getPlayerData(playerId)
    return data.stances.get(stanceId)
  }
  
  getStancesByType(playerId: string, type: StanceType): BattleStance[] {
    const data = this.getPlayerData(playerId)
    return Array.from(data.stances.values()).filter(s => s.type === type)
  }
}

// 导出单例
export const battleStanceSystem = new BattleStanceSystem()
