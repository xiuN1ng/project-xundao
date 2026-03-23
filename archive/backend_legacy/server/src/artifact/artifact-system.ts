// 神器系统 - 神器获取、强化、合成
// 神器系统提供强大的装备和属性加成

export interface Artifact {
  artifactId: string
  playerId: string
  templateId: string      // 神器模板ID
  name: string            // 神器名称
  level: number           // 神器等级
  exp: number             // 当前经验
  quality: 'blue' | 'purple' | 'orange' | 'red' | 'gold'
  slots: ArtifactSlot[]   // 强化槽位
  skills: string[]        // 激活的技能ID
  attributes: ArtifactAttribute  // 基础属性
  refineLevel: number     // 精炼等级
  isEquipped: boolean     // 是否装备
  obtainTime: number      // 获取时间
}

export interface ArtifactSlot {
  slotId: string
  type: 'attack' | 'defense' | 'hp' | 'critical' | 'dodge' | 'exp' | 'drop'
  level: number
  exp: number
  isActivated: boolean
}

export interface ArtifactAttribute {
  attack: number
  defense: number
  hp: number
  critical: number
  dodge: number
  expBonus: number
  dropBonus: number
}

export interface ArtifactTemplate {
  templateId: string
  name: string
  nameCN: string
  description: string
  quality: 'blue' | 'purple' | 'orange' | 'red' | 'gold'
  type: 'weapon' | 'armor' | 'accessory' | 'ring' | 'necklace'
  baseAttributes: ArtifactAttribute
  slotTypes: string[]    // 可强化的槽位类型
  skills: string[]       // 固有技能
  composeCost: {
    items: { itemId: string, count: number }[]
    gold: number
  }
  dropSource: string[]  // 掉落来源
}

// 神器强化配置
export interface ArtifactEnhanceConfig {
  // 强化消耗
  enhanceCost: {
    // 基础消耗金币
    baseGold: number
    // 每次升级增量
    goldPerLevel: number
    // 强化材料
    materials: { itemId: string, count: number }[]
  }
  // 强化成功率
  successRate: {
    // 基础成功率
    baseRate: number
    // 每次失败增加成功率
    failBonus: number
    // 最大成功率
    maxRate: number
  }
  // 强化等级上限
  maxLevel: number
  // 经验曲线
  expCurve: number[]
}

// 神器精炼配置
export interface ArtifactRefineConfig {
  // 精炼消耗
  refineCost: {
    gold: number
    materials: { itemId: string, count: number }[]
  }
  // 精炼成功率
  successRate: number
  // 精炼属性加成
  attributeBonus: {
    attack: number
    defense: number
    hp: number
  }
  // 精炼等级上限
  maxLevel: number
}

// 神器合成配置
export interface ArtifactComposeConfig {
  // 合成消耗
  composeCost: {
    sameArtifact: number  // 需要相同神器数量
    gold: number
    materials: { itemId: string, count: number }[]
  }
  // 合成成功率
  successRate: number
  // 合成品质提升概率
  qualityUpRate: number
}

