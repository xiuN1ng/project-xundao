// 资源交易系统 - 玩家之间交易金币、道具
// 支持自由市场、拍卖行、玩家店铺

export interface TradeOrder {
  orderId: string
  sellerId: string
  buyerId?: string
  itemTemplateId: string
  itemName: string
  quantity: number
  pricePerUnit: number
  totalPrice: number
  status: 'selling' | 'sold' | 'cancelled' | 'expired'
  createTime: number
  expireTime: number
  buyerOrderId?: string  // 对应的买家订单
}

export interface PlayerStore {
  storeId: string
  playerId: string
  storeName: string
  description: string
  items: StoreItem[]
  rating: number      // 店铺评分
  ratingCount: number // 评分次数
  salesCount: number  // 销售次数
  createTime: number
}

export interface StoreItem {
  itemTemplateId: string
  itemName: string
  quantity: number
  pricePerUnit: number
}

export interface TradeTransaction {
  transactionId: string
  orderId: string
  sellerId: string
  buyerId: string
  itemTemplateId: string
  itemName: string
  quantity: number
  pricePerUnit: number
  totalPrice: number
  tradeTime: number
  tax: number  // 交易税
}

export interface MarketPrice {
  itemTemplateId: string
  avgPrice: number
  minPrice: number
  maxPrice: number
  volume24h: number  // 24小时成交量
  priceChange24h: number // 24小时价格变化
  lastUpdate: number
}

export interface TradeConfig {
  // 交易税
  taxRate: number
  // 拍卖行配置
  auction: {
    // 上架时间(小时)
    duration: number
    // 保证金
    deposit: number
    // 最低起拍价
    minStartPrice: number
    // 加价幅度
    bidIncrement: number
  }
  // 玩家店铺配置
  store: {
    // 开店费用
    openCost: number
    // 最大商品数量
    maxItems: number
    // 最多店铺数
    maxStores: number
  }
  // 订单配置
  order: {
    // 订单有效期(小时)
    duration: number
    // 最大同时上架数量
    maxOrders: number
    // 最低售价
    minPrice: number
    // 最高售价
    maxPrice: number
  }
  // 价格保护
  priceProtection: {
    // 最低价保护(相对历史均价)
    minRatio: number
    // 最高价保护(相对历史均价)
    maxRatio: number
  }
}

// 交易配置
export const TRADE_CONFIG: TradeConfig = {
  taxRate: 0.05,  // 5%交易税
  auction: {
    duration: 24,
    deposit: 1000,
    minStartPrice: 100,
    bidIncrement: 10
  },
  store: {
    openCost: 10000,
    maxItems: 20,
    maxStores: 3
  },
  order: {
    duration: 72,
    maxOrders: 50,
    minPrice: 1,
    maxPrice: 100000000
  },
  priceProtection: {
    minRatio: 0.3,
    maxRatio: 3.0
  }
}

// 交易系统
export class TradeSystem {
  private orders: Map<string, TradeOrder[]> = new Map()
  private stores: Map<string, PlayerStore[]> = new Map()
  private transactions: TradeTransaction[] = []
  private marketPrices: Map<string, MarketPrice> = new Map()
  private bidOrders: Map<string, { bidderId: string, bidPrice: number, bidTime: number }[]> = new Map()

  // 获取玩家的订单
  getPlayerOrders(playerId: string): TradeOrder[] {
    return this.orders.get(playerId) || []
  }

  // 获取市场订单列表
  getMarketOrders(itemTemplateId?: string, page: number = 1, pageSize: number = 20): { orders: TradeOrder[], total: number } {
    let allOrders: TradeOrder[] = []
    this.orders.forEach(orders => {
      allOrders = allOrders.concat(orders)
    })

    // 筛选进行中的订单
    const now = Date.now()
    allOrders = allOrders.filter(o => 
      o.status === 'selling' && o.expireTime > now
    )

    // 筛选商品
    if (itemTemplateId) {
      allOrders = allOrders.filter(o => o.itemTemplateId === itemTemplateId)
    }

    // 排序(价格从低到高)
    allOrders.sort((a, b) => a.pricePerUnit - b.pricePerUnit)

    const total = allOrders.length
    const start = (page - 1) * pageSize
    const pagedOrders = allOrders.slice(start, start + pageSize)

    return { orders: pagedOrders, total }
  }

