/**
 * 福利系统 API 路由 (Welfare API Routes)
 * 提供签到等福利相关的RESTful API接口
 */

const express = require('express');
const router = express.Router();

// 模拟签到数据（实际应从数据库读取）
let signInData = {
  lastSignIn: null,
  consecutiveDays: 0,
  totalDays: 0,
  todaySigned: false,
  rewardHistory: []
};

// 签到奖励配置
const SIGN_IN_REWARDS = [
  { day: 1, type: 'lingshi', amount: 300, name: '灵石x300' },
  { day: 2, type: 'lingshi', amount: 200, name: '灵石x200' },
  { day: 3, type: 'diamonds', amount: 10, name: '钻石x10' },
  { day: 4, type: 'lingshi', amount: 300, name: '灵石x300' },
  { day: 5, type: 'diamonds', amount: 20, name: '钻石x20' },
  { day: 6, type: 'lingshi', amount: 400, name: '灵石x400' },
  { day: 7, type: 'diamonds', amount: 50, name: '钻石x50' }
];

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
 * 获取签到状态
 */
router.get('/sign-in', (req, res) => {
  const playerId = req.query.player_id || 1;
  const today = new Date().toISOString().split('T')[0];
  
  res.json({
    success: true,
    data: {
      todaySigned: signInData.todaySigned,
      consecutiveDays: signInData.consecutiveDays,
      totalDays: signInData.totalDays,
      lastSignIn: signInData.lastSignIn,
      canClaim: !signInData.todaySigned
    }
  });
});

/**
 * GET /api/welfare/signin-status (兼容旧版)
 * 获取签到状态
 */
router.get('/signin-status', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  
  res.json({
    success: true,
    data: {
      signed: signInData.todaySigned,
      consecutiveDays: signInData.consecutiveDays,
      totalDays: signInData.totalDays,
      lastSignIn: signInData.lastSignIn
    }
  });
});

/**
 * POST /api/welfare/claim-sign-in
 * 领取签到奖励
 */
router.post('/claim-sign-in', (req, res) => {
  const playerId = req.body.player_id || 1;
  
  if (signInData.todaySigned) {
    return res.status(400).json({
      success: false,
      message: '今日已签到'
    });
  }
  
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const lastSign = signInData.lastSignIn;
  
  // 计算连续天数
  if (lastSign) {
    const lastDate = new Date(lastSign);
    const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      signInData.consecutiveDays++;
    } else if (diffDays > 1) {
      signInData.consecutiveDays = 1;
    }
  } else {
    signInData.consecutiveDays = 1;
  }
  
  signInData.lastSignIn = todayStr;
  signInData.todaySigned = true;
  signInData.totalDays++;
  
  const dayOfWeek = signInData.consecutiveDays % 7 || 7;
  const reward = SIGN_IN_REWARDS[dayOfWeek - 1];
  
  res.json({
    success: true,
    message: `签到成功！获得${reward.name}`,
    data: {
      reward: reward,
      consecutiveDays: signInData.consecutiveDays,
      totalDays: signInData.totalDays
    }
  });
});

/**
 * POST /api/welfare/signin (兼容旧版)
 * 签到
 */
router.post('/signin', (req, res) => {
  const playerId = req.body.player_id || 1;
  
  if (signInData.todaySigned) {
    return res.status(400).json({
      success: false,
      message: '今日已签到'
    });
  }
  
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const lastSign = signInData.lastSignIn;
  
  if (lastSign) {
    const lastDate = new Date(lastSign);
    const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      signInData.consecutiveDays++;
    } else if (diffDays > 1) {
      signInData.consecutiveDays = 1;
    }
  } else {
    signInData.consecutiveDays = 1;
  }
  
  signInData.lastSignIn = todayStr;
  signInData.todaySigned = true;
  signInData.totalDays++;
  
  const dayOfWeek = signInData.consecutiveDays % 7 || 7;
  const reward = SIGN_IN_REWARDS[dayOfWeek - 1];
  
  res.json({
    success: true,
    message: `签到成功！获得${reward.name}`,
    data: {
      reward: reward,
      consecutiveDays: signInData.consecutiveDays,
      totalDays: signInData.totalDays
    }
  });
});

/**
 * GET /api/welfare/second-day-reward
 * 获取次日登录奖励状态
 */
router.get('/second-day-reward', (req, res) => {
  res.json({
    success: true,
    data: {
      available: true,
      claimed: false,
      reward: { type: 'diamonds', amount: 20 }
    }
  });
});

/**
 * GET /api/welfare/third-day-reward
 * 获取三日登录奖励状态
 */
router.get('/third-day-reward', (req, res) => {
  res.json({
    success: true,
    data: {
      available: true,
      claimed: false,
      reward: { type: 'diamonds', amount: 30 }
    }
  });
});

module.exports = router;
