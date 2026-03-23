/**
 * 转盘任务与任务共享系统 v21
 * 包含：转盘任务系统、任务共享系统
 */

// ============ 转盘任务配置 ============
export const WHEEL_TASK_CONFIG = {
  // 转盘类型
  wheelTypes: {
    DAILY: 1,     // 每日转盘
    WEEKLY: 2,    // 每周转盘
    VIP: 3,       // VIP转盘
    SPECIAL: 4,   // special活动转盘
  },

  // 免费转盘次数
  freeSpins: {
    1: 1,    // 每日1次
    2: 1,    // 每周1次
    3: 0,    // VIP需要VIP次数
    4: 0,    // 活动转盘需要活动次数
  },

  // VIP免费转盘次数
  vipFreeSpins: {
    1: 1,
    2: 1,
    3: 2,
    4: 3,
    5: 3,
    6: 4,
    7: 5,
    8: 5,
    9: 6,
    10: 10,
  },

  // 转盘配置
  wheelConfig: {
    segments: 8,          // 转盘格子数
    spinDuration: 5000,    // 转动时间 (毫秒)
    minSpins: 3,          // 最小转动圈数
    maxSpins: 5,          // 最大转动圈数
  },

  // 奖励配置
  rewardTypes: {
    GOLD: 1,              // 金币
    EXP: 2,               // 经验
    ITEM: 3,              // 道具
    POINTS: 4,            // 积分
    TITLE: 5,             // 称号
    SKIN: 6,              // 皮肤
    PET: 7,               // 宠物
    EQUIP: 8,             // 装备
  },

  // 权重配置
  weightConfig: {
    common: 50,     // 常见
    rare: 30,       // 稀有
    epic: 15,       // 史诗
    legendary: 5,   // 传说
  },
};

