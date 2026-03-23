// 师徒系统 - 师父收徒/徒弟拜师
// 师徒关系、传功、任务奖励

export interface MasterDiscipleRelation {
  relationId: string
  masterId: string
  discipleId: string
  startTime: number
  status: 'active' | 'completed' | 'broken'
  masterContribution: number   // 师父贡献度
  discipleContribution: number // 徒弟贡献度
  contractDays: number          // 合约天数
}

export interface MasterApplication {
  applicationId: string
  masterId: string
  discipleId: string
  message: string
  applyTime: number
  status: 'pending' | 'accepted' | 'rejected'
}

export interface MasterTask {
  taskId: string
  taskName: string
  taskNameCN: string
  description: string
  type: 'daily' | 'weekly' | 'special'
  requirements: {
    type: 'combat' | 'resource' | 'social'
    count: number
  }
  rewards: {
    masterExp: number
    discipleExp: number
    masterGold: number
    discipleGold: number
    contribution: number
  }
}

export interface MasterConfig {
  // 收徒数量限制
  maxDisciples: number
  // 拜师等级限制
  minMasterLevel: number
  minDiscipleLevel: number
  // 合约时长
  contractDays: number
  // 师徒任务刷新时间
  taskRefreshTime: number
  // 出师条件
  graduateRequirements: {
    days: number
    contribution: number
  }
}

// 师徒任务配置
export const MASTER_TASKS: MasterTask[] = [
  {
    taskId: 'daily_combat_1',
    taskName: 'Daily Combat I',
    taskNameCN: '日常修炼I',
    description: '完成1次战斗',
    type: 'daily',
    requirements: { type: 'combat', count: 1 },
    rewards: { masterExp: 10, discipleExp: 20, masterGold: 5, discipleGold: 10, contribution: 5 }
  },
  {
    taskId: 'daily_combat_3',
    taskName: 'Daily Combat III',
    taskNameCN: '日常修炼III',
    description: '完成3次战斗',
    type: 'daily',
    requirements: { type: 'combat', count: 3 },
    rewards: { masterExp: 30, discipleExp: 50, masterGold: 15, discipleGold: 25, contribution: 15 }
  },
  {
    taskId: 'daily_resource_1',
    taskName: 'Daily Resource I',
    taskNameCN: '资源收集I',
    description: '收集1000资源',
    type: 'daily',
    requirements: { type: 'resource', count: 1000 },
    rewards: { masterExp: 15, discipleExp: 30, masterGold: 10, discipleGold: 15, contribution: 8 }
  },
  {
    taskId: 'weekly_boss',
    taskName: 'Weekly Boss',
    taskNameCN: '讨伐BOSS',
    description: '共同击败1个世界BOSS',
    type: 'weekly',
    requirements: { type: 'combat', count: 1 },
    rewards: { masterExp: 100, discipleExp: 200, masterGold: 100, discipleGold: 150, contribution: 50 }
  },
  {
    taskId: 'weekly_arena',
    taskName: 'Weekly Arena',
    taskNameCN: '竞技场挑战',
    description: '在竞技场获得3场胜利',
    type: 'weekly',
    requirements: { type: 'combat', count: 3 },
    rewards: { masterExp: 80, discipleExp: 150, masterGold: 80, discipleGold: 100, contribution: 40 }
  },
]

// 默认配置
const DEFAULT_MASTER_CONFIG: MasterConfig = {
  maxDisciples: 3,
  minMasterLevel: 30,
  minDiscipleLevel: 10,
  contractDays: 30,
  taskRefreshTime: 24 * 60 * 60 * 1000, // 24小时
  graduateRequirements: {
    days: 30,
    contribution: 500
  }
}

export class MasterDiscipleSystem {
  private config: MasterConfig
  private relations: Map<string, MasterDiscipleRelation> = new Map()  // relationId -> relation
  private applications: Map<string, MasterApplication[]> = new Map()  // masterId -> applications
  private playerRelations: Map<string, { asMaster: string[], asDisciple: string[] }> = new Map()  // playerId -> relations
  private dailyTasks: Map<string, { taskId: string, progress: number, lastRefresh: number }[]> = new Map()

