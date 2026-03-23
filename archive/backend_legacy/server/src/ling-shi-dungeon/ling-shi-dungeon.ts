/**
 * 灵石副本系统
 * 灵石产出副本 - 专门产出灵石的副本
 */

export interface LingShiDungeon {
  dungeonId: string
  name: string
  nameCN: string
  levelRequired: number
  recommendedPower: number
  energyCost: number
  entryCount: number
  resetType: 'daily' | 'weekly'
  baseLingShi: number
  lingShiRange: [number, number]
  stages: LingShiStage[]
}

export interface LingShiStage {
  stageId: string
  name: string
  order: number
  enemies: LingShiEnemy[]
  boss?: LingShiEnemy
  rewardMultiplier: number
  lingShiBonus: number
}

export interface LingShiEnemy {
  enemyId: string
  name: string
  level: number
  hp: number
  attack: number
  defense: number
  lingShiDrop: number
  lingShiDropRange: [number, number]
}

export interface PlayerLingShiDungeonRecord {
  playerId: string
  dungeonId: string
  enterCount: number
  lastEnterTime: number
  completedStages: string[]
  totalLingShiEarned: number
  bestScore: number
  resetTime?: number
}

export interface LingShiDropResult {
  lingShiAmount: number
  bonusLingShi: number
  totalLingShi: number
  dropItems: LingShiDropItem[]
  luckyBonus: number
}

export interface LingShiDropItem {
  itemId: string
  itemName: string
  amount: number
  dropRate: number
}

