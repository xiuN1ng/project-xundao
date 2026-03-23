/**
 * 必杀奥义系统 - v29 版本
 * 强大的终极技能，需要特定条件解锁和激活
 */

export type UltimateCategory = 'destruction' | 'guardian' | 'swift' | 'mystic' | 'legendary'
export type UltimateRarity = 'rare' | 'epic' | 'legendary' | 'mythical'
export type UltimateState = 'locked' | 'unlocked' | 'activated' | 'cooldown'

export interface UltimateSkill {
  ultimateId: string
  playerId: string
  templateId: string
  name: string
  nameCN: string
  category: UltimateCategory
  rarity: UltimateRarity
  description: string
  icon: string
  state: UltimateState
  level: number
  exp: number
  maxExp: number
  power: number // 威力系数
  cooldown: number // 冷却时间(ms)
  currentCooldown: number
  cost: UltimateCost
  effects: UltimateEffect[]
  unlockCondition: UnlockCondition
  activatedAt: number | null
  learnedAt: number
}

export interface UltimateCost {
  hp?: number // 消耗生命值百分比
  mp?: number // 消耗灵气值
  items?: Array<{ itemId: string; count: number }>
  cooldownItem?: string // 冷却道具
}

export interface UnlockCondition {
  requireLevel: number
  requireRealm: string
  requireSkillIds: string[]
  requireUltimateIds: string[]
  requireAchievement?: string
  goldCost: number
  itemCost: Array<{ itemId: string; count: number }>
}

export interface UltimateEffect {
  type: 'damage' | 'heal' | 'buff' | 'debuff' | 'absorb' | 'reflect' | 'pierce' | 'cleave'
  value: number
  isPercent: boolean
  duration?: number
  description: string
}

export interface UltimateTemplate {
  templateId: string
  name: string
  nameCN: string
  category: UltimateCategory
  rarity: UltimateRarity
  description: string
  icon: string
  unlockCondition: UnlockCondition
  basePower: number
  cooldown: number
  costs: UltimateCost[]
  effects: UltimateEffect[]
  expGrowth: number
  maxLevel: number
}

export interface PlayerUltimateData {
  playerId: string
  ultiamtes: Map<string, UltimateSkill>
  totalUltimates: number
  activatedUltimates: number
  lastUpdateTime: number
}

export interface ActivateUltimateResult {
  success: boolean
  message: string
  damage?: number
  effects?: UltimateEffect[]
  newCooldown?: number
}

