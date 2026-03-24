/**
 * 封魔渊扫荡系统 v1.0
 * 已通关层扫荡、重复奖励发放
 * 封魔渊是独立的深渊副本，支持多层扫荡和重复奖励
 */

// ============== 封魔渊层配置 ==============

export interface DemonAbyssLayer {
  layerId: number        // 层号 1-N
  name: string           // 层名称
  nameCN: string         // 中文名
  requiredLevel: number   // 进入等级
  energyCost: number      // 精力消耗
  enemies: DemonAbyssEnemy[]
  boss?: DemonAbyssEnemy  // BOSS（每5层有BOSS）
  baseExp: number         // 基础经验
  baseGold: number        // 基础金币
  itemDropRate: number    // 物品掉落率
  itemDropTable: string[] // 物品掉落表
  isBossLayer: boolean    // 是否为BOSS层
  difficulty: number      // 难度系数
  demonEssenceDrop: number // 魔元掉落数量
}

export interface DemonAbyssEnemy {
  enemyId: string
  name: string
  nameCN: string
  level: number
  hp: number
  attack: number
  defense: number
  skills?: string[]
  ai: 'normal' | 'aggressive' | 'defensive' | 'boss'
  dropBonus?: number      // 额外掉落加成
}

// 物品掉落表条目
export interface DropEntry {
  itemId: string
  itemNameCN: string
  itemType: 'equipment' | 'material' | 'herb' | 'treasure' | 'currency' | 'demon_artifact'
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'
  dropRate: number         // 基础掉落率
  minQuantity: number
  maxQuantity: number
  isUnique?: boolean       // 是否唯一（不掉落重复）
  duplicateExchange?: {    // 重复时兑换
    exchangeId: string
    exchangeItemId: string
    exchangeAmount: number
  }
}

// 封魔渊全局配置
export const DEMON_ABYSS_CONFIG = {
  // 总层数
  totalLayers: 100,
  // 每日扫荡限制次数
  maxSweepPerDay: 50,
  // 每次扫荡消耗精力
  sweepEnergyCost: 20,
  // 扫荡冷却（毫秒）
  sweepCooldownMs: 1000,
  // VIP扫荡加成次数
  vipSweepBonus: 10,
  // BOSS层出现周期
  bossLayerInterval: 5,
  // 重复奖励兑换配置
  duplicateExchangeRate: 0.5,  // 重复装备按50%价值兑换
  // 首通奖励倍率
  firstClearMultiplier: 2.0,
  // 扫荡收益倍率
  sweepRewardMultiplier: 1.0,
  // 连续扫荡加成（每10层+5%）
  consecutiveBonusPer: 0.05,
  consecutiveBonusInterval: 10,
  maxConsecutiveBonus: 0.50,
  // 解锁扫荡的层号（通关第X层后解锁）
  sweepUnlockLayer: 1,
  // 扫荡最小等级
  sweepMinPlayerLevel: 15,
  // 每日重置时间（北京时间8点 = UTC 0点）
  dailyResetHour: 8,
}

