// 师徒系统 API - stub 实现
const express = require('express');
const router = express.Router();

router.get('/info', (req, res) => res.json({}));
router.post('/create', (req, res) => res.json({ success: true }));
router.post('/accept', (req, res) => res.json({ success: true }));
router.post('/reject', (req, res) => res.json({ success: true }));

module.exports = router;
