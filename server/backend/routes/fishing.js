const express = require('express');
const router = express.Router();
const path = require('path');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db = null;
function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode=WAL');
    db.pragma('busy_timeout=5000');
    initTables();
  }
  return db;
}

function initTables() {
  const localDb = db;
  localDb.exec(`
    CREATE TABLE IF NOT EXISTS fishing_fish_types (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT,
      rarity TEXT DEFAULT 'common',
      rarity_weight INTEGER DEFAULT 1,
      min_level INTEGER DEFAULT 1,
      sell_price INTEGER DEFAULT 5,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS fishing_ponds (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT,
      min_level INTEGER DEFAULT 1,
      cost INTEGER DEFAULT 0,
      bite_rate REAL DEFAULT 0.5,
      rare_chance REAL DEFAULT 0.1,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS fishing_player_stats (
      player_id INTEGER PRIMARY KEY,
      total_catches INTEGER DEFAULT 0,
      total_points INTEGER DEFAULT 0,
      rod_level INTEGER DEFAULT 1,
      rod_exp INTEGER DEFAULT 0,
      rod_durability INTEGER DEFAULT 100,
      rod_max_durability INTEGER DEFAULT 100,
      biggest_catch TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fishing_fish_collection (
      player_id INTEGER,
      fish_id INTEGER,
      total_count INTEGER DEFAULT 0,
      best_weight REAL DEFAULT 0,
      first_caught_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY(player_id, fish_id)
    );

    CREATE TABLE IF NOT EXISTS fishing_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      fish_id INTEGER,
      fish_name TEXT,
      rarity TEXT,
      sell_price INTEGER,
      pond_id INTEGER,
      caught_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fishing_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      fish_id INTEGER NOT NULL,
      fish_name TEXT NOT NULL,
      rarity TEXT DEFAULT 'common',
      weight REAL DEFAULT 1.0,
      sell_price INTEGER DEFAULT 5,
      count INTEGER DEFAULT 1,
      first_caught_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fishing_active_cast (
      player_id INTEGER PRIMARY KEY,
      pond_id INTEGER,
      expires_at TEXT
    );
  `);

  const fishCount = localDb.prepare('SELECT COUNT(*) as c FROM fishing_fish_types').get();
  if (fishCount.c === 0) {
    const insertFish = localDb.prepare(
      'INSERT INTO fishing_fish_types (id, name, icon, rarity, rarity_weight, min_level, sell_price, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const fishTypes = [
      [1, '锦鲤', '🐟', 'common', 30, 1, 5, '普通的淡水鱼，常见于各池塘'],
      [2, '金鳞鲤', '🐠', 'common', 25, 1, 8, '金色鳞片的鲤鱼，稍有价值'],
      [3, '银月鱼', '🐡', 'rare', 15, 3, 20, '月光下银光闪闪的珍稀鱼种'],
      [4, '青龙鳜', '🐟', 'rare', 10, 5, 35, '传说中青龙化身的鳜鱼'],
      [5, '七彩神仙鱼', '🦈', 'epic', 6, 8, 80, '七彩斑斓，极为罕见的神仙鱼'],
      [6, '九幽魔鲟', '🐲', 'epic', 4, 10, 150, '来自深渊的魔性鲟鱼'],
      [7, '龙宫金枪鱼', '🐋', 'legendary', 2, 15, 500, '龙宫中豢养的金色枪鱼，稀世珍品'],
      [8, '天外飞仙鱼', '🧜', 'legendary', 1, 20, 1000, '传说是从天上坠落的仙鱼，食之可飞升'],
      [9, '草鱼', '🐟', 'common', 20, 1, 3, '最普通的淡水草鱼'],
      [10, '鲈鱼', '🐟', 'common', 18, 2, 6, '鲜美的鲈鱼，钓鱼人的最爱'],
      [11, '鳗鱼', '🐍', 'rare', 8, 6, 40, '身形如蛇的鳗鱼，电击感强烈'],
      [12, '巨型石斑', '🦈', 'epic', 3, 12, 200, '深海巨型石斑，鱼中之王'],
    ];
    const insertMany = localDb.transaction((items) => {
      for (const item of items) insertFish.run(...item);
    });
    insertMany(fishTypes);
  }

  const pondCount = localDb.prepare('SELECT COUNT(*) as c FROM fishing_ponds').get();
  if (pondCount.c === 0) {
    const insertPond = localDb.prepare(
      'INSERT INTO fishing_ponds (id, name, icon, min_level, cost, bite_rate, rare_chance, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const ponds = [
      [1, '新手鱼塘', '🌊', 1, 0, 0.7, 0.05, '新手村附近的鱼塘，适合初学者'],
      [2, '灵泉湖泊', '💧', 3, 10, 0.55, 0.10, '灵气充沛的湖泊，容易钓到稀有鱼种'],
      [3, '碧波潭', '🌊', 6, 20, 0.45, 0.15, '深不见底的碧绿潭水，有惊喜'],
      [4, '龙宫浅海', '🌊', 10, 50, 0.35, 0.22, '通往龙宫的浅海区域，传说有仙鱼出没'],
      [5, '天外星河', '✨', 15, 100, 0.25, 0.35, '天外来的河流，有缘者可得飞仙鱼'],
    ];
    const insertPonds = localDb.transaction((items) => {
      for (const item of items) insertPond.run(...item);
    });
    insertPonds(ponds);
  }
}