// 灵石副本配置
export const LINGSHI_DUNGEONS: LingShiDungeon[] = [
  {
    dungeonId: 'lingshi_1',
    name: 'Spirit Stone Mine',
    nameCN: '灵石矿洞',
    levelRequired: 1,
    recommendedPower: 100,
    energyCost: 10,
    entryCount: 10,
    resetType: 'daily',
    baseLingShi: 50,
    lingShiRange: [30, 80],
    stages: [
      {
        stageId: 'lingshi_1_1',
        name: '浅层矿区',
        order: 1,
        enemies: [
          { enemyId: 'miner_spirit', name: '矿灵', level: 1, hp: 200, attack: 20, defense: 5, lingShiDrop: 10, lingShiDropRange: [5, 15] },
          { enemyId: 'stone_sprite', name: '石灵', level: 2, hp: 250, attack: 25, defense: 8, lingShiDrop: 12, lingShiDropRange: [8, 18] }
        ],
        rewardMultiplier: 1.0,
        lingShiBonus: 0
      },
      {
        stageId: 'lingshi_1_2',
        name: '中层矿区',
        order: 2,
        enemies: [
          { enemyId: 'earth_essence', name: '土精', level: 3, hp: 400, attack: 40, defense: 15, lingShiDrop: 18, lingShiDropRange: [10, 25] },
          { enemyId: 'rock_golem', name: '岩魔', level: 4, hp: 500, attack: 45, defense: 20, lingShiDrop: 20, lingShiDropRange: [12, 30] }
        ],
        rewardMultiplier: 1.2,
        lingShiBonus: 10
      },
      {
        stageId: 'lingshi_1_3',
        name: '深层矿区',
        order: 3,
        enemies: [
          { enemyId: 'crystal_wraith', name: '晶灵', level: 5, hp: 600, attack: 60, defense: 25, lingShiDrop: 25, lingShiDropRange: [15, 35] }
        ],
        boss: { enemyId: 'mine_lord', name: '矿洞之主', level: 6, hp: 1500, attack: 100, defense: 40, lingShiDrop: 50, lingShiDropRange: [30, 70] },
        rewardMultiplier: 1.5,
        lingShiBonus: 20
      }
    ]
  },
  {
    dungeonId: 'lingshi_2',
    name: 'Ancient Spirit Vein',
    nameCN: '古灵脉',
    levelRequired: 20,
    recommendedPower: 2000,
    energyCost: 20,
    entryCount: 8,
    resetType: 'daily',
    baseLingShi: 150,
    lingShiRange: [100, 250],
    stages: [
      {
        stageId: 'lingshi_2_1',
        name: '灵脉入口',
        order: 1,
        enemies: [
          { enemyId: 'spirit_wisp', name: '灵精', level: 20, hp: 1500, attack: 150, defense: 50, lingShiDrop: 30, lingShiDropRange: [20, 45] },
          { enemyId: 'flowing_essence', name: '流灵', level: 21, hp: 1800, attack: 180, defense: 60, lingShiDrop: 35, lingShiDropRange: [22, 50] }
        ],
        rewardMultiplier: 1.0,
        lingShiBonus: 0
      },
      {
        stageId: 'lingshi_2_2',
        name: '灵脉深处',
        order: 2,
        enemies: [
          { enemyId: 'energy_wraith', name: '能量幽灵', level: 22, hp: 2500, attack: 220, defense: 80, lingShiDrop: 45, lingShiDropRange: [30, 60] },
          { enemyId: 'vein_guardian', name: '灵脉守卫', level: 23, hp: 3000, attack: 250, defense: 100, lingShiDrop: 50, lingShiDropRange: [35, 70] }
        ],
        rewardMultiplier: 1.3,
        lingShiBonus: 25
      },
      {
        stageId: 'lingshi_2_3',
        name: '灵脉核心',
        order: 3,
        enemies: [
          { enemyId: 'core_spirit', name: '核心之灵', level: 24, hp: 3500, attack: 300, defense: 120, lingShiDrop: 60, lingShiDropRange: [40, 80] }
        ],
        boss: { enemyId: 'ancient_spirit', name: '古灵', level: 25, hp: 8000, attack: 450, defense: 180, lingShiDrop: 120, lingShiDropRange: [80, 160] },
        rewardMultiplier: 1.6,
        lingShiBonus: 40
      }
    ]
  },
  {
    dungeonId: 'lingshi_3',
    name: 'Celestial Spirit Mountain',
    nameCN: '先天灵山',
    levelRequired: 40,
    recommendedPower: 8000,
    energyCost: 30,
    entryCount: 5,
    resetType: 'daily',
    baseLingShi: 400,
    lingShiRange: [300, 600],
    stages: [
      {
        stageId: 'lingshi_3_1',
        name: '山脚灵地',
        order: 1,
        enemies: [
          { enemyId: 'mountain_spirit', name: '山灵', level: 40, hp: 5000, attack: 400, defense: 150, lingShiDrop: 80, lingShiDropRange: [50, 110] },
          { enemyId: 'cloud_essence', name: '云精', level: 41, hp: 5500, attack: 450, defense: 170, lingShiDrop: 90, lingShiDropRange: [60, 120] }
        ],
        rewardMultiplier: 1.0,
        lingShiBonus: 0
      },
      {
        stageId: 'lingshi_3_2',
        name: '半山灵域',
        order: 2,
        enemies: [
          { enemyId: 'peak_guardian', name: '峰灵', level: 42, hp: 8000, attack: 600, defense: 220, lingShiDrop: 120, lingShiDropRange: [80, 160] },
          { enemyId: 'thunder_spirit', name: '雷灵', level: 43, hp: 9000, attack: 650, defense: 250, lingShiDrop: 130, lingShiDropRange: [90, 180] }
        ],
        rewardMultiplier: 1.4,
        lingShiBonus: 50
      },
      {
        stageId: 'lingshi_3_3',
        name: '山顶仙境',
        order: 3,
        enemies: [
          { enemyId: 'heavenly_essence', name: '先天之精', level: 44, hp: 12000, attack: 800, defense: 300, lingShiDrop: 160, lingShiDropRange: [100, 220] }
        ],
        boss: { enemyId: 'celestial_lord', name: '先天灵主', level: 45, hp: 25000, attack: 1200, defense: 450, lingShiDrop: 300, lingShiDropRange: [200, 400] },
        rewardMultiplier: 1.8,
        lingShiBonus: 80
      }
    ]
  },
  {
    dungeonId: 'lingshi_4',
    name: 'Immortal Spirit Realm',
    nameCN: '仙人灵境',
    levelRequired: 60,
    recommendedPower: 25000,
    energyCost: 50,
    entryCount: 3,
    resetType: 'daily',
    baseLingShi: 1000,
    lingShiRange: [800, 1500],
    stages: [
      {
        stageId: 'lingshi_4_1',
        name: '灵境外围',
        order: 1,
        enemies: [
          { enemyId: 'immortal_disciple', name: '仙门弟子', level: 60, hp: 15000, attack: 1000, defense: 350, lingShiDrop: 200, lingShiDropRange: [150, 280] },
          { enemyId: 'spirit_guard', name: '灵卫', level: 61, hp: 18000, attack: 1100, defense: 400, lingShiDrop: 220, lingShiDropRange: [160, 300] }
        ],
        rewardMultiplier: 1.0,
        lingShiBonus: 0
      },
      {
        stageId: 'lingshi_4_2',
        name: '灵境深处',
        order: 2,
        enemies: [
          { enemyId: 'immortal_elder', name: '仙门长老', level: 62, hp: 25000, attack: 1500, defense: 500, lingShiDrop: 300, lingShiDropRange: [200, 400] },
          { enemyId: 'divine_beast', name: '神兽', level: 63, hp: 30000, attack: 1700, defense: 550, lingShiDrop: 350, lingShiDropRange: [250, 450] }
        ],
        rewardMultiplier: 1.5,
        lingShiBonus: 100
      },
      {
        stageId: 'lingshi_4_3',
        name: '灵境核心',
        order: 3,
        enemies: [
          { enemyId: 'immortal_master', name: '仙尊', level: 64, hp: 40000, attack: 2000, defense: 700, lingShiDrop: 450, lingShiDropRange: [300, 600] }
        ],
        boss: { enemyId: 'realm_lord', name: '灵境之主', level: 65, hp: 80000, attack: 3000, defense: 1000, lingShiDrop: 800, lingShiDropRange: [500, 1200] },
        rewardMultiplier: 2.0,
        lingShiBonus: 150
      }
    ]
  },
  {
    dungeonId: 'lingshi_5',
    name: 'Transcendent Spirit Sea',
    nameCN: '超凡灵海',
    levelRequired: 80,
    recommendedPower: 50000,
    energyCost: 80,
    entryCount: 2,
    resetType: 'daily',
    baseLingShi: 2500,
    lingShiRange: [2000, 3500],
    stages: [
      {
        stageId: 'lingshi_5_1',
        name: '灵海浅滩',
        order: 1,
        enemies: [
          { enemyId: 'sea_spirit', name: '海灵', level: 80, hp: 40000, attack: 2500, defense: 800, lingShiDrop: 500, lingShiDropRange: [350, 700] },
          { enemyId: 'wave_essence', name: '波精', level: 81, hp: 45000, attack: 2800, defense: 900, lingShiDrop: 550, lingShiDropRange: [400, 750] }
        ],
        rewardMultiplier: 1.0,
        lingShiBonus: 0
      },
      {
        stageId: 'lingshi_5_2',
        name: '灵海深处',
        order: 2,
        enemies: [
          { enemyId: 'abyssal_lord', name: '深渊之主', level: 82, hp: 60000, attack: 3500, defense: 1200, lingShiDrop: 700, lingShiDropRange: [500, 950] },
          { enemyId: 'tide_king', name: '潮汐王', level: 83, hp: 70000, attack: 3800, defense: 1300, lingShiDrop: 800, lingShiDropRange: [550, 1050] }
        ],
        rewardMultiplier: 1.6,
        lingShiBonus: 200
      },
      {
        stageId: 'lingshi_5_3',
        name: '灵海核心',
        order: 3,
        enemies: [
          { enemyId: 'ocean_spirit_king', name: '海灵王', level: 84, hp: 100000, attack: 4500, defense: 1600, lingShiDrop: 1000, lingShiDropRange: [700, 1400] }
        ],
        boss: { enemyId: 'transcendent_lord', name: '超凡灵主', level: 85, hp: 200000, attack: 6000, defense: 2200, lingShiDrop: 2000, lingShiDropRange: [1500, 3000] },
        rewardMultiplier: 2.2,
        lingShiBonus: 300
      }
    ]
  }
];

