const express = require('express');
const router = express.Router();

// 成就触发服务
let achievementTrigger;
try {
  achievementTrigger = require('../../game/achievement_trigger_service');
} catch (e) {
  console.log('[player] 成就触发服务未找到:', e.message);
  achievementTrigger = null;
}

// 模拟数据库（测试用满级账号）
let player = {
  id: 1,
  name: '云泽',
  level: 100,
  realm: 8,
  lingshi: 999999999,
  diamonds: 99999,
  hp: 9999999,
  attack: 999999,
  defense: 999999,
  speed: 99999,
  sectId: 1,
  createdAt: Date.now()
};

// 获取玩家信息
router.get('/', (req, res) => {
  res.json(player);
});

// 获取玩家信息 (兼容 /info 路径)
router.get('/info', (req, res) => {
  res.json(player);
});

// 更新玩家信息
router.put('/', (req, res) => {
  const oldLevel = player.level;
  player = { ...player, ...req.body };
  
  // ========== 成就触发：升级 ==========
  let achievementResults = [];
  if (achievementTrigger && player.level > oldLevel) {
    try {
      achievementResults = achievementTrigger.onLevelUp(player.id, player.level);
      const notifications = achievementTrigger.popNotifications(player.id);
      if (notifications.length > 0) {
        console.log(`[成就通知] 用户${player.id}达成成就:`, notifications.map(n => n.achievementName).join(', '));
      }
    } catch (e) {
      console.error('[player] 成就触发失败:', e.message);
    }
  }
  
  res.json({ 
    ...player, 
    achievements: achievementResults.length > 0 ? achievementResults.map(a => ({
      id: a.id,
      name: a.name,
      desc: a.desc,
      reward: a.reward
    })) : undefined
  });
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
