/**
 * 离线挂机系统 - 离线收益
 * 玩家离线后重新登录可获得离线收益
 */

import Router from 'koa-router';

const router = new Router();

// 离线挂机配置
export const OFFLINE_EARNINGS_CONFIG = {
  // 最大离线时间(秒)
  maxOfflineTime: 8 * 60 * 60,
  // 最小离线时间才计算收益(秒)
  minOfflineTime: 60,
  // 基础经验倍率
  baseExpRate: 1,
  // 离线经验加成(每小时)
  hourlyBonusRate: 0.1,
  // VIP离线加成
  vipBonusRates: {
    0: 0,
    1: 0.2,
    2: 0.4,
    3: 0.6,
    4: 0.8,
    5: 1.0
  },
  // 离线收益类型
  rewardTypes: ['exp', 'spirit', 'item'],
  // 每级每秒基础收益
  levelBaseExp: 10,
  // 灵气基础收益
  baseSpirit: 5
};

// 离线收益记录
interface OfflineEarningsRecord {
  playerId: string;
  lastOnlineTime: number;
  lastOfflineTime: number;
  totalOfflineEarnings: {
    exp: number;
    spirit: number;
    items: Array<{ itemId: string; count: number }>;
  };
  offlineDuration: number;
}

// 离线挂机记录存储
const offlineRecords = new Map<string, OfflineEarningsRecord>();

// 玩家当前挂机状态
const currentHangState = new Map<string, {
  startTime: number;
  location: string;
  level: number;
  expRate: number;
}>();

// 计算离线收益
function calculateOfflineEarnings(
  playerId: string, 
  offlineSeconds: number,
  playerLevel: number,
  vipLevel: number = 0
): {
  exp: number;
  spirit: number;
  items: Array<{ itemId: string; count: number }>;
  offlineHours: number;
  bonusRate: number;
} {
  // 限制最大离线时间
  const effectiveTime = Math.min(offlineSeconds, OFFLINE_EARNINGS_CONFIG.maxOfflineTime);
  
  // 计算加成
  const hourlyBonus = Math.floor(effectiveTime / 3600) * OFFLINE_EARNINGS_CONFIG.hourlyBonusRate;
  const vipBonus = OFFLINE_EARNINGS_CONFIG.vipBonusRates[vipLevel] || 0;
  const bonusRate = OFFLINE_EARNINGS_CONFIG.baseExpRate + hourlyBonus + vipBonus;
  
  // 计算经验
  const exp = Math.floor(
    playerLevel * 
    OFFLINE_EARNINGS_CONFIG.levelBaseExp * 
    effectiveTime * 
    bonusRate
  );
  
  // 计算灵气
  const spirit = Math.floor(
    OFFLINE_EARNINGS_CONFIG.baseSpirit * 
    effectiveTime * 
    bonusRate
  );
  
  // 模拟掉落物品(根据概率)
  const items: Array<{ itemId: string; count: number }> = [];
  const itemDropChance = 0.1 + (hourlyBonus * 0.5); // 离线越久掉落越高
  if (Math.random() < itemDropChance) {
    const itemIds = ['spirit_stone', 'exp_scroll', 'rare_item'];
    const randomItem = itemIds[Math.floor(Math.random() * itemIds.length)];
    items.push({ itemId: randomItem, count: Math.floor(Math.random() * 3) + 1 });
  }

  return {
    exp,
    spirit,
    items,
    offlineHours: Number((effectiveTime / 3600).toFixed(2)),
    bonusRate: Number(bonusRate.toFixed(2))
  };
}

// 玩家下线
router.post('/api/offline-earnings/offline', async (ctx) => {
  const { playerId, level, vipLevel } = ctx.request.body as any;
  
  if (!playerId) {
    ctx.status = 400;
    ctx.body = { error: '缺少玩家ID' };
    return;
  }

  const now = Date.now();
  let record = offlineRecords.get(playerId);
  
  if (!record) {
    record = {
      playerId,
      lastOnlineTime: now,
      lastOfflineTime: now,
      totalOfflineEarnings: { exp: 0, spirit: 0, items: [] },
      offlineDuration: 0
    };
  }

  record.lastOfflineTime = now;
  offlineRecords.set(playerId, record);

  ctx.body = {
    success: true,
    message: '已记录离线时间'
  };
});

