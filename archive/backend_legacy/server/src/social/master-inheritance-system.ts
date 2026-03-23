// 师徒传承系统 - 师徒传承、传功、师徒羁绊
// 在原有师徒系统基础上扩展：传承系统、技能传承、属性传承

import { MasterDiscipleRelation, MasterTask, MASTER_TASK_CONFIG } from './master-disciple-system'

// 师徒传承
export interface MasterInheritance {
  inheritanceId: string
  masterId: string
  discipleId: string
  inheritanceType: 'skill' | 'attribute' | 'realm' | 'spirit' | 'treasure'
  // 传承内容
  content: {
    skillIds?: string[]
    attributes?: { attack: number, defense: number, hp: number }
    realmLevel?: number
    spiritAmount?: number
    treasureId?: string
  }
  // 传承进度
  progress: number      // 0-100
  isCompleted: boolean
  startTime: number
  completeTime?: number
  // 传承消耗
  cost: {
    gold: number
    items: { itemId: string, count: number }[]
  }
}

// 传功记录
export interface PowerTransfer {
  transferId: string
  fromId: string      // 传功者
  toId: string       // 接收者
  transferType: 'master_to_disciple' | 'disciple_to_master' | 'graduate_to_active'
  amount: number     // 传功数量
  expReward: number  // 传功获得的经验
  progress: number   // 进度 0-100
  isCompleted: boolean
  startTime: number
  completeTime?: number
}

// 师徒羁绊
export interface MasterDiscipleBond {
  bondId: string
  masterId: string
  discipleId: string
  bondLevel: number
  bondExp: number
  // 羁绊技能
  bondSkills: BondSkill[]
  // 羁绊加成
  bondBuffs: { attack: number, defense: number, hp: number, exp: number }
  // 羁绊任务
  bondTasks: BondTask[]
  createTime: number
  lastActiveTime: number
}

export interface BondSkill {
  skillId: string
  name: string
  nameCN: string
  description: string
  level: number
  isActivated: boolean
  requirement: {
    type: 'bond_level' | 'task_complete' | 'days'
    value: number
  }
  effect: {
    type: 'attribute' | 'skill' | 'buff'
    value: number
  }
}

export interface BondTask {
  taskId: string
  name: string
  nameCN: string
  description: string
  type: 'battle' | 'quest' | 'social' | 'dungeon'
  progress: number
  maxProgress: number
  rewards: { type: string, itemId?: string, amount: number }[]
  isCompleted: boolean
  startTime: number
  expireTime: number
}

// 出师传承
export interface GraduateInheritance {
  inheritanceId: string
  formerDiscipleId: string
  masterId: string
  // 出师奖励
  graduateRewards: {
    gold: number
    items: { itemId: string, count: number }[]
    titles: string[]
    skills: string[]
  }
  // 传承祝福
  blessing: {
    attack: number
    defense: number
    hp: number
    expBonus: number
    dropBonus: number
  }
  // 祝福持续时间
  blessingDuration: number
  isActive: boolean
  startTime: number
  expireTime?: number
}

// 师徒传承配置
export const MASTER_INHERITANCE_CONFIG = {
  // 传承类型配置
  inheritanceTypes: [
    {
      type: 'skill',
      name: '技能传承',
      description: '师父将技能传授给徒弟',
      maxCount: 3,
      duration: 30 * 24 * 60 * 60 * 1000,
      cost: { gold: 20000, items: [{ itemId: 'master_skill_book', count: 5 }] },
      progressPerDay: 10
    },
    {
      type: 'attribute',
      name: '属性传承',
      description: '师父将部分属性传承给徒弟',
      maxCount: 1,
      duration: 60 * 24 * 60 * 60 * 1000,
      cost: { gold: 50000, items: [{ itemId: 'master_attribute_stone', count: 10 }] },
      progressPerDay: 5
    },
    {
      type: 'realm',
      name: '境界传承',
      description: '师父将境界感悟传承给徒弟',
      maxCount: 1,
      duration: 90 * 24 * 60 * 60 * 1000,
      cost: { gold: 100000, items: [{ itemId: 'realm_crystal', count: 10 }] },
      progressPerDay: 3
    },
    {
      type: 'spirit',
      name: '灵气传承',
      description: '师父将灵气传授给徒弟',
      maxCount: 5,
      duration: 7 * 24 * 60 * 60 * 1000,
      cost: { gold: 10000, items: [{ itemId: 'spirit_stone', count: 10 }] },
      progressPerDay: 20
    },
    {
      type: 'treasure',
      name: '法宝传承',
      description: '师父将法宝赠送给徒弟',
      maxCount: 1,
      duration: 0,  // 永久
      cost: { gold: 50000, items: [] },
      progressPerDay: 0
    }
  ],
  // 传功配置
  powerTransfer: {
    // 传功消耗
    costPerTransfer: 1000,
    // 每次传功量
    amountPerTransfer: 10000,
    // 传功获得经验
    expPerTransfer: 100,
    // 每日传功次数限制
    dailyLimit: 10,
    // 传功进度恢复
    progressRecoveryPerHour: 5
  },
  // 羁绊配置
  bond: {
    // 羁绊升级经验
    expPerLevel: 1000,
    // 最大羁绊等级
    maxLevel: 10,
    // 羁绊任务刷新时间
    taskRefreshTime: 24 * 60 * 60 * 1000,
    // 羁绊任务数量
    maxTasks: 3
  },
  // 出师传承配置
  graduateInheritance: {
    // 出师等级要求
    requireDiscipleLevel: 50,
    // 传承祝福持续时间
    blessingDuration: 30 * 24 * 60 * 60 * 1000,
    // 祝福属性
    blessing: {
      attack: 50,
      defense: 50,
      hp: 500,
      expBonus: 10,
      dropBonus: 10
    }
  }
}

