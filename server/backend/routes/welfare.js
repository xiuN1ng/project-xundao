/**
 * 福利系统 API 路由 (Welfare API Routes)
 * 提供签到等福利相关的RESTful API接口
 * 统一使用 Asia/Shanghai 时区
 */

const express = require('express');
const router = express.Router();

// 引入 welfare_storage（统一时区处理）
let welfareStorage = null;
try {
  const welfareModule = require('../../game/welfare_storage');
  welfareStorage = welfareModule.welfareStorage;
} catch (e) {
  console.error('[welfare] welfare_storage加载失败:', e.message);
}

// 签到奖励配置（与 welfare_storage 保持一致）
const SIGN_IN_REWARDS = [
  { day: 1, type: 'lingshi', amount: 300, name: '灵石x300' },
  { day: 2, type: 'lingshi', amount: 200, name: '灵石x200' },
  { day: 3, type: 'diamonds', amount: 10, name: '钻石x10' },
  { day: 4, type: 'lingshi', amount: 300, name: '灵石x300' },
  { day: 5, type: 'diamonds', amount: 20, name: '钻石x20' },
  { day: 6, type: 'lingshi', amount: 400, name: '灵石x400' },
  { day: 7, type: 'diamonds', amount: 50, name: '钻石x50' }
];