// 必杀奥义模板配置
export const ULTIMATE_TEMPLATES: UltimateTemplate[] = [
  // 毁灭系 - 破坏型必杀奥义
  {
    templateId: 'ultimate_fengshen',
    name: 'Feng Shen',
    nameCN: '封神秘录',
    category: 'destruction',
    rarity: 'legendary',
    description: '召唤上古封神之力，对敌方全体造成毁灭性打击',
    icon: '⚡',
    unlockCondition: {
      requireLevel: 100,
      requireRealm: '大乘期',
      requireSkillIds: ['skill_meteor'],
      requireUltimateIds: [],
      requireAchievement: 'kill_boss_100',
      goldCost: 1000000,
      itemCost: [
        { itemId: 'fengshen_token', count: 1 },
        { itemId: 'meteor_orb', count: 50 }
      ]
    },
    basePower: 5000,
    cooldown: 300000, // 5分钟
    costs: [{ mp: 5000, items: [] }],
    effects: [
      { type: 'damage', value: 500, isPercent: false, description: '基础伤害5000' },
      { type: 'pierce', value: 50, isPercent: true, description: '穿透防御50%' },
      { type: 'cleave', value: 30, isPercent: true, description: '溅射伤害30%' }
    ],
    expGrowth: 1000,
    maxLevel: 5
  },
  {
    templateId: 'ultimate_tianhuo',
    name: 'Tian Huo',
    nameCN: '天火降世',
    category: 'destruction',
    rarity: 'epic',
    description: '召唤天火之力，对敌方单体造成巨大伤害',
    icon: '🔥',
    unlockCondition: {
      requireLevel: 80,
      requireRealm: '炼虚期',
      requireSkillIds: ['skill_fire_ball'],
      requireUltimateIds: [],
      goldCost: 500000,
      itemCost: [
        { itemId: 'fire_orb', count: 30 },
        { itemId: 'heaven_fire', count: 10 }
      ]
    },
    basePower: 3000,
    cooldown: 180000, // 3分钟
    costs: [{ mp: 3000, items: [] }],
    effects: [
      { type: 'damage', value: 3000, isPercent: false, description: '基础伤害3000' },
      { type: 'buff', value: 50, isPercent: true, duration: 5000, description: '燃烧伤害50%/秒' }
    ],
    expGrowth: 800,
    maxLevel: 5
  },
  // 守护系 - 防御型必杀奥义
  {
    templateId: 'ultimate_tianjin',
    name: 'Tian Jin',
    nameCN: '天金护体',
    category: 'guardian',
    rarity: 'legendary',
    description: '召唤天金之力，形成绝对防御护盾',
    icon: '🛡️',
    unlockCondition: {
      requireLevel: 100,
      requireRealm: '大乘期',
      requireSkillIds: ['skill_ice_shield'],
      requireUltimateIds: [],
      requireAchievement: 'defense_10000',
      goldCost: 1000000,
      itemCost: [
        { itemId: 'tianjin_orb', count: 1 },
        { itemId: 'ice_orb', count: 50 }
      ]
    },
    basePower: 0,
    cooldown: 240000, // 4分钟
    costs: [{ hp: 30, items: [] }],
    effects: [
      { type: 'absorb', value: 10000, isPercent: false, duration: 10000, description: '吸收10000伤害' },
      { type: 'buff', value: 100, isPercent: true, duration: 10000, description: '防御提升100%' },
      { type: 'reflect', value: 30, isPercent: true, description: '反射30%伤害' }
    ],
    expGrowth: 1000,
    maxLevel: 5
  },
  {
    templateId: 'ultimate_yuhua',
    name: 'Yu Hua',
    nameCN: '玉华金身',
    category: 'guardian',
    rarity: 'epic',
    description: '凝聚玉华之气，形成强大金身护体',
    icon: '✨',
    unlockCondition: {
      requireLevel: 80,
      requireRealm: '炼虚期',
      requireSkillIds: ['skill_ice_shield'],
      requireUltimateIds: [],
      goldCost: 500000,
      itemCost: [
        { itemId: 'jade_essence', count: 30 },
        { itemId: 'gold_orb', count: 20 }
      ]
    },
    basePower: 0,
    cooldown: 180000,
    costs: [{ hp: 20, items: [] }],
    effects: [
      { type: 'absorb', value: 5000, isPercent: false, duration: 8000, description: '吸收5000伤害' },
      { type: 'buff', value: 50, isPercent: true, duration: 8000, description: '防御提升50%' }
    ],
    expGrowth: 800,
    maxLevel: 5
  },
  // 迅捷系 - 速度型必杀奥义
  {
    templateId: 'ultimate_shanyin',
    name: 'Shan Yin',
    nameCN: '闪电银光',
    category: 'swift',
    rarity: 'legendary',
    description: '化身闪电，对敌人进行瞬间多次打击',
    icon: '⚡',
    unlockCondition: {
      requireLevel: 100,
      requireRealm: '大乘期',
      requireSkillIds: [],
      requireUltimateIds: [],
      requireAchievement: 'speed_kill_50',
      goldCost: 1200000,
      itemCost: [
        { itemId: 'lightning_orb', count: 1 },
        { itemId: 'swift_feather', count: 50 }
      ]
    },
    basePower: 8000,
    cooldown: 360000, // 6分钟
    costs: [{ mp: 8000, items: [] }],
    effects: [
      { type: 'damage', value: 2000, isPercent: false, description: '每次伤害2000' },
      { type: 'pierce', value: 100, isPercent: true, description: '必定命中' },
      { type: 'buff', value: 200, isPercent: true, description: '攻速提升200%' }
    ],
    expGrowth: 1200,
    maxLevel: 5
  },
  // 神秘系 - 辅助型必杀奥义
  {
    templateId: 'ultimate_qiankun',
    name: 'Qian Kun',
    nameCN: '乾坤逆转',
    category: 'mystic',
    rarity: 'mythical',
    description: '逆转乾坤，将敌人属性转移给自己',
    icon: '🔮',
    unlockCondition: {
      requireLevel: 120,
      requireRealm: '准圣',
      requireSkillIds: [],
      requireUltimateIds: ['ultimate_fengshen', 'ultimate_tianjin'],
      requireAchievement: 'pvp_win_1000',
      goldCost: 5000000,
      itemCost: [
        { itemId: 'qiankun_orb', count: 1 },
        { itemId: 'yinYang_orb', count: 10 }
      ]
    },
    basePower: 0,
    cooldown: 600000, // 10分钟
    costs: [{ hp: 50, mp: 10000, items: [] }],
    effects: [
      { type: 'buff', value: 100, isPercent: true, duration: 30000, description: '全属性提升100%' },
      { type: 'debuff', value: 50, isPercent: true, duration: 30000, description: '敌人全属性降低50%' },
      { type: 'heal', value: 50, isPercent: true, description: '恢复自身50%生命' }
    ],
    expGrowth: 2000,
    maxLevel: 3
  },
  // 传说系 - 综合性必杀奥义
  {
    templateId: 'ultimate_xianwei',
    name: 'Xian Wei',
    nameCN: '仙威降临',
    category: 'legendary',
    rarity: 'mythical',
    description: '释放仙人之威，压倒性力量消灭敌人',
    icon: '👑',
    unlockCondition: {
      requireLevel: 150,
      requireRealm: '圣人',
      requireSkillIds: ['skill_meteor', 'skill_fengshen'],
      requireUltimateIds: ['ultimate_fengshen'],
      requireAchievement: 'legendary_hero',
      goldCost: 10000000,
      itemCost: [
        { itemId: 'xianwei_token', count: 1 },
        { itemId: 'immortal_crystal', count: 100 }
      ]
    },
    basePower: 20000,
    cooldown: 900000, // 15分钟
    costs: [{ hp: 80, mp: 20000, items: [{ itemId: 'immortal_crystal', count: 1 }] }],
    effects: [
      { type: 'damage', value: 20000, isPercent: false, description: '基础伤害20000' },
      { type: 'pierce', value: 100, isPercent: true, description: '穿透防御100%' },
      { type: 'debuff', value: 100, isPercent: true, duration: 10000, description: '敌人防御降低100%' },
      { type: 'heal', value: 100, isPercent: true, description: '恢复自身100%生命' }
    ],
    expGrowth: 5000,
    maxLevel: 3
  }
]