// 神器模板
export const ARTIFACT_TEMPLATES: ArtifactTemplate[] = [
  {
    templateId: 'artifact_weapon_1',
    name: 'Celestial Sword',
    nameCN: '青云剑',
    description: '传说中的仙剑，蕴含天地灵气',
    quality: 'blue',
    type: 'weapon',
    baseAttributes: { attack: 100, defense: 0, hp: 0, critical: 5, dodge: 0, expBonus: 0, dropBonus: 0 },
    slotTypes: ['attack', 'critical', 'exp'],
    skills: ['artifact_skill_1'],
    composeCost: { items: [{ itemId: 'artifact_fragment_1', count: 10 }], gold: 1000 },
    dropSource: ['dungeon_1', 'boss_1']
  },
  {
    templateId: 'artifact_weapon_2',
    name: 'Dragon Slaying Spear',
    nameCN: '龙吟枪',
    description: '可屠龙的利器',
    quality: 'purple',
    type: 'weapon',
    baseAttributes: { attack: 200, defense: 0, hp: 0, critical: 10, dodge: 0, expBonus: 0, dropBonus: 0 },
    slotTypes: ['attack', 'critical', 'drop'],
    skills: ['artifact_skill_2'],
    composeCost: { items: [{ itemId: 'artifact_fragment_2', count: 20 }], gold: 5000 },
    dropSource: ['dungeon_5', 'boss_3']
  },
  {
    templateId: 'artifact_weapon_3',
    name: 'Immortal Blade',
    nameCN: '倚天剑',
    description: '削铁如泥的神兵',
    quality: 'orange',
    type: 'weapon',
    baseAttributes: { attack: 500, defense: 0, hp: 0, critical: 15, dodge: 5, expBonus: 0, dropBonus: 0 },
    slotTypes: ['attack', 'critical', 'dodge', 'exp'],
    skills: ['artifact_skill_3'],
    composeCost: { items: [{ itemId: 'artifact_fragment_3', count: 50 }], gold: 20000 },
    dropSource: ['dungeon_10', 'world_boss']
  },
  {
    templateId: 'artifact_armor_1',
    name: 'Phoenix Armor',
    nameCN: '凤凰甲',
    description: '凤凰羽毛编织的护甲',
    quality: 'blue',
    type: 'armor',
    baseAttributes: { attack: 0, defense: 80, hp: 500, critical: 0, dodge: 3, expBonus: 0, dropBonus: 0 },
    slotTypes: ['defense', 'hp', 'dodge'],
    skills: ['artifact_skill_4'],
    composeCost: { items: [{ itemId: 'artifact_fragment_1', count: 10 }], gold: 1000 },
    dropSource: ['dungeon_2', 'boss_1']
  },
  {
    templateId: 'artifact_armor_2',
    name: 'Dragon Scale Shield',
    nameCN: '龙鳞盾',
    description: '真龙鳞片打造的盾牌',
    quality: 'purple',
    type: 'armor',
    baseAttributes: { attack: 0, defense: 150, hp: 1000, critical: 0, dodge: 5, expBonus: 0, dropBonus: 0 },
    slotTypes: ['defense', 'hp', 'dodge', 'drop'],
    skills: ['artifact_skill_5'],
    composeCost: { items: [{ itemId: 'artifact_fragment_2', count: 20 }], gold: 5000 },
    dropSource: ['dungeon_6', 'boss_4']
  },
  {
    templateId: 'artifact_armor_3',
    name: 'Heavenly Robe',
    nameCN: '天蚕衣',
    description: '天蚕丝制成的仙衣',
    quality: 'orange',
    type: 'armor',
    baseAttributes: { attack: 0, defense: 300, hp: 2000, critical: 5, dodge: 10, expBonus: 0, dropBonus: 0 },
    slotTypes: ['defense', 'hp', 'dodge', 'exp'],
    skills: ['artifact_skill_6'],
    composeCost: { items: [{ itemId: 'artifact_fragment_3', count: 50 }], gold: 20000 },
    dropSource: ['dungeon_12', 'world_boss']
  },
  {
    templateId: 'artifact_accessory_1',
    name: 'Ring of Eternity',
    nameCN: '永恒戒指',
    description: '蕴含时间法则的戒指',
    quality: 'blue',
    type: 'ring',
    baseAttributes: { attack: 50, defense: 50, hp: 200, critical: 3, dodge: 3, expBonus: 0, dropBonus: 0 },
    slotTypes: ['attack', 'defense', 'hp'],
    skills: [],
    composeCost: { items: [{ itemId: 'artifact_fragment_1', count: 10 }], gold: 1000 },
    dropSource: ['dungeon_3', 'boss_2']
  },
  {
    templateId: 'artifact_accessory_2',
    name: 'Amulet of Luck',
    nameCN: '幸运护符',
    description: '增加幸运的护身符',
    quality: 'purple',
    type: 'accessory',
    baseAttributes: { attack: 80, defense: 80, hp: 400, critical: 8, dodge: 8, expBonus: 5, dropBonus: 5 },
    slotTypes: ['attack', 'defense', 'hp', 'exp', 'drop'],
    skills: ['artifact_skill_7'],
    composeCost: { items: [{ itemId: 'artifact_fragment_2', count: 20 }], gold: 5000 },
    dropSource: ['dungeon_7', 'boss_5']
  },
  {
    templateId: 'artifact_accessory_3',
    name: 'Necklace of Immortality',
    nameCN: '长生项链',
    description: '延长寿命的仙宝',
    quality: 'orange',
    type: 'necklace',
    baseAttributes: { attack: 150, defense: 150, hp: 1000, critical: 10, dodge: 10, expBonus: 10, dropBonus: 10 },
    slotTypes: ['attack', 'defense', 'hp', 'critical', 'exp', 'drop'],
    skills: ['artifact_skill_8'],
    composeCost: { items: [{ itemId: 'artifact_fragment_3', count: 50 }], gold: 20000 },
    dropSource: ['dungeon_15', 'world_boss']
  },
  {
    templateId: 'artifact_red_1',
    name: 'Primordial Chaos Sword',
    nameCN: '混沌剑',
    description: '混沌初开时诞生的神器',
    quality: 'red',
    type: 'weapon',
    baseAttributes: { attack: 1000, defense: 100, hp: 2000, critical: 20, dodge: 10, expBonus: 15, dropBonus: 15 },
    slotTypes: ['attack', 'critical', 'dodge', 'exp', 'drop'],
    skills: ['artifact_skill_9', 'artifact_skill_10'],
    composeCost: { items: [{ itemId: 'artifact_fragment_4', count: 100 }], gold: 100000 },
    dropSource: ['raid_boss', 'limited_event']
  },
  {
    templateId: 'artifact_gold_1',
    name: ' Creation Treasure',
    nameCN: '造化玉碟',
    description: '蕴含大道法则的至宝',
    quality: 'gold',
    type: 'ring',
    baseAttributes: { attack: 2000, defense: 2000, hp: 10000, critical: 30, dodge: 30, expBonus: 30, dropBonus: 30 },
    slotTypes: ['attack', 'defense', 'hp', 'critical', 'dodge', 'exp', 'drop'],
    skills: ['artifact_skill_11', 'artifact_skill_12', 'artifact_skill_13'],
    composeCost: { items: [{ itemId: 'artifact_fragment_5', count: 200 }], gold: 500000 },
    dropSource: ['final_boss', 'limited_event']
  }
]

