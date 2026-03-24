// 师徒贡献商店 - 师父/徒弟贡献度兑换系统
// 贡献度可兑换：专属称号、装备、道具、技能、坐骑、翅膀等

import { MasterDiscipleSystem } from './master-disciple-system'

// ==================== 类型定义 ====================

export interface ContributionShopItem {
  itemId: string
  name: string
  nameCN: string
  description: string
  category: 'title' | 'equipment' | 'item' | 'skill' | 'mount' | 'wing' | 'pet' | 'buff' | 'token'
  quality: 'blue' | 'purple' | 'orange' | 'red'
  // 兑换条件
  requirement: {
    type: 'master_contribution' | 'disciple_contribution' | 'total_contribution'
    minValue: number
    minMasterLevel?: number
    minDiscipleLevel?: number
  }
  // 消耗
  cost: {
    type: 'master_contribution' | 'disciple_contribution'
    amount: number
  }
  // 奖励
  rewards: {
    type: 'title' | 'equipment' | 'item' | 'skill' | 'mount' | 'wing' | 'pet' | 'buff' | 'token'
    value: string
    count?: number
    duration?: number  // 持续时间（天），0=永久
  }[]
  // 限购
  purchaseLimit?: {
    daily?: number
    weekly?: number
    total?: number
  }
  // 是否上架
  onSale: boolean
}

export interface PlayerShopRecord {
  playerId: string
  purchasedItems: Map<string, {
    count: number
    lastPurchaseTime: number
    dailyCount: number
    lastDailyReset: number
    weeklyCount: number
    lastWeeklyReset: number
  }>
}

// ==================== 商品配置 ====================

