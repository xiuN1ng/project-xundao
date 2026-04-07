/**
 * 成就触发服务 - 后端埋点检测
 * 负责在关键事件发生时检测成就达成并推送通知
 *
 * 与 achievementTemplates (achievement.js) 保持 numeric ID 对齐：
 * - cultivation:    IDs 1-6   (realm_breakthrough)
 * - combat:          IDs 10-13(combat_win)
 * - equipment:       IDs 20-22(equipment_obtain)
 * - chapter:         IDs 40-44(chapter_clear)
 * - dungeon_clear:    IDs 80-82(dungeon_clear)
 * - equipment_quality: ID 23 (epic), ID 24 (legendary)
 * - level_up:         IDs 90-94 (level_up)
 */

// 成就殿/名人堂模块（可选加载）
let achievementHall = null;
try {
  achievementHall = require('./achievement_hall');
  achievementHall.initAchievementHall();
  console.log('[achievement] 成就殿/名人堂模块加载成功');
} catch (e) {
  console.warn('[achievement] 成就殿/名人堂模块加载失败:', e.message);
}

// 持久化回调（由 achievement.js 注册 saveAchievementToDB）
let saveProgressCallback = null;
function setSaveProgressCallback(fn) { saveProgressCallback = fn; }

// 每次进度更新后自动持久化
function autoPersist(userId) {
  if (!saveProgressCallback) {
    console.warn(`[achievement] autoPersist: saveProgressCallback not set for user ${userId}, skipping persist`);
    return;
  }
  const userData = userAchievementProgress.get(userId);
  if (!userData) return;
  let savedCount = 0;
  for (const [achId, achProgress] of userData) {
    saveProgressCallback(userId, Number(achId), achProgress.progress, achProgress.completed, achProgress.claimed);
    savedCount++;
  }
  console.log(`[achievement] autoPersist: saved ${savedCount} achievements for user ${userId}`);
}

