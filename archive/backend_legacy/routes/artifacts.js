// 法宝系统 API - stub 实现
const express = require('express');
const router = express.Router();

let artifacts = [];

router.get('/list', (req, res) => res.json({ artifacts }));
router.get('/materials', (req, res) => res.json([]));
router.post('/forge', (req, res) => res.json({ success: true }));
router.post('/upgrade', (req, res) => res.json({ success: true }));
router.post('/equip', (req, res) => res.json({ success: true }));
router.post('/unequip', (req, res) => res.json({ success: true }));
router.post('/refine', (req, res) => res.json({ success: true }));
router.post('/recycle', (req, res) => res.json({ success: true }));
router.post('/use-treasure', (req, res) => res.json({ success: true }));

module.exports = router;
