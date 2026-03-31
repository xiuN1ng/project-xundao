/**
 * 交易市场系统 API
 * 玩家自由交易平台
 */

const express = require('express');
const router = express.Router();
const path = require('path');

// 输入校验
const { validate } = require('../../middleware/api_validator');

// 数据库连接 - 延迟加载
let db = null;

function getDb() {
  if (!db) {
    const Database = require('better-sqlite3');
    const dbPath = path.join(__dirname, '..', '..', 'backend', 'data', 'game.db');
    db = new Database(dbPath);
  }
  return db;
}

// 初始化交易表
function initTradeTable() {
  const database = getDb();
  database.exec(`
    CREATE TABLE IF NOT EXISTS trade_listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seller_id INTEGER NOT NULL,
      seller_name TEXT,
      item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      item_icon TEXT,
      item_data TEXT,
      price INTEGER NOT NULL,
      category TEXT DEFAULT 'other',
      status TEXT DEFAULT 'active',
      listed_at TEXT DEFAULT (datetime('now', '+8 hours'))
    )
  `);

  // 玩家背包表（用于存放物品，确保存在）
  database.exec(`
    CREATE TABLE IF NOT EXISTS player_bag (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      item_icon TEXT,
      item_data TEXT,
      quantity INTEGER DEFAULT 1,
      acquired_at TEXT DEFAULT (datetime('now', '+8 hours')),
      UNIQUE(player_id, item_id)
    )
  `);

  // 创建索引
  database.exec(`CREATE INDEX IF NOT EXISTS idx_trade_seller ON trade_listings(seller_id)`);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_trade_status ON trade_listings(status)`);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_trade_category ON trade_listings(category)`);
}

// 启动时初始化
try {
  initTradeTable();
} catch (e) {
  console.error('[Trade] 表初始化失败:', e.message);
}

