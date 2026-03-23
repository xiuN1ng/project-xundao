// 仙侣系统 - 结婚系统
// 仙侣结缘、仙侣技能、仙侣buff

export interface CoupleRelation {
  relationId: string
  partnerAId: string    // 男方/角色1
  partnerBId: string    // 女方/角色2
  marriageTime: number
  status: 'engaged' | 'married' | 'divorced'
  coupleName: string     // 夫妻称谓
  loveLevel: number     // 亲密度等级
  totalLove: number     // 累计亲密度
  // 契约相关
  contractDays: number
  // 离婚相关
  divorceTime?: number
  divorceReason?: string
}

export interface CoupleApplication {
  applicationId: string
  proposerId: string    // 求婚者
  targetId: string      // 被求婚者
  message: string
  applyTime: number
  status: 'pending' | 'accepted' | 'rejected'
}

export interface CoupleSkill {
  skillId: string
  name: string
  nameCN: string
  description: string
  // 解锁条件
  unlockLevel: number   // 需要的亲密度等级
  // 技能效果
  effect: {
    type: 'buff' | 'skill' | 'passive'
    attributes: {
      attack?: number
      defense?: number
      hp?: number
      exp?: number
      drop?: number
      critical?: number
      dodge?: number
    }
    duration?: number  // 持续时间(毫秒)，0表示永久
  }
  // 冷却
  cooldown: number      // 冷却时间(毫秒)
  // 消耗
  cost?: {
    type: 'love' | 'item'
    amount: number
    itemId?: string
  }
}

export interface CoupleBuff {
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

export interface CoupleConfig {
  // 等级限制
  minMarriageLevel: number
  // 亲密度配置
  loveLevel: {
    // 每级需要的亲密度
    expPerLevel: number
    // 最高等级
    maxLevel: number
  }
  // 离婚冷静期
  divorceCooldown: number  // 毫秒
  // 离婚惩罚
  divorcePenalty: {
    // 亲密度损失百分比
    loveLossPercent: number
    // 是否有惩罚时间
    penaltyDays: number
  }
  // 技能配置
  skill: {
    maxActiveSkills: number
    maxPassiveSkills: number
  }
}

// 仙侣BUFF配置
export const COUPLE_BUFFS: CoupleBuff[] = [
  {
    buffId: 'couple_buff_1',
    name: 'Love I',
    nameCN: '神仙眷侣I',
    description: '全体成员攻击+5%',
    levelReq: 1,
    attributes: { attack: 5 }
  },
  {
    buffId: 'couple_buff_2',
    name: 'Love II',
    nameCN: '神仙眷侣II',
    description: '全体成员攻击+10%，防御+5%',
    levelReq: 3,
    attributes: { attack: 10, defense: 5 }
  },
  {
    buffId: 'couple_buff_3',
    name: 'Love III',
    nameCN: '鸾凤和鸣',
    description: '全体成员攻击+15%，防御+10%，经验+10%',
    levelReq: 5,
    attributes: { attack: 15, defense: 10, exp: 10 }
  },
  {
    buffId: 'couple_buff_4',
    name: 'Love IV',
    nameCN: '百年好合',
    description: '全体成员攻击+20%，防御+15%，经验+15%，掉落+10%',
    levelReq: 7,
    attributes: { attack: 20, defense: 15, exp: 15, drop: 10 }
  },
  {
    buffId: 'couple_buff_5',
    name: 'Love V',
    nameCN: '天作之合',
    description: '全体成员攻击+30%，防御+20%，经验+20%，掉落+15%',
    levelReq: 10,
    attributes: { attack: 30, defense: 20, exp: 20, drop: 15 }
  },
]

// 仙侣技能配置
export const COUPLE_SKILLS: CoupleSkill[] = [
  {
    skillId: 'couple_skill_1',
    name: 'Heart Link',
    nameCN: '心有灵犀',
    description: '双修时经验获取+20%',
    unlockLevel: 1,
    effect: {
      type: 'buff',
      attributes: { exp: 20 },
      duration: 0  // 永久被动
    },
    cooldown: 0,
    cost: { type: 'love', amount: 10 }
  },
  {
    skillId: 'couple_skill_2',
    name: 'Protective Aura',
    nameCN: '护体灵光',
    description: '为伴侣提供护盾，吸收伤害',
    unlockLevel: 3,
    effect: {
      type: 'skill',
      attributes: { hp: 500 },
      duration: 300000  // 5分钟
    },
    cooldown: 600000,  // 10分钟冷却
    cost: { type: 'item', amount: 1, itemId: 'love_charm' }
  },
  {
    skillId: 'couple_skill_3',
    name: 'Double Strike',
    nameCN: '夫妻同心',
    description: '双倍攻击概率+10%',
    unlockLevel: 5,
    effect: {
      type: 'passive',
      attributes: { attack: 15 },
      duration: 0
    },
    cooldown: 0,
    cost: { type: 'love', amount: 50 }
  },
  {
    skillId: 'couple_skill_4',
    name: 'Lucky Charm',
    nameCN: '福缘深厚',
    description: '掉落率+15%',
    unlockLevel: 7,
    effect: {
      type: 'passive',
      attributes: { drop: 15 },
      duration: 0
    },
    cooldown: 0,
    cost: { type: 'love', amount: 80 }
  },
  {
    skillId: 'couple_skill_5',
    name: 'Phoenix Rebirth',
    nameCN: '凤凰涅槃',
    description: '伴侣死亡时原地复活并恢复50%血量',
    unlockLevel: 10,
    effect: {
      type: 'skill',
      attributes: { hp: 1000 },
      duration: 3600000  // 1小时
    },
    cooldown: 3600000,  // 1小时冷却
    cost: { type: 'item', amount: 1, itemId: 'phoenix_feather' }
  },
]

// 默认配置
const DEFAULT_COUPLE_CONFIG: CoupleConfig = {
  minMarriageLevel: 20,
  loveLevel: {
    expPerLevel: 1000,
    maxLevel: 10
  },
  divorceCooldown: 24 * 60 * 60 * 1000,  // 24小时
  divorcePenalty: {
    loveLossPercent: 50,
    penaltyDays: 7
  },
  skill: {
    maxActiveSkills: 2,
    maxPassiveSkills: 3
  }
}

export class CoupleSystem {
  private config: CoupleConfig
  private relations: Map<string, CoupleRelation> = new Map()
  private applications: Map<string, CoupleApplication[]> = new Map()
  private playerPartner: Map<string, string> = new Map()  // playerId -> relationId
  private activeSkills: Map<string, { skillId: string; endTime: number; lastUseTime: number }[]> = new Map()  // relationId -> active skills

