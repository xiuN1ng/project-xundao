const express = require('express');
const router = express.Router();
const gameConfig = require('../config/gameConfig');

// 数据概览
router.get('/overview', (req, res) => {
  res.json({
    users: { total: 1, active: 1, newToday: 0 },
    revenue: { today: 0, week: 0, month: 0 },
    retention: { day1: 0, day7: 0, day30: 0 },
    online: { current: 1, peak: 1 }
  });
});

// 玩家管理
router.get('/users', (req, res) => {
  const { page, limit, search } = req.query;
  res.json({
    list: [
      { id: 1, username: 'test', level: 5, lingshi: 125680, diamonds: 520, vip: 0, lastLogin: Date.now() }
    ],
    total: 1,
    page: 1
  });
});

// 运营活动配置
let events = [
  { id: 1, name: '首充双倍', type: 'recharge', status: 'active', startTime: Date.now(), endTime: Date.now() + 86400000 * 7 },
  { id: 2, name: '掉落加成', type: 'drop', status: 'active', startTime: Date.now(), endTime: Date.now() + 86400000 * 3 }
];

router.get('/events', (req, res) => res.json(events));

router.post('/events', (req, res) => {
  const { name, type, days } = req.body;
  const event = { id: Date.now(), name, type, status: 'active', startTime: Date.now(), endTime: Date.now() + 86400000 * days };
  events.push(event);
  res.json({ success: true, event });
});

// 系统配置
router.get('/config', (req, res) => res.json(gameConfig));

router.put('/config', (req, res) => {
  Object.assign(gameConfig, req.body);
  res.json({ success: true });
});

// 礼包码管理
router.get('/giftcodes', (req, res) => {
  res.json([
    { code: 'NEWBIE100', rewards: '灵石1000+钻石10', used: 0, createdAt: Date.now() },
    { code: 'VIP888', rewards: '钻石888', used: 5, createdAt: Date.now() }
  ]);
});

router.post('/giftcodes', (req, res) => {
  const { code, rewards } = req.body;
  res.json({ success: true, message: '礼包码已创建' });
});

module.exports = router;