export const ULTIMATE_CONFIG = {
  initialUltimates: 0,
  maxUltimates: 10,
  expPerLevel: 1000,
  powerGrowthRate: 1.5,
  cooldownReductionPerLevel: 0.05, // 5%冷却缩减
}

export class UltimateSkillSystem {
  private playerData: Map<string, PlayerUltimateData> = new Map()
  
  getPlayerData(playerId: string): PlayerUltimateData {
    if (!this.playerData.has(playerId)) {
      this.playerData.set(playerId, {
        playerId,
        ultiamtes: new Map(),
        totalUltimates: 0,
        activatedUltimates: 0,
        lastUpdateTime: Date.now()
      })
    }
    return this.playerData.get(playerId)!
  }
  
  getPlayerUltimates(playerId: string): UltimateSkill[] {
    const data = this.getPlayerData(playerId)
    return Array.from(data.ultiamtes.values())
  }
  
  unlockUltimate(playerId: string, templateId: string): { success: boolean; message: string; ultimate?: UltimateSkill } {
    const data = this.getPlayerData(playerId)
    const template = ULTIMATE_TEMPLATES.find(t => t.templateId === templateId)
    
    if (!template) {
      return { success: false, message: '必杀奥义模板不存在' }
    }
    
    // 检查是否已解锁
    for (const ultimate of data.ultiamtes.values()) {
      if (ultimate.templateId === templateId) {
        return { success: false, message: '已解锁该必杀奥义' }
      }
    }
    
    // 检查解锁数量上限
    if (data.totalUltimates >= ULTIMATE_CONFIG.maxUltimates) {
      return { success: false, message: '已达必杀奥义解锁上限' }
    }
    
    // 检查解锁条件
    if (!this.checkUnlockCondition(playerId, template.unlockCondition)) {
      return { success: false, message: '未满足解锁条件' }
    }
    
    const ultimate: UltimateSkill = {
      ultimateId: `${playerId}_${templateId}_${Date.now()}`,
      playerId,
      templateId,
      name: template.name,
      nameCN: template.nameCN,
      category: template.category,
      rarity: template.rarity,
      description: template.description,
      icon: template.icon,
      state: 'unlocked',
      level: 1,
      exp: 0,
      maxExp: template.expGrowth,
      power: template.basePower,
      cooldown: template.cooldown,
      currentCooldown: 0,
      cost: template.costs[0],
      effects: [...template.effects],
      unlockCondition: template.unlockCondition,
      activatedAt: null,
      learnedAt: Date.now()
    }
    
    data.ultiamtes.set(ultimate.ultimateId, ultimate)
    data.totalUltimates++
    
    return { success: true, message: `成功解锁必杀奥义: ${template.nameCN}`, ultimate }
  }
  
  private checkUnlockCondition(playerId: string, condition: UnlockCondition): boolean {
    // 简化检查 - 实际应从玩家数据获取等级、境界等信息
    // 这里假设玩家满足基本条件
    return true
  }
  
