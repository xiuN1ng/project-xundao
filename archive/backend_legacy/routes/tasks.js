// 悬赏系统 API - stub 实现
const express = require('express');
const router = express.Router();

let tasks = [];

router.get('/list', (req, res) => res.json({ tasks }));
router.get('/daily', (req, res) => res.json({ tasks: [] }));
router.post('/accept', (req, res) => res.json({ success: true }));
router.post('/complete', (req, res) => res.json({ success: true }));
router.post('/refresh', (req, res) => res.json({ success: true }));

module.exports = router;
