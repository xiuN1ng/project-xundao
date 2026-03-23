// 天赋系统 - 角色成长天赋体系

export interface TalentTree {
  treeId: string
  name: string
  nameCN: string
  type: 'combat' | ' cultivation' | 'support' | 'special'
  description: string
  icon: string
  unlockLevel: number
  maxPoints: number
  talents: Talent[]
}

export interface Talent {
  talentId: string
  name: string
  nameCN: string
  tier: number // 1-5 层
  maxLevel: number // 最大等级 (1-3)
  prerequisites: string[] // 前置天赋ID
  effects: TalentEffect[]
  icon: string
}

export interface TalentEffect {
  type: 'attribute' | 'skill' | 'passive' | 'special'
  attribute?: {
    name: string
    value: number
    isPercent: boolean
  }
  skillId?: string
  passiveId?: string
  description: string
}

export interface PlayerTalentData {
  playerId: string
  unlockedTrees: string[] // 已解锁的天赋树
  talentPoints: number // 天赋点数
  usedPoints: number // 已用点数
  talents: Map<string, number> // 天赋ID -> 等级
  lastUpdateTime: number
}

// 天赋树配置
export const TALENT_TREES: TalentTree[] = [
  // ========== 战斗天赋树 ==========
  {
    treeId: 'combat_warrior',
    name: 'Warrior Path',
    nameCN: '战斗之道',
    type: 'combat',
    description: '提升战斗能力的核心天赋',
    icon: '⚔️',
    unlockLevel: 1,
    maxPoints: 50,
    talents: [
      // 第1层
      {
        talentId: 'combat_power',
        name: 'Power Strike',
        nameCN: '力量打击',
        tier: 1,
        maxLevel: 3,
        prerequisites: [],
        effects: [
          { type: 'attribute', attribute: { name: 'attack', value: 5, isPercent: false }, description: '攻击+5/级' }
        ],
        icon: '⚔️'
      },
      {
        talentId: 'combat_defense',
        name: 'Iron Body',
        nameCN: '铁壁防御',
        tier: 1,
        maxLevel: 3,
        prerequisites: [],
        effects: [
          { type: 'attribute', attribute: { name: 'defense', value: 5, isPercent: false }, description: '防御+5/级' }
        ],
        icon: '🛡️'
      },
      // 第2层
      {
        talentId: 'combat_crit',
        name: 'Critical Eye',
        nameCN: '洞察之眼',
        tier: 2,
        maxLevel: 3,
        prerequisites: ['combat_power'],
        effects: [
          { type: 'attribute', attribute: { name: 'crit', value: 2, isPercent: false }, description: '暴击+2%/级' }
        ],
        icon: '👁️'
      },
      {
        talentId: 'combat_hp',
        name: 'Vitality',
        nameCN: '生命强化',
        tier: 2,
        maxLevel: 3,
        prerequisites: ['combat_defense'],
        effects: [
          { type: 'attribute', attribute: { name: 'hp', value: 50, isPercent: false }, description: '生命+50/级' }
        ],
        icon: '❤️'
      },
      // 第3层
      {
        talentId: 'combat_crit_dmg',
        name: 'Lethal Strike',
        nameCN: '致命打击',
        tier: 3,
        maxLevel: 3,
        prerequisites: ['combat_crit'],
        effects: [
          { type: 'attribute', attribute: { name: 'critDamage', value: 10, isPercent: false }, description: '暴击伤害+10%/级' }
        ],
        icon: '💥'
      },
      {
        talentId: 'combat_dodge',
        name: 'Swift Step',
        nameCN: '凌波微步',
        tier: 3,
        maxLevel: 3,
        prerequisites: ['combat_hp'],
        effects: [
          { type: 'attribute', attribute: { name: 'dodge', value: 2, isPercent: false }, description: '闪避+2%/级' }
        ],
        icon: '💨'
      },
      // 第4层
      {
        talentId: 'combat_master',
        name: 'Combat Master',
        nameCN: '战斗大师',
        tier: 4,
        maxLevel: 1,
        prerequisites: ['combat_crit_dmg', 'combat_dodge'],
        effects: [
          { type: 'attribute', attribute: { name: 'allAttributes', value: 10, isPercent: false }, description: '全属性+10%' }
        ],
        icon: '🏆'
      },
      // 第5层
      {
        talentId: 'combat_legend',
        name: 'Legendary Warrior',
        nameCN: '传奇战士',
        tier: 5,
        maxLevel: 1,
        prerequisites: ['combat_master'],
        effects: [
          { type: 'attribute', attribute: { name: 'attack', value: 50, isPercent: false }, description: '攻击+50' },
          { type: 'attribute', attribute: { name: 'crit', value: 5, isPercent: false }, description: '暴击+5%' },
          { type: 'special', description: '战斗时有5%几率造成双倍伤害' }
        ],
        icon: '👑'
      }
    ]
  },
  // ========== 修炼天赋树 ==========
  {
    treeId: 'cultivation_strength',
    name: 'Cultivation Enhancement',
    nameCN: '修炼强化',
    type: 'cultivation',
    description: '提升修炼效率的天赋',
    icon: '🧘',
    unlockLevel: 1,
    maxPoints: 50,
    talents: [
      // 第1层
      {
        talentId: 'cult_spirit',
        name: 'Spirit Gathering',
        nameCN: '灵气汇聚',
        tier: 1,
        maxLevel: 3,
        prerequisites: [],
        effects: [
          { type: 'attribute', attribute: { name: 'spiritGain', value: 5, isPercent: true }, description: '灵气获取+5%/级' }
        ],
        icon: '✨'
      },
      {
        talentId: 'cult_exp',
        name: 'Exp Boost',
        nameCN: '经验加成',
        tier: 1,
        maxLevel: 3,
        prerequisites: [],
        effects: [
          { type: 'attribute', attribute: { name: 'expGain', value: 5, isPercent: true }, description: '经验获取+5%/级' }
        ],
        icon: '📈'
      },
      // 第2层
      {
        talentId: 'cult_breakthrough',
        name: 'Breakthrough',
        nameCN: '境界突破',
        tier: 2,
        maxLevel: 3,
        prerequisites: ['cult_spirit'],
        effects: [
          { type: 'attribute', attribute: { name: 'breakthroughRate', value: 5, isPercent: true }, description: '突破成功率+5%/级' }
        ],
        icon: '🚀'
      },
      {
        talentId: 'cult_speed',
        name: 'Speed Cultivation',
        nameCN: '快速修炼',
        tier: 2,
        maxLevel: 3,
        prerequisites: ['cult_exp'],
        effects: [
          { type: 'attribute', attribute: { name: 'cultivationSpeed', value: 10, isPercent: true }, description: '修炼速度+10%/级' }
        ],
        icon: '⚡'
      },
      // 第3层
      {
        talentId: 'cult_spirit_max',
        name: 'Spirit Core',
        nameCN: '灵气核心',
        tier: 3,
        maxLevel: 3,
        prerequisites: ['cult_breakthrough'],
        effects: [
          { type: 'attribute', attribute: { name: 'maxSpirit', value: 500, isPercent: false }, description: '最大灵气+500/级' }
        ],
        icon: '💎'
      },
      {
        talentId: 'cult_drop',
        name: 'Treasure Hunter',
        nameCN: '寻宝达人',
        tier: 3,
        maxLevel: 3,
        prerequisites: ['cult_speed'],
        effects: [
          { type: 'attribute', attribute: { name: 'dropRate', value: 5, isPercent: true }, description: '掉落率+5%/级' }
        ],
        icon: '🎁'
      },
      // 第4层
      {
        talentId: 'cult_master',
        name: 'Cultivation Master',
        nameCN: '修炼大师',
        tier: 4,
        maxLevel: 1,
        prerequisites: ['cult_spirit_max', 'cult_drop'],
        effects: [
          { type: 'attribute', attribute: { name: 'cultivationEfficiency', value: 20, isPercent: true }, description: '修炼效率+20%' }
        ],
        icon: '🎓'
      },
      // 第5层
      {
        talentId: 'cult_immortal',
        name: 'Immortal Body',
        nameCN: '仙人之体',
        tier: 5,
        maxLevel: 1,
        prerequisites: ['cult_master'],
        effects: [
          { type: 'attribute', attribute: { name: 'realmSpeed', value: 50, isPercent: true }, description: '境界提升速度+50%' },
          { type: 'special', description: '灵气自动恢复速度翻倍' }
        ],
        icon: '🌟'
      }
    ]
  },
  // ========== 辅助天赋树 ==========
  {
    treeId: 'support_life',
    name: 'Life Support',
    nameCN: '生存之道',
    type: 'support',
    description: '提升生存能力的辅助天赋',
    icon: '🌿',
    unlockLevel: 10,
    maxPoints: 30,
    talents: [
      // 第1层
      {
        talentId: 'life_regen',
        name: 'Regeneration',
        nameCN: '生命恢复',
        tier: 1,
        maxLevel: 3,
        prerequisites: [],
        effects: [
          { type: 'attribute', attribute: { name: 'hpRegen', value: 2, isPercent: false }, description: '生命恢复+2/级' }
        ],
        icon: '💚'
      },
      {
        talentId: 'life_shield',
        name: 'Energy Shield',
        nameCN: '能量护盾',
        tier: 1,
        maxLevel: 3,
        prerequisites: [],
        effects: [
          { type: 'attribute', attribute: { name: 'shield', value: 10, isPercent: true }, description: '护盾+10%/级' }
        ],
        icon: '🔰'
      },
      // 第2层
      {
        talentId: 'life_tenacity',
        name: 'Tenacity',
        nameCN: '坚韧不屈',
        tier: 2,
        maxLevel: 3,
        prerequisites: ['life_regen'],
        effects: [
          { type: 'attribute', attribute: { name: 'tenacity', value: 5, isPercent: true }, description: '韧性+5%/级' }
        ],
        icon: '💪'
      },
      {
        talentId: 'life_barrier',
        name: 'Barrier',
        nameCN: '护体屏障',
        tier: 2,
        maxLevel: 3,
        prerequisites: ['life_shield'],
        effects: [
          { type: 'attribute', attribute: { name: 'damageReduction', value: 3, isPercent: true }, description: '伤害减免+3%/级' }
        ],
        icon: '🛡️'
      },
      // 第3层
      {
        talentId: 'life_immortal',
        name: 'Near Death',
        nameCN: '置之死地',
        tier: 3,
        maxLevel: 1,
        prerequisites: ['life_tenacity'],
        effects: [
          { type: 'special', description: '生命低于30%时，攻击力提升50%' }
        ],
        icon: '🔥'
      },
      {
        talentId: 'life_blessing',
        name: 'Divine Blessing',
        nameCN: '神圣祝福',
        tier: 3,
        maxLevel: 1,
        prerequisites: ['life_barrier'],
        effects: [
          { type: 'special', description: '受到致命伤害时，保留1点生命并获得3秒无敌' }
        ],
        icon: '🙏'
      }
    ]
  },
  // ========== 特殊天赋树 ==========
  {
    treeId: 'special_lucky',
    name: 'Lucky Star',
    nameCN: '幸运之星',
    type: 'special',
    description: '提升运气和稀有掉落',
    icon: '🍀',
    unlockLevel: 20,
    maxPoints: 20,
    talents: [
      // 第1层
      {
        talentId: 'lucky_drop',
        name: 'Lucky Drop',
        nameCN: '幸运掉落',
        tier: 1,
        maxLevel: 3,
        prerequisites: [],
        effects: [
          { type: 'attribute', attribute: { name: 'dropRate', value: 3, isPercent: true }, description: '掉落率+3%/级' }
        ],
        icon: '🍀'
      },
      {
        talentId: 'lucky_crit',
        name: 'Lucky Crit',
        nameCN: '幸运暴击',
        tier: 1,
        maxLevel: 3,
        prerequisites: [],
        effects: [
          { type: 'attribute', attribute: { name: 'critRate', value: 1, isPercent: true }, description: '暴击率+1%/级' }
        ],
        icon: '⭐'
      },
      // 第2层
      {
        talentId: 'lucky_boss',
        name: 'Boss Hunter',
        nameCN: 'Boss猎人',
        tier: 2,
        maxLevel: 3,
        prerequisites: ['lucky_drop'],
        effects: [
          { type: 'attribute', attribute: { name: 'bossDropRate', value: 5, isPercent: true }, description: 'Boss掉落+5%/级' }
        ],
        icon: '👹'
      },
      {
        talentId: 'lucky_fortune',
        name: 'Fortune',
        nameCN: '福缘深厚',
        tier: 2,
        maxLevel: 3,
        prerequisites: ['lucky_crit'],
        effects: [
          { type: 'attribute', attribute: { name: 'fortune', value: 10, isPercent: true }, description: '幸运值+10/级' }
        ],
        icon: '🔮'
      },
      // 第3层
      {
        talentId: 'lucky_legend',
        name: 'Legendary Fortune',
        nameCN: '天命之人',
        tier: 3,
        maxLevel: 1,
        prerequisites: ['lucky_boss', 'lucky_fortune'],
        effects: [
          { type: 'special', description: '稀有装备掉落概率翻倍' },
          { type: 'attribute', attribute: { name: 'allLucky', value: 50, isPercent: false }, description: '幸运+50' }
        ],
        icon: '🌈'
      }
    ]
  }
]

