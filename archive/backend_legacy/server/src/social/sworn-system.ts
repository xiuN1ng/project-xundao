// 结义系统 - 结拜兄弟功能
// 桃园三结义、兄弟buff、互助任务

export interface SwornRelation {
  relationId: string
  name: string           // 帮派名称，如"桃园结义"
  leaderId: string       // 发起人/老大
  memberIds: string[]    // 成员ID列表
  startTime: number
  status: 'active' | 'disbanded'
  level: number          // 结义等级
  totalContribution: number  // 总贡献度
}

export interface SwornApplication {
  applicationId: string
  relationId: string
  applicantId: string
  message: string
  applyTime: number
  status: 'pending' | 'accepted' | 'rejected'
}

export interface SwornBuff {
  buffId: string
  name: string
  nameCN: string
  description: string
  levelReq: number
  attributes: {
    attack?: number
    defense?: number
    hp?: number
    exp?: number
    drop?: number
  }
}

export interface SwornTask {
  taskId: string
  taskName: string
  taskNameCN: string
  description: string
  type: 'daily' | 'weekly'
  requirements: number
  rewards: {
    contribution: number
    exp: number
    gold: number
  }
}

export interface SwornConfig {
  // 结义人数限制
  minMembers: number
  maxMembers: number
  // 等级限制
  minLevel: number
  // 任务刷新时间
  taskRefreshTime: number
  // 解散条件
  disbandDays: number
}

// 结义BUFF配置
export const SWORN_BUFFS: SwornBuff[] = [
  {
    buffId: 'brotherhood_1',
    name: 'Brotherhood I',
    nameCN: '兄弟同心I',
    description: '全体成员攻击+5%',
    levelReq: 1,
    attributes: { attack: 5 }
  },
  {
    buffId: 'brotherhood_2',
    name: 'Brotherhood II',
    nameCN: '兄弟同心II',
    description: '全体成员攻击+10%，防御+5%',
    levelReq: 3,
    attributes: { attack: 10, defense: 5 }
  },
  {
    buffId: 'brotherhood_3',
    name: 'Brotherhood III',
    nameCN: '桃园结义',
    description: '全体成员攻击+15%，防御+10%，经验+10%',
    levelReq: 5,
    attributes: { attack: 15, defense: 10, exp: 10 }
  },
  {
    buffId: 'brotherhood_4',
    name: 'Brotherhood IV',
    nameCN: '义薄云天',
    description: '全体成员攻击+20%，防御+15%，经验+15%，掉落+10%',
    levelReq: 7,
    attributes: { attack: 20, defense: 15, exp: 15, drop: 10 }
  },
  {
    buffId: 'brotherhood_5',
    name: 'Brotherhood V',
    nameCN: '不朽传奇',
    description: '全体成员攻击+30%，防御+20%，经验+20%，掉落+15%',
    levelReq: 10,
    attributes: { attack: 30, defense: 20, exp: 20, drop: 15 }
  },
]

// 结义任务配置
export const SWORN_TASKS: SwornTask[] = [
  {
    taskId: 'daily_dungeon',
    taskName: 'Daily Dungeon',
    taskNameCN: '副本挑战',
    description: '共同完成1次副本',
    type: 'daily',
    requirements: 1,
    rewards: { contribution: 20, exp: 50, gold: 30 }
  },
  {
    taskId: 'daily_pvp',
    taskName: 'Daily PVP',
    taskNameCN: '竞技挑战',
    description: '共同完成3场PVP',
    type: 'daily',
    requirements: 3,
    rewards: { contribution: 30, exp: 80, gold: 50 }
  },
  {
    taskId: 'weekly_boss',
    taskName: 'Weekly Boss',
    taskNameCN: '讨伐BOSS',
    description: '共同击败1个世界BOSS',
    type: 'weekly',
    requirements: 1,
    rewards: { contribution: 100, exp: 300, gold: 200 }
  },
  {
    taskId: 'weekly_arena',
    taskName: 'Weekly Arena',
    taskNameCN: '竞技场称霸',
    description: '在竞技场累计获得10场胜利',
    type: 'weekly',
    requirements: 10,
    rewards: { contribution: 80, exp: 250, gold: 150 }
  },
]

// 默认配置
const DEFAULT_SWORN_CONFIG: SwornConfig = {
  minMembers: 2,
  maxMembers: 5,
  minLevel: 15,
  taskRefreshTime: 24 * 60 * 60 * 1000,
  disbandDays: 7
}