// 神器强化配置
export const ARTIFACT_ENHANCE_CONFIG: ArtifactEnhanceConfig = {
  enhanceCost: {
    baseGold: 100,
    goldPerLevel: 50,
    materials: [
      { itemId: 'enhance_stone_1', count: 1 }
    ]
  },
  successRate: {
    baseRate: 0.8,
    failBonus: 0.1,
    maxRate: 0.95
  },
  maxLevel: 100,
  expCurve: [100, 200, 350, 550, 800, 1100, 1450, 1850, 2300, 2800, 3350, 3950, 4600, 5300, 6050, 6850, 7700, 8600, 9550, 10550, 11600, 12700, 13850, 15050, 16300, 17600, 18950, 20350, 21800, 23300, 24850, 26450, 28100, 29800, 31550, 33350, 35200, 37100, 39050, 41050, 43100, 45200, 47350, 49550, 51800, 54100, 56450, 58850, 61300, 63800, 66350, 68950, 71600, 74300, 77050, 79850, 82700, 85600, 88550, 91550, 94600, 97700, 100850, 104050, 107300, 110600, 113950, 117350, 120800, 124300, 127850, 131450, 135100, 138800, 142550, 146350, 150200, 154100, 158050, 162050, 166100, 170200, 174350, 178550, 182800, 187100, 191450, 195850, 200300, 204800, 209350, 213950, 218600, 223300, 228050, 232850, 237700, 242600, 247550]
}

// 神器精炼配置
export const ARTIFACT_REFINE_CONFIG: ArtifactRefineConfig = {
  refineCost: {
    gold: 10000,
    materials: [
      { itemId: 'refine_stone_1', count: 5 },
      { itemId: 'refine_material_1', count: 10 }
    ]
  },
  successRate: 0.5,
  attributeBonus: {
    attack: 50,
    defense: 50,
    hp: 500
  },
  maxLevel: 20
}

// 神器合成配置
export const ARTIFACT_COMPOSE_CONFIG: ArtifactComposeConfig = {
  composeCost: {
    sameArtifact: 3,
    gold: 50000,
    materials: [
      { itemId: 'compose_stone_1', count: 10 },
      { itemId: 'compose_material_1', count: 20 }
    ]
  },
  successRate: 0.7,
  qualityUpRate: 0.3
}