// ============ 转盘任务奖励模板 ============
export const WHEEL_TASK_REWARDS = {
  [WHEEL_TASK_CONFIG.wheelTypes.DAILY]: [
    { id: 'gold_1000', name: '金币x1000', type: 1, minAmount: 1000, maxAmount: 5000, weight: 30, rarity: 'common' },
    { id: 'gold_5000', name: '金币x5000', type: 1, minAmount: 5000, maxAmount: 10000, weight: 15, rarity: 'rare' },
    { id: 'gold_10000', name: '金币x10000', type: 1, minAmount: 10000, maxAmount: 20000, weight: 5, rarity: 'epic' },
    { id: 'exp_100', name: '经验x100', type: 2, minAmount: 100, maxAmount: 500, weight: 25, rarity: 'common' },
    { id: 'exp_500', name: '经验x500', type: 2, minAmount: 500, maxAmount: 1000, weight: 10, rarity: 'rare' },
    { id: 'spirit_stone', name: '灵石x10', type: 3, minAmount: 10, maxAmount: 50, weight: 8, rarity: 'rare' },
    { id: 'rare_box', name: '稀有宝箱', type: 3, minAmount: 1, maxAmount: 1, weight: 3, rarity: 'epic' },
    { id: 'legendary_box', name: '传说宝箱', type: 3, minAmount: 1, maxAmount: 1, weight: 1, rarity: 'legendary' },
    { id: 'arena_points_10', name: '竞技场积分x10', type: 4, minAmount: 10, maxAmount: 50, weight: 3, rarity: 'rare' },
  ],
  [WHEEL_TASK_CONFIG.wheelTypes.WEEKLY]: [
    { id: 'gold_10000', name: '金币x10000', type: 1, minAmount: 10000, maxAmount: 50000, weight: 25, rarity: 'common' },
    { id: 'gold_50000', name: '金币x50000', type: 1, minAmount: 50000, maxAmount: 100000, weight: 10, rarity: 'rare' },
    { id: 'exp_1000', name: '经验x1000', type: 2, minAmount: 1000, maxAmount: 5000, weight: 20, rarity: 'common' },
    { id: 'exp_5000', name: '经验x5000', type: 2, minAmount: 5000, maxAmount: 10000, weight: 10, rarity: 'rare' },
    { id: 'rare_material', name: '稀有材料', type: 3, minAmount: 1, maxAmount: 3, weight: 10, rarity: 'rare' },
    { id: 'epic_material', name: '史诗材料', type: 3, minAmount: 1, maxAmount: 2, weight: 5, rarity: 'epic' },
    { id: 'skill_book', name: '技能书', type: 3, minAmount: 1, maxAmount: 2, weight: 5, rarity: 'rare' },
    { id: 'legendary_equip', name: '传说装备', type: 8, minAmount: 1, maxAmount: 1, weight: 2, rarity: 'legendary' },
  ],
  [WHEEL_TASK_CONFIG.wheelTypes.VIP]: [
    { id: 'vip_chest', name: 'VIP宝箱', type: 3, minAmount: 1, maxAmount: 3, weight: 20, rarity: 'common' },
    { id: 'epic_equip', name: '史诗装备', type: 8, minAmount: 1, maxAmount: 1, weight: 15, rarity: 'rare' },
    { id: 'legendary_equip', name: '传说装备', type: 8, minAmount: 1, maxAmount: 1, weight: 5, rarity: 'epic' },
    { id: 'legendary_box', name: '传说宝箱', type: 3, minAmount: 1, maxAmount: 2, weight: 3, rarity: 'legendary' },
    { id: 'pet_egg', name: '宠物蛋', type: 7, minAmount: 1, maxAmount: 1, weight: 2, rarity: 'legendary' },
    { id: 'fashion', name: '时装', type: 6, minAmount: 1, maxAmount: 1, weight: 3, rarity: 'epic' },
    { id: 'awaken_material', name: '觉醒材料', type: 3, minAmount: 5, maxAmount: 10, weight: 10, rarity: 'rare' },
  ],
  [WHEEL_TASK_CONFIG.wheelTypes.SPECIAL]: [
    { id: 'special_title', name: '专属称号', type: 5, minAmount: 1, maxAmount: 1, weight: 1, rarity: 'legendary' },
    { id: 'special_skin', name: '专属皮肤', type: 6, minAmount: 1, maxAmount: 1, weight: 1, rarity: 'legendary' },
    { id: 'special_pet', name: '专属宠物', type: 7, minAmount: 1, maxAmount: 1, weight: 1, rarity: 'legendary' },
    { id: 'legendary_equip', name: '传说装备', type: 8, minAmount: 1, maxAmount: 2, weight: 5, rarity: 'epic' },
    { id: 'epic_equip', name: '史诗装备', type: 8, minAmount: 1, maxAmount: 2, weight: 10, rarity: 'rare' },
    { id: 'rare_equip', name: '稀有装备', type: 8, minAmount: 1, maxAmount: 3, weight: 15, rarity: 'common' },
    { id: 'huge_gold', name: '巨额金币', type: 1, minAmount: 100000, maxAmount: 500000, weight: 10, rarity: 'rare' },
    { id: 'huge_exp', name: '巨额经验', type: 2, minAmount: 50000, maxAmount: 100000, weight: 10, rarity: 'rare' },
  ],
};

