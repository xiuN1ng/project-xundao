// 世界BOSS血量共享系统 - 全服玩家讨伐

export interface WorldBoss {
  bossId: string
  name: string
  nameCN: string
  level: number
  realmRequirement?: string
  maxHp: number
  currentHp: number
  attack: number
  defense: number
  rewards: BossReward[]
  spawnConfig: {
    type: 'schedule' | 'event' | 'random'
    schedule?: string // cron expression
    duration: number // 持续时间(毫秒)
    respawnDelay: number // 刷新间隔(毫秒)
  }
}

export interface BossReward {
  type: 'cultivation_exp' | 'spirit_stone' | 'item' | 'title' | 'artifact'
  itemId?: string
  value: number
  itemNameCN?: string
  rarity?: 'common' | 'rare' | 'epic' | 'legendary'
  dropRate: number
  minQuantity: number
  maxQuantity: number
}

export interface BossDamage {
  playerId: string
  playerName: string
  damage: number
  lastHitTime: number
  rank: number
}

export interface PlayerBossData {
  playerId: string
  playerName: string
  totalDamage: number
  hitCount: number
  lastAttackTime: number
  rewardsClaimed: string[] // 已领取的奖励ID
  rankings: Map<string, number> // bossId -> rank
}

export interface BossState {
  boss: WorldBoss
  spawnTime: number
  endTime: number
  isActive: boolean
  damageLog: BossDamage[]
  totalDamage: number
  participantCount: number
  lastUpdate: number
}

// 世界BOSS配置
export const WORLD_BOSSES: WorldBoss[] = [
  {
    bossId: 'demon_king',
    name: 'Demon King',
    nameCN: '妖魔之王',
    level: 50,
    realmRequirement: 'mortal',
    maxHp: 10000000,
    currentHp: 10000000,
    attack: 5000,
    defense: 2000,
    rewards: [
      { type: 'cultivation_exp', value: 10000, dropRate: 1, minQuantity: 1, maxQuantity: 1 },
      { type: 'spirit_stone', value: 10000, dropRate: 1, minQuantity: 5000, maxQuantity: 10000 },
      { type: 'item', itemId: 'epic_weapon', itemNameCN: '史诗武器', rarity: 'epic', dropRate: 0.3, minQuantity: 1, maxQuantity: 1 },
      { type: 'item', itemId: 'cangzhuo', itemNameCN: '苍卓', rarity: 'epic', dropRate: 0.5, minQuantity: 2, maxQuantity: 5 },
      { type: 'title', value: 1, itemNameCN: '妖魔猎手', dropRate: 0.2, minQuantity: 1, maxQuantity: 1 }
    ],
    spawnConfig: {
      type: 'schedule',
      schedule: '0 20 * * *', // 每天20:00
      duration: 3600000, // 1小时
      respawnDelay: 43200000 // 12小时
    }
  },
  {
    bossId: 'ancient_dragon',
    name: 'Ancient Dragon',
    nameCN: '远古巨龙',
    level: 80,
    realmRequirement: 'immortal',
    maxHp: 50000000,
    currentHp: 50000000,
    attack: 15000,
    defense: 8000,
    rewards: [
      { type: 'cultivation_exp', value: 50000, dropRate: 1, minQuantity: 1, maxQuantity: 1 },
      { type: 'spirit_stone', value: 50000, dropRate: 1, minQuantity: 20000, maxQuantity: 50000 },
      { type: 'artifact', itemId: 'dragon_artifact', itemNameCN: '龙族神器', rarity: 'legendary', dropRate: 0.15, minQuantity: 1, maxQuantity: 1 },
      { type: 'item', itemId: 'phoenix_herb', itemNameCN: '凤凰焰', rarity: 'epic', dropRate: 0.4, minQuantity: 2, maxQuantity: 5 },
      { type: 'item', itemId: 'jade_herb', itemNameCN: '玉灵草', rarity: 'legendary', dropRate: 0.25, minQuantity: 1, maxQuantity: 3 },
      { type: 'title', value: 1, itemNameCN: '屠龙者', dropRate: 0.3, minQuantity: 1, maxQuantity: 1 }
    ],
    spawnConfig: {
      type: 'schedule',
      schedule: '0 21 * * 0', // 每周日21:00
      duration: 7200000, // 2小时
      respawnDelay: 604800000 // 7天
    }
  },
  {
    bossId: 'heavenly_demon',
    name: 'Heavenly Demon',
    nameCN: '天魔',
    level: 120,
    realmRequirement: 'golden_immortal',
    maxHp: 200000000,
    currentHp: 200000000,
    attack: 50000,
    defense: 25000,
    rewards: [
      { type: 'cultivation_exp', value: 200000, dropRate: 1, minQuantity: 1, maxQuantity: 1 },
      { type: 'spirit_stone', value: 200000, dropRate: 1, minQuantity: 100000, maxQuantity: 200000 },
      { type: 'artifact', itemId: 'demon_slayer_sword', itemNameCN: '斩魔剑', rarity: 'legendary', dropRate: 0.1, minQuantity: 1, maxQuantity: 1 },
      { type: 'item', itemId: 'yaohezhi', itemNameCN: '瑶池芝', rarity: 'legendary', dropRate: 0.3, minQuantity: 1, maxQuantity: 2 },
      { type: 'item', itemId: 'thunder_herb', itemNameCN: '雷霆根', rarity: 'legendary', dropRate: 0.25, minQuantity: 1, maxQuantity: 2 },
      { type: 'title', value: 1, itemNameCN: '天魔杀手', dropRate: 0.15, minQuantity: 1, maxQuantity: 1 }
    ],
    spawnConfig: {
      type: 'event',
      duration: 10800000, // 3小时
      respawnDelay: 2592000000 // 30天
    }
  },
  {
    bossId: 'world_ending_beast',
    name: 'World-Ending Beast',
    nameCN: '灭世凶兽',
    level: 160,
    realmRequirement: 'daluo',
    maxHp: 1000000000,
    currentHp: 1000000000,
    attack: 200000,
    defense: 100000,
    rewards: [
      { type: 'cultivation_exp', value: 1000000, dropRate: 1, minQuantity: 1, maxQuantity: 1 },
      { type: 'spirit_stone', value: 1000000, dropRate: 1, minQuantity: 500000, maxQuantity: 1000000 },
      { type: 'artifact', itemId: 'beast_killer_artifact', itemNameCN: '灭世凶兽内核', rarity: 'legendary', dropRate: 0.05, minQuantity: 1, maxQuantity: 1 },
      { type: 'item', itemId: 'dragon_blood', itemNameCN: '龙血玫瑰', rarity: 'legendary', dropRate: 0.5, minQuantity: 3, maxQuantity: 5 },
      { type: 'title', value: 1, itemNameCN: '救世主', dropRate: 0.1, minQuantity: 1, maxQuantity: 1 }
    ],
    spawnConfig: {
      type: 'random',
      duration: 14400000, // 4小时
      respawnDelay: 5184000000 // 60天
    }
  }
]

