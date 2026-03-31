/**
 * 灵石兑换系统 - spirit_stone_exchange.js
 * 
 * 功能:
 * - 查询玩家的普通灵石(lingshi)和储备灵石(spirit_stone_reserve)
 * - 储备灵石转换为普通灵石(1:1，每日限额10000，10%手续费)
 * - 普通灵石转换为储备灵石(1:1，无限额，手续5%)
 * - 兑换记录历史
 * 
 * 数据库字段:
 * - lingshi: 普通灵石，可用于玩家市场交易、宗门捐献
 * - spirit_stone_reserve: 储备灵石，仅可用于系统商店
 */

const express = require('express');
const router = express.Router();

// 数据库（从 server.js 注入）
let db = null;
let database = null;
try {
  const serverPath = require('path').resolve(__dirname, '../server.js');
  const serverModule = require(serverPath);
  db = serverModule.db || (serverModule.database && serverModule.database.db);
  database = serverModule.database;
} catch (e) {
  console.log('[spirit_stone] 无法获取DB引用:', e.message);
}

// 备用：直接从 server.js 获取
try {
  const parentPath = require('path').resolve(__dirname, '../server.js');
  const parentModule = require(parentPath);
  if (!db && parentModule.db) db = parentModule.db;
  if (!database && parentModule.database) database = parentModule.database;
} catch (e) {}

// 配置
const EXCHANGE_CONFIG = {
  // 普通灵石 → 储备灵石
  toReserve: {
    feePercent: 5,      // 5%手续费
    dailyLimit: Infinity, // 无每日限额
    minAmount: 100       // 最少100灵石
  },
  // 储备灵石 → 普通灵石
  toFree: {
    feePercent: 10,     // 10%手续费（回流限制）
    dailyLimit: 50000,   // 每日最多兑换50000
    minAmount: 100,
    cooldownHours: 0    // 无冷却
  }
};

