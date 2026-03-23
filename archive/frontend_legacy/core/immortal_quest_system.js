/**
 * 仙界任务系统 - 仙界主线任务
 * 包含仙界特有的主线任务和支线任务
 */

// 仙界主线任务配置
const IMMORTAL_QUEST_DATA = {
  // 飞升系列任务
  '飞升考验': {
    id: '飞升考验',
    name: '飞升考验',
    description: '渡过飞升劫难，位列仙班',
    type: 'main',
    category: '飞升',
    requiredRealm: '大乘期',
    requiredLevel: 180,
    objectives: [
      { type: 'defeat', target: '飞升劫兽', count: 1, progress: 0 },
      { type: 'collect', target: '灵气结晶', count: 99, progress: 0 },
      { type: 'tribulation', target: '飞升雷劫', count: 1, progress: 0 }
    ],
    rewards: {
      spiritStones: 50000,
      realm: '真仙',
      title: '真仙',
      abilities: [{ name: '真元护体', description: '受到伤害时减免20%' }]
    },
    timeLimit: 7200, // 2小时
    icon: '🚀',
    difficulty: 'hard'
  },
  
  // 真仙任务线
  '真仙传承': {
    id: '真仙传承',
    name: '真仙传承',
    description: '接受真仙传承，获得无上神通',
    type: 'main',
    category: '真仙',
    requiredRealm: '真仙',
    requiredLevel: 200,
    objectives: [
      { type: 'explore', target: '仙灵福地', count: 5, progress: 0 },
      { type: 'defeat', target: '真仙守卫', count: 10, progress: 0 },
      { type: 'collect', target: '仙晶', count: 50, progress: 0 }
    ],
    rewards: {
      spiritStones: 100000,
      realmLevel: 10,
      abilities: [{ name: '灵气化形', description: '攻击时有10%几率造成双倍伤害' }]
    },
    timeLimit: 10800,
    icon: '✨',
    difficulty: 'medium'
  },
  
  // 金仙任务线
  '金仙劫': {
    id: '金仙劫',
    name: '金仙劫',
    description: '渡过金仙劫，成就金身不坏',
    type: 'main',
    category: '金仙',
    requiredRealm: '真仙',
    requiredLevel: 220,
    objectives: [
      { type: 'defeat', target: '金仙劫兽', count: 1, progress: 0 },
      { type: 'collect', target: '金之精华', count: 100, progress: 0 },
      { type: 'craft', target: '金仙令', count: 1, progress: 0 }
    ],
    rewards: {
      spiritStones: 200000,
      realm: '金仙',
      title: '金仙',
      abilities: [
        { name: '金身不坏', description: '生命值低于30%时，防御提升50%' },
        { name: '金光大道', description: '修炼效率提升30%' }
      ]
    },
    timeLimit: 14400,
    icon: '🌟',
    difficulty: 'hard'
  },
  
  '金仙试炼': {
    id: '金仙试炼',
    name: '金仙试炼',
    description: '通过金仙试炼，证明自己的实力',
    type: 'main',
    category: '金仙',
    requiredRealm: '金仙',
    requiredLevel: 240,
    objectives: [
      { type: 'defeat', target: '金仙傀儡', count: 20, progress: 0 },
      { type: 'survive', target: '金仙战场', count: 300, progress: 0 },
      { type: 'collect', target: '金仙血脉', count: 1, progress: 0 }
    ],
    rewards: {
      spiritStones: 300000,
      realmLevel: 20,
      abilities: [{ name: '金仙法则', description: '所有属性提升15%' }]
    },
    timeLimit: 18000,
    icon: '⚔️',
    difficulty: 'medium'
  },
  
  // 大罗金仙任务线
  '大罗劫': {
    id: '大罗劫',
    name: '大罗劫',
    description: '渡过成仙以来最恐怖的大罗劫',
    type: 'main',
    category: '大罗',
    requiredRealm: '金仙',
    requiredLevel: 280,
    objectives: [
      { type: 'defeat', target: '大罗天魔', count: 1, progress: 0 },
      { type: 'defeat', target: '大罗守护者', count: 5, progress: 0 },
      { type: 'collect', target: '大罗之气', count: 200, progress: 0 }
    ],
    rewards: {
      spiritStones: 500000,
      realm: '大罗金仙',
      title: '大罗金仙',
      abilities: [
        { name: '大罗天眼', description: '可以看到敌人弱点，暴击率提升20%' },
        { name: '轮回不灭', description: '每分钟恢复5%最大生命值' }
      ]
    },
    timeLimit: 21600,
    icon: '👑',
    difficulty: 'extreme'
  },
  
  '大罗天境': {
    id: '大罗天境',
    name: '大罗天境',
    description: '进入大罗天境，领悟无上法则',
    type: 'main',
    category: '大罗',
    requiredRealm: '大罗金仙',
    requiredLevel: 320,
    objectives: [
      { type: 'explore', target: '大罗天宫', count: 10, progress: 0 },
      { type: 'defeat', target: '大罗天王', count: 1, progress: 0 },
      { type: 'collect', target: '法则碎片', count: 50, progress: 0 }
    ],
    rewards: {
      spiritStones: 1000000,
      realmLevel: 30,
      abilities: [
        { name: '法则领域', description: '战斗时降低敌人30%防御' },
        { name: '大罗果位', description: '所有属性提升30%' }
      ]
    },
    timeLimit: 28800,
    icon: '🏛️',
    difficulty: 'extreme'
  },
  
  // 日常/支线任务
  '仙界巡视': {
    id: '仙界巡视',
    name: '仙界巡视',
    description: '巡视仙界，维护秩序',
    type: 'daily',
    category: '日常',
    requiredRealm: '真仙',
    requiredLevel: 180,
    objectives: [
      { type: 'defeat', target: '仙界妖魔', count: 10, progress: 0 }
    ],
    rewards: {
      spiritStones: 5000,
      realmExp: 100
    },
    timeLimit: 3600,
    icon: '👁️',
    difficulty: 'easy'
  },
  
  '仙山采集': {
    id: '仙山采集',
    name: '仙山采集',
    description: '采集天材地宝',
    type: 'daily',
    category: '日常',
    requiredRealm: '真仙',
    requiredLevel: 180,
    objectives: [
      { type: 'collect', target: '仙草', count: 20, progress: 0 }
    ],
    rewards: {
      spiritStones: 3000,
      herbs: 10
    },
    timeLimit: 1800,
    icon: '🌿',
    difficulty: 'easy'
  },
  
  '仙兽驱逐': {
    id: '仙兽驱逐',
    name: '仙兽驱逐',
    description: '驱逐为祸仙界的仙兽',
    type: 'daily',
    category: '日常',
    requiredRealm: '金仙',
    requiredLevel: 220,
    objectives: [
      { type: 'defeat', target: '凶兽', count: 15, progress: 0 }
    ],
    rewards: {
      spiritStones: 8000,
      materials: 5
    },
    timeLimit: 3600,
    icon: '🦁',
    difficulty: 'medium'
  },
  
  '法则参悟': {
    id: '法则参悟',
    name: '法则参悟',
    description: '参悟天地法则，提升境界',
    type: 'daily',
    category: '日常',
    requiredRealm: '大罗金仙',
    requiredLevel: 300,
    objectives: [
      { type: 'meditate', target: '法则之海', count: 1, progress: 0 }
    ],
    rewards: {
      spiritStones: 20000,
      realmExp: 500
    },
    timeLimit: 7200,
    icon: '🧘',
    difficulty: 'easy'
  }
};

