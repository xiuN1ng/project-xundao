// 仙界主线任务系统

export interface Quest {
  questId: string
  name: string
  nameCN: string
  description: string
  type: 'main' | 'side' | 'daily' | 'weekly'
  level: number
  realmRequirement?: string // 需要的境界
  requirements: QuestRequirement[]
  rewards: QuestReward[]
  nextQuestId?: string // 下一个任务
  timeLimit?: number // 时限(毫秒)
}

export interface QuestRequirement {
  type: 'kill' | 'collect' | 'talk' | 'reach' | 'cultivate' | 'craft' | 'venture' | 'pvp'
  targetId: string
  targetName: string
  targetNameCN: string
  count: number
  progress: number // 当前进度
}

export interface QuestReward {
  type: 'cultivation_exp' | 'spirit_stone' | 'item' | 'realm_exp' | 'title'
  itemId?: string
  value: number
  itemNameCN?: string
}

export interface PlayerQuestData {
  playerId: string
  completedQuests: string[]
  currentQuests: Map<string, { questId: string; startTime: number; progress: Map<string, number> }>
  questHistory: Map<string, { questId: string; completedTime: number }>
}

// 仙界主线任务
export const IMMORTAL_QUESTS: Quest[] = [
  // ========== 第一章：凡人篇 ==========
  {
    questId: 'ch1_quest_1',
    name: 'First Step',
    nameCN: '第一步',
    description: '开始你的修仙之路',
    type: 'main',
    level: 1,
    requirements: [
      { type: 'cultivate', targetId: 'cultivation', targetName: 'Cultivation', targetNameCN: '修炼', count: 100, progress: 0 }
    ],
    rewards: [
      { type: 'cultivation_exp', value: 200 },
      { type: 'spirit_stone', value: 100 }
    ],
    nextQuestId: 'ch1_quest_2'
  },
  {
    questId: 'ch1_quest_2',
    name: 'Gathering Herbs',
    nameCN: '采集药材',
    description: '前往灵气洞穴采集药材',
    type: 'main',
    level: 5,
    requirements: [
      { type: 'collect', targetId: 'lingzhi', targetName: 'Lingzhi', targetNameCN: '灵芝', count: 5, progress: 0 },
      { type: 'venture', targetId: 'spirit_cave', targetName: 'Spirit Cave', targetNameCN: '灵气洞穴', count: 1, progress: 0 }
    ],
    rewards: [
      { type: 'cultivation_exp', value: 500 },
      { type: 'spirit_stone', value: 200 }
    ],
    nextQuestId: 'ch1_quest_3'
  },
  {
    questId: 'ch1_quest_3',
    name: 'First Alchemy',
    nameCN: '初次炼丹',
    description: '学习炼丹之术',
    type: 'main',
    level: 8,
    requirements: [
      { type: 'craft', targetId: 'qi_boost_low', targetName: 'Qi Boost Pill', targetNameCN: '聚气丹', count: 1, progress: 0 }
    ],
    rewards: [
      { type: 'cultivation_exp', value: 800 },
      { type: 'item', itemId: 'qi_boost_low', value: 3, itemNameCN: '聚气丹' }
    ],
    nextQuestId: 'ch1_quest_4'
  },
  {
    questId: 'ch1_quest_4',
    name: 'Forest Adventure',
    nameCN: '森林探险',
    description: '前往幽暗森林探险',
    type: 'main',
    level: 15,
    realmRequirement: 'mortal',
    requirements: [
      { type: 'venture', targetId: 'dark_forest', targetName: 'Dark Forest', targetNameCN: '幽暗森林', count: 3, progress: 0 }
    ],
    rewards: [
      { type: 'cultivation_exp', value: 1500 },
      { type: 'spirit_stone', value: 500 },
      { type: 'item', itemId: 'xianlingpi', value: 2, itemNameCN: '仙灵脾' }
    ],
    nextQuestId: 'ch1_quest_5'
  },
  {
    questId: 'ch1_quest_5',
    name: 'Breakthrough to Foundation',
    nameCN: '筑基',
    description: '突破到筑基期',
    type: 'main',
    level: 20,
    requirements: [
      { type: 'cultivate', targetId: 'cultivation', targetName: 'Cultivation', targetNameCN: '修炼', count: 3000, progress: 0 }
    ],
    rewards: [
      { type: 'cultivation_exp', value: 3000 },
      { type: 'spirit_stone', value: 1000 },
      { type: 'title', value: 1, itemNameCN: '筑基修士' }
    ],
    nextQuestId: 'ch2_quest_1'
  },
  
  // ========== 第二章：修仙篇 ==========
  {
    questId: 'ch2_quest_1',
    name: 'Abyss Exploration',
    nameCN: '深渊探索',
    description: '探索深渊洞穴',
    type: 'main',
    level: 35,
    realmRequirement: 'mortal',
    requirements: [
      { type: 'venture', targetId: 'abyss_cave', targetName: 'Abyss Cave', targetNameCN: '深渊洞穴', count: 5, progress: 0 },
      { type: 'kill', targetId: 'demon', targetName: 'Demon', targetNameCN: '妖魔', count: 10, progress: 0 }
    ],
    rewards: [
      { type: 'cultivation_exp', value: 5000 },
      { type: 'spirit_stone', value: 2000 },
      { type: 'item', itemId: 'cangzhuo', value: 2, itemNameCN: '苍卓' }
    ],
    nextQuestId: 'ch2_quest_2'
  },
  {
    questId: 'ch2_quest_2',
    name: 'Alchemy Mastery',
    nameCN: '炼丹精通',
    description: '提升炼丹术',
    type: 'main',
    level: 40,
    requirements: [
      { type: 'craft', targetId: 'qi_boost_mid', targetName: 'Qi Boost Pill (Mid)', targetNameCN: '聚气丹(中)', count: 5, progress: 0 }
    ],
    rewards: [
      { type: 'cultivation_exp', value: 4000 },
      { type: 'realm_exp', value: 500 }
    ],
    nextQuestId: 'ch2_quest_3'
  },
  {
    questId: 'ch2_quest_3',
    name: 'Breakthrough to Nascent Soul',
    nameCN: '结婴',
    description: '突破到元婴期',
    type: 'main',
    level: 50,
    requirements: [
      { type: 'cultivate', targetId: 'cultivation', targetName: 'Cultivation', targetNameCN: '修炼', count: 100000, progress: 0 }
    ],
    rewards: [
      { type: 'cultivation_exp', value: 10000 },
      { type: 'spirit_stone', value: 5000 },
      { type: 'title', value: 1, itemNameCN: '元婴真人' }
    ],
    nextQuestId: 'ch3_quest_1'
  },
  
  // ========== 第三章：仙人篇 ==========
  {
    questId: 'ch3_quest_1',
    name: 'Ascension',
    nameCN: '飞升',
    description: '渡劫飞升，成为仙人',
    type: 'main',
    level: 70,
    requirements: [
      { type: 'cultivate', targetId: 'cultivation', targetName: 'Cultivation', targetNameCN: '修炼', count: 500000, progress: 0 },
      { type: 'venture', targetId: 'demon_abyss', targetName: 'Demon Abyss', targetNameCN: '魔渊', count: 10, progress: 0 }
    ],
    rewards: [
      { type: 'cultivation_exp', value: 20000 },
      { type: 'spirit_stone', value: 10000 },
      { type: 'realm_exp', value: 500000 },
      { type: 'title', value: 1, itemNameCN: '真仙' }
    ],
    nextQuestId: 'ch3_quest_2'
  },
  {
    questId: 'ch3_quest_2',
    name: 'True Immortal',
    nameCN: '真仙境',
    description: '修炼到真仙境',
    type: 'main',
    level: 80,
    realmRequirement: 'immortal',
    requirements: [
      { type: 'cultivate', targetId: 'cultivation', targetName: 'Cultivation', targetNameCN: '修炼', count: 1000000, progress: 0 }
    ],
    rewards: [
      { type: 'cultivation_exp', value: 30000 },
      { type: 'realm_exp', value: 800000 },
      { type: 'title', value: 1, itemNameCN: '真仙' }
    ],
    nextQuestId: 'ch4_quest_1'
  },
  
  // ========== 第四章：金仙篇 ==========
  {
    questId: 'ch4_quest_1',
    name: 'Golden Transformation',
    nameCN: '金身',
    description: '成就金仙',
    type: 'main',
    level: 105,
    realmRequirement: 'golden_immortal',
    requirements: [
      { type: 'cultivate', targetId: 'cultivation', targetName: 'Cultivation', targetNameCN: '修炼', count: 15000000, progress: 0 },
      { type: 'kill', targetId: 'demon_lord', targetName: 'Demon Lord', targetNameCN: '魔君', count: 50, progress: 0 }
    ],
    rewards: [
      { type: 'cultivation_exp', value: 50000 },
      { type: 'realm_exp', value: 5000000 },
      { type: 'title', value: 1, itemNameCN: '金仙' }
    ],
    nextQuestId: 'ch5_quest_1'
  },
  
  // ========== 第五章：大罗金仙 ==========
  {
    questId: 'ch5_quest_1',
    name: 'Daluo Realm',
    nameCN: '大罗境',
    description: '突破到大罗金仙',
    type: 'main',
    level: 130,
    realmRequirement: 'daluo',
    requirements: [
      { type: 'cultivate', targetId: 'cultivation', targetName: 'Cultivation', targetNameCN: '修炼', count: 120000000, progress: 0 }
    ],
    rewards: [
      { type: 'cultivation_exp', value: 100000 },
      { type: 'realm_exp', value: 20000000 },
      { type: 'title', value: 1, itemNameCN: '大罗金仙' }
    ]
  }
]

