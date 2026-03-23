// 福地任务系统 - 探索事件、随机奖励

export interface VentureLocation {
  locationId: string
  name: string
  nameCN: string
  level: number
  energyCost: number
  dangerLevel: 'safe' | 'low' | 'mid' | 'high' | 'extreme'
  events: VentureEvent[]
  rewards: VentureReward[]
}

export interface VentureEvent {
  eventId: string
  name: string
  nameCN: string
  description: string
  type: 'combat' | 'treasure' | 'trap' | 'npc' | 'discovery' | 'mystery'
  weight: number
  outcomes: VentureOutcome[]
}

export interface VentureOutcome {
  outcomeId: string
  weight: number
  result: {
    type: 'nothing' | 'combat' | 'item' | 'cultivation' | 'injury' | 'friend' | 'secret'
    value: number
    item?: { itemId: string; nameCN: string; rarity: string; type: string }
    message: string
    messageCN: string
  }
}

export interface VentureReward {
  type: 'cultivation_exp' | 'spirit_stone' | 'herb' | 'equipment' | 'artifact' | 'skill_book'
  itemId?: string
  value: number
  minQuantity: number
  maxQuantity: number
  dropRate: number
}

export interface PlayerVentureData {
  playerId: string
  explorationCount: number
  totalRewards: number
  locationHistory: string[]
  achievements: string[]
}