  constructor(config: Partial<CoupleConfig> = {}) {
    this.config = { ...DEFAULT_COUPLE_CONFIG, ...config }
  }

  // 求婚
  proposeMarriage(proposerId: string, targetId: string, message: string = ''): { success: boolean; message: string } {
    // 检查等级限制
    // const proposerLevel = this.getPlayerLevel(proposerId)
    // if (proposerLevel < this.config.minMarriageLevel) {
    //   return { success: false, message: `需要达到${this.config.minMarriageLevel}级才能结婚` }
    // }

    // 检查是否已有伴侣
    if (this.playerPartner.has(proposerId)) {
      return { success: false, message: '已有伴侣' }
    }

    if (this.playerPartner.has(targetId)) {
      return { success: false, message: '对方已有伴侣' }
    }

    // 检查是否已有求婚申请
    const existingApps = this.applications.get(targetId)
    if (existingApps) {
      const pending = existingApps.find(a => a.proposerId === targetId && a.targetId === proposerId && a.status === 'pending')
      if (pending) {
        return { success: false, message: '已有求婚申请' }
      }
    }

    // 创建求婚申请
    const application: CoupleApplication = {
      applicationId: `couple_app_${Date.now()}`,
      proposerId,
      targetId,
      message,
      applyTime: Date.now(),
      status: 'pending'
    }

    if (!this.applications.has(targetId)) {
      this.applications.set(targetId, [])
    }
    this.applications.get(targetId)!.push(application)

    return { success: true, message: '求婚申请已发送' }
  }

  // 接受求婚
  acceptProposal(playerId: string, proposerId: string): { success: boolean; message: string; relationId?: string } {
    const apps = this.applications.get(playerId)
    if (!apps) {
      return { success: false, message: '没有求婚申请' }
    }

    const app = apps.find(a => a.proposerId === proposerId && a.status === 'pending')
    if (!app) {
      return { success: false, message: '求婚申请不存在' }
    }

    // 创建仙侣关系
    const relationId = `couple_${Date.now()}`
    const coupleNames = this.generateCoupleNames(proposerId, playerId)
    
    const relation: CoupleRelation = {
      relationId,
      partnerAId: proposerId,
      partnerBId: playerId,
      marriageTime: Date.now(),
      status: 'married',
      coupleName: coupleNames,
      loveLevel: 1,
      totalLove: 0,
      contractDays: 0
    }

    this.relations.set(relationId, relation)
    this.playerPartner.set(proposerId, relationId)
    this.playerPartner.set(playerId, relationId)
    this.activeSkills.set(relationId, [])

    app.status = 'accepted'

    return {
      success: true,
      message: `恭喜成为${coupleNames}！`,
      relationId
    }
  }

