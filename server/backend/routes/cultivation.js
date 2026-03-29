const express = require('express');
const path = require('path');
const router = express.Router();

const Logger = {
  info: (...args) => console.log('[cultivation]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[cultivation:error]', new Date().toISOString(), ...args)
};

// 每日任务进度更新
let dailyQuestRouter;
try {
  dailyQuestRouter = require('./dailyQuest');
} catch (e) {
  Logger.info('dailyQuest 路由未找到:', e.message);
}

// 事件总线
let eventBus;
try {
  eventBus = require('../../game/eventBus');
} catch (e) {
  Logger.info('eventBus 加载失败:', e.message);
  eventBus = null;
}

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  // 确保 last_logout 列存在
  try { db.exec('ALTER TABLE Users ADD COLUMN last_logout DATETIME'); } catch (e) { /* 列已存在 */ }
  try { db.exec("ALTER TABLE Cultivations ADD COLUMN last_claim_time DATETIME"); } catch (e) { /* 列已存在 */ }
  try { db.exec("ALTER TABLE Cultivations ADD COLUMN last_first_cultivate_date TEXT"); } catch (e) { /* 列已存在 */ }
  try { db.exec("ALTER TABLE Cultivations ADD COLUMN daily_exchange_count INTEGER DEFAULT 0"); } catch (e) { /* 列已存在 */ }
  try { db.exec("ALTER TABLE Cultivations ADD COLUMN last_exchange_date TEXT"); } catch (e) { /* 列已存在 */ }
  try { db.exec("ALTER TABLE Cultivations ADD COLUMN accumulated_power INTEGER DEFAULT 0"); } catch (e) { /* 列已存在 */ }
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

// 境界基础配置
const REALM_BASE_CONFIG = {
  1: { name: '练气', icon: '🧘', realm_level: 1 },
  2: { name: '筑基', icon: '🔮', realm_level: 2 },
  3: { name: '金丹', icon: '🌟', realm_level: 3 },
  4: { name: '元婴', icon: '👼', realm_level: 4 },
  5: { name: '化神', icon: '✨', realm_level: 5 },
  6: { name: '炼虚', icon: '💫', realm_level: 6 },
  7: { name: '大乘', icon: '🔥', realm_level: 7 },
  8: { name: '飞升', icon: '🌈', realm_level: 8 },
};

// 境界突破消耗配置（境界1~3: 3000/8000/15000；境界4+: realm × 10000）
const realmConfig = {
  1: { name: '练气', icon: '🧘', realm_level: 1, cost: 3000 },
  2: { name: '筑基', icon: '🔮', realm_level: 2, cost: 8000 },
  3: { name: '金丹', icon: '🌟', realm_level: 3, cost: 15000 },
  4: { name: '元婴', icon: '👼', realm_level: 4, cost: 40000 },
  5: { name: '化神', icon: '✨', realm_level: 5, cost: 50000 },
  6: { name: '炼虚', icon: '💫', realm_level: 6, cost: 60000 },
  7: { name: '大乘', icon: '🔥', realm_level: 7, cost: 70000 },
  8: { name: '飞升', icon: '🌈', realm_level: 8, cost: 80000 },
};

// 境界消耗灵石（修炼一次，动态计算）
// 基础10灵石，随cultivationPower增长，每500点+5灵石，上限105
const getCultivationCost = (cultivationPower) => {
  const extra = Math.floor(cultivationPower / 500) * 5;
  return Math.min(10 + extra, 105);
};

// 辅助：获取上海时区日期字符串
const getShanghaiDateStr = () => {
  const now = new Date(Date.now() + 8 * 3600000);
  return now.toISOString().substring(0, 10);
};

