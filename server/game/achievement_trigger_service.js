/**
 * 成就触发服务 - 后端埋点检测
 * 负责在关键事件发生时检测成就达成并推送通知
 * 
 * 触发事件：
 * - level_up: 升级
 * - chapter_clear: 通关章节
 * - dungeon_clear: 通关副本
 * - equipment_obtain: 获得装备
 * - combat_win: 战斗胜利
 * - realm_breakthrough: 境界突破
 */

// 持久化回调（由 achievement.js 注册 saveAchievementToDB）
let saveProgressCallback = null;
function setSaveProgressCallback(fn) { saveProgressCallback = fn; }

// 每次进度更新后自动持久化
function autoPersist(userId) {
  if (!saveProgressCallback) return;
  const userData = userAchievementProgress.get(userId);
  if (!userData) return;
  for (const [achId, achProgress] of userData) {
    saveProgressCallback(userId, achId, achProgress.progress, achProgress.completed, achProgress.claimed);
  }
}

const ACHIEVEMENT_DEFINITIONS = {
  // ========== 升级类成就 ==========
  level_up_10: {
    id: 'level_up_10',
    type: 'cultivation',
    name: '初入仙途',
    desc: '修炼达到10级',
    trigger: 'level_up',
    target: 10,
    reward: { spiritStones: 100, title: '初学者' }
  },
  level_up_50: {
    id: 'level_up_50',
    type: 'cultivation',
    name: '小有所成',
    desc: '修炼达到50级',
    trigger: 'level_up',
    target: 50,
    reward: { spiritStones: 500, title: '修士' }
  },
  level_up_100: {
    id: 'level_up_100',
    type: 'cultivation',
    name: '修为精进',
    desc: '修炼达到100级',
    trigger: 'level_up',
    target: 100,
    reward: { spiritStones: 2000, title: '真人' }
  },
  level_up_200: {
    id: 'level_up_200',
    type: 'cultivation',
    name: '金丹真人',
    desc: '修炼达到200级',
    trigger: 'level_up',
    target: 200,
    reward: { spiritStones: 5000, title: '金丹真人' }
  },
  level_up_500: {
    id: 'level_up_500',
    type: 'cultivation',
    name: '元婴老怪',
    desc: '修炼达到500级',
    trigger: 'level_up',
    target: 500,
    reward: { spiritStones: 20000, title: '元婴老怪' }
  },

  // ========== 通关副本类成就 ==========
  chapter_clear_1: {
    id: 'chapter_clear_1',
    type: 'combat',
    name: '初战告捷',
    desc: '通关第1章',
    trigger: 'chapter_clear',
    target: 1,
    reward: { spiritStones: 50, title: '先锋' }
  },
  chapter_clear_5: {
    id: 'chapter_clear_5',
    type: 'combat',
    name: '小试牛刀',
    desc: '通关第5章',
    trigger: 'chapter_clear',
    target: 5,
    reward: { spiritStones: 200 }
  },
  chapter_clear_10: {
    id: 'chapter_clear_10',
    type: 'combat',
    name: '初窥门径',
    desc: '通关第10章',
    trigger: 'chapter_clear',
    target: 10,
    reward: { spiritStones: 500, title: '历练者' }
  },
  chapter_clear_20: {
    id: 'chapter_clear_20',
    type: 'combat',
    name: '登堂入室',
    desc: '通关第20章',
    trigger: 'chapter_clear',
    target: 20,
    reward: { spiritStones: 1500 }
  },
  chapter_clear_30: {
    id: 'chapter_clear_30',
    type: 'combat',
    name: '小有所成',
    desc: '通关第30章',
    trigger: 'chapter_clear',
    target: 30,
    reward: { spiritStones: 3000 }
  },
  chapter_clear_50: {
    id: 'chapter_clear_50',
    type: 'combat',
    name: '登峰造极',
    desc: '通关第50章',
    trigger: 'chapter_clear',
    target: 50,
    reward: { spiritStones: 8000, title: '闯关达人' }
  },
  chapter_clear_100: {
    id: 'chapter_clear_100',
    type: 'combat',
    name: '证道成仙',
    desc: '通关第100章',
    trigger: 'chapter_clear',
    target: 100,
    reward: { spiritStones: 50000, title: '证道者' }
  },

  // ========== 副本通关类成就 ==========
  dungeon_clear_1: {
    id: 'dungeon_clear_1',
    type: 'combat',
    name: '副本先锋',
    desc: '通关1个副本',
    trigger: 'dungeon_clear',
    target: 1,
    reward: { spiritStones: 100 }
  },
  dungeon_clear_10: {
    id: 'dungeon_clear_10',
    type: 'combat',
    name: '副本达人',
    desc: '通关10个副本',
    trigger: 'dungeon_clear',
    target: 10,
    reward: { spiritStones: 1000 }
  },
  dungeon_clear_50: {
    id: 'dungeon_clear_50',
    type: 'combat',
    name: '副本大师',
    desc: '通关50个副本',
    trigger: 'dungeon_clear',
    target: 50,
    reward: { spiritStones: 5000 }
  },

  // ========== 获得装备类成就 ==========
  equipment_obtain_1: {
    id: 'equipment_obtain_1',
    type: 'collection',
    name: '初具装备',
    desc: '获得第1件装备',
    trigger: 'equipment_obtain',
    target: 1,
    reward: { spiritStones: 50 }
  },
  equipment_obtain_10: {
    id: 'equipment_obtain_10',
    type: 'collection',
    name: '装备收藏',
    desc: '拥有10件装备',
    trigger: 'equipment_obtain',
    target: 10,
    reward: { spiritStones: 300 }
  },
  equipment_obtain_50: {
    id: 'equipment_obtain_50',
    type: 'collection',
    name: '装备大师',
    desc: '拥有50件装备',
    trigger: 'equipment_obtain',
    target: 50,
    reward: { spiritStones: 2000 }
  },
  equipment_quality_legendary: {
    id: 'equipment_quality_legendary',
    type: 'collection',
    name: '天人合一',
    desc: '获得第1件传奇品质装备',
    trigger: 'equipment_obtain_legendary',
    target: 1,
    reward: { spiritStones: 5000, title: '鉴宝师' }
  },
  equipment_quality_epic: {
    id: 'equipment_quality_epic',
    type: 'collection',
    name: '慧眼识珠',
    desc: '获得第1件史诗品质装备',
    trigger: 'equipment_obtain_epic',
    target: 1,
    reward: { spiritStones: 1000 }
  },

  // ========== 战斗胜利类成就 ==========
  combat_win_10: {
    id: 'combat_win_10',
    type: 'combat',
    name: '初战告捷',
    desc: '赢得10场战斗',
    trigger: 'combat_win',
    target: 10,
    reward: { spiritStones: 100 }
  },
  combat_win_100: {
    id: 'combat_win_100',
    type: 'combat',
    name: '百战百胜',
    desc: '赢得100场战斗',
    trigger: 'combat_win',
    target: 100,
    reward: { spiritStones: 1000 }
  },
  combat_win_1000: {
    id: 'combat_win_1000',
    type: 'combat',
    name: '千战千胜',
    desc: '赢得1000场战斗',
    trigger: 'combat_win',
    target: 1000,
    reward: { spiritStones: 10000 }
  },

  // ========== 境界突破类成就 ==========
  realm_breakthrough_1: {
    id: 'realm_breakthrough_1',
    type: 'cultivation',
    name: '境界突破',
    desc: '完成第1次境界突破',
    trigger: 'realm_breakthrough',
    target: 1,
    reward: { spiritStones: 200, title: '突破者' }
  },
  realm_breakthrough_5: {
    id: 'realm_breakthrough_5',
    type: 'cultivation',
    name: '境界飞跃',
    desc: '完成5次境界突破',
    trigger: 'realm_breakthrough',
    target: 5,
    reward: { spiritStones: 1500 }
  },
  realm_breakthrough_10: {
    id: 'realm_breakthrough_10',
    type: 'cultivation',
    name: '得道高人',
    desc: '完成10次境界突破',
    trigger: 'realm_breakthrough',
    target: 10,
    reward: { spiritStones: 8000, title: '得道者' }
  }
};

