/**
 * 挂机修仙 - 扩展系统
 * 装备、灵根、丹药、历练系统
 */

// ==================== 装备系统 ====================
const EQUIPMENT_DATA = {
  // 武器
  weapon: {
    '木剑': { name: '木剑', atk: 5, def: 0, rarity: 1, cost: 0, desc: '最基础的武器' },
    '铁剑': { name: '铁剑', atk: 15, def: 0, rarity: 2, cost: 50, desc: '精铁打造的剑' },
    '灵剑': { name: '灵剑', atk: 40, def: 5, rarity: 3, cost: 200, desc: '注入灵气的剑' },
    '仙剑': { name: '仙剑', atk: 100, def: 15, rarity: 4, cost: 1000, desc: '仙人所用的剑' },
    '天剑': { name: '天剑', atk: 300, def: 30, rarity: 5, cost: 5000, desc: '天界神兵' },
    '诛仙剑': { name: '诛仙剑', atk: 1000, def: 100, rarity: 6, cost: 50000, desc: '杀伐至宝' }
  },
  // 防具
  armor: {
    '布衣': { name: '布衣', atk: 0, def: 3, rarity: 1, cost: 0, desc: '普通衣物' },
    '皮甲': { name: '皮甲', atk: 0, def: 10, rarity: 2, cost: 30, desc: '兽皮制作的护甲' },
    '铁甲': { name: '铁甲', atk: 0, def: 25, rarity: 3, cost: 150, desc: '精铁护甲' },
    '灵甲': { name: '灵甲', atk: 5, def: 60, rarity: 4, cost: 800, desc: '灵气护甲' },
    '仙甲': { name: '仙甲', atk: 10, def: 200, rarity: 5, cost: 4000, desc: '仙人战甲' },
    '天甲': { name: '天甲', atk: 30, def: 500, rarity: 6, cost: 40000, desc: '天界神甲' }
  },
  // 饰品
  accessory: {
    '普通戒指': { name: '普通戒指', atk: 2, def: 2, rarity: 1, cost: 0, desc: '简单的戒指' },
    '灵石戒指': { name: '灵石戒指', atk: 5, def: 5, rarity: 2, cost: 40, desc: '可聚集灵石' },
    '灵识戒指': { name: '灵识戒指', atk: 15, def: 10, rarity: 3, cost: 180, desc: '提升灵识' },
    '仙玉戒指': { name: '仙玉戒指', atk: 40, def: 25, rarity: 4, cost: 1000, desc: '仙人佩戴' },
    '天晶戒指': { name: '天晶戒指', atk: 100, def: 60, rarity: 5, cost: 8000, desc: '天道结晶' }
  }
};

// 装备槽位
const EQUIP_SLOTS = ['weapon', 'armor', 'accessory'];

// ==================== 灵根系统 ====================
const SPIRIT_ROOT_DATA = {
  '五行杂灵根': {
    name: '五行杂灵根',
    desc: '五行驳杂，修炼速度较慢，但各类功法都能修炼',
    spirit_rate: 0.8,
    atk_bonus: 1.0,
    def_bonus: 1.0,
    special: '无',
    realm_req: 0
  },
  '火灵根': {
    name: '火灵根',
    desc: '主修火系功法，攻击力强大',
    spirit_rate: 1.2,
    atk_bonus: 1.3,
    def_bonus: 0.9,
    special: '火系功法额外+20%',
    realm_req: 0
  },
  '水灵根': {
    name: '水灵根',
    desc: '主修水系功法，防御出色',
    spirit_rate: 1.1,
    atk_bonus: 0.9,
    def_bonus: 1.3,
    special: '水系功法额外+20%',
    realm_req: 0
  },
  '木灵根': {
    name: '木灵根',
    desc: '主修木系功法，回复能力强',
    spirit_rate: 1.15,
    atk_bonus: 1.0,
    def_bonus: 1.1,
    special: '炼丹效率+30%',
    realm_req: 0
  },
  '金属性': {
    name: '金属性',
    desc: '主修金系功法，攻击锐利',
    spirit_rate: 1.1,
    atk_bonus: 1.25,
    def_bonus: 1.0,
    special: '武器强化成功率+20%',
    realm_req: 0
  },
  '土灵根': {
    name: '土灵根',
    desc: '主修土系功法，防御坚固',
    spirit_rate: 1.05,
    atk_bonus: 0.95,
    def_bonus: 1.35,
    special: '防具强化成功率+20%',
    realm_req: 0
  },
  '天灵根': {
    name: '天灵根',
    desc: '千年一遇的绝佳灵根',
    spirit_rate: 1.5,
    atk_bonus: 1.2,
    def_bonus: 1.2,
    special: '所有功法效率+15%',
    realm_req: 2
  },
  '混沌灵根': {
    name: '混沌灵根',
    desc: '传说中最强的灵根',
    spirit_rate: 2.0,
    atk_bonus: 1.5,
    def_bonus: 1.5,
    special: '全属性+30%',
    realm_req: 5
  }
};

