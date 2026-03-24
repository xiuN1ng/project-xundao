/**
 * 挂机修仙 - 核心数值系统
 * 数值设计 v2.0
 */

// ==================== 境界系统 ====================
const REALM_DATA = {
  // 境界ID -> 境界数据
  // 数值调整说明：优化前期节奏，降低突破消耗增长速度，使前期更充实
  '凡人': {
    name: '凡人',
    level: 0,
    cultivation_req: 0,        // 突破所需灵气
    spirit_base: 50,          // 基础灵气上限
    spirit_rate: 5,           // 基础灵气速率
    hp_base: 100,             // 基础生命值
    atk_base: 10,             // 基础攻击力
    def_base: 2,              // 基础防御力
    realm_bonus: 1.0,        // 境界加成
    desc: '刚刚踏入修仙之路的凡人'
  },
  '练气期': {
    name: '练气期',
    level: 1,
    cultivation_req: 100,      // 降低：50 -> 100（更容易突破）
    spirit_base: 100,          // 提升基础灵气
    spirit_rate: 10,           // 提升灵气速率
    hp_base: 150,
    atk_base: 20,
    def_base: 5,
    realm_bonus: 1.2,
    desc: '吸纳灵气入体，初步感应天地'
  },
  '筑基期': {
    name: '筑基期',
    level: 2,
    cultivation_req: 500,      // 保持不变
    spirit_base: 300,
    spirit_rate: 25,
    hp_base: 350,
    atk_base: 45,
    def_base: 15,
    realm_bonus: 1.5,
    desc: '灵气化液，筑就仙道根基'
  },
  '金丹期': {
    name: '金丹期',
    level: 3,
    cultivation_req: 3000,     // 降低：5000 -> 3000
    spirit_base: 1000,
    spirit_rate: 60,
    hp_base: 800,
    atk_base: 120,
    def_base: 40,
    realm_bonus: 2.0,
    desc: '金丹凝聚，法力大增'
  },
  '元婴期': {
    name: '元婴期',
    level: 4,
    cultivation_req: 15000,   // 降低：20000 -> 15000
    spirit_base: 4000,
    spirit_rate: 150,
    hp_base: 2000,
    atk_base: 300,
    def_base: 100,
    realm_bonus: 2.5,
    desc: '元婴出窍，神通广大'
  },
  '化神期': {
    name: '化神期',
    level: 5,
    cultivation_req: 60000,    // 降低：80000 -> 60000
    spirit_base: 15000,
    spirit_rate: 400,
    hp_base: 5000,
    atk_base: 700,
    def_base: 250,
    realm_bonus: 3.0,
    desc: '化神返虚，已非凡人'
  },
  '炼虚期': {
    name: '炼虚期',
    level: 6,
    cultivation_req: 250000,   // 降低：300000 -> 250000
    spirit_base: 60000,
    spirit_rate: 1000,
    hp_base: 12000,
    atk_base: 1600,
    def_base: 500,
    realm_bonus: 3.5,
    desc: '炼虚合道，虚实转换'
  },
  '合体期': {
    name: '合体期',
    level: 7,
    cultivation_req: 800000,   // 降低：1000000 -> 800000
    spirit_base: 250000,
    spirit_rate: 3000,
    hp_base: 30000,
    atk_base: 4000,
    def_base: 1200,
    realm_bonus: 4.0,
    desc: '天人合一，法力无边'
  },
  '大乘期': {
    name: '大乘期',
    level: 8,
    cultivation_req: 3000000,  // 降低：5000000 -> 3000000
    spirit_base: 1000000,
    spirit_rate: 10000,
    hp_base: 80000,
    atk_base: 12000,
    def_base: 4000,
    realm_bonus: 4.5,
    desc: '大乘境界，半仙之体'
  },
  '渡劫期': {
    name: '渡劫期',
    level: 9,
    cultivation_req: 15000000, // 降低：20000000 -> 15000000
    spirit_base: 5000000,
    spirit_rate: 30000,
    hp_base: 200000,
    atk_base: 30000,
    def_base: 10000,
    realm_bonus: 5.0,
    desc: '雷劫降至，飞升在即'
  },
  '仙人': {
    name: '仙人',
    level: 10,
    cultivation_req: 0,
    spirit_base: 15000000,
    spirit_rate: 100000,
    hp_base: 600000,
    atk_base: 150000,
    def_base: 30000,
    realm_bonus: 8.0,
    desc: '渡过天劫，得道成仙'
  }
};