// ==================== 内存存储 ====================
// 用户成就进度 Map: userId -> { achievementId -> { progress, completed, claimed, notified } }
const userAchievementProgress = new Map();

// 待推送通知队列 Map: userId -> [notification]
const notificationQueue = new Map();

// ==================== 核心检测逻辑 ====================

/**
 * 初始化用户成就数据
 */
function initUserAchievements(userId) {
  if (!userAchievementProgress.has(userId)) {
    userAchievementProgress.set(userId, new Map());
  }
  const userData = userAchievementProgress.get(userId);
  for (const [achId, achDef] of Object.entries(ACHIEVEMENT_DEFINITIONS)) {
    if (!userData.has(achId)) {
      userData.set(achId, {
        progress: 0,
        completed: false,
        claimed: false,
        notified: false
      });
    }
  }
  return userData.get(userId);
}

/**
 * 获取用户成就进度
 */
function getUserProgress(userId, achievementId) {
  const userData = userAchievementProgress.get(userId);
  if (!userData) return null;
  return userData.get(achievementId) || null;
}

/**
 * 获取某个触发类型的所有相关成就
 */
function getAchievementsByTrigger(trigger) {
  const result = [];
  for (const [id, def] of Object.entries(ACHIEVEMENT_DEFINITIONS)) {
    if (def.trigger === trigger) {
      result.push(def);
    }
  }
  return result;
}

