/**
 * 跨服活动系统 - v29 版本
 * 跨服务器的大型活动，玩家可以与其他服务器的玩家竞争
 */

export type CrossServerActivityType = 
  | 'arena'        // 跨服竞技场
  | 'guild_war'    // 跨服公会战
  | 'world_boss'   // 跨服世界Boss
  | 'elite_dungeon'// 跨服精英副本
  | 'treasure'     // 跨服寻宝
  | 'capture_flag' // 跨服夺旗
  | 'alliance_war' // 跨服联盟战

export type ActivityState = 'scheduled' | 'registration' | 'active' | 'ended' | 'settlement'
export type PlayerActivityStatus = 'not_joined' | 'registered' | 'participating' | 'finished' | 'rewarded'

export interface CrossServerActivity {
  activityId: string
  type: CrossServerActivityType
  name: string
  nameCN: string
  description: string
  icon: string
  state: ActivityState
  startTime: number
  endTime: number
  registrationStartTime: number
  registrationEndTime: number
  duration: number // 活动持续时间(ms)
  minLevel: number
  maxLevel: number
  minRealm: string
  maxPlayers: number // 最大参与人数
  serverLimit: number // 每服务器最大参与人数
  rules: ActivityRule[]
  rewards: ActivityReward[]
  rankings: ActivityRanking[]
  stats: ActivityStats
}

export interface ActivityRule {
  id: string
  description: string
  details: string[]
}

export interface ActivityReward {
  rank: number // 排名奖励，-1表示参与奖
  rankEnd?: number // 排名范围结束
  items: Array<{ itemId: string; count: number }>
  gold: number
  exp: number
  specialReward?: string
}

export interface ActivityRanking {
  playerId: string
  playerName: string
  serverId: string
  guildId?: string
  guildName?: string
  score: number
  rank: number
  lastUpdateTime: number
}

export interface ActivityStats {
  totalParticipants: number
  activePlayers: number
  totalMatches: number
  totalDamage: number
  totalHealing: number
}

export interface PlayerActivityRecord {
  playerId: string
  activityId: string
  status: PlayerActivityStatus
  score: number
  rank: number
  matches: number
  wins: number
  losses: number
  damage: number
  healing: number
  lastMatchTime: number | null
  joinedAt: number
  finishedAt: number | null
}

export interface CrossServerMatch {
  matchId: string
  activityId: string
  type: CrossServerActivityType
  players: Array<{
    playerId: string
    playerName: string
    serverId: string
    team: 'A' | 'B'
    hp: number
    maxHp: number
    attack: number
    defense: number
  }>
  state: 'waiting' | 'active' | 'finished'
  winner: string | null
  startTime: number | null
  endTime: number | null
  score: { A: number; B: number }
}