// 仙界任务系统类
class ImmortalQuestSystem {
  constructor() {
    this.playerQuests = new Map();
    this.dailyQuestResetTime = null;
  }
  
  // 获取所有任务
  getAllQuests(type = null) {
    if (type) {
      return Object.values(IMMORTAL_QUEST_DATA).filter(q => q.type === type);
    }
    return Object.values(IMMORTAL_QUEST_DATA);
  }
  
  // 获取可接任务
  getAvailableQuests(playerId) {
    try {
      const db = require('./database');
      const player = db.prepare('SELECT * FROM player WHERE id = ?').get(playerId);
      
      if (!player) return [];
      
      const realmOrder = ['凡人', '炼气期', '筑基期', '金丹期', '元婴期', '化神期', '炼虚期', '合体期', '大乘期', '真仙', '金仙', '大罗金仙', '准圣', '圣人'];
      const playerRealmIndex = realmOrder.indexOf(player.realm);
      
      const available = [];
      const completed = this.getCompletedQuests(playerId);
      
      for (const [id, quest] of Object.entries(IMMORTAL_QUEST_DATA)) {
        const reqRealmIndex = realmOrder.indexOf(quest.requiredRealm);
        
        // 检查境界和等级要求
        if (playerRealmIndex >= reqRealmIndex && player.level >= quest.requiredLevel) {
          // 检查是否已完成
          if (!completed.includes(id)) {
            // 检查是否有进行中的前置任务
            const canAccept = this.checkPrerequisites(id, completed);
            if (canAccept) {
              available.push({
                ...quest,
                objectives: quest.objectives.map(obj => ({ ...obj }))
              });
            }
          }
        }
      }
      
      return available;
    } catch (e) {
      console.error('获取可接任务失败:', e);
      return [];
    }
  }
  
