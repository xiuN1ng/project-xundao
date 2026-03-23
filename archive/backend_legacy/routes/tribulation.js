// 渡劫系统 API - stub 实现
const express = require('express');
const router = express.Router();

router.get('/status', (req, res) => res.json({ canTribulate: false, successRate: 0 }));
router.post('/start', (req, res) => res.json({ success: true, message: '渡劫开始' }));
router.post('/complete', (req, res) => res.json({ success: true, message: '渡劫成功' }));

module.exports = router;