// 初始化每日修炼次数表
const initCultivationDailyTable = () => {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS cultivation_daily (
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        times INTEGER DEFAULT 0,
        PRIMARY KEY (user_id, date)
      )
    `);
  } catch (e) {
    Logger.error('cultivation_daily 表初始化失败:', e.message);
  }
};
initCultivationDailyTable();

// 辅助：获取今日修炼次数
const getDailyCultivationTimes = (userId) => {
  try {
    const today = getShanghaiDateStr();
    const row = db.prepare('SELECT times FROM cultivation_daily WHERE user_id = ? AND date = ?').get(userId, today);
    return row ? row.times : 0;
  } catch (e) {
    return 0;
  }
};

// 辅助：增加今日修炼次数
const incrementDailyCultivationTimes = (userId) => {
  try {
    const today = getShanghaiDateStr();
    db.prepare(`INSERT INTO cultivation_daily (user_id, date, times) VALUES (?, ?, 1)
      ON CONFLICT(user_id, date) DO UPDATE SET times = times + 1`).run(userId, today);
  } catch (e) {
    Logger.error('incrementDailyCultivationTimes 失败:', e.message);
  }
};

// Mock玩家数据（当数据库无玩家时使用）
const mockPlayer = {
  id: 1,
  name: '修仙者',
  level: 5,
  realm: 1,
  spirit_stones: 125680,
  diamonds: 520,
  hp: 1000,
  attack: 100,
  defense: 50,
  speed: 10,
  sectId: 1,
  createdAt: Date.now()
};

// 成就触发服务
let achievementTrigger;
try {
  achievementTrigger = require('../../game/achievement_trigger_service');
} catch (e) {
  console.log('[cultivation] 成就触发服务未找到');
  achievementTrigger = null;
}

// Mock修炼数据
let mockCultivation = {
  value: 0,
  realm: 1,
  cultivation_power: 0
};

// 辅助：获取或初始化玩家修炼数据
function getOrCreateCultivation(userId) {
  try {
    let cult = db.prepare('SELECT * FROM Cultivations WHERE userId = ?').get(userId);
    if (!cult) {
      try {
        db.prepare("INSERT INTO Cultivations (userId, value, realm, cultivationPower, createdAt, updatedAt) VALUES (?, 0, 1, 0, datetime('now'), datetime('now'))").run(userId);
      } catch (insertErr) {
        Logger.error('INSERT Cultivations 失败:', insertErr.message, 'userId:', userId);
      }
      // INSERT 失败后仍尝试重新查询（可能是并发插入）
      cult = db.prepare('SELECT * FROM Cultivations WHERE userId = ?').get(userId);
      if (cult) return cult;
      // 仍无记录则返回 mock，但标记需要后续同步
      Logger.warn('getOrCreateCultivation 返回 mock，建议检查 userId:', userId);
    }
    return cult;
  } catch (e) {
    Logger.error('getOrCreateCultivation 异常:', e.message);
    return mockCultivation;
  }
}

// 辅助：获取玩家数据（从 Users 表读取 lingshi，权威数据源）
function getPlayer(userId) {
  try {
    // 优先从 Users 表读取（lingshi 权威源）
    const user = db.prepare('SELECT * FROM Users WHERE id = ?').get(userId);
    if (user) {
      return {
        id: user.id,
        name: user.nickname,
        level: user.level,
        realm: user.realm,
        lingshi: user.lingshi
      };
    }
    // 回退到 player 表
    const player = db.prepare('SELECT * FROM player WHERE id = ?').get(userId);
    return player || mockPlayer;
  } catch (e) {
    return mockPlayer;
  }
}

// 获取修炼状态
router.get('/', (req, res) => {
  const userId = req.userId || 1;
  try {
    const player = getPlayer(userId);
    if (!player) return res.json({ success: false, message: '玩家不存在' });

    const cult = getOrCreateCultivation(userId);
    const config = realmConfig[cult.realm] || realmConfig[1];
    const progress = Math.min(Math.floor((parseInt(cult.value) / config.cost) * 100), 100);
    const dailyTimes = getDailyCultivationTimes(userId);
    const realmLevel = config.realm_level || 1;
    const cultivationPower = Math.floor(parseInt(cult.value) * 0.1 + realmLevel * 50);

    res.json({
      success: true,
      userId,
      cultivation: {
        value: parseInt(cult.value),
        realm: cult.realm,
        realmName: config.name,
        realmIcon: config.icon,
        realmLevel: config.realm_level,
        progress,
        cost: config.cost,
        cultivationPower
      },
      player: {
        level: player.level,
        realm: player.realm,
        lingshi: player.lingshi || 0
      },
      dailyCultivation: {
        times: dailyTimes,
        limit: 100,
        lingshiCost: getCultivationCost(cultivationPower)
      }
    });
  } catch (err) {
    Logger.error('GET / cultivation error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// 获取修炼状态 (兼容 /status 路径)
router.get('/status', (req, res) => {
  const userId = req.userId || 1;
  try {
    const player = getPlayer(userId);
    if (!player) return res.json({ success: false, message: '玩家不存在' });

    const cult = getOrCreateCultivation(userId);
    const config = realmConfig[cult.realm] || realmConfig[1];
    const progress = Math.min(Math.floor((parseInt(cult.value) / config.cost) * 100), 100);
    const dailyTimes = getDailyCultivationTimes(userId);
    const realmLevel = config.realm_level || 1;
    const cultivationPower = Math.floor(parseInt(cult.value) * 0.1 + realmLevel * 50);
    const nextRealm = cult.realm + 1;
    const canBreakthrough = realmConfig[nextRealm] && parseInt(cult.value) >= config.cost;

    res.json({
      success: true,
      userId,
      cultivation: {
        value: parseInt(cult.value),
        realm: cult.realm,
        realmName: config.name,
        realmIcon: config.icon,
        realmLevel: config.realm_level,
        progress,
        cost: config.cost,
        cultivationPower,
        canBreakthrough,
        nextRealm: realmConfig[nextRealm] ? nextRealm : null
      },
      player: {
        level: player.level,
        realm: player.realm,
        lingshi: player.lingshi || 0
      },
      dailyCultivation: {
        times: dailyTimes,
        limit: 100,
        lingshiCost: getCultivationCost(cultivationPower)
      }
    });
  } catch (err) {
    Logger.error('GET /status cultivation error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// 获取修炼信息 (GET /info - 等同于 /status)
router.get('/info', (req, res) => {
  const userId = req.userId || 1;
  try {
    const player = getPlayer(userId);
    if (!player) return res.json({ success: false, message: '玩家不存在' });

    const cult = getOrCreateCultivation(userId);
    const config = realmConfig[cult.realm] || realmConfig[1];
    const progress = Math.min(Math.floor((parseInt(cult.value) / config.cost) * 100), 100);
    const dailyTimes = getDailyCultivationTimes(userId);
    const realmLevel = config.realm_level || 1;
    const cultivationPower = Math.floor(parseInt(cult.value) * 0.1 + realmLevel * 50);

    res.json({
      success: true,
      userId,
      cultivation: {
        value: parseInt(cult.value),
        realm: cult.realm,
        realmName: config.name,
        realmIcon: config.icon,
        realmLevel: config.realm_level,
        progress,
        cost: config.cost,
        cultivationPower
      },
      player: {
        level: player.level,
        realm: player.realm,
        lingshi: player.lingshi || 0
      },
      dailyCultivation: {
        times: dailyTimes,
        limit: 100,
        lingshiCost: getCultivationCost(cultivationPower)
      }
    });
  } catch (err) {
    Logger.error('GET /info cultivation error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// 开始修炼
router.post('/start', (req, res) => {
  const userId = req.userId || 1;
  const cult = getOrCreateCultivation(userId);
  const config = realmConfig[cult.realm] || realmConfig[1];

  try {
    const player = getPlayer(userId);
    if (!player) return res.json({ success: false, message: '玩家不存在' });

    // ========== 每日100次上限检查 ==========
    const dailyTimes = getDailyCultivationTimes(userId);
    const DAILY_LIMIT = 100;
    if (dailyTimes >= DAILY_LIMIT) {
      return res.json({ success: false, message: `今日修炼次数已用完（${DAILY_LIMIT}/${DAILY_LIMIT}），每天凌晨重置` });
    }

    // 先计算 currentCultivationPower，再计算动态灵石消耗
    const realmLevel = config.realm_level || 1;
    // 优先使用DB中存储的cultivationPower（突破后保留值），再加上当前修炼值的贡献
    const storedPower = parseInt(cult.cultivationPower) || 0;
    const currentCultivationPower = storedPower + Math.floor(parseInt(cult.value) * 0.1 + realmLevel * 50);
    const LINGSHI_COST = getCultivationCost(currentCultivationPower);

    // 灵石不足检查
    if (parseInt(player.lingshi || 0) < LINGSHI_COST) {
      return res.json({ success: false, message: '灵石不足' });
    }

    // ========== 每日首次修炼双倍灵气 ==========
    const today = getShanghaiDateStr();
    const lastFirstDate = cult.last_first_cultivate_date || '';
    const isFirstCultivateToday = lastFirstDate !== today;
    if (isFirstCultivateToday) {
      db.prepare("UPDATE Cultivations SET last_first_cultivate_date = ? WHERE userId = ?").run(today, userId);
    }

    // 修炼获得灵气值（基础 + 效率加成）
    // cultivationPower 必须从当前 value 提前计算并持久化，否则 powerBonus 永远为 0
    const baseGain = Math.floor(Math.random() * 100) + 50;
    // powerBonus 封顶：最多 baseGain * 5（防止指数爆炸）
    const powerBonus = currentCultivationPower > 0
      ? Math.min(baseGain * 5, Math.floor(baseGain * currentCultivationPower / 100))
      : 0;
    let gain = baseGain + powerBonus;
    // 每日首次修炼双倍灵气
    if (isFirstCultivateToday) {
      gain = gain * 2;
    }

    const newValue = Math.min(parseInt(cult.value) + gain, config.cost);
    const newProgress = Math.min(Math.floor((newValue / config.cost) * 100), 100);
    // 同步修炼值 + cultivationPower（永久写入DB，解决永久=0问题）
    const finalCultivationPower = Math.floor(newValue * 0.1 + realmLevel * 50);

    // 扣除灵石（写入 Users.lingshi，权威数据源）
    db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(LINGSHI_COST, userId);
    // 同步修炼值 + cultivationPower
    db.prepare('UPDATE Cultivations SET value = ?, cultivationPower = ?, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?').run(newValue, finalCultivationPower, userId);
    // 增加今日修炼次数
    incrementDailyCultivationTimes(userId);
    // 增加玩家经验（1次修炼 = 10 exp）
    const expGain = 10;

    // ========== 每日任务触发：修炼 ==========
    if (dailyQuestRouter && dailyQuestRouter.updateDailyQuestProgress) {
      try {
        dailyQuestRouter.updateDailyQuestProgress(userId, 'cultivate', 1);
      } catch (e) {
        Logger.error('每日任务更新失败:', e.message);
      }
    }

    // ========== 事件总线触发：修炼开始 ==========
    if (eventBus) {
      eventBus.emit('cultivation:start', { userId, gain });
    }

    res.json({
      success: true,
      gain,
      lingshiCost: LINGSHI_COST,
      newValue,
      progress: newProgress,
      cultivationPower: finalCultivationPower,
      powerBonus,
      expGain,
      maxed: newValue >= config.cost,
      dailyTimes: dailyTimes + 1,
      dailyLimit: DAILY_LIMIT,
      firstCultivationBonus: isFirstCultivateToday // 每日首次双倍提示
    });
  } catch (err) {
    Logger.error('POST /start error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// 突破境界
router.post('/breakthrough', (req, res) => {
  const userId = req.userId || 1;
  const cult = getOrCreateCultivation(userId);
  const config = realmConfig[cult.realm] || realmConfig[1];

  try {
    if (parseInt(cult.value) < config.cost) {
      return res.json({ success: false, message: '灵气不足，无法突破' });
    }

    const nextRealm = cult.realm + 1;
    if (!realmConfig[nextRealm]) {
      return res.json({ success: false, message: '已达最高境界' });
    }

    const nextConfig = realmConfig[nextRealm];

    // ========== 突破时保留30%修炼效率（防止cultivationPower从6350暴跌至350）==========
    const oldCultivationPower = parseInt(cult.cultivationPower) || 0;
    const retainedPower = Math.floor(oldCultivationPower * 0.3);
    const nextRealmLevel = nextConfig.realm_level || 1;
    // 突破后cultivationPower = 保留值 + 新境界基础值
    const breakthroughCultivationPower = retainedPower + nextRealmLevel * 50;

    // 重置修炼值，境界+1，保留cultivationPower
    db.prepare('UPDATE Cultivations SET value = 0, realm = ?, cultivationPower = ?, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?').run(nextRealm, breakthroughCultivationPower, userId);
    // 同步更新 Users 表（权威源）和 player 表
    db.prepare('UPDATE Users SET realm = ?, level = level + 1, updatedAt = ? WHERE id = ?').run(nextRealm, new Date().toISOString(), userId);
    db.prepare('UPDATE player SET realm = ?, level = level + 1 WHERE id = ?').run(nextRealm, userId);
    
    // 成就触发：境界突破
    if (achievementTrigger) {
      try {
        achievementTrigger.triggerAchievement(userId, 'realm_breakthrough', nextRealm);
      } catch (e) {
        console.error('[cultivation] 成就触发失败:', e.message);
      }
    }

    // ========== 每日任务触发：境界突破（直接调用） ==========
    if (dailyQuestRouter && dailyQuestRouter.updateDailyQuestProgress) {
      try {
        dailyQuestRouter.updateDailyQuestProgress(userId, 'cultivate', 1);
      } catch (e) {
        Logger.error('每日任务更新失败:', e.message);
      }
    }

    // ========== 事件总线触发：境界突破 ==========
    if (eventBus) {
      eventBus.emit('cultivation:breakthrough', { userId, newRealm: nextRealm });
    }

    res.json({
      success: true,
      newRealm: nextRealm,
      realmName: nextConfig.name,
      realmIcon: nextConfig.icon,
      realmLevel: nextConfig.realm_level,
      message: `突破成功！进入${nextConfig.name}境界！`
    });
  } catch (err) {
    Logger.error('POST /breakthrough error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// 境界跃迁（与突破相同逻辑）
router.post('/advance', (req, res) => {
  const userId = req.userId || 1;
  const cult = getOrCreateCultivation(userId);
  const config = realmConfig[cult.realm] || realmConfig[1];

  try {
    if (parseInt(cult.value) < config.cost) {
      return res.json({ success: false, message: '灵气不足，无法跃迁' });
    }

    const nextRealm = cult.realm + 1;
    if (!realmConfig[nextRealm]) {
      return res.json({ success: false, message: '已达最高境界' });
    }

    const nextConfig = realmConfig[nextRealm];

    // ========== 跃迁时保留30%修炼效率（与breakthrough相同）==========
    const oldCultivationPower = parseInt(cult.cultivationPower) || 0;
    const retainedPower = Math.floor(oldCultivationPower * 0.3);
    const nextRealmLevel = nextConfig.realm_level || 1;
    const breakthroughCultivationPower = retainedPower + nextRealmLevel * 50;

    db.prepare('UPDATE Cultivations SET value = 0, realm = ?, cultivationPower = ?, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?').run(nextRealm, breakthroughCultivationPower, userId);
    db.prepare('UPDATE Users SET realm = ?, level = level + 1, updatedAt = ? WHERE id = ?').run(nextRealm, new Date().toISOString(), userId);
    db.prepare('UPDATE player SET realm = ?, level = level + 1 WHERE id = ?').run(nextRealm, userId);

    if (achievementTrigger) {
      try {
        achievementTrigger.triggerAchievement(userId, 'realm_breakthrough', nextRealm);
      } catch (e) {
        console.error('[cultivation] 成就触发失败:', e.message);
      }
    }

    // ========== 每日任务触发：境界跃迁（直接调用） ==========
    if (dailyQuestRouter && dailyQuestRouter.updateDailyQuestProgress) {
      try {
        dailyQuestRouter.updateDailyQuestProgress(userId, 'cultivate', 1);
      } catch (e) {
        Logger.error('每日任务更新失败:', e.message);
      }
    }

    // ========== 事件总线触发：境界突破 ==========
    if (eventBus) {
      eventBus.emit('cultivation:breakthrough', { userId, newRealm: nextRealm });
    }

    res.json({
      success: true,
      newRealm: nextRealm,
      realmName: nextConfig.name,
      realmIcon: nextConfig.icon,
      realmLevel: nextConfig.realm_level,
      message: `跃迁成功！进入${nextConfig.name}境界！`
    });
  } catch (err) {
    Logger.error('POST /advance error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// 设置修炼效率
router.post('/setPower', (req, res) => {
  const userId = req.userId || 1;
  const { cultivationPower } = req.body;

  try {
    getOrCreateCultivation(userId);
    db.prepare('UPDATE Cultivations SET cultivationPower = ?, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?').run(cultivationPower || 0, userId);
    res.json({ success: true, cultivationPower });
  } catch (err) {
    Logger.error('POST /setPower error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// 离线挂机收益
// 逻辑：计算 now - last_logout，上限8小时，返回离线修炼收益
// 收益公式：realm基础收益 × 离线时间（分钟）× 50%效率
router.get('/offline-rewards', (req, res) => {
  const userId = req.userId || 1;
  const MAX_OFFLINE_MINUTES = 480; // 上限8小时

  try {
    const player = getPlayer(userId);
    if (!player) return res.json({ success: false, message: '玩家不存在' });

    // 获取上次离线时间
    const user = db.prepare('SELECT last_logout FROM Users WHERE id = ?').get(userId);
    const lastLogout = user ? user.last_logout : null;

    if (!lastLogout) {
      return res.json({
        success: true,
        hasOfflineRewards: false,
        message: '无离线记录',
        rewards: { spiritStones: 0, cultivationValue: 0, exp: 0 },
        offlineMinutes: 0
      });
    }

    const lastLogoutTime = new Date(lastLogout).getTime();
    const now = Date.now();
    const elapsedMs = now - lastLogoutTime;
    const elapsedMinutes = Math.floor(elapsedMs / 60000);
    const cappedMinutes = Math.min(elapsedMinutes, MAX_OFFLINE_MINUTES);

    // 境界基础收益：每分钟基础灵气
    const realm = player.realm || 1;
    const realmBaseGain = [0, 10, 25, 60, 150, 400, 1000, 2500, 6000][realm] || 10;
    // 离线效率50%，VIP加成
    const vipBonus = 1 + (player.vipLevel || 0) * 0.1;
    const efficiency = 0.5 * vipBonus;
    const cultivationGain = Math.floor(realmBaseGain * cappedMinutes * efficiency);
    // 离线经验：每分钟5exp × 境界加成
    const expGain = Math.floor(5 * realm * cappedMinutes * efficiency);
    // 离线灵石：每分钟 1-3灵石 × 境界加成
    const lingshiGain = Math.floor((1 + Math.floor(Math.random() * 3)) * realm * cappedMinutes * 0.5);

    res.json({
      success: true,
      hasOfflineRewards: cappedMinutes > 0,
      offlineMinutes: cappedMinutes,
      capped: elapsedMinutes > MAX_OFFLINE_MINUTES,
      lastLogout,
      rewards: {
        cultivationValue: cultivationGain,
        exp: expGain,
        spiritStones: lingshiGain
      },
      efficiency: `${Math.round(efficiency * 100)}%`,
      message: cappedMinutes > 0
        ? `离线${cappedMinutes}分钟，获得灵气+${cultivationGain}，经验+${expGain}，灵石+${lingshiGain}`
        : '离线时间太短，无收益'
    });
  } catch (err) {
    Logger.error('GET /offline-rewards error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// 领取修炼成果（基于挂机时长的阶段奖励）
router.post('/claim', (req, res) => {
  const userId = req.userId || 1;
  const MAX_CLAIM_MINUTES = 480; // 上限8小时

  try {
    const player = getPlayer(userId);
    if (!player) return res.json({ success: false, message: '玩家不存在' });

    const cult = getOrCreateCultivation(userId);
    const config = realmConfig[cult.realm] || realmConfig[1];

    // 获取上次领取时间（如果没有记录，视为首次，可领取全量）
    let lastClaimTime = null;
    if (cult.last_claim_time) {
      // 使用 unixepoch() 获取 UTC 秒级时间戳，JS 直接转为毫秒避免时区歧义
      const claimRow = db.prepare("SELECT strftime('%s', last_claim_time) as ts FROM Cultivations WHERE userId = ?").get(userId);
      lastClaimTime = claimRow && claimRow.ts ? parseInt(claimRow.ts) * 1000 : null;
    }

    const now = Date.now();
    const elapsedMs = now - lastClaimTime;
    const elapsedMinutes = Math.floor(elapsedMs / 60000);

    if (elapsedMinutes < 1) {
      return res.json({ success: false, message: '修炼时间太短，无法领取奖励' });
    }

    const cappedMinutes = Math.min(elapsedMinutes, MAX_CLAIM_MINUTES);
    const realm = cult.realm || 1;
    const realmBaseGain = [0, 10, 25, 60, 150, 400, 1000, 2500, 6000][realm] || 10;
    const vipBonus = 1 + (player.vipLevel || 0) * 0.1;
    // 修炼效率60%，VIP加成为vipBonus
    const efficiency = 0.6 * vipBonus;

    // 灵气收益
    const cultivationGain = Math.floor(realmBaseGain * cappedMinutes * efficiency);
    // 经验收益
    const expGain = Math.floor(5 * realm * cappedMinutes * efficiency);
    // 灵石收益（少量，仅作为bonus）
    const lingshiGain = Math.floor((1 + Math.floor(Math.random() * 5)) * realm * cappedMinutes * 0.3);

    // 突破进度
    const newValue = Math.min(parseInt(cult.value) + cultivationGain, config.cost);
    const progress = Math.min(Math.floor((newValue / config.cost) * 100), 100);
    const realmLevel = config.realm_level || 1;
    const cultivationPower = Math.floor(newValue * 0.1 + realmLevel * 50);

    // 写入DB
    db.prepare("UPDATE Cultivations SET value = ?, cultivationPower = ?, last_claim_time = datetime('now'), updatedAt = datetime('now') WHERE userId = ?").run(newValue, cultivationPower, userId);
    db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(lingshiGain, userId);

    // 每日任务触发
    if (dailyQuestRouter && dailyQuestRouter.updateDailyQuestProgress) {
      try {
        dailyQuestRouter.updateDailyQuestProgress(userId, 'cultivate', 1);
      } catch (e) {
        Logger.error('每日任务更新失败:', e.message);
      }
    }

    // 事件总线
    if (eventBus) {
      eventBus.emit('cultivation:claim', { userId, cultivationGain, lingshiGain });
    }

    res.json({
      success: true,
      claimed: true,
      elapsedMinutes: cappedMinutes,
      capped: elapsedMinutes > MAX_CLAIM_MINUTES,
      rewards: {
        cultivationValue: cultivationGain,
        exp: expGain,
        spiritStones: lingshiGain
      },
      currentValue: newValue,
      progress,
      cultivationPower,
      maxed: newValue >= config.cost,
      message: `领取成功！修炼${cappedMinutes}分钟，获得灵气+${cultivationGain}，经验+${expGain}，灵石+${lingshiGain}`
    });
  } catch (err) {
    Logger.error('POST /claim error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// 灵石直接兑换灵气（100灵石 = 500灵气，每日限10次）
router.post('/exchange', (req, res) => {
  const userId = req.userId || 1;
  const EXCHANGE_COST = 100;      // 消耗100灵石
  const EXCHANGE_GAIN = 500;      // 获得500灵气
  const DAILY_LIMIT = 10;

  try {
    const player = getPlayer(userId);
    if (!player) return res.json({ success: false, message: '玩家不存在' });

    const cult = getOrCreateCultivation(userId);
    const config = realmConfig[cult.realm] || realmConfig[1];
    const today = getShanghaiDateStr();

    // 检查每日兑换次数
    if (cult.last_exchange_date === today) {
      const currentCount = parseInt(cult.daily_exchange_count || 0);
      if (currentCount >= DAILY_LIMIT) {
        return res.json({ success: false, message: `今日兑换次数已用完（${DAILY_LIMIT}/${DAILY_LIMIT}），每天凌晨重置` });
      }
    }

    // 灵石不足检查
    const lingshi = parseInt(player.lingshi || 0);
    if (lingshi < EXCHANGE_COST) {
      return res.json({ success: false, message: '灵石不足' });
    }

    // 扣除灵石，添加灵气
    const newValue = Math.min(parseInt(cult.value) + EXCHANGE_GAIN, config.cost);
    const realmLevel = config.realm_level || 1;
    const newPower = Math.floor(newValue * 0.1 + realmLevel * 50);
    const newLingshi = lingshi - EXCHANGE_COST;
    const newCount = (cult.last_exchange_date === today) ? (parseInt(cult.daily_exchange_count || 0) + 1) : 1;

    db.prepare('UPDATE Users SET lingshi = ? WHERE id = ?').run(newLingshi, userId);
    db.prepare("UPDATE Cultivations SET value = ?, cultivationPower = ?, daily_exchange_count = ?, last_exchange_date = ?, updatedAt = datetime('now') WHERE userId = ?").run(newValue, newPower, newCount, today, userId);

    const newProgress = Math.min(Math.floor((newValue / config.cost) * 100), 100);

    // 每日任务触发
    if (dailyQuestRouter && dailyQuestRouter.updateDailyQuestProgress) {
      try { dailyQuestRouter.updateDailyQuestProgress(userId, 'cultivate', 1); } catch (e) { /* */ }
    }
    if (eventBus) {
      eventBus.emit('cultivation:exchange', { userId, gain: EXCHANGE_GAIN });
    }

    res.json({
      success: true,
      gained: EXCHANGE_GAIN,
      cost: EXCHANGE_COST,
      newValue,
      progress: newProgress,
      cultivationPower: newPower,
      remainingLingshi: newLingshi,
      exchangeCountToday: newCount,
      dailyLimit: DAILY_LIMIT,
      message: `消耗${EXCHANGE_COST}灵石，兑换${EXCHANGE_GAIN}灵气成功！`
    });
  } catch (err) {
    Logger.error('POST /exchange error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// 记录离线（玩家下线时调用）
router.post('/record-logout', (req, res) => {
  const userId = req.userId || 1;
  try {
    db.prepare("UPDATE Users SET last_logout = datetime('now') WHERE id = ?").run(userId);
    res.json({ success: true, message: '离线时间已记录' });
  } catch (err) {
    Logger.error('POST /record-logout error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

module.exports = router;
