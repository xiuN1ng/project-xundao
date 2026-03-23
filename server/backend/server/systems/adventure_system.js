/**
 * 仙侠奇遇系统 - 核心逻辑
 * 实现4种奇遇类型：遗迹探索、仙人指路、妖兽袭击、遗失宝物
 * 
 * 功能：
 * - 奇遇触发与冷却
 * - 奖励发放
 * - 刷新机制
 * - 动画效果描述
 */

const storage = require('../../data/adventure_storage');

// ============================================================
// 奇遇类型定义
// ============================================================

const ADVENTURE_TYPES = {
  /** 遗迹探索 - 探索古老遗迹，获得上古遗宝 */
  RUINS_EXPLORATION: 'ruins_exploration',
  
  /** 仙人指路 - 仙人显灵，指点迷津 */
  IMMORTAL_GUIDANCE: 'immortal_guidance',
  
  /** 妖兽袭击 - 突发遭遇妖兽侵袭 */
  MONSTER_ATTACK: 'monster_attack',
  
  /** 遗失宝物 - 意外发现前人遗落的宝物 */
  LOST_TREASURE: 'lost_treasure'
};

// ============================================================
// 奇遇配置
// ============================================================

const ADVENTURE_CONFIGS = {
  [ADVENTURE_TYPES.RUINS_EXPLORATION]: {
    name: '遗迹探索',
    nameEn: 'Ruins Exploration',
    description: '你在一处幽深的山谷中发现了上古遗迹，隐约散发着神秘光芒...',
    
    // 触发条件
    triggerConditions: {
      minLevel: 10,           // 最低等级
      minExploration: 50,     // 最低探索点数
      probability: 0.15,     // 基础触发概率
      levelBonus: 0.02,       // 每级增加概率
      explorationBonus: 0.001 // 每点探索增加概率
    },
    
    // 冷却时间（毫秒）
    cooldownMs: 3600000,      // 1小时
    
    // 持续时间（毫秒）
    durationMs: 300000,       // 5分钟
    
    // 奖励配置
    rewards: {
      base: { lingshi: 100, exp: 200 },
      bonus: { lingshi: 500, exp: 800, items: 1 },
      rare: { lingshi: 1000, exp: 2000, items: 2 }
    },
    
    // 稀有度概率
    rarityProb: {
      common: 0.60,   // 普通
      bonus: 0.30,    // 珍稀
      rare: 0.10      // 稀有
    },
    
    // 动画效果描述
    animations: {
      trigger: '画面渐暗，山谷深处亮起金色光芒，尘土飞扬中浮现古老符文',
      active: '遗迹入口缓缓开启，符文在空中盘旋飞舞，背景传来低沉的轰鸣声',
      complete: '金光四射，宝物悬浮而出，古老的机关声回荡',
      fail: '遗迹入口突然崩塌，尘土弥漫，你被迫撤退'
    },
    
    // 可触发的事件列表
    events: [
      { id: 'ruins_1', title: '古修士洞府', desc: '发现一处保存完好的洞府遗迹', rarity: 'common' },
      { id: 'ruins_2', title: '上古祭坛', desc: '祭坛上供奉着神秘符文石', rarity: 'bonus' },
      { id: 'ruins_3', title: '封印之地', desc: '被封印的宝库入口，散发诱人光芒', rarity: 'rare' },
      { id: 'ruins_4', title: '传承石碑', desc: '石碑上刻有失传功法', rarity: 'common' },
      { id: 'ruins_5', title: '灵泉遗迹', desc: '遗迹深处发现残存灵泉', rarity: 'bonus' }
    ]
  },
  
  [ADVENTURE_TYPES.IMMORTAL_GUIDANCE]: {
    name: '仙人指路',
    nameEn: 'Immortal Guidance',
    description: '冥冥之中，似有仙人注视，天际降下一道玄光...',
    
    triggerConditions: {
      minLevel: 15,
      minCultivationProgress: 0.3,  // 修为进度
      probability: 0.10,
      levelBonus: 0.015,
      cultivationBonus: 0.1
    },
    
    cooldownMs: 7200000,      // 2小时
    durationMs: 180000,      // 3分钟
    
    rewards: {
      base: { lingshi: 50, exp: 500, cultivation: 100 },
      bonus: { lingshi: 200, exp: 1500, cultivation: 300, attribute: 1 },
      rare: { lingshi: 500, exp: 3000, cultivation: 500, attribute: 3 }
    },
    
    rarityProb: {
      common: 0.55,
      bonus: 0.35,
      rare: 0.10
    },
    
    animations: {
      trigger: '天空突现七彩祥云，一道金光从天而降，笼罩你的全身',
      active: '虚空中浮现仙人的虚影，散发柔和光芒，周围花瓣飘落',
      complete: '金光入体，困扰已久的修炼瓶颈豁然开朗，境界松动',
      fail: '仙人虚影叹息一声，化作点点星光消散'
    },
    
    events: [
      { id: 'immortal_1', title: '顿悟时刻', desc: '仙人点化，修炼如有神助', rarity: 'common' },
      { id: 'immortal_2', title: '天机泄露', desc: '仙人传授独门功法诀窍', rarity: 'bonus' },
      { id: 'immortal_3', title: '仙缘降临', desc: '仙人赐下珍贵灵丹', rarity: 'rare' },
      { id: 'immortal_4', title: '功法推演', desc: '仙人助你推演功法精要', rarity: 'common' },
      { id: 'immortal_5', title: '境界指引', desc: '仙人指出突破关键', rarity: 'bonus' }
    ]
  },
  
  [ADVENTURE_TYPES.MONSTER_ATTACK]: {
    name: '妖兽袭击',
    nameEn: 'Monster Attack',
    description: '山林间突然传来兽吼，强大的妖气弥漫而来...',
    
    triggerConditions: {
      minLevel: 5,
      minBattlesWon: 3,       // 最少胜利次数
      probability: 0.20,
      levelBonus: 0.01,
      consecutiveWinBonus: 0.05
    },
    
    cooldownMs: 1800000,      // 30分钟
    durationMs: 600000,      // 10分钟（需要战斗）
    
    rewards: {
      base: { lingshi: 80, exp: 150, monsterMaterial: 1 },
      bonus: { lingshi: 300, exp: 500, monsterMaterial: 2, equipment: 1 },
      rare: { lingshi: 800, exp: 1500, monsterMaterial: 3, rareEquipment: 1 }
    },
    
    rarityProb: {
      common: 0.65,
      bonus: 0.25,
      rare: 0.10
    },
    
    animations: {
      trigger: '屏幕剧烈震动，远处传来震耳欲聋的咆哮，树林剧烈摇晃',
      active: '巨大的妖兽身影从雾中出现，血红双眼盯着你，妖气冲天',
      complete: '妖兽轰然倒地，化作点点灵光消散，留下丰厚材料',
      fail: '妖兽过于强大，你且战且退，最终脱险但未能击杀'
    },
    
    events: [
      { id: 'monster_1', title: '妖狼群袭', desc: '一群妖狼包围了你', rarity: 'common' },
      { id: 'monster_2', title: '巨蟒出洞', desc: '巨大的蟒蛇从地底钻出', rarity: 'bonus' },
      { id: 'monster_3', title: '妖兽王者', desc: '区域霸主级别的妖兽出现', rarity: 'rare' },
      { id: 'monster_4', title: '变异妖兽', desc: '受到污染的变异妖兽', rarity: 'bonus' },
      { id: 'monster_5', title: '妖兽幼崽', desc: '落单的妖兽幼崽，战斗力不强', rarity: 'common' }
    ]
  },
  
  [ADVENTURE_TYPES.LOST_TREASURE]: {
    name: '遗失宝物',
    nameEn: 'Lost Treasure',
    description: '似乎是前人遗留的宝物，隐藏在不起眼的角落...',
    
    triggerConditions: {
      minLevel: 1,            // 低门槛
      probability: 0.25,      // 较高触发率
      levelBonus: 0.01,
      randomBonus: 0.05       // 随机加成
    },
    
    cooldownMs: 900000,       // 15分钟
    durationMs: 120000,       // 2分钟
    
    rewards: {
      base: { lingshi: 50, item: 1 },
      bonus: { lingshi: 200, items: 2, equipment: 1 },
      rare: { lingshi: 500, items: 3, rareEquipment: 1 }
    },
    
    rarityProb: {
      common: 0.70,
      bonus: 0.25,
      rare: 0.05
    },
    
    animations: {
      trigger: '脚下一软，似乎踩到了什么，一阵微光从地面透出',
      active: '地面裂开一个洞口，里面闪烁着各色光芒，隐约可见宝物轮廓',
      complete: '你小心翼翼取出宝物，它们散发着柔和的光芒，做工精细',
      fail: '宝物突然化作幻影消散，只留下一阵清风'
    },
    
    events: [
      { id: 'treasure_1', title: '散落的灵石', desc: '前辈遗留的灵石碎片', rarity: 'common' },
      { id: 'treasure_2', title: '破旧法器', desc: '虽已残破但仍有灵性的法器', rarity: 'common' },
      { id: 'treasure_3', title: '灵草采集点', desc: '发现一片野生的灵草', rarity: 'bonus' },
      { id: 'treasure_4', title: '藏宝图碎片', desc: '标注着某处宝藏位置的残卷', rarity: 'bonus' },
      { id: 'treasure_5', title: '上古宝盒', desc: '封印完整的古老宝盒', rarity: 'rare' }
    ]
  }
};

