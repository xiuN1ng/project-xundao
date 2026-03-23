/**
 * 累计充值系统 - 充值福利
 * 根据累计充值金额发放不同档位的奖励
 */

import Router from 'koa-router';

const router = new Router();

// 累计充值配置
export const TOTAL_RECHARGE_CONFIG = {
  // 充值档位配置
  tiers: [
    { totalAmount: 100, gems: 1000, bonusGems: 100, title: '初窥门径', icon: 'bronze' },
    { totalAmount: 500, gems: 5000, bonusGems: 500, title: '小有所成', icon: 'silver' },
    { totalAmount: 1000, gems: 10000, bonusGems: 1500, title: '炉火纯青', icon: 'gold' },
    { totalAmount: 3000, gems: 30000, bonusGems: 6000, title: '登堂入室', icon: 'platinum' },
    { totalAmount: 5000, gems: 50000, bonusGems: 12500, title: '出神入化', icon: 'diamond' },
    { totalAmount: 10000, gems: 100000, bonusGems: 30000, title: '登峰造极', icon: 'crown' },
    { totalAmount: 20000, gems: 200000, bonusGems: 80000, title: '超凡入圣', icon: 'legend' },
    { totalAmount: 50000, gems: 500000, bonusGems: 250000, title: '举世无双', icon: 'myth' }
  ],
  // 刷新周期: monthly(每月), weekly(每周), daily(每日)
  refreshType: 'monthly',
  // 累计充值重置时间
  resetTime: 'month_start'
};

// 累计充值记录
interface TotalRechargeRecord {
  playerId: string;
  totalAmount: number;
  claimedTiers: number[];
  lastUpdateTime: number;
  periodStart: number;
}

// 累计充值记录存储
const totalRechargeRecords = new Map<string, TotalRechargeRecord>();

// 获取当前周期开始时间
function getPeriodStart(): number {
  const now = new Date();
  if (TOTAL_RECHARGE_CONFIG.refreshType === 'monthly') {
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  } else if (TOTAL_RECHARGE_CONFIG.refreshType === 'weekly') {
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek;
    return new Date(now.setDate(diff)).setHours(0, 0, 0, 0);
  }
  return new Date(now.setHours(0, 0, 0, 0)).getTime();
}

// 获取玩家记录
function getPlayerRecord(playerId: string): TotalRechargeRecord {
  let record = totalRechargeRecords.get(playerId);
  const periodStart = getPeriodStart();
  
  if (!record || record.periodStart < periodStart) {
    record = {
      playerId,
      totalAmount: 0,
      claimedTiers: [],
      lastUpdateTime: Date.now(),
      periodStart
    };
    totalRechargeRecords.set(playerId, record);
  }
  
  return record;
}

// 充值接口
router.post('/api/total-recharge/add', async (ctx) => {
  const { playerId, amount } = ctx.request.body as any;
  
  if (!playerId || !amount) {
    ctx.status = 400;
    ctx.body = { error: '参数不完整' };
    return;
  }

  const record = getPlayerRecord(playerId);
  record.totalAmount += amount;
  record.lastUpdateTime = Date.now();
  
  totalRechargeRecords.set(playerId, record);

  // 计算当前可领取的档位
  const availableTiers = getAvailableTiers(record);

  ctx.body = {
    success: true,
    data: {
      totalAmount: record.totalAmount,
      availableTiers,
      nextTier: getNextTier(record.totalAmount)
    }
  };
});

// 获取可领取的档位
function getAvailableTiers(record: TotalRechargeRecord) {
  return TOTAL_RECHARGE_CONFIG.tiers.map(tier => ({
    ...tier,
    reached: record.totalAmount >= tier.totalAmount,
    claimed: record.claimedTiers.includes(tier.totalAmount),
    canClaim: record.totalAmount >= tier.totalAmount && 
              !record.claimedTiers.includes(tier.totalAmount)
  }));
}

// 获取下一个档位
function getNextTier(currentAmount: number) {
  const nextTier = TOTAL_RECHARGE_CONFIG.tiers.find(
    tier => tier.totalAmount > currentAmount
  );
  return nextTier || null;
}

// 领取累计充值奖励
router.post('/api/total-recharge/claim', async (ctx) => {
  const { playerId, tierAmount } = ctx.request.body as any;
  
  if (!playerId || !tierAmount) {
    ctx.status = 400;
    ctx.body = { error: '参数不完整' };
    return;
  }

  const record = getPlayerRecord(playerId);
  
  // 检查是否达到档位
  if (record.totalAmount < tierAmount) {
    ctx.body = {
      success: false,
      error: '累计充值金额不足'
    };
    return;
  }

  // 检查是否已领取
  if (record.claimedTiers.includes(tierAmount)) {
    ctx.body = {
      success: false,
      error: '该档位奖励已领取'
    };
    return;
  }

  // 查找档位配置
  const tier = TOTAL_RECHARGE_CONFIG.tiers.find(
    t => t.totalAmount === tierAmount
  );
  
  if (!tier) {
    ctx.body = {
      success: false,
      error: '无效的档位'
    };
    return;
  }

  // 计算奖励
  const gems = tier.gems + tier.bonusGems;
  
  // 记录领取
  record.claimedTiers.push(tierAmount);
  totalRechargeRecords.set(playerId, record);

  ctx.body = {
    success: true,
    data: {
      gems,
      bonusGems: tier.bonusGems,
      title: tier.title,
      icon: tier.icon,
      totalAmount: record.totalAmount,
      remainingTiers: TOTAL_RECHARGE_CONFIG.tiers.length - record.claimedTiers.length
    }
  };
});

// 获取累计充值状态
router.get('/api/total-recharge/status/:playerId', async (ctx) => {
  const { playerId } = ctx.params;
  
  const record = getPlayerRecord(playerId);
  const availableTiers = getAvailableTiers(record);
  const nextTier = getNextTier(record.totalAmount);
  
  // 计算进度百分比
  const progress = nextTier 
    ? (record.totalAmount / nextTier.totalAmount) * 100 
    : 100;

  ctx.body = {
    success: true,
    data: {
      totalAmount: record.totalAmount,
      periodStart: record.periodStart,
      refreshType: TOTAL_RECHARGE_CONFIG.refreshType,
      availableTiers,
      nextTier,
      progress: Math.min(100, progress),
      allClaimed: record.claimedTiers.length >= TOTAL_RECHARGE_CONFIG.tiers.length
    }
  };
});

// 获取累计充值配置
router.get('/api/total-recharge/config', async (ctx) => {
  ctx.body = {
    success: true,
    data: {
      tiers: TOTAL_RECHARGE_CONFIG.tiers,
      refreshType: TOTAL_RECHARGE_CONFIG.refreshType
    }
  };
});

// 获取排行榜
router.get('/api/total-recharge/rankings', async (ctx) => {
  const { limit = 10 } = ctx.query;
  
  // 模拟排行榜数据
  const rankings = Array.from(totalRechargeRecords.entries())
    .map(([playerId, record]) => ({
      playerId,
      totalAmount: record.totalAmount,
      tier: getCurrentTier(record.totalAmount)
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, Number(limit));

  ctx.body = {
    success: true,
    data: rankings
  };
});

// 获取当前档位
function getCurrentTier(amount: number) {
  let currentTier = null;
  for (const tier of TOTAL_RECHARGE_CONFIG.tiers) {
    if (amount >= tier.totalAmount) {
      currentTier = tier;
    }
  }
  return currentTier;
}

export default router;
export { TOTAL_RECHARGE_CONFIG, TotalRechargeRecord, totalRechargeRecords };
