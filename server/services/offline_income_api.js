/**
 * 离线收益 API
 */

const express = require('express');
const router = express.Router();

// 加载依赖
let offlineIncome;
function loadDependencies() {
  if (!offlineIncome) {
    try {
      offlineIncome = require('./offline_income');
    } catch (e) {
      console.error('加载offline_income失败:', e.message);
    }
  }
  return offlineIncome;
}

// 获取离线收益预览
router.get('/preview', (req, res) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    const income = offlineIncome.calculateOfflineIncome(parseInt(player_id));
    res.json(income);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 领取离线收益
router.post('/claim', (req, res) => {
  try {
    const { player_id } = req.body;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    const result = offlineIncome.claimOfflineIncome(parseInt(player_id));
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取领取状态
router.get('/status', (req, res) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    const status = offlineIncome.getOfflineIncomeStatus(parseInt(player_id));
    res.json(status);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 更新登出时间
router.post('/logout', (req, res) => {
  try {
    const { player_id } = req.body;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    const result = offlineIncome.updateLastLogout(parseInt(player_id));
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
