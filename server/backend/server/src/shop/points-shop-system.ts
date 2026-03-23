/**
 * 积分商店与黑市系统 v21
 * 包含：积分商店、黑市系统
 */

// ============ 积分商店配置 ============
export const POINTS_SHOP_CONFIG = {
  // 商店类型
  shopTypes: {
    NORMAL: 1,     // 普通积分商店
    VIP: 2,        // VIP积分商店
    MERIT: 3,      // 功勋商店
    HONOR: 4,      // 荣誉商店
    ARENA: 5,      // 竞技场商店
    GUILD: 6,      // 公会商店
  },

  // 积分类型
  pointsTypes: {
    GOLD: 'gold_points',           // 金币积分
    VIP: 'vip_points',             // VIP积分
    MERIT: 'merit_points',         // 功勋
    HONOR: 'honor_points',         // 荣誉
    ARENA: 'arena_points',         // 竞技场积分
    GUILD_CONTRIBUTE: 'guild_contribute', // 公会贡献
  },

  // 刷新配置
  refreshConfig: {
    autoRefresh: true,           // 自动刷新
    refreshInterval: 6 * 60 * 60 * 1000, // 6小时刷新一次
    freeRefreshTimes: 1,         // 免费刷新次数
    costRefreshTimes: 3,         // 付费刷新次数限制
    refreshCost: [50, 100, 200], // 每次刷新消耗元宝
  },

  // 商品数量
  goodsCount: {
    normal: 12,
    vip: 8,
    merit: 6,
    honor: 8,
    arena: 10,
    guild: 12,
  },

  // 购买限制
  purchaseLimits: {
    daily: 'daily',     // 每日限购
    weekly: 'weekly',   // 每周限购
    permanent: 'permanent', // 终身限购
  },

  // 折扣配置
  discountConfig: {
    vipDiscount: {
      1: 95,   // VIP1: 95折
      2: 90,   // VIP2: 9折
      3: 85,   // VIP3: 85折
      4: 80,   // VIP4: 8折
      5: 75,   // VIP5: 75折
      6: 70,   // VIP6: 7折
      7: 65,   // VIP7: 65折
      8: 60,   // VIP8: 6折
      9: 55,   // VIP9: 55折
      10: 50,  // VIP10: 5折
    },
    firstPurchaseDiscount: 50,   // 首购半价
  },
};

// ============ 黑市配置 ============
export const BLACK_MARKET_CONFIG = {
  // 黑市类型
  marketTypes: {
    NORMAL: 1,     // 普通黑市
    SECRET: 2,     // 隐秘黑市 (需要特殊道具进入)
    AUCTION: 3,    // 拍卖行
  },

  // 刷新规则
  refreshRules: {
    normal: {
      interval: 3 * 60 * 60 * 1000, // 3小时刷新
      autoRefresh: true,
    },
    secret: {
      interval: 24 * 60 * 60 * 1000, // 24小时刷新
      autoRefresh: false,
    },
    auction: {
      interval: 0, // 拍卖行手动上架
      autoRefresh: false,
    },
  },

  // 商品配置
  goodsConfig: {
    minItems: 4,
    maxItems: 8,
    priceMultiplier: {
      min: 1.2,  // 最低1.2倍
      max: 3.0,  // 最高3倍
    },
    discountChance: 0.1,    // 折扣概率
    discountRange: [70, 90], // 折扣范围 (70%-90%)
  },

  // 交易配置
  tradeConfig: {
    listingFee: 100,           // 上架费 (元宝)
    transactionTax: 0.05,      // 交易税 5%
    maxListings: 10,          // 最大上架数量
    minListingTime: 1 * 60 * 60 * 1000,  // 最短上架时间 1小时
    maxListingTime: 24 * 60 * 60 * 1000, // 最长上架时间 24小时
  },

  // 神秘商人配置
  mysteriousMerchant: {
    spawnChance: 0.05,         // 出现概率 5%
    discountMin: 50,           // 最低折扣 50%
    discountMax: 80,          // 最高折扣 80%
    refreshCost: 100,         // 刷新消耗元宝
    specialItems: [           // 神秘商品
      { id: 'rare_material_1', weight: 30 },
      { id: 'rare_material_2', weight: 20 },
      { id: 'legendary_item', weight: 5 },
    ],
  },
};

