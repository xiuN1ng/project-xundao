// 技能系统 - 技能升级与技能突破
// v25 版本：技能升级、技能突破

export interface Skill {
  skillId: string
  playerId: string
  skillTemplateId: string
  name: string
  nameCN: string
  type: SkillType
  category: SkillCategory
  level: number
  breakthroughLevel: number
  isActive: boolean
  cost: SkillCost
  effects: SkillEffect[]
  cooldown: number
  currentCooldown: number
  exp: number
  maxExp: number
  learnedAt: number
  updatedAt: number
}

export type SkillType = 'active' | 'passive' | 'ultimate'
export type SkillCategory = 'combat' | 'support' | 'special' | 'cultivation'

export interface SkillCost {
  gold?: number
  exp?: number
  items?: SkillItemCost[]
}

export interface SkillItemCost {
  itemId: string
  count: number
}

export interface SkillEffect {
  type: 'damage' | 'heal' | 'buff' | 'debuff' | 'passive' | 'special'
  value: number
  isPercent: boolean
  description: string
}

export interface SkillTemplate {
  templateId: string
  name: string
  nameCN: string
  type: SkillType
  category: SkillCategory
  description: string
  icon: string
  require: { level: number; skillIds?: string[]; realm?: string }
  upgradeCosts: SkillUpgradeCost[]
  breakthroughCosts: BreakthroughCost[]
  baseEffects: SkillEffect[]
  effectsPerLevel: SkillEffect[]
  effectsPerBreakthrough: SkillEffect[]
  cooldown: number
  maxLevel: number
  maxBreakthrough: number
}

export interface SkillUpgradeCost {
  level: number
  gold: number
  exp: number
  items: SkillItemCost[]
}

export interface BreakthroughCost {
  level: number
  gold: number
  items: SkillItemCost[]
  successRate: number
  requirement: string
}

export interface PlayerSkillData {
  playerId: string
  skills: Map<string, Skill>
  skillPoints: number
  totalSkillPoints: number
  lastUpdateTime: number
}

export interface SkillUpgradeResult {
  success: boolean
  newLevel: number
  newExp: number
  newEffects: SkillEffect[]
  consumeGold: number
  consumeExp: number
  consumeItems: SkillItemCost[]
  message: string
}

export interface SkillBreakthroughResult {
  success: boolean
  newBreakthroughLevel: number
  newEffects: SkillEffect[]
  consumeGold: number
  consumeItems: SkillItemCost[]
  message: string
}

export const SKILL_SYSTEM_CONFIG = {
  initialSkillPoints: 3,
  skillPointsPerLevel: 1,
  maxSkillLevel: 10,
  maxBreakthroughLevel: 5,
  expGrowthRate: 1.5,
}

