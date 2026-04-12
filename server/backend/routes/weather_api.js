/**
 * 天气/世界状态系统 API路由
 * P88-1: 挂机修仙游戏天气/世界状态系统
 * 端点: /api/world/weather, /api/world/buffs, /api/world/pray
 */

const express = require('express');
const router = express.Router();
const path = require('path');

const {
  WEATHER_TYPES,
  randomWeather,
  getWeatherEffect,
  WORLD_BUFFS,
  PRAY_CONFIG,
  WEATHER_REFRESH_INTERVAL,
} = require('../config/weather_config');

// 数据库路径
const DB_PATH = path.join(__dirname, '..', 'data', 'game.db');
let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
} catch (e) {
  console.warn('[weather_api] better-sqlite3 不可用，使用空实现');
  db = {
    prepare: () => ({
      get: () => null,
      all: () => [],
      run: () => {},
    }),
  };
}

// ============ 辅助函数 ============

// 获取当前世界天气
function getCurrentWeather() {
  try {
    let row = db.prepare(`SELECT * FROM world_weather ORDER BY id DESC LIMIT 1`).get();
    if (!row) {
      // 初始化天气
      const weather = randomWeather();
      const now = Date.now();
      const endTime = now + WEATHER_REFRESH_INTERVAL;
      db.prepare(`
        INSERT INTO world_weather (weather_type, effect, start_time, end_time, praying_count)
        VALUES (?, ?, ?, ?, 0)
      `).run(weather.id, JSON.stringify(weather.effects), now, endTime);
      row = { weather_type: weather.id, effect: JSON.stringify(weather.effects), start_time: now, end_time: endTime, praying_count: 0 };
    }
    return row;
  } catch (e) {
    console.error('[weather_api] getCurrentWeather error:', e.message);
    const weather = randomWeather();
    return {
      weather_type: weather.id,
      effect: JSON.stringify(weather.effects),
      start_time: Date.now(),
      end_time: Date.now() + WEATHER_REFRESH_INTERVAL,
      praying_count: 0,
    };
  }
}

// 更新世界天气
function updateWorldWeather(weatherType) {
  const weather = Object.values(WEATHER_TYPES).find(w => w.id === weatherType) || WEATHER_TYPES.CLEAR;
  const now = Date.now();
  const endTime = now + WEATHER_REFRESH_INTERVAL;
  try {
    db.prepare(`
      INSERT INTO world_weather (weather_type, effect, start_time, end_time, praying_count)
      VALUES (?, ?, ?, ?, 0)
    `).run(weather.id, JSON.stringify(weather.effects), now, endTime);
  } catch (e) {
    console.error('[weather_api] updateWorldWeather error:', e.message);
  }
  return weather;
}

// 检查并刷新天气（如果已过期）
function checkAndRefreshWeather() {
  const current = getCurrentWeather();
  const now = Date.now();
  if (current.end_time && now > current.end_time) {
    const weather = randomWeather();
    const endTime = now + WEATHER_REFRESH_INTERVAL;
    try {
      db.prepare(`
        INSERT INTO world_weather (weather_type, effect, start_time, end_time, praying_count)
        VALUES (?, ?, ?, ?, ?)
      `).run(weather.id, JSON.stringify(weather.effects), now, endTime, current.praying_count || 0);
    } catch (e) {
      console.error('[weather_api] checkAndRefreshWeather error:', e.message);
    }
    return weather;
  }
  const weather = Object.values(WEATHER_TYPES).find(w => w.id === current.weather_type) || WEATHER_TYPES.CLEAR;
  return weather;
}

// 获取玩家灵力
function getPlayerSpirit(playerId) {
  try {
    const player = db.prepare(`SELECT spirit FROM player WHERE id = ?`).get(playerId);
    return player ? (player.spirit || 0) : 0;
  } catch (e) {
    return 0;
  }
}

// 扣除玩家灵力
function deductSpirit(playerId, amount) {
  try {
    db.prepare(`UPDATE player SET spirit = MAX(0, spirit - ?) WHERE id = ?`).run(amount, playerId);
    return true;
  } catch (e) {
    console.error('[weather_api] deductSpirit error:', e.message);
    return false;
  }
}

// ============ API 端点 ============

// GET /api/world/weather - 获取当前世界天气
router.get('/weather', (req, res) => {
  const weather = checkAndRefreshWeather();
  const current = getCurrentWeather();

  res.json({
    code: 0,
    message: '获取天气成功',
    data: {
      weather: weather.id,
      weatherName: weather.name,
      description: weather.description,
      effect: weather.effects,
      startTime: current.start_time || Date.now(),
      endTime: current.end_time || (Date.now() + WEATHER_REFRESH_INTERVAL),
      remainingMs: Math.max(0, (current.end_time || 0) - Date.now()),
    },
  });
});

// GET /api/world/buffs - 获取全服Buff列表
router.get('/buffs', (req, res) => {
  const activeBuffs = [];

  // 遍历所有配置的全服Buff（这里可以扩展为数据库存储的活跃Buff）
  for (const buff of Object.values(WORLD_BUFFS)) {
    activeBuffs.push({
      id: buff.id,
      name: buff.name,
      description: buff.description,
      effects: buff.effects,
    });
  }

  res.json({
    code: 0,
    message: '获取全服Buff成功',
    data: {
      activeBuffs,
    },
  });
});

