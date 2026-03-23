// 每日任务系统 - 任务刷新与加速功能
// 包含：任务刷新机制、任务加速功能

export interface DailyQuest {
  questId: string
  name: string
  nameCN: string
  description: string
  type: 'combat' | 'resource' | 'social' | 'collection' | 'craft'
  difficulty: 'easy' | 'normal' | 'hard' | 'epic'
  requirements: {
    targetId: string
    targetName: string
    targetNameCN: string
    count: number
  }
  rewards: {
    exp: number
    gold: number
    contribution?: number  // 师徒贡献度
    items?: Array<{ itemId: string; itemNameCN: string; count: number }>
  }
  // 刷新相关
  refreshType: 'daily' | 'weekly'
  // 加速相关
  speedUpEnabled: boolean
  speedUpCost?: {
    type: 'gold' | 'item'
    amount: number
    itemId?: string
  }
}

export interface PlayerDailyQuest {
  questId: string
  playerId: string
  progress: number
  completed: boolean
  claimed: boolean
  assignedTime: number  // 任务分配时间
  completeTime?: number
  // 加速状态
  speedUpUsed: boolean
  speedUpEndTime?: number
}

export interface DailyQuestConfig {
  // 每日任务数量
  dailyQuestCount: number
  // 每周任务数量
  weeklyQuestCount: number
  // 刷新时间
  refreshTime: {
    daily: string    // 每日刷新时间 "00:00"
    weekly: string   // 每周刷新时间 "Monday 00:00"
  }
  // 加速配置
  speedUp: {
    enabled: boolean
    // 免费加速次数
    freeSpeedUps: number
    // 元宝加速费用 (每任务)
    goldCostPerQuest: number
    // 道具加速
    itemId?: string
    itemCostPerQuest?: number
    // 加速时间 (毫秒)
    duration: number
  }
  // 刷新费用
  refreshCost: {
    freeRefreshCount: number
    goldCostPerRefresh: number
  }
}

// 每日任务配置
export const DAILY_QUEST_CONFIG: DailyQuestConfig = {
  dailyQuestCount: 5,
  weeklyQuestCount: 3,
  refreshTime: {
    daily: '00:00',
    weekly: 'Monday 00:00'
  },
  speedUp: {
    enabled: true,
    freeSpeedUps: 1,
    goldCostPerQuest: 50,
    duration: 60 * 60 * 1000  // 1小时
  },
  refreshCost: {
    freeRefreshCount: 1,
    goldCostPerRefresh: 100
  }
}

