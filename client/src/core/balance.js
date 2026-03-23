/**
 * 挂机修仙 - 核心数值系统
 * 数值设计 v2.0
 */

// ==================== 境界系统 ====================
const REALM_DATA = {
  // 境界ID -> 境界数据
  '凡人': {
    name: '凡人',
    level: 0,
    cultivation_req: 0,        // 突破所需灵气
    spirit_base: 10,          // 基础灵气上限
    spirit_rate: 1,           // 基础灵气速率
    hp_base: 50,             // 基础生命值
    atk_base: 5,             // 基础攻击力
    def_base: 0,             // 基础防御力
    realm_bonus: 1.0,        // 境界加成
    desc: '刚刚踏入修仙之路的凡人'
  },
  '练气期': {
    name: '练气期',
    level: 1,
    cultivation_req: 100,
    spirit_base: 50,
    spirit_rate: 3,
    hp_base: 100,
    atk_base: 12,
    def_base: 3,
    realm_bonus: 1.5,
    desc: '吸纳灵气入体，初步感应天地'
  },
  '筑基期': {
    name: '筑基期',
    level: 2,
    cultivation_req: 1000,
    spirit_base: 200,
    spirit_rate: 8,
    hp_base: 250,
    atk_base: 30,
    def_base: 10,
    realm_bonus: 2.0,
    desc: '灵气化液，筑就仙道根基'
  },
  '金丹期': {
    name: '金丹期',
    level: 3,
    cultivation_req: 10000,
    spirit_base: 800,
    spirit_rate: 25,
    hp_base: 600,
    atk_base: 80,
    def_base: 25,
    realm_bonus: 2.5,
    desc: '金丹凝聚，法力大增'
  },
  '元婴期': {
    name: '元婴期',
    level: 4,
    cultivation_req: 50000,
    spirit_base: 3000,
    spirit_rate: 80,
    hp_base: 1500,
    atk_base: 200,
    def_base: 60,
    realm_bonus: 3.0,
    desc: '元婴出窍，神通广大'
  },
  '化神期': {
    name: '化神期',
    level: 5,
    cultivation_req: 200000,
    spirit_base: 12000,
    spirit_rate: 250,
    hp_base: 4000,
    atk_base: 500,
    def_base: 150,
    realm_bonus: 3.5,
    desc: '化神返虚，已非凡人'
  },
  '炼虚期': {
    name: '炼虚期',
    level: 6,
    cultivation_req: 1000000,
    spirit_base: 50000,
    spirit_rate: 800,
    hp_base: 10000,
    atk_base: 1200,
    def_base: 400,
    realm_bonus: 4.0,
    desc: '炼虚合道，虚实转换'
  },
  '合体期': {
    name: '合体期',
    level: 7,
    cultivation_req: 5000000,
    spirit_base: 200000,
    spirit_rate: 2500,
    hp_base: 25000,
    atk_base: 3000,
    def_base: 1000,
    realm_bonus: 4.5,
    desc: '天人合一，法力无边'
  },
  '大乘期': {
    name: '大乘期',
    level: 8,
    cultivation_req: 20000000,
    spirit_base: 800000,
    spirit_rate: 8000,
    hp_base: 60000,
    atk_base: 8000,
    def_base: 2500,
    realm_bonus: 5.0,
    desc: '大乘境界，半仙之体'
  },
  '渡劫期': {
    name: '渡劫期',
    level: 9,
    cultivation_req: 100000000,
    spirit_base: 3000000,
    spirit_rate: 25000,
    hp_base: 150000,
    atk_base: 20000,
    def_base: 6000,
    realm_bonus: 6.0,
    desc: '雷劫降至，飞升在即'
  },
  '仙人': {
    name: '仙人',
    level: 10,
    cultivation_req: 0,
    spirit_base: 10000000,
    spirit_rate: 100000,
    hp_base: 500000,
    atk_base: 100000,
    def_base: 20000,
    realm_bonus: 10.0,
    desc: '渡过天劫，得道成仙'
  }
};

