// 排行榜系统 API - stub 实现
const express = require('express');
const router = express.Router();

let rankings = [];

router.get('/list', (req, res) => res.json({ rankings }));
router.get('/realm', (req, res) => res.json({ rankings: [] }));
router.get('/combat', (req, res) => res.json({ rankings: [] }));
router.get('/wealth', (req, res) => res.json({ rankings: [] }));

module.exports = router;