// ==================== 触发器 → 成就ID映射 ====================
// trigger name → [{ id: numericId, target: threshold, name, desc, reward, type }]
// 与 achievementTemplates (achievement.js) 的 numeric ID 保持完全一致
const TRIGGER_MAP = {
  // 境界突破 (cultivation category, IDs 1-6)
  realm_breakthrough: [
    { id: 1,  target: 2,  name: '初入修仙',   desc: '达到练气期',     target_realm: 2,  reward: { diamonds: 10 },    icon: '🧘', type: 'cultivation' },
    { id: 2,  target: 3,  name: '筑基成功',   desc: '达到筑基期',     target_realm: 3,  reward: { diamonds: 50 },    icon: '🧘', type: 'cultivation' },
    { id: 3,  target: 4,  name: '金丹大道',   desc: '达到金丹期',     target_realm: 4,  reward: { diamonds: 100 },   icon: '🧘', type: 'cultivation' },
    { id: 4,  target: 5,  name: '元婴期',     desc: '达到元婴期',     target_realm: 5,  reward: { diamonds: 200 },   icon: '🧘', type: 'cultivation' },
    { id: 5,  target: 6,  name: '化神期',     desc: '达到化神期',     target_realm: 6,  reward: { diamonds: 500 },   icon: '🧘', type: 'cultivation' },
    { id: 6,  target: 7,  name: '渡劫飞升',   desc: '达到渡劫期',     target_realm: 7,  reward: { diamonds: 1000 },  icon: '🧘', type: 'cultivation' },
  ],

  // 战力成就 (combat category, IDs 10-13)
  combat_win: [
    { id: 10, target: 1000,  name: '初战告捷',   desc: '战力达到1000',   reward: { lingshi: 100 },   icon: '⚔️', type: 'combat' },
    { id: 11, target: 5000,  name: '小有名气',   desc: '战力达到5000',   reward: { lingshi: 500 },   icon: '⚔️', type: 'combat' },
    { id: 12, target: 20000, name: '一方强者',   desc: '战力达到20000',  reward: { lingshi: 2000 },  icon: '⚔️', type: 'combat' },
    { id: 13, target: 100000,name: '威震天下',   desc: '战力达到100000', reward: { lingshi: 10000 }, icon: '⚔️', type: 'combat' },
  ],

  // 装备强化 (equipment category, IDs 20-22)
  equipment_obtain: [
    { id: 20, target: 5,  name: '初具装备',   desc: '强化装备到+5',   reward: { diamonds: 20 },  icon: '🗡️', type: 'equipment' },
    { id: 21, target: 10, name: '装备小成',   desc: '强化装备到+10',  reward: { diamonds: 50 },  icon: '🗡️', type: 'equipment' },
    { id: 22, target: 15, name: '装备大成',   desc: '强化装备到+15',  reward: { diamonds: 100 }, icon: '🗡️', type: 'equipment' },
  ],

  // 装备品质 (equipment quality, IDs 23-24)
  equipment_obtain_epic: [
    { id: 23, target: 1, name: '慧眼识珠',  desc: '获得第1件史诗品质装备', reward: { spiritStones: 1000 }, icon: '🗡️', type: 'equipment' },
  ],
  equipment_obtain_legendary: [
    { id: 24, target: 1, name: '天人合一',  desc: '获得第1件传奇品质装备', reward: { spiritStones: 5000, title: '鉴宝师' }, icon: '🗡️', type: 'equipment' },
  ],

  // 灵兽 (beast category, IDs 30-32)
  beast_obtain: [
    { id: 30, target: 1, name: '捕获灵兽',   desc: '拥有1只灵兽',    reward: { diamonds: 10 },  icon: '🦊', type: 'beast' },
    { id: 31, target: 5, name: '灵兽伙伴',   desc: '拥有5只灵兽',    reward: { diamonds: 50 },  icon: '🦊', type: 'beast' },
    { id: 32, target: 1, name: '神兽环绕',   desc: '拥有神兽',       reward: { diamonds: 100 }, icon: '🦊', type: 'beast' },
  ],

  // 章节通关 (chapter category, IDs 40-44)
  chapter_clear: [
    { id: 40, target: 5,  name: '初窥门径',   desc: '通关第5章',    reward: { lingshi: 100 },   icon: '📖', type: 'chapter' },
    { id: 41, target: 10, name: '小有所成',   desc: '通关第10章',   reward: { lingshi: 500 },   icon: '📖', type: 'chapter' },
    { id: 42, target: 30, name: '登堂入室',   desc: '通关第30章',   reward: { lingshi: 2000 },  icon: '📖', type: 'chapter' },
    { id: 43, target: 50, name: '登峰造极',   desc: '通关第50章',   reward: { lingshi: 5000 },  icon: '📖', type: 'chapter' },
    { id: 44, target: 100,name: '证道成仙',   desc: '通关第100章',  reward: { diamonds: 1000 }, icon: '📖', type: 'chapter' },
  ],

  // 副本通关 (IDs 80-82)
  dungeon_clear: [
    { id: 80, target: 1,  name: '副本先锋',  desc: '通关1个副本',   reward: { spiritStones: 100 },  icon: '🏰', type: 'combat' },
    { id: 81, target: 10, name: '副本达人',  desc: '通关10个副本',  reward: { spiritStones: 1000 }, icon: '🏰', type: 'combat' },
    { id: 82, target: 50, name: '副本大师',  desc: '通关50个副本',  reward: { spiritStones: 5000 }, icon: '🏰', type: 'combat' },
  ],

  // 社交 (social category, IDs 50-52)
  friend_add: [
    { id: 50, target: 5,  name: '结交朋友',  desc: '拥有5个好友',   reward: { lingshi: 50 },   icon: '👥', type: 'social' },
    { id: 51, target: 20, name: '人脉广泛',  desc: '拥有20个好友',  reward: { lingshi: 200 },  icon: '👥', type: 'social' },
    { id: 52, target: 1,  name: '加入仙盟',  desc: '加入仙盟',      reward: { diamonds: 20 }, icon: '🏛️', type: 'social' },
  ],

  // 充值 (spend category, IDs 60-62)
  spend: [
    { id: 60, target: 1,   name: '初次充值',  desc: '首次充值任意金额', reward: { diamonds: 10 },  icon: '💎', type: 'spend' },
    { id: 61, target: 100, name: '累计充值',  desc: '累计充值100元',   reward: { diamonds: 100 }, icon: '💎', type: 'spend' },
    { id: 62, target: 1000,name: '充值大户',  desc: '累计充值1000元', reward: { diamonds: 1000 }, icon: '💎', type: 'spend' },
  ],

  // 每日登录 (online category, IDs 70-73)
  login: [
    { id: 70, target: 1,   name: '每日登录',   desc: '累计登录1天',   reward: { lingshi: 10 },    icon: '📅', type: 'online' },
    { id: 71, target: 7,   name: '持续修炼',   desc: '累计登录7天',   reward: { diamonds: 50 },  icon: '📅', type: 'online' },
    { id: 72, target: 30,  name: '持之以恒',   desc: '累计登录30天',  reward: { diamonds: 200 }, icon: '📅', type: 'online' },
    { id: 73, target: 100, name: '修仙达人',   desc: '累计登录100天', reward: { diamonds: 1000 }, icon: '📅', type: 'online' },
  ],

  // 升级 (level_up category, IDs 90-94) — 修炼等级
  level_up: [
    { id: 90, target: 10,  name: '初入仙途',   desc: '修炼达到10级',  reward: { spiritStones: 100, title: '初学者' }, icon: '⬆️', type: 'cultivation' },
    { id: 91, target: 50,  name: '小有所成',   desc: '修炼达到50级',  reward: { spiritStones: 500, title: '修士' },    icon: '⬆️', type: 'cultivation' },
    { id: 92, target: 100, name: '修为精进',   desc: '修炼达到100级', reward: { spiritStones: 2000, title: '真人' },  icon: '⬆️', type: 'cultivation' },
    { id: 93, target: 200, name: '金丹真人',   desc: '修炼达到200级', reward: { spiritStones: 5000, title: '金丹真人' }, icon: '⬆️', type: 'cultivation' },
    { id: 94, target: 500, name: '元婴老怪',   desc: '修炼达到500级', reward: { spiritStones: 20000, title: '元婴老怪' }, icon: '⬆️', type: 'cultivation' },
  ],
};

