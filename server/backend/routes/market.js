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
  initMarketTables();
} catch (err) {
  console.log('[market] 数据库连接失败:', err.message);
  db = null;
}

function initMarketTables() {
  if (!db) return;
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS market_listings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        seller_id INTEGER NOT NULL,
        seller_name TEXT NOT NULL DEFAULT '神秘修士',
        item_key TEXT NOT NULL,
        item_name TEXT NOT NULL,
        item_type TEXT NOT NULL DEFAULT 'misc',
        icon TEXT DEFAULT '📦',
        price INTEGER NOT NULL,
        description TEXT DEFAULT '',
        listed_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
        expire_at INTEGER,
        status TEXT NOT NULL DEFAULT 'active',
        view_count INTEGER DEFAULT 0,
        UNIQUE(seller_id, item_key, status)
      );

      CREATE TABLE IF NOT EXISTS market_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        listing_id INTEGER NOT NULL,
        seller_id INTEGER NOT NULL,
        buyer_id INTEGER NOT NULL,
        item_key TEXT NOT NULL,
        item_name TEXT NOT NULL,
        price INTEGER NOT NULL,
        traded_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
      );

      CREATE TABLE IF NOT EXISTS market_categories (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT DEFAULT '📦',
        sort_order INTEGER DEFAULT 0
      );
    `);

    // 初始化分类
    const catCount = db.prepare('SELECT COUNT(*) as c FROM market_categories').get()?.c || 0;
    if (catCount === 0) {
      const cats = [
        { id: 1, name: '武器', icon: '⚔️', sort: 1 },
        { id: 2, name: '防具', icon: '🛡️', sort: 2 },
        { id: 3, name: '丹药', icon: '🧪', sort: 3 },
        { id: 4, name: '材料', icon: '🪨', sort: 4 },
        { id: 5, name: '灵兽', icon: '🐉', sort: 5 },
        { id: 6, name: '杂物', icon: '📦', sort: 6 }
      ];
      const insertCat = db.prepare('INSERT INTO market_categories (id, name, icon, sort_order) VALUES (?,?,?,?)');
      for (const c of cats) insertCat.run(c.id, c.name, c.icon, c.sort);
    }

    console.log('[market] 市场数据表初始化完成');
  } catch (err) {
    console.log('[market] 表初始化失败:', err.message);
  }
}

// 中间件：解析userId
function getUserId(req) {
  return parseInt(req.body?.userId || req.body?.player_id || req.query?.userId || req.query?.player_id || req.headers['x-user-id'] || 1);
}

// GET /api/market - 市场概览
router.get('/', (req, res) => {
  if (!db) return res.status(503).json({ success: false, message: '数据库未连接' });
  try {
    const totalActive = db.prepare("SELECT COUNT(*) as c FROM market_listings WHERE status='active'").get().c || 0;
    const totalTransactions = db.prepare('SELECT COUNT(*) as c FROM market_transactions').get().c || 0;
    const categories = db.prepare('SELECT * FROM market_categories ORDER BY sort_order').all();
    res.json({
      success: true,
      market: {
        totalActive,
        totalTransactions,
        categories,
        message: '欢迎来到修真集市！可自由买卖装备、道具、材料'
      }
    });
  } catch (err) {
    console.log('[market] / 错误:', err.message);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// GET /api/market/list - 浏览上架物品
router.get('/list', (req, res) => {
  if (!db) return res.status(503).json({ success: false, message: '数据库未连接' });
  try {
    const page = Math.max(1, parseInt(req.query.page || 1));
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize || 20)));
    const offset = (page - 1) * pageSize;
    const category = req.query.category;
    const search = req.query.search;
    const sortBy = req.query.sortBy || 'listed_at'; // listed_at, price, view_count

    let where = "WHERE status='active' AND (expire_at IS NULL OR expire_at > strftime('%s','now'))";
    const params = [];

    if (category && category !== 'all') {
      where += ' AND item_type = ?';
      params.push(category);
    }
    if (search) {
      where += ' AND (item_name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    let orderClause = 'ORDER BY listed_at DESC';
    if (sortBy === 'price_asc') orderClause = 'ORDER BY price ASC';
    else if (sortBy === 'price_desc') orderClause = 'ORDER BY price DESC';
    else if (sortBy === 'view_count') orderClause = 'ORDER BY view_count DESC';

    const total = db.prepare(`SELECT COUNT(*) as c FROM market_listings ${where}`).get(...params).c || 0;
    const listings = db.prepare(`SELECT * FROM market_listings ${where} ${orderClause} LIMIT ? OFFSET ?`).all(...params, pageSize, offset);

    // 增加浏览量
    for (const l of listings) {
      try { db.prepare('UPDATE market_listings SET view_count = view_count + 1 WHERE id = ?').run(l.id); } catch(e) {}
    }

    res.json({
      success: true,
      listings: listings.map(l => ({
        listingId: l.id,
        itemKey: l.item_key,
        itemName: l.item_name,
        itemType: l.item_type,
        icon: l.icon,
        price: l.price,
        description: l.description,
        sellerId: l.seller_id,
        sellerName: l.seller_name,
        listedAt: l.listed_at,
        viewCount: l.view_count + 1
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (err) {
    console.log('[market] /list 错误:', err.message);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// GET /api/market/my - 我的上架物品
router.get('/my', (req, res) => {
  if (!db) return res.status(503).json({ success: false, message: '数据库未连接' });
  try {
    const userId = getUserId(req);
    const listings = db.prepare("SELECT * FROM market_listings WHERE seller_id = ? AND status='active' ORDER BY listed_at DESC").all(userId);
    const sold = db.prepare("SELECT COUNT(*) as c FROM market_transactions WHERE seller_id = ?").get(userId).c || 0;
    const bought = db.prepare("SELECT COUNT(*) as c FROM market_transactions WHERE buyer_id = ?").get(userId).c || 0;
    res.json({
      success: true,
      listings: listings.map(l => ({
        listingId: l.id,
        itemKey: l.item_key,
        itemName: l.item_name,
        itemType: l.item_type,
        icon: l.icon,
        price: l.price,
        status: l.status,
        listedAt: l.listed_at
      })),
      stats: { totalListed: listings.length, totalSold: sold, totalBought: bought }
    });
  } catch (err) {
    console.log('[market] /my 错误:', err.message);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// POST /api/market/list - 上架物品
router.post('/list', (req, res) => {
  if (!db) return res.status(503).json({ success: false, message: '数据库未连接' });
  try {
    const userId = getUserId(req);
    const { itemKey, itemName, itemType, icon, price, description, durationDays } = req.body;

    if (!itemKey || !itemName) {
      return res.status(400).json({ success: false, message: '缺少必要参数(itemKey/itemName)' });
    }
    if (!price || price < 1) {
      return res.status(400).json({ success: false, message: '价格必须大于0' });
    }
    if (price > 999999999) {
      return res.status(400).json({ success: false, message: '价格超出上限(9.99亿)' });
    }

    // 获取卖家名称
    let sellerName = '神秘修士';
    try {
      const user = db.prepare('SELECT nickname FROM Users WHERE id = ?').get(userId);
      if (user) sellerName = user.nickname;
    } catch (e) {}

    // 检查是否已有相同物品在售
    const existing = db.prepare("SELECT id FROM market_listings WHERE seller_id = ? AND item_key = ? AND status='active'").get(userId, itemKey);
    if (existing) {
      return res.status(400).json({ success: false, message: '该物品已在市场上架，请先下架' });
    }

    // 计算过期时间
    const duration = Math.min(Math.max(parseInt(durationDays) || 7, 1), 30);
    const now = Math.floor(Date.now() / 1000);
    const expireAt = now + duration * 86400;

    // 验证物品是否属于玩家 (检查player_items或forge_materials)
    let hasItem = false;
    let consumeFrom = null;

    try {
      const pi = db.prepare('SELECT id, count FROM player_items WHERE user_id = ? AND item_key = ? AND count > 0').get(userId, itemKey);
      if (pi) { hasItem = true; consumeFrom = 'player_items'; }
    } catch (e) {}

    if (!hasItem) {
      try {
        const fm = db.prepare('SELECT id, quantity FROM forge_materials WHERE player_id = ? AND material_key = ? AND quantity > 0').get(userId, itemKey);
        if (fm) { hasItem = true; consumeFrom = 'forge_materials'; }
      } catch (e) {}
    }

    // 如果没有找到物品记录，允许挂牌（玩家声称拥有该物品）
    // 上架手续费：价格的1%，最低10灵石
    const fee = Math.max(10, Math.floor(price * 0.01));

    // 检查玩家灵石是否够付手续费
    let userLingshi = 0;
    try {
      const u = db.prepare('SELECT lingshi FROM Users WHERE id = ?').get(userId);
      if (u) userLingshi = u.lingshi || 0;
    } catch (e) {}

    if (userLingshi < fee) {
      return res.status(400).json({ success: false, message: `上架手续费不足(需${fee}灵石，您有${userLingshi}灵石)` });
    }

    // 扣除手续费
    try {
      db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(fee, userId);
    } catch (e) {
      return res.status(500).json({ success: false, message: '手续费扣除失败' });
    }

    // 插入上架记录
    const result = db.prepare(`
      INSERT INTO market_listings (seller_id, seller_name, item_key, item_name, item_type, icon, price, description, listed_at, expire_at, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(userId, sellerName, itemKey, itemName, itemType || 'misc', icon || '📦', price, description || '', now, expireAt);

    res.json({
      success: true,
      message: `上架成功！扣除手续费${fee}灵石`,
      listing: {
        listingId: result.lastInsertRowid,
        itemKey,
        itemName,
        price,
        expireAt
      }
    });
  } catch (err) {
    console.log('[market] /list 错误:', err.message);
    res.status(500).json({ success: false, message: '服务器错误: ' + err.message });
  }
});