// 羁绊技能列表
export const BOND_SKILLS = [
  {
    skillId: 'bond_skill_1',
    name: 'Mentor Guidance',
    nameCN: '师父教诲',
    description: '师父指导下，修炼效率提升',
    level: 1,
    requirement: { type: 'bond_level', value: 1 },
    effect: { type: 'attribute', value: 5 }
  },
  {
    skillId: 'bond_skill_2',
    name: 'Disciple Respect',
    nameCN: '徒弟敬意',
    description: '徒弟敬意，师父战力提升',
    level: 1,
    requirement: { type: 'bond_level', value: 1 },
    effect: { type: 'attribute', value: 5 }
  },
  {
    skillId: 'bond_skill_3',
    name: 'Dual Cultivation',
    nameCN: '双修加成',
    description: '双修经验额外获得',
    level: 2,
    requirement: { type: 'bond_level', value: 3 },
    effect: { type: 'attribute', value: 10 }
  },
  {
    skillId: 'bond_skill_4',
    name: 'Battle Synergy',
    nameCN: '战斗配合',
    description: '师徒同时参战，伤害提升',
    level: 3,
    requirement: { type: 'bond_level', value: 5 },
    effect: { type: 'skill', value: 15 }
  },
  {
    skillId: 'bond_skill_5',
    name: 'Spirit Connection',
    nameCN: '灵气共鸣',
    description: '灵气修炼效率大幅提升',
    level: 5,
    requirement: { type: 'bond_level', value: 7 },
    effect: { type: 'attribute', value: 20 }
  },
  {
    skillId: 'bond_skill_6',
    name: 'Eternal Bond',
    nameCN: '师徒羁绊',
    description: '师徒缘分永存，永久属性加成',
    level: 10,
    requirement: { type: 'bond_level', value: 10 },
    effect: { type: 'attribute', value: 50 }
  }
]

export class MasterInheritanceSystem {
  private inheritances: Map<string, MasterInheritance[]> = new Map()
  private powerTransfers: Map<string, PowerTransfer[]> = new Map()
  private bonds: Map<string, MasterDiscipleBond[]> = new Map()
  private graduateInheritances: Map<string, GraduateInheritance[]> = new Map()
  private dailyTransferCount: Map<string, { date: string, count: number }> = new Map()

  // 发起传承
  startInheritance(masterId: string, discipleId: string, inheritanceType: string, content: any, cost: { gold: number, items: { itemId: string, count: number }[] }): { success: boolean, inheritance?: MasterInheritance, message: string } {
    const config = MASTER_INHERITANCE_CONFIG.inheritanceTypes.find(t => t.type === inheritanceType)
    if (!config) return { success: false, message: '无效的传承类型' }

    // 检查传承数量限制
    const masterInheritances = this.inheritances.get(masterId) || []
    const typeCount = masterInheritances.filter(i => i.inheritanceType === inheritanceType && !i.isCompleted).length
    if (typeCount >= config.maxCount) return { success: false, message: `${config.name}已达上限` }

    const inheritance: MasterInheritance = {
      inheritanceId: `inheritance_${masterId}_${Date.now()}`,
      masterId,
      discipleId,
      inheritanceType: inheritanceType as any,
      content,
      progress: 0,
      isCompleted: false,
      startTime: Date.now(),
      cost
    }

    masterInheritances.push(inheritance)
    this.inheritances.set(masterId, masterInheritances)

    return {
      success: true,
      inheritance,
      message: `${config.name}已发起，预计${Math.ceil(100 / config.progressPerDay)}天完成`
    }
  }

