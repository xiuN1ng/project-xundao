// 飞升位面系统 API - stub 实现
const express = require('express');
const router = express.Router();

router.get('/info', (req, res) => res.json({ realm: 1, floor: 0 }));
router.post('/challenge', (req, res) => res.json({ success: true }));

module.exports = router;
