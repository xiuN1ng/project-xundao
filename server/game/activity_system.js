/**
 * 活动系统 v1.1
 * 限时活动/日常活动/周期性活动/签到系统
 */

// 从全局获取 gameState（如果存在）
const gameState = (typeof window !== 'undefined' && window.gameState) || { player: {} };

// 日志函数（兼容前端和后端）
function addLog(message, type = 'info') {
  if (typeof console !== 'undefined') {
    console.log(`[${type}] ${message}`);
  }
  if (typeof window !== 'undefined') {
    window.gameLogs = window.gameLogs || [];
    window.gameLogs.push({ message, type, time: Date.now() });
  }
}

// 签到配置 - 7天循环签到奖励
const SIGN_REWARDS = [
  { day: 1, stones: 100, exp: 500, items: [] },
  { day: 2, stones: 150, exp: 700, items: [] },
  { day: 3, stones: 200, exp: 1000, items: [] },
  { day: 4, stones: 300, exp: 1500, items: [] },
  { day: 5, stones: 500, exp: 2000, items: [] },
  { day: 6, stones: 800, exp: 3000, items: [] },
  { day: 7, stones: 1500, exp: 5000, items: ['blessing_pack'] }  // 第7天豪华奖励
];

const ACTIVITY_DATA = {
  // 限时活动
  'double_exp': {
    name: '双倍经验活动',
    type: 'limited',
    description: '修炼获得双倍经验',
    duration: 3600 * 24, // 24小时
    bonus: { exp: 2.0 },
    icon: '📈',
    color: '#4ecdc4'
  },
  'richmond': {
    name: '灵石雨活动',
    type: 'limited',
    description: '灵石获取量翻倍',
    duration: 3600 * 24,
    bonus: { stones: 2.0 },
    icon: '💎',
    color: '#ffd700'
  },
  'drop_boost': {
    name: '掉落加成活动',
    type: 'limited',
    description: '打怪掉落率提升50%',
    duration: 3600 * 48,
    bonus: { drop: 1.5 },
    icon: '🎁',
    color: '#a855f7'
  },
  'boss_rush': {
    name: 'BOSS rush',
    type: 'limited',
    description: '世界BOSS刷新时间减半',
    duration: 3600 * 24,
    bonus: { boss_respawn: 0.5 },
    icon: '👹',
    color: '#ef4444'
  },
  
  // 日常活动
  'daily_sign': {
    name: '每日签到',
    type: 'daily',
    description: '每日签到领取奖励',
    rewards: { stones: 100, exp: 500 },
    icon: '📅',
    color: '#4ecdc4',
    reset_time: '00:00'
  },
  'daily_quest_1': {
    name: '修炼之路',
    type: 'daily',
    description: '修炼100次',
    requirement: { type: 'cultivate', count: 100 },
    rewards: { stones: 200, exp: 1000 },
    icon: '🧘',
    color: '#4ecdc4'
  },
  'daily_quest_2': {
    name: '降妖除魔',
    type: 'daily',
    description: '击败10个怪物',
    requirement: { type: 'kill_enemy', count: 10 },
    rewards: { stones: 300, exp: 1500 },
    icon: '⚔️',
    color: '#ef4444'
  },
  'daily_quest_3': {
    name: '灵石采集',
    type: 'daily',
    description: '获取1000灵石',
    requirement: { type: 'gain_stones', count: 1000 },
    rewards: { stones: 500, exp: 500 },
    icon: '💰',
    color: '#ffd700'
  },
  
  // 周期活动 (周)
  'weekly_boss': {
    name: '周末BOSS狂欢',
    type: 'weekly',
    description: '周末BOSS奖励翻倍',
    days: [6, 0], // 周六、周日
    bonus: { boss_rewards: 2.0 },
    icon: '🎉',
    color: '#ff6b6b'
  },
  'weekly_quest': {
    name: '周常任务',
    type: 'weekly',
    description: '完成所有日常任务',
    requirement: { type: 'complete_daily', count: 7 },
    rewards: { stones: 5000, exp: 10000, items: ['rare_gift_box'] },
    icon: '📋',
    color: '#a855f7'
  },
  
  // 节日活动
  'new_year': {
    name: '新年庆典',
    type: 'festival',
    description: '全服奖励加成',
    start_date: '01-01',
    end_date: '01-07',
    bonus: { all: 1.5 },
    icon: '🎊',
    color: '#ff6b6b'
  },
  'anniversary': {
    name: '周年庆',
    type: 'festival',
    description: '登录即送稀有奖励',
    start_date: '06-01',
    end_date: '06-07',
    bonus: { all: 2.0 },
    rewards: { stones: 10000, items: ['anniversary_token'] },
    icon: '🎂',
    color: '#ffd700'
  }
};

