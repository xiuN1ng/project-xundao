/**
 * 首充双倍系统 - first_recharge.js
 * 玩家首次充值任意金额，获得双倍灵石奖励
 *
 * 端点:
 * GET  /first-recharge/status  - 获取首充状态（是否已领取）
 * POST /first-recharge/claim   - 领取首充双倍奖励
 */

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
  console.log('[first_recharge] DB连接失败:', e.message);
}

// ============================================================
// P0-1 修复：服务端鉴权中间件
// 从 req.user.id 获取登录用户ID，禁止从 body/query 接收
// ============================================================
function requireAuth(req, res, next) {
  // 优先从 session/token 获取用户ID
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
    // 首充记录表
    db.exec(`
      CREATE TABLE IF NOT EXISTS first_recharge (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        claimed INTEGER NOT NULL DEFAULT 0,
        claimed_at TEXT,
        bonus_amount INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now', '+8 hours'))
      )
    `);
    console.log('[first_recharge] 表初始化完成');
  } catch (e) {
    console.error('[first_recharge] initDB错误:', e.message);
  }
}

// 获取上海时间日期字符串
function getShanghaiDate() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

// ============================================================
// GET /first-recharge/status - 获取首充状态
// ============================================================
router.get('/status', requireAuth, (req, res) => {
  const userId = req.authUserId;

  if (!db) {
    return res.status(500).json({ success: false, error: '数据库不可用' });
  }

  try {
    const record = db.prepare('SELECT * FROM first_recharge WHERE user_id = ?').get(userId);

    if (!record) {
      // 从未充值过，首充机会存在
      return res.json({
        success: true,
        status: 'available',  // 可领取
        claimed: false,
        message: '首次充值双倍奖励待领取！'
      });
    }

    if (record.claimed) {
      return res.json({
        success: true,
        status: 'claimed',
        claimed: true,
        claimedAt: record.claimed_at,
        bonusAmount: record.bonus_amount,
        message: '首充奖励已领取'
      });
    }

    // 已充值但未领取
    return res.json({
      success: true,
      status: 'available',
      claimed: false,
      message: '首充奖励待领取！'
    });
  } catch (e) {
    console.error('[first_recharge] status错误:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============================================================
// POST /first-recharge/claim - 领取首充双倍奖励
// ============================================================
router.post('/claim', requireAuth, (req, res) => {
  const userId = req.authUserId;

  if (!db) {
    return res.status(500).json({ success: false, error: '数据库不可用' });
  }

  try {
    // 检查是否已有记录
    const record = db.prepare('SELECT * FROM first_recharge WHERE user_id = ?').get(userId);

    if (record && record.claimed) {
      return res.status(400).json({ success: false, error: '首充奖励已领取过，无法重复领取' });
    }

    // 获取玩家充值总额（从payment_orders计算真实充值）
    let totalRecharged = 0;
    try {
      const orders = db.prepare(`
        SELECT SUM(amount) as total FROM payment_orders
        WHERE user_id = ? AND status = 'completed'
      `).get(userId);
      totalRecharged = orders ? (orders.total || 0) : 0;
    } catch (e) {
      // payment_orders表可能不存在
      totalRecharged = 0;
    }

    // 奖励金额：首充金额的100%（双倍，即多给一倍的量）
    const bonusAmount = totalRecharged;

    if (bonusAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: '尚未充值，无法领取首充奖励'
      });
    }

    // P0-4 修复：使用事务保证原子性
    const transaction = db.transaction(() => {
      const now = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
      db.prepare(`
        INSERT OR REPLACE INTO first_recharge (user_id, claimed, claimed_at, bonus_amount, created_at)
        VALUES (?, 1, ?, ?, datetime('now', '+8 hours'))
      `).run(userId, now, bonusAmount);

      // 发放灵石奖励
      db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(bonusAmount, userId);
    });
    transaction();

    console.log(`[first_recharge] 玩家${userId}领取首充奖励，获得${bonusAmount}灵石`);

    res.json({
      success: true,
      message: `恭喜获得首充双倍奖励：${bonusAmount}灵石！`,
      bonusAmount,
      totalBonus: bonusAmount
    });
  } catch (e) {
    console.error('[first_recharge] claim错误:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============================================================
// POST /first-recharge/reward - 兼容旧版前端（模拟充值后直接给奖励）
// P0-1: 添加鉴权，P0-2: 金额从数据库读取，P0-4: 添加事务
// ============================================================
router.post('/reward', requireAuth, (req, res) => {
  const userId = req.authUserId;

  if (!db) {
    return res.status(500).json({ success: false, error: '数据库不可用' });
  }

  try {
    const record = db.prepare('SELECT * FROM first_recharge WHERE user_id = ?').get(userId);

    if (record && record.claimed) {
      return res.status(400).json({ success: false, error: '首充奖励已领取' });
    }

    // P0-2 修复：金额必须从数据库读取，禁止客户端传入
    let totalRecharged = 0;
    try {
      const orders = db.prepare(`
        SELECT SUM(amount) as total FROM payment_orders
        WHERE user_id = ? AND status = 'completed'
      `).get(userId);
      totalRecharged = orders ? (orders.total || 0) : 0;
    } catch (e) {
      totalRecharged = 0;
    }

    if (totalRecharged <= 0) {
      return res.status(400).json({
        success: false,
        error: '尚未充值，无法领取首充奖励'
      });
    }

    // 首充双倍：bonus = 实际充值金额
    const originalAmount = totalRecharged;
    const bonusAmount = totalRecharged;

    // P0-4 修复：事务保证原子性
    const transaction = db.transaction(() => {
      const now = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
      db.prepare(`
        INSERT OR REPLACE INTO first_recharge (user_id, claimed, claimed_at, bonus_amount, created_at)
        VALUES (?, 1, ?, ?, datetime('now', '+8 hours'))
      `).run(userId, now, bonusAmount);

      // 发放灵石（充值金额 + 首充奖励 = 双倍）
      db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(originalAmount + bonusAmount, userId);
    });
    transaction();

    console.log(`[first_recharge] 玩家${userId}充值${originalAmount}，首充奖励${bonusAmount}，共获得${originalAmount + bonusAmount}`);

    res.json({
      success: true,
      message: `首充双倍！充值${originalAmount}灵石，额外获得${bonusAmount}灵石bonus！`,
      originalAmount,
      bonusAmount,
      totalReceived: originalAmount + bonusAmount
    });
  } catch (e) {
    console.error('[first_recharge] reward错误:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