// 神器技能定义
export const ARTIFACT_SKILLS = [
  {
    skillId: 'artifact_skill_1',
    name: '剑意',
    nameCN: '剑意',
    description: '攻击时有5%概率额外造成50%伤害',
    effect: { type: 'passive', trigger: 'attack', extraDamage: 0.5, triggerRate: 0.05 }
  },
  {
    skillId: 'artifact_skill_2',
    name: '龙威',
    nameCN: '龙威',
    description: '攻击时增加10%暴击率',
    effect: { type: 'passive', attribute: 'critical', value: 10 }
  },
  {
    skillId: 'artifact_skill_3',
    name: '破天',
    nameCN: '破天',
    description: '攻击时有15%概率造成300%伤害',
    effect: { type: 'passive', trigger: 'attack', extraDamage: 3, triggerRate: 0.15 }
  },
  {
    skillId: 'artifact_skill_4',
    name: '护体',
    nameCN: '护体',
    description: '受到攻击时有10%概率减少30%伤害',
    effect: { type: 'passive', trigger: 'beAttacked', damageReduction: 0.3, triggerRate: 0.1 }
  },
  {
    skillId: 'artifact_skill_5',
    name: '龙鳞',
    nameCN: '龙鳞',
    description: '增加15%防御',
    effect: { type: 'passive', attribute: 'defense', value: 0.15, calculateType: 'percent' }
  },
  {
    skillId: 'artifact_skill_6',
    name: '不灭',
    nameCN: '不灭',
    description: '生命低于30%时，增加20%防御',
    effect: { type: 'passive', trigger: 'hpBelow30', attribute: 'defense', value: 0.2, calculateType: 'percent' }
  },
  {
    skillId: 'artifact_skill_7',
    name: '福缘',
    nameCN: '福缘',
    description: '增加10%经验和掉落',
    effect: { type: 'passive', attribute: 'expBonus', value: 10, attribute2: 'dropBonus', value2: 10 }
  },
  {
    skillId: 'artifact_skill_8',
    name: '长生',
    nameCN: '长生',
    description: '增加15%经验和掉落',
    effect: { type: 'passive', attribute: 'expBonus', value: 15, attribute2: 'dropBonus', value2: 15 }
  },
  {
    skillId: 'artifact_skill_9',
    name: '混沌',
    nameCN: '混沌',
    description: '攻击时有20%概率造成500%伤害',
    effect: { type: 'passive', trigger: 'attack', extraDamage: 5, triggerRate: 0.2 }
  },
  {
    skillId: 'artifact_skill_10',
    name: '混沌护体',
    nameCN: '混沌护体',
    description: '减少25%受到的伤害',
    effect: { type: 'passive', attribute: 'damageReduction', value: 0.25 }
  },
  {
    skillId: 'artifact_skill_11',
    name: '大道',
    nameCN: '大道',
    description: '增加30%全属性',
    effect: { type: 'passive', attribute: 'all', value: 0.3, calculateType: 'percent' }
  },
  {
    skillId: 'artifact_skill_12',
    name: '天道',
    nameCN: '天道',
    description: '攻击时有30%概率造成800%伤害',
    effect: { type: 'passive', trigger: 'attack', extraDamage: 8, triggerRate: 0.3 }
  },
  {
    skillId: 'artifact_skill_13',
    name: '造化',
    nameCN: '造化',
    description: '生命恢复速度增加50%',
    effect: { type: 'passive', attribute: 'hpRecovery', value: 0.5, calculateType: 'percent' }
  }
]

export class ArtifactSystem {
  private artifacts: Map<string, Artifact[]> = new Map()
  private enhanceFailCount: Map<string, number> = new Map()

  // 获取玩家神器列表
  getPlayerArtifacts(playerId: string): Artifact[] {
    return this.artifacts.get(playerId) || []
  }

  // 获取玩家装备的神器
  getEquippedArtifact(playerId: string): Artifact | undefined {
    const artifacts = this.artifacts.get(playerId)
    return artifacts?.find(a => a.isEquipped)
  }

