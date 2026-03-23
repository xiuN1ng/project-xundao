const express = require('express');
const router = express.Router();

const ticketStatuses = ['open', 'pending', 'resolved', 'closed'];
const ticketTypes = ['bug', 'complaint', 'refund', 'suggestion', 'other'];

let tickets = [
  { id: 1, userId: 1, type: 'bug', title: '无法登录', content: '登录无反应', status: 'resolved', createTime: Date.now() - 86400000, resolveTime: Date.now() }
];

// 创建工单
router.post('/', (req, res) => {
  const { userId, type, title, content } = req.body;
  
  if (!ticketTypes.includes(type)) {
    return res.json({ success: false, message: '无效的工单类型' });
  }
  
  const ticket = {
    id: Date.now(),
    userId,
    type,
    title,
    content,
    status: 'open',
    createTime: Date.now(),
    messages: []
  };
  
  tickets.push(ticket);
  res.json({ success: true, ticket });
});

// 用户工单列表
router.get('/my/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  const userTickets = tickets.filter(t => t.userId === userId);
  res.json(userTickets);
});

// 工单详情
router.get('/:id', (req, res) => {
  const ticket = tickets.find(t => t.id === parseInt(req.params.id));
  if (!ticket) {
    return res.json({ success: false, message: '工单不存在' });
  }
  res.json(ticket);
});

// 客服回复
router.post('/:id/reply', (req, res) => {
  const ticket = tickets.find(t => t.id === parseInt(req.params.id));
  if (!ticket) {
    return res.json({ success: false, message: '工单不存在' });
  }
  
  const { from, message } = req.body;
  ticket.messages.push({
    from, // 'user' or 'admin'
    message,
    time: Date.now()
  });
  
  res.json({ success: true, messages: ticket.messages });
});

// 关闭工单
router.post('/:id/close', (req, res) => {
  const ticket = tickets.find(t => t.id === parseInt(req.params.id));
  if (!ticket) {
    return res.json({ success: false, message: '工单不存在' });
  }
  
  ticket.status = ticket.status === 'resolved' ? 'closed' : 'resolved';
  res.json({ success: true, ticket });
});

// 客服列表 (管理员)
router.get('/admin/list', (req, res) => {
  const { status, page, limit } = req.query;
  let list = tickets;
  
  if (status) {
    list = list.filter(t => t.status === status);
  }
  
  const pageNum = parseInt(page) || 1;
  const pageSize = parseInt(limit) || 20;
  const total = list.length;
  
  list = list.slice((pageNum - 1) * pageSize, pageNum * pageSize);
  
  res.json({ list, total, page: pageNum, pageSize });
});

// 客服回复 (管理员)
router.post('/admin/reply', (req, res) => {
  const { ticketId, message } = req.body;
  const ticket = tickets.find(t => t.id === ticketId);
  
  if (!ticket) {
    return res.json({ success: false, message: '工单不存在' });
  }
  
  ticket.messages.push({
    from: 'admin',
    message,
    time: Date.now()
  });
  
  ticket.status = 'pending';
  
  res.json({ success: true, ticket });
});

module.exports = router;