// ==================== 等级系统 ====================
const LEVEL_DATA = {
  // 等级 -> 经验需求
  exp_curve: (level) => Math.floor(100 * Math.pow(1.5, level - 1)),
  
  // 等级 -> 属性成长
  hp_growth: (level) => Math.floor(10 * Math.pow(1.1, level - 1)),
  atk_growth: (level) => Math.floor(2 * Math.pow(1.08, level - 1)),
  def_growth: (level) => Math.floor(1 * Math.pow(1.08, level - 1)),
  
  // 每级获得的属性点
  attribute_points_per_level: 2,
  
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
      'meditate': { name: '静坐冥想', desc: '静心凝神，效率倍增', cost: 50, spirit_bonus: 1.3, realm_req: 1 },
      'absorb': { name: '吸纳天地', desc: '引气入体，事半功倍', cost: 200, spirit_bonus: 1.6, realm_req: 2 },
      'star_mind': { name: '星云心法', desc: '观想星辰，以星力淬体', cost: 800, spirit_bonus: 2.0, realm_req: 3 },
      'cosmos': { name: '星辰变', desc: '与天地宇宙共鸣', cost: 2000, spirit_bonus: 2.5, realm_req: 4 },
      'void': { name: '虚空抽取', desc: '抽取虚空之力', cost: 8000, spirit_bonus: 3.0, realm_req: 6 },
      'immortal': { name: '仙灵诀', desc: '仙人之法', cost: 30000, spirit_bonus: 4.0, realm_req: 8 }
    }
  },
  
  // 战斗功法
  combat: {
    name: '战斗功法',
    effects: {
      'strike': { name: '基础拳法', desc: '最基本的战斗招式', cost: 0, atk_bonus: 1.0, realm_req: 0 },
      'sword': { name: '御剑术', desc: '以神御剑，例无虚发', cost: 100, atk_bonus: 1.4, realm_req: 2 },
      'palm': { name: '碎玉掌', desc: '掌碎玉石，刚猛无匹', cost: 400, atk_bonus: 1.8, realm_req: 3 },
      'fist': { name: '金刚拳', desc: '金刚之力，无坚不摧', cost: 1000, atk_bonus: 2.2, realm_req: 4 },
      'thunder': { name: '奔雷拳', desc: '雷霆万钧，势若奔雷', cost: 3000, atk_bonus: 2.8, realm_req: 5 },
      'dragon': { name: '降龙劲', desc: '降龙伏虎之力', cost: 10000, atk_bonus: 3.5, realm_req: 7 },
      'void_strike': { name: '虚空指', desc: '破碎虚空', cost: 40000, atk_bonus: 4.5, realm_req: 9 }
    }
  },
  
  // 防御功法
  defense: {
    name: '防御功法',
    effects: {
      'guard': { name: '基础护体', desc: '最基本的防护', cost: 0, def_bonus: 1.0, realm_req: 0 },
      'shield': { name: '灵气护盾', desc: '凝聚灵气为盾', cost: 80, def_bonus: 1.3, realm_req: 1 },
      'armor': { name: '金刚罩', desc: '佛门金身，不坏之体', cost: 300, def_bonus: 1.7, realm_req: 3 },
      'barrier': { name: '天地屏障', desc: '借天地之力防护', cost: 800, def_bonus: 2.2, realm_req: 4 },
      'domain': { name: '领域护体', desc: '法则领域，万法不侵', cost: 2500, def_bonus: 2.8, realm_req: 6 },
      'immortal_body': { name: '不死之身', desc: '仙人之体', cost: 15000, def_bonus: 3.5, realm_req: 8 }
    }
  },
  
  // 辅助功法
  auxiliary: {
    name: '辅助功法',
    effects: {
      'luck': { name: '好运来', desc: '增加灵石掉落', cost: 100, stone_bonus: 1.3, realm_req: 1 },
      'insight': { name: '悟道', desc: '加深悟性，经验加成', cost: 200, exp_bonus: 1.4, realm_req: 2 },
      'spirit_eye': { name: '灵眼', desc: '发现更多机缘', cost: 500, chance_bonus: 1.5, realm_req: 3 },
      'treasure_sense': { name: '寻宝术', desc: '大幅增加掉落', cost: 1500, stone_bonus: 1.8, exp_bonus: 1.3, realm_req: 5 },
      'enlightenment': { name: '大彻大悟', desc: '圣人之资', cost: 5000, exp_bonus: 2.0, realm_req: 7 }
    }
  }
};