// ============ 积分商店商品模板 ============
export const POINTS_SHOP_GOODS: Record<number, Array<{
  id: string;
  name: string;
  type: number;
  price: number;
  priceType: string;
  limit: { type: string; count: number };
  vipRequired: number;
  discountable: boolean;
  stock: number;
}>> = {
  [POINTS_SHOP_CONFIG.shopTypes.NORMAL]: [
    { id: 'gold_1000', name: '金币x1000', type: 1, price: 10, priceType: 'gold_points', limit: { type: 'daily', count: 100 }, vipRequired: 0, discountable: true, stock: -1 },
    { id: 'exp_100', name: '经验x100', type: 1, price: 20, priceType: 'gold_points', limit: { type: 'daily', count: 50 }, vipRequired: 0, discountable: true, stock: -1 },
    { id: 'spirit_stone_10', name: '灵石x10', type: 2, price: 50, priceType: 'gold_points', limit: { type: 'daily', count: 20 }, vipRequired: 0, discountable: true, stock: -1 },
    { id: 'rare_box', name: '稀有宝箱', type: 3, price: 100, priceType: 'gold_points', limit: { type: 'weekly', count: 5 }, vipRequired: 0, discountable: true, stock: 100 },
    { id: 'skill_book', name: '技能书', type: 4, price: 200, priceType: 'gold_points', limit: { type: 'permanent', count: 10 }, vipRequired: 1, discountable: true, stock: -1 },
  ],
  [POINTS_SHOP_CONFIG.shopTypes.VIP]: [
    { id: 'vip_chest', name: 'VIP宝箱', type: 3, price: 100, priceType: 'vip_points', limit: { type: 'daily', count: 1 }, vipRequired: 1, discountable: false, stock: 10 },
    { id: 'legendary_equip', name: '传奇装备', type: 5, price: 500, priceType: 'vip_points', limit: { type: 'permanent', count: 1 }, vipRequired: 5, discountable: false, stock: 1 },
    { id: 'awaken_material', name: '觉醒材料', type: 6, price: 300, priceType: 'vip_points', limit: { type: 'weekly', count: 10 }, vipRequired: 3, discountable: false, stock: -1 },
  ],
  [POINTS_SHOP_CONFIG.shopTypes.MERIT]: [
    { id: 'merit_title', name: '功勋称号', type: 7, price: 1000, priceType: 'merit_points', limit: { type: 'permanent', count: 1 }, vipRequired: 0, discountable: false, stock: 1 },
    { id: 'merit_equip', name: '功勋装备', type: 5, price: 500, priceType: 'merit_points', limit: { type: 'permanent', count: 3 }, vipRequired: 0, discountable: false, stock: -1 },
  ],
  [POINTS_SHOP_CONFIG.shopTypes.HONOR]: [
    { id: 'honor_title', name: '荣誉称号', type: 7, price: 800, priceType: 'honor_points', limit: { type: 'permanent', count: 1 }, vipRequired: 0, discountable: false, stock: 1 },
    { id: 'honor_skill', name: '荣誉技能', type: 4, price: 400, priceType: 'honor_points', limit: { type: 'permanent', count: 5 }, vipRequired: 0, discountable: false, stock: -1 },
  ],
  [POINTS_SHOP_CONFIG.shopTypes.ARENA]: [
    { id: 'arena_weapon', name: '竞技场武器', type: 5, price: 1000, priceType: 'arena_points', limit: { type: 'permanent', count: 1 }, vipRequired: 0, discountable: false, stock: 1 },
    { id: 'arena_skin', name: '竞技场皮肤', type: 8, price: 500, priceType: 'arena_points', limit: { type: 'permanent', count: 1 }, vipRequired: 0, discountable: false, stock: 1 },
  ],
  [POINTS_SHOP_CONFIG.shopTypes.GUILD]: [
    { id: 'guild_title', name: '公会专属称号', type: 7, price: 1000, priceType: 'guild_contribute', limit: { type: 'permanent', count: 1 }, vipRequired: 0, discountable: false, stock: 1 },
    { id: 'guild_skill', name: '公会技能升级', type: 4, price: 500, priceType: 'guild_contribute', limit: { type: 'daily', count: 10 }, vipRequired: 0, discountable: false, stock: -1 },
  ],
};

