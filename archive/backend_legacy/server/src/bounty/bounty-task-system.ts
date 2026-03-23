/**
 * 赏金任务系统
 * 玩家可接受金币悬赏任务
 */

// 赏金任务配置
const BOUNTY_TASKS = {
  1: { title: '采集灵草', desc: '在灵田采集10株灵草', reward: 100, required_level: 1, type: 'gather' },
  2: { title: '击败山贼', desc: '击败10个山贼', reward: 200, required_level: 5, type: 'combat' },
  3: { title: '护送商队', desc: '护送商队到达目的地', reward: 500, required_level: 10, type: 'escort' },
  4: { title: '探索古墓', desc: '探索神秘古墓', reward: 1000, required_level: 20, type: 'explore' },
  5: { title: '讨伐BOSS', desc: '击败野外BOSS', reward: 2000, required_level: 30, type: 'boss' },
  6: { title: '炼丹任务', desc: '炼制10枚丹药', reward: 800, required_level: 15, type: 'alchemy' },
  7: { title: '炼器任务', desc: '强化5件装备', reward: 1200, required_level: 25, type: 'forge' },
  8: { title: '答题任务', desc: '回答10道问题', reward: 300, required_level: 5, type: 'quiz' },
  9: { title: '钓鱼任务', desc: '钓起10条灵鱼', reward: 400, required_level: 10, type: 'fishing' },
  10: { title: '采矿任务', desc: '采集10块矿石', reward: 600, required_level: 15, type: 'mine' }
};

// 获取赏金任务列表
export function getBountyTasks(playerId: number): any[] {
  const player = getPlayer(playerId);
  if (!player) return [];
  
  const availableTasks = [];
  const playerLevel = player.level || 1;
  
  for (const [id, task] of Object.entries(BOUNTY_TASKS)) {
    if (playerLevel >= task.required_level) {
      availableTasks.push({
        id: parseInt(id),
        ...task,
        claimed: player.bounty_claimed?.includes(parseInt(id)) || false
      });
    }
  }
  
  return availableTasks;
}

// 领取赏金任务
export function claimBountyTask(playerId: number, taskId: number): any {
  const player = getPlayer(playerId);
  if (!player) return { success: false, message: '玩家不存在' };
  
  const task = BOUNTY_TASKS[taskId];
  if (!task) return { success: false, message: '任务不存在' };
  
  if (player.level < task.required_level) {
    return { success: false, message: '等级不足' };
  }
  
  if (!player.bounty_claimed) player.bounty_claimed = [];
  if (player.bounty_claimed.includes(taskId)) {
    return { success: false, message: '已领取该任务' };
  }
  
  player.bounty_claimed.push(taskId);
  if (!player.bounty_progress) player.bounty_progress = {};
  player.bounty_progress[taskId] = 0;
  
  return { 
    success: true, 
    message: '任务领取成功', 
    task: { id: taskId, ...task, progress: 0 } 
  };
}

// 更新赏金任务进度
export function updateBountyProgress(playerId: number, taskType: string, amount: number): any {
  const player = getPlayer(playerId);
  if (!player || !player.bounty_progress) return { success: false };
  
  let updated = false;
  for (const [taskId, task] of Object.entries(BOUNTY_TASKS)) {
    if (task.type === taskType && player.bounty_claimed?.includes(parseInt(taskId))) {
      if (!player.bounty_progress[taskId]) player.bounty_progress[taskId] = 0;
      player.bounty_progress[taskId] += amount;
      
      const requiredAmount = getRequiredAmount(taskType);
      if (player.bounty_progress[taskId] >= requiredAmount) {
        player.bounty_progress[taskId] = requiredAmount;
      }
      updated = true;
    }
  }
  
  return { success: updated };
}

// 获取任务所需数量
function getRequiredAmount(taskType: string): number {
  const amounts: Record<string, number> = {
    gather: 10,
    combat: 10,
    escort: 1,
    explore: 1,
    boss: 1,
    alchemy: 10,
    forge: 5,
    quiz: 10,
    fishing: 10,
    mine: 10
  };
  return amounts[taskType] || 1;
}

// 领取赏金奖励
export function claimBountyReward(playerId: number, taskId: number): any {
  const player = getPlayer(playerId);
  if (!player) return { success: false, message: '玩家不存在' };
  
  const task = BOUNTY_TASKS[taskId];
  if (!task) return { success: false, message: '任务不存在' };
  
  if (!player.bounty_claimed?.includes(taskId)) {
    return { success: false, message: '未领取该任务' };
  }
  
  const progress = player.bounty_progress?.[taskId] || 0;
  const required = getRequiredAmount(task.type);
  
  if (progress < required) {
    return { success: false, message: `任务进度不足 (${progress}/${required})` };
  }
  
  // 发放奖励
  player.gold = (player.gold || 0) + task.reward;
  
  // 移除已完成任务
  player.bounty_claimed = player.bounty_claimed.filter((id: number) => id !== taskId);
  if (player.bounty_progress) {
    delete player.bounty_progress[taskId];
  }
  
  return { 
    success: true, 
    message: `奖励领取成功，获得${task.reward}金币`,
    reward: task.reward,
    newGold: player.gold
  };
}

// 获取玩家数据 (需要从外部注入)
let getPlayer: (id: number) => any;
export function setPlayerGetter(fn: (id: number) => any) {
  getPlayer = fn;
}

export default {
  getBountyTasks,
  claimBountyTask,
  updateBountyProgress,
  claimBountyReward,
  setPlayerGetter
};
