/**
 * 仙侠奇遇系统 - 数据存储层
 * 管理奇遇数据持久化
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/adventures.json');

// 内存数据结构
let adventuresData = {
  // 用户奇遇记录: { [userId]: UserAdventureData }
  users: {},
  
  // 全局奇遇刷新时间
  globalRefreshAt: null,
  
  // 奇遇历史日志
  logs: []
};

/**
 * 初始化存储，加载数据文件
 */
function init() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const loaded = JSON.parse(raw);
      adventuresData = { ...adventuresData, ...loaded };
      console.log('[AdventureStorage] 已从文件加载奇遇数据');
    } else {
      save();
      console.log('[AdventureStorage] 已创建新的奇遇数据文件');
    }
  } catch (e) {
    console.error('[AdventureStorage] 加载数据失败:', e.message);
  }
}

/**
 * 保存数据到文件
 */
function save() {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(adventuresData, null, 2), 'utf-8');
  } catch (e) {
    console.error('[AdventureStorage] 保存数据失败:', e.message);
  }
}

/**
 * 获取用户的奇遇数据
 * @param {number|string} userId 
 * @returns {Object} UserAdventureData
 */
function getUserData(userId) {
  const uid = String(userId);
  if (!adventuresData.users[uid]) {
    adventuresData.users[uid] = createEmptyUserData();
  }
  return adventuresData.users[uid];
}

/**
 * 创建空用户奇遇数据
 */
function createEmptyUserData() {
  return {
    // 玩家ID
    userId: null,
    
    // 已触发的奇遇记录
    triggeredAdventures: [],
    
    // 今日已完成奇遇
    completedToday: [],
    
    // 奇遇冷却时间记录 { adventureType: timestamp }
    cooldowns: {},
    
    // 累计奇遇奖励统计
    totalRewards: {
      lingshi: 0,
      exp: 0,
      items: 0
    },
    
    // 奇遇探索度（影响触发概率）
    explorationPoints: 0,
    
    // 最后刷新日期
    lastRefreshDate: getTodayStr(),
    
    // 当前可用的奇遇列表
    availableAdventures: []
  };
}

/**
 * 获取今日日期字符串
 */
function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

/**
 * 检查并执行每日刷新
 */
function checkDailyRefresh(userId) {
  const userData = getUserData(userId);
  const today = getTodayStr();
  
  if (userData.lastRefreshDate !== today) {
    // 新的一天，重置数据
    userData.completedToday = [];
    userData.lastRefreshDate = today;
    userData.availableAdventures = [];
    save();
  }
  
  return userData;
}

/**
 * 更新用户奇遇数据
 */
function updateUserData(userId, updater) {
  const userData = getUserData(userId);
  updater(userData);
  save();
  return userData;
}

/**
 * 设置奇遇冷却
 */
function setCooldown(userId, adventureType, durationMs) {
  const userData = getUserData(userId);
  userData.cooldowns[adventureType] = Date.now() + durationMs;
  save();
}

/**
 * 检查奇遇是否在冷却中
 * @returns {number} 剩余冷却毫秒数，0表示不在冷却中
 */
function getCooldownRemaining(userId, adventureType) {
  const userData = getUserData(userId);
  const cooldownUntil = userData.cooldowns[adventureType] || 0;
  const remaining = cooldownUntil - Date.now();
  return remaining > 0 ? remaining : 0;
}

/**
 * 记录已触发的奇遇
 */
function recordAdventure(userId, adventure) {
  const userData = getUserData(userId);
  userData.triggeredAdventures.push({
    id: adventure.id,
    type: adventure.type,
    title: adventure.title,
    triggeredAt: Date.now(),
    completed: false
  });
  
  // 限制历史记录大小
  if (userData.triggeredAdventures.length > 100) {
    userData.triggeredAdventures = userData.triggeredAdventures.slice(-100);
  }
  
  save();
}

/**
 * 标记奇遇完成
 */
function completeAdventure(userId, adventureId) {
  const userData = getUserData(userId);
  const adv = userData.triggeredAdventures.find(a => a.id === adventureId);
  if (adv) {
    adv.completed = true;
    adv.completedAt = Date.now();
  }
  
  if (!userData.completedToday.includes(adventureId)) {
    userData.completedToday.push(adventureId);
  }
  
  save();
}

/**
 * 增加探索点数
 */
function addExplorationPoints(userId, points) {
  const userData = getUserData(userId);
  userData.explorationPoints = (userData.explorationPoints || 0) + points;
  save();
  return userData.explorationPoints;
}

/**
 * 添加奖励统计
 */
function addRewardStats(userId, rewards) {
  const userData = getUserData(userId);
  if (rewards.lingshi) userData.totalRewards.lingshi += rewards.lingshi;
  if (rewards.exp) userData.totalRewards.exp += rewards.exp;
  if (rewards.items) userData.totalRewards.items += rewards.items || 0;
  save();
}

/**
 * 设置可用奇遇列表
 */
function setAvailableAdventures(userId, adventures) {
  const userData = getUserData(userId);
  userData.availableAdventures = adventures;
  save();
}

/**
 * 添加日志
 */
function addLog(entry) {
  adventuresData.logs.push({
    ...entry,
    timestamp: Date.now()
  });
  
  // 限制日志大小
  if (adventuresData.logs.length > 1000) {
    adventuresData.logs = adventuresData.logs.slice(-1000);
  }
  save();
}

/**
 * 获取用户统计信息
 */
function getUserStats(userId) {
  const userData = getUserData(userId);
  const totalTriggered = userData.triggeredAdventures.length;
  const totalCompleted = userData.triggeredAdventures.filter(a => a.completed).length;
  
  return {
    totalTriggered,
    totalCompleted,
    totalRewards: userData.totalRewards,
    explorationPoints: userData.explorationPoints,
    todayCount: userData.completedToday.length,
    typeStats: getTypeStats(userData)
  };
}

/**
 * 获取各类型奇遇统计
 */
function getTypeStats(userData) {
  const stats = {};
  userData.triggeredAdventures.forEach(adv => {
    if (!stats[adv.type]) {
      stats[adv.type] = { triggered: 0, completed: 0 };
    }
    stats[adv.type].triggered++;
    if (adv.completed) stats[adv.type].completed++;
  });
  return stats;
}

/**
 * 获取今日已完成的奇遇ID列表
 */
function getCompletedToday(userId) {
  const userData = getUserData(userId);
  return userData.completedToday || [];
}

/**
 * 检查特定奇遇今日是否已完成
 */
function isCompletedToday(userId, adventureId) {
  return getCompletedToday(userId).includes(adventureId);
}

// 初始化
init();

module.exports = {
  init,
  save,
  getUserData,
  updateUserData,
  checkDailyRefresh,
  setCooldown,
  getCooldownRemaining,
  recordAdventure,
  completeAdventure,
  addExplorationPoints,
  addRewardStats,
  setAvailableAdventures,
  addLog,
  getUserStats,
  getCompletedToday,
  isCompletedToday,
  getTodayStr
};
