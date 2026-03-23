/**
 * 好友系统 API
 * 处理好友申请、接受、拒绝、删除等操作
 */

const express = require('express');
const router = express.Router();

// 延迟加载依赖
let friendStorage, playerStorage;

function loadDependencies() {
  if (!friendStorage) {
    try {
      const storage = require('./friend_storage');
      friendStorage = storage.friendStorage;
    } catch (e) {
      console.error('加载friend_storage失败:', e.message);
    }
  }
  
  if (!playerStorage) {
    try {
      const storage = require('./storage');
      playerStorage = storage.playerStorage;
    } catch (e) {
      console.error('加载storage失败:', e.message);
    }
  }
  
  return friendStorage && playerStorage;
}

// 中间件：加载依赖
router.use((req, res, next) => {
  loadDependencies();
  next();
});

// ==================== 好友列表 API ====================

// 获取好友列表 (GET /api/friends)
router.get('/', (req, res) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID (player_id)' });
    }
    
    const friends = friendStorage.getFriends(player_id);
    const friendCount = friendStorage.getFriendCount(player_id);
    const onlineCount = friendStorage.getOnlineFriendCount(player_id);
    
    res.json({
      success: true,
      data: {
        friends,
        friendCount,
        onlineCount,
        maxFriends: 50
      }
    });
  } catch (error) {
    console.error('获取好友列表失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取好友列表 (兼容 /list)
router.get('/list', (req, res) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID (player_id)' });
    }
    
    const friends = friendStorage.getFriends(player_id);
    const friendCount = friendStorage.getFriendCount(player_id);
    const onlineCount = friendStorage.getOnlineFriendCount(player_id);
    
    res.json({
      success: true,
      data: {
        friends,
        friendCount,
        onlineCount,
        maxFriends: 50
      }
    });
  } catch (error) {
    console.error('获取好友列表失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取好友详情
router.get('/detail', (req, res) => {
  try {
    const { player_id, friend_id } = req.query;
    
    if (!player_id || !friend_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const friend = friendStorage.getFriendById(player_id, friend_id);
    
    if (!friend) {
      return res.status(404).json({ success: false, error: '好友不存在' });
    }
    
    res.json({
      success: true,
      data: friend
    });
  } catch (error) {
    console.error('获取好友详情失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== 好友申请 API ====================

// 发送好友申请 (POST /api/friends/apply)
router.post('/apply', (req, res) => {
  try {
    const { player_id, target_id, message } = req.body;
    
    if (!player_id || !target_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数 (player_id, target_id)' });
    }
    
    if (player_id === target_id) {
      return res.status(400).json({ success: false, error: '不能添加自己为好友' });
    }
    
    // 检查目标玩家是否存在
    const targetPlayer = playerStorage.getOrCreatePlayer(target_id);
    if (!targetPlayer) {
      return res.status(404).json({ success: false, error: '目标玩家不存在' });
    }
    
    const result = friendStorage.sendFriendRequest(player_id, target_id, message || '');
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('发送好友申请失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 发送好友申请 (兼容 /request)
router.post('/request', (req, res) => {
  try {
    const { player_id, target_id, message } = req.body;
    
    if (!player_id || !target_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数 (player_id, target_id)' });
    }
    
    if (player_id === target_id) {
      return res.status(400).json({ success: false, error: '不能添加自己为好友' });
    }
    
    // 检查目标玩家是否存在
    const targetPlayer = playerStorage.getOrCreatePlayer(target_id);
    if (!targetPlayer) {
      return res.status(404).json({ success: false, error: '目标玩家不存在' });
    }
    
    const result = friendStorage.sendFriendRequest(player_id, target_id, message || '');
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('发送好友申请失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取发出的好友申请列表
router.get('/request/sent', (req, res) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID (player_id)' });
    }
    
    const requests = friendStorage.getSentRequests(player_id);
    
    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('获取发出的好友申请失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取收到的好友申请列表 (GET /api/friends/requests)
router.get('/requests', (req, res) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID (player_id)' });
    }
    
    const requests = friendStorage.getReceivedRequests(player_id);
    
    res.json({
      success: true,
      data: requests,
      count: requests.length
    });
  } catch (error) {
    console.error('获取收到的好友申请失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取收到的好友申请列表 (兼容 /request/received)
router.get('/request/received', (req, res) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID (player_id)' });
    }
    
    const requests = friendStorage.getReceivedRequests(player_id);
    
    res.json({
      success: true,
      data: requests,
      count: requests.length
    });
  } catch (error) {
    console.error('获取收到的好友申请失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 撤回好友申请
router.post('/request/withdraw', (req, res) => {
  try {
    const { player_id, target_id } = req.body;
    
    if (!player_id || !target_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const result = friendStorage.withdrawFriendRequest(player_id, target_id);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('撤回好友申请失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== 好友申请处理 API ====================

// 接受好友申请
router.post('/accept', (req, res) => {
  try {
    const { player_id, applicant_id } = req.body;
    
    if (!player_id || !applicant_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数 (player_id, applicant_id)' });
    }
    
    // 检查好友数量上限
    const friendCount = friendStorage.getFriendCount(player_id);
    if (friendCount >= 50) {
      return res.status(400).json({ success: false, error: '好友数量已达上限 (50)' });
    }
    
    const targetFriendCount = friendStorage.getFriendCount(applicant_id);
    if (targetFriendCount >= 50) {
      return res.status(400).json({ success: false, error: '对方好友数量已达上限' });
    }
    
    const result = friendStorage.acceptFriendRequest(player_id, applicant_id);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('接受好友申请失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 拒绝好友申请
router.post('/reject', (req, res) => {
  try {
    const { player_id, applicant_id } = req.body;
    
    if (!player_id || !applicant_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数 (player_id, applicant_id)' });
    }
    
    const result = friendStorage.rejectFriendRequest(player_id, applicant_id);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('拒绝好友申请失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== 好友操作 API ====================

// 删除好友 (DELETE /api/friends/:id)
router.delete('/:id', (req, res) => {
  try {
    const player_id = req.body.player_id;
    const friend_id = parseInt(req.params.id);
    
    if (!player_id || !friend_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数 (player_id, friend_id)' });
    }
    
    // 检查是否为好友
    if (!friendStorage.isFriend(player_id, friend_id)) {
      return res.status(400).json({ success: false, error: '对方不是您的好友' });
    }
    
    friendStorage.removeFriend(player_id, friend_id);
    
    res.json({
      success: true,
      message: '已删除好友'
    });
  } catch (error) {
    console.error('删除好友失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除好友 (兼容 /remove)
router.post('/remove', (req, res) => {
  try {
    const { player_id, friend_id } = req.body;
    
    if (!player_id || !friend_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数 (player_id, friend_id)' });
    }
    
    // 检查是否为好友
    if (!friendStorage.isFriend(player_id, friend_id)) {
      return res.status(400).json({ success: false, error: '对方不是您的好友' });
    }
    
    friendStorage.removeFriend(player_id, friend_id);
    
    res.json({
      success: true,
      message: '已删除好友'
    });
  } catch (error) {
    console.error('删除好友失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== 黑名单 API ====================

// 获取黑名单列表
router.get('/blocked', (req, res) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID (player_id)' });
    }
    
    const blocked = friendStorage.getBlockedList(player_id);
    
    res.json({
      success: true,
      data: blocked,
      count: blocked.length
    });
  } catch (error) {
    console.error('获取黑名单失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 拉黑玩家
router.post('/block', (req, res) => {
  try {
    const { player_id, blocked_id } = req.body;
    
    if (!player_id || !blocked_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数 (player_id, blocked_id)' });
    }
    
    if (player_id === blocked_id) {
      return res.status(400).json({ success: false, error: '不能拉黑自己' });
    }
    
    // 检查是否已在黑名单
    if (friendStorage.isBlocked(player_id, blocked_id)) {
      return res.status(400).json({ success: false, error: '玩家已在黑名单中' });
    }
    
    friendStorage.blockPlayer(player_id, blocked_id);
    
    res.json({
      success: true,
      message: '已将玩家加入黑名单'
    });
  } catch (error) {
    console.error('拉黑玩家失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 取消拉黑
router.post('/unblock', (req, res) => {
  try {
    const { player_id, blocked_id } = req.body;
    
    if (!player_id || !blocked_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    // 检查是否在黑名单
    if (!friendStorage.isBlocked(player_id, blocked_id)) {
      return res.status(400).json({ success: false, error: '玩家不在黑名单中' });
    }
    
    friendStorage.unblockPlayer(player_id, blocked_id);
    
    res.json({
      success: true,
      message: '已取消拉黑'
    });
  } catch (error) {
    console.error('取消拉黑失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== 搜索 API ====================

// 搜索玩家
router.get('/search', (req, res) => {
  try {
    const { keyword, limit } = req.query;
    
    if (!keyword || keyword.length < 1) {
      return res.status(400).json({ success: false, error: '请输入搜索关键词' });
    }
    
    const players = friendStorage.searchPlayers(keyword, parseInt(limit) || 10);
    
    res.json({
      success: true,
      data: players,
      count: players.length
    });
  } catch (error) {
    console.error('搜索玩家失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取玩家信息
router.get('/player/:id', (req, res) => {
  try {
    const playerId = parseInt(req.params.id);
    
    if (!playerId) {
      return res.status(400).json({ success: false, error: '无效的玩家ID' });
    }
    
    const player = friendStorage.getPlayerInfo(playerId);
    
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }
    
    res.json({
      success: true,
      data: player
    });
  } catch (error) {
    console.error('获取玩家信息失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== 好友统计 API ====================

// 获取好友统计信息
router.get('/stats', (req, res) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID (player_id)' });
    }
    
    const friendCount = friendStorage.getFriendCount(player_id);
    const onlineCount = friendStorage.getOnlineFriendCount(player_id);
    const blockedCount = friendStorage.getBlockedList(player_id).length;
    const receivedRequests = friendStorage.getReceivedRequests(player_id).length;
    const sentRequests = friendStorage.getSentRequests(player_id).length;
    
    res.json({
      success: true,
      data: {
        friendCount,
        onlineCount,
        blockedCount,
        pendingReceived: receivedRequests,
        pendingSent: sentRequests,
        maxFriends: 50,
        maxBlocked: 20
      }
    });
  } catch (error) {
    console.error('获取好友统计失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
