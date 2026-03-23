const express = require('express');
const router = express.Router();

// 模拟数据
let cultivation = {
  playerId: 1,
  value: 0,
  realm: 1,
  progress: 0
};

const realmConfig = {
  1: { name: '练气', cost: 1000, icon: '🧘' },
  2: { name: '筑基', cost: 10000, icon: '🔮' },
  3: { name: '金丹', cost: 100000, icon: '🌟' },
  4: { name: '元婴', cost: 1000000, icon: '👼' },
  5: { name: '化神', cost: 10000000, icon: '✨' }
};

// 获取修炼状态
router.get('/', (req, res) => {
  const config = realmConfig[cultivation.realm] || realmConfig[1];
  res.json({
    ...cultivation,
    realmName: config.name,
    realmIcon: config.icon,
    cost: config.cost
  });
});

// 开始修炼
router.post('/start', (req, res) => {
  // 模拟修炼获得灵气
  cultivation.value += Math.floor(Math.random() * 100) + 50;
  
  const config = realmConfig[cultivation.realm];
  if (cultivation.value >= config.cost) {
    cultivation.value = config.cost;
  }
  
  res.json({ 
    cultivation: cultivation.value,
    progress: Math.floor((cultivation.value / config.cost) * 100)
  });
});

// 突破境界
router.post('/breakthrough', (req, res) => {
  const config = realmConfig[cultivation.realm];
  
  if (cultivation.value >= config.cost) {
    cultivation.realm += 1;
    cultivation.value = 0;
    res.json({ 
      success: true, 
      newRealm: cultivation.realm,
      realmName: realmConfig[cultivation.realm]?.name || '仙人'
    });
  } else {
    res.json({ success: false, message: '灵气不足' });
  }
});

module.exports = router;