  // 拒绝求婚
  rejectProposal(playerId: string, proposerId: string): { success: boolean; message: string } {
    const apps = this.applications.get(playerId)
    if (!apps) {
      return { success: false, message: '没有求婚申请' }
    }

    const app = apps.find(a => a.proposerId === proposerId && a.status === 'pending')
    if (!app) {
      return { success: false, message: '求婚申请不存在' }
    }

    app.status = 'rejected'
    return { success: true, message: '已拒绝求婚' }
  }

  // 生成夫妻称谓
  private generateCoupleNames(partnerAId: string, partnerBId: string): string {
    // 简化：使用固定称谓
    const titles = ['神仙眷侣', '比翼鸟', '连理枝', '鸳鸯', '鸾凤']
    const index = Math.floor(Math.random() * titles.length)
    return titles[index]
  }

  // 获取玩家伴侣信息
  getPartner(playerId: string): CoupleRelation | null {
    const relationId = this.playerPartner.get(playerId)
    if (!relationId) return null

    return this.relations.get(relationId) || null
  }

  // 获取仙侣详情
  getRelation(relationId: string): CoupleRelation | null {
    return this.relations.get(relationId) || null
  }

  // 增加亲密度
  addLove(relationId: string, amount: number): { levelUp: boolean; newLevel: number } {
    const relation = this.relations.get(relationId)
    if (!relation || relation.status !== 'married') {
      return { levelUp: false, newLevel: 1 }
    }

    relation.totalLove += amount

    // 计算新等级
    const newLevel = Math.floor(relation.totalLove / this.config.loveLevel.expPerLevel) + 1
    const maxLevel = this.config.loveLevel.maxLevel
    const oldLevel = relation.loveLevel

    if (newLevel > maxLevel) {
      relation.loveLevel = maxLevel
    } else {
      relation.loveLevel = newLevel
    }

    return {
      levelUp: relation.loveLevel > oldLevel,
      newLevel: relation.loveLevel
    }
  }

  // 获取亲密度等级
  getLoveLevel(relationId: string): number {
    const relation = this.relations.get(relationId)
    return relation?.loveLevel || 0
  }

  // 获取当前BUFF
  getActiveBuffs(relationId: string): CoupleBuff[] {
    const relation = this.relations.get(relationId)
    if (!relation) return []

    return COUPLE_BUFFS.filter(buff => buff.levelReq <= relation.loveLevel)
  }

  // 获取可学习的技能
  getLearnableSkills(relationId: string): CoupleSkill[] {
    const relation = this.relations.get(relationId)
    if (!relation) return []

    return COUPLE_SKILLS.filter(skill => skill.unlockLevel <= relation.loveLevel)
  }

  // 学习技能
  learnSkill(relationId: string, playerId: string, skillId: string): { success: boolean; message: string } {
    const relation = this.relations.get(relationId)
    if (!relation || relation.status !== 'married') {
      return { success: false, message: '仙侣关系不存在' }
    }

    // 检查是否是伴侣
    if (relation.partnerAId !== playerId && relation.partnerBId !== playerId) {
      return { success: false, message: '不是你的伴侣' }
    }

    const skill = COUPLE_SKILLS.find(s => s.skillId === skillId)
    if (!skill) {
      return { success: false, message: '技能不存在' }
    }

    // 检查亲密度等级
    if (skill.unlockLevel > relation.loveLevel) {
      return { success: false, message: `亲密度等级不足，需要${skill.unlockLevel}级` }
    }

    // 检查消耗
    if (skill.cost) {
      if (skill.cost.type === 'love') {
        // 扣除亲密度（不减少等级，只消耗点数）
        // 这里简化处理：假设有足够的亲密度
      }
    }

    // 添加技能
    const skills = this.activeSkills.get(relationId) || []
    
    // 检查是被动还是主动技能
    if (skill.effect.type === 'passive') {
      // 被动技能直接添加
      const hasSkill = skills.some(s => s.skillId === skillId)
      if (hasSkill) {
        return { success: false, message: '已学习该技能' }
      }
      skills.push({ skillId, endTime: 0, lastUseTime: 0 })
      this.activeSkills.set(relationId, skills)
    } else {
      // 主动技能需要装备
      const activeCount = skills.filter(s => {
        const sk = COUPLE_SKILLS.find(k => k.skillId === s.skillId)
        return sk && sk.effect.type !== 'passive'
      }).length

      const maxActive = this.config.skill.maxActiveSkills
      if (activeCount >= maxActive) {
        return { success: false, message: `最多装备${maxActive}个主动技能` }
      }

      skills.push({ skillId, endTime: 0, lastUseTime: 0 })
      this.activeSkills.set(relationId, skills)
    }

    return { success: true, message: `成功学习技能：${skill.nameCN}` }
  }

