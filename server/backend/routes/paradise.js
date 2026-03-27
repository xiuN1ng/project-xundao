const express = require('express');
const router = express.Router();
const path = require('path');
const Database = require('better-sqlite3');

// DB path: server/backend/data/game.db
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

function getDb() {
  return new Database(DB_PATH);
}

// ========== 福地配置 ==========
const PARADISE_LANDS = {
  'spiritual-spring': {
    id: 'spiritual-spring',
    name: '灵泉福地',
    description: '拥有灵泉的洞天福地，灵气充沛',
    minRealm: 3, // 金丹期
    explorationTime: 300,
    icon: '⛲',
    rewards: { spiritStonesBase: 100, expBase: 300, materialChance: 0.3 }
  },
  'ancient-ruins': {
    id: 'ancient-ruins',
    name: '古遗址',
    description: '上古修士遗留下来的洞府',
    minRealm: 4, // 元婴期
    explorationTime: 600,
    icon: '🏛️',
    rewards: { spiritStonesBase: 300, expBase: 800, materialChance: 0.5 }
  },
  'immortal-island': {
    id: 'immortal-island',
    name: '仙灵岛',
    description: '传说中的仙人居所',
    minRealm: 5, // 化神期
    explorationTime: 900,
    icon: '🏝️',
    rewards: { spiritStonesBase: 600, expBase: 1500, materialChance: 0.7 }
  },
  'chaos-rift': {
    id: 'chaos-rift',
    name: '混沌裂缝',
    description: '空间裂缝中蕴含的混沌之力',
    minRealm: 6, // 炼虚期
    explorationTime: 1200,
    icon: '🌀',
    rewards: { spiritStonesBase: 1200, expBase: 3000, materialChance: 0.9 }
  }
};

const REALM_MAP = {
  0: '凡人', 1: '炼气期', 2: '筑基期', 3: '金丹期',
  4: '元婴期', 5: '化神期', 6: '炼虚期', 7: '合体期',
  8: '大乘期', 9: '真仙'
};

