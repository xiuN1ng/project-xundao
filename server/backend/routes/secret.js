const express = require('express');
const router = express.Router();
const path = require('path');

// 数据库路径 (统一使用 backend/data/game.db)
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db = null;
function getDb() {
  if (db) return db;
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  return db;
}

// 初始化密室系统数据库
function initSecretDungeonTables() {
  const database = getDb();
  database.exec(`
    CREATE TABLE IF NOT EXISTS secret_dungeon (
      user_id INTEGER PRIMARY KEY,
      unlocked INTEGER DEFAULT 0,
      unlocked_at TEXT,
      current_floor INTEGER DEFAULT 1,
      highest_floor INTEGER DEFAULT 0,
      weekly_reset_at TEXT,
      last_battle_at TEXT,
      total_battles INTEGER DEFAULT 0,
      total_wins INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS secret_dungeon_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      floor INTEGER NOT NULL,
      result TEXT NOT NULL,
      rewards TEXT,
      fought_at TEXT DEFAULT (datetime('now', '+8 hours'))
    );
  `);
}

// 密室配置：每层敌人属性、消耗、奖励
const FLOOR_CONFIG = [
  { floor: 1,  name: '幽冥入口',    hp: 500,   atk: 50,   cost: 0,    firstReward: 100,  repeatedReward: 30 },
  { floor: 2,  name: '阴魂走廊',   hp: 800,   atk: 80,   cost: 10,   firstReward: 150,  repeatedReward: 45 },
  { floor: 3,  name: '鬼魅大厅',   hp: 1200,  atk: 120,  cost: 20,   firstReward: 200,  repeatedReward: 60 },
  { floor: 4,  name: '亡魂祭坛',   hp: 1800,  atk: 180,  cost: 30,   firstReward: 300,  repeatedReward: 90 },
  { floor: 5,  name: '妖狐密室',   hp: 2500,  atk: 250,  cost: 40,   firstReward: 400,  repeatedReward: 120 },
  { floor: 6,  name: '妖兽之巢',   hp: 3500,  atk: 350,  cost: 50,   firstReward: 550,  repeatedReward: 165 },
  { floor: 7,  name: '炼狱深渊',   hp: 5000,  atk: 500,  cost: 60,   firstReward: 750,  repeatedReward: 225 },
  { floor: 8,  name: '万鬼窟',      hp: 7000,  atk: 700,  cost: 70,   firstReward: 1000, repeatedReward: 300 },
  { floor: 9,  name: '魔君殿堂',   hp: 10000,  atk: 1000, cost: 80,   firstReward: 1400, repeatedReward: 420 },
  { floor: 10, name: '最终密室',   hp: 15000,  atk: 1500, cost: 100,  firstReward: 2000, repeatedReward: 600 },
];

// 获取或初始化玩家密室数据
function getOrCreateSecretDungeon(userId) {
  const database = getDb();
  initSecretDungeonTables();

  let record = database.prepare('SELECT * FROM secret_dungeon WHERE user_id = ?').get(userId);

  if (!record) {
    // 检查本周是否需要重置
    const now = new Date();
    const dayOfWeek = now.getDay();
    const saturday = new Date(now);
    saturday.setDate(now.getDate() + (6 - dayOfWeek) % 7);
    saturday.setHours(0, 0, 0, 0);
    const weeklyReset = saturday.toISOString();

    database.prepare(`
      INSERT INTO secret_dungeon (user_id, unlocked, current_floor, highest_floor, weekly_reset_at)
      VALUES (?, 0, 1, 0, ?)
    `).run(userId, weeklyReset);

    record = database.prepare('SELECT * FROM secret_dungeon WHERE user_id = ?').get(userId);
  }

  // 检查每周重置
  const nowStr = new Date().toISOString();
  if (record.weekly_reset_at && record.weekly_reset_at < nowStr) {
    database.prepare(`
      UPDATE secret_dungeon
      SET current_floor = 1, weekly_reset_at = ?, total_battles = 0, total_wins = 0
      WHERE user_id = ?
    `).run(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), userId);
    record = database.prepare('SELECT * FROM secret_dungeon WHERE user_id = ?').get(userId);
  }

  return record;
}