  // 创建出售订单
  createOrder(sellerId: string, itemTemplateId: string, itemName: string, quantity: number, pricePerUnit: number): { success: boolean, order?: TradeOrder, message: string } {
    const config = TRADE_CONFIG
    const totalPrice = quantity * pricePerUnit

    // 验证价格
    if (pricePerUnit < config.order.minPrice || pricePerUnit > config.order.maxPrice) {
      return { success: false, message: `价格范围: ${config.order.minPrice} - ${config.order.maxPrice}` }
    }

    // 检查玩家的订单数量
    const playerOrders = this.orders.get(sellerId) || []
    const activeOrders = playerOrders.filter(o => o.status === 'selling')
    if (activeOrders.length >= config.order.maxOrders) {
      return { success: false, message: `最多同时上架${config.order.maxOrders}个商品` }
    }

    // 检查价格保护
    const marketPrice = this.marketPrices.get(itemTemplateId)
    if (marketPrice) {
      const minPrice = marketPrice.avgPrice * config.priceProtection.minRatio
      const maxPrice = marketPrice.avgPrice * config.priceProtection.maxRatio
      if (pricePerUnit < minPrice || pricePerUnit > maxPrice) {
        return { success: false, message: `价格偏离市场均价过多 (建议: ${Math.floor(minPrice)} - ${Math.floor(maxPrice)})` }
      }
    }

    const order: TradeOrder = {
      orderId: `order_${sellerId}_${Date.now()}`,
      sellerId,
      itemTemplateId,
      itemName,
      quantity,
      pricePerUnit,
      totalPrice,
      status: 'selling',
      createTime: Date.now(),
      expireTime: Date.now() + config.order.duration * 60 * 60 * 1000
    }

    playerOrders.push(order)
    this.orders.set(sellerId, playerOrders)

    return { success: true, order, message: `商品已上架，单价: ${pricePerUnit}` }
  }

  // 购买订单
  purchaseOrder(buyerId: string, orderId: string): { success: boolean, transaction?: TradeTransaction, message: string } {
    // 查找订单
    let targetOrder: TradeOrder | undefined
    let sellerId: string = ''
    
    this.orders.forEach((orders, sid) => {
      const found = orders.find(o => o.orderId === orderId)
      if (found) {
        targetOrder = found
        sellerId = sid
      }
    })

    if (!targetOrder) return { success: false, message: '订单不存在' }
    if (targetOrder!.status !== 'selling') return { success: false, message: '订单已下架' }
    if (targetOrder!.expireTime < Date.now()) return { success: false, message: '订单已过期' }
    if (sellerId === buyerId) return { success: false, message: '不能购买自己的商品' }

    const config = TRADE_CONFIG
    const tax = Math.floor(targetOrder!.totalPrice * config.taxRate)
    const sellerGet = targetOrder!.totalPrice - tax

    // 更新订单状态
    targetOrder!.status = 'sold'
    targetOrder!.buyerId = buyerId

    // 创建交易记录
    const transaction: TradeTransaction = {
      transactionId: `trans_${Date.now()}`,
      orderId: targetOrder!.orderId,
      sellerId,
      buyerId,
      itemTemplateId: targetOrder!.itemTemplateId,
      itemName: targetOrder!.itemName,
      quantity: targetOrder!.quantity,
      pricePerUnit: targetOrder!.pricePerUnit,
      totalPrice: targetOrder!.totalPrice,
      tradeTime: Date.now(),
      tax
    }

    this.transactions.push(transaction)

    // 更新市场价格
    this.updateMarketPrice(targetOrder!.itemTemplateId, targetOrder!.pricePerUnit, targetOrder!.quantity)

    return { 
      success: true, 
      transaction, 
      message: `购买成功，花费 ${targetOrder!.totalPrice} 金币（卖家获得: ${sellerGet}，税收: ${tax}）` 
    }
  }