  // 检查前置任务
  checkPrerequisites(questId, completed) {
    const quest = IMMORTAL_QUEST_DATA[questId];
    if (!quest) return false;
    
    // 这里可以添加前置任务检查逻辑
    // 暂时全部返回true
    return true;
  }
  
  // 接受任务
  acceptQuest(playerId, questId) {
    const quest = IMMORTAL_QUEST_DATA[questId];
    if (!quest) {
      return { success: false, message: '任务不存在' };
    }
    
    // 检查是否已有该任务
    if (this.playerQuests.has(playerId)) {
      const quests = this.playerQuests.get(playerId);
      if (quests.find(q => q.id === questId)) {
        return { success: false, message: '已有该任务' };
      }
    }
    
    // 创建任务进度
    const questProgress = {
      id: questId,
      ...quest,
      status: 'in_progress',
      startTime: Date.now(),
      endTime: Date.now() + (quest.timeLimit || 0) * 1000,
      objectives: quest.objectives.map(obj => ({
        ...obj,
        progress: 0,
        completed: false
      })),
      rewards: { ...quest.rewards }
    };
    
    if (!this.playerQuests.has(playerId)) {
      this.playerQuests.set(playerId, []);
    }
    this.playerQuests.get(playerId).push(questProgress);
    
    return {
      success: true,
      message: `接受任务：${quest.name}`,
      quest: questProgress
    };
  }
  
  // 更新任务进度
  updateQuestProgress(playerId, type, target, amount = 1) {
    if (!this.playerQuests.has(playerId)) return null;
    
    const quests = this.playerQuests.get(playerId);
    let updated = null;
    
    for (const quest of quests) {
      if (quest.status !== 'in_progress') continue;
      
      // 检查时间限制
      if (quest.endTime && Date.now() > quest.endTime) {
        quest.status = 'expired';
        continue;
      }
      
      // 查找匹配的目标
      for (const objective of quest.objectives) {
        if (objective.type === type && objective.target === target) {
          if (!objective.completed) {
            objective.progress = Math.min(objective.progress + amount, objective.count);
            
            // 检查是否完成
            if (objective.progress >= objective.count) {
              objective.completed = true;
            }
            
            updated = quest;
          }
        }
      }
      
      // 检查所有目标是否完成
      const allCompleted = quest.objectives.every(obj => obj.completed);
      if (allCompleted) {
        quest.status = 'completed';
      }
    }
    
    return updated;
  }
  
