// 共享boss系统 API - stub 实现
const express = require('express');
const router = express.Router();

router.get('/list', (req, res) => res.json({ bosses: [] }));
router.get('/info', (req, res) => res.json({}));
router.post('/attack', (req, res) => res.json({ success: true }));

module.exports = router;
