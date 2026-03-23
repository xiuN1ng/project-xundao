// 仙侣活动系统 - v25版本
// 仙侣任务、仙侣活动、双修系统

export interface CoupleTask {
  taskId: string
  taskType: 'daily' | 'weekly' | 'special'
  name: string
  nameCN: string
  description: string
  category: CoupleTaskCategory
  requirement: CoupleTaskRequirement
  reward: CoupleTaskReward
  progress: number
  maxProgress: number
  completed: boolean
  acceptedAt: number
  expiresAt: number
}

export type CoupleTaskCategory = 'combat' | 'social' | 'gift' | 'practice' | 'dungeon'

export interface CoupleTaskRequirement {
  type: 'dungeon' | 'chat' | 'gift' | 'practice' | 'quest'
  targetCount: number
}

export interface CoupleTaskReward {
  love: number
  exp: number
  gold: number
  items?: CoupleItemReward[]
}

export interface CoupleItemReward {
  itemId: string
  count: number
}

export interface CoupleActivity {
  activityId: string
  name: string
  nameCN: string
  description: string
  type: CoupleActivityType
  partnerAId: string
  partnerBId: string
  startTime: number
  endTime: number
  status: 'waiting' | 'ongoing' | 'completed' | 'cancelled'
  rewards: CoupleTaskReward[]
}

export type CoupleActivityType = 'practice' | 'date' | 'quest' | 'dungeon' | 'gift'

export interface CouplePracticeSession {
  sessionId: string
  partnerAId: string
  partnerBId: string
  startTime: number
  practiceType: 'dual_cultivation' | 'chat' | 'date'
  duration: number
  loveGained: number
  expGained: number
  status: 'ongoing' | 'completed'
}

export interface CoupleDate {
  dateId: string
  partnerAId: string
  partnerBId: string
  dateType: 'cafe' | 'park' | 'movie' | 'travel'
  location: string
  startTime: number
  duration: number
  cost: { gold: number; love: number }
  rewards: { love: number; exp: number }
  status: 'ongoing' | 'completed' | 'cancelled'
}

// 仙侣活动配置
export const COUPLE_ACTIVITY_CONFIG = {
  // 每日任务
  dailyTasks: [
    {
      taskId: 'daily_chat_1',
      name: 'Daily Chat',
      nameCN: '日常聊天',
      description: '与伴侣聊天10次',
      category: 'social',
      requirement: { type: 'chat', targetCount: 10 },
      reward: { love: 50, exp: 500, gold: 200 },
    },
    {
      taskId: 'daily_gift_1',
      name: 'Daily Gift',
      nameCN: '每日礼物',
      description: '送给伴侣一份礼物',
      category: 'gift',
      requirement: { type: 'gift', targetCount: 1 },
      reward: { love: 100, exp: 300, gold: 100, items: [{ itemId: 'couple_gift', count: 1 }] },
    },
    {
      taskId: 'daily_practice_1',
      name: 'Daily Practice',
      nameCN: '日常双修',
      description: '与伴侣双修30分钟',
      category: 'practice',
      requirement: { type: 'practice', targetCount: 30 },
      reward: { love: 200, exp: 2000, gold: 500 },
    },
    {
      taskId: 'daily_dungeon_1',
      name: 'Couple Dungeon',
      nameCN: '同心副本',
      description: '一起完成一次副本',
      category: 'dungeon',
      requirement: { type: 'dungeon', targetCount: 1 },
      reward: { love: 300, exp: 3000, gold: 1000 },
    },
  ],
  // 每周任务
  weeklyTasks: [
    {
      taskId: 'weekly_chat_1',
      name: 'Weekly Chat',
      nameCN: '本周交流',
      description: '与伴侣聊天50次',
      category: 'social',
      requirement: { type: 'chat', targetCount: 50 },
      reward: { love: 300, exp: 2500, gold: 1000 },
    },
    {
      taskId: 'weekly_practice_1',
      name: 'Weekly Practice',
      nameCN: '本周双修',
      description: '与伴侣双修5小时',
      category: 'practice',
      requirement: { type: 'practice', targetCount: 300 },
      reward: { love: 1000, exp: 10000, gold: 5000 },
    },
  ],
  // 特殊任务
  specialTasks: [
    {
      taskId: 'special_anniversary_1',
      name: 'Anniversary Celebration',
      nameCN: '结婚纪念日',
      description: '庆祝结婚纪念日',
      category: 'gift',
      requirement: { type: 'gift', targetCount: 1 },
      reward: { love: 500, exp: 5000, gold: 2000, items: [{ itemId: 'anniversary_gift', count: 1 }] },
    },
  ],
  // 约会地点
  dateLocations: [
    { type: 'cafe', name: 'Coffee Shop', nameCN: '咖啡馆', cost: { gold: 500, love: 0 }, rewards: { love: 30, exp: 200 }, duration: 1800000 },
    { type: 'park', name: 'City Park', nameCN: '公园', cost: { gold: 200, love: 0 }, rewards: { love: 20, exp: 150 }, duration: 1800000 },
    { type: 'movie', name: 'Movie Theater', nameCN: '电影院', cost: { gold: 800, love: 10 }, rewards: { love: 50, exp: 300 }, duration: 3600000 },
    { type: 'travel', name: 'Travel', nameCN: '出游', cost: { gold: 2000, love: 20 }, rewards: { love: 100, exp: 1000 }, duration: 7200000 },
  ],
}

