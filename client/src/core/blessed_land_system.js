/**
 * 福地任务系统 - 探索事件、随机奖励
 * 玩家可以在福地中进行探索，发现随机事件和奖励
 */

// 福地类型配置
const BLESSED_LAND_TYPES = {
  '灵泉福地': {
    name: '灵泉福地',
    description: '拥有灵泉的洞天福地，灵气充沛',
    minRealm: '金丹期',
    explorationTime: 300, // 探索所需时间(秒)
    events: ['spiritualSpring', 'rareHerb', 'ancientRuins', 'monsterEncounter'],
    rewards: { spiritStones: [100, 500], herbs: [1, 5], materials: [1, 3] }
  },
  '古遗址': {
    name: '古遗址',
    description: '上古修士遗留下来的洞府',
    minRealm: '元婴期',
    explorationTime: 600,
    events: ['ancientArtifact', 'treasureVault', 'spiritEncounter', 'dangerousTrap'],
    rewards: { spiritStones: [500, 2000], materials: [3, 8], equipment: [1, 2] }
  },
  '仙灵岛': {
    name: '仙灵岛',
    description: '传说中的仙人居所',
    minRealm: '化神期',
    explorationTime: 900,
    events: ['immortalHeritage', 'divineBeast', 'celestialTreasure', 'realmBreakthrough'],
    rewards: { spiritStones: [2000, 5000], pills: [1, 3], gongfa: [1, 1] }
  },
  '混沌裂缝': {
    name: '混沌裂缝',
    description: '空间裂缝中蕴含的混沌之力',
    minRealm: '炼虚期',
    explorationTime: 1200,
    events: ['chaosEnergy', 'voidMonster', 'ancientSeed', 'dimensionPortal'],
    rewards: { spiritStones: [5000, 10000], materials: [5, 15], rareItems: [1, 2] }
  }
};

