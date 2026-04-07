/**
 * 成就殿/名人堂 - 全服里程碑展示系统
 * 
 * 功能：
 * 1. 全服里程碑记录 - 记录每个服务器里程碑时刻
 * 2. 成就广播 - 当玩家达成重要成就时广播全服
 * 3. 成就称号奖励 - 成就完成时自动发放称号
 */

const path = require('path');
const fs = require('fs');

// ==================== 配置 ====================

// 需要广播的成就ID列表（重要成就才广播）
const BROADCAST_ACHIEVEMENTS = [6, 13, 24, 44, 62, 73]; // 渡劫飞升、威震天下、天人合一、证道成仙、充值大户、修仙达人

// 需要发放称号的成就ID映射
const ACHIEVEMENT_TITLE_REWARDS = {
  24: 'achievement_legendary',   // 天人合一 → 获得"天人合一"称号
  90: 'achievement_beginner',   // 初入仙途 → 初学者
  91: 'achievement_cultivator', // 小有所成 → 修士
  92: 'achievement_master',     // 修为精进 → 真人
  93: 'achievement_golden',     // 金丹真人 → 金丹真人
  94: 'achievement_yuanying',   // 元婴老怪 → 元婴老怪
};

// 里程碑类型
const MILESTONE_TYPE = {
  REALM_BREAKTHROUGH: 'realm_breakthrough',     // 境界突破
  CHAPTER_CLEAR: 'chapter_clear',              // 章节通关
  COMBAT_POWER: 'combat_power',                // 战力突破
  DUNGEON_CLEAR: 'dungeon_clear',              // 副本通关
  TITLE_OBTAIN: 'title_obtain',                 // 获得称号
  ACHIEVEMENT_COMPLETE: 'achievement_complete', // 成就完成
  SPEND_MILESTONE: 'spend_milestone',           // 充值里程碑
  LOGIN_MILESTONE: 'login_milestone',           // 登录里程碑
};

// 里程碑稀有度（影响展示优先级）
const MILESTONE_RARITY = {
  COMMON: { level: 1, label: '普通', color: '#888888' },
  UNCOMMON: { level: 2, label: '优秀', color: '#1EFF00' },
  RARE: { level: 3, label: '稀有', color: '#0070DD' },
  EPIC: { level: 4, label: '史诗', color: '#A335EE' },
  LEGENDARY: { level: 5, label: '传说', color: '#FF8000' },
  MYTHIC: { level: 6, label: '神话', color: '#FF0000' },
};

// ==================== 数据存储 ====================

// 全服里程碑记录（内存存储，可持久化到DB）
let serverMilestones = [];
let milestoneIdCounter = 1;

// 成就广播队列
let broadcastQueue = [];

// 数据库路径
const DATA_DIR = path.join(__dirname, '..', 'data');
const MILESTONE_DB_PATH = path.join(DATA_DIR, 'milestones.json');

// ==================== 初始化 ====================

function initAchievementHall() {
  loadMilestonesFromDisk();
  console.log(`[achievement_hall] 初始化完成，已加载 ${serverMilestones.length} 条里程碑记录`);
}

// 从磁盘加载里程碑数据
function loadMilestonesFromDisk() {
  try {
    if (fs.existsSync(MILESTONE_DB_PATH)) {
      const data = fs.readFileSync(MILESTONE_DB_PATH, 'utf8');
      const parsed = JSON.parse(data);
      serverMilestones = parsed.milestones || [];
      milestoneIdCounter = parsed.counter || 1;
      console.log(`[achievement_hall] 从磁盘加载了 ${serverMilestones.length} 条里程碑`);
    }
  } catch (e) {
    console.warn(`[achievement_hall] 加载里程碑失败: ${e.message}`);
    serverMilestones = [];
    milestoneIdCounter = 1;
  }
}

