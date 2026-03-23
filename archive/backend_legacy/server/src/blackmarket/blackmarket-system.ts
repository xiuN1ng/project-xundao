/**
 * 黑市系统
 * 随机出现的神秘商人，限时抢购稀有物品
 */

// 黑市商品品质
export const BLACKMARKET_QUALITY = {
  COMMON: { name: '普通', color: '#8B8B8B', discount: 0.9 },
  RARE: { name: '稀有', color: '#1E90FF', discount: 0.7 },
  EPIC: { name: '史诗', color: '#9932CC', discount: 0.5 },
  LEGENDARY: { name: '传说', color: '#FFD700', discount: 0.3 },
  MYTHIC: { name: '神话', color: '#FF4500', discount: 0.15 }
};

// 黑市商品模板
const BLACKMARKET_ITEMS = [
  // 装备
  { id: 'bm_sword_1', name: '玄铁剑', type: 'weapon', quality: 'COMMON', basePrice: 1000, atk: 50 },
  { id: 'bm_sword_2', name: '龙泉剑', type: 'weapon', quality: 'RARE', basePrice: 5000, atk: 150 },
  { id: 'bm_sword_3', name: '倚天剑', type: 'weapon', quality: 'EPIC', basePrice: 20000, atk: 400 },
  { id: 'bm_sword_4', name: '轩辕剑', type: 'weapon', quality: 'LEGENDARY', basePrice: 100000, atk: 1000 },
  { id: 'bm_armor_1', name: '皮甲', type: 'armor', quality: 'COMMON', basePrice: 800, def: 30 },
  { id: 'bm_armor_2', name: '锁子甲', type: 'armor', quality: 'RARE', basePrice: 4000, def: 100 },
  { id: 'bm_armor_3', name: '鳞甲', type: 'armor', quality: 'EPIC', basePrice: 15000, def: 250 },
  { id: 'bm_armor_4', name: '龙鳞甲', type: 'armor', quality: 'LEGENDARY', basePrice: 80000, def: 600 },
  // 道具
  { id: 'bm_herb_1', name: '灵草', type: 'material', quality: 'COMMON', basePrice: 50 },
  { id: 'bm_herb_2', name: '百年灵芝', type: 'material', quality: 'RARE', basePrice: 500 },
  { id: 'bm_herb_3', name: '九转还魂草', type: 'material', quality: 'EPIC', basePrice: 3000 },
  { id: 'bm_herb_4', name: '蟠桃', type: 'material', quality: 'LEGENDARY', basePrice: 20000 },
  { id: 'bm_herb_5', name: '人参果', type: 'material', quality: 'MYTHIC', basePrice: 100000 },
  // 技能书
  { id: 'bm_skill_1', name: '基础剑技', type: 'skill', quality: 'RARE', basePrice: 3000 },
  { id: 'bm_skill_2', name: '高级剑诀', type: 'skill', quality: 'EPIC', basePrice: 15000 },
  { id: 'bm_skill_3', name: '天剑诀', type: 'skill', quality: 'LEGENDARY', basePrice: 80000 },
  // 坐骑
  { id: 'bm_mount_1', name: '赤兔马', type: 'mount', quality: 'RARE', basePrice: 10000 },
  { id: 'bm_mount_2', name: '避水金睛兽', type: 'mount', quality: 'EPIC', basePrice: 50000 },
  { id: 'bm_mount_3', name: '鲲鹏', type: 'mount', quality: 'MYTHIC', basePrice: 500000 }
];

// 黑市配置
const BLACKMARKET_CONFIG = {
  // 刷新间隔(小时)
  refreshInterval: 6,
  // 每次展示商品数
  itemCount: 8,
  // 持续时间(小时)
  duration: 2,
  // 最低刷新等级
  minLevel: 15
};

// 玩家黑市数据
const playerBlackmarket = new Map<number, any>();