// ============================================================
// 全局配置
// ============================================================

const GLOBAL_CONFIG = {
  // 每日奇遇上限
  DAILY_ADVENTURE_LIMIT: 5,
  
  // 每日奇遇刷新时间（凌晨4点）
  DAILY_REFRESH_HOUR: 4,
  
  // 探索点数获取配置
  EXPLORATION_POINT_ACTIONS: {
    explore_area: 10,    // 探索新区域
    complete_dungeon: 25, // 完成副本
    defeat_boss: 30,     // 击败BOSS
    claim_adventure: 5   // 完成奇遇
  },
  
  // 触发奇遇所需基础概率
  BASE_TRIGGER_PROBABILITY: 0.05,
  
  // 全局奇遇间隔（毫秒）
  GLOBAL_COOLDOWN: 300000  // 5分钟
};

// ============================================================
// 核心功能实现
// ============================================================

/**
 * 仙侠奇遇系统主类
 */
class AdventureSystem {
  constructor() {
    this.storage = storage;
  }
  
  // --------------------------------------------------------
  // 奇遇查询接口
  // --------------------------------------------------------
  
  /**
   * 获取用户奇遇状态
   */
  getAdventureStatus(userId) {
    const userData = this.storage.getUserData(userId);
    this.storage.checkDailyRefresh(userId);
    
    const stats = this.storage.getUserStats(userId);
    const todayCompleted = this.storage.getCompletedToday(userId);
    const cooldowns = this.getAllCooldowns(userId);
    
    return {
      userId,
      stats,
      todayCompletedCount: todayCompleted.length,
      dailyLimit: GLOBAL_CONFIG.DAILY_ADVENTURE_LIMIT,
      cooldowns,
      explorationPoints: stats.explorationPoints,
      lastRefreshDate: userData.lastRefreshDate
    };
  }
  