// ==================== 建筑系统 ====================
const BUILDING_DATA = {
  '聚灵阵': {
    name: '聚灵阵',
    desc: '聚集天地灵气，提升修炼速度',
    max_level: 10,
    base_cost: 50,
    cost_factor: 2.0,
    effects: [
      { type: 'spirit_rate', value: 0.15, per_level: true }
    ]
  },
  '灵田': {
    name: '灵田',
    desc: '种植灵草，产生灵石收益',
    max_level: 10,
    base_cost: 100,
    cost_factor: 2.2,
    effects: [
      { type: 'stone_rate', value: 2, per_level: true }
    ]
  },
  '炼丹房': {
    name: '炼丹房',
    desc: '炼制丹药，自动获得经验',
    max_level: 10,
    base_cost: 200,
    cost_factor: 2.5,
    effects: [
      { type: 'auto_exp', value: 1, per_level: true }
    ]
  },
  '炼器室': {
    name: '炼器室',
    desc: '炼制装备，有几率获得稀有材料',
    max_level: 10,
    base_cost: 400,
    cost_factor: 2.8,
    effects: [
      { type: 'material_rate', value: 0.5, per_level: true },
      { type: 'equipment_chance', value: 0.02, per_level: true }
    ]
  },
  '藏书阁': {
    name: '藏书阁',
    desc: '收藏功法典籍，提升功法效率',
    max_level: 10,
    base_cost: 800,
    cost_factor: 3.0,
    effects: [
      { type: 'technique_efficiency', value: 0.2, per_level: true }
    ]
  },
  '灵兽园': {
    name: '灵兽园',
    desc: '饲养灵兽，全面提升洞府产出',
    max_level: 10,
    base_cost: 1500,
    cost_factor: 3.5,
    effects: [
      { type: 'all_output', value: 0.15, per_level: true }
    ]
  },
  '演武场': {
    name: '演武场',
    desc: '弟子比武训练，提升战斗能力',
    max_level: 10,
    base_cost: 1200,
    cost_factor: 3.2,
    effects: [
      { type: 'battle_exp', value: 0.2, per_level: true }
    ]
  }
};

// ==================== 弟子系统 ====================
const DISCIPLE_DATA = {
  '外门弟子': {
    name: '外门弟子',
    desc: '负责日常事务',
    max_count: 10,
    base_cost: 30,
    cost_factor: 1.5,
    effect: { type: 'stone_bonus', value: 0.15 }
  },
  '内门弟子': {
    name: '内门弟子',
    desc: '协助修炼',
    max_count: 5,
    base_cost: 150,
    cost_factor: 1.8,
    effect: { type: 'spirit_bonus', value: 0.2 }
  },
  '核心弟子': {
    name: '核心弟子',
    desc: '核心战力',
    max_count: 3,
    base_cost: 600,
    cost_factor: 2.0,
    effect: { type: 'exp_bonus', value: 0.25 }
  },
  '长老': {
    name: '长老',
    desc: '一宗支柱',
    max_count: 1,
    base_cost: 3000,
    cost_factor: 2.5,
    effect: { type: 'all_bonus', value: 0.3 }
  },
  '护法': {
    name: '护法',
    desc: '守护宗门',
    max_count: 2,
    base_cost: 2000,
    cost_factor: 2.2,
    effect: { type: 'defense_bonus', value: 0.25 }
  }
};

