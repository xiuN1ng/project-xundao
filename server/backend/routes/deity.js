/**
 * 封神榜系统 API
 */

const express = require('express');
const router = express.Router();

// 加载依赖
let deityStorage;
function loadDependencies() {
  if (!deityStorage) {
    try {
      deityStorage = require('../game/deity_list_storage');
    } catch (e) {
      console.error('加载deity_list_storage失败:', e.message);
    }
  }
  return deityStorage;
}

// 获取榜单类型列表
router.get('/types', (req, res) => {
  try {
    const types = deityStorage.getListTypes();
    res.json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取榜单排名
router.get('/ranking', (req, res) => {
  try {
    const { type, limit } = req.query;
    
    if (!type) {
      return res.status(400).json({ success: false, error: '缺少榜单类型' });
    }
    
    const rankings = deityStorage.getRanking(type, parseInt(limit) || 100);
    res.json({ success: true, data: rankings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取玩家在某榜单的排名
router.get('/player-rank', (req, res) => {
  try {
    const { player_id, type } = req.query;
    
    if (!player_id || !type) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const result = deityStorage.getPlayerRank(parseInt(player_id), type);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取玩家最佳排名
router.get('/best-rank', (req, res) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    const result = deityStorage.getPlayerBestRank(parseInt(player_id));
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 挑战榜单玩家
router.post('/challenge', (req, res) => {
  try {
    const { challenger_id, target_id, type } = req.body;
    
    if (!challenger_id || !target_id || !type) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const result = deityStorage.challengeTarget(
      parseInt(challenger_id),
      parseInt(target_id),
      type
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 记录每日榜单
router.post('/record', (req, res) => {
  try {
    const result = deityStorage.recordDailyList();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