export const TALENT_CONFIG = {
  // 初始天赋点数 (根据等级)
  pointsPerLevel: 1,
  
  // 首次完成某些成就额外奖励
  bonusPoints: {
    level10: 2,   // 10级奖励
    level30: 3,   // 30级奖励
    level50: 5,   // 50级奖励
  },
  
  // 重置
  reset: {
    enabled: true,
    costType: 'item',
    costItemId: 'talent_reset_book',
    costAmount: 1,
    freeResets: 3, // 每日免费重置次数
  },
  
  // 天赋生效
  activation: {
    // 天赋等级达到多少时生效 (例如2级生效)
    minLevelToActivate: 1,
  }
}

export class TalentSystem {
  private playerData: Map<string, PlayerTalentData> = new Map()
  
  // 获取玩家天赋数据
  getPlayerData(playerId: string): PlayerTalentData {
    if (this.playerData.has(playerId)) {
      return this.playerData.get(playerId)!
    }
    
    const newData: PlayerTalentData = {
      playerId,
      unlockedTrees: [],
      talentPoints: 0,
      usedPoints: 0,
      talents: new Map(),
      lastUpdateTime: Date.now()
    }
    
    // 初始解锁第一个战斗天赋树
    newData.unlockedTrees.push('combat_warrior')
    
    this.playerData.set(playerId, newData)
    return newData
  }
  