export const QUEST_CONFIG = {
  // 最大同时进行的任务数
  maxConcurrentQuests: 10,
  
  // 任务刷新时间
  refreshTime: {
    daily: '00:00', // 每日刷新
    weekly: 'Monday 00:00' // 每周刷新
  },
  
  // 放弃任务惩罚
  abandonPenalty: {
    // 惩罚时间 (小时)
    lockoutHours: 2,
    // 减少声望
    reputationLoss: 10
  },
  
  // 任务追踪
  tracking: {
    enabled: true,
    maxTracked: 5
  }
}

export class ImmortalQuestSystem {
  private playerData: Map<string, PlayerQuestData> = new Map()
  
  // 获取玩家数据
  getPlayerData(playerId: string): PlayerQuestData {
    if (this.playerData.has(playerId)) {
      return this.playerData.get(playerId)!
    }
    
    const newData: PlayerQuestData = {
      playerId,
      completedQuests: [],
      currentQuests: new Map(),
      questHistory: new Map()
    }
    
    this.playerData.set(playerId, newData)
    return newData
  }
  
  // 获取任务信息
  getQuest(questId: string): Quest | null {
    return IMMORTAL_QUESTS.find(q => q.questId === questId) || null
  }
  
  // 获取可接任务
  getAvailableQuests(playerId: string, playerLevel: number, playerRealm: string): Quest[] {
    const data = this.getPlayerData(playerId)
    const available: Quest[] = []
    
    for (const quest of IMMORTAL_QUESTS) {
      // 已完成的跳过
      if (data.completedQuests.includes(quest.questId)) continue
      
      // 已接取的跳过
      if (data.currentQuests.has(quest.questId)) continue
      
      // 等级不够跳过
      if (quest.level > playerLevel) continue
      
      // 境界要求
      if (quest.realmRequirement) {
        const realmOrder = this.getRealmOrder(playerRealm)
        const requiredOrder = this.getRealmOrder(quest.realmRequirement)
        if (realmOrder < requiredOrder) continue
      }
      
      // 检查前置任务
      if (quest.requirements.length > 0) {
        const firstReq = quest.requirements[0]
        // 如果是章节第一条任务，检查前置任务是否完成
        if (!data.completedQuests.includes(quest.questId.replace(/ch\d+_/, 'ch' + (this.getChapterFromQuest(quest.questId) - 1) + '_'))) {
          // 简化：检查上一章最后一quest是否完成
        }
      }
      
      available.push(quest)
    }
    
    return available
  }
  
