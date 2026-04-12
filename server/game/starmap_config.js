/**
 * 挂机修仙 - 星图配置 (Starmap Config)
 * 32个星宿节点：28星宿 + 四象（青龙/白虎/朱雀/玄武）
 * 
 * 二十八星宿分属四象：
 * - 东方青龙七宿：角、亢、氐、房、心、尾、箕
 * - 北方玄武七宿：斗、牛、女、虚、危、室、壁
 * - 西方白虎七宿：奎、娄、胃、昴、毕、觜、参
 * - 南方朱雀七宿：井、鬼、柳、星、张、翼、轸
 */

const STAR_QUALITIES = {
  white:   { name: '白色', color: '#FFFFFF', multiplier: 1.0 },
  green:   { name: '绿色', color: '#00FF00', multiplier: 1.3 },
  blue:    { name: '蓝色', color: '#4488FF', multiplier: 1.6 },
  purple:  { name: '紫色', color: '#AA44FF', multiplier: 2.0 },
  orange:  { name: '橙色', color: '#FF8800', multiplier: 2.5 },
  red:     { name: '红色', color: '#FF4444', multiplier: 3.0 },
};

const STAR_LEVELS = 10; // 1-10级

// 四象定义
const SYMBOL_BEASTS = {
  qinglong: {
    id: 'qinglong',
    name: '青龙',
    icon: '🐉',
    color: '#00AA55',
    element: '木',
    description: '东方神兽，掌控生机之力',
    region: 'east',
    soulCount: 7,
  },
  baihu: {
    id: 'baihu',
    name: '白虎',
    icon: '🐅',
    color: '#AAAAAA',
    element: '金',
    description: '西方神兽，掌控杀伐之力',
    region: 'west',
    soulCount: 7,
  },
  zhuque: {
    id: 'zhuque',
    name: '朱雀',
    icon: '🦅',
    color: '#FF5500',
    element: '火',
    description: '南方神兽，掌控灼热之力',
    region: 'south',
    soulCount: 7,
  },
  xuanwu: {
    id: 'xuanwu',
    name: '玄武',
    icon: '🐢',
    color: '#3355AA',
    element: '水',
    description: '北方神兽，掌控龟息之力',
    region: 'north',
    soulCount: 7,
  },
};