  // 添加神器
  addArtifact(playerId: string, templateId: string): Artifact | null {
    const template = ARTIFACT_TEMPLATES.find(t => t.templateId === templateId)
    if (!template) return null

    const artifact: Artifact = {
      artifactId: `artifact_${playerId}_${Date.now()}`,
      playerId,
      templateId,
      name: template.nameCN,
      level: 1,
      exp: 0,
      quality: template.quality,
      slots: template.slotTypes.map((type, index) => ({
        slotId: `slot_${index}`,
        type: type as any,
        level: 0,
        exp: 0,
        isActivated: false
      })),
      skills: [...template.skills],
      attributes: { ...template.baseAttributes },
      refineLevel: 0,
      isEquipped: false,
      obtainTime: Date.now()
    }

    const artifacts = this.artifacts.get(playerId) || []
    artifacts.push(artifact)
    this.artifacts.set(playerId, artifacts)

    return artifact
  }

  // 强化神器
  enhanceArtifact(playerId: string, artifactId: string): { success: boolean, newLevel?: number, message: string } {
    const artifacts = this.artifacts.get(playerId)
    if (!artifacts) return { success: false, message: '玩家不存在' }

    const artifact = artifacts.find(a => a.artifactId === artifactId)
    if (!artifact) return { success: false, message: '神器不存在' }

    const config = ARTIFACT_ENHANCE_CONFIG
    if (artifact.level >= config.maxLevel) return { success: false, message: '已达到最大等级' }

    // 计算强化消耗
    const goldCost = config.enhanceCost.baseGold + (artifact.level * config.enhanceCost.goldPerLevel)
    
    // 计算成功率
    const failCount = this.enhanceFailCount.get(artifactId) || 0
    const successRate = Math.min(
      config.successRate.baseRate + (failCount * config.successRate.failBonus),
      config.successRate.maxRate
    )

    // 判断是否成功
    const isSuccess = Math.random() < successRate

    if (isSuccess) {
      artifact.level++
      this.enhanceFailCount.delete(artifactId)
      // 更新属性
      this.updateArtifactAttributes(artifact)
      return { success: true, newLevel: artifact.level, message: `强化成功！神器等级提升至${artifact.level}级` }
    } else {
      this.enhanceFailCount.set(artifactId, failCount + 1)
      return { success: false, message: `强化失败，当前成功率${(successRate * 100).toFixed(0)}%` }
    }
  }

  // 精炼神器
  refineArtifact(playerId: string, artifactId: string): { success: boolean, newRefineLevel?: number, message: string } {
    const artifacts = this.artifacts.get(playerId)
    if (!artifacts) return { success: false, message: '玩家不存在' }

    const artifact = artifacts.find(a => a.artifactId === artifactId)
    if (!artifact) return { success: false, message: '神器不存在' }

    const config = ARTIFACT_REFINE_CONFIG
    if (artifact.refineLevel >= config.maxLevel) return { success: false, message: '已达到最大精炼等级' }

    const isSuccess = Math.random() < config.successRate

    if (isSuccess) {
      artifact.refineLevel++
      this.updateArtifactAttributes(artifact)
      return { success: true, newRefineLevel: artifact.refineLevel, message: `精炼成功！精炼等级提升至${artifact.refineLevel}级` }
    } else {
      return { success: false, message: '精炼失败' }
    }
  }

