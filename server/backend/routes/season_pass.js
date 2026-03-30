/**
 * 战令系统 - season_pass.js
 * 赛季制战令系统，支持等级/XP/奖励领取/购买
 *
 * 端点:
 * GET  /                    - 战令概览
 * GET  /status              - 获取玩家战令状态
 * POST /purchase            - 购买战令
 * POST /claim/:level        - 领取指定等级奖励
 */

const express = require('express');
const router = express.Router();
const path = require('path');

// 数据库连接
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');
let db = null;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  initDB();
} catch (e) {
  console.log('[season_pass] DB连接失败:', e.message);
}

// ============================================================
// 初始化：建表
// ============================================================
function initDB() {
  if (!db) return;
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS season_pass (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        season_id INTEGER NOT NULL DEFAULT 1,
        level INTEGER NOT NULL DEFAULT 1,
        exp INTEGER NOT NULL DEFAULT 0,
        purchased INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(player_id, season_id)
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS season_pass_claims (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        season_id INTEGER NOT NULL,
        level INTEGER NOT NULL,
        claimed_at TEXT DEFAULT (datetime('now')),
        UNIQUE(player_id, season_id, level)
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS season_pass_seasons (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
  } catch (e) {
    console.log('[season_pass] 建表失败:', e.message);
  }
}

// ============================================================
// 赛季配置
// ============================================================
const CURRENT_SEASON = {
  id: 1,
  name: '第一赛季·筑基篇',
  start_time: '2026-03-01 00:00:00',
  end_time: '2026-04-30 23:59:59'
};

// 战令等级配置 (等级 → {freeExp, premiumExp, rewards})
const SEASON_REWARDS = {
  // 免费档奖励
  free: {
    1: { item: '灵石', count: 100, description: '100灵石' },
    2: { item: '经验', count: 500, description: '500经验' },
    3: { item: 'iron_ingot', count: 5, description: '铁锭×5' },
    4: { item: '灵石', count: 200, description: '200灵石' },
    5: { item: 'jade', count: 2, description: '玉石×2' },
    6: { item: '灵石', count: 300, description: '300灵石' },
    7: { item: 'fire_crystal', count: 1, description: '火晶×1' },
    8: { item: '灵石', count: 400, description: '400灵石' },
    9: { item: '经验', count: 1000, description: '1000经验' },
    10: { item: '灵石', count: 500, description: '500灵石' },
    11: { item: 'iron_ingot', count: 10, description: '铁锭×10' },
    12: { item: '灵石', count: 600, description: '600灵石' },
    13: { item: 'jade', count: 3, description: '玉石×3' },
    14: { item: '灵石', count: 700, description: '700灵石' },
    15: { item: 'refined_iron', count: 2, description: '精炼铁×2' },
    16: { item: '灵石', count: 800, description: '800灵石' },
    17: { item: 'fire_crystal', count: 2, description: '火晶×2' },
    18: { item: '灵石', count: 900, description: '900灵石' },
    19: { item: '经验', count: 2000, description: '2000经验' },
    20: { item: '灵石', count: 1000, description: '1000灵石' },
    21: { item: 'thunder_crystal', count: 1, description: '雷晶×1' },
    22: { item: '灵石', count: 1200, description: '1200灵石' },
    23: { item: 'jade', count: 5, description: '玉石×5' },
    24: { item: '灵石', count: 1400, description: '1400灵石' },
    25: { item: 'dragon_scale', count: 1, description: '龙鳞×1' },
    26: { item: '灵石', count: 1600, description: '1600灵石' },
    27: { item: 'refined_iron', count: 3, description: '精炼铁×3' },
    28: { item: '灵石', count: 1800, description: '1800灵石' },
    29: { item: '经验', count: 3000, description: '3000经验' },
    30: { item: '灵石', count: 2000, description: '2000灵石' }
  },
  // 战令专属奖励 (需购买战令)
  premium: {
    1: { item: 'diamonds', count: 10, description: '钻石×10' },
    2: { item: '灵石', count: 200, description: '200灵石' },
    3: { item: 'fire_essence', count: 1, description: '火焰精华×1' },
    4: { item: '灵石', count: 300, description: '300灵石' },
    5: { item: 'jade', count: 3, description: '玉石×3' },
    6: { item: '灵石', count: 400, description: '400灵石' },
    7: { item: 'fire_crystal', count: 2, description: '火晶×2' },
    8: { item: '灵石', count: 500, description: '500灵石' },
    9: { item: 'thunder_crystal', count: 1, description: '雷晶×1' },
    10: { item: 'spirit_stone', count: 1, description: '魂晶×1' },
    11: { item: '灵石', count: 600, description: '600灵石' },
    12: { item: 'refined_iron', count: 3, description: '精炼铁×3' },
    13: { item: '灵石', count: 700, description: '700灵石' },
    14: { item: 'jade', count: 5, description: '玉石×5' },
    15: { item: 'spirit_stone', count: 2, description: '魂晶×2' },
    16: { item: '灵石', count: 800, description: '800灵石' },
    17: { item: 'fire_essence', count: 2, description: '火焰精华×2' },
    18: { item: '灵石', count: 900, description: '900灵石' },
    19: { item: 'thunder_crystal', count: 2, description: '雷晶×2' },
    20: { item: 'spirit_stone', count: 3, description: '魂晶×3' },
    21: { item: '灵石', count: 1000, description: '1000灵石' },
    22: { item: 'dragon_scale', count: 2, description: '龙鳞×2' },
    23: { item: '灵石', count: 1200, description: '1200灵石' },
    24: { item: 'fire_essence', count: 3, description: '火焰精华×3' },
    25: { item: 'spirit_stone', count: 5, description: '魂晶×5' },
    26: { item: '灵石', count: 1400, description: '1400灵石' },
    27: { item: 'jade', count: 10, description: '玉石×10' },
    28: { item: '灵石', count: 1600, description: '1600灵石' },
    29: { item: 'thunder_crystal', count: 3, description: '雷晶×3' },
    30: { item: '灵石', count: 3000, description: '3000灵石' }
  }
};

// 每级所需经验
const EXP_PER_LEVEL = {
  1: 100, 2: 150, 3: 200, 4: 250, 5: 300,
  6: 350, 7: 400, 8: 450, 9: 500, 10: 600,
  11: 650, 12: 700, 13: 750, 14: 800, 15: 850,
  16: 900, 17: 950, 18: 1000, 19: 1100, 20: 1200,
  21: 1300, 22: 1400, 23: 1500, 24: 1600, 25: 1800,
  26: 2000, 27: 2200, 28: 2400, 29: 2600, 30: 3000
};

// 战令购买价格
const PASS_PRICE = 300; // 钻石

// ============================================================
// 辅助函数
// ============================================================
function getPlayerSeasonData(playerId, seasonId = CURRENT_SEASON.id) {
  if (!db) return null;
  try {
    const stmt = db.prepare('SELECT * FROM season_pass WHERE player_id = ? AND season_id = ?');
    return stmt.get(playerId, seasonId);
  } catch (e) {
    return null;
  }
}

function getOrCreatePlayerSeason(playerId, seasonId = CURRENT_SEASON.id) {
  if (!db) return null;
  let data = getPlayerSeasonData(playerId, seasonId);
  if (!data) {
    try {
      const stmt = db.prepare('INSERT INTO season_pass (player_id, season_id, level, exp, purchased) VALUES (?, ?, 1, 0, 0)');
      stmt.run(playerId, seasonId);
      data = getPlayerSeasonData(playerId, seasonId);
    } catch (e) {
      // 可能已创建
      data = getPlayerSeasonData(playerId, seasonId);
    }
  }
  return data;
}

function isLevelClaimed(playerId, seasonId, level) {
  if (!db) return false;
  try {
    const stmt = db.prepare('SELECT 1 FROM season_pass_claims WHERE player_id = ? AND season_id = ? AND level = ?');
    return !!stmt.get(playerId, seasonId, level);
  } catch (e) {
    return false;
  }
}

function claimLevel(playerId, seasonId, level) {
  if (!db) return false;
  try {
    const stmt = db.prepare('INSERT OR IGNORE INTO season_pass_claims (player_id, season_id, level) VALUES (?, ?, ?)');
    return stmt.run(playerId, seasonId, level).changes > 0;
  } catch (e) {
    return false;
  }
}

function getExpToNextLevel(currentLevel) {
  return EXP_PER_LEVEL[currentLevel] || 1000;
}

function calculateLevelFromExp(totalExp) {
  let level = 1;
  let remaining = totalExp;
  for (let i = 1; i <= 30; i++) {
    const needed = EXP_PER_LEVEL[i] || 1000;
    if (remaining >= needed) {
      remaining -= needed;
      level = i + 1;
    } else {
      break;
    }
  }
  return Math.min(level, 30);
}

// ============================================================
// 路由
// ============================================================

// GET / - 战令概览
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: '战令系统 API',
    season: {
      id: CURRENT_SEASON.id,
      name: CURRENT_SEASON.name,
      start_time: CURRENT_SEASON.start_time,
      end_time: CURRENT_SEASON.end_time
    },
    endpoints: {
      'GET /status': '获取玩家战令状态',
      'POST /purchase': '购买战令 {player_id, diamonds}',
      'POST /claim/:level': '领取指定等级奖励'
    }
  });
});

