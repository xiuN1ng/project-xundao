/**
 * 全服活动系统 - v29 版本
 * 全服务器玩家共同参与的大型活动
 */

export type GlobalActivityType = 
  | 'festival'      // 节日庆典
  | 'invasion'     // 怪物入侵
  | 'cultivation'  // 修炼盛典
  | 'auction'      // 全服拍卖
  | 'quest_event'  // 限时任务
  | 'login_event'  // 登录活动
  | 'spending_event' // 消费活动
  | 'exchange_event'  // 兑换活动

export type GlobalActivityState = 'pending' | 'preview' | 'active' | 'ended'
export type EventTier = 'common' | 'rare' | 'epic' | 'legendary'

export interface GlobalActivity {
  activityId: string
  type: GlobalActivityType
  name: string
  nameCN: string
  description: string
  icon: string
  state: GlobalActivityState
  previewStartTime: number
  startTime: number
  endTime: number
  duration: number
  serverId: string // 全服活动不需要这个，但为了统一
  rules: GlobalActivityRule[]
  rewards: GlobalActivityReward[]
  progress: GlobalActivityProgress
  participants: number
}

export interface GlobalActivityRule {
  id: string
  type: 'participation' | 'contribution' | 'ranking' | 'collection'
  description: string
  target: number
  progressType: 'additive' | 'threshold'
}

export interface GlobalActivityReward {
  id: string
  tier: EventTier
  condition: number // 条件（贡献值/排名等）
  conditionType: 'total' | 'rank' | 'milestone'
  items: Array<{ itemId: string; count: number }>
  gold?: number
  exp?: number
  title?: string
  icon?: string
}

export interface GlobalActivityProgress {
  currentTotal: number
  targetTotal: number
  milestones: number[]
  completedMilestones: number[]
  playerContributions: Map<string, number>
  playerRanks: Array<{ playerId: string; contribution: number; rank: number }>
}

export interface PlayerActivityParticipation {
  playerId: string
  activityId: string
  contribution: number
  rank: number
  claimedRewards: string[]
  lastUpdateTime: number
}