export const LINGSHI_DUNGEON_CONFIG = {
  energyRegenPerMinute: 1,
  maxEnergy: 100,
  sweep: {
    enabled: true,
    maxSweepCount: 10,
    minLevelRequired: 10,
    vipRequired: 0,
    fastSweepCost: 10
  },
  luck: {
    baseLuck: 0,
    maxLuck: 100,
    dropWeight: 0.5,
    guaranteedDrop: {
      threshold: 50,
      bonusRate: 0.2
    }
  },
  dropRate: {
    critMultiplier: [1.5, 2.5],
    baseCritRate: 0.05,
    maxDropsPerBattle: 10,
    firstClearMultiplier: 1.5
  }
};

export const LINGSHI_DROP_TABLE = {
  common: [
    { itemId: 'spirit_ore', itemName: '灵石原矿', dropRate: 0.3, amount: [1, 5] },
    { itemId: 'refining_stone', itemName: '提炼石', dropRate: 0.2, amount: [1, 3] },
    { itemId: 'polishing_powder', itemName: '打磨粉', dropRate: 0.15, amount: [1, 2] }
  ],
  rare: [
    { itemId: 'high_spirit_ore', itemName: '高品灵石', dropRate: 0.1, amount: [1, 3] },
    { itemId: 'essence_crystal', itemName: '精华结晶', dropRate: 0.08, amount: [1, 2] },
    { itemId: 'spirit_essence', itemName: '灵气精华', dropRate: 0.05, amount: [1, 2] }
  ],
  epic: [
    { itemId: 'celestial_jade', itemName: '天玉', dropRate: 0.02, amount: [1, 1] },
    { itemId: 'immortal_spirit', itemName: '仙灵', dropRate: 0.01, amount: [1, 1] }
  ]
};