// 工具函数：获取 Asia/Shanghai 当日日期字符串
function getShanghaiDate() {
  const d = new Date(Date.now() + 8 * 3600000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * GET /api/welfare/config
 * 获取签到配置
 */
router.get('/config', (req, res) => {
  res.json({
    success: true,
    data: {
      rewards: SIGN_IN_REWARDS,
      cycleDays: 7
    }
  });
});

/**
 * GET /api/welfare/sign-in
 * 获取签到状态（使用 welfare_storage DB 持久化）
 */
router.get('/sign-in', (req, res) => {
  const playerId = parseInt(req.query.player_id || req.query.userId || req.body.player_id || 1);

  if (!welfareStorage) {
    return res.json({ success: false, error: '服务不可用' });
  }

  try {
    const status = welfareStorage.getSignInStatus(playerId);
    res.json({
      success: true,
      data: {
        todaySigned: status.signedToday,
        consecutiveDays: status.currentStreak,
        totalDays: status.totalSignDays,
        lastSignIn: status.lastSignDate,
        canClaim: status.canClaim,
        nextReward: status.nextReward,
        repairCards: status.repairCards
      }
    });
  } catch (e) {
    console.error('[welfare] getSignInStatus 错误:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * GET /api/welfare/signin-status (兼容旧版)
 * 获取签到状态
 */
router.get('/signin-status', (req, res) => {
  const playerId = parseInt(req.query.player_id || req.query.userId || req.body.player_id || 1);

  if (!welfareStorage) {
    return res.json({ success: false, error: '服务不可用' });
  }

  try {
    const status = welfareStorage.getSignInStatus(playerId);
    res.json({
      success: true,
      data: {
        signed: status.signedToday,
        consecutiveDays: status.currentStreak,
        totalDays: status.totalSignDays,
        lastSignIn: status.lastSignDate
      }
    });
  } catch (e) {
    console.error('[welfare] signin-status 错误:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * POST /api/welfare/claim-sign-in
 * 领取签到奖励（使用 welfare_storage DB 持久化）
 */
router.post('/claim-sign-in', (req, res) => {
  const playerId = parseInt(req.body.player_id || req.body.userId || 1);

  if (!welfareStorage) {
    return res.status(500).json({ success: false, error: '服务不可用' });
  }

  try {
    const result = welfareStorage.signIn(playerId);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    // 获取完整状态
    const status = welfareStorage.getSignInStatus(playerId);

    res.json({
      success: true,
      message: result.message || '签到成功！',
      data: {
        streak: result.streak,
        day: result.day,
        reward: result.reward,
        totalSignDays: status.totalSignDays,
        currentStreak: result.streak
      }
    });
  } catch (e) {
    console.error('[welfare] signIn 错误:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * POST /api/welfare/signin (兼容旧版)
 * 签到
 */
router.post('/signin', (req, res) => {
  // 直接转发给 claim-sign-in
  const playerId = parseInt(req.body.player_id || req.body.userId || 1);

  if (!welfareStorage) {
    return res.status(500).json({ success: false, error: '服务不可用' });
  }

  try {
    const result = welfareStorage.signIn(playerId);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    // 获取完整状态（包含 totalSignDays）
    const status = welfareStorage.getSignInStatus(playerId);

    res.json({
      success: true,
      message: result.message || '签到成功！',
      data: {
        reward: result.reward,
        consecutiveDays: result.streak,
        totalDays: status.totalSignDays,
        currentStreak: result.streak,
        day: result.day
      }
    });
  } catch (e) {
    console.error('[welfare] signin 错误:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * POST /api/welfare/repair-sign
 * 补签（使用补签卡）
 */
router.post('/repair-sign', (req, res) => {
  const playerId = parseInt(req.body.player_id || req.body.userId || 1);
  const date = req.body.date; // YYYY-MM-DD

  if (!welfareStorage) {
    return res.status(500).json({ success: false, error: '服务不可用' });
  }

  try {
    if (welfareStorage.repairSignIn) {
      const result = welfareStorage.repairSignIn(playerId, date);
      if (!result.success) {
        return res.status(400).json({ success: false, message: result.error });
      }
      return res.json({ success: true, message: '补签成功', data: result });
    }
    return res.status(400).json({ success: false, message: '补签功能不可用' });
  } catch (e) {
    console.error('[welfare] repairSignIn 错误:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * GET /api/welfare/second-day-reward
 * 获取次日登录奖励状态
 */
router.get('/second-day-reward', (req, res) => {
  const playerId = parseInt(req.query.player_id || req.query.userId || 1);

  if (!welfareStorage) {
    return res.json({
      success: true,
      data: { available: true, claimed: false, reward: { type: 'diamonds', amount: 20 } }
    });
  }

  try {
    // 次日奖励：连续签到 >= 2 天后可领取
    const status = welfareStorage.getSignInStatus(playerId);
    const claimed = status.totalSignDays >= 2; // 简化逻辑
    res.json({
      success: true,
      data: {
        available: status.currentStreak >= 2,
        claimed: claimed,
        reward: { type: 'diamonds', amount: 20 }
      }
    });
  } catch (e) {
    res.json({ success: true, data: { available: true, claimed: false, reward: { type: 'diamonds', amount: 20 } } });
  }
});

/**
 * GET /api/welfare/third-day-reward
 * 获取三日登录奖励状态
 */
router.get('/third-day-reward', (req, res) => {
  const playerId = parseInt(req.query.player_id || req.query.userId || 1);

  if (!welfareStorage) {
    return res.json({
      success: true,
      data: { available: true, claimed: false, reward: { type: 'diamonds', amount: 30 } }
    });
  }

  try {
    const status = welfareStorage.getSignInStatus(playerId);
    res.json({
      success: true,
      data: {
        available: status.currentStreak >= 3,
        claimed: status.totalSignDays >= 3,
        reward: { type: 'diamonds', amount: 30 }
      }
    });
  } catch (e) {
    res.json({ success: true, data: { available: true, claimed: false, reward: { type: 'diamonds', amount: 30 } } });
  }
});

/**
 * GET /api/welfare/daily
 * 获取每日福利状态
 */
router.get('/daily', (req, res) => {
  const playerId = parseInt(req.query.player_id || req.query.userId || 1);

  if (!welfareStorage) {
    return res.status(500).json({ success: false, error: '服务不可用' });
  }

  try {
    const status = welfareStorage.getSignInStatus(playerId);
    res.json({
      success: true,
      data: {
        signedToday: status.signedToday,
        canClaim: status.canClaim,
        currentStreak: status.currentStreak,
        totalSignDays: status.totalSignDays,
        lastSignDate: status.lastSignDate,
        nextReward: status.nextReward
      }
    });
  } catch (e) {
    console.error('[welfare] daily 错误:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * POST /api/welfare/daily/claim
 * 领取每日登录奖励
 */
router.post('/daily/claim', (req, res) => {
  const playerId = parseInt(req.body.player_id || req.body.userId || 1);

  if (!welfareStorage) {
    return res.status(500).json({ success: false, error: '服务不可用' });
  }

  try {
    const result = welfareStorage.signIn(playerId);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }
    res.json({ success: true, message: '领取成功', data: result });
  } catch (e) {
    console.error('[welfare] daily/claim 错误:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
