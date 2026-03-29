const express = require('express');
const router = express.Router();
const path = require('path');

// 模块级 DB 连接
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');
let db = null;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
} catch (e) {
  console.log('[chat] DB 连接失败:', e.message);
}

// 引入 ChatSystem
let chatSystem = null;
try {
  chatSystem = require('../server/systems/chat_system');
} catch (e) {
  console.log('[chat] ChatSystem 加载失败:', e.message);
}

// ========== 数据库初始化 ==========
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      sender_name TEXT NOT NULL,
      channel TEXT NOT NULL CHECK(channel IN ('world','sect','private','team','guild','system')),
      target_id INTEGER,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_mutes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL UNIQUE,
      muted_until DATETIME,
      reason TEXT
    )
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_chat_channel ON chat_messages(channel, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_chat_target ON chat_messages(target_id, channel);
  `);
  console.log('[chat] 数据库表初始化完成');
} catch (e) {
  console.log('[chat] 表初始化:', e.message);
}

// ========== 工具函数 ==========
function getShanghaiDate() {
  const d = new Date(Date.now() + 8 * 3600 * 1000);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function getDateStr() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

function extractUserId(req) {
  return req.userId ||
    parseInt(req.body?.userId || req.body?.player_id || req.query?.userId || req.query?.player_id || 1);
}

function getPlayerName(userId) {
  try {
    const user = db.prepare('SELECT nickname FROM Users WHERE id = ?').get(userId);
    return user ? user.nickname : `玩家${userId}`;
  } catch (e) {
    return `玩家${userId}`;
  }
}

function isMuted(userId) {
  try {
    const mute = db.prepare('SELECT muted_until FROM player_mutes WHERE player_id = ?').get(userId);
    if (!mute || !mute.muted_until) return false;
    const now = new Date();
    const until = new Date(mute.muted_until);
    return until > now;
  } catch (e) {
    return false;
  }
}

function filterContent(content) {
  if (!content) return '';
  // 简单过滤：移除明显的问题内容
  return content.trim().slice(0, 200);
}

// ========== 持久化消息到 DB ==========
function saveMessageToDb(senderId, senderName, channel, targetId, content) {
  try {
    db.prepare(`
      INSERT INTO chat_messages (sender_id, sender_name, channel, target_id, content, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(senderId, senderName, channel, targetId || null, content, getShanghaiDate());

    // 保留最近 2000 条世界消息
    if (channel === 'world') {
      db.prepare(`
        DELETE FROM chat_messages
        WHERE id IN (
          SELECT id FROM chat_messages WHERE channel = 'world'
          ORDER BY id DESC LIMIT 2000
        )
      `).run();
    }
  } catch (e) {
    console.log('[chat] 保存消息失败:', e.message);
  }
}

// ========== 路由 ==========

