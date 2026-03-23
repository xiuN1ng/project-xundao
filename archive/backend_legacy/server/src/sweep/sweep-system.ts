/**
 * 一键扫荡系统
 * 快速通关副本/关卡，直接获得奖励
 */

// 扫荡类型
export const SWEEP_TYPE = {
  DUNGEON: 'dungeon',      // 副本扫荡
  TOWER: 'tower',          // 爬塔扫荡
  BOSS: 'boss',            // BOSS关卡扫荡
  QUEST: 'quest',          // 任务扫荡
  ELITE: 'elite'           // 精英关卡扫荡
};

// 扫荡配置
const SWEEP_CONFIG = {
  // 每次扫荡最大次数
  maxSweepCount: 100,
  // 扫荡所需时间(毫秒)
  sweepTimePerLevel: 100,
  // VIP扫荡加成
  vipSweepBonus: 2,
  // 扫荡冷却(毫秒)
  sweepCooldown: 1000,
  // 扫荡最小等级要求
  minPlayerLevel: 10,
  // 扫荡消耗(体力/次)
  staminaCost: 10,
  // 扫荡收益倍率
  rewardMultiplier: 1.0,
  // 快速扫荡额外消耗
  fastSweepCost: 10  // 元宝
};

// 关卡配置
const LEVEL_CONFIG = {
  // 普通关卡
  normal: {
    baseExp: 100,
    baseGold: 50,
    baseItemDropRate: 0.3
  },
  // 精英关卡
  elite: {
    baseExp: 300,
    baseGold: 150,
    baseItemDropRate: 0.6
  },
  // BOSS关卡
  boss: {
    baseExp: 1000,
    baseGold: 500,
    baseItemDropRate: 0.9
  },
  // 爬塔
  tower: {
    baseExp: 200,
    baseGold: 100,
    baseItemDropRate: 0.5,
    floorBonus: 10  // 每层额外加成
  }
};

// 玩家扫荡数据
const playerSweepData = new Map<number, any>();

// 初始化玩家扫荡数据
export function initPlayerSweep(playerId: number): any {
  let data = playerSweepData.get(playerId);
  
  if (!data) {
    data = {
      lastSweepTime: 0,
      totalSweepCount: 0,
      sweepHistory: [],
      unlockedLevels: [1],
      todaySweepCount: 0,
      lastSweepDate: ''
    };
    playerSweepData.set(playerId, data);
  }
  
  // 检查日期重置每日次数
  const today = new Date().toDateString();
  if (data.lastSweepDate !== today) {
    data.todaySweepCount = 0;
    data.lastSweepDate = today;
  }
  
  return data;
}

// 获取扫荡信息
export function getSweepInfo(playerId: number): any {
  const data = initPlayerSweep(playerId);
  
  return {
    totalSweepCount: data.totalSweepCount,
    todaySweepCount: data.todaySweepCount,
    unlockedLevels: data.unlockedLevels,
    canSweep: true
  };
}