// 贡献商店物品列表
export const CONTRIBUTION_SHOP_ITEMS: ContributionShopItem[] = [
  // ===== 称号类 =====
  {
    itemId: 'shop_title_01',
    name: 'Mentor Grace',
    nameCN: '师恩浩荡',
    description: '师徒贡献≥500时可兑换，获得攻击+10%',
    category: 'title',
    quality: 'purple',
    requirement: { type: 'master_contribution', minValue: 500 },
    cost: { type: 'master_contribution', amount: 500 },
    rewards: [{ type: 'title', value: 'mentor_grace' }],
    purchaseLimit: { total: 1 },
    onSale: true,
  },
  {
    itemId: 'shop_title_02',
    name: 'Disciple Respect',
    nameCN: '弟子之敬',
    description: '徒弟贡献≥500时可兑换，获得防御+10%',
    category: 'title',
    quality: 'purple',
    requirement: { type: 'disciple_contribution', minValue: 500 },
    cost: { type: 'disciple_contribution', amount: 500 },
    rewards: [{ type: 'title', value: 'disciple_respect' }],
    purchaseLimit: { total: 1 },
    onSale: true,
  },
  {
    itemId: 'shop_title_03',
    name: 'Legendary Master',
    nameCN: '传奇师父',
    description: '累计贡献≥2000时可兑换，全属性+5%',
    category: 'title',
    quality: 'orange',
    requirement: { type: 'total_contribution', minValue: 2000 },
    cost: { type: 'master_contribution', amount: 2000 },
    rewards: [{ type: 'title', value: 'legendary_master' }],
    purchaseLimit: { total: 1 },
    onSale: true,
  },
  {
    itemId: 'shop_title_04',
    name: 'Elite Disciple',
    nameCN: '精英弟子',
    description: '徒弟贡献≥1000时可兑换，经验+15%',
    category: 'title',
    quality: 'orange',
    requirement: { type: 'disciple_contribution', minValue: 1000 },
    cost: { type: 'disciple_contribution', amount: 1000 },
    rewards: [{ type: 'title', value: 'elite_disciple' }],
    purchaseLimit: { total: 1 },
    onSale: true,
  },

  // ===== 装备类 =====
  {
    itemId: 'shop_equip_01',
    name: "Master's Ring",
    nameCN: '师父之戒',
    description: '师徒贡献≥300兑换，获得攻击+50生命+200',
    category: 'equipment',
    quality: 'blue',
    requirement: { type: 'master_contribution', minValue: 300 },
    cost: { type: 'master_contribution', amount: 300 },
    rewards: [{ type: 'equipment', value: 'master_ring', count: 1 }],
    onSale: true,
  },
  {
    itemId: 'shop_equip_02',
    name: "Disciple's Bracelet",
    nameCN: '弟子手镯',
    description: '徒弟贡献≥300兑换，获得防御+50生命+200',
    category: 'equipment',
    quality: 'blue',
    requirement: { type: 'disciple_contribution', minValue: 300 },
    cost: { type: 'disciple_contribution', amount: 300 },
    rewards: [{ type: 'equipment', value: 'disciple_bracelet', count: 1 }],
    onSale: true,
  },
  {
    itemId: 'shop_equip_03',
    name: 'Golden Master Staff',
    nameCN: '金师法杖',
    description: '师父贡献≥1000兑换，获得攻击+200生命+1000',
    category: 'equipment',
    quality: 'purple',
    requirement: { type: 'master_contribution', minValue: 1000 },
    cost: { type: 'master_contribution', amount: 1000 },
    rewards: [{ type: 'equipment', value: 'golden_master_staff', count: 1 }],
    onSale: true,
  },
  {
    itemId: 'shop_equip_04',
    name: 'Jade Disciple Sword',
    nameCN: '玉弟子剑',
    description: '徒弟贡献≥1000兑换，获得攻击+200防御+100',
    category: 'equipment',
    quality: 'purple',
    requirement: { type: 'disciple_contribution', minValue: 1000 },
    cost: { type: 'disciple_contribution', amount: 1000 },
    rewards: [{ type: 'equipment', value: 'jade_disciple_sword', count: 1 }],
    onSale: true,
  },
  {
    itemId: 'shop_equip_05',
    name: 'Legendary Master Armor',
    nameCN: '传奇师父甲',
    description: '累计贡献≥5000兑换，全属性+500',
    category: 'equipment',
    quality: 'orange',
    requirement: { type: 'total_contribution', minValue: 5000 },
    cost: { type: 'master_contribution', amount: 5000 },
    rewards: [{ type: 'equipment', value: 'legendary_master_armor', count: 1 }],
    purchaseLimit: { total: 1 },
    onSale: true,
  },

  // ===== 道具类 =====
  {
    itemId: 'shop_item_01',
    name: 'Teaching Scroll',
    nameCN: '教学卷轴',
    description: '使用后获得大量经验（50000经验）',
    category: 'item',
    quality: 'blue',
    requirement: { type: 'master_contribution', minValue: 50 },
    cost: { type: 'master_contribution', amount: 50 },
    rewards: [{ type: 'item', value: 'teaching_scroll', count: 1 }],
    onSale: true,
  },
  {
    itemId: 'shop_item_02',
    name: 'Disciple Growth Box',
    nameCN: '弟子成长箱',
    description: '开启后获得弟子成长道具',
    category: 'item',
    quality: 'purple',
    requirement: { type: 'disciple_contribution', minValue: 200 },
    cost: { type: 'disciple_contribution', amount: 200 },
    rewards: [{ type: 'item', value: 'disciple_growth_box', count: 1 }],
    onSale: true,
  },
  {
    itemId: 'shop_item_03',
    name: 'Master Spirit Stone',
    nameCN: '师父灵石',
    description: '使用后获得1000灵石',
    category: 'item',
    quality: 'blue',
    requirement: { type: 'master_contribution', minValue: 100 },
    cost: { type: 'master_contribution', amount: 100 },
    rewards: [{ type: 'item', value: 'master_spirit_stone', count: 1 }],
    onSale: true,
  },
  {
    itemId: 'shop_item_04',
    name: 'Advanced Teaching Manual',
    nameCN: '高级教学手册',
    description: '使用后技能经验+5000',
    category: 'item',
    quality: 'purple',
    requirement: { type: 'master_contribution', minValue: 300 },
    cost: { type: 'master_contribution', amount: 300 },
    rewards: [{ type: 'item', value: 'advanced_teaching_manual', count: 1 }],
    onSale: true,
  },
  {
    itemId: 'shop_item_05',
    name: 'Disciple Blessing Pack',
    nameCN: '弟子祝福包',
    description: '开启后随机获得弟子道具',
    category: 'item',
    quality: 'blue',
    requirement: { type: 'disciple_contribution', minValue: 80 },
    cost: { type: 'disciple_contribution', amount: 80 },
    rewards: [{ type: 'item', value: 'disciple_blessing_pack', count: 1 }],
    onSale: true,
  },
  {
    itemId: 'shop_item_06',
    name: 'Master-Disciple Token',
    nameCN: '师徒令牌',
    description: '师徒专属道具，可用于特殊兑换',
    category: 'token',
    quality: 'orange',
    requirement: { type: 'total_contribution', minValue: 1000 },
    cost: { type: 'master_contribution', amount: 1000 },
    rewards: [{ type: 'token', value: 'master_disciple_token', count: 1 }],
    onSale: true,
  },

  // ===== BUFF类 =====
  {
    itemId: 'shop_buff_01',
    name: 'Mentor Blessing',
    nameCN: '师父祝福',
    description: '修炼效率+20%，持续7天',
    category: 'buff',
    quality: 'purple',
    requirement: { type: 'master_contribution', minValue: 200 },
    cost: { type: 'master_contribution', amount: 200 },
    rewards: [{ type: 'buff', value: 'mentor_blessing', duration: 7 }],
    purchaseLimit: { daily: 1 },
    onSale: true,
  },
  {
    itemId: 'shop_buff_02',
    name: 'Disciple Fortune',
    nameCN: '弟子福运',
    description: '掉率+30%，持续7天',
    category: 'buff',
    quality: 'purple',
    requirement: { type: 'disciple_contribution', minValue: 200 },
    cost: { type: 'disciple_contribution', amount: 200 },
    rewards: [{ type: 'buff', value: 'disciple_fortune', duration: 7 }],
    purchaseLimit: { daily: 1 },
    onSale: true,
  },
  {
    itemId: 'shop_buff_03',
    name: 'Teaching Efficiency',
    nameCN: '教学效率',
    description: '师徒任务奖励+50%，持续3天',
    category: 'buff',
    quality: 'blue',
    requirement: { type: 'master_contribution', minValue: 100 },
    cost: { type: 'master_contribution', amount: 100 },
    rewards: [{ type: 'buff', value: 'teaching_efficiency', duration: 3 }],
    purchaseLimit: { daily: 2 },
    onSale: true,
  },
  {
    itemId: 'shop_buff_04',
    name: 'Dual Cultivation Bonus',
    nameCN: '双修加成',
    description: '双修经验翻倍，持续1天',
    category: 'buff',
    quality: 'purple',
    requirement: { type: 'total_contribution', minValue: 500 },
    cost: { type: 'master_contribution', amount: 300 },
    rewards: [{ type: 'buff', value: 'dual_cultivation_bonus', duration: 1 }],
    purchaseLimit: { daily: 1 },
    onSale: true,
  },

  // ===== 高级稀有类 =====
  {
    itemId: 'shop_rare_01',
    name: 'Phoenix Mount',
    nameCN: '凤凰坐骑',
    description: '帅气的凤凰坐骑，身份象征',
    category: 'mount',
    quality: 'orange',
    requirement: { type: 'total_contribution', minValue: 5000 },
    cost: { type: 'master_contribution', amount: 5000 },
    rewards: [{ type: 'mount', value: 'phoenix_mount', count: 1 }],
    purchaseLimit: { total: 1 },
    onSale: true,
  },
  {
    itemId: 'shop_rare_02',
    name: 'Celestial Wing',
    nameCN: '九天翅膀',
    description: '仙气飘飘的翅膀，飞行特效',
    category: 'wing',
    quality: 'red',
    requirement: { type: 'total_contribution', minValue: 8000 },
    cost: { type: 'master_contribution', amount: 8000 },
    rewards: [{ type: 'wing', value: 'celestial_wing', count: 1 }],
    purchaseLimit: { total: 1 },
    onSale: true,
  },
  {
    itemId: 'shop_rare_03',
    name: 'Legendary Pet Egg',
    nameCN: '神兽蛋',
    description: '孵化后可获得随机神兽',
    category: 'pet',
    quality: 'orange',
    requirement: { type: 'total_contribution', minValue: 3000 },
    cost: { type: 'disciple_contribution', amount: 3000 },
    rewards: [{ type: 'pet', value: 'legendary_pet_egg', count: 1 }],
    purchaseLimit: { total: 1 },
    onSale: true,
  },
  {
    itemId: 'shop_rare_04',
    name: 'Master Secret Skill',
    nameCN: '师父秘技',
    description: '学习后获得师父专属技能',
    category: 'skill',
    quality: 'red',
    requirement: { type: 'master_contribution', minValue: 10000 },
    cost: { type: 'master_contribution', amount: 10000 },
    rewards: [{ type: 'skill', value: 'master_secret_skill', count: 1 }],
    purchaseLimit: { total: 1 },
    onSale: true,
  },
]

