/**
 * AFK 挂机系统
 * 玩家进入AFK模式后，积累挂机收益
 * 端点:
 *   GET  /api/afk/status?player_id=X  - 获取AFK状态和预览收益
 *   POST /api/afk/start?player_id=X  - 开始AFK挂机
 *   POST /api/afk/claim?player_id=X   - 领取AFK收益
 *   POST /api/afk/stop?player_id=X   - 停止AFK模式
 */

const express = require('express');
const router = express.Router();

let db = null;
let Logger = console;

function getDb() {
  if (!db) {
    const Database = require('better-sqlite3');
    const path = require('path');
    // 统一使用 backend/data/game.db
    const dbPath = path.join(__dirname, '..', 'data', 'game.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
  }
  return db;
}

function setLogger(log) {
  Logger = log;
}

function setDb(database) {
  db = database;
}

// 初始化 AFK 相关表
function initAfkTables() {
  const database = getDb();
  try {
    database.exec(`
      CREATE TABLE IF NOT EXISTS player_afk (
        player_id INTEGER PRIMARY KEY,
        afk_started_at TEXT,
        afk_realm INTEGER DEFAULT 0,
        afk_accumulated_cultivation INTEGER DEFAULT 0,
        afk_accumulated_exp INTEGER DEFAULT 0,
        afk_accumulated_lingshi INTEGER DEFAULT 0,
        afk_last_claim_at TEXT,
        is_afk INTEGER DEFAULT 0,
        total_afk_minutes INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    database.exec(`
      CREATE TABLE IF NOT EXISTS player_afk_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER,
        started_at TEXT,
        ended_at TEXT,
        duration_minutes INTEGER,
        cultivation_gained INTEGER,
        exp_gained INTEGER,
        lingshi_gained INTEGER,
        claimed INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    Logger.log('[AFK] 表初始化完成');
  } catch (err) {
    Logger.error('[AFK] 表初始化失败:', err.message);
  }
}

// 根据境界获取基础挂机收益（每分钟）
function getAfkBaseReward(realm) {
  const rewards = {
    1: { cultivation: 5,   exp: 2,   lingshi: 1 },   // 炼气
    2: { cultivation: 12,  exp: 5,   lingshi: 2 },  // 筑基
    3: { cultivation: 30,  exp: 12,  lingshi: 5 },  // 金丹
    4: { cultivation: 75,  exp: 30,  lingshi: 12 }, // 元婴
    5: { cultivation: 180, exp: 70,  lingshi: 25 }, // 化神
    6: { cultivation: 400, exp: 150, lingshi: 50 }, // 炼虚
    7: { cultivation: 900, exp: 350, lingshi: 100 },// 大乘
    8: { cultivation: 2000,exp: 800, lingshi: 200 },// 渡劫
    9: { cultivation: 4500,exp: 1800,lingshi: 400 }, // 飞升
  };
  return rewards[realm] || rewards[1];
}

// 统一 userId 提取
function extractUserId(req) {
  return req.userId || parseInt(req.query.player_id) || parseInt(req.query.userId) || parseInt(req.body.player_id) || parseInt(req.body.userId) || 1;
}

// 统一获取玩家信息
function getPlayerInfo(userId) {
  const database = getDb();
  return database.prepare('SELECT * FROM Users WHERE id = ?').get(userId);
}

// GET /api/afk/status - 获取AFK状态
router.get('/status', (req, res) => {
  const userId = extractUserId(req);
  const database = getDb();

  try {
    const player = getPlayerInfo(userId);
    if (!player) return res.json({ success: false, message: '玩家不存在' });

    const afkData = database.prepare('SELECT * FROM player_afk WHERE player_id = ?').get(userId);
    const MAX_AFK_MINUTES = 480; // 上限8小时

    if (!afkData || !afkData.is_afk) {
      return res.json({
        success: true,
        isAfk: false,
        message: '未在挂机状态',
        totalAfkMinutes: afkData ? afkData.total_afk_minutes : 0,
        rewards: {
          cultivation: 0,
          exp: 0,
          lingshi: 0
        }
      });
    }

    // 计算当前累积收益
    const startedAt = new Date(afkData.afk_started_at).getTime();
    const now = Date.now();
    const elapsedMs = now - startedAt;
    const elapsedMinutes = Math.floor(elapsedMs / 60000);
    const cappedMinutes = Math.min(elapsedMinutes, MAX_AFK_MINUTES);

    const base = getAfkBaseReward(afkData.afk_realm || player.realm || 1);
    const vipBonus = 1 + (player.vipLevel || 0) * 0.1;
    const efficiency = 0.6 * vipBonus; // AFK效率60%起

    const cultivationGain = Math.floor(base.cultivation * cappedMinutes * efficiency);
    const expGain = Math.floor(base.exp * cappedMinutes * efficiency);
    const lingshiGain = Math.floor(base.lingshi * cappedMinutes * efficiency * 0.5);

    res.json({
      success: true,
      isAfk: true,
      startedAt: afkData.afk_started_at,
      elapsedMinutes: cappedMinutes,
      capped: elapsedMinutes > MAX_AFK_MINUTES,
      maxMinutes: MAX_AFK_MINUTES,
      realm: afkData.afk_realm || player.realm,
      totalAfkMinutes: afkData.total_afk_minutes || 0,
      rewards: {
        cultivation: cultivationGain,
        exp: expGain,
        lingshi: lingshiGain
      },
      efficiency: `${Math.round(efficiency * 100)}%`,
      vipBonus: Math.round(vipBonus * 100),
      message: `挂机${cappedMinutes}分钟，预计获得灵气+${cultivationGain}，经验+${expGain}，灵石+${lingshiGain}`
    });
  } catch (err) {
    Logger.error('[AFK] GET /status error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// POST /api/afk/start - 开始AFK挂机
router.post('/start', (req, res) => {
  const userId = extractUserId(req);
  const database = getDb();

  try {
    const player = getPlayerInfo(userId);
    if (!player) return res.json({ success: false, message: '玩家不存在' });

    const now = new Date().toISOString();
    const realm = player.realm || 1;

    // 检查是否已经在AFK状态
    const existing = database.prepare('SELECT * FROM player_afk WHERE player_id = ?').get(userId);
    if (existing && existing.is_afk) {
      return res.json({
        success: false,
        message: '已经在挂机状态中，请先领取收益',
        isAfk: true,
        startedAt: existing.afk_started_at
      });
    }

    // UPSERT AFK状态
    database.prepare(`
      INSERT INTO player_afk (player_id, afk_started_at, afk_realm, is_afk, updated_at)
      VALUES (?, ?, ?, 1, ?)
      ON CONFLICT(player_id) DO UPDATE SET
        afk_started_at = excluded.afk_started_at,
        afk_realm = excluded.afk_realm,
        is_afk = 1,
        afk_last_claim_at = datetime('now'),
        updated_at = datetime('now')
    `).run(userId, now, realm, now);

    Logger.log(`[AFK] 玩家${userId}开始挂机，境界${realm}`);

    res.json({
      success: true,
      message: '挂机开始',
      isAfk: true,
      startedAt: now,
      realm,
      hint: '挂机期间将持续获得收益，最多累积8小时。重新上线时自动结算。'
    });
  } catch (err) {
    Logger.error('[AFK] POST /start error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// POST /api/afk/claim - 领取AFK收益
router.post('/claim', (req, res) => {
  const userId = extractUserId(req);
  const database = getDb();

  try {
    const player = getPlayerInfo(userId);
    if (!player) return res.json({ success: false, message: '玩家不存在' });

    const afkData = database.prepare('SELECT * FROM player_afk WHERE player_id = ?').get(userId);
    if (!afkData || !afkData.is_afk) {
      return res.json({ success: false, message: '未在挂机状态' });
    }

    const MAX_AFK_MINUTES = 480;
    const startedAt = new Date(afkData.afk_started_at).getTime();
    const now = Date.now();
    const elapsedMs = now - startedAt;
    const elapsedMinutes = Math.floor(elapsedMs / 60000);
    const cappedMinutes = Math.min(elapsedMinutes, MAX_AFK_MINUTES);

    if (cappedMinutes < 1) {
      return res.json({ success: false, message: '挂机时间太短，无法领取收益' });
    }

    const base = getAfkBaseReward(afkData.afk_realm || player.realm || 1);
    const vipBonus = 1 + (player.vipLevel || 0) * 0.1;
    const efficiency = 0.6 * vipBonus;

    const cultivationGain = Math.floor(base.cultivation * cappedMinutes * efficiency);
    const expGain = Math.floor(base.exp * cappedMinutes * efficiency);
    const lingshiGain = Math.floor(base.lingshi * cappedMinutes * efficiency * 0.5);

    // 写入 AFK 记录
    database.prepare(`
      INSERT INTO player_afk_records (player_id, started_at, ended_at, duration_minutes, cultivation_gained, exp_gained, lingshi_gained, claimed)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).run(userId, afkData.afk_started_at, now, cappedMinutes, cultivationGain, expGain, lingshiGain);

    // 更新玩家灵气
    if (lingshiGain > 0) {
      database.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(lingshiGain, userId);
    }

    // 更新 AFK 状态：停止AFK但保留总时长
    database.prepare(`
      UPDATE player_afk SET
        is_afk = 0,
        afk_started_at = NULL,
        total_afk_minutes = total_afk_minutes + ?,
        updated_at = datetime('now')
      WHERE player_id = ?
    `).run(cappedMinutes, userId);

    // 更新 Cultivations 表的 accumulatedPower
    try {
      database.prepare('UPDATE Cultivations SET accumulatedPower = accumulatedPower + ? WHERE userId = ?').run(cultivationGain, userId);
    } catch (e) {
      // Cultivations表可能不存在，静默忽略
    }

    Logger.log(`[AFK] 玩家${userId}领取挂机收益：灵气+${lingshiGain}，灵气存量+${cultivationGain}，经验+${expGain}`);

    res.json({
      success: true,
      message: `领取成功！挂机${cappedMinutes}分钟`,
      rewards: {
        cultivation: cultivationGain,
        exp: expGain,
        lingshi: lingshiGain
      },
      elapsedMinutes: cappedMinutes,
      totalAfkMinutes: (afkData.total_afk_minutes || 0) + cappedMinutes
    });
  } catch (err) {
    Logger.error('[AFK] POST /claim error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// POST /api/afk/stop - 停止AFK（不领取收益）
router.post('/stop', (req, res) => {
  const userId = extractUserId(req);
  const database = getDb();

  try {
    const afkData = database.prepare('SELECT * FROM player_afk WHERE player_id = ?').get(userId);
    if (!afkData || !afkData.is_afk) {
      return res.json({ success: false, message: '未在挂机状态' });
    }

    database.prepare(`
      UPDATE player_afk SET is_afk = 0, afk_started_at = NULL, updated_at = datetime('now')
      WHERE player_id = ?
    `).run(userId);

    res.json({ success: true, message: '已停止挂机' });
  } catch (err) {
    Logger.error('[AFK] POST /stop error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// GET /api/afk/history - 获取AFK历史记录
router.get('/history', (req, res) => {
  const userId = extractUserId(req);
  const database = getDb();

  try {
    const records = database.prepare(`
      SELECT * FROM player_afk_records
      WHERE player_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(userId);

    const afkData = database.prepare('SELECT total_afk_minutes FROM player_afk WHERE player_id = ?').get(userId);

    res.json({
      success: true,
      records: records || [],
      totalAfkMinutes: afkData ? afkData.total_afk_minutes : 0
    });
  } catch (err) {
    Logger.error('[AFK] GET /history error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// GET /api/afk/ - 根路由
router.get('/', (req, res) => {
  const userId = extractUserId(req);
  const database = getDb();

  try {
    const afkData = database.prepare('SELECT * FROM player_afk WHERE player_id = ?').get(userId);
    const player = getPlayerInfo(userId);

    if (!afkData || !afkData.is_afk) {
      return res.json({
        success: true,
        isAfk: false,
        totalAfkMinutes: afkData ? afkData.total_afk_minutes : 0,
        canStart: true,
        message: '可以开始挂机'
      });
    }

    // 返回简要状态
    const startedAt = new Date(afkData.afk_started_at).getTime();
    const elapsedMinutes = Math.min(Math.floor((Date.now() - startedAt) / 60000), 480);
    const base = getAfkBaseReward(afkData.afk_realm || player?.realm || 1);
    const vipBonus = 1 + (player?.vipLevel || 0) * 0.1;
    const efficiency = 0.6 * vipBonus;

    res.json({
      success: true,
      isAfk: true,
      startedAt: afkData.afk_started_at,
      elapsedMinutes,
      totalAfkMinutes: afkData.total_afk_minutes || 0,
      currentRewards: {
        cultivation: Math.floor(base.cultivation * elapsedMinutes * efficiency),
        exp: Math.floor(base.exp * elapsedMinutes * efficiency),
        lingshi: Math.floor(base.lingshi * elapsedMinutes * efficiency * 0.5)
      }
    });
  } catch (err) {
    Logger.error('[AFK] GET / error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// ============================================================
// 离线委托系统 (P2-8)
// 可委托类型: gather(采集) / kill_monster(杀怪) / errand(跑腿)
// ============================================================

// 委托任务配置
const ENTRUST_TYPES = {
  gather: {
    name: '采集委托',
    icon: '🌿',
    desc: '派遣弟子采集灵药资源',
    duration: 30, // 分钟
    rewards: [
      { type: 'material', itemId: 'spirit_herb', name: '灵草', icon: '🌿', countRange: [2, 8] },
      { type: 'material', itemId: 'elixir_flower', name: '炼丹花', icon: '🌸', countRange: [1, 4] },
      { type: 'material', itemId: 'magic_mushroom', name: '灵芝', icon: '🍄', countRange: [1, 3] },
    ],
  },
  kill_monster: {
    name: '猎怪委托',
    icon: '⚔️',
    desc: '派遣弟子清除宗门附近的妖兽',
    duration: 60,
    rewards: [
      { type: 'material', itemId: 'beast_core', name: '兽核', icon: '🔮', countRange: [1, 5] },
      { type: 'material', itemId: 'beast_leather', name: '兽皮', icon: '🧥', countRange: [2, 6] },
      { type: 'material', itemId: 'demon_blood', name: '妖兽血', icon: '🩸', countRange: [1, 3] },
    ],
  },
  errand: {
    name: '跑腿委托',
    icon: '📦',
    desc: '弟子为宗门跑腿办事',
    duration: 20,
    rewards: [
      { type: 'material', itemId: 'lingshi_pack', name: '灵石袋', icon: '💰', countRange: [1, 3] },
      { type: 'material', itemId: 'mission_scroll', name: '任务卷轴', icon: '📜', countRange: [1, 2] },
    ],
  },
};

// 初始化委托表
function initEntrustTables() {
  const database = getDb();
  try {
    database.exec(`
      CREATE TABLE IF NOT EXISTS player_entrust (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        entrust_type TEXT NOT NULL,
        started_at TEXT NOT NULL,
        finishes_at TEXT NOT NULL,
        claimed INTEGER DEFAULT 0,
        rewards TEXT DEFAULT '[]',
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(player_id, claimed)
      )
    `);
    Logger.log('[Entrust] 表初始化完成');
  } catch (err) {
    Logger.error('[Entrust] 表初始化失败:', err.message);
  }
}
initEntrustTables();

// 辅助：从奖励表随机抽取
function rollRewards(rewards) {
  const result = [];
  for (const r of rewards) {
    if (Math.random() < 0.7) { // 70%概率获得
      const count = Math.floor(Math.random() * (r.countRange[1] - r.countRange[0] + 1)) + r.countRange[0];
      result.push({ ...r, count });
    }
  }
  return result;
}

// GET /api/afk/entrust - 获取委托状态
router.get('/entrust', (req, res) => {
  const userId = extractUserId(req);
  const database = getDb();

  try {
    // 查找玩家进行中的委托
    const active = database.prepare(
      'SELECT * FROM player_entrust WHERE player_id = ? AND claimed = 0 ORDER BY id DESC LIMIT 1'
    ).get(userId);

    if (!active) {
      return res.json({
        success: true,
        hasActive: false,
        availableTypes: Object.entries(ENTRUST_TYPES).map(([key, t]) => ({
          type: key, name: t.name, icon: t.icon, desc: t.desc, duration: t.duration,
        })),
      });
    }

    const cfg = ENTRUST_TYPES[active.entrust_type];
    const finishesAt = new Date(active.finishes_at).getTime();
    const remainingMinutes = Math.max(0, Math.floor((finishesAt - Date.now()) / 60000));
    const isReady = Date.now() >= finishesAt;

    res.json({
      success: true,
      hasActive: true,
      active: {
        type: active.entrust_type,
        name: cfg?.name || active.entrust_type,
        icon: cfg?.icon || '❓',
        startedAt: active.started_at,
        finishesAt: active.finishes_at,
        remainingMinutes,
        isReady,
        rewards: JSON.parse(active.rewards || '[]'),
      },
    });
  } catch (err) {
    Logger.error('[Entrust] GET /entrust error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// POST /api/afk/entrust - 开始/领取委托
router.post('/entrust', (req, res) => {
  const userId = extractUserId(req);
  const database = getDb();
  const { action, type } = req.body; // action: 'start' | 'claim'

  if (action === 'start') {
    if (!type || !ENTRUST_TYPES[type]) {
      return res.json({ success: false, message: '无效的委托类型: ' + type });
    }

    try {
      // 检查是否已有进行中委托
      const existing = database.prepare(
        'SELECT * FROM player_entrust WHERE player_id = ? AND claimed = 0'
      ).get(userId);
      if (existing) {
        return res.json({ success: false, message: '已有进行中的委托，请先完成或等待完成' });
      }

      const cfg = ENTRUST_TYPES[type];
      const now = new Date();
      const finishesAt = new Date(now.getTime() + cfg.duration * 60000);
      const rewards = rollRewards(cfg.rewards);

      database.prepare(`
        INSERT INTO player_entrust (player_id, entrust_type, started_at, finishes_at, rewards)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, type, now.toISOString(), finishesAt.toISOString(), JSON.stringify(rewards));

      Logger.info(`[委托] playerId=${userId} 开始委托 type=${type} duration=${cfg.duration}min`);

      res.json({
        success: true,
        message: `委托开始！预计 ${cfg.duration} 分钟后完成`,
        entrust: {
          type,
          name: cfg.name,
          icon: cfg.icon,
          finishesAt: finishesAt.toISOString(),
          duration: cfg.duration,
          previewRewards: rewards,
        },
      });
    } catch (err) {
      Logger.error('[Entrust] POST /entrust start error:', err.message);
      res.json({ success: false, message: err.message });
    }
  } else if (action === 'claim') {
    try {
      const active = database.prepare(
        'SELECT * FROM player_entrust WHERE player_id = ? AND claimed = 0'
      ).get(userId);
      if (!active) {
        return res.json({ success: false, message: '没有进行中的委托' });
      }
      if (Date.now() < new Date(active.finishes_at).getTime()) {
        return res.json({ success: false, message: '委托尚未完成，请等待' });
      }

      const rewards = JSON.parse(active.rewards || '[]');
      // 发放道具奖励
      for (const r of rewards) {
        const existing = database.prepare(
          'SELECT id, count FROM player_items WHERE user_id = ? AND item_id = ?'
        ).get(userId, r.itemId);
        if (existing) {
          database.prepare('UPDATE player_items SET count = count + ? WHERE id = ?').run(r.count, existing.id);
        } else {
          database.prepare(`
            INSERT INTO player_items (user_id, item_id, item_name, item_type, count, icon, source)
            VALUES (?, ?, ?, 'material', ?, ?, 'entrust')
          `).run(userId, r.itemId, r.name, r.count, r.icon);
        }
      }

      // 标记为已领取
      database.prepare('UPDATE player_entrust SET claimed = 1 WHERE id = ?').run(active.id);

      Logger.info(`[委托] playerId=${userId} 领取委托奖励`, rewards.map(r => r.name + 'x' + r.count));

      res.json({
        success: true,
        message: `委托完成！获得 ${rewards.length} 种道具`,
        rewards,
      });
    } catch (err) {
      Logger.error('[Entrust] POST /entrust claim error:', err.message);
      res.json({ success: false, message: err.message });
    }
  } else {
    res.json({ success: false, message: '未知操作: ' + action });
  }
});

module.exports = router;
module.exports.initAfkTables = initAfkTables;
module.exports.setDb = setDb;
module.exports.setLogger = setLogger;
