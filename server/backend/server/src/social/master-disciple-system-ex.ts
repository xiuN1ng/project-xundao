// 师徒系统扩展 - 师徒任务与师徒奖励
// 在原有师徒系统基础上扩展：师徒任务系统、师徒奖励系统、传功系统

import { MasterDiscipleSystem, MasterTask, MASTER_TASKS } from './master-disciple-system'

export interface MasterDiscipleReward {
  // 师徒专属称号
  titles: MasterTitle[]
  // 师徒专属装备
  equipment: MasterEquipment[]
  // 师徒专属道具
  items: MasterItem[]
}

export interface MasterTitle {
  titleId: string
  name: string
  nameCN: string
  description: string
  type: 'master' | 'disciple' | 'both'
  requirement: {
    type: 'disciple_count' | 'graduate_count' | 'contribution' | 'days'
    count: number
  }
  attributes: {
    attack?: number
    defense?: number
    hp?: number
    exp?: number
  }
}

export interface MasterEquipment {
  equipmentId: string
  name: string
  nameCN: string
  type: 'weapon' | 'armor' | 'accessory'
  quality: 'blue' | 'purple' | 'orange'
  attributes: {
    attack?: number
    defense?: number
    hp?: number
  }
  requirement: {
    type: 'disciple_count' | 'graduate_count' | 'contribution'
    count: number
  }
}

export interface MasterItem {
  itemId: string
  name: string
  nameCN: string
  description: string
  type: 'consumable' | 'material' | 'special'
  effect: {
    type: 'exp' | 'skill' | 'buff' | 'gift'
    value: number
  }
  source: 'master_task' | 'graduate' | 'gift'
}

// 师徒专属称号
export const MASTER_TITLES: MasterTitle[] = [
  {
    titleId: 'master_title_1',
    name: 'Master Teacher',
    nameCN: '良师益友',
    description: '累计教导3名徒弟',
    type: 'master',
    requirement: { type: 'disciple_count', count: 3 },
    attributes: { attack: 5, defense: 5 }
  },
  {
    titleId: 'master_title_2',
    name: 'Grand Master',
    nameCN: '桃李满天下',
    description: '累计教导10名徒弟',
    type: 'master',
    requirement: { type: 'disciple_count', count: 10 },
    attributes: { attack: 10, defense: 10, exp: 5 }
  },
  {
    titleId: 'master_title_3',
    name: 'Legendary Master',
    nameCN: '一代宗师',
    description: '累计教导50名徒弟',
    type: 'master',
    requirement: { type: 'disciple_count', count: 50 },
    attributes: { attack: 20, defense: 20, exp: 10 }
  },
  {
    titleId: 'disciple_title_1',
    name: 'Promising Disciple',
    nameCN: '后起之秀',
    description: '拜师7天后出师',
    type: 'disciple',
    requirement: { type: 'days', count: 7 },
    attributes: { attack: 3, defense: 3 }
  },
  {
    titleId: 'disciple_title_2',
    name: 'Outstanding Disciple',
    nameCN: '出类拔萃',
    description: '出师时贡献度达到1000',
    type: 'disciple',
    requirement: { type: 'contribution', count: 1000 },
    attributes: { attack: 8, defense: 8, exp: 5 }
  },
  {
    titleId: 'disciple_title_3',
    name: 'Legendary Disciple',
    nameCN: '名震天下',
    description: '成功出师10次',
    type: 'disciple',
    requirement: { type: 'graduate_count', count: 10 },
    attributes: { attack: 15, defense: 15, exp: 10 }
  },
]