// 全服活动配置
export const GLOBAL_ACTIVITY_CONFIGS: Array<{
  type: GlobalActivityType
  name: string
  nameCN: string
  description: string
  icon: string
  defaultDuration: number
  rules: GlobalActivityRule[]
  rewards: GlobalActivityReward[]
}> = [
  // 节日庆典
  {
    type: 'festival',
    name: 'Festival Celebration',
    nameCN: '节日庆典',
    description: '全服共庆节日，完成活动任务获得丰厚奖励',
    icon: '🎉',
    defaultDuration: 7 * 24 * 60 * 60 * 1000,
    rules: [
      { id: 'rule_1', type: 'participation', description: '每日签到', target: 7, progressType: 'additive' },
      { id: 'rule_2', type: 'contribution', description: '节日礼包消耗', target: 1000000, progressType: 'threshold' },
      { id: 'rule_3', type: 'collection', description: '收集节日道具', target: 100, progressType: 'additive' }
    ],
    rewards: [
      { id: 'reward_1', tier: 'common', condition: 1, conditionType: 'milestone', items: [{ itemId: 'festival_coin', count: 10 }], gold: 1000 },
      { id: 'reward_2', tier: 'common', condition: 3, conditionType: 'milestone', items: [{ itemId: 'festival_coin', count: 30 }], gold: 5000 },
      { id: 'reward_3', tier: 'rare', condition: 7, conditionType: 'milestone', items: [{ itemId: 'festival_token', count: 1 }], gold: 20000, exp: 10000 },
      { id: 'reward_4', tier: 'epic', condition: 100, conditionType: 'total', items: [{ itemId: 'festival_chest', count: 1 }], gold: 100000 },
      { id: 'reward_5', tier: 'legendary', condition: 1, conditionType: 'rank', items: [{ itemId: 'festival_legendary_chest', count: 1 }], title: '庆典达人' }
    ]
  },
  // 怪物入侵
  {
    type: 'invasion',
    name: 'Monster Invasion',
    nameCN: '怪物入侵',
    description: '全服玩家共同抵御入侵怪物，保护仙界',
    icon: '👾',
    defaultDuration: 3 * 24 * 60 * 60 * 1000,
    rules: [
      { id: 'rule_1', type: 'participation', description: '击杀入侵怪物', target: 1000, progressType: 'additive' },
      { id: 'rule_2', type: 'contribution', description: '活动期间总伤害', target: 100000000, progressType: 'threshold' },
      { id: 'rule_3', type: 'ranking', description: '伤害排名', target: 100, progressType: 'threshold' }
    ],
    rewards: [
      { id: 'reward_1', tier: 'common', condition: 100, conditionType: 'milestone', items: [{ itemId: 'invasion_token', count: 10 }], gold: 5000 },
      { id: 'reward_2', tier: 'rare', condition: 1000, conditionType: 'milestone', items: [{ itemId: 'invasion_token', count: 50 }], gold: 50000 },
      { id: 'reward_3', tier: 'epic', condition: 10000, conditionType: 'total', items: [{ itemId: 'invasion_chest', count: 1 }], gold: 200000, exp: 100000 },
      { id: 'reward_4', tier: 'legendary', condition: 1, conditionType: 'rank', items: [{ itemId: 'invasion_legendary_chest', count: 1 }], title: '守护者', icon: '🛡️' }
    ]
  },
  // 修炼盛典
  {
    type: 'cultivation',
    name: 'Cultivation Ceremony',
    nameCN: '修炼盛典',
    description: '全服玩家共同修炼，突破境界获得加成',
    icon: '📈',
    defaultDuration: 14 * 24 * 60 * 60 * 1000,
    rules: [
      { id: 'rule_1', type: 'participation', description: '境界突破次数', target: 1000, progressType: 'additive' },
      { id: 'rule_2', type: 'contribution', description: '累计修炼经验', target: 1000000000, progressType: 'threshold' },
      { id: 'rule_3', type: 'ranking', description: '境界排名', target: 100, progressType: 'threshold' }
    ],
    rewards: [
      { id: 'reward_1', tier: 'common', condition: 1, conditionType: 'milestone', items: [{ itemId: 'cultivation_book', count: 10 }], gold: 10000 },
      { id: 'reward_2', tier: 'rare', condition: 5, conditionType: 'milestone', items: [{ itemId: 'cultivation_boost', count: 1 }], exp: 500000 },
      { id: 'reward_3', tier: 'epic', condition: 50, conditionType: 'total', items: [{ itemId: 'cultivation_token', count: 10 }], gold: 500000, exp: 1000000 },
      { id: 'reward_4', tier: 'legendary', condition: 1, conditionType: 'rank', items: [{ itemId: 'cultivation_legendary_token', count: 1 }], title: '修炼至尊', icon: '🏆' }
    ]
  },
  // 登录活动
  {
    type: 'login_event',
    name: 'Login Event',
    nameCN: '登录有礼',
    description: '每日登录领取奖励，连续登录获得额外大奖',
    icon: '🎁',
    defaultDuration: 7 * 24 * 60 * 60 * 1000,
    rules: [
      { id: 'rule_1', type: 'participation', description: '每日登录', target: 7, progressType: 'additive' }
    ],
    rewards: [
      { id: 'reward_1', tier: 'common', condition: 1, conditionType: 'milestone', items: [{ itemId: 'gold', count: 1000 }], gold: 1000 },
      { id: 'reward_2', tier: 'common', condition: 2, conditionType: 'milestone', items: [{ itemId: 'gold', count: 2000 }], gold: 2000 },
      { id: 'reward_3', tier: 'rare', condition: 3, conditionType: 'milestone', items: [{ itemId: 'gold', count: 5000 }], gold: 5000 },
      { id: 'reward_4', tier: 'rare', condition: 4, conditionType: 'milestone', items: [{ itemId: 'gold', count: 8000 }], gold: 8000 },
      { id: 'reward_5', tier: 'epic', condition: 5, conditionType: 'milestone', items: [{ itemId: 'gold', count: 15000 }, { itemId: 'diamond', count: 10 }], gold: 15000 },
      { id: 'reward_6', tier: 'legendary', condition: 7, conditionType: 'milestone', items: [{ itemId: 'legendary_chest', count: 1 }], gold: 50000, title: '签到达人' }
    ]
  },
  // 消费活动
  {
    type: 'spending_event',
    name: 'Spending Event',
    nameCN: '消费大返利',
    description: '消费元宝获得返利和额外奖励',
    icon: '💰',
    defaultDuration: 3 * 24 * 60 * 60 * 1000,
    rules: [
      { id: 'rule_1', type: 'contribution', description: '累计消费元宝', target: 100000, progressType: 'threshold' }
    ],
    rewards: [
      { id: 'reward_1', tier: 'common', condition: 100, conditionType: 'milestone', items: [{ itemId: 'gold', count: 1000 }] },
      { id: 'reward_2', tier: 'rare', condition: 1000, conditionType: 'milestone', items: [{ itemId: 'gold', count: 12000 }], gold: 1000 },
      { id: 'reward_3', tier: 'epic', condition: 5000, conditionType: 'milestone', items: [{ itemId: 'gold', count: 75000 }], gold: 5000 },
      { id: 'reward_4', tier: 'legendary', condition: 10000, conditionType: 'milestone', items: [{ itemId: 'legendary_chest', count: 1 }], gold: 10000, title: 'VIP豪客' }
    ]
  },
  // 兑换活动
  {
    type: 'exchange_event',
    name: 'Exchange Event',
    nameCN: '限时兑换',
    description: '收集道具兑换稀有奖励',
    icon: '🔄',
    defaultDuration: 5 * 24 * 60 * 60 * 1000,
    rules: [
      { id: 'rule_1', type: 'collection', description: '收集兑换道具', target: 100, progressType: 'additive' }
    ],
    rewards: [
      { id: 'reward_1', tier: 'common', condition: 10, conditionType: 'milestone', items: [{ itemId: 'exchange_token', count: 10 }], gold: 1000 },
      { id: 'reward_2', tier: 'rare', condition: 50, conditionType: 'milestone', items: [{ itemId: 'rare_chest', count: 1 }], gold: 5000 },
      { id: 'reward_3', tier: 'epic', condition: 100, conditionType: 'milestone', items: [{ itemId: 'epic_chest', count: 1 }], gold: 20000, exp: 50000 },
      { id: 'reward_4', tier: 'legendary', condition: 200, conditionType: 'milestone', items: [{ itemId: 'legendary_chest', count: 1 }], gold: 100000, exp: 200000 }
    ]
  }
]