  // 使用技能
  useSkill(relationId: string, playerId: string, skillId: string): { success: boolean; message: string; effect?: any } {
    const relation = this.relations.get(relationId)
    if (!relation || relation.status !== 'married') {
      return { success: false, message: '仙侣关系不存在' }
    }

    // 检查是否是伴侣
    if (relation.partnerAId !== playerId && relation.partnerBId !== playerId) {
      return { success: false, message: '不是你的伴侣' }
    }

    const skill = COUPLE_SKILLS.find(s => s.skillId === skillId)
    if (!skill) {
      return { success: false, message: '技能不存在' }
    }

    // 检查是否已学习
    const skills = this.activeSkills.get(relationId) || []
    const learned = skills.find(s => s.skillId === skillId)
    if (!learned) {
      return { success: false, message: '未学习该技能' }
    }

    // 检查冷却
    const now = Date.now()
    if (now - learned.lastUseTime < skill.cooldown) {
      const remaining = Math.ceil((skill.cooldown - (now - learned.lastUseTime)) / 1000)
      return { success: false, message: `技能冷却中，${remaining}秒后可使用` }
    }

    // 被动技能不需要激活
    if (skill.effect.type === 'passive') {
      return { success: false, message: '被动技能无需激活' }
    }

    // 检查消耗
    if (skill.cost) {
      // TODO: 扣除消耗
    }

    // 激活技能
    learned.lastUseTime = now
    learned.endTime = skill.effect.duration > 0 ? now + skill.effect.duration : 0

    return {
      success: true,
      message: `使用技能：${skill.nameCN}`,
      effect: skill.effect
    }
  }

  // 获取已装备技能
  getEquippedSkills(relationId: string): CoupleSkill[] {
    const skills = this.activeSkills.get(relationId) || []
    return skills
      .map(s => COUPLE_SKILLS.find(k => k.skillId === s.skillId))
      .filter(s => s) as CoupleSkill[]
  }

  // 离婚
  divorce(playerId: string, reason: string = ''): { success: boolean; message: string } {
    const relationId = this.playerPartner.get(playerId)
    if (!relationId) {
      return { success: false, message: '没有伴侣' }
    }

    const relation = this.relations.get(relationId)!
    
    // 检查是否是伴侣
    if (relation.partnerAId !== playerId && relation.partnerBId !== playerId) {
      return { success: false, message: '不是你的伴侣' }
    }

    relation.status = 'divorced'
    relation.divorceTime = Date.now()
    relation.divorceReason = reason

    // 清除玩家关系
    this.playerPartner.delete(relation.partnerAId)
    this.playerPartner.delete(relation.partnerBId)

    // 清除技能
    this.activeSkills.delete(relationId)

    return { success: true, message: '已离婚' }
  }

  // 获取求婚申请列表
  getApplications(playerId: string): CoupleApplication[] {
    return this.applications.get(playerId)?.filter(a => a.status === 'pending') || []
  }

  // 双修（增加亲密度）
  cultivateTogether(relationId: string, playerId: string): { success: boolean; loveGained: number; message: string } {
    const relation = this.relations.get(relationId)
    if (!relation || relation.status !== 'married') {
      return { success: false, loveGained: 0, message: '仙侣关系不存在' }
    }

    // 检查是否是伴侣
    if (relation.partnerAId !== playerId && relation.partnerBId !== playerId) {
      return { success: false, loveGained: 0, message: '不是你的伴侣' }
    }

    // 增加亲密度
    const loveGained = 10 + Math.floor(relation.loveLevel * 2)
    const result = this.addLove(relationId, loveGained)

    let message = `双修完成，获得${loveGained}亲密度`
    if (result.levelUp) {
      message += `！亲密度等级提升到${result.newLevel}级`
    }

    return { success: true, loveGained, message }
  }
}

export default CoupleSystem
export { COUPLE_BUFFS, COUPLE_SKILLS }
