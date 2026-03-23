// 仙界境界系统 - 仙人境界体系（真仙、金仙、大罗）

export interface Realm {
  realmId: string
  name: string
  nameCN: string
  order: number
  level: number // 需要的修为等级
  icon: string
  color: string
  description: string
  benefits: {
    cultivationExpBonus: number // 修炼经验加成 (%)
    dropRateBonus: number // 掉落率加成 (%)
    attackBonus: number // 攻击力加成
    defenseBonus: number // 防御力加成
    hpBonus: number // 生命值加成
  }
  subRealms?: SubRealm[]
}

export interface SubRealm {
  subRealmId: string
  name: string
  nameCN: string
  order: number
  level: number
  cultivationRequired: number // 需要的修炼值
}

export interface PlayerRealmData {
  playerId: string
  currentRealmId: string
  currentSubRealmId: string
  totalCultivation: number // 总修炼值
  cultivationToday: number // 今日修炼值
  lastCultivationTime: number
  breakthroughCount: number // 突破次数
  downgradeCount: number // 降级次数
}

// 仙界境界配置
export const REALMS: Realm[] = [
  // 凡人界 (Mortals)
  {
    realmId: 'mortal',
    name: 'Mortal',
    nameCN: '凡人',
    order: 0,
    level: 0,
    icon: '👤',
    color: '#888888',
    description: '芸芸众生，凡尘中人',
    benefits: {
      cultivationExpBonus: 0,
      dropRateBonus: 0,
      attackBonus: 0,
      defenseBonus: 0,
      hpBonus: 0
    },
    subRealms: [
      { subRealmId: 'mortal_qi', name: 'Qi Cultivation', nameCN: '练气期', order: 1, level: 1, cultivationRequired: 0 },
      { subRealmId: 'mortal_zhenqi', name: 'True Qi', nameCN: '筑基期', order: 2, level: 10, cultivationRequired: 1000 },
      { subRealmId: 'mortal_zhongqi', name: 'Core Formation', nameCN: '金丹期', order: 3, level: 30, cultivationRequired: 10000 },
      { subRealmId: 'mortal_yuanying', name: 'Nascent Soul', nameCN: '元婴期', order: 4, level: 50, cultivationRequired: 50000 },
      { subRealmId: 'mortal_huashen', name: 'Divine Transformation', nameCN: '化神期', order: 5, level: 70, cultivationRequired: 200000 }
    ]
  },
  
  // 仙人界 (Immortals)
  {
    realmId: 'immortal',
    name: 'Immortal',
    nameCN: '仙人',
    order: 1,
    level: 80,
    icon: '🧑',
    color: '#4CAF50',
    description: '超凡脱俗，位列仙班',
    benefits: {
      cultivationExpBonus: 10,
      dropRateBonus: 5,
      attackBonus: 100,
      defenseBonus: 50,
      hpBonus: 500
    },
    subRealms: [
      { subRealmId: 'immortal_xian', name: 'Xian', nameCN: '真仙', order: 1, level: 80, cultivationRequired: 500000 },
      { subRealmId: 'immortal_zhenxian', name: 'True Immortal', nameCN: '真仙境', order: 2, level: 85, cultivationRequired: 800000 },
      { subRealmId: 'immortal_tianxian', name: 'Celestial Immortal', nameCN: '天仙境', order: 3, level: 90, cultivationRequired: 1200000 },
      { subRealmId: 'immortal_daxian', name: 'Great Immortal', nameCN: '大仙境', order: 4, level: 95, cultivationRequired: 1800000 },
      { subRealmId: 'immortal_shengxian', name: 'Holy Immortal', nameCN: '圣仙境', order: 5, level: 100, cultivationRequired: 2500000 }
    ]
  },
  
  // 金仙界 (Golden Immortals)
  {
    realmId: 'golden_immortal',
    name: 'Golden Immortal',
    nameCN: '金仙',
    order: 2,
    level: 105,
    icon: '🌟',
    color: '#FFD700',
    description: '金身不坏，万劫不磨',
    benefits: {
      cultivationExpBonus: 25,
      dropRateBonus: 10,
      attackBonus: 300,
      defenseBonus: 150,
      hpBonus: 1500
    },
    subRealms: [
      { subRealmId: 'golden_jinxian', name: 'Golden Immortal', nameCN: '金仙境', order: 1, level: 105, cultivationRequired: 3500000 },
      { subRealmId: 'golden_zhongjin', name: 'Middle Golden', nameCN: '中金仙', order: 2, level: 110, cultivationRequired: 5000000 },
      { subRealmId: 'golden_shangjin', name: 'Upper Golden', nameCN: '上金仙', order: 3, level: 115, cultivationRequired: 7000000 },
      { subRealmId: 'golden_juxian', name: 'Peak Golden', nameCN: '极金仙', order: 4, level: 120, cultivationRequired: 10000000 },
      { subRealmId: 'golden_daoist', name: 'Golden Daoist', nameCN: '金通道人', order: 5, level: 125, cultivationRequired: 15000000 }
    ]
  },
  
  // 大罗金仙 (Daluo Golden Immortal)
  {
    realmId: 'daluo',
    name: 'Daluo Golden Immortal',
    nameCN: '大罗金仙',
    order: 3,
    level: 130,
    icon: '👑',
    color: '#9C27B0',
    description: '跳出三界，不在五行',
    benefits: {
      cultivationExpBonus: 50,
      dropRateBonus: 20,
      attackBonus: 800,
      defenseBonus: 400,
      hpBonus: 5000
    },
    subRealms: [
      { subRealmId: 'daluo_chu', name: 'Daluo Initial', nameCN: '大罗初期', order: 1, level: 130, cultivationRequired: 20000000 },
      { subRealmId: 'daluo_zhong', name: 'Daluo Middle', nameCN: '大罗中期', order: 2, level: 140, cultivationRequired: 35000000 },
      { subRealmId: 'daluo_hou', name: 'Daluo Late', nameCN: '大罗后期', order: 3, level: 150, cultivationRequired: 50000000 },
      { subRealmId: 'daluo_dacheng', name: 'Daluo Perfection', nameCN: '大罗大圆满', order: 4, level: 160, cultivationRequired: 80000000 },
      { subRealmId: 'daluo_tianzu', name: 'Daluo Heaven\'s Might', nameCN: '大罗天祖', order: 5, level: 170, cultivationRequired: 120000000 }
    ]
  },
  
  // 准圣 (Quasi-Saint)
  {
    realmId: 'quasi_saint',
    name: 'Quasi-Saint',
    nameCN: '准圣',
    order: 4,
    level: 180,
    icon: '🔮',
    color: '#E91E63',
    description: '半步圣人，威压诸天',
    benefits: {
      cultivationExpBonus: 75,
      dropRateBonus: 30,
      attackBonus: 2000,
      defenseBonus: 1000,
      hpBonus: 15000
    },
    subRealms: [
      { subRealmId: 'quasi_saint_chu', name: 'Quasi-Saint Initial', nameCN: '准圣初期', order: 1, level: 180, cultivationRequired: 150000000 },
      { subRealmId: 'quasi_saint_zhong', name: 'Quasi-Saint Middle', nameCN: '准圣中期', order: 2, level: 190, cultivationRequired: 250000000 },
      { subRealmId: 'quasi_saint_hou', name: 'Quasi-Saint Late', nameCN: '准圣后期', order: 3, level: 200, cultivationRequired: 400000000 },
      { subRealmId: 'quasi_saint_dacheng', name: 'Quasi-Saint Perfection', nameCN: '准圣大圆满', order: 4, level: 210, cultivationRequired: 600000000 }
    ]
  },
  
  // 圣人 (Saint)
  {
    realmId: 'saint',
    name: 'Saint',
    nameCN: '圣人',
    order: 5,
    level: 220,
    icon: '☀️',
    color: '#FF5722',
    description: '万劫不灭，天地同寿',
    benefits: {
      cultivationExpBonus: 100,
      dropRateBonus: 50,
      attackBonus: 5000,
      defenseBonus: 2500,
      hpBonus: 50000
    },
    subRealms: [
      { subRealmId: 'saint_chu', name: 'Saint Initial', nameCN: '圣人初期', order: 1, level: 220, cultivationRequired: 800000000 },
      { subRealmId: 'saint_zhong', name: 'Saint Middle', nameCN: '圣人中期', order: 2, level: 240, cultivationRequired: 1200000000 },
      { subRealmId: 'saint_hou', name: 'Saint Late', nameCN: '圣人后期', order: 3, level: 260, cultivationRequired: 1800000000 },
      { subRealmId: 'saint_dacheng', name: 'Saint Perfection', nameCN: '圣人圆满', order: 4, level: 280, cultivationRequired: 2500000000 },
      { subRealmId: 'saint_tiandi', name: 'Saint of Heaven and Earth', nameCN: '天地圣人', order: 5, level: 300, cultivationRequired: 5000000000 }
    ]
  },
  
  // 道祖 (Dao Ancestor)
  {
    realmId: 'dao_ancestor',
    name: 'Dao Ancestor',
    nameCN: '道祖',
    order: 6,
    level: 320,
    icon: '🎭',
    color: '#000000',
    description: '道之起源，法则制定者',
    benefits: {
      cultivationExpBonus: 150,
      dropRateBonus: 75,
      attackBonus: 10000,
      defenseBonus: 5000,
      hpBonus: 100000
    },
    subRealms: [
      { subRealmId: 'dao_chu', name: 'Dao Ancestor Initial', nameCN: '道祖初期', order: 1, level: 320, cultivationRequired: 8000000000 },
      { subRealmId: 'dao_zhong', name: 'Dao Ancestor Middle', nameCN: '道祖中期', order: 2, level: 350, cultivationRequired: 15000000000 },
      { subRealmId: 'dao_hou', name: 'Dao Ancestor Late', nameCN: '道祖后期', order: 3, level: 380, cultivationRequired: 25000000000 },
      { subRealmId: 'dao_dacheng', name: 'Dao Ancestor Perfection', nameCN: '道祖圆满', order: 4, level: 400, cultivationRequired: 50000000000 }
    ]
  }
]

