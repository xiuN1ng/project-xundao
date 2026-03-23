// 新手引导系统 API - stub 实现
const express = require('express');
const router = express.Router();

router.get('/progress', (req, res) => res.json({ step: 1 }));
router.post('/complete-step', (req, res) => res.json({ success: true }));
router.post('/skip', (req, res) => res.json({ success: true }));

module.exports = router;