/**
 * 触发成就检测
 * @param {number} userId - 用户ID
 * @param {string} trigger - 触发类型
 * @param {number} value - 当前值
 * @param {object} extra - 额外数据（如装备品质）
 * @returns {Array} 新达成的成就列表
 */
function triggerAchievement(userId, trigger, value, extra = {}) {
  if (!userId) {
    console.warn('[achievement] triggerAchievement: userId is null/undefined, skipping');
    return [];
  }
  initUserAchievements(userId);
  const userData = userAchievementProgress.get(userId);
  const newlyCompleted = [];

  const achievements = getAchievementsByTrigger(trigger);
  for (const achDef of achievements) {
    const achId = achDef.id;
    const achProgress = userData.get(achId);
    if (!achProgress || achProgress.completed) continue;

    // 更新进度
    if (value >= achProgress.progress) {
      achProgress.progress = value;
    }

    // 检查是否完成
    if (!achProgress.completed && value >= achDef.target) {
      achProgress.completed = true;
      achProgress.completedAt = Date.now();
      newlyCompleted.push({
        ...achDef,
        progress: value,
        reward: achDef.reward
      });

      // 加入通知队列
      enqueueNotification(userId, achDef, value);
    }
  }

  // 自动持久化到 DB
  autoPersist(userId);

  return newlyCompleted;
}

/**
 * 加入通知队列
 */
function enqueueNotification(userId, achievementDef, currentValue) {
  if (!notificationQueue.has(userId)) {
    notificationQueue.set(userId, []);
  }
  const queue = notificationQueue.get(userId);
  const userData = userAchievementProgress.get(userId);
  const achProgress = userData?.get(achievementDef.id);

  // 避免重复通知
  if (achProgress?.notified) return;

  const notification = {
    id: `ach_${achievementDef.id}_${Date.now()}`,
    type: 'achievement',
    achievementId: achievementDef.id,
    achievementName: achievementDef.name,
    achievementDesc: achievementDef.desc,
    achievementType: achievementDef.type,
    reward: achievementDef.reward,
    message: `🎉 成就达成：${achievementDef.name}！${achievementDef.desc}`,
    createdAt: Date.now(),
    read: false
  };

  queue.push(notification);
  if (achProgress) achProgress.notified = true;
}

