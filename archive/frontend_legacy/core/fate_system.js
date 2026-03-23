/**
 * 挂机修仙 - 机缘系统
 * 仙缘、秘宝、传承、悟道、秘境
 */

// ==================== 仙缘系统 ====================
const OPPORTUNITY_DATA = {
  // 仙缘类型
  types: {
    // 顿悟
    enlightenment: {
      name: '顿悟',
      icon: '💡',
      desc: '修炼中突然领悟',
      duration: 3600,
      effects: { spirit_rate: 2.0, exp_rate: 2.0 },
      rarity: 'common'
    },
    // 灵光一现
    inspiration: {
      name: '灵光一现',
      icon: '✨',
      desc: '突发灵感',
      duration: 1800,
      effects: { technique_exp: 1.5 },
      rarity: 'uncommon'
    },
    // 天材地宝
    treasure: {
      name: '天材地宝',
      icon: '💎',
      desc: '发现稀有天材',
      one_time: true,
      rewards: { stones: [100, 500], materials: ['玄铁', '玉石', '灵石矿'] },
      rarity: 'rare'
    },
    // 仙人指路
    guidance: {
      name: '仙人指路',
      icon: '🧘',
      desc: '仙人指点迷津',
      duration: 7200,
      effects: { realm_progress: 1.5 },
      one_time: true,
      rarity: 'epic'
    },
    // 逆天改命
    fate: {
      name: '逆天改命',
      icon: '⚡',
      desc: '改变修炼命运',
      one_time: true,
      effects: { random_stat_boost: [10, 30] },
      rarity: 'legendary'
    }
  },
  
  // 触发条件
  triggers: {
    cultivate_time: 300,    // 修炼300秒可能触发
    level_up: 0.3,         // 升级30%概率触发
    realm_break: 0.5,      // 突破50%概率触发
    battle_win: 0.05,     // 战斗胜利5%概率
    random_tick: 0.001     // 每次tick 0.1%
  }
};

// ==================== 秘宝系统 ====================
const SECRET_TREASURE_DATA = {
  // 秘宝列表
  treasures: [
    {
      id: 'spirit_orb',
      name: '灵气之晶',
      desc: '蕴含浓郁灵气的晶体',
      effect: { type: 'spirit', value: 1000 },
      rarity: 1,
      can_buy: true,
      price: 100
    },
    {
      id: 'exp_scroll',
      name: '经验卷轴',
      desc: '使用后获得大量经验',
      effect: { type: 'exp', value: 5000 },
      rarity: 2,
      can_buy: true,
      price: 300
    },
    {
      id: 'realm_crystal',
      name: '境界结晶',
      desc: '可突破当前境界',
      effect: { type: 'realm_break', value: 1 },
      rarity: 4,
      can_buy: false,
      price: 0
    },
    {
      id: 'equipment_box',
      name: '装备宝箱',
      desc: '随机获得一件装备',
      effect: { type: 'equipment', rarity: [1, 4] },
      rarity: 2,
      can_buy: true,
      price: 500
    },
    {
      id: 'technique_book',
      name: '功法残卷',
      desc: '领悟随机功法',
      effect: { type: 'technique', level: [1, 3] },
      rarity: 3,
      can_buy: false,
      price: 0
    },
    {
      id: 'lucky_charm',
      name: '好运符',
      desc: '24小时内掉率翻倍',
      effect: { type: 'luck', duration: 86400 },
      rarity: 2,
      can_buy: true,
      price: 200
    },
    {
      id: 'spirit_root_essence',
      name: '灵根精华',
      desc: '改变灵根资质',
      effect: { type: 'spirit_root', reroll: true },
      rarity: 5,
      can_buy: false,
      price: 0
    },
    {
      id: 'immortal_blessing',
      name: '仙人之祝福',
      desc: '全属性提升50%',
      effect: { type: 'blessing', duration: 3600 },
      rarity: 4,
      can_buy: false,
      price: 0
    }
  ],
  
  // 秘宝获取方式
  acquisition: {
    // 商城购买
    shop: ['spirit_orb', 'exp_scroll', 'equipment_box', 'lucky_charm'],
    // 奇遇获得
    chance: ['treasure', 'inspiration', 'realm_crystal', 'technique_book'],
    // 成就奖励
    achievement: ['spirit_root_essence', 'immortal_blessing'],
    // 秘境掉落
    dungeon: ['equipment_box', 'exp_scroll', 'realm_crystal']
  },
  
  // 秘宝商店刷新
  shop_refresh: {
    interval: 3600,        // 每小时刷新
    price: 50,              // 强制刷新价格
    Treasures_count: 4       // 每次显示4个
  }
};