export const BOSS_CONFIG = {
  // 伤害计算
  damage: {
    // 基础伤害
    baseDamage: 100,
    // 等级修正
    levelBonus: 10, // 每级+10
    // 暴击概率
    critChance: 0.1,
    // 暴击伤害倍数
    critMultiplier: 2,
    // 最小伤害
    minDamage: 1,
  },
  
  // 战斗冷却
  cooldown: {
    // 攻击间隔(毫秒)
    attackInterval: 1000,
    // 每日挑战次数
    dailyAttacks: 100,
  },
  
  // 排行榜
  ranking: {
    // 伤害排行榜显示人数
    topN: 100,
    // 最后一击奖励倍数
    lastHitBonus: 1.5,
  },
  
  // 奖励领取
  rewards: {
    // 伤害阈值 (百分比)
    damageThresholds: [
      { percent: 100, rewardRate: 1.0 }, // 100%伤害
      { percent: 50, rewardRate: 0.5 }, // 50%伤害
      { percent: 25, rewardRate: 0.25 }, // 25%伤害
      { percent: 10, rewardRate: 0.1 }, // 10%伤害
      { percent: 1, rewardRate: 0.05 }, // 1%伤害
    ],
    // 最低伤害要求 (百分比)
    minDamagePercent: 0.1,
  },
  
  // BOSS刷新
  spawn: {
    // 提前提醒时间(毫秒)
    announceTime: 300000, // 5分钟
    // 自动刷新
    autoSpawn: true,
  }
}

export class WorldBossSystem {
  private activeBosses: Map<string, BossState> = new Map()
  private playerData: Map<string, PlayerBossData> = new Map()
  private damageHistory: Map<string, BossDamage[]> = new Map()
  private lastSpawnTime: Map<string, number> = new Map()
  
