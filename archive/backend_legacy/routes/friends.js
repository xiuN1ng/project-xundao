// 好友系统 API - stub 实现
const express = require('express');
const router = express.Router();

let friends = [];
let requests = [];

router.get('/list', (req, res) => res.json({ friends }));
router.get('/requests', (req, res) => res.json({ requests }));
router.get('/recommend', (req, res) => res.json([]));
router.post('/add', (req, res) => res.json({ success: true }));
router.post('/accept', (req, res) => res.json({ success: true }));
router.post('/reject', (req, res) => res.json({ success: true }));
router.post('/remove', (req, res) => res.json({ success: true }));
router.post('/block', (req, res) => res.json({ success: true }));

module.exports = router;
