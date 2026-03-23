// 师徒任务系统扩展 - v25版本
// 师徒任务、师徒活动、师徒互动

export interface MasterTask {
  taskId: string
  taskType: 'daily' | 'weekly' | 'special'
  name: string
  nameCN: string
  description: string
  category: MasterTaskCategory
  requirement: MasterTaskRequirement
  reward: MasterTaskReward
  progress: number
  maxProgress: number
  completed: boolean
  acceptedAt: number
  expiresAt: number
}

export type MasterTaskCategory = 'combat' | 'resource' | 'social' | 'special'

export interface MasterTaskRequirement {
  type: 'dungeon' | 'monster' | 'collect' | 'chat' | 'gift' | 'practice'
  targetId?: string
  targetCount: number
}

export interface MasterTaskReward {
  exp: number
  gold: number
  contribution: number
  items?: TaskItemReward[]
}

export interface TaskItemReward {
  itemId: string
  count: number
}

export interface MasterActivity {
  activityId: string
  name: string
  nameCN: string
  description: string
  type: MasterActivityType
  participants: string[]
  startTime: number
  endTime: number
  status: 'waiting' | 'ongoing' | 'completed' | 'cancelled'
  rewards: MasterTaskReward[]
}

export type MasterActivityType = 'practice' | 'competition' | 'gift' | 'chat' | 'dungeon'

export interface MasterPracticeSession {
  sessionId: string
  masterId: string
  discipleId: string
  startTime: number
  duration: number
  expGained: number
  contributionGained: number
  status: 'ongoing' | 'completed' | 'cancelled'
}

// 师徒任务配置
export const MASTER_TASK_CONFIG = {
  // 每日任务
  dailyTasks: [
    {
      taskId: 'daily_combat_1',
      name: 'Combat Training',
      nameCN: '战斗训练',
      description: '与徒弟一起完成3次战斗',
      category: 'combat',
      requirement: { type: 'dungeon', targetCount: 3 },
      reward: { exp: 1000, gold: 500, contribution: 50 },
    },
    {
      taskId: 'daily_combat_2',
      name: 'Monster Hunt',
      nameCN: '除魔卫道',
      description: '击败100只怪物',
      category: 'combat',
      requirement: { type: 'monster', targetCount: 100 },
      reward: { exp: 800, gold: 400, contribution: 40 },
    },
    {
      taskId: 'daily_resource_1',
      name: 'Resource Collection',
      nameCN: '收集资源',
      description: '收集50个资源材料',
      category: 'resource',
      requirement: { type: 'collect', targetCount: 50 },
      reward: { exp: 600, gold: 300, contribution: 30 },
    },
    {
      taskId: 'daily_social_1',
      name: 'Mentor Chat',
      nameCN: '师徒交流',
      description: '与徒弟聊天10次',
      category: 'social',
      requirement: { type: 'chat', targetCount: 10 },
      reward: { exp: 500, gold: 200, contribution: 20 },
    },
    {
      taskId: 'daily_special_1',
      name: 'Practice Together',
      nameCN: '共同修炼',
      description: '与徒弟一起修炼1小时',
      category: 'special',
      requirement: { type: 'practice', targetCount: 1 },
      reward: { exp: 2000, gold: 1000, contribution: 100 },
    },
  ],
  // 每周任务
  weeklyTasks: [
    {
      taskId: 'weekly_combat_1',
      name: 'Weekly Combat',
      nameCN: '本周战斗',
      description: '完成20次战斗',
      category: 'combat',
      requirement: { type: 'dungeon', targetCount: 20 },
      reward: { exp: 5000, gold: 2500, contribution: 250 },
    },
    {
      taskId: 'weekly_resource_1',
      name: 'Weekly Collection',
      nameCN: '本周收集',
      description: '收集300个资源',
      category: 'resource',
      requirement: { type: 'collect', targetCount: 300 },
      reward: { exp: 3000, gold: 1500, contribution: 150 },
    },
    {
      taskId: 'weekly_social_1',
      name: 'Weekly Interaction',
      nameCN: '本周互动',
      description: '与徒弟互动50次',
      category: 'social',
      requirement: { type: 'chat', targetCount: 50 },
      reward: { exp: 2500, gold: 1000, contribution: 100 },
    },
  ],
  // 特殊任务
  specialTasks: [
    {
      taskId: 'special_master_1',
      name: 'Master Gift',
      nameCN: '师父馈赠',
      description: '送给徒弟一份礼物',
      category: 'special',
      requirement: { type: 'gift', targetCount: 1 },
      reward: { exp: 3000, gold: 1500, contribution: 150, items: [{ itemId: 'master_gift_box', count: 1 }] },
    },
    {
      taskId: 'special_graduate_1',
      name: 'Graduate Success',
      nameCN: '徒弟出师',
      description: '徒弟成功出师',
      category: 'special',
      requirement: { type: 'practice', targetCount: 30 },
      reward: { exp: 10000, gold: 5000, contribution: 500, items: [{ itemId: 'graduate_reward', count: 1 }] },
    },
  ],
  // 师徒活动配置
  activities: [
    {
      activityId: 'activity_practice_1',
      name: 'Joint Practice',
      nameCN: '共同修炼',
      description: '师徒双修，共享经验',
      type: 'practice',
      duration: 3600000,
      rewardMultiplier: 1.5,
    },
    {
      activityId: 'activity_competition_1',
      name: 'Master-Disciple Competition',
      nameCN: '师徒大赛',
      description: '师徒组队参加比赛',
      type: 'competition',
      duration: 7200000,
      rewardMultiplier: 2.0,
    },
  ],
}

