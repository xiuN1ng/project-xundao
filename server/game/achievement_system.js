/**
 * 挂机修仙 - 成就系统
 * 包含：成就数据、成就条件检测、成就奖励、进度追踪
 */

// ==================== 成就类型 ====================
const ACHIEVEMENT_TYPES = {
  cultivation: { name: '修炼', icon: '🧘', color: '#667eea' },
  combat: { name: '战斗', icon: '⚔️', color: '#ef4444' },
  collection: { name: '收集', icon: '📦', color: '#f59e0b' },
  exploration: { name: '探索', icon: '🗺️', color: '#10b981' },
  social: { name: '社交', icon: '👥', color: '#8e2de2' },
  wealth: { name: '财富', icon: '💰', color: '#ffd700' },
  special: { name: '特殊', icon: '⭐', color: '#ff4500' }
};

// ==================== 成就数据 ====================
const ACHIEVEMENT_DATA = {
  // ========== 修炼类成就 ==========
  'cultivation_1': {
    id: 'cultivation_1',
    type: 'cultivation',
    name: '初入仙途',
    desc: '修炼达到10级',
    requirement: { type: 'level', value: 10 },
    reward: { spiritStones: 100, title: '初学者' }
  },
  'cultivation_2': {
    id: 'cultivation_2',
    type: 'cultivation',
    name: '小有所成',
    desc: '修炼达到50级',
    requirement: { type: 'level', value: 50 },
    reward: { spiritStones: 500, title: '修士' }
  },
  'cultivation_3': {
    id: 'cultivation_3',
    type: 'cultivation',
    name: '修为精进',
    desc: '修炼达到100级',
    requirement: { type: 'level', value: 100 },
    reward: { spiritStones: 2000, title: '真人' }
  },
  'cultivation_4': {
    id: 'cultivation_4',
    type: 'cultivation',
    name: '灵气收集者',
    desc: '累计获得10000点灵气',
    requirement: { type: 'totalSpirit', value: 10000 },
    reward: { spiritStones: 200, spiritRateBonus: 0.1 }
  },
  'cultivation_5': {
    id: 'cultivation_5',
    type: 'cultivation',
    name: '灵气如云',
    desc: '累计获得100000点灵气',
    requirement: { type: 'totalSpirit', value: 100000 },
    reward: { spiritStones: 1000, spiritRateBonus: 0.2 }
  },
  'cultivation_6': {
    id: 'cultivation_6',
    type: 'cultivation',
    name: '灵气如海',
    desc: '累计获得1000000点灵气',
    requirement: { type: 'totalSpirit', value: 1000000 },
    reward: { spiritStones: 10000, spiritRateBonus: 0.5 }
  },
  'cultivation_7': {
    id: 'cultivation_7',
    type: 'cultivation',
    name: '境界突破',
    desc: '突破境界1次',
    requirement: { type: 'realmBreaks', value: 1 },
    reward: { spiritStones: 300, title: '突破者' }
  },
  'cultivation_8': {
    id: 'cultivation_8',
    type: 'cultivation',
    name: '境界飞跃',
    desc: '突破境界5次',
    requirement: { type: 'realmBreaks', value: 5 },
    reward: { spiritStones: 2000, realmExpBonus: 0.2 }
  },
  'cultivation_9': {
    id: 'cultivation_9',
    type: 'cultivation',
    name: '得道高人',
    desc: '突破境界10次',
    requirement: { type: 'realmBreaks', value: 10 },
    reward: { spiritStones: 10000, title: '高人' }
  },

  // ========== 战斗类成就 ==========
  'combat_1': {
    id: 'combat_1',
    type: 'combat',
    name: '初战告捷',
    desc: '赢得第1场战斗',
    requirement: { type: 'combatWins', value: 1 },
    reward: { spiritStones: 50 }
  },
  'combat_2': {
    id: 'combat_2',
    type: 'combat',
    name: '百战百胜',
    desc: '赢得100场战斗',
    requirement: { type: 'combatWins', value: 100 },
    reward: { spiritStones: 1000, atkBonus: 0.1 }
  },
  'combat_3': {
    id: 'combat_3',
    type: 'combat',
    name: '千战千胜',
    desc: '赢得1000场战斗',
    requirement: { type: 'combatWins', value: 1000 },
    reward: { spiritStones: 10000, atkBonus: 0.3 }
  },
  'combat_4': {
    id: 'combat_4',
    type: 'combat',
    name: '杀敌无数',
    desc: '击杀100只怪物',
    requirement: { type: 'monstersKilled', value: 100 },
    reward: { spiritStones: 500 }
  },
  'combat_5': {
    id: 'combat_5',
    type: 'combat',
    name: '屠魔卫道',
    desc: '击杀1000只怪物',
    requirement: { type: 'monstersKilled', value: 1000 },
    reward: { spiritStones: 5000, atkBonus: 0.2 }
  },
  'combat_6': {
    id: 'combat_6',
    type: 'combat',
    name: '副本先锋',
    desc: '通关1个副本',
    requirement: { type: 'dungeonsCleared', value: 1 },
    reward: { spiritStones: 200, title: '先锋' }
  },
  'combat_7': {
    id: 'combat_7',
    type: 'combat',
    name: '副本达人',
    desc: '通关10个副本',
    requirement: { type: 'dungeonsCleared', value: 10 },
    reward: { spiritStones: 2000, defBonus: 0.1 }
  },
  'combat_8': {
    id: 'combat_8',
    type: 'combat',
    name: '副本大师',
    desc: '通关50个副本',
    requirement: { type: 'dungeonsCleared', value: 50 },
    reward: { spiritStones: 10000, defBonus: 0.3 }
  },
  'combat_9': {
    id: 'combat_9',
    type: 'combat',
    name: '最高伤害',
    desc: '单次造成1000点伤害',
    requirement: { type: 'highestDamage', value: 1000 },
    reward: { spiritStones: 500 }
  },
  'combat_10': {
    id: 'combat_10',
    type: 'combat',
    name: '毁灭者',
    desc: '单次造成10000点伤害',
    requirement: { type: 'highestDamage', value: 10000 },
    reward: { spiritStones: 5000, atkBonus: 0.2 }
  },
  'combat_11': {
    id: 'combat_11',
    type: 'combat',
    name: '累计输出',
    desc: '累计造成100000点伤害',
    requirement: { type: 'totalDamage', value: 100000 },
    reward: { spiritStones: 2000 }
  },
  'combat_12': {
    id: 'combat_12',
    type: 'combat',
    name: '战斗大师',
    desc: '累计造成1000000点伤害',
    requirement: { type: 'totalDamage', value: 1000000 },
    reward: { spiritStones: 20000, atkBonus: 0.3 }
  },

  // ========== 收集类成就 ==========
  'collection_1': {
    id: 'collection_1',
    type: 'collection',
    name: '灵石收藏家',
    desc: '累计获得1000灵石',
    requirement: { type: 'totalSpiritStones', value: 1000 },
    reward: { spiritStones: 100 }
  },
  'collection_2': {
    id: 'collection_2',
    type: 'collection',
    name: '灵石大户',
    desc: '累计获得10000灵石',
    requirement: { type: 'totalSpiritStones', value: 10000 },
    reward: { spiritStones: 500, stoneBonus: 0.1 }
  },
  'collection_3': {
    id: 'collection_3',
    type: 'collection',
    name: '灵石巨头',
    desc: '累计获得100000灵石',
    requirement: { type: 'totalSpiritStones', value: 100000 },
    reward: { spiritStones: 5000, stoneBonus: 0.2 }
  },
  'collection_4': {
    id: 'collection_4',
    type: 'collection',
    name: '富甲一方',
    desc: '累计获得1000000灵石',
    requirement: { type: 'totalSpiritStones', value: 1000000 },
    reward: { spiritStones: 50000, stoneBonus: 0.5 }
  },
  'collection_5': {
    id: 'collection_5',
    type: 'collection',
    name: '功法初成',
    desc: '学习第1个功法',
    requirement: { type: 'techniquesLearned', value: 1 },
    reward: { spiritStones: 100 }
  },
  'collection_6': {
    id: 'collection_6',
    type: 'collection',
    name: '功法小成',
    desc: '学习5个功法',
    requirement: { type: 'techniquesLearned', value: 5 },
    reward: { spiritStones: 500, title: '功法达人' }
  },
  'collection_7': {
    id: 'collection_7',
    type: 'collection',
    name: '功法大成',
    desc: '学习全部功法',
    requirement: { type: 'techniquesLearned', value: 10 },
    reward: { spiritStones: 2000, expBonus: 0.2 }
  },

  // ========== 探索类成就 ==========
  'exploration_1': {
    id: 'exploration_1',
    type: 'exploration',
    name: '初试历练',
    desc: '完成第1次历练',
    requirement: { type: 'adventuresCompleted', value: 1 },
    reward: { spiritStones: 50 }
  },
  'exploration_2': {
    id: 'exploration_2',
    type: 'exploration',
    name: '历练达人',
    desc: '完成100次历练',
    requirement: { type: 'adventuresCompleted', value: 100 },
    reward: { spiritStones: 1000 }
  },
  'exploration_3': {
    id: 'exploration_3',
    type: 'exploration',
    name: '历尽千山',
    desc: '完成500次历练',
    requirement: { type: 'adventuresCompleted', value: 500 },
    reward: { spiritStones: 5000, spiritRateBonus: 0.2 }
  },
  'exploration_4': {
    id: 'exploration_4',
    type: 'exploration',
    name: '奇遇连连',
    desc: '触发10次奇遇事件',
    requirement: { type: 'chancesTriggered', value: 10 },
    reward: { spiritStones: 300 }
  },
  'exploration_5': {
    id: 'exploration_5',
    type: 'exploration',
    name: '天选之人',
    desc: '触发50次奇遇事件',
    requirement: { type: 'chancesTriggered', value: 50 },
    reward: { spiritStones: 2000, title: '天选者' }
  },
  'exploration_6': {
    id: 'exploration_6',
    type: 'exploration',
    name: '离线修炼',
    desc: '累计离线收益1000',
    requirement: { type: 'totalOfflineTime', value: 1000 },
    reward: { spiritStones: 200 }
  },
  'exploration_7': {
    id: 'exploration_7',
    type: 'exploration',
    name: '资深修士',
    desc: '累计在线100小时',
    requirement: { type: 'cultivationTime', value: 360000 },
    reward: { spiritStones: 5000 }
  },

  // ========== 社交类成就 ==========
  'social_1': {
    id: 'social_1',
    type: 'social',
    name: '拜师学艺',
    desc: '拥有1位师父',
    requirement: { type: 'masterCount', value: 1 },
    reward: { spiritStones: 200 }
  },
  'social_2': {
    id: 'social_2',
    type: 'social',
    name: '收徒育人',
    desc: '拥有1位徒弟',
    requirement: { type: 'discipleCount', value: 1 },
    reward: { spiritStones: 200 }
  },
  'social_3': {
    id: 'social_3',
    type: 'social',
    name: '桃李满天下',
    desc: '拥有5位徒弟',
    requirement: { type: 'discipleCount', value: 5 },
    reward: { spiritStones: 1000, expBonus: 0.1 }
  },

  // ========== 财富类成就 ==========
  'wealth_1': {
    id: 'wealth_1',
    type: 'wealth',
    name: '小康之家',
    desc: '当前拥有100灵石',
    requirement: { type: 'currentSpiritStones', value: 100 },
    reward: { spiritStones: 50 }
  },
  'wealth_2': {
    id: 'wealth_2',
    type: 'wealth',
    name: '富甲一方',
    desc: '当前拥有1000灵石',
    requirement: { type: 'currentSpiritStones', value: 1000 },
    reward: { spiritStones: 200, stoneBonus: 0.1 }
  },
  'wealth_3': {
    id: 'wealth_3',
    type: 'wealth',
    name: '腰缠万贯',
    desc: '当前拥有10000灵石',
    requirement: { type: 'currentSpiritStones', value: 10000 },
    reward: { spiritStones: 1000, stoneBonus: 0.2 }
  },
  'wealth_4': {
    id: 'wealth_4',
    type: 'wealth',
    name: '灵石满仓',
    desc: '当前拥有100000灵石',
    requirement: { type: 'currentSpiritStones', value: 100000 },
    reward: { spiritStones: 5000, stoneBonus: 0.3 }
  },

  // ========== 特殊类成就 ==========
  'special_1': {
    id: 'special_1',
    type: 'special',
    name: '天选之人',
    desc: '拥有天灵根',
    requirement: { type: 'spiritRoot', value: '天灵根' },
    reward: { spiritStones: 5000, title: '天选之子' }
  },
  'special_2': {
    id: 'special_2',
    type: 'special',
    name: '混沌之子',
    desc: '拥有混沌灵根',
    requirement: { type: 'spiritRoot', value: '混沌灵根' },
    reward: { spiritStones: 10000, title: '混沌传人' }
  },
  'special_3': {
    id: 'special_3',
    type: 'special',
    name: '首充奖励',
    desc: '获得1000灵石',
    requirement: { type: 'totalSpiritStones', value: 1000 },
    reward: { spiritStones: 1000 }
  },
  'special_4': {
    id: 'special_4',
    type: 'special',
    name: '氪金大佬',
    desc: '累计获得100000灵石',
    requirement: { type: 'totalSpiritStones', value: 100000 },
    reward: { spiritStones: 10000, stoneBonus: 0.5, title: '氪金大佬' }
  },
  'special_5': {
    id: 'special_5',
    type: 'special',
    name: '洞府初建',
    desc: '建造第1个建筑',
    requirement: { type: 'buildingsBuilt', value: 1 },
    reward: { spiritStones: 100 }
  },
  'special_6': {
    id: 'special_6',
    type: 'special',
    name: '洞府之主',
    desc: '建造全部建筑类型',
    requirement: { type: 'buildingTypes', value: 5 },
    reward: { spiritStones: 2000, title: '洞主' }
  },
  'special_7': {
    id: 'special_7',
    type: 'special',
    name: '灵兽伙伴',
    desc: '拥有1只灵兽',
    requirement: { type: 'beastCount', value: 1 },
    reward: { spiritStones: 500 }
  },
  'special_8': {
    id: 'special_8',
    type: 'special',
    name: '万兽之王',
    desc: '拥有10只灵兽',
    requirement: { type: 'beastCount', value: 10 },
    reward: { spiritStones: 5000, atkBonus: 0.2 }
  }
};