  // 取消订单
  cancelOrder(playerId: string, orderId: string): { success: boolean, message: string } {
    const orders = this.orders.get(playerId)
    if (!orders) return { success: false, message: '没有订单' }

    const order = orders.find(o => o.orderId === orderId)
    if (!order) return { success: false, message: '订单不存在' }
    if (order.status !== 'selling') return { success: false, message: '订单状态不可取消' }
    if (order.sellerId !== playerId) return { success: false, message: '无权限' }

    order.status = 'cancelled'
    return { success: true, message: '订单已取消' }
  }

  // 批量上架（拍卖）
  createAuction(sellerId: string, itemTemplateId: string, itemName: string, quantity: number, startPrice: number): { success: boolean, order?: TradeOrder, message: string } {
    const config = TRADE_CONFIG

    if (startPrice < config.auction.minStartPrice) {
      return { success: false, message: `起拍价最低${config.auction.minStartPrice}` }
    }

    // 创建拍卖订单
    const order: TradeOrder = {
      orderId: `auction_${sellerId}_${Date.now()}`,
      sellerId,
      itemTemplateId,
      itemName,
      quantity,
      pricePerUnit: startPrice,
      totalPrice: startPrice,
      status: 'selling',
      createTime: Date.now(),
      expireTime: Date.now() + config.auction.duration * 60 * 60 * 1000
    }

    const orders = this.orders.get(sellerId) || []
    orders.push(order)
    this.orders.set(sellerId, orders)

    // 初始化拍卖出价
    this.bidOrders.set(order.orderId, [])

    return { success: true, order, message: `拍卖已上架，起拍价: ${startPrice}` }
  }

  // 出价
  bid(bidderId: string, orderId: string, bidPrice: number): { success: boolean, message: string } {
    const config = TRADE_CONFIG
    
    // 查找订单
    let order: TradeOrder | undefined
    let sellerId: string = ''
    
    this.orders.forEach((orders, sid) => {
      const found = orders.find(o => o.orderId === orderId)
      if (found) {
        order = found
        sellerId = sid
      }
    })

    if (!order) return { success: false, message: '订单不存在' }
    if (order!.status !== 'selling') return { success: false, message: '订单已结束' }
    if (sellerId === bidderId) return { success: false, message: '不能为自己的拍品出价' }

    const currentPrice = order!.pricePerUnit
    const minBid = currentPrice + config.auction.bidIncrement

    if (bidPrice < minBid) return { success: false, message: `最低出价: ${minBid}` }

    const bids = this.bidOrders.get(orderId) || []
    bids.push({ bidderId, bidPrice, bidTime: Date.now() })
    this.bidOrders.set(orderId, bids)

    order!.pricePerUnit = bidPrice

    return { success: true, message: `出价成功，当前最高价: ${bidPrice}` }
  }

  // 获取拍卖结果
  getAuctionResult(orderId: string): { winnerId?: string, finalPrice?: number, message: string } {
    const config = TRADE_CONFIG
    
    let order: TradeOrder | undefined
    let sellerId: string = ''
    
    this.orders.forEach((orders, sid) => {
      const found = orders.find(o => o.orderId === orderId)
      if (found) {
        order = found
        sellerId = sid
      }
    })

    if (!order) return { message: '订单不存在' }
    if (order!.expireTime > Date.now()) return { message: '拍卖尚未结束' }

    const bids = this.bidOrders.get(orderId) || []
    if (bids.length === 0) {
      // 流拍
      order!.status = 'expired'
      return { message: '拍卖流拍' }
    }

    // 找到最高出价者
    bids.sort((a, b) => b.bidPrice - a.bidPrice)
    const winner = bids[0]
    const finalPrice = winner.bidPrice

    // 完成交易
    const tax = Math.floor(finalPrice * config.taxRate)
    const sellerGet = finalPrice - tax

    order!.status = 'sold'
    order!.buyerId = winner.bidderId

    const transaction: TradeTransaction = {
      transactionId: `trans_${Date.now()}`,
      orderId: order!.orderId,
      sellerId,
      buyerId: winner.bidderId,
      itemTemplateId: order!.itemTemplateId,
      itemName: order!.itemName,
      quantity: order!.quantity,
      pricePerUnit: order!.pricePerUnit,
      totalPrice: finalPrice,
      tradeTime: Date.now(),
      tax
    }

    this.transactions.push(transaction)
    this.updateMarketPrice(order!.itemTemplateId, finalPrice, order!.quantity)

    return { winnerId: winner.bidderId, finalPrice, message: `拍卖成交，最终价: ${finalPrice}` }
  }