// GET /status - 获取玩家战令状态
router.get('/status', (req, res) => {
  const playerId = parseInt(req.query.player_id || req.query.playerId || req.query.userId || 1);
  const seasonId = CURRENT_SEASON.id;

  const data = getOrCreatePlayerSeason(playerId, seasonId);

  if (!data) {
    return res.json({ success: false, message: '无法获取战令数据' });
  }

  // 获取已领取的等级
  const claimedLevels = [];
  if (db) {
    try {
      const stmt = db.prepare('SELECT level FROM season_pass_claims WHERE player_id = ? AND season_id = ?');
      const rows = stmt.all(playerId, seasonId);
      rows.forEach(r => claimedLevels.push(r.level));
    } catch (e) {
      // ignore
    }
  }

  // 计算当前等级
  const currentLevel = data.level;
  const expToNext = getExpToNextLevel(currentLevel);
  const expInCurrentLevel = data.exp % expToNext || data.exp;

  // 构build级奖励列表
  const rewards = [];
  for (let i = 1; i <= 30; i++) {
    const freeReward = SEASON_REWARDS.free[i] || { description: '未知奖励' };
    const premiumReward = SEASON_REWARDS.premium[i] || { description: '未知奖励' };
    rewards.push({
      level: i,
      free: {
        ...freeReward,
        claimed: claimedLevels.includes(i) && !data.purchased ? false : claimedLevels.includes(i),
        available: i <= currentLevel && !claimedLevels.includes(i)
      },
      premium: {
        ...premiumReward,
        claimed: claimedLevels.includes(i) && data.purchased ? true : false,
        available: data.purchased && i <= currentLevel && !claimedLevels.includes(i)
      }
    });
  }

  res.json({
    success: true,
    season: {
      id: CURRENT_SEASON.id,
      name: CURRENT_SEASON.name,
      start_time: CURRENT_SEASON.start_time,
      end_time: CURRENT_SEASON.end_time,
      status: new Date() < new Date(CURRENT_SEASON.end_time) ? 'active' : 'ended'
    },
    player: {
      playerId: data.player_id,
      level: currentLevel,
      exp: data.exp,
      expToNext: expToNext,
      expInCurrentLevel: expInCurrentLevel,
      purchased: !!data.purchased,
      claimedLevels: claimedLevels
    },
    rewards: rewards,
    maxLevel: 30
  });
});