  /**
   * 获取当前可用的奇遇
   */
  getAvailableAdventures(userId) {
    const userData = this.storage.getUserData(userId);
    this.storage.checkDailyRefresh(userId);
    
    return userData.availableAdventures || [];
  }
  
  /**
   * 获取奇遇详情
   */
  getAdventureDetail(userId, adventureId) {
    const userData = this.storage.getUserData(userId);
    const adventure = userData.availableAdventures.find(a => a.id === adventureId);
    
    if (!adventure) {
      return { success: false, message: '奇遇不存在或已过期' };
    }
    
    const config = ADVENTURE_CONFIGS[adventure.type];
    const remainingTime = adventure.expiresAt - Date.now();
    
    return {
      success: true,
      adventure: {
        ...adventure,
        config: {
          name: config.name,
          nameEn: config.nameEn,
          description: config.description,
          duration: remainingTime,
          animations: config.animations
        }
      }
    };
  }
  
  /**
   * 获取所有奇遇类型的配置（仅展示用）
   */
  getAllAdventureConfigs() {
    return Object.entries(ADVENTURE_CONFIGS).map(([type, config]) => ({
      type,
      name: config.name,
      nameEn: config.nameEn,
      description: config.description,
      cooldownMinutes: Math.round(config.cooldownMs / 60000),
      rarityNames: ['common', 'bonus', 'rare']
    }));
  }
  
