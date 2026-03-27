const express = require('express');
const router = express.Router();

// 每日任务集成
let dailyQuestRouter;
try {
  dailyQuestRouter = require('./dailyQuest');
} catch (e) {
  console.log('[battle] dailyQuest 路由加载失败:', e.message);
}

// 模拟数据
let arena = {
  playerId: 1,
  rank: 42,
  winCount: 128,
  winRate: 68,
  streak: 5
};

let opponents = [
  { id: 1, name: '剑仙李白', realm: 8, power: 158000, rank: 1 },
  { id: 2, name: '丹帝', realm: 7, power: 142000, rank: 2 },
  { id: 3, name: '阵法师', realm: 7, power: 135000, rank: 3 },
  { id: 4, name: '逍遥子', realm: 6, power: 98000, rank: 15 },
  { id: 5, name: '散修', realm: 5, power: 65000, rank: 28 }
];

let records = [
  { id: 1, opponent: '剑仙', result: 'win', reward: 50, time: Date.now() - 3600000 },
  { id: 2, opponent: '丹帝', result: 'lose', reward: 0, time: Date.now() - 7200000 },
  { id: 3, opponent: '阵法师', result: 'win', reward: 50, time: Date.now() - 10800000 }
];

// 获取竞技场信息
router.get('/', (req, res) => {
  res.json({ arena, opponents, records });
});

// 挑战对手
router.post('/challenge', (req, res) => {
  const { opponentId } = req.body;
  const opponent = opponents.find(o => o.id === opponentId);
  
  if (!opponent) {
    return res.json({ success: false, message: '对手不存在' });
  }
  
  // 模拟战斗结果
  const win = Math.random() > 0.5;
  const reward = win ? 50 : 0;
  
  if (win) {
    arena.winCount += 1;
    arena.streak += 1;
    // 触发每日任务：战斗胜利
    if (dailyQuestRouter && dailyQuestRouter.updateDailyQuestProgress) {
      const playerId = req.body.player_id || req.body.userId || req.body.playerId || 1;
      dailyQuestRouter.updateDailyQuestProgress(playerId, 'battle', 1);
    }
  } else {
    arena.streak = 0;
  }
  arena.winRate = Math.floor((arena.winCount / (arena.winCount + 1)) * 100);
  
  records.unshift({
    id: Date.now(),
    opponent: opponent.name,
    result: win ? 'win' : 'lose',
    reward,
    time: Date.now()
  });
  
  res.json({ success: true, win, reward, arena });
});

module.exports = router;