// POST /api/market/cancel/:listingId - 下架物品
router.post('/cancel/:listingId', (req, res) => {
  if (!db) return res.status(503).json({ success: false, message: '数据库未连接' });
  try {
    const userId = getUserId(req);
    const listingId = parseInt(req.params.listingId);

    const listing = db.prepare('SELECT * FROM market_listings WHERE id = ? AND status=\'active\'').get(listingId);
    if (!listing) {
      return res.status(404).json({ success: false, message: '上架记录不存在或已下架' });
    }
    if (listing.seller_id !== userId) {
      return res.status(403).json({ success: false, message: '无权操作此上架记录' });
    }

    db.prepare("UPDATE market_listings SET status='cancelled' WHERE id = ?").run(listingId);

    res.json({ success: true, message: '下架成功，物品已返还背包' });
  } catch (err) {
    console.log('[market] /cancel 错误:', err.message);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// POST /api/market/buy/:listingId - 购买物品
router.post('/buy/:listingId', (req, res) => {
  if (!db) return res.status(503).json({ success: false, message: '数据库未连接' });
  try {
    const buyerId = getUserId(req);
    const listingId = parseInt(req.params.listingId);

    const listing = db.prepare("SELECT * FROM market_listings WHERE id = ? AND status='active'").get(listingId);
    if (!listing) {
      return res.status(404).json({ success: false, message: '商品不存在或已下架' });
    }
    if (listing.seller_id === buyerId) {
      return res.status(400).json({ success: false, message: '不能购买自己上架的物品' });
    }

    // 检查买家灵石
    let buyerLingshi = 0;
    try {
      const u = db.prepare('SELECT lingshi FROM Users WHERE id = ?').get(buyerId);
      if (u) buyerLingshi = u.lingshi || 0;
    } catch (e) {}

    if (buyerLingshi < listing.price) {
      return res.status(400).json({
        success: false,
        message: `灵石不足(需${listing.price}灵石，您有${buyerLingshi}灵石)`,
        required: listing.price,
        current: buyerLingshi
      });
    }

    const now = Math.floor(Date.now() / 1000);

    // 事务：扣除买家灵石 + 给卖家加灵石 + 转移物品 + 记录交易
    try {
      db.exec('BEGIN TRANSACTION');

      // 扣除买家灵石
      db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(listing.price, buyerId);

      // 给卖家加灵石 (扣除5%交易税)
      const tax = Math.floor(listing.price * 0.05);
      const sellerEarnings = listing.price - tax;
      db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(sellerEarnings, listing.seller_id);

      // 将物品写入买家背包
      try {
        db.prepare(`
          INSERT INTO player_items (user_id, item_key, item_name, item_type, icon, count, source)
          VALUES (?, ?, ?, ?, ?, 1, 'market_purchase')
        `).run(buyerId, listing.item_key, listing.item_name, listing.item_type, listing.icon);
      } catch (e) {
        // 如果表结构不同，尝试其他方式
        try {
          db.prepare('UPDATE player_items SET count = count + 1 WHERE user_id = ? AND item_key = ?').run(buyerId, listing.item_key);
        } catch (e2) {}
      }

      // 标记上架记录为已售
      db.prepare("UPDATE market_listings SET status='sold' WHERE id = ?").run(listingId);

      // 记录交易
      db.prepare(`
        INSERT INTO market_transactions (listing_id, seller_id, buyer_id, item_key, item_name, price, traded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(listingId, listing.seller_id, buyerId, listing.item_key, listing.item_name, listing.price, now);

      db.exec('COMMIT');

      res.json({
        success: true,
        message: `购买成功！花费${listing.price}灵石，卖家获得${sellerEarnings}灵石(扣除${tax}灵石交易税)`,
        purchase: {
          listingId,
          itemName: listing.item_name,
          icon: listing.icon,
          price: listing.price,
          tax
        }
      });
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.log('[market] /buy 错误:', err.message);
    res.status(500).json({ success: false, message: '服务器错误: ' + err.message });
  }
});

// GET /api/market/categories - 获取市场分类
router.get('/categories', (req, res) => {
  if (!db) return res.status(503).json({ success: false, message: '数据库未连接' });
  try {
    const categories = db.prepare('SELECT * FROM market_categories ORDER BY sort_order').all();
    const counts = {};
    for (const cat of categories) {
      const c = db.prepare("SELECT COUNT(*) as c FROM market_listings WHERE item_type = ? AND status='active'").get(cat.name).c || 0;
      counts[cat.name] = c;
    }
    res.json({
      success: true,
      categories: categories.map(c => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        count: counts[c.name] || 0
      }))
    });
  } catch (err) {
    console.log('[market] /categories 错误:', err.message);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// GET /api/market/history - 交易历史
router.get('/history', (req, res) => {
  if (!db) return res.status(503).json({ success: false, message: '数据库未连接' });
  try {
    const userId = getUserId(req);
    const page = Math.max(1, parseInt(req.query.page || 1));
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize || 20)));
    const offset = (page - 1) * pageSize;
    const type = req.query.type; // 'sold', 'bought', 'all'

    let where = '';
    const params = [];
    if (type === 'sold') {
      where = 'WHERE seller_id = ?';
      params.push(userId);
    } else if (type === 'bought') {
      where = 'WHERE buyer_id = ?';
      params.push(userId);
    } else {
      where = 'WHERE seller_id = ? OR buyer_id = ?';
      params.push(userId, userId);
    }

    const total = db.prepare(`SELECT COUNT(*) as c FROM market_transactions ${where}`).get(...params).c || 0;
    const history = db.prepare(`SELECT * FROM market_transactions ${where} ORDER BY traded_at DESC LIMIT ? OFFSET ?`).all(...params, pageSize, offset);

    res.json({
      success: true,
      history: history.map(h => ({
        transactionId: h.id,
        listingId: h.listing_id,
        itemName: h.item_name,
        price: h.price,
        tradedAt: h.traded_at,
        role: h.seller_id === userId ? 'seller' : 'buyer',
        earnings: h.seller_id === userId ? Math.floor(h.price * 0.95) : 0,
        spend: h.buyer_id === userId ? h.price : 0
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    });
  } catch (err) {
    console.log('[market] /history 错误:', err.message);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