export class LingShiDungeonSystem {
  private playerRecords: Map<string, Map<string, PlayerLingShiDungeonRecord>> = new Map()
  private playerLuck: Map<string, number> = new Map()
  
  getPlayerRecord(playerId: string, dungeonId: string): PlayerLingShiDungeonRecord {
    if (!this.playerRecords.has(playerId)) {
      this.playerRecords.set(playerId, new Map())
    }
    const playerDungeons = this.playerRecords.get(playerId)!
    if (!playerDungeons.has(dungeonId)) {
      const newRecord: PlayerLingShiDungeonRecord = {
        playerId, dungeonId, enterCount: 0, lastEnterTime: 0,
        completedStages: [], totalLingShiEarned: 0, bestScore: 0
      }
      playerDungeons.set(dungeonId, newRecord)
    }
    return playerDungeons.get(dungeonId)!
  }
  
  getPlayerLuck(playerId: string): number {
    if (!this.playerLuck.has(playerId)) {
      this.playerLuck.set(playerId, LINGSHI_DUNGEON_CONFIG.luck.baseLuck)
    }
    return this.playerLuck.get(playerId)!
  }
  
  setPlayerLuck(playerId: string, luck: number): void {
    const clampedLuck = Math.max(0, Math.min(luck, LINGSHI_DUNGEON_CONFIG.luck.maxLuck))
    this.playerLuck.set(playerId, clampedLuck)
  }
  
  getDungeon(dungeonId: string): LingShiDungeon | null {
    return LINGSHI_DUNGEONS.find(d => d.dungeonId === dungeonId) || null
  }
  
  getDungeonList(): LingShiDungeon[] {
    return LINGSHI_DUNGEONS
  }
  
  canEnterDungeon(playerId: string, dungeonId: string, playerLevel: number, playerPower: number): { can: boolean; reason?: string } {
    const dungeon = this.getDungeon(dungeonId)
    if (!dungeon) return { can: false, reason: '副本不存在' }
    if (playerLevel < dungeon.levelRequired) return { can: false, reason: `需要等级${dungeon.levelRequired}` }
    const record = this.getPlayerRecord(playerId, dungeonId)
    this.checkAndResetRecord(record, dungeon.resetType)
    if (record.enterCount >= dungeon.entryCount) return { can: false, reason: '今日进入次数已用完' }
    return { can: true }
  }
  
  checkAndResetRecord(record: PlayerLingShiDungeonRecord, resetType: 'daily' | 'weekly'): void {
    const now = Date.now()
    if (resetType === 'daily') {
      const lastDate = new Date(record.lastEnterTime).toDateString()
      const today = new Date().toDateString()
      if (lastDate !== today) {
        record.enterCount = 0
        record.completedStages = []
        record.resetTime = now
      }
    }
  }
  
  enterDungeon(playerId: string, dungeonId: string): { success: boolean; dungeon?: LingShiDungeon; stage?: LingShiStage; message: string } {
    const check = this.canEnterDungeon(playerId, dungeonId, 1, 0)
    if (!check.can) return { success: false, message: check.reason || '无法进入' }
    const dungeon = this.getDungeon(dungeonId)!
    const record = this.getPlayerRecord(playerId, dungeonId)
    let stageIndex = record.completedStages.length
    if (stageIndex >= dungeon.stages.length) {
      stageIndex = 0
      record.completedStages = []
    }
    record.enterCount++
    record.lastEnterTime = Date.now()
    return { success: true, dungeon, stage: dungeon.stages[stageIndex], message: `进入${dungeon.nameCN} - ${dungeon.stages[stageIndex].name}` }
  }
  