// ============ 任务共享配置 ============
export const TASK_SHARE_CONFIG = {
  // 共享类型
  shareTypes: {
    DAILY: 1,     // 每日任务共享
    WEEKLY: 2,    // 每周任务共享
    ACHIEVEMENT: 3, // 成就任务共享
    SPECIAL: 4,   // 特殊任务共享
  },

  // 共享设置
  shareSettings: {
    // 最大共享任务数
    maxSharedTasks: 5,
    // 共享任务冷却 (毫秒)
    shareCooldown: 30 * 60 * 1000, // 30分钟
    // 接受任务冷却
    acceptCooldown: 10 * 60 * 1000, // 10分钟
    // 每日共享次数限制
    dailyShareLimit: 10,
    // 每日接受任务次数限制
    dailyAcceptLimit: 20,
    // 共享有效期 (毫秒)
    shareExpireTime: 2 * 60 * 60 * 1000, // 2小时
  },

  // 任务来源限制
  sourceLimits: {
    // 可接受好友的任务
    friend: true,
    // 可接受公会成员的任务
    guild: true,
    // 可接受师徒的任务
    masterDisciple: true,
    // 可接受仙侣的任务
    couple: true,
    // 可接受结义兄弟的任务
    sworn: true,
  },

  // 奖励加成
  rewardBonuses: {
    // 完成自己任务的奖励
    ownTask: 100, // 100%
    // 完成共享任务的奖励 (额外加成)
    sharedTask: 50, // +50%
    // 首次完成共享任务奖励
    firstSharedBonus: 100,
    // 共享者获得奖励 (被完成时)
    sharerBonus: 20, // 20%
  },

  // 任务类型
  taskTypes: {
    BATTLE: 1,      // 战斗任务
    COLLECT: 2,     // 收集任务
    TALK: 3,        // 对话任务
    EXPLORE: 4,     // 探索任务
    CRAFT: 5,       // 制作任务
    TRADE: 6,       // 交易任务
    SOCIAL: 7,      // 社交任务
    DUNGEON: 8,     // 副本任务
  },
};

// ============ 可共享的任务模板 ============
export const SHAREABLE_TASKS = [
  { id: 'battle_10_enemies', name: '击败10个敌人', type: 1, target: 10, exp: 100, gold: 100, minLevel: 1, shareable: true },
  { id: 'battle_50_enemies', name: '击败50个敌人', type: 1, target: 50, exp: 500, gold: 500, minLevel: 5, shareable: true },
  { id: 'battle_100_enemies', name: '击败100个敌人', type: 1, target: 100, exp: 1000, gold: 1000, minLevel: 10, shareable: true },
  { id: 'collect_10_herbs', name: '采集10份草药', type: 2, target: 10, exp: 80, gold: 80, minLevel: 1, shareable: true },
  { id: 'collect_50_ores', name: '采集50份矿石', type: 2, target: 50, exp: 400, gold: 400, minLevel: 5, shareable: true },
  { id: 'talk_5_npcs', name: '与5个NPC对话', type: 3, target: 5, exp: 50, gold: 50, minLevel: 1, shareable: true },
  { id: 'explore_3_areas', name: '探索3个区域', type: 4, target: 3, exp: 150, gold: 150, minLevel: 3, shareable: true },
  { id: 'craft_5_items', name: '制作5件物品', type: 5, target: 5, exp: 200, gold: 200, minLevel: 5, shareable: true },
  { id: 'trade_10_items', name: '交易10次', type: 6, target: 10, exp: 100, gold: 100, minLevel: 1, shareable: true },
  { id: 'add_5_friends', name: '添加5个好友', type: 7, target: 5, exp: 150, gold: 150, minLevel: 3, shareable: true },
  { id: 'complete_3_dungeons', name: '完成3次副本', type: 8, target: 3, exp: 300, gold: 300, minLevel: 5, shareable: true },
  { id: 'complete_10_dungeons', name: '完成10次副本', type: 8, target: 10, exp: 1000, gold: 1000, minLevel: 10, shareable: true },
];

// ============ 转盘任务类 ============
interface WheelSpinResult {
  wheelType: number;
  rewards: Array<{
    id: string;
    name: string;
    amount: number;
    type: number;
    rarity: string;
  }>;
  isFree: boolean;
  nextFreeTime?: number;
}

interface PlayerWheelData {
  playerId: string;
  wheelType: number;
  todaySpins: number;
  totalSpins: number;
  lastSpinTime: number;
  wheelSegments: Array<{
    id: string;
    name: string;
    type: number;
    minAmount: number;
    maxAmount: number;
    weight: number;
    rarity: string;
  }>;
}

export class WheelTaskSystem {
  private playerWheelData: Map<string, PlayerWheelData> = new Map();