// ============ 黑市商品模板 ============
const BLACK_MARKET_GOODS = [
  { id: 'rare_material', name: '稀有材料', basePrice: 100, weight: 30 },
  { id: 'epic_material', name: '史诗材料', basePrice: 500, weight: 20 },
  { id: 'legendary_material', name: '传说材料', basePrice: 2000, weight: 10 },
  { id: 'rare_equip', name: '稀有装备', basePrice: 800, weight: 15 },
  { id: 'epic_equip', name: '史诗装备', basePrice: 3000, weight: 10 },
  { id: 'skill_book_rare', name: '稀有技能书', basePrice: 1500, weight: 10 },
  { id: 'pet_egg', name: '宠物蛋', basePrice: 2000, weight: 3 },
  { id: 'fashion', name: '时装', basePrice: 5000, weight: 2 },
];

// ============ 积分商店类 ============
interface ShopGoods {
  id: string;
  name: string;
  type: number;
  price: number;
  originalPrice: number;
  priceType: string;
  limit: { type: string; count: number };
  vipRequired: number;
  discountable: boolean;
  stock: number;
  discount?: number; // 折扣率 (0-100)
}

interface PlayerShopData {
  playerId: string;
  shopType: number;
  goods: ShopGoods[];
  lastRefreshTime: number;
  refreshTimes: number;
  purchaseRecords: Map<string, { daily: number; weekly: number; permanent: number }>;
}

export class PointsShopSystem {
  private playerShopData: Map<string, PlayerShopData> = new Map();
  private templateGoods: Map<number, ShopGoods[]> = new Map();

  constructor() {
    // 初始化商品模板
    this.initTemplates();
  }

  private initTemplates() {
    for (const [shopType, goods] of Object.entries(POINTS_SHOP_GOODS)) {
      const typedGoods = goods.map(g => ({
        ...g,
        originalPrice: g.price,
        stock: g.stock,
      }));
      this.templateGoods.set(parseInt(shopType), typedGoods);
    }
  }

  /**
   * 打开商店
   */
  openShop(playerId: string, shopType: number, vipLevel: number = 0): PlayerShopData {
    const key = `${playerId}_${shopType}`;
    let data = this.playerShopData.get(key);

    if (!data) {
      // 创建新的商店数据
      data = {
        playerId,
        shopType,
        goods: [],
        lastRefreshTime: Date.now(),
        refreshTimes: 0,
        purchaseRecords: new Map(),
      };
      this.refreshGoods(data, vipLevel);
      this.playerShopData.set(key, data);
    } else {
      // 检查是否需要刷新
      const shouldRefresh = this.shouldRefresh(data);
      if (shouldRefresh) {
        this.refreshGoods(data, vipLevel);
      }
    }

    return data;
  }

  /**
   * 是否应该刷新
   */
  private shouldRefresh(data: PlayerShopData): boolean {
    const config = POINTS_SHOP_CONFIG.refreshConfig;
    const now = Date.now();
    return now - data.lastRefreshTime >= config.refreshInterval;
  }

  /**
   * 刷新商品
   */
  refreshGoods(data: PlayerShopData, vipLevel: number = 0): void {
    const template = this.templateGoods.get(data.shopType);
    if (!template) return;

    // 重置刷新次数
    data.refreshTimes = 0;
    data.lastRefreshTime = Date.now();

    // 随机选择商品
    const count = POINTS_SHOP_CONFIG.goodsCount[data.shopType as keyof typeof POINTS_SHOP_CONFIG.goodsCount] || 6;
    const shuffled = [...template].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(count, template.length));