// 初始化兑换记录表
if (db) {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS spirit_stone_exchange_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        exchange_type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        fee INTEGER NOT NULL,
        actual_amount INTEGER NOT NULL,
        balance_before_free INTEGER,
        balance_before_reserve INTEGER,
        balance_after_free INTEGER,
        balance_after_reserve INTEGER,
        created_at TEXT DEFAULT (datetime('now', '+8 hours'))
      )
    `);
    console.log('[spirit_stone] 兑换记录表初始化完成');
  } catch (e) {
    console.error('[spirit_stone] 表初始化失败:', e.message);
  }
}

// ========== API 路由 ==========

// GET /api/spirit-stone/balance - 查询灵石余额
router.get('/balance', (req, res) => {
  const playerId = parseInt(req.query.player_id) || 1;

  if (!db) {
    // 无数据库时从 Users 表读取
    return res.json({
      success: false,
      message: '数据库不可用'
    });
  }

  try {
    const user = db.prepare('SELECT id, nickname, lingshi, spirit_stone_reserve FROM Users WHERE id = ?').get(playerId);
    if (!user) {
      return res.json({ success: false, message: '玩家不存在' });
    }

    // 查询今日兑换量
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStr = todayStart.toISOString().slice(0, 19).replace('T', ' ');

    const todayOutbound = db.prepare(`
      SELECT COALESCE(SUM(actual_amount), 0) as total
      FROM spirit_stone_exchange_records
      WHERE player_id = ? AND exchange_type = 'to_free' AND created_at >= ?
    `).get(playerId, todayStr);

    const todayInbound = db.prepare(`
      SELECT COALESCE(SUM(actual_amount), 0) as total
      FROM spirit_stone_exchange_records
      WHERE player_id = ? AND exchange_type = 'to_reserve' AND created_at >= ?
    `).get(playerId, todayStr);

    const todayOutLimit = EXCHANGE_CONFIG.toFree.dailyLimit - (todayOutbound.total || 0);

    res.json({
      success: true,
      data: {
        playerId: user.id,
        nickname: user.nickname,
        freeLingshi: user.lingshi || 0,
        reserveLingshi: user.spirit_stone_reserve || 0,
        exchangeConfig: EXCHANGE_CONFIG,
        todayOutboundUsed: todayOutbound.total || 0,
        todayOutboundLimit: EXCHANGE_CONFIG.toFree.dailyLimit,
        todayOutboundRemaining: Math.max(0, todayOutLimit),
        todayInboundUsed: todayInbound.total || 0
      }
    });
  } catch (e) {
    console.error('[spirit_stone] GET /balance error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// POST /api/spirit-stone/exchange-to-reserve - 普通灵石 → 储备灵石
router.post('/exchange-to-reserve', (req, res) => {
  const { player_id, amount } = req.body;
  const uid = parseInt(player_id);
  const amt = parseInt(amount);

  if (!uid || !amt) {
    return res.json({ success: false, message: '参数不足' });
  }

  const cfg = EXCHANGE_CONFIG.toReserve;
  if (amt < cfg.minAmount) {
    return res.json({ success: false, message: `最少兑换 ${cfg.minAmount} 灵石` });
  }

  if (!db) {
    return res.json({ success: false, message: '数据库不可用' });
  }

  try {
    const user = db.prepare('SELECT id, lingshi, spirit_stone_reserve FROM Users WHERE id = ?').get(uid);
    if (!user) return res.json({ success: false, message: '玩家不存在' });

    const fee = Math.floor(amt * cfg.feePercent / 100);
    const actual = amt - fee;

    if ((user.lingshi || 0) < amt) {
      return res.json({ success: false, message: `普通灵石不足 (持有${user.lingshi}，需${amt})` });
    }

    const transaction = db.transaction(() => {
      // 扣除普通灵石
      db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(amt, uid);
      // 增加储备灵石
      db.prepare('UPDATE Users SET spirit_stone_reserve = spirit_stone_reserve + ? WHERE id = ?').run(actual, uid);
      // 记录
      db.prepare(`
        INSERT INTO spirit_stone_exchange_records
        (player_id, exchange_type, amount, fee, actual_amount,
         balance_before_free, balance_before_reserve, balance_after_free, balance_after_reserve)
        VALUES (?, 'to_reserve', ?, ?, ?, ?, ?, ?, ?)
      `).run(uid, amt, fee, actual,
        user.lingshi, user.spirit_stone_reserve || 0,
        user.lingshi - amt, (user.spirit_stone_reserve || 0) + actual);
    });
    transaction();

    const updated = db.prepare('SELECT lingshi, spirit_stone_reserve FROM Users WHERE id = ?').get(uid);

    res.json({
      success: true,
      message: `兑换成功！💰 ${actual} 储备灵石已到账 (手续费 ${fee} 灵石)`,
      data: {
        originalAmount: amt,
        fee,
        actualAmount: actual,
        newFreeLingshi: updated.lingshi,
        newReserveLingshi: updated.spirit_stone_reserve
      }
    });
    console.log(`[spirit_stone] player=${uid} to_reserve: ${amt} (fee=${fee})`);
  } catch (e) {
    console.error('[spirit_stone] POST /exchange-to-reserve error:', e.message);
    res.json({ success: false, message: '兑换失败: ' + e.message });
  }
});

// POST /api/spirit-stone/exchange-to-free - 储备灵石 → 普通灵石
router.post('/exchange-to-free', (req, res) => {
  const { player_id, amount } = req.body;
  const uid = parseInt(player_id);
  const amt = parseInt(amount);

  if (!uid || !amt) {
    return res.json({ success: false, message: '参数不足' });
  }

  const cfg = EXCHANGE_CONFIG.toFree;
  if (amt < cfg.minAmount) {
    return res.json({ success: false, message: `最少兑换 ${cfg.minAmount} 灵石` });
  }

  if (!db) {
    return res.json({ success: false, message: '数据库不可用' });
  }

  try {
    const user = db.prepare('SELECT id, lingshi, spirit_stone_reserve FROM Users WHERE id = ?').get(uid);
    if (!user) return res.json({ success: false, message: '玩家不存在' });

    // 检查每日限额
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStr = todayStart.toISOString().slice(0, 19).replace('T', ' ');

    const todayUsed = db.prepare(`
      SELECT COALESCE(SUM(actual_amount), 0) as total
      FROM spirit_stone_exchange_records
      WHERE player_id = ? AND exchange_type = 'to_free' AND created_at >= ?
    `).get(uid, todayStr);

    const remaining = Math.max(0, cfg.dailyLimit - (todayUsed.total || 0));
    if (amt > remaining) {
      return res.json({ success: false, message: `今日兑换限额已用完，剩余 ${remaining} 灵石` });
    }

    const fee = Math.floor(amt * cfg.feePercent / 100);
    const actual = amt - fee;

    if ((user.spirit_stone_reserve || 0) < amt) {
      return res.json({ success: false, message: `储备灵石不足 (持有${user.spirit_stone_reserve}，需${amt})` });
    }

    const transaction = db.transaction(() => {
      db.prepare('UPDATE Users SET spirit_stone_reserve = spirit_stone_reserve - ? WHERE id = ?').run(amt, uid);
      db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(actual, uid);
      db.prepare(`
        INSERT INTO spirit_stone_exchange_records
        (player_id, exchange_type, amount, fee, actual_amount,
         balance_before_free, balance_before_reserve, balance_after_free, balance_after_reserve)
        VALUES (?, 'to_free', ?, ?, ?, ?, ?, ?, ?)
      `).run(uid, amt, fee, actual,
        user.lingshi, user.spirit_stone_reserve || 0,
        user.lingshi + actual, (user.spirit_stone_reserve || 0) - amt);
    });
    transaction();

    const updated = db.prepare('SELECT lingshi, spirit_stone_reserve FROM Users WHERE id = ?').get(uid);

    res.json({
      success: true,
      message: `兑换成功！💎 ${actual} 普通灵石已到账 (手续费 ${fee} 灵石)`,
      data: {
        originalAmount: amt,
        fee,
        actualAmount: actual,
        newFreeLingshi: updated.lingshi,
        newReserveLingshi: updated.spirit_stone_reserve,
        todayRemaining: Math.max(0, remaining - amt)
      }
    });
    console.log(`[spirit_stone] player=${uid} to_free: ${amt} (fee=${fee})`);
  } catch (e) {
    console.error('[spirit_stone] POST /exchange-to-free error:', e.message);
    res.json({ success: false, message: '兑换失败: ' + e.message });
  }
});

// GET /api/spirit-stone/records - 兑换记录
router.get('/records', (req, res) => {
  const playerId = parseInt(req.query.player_id) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);

  if (!db) {
    return res.json({ success: false, message: '数据库不可用' });
  }

  try {
    const records = db.prepare(`
      SELECT id, exchange_type, amount, fee, actual_amount,
             balance_before_free, balance_after_free,
             created_at
      FROM spirit_stone_exchange_records
      WHERE player_id = ?
      ORDER BY id DESC
      LIMIT ?
    `).all(playerId, limit);

    res.json({
      success: true,
      records: records.map(r => ({
        id: r.id,
        type: r.exchange_type === 'to_reserve' ? '普通→储备' : '储备→普通',
        rawType: r.exchange_type,
        amount: r.amount,
        fee: r.fee,
        actualAmount: r.actual_amount,
        freeLingshiChange: r.exchange_type === 'to_reserve'
          ? -r.amount
          : r.actual_amount,
        reserveLingshiChange: r.exchange_type === 'to_reserve'
          ? r.actual_amount
          : -r.amount,
        createdAt: r.created_at
      }))
    });
  } catch (e) {
    console.error('[spirit_stone] GET /records error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

module.exports = router;