// 二十八星宿配置
const TWENTY_EIGHT_XIU = {
  // 东方青龙七宿
  jiao:   { id: 'jiao',   name: '角宿', pinyin: 'Jiao',   symbol: 'qinglong', element: '木', description: '苍龙之角，象征东方生机', coord: { x: 120, y: 80 } },
  kang:   { id: 'kang',   name: '亢宿', pinyin: 'Kang',   symbol: 'qinglong', element: '木', description: '苍龙之颈，象征刚健之力', coord: { x: 160, y: 60 } },
  di:     { id: 'di',     name: '氐宿', pinyin: 'Di',     symbol: 'qinglong', element: '木', description: '苍龙之胸，象征根基稳固', coord: { x: 200, y: 80 } },
  fang:   { id: 'fang',   name: '房宿', pinyin: 'Fang',   symbol: 'qinglong', element: '木', description: '苍龙之腹，象征容纳博大', coord: { x: 240, y: 100 } },
  xin:    { id: 'xin',    name: '心宿', pinyin: 'Xin',    symbol: 'qinglong', element: '火', description: '苍龙之心，象征核心主宰', coord: { x: 280, y: 90 } },
  wei:    { id: 'wei',    name: '尾宿', pinyin: 'Wei',    symbol: 'qinglong', element: '火', description: '苍龙之尾，象征变化莫测', coord: { x: 320, y: 110 } },
  ji:     { id: 'ji',     name: '箕宿', pinyin: 'Ji',     symbol: 'qinglong', element: '木', description: '苍龙之尾，象征清簸尘埃', coord: { x: 360, y: 130 } },
  
  // 北方玄武七宿
  dou:    { id: 'dou',    name: '斗宿', pinyin: 'Dou',    symbol: 'xuanwu', element: '水', description: '玄武之首，象征统御万物', coord: { x: 380, y: 200 } },
  niu:    { id: 'niu',    name: '牛宿', pinyin: 'Niu',    symbol: 'xuanwu', element: '金', description: '玄武之肩，象征勤勉耕耘', coord: { x: 360, y: 240 } },
  nv:     { id: 'nv',     name: '女宿', pinyin: 'Nv',     symbol: 'xuanwu', element: '水', description: '玄武之胸，象征柔韧智慧', coord: { x: 320, y: 260 } },
  xu:     { id: 'xu',     name: '虚宿', pinyin: 'Xu',     symbol: 'xuanwu', element: '水', description: '玄武之心，象征空虚寂静', coord: { x: 280, y: 280 } },
  wei_star:{ id: 'wei_star', name: '危宿', pinyin: 'Wei',  symbol: 'xuanwu', element: '火', description: '玄武之脊，象征危险机遇', coord: { x: 240, y: 270 } },
  shi:    { id: 'shi',    name: '室宿', pinyin: 'Shi',    symbol: 'xuanwu', element: '火', description: '玄武之腹，象征安居之所', coord: { x: 200, y: 260 } },
  bi:     { id: 'bi',     name: '壁宿', pinyin: 'Bi',     symbol: 'xuanwu', element: '水', description: '玄武之尾，象征屏障护卫', coord: { x: 160, y: 240 } },
  
  // 西方白虎七宿
  kui:    { id: 'kui',    name: '奎宿', pinyin: 'Kui',    symbol: 'baihu', element: '土', description: '白虎之足，象征束缚之力', coord: { x: 120, y: 200 } },
  lou:    { id: 'lou',    name: '娄宿', pinyin: 'Lou',    symbol: 'baihu', element: '金', description: '白虎之股，象征汇聚贤能', coord: { x: 90, y: 220 } },
  wei_mai:{ id: 'wei_mai', name: '胃宿', pinyin: 'Wei',   symbol: 'baihu', element: '土', description: '白虎之胃，象征受纳消化', coord: { x: 70, y: 250 } },
  mao:    { id: 'mao',    name: '昴宿', pinyin: 'Mao',    symbol: 'baihu', element: '火', description: '白虎之目，象征洞察秋毫', coord: { x: 60, y: 280 } },
  bi_star:{ id: 'bi_star', name: '毕宿', pinyin: 'Bi',    symbol: 'baihu', element: '火', description: '白虎之耳，象征捕获猎物', coord: { x: 80, y: 310 } },
  zi:     { id: 'zi',     name: '觜宿', pinyin: 'Zi',     symbol: 'baihu', element: '火', description: '白虎之口，象征锐利啄击', coord: { x: 100, y: 330 } },
  shen:   { id: 'shen',   name: '参宿', pinyin: 'Shen',   symbol: 'baihu', element: '金', description: '白虎之身，象征参拜三星', coord: { x: 130, y: 320 } },
  
  // 南方朱雀七宿
  jing:   { id: 'jing',   name: '井宿', pinyin: 'Jing',   symbol: 'zhuque', element: '水', description: '朱雀之口，象征水源之地', coord: { x: 200, y: 380 } },
  gui:    { id: 'gui',    name: '鬼宿', pinyin: 'Gui',    symbol: 'zhuque', element: '火', description: '朱雀之目，象征洞察鬼魅', coord: { x: 240, y: 400 } },
  liu:    { id: 'liu',    name: '柳宿', pinyin: 'Liu',    symbol: 'zhuque', element: '木', description: '朱雀之颈，象征如柳垂拂', coord: { x: 280, y: 420 } },
  xing:   { id: 'xing',   name: '星宿', pinyin: 'Xing',   symbol: 'zhuque', element: '火', description: '朱雀之胸，象征星光璀璨', coord: { x: 320, y: 410 } },
  zhang:  { id: 'zhang',  name: '张宿', pinyin: 'Zhang',  symbol: 'zhuque', element: '火', description: '朱雀之翼根，象征张开翱翔', coord: { x: 360, y: 400 } },
  yi:     { id: 'yi',     name: '翼宿', pinyin: 'Yi',     symbol: 'zhuque', element: '火', description: '朱雀之翼，象征羽翼丰满', coord: { x: 400, y: 380 } },
  zhen:   { id: 'zhen',  name: '轸宿', pinyin: 'Zhen',  symbol: 'zhuque', element: '水', description: '朱雀之尾，象征车舆运行', coord: { x: 430, y: 350 } },
};

// 四象星宿（每个四象各有7个星宿，这里用符号星的额外高阶版本）
const SYMBOL_SOULS = {
  qinglong_soul: {
    id: 'qinglong_soul',
    name: '青龙星魂',
    symbol: 'qinglong',
    quality: 'orange',
    baseStats: { attack: 50, defense: 30, hp: 500, critRate: 0.05, critDmg: 0.15 },
    description: '召唤东方青龙星魂，获得青龙之力',
  },
  baihu_soul: {
    id: 'baihu_soul',
    name: '白虎星魂',
    symbol: 'baihu',
    quality: 'orange',
    baseStats: { attack: 60, defense: 20, hp: 400, critRate: 0.08, critDmg: 0.10 },
    description: '召唤西方白虎星魂，获得白虎之力',
  },
  zhuque_soul: {
    id: 'zhuque_soul',
    name: '朱雀星魂',
    symbol: 'zhuque',
    quality: 'orange',
    baseStats: { attack: 70, defense: 15, hp: 350, critRate: 0.10, critDmg: 0.20 },
    description: '召唤南方朱雀星魂，获得朱雀之力',
  },
  xuanwu_soul: {
    id: 'xuanwu_soul',
    name: '玄武星魂',
    symbol: 'xuanwu',
    quality: 'orange',
    baseStats: { attack: 40, defense: 50, hp: 600, critRate: 0.03, critDmg: 0.10 },
    description: '召唤北方玄武星魂，获得玄武之力',
  },
};