// 构建反向索引: numericId → achievement def
const ACHIEVEMENT_DEFINITIONS = {};
for (const [trigger, achievements] of Object.entries(TRIGGER_MAP)) {
  for (const ach of achievements) {
    ach.trigger = trigger;
    ACHIEVEMENT_DEFINITIONS[ach.id] = ach;
  }
}

// ==================== 内存存储 ====================
// 用户成就进度 Map: userId -> { numericId -> { progress, completed, claimed, notified } }
const userAchievementProgress = new Map();

// 待推送通知队列 Map: userId -> [notification]
const notificationQueue = new Map();

// ==================== 核心检测逻辑 ====================

/**
 * 初始化用户成就数据（所有 numeric ID）
 * 注意：只初始化不存在的成就，保留已有的 in-memory 进度（避免覆盖已完成的成就）
 */
function initUserAchievements(userId) {
  if (!userAchievementProgress.has(userId)) {
    userAchievementProgress.set(userId, new Map());
  }
  const userData = userAchievementProgress.get(userId);
  for (const [achId, achDef] of Object.entries(ACHIEVEMENT_DEFINITIONS)) {
    if (!userData.has(Number(achId))) {
      userData.set(Number(achId), {
        progress: 0,
        completed: false,
        claimed: false,
        notified: false
      });
    }
  }
  console.log(`[achievement] initUserAchievements: user ${userId}, ${userData.size} achievements loaded (preserving existing progress)`);
  return userData.get(userId);
}

/**
 * 从外部（如 achievement.js DB加载结果）加载已有进度到 trigger service
 * 解决服务器重启后 in-memory 数据丢失问题
 */
