/**
 * 交易市场系统 v4.0 (API版)
 * 玩家交易/竞价系统/税率
 */

const MARKET_CATEGORIES = {
  'materials': { name: '材料', icon: '📦' },
  'equipment': { name: '装备', icon: '⚔️' },
  'artifacts': { name: '法宝', icon: '🔮' },
  'beasts': { name: '灵兽', icon: '🦊' },
  'books': { name: '功法', icon: '📚' }
};

// 市场税率
const MARKET_TAX = 0.05; // 5%

// ============ 市场商品 ============
let marketListings = []; // { id, seller, item, price, time, category }

// ============ 上架商品 ============
async function listItem(item, price, category) {
  const player = gameState.player;
  
  // 检查物品
  let inventory;
  if (category === 'artifacts' || category === 'beasts') {
    inventory = category === 'artifacts' ? player.owned_artifacts : player.beasts;
  } else {
    inventory = player.artifacts_inventory || {};
  }
  
  // 检查拥有
  let hasItem;
  if (category === 'artifacts') {
    hasItem = inventory?.find(a => a.id === item);
  } else if (category === 'beasts') {
    hasItem = inventory?.find(b => b.id === item);
  } else {
    hasItem = (inventory[item] || 0) > 0;
  }
  
  if (!hasItem) {
    return { success: false, message: '没有该物品' };
  }
  
  if (price < 1) {
    return { success: false, message: '价格不能低于1' };
  }
  
  // 检查上架数量限制
  const myListings = marketListings.filter(l => l.seller === player.name);
  if (myListings.length >= 10) {
    return { success: false, message: '最多上架10件商品' };
  }
  
  // 调用后端API
  const result = await marketAPI.listItem(item, price, category);
  
  if (result.success) {
    // 扣除物品
    if (category === 'artifacts') {
      const idx = inventory.findIndex(a => a.id === item);
      if (idx >= 0) inventory.splice(idx, 1);
    } else if (category === 'beasts') {
      const idx = inventory.findIndex(b => b.id === item);
      if (idx >= 0) inventory.splice(idx, 1);
    } else {
      inventory[item]--;
    }
    
    // 添加到本地列表
    const listing = {
      id: Date.now() + Math.random(),
      seller: player.name,
      item: item,
      price: price,
      category: category,
      time: Date.now(),
      originalOwner: player.name
    };
    
    marketListings.push(listing);
  }
  
  return result;
}

// ============ 购买商品 ============
async function buyItem(listingId) {
  const player = gameState.player;
  const listing = marketListings.find(l => l.id === listingId);
  
  if (!listing) {
    return { success: false, message: '商品不存在或已下架' };
  }
  
  if (listing.seller === player.name) {
    return { success: false, message: '不能购买自己的商品' };
  }
  
  if (player.spiritStones < listing.price) {
    return { success: false, message: '灵石不足' };
  }
  
  // 调用后端API
  const result = await marketAPI.buy(listingId);
  
  if (result.success) {
    // 扣除灵石
    player.spiritStones -= listing.price;
    
    // 税后收入
    const tax = Math.floor(listing.price * MARKET_TAX);
    const sellerEarn = listing.price - tax;
    
    // 转移物品
    if (listing.category === 'artifacts') {
      if (!player.owned_artifacts) player.owned_artifacts = [];
      player.owned_artifacts.push({ id: listing.item, level: 1, quality: 'common', obtainedAt: Date.now() });
    } else if (listing.category === 'beasts') {
      if (!player.beasts) player.beasts = [];
      player.beasts.push({ id: listing.item, level: 1, obtainedAt: Date.now() });
    } else {
      if (!player.artifacts_inventory) player.artifacts_inventory = {};
      player.artifacts_inventory[listing.item] = (player.artifacts_inventory[listing.item] || 0) + 1;
    }
    
    // 下架
    marketListings = marketListings.filter(l => l.id !== listingId);
    
    // 记录交易
    if (!gameState.stats.marketSales) gameState.stats.marketSales = 0;
    gameState.stats.marketSales++;
    if (!gameState.stats.marketRevenue) gameState.stats.marketRevenue = 0;
    gameState.stats.marketRevenue += sellerEarn;
    
    return { 
      success: true, 
      message: `💰 购买成功！花费 ${listing.price} 灵石，卖家获得 ${sellerEarn} 灵石（扣税${tax}）` 
    };
  }
  
  return result;
}