// 解锁密室
router.post('/unlock', (req, res) => {
  const userId = req.body.userId || req.body.player_id || req.query.userId || 1;
  const unlockCost = 100; // 解锁需要100灵石

  try {
    const database = getDb();
    initSecretDungeonTables();

    const player = database.prepare('SELECT * FROM Users WHERE id = ?').get(userId);
    if (!player) return res.status(404).json({ success: false, message: '玩家不存在' });

    const secret = getOrCreateSecretDungeon(userId);
    if (secret.unlocked) return res.json({ success: false, message: '密室已解锁' });

    if (player.lingshi < unlockCost) {
      return res.json({ success: false, message: `灵石不足，需要${unlockCost}灵石` });
    }

    // 扣灵石
    database.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(unlockCost, userId);

    // 解锁
    database.prepare(`
      UPDATE secret_dungeon
      SET unlocked = 1, unlocked_at = datetime('now', '+8 hours')
      WHERE user_id = ?
    `).run(userId);

    res.json({
      success: true,
      message: '密室解锁成功',
      cost: unlockCost,
      remainingSpiritStones: player.lingshi - unlockCost
    });
  } catch (err) {
    console.error('[secret] unlock error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 进入密室战斗
router.post('/enter', (req, res) => {
  const userId = req.body.userId || req.body.player_id || req.query.userId || 1;

  try {
    const database = getDb();
    initSecretDungeonTables();

    const player = database.prepare('SELECT * FROM Users WHERE id = ?').get(userId);
    if (!player) return res.status(404).json({ success: false, message: '玩家不存在' });

    const secret = getOrCreateSecretDungeon(userId);
    if (!secret.unlocked) return res.json({ success: false, message: '密室未解锁，请先调用 /unlock' });

    const floor = parseInt(req.body.floor) || secret.current_floor;
    const floorIndex = Math.min(floor, FLOOR_CONFIG.length) - 1;
    const config = FLOOR_CONFIG[floorIndex];

    // 检查是否在挑战已通关的最高层（允许重复扫荡）
    if (floor > secret.highest_floor && floor !== secret.current_floor) {
      return res.json({ success: false, message: `请先通关第${secret.current_floor}层` });
    }

    // 扣除挑战消耗（每层固定灵石消耗）
    if (config.cost > 0) {
      if (player.lingshi < config.cost) {
        return res.json({ success: false, message: `灵石不足，需要${config.cost}灵石` });
      }
      database.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(config.cost, userId);
    }

    // 计算战斗结果：玩家战力 vs 敌人
    const playerAtk = player.attack || 50;
    const playerDef = player.defense || 20;
    const playerHp = player.hp || 500;
    const enemyHp = config.hp;
    const enemyAtk = config.atk;

    // 简单回合制：玩家先手，每回合 playerAtk - enemyDef vs enemyHp
    const playerDps = Math.max(1, playerAtk - Math.floor(enemyAtk * 0.3));
    const enemyDps = Math.max(1, enemyAtk - Math.floor(playerDef * 0.5));

    const playerRounds = Math.ceil(enemyHp / playerDps);
    const enemyRounds = Math.ceil(playerHp / enemyDps);

    const victory = playerRounds <= enemyRounds;
    const rewards = [];
    let spiritStonesGained = 0;

    if (victory) {
      const isFirstClear = floor > secret.highest_floor;
      spiritStonesGained = isFirstClear ? config.firstReward : config.repeatedReward;

      // 发放灵石奖励
      database.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(spiritStonesGained, userId);

      // 更新最高层记录
      const newHighest = Math.max(secret.highest_floor, floor);
      const nextFloor = Math.min(floor + 1, FLOOR_CONFIG.length);

      database.prepare(`
        UPDATE secret_dungeon
        SET current_floor = ?,
            highest_floor = ?,
            last_battle_at = datetime('now', '+8 hours'),
            total_battles = total_battles + 1,
            total_wins = total_wins + 1
        WHERE user_id = ?
      `).run(nextFloor, newHighest, userId);

      rewards.push({ type: 'spirit_stones', amount: spiritStonesGained });

      // 记录历史
      database.prepare(`
        INSERT INTO secret_dungeon_history (user_id, floor, result, rewards)
        VALUES (?, ?, 'victory', ?)
      `).run(userId, floor, JSON.stringify(rewards));

      res.json({
        success: true,
        victory: true,
        floor,
        floorName: config.name,
        isFirstClear,
        rewards,
        spiritStonesGained,
        nextFloor: nextFloor > FLOOR_CONFIG.length ? null : nextFloor,
        totalFloats: FLOOR_CONFIG.length
      });
    } else {
      // 战斗失败
      database.prepare(`
        UPDATE secret_dungeon
        SET last_battle_at = datetime('now', '+8 hours'),
            total_battles = total_battles + 1
        WHERE user_id = ?
      `).run(userId);

      database.prepare(`
        INSERT INTO secret_dungeon_history (user_id, floor, result, rewards)
        VALUES (?, ?, 'defeat', NULL)
      `).run(userId, floor);

      res.json({
        success: true,
        victory: false,
        floor,
        floorName: config.name,
        message: `挑战失败！敌方击败了您。还需提升实力后再来挑战。`
      });
    }
  } catch (err) {
    console.error('[secret] enter error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取密室状态
router.get('/status', (req, res) => {
  const userId = req.query.userId || req.query.player_id || 1;

  try {
    const database = getDb();
    initSecretDungeonTables();

    const secret = getOrCreateSecretDungeon(userId);
    const currentConfig = FLOOR_CONFIG[Math.min(secret.current_floor, FLOOR_CONFIG.length) - 1];

    res.json({
      unlocked: !!secret.unlocked,
      currentFloor: secret.current_floor,
      highestFloor: secret.highest_floor,
      totalFloors: FLOOR_CONFIG.length,
      currentFloorName: currentConfig ? currentConfig.name : '未知',
      currentFloorEnemy: currentConfig ? { hp: currentConfig.hp, atk: currentConfig.atk } : null,
      totalBattles: secret.total_battles,
      totalWins: secret.total_wins,
      weeklyResetAt: secret.weekly_reset_at
    });
  } catch (err) {
    console.error('[secret] status error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取密室历史记录
router.get('/history', (req, res) => {
  const userId = req.query.userId || req.query.player_id || 1;
  const limit = parseInt(req.query.limit) || 20;

  try {
    const database = getDb();
    const rows = database.prepare(`
      SELECT * FROM secret_dungeon_history
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT ?
    `).all(userId, limit);

    res.json({ success: true, history: rows });
  } catch (err) {
    console.error('[secret] history error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取密室配置（楼层信息）
router.get('/floors', (req, res) => {
  const userId = req.query.userId || req.query.player_id || 1;

  try {
    const secret = getOrCreateSecretDungeon(userId);
    const floors = FLOOR_CONFIG.map((f, i) => ({
      floor: f.floor,
      name: f.name,
      hp: f.hp,
      atk: f.atk,
      cost: f.cost,
      firstReward: f.firstReward,
      repeatedReward: f.repeatedReward,
      unlocked: i + 1 <= Math.max(1, secret.highest_floor),
      cleared: i + 1 <= secret.highest_floor
    }));

    res.json({ success: true, floors });
  } catch (err) {
    console.error('[secret] floors error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 每周重置（可手动触发）
router.post('/reset-weekly', (req, res) => {
  const userId = req.body.userId || req.body.player_id || 1;

  try {
    const database = getDb();
    const nextSaturday = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    database.prepare(`
      UPDATE secret_dungeon
      SET current_floor = 1, total_battles = 0, total_wins = 0, weekly_reset_at = ?
      WHERE user_id = ?
    `).run(nextSaturday, userId);

    res.json({ success: true, message: '每周重置完成', nextResetAt: nextSaturday });
  } catch (err) {
    console.error('[secret] reset error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 初始化
initSecretDungeonTables();

module.exports = router;