  // 更新天赋点数 (根据玩家等级)
  updateTalentPoints(playerId: string, playerLevel: number): void {
    const data = this.getPlayerData(playerId)
    
    // 每级获得1点
    let newPoints = playerLevel
    
    // 额外奖励
    if (playerLevel >= 10) newPoints += TALENT_CONFIG.bonusPoints.level10
    if (playerLevel >= 30) newPoints += TALENT_CONFIG.bonusPoints.level30
    if (playerLevel >= 50) newPoints += TALENT_CONFIG.bonusPoints.level50
    
    if (newPoints > data.talentPoints) {
      data.talentPoints = newPoints
    }
  }
  
  // 获取天赋树信息
  getTalentTree(treeId: string): TalentTree | null {
    return TALENT_TREES.find(t => t.treeId === treeId) || null
  }
  
  // 获取所有天赋树
  getAllTalentTrees(): TalentTree[] {
    return TALENT_TREES
  }
  
  // 获取可用天赋树
  getAvailableTrees(playerLevel: number): TalentTree[] {
    return TALENT_TREES.filter(t => playerLevel >= t.unlockLevel)
  }
  
  // 解锁天赋树
  unlockTree(playerId: string, treeId: string): {
    success: boolean
    message: string
  } {
    const data = this.getPlayerData(playerId)
    const tree = this.getTalentTree(treeId)
    
    if (!tree) {
      return { success: false, message: '天赋树不存在' }
    }
    
    if (data.unlockedTrees.includes(treeId)) {
      return { success: false, message: '天赋树已解锁' }
    }
    
    data.unlockedTrees.push(treeId)
    
    return { success: true, message: `解锁${tree.nameCN}` }
  }
  