export const SKILL_TEMPLATES: SkillTemplate[] = [
  {
    templateId: 'skill_fire_ball',
    name: 'Fire Ball',
    nameCN: '火球术',
    type: 'active',
    category: 'combat',
    description: '发射一个火球攻击敌人',
    icon: '🔥',
    require: { level: 1 },
    upgradeCosts: [
      { level: 1, gold: 100, exp: 50, items: [] },
      { level: 2, gold: 200, exp: 100, items: [{ itemId: 'fire_essence', count: 1 }] },
      { level: 3, gold: 400, exp: 200, items: [{ itemId: 'fire_essence', count: 2 }] },
      { level: 4, gold: 800, exp: 400, items: [{ itemId: 'fire_essence', count: 3 }] },
      { level: 5, gold: 1500, exp: 800, items: [{ itemId: 'fire_crystal', count: 1 }] },
      { level: 6, gold: 3000, exp: 1500, items: [{ itemId: 'fire_crystal', count: 2 }] },
      { level: 7, gold: 6000, exp: 3000, items: [{ itemId: 'fire_crystal', count: 3 }] },
      { level: 8, gold: 12000, exp: 6000, items: [{ itemId: 'fire_orb', count: 1 }] },
      { level: 9, gold: 25000, exp: 12000, items: [{ itemId: 'fire_orb', count: 2 }] },
      { level: 10, gold: 50000, exp: 25000, items: [{ itemId: 'fire_orb', count: 3 }] },
    ],
    breakthroughCosts: [
      { level: 1, gold: 50000, items: [{ itemId: 'breakthrough_stone', count: 1 }], successRate: 0.8, requirement: '境界突破至金丹期' },
      { level: 2, gold: 100000, items: [{ itemId: 'breakthrough_stone', count: 2 }], successRate: 0.7, requirement: '境界突破至元婴期' },
      { level: 3, gold: 200000, items: [{ itemId: 'breakthrough_stone', count: 3 }], successRate: 0.6, requirement: '境界突破至化神期' },
      { level: 4, gold: 400000, items: [{ itemId: 'breakthrough_stone', count: 5 }], successRate: 0.5, requirement: '境界突破至炼虚期' },
      { level: 5, gold: 800000, items: [{ itemId: 'breakthrough_stone', count: 10 }], successRate: 0.4, requirement: '境界突破至大乘期' },
    ],
    baseEffects: [{ type: 'damage', value: 100, isPercent: false, description: '基础伤害100' }],
    effectsPerLevel: [{ type: 'damage', value: 20, isPercent: false, description: '每级伤害+20' }],
    effectsPerBreakthrough: [{ type: 'damage', value: 50, isPercent: false, description: '每突破伤害+50' }],
    cooldown: 3000,
    maxLevel: 10,
    maxBreakthrough: 5,
  },
  {
    templateId: 'skill_ice_shield',
    name: 'Ice Shield',
    nameCN: '冰盾术',
    type: 'active',
    category: 'combat',
    description: '召唤冰盾保护自己',
    icon: '🛡️',
    require: { level: 3 },
    upgradeCosts: [
      { level: 1, gold: 150, exp: 80, items: [] },
      { level: 2, gold: 300, exp: 150, items: [{ itemId: 'ice_essence', count: 1 }] },
      { level: 3, gold: 600, exp: 300, items: [{ itemId: 'ice_essence', count: 2 }] },
      { level: 4, gold: 1200, exp: 600, items: [{ itemId: 'ice_essence', count: 3 }] },
      { level: 5, gold: 2500, exp: 1200, items: [{ itemId: 'ice_crystal', count: 1 }] },
      { level: 6, gold: 5000, exp: 2500, items: [{ itemId: 'ice_crystal', count: 2 }] },
      { level: 7, gold: 10000, exp: 5000, items: [{ itemId: 'ice_crystal', count: 3 }] },
      { level: 8, gold: 20000, exp: 10000, items: [{ itemId: 'ice_orb', count: 1 }] },
      { level: 9, gold: 40000, exp: 20000, items: [{ itemId: 'ice_orb', count: 2 }] },
      { level: 10, gold: 80000, exp: 40000, items: [{ itemId: 'ice_orb', count: 3 }] },
    ],
    breakthroughCosts: [
      { level: 1, gold: 80000, items: [{ itemId: 'breakthrough_stone', count: 1 }], successRate: 0.8, requirement: '境界突破至金丹期' },
      { level: 2, gold: 160000, items: [{ itemId: 'breakthrough_stone', count: 2 }], successRate: 0.7, requirement: '境界突破至元婴期' },
      { level: 3, gold: 320000, items: [{ itemId: 'breakthrough_stone', count: 3 }], successRate: 0.6, requirement: '境界突破至化神期' },
      { level: 4, gold: 640000, items: [{ itemId: 'breakthrough_stone', count: 5 }], successRate: 0.5, requirement: '境界突破至炼虚期' },
      { level: 5, gold: 1200000, items: [{ itemId: 'breakthrough_stone', count: 10 }], successRate: 0.4, requirement: '境界突破至大乘期' },
    ],
    baseEffects: [{ type: 'buff', value: 50, isPercent: false, description: '基础防御+50' }],
    effectsPerLevel: [{ type: 'buff', value: 15, isPercent: false, description: '每级防御+15' }],
    effectsPerBreakthrough: [{ type: 'buff', value: 30, isPercent: false, description: '每突破防御+30' }],
    cooldown: 10000,
    maxLevel: 10,
    maxBreakthrough: 5,
  },
  {
    templateId: 'skill_heal',
    name: 'Healing Light',
    nameCN: '治疗术',
    type: 'active',
    category: 'support',
    description: '恢复目标生命值',
    icon: '💚',
    require: { level: 2 },
    upgradeCosts: [
      { level: 1, gold: 120, exp: 60, items: [] },
      { level: 2, gold: 250, exp: 120, items: [{ itemId: 'life_essence', count: 1 }] },
      { level: 3, gold: 500, exp: 250, items: [{ itemId: 'life_essence', count: 2 }] },
      { level: 4, gold: 1000, exp: 500, items: [{ itemId: 'life_essence', count: 3 }] },
      { level: 5, gold: 2000, exp: 1000, items: [{ itemId: 'life_crystal', count: 1 }] },
      { level: 6, gold: 4000, exp: 2000, items: [{ itemId: 'life_crystal', count: 2 }] },
      { level: 7, gold: 8000, exp: 4000, items: [{ itemId: 'life_crystal', count: 3 }] },
      { level: 8, gold: 16000, exp: 8000, items: [{ itemId: 'life_orb', count: 1 }] },
      { level: 9, gold: 32000, exp: 16000, items: [{ itemId: 'life_orb', count: 2 }] },
      { level: 10, gold: 64000, exp: 32000, items: [{ itemId: 'life_orb', count: 3 }] },
    ],
    breakthroughCosts: [
      { level: 1, gold: 60000, items: [{ itemId: 'breakthrough_stone', count: 1 }], successRate: 0.8, requirement: '境界突破至金丹期' },
      { level: 2, gold: 120000, items: [{ itemId: 'breakthrough_stone', count: 2 }], successRate: 0.7, requirement: '境界突破至元婴期' },
      { level: 3, gold: 240000, items: [{ itemId: 'breakthrough_stone', count: 3 }], successRate: 0.6, requirement: '境界突破至化神期' },
      { level: 4, gold: 480000, items: [{ itemId: 'breakthrough_stone', count: 5 }], successRate: 0.5, requirement: '境界突破至炼虚期' },
      { level: 5, gold: 960000, items: [{ itemId: 'breakthrough_stone', count: 10 }], successRate: 0.4, requirement: '境界突破至大乘期' },
    ],
    baseEffects: [{ type: 'heal', value: 80, isPercent: false, description: '基础治疗80' }],
    effectsPerLevel: [{ type: 'heal', value: 20, isPercent: false, description: '每级治疗+20' }],
    effectsPerBreakthrough: [{ type: 'heal', value: 40, isPercent: false, description: '每突破治疗+40' }],
    cooldown: 5000,
    maxLevel: 10,
    maxBreakthrough: 5,
  },
  {
    templateId: 'skill_power_passive',
    name: 'Power Boost',
    nameCN: '力量增强',
    type: 'passive',
    category: 'combat',
    description: '永久提升攻击力',
    icon: '💪',
    require: { level: 1 },
    upgradeCosts: [
      { level: 1, gold: 80, exp: 40, items: [] },
      { level: 2, gold: 160, exp: 80, items: [{ itemId: 'power_essence', count: 1 }] },
      { level: 3, gold: 320, exp: 160, items: [{ itemId: 'power_essence', count: 2 }] },
      { level: 4, gold: 640, exp: 320, items: [{ itemId: 'power_essence', count: 3 }] },
      { level: 5, gold: 1280, exp: 640, items: [{ itemId: 'power_crystal', count: 1 }] },
      { level: 6, gold: 2560, exp: 1280, items: [{ itemId: 'power_crystal', count: 2 }] },
      { level: 7, gold: 5120, exp: 2560, items: [{ itemId: 'power_crystal', count: 3 }] },
      { level: 8, gold: 10240, exp: 5120, items: [{ itemId: 'power_orb', count: 1 }] },
      { level: 9, gold: 20480, exp: 10240, items: [{ itemId: 'power_orb', count: 2 }] },
      { level: 10, gold: 40960, exp: 20480, items: [{ itemId: 'power_orb', count: 3 }] },
    ],
    breakthroughCosts: [
      { level: 1, gold: 40000, items: [{ itemId: 'breakthrough_stone', count: 1 }], successRate: 0.8, requirement: '境界突破至金丹期' },
      { level: 2, gold: 80000, items: [{ itemId: 'breakthrough_stone', count: 2 }], successRate: 0.7, requirement: '境界突破至元婴期' },
      { level: 3, gold: 160000, items: [{ itemId: 'breakthrough_stone', count: 3 }], successRate: 0.6, requirement: '境界突破至化神期' },
      { level: 4, gold: 320000, items: [{ itemId: 'breakthrough_stone', count: 5 }], successRate: 0.5, requirement: '境界突破至炼虚期' },
      { level: 5, gold: 640000, items: [{ itemId: 'breakthrough_stone', count: 10 }], successRate: 0.4, requirement: '境界突破至大乘期' },
    ],
    baseEffects: [{ type: 'passive', value: 10, isPercent: false, description: '基础攻击+10' }],
    effectsPerLevel: [{ type: 'passive', value: 5, isPercent: false, description: '每级攻击+5' }],
    effectsPerBreakthrough: [{ type: 'passive', value: 10, isPercent: false, description: '每突破攻击+10' }],
    cooldown: 0,
    maxLevel: 10,
    maxBreakthrough: 5,
  },
  {
    templateId: 'skill_crit_passive',
    name: 'Critical Eye',
    nameCN: '暴击之眼',
    type: 'passive',
    category: 'combat',
    description: '永久提升暴击率',
    icon: '👁️',
    require: { level: 5 },
    upgradeCosts: [
      { level: 1, gold: 200, exp: 100, items: [] },
      { level: 2, gold: 400, exp: 200, items: [{ itemId: 'crit_essence', count: 1 }] },
      { level: 3, gold: 800, exp: 400, items: [{ itemId: 'crit_essence', count: 2 }] },
      { level: 4, gold: 1600, exp: 800, items: [{ itemId: 'crit_essence', count: 3 }] },
      { level: 5, gold: 3200, exp: 1600, items: [{ itemId: 'crit_crystal', count: 1 }] },
      { level: 6, gold: 6400, exp: 3200, items: [{ itemId: 'crit_crystal', count: 2 }] },
      { level: 7, gold: 12800, exp: 6400, items: [{ itemId: 'crit_crystal', count: 3 }] },
      { level: 8, gold: 25600, exp: 12800, items: [{ itemId: 'crit_orb', count: 1 }] },
      { level: 9, gold: 51200, exp: 25600, items: [{ itemId: 'crit_orb', count: 2 }] },
      { level: 10, gold: 102400, exp: 51200, items: [{ itemId: 'crit_orb', count: 3 }] },
    ],
    breakthroughCosts: [
      { level: 1, gold: 100000, items: [{ itemId: 'breakthrough_stone', count: 1 }], successRate: 0.8, requirement: '境界突破至金丹期' },
      { level: 2, gold: 200000, items: [{ itemId: 'breakthrough_stone', count: 2 }], successRate: 0.7, requirement: '境界突破至元婴期' },
      { level: 3, gold: 400000, items: [{ itemId: 'breakthrough_stone', count: 3 }], successRate: 0.6, requirement: '境界突破至化神期' },
      { level: 4, gold: 800000, items: [{ itemId: 'breakthrough_stone', count: 5 }], successRate: 0.5, requirement: '境界突破至炼虚期' },
      { level: 5, gold: 1600000, items: [{ itemId: 'breakthrough_stone', count: 10 }], successRate: 0.4, requirement: '境界突破至大乘期' },
    ],
    baseEffects: [{ type: 'passive', value: 5, isPercent: false, description: '基础暴击+5%' }],
    effectsPerLevel: [{ type: 'passive', value: 1, isPercent: false, description: '每级暴击+1%' }],
    effectsPerBreakthrough: [{ type: 'passive', value: 2, isPercent: false, description: '每突破暴击+2%' }],
    cooldown: 0,
    maxLevel: 10,
    maxBreakthrough: 5,
  },
  {
    templateId: 'skill_meteor',
    name: 'Meteor Strike',
    nameCN: '陨石天降',
    type: 'ultimate',
    category: 'combat',
    description: '召唤陨石攻击范围内所有敌人',
    icon: '☄️',
    require: { level: 15 },
    upgradeCosts: [
      { level: 1, gold: 1000, exp: 500, items: [] },
      { level: 2, gold: 2000, exp: 1000, items: [{ itemId: 'meteor_essence', count: 2 }] },
      { level: 3, gold: 4000, exp: 2000, items: [{ itemId: 'meteor_essence', count: 4 }] },
      { level: 4, gold: 8000, exp: 4000, items: [{ itemId: 'meteor_crystal', count: 2 }] },
      { level: 5, gold: 16000, exp: 8000, items: [{ itemId: 'meteor_crystal', count: 4 }] },
      { level: 6, gold: 32000, exp: 16000, items: [{ itemId: 'meteor_orb', count: 2 }] },
      { level: 7, gold: 64000, exp: 32000, items: [{ itemId: 'meteor_orb', count: 4 }] },
      { level: 8, gold: 128000, exp: 64000, items: [{ itemId: 'meteor_orb', count: 6 }] },
      { level: 9, gold: 256000, exp: 128000, items: [{ itemId: 'meteor_orb', count: 8 }] },
      { level: 10, gold: 512000, exp: 256000, items: [{ itemId: 'meteor_orb', count: 10 }] },
    ],
    breakthroughCosts: [
      { level: 1, gold: 500000, items: [{ itemId: 'breakthrough_stone', count: 5 }], successRate: 0.7, requirement: '境界突破至金丹期' },
      { level: 2, gold: 1000000, items: [{ itemId: 'breakthrough_stone', count: 10 }], successRate: 0.6, requirement: '境界突破至元婴期' },
      { level: 3, gold: 2000000, items: [{ itemId: 'breakthrough_stone', count: 15 }], successRate: 0.5, requirement: '境界突破至化神期' },
      { level: 4, gold: 4000000, items: [{ itemId: 'breakthrough_stone', count: 25 }], successRate: 0.4, requirement: '境界突破至炼虚期' },
      { level: 5, gold: 8000000, items: [{ itemId: 'breakthrough_stone', count: 50 }], successRate: 0.3, requirement: '境界突破至大乘期' },
    ],
    baseEffects: [{ type: 'damage', value: 500, isPercent: false, description: '基础伤害500' }],
    effectsPerLevel: [{ type: 'damage', value: 100, isPercent: false, description: '每级伤害+100' }],
    effectsPerBreakthrough: [{ type: 'damage', value: 200, isPercent: false, description: '每突破伤害+200' }],
    cooldown: 60000,
    maxLevel: 10,
    maxBreakthrough: 5,
  },
  // 护体金身
  {
    templateId: 'skill_golden_body',
    name: 'Golden Body',
    nameCN: '护体金身',
    type: 'active',
    category: 'combat',
    description: '激活金身护体，大幅提升防御',
    icon: '🧘',
    require: { level: 8 },
    upgradeCosts: [
      { level: 1, gold: 300, exp: 150, items: [] },
      { level: 2, gold: 600, exp: 300, items: [{ itemId: 'metal_essence', count: 1 }] },
      { level: 3, gold: 1200, exp: 600, items: [{ itemId: 'metal_essence', count: 2 }] },
      { level: 4, gold: 2400, exp: 1200, items: [{ itemId: 'metal_essence', count: 3 }] },
      { level: 5, gold: 4800, exp: 2400, items: [{ itemId: 'metal_crystal', count: 1 }] },
      { level: 6, gold: 9600, exp: 4800, items: [{ itemId: 'metal_crystal', count: 2 }] },
      { level: 7, gold: 19200, exp: 9600, items: [{ itemId: 'metal_crystal', count: 3 }] },
      { level: 8, gold: 38400, exp: 19200, items: [{ itemId: 'metal_orb', count: 1 }] },
      { level: 9, gold: 76800, exp: 38400, items: [{ itemId: 'metal_orb', count: 2 }] },
      { level: 10, gold: 153600, exp: 76800, items: [{ itemId: 'metal_orb', count: 3 }] },
    ],
    breakthroughCosts: [
      { level: 1, gold: 120000, items: [{ itemId: 'breakthrough_stone', count: 2 }], successRate: 0.8, requirement: '境界突破至金丹期' },
      { level: 2, gold: 240000, items: [{ itemId: 'breakthrough_stone', count: 3 }], successRate: 0.7, requirement: '境界突破至元婴期' },
      { level: 3, gold: 480000, items: [{ itemId: 'breakthrough_stone', count: 5 }], successRate: 0.6, requirement: '境界突破至化神期' },
      { level: 4, gold: 960000, items: [{ itemId: 'breakthrough_stone', count: 8 }], successRate: 0.5, requirement: '境界突破至炼虚期' },
      { level: 5, gold: 1920000, items: [{ itemId: 'breakthrough_stone', count: 15 }], successRate: 0.4, requirement: '境界突破至大乘期' },
    ],
    baseEffects: [
      { type: 'buff', value: 100, isPercent: false, description: '基础防御+100' },
      { type: 'buff', value: 500, isPercent: false, description: '基础生命+500' }
    ],
    effectsPerLevel: [
      { type: 'buff', value: 25, isPercent: false, description: '每级防御+25' },
      { type: 'buff', value: 100, isPercent: false, description: '每级生命+100' }
    ],
    effectsPerBreakthrough: [
      { type: 'buff', value: 60, isPercent: false, description: '每突破防御+60' },
      { type: 'buff', value: 250, isPercent: false, description: '每突破生命+250' }
    ],
    cooldown: 15000,
    maxLevel: 10,
    maxBreakthrough: 5,
  },
  // 疾风步
  {
    templateId: 'skill_wind_step',
    name: 'Wind Step',
    nameCN: '疾风步',
    type: 'active',
    category: 'special',
    description: '化身疾风，提升速度和闪避',
    icon: '💨',
    require: { level: 6 },
    upgradeCosts: [
      { level: 1, gold: 220, exp: 110, items: [] },
      { level: 2, gold: 440, exp: 220, items: [{ itemId: 'wind_essence', count: 1 }] },
      { level: 3, gold: 880, exp: 440, items: [{ itemId: 'wind_essence', count: 2 }] },
      { level: 4, gold: 1760, exp: 880, items: [{ itemId: 'wind_essence', count: 3 }] },
      { level: 5, gold: 3520, exp: 1760, items: [{ itemId: 'wind_crystal', count: 1 }] },
      { level: 6, gold: 7040, exp: 3520, items: [{ itemId: 'wind_crystal', count: 2 }] },
      { level: 7, gold: 14080, exp: 7040, items: [{ itemId: 'wind_crystal', count: 3 }] },
      { level: 8, gold: 28160, exp: 14080, items: [{ itemId: 'wind_orb', count: 1 }] },
      { level: 9, gold: 56320, exp: 28160, items: [{ itemId: 'wind_orb', count: 2 }] },
      { level: 10, gold: 112640, exp: 56320, items: [{ itemId: 'wind_orb', count: 3 }] },
    ],
    breakthroughCosts: [
      { level: 1, gold: 90000, items: [{ itemId: 'breakthrough_stone', count: 2 }], successRate: 0.8, requirement: '境界突破至金丹期' },
      { level: 2, gold: 180000, items: [{ itemId: 'breakthrough_stone', count: 3 }], successRate: 0.7, requirement: '境界突破至元婴期' },
      { level: 3, gold: 360000, items: [{ itemId: 'breakthrough_stone', count: 5 }], successRate: 0.6, requirement: '境界突破至化神期' },
      { level: 4, gold: 720000, items: [{ itemId: 'breakthrough_stone', count: 8 }], successRate: 0.5, requirement: '境界突破至炼虚期' },
      { level: 5, gold: 1440000, items: [{ itemId: 'breakthrough_stone', count: 15 }], successRate: 0.4, requirement: '境界突破至大乘期' },
    ],
    baseEffects: [
      { type: 'passive', value: 15, isPercent: false, description: '基础闪避+15' },
      { type: 'passive', value: 10, isPercent: false, description: '基础速度+10' }
    ],
    effectsPerLevel: [
      { type: 'passive', value: 5, isPercent: false, description: '每级闪避+5' },
      { type: 'passive', value: 3, isPercent: false, description: '每级速度+3' }
    ],
    effectsPerBreakthrough: [
      { type: 'passive', value: 12, isPercent: false, description: '每突破闪避+12' },
      { type: 'passive', value: 8, isPercent: false, description: '每突破速度+8' }
    ],
    cooldown: 8000,
    maxLevel: 10,
    maxBreakthrough: 5,
  },
  // 吸星大法
  {
    templateId: 'skill_drain_life',
    name: 'Drain Life',
    nameCN: '吸星大法',
    type: 'active',
    category: 'special',
    description: '吸取敌人生命转化为自身生命',
    icon: '🧛',
    require: { level: 10 },
    upgradeCosts: [
      { level: 1, gold: 400, exp: 200, items: [] },
      { level: 2, gold: 800, exp: 400, items: [{ itemId: 'dark_essence', count: 1 }] },
      { level: 3, gold: 1600, exp: 800, items: [{ itemId: 'dark_essence', count: 2 }] },
      { level: 4, gold: 3200, exp: 1600, items: [{ itemId: 'dark_essence', count: 3 }] },
      { level: 5, gold: 6400, exp: 3200, items: [{ itemId: 'dark_crystal', count: 1 }] },
      { level: 6, gold: 12800, exp: 6400, items: [{ itemId: 'dark_crystal', count: 2 }] },
      { level: 7, gold: 25600, exp: 12800, items: [{ itemId: 'dark_crystal', count: 3 }] },
      { level: 8, gold: 51200, exp: 25600, items: [{ itemId: 'dark_orb', count: 1 }] },
      { level: 9, gold: 102400, exp: 51200, items: [{ itemId: 'dark_orb', count: 2 }] },
      { level: 10, gold: 204800, exp: 102400, items: [{ itemId: 'dark_orb', count: 3 }] },
    ],
    breakthroughCosts: [
      { level: 1, gold: 150000, items: [{ itemId: 'breakthrough_stone', count: 3 }], successRate: 0.75, requirement: '境界突破至金丹期' },
      { level: 2, gold: 300000, items: [{ itemId: 'breakthrough_stone', count: 5 }], successRate: 0.65, requirement: '境界突破至元婴期' },
      { level: 3, gold: 600000, items: [{ itemId: 'breakthrough_stone', count: 8 }], successRate: 0.55, requirement: '境界突破至化神期' },
      { level: 4, gold: 1200000, items: [{ itemId: 'breakthrough_stone', count: 12 }], successRate: 0.45, requirement: '境界突破至炼虚期' },
      { level: 5, gold: 2400000, items: [{ itemId: 'breakthrough_stone', count: 20 }], successRate: 0.35, requirement: '境界突破至大乘期' },
    ],
    baseEffects: [
      { type: 'damage', value: 80, isPercent: false, description: '基础伤害80' },
      { type: 'heal', value: 40, isPercent: false, description: '生命吸取40' }
    ],
    effectsPerLevel: [
      { type: 'damage', value: 20, isPercent: false, description: '每级伤害+20' },
      { type: 'heal', value: 10, isPercent: false, description: '每级生命吸取+10' }
    ],
    effectsPerBreakthrough: [
      { type: 'damage', value: 50, isPercent: false, description: '每突破伤害+50' },
      { type: 'heal', value: 25, isPercent: false, description: '每突破生命吸取+25' }
    ],
    cooldown: 5000,
    maxLevel: 10,
    maxBreakthrough: 5,
  },
  // 灵气护盾
  {
    templateId: 'skill_spirit_shield',
    name: 'Spirit Shield',
    nameCN: '灵气护盾',
    type: 'active',
    category: 'support',
    description: '凝聚灵气形成护盾，吸收伤害',
    icon: '🔰',
    require: { level: 4 },
    upgradeCosts: [
      { level: 1, gold: 160, exp: 80, items: [] },
      { level: 2, gold: 320, exp: 160, items: [{ itemId: 'spirit_essence', count: 1 }] },
      { level: 3, gold: 640, exp: 320, items: [{ itemId: 'spirit_essence', count: 2 }] },
      { level: 4, gold: 1280, exp: 640, items: [{ itemId: 'spirit_essence', count: 3 }] },
      { level: 5, gold: 2560, exp: 1280, items: [{ itemId: 'spirit_crystal', count: 1 }] },
      { level: 6, gold: 5120, exp: 2560, items: [{ itemId: 'spirit_crystal', count: 2 }] },
      { level: 7, gold: 10240, exp: 5120, items: [{ itemId: 'spirit_crystal', count: 3 }] },
      { level: 8, gold: 20480, exp: 10240, items: [{ itemId: 'spirit_orb', count: 1 }] },
      { level: 9, gold: 40960, exp: 20480, items: [{ itemId: 'spirit_orb', count: 2 }] },
      { level: 10, gold: 81920, exp: 40960, items: [{ itemId: 'spirit_orb', count: 3 }] },
    ],
    breakthroughCosts: [
      { level: 1, gold: 70000, items: [{ itemId: 'breakthrough_stone', count: 1 }], successRate: 0.8, requirement: '境界突破至金丹期' },
      { level: 2, gold: 140000, items: [{ itemId: 'breakthrough_stone', count: 2 }], successRate: 0.7, requirement: '境界突破至元婴期' },
      { level: 3, gold: 280000, items: [{ itemId: 'breakthrough_stone', count: 4 }], successRate: 0.6, requirement: '境界突破至化神期' },
      { level: 4, gold: 560000, items: [{ itemId: 'breakthrough_stone', count: 6 }], successRate: 0.5, requirement: '境界突破至炼虚期' },
      { level: 5, gold: 1120000, items: [{ itemId: 'breakthrough_stone', count: 12 }], successRate: 0.4, requirement: '境界突破至大乘期' },
    ],
    baseEffects: [{ type: 'buff', value: 300, isPercent: false, description: '护盾值300' }],
    effectsPerLevel: [{ type: 'buff', value: 80, isPercent: false, description: '每级护盾+80' }],
    effectsPerBreakthrough: [{ type: 'buff', value: 200, isPercent: false, description: '每突破护盾+200' }],
    cooldown: 20000,
    maxLevel: 10,
    maxBreakthrough: 5,
  },
  // 防御强化（被动）
  {
    templateId: 'skill_defense_passive',
    name: 'Defense Boost',
    nameCN: '防御强化',
    type: 'passive',
    category: 'combat',
    description: '永久提升防御力',
    icon: '🛡️',
    require: { level: 2 },
    upgradeCosts: [
      { level: 1, gold: 100, exp: 50, items: [] },
      { level: 2, gold: 200, exp: 100, items: [{ itemId: 'defense_essence', count: 1 }] },
      { level: 3, gold: 400, exp: 200, items: [{ itemId: 'defense_essence', count: 2 }] },
      { level: 4, gold: 800, exp: 400, items: [{ itemId: 'defense_essence', count: 3 }] },
      { level: 5, gold: 1600, exp: 800, items: [{ itemId: 'defense_crystal', count: 1 }] },
      { level: 6, gold: 3200, exp: 1600, items: [{ itemId: 'defense_crystal', count: 2 }] },
      { level: 7, gold: 6400, exp: 3200, items: [{ itemId: 'defense_crystal', count: 3 }] },
      { level: 8, gold: 12800, exp: 6400, items: [{ itemId: 'defense_orb', count: 1 }] },
      { level: 9, gold: 25600, exp: 12800, items: [{ itemId: 'defense_orb', count: 2 }] },
      { level: 10, gold: 51200, exp: 25600, items: [{ itemId: 'defense_orb', count: 3 }] },
    ],
    breakthroughCosts: [
      { level: 1, gold: 50000, items: [{ itemId: 'breakthrough_stone', count: 1 }], successRate: 0.8, requirement: '境界突破至金丹期' },
      { level: 2, gold: 100000, items: [{ itemId: 'breakthrough_stone', count: 2 }], successRate: 0.7, requirement: '境界突破至元婴期' },
      { level: 3, gold: 200000, items: [{ itemId: 'breakthrough_stone', count: 3 }], successRate: 0.6, requirement: '境界突破至化神期' },
      { level: 4, gold: 400000, items: [{ itemId: 'breakthrough_stone', count: 5 }], successRate: 0.5, requirement: '境界突破至炼虚期' },
      { level: 5, gold: 800000, items: [{ itemId: 'breakthrough_stone', count: 10 }], successRate: 0.4, requirement: '境界突破至大乘期' },
    ],
    baseEffects: [{ type: 'passive', value: 15, isPercent: false, description: '基础防御+15' }],
    effectsPerLevel: [{ type: 'passive', value: 8, isPercent: false, description: '每级防御+8' }],
    effectsPerBreakthrough: [{ type: 'passive', value: 20, isPercent: false, description: '每突破防御+20' }],
    cooldown: 0,
    maxLevel: 10,
    maxBreakthrough: 5,
  },
  // 生命强化（被动）
  {
    templateId: 'skill_hp_passive',
    name: 'HP Boost',
    nameCN: '生命强化',
    type: 'passive',
    category: 'combat',
    description: '永久提升生命上限',
    icon: '❤️',
    require: { level: 1 },
    upgradeCosts: [
      { level: 1, gold: 80, exp: 40, items: [] },
      { level: 2, gold: 160, exp: 80, items: [{ itemId: 'hp_essence', count: 1 }] },
      { level: 3, gold: 320, exp: 160, items: [{ itemId: 'hp_essence', count: 2 }] },
      { level: 4, gold: 640, exp: 320, items: [{ itemId: 'hp_essence', count: 3 }] },
      { level: 5, gold: 1280, exp: 640, items: [{ itemId: 'hp_crystal', count: 1 }] },
      { level: 6, gold: 2560, exp: 1280, items: [{ itemId: 'hp_crystal', count: 2 }] },
      { level: 7, gold: 5120, exp: 2560, items: [{ itemId: 'hp_crystal', count: 3 }] },
      { level: 8, gold: 10240, exp: 5120, items: [{ itemId: 'hp_orb', count: 1 }] },
      { level: 9, gold: 20480, exp: 10240, items: [{ itemId: 'hp_orb', count: 2 }] },
      { level: 10, gold: 40960, exp: 20480, items: [{ itemId: 'hp_orb', count: 3 }] },
    ],
    breakthroughCosts: [
      { level: 1, gold: 40000, items: [{ itemId: 'breakthrough_stone', count: 1 }], successRate: 0.8, requirement: '境界突破至金丹期' },
      { level: 2, gold: 80000, items: [{ itemId: 'breakthrough_stone', count: 2 }], successRate: 0.7, requirement: '境界突破至元婴期' },
      { level: 3, gold: 160000, items: [{ itemId: 'breakthrough_stone', count: 3 }], successRate: 0.6, requirement: '境界突破至化神期' },
      { level: 4, gold: 320000, items: [{ itemId: 'breakthrough_stone', count: 5 }], successRate: 0.5, requirement: '境界突破至炼虚期' },
      { level: 5, gold: 640000, items: [{ itemId: 'breakthrough_stone', count: 10 }], successRate: 0.4, requirement: '境界突破至大乘期' },
    ],
    baseEffects: [{ type: 'passive', value: 100, isPercent: false, description: '基础生命+100' }],
    effectsPerLevel: [{ type: 'passive', value: 50, isPercent: false, description: '每级生命+50' }],
    effectsPerBreakthrough: [{ type: 'passive', value: 150, isPercent: false, description: '每突破生命+150' }],
    cooldown: 0,
    maxLevel: 10,
    maxBreakthrough: 5,
  },
  // 暴击伤害强化（被动）
  {
    templateId: 'skill_crit_damage_passive',
    name: 'Critical Damage',
    nameCN: '暴击伤害',
    type: 'passive',
    category: 'combat',
    description: '永久提升暴击伤害',
    icon: '💥',
    require: { level: 8 },
    upgradeCosts: [
      { level: 1, gold: 300, exp: 150, items: [] },
      { level: 2, gold: 600, exp: 300, items: [{ itemId: 'crit_damage_essence', count: 1 }] },
      { level: 3, gold: 1200, exp: 600, items: [{ itemId: 'crit_damage_essence', count: 2 }] },
      { level: 4, gold: 2400, exp: 1200, items: [{ itemId: 'crit_damage_essence', count: 3 }] },
      { level: 5, gold: 4800, exp: 2400, items: [{ itemId: 'crit_damage_crystal', count: 1 }] },
      { level: 6, gold: 9600, exp: 4800, items: [{ itemId: 'crit_damage_crystal', count: 2 }] },
      { level: 7, gold: 19200, exp: 9600, items: [{ itemId: 'crit_damage_crystal', count: 3 }] },
      { level: 8, gold: 38400, exp: 19200, items: [{ itemId: 'crit_damage_orb', count: 1 }] },
      { level: 9, gold: 76800, exp: 38400, items: [{ itemId: 'crit_damage_orb', count: 2 }] },
      { level: 10, gold: 153600, exp: 76800, items: [{ itemId: 'crit_damage_orb', count: 3 }] },
    ],
    breakthroughCosts: [
      { level: 1, gold: 120000, items: [{ itemId: 'breakthrough_stone', count: 2 }], successRate: 0.8, requirement: '境界突破至金丹期' },
      { level: 2, gold: 240000, items: [{ itemId: 'breakthrough_stone', count: 3 }], successRate: 0.7, requirement: '境界突破至元婴期' },
      { level: 3, gold: 480000, items: [{ itemId: 'breakthrough_stone', count: 5 }], successRate: 0.6, requirement: '境界突破至化神期' },
      { level: 4, gold: 960000, items: [{ itemId: 'breakthrough_stone', count: 8 }], successRate: 0.5, requirement: '境界突破至炼虚期' },
      { level: 5, gold: 1920000, items: [{ itemId: 'breakthrough_stone', count: 15 }], successRate: 0.4, requirement: '境界突破至大乘期' },
    ],
    baseEffects: [{ type: 'passive', value: 20, isPercent: false, description: '基础暴击伤害+20%' }],
    effectsPerLevel: [{ type: 'passive', value: 5, isPercent: false, description: '每级暴击伤害+5%' }],
    effectsPerBreakthrough: [{ type: 'passive', value: 15, isPercent: false, description: '每突破暴击伤害+15%' }],
    cooldown: 0,
    maxLevel: 10,
    maxBreakthrough: 5,
  },
  // 命中强化（被动）
  {
    templateId: 'skill_hit_passive',
    name: 'Accuracy',
    nameCN: '命中强化',
    type: 'passive',
    category: 'combat',
    description: '永久提升命中率',
    icon: '🎯',
    require: { level: 3 },
    upgradeCosts: [
      { level: 1, gold: 120, exp: 60, items: [] },
      { level: 2, gold: 240, exp: 120, items: [{ itemId: 'hit_essence', count: 1 }] },
      { level: 3, gold: 480, exp: 240, items: [{ itemId: 'hit_essence', count: 2 }] },
      { level: 4, gold: 960, exp: 480, items: [{ itemId: 'hit_essence', count: 3 }] },
      { level: 5, gold: 1920, exp: 960, items: [{ itemId: 'hit_crystal', count: 1 }] },
      { level: 6, gold: 3840, exp: 1920, items: [{ itemId: 'hit_crystal', count: 2 }] },
      { level: 7, gold: 7680, exp: 3840, items: [{ itemId: 'hit_crystal', count: 3 }] },
      { level: 8, gold: 15360, exp: 7680, items: [{ itemId: 'hit_orb', count: 1 }] },
      { level: 9, gold: 30720, exp: 15360, items: [{ itemId: 'hit_orb', count: 2 }] },
      { level: 10, gold: 61440, exp: 30720, items: [{ itemId: 'hit_orb', count: 3 }] },
    ],
    breakthroughCosts: [
      { level: 1, gold: 60000, items: [{ itemId: 'breakthrough_stone', count: 1 }], successRate: 0.8, requirement: '境界突破至金丹期' },
      { level: 2, gold: 120000, items: [{ itemId: 'breakthrough_stone', count: 2 }], successRate: 0.7, requirement: '境界突破至元婴期' },
      { level: 3, gold: 240000, items: [{ itemId: 'breakthrough_stone', count: 3 }], successRate: 0.6, requirement: '境界突破至化神期' },
      { level: 4, gold: 480000, items: [{ itemId: 'breakthrough_stone', count: 5 }], successRate: 0.5, requirement: '境界突破至炼虚期' },
      { level: 5, gold: 960000, items: [{ itemId: 'breakthrough_stone', count: 10 }], successRate: 0.4, requirement: '境界突破至大乘期' },
    ],
    baseEffects: [{ type: 'passive', value: 10, isPercent: false, description: '基础命中+10' }],
    effectsPerLevel: [{ type: 'passive', value: 5, isPercent: false, description: '每级命中+5' }],
    effectsPerBreakthrough: [{ type: 'passive', value: 12, isPercent: false, description: '每突破命中+12' }],
    cooldown: 0,
    maxLevel: 10,
    maxBreakthrough: 5,
  },
  // 修炼功法 - 提升修炼效率
  {
    templateId: 'skill_cultivation',
    name: 'Cultivation',
    nameCN: '修炼加速',
    type: 'passive',
    category: 'cultivation',
    description: '提升修炼获得的经验',
    icon: '📈',
    require: { level: 1 },
    upgradeCosts: [
      { level: 1, gold: 200, exp: 100, items: [] },
      { level: 2, gold: 400, exp: 200, items: [{ itemId: 'cultivation_essence', count: 1 }] },
      { level: 3, gold: 800, exp: 400, items: [{ itemId: 'cultivation_essence', count: 2 }] },
      { level: 4, gold: 1600, exp: 800, items: [{ itemId: 'cultivation_essence', count: 3 }] },
      { level: 5, gold: 3200, exp: 1600, items: [{ itemId: 'cultivation_crystal', count: 1 }] },
      { level: 6, gold: 6400, exp: 3200, items: [{ itemId: 'cultivation_crystal', count: 2 }] },
      { level: 7, gold: 12800, exp: 6400, items: [{ itemId: 'cultivation_crystal', count: 3 }] },
      { level: 8, gold: 25600, exp: 12800, items: [{ itemId: 'cultivation_orb', count: 1 }] },
      { level: 9, gold: 51200, exp: 25600, items: [{ itemId: 'cultivation_orb', count: 2 }] },
      { level: 10, gold: 102400, exp: 51200, items: [{ itemId: 'cultivation_orb', count: 3 }] },
    ],
    breakthroughCosts: [
      { level: 1, gold: 80000, items: [{ itemId: 'breakthrough_stone', count: 2 }], successRate: 0.8, requirement: '境界突破至金丹期' },
      { level: 2, gold: 160000, items: [{ itemId: 'breakthrough_stone', count: 3 }], successRate: 0.7, requirement: '境界突破至元婴期' },
      { level: 3, gold: 320000, items: [{ itemId: 'breakthrough_stone', count: 5 }], successRate: 0.6, requirement: '境界突破至化神期' },
      { level: 4, gold: 640000, items: [{ itemId: 'breakthrough_stone', count: 8 }], successRate: 0.5, requirement: '境界突破至炼虚期' },
      { level: 5, gold: 1280000, items: [{ itemId: 'breakthrough_stone', count: 15 }], successRate: 0.4, requirement: '境界突破至大乘期' },
    ],
    baseEffects: [{ type: 'passive', value: 10, isPercent: true, description: '基础修炼效率+10%' }],
    effectsPerLevel: [{ type: 'passive', value: 5, isPercent: true, description: '每级修炼效率+5%' }],
    effectsPerBreakthrough: [{ type: 'passive', value: 10, isPercent: true, description: '每突破修炼效率+10%' }],
    cooldown: 0,
    maxLevel: 10,
    maxBreakthrough: 5,
  },
,
,
  // 雷系功法
  {
    templateId: 'skill_thunder_strike',
    name: 'Thunder Strike',
    nameCN: '雷击术',
    type: 'active',
    category: 'combat',
    description: '召唤天雷之力攻击敌人',
    icon: '⚡',
    require: { level: 5 },
    upgradeCosts: [
      { level: 1, gold: 180, exp: 90, items: [] },
      { level: 2, gold: 360, exp: 180, items: [{ itemId: 'thunder_essence', count: 1 }] },
      { level: 3, gold: 720, exp: 360, items: [{ itemId: 'thunder_essence', count: 2 }] },
      { level: 4, gold: 1440, exp: 720, items: [{ itemId: 'thunder_essence', count: 3 }] },
      { level: 5, gold: 2880, exp: 1440, items: [{ itemId: 'thunder_crystal', count: 1 }] },
      { level: 6, gold: 5760, exp: 2880, items: [{ itemId: 'thunder_crystal', count: 2 }] },
      { level: 7, gold: 11520, exp: 5760, items: [{ itemId: 'thunder_crystal', count: 3 }] },
      { level: 8, gold: 23040, exp: 11520, items: [{ itemId: 'thunder_orb', count: 1 }] },
      { level: 9, gold: 46080, exp: 23040, items: [{ itemId: 'thunder_orb', count: 2 }] },
      { level: 10, gold: 92160, exp: 46080, items: [{ itemId: 'thunder_orb', count: 3 }] },
    ],
    breakthroughCosts: [
      { level: 1, gold: 80000, items: [{ itemId: 'breakthrough_stone', count: 1 }], successRate: 0.8, requirement: '境界突破至金丹期' },
      { level: 2, gold: 160000, items: [{ itemId: 'breakthrough_stone', count: 2 }], successRate: 0.7, requirement: '境界突破至元婴期' },
      { level: 3, gold: 320000, items: [{ itemId: 'breakthrough_stone', count: 3 }], successRate: 0.6, requirement: '境界突破至化神期' },
      { level: 4, gold: 640000, items: [{ itemId: 'breakthrough_stone', count: 5 }], successRate: 0.5, requirement: '境界突破至炼虚期' },
      { level: 5, gold: 1280000, items: [{ itemId: 'breakthrough_stone', count: 10 }], successRate: 0.4, requirement: '境界突破至大乘期' },
    ],
    baseEffects: [
      { type: 'damage', value: 150, isPercent: false, description: '基础伤害150' },
      { type: 'debuff', value: 10, isPercent: false, description: '麻痹几率10%' }
    ],
    effectsPerLevel: [
      { type: 'damage', value: 30, isPercent: false, description: '每级伤害+30' },
      { type: 'debuff', value: 2, isPercent: false, description: '每级麻痹+2%' }
    ],
    effectsPerBreakthrough: [
      { type: 'damage', value: 75, isPercent: false, description: '每突破伤害+75' },
      { type: 'debuff', value: 5, isPercent: false, description: '每突破麻痹+5%' }
    ],
    cooldown: 4000,
    maxLevel: 10,
    maxBreakthrough: 5,
  },
]

