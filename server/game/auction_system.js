/**
 * 拍卖行系统
 * 玩家拍卖物品、竞价、结算
 */

const AUCTION_CATEGORIES = {
  'materials': { name: '材料', icon: '📦' },
  'equipment': { name: '装备', icon: '⚔️' },
  'artifacts': { name: '法宝', icon: '🔮' },
  'beasts': { name: '灵兽', icon: '🦊' },
  'books': { name: '功法', icon: '📚' },
  'mounts': { name: '坐骑', icon: '🐎' },
  'wings': { name: '翅膀', icon: '🪽' },
  'fashion': { name: '时装', icon: '👘' }
};

// 拍卖行配置
const AUCTION_CONFIG = {
  DURATION: 24 * 60 * 60 * 1000, // 24小时
  MIN_DURATION: 1 * 60 * 60 * 1000, // 最短1小时
  MAX_DURATION: 72 * 60 * 60 * 1000, // 最长72小时
  STARTING_TAX: 0.03, // 3% 起步价
  FINAL_TAX: 0.05, // 5% 成交价
  MIN_BID_INCREMENT: 1.1, // 最低加价10%
  LISTING_FEE_RATE: 0.01, // 上架费1%
  MAX_LISTINGS_PER_PLAYER: 20, // 每人最多20个拍品
  CANCEL_FEE_RATE: 0.5 // 取消手续费50%
};

// 拍卖状态
const AUCTION_STATUS = {
  PENDING: 'pending',      // 待开始
  ACTIVE: 'active',        // 进行中
  ENDED: 'ended',         // 已结束
  SOLD: 'sold',           // 已售出
  CANCELLED: 'cancelled'  // 已取消
};

// ============ 拍卖数据 ============
let auctionListings = []; // 拍卖列表
let auctionHistory = [];  // 拍卖历史

