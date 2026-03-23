/**
 * 挂机修仙 - 数值系统 v3.0 (长线运营版)
 * 解决数值膨胀问题，提供深度消耗坑
 */

// ==================== 核心数值常数 ====================
const BALANCE_V3 = {
  // 版本信息
  version: '3.0.0',
  name: '长线运营数值',
  
  // ==================== 灵气系统 ====================
  spirit: {
    // 基础参数
    base_rate: 0.5,           // 凡人基础灵气速率 (原来是2)
    base_cap: 20,              // 凡人基础灵气上限 (保持不变)
    
    // 速率成长: 改为指数增长
    rate_growth: {
      formula: (realm, level) => Math.floor(0.5 * Math.pow(1.8, realm) * (1 + level * 0.05)),
      desc: '灵气速率 = 0.5 * 1.8^境界 * (1 + 等级*0.05)'
    },
    
    // 上限成长: 指数增长
    cap_growth: {
      formula: (realm, level) => Math.floor(20 * Math.pow(2.0, realm) * (1 + level * 0.15)),
      desc: '灵气上限 = 20 * 2.0^境界 * (1 + 等级*0.15)'
    },
    
    // 灵气精炼 (新消耗机制)
    refinement: {
      cost_per_use: 50,        // 每次精炼消耗灵石
      spirit_gain: 5,          // 每次精炼获得灵气
      max_daily: 50,           // 每日限次
      efficiency_bonus: 0.1   // 效率加成/层
    },
    
    // 灵气压缩 (高级机制)
    compression: {
      cost: 500,
      ratio: 10,               // 10:1 压缩
      require_realm: 3         // 金丹期开启
    }
  },
  
  // ==================== 境界突破系统 ====================
  realm_break: {
    // 突破消耗: 陡峭指数增长
    cultivation_req: (realm) => Math.floor(80 * Math.pow(3.2, realm)),
    
    // 突破成功率 (基础60% + 加成)
    base_success_rate: 0.6,
    
    // 成功率修正
    success_modifiers: {
      // 灵气纯度 (精炼次数/100)
      purity: (purity) => Math.min(0.25, purity / 400),
      // 功法加成
      technique: 0.1,
      // 灵根品质
      spirit_root: {
        '五行杂灵根': 0,
        '单灵根': 0.1,
        '变异灵根': 0.15,
        '天灵根': 0.25
      },
      // 突破丹加成
      pill_bonus: 0.15,
      // 洞府加成
      cave_bonus: 0.05
    },
    
    // 失败惩罚与保底
    failure: {
      refund_ratio: 0.3,       // 返还30%灵气
      insight_gain: 10,        // 获得感悟点数
      debuff_duration: 0       // 无debuff
    },
    
    // 保底机制
    pity: {
      trigger: 5,               // 连续5次失败后触发
      guaranteed_success: true,
      reset_on_success: true
    },
    
    // 突破渡劫 (新增)
    tribulation: {
      enabled: true,
      damage_multiplier: (realm) => 1 + realm * 0.5,
      pass_reward: {
        spirit_rate_bonus: 0.1,
        attribute_bonus: 0.05
      }
    }
  },
  
  // ==================== 等级系统 ====================
  level: {
    // 经验曲线: 更陡峭
    exp_curve: (level) => Math.floor(100 * Math.pow(1.35, level - 1)),
    
    // 属性成长
    hp_growth: (level) => Math.floor(10 * Math.pow(1.10, level - 1)),
    atk_growth: (level) => Math.floor(2 * Math.pow(1.08, level - 1)),
    def_growth: (level) => Math.floor(1 * Math.pow(1.08, level - 1)),
    
    // 灵气相关成长
    spirit_rate_per_level: 0.3,
    spirit_cap_per_level: 5,
    
    // 等级上限
    max_level: 200,
    
    // 等级压缩 (后期)
    compression_threshold: 100,
    compression_ratio: 0.1
  },
  
  // ==================== 灵石消耗系统 ====================
  economy: {
    // 基础价值
    values: {
      herb: 2,
      pill: 10,
      material: 8,
      equipment: 80,
      beast: 200,
      artifact: 500
    },
    
    // 装备强化
    equipment_upgrade: {
      base_cost: 100,
      cost_factor: 1.6,
      success_rate: {
        base: 0.8,
        per_level: -0.05,
        min: 0.3
      },
      failure_protection: 5,  // 失败5次必成功
      refund_ratio: 0.5        // 返还50%材料
    },
    
    // 洞府升级
    building_upgrade: {
      base_cost_multiplier: 1.5,  // 提升基础成本
      cost_factor: 2.0,           // 更陡峭的增长
      max_level: 15
    },
    
    // 弟子招募
    disciple_recruit: {
      base_cost_multiplier: 1.3,
      cost_factor: 1.8,
      max_count_multiplier: 1    // 可招募数量倍数
    },
    
    // 灵气精炼 (持续消耗)
    refinement: {
      cost: 50,
      spirit_per_refine: 5,
      daily_limit: 50,
      efficiency_levels: 10
    },
    
    // 功法进阶
    technique_advance: {
      base_cost: 800,
      cost_factor: 2.5,
      max_tier: 3,
      bonus_per_tier: 0.35       // 每阶+35%
    },
    
    // 灵兽进化
    beast_evolution: {
      base_cost: 500,
      cost_factor: 3.0,
      max_evolution: 5,
      stat_bonus_per_evo: 0.4    // 每次进化+40%
    },
    
    // 宗门系统
    sect: {
      create_cost: 10000,
      upgrade_cost_factor: 2.5,
      donation_tiers: [
        { cost: 100, contribution: 10 },
        { cost: 500, contribution: 60 },
        { cost: 2000, contribution: 300 },
        { cost: 10000, contribution: 2000 }
      ]
    }
  },
  
  // ==================== 功法系统 ====================
  technique: {
    // 基础加成
    base_bonus: {
      cultivation: 1.0,
      combat: 1.0,
      defense: 1.0,
      auxiliary: 1.0
    },
    
    // 成长曲线
    growth: {
      // 每级加成
      per_level: {
        cultivation: { spirit: 0.15 },
        combat: { atk: 0.12 },
        defense: { def: 0.12 },
        auxiliary: { stone: 0.1, exp: 0.1 }
      },
      
      // 阶位加成 (需要进阶)
      tier_bonus: 0.35
    },
    
    // 进阶需求
    advance_req: {
      realm_level: 3,           // 需要金丹期
      technique_points: 5,      // 需要5点功法点
      cost: 800                  // 需要灵石
    },
    
    // 最高等级
    max_level: 10,
    
    // 功法点获取
    points: {
      per_level: 1,
      interval: 5
    }
  },
  
  // ==================== 灵兽系统 ====================
  beast: {
    // 基础属性
    base_stats: {
      hp: 50,
      atk: 10,
      def: 5,
      spirit: 5
    },
    
    // 成长
    growth: {
      per_level: {
        hp: 15,
        atk: 3,
        def: 2,
        spirit: 2
      },
      per_evolution: 0.4        // 进化+40%
    },
    
    // 协同加成 (给玩家)
    synergy: {
      atk: 0.002,               // 灵兽攻击*0.2% = 玩家攻击
      def: 0.001,
      hp: 0.0005,
      spirit: 0.001
    },
    
    // 进化消耗
    evolution: {
      cost: (evo) => Math.floor(500 * Math.pow(3.0, evo)),
      materials: {
        beast_core: 3,
        spirit_stone: 1000
      }
    },
    
    // 捕获
    capture: {
      base_cost: 200,
      success_rate: 0.3,
      realm_modifier: 0.02
    }
  },
  
  // ==================== 战斗系统 ====================
  combat: {
    // 玩家属性
    player: {
      crit_rate: 0.1,
      crit_damage: 1.5,
      dodge_rate: 0.05,
      block_rate: 0.1
    },
    
    // 伤害公式
    damage: {
      // 基础公式: max(1, atk * (1 - def_ratio) * random(0.9, 1.1))
      def_ratio_cap: 0.8,       // 防御最多减免80%
      elemental_bonus: 1.5,      // 属性克制
      realm_bonus: 0.1          // 境界压制/境界差*10%
    },
    
    // 掉落
    drop: {
      base_stones: (monster_stones) => Math.floor(monster_stones * 0.8),
      max_stones: (monster_stones) => Math.floor(monster_stones * 1.5),
      exp_multiplier: 1.0,
      rare_drop_rate: 0.01
    }
  },
  
  // ==================== 副本系统 ====================
  dungeon: {
    // 波次奖励递增
    wave_bonus: {
      exp: 1.15,                // 每波+15%
      stones: 1.12
    },
    
    // 难度系数
    difficulty: {
      easy: 1.0,
      normal: 1.5,
      hard: 2.5,
      nightmare: 5.0
    },
    
    // 扫荡 (后期功能)
    sweep: {
      require_realm: 5,         // 化神期开启
      cost: 100,
      multiplier: 0.8          // 80%收益
    }
  },
  
  // ==================== 抽卡/保底系统 ====================
  gacha: {
    // 单抽
    single: {
      cost: 100,
      base_rate: {
        common: 0.6,
        rare: 0.3,
        epic: 0.09,
        legendary: 0.01
      }
    },
    
    // 十连
    multi: {
      cost: 900,                // 9折
      guarantee: 'rare',        // 保底稀有
      guarantee_rate: 0.15      // 保底15%
    },
    
    // 保底
    pity: {
      common: 50,               // 50抽保底
      rare: 100,
      epic: 200,
      legendary: 500
    },
    
    // 分解
    dust_per_rarity: {
      common: 10,
      rare: 50,
      epic: 200,
      legendary: 1000
    }
  },
  
  // ==================== 资源循环 ====================
  resource_loop: {
    // 上古资源 (高阶货币)
    ancient_coin: {
      gain: {
        dungeon: 1,
        boss: 5,
        trade: 10
      },
      cost: {
        technique_advance: 10,
        beast_evolution: 20,
        equipment_enhance: 5
      }
    },
    
    // 贡献点 (宗门)
    contribution: {
      daily_cap: 1000,
      cost_factor: 1.5
    },
    
    // 感悟点数 (突破)
    insight: {
      max_storage: 100,
      usage: 'realm_break_boost'
    }
  },
  
  // ==================== 挂机/离线 ====================
  idle: {
    tick_rate: 1000,
    offline_max: 86400,
    offline_efficiency: 0.5,
    auto_save: 30000
  }
};

