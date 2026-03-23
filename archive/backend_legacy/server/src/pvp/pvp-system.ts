// PVP战斗系统 - 实时玩家对战
// 支持1v1、3v3等实时PVP模式

export interface PVPMatch {
  matchId: string
  mode: '1v1' | '3v3' | '5v5'
  teamA: string[]  // 玩家ID数组
  teamB: string[]
  status: 'waiting' | 'fighting' | 'finished'
  startTime: number
  endTime?: number
  winner?: 'A' | 'B' | 'draw'
  scores: { [playerId: string]: number }  // 伤害/得分
}

export interface PVPMatchResult {
  matchId: string
  winner: 'A' | 'B' | 'draw'
  rewards: { playerId: string, exp: number, gold: number, honor: number }[]
  mvp?: string
}

export interface PVPConfig {
  // 匹配等待超时
  matchTimeout: number
  // 队伍平衡最大等级差
  levelDiffLimit: number
  // 奖励配置
  rewards: {
    win: { exp: number, gold: number, honor: number }
    lose: { exp: number, gold: number, honor: number }
    mvpBonus: number
  }
  // 赛季时长
  seasonDuration: number
}

// PVP模式配置
export const PVP_MODES = {
  '1v1': { name: '1v1对决', minPlayers: 1, maxPlayers: 1, teamSize: 1 },
  '3v3': { name: '3v3竞技', minPlayers: 3, maxPlayers: 3, teamSize: 3 },
  '5v5': { name: '5v5团战', minPlayers: 5, maxPlayers: 5, teamSize: 5 },
}

// 默认配置
const DEFAULT_PVP_CONFIG: PVPConfig = {
  matchTimeout: 3 * 60 * 1000, // 3分钟匹配超时
  levelDiffLimit: 10,
  rewards: {
    win: { exp: 100, gold: 50, honor: 10 },
    lose: { exp: 30, gold: 15, honor: 3 },
    mvpBonus: 5,
  },
  seasonDuration: 7 * 24 * 60 * 60 * 1000, // 7天赛季
}

export class PVPSystem {
  private config: PVPConfig
  private matches: Map<string, PVPMatch> = new Map()
  private queue: { playerId: string, mode: string, level: number, timestamp: number }[] = []
  private matchCounter: number = 0
  private currentSeasonId: string = 'pvp_season_1'
  private currentSeasonStart: number = Date.now()
  private playerStats: Map<string, { wins: number, losses: number, honor: number }> = new Map()

  constructor(config: Partial<PVPConfig> = {}) {
    this.config = { ...DEFAULT_PVP_CONFIG, ...config }
  }

  // 加入匹配队列
  joinQueue(playerId: string, mode: '1v1' | '3v3' | '5v5', playerLevel: number): { success: boolean, message: string, matchId?: string } {
    // 检查是否已在队列
    const existingIndex = this.queue.findIndex(q => q.playerId === playerId)
    if (existingIndex !== -1) {
      return { success: false, message: '已在匹配队列中' }
    }

    this.queue.push({
      playerId,
      mode,
      level: playerLevel,
      timestamp: Date.now()
    })

    // 尝试匹配
    return this.tryMatch()
  }

  // 离开匹配队列
  leaveQueue(playerId: string): boolean {
    const index = this.queue.findIndex(q => q.playerId === playerId)
    if (index !== -1) {
      this.queue.splice(index, 1)
      return true
    }
    return false
  }

  // 尝试匹配对手
  private tryMatch(): { success: boolean, message: string, matchId?: string } {
    if (this.queue.length < 2) {
      return { success: true, message: '已加入匹配队列，等待对手...' }
    }

    // 按模式分组
    const modeGroups = {
      '1v1': this.queue.filter(q => q.mode === '1v1'),
      '3v3': this.queue.filter(q => q.mode === '3v3'),
      '5v5': this.queue.filter(q => q.mode === '5v5'),
    }

    // 优先匹配3v3和5v5
    for (const mode of ['5v5', '3v3', '1v1'] as const) {
      const group = modeGroups[mode]
      if (group.length >= PVP_MODES[mode].teamSize * 2) {
        return this.createMatch(group.splice(0, PVP_MODES[mode].teamSize * 2))
      }
    }

    return { success: true, message: '已加入匹配队列，等待对手...' }
  }