// 生成封魔渊所有层
function generateAbyssLayers(): DemonAbyssLayer[] {
  const layers: DemonAbyssLayer[] = []

  for (let i = 1; i <= DEMON_ABYSS_CONFIG.totalLayers; i++) {
    const isBoss = i % DEMON_ABYSS_CONFIG.bossLayerInterval === 0
    const difficulty = 1 + Math.floor(i / 10) * 0.5 + (isBoss ? 2 : 0)
    const level = 20 + i * 2

    // 基础掉落表（所有层都有）
    const baseDropTable: DropEntry[] = [
      { itemId: `demon_frag_${Math.min(6, Math.ceil(i / 15))}`, itemNameCN: `魔气碎片${Math.min(6, Math.ceil(i / 15))}`, itemType: 'material', rarity: 'rare', dropRate: 0.3 + i * 0.005, minQuantity: 1, maxQuantity: 3 },
      { itemId: 'spirit_stone', itemNameCN: '灵石', itemType: 'currency', rarity: 'common', dropRate: 0.8, minQuantity: Math.floor(10 * difficulty), maxQuantity: Math.floor(50 * difficulty) },
      { itemId: 'abyss_dust', itemNameCN: '深渊尘埃', itemType: 'material', rarity: 'common', dropRate: 0.5, minQuantity: 1, maxQuantity: 5 },
    ]

    // 装备掉落表（随层数增加）
    if (i >= 5) {
      baseDropTable.push(
        { itemId: `green_equip_${i}`, itemNameCN: `绿装${i}层`, itemType: 'equipment', rarity: 'rare', dropRate: 0.15 + i * 0.002, minQuantity: 1, maxQuantity: 1, duplicateExchange: { exchangeId: 'equip_ex', exchangeItemId: 'demon_frag_1', exchangeAmount: 5 } }
      )
    }
    if (i >= 15) {
      baseDropTable.push(
        { itemId: `blue_equip_${i}`, itemNameCN: `蓝装${i}层`, itemType: 'equipment', rarity: 'epic', dropRate: 0.08 + i * 0.001, minQuantity: 1, maxQuantity: 1, duplicateExchange: { exchangeId: 'equip_ex', exchangeItemId: 'demon_frag_2', exchangeAmount: 3 } }
      )
    }
    if (i >= 30) {
      baseDropTable.push(
        { itemId: `purple_equip_${i}`, itemNameCN: `紫装${i}层`, itemType: 'equipment', rarity: 'legendary', dropRate: 0.03 + i * 0.0005, minQuantity: 1, maxQuantity: 1, duplicateExchange: { exchangeId: 'equip_ex', exchangeItemId: 'demon_frag_3', exchangeAmount: 2 } }
      )
    }

    // 草药掉落（每层）
    baseDropTable.push(
      { itemId: `herb_level_${Math.ceil(i / 10)}`, itemNameCN: `${Math.ceil(i / 10) * 10}级草药`, itemType: 'herb', rarity: 'common', dropRate: 0.25, minQuantity: 1, maxQuantity: 2 }
    )

    // 魔器掉落（每10层）
    if (i % 10 === 0) {
      baseDropTable.push(
        { itemId: `demon_art_frag_${Math.ceil(i / 10)}`, itemNameCN: `魔器碎片${Math.ceil(i / 10)}型`, itemType: 'demon_artifact', rarity: 'epic', dropRate: 0.05, minQuantity: 1, maxQuantity: 1 }
      )
    }

    // 特殊宝物掉落（BOSS层）
    if (isBoss) {
      baseDropTable.push(
        { itemId: `demon_soul_${Math.ceil(i / 5)}`, itemNameCN: `魔魂·${Math.ceil(i / 5)}型`, itemType: 'treasure', rarity: 'legendary', dropRate: 0.10, minQuantity: 1, maxQuantity: 1 },
        { itemId: `abyss_key_${Math.ceil(i / 5)}`, itemNameCN: `深渊钥匙·${Math.ceil(i / 5)}型`, itemType: 'treasure', rarity: 'mythic', dropRate: 0.02, minQuantity: 1, maxQuantity: 1, isUnique: true }
      )
    }

    const enemy: DemonAbyssEnemy = {
      enemyId: `abyss_enemy_${i}`,
      name: `深渊怪物${i}`,
      nameCN: `深渊怪物·第${i}层`,
      level,
      hp: Math.floor(1000 * difficulty * (1 + i * 0.1)),
      attack: Math.floor(100 * difficulty * (1 + i * 0.08)),
      defense: Math.floor(50 * difficulty * (1 + i * 0.06)),
      ai: isBoss ? 'boss' : (i % 3 === 0 ? 'aggressive' : 'normal')
    }

    const boss: DemonAbyssEnemy | undefined = isBoss ? {
      enemyId: `abyss_boss_${i}`,
      name: `深渊魔主${i}`,
      nameCN: `魔主·第${i}层`,
      level: level + 5,
      hp: Math.floor(5000 * difficulty * (1 + i * 0.15)),
      attack: Math.floor(300 * difficulty * (1 + i * 0.12)),
      defense: Math.floor(150 * difficulty * (1 + i * 0.10)),
      skills: ['demon_fire', 'soul_drain'],
      ai: 'boss',
      dropBonus: 3.0
    } : undefined

    layers.push({
      layerId: i,
      name: `Layer ${i}`,
      nameCN: isBoss ? `第${i}层·魔主降临` : `第${i}层·深渊侵蚀`,
      requiredLevel: level,
      energyCost: Math.floor(10 + i * 0.5 + (isBoss ? 20 : 0)),
      enemies: [enemy],
      boss,
      baseExp: Math.floor(200 * difficulty * (1 + i * 0.1)),
      baseGold: Math.floor(100 * difficulty * (1 + i * 0.08)),
      itemDropRate: Math.min(0.9, 0.3 + i * 0.008),
      itemDropTable: baseDropTable.map(d => d.itemId),
      isBossLayer: isBoss,
      difficulty,
      demonEssenceDrop: Math.floor(5 * difficulty)
    })
  }

  return layers
}