  activateUltimate(playerId: string, ultimateId: string, targetId?: string): ActivateUltimateResult {
    const data = this.getPlayerData(playerId)
    const ultimate = data.ultiamtes.get(ultimateId)
    
    if (!ultimate) {
      return { success: false, message: '必杀奥义不存在' }
    }
    
    if (ultimate.state === 'locked') {
      return { success: false, message: '必杀奥义未解锁' }
    }
    
    if (ultimate.currentCooldown > 0) {
      return { success: false, message: `必杀奥义冷却中，剩余${Math.ceil(ultimate.currentCooldown / 1000)}秒` }
    }
    
    // 检查消耗
    if (ultimate.cost.hp && ultimate.cost.hp > 0) {
      // 实际应检查玩家生命值
    }
    
    if (ultimate.cost.mp && ultimate.cost.mp > 0) {
      // 实际应检查玩家灵气值
    }
    
    // 激活必杀奥义
    ultimate.state = 'activated'
    ultimate.activatedAt = Date.now()
    ultimate.currentCooldown = ultimate.cooldown
    data.activatedUltimates++
    
    // 计算伤害/效果
    const damage = ultimate.power * (1 + (ultimate.level - 1) * ULTIMATE_CONFIG.powerGrowthRate)
    
    return {
      success: true,
      message: `激活必杀奥义: ${ultimate.nameCN}!`,
      damage,
      effects: ultimate.effects,
      newCooldown: ultimate.cooldown
    }
  }
  
  upgradeUltimate(playerId: string, ultimateId: string): { success: boolean; message: string; newLevel?: number } {
    const data = this.getPlayerData(playerId)
    const ultimate = data.ultiamtes.get(ultimateId)
    
    if (!ultimate) {
      return { success: false, message: '必杀奥义不存在' }
    }
    
    const template = ULTIMATE_TEMPLATES.find(t => t.templateId === ultimate.templateId)
    if (!template) {
      return { success: false, message: '必杀奥义模板不存在' }
    }
    
    if (ultimate.level >= template.maxLevel) {
      return { success: false, message: '必杀奥义等级已达上限' }
    }
    
    if (ultimate.exp < ultimate.maxExp) {
      return { success: false, message: '经验不足' }
    }
    
    ultimate.level++
    ultimate.exp = 0
    ultimate.maxExp = template.expGrowth * ultimate.level
    ultimate.power = template.basePower * (1 + (ultimate.level - 1) * ULTIMATE_CONFIG.powerGrowthRate)
    ultimate.cooldown = Math.floor(template.cooldown * (1 - (ultimate.level - 1) * ULTIMATE_CONFIG.cooldownReductionPerLevel))
    
    return { success: true, message: `必杀奥义升级成功！当前等级: ${ultimate.level}`, newLevel: ultimate.level }
  }
  
  addExp(playerId: string, ultimateId: string, exp: number): { success: boolean; message: string; leveledUp?: boolean } {
    const data = this.getPlayerData(playerId)
    const ultimate = data.ultiamtes.get(ultimateId)
    
    if (!ultimate) {
      return { success: false, message: '必杀奥义不存在' }
    }
    
    const template = ULTIMATE_TEMPLATES.find(t => t.templateId === ultimate.templateId)
    if (!template) {
      return { success: false, message: '必杀奥义模板不存在' }
    }
    
    if (ultimate.level >= template.maxLevel) {
      return { success: false, message: '必杀奥义等级已达上限' }
    }
    
    ultimate.exp += exp
    let leveledUp = false
    
    while (ultimate.exp >= ultimate.maxExp && ultimate.level < template.maxLevel) {
      ultimate.exp -= ultimate.maxExp
      this.upgradeUltimate(playerId, ultimateId)
      leveledUp = true
    }
    
    return { success: true, message: `获得经验: ${exp}`, leveledUp }
  }
  
  updateCooldowns(playerId: string, deltaTime: number): void {
    const data = this.getPlayerData(playerId)
    for (const ultimate of data.ultiamtes.values()) {
      if (ultimate.currentCooldown > 0) {
        ultimate.currentCooldown = Math.max(0, ultimate.currentCooldown - deltaTime)
        if (ultimate.currentCooldown === 0 && ultimate.state === 'cooldown') {
          ultimate.state = 'unlocked'
        }
      }
    }
  }
  
  getUltimateById(playerId: string, ultimateId: string): UltimateSkill | undefined {
    const data = this.getPlayerData(playerId)
    return data.ultiamtes.get(ultimateId)
  }
  
  getUltimatesByCategory(playerId: string, category: UltimateCategory): UltimateSkill[] {
    const data = this.getPlayerData(playerId)
    return Array.from(data.ultiamtes.values()).filter(u => u.category === category)
  }
  
  getUltimatesByRarity(playerId: string, rarity: UltimateRarity): UltimateSkill[] {
    const data = this.getPlayerData(playerId)
    return Array.from(data.ultiamtes.values()).filter(u => u.rarity === rarity)
  }
}

// 导出单例
export const ultimateSkillSystem = new UltimateSkillSystem()
