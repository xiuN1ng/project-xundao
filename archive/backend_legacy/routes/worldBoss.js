const express = require('express');
const router = express.Router();

// 世界BOSS配置
const bossConfig = {
  bosses: [
    { id: 1, name: '上古蛟龙', level: 10, hp: 1000000, attack: 5000, reward: { diamonds: 100, lingshi: 10000 } },
    { id: 2, name: '远古巨龟', level: 20, hp: 5000000, attack: 15000, reward: { diamonds: 300, lingshi: 30000 } },
    { id: 3, name: '暗黑魔龙', level: 30, hp: 20000000, attack: 50000, reward: { diamonds: 500, lingshi: 50000 } },
    { id: 4, name: '九尾妖狐', level: 40, hp: 100000000, attack: 200000, reward: { diamonds: 1000, lingshi: 100000 } },
    { id: 5, name: '仙帝残魂', level: 50, hp: 500000000, attack: 1000000, reward: { diamonds: 5000, lingshi: 500000 } }
  ],
  refreshInterval: 3600000, // 1小时刷新
  maxDamageRecords: 100
};

// 世界BOSS数据
let worldBoss = {
  currentBoss: null,
  hp: 0,
  maxHp: 0,
  damageRecords: [], // { userId, name, damage, time }
  lastRefresh: 0,
  status: 'dead' // alive, dead, countdown
};

// 获取当前BOSS状态
router.get('/status', (req, res) => {
  const now = Date.now();
  
  // 检查是否需要刷新BOSS
  if (worldBoss.status === 'dead' && now - worldBoss.lastRefresh > bossConfig.refreshInterval) {
    // 随机选一个BOSS
    const boss = bossConfig.bosses[Math.floor(Math.random() * bossConfig.bosses.length)];
    worldBoss = {
      currentBoss: boss,
      hp: boss.hp,
      maxHp: boss.hp,
      damageRecords: [],
      lastRefresh: now,
      status: 'alive'
    };
  }
  
  res.json({
    boss: worldBoss.currentBoss,
    hp: worldBoss.hp,
    maxHp: worldBoss.maxHp,
    status: worldBoss.status,
    myDamage: 0 // 需传入userId计算
  });
});

// 攻击BOSS
router.post('/attack', (req, res) => {
  const { userId, userName, damage } = req.body;
  
  if (worldBoss.status !== 'alive' || !worldBoss.currentBoss) {
    return res.json({ success: false, message: 'BOSS未刷新' });
  }
  
  // 扣除BOSS血量
  worldBoss.hp = Math.max(0, worldBoss.hp - damage);
  
  // 记录伤害
  const existing = worldBoss.damageRecords.find(r => r.userId === userId);
  if (existing) {
    existing.damage += damage;
  } else {
    worldBoss.damageRecords.push({
      userId,
      name: userName,
      damage,
      time: Date.now()
    });
  }
  
  // 排序
  worldBoss.damageRecords.sort((a, b) => b.damage - a.damage);
  
  // 限制记录数
  if (worldBoss.damageRecords.length > bossConfig.maxDamageRecords) {
    worldBoss.damageRecords = worldBoss.damageRecords.slice(0, bossConfig.maxDamageRecords);
  }
  
  // 检查是否击杀
  let killed = false;
  if (worldBoss.hp <= 0) {
    worldBoss.status = 'dead';
    worldBoss.lastRefresh = Date.now();
    killed = true;
  }
  
  // 计算排名
  const rank = worldBoss.damageRecords.findIndex(r => r.userId === userId) + 1;
  
  res.json({
    success: true,
    remainingHp: worldBoss.hp,
    rank,
    totalDamage: existing ? existing.damage : damage,
    killed,
    bossRewards: killed ? worldBoss.currentBoss.reward : null
  });
});

// 获取伤害排行
router.get('/ranks', (req, res) => {
  const ranks = worldBoss.damageRecords.slice(0, 50);
  res.json(ranks);
});

// 我的伤害
router.get('/my-damage/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  const record = worldBoss.damageRecords.find(r => r.userId === userId);
  
  if (!record) {
    return res.json({ damage: 0, rank: 0 });
  }
  
  const rank = worldBoss.damageRecords.findIndex(r => r.userId === userId) + 1;
  
  res.json({
    damage: record.damage,
    rank,
    total: worldBoss.damageRecords.length
  });
});

// 手动刷新BOSS(测试用)
router.post('/refresh', (req, res) => {
  const boss = bossConfig.bosses[Math.floor(Math.random() * bossConfig.bosses.length)];
  worldBoss = {
    currentBoss: boss,
    hp: boss.hp,
    maxHp: boss.hp,
    damageRecords: [],
    lastRefresh: Date.now(),
    status: 'alive'
  };
  
  res.json({ success: true, boss });
});

module.exports = router;
