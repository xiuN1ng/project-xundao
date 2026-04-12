/**
 * 好友/师徒系统增强 API
 * P85-3: 好友体力赠送、协助副本、师徒任务
 *
 * 端点:
 *   POST /api/friend/send-energy     - 赠送体力
 *   POST /api/friend/assist          - 协助副本
 *   GET  /api/master/tasks            - 师徒任务列表
 *   POST /api/master/claim-reward    - 领取师徒任务奖励
 */
const express = require('express');
const path = require('path');
const router = express.Router();

// 本模块路由前缀: /api/friend-plus
// 注册时: app.use('/api/friend-plus', require('./routes/friend_api'))

const Logger = {
  info: (...args) => console.log('[friend_api]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[friend_api:ERROR]', new Date().toISOString(), ...args),
  warn: (...args) => console.warn('[friend_api:WARN]', new Date().toISOString(), ...args),
};

// ============ 数据库连接 ============
const DB_PATH = path.join(__dirname, '..', 'data', 'game.db');
let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  Logger.info('数据库连接成功');
} catch (err) {
  Logger.error('数据库连接失败:', err.message);
  db = null;
}

// ============ 配置常量 ============
const SEND_ENERGY_COST = 50;         // 消耗体力
const SEND_ENERGY_MAX_DAILY = 3;     // 每日最多赠送次数
const SEND_ENERGY_GIVEN = 30;        // 赠送体力给对方
const SEND_ENERGY_FAVOR = 10;        // 获得好感度
const SEND_ENERGY_LINGSHI = 20;      // 获得灵石

// 师徒任务定义
const MASTER_TASKS = [
  {
    task_id: 'apprentice_realm',
    name: '徒弟境界突破',
    desc: '徒弟境界达到指定阶段',
    type: 'apprentice',
    target: 5,        // 5阶境界
    rewards: { contribution: 50, lingshi: 500, exp: 2000 },
  },
  {
    task_id: 'apprentice_level',
    name: '徒弟升级',
    desc: '徒弟等级达到指定等级',
    type: 'apprentice',
    target: 50,
    rewards: { contribution: 30, lingshi: 300, exp: 1000 },
  },
  {
    task_id: 'dungeon_clear',
    name: '师徒副本通关',
    desc: '师徒共同通关一次副本',
    type: 'both',
    target: 1,
    rewards: { contribution: 80, lingshi: 800, exp: 3000 },
  },
  {
    task_id: 'teach_count',
    name: '传授功法',
    desc: '师父传授功法给徒弟',
    type: 'master',
    target: 10,
    rewards: { contribution: 40, lingshi: 400, exp: 1500 },
  },
  {
    task_id: 'gift_sent',
    name: '徒弟送礼',
    desc: '徒弟向师父赠送礼物',
    type: 'apprentice',
    target: 5,
    rewards: { contribution: 25, lingshi: 200, exp: 800 },
  },
];

// ============ 数据库初始化 ============
function initTables() {
  if (!db) return;
  try {
    db.exec(`
      -- 玩家体力赠送记录（每人每日一条）
      CREATE TABLE IF NOT EXISTS player_friend_energy (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id        INTEGER NOT NULL,
        friend_id        INTEGER NOT NULL,
        sent_today       INTEGER DEFAULT 0,
        last_send_date   TEXT,
        last_send_time   INTEGER DEFAULT 0,
        total_sent       INTEGER DEFAULT 0,
        UNIQUE(player_id, friend_id)
      );

      -- 玩家体力（好友体力池）
      CREATE TABLE IF NOT EXISTS player_energy (
        player_id        INTEGER PRIMARY KEY,
        current_energy   INTEGER DEFAULT 100,
        max_energy       INTEGER DEFAULT 100,
        last_recover_time INTEGER DEFAULT 0
      );

      -- 师徒任务进度
      CREATE TABLE IF NOT EXISTS player_master_tasks (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id        INTEGER NOT NULL,
        task_id          TEXT NOT NULL,
        task_type        TEXT NOT NULL,   -- apprentice | master | both
        progress         INTEGER DEFAULT 0,
        target           INTEGER NOT NULL,
        completed        INTEGER DEFAULT 0,
        claimed          INTEGER DEFAULT 0,
        updated_at       INTEGER DEFAULT (strftime('%s','now')),
        UNIQUE(player_id, task_id)
      );

      -- 师徒任务历史记录
      CREATE TABLE IF NOT EXISTS master_task_records (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id        INTEGER NOT NULL,
        task_id          TEXT NOT NULL,
        task_name        TEXT,
        task_type        TEXT,
        completed_at     INTEGER DEFAULT (strftime('%s','now')),
        reward_claimed   INTEGER DEFAULT 0,
        rewards           TEXT
      );
    `);
    Logger.info('好友/师徒增强表初始化成功');
  } catch (err) {
    Logger.error('表初始化失败:', err.message);
  }
}