/**
 * 获取并清除用户通知（推送）
 */
function popNotifications(userId) {
  const queue = notificationQueue.get(userId) || [];
  notificationQueue.set(userId, []);
  return queue;
}

/**
 * 获取用户所有成就进度摘要
 */
function getUserAchievementSummary(userId) {
  initUserAchievements(userId);
  const userData = userAchievementProgress.get(userId);
  const result = [];
  for (const [achId, achDef] of Object.entries(ACHIEVEMENT_DEFINITIONS)) {
    const progress = userData.get(achId);
    result.push({
      id: achId,
      name: achDef.name,
      desc: achDef.desc,
      type: achDef.type,
      trigger: achDef.trigger,
      target: achDef.target,
      progress: progress?.progress || 0,
      completed: progress?.completed || false,
      claimed: progress?.claimed || false,
      notified: progress?.notified || false,
      reward: achDef.reward
    });
  }
  return result;
}

/**
 * 标记成就奖励已领取
 */
function claimAchievement(userId, achievementId) {
  const userData = userAchievementProgress.get(userId);
  if (!userData) return false;
  const progress = userData.get(achievementId);
  if (!progress || !progress.completed) return false;
  progress.claimed = true;
  return true;
}

/**
 * 保存用户成就数据（序列化）
 */
function serializeUserData(userId) {
  const userData = userAchievementProgress.get(userId);
  if (!userData) return null;
  const obj = {};
  for (const [achId, progress] of userData.entries()) {
    obj[achId] = progress;
  }
  return obj;
}

/**
 * 加载用户成就数据（反序列化）
 */
function deserializeUserData(userId, data) {
  if (!data) return;
  const userData = new Map();
  for (const [achId, progress] of Object.entries(data)) {
    userData.set(achId, progress);
  }
  userAchievementProgress.set(userId, userData);
}

// ==================== 便捷触发函数 ====================

/**
 * 触发升级成就
 */
function onLevelUp(userId, newLevel) {
  return triggerAchievement(userId, 'level_up', newLevel);
}

/**
 * 触发通关章节成就
 */
function onChapterClear(userId, chapterId) {
  return triggerAchievement(userId, 'chapter_clear', chapterId);
}

/**
 * 触发通关副本成就
 */
function onDungeonClear(userId, dungeonClearCount) {
  return triggerAchievement(userId, 'dungeon_clear', dungeonClearCount);
}

/**
 * 触发获得装备成就
 */
function onEquipmentObtain(userId, equipmentCount, quality = null) {
  const results = [];
  results.push(...triggerAchievement(userId, 'equipment_obtain', equipmentCount));
  if (quality === 'epic') {
    results.push(...triggerAchievement(userId, 'equipment_obtain_epic', 1));
  } else if (quality === 'legendary') {
    results.push(...triggerAchievement(userId, 'equipment_obtain_legendary', 1));
    results.push(...triggerAchievement(userId, 'equipment_obtain_epic', 1));
  }
  return results;
}

/**
 * 触发战斗胜利成就
 */
function onCombatWin(userId, totalWins) {
  return triggerAchievement(userId, 'combat_win', totalWins);
}

/**
 * 触发境界突破成就
 */
function onRealmBreakthrough(userId, breakthroughCount) {
  return triggerAchievement(userId, 'realm_breakthrough', breakthroughCount);
}

module.exports = {
  ACHIEVEMENT_DEFINITIONS,
  initUserAchievements,
  getUserProgress,
  triggerAchievement,
  popNotifications,
  getUserAchievementSummary,
  claimAchievement,
  serializeUserData,
  deserializeUserData,
  setSaveProgressCallback,
  // 便捷函数
  onLevelUp,
  onChapterClear,
  onDungeonClear,
  onEquipmentObtain,
  onCombatWin,
  onRealmBreakthrough,
  // 直接引用
  userAchievementProgress
};