  constructor(config: Partial<MasterConfig> = {}) {
    this.config = { ...DEFAULT_MASTER_CONFIG, ...config }
  }

  // 申请拜师
  applyForMaster(discipleId: string, masterId: string, message: string = ''): { success: boolean, message: string } {
    // 检查徒弟等级
    // const discipleLevel = this.getPlayerLevel(discipleId)
    // if (discipleLevel < this.config.minDiscipleLevel) {
    //   return { success: false, message: `等级不足，需要达到${this.config.minDiscipleLevel}级` }
    // }

    // 检查师父当前徒弟数
    const masterDiscipleCount = this.getMasterDiscipleCount(masterId)
    if (masterDiscipleCount >= this.config.maxDisciples) {
      return { success: false, message: '师父收徒数量已达上限' }
    }

    // 检查是否已有师徒关系
    if (this.hasActiveRelation(discipleId)) {
      return { success: false, message: '已有师徒关系' }
    }

    // 创建申请
    const application: MasterApplication = {
      applicationId: `app_${Date.now()}_${discipleId}`,
      masterId,
      discipleId,
      message,
      applyTime: Date.now(),
      status: 'pending'
    }

    if (!this.applications.has(masterId)) {
      this.applications.set(masterId, [])
    }
    this.applications.get(masterId)!.push(application)

    return { success: true, message: '拜师申请已发送' }
  }

  // 接受拜师申请
  acceptApplication(masterId: string, discipleId: string): { success: boolean, message: string } {
    const applications = this.applications.get(masterId)
    if (!applications) {
      return { success: false, message: '没有收到拜师申请' }
    }

    const application = applications.find(a => a.discipleId === discipleId && a.status === 'pending')
    if (!application) {
      return { success: false, message: '申请不存在或已处理' }
    }

    // 创建师徒关系
    const relation: MasterDiscipleRelation = {
      relationId: `rel_${Date.now()}`,
      masterId,
      discipleId,
      startTime: Date.now(),
      status: 'active',
      masterContribution: 0,
      discipleContribution: 0,
      contractDays: this.config.contractDays
    }

    this.relations.set(relation.relationId, relation)

    // 更新玩家关系映射
    if (!this.playerRelations.has(masterId)) {
      this.playerRelations.set(masterId, { asMaster: [], asDisciple: [] })
    }
    if (!this.playerRelations.has(discipleId)) {
      this.playerRelations.set(discipleId, { asMaster: [], asDisciple: [] })
    }
    this.playerRelations.get(masterId)!.asMaster.push(relation.relationId)
    this.playerRelations.get(discipleId)!.asDisciple.push(relation.relationId)

    // 更新申请状态
    application.status = 'accepted'

    return { success: true, message: '收徒成功' }
  }

  // 拒绝拜师申请
  rejectApplication(masterId: string, discipleId: string): { success: boolean, message: string } {
    const applications = this.applications.get(masterId)
    if (!applications) {
      return { success: false, message: '没有收到拜师申请' }
    }

    const application = applications.find(a => a.discipleId === discipleId && a.status === 'pending')
    if (!application) {
      return { success: false, message: '申请不存在或已处理' }
    }

    application.status = 'rejected'
    return { success: true, message: '已拒绝拜师申请' }
  }

  // 获取拜师申请列表
  getApplications(playerId: string): MasterApplication[] {
    return this.applications.get(playerId)?.filter(a => a.status === 'pending') || []
  }

  // 获取师父的徒弟列表
  getMasterDisciples(masterId: string): MasterDiscipleRelation[] {
    const relations = this.playerRelations.get(masterId)
    if (!relations) return []

    return relations.asMaster
      .map(rid => this.relations.get(rid)!)
      .filter(r => r && r.status === 'active')
  }