export const GLOBAL_ACTIVITY_CONFIG = {
  maxConcurrentActivities: 5,
  rankUpdateInterval: 60 * 1000, // 1分钟更新排名
  contributionUpdateInterval: 10 * 1000, // 10秒更新贡献
}

export class GlobalActivitySystem {
  private activities: Map<string, GlobalActivity> = new Map()
  private participations: Map<string, PlayerActivityParticipation> = new Map()
  
  // 创建全服活动
  createActivity(type: GlobalActivityType, startTime: number, duration?: number): GlobalActivity | null {
    const config = GLOBAL_ACTIVITY_CONFIGS.find(c => c.type === type)
    if (!config) return null
    
    // 检查并发活动数量
    if (this.activities.size >= GLOBAL_ACTIVITY_CONFIG.maxConcurrentActivities) {
      const activeCount = Array.from(this.activities.values()).filter(a => a.state === 'active').length
      if (activeCount >= 3) {
        return null // 活动已满
      }
    }
    
    const endTime = startTime + (duration || config.defaultDuration)
    const previewStartTime = startTime - 24 * 60 * 60 * 1000 // 提前1天预览
    
    // 计算目标总量
    const targetTotal = config.rules.reduce((sum, rule) => {
      if (rule.type === 'contribution') return Math.max(sum, rule.target)
      return sum
    }, 0)
    
    const activity: GlobalActivity = {
      activityId: `global_${type}_${startTime}`,
      type,
      name: config.name,
      nameCN: config.nameCN,
      description: config.description,
      icon: config.icon,
      state: 'pending',
      previewStartTime,
      startTime,
      endTime,
      duration: duration || config.defaultDuration,
      serverId: 'global',
      rules: config.rules,
      rewards: config.rewards,
      progress: {
        currentTotal: 0,
        targetTotal,
        milestones: config.rewards.filter(r => r.conditionType === 'milestone').map(r => r.condition),
        completedMilestones: [],
        playerContributions: new Map(),
        playerRanks: []
      },
      participants: 0
    }
    
    this.activities.set(activity.activityId, activity)
    return activity
  }
  