function getPlayerStats(playerId) {
  const localDb = getDb();
  let stats = localDb.prepare('SELECT * FROM fishing_player_stats WHERE player_id = ?').get(playerId);
  if (!stats) {
    localDb.prepare('INSERT INTO fishing_player_stats (player_id) VALUES (?)').run(playerId);
    stats = localDb.prepare('SELECT * FROM fishing_player_stats WHERE player_id = ?').get(playerId);
  }
  return stats;
}

function extractUserId(req) {
  return parseInt(req.body?.player_id || req.body?.userId || req.query?.player_id || req.query?.userId || req.userId || 1);
}

// GET /api/fishing/ - root info
router.get('/', (req, res) => {
  try {
    const userId = extractUserId(req);
    const stats = getPlayerStats(userId);
    const ponds = getDb().prepare('SELECT * FROM fishing_ponds ORDER BY min_level').all();
    const fishTypes = getDb().prepare('SELECT id, name, icon, rarity, min_level, sell_price, description FROM fishing_fish_types ORDER BY min_level').all();
    res.json({
      success: true,
      stats: {
        totalCatches: stats.total_catches,
        totalPoints: stats.total_points,
        rodLevel: stats.rod_level,
        biggestCatch: stats.biggest_catch
      },
      ponds,
      fishTypes
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// GET /api/fishing/types - fish species info
router.get('/types', (req, res) => {
  try {
    const fishTypes = getDb().prepare(
      'SELECT id, name, icon, rarity, rarity_weight, min_level, sell_price, description FROM fishing_fish_types ORDER BY min_level, rarity_weight DESC'
    ).all();
    res.json({ success: true, fishTypes });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// GET /api/fishing/ponds - list fishing spots
router.get('/ponds', (req, res) => {
  try {
    const userId = extractUserId(req);
    const ponds = getDb().prepare('SELECT * FROM fishing_ponds ORDER BY min_level').all();
    res.json({ success: true, ponds });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// GET /api/fishing/stats - player stats
router.get('/stats', (req, res) => {
  try {
    const userId = extractUserId(req);
    const stats = getPlayerStats(userId);
    const totalCatch = getDb().prepare('SELECT COUNT(*) as c FROM fishing_records WHERE player_id = ?').get(userId);
    const totalRare = getDb().prepare("SELECT COUNT(*) as c FROM fishing_records WHERE player_id = ? AND rarity IN ('rare','epic','legendary')").get(userId);
    const recentRecords = getDb().prepare(
      'SELECT fish_name, rarity, sell_price, caught_at FROM fishing_records WHERE player_id = ? ORDER BY id DESC LIMIT 10'
    ).all(userId);
    res.json({
      success: true,
      stats: {
        totalCatches: totalCatch.c,
        totalRare: totalRare.c,
        totalPoints: stats.total_points,
        rodLevel: stats.rod_level,
        biggestCatch: stats.biggest_catch,
        recentRecords
      }
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// GET /api/fishing/inventory - player's fish inventory
router.get('/inventory', (req, res) => {
  try {
    const userId = extractUserId(req);
    const inventory = getDb().prepare(
      'SELECT id, fish_id, fish_name, rarity, weight, sell_price, count, first_caught_at FROM fishing_inventory WHERE player_id = ? ORDER BY sell_price DESC'
    ).all(userId);
    const totalValue = getDb().prepare('SELECT SUM(sell_price * count) as total FROM fishing_inventory WHERE player_id = ?').get(userId);
    res.json({
      success: true,
      inventory,
      totalValue: totalValue.total || 0
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/fishing/cast - cast fishing line
router.post('/cast', (req, res) => {
  try {
    const userId = extractUserId(req);
    const pondId = parseInt(req.body.pond_id || req.body.pondId || 1);

    const pond = getDb().prepare('SELECT * FROM fishing_ponds WHERE id = ?').get(pondId);
    if (!pond) {
      return res.json({ success: false, message: '钓鱼区域不存在' });
    }

    // Check if player already has an active cast
    const active = getDb().prepare('SELECT * FROM fishing_active_cast WHERE player_id = ?').get(userId);
    if (active) {
      const now = Date.now();
      const expiresAt = new Date(active.expires_at).getTime();
      if (now < expiresAt) {
        const remaining = Math.ceil((expiresAt - now) / 1000);
        return res.json({
          success: true,
          message: '鱼漂已在水中',
          waiting: true,
          remainingSeconds: remaining,
          pondId: active.pond_id
        });
      }
    }

    // Check cost
    if (pond.cost > 0) {
      const player = getDb().prepare('SELECT lingshi FROM Users WHERE id = ?').get(userId);
      if (!player || player.lingshi < pond.cost) {
        return res.json({ success: false, message: `灵石不足，需要${pond.cost}灵石` });
      }
      getDb().prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(pond.cost, userId);
    }

    // Calculate bite time (rod level reduces wait)
    const stats = getPlayerStats(userId);
    const rodBonus = (stats.rod_level - 1) * 0.05;
    const baseWaitSecs = 8;
    const waitSecs = Math.max(3, Math.round(baseWaitSecs * (1 - rodBonus)));

    const nowStr = new Date().toISOString();
    const expiresAt = new Date(Date.now() + waitSecs * 1000).toISOString();

    getDb().prepare(
      'INSERT OR REPLACE INTO fishing_active_cast (player_id, pond_id, expires_at) VALUES (?, ?, ?)'
    ).run(userId, pondId, expiresAt);

    res.json({
      success: true,
      message: `鱼钩入水，请在 ${waitSecs} 秒后尝试收竿`,
      waiting: true,
      remainingSeconds: waitSecs,
      pondId,
      cost: pond.cost
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/fishing/reel - reel in / catch fish
router.post('/reel', (req, res) => {
  try {
    const userId = extractUserId(req);

    const active = getDb().prepare('SELECT * FROM fishing_active_cast WHERE player_id = ?').get(userId);
    if (!active) {
      return res.json({ success: false, message: '你还没有下竿，请先 /cast' });
    }

    const now = Date.now();
    const expiresAt = new Date(active.expires_at).getTime();

    const pond = getDb().prepare('SELECT * FROM fishing_ponds WHERE id = ?').get(active.pond_id);
    const stats = getPlayerStats(userId);

    const hasBite = now >= expiresAt - 1000;
    if (!hasBite) {
      const remaining = Math.ceil((expiresAt - now) / 1000);
      return res.json({
        success: true,
        message: `鱼还没咬钩，还需等待 ${remaining} 秒`,
        waiting: true,
        remainingSeconds: remaining
      });
    }

    // Clear active cast
    getDb().prepare('DELETE FROM fishing_active_cast WHERE player_id = ?').run(userId);

    // Calculate catch success
    const rodBonus = (stats.rod_level - 1) * 0.08;
    const pondRareBonus = pond.rare_chance;
    const successRate = Math.min(0.95, 0.5 + rodBonus);
    const roll = Math.random();

    if (roll > successRate) {
      return res.json({
        success: true,
        caught: false,
        message: '鱼挣脱了钩子，逃跑啦！'
      });
    }

    // Determine fish rarity
    const rareRoll = Math.random();
    let rarity = 'common';

    if (rareRoll < 0.01 && stats.rod_level >= 20) {
      rarity = 'legendary';
    } else if (rareRoll < 0.05 + pondRareBonus * 0.3 && stats.rod_level >= 10) {
      rarity = 'epic';
    } else if (rareRoll < 0.15 + pondRareBonus && stats.rod_level >= 5) {
      rarity = 'rare';
    }

    // Get eligible fish
    const eligibleFish = getDb().prepare(
      "SELECT * FROM fishing_fish_types WHERE min_level <= ? AND (rarity = ? OR rarity = 'common' OR rarity = 'rare') ORDER BY RANDOM()"
    ).all(Math.min(stats.rod_level + 5, 20), rarity);

    // Fallback: any fish at appropriate level
    const fish = eligibleFish.length > 0
      ? eligibleFish[0]
      : getDb().prepare('SELECT * FROM fishing_fish_types WHERE min_level <= ? ORDER BY RANDOM() LIMIT 1').get(stats.rod_level + 3);

    if (!fish) {
      return res.json({ success: true, caught: false, message: '今天运气不好，什么也没钓到' });
    }

    const weight = parseFloat((Math.random() * 2 + 0.5).toFixed(1));
    const finalPrice = Math.round(fish.sell_price * weight);

    // Record catch
    getDb().prepare(
      'INSERT INTO fishing_records (player_id, fish_id, fish_name, rarity, sell_price, pond_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(userId, fish.id, fish.name, rarity, finalPrice, pond.id);

    // Update inventory
    const existing = getDb().prepare('SELECT * FROM fishing_inventory WHERE player_id = ? AND fish_id = ?').get(userId, fish.id);
    if (existing) {
      const newCount = existing.count + 1;
      const newAvgWeight = parseFloat((((existing.weight * existing.count) + weight) / newCount).toFixed(1));
      getDb().prepare(
        'UPDATE fishing_inventory SET count = ?, weight = ? WHERE player_id = ? AND fish_id = ?'
      ).run(newCount, newAvgWeight, userId, fish.id);
    } else {
      getDb().prepare(
        'INSERT INTO fishing_inventory (player_id, fish_id, fish_name, rarity, weight, sell_price, count) VALUES (?, ?, ?, ?, ?, ?, 1)'
      ).run(userId, fish.id, fish.name, rarity, weight, finalPrice);
    }

    // Update player stats
    getDb().prepare(
      'UPDATE fishing_player_stats SET total_catches = total_catches + 1, total_points = total_points + ? WHERE player_id = ?'
    ).run(finalPrice, userId);

    if (!stats.biggestCatch || finalPrice > (parseInt(stats.biggest_catch) || 0)) {
      getDb().prepare('UPDATE fishing_player_stats SET biggest_catch = ? WHERE player_id = ?').run(fish.name, userId);
    }

    res.json({
      success: true,
      caught: true,
      fish: {
        id: fish.id,
        name: fish.name,
        icon: fish.icon,
        rarity,
        weight,
        sellPrice: finalPrice
      },
      message: `恭喜钓到了 ${fish.icon} ${fish.name}！重量 ${weight}kg，价值 ${finalPrice} 灵石`
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/fishing/sell - sell fish from inventory
router.post('/sell', (req, res) => {
  try {
    const userId = extractUserId(req);
    const fishId = parseInt(req.body.fish_id || req.body.fishId);
    const count = parseInt(req.body.count || 1);

    if (!fishId) {
      return res.json({ success: false, message: '缺少 fish_id 参数' });
    }

    const item = getDb().prepare('SELECT * FROM fishing_inventory WHERE player_id = ? AND fish_id = ?').get(userId, fishId);
    if (!item) {
      return res.json({ success: false, message: '背包中没有该鱼类' });
    }

    const sellCount = Math.min(count, item.count);
    const totalPrice = item.sell_price * sellCount;

    if (sellCount >= item.count) {
      getDb().prepare('DELETE FROM fishing_inventory WHERE player_id = ? AND fish_id = ?').run(userId, fishId);
    } else {
      getDb().prepare('UPDATE fishing_inventory SET count = count - ? WHERE player_id = ? AND fish_id = ?').run(sellCount, userId, fishId);
    }

    getDb().prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(totalPrice, userId);

    res.json({
      success: true,
      sold: sellCount,
      totalPrice,
      message: `成功出售 ${sellCount} 条 ${item.fish_name}，获得 ${totalPrice} 灵石`
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/fishing/upgrade - upgrade fishing rod
router.post('/upgrade', (req, res) => {
  try {
    const userId = extractUserId(req);
    const stats = getPlayerStats(userId);
    const currentLevel = stats.rod_level || 1;
    const nextLevel = currentLevel + 1;
    const upgradeCost = nextLevel * 100;

    const player = getDb().prepare('SELECT lingshi FROM Users WHERE id = ?').get(userId);
    if (!player || player.lingshi < upgradeCost) {
      return res.json({ success: false, message: `升级需要 ${upgradeCost} 灵石，当前余额不足` });
    }

    getDb().prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(upgradeCost, userId);
    getDb().prepare('UPDATE fishing_player_stats SET rod_level = ? WHERE player_id = ?').run(nextLevel, userId);

    res.json({
      success: true,
      newRodLevel: nextLevel,
      cost: upgradeCost,
      message: `鱼竿升级到 Lv.${nextLevel}！消耗 ${upgradeCost} 灵石。效果：下竿冷却减少${((nextLevel-1)*5).toFixed(0)}%，稀有鱼概率+${((nextLevel-1)*2).toFixed(0)}%`
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// GET /api/fishing/history - catch history
router.get('/history', (req, res) => {
  try {
    const userId = extractUserId(req);
    const limit = parseInt(req.query.limit || 20);
    const records = getDb().prepare(
      'SELECT id, fish_name, rarity, sell_price, caught_at FROM fishing_records WHERE player_id = ? ORDER BY id DESC LIMIT ?'
    ).all(userId, limit);
    res.json({ success: true, records });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// GET /api/fishing/rod - 鱼竿信息/耐久
router.get('/rod', (req, res) => {
  try {
    const userId = extractUserId(req);
    const stats = getPlayerStats(userId);
    const rodLevel = stats.rod_level || 1;
    const rodExp = stats.rod_exp || 0;
    const durability = stats.rod_durability ?? 100;
    const maxDurability = stats.rod_max_durability ?? 100;

    // 计算下一级所需经验
    const nextLevel = rodLevel + 1;
    const rodConfig = [
      { level: 1, name: '木制鱼竿', exp: 0 },
      { level: 2, name: '竹制鱼竿', exp: 100 },
      { level: 3, name: '铁制鱼竿', exp: 300 },
      { level: 4, name: '精钢鱼竿', exp: 600 },
      { level: 5, name: '白银鱼竿', exp: 1000 },
      { level: 6, name: '黄金鱼竿', exp: 1500 },
      { level: 7, name: '灵玉鱼竿', exp: 2200 },
      { level: 8, name: '龙魂鱼竿', exp: 3000 },
      { level: 9, name: '天蚕鱼竿', exp: 4000 },
      { level: 10, name: '仙灵鱼竿', exp: 5200 },
    ];
    const currentRod = rodConfig.find(r => r.level === rodLevel) || rodConfig[0];
    const nextRod = rodConfig.find(r => r.level === nextLevel);
    const expForNext = nextRod ? nextRod.exp : null;
    const expProgress = expForNext ? Math.floor((rodExp / expForNext) * 100) : 100;

    res.json({
      success: true,
      rod: {
        level: rodLevel,
        name: currentRod.name,
        exp: rodExp,
        expForNext,
        expProgress,
        durability,
        maxDurability,
        catchRateBonus: ((rodLevel - 1) * 8).toFixed(0) + '%',
        waitReduction: ((rodLevel - 1) * 5).toFixed(0) + '%',
      },
      upgrades: nextRod ? {
        level: nextLevel,
        name: nextRod.name,
        cost: rodLevel * 100,
      } : null,
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/fishing/upgrade-rod - 升级鱼竿
router.post('/upgrade-rod', (req, res) => {
  try {
    const userId = extractUserId(req);
    const stats = getPlayerStats(userId);
    const currentLevel = stats.rod_level || 1;

    if (currentLevel >= 10) {
      return res.json({ success: false, message: '鱼竿已达到最高等级' });
    }

    const upgradeCost = currentLevel * 100;
    const player = getDb().prepare('SELECT lingshi FROM Users WHERE id = ?').get(userId);
    if (!player || player.lingshi < upgradeCost) {
      return res.json({ success: false, message: `升级需要 ${upgradeCost} 灵石，当前余额不足` });
    }

    const newLevel = currentLevel + 1;
    const rodNames = ['', '木制鱼竿', '竹制鱼竿', '铁制鱼竿', '精钢鱼竿', '白银鱼竿', '黄金鱼竿', '灵玉鱼竿', '龙魂鱼竿', '天蚕鱼竿', '仙灵鱼竿'];
    const newMaxDurability = 100 + (newLevel - 1) * 20;

    getDb().prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(upgradeCost, userId);
    getDb().prepare(
      'UPDATE fishing_player_stats SET rod_level = ?, rod_exp = 0, rod_max_durability = ?, rod_durability = ? WHERE player_id = ?'
    ).run(newLevel, newMaxDurability, newMaxDurability, userId);

    res.json({
      success: true,
      newLevel,
      name: rodNames[newLevel],
      cost: upgradeCost,
      maxDurability: newMaxDurability,
      catchRateBonus: ((newLevel - 1) * 8) + '%',
      waitReduction: ((newLevel - 1) * 5) + '%',
      message: `鱼竿升级为【${rodNames[newLevel]}】！消耗 ${upgradeCost} 灵石`,
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// GET /api/fishing/collection - 鱼类图鉴
router.get('/collection', (req, res) => {
  try {
    const userId = extractUserId(req);

    // 获取所有鱼种
    const allFish = getDb().prepare(
      'SELECT id, name, icon, rarity, min_level, sell_price, description FROM fishing_fish_types ORDER BY min_level, id'
    ).all();

    // 获取玩家已收集的
    const collected = getDb().prepare(
      'SELECT fish_id, total_count, best_weight, first_caught_at FROM fishing_fish_collection WHERE player_id = ?'
    ).all(userId);
    const collectedMap = {};
    for (const c of collected) collectedMap[c.fish_id] = c;

    // 统计
    const totalTypes = allFish.length;
    const caughtTypes = collected.length;
    const totalFish = getDb().prepare('SELECT SUM(total_count) as total FROM fishing_fish_collection WHERE player_id = ?').get(userId);

    const collection = allFish.map(fish => ({
      id: fish.id,
      name: fish.name,
      icon: fish.icon,
      rarity: fish.rarity,
      minLevel: fish.min_level,
      sellPrice: fish.sell_price,
      description: fish.description,
      collected: !!collectedMap[fish.id],
      count: collectedMap[fish.id]?.total_count || 0,
      bestWeight: collectedMap[fish.id]?.best_weight || null,
      firstCaughtAt: collectedMap[fish.id]?.first_caught_at || null,
    }));

    res.json({
      success: true,
      summary: {
        totalTypes,
        caughtTypes,
        completionRate: totalTypes > 0 ? ((caughtTypes / totalTypes) * 100).toFixed(1) + '%' : '0%',
        totalFishCaught: totalFish.total || 0,
      },
      collection,
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// GET /api/fishing/locations - 钓鱼地点列表
router.get('/locations', (req, res) => {
  try {
    const userId = extractUserId(req);
    const stats = getPlayerStats(userId);
    const playerLevel = stats.rod_level || 1;
    const ponds = getDb().prepare('SELECT * FROM fishing_ponds ORDER BY min_level').all();

    const locations = ponds.map(p => ({
      id: p.id,
      name: p.name,
      icon: p.icon,
      minLevel: p.min_level,
      cost: p.cost,
      biteRate: p.bite_rate,
      rareChance: p.rare_chance,
      description: p.description,
      accessible: playerLevel >= p.min_level,
    }));

    res.json({ success: true, locations });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