export const VENTURE_LOCATIONS: VentureLocation[] = [
  {
    locationId: 'spirit_cave',
    name: 'Spirit Cave',
    nameCN: '灵气洞穴',
    level: 1,
    energyCost: 10,
    dangerLevel: 'safe',
    events: [
      {
        eventId: 'spirit_absorption',
        name: 'Spirit Absorption',
        nameCN: '灵气吸收',
        description: '发现灵气浓郁之处',
        type: 'discovery',
        weight: 30,
        outcomes: [
          { outcomeId: 'absorb_success', weight: 70, result: { type: 'cultivation', value: 50, message: 'Absorbed', messageCN: '成功吸收灵气' } },
          { outcomeId: 'absorb_normal', weight: 30, result: { type: 'nothing', value: 0, message: 'Nothing', messageCN: '没有明显收获' } }
        ]
      },
      {
        eventId: 'herbal_discovery',
        name: 'Herbal Discovery',
        nameCN: '发现草药',
        type: 'treasure',
        weight: 25,
        outcomes: [
          { outcomeId: 'find_rare_herb', weight: 20, result: { type: 'item', value: 1, item: { itemId: 'lingzhi', nameCN: '灵芝', rarity: 'common', type: 'herb' }, message: 'Found!', messageCN: '发现稀有草药！' } },
          { outcomeId: 'find_common_herb', weight: 80, result: { type: 'item', value: 1, item: { itemId: 'gouqi', nameCN: '枸杞', rarity: 'common', type: 'herb' }, message: 'Found', messageCN: '发现普通草药' } }
        ]
      },
      {
        eventId: 'spirit_stone_vein',
        name: 'Spirit Stone Vein',
        nameCN: '灵石矿脉',
        type: 'treasure',
        weight: 15,
        outcomes: [
          { outcomeId: 'rich_vein', weight: 30, result: { type: 'item', value: 100, item: { itemId: 'spirit_stone', nameCN: '灵石', rarity: 'common', type: 'currency' }, message: 'Rich!', messageCN: '发现富矿！' } },
          { outcomeId: 'normal_vein', weight: 70, result: { type: 'item', value: 30, item: { itemId: 'spirit_stone', nameCN: '灵石', rarity: 'common', type: 'currency' }, message: 'Normal', messageCN: '普通矿脉' } }
        ]
      },
      {
        eventId: 'mysterious_trap',
        name: 'Mysterious Trap',
        nameCN: '神秘陷阱',
        type: 'trap',
        weight: 20,
        outcomes: [
          { outcomeId: 'trap_dodge', weight: 60, result: { type: 'nothing', value: 0, message: 'Dodged', messageCN: '成功躲避陷阱' } },
          { outcomeId: 'trap_triggered', weight: 40, result: { type: 'injury', value: -20, message: 'Injured', messageCN: '触发陷阱受伤' } }
        ]
      },
      {
        eventId: 'wandering_cultivator',
        name: 'Wandering Cultivator',
        nameCN: '云游修士',
        type: 'npc',
        weight: 10,
        outcomes: [
          { outcomeId: 'cultivator_gift', weight: 40, result: { type: 'cultivation', value: 30, message: 'Tips', messageCN: '获得修炼指点' } },
          { outcomeId: 'cultivator_trade', weight: 35, result: { type: 'item', value: 1, item: { itemId: 'skill_book_basic', nameCN: '基础功法', rarity: 'rare', type: 'book' }, message: 'Trade', messageCN: '交易完成' } },
          { outcomeId: 'cultivator_nothing', weight: 25, result: { type: 'nothing', value: 0, message: 'Nothing', messageCN: '擦肩而过' } }
        ]
      }
    ],
    rewards: [
      { type: 'cultivation_exp', value: 50, minQuantity: 10, maxQuantity: 30, dropRate: 1 },
      { type: 'spirit_stone', value: 10, minQuantity: 10, maxQuantity: 50, dropRate: 0.8 },
      { type: 'herb', itemId: 'lingzhi', value: 1, minQuantity: 1, maxQuantity: 2, dropRate: 0.3 }
    ]
  },
  {
    locationId: 'dark_forest',
    name: 'Dark Forest',
    nameCN: '幽暗森林',
    level: 15,
    energyCost: 20,
    dangerLevel: 'low',
    events: [
      {
        eventId: 'beast_attack',
        name: 'Beast Attack',
        nameCN: '野兽袭击',
        type: 'combat',
        weight: 35,
        outcomes: [
          { outcomeId: 'beast_victory', weight: 65, result: { type: 'cultivation', value: 80, message: 'Victory', messageCN: '击败野兽' } },
          { outcomeId: 'beast_defeat', weight: 35, result: { type: 'injury', value: -30, message: 'Injured', messageCN: '被野兽所伤' } }
        ]
      },
      {
        eventId: 'ancient_tree',
        name: 'Ancient Tree Spirit',
        nameCN: '古树精灵',
        type: 'discovery',
        weight: 20,
        outcomes: [
          { outcomeId: 'tree_blessing', weight: 50, result: { type: 'cultivation', value: 100, message: 'Blessed', messageCN: '获得古树祝福' } },
          { outcomeId: 'tree_curse', weight: 20, result: { type: 'injury', value: -20, message: 'Cursed', messageCN: '被树灵诅咒' } },
          { outcomeId: 'tree_nothing', weight: 30, result: { type: 'nothing', value: 0, message: 'Nothing', messageCN: '没有收获' } }
        ]
      },
      {
        eventId: 'hidden_treasure',
        name: 'Hidden Treasure',
        nameCN: '隐藏宝藏',
        type: 'treasure',
        weight: 15,
        outcomes: [
          { outcomeId: 'epic_treasure', weight: 15, result: { type: 'item', value: 1, item: { itemId: 'xianlingpi', nameCN: '仙灵脾', rarity: 'rare', type: 'herb' }, message: 'Epic!', messageCN: '发现史诗级宝物！' } },
          { outcomeId: 'rare_treasure', weight: 35, result: { type: 'item', value: 1, item: { itemId: 'yuzhu', nameCN: '玉竹', rarity: 'rare', type: 'herb' }, message: 'Rare', messageCN: '发现稀有宝物' } },
          { outcomeId: 'common_treasure', weight: 50, result: { type: 'item', value: 1, item: { itemId: 'lingshi', nameCN: '灵石', rarity: 'common', type: 'currency' }, message: 'Common', messageCN: '普通宝物' } }
        ]
      },
      {
        eventId: 'poison_swamp',
        name: 'Poison Swamp',
        nameCN: '毒沼泽',
        type: 'trap',
        weight: 20,
        outcomes: [
          { outcomeId: 'swamp_escape', weight: 55, result: { type: 'nothing', value: 0, message: 'Escaped', messageCN: '安全逃脱' } },
          { outcomeId: 'poison_damage', weight: 45, result: { type: 'injury', value: -40, message: 'Poisoned', messageCN: '中毒了！' } }
        ]
      },
      {
        eventId: 'forest_spirit',
        name: 'Forest Spirit',
        nameCN: '森林精灵',
        type: 'mystery',
        weight: 10,
        outcomes: [
          { outcomeId: 'spirit_friend', weight: 40, result: { type: 'friend', value: 1, message: 'Friend', messageCN: '结交精灵' } },
          { outcomeId: 'secret_revealed', weight: 30, result: { type: 'secret', value: 1, message: 'Secret', messageCN: '揭示秘密' } },
          { outcomeId: 'spirit_angry', weight: 30, result: { type: 'injury', value: -25, message: 'Angry', messageCN: '精灵发怒' } }
        ]
      }
    ],
    rewards: [
      { type: 'cultivation_exp', value: 100, minQuantity: 30, maxQuantity: 80, dropRate: 1 },
      { type: 'spirit_stone', value: 10, minQuantity: 30, maxQuantity: 100, dropRate: 0.9 },
      { type: 'herb', itemId: 'xianlingpi', value: 1, minQuantity: 1, maxQuantity: 2, dropRate: 0.4 },
      { type: 'equipment', value: 1, minQuantity: 1, maxQuantity: 1, dropRate: 0.2 }
    ]
  },
  {
    locationId: 'abyss_cave',
    name: 'Abyss Cave',
    nameCN: '深渊洞穴',
    level: 35,
    energyCost: 35,
    dangerLevel: 'mid',
    events: [
      {
        eventId: 'demon_encounter',
        name: 'Demon Encounter',
        nameCN: '遭遇妖魔',
        type: 'combat',
        weight: 40,
        outcomes: [
          { outcomeId: 'demon_victory', weight: 50, result: { type: 'cultivation', value: 150, message: 'Slain', messageCN: '斩妖除魔' } },
          { outcomeId: 'demon_near_miss', weight: 30, result: { type: 'injury', value: -50, message: 'Near death', messageCN: '险些丧命' } },
          { outcomeId: 'demon_defeat', weight: 20, result: { type: 'injury', value: -80, message: 'Injured', messageCN: '重创' } }
        ]
      },
      {
        eventId: 'ancient_ruins',
        name: 'Ancient Ruins',
        nameCN: '上古遗迹',
        type: 'discovery',
        weight: 25,
        outcomes: [
          { outcomeId: 'ruins_treasure', weight: 40, result: { type: 'item', value: 1, item: { itemId: 'cangzhuo', nameCN: '苍卓', rarity: 'epic', type: 'herb' }, message: 'Treasure!', messageCN: '上古遗珍！' } },
          { outcomeId: 'ruins_knowledge', weight: 35, result: { type: 'cultivation', value: 200, message: 'Knowledge', messageCN: '获得上古知识' } },
          { outcomeId: 'ruins_trap', weight: 25, result: { type: 'injury', value: -40, message: 'Trap', messageCN: '触发古阵陷阱' } }
        ]
      },
      {
        eventId: 'secret_passage',
        name: 'Secret Passage',
        nameCN: '密道',
        type: 'mystery',
        weight: 15,
        outcomes: [
          { outcomeId: 'passage_wealth', weight: 35, result: { type: 'spirit_stone', value: 500, message: 'Wealth!', messageCN: '发现大量财富！' } },
          { outcomeId: 'passage_danger', weight: 30, result: { type: 'combat', value: 0, message: 'Danger', messageCN: '发现危险' } },
          { outcomeId: 'passage_deadend', weight: 35, result: { type: 'nothing', value: 0, message: 'Dead end', messageCN: '死胡同' } }
        ]
      },
      {
        eventId: 'underground_lake',
        name: 'Underground Lake',
        nameCN: '地下湖泊',
        type: 'discovery',
        weight: 20,
        outcomes: [
          { outcomeId: 'lake_blessing', weight: 60, result: { type: 'cultivation', value: 300, message: 'Blessing!', messageCN: '灵湖祝福！' } },
          { outcomeId: 'lake_water_spirit', weight: 25, result: { type: 'item', value: 1, item: { itemId: 'bailian', nameCN: '白莲', rarity: 'epic', type: 'herb' }, message: 'Gift', messageCN: '水灵赠礼' } },
          { outcomeId: 'lake_cursed', weight: 15, result: { type: 'injury', value: -60, message: 'Cursed', messageCN: '被诅咒之水' } }
        ]
      }
    ],
    rewards: [
      { type: 'cultivation_exp', value: 200, minQuantity: 80, maxQuantity: 150, dropRate: 1 },
      { type: 'spirit_stone', value: 10, minQuantity: 80, maxQuantity: 200, dropRate: 0.95 },
      { type: 'herb', itemId: 'cangzhuo', value: 1, minQuantity: 1, maxQuantity: 1, dropRate: 0.3 },
      { type: 'equipment', value: 1, minQuantity: 1, maxQuantity: 1, dropRate: 0.35 },
      { type: 'artifact', value: 1, minQuantity: 1, maxQuantity: 1, dropRate: 0.1 }
    ]
  },
  {
    locationId: 'demon_abyss',
    name: 'Demon Abyss',
    nameCN: '魔渊',
    level: 55,
    energyCost: 50,
    dangerLevel: 'high',
    events: [
      {
        eventId: 'demon_lord',
        name: 'Demon Lord',
        nameCN: '魔君',
        type: 'combat',
        weight: 35,
        outcomes: [
          { outcomeId: 'demon_lord_victory', weight: 35, result: { type: 'cultivation', value: 500, message: 'Slain!', messageCN: '击败魔君！' } },
          { outcomeId: 'demon_lord_near_death', weight: 40, result: { type: 'injury', value: -100, message: 'Near death', messageCN: '九死一生' } },
          { outcomeId: 'demon_lord_escape', weight: 25, result: { type: 'injury', value: -150, message: 'Escaped', messageCN: '勉强逃脱' } }
        ]
      },
      {
        eventId: 'demon_treasure',
        name: 'Demon Treasure',
        nameCN: '魔宝',
        type: 'treasure',
        weight: 25,
        outcomes: [
          { outcomeId: 'legendary_treasure', weight: 10, result: { type: 'item', value: 1, item: { itemId: 'dragon_blood', nameCN: '龙血玫瑰', rarity: 'legendary', type: 'herb' }, message: 'Legendary!', messageCN: '传说级宝物！' } },
          { outcomeId: 'epic_treasure', weight: 30, result: { type: 'item', value: 1, item: { itemId: 'phoenix_herb', nameCN: '凤凰焰', rarity: 'epic', type: 'herb' }, message: 'Epic', messageCN: '史诗级宝物' } },
          { outcomeId: 'rare_treasure', weight: 60, result: { type: 'item', value: 1, item: { itemId: 'jinyutuo', nameCN: '金羽拓', rarity: 'epic', type: 'herb' }, message: 'Rare', messageCN: '稀有宝物' } }
        ]
      },
      {
        eventId: 'corruption_zone',
        name: 'Corruption Zone',
        nameCN: '腐蚀领域',
        type: 'trap',
        weight: 25,
        outcomes: [
          { outcomeId: 'corruption_resist', weight: 40, result: { type: 'cultivation', value: 100, message: 'Resisted', messageCN: '抵御腐蚀' } },
          { outcomeId: 'corruption_damage', weight: 60, result: { type: 'injury', value: -120, message: 'Damage!', messageCN: '严重腐蚀伤害！' } }
        ]
      },
      {
        eventId: 'fallen_cultivator',
        name: 'Fallen Cultivator',
        nameCN: '陨落修士',
        type: 'discovery',
        weight: 15,
        outcomes: [
          { outcomeId: 'inheritance', weight: 25, result: { type: 'cultivation', value: 800, message: 'Legacy!', messageCN: '获得传承！' } },
          { outcomeId: 'final_gift', weight: 35, result: { type: 'item', value: 1, item: { itemId: 'thunder_herb', nameCN: '雷霆根', rarity: 'legendary', type: 'herb' }, message: 'Gift', messageCN: '遗赠' } },
          { outcomeId: 'cursed_remains', weight: 40, result: { type: 'injury', value: -80, message: 'Cursed', messageCN: '被遗骸诅咒' } }
        ]
      }
    ],
    rewards: [
      { type: 'cultivation_exp', value: 400, minQuantity: 150, maxQuantity: 300, dropRate: 1 },
      { type: 'spirit_stone', value: 10, minQuantity: 150, maxQuantity: 500, dropRate: 1 },
      { type: 'herb', itemId: 'phoenix_herb', value: 1, minQuantity: 1, maxQuantity: 2, dropRate: 0.4 },
      { type: 'equipment', value: 1, minQuantity: 1, maxQuantity: 1, dropRate: 0.5 },
      { type: 'artifact', value: 1, minQuantity: 1, maxQuantity: 1, dropRate: 0.2 }
    ]
  },
  {
    locationId: 'immortal_trial',
    name: 'Immortal Trial',
    nameCN: '仙劫之地',
    level: 80,
    energyCost: 80,
    dangerLevel: 'extreme',
    events: [
      {
        eventId: 'immortal_trial_combat',
        name: 'Immortal Trial Combat',
        nameCN: '仙劫试炼',
        type: 'combat',
        weight: 40,
        outcomes: [
          { outcomeId: 'trial_success', weight: 25, result: { type: 'cultivation', value: 2000, message: 'Passed!', messageCN: '试炼通过！' } },
          { outcomeId: 'trial_near_success', weight: 35, result: { type: 'cultivation', value: 800, message: 'Partial', messageCN: '部分通过' } },
          { outcomeId: 'trial_failed', weight: 40, result: { type: 'injury', value: -200, message: 'Failed', messageCN: '试炼失败' } }
        ]
      },
      {
        eventId: 'celestial_herb',
        name: 'Celestial Herb',
        nameCN: '天材地宝',
        type: 'treasure',
        weight: 25,
        outcomes: [
          { outcomeId: 'immortal_herb', weight: 15, result: { type: 'item', value: 1, item: { itemId: 'yaohezhi', nameCN: '瑶池芝', rarity: 'legendary', type: 'herb' }, message: 'Immortal!', messageCN: '仙草！' } },
          { outcomeId: 'jade_herb', weight: 35, result: { type: 'item', value: 1, item: { itemId: 'jade_herb', nameCN: '玉灵草', rarity: 'legendary', type: 'herb' }, message: 'Jade', messageCN: '玉灵草' } },
          { outcomeId: 'phoenix_herb', weight: 50, result: { type: 'item', value: 1, item: { itemId: 'phoenix_herb', nameCN: '凤凰焰', rarity: 'epic', type: 'herb' }, message: 'Phoenix', messageCN: '凤凰焰' } }
        ]
      },
      {
        eventId: 'heavenly_light',
        name: 'Heavenly Light',
        nameCN: '天光',
        type: 'discovery',
        weight: 20,
        outcomes: [
          { outcomeId: 'breakthrough_light', weight: 40, result: { type: 'cultivation', value: 1500, message: 'Breakthrough!', messageCN: '突破！' } },
          { outcomeId: 'blessing_light', weight: 45, result: { type: 'cultivation', value: 600, message: 'Blessed', messageCN: '获得祝福' } },
          { outcomeId: 'nothing_light', weight: 15, result: { type: 'nothing', value: 0, message: 'No effect', messageCN: '无效' } }
        ]
      },
      {
        eventId: 'immortal_ghost',
        name: 'Immortal Ghost',
        nameCN: '仙灵',
        type: 'mystery',
        weight: 15,
        outcomes: [
          { outcomeId: 'immortal_teaching', weight: 30, result: { type: 'cultivation', value: 3000, message: 'Teaching!', messageCN: '仙人指点！' } },
          { outcomeId: 'immortal_test', weight: 35, result: { type: 'cultivation', value: 1000, message: 'Test', messageCN: '考验通过' } },
          { outcomeId: 'immortal_reject', weight: 35, result: { type: 'nothing', value: 0, message: 'Ignored', messageCN: '被忽视' } }
        ]
      }
    ],
    rewards: [
      { type: 'cultivation_exp', value: 1000, minQuantity: 300, maxQuantity: 800, dropRate: 1 },
      { type: 'spirit_stone', value: 10, minQuantity: 300, maxQuantity: 1000, dropRate: 1 },
      { type: 'herb', itemId: 'yaohezhi', value: 1, minQuantity: 1, maxQuantity: 1, dropRate: 0.25 },
      { type: 'equipment', value: 1, minQuantity: 1, maxQuantity: 1, dropRate: 0.6 },
      { type: 'artifact', value: 1, minQuantity: 1, maxQuantity: 1, dropRate: 0.35 },
      { type: 'skill_book', value: 1, minQuantity: 1, maxQuantity: 1, dropRate: 0.15 }
    ]
  }
]

