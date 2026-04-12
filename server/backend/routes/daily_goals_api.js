/**
 * 每日目标/成就奖励 API (P89-4)
 * 每日完成3/6/9个任务领取档位奖励
 *
 * API端点:
 * 1. GET  /api/daily-goals         - 查看每日目标状态和档位
 * 2. POST /api/daily-goals/claim   - 领取指定档位奖励
 */

const express = require('express');
const router = express.Router();
const path = require('path');

const Logger = {
  info: (...args) => console.log('[daily-goals]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[daily-goals:error]', new Date().toISOString(), ...args)
};

const DB_PATH = path.join(__dirname, '..', 'data', 'game.db');

let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  Logger.info('数据库连接成功');
} catch (err) {
  Logger.error('数据库连接失败:', err.message);
  db = {
    prepare: () => ({ run: () => {}, get: () => null, all: () => [] }),
    exec: () => {}
  };
}

function getPlayerId(req) {
  return parseInt(req.headers['x-player-id'] || req.body?.playerId || 1);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ============================================================
// 初始化档位表
// ============================================================
function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_goal_tiers (
      id INTEGER PRIMARY KEY,
      tier INTEGER NOT NULL,
      required INTEGER NOT NULL,
      lingshi_reward INTEGER DEFAULT 0,
      exp_reward INTEGER DEFAULT 0,
      diamonds_reward INTEGER DEFAULT 0,
      item_reward TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(tier)
    )
  `);

  // 插入3档位 (tier 3=完成3个, 6=完成6个, 9=完成9个)
  const tiers = [
    { tier: 3, required: 3, lingshi: 500, exp: 200, diamonds: 0 },
    { tier: 6, required: 6, lingshi: 1000, exp: 500, diamonds: 5 },
    { tier: 9, required: 9, lingshi: 2000, exp: 1000, diamonds: 15 },
  ];

  const insert = db.prepare(`
    INSERT OR IGNORE INTO daily_goal_tiers (tier, required, lingshi_reward, exp_reward, diamonds_reward)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const t of tiers) {
    insert.run(t.tier, t.required, t.lingshi, t.exp, t.diamonds);
  }

  // 记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_goal_claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      tier INTEGER NOT NULL,
      claim_date TEXT NOT NULL,
      claimed_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(player_id, tier, claim_date)
    )
  `);

  Logger.info('每日目标档位表初始化完成');
}

// ============================================================
// 端点1: GET /api/daily-goals
// ============================================================
router.get('/', (req, res) => {
  const playerId = getPlayerId(req);
  const today = todayStr();

  try {
    // 获取每日任务完成情况 (从 dailyQuest.js 的表)
    let completedToday = 0;
    try {
      const rows = db.prepare(`
        SELECT COUNT(*) as cnt FROM daily_quest_progress
        WHERE user_id = ? AND quest_date = ? AND completed = 1
      `).get(playerId, today);
      completedToday = rows?.cnt || 0;
    } catch (e) {
      // 表可能不存在
      completedToday = 0;
    }

    // 获取档位信息
    const tiers = db.prepare('SELECT * FROM daily_goal_tiers ORDER BY tier ASC').all();

    // 获取已领取记录
    const claims = db.prepare(`
      SELECT tier, claim_date FROM daily_goal_claims
      WHERE player_id = ? AND claim_date = ?
    `).all(playerId, today);
    const claimedSet = new Set(claims.map(c => c.tier));

    // 获取玩家资源
    const player = db.prepare('SELECT level, realm, lingshi FROM Users WHERE id = ?').get(playerId);

    const tierData = tiers.map(t => ({
      tier: t.tier,
      required: t.required,
      completed: completedToday >= t.required,
      claimed: claimedSet.has(t.tier),
      canClaim: completedToday >= t.required && !claimedSet.has(t.tier),
      rewards: {
        lingshi: t.lingshi_reward,
        exp: t.exp_reward,
        diamonds: t.diamonds_reward,
        items: JSON.parse(t.item_reward || '{}')
      }
    }));

    // 计算下次可领取档位
    const nextTier = tierData.find(t => t.required > completedToday && !t.claimed);
    const progressText = `${completedToday}/9`;

    res.json({
      success: true,
      data: {
        completedToday,
        progressText,
        progressPercent: Math.min(100, Math.floor((completedToday / 9) * 100)),
        tiers: tierData,
        nextTier: nextTier ? { tier: nextTier.tier, remaining: nextTier.required - completedToday } : null,
        playerLevel: player?.level || 1,
        totalTiers: 3
      }
    });
  } catch (e) {
    Logger.error('获取每日目标失败:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============================================================
// 端点2: POST /api/daily-goals/claim
// ============================================================
router.post('/claim', (req, res) => {
  const playerId = getPlayerId(req);
  const { tier } = req.body;
  const tierNum = parseInt(tier);
  const today = todayStr();

  if (!tierNum || ![3, 6, 9].includes(tierNum)) {
    return res.status(400).json({ success: false, error: 'tier 必须是 3、6 或 9' });
  }

  try {
    // 检查是否已领取
    const existing = db.prepare(`
      SELECT id FROM daily_goal_claims
      WHERE player_id = ? AND tier = ? AND claim_date = ?
    `).get(playerId, tierNum, today);

    if (existing) {
      return res.status(400).json({ success: false, error: '该档位今日已领取' });
    }

    // 检查是否满足条件
    let completedToday = 0;
    try {
      const rows = db.prepare(`
        SELECT COUNT(*) as cnt FROM daily_quest_progress
        WHERE user_id = ? AND quest_date = ? AND completed = 1
      `).get(playerId, today);
      completedToday = rows?.cnt || 0;
    } catch (e) {
      completedToday = 0;
    }

    if (completedToday < tierNum) {
      return res.status(400).json({ success: false, error: `需要完成${tierNum}个任务，当前完成${completedToday}个` });
    }

    // 获取档位奖励
    const tierRow = db.prepare('SELECT * FROM daily_goal_tiers WHERE tier = ?').get(tierNum);
    if (!tierRow) {
      return res.status(404).json({ success: false, error: '档位不存在' });
    }

    // 发放奖励
    const rewards = {
      lingshi: tierRow.lingshi_reward,
      exp: tierRow.exp_reward,
      diamonds: tierRow.diamonds_reward
    };

    // 更新灵石
    if (rewards.lingshi > 0) {
      db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(rewards.lingshi, playerId);
    }
    // 更新钻石
    if (rewards.diamonds > 0) {
      db.prepare('UPDATE Users SET diamonds = diamonds + ? WHERE id = ?').run(rewards.diamonds, playerId);
    }

    // 记录领取
    db.prepare(`
      INSERT INTO daily_goal_claims (player_id, tier, claim_date)
      VALUES (?, ?, ?)
    `).run(playerId, tierNum, today);

    // 获取更新后的灵石
    const player = db.prepare('SELECT lingshi, diamonds FROM Users WHERE id = ?').get(playerId);

    res.json({
      success: true,
      message: `领取成功！完成${completedToday}个任务，领取档位${tierNum}`,
      rewards,
      playerLingshi: player?.lingshi || 0,
      playerDiamonds: player?.diamonds || 0,
      tier: tierNum
    });
  } catch (e) {
    Logger.error('领取每日目标奖励失败:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

initTables();

module.exports = router;
Logger.info('每日目标模块加载完成');