  /**
   * 获取玩家转盘数据
   */
  getWheelData(playerId: string, wheelType: number, vipLevel: number = 0): PlayerWheelData {
    const key = `${playerId}_${wheelType}`;
    let data = this.playerWheelData.get(key);

    if (!data) {
      data = {
        playerId,
        wheelType,
        todaySpins: 0,
        totalSpins: 0,
        lastSpinTime: 0,
        wheelSegments: [],
      };
      this.generateWheelSegments(data);
      this.playerWheelData.set(key, data);
    }

    // 检查日期重置每日次数
    const now = new Date();
    const lastSpin = new Date(data.lastSpinTime);
    if (now.getDate() !== lastSpin.getDate() || now.getMonth() !== lastSpin.getMonth()) {
      data.todaySpins = 0;
    }

    return data;
  }

  /**
   * 生成转盘 segments
   */
  private generateWheelSegments(data: PlayerWheelData): void {
    const rewards = WHEEL_TASK_REWARDS[data.wheelType as keyof typeof WHEEL_TASK_REWARDS];
    if (!rewards) return;

    // 使用加权随机选择
    const segments = [];
    const segmentCount = WHEEL_TASK_CONFIG.wheelConfig.segments;
    
    // 按权重计算总权重
    const totalWeight = rewards.reduce((sum, r) => sum + r.weight, 0);

    for (let i = 0; i < segmentCount; i++) {
      let random = Math.random() * totalWeight;
      for (const reward of rewards) {
        random -= reward.weight;
        if (random <= 0) {
          segments.push({ ...reward });
          break;
        }
      }
    }

    // 确保不重复
    if (segments.length < segmentCount) {
      while (segments.length < segmentCount) {
        segments.push(rewards[Math.floor(Math.random() * rewards.length)]);
      }
    }

    data.wheelSegments = segments;
  }

  /**
   * 获取免费转盘次数
   */
  getFreeSpinCount(playerId: string, wheelType: number, vipLevel: number = 0): { count: number; nextFreeTime?: number } {
    const data = this.getWheelData(playerId, wheelType, vipLevel);
    
    const freeSpins = WHEEL_TASK_CONFIG.freeSpins[wheelType as keyof typeof WHEEL_TASK_CONFIG.freeSpins] || 0;
    const vipBonus = WHEEL_TASK_CONFIG.vipFreeSpins[vipLevel as keyof typeof WHEEL_TASK_CONFIG.vipFreeSpins] || 0;
    const totalFree = freeSpins + vipBonus;

    const usedSpins = data.todaySpins;
    const remainingSpins = Math.max(0, totalFree - usedSpins);

    return { count: remainingSpins };
  }

  /**
   * 执行转盘
   */
  spinWheel(playerId: string, wheelType: number, vipLevel: number = 0, cost: number = 0): { success: boolean; result?: WheelSpinResult; error?: string } {
    const data = this.getWheelData(playerId, wheelType, vipLevel);
    
    // 检查免费次数
    const freeSpinInfo = this.getFreeSpinCount(playerId, wheelType, vipLevel);
    let isFree = false;
    let useCost = cost;

    if (freeSpinInfo.count > 0) {
      isFree = true;
      useCost = 0;
    } else if (cost <= 0) {
      return { success: false, error: '转盘次数已用完' };
    }

    // 检查元宝
    if (useCost > 0) {
      // 实际检查玩家元宝
    }

    // 执行转盘
    const segmentIndex = Math.floor(Math.random() * data.wheelSegments.length);
    const segment = data.wheelSegments[segmentIndex];

    // 计算实际奖励数量
    const amount = Math.floor(
      segment.minAmount + Math.random() * (segment.maxAmount - segment.minAmount + 1)
    );

    // 更新数据
    data.todaySpins++;
    data.totalSpins++;
    data.lastSpinTime = Date.now();

    // 定期刷新转盘 segments (每10次刷新)
    if (data.totalSpins % 10 === 0) {
      this.generateWheelSegments(data);
    }

    const result: WheelSpinResult = {
      wheelType,
      rewards: [{
        id: segment.id,
        name: segment.name,
        amount,
        type: segment.type,
        rarity: segment.rarity,
      }],
      isFree,
    };

    return { success: true, result };
  }