  /**
   * 获取用户的奇遇历史
   */
  getAdventureHistory(userId, limit = 20) {
    const userData = this.storage.getUserData(userId);
    const history = userData.triggeredAdventures.slice(-limit).reverse();
    
    return history.map(h => ({
      id: h.id,
      type: h.type,
      typeName: ADVENTURE_CONFIGS[h.type]?.name || h.type,
      title: h.title,
      triggeredAt: h.triggeredAt,
      completed: h.completed,
      completedAt: h.completedAt || null
    }));
  }
  
  // --------------------------------------------------------
  // 奇遇触发
  // --------------------------------------------------------
  
  /**
   * 尝试触发奇遇（玩家主动）
   */
  tryTriggerAdventure(userId, playerLevel, playerData = {}) {
    // 检查每日限制
    const todayCompleted = this.storage.getCompletedToday(userId);
    if (todayCompleted.length >= GLOBAL_CONFIG.DAILY_ADVENTURE_LIMIT) {
      return {
        success: false,
        message: `今日奇遇次数已用尽（${todayCompleted.length}/${GLOBAL_CONFIG.DAILY_ADVENTURE_LIMIT}）`,
        code: 'DAILY_LIMIT_REACHED'
      };
    }
    
    // 检查全局冷却
    const globalCooldown = this.storage.getCooldownRemaining(userId, '_global');
    if (globalCooldown > 0) {
      return {
        success: false,
        message: `奇遇冷却中，请等待 ${Math.ceil(globalCooldown / 60000)} 分钟`,
        code: 'GLOBAL_COOLDOWN',
        remainingMs: globalCooldown
      };
    }
    
    // 计算各类型触发概率
    const possibleAdventures = this.getPossibleAdventures(userId, playerLevel, playerData);
    
    if (possibleAdventures.length === 0) {
      return {
        success: false,
        message: '当前条件下没有可触发的奇遇，请提升实力后再试',
        code: 'NO_ADVENTURE_AVAILABLE'
      };
    }
    
    // 按概率随机选择
    const selected = this.selectAdventureByProbability(possibleAdventures);
    
    if (!selected) {
      // 触发失败，但记录为尝试
      this.storage.addLog({
        type: 'trigger_attempt',
        userId,
        playerLevel,
        result: 'failed',
        timestamp: Date.now()
      });
      
      return {
        success: false,
        message: '此次探索未能发现奇遇，或许需要更多探索点数',
        code: 'TRIGGER_FAILED',
        explorationBonus: this.getExplorationHint(playerLevel, playerData)
      };
    }
    
    // 创建奇遇实例
    const adventure = this.createAdventureInstance(selected, playerLevel);
    
    // 记录并存储
    this.storage.recordAdventure(userId, adventure);
    const userData = this.storage.getUserData(userId);
    
    // 添加到可用列表
    if (!userData.availableAdventures) userData.availableAdventures = [];
    userData.availableAdventures.push(adventure);
    this.storage.save();
    
    // 设置全局冷却
    this.storage.setCooldown(userId, '_global', GLOBAL_CONFIG.GLOBAL_COOLDOWN);
    
    // 记录日志
    this.storage.addLog({
      type: 'adventure_triggered',
      userId,
      adventureId: adventure.id,
      adventureType: adventure.type,
      rarity: adventure.rarity,
      timestamp: Date.now()
    });
    
    return {
      success: true,
      adventure: {
        id: adventure.id,
        type: adventure.type,
        typeName: ADVENTURE_CONFIGS[adventure.type].name,
        title: adventure.title,
        description: adventure.description,
        rarity: adventure.rarity,
        rarityLabel: this.getRarityLabel(adventure.rarity),
        animation: ADVENTURE_CONFIGS[adventure.type].animations.trigger,
        duration: adventure.expiresAt - Date.now(),
        rewardPreview: this.getRewardPreview(adventure.type, adventure.rarity)
      }
    };
  }
  