// ==================== 成就系统类 ====================
class AchievementSystem {
  constructor() {
    // 玩家成就进度
    this.achievements = {};
    // 已解锁的成就ID列表
    this.unlockedAchievements = [];
    // 已领取奖励的成就ID列表
    this.claimedAchievements = [];
    // 待领取奖励的成就列表（已达成但未领取）
    this.pendingRewards = [];
    // 成就成就加成
    this.bonuses = {
      spiritRateBonus: 0,
      atkBonus: 0,
      defBonus: 0,
      expBonus: 0,
      stoneBonus: 0,
      realmExpBonus: 0
    };
    // 称号
    this.titles = [];
    // 成就统计
    this.stats = {
      totalAchievements: Object.keys(ACHIEVEMENT_DATA).length,
      unlockedCount: 0,
      claimedCount: 0
    };
  }

  // 初始化成就进度
  init() {
    // 初始化所有成就为未完成
    for (const [id, data] of Object.entries(ACHIEVEMENT_DATA)) {
      this.achievements[id] = {
        id: id,
        progress: 0,
        completed: false,
        claimed: false,
        completedAt: null
      };
    }
  }

  // 获取当前成就进度
  getProgress(achievementId) {
    const data = ACHIEVEMENT_DATA[achievementId];
    if (!data) return 0;
    
    const req = data.requirement;
    const stats = gameState.stats;
    const player = gameState.player;
    const cave = gameState.cave;
    
    switch (req.type) {
      case 'level':
        return player.level;
      case 'totalSpirit':
        return stats.totalSpirit;
      case 'realmBreaks':
        return stats.realmBreaks;
      case 'combatWins':
        return stats.combatWins;
      case 'monstersKilled':
        return stats.monstersKilled;
      case 'dungeonsCleared':
        return stats.dungeonsCleared;
      case 'highestDamage':
        return Math.floor(stats.highestDamage);
      case 'totalDamage':
        return Math.floor(stats.totalDamage);
      case 'totalSpiritStones':
        return stats.totalSpiritStones;
      case 'currentSpiritStones':
        return player.spiritStones;
      case 'techniquesLearned':
        return stats.techniquesLearned || 0;
      case 'adventuresCompleted':
        return stats.adventuresCompleted;
      case 'chancesTriggered':
        return stats.chancesTriggered;
      case 'totalOfflineTime':
        return stats.totalOfflineTime || 0;
      case 'cultivationTime':
        return player.cultivationTime;
      case 'spiritRoot':
        return player.spiritRoot === req.value ? 1 : 0;
      case 'masterCount':
        return gameState.master?.master ? 1 : 0;
      case 'discipleCount':
        return gameState.master?.disciples?.length || 0;
      case 'buildingsBuilt':
        return Object.values(cave.buildings).reduce((a, b) => a + b, 0);
      case 'buildingTypes':
        return Object.keys(cave.buildings).filter(k => cave.buildings[k] > 0).length;
      case 'beastCount':
        return gameState.beasts?.length || 0;
      default:
        return 0;
    }
  }