  // 创建比赛
  private createMatch(players: { playerId: string, mode: string, level: number, timestamp: number }[]): { success: boolean, message: string, matchId?: string } {
    const mode = players[0].mode as '1v1' | '3v3' | '5v5'
    const teamSize = PVP_MODES[mode].teamSize
    
    const matchId = `pvp_${++this.matchCounter}_${Date.now()}`
    
    // 简单分配：前一半Team A，后一半Team B
    const teamA = players.slice(0, teamSize).map(p => p.playerId)
    const teamB = players.slice(teamSize, teamSize * 2).map(p => p.playerId)

    const match: PVPMatch = {
      matchId,
      mode,
      teamA,
      teamB,
      status: 'fighting',
      startTime: Date.now(),
      scores: {}
    }

    // 初始化所有玩家分数
    [...teamA, ...teamB].forEach(pid => {
      match.scores[pid] = 0
    })

    this.matches.set(matchId, match)
    
    // 从队列中移除
    players.forEach(p => {
      const idx = this.queue.findIndex(q => q.playerId === p.playerId)
      if (idx !== -1) this.queue.splice(idx, 1)
    })

    return { success: true, message: `匹配成功！比赛已开始`, matchId }
  }

  // 更新玩家得分/伤害
  updateScore(matchId: string, playerId: string, score: number): boolean {
    const match = this.matches.get(matchId)
    if (!match || match.status !== 'fighting') return false
    
    match.scores[playerId] = (match.scores[playerId] || 0) + score
    return true
  }

  // 结束比赛
  finishMatch(matchId: string, winner: 'A' | 'B' | 'draw'): PVPMatchResult | null {
    const match = this.matches.get(matchId)
    if (!match || match.status !== 'fighting') return null

    match.status = 'finished'
    match.endTime = Date.now()
    match.winner = winner

    // 计算MVP
    let mvp: string | undefined
    let maxScore = -1
    Object.entries(match.scores).forEach(([pid, score]) => {
      if (score > maxScore) {
        maxScore = score
        mvp = pid
      }
    })

    // 生成奖励
    const rewards: { playerId: string, exp: number, gold: number, honor: number }[] = []
    const allPlayers = [...match.teamA, ...match.teamB]
    const isWinnerTeam = (pid: string) => {
      if (winner === 'draw') return false
      return (winner === 'A' && match.teamA.includes(pid)) || 
             (winner === 'B' && match.teamB.includes(pid))
    }

    allPlayers.forEach(pid => {
      const won = isWinnerTeam(pid)
      const isMvp = pid === mvp
      const baseReward = won ? this.config.rewards.win : this.config.rewards.lose
      
      rewards.push({
        playerId: pid,
        exp: baseReward.exp,
        gold: baseReward.gold,
        honor: baseReward.honor + (isMvp ? this.config.rewards.mvpBonus : 0)
      })

      // 更新玩家统计
      const stats = this.playerStats.get(pid) || { wins: 0, losses: 0, honor: 0 }
      if (won) stats.wins++
      else stats.losses++
      stats.honor += baseReward.honor + (isMvp ? this.config.rewards.mvpBonus : 0)
      this.playerStats.set(pid, stats)
    })

    return {
      matchId,
      winner,
      rewards,
      mvp
    }
  }

  // 获取比赛信息
  getMatch(matchId: string): PVPMatch | undefined {
    return this.matches.get(matchId)
  }

  // 获取玩家PVP统计
  getPlayerStats(playerId: string): { wins: number, losses: number, honor: number } | undefined {
    return this.playerStats.get(playerId)
  }

  // 获取匹配队列状态
  getQueueStatus(): { total: number, byMode: { [mode: string]: number } } {
    const byMode: { [mode: string]: number } = {
      '1v1': 0,
      '3v3': 0,
      '5v5': 0,
    }
    
    this.queue.forEach(q => {
      byMode[q.mode]++
    })

    return {
      total: this.queue.length,
      byMode
    }
  }

  // 获取所有进行中的比赛
  getActiveMatches(): PVPMatch[] {
    return Array.from(this.matches.values()).filter(m => m.status === 'fighting')
  }

  // 清理超时匹配
  cleanTimeoutMatches(): string[] {
    const now = Date.now()
    const timeoutIds: string[] = []
    
    this.matches.forEach((match, matchId) => {
      if (match.status === 'waiting' && now - match.startTime > this.config.matchTimeout) {
        timeoutIds.push(matchId)
      }
    })

    timeoutIds.forEach(id => this.matches.delete(id))
    return timeoutIds
  }
}

export default PVPSystem