export const REALM_CONFIG = {
  // 每日修炼上限
  dailyCultivationLimit: 10000,
  
  // 修炼效率 (每次修炼获得的基础值)
  baseCultivationPerAction: 100,
  
  // 境界压制 (跨境界战斗惩罚)
  realmPenalty: {
    enabled: true,
    penaltyPerLevel: 0.1, // 每低一级-10%
    minMultiplier: 0.2, // 最低20%
  },
  
  // 突破保护
  breakthrough: {
    // 突破保护次数
    protectionCount: 3,
    // 保护道具恢复时间 (小时)
    protectionRestoreHours: 24,
  },
  
  // 降级保护
  downgrade: {
    // 降级保护次数
    protectionCount: 1,
    // 保留降级的最低境界
    minRealmId: 'mortal'
  },
  
  // 灵气恢复
  spiritRegen: {
    // 修炼时灵气消耗
    costPerCultivation: 10,
    // 灵气恢复速度 (每分钟)
    regenPerMinute: 5,
  }
}

export class RealmSystem {
  private playerData: Map<string, PlayerRealmData> = new Map()
  
  // 获取玩家境界数据
  getPlayerData(playerId: string): PlayerRealmData {
    if (this.playerData.has(playerId)) {
      return this.playerData.get(playerId)!
    }
    
    const newData: PlayerRealmData = {
      playerId,
      currentRealmId: 'mortal',
      currentSubRealmId: 'mortal_qi',
      totalCultivation: 0,
      cultivationToday: 0,
      lastCultivationTime: 0,
      breakthroughCount: 0,
      downgradeCount: 0
    }
    
    this.playerData.set(playerId, newData)
    return newData
  }
  