// ==================== 贡献商店系统 ====================

export class MasterContributionShop {
  private masterSystem: MasterDiscipleSystem
  private playerRecords: Map<string, PlayerShopRecord> = new Map()
  // 玩家贡献度缓存（来自师徒系统）
  private contributionCache: Map<string, { master: number; disciple: number }> = new Map()

  constructor(masterSystem: MasterDiscipleSystem) {
    this.masterSystem = masterSystem
  }

  // 获取玩家贡献度
  getPlayerContribution(playerId: string): { master: number; disciple: number; total: number } {
    // 优先从师徒系统获取
    const discipleMaster = this.masterSystem.getDiscipleMaster(playerId)
    if (discipleMaster) {
      return {
        master: discipleMaster.masterContribution,
        disciple: discipleMaster.discipleContribution,
        total: discipleMaster.masterContribution + discipleMaster.discipleContribution
      }
    }

    // 从师父角度获取
    const disciples = this.masterSystem.getMasterDisciples(playerId)
    let masterTotal = 0
    for (const d of disciples) {
      masterTotal += d.masterContribution
    }

    // 检查缓存
    const cached = this.contributionCache.get(playerId)
    if (cached) {
      return { ...cached, total: cached.master + cached.disciple }
    }

    return { master: masterTotal, disciple: 0, total: masterTotal }
  }