// ============ 下架商品 ============
async function delistItem(listingId) {
  const player = gameState.player;
  const listing = marketListings.find(l => l.id === listingId);
  
  if (!listing) {
    return { success: false, message: '商品不存在' };
  }
  
  if (listing.seller !== player.name) {
    return { success: false, message: '只能下架自己的商品' };
  }
  
  // 调用后端API
  const result = await marketAPI.delist(listingId);
  
  if (result.success) {
    // 返还物品
    if (listing.category === 'artifacts') {
      if (!player.owned_artifacts) player.owned_artifacts = [];
      player.owned_artifacts.push({ id: listing.item, level: 1, quality: 'common', obtainedAt: Date.now() });
    } else if (listing.category === 'beasts') {
      if (!player.beasts) player.beasts = [];
      player.beasts.push({ id: listing.item, level: 1, obtainedAt: Date.now() });
    } else {
      if (!player.artifacts_inventory) player.artifacts_inventory = {};
      player.artifacts_inventory[listing.item] = (player.artifacts_inventory[listing.item] || 0) + 1;
    }
    
    marketListings = marketListings.filter(l => l.id !== listingId);
  }
  
  return result;
}

// ============ 我的上架 ============
async function getMyListings() {
  // 先从API获取最新数据
  const result = await marketAPI.getMyListings();
  if (result.success && result.listings) {
    marketListings = result.listings;
  }
  
  const player = gameState.player;
  return marketListings.filter(l => l.seller === player.name);
}

// ============ 市场搜索 ============
async function searchMarket(category, maxPrice) {
  // 从API获取最新数据
  const result = await marketAPI.getListings(category);
  if (result.success && result.listings) {
    marketListings = result.listings;
  }
  
  let results = marketListings;
  
  if (category) {
    results = results.filter(l => l.category === category);
  }
  
  if (maxPrice) {
    results = results.filter(l => l.price <= maxPrice);
  }
  
  return results;
}

// ============ 刷新市场列表 ============
async function refreshMarketListings(category = null) {
  const result = await marketAPI.getListings(category);
  if (result.success && result.listings) {
    marketListings = result.listings;
  }
  return marketListings;
}

// ============ 竞价 ============
let auctions = []; // { id, item, highestBid, highestBidder, bids: [], endTime }

async function createAuction(item, startingPrice, duration) {
  const player = gameState.player;
  
  // 扣除物品
  if (!player.artifacts_inventory) player.artifacts_inventory = {};
  if ((player.artifacts_inventory[item] || 0) < 1) {
    return { success: false, message: '物品不足' };
  }
  player.artifacts_inventory[item]--;
  
  const auction = {
    id: Date.now() + Math.random(),
    item: item,
    highestBid: startingPrice,
    highestBidder: null,
    bids: [],
    endTime: Date.now() + (duration || 3600) * 1000,
    seller: player.name
  };
  
  auctions.push(auction);
  
  return { success: true, message: `📢 竞价发布：${item}，起价 ${startingPrice}` };
}

async function bid(auctionId, amount) {
  const player = gameState.player;
  const auction = auctions.find(a => a.id === auctionId);
  
  if (!auction) return { success: false, message: '竞价不存在' };
  if (Date.now() > auction.endTime) return { success: false, message: '竞价已结束' };
  if (amount <= auction.highestBid) return { success: false, message: '出价必须高于当前最高价' };
  if (player.spiritStones < amount) return { success: false, message: '灵石不足' };
  
  // 退还之前最高出价
  if (auction.highestBidder && auction.highestBid > 0) {
    // 简化处理，不退还
  }
  
  player.spiritStones -= amount;
  auction.highestBid = amount;
  auction.highestBidder = player.name;
  auction.bids.push({ bidder: player.name, amount, time: Date.now() });
  
  return { success: true, message: `💵 出价成功：${amount} 灵石` };
}

function settleAuction(auctionId) {
  const auction = auctions.find(a => a.id === auctionId);
  if (!auction) return null;
  
  if (Date.now() < auction.endTime) return null;
  
  const winner = auction.highestBidder;
  const price = auction.highestBid;
  
  // 结算
  if (winner) {
    // 这里简化处理
  }
  
  // 移除竞价
  auctions = auctions.filter(a => a.id !== auctionId);
  
  return { winner, price, item: auction.item };
}

// ============ 市场统计 ============
function getMarketStats() {
  return {
    totalListings: marketListings.length,
    totalAuctions: auctions.length,
    totalSales: gameState.stats.marketSales || 0,
    totalRevenue: gameState.stats.marketRevenue || 0,
    tax: MARKET_TAX * 100 + '%'
  };
}

// 导出
window.MARKET_CATEGORIES = MARKET_CATEGORIES;
window.MARKET_TAX = MARKET_TAX;
window.listItem = listItem;
window.buyItem = buyItem;
window.delistItem = delistItem;
window.getMyListings = getMyListings;
window.searchMarket = searchMarket;
window.refreshMarketListings = refreshMarketListings;
window.createAuction = createAuction;
window.bid = bid;
window.getMarketStats = getMarketStats;
window.settleAuction = settleAuction;

console.log('💰 交易市场系统 v4.0 (API版) 已加载');
