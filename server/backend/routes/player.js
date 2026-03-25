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

// 玩家登录 (处理离线挂机奖励)
router.post('/login', (req, res) => {
  const { userId } = req.body;
  const now = Date.now();
  
  const path = require('path');
  const DATA_DIR = path.join(__dirname, '..', '..', 'data');
  const DB_PATH = path.join(DATA_DIR, 'game.db');
  
  let db;
  try {
    const Database = require('better-sqlite3');
    db = new Database(DB_PATH);
  } catch (e) {
    db = null;
  }
  
  // 离线收益配置
  const OFFLINE_RATE = 25; // 25灵石/小时 (离线50%效率)
  const MAX_OFFLINE_HOURS = 24;
  
  // VIP加成配置
  const VIP_MULTIPLIERS = {
    0: 1.0, 1: 1.1, 2: 1.2, 3: 1.3, 4: 1.5, 5: 1.8, 6: 2.0, 7: 2.2, 8: 2.5, 9: 2.8, 10: 3.0
  };
  
  if (db && userId) {
    try {
      // 获取玩家数据
      let p = db.prepare('SELECT * FROM player WHERE id = ?').get(userId);
      if (!p) {
        return res.status(404).json({ success: false, error: '玩家不存在' });
      }
      
      // 获取上次登录时间
      const lastLogin = p.last_login ? new Date(p.last_login).getTime() : now;
      const elapsedMs = now - lastLogin;
      const elapsedHours = Math.min(elapsedMs / (1000 * 60 * 60), MAX_OFFLINE_HOURS);
      
      // VIP加成
      const vipLevel = p.vip_level || 0;
      const vipMultiplier = VIP_MULTIPLIERS[vipLevel] || 1.0;
      
      // 计算离线收益
      const offlineReward = Math.floor(elapsedHours * OFFLINE_RATE * vipMultiplier);
      const isOnlineEligible = elapsedHours < 0.5; // 不到30分钟算在线
      
      // 发放离线奖励
      if (offlineReward > 0) {
        db.prepare('UPDATE player SET spirit_stones = spirit_stones + ?, last_login = CURRENT_TIMESTAMP WHERE id = ?').run(offlineReward, userId);
      } else {
        db.prepare('UPDATE player SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(userId);
      }
      
      // 返回更新后的玩家数据
      const updatedPlayer = db.prepare('SELECT * FROM player WHERE id = ?').get(userId);
      
      return res.json({
        success: true,
        player: {
          id: updatedPlayer.id,
          name: updatedPlayer.username,
          level: updatedPlayer.level,
          realm: updatedPlayer.realm_level,
          lingshi: updatedPlayer.spirit_stones,
          diamonds: updatedPlayer.diamonds,
          vipLevel: updatedPlayer.vip_level || 0
        },
        offlineReward: offlineReward > 0 ? offlineReward : 0,
        offlineHours: Math.round(elapsedHours * 10) / 10,
        isOnline: isOnlineEligible,
        vipMultiplier,
        lastLogin: p.last_login
      });
    } catch (e) {
      console.error('[player] login错误:', e.message);
      return res.status(500).json({ success: false, error: e.message });
    }
  }
  
  // 无数据库时使用mock player
  res.json({ success: true, player, offlineReward: 0 });
});

module.exports = router;
module.exports._player = player;