// ==================== 怪物系统 ====================
const MONSTER_DATA = {
  // 区域ID -> 怪物列表
  'forest': {
    name: '迷雾森林',
    min_realm: 0,
    monsters: [
      { id: 'slime', name: '史莱姆', hp: 30, atk: 3, def: 0, exp: 5, stones: 3, loot: [] },
      { id: 'rabbit', name: '灵兔', hp: 40, atk: 5, def: 1, exp: 8, stones: 5, loot: [] },
      { id: 'wolf', name: '野狼', hp: 60, atk: 8, def: 2, exp: 15, stones: 8, loot: [] }
    ]
  },
  'mountain': {
    name: '灵山',
    min_realm: 2,
    monsters: [
      { id: 'snake', name: '毒蛇', hp: 100, atk: 15, def: 3, exp: 30, stones: 15, loot: [] },
      { id: 'bear', name: '棕熊', hp: 150, atk: 25, def: 8, exp: 50, stones: 25, loot: [] },
      { id: 'tiger', name: '猛虎', hp: 200, atk: 40, def: 10, exp: 80, stones: 40, loot: [] }
    ]
  },
  'cave': {
    name: '幽暗洞穴',
    min_realm: 4,
    monsters: [
      { id: 'ghost', name: '游魂', hp: 300, atk: 60, def: 5, exp: 120, stones: 60, loot: [] },
      { id: 'skeleton', name: '骷髅', hp: 400, atk: 80, def: 15, exp: 180, stones: 90, loot: [] },
      { id: 'zombie', name: '僵尸', hp: 500, atk: 100, def: 20, exp: 250, stones: 120, loot: [] }
    ]
  },
  'demon_mountain': {
    name: '魔山',
    min_realm: 6,
    monsters: [
      { id: 'demon', name: '妖魔', hp: 1000, atk: 200, def: 40, exp: 500, stones: 300, loot: [] },
      { id: 'fiend', name: '魔兽', hp: 1500, atk: 300, def: 60, exp: 800, stones: 500, loot: [] },
      { id: 'demon_lord', name: '魔王', hp: 3000, atk: 500, def: 100, exp: 2000, stones: 1500, loot: [] }
    ]
  },
  'dragon_lake': {
    name: '蛟龙湖',
    min_realm: 8,
    monsters: [
      { id: 'dragon_spirit', name: '龙魂', hp: 5000, atk: 800, def: 200, exp: 5000, stones: 3000, loot: [] },
      { id: 'young_dragon', name: '幼龙', hp: 10000, atk: 1500, def: 400, exp: 10000, stones: 8000, loot: [] },
      { id: 'true_dragon', name: '真龙', hp: 30000, atk: 5000, def: 1000, exp: 50000, stones: 50000, loot: [] }
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
    rewards: { exp: 100, stones: 50 }
  },
  'spirit_mountain': {
    name: '灵气之山',
    desc: '灵气充裕的山脉',
    min_realm: 2,
    waves: 5,
    difficulty: 2,
    monster_pool: ['snake', 'bear', 'tiger'],
    rewards: { exp: 500, stones: 300 }
  },
  'demon_seal': {
    name: '封印之地',
    desc: '封印妖魔的遗迹',
    min_realm: 5,
    waves: 7,
    difficulty: 3,
    monster_pool: ['ghost', 'skeleton', 'zombie', 'demon'],
    rewards: { exp: 2000, stones: 1500 }
  },
  'immortal_trial': {
    name: '仙人试炼',
    desc: '成仙前的最终考验',
    min_realm: 8,
    waves: 10,
    difficulty: 5,
    monster_pool: ['demon', 'fiend', 'demon_lord', 'dragon_spirit', 'young_dragon'],
    rewards: { exp: 50000, stones: 30000 }
  }
};

// ==================== 掉落系统 ====================
const LOOT_DATA = {
  // 掉落概率表
  drop_rates: {
    nothing: 0.4,      // 40% 什么都不掉
    stones: 0.4,       // 40% 掉落灵石
    material: 0.15,   // 15% 掉落材料
    equipment: 0.04,   // 4% 掉落装备
    treasure: 0.01     // 1% 掉落珍宝
  },
  
  // 灵石掉落范围
  stone_range: {
    min: (monster_stones) => Math.floor(monster_stones * 0.8),
    max: (monster_stones) => Math.floor(monster_stones * 1.5)
  }
};

// ==================== 全局数值配置 ====================
const GAME_BALANCE = {
  // 挂机设置
  idle: {
    tick_rate: 1000,           // tick间隔(ms)
    offline_max_time: 86400,   // 离线最大时间(秒) = 24小时
    offline_efficiency: 0.5,   // 离线收益比例
    auto_save_interval: 30000  // 自动存档间隔
  },
  
  // 战斗设置
  combat: {
    player_crit_rate: 0.1,    // 暴击率
    player_crit_damage: 1.5,  // 暴击伤害倍率
    monster_crit_rate: 0.05,  // 怪物暴击率
    flee_success_rate: 0.7    // 逃跑成功率
  },
  
  // 经济设置
  economy: {
    stone_buy_value: 1,       // 灵石购买价值
    herb_value: 2,             // 草药价值
    pill_value: 10,            // 丹药价值
    material_value: 5,         // 材料价值
    equipment_value: 50         // 装备价值
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