  // 获取境界信息
  getRealm(realmId: string): Realm | null {
    return REALMS.find(r => r.realmId === realmId) || null
  }
  
  // 获取子境界信息
  getSubRealm(realmId: string, subRealmId: string): SubRealm | null {
    const realm = this.getRealm(realmId)
    if (!realm || !realm.subRealms) return null
    return realm.subRealms.find(s => s.subRealmId === subRealmId) || null
  }
  
  // 获取玩家当前境界
  getPlayerRealm(playerId: string): { realm: Realm; subRealm: SubRealm } | null {
    const data = this.getPlayerData(playerId)
    const realm = this.getRealm(data.currentRealmId)
    const subRealm = this.getSubRealm(data.currentRealmId, data.currentSubRealmId)
    
    if (!realm || !subRealm) return null
    return { realm, subRealm }
  }
  
  // 计算玩家属性加成
  getPlayerBenefits(playerId: string) {
    const playerRealm = this.getPlayerRealm(playerId)
    if (!playerRealm) {
      return REALMS[0].benefits
    }
    return playerRealm.realm.benefits
  }
  
  // 检查是否可突破
  canBreakthrough(playerId: string): { can: boolean; reason?: string; nextRealm?: Realm; nextSubRealm?: SubRealm } {
    const data = this.getPlayerData(playerId)
    const currentRealm = this.getRealm(data.currentRealmId)
    const currentSubRealm = this.getSubRealm(data.currentRealmId, data.currentSubRealmId)
    
    if (!currentRealm || !currentSubRealm) {
      return { can: false, reason: '境界数据错误' }
    }
    
    // 找到下一个子境界
    let nextSubRealm: SubRealm | undefined
    let nextRealm: Realm | undefined
    
    if (currentRealm.subRealms) {
      const currentOrder = currentRealm.subRealms.findIndex(s => s.subRealmId === data.currentSubRealmId)
      if (currentOrder < currentRealm.subRealms.length - 1) {
        nextSubRealm = currentRealm.subRealms[currentOrder + 1]
      }
    }
    
    // 如果没有下一个子境界，检查是否有下一个大境界
    if (!nextSubRealm) {
      const currentOrder = REALMS.findIndex(r => r.realmId === data.currentRealmId)
      if (currentOrder < REALMS.length - 1) {
        nextRealm = REALMS[currentOrder + 1]
        if (nextRealm.subRealms && nextRealm.subRealms.length > 0) {
          nextSubRealm = nextRealm.subRealms[0]
        }
      }
    }
    
    if (!nextSubRealm) {
      return { can: false, reason: '已达到最高境界' }
    }
    
    // 检查修炼值是否足够
    if (data.totalCultivation < nextSubRealm.cultivationRequired) {
      return { 
        can: false, 
        reason: `修炼值不足，需要${nextSubRealm.cultivationRequired}，当前${data.totalCultivation}`,
        nextRealm,
        nextSubRealm
      }
    }
    
    return { can: true, nextRealm, nextSubRealm }
  }
  