  // 检查成就是否完成
  checkAchievement(achievementId) {
    const data = ACHIEVEMENT_DATA[achievementId];
    if (!data) return false;
    
    const progress = this.getProgress(achievementId);
    const requirement = data.requirement;
    
    // 检查是否满足条件
    let completed = false;
    if (requirement.type === 'spiritRoot') {
      completed = progress >= 1;
    } else {
      completed = progress >= requirement.value;
    }
    
    // 更新进度
    if (this.achievements[achievementId]) {
      this.achievements[achievementId].progress = progress;
      
      // 如果刚刚完成且未领取奖励
      if (completed && !this.achievements[achievementId].completed && !this.achievements[achievementId].claimed) {
        this.achievements[achievementId].completed = true;
        this.achievements[achievementId].completedAt = Date.now();
        this.pendingRewards.push(achievementId);
        this.unlockedAchievements.push(achievementId);
        this.stats.unlockedCount = this.unlockedAchievements.length;
      }
    }
    
    return completed;
  }

  // 检查所有成就
  checkAllAchievements() {
    const newlyCompleted = [];
    
    for (const achievementId of Object.keys(ACHIEVEMENT_DATA)) {
      if (!this.achievements[achievementId]?.completed) {
        const wasCompleted = this.achievements[achievementId]?.completed;
        this.checkAchievement(achievementId);
        if (!wasCompleted && this.achievements[achievementId]?.completed) {
          newlyCompleted.push(achievementId);
        }
      }
    }
    
    return newlyCompleted;
  }