export const DEMON_ABYSS_LAYERS: DemonAbyssLayer[] = generateAbyssLayers()

// 全局掉落表（带重复兑换信息）
export const ABYSS_DROP_TABLE: DropEntry[] = [
  { itemId: 'demon_frag_1', itemNameCN: '魔气碎片I', itemType: 'material', rarity: 'rare', dropRate: 0.30, minQuantity: 1, maxQuantity: 3 },
  { itemId: 'demon_frag_2', itemNameCN: '魔气碎片II', itemType: 'material', rarity: 'rare', dropRate: 0.20, minQuantity: 1, maxQuantity: 2 },
  { itemId: 'demon_frag_3', itemNameCN: '魔气碎片III', itemType: 'material', rarity: 'epic', dropRate: 0.12, minQuantity: 1, maxQuantity: 2 },
  { itemId: 'demon_frag_4', itemNameCN: '魔气碎片IV', itemType: 'material', rarity: 'epic', dropRate: 0.08, minQuantity: 1, maxQuantity: 1 },
  { itemId: 'demon_frag_5', itemNameCN: '魔气碎片V', itemType: 'material', rarity: 'legendary', dropRate: 0.05, minQuantity: 1, maxQuantity: 1 },
  { itemId: 'demon_frag_6', itemNameCN: '魔气碎片VI', itemType: 'material', rarity: 'legendary', dropRate: 0.03, minQuantity: 1, maxQuantity: 1 },
  { itemId: 'spirit_stone', itemNameCN: '灵石', itemType: 'currency', rarity: 'common', dropRate: 0.85, minQuantity: 10, maxQuantity: 100 },
  { itemId: 'abyss_dust', itemNameCN: '深渊尘埃', itemType: 'material', rarity: 'common', dropRate: 0.60, minQuantity: 1, maxQuantity: 10 },
  { itemId: 'abyss_essence', itemNameCN: '深渊精华', itemType: 'treasure', rarity: 'rare', dropRate: 0.15, minQuantity: 1, maxQuantity: 3 },
  { itemId: 'demon_soul', itemNameCN: '魔魂', itemType: 'treasure', rarity: 'legendary', dropRate: 0.05, minQuantity: 1, maxQuantity: 1 },
  { itemId: 'abyss_key_fragment', itemNameCN: '深渊钥匙碎片', itemType: 'treasure', rarity: 'mythic', dropRate: 0.01, minQuantity: 1, maxQuantity: 1 },
  { itemId: 'demon_art_frag_1', itemNameCN: '魔器碎片·初', itemType: 'demon_artifact', rarity: 'epic', dropRate: 0.08, minQuantity: 1, maxQuantity: 1 },
  { itemId: 'demon_art_frag_2', itemNameCN: '魔器碎片·中', itemType: 'demon_artifact', rarity: 'legendary', dropRate: 0.04, minQuantity: 1, maxQuantity: 1 },
  { itemId: 'demon_art_frag_3', itemNameCN: '魔器碎片·高', itemType: 'demon_artifact', rarity: 'mythic', dropRate: 0.01, minQuantity: 1, maxQuantity: 1 },
]