  // 执行突破
  breakthrough(playerId: string): {
    success: boolean
    newRealm?: Realm
    newSubRealm?: SubRealm
    message: string
  } {
    const check = this.canBreakthrough(playerId)
    if (!check.can) {
      return { success: false, message: check.reason || '无法突破' }
    }
    
    const data = this.getPlayerData(playerId)
    
    // 消耗修炼值
    if (check.nextSubRealm) {
      data.totalCultivation -= check.nextSubRealm.cultivationRequired
    }
    
    // 更新境界
    if (check.nextRealm) {
      data.currentRealmId = check.nextRealm.realmId
    }
    if (check.nextSubRealm) {
      data.currentSubRealmId = check.nextSubRealm.subRealmId
    }
    
    data.breakthroughCount++
    
    return {
      success: true,
      newRealm: check.nextRealm || undefined,
      newSubRealm: check.nextSubRealm || undefined,
      message: `突破成功！进入${check.nextRealm?.nameCN || ''}${check.nextSubRealm?.nameCN || ''}`
    }
  }
  
  // 修炼
  cultivate(playerId: string, amount?: number): {
    success: boolean
    gainedCultivation: number
    totalCultivation: number
    message: string
  } {
    const data = this.getPlayerData(playerId)
    const playerRealm = this.getPlayerRealm(playerId)
    
    // 检查每日上限
    const today = new Date().toDateString()
    if (new Date(data.lastCultivationTime).toDateString() !== today) {
      data.cultivationToday = 0
    }
    
    if (data.cultivationToday >= REALM_CONFIG.dailyCultivationLimit) {
      return { success: false, gainedCultivation: 0, totalCultivation: data.totalCultivation, message: '今日修炼已达上限' }
    }
    
    // 计算获得修炼值
    const baseGained = amount || REALM_CONFIG.baseCultivationPerAction
    const bonus = playerRealm ? playerRealm.realm.benefits.cultivationExpBonus / 100 : 0
    const gainedCultivation = Math.floor(baseGained * (1 + bonus))
    
    // 限制每日上限
    const remaining = REALM_CONFIG.dailyCultivationLimit - data.cultivationToday
    const actualGained = Math.min(gainedCultivation, remaining)
    
    data.totalCultivation += actualGained
    data.cultivationToday += actualGained
    data.lastCultivationTime = Date.now()
    
    return {
      success: true,
      gainedCultivation: actualGained,
      totalCultivation: data.totalCultivation,
      message: `修炼获得${actualGained}点修炼值`
    }
  }
  