  battleAndGetDrop(playerId: string, dungeonId: string, stageId: string, playerLevel: number, playerAttack: number): { success: boolean; dropResult?: LingShiDropResult; message: string } {
    const dungeon = this.getDungeon(dungeonId)
    if (!dungeon) return { success: false, message: '副本不存在' }
    const stage = dungeon.stages.find(s => s.stageId === stageId)
    if (!stage) return { success: false, message: '关卡不存在' }
    const record = this.getPlayerRecord(playerId, dungeonId)
    const luck = this.getPlayerLuck(playerId)
    const dropResult = this.calculateLingShiDrop(dungeon, stage, playerLevel, luck, playerAttack)
    if (!record.completedStages.includes(stageId)) record.completedStages.push(stageId)
    record.totalLingShiEarned += dropResult.totalLingShi
    const score = this.calculateScore(dropResult.totalLingShi, stage)
    if (score > record.bestScore) record.bestScore = score
    const isComplete = record.completedStages.length >= dungeon.stages.length
    return { success: true, dropResult, message: isComplete ? `恭喜通关! 获得${dropResult.totalLingShi}灵石` : `完成${stage.name}, 获得${dropResult.totalLingShi}灵石` }
  }
  
  private calculateLingShiDrop(dungeon: LingShiDungeon, stage: LingShiStage, playerLevel: number, luck: number, playerAttack: number): LingShiDropResult {
    let totalLingShi = 0
    const dropItems: LingShiDropItem[] = []
    const enemies = [...stage.enemies]
    if (stage.boss) enemies.push(stage.boss)
    for (const enemy of enemies) {
      const baseDrop = enemy.lingShiDrop
      const [minDrop, maxDrop] = enemy.lingShiDropRange
      const randomDrop = Math.floor(Math.random() * (maxDrop - minDrop + 1)) + minDrop
      const levelBonus = Math.max(0, playerLevel - enemy.level) * 0.01
      const luckBonus = luck * LINGSHI_DUNGEON_CONFIG.luck.dropWeight * 0.01
      const critRate = LINGSHI_DROP_TABLE.baseCritRate + luckBonus * 0.1
      const isCrit = Math.random() < critRate
      const critMultiplier = isCrit ? LINGSHI_DROP_TABLE.critMultiplier[0] + Math.random() * (LINGSHI_DROP_TABLE.critMultiplier[1] - LINGSHI_DROP_TABLE.critMultiplier[0]) : 1
      const enemyLingShi = Math.floor(randomDrop * (1 + levelBonus) * (1 + luckBonus) * critMultiplier)
      totalLingShi += enemyLingShi
    }
    const stageMultiplier = stage.rewardMultiplier + (stage.lingShiBonus / 100)
    totalLingShi = Math.floor(totalLingShi * stageMultiplier)
    totalLingShi += dungeon.baseLingShi
    const [minRange, maxRange] = dungeon.lingShiRange
    const rangeBonus = Math.floor(Math.random() * (maxRange - minRange + 1)) + minRange
    totalLingShi += rangeBonus
    let luckyBonus = 0
    if (luck >= LINGSHI_DUNGEON_CONFIG.luck.guaranteedDrop.threshold) {
      luckyBonus = Math.floor(totalLingShi * LINGSHI_DUNGEON_CONFIG.luck.guaranteedDrop.bonusRate)
    }
    totalLingShi += luckyBonus
    this.calculateItemDrops(stage, luck, dropItems)
    return { lingShiAmount: totalLingShi - luckyBonus, bonusLingShi: luckyBonus, totalLingShi, dropItems, luckyBonus }
  }
  
  private calculateItemDrops(stage: LingShiStage, luck: number, dropItems: LingShiDropItem[]): void {
    const stageDifficulty = stage.rewardMultiplier
    const luckFactor = 1 + (luck / 100)
    for (const item of LINGSHI_DROP_TABLE.common) {
      if (Math.random() < item.dropRate * stageDifficulty * luckFactor) {
        const amount = Math.floor(Math.random() * (item.amount[1] - item.amount[0] + 1)) + item.amount[0]
        dropItems.push({ itemId: item.itemId, itemName: item.itemName, amount, dropRate: item.dropRate })
      }
    }
    for (const item of LINGSHI_DROP_TABLE.rare) {
      if (Math.random() < item.dropRate * stageDifficulty * luckFactor * 0.5) {
        const amount = Math.floor(Math.random() * (item.amount[1] - item.amount[0] + 1)) + item.amount[0]
        dropItems.push({ itemId: item.itemId, itemName: item.itemName, amount, dropRate: item.dropRate })
      }
    }
    for (const item of LINGSHI_DROP_TABLE.epic) {
      if (Math.random() < item.dropRate * stageDifficulty * luckFactor * 0.2) {
        const amount = Math.floor(Math.random() * (item.amount[1] - item.amount[0] + 1)) + item.amount[0]
        dropItems.push({ itemId: item.itemId, itemName: item.itemName, amount, dropRate: item.dropRate })
      }
    }
  }
  