// 探索事件定义
const EXPLORATION_EVENTS = {
  // 灵泉相关
  spiritualSpring: {
    name: '发现灵泉',
    description: '你发现了一处灵泉，泉水蕴含充沛的灵气',
    icon: '⛲',
    successRate: 0.8,
    rewards: { spirit: [50, 200], spiritStones: [50, 150] },
    nextEvent: null
  },
  rareHerb: {
    name: '发现灵草',
    description: '你发现了一株珍稀的灵草',
    icon: '🌿',
    successRate: 0.7,
    rewards: { herbs: [2, 5] },
    nextEvent: null
  },
  
  // 古遗址相关
  ancientRuins: {
    name: '古修士遗迹',
    description: '你发现了上古修士的遗迹',
    icon: '🏛️',
    successRate: 0.6,
    rewards: { materials: [3, 8], spiritStones: [200, 500] },
    nextEvent: 'treasureVault'
  },
  monsterEncounter: {
    name: '遭遇妖兽',
    description: '福地中有强大的妖兽守护',
    icon: '👹',
    successRate: 0.5,
    rewards: { combat: true, exp: [100, 300], materials: [1, 3] },
    nextEvent: null
  },
  
  // 仙灵岛相关
  ancientArtifact: {
    name: '古宝问世',
    description: '你发现了一件上古法宝',
    icon: '🔱',
    successRate: 0.4,
    rewards: { equipment: [1, 1], spiritStones: [500, 1000] },
    nextEvent: null
  },
  treasureVault: {
    name: '藏宝库',
    description: '你发现了古修士的藏宝库',
    icon: '💎',
    successRate: 0.3,
    rewards: { spiritStones: [1000, 3000], pills: [1, 2], materials: [5, 10] },
    nextEvent: null
  },
  spiritEncounter: {
    name: '仙人传承',
    description: '你遇到了仙人的一丝神念',
    icon: '🧘',
    successRate: 0.5,
    rewards: { gongfa: [1, 1], exp: [500, 1000] },
    nextEvent: null
  },
  dangerousTrap: {
    name: '危险陷阱',
    description: '触发了古遗址中的危险陷阱',
    icon: '⚠️',
    successRate: 0.4,
    rewards: { damage: true, hpLoss: [20, 50] },
    nextEvent: null
  },
  
  // 仙灵岛事件
  immortalHeritage: {
    name: '仙人传承',
    description: '你获得了仙人的传承印记',
    icon: '✨',
    successRate: 0.3,
    rewards: { gongfa: [1, 1], spirit: [500, 1000], techniquePoints: [1, 3] },
    nextEvent: null
  },
  divineBeast: {
    name: '神兽青睐',
    description: '神兽对你产生了兴趣，愿意与你结缘',
    icon: '🦄',
    successRate: 0.2,
    rewards: { beast: [1, 1], beastAffinity: [10, 20] },
    nextEvent: null
  },
  celestialTreasure: {
    name: '天材地宝',
    description: '你发现了天地生成的奇珍异宝',
    icon: '🌟',
    successRate: 0.4,
    rewards: { pills: [2, 5], spiritStones: [2000, 5000] },
    nextEvent: null
  },
  realmBreakthrough: {
    name: '境界领悟',
    description: '福地灵气让你对境界有了新的领悟',
    icon: '📈',
    successRate: 0.6,
    rewards: { exp: [1000, 3000], realmExp: [100, 500] },
    nextEvent: null
  },
  
  // 混沌裂缝事件
  chaosEnergy: {
    name: '混沌能量',
    description: '你吸收了一丝混沌能量',
    icon: '🌀',
    successRate: 0.5,
    rewards: { spirit: [1000, 2000], atkBonus: [1, 3], duration: 3600 },
    nextEvent: null
  },
  voidMonster: {
    name: '虚空巨兽',
    description: '你遭遇了来自虚空的强大生物',
    icon: '🦑',
    successRate: 0.3,
    rewards: { combat: true, exp: [2000, 5000], rareItems: [1, 1] },
    nextEvent: null
  },
  ancientSeed: {
    name: '混沌种子',
    description: '你发现了一颗蕴含混沌之力的种子',
    icon: '🌱',
    successRate: 0.2,
    rewards: { rareItems: [1, 1], spirit: [2000, 5000] },
    nextEvent: null
  },
  dimensionPortal: {
    name: '维度门户',
    description: '你发现了通往其他维度的门户',
    icon: '🌌',
    successRate: 0.3,
    rewards: { spiritStones: [5000, 10000], rareItems: [2, 3] },
    nextEvent: null
  }
};

// 福地任务管理器
class BlessedLandSystem {
  constructor() {
    this.playerQuests = new Map(); // 玩家当前任务
    this.explorationHistory = new Map(); // 探索历史
  }
  
  // 获取可用的福地列表
  getAvailableLands(realm) {
    const realmOrder = ['凡人', '炼气期', '筑基期', '金丹期', '元婴期', '化神期', '炼虚期', '合体期', '大乘期', '真仙', '金仙', '大罗金仙'];
    const playerRealmIndex = realmOrder.indexOf(realm);
    
    const available = {};
    for (const [id, land] of Object.entries(BLESSED_LAND_TYPES)) {
      const minRealmIndex = realmOrder.indexOf(land.minRealm);
      if (playerRealmIndex >= minRealmIndex) {
        available[id] = land;
      }
    }
    return available;
  }
  
  // 开始探索任务
  startExploration(playerId, landId) {
    const player = this.getPlayer(playerId);
    const land = BLESSED_LAND_TYPES[landId];
    
    if (!player) return { success: false, message: '玩家不存在' };
    if (!land) return { success: false, message: '福地不存在' };
    
    // 检查是否有未完成的任务
    if (this.playerQuests.has(playerId)) {
      const currentQuest = this.playerQuests.get(playerId);
      if (currentQuest.status === 'exploring') {
        return { success: false, message: '已有进行中的探索任务' };
      }
    }
    
    // 创建新任务
    const quest = {
      id: `quest_${Date.now()}`,
      landId,
      landName: land.name,
      status: 'exploring',
      startTime: Date.now(),
      endTime: Date.now() + land.explorationTime * 1000,
      events: [],
      rewards: {},
      progress: 0
    };
    
    this.playerQuests.set(playerId, quest);
    
    // 生成随机事件
    this.generateEvents(playerId, land);
    
    return {
      success: true,
      message: `开始探索${land.name}，预计需要${land.explorationTime}秒`,
      quest: this.getQuestStatus(playerId)
    };
  }
  