// 仙侣活动系统类
export class CoupleActivitySystem {
  private playerTasks: Map<string, Map<string, CoupleTask>> = new Map()
  private activities: Map<string, CoupleActivity> = new Map()
  private practiceSessions: Map<string, CouplePracticeSession> = new Map()
  private dates: Map<string, CoupleDate> = new Map()
  
  // 初始化玩家任务
  initializePlayerTasks(playerId: string): void {
    if (!this.playerTasks.has(playerId)) {
      this.playerTasks.set(playerId, new Map())
      this.refreshDailyTasks(playerId)
    }
  }
  
  // 刷新每日任务
  refreshDailyTasks(playerId: string): void {
    const tasks = this.playerTasks.get(playerId)
    if (!tasks) return
    
    for (const [taskId, task] of tasks) {
      if (task.taskType === 'daily') tasks.delete(taskId)
    }
    
    const dailyTasks = COUPLE_ACTIVITY_CONFIG.dailyTasks
    for (const taskConfig of dailyTasks) {
      const task: CoupleTask = {
        taskId: `${playerId}_${taskConfig.taskId}_${Date.now()}`,
        taskType: 'daily',
        name: taskConfig.name,
        nameCN: taskConfig.nameCN,
        description: taskConfig.description,
        category: taskConfig.category,
        requirement: { ...taskConfig.requirement },
        reward: { ...taskConfig.reward },
        progress: 0,
        maxProgress: taskConfig.requirement.targetCount,
        completed: false,
        acceptedAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      }
      tasks.set(task.taskId, task)
    }
  }
  
  // 获取玩家任务列表
  getPlayerTasks(playerId: string): CoupleTask[] {
    this.initializePlayerTasks(playerId)
    const tasks = this.playerTasks.get(playerId)
    return Array.from(tasks?.values() || [])
  }
  
  // 获取活跃任务
  getActiveTasks(playerId: string): CoupleTask[] {
    return this.getPlayerTasks(playerId).filter(t => !t.completed)
  }
  
  // 更新任务进度
  updateTaskProgress(playerId: string, type: string, amount: number): void {
    const tasks = this.playerTasks.get(playerId)
    if (!tasks) return
    
    for (const task of tasks.values()) {
      if (task.completed) continue
      if (task.requirement.type === type) {
        task.progress = Math.min(task.progress + amount, task.maxProgress)
        if (task.progress >= task.maxProgress) {
          task.completed = true
        }
      }
    }
  }
  
  // 领取任务奖励
  claimTaskReward(playerId: string, taskId: string): { success: boolean; message: string; reward?: CoupleTaskReward } {
    const tasks = this.playerTasks.get(playerId)
    if (!tasks) return { success: false, message: '任务不存在' }
    
    const task = tasks.get(taskId)
    if (!task) return { success: false, message: '任务不存在' }
    if (!task.completed) return { success: false, message: '任务未完成' }
    
    tasks.delete(taskId)
    return { success: true, message: '奖励领取成功', reward: task.reward }
  }
  