// ============ 获取市场列表 ============
// GET /api/trade/market?page=1&limit=20&category=&search=
router.get('/market', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const category = req.query.category || '';
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    const database = getDb();

    let whereClause = "WHERE status = 'active'";
    const params = [];

    if (category && category !== 'all') {
      whereClause += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      whereClause += ' AND item_name LIKE ?';
      params.push(`%${search}%`);
    }

    // 获取总数
    const countResult = database.prepare(`
      SELECT COUNT(*) as total FROM trade_listings ${whereClause}
    `).get(...params);

    const total = countResult ? countResult.total : 0;
    const pages = Math.ceil(total / limit);

    // 获取列表
    const items = database.prepare(`
      SELECT id, seller_id, seller_name, item_id, item_name, item_icon, item_data, price, category, listed_at
      FROM trade_listings
      ${whereClause}
      ORDER BY listed_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.json({
      success: true,
      items: items.map(item => ({
        id: item.id,
        sellerId: item.seller_id,
        sellerName: item.seller_name || '神秘商人',
        itemId: item.item_id,
        itemName: item.item_name,
        itemIcon: item.item_icon || '📦',
        itemData: item.item_data ? JSON.parse(item.item_data) : null,
        price: item.price,
        category: item.category,
        listedAt: item.listed_at
      })),
      total,
      page,
      pages,
      limit
    });
  } catch (error) {
    console.error('[Trade] 获取市场列表失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ 上架物品 ============
// POST /api/trade/list
router.post('/list',
  validate({
    player_id: { type: 'playerId', required: true },
    item_id: { type: 'string', min: 1, max: 100, required: true },
    price: { type: 'int', min: 1, max: 999999999, required: true },
    category: { type: 'string', max: 50, required: false },
    item_name: { type: 'string', max: 100, required: false },
    item_icon: { type: 'string', max: 10, required: false }
  }),
  (req, res) => {
  try {
    const { player_id, item_id, price, category, item_name, item_icon, icon } = req.sanitizedBody || req.body;
    const finalIcon = item_icon || icon || '📦';
    const finalName = item_name || '物品';

    const database = getDb();

    // 获取卖家信息
    const player = database.prepare('SELECT nickname FROM Users WHERE id = ?').get(player_id);
    const sellerName = player ? player.nickname : '神秘商人';

    // 插入上架记录
    const result = database.prepare(`
      INSERT INTO trade_listings (seller_id, seller_name, item_id, item_name, item_icon, item_data, price, category, status, listed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', datetime('now', '+8 hours'))
    `).run(
      player_id,
      sellerName,
      item_id,
      finalName,
      finalIcon,
      item_data ? (typeof item_data === 'string' ? item_data : JSON.stringify(item_data)) : null,
      price,
      category || 'other'
    );

    res.json({
      success: true,
      listing_id: result.lastInsertRowid,
      message: '上架成功'
    });
  } catch (error) {
    console.error('[Trade] 上架物品失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ 购买物品 ============
// POST /api/trade/buy
router.post('/buy',
  validate({
    player_id: { type: 'playerId', required: true },
    listing_id: { type: 'int', min: 1, max: 999999999, required: true }
  }),
  (req, res) => {
  try {
    const { player_id, listing_id } = req.sanitizedBody || req.body;

    const database = getDb();

    // 获取上架记录
    const listing = database.prepare(`
      SELECT * FROM trade_listings WHERE id = ? AND status = 'active'
    `).get(listing_id);

    if (!listing) {
      return res.status(404).json({ success: false, error: '物品不存在或已下架' });
    }

    // 不能购买自己的物品
    if (listing.seller_id === player_id) {
      return res.status(400).json({ success: false, error: '不能购买自己上架的物品' });
    }

    // 获取买家信息
    const buyer = database.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    if (!buyer) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }

    // 检查灵石是否足够
    if (buyer.spirit_stones < listing.price) {
      return res.status(400).json({ success: false, error: '灵石不足' });
    }

    // 开启事务
    const transaction = database.transaction(() => {
      // 扣除买家灵石
      database.prepare('UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?')
        .run(listing.price, player_id);

      // 增加卖家灵石
      database.prepare('UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?')
        .run(listing.price, listing.seller_id);

      // 将物品添加到买家背包
      database.prepare(`
        INSERT INTO player_bag (player_id, item_id, item_name, item_icon, item_data, quantity)
        VALUES (?, ?, ?, ?, ?, 1)
      `).run(
        player_id,
        listing.item_id,
        listing.item_name,
        listing.item_icon,
        listing.item_data
      );

      // 更新上架记录状态
      database.prepare(`
        UPDATE trade_listings SET status = 'sold' WHERE id = ?
      `).run(listing_id);
    });

    transaction();

    res.json({
      success: true,
      message: `购买成功！获得 ${listing.item_icon} ${listing.item_name}`,
      data: {
        item: {
          item_id: listing.item_id,
          item_name: listing.item_name,
          item_icon: listing.item_icon
        },
        spent: listing.price,
        remaining_spirit_stones: buyer.spirit_stones - listing.price
      }
    });
  } catch (error) {
    console.error('[Trade] 购买物品失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ 下架物品 ============
// DELETE /api/trade/delist
router.delete('/delist', (req, res) => {
  try {
    const { player_id, listing_id } = req.body;

    if (!player_id || !listing_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const database = getDb();

    // 获取上架记录
    const listing = database.prepare(`
      SELECT * FROM trade_listings WHERE id = ? AND status = 'active'
    `).get(listing_id);

    if (!listing) {
      return res.status(404).json({ success: false, error: '物品不存在或已下架' });
    }

    // 只能下架自己的物品
    if (listing.seller_id !== player_id) {
      return res.status(403).json({ success: false, error: '只能下架自己的物品' });
    }

    // 开启事务
    const transaction = database.transaction(() => {
      // 将物品返还给卖家背包
      database.prepare(`
        INSERT INTO player_bag (player_id, item_id, item_name, item_icon, item_data, quantity)
        VALUES (?, ?, ?, ?, ?, 1)
      `).run(
        player_id,
        listing.item_id,
        listing.item_name,
        listing.item_icon,
        listing.item_data
      );

      // 更新上架记录状态
      database.prepare(`
        UPDATE trade_listings SET status = 'cancelled' WHERE id = ?
      `).run(listing_id);
    });

    transaction();

    res.json({
      success: true,
      message: '下架成功，物品已返还背包'
    });
  } catch (error) {
    console.error('[Trade] 下架物品失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ 获取我的上架列表 ============
// GET /api/trade/my-listings?player_id=N
router.get('/my-listings', (req, res) => {
  try {
    const playerId = parseInt(req.query.player_id) || 1;

    const database = getDb();

    const items = database.prepare(`
      SELECT id, seller_id, seller_name, item_id, item_name, item_icon, item_data, price, category, status, listed_at
      FROM trade_listings
      WHERE seller_id = ? AND status = 'active'
      ORDER BY listed_at DESC
    `).all(playerId);

    res.json({
      success: true,
      items: items.map(item => ({
        id: item.id,
        sellerId: item.seller_id,
        sellerName: item.seller_name || '神秘商人',
        itemId: item.item_id,
        itemName: item.item_name,
        itemIcon: item.item_icon || '📦',
        itemData: item.item_data ? JSON.parse(item.item_data) : null,
        price: item.price,
        category: item.category,
        status: item.status,
        listedAt: item.listed_at
      }))
    });
  } catch (error) {
    console.error('[Trade] 获取我的上架列表失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