// 师徒专属装备
export const MASTER_EQUIPMENT: MasterEquipment[] = [
  {
    equipmentId: 'master_weapon_1',
    name: "Master's Teaching Staff",
    nameCN: '名师法杖',
    type: 'weapon',
    quality: 'purple',
    attributes: { attack: 100, hp: 500 },
    requirement: { type: 'disciple_count', count: 5 }
  },
  {
    equipmentId: 'master_armor_1',
    name: "Master's Robe",
    nameCN: '名师长袍',
    type: 'armor',
    quality: 'purple',
    attributes: { defense: 80, hp: 800 },
    requirement: { type: 'disciple_count', count: 5 }
  },
  {
    equipmentId: 'disciple_weapon_1',
    name: "Disciple's Sword",
    nameCN: '弟子剑',
    type: 'weapon',
    quality: 'blue',
    attributes: { attack: 50, hp: 200 },
    requirement: { type: 'graduate_count', count: 1 }
  },
  {
    equipmentId: 'master_weapon_2',
    name: 'Grandmaster Staff',
    nameCN: '宗师法杖',
    type: 'weapon',
    quality: 'orange',
    attributes: { attack: 200, hp: 1000 },
    requirement: { type: 'disciple_count', count: 20 }
  },
]

// 师徒专属道具
export const MASTER_ITEMS: MasterItem[] = [
  {
    itemId: 'master_gift_1',
    name: 'Master\'s Blessing',
    nameCN: '师父的祝福',
    description: '使用后获得大量经验',
    type: 'consumable',
    effect: { type: 'exp', value: 1000 },
    source: 'master_task'
  },
  {
    itemId: 'master_gift_2',
    name: 'Disciple\'s Respect',
    nameCN: '弟子的敬意',
    description: '增加师徒亲密度',
    type: 'consumable',
    effect: { type: 'gift', value: 100 },
    source: 'gift'
  },
  {
    itemId: 'master_book_1',
    name: 'Teaching Manual',
    nameCN: '教学心得',
    description: '学习后提升教学效率',
    type: 'material',
    effect: { type: 'skill', value: 10 },
    source: 'graduate'
  },
  {
    itemId: 'master_buff_1',
    name: 'Master\'s Spirit',
    nameCN: '师父之魂',
    description: '装备后修炼效率提升',
    type: 'special',
    effect: { type: 'buff', value: 20 },
    source: 'graduate'
  },
]

// 扩展的师徒任务配置
export const EXTENDED_MASTER_TASKS: MasterTask[] = [
  // 日常任务 - 战斗
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
    taskId: 'daily_combat_5',
    taskName: 'Daily Combat V',
    taskNameCN: '日常修炼V',
    description: '完成5次战斗',
    type: 'daily',
    requirements: { type: 'combat', count: 5 },
    rewards: { masterExp: 50, discipleExp: 80, masterGold: 25, discipleGold: 40, contribution: 25 }
  },
  // 日常任务 - 资源
  {
    taskId: 'daily_resource_1000',
    taskName: 'Resource Collection I',
    taskNameCN: '资源收集I',
    description: '收集1000灵气',
    type: 'daily',
    requirements: { type: 'resource', count: 1000 },
    rewards: { masterExp: 15, discipleExp: 30, masterGold: 10, discipleGold: 15, contribution: 8 }
  },
  {
    taskId: 'daily_resource_5000',
    taskName: 'Resource Collection II',
    taskNameCN: '资源收集II',
    description: '收集5000灵气',
    type: 'daily',
    requirements: { type: 'resource', count: 5000 },
    rewards: { masterExp: 40, discipleExp: 70, masterGold: 20, discipleGold: 35, contribution: 20 }
  },
  // 日常任务 - 社交
  {
    taskId: 'daily_social_chat',
    taskName: 'Social Bonding',
    taskNameCN: '师徒交流',
    description: '与师父/徒弟聊天1次',
    type: 'daily',
    requirements: { type: 'social', count: 1 },
    rewards: { masterExp: 10, discipleExp: 15, masterGold: 5, discipleGold: 8, contribution: 3 }
  },
  // 每周任务
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
  {
    taskId: 'weekly_dungeon',
    taskName: 'Weekly Dungeon',
    taskNameCN: '副本挑战',
    description: '通关2次副本',
    type: 'weekly',
    requirements: { type: 'combat', count: 2 },
    rewards: { masterExp: 60, discipleExp: 120, masterGold: 60, discipleGold: 80, contribution: 30 }
  },
  // 特殊任务
  {
    taskId: 'special_graduation',
    taskName: 'Special Graduation',
    taskNameCN: '出师任务',
    description: '帮助徒弟成功出师',
    type: 'special',
    requirements: { type: 'combat', count: 1 },
    rewards: { masterExp: 500, discipleExp: 0, masterGold: 500, discipleGold: 0, contribution: 100 }
  },
  {
    taskId: 'special_mentor',
    taskName: 'Special Mentor',
    taskNameCN: '名师指导',
    description: '进行10次传功',
    type: 'special',
    requirements: { type: 'combat', count: 10 },
    rewards: { masterExp: 300, discipleExp: 500, masterGold: 200, discipleGold: 300, contribution: 80 }
  },
]