// 每日任务库
export const DAILY_QUESTS: DailyQuest[] = [
  // 战斗类
  {
    questId: 'daily_combat_1',
    name: 'Daily Combat I',
    nameCN: '日常修炼I',
    description: '完成1次战斗',
    type: 'combat',
    difficulty: 'easy',
    requirements: { targetId: 'battle', targetName: 'Battle', targetNameCN: '战斗', count: 1 },
    rewards: { exp: 50, gold: 30 },
    refreshType: 'daily',
    speedUpEnabled: true,
    speedUpCost: { type: 'gold', amount: 20 }
  },
  {
    questId: 'daily_combat_3',
    name: 'Daily Combat III',
    nameCN: '日常修炼III',
    description: '完成3次战斗',
    type: 'combat',
    difficulty: 'normal',
    requirements: { targetId: 'battle', targetName: 'Battle', targetNameCN: '战斗', count: 3 },
    rewards: { exp: 150, gold: 80 },
    refreshType: 'daily',
    speedUpEnabled: true,
    speedUpCost: { type: 'gold', amount: 40 }
  },
  {
    questId: 'daily_combat_10',
    name: 'Daily Combat X',
    nameCN: '日常修炼X',
    description: '完成10次战斗',
    type: 'combat',
    difficulty: 'hard',
    requirements: { targetId: 'battle', targetName: 'Battle', targetNameCN: '战斗', count: 10 },
    rewards: { exp: 500, gold: 250, contribution: 20 },
    refreshType: 'daily',
    speedUpEnabled: true,
    speedUpCost: { type: 'gold', amount: 100 }
  },
  // 资源类
  {
    questId: 'daily_resource_1000',
    name: 'Resource Collection I',
    nameCN: '资源收集I',
    description: '收集1000灵气',
    type: 'resource',
    difficulty: 'easy',
    requirements: { targetId: 'spirit', targetName: 'Spirit', targetNameCN: '灵气', count: 1000 },
    rewards: { exp: 80, gold: 50 },
    refreshType: 'daily',
    speedUpEnabled: true,
    speedUpCost: { type: 'gold', amount: 30 }
  },
  {
    questId: 'daily_resource_5000',
    name: 'Resource Collection II',
    nameCN: '资源收集II',
    description: '收集5000灵气',
    type: 'resource',
    difficulty: 'normal',
    requirements: { targetId: 'spirit', targetName: 'Spirit', targetNameCN: '灵气', count: 5000 },
    rewards: { exp: 200, gold: 120 },
    refreshType: 'daily',
    speedUpEnabled: true,
    speedUpCost: { type: 'gold', amount: 60 }
  },
  // 社交类
  {
    questId: 'daily_social_friend',
    name: 'Make Friends',
    nameCN: '结交好友',
    description: '添加1个好友',
    type: 'social',
    difficulty: 'easy',
    requirements: { targetId: 'friend', targetName: 'Friend', targetNameCN: '好友', count: 1 },
    rewards: { exp: 50, gold: 30 },
    refreshType: 'daily',
    speedUpEnabled: true,
    speedUpCost: { type: 'gold', amount: 20 }
  },
  {
    questId: 'daily_social_chat',
    name: 'Social Butterfly',
    nameCN: '社交达人',
    description: '发送10条聊天消息',
    type: 'social',
    difficulty: 'normal',
    requirements: { targetId: 'chat', targetName: 'Chat', targetNameCN: '聊天', count: 10 },
    rewards: { exp: 100, gold: 60 },
    refreshType: 'daily',
    speedUpEnabled: true,
    speedUpCost: { type: 'gold', amount: 30 }
  },
  // 收集类
  {
    questId: 'daily_collection_herb',
    name: 'Herb Collector',
    nameCN: '草药采集',
    description: '采集10份草药',
    type: 'collection',
    difficulty: 'easy',
    requirements: { targetId: 'herb', targetName: 'Herb', targetNameCN: '草药', count: 10 },
    rewards: { exp: 80, gold: 50, items: [{ itemId: 'herb', itemNameCN: '草药', count: 5 }] },
    refreshType: 'daily',
    speedUpEnabled: true,
    speedUpCost: { type: 'gold', amount: 25 }
  },
  // 制作类
  {
    questId: 'daily_craft_pill',
    name: 'Alchemy Apprentice',
    nameCN: '炼丹学徒',
    description: '炼制1颗丹药',
    type: 'craft',
    difficulty: 'easy',
    requirements: { targetId: 'pill', targetName: 'Pill', targetNameCN: '丹药', count: 1 },
    rewards: { exp: 100, gold: 60 },
    refreshType: 'daily',
    speedUpEnabled: true,
    speedUpCost: { type: 'gold', amount: 30 }
  },
  // 每周任务
  {
    questId: 'weekly_boss_1',
    name: 'Weekly Boss',
    nameCN: '讨伐BOSS',
    description: '击败1个世界BOSS',
    type: 'combat',
    difficulty: 'epic',
    requirements: { targetId: 'world_boss', targetName: 'World Boss', targetNameCN: '世界BOSS', count: 1 },
    rewards: { exp: 1000, gold: 500, contribution: 50 },
    refreshType: 'weekly',
    speedUpEnabled: false
  },
  {
    questId: 'weekly_arena_10',
    name: 'Arena Champion',
    nameCN: '竞技场王者',
    description: '在竞技场获得10场胜利',
    type: 'combat',
    difficulty: 'hard',
    requirements: { targetId: 'arena_win', targetName: 'Arena Win', targetNameCN: '竞技场胜利', count: 10 },
    rewards: { exp: 800, gold: 400, contribution: 30 },
    refreshType: 'weekly',
    speedUpEnabled: false
  },
  {
    questId: 'weekly_dungeon_5',
    name: 'Dungeon Master',
    nameCN: '副本大师',
    description: '通关5次副本',
    type: 'combat',
    difficulty: 'hard',
    requirements: { targetId: 'dungeon', targetName: 'Dungeon', targetNameCN: '副本', count: 5 },
    rewards: { exp: 600, gold: 300, contribution: 25 },
    refreshType: 'weekly',
    speedUpEnabled: false
  }
]

