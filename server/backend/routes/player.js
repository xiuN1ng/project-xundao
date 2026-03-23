const express = require('express');
const router = express.Router();

// 模拟数据库
let player = {
  id: 1,
  name: '修仙者',
  level: 5,
  realm: 1,
  lingshi: 125680,
  diamonds: 520,
  hp: 1000,
  attack: 100,
  defense: 50,
  speed: 10,
  sectId: 1,
  createdAt: Date.now()
};

// 获取玩家信息
router.get('/', (req, res) => {
  res.json(player);
});

// 更新玩家信息
router.put('/', (req, res) => {
  player = { ...player, ...req.body };
  res.json(player);
});

// 获取玩家资源
router.get('/resources', (req, res) => {
  res.json({
    lingshi: player.lingshi,
    diamonds: player.diamonds
  });
});

// 增加资源
router.post('/resources', (req, res) => {
  const { lingshi, diamonds } = req.body;
  if (lingshi) player.lingshi += lingshi;
  if (diamonds) player.diamonds += diamonds;
  res.json({ lingshi: player.lingshi, diamonds: player.diamonds });
});

module.exports = router;
module.exports._player = player;