function loadUserProgressFromExternal(userId, externalData) {
  if (!userAchievementProgress.has(userId)) {
    userAchievementProgress.set(userId, new Map());
  }
  const userData = userAchievementProgress.get(userId);
  if (!externalData) return;
  for (const [achIdStr, achData] of Object.entries(externalData)) {
    const achId = Number(achIdStr);
    if (userData.has(achId)) {
      // 合并：保留 in-memory 中更"完成"的状态
      const existing = userData.get(achId);
      if (achData.completed && !existing.completed) {
        existing.completed = achData.completed;
        existing.progress = achData.progress;
      }
      if (achData.claimed && !existing.claimed) {
        existing.claimed = achData.claimed;
      }
    } else {
      userData.set(achId, {
        progress: achData.progress || 0,
        completed: !!achData.completed,
        claimed: !!achData.claimed,
        notified: !!achData.notified
      });
    }
  }
  console.log(`[achievement] loadUserProgressFromExternal: user ${userId}, merged external data (${Object.keys(externalData).length} entries)`);
}

/**
 * 获取用户某个成就的进度
 */
function getUserProgress(userId, achievementId) {
  const userData = userAchievementProgress.get(userId);
  if (!userData) return null;
  return userData.get(Number(achievementId)) || null;
}

/**
 * 获取某个触发类型的所有相关成就定义
 */
function getAchievementsByTrigger(trigger) {
  return TRIGGER_MAP[trigger] || [];
}

/**
 * 触发成就检测
 * @param {number} userId - 用户ID
 * @param {string} trigger - 触发类型（如 'realm_breakthrough', 'chapter_clear'）
 * @param {number} value - 当前值（境界等级 / 战力 / 通关章节 等）
 * @param {object} extra - 额外数据
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
  console.log(`[achievement] triggerAchievement: user=${userId}, trigger=${trigger}, value=${value}, achievements=${achievements.length}`);
  for (const achDef of achievements) {
    const numericId = achDef.id;
    const achProgress = userData.get(numericId);
    if (!achProgress || achProgress.completed) continue;

    // realm_breakthrough: value 是境界等级，直接与 target_realm 比较
    // chapter_clear/combat_win/level_up: value 直接与 target 比较
    const threshold = (achDef.target_realm !== undefined) ? achDef.target_realm : achDef.target;
    if (value >= threshold) {
      achProgress.progress = value;
    }

    // 检查是否完成（首次达到阈值）
    if (!achProgress.completed && value >= threshold) {
      achProgress.completed = true;
      achProgress.completedAt = Date.now();
      const completedAch = {
        id: numericId,
        name: achDef.name,
        desc: achDef.desc,
        type: achDef.type,
        trigger: trigger,
        target: achDef.target,
        target_realm: achDef.target_realm,
        progress: value,
        reward: achDef.reward,
        icon: achDef.icon
      };
      newlyCompleted.push(completedAch);

      // 加入通知队列
      enqueueNotification(userId, numericId, achDef.name, achDef.desc, trigger, achDef.reward);

      // ==================== 成就殿/名人堂集成 ====================
      if (achievementHall) {
        // 记录里程碑
        const rarity = achievementHall.calculateMilestoneRarity(
          getMilestoneTypeFromTrigger(trigger),
          value,
          threshold
        );
        const titleReward = achievementHall.getTitleReward(numericId);
        
        achievementHall.recordMilestone({
          userId,
          username: extra.username || `玩家${userId}`,
          type: getMilestoneTypeFromTrigger(trigger),
          achievementId: numericId,
          achievementName: achDef.name,
          achievementDesc: achDef.desc,
          value,
          target: threshold,
          rarity,
          title: titleReward,
          titleName: titleReward ? getTitleName(titleReward) : null,
          extra
        });

        // 如果需要广播，加入广播队列
        if (achievementHall.shouldBroadcast(numericId)) {
          const milestone = {
            userId,
            username: extra.username || `玩家${userId}`,
            type: getMilestoneTypeFromTrigger(trigger),
            achievementId: numericId,
            achievementName: achDef.name,
            achievementDesc: achDef.desc,
            value,
            target: threshold,
            rarity
          };
          achievementHall.enqueueAchievementBroadcast(milestone);
        }
      }
    }
  }

  // 自动持久化到 DB
  autoPersist(userId);

  return newlyCompleted;
}

/**
 * 根据trigger类型获取里程碑类型
 */