  // 玩家店铺系统
  openStore(playerId: string, storeName: string, description: string): { success: boolean, store?: PlayerStore, message: string } {
    const config = TRADE_CONFIG

    const stores = this.stores.get(playerId) || []
    if (stores.length >= config.store.maxStores) {
      return { success: false, message: `最多开设${config.store.maxStores}家店铺` }
    }

    const store: PlayerStore = {
      storeId: `store_${playerId}_${Date.now()}`,
      playerId,
      storeName,
      description,
      items: [],
      rating: 5,
      ratingCount: 0,
      salesCount: 0,
      createTime: Date.now()
    }

    stores.push(store)
    this.stores.set(playerId, stores)

    return { success: true, store, message: `店铺"${storeName}"已开业！` }
  }

  // 店铺上架商品
  addItemToStore(playerId: string, storeId: string, itemTemplateId: string, itemName: string, quantity: number, pricePerUnit: number): { success: boolean, message: string } {
    const config = TRADE_CONFIG

    const stores = this.stores.get(playerId) || []
    const store = stores.find(s => s.storeId === storeId)
    if (!store) return { success: false, message: '店铺不存在' }

    if (store.items.length >= config.store.maxItems) {
      return { success: false, message: `店铺最多上架${config.store.maxItems}种商品` }
    }

    store.items.push({
      itemTemplateId,
      itemName,
      quantity,
      pricePerUnit
    })

    return { success: true, message: `已上架${itemName}x${quantity}，单价: ${pricePerUnit}` }
  }

  // 购买店铺商品
  purchaseFromStore(buyerId: string, storeId: string, itemTemplateId: string, quantity: number): { success: boolean, transaction?: TradeTransaction, message: string } {
    const config = TRADE_CONFIG

    // 查找店铺
    let targetStore: PlayerStore | undefined
    let sellerId: string = ''
    
    this.stores.forEach((stores, sid) => {
      const found = stores.find(s => s.storeId === storeId)
      if (found) {
        targetStore = found
        sellerId = sid
      }
    })

    if (!targetStore) return { success: false, message: '店铺不存在' }

    const storeItem = targetStore!.items.find(i => i.itemTemplateId === itemTemplateId)
    if (!storeItem) return { success: false, message: '商品不存在' }
    if (storeItem.quantity < quantity) return { success: false, message: '库存不足' }
    if (sellerId === buyerId) return { success: false, message: '不能购买自己的商品' }

    const totalPrice = storeItem.pricePerUnit * quantity
    const tax = Math.floor(totalPrice * config.taxRate)
    const sellerGet = totalPrice - tax

    // 更新库存
    storeItem.quantity -= quantity
    if (storeItem.quantity <= 0) {
      const index = targetStore!.items.findIndex(i => i.itemTemplateId === itemTemplateId)
      targetStore!.items.splice(index, 1)
    }

    // 更新店铺销售统计
    targetStore!.salesCount++

    // 创建交易记录
    const transaction: TradeTransaction = {
      transactionId: `trans_store_${Date.now()}`,
      orderId: storeId,
      sellerId,
      buyerId,
      itemTemplateId,
      itemName: storeItem.itemName,
      quantity,
      pricePerUnit: storeItem.pricePerUnit,
      totalPrice,
      tradeTime: Date.now(),
      tax
    }

    this.transactions.push(transaction)
    this.updateMarketPrice(itemTemplateId, storeItem.pricePerUnit, quantity)

    return { 
      success: true, 
      transaction, 
      message: `购买成功，花费 ${totalPrice} 金币` 
    }
  }

