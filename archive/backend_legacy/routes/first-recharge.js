// 首充系统 API - stub 实现
const express = require('express');
const router = express.Router();

router.get('/config', (req, res) => res.json({ claimed: false }));
router.post('/claim', (req, res) => res.json({ success: true }));
router.post('/claim-v2', (req, res) => res.json({ success: true }));

module.exports = router;