// ==================== 等级系统 ====================
const LEVEL_DATA = {
  // 等级 -> 经验需求（前期更平滑）
  exp_curve: (level) => Math.floor(50 * Math.pow(1.2, level - 1)),
  
  // 等级 -> 属性成长（前期成长更快）
  hp_growth: (level) => Math.floor(15 * Math.pow(1.07, level - 1)),
  atk_growth: (level) => Math.floor(3 * Math.pow(1.05, level - 1)),
  def_growth: (level) => Math.floor(2 * Math.pow(1.05, level - 1)),
  
  // 新增：灵气成长函数
  spirit_growth: (level) => Math.floor(10 * Math.pow(1.08, level - 1)),
  
  // 每级获得的属性点
  attribute_points_per_level: 3,  // 提升：2 -> 3
  
  // 每5级获得功法点
  technique_points_interval: 5
};

// ==================== 功法系统 ====================
const TECHNIQUE_DATA = {
  // 灵气修炼功法
  cultivation: {
    name: '灵气修炼',
    effects: {
      'breath': { name: '呼吸吐纳', desc: '最基础的修炼法门', cost: 0, spirit_bonus: 1.0, realm_req: 0 },
      'meditate': { name: '静坐冥想', desc: '静心凝神，效率倍增', cost: 30, spirit_bonus: 1.3, realm_req: 1 },  // 降低cost (50→30)
      'absorb': { name: '吸纳天地', desc: '引气入体，事半功倍', cost: 100, spirit_bonus: 1.6, realm_req: 2 },   // 降低cost (200→100)
      'star_mind': { name: '星云心法', desc: '观想星辰，以星力淬体', cost: 400, spirit_bonus: 2.0, realm_req: 3 }, // 降低cost (800→400)
      'cosmos': { name: '星辰变', desc: '与天地宇宙共鸣', cost: 1200, spirit_bonus: 2.5, realm_req: 4 },  // 降低cost (2000→1200)
      'void': { name: '虚空抽取', desc: '抽取虚空之力', cost: 5000, spirit_bonus: 3.0, realm_req: 6 },  // 降低cost (8000→5000)
      'immortal': { name: '仙灵诀', desc: '仙人之法', cost: 20000, spirit_bonus: 4.0, realm_req: 8 }  // 降低cost (30000→20000)
    }
  },
  
  // 战斗功法
  combat: {
    name: '战斗功法',
    effects: {
      'strike': { name: '基础拳法', desc: '最基本的战斗招式', cost: 0, atk_bonus: 1.0, realm_req: 0 },
      'sword': { name: '御剑术', desc: '以神御剑，例无虚发', cost: 60, atk_bonus: 1.4, realm_req: 2 },   // 降低cost (100→60)
      'palm': { name: '碎玉掌', desc: '掌碎玉石，刚猛无匹', cost: 200, atk_bonus: 1.8, realm_req: 3 },   // 降低cost (400→200)
      'fist': { name: '金刚拳', desc: '金刚之力，无坚不摧', cost: 600, atk_bonus: 2.2, realm_req: 4 },   // 降低cost (1000→600)
      'thunder': { name: '奔雷拳', desc: '雷霆万钧，势若奔雷', cost: 1800, atk_bonus: 2.8, realm_req: 5 }, // 降低cost (3000→1800)
      'dragon': { name: '降龙劲', desc: '降龙伏虎之力', cost: 6000, atk_bonus: 3.5, realm_req: 7 },  // 降低cost (10000→6000)
      'void_strike': { name: '虚空指', desc: '破碎虚空', cost: 25000, atk_bonus: 4.5, realm_req: 9 }  // 降低cost (40000→25000)
    }
  },
  
  // 防御功法
  defense: {
    name: '防御功法',
    effects: {
      'guard': { name: '基础护体', desc: '最基本的防护', cost: 0, def_bonus: 1.0, realm_req: 0 },
      'shield': { name: '灵气护盾', desc: '凝聚灵气为盾', cost: 50, def_bonus: 1.3, realm_req: 1 },   // 降低cost (80→50)
      'armor': { name: '金刚罩', desc: '佛门金身，不坏之体', cost: 180, def_bonus: 1.7, realm_req: 3 }, // 降低cost (300→180)
      'barrier': { name: '天地屏障', desc: '借天地之力防护', cost: 500, def_bonus: 2.2, realm_req: 4 }, // 降低cost (800→500)
      'domain': { name: '领域护体', desc: '法则领域，万法不侵', cost: 1500, def_bonus: 2.8, realm_req: 6 }, // 降低cost (2500→1500)
      'immortal_body': { name: '不死之身', desc: '仙人之体', cost: 10000, def_bonus: 3.5, realm_req: 8 } // 降低cost (15000→10000)
    }
  },
  
  // 辅助功法
  auxiliary: {
    name: '辅助功法',
    effects: {
      'luck': { name: '好运来', desc: '增加灵石掉落', cost: 60, stone_bonus: 1.3, realm_req: 1 },  // 降低cost (100→60)
      'insight': { name: '悟道', desc: '加深悟性，经验加成', cost: 120, exp_bonus: 1.4, realm_req: 2 }, // 降低cost (200→120)
      'spirit_eye': { name: '灵眼', desc: '发现更多机缘', cost: 300, chance_bonus: 1.5, realm_req: 3 }, // 降低cost (500→300)
      'treasure_sense': { name: '寻宝术', desc: '大幅增加掉落', cost: 900, stone_bonus: 1.8, exp_bonus: 1.3, realm_req: 5 }, // 降低cost (1500→900)
      'enlightenment': { name: '大彻大悟', desc: '圣人之资', cost: 3000, exp_bonus: 2.0, realm_req: 7 } // 降低cost (5000→3000)
    }
  }
};

