// 战斗副本系统 - 单人副本和组队副本

export interface Dungeon {
  dungeonId: string
  name: string
  nameCN: string
  type: 'solo' | 'team' | 'elite' | 'boss'
  difficulty: number // 1-10
  levelRequired: number
  recommendedPower: number // 推荐战力
  energyCost: number // 精力消耗
  entryCount: number // 每日进入次数
  resetType: 'daily' | 'weekly' | 'manual'
  rewards: DungeonReward[]
  stages: DungeonStage[]
  timeLimit?: number // 时间限制(秒)
  isTeamDungeon?: boolean // 是否需要组队
  teamSize?: number // 队伍人数要求
}

export interface DungeonReward {
  type: 'item' | 'currency' | 'exp' | 'spirit' | 'equipment'
  itemId?: string
  amount: number
  dropRate: number // 掉落概率 0-1
}

export interface DungeonStage {
  stageId: string
  name: string
  order: number
  enemies: Enemy[]
  boss?: Enemy
  rewardMultiplier: number
}

export interface Enemy {
  enemyId: string
  name: string
  level: number
  hp: number
  attack: number
  defense: number
  skills?: string[]
  ai?: 'normal' | 'aggressive' | 'defensive'
  dropTable?: string
}

export interface PlayerDungeonRecord {
  playerId: string
  dungeonId: string
  enterCount: number // 今日进入次数
  lastEnterTime: number
  completedStages: string[] // 已完成的关卡
  bestTime?: number // 最佳通关时间
  bestScore?: number // 最高评分
  resetTime?: number
}

export interface TeamDungeonState {
  dungeonId: string
  teamId: string
  stageIndex: number
  currentWave: number
  players: TeamDungeonPlayer[]
  startTime: number
  isComplete: boolean
  rewards: DungeonReward[]
}

export interface TeamDungeonPlayer {
  playerId: string
  name: string
  role: 'tank' | 'dps' | 'healer' | 'support'
  isAlive: boolean
  contribution: number // 贡献度
  damage: number
  healing: number
}