  // 获取修炼进度
  getProgress(playerId: string): {
    currentRealm: string
    currentSubRealm: string
    totalCultivation: number
    cultivationToday: number
    dailyLimit: number
    nextSubRealm?: SubRealm
    progressPercent: number
  } {
    const data = this.getPlayerData(playerId)
    const currentSubRealm = this.getSubRealm(data.currentRealmId, data.currentSubRealmId)
    
    let nextSubRealm: SubRealm | undefined
    let progressPercent = 0
    
    // 找下一个境界
    const realm = this.getRealm(data.currentRealmId)
    if (realm && realm.subRealms) {
      const currentOrder = realm.subRealms.findIndex(s => s.subRealmId === data.currentSubRealmId)
      if (currentOrder < realm.subRealms.length - 1) {
        nextSubRealm = realm.subRealms[currentOrder + 1]
      }
    }
    
    if (!nextSubRealm && realm) {
      const currentOrder = REALMS.findIndex(r => r.realmId === data.currentRealmId)
      if (currentOrder < REALMS.length - 1) {
        const nextRealm = REALMS[currentOrder + 1]
        if (nextRealm.subRealms && nextRealm.subRealms.length > 0) {
          nextSubRealm = nextRealm.subRealms[0]
        }
      }
    }
    
    if (nextSubRealm && currentSubRealm) {
      const currentRequired = currentSubRealm.cultivationRequired
      const nextRequired = nextSubRealm.cultivationRequired
      progressPercent = ((data.totalCultivation - currentRequired) / (nextRequired - currentRequired)) * 100
      progressPercent = Math.max(0, Math.min(100, progressPercent))
    }
    
    return {
      currentRealm: data.currentRealmId,
      currentSubRealm: data.currentSubRealmId,
      totalCultivation: data.totalCultivation,
      cultivationToday: data.cultivationToday,
      dailyLimit: REALM_CONFIG.dailyCultivationLimit,
      nextSubRealm,
      progressPercent
    }
  }
  
  // 计算跨境界战斗加成/惩罚
  calculateCombatMultiplier(attackerRealmId: string, defenderRealmId: string): number {
    const attackerRealm = this.getRealm(attackerRealmId)
    const defenderRealm = this.getRealm(defenderRealmId)
    
    if (!attackerRealm || !defenderRealm) return 1
    
    const levelDiff = attackerRealm.order - defenderRealm.order
    
    if (levelDiff > 0) {
      // 高境界对低境界有加成
      return 1 + (levelDiff * REALM_CONFIG.realmPenalty.penaltyPerLevel)
    } else if (levelDiff < 0) {
      // 低境界对高境界有惩罚
      const penalty = Math.abs(levelDiff) * REALM_CONFIG.realmPenalty.penaltyPerLevel
      return Math.max(REALM_CONFIG.realmPenalty.minMultiplier, 1 - penalty)
    }
    
    return 1
  }
  
  // 获取玩家境界排行
  getRealmRank(limit: number = 100): PlayerRealmData[] {
    const allData = Array.from(this.playerData.values())
    return allData
      .sort((a, b) => {
        const realmA = this.getRealm(a.currentRealmId)
        const realmB = this.getRealm(b.currentRealmId)
        if (!realmA || !realmB) return 0
        
        // 先比较境界顺序
        if (realmA.order !== realmB.order) {
          return realmB.order - realmA.order
        }
        // 再比较修炼值
        return b.totalCultivation - a.totalCultivation
      })
      .slice(0, limit)
  }
}

export const realmSystem = new RealmSystem()