// ==================== 建筑系统 ====================
const BUILDING_DATA = {
  '聚灵阵': {
    name: '聚灵阵',
    desc: '聚集天地灵气，提升修炼速度',
    max_level: 10,
    base_cost: 30,           // 降低：50 -> 30
    cost_factor: 1.8,        // 降低：2.0 -> 1.8
    effects: [
      { type: 'spirit_rate', value: 0.2, per_level: true }  // 提升：0.15 -> 0.2
    ]
  },
  '灵田': {
    name: '灵田',
    desc: '种植灵草，产生灵石收益',
    max_level: 10,
    base_cost: 50,          // 降低：100 -> 50
    cost_factor: 1.8,        // 降低：2.2 -> 1.8
    effects: [
      { type: 'stone_rate', value: 3, per_level: true }  // 提升：2 -> 3
    ]
  },
  '炼丹房': {
    name: '炼丹房',
    desc: '炼制丹药，自动获得经验',
    max_level: 10,
    base_cost: 100,         // 降低：200 -> 100
    cost_factor: 2.0,       // 降低：2.5 -> 2.0
    effects: [
      { type: 'auto_exp', value: 2, per_level: true }  // 提升：1 -> 2
    ]
  },
  '炼器室': {
    name: '炼器室',
    desc: '炼制装备，有几率获得稀有材料',
    max_level: 10,
    base_cost: 200,         // 降低：400 -> 200
    cost_factor: 2.2,       // 降低：2.8 -> 2.2
    effects: [
      { type: 'material_rate', value: 0.8, per_level: true },  // 提升：0.5 -> 0.8
      { type: 'equipment_chance', value: 0.03, per_level: true }  // 提升：0.02 -> 0.03
    ]
  },
  '藏书阁': {
    name: '藏书阁',
    desc: '收藏功法典籍，提升功法效率',
    max_level: 10,
    base_cost: 400,         // 降低：800 -> 400
    cost_factor: 2.5,       // 降低：3.0 -> 2.5
    effects: [
      { type: 'technique_efficiency', value: 0.25, per_level: true }  // 提升：0.2 -> 0.25
    ]
  },
  '灵兽园': {
    name: '灵兽园',
    desc: '饲养灵兽，全面提升洞府产出',
    max_level: 10,
    base_cost: 800,         // 降低：1500 -> 800
    cost_factor: 2.8,       // 降低：3.5 -> 2.8
    effects: [
      { type: 'all_output', value: 0.2, per_level: true }  // 提升：0.15 -> 0.2
    ]
  },
  '演武场': {
    name: '演武场',
    desc: '弟子比武训练，提升战斗能力',
    max_level: 10,
    base_cost: 600,         // 降低：1200 -> 600
    cost_factor: 2.6,       // 降低：3.2 -> 2.6
    effects: [
      { type: 'battle_exp', value: 0.25, per_level: true }  // 提升：0.2 -> 0.25
    ]
  }
};