// 副本配置
export const DUNGEONS: Dungeon[] = [
  // ========== 单人副本 ==========
  {
    dungeonId: 'solo_trial',
    name: 'Trial Dungeon',
    nameCN: '试炼副本',
    type: 'solo',
    difficulty: 1,
    levelRequired: 1,
    recommendedPower: 100,
    energyCost: 10,
    entryCount: 10,
    resetType: 'daily',
    rewards: [
      { type: 'exp', amount: 100, dropRate: 1 },
      { type: 'spirit', amount: 50, dropRate: 1 },
      { type: 'item', itemId: 'trial_token', amount: 1, dropRate: 0.3 }
    ],
    stages: [
      {
        stageId: 'trial_1',
        name: '初试身手',
        order: 1,
        enemies: [
          { enemyId: 'cultivator_1', name: '初级修士', level: 1, hp: 500, attack: 50, defense: 10 }
        ],
        rewardMultiplier: 1
      },
      {
        stageId: 'trial_2',
        name: '小试牛刀',
        order: 2,
        enemies: [
          { enemyId: 'cultivator_2', name: '中级修士', level: 3, hp: 800, attack: 80, defense: 20 }
        ],
        rewardMultiplier: 1.2
      },
      {
        stageId: 'trial_3',
        name: '锋芒毕露',
        order: 3,
        enemies: [
          { enemyId: 'cultivator_3', name: '高级修士', level: 5, hp: 1200, attack: 120, defense: 30 }
        ],
        boss: { enemyId: 'trial_boss', name: '试炼守卫', level: 6, hp: 3000, attack: 150, defense: 40 },
        rewardMultiplier: 1.5
      }
    ],
    timeLimit: 300
  },
  {
    dungeonId: 'solo_cave',
    name: 'Spirit Cave',
    nameCN: '灵洞探险',
    type: 'solo',
    difficulty: 3,
    levelRequired: 20,
    recommendedPower: 2000,
    energyCost: 20,
    entryCount: 5,
    resetType: 'daily',
    rewards: [
      { type: 'exp', amount: 500, dropRate: 1 },
      { type: 'spirit', amount: 200, dropRate: 1 },
      { type: 'item', itemId: 'spirit_stone', amount: 10, dropRate: 0.5 }
    ],
    stages: [
      {
        stageId: 'cave_1',
        name: '洞口探索',
        order: 1,
        enemies: [
          { enemyId: 'cave_slime', name: '洞穴史莱姆', level: 20, hp: 3000, attack: 200, defense: 50 },
          { enemyId: 'cave_bat', name: '洞穴蝙蝠', level: 21, hp: 2500, attack: 250, defense: 40 }
        ],
        rewardMultiplier: 1
      },
      {
        stageId: 'cave_2',
        name: '深入洞穴',
        order: 2,
        enemies: [
          { enemyId: 'cave_snake', name: '剧毒妖蛇', level: 22, hp: 4000, attack: 300, defense: 60 },
          { enemyId: 'cave_spider', name: '洞穴蜘蛛', level: 23, hp: 3500, attack: 280, defense: 55 }
        ],
        rewardMultiplier: 1.3
      },
      {
        stageId: 'cave_3',
        name: '洞穴深处',
        order: 3,
        enemies: [
          { enemyId: 'cave_goblin', name: '洞穴 goblin', level: 24, hp: 5000, attack: 350, defense: 70 }
        ],
        boss: { enemyId: 'cave_boss', name: '洞穴之王', level: 25, hp: 15000, attack: 500, defense: 100 },
        rewardMultiplier: 1.6
      }
    ],
    timeLimit: 600
  },
  // ========== 组队副本 ==========
  {
    dungeonId: 'team_boss',
    name: 'World Boss Raid',
    nameCN: '世界Boss讨伐',
    type: 'team',
    difficulty: 5,
    levelRequired: 40,
    recommendedPower: 10000,
    energyCost: 50,
    entryCount: 1,
    resetType: 'daily',
    rewards: [
      { type: 'exp', amount: 2000, dropRate: 1 },
      { type: 'spirit', amount: 1000, dropRate: 1 },
      { type: 'equipment', itemId: 'boss_epic', amount: 1, dropRate: 0.1 }
    ],
    stages: [
      {
        stageId: 'boss_1',
        name: 'Boss战',
        order: 1,
        enemies: [],
        boss: { enemyId: 'world_boss', name: '远古巨兽', level: 45, hp: 100000, attack: 1000, defense: 300 },
        rewardMultiplier: 1
      }
    ],
    timeLimit: 900,
    isTeamDungeon: true,
    teamSize: 3
  },
  {
    dungeonId: 'team_tower',
    name: 'Tower Challenge',
    nameCN: '通天塔',
    type: 'team',
    difficulty: 8,
    levelRequired: 50,
    recommendedPower: 20000,
    energyCost: 30,
    entryCount: 3,
    resetType: 'daily',
    rewards: [
      { type: 'exp', amount: 3000, dropRate: 1 },
      { type: 'spirit', amount: 1500, dropRate: 1 },
      { type: 'item', itemId: 'tower_token', amount: 5, dropRate: 0.8 }
    ],
    stages: [
      {
        stageId: 'tower_1',
        name: '第一层',
        order: 1,
        enemies: [
          { enemyId: 'tower_soldier_1', name: '塔卫', level: 50, hp: 8000, attack: 500, defense: 150 },
          { enemyId: 'tower_soldier_2', name: '塔卫', level: 50, hp: 8000, attack: 500, defense: 150 }
        ],
        rewardMultiplier: 1
      },
      {
        stageId: 'tower_2',
        name: '第二层',
        order: 2,
        enemies: [
          { enemyId: 'tower_mage_1', name: '塔法师', level: 52, hp: 6000, attack: 800, defense: 100 },
          { enemyId: 'tower_mage_2', name: '塔法师', level: 52, hp: 6000, attack: 800, defense: 100 }
        ],
        rewardMultiplier: 1.2
      },
      {
        stageId: 'tower_3',
        name: '第三层',
        order: 3,
        enemies: [
          { enemyId: 'tower_elite_1', name: '塔精英', level: 54, hp: 12000, attack: 700, defense: 200 }
        ],
        boss: { enemyId: 'tower_boss', name: '守关长老', level: 55, hp: 30000, attack: 1200, defense: 300 },
        rewardMultiplier: 1.5
      }
    ],
    timeLimit: 1200,
    isTeamDungeon: true,
    teamSize: 3
  },
  // ========== 精英副本 ==========
  {
    dungeonId: 'elite_sect',
    name: 'Sect War',
    nameCN: '宗门战争',
    type: 'elite',
    difficulty: 7,
    levelRequired: 60,
    recommendedPower: 30000,
    energyCost: 80,
    entryCount: 1,
    resetType: 'weekly',
    rewards: [
      { type: 'exp', amount: 5000, dropRate: 1 },
      { type: 'spirit', amount: 3000, dropRate: 1 },
      { type: 'equipment', itemId: 'sect_rare', amount: 1, dropRate: 0.2 }
    ],
    stages: [
      {
        stageId: 'sect_1',
        name: '进攻山门',
        order: 1,
        enemies: [
          { enemyId: 'sect_disciple', name: '宗门弟子', level: 60, hp: 15000, attack: 1000, defense: 300 },
          { enemyId: 'sect_disciple', name: '宗门弟子', level: 60, hp: 15000, attack: 1000, defense: 300 },
          { enemyId: 'sect_disciple', name: '宗门弟子', level: 60, hp: 15000, attack: 1000, defense: 300 }
        ],
        rewardMultiplier: 1
      },
      {
        stageId: 'sect_2',
        name: '激战正殿',
        order: 2,
        enemies: [
          { enemyId: 'sect_elder', name: '宗门长老', level: 62, hp: 25000, attack: 1500, defense: 400 }
        ],
        boss: { enemyId: 'sect_leader', name: '宗主', level: 65, hp: 50000, attack: 2000, defense: 500 },
        rewardMultiplier: 1.5
      }
    ],
    timeLimit: 1800,
    isTeamDungeon: true,
    teamSize: 5
  }
]