// 执行扫荡
export function performSweep(
  playerId: number,
  levelId: number,
  sweepCount: number,
  playerLevel: number,
  playerVipLevel: number = 0
): any {
  // 等级检查
  if (playerLevel < SWEEP_CONFIG.minPlayerLevel) {
    return { 
      success: false, 
      message: `角色等级达到${SWEEP_CONFIG.minPlayerLevel}级才能使用扫荡` 
    };
  }
  
  // 扫荡次数限制
  if (sweepCount < 1 || sweepCount > SWEEP_CONFIG.maxSweepCount) {
    return { 
      success: false, 
      message: `每次扫荡次数为1-${SWEEP_CONFIG.maxSweepCount}` 
    };
  }
  
  // 检查关卡是否解锁
  const data = initPlayerSweep(playerId);
  if (!data.unlockedLevels.includes(levelId)) {
    return { success: false, message: '关卡未解锁' };
  }
  
  // 检查冷却
  const now = Date.now();
  if (now - data.lastSweepTime < SWEEP_CONFIG.sweepCooldown) {
    return { success: false, message: '扫荡冷却中，请稍后再试' };
  }
  
  // 计算总消耗
  const totalStamina = sweepCount * SWEEP_CONFIG.staminaCost;
  const playerStamina = getPlayerStamina?.(playerId) || 0;
  
  if (playerStamina < totalStamina) {
    return { 
      success: false, 
      message: `体力不足，需要${totalStamina}体力` 
    };
  }
  
  // 扣除体力
  if (getPlayerStamina) {
    getPlayerStamina(playerId, -totalStamina);
  }
  
  // 计算收益
  const levelType = getLevelType(levelId);
  const config = LEVEL_CONFIG[levelType];
  
  // VIP加成
  const vipBonus = playerVipLevel > 0 ? SWEEP_CONFIG.vipSweepBonus : 1;
  
  // 计算奖励
  const exp = Math.floor(config.baseExp * sweepCount * SWEEP_CONFIG.rewardMultiplier * vipBonus);
  const gold = Math.floor(config.baseGold * sweepCount * SWEEP_CONFIG.rewardMultiplier * vipBonus);
  
  // 物品掉落
  const items: any[] = [];
  for (let i = 0; i < sweepCount; i++) {
    if (Math.random() < config.baseItemDropRate) {
      const item = generateRandomItem(levelType, playerLevel);
      if (item) items.push(item);
    }
  }
  
  // 更新数据
  data.lastSweepTime = now;
  data.totalSweepCount += sweepCount;
  data.todaySweepCount += sweepCount;
  
  // 记录历史
  data.sweepHistory.push({
    levelId,
    sweepCount,
    exp,
    gold,
    items: items.length,
    timestamp: now
  });
  
  // 只保留最近100条记录
  if (data.sweepHistory.length > 100) {
    data.sweepHistory = data.sweepHistory.slice(-100);
  }
  
  return {
    success: true,
    message: `扫荡成功！完成${sweepCount}次，获得${exp}经验、${gold}金币`,
    rewards: {
      exp,
      gold,
      items,
      staminaUsed: totalStamina
    },
    stats: {
      totalSweepCount: data.totalSweepCount,
      todaySweepCount: data.todaySweepCount
    }
  };
}

// 获取关卡类型
function getLevelType(levelId: number): string {
  if (levelId % 10 === 0) return 'boss';
  if (levelId % 5 === 0) return 'elite';
  return 'normal';
}

// 生成随机物品
function generateRandomItem(levelType: string, playerLevel: number): any {
  const itemTypes = ['equipment', 'material', 'gem'];
  const type = itemTypes[Math.floor(Math.random() * itemTypes.length)];
  
  const quality = Math.random();
  let itemQuality = 'common';
  if (quality > 0.9) itemQuality = 'epic';
  else if (quality > 0.7) itemQuality = 'rare';
  
  return {
    id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    type,
    quality: itemQuality,
    level: playerLevel
  };
}

// 快速扫荡(立即完成，无需等待)
export function performFastSweep(
  playerId: number,
  levelId: number,
  sweepCount: number,
  playerLevel: number,
  playerVipLevel: number = 0,
  playerGold: number = 0
): any {
  // 快速扫荡额外消耗
  const fastCost = SWEEP_CONFIG.fastSweepCost;
  
  if (playerGold < fastCost) {
    return { 
      success: false, 
      message: `快速扫荡需要${fastCost}元宝` 
    };
  }
  
  // 扣除元宝
  if (deductPlayerGold) {
    deductPlayerGold(playerId, fastCost);
  }
  
  // 直接返回结果
  return performSweep(playerId, levelId, sweepCount, playerLevel, playerVipLevel);
}

// 解锁新关卡
export function unlockLevel(playerId: number, levelId: number): any {
  const data = initPlayerSweep(playerId);
  
  if (data.unlockedLevels.includes(levelId)) {
    return { success: false, message: '关卡已解锁' };
  }
  
  data.unlockedLevels.push(levelId);
  data.unlockedLevels.sort((a: number, b: number) => a - b);
  
  return {
    success: true,
    message: `关卡${levelId}已解锁`,
    unlockedLevels: data.unlockedLevels
  };
}

// 获取扫荡历史
export function getSweepHistory(playerId: number, limit: number = 10): any {
  const data = initPlayerSweep(playerId);
  
  return {
    success: true,
    history: data.sweepHistory.slice(-limit)
  };
}

// 外部函数注入
let getPlayerStamina: ((id: number, delta?: number) => number) | null = null;
let deductPlayerGold: ((id: number, amount: number) => void) | null = null;

export function setPlayerGetters(
  staminaFn: (id: number, delta?: number) => number,
  goldFn?: (id: number, amount: number) => void
) {
  getPlayerStamina = staminaFn;
  if (goldFn) deductPlayerGold = goldFn;
}

export default {
  initPlayerSweep,
  getSweepInfo,
  performSweep,
  performFastSweep,
  unlockLevel,
  getSweepHistory,
  setPlayerGetters,
  SWEEP_CONFIG,
  SWEEP_TYPE
};
