/**
 * 仙侣双修系统 - 经验共享
 * 伴侣之间可以一起修炼，共享经验加成
 */

import Router from 'koa-router';

const router = new Router();

// 双修配置
export const PARTNER_CULTIVATE_CONFIG = {
  // 双修时经验加成比例
  expBonusRate: 1.5,
  // 每次双修持续时间(秒)
  duration: 3600,
  // 双修冷却时间(秒)
  cooldown: 7200,
  // 亲密度需求
  intimacyRequired: 1000,
  // 每日双修次数上限
  dailyLimit: 3,
  // 双方获得经验比例
  expShareRatio: 0.8
};

// 双修状态
interface PartnerCultivateState {
  playerId: string;
  partnerId: string;
  startTime: number;
  duration: number;
  expGained: number;
  bonusCount: number;
}

// 双修状态存储
const partnerCultivateStates = new Map<string, PartnerCultivateState>();

// 每日双修次数记录
const dailyLimitMap = new Map<string, { date: string; count: number }>();

// 今日日期
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

// 检查并更新每日次数
function checkDailyLimit(playerId: string): boolean {
  const today = getTodayDate();
  const record = dailyLimitMap.get(playerId);
  
  if (!record || record.date !== today) {
    dailyLimitMap.set(playerId, { date: today, count: 1 });
    return true;
  }
  
  if (record.count >= PARTNER_CULTIVATE_CONFIG.dailyLimit) {
    return false;
  }
  
  record.count++;
  return true;
}

// 获取今日双修次数
function getDailyCount(playerId: string): number {
  const today = getTodayDate();
  const record = dailyLimitMap.get(playerId);
  return record?.date === today ? record.count : 0;
}

// 开启双修
router.post('/api/partner-cultivate/start', async (ctx) => {
  const { playerId, partnerId, intimacy } = ctx.request.body as any;
  
  if (!playerId || !partnerId) {
    ctx.status = 400;
    ctx.body = { error: '参数不完整' };
    return;
  }

  // 检查亲密度
  if (intimacy < PARTNER_CULTIVATE_CONFIG.intimacyRequired) {
    ctx.body = {
      success: false,
      error: `亲密度不足，需要 ${PARTNER_CULTIVATE_CONFIG.intimacyRequired} 点`
    };
    return;
  }

  // 检查每日次数
  if (!checkDailyLimit(playerId)) {
    ctx.body = {
      success: false,
      error: '今日双修次数已用完'
    };
    return;
  }

  // 创建双修状态
  const state: PartnerCultivateState = {
    playerId,
    partnerId,
    startTime: Date.now(),
    duration: PARTNER_CULTIVATE_CONFIG.duration,
    expGained: 0,
    bonusCount: 0
  };

  partnerCultivateStates.set(playerId, state);

  ctx.body = {
    success: true,
    data: {
      startTime: state.startTime,
      duration: state.duration,
      expBonusRate: PARTNER_CULTIVATE_CONFIG.expBonusRate,
      dailyRemaining: PARTNER_CULTIVATE_CONFIG.dailyLimit - getDailyCount(playerId)
    }
  };
});

// 获取双修状态
router.get('/api/partner-cultivate/status/:playerId', async (ctx) => {
  const { playerId } = ctx.params;
  
  const state = partnerCultivateStates.get(playerId);
  
  if (!state) {
    ctx.body = {
      success: true,
      data: {
        active: false,
        dailyRemaining: PARTNER_CULTIVATE_CONFIG.dailyLimit - getDailyCount(playerId)
      }
    };
    return;
  }

  const elapsed = Date.now() - state.startTime;
  const remaining = Math.max(0, state.duration * 1000 - elapsed);
  
  ctx.body = {
    success: true,
    data: {
      active: remaining > 0,
      partnerId: state.partnerId,
      startTime: state.startTime,
      remaining: Math.floor(remaining / 1000),
      expGained: state.expGained,
      bonusCount: state.bonusCount,
      dailyRemaining: PARTNER_CULTIVATE_CONFIG.dailyLimit - getDailyCount(playerId)
    }
  };
});

// 结束双修
router.post('/api/partner-cultivate/end', async (ctx) => {
  const { playerId, baseExp } = ctx.request.body as any;
  
  if (!playerId) {
    ctx.status = 400;
    ctx.body = { error: '缺少玩家ID' };
    return;
  }

  const state = partnerCultivateStates.get(playerId);
  
  if (!state) {
    ctx.body = {
      success: false,
      error: '没有正在进行的双修'
    };
    return;
  }

  const elapsed = Date.now() - state.startTime;
  const actualDuration = Math.min(elapsed, state.duration * 1000);
  
  // 计算经验加成
  const bonusExp = Math.floor(baseExp * PARTNER_CULTIVATE_CONFIG.expBonusRate * (actualDuration / (state.duration * 1000)));
  const sharedExp = Math.floor(bonusExp * PARTNER_CULTIVATE_CONFIG.expShareRatio);
  
  // 更新状态
  state.expGained += bonusExp;
  
  // 清除双修状态
  partnerCultivateStates.delete(playerId);

  ctx.body = {
    success: true,
    data: {
      expGained: bonusExp,
      sharedExp,
      duration: Math.floor(actualDuration / 1000),
      dailyRemaining: PARTNER_CULTIVATE_CONFIG.dailyLimit - getDailyCount(playerId)
    }
  };
});

// 双修经验计算
router.post('/api/partner-cultivate/calc-exp', async (ctx) => {
  const { playerId, baseExp, isAttacker } = ctx.request.body as any;
  
  const state = partnerCultivateStates.get(playerId);
  
  if (!state) {
    ctx.body = {
      success: true,
      data: { exp: baseExp, bonus: 0 }
    };
    return;
  }

  const elapsed = Date.now() - state.startTime;
  const remaining = state.duration * 1000 - elapsed;
  
  if (remaining <= 0) {
    ctx.body = {
      success: true,
      data: { exp: baseExp, bonus: 0 }
    };
    return;
  }

  // 计算加成
  const durationBonus = remaining / (state.duration * 1000);
  const bonusExp = Math.floor(baseExp * (PARTNER_CULTIVATE_CONFIG.expBonusRate - 1) * durationBonus);
  
  // 分享方获得稍少的经验
  const finalExp = isAttacker 
    ? baseExp + bonusExp 
    : Math.floor((baseExp + bonusExp) * PARTNER_CULTIVATE_CONFIG.expShareRatio);

  ctx.body = {
    success: true,
    data: {
      exp: finalExp,
      bonus: bonusExp,
      isInCultivate: true
    }
  };
});

export default router;
export { PARTNER_CULTIVATE_CONFIG, PartnerCultivateState, partnerCultivateStates };
