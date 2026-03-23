// 体力系统 - 一键扫荡、体力恢复

export interface EnergyConfig {
  // 体力恢复
  regen: {
    perMinute: number        // 每分钟恢复体力
    perHour: number          // 每小时恢复体力 (用于大额恢复)
    maxDailyRegen: number    // 每日自动恢复上限
  }
  // 体力上限
  maxEnergy: {
    base: number             // 基础上限
    perLevel: number         // 每等级增加
    vipBonus: number         // VIP加成
  }
  // 体力道具
  items: {
    itemId: string
    name: string
    energyRestore: number
    vipOnly: boolean
  }[]
  // 一键扫荡
  sweep: {
    freeDaily: number        // 每日免费扫荡次数
    vipExtra: number         // VIP额外次数
    costPerSweep: number    // 单次扫荡消耗体力
    rewardMultiplier: number // 扫荡奖励倍率
    maxConsecutiveSweep: number // 最大连续扫荡次数
  }
  // 快速恢复
  quickRestore: {
    enabled: boolean
    costType: 'gold' | 'yuanbao'
    costPerEnergy: number    // 每点体力花费
    maxQuickRestore: number // 每日最大快速恢复次数
  }
  // 体力优惠
  energySale: {
    enabled: boolean
    discountTimes: { hour: number, discount: number }[]  // 折扣时段
  }
}

export const DEFAULT_ENERGY_CONFIG: EnergyConfig = {
  regen: {
    perMinute: 1,
    perHour: 60,
    maxDailyRegen: 500
  },
  maxEnergy: {
    base: 100,
    perLevel: 5,
    vipBonus: 50
  },
  items: [
    { itemId: 'energy_potion_small', name: '小体力丹', energyRestore: 30, vipOnly: false },
    { itemId: 'energy_potion_medium', name: '中体力丹', energyRestore: 100, vipOnly: false },
    { itemId: 'energy_potion_large', name: '大体力丹', energyRestore: 300, vipOnly: true },
    { itemId: 'energy_potion_max', name: '满体力丹', energyRestore: 9999, vipOnly: true }
  ],
  sweep: {
    freeDaily: 3,
    vipExtra: 5,
    costPerSweep: 10,
    rewardMultiplier: 1.2,
    maxConsecutiveSweep: 10
  },
  quickRestore: {
    enabled: true,
    costType: 'gold',
    costPerEnergy: 10,
    maxQuickRestore: 10
  },
  energySale: {
    enabled: true,
    discountTimes: [
      { hour: 12, discount: 0.9 },  // 中午9折
      { hour: 18, discount: 0.8 },  // 傍晚8折
      { hour: 21, discount: 0.7 }   // 晚上7折
    ]
  }
}

export interface PlayerEnergyData {
  playerId: string
  currentEnergy: number
  maxEnergy: number
  lastRegenTime: number
  todayRegen: number              // 今日已恢复体力
  todaySweeps: number            // 今日扫荡次数
  todayQuickRestore: number      // 今日快速恢复次数
  todaySweepResetTime: number    // 扫荡次数重置时间
  energyItemsUsed: number        // 体力道具使用次数
  vipLevel: number
}

export interface SweepResult {
  success: boolean
  dungeonId: string
  sweepCount: number
  rewards: {
    type: string
    itemId?: string
    amount: number
    quality?: string
  }[]
  expGained: number
  energyCost: number
  message: string
}

export class EnergySystem {
  private config: EnergyConfig
  private playerData: Map<string, PlayerEnergyData> = new Map()

  constructor(config: Partial<EnergyConfig> = {}) {
    this.config = { ...DEFAULT_ENERGY_CONFIG, ...config }
  }

  // 初始化玩家体力数据
  initPlayerEnergy(playerId: string, playerLevel: number = 1, vipLevel: number = 0): PlayerEnergyData {
    const maxEnergy = this.calculateMaxEnergy(playerLevel, vipLevel)

    const data: PlayerEnergyData = {
      playerId,
      currentEnergy: maxEnergy,
      maxEnergy,
      lastRegenTime: Date.now(),
      todayRegen: 0,
      todaySweeps: 0,
      todayQuickRestore: 0,
      todaySweepResetTime: this.getNextDayReset(),
      energyItemsUsed: 0,
      vipLevel
    }

    this.playerData.set(playerId, data)
    return data
  }

  // 获取玩家体力数据
  getPlayerEnergy(playerId: string): PlayerEnergyData | null {
    return this.playerData.get(playerId) || null
  }

  // 计算最大体力
  calculateMaxEnergy(playerLevel: number, vipLevel: number = 0): number {
    return this.config.maxEnergy.base + 
           (playerLevel - 1) * this.config.maxEnergy.perLevel + 
           (vipLevel > 0 ? this.config.maxEnergy.vipBonus : 0)
  }

  // 获取下次重置时间
  private getNextDayReset(): number {
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    return tomorrow.getTime()
  }

