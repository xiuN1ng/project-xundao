// 资源回收系统 - 道具回收、装备回收、资源再利用
// 支持多种回收方式，包括直接回收、分解、熔炼等

export interface RecycleConfig {
  // 回收类型
  recycleTypes: {
    // 直接回收
    direct: {
      enabled: boolean
      // 回收折扣(0-1)
      discountRate: number
    }
    // 分解
    decompose: {
      enabled: boolean
      // 分解产物
      products: { itemId: string, minCount: number, maxCount: number, rate: number }[]
    }
    // 熔炼
    smelt: {
      enabled: boolean
      // 熔炼需要等级
      requireLevel: number
      // 熔炼产物
      products: { itemId: string, count: number, rate: number }[]
    }
    // 合成回收
   合成: {
      enabled: boolean
      // 合成材料回收比例
      returnRate: number
    }
  }
  // VIP回收加成
  vipBonus: {
    // 额外金币加成
    goldBonus: number
    // 额外积分加成
    pointBonus: number
  }
  // 批量回收上限
  batchLimit: number
}

export interface RecycleRecord {
  recordId: string
  playerId: string
  recycleType: 'direct' | 'decompose' | 'smelt' | 'synthesis'
  items: { itemId: string, itemName: string, quantity: number, value: number }[]
  rewards: { type: 'gold' | 'item' | 'point', itemId?: string, amount: number }[]
  recycleTime: number
  vipBonus: number
}

export interface RecycleResult {
  success: boolean
  record?: RecycleRecord
  rewards: { type: 'gold' | 'item' | 'point', itemId?: string, amount: number }[]
  message: string
}

// 回收配置
export const RECYCLE_CONFIG: RecycleConfig = {
  recycleTypes: {
    direct: {
      enabled: true,
      discountRate: 0.5  // 50%回收
    },
    decompose: {
      enabled: true,
      products: [
        { itemId: 'material_1', minCount: 1, maxCount: 3, rate: 0.8 },  // 分解石
        { itemId: 'material_2', minCount: 1, maxCount:2, rate: 0.5 }, // 精华
        { itemId: 'material_3', minCount: 1, maxCount: 1, rate: 0.2 } // 稀有材料
      ]
    },
    smelt: {
      enabled: true,
      requireLevel: 10,
      products: [
        { itemId: 'smelt_ore_1', count: 1, rate: 1 },   // 初级矿石
        { itemId: 'smelt_ore_2', count: 1, rate: 0.5 }, // 中级矿石
        { itemId: 'smelt_ore_3', count: 1, rate: 0.2 }  // 高级矿石
      ]
    },
    合成: {
      enabled: true,
      returnRate: 0.8  // 80%返还
    }
  },
  vipBonus: {
    goldBonus: 0.2,   // VIP额外20%金币
    pointBonus: 0.3   // VIP额外30%积分
  },
  batchLimit: 100
}

// 装备回收配置
export const EQUIPMENT_RECYCLE_CONFIG = {
  // 品质对应的基础回收价值
  qualityBaseValue: {
    white: 10,
    green: 50,
    blue: 200,
    purple: 1000,
    orange: 5000,
    red: 25000,
    gold: 100000
  },
  // 等级加成
  levelBonus: {
    // 每级增加百分比
    perLevel: 0.05,
    // 最大加成
    maxBonus: 5
  },
  // 强化回收
  enhanceReturn: {
    // 强化等级返还比例
    perLevel: 0.1
  },
  // 精炼回收
  refineReturn: {
    // 精炼等级返还
    perLevel: 50
  }
}

// 道具回收配置
export const ITEM_RECYCLE_CONFIG = {
  // 常见道具回收
  common: {
    // 消耗品
    consumable: {
      returnRate: 0.3,
      returnType: 'gold'
    },
    // 任务物品
    quest: {
      returnRate: 0.5,
      returnType: 'gold'
    },
    // 材料
    material: {
      returnRate: 0.8,
      returnType: 'gold'
    },
    // 特殊物品
    special: {
      returnRate: 1.0,
      returnType: 'point'
    }
  }
}

// 资源回收系统
export class RecycleSystem {
  private recycleRecords: Map<string, RecycleRecord[]> = new Map()