  // 合成神器
  composeArtifact(playerId: string, templateId: string): { success: boolean, artifact?: Artifact, message: string } {
    const config = ARTIFACT_COMPOSE_CONFIG
    const artifacts = this.artifacts.get(playerId)
    if (!artifacts) return { success: false, message: '玩家不存在' }

    // 查找相同模板的神器
    const sameArtifacts = artifacts.filter(a => a.templateId === templateId)
    if (sameArtifacts.length < config.composeCost.sameArtifact) {
      return { success: false, message: `需要${config.composeCost.sameArtifact}个相同神器` }
    }

    const isSuccess = Math.random() < config.successRate

    if (isSuccess) {
      // 移除用于合成的神器
      const removeCount = config.composeCost.sameArtifact
      for (let i = 0; i < removeCount; i++) {
        const index = artifacts.findIndex(a => a.templateId === templateId)
        if (index >= 0) artifacts.splice(index, 1)
      }

      // 是否提升品质
      const qualityUp = Math.random() < config.qualityUpRate
      let newTemplateId = templateId
      if (qualityUp) {
        const currentTemplate = ARTIFACT_TEMPLATES.find(t => t.templateId === templateId)
        if (currentTemplate) {
          const qualityOrder = ['blue', 'purple', 'orange', 'red', 'gold']
          const currentIndex = qualityOrder.indexOf(currentTemplate.quality)
          if (currentIndex < qualityOrder.length - 1) {
            const newQuality = qualityOrder[currentIndex + 1]
            const upgradedTemplate = ARTIFACT_TEMPLATES.find(t => 
              t.type === currentTemplate.type && t.quality === newQuality
            )
            if (upgradedTemplate) newTemplateId = upgradedTemplate.templateId
          }
        }
      }

      const newArtifact = this.addArtifact(playerId, newTemplateId)
      if (!newArtifact) return { success: false, message: '合成失败' }

      const qualityMsg = qualityUp ? '，品质提升！' : ''
      return { success: true, artifact: newArtifact, message: `合成成功！获得${newArtifact.name}${qualityMsg}` }
    } else {
      // 移除用于合成的神器
      const removeCount = config.composeCost.sameArtifact
      for (let i = 0; i < removeCount; i++) {
        const index = artifacts.findIndex(a => a.templateId === templateId)
        if (index >= 0) artifacts.splice(index, 1)
      }
      return { success: false, message: '合成失败，神器已消失' }
    }
  }

  // 装备神器
  equipArtifact(playerId: string, artifactId: string): { success: boolean, message: string } {
    const artifacts = this.artifacts.get(playerId)
    if (!artifacts) return { success: false, message: '玩家不存在' }

    const artifact = artifacts.find(a => a.artifactId === artifactId)
    if (!artifact) return { success: false, message: '神器不存在' }

    // 卸下其他装备的神器
    artifacts.forEach(a => {
      if (a.isEquipped) a.isEquipped = false
    })

    artifact.isEquipped = true
    return { success: true, message: `已装备${artifact.name}` }
  }

  // 卸下神器
  unequipArtifact(playerId: string, artifactId: string): { success: boolean, message: string } {
    const artifacts = this.artifacts.get(playerId)
    if (!artifacts) return { success: false, message: '玩家不存在' }

    const artifact = artifacts.find(a => a.artifactId === artifactId)
    if (!artifact) return { success: false, message: '神器不存在' }

    artifact.isEquipped = false
    return { success: true, message: `已卸下${artifact.name}` }
  }

  // 更新神器属性
  private updateArtifactAttributes(artifact: Artifact): void {
    const template = ARTIFACT_TEMPLATES.find(t => t.templateId === artifact.templateId)
    if (!template) return

    const enhanceBonus = artifact.level * 0.1  // 每级10%属性加成
    const refineBonus = artifact.refineLevel   // 每精炼等级固定加成

    artifact.attributes = {
      attack: Math.floor(template.baseAttributes.attack * (1 + enhanceBonus) + refineBonus * ARTIFACT_REFINE_CONFIG.attributeBonus.attack),
      defense: Math.floor(template.baseAttributes.defense * (1 + enhanceBonus) + refineBonus * ARTIFACT_REFINE_CONFIG.attributeBonus.defense),
      hp: Math.floor(template.baseAttributes.hp * (1 + enhanceBonus) + refineBonus * ARTIFACT_REFINE_CONFIG.attributeBonus.hp),
      critical: template.baseAttributes.critical,
      dodge: template.baseAttributes.dodge,
      expBonus: template.baseAttributes.expBonus + artifact.level,
      dropBonus: template.baseAttributes.dropBonus + artifact.level
    }
  }

  // 获取神器战斗力
  getArtifactCombatPower(artifact: Artifact): number {
    const { attack, defense, hp, critical, dodge, expBonus, dropBonus } = artifact.attributes
    return Math.floor(
      attack * 2 + 
      defense * 1.5 + 
      hp * 0.1 + 
      critical * 10 + 
      dodge * 10 + 
      expBonus * 5 + 
      dropBonus * 5 +
      artifact.level * 50 +
      artifact.refineLevel * 100
    )
  }
}

export default ArtifactSystem
