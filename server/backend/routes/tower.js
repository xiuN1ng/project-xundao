const express = require('express');
const path = require('path');
const router = express.Router();

// 简单的日志记录器
const Logger = {
  info: (...args) => console.log('[tower]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[tower:error]', new Date().toISOString(), ...args),
  warn: (...args) => console.warn('[tower:warn]', new Date().toISOString(), ...args)
};

// 数据库路径
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

// 初始化数据库连接
let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  initDatabase();
  Logger.info('数据库连接成功');
} catch (err) {
  Logger.error('数据库连接失败:', err.message);
  db = {
    _data: {},
    prepare() { return this; },
    get() { return null; },
    all() { return []; },
    run() { return { changes: 0 }; }
  };
}

// ============ 数据库初始化 ============
function initDatabase() {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS tower_progress (
        player_id TEXT PRIMARY KEY,
        current_floor INTEGER DEFAULT 1,
        highest_floor INTEGER DEFAULT 0,
        total_wins INTEGER DEFAULT 0,
        total_battles INTEGER DEFAULT 0,
        first_clear_floors TEXT DEFAULT '[]',
        claimed_rewards TEXT DEFAULT '[]',
        today_challenges INTEGER DEFAULT 0,
        last_challenge_date TEXT,
        last_update INTEGER
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS tower_leaderboard (
        player_id TEXT PRIMARY KEY,
        player_name TEXT,
        highest_floor INTEGER DEFAULT 0,
        timestamp INTEGER
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS tower_challenge_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id TEXT,
        player_name TEXT,
        floor INTEGER,
        result TEXT,
        battle_time INTEGER,
        timestamp INTEGER
      )
    `);

    Logger.info('无尽塔数据库表初始化完成');
  } catch (error) {
    Logger.error('初始化数据库表错误:', error.message);
  }
}

// ============ 工具函数 ============

// 获取玩家ID（从请求头或默认）
function getPlayerId(req) {
  return req.headers['x-player-id'] || req.body?.playerId || 'player_1';
}

// 获取玩家名称
function getPlayerName(req) {
  return req.headers['x-player-name'] || req.body?.playerName || '修仙者';
}

// 获取玩家塔数据
function getPlayerTowerData(playerId) {
  try {
    const stmt = db.prepare('SELECT * FROM tower_progress WHERE player_id = ?');
    const row = stmt.get(playerId);

    if (row) {
      return {
        playerId: row.player_id,
        currentFloor: row.current_floor || 1,
        highestFloor: row.highest_floor || 0,
        totalWins: row.total_wins || 0,
        totalBattles: row.total_battles || 0,
        firstClearFloors: row.first_clear_floors ? JSON.parse(row.first_clear_floors) : [],
        claimedRewards: row.claimed_rewards ? JSON.parse(row.claimed_rewards) : [],
        todayChallenges: row.today_challenges || 0,
        lastChallengeDate: row.last_challenge_date || null
      };
    }
  } catch (error) {
    Logger.error('获取塔数据错误:', error.message);
  }

  return {
    playerId,
    currentFloor: 1,
    highestFloor: 0,
    totalWins: 0,
    totalBattles: 0,
    firstClearFloors: [],
    claimedRewards: [],
    todayChallenges: 0,
    lastChallengeDate: null
  };
}

// 保存玩家塔数据
function savePlayerTowerData(playerId, data) {
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO tower_progress 
      (player_id, current_floor, highest_floor, total_wins, total_battles, 
       first_clear_floors, claimed_rewards, today_challenges, last_challenge_date, last_update)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      playerId,
      data.currentFloor || 1,
      data.highestFloor || 0,
      data.totalWins || 0,
      data.totalBattles || 0,
      JSON.stringify(data.firstClearFloors || []),
      JSON.stringify(data.claimedRewards || []),
      data.todayChallenges || 0,
      data.lastChallengeDate || null,
      Date.now()
    );
  } catch (error) {
    Logger.error('保存塔数据错误:', error.message);
  }
}

// 记录挑战
function recordChallenge(playerId, playerName, floor, result) {
  try {
    const stmt = db.prepare(`
      INSERT INTO tower_challenge_records 
      (player_id, player_name, floor, result, battle_time, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(playerId, playerName, floor, result, 0, Date.now());
  } catch (error) {
    Logger.error('记录挑战错误:', error.message);
  }
}

// 更新排行榜
function updateLeaderboard(playerId, playerName, floor) {
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO tower_leaderboard 
      (player_id, player_name, highest_floor, timestamp)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(playerId, playerName, floor, Date.now());
  } catch (error) {
    Logger.error('更新排行榜错误:', error.message);
  }
}