// ============== 玩家记录 ==============

export interface DemonAbyssPlayerRecord {
  playerId: string
  highestLayerCleared: number       // 已通关最高层
  sweepRecords: DemonAbyssSweepRecord[]  // 扫荡记录
  todaySweepCount: number           // 今日扫荡次数
  lastSweepDate: string             // 上次扫荡日期（YYYY-MM-DD）
  lastSweepTime: number             // 上次扫荡时间戳
  totalSweepCount: number           // 总扫荡次数
  totalExpGained: number            // 累计获得经验
  totalGoldGained: number           // 累计获得金币
  totalItemsGained: number           // 累计获得物品数
  duplicateExchanges: Map<string, number>  // 重复物品兑换记录
  firstClearFlags: Set<number>      // 首通记录
  layerAttemptCount: Map<number, number>  // 每层挑战次数
}

export interface DemonAbyssSweepRecord {
  layerId: number
  sweepTime: number
  sweepCount: number
  rewards: DemonAbyssReward[]
  duplicatesExchanged: number
  consecutiveBonus: number
}

export interface DemonAbyssReward {
  itemId: string
  itemNameCN: string
  itemType: 'exp' | 'gold' | 'currency' | 'material' | 'equipment' | 'herb' | 'treasure' | 'demon_artifact'
  rarity?: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'
  quantity: number
  isDuplicate: boolean
  exchangeItemId?: string
  exchangeAmount?: number
  layerId: number
}

// ============== 封魔渊扫荡系统类 ==============

export class DemonAbyssSystem {
  private playerRecords: Map<string, DemonAbyssPlayerRecord> = new Map()

  getPlayerRecord(playerId: string): DemonAbyssPlayerRecord {
    if (!this.playerRecords.has(playerId)) {
      const record: DemonAbyssPlayerRecord = {
        playerId,
        highestLayerCleared: 0,
        sweepRecords: [],
        todaySweepCount: 0,
        lastSweepDate: '',
        lastSweepTime: 0,
        totalSweepCount: 0,
        totalExpGained: 0,
        totalGoldGained: 0,
        totalItemsGained: 0,
        duplicateExchanges: new Map(),
        firstClearFlags: new Set(),
        layerAttemptCount: new Map()
      }
      this.playerRecords.set(playerId, record)
    }
    return this.playerRecords.get(playerId)!
  }

  getLayer(layerId: number): DemonAbyssLayer | null {
    return DEMON_ABYSS_LAYERS[layerId - 1] || null
  }

  // 检查玩家是否可以扫荡某层
  canSweep(
    playerId: string,
    layerId: number,
    playerLevel: number,
    playerVipLevel: number = 0,
    playerEnergy: number = 0
  ): { can: boolean; reason?: string } {
    const layer = this.getLayer(layerId)
    if (!layer) return { can: false, reason: `层${layerId}不存在` }

    const record = this.getPlayerRecord(playerId)

    if (playerLevel < DEMON_ABYSS_CONFIG.sweepMinPlayerLevel) {
      return { can: false, reason: `角色需达到${DEMON_ABYSS_CONFIG.sweepMinPlayerLevel}级才能扫荡封魔渊` }
    }

    if (layerId > 1 && record.highestLayerCleared < layerId - 1) {
      return { can: false, reason: `需先通关第${layerId - 1}层才能挑战第${layerId}层` }
    }

    if (!record.firstClearFlags.has(layerId)) {
      return { can: false, reason: `需先通关第${layerId}层才能扫荡` }
    }

    if (playerEnergy < layer.energyCost) {
      return { can: false, reason: `精力不足，需要${layer.energyCost}点精力` }
    }

    const now = Date.now()
    if (now - record.lastSweepTime < DEMON_ABYSS_CONFIG.sweepCooldownMs) {
      return { can: false, reason: '扫荡冷却中，请稍后再试' }
    }

    this.checkDailyReset(record)
    const maxSweep = DEMON_ABYSS_CONFIG.maxSweepPerDay + (playerVipLevel * DEMON_ABYSS_CONFIG.vipSweepBonus)
    if (record.todaySweepCount >= maxSweep) {
      return { can: false, reason: `今日扫荡次数已用完（${record.todaySweepCount}/${maxSweep}），明日8点重置` }
    }

    return { can: true }
  }

