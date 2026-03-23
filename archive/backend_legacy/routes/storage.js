// 存储系统 API - stub 实现
const express = require('express');
const router = express.Router();

router.get('/list', (req, res) => res.json({ items: [] }));
router.post('/deposit', (req, res) => res.json({ success: true }));
router.post('/withdraw', (req, res) => res.json({ success: true }));

module.exports = router;