  private calculateScore(lingShiEarned: number, stage: LingShiStage): number {
    const baseScore = Math.floor(lingShiEarned / 10)
    const difficultyBonus = Math.floor(stage.rewardMultiplier * 100)
    return baseScore + difficultyBonus
  }
  
  getDungeonStatus(playerId: string, dungeonId: string) {
    const dungeon = this.getDungeon(dungeonId)
    if (!dungeon) return null
    const record = this.getPlayerRecord(playerId, dungeonId)
    this.checkAndResetRecord(record, dungeon.resetType)
    return { canEnter: record.enterCount < dungeon.entryCount, enterCount: record.enterCount, maxEntryCount: dungeon.entryCount, completedStages: record.completedStages, totalLingShiEarned: record.totalLingShiEarned, bestScore: record.bestScore }
  }
  
  sweepDungeon(playerId: string, dungeonId: string, sweepCount: number, playerLevel: number): { success: boolean; totalLingShi: number; totalItems: LingShiDropItem[]; message: string } {
    const dungeon = this.getDungeon(dungeonId)
    if (!dungeon) return { success: false, totalLingShi: 0, totalItems: [], message: '副本不存在' }
    if (playerLevel < LINGSHI_DUNGEON_CONFIG.sweep.minLevelRequired) return { success: false, totalLingShi: 0, totalItems: [], message: `等级达到${LINGSHI_DUNGEON_CONFIG.sweep.minLevelRequired}级才能使用扫荡` }
    const record = this.getPlayerRecord(playerId, dungeonId)
    this.checkAndResetRecord(record, dungeon.resetType)
    const availableSweeps = Math.min(dungeon.entryCount - record.enterCount, LINGSHI_DUNGEON_CONFIG.sweep.maxSweepCount, sweepCount)
    if (availableSweeps <= 0) return { success: false, totalLingShi: 0, totalItems: [], message: '没有可扫荡的次数' }
    const luck = this.getPlayerLuck(playerId)
    let totalLingShi = 0
    const totalItems: LingShiDropItem[] = []
    const bestScoreMultiplier = record.bestScore > 0 ? 1 + (record.bestScore / 1000) : 1
    for (let i = 0; i < availableSweeps; i++) {
      for (const stage of dungeon.stages) {
        const dropResult = this.calculateLingShiDrop(dungeon, stage, playerLevel, luck, 0)
        totalLingShi += Math.floor(dropResult.totalLingShi * bestScoreMultiplier)
        for (const item of dropResult.dropItems) {
          const existingItem = totalItems.find(t => t.itemId === item.itemId)
          if (existingItem) existingItem.amount += item.amount
          else totalItems.push({ ...item })
        }
      }
    }
    record.enterCount += availableSweeps
    record.totalLingShiEarned += totalLingShi
    return { success: true, totalLingShi, totalItems, message: `扫荡${availableSweeps}次, 共获得${totalLingShi}灵石` }
  }
  
  fastSweepDungeon(playerId: string, dungeonId: string, sweepCount: number, playerLevel: number, playerGold: number): { success: boolean; totalLingShi: number; totalItems: LingShiDropItem[]; goldCost: number; message: string } {
    const fastCost = LINGSHI_DUNGEON_CONFIG.sweep.fastSweepCost
    if (playerGold < fastCost) return { success: false, totalLingShi: 0, totalItems: [], goldCost: 0, message: `快速扫荡需要${fastCost}元宝` }
    const result = this.sweepDungeon(playerId, dungeonId, sweepCount, playerLevel)
    if (!result.success) return { ...result, goldCost: 0 }
    return { ...result, goldCost: fastCost, message: `快速扫荡成功，花费${fastCost}元宝` }
  }
}

export const lingShiDungeonSystem = new LingShiDungeonSystem()
