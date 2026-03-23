const express = require('express');
const router = express.Router();

// 模拟数据
let sect = {
  id: 1,
  name: '青云宗',
  level: 5,
  icon: '🏯',
  members: 28,
  rank: 15,
  contribution: 12500,
  buildings: [
    { id: 1, icon: '🏠', name: '主殿', level: 5 },
    { id: 2, icon: '⛩️', name: '修炼室', level: 3 },
    { id: 3, icon: '💰', name: '仓库', level: 4 },
    { id: 4, icon: '⚔️', name: '传功堂', level: 2 }
  ]
};

let members = [
  { id: 1, name: '掌门真人', role: '掌门', contribution: 5000 },
  { id: 2, name: '大长老', role: '长老', contribution: 3000 },
  { id: 3, name: '内门弟子', role: '成员', contribution: 1500 }
];

// 获取宗门信息
router.get('/', (req, res) => {
  res.json({ sect, members });
});

// 创建宗门
router.post('/create', (req, res) => {
  const { name } = req.body;
  sect = {
    id: Date.now(),
    name: name || '新宗门',
    level: 1,
    icon: '🏯',
    members: 1,
    rank: 999,
    contribution: 0
  };
  res.json(sect);
});

// 升级建筑
router.post('/building/upgrade', (req, res) => {
  const { buildingId } = req.body;
  const building = sect.buildings.find(b => b.id === buildingId);
  if (building) {
    building.level += 1;
    res.json({ success: true, building });
  } else {
    res.json({ success: false, message: '建筑不存在' });
  }
});

module.exports = router;