// 活动状态
const activityState = {
  activeLimitedEvents: [],  // 当前进行的限时活动
  dailySignInfo: {},        // 每日签到信息
  dailyQuestProgress: {},  // 日常任务进度
  weeklyQuestProgress: {},  // 周常任务进度
  lastDailyReset: 0,       // 上次日常重置时间
  lastWeeklyReset: 0       // 上次周常重置时间
};

// ============ 活动系统核心 ============

// 获取当前活动
function getActiveActivities() {
  const now = Date.now();
  const result = [];
  
  // 检查限时活动
  for (const [id, data] of Object.entries(ACTIVITIES)) {
    if (data.type === 'limited') {
      const active = activityState.activeLimitedEvents.find(e => e.id === id);
      if (active && active.endTime > now) {
        result.push({ ...data, remainingTime: active.endTime - now });
      }
    }
  }
  
  // 检查日常活动（总是显示）
  for (const data of Object.values(ACTIVITIES)) {
    if (data.type === 'daily') {
      result.push(data);
    }
  }
  
  // 检查周期活动
  const nowDate = new Date();
  const dayOfWeek = nowDate.getDay();
  for (const data of Object.values(ACTIVITIES)) {
    if (data.type === 'weekly' && data.days && data.days.includes(dayOfWeek)) {
      result.push(data);
    }
  }
  
  return result;
}

// 开启限时活动
function startLimitedActivity(activityId) {
  const data = ACTIVITIES[activityId];
  if (!data || data.type !== 'limited') {
    return { success: false, message: '活动不存在或不是限时活动' };
  }
  
  // 检查是否已开启
  const existing = activityState.activeLimitedEvents.find(e => e.id === activityId);
  if (existing) {
    return { success: false, message: '活动已开启' };
  }
  
  const now = Date.now();
  activityState.activeLimitedEvents.push({
    id: activityId,
    startTime: now,
    endTime: now + data.duration * 1000
  });
  
  addLog(`🎉 活动「${data.name}」已开启！`, 'activity');
  
  return { success: true, message: `活动「${data.name}」开启成功！` };
}

// 结束限时活动
function endLimitedActivity(activityId) {
  const index = activityState.activeLimitedEvents.findIndex(e => e.id === activityId);
  if (index === -1) {
    return { success: false, message: '活动未开启' };
  }
  
  const data = ACTIVITIES[activityId];
  
  activityState.activeLimitedEvents.splice(index, 1);
  addLog(`📢 活动「${data.name}」已结束`, 'activity');
  
  return { success: true, message: `活动「${data.name}」已结束` };
}

// 每日签到 (使用7天循环签到奖励)
function dailySign() {
  const player = gameState.player;
  const today = new Date().toDateString();
  
  // 检查今天是否已签到
  if (activityState.dailySignInfo[player.name] === today) {
    return { success: false, message: '今日已签到' };
  }
  
  // 获取连续签到天数
  let streak = (activityState.dailySignInfo[player.name + '_streak'] || 0) + 1;
  
  // 检查是否断签（超过1天未签到则重置）
  const lastSignDate = activityState.dailySignInfo[player.name + '_lastDate'];
  if (lastSignDate) {
    const lastDate = new Date(lastSignDate);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
    if (diffDays > 1) {
      streak = 1; // 断签重置
    }
  }
  
  // 计算当前是第几天（1-7循环）
  const dayOfCycle = ((streak - 1) % 7) + 1;
  const signReward = SIGN_REWARDS[dayOfCycle - 1];
  
  // 基础奖励
  let stoneReward = signReward.stones;
  const expReward = signReward.exp;
  const itemRewards = signReward.items || [];
  
  // 连续签到7天额外奖励（循环重置时）
  if (dayOfCycle === 7) {
    stoneReward += 500; // 额外奖励
    addLog('🎁 恭喜！完成一轮7天签到，获得额外500灵石奖励！', 'success');
  }
  
  // 发放奖励
  player.spiritStones += stoneReward;
  player.experience += expReward;
  
  // 发放物品奖励
  if (itemRewards.length > 0) {
    player.artifacts_inventory = player.artifacts_inventory || {};
    for (const item of itemRewards) {
      player.artifacts_inventory[item] = (player.artifacts_inventory[item] || 0) + 1;
    }
  }
  
  // 更新签到信息
  activityState.dailySignInfo[player.name] = today;
  activityState.dailySignInfo[player.name + '_streak'] = streak;
  activityState.dailySignInfo[player.name + '_lastDate'] = today;
  
  // 记录签到日期
  const signDates = activityState.dailySignInfo[player.name + '_dates'] || [];
  signDates.push(today);
  activityState.dailySignInfo[player.name + '_dates'] = signDates;
  
  let rewardMsg = `📅 签到成功！连续${streak}天，`;
  rewardMsg += `获得 ${stoneReward}灵石、${expReward}经验`;
  if (itemRewards.length > 0) {
    rewardMsg += `、${itemRewards.join(', ')}`;
  }
  addLog(rewardMsg, 'success');
  
  return { 
    success: true, 
    message: `签到成功！连续${streak}天 (第${dayOfCycle}天)`,
    streak,
    dayOfCycle,
    rewards: { stones: stoneReward, exp: expReward, items: itemRewards }
  };
}

