/**
 * 好友系统 API - 完整实现
 * 处理好友申请、接受、拒绝、删除、黑名单等操作
 */
const express = require('express');
const path = require('path');
const router = express.Router();

const Logger = {
  info: (...args) => console.log('[friend]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[friend:error]', new Date().toISOString(), ...args),
  warn: (...args) => console.warn('[friend:warn]', new Date().toISOString(), ...args)
};

// DB path: server/backend/data/game.db
const DB_PATH = path.join(__dirname, '..', 'data', 'game.db');
let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  Logger.info('好友数据库连接成功');
} catch (err) {
  Logger.error('数据库连接失败:', err.message);
  db = null;
}

// ============ 数据库初始化 ============
function initFriendTables() {
  if (!db) return;
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS friendships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected','blocked')),
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(sender_id, receiver_id)
      );

      CREATE TABLE IF NOT EXISTS friend_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_id INTEGER NOT NULL,
        to_id INTEGER NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected')),
        message TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(from_id, to_id)
      );
    `);
    Logger.info('好友表初始化成功');
  } catch (err) {
    Logger.error('好友表初始化失败:', err.message);
  }
}

// ============ 辅助函数 ============
function getUserId(req) {
  return parseInt(req.userId || req.query.player_id || req.query.userId || req.body.player_id || req.body.userId || 1);
}

function getPlayerName(userId) {
  try {
    const user = db.prepare('SELECT nickname, username FROM Users WHERE id = ?').get(userId);
    return user ? (user.nickname || user.username || `玩家${userId}`) : `玩家${userId}`;
  } catch {
    return `玩家${userId}`;
  }
}

// ============ 路由 ============

// GET /api/friend - 好友列表
router.get('/', (req, res) => {
  if (!db) return res.status(500).json({ success: false, error: '数据库未连接' });
  try {
    const userId = getUserId(req);

    // 获取已接受的好友
    const friends = db.prepare(`
      SELECT f.id, f.sender_id, f.receiver_id, f.created_at,
             CASE WHEN f.sender_id = ? THEN f.receiver_id ELSE f.sender_id END as friend_id
      FROM friendships f
      WHERE (f.sender_id = ? OR f.receiver_id = ?) AND f.status = 'accepted'
    `).all(userId, userId, userId);

    const friendList = friends.map(f => {
      const fid = f.friend_id;
      const name = getPlayerName(fid);
      // 检查是否在线（简化处理：30分钟内有过操作的视为在线）
      let online = false;
      try {
        const lastActive = db.prepare('SELECT last_login FROM Users WHERE id = ?').get(fid);
        if (lastActive) {
          const lastTime = new Date(lastActive.last_login).getTime();
          online = (Date.now() - lastTime) < 30 * 60 * 1000;
        }
      } catch { /* ignore */ }

      return {
        id: f.id,
        friendId: fid,
        name,
        online,
        since: f.created_at
      };
    });

    res.json({
      success: true,
      data: {
        friends: friendList,
        friendCount: friendList.length,
        onlineCount: friendList.filter(f => f.online).length,
        maxFriends: 50
      }
    });
  } catch (err) {
    Logger.error('获取好友列表失败:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/friend/requests - 待处理的好友请求
router.get('/requests', (req, res) => {
  if (!db) return res.status(500).json({ success: false, error: '数据库未连接' });
  try {
    const userId = getUserId(req);

    // 收到的请求
    const received = db.prepare(`
      SELECT fr.id, fr.from_id, fr.message, fr.created_at,
             u.nickname, u.username
      FROM friend_requests fr
      LEFT JOIN Users u ON u.id = fr.from_id
      WHERE fr.to_id = ? AND fr.status = 'pending'
      ORDER BY fr.created_at DESC
    `).all(userId);

    // 发出的请求
    const sent = db.prepare(`
      SELECT fr.id, fr.to_id, fr.status, fr.created_at,
             u.nickname, u.username
      FROM friend_requests fr
      LEFT JOIN Users u ON u.id = fr.to_id
      WHERE fr.from_id = ?
      ORDER BY fr.created_at DESC
    `).all(userId);

    res.json({
      success: true,
      data: {
        received: received.map(r => ({
          requestId: r.id,
          fromId: r.from_id,
          fromName: r.nickname || r.username || `玩家${r.from_id}`,
          message: r.message || '',
          createdAt: r.created_at
        })),
        sent: sent.map(s => ({
          requestId: s.id,
          toId: s.to_id,
          toName: s.nickname || s.username || `玩家${s.to_id}`,
          status: s.status,
          createdAt: s.created_at
        }))
      }
    });
  } catch (err) {
    Logger.error('获取好友请求失败:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/friend/add - 发送好友请求
router.post('/add', (req, res) => {
  if (!db) return res.status(500).json({ success: false, error: '数据库未连接' });
  try {
    const userId = getUserId(req);
    const targetId = parseInt(req.body.targetId || req.body.target_id || req.body.friendId || req.body.friend_id);

    if (!targetId || targetId === userId) {
      return res.status(400).json({ success: false, error: '无效的目标玩家ID' });
    }

    // 检查目标玩家是否存在
    const target = db.prepare('SELECT id FROM Users WHERE id = ?').get(targetId);
    if (!target) {
      return res.status(404).json({ success: false, error: '目标玩家不存在' });
    }

    // 检查是否已是好友
    const existingFriendship = db.prepare(`
      SELECT id FROM friendships
      WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
    `).get(userId, targetId, targetId, userId);
    if (existingFriendship) {
      return res.status(400).json({ success: false, error: '已经是好友了' });
    }

    // 检查是否已有待处理请求
    const existingRequest = db.prepare(`
      SELECT id FROM friend_requests
      WHERE ((from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)) AND status = 'pending'
    `).get(userId, targetId, targetId, userId);
    if (existingRequest) {
      return res.status(400).json({ success: false, error: '已发送过好友请求，请等待对方处理' });
    }

    // 检查好友数量上限
    const friendCount = db.prepare(`
      SELECT COUNT(*) as cnt FROM friendships
      WHERE (sender_id = ? OR receiver_id = ?) AND status = 'accepted'
    `).get(userId, userId);
    if (friendCount.cnt >= 50) {
      return res.status(400).json({ success: false, error: '好友数量已达上限(50)' });
    }

    // 发送请求
    const message = req.body.message || '';
    db.prepare(`
      INSERT INTO friend_requests (from_id, to_id, message) VALUES (?, ?, ?)
    `).run(userId, targetId, message);

    res.json({
      success: true,
      message: '好友请求已发送',
      data: { targetId, targetName: getPlayerName(targetId) }
    });
  } catch (err) {
    Logger.error('发送好友请求失败:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/friend/accept - 接受好友请求
router.post('/accept', (req, res) => {
  if (!db) return res.status(500).json({ success: false, error: '数据库未连接' });
  try {
    const userId = getUserId(req);
    const requestId = parseInt(req.body.requestId || req.body.request_id);

    if (!requestId) {
      return res.status(400).json({ success: false, error: '缺少请求ID' });
    }

    // 查找请求
    const request = db.prepare(`
      SELECT * FROM friend_requests WHERE id = ? AND to_id = ? AND status = 'pending'
    `).get(requestId, userId);
    if (!request) {
      return res.status(404).json({ success: false, error: '好友请求不存在或已处理' });
    }

    // 更新请求状态
    db.prepare(`UPDATE friend_requests SET status = 'accepted' WHERE id = ?`).run(requestId);

    // 创建双向好友关系
    try {
      db.prepare(`
        INSERT INTO friendships (sender_id, receiver_id, status) VALUES (?, ?, 'accepted')
      `).run(request.from_id, request.to_id);
    } catch (e) {
      // 可能的重复插入，静默忽略
    }

    res.json({
      success: true,
      message: '已接受好友请求',
      data: { friendId: request.from_id, friendName: getPlayerName(request.from_id) }
    });
  } catch (err) {
    Logger.error('接受好友请求失败:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/friend/reject - 拒绝好友请求
router.post('/reject', (req, res) => {
  if (!db) return res.status(500).json({ success: false, error: '数据库未连接' });
  try {
    const userId = getUserId(req);
    const requestId = parseInt(req.body.requestId || req.body.request_id);

    if (!requestId) {
      return res.status(400).json({ success: false, error: '缺少请求ID' });
    }

    const result = db.prepare(`
      UPDATE friend_requests SET status = 'rejected'
      WHERE id = ? AND to_id = ? AND status = 'pending'
    `).run(requestId, userId);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: '好友请求不存在或已处理' });
    }

    res.json({ success: true, message: '已拒绝好友请求' });
  } catch (err) {
    Logger.error('拒绝好友请求失败:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/friend/:id - 删除好友
router.delete('/:id', (req, res) => {
  if (!db) return res.status(500).json({ success: false, error: '数据库未连接' });
  try {
    const userId = getUserId(req);
    const friendId = parseInt(req.params.id);

    if (!friendId) {
      return res.status(400).json({ success: false, error: '缺少好友ID' });
    }

    // 删除好友关系
    const result = db.prepare(`
      DELETE FROM friendships
      WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
      AND status = 'accepted'
    `).run(userId, friendId, friendId, userId);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: '好友关系不存在' });
    }

    res.json({ success: true, message: '已删除好友' });
  } catch (err) {
    Logger.error('删除好友失败:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/friend/block - 拉黑
router.post('/block', (req, res) => {
  if (!db) return res.status(500).json({ success: false, error: '数据库未连接' });
  try {
    const userId = getUserId(req);
    const targetId = parseInt(req.body.targetId || req.body.target_id);

    if (!targetId) {
      return res.status(400).json({ success: false, error: '缺少目标ID' });
    }

    // 删除好友关系
    db.prepare(`
      DELETE FROM friendships WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
    `).run(userId, targetId, targetId, userId);

    // 标记拉黑
    try {
      db.prepare(`
        INSERT INTO friendships (sender_id, receiver_id, status) VALUES (?, ?, 'blocked')
      `).run(userId, targetId);
    } catch (e) { /* ignore */ }

    res.json({ success: true, message: '已拉黑玩家' });
  } catch (err) {
    Logger.error('拉黑失败:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/friend/search - 搜索玩家
router.get('/search', (req, res) => {
  if (!db) return res.status(500).json({ success: false, error: '数据库未连接' });
  try {
    const keyword = req.query.keyword || '';
    if (!keyword || keyword.length < 1) {
      return res.json({ success: true, data: [] });
    }

    const players = db.prepare(`
      SELECT id, nickname, username FROM Users
      WHERE nickname LIKE ? OR username LIKE ? OR CAST(id AS TEXT) LIKE ?
      LIMIT 20
    `).all(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);

    res.json({
      success: true,
      data: players.map(p => ({
        playerId: p.id,
        name: p.nickname || p.username || `玩家${p.id}`
      }))
    });
  } catch (err) {
    Logger.error('搜索玩家失败:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/friend/stats - 好友统计
router.get('/stats', (req, res) => {
  if (!db) return res.status(500).json({ success: false, error: '数据库未连接' });
  try {
    const userId = getUserId(req);

    const friendCount = db.prepare(`
      SELECT COUNT(*) as cnt FROM friendships WHERE (sender_id = ? OR receiver_id = ?) AND status = 'accepted'
    `).get(userId, userId);

    const pendingReceived = db.prepare(`
      SELECT COUNT(*) as cnt FROM friend_requests WHERE to_id = ? AND status = 'pending'
    `).get(userId);

    const pendingSent = db.prepare(`
      SELECT COUNT(*) as cnt FROM friend_requests WHERE from_id = ? AND status = 'pending'
    `).get(userId);

    res.json({
      success: true,
      data: {
        friendCount: friendCount.cnt,
        pendingReceived: pendingReceived.cnt,
        pendingSent: pendingSent.cnt,
        maxFriends: 50
      }
    });
  } catch (err) {
    Logger.error('获取好友统计失败:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 初始化
initFriendTables();

module.exports = router;
