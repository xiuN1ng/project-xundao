/**
 * 首充双倍系统 API 路由
 * GET  /api/first-recharge/config  - 获取首充配置
 * POST /api/first-recharge/claim   - 领取首充奖励
 */

const express = require('express');
const router = express.Router();

let welfareStorage = null;
let playerStorage = null;

function loadDependencies() {
  if (!welfareStorage) {
    try {
      const storage = require('./welfare_storage');
      welfareStorage = storage.welfareStorage;
    } catch (e) {
      console.error('[first_recharge] welfare_storage加载失败:', e.message);
    }
  }
  if (!playerStorage) {
    try {
      const storage = require('./storage');
      playerStorage = storage.playerStorage;
    } catch (e) {
      console.error('[first_recharge] playerStorage加载失败:', e.message);
    }
  }
}

const FIRST_RECHARGE_CONFIG = {
  enabled: true,
  originalAmount: 6,
  rewards: {
    spirit_stones: 1200,
    skill_book_purple: 1,
    strengthening_stone: 50,
    linggen_fruit: 3
  },
  title: '仙盟创始人'
};

// GET /api/first-recharge/config
router.get('/config', (req, res) => {
  try {
    loadDependencies();
    const playerId = parseInt(req.query.player_id || req.query.playerId || 1);
    const status = welfareStorage ? welfareStorage.getFirstRechargeStatus(playerId) : { claimed: false, purchased: false };
    res.json({
      success: true,
      data: {
        enabled: FIRST_RECHARGE_CONFIG.enabled,
        claimed: status.claimed,
        purchased: status.purchased,
        isActive: true,
        countdown: 0,
        rewards: FIRST_RECHARGE_CONFIG.rewards,
        title: FIRST_RECHARGE_CONFIG.title,
        originalAmount: FIRST_RECHARGE_CONFIG.originalAmount
      }
    });
  } catch (error) {
    console.error('首充配置错误:', error);
    res.json({
      success: true,
      data: {
        enabled: true,
        claimed: false,
        isActive: true,
        countdown: 0,
        rewards: FIRST_RECHARGE_CONFIG.rewards,
        title: FIRST_RECHARGE_CONFIG.title
      }
    });
  }
});

// POST /api/first-recharge/claim
router.post('/claim', async (req, res) => {
  try {
    loadDependencies();
    const playerId = parseInt(req.body.player_id || req.body.playerId || 1);
    if (!welfareStorage) {
      return res.status(500).json({ success: false, error: '服务不可用' });
    }
    const result = welfareStorage.claimFirstRechargeReward(playerId);
    if (!result.success) {
      return res.status(400).json(result);
    }
    // 发放灵石
    if (playerStorage) {
      playerStorage.updateSpiritStones(playerId, result.rewards.spirit_stones);
    }
    res.json({
      success: true,
      message: result.message,
      data: {
        rewards: result.rewards,
        title: result.title
      }
    });
  } catch (error) {
    console.error('领取首充奖励错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/first-recharge/claim-v2 (alias)
router.post('/claim-v2', async (req, res) => {
  // Forward to /claim
  const playerId = parseInt(req.body.player_id || req.body.playerId || 1);
  try {
    loadDependencies();
    if (!welfareStorage) {
      return res.status(500).json({ success: false, error: '服务不可用' });
    }
    const result = welfareStorage.claimFirstRechargeReward(playerId);
    if (!result.success) {
      return res.status(400).json(result);
    }
    if (playerStorage) {
      playerStorage.updateSpiritStones(playerId, result.rewards.spirit_stones);
    }
    res.json({
      success: true,
      message: result.message,
      data: {
        rewards: result.rewards,
        title: result.title
      }
    });
  } catch (error) {
    console.error('领取首充奖励错误(claim-v2):', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