export const DUNGEON_CONFIG = {
  // 精力恢复 (每分钟恢复点数)
  energyRegenPerMinute: 1,
  
  // 最大精力上限
  maxEnergy: 100,
  
  // 队伍最大人数
  maxTeamSize: 5,
  
  // 队伍最小人数
  minTeamSize: 2,
  
  // 副本准备时间 (秒)
  prepareTime: 30,
  
  // 战斗失败保护 (连续失败减少惩罚)
  failProtection: {
    enabled: true,
    maxProtectedFails: 3,
    recoveryHours: 2
  },
  
  // 扫荡功能
  sweep: {
    enabled: true,
    maxSweepCount: 5,
    requiredVIP: 0
  },
  
  // 托管战斗
  autoBattle: {
    enabled: true,
    defaultEnabled: false
  }
}

export class DungeonSystem {
  private playerRecords: Map<string, Map<string, PlayerDungeonRecord>> = new Map()
  private teamDungeonStates: Map<string, TeamDungeonState> = new Map()
  
  // 获取玩家副本记录
  getPlayerRecord(playerId: string, dungeonId: string): PlayerDungeonRecord {
    if (!this.playerRecords.has(playerId)) {
      this.playerRecords.set(playerId, new Map())
    }
    
    const playerDungeons = this.playerRecords.get(playerId)!
    if (!playerDungeons.has(dungeonId)) {
      const newRecord: PlayerDungeonRecord = {
        playerId,
        dungeonId,
        enterCount: 0,
        lastEnterTime: 0,
        completedStages: []
      }
      playerDungeons.set(dungeonId, newRecord)
    }
    
    return playerDungeons.get(dungeonId)!
  }
  
  // 获取副本信息
  getDungeon(dungeonId: string): Dungeon | null {
    return DUNGEONS.find(d => d.dungeonId === dungeonId) || null
  }
  
  // 获取所有副本列表
  getDungeonList(type?: 'solo' | 'team' | 'elite' | 'boss'): Dungeon[] {
    if (type) {
      return DUNGEONS.filter(d => d.type === type)
    }
    return DUNGEONS
  }
  
  // 检查是否可以进入副本
  canEnterDungeon(playerId: string, dungeonId: string, playerLevel: number, playerPower: number): { can: boolean; reason?: string } {
    const dungeon = this.getDungeon(dungeonId)
    if (!dungeon) {
      return { can: false, reason: '副本不存在' }
    }
    
    // 检查等级
    if (playerLevel < dungeon.levelRequired) {
      return { can: false, reason: `需要等级${dungeon.levelRequired}` }
    }
    
    // 检查次数
    const record = this.getPlayerRecord(playerId, dungeonId)
    this.checkAndResetRecord(record, dungeon.resetType)
    
    if (record.enterCount >= dungeon.entryCount) {
      return { can: false, reason: '今日进入次数已用完' }
    }
    
    return { can: true }
  }
  