// ============ 怪物生成 ============

const MAX_FLOOR = 100;

// 判断是否是BOSS层（每10层）
function isBossFloor(floor) {
  return floor % 10 === 0 && floor > 0;
}

// 判断是否是精英层（每5层）
function isEliteFloor(floor) {
  return floor % 5 === 0 && !isBossFloor(floor);
}

// 生成普通怪物
function generateNormalMonster(floor) {
  const baseHp = Math.floor(80 * Math.pow(1.18, floor - 1));
  const baseAtk = Math.floor(8 * Math.pow(1.14, floor - 1));
  const baseDef = Math.floor(3 * Math.pow(1.12, floor - 1));

  const monsterNames = [
    '妖兽', '妖狐', '妖狼', '妖蛇', '妖虎',
    '鬼魅', '幽魂', '厉鬼', '冤魂', '恶灵',
    '魔蛛', '魔蛙', '魔蝎', '魔蚁', '魔兽'
  ];

  const prefixes = ['初级', '中级', '高级', '精英', '变异'];

  return {
    type: 'normal',
    name: `${prefixes[Math.min(Math.floor(floor / 20), 4)]}${monsterNames[floor % monsterNames.length]}`,
    hp: baseHp,
    maxHp: baseHp,
    atk: baseAtk,
    def: baseDef,
    exp: Math.floor(30 * Math.pow(1.12, floor - 1)),
    spiritStones: Math.floor(15 * Math.pow(1.1, floor - 1)),
    skills: ['普通攻击']
  };
}

// 生成精英怪物
function generateEliteMonster(floor) {
  const baseHp = Math.floor(200 * Math.pow(1.2, floor - 1));
  const baseAtk = Math.floor(15 * Math.pow(1.15, floor - 1));
  const baseDef = Math.floor(8 * Math.pow(1.13, floor - 1));

  const eliteNames = [
    '精英妖兽', '精英妖狐', '精英魔将', '精英鬼王', '精英蛊虫'
  ];

  return {
    type: 'elite',
    name: eliteNames[floor % eliteNames.length],
    hp: baseHp,
    maxHp: baseHp,
    atk: baseAtk,
    def: baseDef,
    exp: Math.floor(80 * Math.pow(1.15, floor - 1)),
    spiritStones: Math.floor(40 * Math.pow(1.12, floor - 1)),
    skills: ['普通攻击', '强力打击'],
    specialAbility: '生命恢复（每回合回复5%最大生命）'
  };
}

// 生成BOSS
function generateBoss(floor) {
  const baseHp = Math.floor(500 * Math.pow(1.25, floor / 10 - 1));
  const baseAtk = Math.floor(30 * Math.pow(1.18, floor / 10 - 1));
  const baseDef = Math.floor(15 * Math.pow(1.15, floor / 10 - 1));

  const bossData = {
    10:  { name: '筑基期守护者', realm: '筑基期', hp: 800, atk: 45, def: 20 },
    20:  { name: '结丹期魔王', realm: '结丹期', hp: 2000, atk: 80, def: 35 },
    30:  { name: '元婴期妖皇', realm: '元婴期', hp: 5000, atk: 150, def: 60 },
    40:  { name: '化神期至尊', realm: '化神期', hp: 12000, atk: 280, def: 100 },
    50:  { name: '炼虚期霸主', realm: '炼虚期', hp: 25000, atk: 500, def: 180 },
    60:  { name: '合体期古魔', realm: '合体期', hp: 50000, atk: 900, def: 300 },
    70:  { name: '大乘期天魔', realm: '大乘期', hp: 100000, atk: 1600, def: 500 },
    80:  { name: '渡劫期凶兽', realm: '渡劫期', hp: 200000, atk: 2800, def: 800 },
    90:  { name: '真仙境邪神', realm: '真仙境', hp: 400000, atk: 4500, def: 1200 },
    100: { name: '天道意志', realm: '天道', hp: 800000, atk: 7000, def: 2000 }
  };

  const boss = bossData[floor] || {
    name: `第${floor}层终极BOSS`,
    realm: '未知境界',
    hp: baseHp,
    atk: baseAtk,
    def: baseDef
  };

  return {
    type: 'boss',
    name: boss.name,
    realm: boss.realm,
    hp: boss.hp,
    maxHp: boss.hp,
    atk: boss.atk,
    def: boss.def,
    exp: Math.floor(200 * Math.pow(1.2, floor / 10 - 1)),
    spiritStones: Math.floor(100 * Math.pow(1.25, floor / 10 - 1)),
    skills: ['普通攻击', '全力一击', 'BOSS特殊技能'],
    specialAbility: '伤害减免（受到伤害减少10%）',
    bossFloor: floor
  };
}