  private getChapterFromQuest(questId: string): number {
    const match = questId.match(/ch(\d+)/)
    return match ? parseInt(match[1]) : 1
  }
  
  private getRealmOrder(realmId: string): number {
    const orders: { [key: string]: number } = {
      'mortal': 0,
      'immortal': 1,
      'golden_immortal': 2,
      'daluo': 3,
      'quasi_saint': 4,
      'saint': 5,
      'dao_ancestor': 6
    }
    return orders[realmId] || 0
  }
  
  // 接受任务
  acceptQuest(playerId: string, questId: string): { success: boolean; message: string } {
    const quest = this.getQuest(questId)
    if (!quest) {
      return { success: false, message: '任务不存在' }
    }
    
    const data = this.getPlayerData(playerId)
    
    // 已完成
    if (data.completedQuests.includes(questId)) {
      return { success: false, message: '任务已完成' }
    }
    
    // 已接取
    if (data.currentQuests.has(questId)) {
      return { success: false, message: '任务已接取' }
    }
    
    // 任务数量限制
    if (data.currentQuests.size >= QUEST_CONFIG.maxConcurrentQuests) {
      return { success: false, message: '任务数量已达上限' }
    }
    
    // 接受任务
    const progress = new Map<string, number>()
    for (const req of quest.requirements) {
      progress.set(req.targetId, 0)
    }
    
    data.currentQuests.set(questId, {
      questId,
      startTime: Date.now(),
      progress
    })
    
    return { success: true, message: `接受任务：${quest.nameCN}` }
  }
  
