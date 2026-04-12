/**
 * 天气系统配置
 * P88-1: 挂机修仙游戏天气/世界状态系统
 * 6种天气类型及其效果配置
 */

const WEATHER_TYPES = {
  CLEAR: {
    id: 'clear',
    name: '晴朗',
    description: '天朗气清，惠风和畅',
    effects: {},
    weights: 25, // 基础权重
  },
  RAIN: {
    id: 'rain',
    name: '雨天',
    description: '细雨绵绵，润物无声',
    effects: {
      fishing_success_rate: 0.20,  // 钓鱼成功率+20%
      gathering_yield: 0.10,         // 采集产量+10%
    },
    weights: 20,
  },
  THUNDER: {
    id: 'thunder',
    name: '雷暴',
    description: '雷霆万钧，天威难测',
    effects: {
      battle_damage: 0.10,          // 战斗伤害+10%
      tribulation_success: 0.05,    // 渡劫成功率+5%
    },
    weights: 12,
  },
  FOG: {
    id: 'fog',
    name: '雾霭',
    description: '烟雾缭绕，视野模糊',
    effects: {
      wild_monster_rate: 0.30,       // 野外遇怪率+30%
      battle_exp: 0.15,             // 战斗经验+15%
    },
    weights: 15,
  },
  SNOW: {
    id: 'snow',
    name: '大雪',
    description: '白雪皑皑，寒气逼人',
    effects: {
      mining_efficiency: 0.20,      // 采矿效率+20%
      spirit_recovery: 0.10,        // 灵力恢复+10%
    },
    weights: 13,
  },
  FAIRY_MIST: {
    id: 'fairy_mist',
    name: '仙雾',
    description: '仙气氤氲，祥瑞笼罩',
    effects: {
      encounter_rate: 0.25,         // 奇遇触发率+25%
    },
    weights: 15,
  },
};

// 计算总权重
const TOTAL_WEIGHTS = Object.values(WEATHER_TYPES).reduce((sum, w) => sum + w.weights, 0);

// 随机选择天气（基于权重）
function randomWeather() {
  let random = Math.random() * TOTAL_WEIGHTS;
  for (const weather of Object.values(WEATHER_TYPES)) {
    random -= weather.weights;
    if (random <= 0) {
      return weather;
    }
  }
  return WEATHER_TYPES.CLEAR;
}

// 获取天气效果
function getWeatherEffect(weatherType) {
  const weather = Object.values(WEATHER_TYPES).find(w => w.id === weatherType);
  return weather ? weather.effects : {};
}

// 全服Buff配置
const WORLD_BUFFS = {
  SPRING_FESTIVAL: {
    id: 'spring_festival',
    name: '春节庆典',
    description: '春节期间，全服收益翻倍！',
    effects: {
      all_exp: 1.0,        // 全部经验+100%
      all_drop: 0.5,       // 掉落率+50%
    },
    startTime: null,
    endTime: null,
  },
  MID_AUTUMN: {
    id: 'mid_autumn',
    name: '中秋佳节',
    description: '月圆之夜，灵力恢复加速',
    effects: {
      spirit_recovery: 0.50,
      gathering_yield: 0.30,
    },
  },
  ANNIVERSARY: {
    id: 'anniversary',
    name: '周年庆典',
    description: '周年庆典，稀有道具掉率提升',
    effects: {
      rare_drop: 1.0,
      all_exp: 0.50,
    },
  },
};

// 祈祷配置
const PRAY_CONFIG = {
  spiritCost: 10000,        // 消耗灵力
  successRate: 0.30,       // 30%成功率
  cooldownMs: 60000,        // 冷却时间1分钟
  weatherDurationMs: 6 * 60 * 60 * 1000, // 天气持续6小时
};

// 天气刷新间隔（毫秒）
const WEATHER_REFRESH_INTERVAL = 6 * 60 * 60 * 1000; // 6小时

module.exports = {
  WEATHER_TYPES,
  TOTAL_WEIGHTS,
  randomWeather,
  getWeatherEffect,
  WORLD_BUFFS,
  PRAY_CONFIG,
  WEATHER_REFRESH_INTERVAL,
};
