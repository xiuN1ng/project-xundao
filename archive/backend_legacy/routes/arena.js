const express = require('express');
const router = express.Router();

// 竞技场数据
let arenaData = {
  // 排名
  ranks: [
    { rank: 1, userId: 1, name: 'test', combat: 5000, winRate: 80 },
    { rank: 2, userId: 2, name: '玩家2', combat: 4500, winRate: 75 },
    { rank: 3, userId: 3, name: '玩家3', combat: 4000, winRate: 70 },
    { rank: 4, userId: 4, name: '玩家4', combat: 3500, winRate: 65 },
    { rank: 5, userId: 5, name: '玩家5', combat: 3000, winRate: 60 }
  ],
  
  // 战斗记录
  records: [],
  
  // 玩家数据
  players: {}
};

// 竞技场奖励
const arenaRewards = {
  1: { diamonds: 500, title: '王者' },
  2: { diamonds: 300, title: '钻石' },
  3: { diamonds: 200, title: '铂金' },
  4: { diamonds: 100, title: '黄金' },
  5: { diamonds: 50, title: '白银' },
  10: { diamonds: 30 },
  20: { diamonds: 20 },
  50: { diamonds: 10 },
  100: { diamonds: 5 }
};

// 获取排行榜
router.get('/ranks', (req, res) => {
  const { limit } = req.query;
  const ranks = arenaData.ranks.slice(0, parseInt(limit) || 50);
  res.json(ranks);
});

// 获取玩家排名
router.get('/rank/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  const playerRank = arenaData.ranks.find(r => r.userId === userId);
  
  if (!playerRank) {
    return res.json({ rank: arenaData.ranks.length + 1 });
  }
  
  res.json(playerRank);
});

// 获取挑战对手列表
router.get('/opponents/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  const myRank = arenaData.ranks.find(r => r.userId === userId);
  
  if (!myRank) {
    // 未上榜，返回前10名
    return res.json(arenaData.ranks.slice(0, 10));
  }
  
  // 获取前后5名
  const myIndex = arenaData.ranks.indexOf(myRank);
  const start = Math.max(0, myIndex - 5);
  const end = Math.min(arenaData.ranks.length, myIndex + 6);
  
  const opponents = arenaData.ranks.slice(start, end).filter(r => r.userId !== userId);
  
  res.json(opponents);
});

// 发起挑战
router.post('/challenge', (req, res) => {
  const { userId, targetId, userName, targetName, targetCombat } = req.body;
  
  const battleId = Date.now();
  
  // 简单模拟战斗结果
  const userCombat = 5000; // 实际应从用户数据获取
  const random = Math.random();
  const win = random > 0.4; // 60%胜率
  
  const record = {
    id: battleId,
    challengerId: userId,
    challengerName: userName,
    targetId,
    targetName,
    challengerCombat: userCombat,
    targetCombat,
    result: win ? 'win' : 'lose',
    time: Date.now()
  };
  
  arenaData.records.unshift(record);
  
  // 限制记录数量
  if (arenaData.records.length > 100) {
    arenaData.records = arenaData.records.slice(0, 100);
  }
  
  // 更新排名
  if (win) {
    // 简单逻辑：交换排名
    const challengerRank = arenaData.ranks.find(r => r.userId === userId);
    const targetRank = arenaData.ranks.find(r => r.userId === targetId);
    
    if (challengerRank && targetRank) {
      const temp = challengerRank.rank;
      challengerRank.rank = targetRank.rank;
      targetRank.rank = temp;
    }
  }
  
  res.json({
    success: true,
    battle: record,
    win,
    reward: win ? { lingshi: 100, arenaPoints: 10 } : { lingshi: 20, arenaPoints: 2 }
  });
});

// 获取战斗记录
router.get('/records/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  const records = arenaData.records.filter(r => 
    r.challengerId === userId || r.targetId === userId
  );
  res.json(records.slice(0, 20));
});

// 领取段位奖励
router.post('/season/reward', (req, res) => {
  const { userId, rank } = req.body;
  
  let reward = null;
  for (const [threshold, r] of Object.entries(arenaRewards)) {
    if (rank <= parseInt(threshold)) {
      reward = r;
    }
  }
  
  if (!reward) {
    return res.json({ success: false, message: '无奖励' });
  }
  
  res.json({
    success: true,
    reward,
    message: `获得${reward.diamonds}钻石${reward.title ? ', 称号:' + reward.title : ''}`
  });
});

module.exports = router;
