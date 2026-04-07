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

// 任务系统进度更新
let questRouter;
try {
  questRouter = require('./quest');
} catch (e) {
  Logger.info('quest 路由未找到:', e.message);
}

// 事件总线
let eventBus;
try {
  eventBus = require('../../game/eventBus');
} catch (e) {
  Logger.info('eventBus 加载失败:', e.message);
  eventBus = null;
}

// 灵根加成
let getSpiritRootBonus;
try {
  const playerModule = require('./player');
  getSpiritRootBonus = playerModule.getSpiritRootBonus;
} catch (e) {
  Logger.info('getSpiritRootBonus 加载失败:', e.message);
  getSpiritRootBonus = () => ({ spiritRate: 1.0 });
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
  try { db.exec("ALTER TABLE Users ADD COLUMN spirit_stone_reserve INTEGER DEFAULT 100"); } catch (e) { /* 列已存在 */ }
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

// 境界基础配置（9个境界：练气→筑基→金丹→元婴→化神→炼虚→大乘→渡劫→真仙）
const REALM_BASE_CONFIG = {
  1: { name: '练气', icon: '🧘', realm_level: 1 },
  2: { name: '筑基', icon: '🔮', realm_level: 2 },
  3: { name: '金丹', icon: '🌟', realm_level: 3 },
  4: { name: '元婴', icon: '👼', realm_level: 4 },
  5: { name: '化神', icon: '✨', realm_level: 5 },
  6: { name: '炼虚', icon: '💫', realm_level: 6 },
  7: { name: '大乘', icon: '🔥', realm_level: 7 },
  8: { name: '渡劫', icon: '⚡', realm_level: 8 },
  9: { name: '真仙', icon: '🌟', realm_level: 9 },
};

// 境界突破消耗配置（境界1~3: 3000/8000/15000；境界4+: realm × 10000；渡劫/真仙更高）
const realmConfig = {
  1: { name: '练气', icon: '🧘', realm_level: 1, cost: 3000 },
  2: { name: '筑基', icon: '🔮', realm_level: 2, cost: 8000 },
  3: { name: '金丹', icon: '🌟', realm_level: 3, cost: 15000 },
  4: { name: '元婴', icon: '👼', realm_level: 4, cost: 15000 },  // 原40000，修复金丹→元婴数值断崖
  5: { name: '化神', icon: '✨', realm_level: 5, cost: 20000 },  // 原50000，修复元婴→化神数值断崖
  6: { name: '炼虚', icon: '💫', realm_level: 6, cost: 60000 },
  7: { name: '大乘', icon: '🔥', realm_level: 7, cost: 70000 },
  8: { name: '渡劫', icon: '⚡', realm_level: 8, cost: 90000 },
  9: { name: '真仙', icon: '🌟', realm_level: 9, cost: 150000 },
};

// 境界消耗灵石（修炼一次，动态计算）
// 基础10灵石，随cultivationPower增长，每1000点+3灵石，上限500灵石（修复P0-115-1数值断崖）
const getCultivationCost = (cultivationPower) => {
  const base = 10;
  const extra = Math.floor(cultivationPower / 1000) * 3;
  return Math.min(base + extra, 500);
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
        db.prepare("INSERT INTO Cultivations (userId, value, realm, cultivationPower, accumulated_power, createdAt, updatedAt) VALUES (?, 0, 1, 0, 0, datetime('now'), datetime('now'))").run(userId);
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
        lingshi: user.lingshi,
        spirit_stone_reserve: user.spirit_stone_reserve
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
    const storedPower = parseInt(cult.cultivationPower) || 0;
    const accumulatedPower = parseInt(cult.accumulated_power) || 0;
    const rootBonus = getSpiritRootBonus(db, userId);
    const spiritRate = rootBonus.spiritRate || 1.0;
    const cultivationPower = Math.floor((storedPower + accumulatedPower * 0.001 + parseInt(cult.value) * 0.1 + realmLevel * 50) * spiritRate);

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
        spiritRate
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
    const storedPower = parseInt(cult.cultivationPower) || 0;
    const accumulatedPower = parseInt(cult.accumulated_power) || 0;
    const rootBonus = getSpiritRootBonus(db, userId);
    const spiritRate = rootBonus.spiritRate || 1.0;
    const cultivationPower = Math.floor((storedPower + accumulatedPower * 0.001 + parseInt(cult.value) * 0.1 + realmLevel * 50) * spiritRate);
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
        spiritRate,
        accumulatedPower,
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
    const storedPower = parseInt(cult.cultivationPower) || 0;
    const accumulatedPower = parseInt(cult.accumulated_power) || 0;
    const rootBonus = getSpiritRootBonus(db, userId);
    const spiritRate = rootBonus.spiritRate || 1.0;
    const cultivationPower = Math.floor((storedPower + accumulatedPower * 0.001 + parseInt(cult.value) * 0.1 + realmLevel * 50) * spiritRate);

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
        spiritRate
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
    // 灵根加成
    const rootBonus = getSpiritRootBonus(db, userId);
    const spiritRate = rootBonus.spiritRate || 1.0;
    // 优先使用DB中存储的cultivationPower（突破后保留值），再加上当前修炼值的贡献
    const storedPower = parseInt(cult.cultivationPower) || 0;
    const currentCultivationPower = Math.floor((storedPower + parseInt(cult.value) * 0.1 + realmLevel * 50) * spiritRate);
    const LINGSHI_COST = getCultivationCost(currentCultivationPower);

    // 灵石不足检查
    const currentLingshi = parseInt(player.lingshi || 0);
    // ========== 灵石保留阈值保护 ==========
    const reserveThreshold = parseInt(player.spirit_stone_reserve) || 100;
    const lingshiAfterCost = currentLingshi - LINGSHI_COST;
    if (lingshiAfterCost < reserveThreshold) {
      return res.json({
        success: false,
        autoStopped: true,
        message: `灵石保留阈值保护：当前灵石 ${currentLingshi}，修炼消耗 ${LINGSHI_COST}，余额将低于保留底线 ${reserveThreshold}`,
        reserveThreshold,
        currentLingshi,
        lingshiCost: LINGSHI_COST
      });
    }
    if (currentLingshi < LINGSHI_COST) {
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

    // ========== 累积修炼值：每次修炼累加到 accumulated_power（历史总修炼量）==========
    const oldAccumulatedPower = parseInt(cult.accumulated_power) || 0;
    const newAccumulatedPower = oldAccumulatedPower + gain;

    const newValue = Math.min(parseInt(cult.value) + gain, config.cost);
    const newProgress = Math.min(Math.floor((newValue / config.cost) * 100), 100);
    // 同步修炼值 + cultivationPower（永久写入DB，解决永久=0问题）
    // cultivationPower = (保留的修炼效率(retainedPower) + 历史总修炼量(accumulated_power×0.001) + 境界基础) × spiritRate
    const finalCultivationPower = Math.floor((storedPower + newAccumulatedPower * 0.001 + realmLevel * 50) * spiritRate);

    // 扣除灵石（写入 Users.lingshi，权威数据源）
    db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(LINGSHI_COST, userId);
    // 同步修炼值 + cultivationPower + accumulated_power
    db.prepare('UPDATE Cultivations SET value = ?, cultivationPower = ?, accumulated_power = ?, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?').run(newValue, finalCultivationPower, newAccumulatedPower, userId);
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

    // ========== 任务系统进度更新：修炼 ==========
    if (questRouter && questRouter.updateQuestProgressByType) {
      try {
        questRouter.updateQuestProgressByType(userId, 'cultivate', 1);
      } catch (e) {
        Logger.error('任务进度更新失败(cultivate):', e.message);
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
      spiritRate,
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
    db.prepare('UPDATE player SET realm = ?, realm_level = ?, level = level + 1 WHERE id = ?').run(nextRealm, nextRealm, userId);
    
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

    // ========== 任务系统进度更新：境界突破 ==========
    if (questRouter && questRouter.updateQuestProgressByType) {
      try {
        questRouter.updateQuestProgressByType(userId, 'realm_breakthrough', 1);
      } catch (e) {
        Logger.error('任务进度更新失败(realm_breakthrough):', e.message);
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
    db.prepare('UPDATE player SET realm = ?, realm_level = ?, level = level + 1 WHERE id = ?').run(nextRealm, nextRealm, userId);

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

    // ========== 任务系统进度更新：境界跃迁 ==========
    if (questRouter && questRouter.updateQuestProgressByType) {
      try {
        questRouter.updateQuestProgressByType(userId, 'realm_breakthrough', 1);
      } catch (e) {
        Logger.error('任务进度更新失败(realm_breakthrough):', e.message);
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

    // ========== 任务系统进度更新：领取修炼收益 ==========
    if (questRouter && questRouter.updateQuestProgressByType) {
      try {
        questRouter.updateQuestProgressByType(userId, 'cultivate', 1);
      } catch (e) {
        Logger.error('任务进度更新失败(cultivate):', e.message);
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

// 灵石保留阈值设置
router.get('/reserve', (req, res) => {
  const userId = req.userId || 1;
  try {
    const player = db.prepare('SELECT id, lingshi, spirit_stone_reserve FROM Users WHERE id = ?').get(userId);
    if (!player) return res.json({ success: false, message: '玩家不存在' });
    res.json({
      success: true,
      reserveThreshold: player.spirit_stone_reserve || 100,
      currentLingshi: player.lingshi,
      message: `当前灵石保留阈值：${player.spirit_stone_reserve || 100}灵石，余额：${player.lingshi}`
    });
  } catch (err) {
    Logger.error('GET /reserve error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

router.post('/reserve', (req, res) => {
  const userId = req.userId || 1;
  const { threshold } = req.body;
  if (threshold === undefined || threshold === null) {
    return res.json({ success: false, message: '请提供 threshold 参数（保留灵石数量）' });
  }
  const newThreshold = Math.max(0, parseInt(threshold) || 100);
  try {
    db.prepare('UPDATE Users SET spirit_stone_reserve = ? WHERE id = ?').run(newThreshold, userId);
    res.json({
      success: true,
      reserveThreshold: newThreshold,
      message: `灵石保留阈值已设置为 ${newThreshold}灵石，余额低于此值时自动停止修炼`
    });
  } catch (err) {
    Logger.error('POST /reserve error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// =====================================================
// P0-1 修炼属性系统 - 攻击/防御/抗性/速度/暴击 各10级
// =====================================================

// 修炼属性等级表（1-10级）
const CULTIVATION_ATTRS = {
  attack:      { name: '攻击修炼', perLevel: [5, 10, 15, 20, 25, 35, 45, 60, 80, 100] },
  defense:     { name: '防御修炼', perLevel: [3, 6, 9, 12, 15, 21, 27, 36, 48, 60] },
  resistance:  { name: '抗性修炼', perLevel: [3, 6, 9, 12, 15, 21, 27, 36, 48, 60] },
  speed:       { name: '速度修炼', perLevel: [2, 4, 6, 8, 10, 14, 18, 24, 32, 40] },
  crit:        { name: '暴击修炼', perLevel: [0.5, 1, 1.5, 2, 2.5, 3.5, 4.5, 6, 8, 10] },
};

// 每级修炼消耗（level 1~10）
const UPGRADE_COSTS = [
  { lingshi: 500,  cultivationPower: 100 },  // 1→2
  { lingshi: 1200, cultivationPower: 250 },  // 2→3
  { lingshi: 2500, cultivationPower: 500 },  // 3→4
  { lingshi: 5000, cultivationPower: 1000 }, // 4→5
  { lingshi: 10000, cultivationPower: 2000 },// 5→6
  { lingshi: 18000, cultivationPower: 3500 },// 6→7
  { lingshi: 30000, cultivationPower: 6000 },// 7→8
  { lingshi: 50000, cultivationPower: 10000 },// 8→9
  { lingshi: 80000, cultivationPower: 16000 },// 9→10 (max)
];

// 初始化修炼属性表
try {
  db.exec(`CREATE TABLE IF NOT EXISTS cultivation_attributes (
    user_id TEXT PRIMARY KEY,
    attack_level INTEGER DEFAULT 0,
    defense_level INTEGER DEFAULT 0,
    resistance_level INTEGER DEFAULT 0,
    speed_level INTEGER DEFAULT 0,
    crit_level INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
} catch (e) {
  Logger.error('cultivation_attributes 表初始化失败:', e.message);
}

// 获取或初始化修炼属性
function getOrCreateAttrs(userId) {
  try {
    let attrs = db.prepare('SELECT * FROM cultivation_attributes WHERE user_id = ?').get(String(userId));
    if (!attrs) {
      db.prepare('INSERT INTO cultivation_attributes (user_id) VALUES (?)').run(String(userId));
      attrs = db.prepare('SELECT * FROM cultivation_attributes WHERE user_id = ?').get(String(userId));
    }
    return attrs;
  } catch (e) {
    Logger.error('getOrCreateAttrs error:', e.message);
    return { user_id: String(userId), attack_level: 0, defense_level: 0, resistance_level: 0, speed_level: 0, crit_level: 0 };
  }
}

// 计算属性总加成（根据各属性等级）
function calcAttrBonuses(attrs) {
  const result = {};
  for (const [key, cfg] of Object.entries(CULTIVATION_ATTRS)) {
    const level = Math.min(10, Math.max(0, attrs[key + '_level'] || 0));
    let total = 0;
    for (let i = 0; i < level; i++) {
      total += cfg.perLevel[i];
    }
    result[key] = key === 'crit' ? Math.min(50, total) : total; // 暴击上限50%
  }
  return result;
}

// GET /api/cultivation/attributes - 获取修炼属性状态
router.get('/attributes', (req, res) => {
  const userId = req.userId || 1;
  try {
    const attrs = getOrCreateAttrs(userId);
    const bonuses = calcAttrBonuses(attrs);
    const cult = getOrCreateCultivation(userId);
    res.json({
      success: true,
      attributes: {
        attack:     { level: attrs.attack_level,     bonus: bonuses.attack,     nextCost: UPGRADE_COSTS[attrs.attack_level] },
        defense:    { level: attrs.defense_level,    bonus: bonuses.defense,    nextCost: UPGRADE_COSTS[attrs.defense_level] },
        resistance: { level: attrs.resistance_level, bonus: bonuses.resistance, nextCost: UPGRADE_COSTS[attrs.resistance_level] },
        speed:      { level: attrs.speed_level,      bonus: bonuses.speed,      nextCost: UPGRADE_COSTS[attrs.speed_level] },
        crit:       { level: attrs.crit_level,       bonus: bonuses.crit,       nextCost: UPGRADE_COSTS[attrs.crit_level] },
      },
      bonuses,
      currency: {
        lingshi:           (db.prepare('SELECT lingshi FROM Users WHERE id = ?').get(userId) || {}).lingshi || 0,
        cultivationPower:  parseInt(cult.cultivationPower) || 0,
      }
    });
  } catch (err) {
    Logger.error('GET /attributes error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// POST /api/cultivation/attributes/upgrade - 升级修炼属性
router.post('/attributes/upgrade', (req, res) => {
  const userId = req.userId || 1;
  const { attr } = req.body; // attack | defense | resistance | speed | crit

  if (!attr || !CULTIVATION_ATTRS[attr]) {
    return res.json({ success: false, message: '无效的属性类型，可选：attack/defense/resistance/speed/crit' });
  }

  try {
    const attrs = getOrCreateAttrs(userId);
    const levelKey = attr + '_level';
    const currentLevel = attrs[levelKey] || 0;

    if (currentLevel >= 10) {
      return res.json({ success: false, message: '已达最高等级（10级）' });
    }

    const cost = UPGRADE_COSTS[currentLevel];
    if (!cost) {
      return res.json({ success: false, message: '已达最高等级' });
    }

    // 扣灵石
    const user = db.prepare('SELECT lingshi FROM Users WHERE id = ?').get(userId);
    if (!user || (user.lingshi || 0) < cost.lingshi) {
      return res.json({ success: false, message: `灵石不足，需要${cost.lingshi}灵石` });
    }

    // 扣修为值
    const cult = getOrCreateCultivation(userId);
    const cultivationPower = parseInt(cult.cultivationPower) || 0;
    if (cultivationPower < cost.cultivationPower) {
      return res.json({ success: false, message: `修为值不足，需要${cost.cultivationPower}修为，当前${cultivationPower}` });
    }

    // 执行扣费 + 升级
    db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(cost.lingshi, userId);
    db.prepare('UPDATE Cultivations SET cultivationPower = cultivationPower - ? WHERE userId = ?').run(cost.cultivationPower, userId);
    db.prepare(`UPDATE cultivation_attributes SET ${levelKey} = ${levelKey} + 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`).run(String(userId));

    const newAttrs = getOrCreateAttrs(userId);
    const newLevel = newAttrs[levelKey];
    const newBonuses = calcAttrBonuses(newAttrs);

    Logger.info(`[cultivation:attr] userId=${userId} attr=${attr} level=${currentLevel}→${newLevel}`);

    res.json({
      success: true,
      message: `${CULTIVATION_ATTRS[attr].name} 升级成功！${currentLevel}级 → ${newLevel}级`,
      attribute: attr,
      level: newLevel,
      bonus: newBonuses[attr],
      nextCost: newLevel < 10 ? UPGRADE_COSTS[newLevel] : null,
    });
  } catch (err) {
    Logger.error('POST /attributes/upgrade error:', err.message);
    res.json({ success: false, message: err.message });
  }
});


// ========== 修炼速度实时API ==========
// GET /api/cultivation/speed - 获取实时修炼速度统计

router.get('/speed/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    // 获取玩家基本信息
    const user = db.prepare('SELECT * FROM Users WHERE id = ?').get(userId);
    if (!user) {
      return res.json({ success: false, message: '玩家不存在' });
    }
    
    // 获取修炼数据
    const cult = db.prepare('SELECT * FROM Cultivations WHERE userId = ?').get(userId);
    if (!cult) {
      return res.json({ success: false, message: '修炼数据不存在' });
    }
    
    // 计算基础修炼速度（灵气/秒）
    const baseSpeed = 0.5;
    const realmBonus = (user.realm_level || 1) * 0.2;
    const spiritRootBonus = getSpiritRootBonus ? getSpiritRootBonus(db, userId).spiritRate : 1.0;
    const totalSpiritPerSecond = baseSpeed * realmBonus * spiritRootBonus;
    
    // 计算顿悟概率
    const enlightenmentChance = Math.min(5, (user.realm_level || 1) * 0.5);
    
    // 今日修炼时长
    const lastLogin = cult.last_cultivate_time ? new Date(cult.last_cultivate_time) : new Date();
    const now = new Date();
    const secondsSinceLastCultivate = Math.floor((now - lastLogin) / 1000);
    
    // 预计收益
    const expectedSpiritGain = Math.floor(totalSpiritPerSecond * secondsSinceLastCultivate);
    const expectedPowerGain = Math.floor(expectedSpiritGain * 0.1 * (user.realm_level || 1));
    
    res.json({
      success: true,
      data: {
        spiritPerSecond: totalSpiritPerSecond.toFixed(2),
        enlightenmentChance: enlightenmentChance.toFixed(2) + '%',
        currentRealm: user.realm_level || 1,
        realmName: REALM_BASE_CONFIG[user.realm_level || 1]?.name || '练气',
        onlineSeconds: secondsSinceLastCultivate,
        expectedSpiritGain,
        expectedPowerGain,
        bonuses: {
          realm: realmBonus.toFixed(2),
          spiritRoot: spiritRootBonus.toFixed(2),
        }
      }
    });
  } catch (err) {
    Logger.error('GET /cultivation/speed error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

module.exports = router;