// POST /purchase - 购买战令
router.post('/purchase', (req, res) => {
  const playerId = parseInt(req.body.player_id || req.body.playerId || req.body.userId || 1);
  const diamonds = parseInt(req.body.diamonds || 0);
  const seasonId = CURRENT_SEASON.id;

  if (diamonds < PASS_PRICE) {
    return res.json({ success: false, message: `钻石不足，需要 ${PASS_PRICE} 钻石` });
  }

  const data = getOrCreatePlayerSeason(playerId, seasonId);
  if (!data) {
    return res.json({ success: false, message: '无法获取战令数据' });
  }

  if (data.purchased) {
    return res.json({ success: false, message: '当前赛季已购买战令' });
  }

  // 扣钻石
  if (db) {
    try {
      const updateUser = db.prepare('UPDATE Users SET diamonds = diamonds - ? WHERE id = ? AND diamonds >= ?');
      const result = updateUser.run(PASS_PRICE, playerId, PASS_PRICE);
      if (result.changes === 0) {
        return res.json({ success: false, message: '钻石扣除失败，余额可能不足' });
      }

      // 更新战令购买状态
      const updatePass = db.prepare("UPDATE season_pass SET purchased = 1, updated_at = datetime('now') WHERE player_id = ? AND season_id = ?");
      updatePass.run(playerId, seasonId);
    } catch (e) {
      console.log('[season_pass] 购买失败:', e.message);
      return res.json({ success: false, message: '购买失败: ' + e.message });
    }
  }

  res.json({
    success: true,
    message: '战令购买成功！',
    purchased: true,
    playerId: playerId,
    seasonId: seasonId,
    bonus: SEASON_REWARDS.premium[1]
  });
});