  private checkDailyReset(record: DemonAbyssPlayerRecord): void {
    const today = new Date().toISOString().split('T')[0]
    if (record.lastSweepDate !== today) {
      record.todaySweepCount = 0
      record.lastSweepDate = today
    }
  }

  // 执行扫荡（单层）
  sweepLayer(
    playerId: string,
    layerId: number,
    playerLevel: number,
    playerVipLevel: number = 0,
    playerEnergy: number = 0
  ): {
    success: boolean
    message: string
    rewards?: DemonAbyssReward[]
    stats?: { todaySweepCount: number; totalSweepCount: number; highestLayer: number }
  } {
    const layer = this.getLayer(layerId)
    if (!layer) return { success: false, message: `层${layerId}不存在` }

    const record = this.getPlayerRecord(playerId)
    const canCheck = this.canSweep(playerId, layerId, playerLevel, playerVipLevel, playerEnergy)
    if (!canCheck.can) return { success: false, message: canCheck.reason || '无法扫荡' }

    const consecutiveBonus = this.getConsecutiveBonus(record.highestLayerCleared, layerId)
    const rewards = this.generateRewards(layer, playerLevel, consecutiveBonus)

    record.lastSweepTime = Date.now()
    record.todaySweepCount++
    record.totalSweepCount++
    record.totalExpGained += rewards.filter(r => r.itemType === 'exp').reduce((sum, r) => sum + r.quantity, 0)
    record.totalGoldGained += rewards.filter(r => r.itemType === 'gold').reduce((sum, r) => sum + r.quantity, 0)
    record.totalItemsGained += rewards.filter(r => r.itemType !== 'exp' && r.itemType !== 'gold').length

    const sweepRecord: DemonAbyssSweepRecord = {
      layerId, sweepTime: Date.now(), sweepCount: 1,
      rewards, duplicatesExchanged: rewards.filter(r => r.isDuplicate).length,
      consecutiveBonus
    }
    record.sweepRecords.push(sweepRecord)
    if (record.sweepRecords.length > 100) {
      record.sweepRecords = record.sweepRecords.slice(-100)
    }

    return {
      success: true,
      message: `扫荡第${layerId}层${layer.nameCN}成功！${consecutiveBonus > 0 ? `（连续加成+${Math.round(consecutiveBonus * 100)}%）` : ''}`,
      rewards,
      stats: { todaySweepCount: record.todaySweepCount, totalSweepCount: record.totalSweepCount, highestLayer: record.highestLayerCleared }
    }
  }