// 师徒系统扩展类
export class MasterDiscipleSystemEx {
  private masterSystem: MasterDiscipleSystem
  private playerStats: Map<string, {
    totalDisciples: number         // 累计收徒数量
    totalGraduates: number         // 累计出师数量
    totalTeachingDays: number      // 累计教学天数
    totalContribution: number      // 累计贡献度
    titles: string[]               // 已获得称号
    receivedItems: string[]        // 已领取道具
  }> = new Map()

  constructor(masterSystem: MasterDiscipleSystem) {
    this.masterSystem = masterSystem
  }

  // 获取玩家师徒统计
  getPlayerStats(playerId: string): {
    totalDisciples: number
    totalGraduates: number
    totalTeachingDays: number
    totalContribution: number
    titles: string[]
  } {
    if (!this.playerStats.has(playerId)) {
      this.playerStats.set(playerId, {
        totalDisciples: 0,
        totalGraduates: 0,
        totalTeachingDays: 0,
        totalContribution: 0,
        titles: [],
        receivedItems: []
      })
    }
    return this.playerStats.get(playerId)!
  }

  // 更新统计
  updateStats(playerId: string, updates: Partial<{
    totalDisciples: number
    totalGraduates: number
    totalTeachingDays: number
    totalContribution: number
  }>): void {
    const stats = this.getPlayerStats(playerId)
    Object.assign(stats, updates)
  }

  // 检查可领取的称号
  checkAvailableTitles(playerId: string, type: 'master' | 'disciple'): MasterTitle[] {
    const stats = this.getPlayerStats(playerId)
    const available: MasterTitle[] = []

    for (const title of MASTER_TITLES) {
      if (title.type !== type && title.type !== 'both') continue
      if (stats.titles.includes(title.titleId)) continue

      let qualifies = false
      switch (title.requirement.type) {
        case 'disciple_count':
          qualifies = stats.totalDisciples >= title.requirement.count
          break
        case 'graduate_count':
          qualifies = stats.totalGraduates >= title.requirement.count
          break
        case 'contribution':
          qualifies = stats.totalContribution >= title.requirement.count
          break
        case 'days':
          qualifies = stats.totalTeachingDays >= title.requirement.count
          break
      }

      if (qualifies) {
        available.push(title)
      }
    }

    return available
  }

  // 领取称号
  claimTitle(playerId: string, titleId: string): { success: boolean; message: string } {
    const title = MASTER_TITLES.find(t => t.titleId === titleId)
    if (!title) {
      return { success: false, message: '称号不存在' }
    }

    const stats = this.getPlayerStats(playerId)
    if (stats.titles.includes(titleId)) {
      return { success: false, message: '已拥有该称号' }
    }

    // 再次检查条件
    const available = this.checkAvailableTitles(playerId, title.type)
    if (!available.find(t => t.titleId === titleId)) {
      return { success: false, message: '不满足领取条件' }
    }

    stats.titles.push(titleId)
    return { success: true, message: `获得称号：${title.nameCN}` }
  }

  // 获取可领取的装备
  checkAvailableEquipment(playerId: string): MasterEquipment[] {
    const stats = this.getPlayerStats(playerId)
    const available: MasterEquipment[] = []

    for (const equip of MASTER_EQUIPMENT) {
      let qualifies = false
      switch (equip.requirement.type) {
        case 'disciple_count':
          qualifies = stats.totalDisciples >= equip.requirement.count
          break
        case 'graduate_count':
          qualifies = stats.totalGraduates >= equip.requirement.count
          break
        case 'contribution':
          qualifies = stats.totalContribution >= equip.requirement.count
          break
      }

      if (qualifies) {
        available.push(equip)
      }
    }

    return available
  }