// 生成唯一ID
function generateAuctionId() {
  return `auction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 获取当前时间
function getCurrentTime() {
  return Date.now();
}

// ============ 拍卖上架 ============
async function createAuction(item, itemType, startingPrice, duration = AUCTION_CONFIG.DURATION) {
  const player = gameState.player;
  
  // 验证持续时间
  duration = Math.max(AUCTION_CONFIG.MIN_DURATION, Math.min(AUCTION_CONFIG.MAX_DURATION, duration));
  
  // 检查初始价格
  if (startingPrice < 1) {
    return { success: false, message: '起拍价不能低于1' };
  }
  
  // 检查玩家背包
  const inventory = getPlayerInventory(itemType);
  if (!inventory) {
    return { success: false, message: '无效的物品类型' };
  }
  
  // 检查物品拥有
  const ownedItem = findOwnedItem(inventory, item);
  if (!ownedItem) {
    return { success: false, message: '没有该物品' };
  }
  
  // 检查上架数量限制
  const myListings = auctionListings.filter(
    l => l.seller === player.id && l.status === AUCTION_STATUS.ACTIVE
  );
  if (myListings.length >= AUCTION_CONFIG.MAX_LISTINGS_PER_PLAYER) {
    return { success: false, message: `最多同时上架${AUCTION_CONFIG.MAX_LISTINGS_PER_PLAYER}个拍品` };
  }
  
  // 计算上架费
  const listingFee = Math.floor(startingPrice * AUCTION_CONFIG.LISTING_FEE_RATE);
  if (player.lingshi < listingFee) {
    return { success: false, message: `上架费不足，需要 ${listingFee} 灵石` };
  }
  
  // 扣除上架费
  player.lingshi -= listingFee;
  
  // 从背包移除物品
  removeFromInventory(inventory, item, itemType);
  
  // 创建拍卖
  const auction = {
    id: generateAuctionId(),
    item: item,
    itemType: itemType,
    seller: player.id,
    sellerName: player.name,
    startingPrice: startingPrice,
    currentBid: startingPrice,
    currentBidder: null,
    currentBidderName: null,
    bidCount: 0,
    status: AUCTION_STATUS.ACTIVE,
    startTime: getCurrentTime(),
    endTime: getCurrentTime() + duration,
    duration: duration,
    listingFee: listingFee
  };
  
  auctionListings.push(auction);
  
  return {
    success: true,
    message: '拍卖上架成功',
    auction: formatAuction(auction)
  };
}

// ============ 竞价 ============
async function bid(auctionId, bidAmount) {
  const player = gameState.player;
  
  // 查找拍卖
  const auction = auctionListings.find(a => a.id === auctionId);
  if (!auction) {
    return { success: false, message: '拍卖不存在' };
  }
  
  // 检查状态
  if (auction.status !== AUCTION_STATUS.ACTIVE) {
    return { success: false, message: '该拍卖已结束' };
  }
  
  // 检查是否结束
  if (getCurrentTime() >= auction.endTime) {
    auction.status = AUCTION_STATUS.ENDED;
    return { success: false, message: '该拍卖已结束' };
  }
  
  // 不能对自己拍卖
  if (auction.seller === player.id) {
    return { success: false, message: '不能对自己上架的物品竞价' };
  }
  
  // 验证竞价
  const minBid = Math.floor(auction.currentBid * AUCTION_CONFIG.MIN_BID_INCREMENT);
  if (bidAmount < minBid) {
    return { success: false, message: `最低竞价金额为 ${minBid}` };
  }
  
  // 检查灵石
  if (player.lingshi < bidAmount) {
    return { success: false, message: '灵石不足' };
  }
  
  // 退还之前的竞价者
  if (auction.currentBidder) {
    const prevBidder = findPlayer(auction.currentBidder);
    if (prevBidder) {
      prevBidder.lingshi += auction.currentBid;
    }
  }
  
  // 扣除竞价金额
  player.lingshi -= bidAmount;
  
  // 更新竞价信息
  auction.currentBid = bidAmount;
  auction.currentBidder = player.id;
  auction.currentBidderName = player.name;
  auction.bidCount++;
  
  // 延长拍卖时间（如果接近结束）
  const remainingTime = auction.endTime - getCurrentTime();
  if (remainingTime < 5 * 60 * 1000) { // 少于5分钟
    auction.endTime += 5 * 60 * 1000; // 延长5分钟
  }
  
  return {
    success: true,
    message: '竞价成功',
    auction: formatAuction(auction)
  };
}

// ============ 一口价 ============
async function buyNow(auctionId) {
  const player = gameState.player;
  
  // 查找拍卖
  const auction = auctionListings.find(a => a.id === auctionId);
  if (!auction) {
    return { success: false, message: '拍卖不存在' };
  }
  
  // 检查状态
  if (auction.status !== AUCTION_STATUS.ACTIVE) {
    return { success: false, message: '该拍卖已结束' };
  }
  
  // 不能对自己拍卖
  if (auction.seller === player.id) {
    return { success: false, message: '不能购买自己的物品' };
  }
  
  // 如果没有一口价，返回错误
  if (!auction.buyNowPrice) {
    return { success: false, message: '该拍卖没有设置一口价' };
  }
  
  // 检查灵石
  if (player.lingshi < auction.buyNowPrice) {
    return { success: false, message: '灵石不足' };
  }
  
  // 执行成交
  return await settleAuction(auction, player.id, auction.buyNowPrice);
}

// ============ 取消拍卖 ============
async function cancelAuction(auctionId) {
  const player = gameState.player;
  
  // 查找拍卖
  const auction = auctionListings.find(a => a.id === auctionId);
  if (!auction) {
    return { success: false, message: '拍卖不存在' };
  }
  
  // 只能取消自己的拍卖
  if (auction.seller !== player.id) {
    return { success: false, message: '只能取消自己的拍卖' };
  }
  
  // 检查状态
  if (auction.status !== AUCTION_STATUS.ACTIVE) {
    return { success: false, message: '只能取消进行中的拍卖' };
  }
  
  // 检查是否有竞价
  if (auction.currentBidder) {
    return { success: false, message: '已有竞价，无法取消' };
  }
  
  // 计算取消手续费
  const cancelFee = Math.floor(auction.listingFee * AUCTION_CONFIG.CANCEL_FEE_RATE);
  if (player.lingshi < cancelFee) {
    return { success: false, message: `取消手续费不足，需要 ${cancelFee} 灵石` };
  }
  
  // 扣除手续费
  player.lingshi -= cancelFee;
  
  // 返还物品给卖家
  const inventory = getPlayerInventory(auction.itemType);
  addToInventory(inventory, auction.item, auction.itemType);
  
  // 更新状态
  auction.status = AUCTION_STATUS.CANCELLED;
  auction.cancelTime = getCurrentTime();
  auction.cancelFee = cancelFee;
  
  // 移出活跃列表
  auctionListings = auctionListings.filter(a => a.id !== auctionId);
  auctionHistory.push(auction);
  
  return {
    success: true,
    message: `拍卖已取消，扣除手续费 ${cancelFee} 灵石`,
    auction: formatAuction(auction)
  };
}

// ============ 结算拍卖 ============
async function settleAuction(auction, winnerId, finalPrice) {
  const player = gameState.player;
  const winner = findPlayer(winnerId) || player;
  const seller = findPlayer(auction.seller);
  
  // 计算税费
  const tax = Math.floor(finalPrice * AUCTION_CONFIG.FINAL_TAX);
  const sellerRevenue = finalPrice - tax;
  
  // 扣除赢家灵石
  if (winner.id === player.id) {
    winner.lingshi -= finalPrice;
  }
  
  // 给予卖家灵石
  if (seller) {
    seller.lingshi += sellerRevenue;
  }
  
  // 给予赢家物品
  const winnerInventory = getPlayerInventory(auction.itemType);
  addToInventory(winnerInventory, auction.item, auction.itemType);
  
  // 更新状态
  auction.status = AUCTION_STATUS.SOLD;
  auction.endTime = getCurrentTime();
  auction.finalPrice = finalPrice;
  auction.winner = winnerId;
  auction.winnerName = winner.name;
  auction.tax = tax;
  auction.sellerRevenue = sellerRevenue;
  
  // 移出活跃列表
  auctionListings = auctionListings.filter(a => a.id !== auction.id);
  auctionHistory.push(auction);
  
  return {
    success: true,
    message: `竞拍成功！以 ${finalPrice} 灵石成交`,
    auction: formatAuction(auction),
    revenue: sellerRevenue,
    tax: tax
  };
}

// ============ 检查并结束拍卖 ============
function checkExpiredAuctions() {
  const now = getCurrentTime();
  const expiredAuctions = auctionListings.filter(
    a => a.status === AUCTION_STATUS.ACTIVE && a.endTime <= now
  );
  
  for (const auction of expiredAuctions) {
    if (auction.currentBidder) {
      // 有竞价，成交
      settleAuction(auction, auction.currentBidder, auction.currentBid);
    } else {
      // 无竞价，流拍
      auction.status = AUCTION_STATUS.ENDED;
      
      // 返还物品给卖家
      const inventory = getPlayerInventory(auction.itemType);
      addToInventory(inventory, auction.item, auction.itemType);
      
      // 移出活跃列表
      auctionListings = auctionListings.filter(a => a.id !== auction.id);
      auctionHistory.push(auction);
    }
  }
  
  return expiredAuctions.length;
}

// ============ 获取拍卖列表 ============
function getAuctionList(options = {}) {
  let listings = auctionListings.filter(a => a.status === AUCTION_STATUS.ACTIVE);
  
  // 筛选
  if (options.category) {
    listings = listings.filter(a => a.itemType === options.category);
  }
  
  if (options.seller) {
    listings = listings.filter(a => a.seller === options.seller);
  }
  
  // 排序
  if (options.sort === 'ending_soon') {
    listings.sort((a, b) => a.endTime - b.endTime);
  } else if (options.sort === 'price_asc') {
    listings.sort((a, b) => a.currentBid - b.currentBid);
  } else if (options.sort === 'price_desc') {
    listings.sort((a, b) => b.currentBid - a.currentBid);
  } else if (options.sort === 'newest') {
    listings.sort((a, b) => b.startTime - a.startTime);
  } else {
    listings.sort((a, b) => b.endTime - a.endTime);
  }
  
  // 分页
  const page = options.page || 1;
  const pageSize = options.pageSize || 20;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  
  return {
    success: true,
    auctions: listings.slice(start, end).map(formatAuction),
    total: listings.length,
    page: page,
    pageSize: pageSize
  };
}

// ============ 获取我的拍卖 ============
function getMyAuctions(playerId) {
  const active = auctionListings.filter(
    a => a.seller === playerId && a.status === AUCTION_STATUS.ACTIVE
  );
  
  const participated = auctionListings.filter(
    a => a.currentBidder === playerId && a.status === AUCTION_STATUS.ACTIVE
  );
  
  const history = auctionHistory.filter(
    a => a.seller === playerId || a.winner === playerId
  );
  
  return {
    success: true,
    active: active.map(formatAuction),
    participating: participated.map(formatAuction),
    history: history.slice(-20).map(formatAuction)
  };
}

// ============ 获取拍卖详情 ============
function getAuctionDetail(auctionId) {
  const auction = auctionListings.find(a => a.id === auctionId) ||
                  auctionHistory.find(a => a.id === auctionId);
  
  if (!auction) {
    return { success: false, message: '拍卖不存在' };
  }
  
  return {
    success: true,
    auction: formatAuction(auction)
  };
}

// ============ 获取拍卖历史 ============
function getAuctionHistory(options = {}) {
  let history = [...auctionHistory];
  
  // 筛选
  if (options.category) {
    history = history.filter(a => a.itemType === options.category);
  }
  
  // 排序（最新的在前）
  history.sort((a, b) => (b.endTime || b.cancelTime) - (a.endTime || a.cancelTime));
  
  // 分页
  const page = options.page || 1;
  const pageSize = options.pageSize || 20;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  
  return {
    success: true,
    auctions: history.slice(start, end).map(formatAuction),
    total: history.length,
    page: page,
    pageSize: pageSize
  };
}

// ============ 辅助函数 ============
function getPlayerInventory(itemType) {
  const player = gameState.player;
  
  switch (itemType) {
    case 'artifacts':
      return player.owned_artifacts;
    case 'beasts':
      return player.beasts;
    case 'mounts':
      return player.mounts;
    case 'wings':
      return player.wings;
    case 'fashion':
      return player.fashion;
    default:
      return player.artifacts_inventory;
  }
}

function findOwnedItem(inventory, itemId) {
  if (Array.isArray(inventory)) {
    return inventory.find(i => i.id === itemId);
  } else if (typeof inventory === 'object') {
    return (inventory[itemId] || 0) > 0;
  }
  return false;
}

function removeFromInventory(inventory, itemId, itemType) {
  if (Array.isArray(inventory)) {
    const idx = inventory.findIndex(i => i.id === itemId);
    if (idx >= 0) inventory.splice(idx, 1);
  } else if (typeof inventory === 'object') {
    inventory[itemId] = Math.max(0, (inventory[itemId] || 0) - 1);
  }
}

function addToInventory(inventory, itemId, itemType) {
  if (Array.isArray(inventory)) {
    inventory.push({ id: itemId, type: itemType });
  } else if (typeof inventory === 'object') {
    inventory[itemId] = (inventory[itemId] || 0) + 1;
  }
}

function findPlayer(playerId) {
  // 简化实现，实际应该从游戏状态中查找
  if (gameState.player.id === playerId) {
    return gameState.player;
  }
  return null;
}

function formatAuction(auction) {
  const remainingTime = auction.endTime - getCurrentTime();
  
  return {
    id: auction.id,
    item: auction.item,
    itemType: auction.itemType,
    itemTypeName: AUCTION_CATEGORIES[auction.itemType]?.name || auction.itemType,
    seller: auction.seller,
    sellerName: auction.sellerName,
    startingPrice: auction.startingPrice,
    currentBid: auction.currentBid,
    currentBidder: auction.currentBidder,
    currentBidderName: auction.currentBidderName,
    bidCount: auction.bidCount,
    status: auction.status,
    buyNowPrice: auction.buyNowPrice || null,
    startTime: auction.startTime,
    endTime: auction.endTime,
    remainingTime: Math.max(0, remainingTime),
    remainingTimeText: formatTime(remainingTime),
    winner: auction.winner,
    winnerName: auction.winnerName,
    finalPrice: auction.finalPrice,
    tax: auction.tax,
    sellerRevenue: auction.sellerRevenue
  };
}

function formatTime(ms) {
  if (ms <= 0) return '已结束';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}天${hours % 24}小时`;
  if (hours > 0) return `${hours}小时${minutes % 60}分钟`;
  if (minutes > 0) return `${minutes}分钟${seconds % 60}秒`;
  return `${seconds}秒`;
}