  // 领取成就奖励
  async claimReward(achievementId) {
    // 调用后端API
    const result = await achievementAPI.claim(achievementId);
    
    if (result.success) {
      const data = ACHIEVEMENT_DATA[achievementId];
      const ach = this.achievements[achievementId];
      
      if (!data || !ach || !ach.completed || ach.claimed) {
        return { success: false, message: '无法领取奖励' };
      }
      
      const player = gameState.player;
      let rewards = [];
      
      // 添加灵石奖励
      if (data.reward.spiritStones) {
        player.spiritStones += data.reward.spiritStones;
        rewards.push(`${data.reward.spiritStones}灵石`);
      }
      
      // 添加属性加成
      if (data.reward.spiritRateBonus) {
        this.bonuses.spiritRateBonus += data.reward.spiritRateBonus;
        rewards.push(`修炼速度+${Math.round(data.reward.spiritRateBonus * 100)}%`);
      }
      
      if (data.reward.atkBonus) {
        this.bonuses.atkBonus += data.reward.atkBonus;
        rewards.push(`攻击+${Math.round(data.reward.atkBonus * 100)}%`);
      }
      
      if (data.reward.defBonus) {
        this.bonuses.defBonus += data.reward.defBonus;
        rewards.push(`防御+${Math.round(data.reward.defBonus * 100)}%`);
      }
      
      if (data.reward.expBonus) {
        this.bonuses.expBonus += data.reward.expBonus;
        rewards.push(`经验+${Math.round(data.reward.expBonus * 100)}%`);
      }
      
      if (data.reward.stoneBonus) {
        this.bonuses.stoneBonus += data.reward.stoneBonus;
        rewards.push(`灵石获取+${Math.round(data.reward.stoneBonus * 100)}%`);
      }
    
    if (data.realmExpBonus) {
      this.bonuses.realmExpBonus += data.realmExpBonus;
      rewards.push(`境界经验+${Math.round(data.realmExpBonus * 100)}%`);
    }
    
    // 添加称号
    if (data.reward.title) {
      if (!this.titles.includes(data.reward.title)) {
        this.titles.push(data.reward.title);
        rewards.push(`称号：${data.reward.title}`);
      }
    }
    
    // 标记为已领取
    ach.claimed = true;
    this.claimedAchievements.push(achievementId);
    this.stats.claimedCount = this.claimedAchievements.length;
    
    // 从待领取列表中移除
    const idx = this.pendingRewards.indexOf(achievementId);
    if (idx > -1) {
      this.pendingRewards.splice(idx, 1);
    }
    
    return { 
      success: true, 
      message: `领取成功！奖励：${rewards.join('、 ')}`,
      rewards: rewards
    };
  }

  // 获取成就显示数据
  getAchievementDisplayData(achievementId) {
    const data = ACHIEVEMENT_DATA[achievementId];
    const ach = this.achievements[achievementId];
    
    if (!data || !ach) return null;
    
    const typeInfo = ACHIEVEMENT_TYPES[data.type];
    const progress = this.getProgress(achievementId);
    const requirement = data.requirement;
    const percent = Math.min(100, Math.floor((progress / requirement.value) * 100));
    
    return {
      id: achievementId,
      name: data.name,
      desc: data.desc,
      type: data.type,
      typeName: typeInfo?.name || data.type,
      typeIcon: typeInfo?.icon || '🏆',
      typeColor: typeInfo?.color || '#ffd700',
      progress: progress,
      target: requirement.value,
      percent: percent,
      completed: ach.completed,
      claimed: ach.claimed,
      completedAt: ach.completedAt,
      reward: data.reward
    };
  }

  // 获取所有成就显示数据
  getAllAchievementsDisplay(type = null) {
    const result = [];
    
    for (const achievementId of Object.keys(ACHIEVEMENT_DATA)) {
      if (type && ACHIEVEMENT_DATA[achievementId].type !== type) continue;
      
      const displayData = this.getAchievementDisplayData(achievementId);
      if (displayData) {
        result.push(displayData);
      }
    }
    
    // 按类型和完成状态排序
    result.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return a.type.localeCompare(b.type);
    });
    