// 获取指定层怪物
function getFloorMonster(floor) {
  if (floor < 1 || floor > MAX_FLOOR) {
    return null;
  }

  if (isBossFloor(floor)) {
    return generateBoss(floor);
  } else if (isEliteFloor(floor)) {
    return generateEliteMonster(floor);
  } else {
    return generateNormalMonster(floor);
  }
}

// ============ 战斗模拟 ============

// 简单的战斗模拟
function simulateBattle(player, monster, floor) {
  const playerHp = player.hp || 1000;
  const playerAtk = player.attack || 100;
  const playerDef = player.defense || 50;

  let pHp = playerHp;
  let mHp = monster.hp;
  const battleLog = [];
  let round = 1;

  // BOSS伤害减免
  const bossDamageReduction = monster.type === 'boss' ? 0.9 : 1.0;

  // 精英怪物生命恢复
  const hasLifeRegen = monster.type === 'elite';

  while (pHp > 0 && mHp > 0 && round <= 50) {
    // 玩家攻击
    let playerDamage = Math.max(1, Math.floor((playerAtk - monster.def * 0.5) * (0.9 + Math.random() * 0.2)));
    playerDamage = Math.floor(playerDamage * bossDamageReduction);
    mHp -= playerDamage;
    battleLog.push({ round, actor: 'player', damage: playerDamage, targetHp: mHp });

    if (mHp <= 0) break;

    // 怪物攻击
    let monsterDamage = Math.max(1, Math.floor((monster.atk - playerDef * 0.3) * (0.9 + Math.random() * 0.2)));
    pHp -= monsterDamage;
    battleLog.push({ round, actor: 'monster', damage: monsterDamage, targetHp: pHp });

    // 精英怪物生命恢复
    if (hasLifeRegen && round % 3 === 0) {
      const regen = Math.floor(monster.maxHp * 0.05);
      mHp = Math.min(monster.maxHp, mHp + regen);
      battleLog.push({ round, actor: 'monster', regen });
    }

    round++;
  }

  const playerWon = mHp <= 0;

  return {
    victory: playerWon,
    playerHpLeft: Math.max(0, pHp),
    monsterHpLeft: Math.max(0, mHp),
    rounds: round,
    battleLog: battleLog.slice(0, 20) // 限制日志长度
  };
}

// 获取玩家战斗力属性
function getPlayerBattleStats(playerId) {
  try {
    // 尝试从数据库获取玩家属性
    const stmt = db.prepare('SELECT hp, attack, defense FROM users WHERE id = ?');
    const user = stmt.get(playerId);

    if (user) {
      return {
        hp: user.hp || 1000,
        attack: user.attack || 100,
        defense: user.defense || 50
      };
    }
  } catch (error) {
    Logger.error('获取玩家战斗属性错误:', error.message);
  }

  // 默认值
  return { hp: 1000, attack: 100, defense: 50 };
}

// ============ 奖励计算 ============

// 获取首次通关奖励
function getFirstClearReward(floor) {
  const baseSpiritStones = 50 * Math.pow(1.4, floor / 10);
  const baseExp = 200 * Math.pow(1.3, floor / 10);

  let bonus = '';
  if (isBossFloor(floor)) {
    bonus = 'BOSS首杀额外奖励';
  }

  return {
    spiritStones: Math.floor(baseSpiritStones),
    exp: Math.floor(baseExp),
    bonus: bonus,
    isBossFloor: isBossFloor(floor)
  };
}

// 获取重复通关奖励（扫荡）
function getSweepReward(floor, playerHighestFloor) {
  // 只有通关过的层才能扫荡
  if (floor > playerHighestFloor) {
    return { error: '该层尚未通关' };
  }

  const spiritStones = Math.floor(10 * Math.pow(1.08, floor));
  const exp = Math.floor(20 * Math.pow(1.1, floor));

  return {
    spiritStones,
    exp,
    floor
  };
}