  /**
   * 获取可能的奇遇类型列表
   */
  getPossibleAdventures(userId, playerLevel, playerData = {}) {
    const possible = [];
    const userData = this.storage.getUserData(userId);
    
    for (const [type, config] of Object.entries(ADVENTURE_CONFIGS)) {
      // 检查冷却
      const cooldownRemaining = this.storage.getCooldownRemaining(userId, type);
      if (cooldownRemaining > 0) continue;
      
      // 检查触发条件
      const cond = config.triggerConditions;
      
      if (playerLevel < cond.minLevel) continue;
      
      // 特殊条件检查
      if (type === ADVENTURE_TYPES.IMMORTAL_GUIDANCE) {
        const cultivationProgress = playerData.cultivationProgress || 0;
        if (cultivationProgress < (cond.minCultivationProgress || 0)) continue;
      }
      
      if (type === ADVENTURE_TYPES.MONSTER_ATTACK) {
        const battlesWon = playerData.battlesWon || 0;
        if (battlesWon < (cond.minBattlesWon || 0)) continue;
      }
      
      if (type === ADVENTURE_TYPES.RUINS_EXPLORATION) {
        const explorationPoints = userData.explorationPoints || 0;
        if (explorationPoints < (cond.minExploration || 0)) continue;
      }
      
      // 计算实际触发概率
      let prob = cond.probability;
      
      if (cond.levelBonus) {
        prob += (playerLevel - cond.minLevel) * cond.levelBonus;
      }
      
      if (cond.explorationBonus && userData.explorationPoints) {
        prob += userData.explorationPoints * cond.explorationBonus;
      }
      
      if (cond.cultivationBonus && playerData.cultivationProgress) {
        prob += playerData.cultivationProgress * cond.cultivationBonus;
      }
      
      if (cond.consecutiveWinBonus && playerData.consecutiveWins) {
        prob += Math.min(playerData.consecutiveWins * 0.02, cond.consecutiveWinBonus);
      }
      
      if (cond.randomBonus) {
        prob += Math.random() * cond.randomBonus;
      }
      
      possible.push({ type, config, probability: Math.min(prob, 0.8) });
    }
    
    return possible;
  }
  
  /**
   * 按概率选择奇遇
   */
  selectAdventureByProbability(possibleAdventures) {
    const totalProb = possibleAdventures.reduce((sum, a) => sum + a.probability, 0);
    let random = Math.random() * totalProb;
    
    for (const adv of possibleAdventures) {
      random -= adv.probability;
      if (random <= 0) {
        return adv;
      }
    }
    
    // 兜底：返回最高概率的
    possibleAdventures.sort((a, b) => b.probability - a.probability);
    return possibleAdventures[0];
  }
  