  // 获取玩家数据
  getPlayerData(playerId: string, playerName: string = 'Unknown'): PlayerBossData {
    if (this.playerData.has(playerId)) {
      const data = this.playerData.get(playerId)!
      // Update name if provided
      if (playerName !== 'Unknown') {
        data.playerName = playerName
      }
      return data
    }
    
    const newData: PlayerBossData = {
      playerId,
      playerName,
      totalDamage: 0,
      hitCount: 0,
      lastAttackTime: 0,
      rewardsClaimed: [],
      rankings: new Map()
    }
    
    this.playerData.set(playerId, newData)
    return newData
  }
  
  // 获取BOSS信息
  getBoss(bossId: string): WorldBoss | null {
    return WORLD_BOSSES.find(b => b.bossId === bossId) || null
  }
  
  // 获取活动中的BOSS
  getActiveBosses(): BossState[] {
    return Array.from(this.activeBosses.values()).filter(b => b.isActive)
  }
  
  // 获取BOSS状态
  getBossState(bossId: string): BossState | null {
    return this.activeBosses.get(bossId) || null
  }
  
  // 刷新BOSS
  spawnBoss(bossId: string): { success: boolean; boss?: BossState; message: string } {
    const bossTemplate = this.getBoss(bossId)
    if (!bossTemplate) {
      return { success: false, message: 'BOSS不存在' }
    }
    
    // 检查刷新间隔
    const lastSpawn = this.lastSpawnTime.get(bossId) || 0
    if (Date.now() - lastSpawn < bossTemplate.spawnConfig.respawnDelay) {
      return { success: false, message: 'BOSS尚未刷新' }
    }
    
    // 创建BOSS状态
    const bossState: BossState = {
      boss: { ...bossTemplate, currentHp: bossTemplate.maxHp },
      spawnTime: Date.now(),
      endTime: Date.now() + bossTemplate.spawnConfig.duration,
      isActive: true,
      damageLog: [],
      totalDamage: 0,
      participantCount: 0,
      lastUpdate: Date.now()
    }
    
    this.activeBosses.set(bossId, bossState)
    this.lastSpawnTime.set(bossId, Date.now())
    
    return {
      success: true,
      boss: bossState,
      message: `${bossTemplate.nameCN} 已出现！`
    }
  }
  
  // 攻击BOSS
  attackBoss(
    bossId: string,
    playerId: string,
    playerName: string,
    playerLevel: number,
    playerAttack: number
  ): {
    success: boolean
    damage: number
    bossHp: number
    isDead: boolean
    message: string
  } {
    const bossState = this.activeBosses.get(bossId)
    if (!bossState || !bossState.isActive) {
      return { success: false, damage: 0, bossHp: 0, isDead: false, message: 'BOSS不存在或未激活' }
    }
    
    // 检查时间
    if (Date.now() > bossState.endTime) {
      bossState.isActive = false
      return { success: false, damage: 0, bossHp: 0, isDead: false, message: 'BOSS挑战时间已结束' }
    }
    
    const player = this.getPlayerData(playerId, playerName)
    
    // 计算伤害
    const damage = this.calculateDamage(playerLevel, playerAttack, bossState.boss.level, bossState.boss.defense)
    
    // 更新BOSS血量
    bossState.boss.currentHp = Math.max(0, bossState.boss.currentHp - damage)
    bossState.totalDamage += damage
    
    // 更新玩家数据
    player.totalDamage += damage
    player.hitCount++
    player.lastAttackTime = Date.now()
    
    // 记录伤害
    const damageRecord: BossDamage = {
      playerId,
      playerName,
      damage,
      lastHitTime: Date.now(),
      rank: 0
    }
    bossState.damageLog.push(damageRecord)
    bossState.participantCount = new Set(bossState.damageLog.map(d => d.playerId)).size
    
    // 检查是否死亡
    const isDead = bossState.boss.currentHp <= 0
    if (isDead) {
      bossState.isActive = false
      // 发放奖励
      this.distributeRewards(bossId)
    }
    
    bossState.lastUpdate = Date.now()
    
    return {
      success: true,
      damage,
      bossHp: bossState.boss.currentHp,
      isDead,
      message: `对${bossState.boss.nameCN}造成了${damage}点伤害！`
    }
  }
  
