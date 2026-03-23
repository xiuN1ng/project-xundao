// 情缘传承系统 - 结婚纪念日、夫妻传承、情缘称号
// 在原有仙侣系统基础上扩展：传承系统、纪念日系统、特效称号

import { CoupleRelation, CoupleApplication, CoupleSkill, CoupleBuff, CoupleConfig, COUPLE_CONFIG } from './couple-system'

// 结婚纪念日
export interface MarriageAnniversary {
  anniversaryId: string
  coupleId: string
  playerAId: string
  playerBId: string
  anniversaryType: '1year' | '3year' | '5year' | '10year' | '20year' | '50year' | '100year'
  anniversaryYear: number
  celebrationTime: number
  rewardsClaimed: boolean
}

// 情缘传承
export interface CoupleInheritance {
  inheritanceId: string
  fromPlayerId: string
  toPlayerId: string
  inheritanceType: 'skill' | 'attribute' | 'buff' | 'title'
  inheritItems: InheritItem[]
  progress: number      // 传承进度 (0-100)
  isCompleted: boolean
  startTime: number
  completeTime?: number
}

export interface InheritItem {
  type: 'skill_id' | 'attribute' | 'buff_id' | 'title_id'
  itemId: string
  value: number
  duration?: number  // 持续时间(毫秒)，0表示永久
}

// 情缘称号
export interface CoupleTitle {
  titleId: string
  name: string
  nameCN: string
  description: string
  type: 'marriage' | 'anniversary' | 'achievement' | 'inheritance'
  requirement: {
    type: 'love_level' | 'anniversary_year' | 'activity_count' | 'inheritance_count'
    value: number
  }
  attributes: {
    attack?: number
    defense?: number
    hp?: number
    exp?: number
    drop?: number
  }
  isPermanent: boolean
  duration?: number  // 限时持续时间
}

// 情缘特效
export interface CoupleEffect {
  effectId: string
  name: string
  nameCN: string
  type: 'avatar_frame' | 'badge' | 'particle' | 'sound' | 'skill_effect'
  requirement: {
    type: 'love_level' | 'anniversary_year' | 'achievement'
    value: number
  }
  assetUrl?: string
  isPermanent: boolean
  duration?: number
}

// 情缘活动
export interface CoupleActivity {
  activityId: string
  coupleId: string
  playerAId: string
  playerBId: string
  activityType: 'date' | 'quest' | 'battle' | 'gift' | 'chat'
  progress: number
  maxProgress: number
  rewards: { type: string, itemId?: string, amount: number }[]
  startTime: number
  expireTime: number
  isCompleted: boolean
}

// 情缘纪念日配置
export const COUPLE_ANNIVERSARY_CONFIG = {
  // 纪念日类型
  anniversaryTypes: [
    { type: '1year', year: 1, name: '一周年纪念', rewardGold: 1000, rewardItems: [{ itemId: 'love_heart', count: 1 }] },
    { type: '3year', year: 3, name: '三周年纪念', rewardGold: 5000, rewardItems: [{ itemId: 'love_heart', count: 3 }] },
    { type: '5year', year: 5, name: '五周年纪念', rewardGold: 10000, rewardItems: [{ itemId: 'love_heart', count: 5 }, { itemId: 'couple_ring', count: 1 }] },
    { type: '10year', year: 10, name: '十周年纪念', rewardGold: 50000, rewardItems: [{ itemId: 'love_heart', count: 10 }, { itemId: 'couple_ring', count: 1 }] },
    { type: '20year', year: 20, name: '二十周年纪念', rewardGold: 100000, rewardItems: [{ itemId: 'love_heart', count: 20 }, { itemId: 'couple_ring', count: 1 }] },
    { type: '50year', year: 50, name: '五十周年纪念', rewardGold: 500000, rewardItems: [{ itemId: 'love_heart', count: 50 }, { itemId: 'couple_ring', count: 1 }] },
    { type: '100year', year: 100, name: '百周年纪念', rewardGold: 1000000, rewardItems: [{ itemId: 'love_heart', count: 100 }, { itemId: 'couple_ring', count: 1 }] }
  ],
  // 庆祝持续时间
  celebrationDuration: 7 * 24 * 60 * 60 * 1000  // 7天
}

