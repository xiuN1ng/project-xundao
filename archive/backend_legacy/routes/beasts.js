// 灵兽系统 API - stub 实现
const express = require('express');
const router = express.Router();

let beasts = [];
let beastTemplates = [
  { id: 1, icon: '🦊', name: '灵狐', quality: 'common', baseAttack: 50, baseHp: 200 }
];

router.get('/list', (req, res) => res.json(beastTemplates));
router.get('/my', (req, res) => res.json({ beasts }));
router.get('/stats', (req, res) => res.json({}));
router.post('/capture', (req, res) => res.json({ success: true }));
router.post('/feed', (req, res) => res.json({ success: true }));
router.post('/levelup', (req, res) => res.json({ success: true }));
router.post('/release', (req, res) => res.json({ success: true }));
router.post('/attack', (req, res) => res.json({ success: true }));

module.exports = router;