// 师徒任务系统类
export class MasterTaskSystem {
  private playerTasks: Map<string, Map<string, MasterTask>> = new Map()
  private activities: Map<string, MasterActivity> = new Map()
  private practiceSessions: Map<string, MasterPracticeSession> = new Map()
  
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
    
    // 清除旧任务
    for (const [taskId, task] of tasks) {
      if (task.taskType === 'daily') {
        tasks.delete(taskId)
      }
    }
    
    // 添加新任务
    const dailyTasks = MASTER_TASK_CONFIG.dailyTasks
    for (const taskConfig of dailyTasks) {
      const task: MasterTask = {
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
  getPlayerTasks(playerId: string): MasterTask[] {
    this.initializePlayerTasks(playerId)
    const tasks = this.playerTasks.get(playerId)
    return Array.from(tasks?.values() || [])
  }
  
  // 获取玩家活跃任务
  getActiveTasks(playerId: string): MasterTask[] {
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
  claimTaskReward(playerId: string, taskId: string): { success: boolean; message: string; reward?: MasterTaskReward } {
    const tasks = this.playerTasks.get(playerId)
    if (!tasks) return { success: false, message: '任务不存在' }
    
    const task = tasks.get(taskId)
    if (!task) return { success: false, message: '任务不存在' }
    
    if (!task.completed) return { success: false, message: '任务未完成' }
    
    // 标记为已领取
    tasks.delete(taskId)
    
    return { success: true, message: '奖励领取成功', reward: task.reward }
  }
  
  // 开始师徒修炼
  startPracticeSession(masterId: string, discipleId: string): MasterPracticeSession {
    const session: MasterPracticeSession = {
      sessionId: `${masterId}_${discipleId}_${Date.now()}`,
      masterId,
      discipleId,
      startTime: Date.now(),
      duration: 0,
      expGained: 0,
      contributionGained: 0,
      status: 'ongoing',
    }
    this.practiceSessions.set(session.sessionId, session)
    return session
  }
  
  // 结束修炼
  endPracticeSession(sessionId: string): MasterPracticeSession | null {
    const session = this.practiceSessions.get(sessionId)
    if (!session) return null
    
    session.status = 'completed'
    session.duration = Date.now() - session.startTime
    
    // 计算奖励
    const hours = session.duration / (60 * 60 * 1000)
    session.expGained = Math.floor(100 * hours)
    session.contributionGained = Math.floor(50 * hours)
    
    return session
  }
  
  // 获取修炼状态
  getPracticeSession(sessionId: string): MasterPracticeSession | null {
    return this.practiceSessions.get(sessionId) || null
  }
  
  // 创建师徒活动
  createActivity(activityConfig: typeof MASTER_TASK_CONFIG.activities[0], masterId: string, discipleId: string): MasterActivity {
    const activity: MasterActivity = {
      activityId: `${activityConfig.activityId}_${Date.now()}`,
      name: activityConfig.name,
      nameCN: activityConfig.nameCN,
      description: activityConfig.description,
      type: activityConfig.type,
      participants: [masterId, discipleId],
      startTime: Date.now(),
      endTime: Date.now() + activityConfig.duration,
      status: 'ongoing',
      rewards: [],
    }
    this.activities.set(activity.activityId, activity)
    return activity
  }
  
  // 获取活动列表
  getActivities(): MasterActivity[] {
    return Array.from(this.activities.values())
  }
  
  // 获取玩家参与的活动
  getPlayerActivities(playerId: string): MasterActivity[] {
    return Array.from(this.activities.values()).filter(a => 
      a.participants.includes(playerId) && a.status === 'ongoing'
    )
  }
}