  // 更新任务进度
  updateProgress(playerId: string, type: string, targetId: string, amount: number = 1): void {
    const data = this.getPlayerData(playerId)
    
    for (const [questId, questData] of data.currentQuests) {
      const quest = this.getQuest(questId)
      if (!quest) continue
      
      for (const req of quest.requirements) {
        if (req.type === type && req.targetId === targetId) {
          const current = questData.progress.get(targetId) || 0
          questData.progress.set(targetId, current + amount)
        }
      }
    }
  }
  
  // 检查任务是否完成
  checkQuestCompletion(playerId: string, questId: string): { completed: boolean; quest?: Quest } {
    const data = this.getPlayerData(playerId)
    const questData = data.currentQuests.get(questId)
    const quest = this.getQuest(questId)
    
    if (!questData || !quest) {
      return { completed: false }
    }
    
    for (const req of quest.requirements) {
      const progress = questData.progress.get(req.targetId) || 0
      if (progress < req.count) {
        return { completed: false }
      }
    }
    
    return { completed: true, quest }
  }
  
  // 提交任务
  completeQuest(playerId: string, questId: string): {
    success: boolean
    rewards?: QuestReward[]
    message: string
    nextQuestId?: string
  } {
    const data = this.getPlayerData(playerId)
    const questData = data.currentQuests.get(questId)
    const quest = this.getQuest(questId)
    
    if (!questData || !quest) {
      return { success: false, message: '任务不存在或未接取' }
    }
    
    // 检查完成条件
    const check = this.checkQuestCompletion(playerId, questId)
    if (!check.completed) {
      return { success: false, message: '任务未完成' }
    }
    
    // 完成任务
    data.completedQuests.push(questId)
    data.currentQuests.delete(questId)
    data.questHistory.set(questId, { questId, completedTime: Date.now() })
    
    return {
      success: true,
      rewards: quest.rewards,
      message: `完成任务：${quest.nameCN}`,
      nextQuestId: quest.nextQuestId
    }
  }
  
  // 获取当前任务列表
  getCurrentQuests(playerId: string): { questId: string; quest: Quest; progress: Map<string, number> }[] {
    const data = this.getPlayerData(playerId)
    const result: { questId: string; quest: Quest; progress: Map<string, number> }[] = []
    
    for (const [questId, questData] of data.currentQuests) {
      const quest = this.getQuest(questId)
      if (quest) {
        result.push({
          questId,
          quest,
          progress: questData.progress
        })
      }
    }
    
    return result
  }
  
  // 获取任务进度
  getQuestProgress(playerId: string, questId: string): Map<string, number> | null {
    const data = this.getPlayerData(playerId)
    const questData = data.currentQuests.get(questId)
    return questData?.progress || null
  }
  
  // 放弃任务
  abandonQuest(playerId: string, questId: string): { success: boolean; message: string } {
    const data = this.getPlayerData(playerId)
    
    if (!data.currentQuests.has(questId)) {
      return { success: false, message: '任务不存在' }
    }
    
    data.currentQuests.delete(questId)
    
    return { success: true, message: '已放弃任务' }
  }
  
  // 获取玩家任务统计
  getQuestStats(playerId: string): {
    completedCount: number
    currentCount: number
    chapterProgress: { [chapter: number]: number }
  } {
    const data = this.getPlayerData(playerId)
    const chapterProgress: { [chapter: number]: number } = {}
    
    for (const questId of data.completedQuests) {
      const chapter = this.getChapterFromQuest(questId)
      chapterProgress[chapter] = (chapterProgress[chapter] || 0) + 1
    }
    
    return {
      completedCount: data.completedQuests.length,
      currentCount: data.currentQuests.size,
      chapterProgress
    }
  }
}

export const questSystem = new ImmortalQuestSystem()
