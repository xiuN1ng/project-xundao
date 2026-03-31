/**
 * 邮件系统 API - 完整实现
 * 邮件列表 / 读取 / 附件领取（真实奖励发放）
 */
const express = require('express');
const router = express.Router();
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');
let db;

try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  initDB();
} catch (e) {
  console.log('[mail] DB连接失败:', e.message);
  db = null;
}

function initDB() {
  if (!db) return;
  db.exec(`
    CREATE TABLE IF NOT EXISTS mail_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      sender TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      attachments TEXT DEFAULT '[]'
    );
    CREATE TABLE IF NOT EXISTS mail_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mail_id INTEGER NOT NULL,
      item_key TEXT NOT NULL,
      item_name TEXT NOT NULL,
      item_type TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      is_claimed INTEGER DEFAULT 0,
      claimed_at TEXT,
      FOREIGN KEY (mail_id) REFERENCES mail_messages(id)
    );
  `);
  // 初始化一封欢迎邮件（如果玩家还没有邮件）
  ensureWelcomeMail(1);
}

function ensureWelcomeMail(playerId) {
  if (!db) return;
  const existing = db.prepare('SELECT id FROM mail_messages WHERE player_id = ? AND sender = ?').get(playerId, '系统');
  if (existing) return;
  const attachments = JSON.stringify([{ id: 1, name: '灵石×100', key: 'spirit_stones', type: 'currency', quantity: 100 }]);
  db.prepare(`INSERT INTO mail_messages (player_id, sender, title, content, attachments) VALUES (?, ?, ?, ?, ?)`)
    .run(playerId, '系统', '欢迎来到寻道仙途', '亲爱的修士，欢迎加入寻道仙途！附件中有100灵石作为见面礼，请查收。', attachments);
}

// ============ 邮件解析奖励 ============

/**
 * 解析附件名称，发放奖励到玩家账户
 * 支持格式: "灵石×100", "生命丹×5", "铁矿石×10"
 */
function parseAndGrantAttachment(playerId, itemKey, itemName, itemType, quantity) {
  if (!db) return false;
  try {
    let granted = false;
    switch (itemKey) {
      case 'spirit_stones':
      case '灵石':
        db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(quantity, playerId);
        granted = true;
        break;
      case 'diamonds':
      case '钻石':
        db.prepare('UPDATE Users SET diamonds = diamonds + ? WHERE id = ?').run(quantity, playerId);
        granted = true;
        break;
      case 'exp':
      case '经验':
        // 经验暂时直接加到 Users.level 对应的经验条
        // 这里用简化处理：加到玩家的 spirit_stones 作为补偿
        db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(quantity, playerId);
        granted = true;
        break;
      default:
        // 尝试写入 player_items 表（道具）
        // itemKey 格式: item_xxx 或直接物品名
        const itemId = parseItemKey(itemKey);
        if (itemId > 0) {
          const existing = db.prepare('SELECT id, count FROM player_items WHERE player_id = ? AND item_id = ?').get(playerId, itemId);
          if (existing) {
            db.prepare('UPDATE player_items SET count = count + ? WHERE id = ?').run(quantity, existing.id);
          } else {
            db.prepare('INSERT INTO player_items (player_id, item_id, count) VALUES (?, ?, ?)').run(playerId, itemId, quantity);
          }
          granted = true;
        }
    }
    return granted;
  } catch (e) {
    console.log('[mail] 发放附件奖励失败:', e.message);
    return false;
  }
}

function parseItemKey(itemKey) {
  // 从 itemKey 提取物品 ID
  // item_1 → 1, item_2 → 2 等
  const match = String(itemKey).match(/^item_(\d+)$/);
  if (match) return parseInt(match[1]);
  // 尝试从常见物品名映射
  const itemMap = {
    'iron_ingot': 101, 'steel_ingot': 102, 'jade': 103,
    'fire_crystal': 104, 'thunder_crystal': 105, 'dragon_scale': 106,
    'life_pill': 201, 'attack_pill': 202, 'defense_pill': 203,
    'spirit_pill': 204, 'realm_pill': 205
  };
  return itemMap[itemKey] || 0;
}

// ============ 路由 ============

// GET /api/mail/ - 根路径，返回玩家邮件列表
router.get('/', (req, res) => {
  const userId = req.userId || req.query.player_id || req.query.userId || 1;
  if (!db) return res.json({ success: true, data: [], mails: [] });
  try {
    const mails = db.prepare('SELECT * FROM mail_messages WHERE player_id = ? ORDER BY created_at DESC').all(userId);
    const result = mails.map(m => ({
      id: m.id,
      sender: m.sender,
      title: m.title,
      content: m.content,
      time: m.created_at,
      read: !!m.is_read,
      attachments: JSON.parse(m.attachments || '[]')
    }));
    res.json({ success: true, data: result, mails: result });
  } catch (e) {
    console.log('[mail] 获取邮件列表失败:', e.message);
    res.json({ success: true, data: [], mails: [] });
  }
});

// GET /api/mail/list - 别名
router.get('/list', (req, res) => {
  const userId = req.userId || req.query.player_id || req.query.userId || 1;
  if (!db) return res.json([]);
  try {
    const mails = db.prepare('SELECT * FROM mail_messages WHERE player_id = ? ORDER BY created_at DESC').all(userId);
    res.json(mails.map(m => ({
      id: m.id,
      sender: m.sender,
      title: m.title,
      content: m.content,
      time: m.created_at,
      read: !!m.is_read,
      attachments: JSON.parse(m.attachments || '[]')
    })));
  } catch (e) {
    res.json([]);
  }
});

