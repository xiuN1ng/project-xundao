const express = require('express');
const router = express.Router();

// 商品数据
let goods = [
  { id: 1, icon: '⚔️', name: '铁剑', price: 100, category: 'weapon' },
  { id: 2, icon: '🛡️', name: '木盾', price: 80, category: 'armor' },
  { id: 3, icon: '🧪', name: '灵气丹', price: 50, category: 'potion' }
];

let purchaseHistory = [];

// 获取商品列表
router.get('/', (req, res) => res.json(goods));
router.get('/items', (req, res) => res.json(goods));
router.get('/list', (req, res) => res.json(goods));

// 购买商品
router.post('/buy', (req, res) => {
  const { itemId, quantity = 1 } = req.body;
  const item = goods.find(g => g.id === itemId);
  if (item) {
    purchaseHistory.push({ itemId, quantity, time: Date.now() });
    res.json({ success: true, item, quantity });
  } else {
    res.json({ success: false, message: '商品不存在' });
  }
});

// 购买丹药
router.post('/buy-pill', (req, res) => {
  const { pillId, quantity = 1 } = req.body;
  res.json({ success: true, pillId, quantity });
});

// 购买历史
router.get('/history', (req, res) => res.json(purchaseHistory));

module.exports = router;
