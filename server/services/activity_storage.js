/**
 * 活动系统存储层
 * 优化：使用批量查询减少N+1查询问题
 */

const { pool } = require('./database');

// 批量查询优化模块
let batchQuery;
try {
  batchQuery = require('./batch_query');
} catch (e) {
  console.log('批量查询模块未加载');
}

// 活动配置数据
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

// 活动存储操作
const activityStorage = {
  // 获取所有活动列表
  getActivityList() {
    const list = [];
    
    for (const [id, data] of Object.entries(ACTIVITY_DATA)) {
      list.push({
        id,
        name: data.name,
        type: data.type,
        description: data.description,
        icon: data.icon,
        color: data.color,
        bonus: data.bonus,
        rewards: data.rewards,
        requirement: data.requirement,
        duration: data.duration,
        days: data.days,
        start_date: data.start_date,
        end_date: data.end_date
      });
    }
    
    return list;
  },

  // 获取当前进行的活动
  async getActiveActivities() {
    const result = [];
    const now = new Date();
    const dayOfWeek = now.getDay();
    
    // 获取限时活动
    const [limited] = await pool.execute(
      "SELECT * FROM activities WHERE type = 'limited' AND status = 'active' AND end_time > CURRENT_TIMESTAMP"
    );
    
    for (const row of limited) {
      const data = ACTIVITY_DATA[row.activity_id];
      if (data) {
        result.push({
          ...data,
          activity_id: row.activity_id,
          remaining_seconds: Math.floor((new Date(row.end_time).getTime() - now.getTime()) / 1000)
        });
      }
    }
    
    // 添加日常活动
    for (const data of Object.values(ACTIVITY_DATA)) {
      if (data.type === 'daily') {
        result.push(data);
      }
    }
    
    // 添加周活动
    for (const data of Object.values(ACTIVITY_DATA)) {
      if (data.type === 'weekly' && data.days && data.days.includes(dayOfWeek)) {
        result.push(data);
      }
    }
    
    // 检查节日活动
    const monthDay = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    for (const data of Object.values(ACTIVITY_DATA)) {
      if (data.type === 'festival' && data.start_date && data.end_date) {
        if (monthDay >= data.start_date && monthDay <= data.end_date) {
          result.push(data);
        }
      }
    }
    
    return result;
  },

  // 开启限时活动
  async startActivity(activityId) {
    const data = ACTIVITY_DATA[activityId];
    if (!data || data.type !== 'limited') {
      throw new Error('活动不存在或不是限时活动');
    }
    
    // 检查是否已开启
    const [existing] = await pool.execute(
      "SELECT * FROM activities WHERE activity_id = ? AND type = 'limited' AND status = 'active'",
      [activityId]
    );
    
    if (existing.length > 0) {
      throw new Error('活动已开启');
    }
    
    const endTime = new Date(Date.now() + (data.duration || 3600 * 24) * 1000);
    
    await pool.execute(
      `INSERT INTO activities (activity_id, type, status, start_time, end_time) VALUES (?, 'limited', 'active', CURRENT_TIMESTAMP, ?)`,
      [activityId, endTime]
    );
    
    return {
      activity_id: activityId,
      name: data.name,
      end_time: endTime
    };
  },

  // 结束限时活动
  async endActivity(activityId) {
    const [existing] = await pool.execute(
      "SELECT * FROM activities WHERE activity_id = ? AND type = 'limited' AND status = 'active'",
      [activityId]
    );
    
    if (existing.length === 0) {
      throw new Error('活动未开启');
    }
    
    await pool.execute(
      "UPDATE activities SET status = 'ended', end_time = CURRENT_TIMESTAMP WHERE activity_id = ?",
      [activityId]
    );
    
    return { success: true, activity_id: activityId };
  },

  // 每日签到
  async dailySign(playerId) {
    const today = new Date().toISOString().split('T')[0];
    
    // 检查今天是否已签到
    const [existing] = await pool.execute(
      'SELECT * FROM activity_sign WHERE player_id = ? AND sign_date = ?',
      [playerId, today]
    );
    
    if (existing.length > 0) {
      // 返回已签到信息
      const [signInfo] = await pool.execute(
        'SELECT streak FROM activity_sign WHERE player_id = ? ORDER BY id DESC LIMIT 1',
        [playerId]
      );
      
      return {
        alreadySigned: true,
        streak: signInfo[0]?.streak || 0,
        rewards: ACTIVITY_DATA.daily_sign.rewards
      };
    }
    
    // 获取连续签到天数
    const [lastSign] = await pool.execute(
      'SELECT sign_date, streak FROM activity_sign WHERE player_id = ? ORDER BY id DESC LIMIT 1',
      [playerId]
    );
    
    let streak = 1;
    if (lastSign.length > 0) {
      const lastDate = new Date(lastSign[0].sign_date);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        streak = (lastSign[0].streak || 0) + 1;
      }
    }
    
    // 插入签到记录
    await pool.execute(
      'INSERT INTO activity_sign (player_id, sign_date, streak) VALUES (?, ?, ?)',
      [playerId, today, streak]
    );
    
    // 计算奖励
    const signData = ACTIVITY_DATA.daily_sign;
    const expReward = Math.floor(signData.rewards.exp * (1 + Math.min(streak, 7) * 0.1));
    const stoneReward = Math.floor(signData.rewards.stones * (1 + Math.min(streak, 7) * 0.1));
    
    // 发放奖励（需要调用playerStorage）
    try {
      const playerStorage = require('./storage').playerStorage;
      await playerStorage.updateExperience(playerId, expReward);
      await playerStorage.updateSpiritStones(playerId, stoneReward);
    } catch (e) {
      console.error('发放签到奖励失败:', e.message);
    }
    
    return {
      alreadySigned: false,
      streak,
      rewards: { exp: expReward, stones: stoneReward }
    };
  },

  // 获取签到信息
  async getSignInfo(playerId) {
    const today = new Date().toISOString().split('T')[0];
    
    const [existing] = await pool.execute(
      'SELECT * FROM activity_sign WHERE player_id = ? AND sign_date = ?',
      [playerId, today]
    );
    
    const [lastSign] = await pool.execute(
      'SELECT streak FROM activity_sign WHERE player_id = ? ORDER BY id DESC LIMIT 1',
      [playerId]
    );
    
    return {
      signed: existing.length > 0,
      streak: lastSign[0]?.streak || 0
    };
  },

  // 更新任务进度
  async updateProgress(playerId, activityId, progress = 1) {
    const activity = ACTIVITY_DATA[activityId];
    if (!activity || activity.type !== 'daily') {
      throw new Error('活动不存在');
    }
    
    // 更新进度 - SQLite兼容语法 (MySQL和SQLite都支持)
    await pool.execute(
      `INSERT INTO activity_progress (player_id, activity_id, progress) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE progress = progress + ?`,
      [playerId, activityId, progress, progress]
    ).catch(err => {
      // SQLite降级处理
      if (err.message.includes('ON CONFLICT') || err.code === 'SQLITE_ERROR') {
        return pool.execute(
          `INSERT INTO activity_progress (player_id, activity_id, progress) VALUES (?, ?, ?)
           ON CONFLICT(player_id, activity_id) DO UPDATE SET progress = progress + ?`,
          [playerId, activityId, progress, progress]
        );
      }
      throw err;
    });
    
    // 检查是否完成
    const [row] = await pool.execute(
      'SELECT progress FROM activity_progress WHERE player_id = ? AND activity_id = ?',
      [playerId, activityId]
    );
    
    const completed = row.length > 0 && row[0].progress >= (activity.requirement?.count || 1);
    
    return {
      activity_id: activityId,
      progress: row[0]?.progress || 0,
      required: activity.requirement?.count || 1,
      completed
    };
  },

  // 批量获取多个玩家的活动进度 - 优化版
  async getActivitiesProgressBatch(playerIds, activityId = null) {
    if (!playerIds || playerIds.length === 0) return new Map();
    
    // 使用批量查询优化
    if (batchQuery && batchQuery.batchQuery) {
      return await batchQuery.batchQuery.getActivitiesProgress(playerIds, activityId);
    }
    
    // 回退到原来的实现
    const result = new Map();
    for (const playerId of playerIds) {
      const progress = await this.getActivityProgress(playerId, activityId);
      result.set(playerId, progress);
    }
    return result;
  },

  // 获取任务进度
  async getQuestProgress(playerId) {
    const result = {};
    const [progress] = await pool.execute(
      'SELECT * FROM activity_progress WHERE player_id = ?',
      [playerId]
    );
    
    const progressMap = {};
    for (const row of progress) {
      progressMap[row.activity_id] = row.progress;
    }
    
    for (const [id, data] of Object.entries(ACTIVITY_DATA)) {
      if (data.type === 'daily' && data.requirement) {
        result[id] = {
          name: data.name,
          description: data.description,
          icon: data.icon,
          color: data.color,
          progress: progressMap[id] || 0,
          required: data.requirement.count,
          completed: (progressMap[id] || 0) >= data.requirement.count,
          rewards: data.rewards
        };
      }
    }
    
    return result;
  },

  // 领取任务奖励
  async claimReward(playerId, activityId) {
    const activity = ACTIVITY_DATA[activityId];
    if (!activity || !activity.rewards) {
      throw new Error('活动无奖励');
    }
    
    // 检查是否已完成
    const [row] = await pool.execute(
      'SELECT progress, claimed FROM activity_progress WHERE player_id = ? AND activity_id = ?',
      [playerId, activityId]
    );
    
    if (row.length === 0) {
      throw new Error('任务未开始');
    }
    
    if (row[0].progress < (activity.requirement?.count || 1)) {
      throw new Error('任务未完成');
    }
    
    if (row[0].claimed) {
      throw new Error('奖励已领取');
    }
    
    // 标记已领取
    await pool.execute(
      'UPDATE activity_progress SET claimed = 1 WHERE player_id = ? AND activity_id = ?',
      [playerId, activityId]
    );
    
    // 发放奖励
    const rewards = activity.rewards;
    try {
      const playerStorage = require('./storage').playerStorage;
      if (rewards.exp) await playerStorage.updateExperience(playerId, rewards.exp);
      if (rewards.stones) await playerStorage.updateSpiritStones(playerId, rewards.stones);
      // 物品奖励需要单独处理
    } catch (e) {
      console.error('发放任务奖励失败:', e.message);
    }
    
    return { success: true, rewards };
  },

  // 获取活动加成
  async getActivityBonus() {
    const bonus = { exp: 1, stones: 1, drop: 1, boss_respawn: 1, boss_rewards: 1, all: 1 };
    const now = new Date();
    const dayOfWeek = now.getDay();
    
    // 获取限时活动加成
    const [limited] = await pool.execute(
      "SELECT * FROM activities WHERE type = 'limited' AND status = 'active' AND end_time > CURRENT_TIMESTAMP"
    );
    
    for (const row of limited) {
      const data = ACTIVITY_DATA[row.activity_id];
      if (data && data.bonus) {
        if (data.bonus.exp) bonus.exp *= data.bonus.exp;
        if (data.bonus.stones) bonus.stones *= data.bonus.stones;
        if (data.bonus.drop) bonus.drop *= data.bonus.drop;
        if (data.bonus.boss_respawn) bonus.boss_respawn *= data.bonus.boss_respawn;
        if (data.bonus.all) bonus.all *= data.bonus.all;
      }
    }
    
    // 周活动加成
    for (const data of Object.values(ACTIVITY_DATA)) {
      if (data.type === 'weekly' && data.days && data.days.includes(dayOfWeek) && data.bonus) {
        if (data.bonus.boss_rewards) bonus.boss_rewards *= data.bonus.boss_rewards;
        if (data.bonus.all) bonus.all *= data.bonus.all;
      }
    }
    
    // 节日活动加成
    const monthDay = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    for (const data of Object.values(ACTIVITY_DATA)) {
      if (data.type === 'festival' && data.start_date && data.end_date) {
        if (monthDay >= data.start_date && monthDay <= data.end_date && data.bonus) {
          if (data.bonus.all) bonus.all *= data.bonus.all;
        }
      }
    }
    
    return bonus;
  },

  // 重置日常任务
  async resetDailyActivities() {
    const today = new Date().toISOString().split('T')[0];
    
    // 检查今天是否已重置
    const [reset] = await pool.execute(
      "SELECT * FROM activity_reset WHERE reset_type = 'daily' AND reset_date = ?",
      [today]
    );
    
    if (reset.length > 0) {
      return { alreadyReset: true };
    }
    
    // 插入重置记录
    await pool.execute(
      "INSERT INTO activity_reset (reset_type, reset_date) VALUES ('daily', ?)",
      [today]
    );
    
    // 注意：进度不会自动清除，而是通过日期判断是否重置
    
    return { alreadyReset: false, resetDate: today };
  }
};

// 导出
module.exports = {
  activityStorage,
  ACTIVITY_DATA
};