  // 获取活动列表
  getActivities(state?: GlobalActivityState): GlobalActivity[] {
    const all = Array.from(this.activities.values())
    if (state) {
      return all.filter(a => a.state === state)
    }
    return all
  }
  
  // 获取当前活动
  getCurrentActivity(type?: GlobalActivityType): GlobalActivity | null {
    const now = Date.now()
    const active = Array.from(this.activities.values()).find(a => 
      a.state === 'active' && now >= a.startTime && now <= a.endTime &&
      (!type || a.type === type)
    )
    return active || null
  }
  
  // 玩家参与活动
  participate(playerId: string, activityId: string): { success: boolean; message: string } {
    const activity = this.activities.get(activityId)
    if (!activity) return { success: false, message: '活动不存在' }
    
    const now = Date.now()
    if (now < activity.startTime || now > activity.endTime) {
      return { success: false, message: '活动未开始或已结束' }
    }
    
    const participationKey = `${playerId}_${activityId}`
    if (this.participations.has(participationKey)) {
      return { success: true, message: '已参与活动' }
    }
    
    const participation: PlayerActivityParticipation = {
      playerId,
      activityId,
      contribution: 0,
      rank: 0,
      claimedRewards: [],
      lastUpdateTime: now
    }
    
    this.participations.set(participationKey, participation)
    activity.participants++
    
    return { success: true, message: '参与成功' }
  }
  
  // 增加玩家贡献
  addContribution(playerId: string, activityId: string, amount: number): void {
    const activity = this.activities.get(activityId)
    if (!activity) return
    
    const participationKey = `${playerId}_${activityId}`
    let participation = this.participations.get(participationKey)
    
    if (!participation) {
      this.participate(playerId, activityId)
      participation = this.participations.get(participationKey)
    }
    
    if (!participation) return
    
    participation.contribution += amount
    participation.lastUpdateTime = Date.now()
    
    // 更新活动总贡献
    activity.progress.currentTotal += amount
    activity.progress.playerContributions.set(playerId, participation.contribution)
    
    // 检查里程碑
    this.checkMilestones(activity)
  }
  
  // 检查里程碑完成情况
  private checkMilestones(activity: GlobalActivity): void {
    for (const reward of activity.rewards) {
      if (reward.conditionType === 'milestone' && !activity.progress.completedMilestones.includes(reward.condition)) {
        if (activity.progress.currentTotal >= reward.condition) {
          activity.progress.completedMilestones.push(reward.condition)
        }
      }
    }
  }
  