  // 检查并恢复体力
  checkAndRegenEnergy(playerId: string): { regened: number, newEnergy: number } {
    const data = this.playerData.get(playerId)
    if (!data) return { regened: 0, newEnergy: 0 }

    const now = Date.now()
    const minutesPassed = Math.floor((now - data.lastRegenTime) / 60000)

    if (minutesPassed < 1) {
      return { regened: 0, newEnergy: data.currentEnergy }
    }

    // 计算恢复体力
    let regenAmount = minutesPassed * this.config.regen.perMinute
    
    // 每日恢复上限
    const remainingDailyRegen = this.config.regen.maxDailyRegen - data.todayRegen
    regenAmount = Math.min(regenAmount, remainingDailyRegen)

    // 更新数据
    data.currentEnergy = Math.min(data.maxEnergy, data.currentEnergy + regenAmount)
    data.lastRegenTime = now
    data.todayRegen = Math.min(this.config.regen.maxDailyRegen, data.todayRegen + regenAmount)

    return { regened: regenAmount, newEnergy: data.currentEnergy }
  }

  // 消耗体力
  consumeEnergy(playerId: string, amount: number): { success: boolean, remaining: number } {
    let data = this.playerData.get(playerId)
    if (!data) {
      this.initPlayerEnergy(playerId)
      data = this.playerData.get(playerId)!
    }

    this.checkAndRegenEnergy(playerId)

    if (data.currentEnergy < amount) {
      return { success: false, remaining: data.currentEnergy }
    }

    data.currentEnergy -= amount
    return { success: true, remaining: data.currentEnergy }
  }

  // 使用体力道具
  useEnergyItem(playerId: string, itemId: string): { success: boolean, message: string, restored?: number } {
    const item = this.config.items.find(i => i.itemId === itemId)
    if (!item) {
      return { success: false, message: '体力道具不存在' }
    }

    let data = this.playerData.get(playerId)
    if (!data) {
      this.initPlayerEnergy(playerId)
      data = this.playerData.get(playerId)!
    }

    // VIP检查
    if (item.vipOnly && data.vipLevel < 1) {
      return { success: false, message: 'VIP专属道具' }
    }

    // 检查是否满体力
    if (data.currentEnergy >= data.maxEnergy) {
      return { success: false, message: '体力已满' }
    }

    // 恢复体力
    const restoreAmount = Math.min(item.energyRestore, data.maxEnergy - data.currentEnergy)
    data.currentEnergy += restoreAmount
    data.energyItemsUsed++

    return { success: true, message: `恢复${restoreAmount}点体力`, restored: restoreAmount }
  }

  // 获取扫荡次数
  getSweepCount(playerId: string): { available: number, used: number, resetTime: number } {
    let data = this.playerData.get(playerId)
    if (!data) {
      this.initPlayerEnergy(playerId)
      data = this.playerData.get(playerId)!
    }

    // 检查是否需要重置
    if (Date.now() > data.todaySweepResetTime) {
      data.todaySweeps = 0
      data.todaySweepResetTime = this.getNextDayReset()
    }

    const maxSweeps = this.config.sweep.freeDaily + 
                     (data.vipLevel > 0 ? this.config.sweep.vipExtra : 0)

    return {
      available: Math.max(0, maxSweeps - data.todaySweeps),
      used: data.todaySweeps,
      resetTime: data.todaySweepResetTime
    }
  }

  // 执行一键扫荡
  executeSweep(playerId: string, dungeonId: string, count: number, dungeonData: {
    bestScore?: number
    difficulty: number
    rewardTable: { type: string, itemId?: string, amount: number, dropRate: number }[]
  }): SweepResult {
    let data = this.playerData.get(playerId)
    if (!data) {
      this.initPlayerEnergy(playerId)
      data = this.playerData.get(playerId)!
    }

    // 获取可用扫荡次数
    const sweepInfo = this.getSweepCount(playerId)
    const actualSweepCount = Math.min(count, sweepInfo.available, this.config.sweep.maxConsecutiveSweep)

    if (actualSweepCount <= 0) {
      return {
        success: false,
        dungeonId,
        sweepCount: 0,
        rewards: [],
        expGained: 0,
        energyCost: 0,
        message: '没有可用的扫荡次数'
      }
    }

    // 检查体力
    const energyCost = actualSweepCount * this.config.sweep.costPerSweep
    const consumeResult = this.consumeEnergy(playerId, energyCost)
    if (!consumeResult.success) {
      return {
        success: false,
        dungeonId,
        sweepCount: 0,
        rewards: [],
        expGained: 0,
        energyCost: 0,
        message: `体力不足，需要${energyCost}点体力，当前${consumeResult.remaining}点`
      }
    }

    // 计算奖励
    const rewards: SweepResult['rewards'] = []
    let expGained = 0

    const multiplier = this.config.sweep.rewardMultiplier * 
                       (1 + (dungeonData.bestScore || 0) / 1000)

    for (let i = 0; i < actualSweepCount; i++) {
      // 基础经验
      expGained += Math.floor(100 * multiplier * dungeonData.difficulty)

      // 随机掉落
      for (const reward of dungeonData.rewardTable) {
        if (Math.random() < reward.dropRate) {
          const existingReward = rewards.find(r => r.itemId === reward.itemId && r.type === reward.type)
          if (existingReward) {
            existingReward.amount += reward.amount
          } else {
            rewards.push({
              type: reward.type,
              itemId: reward.itemId,
              amount: Math.floor(reward.amount * multiplier)
            })
          }
        }
      }
    }

    // 更新扫荡次数
    data.todaySweeps += actualSweepCount

    return {
      success: true,
      dungeonId,
      sweepCount: actualSweepCount,
      rewards,
      expGained,
      energyCost,
      message: `扫荡成功，消耗${energyCost}点体力，获得${expGained}点经验`
    }
  }

