// 成就系统 API - stub 实现
const express = require('express');
const router = express.Router();

let achievements = [
  { id: 1, name: '初次登录', description: '首次登录游戏', reward: 100 },
  { id: 2, name: '境界突破', description: '突破一次境界', reward: 200 }
];

router.get('/list', (req, res) => res.json({ achievements }));
router.get('/stats', (req, res) => res.json({ total: 0, completed: 0 }));
router.get('/progress', (req, res) => res.json([]));
router.post('/claim', (req, res) => res.json({ success: true }));

module.exports = router;