// 生成黑市商品
function generateItems(): any[] {
  const shuffled = [...BLACKMARKET_ITEMS].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, BLACKMARKET_CONFIG.itemCount);
  
  return selected.map(item => {
    const quality = BLACKMARKET_QUALITY[item.quality as keyof typeof BLACKMARKET_QUALITY];
    const finalPrice = Math.floor(item.basePrice * quality.discount);
    
    return {
      ...item,
      qualityInfo: quality,
      price: finalPrice,
      originalPrice: item.basePrice,
      discount: Math.round((1 - quality.discount) * 100),
      stock: Math.floor(Math.random() * 5) + 1,
      expiresAt: Date.now() + BLACKMARKET_CONFIG.duration * 60 * 60 * 1000
    };
  });
}

// 玩家进入黑市
export function enterBlackmarket(playerId: number, playerLevel: number): any {
  if (playerLevel < BLACKMARKET_CONFIG.minLevel) {
    return { 
      success: false, 
      message: `等级达到${BLACKMARKET_CONFIG.minLevel}级才能进入黑市` 
    };
  }

  let market = playerBlackmarket.get(playerId);
  const now = Date.now();

  // 检查是否需要刷新
  if (!market || now > market.expiresAt) {
    market = {
      items: generateItems(),
      refreshAt: now + BLACKMARKET_CONFIG.refreshInterval * 60 * 60 * 1000,
      expiresAt: now + BLACKMARKET_CONFIG.duration * 60 * 60 * 1000,
      enterCount: 0
    };
    playerBlackmarket.set(playerId, market);
  }

  market.enterCount = (market.enterCount || 0) + 1;

  return {
    success: true,
    market: {
      items: market.items,
      refreshAt: market.refreshAt,
      expiresAt: market.expiresAt,
      remainingTime: Math.max(0, market.expiresAt - now)
    }
  };
}

// 购买黑市商品
export function buyBlackmarketItem(playerId: number, itemId: string): any {
  const market = playerBlackmarket.get(playerId);
  if (!market) {
    return { success: false, message: '请先进入黑市' };
  }

  if (Date.now() > market.expiresAt) {
    return { success: false, message: '黑市已关闭' };
  }

  const itemIndex = market.items.findIndex((item: any) => item.id === itemId);
  if (itemIndex === -1) {
    return { success: false, message: '商品不存在' };
  }

  const item = market.items[itemIndex];
  if (item.stock <= 0) {
    return { success: false, message: '商品已售罄' };
  }

  // 扣除金币
  const player = getPlayerGold?.(playerId);
  if (!player || player.gold < item.price) {
    return { success: false, message: '金币不足' };
  }

  // 扣除金币
  player.gold -= item.price;
  item.stock--;

  return {
    success: true,
    message: `购买成功！花费${item.price}金币`,
    purchasedItem: {
      ...item,
      quantity: 1
    },
    remainingGold: player.gold
  };
}

// 刷新黑市
export function refreshBlackmarket(playerId: number): any {
  const market = playerBlackmarket.get(playerId);
  if (!market) {
    return { success: false, message: '请先进入黑市' };
  }

  const now = Date.now();
  if (now < market.refreshAt) {
    return { 
      success: false, 
      message: `刷新冷却中，${Math.ceil((market.refreshAt - now) / 60 / 1000)}分钟后可刷新` 
    };
  }

  // 刷新商品
  market.items = generateItems();
  market.refreshAt = now + BLACKMARKET_CONFIG.refreshInterval * 60 * 60 * 1000;
  market.expiresAt = now + BLACKMARKET_CONFIG.duration * 60 * 60 * 1000;

  return {
    success: true,
    message: '黑市刷新成功！',
    market: {
      items: market.items,
      refreshAt: market.refreshAt,
      expiresAt: market.expiresAt
    }
  };
}

// 获取玩家数据函数 (需外部注入)
let getPlayerGold: ((id: number) => any) | null = null;
export function setPlayerGoldGetter(fn: (id: number) => any) {
  getPlayerGold = fn;
}

export default {
  enterBlackmarket,
  buyBlackmarketItem,
  refreshBlackmarket,
  setPlayerGoldGetter,
  BLACKMARKET_CONFIG,
  BLACKMARKET_QUALITY
};