// GET /api/chat - 聊天概览（各频道未读数）
router.get('/', (req, res) => {
  const userId = extractUserId(req);
  try {
    // 获取各频道最近一条消息
    const channels = ['world', 'sect', 'private'];
    const overview = {};
    for (const ch of channels) {
      const last = db.prepare(`
        SELECT id, sender_id, sender_name, content, created_at
        FROM chat_messages WHERE channel = ?
        ORDER BY id DESC LIMIT 1
      `).get(ch);
      const count = db.prepare(`
        SELECT COUNT(*) as cnt FROM chat_messages WHERE channel = ?
      `).get(ch);
      overview[ch] = {
        lastMessage: last || null,
        totalCount: count ? count.cnt : 0
      };
    }
    res.json({ success: true, data: overview });
  } catch (e) {
    console.log('[chat] / 错误:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// GET /api/chat/list - 获取频道列表（GET / 别名）
router.get('/list', (req, res) => {
  const userId = extractUserId(req);
  try {
    const channels = ['world', 'sect', 'private'];
    const overview = {};
    for (const ch of channels) {
      const last = db.prepare(`
        SELECT id, sender_id, sender_name, content, created_at
        FROM chat_messages WHERE channel = ?
        ORDER BY id DESC LIMIT 1
      `).get(ch);
      const count = db.prepare(`
        SELECT COUNT(*) as cnt FROM chat_messages WHERE channel = ?
      `).get(ch);
      overview[ch] = {
        lastMessage: last || null,
        totalCount: count ? count.cnt : 0
      };
    }
    res.json({ success: true, data: overview });
  } catch (e) {
    console.log('[chat] /list 错误:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// GET /api/chat/history - 获取聊天历史
// ?channel=world&limit=50&before=123456
router.get('/history', (req, res) => {
  const userId = extractUserId(req);
  const { channel = 'world', limit = 50, before } = req.query;
  const safeLimit = Math.min(parseInt(limit) || 50, 100);

  if (isMuted(userId)) {
    return res.json({ success: false, message: '你已被禁言' });
  }

  try {
    let rows;
    if (before) {
      rows = db.prepare(`
        SELECT id, sender_id, sender_name, content, created_at
        FROM chat_messages
        WHERE channel = ? AND id < ?
        ORDER BY id DESC LIMIT ?
      `).all(channel, before, safeLimit);
    } else {
      rows = db.prepare(`
        SELECT id, sender_id, sender_name, content, created_at
        FROM chat_messages
        WHERE channel = ?
        ORDER BY id DESC LIMIT ?
      `).all(channel, safeLimit);
    }
    // 倒序返回（从旧到新）
    res.json({ success: true, messages: rows.reverse(), channel });
  } catch (e) {
    console.log('[chat] history 错误:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// GET /api/chat/sect - 获取宗门聊天历史
router.get('/sect', (req, res) => {
  const userId = extractUserId(req);
  const { limit = 50, before } = req.query;
  const safeLimit = Math.min(parseInt(limit) || 50, 100);

  try {
    // 获取玩家宗门
    const user = db.prepare('SELECT sectId FROM Users WHERE id = ?').get(userId);
    const sectId = user?.sectId;

    if (!sectId) {
      return res.json({ success: false, message: '你还未加入宗门' });
    }

    let rows;
    if (before) {
      rows = db.prepare(`
        SELECT id, sender_id, sender_name, content, created_at
        FROM chat_messages
        WHERE channel = 'sect' AND target_id = ? AND id < ?
        ORDER BY id DESC LIMIT ?
      `).all(sectId, before, safeLimit);
    } else {
      rows = db.prepare(`
        SELECT id, sender_id, sender_name, content, created_at
        FROM chat_messages
        WHERE channel = 'sect' AND target_id = ?
        ORDER BY id DESC LIMIT ?
      `).all(sectId, safeLimit);
    }
    res.json({ success: true, messages: rows.reverse(), sectId });
  } catch (e) {
    console.log('[chat] sect 错误:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// GET /api/chat/private - 获取私聊会话列表
router.get('/private', (req, res) => {
  const userId = extractUserId(req);

  try {
    // 获取与该玩家的所有私聊会话（最近一条消息）
    const sessions = db.prepare(`
      SELECT
        CASE WHEN sender_id = ? THEN target_id ELSE sender_id END as partner_id,
        sender_name as last_sender,
        content as last_message,
        created_at as last_time,
        (SELECT COUNT(*) FROM chat_messages
         WHERE ((sender_id = ? AND target_id = chat_messages.target_id) OR (sender_id = chat_messages.target_id AND target_id = ?))
           AND channel = 'private' AND created_at > COALESCE(
             (SELECT MAX(created_at) FROM chat_messages cm2
              WHERE cm2.channel = 'private'
                AND ((cm2.sender_id = ? AND cm2.target_id = chat_messages.target_id) OR (cm2.sender_id = chat_messages.target_id AND cm2.target_id = ?))
                AND cm2.id < chat_messages.id), '1970-01-01')) as unread
      FROM chat_messages
      WHERE channel = 'private' AND (sender_id = ? OR target_id = ?)
      GROUP BY partner_id
      ORDER BY last_time DESC
      LIMIT 20
    `).all(userId, userId, userId, userId, userId, userId, userId);

    // 获取每个会话伙伴的昵称
    const result = sessions.map(s => {
      try {
        const partner = db.prepare('SELECT nickname FROM Users WHERE id = ?').get(s.partner_id);
        return {
          partnerId: s.partner_id,
          partnerName: partner?.nickname || `玩家${s.partner_id}`,
          lastMessage: s.last_message,
          lastSender: s.last_sender,
          lastTime: s.last_time,
          unreadCount: s.unread || 0
        };
      } catch (e) {
        return { partnerId: s.partner_id, partnerName: `玩家${s.partner_id}`, lastMessage: s.last_message, lastSender: s.last_sender, lastTime: s.last_time, unreadCount: 0 };
      }
    });

    res.json({ success: true, sessions: result });
  } catch (e) {
    console.log('[chat] private 错误:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// GET /api/chat/private/:partnerId - 获取与某玩家的私聊历史
router.get('/private/:partnerId', (req, res) => {
  const userId = extractUserId(req);
  const partnerId = parseInt(req.params.partnerId);
  const { limit = 50, before } = req.query;
  const safeLimit = Math.min(parseInt(limit) || 50, 100);

  if (isMuted(userId)) {
    return res.json({ success: false, message: '你已被禁言' });
  }

  try {
    let rows;
    if (before) {
      rows = db.prepare(`
        SELECT id, sender_id, sender_name, content, created_at
        FROM chat_messages
        WHERE channel = 'private' AND ((sender_id = ? AND target_id = ?) OR (sender_id = ? AND target_id = ?)) AND id < ?
        ORDER BY id DESC LIMIT ?
      `).all(userId, partnerId, partnerId, userId, before, safeLimit);
    } else {
      rows = db.prepare(`
        SELECT id, sender_id, sender_name, content, created_at
        FROM chat_messages
        WHERE channel = 'private' AND ((sender_id = ? AND target_id = ?) OR (sender_id = ? AND target_id = ?))
        ORDER BY id DESC LIMIT ?
      `).all(userId, partnerId, partnerId, userId, safeLimit);
    }
    res.json({ success: true, messages: rows.reverse(), partnerId });
  } catch (e) {
    console.log('[chat] private/:partnerId 错误:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// POST /api/chat/send - 发送聊天消息
// { channel, content, targetId? }
router.post('/send', (req, res) => {
  const userId = extractUserId(req);
  const { channel = 'world', content, targetId } = req.body;

  if (!content || content.trim().length === 0) {
    return res.json({ success: false, message: '消息内容不能为空' });
  }

  if (isMuted(userId)) {
    return res.json({ success: false, message: '你已被禁言，禁言结束前无法发送消息' });
  }

  const playerName = getPlayerName(userId);
  const filteredContent = filterContent(content);

  try {
    // 世界频道消耗灵石
    if (channel === 'world') {
      const player = db.prepare('SELECT lingshi FROM Users WHERE id = ?').get(userId);
      if (!player || player.lingshi < 10) {
        return res.json({ success: false, message: '世界频道需要10灵石，当前灵石不足' });
      }
      db.prepare('UPDATE Users SET lingshi = lingshi - 10 WHERE id = ?').run(userId);
    }

    // 宗门频道检查宗门
    if (channel === 'sect') {
      const user = db.prepare('SELECT sectId FROM Users WHERE id = ?').get(userId);
      if (!user || !user.sectId) {
        return res.json({ success: false, message: '你还未加入宗门，无法发送宗门消息' });
      }
    }

    // 私聊检查目标
    if (channel === 'private') {
      if (!targetId) {
        return res.json({ success: false, message: '私聊需要指定目标玩家' });
      }
      if (targetId === userId) {
        return res.json({ success: false, message: '不能给自己发私信' });
      }
    }

    // 保存到 DB
    saveMessageToDb(userId, playerName, channel, targetId, filteredContent);

    // 如果 ChatSystem 可用，同步到内存
    if (chatSystem) {
      if (channel === 'world') {
        chatSystem.sendWorldMessage(userId, playerName, filteredContent);
      } else if (channel === 'sect') {
        const user = db.prepare('SELECT sectId FROM Users WHERE id = ?').get(userId);
        chatSystem.sendSectMessage(userId, playerName, user?.sectId, filteredContent);
      } else if (channel === 'private') {
        chatSystem.sendPrivateMessage(userId, playerName, targetId, getPlayerName(targetId), filteredContent);
      }
    }

    res.json({
      success: true,
      message: '发送成功',
      cost: channel === 'world' ? 10 : 0,
      data: {
        senderId: userId,
        senderName: playerName,
        content: filteredContent,
        channel,
        timestamp: getShanghaiDate()
      }
    });
  } catch (e) {
    console.log('[chat] send 错误:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// GET /api/chat/online - 在线玩家列表
router.get('/online', (req, res) => {
  const userId = extractUserId(req);
  try {
    // 简单实现：返回最近的活跃玩家
    const players = db.prepare(`
      SELECT id, nickname, level, realm, combat_power
      FROM Users
      WHERE id != ?
      ORDER BY last_logout DESC
      LIMIT 50
    `).all(userId);
    res.json({ success: true, players });
  } catch (e) {
    console.log('[chat] online 错误:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// POST /api/chat/mute - 禁言玩家（仅管理员）
router.post('/mute', (req, res) => {
  const userId = extractUserId(req);
  const { targetId, minutes = 60, reason } = req.body;

  // 简化权限检查：userId=1 为管理员
  if (userId !== 1) {
    return res.json({ success: false, message: '无权限' });
  }

  try {
    const mutedUntil = new Date(Date.now() + (parseInt(minutes) || 60) * 60000).toISOString();
    db.prepare(`
      INSERT OR REPLACE INTO player_mutes (player_id, muted_until, reason)
      VALUES (?, ?, ?)
    `).run(targetId, mutedUntil, reason || '违反聊天规则');
    res.json({ success: true, message: `已禁言玩家 ${targetId} ${minutes} 分钟` });
  } catch (e) {
    console.log('[chat] mute 错误:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// GET /api/chat/cooldown - 查询发送冷却状态
router.get('/cooldown', (req, res) => {
  const userId = extractUserId(req);
  const { channel = 'world' } = req.query;

  if (chatSystem) {
    const status = chatSystem.checkCooldown(userId, channel);
    return res.json({ success: true, ...status, channel });
  }
  res.json({ success: true, allowed: true, remaining: 0, channel });
});

module.exports = router;