// 获取签到日历数据
function getSignCalendar() {
  const player = gameState.player;
  const today = new Date().toDateString();
  const signDates = activityState.dailySignInfo[player.name + '_dates'] || [];
  const streak = activityState.dailySignInfo[player.name + '_streak'] || 0;
  const currentDayOfCycle = ((streak - 1) % 7) + 1;
  
  // 构建7天日历
  const calendar = [];
  for (let i = 0; i < 7; i++) {
    const dayNum = i + 1;
    const reward = SIGN_REWARDS[i];
    const isToday = dayNum === currentDayOfCycle;
    const isPast = dayNum < currentDayOfCycle;
    const isFuture = dayNum > currentDayOfCycle;
    
    calendar.push({
      day: dayNum,
      isToday,
      isPast,
      isFuture,
      claimed: isPast || (isToday && signDates.includes(today)),
      reward: reward
    });
  }
  
  return {
    calendar,
    streak,
    currentDayOfCycle,
    signedToday: signDates.includes(today)
  };
}

// 补签功能
function compensateSign(days = 1) {
  const player = gameState.player;
  const today = new Date();
  
  // 检查补签次数限制（每天最多补签1次）
  const lastCompensateDate = activityState.dailySignInfo[player.name + '_lastCompensate'];
  if (lastCompensateDate === today.toDateString()) {
    return { success: false, message: '今日已使用补签机会' };
  }
  
  // 补签费用（每次50灵石）
  const cost = 50 * days;
  if (player.spiritStones < cost) {
    return { success: false, message: `补签需要 ${cost} 灵石` };
  }
  
  player.spiritStones -= cost;
  
  // 增加签到天数
  const currentStreak = activityState.dailySignInfo[player.name + '_streak'] || 0;
  activityState.dailySignInfo[player.name + '_streak'] = currentStreak + days;
  activityState.dailySignInfo[player.name + '_lastCompensate'] = today.toDateString();
  
  // 发放补签奖励
  let totalStones = 0;
  let totalExp = 0;
  for (let i = 0; i < days; i++) {
    const dayOfCycle = ((currentStreak + i) % 7);
    const reward = SIGN_REWARDS[dayOfCycle];
    totalStones += reward.stones;
    totalExp += reward.exp;
  }
  
  player.spiritStones += totalStones;
  player.experience += totalExp;
  
  addLog(`📅 补签成功！消耗${cost}灵石，获得${totalStones}灵石、${totalExp}经验`, 'success');
  
  return { 
    success: true, 
    message: `补签${days}天成功`,
    rewards: { stones: totalStones, exp: totalExp }
  };
}

// 完成任务进度
function updateActivityProgress(type, amount = 1) {
  const player = gameState.player;
  const key = player.name;
  
  // 更新日常任务进度
  for (const [id, data] of Object.entries(ACTIVITIES)) {
    if (data.type === 'daily' && data.requirement && data.requirement.type === type) {
      activityState.dailyQuestProgress[key] = activityState.dailyQuestProgress[key] || {};
      activityState.dailyQuestProgress[key][id] = (activityState.dailyQuestProgress[key][id] || 0) + amount;
      
      // 检查是否完成
      if (activityState.dailyQuestProgress[key][id] >= data.requirement.count) {
        // 自动领取奖励
        claimActivityReward(id);
      }
    }
  }
}

