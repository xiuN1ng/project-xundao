/**
 * 限时商店 / 神秘商人系统 (P88-2)
 * 每日神秘商人，4个商品随机出现，支持VIP折扣和多次刷新
 */

const express = require('express');
const router = express.Router();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'game.db');

let db = null;
function getDb() {
  if (!db) {
    try {
      const Database = require('better-sqlite3');
      db = new Database(DB_PATH);
      db.pragma('journal_mode=WAL');
      db.pragma('busy_timeout=5000');
      initTables();
    } catch (e) {
      db = null;
    }
  }
  return db;
}

function getPlayerId(req) {
  return parseInt(req.headers['x-player-id'] || req.query.player_id || req.body?.player_id || 1);
}

// ==================== 配置 ====================
// 神秘商人刷新时间（每日）
const REFRESH_HOURS = [5, 12, 18];
const ITEM_COUNT = 4;
const REFRESH_COST = 100; // 灵石

// VIP折扣表 (VIP等级 -> 折扣率)
const VIP_DISCOUNT = {
  0: 1.0,  // 无折扣
  1: 0.95,
  2: 0.90,
  3: 0.85,
  4: 0.80,
  5: 0.75,
  6: 0.70,
  7: 0.65,
  8: 0.60,
  9: 0.55,
  10: 0.50,
};

// 商品池
const ITEM_POOL = [
  // 装备碎片
  { name: '玄铁碎片', icon: '🔩', price: 200, category: 'equipment_fragment', description: '可合成玄铁剑碎片' },
  { name: '精钢碎片', icon: '⚙️', price: 300, category: 'equipment_fragment', description: '可合成精钢甲碎片' },
  { name: '陨铁碎片', icon: '🌑', price: 500, category: 'equipment_fragment', description: '可合成陨铁剑碎片' },
  { name: '凤羽碎片', icon: '🪶', price: 800, category: 'equipment_fragment', description: '可合成凤羽剑碎片' },
  { name: '龙鳞碎片', icon: '🐉', price: 1000, category: 'equipment_fragment', description: '可合成龙鳞甲碎片' },
  // 丹药
  { name: '聚灵丹', icon: '💊', price: 150, category: 'pill', description: '服用后增加50点修为' },
  { name: '破境丹', icon: '💎', price: 500, category: 'pill', description: '服用后有概率突破境界' },
  { name: '洗髓丹', icon: '✨', price: 300, category: 'pill', description: '提升修炼资质' },
  { name: '天元丹', icon: '🌟', price: 800, category: 'pill', description: '大幅增加修为' },
  { name: '培元丹', icon: '🧪', price: 200, category: 'pill', description: '稳固根基' },
  // 材料
  { name: '灵矿', icon: '💎', price: 100, category: 'material', description: '炼器基础材料' },
  { name: '灵草', icon: '🌿', price: 80, category: 'material', description: '炼丹基础材料' },
  { name: '妖兽骨', icon: '🦴', price: 120, category: 'material', description: '炼器材料' },
  { name: '妖兽血', icon: '🩸', price: 150, category: 'material', description: '炼器材料' },
  { name: '天蚕丝', icon: '🧵', price: 200, category: 'material', description: '制作防具的材料' },
  { name: '九天玄玉', icon: '💠', price: 2000, category: 'material', description: '稀有炼器材料' },
  // 外观
  { name: '蒙面巾', icon: '🎭', price: 300, category: 'fashion', description: '神秘商人的私藏' },
  { name: '古铜面具', icon: '🎭', price: 500, category: 'fashion', description: '古铜色泽，神秘感十足' },
  { name: '紫金冠', icon: '👑', price: 800, category: 'fashion', description: '帝王气质' },
  { name: '羽扇纶巾', icon: '🪭', price: 600, category: 'fashion', description: '谋士装扮' },
  { name: '霓裳羽衣', icon: '👗', price: 1500, category: 'fashion', description: '天女下凡' },
];