  // 直接回收道具/装备
  directRecycle(playerId: string, items: { itemId: string, itemName: string, quantity: number, value: number }[], vipLevel: number = 0): RecycleResult {
    const config = RECYCLE_CONFIG
    const totalValue = items.reduce((sum, item) => sum + item.value * item.quantity, 0)
    
    // 计算回收金币
    let goldReward = Math.floor(totalValue * config.recycleTypes.direct.discountRate)
    
    // VIP加成
    let vipBonus = 0
    if (vipLevel > 0) {
      vipBonus = Math.floor(goldReward * config.vipBonus.goldBonus)
      goldReward += vipBonus
    }

    const rewards: { type: 'gold' | 'item' | 'point', itemId?: string, amount: number }[] = [
      { type: 'gold', amount: goldReward }
    ]

    const record: RecycleRecord = {
      recordId: `recycle_${playerId}_${Date.now()}`,
      playerId,
      recycleType: 'direct',
      items,
      rewards,
      recycleTime: Date.now(),
      vipBonus
    }

    this.addRecycleRecord(playerId, record)

    return {
      success: true,
      record,
      rewards,
      message: `回收成功，获得 ${goldReward} 金币${vipBonus > 0 ? `（VIP加成: +${vipBonus}）` : ''}`
    }
  }

  // 分解装备
  decomposeEquipment(playerId: string, items: { itemId: string, itemName: string, quality: string, level: number, enhanceLevel: number }[], vipLevel: number = 0): RecycleResult {
    const config = RECYCLE_CONFIG.decompose
    const products = config.products
    const resultItems: { type: 'gold' | 'item' | 'point', itemId?: string, amount: number }[] = []

    items.forEach(item => {
      // 根据品质计算分解产物
      products.forEach(product => {
        if (Math.random() < product.rate) {
          const count = this.randomInt(product.minCount, product.maxCount)
          // 品质加成
          const qualityBonus = this.getQualityBonus(item.quality)
          
          const existing = resultItems.find(r => r.itemId === product.itemId)
          if (existing) {
            existing.amount += count * qualityBonus
          } else {
            resultItems.push({
              type: 'item',
              itemId: product.itemId,
              amount: count * qualityBonus
            })
          }
        }
      })
    })

    // VIP加成
    let vipBonus = 0
    if (vipLevel > 0) {
      const totalValue = resultItems.reduce((sum, item) => sum + item.amount, 0)
      vipBonus = Math.floor(totalValue * config.recycleTypes.vipBonus.pointBonus)
      resultItems.push({ type: 'point', amount: vipBonus })
    }

    const record: RecycleRecord = {
      recordId: `recycle_${playerId}_${Date.now()}`,
      playerId,
      recycleType: 'decompose',
      items: items.map(i => ({ ...i, value: 0, quantity: 1 })),
      rewards: resultItems,
      recycleTime: Date.now(),
      vipBonus
    }

    this.addRecycleRecord(playerId, record)

    const itemDescriptions = resultItems.map(r => r.itemId ? `${r.itemId}x${r.amount}` : `${r.amount}`).join(', ')
    return {
      success: true,
      record,
      rewards: resultItems,
      message: `分解成功，获得: ${itemDescriptions}${vipBonus > 0 ? `（VIP积分: +${vipBonus}）` : ''}`
    }
  }

