// 资源交易系统 - 玩家之间交易灵石、道具
// 支持自由市场、拍卖行
const express = require('express');
const router = express.Router();
const path = require('path');

// 数据库路径 (统一使用 backend/data/game.db)
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  db.pragma('journal_mode=WAL');
  db.pragma('busy_timeout=5000');
  initTradeTables();
} catch (err) {
  console.log('[trade] 数据库连接失败:', err.message);
  db = null;
}

// 交易配置
const TRADE_CONFIG = {
  taxRate: 0.05,       // 5%交易税
  auctionDuration: 24, // 拍卖时长(小时)
  minStartPrice: 100,  // 最低起拍价
  bidIncrement: 10,    // 最低加价幅度
  maxOrders: 50,       // 最大同时上架数量
  minPrice: 1,         // 最低售价
  maxPrice: 100000000  // 最高售价
};

// 初始化交易表
function initTradeTables() {
  if (!db) return;
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS trade_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT UNIQUE NOT NULL,
        seller_id INTEGER NOT NULL,
        seller_name TEXT NOT NULL DEFAULT '神秘修士',
        item_key TEXT NOT NULL,
        item_name TEXT NOT NULL,
        item_type TEXT NOT NULL DEFAULT 'misc',
        icon TEXT DEFAULT '📦',
        quantity INTEGER NOT NULL DEFAULT 1,
        price_per_unit INTEGER NOT NULL,
        total_price INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'selling',
        is_auction INTEGER NOT NULL DEFAULT 0,
        current_bid INTEGER DEFAULT 0,
        bid_count INTEGER DEFAULT 0,
        highest_bidder_id INTEGER DEFAULT NULL,
        create_time INTEGER NOT NULL,
        expire_time INTEGER NOT NULL,
        UNIQUE(seller_id, order_id)
      );

      CREATE TABLE IF NOT EXISTS trade_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id TEXT UNIQUE NOT NULL,
        order_id TEXT NOT NULL,
        seller_id INTEGER NOT NULL,
        buyer_id INTEGER NOT NULL,
        item_key TEXT NOT NULL,
        item_name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        price_per_unit INTEGER NOT NULL,
        total_price INTEGER NOT NULL,
        tax INTEGER NOT NULL,
        trade_time INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS trade_bids (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT NOT NULL,
        bidder_id INTEGER NOT NULL,
        bidder_name TEXT NOT NULL DEFAULT '神秘修士',
        bid_price INTEGER NOT NULL,
        bid_time INTEGER NOT NULL,
        UNIQUE(order_id, bidder_id)
      );

      CREATE TABLE IF NOT EXISTS market_prices (
        item_key TEXT PRIMARY KEY,
        item_name TEXT NOT NULL,
        avg_price REAL NOT NULL DEFAULT 0,
        min_price INTEGER NOT NULL DEFAULT 0,
        max_price INTEGER NOT NULL DEFAULT 0,
        volume_24h INTEGER NOT NULL DEFAULT 0,
        last_update INTEGER NOT NULL
      );
    `);
    console.log('[trade] 数据库表初始化完成');
  } catch (err) {
    console.log('[trade] 表初始化失败:', err.message);
  }
}

// 辅助函数
function generateOrderId(sellerId) {
  return `trade_${sellerId}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

function getUserId(req) {
  return req.userId || req.body.player_id || req.body.userId || req.query.player_id || req.query.userId || 1;
}

function getPlayerInfo(userId) {
  if (!db) return { name: '神秘修士', lingshi: 0 };
  try {
    const user = db.prepare('SELECT nickname, lingshi FROM Users WHERE id = ?').get(userId);
    return user || { name: '神秘修士', lingshi: 0 };
  } catch {
    return { name: '神秘修士', lingshi: 0 };
  }
}

