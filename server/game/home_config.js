/**
 * 仙府洞天/家园系统配置
 * game/home_config.js
 */

// ========== 建筑配置 ==========
const BUILDINGS = {
  main: {
    id: 'main',
    name: '正殿',
    description: '洞府核心建筑，决定灵气容量上限',
    icon: '🏛️',
    maxLevel: 10,
    // 升级消耗: { 灵石, 材料 }
    upgradeCost: (level) => ({
      spiritStone: Math.floor(100 * Math.pow(1.8, level)),
      materials: [
        { id: 'spirit-stone', count: Math.floor(5 * Math.pow(1.5, level)) },
        { id: 'wood', count: Math.floor(10 * Math.pow(1.3, level)) },
        { id: 'stone', count: Math.floor(8 * Math.pow(1.3, level)) }
      ]
    }),
    // 升级效果
    upgradeEffect: (level) => ({
      auraCapacityBonus: level * 50,  // 每级+50灵气容量
      prosperityBonus: level * 2       // 每级+2繁荣度
    })
  },
  alchemy: {
    id: 'alchemy',
    name: '丹房',
    description: '提升炼丹成功率',
    icon: '⚗️',
    maxLevel: 10,
    upgradeCost: (level) => ({
      spiritStone: Math.floor(80 * Math.pow(1.7, level)),
      materials: [
        { id: 'fire-crystal', count: Math.floor(3 * Math.pow(1.4, level)) },
        { id: 'herb', count: Math.floor(15 * Math.pow(1.3, level)) }
      ]
    }),
    upgradeEffect: (level) => ({
      alchemySuccessBonus: level * 5,  // 每级+5%炼丹成功率
      prosperityBonus: level * 1
    })
  },
  farm: {
    id: 'farm',
    name: '灵田',
    description: '提升作物产量',
    icon: '🌾',
    maxLevel: 10,
    upgradeCost: (level) => ({
      spiritStone: Math.floor(60 * Math.pow(1.6, level)),
      materials: [
        { id: 'wood', count: Math.floor(8 * Math.pow(1.3, level)) },
        { id: 'water-essence', count: Math.floor(2 * Math.pow(1.4, level)) }
      ]
    }),
    upgradeEffect: (level) => ({
      farmYieldBonus: level * 10,      // 每级+10%作物产量
      prosperityBonus: level * 1
    })
  },
  forge: {
    id: 'forge',
    name: '炼器室',
    description: '提升装备强化成功率',
    icon: '🔨',
    maxLevel: 10,
    upgradeCost: (level) => ({
      spiritStone: Math.floor(90 * Math.pow(1.7, level)),
      materials: [
        { id: 'iron-ore', count: Math.floor(10 * Math.pow(1.3, level)) },
        { id: 'fire-crystal', count: Math.floor(3 * Math.pow(1.4, level)) }
      ]
    }),
    upgradeEffect: (level) => ({
      forgeSuccessBonus: level * 3,    // 每级+3%强化成功率
      prosperityBonus: level * 1
    })
  },
  library: {
    id: 'library',
    name: '藏经阁',
    description: '提升技能熟练度获取',
    icon: '📚',
    maxLevel: 10,
    upgradeCost: (level) => ({
      spiritStone: Math.floor(70 * Math.pow(1.7, level)),
      materials: [
        { id: 'jade', count: Math.floor(5 * Math.pow(1.4, level)) },
        { id: 'paper', count: Math.floor(20 * Math.pow(1.2, level)) }
      ]
    }),
    upgradeEffect: (level) => ({
      skillExpBonus: level * 5,        // 每级+5%技能经验
      prosperityBonus: level * 1
    })
  },
  pet: {
    id: 'pet',
    name: '宠物房',
    description: '提升灵宠经验获取',
    icon: '🏠',
    maxLevel: 10,
    upgradeCost: (level) => ({
      spiritStone: Math.floor(75 * Math.pow(1.7, level)),
      materials: [
        { id: 'fur', count: Math.floor(8 * Math.pow(1.3, level)) },
        { id: 'herb', count: Math.floor(10 * Math.pow(1.3, level)) }
      ]
    }),
    upgradeEffect: (level) => ({
      petExpBonus: level * 10,          // 每级+10%灵宠经验
      prosperityBonus: level * 1
    })
  }
};