  // 获取徒弟的师父信息
  getDiscipleMaster(discipleId: string): MasterDiscipleRelation | null {
    const relations = this.playerRelations.get(discipleId)
    if (!relations || relations.asDisciple.length === 0) return null

    return this.relations.get(relations.asDisciple[0]) || null
  }

  // 获取师徒关系详情
  getRelation(relationId: string): MasterDiscipleRelation | undefined {
    return this.relations.get(relationId)
  }

  // 增加贡献度
  addContribution(relationId: string, type: 'master' | 'disciple', amount: number): void {
    const relation = this.relations.get(relationId)
    if (!relation || relation.status !== 'active') return

    if (type === 'master') {
      relation.masterContribution += amount
    } else {
      relation.discipleContribution += amount
    }

    // 检查是否满足出师条件
    this.checkGraduation(relationId)
  }

  // 检查出师
  private checkGraduation(relationId: string): void {
    const relation = this.relations.get(relationId)
    if (!relation || relation.status !== 'active') return

    const daysActive = Math.floor((Date.now() - relation.startTime) / (24 * 60 * 60 * 1000))
    const totalContribution = relation.masterContribution + relation.discipleContribution

    if (daysActive >= this.config.graduateRequirements.days && 
        totalContribution >= this.config.graduateRequirements.contribution) {
      relation.status = 'completed'
    }
  }

  // 解除师徒关系
  breakRelation(relationId: string, reason: string = ''): { success: boolean, message: string } {
    const relation = this.relations.get(relationId)
    if (!relation) {
      return { success: false, message: '关系不存在' }
    }

    relation.status = 'broken'
    return { success: true, message: '师徒关系已解除' }
  }

  // 获取师父收徒数量
  private getMasterDiscipleCount(masterId: string): number {
    const relations = this.playerRelations.get(masterId)
    if (!relations) return 0

    return relations.asMaster.filter(rid => {
      const rel = this.relations.get(rid)
      return rel && rel.status === 'active'
    }).length
  }

  // 检查是否有活跃关系
  private hasActiveRelation(playerId: string): boolean {
    const relations = this.playerRelations.get(playerId)
    if (!relations) return false

    const asMaster = relations.asMaster.some(rid => {
      const rel = this.relations.get(rid)
      return rel && rel.status === 'active'
    })

    const asDisciple = relations.asDisciple.some(rid => {
      const rel = this.relations.get(rid)
      return rel && rel.status === 'active'
    })

    return asMaster || asDisciple
  }

  // 获取师徒任务
  getDailyTasks(playerId: string): MasterTask[] {
    // 简化：返回所有日常任务
    return MASTER_TASKS.filter(t => t.type === 'daily')
  }

  // 完成任务
  completeTask(playerId: string, taskId: string): { success: boolean, rewards?: any, message: string } {
    const task = MASTER_TASKS.find(t => t.taskId === taskId)
    if (!task) {
      return { success: false, message: '任务不存在' }
    }

    // 查找师徒关系
    const relation = this.getDiscipleMaster(playerId)
    if (!relation) {
      return { success: false, message: '没有师徒关系' }
    }

    // 增加贡献度
    this.addContribution(relation.relationId, 'disciple', task.rewards.contribution)

    return {
      success: true,
      rewards: {
        exp: task.rewards.discipleExp,
        gold: task.rewards.discipleGold,
        contribution: task.rewards.contribution
      },
      message: `完成任务: ${task.taskNameCN}`
    }
  }

  // 传功（师父给徒弟经验）
  transmitPower(relationId: string, masterId: string, expAmount: number): { success: boolean, message: string } {
    const relation = this.relations.get(relationId)
    if (!relation || relation.status !== 'active') {
      return { success: false, message: '师徒关系不存在' }
    }

    if (relation.masterId !== masterId) {
      return { success: false, message: '只有师父才能传功' }
    }

    // 增加徒弟经验（这里应该调用经验系统）
    // 增加师父贡献度
    this.addContribution(relationId, 'master', Math.floor(expAmount / 10))

    return {
      success: true,
      message: `传功成功，徒弟获得${expAmount}经验`
    }
  }
}

export default MasterDiscipleSystem