// 跨服活动配置
export const CROSS_SERVER_ACTIVITY_CONFIGS: Array<{
  type: CrossServerActivityType
  name: string
  nameCN: string
  description: string
  icon: string
  duration: number
  minLevel: number
  maxPlayers: number
  serverLimit: number
  rules: ActivityRule[]
  rewards: ActivityReward[]
}> = [
  // 跨服竞技场
  {
    type: 'arena',
    name: 'Cross Server Arena',
    nameCN: '跨服竞技场',
    description: '玩家与其他服务器的精英对决，争夺最强王者称号',
    icon: '⚔️',
    duration: 30 * 60 * 1000, // 30分钟
    minLevel: 30,
    maxPlayers: 100,
    serverLimit: 20,
    rules: [
      { id: 'rule_1', description: '1v1对战', details: ['单挑对决', '三局两胜'] },
      { id: 'rule_2', description: '排名机制', details: ['按胜率排名', '同分按时间'] },
      { id: 'rule_3', description: '奖励机制', details: ['排名奖励', '胜场奖励'] }
    ],
    rewards: [
      { rank: 1, items: [{ itemId: 'arena_champion_token', count: 1 }], gold: 1000000, exp: 500000, specialReward: '王者称号' },
      { rank: 2, items: [{ itemId: 'arena_token', count: 10 }], gold: 500000, exp: 300000 },
      { rank: 3, items: [{ itemId: 'arena_token', count: 5 }], gold: 300000, exp: 200000 },
      { rank: -1, items: [{ itemId: 'arena_token', count: 1 }], gold: 10000, exp: 10000 }
    ]
  },
  // 跨服公会战
  {
    type: 'guild_war',
    name: 'Cross Server Guild War',
    nameCN: '跨服公会战',
    description: '公会之间的跨服战争，争夺服务器荣誉',
    icon: '🏰',
    duration: 60 * 60 * 1000, // 1小时
    minLevel: 40,
    maxPlayers: 200,
    serverLimit: 50,
    rules: [
      { id: 'rule_1', description: '公会对战', details: ['30v30团战', '摧毁基地获胜'] },
      { id: 'rule_2', description: '积分机制', details: ['击杀得分', '摧毁建筑得分'] },
      { id: 'rule_3', description: '胜负判定', details: ['积分高者胜', '时间结束按积分'] }
    ],
    rewards: [
      { rank: 1, items: [{ itemId: 'guild_war_champion_token', count: 1 }], gold: 5000000, exp: 2000000, specialReward: '第一公会称号' },
      { rank: 2, items: [{ itemId: 'guild_war_token', count: 20 }], gold: 3000000, exp: 1000000 },
      { rank: 3, items: [{ itemId: 'guild_war_token', count: 10 }], gold: 2000000, exp: 500000 },
      { rank: -1, items: [{ itemId: 'guild_war_token', count: 2 }], gold: 50000, exp: 20000 }
    ]
  },
  // 跨服世界Boss
  {
    type: 'world_boss',
    name: 'Cross Server World Boss',
    nameCN: '跨服世界Boss',
    description: '多服务器玩家联手讨伐强大Boss',
    icon: '👹',
    duration: 30 * 60 * 1000,
    minLevel: 20,
    maxPlayers: 500,
    serverLimit: 100,
    rules: [
      { id: 'rule_1', description: 'Boss战斗', details: ['全服玩家共同讨伐', '按伤害排名'] },
      { id: 'rule_2', description: '伤害排行', details: ['总伤害排名', '最后一击奖励'] },
      { id: 'rule_3', description: '奖励机制', details: ['参与奖', '排名奖', '击杀奖'] }
    ],
    rewards: [
      { rank: 1, items: [{ itemId: 'world_boss_kill_token', count: 1 }], gold: 2000000, exp: 1000000, specialReward: 'Boss杀手称号' },
      { rank: 2, items: [{ itemId: 'world_boss_token', count: 10 }], gold: 1000000, exp: 500000 },
      { rank: 3, items: [{ itemId: 'world_boss_token', count: 5 }], gold: 500000, exp: 300000 },
      { rank: -1, items: [{ itemId: 'world_boss_token', count: 1 }], gold: 10000, exp: 5000 }
    ]
  },
  // 跨服夺旗
  {
    type: 'capture_flag',
    name: 'Capture the Flag',
    nameCN: '跨服夺旗',
    description: '双方阵营争夺旗帜据点',
    icon: '🚩',
    duration: 20 * 60 * 1000,
    minLevel: 25,
    maxPlayers: 80,
    serverLimit: 40,
    rules: [
      { id: 'rule_1', description: '夺旗机制', details: ['夺取敌方旗帜', '带回己方基地'] },
      { id: 'rule_2', description: '防守机制', details: ['保护己方旗帜', '拦截敌人'] },
      { id: 'rule_3', description: '胜负判定', details: ['率先夺得3面旗帜获胜', '时间结束按得分'] }
    ],
    rewards: [
      { rank: 1, items: [{ itemId: 'flag_champion_token', count: 1 }], gold: 800000, exp: 400000 },
      { rank: 2, items: [{ itemId: 'flag_token', count: 8 }], gold: 400000, exp: 200000 },
      { rank: 3, items: [{ itemId: 'flag_token', count: 5 }], gold: 200000, exp: 100000 },
      { rank: -1, items: [{ itemId: 'flag_token', count: 1 }], gold: 8000, exp: 5000 }
    ]
  },
  // 跨服寻宝
  {
    type: 'treasure',
    name: 'Cross Server Treasure Hunt',
    nameCN: '跨服寻宝',
    description: '在跨服地图中寻找稀有宝藏',
    icon: '💎',
    duration: 45 * 60 * 1000,
    minLevel: 15,
    maxPlayers: 300,
    serverLimit: 60,
    rules: [
      { id: 'rule_1', description: '寻宝机制', details: ['在地图中寻找宝箱', '开启宝箱获得奖励'] },
      { id: 'rule_2', description: '竞争机制', details: ['宝箱有限', '先到先得'] },
      { id: 'rule_3', description: '保护机制', details: ['安全区保护', 'PK掉落'] }
    ],
    rewards: [
      { rank: 1, items: [{ itemId: 'treasure_chest_legendary', count: 1 }], gold: 1500000, exp: 800000 },
      { rank: 2, items: [{ itemId: 'treasure_chest_epic', count: 3 }], gold: 800000, exp: 400000 },
      { rank: 3, items: [{ itemId: 'treasure_chest_rare', count: 5 }], gold: 400000, exp: 200000 },
      { rank: -1, items: [{ itemId: 'treasure_key', count: 1 }], gold: 5000, exp: 3000 }
    ]
  },
  // 跨服联盟战
  {
    type: 'alliance_war',
    name: 'Alliance War',
    nameCN: '跨服联盟战',
    description: '服务器联盟之间的战略对战',
    icon: '🗡️',
    duration: 90 * 60 * 1000,
    minLevel: 50,
    maxPlayers: 300,
    serverLimit: 75,
    rules: [
      { id: 'rule_1', description: '联盟对战', details: ['多vs多大规模战斗', '战略目标争夺'] },
      { id: 'rule_2', description: '战略点', details: ['占领据点', '防守要塞'] },
      { id: 'rule_3', description: '胜负判定', details: ['战略点得分', '总击杀得分'] }
    ],
    rewards: [
      { rank: 1, items: [{ itemId: 'alliance_champion_token', count: 1 }], gold: 10000000, exp: 5000000, specialReward: '联盟王者称号' },
      { rank: 2, items: [{ itemId: 'alliance_token', count: 20 }], gold: 5000000, exp: 2500000 },
      { rank: 3, items: [{ itemId: 'alliance_token', count: 10 }], gold: 3000000, exp: 1500000 },
      { rank: -1, items: [{ itemId: 'alliance_token', count: 2 }], gold: 100000, exp: 50000 }
    ]
  }
]

