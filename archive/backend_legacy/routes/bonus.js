// 红包/福利系统 API - stub 实现
const express = require('express');
const router = express.Router();

router.get('/daily', (req, res) => res.json({ claimed: false, reward: 100 }));
router.post('/claim', (req, res) => res.json({ success: true }));

module.exports = router;