  // 熔炼装备
  smeltEquipment(playerId: string, items: { itemId: string, itemName: string, quality: string, level: number }[], vipLevel: number = 0): RecycleResult {
    const config = RECYCLE_CONFIG.recycleTypes.smelt
    
    // 检查等级要求
    const minLevel = Math.min(...items.map(i => i.level))
    if (minLevel < config.requireLevel) {
      return {
        success: false,
        rewards: [],
        message: `装备等级需要${config.requireLevel}级以上才能熔炼`
      }
    }

    const products = config.products
    const resultItems: { type: 'gold' | 'item' | 'point', itemId?: string, amount: number }[] = []

    items.forEach(item => {
      // 根据品质计算熔炼产物
      products.forEach(product => {
        if (Math.random() < product.rate) {
          // 品质加成
          const qualityBonus = this.getQualityBonus(item.quality)
          
          const existing = resultItems.find(r => r.itemId === product.itemId)
          if (existing) {
            existing.amount += product.count * qualityBonus
          } else {
            resultItems.push({
              type: 'item',
              itemId: product.itemId,
              amount: product.count * qualityBonus
            })
          }
        }
      })

      // 熔炼必定获得金币
      const qualityBase = EQUIPMENT_RECYCLE_CONFIG.qualityBaseValue[item.quality as keyof typeof EQUIPMENT_RECYCLE_CONFIG.qualityBaseValue] || 10
      const levelBonus = 1 + Math.min(item.level * EQUIPMENT_RECYCLE_CONFIG.levelBonus.perLevel, EQUIPMENT_RECYCLE_CONFIG.levelBonus.maxBonus)
      const goldReward = Math.floor(qualityBase * levelBonus)

      const existingGold = resultItems.find(r => r.type === 'gold')
      if (existingGold) {
        existingGold.amount += goldReward
      } else {
        resultItems.push({ type: 'gold', amount: goldReward })
      }
    })

    // VIP加成
    let vipBonus = 0
    if (vipLevel > 0) {
      const totalValue = resultItems.reduce((sum, item) => sum + item.amount, 0)
      vipBonus = Math.floor(totalValue * RECYCLE_CONFIG.vipBonus.pointBonus)
      resultItems.push({ type: 'point', amount: vipBonus })
    }

    const record: RecycleRecord = {
      recordId: `recycle_${playerId}_${Date.now()}`,
      playerId,
      recycleType: 'smelt',
      items: items.map(i => ({ ...i, value: 0, quantity: 1 })),
      rewards: resultItems,
      recycleTime: Date.now(),
      vipBonus
    }

    this.addRecycleRecord(playerId, record)

    const itemDescriptions = resultItems.map(r => r.itemId ? `${r.itemId}x${r.amount}` : `${r.amount}`).join(', ')
    return {
      success: true,
      record,
      rewards: resultItems,
      message: `熔炼成功，获得: ${itemDescriptions}${vipBonus > 0 ? `（VIP积分: +${vipBonus}）` : ''}`
    }
  }

  // 合成材料回收（未成功的合成返还）
  recycleSynthesisMaterials(playerId: string, materials: { itemId: string, itemName: string, quantity: number, value: number }[], vipLevel: number = 0): RecycleResult {
    const config = RECYCLE_CONFIG.recycleTypes.合成
    
    const totalValue = materials.reduce((sum, item) => sum + item.value * item.quantity, 0)
    const returnValue = Math.floor(totalValue * config.returnRate)

    // 返还金币
    let goldReward = returnValue
    
    // VIP加成
    let vipBonus = 0
    if (vipLevel > 0) {
      vipBonus = Math.floor(goldReward * RECYCLE_CONFIG.vipBonus.goldBonus)
      goldReward += vipBonus
    }

    const rewards: { type: 'gold' | 'item' | 'point', itemId?: string, amount: number }[] = [
      { type: 'gold', amount: goldReward }
    ]

    const record: RecycleRecord = {
      recordId: `recycle_${playerId}_${Date.now()}`,
      playerId,
      recycleType: 'synthesis',
      items: materials,
      rewards,
      recycleTime: Date.now(),
      vipBonus
    }

    this.addRecycleRecord(playerId, record)

    return {
      success: true,
      record,
      rewards,
      message: `合成材料回收成功，获得 ${goldReward} 金币${vipBonus > 0 ? `（VIP加成: +${vipBonus}）` : ''}`
    }
  }