  // 批量扫荡（从指定层开始连续扫荡多曾）
  sweepMultiple(
    playerId: string,
    startLayer: number,
    count: number,
    playerLevel: number,
    playerVipLevel: number = 0,
    playerEnergy: number = 0
  ): {
    success: boolean; message: string; actualSweepCount: number
    totalRewards: DemonAbyssReward[]; failedLayers: number[]
    stats: { todaySweepCount: number; totalSweepCount: number; highestLayer: number; totalExpGained: number; totalGoldGained: number; totalDuplicatesExchanged: number }
  } {
    const record = this.getPlayerRecord(playerId)
    this.checkDailyReset(record)

    const maxSweep = DEMON_ABYSS_CONFIG.maxSweepPerDay + (playerVipLevel * DEMON_ABYSS_CONFIG.vipSweepBonus)
    const remainingSweeps = Math.max(0, maxSweep - record.todaySweepCount)
    if (remainingSweeps <= 0) {
      return {
        success: false, message: `今日扫荡次数已用完（${record.todaySweepCount}/${maxSweep}）`,
        actualSweepCount: 0, totalRewards: [], failedLayers: [],
        stats: { todaySweepCount: record.todaySweepCount, totalSweepCount: record.totalSweepCount, highestLayer: record.highestLayerCleared, totalExpGained: record.totalExpGained, totalGoldGained: record.totalGoldGained, totalDuplicatesExchanged: 0 }
      }
    }

    const actualCount = Math.min(count, remainingSweeps)
    const totalRewards: DemonAbyssReward[] = []
    const failedLayers: number[] = []
    let totalDuplicates = 0
    let totalExp = 0
    let totalGold = 0

    for (let i = 0; i < actualCount; i++) {
      const layerId = startLayer + i
      const layer = this.getLayer(layerId)
      if (!layer) { failedLayers.push(layerId); continue }

      const energyNeeded = layer.energyCost * actualCount
      if (playerEnergy < energyNeeded) { failedLayers.push(layerId); continue }

      const canCheck = this.canSweep(playerId, layerId, playerLevel, playerVipLevel, playerEnergy)
      if (!canCheck.can) { failedLayers.push(layerId); continue }

      const consecutiveBonus = this.getConsecutiveBonus(record.highestLayerCleared, layerId)
      const rewards = this.generateRewards(layer, playerLevel, consecutiveBonus)

      totalRewards.push(...rewards)
      totalDuplicates += rewards.filter(r => r.isDuplicate).length
      totalExp += rewards.filter(r => r.itemType === 'exp').reduce((sum, r) => sum + r.quantity, 0)
      totalGold += rewards.filter(r => r.itemType === 'gold').reduce((sum, r) => sum + r.quantity, 0)

      record.todaySweepCount++
      record.totalSweepCount++
      record.lastSweepTime = Date.now()

      const sweepRecord: DemonAbyssSweepRecord = {
        layerId, sweepTime: Date.now(), sweepCount: 1,
        rewards, duplicatesExchanged: rewards.filter(r => r.isDuplicate).length, consecutiveBonus
      }
      record.sweepRecords.push(sweepRecord)
    }

    record.totalExpGained += totalExp
    record.totalGoldGained += totalGold
    record.totalItemsGained += totalRewards.filter(r => r.itemType !== 'exp' && r.itemType !== 'gold').length

    if (record.sweepRecords.length > 100) {
      record.sweepRecords = record.sweepRecords.slice(-100)
    }

    return {
      success: true,
      message: `批量扫荡完成：成功${actualCount - failedLayers.length}层，失败${failedLayers.length}层`,
      actualSweepCount: actualCount - failedLayers.length,
      totalRewards,
      failedLayers,
      stats: {
        todaySweepCount: record.todaySweepCount,
        totalSweepCount: record.totalSweepCount,
        highestLayer: record.highestLayerCleared,
        totalExpGained: record.totalExpGained,
        totalGoldGained: record.totalGoldGained,
        totalDuplicatesExchanged: totalDuplicates
      }
    }
  }

  // 获取连续扫荡加成
  private getConsecutiveBonus(highestCleared: number, currentLayer: number): number {
    if (currentLayer > highestCleared) return 0
    const interval = DEMON_ABYSS_CONFIG.consecutiveBonusInterval
    const per = DEMON_ABYSS_CONFIG.consecutiveBonusPer
    const bonus = Math.floor((currentLayer - 1) / interval) * per
    return Math.min(bonus, DEMON_ABYSS_CONFIG.maxConsecutiveBonus)
  }

