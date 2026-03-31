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

// Redis 缓存
let getLadderTop100;
try {
  const cacheMod = require('../utils/cache');
  getLadderTop100 = cacheMod.getLadderTop100;
} catch (e) {
  console.warn('[ladder] 加载Redis缓存模块失败:', e.message);
  getLadderTop100 = null;
}

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
router.get('/rankings', async (req, res) => {
  try {
    const { limit } = req.query;
    const limitNum = parseInt(limit) || 100;

    let data;
    if (getLadderTop100) {
      // 缓存未命中时，回源到 SQLite
      data = await getLadderTop100(() => Promise.resolve(ladderStorage.getLadderRankings(limitNum)));
      // 截取请求的 limit
      data = data.slice(0, limitNum);
    } else {
      data = ladderStorage.getLadderRankings(limitNum);
    }

    res.json({ success: true, data });
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
router.post('/finish', async (req, res) => {
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

    // 比赛结束后失效排行榜缓存
    if (getLadderTop100) {
      const { invalidateLadderTop100 } = require('../utils/cache');
      await invalidateLadderTop100();
    }

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
