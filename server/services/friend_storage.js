/**
 * 好友系统存储层
 * 处理好友关系和好友申请的数据持久化
 */

let db;
try {
  // 尝试从server.js导入db实例
  const server = require('../../server');
  db = server.db || server;
} catch {
  // 如果导入失败，尝试直接加载
  try {
    const serverModule = require('../../server');
    db = serverModule.db || serverModule;
  } catch {
    // 如果仍然失败，使用独立的数据库连接
    const Database = require('better-sqlite3');
    const path = require('path');
    // 尝试多个可能的路径
    const possiblePaths = [
      path.join(__dirname, '..', '..', 'data', 'game.db'),
      path.join(__dirname, '..', 'data', 'game.db'),
      path.join(process.cwd(), 'data', 'game.db')
    ];
    
    for (const dbPath of possiblePaths) {
      try {
        db = new Database(dbPath);
        console.log('好友系统数据库连接成功:', dbPath);
        break;
      } catch {
        // 继续尝试下一个路径
      }
    }
  }
}

// 好友系统存储
const friendStorage = {
  // 获取玩家好友列表
  getFriends(playerId) {
    const friends = db.prepare(`
      SELECT 
        pf.id,
        pf.friend_id as friendId,
        p.username as friendName,
        p.level as friendLevel,
        p.realm_level as friendRealm,
        p.online_status as onlineStatus,
        pf.added_at as addedAt,
        pf.last_interact as lastInteract
      FROM player_friends pf
      JOIN player p ON pf.friend_id = p.id
      WHERE pf.player_id = ?
      ORDER BY pf.last_interact DESC
    `).all(playerId);
    
    return friends;
  },

  // 获取好友详情
  getFriendById(playerId, friendId) {
    const friend = db.prepare(`
      SELECT 
        pf.id,
        pf.friend_id as friendId,
        p.username as friendName,
        p.level as friendLevel,
        p.realm_level as friendRealm,
        p.online_status as onlineStatus,
        pf.added_at as addedAt,
        pf.last_interact as lastInteract
      FROM player_friends pf
      JOIN player p ON pf.friend_id = p.id
      WHERE pf.player_id = ? AND pf.friend_id = ?
    `).get(playerId, friendId);
    
    return friend;
  },

  // 检查是否为好友
  isFriend(playerId, friendId) {
    const row = db.prepare(
      'SELECT id FROM player_friends WHERE player_id = ? AND friend_id = ?'
    ).get(playerId, friendId);
    return !!row;
  },

  // 添加好友
  addFriend(playerId, friendId) {
    const now = Date.now();
    db.prepare(`
      INSERT INTO player_friends (player_id, friend_id, added_at, last_interact)
      VALUES (?, ?, ?, ?)
    `).run(playerId, friendId, now, now);
    
    // 双方都添加好友关系
    db.prepare(`
      INSERT INTO player_friends (player_id, friend_id, added_at, last_interact)
      VALUES (?, ?, ?, ?)
    `).run(friendId, playerId, now, now);
    
    // 增加友好度
    this.updateFriendship(playerId, friendId, 50);
    this.updateFriendship(friendId, playerId, 50);
    
    return true;
  },

  // 删除好友
  removeFriend(playerId, friendId) {
    db.prepare(
      'DELETE FROM player_friends WHERE player_id = ? AND friend_id = ?'
    ).run(playerId, friendId);
    
    // 同时删除对方的好友关系
    db.prepare(
      'DELETE FROM player_friends WHERE player_id = ? AND friend_id = ?'
    ).run(friendId, playerId);
    
    return true;
  },

  // 更新友好度
  updateFriendship(playerId, targetId, amount) {
    const player = db.prepare('SELECT friendship FROM player WHERE id = ?').get(playerId);
    if (player) {
      const newFriendship = Math.max(0, (player.friendship || 0) + amount);
      db.prepare('UPDATE player SET friendship = ? WHERE id = ?').run(newFriendship, playerId);
    }
  },

  // 获取黑名单列表
  getBlockedList(playerId) {
    const blocked = db.prepare(`
      SELECT 
        pb.id,
        pb.blocked_id as blockedId,
        p.username as blockedName,
        p.level as blockedLevel,
        pb.blocked_at as blockedAt
      FROM player_blocked pb
      JOIN player p ON pb.blocked_id = p.id
      WHERE pb.player_id = ?
      ORDER BY pb.blocked_at DESC
    `).all(playerId);
    
    return blocked;
  },

  // 拉黑玩家
  blockPlayer(playerId, blockedId) {
    const now = Date.now();
    db.prepare(`
      INSERT OR IGNORE INTO player_blocked (player_id, blocked_id, blocked_at)
      VALUES (?, ?, ?)
    `).run(playerId, blockedId, now);
    
    // 如果之前是好友，删除好友关系
    db.prepare(
      'DELETE FROM player_friends WHERE player_id = ? AND friend_id = ?'
    ).run(playerId, blockedId);
    
    return true;
  },

  // 取消拉黑
  unblockPlayer(playerId, blockedId) {
    db.prepare(
      'DELETE FROM player_blocked WHERE player_id = ? AND blocked_id = ?'
    ).run(playerId, blockedId);
    
    return true;
  },

  // 检查是否被拉黑
  isBlocked(blockerId, blockedId) {
    const row = db.prepare(
      'SELECT id FROM player_blocked WHERE player_id = ? AND blocked_id = ?'
    ).get(blockerId, blockedId);
    return !!row;
  },

  // 发送好友申请
  sendFriendRequest(playerId, targetId, message = '') {
    // 检查是否已经是好友
    if (this.isFriend(playerId, targetId)) {
      return { success: false, error: '对方已经是好友' };
    }
    
    // 检查是否被拉黑
    if (this.isBlocked(targetId, playerId)) {
      return { success: false, error: '对方已将您拉黑，无法发送好友申请' };
    }
    
    // 检查是否在黑名单中
    if (this.isBlocked(playerId, targetId)) {
      return { success: false, error: '您已将对方拉黑，无法发送好友申请' };
    }
    
    // 检查是否已有待处理的申请
    const existing = db.prepare(`
      SELECT id FROM friend_applications 
      WHERE applicant_id = ? AND target_id = ? AND status = 'pending'
    `).get(playerId, targetId);
    
    if (existing) {
      return { success: false, error: '已有待处理的好友申请' };
    }
    
    const now = Date.now();
    db.prepare(`
      INSERT INTO friend_applications (applicant_id, target_id, message, status, created_at)
      VALUES (?, ?, ?, 'pending', ?)
    `).run(playerId, targetId, message, now);
    
    return { success: true, message: '好友申请已发送' };
  },

  // 获取发出的好友申请列表
  getSentRequests(playerId) {
    const requests = db.prepare(`
      SELECT 
        fa.id,
        fa.applicant_id as applicantId,
        p.username as applicantName,
        p.level as applicantLevel,
        p.realm_level as applicantRealm,
        fa.message,
        fa.status,
        fa.created_at as createdAt,
        fa.responded_at as respondedAt
      FROM friend_applications fa
      JOIN player p ON fa.applicant_id = p.id
      WHERE fa.applicant_id = ?
      ORDER BY fa.created_at DESC
    `).all(playerId);
    
    return requests;
  },

  // 获取收到的好友申请列表
  getReceivedRequests(playerId) {
    const requests = db.prepare(`
      SELECT 
        fa.id,
        fa.applicant_id as applicantId,
        p.username as applicantName,
        p.level as applicantLevel,
        p.realm_level as applicantRealm,
        fa.message,
        fa.status,
        fa.created_at as createdAt,
        fa.responded_at as respondedAt
      FROM friend_applications fa
      JOIN player p ON fa.applicant_id = p.id
      WHERE fa.target_id = ? AND fa.status = 'pending'
      ORDER BY fa.created_at DESC
    `).all(playerId);
    
    return requests;
  },

  // 接受好友申请
  acceptFriendRequest(playerId, applicantId) {
    const request = db.prepare(`
      SELECT id FROM friend_applications 
      WHERE applicant_id = ? AND target_id = ? AND status = 'pending'
    `).get(applicantId, playerId);
    
    if (!request) {
      return { success: false, error: '好友申请不存在或已被处理' };
    }
    
    // 更新申请状态
    db.prepare(`
      UPDATE friend_applications 
      SET status = 'accepted', responded_at = ?
      WHERE applicant_id = ? AND target_id = ?
    `).run(Date.now(), applicantId, playerId);
    
    // 添加好友关系
    this.addFriend(playerId, applicantId);
    
    return { success: true, message: '已接受好友申请' };
  },

  // 拒绝好友申请
  rejectFriendRequest(playerId, applicantId) {
    const request = db.prepare(`
      SELECT id FROM friend_applications 
      WHERE applicant_id = ? AND target_id = ? AND status = 'pending'
    `).get(applicantId, playerId);
    
    if (!request) {
      return { success: false, error: '好友申请不存在或已被处理' };
    }
    
    // 更新申请状态
    db.prepare(`
      UPDATE friend_applications 
      SET status = 'rejected', responded_at = ?
      WHERE applicant_id = ? AND target_id = ?
    `).run(Date.now(), applicantId, playerId);
    
    return { success: true, message: '已拒绝好友申请' };
  },

  // 撤回好友申请
  withdrawFriendRequest(playerId, targetId) {
    const result = db.prepare(`
      DELETE FROM friend_applications 
      WHERE applicant_id = ? AND target_id = ? AND status = 'pending'
    `).run(playerId, targetId);
    
    if (result.changes === 0) {
      return { success: false, error: '申请不存在或已被处理' };
    }
    
    return { success: true, message: '已撤回好友申请' };
  },

  // 搜索玩家
  searchPlayers(keyword, limit = 10) {
    const players = db.prepare(`
      SELECT 
        id,
        username as name,
        level,
        realm_level as realm,
        online_status as onlineStatus
      FROM player 
      WHERE username LIKE ?
      LIMIT ?
    `).all(`%${keyword}%`, limit);
    
    return players;
  },

  // 获取玩家信息（用于展示）
  getPlayerInfo(playerId) {
    const player = db.prepare(`
      SELECT 
        id,
        username as name,
        level,
        realm_level as realm,
        online_status as onlineStatus,
        friendship
      FROM player 
      WHERE id = ?
    `).get(playerId);
    
    return player;
  },

  // 获取好友数量
  getFriendCount(playerId) {
    const result = db.prepare(
      'SELECT COUNT(*) as count FROM player_friends WHERE player_id = ?'
    ).get(playerId);
    return result.count;
  },

  // 获取在线好友数量
  getOnlineFriendCount(playerId) {
    const result = db.prepare(`
      SELECT COUNT(*) as count 
      FROM player_friends pf
      JOIN player p ON pf.friend_id = p.id
      WHERE pf.player_id = ? AND p.online_status = 1
    `).get(playerId);
    return result.count;
  }
};

module.exports = { friendStorage };