  // 检查是否可以学习天赋
  canLearnTalent(playerId: string, talentId: string): {
    can: boolean
    reason?: string
    talent?: Talent
    tree?: TalentTree
  } {
    const data = this.getPlayerData(playerId)
    
    // 查找天赋
    let talent: Talent | undefined
    let tree: TalentTree | undefined
    
    for (const t of TALENT_TREES) {
      const found = t.talents.find(tal => tal.talentId === talentId)
      if (found) {
        talent = found
        tree = t
        break
      }
    }
    
    if (!talent || !tree) {
      return { can: false, reason: '天赋不存在' }
    }
    
    // 检查天赋树是否解锁
    if (!data.unlockedTrees.includes(tree.treeId)) {
      return { can: false, reason: `需要先解锁${tree.nameCN}` }
    }
    
    // 检查当前等级
    const currentLevel = data.talents.get(talentId) || 0
    if (currentLevel >= talent.maxLevel) {
      return { can: false, reason: '天赋已达最大等级' }
    }
    
    // 检查天赋点数
    const availablePoints = data.talentPoints - data.usedPoints
    if (availablePoints < 1) {
      return { can: false, reason: '天赋点数不足' }
    }
    
    // 检查前置天赋
    for (const prereqId of talent.prerequisites) {
      const prereqLevel = data.talents.get(prereqId) || 0
      if (prereqLevel < 1) {
        const prereqTalent = tree.talents.find(t => t.talentId === prereqId)
        return { can: false, reason: `需要先学习${prereqTalent?.nameCN || prereqId}` }
      }
    }
    
    return { can: true, talent, tree }
  }
  