  // 生成单次扫荡奖励
  generateRewards(layer: DemonAbyssLayer, playerLevel: number, consecutiveBonus: number = 0): DemonAbyssReward[] {
    const rewards: DemonAbyssReward[] = []
    const multiplier = DEMON_ABYSS_CONFIG.sweepRewardMultiplier * (1 + consecutiveBonus)

    // 经验奖励（必定）
    rewards.push({
      itemId: 'exp', itemNameCN: '经验', itemType: 'exp',
      quantity: Math.floor(layer.baseExp * multiplier), isDuplicate: false, layerId: layer.layerId
    })

    // 金币奖励（必定）
    rewards.push({
      itemId: 'gold', itemNameCN: '金币', itemType: 'gold',
      quantity: Math.floor(layer.baseGold * multiplier), isDuplicate: false, layerId: layer.layerId
    })

    // 深渊精华（必定）
    rewards.push({
      itemId: 'abyss_essence', itemNameCN: '深渊精华', itemType: 'currency',
      rarity: 'rare', quantity: Math.floor(layer.demonEssenceDrop * multiplier), isDuplicate: false, layerId: layer.layerId
    })

    // 物品掉落
    for (const dropEntry of ABYSS_DROP_TABLE) {
      const layerReq = this.getDropLayerRequirement(dropEntry.itemId)
      if (layer.layerId < layerReq) continue

      const effectiveRate = Math.min(0.95, dropEntry.dropRate + (layer.isBossLayer ? 0.15 : 0))
      if (Math.random() < effectiveRate) {
        const quantity = Math.floor(Math.random() * (dropEntry.maxQuantity - dropEntry.minQuantity + 1)) + dropEntry.minQuantity
        rewards.push({
          itemId: dropEntry.itemId,
          itemNameCN: dropEntry.itemNameCN,
          itemType: dropEntry.itemType as any,
          rarity: dropEntry.rarity,
          quantity: Math.floor(quantity * multiplier),
          isDuplicate: false,
          layerId: layer.layerId
        })
      }
    }

    // BOSS层额外掉落
    if (layer.isBossLayer) {
      if (Math.random() < 0.5) {
        rewards.push({
          itemId: `demon_soul_${Math.ceil(layer.layerId / 5)}`,
          itemNameCN: `魔魂·${Math.ceil(layer.layerId / 5)}型`,
          itemType: 'treasure',
          rarity: 'legendary',
          quantity: 1, isDuplicate: false, layerId: layer.layerId
        })
      }
    }

    return rewards
  }

  private getDropLayerRequirement(itemId: string): number {
    if (itemId.includes('demon_frag_1')) return 1
    if (itemId.includes('demon_frag_2')) return 10
    if (itemId.includes('demon_frag_3')) return 20
    if (itemId.includes('demon_frag_4')) return 30
    if (itemId.includes('demon_frag_5')) return 40
    if (itemId.includes('demon_frag_6')) return 50
    if (itemId.includes('demon_art_frag')) return 10
    if (itemId.includes('demon_soul')) return 5
    if (itemId.includes('abyss_key')) return 10
    return 1
  }

  // 完成层（普通通关，非扫荡）
  completeLayer(playerId: string, layerId: number, playerLevel: number): {
    success: boolean; isFirstClear: boolean; rewards: DemonAbyssReward[]; message: string; newUnlockLayer?: number
  } {
    const layer = this.getLayer(layerId)
    if (!layer) return { success: false, isFirstClear: false, rewards: [], message: `层${layerId}不存在` }

    const record = this.getPlayerRecord(playerId)
    const isFirstClear = !record.firstClearFlags.has(layerId)

    if (isFirstClear) record.firstClearFlags.add(layerId)
    if (layerId > record.highestLayerCleared) record.highestLayerCleared = layerId

    const attempts = record.layerAttemptCount.get(layerId) || 0
    record.layerAttemptCount.set(layerId, attempts + 1)

    const firstClearBonus = isFirstClear ? (DEMON_ABYSS_CONFIG.firstClearMultiplier - 1) : 0
    const rewards = this.generateRewards(layer, playerLevel, firstClearBonus)

    record.totalExpGained += rewards.filter(r => r.itemType === 'exp').reduce((sum, r) => sum + r.quantity, 0)
    record.totalGoldGained += rewards.filter(r => r.itemType === 'gold').reduce((sum, r) => sum + r.quantity, 0)
    record.totalItemsGained += rewards.filter(r => r.itemType !== 'exp' && r.itemType !== 'gold').length

    const newUnlockLayer = layerId + 1 <= DEMON_ABYSS_CONFIG.totalLayers ? layerId + 1 : undefined

    return {
      success: true,
      isFirstClear,
      rewards,
      message: isFirstClear
        ? `首通第${layerId}层${layer.nameCN}！获得双倍奖励！${newUnlockLayer ? `下一关：第${newUnlockLayer}层已解锁` : '恭喜通关全部层数！'}`
        : `通关第${layerId}层${layer.nameCN}！${newUnlockLayer ? `下一关：第${newUnlockLayer}层已解锁` : '恭喜通关全部层数！'}`,
      newUnlockLayer
    }
  }