// POST /claim/:level - 领取指定等级奖励
router.post('/claim/:level', (req, res) => {
  const playerId = parseInt(req.body.player_id || req.body.playerId || req.body.userId || 1);
  const level = parseInt(req.params.level || req.body.level || 1);
  const seasonId = CURRENT_SEASON.id;

  if (level < 1 || level > 30) {
    return res.json({ success: false, message: '无效的等级' });
  }

  const data = getOrCreatePlayerSeason(playerId, seasonId);
  if (!data) {
    return res.json({ success: false, message: '无法获取战令数据' });
  }

  const currentLevel = data.level;
  if (level > currentLevel) {
    return res.json({ success: false, message: `等级未达到，需要 ${level} 级才能领取` });
  }

  if (isLevelClaimed(playerId, seasonId, level)) {
    return res.json({ success: false, message: '该等级奖励已领取' });
  }

  // 检查是否需要战令才能领取
  const freeReward = SEASON_REWARDS.free[level];
  const premiumReward = SEASON_REWARDS.premium[level];

  if (!freeReward) {
    return res.json({ success: false, message: '奖励配置不存在' });
  }

  // 只能领取免费奖励，或者战令用户领取专属奖励
  let rewardItem = freeReward;
  let isPremium = false;

  if (data.purchased && premiumReward) {
    rewardItem = premiumReward;
    isPremium = true;
  }

  // 写入领取记录
  if (!claimLevel(playerId, seasonId, level)) {
    return res.json({ success: false, message: '领取失败，可能已领取' });
  }

  // 发放奖励
  if (db) {
    try {
      if (rewardItem.item === '灵石') {
        const updateLingshi = db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?');
        updateLingshi.run(rewardItem.count, playerId);
      } else if (rewardItem.item === 'diamonds') {
        const updateDiamonds = db.prepare('UPDATE Users SET diamonds = diamonds + ? WHERE id = ?');
        updateDiamonds.run(rewardItem.count, playerId);
      } else if (rewardItem.item === '经验') {
        // 经验奖励直接加到 Users.level 相关字段或另存
        // 这里记录到 season_pass exp 作为额外经验
        const updateExp = db.prepare('UPDATE season_pass SET exp = exp + ? WHERE player_id = ? AND season_id = ?');
        updateExp.run(rewardItem.count, playerId, seasonId);
      } else {
        // 物品写入 player_items
        const addItem = db.prepare(`INSERT INTO player_items (player_id, item_name, item_type, icon, count, source) VALUES (?, ?, ?, ?, ?, ?)`);
        addItem.run(playerId, rewardItem.description, rewardItem.item, '', rewardItem.count, 'season_pass');
      }
    } catch (e) {
      console.log('[season_pass] 发放奖励失败:', e.message);
    }
  }

  res.json({
    success: true,
    message: `成功领取 ${level} 级奖励！`,
    level: level,
    reward: rewardItem,
    isPremium: isPremium,
    playerId: playerId
  });
});

// POST /add-exp - 增加经验（其他系统调用）
router.post('/add-exp', (req, res) => {
  const playerId = parseInt(req.body.player_id || req.body.playerId || req.body.userId || 1);
  const expGain = parseInt(req.body.exp || 0);
  const seasonId = CURRENT_SEASON.id;

  if (expGain <= 0) {
    return res.json({ success: false, message: '经验值无效' });
  }

  const data = getOrCreatePlayerSeason(playerId, seasonId);
  if (!data) {
    return res.json({ success: false, message: '无法获取战令数据' });
  }

  if (db) {
    try {
      // 增加经验
      const updateExp = db.prepare("UPDATE season_pass SET exp = exp + ?, updated_at = datetime('now') WHERE player_id = ? AND season_id = ?");
      updateExp.run(expGain, playerId, seasonId);

      // 重新获取数据检查是否升级
      const newData = getPlayerSeasonData(playerId, seasonId);
      const newLevel = calculateLevelFromExp(newData.exp);

      let leveledUp = false;
      if (newLevel > data.level) {
        const updateLevel = db.prepare('UPDATE season_pass SET level = ? WHERE player_id = ? AND season_id = ?');
        updateLevel.run(newLevel, playerId, seasonId);
        leveledUp = true;
      }

      res.json({
        success: true,
        expGained: expGain,
        totalExp: newData.exp,
        level: leveledUp ? newLevel : data.level,
        leveledUp: leveledUp
      });
    } catch (e) {
      console.log('[season_pass] 增加经验失败:', e.message);
      res.json({ success: false, message: e.message });
    }
  } else {
    res.json({ success: false, message: '数据库未连接' });
  }
});

module.exports = router;