  // 计算伤害
  private calculateDamage(
    playerLevel: number,
    playerAttack: number,
    bossLevel: number,
    bossDefense: number
  ): number {
    // 基础伤害 = 攻击力 * (1 + 等级差 * 0.1)
    const levelDiff = playerLevel - bossLevel
    const levelBonus = 1 + (levelDiff * BOSS_CONFIG.damage.levelBonus / 100)
    
    let damage = playerAttack * levelBonus
    
    // 防御减伤
    const defenseReduction = bossDefense / (bossDefense + playerAttack * 10)
    damage = damage * (1 - defenseReduction)
    
    // 暴击
    const isCrit = Math.random() < BOSS_CONFIG.damage.critChance
    if (isCrit) {
      damage *= BOSS_CONFIG.damage.critMultiplier
    }
    
    // 取整
    damage = Math.floor(damage)
    
    // 最小伤害
    return Math.max(BOSS_CONFIG.damage.minDamage, damage)
  }
  
  // 发放奖励
  private distributeRewards(bossId: string): void {
    const bossState = this.activeBosses.get(bossId)
    if (!bossState) return
    
    // 按伤害排序
    const rankings = this.getBossRankings(bossId)
    
    // 最后一击者
    const lastHitter = bossState.damageLog[bossState.damageLog.length - 1]
    
    // 对所有参与玩家按伤害比例发放奖励
    for (const [playerId, data] of this.playerData) {
      const playerDamage = this.getPlayerDamage(bossId, playerId)
      if (playerDamage <= 0) continue
      
      const damagePercent = (playerDamage / bossState.totalDamage) * 100
      
      // 检查是否达到最低要求
      if (damagePercent >= BOSS_CONFIG.rewards.minDamagePercent) {
        // 最后一击额外奖励
        const isLastHit = lastHitter && lastHitter.playerId === playerId
        const bonusMultiplier = isLastHit ? BOSS_CONFIG.ranking.lastHitBonus : 1
        
        // 发放奖励
        this.grantRewards(bossId, playerId, damagePercent, bonusMultiplier)
      }
    }
  }
  
  // 发放奖励给玩家
  private grantRewards(bossId: string, playerId: string, damagePercent: number, bonusMultiplier: number): void {
    const boss = this.getBoss(bossId)
    if (!boss) return
    
    const player = this.getPlayerData(playerId)
    const rewards: any[] = []
    
    for (const reward of boss.rewards) {
      // 按伤害比例计算实际掉落率
      let actualDropRate = reward.dropRate
      for (const threshold of BOSS_CONFIG.rewards.damageThresholds) {
        if (damagePercent >= threshold.percent) {
          actualDropRate = reward.dropRate * threshold.rewardRate
          break
        }
      }
      
      // 最后一击加成
      actualDropRate *= bonusMultiplier
      
      // 判定掉落
      if (Math.random() < actualDropRate) {
        const quantity = Math.floor(
          Math.random() * (reward.maxQuantity - reward.minQuantity + 1)
        ) + reward.minQuantity
        
        rewards.push({
          ...reward,
          quantity
        })
      }
    }
    
    // 返回奖励（实际发放需要在游戏逻辑中处理）
    return
  }
  
  // 获取玩家在某BOSS上的伤害
  getPlayerDamage(bossId: string, playerId: string): number {
    const bossState = this.activeBosses.get(bossId)
    if (!bossState) return 0
    
    return bossState.damageLog
      .filter(d => d.playerId === playerId)
      .reduce((sum, d) => sum + d.damage, 0)
  }
  
