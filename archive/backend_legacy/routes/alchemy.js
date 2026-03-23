// 炼丹系统 API - stub 实现
const express = require('express');
const router = express.Router();

let recipes = [
  { id: 1, name: '灵气丹', materials: ['草药x3'], effect: '+100灵气' },
  { id: 2, name: '突破丹', materials: ['灵草x5'], effect: '+境界经验' }
];

router.get('/recipes', (req, res) => res.json({ recipes }));
router.get('/info', (req, res) => res.json({ level: 1, exp: 0 }));
router.post('/learn', (req, res) => res.json({ success: true }));
router.post('/refine', (req, res) => res.json({ success: true, item: recipes[0] }));
router.post('/upgrade', (req, res) => res.json({ success: true }));

module.exports = router;
