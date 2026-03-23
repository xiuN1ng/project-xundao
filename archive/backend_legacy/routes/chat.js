// 聊天系统 API - stub 实现
const express = require('express');
const router = express.Router();

let messages = [];
let onlineUsers = [];

router.get('/messages', (req, res) => res.json({ messages }));
router.get('/online', (req, res) => res.json({ online: onlineUsers }));
router.post('/send', (req, res) => {
  const { content } = req.body;
  messages.push({ content, time: Date.now() });
  res.json({ success: true });
});

module.exports = router;