  // 设置玩家贡献度（用于没有师徒关系时）
  setPlayerContribution(playerId: string, master: number, disciple: number): void {
    this.contributionCache.set(playerId, { master, disciple })
  }

  // 获取商店商品列表
  getShopItems(playerId: string, category?: string): {
    items: ContributionShopItem[]
    playerContribution: { master: number; disciple: number; total: number }
    playerLevel: number
  } {
    const contribution = this.getPlayerContribution(playerId)
    // 简化：等级从外部传入或默认
    const playerLevel = 50

    let items = CONTRIBUTION_SHOP_ITEMS.filter(item => item.onSale)

    // 按分类筛选
    if (category) {
      items = items.filter(item => item.category === category)
    }

    // 标记每个物品的购买状态
    const record = this.getPlayerRecord(playerId)
    const result = items.map(item => {
      const purchaseInfo = this.getItemPurchaseInfo(playerId, item.itemId, record)
      return {
        ...item,
        // 附加显示信息
        canPurchase: this.canPurchase(playerId, item, record, contribution),
        purchaseInfo
      }
    })

    return {
      items: result,
      playerContribution: contribution,
      playerLevel
    }
  }

  // 检查是否可以购买
  canPurchase(
    playerId: string,
    item: ContributionShopItem,
    record: PlayerShopRecord | undefined,
    contribution: { master: number; disciple: number; total: number }
  ): { ok: boolean; reason?: string } {
    // 检查等级要求
    if (item.requirement.minMasterLevel || item.requirement.minDiscipleLevel) {
      // 简化判断：根据cost类型判断是师父还是徒弟
      const isMasterCost = item.cost.type === 'master_contribution'
      if (isMasterCost && item.requirement.minMasterLevel) {
        // 需要检查等级（这里简化处理）
      }
      if (!isMasterCost && item.requirement.minDiscipleLevel) {
        // 需要检查等级（这里简化处理）
      }
    }

    // 检查贡献度要求
    const requiredContrib = item.requirement.minValue
    switch (item.requirement.type) {
      case 'master_contribution':
        if (contribution.master < requiredContrib) {
          return { ok: false, reason: `师父贡献度不足，需要${requiredContrib}，当前${contribution.master}` }
        }
        break
      case 'disciple_contribution':
        if (contribution.disciple < requiredContrib) {
          return { ok: false, reason: `徒弟贡献度不足，需要${requiredContrib}，当前${contribution.disciple}` }
        }
        break
      case 'total_contribution':
        if (contribution.total < requiredContrib) {
          return { ok: false, reason: `累计贡献度不足，需要${requiredContrib}，当前${contribution.total}` }
        }
        break
    }

    // 检查限购
    if (item.purchaseLimit) {
      const info = this.getItemPurchaseInfo(playerId, item.itemId, record)
      if (item.purchaseLimit.total && info.totalCount >= item.purchaseLimit.total) {
        return { ok: false, reason: '已达到总购买上限' }
      }
      if (item.purchaseLimit.daily && info.todayCount >= item.purchaseLimit.daily) {
        return { ok: false, reason: '今日购买次数已用完' }
      }
      if (item.purchaseLimit.weekly && info.weekCount >= item.purchaseLimit.weekly) {
        return { ok: false, reason: '本周购买次数已用完' }
      }
    }

    return { ok: true }
  }