  // 生成探索事件
  generateEvents(playerId, land) {
    const quest = this.playerQuests.get(playerId);
    if (!quest) return;
    
    const eventCount = Math.floor(Math.random() * 3) + 2; // 2-4个事件
    const availableEvents = [...land.events];
    
    for (let i = 0; i < eventCount; i++) {
      const eventIndex = Math.floor(Math.random() * availableEvents.length);
      const eventId = availableEvents.splice(eventIndex, 1)[0];
      const event = EXPLORATION_EVENTS[eventId];
      
      if (event) {
        quest.events.push({
          id: eventId,
          ...event,
          resolved: false,
          triggered: false
        });
      }
    }
  }
  
  // 触发随机事件
  triggerRandomEvent(playerId) {
    const quest = this.playerQuests.get(playerId);
    if (!quest || quest.status !== 'exploring') return null;
    
    // 找到未触发的事件
    const pendingEvents = quest.events.filter(e => !e.triggered);
    if (pendingEvents.length === 0) return null;
    
    // 随机选择一个事件触发
    const event = pendingEvents[Math.floor(Math.random() * pendingEvents.length)];
    event.triggered = true;
    
    // 计算成功/失败
    const success = Math.random() < event.successRate;
    
    // 生成奖励
    const rewards = this.generateRewards(event, success);
    
    return {
      eventId: event.id,
      eventName: event.name,
      description: event.description,
      icon: event.icon,
      success,
      rewards,
      progress: this.calculateProgress(playerId)
    };
  }
  
