/**
 * 交易行系统 (Trade System)
 * 物品上架/下架、竞价/一口价、交易税
 */

class TradeSystem {
  constructor() {
    // 交易税率 (5%)
    this.TRADE_TAX_RATE = 0.05;
    
    // 上架物品列表
    this.listings = new Map();
    
    // 竞价列表
    this.auctions = new Map();
    
    // 竞价超时时间 (毫秒) - 默认24小时
    this.AUCTION_DURATION = 24 * 60 * 60 * 1000;
    
    // 单个玩家最大上架数量
    this.MAX_LISTINGS_PER_PLAYER = 20;
    
    // 最小价格
    this.MIN_PRICE = 1;
    
    // 列表ID计数器
    this._listingIdCounter = 1;
    this._auctionIdCounter = 1;
  }

  // ============ 核心方法 ============

  /**
   * 物品上架
   * @param {string} playerId - 玩家ID
   * @param {string} itemId - 物品ID
   * @param {number} price - 价格
   * @param {string} type - 上架类型: 'fixed' (一口价) 或 'auction' (竞价)
   * @returns {object} 上架结果
   */
  listItem(playerId, itemId, price, type = 'fixed') {
    // 验证参数
    if (!playerId || !itemId) {
      return { success: false, message: '参数不完整' };
    }

    if (price < this.MIN_PRICE) {
      return { success: false, message: `价格不能低于 ${this.MIN_PRICE}` };
    }

    if (type !== 'fixed' && type !== 'auction') {
      return { success: false, message: '上架类型必须是 fixed(一口价) 或 auction(竞价)' };
    }

    // 检查玩家上架数量
    const playerListings = this.getPlayerListings(playerId);
    if (playerListings.length >= this.MAX_LISTINGS_PER_PLAYER) {
      return { success: false, message: `最多上架 ${this.MAX_LISTINGS_PER_PLAYER} 件商品` };
    }

    // 生成上架ID
    const listingId = this._generateListingId();

    // 创建上架记录
    const listing = {
      id: listingId,
      playerId,
      itemId,
      price,
      type,
      status: 'active', // active, sold, cancelled
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // 如果是竞价，初始化竞价信息
    if (type === 'auction') {
      listing.highestBid = price;
      listing.highestBidder = null;
      listing.bids = [];
      listing.endTime = Date.now() + this.AUCTION_DURATION;
    }

    // 存储上架记录
    this.listings.set(listingId, listing);

    return {
      success: true,
      message: type === 'fixed' 
        ? `物品 ${itemId} 已上架，价格 ${price} 灵石（一口价）`
        : `物品 ${itemId} 已上架，起价 ${price} 灵石（竞价）`,
      listing
    };
  }

  /**
   * 购买物品 (一口价)
   * @param {string} buyerId - 购买者ID
   * @param {string} listingId - 上架ID
   * @returns {object} 购买结果
   */
  buyItem(buyerId, listingId) {
    // 查找上架记录
    const listing = this.listings.get(listingId);
    
    if (!listing) {
      return { success: false, message: '商品不存在或已下架' };
    }

    if (listing.status !== 'active') {
      return { success: false, message: '该商品已下架或已售出' };
    }

    if (listing.type !== 'fixed') {
      return { success: false, message: '请使用竞价出价' };
    }

    if (listing.playerId === buyerId) {
      return { success: false, message: '不能购买自己的商品' };
    }

    // 计算交易税
    const tax = this.calculateTax(listing.price);
    const sellerEarnings = listing.price - tax;

    // 更新上架状态
    listing.status = 'sold';
    listing.buyerId = buyerId;
    listing.soldAt = Date.now();
    listing.sellerEarnings = sellerEarnings;
    listing.tax = tax;

    this.listings.set(listingId, listing);

    return {
      success: true,
      message: `购买成功！花费 ${listing.price} 灵石`,
      transaction: {
        listingId,
        itemId: listing.itemId,
        price: listing.price,
        tax,
        sellerEarnings,
        buyerId,
        sellerId: listing.playerId,
        soldAt: listing.soldAt
      }
    };
  }

  /**
   * 竞价出价
   * @param {string} bidderId - 出价者ID
   * @param {string} listingId - 上架ID
   * @param {number} bidAmount - 出价金额
   * @returns {object} 出价结果
   */
  bidItem(bidderId, listingId, bidAmount) {
    // 查找上架记录
    const listing = this.listings.get(listingId);
    
    if (!listing) {
      return { success: false, message: '竞价不存在' };
    }

    if (listing.status !== 'active') {
      return { success: false, message: '该竞价已结束或已取消' };
    }

    if (listing.type !== 'auction') {
      return { success: false, message: '这不是竞价商品，请使用一口价购买' };
    }

    if (listing.playerId === bidderId) {
      return { success: false, message: '不能参与自己的竞价' };
    }

    // 检查竞价是否已过期
    if (Date.now() > listing.endTime) {
      listing.status = 'expired';
      this.listings.set(listingId, listing);
      return { success: false, message: '竞价已结束' };
    }

    // 检查出价
    if (bidAmount <= listing.highestBid) {
      return { success: false, message: `出价必须高于当前最高价 ${listing.highestBid}` };
    }

    // 记录出价
    const bid = {
      bidderId,
      amount: bidAmount,
      timestamp: Date.now()
    };

    listing.bids.push(bid);
    listing.highestBid = bidAmount;
    listing.highestBidder = bidderId;
    listing.updatedAt = Date.now();

    this.listings.set(listingId, listing);

    return {
      success: true,
      message: `出价成功：${bidAmount} 灵石`,
      bid
    };
  }

  /**
   * 结束竞价并成交
   * @param {string} listingId - 上架ID
   * @returns {object} 结算结果
   */
  settleAuction(listingId) {
    const listing = this.listings.get(listingId);

    if (!listing) {
      return { success: false, message: '竞价不存在' };
    }

    if (listing.type !== 'auction') {
      return { success: false, message: '这不是竞价商品' };
    }

    if (listing.status !== 'active') {
      return { success: false, message: '该竞价已结束' };
    }

    // 检查是否已过期
    if (Date.now() < listing.endTime) {
      return { success: false, message: '竞价尚未结束' };
    }

    // 如果没有出价者，流拍
    if (!listing.highestBidder) {
      listing.status = 'expired';
      this.listings.set(listingId, listing);
      return {
        success: true,
        message: '竞价流拍，无人出价',
        listing
      };
    }

    // 计算交易税
    const tax = this.calculateTax(listing.highestBid);
    const sellerEarnings = listing.highestBid - tax;

    // 更新状态
    listing.status = 'sold';
    listing.buyerId = listing.highestBidder;
    listing.soldAt = Date.now();
    listing.sellerEarnings = sellerEarnings;
    listing.tax = tax;

    this.listings.set(listingId, listing);

    return {
      success: true,
      message: `竞价成交！成交价 ${listing.highestBid} 灵石`,
      transaction: {
        listingId,
        itemId: listing.itemId,
        price: listing.highestBid,
        tax,
        sellerEarnings,
        buyerId: listing.highestBidder,
        sellerId: listing.playerId,
        soldAt: listing.soldAt
      }
    };
  }

  /**
   * 下架物品
   * @param {string} playerId - 玩家ID
   * @param {string} listingId - 上架ID
   * @returns {object} 下架结果
   */
  cancelListing(playerId, listingId) {
    // 查找上架记录
    const listing = this.listings.get(listingId);

    if (!listing) {
      return { success: false, message: '商品不存在' };
    }

    if (listing.playerId !== playerId) {
      return { success: false, message: '只能下架自己的商品' };
    }

    if (listing.status !== 'active') {
      return { success: false, message: '该商品已下架或已售出' };
    }

    // 更新状态
    listing.status = 'cancelled';
    listing.cancelledAt = Date.now();
    this.listings.set(listingId, listing);

    return {
      success: true,
      message: '商品已下架',
      listing
    };
  }

  // ============ 查询方法 ============

  /**
   * 获取玩家所有上架物品
   * @param {string} playerId - 玩家ID
   * @returns {array} 上架列表
   */
  getPlayerListings(playerId) {
    const result = [];
    for (const listing of this.listings.values()) {
      if (listing.playerId === playerId && listing.status === 'active') {
        result.push(listing);
      }
    }
    return result;
  }

  /**
   * 获取所有一口价商品
   * @param {object} filters - 过滤条件
   * @returns {array} 商品列表
   */
  getFixedListings(filters = {}) {
    const result = [];
    for (const listing of this.listings.values()) {
      if (listing.type !== 'fixed' || listing.status !== 'active') continue;
      
      if (filters.itemId && listing.itemId !== filters.itemId) continue;
      if (filters.maxPrice && listing.price > filters.maxPrice) continue;
      if (filters.minPrice && listing.price < filters.minPrice) continue;
      
      result.push(listing);
    }
    return result;
  }

  /**
   * 获取所有竞价商品
   * @param {object} filters - 过滤条件
   * @returns {array} 竞价列表
   */
  getAuctionListings(filters = {}) {
    const result = [];
    for (const listing of this.listings.values()) {
      if (listing.type !== 'auction' || listing.status !== 'active') continue;
      
      // 过滤已过期的竞价
      if (Date.now() > listing.endTime) {
        listing.status = 'expired';
        this.listings.set(listing.id, listing);
        continue;
      }
      
      if (filters.itemId && listing.itemId !== filters.itemId) continue;
      if (filters.maxPrice && listing.highestBid > filters.maxPrice) continue;
      if (filters.minPrice && listing.highestBid < filters.minPrice) continue;
      
      result.push(listing);
    }
    return result;
  }

  /**
   * 获取单个上架详情
   * @param {string} listingId - 上架ID
   * @returns {object|null} 上架详情
   */
  getListing(listingId) {
    return this.listings.get(listingId) || null;
  }

  // ============ 工具方法 ============

  /**
   * 计算交易税
   * @param {number} price - 交易价格
   * @returns {number} 税额
   */
  calculateTax(price) {
    return Math.floor(price * this.TRADE_TAX_RATE);
  }

  /**
   * 获取交易税率
   * @returns {number} 税率
   */
  getTaxRate() {
    return this.TRADE_TAX_RATE;
  }

  /**
   * 设置交易税率
   * @param {number} rate - 新税率 (0-1)
   */
  setTaxRate(rate) {
    if (rate < 0 || rate > 1) {
      throw new Error('税率必须在 0-1 之间');
    }
    this.TRADE_TAX_RATE = rate;
  }

  /**
   * 获取交易统计
   * @returns {object} 统计信息
   */
  getStats() {
    let totalSales = 0;
    let totalRevenue = 0;
    let totalTax = 0;
    let fixedCount = 0;
    let auctionCount = 0;

    for (const listing of this.listings.values()) {
      if (listing.status === 'sold') {
        totalSales++;
        totalRevenue += listing.price;
        totalTax += listing.tax || 0;
      } else if (listing.status === 'active') {
        if (listing.type === 'fixed') fixedCount++;
        else auctionCount++;
      }
    }

    return {
      totalListings: this.listings.size,
      activeFixedListings: fixedCount,
      activeAuctionListings: auctionCount,
      totalSales,
      totalRevenue,
      totalTax,
      taxRate: this.TRADE_TAX_RATE * 100 + '%'
    };
  }

  /**
   * 清理过期竞价
   * @returns {number} 清理数量
   */
  cleanupExpiredAuctions() {
    let count = 0;
    for (const listing of this.listings.values()) {
      if (listing.type === 'auction' && listing.status === 'active' && Date.now() > listing.endTime) {
        listing.status = 'expired';
        this.listings.set(listing.id, listing);
        count++;
      }
    }
    return count;
  }

  // 生成唯一上架ID
  _generateListingId() {
    return `LIST_${Date.now()}_${this._listingIdCounter++}`;
  }

  // 导出数据 (用于持久化)
  exportData() {
    return {
      listings: Array.from(this.listings.entries()),
      stats: {
        taxRate: this.TRADE_TAX_RATE,
        maxListingsPerPlayer: this.MAX_LISTINGS_PER_PLAYER,
        auctionDuration: this.AUCTION_DURATION
      }
    };
  }

  // 导入数据 (用于持久化)
  importData(data) {
    if (data.listings) {
      this.listings = new Map(data.listings);
    }
    if (data.stats) {
      this.TRADE_TAX_RATE = data.stats.taxRate ?? this.TRADE_TAX_RATE;
      this.MAX_LISTINGS_PER_PLAYER = data.stats.maxListingsPerPlayer ?? this.MAX_LISTINGS_PER_PLAYER;
      this.AUCTION_DURATION = data.stats.auctionDuration ?? this.AUCTION_DURATION;
    }
  }
}

// 导出
module.exports = TradeSystem;