export const CROSS_SERVER_CONFIG = {
  refreshInterval: 5 * 60 * 1000, // 5分钟刷新
  maxRankings: 100,
  rankingUpdateInterval: 10 * 1000, // 10秒更新排名
}

export class CrossServerActivitySystem {
  private activities: Map<string, CrossServerActivity> = new Map()
  private playerRecords: Map<string, PlayerActivityRecord> = new Map()
  private matches: Map<string, CrossServerMatch> = new Map()
  
  // 创建跨服活动
  createActivity(type: CrossServerActivityType, startTime: number): CrossServerActivity | null {
    const config = CROSS_SERVER_ACTIVITY_CONFIGS.find(c => c.type === type)
    if (!config) return null
    
    const endTime = startTime + config.duration
    const registrationStartTime = startTime - 30 * 60 * 1000 // 提前30分钟开始报名
    const registrationEndTime = startTime - 5 * 60 * 1000 // 提前5分钟结束报名
    
    const activity: CrossServerActivity = {
      activityId: `cross_${type}_${startTime}`,
      type,
      name: config.name,
      nameCN: config.nameCN,
      description: config.description,
      icon: config.icon,
      state: 'scheduled',
      startTime,
      endTime,
      registrationStartTime,
      registrationEndTime,
      duration: config.duration,
      minLevel: config.minLevel,
      maxLevel: 999,
      minRealm: '凡人',
      maxPlayers: config.maxPlayers,
      serverLimit: config.serverLimit,
      rules: config.rules,
      rewards: config.rewards,
      rankings: [],
      stats: {
        totalParticipants: 0,
        activePlayers: 0,
        totalMatches: 0,
        totalDamage: 0,
        totalHealing: 0
      }
    }
    
    this.activities.set(activity.activityId, activity)
    return activity
  }
  
