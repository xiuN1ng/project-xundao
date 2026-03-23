/**
 * 挂机修仙 - 灵气获取多样化系统
 * 
 * 优化策略：
 * 1. 每日任务系统 - 固定产出
 * 2. 灵石转换系统 - 付费/后期选项
 * 3. 境界副本通关奖励
 */

// ==================== 每日任务配置（优化版：总灵气30000+）====================
const DAILY_QUESTS = [
  { id: 'cultivate_1h', name: '修炼打卡', desc: '挂机修炼1小时', spirit: 5000, type: 'idle' },
  { id: 'kill_10', name: '除魔卫道', desc: '击败10只怪物', spirit: 3000, type: 'combat', requirement: 10 },
  { id: 'kill_50', name: '除魔卫道', desc: '击败50只怪物', spirit: 5000, type: 'combat', requirement: 50 },
  { id: 'clear_dungeon', name: '副本先锋', desc: '通关1次副本', spirit: 5000, type: 'dungeon', requirement: 1 },
  { id: 'realm_break', name: '境界突破', desc: '完成1次境界突破', spirit: 5000, type: 'realm', requirement: 1 },
  { id: 'collect_herb', name: '采集灵草', desc: '采集20株灵草', spirit: 2000, type: 'gather', requirement: 20 },
  { id: 'trade', name: '交易行', desc: '成功交易1次', spirit: 2000, type: 'trade', requirement: 1 },
  { id: 'friend', name: '交友', desc: '添加1位好友', spirit: 1000, type: 'social', requirement: 1 },
  { id: 'arena', name: '竞技场', desc: '完成1次竞技场挑战', spirit: 3000, type: 'arena', requirement: 1 },
  { id: 'daily_login', name: '每日登录', desc: '每日登录奖励', spirit: 2000, type: 'login' }
];

// ==================== 灵石转换汇率 ====================
const STONE_CONVERT_RATE = 0.01; // 100灵石 = 1灵气

// ==================== 境界副本通关奖励 ====================
const DUNGEON_CLEAR_REWARDS = {
  // 每次通关获得境界等级 × 1000 灵气
  base: 1000,
  // 额外奖励（首通）
  firstClear: 10000
};

/**
 * 每日任务系统
 */
class DailyQuestSystem {
  constructor() {
    this.quests = DAILY_QUESTS;
    this.playerQuests = new Map(); // playerId -> { questId: { completed, progress, claimed } }
  }
  
  /**
   * 获取玩家今日任务
   */
  getDailyQuests(playerId) {
    const today = new Date().toDateString();
    const key = `${playerId}_${today}`;
    
    if (!this.playerQuests.has(key)) {
      // 初始化今日任务
      const quests = {};
      for (const quest of this.quests) {
        quests[quest.id] = { progress: 0, completed: false, claimed: false };
      }
      this.playerQuests.set(key, quests);
    }
    
    return this.playerQuests.get(key);
  }
  
  /**
   * 更新任务进度
   */
  updateProgress(playerId, questType, amount = 1) {
    const today = new Date().toDateString();
    const key = `${playerId}_${today}`;
    const quests = this.playerQuests.get(key);
    
    if (!quests) return;
    
    // 找到对应类型的任务
    for (const quest of this.quests) {
      if (quest.type === questType && !quests[quest.id].completed) {
        quests[quest.id].progress += amount;
        
        // 检查是否完成
        if (quest.requirement) {
          if (quests[quest.id].progress >= quest.requirement) {
            quests[quest.id].completed = true;
          }
        } else if (quest.type === 'idle') {
          // 挂机任务检查时间
          quests[quest.id].completed = true;
        }
      }
    }
  }
  
  /**
   * 领取任务奖励
   */
  claimReward(playerId, questId) {
    const today = new Date().toDateString();
    const key = `${playerId}_${today}`;
    const quests = this.playerQuests.get(key);
    
    if (!quests || !quests[questId]) {
      return { success: false, message: '任务不存在' };
    }
    
    if (!quests[questId].completed) {
      return { success: false, message: '任务未完成' };
    }
    
    if (quests[questId].claimed) {
      return { success: false, message: '奖励已领取' };
    }
    
    const quest = this.quests.find(q => q.id === questId);
    quests[questId].claimed = true;
    
    return { success: true, spirit: quest.spirit };
  }
  
  /**
   * 获取今日可获得的灵气总量
   */
  getTotalDailySpirit() {
    return this.quests.reduce((sum, quest) => sum + quest.spirit, 0);
  }
}

/**
 * 灵石转换系统
 */
class SpiritConvertSystem {
  constructor() {
    this.rate = STONE_CONVERT_RATE;
    this.dailyLimit = 100000; // 每日最多转换10万灵石
  }
  
  /**
   * 灵石转灵气
   */
  convert(player, stones) {
    if (stones <= 0) {
      return { success: false, message: '数量必须大于0' };
    }
    
    if (stones > this.dailyLimit) {
      return { success: false, message: `每日最多转换${this.dailyLimit}灵石` };
    }
    
    if (player.spiritStones < stones) {
      return { success: false, message: '灵石不足' };
    }
    
    const spirit = Math.floor(stones * this.rate);
    
    player.spiritStones -= stones;
    player.spirit += spirit;
    
    return { success: true, stones, spirit };
  }
  
  /**
   * 获取今日剩余转换额度
   */
  getRemainingLimit(playerId) {
    const today = new Date().toDateString();
    const key = `convert_${playerId}_${today}`;
    const used = this.convertedAmounts?.[key] || 0;
    return this.dailyLimit - used;
  }
}

/**
 * 境界副本奖励系统
 */
class DungeonRewardSystem {
  constructor() {
    this.baseReward = DUNGEON_CLEAR_REWARDS.base;
    this.firstClearReward = DUNGEON_CLEAR_REWARDS.firstClear;
    this.playerRecords = new Map(); // playerId -> { realmId: { cleared, firstClear } }
  }
  
  /**
   * 领取通关奖励
   */
  claimClearReward(playerId, realmId, realmLevel) {
    if (!this.playerRecords.has(playerId)) {
      this.playerRecords.set(playerId, {});
    }
    
    const record = this.playerRecords.get(playerId)[realmId] || { cleared: false, firstClear: true };
    
    // 基础奖励 = 境界等级 × 1000
    const baseReward = Math.floor(realmLevel * this.baseReward);
    
    // 首通额外奖励
    const extraReward = record.firstClear ? this.firstClearReward : 0;
    
    // 更新记录
    record.cleared = true;
    if (record.firstClear) record.firstClear = false;
    
    this.playerRecords.get(playerId)[realmId] = record;
    
    return {
      success: true,
      reward: {
        spirit: baseReward + extraReward,
        isFirstClear: record.firstClear === false && extraReward > 0
      }
    };
  }
  
  /**
   * 扫荡奖励
   */
  sweepReward(playerId, realmId, realmLevel, floor) {
    const baseReward = Math.floor(realmLevel * this.baseReward * 0.8); // 80%奖励
    const floorBonus = Math.floor(baseReward * floor * 0.1); // 每层10%加成
    
    return {
      spirit: baseReward + floorBonus
    };
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DailyQuestSystem,
    SpiritConvertSystem,
    DungeonRewardSystem,
    DAILY_QUESTS,
    STONE_CONVERT_RATE
  };
}