  // 获取扫荡信息
  getSweepInfo(playerId: string, playerVipLevel: number = 0): {
    highestLayer: number; todaySweepCount: number; maxSweepPerDay: number
    canSweepLayers: number[]; totalSweepCount: number
    totalExpGained: number; totalGoldGained: number
    duplicateExchangeSummary: Record<string, number>
    recentRecords: DemonAbyssSweepRecord[]
  } {
    const record = this.getPlayerRecord(playerId)
    this.checkDailyReset(record)

    const maxSweep = DEMON_ABYSS_CONFIG.maxSweepPerDay + (playerVipLevel * DEMON_ABYSS_CONFIG.vipSweepBonus)
    const canSweepLayers = record.firstClearFlags.size > 0
      ? Array.from(record.firstClearFlags).filter(l => l <= record.highestLayerCleared).sort((a, b) => a - b)
      : []

    const dupSummary: Record<string, number> = {}
    for (const [itemId, count] of record.duplicateExchanges.entries()) {
      dupSummary[itemId] = count
    }

    return {
      highestLayer: record.highestLayerCleared,
      todaySweepCount: record.todaySweepCount,
      maxSweepPerDay: maxSweep,
      canSweepLayers,
      totalSweepCount: record.totalSweepCount,
      totalExpGained: record.totalExpGained,
      totalGoldGained: record.totalGoldGained,
      duplicateExchangeSummary: dupSummary,
      recentRecords: record.sweepRecords.slice(-10)
    }
  }

  // 处理重复物品兑换（外部调用时传入背包数据）
  handleDuplicateExchange(playerId: string, itemId: string, quantity: number, exchangeItemId: string): {
    success: boolean; message: string; exchangedQuantity?: number
  } {
    const record = this.getPlayerRecord(playerId)
    const dropEntry = ABYSS_DROP_TABLE.find(d => d.itemId === itemId)

    if (!dropEntry || !dropEntry.duplicateExchange) {
      return { success: false, message: `物品${itemId}不支持重复兑换` }
    }

    const exchange = dropEntry.duplicateExchange
    if (exchange.exchangeItemId !== exchangeItemId) {
      return { success: false, message: `物品${itemId}不能兑换为${exchangeItemId}` }
    }

    const exchangedQty = quantity * exchange.exchangeAmount
    const current = record.duplicateExchanges.get(itemId) || 0
    record.duplicateExchanges.set(itemId, current + quantity)

    return {
      success: true,
      message: `将${quantity}个${dropEntry.itemNameCN}兑换为${exchangedQty}个${exchange.exchangeItemId}`,
      exchangedQuantity: exchangedQty
    }
  }

  // 获取指定层的配置信息
  getLayerInfo(layerId: number): DemonAbyssLayer | null {
    return this.getLayer(layerId)
  }

  // 获取所有可挑战层（用于前端展示）
  getAvailableLayers(playerId: string): DemonAbyssLayer[] {
    const record = this.getPlayerRecord(playerId)
    const unlockedCount = Math.max(1, record.highestLayerCleared + 1)
    return DEMON_ABYSS_LAYERS.slice(0, Math.min(unlockedCount, DEMON_ABYSS_CONFIG.totalLayers))
  }
}

export const demonAbyssSystem = new DemonAbyssSystem()
export default DemonAbyssSystem