  // 获取店铺列表
  getStores(page: number = 1, pageSize: number = 10): { stores: PlayerStore[], total: number } {
    let allStores: PlayerStore[] = []
    this.stores.forEach(stores => {
      allStores = allStores.concat(stores)
    })

    const total = allStores.length
    const start = (page - 1) * pageSize
    const pagedStores = allStores.slice(start, start + pageSize)

    return { stores: pagedStores, total }
  }

  // 获取玩家店铺
  getPlayerStores(playerId: string): PlayerStore[] {
    return this.stores.get(playerId) || []
  }

  // 获取交易历史
  getTransactionHistory(playerId: string, page: number = 1, pageSize: number = 20): { transactions: TradeTransaction[], total: number } {
    const playerTransactions = this.transactions.filter(t => 
      t.sellerId === playerId || t.buyerId === playerId
    )

    // 按时间倒序
    playerTransactions.sort((a, b) => b.tradeTime - a.tradeTime)

    const total = playerTransactions.length
    const start = (page - 1) * pageSize
    const pagedTransactions = playerTransactions.slice(start, start + pageSize)

    return { transactions: pagedTransactions, total }
  }

  // 获取市场价格
  getMarketPrice(itemTemplateId: string): MarketPrice | undefined {
    return this.marketPrices.get(itemTemplateId)
  }

  // 更新市场价格
  private updateMarketPrice(itemTemplateId: string, price: number, volume: number): void {
    const existing = this.marketPrices.get(itemTemplateId)
    const now = Date.now()

    if (existing) {
      // 更新均价和成交量
      const newVolume = existing.volume24h + volume
      const newAvgPrice = Math.floor((existing.avgPrice * existing.volume24h + price * volume) / newVolume)
      
      existing.avgPrice = newAvgPrice
      existing.minPrice = Math.min(existing.minPrice, price)
      existing.maxPrice = Math.max(existing.maxPrice, price)
      existing.volume24h = newVolume
      existing.priceChange24h = ((price - existing.avgPrice) / existing.avgPrice) * 100
      existing.lastUpdate = now
    } else {
      // 新商品
      this.marketPrices.set(itemTemplateId, {
        itemTemplateId,
        avgPrice: price,
        minPrice: price,
        maxPrice: price,
        volume24h: volume,
        priceChange24h: 0,
        lastUpdate: now
      })
    }
  }

  // 清理过期订单
  cleanupExpiredOrders(): number {
    let count = 0
    const now = Date.now()

    this.orders.forEach(orders => {
      orders.forEach(order => {
        if (order.status === 'selling' && order.expireTime < now) {
          order.status = 'expired'
          count++
        }
      })
    })

    return count
  }

  // 评价店铺
  rateStore(playerId: string, storeId: string, rating: number): { success: boolean, message: string } {
    if (rating < 1 || rating > 5) {
      return { success: false, message: '评分范围: 1-5' }
    }

    let targetStore: PlayerStore | undefined
    
    this.stores.forEach(stores => {
      const found = stores.find(s => s.storeId === storeId)
      if (found) targetStore = found
    })

    if (!targetStore) return { success: false, message: '店铺不存在' }

    // 计算新评分
    const totalRating = targetStore!.rating * targetStore!.ratingCount + rating
    targetStore!.ratingCount++
    targetStore!.rating = Math.floor(totalRating / targetStore!.ratingCount * 10) / 10

    return { success: true, message: `评分成功，当前店铺评分: ${targetStore!.rating}` }
  }
}

export default TradeSystem