// 领取活动奖励
function claimActivityReward(activityId) {
  const player = gameState.player;
  const data = ACTIVITIES[activityId];
  
  if (!data || !data.rewards) {
    return { success: false, message: '活动无奖励' };
  }
  
  // 检查是否已完成
  const key = player.name;
  const progress = activityState.dailyQuestProgress[key]?.[activityId] || 0;
  const requirement = data.requirement?.count || 1;
  
  if (progress < requirement) {
    return { success: false, message: '任务未完成' };
  }
  
  // 发放奖励
  if (data.rewards.exp) player.experience += data.rewards.exp;
  if (data.rewards.stones) player.spiritStones += data.rewards.stones;
  if (data.rewards.items) {
    player.artifacts_inventory = player.artifacts_inventory || {};
    for (const item of data.rewards.items) {
      player.artifacts_inventory[item] = (player.artifacts_inventory[item] || 0) + 1;
    }
  }
  
  // 标记已领取
  activityState.dailyQuestProgress[key][activityId + '_claimed'] = true;
  
  addLog(`🎁 完成任务「${data.name}」，获得奖励！`, 'success');
  
  return { success: true, message: `获得 ${data.rewards.stones || 0} 灵石、${data.rewards.exp || 0} 经验` };
}

// 获取活动加成
function getActivityBonus() {
  const bonus = { exp: 1, stones: 1, drop: 1, boss_respawn: 1, boss_rewards: 1, all: 1 };
  const now = Date.now();
  
  // 限时活动加成
  for (const active of activityState.activeLimitedEvents) {
    if (active.endTime > now) {
      const data = ACTIVITIES[active.id];
      if (data && data.bonus) {
        if (data.bonus.exp) bonus.exp *= data.bonus.exp;
        if (data.bonus.stones) bonus.stones *= data.bonus.stones;
        if (data.bonus.drop) bonus.drop *= data.bonus.drop;
        if (data.bonus.boss_respawn) bonus.boss_respawn *= data.bonus.boss_respawn;
        if (data.bonus.all) bonus.all *= data.bonus.all;
      }
    }
  }
  
  // 周活动加成
  const nowDate = new Date();
  const dayOfWeek = nowDate.getDay();
  for (const data of Object.values(ACTIVITIES)) {
    if (data.type === 'weekly' && data.days && data.days.includes(dayOfWeek) && data.bonus) {
      if (data.bonus.boss_rewards) bonus.boss_rewards *= data.bonus.boss_rewards;
      if (data.bonus.all) bonus.all *= data.bonus.all;
    }
  }
  
  return bonus;
}

// 重置日常任务
function resetDailyActivities() {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  
  if (activityState.lastDailyReset < dayStart.getTime()) {
    // 清空进度
    activityState.dailyQuestProgress = {};
    activityState.lastDailyReset = dayStart.getTime();
    addLog('📅 每日任务已刷新', 'activity');
  }
}

// 重置周任务
function resetWeeklyActivities() {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  
  if (activityState.lastWeeklyReset < weekStart.getTime()) {
    activityState.weeklyQuestProgress = {};
    activityState.lastWeeklyReset = weekStart.getTime();
    addLog('📆 周任务已刷新', 'activity');
  }
}

// 获取签到信息
function getSignInfo() {
  const player = gameState.player;
  const today = new Date().toDateString();
  const signed = activityState.dailySignInfo[player.name] === today;
  const streak = activityState.dailySignInfo[player.name + '_streak'] || 0;
  
  return { signed, streak };
}

// 获取任务进度
function getQuestProgress() {
  const player = gameState.player;
  const key = player.name;
  const progress = activityState.dailyQuestProgress[key] || {};
  const result = {};
  
  for (const [id, data] of Object.entries(ACTIVITIES)) {
    if (data.type === 'daily' && data.requirement) {
      result[id] = {
        name: data.name,
        description: data.description,
        progress: progress[id] || 0,
        required: data.requirement.count,
        completed: (progress[id] || 0) >= data.requirement.count,
        claimed: progress[id + '_claimed'] || false,
        rewards: data.rewards
      };
    }
  }
  
  return result;
}

// 导出
window.ACTIVITY_DATA = ACTIVITY_DATA;
window.SIGN_REWARDS = SIGN_REWARDS;
window.activityState = activityState;
window.getActiveActivities = getActiveActivities;
window.startLimitedActivity = startLimitedActivity;
window.endLimitedActivity = endLimitedActivity;
window.dailySign = dailySign;
window.updateActivityProgress = updateActivityProgress;
window.claimActivityReward = claimActivityReward;
window.getActivityBonus = getActivityBonus;
window.resetDailyActivities = resetDailyActivities;
window.resetWeeklyActivities = resetWeeklyActivities;
window.getSignInfo = getSignInfo;
window.getSignCalendar = getSignCalendar;
window.compensateSign = compensateSign;
window.getQuestProgress = getQuestProgress;

// 兼容性别名
const ACTIVITIES = ACTIVITY_DATA;
window.ACTIVITIES = ACTIVITIES;

console.log('🎪 活动系统 v1.1 已加载 - 签到系统已完善');