  // 开始双修
  startPracticeSession(partnerAId: string, partnerBId: string, practiceType: 'dual_cultivation' | 'chat' | 'date' = 'dual_cultivation'): CouplePracticeSession {
    const session: CouplePracticeSession = {
      sessionId: `${partnerAId}_${partnerBId}_${Date.now()}`,
      partnerAId,
      partnerBId,
      startTime: Date.now(),
      practiceType,
      duration: 0,
      loveGained: 0,
      expGained: 0,
      status: 'ongoing',
    }
    this.practiceSessions.set(session.sessionId, session)
    return session
  }
  
  // 结束双修
  endPracticeSession(sessionId: string): CouplePracticeSession | null {
    const session = this.practiceSessions.get(sessionId)
    if (!session) return null
    
    session.status = 'completed'
    session.duration = Date.now() - session.startTime
    
    const minutes = session.duration / (60 * 1000)
    
    switch (session.practiceType) {
      case 'dual_cultivation':
        session.loveGained = Math.floor(minutes * 2)
        session.expGained = Math.floor(minutes * 20)
        break
      case 'chat':
        session.loveGained = Math.floor(minutes * 1)
        session.expGained = Math.floor(minutes * 5)
        break
      case 'date':
        session.loveGained = Math.floor(minutes * 3)
        session.expGained = Math.floor(minutes * 10)
        break
    }
    
    return session
  }
  
  // 约会
  startDate(partnerAId: string, partnerBId: string, dateType: 'cafe' | 'park' | 'movie' | 'travel'): { success: boolean; message: string; date?: CoupleDate } {
    const locationConfig = COUPLE_ACTIVITY_CONFIG.dateLocations.find(l => l.type === dateType)
    if (!locationConfig) return { success: false, message: '约会地点不存在' }
    
    const date: CoupleDate = {
      dateId: `${partnerAId}_${partnerBId}_${Date.now()}`,
      partnerAId,
      partnerBId,
      dateType,
      location: locationConfig.nameCN,
      startTime: Date.now(),
      duration: locationConfig.duration,
      cost: { ...locationConfig.cost },
      rewards: { ...locationConfig.rewards },
      status: 'ongoing',
    }
    
    this.dates.set(date.dateId, date)
    return { success: true, message: '约会开始', date }
  }
  
  // 结束约会
  endDate(dateId: string): CoupleDate | null {
    const date = this.dates.get(dateId)
    if (!date) return null
    
    date.status = 'completed'
    return date
  }
  
  // 创建仙侣活动
  createActivity(activityType: CoupleActivityType, partnerAId: string, partnerBId: string): CoupleActivity {
    const activityNames: Record<CoupleActivityType, { name: string; nameCN: string; description: string }> = {
      practice: { name: 'Dual Cultivation', nameCN: '双修活动', description: '与伴侣一起修炼' },
      date: { name: 'Date Night', nameCN: '约会之夜', description: '与伴侣共度美好时光' },
      quest: { name: 'Couple Quest', nameCN: '同心任务', description: '完成共同任务' },
      dungeon: { name: 'Couple Dungeon', nameCN: '同心副本', description: '携手闯关' },
      gift: { name: 'Gift Exchange', nameCN: '礼物交换', description: '互赠礼物' },
    }
    
    const activityInfo = activityNames[activityType]
    const activity: CoupleActivity = {
      activityId: `${activityType}_${Date.now()}`,
      name: activityInfo.name,
      nameCN: activityInfo.nameCN,
      description: activityInfo.description,
      type: activityType,
      partnerAId,
      partnerBId,
      startTime: Date.now(),
      endTime: Date.now() + 24 * 60 * 60 * 1000,
      status: 'ongoing',
      rewards: [],
    }
    
    this.activities.set(activity.activityId, activity)
    return activity
  }
  
  // 获取活动列表
  getActivities(): CoupleActivity[] {
    return Array.from(this.activities.values())
  }
  
  // 获取玩家参与的活动
  getPlayerActivities(playerId: string): CoupleActivity[] {
    return Array.from(this.activities.values()).filter(a => 
      (a.partnerAId === playerId || a.partnerBId === playerId) && a.status === 'ongoing'
    )
  }
}
