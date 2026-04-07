/**
 * 成就殿/名人堂 API 路由
 * 全服里程碑展示 + 成就广播 + 成就称号奖励
 */

const express = require('express');
const router = express.Router();

// 加载成就殿模块
let achievementHall = null;
try {
  achievementHall = require('../game/achievement_hall');
  achievementHall.initAchievementHall();
  console.log('[achievement_hall_api] 成就殿模块加载成功');
} catch (e) {
  console.warn('[achievement_hall_api] 成就殿模块加载失败:', e.message);
}

// 加载成就触发服务（用于获取广播）
let achievementTrigger = null;
try {
  achievementTrigger = require('../game/achievement_trigger_service');
} catch (e) {
  console.warn('[achievement_hall_api] 成就触发服务加载失败:', e.message);
}

// ==================== 全服里程碑 API ====================

/**
 * GET /api/achievement/hall/milestones
 * 获取全服里程碑列表（分页）
 * 
 * Query params:
 * - page: 页码 (default: 1)
 * - pageSize: 每页数量 (default: 20, max: 100)
 * - type: 里程碑类型 (可选)
 * - rarity: 稀有度 (可选)
 */
router.get('/milestones', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 20));
  const type = req.query.type || null;
  const rarity = req.query.rarity || null;

  if (!achievementHall) {
    return res.status(503).json({ 
      success: false, 
      error: '成就殿模块不可用',
      items: [],
      total: 0,
      page,
      pageSize
    });
  }

  const result = achievementHall.getServerMilestones({
    page,
    pageSize,
    type,
    rarity
  });

  // 格式化里程碑显示信息
  const formattedItems = result.items.map(m => ({
    id: m.id,
    username: m.username,
    type: m.type,
    typeName: achievementHall.getMilestoneTypeName(m.type),
    achievementName: m.achievementName,
    achievementDesc: m.achievementDesc,
    value: m.value,
    target: m.target,
    rarity: m.rarity,
    rarityColor: achievementHall.MILESTONE_RARITY[m.rarity]?.color || '#888888',
    title: m.titleName || null,
    timestamp: m.timestamp,
    formattedTime: m.formattedTime
  }));

  res.json({
    success: true,
    items: formattedItems,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    totalPages: result.totalPages,
    hasMore: result.hasMore
  });
});

/**
 * GET /api/achievement/hall/stats
 * 获取全服里程碑统计数据
 */
router.get('/stats', (req, res) => {
  if (!achievementHall) {
    return res.status(503).json({ 
      success: false, 
      error: '成就殿模块不可用' 
    });
  }

  const stats = achievementHall.getMilestoneStats();

  // 格式化统计数据
  const formattedStats = {
    totalMilestones: stats.totalMilestones,
    byType: Object.entries(stats.byType).map(([type, count]) => ({
      type,
      typeName: achievementHall.getMilestoneTypeName(type),
      count
    })),
    byRarity: Object.entries(stats.byRarity).map(([rarity, count]) => ({
      rarity,
      rarityName: achievementHall.MILESTONE_RARITY[rarity]?.label || rarity,
      rarityColor: achievementHall.MILESTONE_RARITY[rarity]?.color || '#888888',
      count
    })),
    topUsers: stats.topUsers.map(u => ({
      userId: u.userId,
      username: u.username,
      milestoneCount: u.count
    })),
    pendingBroadcasts: stats.recentBroadcasts
  };

  res.json({
    success: true,
    stats: formattedStats
  });
});

/**
 * GET /api/achievement/hall/broadcasts
 * 获取待推送的成就广播（客户端轮询接口）
 * 
 * 注意：每次调用会清除已返回的广播
 */
router.get('/broadcasts', (req, res) => {
  // 优先使用 achievementTrigger 的 popBroadcasts
  if (achievementTrigger) {
    const broadcasts = achievementTrigger.popAchievementBroadcasts();
    return res.json({
      success: true,
      broadcasts,
      count: broadcasts.length
    });
  }

  if (!achievementHall) {
    return res.status(503).json({ 
      success: false, 
      error: '成就殿模块不可用',
      broadcasts: []
    });
  }

  const broadcasts = achievementHall.popBroadcasts();
  res.json({
    success: true,
    broadcasts,
    count: broadcasts.length
  });
});

/**
 * GET /api/achievement/hall/player/:userId
 * 获取特定玩家的里程碑记录
 * 
 * Path params:
 * - userId: 玩家ID
 * 
 * Query params:
 * - limit: 返回数量限制 (default: 10, max: 50)
 */
router.get('/player/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));

  if (!achievementHall) {
    return res.status(503).json({ 
      success: false, 
      error: '成就殿模块不可用',
      milestones: []
    });
  }

  if (!userId || isNaN(userId)) {
    return res.status(400).json({
      success: false,
      error: '无效的玩家ID'
    });
  }

  const milestones = achievementHall.getPlayerMilestones(userId, limit);

  const formattedMilestones = milestones.map(m => ({
    id: m.id,
    type: m.type,
    typeName: achievementHall.getMilestoneTypeName(m.type),
    achievementName: m.achievementName,
    achievementDesc: m.achievementDesc,
    value: m.value,
    target: m.target,
    rarity: m.rarity,
    rarityColor: achievementHall.MILESTONE_RARITY[m.rarity]?.color || '#888888',
    title: m.titleName || null,
    timestamp: m.timestamp,
    formattedTime: m.formattedTime
  }));

  res.json({
    success: true,
    userId,
    milestones: formattedMilestones,
    count: formattedMilestones.length
  });
});

/**
 * GET /api/achievement/hall/types
 * 获取所有里程碑类型定义
 */
router.get('/types', (req, res) => {
  if (!achievementHall) {
    return res.status(503).json({ 
      success: false, 
      error: '成就殿模块不可用' 
    });
  }

  const types = Object.entries(achievementHall.MILESTONE_TYPE).map(([key, value]) => ({
    key,
    value,
    name: achievementHall.getMilestoneTypeName(value)
  }));

  res.json({
    success: true,
    types
  });
});

/**
 * GET /api/achievement/hall/rarity
 * 获取所有稀有度定义
 */
router.get('/rarity', (req, res) => {
  if (!achievementHall) {
    return res.status(503).json({ 
      success: false, 
      error: '成就殿模块不可用' 
    });
  }

  const rarities = Object.entries(achievementHall.MILESTONE_RARITY).map(([key, value]) => ({
    key,
    ...value
  }));

  res.json({
    success: true,
    rarities
  });
});

module.exports = router;