// ==================== 工具函数 ====================
function initTables() {
  const database = getDb();
  if (!database) return;
  database.exec(`
    CREATE TABLE IF NOT EXISTS limited_shop_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      item_index INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      item_icon TEXT DEFAULT '📦',
      item_price INTEGER NOT NULL,
      item_category TEXT NOT NULL,
      item_description TEXT DEFAULT '',
      stock INTEGER DEFAULT 1,
      refresh_date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(player_id, item_index, refresh_date)
    );

    CREATE TABLE IF NOT EXISTS limited_shop_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      item_icon TEXT DEFAULT '📦',
      price_paid INTEGER NOT NULL,
      quantity INTEGER DEFAULT 1,
      purchased_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

// 获取今日神秘商人刷新日期
function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// 获取下次刷新时间
function getNextRefreshTime() {
  const now = new Date();
  const currentHour = now.getHours();
  for (const h of REFRESH_HOURS) {
    if (currentHour < h) {
      const next = new Date(now);
      next.setHours(h, 0, 0, 0);
      return next.getTime();
    }
  }
  // 明天5点
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(REFRESH_HOURS[0], 0, 0, 0);
  return next.getTime();
}

// 生成随机商品
function generateRandomItems() {
  const shuffled = [...ITEM_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, ITEM_COUNT).map((item, idx) => ({
    index: idx,
    name: item.name,
    icon: item.icon,
    price: item.price,
    category: item.category,
    description: item.description,
    stock: 1,
  }));
}

// 获取玩家VIP等级 (从player_vip表或玩家数据)
function getPlayerVipLevel(playerId) {
  const database = getDb();
  if (!database) return 0;
  try {
    const row = database.prepare('SELECT vip_level FROM player_vip WHERE player_id = ?').get(playerId);
    if (row) return row.vip_level || 0;
  } catch (e) {}
  try {
    const row = database.prepare('SELECT vip_level FROM Users WHERE id = ?').get(playerId);
    if (row) return row.vip_level || 0;
  } catch (e) {}
  return 0;
}

// 获取今日商品（不存在则生成）
function getOrCreateDailyItems(playerId) {
  const database = getDb();
  if (!database) return [];
  const today = getTodayKey();
  const rows = database.prepare(
    'SELECT * FROM limited_shop_items WHERE player_id = ? AND refresh_date = ? ORDER BY item_index'
  ).all(playerId, today);
  if (rows.length === ITEM_COUNT) {
    return rows;
  }
  // 生成新商品并存储
  const items = generateRandomItems();
  const insert = database.prepare(`
    INSERT OR REPLACE INTO limited_shop_items (player_id, item_index, item_name, item_icon, item_price, item_category, item_description, stock, refresh_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMany = database.transaction((list) => {
    for (const item of list) {
      insert.run(playerId, item.index, item.name, item.icon, item.price, item.category, item.description, item.stock, today);
    }
  });
  insertMany(items);
  return items;
}

// ==================== 路由 ====================

// GET /api/shop/limited - 获取限时商店信息
router.get('/limited', (req, res) => {
  const playerId = getPlayerId(req);
  const database = getDb();
  if (!database) return res.status(500).json({ error: '数据库连接失败' });

  const vipLevel = getPlayerVipLevel(playerId);
  const discount = VIP_DISCOUNT[vipLevel] || 1.0;
  const items = getOrCreateDailyItems(playerId);

  res.json({
    refreshesAt: getNextRefreshTime(),
    items: items.map(item => ({
      itemId: item.item_index,
      name: item.name,
      icon: item.icon,
      originalPrice: item.item_price,
      price: Math.floor(item.item_price * discount),
      category: item.item_category,
      description: item.item_description,
      stock: item.stock,
    })),
    discount: discount,
    vipLevel: vipLevel,
  });
});

// POST /api/shop/buy-limited - 购买商品
router.post('/buy-limited', (req, res) => {
  const playerId = getPlayerId(req);
  const { itemId, quantity = 1 } = req.body;
  const database = getDb();
  if (!database) return res.status(500).json({ error: '数据库连接失败' });

  if (itemId === undefined || itemId === null) {
    return res.status(400).json({ error: '缺少itemId参数' });
  }

  const itemIndex = parseInt(itemId);
  const qty = Math.max(1, parseInt(quantity) || 1);
  const today = getTodayKey();
  const vipLevel = getPlayerVipLevel(playerId);
  const discount = VIP_DISCOUNT[vipLevel] || 1.0;

  // 查找商品
  const item = database.prepare(
    'SELECT * FROM limited_shop_items WHERE player_id = ? AND item_index = ? AND refresh_date = ?'
  ).get(playerId, itemIndex, today);

  if (!item) {
    return res.status(404).json({ error: '商品不存在或已下架' });
  }
  if (item.stock < qty) {
    return res.status(400).json({ error: '库存不足' });
  }

  const totalCost = Math.floor(item.item_price * discount * qty);

  // 检查玩家灵石
  try {
    const player = database.prepare('SELECT lingshi FROM Users WHERE id = ?').get(playerId);
    if (!player) return res.status(404).json({ error: '玩家不存在' });
    if ((player.lingshi || 0) < totalCost) {
      return res.status(400).json({ error: '灵石不足', required: totalCost, has: player.lingshi });
    }
  } catch (e) {
    return res.status(500).json({ error: '查询玩家灵石失败' });
  }

  // 扣除灵石
  try {
    database.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(totalCost, playerId);
  } catch (e) {
    return res.status(500).json({ error: '扣除灵石失败' });
  }

  // 减少库存
  database.prepare('UPDATE limited_shop_items SET stock = stock - ? WHERE id = ?').run(qty, item.id);

  // 记录购买历史
  database.prepare(
    'INSERT INTO limited_shop_purchases (player_id, item_name, item_icon, price_paid, quantity) VALUES (?,?,?,?,?)'
  ).run(playerId, item.item_name, item.item_icon, totalCost, qty);

  // 给玩家物品（加入背包或直接给道具）
  try {
    database.prepare(`
      INSERT INTO player_items (user_id, item_name, item_type, item_icon, count, source)
      VALUES (?, ?, ?, ?, ?, 'limited_shop')
    `).run(playerId, item.item_name, item.item_category, item.item_icon, qty);
  } catch (e) {
    // 如果player_items表不存在，跳过
  }

  res.json({
    success: true,
    item: item.item_name,
    quantity: qty,
    cost: totalCost,
    remaining: Math.max(0, item.stock - qty),
  });
});

// POST /api/shop/refresh - 刷新神秘商人
router.post('/refresh', (req, res) => {
  const playerId = getPlayerId(req);
  const database = getDb();
  if (!database) return res.status(500).json({ error: '数据库连接失败' });

  // 检查灵石
  try {
    const player = database.prepare('SELECT lingshi FROM Users WHERE id = ?').get(playerId);
    if (!player) return res.status(404).json({ error: '玩家不存在' });
    if ((player.lingshi || 0) < REFRESH_COST) {
      return res.status(400).json({ error: '灵石不足', required: REFRESH_COST, has: player.lingshi });
    }
    database.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(REFRESH_COST, playerId);
  } catch (e) {
    return res.status(500).json({ error: '灵石操作失败' });
  }

  // 生成新商品
  const newItems = generateRandomItems();
  const today = getTodayKey();

  // 删除旧商品
  database.prepare('DELETE FROM limited_shop_items WHERE player_id = ? AND refresh_date = ?').run(playerId, today);

  // 插入新商品
  const insert = database.prepare(`
    INSERT INTO limited_shop_items (player_id, item_index, item_name, item_icon, item_price, item_category, item_description, stock, refresh_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMany = database.transaction((list) => {
    for (const item of list) {
      insert.run(playerId, item.index, item.name, item.icon, item.price, item.category, item.description, item.stock, today);
    }
  });
  insertMany(newItems);

  const vipLevel = getPlayerVipLevel(playerId);
  const discount = VIP_DISCOUNT[vipLevel] || 1.0;

  res.json({
    cost: REFRESH_COST,
    newItems: newItems.map(item => ({
      itemId: item.index,
      name: item.name,
      icon: item.icon,
      originalPrice: item.price,
      price: Math.floor(item.price * discount),
      category: item.category,
      description: item.description,
      stock: item.stock,
    })),
  });
});

// GET /api/shop/history - 购买记录
router.get('/history', (req, res) => {
  const playerId = getPlayerId(req);
  const database = getDb();
  if (!database) return res.status(500).json({ error: '数据库连接失败' });

  const limit = parseInt(req.query.limit) || 20;
  const records = database.prepare(
    'SELECT * FROM limited_shop_purchases WHERE player_id = ? ORDER BY purchased_at DESC LIMIT ?'
  ).all(playerId, limit);

  res.json({
    records: records.map(r => ({
      name: r.item_name,
      icon: r.item_icon,
      pricePaid: r.price_paid,
      quantity: r.quantity,
      purchasedAt: r.purchased_at,
    })),
  });
});

module.exports = router;
