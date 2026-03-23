/**
 * 挂机修仙 - 每日任务系统 v2
 * 
 * 功能：
 * 1. 每日任务：修炼、战斗、收集、升级等
 * 2. 任务奖励：灵石、功法点、材料
 * 3. 进度追踪和一键领取
 * 4. 重置时间：每日0点
 */

// ==================== 每日任务配置 ====================
const DAILY_TASKS = [
  // 修炼类
  { id: 'cultivate_100', name: '勤修苦练', desc: '修炼100次', type: 'cultivate', target: 100, reward: { stone: 100 } },
  { id: 'cultivate_500', name: '修炼有成', desc: '修炼500次', type: 'cultivate', target: 500, reward: { stone: 300, technique_point: 1 } },
  
  // 战斗类
  { id: 'battle_10', name: '初试身手', desc: '击败10只怪物', type: 'battle', target: 10, reward: { stone: 150 } },
  { id: 'battle_50', name: '除魔卫道', desc: '击败50只怪物', type: 'battle', target: 50, reward: { stone: 500, exp: 1000 } },
  { id: 'battle_100', name: '百战百胜', desc: '击败100只怪物', type: 'battle', target: 100, reward: { stone: 1000, technique_point: 2 } },
  
  // 收集类
  { id: 'collect_herb', name: '采药童子', desc: '采集20株灵草', type: 'collect', target: 20, resource: 'herb', reward: { stone: 200 } },
  { id: 'collect_ore', name: '矿工', desc: '采集10块矿石', type: 'collect', target: 10, resource: 'ore', reward: { stone: 200 } },
  
  // 境界类
  { id: 'breakthrough_1', name: '境界突破', desc: '完成1次境界突破', type: 'breakthrough', target: 1, reward: { stone: 500, spirit: 1000 } },
  
  // 副本类
  { id: 'dungeon_1', name: '副本先锋', desc: '通关1次副本', type: 'dungeon', target: 1, reward: { stone: 300 } },
  { id: 'dungeon_3', name: '副本达人', desc: '通关3次副本', type: 'dungeon', target: 3, reward: { stone: 800, technique_point: 1 } },
  
  // 功法类
  { id: 'technique_1', name: '功法入门', desc: '学习1本功法', type: 'technique', target: 1, reward: { technique_point: 2 } },
  
  // 装备类
  { id: 'enhance_1', name: '装备强化', desc: '强化1件装备', type: 'enhance', target: 1, reward: { stone: 200 } },
  
  // 社交类
  { id: 'friend_1', name: '广交好友', desc: '添加1位好友', type: 'friend', target: 1, reward: { stone: 100 } },
  { id: 'arena_1', name: '竞技挑战', desc: '完成1次竞技', type: 'arena', target: 1, reward: { stone: 200 } }
];

// ==================== 任务奖励配置 ====================
const TASK_REWARDS = {
  // 基础奖励
  stone: { name: '灵石', icon: '💎' },
  spirit: { name: '灵气', icon: '🌀' },
  exp: { name: '经验', icon: '📖' },
  technique_point: { name: '功法点', icon: '📚' },
  herb: { name: '灵草', icon: '🌿' },
  ore: { name: '矿石', icon: '🪨' }
};

/**
 * 每日任务系统
 */
class DailyTaskSystem {
  constructor() {
    this.tasks = DAILY_TASKS;
    this.playerTasks = new Map(); // playerId -> { date, tasks: {} }
  }
  
  /**
   * 获取今日任务
   */
  getDailyTasks(playerId) {
    const today = new Date().toDateString();
    const key = `${playerId}_${today}`;
    
    if (!this.playerTasks.has(key)) {
      // 初始化今日任务（随机选8个）
      const shuffled = [...this.tasks].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, 8);
      
      const taskData = {};
      for (const task of selected) {
        taskData[task.id] = { progress: 0, completed: false, claimed: false };
      }
      
      this.playerTasks.set(key, {
        date: today,
        tasks: taskData
      });
    }
    