export class DailyQuestSystem {
  private config: DailyQuestConfig
  private playerQuests: Map<string, PlayerDailyQuest[]> = new Map()
  private playerRefreshCount: Map<string, { daily: number; weekly: number; lastRefreshDate: string }> = new Map()
  private playerSpeedUpCount: Map<string, number> = new Map()  // 免费加速次数

  constructor(config: Partial<DailyQuestConfig> = {}) {
    this.config = { ...DAILY_QUEST_CONFIG, ...config }
  }

  // 初始化玩家每日任务
  initPlayerQuests(playerId: string): PlayerDailyQuest[] {
    const quests: PlayerDailyQuest[] = []
    
    // 随机抽取每日任务
    const dailyQuests = this.getRandomQuests('daily', this.config.dailyQuestCount)
    for (const quest of dailyQuests) {
      quests.push({
        questId: quest.questId,
        playerId,
        progress: 0,
        completed: false,
        claimed: false,
        assignedTime: Date.now(),
        speedUpUsed: false
      })
    }

    // 随机抽取每周任务
    const weeklyQuests = this.getRandomQuests('weekly', this.config.weeklyQuestCount)
    for (const quest of weeklyQuests) {
      quests.push({
        questId: quest.questId,
        playerId,
        progress: 0,
        completed: false,
        claimed: false,
        assignedTime: Date.now(),
        speedUpUsed: false
      })
    }

    this.playerQuests.set(playerId, quests)
    this.playerRefreshCount.set(playerId, { daily: 0, weekly: 0, lastRefreshDate: this.getTodayDate() })
    this.playerSpeedUpCount.set(playerId, this.config.speedUp.freeSpeedUps)

    return quests
  }

