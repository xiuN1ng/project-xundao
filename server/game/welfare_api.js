/**
 * 福利系统 API - 每日签到
 */

const express = require('express');
const router = express.Router();

const { welfareStorage, getDb: welfareGetDb, SIGN_IN_REWARDS, EQUIPMENT_TEMPLATES, WELFARE_MONTHLY_CARDS } = require('./welfare_storage');

// ========== 时区工具（上海时间）==========
function getShanghaiDate() {
  const d = new Date(Date.now() + 8 * 3600000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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

// ========== 月卡 API ==========

/**
 * GET /api/welfare/month-card
 * 获取月卡状态
 */
router.get('/month-card', (req, res) => {
  try {
    const playerIdRaw = req.query.player_id || req.query.playerId || req.headers['x-user-id'] || 1;
    const playerId = parseInt(playerIdRaw) || 1;

    if (!playerId) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }

    const cards = welfareStorage.getMonthlyCardStatus(playerId);

    res.json({
      success: true,
      data: {
        cards,
        availableTypes: Object.entries(WELFARE_MONTHLY_CARDS).map(([key, card]) => ({
          cardType: key,
          name: card.name,
          cost: card.cost,
          costType: card.costType,
          dailyReward: card.dailyReward,
          description: card.description
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/welfare/buy-card
 * 购买月卡
 * Body: { player_id, card_type: 'spirit'|'premium' }
 */
router.post('/buy-card', (req, res) => {
  try {
    const playerIdRaw = req.body.player_id || req.body.playerId || req.headers['x-user-id'] || 1;
    const playerId = parseInt(playerIdRaw) || 1;
    const cardType = req.body.card_type || req.body.cardType;

    if (!playerId) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    if (!cardType) {
      return res.status(400).json({ success: false, error: '缺少月卡类型 (card_type)' });
    }
    if (!WELFARE_MONTHLY_CARDS[cardType]) {
      return res.status(400).json({ success: false, error: '无效的月卡类型，可选: spirit, premium' });
    }

    const card = WELFARE_MONTHLY_CARDS[cardType];

    // 检查玩家钻石是否足够（简化版：直接从Users表扣减钻石）
    // 注意：这里需要调用支付系统或钻石扣除逻辑
    // 目前简化处理：如果玩家有足够的灵石，可以用灵石购买
    // 实际应该走支付系统
    const database = welfareGetDb();
    if (!database) {
      return res.status(500).json({ success: false, error: '数据库未连接' });
    }

    // 简化：检查玩家是否有足够的钻石（用 diamond 字段）
    // 如果是灵石月卡(100钻石)，需要先有钻石
    // 这里暂时允许用灵石代替（1钻石=10灵石），方便测试
    const player = database.prepare('SELECT * FROM Users WHERE id = ?').get(playerId);
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }

    // 简化购买逻辑：直接购买（生产环境应接入支付）
    const result = welfareStorage.buyMonthlyCard(playerId, cardType);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/welfare/claim-card
 * 领取月卡每日奖励
 * Body: { player_id, card_type: 'spirit'|'premium' }
 */
router.post('/claim-card', (req, res) => {
  try {
    const playerIdRaw = req.body.player_id || req.body.playerId || req.headers['x-user-id'] || 1;
    const playerId = parseInt(playerIdRaw) || 1;
    const cardType = req.body.card_type || req.body.cardType;

    if (!playerId) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    if (!cardType) {
      return res.status(400).json({ success: false, error: '缺少月卡类型 (card_type)' });
    }

    const result = welfareStorage.claimMonthlyCardReward(playerId, cardType);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // 发放灵石奖励
    if (result.reward && result.reward.type === 'spirit_stones') {
      updatePlayerSpiritStones(playerId, result.reward.amount);
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

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

    // 记录每日领取（防止重复签到）
    const todayStr = getShanghaiDate();
    const database = welfareGetDb();
    if (database) {
      try {
        database.prepare(
          'INSERT OR IGNORE INTO forge_daily_claims (player_id, last_claim_date) VALUES (?, ?)'
        ).run(playerId, todayStr);
      } catch (_) { /* 已领取 */ }
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
      const database = welfareGetDb();
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

    const todayStr = getShanghaiDate();
    const dailyReward = { type: 'lingshi', amount: 100, name: '每日登录礼' };

    // 检查今日是否已领取每日登录礼
    let canClaimDaily = true;
    const database = welfareGetDb();
    if (database) {
      const existing = database.prepare(
        'SELECT id FROM forge_daily_claims WHERE player_id = ? AND last_claim_date = ?'
      ).get(playerId, todayStr);
      canClaimDaily = !existing;
    }

    // 获取首充双倍状态
    const firstRechargeStatus = welfareStorage.getFirstRechargeStatus(playerId);

    // 获取成长基金状态
    const growthFundStatus = welfareStorage.getGrowthFundStatus(playerId);

    // 获取玩家等级（用于成长基金资格判断）
    let playerLevel = 1;
    if (playerModule && playerModule._players && playerModule._players[playerId]) {
      playerLevel = playerModule._players[playerId].level || 1;
    } else if (database) {
      try {
        const user = database.prepare('SELECT level FROM Users WHERE id = ?').get(playerId);
        if (user) playerLevel = user.level || 1;
      } catch (_) {}
    }

    // 过滤成长基金可领取等级
    const availableLevels = growthFundStatus.levels
      .filter(l => !growthFundStatus.claimedLevels.includes(l.level) && playerLevel >= l.minLevel)
      .map(l => ({ level: l.level, reward: l.reward, minLevel: l.minLevel }));

    res.json({
      success: true,
      data: {
        date: todayStr,
        daily: { canClaim: canClaimDaily, reward: dailyReward },
        firstRecharge: firstRechargeStatus,
        growthFund: {
          purchased: growthFundStatus.purchased,
          claimedLevels: growthFundStatus.claimedLevels || [],
          levels: availableLevels
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/welfare/daily
 * 每日福利领取 - 独立于7日签到的每日一次100灵石
 */
router.post('/daily', (req, res) => {
  try {
    const playerIdRaw = req.body.player_id || req.body.playerId || req.headers['x-user-id'] || 1;
    const playerId = parseInt(playerIdRaw) || 1;

    if (!playerId) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }

    const todayStr = getShanghaiDate();
    const database = welfareGetDb();

    // 检查今日是否已领取
    if (database) {
      const existing = database.prepare(
        'SELECT id FROM forge_daily_claims WHERE player_id = ? AND last_claim_date = ?'
      ).get(playerId, todayStr);
      if (existing) {
        return res.status(400).json({ success: false, error: '今日已领取每日福利' });
      }
    }

    // 发放100灵石
    const rewardAmount = 100;
    updatePlayerSpiritStones(playerId, rewardAmount);

    // 记录领取
    if (database) {
      try {
        database.prepare(
          'INSERT INTO forge_daily_claims (player_id, last_claim_date) VALUES (?, ?)'
        ).run(playerId, todayStr);
      } catch (_) { /* 并发已领取 */ }
    }

    res.json({
      success: true,
      message: '领取成功！获得100灵石',
      data: {
        date: todayStr,
        reward: { type: 'lingshi', amount: rewardAmount, name: '每日登录礼' }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/welfare/claim
 * 通用福利领取 - 支持首充双倍和成长基金
 * body: { type: 'first_recharge' | 'growth_fund', level?: number, ... }
 */
router.post('/claim', async (req, res) => {
  try {
    const playerIdRaw = req.body.player_id || req.body.playerId || req.headers['x-user-id'] || 1;
    const playerId = parseInt(playerIdRaw) || 1;
    const { type, level } = req.body;

    if (!playerId) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }

    // 获取玩家当前等级
    let playerLevel = 1;
    const database = welfareGetDb();
    if (database) {
      try {
        const user = database.prepare('SELECT level FROM Users WHERE id = ?').get(playerId);
        if (user) playerLevel = user.level || 1;
      } catch (_) {}
    }

    if (type === 'first_recharge') {
      const result = welfareStorage.claimFirstRechargeReward(playerId);
      if (result.success) {
        updatePlayerSpiritStones(playerId, result.reward.amount);
      }
      return res.json(result);
    }

    if (type === 'growth_fund') {
      if (!level) {
        return res.status(400).json({ success: false, error: '缺少level参数' });
      }
      const result = welfareStorage.claimGrowthFundReward(playerId, parseInt(level), playerLevel);
      if (result.success) {
        updatePlayerSpiritStones(playerId, result.reward.amount);
      }
      return res.json(result);
    }

    return res.status(400).json({ success: false, error: '无效的福利类型' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 初始化
initWelfare();

module.exports = router;
