/**
 * 红包系统
 * 公会红包、 世界红包、 私聊红包
 */

// 红包类型
export const REDPACKET_TYPE = {
  GUILD: 'guild',      // 公会红包
  WORLD: 'world',      // 世界红包
  PRIVATE: 'private',  // 私聊红包
  ACTIVITY: 'activity' // 活动红包
};

// 红包配置
const REDPACKET_CONFIG = {
  // 红包金额范围
  minAmount: 100,
  maxAmount: 10000,
  // 红包个数
  minCount: 5,
  maxCount: 100,
  // 冷却时间(秒)
  cooldown: 60,
  // 手续费比例
  feeRate: 0.05
};

// 红包数据存储
const redpackets = new Map<string, any>();

// 创建红包
export function createRedpacket(
  senderId: number,
  senderName: string,
  type: string,
  amount: number,
  count: number,
  message: string = '恭喜发财，大吉大利！',
  targetId?: number
): any {
  if (amount < REDPACKET_CONFIG.minAmount) {
    return { success: false, message: `金额不能低于${REDPACKET_CONFIG.minAmount}` };
  }
  if (count < REDPACKET_CONFIG.minCount || count > REDPACKET_CONFIG.maxCount) {
    return { success: false, message: `红包个数需在${REDPACKET_CONFIG.minCount}-${REDPACKET_CONFIG.maxCount}之间` };
  }
  if (amount / count < 1) {
    return { success: false, message: '单个红包金额不能低于1' };
  }

  const id = `rp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const avgAmount = Math.floor(amount / count);
  const remainder = amount % count;
  
  // 生成随机金额
  const amounts: number[] = [];
  for (let i = 0; i < count; i++) {
    if (i === count - 1) {
      amounts.push(avgAmount + remainder);
    } else {
      const max = avgAmount * 2;
      amounts.push(Math.floor(Math.random() * (max - 1)) + 1);
    }
  }

  const redpacket = {
    id,
    senderId,
    senderName,
    type,
    totalAmount: amount,
    totalCount: count,
    remainCount: count,
    amounts: amounts.sort(() => Math.random() - 0.5),
    message,
    targetId,  // 私聊红包目标
    createdAt: Date.now(),
    claimedBy: [] as number[]
  };

  redpackets.set(id, redpacket);

  return {
    success: true,
    message: '红包创建成功',
    redpacket: {
      id,
      type,
      totalAmount: amount,
      totalCount: count,
      message,
      senderName
    }
  };
}

// 抢红包
export function grabRedpacket(redpacketId: string, playerId: number, playerName: string): any {
  const redpacket = redpackets.get(redpacketId);
  if (!redpacket) {
    return { success: false, message: '红包不存在或已过期' };
  }

  // 检查是否已领取
  if (redpacket.claimedBy.includes(playerId)) {
    return { success: false, message: '您已领取过该红包' };
  }

  // 检查是否发红包者
  if (redpacket.senderId === playerId) {
    return { success: false, message: '不能领取自己的红包' };
  }

  // 检查私聊红包
  if (redpacket.type === REDPACKET_TYPE.PRIVATE && redpacket.targetId !== playerId) {
    return { success: false, message: '这不是您的红包' };
  }

  // 检查是否还有剩余
  if (redpacket.remainCount <= 0) {
    return { success: false, message: '红包已被抢完' };
  }

  // 领取红包
  const index = redpacket.totalCount - redpacket.remainCount;
  const amount = redpacket.amounts[index];
  redpacket.claimedBy.push(playerId);
  redpacket.remainCount--;

  return {
    success: true,
    message: `抢到${amount}金币！`,
    amount,
    grabInfo: {
      playerName,
      amount,
      time: Date.now()
    }
  };
}

// 查看红包详情
export function getRedpacketInfo(redpacketId: string): any {
  const redpacket = redpackets.get(redpacketId);
  if (!redpacket) {
    return { success: false, message: '红包不存在' };
  }

  return {
    success: true,
    info: {
      id: redpacket.id,
      senderName: redpacket.senderName,
      type: redpacket.type,
      totalAmount: redpacket.totalAmount,
      totalCount: redpacket.totalCount,
      remainCount: redpacket.remainCount,
      message: redpacket.message,
      createdAt: redpacket.createdAt
    }
  };
}

// 清理过期红包 (超过24小时)
export function cleanupExpiredRedpackets(): number {
  const now = Date.now();
  const expireTime = 24 * 60 * 60 * 1000;
  let cleaned = 0;

  for (const [id, rp] of redpackets.entries()) {
    if (now - rp.createdAt > expireTime) {
      redpackets.delete(id);
      cleaned++;
    }
  }

  return cleaned;
}

export default {
  createRedpacket,
  grabRedpacket,
  getRedpacketInfo,
  cleanupExpiredRedpackets,
  REDPACKET_TYPE
};