export class SwornSystem {
  private config: SwornConfig
  private relations: Map<string, SwornRelation> = new Map()
  private applications: Map<string, SwornApplication[]> = new Map()
  private playerRelations: Map<string, string> = new Map()  // playerId -> relationId
  private memberContribution: Map<string, Map<string, number>> = new Map()  // relationId -> playerId -> contribution

  constructor(config: Partial<SwornConfig> = {}) {
    this.config = { ...DEFAULT_SWORN_CONFIG, ...config }
  }

  // 创建结义
  createSworn(leaderId: string, name: string, memberIds: string[]): { success: boolean, message: string, relationId?: string } {
    // 检查等级
    // const leaderLevel = this.getPlayerLevel(leaderId)
    // if (leaderLevel < this.config.minLevel) {
    //   return { success: false, message: `等级不足，需要达到${this.config.minLevel}级` }
    // }

    const allMembers = [leaderId, ...memberIds]

    // 检查人数
    if (allMembers.length < this.config.minMembers) {
      return { success: false, message: `至少需要${this.config.minMembers}人才能结义` }
    }
    if (allMembers.length > this.config.maxMembers) {
      return { success: false, message: `最多${this.config.maxMembers}人结义` }
    }

    // 检查是否已有结义关系
    for (const mid of allMembers) {
      if (this.playerRelations.has(mid)) {
        return { success: false, message: '已有结义关系' }
      }
    }

    // 创建结义关系
    const relationId = `sworn_${Date.now()}`
    const relation: SwornRelation = {
      relationId,
      name,
      leaderId,
      memberIds: allMembers,
      startTime: Date.now(),
      status: 'active',
      level: 1,
      totalContribution: 0
    }

    this.relations.set(relationId, relation)

    // 建立玩家关系映射
    allMembers.forEach(mid => {
      this.playerRelations.set(mid, relationId)
    })

    // 初始化贡献度
    this.memberContribution.set(relationId, new Map())
    allMembers.forEach(mid => {
      this.memberContribution.get(relationId)!.set(mid, 0)
    })

    return { success: true, message: `结义成功：${name}`, relationId }
  }

  // 申请加入结义
  applyToJoin(applicantId: string, relationId: string, message: string = ''): { success: boolean, message: string } {
    const relation = this.relations.get(relationId)
    if (!relation || relation.status !== 'active') {
      return { success: false, message: '结义不存在' }
    }

    if (relation.memberIds.length >= this.config.maxMembers) {
      return { success: false, message: '结义人数已满' }
    }

    if (this.playerRelations.has(applicantId)) {
      return { success: false, message: '已有结义关系' }
    }

    const application: SwornApplication = {
      applicationId: `app_${Date.now()}_${applicantId}`,
      relationId,
      applicantId,
      message,
      applyTime: Date.now(),
      status: 'pending'
    }

    if (!this.applications.has(relationId)) {
      this.applications.set(relationId, [])
    }
    this.applications.get(relationId)!.push(application)

    return { success: true, message: '申请已发送' }
  }

  // 批准加入
  acceptApplication(leaderId: string, applicantId: string): { success: boolean, message: string } {
    // 找到申请人的申请
    let targetApplication: SwornApplication | undefined
    let targetRelationId: string | undefined

    this.applications.forEach((apps, rid) => {
      const app = apps.find(a => a.applicantId === applicantId && a.status === 'pending')
      if (app) {
        targetApplication = app
        targetRelationId = rid
      }
    })

    if (!targetApplication || !targetRelationId) {
      return { success: false, message: '申请不存在' }
    }

    const relation = this.relations.get(targetRelationId)!
    
    // 检查权限
    if (relation.leaderId !== leaderId) {
      return { success: false, message: '只有结义领袖才能批准' }
    }

    // 检查人数
    if (relation.memberIds.length >= this.config.maxMembers) {
      return { success: false, message: '结义人数已满' }
    }

    // 添加成员
    relation.memberIds.push(applicantId)
    this.playerRelations.set(applicantId, targetRelationId)
    this.memberContribution.get(targetRelationId)!.set(applicantId, 0)

    targetApplication.status = 'accepted'

    return { success: true, message: '入义成功' }
  }