function getMilestoneTypeFromTrigger(trigger) {
  const typeMap = {
    'realm_breakthrough': 'realm_breakthrough',
    'chapter_clear': 'chapter_clear',
    'combat_win': 'combat_power',
    'dungeon_clear': 'dungeon_clear',
    'level_up': 'achievement_complete',
    'login': 'login_milestone',
    'spend': 'spend_milestone',
    'friend_add': 'achievement_complete',
    'equipment_obtain': 'achievement_complete',
    'equipment_obtain_epic': 'achievement_complete',
    'equipment_obtain_legendary': 'achievement_complete',
    'beast_obtain': 'achievement_complete'
  };
  return typeMap[trigger] || 'achievement_complete';
}

/**
 * 根据称号ID获取称号名称
 */
function getTitleName(titleId) {
  const titleNames = {
    'achievement_beginner': '初学者',
    'achievement_cultivator': '修士',
    'achievement_master': '真人',
    'achievement_golden': '金丹真人',
    'achievement_yuanying': '元婴老怪',
    'achievement_legendary': '天人合一'
  };
  return titleNames[titleId] || titleId;
}

/**
 * 加入通知队列
 */
function enqueueNotification(userId, achievementId, achievementName, achievementDesc, achievementType, reward) {
  if (!notificationQueue.has(userId)) {
    notificationQueue.set(userId, []);
  }
  const queue = notificationQueue.get(userId);
  const userData = userAchievementProgress.get(userId);
  const achProgress = userData?.get(Number(achievementId));

  // 避免重复通知
  if (achProgress?.notified) return;

  const notification = {
    id: `ach_${achievementId}_${Date.now()}`,
    type: 'achievement',
    achievementId: Number(achievementId),
    achievementName,
    achievementDesc,
    achievementType,
    reward,
    message: `🎉 成就达成：${achievementName}！${achievementDesc}`,
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
    const numericId = Number(achId);
    const progress = userData.get(numericId);
    result.push({
      id: numericId,
      name: achDef.name,
      desc: achDef.desc,
      type: achDef.type,
      trigger: achDef.trigger,
      target: achDef.target,
      target_realm: achDef.target_realm,
      progress: progress?.progress || 0,
      completed: progress?.completed || false,
      claimed: progress?.claimed || false,
      notified: progress?.notified || false,
      reward: achDef.reward,
      icon: achDef.icon
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
  const progress = userData.get(Number(achievementId));
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
    userData.set(Number(achId), progress);
  }
  userAchievementProgress.set(userId, userData);
}

// ==================== 便捷触发函数 ====================

/**
 * 触发升级成就
 * @param {number} userId
 * @param {number} newLevel - 修炼等级（来自 Users.level）
 */
function onLevelUp(userId, newLevel) {
  return triggerAchievement(userId, 'level_up', newLevel);
}

/**
 * 触发通关章节成就
 * @param {number} userId
 * @param {number} chapterId - 已通关的最高章节ID
 */
function onChapterClear(userId, chapterId) {
  return triggerAchievement(userId, 'chapter_clear', chapterId);
}

/**
 * 触发通关副本成就
 * @param {number} userId
 * @param {number} dungeonClearCount - 已通关副本总次数
 */
function onDungeonClear(userId, dungeonClearCount) {
  return triggerAchievement(userId, 'dungeon_clear', dungeonClearCount);
}

/**
 * 触发获得装备成就
 * @param {number} userId
 * @param {number} equipmentCount - 已拥有装备数量
 * @param {string|null} quality - 装备品质 'epic' | 'legendary' | null
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
 * @param {number} userId
 * @param {number} combatPower - 当前战力
 */
function onCombatWin(userId, combatPower) {
  return triggerAchievement(userId, 'combat_win', combatPower);
}

/**
 * 触发境界突破成就
 * @param {number} userId
 * @param {number} realm - 突破后的境界等级（1=练气, 2=筑基, ...）
 */
function onRealmBreakthrough(userId, realm) {
  return triggerAchievement(userId, 'realm_breakthrough', realm);
}

module.exports = {
  ACHIEVEMENT_DEFINITIONS,
  TRIGGER_MAP,
  initUserAchievements,
  loadUserProgressFromExternal,
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
  userAchievementProgress,
  // 成就殿/名人堂集成
  getAchievementHall: () => achievementHall,
  popAchievementBroadcasts: () => achievementHall ? achievementHall.popBroadcasts() : []
};