// ==================== 传承系统 ====================
const INHERITANCE_DATA = {
  // 传承类型
  inheritances: [
    {
      id: 'sword_ancestor',
      name: '剑祖传承',
      desc: '上古剑修大能的毕生所学',
      requirements: { realm: 3, weapon: '仙剑' },
      rewards: {
        technique: { category: 'combat', level: 'max' },
        stats: { atk: 500 },
        title: '剑道传人'
      },
      rarity: 'epic'
    },
    {
      id: 'alchemy_master',
      name: '丹道传承',
      desc: '炼丹宗师的精髓',
      requirements: { realm: 2, buildings: { '炼丹房': 5 } },
      rewards: {
        technique: { category: 'auxiliary', level: 'max' },
        stats: { pill_efficiency: 0.5 },
        title: '炼丹宗师'
      },
      rarity: 'epic'
    },
    {
      id: 'body_refinement',
      name: '炼体传承',
      desc: '佛门金身修炼法门',
      requirements: { realm: 2, defense: 100 },
      rewards: {
        technique: { category: 'defense', level: 'max' },
        stats: { hp: 1000, def: 100 },
        title: '炼体真人'
      },
      rarity: 'rare'
    },
    {
      id: 'spirit_king',
      name: '灵气王者',
      desc: '掌控天地灵气之法',
      requirements: { realm: 4, cultivation: 'cosmos' },
      rewards: {
        technique: { category: 'cultivation', level: 'max' },
        stats: { spirit_rate: 1.5 },
        title: '灵气王者'
      },
      rarity: 'legendary'
    },
    {
      id: 'immortal_legacy',
      name: '仙人传承',
      desc: '成仙之法',
      requirements: { realm: 8, achievements: 5 },
      rewards: {
        technique: { category: 'all', level: 'max' },
        stats: { all_stats: 0.3 },
        title: '仙人转世'
      },
      rarity: 'mythical'
    }
  ],
  
  // 传承触发条件
  triggers: {
    // 特定境界自动触发
    auto_at_realm: { 3: ['body_refinement'], 5: ['sword_ancestor', 'alchemy_master'], 8: ['spirit_king'], 10: ['immortal_legacy'] },
    // 任务触发
    quest_trigger: true,
    // 随机触发
    random_chance: 0.0001
  }
};

// ==================== 悟道系统 ====================
const COMPREHENSION_DATA = {
  // 悟道状态
  states: {
    none: { name: '未悟道', multiplier: 1.0 },
    novice: { name: '初窥门径', multiplier: 1.2 },
    adept: { name: '略有小成', multiplier: 1.5 },
    master: { name: '融会贯通', multiplier: 2.0 },
    supreme: { name: '登峰造极', multiplier: 3.0 },
    transcendent: { name: '超凡入圣', multiplier: 5.0 }
  },
  
  // 悟道条件
  conditions: {
    // 累计修炼时间(秒)
    cultivation_time: [
      { time: 3600, state: 'novice' },     // 1小时
      { time: 36000, state: 'adept' },    // 10小时
      { time: 360000, state: 'master' },   // 100小时
      { time: 3600000, state: 'supreme' },  // 1000小时
      { time: 36000000, state: 'transcendent' } // 10000小时
    ],
    // 领悟功法数量
    techniques_learned: [
      { count: 5, state: 'novice' },
      { count: 10, state: 'adept' },
      { count: 15, state: 'master' },
      { count: 20, state: 'supreme' },
      { count: 24, state: 'transcendent' }
    ],
    // 击败怪物数量
    monsters_killed: [
      { count: 100, state: 'novice' },
      { count: 1000, state: 'adept' },
      { count: 10000, state: 'master' },
      { count: 50000, state: 'supreme' },
      { count: 100000, state: 'transcendent' }
    ]
  },
  
  // 悟道奖励
  rewards: {
    spirit_rate: { novice: 0.1, adept: 0.2, master: 0.3, supreme: 0.5, transcendent: 1.0 },
    exp_rate: { novice: 0.1, adept: 0.2, master: 0.3, supreme: 0.5, transcendent: 1.0 },
    stone_rate: { novice: 0.1, adept: 0.2, master: 0.3, supreme: 0.5, transcendent: 1.0 }
  }
};