  // 更新传承进度
  updateInheritanceProgress(masterId: string, discipleId: string): { completed: MasterInheritance[], message: string } {
    const inheritances = this.inheritances.get(masterId) || []
    const now = Date.now()
    const completed: MasterInheritance[] = []

    inheritances.forEach(inheritance => {
      if (inheritance.isCompleted) return
      if (inheritance.discipleId !== discipleId) return

      const config = MASTER_INHERITANCE_CONFIG.inheritanceTypes.find(t => t.type === inheritance.inheritanceType)
      if (!config) return

      // 每天增加进度
      const days = Math.floor((now - inheritance.startTime) / (24 * 60 * 60 * 1000))
      inheritance.progress = Math.min(100, days * config.progressPerDay)

      if (inheritance.progress >= 100) {
        inheritance.isCompleted = true
        inheritance.completeTime = now
        completed.push(inheritance)
      }
    })

    return {
      completed,
      message: completed.length > 0 ? `${completed.length}个传承已完成` : '传承进度更新'
    }
  }

  // 获取传承列表
  getInheritances(playerId: string): MasterInheritance[] {
    return this.inheritances.get(playerId) || []
  }

  // 发起传功
  startPowerTransfer(fromId: string, toId: string, transferType: 'master_to_disciple' | 'disciple_to_master' | 'graduate_to_active'): { success: boolean, transfer?: PowerTransfer, message: string } {
    const config = MASTER_INHERITANCE_CONFIG.powerTransfer

    // 检查每日次数限制
    const today = new Date().toDateString()
    const dailyCount = this.dailyTransferCount.get(fromId)
    if (dailyCount && dailyCount.date === today && dailyCount.count >= config.dailyLimit) {
      return { success: false, message: `今日传功次数已用完，明日再来` }
    }

    const transfer: PowerTransfer = {
      transferId: `transfer_${fromId}_${Date.now()}`,
      fromId,
      toId,
      transferType,
      amount: config.amountPerTransfer,
      expReward: config.expPerTransfer,
      progress: 0,
      isCompleted: false,
      startTime: Date.now()
    }

    const transfers = this.powerTransfers.get(fromId) || []
    transfers.push(transfer)
    this.powerTransfers.set(fromId, transfers)

    // 更新每日次数
    if (dailyCount && dailyCount.date === today) {
      dailyCount.count++
    } else {
      this.dailyTransferCount.set(fromId, { date: today, count: 1 })
    }

    return {
      success: true,
      transfer,
      message: `传功已开始，请等待完成`
    }
  }

  // 完成传功
  completePowerTransfer(playerId: string, transferId: string): { success: boolean, expReward?: number, message: string } {
    const transfers = this.powerTransfers.get(playerId) || []
    const transfer = transfers.find(t => t.transferId === transferId)

    if (!transfer) return { success: false, message: '传功不存在' }
    if (transfer.isCompleted) return { success: false, message: '传功已完成' }

    transfer.isCompleted = true
    transfer.completeTime = Date.now()
    transfer.progress = 100

    return {
      success: true,
      expReward: transfer.expReward,
      message: `传功完成，获得 ${transfer.expReward} 经验`
    }
  }

  // 获取传功列表
  getPowerTransfers(playerId: string): PowerTransfer[] {
    return this.powerTransfers.get(playerId) || []
  }

  // 创建羁绊
  createBond(masterId: string, discipleId: string): { success: boolean, bond?: MasterDiscipleBond, message: string } {
    const bonds = this.bonds.get(masterId) || []
    
    // 检查是否已有羁绊
    const existingBond = bonds.find(b => b.discipleId === discipleId)
    if (existingBond) return { success: false, message: '已有师徒羁绊' }

    const bond: MasterDiscipleBond = {
      bondId: `bond_${masterId}_${discipleId}_${Date.now()}`,
      masterId,
      discipleId,
      bondLevel: 1,
      bondExp: 0,
      bondSkills: [],
      bondBuffs: { attack: 0, defense: 0, hp: 0, exp: 0 },
      bondTasks: [],
      createTime: Date.now(),
      lastActiveTime: Date.now()
    }

    // 初始化羁绊技能
    BOND_SKILLS.forEach(skill => {
      bond.bondSkills.push({
        ...skill,
        isActivated: false
      })
    })

    bonds.push(bond)
    this.bonds.set(masterId, bonds)

    return {
      success: true,
      bond,
      message: '师徒羁绊已建立！'
    }
  }