export const VENTURE_CONFIG = {
  cooldown: 30000,
  energyRegen: 10,
  dailyLimit: 20,
  eventTriggerChance: 0.7,
  dropRateBonus: 0,
  streakBonus: { threshold: 5, bonusPerStreak: 0.02, maxBonus: 0.2 },
  levelPenalty: { enabled: true, levelDiff: 10, penaltyPerLevel: 0.02, minMultiplier: 0.5 }
}

export class VentureSystem {
  private playerData: Map<string, PlayerVentureData> = new Map()
  private dailyExploration: Map<string, { date: string; count: number }> = new Map()
  private lastExplorationTime: Map<string, number> = new Map()
  private streakCount: Map<string, number> = new Map()

  getPlayerData(playerId: string): PlayerVentureData {
    if (this.playerData.has(playerId)) {
      return this.playerData.get(playerId)!
    }
    const newData: PlayerVentureData = {
      playerId,
      explorationCount: 0,
      totalRewards: 0,
      locationHistory: [],
      achievements: []
    }
    this.playerData.set(playerId, newData)
    return newData
  }

  getDailyExplorationCount(playerId: string): number {
    const today = new Date().toISOString().split('T')[0]
    const record = this.dailyExploration.get(playerId)
    if (!record || record.date !== today) return 0
    return record.count
  }

