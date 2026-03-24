const express = require('express');
const router = express.Router();

// 世界BOSS配置
const bossConfig = {
  bosses: [
    { id: 1, name: '上古蛟龙', level: 10, hp: 1000000, attack: 5000, quality: 'rare', reward: { diamonds: 100, lingshi: 10000, magicCrystals: 5 } },
    { id: 2, name: '远古巨龟', level: 20, hp: 5000000, attack: 15000, quality: 'epic', reward: { diamonds: 300, lingshi: 30000, magicCrystals: 15 } },
    { id: 3, name: '暗黑魔龙', level: 30, hp: 20000000, attack: 50000, quality: 'legendary', reward: { diamonds: 500, lingshi: 50000, magicCrystals: 30 } },
    { id: 4, name: '九尾妖狐', level: 40, hp: 100000000, attack: 200000, quality: 'legendary', reward: { diamonds: 1000, lingshi: 100000, magicCrystals: 60 } },
    { id: 5, name: '仙帝残魂', level: 50, hp: 500000000, attack: 1000000, quality: 'mythical', reward: { diamonds: 5000, lingshi: 500000, magicCrystals: 200 } }
  ],
  refreshInterval: 3600000, // 1小时刷新
  maxDamageRecords: 100
};

// 魔晶品质系数（与 server.js MAGIC_CRYSTAL_CONFIG 一致）
const BOSS_QUALITY_MC = {
  rare: 1,
  epic: 1.5,
  legendary: 2,
  mythical: 5,
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
  
  // 魔晶奖励预览（根据本次伤害占总血量比例）
  const damageRatio = damage / worldBoss.currentBoss.hp;
  const mcReward = killed
    ? Math.floor(worldBoss.currentBoss.reward.magicCrystals || 0)
    : Math.floor((worldBoss.currentBoss.reward.magicCrystals || 0) * damageRatio * 0.5);
  
  res.json({
    success: true,
    remainingHp: worldBoss.hp,
    rank,
    totalDamage: existing ? existing.damage : damage,
    killed,
    bossRewards: killed ? worldBoss.currentBoss.reward : null,
    magicCrystalPreview: Math.max(1, mcReward),
  });
});

// 获取伤害排行
router.get('/ranks', (req, res) => {
  const ranks = worldBoss.damageRecords.slice(0, 50);
  res.json(ranks);
});

// 结算BOSS奖励（包含魔晶）
router.post('/settle', (req, res) => {
  const { userId } = req.body;
  
  if (worldBoss.status !== 'dead') {
    return res.json({ success: false, message: 'BOSS未死亡，无法结算' });
  }
  
  const myRecord = worldBoss.damageRecords.find(r => r.userId === userId);
  if (!myRecord) {
    return res.json({ success: false, message: '您未参与本次BOSS战' });
  }
  
  const boss = worldBoss.currentBoss;
  const totalDamage = worldBoss.damageRecords.reduce((sum, r) => sum + r.damage, 0);
  const myDamageRatio = myRecord.damage / (totalDamage || 1);
  
  // 计算各项奖励
  const expReward = Math.floor(boss.reward.lingshi * myDamageRatio * 0.1); // 少量经验
  const stoneReward = Math.floor(boss.reward.lingshi * myDamageRatio);
  
  // 魔晶奖励：参与奖（按伤害比例）
  const baseMc = boss.reward.magicCrystals || 5;
  const mcReward = Math.max(1, Math.floor(baseMc * myDamageRatio * 0.5));
  
  // 最后一击额外魔晶
  const isKiller = worldBoss.damageRecords[0]?.userId === userId;
  const killerBonus = isKiller ? Math.floor(baseMc * 0.5) : 0;
  
  res.json({
    success: true,
    rewards: {
      exp: expReward,
      spiritStones: stoneReward,
      magicCrystals: mcReward + killerBonus,
      killerBonus: isKiller ? killerBonus : 0,
    },
    damage: myRecord.damage,
    rank: worldBoss.damageRecords.findIndex(r => r.userId === userId) + 1,
  });
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