// GET /api/mail/info/:mailId - 单封邮件详情
router.get('/info/:mailId', (req, res) => {
  const userId = req.userId || req.query.player_id || req.query.userId || 1;
  const mailId = parseInt(req.params.mailId);
  if (!db) return res.status(500).json({ success: false, error: '数据库未连接' });
  try {
    const mail = db.prepare('SELECT * FROM mail_messages WHERE id = ? AND player_id = ?').get(mailId, userId);
    if (!mail) return res.status(404).json({ success: false, error: '邮件不存在' });
    res.json({
      success: true,
      data: {
        id: mail.id,
        sender: mail.sender,
        title: mail.title,
        content: mail.content,
        time: mail.created_at,
        read: !!mail.is_read,
        attachments: JSON.parse(mail.attachments || '[]')
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/mail/read - 标记已读
router.post('/read', (req, res) => {
  const userId = req.userId || req.body.player_id || req.body.userId || 1;
  const mailId = parseInt(req.body.mailId);
  if (!db) return res.status(500).json({ success: false, error: '数据库未连接' });
  if (!mailId) return res.status(400).json({ success: false, error: '缺少邮件ID' });
  try {
    db.prepare('UPDATE mail_messages SET is_read = 1 WHERE id = ? AND player_id = ?').run(mailId, userId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/mail/claim - 领取附件奖励（核心功能）
router.post('/claim', (req, res) => {
  const userId = req.userId || req.body.player_id || req.body.userId || 1;
  const mailId = parseInt(req.body.mailId);
  const attId = req.body.attId !== undefined ? parseInt(req.body.attId) : null;
  if (!db) return res.status(500).json({ success: false, error: '数据库未连接' });
  if (!mailId) return res.status(400).json({ success: false, error: '缺少邮件ID' });

  try {
    const mail = db.prepare('SELECT * FROM mail_messages WHERE id = ? AND player_id = ?').get(mailId, userId);
    if (!mail) return res.status(404).json({ success: false, error: '邮件不存在' });

    const attachments = JSON.parse(mail.attachments || '[]');
    let claimed = false;
    let claimedItem = null;

    if (attId !== null && attId !== undefined) {
      // 指定附件ID领取
      const att = attachments.find(a => a.id === attId);
      if (att && !att.claimed) {
        att.claimed = true;
        claimed = true;
        claimedItem = att;
        // 解析并发放奖励
        parseAndGrantAttachment(userId, att.key || att.name, att.name, att.type, att.quantity);
      }
    } else {
      // 领取所有未领取附件
      for (const att of attachments) {
        if (!att.claimed) {
          att.claimed = true;
          claimed = true;
          claimedItem = att;
          parseAndGrantAttachment(userId, att.key || att.name, att.name, att.type, att.quantity);
        }
      }
    }

    // 更新邮件附件状态
    if (claimed) {
      db.prepare('UPDATE mail_messages SET attachments = ? WHERE id = ?').run(JSON.stringify(attachments), mailId);
    }

    if (claimed) {
      res.json({
        success: true,
        message: `成功领取${claimedItem ? claimedItem.name : '附件'}奖励`,
        claimed: claimedItem ? {
          name: claimedItem.name,
          quantity: claimedItem.quantity
        } : null
      });
    } else {
      res.json({ success: false, error: '附件已领取或不存在' });
    }
  } catch (e) {
    console.log('[mail] 领取附件失败:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/mail/send - 发送邮件（系统用，支持多收件人）
router.post('/send', (req, res) => {
  if (!db) return res.status(500).json({ success: false, error: '数据库未连接' });
  const { player_ids, sender, title, content, attachments } = req.body;
  if (!player_ids || !title) return res.status(400).json({ success: false, error: '缺少必要参数' });
  try {
    const ids = Array.isArray(player_ids) ? player_ids : [player_ids];
    const attachmentsJson = JSON.stringify(attachments || []);
    const insert = db.prepare('INSERT INTO mail_messages (player_id, sender, title, content, attachments) VALUES (?, ?, ?, ?, ?)');
    for (const pid of ids) {
      insert.run(pid, sender || '系统', title, content || '', attachmentsJson);
    }
    res.json({ success: true, count: ids.length });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE /api/mail/:mailId - 删除邮件
router.delete('/:mailId', (req, res) => {
  const userId = req.userId || req.body.player_id || req.body.userId || 1;
  const mailId = parseInt(req.params.mailId);
  if (!db) return res.status(500).json({ success: false, error: '数据库未连接' });
  try {
    db.prepare('DELETE FROM mail_messages WHERE id = ? AND player_id = ?').run(mailId, userId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/mail/unread-count - 未读邮件数量
router.get('/unread-count', (req, res) => {
  const userId = req.userId || req.query.player_id || req.query.userId || 1;
  if (!db) return res.json({ success: true, count: 0 });
  try {
    const row = db.prepare('SELECT COUNT(*) as cnt FROM mail_messages WHERE player_id = ? AND is_read = 0').get(userId);
    res.json({ success: true, count: row ? row.cnt : 0 });
  } catch (e) {
    res.json({ success: true, count: 0 });
  }
});

module.exports = router;