    // 应用VIP折扣和随机折扣
    data.goods = selected.map(goods => {
      let price = goods.originalPrice;
      let discount: number | undefined;

      // VIP折扣
      if (goods.discountable && vipLevel > 0) {
        const vipDiscount = POINTS_SHOP_CONFIG.discountConfig.vipDiscount[vipLevel as keyof typeof POINTS_SHOP_CONFIG.discountConfig.vipDiscount];
        if (vipDiscount) {
          price = Math.floor(price * vipDiscount / 100);
          discount = vipDiscount;
        }
      }

      // 随机折扣
      if (goods.discountable && Math.random() < 0.2) {
        const randomDiscount = Math.floor(Math.random() * 20) + 80; // 80-100%
        if (!discount || randomDiscount < discount) {
          price = Math.floor(goods.originalPrice * randomDiscount / 100);
          discount = randomDiscount;
        }
      }

      return {
        ...goods,
        price,
        discount,
      };
    });
  }

  /**
   * 手动刷新
   */
  manualRefresh(playerId: string, shopType: number, vipLevel: number = 0, cost: number = 0): { success: boolean; error?: string; cost?: number } {
    const key = `${playerId}_${shopType}`;
    const data = this.playerShopData.get(key);

    if (!data) {
      return { success: false, error: '请先打开商店' };
    }

    const config = POINTS_SHOP_CONFIG.refreshConfig;
    
    // 检查免费刷新次数
    if (data.refreshTimes < config.freeRefreshTimes) {
      data.refreshTimes++;
      this.refreshGoods(data, vipLevel);
      return { success: true, cost: 0 };
    }

    // 检查付费刷新次数
    if (data.refreshTimes >= config.costRefreshTimes + config.freeRefreshTimes) {
      return { success: false, error: '今日刷新次数已用完' };
    }

    // 计算刷新费用
    const costIndex = Math.min(data.refreshTimes - config.freeRefreshTimes, config.refreshCost.length - 1);
    const refreshCost = cost || config.refreshCost[costIndex];

    data.refreshTimes++;
    this.refreshGoods(data, vipLevel);

    return { success: true, cost: refreshCost };
  }

  /**
   * 购买商品
   */
  purchaseGoods(playerId: string, shopType: number, goodsId: string, points: number): { success: boolean; error?: string; pointsSpent?: number } {
    const key = `${playerId}_${shopType}`;
    const data = this.playerShopData.get(key);

    if (!data) {
      return { success: false, error: '请先打开商店' };
    }

    // 查找商品
    const goods = data.goods.find(g => g.id === goodsId);
    if (!goods) {
      return { success: false, error: '商品不存在' };
    }

    // 检查VIP需求
    // const vipRequired = goods.vipRequired; // TODO: check vip level

    // 检查积分是否足够
    if (points < goods.price) {
      return { success: false, error: '积分不足' };
    }

    // 检查购买限制
    const record = data.purchaseRecords.get(goodsId) || { daily: 0, weekly: 0, permanent: 0 };
    const limitType = goods.limit.type;
    const limitCount = goods.limit.count;

    if (record[limitType as keyof typeof record] >= limitCount) {
      return { success: false, error: `已达到${limitType === 'daily' ? '每日' : limitType === 'weekly' ? '每周' : '终身'}购买上限` };
    }

    // 检查库存
    if (goods.stock > 0) {
      // 实际库存检查需要从物品系统获取，这里简化处理
    }

    // 扣除积分并更新购买记录
    record[limitType as keyof typeof record]++;
    data.purchaseRecords.set(goodsId, record);

    return { success: true, pointsSpent: goods.price };
  }

  /**
   * 获取玩家积分
   */
  getPlayerPoints(playerId: string): Record<string, number> {
    // 这里应该从玩家数据中获取实际积分
    // 简化返回空对象
    return {};
  }

  /**
   * 获取商店商品
   */
  getGoods(playerId: string, shopType: number): ShopGoods[] {
    const key = `${playerId}_${shopType}`;
    const data = this.playerShopData.get(key);
    return data?.goods || [];
  }
}

// ============ 黑市系统类 ============
interface BlackMarketGoods {
  id: string;
  name: string;
  type: number;
  price: number;
  originalPrice: number;
  discount?: number;
  isMysterious?: boolean;
  expireTime: number;
}

interface PlayerBlackMarketData {
  playerId: string;
  marketType: number;
  goods: BlackMarketGoods[];
  lastRefreshTime: number;
  mysteriousMerchant: boolean;
}

interface AuctionListing {
  id: string;
  sellerId: string;
  goodsId: string;
  goodsName: string;
  price: number;
  createTime: number;
  expireTime: number;
  status: 'active' | 'sold' | 'expired';
}

export class BlackMarketSystem {
  private playerMarketData: Map<string, PlayerBlackMarketData> = new Map();
  private auctionListings: Map<string, AuctionListing> = new Map();