  // 拒绝加入
  rejectApplication(leaderId: string, applicantId: string): { success: boolean, message: string } {
    let targetApplication: SwornApplication | undefined
    let targetRelationId: string | undefined

    this.applications.forEach((apps, rid) => {
      const app = apps.find(a => a.applicantId === applicantId && a.status === 'pending')
      if (app) {
        targetApplication = app
        targetRelationId = rid
      }
    })

    if (!targetApplication) {
      return { success: false, message: '申请不存在' }
    }

    targetApplication.status = 'rejected'
    return { success: true, message: '已拒绝申请' }
  }

  // 离开结义
  leaveSworn(playerId: string): { success: boolean, message: string } {
    const relationId = this.playerRelations.get(playerId)
    if (!relationId) {
      return { success: false, message: '没有结义关系' }
    }

    const relation = this.relations.get(relationId)!
    
    // 领袖不能直接离开，需要解散
    if (relation.leaderId === playerId) {
      return { success: false, message: '领袖需要解散结义' }
    }

    // 移除成员
    relation.memberIds = relation.memberIds.filter(id => id !== playerId)
    this.playerRelations.delete(playerId)
    this.memberContribution.get(relationId)!.delete(playerId)

    return { success: true, message: '已离开结义' }
  }

  // 解散结义
  disbandSworn(leaderId: string): { success: boolean, message: string } {
    const relationId = this.playerRelations.get(leaderId)
    if (!relationId) {
      return { success: false, message: '没有结义关系' }
    }

    const relation = this.relations.get(relationId)!
    
    if (relation.leaderId !== leaderId) {
      return { success: false, message: '只有领袖可以解散' }
    }

    relation.status = 'disbanded'
    
    // 清除所有成员关系
    relation.memberIds.forEach(mid => {
      this.playerRelations.delete(mid)
    })

    return { success: true, message: '结义已解散' }
  }

  // 获取玩家结义信息
  getPlayerSworn(playerId: string): SwornRelation | null {
    const relationId = this.playerRelations.get(playerId)
    if (!relationId) return null

    return this.relations.get(relationId) || null
  }

  // 获取结义成员列表（带贡献度）
  getSwornMembers(relationId: string): { playerId: string, contribution: number, isLeader: boolean }[] {
    const relation = this.relations.get(relationId)
    if (!relation) return []

    const contributions = this.memberContribution.get(relationId) || new Map()

    return relation.memberIds.map(pid => ({
      playerId: pid,
      contribution: contributions.get(pid) || 0,
      isLeader: pid === relation.leaderId
    }))
  }

  // 获取申请列表
  getApplications(relationId: string): SwornApplication[] {
    return this.applications.get(relationId)?.filter(a => a.status === 'pending') || []
  }

  // 增加贡献度
  addContribution(relationId: string, playerId: string, amount: number): void {
    const relation = this.relations.get(relationId)
    if (!relation || relation.status !== 'active') return

    const contributions = this.memberContribution.get(relationId)
    if (!contributions) return

    const current = contributions.get(playerId) || 0
    contributions.set(playerId, current + amount)
    relation.totalContribution += amount

    // 根据总贡献度升级
    this.checkLevelUp(relationId)
  }

  // 检查升级
  private checkLevelUp(relationId: string): void {
    const relation = this.relations.get(relationId)
    if (!relation) return

    // 简单的升级逻辑：每1000贡献升一级
    const newLevel = Math.floor(relation.totalContribution / 1000) + 1
    if (newLevel > relation.level) {
      relation.level = Math.min(10, newLevel)  // 最高10级
    }
  }

  // 获取当前BUFF
  getActiveBuffs(relationId: string): SwornBuff[] {
    const relation = this.relations.get(relationId)
    if (!relation) return []

    // 根据等级获取可用BUFF
    return SWORN_BUFFS.filter(buff => buff.levelReq <= relation.level)
  }

  // 获取任务列表
  getTasks(relationId: string): SwornTask[] {
    return SWORN_TASKS
  }

  // 完成任务
  completeTask(relationId: string, playerId: string, taskId: string): { success: boolean, rewards?: any, message: string } {
    const task = SWORN_TASKS.find(t => t.taskId === taskId)
    if (!task) {
      return { success: false, message: '任务不存在' }
    }

    const relation = this.relations.get(relationId)
    if (!relation) {
      return { success: false, message: '结义不存在' }
    }

    // 增加贡献度
    this.addContribution(relationId, playerId, task.rewards.contribution)

    return {
      success: true,
      rewards: task.rewards,
      message: `完成任务: ${task.taskNameCN}`
    }
  }
}

export default SwornSystem
