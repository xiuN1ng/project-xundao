/**
 * 挂机修仙 - 星魂配置 (Soul Config)
 * 星魂类型、品质、碎片合成配方
 */

const QUALITIES = ['white', 'green', 'blue', 'purple', 'orange', 'red'];

const QUALITY_NAMES = {
  white: '白色',
  green: '绿色',
  blue: '蓝色',
  purple: '紫色',
  orange: '橙色',
  red: '红色',
};

// 星魂类型定义（所有可获得的星魂）
const SOUL_TYPES = {
  // 东方青龙七宿
  jiao:   { id: 'jiao',    name: '角宿星魂', symbol: 'qinglong', element: '木', quality: 'white',  baseStats: { attack: 10, defense: 5,  hp: 100, critRate: 0.01, critDmg: 0.02 }, fragmentCount: 10 },
  kang:   { id: 'kang',    name: '亢宿星魂', symbol: 'qinglong', element: '木', quality: 'white',  baseStats: { attack: 12, defense: 6,  hp: 110, critRate: 0.01, critDmg: 0.02 }, fragmentCount: 10 },
  di:     { id: 'di',      name: '氐宿星魂', symbol: 'qinglong', element: '木', quality: 'green',  baseStats: { attack: 15, defense: 8,  hp: 140, critRate: 0.015, critDmg: 0.03 }, fragmentCount: 15 },
  fang:   { id: 'fang',    name: '房宿星魂', symbol: 'qinglong', element: '木', quality: 'green',  baseStats: { attack: 18, defense: 10, hp: 170, critRate: 0.015, critDmg: 0.03 }, fragmentCount: 15 },
  xin:    { id: 'xin',     name: '心宿星魂', symbol: 'qinglong', element: '火', quality: 'blue',   baseStats: { attack: 25, defense: 12, hp: 220, critRate: 0.02, critDmg: 0.04 }, fragmentCount: 20 },
  wei:    { id: 'wei',     name: '尾宿星魂', symbol: 'qinglong', element: '火', quality: 'blue',   baseStats: { attack: 28, defense: 14, hp: 250, critRate: 0.02, critDmg: 0.04 }, fragmentCount: 20 },
  ji:     { id: 'ji',      name: '箕宿星魂', symbol: 'qinglong', element: '木', quality: 'blue',   baseStats: { attack: 30, defense: 15, hp: 280, critRate: 0.025, critDmg: 0.05 }, fragmentCount: 20 },
  // 北方玄武七宿
  dou:    { id: 'dou',     name: '斗宿星魂', symbol: 'xuanwu', element: '水', quality: 'green',  baseStats: { attack: 15, defense: 12, hp: 200, critRate: 0.01, critDmg: 0.02 }, fragmentCount: 15 },
  niu:    { id: 'niu',     name: '牛宿星魂', symbol: 'xuanwu', element: '金', quality: 'green',  baseStats: { attack: 18, defense: 14, hp: 230, critRate: 0.015, critDmg: 0.03 }, fragmentCount: 15 },
  nv:     { id: 'nv',      name: '女宿星魂', symbol: 'xuanwu', element: '水', quality: 'blue',   baseStats: { attack: 22, defense: 18, hp: 280, critRate: 0.02, critDmg: 0.04 }, fragmentCount: 20 },
  xu:     { id: 'xu',      name: '虚宿星魂', symbol: 'xuanwu', element: '水', quality: 'blue',   baseStats: { attack: 25, defense: 20, hp: 300, critRate: 0.02, critDmg: 0.04 }, fragmentCount: 20 },
  wei_star:{ id: 'wei_star', name: '危宿星魂', symbol: 'xuanwu', element: '火', quality: 'purple', baseStats: { attack: 35, defense: 25, hp: 380, critRate: 0.03, critDmg: 0.06 }, fragmentCount: 25 },
  shi:    { id: 'shi',     name: '室宿星魂', symbol: 'xuanwu', element: '火', quality: 'purple', baseStats: { attack: 38, defense: 28, hp: 420, critRate: 0.03, critDmg: 0.06 }, fragmentCount: 25 },
  bi:     { id: 'bi',      name: '壁宿星魂', symbol: 'xuanwu', element: '水', quality: 'purple', baseStats: { attack: 40, defense: 30, hp: 450, critRate: 0.03, critDmg: 0.06 }, fragmentCount: 25 },
  // 西方白虎七宿
  kui:    { id: 'kui',     name: '奎宿星魂', symbol: 'baihu', element: '土', quality: 'blue',   baseStats: { attack: 28, defense: 10, hp: 200, critRate: 0.025, critDmg: 0.05 }, fragmentCount: 20 },
  lou:    { id: 'lou',     name: '娄宿星魂', symbol: 'baihu', element: '金', quality: 'blue',   baseStats: { attack: 32, defense: 12, hp: 230, critRate: 0.025, critDmg: 0.05 }, fragmentCount: 20 },
  wei_mai:{ id: 'wei_mai', name: '胃宿星魂', symbol: 'baihu', element: '土', quality: 'purple', baseStats: { attack: 40, defense: 15, hp: 300, critRate: 0.03, critDmg: 0.06 }, fragmentCount: 25 },
  mao:    { id: 'mao',     name: '昴宿星魂', symbol: 'baihu', element: '火', quality: 'purple', baseStats: { attack: 45, defense: 18, hp: 340, critRate: 0.035, critDmg: 0.07 }, fragmentCount: 25 },
  bi_star:{ id: 'bi_star', name: '毕宿星魂', symbol: 'baihu', element: '火', quality: 'purple', baseStats: { attack: 50, defense: 20, hp: 380, critRate: 0.035, critDmg: 0.07 }, fragmentCount: 25 },
  zi:     { id: 'zi',      name: '觜宿星魂', symbol: 'baihu', element: '火', quality: 'orange', baseStats: { attack: 60, defense: 25, hp: 450, critRate: 0.04, critDmg: 0.08 }, fragmentCount: 30 },
  shen:   { id: 'shen',    name: '参宿星魂', symbol: 'baihu', element: '金', quality: 'orange', baseStats: { attack: 65, defense: 28, hp: 500, critRate: 0.04, critDmg: 0.08 }, fragmentCount: 30 },
  // 南方朱雀七宿
  jing:   { id: 'jing',    name: '井宿星魂', symbol: 'zhuque', element: '水', quality: 'blue',   baseStats: { attack: 35, defense: 8,  hp: 180, critRate: 0.03, critDmg: 0.06 }, fragmentCount: 20 },
  gui:    { id: 'gui',     name: '鬼宿星魂', symbol: 'zhuque', element: '火', quality: 'purple', baseStats: { attack: 45, defense: 10, hp: 250, critRate: 0.035, critDmg: 0.07 }, fragmentCount: 25 },
  liu:    { id: 'liu',     name: '柳宿星魂', symbol: 'zhuque', element: '木', quality: 'purple', baseStats: { attack: 50, defense: 12, hp: 300, critRate: 0.04, critDmg: 0.08 }, fragmentCount: 25 },
  xing:   { id: 'xing',    name: '星宿星魂', symbol: 'zhuque', element: '火', quality: 'orange', baseStats: { attack: 60, defense: 15, hp: 380, critRate: 0.045, critDmg: 0.09 }, fragmentCount: 30 },
  zhang:  { id: 'zhang',   name: '张宿星魂', symbol: 'zhuque', element: '火', quality: 'orange', baseStats: { attack: 65, defense: 18, hp: 420, critRate: 0.045, critDmg: 0.09 }, fragmentCount: 30 },
  yi:     { id: 'yi',      name: '翼宿星魂', symbol: 'zhuque', element: '火', quality: 'orange', baseStats: { attack: 70, defense: 20, hp: 460, critRate: 0.05, critDmg: 0.10 }, fragmentCount: 30 },
  zhen:   { id: 'zhen',   name: '轸宿星魂', symbol: 'zhuque', element: '水', quality: 'orange', baseStats: { attack: 75, defense: 22, hp: 500, critRate: 0.05, critDmg: 0.10 }, fragmentCount: 30 },
  // 四象星魂
  qinglong_soul: { id: 'qinglong_soul', name: '青龙星魂', symbol: 'qinglong', element: '木', quality: 'red', baseStats: { attack: 120, defense: 80, hp: 1500, critRate: 0.08, critDmg: 0.20 }, fragmentCount: 50 },
  baihu_soul:   { id: 'baihu_soul',   name: '白虎星魂', symbol: 'baihu',   element: '金', quality: 'red', baseStats: { attack: 150, defense: 50, hp: 1200, critRate: 0.10, critDmg: 0.25 }, fragmentCount: 50 },
  zhuque_soul:  { id: 'zhuque_soul',  name: '朱雀星魂', symbol: 'zhuque',  element: '火', quality: 'red', baseStats: { attack: 180, defense: 40, hp: 1000, critRate: 0.12, critDmg: 0.30 }, fragmentCount: 50 },
  xuanwu_soul:  { id: 'xuanwu_soul',  name: '玄武星魂', symbol: 'xuanwu', element: '水', quality: 'red', baseStats: { attack: 100, defense: 100, hp: 2000, critRate: 0.06, critDmg: 0.15 }, fragmentCount: 50 },
};