  /**
   * 打开黑市
   */
  openBlackMarket(playerId: string, marketType: number = BLACK_MARKET_CONFIG.marketTypes.NORMAL): PlayerBlackMarketData {
    const key = `${playerId}_${marketType}`;
    let data = this.playerMarketData.get(key);

    if (!data) {
      data = {
        playerId,
        marketType,
        goods: [],
        lastRefreshTime: 0,
        mysteriousMerchant: false,
      };
    }

    // 检查是否需要刷新
    const rules = this.getRefreshRules(marketType);
    const now = Date.now();
    
    if (data.lastRefreshTime === 0 || now - data.lastRefreshTime >= rules.interval) {
      this.refreshGoods(data);
    }

    this.playerMarketData.set(key, data);
    return data;
  }

  private getRefreshRules(marketType: number) {
    switch (marketType) {
      case BLACK_MARKET_CONFIG.marketTypes.NORMAL:
        return BLACK_MARKET_CONFIG.refreshRules.normal;
      case BLACK_MARKET_CONFIG.marketTypes.SECRET:
        return BLACK_MARKET_CONFIG.refreshRules.secret;
      default:
        return BLACK_MARKET_CONFIG.refreshRules.normal;
    }
  }

  /**
   * 刷新商品
   */
  private refreshGoods(data: PlayerBlackMarketData): void {
    const config = BLACK_MARKET_CONFIG.goodsConfig;
    const itemCount = Math.floor(Math.random() * (config.maxItems - config.minItems + 1)) + config.minItems;
    
    const shuffled = [...BLACK_MARKET_GOODS].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, itemCount);

    data.goods = selected.map(item => {
      const multiplier = config.priceMultiplier.min + Math.random() * (config.priceMultiplier.max - config.priceMultiplier.min);
      const price = Math.floor(item.basePrice * multiplier);
      
      let discount: number | undefined;
      if (Math.random() < config.discountChance) {
        discount = config.discountRange[0] + Math.floor(Math.random() * (config.discountRange[1] - config.discountRange[0]));
      }

      return {
        id: item.id,
        name: item.name,
        type: 1,
        price: discount ? Math.floor(price * discount / 100) : price,
        originalPrice: price,
        discount,
        expireTime: Date.now() + BLACK_MARKET_CONFIG.refreshRules.normal.interval,
      };
    });

    data.lastRefreshTime = Date.now();