// POST /api/world/pray - 祈祷改变天气
router.post('/pray', (req, res) => {
  const playerId = req.body?.player_id || req.query?.player_id || 1;

  // 检查灵力是否足够
  const spirit = getPlayerSpirit(playerId);
  if (spirit < PRAY_CONFIG.spiritCost) {
    return res.json({
      code: 1,
      message: `灵力不足，需要 ${PRAY_CONFIG.spiritCost} 灵力，当前 ${spirit} 灵力`,
      data: { success: false },
    });
  }

  // 扣除灵力
  if (!deductSpirit(playerId, PRAY_CONFIG.spiritCost)) {
    return res.json({
      code: 1,
      message: '扣除灵力失败',
      data: { success: false },
    });
  }

  // 更新祈祷次数
  try {
    db.prepare(`UPDATE world_weather SET praying_count = praying_count + 1 ORDER BY id DESC LIMIT 1`).run();
  } catch (e) {}

  // 30%成功率
  const success = Math.random() < PRAY_CONFIG.successRate;
  let newWeather;

  if (success) {
    // 成功：随机选择一个新天气（避免和当前相同）
    const current = getCurrentWeather();
    let newWeatherType;
    do {
      newWeather = randomWeather();
      newWeatherType = newWeather.id;
    } while (newWeatherType === current.weather_type);

    updateWorldWeather(newWeatherType);
  } else {
    // 失败：保持当前天气
    newWeather = checkAndRefreshWeather();
  }

  res.json({
    code: 0,
    message: success ? '祈祷成功，天气已改变！' : '祈祷未能改变天气，天意难违...',
    data: {
      success,
      newWeather: newWeather.id,
      newWeatherName: newWeather.name,
      newDescription: newWeather.description,
      spiritCost: PRAY_CONFIG.spiritCost,
      spiritRemaining: spirit - PRAY_CONFIG.spiritCost,
    },
  });
});

// GET /api/world/weather/effects - 获取当前天气的效果（供其他系统调用）
router.get('/weather/effects', (req, res) => {
  const weather = checkAndRefreshWeather();
  res.json({
    code: 0,
    data: weather.effects,
  });
});

// GET /api/world/weather/apply - 应用天气效果到具体数值（供其他系统调用）
// query: type=fishing|gathering|battle|tribulation|mining|spirit|encounter
// query: baseValue=100
router.get('/weather/apply', (req, res) => {
  const { type, baseValue } = req.query;
  const weather = checkAndRefreshWeather();
  const base = parseFloat(baseValue) || 0;

  let multiplier = 1.0;
  const effects = weather.effects;

  switch (type) {
    case 'fishing':
      // 钓鱼成功率
      multiplier = 1.0 + (effects.fishing_success_rate || 0);
      break;
    case 'gathering':
      // 采集产量
      multiplier = 1.0 + (effects.gathering_yield || 0);
      break;
    case 'battle_damage':
      // 战斗伤害
      multiplier = 1.0 + (effects.battle_damage || 0);
      break;
    case 'tribulation':
      // 渡劫成功率（需要特殊处理，可能是加值不是乘数）
      multiplier = effects.tribulation_success || 0;
      break;
    case 'mining':
      // 采矿效率
      multiplier = 1.0 + (effects.mining_efficiency || 0);
      break;
    case 'spirit':
      // 灵力恢复
      multiplier = 1.0 + (effects.spirit_recovery || 0);
      break;
    case 'encounter':
      // 奇遇触发
      multiplier = 1.0 + (effects.encounter_rate || 0);
      break;
    case 'wild_monster':
      // 野外遇怪率
      multiplier = 1.0 + (effects.wild_monster_rate || 0);
      break;
    case 'battle_exp':
      // 战斗经验
      multiplier = 1.0 + (effects.battle_exp || 0);
      break;
    default:
      multiplier = 1.0;
  }

  res.json({
    code: 0,
    data: {
      baseValue: base,
      multiplier,
      finalValue: base * multiplier,
      weatherName: weather.name,
    },
  });
});

// 定时刷新天气的 cron 任务注册（供 server.js 调用）
let weatherRefreshTimer = null;

function startWeatherRefresh() {
  if (weatherRefreshTimer) {
    clearInterval(weatherRefreshTimer);
  }

  // 检查天气是否需要刷新
  weatherRefreshTimer = setInterval(() => {
    try {
      const current = getCurrentWeather();
      const now = Date.now();
      if (current.end_time && now > current.end_time) {
        const newWeather = randomWeather();
        updateWorldWeather(newWeather.id);
        console.log(`[weather_api] 天气已刷新: ${newWeather.name}`);
      }
    } catch (e) {
      console.error('[weather_api] 天气刷新错误:', e.message);
    }
  }, 60 * 1000); // 每分钟检查一次
}

// 初始化数据库表
function initWorldWeatherTable() {
  try {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS world_weather (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        weather_type TEXT NOT NULL,
        effect TEXT,
        start_time INTEGER NOT NULL,
        end_time INTEGER NOT NULL,
        praying_count INTEGER DEFAULT 0
      )
    `).run();
    console.log('[weather_api] world_weather 表初始化完成');
  } catch (e) {
    console.error('[weather_api] world_weather 表初始化错误:', e.message);
  }
}

// 启动时初始化
initWorldWeatherTable();
startWeatherRefresh();

module.exports = router;
module.exports.startWeatherRefresh = startWeatherRefresh;