  // 学习/升级天赋
  learnTalent(playerId: string, talentId: string): {
    success: boolean
    newLevel: number
    message: string
  } {
    const check = this.canLearnTalent(playerId, talentId)
    if (!check.can) {
      return { success: false, newLevel: 0, message: check.reason || '无法学习' }
    }
    
    const data = this.getPlayerData(playerId)
    const talent = check.talent!
    
    // 升级天赋
    const currentLevel = data.talents.get(talentId) || 0
    const newLevel = currentLevel + 1
    data.talents.set(talentId, newLevel)
    data.usedPoints++
    
    return {
      success: true,
      newLevel,
      message: `${talent.nameCN}升级到${newLevel}级`
    }
  }
  
  // 计算玩家总属性
  calculateAttributes(playerId: string): Record<string, number> {
    const data = this.getPlayerData(playerId)
    const attributes: Record<string, number> = {}
    
    // 遍历所有已学习的天赋
    for (const [talentId, level] of data.talents) {
      if (level < 1) continue
      
      // 查找天赋
      let talent: Talent | undefined
      for (const tree of TALENT_TREES) {
        const found = tree.talents.find(t => t.talentId === talentId)
        if (found) {
          talent = found
          break
        }
      }
      
      if (!talent) continue
      
      // 应用效果
      for (const effect of talent.effects) {
        if (effect.type === 'attribute' && effect.attribute) {
          const attrName = effect.attribute.name
          const attrValue = effect.attribute.isPercent 
            ? (attributes[attrName] || 0) + effect.attribute.value * level
            : effect.attribute.value * level
          attributes[attrName] = attrValue
        }
      }
    }
    
    return attributes
  }
  
  // 获取玩家天赋进度
  getProgress(playerId: string): {
    totalPoints: number
    usedPoints: number
    trees: { id: string; name: string; unlocked: boolean; talents: { id: string; name: string; level: number; maxLevel: number }[] }[]
  } {
    const data = this.getPlayerData(playerId)
    
    const trees = TALENT_TREES.map(tree => ({
      id: tree.treeId,
      name: tree.nameCN,
      unlocked: data.unlockedTrees.includes(tree.treeId),
      talents: tree.talents.map(t => ({
        id: t.talentId,
        name: t.nameCN,
        level: data.talents.get(t.talentId) || 0,
        maxLevel: t.maxLevel
      }))
    }))
    
    return {
      totalPoints: data.talentPoints,
      usedPoints: data.usedPoints,
      trees
    }
  }
  
  // 重置天赋
  resetTalents(playerId: string, useItem: boolean): {
    success: boolean
    refundPoints: number
    message: string
  } {
    const data = this.getPlayerData(playerId)
    
    if (!TALENT_CONFIG.reset.enabled) {
      return { success: false, refundPoints: 0, message: '重置功能已关闭' }
    }
    
    // 检查是否有重置道具
    if (!useItem) {
      return { success: false, refundPoints: 0, message: '需要重置道具' }
    }
    
    // 返还点数
    const refundPoints = data.usedPoints
    
    // 清空天赋
    data.talents = new Map()
    data.usedPoints = 0
    
    // 保留已解锁的天赋树
    data.unlockedTrees = ['combat_warrior']
    
    return {
      success: true,
      refundPoints,
      message: `天赋已重置，返还${refundPoints}点`
    }
  }
  
  // 检查特殊天赋效果
  hasSpecialEffect(playerId: string, effectType: string): boolean {
    const data = this.getPlayerData(playerId)
    
    for (const [talentId, level] of data.talents) {
      if (level < 1) continue
      
      // 查找天赋
      for (const tree of TALENT_TREES) {
        const talent = tree.talents.find(t => t.talentId === talentId)
        if (!talent) continue
        
        for (const effect of talent.effects) {
          if (effect.type === 'special' && effect.description.includes(effectType)) {
            return true
          }
        }
      }
    }
    
    return false
  }
}

export const talentSystem = new TalentSystem()