  /**
   * 获取转盘segments (用于前端展示)
   */
  getWheelSegments(playerId: string, wheelType: number): Array<{ index: number; id: string; name: string; rarity: string }> {
    const data = this.getWheelData(playerId, wheelType);
    return data.wheelSegments.map((s, i) => ({
      index: i,
      id: s.id,
      name: s.name,
      rarity: s.rarity,
    }));
  }

  /**
   * 计算转动结果
   */
  calculateSpinResult(targetSegment: number, currentSegment: number): { spins: number; finalSegment: number } {
    const config = WHEEL_TASK_CONFIG.wheelConfig;
    const minSpins = config.minSpins;
    const maxSpins = config.maxSpins;
    
    const spins = Math.floor(Math.random() * (maxSpins - minSpins + 1)) + minSpins;
    const finalSegment = (currentSegment + spins * config.segments + targetSegment) % config.segments;
    
    return { spins, finalSegment };
  }
}

// ============ 任务共享系统类 ============
interface SharedTask {
  id: string;
  taskId: string;
  taskName: string;
  type: number;
  target: number;
  progress: number;
  exp: number;
  gold: number;
  sharerId: string;
  sharerName: string;
  shareType: number;
  createTime: number;
  expireTime: number;
  acceptedPlayers: string[];
}

interface PlayerTaskData {
  playerId: string;
  ownTasks: Map<string, {
    taskId: string;
    taskName: string;
    type: number;
    target: number;
    progress: number;
    completed: boolean;
    exp: number;
    gold: number;
  }>;
  sharedTasks: Map<string, {
    taskId: string;
    taskName: string;
    type: number;
    target: number;
    progress: number;
    completed: boolean;
    exp: number;
    gold: number;
    sharerId: string;
  }>;
  dailyShared: number;
  dailyAccepted: number;
  lastShareTime: number;
  lastAcceptTime: number;
}

export class TaskShareSystem {
  private playerTaskData: Map<string, PlayerTaskData> = new Map();
  private globalSharedTasks: Map<string, SharedTask> = new Map();

  /**
   * 获取玩家任务数据
   */
  getPlayerTaskData(playerId: string): PlayerTaskData {
    let data = this.playerTaskData.get(playerId);

    if (!data) {
      data = {
        playerId,
        ownTasks: new Map(),
        sharedTasks: new Map(),
        dailyShared: 0,
        dailyAccepted: 0,
        lastShareTime: 0,
        lastAcceptTime: 0,
      };
      this.playerTaskData.set(playerId, data);
    }

    // 检查日期重置
    this.checkDailyReset(data);

    return data;
  }

  /**
   * 检查每日重置
   */
  private checkDailyReset(data: PlayerTaskData): void {
    const now = new Date();
    const lastShare = new Date(data.lastShareTime);
    const lastAccept = new Date(data.lastAcceptTime);

    if (now.getDate() !== lastShare.getDate() || now.getMonth() !== lastShare.getMonth()) {
      data.dailyShared = 0;
    }
    if (now.getDate() !== lastAccept.getDate() || now.getMonth() !== lastAccept.getMonth()) {
      data.dailyAccepted = 0;
    }
  }

  /**
   * 初始化玩家自己的任务
   */
  initOwnTasks(playerId: string, taskIds: string[]): void {
    const data = this.getPlayerTaskData(playerId);
    
    for (const taskId of taskIds) {
      const taskTemplate = SHAREABLE_TASKS.find(t => t.id === taskId);
      if (!taskTemplate) continue;

      if (!data.ownTasks.has(taskId)) {
        data.ownTasks.set(taskId, {
          taskId: taskTemplate.id,
          taskName: taskTemplate.name,
          type: taskTemplate.type,
          target: taskTemplate.target,
          progress: 0,
          completed: false,
          exp: taskTemplate.exp,
          gold: taskTemplate.gold,
        });
      }
    }
  }