    // 神秘商人检查
    if (Math.random() < BLACK_MARKET_CONFIG.mysteriousMerchant.spawnChance) {
      data.mysteriousMerchant = true;
    }
  }

  /**
   * 手动刷新
   */
  manualRefresh(playerId: string, marketType: number): { success: boolean; error?: string; cost?: number } {
    const key = `${playerId}_${marketType}`;
    const data = this.playerMarketData.get(key);

    if (!data) {
      return { success: false, error: '请先打开黑市' };
    }

    this.refreshGoods(data);
    return { success: true, cost: 0 };
  }

  /**
   * 刷新神秘商人
   */
  refreshMysteriousMerchant(playerId: string, cost: number = BLACK_MARKET_CONFIG.mysteriousMerchant.refreshCost): { success: boolean; goods?: BlackMarketGoods[]; error?: string } {
    const key = `${playerId}_${BLACK_MARKET_CONFIG.marketTypes.NORMAL}`;
    const data = this.playerMarketData.get(key);

    if (!data) {
      return { success: false, error: '请先打开黑市' };
    }

    if (!data.mysteriousMerchant) {
      return { success: false, error: '神秘商人未出现' };
    }

    // 生成神秘商品
    const specialItems = BLACK_MARKET_CONFIG.mysteriousMerchant.specialItems;
    const mysteryGoods: BlackMarketGoods[] = specialItems.map(item => {
      const discount = BLACK_MARKET_CONFIG.mysteriousMerchant.discountMin + 
        Math.floor(Math.random() * (BLACK_MARKET_CONFIG.mysteriousMerchant.discountMax - BLACK_MARKET_CONFIG.mysteriousMerchant.discountMin));
      
      // 简化价格计算
      const basePrice = 1000;
      const price = Math.floor(basePrice * discount / 100);

      return {
        id: item.id,
        name: item.name,
        type: 1,
        price,
        originalPrice: basePrice,
        discount,
        isMysterious: true,
        expireTime: Date.now() + 30 * 60 * 1000, // 30分钟有效期
      };
    });

    data.mysteriousMerchant = false;
    
    return { success: true, goods: mysteryGoods };
  }

  /**
   * 购买商品
   */
  purchaseGoods(playerId: string, marketType: number, goodsId: string, money: number): { success: boolean; error?: string } {
    const key = `${playerId}_${marketType}`;
    const data = this.playerMarketData.get(key);

    if (!data) {
      return { success: false, error: '请先打开黑市' };
    }

    const goods = data.goods.find(g => g.id === goodsId);
    if (!goods) {
      return { success: false, error: '商品不存在' };
    }

    if (money < goods.price) {
      return { success: false, error: '元宝不足' };
    }

    // 检查是否过期
    if (Date.now() > goods.expireTime) {
      return { success: false, error: '商品已过期' };
    }

    // 从列表中移除
    data.goods = data.goods.filter(g => g.id !== goodsId);

    return { success: true };
  }

  /**
   * 上架物品到拍卖行
   */
  listItem(sellerId: string, goodsId: string, goodsName: string, price: number, duration: number = BLACK_MARKET_CONFIG.tradeConfig.maxListingTime): { success: boolean; listing?: AuctionListing; error?: string } {
    // 检查上架数量限制
    const sellerListings = this.getSellerListings(sellerId);
    if (sellerListings.length >= BLACK_MARKET_CONFIG.tradeConfig.maxListings) {
      return { success: false, error: '已达到最大上架数量' };
    }

    // 检查价格范围
    if (price <= 0) {
      return { success: false, error: '价格必须大于0' };
    }

    // 检查时长
    if (duration < BLACK_MARKET_CONFIG.tradeConfig.minListingTime || 
        duration > BLACK_MARKET_CONFIG.tradeConfig.maxListingTime) {
      return { success: false, error: '上架时间不在有效范围内' };
    }

    const listing: AuctionListing = {
      id: `auction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sellerId,
      goodsId,
      goodsName,
      price,
      createTime: Date.now(),
      expireTime: Date.now() + duration,
      status: 'active',
    };

    this.auctionListings.set(listing.id, listing);
    return { success: true, listing };
  }

  /**
   * 购买拍卖物品
   */
  purchaseAuctionItem(playerId: string, listingId: string, money: number): { success: boolean; error?: string } {
    const listing = this.auctionListings.get(listingId);
    if (!listing) {
      return { success: false, error: '物品不存在' };
    }

    if (listing.status !== 'active') {
      return { success: false, error: '物品已下架' };
    }

    if (Date.now() > listing.expireTime) {
      listing.status = 'expired';
      return { success: false, error: '物品已过期' };
    }

    if (money < listing.price) {
      return { success: false, error: '元宝不足' };
    }

    if (listing.sellerId === playerId) {
      return { success: false, error: '不能购买自己的物品' };
    }

    // 计算交易税
    const tax = Math.floor(listing.price * BLACK_MARKET_CONFIG.tradeConfig.transactionTax);
    const sellerGet = listing.price - tax;

    // 更新状态
    listing.status = 'sold';

    return { success: true };
  }

  /**
   * 获取卖家的上架物品
   */
  private getSellerListings(sellerId: string): AuctionListing[] {
    return Array.from(this.auctionListings.values()).filter(
      l => l.sellerId === sellerId && l.status === 'active'
    );
  }

  /**
   * 获取拍卖行列表
   */
  getAuctionList(page: number = 1, pageSize: number = 20): AuctionListing[] {
    const active = Array.from(this.auctionListings.values())
      .filter(l => l.status === 'active' && l.expireTime > Date.now())
      .sort((a, b) => b.createTime - a.createTime);

    const start = (page - 1) * pageSize;
    return active.slice(start, start + pageSize);
  }

  /**
   * 下架物品
   */
  delistItem(playerId: string, listingId: string): { success: boolean; error?: string } {
    const listing = this.auctionListings.get(listingId);
    if (!listing) {
      return { success: false, error: '物品不存在' };
    }

    if (listing.sellerId !== playerId) {
      return { success: false, error: '不是您的物品' };
    }

    if (listing.status !== 'active') {
      return { success: false, error: '物品状态异常' };
    }

    listing.status = 'expired';
    return { success: true };
  }
}

// 导出单例
export const pointsShopSystem = new PointsShopSystem();
export const blackMarketSystem = new BlackMarketSystem();