// ==================== 秘境系统 ====================
const SECRET_REALM_DATA = {
  // 秘境列表
  realms: [
    {
      id: 'small_realm',
      name: '小型秘境',
      desc: '适合初学者探索',
      min_realm: 0,
      duration: 300,
      waves: 3,
      rewards: { exp: [100, 500], stones: [50, 200], items: ['spirit_orb'] },
      entrance_fee: 0,
      rarity: 'common'
    },
    {
      id: 'medium_realm',
      name: '中型秘境',
      desc: '有一定难度',
      min_realm: 2,
      duration: 600,
      waves: 5,
      rewards: { exp: [500, 2000], stones: [200, 800], items: ['exp_scroll', 'equipment_box'] },
      entrance_fee: 100,
      rarity: 'uncommon'
    },
    {
      id: 'large_realm',
      name: '大型秘境',
      desc: '危机四伏',
      min_realm: 4,
      duration: 1200,
      waves: 8,
      rewards: { exp: [2000, 10000], stones: [1000, 5000], items: ['realm_crystal', 'technique_book'] },
      entrance_fee: 500,
      rarity: 'rare'
    },
    {
      id: 'ancient_realm',
      name: '上古秘境',
      desc: '上古仙人遗迹',
      min_realm: 6,
      duration: 1800,
      waves: 10,
      rewards: { exp: [10000, 50000], stones: [5000, 20000], items: ['lucky_charm', 'immortal_blessing'] },
      entrance_fee: 2000,
      rarity: 'epic'
    },
    {
      id: 'immortal_realm',
      name: '仙人遗迹',
      desc: '成仙契机',
      min_realm: 8,
      duration: 3600,
      waves: 15,
      rewards: { exp: [50000, 200000], stones: [20000, 100000], items: ['spirit_root_essence', 'immortal_blessing'] },
      entrance_fee: 10000,
      rarity: 'legendary'
    }
  ],
  
  // 进入条件
  entrance: {
    // 灵石门槛
    stone_required: true,
    // 每日次数限制
    daily_limit: { small_realm: -1, medium_realm: 3, large_realm: 1, ancient_realm: 1, immortal_realm: 0 },
    // 刷新时间
    reset_time: 86400
  },
  
  // 秘境特殊事件
  events: [
    { type: 'trap', chance: 0.2, effect: 'damage' },
    { type: 'treasure', chance: 0.3, effect: 'bonus_reward' },
    { type: 'boss', chance: 0.1, effect: 'extra_wave' },
    { type: 'mystery', chance: 0.1, effect: 'random' }
  ]
};

// ==================== 仙缘任务 ====================
const FATE_QUEST_DATA = {
  // 仙缘任务
  quests: [
    {
      id: 'first_cultivate',
      name: '初入仙途',
      desc: '完成第一次修炼',
      requirement: { action: 'cultivate', count: 1 },
      rewards: { stones: 10 }
    },
    {
      id: 'reach_lianqi',
      name: '练气入门',
      desc: '突破到练气期',
      requirement: { realm: 1 },
      rewards: { stones: 50, title: '练气修士' }
    },
    {
      id: 'reach_zhuJi',
      name: '筑基成功',
      desc: '突破到筑基期',
      requirement: { realm: 2 },
      rewards: { stones: 200, technique_point: 1 }
    },
    {
      id: 'kill_10_monsters',
      name: '斩妖除魔',
      desc: '击败10只怪物',
      requirement: { monsters: 10 },
      rewards: { stones: 100 }
    },
    {
      id: 'collect_1000_stones',
      name: '小有所成',
      desc: '累计获得1000灵石',
      requirement: { total_stones: 1000 },
      rewards: { equipment: '灵剑' }
    },
    {
      id: 'first_equipment',
      name: '法器初成',
      desc: '获得第一件装备',
      requirement: { action: 'equipment', count: 1 },
      rewards: { stones: 50 }
    },
    {
      id: 'reach_100_level',
      name: '百年修为',
      desc: '修炼到100级',
      requirement: { level: 100 },
      rewards: { stones: 1000, title: '百年老怪' }
    },
    {
      id: 'clear_dungeon',
      name: '副本首通',
      desc: '通关任意副本',
      requirement: { dungeon: 1 },
      rewards: { technique_point: 2 }
    },
    {
      id: 'reach_peak',
      name: '登峰造极',
      desc: '达到悟道最高境界',
      requirement: { comprehension: 'transcendent' },
      rewards: { stones: 10000, title: '大道之体' }
    }
  ],
  
  // 任务刷新
  refresh: {
    daily: true,
    weekly: false
  }
};

// 导出机缘系统数据
window.OPPORTUNITY_DATA = OPPORTUNITY_DATA;
window.SECRET_TREASURE_DATA = SECRET_TREASURE_DATA;
window.INHERITANCE_DATA = INHERITANCE_DATA;
window.COMPREHENSION_DATA = COMPREHENSION_DATA;
window.SECRET_REALM_DATA = SECRET_REALM_DATA;
window.FATE_QUEST_DATA = FATE_QUEST_DATA;
