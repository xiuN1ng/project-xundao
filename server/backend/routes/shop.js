const express = require('express');
const router = express.Router();
const path = require('path');

// 数据库路径
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  // 初始化 shop_items 表（如果不存在）
  db.exec(`
    CREATE TABLE IF NOT EXISTS shop_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '📦',
      price INTEGER NOT NULL DEFAULT 100,
      category TEXT NOT NULL DEFAULT 'misc',
      item_type TEXT NOT NULL DEFAULT 'misc',
      description TEXT DEFAULT '',
      stock INTEGER DEFAULT -1,
      vip_level_required INTEGER DEFAULT 0,
      level_required INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0
    )
  `);
  // 种子数据：15件商品
  const count = db.prepare('SELECT COUNT(*) as c FROM shop_items').get().c || 0;
  if (count === 0) {
    const seedItems = [
      { name: '铁剑', icon: '⚔️', price: 100, category: 'weapon', type: 'weapon', sort: 1 },
      { name: '精钢甲', icon: '🛡️', price: 150, category: 'armor', type: 'armor', sort: 2 },
      { name: '灵气丹', icon: '🧪', price: 50, category: 'potion', type: 'potion', sort: 3 },
      { name: '灵石袋(小)', icon: '💎', price: 500, category: 'currency', type: 'currency', sort: 4 },
      { name: '护身符', icon: '📿', price: 200, category: 'accessory', type: 'accessory', sort: 5 },
      { name: '破境丹', icon: '💊', price: 1000, category: 'potion', type: 'potion', sort: 6 },
      { name: '灵石袋(大)', icon: '💎', price: 2000, category: 'currency', type: 'currency', sort: 7 },
      { name: '玄冰剑', icon: '❄️', price: 800, category: 'weapon', type: 'weapon', sort: 8 },
      { name: '烈焰甲', icon: '🔥', price: 800, category: 'armor', type: 'armor', sort: 9 },
      { name: '疾风靴', icon: '👢', price: 300, category: 'accessory', type: 'accessory', sort: 10 },
      { name: '经验丹', icon: '⭐', price: 100, category: 'potion', type: 'potion', sort: 11 },
      { name: '召唤令', icon: '📜', price: 5000, category: 'special', type: 'special', sort: 12 },
      { name: '强化石', icon: '🔨', price: 200, category: 'material', type: 'material', sort: 13 },
      { name: '洗练石', icon: '💧', price: 300, category: 'material', type: 'material', sort: 14 },
      { name: '天元丹', icon: '🌟', price: 5000, category: 'potion', type: 'potion', sort: 15 }
    ];
    const insert = db.prepare('INSERT INTO shop_items (name, icon, price, category, type, sort_order) VALUES (?,?,?,?,?,?)');
    for (const item of seedItems) {
      insert.run(item.name, item.icon, item.price, item.category, item.type, item.sort);
    }
    console.log('[shop] 15件商品初始化完成');
  }
} catch (err) {
  console.log('[shop] 数据库连接失败:', err.message);
  db = null;
}

// 内存商品缓存（用于无数据库时）
const fallbackGoods = [
  { id: 1, icon: '⚔️', name: '铁剑', price: 100, category: 'weapon', type: 'weapon' },
  { id: 2, icon: '🛡️', name: '精钢甲', price: 150, category: 'armor', type: 'armor' },
  { id: 3, icon: '🧪', name: '灵气丹', price: 50, category: 'potion', type: 'potion' }
];

// 商品列表
let goods = [
  { id: 1, icon: '⚔️', name: '铁剑', price: 100, category: 'weapon', type: 'weapon' },
  { id: 2, icon: '🛡️', name: '木盾', price: 80, category: 'armor', type: 'armor' },
  { id: 3, icon: '🧪', name: '灵气丹', price: 50, category: 'potion', type: 'potion' },
  { id: 4, icon: '💎', name: '灵石袋', price: 500, category: 'currency', type: 'currency' },
  { id: 5, icon: '📿', name: '护身符', price: 200, category: 'accessory', type: 'accessory' }
];

// 获取商品列表（从DB读取）
function getShopItems() {
  if (!db) return fallbackGoods;
  try {
    return db.prepare('SELECT id, name, icon, price, category, item_type as type, description, stock, vip_level_required, level_required FROM shop_items ORDER BY sort_order').all();
  } catch (e) {
    console.error('[shop] getShopItems错误:', e.message);
    return fallbackGoods;
  }
}

router.get('/', (req, res) => {
  const items = getShopItems();
  res.json({ success: true, items });
});
router.get('/list', (req, res) => {
  const items = getShopItems();
  res.json({ success: true, items });
});

router.post('/buy', (req, res) => {
  const { userId, itemId, count = 1 } = req.body;
  
  const items = getShopItems();
  const good = items.find(g => g.id === itemId);
  if (!good) {
    return res.status(404).json({ success: false, error: '商品不存在' });
  }
  
  const totalCost = good.price * count;
  
  // 扣除灵石
  if (db) {
    try {
      // 先查询当前灵石
      const player = db.prepare('SELECT * FROM player WHERE id = ?').get(userId);
      if (!player) {
        return res.status(404).json({ success: false, error: '玩家不存在' });
      }
      
      const currentStones = player.spirit_stones || player.lingshi || 0;
      if (currentStones < totalCost) {
        return res.status(400).json({ success: false, error: '灵石不足' });
      }
      
      // 扣除灵石
      db.prepare('UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?').run(totalCost, userId);
      
      // 写入背包
      const itemName = good.name + (count > 1 ? ` x${count}` : '');
      db.prepare(`
        INSERT INTO player_items (user_id, item_id, item_name, item_type, count, icon, source, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'shop', CURRENT_TIMESTAMP)
      `).run(userId, good.id, itemName, good.type || good.category, count, good.icon);
      
      res.json({ success: true, item: good, count, cost: totalCost });
    } catch (e) {
      console.error('[shop] buy错误:', e.message);
      res.status(500).json({ success: false, error: e.message });
    }
  } else {
    res.json({ success: true, item: good, count, cost: totalCost });
  }
});

module.exports = router;