  // 玩家领取奖励
  claimReward(playerId: string, activityId: string, rewardId: string): { success: boolean; message: string; reward?: GlobalActivityReward } {
    const activity = this.activities.get(activityId)
    if (!activity) return { success: false, message: '活动不存在' }
    
    const participationKey = `${playerId}_${activityId}`
    const participation = this.participations.get(participationKey)
    if (!participation) return { success: false, message: '未参与活动' }
    
    if (participation.claimedRewards.includes(rewardId)) {
      return { success: false, message: '奖励已领取' }
    }
    
    const reward = activity.rewards.find(r => r.id === rewardId)
    if (!reward) return { success: false, message: '奖励不存在' }
    
    // 检查领取条件
    let canClaim = false
    
    if (reward.conditionType === 'milestone') {
      canClaim = activity.progress.completedMilestones.includes(reward.condition)
    } else if (reward.conditionType === 'total') {
      canClaim = activity.progress.currentTotal >= reward.condition
    } else if (reward.conditionType === 'rank') {
      canClaim = participation.rank <= reward.condition
    }
    
    if (!canClaim) {
      return { success: false, message: '未满足领取条件' }
    }
    
    participation.claimedRewards.push(rewardId)
    
    return { success: true, message: '奖励领取成功', reward }
  }
  
  // 更新排名
  updateRankings(activityId: string): void {
    const activity = this.activities.get(activityId)
    if (!activity) return
    
    const contributions = Array.from(activity.progress.playerContributions.entries())
      .sort((a, b) => b[1] - a[1])
    
    activity.progress.playerRanks = contributions.map(([playerId, contribution], index) => ({
      playerId,
      contribution,
      rank: index + 1
    }))
    
    // 更新玩家排名
    for (const [playerId, contribution] of contributions) {
      const participationKey = `${playerId}_${activityId}`
      const participation = this.participations.get(participationKey)
      if (participation) {
        participation.rank = index + 1
      }
    }
  }
  
  // 获取玩家参与信息
  getPlayerParticipation(playerId: string, activityId: string): PlayerActivityParticipation | null {
    return this.participations.get(`${playerId}_${activityId}`) || null
  }
  
  // 获取活动进度
  getActivityProgress(activityId: string): GlobalActivityProgress | null {
    const activity = this.activities.get(activityId)
    return activity ? activity.progress : null
  }
  
  // 获取可领取奖励
  getClaimableRewards(playerId: string, activityId: string): GlobalActivityReward[] {
    const activity = this.activities.get(activityId)
    if (!activity) return []
    
    const participation = this.getPlayerParticipation(playerId, activityId)
    if (!participation) return []
    
    const claimable: GlobalActivityReward[] = []
    
    for (const reward of activity.rewards) {
      if (participation.claimedRewards.includes(reward.id)) continue
      
      let canClaim = false
      
      if (reward.conditionType === 'milestone') {
        canClaim = activity.progress.completedMilestones.includes(reward.condition)
      } else if (reward.conditionType === 'total') {
        canClaim = activity.progress.currentTotal >= reward.condition
      } else if (reward.conditionType === 'rank') {
        canClaim = participation.rank <= reward.condition
      }
      
      if (canClaim) {
        claimable.push(reward)
      }
    }
    
    return claimable
  }
  
  // 活动状态检查
  checkActivityStates(): void {
    const now = Date.now()
    
    for (const activity of this.activities.values()) {
      if (activity.state === 'pending' && now >= activity.previewStartTime) {
        activity.state = 'preview'
      }
      if (activity.state === 'preview' && now >= activity.startTime) {
        activity.state = 'active'
      }
      if (activity.state === 'active' && now >= activity.endTime) {
        activity.state = 'ended'
        this.updateRankings(activity.activityId)
      }
    }
    
    // 清理过期活动数据（保留7天）
    for (const [activityId, activity] of this.activities.entries()) {
      if (activity.state === 'ended' && now - activity.endTime > 7 * 24 * 60 * 60 * 1000) {
        this.activities.delete(activityId)
        // 清理相关参与数据
        for (const [key] of this.participations.entries()) {
          if (key.startsWith(activityId)) {
            this.participations.delete(key)
          }
        }
      }
    }
  }
}

// 导出单例
export const globalActivitySystem = new GlobalActivitySystem()