export class SkillSystem {
  private playerData: Map<string, PlayerSkillData> = new Map()
  private gold: Map<string, number> = new Map()
  
  getPlayerData(playerId: string): PlayerSkillData {
    if (!this.playerData.has(playerId)) {
      this.playerData.set(playerId, {
        playerId,
        skills: new Map(),
        skillPoints: SKILL_SYSTEM_CONFIG.initialSkillPoints,
        totalSkillPoints: SKILL_SYSTEM_CONFIG.initialSkillPoints,
        lastUpdateTime: Date.now(),
      })
      this.gold.set(playerId, 1000000)
    }
    return this.playerData.get(playerId)!
  }
  
  getPlayerGold(playerId: string): number {
    return this.gold.get(playerId) || 0
  }
  
  setPlayerGold(playerId: string, gold: number): void {
    this.gold.set(playerId, gold)
  }
  
  getPlayerSkills(playerId: string): Skill[] {
    const data = this.getPlayerData(playerId)
    return Array.from(data.skills.values())
  }
  
  learnSkill(playerId: string, templateId: string): { success: boolean; message: string; skill?: Skill } {
    const data = this.getPlayerData(playerId)
    const template = SKILL_TEMPLATES.find(t => t.templateId === templateId)
    
    if (!template) return { success: false, message: '技能模板不存在' }
    
    for (const skill of data.skills.values()) {
      if (skill.skillTemplateId === templateId) return { success: false, message: '已学习该技能' }
    }
    
    if (data.skillPoints < 1) return { success: false, message: '技能点不足' }
    
    if (template.require.skillIds && template.require.skillIds.length > 0) {
      const hasPrerequisite = template.require.skillIds.some(prereqId => {
        return Array.from(data.skills.values()).some(s => s.skillTemplateId === prereqId)
      })
      if (!hasPrerequisite) return { success: false, message: '未满足前置技能要求' }
    }
    
    data.skillPoints -= 1
    
    const skill: Skill = {
      skillId: `${playerId}_${templateId}_${Date.now()}`,
      playerId,
      skillTemplateId: templateId,
      name: template.name,
      nameCN: template.nameCN,
      type: template.type,
      category: template.category,
      level: 1,
      breakthroughLevel: 0,
      isActive: true,
      cost: template.upgradeCosts[0] || { gold: 0, exp: 0, items: [] },
      effects: [...template.baseEffects],
      cooldown: template.cooldown,
      currentCooldown: 0,
      exp: 0,
      maxExp: template.upgradeCosts[1]?.exp || 100,
      learnedAt: Date.now(),
      updatedAt: Date.now(),
    }
    
    this.updateSkillEffects(skill, template)
    data.skills.set(skill.skillId, skill)
    
    return { success: true, message: `成功学习技能: ${template.nameCN}`, skill }
  }
  