// ========== 初始化数据库表 ==========
function initParadiseTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS paradise_explorations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      land_id TEXT NOT NULL,
      status TEXT DEFAULT 'exploring',
      start_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      completed_time INTEGER,
      rewards_claimed INTEGER DEFAULT 0,
      rewards TEXT,
      total_rewards TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, id)
    );

    CREATE TABLE IF NOT EXISTS paradise_stats (
      user_id INTEGER PRIMARY KEY,
      total_explorations INTEGER DEFAULT 0,
      last_updated TEXT DEFAULT (datetime('now'))
    );
  `);
}

// ========== 获取用户当前境界 ==========
function getPlayerRealm(userId) {
  try {
    const db = getDb();
    const user = db.prepare('SELECT realm FROM Users WHERE id = ?').get(userId);
    db.close();
    return user ? (user.realm || 1) : 1;
  } catch (e) {
    return 1;
  }
}

// ========== GET /api/paradise/types ==========
// 返回所有福地列表（含玩家境界过滤）
router.get('/types', (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId || req.query.player_id || 1;
    const playerRealm = getPlayerRealm(userId);

    const lands = Object.values(PARADISE_LANDS).map(land => ({
      ...land,
      locked: playerRealm < land.minRealm,
      minRealmName: REALM_MAP[land.minRealm] || '未知'
    }));

    res.json({ lands });
  } catch (e) {
    console.error('[Paradise] /types error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ========== GET /api/paradise/info & /status ==========
// 返回玩家探索数据
const paradiseInfoHandler = (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId || req.query.player_id || 1;
    const db = getDb();
    initParadiseTables(db);

    // 获取当前进行中/可完成的探索
    const currentQuest = db.prepare(
      `SELECT * FROM paradise_explorations
       WHERE user_id = ? AND status IN ('exploring', 'completed') AND rewards_claimed = 0
       ORDER BY id DESC LIMIT 1`
    ).get(userId);

    // 获取探索统计
    const stats = db.prepare(
      'SELECT * FROM paradise_stats WHERE user_id = ?'
    ).get(userId);

    // 获取历史记录（最近10条）
    const history = db.prepare(
      `SELECT * FROM paradise_explorations
       WHERE user_id = ? AND status = 'completed' AND rewards_claimed = 1
       ORDER BY completed_time DESC LIMIT 10`
    ).get(userId);

    // 获取已占领的福地（根据探索完成次数）
    const occupiedRows = db.prepare(
      `SELECT land_id, COUNT(*) as count FROM paradise_explorations
       WHERE user_id = ? AND status = 'completed' AND rewards_claimed = 1
       GROUP BY land_id`
    ).all(userId);

    const occupiedLands = occupiedRows.map(r => r.land_id);

    // 获取所有福地（带境界锁定状态）
    const playerRealm = getPlayerRealm(userId);
    const availableLands = Object.values(PARADISE_LANDS).map(land => ({
      ...land,
      locked: playerRealm < land.minRealm,
      minRealmName: REALM_MAP[land.minRealm] || '未知',
      occupied: occupiedLands.includes(land.id)
    }));

    // 构建 currentQuest 对象
    let quest = null;
    if (currentQuest) {
      const remaining = Math.max(0, Math.floor((currentQuest.end_time - Date.now()) / 1000));
      const totalTime = currentQuest.end_time - currentQuest.start_time;
      const elapsed = Date.now() - currentQuest.start_time;
      const progress = Math.min(100, Math.floor((elapsed / totalTime) * 100));

      quest = {
        id: currentQuest.id,
        landId: currentQuest.land_id,
        landName: PARADISE_LANDS[currentQuest.land_id]?.name || currentQuest.land_id,
        icon: PARADISE_LANDS[currentQuest.land_id]?.icon || '🏞️',
        status: remaining <= 0 ? 'completed' : 'exploring',
        remaining,
        progress,
        events: [
          { id: 'spiritual-spring', name: '发现灵泉', icon: '⛲', triggered: progress > 30 },
          { id: 'rare-herb', name: '发现灵草', icon: '🌿', triggered: progress > 60 },
          { id: 'ancient-ruins', name: '古修士遗迹', icon: '🏛️', triggered: progress > 80 }
        ]
      };
    }

    // 探索历史
    let historyList = [];
    if (history) {
      historyList = db.prepare(
        `SELECT * FROM paradise_explorations
         WHERE user_id = ? AND status = 'completed' AND rewards_claimed = 1
         ORDER BY completed_time DESC LIMIT 10`
      ).all(userId).map(r => ({
        landId: r.land_id,
        landName: PARADISE_LANDS[r.land_id]?.name || r.land_id,
        completedTime: r.completed_time,
        totalRewards: r.total_rewards ? JSON.parse(r.total_rewards) : {}
      }));
    }

    db.close();

    res.json({
      currentQuest: quest,
      availableLands,
      history: historyList,
      totalExplorations: stats?.total_explorations || 0,
      occupiedLands
    });
  } catch (e) {
    console.error('[Paradise] /info error:', e.message);
    res.status(500).json({ error: e.message });
  }
};

router.get('/info', paradiseInfoHandler);
router.get('/status', paradiseInfoHandler); // 兼容前端 /paradise/status 调用

// ========== POST /api/paradise/types ==========
// 开始探索福地
router.post('/types', (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId || req.body.player_id || 1;
    const { landId } = req.body;

    if (!landId || !PARADISE_LANDS[landId]) {
      return res.status(400).json({ error: '无效的福地ID' });
    }

    const land = PARADISE_LANDS[landId];
    const playerRealm = getPlayerRealm(userId);

    if (playerRealm < land.minRealm) {
      return res.status(400).json({ error: `境界不足，需要${REALM_MAP[land.minRealm]}才能探索此福地` });
    }

    const db = getDb();
    initParadiseTables(db);

    // 检查是否已有进行中的探索
    const existing = db.prepare(
      `SELECT * FROM paradise_explorations
       WHERE user_id = ? AND status IN ('exploring', 'completed') AND rewards_claimed = 0`
    ).get(userId);

    if (existing) {
      db.close();
      return res.status(400).json({ error: '已有进行中的探索任务' });
    }

    const now = Date.now();
    const endTime = now + land.explorationTime * 1000;

    const result = db.prepare(
      `INSERT INTO paradise_explorations (user_id, land_id, status, start_time, end_time)
       VALUES (?, ?, 'exploring', ?, ?)`
    ).run(userId, landId, now, endTime);

    // 更新统计
    db.prepare(
      `INSERT INTO paradise_stats (user_id, total_explorations, last_updated)
       VALUES (?, 1, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET
       total_explorations = total_explorations + 1,
       last_updated = datetime('now')`
    ).run(userId);

    const quest = {
      id: result.lastInsertRowid,
      landId: land.id,
      landName: land.name,
      icon: land.icon,
      status: 'exploring',
      remaining: land.explorationTime,
      progress: 0,
      startTime: now,
      endTime,
      events: [
        { id: 'spiritual-spring', name: '发现灵泉', icon: '⛲', triggered: false },
        { id: 'rare-herb', name: '发现灵草', icon: '🌿', triggered: false },
        { id: 'ancient-ruins', name: '古修士遗迹', icon: '🏛️', triggered: false }
      ]
    };

    db.close();
    res.json({ success: true, quest });
  } catch (e) {
    console.error('[Paradise] POST /types error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ========== POST /api/paradise/claim-reward ==========
// 领取探索奖励
router.post('/claim-reward', (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId || req.body.player_id || 1;
    const { questId } = req.body;

    const db = getDb();
    initParadiseTables(db);

    // 获取探索记录
    const quest = db.prepare(
      `SELECT * FROM paradise_explorations
       WHERE user_id = ? AND status IN ('exploring', 'completed') AND rewards_claimed = 0
       ${questId ? 'AND id = ?' : 'ORDER BY id DESC LIMIT 1'}`
    ).run(questId ? userId : userId, questId || null);

    const exploration = quest.get ? quest.get(userId, questId || null) : null;

    // 重新查一次不用 run
    const explorationData = db.prepare(
      `SELECT * FROM paradise_explorations
       WHERE user_id = ? AND status IN ('exploring', 'completed') AND rewards_claimed = 0
       ORDER BY id DESC LIMIT 1`
    ).get(userId);

    if (!explorationData) {
      db.close();
      return res.status(404).json({ error: '没有可领取奖励的探索任务' });
    }

    const land = PARADISE_LANDS[explorationData.land_id];
    if (!land) {
      db.close();
      return res.status(400).json({ error: '福地数据异常' });
    }

    // 计算奖励（根据境界加成 + 随机事件加成）
    const playerRealm = getPlayerRealm(userId);
    const realmBonus = 1 + (playerRealm - land.minRealm) * 0.2;
    const eventBonus = 1 + Math.random() * 0.5;
    const vipBonus = 1; // 简化版

    const spiritStones = Math.floor(land.rewards.spiritStonesBase * realmBonus * eventBonus * vipBonus);
    const exp = Math.floor(land.rewards.expBase * realmBonus * eventBonus * vipBonus);
    const materials = Math.random() < land.rewards.materialChance ? Math.floor(Math.random() * 3) + 1 : 0;

    // 发放灵石
    try {
      db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(spiritStones, userId);
    } catch (e) {
      console.log('[Paradise] Failed to add spirit stones:', e.message);
    }

    // 发放经验（如果有经验系统）
    try {
      db.prepare('UPDATE Users SET exp = exp + ? WHERE id = ?').run(exp, userId);
    } catch (e) {
      // 忽略
    }

    // 发放材料到 forge_materials
    if (materials > 0) {
      try {
        const materialId = 'spirit_herb'; // 简化：统一发放灵草
        db.prepare(
          `INSERT INTO forge_materials (user_id, material_id, quantity)
           VALUES (?, ?, ?)
           ON CONFLICT(user_id, material_id) DO UPDATE SET
           quantity = quantity + ?`
        ).run(userId, materialId, materials, materials);
      } catch (e) {
        console.log('[Paradise] Failed to add materials:', e.message);
      }
    }

    // 标记为已领取
    db.prepare(
      `UPDATE paradise_explorations
       SET status = 'completed', completed_time = ?, rewards_claimed = 1,
           rewards = ?, total_rewards = ?
       WHERE id = ?`
    ).run(Date.now(), JSON.stringify({ spiritStones, exp, materials }), JSON.stringify({ spiritStones, exp, materials }), explorationData.id);

    db.close();

    const rewards = {
      spiritStones,
      exp,
      materials
    };

    res.json({
      success: true,
      rewards,
      message: `探索${land.name}成功！获得灵石+${spiritStones}，经验+${exp}${materials > 0 ? `，材料+${materials}` : ''}`
    });
  } catch (e) {
    console.error('[Paradise] /claim-reward error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ========== GET /api/paradise ==========
// 根路由 - 返回概览
router.get('/', (req, res) => {
  const userId = req.user?.id || req.query.userId || req.query.player_id || 1;
  const db = getDb();
  initParadiseTables(db);

  const stats = db.prepare('SELECT * FROM paradise_stats WHERE user_id = ?').get(userId);
  const occupiedRows = db.prepare(
    `SELECT land_id, COUNT(*) as count FROM paradise_explorations
     WHERE user_id = ? AND status = 'completed' AND rewards_claimed = 1 GROUP BY land_id`
  ).all(userId);

  db.close();

  res.json({
    types: Object.values(PARADISE_LANDS),
    totalExplorations: stats?.total_explorations || 0,
    occupiedLands: occupiedRows.map(r => r.land_id)
  });
});

module.exports = router;