// ============ 每日重置 ============

function checkDailyReset(data) {
  const today = new Date().toISOString().split('T')[0];
  if (data.lastChallengeDate !== today) {
    data.todayChallenges = 0;
    data.lastChallengeDate = today;
  }
  return data;
}

// ============ 路由 ============

// GET / - 获取玩家塔信息
router.get('/', (req, res) => {
  const playerId = getPlayerId(req);
  let data = getPlayerTowerData(playerId);
  data = checkDailyReset(data);

  res.json({
    success: true,
    data: {
      currentFloor: data.currentFloor,
      highestFloor: data.highestFloor,
      totalFloors: MAX_FLOOR,
      totalWins: data.totalWins,
      totalBattles: data.totalBattles,
      todayChallenges: data.todayChallenges,
      firstClearFloors: data.firstClearFloors,
      claimedRewards: data.claimedRewards
    }
  });
});

// GET /info - 获取玩家塔信息（别名）
router.get('/info', (req, res) => {
  const playerId = getPlayerId(req);
  let data = getPlayerTowerData(playerId);
  data = checkDailyReset(data);

  res.json({
    success: true,
    data: {
      currentFloor: data.currentFloor,
      highestFloor: data.highestFloor,
      totalFloors: MAX_FLOOR,
      totalWins: data.totalWins,
      totalBattles: data.totalBattles,
      todayChallenges: data.todayChallenges,
      firstClearFloors: data.firstClearFloors,
      claimedRewards: data.claimedRewards
    }
  });
});

// GET /floor/:floor - 获取指定层怪物信息
router.get('/floor/:floor', (req, res) => {
  const floor = parseInt(req.params.floor);

  if (floor < 1 || floor > MAX_FLOOR) {
    return res.status(400).json({ success: false, error: '层数超出范围（1-100）' });
  }

  const monster = getFloorMonster(floor);

  // 获取玩家当前进度
  const playerId = getPlayerId(req);
  const playerData = getPlayerTowerData(playerId);

  res.json({
    success: true,
    data: {
      floor,
      monster,
      isBossFloor: isBossFloor(floor),
      isEliteFloor: isEliteFloor(floor),
      firstClearReward: getFirstClearReward(floor),
      sweepAvailable: playerData.highestFloor >= floor
    }
  });
});

// POST /challenge - 挑战指定层
router.post('/challenge', (req, res) => {
  const playerId = getPlayerId(req);
  const playerName = getPlayerName(req);
  const { floor } = req.body;

  if (!floor || floor < 1 || floor > MAX_FLOOR) {
    return res.status(400).json({ success: false, error: '层数无效' });
  }

  let data = getPlayerTowerData(playerId);
  data = checkDailyReset(data);

  // 检查是否可以从当前层挑战（不能跳层挑战）
  if (floor > data.currentFloor) {
    return res.status(400).json({
      success: false,
      error: `必须从第${data.currentFloor}层开始挑战，不能跳层`
    });
  }

  // 检查每日挑战次数限制（每天最多挑战30次）
  if (data.todayChallenges >= 30) {
    return res.status(400).json({
      success: false,
      error: '今日挑战次数已用完，请明天再来'
    });
  }

  // 获取怪物
  const monster = getFloorMonster(floor);

  // 获取玩家战斗属性
  const playerStats = getPlayerBattleStats(playerId);

  // 模拟战斗
  const battleResult = simulateBattle(playerStats, monster, floor);

  // 更新挑战次数
  data.todayChallenges++;
  data.totalBattles++;
  data.lastChallengeDate = new Date().toISOString().split('T')[0];

  // 战斗胜利
  if (battleResult.victory) {
    data.totalWins++;
    data.currentFloor = Math.min(floor + 1, MAX_FLOOR);

    // 检查是否首次通关
    const isFirstClear = !data.firstClearFloors.includes(floor);
    if (isFirstClear) {
      data.firstClearFloors.push(floor);
    }

    // 更新最高层
    if (floor > data.highestFloor) {
      data.highestFloor = floor;
      updateLeaderboard(playerId, playerName, floor);
    }

    // 发放奖励
    const reward = isFirstClear ? getFirstClearReward(floor) : getSweepReward(floor, data.highestFloor);

    recordChallenge(playerId, playerName, floor, 'win');

    res.json({
      success: true,
      result: 'victory',
      battle: battleResult,
      reward,
      isFirstClear,
      nextFloor: data.currentFloor,
      highestFloor: data.highestFloor
    });
  } else {
    // 战斗失败
    recordChallenge(playerId, playerName, floor, 'lose');

    res.json({
      success: true,
      result: 'defeat',
      battle: battleResult,
      currentFloor: data.currentFloor,
      highestFloor: data.highestFloor,
      message: `挑战第${floor}层失败，当前进度：第${data.currentFloor}层`
    });
  }

  // 保存数据
  savePlayerTowerData(playerId, data);
});