  // 随机获取任务
  private getRandomQuests(refreshType: 'daily' | 'weekly', count: number): DailyQuest[] {
    const pool = DAILY_QUESTS.filter(q => q.refreshType === refreshType)
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, count)
  }

  // 获取今日日期字符串
  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0]
  }

  // 检查是否需要刷新任务
  checkAndRefresh(playerId: string): { refreshed: boolean; message: string } {
    const today = this.getTodayDate()
    const refreshData = this.playerRefreshCount.get(playerId)

    if (!refreshData) {
      // 首次初始化
      this.initPlayerQuests(playerId)
      return { refreshed: true, message: '已初始化每日任务' }
    }

    // 检查是否跨天
    if (refreshData.lastRefreshDate !== today) {
      // 新的一天，重置刷新次数
      refreshData.daily = 0
      refreshData.weekly = 0
      refreshData.lastRefreshDate = today
      
      // 重置免费加速次数
      this.playerSpeedUpCount.set(playerId, this.config.speedUp.freeSpeedUps)

      // 刷新每日任务
      const quests = this.playerQuests.get(playerId)
      if (quests) {
        // 移除旧每日任务
        const newQuests = quests.filter(q => {
          const quest = this.getQuest(q.questId)
          return quest?.refreshType !== 'daily'
        })

        // 添加新每日任务
        const dailyQuests = this.getRandomQuests('daily', this.config.dailyQuestCount)
        for (const quest of dailyQuests) {
          newQuests.push({
            questId: quest.questId,
            playerId,
            progress: 0,
            completed: false,
            claimed: false,
            assignedTime: Date.now(),
            speedUpUsed: false
          })
        }

        this.playerQuests.set(playerId, newQuests)
      }

      return { refreshed: true, message: '每日任务已刷新' }
    }

    return { refreshed: false, message: '今日任务已存在' }
  }

  // 手动刷新任务
  refreshQuests(playerId: string, useGold: boolean = true): { success: boolean; message: string; cost?: number } {
    const refreshData = this.playerRefreshCount.get(playerId)
    if (!refreshData) {
      return { success: false, message: '请先初始化任务' }
    }

    const today = this.getTodayDate()
    const freeCount = this.config.refreshCost.freeRefreshCount
    const goldCost = this.config.refreshCost.goldCostPerRefresh

    // 检查免费刷新次数
    if (refreshData.daily < freeCount) {
      refreshData.daily++
      this.refreshDailyQuests(playerId)
      return { success: true, message: `免费刷新成功，剩余${freeCount - refreshData.daily}次` }
    }

    // 检查元宝
    if (useGold) {
      // TODO: 检查玩家元宝
      // 简化处理：直接消耗
      this.refreshDailyQuests(playerId)
      return { success: true, message: `元宝刷新成功，消耗${goldCost}元宝`, cost: goldCost }
    }

    return { success: false, message: `免费刷新次数已用完，需要${goldCost}元宝` }
  }

  // 刷新每日任务
  private refreshDailyQuests(playerId: string): void {
    const quests = this.playerQuests.get(playerId)
    if (!quests) return

    // 保留每周任务，只刷新每日任务
    const weeklyQuests = quests.filter(q => {
      const quest = this.getQuest(q.questId)
      return quest?.refreshType === 'weekly'
    })

    // 生成新的每日任务
    const dailyQuests = this.getRandomQuests('daily', this.config.dailyQuestCount)
    for (const quest of dailyQuests) {
      weeklyQuests.push({
        questId: quest.questId,
        playerId,
        progress: 0,
        completed: false,
        claimed: false,
        assignedTime: Date.now(),
        speedUpUsed: false
      })
    }

    this.playerQuests.set(playerId, weeklyQuests)
  }

  // 获取任务配置
  getQuest(questId: string): DailyQuest | null {
    return DAILY_QUESTS.find(q => q.questId === questId) || null
  }

  // 获取玩家任务列表
  getPlayerQuests(playerId: string, refreshIfNeeded: boolean = true): PlayerDailyQuest[] {
    if (refreshIfNeeded) {
      this.checkAndRefresh(playerId)
    }

    const quests = this.playerQuests.get(playerId)
    if (!quests) {
      return this.initPlayerQuests(playerId)
    }
    return quests
  }

  // 更新任务进度
  updateProgress(playerId: string, targetType: string, targetId: string, amount: number = 1): { questId: string; completed: boolean }[] {
    const quests = this.playerQuests.get(playerId)
    if (!quests) return []

    const results: { questId: string; completed: boolean }[] = []

    for (const pq of quests) {
      // 已完成或已领取的跳过
      if (pq.completed || pq.claimed) continue

      const quest = this.getQuest(pq.questId)
      if (!quest || quest.type !== targetType) continue

      if (quest.requirements.targetId === targetId) {
        pq.progress += amount

        if (pq.progress >= quest.requirements.count) {
          pq.completed = true
          pq.completeTime = Date.now()
        }

        results.push({ questId: pq.questId, completed: pq.completed })
      }
    }

    return results
  }

  // 完成任务并领取奖励
  completeQuest(playerId: string, questId: string): { success: boolean; rewards?: any; message: string } {
    const quests = this.playerQuests.get(playerId)
    if (!quests) {
      return { success: false, message: '任务不存在' }
    }

    const pq = quests.find(q => q.questId === questId)
    if (!pq) {
      return { success: false, message: '任务不存在' }
    }

    if (!pq.completed) {
      return { success: false, message: '任务未完成' }
    }

    if (pq.claimed) {
      return { success: false, message: '奖励已领取' }
    }

    const quest = this.getQuest(questId)
    if (!quest) {
      return { success: false, message: '任务配置错误' }
    }

    pq.claimed = true

    return {
      success: true,
      rewards: quest.rewards,
      message: `完成任务：${quest.nameCN}`
    }
  }

  // 任务加速
  speedUpQuest(playerId: string, questId: string): { success: boolean; message: string; cost?: number; endTime?: number } {
    const quests = this.playerQuests.get(playerId)
    if (!quests) {
      return { success: false, message: '任务不存在' }
    }

    const pq = quests.find(q => q.questId === questId)
    if (!pq) {
      return { success: false, message: '任务不存在' }
    }

    const quest = this.getQuest(questId)
    if (!quest) {
      return { success: false, message: '任务配置错误' }
    }

    if (!quest.speedUpEnabled) {
      return { success: false, message: '该任务不支持加速' }
    }

    if (pq.completed || pq.claimed) {
      return { success: false, message: '任务已完成' }
    }

    if (pq.speedUpUsed) {
      return { success: false, message: '任务已加速' }
    }

    const speedUpCount = this.playerSpeedUpCount.get(playerId) || 0
    const cost = quest.speedUpCost

    // 尝试使用免费加速
    if (speedUpCount > 0 && cost) {
      this.playerSpeedUpCount.set(playerId, speedUpCount - 1)
      pq.speedUpUsed = true
      pq.speedUpEndTime = Date.now() + this.config.speedUp.duration
      
      return {
        success: true,
        message: `免费加速成功，剩余${speedUpCount - 1}次免费加速`,
        endTime: pq.speedUpEndTime
      }
    }

    // 使用元宝加速
    if (cost && cost.type === 'gold') {
      // TODO: 扣除元宝
      pq.speedUpUsed = true
      pq.speedUpEndTime = Date.now() + this.config.speedUp.duration
      
      return {
        success: true,
        message: `元宝加速成功，消耗${cost.amount}元宝`,
        cost: cost.amount,
        endTime: pq.speedUpEndTime
      }
    }

    return { success: false, message: '加速条件不足' }
  }

  // 检查加速状态并自动完成
  checkSpeedUpComplete(playerId: string, questId: string): boolean {
    const quests = this.playerQuests.get(playerId)
    if (!quests) return false

    const pq = quests.find(q => q.questId === questId)
    if (!pq || !pq.speedUpUsed || !pq.speedUpEndTime) return false

    if (Date.now() >= pq.speedUpEndTime && !pq.completed) {
      // 加速时间到，自动完成
      pq.completed = true
      pq.completeTime = Date.now()
      return true
    }

    return false
  }

  // 获取玩家免费加速次数
  getFreeSpeedUpCount(playerId: string): number {
    return this.playerSpeedUpCount.get(playerId) || 0
  }

  // 获取任务进度详情
  getQuestProgress(playerId: string, questId: string): { progress: number; total: number; completed: boolean; claimed: boolean; speedUpEndTime?: number } | null {
    const quests = this.playerQuests.get(playerId)
    if (!quests) return null

    const pq = quests.find(q => q.questId === questId)
    if (!pq) return null

    const quest = this.getQuest(questId)
    if (!quest) return null

    return {
      progress: pq.progress,
      total: quest.requirements.count,
      completed: pq.completed,
      claimed: pq.claimed,
      speedUpEndTime: pq.speedUpEndTime
    }
  }

  // 获取任务统计
  getQuestStats(playerId: string): { total: number; completed: number; claimed: number; daily: number; weekly: number } {
    const quests = this.getPlayerQuests(playerId)
    
    let daily = 0
    let weekly = 0
    
    for (const pq of quests) {
      const quest = this.getQuest(pq.questId)
      if (!quest) continue
      
      if (quest.refreshType === 'daily') {
        daily++
      } else {
        weekly++
      }
    }

    return {
      total: quests.length,
      completed: quests.filter(q => q.completed).length,
      claimed: quests.filter(q => q.claimed).length,
      daily,
      weekly
    }
  }
}

export default DailyQuestSystem