// 情缘传承配置
export const COUPLE_INHERITANCE_CONFIG = {
  // 传承类型
  inheritanceTypes: [
    {
      type: 'skill',
      name: '技能传承',
      description: '传承仙侣技能给对方',
      maxCount: 3,
      duration: 30 * 24 * 60 * 60 * 1000,  // 30天
      cost: { gold: 10000, items: [{ itemId: 'inheritance_stone', count: 10 }] }
    },
    {
      type: 'attribute',
      name: '属性传承',
      description: '传承部分属性给对方',
      maxCount: 1,
      duration: 0,  // 永久
      cost: { gold: 50000, items: [{ itemId: 'inheritance_stone', count: 50 }] }
    },
    {
      type: 'buff',
      name: 'Buff传承',
      description: '传承增益给对方',
      maxCount: 5,
      duration: 7 * 24 * 60 * 60 * 1000,  // 7天
      cost: { gold: 5000, items: [{ itemId: 'inheritance_stone', count: 5 }] }
    },
    {
      type: 'title',
      name: '称号传承',
      description: '传承专属称号给对方',
      maxCount: 1,
      duration: 0,  // 永久
      cost: { gold: 20000, items: [{ itemId: 'inheritance_stone', count: 20 }] }
    }
  ],
  // 传承进度恢复时间
  progressRecoveryTime: 24 * 60 * 60 * 1000,  // 24小时恢复1%
  // 最大同时传承数
  maxInheritance: 10
}

// 情缘称号列表
export const COUPLE_TITLES: CoupleTitle[] = [
  {
    titleId: 'couple_title_1',
    name: 'Sweetheart',
    nameCN: ' sweet情侣',
    description: '亲密度达到10级',
    type: 'marriage',
    requirement: { type: 'love_level', value: 10 },
    attributes: { attack: 5, defense: 5 },
    isPermanent: true
  },
  {
    titleId: 'couple_title_2',
    name: 'Lover',
    nameCN: '神仙眷侣',
    description: '亲密度达到30级',
    type: 'marriage',
    requirement: { type: 'love_level', value: 30 },
    attributes: { attack: 10, defense: 10, hp: 100 },
    isPermanent: true
  },
  {
    titleId: 'couple_title_3',
    name: 'Soulmates',
    nameCN: '百年好合',
    description: '亲密度达到50级',
    type: 'marriage',
    requirement: { type: 'love_level', value: 50 },
    attributes: { attack: 20, defense: 20, hp: 500, exp: 5 },
    isPermanent: true
  },
  {
    titleId: 'anniversary_title_1',
    name: 'First Anniversary',
    nameCN: '一周年伴侣',
    description: '结婚1周年',
    type: 'anniversary',
    requirement: { type: 'anniversary_year', value: 1 },
    attributes: { attack: 10, defense: 10 },
    isPermanent: true
  },
  {
    titleId: 'anniversary_title_2',
    name: 'Five Anniversary',
    nameCN: '五周年伴侣',
    description: '结婚5周年',
    type: 'anniversary',
    requirement: { type: 'anniversary_year', value: 5 },
    attributes: { attack: 20, defense: 20, hp: 200 },
    isPermanent: true
  },
  {
    titleId: 'anniversary_title_3',
    name: 'Ten Anniversary',
    nameCN: '十周年伴侣',
    description: '结婚10周年',
    type: 'anniversary',
    requirement: { type: 'anniversary_year', value: 10 },
    attributes: { attack: 30, defense: 30, hp: 500, exp: 10 },
    isPermanent: true
  },
  {
    titleId: 'inheritance_title_1',
    name: 'Devoted Partner',
    nameCN: '情深义重',
    description: '完成1次传承',
    type: 'inheritance',
    requirement: { type: 'inheritance_count', value: 1 },
    attributes: { attack: 15, defense: 15 },
    isPermanent: true
  },
  {
    titleId: 'inheritance_title_2',
    name: 'Eternal Bond',
    nameCN: '情定终身',
    description: '完成10次传承',
    type: 'inheritance',
    requirement: { type: 'inheritance_count', value: 10 },
    attributes: { attack: 30, defense: 30, hp: 300, drop: 5 },
    isPermanent: true
  }
]

// 情缘特效列表
export const COUPLE_EFFECTS: CoupleEffect[] = [
  {
    effectId: 'couple_effect_1',
    name: 'Heart Particle',
    nameCN: '爱心粒子',
    type: 'particle',
    requirement: { type: 'love_level', value: 20 },
    isPermanent: true
  },
  {
    effectId: 'couple_effect_2',
    name: 'Love Avatar Frame',
    nameCN: '爱心头像框',
    type: 'avatar_frame',
    requirement: { type: 'love_level', value: 30 },
    isPermanent: true
  },
  {
    effectId: 'couple_effect_3',
    name: 'Wedding Badge',
    nameCN: '婚礼徽章',
    type: 'badge',
    requirement: { type: 'anniversary_year', value: 1 },
    isPermanent: true
  },
  {
    effectId: 'couple_effect_4',
    name: 'Golden Wedding Ring',
    nameCN: '金婚特效',
    type: 'particle',
    requirement: { type: 'anniversary_year', value: 50 },
    isPermanent: true,
    assetUrl: 'effects/golden_wedding'
  }
]

