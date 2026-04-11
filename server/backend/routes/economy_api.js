/**
 * 经济系统 API路由
 * P52-5: 灵石通货膨胀控制 + 稀有材料产出调控 + 交易行价格区间
 * 端点: /api/economy/*
 */

const express = require('express');
const router = express.Router();
const path = require('path');

let economy;
try {
  economy = require('../../game/economy_balance');
} catch (e) {
  economy = {
    ECONOMY_BALANCE: {},
    getDailyLingshiCap: () => 50000,
    getSuggestedPrice: () => ({ min: 10, max: 100, suggested: 50 }),
    validateListingPrice: () => ({ valid: true }),
    calculateListingFee: (p) => Math.floor(p * 0.01),
    calculateTransactionTax: (p) => ({ tax: Math.floor(p * 0.05), sellerReceives: Math.floor(p * 0.95) }),
    calculateInflationIndex: () => ({ index: 1.0, status: 'normal' }),
    getRecommendedSinks: () => []
  };
}

const DB_PATH = path.join(__dirname, '..', 'data', 'game.db');
let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
} catch (e) {
  db = { prepare: () => ({ get: () => null, all: () => [], run: () => {} }) };
}

function getPlayerId(req) {
  return req.query.player_id || req.body?.player_id || 1;
}

// ============ 灵石通胀指数 ============

// GET /api/economy/inflation - 获取全服通胀指数
router.get('/inflation', (req, res) => {
  let totalLingshi = 0;
  let activePlayers = 0;

  try {
    totalLingshi = db.prepare(`SELECT SUM(stones) as total FROM players`).get()?.total || 0;
    activePlayers = db.prepare(`SELECT COUNT(*) as cnt FROM players WHERE last_login > datetime('now', '-7 days')`).get()?.cnt || 1;
  } catch (e) {}

  const gameState = { total_lingshi_supply: totalLingshi, active_players: activePlayers };
  const inflation = economy.calculateInflationIndex(gameState);

  res.json({ code: 0, data: inflation });
});

// ============ 个人灵石上限 ============

// GET /api/economy/lingshi-cap - 获取个人每日灵石上限
router.get('/lingshi-cap', (req, res) => {
  const playerId = getPlayerId(req);

  let player = null;
  try {
    player = db.prepare(`SELECT level, vip_level, stones FROM players WHERE id = ?`).get(playerId);
  } catch (e) {
    player = { level: 1, vip_level: 0 };
  }

  const cap = economy.getDailyLingshiCap(player.level || 1, player.vip_level || 0);
  const current = player.stones || 0;
  const excess = current - cap;

  res.json({
    code: 0,
    data: {
      cap,
      current,
      excess: Math.max(0, excess),
      recommendedSinks: economy.getRecommendedSinks(player.level || 1, current)
    }
  });
});

// ============ 交易行 ============

// GET /api/economy/market/suggested - 获取物品建议价格
router.get('/market/suggested', (req, res) => {
  const { rarity, item_type } = req.query;

  // 尝试从市场数据计算实际均价
  let marketData = null;
  if (rarity) {
    try {
      const recent = db.prepare(`
        SELECT AVG(price) as avg, COUNT(*) as cnt
        FROM market_listings
        WHERE item_rarity = ? AND status = 'sold'
        AND created_at > datetime('now', '-7 days')
      `).get(rarity);

      if (recent && recent.cnt > 0) {
        marketData = { recentAvg: recent.avg, volume: recent.cnt };
      }
    } catch (e) {}
  }

  const price = economy.getSuggestedPrice(rarity || 'common', item_type || 'material', marketData);
  res.json({ code: 0, data: { ...price, rarity, item_type, marketData } });
});

// POST /api/economy/market/validate - 验证挂单价格
router.post('/market/validate', (req, res) => {
  const { price, rarity } = req.body;
  const validation = economy.validateListingPrice(price, rarity || 'common');
  res.json({ code: validation.valid ? 0 : 400, message: validation.reason || '', data: validation });
});