// ========== 家具配置 ==========
const FURNITURE_TYPES = {
  // 仙侠风格
  'xianxia-throne': {
    id: 'xianxia-throne',
    name: '仙玉龙椅',
    style: 'xianxia',
    category: 'seat',
    price: 500,
    prosperity: 10,
    icon: '🪑'
  },
  'xianxia-desk': {
    id: 'xianxia-desk',
    name: '紫檀书案',
    style: 'xianxia',
    category: 'desk',
    price: 300,
    prosperity: 6,
    icon: '�桌'
  },
  'xianxia-lamp': {
    id: 'xianxia-lamp',
    name: '琉璃灵灯',
    style: 'xianxia',
    category: 'decor',
    price: 200,
    prosperity: 4,
    icon: '🪔'
  },
  'xianxia-painting': {
    id: 'xianxia-painting',
    name: '仙鹤屏风',
    style: 'xianxia',
    category: 'wall',
    price: 400,
    prosperity: 8,
    icon: '🖼️'
  },
  'xianxia-plant': {
    id: 'xianxia-plant',
    name: '灵芝盆景',
    style: 'xianxia',
    category: 'plant',
    price: 150,
    prosperity: 3,
    icon: '🌿'
  },
  'xianxia-carpet': {
    id: 'xianxia-carpet',
    name: '云纹地毯',
    style: 'xianxia',
    category: 'floor',
    price: 250,
    prosperity: 5,
    icon: '🧵'
  },
  // 古风
  'ancient-throne': {
    id: 'ancient-throne',
    name: '黄花梨太师椅',
    style: 'ancient',
    category: 'seat',
    price: 450,
    prosperity: 9,
    icon: '🪑'
  },
  'ancient-desk': {
    id: 'ancient-desk',
    name: '红木书桌',
    style: 'ancient',
    category: 'desk',
    price: 280,
    prosperity: 5,
    icon: '�桌'
  },
  'ancient-lamp': {
    id: 'ancient-lamp',
    name: '青铜灯台',
    style: 'ancient',
    category: 'decor',
    price: 180,
    prosperity: 3,
    icon: '🪔'
  },
  'ancient-painting': {
    id: 'ancient-painting',
    name: '山水画卷',
    style: 'ancient',
    category: 'wall',
    price: 380,
    prosperity: 7,
    icon: '🖼️'
  },
  'ancient-plant': {
    id: 'ancient-plant',
    name: '松柏盆栽',
    style: 'ancient',
    category: 'plant',
    price: 120,
    prosperity: 2,
    icon: '🌿'
  },
  'ancient-carpet': {
    id: 'ancient-carpet',
    name: '织锦地毯',
    style: 'ancient',
    category: 'floor',
    price: 220,
    prosperity: 4,
    icon: '🧵'
  },
  // 现代
  'modern-sofa': {
    id: 'modern-sofa',
    name: '真皮沙发',
    style: 'modern',
    category: 'seat',
    price: 600,
    prosperity: 12,
    icon: '🛋️'
  },
  'modern-desk': {
    id: 'modern-desk',
    name: '升降办公桌',
    style: 'modern',
    category: 'desk',
    price: 350,
    prosperity: 7,
    icon: '🖥️'
  },
  'modern-lamp': {
    id: 'modern-lamp',
    name: '极简台灯',
    style: 'modern',
    category: 'decor',
    price: 150,
    prosperity: 3,
    icon: '💡'
  },
  'modern-painting': {
    id: 'modern-painting',
    name: '抽象画',
    style: 'modern',
    category: 'wall',
    price: 300,
    prosperity: 6,
    icon: '🖼️'
  },
  'modern-plant': {
    id: 'modern-plant',
    name: '绿植盆栽',
    style: 'modern',
    category: 'plant',
    price: 80,
    prosperity: 2,
    icon: '🪴'
  },
  'modern-carpet': {
    id: 'modern-carpet',
    name: '几何地毯',
    style: 'modern',
    category: 'floor',
    price: 200,
    prosperity: 4,
    icon: '🧵'
  },
  // 和风
  'japanese-futon': {
    id: 'japanese-futon',
    name: '榻榻米床铺',
    style: 'japanese',
    category: 'seat',
    price: 400,
    prosperity: 8,
    icon: '🛏️'
  },
  'japanese-desk': {
    id: 'japanese-desk',
    name: '矮脚书桌',
    style: 'japanese',
    category: 'desk',
    price: 250,
    prosperity: 5,
    icon: '�桌'
  },
  'japanese-lamp': {
    id: 'japanese-lamp',
    name: '纸灯笼',
    style: 'japanese',
    category: 'decor',
    price: 120,
    prosperity: 2,
    icon: '🏮'
  },
  'japanese-painting': {
    id: 'japanese-painting',
    name: '浮世绘',
    style: 'japanese',
    category: 'wall',
    price: 350,
    prosperity: 7,
    icon: '🖼️'
  },
  'japanese-plant': {
    id: 'japanese-plant',
    name: '枯山水',
    style: 'japanese',
    category: 'plant',
    price: 300,
    prosperity: 6,
    icon: '🎋'
  },
  'japanese-carpet': {
    id: 'japanese-carpet',
    name: '草编垫',
    style: 'japanese',
    category: 'floor',
    price: 100,
    prosperity: 2,
    icon: '🧵'
  }
};