// ==================== 弟子系统 ====================
const DISCIPLE_DATA = {
  '外门弟子': {
    name: '外门弟子',
    desc: '负责日常事务',
    max_count: 10,
    base_cost: 20,           // 降低（30→20）
    cost_factor: 1.5,        // 保持合理值
    effect: { type: 'stone_bonus', value: 0.15 }
  },
  '内门弟子': {
    name: '内门弟子',
    desc: '协助修炼',
    max_count: 5,
    base_cost: 100,          // 降低（150→100）
    cost_factor: 1.6,        // 降低（1.8→1.6）
    effect: { type: 'spirit_bonus', value: 0.2 }
  },
  '核心弟子': {
    name: '核心弟子',
    desc: '核心战力',
    max_count: 3,
    base_cost: 400,          // 降低（600→400）
    cost_factor: 1.8,        // 降低（2.0→1.8）
    effect: { type: 'exp_bonus', value: 0.25 }
  },
  '长老': {
    name: '长老',
    desc: '一宗支柱',
    max_count: 1,
    base_cost: 2000,         // 降低（3000→2000）
    cost_factor: 2.2,        // 降低（2.5→2.2）
    effect: { type: 'all_bonus', value: 0.3 }
  },
  '护法': {
    name: '护法',
    desc: '守护宗门',
    max_count: 2,
    base_cost: 1200,         // 降低（2000→1200）
    cost_factor: 2.0,        // 降低（2.2→2.0）
    effect: { type: 'defense_bonus', value: 0.25 }
  }
};

// ==================== 怪物系统 ====================
const MONSTER_DATA = {
  // 区域ID -> 怪物列表
  // 调整说明：优化前期怪物数值，提升灵石和经验收益
  'forest': {
    name: '迷雾森林',
    min_realm: 0,
    monsters: [
      // 前期怪物大幅削弱，让玩家更容易击败
      // stones 提升50%（战斗掉落+50%）
      { id: 'slime', name: '史莱姆', hp: 15, atk: 2, def: 0, exp: 5, stones: 8, loot: [] },
      { id: 'rabbit', name: '灵兔', hp: 25, atk: 3, def: 0, exp: 8, stones: 12, loot: [] },
      { id: 'wolf', name: '野狼', hp: 40, atk: 5, def: 1, exp: 15, stones: 18, loot: [] }
    ]
  },
  'mountain': {
    name: '灵山',
    min_realm: 1,  // 降低要求：2 -> 1
    monsters: [
      { id: 'snake', name: '毒蛇', hp: 60, atk: 8, def: 2, exp: 25, stones: 30, loot: [] },
      { id: 'bear', name: '棕熊', hp: 100, atk: 15, def: 4, exp: 45, stones: 53, loot: [] },
      { id: 'tiger', name: '猛虎', hp: 150, atk: 25, def: 6, exp: 70, stones: 75, loot: [] }
    ]
  },
  'cave': {
    name: '幽暗洞穴',
    min_realm: 3,  // 降低要求：4 -> 3
    monsters: [
      { id: 'ghost', name: '游魂', hp: 250, atk: 40, def: 5, exp: 100, stones: 120, loot: [] },
      { id: 'skeleton', name: '骷髅', hp: 350, atk: 60, def: 10, exp: 150, stones: 180, loot: [] },
      { id: 'zombie', name: '僵尸', hp: 450, atk: 80, def: 15, exp: 200, stones: 240, loot: [] }
    ]
  },
  'demon_mountain': {
    name: '魔山',
    min_realm: 5,  // 降低要求：6 -> 5
    monsters: [
      { id: 'demon', name: '妖魔', hp: 800, atk: 150, def: 30, exp: 400, stones: 450, loot: [] },
      { id: 'fiend', name: '魔兽', hp: 1200, atk: 250, def: 50, exp: 600, stones: 675, loot: [] },
      { id: 'demon_lord', name: '魔王', hp: 2500, atk: 400, def: 80, exp: 1500, stones: 1800, loot: [] }
    ]
  },
  'dragon_lake': {
    name: '蛟龙湖',
    min_realm: 7,  // 降低要求：8 -> 7
    monsters: [
      { id: 'dragon_spirit', name: '龙魂', hp: 4000, atk: 600, def: 150, exp: 4000, stones: 2500, loot: [] },
      { id: 'young_dragon', name: '幼龙', hp: 8000, atk: 1200, def: 300, exp: 8000, stones: 6000, loot: [] },
      { id: 'true_dragon', name: '真龙', hp: 25000, atk: 4000, def: 800, exp: 40000, stones: 40000, loot: [] }
    ]
  }
};