  // 羁绊经验增加
  addBondExp(masterId: string, discipleId: string, exp: number): { levelUp: boolean, newLevel?: number, message: string } {
    const bonds = this.bonds.get(masterId) || []
    const bond = bonds.find(b => b.discipleId === discipleId)

    if (!bond) return { levelUp: false, message: '羁绊不存在' }

    const config = MASTER_INHERITANCE_CONFIG.bond
    bond.bondExp += exp

    let levelUp = false
    let newLevel = bond.bondLevel

    // 检查升级
    while (bond.bondExp >= config.expPerLevel * bond.bondLevel && bond.bondLevel < config.maxLevel) {
      bond.bondExp -= config.expPerLevel * bond.bondLevel
      bond.bondLevel++
      levelUp = true
      newLevel = bond.bondLevel
    }

    // 更新羁绊属性
    this.updateBondBuffs(bond)

    bond.lastActiveTime = Date.now()

    return {
      levelUp,
      newLevel: levelUp ? newLevel : undefined,
      message: levelUp ? `羁绊升级至${newLevel}级！` : `羁绊经验+${exp}`
    }
  }

  // 更新羁绊属性
  private updateBondBuffs(bond: MasterDiscipleBond): void {
    const buffPerLevel = {
      attack: 5,
      defense: 5,
      hp: 50,
      exp: 2
    }

    bond.bondBuffs = {
      attack: bond.bondLevel * buffPerLevel.attack,
      defense: bond.bondLevel * buffPerLevel.defense,
      hp: bond.bondLevel * buffPerLevel.hp,
      exp: bond.bondLevel * buffPerLevel.exp
    }

    // 更新技能激活状态
    bond.bondSkills.forEach(skill => {
      if (skill.requirement.type === 'bond_level') {
        skill.isActivated = bond.bondLevel >= skill.requirement.value
      }
    })
  }

  // 获取羁绊
  getBond(masterId: string, discipleId: string): MasterDiscipleBond | undefined {
    const bonds = this.bonds.get(masterId) || []
    return bonds.find(b => b.discipleId === discipleId)
  }

  // 获取玩家的所有羁绊
  getBonds(playerId: string): MasterDiscipleBond[] {
    let bonds: MasterDiscipleBond[] = []
    
    // 作为师父的羁绊
    const asMaster = this.bonds.get(playerId) || []
    bonds = bonds.concat(asMaster)
    
    // 作为徒弟的羁绊
    this.bonds.forEach(bondList => {
      const asDisciple = bondList.find(b => b.discipleId === playerId)
      if (asDisciple) bonds.push(asDisciple)
    })
    
    return bonds
  }

  // 出师传承
  startGraduateInheritance(masterId: string, formerDiscipleId: string): { success: boolean, inheritance?: GraduateInheritance, message: string } {
    const config = MASTER_INHERITANCE_CONFIG.graduateInheritance

    // 检查是否已有激活的出师传承
    const existing = this.graduateInheritances.get(masterId) || []
    const active = existing.find(i => i.isActive && i.formerDiscipleId === formerDiscipleId)
    if (active) return { success: false, message: '已有出师传承进行中' }

    const inheritance: GraduateInheritance = {
      inheritanceId: `graduate_${masterId}_${formerDiscipleId}_${Date.now()}`,
      formerDiscipleId,
      masterId,
      graduateRewards: {
        gold: 10000,
        items: [{ itemId: 'graduate_token', count: 1 }],
        titles: ['graduate_title_1'],
        skills: []
      },
      blessing: { ...config.blessing },
      blessingDuration: config.blessingDuration,
      isActive: true,
      startTime: Date.now()
    }

    existing.push(inheritance)
    this.graduateInheritances.set(masterId, existing)

    return {
      success: true,
      inheritance,
      message: '出师传承已发起！'
    }
  }

  // 获取出师传承
  getGraduateInheritances(playerId: string): GraduateInheritance[] {
    return this.graduateInheritances.get(playerId) || []
  }

  // 获取羁绊属性加成
  getBondBuffs(playerId: string): { attack: number, defense: number, hp: number, exp: number } {
    const bonds = this.getBonds(playerId)
    
    const buffs = {
      attack: 0,
      defense: 0,
      hp: 0,
      exp: 0
    }

    bonds.forEach(bond => {
      buffs.attack += bond.bondBuffs.attack
      buffs.defense += bond.bondBuffs.defense
      buffs.hp += bond.bondBuffs.hp
      buffs.exp += bond.bondBuffs.exp
    })

    return buffs
  }

  // 获取出师传承祝福
  getGraduateBlessing(playerId: string): { attack: number, defense: number, hp: number, expBonus: number, dropBonus: number, isActive: boolean } {
    const inheritances = this.getGraduateInheritances(playerId)
    const now = Date.now()

    for (const inheritance of inheritances) {
      if (inheritance.isActive) {
        if (inheritance.expireTime && inheritance.expireTime < now) {
          inheritance.isActive = false
          continue
        }
        return {
          ...inheritance.blessing,
          isActive: true
        }
      }
    }

    return {
      attack: 0,
      defense: 0,
      hp: 0,
      expBonus: 0,
      dropBonus: 0,
      isActive: false
    }
  }
}

export default MasterInheritanceSystem
