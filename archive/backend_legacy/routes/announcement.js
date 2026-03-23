const express = require('express');
const router = express.Router();

let announcements = [
  { id: 1, title: '开服公告', content: '欢迎来到挂机修仙世界！', type: 'system', startTime: Date.now(), endTime: Date.now() + 86400000*7 },
  { id: 2, title: '首充活动', content: '首充双倍钻石！', type: 'event', startTime: Date.now(), startTime: Date.now() + 86400000*3 },
  { id: 3, title: '更新公告', content: '新增经脉系统', type: 'update', startTime: Date.now(), startTime: Date.now() + 86400000*30 }
];

router.get('/', (req, res) => {
  const now = Date.now();
  const active = announcements.filter(a => now >= a.startTime && now <= a.endTime);
  res.json(active);
});

router.post('/', (req, res) => {
  const { title, content, type, days } = req.body;
  const ann = {
    id: Date.now(),
    title, content, type,
    startTime: Date.now(),
    endTime: Date.now() + 86400000 * (days || 7)
  };
  announcements.push(ann);
  res.json({ success: true, announcement: ann });
});

module.exports = router;