// ==================== 副本系统 ====================
const DUNGEON_DATA = {
  'trial_cave': {
    name: '试炼洞穴',
    desc: '新人试炼之地',
    min_realm: 0,
    waves: 3,
    difficulty: 1,
    monster_pool: ['slime', 'rabbit', 'wolf'],
    rewards: { exp: 150, stones: 100 }  // 提升：100/50 -> 150/100
  },
  'spirit_mountain': {
    name: '灵气之山',
    desc: '灵气充裕的山脉',
    min_realm: 1,  // 降低：2 -> 1
    waves: 5,
    difficulty: 2,
    monster_pool: ['snake', 'bear', 'tiger'],
    rewards: { exp: 600, stones: 400 }  // 提升：500/300 -> 600/400
  },
  'demon_seal': {
    name: '封印之地',
    desc: '封印妖魔的遗迹',
    min_realm: 4,  // 降低：5 -> 4
    waves: 7,
    difficulty: 3,
    monster_pool: ['ghost', 'skeleton', 'zombie', 'demon'],
    rewards: { exp: 2500, stones: 2000 }  // 提升：2000/1500 -> 2500/2000
  },
  'immortal_trial': {
    name: '仙人试炼',
    desc: '成仙前的最终考验',
    min_realm: 7,  // 降低：8 -> 7
    waves: 10,
    difficulty: 5,
    monster_pool: ['demon', 'fiend', 'demon_lord', 'dragon_spirit', 'young_dragon'],
    rewards: { exp: 60000, stones: 40000 }  // 提升：50000/30000 -> 60000/40000
  }
};

// ==================== 掉落系统 ====================
const LOOT_DATA = {
  // 掉落概率表（提升掉落率）
  drop_rates: {
    nothing: 0.3,       // 降低：0.4 -> 0.3（减少空掉落）
    stones: 0.45,      // 提升：0.4 -> 0.45
    material: 0.18,    // 提升：0.15 -> 0.18
    equipment: 0.06,  // 提升：0.04 -> 0.06
    treasure: 0.01    // 保持：0.01
  },
  
  // 灵石掉落范围（提升掉落数量）
  stone_range: {
    min: (monster_stones) => Math.floor(monster_stones * 1.0),  // 提升：0.8 -> 1.0
    max: (monster_stones) => Math.floor(monster_stones * 2.0)   // 提升：1.5 -> 2.0
  }
};

// ==================== 全局数值配置 ====================
const GAME_BALANCE = {
  // 挂机设置
  idle: {
    tick_rate: 1000,           // tick间隔(ms)
    offline_max_time: 86400,   // 离线最大时间(秒) = 24小时
    offline_efficiency: 0.6,   // 提升：0.5 -> 0.6（离线收益提升）
    auto_save_interval: 30000  // 自动存档间隔
  },
  
  // 战斗设置
  combat: {
    player_crit_rate: 0.15,    // 提升：0.1 -> 0.15（暴击率提升）
    player_crit_damage: 1.8,  // 提升：1.5 -> 1.8（暴击伤害提升）
    monster_crit_rate: 0.03,  // 降低：0.05 -> 0.03（怪物暴击率降低）
    flee_success_rate: 0.8    // 提升：0.7 -> 0.8（逃跑成功率提升）
  },
  
  // 经济设置
  economy: {
    stone_buy_value: 1,       // 灵石购买价值
    herb_value: 3,            // 提升：2 -> 3
    pill_value: 15,           // 提升：10 -> 15
    material_value: 8,         // 提升：5 -> 8
    equipment_value: 80         // 提升：50 -> 80
  }
};

// 导出数值配置
window.REALM_DATA = REALM_DATA;
window.LEVEL_DATA = LEVEL_DATA;
window.TECHNIQUE_DATA = TECHNIQUE_DATA;
window.BUILDING_DATA = BUILDING_DATA;
window.DISCIPLE_DATA = DISCIPLE_DATA;
window.MONSTER_DATA = MONSTER_DATA;
window.DUNGEON_DATA = DUNGEON_DATA;
window.LOOT_DATA = LOOT_DATA;
window.GAME_BALANCE = GAME_BALANCE;
// 浏览器端使用
if (typeof window !== 'undefined') { window.balance = {}; }