    return result;
  }

  // 获取成就统计
  getStats() {
    return {
      total: this.stats.totalAchievements,
      unlocked: this.stats.unlockedCount,
      claimed: this.stats.claimedCount,
      pending: this.pendingRewards.length,
      titles: this.titles,
      bonuses: this.bonuses
    };
  }

  // 保存成就数据
  save() {
    return {
      achievements: this.achievements,
      unlockedAchievements: this.unlockedAchievements,
      claimedAchievements: this.claimedAchievements,
      pendingRewards: this.pendingRewards,
      bonuses: this.bonuses,
      titles: this.titles,
      stats: this.stats
    };
  }

  // 加载成就数据
  load(data) {
    if (!data) {
      this.init();
      return;
    }
    
    this.achievements = data.achievements || {};
    this.unlockedAchievements = data.unlockedAchievements || [];
    this.claimedAchievements = data.claimedAchievements || [];
    this.pendingRewards = data.pendingRewards || [];
    this.bonuses = data.bonuses || { spiritRateBonus: 0, atkBonus: 0, defBonus: 0, expBonus: 0, stoneBonus: 0, realmExpBonus: 0 };
    this.titles = data.titles || [];
    this.stats = data.stats || { totalAchievements: Object.keys(ACHIEVEMENT_DATA).length, unlockedCount: 0, claimedCount: 0 };
    
    // 确保所有成就都有数据
    this.init();
    for (const [id, saved] of Object.entries(data.achievements || {})) {
      if (this.achievements[id]) {
        this.achievements[id] = saved;
      }
    }
  }

  // 获取当前加成
  getBonusMultiplier() {
    return {
      spiritRate: 1 + this.bonuses.spiritRateBonus,
      atk: 1 + this.bonuses.atkBonus,
      def: 1 + this.bonuses.defBonus,
      exp: 1 + this.bonuses.expBonus,
      stone: 1 + this.bonuses.stoneBonus,
      realmExp: 1 + this.bonuses.realmExpBonus
    };
  }

  // 获取当前显示的称号
  getCurrentTitle() {
    return this.titles.length > 0 ? this.titles[this.titles.length - 1] : null;
  }
}

// 创建成就系统实例
let achievementSystem = new AchievementSystem();

// ============ 成就系统 API 集成 ============

// 刷新成就列表
async function refreshAchievements() {
  const result = await achievementAPI.getList();
  if (result.success && result.achievements) {
    // 更新本地成就状态
    for (const [id, data] of Object.entries(result.achievements)) {
      if (achievementSystem.achievements[id]) {
        achievementSystem.achievements[id] = data;
      }
    }
  }
  return result;
}

// 导出
window.achievementSystem = achievementSystem;
window.refreshAchievements = refreshAchievements;