  // 生成奖励
  generateRewards(event, success) {
    const rewards = {};
    
    if (!success) {
      rewards.failed = true;
      return rewards;
    }
    
    const rewardTypes = event.rewards;
    
    // 灵石
    if (rewardTypes.spiritStones) {
      const [min, max] = rewardTypes.spiritStones;
      rewards.spiritStones = Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    // 灵气
    if (rewardTypes.spirit) {
      const [min, max] = rewardTypes.spirit;
      rewards.spirit = Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    // 灵草
    if (rewardTypes.herbs) {
      const [min, max] = rewardTypes.herbs;
      rewards.herbs = Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    // 材料
    if (rewardTypes.materials) {
      const [min, max] = rewardTypes.materials;
      rewards.materials = Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    // 丹药
    if (rewardTypes.pills) {
      const [min, max] = rewardTypes.pills;
      rewards.pills = Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    // 法宝
    if (rewardTypes.equipment) {
      const [min, max] = rewardTypes.equipment;
      rewards.equipment = Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    // 功法
    if (rewardTypes.gongfa) {
      rewards.gongfa = Math.floor(Math.random() * rewardTypes.gongfa[1]) + rewardTypes.gongfa[0];
    }
    
    // 经验
    if (rewardTypes.exp) {
      const [min, max] = rewardTypes.exp;
      rewards.exp = Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    // 境界经验
    if (rewardTypes.realmExp) {
      const [min, max] = rewardTypes.realmExp;
      rewards.realmExp = Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    // 技能点
    if (rewardTypes.techniquePoints) {
      const [min, max] = rewardTypes.techniquePoints;
      rewards.techniquePoints = Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    // 战斗事件
    if (rewardTypes.combat) {
      rewards.combat = true;
    }
    
    // 稀有物品
    if (rewardTypes.rareItems) {
      const [min, max] = rewardTypes.rareItems;
      rewards.rareItems = Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    return rewards;
  }
  
  // 计算进度
  calculateProgress(playerId) {
    const quest = this.playerQuests.get(playerId);
    if (!quest) return 0;
    
    const triggered = quest.events.filter(e => e.triggered).length;
    return Math.floor((triggered / quest.events.length) * 100);
  }
  
  // 完成探索任务
  completeExploration(playerId) {
    const quest = this.playerQuests.get(playerId);
    if (!quest) return { success: false, message: '没有进行中的任务' };
    
    if (quest.status !== 'exploring') {
      return { success: false, message: '任务未在进行中' };
    }
    
    // 检查是否到期
    if (Date.now() < quest.endTime) {
      const remaining = Math.ceil((quest.endTime - Date.now()) / 1000);
      return { success: false, message: `还需等待${remaining}秒` };
    }
    
    // 计算总奖励
    let totalRewards = {
      spiritStones: 0,
      spirit: 0,
      herbs: 0,
      materials: 0,
      pills: 0,
      equipment: 0,
      exp: 0,
      realmExp: 0
    };
    
    for (const event of quest.events) {
      if (event.triggered && event.successRate && Math.random() < event.successRate) {
        const rewards = this.generateRewards(event, true);
        totalRewards.spiritStones += rewards.spiritStones || 0;
        totalRewards.spirit += rewards.spirit || 0;
        totalRewards.herbs += rewards.herbs || 0;
        totalRewards.materials += rewards.materials || 0;
        totalRewards.pills += rewards.pills || 0;
        totalRewards.equipment += rewards.equipment || 0;
        totalRewards.exp += rewards.exp || 0;
        totalRewards.realmExp += rewards.realmExp || 0;
      }
    }
    
    // 添加探索完成的固定奖励
    const land = BLESSED_LAND_TYPES[quest.landId];
    const baseRewards = land.rewards;
    totalRewards.spiritStones += Math.floor(Math.random() * (baseRewards.spiritStones[1] - baseRewards.spiritStones[0])) + baseRewards.spiritStones[0];
    totalRewards.materials += Math.floor(Math.random() * (baseRewards.materials[1] - baseRewards.materials[0])) + baseRewards.materials[0];
    
    quest.status = 'completed';
    quest.completedTime = Date.now();
    quest.totalRewards = totalRewards;
    
    // 保存到历史记录
    this.addToHistory(playerId, quest);
    
    return {
      success: true,
      message: `探索${quest.landName}完成！`,
      quest: quest,
      rewards: totalRewards
    };
  }
  
  // 获取任务状态
  getQuestStatus(playerId) {
    const quest = this.playerQuests.get(playerId);
    if (!quest) return null;
    
    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((quest.endTime - now) / 1000));
    const progress = this.calculateProgress(playerId);
    
    return {
      ...quest,
      remaining,
      progress,
      canComplete: now >= quest.endTime
    };
  }
  
  // 添加到历史记录
  addToHistory(playerId, quest) {
    if (!this.explorationHistory.has(playerId)) {
      this.explorationHistory.set(playerId, []);
    }
    
    const history = this.explorationHistory.get(playerId);
    history.push({
      ...quest,
      viewed: false
    });
    
    // 保持最近20条记录
    if (history.length > 20) {
      history.shift();
    }
  }
  
  // 获取历史记录
  getHistory(playerId, limit = 10) {
    const history = this.explorationHistory.get(playerId) || [];
    return history.slice(-limit).reverse();
  }
  
  // 获取玩家数据（从数据库）
  getPlayer(playerId) {
    try {
      const db = require('./database');
      return db.prepare('SELECT * FROM player WHERE id = ?').get(playerId);
    } catch (e) {
      return null;
    }
  }
  
  // 放弃任务
  abandonQuest(playerId) {
    if (!this.playerQuests.has(playerId)) {
      return { success: false, message: '没有进行中的任务' };
    }
    
    const quest = this.playerQuests.get(playerId);
    if (quest.status !== 'exploring') {
      return { success: false, message: '任务不在进行中' };
    }
    
    this.playerQuests.delete(playerId);
    
    return { success: true, message: '已放弃探索任务' };
  }
}

// 导出模块
module.exports = {
  BlessedLandSystem,
  BLESSED_LAND_TYPES,
  EXPLORATION_EVENTS
};
