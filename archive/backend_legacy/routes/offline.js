// 离线收益系统 API - stub 实现
const express = require('express');
const router = express.Router();

router.get('/calculate', (req, res) => res.json({ offlineTime: 0, rewards: {} }));
router.post('/claim', (req, res) => res.json({ success: true }));

module.exports = router;