  canExplore(playerId: string): { can: boolean; reason?: string } {
    const lastTime = this.lastExplorationTime.get(playerId) || 0
    if (Date.now() - lastTime < VENTURE_CONFIG.cooldown) {
      return { can: false, reason: '探索冷却中' }
    }
    if (this.getDailyExplorationCount(playerId) >= VENTURE_CONFIG.dailyLimit) {
      return { can: false, reason: '今日探索次数已用尽' }
    }
    return { can: true }
  }

  getLocation(locationId: string): VentureLocation | null {
    return VENTURE_LOCATIONS.find(l => l.locationId === locationId) || null
  }

  getAvailableLocations(playerLevel: number): VentureLocation[] {
    return VENTURE_LOCATIONS.filter(l => l.level <= playerLevel)
  }

  selectEvent(location: VentureLocation): VentureEvent | null {
    const totalWeight = location.events.reduce((sum, e) => sum + e.weight, 0)
    let random = Math.random() * totalWeight
    for (const event of location.events) {
      random -= event.weight
      if (random <= 0) return event
    }
    return location.events[location.events.length - 1]
  }

  selectOutcome(event: VentureEvent): VentureOutcome {
    const totalWeight = event.outcomes.reduce((sum, o) => sum + o.weight, 0)
    let random = Math.random() * totalWeight
    for (const outcome of event.outcomes) {
      random -= outcome.weight
      if (random <= 0) return outcome
    }
    return event.outcomes[event.outcomes.length - 1]
  }