  /**
   * 更新任务进度
   */
  updateTaskProgress(playerId: string, taskId: string, progress: number): { completed?: boolean; rewards?: { exp: number; gold: number } } {
    const data = this.getPlayerTaskData(playerId);
    const task = data.ownTasks.get(taskId);

    if (!task || task.completed) {
      return {};
    }

    task.progress += progress;
    if (task.progress >= task.target) {
      task.completed = true;
      return { 
        completed: true, 
        rewards: { 
          exp: task.exp, 
          gold: task.gold 
        } 
      };
    }

    return { completed: false };
  }

  /**
   * 共享任务
   */
  shareTask(playerId: string, playerName: string, taskId: string, shareType: number = TASK_SHARE_CONFIG.shareTypes.DAILY): { success: boolean; sharedTask?: SharedTask; error?: string } {
    const data = this.getPlayerTaskData(playerId);
    const task = data.ownTasks.get(taskId);

    if (!task) {
      return { success: false, error: '任务不存在' };
    }

    if (task.completed) {
      return { success: false, error: '任务已完成' };
    }

    // 检查共享冷却
    const now = Date.now();
    if (now - data.lastShareTime < TASK_SHARE_CONFIG.shareSettings.shareCooldown) {
      return { success: false, error: '共享冷却中' };
    }

    // 检查每日共享次数
    if (data.dailyShared >= TASK_SHARE_CONFIG.shareSettings.dailyShareLimit) {
      return { success: false, error: '今日共享次数已用完' };
    }

    // 创建共享任务
    const sharedTask: SharedTask = {
      id: `shared_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      taskId: task.taskId,
      taskName: task.taskName,
      type: task.type,
      target: task.target,
      progress: task.progress,
      exp: task.exp,
      gold: task.gold,
      sharerId: playerId,
      sharerName: playerName,
      shareType,
      createTime: now,
      expireTime: now + TASK_SHARE_CONFIG.shareSettings.shareExpireTime,
      acceptedPlayers: [],
    };

    this.globalSharedTasks.set(sharedTask.id, sharedTask);
    data.dailyShared++;
    data.lastShareTime = now;

    return { success: true, sharedTask };
  }

  /**
   * 接受共享任务
   */
  acceptSharedTask(playerId: string, sharedTaskId: string): { success: boolean; task?: any; error?: string } {
    const playerData = this.getPlayerTaskData(playerId);
    const sharedTask = this.globalSharedTasks.get(sharedTaskId);

    if (!sharedTask) {
      return { success: false, error: '共享任务不存在' };
    }

    // 检查是否已过期
    if (Date.now() > sharedTask.expireTime) {
      return { success: false, error: '共享任务已过期' };
    }

    // 检查是否已被接受
    if (sharedTask.acceptedPlayers.includes(playerId)) {
      return { success: false, error: '您已接受过此任务' };
    }

    // 检查接受冷却
    const now = Date.now();
    if (now - playerData.lastAcceptTime < TASK_SHARE_CONFIG.shareSettings.acceptCooldown) {
      return { success: false, error: '接受任务冷却中' };
    }

    // 检查每日接受次数
    if (playerData.dailyAccepted >= TASK_SHARE_CONFIG.shareSettings.dailyAcceptLimit) {
      return { success: false, error: '今日接受任务次数已用完' };
    }

    // 添加到玩家共享任务
    const taskWithBonus = {
      taskId: sharedTask.taskId,
      taskName: sharedTask.taskName,
      type: sharedTask.type,
      target: sharedTask.target,
      progress: sharedTask.progress,
      completed: false,
      exp: Math.floor(sharedTask.exp * (100 + TASK_SHARE_CONFIG.rewardBonuses.sharedTask) / 100),
      gold: Math.floor(sharedTask.gold * (100 + TASK_SHARE_CONFIG.rewardBonuses.sharedTask) / 100),
      sharerId: sharedTask.sharerId,
    };

    playerData.sharedTasks.set(sharedTaskId, taskWithBonus);
    sharedTask.acceptedPlayers.push(playerId);
    playerData.dailyAccepted++;
    playerData.lastAcceptTime = now;

    return { success: true, task: taskWithBonus };
  }

  /**
   * 更新共享任务进度
   */
  updateSharedTaskProgress(playerId: string, sharedTaskId: string, progress: number): { completed?: boolean; rewards?: { exp: number; gold: number }; sharerBonus?: number } {
    const playerData = this.getPlayerTaskData(playerId);
    const task = playerData.sharedTasks.get(sharedTaskId);

    if (!task || task.completed) {
      return {};
    }

    task.progress += progress;
    const sharedTask = this.globalSharedTasks.get(sharedTaskId);

    // 同步进度给共享者
    if (sharedTask) {
      sharedTask.progress = task.progress;
    }

    if (task.progress >= task.target) {
      task.completed = true;
      
      // 奖励
      const rewards = { exp: task.exp, gold: task.gold };

      // 给予共享者奖励
      if (sharedTask) {
        const sharerData = this.getPlayerTaskData(sharedTask.sharerId);
        const ownTask = sharerData.ownTasks.get(task.taskId);
        if (ownTask) {
          const sharerBonus = Math.floor(ownTask.exp * TASK_SHARE_CONFIG.rewardBonuses.sharerBonus / 100);
          return { 
            completed: true, 
            rewards, 
            sharerBonus 
          };
        }
      }

      return { completed: true, rewards };
    }

    return { completed: false };
  }

  /**
   * 获取可接受的共享任务列表
   */
  getAvailableSharedTasks(playerId: string, friendIds: string[], guildMembers: string[]): SharedTask[] {
    const playerData = this.getPlayerTaskData(playerId);
    const available: SharedTask[] = [];

    for (const [id, task] of this.globalSharedTasks) {
      // 过滤过期
      if (Date.now() > task.expireTime) continue;

      // 过滤已接受
      if (task.acceptedPlayers.includes(playerId)) continue;

      // 过滤自己的任务
      if (task.sharerId === playerId) continue;

      // 检查来源权限
      const isFriend = friendIds.includes(task.sharerId);
      const isGuildMember = guildMembers.includes(task.sharerId);
      
      if (!isFriend && !isGuildMember) continue;

      // 检查任务类型
      if (task.shareType === TASK_SHARE_CONFIG.shareTypes.DAILY) {
        available.push(task);
      }
    }

    return available.slice(0, TASK_SHARE_CONFIG.shareSettings.maxSharedTasks);
  }

  /**
   * 获取玩家自己的任务列表
   */
  getOwnTasks(playerId: string): Array<any> {
    const data = this.getPlayerTaskData(playerId);
    return Array.from(data.ownTasks.values());
  }

  /**
   * 获取玩家接受的任务列表
   */
  getSharedTasks(playerId: string): Array<any> {
    const data = this.getPlayerTaskData(playerId);
    return Array.from(data.sharedTasks.values());
  }

  /**
   * 放弃共享任务
   */
  abandonSharedTask(playerId: string, sharedTaskId: string): { success: boolean; error?: string } {
    const playerData = this.getPlayerTaskData(playerId);
    
    if (!playerData.sharedTasks.has(sharedTaskId)) {
      return { success: false, error: '任务不存在' };
    }

    playerData.sharedTasks.delete(sharedTaskId);
    return { success: true };
  }

  /**
   * 刷新共享任务池
   */
  refreshSharedTaskPool(): void {
    const now = Date.now();
    
    for (const [id, task] of this.globalSharedTasks) {
      if (now > task.expireTime) {
        this.globalSharedTasks.delete(id);
      }
    }
  }
}

// 导出单例
export const wheelTaskSystem = new WheelTaskSystem();
export const taskShareSystem = new TaskShareSystem();
