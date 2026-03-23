/**
 * 服务器存储 API - 处理玩家数据持久化
 */

const express = require('express');
const router = express.Router();
const { gameDataStorage, realmDungeonStorage } = require('./storage');

// 保存玩家游戏数据
router.post('/save', async (req, res) => {
  try {
    const { player_id, game_data } = req.body;
    
    if (!player_id || !game_data) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少必要参数: player_id, game_data' 
      });
    }
    
    await gameDataStorage.savePlayerGameData(player_id, game_data);
    
    res.json({ 
      success: true, 
      message: '游戏数据保存成功' 
    });
  } catch (error) {
    console.error('保存游戏数据失败:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 加载玩家游戏数据
router.get('/load', async (req, res) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少必要参数: player_id' 
      });
    }
    
    const gameData = await gameDataStorage.getPlayerGameData(player_id);
    
    if (!gameData) {
      return res.json({ 
        success: true, 
        data: null,
        message: '暂无存档数据' 
      });
    }
    
    res.json({ 
      success: true, 
      data: gameData 
    });
  } catch (error) {
    console.error('加载游戏数据失败:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 获取境界副本进度
router.get('/realm-dungeon/progress', async (req, res) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少必要参数: player_id' 
      });
    }
    
    const progress = await realmDungeonStorage.getProgress(player_id);
    
    res.json({ 
      success: true, 
      data: progress 
    });
  } catch (error) {
    console.error('获取副本进度失败:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 更新境界副本进度
router.post('/realm-dungeon/progress', async (req, res) => {
  try {
    const { player_id, realm, highest_floor, cleared } = req.body;
    
    if (!player_id || !realm) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少必要参数: player_id, realm' 
      });
    }
    
    await realmDungeonStorage.updateProgress(
      player_id, 
      realm, 
      highest_floor || 0, 
      cleared || false
    );
    
    res.json({ 
      success: true, 
      message: '副本进度更新成功' 
    });
  } catch (error) {
    console.error('更新副本进度失败:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;
