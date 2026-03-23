/**
 * 活动系统 v1.0
 * 每日活动/限时活动/周期性活动
 */

// 活动类型
const EVENT_TYPE = {
  daily: { name: '每日活动', color: '#4ecdc4', icon: '📅' },
  limited: { name: '限时活动', color: '#ff6b6b', icon: '⏰' },
  weekly: { name: '周活动', color: '#ffd700', icon: '📆' },
  special: { name: '特殊活动', color: '#9b59b6', icon: '🎉' }
};

// 活动状态
const EVENT_STATUS = {
  upcoming: { name: '即将开始', color: '#888' },
  active: { name: '进行中', color: '#4ecdc4' },
  ended: { name: '已结束', color: '#666' }
};

// 活动配置
const EVENT_CONFIG = {
  // 每日活动
  'daily_sign': {
    id: 'daily_sign',
    name: '每日签到',
    type: 'daily',
    icon: '📝',
    desc: '每日签到获得丰厚奖励',
    rewards: [
      { type: 'stones', value: 100, day: 1 },
      { type: 'stones', value: 200, day: 2 },
      { type: 'stones', value: 300, day: 3 },
      { type: 'stones', value: 500, day: 4 },
      { type: 'stones', value: 800, day: 5 },
      { type: 'stones', value: 1000, day: 6 },
      { type: 'stones', value: 2000, day: 7 }
    ],
    condition: () => true,
    startTime: '00:00',
    endTime: '23:59'
  },
  'daily_exp': {
    id: 'daily_exp',
    name: '双倍经验',
    type: 'daily',
    icon: '✨',
    desc: '修炼获得双倍经验',
    bonus: { exp: 2 },
    condition: () => true,
    startTime: '12:00',
    endTime: '14:00'
  },
  'daily_drop': {
    id: 'daily_drop',
    name: '掉落翻倍',
    type: 'daily',
    icon: '💎',
    desc: '副本掉落概率翻倍',
    bonus: { drop: 2 },
    condition: () => true,
    startTime: '18:00',
    endTime: '22:00'
  },
  
  // 限时活动
  'limited_boss': {
    id: 'limited_boss',
    name: '世界BOSS降临',
    type: 'limited',
    icon: '👹',
    desc: '限定世界BOSS，掉落稀有道具',
    startTime: null,
    endTime: null,
    duration: 3600, // 1小时
    condition: () => gameState.player.level >= 10
  },
  'limited_mall': {
    id: 'limited_mall',
    name: '特惠商城',
    type: 'limited',
    icon: '🏪',
    desc: '限定商品限时折扣',
    startTime: null,
    endTime: null,
    duration: 7200, // 2小时
    condition: () => true,
    discount: 0.5
  },
  
  // 周活动
  'weekly_quest': {
    id: 'weekly_quest',
    name: '周任务',
    type: 'weekly',
    icon: '📋',
    desc: '完成周任务获得大量奖励',
    quests: [
      { target: 100, type: 'cultivate', reward: { stones: 5000 } },
      { target: 10, type: 'dungeon', reward: { stones: 3000 } },
      { target: 5, type: 'boss', reward: { stones: 10000 } }
    ],
    startTime: 'Monday 00:00',
    endTime: 'Sunday 23:59',
    condition: () => true
  },
  
  // 特殊活动
  'new_player': {
    id: 'new_player',
    name: '新手礼包',
    type: 'special',
    icon: '🎁',
    desc: '创建角色即送新手礼包',
    rewards: [
      { type: 'stones', value: 1000 },
      { type: 'item', value: 'starter_pack' }
    ],
    condition: () => !gameState.stats?.newPlayerReward,
    oneTime: true
  },
  'level_gift': {
    id: 'level_gift',
    name: '升级礼包',
    type: 'special',
    icon: '🎂',
    desc: '每提升境界获得升级礼包',
    rewards: [
      { type: 'stones', value: 500 },
      { type: 'item', value: 'realm_gift' }
    ],
    condition: (realm) => realm > (gameState.stats?.lastLevelGiftRealm || 0),
    repeat: true
  }
};

// 活动状态存储
let eventState = {
  signedDays: 0,
  lastSignDate: null,
  dailyRewards: {},
  weeklyProgress: {},
  activeEvents: [],
  eventHistory: []
};

// 初始化活动系统
function initEventSystem() {
  const saved = localStorage.getItem('eventState');
  if (saved) {
    eventState = JSON.parse(saved);
  }
  
  // 检查每日签到重置
  checkDailyReset();
  
  // 加载活动
  loadActiveEvents();
  
  console.log('🎉 活动系统已初始化');
}

// 保存活动状态
function saveEventState() {
  localStorage.setItem('eventState', JSON.stringify(eventState));
}

// 检查每日重置
function checkDailyReset() {
  const today = new Date().toDateString();
  if (eventState.lastSignDate !== today) {
    // 新的一天，重置签到（但不重置连续签到天数）
    eventState.lastSignDate = today;
  }
}