  // 快速恢复体力
  quickRestore(playerId: string, amount: number): { success: boolean, message: string, restored: number, cost: number } {
    let data = this.playerData.get(playerId)
    if (!data) {
      this.initPlayerEnergy(playerId)
      data = this.playerData.get(playerId)!
    }

    // 检查是否启用
    if (!this.config.quickRestore.enabled) {
      return { success: false, message: '快速恢复已关闭', restored: 0, cost: 0 }
    }

    // 检查次数
    if (data.todayQuickRestore >= this.config.quickRestore.maxQuickRestore) {
      return { success: false, message: '今日快速恢复次数已用完', restored: 0, cost: 0 }
    }

    // 计算实际恢复量
    const currentMissing = data.maxEnergy - data.currentEnergy
    const actualRestore = Math.min(amount, currentMissing)

    if (actualRestore <= 0) {
      return { success: false, message: '体力已满', restored: 0, cost: 0 }
    }

    // 计算费用
    let cost = actualRestore * this.config.quickRestore.costPerEnergy
    
    // 检查折扣
    const discount = this.getCurrentDiscount()
    cost = Math.floor(cost * discount)

    // 恢复体力
    data.currentEnergy += actualRestore
    data.todayQuickRestore++

    return {
      success: true,
      message: `快速恢复${actualRestore}点体力，消耗${cost} ${this.config.quickRestore.costType === 'gold' ? '金币' : '元宝'}`,
      restored: actualRestore,
      cost
    }
  }

  // 获取当前折扣
  getCurrentDiscount(): number {
    if (!this.config.energySale.enabled) return 1

    const currentHour = new Date().getHours()
    for (const sale of this.config.energySale.discountTimes) {
      if (currentHour === sale.hour) {
        return sale.discount
      }
    }
    return 1
  }

  // 批量扫荡（扫荡所有可扫荡的副本）
  batchSweep(playerId: string, availableDungeons: {
    dungeonId: string
    difficulty: number
    bestScore?: number
    rewardTable: { type: string, itemId?: string, amount: number, dropRate: number }[]
  }[]): { results: SweepResult[], totalExp: number, totalEnergy: number } {
    const results: SweepResult[] = []
    let totalExp = 0
    let totalEnergy = 0

    for (const dungeon of availableDungeons) {
      const sweepInfo = this.getSweepCount(playerId)
      if (sweepInfo.available <= 0) break

      // 尝试扫荡1次
      const result = this.executeSweep(playerId, dungeon.dungeonId, 1, {
        bestScore: dungeon.bestScore,
        difficulty: dungeon.difficulty,
        rewardTable: dungeon.rewardTable
      })

      if (result.success) {
        results.push(result)
        totalExp += result.expGained
        totalEnergy += result.energyCost
      }
    }

    return { results, totalExp, totalEnergy }
  }

  // 获取体力状态
  getEnergyStatus(playerId: string): {
    current: number
    max: number
    percent: number
    nextRegen: number  // 下次恢复时间(秒)
    todayRegen: number
    todaySweeps: number
    quickRestoreAvailable: number
    discount: number
  } {
    let data = this.playerData.get(playerId)
    if (!data) {
      this.initPlayerEnergy(playerId)
      data = this.playerData.get(playerId)!
    }

    const nextRegenTime = data.lastRegenTime + (60 * 1000) // 每分钟恢复
    const nextRegen = Math.max(0, Math.ceil((nextRegenTime - Date.now()) / 1000))

    const sweepInfo = this.getSweepCount(playerId)

    return {
      current: data.currentEnergy,
      max: data.maxEnergy,
      percent: Math.floor((data.currentEnergy / data.maxEnergy) * 100),
      nextRegen,
      todayRegen: data.todayRegen,
      todaySweeps: sweepInfo.used,
      quickRestoreAvailable: this.config.quickRestore.maxQuickRestore - data.todayQuickRestore,
      discount: this.getCurrentDiscount()
    }
  }
}

// 全局体力系统实例
export const energySystem = new EnergySystem()