  // 获取玩家任务列表
  getPlayerQuests(playerId) {
    if (!this.playerQuests.has(playerId)) {
      return { in_progress: [], completed: [], available: this.getAvailableQuests(playerId) };
    }
    
    const quests = this.playerQuests.get(playerId);
    const inProgress = quests.filter(q => q.status === 'in_progress');
    const completed = quests.filter(q => q.status === 'completed');
    const expired = quests.filter(q => q.status === 'expired');
    
    // 清理过期任务（保留30天）
    const now = Date.now();
    const validExpired = expired.filter(q => now - q.endTime < 30 * 24 * 60 * 60 * 1000);
    
    // 合并到已完成列表
    const allCompleted = [...completed, ...validExpired];
    
    return {
      in_progress: inProgress,
      completed: allCompleted.slice(-20), // 保留最近20个
      available: this.getAvailableQuests(playerId)
    };
  }
  
  // 完成任务并领取奖励
  completeQuest(playerId, questId) {
    if (!this.playerQuests.has(playerId)) {
      return { success: false, message: '没有该任务' };
    }
    
    const quests = this.playerQuests.get(playerId);
    const quest = quests.find(q => q.id === questId);
    
    if (!quest) {
      return { success: false, message: '没有该任务' };
    }
    
    if (quest.status !== 'completed') {
      // 检查是否所有目标都完成
      const allCompleted = quest.objectives.every(obj => obj.progress >= obj.count);
      if (!allCompleted) {
        return { success: false, message: '任务目标未完成' };
      }
      quest.status = 'completed';
    }
    
    // 计算奖励
    const rewards = this.calculateRewards(quest);
    
    // 发放奖励
    try {
      const db = require('./database');
      
      // 灵石
      if (rewards.spiritStones) {
        db.prepare('UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?')
          .run(rewards.spiritStones, playerId);
      }
      
      // 境界提升
      if (rewards.realm) {
        db.prepare('UPDATE player SET realm = ? WHERE id = ?')
          .run(rewards.realm, playerId);
      }
      
      // 境界等级
      if (rewards.realmLevel) {
        db.prepare('UPDATE player SET realm_level = realm_level + ? WHERE id = ?')
          .run(rewards.realmLevel, playerId);
      }
      
      // 记录已完成任务
      this.addCompletedQuest(playerId, questId);
      
      // 从进行中移除
      const index = quests.indexOf(quest);
      if (index > -1) {
        quests.splice(index, 1);
      }
      
      return {
        success: true,
        message: `完成任务：${quest.name}`,
        rewards: rewards,
        questData: quest
      };
    } catch (e) {
      console.error('完成任务失败:', e);
      return { success: false, message: '系统错误' };
    }
  }
  
  // 计算奖励
  calculateRewards(quest) {
    const rewards = { ...quest.rewards };
    
    // 随机浮动 (±10%)
    for (const [key, value] of Object.entries(rewards)) {
      if (typeof value === 'number') {
        const variance = Math.floor(value * 0.1);
        rewards[key] = value + Math.floor(Math.random() * (variance * 2 + 1)) - variance;
      }
    }
    
    return rewards;
  }
  
  // 放弃任务
  abandonQuest(playerId, questId) {
    if (!this.playerQuests.has(playerId)) {
      return { success: false, message: '没有该任务' };
    }
    
    const quests = this.playerQuests.get(playerId);
    const quest = quests.find(q => q.id === questId);
    
    if (!quest) {
      return { success: false, message: '没有该任务' };
    }
    
    if (quest.status === 'completed') {
      return { success: false, message: '已完成的任务无法放弃' };
    }
    
    const index = quests.indexOf(quest);
    if (index > -1) {
      quests.splice(index, 1);
    }
    
    return { success: true, message: '已放弃任务' };
  }
  
  // 获取已完成任务列表
  getCompletedQuests(playerId) {
    try {
      // 暂时使用内存存储
      const quests = this.playerQuests.get(playerId) || [];
      return quests.filter(q => q.status === 'completed').map(q => q.id);
    } catch (e) {
      return [];
    }
  }
  
  // 添加已完成任务
  addCompletedQuest(playerId, questId) {
    // 可以在数据库中记录
  }
  
  // 获取任务详情
  getQuestDetails(questId) {
    return IMMORTAL_QUEST_DATA[questId] || null;
  }
}

// 导出
module.exports = {
  ImmortalQuestSystem,
  IMMORTAL_QUEST_DATA
};
