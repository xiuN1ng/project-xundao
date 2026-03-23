const express = require('express');
const router = express.Router();

let broadcasts = [];

// 发送系统邮件
router.post('/mail', (req, res) => {
  const { title, content, attachments, targetUsers, targetType } = req.body;
  
  const mail = {
    id: Date.now(),
    title,
    content,
    attachments: attachments || [],
    targetType, // 'all', 'vip', 'level', 'users'
    targetUsers: targetUsers || [],
    sender: '系统',
    createTime: Date.now()
  };
  
  broadcasts.push(mail);
  
  res.json({ success: true, mail, estimatedRecipients: 1 });
});

// 获取广播列表
router.get('/list', (req, res) => {
  const { page, limit } = req.query;
  const pageNum = parseInt(page) || 1;
  const pageSize = parseInt(limit) || 20;
  
  const total = broadcasts.length;
  const list = broadcasts.slice(0, pageNum * pageSize).slice(-pageSize);
  
  res.json({ list, total, page: pageNum, pageSize });
});

// 发送公告
router.post('/announcement', (req, res) => {
  const { title, content, duration, type } = req.body;
  
  const announcement = {
    id: Date.now(),
    title,
    content,
    type: type || 'normal',
    duration: duration || 3600, // 秒
    createTime: Date.now(),
    showCount: 0
  };
  
  res.json({ success: true, announcement });
});

module.exports = router;
