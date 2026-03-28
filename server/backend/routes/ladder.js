/**
 * 天梯系统 API
 */

const express = require('express');
const router = express.Router();

// 加载依赖
let ladderStorage;
try {
  const mod = require('../../game/ladder_storage');
  ladderStorage = mod.ladderStorage;
} catch (e) {
  console.error('加载ladder_storage失败:', e.message);
}
function loadDependencies() { return ladderStorage; }

// 获取玩家天梯数据
router.get('/info', (req, res) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    const data = ladderStorage.getPlayerLadderData(parseInt(player_id));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取天梯排行榜
router.get('/rankings', (req, res) => {
  try {
    const { limit } = req.query;
    
    const rankings = ladderStorage.getLadderRankings(parseInt(limit) || 100);
    res.json({ success: true, data: rankings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 开始匹配
router.post('/match', (req, res) => {
  try {
    const { player_id } = req.body;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    const match = ladderStorage.startMatching(parseInt(player_id));
    res.json({ success: true, data: match });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 结束比赛
router.post('/finish', (req, res) => {
  try {
    const { player_id, opponent_id, winner_id, is_ai } = req.body;
    
    if (!player_id || !opponent_id === undefined || !winner_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const result = ladderStorage.finishMatch(
      parseInt(player_id),
      parseInt(opponent_id),
      parseInt(winner_id),
      is_ai || false
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取赛季信息
router.get('/season', (req, res) => {
  try {
    const season = ladderStorage.getCurrentSeason();
    res.json({ success: true, data: season });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