  // 获取BOSS伤害排行榜
  getBossRankings(bossId: string): { playerId: string; playerName: string; damage: number; rank: number }[] {
    const bossState = this.activeBosses.get(bossId)
    if (!bossState) return []
    
    // 聚合每个玩家的总伤害
    const damageMap = new Map<string, { playerName: string; damage: number }>()
    
    for (const record of bossState.damageLog) {
      const existing = damageMap.get(record.playerId)
      if (existing) {
        existing.damage += record.damage
      } else {
        damageMap.set(record.playerId, {
          playerName: record.playerName,
          damage: record.damage
        })
      }
    }
    
    // 排序并添加排名
    const rankings = Array.from(damageMap.entries())
      .map(([playerId, data]) => ({
        playerId,
        playerName: data.playerName,
        damage: data.damage,
        rank: 0
      }))
      .sort((a, b) => b.damage - a.damage)
      .slice(0, BOSS_CONFIG.ranking.topN)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1
      }))
    
    return rankings
  }
  
  // 领取奖励
  claimRewards(bossId: string, playerId: string): {
    success: boolean
    rewards: any[]
    message: string
  } {
    const player = this.getPlayerData(playerId)
    const bossState = this.activeBosses.get(bossId)
    
    if (!bossState) {
      return { success: false, rewards: [], message: 'BOSS不存在' }
    }
    
    if (player.rewardsClaimed.includes(bossId)) {
      return { success: false, rewards: [], message: '奖励已领取' }
    }
    
    const playerDamage = this.getPlayerDamage(bossId, playerId)
    const damagePercent = (playerDamage / bossState.totalDamage) * 100
    
    if (damagePercent < BOSS_CONFIG.rewards.minDamagePercent) {
      return { success: false, rewards: [], message: '伤害不足，无法领取奖励' }
    }
    
    // 标记已领取
    player.rewardsClaimed.push(bossId)
    
    // 生成奖励
    const boss = this.getBoss(bossId)
    if (!boss) {
      return { success: false, rewards: [], message: 'BOSS数据错误' }
    }
    
    const rewards: any[] = []
    const isLastHit = bossState.damageLog.length > 0 && 
      bossState.damageLog[bossState.damageLog.length - 1].playerId === playerId
    const bonusMultiplier = isLastHit ? BOSS_CONFIG.ranking.lastHitBonus : 1
    
    for (const reward of boss.rewards) {
      let actualDropRate = reward.dropRate
      for (const threshold of BOSS_CONFIG.rewards.damageThresholds) {
        if (damagePercent >= threshold.percent) {
          actualDropRate = reward.dropRate * threshold.rewardRate
          break
        }
      }
      actualDropRate *= bonusMultiplier
      
      if (Math.random() < actualDropRate) {
        const quantity = Math.floor(
          Math.random() * (reward.maxQuantity - reward.minQuantity + 1)
        ) + reward.minQuantity
        
        rewards.push({
          ...reward,
          quantity
        })
      }
    }
    
    return {
      success: true,
      rewards,
      message: `领取到${rewards.length}种奖励`
    }
  }
  
  // 获取玩家BOSS统计
  getPlayerBossStats(playerId: string): {
    totalDamage: number
    hitCount: number
    bossKills: number
    bestRanking: number
  } {
    const player = this.getPlayerData(playerId)
    let bossKills = 0
    let bestRanking = 999999
    
    for (const [bossId, rank] of player.rankings) {
      if (rank === 1) bossKills++
      if (rank < bestRanking) bestRanking = rank
    }
    
    return {
      totalDamage: player.totalDamage,
      hitCount: player.hitCount,
      bossKills,
      bestRanking: bestRanking === 999999 ? 0 : bestRanking
    }
  }
  
  // 获取全服BOSS伤害统计
  getServerStats(): {
    totalBossesSpawned: number
    totalDamage: number
    activeBosses: string[]
    topDamagePlayers: { playerId: string; playerName: string; totalDamage: number }[]
  } {
    const allPlayers = Array.from(this.playerData.values())
    const totalDamage = allPlayers.reduce((sum, p) => sum + p.totalDamage, 0)
    
    return {
      totalBossesSpawned: this.lastSpawnTime.size,
      totalDamage,
      activeBosses: this.getActiveBosses().map(b => b.boss.nameCN),
      topDamagePlayers: allPlayers
        .sort((a, b) => b.totalDamage - a.totalDamage)
        .slice(0, 10)
        .map(p => ({ playerId: p.playerId, playerName: p.playerName, totalDamage: p.totalDamage }))
    }
  }
  
  // 自动刷新BOSS (定时调用)
  checkAndSpawnBosses(): { spawned: string[] } {
    const spawned: string[] = []
    
    if (!BOSS_CONFIG.spawn.autoSpawn) {
      return { spawned }
    }
    
    for (const boss of WORLD_BOSSES) {
      if (boss.spawnConfig.type !== 'schedule') continue
      
      const lastSpawn = this.lastSpawnTime.get(boss.bossId) || 0
      const now = Date.now()
      
      // 检查是否到刷新时间
      if (now - lastSpawn >= boss.spawnConfig.respawnDelay) {
        // 检查当前是否有活跃BOSS
        const currentState = this.activeBosses.get(boss.bossId)
        if (!currentState || !currentState.isActive) {
          const result = this.spawnBoss(boss.bossId)
          if (result.success) {
            spawned.push(boss.nameCN)
          }
        }
      }
    }
    
    return { spawned }
  }
}

export const worldBossSystem = new WorldBossSystem()