function updateMarketPrice(itemKey, price, quantity) {
  if (!db) return;
  try {
    const existing = db.prepare('SELECT * FROM market_prices WHERE item_key = ?').get(itemKey);
    if (existing) {
      // 更新加权平均
      const newVolume = existing.volume_24h + quantity;
      const newAvg = (existing.avg_price * existing.volume_24h + price * quantity) / newVolume;
      db.prepare(`
        UPDATE market_prices SET 
          avg_price = ?, min_price = MIN(min_price, ?),
          max_price = MAX(max_price, ?), volume_24h = ?, last_update = ?
        WHERE item_key = ?
      `).run(newAvg, price, price, newVolume, Date.now(), itemKey);
    } else {
      db.prepare(`
        INSERT INTO market_prices (item_key, item_name, avg_price, min_price, max_price, volume_24h, last_update)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(itemKey, itemKey, price, price, price, quantity, Date.now());
    }
  } catch (err) {
    // ignore
  }
}

// 交易税计算
function calcTax(totalPrice) {
  return Math.floor(totalPrice * TRADE_CONFIG.taxRate);
}

// ========== 路由端点 ==========

// GET / - 获取市场订单列表
router.get('/', (req, res) => {
  const userId = getUserId(req);
  const { item_key, page = 1, page_size = 20, status = 'selling' } = req.query;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(page_size) || 20));

  if (!db) return res.json({ success: false, message: '数据库未连接' });

  try {
    let whereClause = "WHERE status = ?";
    let params = [status];

    if (item_key) {
      whereClause += " AND item_key = ?";
      params.push(item_key);
    }

    if (status === 'selling') {
      whereClause += " AND expire_time > ?";
      params.push(Date.now());
    }

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM trade_orders ${whereClause}`).get(...params);
    const total = countRow ? countRow.total : 0;

    const offset = (pageNum - 1) * pageSize;
    const orders = db.prepare(`
      SELECT order_id, seller_id, seller_name, item_key, item_name, item_type, icon,
             quantity, price_per_unit, total_price, status, is_auction,
             current_bid, bid_count, highest_bidder_id, create_time, expire_time
      FROM trade_orders
      ${whereClause}
      ORDER BY ${status === 'selling' ? 'price_per_unit ASC, create_time DESC' : 'trade_time DESC'}
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset);

    // 获取自己的订单信息
    const myOrders = db.prepare('SELECT order_id, status FROM trade_orders WHERE seller_id = ?').all(userId);
    const myOrderMap = {};
    myOrders.forEach(o => { myOrderMap[o.order_id] = o.status; });

    res.json({
      success: true,
      data: {
        orders: orders.map(o => ({
          orderId: o.order_id,
          sellerId: o.seller_id,
          sellerName: o.seller_name,
          itemKey: o.item_key,
          itemName: o.item_name,
          itemType: o.item_type,
          icon: o.icon,
          quantity: o.quantity,
          pricePerUnit: o.price_per_unit,
          totalPrice: o.total_price,
          status: o.status,
          isAuction: !!o.is_auction,
          currentBid: o.current_bid || 0,
          bidCount: o.bid_count || 0,
          createTime: o.create_time,
          expireTime: o.expire_time,
          isMine: myOrderMap[o.order_id] !== undefined
        })),
        pagination: {
          page: pageNum,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      }
    });
  } catch (err) {
    console.log('[trade] GET / error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// POST /list - 上架商品
router.post('/list', (req, res) => {
  const userId = getUserId(req);
  const { item_key, item_name, item_type, icon, quantity, price_per_unit, is_auction } = req.body;

  if (!item_key || !item_name || !price_per_unit) {
    return res.json({ success: false, message: '缺少必要参数: item_key, item_name, price_per_unit' });
  }

  const price = parseInt(price_per_unit) || 0;
  const qty = Math.max(1, parseInt(quantity) || 1);
  const totalPrice = price * qty;

  if (price < TRADE_CONFIG.minPrice || price > TRADE_CONFIG.maxPrice) {
    return res.json({ success: false, message: `价格范围: ${TRADE_CONFIG.minPrice} - ${TRADE_CONFIG.maxPrice}` });
  }

  if (!db) return res.json({ success: false, message: '数据库未连接' });

  try {
    // 检查玩家上架数量限制
    const activeCount = db.prepare(
      "SELECT COUNT(*) as cnt FROM trade_orders WHERE seller_id = ? AND status = 'selling' AND expire_time > ?"
    ).get(userId, Date.now());
    if (activeCount && activeCount.cnt >= TRADE_CONFIG.maxOrders) {
      return res.json({ success: false, message: `最多同时上架${TRADE_CONFIG.maxOrders}个商品` });
    }

    const playerInfo = getPlayerInfo(userId);
    const orderId = generateOrderId(userId);
    const now = Date.now();
    const expireTime = is_auction ? now + TRADE_CONFIG.auctionDuration * 3600000 : now + 72 * 3600000;

    // 从玩家背包扣除物品
    const itemDeducted = db.prepare(`
      UPDATE player_items 
      SET count = count - ? 
      WHERE player_id = ? AND item_key = ? AND count >= ?
    `).run(qty, userId, item_key, qty);

    if (!itemDeducted || itemDeducted.changes === 0) {
      return res.json({ success: false, message: '背包中物品不足或不存在' });
    }

    db.prepare(`
      INSERT INTO trade_orders 
      (order_id, seller_id, seller_name, item_key, item_name, item_type, icon, quantity, price_per_unit, total_price, status, is_auction, create_time, expire_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'selling', ?, ?, ?)
    `).run(orderId, userId, playerInfo.name, item_key, item_name, item_type || 'misc', icon || '📦', qty, price, totalPrice, is_auction ? 1 : 0, now, expireTime);

    res.json({
      success: true,
      data: {
        orderId,
        itemName: item_name,
        quantity: qty,
        pricePerUnit: price,
        totalPrice,
        isAuction: !!is_auction,
        expireTime,
        message: is_auction ? `拍卖上架成功，起拍价: ${price}` : `商品已上架，单价: ${price}`
      }
    });
  } catch (err) {
    console.log('[trade] POST /list error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// POST /buy - 购买商品
router.post('/buy', (req, res) => {
  const userId = getUserId(req);
  const { order_id } = req.body;

  if (!order_id) return res.json({ success: false, message: '缺少order_id' });
  if (!db) return res.json({ success: false, message: '数据库未连接' });

  try {
    const order = db.prepare("SELECT * FROM trade_orders WHERE order_id = ? AND status = 'selling' AND expire_time > ?").get(order_id, Date.now());
    if (!order) return res.json({ success: false, message: '订单不存在或已下架' });
    if (order.seller_id === userId) return res.json({ success: false, message: '不能购买自己的商品' });

    const playerInfo = getPlayerInfo(userId);
    if (playerInfo.lingshi < order.total_price) {
      return res.json({ success: false, message: `灵石不足，需要 ${order.total_price}，当前 ${playerInfo.lingshi}` });
    }

    const tax = calcTax(order.total_price);
    const sellerGet = order.total_price - tax;
    const transactionId = `trans_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // 扣买家灵石
    db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(order.total_price, userId);
    // 加卖家灵石
    db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(sellerGet, order.seller_id);
    // 更新订单状态
    db.prepare("UPDATE trade_orders SET status = 'sold' WHERE order_id = ?").run(order_id);
    // 写交易记录
    db.prepare(`
      INSERT INTO trade_transactions (transaction_id, order_id, seller_id, buyer_id, item_key, item_name, quantity, price_per_unit, total_price, tax, trade_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(transactionId, order_id, order.seller_id, userId, order.item_key, order.item_name, order.quantity, order.price_per_unit, order.total_price, tax, Date.now());
    // 给买家加物品
    db.prepare(`
      INSERT INTO player_items (player_id, item_key, item_name, item_type, icon, count, source)
      VALUES (?, ?, ?, ?, ?, ?, 'trade_purchase')
      ON CONFLICT(player_id, item_key, source) DO UPDATE SET count = count + excluded.count
    `).run(userId, order.item_key, order.item_name, order.item_type, order.icon, order.quantity);

    // 更新市场价格
    updateMarketPrice(order.item_key, order.price_per_unit, order.quantity);

    res.json({
      success: true,
      data: {
        transactionId,
        itemName: order.item_name,
        quantity: order.quantity,
        totalPrice: order.total_price,
        tax,
        sellerGot: sellerGet,
        message: `购买成功，花费 ${order.total_price} 灵石（卖家获得: ${sellerGet}，税收: ${tax}）`
      }
    });
  } catch (err) {
    console.log('[trade] POST /buy error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// POST /bid - 竞拍
router.post('/bid', (req, res) => {
  const userId = getUserId(req);
  const { order_id, bid_price } = req.body;

  if (!order_id || !bid_price) return res.json({ success: false, message: '缺少order_id或bid_price' });

  const bidAmount = parseInt(bid_price) || 0;
  if (!db) return res.json({ success: false, message: '数据库未连接' });

  try {
    const order = db.prepare("SELECT * FROM trade_orders WHERE order_id = ? AND is_auction = 1 AND status = 'selling' AND expire_time > ?").get(order_id, Date.now());
    if (!order) return res.json({ success: false, message: '拍卖订单不存在或已结束' });
    if (order.seller_id === userId) return res.json({ success: false, message: '不能竞拍自己的商品' });

    const minBid = Math.max(order.current_bid + TRADE_CONFIG.bidIncrement, order.price_per_unit);
    if (bidAmount < minBid) {
      return res.json({ success: false, message: `最低竞拍价: ${minBid}，当前: ${order.current_bid}` });
    }

    const playerInfo = getPlayerInfo(userId);
    // 竞价需要先付一定比例保证金
    const deposit = Math.floor(bidAmount * 0.1);
    if (playerInfo.lingshi < bidAmount) {
      return res.json({ success: false, message: `灵石不足，需要 ${bidAmount}，当前 ${playerInfo.lingshi}` });
    }

    const playerName = playerInfo.name;
    const now = Date.now();

    // 记录竞价
    db.prepare(`
      INSERT INTO trade_bids (order_id, bidder_id, bidder_name, bid_price, bid_time)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(order_id, bidder_id) DO UPDATE SET bid_price = excluded.bid_price, bid_time = excluded.bid_time
    `).run(order_id, userId, playerName, bidAmount, now);

    // 更新订单当前最高价
    db.prepare('UPDATE trade_orders SET current_bid = ?, bid_count = bid_count + 1, highest_bidder_id = ? WHERE order_id = ?')
      .run(bidAmount, userId, order_id);

    res.json({
      success: true,
      data: {
        orderId: order_id,
        bidPrice: bidAmount,
        deposit,
        message: `竞拍成功: ${bidAmount} 灵石（保证金: ${deposit}）`
      }
    });
  } catch (err) {
    console.log('[trade] POST /bid error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// POST /cancel - 取消上架
router.post('/cancel', (req, res) => {
  const userId = getUserId(req);
  const { order_id } = req.body;

  if (!order_id) return res.json({ success: false, message: '缺少order_id' });
  if (!db) return res.json({ success: false, message: '数据库未连接' });

  try {
    const order = db.prepare("SELECT * FROM trade_orders WHERE order_id = ? AND seller_id = ? AND status = 'selling'").get(order_id, userId);
    if (!order) return res.json({ success: false, message: '订单不存在或无权取消' });

    // 取消订单
    db.prepare("UPDATE trade_orders SET status = 'cancelled' WHERE order_id = ?").run(order_id);
    // 返还物品给卖家
    db.prepare(`
      INSERT INTO player_items (player_id, item_key, item_name, item_type, icon, count, source)
      VALUES (?, ?, ?, ?, ?, ?, 'trade_cancel')
      ON CONFLICT(player_id, item_key, source) DO UPDATE SET count = count + excluded.count
    `).run(userId, order.item_key, order.item_name, order.item_type, order.icon, order.quantity);

    res.json({ success: true, data: { orderId: order_id, message: '订单已取消，物品已返还' } });
  } catch (err) {
    console.log('[trade] POST /cancel error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// GET /my-listings - 我的上架列表
router.get('/my-listings', (req, res) => {
  const userId = getUserId(req);
  if (!db) return res.json({ success: false, message: '数据库未连接' });

  try {
    const orders = db.prepare(`
      SELECT order_id, item_key, item_name, item_type, icon, quantity, price_per_unit, total_price,
             status, is_auction, current_bid, bid_count, create_time, expire_time
      FROM trade_orders WHERE seller_id = ? ORDER BY create_time DESC
    `).all(userId);

    res.json({
      success: true,
      data: orders.map(o => ({
        orderId: o.order_id,
        itemKey: o.item_key,
        itemName: o.item_name,
        itemType: o.item_type,
        icon: o.icon,
        quantity: o.quantity,
        pricePerUnit: o.price_per_unit,
        totalPrice: o.total_price,
        status: o.status,
        isAuction: !!o.is_auction,
        currentBid: o.current_bid || 0,
        bidCount: o.bid_count || 0,
        createTime: o.create_time,
        expireTime: o.expire_time
      }))
    });
  } catch (err) {
    console.log('[trade] GET /my-listings error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// GET /transactions - 交易历史
router.get('/transactions', (req, res) => {
  const userId = getUserId(req);
  const { page = 1, page_size = 20 } = req.query;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(page_size) || 20));

  if (!db) return res.json({ success: false, message: '数据库未连接' });

  try {
    const countRow = db.prepare(
      'SELECT COUNT(*) as total FROM trade_transactions WHERE seller_id = ? OR buyer_id = ?'
    ).get(userId, userId);
    const total = countRow ? countRow.total : 0;
    const offset = (pageNum - 1) * pageSize;

    const transactions = db.prepare(`
      SELECT transaction_id, order_id, seller_id, buyer_id, item_key, item_name,
             quantity, price_per_unit, total_price, tax, trade_time
      FROM trade_transactions
      WHERE seller_id = ? OR buyer_id = ?
      ORDER BY trade_time DESC
      LIMIT ? OFFSET ?
    `).all(userId, userId, pageSize, offset);

    res.json({
      success: true,
      data: {
        transactions: transactions.map(t => ({
          transactionId: t.transaction_id,
          orderId: t.order_id,
          sellerId: t.seller_id,
          buyerId: t.buyer_id,
          itemKey: t.item_key,
          itemName: t.item_name,
          quantity: t.quantity,
          pricePerUnit: t.price_per_unit,
          totalPrice: t.total_price,
          tax: t.tax,
          tradeTime: t.trade_time,
          role: t.seller_id === userId ? 'seller' : 'buyer'
        })),
        pagination: { page: pageNum, pageSize, total, totalPages: Math.ceil(total / pageSize) }
      }
    });
  } catch (err) {
    console.log('[trade] GET /transactions error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// GET /market-prices - 市场价格
router.get('/market-prices', (req, res) => {
  const { item_key } = req.query;
  if (!db) return res.json({ success: false, message: '数据库未连接' });

  try {
    let prices;
    if (item_key) {
      prices = [db.prepare('SELECT * FROM market_prices WHERE item_key = ?').get(item_key)].filter(Boolean);
    } else {
      prices = db.prepare('SELECT * FROM market_prices ORDER BY volume_24h DESC LIMIT 50').all();
    }

    res.json({
      success: true,
      data: prices.map(p => ({
        itemKey: p.item_key,
        itemName: p.item_name,
        avgPrice: Math.round(p.avg_price),
        minPrice: p.min_price,
        maxPrice: p.max_price,
        volume24h: p.volume_24h,
        lastUpdate: p.last_update
      }))
    });
  } catch (err) {
    console.log('[trade] GET /market-prices error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// GET /config - 获取交易配置
router.get('/config', (req, res) => {
  res.json({
    success: true,
    data: {
      taxRate: TRADE_CONFIG.taxRate,
      auctionDuration: TRADE_CONFIG.auctionDuration,
      minStartPrice: TRADE_CONFIG.minStartPrice,
      bidIncrement: TRADE_CONFIG.bidIncrement,
      maxOrders: TRADE_CONFIG.maxOrders,
      minPrice: TRADE_CONFIG.minPrice,
      maxPrice: TRADE_CONFIG.maxPrice
    }
  });
});

// 定时任务: 处理过期订单
function processExpiredOrders() {
  if (!db) return;
  try {
    const expired = db.prepare("SELECT * FROM trade_orders WHERE status = 'selling' AND expire_time <= ? AND is_auction = 0").all(Date.now());
    for (const order of expired) {
      // 返还物品给卖家
      db.prepare(`
        INSERT INTO player_items (player_id, item_key, item_name, item_type, icon, count, source)
        VALUES (?, ?, ?, ?, ?, ?, 'trade_expired')
        ON CONFLICT(player_id, item_key, source) DO UPDATE SET count = count + excluded.count
      `).run(order.seller_id, order.item_key, order.item_name, order.item_type, order.icon, order.quantity);
      db.prepare("UPDATE trade_orders SET status = 'expired' WHERE order_id = ?").run(order.order_id);
    }

    // 结算拍卖
    const expiredAuctions = db.prepare("SELECT * FROM trade_orders WHERE status = 'selling' AND expire_time <= ? AND is_auction = 1").all(Date.now());
    for (const order of expiredAuctions) {
      if (order.highest_bidder_id) {
        // 有最高竞价者，成交
        const tax = calcTax(order.current_bid * order.quantity);
        const sellerGet = order.current_bid * order.quantity - tax;
        const transactionId = `trans_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

        db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(order.current_bid * order.quantity, order.highest_bidder_id);
        db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(sellerGet, order.seller_id);
        db.prepare("UPDATE trade_orders SET status = 'sold' WHERE order_id = ?").run(order.order_id);
        db.prepare(`
          INSERT INTO trade_transactions (transaction_id, order_id, seller_id, buyer_id, item_key, item_name, quantity, price_per_unit, total_price, tax, trade_time)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(transactionId, order.order_id, order.seller_id, order.highest_bidder_id, order.item_key, order.item_name, order.quantity, order.current_bid, order.current_bid * order.quantity, tax, Date.now());
        db.prepare(`
          INSERT INTO player_items (player_id, item_key, item_name, item_type, icon, count, source)
          VALUES (?, ?, ?, ?, ?, ?, 'trade_auction')
          ON CONFLICT(player_id, item_key, source) DO UPDATE SET count = count + excluded.count
        `).run(order.highest_bidder_id, order.item_key, order.item_name, order.item_type, order.icon, order.quantity);
        updateMarketPrice(order.item_key, order.current_bid, order.quantity);
      } else {
        // 无竞价，退还物品
        db.prepare(`
          INSERT INTO player_items (player_id, item_key, item_name, item_type, icon, count, source)
          VALUES (?, ?, ?, ?, ?, ?, 'trade_auction_expired')
          ON CONFLICT(player_id, item_key, source) DO UPDATE SET count = count + excluded.count
        `).run(order.seller_id, order.item_key, order.item_name, order.item_type, order.icon, order.quantity);
        db.prepare("UPDATE trade_orders SET status = 'expired' WHERE order_id = ?").run(order.order_id);
      }
    }
  } catch (err) {
    console.log('[trade] processExpiredOrders error:', err.message);
  }
}

// 每5分钟检查一次过期订单
setInterval(processExpiredOrders, 5 * 60 * 1000);

module.exports = router;