  upgradeSkill(playerId: string, skillId: string): SkillUpgradeResult {
    const data = this.getPlayerData(playerId)
    const skill = data.skills.get(skillId)
    
    if (!skill) return { success: false, newLevel: 0, newExp: 0, newEffects: [], consumeGold: 0, consumeExp: 0, consumeItems: [], message: '技能不存在' }
    
    const template = SKILL_TEMPLATES.find(t => t.templateId === skill.skillTemplateId)
    if (!template) return { success: false, newLevel: skill.level, newExp: skill.exp, newEffects: skill.effects, consumeGold: 0, consumeExp: 0, consumeItems: [], message: '技能模板不存在' }
    
    if (skill.level >= template.maxLevel) return { success: false, newLevel: skill.level, newExp: skill.exp, newEffects: skill.effects, consumeGold: 0, consumeExp: 0, consumeItems: [], message: '技能等级已达上限' }
    
    const cost = template.upgradeCosts[skill.level]
    if (!cost) return { success: false, newLevel: skill.level, newExp: skill.exp, newEffects: skill.effects, consumeGold: 0, consumeExp: 0, consumeItems: [], message: '升级配置错误' }
    
    const playerGold = this.getPlayerGold(playerId)
    if (playerGold < cost.gold) return { success: false, newLevel: skill.level, newExp: skill.exp, newEffects: skill.effects, consumeGold: cost.gold, consumeExp: cost.exp, consumeItems: cost.items, message: '金币不足' }
    
    if (skill.exp < cost.exp) return { success: false, newLevel: skill.level, newExp: skill.exp, newEffects: skill.effects, consumeGold: cost.gold, consumeExp: cost.exp, consumeItems: cost.items, message: '经验不足' }
    
    this.setPlayerGold(playerId, playerGold - cost.gold)
    skill.exp -= cost.exp
    skill.level += 1
    skill.maxExp = template.upgradeCosts[skill.level]?.exp || skill.maxExp
    
    this.updateSkillEffects(skill, template)
    skill.updatedAt = Date.now()
    
    return { success: true, newLevel: skill.level, newExp: skill.exp, newEffects: skill.effects, consumeGold: cost.gold, consumeExp: cost.exp, consumeItems: cost.items, message: `技能升级成功！当前等级: ${skill.level}` }
  }
  