// ==================== 境界数据 (新版) ====================
const REALM_DATA_V3 = {
  '凡人': {
    name: '凡人',
    level: 0,
    cultivation_req: 0,
    spirit_base: 20,
    spirit_rate: 0.5,
    hp_base: 50,
    atk_base: 5,
    def_base: 0,
    realm_bonus: 1.0,
    desc: '刚刚踏入修仙之路的凡人'
  },
  '练气期': {
    name: '练气期',
    level: 1,
    cultivation_req: 80 * Math.pow(3.2, 1),     // 约256
    spirit_base: 40,
    spirit_rate: 1,
    hp_base: 80,
    atk_base: 10,
    def_base: 2,
    realm_bonus: 1.1,
    desc: '吸纳灵气入体，初步感应天地'
  },
  '筑基期': {
    name: '筑基期',
    level: 2,
    cultivation_req: 80 * Math.pow(3.2, 2),     // 约819
    spirit_base: 100,
    spirit_rate: 3,
    hp_base: 150,
    atk_base: 25,
    def_base: 8,
    realm_bonus: 1.25,
    desc: '灵气化液，筑就仙道根基'
  },
  '金丹期': {
    name: '金丹期',
    level: 3,
    cultivation_req: 80 * Math.pow(3.2, 3),     // 约2620
    spirit_base: 250,
    spirit_rate: 8,
    hp_base: 350,
    atk_base: 60,
    def_base: 20,
    realm_bonus: 1.5,
    desc: '金丹凝聚，法力大增'
  },
  '元婴期': {
    name: '元婴期',
    level: 4,
    cultivation_req: 80 * Math.pow(3.2, 4),     // 约8385
    spirit_base: 600,
    spirit_rate: 20,
    hp_base: 800,
    atk_base: 150,
    def_base: 50,
    realm_bonus: 1.8,
    desc: '元婴出窍，神通广大'
  },
  '化神期': {
    name: '化神期',
    level: 5,
    cultivation_req: 80 * Math.pow(3.2, 5),     // 约26831
    spirit_base: 1500,
    spirit_rate: 50,
    hp_base: 2000,
    atk_base: 400,
    def_base: 120,
    realm_bonus: 2.2,
    desc: '化神返虚，已非凡人'
  },
  '炼虚期': {
    name: '炼虚期',
    level: 6,
    cultivation_req: 80 * Math.pow(3.2, 6),     // 约85859
    spirit_base: 4000,
    spirit_rate: 130,
    hp_base: 5000,
    atk_base: 1000,
    def_base: 300,
    realm_bonus: 2.7,
    desc: '炼虚合道，虚实转换'
  },
  '合体期': {
    name: '合体期',
    level: 7,
    cultivation_req: 80 * Math.pow(3.2, 7),     // 约274748
    spirit_base: 10000,
    spirit_rate: 350,
    hp_base: 12000,
    atk_base: 2500,
    def_base: 750,
    realm_bonus: 3.3,
    desc: '天人合一，法力无边'
  },
  '大乘期': {
    name: '大乘期',
    level: 8,
    cultivation_req: 80 * Math.pow(3.2, 8),     // 约879193
    spirit_base: 25000,
    spirit_rate: 900,
    hp_base: 30000,
    atk_base: 6000,
    def_base: 1800,
    realm_bonus: 4.0,
    desc: '大乘境界，半仙之体'
  },
  '渡劫期': {
    name: '渡劫期',
    level: 9,
    cultivation_req: 80 * Math.pow(3.2, 9),     // 约2813418
    spirit_base: 60000,
    spirit_rate: 2300,
    hp_base: 70000,
    atk_base: 15000,
    def_base: 4500,
    realm_bonus: 5.0,
    desc: '雷劫降至，飞升在即'
  },
  '仙人': {
    name: '仙人',
    level: 10,
    cultivation_req: 0,
    spirit_base: 150000,
    spirit_rate: 6000,
    hp_base: 200000,
    atk_base: 40000,
    def_base: 12000,
    realm_bonus: 8.0,
    desc: '渡过天劫，得道成仙'
  }
};

// ==================== 导出 ====================
window.BALANCE_V3 = BALANCE_V3;
window.REALM_DATA_V3 = REALM_DATA_V3;

// 兼容旧版本
window.BALANCE = {
  ...BALANCE_V3,
  REALM_DATA: REALM_DATA_V3
};
// 浏览器端使用
if (typeof window !== 'undefined') { window.balance_v3 = {}; }