// ============ 获取拍卖行统计 ============
function getAuctionStats() {
  checkExpiredAuctions();
  
  const active = auctionListings.filter(a => a.status === AUCTION_STATUS.ACTIVE);
  const totalValue = active.reduce((sum, a) => sum + a.currentBid, 0);
  const soldCount = auctionHistory.filter(a => a.status === AUCTION_STATUS.SOLD).length;
  const totalRevenue = auctionHistory
    .filter(a => a.status === AUCTION_STATUS.SOLD)
    .reduce((sum, a) => sum + (a.sellerRevenue || 0), 0);
  
  return {
    success: true,
    activeCount: active.length,
    totalValue: totalValue,
    soldCount: soldCount,
    totalRevenue: totalRevenue,
    categories: Object.keys(AUCTION_CATEGORIES).map(key => ({
      type: key,
      name: AUCTION_CATEGORIES[key].name,
      count: active.filter(a => a.itemType === key).length
    }))
  };
}

// ============ 设置一口价 ============
async function setBuyNowPrice(auctionId, buyNowPrice) {
  const player = gameState.player;
  
  const auction = auctionListings.find(a => a.id === auctionId);
  if (!auction) {
    return { success: false, message: '拍卖不存在' };
  }
  
  if (auction.seller !== player.id) {
    return { success: false, message: '只能修改自己的拍卖' };
  }
  
  if (auction.currentBidder) {
    return { success: false, message: '已有竞价，无法设置一口价' };
  }
  
  if (buyNowPrice <= auction.currentBid) {
    return { success: false, message: '一口价必须高于当前竞价' };
  }
  
  auction.buyNowPrice = buyNowPrice;
  
  return {
    success: true,
    message: '一口价设置成功',
    auction: formatAuction(auction)
  };
}

// ============ 获取热门拍卖 ============
function getHotAuctions(limit = 10) {
  const active = auctionListings.filter(a => a.status === AUCTION_STATUS.ACTIVE);
  
  // 按竞价次数和剩余时间排序
  active.sort((a, b) => {
    if (b.bidCount !== a.bidCount) return b.bidCount - a.bidCount;
    return a.endTime - b.endTime;
  });
  
  return {
    success: true,
    auctions: active.slice(0, limit).map(formatAuction)
  };
}

// ============ 导出模块 ============
const auctionSystem = {
  // 核心功能
  createAuction,
  bid,
  buyNow,
  cancelAuction,
  
  // 查询
  getAuctionList,
  getAuctionDetail,
  getMyAuctions,
  getAuctionHistory,
  getAuctionStats,
  getHotAuctions,
  
  // 设置
  setBuyNowPrice,
  
  // 定时任务
  checkExpiredAuctions,
  
  // 常量
  CONFIG: AUCTION_CONFIG,
  CATEGORIES: AUCTION_CATEGORIES,
  STATUS: AUCTION_STATUS
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = auctionSystem;
}