// 加载活动
function loadActiveEvents() {
  eventState.activeEvents = [];
  
  for (const [id, config] of Object.entries(EVENT_CONFIG)) {
    const status = getEventStatus(config);
    if (status === 'active') {
      eventState.activeEvents.push({ id, ...config, status });
    }
  }
}

// 获取活动状态
function getEventStatus(config) {
  // 一次性活动
  if (config.oneTime) {
    if (config.condition()) return 'active';
    return 'ended';
  }
  
  // 每日活动
  if (config.type === 'daily') {
    const now = new Date();
    const currentHour = now.getHours();
    const [startHour] = config.startTime.split(':').map(Number);
    const [endHour] = config.endTime.split(':').map(Number);
    
    if (currentHour >= startHour && currentHour < endHour) {
      return 'active';
    } else if (currentHour < startHour) {
      return 'upcoming';
    }
    return 'ended';
  }
  
  // 周活动
  if (config.type === 'weekly') {
    return 'active';
  }
  
  return 'active';
}

// 签到
function signIn() {
  const today = new Date().toDateString();
  
  if (eventState.lastSignDate === today) {
    return { success: false, message: '今日已签到' };
  }
  
  const event = EVENT_CONFIG.daily_sign;
  const dayIndex = eventState.signedDays % 7;
  const reward = event.rewards[dayIndex];
  
  // 发放奖励
  if (reward.type === 'stones') {
    gameState.player.spiritStones += reward.value;
  }
  
  eventState.signedDays++;
  eventState.lastSignDate = today;
  saveEventState();
  
  gameState.stats.dailySignDays = eventState.signedDays;
  
  return {
    success: true,
    message: `签到成功！获得 ${reward.value} 灵石`,
    day: dayIndex + 1,
    reward
  };
}

// 领取每日奖励
function claimDailyReward(eventId) {
  const config = EVENT_CONFIG[eventId];
  if (!config) return { success: false, message: '活动不存在' };
  
  if (eventState.dailyRewards[eventId]) {
    return { success: false, message: '今日已领取' };
  }
  
  // 检查条件
  if (!config.condition()) {
    return { success: false, message: '不满足参与条件' };
  }
  
  // 发放奖励
  if (config.rewards) {
    for (const reward of config.rewards) {
      if (reward.type === 'stones') {
        gameState.player.spiritStones += reward.value;
      } else if (reward.type === 'exp') {
        gameState.player.experience += reward.value;
      }
    }
  }
  
  eventState.dailyRewards[eventId] = true;
  saveEventState();
  
  return { success: true, message: '奖励已发放' };
}

// 获取活动加成
function getEventBonus() {
  let bonus = { exp: 1, drop: 1, stones: 1 };
  
  for (const event of eventState.activeEvents) {
    if (event.bonus) {
      if (event.bonus.exp) bonus.exp *= event.bonus.exp;
      if (event.bonus.drop) bonus.drop *= event.bonus.drop;
      if (event.bonus.stones) bonus.stones *= event.bonus.stones;
    }
  }
  
  return bonus;
}

// 获取可用的活动列表
function getActiveEvents() {
  loadActiveEvents();
  return eventState.activeEvents;
}

// 获取签到信息
function getSignInfo() {
  return {
    signedDays: eventState.signedDays,
    lastSignDate: eventState.lastSignDate,
    todaySigned: eventState.lastSignDate === new Date().toDateString()
  };
}

// 领取升级礼包
function claimLevelGift(realm) {
  const config = EVENT_CONFIG.level_gift;
  
  if (!config.condition(realm)) {
    return { success: false, message: '已领取过此境界的礼包' };
  }
  
  // 发放奖励
  for (const reward of config.rewards) {
    if (reward.type === 'stones') {
      gameState.player.spiritStones += reward.value;
    } else if (reward.type === 'item') {
      gameState.player.artifacts_inventory = gameState.player.artifacts_inventory || {};
      gameState.player.artifacts_inventory[reward.value] = (gameState.player.artifacts_inventory[reward.value] || 0) + 1;
    }
  }
  
  gameState.stats.lastLevelGiftRealm = realm;
  saveEventState();
  
  return { success: true, message: '升级礼包已发放' };
}

// 导出
window.EVENT_TYPE = EVENT_TYPE;
window.EVENT_STATUS = EVENT_STATUS;
window.EVENT_CONFIG = EVENT_CONFIG;
window.eventState = eventState;
window.initEventSystem = initEventSystem;
window.signIn = signIn;
window.claimDailyReward = claimDailyReward;
window.getEventBonus = getEventBonus;
window.getActiveEvents = getActiveEvents;
window.getSignInfo = getSignInfo;
window.claimLevelGift = claimLevelGift;

console.log('🎉 活动系统 v1.0 已加载');