  breakthroughSkill(playerId: string, skillId: string): SkillBreakthroughResult {
    const data = this.getPlayerData(playerId)
    const skill = data.skills.get(skillId)
    
    if (!skill) return { success: false, newBreakthroughLevel: 0, newEffects: [], consumeGold: 0, consumeItems: [], message: '技能不存在' }
    
    const template = SKILL_TEMPLATES.find(t => t.templateId === skill.skillTemplateId)
    if (!template) return { success: false, newBreakthroughLevel: skill.breakthroughLevel, newEffects: skill.effects, consumeGold: 0, consumeItems: [], message: '技能模板不存在' }
    
    if (skill.breakthroughLevel >= template.maxBreakthrough) return { success: false, newBreakthroughLevel: skill.breakthroughLevel, newEffects: skill.effects, consumeGold: 0, consumeItems: [], message: '突破等级已达上限' }
    
    if (skill.level < template.maxLevel) return { success: false, newBreakthroughLevel: skill.breakthroughLevel, newEffects: skill.effects, consumeGold: 0, consumeItems: [], message: '请先满级后再突破' }
    
    const cost = template.breakthroughCosts[skill.breakthroughLevel]
    if (!cost) return { success: false, newBreakthroughLevel: skill.breakthroughLevel, newEffects: skill.effects, consumeGold: 0, consumeItems: [], message: '突破配置错误' }
    
    const playerGold = this.getPlayerGold(playerId)
    if (playerGold < cost.gold) return { success: false, newBreakthroughLevel: skill.breakthroughLevel, newEffects: skill.effects, consumeGold: cost.gold, consumeItems: cost.items, message: '金币不足' }
    
    const random = Math.random()
    const success = random < cost.successRate
    
    if (success) {
      this.setPlayerGold(playerId, playerGold - cost.gold)
      skill.breakthroughLevel += 1
      this.updateSkillEffects(skill, template)
      skill.updatedAt = Date.now()
      return { success: true, newBreakthroughLevel: skill.breakthroughLevel, newEffects: skill.effects, consumeGold: cost.gold, consumeItems: cost.items, message: `技能突破成功！当前突破等级: ${skill.breakthroughLevel}` }
    } else {
      this.setPlayerGold(playerId, playerGold - cost.gold)
      return { success: false, newBreakthroughLevel: skill.breakthroughLevel, newEffects: skill.effects, consumeGold: cost.gold, consumeItems: cost.items, message: '技能突破失败' }
    }
  }
  
