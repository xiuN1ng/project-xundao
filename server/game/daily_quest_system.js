/**
 * 挂机修仙 - 日常/周常任务系统
 */

class DailyQuestSystem {
  constructor() {
    // 日常任务
    this.dailyQuests = [
      { id: 'daily_fight', name: '战斗10次', target: 10, reward: 50 },
      { id: 'daily_collection', name: '采集5次', target: 5, reward: 30 },
      { id: 'daily_realm', name: '修炼10分钟', target: 600, reward: 80 },
      { id: 'daily_enhance', name: '强化装备1次', target: 1, reward: 100 }
    ];
    
    // 周常任务
    this.weeklyQuests = [
      { id: 'weekly_boss', name: '击败世界BOSS', target: 3, reward: 500 },
      { id: 'weekly_arena', name: '竞技场胜利10次', target: 10, reward: 300 },
      { id: 'weekly_tower', name: '通关无尽塔10层', target: 10, reward: 800 }
    ];
  }
  
  // 获取日常任务
  getDailyQuests(player) {
    const progress = player.dailyProgress || {};
    const today = new Date().toDateString();
    if (progress.date !== today) {
      progress.date = today;
      progress.quests = {};
      player.dailyProgress = progress;
    }
    return this.dailyQuests.map(q => ({
      ...q,
      current: progress.quests[q.id] || 0,
      completed: (progress.quests[q.id] || 0) >= q.target
    }));
  }
  
  // 完成任务
  updateProgress(player, questId, amount = 1) {
    const progress = player.dailyProgress || {};
    const today = new Date().toDateString();
    if (progress.date !== today) {
      progress.date = today;
      progress.quests = {};
    }
    progress.quests[questId] = (progress.quests[questId] || 0) + amount;
    player.dailyProgress = progress;
    return progress.quests[questId];
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DailyQuestSystem };
}