// ==================== 丹药系统 ====================
const PILLS_DATA = {
  // 修炼类
  cultivation: {
    '灵气丹': { name: '灵气丹', effect: 'spirit', value: 50, cost: 20, cooldown: 60, desc: '立即获得灵气' },
    '大灵气丹': { name: '大灵气丹', effect: 'spirit', value: 200, cost: 80, cooldown: 120, desc: '大量灵气' },
    '聚气丹': { name: '聚气丹', effect: 'spirit_rate', value: 1.5, duration: 300, cost: 100, cooldown: 600, desc: '5分钟内修炼速度+50%' }
  },
  // 战斗类
  combat: {
    '疗伤丹': { name: '疗伤丹', effect: 'heal', value: 0.3, cost: 30, cooldown: 30, desc: '恢复30%HP' },
    '大还丹': { name: '大还丹', effect: 'heal', value: 0.8, cost: 100, cooldown: 60, desc: '恢复80%HP' },
    '神力丹': { name: '神力丹', effect: 'atk', value: 1.5, duration: 180, cost: 150, cooldown: 300, desc: '3分钟攻击力+50%' },
    '护体丹': { name: '护体丹', effect: 'def', value: 1.5, duration: 180, cost: 150, cooldown: 300, desc: '3分钟防御+50%' }
  },
  // 经验类
  exp: {
    '悟道茶': { name: '悟道茶', effect: 'exp', value: 2.0, duration: 600, cost: 200, cooldown: 3600, desc: '10分钟内经验+100%' },
    '经验丹': { name: '经验丹', effect: 'exp_boost', value: 500, cost: 100, cooldown: 1800, desc: '直接获得500经验' }
  }
};

// ==================== 历练系统 ====================
const ADVENTURE_DATA = {
  // 历练类型
  types: {
    '打坐': {
      name: '打坐',
      desc: '静心打坐，稳固修为',
      spirit_gain: 1.0,
      exp_gain: 0.5,
      stone_gain: 0,
      risk: 0,
      time: 60
    },
    '采药': {
      name: '采药',
      desc: '深入山林采集灵草',
      spirit_gain: 0.8,
      exp_gain: 0.8,
      stone_gain: 0.5,
      risk: 0.1,
      time: 120
    },
    '寻宝': {
      name: '寻宝',
      desc: '探索遗迹寻找宝物',
      spirit_gain: 0.5,
      exp_gain: 1.0,
      stone_gain: 1.5,
      risk: 0.3,
      time: 300
    },
    '降妖': {
      name: '降妖',
      desc: '斩妖除魔，保护一方',
      spirit_gain: 1.2,
      exp_gain: 1.5,
      stone_gain: 1.0,
      risk: 0.5,
      time: 600
    },
    '闭关': {
      name: '闭关',
      desc: '长时间专注修炼',
      spirit_gain: 2.0,
      exp_gain: 2.0,
      stone_gain: 0,
      risk: 0.2,
      time: 1800
    }
  },
  // 历练事件
  events: [
    { type: 'good', name: '发现灵草', desc: '意外发现一株灵草', bonus: 1.5 },
    { type: 'good', name: '顿悟', desc: '修炼中突然顿悟', bonus: 2.0 },
    { type: 'bad', name: '走火入魔', desc: '灵气紊乱受伤', bonus: -0.5 },
    { type: 'bad', name: '遭遇偷袭', desc: '被敌人偷袭', bonus: -0.3 },
    { type: 'rare', name: '仙人传承', desc: '获得仙人传承', bonus: 3.0 },
    { type: 'rare', name: '发现秘境', desc: '发现上古秘境', bonus: 5.0 }
  ]
};