  // 获取可领取的道具
  checkAvailableItems(playerId: string, source?: string): MasterItem[] {
    const stats = this.getPlayerStats(playerId)
    const available: MasterItem[] = []

    for (const item of MASTER_ITEMS) {
      if (source && item.source !== source) continue
      if (stats.receivedItems.includes(item.itemId)) continue

      // 根据来源判断条件
      let qualifies = true
      switch (item.source) {
        case 'graduate':
          qualifies = stats.totalGraduates > 0
          break
        case 'master_task':
          qualifies = stats.totalDisciples > 0
          break
        // gift 类型无限制
      }

      if (qualifies) {
        available.push(item)
      }
    }

    return available
  }

  // 领取道具
  claimItem(playerId: string, itemId: string): { success: boolean; message: string; item?: MasterItem } {
    const item = MASTER_ITEMS.find(i => i.itemId === itemId)
    if (!item) {
      return { success: false, message: '道具不存在' }
    }

    const stats = this.getPlayerStats(playerId)
    if (stats.receivedItems.includes(itemId)) {
      return { success: false, message: '已领取该道具' }
    }

    // 检查条件
    const available = this.checkAvailableItems(playerId)
    if (!available.find(i => i.itemId === itemId)) {
      return { success: false, message: '不满足领取条件' }
    }

    stats.receivedItems.push(itemId)
    return { success: true, message: `获得道具：${item.nameCN}`, item }
  }

  // 获取师徒任务列表
  getTasks(type?: 'daily' | 'weekly' | 'special'): MasterTask[] {
    if (type) {
      return EXTENDED_MASTER_TASKS.filter(t => t.type === type)
    }
    return EXTENDED_MASTER_TASKS
  }

  // 出师奖励
  graduateReward(relationId: string): { success: boolean; rewards: any; message: string } {
    const relation = this.masterSystem.getRelation(relationId)
    if (!relation) {
      return { success: false, rewards: null, message: '师徒关系不存在' }
    }

    if (relation.status !== 'completed') {
      return { success: false, rewards: null, message: '徒弟尚未出师' }
    }

    // 更新师父统计
    const masterStats = this.getPlayerStats(relation.masterId)
    masterStats.totalGraduates++
    masterStats.totalContribution += relation.discipleContribution

    // 更新徒弟统计
    const discipleStats = this.getPlayerStats(relation.discipleId)
    discipleStats.totalTeachingDays += relation.contractDays
    discipleStats.totalContribution += relation.discipleContribution

    // 计算奖励
    const rewards = {
      master: {
        exp: relation.discipleContribution * 2,
        gold: relation.discipleContribution * 5,
        contribution: relation.discipleContribution
      },
      disciple: {
        exp: relation.discipleContribution * 3,
        gold: relation.discipleContribution * 3,
        contribution: relation.discipleContribution
      }
    }

    return {
      success: true,
      rewards,
      message: '出师成功！'
    }
  }

  // 获取师徒buff
  getMasterDiscipleBuff(playerId: string): {
    attack: number
    defense: number
    hp: number
    exp: number
  } {
    const stats = this.getPlayerStats(playerId)
    let attack = 0
    let defense = 0
    let hp = 0
    let exp = 0

    // 根据称号计算属性
    for (const titleId of stats.titles) {
      const title = MASTER_TITLES.find(t => t.titleId === titleId)
      if (title) {
        attack += title.attributes.attack || 0
        defense += title.attributes.defense || 0
        hp += title.attributes.hp || 0
        exp += title.attributes.exp || 0
      }
    }

    return { attack, defense, hp, exp }
  }
}

export default MasterDiscipleSystemEx
export { MASTER_TITLES, MASTER_EQUIPMENT, MASTER_ITEMS, EXTENDED_MASTER_TASKS }