    return this.playerTasks.get(key);
  }
  
  /**
   * 更新任务进度
   */
  updateProgress(playerId, taskType, amount = 1) {
    const today = new Date().toDateString();
    const key = `${playerId}_${today}`;
    const data = this.playerTasks.get(key);
    
    if (!data) return;
    
    // 找到匹配的任务类型
    for (const task of this.tasks) {
      if (task.type === taskType && !data.tasks[task.id]?.completed) {
        if (!data.tasks[task.id]) {
          data.tasks[task.id] = { progress: 0, completed: false, claimed: false };
        }
        data.tasks[task.id].progress += amount;
        
        // 检查是否完成
        if (data.tasks[task.id].progress >= task.target) {
          data.tasks[task.id].completed = true;
        }
      }
    }
  }
  
  /**
   * 领取任务奖励
   */
  claimReward(playerId, taskId) {
    const today = new Date().toDateString();
    const key = `${playerId}_${today}`;
    const data = this.playerTasks.get(key);
    
    if (!data || !data.tasks[taskId]) {
      return { success: false, message: '任务不存在' };
    }
    
    if (!data.tasks[taskId].completed) {
      return { success: false, message: '任务未完成' };
    }
    
    if (data.tasks[taskId].claimed) {
      return { success: false, message: '奖励已领取' };
    }
    
    // 查找任务奖励
    const task = this.tasks.find(t => t.id === taskId);
    data.tasks[taskId].claimed = true;
    
    return {
      success: true,
      reward: task.reward,
      message: `完成 ${task.name}，获得奖励！`
    };
  }
  
  /**
   * 一键领取所有已完成任务
   */
  claimAllRewards(playerId) {
    const today = new Date().toDateString();
    const key = `${playerId}_${today}`;
    const data = this.playerTasks.get(key);
    
    if (!data) {
      return { success: false, message: '无任务数据' };
    }
    
    let totalReward = {};
    let count = 0;
    
    for (const [taskId, taskData] of Object.entries(data.tasks)) {
      if (taskData.completed && !taskData.claimed) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
          // 累加奖励
          for (const [key, value] of Object.entries(task.reward)) {
            totalReward[key] = (totalReward[key] || 0) + value;
          }
          taskData.claimed = true;
          count++;
        }
      }
    }
    
    if (count === 0) {
      return { success: false, message: '没有可领取的奖励' };
    }
    
    return {
      success: true,
      reward: totalReward,
      count: count,
      message: `领取 ${count} 个任务奖励！`
    };
  }
  
  /**
   * 获取任务进度
   */
  getTaskProgress(playerId, taskId) {
    const today = new Date().toDateString();
    const key = `${playerId}_${today}`;
    const data = this.playerTasks.get(key);
    
    if (!data || !data.tasks[taskId]) {
      return null;
    }
    
    const task = this.tasks.find(t => t.id === taskId);
    return {
      ...data.tasks[taskId],
      target: task.target,
      name: task.name,
      desc: task.desc,
      reward: task.reward
    };
  }
  
  /**
   * 获取今日完成/领取统计
   */
  getDailyStats(playerId) {
    const today = new Date().toDateString();
    const key = `${playerId}_${today}`;
    const data = this.playerTasks.get(key);
    
    if (!data) {
      return { completed: 0, claimed: 0, total: 8 };
    }
    
    let completed = 0;
    let claimed = 0;
    
    for (const taskData of Object.values(data.tasks)) {
      if (taskData.completed) completed++;
      if (taskData.claimed) claimed++;
    }
    
    return {
      completed,
      claimed,
      total: Object.keys(data.tasks).length
    };
  }
}

/**
 * 生成任务UI数据
 */
function generateTaskUI(playerId) {
  const system = new DailyTaskSystem();
  const data = system.getDailyTasks(playerId);
  const stats = system.getDailyStats(playerId);
  
  const tasks = [];
  for (const [taskId, taskData] of Object.entries(data.tasks)) {
    const task = DAILY_TASKS.find(t => t.id === taskId);
    if (task) {
      tasks.push({
        id: taskId,
        name: task.name,
        desc: task.desc,
        progress: taskData.progress,
        target: task.target,
        completed: taskData.completed,
        claimed: taskData.claimed,
        reward: task.reward
      });
    }
  }
  
  return {
    stats,
    tasks
  };
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DailyTaskSystem,
    DAILY_TASKS,
    TASK_REWARDS,
    generateTaskUI
  };
}