// POST /api/economy/market/list - 创建挂单
router.post('/market/list', (req, res) => {
  const playerId = getPlayerId(req);
  const { item_id, price, rarity } = req.body;

  if (!item_id || !price) {
    return res.json({ code: 400, message: '参数不完整' });
  }

  // 验证价格
  const validation = economy.validateListingPrice(price, rarity || 'common');
  if (!validation.valid) {
    return res.json({ code: 400, message: validation.reason });
  }

  // 计算手续费
  const fee = economy.calculateListingFee(price);

  // 检查灵石是否够付手续费
  const playerStones = db.prepare(`SELECT stones FROM players WHERE id = ?`).get(playerId)?.stones || 0;
  if (playerStones < fee) {
    return res.json({ code: 400, message: `手续费不足，需要${fee}灵石` });
  }

  // 扣除手续费并创建挂单
  try {
    db.prepare(`UPDATE players SET stones = stones - ? WHERE id = ?`).run(fee, playerId);
    const result = db.prepare(`
      INSERT INTO market_listings (player_id, item_id, price, item_rarity, fee, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'active', datetime('now'))
    `).run(playerId, item_id, price, rarity || 'common', fee);

    res.json({ code: 0, message: '挂单成功', data: { listing_id: result.lastInsertRowid, fee } });
  } catch (e) {
    res.json({ code: 500, message: '挂单失败：' + e.message });
  }
});

// GET /api/economy/market/listings - 获取市场挂单列表
router.get('/market/listings', (req, res) => {
  const { rarity, sort = 'price_asc', page = 1, pageSize = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  let query = `SELECT ml.*, p.username as seller_name FROM market_listings ml JOIN players p ON ml.player_id = p.id WHERE ml.status = 'active'`;
  const params = [];

  if (rarity) {
    query += ` AND ml.item_rarity = ?`;
    params.push(rarity);
  }

  const orderMap = {
    price_asc: 'ORDER BY ml.price ASC',
    price_desc: 'ORDER BY ml.price DESC',
    time_desc: 'ORDER BY ml.created_at DESC'
  };
  query += ` ${orderMap[sort] || orderMap.price_asc} LIMIT ? OFFSET ?`;
  params.push(parseInt(pageSize), offset);

  let listings = [];
  try {
    listings = db.prepare(query).all(...params);
  } catch (e) {
    listings = [];
  }

  res.json({ code: 0, data: { listings, page: parseInt(page), pageSize: parseInt(pageSize) } });
});

// POST /api/economy/market/buy - 购买物品
router.post('/market/buy', (req, res) => {
  const playerId = getPlayerId(req);
  const { listing_id } = req.body;

  let listing = null;
  try {
    listing = db.prepare(`SELECT * FROM market_listings WHERE id = ? AND status = 'active'`).get(listing_id);
  } catch (e) {
    listing = null;
  }

  if (!listing) {
    return res.json({ code: 404, message: '挂单不存在或已下架' });
  }

  if (listing.player_id === playerId) {
    return res.json({ code: 400, message: '不能购买自己的物品' });
  }

  const { tax, sellerReceives } = economy.calculateTransactionTax(listing.price);

  // 检查买家灵石
  const buyerStones = db.prepare(`SELECT stones FROM players WHERE id = ?`).get(playerId)?.stones || 0;
  if (buyerStones < listing.price) {
    return res.json({ code: 400, message: '灵石不足' });
  }

  try {
    // 扣除买家灵石
    db.prepare(`UPDATE players SET stones = stones - ? WHERE id = ?`).run(listing.price, playerId);
    // 给卖家转账（扣除税）
    db.prepare(`UPDATE players SET stones = stones + ? WHERE id = ?`).run(sellerReceives, listing.player_id);
    // 标记挂单已售
    db.prepare(`UPDATE market_listings SET status = 'sold', buyer_id = ?, sold_at = datetime('now') WHERE id = ?`).run(playerId, listing_id);
    // 转移物品
    db.prepare(`UPDATE player_items SET player_id = ? WHERE id = ?`).run(playerId, listing.item_id);

    res.json({ code: 0, message: '购买成功', data: { price: listing.price, tax, sellerReceives } });
  } catch (e) {
    res.json({ code: 500, message: '交易失败：' + e.message });
  }
});

// ============ 材料掉落预览 ============

// GET /api/economy/material-drop - 预览材料掉落
router.get('/material-drop', (req, res) => {
  const playerLevel = parseInt(req.query.level) || 1;
  const dungeonLevel = parseInt(req.query.dungeon_level) || playerLevel;

  const drops = economy.rollMaterialDrops(playerLevel, dungeonLevel, 'general');
  res.json({ code: 0, data: { drops, playerLevel, dungeonLevel } });
});

// ============ 经济配置 ============

// GET /api/economy/config - 获取经济系统配置
router.get('/config', (req, res) => {
  const cfg = economy.ECONOMY_BALANCE;
  res.json({
    code: 0,
    data: {
      daily_lingshi_cap: cfg.lingshi_control?.daily_lingshi_cap,
      transaction_tax: cfg.market_control?.transaction_tax,
      listing_fee_rate: cfg.market_control?.listing_fee_rate,
      price_ranges: cfg.market_control?.price_ranges,
      material_caps: cfg.material_control?.personal_daily_caps
    }
  });
});

module.exports = router;