export class CoupleInheritanceSystem {
  private anniversaries: Map<string, MarriageAnniversary[]> = new Map()
  private inheritances: Map<string, CoupleInheritance[]> = new Map()
  private playerTitles: Map<string, CoupleTitle[]> = new Map()
  private playerEffects: Map<string, CoupleEffect[]> = new Map()
  private activities: Map<string, CoupleActivity[]> = new Map()
  private inheritanceProgress: Map<string, number> = new Map()

  // 检查并创建结婚纪念日
  checkAnniversary(coupleId: string, playerAId: string, playerBId: string, marriageTime: number): MarriageAnniversary | null {
    const now = Date.now()
    const marriageYears = Math.floor((now - marriageTime) / (365 * 24 * 60 * 60 * 1000))
    
    if (marriageYears < 1) return null

    // 检查是否已有该年份的纪念日
    const existing = this.anniversaries.get(coupleId) || []
    const hasAnniversary = existing.find(a => a.anniversaryYear === marriageYears)
    
    if (hasAnniversary) return hasAnniversary

    // 查找匹配的纪念日类型
    const config = COUPLE_ANNIVERSARY_CONFIG.anniversaryTypes.find(t => t.year === marriageYears)
    if (!config) return null

    const anniversary: MarriageAnniversary = {
      anniversaryId: `anniversary_${coupleId}_${marriageYears}`,
      coupleId,
      playerAId,
      playerBId,
      anniversaryType: config.type as any,
      anniversaryYear: marriageYears,
      celebrationTime: now,
      rewardsClaimed: false
    }

    existing.push(anniversary)
    this.anniversaries.set(coupleId, existing)

    return anniversary
  }

  // 领取纪念日奖励
  claimAnniversaryReward(coupleId: string, playerId: string): { success: boolean, rewards?: { type: string, itemId?: string, amount: number }[], message: string } {
    const anniversaries = this.anniversaries.get(coupleId) || []
    const unclaimed = anniversaries.find(a => !a.rewardsClaimed && (a.playerAId === playerId || a.playerBId === playerId))
    
    if (!unclaimed) return { success: false, message: '没有可领取的纪念日奖励' }

    const config = COUPLE_ANNIVERSARY_CONFIG.anniversaryTypes.find(t => t.type === unclaimed.anniversaryType)
    if (!config) return { success: false, message: '纪念日配置不存在' }

    unclaimed.rewardsClaimed = true

    const rewards = [
      { type: 'gold', amount: config.rewardGold },
      ...config.rewardItems
    ]

    return {
      success: true,
      rewards,
      message: `恭喜获得${config.name}奖励！`
    }
  }

  // 获取玩家的纪念日列表
  getAnniversaries(coupleId: string): MarriageAnniversary[] {
    return this.anniversaries.get(coupleId) || []
  }

  // 开始传承
  startInheritance(fromPlayerId: string, toPlayerId: string, inheritanceType: 'skill' | 'attribute' | 'buff' | 'title', inheritItems: InheritItem[]): { success: boolean, inheritance?: CoupleInheritance, message: string } {
    const config = COUPLE_INHERITANCE_CONFIG.inheritanceTypes.find(t => t.type === inheritanceType)
    if (!config) return { success: false, message: '无效的传承类型' }

    // 检查传承数量限制
    const playerInheritances = this.inheritances.get(fromPlayerId) || []
    const typeCount = playerInheritances.filter(i => i.inheritanceType === inheritanceType && !i.isCompleted).length
    if (typeCount >= config.maxCount) return { success: false, message: `${config.name}已达上限` }

    const inheritance: CoupleInheritance = {
      inheritanceId: `inheritance_${fromPlayerId}_${Date.now()}`,
      fromPlayerId,
      toPlayerId,
      inheritanceType,
      inheritItems,
      progress: 0,
      isCompleted: false,
      startTime: Date.now()
    }

    playerInheritances.push(inheritance)
    this.inheritances.set(fromPlayerId, playerInheritances)

    return {
      success: true,
      inheritance,
      message: `${config.name}已发起，请等待对方确认`
    }
  }

