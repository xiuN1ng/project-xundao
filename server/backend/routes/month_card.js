/**
 * 月卡系统 - month_card.js
 * 灵石月卡 + 尊享月卡，每日领取灵石，特权加成
 *
 * 端点:
 * GET  /month-card/status     - 获取月卡状态
 * GET  /month-card/info       - 获取月卡配置信息
 * POST /month-card/claim      - 领取每日灵石
 * POST /month-card/purchase   - 购买月卡（通过现有shop系统）
 */

// 已复用 shop.js 中的 player_monthly_cards 表
// 这里提供独立API供前端调用

const express = require('express');
const router = express.Router();
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db = null;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  initDB();
} catch (e) {
  console.log('[month_card] DB连接失败:', e.message);
}

// ============================================================
// P0-1 修复：服务端鉴权中间件
// 从 req.user.id 获取登录用户ID，禁止从 body/query 接收
// ============================================================
function requireAuth(req, res, next) {
  const userId = req.user && req.user.id;
  if (!userId) {
    return res.status(401).json({ success: false, error: '未登录或登录已过期' });
  }
  req.authUserId = userId;
  next();
}

function initDB() {
  if (!db) return;
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS player_monthly_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        card_type TEXT NOT NULL,
        purchased_at TEXT DEFAULT (datetime('now', '+8 hours')),
        expire_at TEXT,
        last_claim_at TEXT,
        active INTEGER DEFAULT 1,
        UNIQUE(user_id, card_type)
      )
    `);
    console.log('[month_card] 表初始化完成');
  } catch (e) {
    console.error('[month_card] initDB错误:', e.message);
  }
}

// 获取上海时间日期字符串 YYYY-MM-DD
function getShanghaiDateStr() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

// 月卡配置
const CARD_CONFIG = {
  spirit: {
    id: 'monthly_card_spirit',
    name: '灵石月卡',
    icon: '🃏',
    price: 300, // 30元档（灵石价格）
    price_diamond: 30,
    description: '30天内每日可领取100灵石',
    dailyReward: 100,
    privileges: ['副本掉落+10%', '离线收益+50%'],
    days: 30
  },
  vip: {
    id: 'monthly_card_vip',
    name: '尊享月卡',
    icon: '💳',
    price: 980, // 98元档
    price_diamond: 98,
    description: '30天内每日可领取300灵石 + 双倍修炼特权',
    dailyReward: 300,
    privileges: ['副本掉落+20%', '离线收益+100%', '修炼效率+100%'],
    days: 30
  }
};

// ============================================================
// GET /month-card/info - 获取月卡配置
// ============================================================
router.get('/info', requireAuth, (req, res) => {
  const userId = req.authUserId;

  if (!db) {
    return res.status(500).json({ success: false, error: '数据库不可用' });
  }

  const today = getShanghaiDateStr();

  const cards = Object.entries(CARD_CONFIG).map(([type, cfg]) => {
    let status = 'not_purchased';
    let expireAt = null;
    let canClaimToday = false;
    let lastClaimAt = null;

    try {
      const record = db.prepare(
        'SELECT * FROM player_monthly_cards WHERE user_id=? AND card_type=? AND active=1'
      ).get(userId, type);

      if (record) {
        if (record.expire_at && record.expire_at < today) {
          status = 'expired';
        } else {
          status = 'active';
          expireAt = record.expire_at;
          lastClaimAt = record.last_claim_at;
          // 判断今日是否可领取：last_claim_at < 今天00:00:00
          canClaimToday = !record.last_claim_at || record.last_claim_at < today + ' 00:00:00';
        }
      }
    } catch (e) {
      console.error('[month_card] status查询错误:', e.message);
    }

    return {
      type,
      id: cfg.id,
      name: cfg.name,
      icon: cfg.icon,
      price: cfg.price,
      price_diamond: cfg.price_diamond,
      description: cfg.description,
      dailyReward: cfg.dailyReward,
      privileges: cfg.privileges,
      days: cfg.days,
      status,
      expireAt,
      canClaimToday,
      lastClaimAt
    };
  });

  res.json({ success: true, cards });
});

// ============================================================
// GET /month-card/status - 获取玩家月卡状态（兼容旧接口）
// ============================================================
router.get('/status', (req, res) => {
  return router.handle(req, res);
});

// ============================================================
// POST /month-card/claim - 领取每日灵石
// ============================================================
router.post('/claim', requireAuth, (req, res) => {
  const userId = req.authUserId;
  const cardType = req.body.cardType || req.body.card_type || 'spirit';

  if (!db) {
    return res.status(500).json({ success: false, error: '数据库不可用' });
  }

  if (!CARD_CONFIG[cardType]) {
    return res.status(400).json({ success: false, error: '无效的月卡类型' });
  }

  const cfg = CARD_CONFIG[cardType];
  const today = getShanghaiDateStr();

  try {
    // 查询月卡状态
    const record = db.prepare(
      'SELECT * FROM player_monthly_cards WHERE user_id=? AND card_type=? AND active=1'
    ).get(userId, cardType);

    if (!record) {
      return res.status(404).json({ success: false, error: `您尚未购买${cfg.name}` });
    }

    if (record.expire_at && record.expire_at < today) {
      return res.status(400).json({ success: false, error: `${cfg.name}已过期，请重新购买` });
    }

    // 检查今日是否已领取
    if (record.last_claim_at && record.last_claim_at >= today + ' 00:00:00') {
      return res.status(400).json({ success: false, error: '今日已领取，请明日再来' });
    }

    // 发放灵石
    const rewardAmount = cfg.dailyReward;

    // P0-4 修复：事务保证原子性
    const transaction = db.transaction(() => {
      db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(rewardAmount, userId);
      db.prepare(
        'UPDATE player_monthly_cards SET last_claim_at = ? WHERE id = ?'
      ).run(today + ' 23:59:59', record.id);
    });
    transaction();

    console.log(`[month_card] 玩家${userId}领取${cfg.name}每日灵石+${rewardAmount}`);

    res.json({
      success: true,
      message: `领取成功！获得${rewardAmount}灵石`,
      amount: rewardAmount,
      currency: '灵石',
      cardType,
      cardName: cfg.name
    });
  } catch (e) {
    console.error('[month_card] claim错误:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============================================================
// POST /month-card/purchase - 购买月卡（内部调用，由shop.js的daily-packages/buy路由处理）
// ============================================================
router.post('/purchase', requireAuth, (req, res) => {
  const userId = req.authUserId;
  const cardType = req.body.cardType || req.body.card_type || 'spirit';
  const payWith = req.body.payWith || 'spirit_stones';

  if (!db) {
    return res.status(500).json({ success: false, error: '数据库不可用' });
  }

  if (!CARD_CONFIG[cardType]) {
    return res.status(400).json({ success: false, error: '无效的月卡类型' });
  }

  const cfg = CARD_CONFIG[cardType];
  const cost = payWith === 'diamond' ? cfg.price_diamond : cfg.price;

  try {
    // 获取玩家
    const user = db.prepare('SELECT * FROM Users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }

    // 检查是否已有有效月卡
    const today = getShanghaiDateStr();
    const existing = db.prepare(
      'SELECT * FROM player_monthly_cards WHERE user_id=? AND card_type=? AND active=1'
    ).get(userId, cardType);

    if (existing && !(existing.expire_at && existing.expire_at < today)) {
      return res.status(400).json({ success: false, error: `${cfg.name}仍在有效期内，无需重复购买` });
    }

    // P0-4 修复：事务保证原子性（扣款 + 写入月卡记录）
    const expireAt = new Date(Date.now() + 8 * 3600 * 1000 + cfg.days * 24 * 3600 * 1000)
      .toISOString().slice(0, 10);

    const transaction = db.transaction(() => {
      // 扣款
      if (payWith === 'diamond') {
        if ((user.diamonds || 0) < cost) {
          throw new Error('钻石不足');
        }
        db.prepare('UPDATE Users SET diamonds = diamonds - ? WHERE id = ?').run(cost, userId);
      } else {
        if ((user.lingshi || 0) < cost) {
          throw new Error('灵石不足');
        }
        db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(cost, userId);
      }

      // 写入月卡记录（续期逻辑：已有记录则更新时间）
      db.prepare(`
        INSERT OR REPLACE INTO player_monthly_cards (user_id, card_type, purchased_at, expire_at, last_claim_at, active)
        VALUES (?, ?, datetime('now', '+8 hours'), ?, NULL, 1)
      `).run(userId, cardType, expireAt);
    });

    try {
      transaction();
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }

    console.log(`[month_card] 玩家${userId}购买${cfg.name}，到期日${expireAt}`);

    res.json({
      success: true,
      message: `购买成功！${cfg.name}已激活，每日可领取${cfg.dailyReward}灵石`,
      cardType,
      cardName: cfg.name,
      expireAt,
      dailyReward: cfg.dailyReward,
      cost,
      costType: payWith
    });
  } catch (e) {
    console.error('[month_card] purchase错误:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