// 保存里程碑到磁盘
function saveMilestonesToDisk() {
  try {
    const data = {
      milestones: serverMilestones.slice(-1000), // 只保留最近1000条
      counter: milestoneIdCounter
    };
    fs.writeFileSync(MILESTONE_DB_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.warn(`[achievement_hall] 保存里程碑失败: ${e.message}`);
  }
}

// ==================== 核心功能 ====================

/**
 * 记录里程碑
 * @param {Object} params - 里程碑参数
 * @returns {Object} 创建的里程碑记录
 */
function recordMilestone({
  userId,
  username,
  playerId,
  type,
  achievementId,
  achievementName,
  achievementDesc,
  value,
  target,
  rarity = 'COMMON',
  title = null,
  titleName = null,
  extra = {}
}) {
  const milestone = {
    id: milestoneIdCounter++,
    userId,
    username: username || `玩家${userId}`,
    playerId: playerId || userId,
    type,
    achievementId,
    achievementName,
    achievementDesc,
    value,
    target,
    rarity,
    title,
    titleName,
    timestamp: Date.now(),
    formattedTime: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
    ...extra
  };

  serverMilestones.push(milestone);

  // 只保留最近500条在内存中
  if (serverMilestones.length > 500) {
    serverMilestones = serverMilestones.slice(-500);
  }

  // 异步保存到磁盘
  setTimeout(() => saveMilestonesToDisk(), 100);

  console.log(`[成就殿] 用户${userId}(${username}) 达成里程碑: ${achievementName} - ${achievementDesc}`);

  return milestone;
}

/**
 * 检查是否需要广播成就
 * @param {number} achievementId - 成就ID
 * @returns {boolean} 是否需要广播
 */
function shouldBroadcast(achievementId) {
  return BROADCAST_ACHIEVEMENTS.includes(achievementId);
}

/**
 * 检查是否需要发放称号
 * @param {number} achievementId - 成就ID
 * @returns {string|null} 称号ID，如果不需发放则返回null
 */
function getTitleReward(achievementId) {
  return ACHIEVEMENT_TITLE_REWARDS[achievementId] || null;
}

/**
 * 获取里程碑稀有度
 * @param {string} type - 里程碑类型
 * @param {number} value - 当前值
 * @param {number} target - 目标值
 * @returns {string} 稀有度级别
 */
function calculateMilestoneRarity(type, value, target) {
  const ratio = value / target;

  switch (type) {
    case MILESTONE_TYPE.REALM_BREAKTHROUGH:
      if (value >= 7) return 'MYTHIC';      // 渡劫期
      if (value >= 5) return 'LEGENDARY';   // 化神期
      if (value >= 3) return 'EPIC';        // 金丹期
      if (value >= 2) return 'RARE';        // 筑基期
      return 'COMMON';

    case MILESTONE_TYPE.CHAPTER_CLEAR:
      if (value >= 100) return 'MYTHIC';
      if (value >= 50) return 'LEGENDARY';
      if (value >= 30) return 'EPIC';
      if (value >= 10) return 'RARE';
      return 'COMMON';

    case MILESTONE_TYPE.COMBAT_POWER:
      if (value >= 100000) return 'MYTHIC';
      if (value >= 50000) return 'LEGENDARY';
      if (value >= 20000) return 'EPIC';
      if (value >= 5000) return 'RARE';
      return 'COMMON';

    case MILESTONE_TYPE.SPEND_MILESTONE:
      if (value >= 1000) return 'MYTHIC';
      if (value >= 500) return 'LEGENDARY';
      if (value >= 100) return 'EPIC';
      return 'RARE';

    case MILESTONE_TYPE.LOGIN_MILESTONE:
      if (value >= 100) return 'MYTHIC';
      if (value >= 30) return 'LEGENDARY';
      if (value >= 7) return 'EPIC';
      return 'COMMON';

    default:
      if (ratio >= 10) return 'LEGENDARY';
      if (ratio >= 5) return 'EPIC';
      if (ratio >= 2) return 'RARE';
      return 'COMMON';
  }
}

/**
 * 创建成就广播消息
 * @param {Object} milestone - 里程碑记录
 * @returns {Object} 广播消息
 */
function createAchievementBroadcast(milestone) {
  const rarityInfo = MILESTONE_RARITY[milestone.rarity] || MILESTONE_RARITY.COMMON;

  // 根据类型生成不同的广播格式
  let messageTemplate = '';
  switch (milestone.type) {
    case MILESTONE_TYPE.REALM_BREAKTHROUGH:
      messageTemplate = `🎉【{username}】突破至【{target}】境界，荣获【{rarity}】成就！`;
      break;
    case MILESTONE_TYPE.CHAPTER_CLEAR:
      messageTemplate = `🎉【{username}】通关第{target}章，荣获【{rarity}】成就！`;
      break;
    case MILESTONE_TYPE.COMBAT_POWER:
      messageTemplate = `💪【{username}】战力突破{target}！荣获【{rarity}】成就！`;
      break;
    case MILESTONE_TYPE.ACHIEVEMENT_COMPLETE:
      messageTemplate = `🏆【{username}】达成成就【{achievementName}】！{achievementDesc}`;
      break;
    default:
      messageTemplate = `🎉【{username}】{achievementDesc}，荣获【{rarity}】成就！`;
  }

  const message = messageTemplate
    .replace('{username}', milestone.username)
    .replace('{target}', milestone.target)
    .replace('{rarity}', rarityInfo.label)
    .replace('{achievementName}', milestone.achievementName || '')
    .replace('{achievementDesc}', milestone.achievementDesc || '');

  return {
    id: `broadcast_${milestone.id}_${Date.now()}`,
    type: 'achievement_broadcast',
    priority: rarityInfo.level >= 4 ? 'high' : 'normal', // 史诗以上为高优先级
    rarity: milestone.rarity,
    rarityColor: rarityInfo.color,
    milestoneId: milestone.id,
    achievementId: milestone.achievementId,
    achievementName: milestone.achievementName,
    achievementDesc: milestone.achievementDesc,
    userId: milestone.userId,
    username: milestone.username,
    message,
    timestamp: Date.now(),
    duration: rarityInfo.level >= 4 ? 10000 : 5000, // 高稀有度显示更久
    read: false
  };
}

/**
 * 添加成就广播到队列
 * @param {Object} milestone - 里程碑记录
 */
function enqueueAchievementBroadcast(milestone) {
  const broadcast = createAchievementBroadcast(milestone);
  broadcastQueue.push(broadcast);
  console.log(`[成就殿] 成就广播已加入队列: ${broadcast.message}`);
}

/**
 * 获取并清除广播队列
 * @returns {Array} 待推送的广播列表
 */
function popBroadcasts() {
  const broadcasts = [...broadcastQueue];
  broadcastQueue = [];
  return broadcasts;
}

/**
 * 获取全服里程碑列表（分页）
 * @param {Object} options - 查询选项
 * @returns {Object} 里程碑列表和统计
 */
function getServerMilestones({
  page = 1,
  pageSize = 20,
  type = null,
  userId = null,
  rarity = null
}) {
  let filtered = [...serverMilestones];

  // 按类型筛选
  if (type) {
    filtered = filtered.filter(m => m.type === type);
  }

  // 按用户筛选
  if (userId) {
    filtered = filtered.filter(m => m.userId === userId);
  }

  // 按稀有度筛选
  if (rarity) {
    filtered = filtered.filter(m => m.rarity === rarity);
  }

  // 按时间倒序
  filtered.sort((a, b) => b.timestamp - a.timestamp);

  // 分页
  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (page - 1) * pageSize;
  const items = filtered.slice(startIndex, startIndex + pageSize);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
    hasMore: page < totalPages
  };
}