  private updateSkillEffects(skill: Skill, template: SkillTemplate): void {
    const effects: SkillEffect[] = []
    for (const effect of template.baseEffects) effects.push({ ...effect })
    if (skill.level > 1 && template.effectsPerLevel.length > 0) {
      for (const effect of template.effectsPerLevel) {
        const newEffect = { ...effect, value: effect.value * (skill.level - 1) }
        effects.push(newEffect)
      }
    }
    if (skill.breakthroughLevel > 0 && template.effectsPerBreakthrough.length > 0) {
      for (const effect of template.effectsPerBreakthrough) {
        const newEffect = { ...effect, value: effect.value * skill.breakthroughLevel }
        effects.push(newEffect)
      }
    }
    skill.effects = effects
  }
  
  addSkillExp(playerId: string, skillId: string, exp: number): { success: boolean; message: string } {
    const data = this.getPlayerData(playerId)
    const skill = data.skills.get(skillId)
    if (!skill) return { success: false, message: '技能不存在' }
    skill.exp += exp
    while (skill.exp >= skill.maxExp && skill.level < 10) {
      skill.exp -= skill.maxExp
      this.upgradeSkill(playerId, skillId)
    }
    skill.updatedAt = Date.now()
    return { success: true, message: `获得经验 ${exp}` }
  }
  
  addSkillPoint(playerId: string, points: number): void {
    const data = this.getPlayerData(playerId)
    data.skillPoints += points
    data.totalSkillPoints += points
  }
  
  getSkillTotalAttributes(playerId: string): Record<string, number> {
    const result: Record<string, number> = { attack: 0, defense: 0, hp: 0, crit: 0, dodge: 0, damage: 0, heal: 0 }
    const skills = this.getPlayerSkills(playerId)
    for (const skill of skills) {
      for (const effect of skill.effects) {
        const attrName = effect.type === 'damage' ? 'damage' : effect.type === 'heal' ? 'heal' : effect.type === 'passive' ? 'attack' : effect.type
        result[attrName] = (result[attrName] || 0) + effect.value
      }
    }
    return result
  }
}