  // 购买商品
  purchase(
    playerId: string,
    itemId: string
  ): { success: boolean; message: string; rewards?: any } {
    const item = CONTRIBUTION_SHOP_ITEMS.find(i => i.itemId === itemId)
    if (!item) {
      return { success: false, message: '商品不存在' }
    }

    const record = this.getPlayerRecord(playerId)
    const contribution = this.getPlayerContribution(playerId)

    // 检查是否可以购买
    const canCheck = this.canPurchase(playerId, item, record, contribution)
    if (!canCheck.ok) {
      return { success: false, message: canCheck.reason || '无法购买' }
    }

    // 检查贡献度是否足够支付
    const costAmount = item.cost.amount
    const costType = item.cost.type

    if (costType === 'master_contribution' && contribution.master < costAmount) {
      return { success: false, message: '师父贡献度不足' }
    }
    if (costType === 'disciple_contribution' && contribution.disciple < costAmount) {
      return { success: false, message: '徒弟贡献度不足' }
    }

    // 扣除贡献度（这里通过师徒系统更新）
    this.deductContribution(playerId, costType, costAmount)

    // 更新购买记录
    this.updatePurchaseRecord(playerId, itemId)

    // 构建奖励
    const rewards = this.buildRewards(item)

    return {
      success: true,
      message: `成功兑换：${item.nameCN}`,
      rewards
    }
  }

  // 扣除贡献度
  private deductContribution(playerId: string, type: 'master_contribution' | 'disciple_contribution', amount: number): void {
    // 找到对应的师徒关系并扣除
    const discipleMaster = this.masterSystem.getDiscipleMaster(playerId)
    if (discipleMaster) {
      this.masterSystem.addContribution(discipleMaster.relationId, type === 'master_contribution' ? 'master' : 'disciple', -amount)
      return
    }

    // 没有师徒关系则更新缓存
    const cached = this.contributionCache.get(playerId)
    if (cached) {
      if (type === 'master_contribution') {
        cached.master = Math.max(0, cached.master - amount)
      } else {
        cached.disciple = Math.max(0, cached.disciple - amount)
      }
    }
  }

  // 获取玩家商店记录
  private getPlayerRecord(playerId: string): PlayerShopRecord | undefined {
    return this.playerRecords.get(playerId)
  }

  // 获取物品购买信息
  private getItemPurchaseInfo(
    playerId: string,
    itemId: string,
    record: PlayerShopRecord | undefined
  ): { totalCount: number; todayCount: number; weekCount: number } {
    if (!record) {
      return { totalCount: 0, todayCount: 0, weekCount: 0 }
    }

    const itemRecord = record.purchasedItems.get(itemId)
    if (!itemRecord) {
      return { totalCount: 0, todayCount: 0, weekCount: 0 }
    }

    const now = Date.now()
    const today = new Date().toDateString()
    const weekStart = this.getWeekStart()

    return {
      totalCount: itemRecord.count,
      todayCount: itemRecord.lastDailyReset < this.getDayStart() ? 0 : itemRecord.dailyCount,
      weekCount: itemRecord.lastWeeklyReset < weekStart ? 0 : itemRecord.weeklyCount
    }
  }

  // 更新购买记录
  private updatePurchaseRecord(playerId: string, itemId: string): void {
    if (!this.playerRecords.has(playerId)) {
      this.playerRecords.set(playerId, {
        playerId,
        purchasedItems: new Map()
      })
    }

    const record = this.playerRecords.get(playerId)!
    const now = Date.now()
    const today = this.getDayStart()
    const weekStart = this.getWeekStart()

    if (!record.purchasedItems.has(itemId)) {
      record.purchasedItems.set(itemId, {
        count: 0,
        lastPurchaseTime: now,
        dailyCount: 0,
        lastDailyReset: today,
        weeklyCount: 0,
        lastWeeklyReset: weekStart
      })
    }

    const itemRecord = record.purchasedItems.get(itemId)!

    // 重置每日/每周计数
    if (itemRecord.lastDailyReset < today) {
      itemRecord.dailyCount = 0
      itemRecord.lastDailyReset = today
    }
    if (itemRecord.lastWeeklyReset < weekStart) {
      itemRecord.weeklyCount = 0
      itemRecord.lastWeeklyReset = weekStart
    }

    itemRecord.count++
    itemRecord.lastPurchaseTime = now
    itemRecord.dailyCount++
    itemRecord.weeklyCount++
  }