  // 获取活动列表
  getActivities(state?: ActivityState): CrossServerActivity[] {
    const all = Array.from(this.activities.values())
    if (state) {
      return all.filter(a => a.state === state)
    }
    return all
  }
  
  // 获取当前活动
  getCurrentActivity(type?: CrossServerActivityType): CrossServerActivity | null {
    const now = Date.now()
    const active = Array.from(this.activities.values()).find(a => 
      a.state === 'active' && now >= a.startTime && now <= a.endTime &&
      (!type || a.type === type)
    )
    return active || null
  }
  
  // 玩家报名
  registerPlayer(playerId: string, activityId: string): { success: boolean; message: string } {
    const activity = this.activities.get(activityId)
    if (!activity) return { success: false, message: '活动不存在' }
    
    const now = Date.now()
    if (now < activity.registrationStartTime || now > activity.registrationEndTime) {
      return { success: false, message: '不在报名时间内' }
    }
    
    const recordKey = `${playerId}_${activityId}`
    if (this.playerRecords.has(recordKey)) {
      return { success: false, message: '已报名' }
    }
    
    if (activity.stats.totalParticipants >= activity.maxPlayers) {
      return { success: false, message: '活动已满' }
    }
    
    const record: PlayerActivityRecord = {
      playerId,
      activityId,
      status: 'registered',
      score: 0,
      rank: 0,
      matches: 0,
      wins: 0,
      losses: 0,
      damage: 0,
      healing: 0,
      lastMatchTime: null,
      joinedAt: now,
      finishedAt: null
    }
    
    this.playerRecords.set(recordKey, record)
    activity.stats.totalParticipants++
    
    return { success: true, message: '报名成功' }
  }
  
  // 玩家进入活动
  enterActivity(playerId: string, activityId: string): { success: boolean; message: string } {
    const activity = this.activities.get(activityId)
    if (!activity) return { success: false, message: '活动不存在' }
    
    const now = Date.now()
    if (now < activity.startTime || now > activity.endTime) {
      return { success: false, message: '活动未开始或已结束' }
    }
    
    const recordKey = `${playerId}_${activityId}`
    const record = this.playerRecords.get(recordKey)
    if (!record) return { success: false, message: '未报名该活动' }
    
    if (record.status !== 'registered' && record.status !== 'participating') {
      return { success: false, message: '无法进入活动' }
    }
    
    record.status = 'participating'
    activity.stats.activePlayers++
    
    return { success: true, message: '进入活动成功' }
  }
  
  // 更新玩家分数
  updatePlayerScore(playerId: string, activityId: string, scoreDelta: number, damage: number = 0, healing: number = 0): void {
    const recordKey = `${playerId}_${activityId}`
    const record = this.playerRecords.get(recordKey)
    if (!record) return
    
    record.score += scoreDelta
    record.damage += damage
    record.healing += healing
    record.lastMatchTime = Date.now()
    
    // 更新活动统计
    const activity = this.activities.get(activityId)
    if (activity) {
      activity.stats.totalDamage += damage
      activity.stats.totalHealing += healing
    }
  }
  