  // 批量回收装备
  batchRecycleEquipment(playerId: string, items: { itemId: string, itemName: string, quality: string, level: number, enhanceLevel: number, refineLevel: number }[], recycleType: 'direct' | 'decompose' | 'smelt', vipLevel: number = 0): RecycleResult {
    const config = RECYCLE_CONFIG
    
    // 检查批量限制
    if (items.length > config.batchLimit) {
      return {
        success: false,
        rewards: [],
        message: `批量回收上限: ${config.batchLimit}个`
      }
    }

    switch (recycleType) {
      case 'direct':
        // 计算每个装备的价值
        const equipItems = items.map(item => {
          let value = EQUIPMENT_RECYCLE_CONFIG.qualityBaseValue[item.quality as keyof typeof EQUIPMENT_RECYCLE_CONFIG.qualityBaseValue] || 10
          
          // 等级加成
          const levelBonus = 1 + Math.min(item.level * EQUIPMENT_RECYCLE_CONFIG.levelBonus.perLevel, EQUIPMENT_RECYCLE_CONFIG.levelBonus.maxBonus)
          value = Math.floor(value * levelBonus)
          
          // 强化加成
          if (item.enhanceLevel > 0) {
            value += Math.floor(value * item.enhanceLevel * EQUIPMENT_RECYCLE_CONFIG.enhanceReturn.perLevel)
          }
          
          // 精炼加成
          if (item.refineLevel > 0) {
            value += item.refineLevel * EQUIPMENT_RECYCLE_CONFIG.refineReturn.perLevel
          }
          
          return {
            itemId: item.itemId,
            itemName: item.itemName,
            quantity: 1,
            value
          }
        })
        return this.directRecycle(playerId, equipItems, vipLevel)
        
      case 'decompose':
        return this.decomposeEquipment(playerId, items, vipLevel)
        
      case 'smelt':
        return this.smeltEquipment(playerId, items, vipLevel)
        
      default:
        return {
          success: false,
          rewards: [],
          message: '无效的回收类型'
        }
    }
  }

  // 获取回收记录
  getRecycleRecords(playerId: string, page: number = 1, pageSize: number = 20): { records: RecycleRecord[], total: number } {
    const records = this.recycleRecords.get(playerId) || []
    
    // 按时间倒序
    records.sort((a, b) => b.recycleTime - a.recycleTime)
    
    const total = records.length
    const start = (page - 1) * pageSize
    const pagedRecords = records.slice(start, start + pageSize)
    
    return { records: pagedRecords, total }
  }

  // 获取回收预估价值
  getRecycleEstimate(items: { quality: string, level: number, enhanceLevel: number, refineLevel: number }[]): { minGold: number, maxGold: number, items: { itemId: string, minCount: number, maxCount: number }[] } {
    let minGold = 0
    let maxGold = 0
    const itemDrops: { itemId: string, minCount: number, maxCount: number }[] = []

    items.forEach(item => {
      // 直接回收估值
      let baseValue = EQUIPMENT_RECYCLE_CONFIG.qualityBaseValue[item.quality as keyof typeof EQUIPMENT_RECYCLE_CONFIG.qualityBaseValue] || 10
      const levelBonus = 1 + Math.min(item.level * EQUIPMENT_RECYCLE_CONFIG.levelBonus.perLevel, EQUIPMENT_RECYCLE_CONFIG.levelBonus.maxBonus)
      baseValue = Math.floor(baseValue * levelBonus)
      
      minGold += Math.floor(baseValue * RECYCLE_CONFIG.recycleTypes.direct.discountRate)
      maxGold += Math.floor(baseValue * RECYCLE_CONFIG.recycleTypes.direct.discountRate)
      
      // 分解产物估算
      RECYCLE_CONFIG.recycleTypes.decompose.products.forEach(product => {
        if (Math.random() < product.rate) {
          const existing = itemDrops.find(d => d.itemId === product.itemId)
          if (existing) {
            existing.minCount += product.minCount
            existing.maxCount += product.maxCount
          } else {
            itemDrops.push({
              itemId: product.itemId,
              minCount: product.minCount,
              maxCount: product.maxCount
            })
          }
        }
      })
    })

    return { minGold, maxGold, items: itemDrops }
  }

  // 添加回收记录
  private addRecycleRecord(playerId: string, record: RecycleRecord): void {
    const records = this.recycleRecords.get(playerId) || []
    records.push(record)
    this.recycleRecords.set(playerId, records)
  }

  // 获取品质加成
  private getQualityBonus(quality: string): number {
    const bonusMap: Record<string, number> = {
      white: 1,
      green: 1.2,
      blue: 1.5,
      purple: 2,
      orange: 3,
      red: 5,
      gold: 10
    }
    return bonusMap[quality] || 1
  }

  // 随机整数
  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }
}

export default RecycleSystem
