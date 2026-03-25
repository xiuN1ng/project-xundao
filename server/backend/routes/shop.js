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
} catch (err) {
  console.log('[shop] 数据库连接失败:', err.message);
  db = null;
}

// 商品列表
let goods = [
  { id: 1, icon: '⚔️', name: '铁剑', price: 100, category: 'weapon', type: 'weapon' },
  { id: 2, icon: '🛡️', name: '木盾', price: 80, category: 'armor', type: 'armor' },
  { id: 3, icon: '🧪', name: '灵气丹', price: 50, category: 'potion', type: 'potion' },
  { id: 4, icon: '💎', name: '灵石袋', price: 500, category: 'currency', type: 'currency' },
  { id: 5, icon: '📿', name: '护身符', price: 200, category: 'accessory', type: 'accessory' }
];

router.get('/', (req, res) => res.json(goods));
router.get('/list', (req, res) => res.json(goods));

router.post('/buy', (req, res) => {
  const { userId, itemId, count = 1 } = req.body;
  
  const good = goods.find(g => g.id === itemId);
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