// 星图解锁条件（按境界等级）
const STARMAP_UNLOCK = {
  // 东方青龙七宿 - 炼气期解锁
  east: { realmLevel: 1,  realmName: '炼气期', nodes: ['jiao', 'kang', 'di', 'fang', 'xin', 'wei', 'ji'] },
  // 北方玄武七宿 - 筑基期解锁
  north: { realmLevel: 5,  realmName: '筑基期', nodes: ['dou', 'niu', 'nv', 'xu', 'wei_star', 'shi', 'bi'] },
  // 西方白虎七宿 - 金丹期解锁
  west: { realmLevel: 10, realmName: '金丹期', nodes: ['kui', 'lou', 'wei_mai', 'mao', 'bi_star', 'zi', 'shen'] },
  // 南方朱雀七宿 - 元婴期解锁
  south: { realmLevel: 15, realmName: '元婴期', nodes: ['jing', 'gui', 'liu', 'xing', 'zhang', 'yi', 'zhen'] },
  // 四象星魂 - 化神期解锁
  symbol: { realmLevel: 20, realmName: '化神期', nodes: ['qinglong_soul', 'baihu_soul', 'zhuque_soul', 'xuanwu_soul'] },
};

// 星图点亮消耗（星魂精华）
const LIGHTUP_COSTS = {
  white: 50,
  green: 100,
  blue: 200,
  purple: 400,
  orange: 800,
  red: 1600,
};

// 套装效果配置
const SUIT_BONUS = {
  // 同源2件
  2: { attackBonus: 0.05, defenseBonus: 0.03, hpBonus: 0.05, name: '初窥' },
  // 同源4件
  4: { attackBonus: 0.12, defenseBonus: 0.08, hpBonus: 0.12, name: '小成' },
  // 同源6件
  6: { attackBonus: 0.25, defenseBonus: 0.15, hpBonus: 0.25, name: '大成' },
};

// 星图节点点亮后的基础属性加成
const NODE_BONUS = {
  attack: 5,
  defense: 3,
  hp: 50,
  critRate: 0.005,
  critDmg: 0.01,
  dodge: 0.005,
};

// 计算星宿点亮后给玩家带来的属性加成
function calcNodeStats(nodeId, quality) {
  const mult = STAR_QUALITIES[quality]?.multiplier || 1;
  const base = NODE_BONUS;
  return {
    attack: Math.floor(base.attack * mult),
    defense: Math.floor(base.defense * mult),
    hp: Math.floor(base.hp * mult),
    critRate: base.critRate * mult,
    critDmg: base.critDmg * mult,
    dodge: base.dodge * mult,
  };
}

// 获取某区域已解锁的星宿数量
function getUnlockedCountByRegion(region) {
  const config = Object.values(STARMAP_UNLOCK).find(r => r.nodes && r.nodes.includes(region));
  return config ? config.nodes.length : 0;
}

// 获取星宿对应的四象
function getSymbolForSoul(soulType) {
  for (const [key, xiu] of Object.entries(TWENTY_EIGHT_XIU)) {
    if (xiu.id === soulType) return xiu.symbol;
  }
  for (const [key, soul] of Object.entries(SYMBOL_SOULS)) {
    if (soul.id === soulType) return soul.symbol;
  }
  return null;
}

// 获取星宿的解锁信息
function getUnlockInfo(soulType) {
  for (const [regionKey, region] of Object.entries(STARMAP_UNLOCK)) {
    if (region.nodes && region.nodes.includes(soulType)) {
      return { region: regionKey, ...region };
    }
  }
  return null;
}

module.exports = {
  STAR_QUALITIES,
  STAR_LEVELS,
  SYMBOL_BEASTS,
  TWENTY_EIGHT_XIU,
  SYMBOL_SOULS,
  STARMAP_UNLOCK,
  LIGHTUP_COSTS,
  SUIT_BONUS,
  NODE_BONUS,
  calcNodeStats,
  getSymbolForSoul,
  getUnlockInfo,
};
