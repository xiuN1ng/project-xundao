/**
 * 缓存管理 API
 * 提供缓存状态查询、统计和手动管理功能
 */

const express = require('express');
const router = express.Router();

// 延迟加载缓存模块
let cache;

function getCache() {
  if (!cache) {
    cache = require('../src/cache');
  }
  return cache;
}

// 获取所有缓存的统计信息
router.get('/stats', (req, res) => {
  try {
    const c = getCache();
    const playerStats = c.playerCache.getStats();
    const sectStats = c.sectCache.getStats();
    const beastStats = c.beastCache.getStats();
    const equipStats = c.equipmentCache.getStats();
    const configStats = c.configCache.getStats();
    const hotKeys = c.hotDataManager.getHotKeys();
    
    res.json({
      success: true,
      data: {
        player: playerStats,
        sect: sectStats,
        beast: beastStats,
        equipment: equipStats,
        config: configStats,
        hotData: hotKeys
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取单个缓存的统计
router.get('/stats/:type', (req, res) => {
  try {
    const { type } = req.params;
    const c = getCache();
    
    let cacheInstance;
    switch (type) {
      case 'player':
        cacheInstance = c.playerCache;
        break;
      case 'sect':
        cacheInstance = c.sectCache;
        break;
      case 'beast':
        cacheInstance = c.beastCache;
        break;
      case 'equipment':
        cacheInstance = c.equipmentCache;
        break;
      case 'config':
        cacheInstance = c.configCache;
        break;
      default:
        return res.status(400).json({ success: false, error: '无效的缓存类型' });
    }
    
    res.json({
      success: true,
      data: {
        type,
        ...cacheInstance.getStats()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 手动清理过期缓存
router.post('/cleanup', (req, res) => {
  try {
    const c = getCache();
    const before = {
      player: c.playerCache.size(),
      sect: c.sectCache.size(),
      beast: c.beastCache.size(),
      equipment: c.equipmentCache.size(),
      config: c.configCache.size()
    };
    
    // 执行清理
    c.playerCache.cleanup();
    c.sectCache.cleanup();
    c.beastCache.cleanup();
    c.equipmentCache.cleanup();
    c.configCache.cleanup();
    
    const after = {
      player: c.playerCache.size(),
      sect: c.sectCache.size(),
      beast: c.beastCache.size(),
      equipment: c.equipmentCache.size(),
      config: c.configCache.size()
    };
    
    res.json({
      success: true,
      message: '缓存清理完成',
      data: { before, after }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 手动失效指定玩家的缓存
router.post('/invalidate/player/:playerId', (req, res) => {
  try {
    const { playerId } = req.params;
    const c = getCache();
    
    c.cacheInvalidation.invalidatePlayer(playerId);
    
    res.json({
      success: true,
      message: `玩家 ${playerId} 缓存已失效`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 手动失效指定宗门的缓存
router.post('/invalidate/sect/:sectId', (req, res) => {
  try {
    const { sectId } = req.params;
    const c = getCache();
    
    c.cacheInvalidation.invalidateSect(sectId);
    
    res.json({
      success: true,
      message: `宗门 ${sectId} 缓存已失效`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 清空所有缓存
router.post('/clear', (req, res) => {
  try {
    const c = getCache();
    
    const before = {
      player: c.playerCache.size(),
      sect: c.sectCache.size(),
      beast: c.beastCache.size(),
      equipment: c.equipmentCache.size(),
      config: c.configCache.size()
    };
    
    c.playerCache.clear();
    c.sectCache.clear();
    c.beastCache.clear();
    c.equipmentCache.clear();
    c.configCache.clear();
    
    res.json({
      success: true,
      message: '所有缓存已清空',
      data: { before }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取热点数据列表
router.get('/hot', (req, res) => {
  try {
    const c = getCache();
    
    const hotKeys = c.hotDataManager.getHotKeys();
    
    res.json({
      success: true,
      data: {
        hotKeys,
        count: hotKeys.length,
        threshold: c.hotDataManager.hotThreshold
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 启动/停止定期清理
router.post('/cleanup/toggle', (req, res) => {
  try {
    const { enabled } = req.body;
    const c = getCache();
    
    if (enabled) {
      c.startCleanup(60000);
      res.json({ success: true, message: '定期缓存清理已启动' });
    } else {
      c.stopCleanup();
      res.json({ success: true, message: '定期缓存清理已停止' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