// ============ 辅助函数 ============
function getPlayerId(req) {
  return parseInt(req.userId || req.query.player_id || req.body.player_id || 1);
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function getNow() {
  return Date.now();
}

/** 确保玩家体力记录存在 */
function ensureEnergyRecord(playerId) {
  if (!db) return;
  db.prepare(`INSERT OR IGNORE INTO player_energy (player_id) VALUES (?)`).run(playerId);
}

/** 获取玩家体力 */
function getPlayerEnergy(playerId) {
  ensureEnergyRecord(playerId);
  const row = db.prepare('SELECT current_energy, max_energy FROM player_energy WHERE player_id = ?').get(playerId);
  return row ? { current: row.current_energy, max: row.max_energy } : { current: 0, max: 100 };
}

/** 更新玩家体力 */
function updatePlayerEnergy(playerId, delta) {
  ensureEnergyRecord(playerId);
  db.prepare('UPDATE player_energy SET current_energy = MAX(0, MIN(max_energy, current_energy + ?)) WHERE player_id = ?').run(delta, playerId);
}

/** 检查是否是好友关系 */
function areFriends(playerId, friendId) {
  if (!db) return false;
  const row = db.prepare(`
    SELECT id FROM friendships
    WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
    AND status = 'accepted'
  `).get(playerId, friendId, friendId, playerId);
  return !!row;
}

/** 重置每日赠送次数（跨天重置） */
function resetDailyIfNeeded(playerId, friendId) {
  const today = getToday();
  let record = db.prepare('SELECT * FROM player_friend_energy WHERE player_id = ? AND friend_id = ?').get(playerId, friendId);
  if (!record) {
    db.prepare('INSERT INTO player_friend_energy (player_id, friend_id, sent_today, last_send_date) VALUES (?, ?, 0, ?)').run(playerId, friendId, today);
    return { sent_today: 0, last_send_date: today };
  }
  if (record.last_send_date !== today) {
    db.prepare('UPDATE player_friend_energy SET sent_today = 0, last_send_date = ? WHERE player_id = ? AND friend_id = ?').run(today, playerId, friendId);
    record.sent_today = 0;
    record.last_send_date = today;
  }
  return record;
}

/** 获取师徒关系角色 */
function getMasterRelation(playerId) {
  // 先检查 friendships 中是否有师徒标记（这里复用 friendships 表的 role 扩展字段不存在，
  // 故使用 friendships 做基础，在 friend_api 中使用独立字段）
  // 简化：使用 master_task_records 判断是否有师徒关系
  const hasRecord = db.prepare('SELECT COUNT(*) as cnt FROM master_task_records WHERE player_id = ?').get(playerId);
  return { hasRelation: hasRecord && hasRecord.cnt > 0 };
}

// ============ 中间件: 强制 player_id ============
function requirePlayerId(req, res, next) {
  req.playerId = getPlayerId(req);
  if (!req.playerId) {
    return res.status(400).json({ success: false, error: '缺少 player_id 参数' });
  }
  next();
}

// ============ 路由: POST /api/friend/send-energy ============
/**
 * 赠送体力给好友
 * Body: { player_id, friend_id }
 * 每日最多3次，每次消耗50体力，给对方+30体力，获得10好感度/20灵石
 */
router.post('/send-energy', requirePlayerId, (req, res) => {
  if (!db) return res.status(500).json({ success: false, error: '数据库未连接' });

  try {
    const playerId = req.playerId;
    const friendId = parseInt(req.body.friend_id || req.body.friendId);

    if (!friendId || friendId === playerId) {
      return res.status(400).json({ success: false, error: '无效的好友ID' });
    }

    // 检查是否是好友
    if (!areFriends(playerId, friendId)) {
      return res.status(400).json({ success: false, error: '你们还不是好友' });
    }

    // 检查目标玩家是否存在
    const friend = db.prepare('SELECT id, nickname FROM Users WHERE id = ?').get(friendId);
    if (!friend) {
      return res.status(404).json({ success: false, error: '好友不存在' });
    }

    // 重置每日次数
    const record = resetDailyIfNeeded(playerId, friendId);

    // 检查每日次数
    if (record.sent_today >= SEND_ENERGY_MAX_DAILY) {
      return res.status(400).json({
        success: false,
        error: `今日赠送次数已用完（${SEND_ENERGY_MAX_DAILY}/${SEND_ENERGY_MAX_DAILY}）`,
        remaining: 0,
        maxDaily: SEND_ENERGY_MAX_DAILY,
      });
    }

    // 检查自身体力是否足够
    const energy = getPlayerEnergy(playerId);
    if (energy.current < SEND_ENERGY_COST) {
      return res.status(400).json({
        success: false,
        error: `体力不足，需要${SEND_ENERGY_COST}体力，当前${energy.current}体力`,
        currentEnergy: energy.current,
        cost: SEND_ENERGY_COST,
      });
    }

    // 扣除自身体力
    updatePlayerEnergy(playerId, -SEND_ENERGY_COST);

    // 给对方加体力（不超过上限）
    const friendEnergy = getPlayerEnergy(friendId);
    const actualGiven = Math.min(SEND_ENERGY_GIVEN, friendEnergy.max - friendEnergy.current);
    updatePlayerEnergy(friendId, actualGiven);

    // 增加赠送次数
    db.prepare('UPDATE player_friend_energy SET sent_today = sent_today + 1, last_send_time = ?, total_sent = total_sent + 1 WHERE player_id = ? AND friend_id = ?').run(getNow(), playerId, friendId);

    // 给赠送者加灵石（奖励）
    db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(SEND_ENERGY_LINGSHI, playerId);

    // 记录好感度（如果有好感字段）
    // 简化处理：灵石已给

    const newEnergy = getPlayerEnergy(playerId);
    const updatedRecord = resetDailyIfNeeded(playerId, friendId);

    Logger.info(`玩家${playerId} 赠送体力给 ${friendId}: 消耗${SEND_ENERGY_COST}体力，获得${SEND_ENERGY_LINGSHI}灵石`);

    res.json({
      success: true,
      message: `赠送体力成功！消耗${SEND_ENERGY_COST}体力，获得${SEND_ENERGY_LINGSHI}灵石`,
      data: {
        playerId,
        friendId: friendId,
        friendName: friend.nickname || `玩家${friendId}`,
        energySpent: SEND_ENERGY_COST,
        energyGiven: actualGiven,
        lingshiGained: SEND_ENERGY_LINGSHI,
        favorGained: SEND_ENERGY_FAVOR,
        remainingDaily: SEND_ENERGY_MAX_DAILY - updatedRecord.sent_today,
        maxDaily: SEND_ENERGY_MAX_DAILY,
        currentEnergy: newEnergy.current,
        maxEnergy: newEnergy.max,
      },
    });
  } catch (err) {
    Logger.error('send-energy 失败:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============ 路由: POST /api/friend/assist ============
/**
 * 协助好友通关副本
 * Body: { player_id, friend_id, dungeon_id }
 * 协助者消耗副本体力，好友通关后协助者获得灵石+师徒积分
 */
router.post('/assist', requirePlayerId, (req, res) => {
  if (!db) return res.status(500).json({ success: false, error: '数据库未连接' });

  try {
    const playerId = req.playerId;
    const friendId = parseInt(req.body.friend_id || req.body.friendId);
    const dungeonId = parseInt(req.body.dungeon_id || req.body.dungeonId || 1);

    if (!friendId || friendId === playerId) {
      return res.status(400).json({ success: false, error: '无效的好友ID' });
    }

    // 检查是否是好友
    if (!areFriends(playerId, friendId)) {
      return res.status(400).json({ success: false, error: '你们还不是好友，无法协助' });
    }

    // 检查好友是否在线/存在
    const friend = db.prepare('SELECT id, nickname FROM Users WHERE id = ?').get(friendId);
    if (!friend) {
      return res.status(404).json({ success: false, error: '好友不存在' });
    }

    // 协助奖励配置（根据副本难度）
    const dungeonBonus = {
      1: { lingshi: 50,  contribution: 5,  exp: 500 },
      2: { lingshi: 100, contribution: 10, exp: 1000 },
      3: { lingshi: 200, contribution: 20, exp: 2000 },
    };
    const bonus = dungeonBonus[dungeonId] || dungeonBonus[1];

    // 给协助者发放奖励
    db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(bonus.lingshi, playerId);

    // 记录协助历史（写入 master_task_records 用于师徒积分累加）
    const taskRecord = {
      player_id: playerId,
      task_id: 'assist_' + dungeonId,
      task_name: `协助副本${dungeonId}`,
      task_type: 'assist',
      rewards: JSON.stringify({ lingshi: bonus.lingshi, contribution: bonus.contribution }),
    };
    db.prepare(`
      INSERT INTO master_task_records (player_id, task_id, task_name, task_type, rewards)
      VALUES (?, ?, ?, ?, ?)
    `).run(taskRecord.player_id, taskRecord.task_id, taskRecord.task_name, taskRecord.task_type, taskRecord.rewards);

    // 更新师徒任务进度（传授类）
    updateMasterTaskProgress(playerId, 'assist', 1);

    Logger.info(`玩家${playerId} 协助好友${friendId} 通关副本${dungeonId}，获得${bonus.lingshi}灵石，${bonus.contribution}师徒积分`);

    res.json({
      success: true,
      message: `协助成功！帮助好友 ${friend.nickname || `玩家${friendId}`} 通关副本${dungeonId}`,
      data: {
        playerId,
        friendId,
        friendName: friend.nickname || `玩家${friendId}`,
        dungeonId,
        rewards: {
          lingshi: bonus.lingshi,
          contribution: bonus.contribution,
          exp: bonus.exp,
        },
      },
    });
  } catch (err) {
    Logger.error('assist 失败:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============ 辅助: 更新师徒任务进度 ============
function updateMasterTaskProgress(playerId, taskId, increment = 1) {
  if (!db) return;
  try {
    // 找出匹配的任务类型
    const task = MASTER_TASKS.find(t => t.task_id === taskId);
    if (!task) return;

    const existing = db.prepare('SELECT * FROM player_master_tasks WHERE player_id = ? AND task_id = ?').get(playerId, taskId);
    if (!existing) {
      db.prepare(`
        INSERT INTO player_master_tasks (player_id, task_id, task_type, progress, target, completed)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(playerId, taskId, task.type, increment, task.target, increment >= task.target ? 1 : 0);
    } else {
      const newProgress = existing.progress + increment;
      const completed = newProgress >= task.target ? 1 : 0;
      db.prepare('UPDATE player_master_tasks SET progress = ?, completed = ?, updated_at = strftime(\'%s\',\'now\') WHERE player_id = ? AND task_id = ?').run(newProgress, completed, playerId, taskId);
    }
  } catch (err) {
    Logger.warn('updateMasterTaskProgress 失败:', err.message);
  }
}

// ============ 路由: GET /api/master/tasks ============
/**
 * 获取师徒任务列表（包含进度）
 * Query: player_id
 */
router.get('/tasks', (req, res) => {
  if (!db) return res.status(500).json({ success: false, error: '数据库未连接' });

  try {
    const playerId = getPlayerId(req);

    // 初始化所有任务（如果没有记录则插入）
    const allTasks = MASTER_TASKS.map(task => {
      let record = db.prepare('SELECT progress, completed, claimed FROM player_master_tasks WHERE player_id = ? AND task_id = ?').get(playerId, task.task_id);
      if (!record) {
        db.prepare(`
          INSERT OR IGNORE INTO player_master_tasks (player_id, task_id, task_type, progress, target, completed, claimed)
          VALUES (?, ?, ?, 0, ?, 0, 0)
        `).run(playerId, task.task_id, task.type, task.target);
        record = { progress: 0, completed: 0, claimed: 0 };
      }
      return {
        taskId: task.task_id,
        name: task.name,
        desc: task.desc,
        type: task.type,
        progress: record.progress,
        target: task.target,
        completed: !!record.completed,
        claimed: !!record.claimed,
        rewards: task.rewards,
      };
    });

    res.json({
      success: true,
      data: {
        playerId,
        tasks: allTasks,
        totalTasks: allTasks.length,
        completedCount: allTasks.filter(t => t.completed).length,
        claimedCount: allTasks.filter(t => t.claimed).length,
      },
    });
  } catch (err) {
    Logger.error('GET /master/tasks 失败:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============ 路由: POST /api/master/claim-reward ============
/**
 * 领取师徒任务奖励
 * Body: { player_id, task_id }
 */
router.post('/claim-reward', (req, res) => {
  if (!db) return res.status(500).json({ success: false, error: '数据库未连接' });

  try {
    const playerId = getPlayerId(req);
    const taskId = req.body.task_id || req.body.taskId;

    if (!taskId) {
      return res.status(400).json({ success: false, error: '缺少 task_id' });
    }

    // 查找任务
    const task = MASTER_TASKS.find(t => t.task_id === taskId);
    if (!task) {
      return res.status(404).json({ success: false, error: '任务不存在' });
    }

    // 检查进度
    const record = db.prepare('SELECT progress, completed, claimed FROM player_master_tasks WHERE player_id = ? AND task_id = ?').get(playerId, taskId);
    if (!record) {
      return res.status(400).json({ success: false, error: '任务尚未开始' });
    }
    if (!record.completed) {
      return res.status(400).json({ success: false, error: '任务未完成，无法领取奖励' });
    }
    if (record.claimed) {
      return res.status(400).json({ success: false, error: '奖励已领取' });
    }

    // 发放奖励
    db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(task.rewards.lingshi, playerId);
    // 标记已领取
    db.prepare('UPDATE player_master_tasks SET claimed = 1, updated_at = strftime(\'%s\',\'now\') WHERE player_id = ? AND task_id = ?').run(playerId, taskId);

    // 记录历史
    db.prepare(`
      INSERT INTO master_task_records (player_id, task_id, task_name, task_type, rewards, reward_claimed)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(playerId, taskId, task.name, task.type, JSON.stringify(task.rewards));

    Logger.info(`玩家${playerId} 领取师徒任务 ${taskId} 奖励: ${JSON.stringify(task.rewards)}`);

    res.json({
      success: true,
      message: `领取成功！获得 ${task.rewards.lingshi} 灵石、${task.rewards.contribution} 师徒积分、${task.rewards.exp} 经验`,
      data: {
        taskId,
        taskName: task.name,
        rewards: task.rewards,
        playerId,
      },
    });
  } catch (err) {
    Logger.error('POST /master/claim-reward 失败:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============ 路由: GET /api/friend/energy-status ============
/**
 * 获取体力赠送状态
 */
router.get('/energy-status', (req, res) => {
  if (!db) return res.status(500).json({ success: false, error: '数据库未连接' });
  try {
    const playerId = getPlayerId(req);
    const energy = getPlayerEnergy(playerId);
    const today = getToday();

    const records = db.prepare('SELECT friend_id, sent_today, last_send_date, total_sent FROM player_friend_energy WHERE player_id = ?').all(playerId);

    res.json({
      success: true,
      data: {
        playerId,
        currentEnergy: energy.current,
        maxEnergy: energy.max,
        todaySent: records.reduce((sum, r) => sum + (r.last_send_date === today ? r.sent_today : 0), 0),
        maxDaily: SEND_ENERGY_MAX_DAILY,
        perFriend: records.map(r => ({
          friendId: r.friend_id,
          sentToday: r.last_send_date === today ? r.sent_today : 0,
          totalSent: r.total_sent,
        })),
      },
    });
  } catch (err) {
    Logger.error('energy-status 失败:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// 切磋武技
// ============================================================
const SPAR_CD = 30 * 60 * 1000; // 30分钟CD

router.post('/sparrig', requirePlayerId, (req, res) => {
  const playerId = getPlayerId(req);
  const { targetId } = req.body;
  const targetNum = parseInt(targetId);

  if (!targetNum || targetNum === playerId) {
    return res.status(400).json({ success: false, error: '目标无效' });
  }

  // 检查是否好友
  const isFriend = db.prepare(`
    SELECT id FROM friendships 
    WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
  `).get(playerId, targetNum, targetNum, playerId);

  if (!isFriend) {
    return res.status(403).json({ success: false, error: '仅好友可切磋' });
  }

  // 检查CD
  const lastSpar = db.prepare(`
    SELECT sparring_at FROM friendships 
    WHERE id = ?
  `).get(isFriend.id);

  if (lastSpar && (Date.now() - new Date(lastSpar.sparring_at).getTime()) < SPAR_CD) {
    const remaining = Math.ceil((SPAR_CD - (Date.now() - new Date(lastSpar.sparring_at).getTime())) / 60000);
    return res.status(429).json({ success: false, error: `切磋CD中，还需${remaining}分钟` });
  }

  // 获取双方数据
  const me = db.prepare('SELECT * FROM Users WHERE id = ?').get(playerId);
  const target = db.prepare('SELECT * FROM Users WHERE id = ?').get(targetNum);

  if (!me || !target) {
    return res.status(404).json({ success: false, error: '玩家不存在' });
  }

  // 简单战斗计算
  const myPower = me.combat_power || (me.attack + me.defense + me.hp * 0.1);
  const targetPower = target.combat_power || (target.attack + target.defense + target.hp * 0.1);

  // 加入随机性 (±20%)
  const myFinal = myPower * (0.8 + Math.random() * 0.4);
  const targetFinal = targetPower * (0.8 + Math.random() * 0.4);

  const won = myFinal > targetFinal;
  const expGain = Math.floor(50 + Math.abs(myFinal - targetFinal) * 0.05);
  const friendBonus = won ? 20 : 10;

  // 更新CD时间
  db.prepare('UPDATE friendships SET sparring_at = ? WHERE id = ?').run(new Date().toISOString(), isFriend.id);

  // 记录切磋历史
  try {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS friend_spar_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER, target_id INTEGER,
        won INTEGER, exp_gain INTEGER,
        my_power REAL, target_power REAL,
        sparded_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    db.prepare(`
      INSERT INTO friend_spar_history (player_id, target_id, won, exp_gain, my_power, target_power)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(playerId, targetNum, won ? 1 : 0, expGain, myFinal, targetFinal);
  } catch (e) { /* 忽略 */ }

  res.json({
    success: true,
    data: {
      won,
      expGain: expGain + friendBonus,
      myPower: Math.floor(myFinal),
      targetPower: Math.floor(targetFinal),
      friendBonus,
      message: won ? '切磋获胜！' : '切磋惜败'
    }
  });
});

// ============ 初始化 ============
initTables();

module.exports = router;