// POST /sweep - 扫荡已通关层
router.post('/sweep', (req, res) => {
  const playerId = getPlayerId(req);
  const { floor } = req.body;

  if (!floor || floor < 1 || floor > MAX_FLOOR) {
    return res.status(400).json({ success: false, error: '层数无效' });
  }

  const data = getPlayerTowerData(playerId);

  // 检查是否通关该层
  if (floor > data.highestFloor) {
    return res.status(400).json({ success: false, error: '该层尚未通关，无法扫荡' });
  }

  // 检查是否已领取首杀奖励
  if (data.firstClearFloors.includes(floor)) {
    const reward = getSweepReward(floor, data.highestFloor);
    res.json({
      success: true,
      reward,
      message: `扫荡第${floor}层成功`
    });
  } else {
    // 还没通关过，不能扫荡
    return res.status(400).json({ success: false, error: '该层尚未通关' });
  }
});

// GET /leaderboard - 获取排行榜
router.get('/leaderboard', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);

  try {
    const stmt = db.prepare(`
      SELECT player_id, player_name, highest_floor, timestamp
      FROM tower_leaderboard
      ORDER BY highest_floor DESC, timestamp ASC
      LIMIT ?
    `);

    const rows = stmt.all(limit);

    const leaderboard = rows.map((row, index) => ({
      rank: index + 1,
      playerId: row.player_id,
      name: row.player_name,
      floor: row.highest_floor,
      timestamp: row.timestamp
    }));

    res.json({ success: true, leaderboard });
  } catch (error) {
    Logger.error('获取排行榜错误:', error.message);
    res.status(500).json({ success: false, error: '获取排行榜失败' });
  }
});

// GET /records/:userId - 获取通关记录
router.get('/records/:userId', (req, res) => {
  const { userId } = req.params;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);

  try {
    const stmt = db.prepare(`
      SELECT floor, result, battle_time, timestamp
      FROM tower_challenge_records
      WHERE player_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    const rows = stmt.all(userId, limit);

    const records = rows.map(row => ({
      floor: row.floor,
      result: row.result,
      battleTime: row.battle_time,
      timestamp: row.timestamp,
      date: new Date(row.timestamp).toLocaleString('zh-CN')
    }));

    res.json({ success: true, records });
  } catch (error) {
    Logger.error('获取通关记录错误:', error.message);
    res.status(500).json({ success: false, error: '获取通关记录失败' });
  }
});

// GET /my-records - 获取当前玩家的通关记录
router.get('/my-records', (req, res) => {
  const playerId = getPlayerId(req);
  req.params.userId = playerId;
  return router.handle(req, res);
});

// POST /claim-reward - 领取层数奖励
router.post('/claim-reward', (req, res) => {
  const playerId = getPlayerId(req);
  const { floor } = req.body;

  if (!floor || floor < 1 || floor > MAX_FLOOR) {
    return res.status(400).json({ success: false, error: '层数无效' });
  }

  const data = getPlayerTowerData(playerId);

  // 检查是否通关该层
  if (floor > data.highestFloor) {
    return res.status(400).json({ success: false, error: '该层尚未通关，无法领取奖励' });
  }

  // 检查是否已领取
  if (data.claimedRewards.includes(floor)) {
    return res.status(400).json({ success: false, error: '该层奖励已领取' });
  }

  // 领取奖励
  data.claimedRewards.push(floor);
  const reward = getFirstClearReward(floor);

  savePlayerTowerData(playerId, data);

  res.json({
    success: true,
    reward,
    message: `领取第${floor}层奖励成功`
  });
});

module.exports = router;