  // 结束玩家活动
  finishPlayerActivity(playerId: string, activityId: string, won: boolean): void {
    const recordKey = `${playerId}_${activityId}`
    const record = this.playerRecords.get(recordKey)
    if (!record) return
    
    record.status = 'finished'
    record.matches++
    if (won) record.wins++
    else record.losses++
    record.finishedAt = Date.now()
    
    const activity = this.activities.get(activityId)
    if (activity) {
      activity.stats.activePlayers--
      activity.stats.totalMatches++
    }
  }
  
  // 更新排名
  updateRankings(activityId: string): void {
    const activity = this.activities.get(activityId)
    if (!activity) return
    
    const records = Array.from(this.playerRecords.values())
      .filter(r => r.activityId === activityId && r.status === 'finished')
      .sort((a, b) => b.score - a.score)
      .slice(0, CROSS_SERVER_CONFIG.maxRankings)
    
    activity.rankings = records.map((r, i) => ({
      playerId: r.playerId,
      playerName: `Player_${r.playerId}`,
      serverId: 'server_1',
      score: r.score,
      rank: i + 1,
      lastUpdateTime: Date.now()
    }))
  }
  
  // 发放奖励
  distributeRewards(activityId: string): { success: boolean; message: string; rewards: Array<{ playerId: string; reward: ActivityReward }> } {
    const activity = this.activities.get(activityId)
    if (!activity) return { success: false, message: '活动不存在', rewards: [] }
    
    const rewards: Array<{ playerId: string; reward: ActivityReward }> = []
    
    // 更新排名
    this.updateRankings(activityId)
    
    // 发放排名奖励
    for (const ranking of activity.rankings) {
      const reward = activity.rewards.find(r => {
        if (r.rank === -1) return true
        return ranking.rank >= r.rank && ranking.rank <= (r.rankEnd || r.rank)
      })
      
      if (reward) {
        rewards.push({ playerId: ranking.playerId, reward })
      }
    }
    
    // 标记已发放奖励
    for (const r of rewards) {
      const recordKey = `${r.playerId}_${activityId}`
      const record = this.playerRecords.get(recordKey)
      if (record) {
        record.status = 'rewarded'
      }
    }
    
    activity.state = 'ended'
    
    return { success: true, message: '奖励发放完成', rewards }
  }
  
  // 玩家获取奖励
  getPlayerReward(playerId: string, activityId: string): ActivityReward | null {
    const activity = this.activities.get(activityId)
    if (!activity) return null
    
    const ranking = activity.rankings.find(r => r.playerId === playerId)
    if (!ranking) return null
    
    return activity.rewards.find(r => {
      if (r.rank === -1) return true
      return ranking.rank >= r.rank && ranking.rank <= (r.rankEnd || r.rank)
    }) || null
  }
  
  // 获取玩家活动记录
  getPlayerRecord(playerId: string, activityId: string): PlayerActivityRecord | null {
    return this.playerRecords.get(`${playerId}_${activityId}`) || null
  }
  
  // 获取活动排名
  getActivityRankings(activityId: string, limit: number = 10): ActivityRanking[] {
    const activity = this.activities.get(activityId)
    if (!activity) return []
    
    return activity.rankings.slice(0, limit)
  }
  
  // 活动状态检查
  checkActivityStates(): void {
    const now = Date.now()
    
    for (const activity of this.activities.values()) {
      if (activity.state === 'scheduled' && now >= activity.registrationStartTime) {
        activity.state = 'registration'
      }
      if (activity.state === 'registration' && now >= activity.startTime) {
        activity.state = 'active'
      }
      if (activity.state === 'active' && now >= activity.endTime) {
        activity.state = 'settlement'
        this.distributeRewards(activity.activityId)
      }
    }
  }
}

// 导出单例
export const crossServerActivitySystem = new CrossServerActivitySystem()
