// 飞升任务系统 API - stub 实现
const express = require('express');
const router = express.Router();

router.get('/list', (req, res) => res.json({ quests: [] }));
router.get('/info', (req, res) => res.json({}));
router.post('/accept', (req, res) => res.json({ success: true }));
router.post('/complete', (req, res) => res.json({ success: true }));

module.exports = router;
