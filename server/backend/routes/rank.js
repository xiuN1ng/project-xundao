const express = require('express');
const router = express.Router();

// 排行榜数据
let rankData = {
  combat: [
    { rank: 1, userId: 1, name: 'test', value: 5000 },
    { rank: 2, userId: 2, name: '玩家2', value: 4500 },
    { rank: 3, userId: 3, name: '玩家3', value: 4000 },
    { rank: 4, userId: 4, name: '玩家4', value: 3500 },
    { rank: 5, userId: 5, name: '玩家5', value: 3000 }
  ],
  level: [
    { rank: 1, userId: 1, name: 'test', value: 50 },
    { rank: 2, userId: 2, name: '玩家2', value: 45 },
    { rank: 3, userId: 3, name: '玩家3', value: 40 }
  ],
  wealth: [
    { rank: 1, userId: 1, name: 'test', value: 1000000 },
    { rank: 2, userId: 2, name: '玩家2', value: 500000 },
    { rank: 3, userId: 3, name: '玩家3', value: 300000 }
  ],
  chapter: [
    { rank: 1, userId: 1, name: 'test', value: 50 },
    { rank: 2, userId: 2, name: '玩家2', value: 30 },
    { rank: 3, userId: 3, name: '玩家3', value: 20 }
  ]
};

// 获取所有排行榜概览（根路径）
router.get('/', (req, res) => {
  res.json({
    combat: { type: 'combat', label: '战力榜', count: rankData.combat.length },
    level: { type: 'level', label: '等级榜', count: rankData.level.length },
    wealth: { type: 'wealth', label: '财富榜', count: rankData.wealth.length },
    chapter: { type: 'chapter', label: '章节榜', count: rankData.chapter.length }
  });
});

// 获取各类排行榜
router.get('/:type', (req, res) => {
  const { type } = req.params;
  const { limit } = req.query;
  
  const list = rankData[type] || [];
  const result = list.slice(0, parseInt(limit) || 50);
  
  res.json(result);
});

// 获取玩家排名
router.get('/:type/:userId', (req, res) => {
  const { type, userId } = req.params;
  const list = rankData[type] || [];
  
  const player = list.find(r => r.userId === parseInt(userId));
  
  if (!player) {
    return res.json({ rank: list.length + 1 });
  }
  
  res.json(player);
});

// 更新排行榜
router.post('/update', (req, res) => {
  const { type, userId, name, value } = req.body;
  
  if (!rankData[type]) {
    rankData[type] = [];
  }
  
  const existing = rankData[type].find(r => r.userId === userId);
  
  if (existing) {
    existing.value = value;
    existing.name = name;
  } else {
    rankData[type].push({
      rank: rankData[type].length + 1,
      userId,
      name,
      value
    });
  }
  
  // 排序
  rankData[type].sort((a, b) => b.value - a.value);
  
  // 更新排名
  rankData[type].forEach((r, i) => r.rank = i + 1);
  
  res.json({ success: true });
});

module.exports = router;