// ========== 作物配置 ==========
const CROP_TYPES = {
  'spirit-herb': {
    id: 'spirit-herb',
    name: '灵芝草',
    description: '炼制筑基丹的主材料',
    icon: '🌿',
    growthTime: 3600,    // 1小时（秒）
    baseYield: 2,        // 基础产量
    price: 50,          // 售价（灵石）
    exp: 20             // 种植经验
  },
  'fire-flower': {
    id: 'fire-flower',
    name: '烈火花',
    description: '炼制火系丹药的辅材',
    icon: '🔥',
    growthTime: 7200,    // 2小时
    baseYield: 1,
    price: 80,
    exp: 30
  },
  'ice-jade': {
    id: 'ice-jade',
    name: '寒冰玉',
    description: '炼制冰系丹药的辅材',
    icon: '❄️',
    growthTime: 7200,
    baseYield: 1,
    price: 80,
    exp: 30
  },
  'golden-fruit': {
    id: 'golden-fruit',
    name: '金元果',
    description: '炼制金丹的珍贵材料',
    icon: '🍑',
    growthTime: 14400,   // 4小时
    baseYield: 1,
    price: 150,
    exp: 60
  },
  'moon-flower': {
    id: 'moon-flower',
    name: '月华花',
    description: '炼制培元丹的稀有材料',
    icon: '🌸',
    growthTime: 18000,   // 5小时
    baseYield: 2,
    price: 100,
    exp: 50
  },
  'dragon-grass': {
    id: 'dragon-grass',
    name: '龙涎草',
    description: '炼制高阶丹药的顶级材料',
    icon: '🌱',
    growthTime: 21600,   // 6小时
    baseYield: 1,
    price: 200,
    exp: 80
  }
};

// ========== 家园风格配置 ==========
const HOME_STYLES = {
  xianxia: {
    id: 'xianxia',
    name: '仙侠风',
    description: '云雾缭绕的仙家洞府',
    icon: '☁️',
    auraRegenBonus: 1.0,     // 基础灵气回复
    prosperityMultiplier: 1.0
  },
  ancient: {
    id: 'ancient',
    name: '古风',
    description: '典雅古朴的亭台楼阁',
    icon: '🏯',
    auraRegenBonus: 0.9,
    prosperityMultiplier: 0.95
  },
  modern: {
    id: 'modern',
    name: '现代风',
    description: '简洁现代的舒适居所',
    icon: '🏠',
    auraRegenBonus: 0.8,
    prosperityMultiplier: 0.9
  },
  japanese: {
    id: 'japanese',
    name: '和风',
    description: '清雅幽静的日式庭院',
    icon: '⛩️',
    auraRegenBonus: 0.85,
    prosperityMultiplier: 0.92
  }
};

// ========== 洞府BUFF计算 ==========
function calculateHomeBuff(buildings, prosperity, style) {
  const styleConfig = HOME_STYLES[style] || HOME_STYLES.xianxia;
  
  // 计算各建筑BUFF加成
  const buildingBuffs = {};
  let totalProsperity = prosperity;
  
  for (const [type, building] of Object.entries(buildings)) {
    if (building && building.level > 0) {
      const config = BUILDINGS[type];
      if (config && config.upgradeEffect) {
        const effect = config.upgradeEffect(building.level);
        buildingBuffs[type] = effect;
        totalProsperity += effect.prosperityBonus || 0;
      }
    }
  }
  
  // 繁荣度影响因子 (每100繁荣度+10%效果)
  const prosperityFactor = 1 + (totalProsperity / 1000);
  
  // 综合BUFF
  return {
    alchemySuccessBonus: (buildingBuffs.alchemy?.alchemySuccessBonus || 0) * prosperityFactor,
    farmYieldBonus: (buildingBuffs.farm?.farmYieldBonus || 0) * prosperityFactor,
    forgeSuccessBonus: (buildingBuffs.forge?.forgeSuccessBonus || 0) * prosperityFactor,
    skillExpBonus: (buildingBuffs.library?.skillExpBonus || 0) * prosperityFactor,
    petExpBonus: (buildingBuffs.pet?.petExpBonus || 0) * prosperityFactor,
    auraCapacityBonus: buildingBuffs.main?.auraCapacityBonus || 0,
    auraRegenBonus: styleConfig.auraRegenBonus,
    prosperityFactor: prosperityFactor
  };
}

module.exports = {
  BUILDINGS,
  FURNITURE_TYPES,
  CROP_TYPES,
  HOME_STYLES,
  calculateHomeBuff
};
