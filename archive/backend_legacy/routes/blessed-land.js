// 洞府系统 API - stub 实现
const express = require('express');
const router = express.Router();

router.get('/status', (req, res) => res.json({ level: 1, resources: {} }));
router.post('/start', (req, res) => res.json({ success: true }));
router.post('/complete', (req, res) => res.json({ success: true }));
router.post('/trigger-event', (req, res) => res.json({ success: true }));
router.post('/abandon', (req, res) => res.json({ success: true }));
router.get('/history', (req, res) => res.json([]));
router.get('/types', (req, res) => res.json([]));

module.exports = router;
