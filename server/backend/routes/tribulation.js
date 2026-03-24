const express = require('express');
const router = express.Router();
const tribulationSystem = require('../../game/tribulation_system');

// 玩家数据引用（通过 setPlayerRef 注入，与 cultivation 联动）
let playerRef = null;

function setPlayerRef(player) {
  playerRef = player;
}

// 获取玩家当前境界对应的渡劫类型列表
router.get('/types', (req, res) => {
  let playerRealm = '炼气';
  if (playerRef) {
    try {
      playerRealm = playerRef.realmName || playerRef.realm || '炼气';
    } catch (e) {
      // 使用默认值
    }
  }
  
  // 支持通过 query 参数指定境界（用于调试）
  if (req.query.realm) {
    playerRealm = req.query.realm;
  }
  
  const types = tribulationSystem.getTribulationTypes(playerRealm);
  
  // 为每个类型附加当前可用的成功率
  const enriched = types.map(t => {
    const successRate = tribulationSystem.calculateSuccessRate(playerRealm);
    return {
      ...t,
      currentSuccessRate: Math.round(successRate * 100)
    };
  });
  
  res.json({
    realm: playerRealm,
    types: enriched,
    total: enriched.length
  });
});

// 发起渡劫
router.post('/attempt', (req, res) => {
  const { tribulationType, bonuses } = req.body;
  
  if (!tribulationType) {
    return res.status(400).json({ success: false, message: '缺少渡劫类型参数 tribulationType' });
  }
  
  // 获取玩家当前境界
  let playerRealm = '炼气';
  let playerId = 1;
  if (playerRef) {
    try {
      playerRealm = playerRef.realmName || playerRef.realm || '炼气';
      playerId = playerRef.id || 1;
    } catch (e) {
      // 使用默认值
    }
  }
  
  // 执行渡劫判定
  const result = tribulationSystem.attemptTribulation(playerRealm, tribulationType, bonuses || {});
  
  if (result.success) {
    // ========== 成就触发：渡劫成功 ==========
    let achievementResults = [];
    try {
      const achievementTrigger = require('../../game/achievement_trigger_service');
      achievementResults = achievementTrigger.onTribulationSuccess(playerId, result.targetRealm);
    } catch (e) {
      // 成就系统未挂载
    }
    
    res.json({
      ...result,
      achievements: achievementResults.length > 0 ? achievementResults.map(a => ({
        id: a.id,
        name: a.name,
        desc: a.desc,
        reward: a.reward
      })) : []
    });
  } else {
    res.json(result);
  }
});

// 获取渡劫奖励预览
router.get('/rewards/:fromTo', (req, res) => {
  const { fromTo } = req.params;
  const rewards = tribulationSystem.TRIBULATION_REWARDS[fromTo];
  if (!rewards) {
    return res.status(404).json({ message: '未找到该境界突破的奖励配置' });
  }
  res.json({ fromTo, rewards });
});

// 获取境界数据
router.get('/realms', (req, res) => {
  res.json(tribulationSystem.REALM_DATA);
});

module.exports = router;
module.exports.setPlayerRef = setPlayerRef;