// 碎片合成配方：soul_type -> { fragmentCount, essenceCost }
const FRAGMENT_RECIPES = {};
for (const [key, soul] of Object.entries(SOUL_TYPES)) {
  FRAGMENT_RECIPES[key] = {
    soulType: key,
    name: soul.name,
    fragmentCount: soul.fragmentCount,
    essenceCost: getEssenceCostByQuality(soul.quality),
    quality: soul.quality,
  };
}

function getEssenceCostByQuality(quality) {
  const costs = { white: 20, green: 40, blue: 80, purple: 160, orange: 320, red: 640 };
  return costs[quality] || 20;
}

// 星魂升级配置：等级 -> 需要的同名星魂数量
const UPGRADE_COSTS = {
  1: { feedCount: 0, essenceCost: 0 },
  2: { feedCount: 1, essenceCost: 30 },
  3: { feedCount: 2, essenceCost: 60 },
  4: { feedCount: 3, essenceCost: 120 },
  5: { feedCount: 5, essenceCost: 200 },
  6: { feedCount: 8, essenceCost: 350 },
  7: { feedCount: 12, essenceCost: 600 },
  8: { feedCount: 18, essenceCost: 1000 },
  9: { feedCount: 25, essenceCost: 1500 },
  10: { feedCount: 35, essenceCost: 2500 },
};