  /**
   * 创建奇遇实例
   */
  createAdventureInstance(adventureType, playerLevel) {
    const config = ADVENTURE_CONFIGS[adventureType.type];
    
    // 确定稀有度
    const rarity = this.rollRarity(adventureType.type);
    
    // 随机选择事件
    const eligibleEvents = config.events.filter(e => e.rarity === rarity);
    const fallbackEvents = config.events.filter(e => e.rarity === 'common');
    const eventList = eligibleEvents.length > 0 ? eligibleEvents : fallbackEvents;
    const event = eventList[Math.floor(Math.random() * eventList.length)];
    
    return {
      id: `adv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: adventureType.type,
      rarity,
      eventId: event.id,
      title: event.title,
      description: event.desc,
      playerLevel,
      triggeredAt: Date.now(),
      expiresAt: Date.now() + config.durationMs,
      reward: this.calculateRewards(adventureType.type, rarity, playerLevel)
    };
  }
  
  /**
   * 稀有度抽取
   */
  rollRarity(adventureType) {
    const config = ADVENTURE_CONFIGS[adventureType];
    const rand = Math.random();
    let cumulative = 0;
    
    for (const [rarity, prob] of Object.entries(config.rarityProb)) {
      cumulative += prob;
      if (rand <= cumulative) return rarity;
    }
    
    return 'common';
  }
  
  /**
   * 计算奖励
   */
  calculateRewards(adventureType, rarity, playerLevel) {
    const config = ADVENTURE_CONFIGS[adventureType];
    const baseRewards = config.rewards[rarity] || config.rewards.base;
    
    // 等级加成
    const levelMultiplier = 1 + (playerLevel - 1) * 0.05;
    
    const rewards = {};
    for (const [key, value] of Object.entries(baseRewards)) {
      if (key === 'attribute') {
        rewards[key] = value;
      } else if (typeof value === 'number') {
        rewards[key] = Math.floor(value * levelMultiplier);
      } else {
        rewards[key] = value;
      }
    }
    
    return rewards;
  }
  
  // --------------------------------------------------------
  // 奇遇完成
  // --------------------------------------------------------
  
  /**
   * 完成奇遇（领取奖励）
   */
  completeAdventure(userId, adventureId, success = true, battleResult = null) {
    const userData = this.storage.getUserData(userId);
    const adventure = userData.availableAdventures.find(a => a.id === adventureId);
    
    if (!adventure) {
      return { success: false, message: '奇遇不存在或已过期' };
    }
    
    if (adventure.completed) {
      return { success: false, message: '奇遇已完成，请勿重复领取' };
    }
    
    const config = ADVENTURE_CONFIGS[adventure.type];
    
    // 妖兽袭击需要战斗判定
    if (adventure.type === ADVENTURE_TYPES.MONSTER_ATTACK) {
      if (!success && battleResult && battleResult.escaped) {
        return this.handleAdventureFail(userId, adventure, '战斗失败但成功脱身');
      }
      if (!success) {
        return { success: false, message: '战斗未完成，请继续战斗' };
      }
    }
    
    // 检查是否超时
    if (Date.now() > adventure.expiresAt) {
      return this.handleAdventureFail(userId, adventure, '奇遇超时未完成');
    }
    
    // 发放奖励
    const rewards = adventure.reward;
    const rewardDetails = this.formatRewards(rewards);
    
    // 更新存储
    this.storage.completeAdventure(userId, adventureId);
    this.storage.setCooldown(userId, adventure.type, config.cooldownMs);
    this.storage.addExplorationPoints(userId, GLOBAL_CONFIG.EXPLORATION_POINT_ACTIONS.claim_adventure);
    this.storage.addRewardStats(userId, rewards);
    
    // 从可用列表移除
    userData.availableAdventures = userData.availableAdventures.filter(a => a.id !== adventureId);
    this.storage.save();
    
    // 日志
    this.storage.addLog({
      type: 'adventure_completed',
      userId,
      adventureId,
      adventureType: adventure.type,
      rarity: adventure.rarity,
      rewards,
      timestamp: Date.now()
    });
    
    return {
      success: true,
      completed: true,
      adventureId,
      adventureType: adventure.type,
      animation: config.animations.complete,
      rewards: rewardDetails,
      totalLingshi: rewards.lingshi || 0,
      totalExp: rewards.exp || 0,
      explorationPointsGained: GLOBAL_CONFIG.EXPLORATION_POINT_ACTIONS.claim_adventure
    };
  }
  
  /**
   * 处理奇遇失败
   */
  handleAdventureFail(userId, adventure, reason) {
    const config = ADVENTURE_CONFIGS[adventure.type];
    
    // 从可用列表移除
    const userData = this.storage.getUserData(userId);
    userData.availableAdventures = userData.availableAdventures.filter(a => a.id !== adventure.id);
    this.storage.save();
    
    // 设置较短冷却
    this.storage.setCooldown(userId, adventure.type, 300000); // 5分钟
    
    this.storage.addLog({
      type: 'adventure_failed',
      userId,
      adventureId: adventure.id,
      adventureType: adventure.type,
      reason,
      timestamp: Date.now()
    });
    
    return {
      success: false,
      completed: false,
      adventureId: adventure.id,
      reason,
      animation: config.animations.fail
    };
  }
  
  /**
   * 放弃奇遇
   */
  abandonAdventure(userId, adventureId) {
    const userData = this.storage.getUserData(userId);
    const adventure = userData.availableAdventures.find(a => a.id === adventureId);
    
    if (!adventure) {
      return { success: false, message: '奇遇不存在' };
    }
    
    userData.availableAdventures = userData.availableAdventures.filter(a => a.id !== adventureId);
    this.storage.setCooldown(userId, adventure.type, 600000); // 10分钟冷却
    this.storage.save();
    
    return { success: true, message: '已放弃奇遇' };
  }
  
  // --------------------------------------------------------
  // 辅助接口
  // --------------------------------------------------------
  
  /**
   * 获取所有冷却时间
   */
  getAllCooldowns(userId) {
    const cooldowns = {};
    
    for (const type of Object.keys(ADVENTURE_TYPES)) {
      const remaining = this.storage.getCooldownRemaining(userId, type);
      if (remaining > 0) {
        cooldowns[type] = {
          remainingMs: remaining,
          remainingMinutes: Math.ceil(remaining / 60000),
          typeName: ADVENTURE_CONFIGS[type].name
        };
      }
    }
    
    return cooldowns;
  }
  
  /**
   * 格式化奖励显示
   */
  formatRewards(rewards) {
    const parts = [];
    
    if (rewards.lingshi) parts.push(`${rewards.lingshi}灵石`);
    if (rewards.exp) parts.push(`${rewards.exp}经验`);
    if (rewards.cultivation) parts.push(`${rewards.cultivation}修为`);
    if (rewards.items) parts.push(`${rewards.items}个道具`);
    if (rewards.item) parts.push(`1个道具`);
    if (rewards.monsterMaterial) parts.push(`${rewards.monsterMaterial}个妖兽材料`);
    if (rewards.equipment) parts.push(`1件装备`);
    if (rewards.rareEquipment) parts.push(`1件稀有装备`);
    if (rewards.attribute) parts.push(`${rewards.attribute}点属性加成`);
    
    return parts.join('、');
  }
  
  /**
   * 获取奖励预览
   */
  getRewardPreview(adventureType, rarity) {
    const config = ADVENTURE_CONFIGS[adventureType];
    const rewards = config.rewards[rarity] || config.rewards.base;
    return this.formatRewards(rewards);
  }
  
  /**
   * 获取稀有度标签
   */
  getRarityLabel(rarity) {
    const labels = {
      common: '普通',
      bonus: '珍稀',
      rare: '稀有'
    };
    return labels[rarity] || rarity;
  }
  
  /**
   * 获取探索提示
   */
  getExplorationHint(playerLevel, playerData) {
    const hints = [];
    
    if (playerLevel < 10) {
      hints.push('提升等级可解锁更多奇遇类型');
    }
    if ((playerData.explorationPoints || 0) < 50) {
      hints.push('多探索区域可增加奇遇触发概率');
    }
    if ((playerData.battlesWon || 0) < 3) {
      hints.push('积累更多战斗胜利可触发妖兽袭击');
    }
    
    return hints.length > 0 ? hints : ['继续探索，仙缘自有定数'];
  }
  
  /**
   * 增加探索点数（供其他系统调用）
   */
  addExplorationPoint(userId, action, amount = null) {
    const points = amount || GLOBAL_CONFIG.EXPLORATION_POINT_ACTIONS[action] || 5;
    return this.storage.addExplorationPoints(userId, points);
  }
  
  /**
   * 获取用户奇遇统计
   */
  getUserStats(userId) {
    return this.storage.getUserStats(userId);
  }
}

// 导出单例
const adventureSystem = new AdventureSystem();

module.exports = {
  adventureSystem,
  ADVENTURE_TYPES,
  ADVENTURE_CONFIGS,
  GLOBAL_CONFIG
};
