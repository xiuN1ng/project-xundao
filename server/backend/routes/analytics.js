const express = require('express');
const router = express.Router();

let stats = {
  totalUsers: 1,
  activeUsers: 1,
  totalRevenue: 0,
  totalRecharge: 0
};

let userActions = [];

router.get('/stats', (req, res) => res.json(stats));

router.post('/action', (req, res) => {
  const { userId, action, detail } = req.body;
  userActions.push({ userId, action, detail, time: Date.now() });
  res.json({ success: true });
});

router.get('/actions', (req, res) => {
  const { userId, limit } = req.query;
  let actions = userActions;
  if (userId) actions = actions.filter(a => a.userId == userId);
  if (limit) actions = actions.slice(-parseInt(limit));
  res.json(actions);
});

module.exports = router;