// 品质对应掉落权重
const QUALITY_DROP_WEIGHTS = {
  white: 50,
  green: 30,
  blue: 15,
  purple: 4,
  orange: 1,
  red: 0,
};

// 装备槽位数量
const EQUIP_SLOTS = 8;

// 计算星魂等级属性（每级+10%）
function calcSoulStats(soulType, level, quality) {
  const base = SOUL_TYPES[soulType]?.baseStats;
  if (!base) return null;
  const mult = Math.pow(1.1, level - 1);
  const qualityMult = getQualityMultiplier(quality);
  return {
    attack: Math.floor(base.attack * mult * qualityMult),
    defense: Math.floor(base.defense * mult * qualityMult),
    hp: Math.floor(base.hp * mult * qualityMult),
    critRate: +(base.critRate * mult * qualityMult).toFixed(4),
    critDmg: +(base.critDmg * mult * qualityMult).toFixed(4),
  };
}

function getQualityMultiplier(quality) {
  const m = { white: 1.0, green: 1.3, blue: 1.6, purple: 2.0, orange: 2.5, red: 3.0 };
  return m[quality] || 1.0;
}

module.exports = {
  QUALITIES,
  QUALITY_NAMES,
  SOUL_TYPES,
  FRAGMENT_RECIPES,
  UPGRADE_COSTS,
  QUALITY_DROP_WEIGHTS,
  EQUIP_SLOTS,
  calcSoulStats,
  getQualityMultiplier,
};