  // 完成传承
  completeInheritance(playerId: string, inheritanceId: string): { success: boolean, message: string } {
    const inheritances = this.inheritances.get(playerId) || []
    const inheritance = inheritances.find(i => i.inheritanceId === inheritanceId)
    
    if (!inheritance) return { success: false, message: '传承不存在' }
    if (inheritance.isCompleted) return { success: false, message: '传承已完成' }

    inheritance.isCompleted = true
    inheritance.completeTime = Date.now()

    // 根据传承类型处理
    switch (inheritance.inheritanceType) {
      case 'skill':
        // 添加技能
        const skills = this.playerTitles.get(inheritance.toPlayerId) || []
        // 添加逻辑...
        break
      case 'attribute':
        // 添加属性
        break
      case 'buff':
        // 添加Buff
        break
      case 'title':
        // 添加称号
        const titles = this.playerTitles.get(inheritance.toPlayerId) || []
        inheritance.inheritItems.forEach(item => {
          if (item.type === 'title_id') {
            const coupleTitle = COUPLE_TITLES.find(t => t.titleId === item.itemId)
            if (coupleTitle) {
              titles.push(coupleTitle)
            }
          }
        })
        this.playerTitles.set(inheritance.toPlayerId, titles)
        break
    }

    // 更新传承计数
    const key = `${playerId}_${inheritance.inheritanceType}`
    const currentProgress = this.inheritanceProgress.get(key) || 0
    this.inheritanceProgress.set(key, currentProgress + 1)

    return { success: true, message: '传承已完成！' }
  }

  // 获取传承列表
  getInheritances(playerId: string): CoupleInheritance[] {
    return this.inheritances.get(playerId) || []
  }

  // 玩家添加情缘称号
  addCoupleTitle(playerId: string, titleId: string): boolean {
    const title = COUPLE_TITLES.find(t => t.titleId === titleId)
    if (!title) return false

    const playerTitleList = this.playerTitles.get(playerId) || []
    
    // 检查是否已有
    if (playerTitleList.find(t => t.titleId === titleId)) return true
    
    playerTitleList.push(title)
    this.playerTitles.set(playerId, playerTitleList)
    
    return true
  }

  // 获取玩家情缘称号
  getCoupleTitles(playerId: string): CoupleTitle[] {
    return this.playerTitles.get(playerId) || []
  }

  // 玩家添加情缘特效
  addCoupleEffect(playerId: string, effectId: string): boolean {
    const effect = COUPLE_EFFECTS.find(e => e.effectId === effectId)
    if (!effect) return false

    const playerEffectList = this.playerEffects.get(playerId) || []
    
    // 检查是否已有
    if (playerEffectList.find(e => e.effectId === effectId)) return true
    
    playerEffectList.push(effect)
    this.playerEffects.set(playerId, playerEffectList)
    
    return true
  }

  // 获取玩家情缘特效
  getCoupleEffects(playerId: string): CoupleEffect[] {
    return this.playerEffects.get(playerId) || []
  }

  // 检查并自动解锁称号和特效
  checkAndUnlockTitlesAndEffects(playerId: string, loveLevel: number, anniversaryYears: number, inheritanceCount: number): { newTitles: CoupleTitle[], newEffects: CoupleEffect[] } {
    const newTitles: CoupleTitle[] = []
    const newEffects: CoupleEffect[] = []

    // 检查称号
    COUPLE_TITLES.forEach(title => {
      let unlocked = false
      
      switch (title.requirement.type) {
        case 'love_level':
          unlocked = loveLevel >= title.requirement.value
          break
        case 'anniversary_year':
          unlocked = anniversaryYears >= title.requirement.value
          break
        case 'inheritance_count':
          unlocked = inheritanceCount >= title.requirement.value
          break
      }

      if (unlocked) {
        if (this.addCoupleTitle(playerId, title.titleId)) {
          newTitles.push(title)
        }
      }
    })

    // 检查特效
    COUPLE_EFFECTS.forEach(effect => {
      let unlocked = false
      
      switch (effect.requirement.type) {
        case 'love_level':
          unlocked = loveLevel >= effect.requirement.value
          break
        case 'anniversary_year':
          unlocked = anniversaryYears >= effect.requirement.value
          break
        case 'achievement':
          // 检查成就
          break
      }

      if (unlocked) {
        if (this.addCoupleEffect(playerId, effect.effectId)) {
          newEffects.push(effect)
        }
      }
    })

    return { newTitles, newEffects }
  }

  // 获取称号属性加成
  getTitleAttributes(playerId: string): { attack: number, defense: number, hp: number, exp: number, drop: number } {
    const titles = this.getCoupleTitles(playerId)
    
    const attributes = {
      attack: 0,
      defense: 0,
      hp: 0,
      exp: 0,
      drop: 0
    }

    titles.forEach(title => {
      attributes.attack += title.attributes.attack || 0
      attributes.defense += title.attributes.defense || 0
      attributes.hp += title.attributes.hp || 0
      attributes.exp += title.attributes.exp || 0
      attributes.drop += title.attributes.drop || 0
    })

    return attributes
  }
}

export default CoupleInheritanceSystem