  // 构建奖励
  private buildRewards(item: ContributionShopItem): any[] {
    return item.rewards.map(reward => ({
      type: reward.type,
      id: reward.value,
      count: reward.count || 1,
      duration: reward.duration || 0,
      description: this.getRewardDescription(item, reward)
    }))
  }

  // 获取奖励描述
  private getRewardDescription(item: ContributionShopItem, reward: any): string {
    switch (reward.type) {
      case 'title':
        return `获得称号：${item.nameCN}`
      case 'equipment':
        return `获得装备：${item.nameCN}`
      case 'item':
        return `获得道具：${item.nameCN}`
      case 'skill':
        return `学习技能：${item.nameCN}`
      case 'buff':
        return `获得BUFF：${item.nameCN}（${reward.duration}天）`
      case 'mount':
        return `获得坐骑：${item.nameCN}`
      case 'wing':
        return `获得翅膀：${item.nameCN}`
      case 'pet':
        return `获得宠物：${item.nameCN}`
      case 'token':
        return `获得令牌：${item.nameCN}`
      default:
        return `获得：${item.nameCN}`
    }
  }

  // 获取一天开始时间戳
  private getDayStart(): number {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return now.getTime()
  }

  // 获取本周开始时间戳
  private getWeekStart(): number {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const diff = now.getDate() - dayOfWeek
    now.setDate(diff)
    now.setHours(0, 0, 0, 0)
    return now.getTime()
  }

  // 获取玩家购买历史
  getPurchaseHistory(playerId: string): { itemId: string; nameCN: string; time: number; count: number }[] {
    const record = this.playerRecords.get(playerId)
    if (!record) return []

    const history: { itemId: string; nameCN: string; time: number; count: number }[] = []
    for (const [itemId, itemRecord] of record.purchasedItems) {
      const item = CONTRIBUTION_SHOP_ITEMS.find(i => i.itemId === itemId)
      if (item) {
        history.push({
          itemId,
          nameCN: item.nameCN,
          time: itemRecord.lastPurchaseTime,
          count: itemRecord.count
        })
      }
    }

    return history.sort((a, b) => b.time - a.time)
  }

  // 获取商城统计
  getShopStats(playerId: string): {
    totalSpent: number
    itemsPurchased: number
    categoriesPurchased: string[]
  } {
    const record = this.playerRecords.get(playerId)
    if (!record) {
      return { totalSpent: 0, itemsPurchased: 0, categoriesPurchased: [] }
    }

    let totalSpent = 0
    let itemsPurchased = 0
    const categoriesSet = new Set<string>()

    for (const [itemId, itemRecord] of record.purchasedItems) {
      const item = CONTRIBUTION_SHOP_ITEMS.find(i => i.itemId === itemId)
      if (item) {
        totalSpent += item.cost.amount * itemRecord.count
        itemsPurchased += itemRecord.count
        categoriesSet.add(item.category)
      }
    }

    return {
      totalSpent,
      itemsPurchased,
      categoriesPurchased: Array.from(categoriesSet)
    }
  }

  // 重置玩家每日限购（定时任务调用）
  resetDailyLimits(playerId: string): void {
    const record = this.playerRecords.get(playerId)
    if (!record) return

    const today = this.getDayStart()
    for (const itemRecord of record.purchasedItems.values()) {
      if (itemRecord.lastDailyReset < today) {
        itemRecord.dailyCount = 0
        itemRecord.lastDailyReset = today
      }
    }
  }

  // 重置玩家每周限购（定时任务调用）
  resetWeeklyLimits(playerId: string): void {
    const record = this.playerRecords.get(playerId)
    if (!record) return

    const weekStart = this.getWeekStart()
    for (const itemRecord of record.purchasedItems.values()) {
      if (itemRecord.lastWeeklyReset < weekStart) {
        itemRecord.weeklyCount = 0
        itemRecord.lastWeeklyReset = weekStart
      }
    }
  }
}

export default MasterContributionShop
export { CONTRIBUTION_SHOP_ITEMS }