  calculateRewards(location: VentureLocation, playerLevel: number, playerId: string): { rewards: any[]; multiplier: number } {
    const rewards: any[] = []
    let multiplier = 1.0
    if (VENTURE_CONFIG.levelPenalty.enabled) {
      const levelDiff = playerLevel - location.level
      if (levelDiff > VENTURE_CONFIG.levelPenalty.levelDiff) {
        const penalty = (levelDiff - VENTURE_CONFIG.levelPenalty.levelDiff) * VENTURE_CONFIG.levelPenalty.penaltyPerLevel
        multiplier = Math.max(VENTURE_CONFIG.levelPenalty.minMultiplier, 1 - penalty)
      }
    }
    const streak = this.streakCount.get(playerId) || 0
    if (streak >= VENTURE_CONFIG.streakBonus.threshold) {
      const streakBonus = Math.min(VENTURE_CONFIG.streakBonus.maxBonus, (streak - VENTURE_CONFIG.streakBonus.threshold + 1) * VENTURE_CONFIG.streakBonus.bonusPerStreak)
      multiplier += streakBonus
    }
    for (const reward of location.rewards) {
      const adjustedDropRate = reward.dropRate + VENTURE_CONFIG.dropRateBonus
      if (Math.random() < adjustedDropRate) {
        const quantity = Math.floor(Math.random() * (reward.maxQuantity - reward.minQuantity + 1)) + reward.minQuantity
        rewards.push({ ...reward, quantity: Math.floor(quantity * multiplier), type: reward.type, itemId: reward.itemId, value: reward.value })
      }
    }
    return { rewards, multiplier }
  }