  // 检查并重置记录
  checkAndResetRecord(record: PlayerDungeonRecord, resetType: 'daily' | 'weekly' | 'manual'): void {
    const now = Date.now()
    const lastReset = record.resetTime || 0
    
    if (resetType === 'daily') {
      const lastDate = new Date(record.lastEnterTime).toDateString()
      const today = new Date().toDateString()
      if (lastDate !== today) {
        record.enterCount = 0
        record.completedStages = []
        record.resetTime = now
      }
    } else if (resetType === 'weekly') {
      const lastWeek = Math.floor(lastReset / (7 * 24 * 60 * 60 * 1000))
      const currentWeek = Math.floor(now / (7 * 24 * 60 * 60 * 1000))
      if (lastWeek !== currentWeek) {
        record.enterCount = 0
        record.completedStages = []
        record.resetTime = now
      }
    }
  }
  
  // 进入单人副本
  enterSoloDungeon(playerId: string, dungeonId: string): {
    success: boolean
    dungeon?: Dungeon
    stage?: DungeonStage
    message: string
  } {
    const check = this.canEnterDungeon(playerId, dungeonId, 1, 0)
    if (!check.can) {
      return { success: false, message: check.reason || '无法进入' }
    }
    
    const dungeon = this.getDungeon(dungeonId)!
    const record = this.getPlayerRecord(playerId, dungeonId)
    
    // 如果没有完成第一关，从第一关开始
    let stageIndex = record.completedStages.length
    if (stageIndex >= dungeon.stages.length) {
      stageIndex = 0 // 重新开始
      record.completedStages = []
    }
    
    // 更新记录
    record.enterCount++
    record.lastEnterTime = Date.now()
    
    return {
      success: true,
      dungeon,
      stage: dungeon.stages[stageIndex],
      message: `进入${dungeon.nameCN} - ${dungeon.stages[stageIndex].name}`
    }
  }
  
  // 完成副本关卡
  completeStage(playerId: string, dungeonId: string, stageId: string, time: number, score: number): {
    success: boolean
    rewards: DungeonReward[]
    nextStage?: DungeonStage
    isComplete: boolean
    message: string
  } {
    const dungeon = this.getDungeon(dungeonId)
    const record = this.getPlayerRecord(playerId, dungeonId)
    
    if (!dungeon) {
      return { success: false, rewards: [], message: '副本不存在' }
    }
    
    const stage = dungeon.stages.find(s => s.stageId === stageId)
    if (!stage) {
      return { success: false, rewards: [], message: '关卡不存在' }
    }
    
    // 添加已完成关卡
    if (!record.completedStages.includes(stageId)) {
      record.completedStages.push(stageId)
    }
    
    // 更新最佳记录
    if (!record.bestTime || time < record.bestTime) {
      record.bestTime = time
    }
    if (!record.bestScore || score > record.bestScore) {
      record.bestScore = score
    }
    
    // 计算奖励
    const rewards = this.calculateRewards(stage, score)
    
    // 检查是否完成所有关卡
    const isComplete = record.completedStages.length >= dungeon.stages.length
    
    // 获取下一关
    let nextStage: DungeonStage | undefined
    const nextIndex = dungeon.stages.findIndex(s => s.stageId === stageId) + 1
    if (nextIndex < dungeon.stages.length) {
      nextStage = dungeon.stages[nextIndex]
    }
    
    return {
      success: true,
      rewards,
      nextStage,
      isComplete,
      message: isComplete ? '恭喜通关!' : `完成${stage.name}, 下一关: ${nextStage?.name || '无'}`
    }
  }
  
  // 计算奖励
  calculateRewards(stage: DungeonStage, score: number): DungeonReward[] {
    const baseMultiplier = stage.rewardMultiplier
    const scoreMultiplier = 1 + (score / 1000) // 评分越高加成越多
    
    return stage.rewardMultiplier > 0 ? [] as DungeonReward[] : []
  }
  
