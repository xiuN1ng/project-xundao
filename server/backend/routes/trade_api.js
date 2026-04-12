/**
 * 交易市场/玩家直购系统 API
 * 参考梦幻西游摊位/交易行设计
 * 
 * 核心功能:
 * - 求购发布: 玩家发布求购帖（指定物品/价格/数量）
 * - 直接购买: 一口价立即购买其他玩家的物品
 * - 锁区交易: 同一宗门成员交易免手续费
 * - 公示期: 珍贵物品上架后需公示30分钟才能被购买
 * - 交易税: 成交收取5%交易税
 * - 信用记录: 记录交易信用分，被举报降低信用
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const Database = require('better-sqlite3');

// 数据库连接 - 延迟加载
let db = null;

function getDb() {
  if (!db) {
    const dbPath = path.join(__dirname, '..', '..', 'backend', 'data', 'game.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
  }
  return db;
}

// 通过player_id获取玩家昵称（从users表）
function getPlayerName(database, playerId) {
  const player = database.prepare(
    'SELECT u.nickname FROM player p JOIN users u ON p.user_id = u.id WHERE p.id = ?'
  ).get(playerId);
  return player ? player.nickname : '神秘修士';
}

// ============ 表初始化 ============
function initTradeTables() {
  const database = getDb();
  database.exec(`
    -- 交易上架表（支持一口价出售和求购）
    CREATE TABLE IF NOT EXISTS player_trade_listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      player_name TEXT,
      item_key TEXT NOT NULL,
      item_name TEXT NOT NULL,
      item_icon TEXT DEFAULT '📦',
      item_category TEXT DEFAULT 'other',
      quantity INTEGER DEFAULT 1,
      unit_price INTEGER NOT NULL,
      listing_type TEXT DEFAULT 'sell',
      status TEXT DEFAULT 'active',
      public_at TEXT DEFAULT (datetime('now', '+8 hours')),
      expire_at TEXT,
      buyer_id INTEGER,
      buyer_name TEXT,
      is_precious INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', '+8 hours'))
    );

    -- 交易记录表
    CREATE TABLE IF NOT EXISTS player_trade_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listing_id INTEGER NOT NULL,
      buyer_id INTEGER NOT NULL,
      buyer_name TEXT,
      seller_id INTEGER NOT NULL,
      seller_name TEXT,
      item_key TEXT NOT NULL,
      item_name TEXT NOT NULL,
      item_icon TEXT DEFAULT '📦',
      quantity INTEGER DEFAULT 1,
      unit_price INTEGER NOT NULL,
      total_price INTEGER NOT NULL,
      fee INTEGER DEFAULT 0,
      is_same_sect INTEGER DEFAULT 0,
      traded_at TEXT DEFAULT (datetime('now', '+8 hours'))
    );

    -- 交易举报表
    CREATE TABLE IF NOT EXISTS player_trade_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_id INTEGER NOT NULL,
      reporter_name TEXT,
      reported_player_id INTEGER NOT NULL,
      reported_player_name TEXT,
      listing_id INTEGER,
      reason TEXT NOT NULL,
      evidence TEXT,
      status TEXT DEFAULT 'pending',
      handled_at TEXT,
      handler_id INTEGER,
      created_at TEXT DEFAULT (datetime('now', '+8 hours'))
    );

    -- 交易信用表
    CREATE TABLE IF NOT EXISTS player_trade_reputation (
      player_id INTEGER PRIMARY KEY,
      player_name TEXT,
      credit_score INTEGER DEFAULT 100,
      total_trades INTEGER DEFAULT 0,
      successful_trades INTEGER DEFAULT 0,
      total_sales INTEGER DEFAULT 0,
      successful_sales INTEGER DEFAULT 0,
      total_purchases INTEGER DEFAULT 0,
      successful_purchases INTEGER DEFAULT 0,
      reports_received INTEGER DEFAULT 0,
      reports_filed INTEGER DEFAULT 0,
      last_trade_at TEXT,
      created_at TEXT DEFAULT (datetime('now', '+8 hours')),
      updated_at TEXT DEFAULT (datetime('now', '+8 hours'))
    );

    -- 背包交易临时记录表（用于物品归属）
    CREATE TABLE IF NOT EXISTS player_trade_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      item_key TEXT NOT NULL,
      item_name TEXT NOT NULL,
      item_icon TEXT DEFAULT '📦',
      item_data TEXT,
      quantity INTEGER DEFAULT 1,
      source TEXT DEFAULT 'trade',
      listing_id INTEGER,
      acquired_at TEXT DEFAULT (datetime('now', '+8 hours'))
    );
  `);

  // 索引
  database.exec(`CREATE INDEX IF NOT EXISTS idx_ptl_player ON player_trade_listings(player_id)`);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_ptl_status ON player_trade_listings(status)`);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_ptl_type ON player_trade_listings(listing_type)`);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_ptl_item ON player_trade_listings(item_key)`);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_ptl_public ON player_trade_listings(public_at)`);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_ptp_buyer ON player_trade_purchases(buyer_id)`);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_ptp_seller ON player_trade_purchases(seller_id)`);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_ptp_listing ON player_trade_purchases(listing_id)`);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_ptr_reporter ON player_trade_reports(reporter_id)`);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_ptr_reported ON player_trade_reports(reported_player_id)`);
}

try {
  initTradeTables();
} catch (e) {
  console.error('[TradeAPI] 表初始化失败:', e.message);
}

// ============ 常量配置 ============
const PUBLIC_PERIOD_MS = 30 * 60 * 1000; // 公示期30分钟
const TAX_RATE = 0.05; // 5%交易税
const SECT_FEE_FREE = true; // 同一宗门成员交易免手续费
const MIN_PRICE = 1;
const MAX_PRICE = 999999999;

// ============ 辅助函数 ============

// 物品分类映射（用于稀有物品判断）
const RARE_CATEGORIES = ['equipment', 'beast', 'gongfa', 'artifact', 'fashion'];
const RARE_ITEM_KEYS = [/^equip_/, /^beast_/, /^gongfa_/, /^artifact_/, /^fashion_/, /^secret_/, /^pill_legendary/];

function isPreciousItem(itemKey, itemCategory) {
  if (RARE_CATEGORIES.includes(itemCategory)) return true;
  for (const pattern of RARE_ITEM_KEYS) {
    if (pattern.test(itemKey)) return true;
  }
  return false;
}

// 获取玩家宗门ID
function getPlayerSectId(database, playerId) {
  const member = database.prepare(
    'SELECT sect_id FROM sect_members WHERE player_id = ?'
  ).get(playerId);
  return member ? member.sect_id : null;
}

// 检查是否同宗门
function isSameSect(database, playerId1, playerId2) {
  const sect1 = getPlayerSectId(database, playerId1);
  const sect2 = getPlayerSectId(database, playerId2);
  if (!sect1 || !sect2) return false;
  return sect1 === sect2;
}

// 计算交易税
function calculateFee(totalPrice, isSameSect) {
  if (isSameSect && SECT_FEE_FREE) return 0;
  return Math.floor(totalPrice * TAX_RATE);
}

// 确保玩家信用记录存在
function ensureReputation(database, playerId, playerName) {
  const existing = database.prepare(
    'SELECT * FROM player_trade_reputation WHERE player_id = ?'
  ).get(playerId);
  if (!existing) {
    database.prepare(`
      INSERT INTO player_trade_reputation (player_id, player_name, credit_score, total_trades, successful_trades)
      VALUES (?, ?, 100, 0, 0)
    `).run(playerId, playerName || '匿名');
  }
}

// 更新信用分
function updateReputation(database, playerId, delta) {
  ensureReputation(database, playerId, null);
  database.prepare(`
    UPDATE player_trade_reputation
    SET credit_score = MAX(0, MIN(100, credit_score + ?)),
        updated_at = datetime('now', '+8 hours')
    WHERE player_id = ?
  `).run(delta, playerId);
}

// 格式化物价为"XXX灵石"
function formatPrice(price) {
  return `${price.toLocaleString()}灵石`;
}

// 获取当前UTC+8时间字符串
function nowStr() {
  return new Date(Date.now() + 8 * 3600000).toISOString().replace('T', ' ').slice(0, 19);
}

// 检查公示期是否结束
function isPublicReady(listing) {
  if (listing.listing_type === 'offer') return true; // 求购帖不需要公示
  if (!listing.is_precious) return true; // 非珍品不需要公示
  const publicAt = new Date(listing.public_at.replace(' ', 'T')).getTime();
  return Date.now() >= publicAt + PUBLIC_PERIOD_MS;
}

// ============ 中间件 ============

// 通用玩家ID解析（支持 ?player_id= 或 body.player_id）
function resolvePlayerId(req) {
  return parseInt(req.query.player_id || req.body && req.body.player_id || req.headers['x-player-id'] || 0);
}

// ============ API 端点 ============

// ---- GET /api/trade/listings ----
// 浏览所有上架物品（分页/筛选）
router.get('/listings', (req, res) => {
  try {
    const database = getDb();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 20));
    const offset = (page - 1) * pageSize;
    const category = req.query.category || '';
    const listingType = req.query.type || '';
    const status = req.query.status || 'active';
    const sortBy = req.query.sort || 'created_at';
    const sortOrder = req.query.order === 'asc' ? 'ASC' : 'DESC';
    const minPrice = parseInt(req.query.minPrice) || 0;
    const maxPrice = parseInt(req.query.maxPrice) || MAX_PRICE;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }
    if (listingType) {
      whereClause += ' AND listing_type = ?';
      params.push(listingType);
    }
    if (category) {
      whereClause += ' AND item_category = ?';
      params.push(category);
    }
    if (minPrice > 0) {
      whereClause += ' AND unit_price >= ?';
      params.push(minPrice);
    }
    if (maxPrice < MAX_PRICE) {
      whereClause += ' AND unit_price <= ?';
      params.push(maxPrice);
    }

    // 排序
    const allowedSorts = ['created_at', 'unit_price', 'quantity', 'item_name'];
    const orderCol = allowedSorts.includes(sortBy) ? sortBy : 'created_at';

    const total = database.prepare(`
      SELECT COUNT(*) as cnt FROM player_trade_listings ${whereClause}
    `).get(...params)?.cnt || 0;

    const items = database.prepare(`
      SELECT id, player_id, player_name, item_key, item_name, item_icon, item_category,
             quantity, unit_price, listing_type, status, public_at, is_precious, created_at
      FROM player_trade_listings
      ${whereClause}
      ORDER BY ${orderCol} ${sortOrder}
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset);

    const now = Date.now();
    const listings = items.map(item => {
      const publicAt = new Date(item.public_at.replace(' ', 'T')).getTime();
      const isInPublicPeriod = item.is_precious && item.listing_type === 'sell' &&
        (now < publicAt + PUBLIC_PERIOD_MS);
      return {
        id: item.id,
        playerId: item.player_id,
        playerName: item.player_name || '神秘修士',
        itemKey: item.item_key,
        itemName: item.item_name,
        itemIcon: item.item_icon || '📦',
        itemCategory: item.item_category,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        listingType: item.listing_type,
        status: item.status,
        isInPublicPeriod,
        publicAt: item.public_at,
        isPrecious: !!item.is_precious,
        canBePurchased: !isInPublicPeriod && item.status === 'active' && item.listing_type === 'sell',
        createdAt: item.created_at
      };
    });

    res.json({
      success: true,
      items: listings,
      total,
      page,
      pageSize,
      pages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    console.error('[TradeAPI] 获取上架列表失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---- GET /api/trade/search ----
// 搜索物品
router.get('/search', (req, res) => {
  try {
    const database = getDb();
    const keyword = (req.query.keyword || '').trim();
    const category = req.query.category || '';
    const listingType = req.query.type || '';
    const minPrice = parseInt(req.query.minPrice) || 0;
    const maxPrice = parseInt(req.query.maxPrice) || MAX_PRICE;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 20));
    const offset = (page - 1) * pageSize;

    if (!keyword && !category) {
      return res.status(400).json({ success: false, error: '请提供关键词或分类' });
    }

    let whereClause = "WHERE status = 'active'";
    const params = [];

    if (keyword) {
      whereClause += ' AND (item_name LIKE ? OR item_key LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (category) {
      whereClause += ' AND item_category = ?';
      params.push(category);
    }
    if (listingType) {
      whereClause += ' AND listing_type = ?';
      params.push(listingType);
    }
    if (minPrice > 0) {
      whereClause += ' AND unit_price >= ?';
      params.push(minPrice);
    }
    if (maxPrice < MAX_PRICE) {
      whereClause += ' AND unit_price <= ?';
      params.push(maxPrice);
    }

    const total = database.prepare(`
      SELECT COUNT(*) as cnt FROM player_trade_listings ${whereClause}
    `).get(...params)?.cnt || 0;

    const items = database.prepare(`
      SELECT id, player_id, player_name, item_key, item_name, item_icon, item_category,
             quantity, unit_price, listing_type, status, public_at, is_precious, created_at
      FROM player_trade_listings
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset);

    const now = Date.now();
    const listings = items.map(item => {
      const publicAt = new Date(item.public_at.replace(' ', 'T')).getTime();
      const isInPublicPeriod = item.is_precious && item.listing_type === 'sell' &&
        (now < publicAt + PUBLIC_PERIOD_MS);
      return {
        id: item.id,
        playerId: item.player_id,
        playerName: item.player_name || '神秘修士',
        itemKey: item.item_key,
        itemName: item.item_name,
        itemIcon: item.item_icon || '📦',
        itemCategory: item.item_category,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        listingType: item.listing_type,
        isInPublicPeriod,
        isPrecious: !!item.is_precious,
        canBePurchased: !isInPublicPeriod && item.status === 'active' && item.listing_type === 'sell'
      };
    });

    res.json({
      success: true,
      keyword,
      items: listings,
      total,
      page,
      pageSize,
      pages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    console.error('[TradeAPI] 搜索失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---- POST /api/trade/listing ----
// 上架物品（从背包）
router.post('/listing', (req, res) => {
  try {
    const database = getDb();
    const {
      player_id, item_key, item_name, item_icon, item_category,
      quantity, unit_price, listing_type, item_data
    } = req.body;

    if (!player_id || !item_key || !unit_price) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const playerId = parseInt(player_id);
    const qty = Math.max(1, parseInt(quantity) || 1);
    const price = Math.max(MIN_PRICE, Math.min(MAX_PRICE, parseInt(unit_price)));
    const type = listing_type || 'sell';

    // 获取玩家信息
    const player = database.prepare('SELECT * FROM player WHERE id = ?').get(playerId);
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }

    // 检查物品是否在背包（通过bag表或player_game_data）
    let hasItem = false;
    let itemDetail = null;

    // 尝试从背包检查
    const bagItem = database.prepare(
      'SELECT * FROM player_bag WHERE player_id = ? AND item_id = ? AND quantity >= ?'
    ).get(playerId, item_key, qty);

    if (bagItem) {
      hasItem = true;
      itemDetail = bagItem;
    }

    // 如果是装备类物品，尝试从player_game_data检查（表格可能不存在）
    if (!hasItem) {
      try {
        const gameData = database.prepare(
          'SELECT player_data FROM player_game_data WHERE player_id = ?'
        ).get(playerId);
        if (gameData && gameData.player_data) {
          const data = JSON.parse(gameData.player_data);
          const equipment = data.equipment || [];
          const matchedEquip = equipment.find(e => e.item_key === item_key);
          if (matchedEquip) {
            hasItem = true;
            itemDetail = matchedEquip;
          }
        }
      } catch (e) { /* table may not exist, ignore */ }
    }

    // 如果是求购帖（offer），不需要检查物品
    if (type === 'offer' && !hasItem) {
      // 求购帖直接上架
      const now = nowStr();
      const publicAt = now; // 求购帖立即生效
      const result = database.prepare(`
        INSERT INTO player_trade_listings
        (player_id, player_name, item_key, item_name, item_icon, item_category,
         quantity, unit_price, listing_type, status, public_at, is_precious)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'offer', 'active', ?, 0)
      `).run(
        playerId,
        getPlayerName(database, playerId),
        item_key,
        item_name || item_key,
        item_icon || '📦',
        item_category || 'other',
        qty, price, publicAt
      );

      return res.json({
        success: true,
        listing_id: result.lastInsertRowid,
        message: '求购帖发布成功',
        listingType: 'offer'
      });
    }

    if (!hasItem && type !== 'offer') {
      return res.status(400).json({ success: false, error: '背包中没有该物品或数量不足' });
    }

    // 判断是否珍品（进入公示期）
    const cat = item_category || 'other';
    const isPrecious = isPreciousItem(item_key, cat) ? 1 : 0;
    const now = nowStr();
    const publicAt = now; // 立即上架，公示期从此刻开始计算

    // 扣除背包物品
    if (bagItem) {
      if (bagItem.quantity > qty) {
        database.prepare(
          'UPDATE player_bag SET quantity = quantity - ? WHERE player_id = ? AND item_id = ?'
        ).run(qty, playerId, item_key);
      } else {
        database.prepare(
          'DELETE FROM player_bag WHERE player_id = ? AND item_id = ?'
        ).run(playerId, item_key);
      }
    }

    // 如果是装备，从player_game_data中移除（表格可能不存在）
    if (!bagItem && itemDetail) {
      try {
        const gameData = database.prepare(
          'SELECT player_data FROM player_game_data WHERE player_id = ?'
        ).get(playerId);
        if (gameData && gameData.player_data) {
          const data = JSON.parse(gameData.player_data);
          data.equipment = (data.equipment || []).filter(e => e.item_key !== item_key);
          database.prepare(
            'UPDATE player_game_data SET player_data = ?, updated_at = datetime("now", "+8 hours") WHERE player_id = ?'
          ).run(JSON.stringify(data), playerId);
        }
      } catch (e) { /* table may not exist, ignore */ }
    }

    // 创建上架记录
    const result = database.prepare(`
      INSERT INTO player_trade_listings
      (player_id, player_name, item_key, item_name, item_icon, item_category,
       quantity, unit_price, listing_type, status, public_at, is_precious)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'sell', 'active', ?, ?)
    `).run(
      playerId,
      getPlayerName(database, playerId),
      item_key,
      item_name || item_key,
      item_icon || '📦',
      cat,
      qty, price, publicAt, isPrecious
    );

    // 更新信用统计
    ensureReputation(database, playerId, getPlayerName(database, playerId));

    const publicMsg = isPrecious ? '（珍品需公示30分钟）' : '';

    res.json({
      success: true,
      listing_id: result.lastInsertRowid,
      message: `上架成功${publicMsg}`,
      isPrecious: !!isPrecious,
      publicAt,
      publicPeriodMs: PUBLIC_PERIOD_MS
    });
  } catch (error) {
    console.error('[TradeAPI] 上架物品失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---- DELETE /api/trade/listing/:id ----
// 下架物品
router.delete('/listing/:id', (req, res) => {
  try {
    const database = getDb();
    const listingId = parseInt(req.params.id);
    const playerId = resolvePlayerId(req);

    if (!listingId) {
      return res.status(400).json({ success: false, error: '无效的上架ID' });
    }

    const listing = database.prepare(
      'SELECT * FROM player_trade_listings WHERE id = ?'
    ).get(listingId);

    if (!listing) {
      return res.status(404).json({ success: false, error: '上架记录不存在' });
    }

    if (listing.player_id !== playerId) {
      return res.status(403).json({ success: false, error: '只能下架自己的物品' });
    }

    if (listing.status !== 'active') {
      return res.status(400).json({ success: false, error: '该物品已不是上架状态' });
    }

    // 开启事务：返还物品给卖家 + 更新状态
    const transaction = database.transaction(() => {
      // 返还物品（如果是出售帖）
      if (listing.listing_type === 'sell') {
        // 尝试返还到背包
        const existingBag = database.prepare(
          'SELECT * FROM player_bag WHERE player_id = ? AND item_id = ?'
        ).get(playerId, listing.item_key);

        if (existingBag) {
          database.prepare(
            'UPDATE player_bag SET quantity = quantity + ? WHERE player_id = ? AND item_id = ?'
          ).run(listing.quantity, playerId, listing.item_key);
        } else {
          database.prepare(`
            INSERT INTO player_bag (player_id, item_id, item_name, item_icon, quantity)
            VALUES (?, ?, ?, ?, ?)
          `).run(playerId, listing.item_key, listing.item_name, listing.item_icon, listing.quantity);
        }
      }

      // 更新状态
      database.prepare(
        "UPDATE player_trade_listings SET status = 'cancelled' WHERE id = ?"
      ).run(listingId);
    });

    transaction();

    res.json({
      success: true,
      message: listing.listing_type === 'offer' ? '求购帖已取消' : '物品已下架并返还背包'
    });
  } catch (error) {
    console.error('[TradeAPI] 下架物品失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---- POST /api/trade/buy ----
// 立即购买
router.post('/buy', (req, res) => {
  try {
    const database = getDb();
    const { player_id, listing_id, quantity } = req.body;

    if (!player_id || !listing_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const buyerId = parseInt(player_id);
    const listingId = parseInt(listing_id);
    const buyQty = Math.max(1, parseInt(quantity) || 1);

    const listing = database.prepare(
      'SELECT * FROM player_trade_listings WHERE id = ? AND status = ?'
    ).get(listingId, 'active');

    if (!listing) {
      return res.status(404).json({ success: false, error: '物品不存在或已下架' });
    }

    if (listing.listing_type !== 'sell') {
      return res.status(400).json({ success: false, error: '该上架不是出售类型，请查看求购帖' });
    }

    if (listing.player_id === buyerId) {
      return res.status(400).json({ success: false, error: '不能购买自己上架的物品' });
    }

    // 检查公示期
    if (!isPublicReady(listing)) {
      return res.status(400).json({
        success: false,
        error: '该物品仍在公示期，请稍后再试',
        publicAt: listing.public_at,
        publicPeriodMs: PUBLIC_PERIOD_MS
      });
    }

    // 检查数量
    if (buyQty > listing.quantity) {
      return res.status(400).json({ success: false, error: '购买数量超过上架数量' });
    }

    // 获取买家信息
    const buyer = database.prepare('SELECT * FROM player WHERE id = ?').get(buyerId);
    if (!buyer) {
      return res.status(404).json({ success: false, error: '买家不存在' });
    }

    // 计算总价和手续费
    const totalPrice = listing.unit_price * buyQty;
    const sameSect = isSameSect(database, buyerId, listing.player_id);
    const fee = calculateFee(totalPrice, sameSect);
    const sellerReceives = totalPrice - fee;

    if (buyer.spirit_stones < totalPrice) {
      return res.status(400).json({
        success: false,
        error: `灵石不足，需要 ${formatPrice(totalPrice)}，你只有 ${formatPrice(buyer.spirit_stones)}`
      });
    }

    const transaction = database.transaction(() => {
      // 1. 扣除买家灵石
      database.prepare(
        'UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?'
      ).run(totalPrice, buyerId);

      // 2. 增加卖家灵石（扣除手续费后）
      database.prepare(
        'UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?'
      ).run(sellerReceives, listing.player_id);

      // 3. 转移物品给买家
      const existingBag = database.prepare(
        'SELECT * FROM player_bag WHERE player_id = ? AND item_id = ?'
      ).get(buyerId, listing.item_key);

      if (existingBag) {
        database.prepare(
          'UPDATE player_bag SET quantity = quantity + ? WHERE player_id = ? AND item_id = ?'
        ).run(buyQty, buyerId, listing.item_key);
      } else {
        database.prepare(`
          INSERT INTO player_bag (player_id, item_id, item_name, item_icon, quantity)
          VALUES (?, ?, ?, ?, ?)
        `).run(buyerId, listing.item_key, listing.item_name, listing.item_icon, buyQty);
      }

      // 4. 更新上架记录
      const remainingQty = listing.quantity - buyQty;
      if (remainingQty <= 0) {
        database.prepare(
          "UPDATE player_trade_listings SET status = 'sold', buyer_id = ? WHERE id = ?"
        ).run(buyerId, listingId);
      } else {
        database.prepare(
          'UPDATE player_trade_listings SET quantity = ? WHERE id = ?'
        ).run(remainingQty, listingId);
      }

      // 5. 记录交易
      database.prepare(`
        INSERT INTO player_trade_purchases
        (listing_id, buyer_id, buyer_name, seller_id, seller_name, item_key, item_name, item_icon,
         quantity, unit_price, total_price, fee, is_same_sect)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        listingId, buyerId, getPlayerName(database, buyerId),
        listing.player_id, listing.player_name,
        listing.item_key, listing.item_name, listing.item_icon,
        buyQty, listing.unit_price, totalPrice, fee, sameSect ? 1 : 0
      );

      // 6. 更新买卖双方信用
      ensureReputation(database, buyerId, getPlayerName(database, buyerId));
      ensureReputation(database, listing.player_id, listing.player_name);

      database.prepare(`
        UPDATE player_trade_reputation
        SET total_trades = total_trades + 1,
            successful_trades = successful_trades + 1,
            total_purchases = total_purchases + 1,
            successful_purchases = successful_purchases + 1,
            last_trade_at = datetime('now', '+8 hours')
        WHERE player_id = ?
      `).run(buyerId);

      database.prepare(`
        UPDATE player_trade_reputation
        SET total_trades = total_trades + 1,
            successful_trades = successful_trades + 1,
            total_sales = total_sales + 1,
            successful_sales = successful_sales + 1,
            last_trade_at = datetime('now', '+8 hours')
        WHERE player_id = ?
      `).run(listing.player_id);
    });

    transaction();

    const seller = database.prepare('SELECT spirit_stones FROM player WHERE id = ?').get(listing.player_id);

    res.json({
      success: true,
      message: `购买成功！获得 ${listing.item_icon} ${listing.item_name} x${buyQty}`,
      data: {
        item: {
          itemKey: listing.item_key,
          itemName: listing.item_name,
          itemIcon: listing.item_icon,
          quantity: buyQty
        },
        totalPrice,
        fee,
        feeWaived: sameSect,
        sellerReceives,
        remainingSpiritStones: buyer.spirit_stones - totalPrice
      }
    });
  } catch (error) {
    console.error('[TradeAPI] 购买失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---- POST /api/trade/offer ----
// 响应求购帖（卖东西给求购者）
router.post('/offer', (req, res) => {
  try {
    const database = getDb();
    const { player_id, listing_id, quantity, unit_price } = req.body;

    if (!player_id || !listing_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const sellerId = parseInt(player_id);
    const listingId = parseInt(listing_id);
    const offerQty = Math.max(1, parseInt(quantity) || 1);
    const offerPrice = parseInt(unit_price) || 0;

    const listing = database.prepare(
      'SELECT * FROM player_trade_listings WHERE id = ? AND status = ?'
    ).get(listingId, 'active');

    if (!listing) {
      return res.status(404).json({ success: false, error: '求购帖不存在或已结束' });
    }

    if (listing.listing_type !== 'offer') {
      return res.status(400).json({ success: false, error: '该上架不是求购类型' });
    }

    if (listing.player_id === sellerId) {
      return res.status(400).json({ success: false, error: '不能响应自己的求购帖' });
    }

    // 验证价格是否符合求购价（可以低于或等于）
    if (offerPrice > listing.unit_price) {
      return res.status(400).json({
        success: false,
        error: `报价不能高于求购价 ${formatPrice(listing.unit_price)}`
      });
    }

    // 检查卖家的背包物品
    const bagItem = database.prepare(
      'SELECT * FROM player_bag WHERE player_id = ? AND item_id = ? AND quantity >= ?'
    ).get(sellerId, listing.item_key, offerQty);

    if (!bagItem) {
      return res.status(400).json({ success: false, error: '背包中没有该物品或数量不足' });
    }

    const seller = database.prepare('SELECT * FROM player WHERE id = ?').get(sellerId);
    if (!seller) {
      return res.status(404).json({ success: false, error: '卖家不存在' });
    }

    const actualPrice = offerPrice || listing.unit_price;
    const totalPrice = actualPrice * offerQty;
    const sameSect = isSameSect(database, sellerId, listing.player_id);
    const fee = calculateFee(totalPrice, sameSect);
    const buyerCost = totalPrice;

    // 获取买家信息检查灵石
    const buyer = database.prepare('SELECT * FROM player WHERE id = ?').get(listing.player_id);
    if (!buyer) {
      return res.status(404).json({ success: false, error: '求购者不存在' });
    }

    if (buyer.spirit_stones < buyerCost) {
      return res.status(400).json({ success: false, error: '求购者灵石不足' });
    }

    const transaction = database.transaction(() => {
      // 1. 扣除买家灵石
      database.prepare(
        'UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?'
      ).run(buyerCost, listing.player_id);

      // 2. 增加卖家灵石
      database.prepare(
        'UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?'
      ).run(buyerCost - fee, sellerId);

      // 3. 扣除卖家背包物品
      if (bagItem.quantity > offerQty) {
        database.prepare(
          'UPDATE player_bag SET quantity = quantity - ? WHERE player_id = ? AND item_id = ?'
        ).run(offerQty, sellerId, listing.item_key);
      } else {
        database.prepare(
          'DELETE FROM player_bag WHERE player_id = ? AND item_id = ?'
        ).run(sellerId, listing.item_key);
      }

      // 4. 将物品给买家
      const existingBuyerBag = database.prepare(
        'SELECT * FROM player_bag WHERE player_id = ? AND item_id = ?'
      ).get(listing.player_id, listing.item_key);

      if (existingBuyerBag) {
        database.prepare(
          'UPDATE player_bag SET quantity = quantity + ? WHERE player_id = ? AND item_id = ?'
        ).run(offerQty, listing.player_id, listing.item_key);
      } else {
        database.prepare(`
          INSERT INTO player_bag (player_id, item_id, item_name, item_icon, quantity)
          VALUES (?, ?, ?, ?, ?)
        `).run(listing.player_id, listing.item_key, listing.item_name, listing.item_icon, offerQty);
      }

      // 5. 更新求购帖
      const remainingQty = listing.quantity - offerQty;
      if (remainingQty <= 0) {
        database.prepare(
          "UPDATE player_trade_listings SET status = 'completed', buyer_id = ? WHERE id = ?"
        ).run(sellerId, listingId);
      } else {
        database.prepare(
          'UPDATE player_trade_listings SET quantity = ? WHERE id = ?'
        ).run(remainingQty, listingId);
      }

      // 6. 记录交易
      database.prepare(`
        INSERT INTO player_trade_purchases
        (listing_id, buyer_id, buyer_name, seller_id, seller_name, item_key, item_name, item_icon,
         quantity, unit_price, total_price, fee, is_same_sect)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        listingId, listing.player_id, listing.player_name || '匿名',
        sellerId, getPlayerName(database, sellerId),
        listing.item_key, listing.item_name, listing.item_icon,
        offerQty, actualPrice, totalPrice, fee, sameSect ? 1 : 0
      );

      // 7. 更新信用
      ensureReputation(database, sellerId, getPlayerName(database, sellerId));
      ensureReputation(database, listing.player_id, listing.player_name);

      database.prepare(`
        UPDATE player_trade_reputation
        SET total_trades = total_trades + 1, successful_trades = successful_trades + 1,
            total_sales = total_sales + 1, successful_sales = successful_sales + 1,
            last_trade_at = datetime('now', '+8 hours')
        WHERE player_id = ?
      `).run(sellerId);

      database.prepare(`
        UPDATE player_trade_reputation
        SET total_trades = total_trades + 1, successful_trades = successful_trades + 1,
            total_purchases = total_purchases + 1, successful_purchases = successful_purchases + 1,
            last_trade_at = datetime('now', '+8 hours')
        WHERE player_id = ?
      `).run(listing.player_id);
    });

    transaction();

    res.json({
      success: true,
      message: `交易成功！向 ${listing.player_name} 出售 ${listing.item_icon} ${listing.item_name} x${offerQty}`,
      data: {
        item: { itemKey: listing.item_key, itemName: listing.item_name, itemIcon: listing.item_icon, quantity: offerQty },
        totalPrice: buyerCost,
        fee,
        feeWaived: sameSect,
        netReceived: buyerCost - fee,
        buyerRemainingSpiritStones: buyer.spirit_stones - buyerCost
      }
    });
  } catch (error) {
    console.error('[TradeAPI] 响应求购失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---- GET /api/trade/my-listings ----
// 我的上架列表
router.get('/my-listings', (req, res) => {
  try {
    const database = getDb();
    const playerId = resolvePlayerId(req);
    const status = req.query.status || '';

    if (!playerId) {
      return res.status(400).json({ success: false, error: '缺少player_id' });
    }

    let whereClause = 'WHERE player_id = ?';
    const params = [playerId];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    const items = database.prepare(`
      SELECT id, player_id, player_name, item_key, item_name, item_icon, item_category,
             quantity, unit_price, listing_type, status, public_at, is_precious, created_at
      FROM player_trade_listings
      ${whereClause}
      ORDER BY created_at DESC
    `).all(...params);

    const now = Date.now();
    const listings = items.map(item => {
      const publicAt = new Date(item.public_at.replace(' ', 'T')).getTime();
      const isInPublicPeriod = item.is_precious && item.listing_type === 'sell' &&
        (now < publicAt + PUBLIC_PERIOD_MS);
      return {
        id: item.id,
        itemKey: item.item_key,
        itemName: item.item_name,
        itemIcon: item.item_icon || '📦',
        itemCategory: item.item_category,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        listingType: item.listing_type,
        status: item.status,
        isInPublicPeriod,
        isPrecious: !!item.is_precious,
        canBePurchased: !isInPublicPeriod && item.status === 'active' && item.listing_type === 'sell',
        createdAt: item.created_at
      };
    });

    res.json({ success: true, items: listings, total: listings.length });
  } catch (error) {
    console.error('[TradeAPI] 获取我的上架失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---- GET /api/trade/my-purchases ----
// 我的购买历史
router.get('/my-purchases', (req, res) => {
  try {
    const database = getDb();
    const playerId = resolvePlayerId(req);

    if (!playerId) {
      return res.status(400).json({ success: false, error: '缺少player_id' });
    }

    const purchases = database.prepare(`
      SELECT id, listing_id, seller_id, seller_name, item_key, item_name, item_icon,
             quantity, unit_price, total_price, fee, is_same_sect, traded_at
      FROM player_trade_purchases
      WHERE buyer_id = ?
      ORDER BY traded_at DESC
      LIMIT 100
    `).all(playerId);

    res.json({
      success: true,
      items: purchases.map(p => ({
        id: p.id,
        listingId: p.listing_id,
        sellerId: p.seller_id,
        sellerName: p.seller_name || '匿名',
        itemKey: p.item_key,
        itemName: p.item_name,
        itemIcon: p.item_icon || '📦',
        quantity: p.quantity,
        unitPrice: p.unit_price,
        totalPrice: p.total_price,
        fee: p.fee,
        feeWaived: !!p.is_same_sect,
        tradedAt: p.traded_at
      })),
      total: purchases.length
    });
  } catch (error) {
    console.error('[TradeAPI] 获取购买历史失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---- GET /api/trade/history ----
// 交易历史（含出售和购买）
router.get('/history', (req, res) => {
  try {
    const database = getDb();
    const playerId = resolvePlayerId(req);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || 20));
    const offset = (page - 1) * pageSize;

    if (!playerId) {
      return res.status(400).json({ success: false, error: '缺少player_id' });
    }

    // 买入历史
    const buyTotal = database.prepare(
      'SELECT COUNT(*) as cnt FROM player_trade_purchases WHERE buyer_id = ?'
    ).get(playerId)?.cnt || 0;

    // 卖出历史（以seller_id查）
    const sellTotal = database.prepare(
      'SELECT COUNT(*) as cnt FROM player_trade_purchases WHERE seller_id = ?'
    ).get(playerId)?.cnt || 0;

    const items = database.prepare(`
      SELECT id, listing_id, buyer_id, buyer_name, seller_id, seller_name,
             item_key, item_name, item_icon, quantity, unit_price,
             total_price, fee, is_same_sect, traded_at
      FROM player_trade_purchases
      WHERE buyer_id = ? OR seller_id = ?
      ORDER BY traded_at DESC
      LIMIT ? OFFSET ?
    `).all(playerId, playerId, pageSize, offset);

    res.json({
      success: true,
      items: items.map(p => ({
        id: p.id,
        listingId: p.listing_id,
        buyerId: p.buyer_id,
        buyerName: p.buyer_name || '匿名',
        sellerId: p.seller_id,
        sellerName: p.seller_name || '匿名',
        itemKey: p.item_key,
        itemName: p.item_name,
        itemIcon: p.item_icon || '📦',
        quantity: p.quantity,
        unitPrice: p.unit_price,
        totalPrice: p.total_price,
        fee: p.fee,
        feeWaived: !!p.is_same_sect,
        role: p.buyer_id === playerId ? 'buyer' : 'seller',
        tradedAt: p.traded_at
      })),
      buyTotal,
      sellTotal,
      total: buyTotal + sellTotal,
      page,
      pageSize
    });
  } catch (error) {
    console.error('[TradeAPI] 获取交易历史失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---- GET /api/trade/reputation ----
// 交易信用查询
router.get('/reputation', (req, res) => {
  try {
    const database = getDb();
    const playerId = resolvePlayerId(req) || parseInt(req.query.player_id) || 0;

    if (!playerId) {
      return res.status(400).json({ success: false, error: '缺少player_id' });
    }

    let rep = database.prepare(
      'SELECT * FROM player_trade_reputation WHERE player_id = ?'
    ).get(playerId);

    // 如果没有记录，创建默认记录
    if (!rep) {
      const playerName = getPlayerName(database, playerId);
      database.prepare(`
        INSERT INTO player_trade_reputation (player_id, player_name, credit_score, total_trades, successful_trades)
        VALUES (?, ?, 100, 0, 0)
      `).run(playerId, playerName);
      rep = database.prepare(
        'SELECT * FROM player_trade_reputation WHERE player_id = ?'
      ).get(playerId);
    }

    // 获取信用等级
    const score = rep.credit_score;
    let creditLevel = '普通';
    let creditLabel = '☁️';
    if (score >= 90) { creditLevel = '卓越'; creditLabel = '⭐'; }
    else if (score >= 75) { creditLevel = '优秀'; creditLabel = '🌟'; }
    else if (score >= 50) { creditLevel = '良好'; creditLabel = '✓'; }
    else if (score >= 25) { creditLevel = '欠佳'; creditLabel = '⚠️'; }
    else { creditLevel = '危险'; creditLabel = '🚫'; }

    // 计算成功率
    const successRate = rep.total_trades > 0
      ? Math.round((rep.successful_trades / rep.total_trades) * 100)
      : 100;

    res.json({
      success: true,
      playerId,
      playerName: rep.player_name,
      creditScore: score,
      creditLevel,
      creditLabel,
      successRate,
      totalTrades: rep.total_trades,
      successfulTrades: rep.successful_trades,
      totalSales: rep.total_sales,
      successfulSales: rep.successful_sales,
      totalPurchases: rep.total_purchases,
      successfulPurchases: rep.successful_purchases,
      reportsReceived: rep.reports_received,
      reportsFiled: rep.reports_filed,
      lastTradeAt: rep.last_trade_at
    });
  } catch (error) {
    console.error('[TradeAPI] 获取信用失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---- POST /api/trade/report ----
// 举报玩家/上架
router.post('/report', (req, res) => {
  try {
    const database = getDb();
    const { reporter_id, reported_player_id, listing_id, reason, evidence } = req.body;

    if (!reporter_id || !reported_player_id || !reason) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const reporterId = parseInt(reporter_id);
    const reportedId = parseInt(reported_player_id);

    if (reporterId === reportedId) {
      return res.status(400).json({ success: false, error: '不能举报自己' });
    }

    // 获取玩家名称
    const reporterName = getPlayerName(database, reporterId);
    const reportedName = getPlayerName(database, reportedId);

    // 创建举报记录
    const result = database.prepare(`
      INSERT INTO player_trade_reports
      (reporter_id, reporter_name, reported_player_id, reported_player_name, listing_id, reason, evidence)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      reporterId,
      reporterName,
      reportedId,
      reportedName,
      listing_id || null,
      reason,
      evidence || null
    );

    // 更新举报者信用统计
    ensureReputation(database, reporterId, reporterName);
    database.prepare(`
      UPDATE player_trade_reputation
      SET reports_filed = reports_filed + 1
      WHERE player_id = ?
    `).run(reporterId);

    res.json({
      success: true,
      report_id: result.lastInsertRowid,
      message: '举报已提交，感谢您的反馈'
    });
  } catch (error) {
    console.error('[TradeAPI] 提交举报失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---- POST /api/trade/admin/handle-report ----
// 处理举报（管理员）
router.post('/admin/handle-report', (req, res) => {
  try {
    const database = getDb();
    const { report_id, handler_id, action, penalty_score } = req.body;

    if (!report_id || !handler_id || !action) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const report = database.prepare(
      'SELECT * FROM player_trade_reports WHERE id = ?'
    ).get(report_id);

    if (!report) {
      return res.status(404).json({ success: false, error: '举报不存在' });
    }

    if (report.status !== 'pending') {
      return res.status(400).json({ success: false, error: '该举报已处理' });
    }

    const transaction = database.transaction(() => {
      // 更新举报状态
      database.prepare(`
        UPDATE player_trade_reports
        SET status = ?, handled_at = datetime('now', '+8 hours'), handler_id = ?
        WHERE id = ?
      `).run(action, handler_id, report_id);

      // 如果是有效举报，处罚被举报者
      if (action === 'valid') {
        const penalty = Math.abs(parseInt(penalty_score) || -5);
        updateReputation(database, report.reported_player_id, penalty);

        // 更新被举报次数
        ensureReputation(database, report.reported_player_id, report.reported_player_name);
        database.prepare(`
          UPDATE player_trade_reputation
          SET reports_received = reports_received + 1
          WHERE player_id = ?
        `).run(report.reported_player_id);
      }
    });

    transaction();

    res.json({
      success: true,
      message: action === 'valid' ? '举报已确认，已扣除信用分' : '举报已驳回'
    });
  } catch (error) {
    console.error('[TradeAPI] 处理举报失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