// 玩家上线/领取离线收益
router.post('/api/offline-earnings/claim', async (ctx) => {
  const { playerId, level = 1, vipLevel = 0 } = ctx.request.body as any;
  
  if (!playerId) {
    ctx.status = 400;
    ctx.body = { error: '缺少玩家ID' };
    return;
  }

  const now = Date.now();
  let record = offlineRecords.get(playerId);
  
  if (!record) {
    record = {
      playerId,
      lastOnlineTime: now,
      lastOfflineTime: 0,
      totalOfflineEarnings: { exp: 0, spirit: 0, items: [] },
      offlineDuration: 0
    };
    offlineRecords.set(playerId, record);
  }

  // 计算离线时间
  const offlineSeconds = Math.floor((now - record.lastOfflineTime) / 1000);
  
  // 检查是否满足最小离线时间
  if (offlineSeconds < OFFLINE_EARNINGS_CONFIG.minOfflineTime) {
    ctx.body = {
      success: true,
      data: {
        hasEarnings: false,
        offlineSeconds: 0,
        message: '离线时间不足，无法领取收益'
      }
    };
    return;
  }

  // 计算离线收益
  const earnings = calculateOfflineEarnings(playerId, offlineSeconds, level, vipLevel);

  // 更新记录
  record.lastOnlineTime = now;
  record.lastOfflineTime = now;
  record.offlineDuration = offlineSeconds;
  record.totalOfflineEarnings = {
    exp: record.totalOfflineEarnings.exp + earnings.exp,
    spirit: record.totalOfflineEarnings.spirit + earnings.spirit,
    items: [...record.totalOfflineEarnings.items, ...earnings.items]
  };
  
  offlineRecords.set(playerId, record);

  ctx.body = {
    success: true,
    data: {
      hasEarnings: true,
      offlineSeconds,
      ...earnings,
      totalEarnings: record.totalOfflineEarnings
    }
  };
});

// 获取离线收益状态
router.get('/api/offline-earnings/status/:playerId', async (ctx) => {
  const { playerId } = ctx.params;
  
  const record = offlineRecords.get(playerId);
  
  if (!record) {
    ctx.body = {
      success: true,
      data: {
        hasOfflineData: false,
        offlineSeconds: 0,
        canClaim: false
      }
    };
    return;
  }

  const now = Date.now();
  const offlineSeconds = Math.floor((now - record.lastOfflineTime) / 1000);
  const canClaim = offlineSeconds >= OFFLINE_EARNINGS_CONFIG.minOfflineTime;

  ctx.body = {
    success: true,
    data: {
      hasOfflineData: true,
      lastOfflineTime: record.lastOfflineTime,
      offlineSeconds,
      canClaim,
      maxOfflineTime: OFFLINE_EARNINGS_CONFIG.maxOfflineTime,
      totalEarnings: record.totalOfflineEarnings,
      config: {
        maxOfflineTime: OFFLINE_EARNINGS_CONFIG.maxOfflineTime,
        minOfflineTime: OFFLINE_EARNINGS_CONFIG.minOfflineTime,
        hourlyBonusRate: OFFLINE_EARNINGS_CONFIG.hourlyBonusRate
      }
    }
  };
});

// 开始挂机
router.post('/api/offline-earnings/hang-start', async (ctx) => {
  const { playerId, location, level, expRate = 1 } = ctx.request.body as any;
  
  if (!playerId || !location) {
    ctx.status = 400;
    ctx.body = { error: '参数不完整' };
    return;
  }

  currentHangState.set(playerId, {
    startTime: Date.now(),
    location,
    level: level || 1,
    expRate
  });

  ctx.body = {
    success: true,
    data: {
      startTime: Date.now(),
      location,
      expRate,
      message: '挂机已开始'
    }
  };
});

// 停止挂机
router.post('/api/offline-earnings/hang-stop', async (ctx) => {
  const { playerId } = ctx.request.body as any;
  
  if (!playerId) {
    ctx.status = 400;
    ctx.body = { error: '缺少玩家ID' };
    return;
  }

  const state = currentHangState.get(playerId);
  
  if (!state) {
    ctx.body = {
      success: false,
      error: '没有进行中的挂机'
    };
    return;
  }

  const duration = Math.floor((Date.now() - state.startTime) / 1000);
  const expGained = Math.floor(
    state.level * OFFLINE_EARNINGS_CONFIG.levelBaseExp * 
    duration * state.expRate
  );
  
  currentHangState.delete(playerId);

  ctx.body = {
    success: true,
    data: {
      duration,
      expGained,
      location: state.location,
      message: '挂机已停止，收益已发放'
    }
  };
});

// 获取挂机状态
router.get('/api/offline-earnings/hang-status/:playerId', async (ctx) => {
  const { playerId } = ctx.params;
  
  const state = currentHangState.get(playerId);
  
  if (!state) {
    ctx.body = {
      success: true,
      data: {
        isHanging: false
      }
    };
    return;
  }

  const duration = Math.floor((Date.now() - state.startTime) / 1000);
  const expGained = Math.floor(
    state.level * OFFLINE_EARNINGS_CONFIG.levelBaseExp * 
    duration * state.expRate
  );

  ctx.body = {
    success: true,
    data: {
      isHanging: true,
      startTime: state.startTime,
      duration,
      location: state.location,
      level: state.level,
      expRate: state.expRate,
      expGained
    }
  };
});

export default router;
export { OFFLINE_EARNINGS_CONFIG, OfflineEarningsRecord, offlineRecords };