  explore(playerId: string, locationId: string, playerLevel: number): { success: boolean; location?: VentureLocation; event?: VentureEvent; outcome?: VentureOutcome; rewards?: any[]; message: string } {
    const location = this.getLocation(locationId)
    if (!location) return { success: false, message: '未找到该地点' }
    if (playerLevel < location.level) return { success: false, message: `等级不足，需要${location.level}级` }
    const canExplore = this.canExplore(playerId)
    if (!canExplore.can) return { success: false, message: canExplore.reason || '无法探索' }

    const playerData = this.getPlayerData(playerId)
    if (!playerData.locationHistory.includes(locationId)) {
      playerData.locationHistory.push(locationId)
    }

    const today = new Date().toISOString().split('T')[0]
    const record = this.dailyExploration.get(playerId)
    if (!record || record.date !== today) {
      this.dailyExploration.set(playerId, { date: today, count: 1 })
    } else {
      record.count++
    }

    this.lastExplorationTime.set(playerId, Date.now())
    playerData.explorationCount++

    let event: VentureEvent | undefined
    let outcome: VentureOutcome | undefined
    let eventMessage = ''

    if (Math.random() < VENTURE_CONFIG.eventTriggerChance) {
      event = this.selectEvent(location)
      if (event) {
        outcome = this.selectOutcome(event)
        eventMessage = outcome.result.messageCN
        // Update streak based on outcome
        const streak = this.streakCount.get(playerId) || 0
        if (outcome.result.type === 'cultivation' || outcome.result.type === 'item') {
          this.streakCount.set(playerId, streak + 1)
        } else {
          this.streakCount.set(playerId, 0)
        }
      }
    }

    const { rewards } = this.calculateRewards(location, playerLevel, playerId)
    playerData.totalRewards += rewards.length

    return {
      success: true,
      location,
      event,
      outcome,
      rewards,
      message: eventMessage || '探索完成'
    }
  }

  getPlayerStats(playerId: string) {
    const data = this.getPlayerData(playerId)
    const daily = this.getDailyExplorationCount(playerId)
    return {
      explorationCount: data.explorationCount,
      dailyExploration: daily,
      dailyLimit: VENTURE_CONFIG.dailyLimit,
      locationsDiscovered: data.locationHistory.length,
      achievements: data.achievements
    }
  }
}

export const ventureSystem = new VentureSystem()
