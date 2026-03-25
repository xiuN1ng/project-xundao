/**
 * 福利系统 API - 每日签到
 */

const express = require('express');
const router = express.Router();

const { welfareStorage, SIGN_IN_REWARDS, EQUIPMENT_TEMPLATES } = require('./welfare_storage');

// 延迟加载依赖
let playerStorage;
let playerEquipmentStorage;
let playerModule; // 内存玩家数据后备

function loadDependencies() {
  if (!playerStorage) {
    try {
      const storage = require('./storage');
      playerStorage = storage.playerStorage;
    } catch (e) {
      console.error('加载storage失败:', e.message);
    }
  }
  
  if (!playerEquipmentStorage) {
    try {
      const beastEquipment = require('./beast_equipment');
      playerEquipmentStorage = beastEquipment.playerEquipmentStorage;
    } catch (e) {
      console.error('加载beast_equipment失败:', e.message);
    }
  }
  
  if (!playerModule) {
    try {
      playerModule = require('../backend/routes/player');
    } catch (e) {
      console.error('加载player模块失败:', e.message);
    }
  }
  
  return true;
}

// 从内存获取玩家灵石数量（后备方案）
function getPlayerSpiritStones(userId) {
  if (playerModule && playerModule._player) {
    return playerModule._player.spirit_stones || playerModule._player.lingshi || 0;
  }
  return 0;
}

// 更新玩家灵石（后备方案）
function updatePlayerSpiritStones(userId, amount) {
  if (playerModule && playerModule._player && playerModule._player.id === userId) {
    playerModule._player.spirit_stones = (playerModule._player.spirit_stones || 0) + amount;
    playerModule._player.lingshi = playerModule._player.spirit_stones;
  }
  // 同时尝试用 playerStorage
  if (playerStorage && typeof playerStorage.updateSpiritStones === 'function') {
    try {
      playerStorage.updateSpiritStones(userId, amount);
    } catch (e) {}
  }
}

// 初始化
function initWelfare() {
  welfareStorage.init();
}

// 获取签到配置信息
router.get('/config', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        cycle: 7,
        rewards: SIGN_IN_REWARDS.map((r, i) => ({
          day: i + 1,
          lingshi: r.lingshi,
          equipment: r.equipment ? EQUIPMENT_TEMPLATES[r.equipment] : null,
          repairCard: r.repairCard
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取签到状态 - GET /api/welfare/sign-in
router.get('/sign-in', (req, res) => {
  try {
    loadDependencies();
    
    // 支持多种参数来源
    const playerId = req.query.player_id || req.query.playerId || req.headers['x-user-id'] || 1;
    const userId = parseInt(playerId) || 1;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少玩家ID' 
      });
    }
    
    const status = welfareStorage.getSignInStatus(playerId);
    
    if (!status) {
      return res.status(500).json({ 
        success: false, 
        error: '获取签到状态失败' 
      });
    }
    
    res.json({
      success: true,
      data: {
        playerId: status.playerId,
        currentStreak: status.currentStreak,
        totalSignDays: status.totalSignDays,
        signedToday: status.signedToday,
        canClaim: status.canClaim,
        lastSignDate: status.lastSignDate,
        nextReward: status.nextReward,
        repairCards: status.repairCards,
        cycle: 7
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 签到并领取奖励 - POST /api/welfare/claim-sign-in
router.post('/claim-sign-in', async (req, res) => {
  try {
    loadDependencies();
    
    // 支持多种参数来源
    const playerIdRaw = req.body.player_id || req.body.playerId || req.headers['x-user-id'] || 1;
    const playerId = parseInt(playerIdRaw) || 1;
    
    if (!playerId) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少玩家ID' 
      });
    }
    
    // 执行签到
    const result = welfareStorage.signIn(playerId);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    // 发放奖励
    const rewards = [];
    const reward = result.reward;
    
    // 1. 灵石奖励（使用后备方案）
    if (reward.lingshi > 0) {
      updatePlayerSpiritStones(playerId, reward.lingshi);
      rewards.push({
        type: 'lingshi',
        amount: reward.lingshi,
        description: `${reward.lingshi}灵石`
      });
    }
    
    // 2. 装备奖励
    if (reward.equipment) {
      const equipment = EQUIPMENT_TEMPLATES[reward.equipment];
      if (equipment && playerEquipmentStorage) {
        // 添加装备到玩家背包
        const equipmentId = `${equipment.id}_${Date.now()}`;
        const newEquipment = {
          ...equipment,
          id: equipmentId,
          obtained_at: new Date().toISOString()
        };
        
        playerEquipmentStorage.addEquipment(playerId, newEquipment);
        rewards.push({
          type: 'equipment',
          data: equipment,
          description: `${equipment.name}`
        });
      } else {
        // 如果没有装备系统，转换为灵石
        const bonusLingshi = reward.equipment === 'green' ? 200 : 
                           reward.equipment === 'blue' ? 500 : 1000;
        updatePlayerSpiritStones(playerId, bonusLingshi);
        rewards.push({
          type: 'lingshi',
          amount: bonusLingshi,
          description: `${bonusLingshi}灵石(装备补偿)`
        });
      }
    }
    
    // 3. 补签卡奖励
    if (reward.repairCard > 0) {
      const database = welfareStorage.getDb ? welfareStorage.getDb() : null;
      if (database) {
        database.prepare(
          'UPDATE welfare_sign_in SET repair_cards = repair_cards + ? WHERE player_id = ?'
        ).run(reward.repairCard, playerId);
      }
      rewards.push({
        type: 'repair_card',
        amount: reward.repairCard,
        description: `补签卡x${reward.repairCard}`
      });
    }
    
    // 响应
    res.json({
      success: true,
      message: result.message,
      data: {
        streak: result.streak,
        day: result.day,
        rewards: rewards,
        totalReceived: {
          lingshi: reward.lingshi,
          equipment: reward.equipment ? EQUIPMENT_TEMPLATES[reward.equipment] : null,
          repairCard: reward.repairCard
        }
      }
    });
    
  } catch (error) {
    console.error('签到错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取签到历史
router.get('/history', (req, res) => {
  try {
    const playerIdRaw = req.query.player_id || req.query.playerId || req.headers['x-user-id'] || 1;
    const playerId = parseInt(playerIdRaw) || 1;
    
    if (!playerId) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少玩家ID' 
      });
    }
    
    const history = welfareStorage.getSignInHistory(playerId);
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/welfare/daily
 * 每日福利 - 每日登录奖励（独立于7日签到循环的每日一次奖励）
 */
router.get('/daily', (req, res) => {
  try {
    const playerIdRaw = req.query.player_id || req.query.playerId || req.headers['x-user-id'] || 1;
    const playerId = parseInt(playerIdRaw) || 1;
    
    const today = new Date().toISOString().split('T')[0];
    
    // 每日福利配置
    const dailyReward = { type: 'lingshi', amount: 100, name: '每日登录礼' };
    
    res.json({
      success: true,
      data: {
        date: today,
        canClaim: true,
        reward: dailyReward
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 初始化
initWelfare();

module.exports = router;
