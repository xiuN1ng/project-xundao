// 市场系统 API - stub 实现
const express = require('express');
const router = express.Router();

let listings = [];

router.get('/list', (req, res) => res.json({ listings }));
router.get('/listings', (req, res) => res.json({ listings }));
router.post('/list', (req, res) => res.json({ success: true, listingId: Date.now() }));
router.post('/buy', (req, res) => res.json({ success: true }));
router.post('/del', (req, res) => res.json({ success: true }));
router.get('/my-listings', (req, res) => res.json({ listings: [] }));
router.post('/search', (req, res) => res.json({ listings: [] }));

module.exports = router;