/**
 * 获取里程碑统计数据
 * @returns {Object} 统计数据
 */
function getMilestoneStats() {
  const stats = {
    totalMilestones: serverMilestones.length,
    byType: {},
    byRarity: {},
    topUsers: {},
    recentBroadcasts: broadcastQueue.length
  };

  // 统计各类型数量
  for (const m of serverMilestones) {
    stats.byType[m.type] = (stats.byType[m.type] || 0) + 1;
    stats.byRarity[m.rarity] = (stats.byRarity[m.rarity] || 0) + 1;
    stats.topUsers[m.userId] = stats.topUsers[m.userId] || { count: 0, username: m.username };
    stats.topUsers[m.userId].count++;
  }

  // 找出里程碑最多的用户
  const topUsersArray = Object.entries(stats.topUsers)
    .map(([userId, data]) => ({ userId: Number(userId), ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  stats.topUsers = topUsersArray;
  stats.topUsers.total = topUsersArray.length;

  return stats;
}

/**
 * 获取特定玩家的里程碑
 * @param {number} userId - 玩家ID
 * @param {number} limit - 返回数量限制
 * @returns {Array} 玩家的里程碑列表
 */
function getPlayerMilestones(userId, limit = 10) {
  return serverMilestones
    .filter(m => m.userId === userId)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

/**
 * 获取里程碑类型的显示名称
 * @param {string} type - 类型
 * @returns {string} 显示名称
 */
function getMilestoneTypeName(type) {
  const typeNames = {
    [MILESTONE_TYPE.REALM_BREAKTHROUGH]: '境界突破',
    [MILESTONE_TYPE.CHAPTER_CLEAR]: '章节通关',
    [MILESTONE_TYPE.COMBAT_POWER]: '战力突破',
    [MILESTONE_TYPE.DUNGEON_CLEAR]: '副本通关',
    [MILESTONE_TYPE.TITLE_OBTAIN]: '获得称号',
    [MILESTONE_TYPE.ACHIEVEMENT_COMPLETE]: '成就完成',
    [MILESTONE_TYPE.SPEND_MILESTONE]: '充值里程碑',
    [MILESTONE_TYPE.LOGIN_MILESTONE]: '登录里程碑'
  };
  return typeNames[type] || type;
}

// ==================== 导出模块 ====================

module.exports = {
  // 常量
  MILESTONE_TYPE,
  MILESTONE_RARITY,
  BROADCAST_ACHIEVEMENTS,
  ACHIEVEMENT_TITLE_REWARDS,

  // 初始化
  initAchievementHall,
  loadMilestonesFromDisk,
  saveMilestonesToDisk,

  // 核心功能
  recordMilestone,
  shouldBroadcast,
  getTitleReward,
  calculateMilestoneRarity,
  createAchievementBroadcast,
  enqueueAchievementBroadcast,
  popBroadcasts,

  // 查询
  getServerMilestones,
  getMilestoneStats,
  getPlayerMilestones,
  getMilestoneTypeName
};