  // 创建队伍副本
  createTeamDungeon(dungeonId: string, teamId: string, players: { playerId: string; name: string; role: string }[]): {
    success: boolean
    state?: TeamDungeonState
    message: string
  } {
    const dungeon = this.getDungeon(dungeonId)
    if (!dungeon) {
      return { success: false, message: '副本不存在' }
    }
    
    if (!dungeon.isTeamDungeon) {
      return { success: false, message: '该副本不是组队副本' }
    }
    
    if (players.length < (dungeon.teamSize || DUNGEON_CONFIG.minTeamSize)) {
      return { success: false, message: `需要至少${dungeon.teamSize || DUNGEON_CONFIG.minTeamSize}人组队` }
    }
    
    const teamPlayers: TeamDungeonPlayer[] = players.map(p => ({
      playerId: p.playerId,
      name: p.name,
      role: p.role as 'tank' | 'dps' | 'healer' | 'support',
      isAlive: true,
      contribution: 0,
      damage: 0,
      healing: 0
    }))
    
    const state: TeamDungeonState = {
      dungeonId,
      teamId,
      stageIndex: 0,
      currentWave: 0,
      players: teamPlayers,
      startTime: Date.now(),
      isComplete: false,
      rewards: []
    }
    
    this.teamDungeonStates.set(teamId, state)
    
    return {
      success: true,
      state,
      message: `队伍进入${dungeon.nameCN}, 第一关: ${dungeon.stages[0].name}`
    }
  }
  
  // 获取队伍副本状态
  getTeamDungeonState(teamId: string): TeamDungeonState | null {
    return this.teamDungeonStates.get(teamId) || null
  }
  
  // 更新队伍副本状态
  updateTeamDungeonState(teamId: string, updates: Partial<TeamDungeonState>): boolean {
    const state = this.teamDungeonStates.get(teamId)
    if (!state) return false
    
    Object.assign(state, updates)
    return true
  }
  
  // 队伍副本完成关卡
  completeTeamStage(teamId: string, damageRecords: { playerId: string; damage: number; healing: number }[]): {
    success: boolean
    rewards: DungeonReward[]
    nextStage?: DungeonStage
    isComplete: boolean
    message: string
  } {
    const state = this.teamDungeonStates.get(teamId)
    if (!state) {
      return { success: false, rewards: [], message: '队伍副本不存在' }
    }
    
    const dungeon = this.getDungeon(state.dungeonId)
    if (!dungeon) {
      return { success: false, rewards: [], message: '副本配置错误' }
    }
    
    // 更新玩家贡献
    for (const record of damageRecords) {
      const player = state.players.find(p => p.playerId === record.playerId)
      if (player) {
        player.damage += record.damage
        player.healing += record.healing
        player.contribution += record.damage + record.healing
      }
    }
    
    // 检查是否完成当前关卡
    state.currentWave++
    
    // 检查是否完成所有关卡
    if (state.stageIndex >= dungeon.stages.length - 1 && state.currentWave >= 1) {
      state.isComplete = true
      
      // 计算奖励 - 根据贡献分配
      const totalContribution = state.players.reduce((sum, p) => sum + p.contribution, 0)
      const rewards = dungeon.stages.flatMap(s => s.rewardMultiplier > 0 ? s.rewardMultiplier as any : [])
      
      return {
        success: true,
        rewards: [],
        isComplete: true,
        message: '恭喜通关!'
      }
    }
    
    // 进入下一关
    state.stageIndex++
    state.currentWave = 0
    
    const nextStage = dungeon.stages[state.stageIndex]
    
    return {
      success: true,
      rewards: [],
      nextStage,
      isComplete: false,
      message: `完成关卡, 下一关: ${nextStage.name}`
    }
  }
  
  // 扫荡功能
  sweepDungeon(playerId: string, dungeonId: string, count: number): {
    success: boolean
    totalRewards: DungeonReward[]
    message: string
  } {
    const dungeon = this.getDungeon(dungeonId)
    if (!dungeon) {
      return { success: false, totalRewards: [], message: '副本不存在' }
    }
    
    const record = this.getPlayerRecord(playerId, dungeonId)
    const availableSweeps = Math.min(
      DUNGEON_CONFIG.sweep.maxSweepCount - record.enterCount,
      count
    )
    
    if (availableSweeps <= 0) {
      return { success: false, totalRewards: [], message: '没有可扫荡的次数' }
    }
    
    // 计算扫荡奖励 (使用历史最佳记录)
    const baseRewards = dungeon.stages.flatMap(s => s.rewardMultiplier > 0 ? [] : [])
    const multiplier = record.bestScore ? 1 + (record.bestScore / 1000) : 1
    
    const totalRewards = baseRewards.map(r => ({
      ...r,
      amount: Math.floor(r.amount * multiplier * availableSweeps)
    }))
    
    record.enterCount += availableSweeps
    
    return {
      success: true,
      totalRewards,
      message: `扫荡${availableSweeps}次, 获得奖励`
    }
  }
}

export const dungeonSystem = new DungeonSystem()
