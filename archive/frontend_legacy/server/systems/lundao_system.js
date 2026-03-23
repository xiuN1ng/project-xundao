/**
 * 论道系统 - Express Router实现
 * 玩家之间交流心得、辩论法门的社交玩法
 *
 * 数据结构（论道室/论道台）：
 * {
 *   roomId, creatorId, participants: [],
 *   topic: string,        // 论道主题（如"金丹大道"、"剑道"）
 *   level: number,        // 论道室等级(1-5)
 *   status: 'waiting'|'ongoing'|'finished',
 *   startTime, endTime,
 *   discussions: []        // 论道记录
 * }
 *
 * API路由：
 * - GET  /api/lundao/rooms        - 获取所有论道室列表
 * - GET  /api/lundao/room/:id     - 获取单个论道室详情
 * - POST /api/lundao/create       - 创建论道室
 * - POST /api/lundao/join/:id     - 加入论道室
 * - POST /api/lundao/leave/:id    - 离开论道室
 * - POST /api/lundao/discuss/:id  - 发表论道言论/进行辩论
 * - POST /api/lundao/end/:id      - 结束论道
 * - GET  /api/lundao/my-rooms     - 获取我的论道室
 * - GET  /api/lundao/history      - 论道历史记录
 */

const express = require('express');
const router = express.Router();
const LundaoStorage = require('../storages/lundao_storage');

// 论道系统配置
const LUNDAO_CONFIG = {
  // 等级名称
  LEVEL_NAMES: {
    1: '初窥门径',
    2: '小有所成',
    3: '融会贯通',
    4: '炉火纯青',
    5: '登峰造极'
  },
  // 主题库
  TOPICS: [
    '金丹大道',
    '剑道',
    '丹道',
    '阵法之道',
    '心魔之道',
    '天道法则',
    '修炼心得',
    '功法奥秘',
    '灵气运用',
    '境界突破'
  ],
  // 每级最大参与人数
  MAX_PARTICIPANTS: {
    1: 3,
    2: 5,
    3: 7,
    4: 9,
    5: 11
  },
  // 感悟值获取配置
  INSIGHT_CONFIG: {
    baseGain: 10,           // 基础感悟
    perDiscussion: 2,       // 每条发言额外感悟
    levelBonus: 0.25        // 每级加成 25%
  }
};

// 尝试加载 playerStorage 用于更新玩家感悟值
let playerStorage = null;
try {
  const storage = require('../../../../src/storage');
  playerStorage = storage.playerStorage;
} catch (e) {
  // playerStorage 不可用
}

// ============ 中间件 ============

// 简单的玩家ID提取中间件（实际项目中应使用真实认证）
function extractPlayerId(req, res, next) {
  // 支持 header、query、body 多种方式传递 playerId
  req.playerId = parseInt(
    req.headers['x-player-id'] ||
    req.query.playerId ||
    req.body?.playerId ||
    0,
    10
  );

  if (!req.playerId) {
    return res.status(401).json({
      success: false,
      error: '未登录，请提供 playerId'
    });
  }

  next();
}

// ============ API 路由 ============

/**
 * GET /api/lundao/rooms
 * 获取所有论道室列表
 */