// ==================== 奇遇系统 ====================
const CHANCE_DATA = {
  // 奇遇类型
  events: [
    { id: 'find_stones', name: '捡到灵石', desc: '在路上捡到一些灵石', type: 'good', stone_bonus: 100, weight: 30 },
    { id: 'old_master', name: '偶遇名师', desc: '遇到一位前辈指点', type: 'good', exp_bonus: 200, weight: 15 },
    { id: 'inheritance', name: '获得传承', desc: '获得上古功法传承', type: 'rare', technique: 'inheritance', weight: 5 },
    { id: 'spirit_beast', name: '收服灵兽', desc: '收服一只灵兽', type: 'good', pet_bonus: 0.1, weight: 10 },
    { id: 'accident', name: '灵气暴走', desc: '体内灵气暴走', type: 'bad', hp_damage: 0.3, weight: 20 },
    { id: 'treasure', name: '发现宝箱', desc: '发现一个宝箱', type: 'good', stone_bonus: 500, weight: 8 },
    { id: 'break_through', name: '意外突破', desc: '意外突破境界', type: 'rare', realm_break: true, weight: 2 },
    { id: 'robbed', name: '被打劫', desc: '被邪修打劫', type: 'bad', stone_loss: 0.5, weight: 10 }
  ],
  
  // 奇遇触发概率
  trigger_rate: 0.01  // 每次tick 1%概率
};

// ==================== 成就系统 ====================
const ACHIEVEMENT_DATA = {
  'first_realm': { name: '初入仙途', desc: '突破到练气期', reward: 100, claimed: false },
  'ten_level': { name: '小有所成', desc: '达到10级', reward: 200, claimed: false },
  'hundred_level': { name: '修为有成', desc: '达到100级', reward: 1000, claimed: false },
  'first_equipment': { name: '初得法器', desc: '获得第一件装备', reward: 50, claimed: false },
  'ten_enemies': { name: '斩妖除魔', desc: '击败10只怪物', reward: 100, claimed: false },
  'hundred_enemies': { name: '百人斩', desc: '击败100只怪物', reward: 500, claimed: false },
  'first_dungeon': { name: '副本首通', desc: '通关第一个副本', reward: 300, claimed: false },
  'all_realm': { name: '得道成仙', desc: '修炼到仙人境界', reward: 10000, claimed: false },
  'million_stones': { name: '富甲一方', desc: '累计获得100万灵石', reward: 2000, claimed: false },
  'perfect_day': { name: '修炼无间断', desc: '挂机满24小时', reward: 500, claimed: false }
};

// ==================== 任务系统 ====================
const QUEST_DATA = {
  // 每日任务
  daily: [
    { id: 'daily_cultivate', name: '日常修炼', desc: '修炼1000灵气', target: 1000, type: 'spirit', reward: 20 },
    { id: 'daily_fight', name: '斩妖除魔', desc: '击败5只怪物', target: 5, type: 'kill', reward: 30 },
    { id: 'daily_adventure', name: '历练一次', desc: '完成一次历练', target: 1, type: 'adventure', reward: 25 },
    { id: 'daily_collect', name: '采集资源', desc: '收集洞府资源', target: 1, type: 'collect', reward: 15 }
  ],
  // 成就任务
  achievement: ACHIEVEMENT_DATA
};

// 导出扩展系统数据
window.EQUIPMENT_DATA = EQUIPMENT_DATA;
window.EQUIP_SLOTS = EQUIP_SLOTS;
window.SPIRIT_ROOT_DATA = SPIRIT_ROOT_DATA;
window.PILLS_DATA = PILLS_DATA;
window.ADVENTURE_DATA = ADVENTURE_DATA;
window.CHANCE_DATA = CHANCE_DATA;
window.ACHIEVEMENT_DATA = ACHIEVEMENT_DATA;
window.QUEST_DATA = QUEST_DATA;