router.get('/rooms', (req, res) => {
  try {
    const { status, level } = req.query;
    const filters = {};

    if (status) filters.status = status;
    if (level) filters.level = parseInt(level, 10);

    const rooms = LundaoStorage.getAllRooms(filters);

    const formattedRooms = rooms.map(room => ({
      roomId: room.roomId,
      creatorId: room.creatorId,
      topic: room.topic,
      level: room.level,
      levelName: LUNDAO_CONFIG.LEVEL_NAMES[room.level] || '未知',
      status: room.status,
      participantCount: room.participants.length,
      maxParticipants: LUNDAO_CONFIG.MAX_PARTICIPANTS[room.level] || 3,
      discussionCount: room.discussions.length,
      createdAt: room.createdAt,
      startTime: room.startTime
    }));

    res.json({
      success: true,
      data: {
        rooms: formattedRooms,
        total: formattedRooms.length
      }
    });
  } catch (e) {
    console.error('[LundaoSystem] 获取论道室列表失败:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * GET /api/lundao/room/:id
 * 获取单个论道室详情
 */
router.get('/room/:id', (req, res) => {
  try {
    const { id } = req.params;
    const room = LundaoStorage.getRoom(id);

    if (!room) {
      return res.status(404).json({
        success: false,
        error: '论道室不存在'
      });
    }

    const insightGain = LundaoStorage.calculateInsight(room);

    res.json({
      success: true,
      data: {
        roomId: room.roomId,
        creatorId: room.creatorId,
        participants: room.participants,
        topic: room.topic,
        level: room.level,
        levelName: LUNDAO_CONFIG.LEVEL_NAMES[room.level] || '未知',
        status: room.status,
        startTime: room.startTime,
        endTime: room.endTime,
        discussions: room.discussions.map(d => ({
          id: d.id,
          playerId: d.playerId,
          content: d.content,
          timestamp: d.timestamp
        })),
        insightGain,
        createdAt: room.createdAt
      }
    });
  } catch (e) {
    console.error('[LundaoSystem] 获取论道室详情失败:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * POST /api/lundao/create
 * 创建论道室
 *
 * Body: { playerId, topic?, level? }
 */
router.post('/create', extractPlayerId, (req, res) => {
  try {
    const { topic, level = 1 } = req.body;
    const playerId = req.playerId;

    // 验证等级
    const roomLevel = Math.min(Math.max(parseInt(level, 10), 1), 5);

    // 如果没指定主题，随机选择
    const finalTopic = topic || LUNDAO_CONFIG.TOPICS[
      Math.floor(Math.random() * LUNDAO_CONFIG.TOPICS.length)
    ];

    const room = LundaoStorage.createRoom({
      creatorId: playerId,
      topic: finalTopic,
      level: roomLevel
    });

    console.log(`[LundaoSystem] 玩家 ${playerId} 创建了论道室 ${room.roomId}, 主题: ${finalTopic}`);

    res.json({
      success: true,
      data: {
        roomId: room.roomId,
        creatorId: room.creatorId,
        topic: room.topic,
        level: room.level,
        levelName: LUNDAO_CONFIG.LEVEL_NAMES[room.level],
        status: room.status,
        maxParticipants: LUNDAO_CONFIG.MAX_PARTICIPANTS[room.level],
        createdAt: room.createdAt,
        message: '论道室创建成功'
      }
    });
  } catch (e) {
    console.error('[LundaoSystem] 创建论道室失败:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * POST /api/lundao/join/:id
 * 加入论道室
 */
router.post('/join/:id', extractPlayerId, (req, res) => {
  try {
    const { id } = req.params;
    const playerId = req.playerId;

    const result = LundaoStorage.joinRoom(id, playerId);

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    const room = result;
    console.log(`[LundaoSystem] 玩家 ${playerId} 加入了论道室 ${id}`);

    res.json({
      success: true,
      data: {
        roomId: room.roomId,
        topic: room.topic,
        level: room.level,
        levelName: LUNDAO_CONFIG.LEVEL_NAMES[room.level],
        status: room.status,
        participants: room.participants,
        participantCount: room.participants.length,
        maxParticipants: LUNDAO_CONFIG.MAX_PARTICIPANTS[room.level],
        message: room.status === 'ongoing' ? '论道已开始' : '等待其他修士加入...'
      }
    });
  } catch (e) {
    console.error('[LundaoSystem] 加入论道室失败:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * POST /api/lundao/leave/:id
 * 离开论道室
 */
router.post('/leave/:id', extractPlayerId, (req, res) => {
  try {
    const { id } = req.params;
    const playerId = req.playerId;

    const result = LundaoStorage.leaveRoom(id, playerId);

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    console.log(`[LundaoSystem] 玩家 ${playerId} 离开了论道室 ${id}`);

    res.json({
      success: true,
      data: {
        roomId: result.roomId,
        status: result.status,
        participantCount: result.participants.length,
        message: '已离开论道室'
      }
    });
  } catch (e) {
    console.error('[LundaoSystem] 离开论道室失败:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * POST /api/lundao/discuss/:id
 * 发表论道言论/进行辩论
 *
 * Body: { playerId, content }
 */
router.post('/discuss/:id', extractPlayerId, (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const playerId = req.playerId;

    // 验证发言内容
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: '请输入论道内容'
      });
    }

    if (content.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: '论道内容至少需要5个字符'
      });
    }

    if (content.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        error: '论道内容不能超过1000个字符'
      });
    }

    // 检查是否在论道室中
    const room = LundaoStorage.getRoom(id);
    if (!room) {
      return res.status(404).json({
        success: false,
        error: '论道室不存在'
      });
    }

    if (!room.participants.includes(playerId)) {
      return res.status(403).json({
        success: false,
        error: '你不在此论道室中'
      });
    }

    // 添加论道记录
    const result = LundaoStorage.addDiscussion(id, {
      playerId,
      content: content.trim()
    });

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    // 计算本次发言获得的感悟（延迟发放，论道结束后统一计算）
    const insightPerMessage = LUNDAO_CONFIG.INSIGHT_CONFIG.perDiscussion;
    const levelBonus = 1 + (room.level - 1) * LUNDAO_CONFIG.INSIGHT_CONFIG.levelBonus;
    const gain = Math.floor(insightPerMessage * levelBonus);

    console.log(`[LundaoSystem] 玩家 ${playerId} 在论道室 ${id} 发表言论，获得感悟 +${gain}`);

    res.json({
      success: true,
      data: {
        discussionId: result.discussions[result.discussions.length - 1].id,
        insightGain: gain,
        totalDiscussions: result.discussions.length,
        message: `论述发表成功，获得感悟 +${gain}`
      }
    });
  } catch (e) {
    console.error('[LundaoSystem] 发表论道言论失败:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * POST /api/lundao/end/:id
 * 结束论道
 */
router.post('/end/:id', extractPlayerId, (req, res) => {
  try {
    const { id } = req.params;
    const playerId = req.playerId;

    const result = LundaoStorage.endRoom(id, playerId);

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    // 计算并发放感悟奖励
    const insightGain = LundaoStorage.calculateInsight(result);

    // 尝试更新玩家的感悟值
    if (playerStorage) {
      result.participants.forEach(pId => {
        try {
          const playerKey = `player_${pId}`;
          const player = playerStorage.get(playerKey);
          if (player) {
            player.insight = (player.insight || 0) + insightGain;
            playerStorage.set(playerKey, player);
            console.log(`[LundaoSystem] 玩家 ${pId} 获得论道感悟 ${insightGain} 点`);
          }
        } catch (e) {
          // 忽略单个玩家更新失败
        }
      });
    }

    console.log(`[LundaoSystem] 论道室 ${id} 已结束，参与者获得感悟 +${insightGain} 点/人`);

    res.json({
      success: true,
      data: {
        roomId: result.roomId,
        status: 'finished',
        endTime: result.endTime,
        participantCount: result.participants.length,
        discussionCount: result.discussions.length,
        insightGain,
        message: `论道结束！每位参与者获得感悟 +${insightGain} 点`
      }
    });
  } catch (e) {
    console.error('[LundaoSystem] 结束论道失败:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * GET /api/lundao/my-rooms
 * 获取我的论道室
 */
router.get('/my-rooms', extractPlayerId, (req, res) => {
  try {
    const playerId = req.playerId;

    const rooms = LundaoStorage.getPlayerRooms(playerId);

    const formattedRooms = rooms.map(room => ({
      roomId: room.roomId,
      topic: room.topic,
      level: room.level,
      levelName: LUNDAO_CONFIG.LEVEL_NAMES[room.level] || '未知',
      status: room.status,
      participantCount: room.participants.length,
      isCreator: room.creatorId === playerId,
      discussionCount: room.discussions.length,
      createdAt: room.createdAt,
      startTime: room.startTime
    }));

    res.json({
      success: true,
      data: {
        rooms: formattedRooms,
        total: formattedRooms.length,
        activeCount: formattedRooms.filter(r => r.status !== 'finished').length
      }
    });
  } catch (e) {
    console.error('[LundaoSystem] 获取我的论道室失败:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * GET /api/lundao/history
 * 论道历史记录
 */
router.get('/history', extractPlayerId, (req, res) => {
  try {
    const playerId = req.playerId;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    const history = LundaoStorage.getHistory(playerId, limit);

    const formattedHistory = history.map(record => ({
      roomId: record.roomId,
      creatorId: record.creatorId,
      topic: record.topic,
      level: record.level,
      levelName: LUNDAO_CONFIG.LEVEL_NAMES[record.level] || '未知',
      participantCount: record.participantCount,
      discussionCount: record.discussionCount,
      insightGain: record.insightGain,
      startTime: record.startTime,
      endTime: record.endTime,
      duration: record.endTime && record.startTime
        ? Math.floor((record.endTime - record.startTime) / 1000 / 60)
        : null
    }));

    res.json({
      success: true,
      data: {
        history: formattedHistory,
        total: formattedHistory.length
      }
    });
  } catch (e) {
    console.error('[LundaoSystem] 获取论道历史失败:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * GET /api/lundao/topics
 * 获取可选论道主题列表
 */
router.get('/topics', (req, res) => {
  res.json({
    success: true,
    data: {
      topics: LUNDAO_CONFIG.TOPICS,
      levels: Object.entries(LUNDAO_CONFIG.LEVEL_NAMES).map(([level, name]) => ({
        level: parseInt(level, 10),
        name,
        maxParticipants: LUNDAO_CONFIG.MAX_PARTICIPANTS[level]
      }))
    }
  });
});

/**
 * GET /api/lundao/stats
 * 获取论道统计数据（排行榜）
 */
router.get('/stats', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    // 获取所有已完成的历史记录，统计玩家数据
    const allHistory = LundaoStorage.getHistory(null, 1000);

    const playerStats = {};
    allHistory.forEach(record => {
      if (record.participants) {
        record.participants.forEach(pId => {
          if (!playerStats[pId]) {
            playerStats[pId] = {
              playerId: pId,
              totalRooms: 0,
              totalInsights: 0,
              totalDiscussions: 0
            };
          }
          playerStats[pId].totalRooms++;
          playerStats[pId].totalInsights += record.insightGain || 0;
          playerStats[pId].totalDiscussions += record.discussionCount || 0;
        });
      }
    });

    const leaderboard = Object.values(playerStats)
      .sort((a, b) => b.totalInsights - a.totalInsights)
      .slice(0, limit)
      .map((stat, index) => ({
        rank: index + 1,
        ...stat
      }));

    res.json({
      success: true,
      data: {
        leaderboard,
        totalPlayers: Object.keys(playerStats).length
      }
    });
  } catch (e) {
    console.error('[LundaoSystem] 获取统计数据失败:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;
