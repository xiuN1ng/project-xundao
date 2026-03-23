/**
 * 多倍收益系统 - 加速收益
 * 提供经验、掉落等多倍收益功能
 */

import { Router, Request, Response } from 'express';

const router = Router();

// 收益倍率配置
interface MultiplierConfig {
  playerId: string;
  expMultiplier: number;
  dropMultiplier: number;
  spiritMultiplier: number;
  skillMultiplier: number;
  activeUntil: number;
  purchasedMultipliers: {
    exp: number;
    drop: number;
    spirit: number;
    skill: number;
  };
  totalSpent: number;
}

// 玩家多倍收益数据
const multiplierStore: Map<string, MultiplierConfig> = new Map();

// 多倍收益商品配置
const MULTIPLIER_ITEMS = {
  exp: [
    { id: 'exp_1.5', name: '经验1.5倍', multiplier: 1.5, duration: 3600000, price: 100 },
    { id: 'exp_2', name: '经验2倍', multiplier: 2, duration: 3600000, price: 200 },
    { id: 'exp_3', name: '经验3倍', multiplier: 3, duration: 1800000, price: 300 },
  ],
  drop: [
    { id: 'drop_1.5', name: '掉落1.5倍', multiplier: 1.5, duration: 3600000, price: 150 },
    { id: 'drop_2', name: '掉落2倍', multiplier: 2, duration: 3600000, price: 300 },
    { id: 'drop_3', name: '掉落3倍', multiplier: 3, duration: 1800000, price: 500 },
  ],
  spirit: [
    { id: 'spirit_1.5', name: '灵气1.5倍', multiplier: 1.5, duration: 3600000, price: 120 },
    { id: 'spirit_2', name: '灵气2倍', multiplier: 2, duration: 3600000, price: 250 },
    { id: 'spirit_3', name: '灵气3倍', multiplier: 3, duration: 1800000, price: 400 },
  ],
  skill: [
    { id: 'skill_1.5', name: '技能经验1.5倍', multiplier: 1.5, duration: 3600000, price: 180 },
    { id: 'skill_2', name: '技能经验2倍', multiplier: 2, duration: 3600000, price: 350 },
    { id: 'skill_3', name: '技能经验3倍', multiplier: 3, duration: 1800000, price: 550 },
  ],
};

// 初始化玩家多倍收益数据
function initMultiplier(playerId: string): MultiplierConfig {
  const config: MultiplierConfig = {
    playerId,
    expMultiplier: 1,
    dropMultiplier: 1,
    spiritMultiplier: 1,
    skillMultiplier: 1,
    activeUntil: 0,
    purchasedMultipliers: {
      exp: 0,
      drop: 0,
      spirit: 0,
      skill: 0,
    },
    totalSpent: 0,
  };
  multiplierStore.set(playerId, config);
  return config;
}

// 获取当前收益倍率
router.get('/multiplier/:playerId', (req: Request, res: Response) => {
  const { playerId } = req.params;
  
  let config = multiplierStore.get(playerId);
  if (!config) {
    config = initMultiplier(playerId);
  }
  
  const now = Date.now();
  const isActive = config.activeUntil > now;
  
  res.json({
    success: true,
    data: {
      expMultiplier: config.expMultiplier,
      dropMultiplier: config.dropMultiplier,
      spiritMultiplier: config.spiritMultiplier,
      skillMultiplier: config.skillMultiplier,
      isActive,
      activeUntil: config.activeUntil,
      remainingTime: isActive ? Math.max(0, config.activeUntil - now) : 0,
    }
  });
});

// 获取多倍收益商品列表
router.get('/multiplier/items', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: MULTIPLIER_ITEMS
  });
});

// 购买多倍收益
router.post('/multiplier/purchase', (req: Request, res: Response) => {
  const { playerId, itemId, type } = req.body;
  
  if (!playerId || !itemId || !type) {
    return res.json({ success: false, message: '参数不完整' });
  }
  
  // 查找商品
  const items = MULTIPLIER_ITEMS[type as keyof typeof MULTIPLIER_ITEMS];
  if (!items) {
    return res.json({ success: false, message: '无效的多倍类型' });
  }
  
  const item = items.find(i => i.id === itemId);
  if (!item) {
    return res.json({ success: false, message: '商品不存在' });
  }
  
  // 模拟扣费（实际应检查玩家元宝）
  let config = multiplierStore.get(playerId);
  if (!config) {
    config = initMultiplier(playerId);
  }
  
  // 应用多倍增益
  const now = Date.now();
  const newActiveUntil = Math.max(config.activeUntil, now) + item.duration;
  
  switch (type) {
    case 'exp':
      config.expMultiplier = Math.max(config.expMultiplier, item.multiplier);
      break;
    case 'drop':
      config.dropMultiplier = Math.max(config.dropMultiplier, item.multiplier);
      break;
    case 'spirit':
      config.spiritMultiplier = Math.max(config.spiritMultiplier, item.multiplier);
      break;
    case 'skill':
      config.skillMultiplier = Math.max(config.skillMultiplier, item.multiplier);
      break;
  }
  
  config.activeUntil = newActiveUntil;
  config.totalSpent += item.price;
  config.purchasedMultipliers[type as keyof typeof config.purchasedMultipliers]++;
  multiplierStore.set(playerId, config);
  
  res.json({
    success: true,
    message: `成功购买 ${item.name}`,
    data: {
      type,
      multiplier: item.multiplier,
      duration: item.duration,
      activeUntil: newActiveUntil,
      totalSpent: config.totalSpent,
    }
  });
});

// 计算收益（实际战斗/任务中调用）
router.post('/multiplier/calculate', (req: Request, res: Response) => {
  const { playerId, baseExp, baseDrop, baseSpirit, baseSkillExp } = req.body;
  
  if (!playerId) {
    return res.json({ success: false, message: '玩家ID不能为空' });
  }
  
  let config = multiplierStore.get(playerId);
  if (!config) {
    config = initMultiplier(playerId);
  }
  
  const now = Date.now();
  const isActive = config.activeUntil > now;
  
  if (!isActive) {
    // 多倍收益未激活，返回基础收益
    return res.json({
      success: true,
      data: {
        exp: baseExp || 0,
        drop: baseDrop || 0,
        spirit: baseSpirit || 0,
        skillExp: baseSkillExp || 0,
        multiplier: 1,
      }
    });
  }
  
  // 计算加成后的收益
  const result = {
    exp: Math.floor((baseExp || 0) * config.expMultiplier),
    drop: Math.floor((baseDrop || 0) * config.dropMultiplier),
    spirit: Math.floor((baseSpirit || 0) * config.spiritMultiplier),
    skillExp: Math.floor((baseSkillExp || 0) * config.skillMultiplier),
    multiplier: {
      exp: config.expMultiplier,
      drop: config.dropMultiplier,
      spirit: config.spiritMultiplier,
      skill: config.skillMultiplier,
    },
    remainingTime: config.activeUntil - now,
  };
  
  res.json({
    success: true,
    data: result
  });
});

// 激活多倍收益卡（道具使用）
router.post('/multiplier/activate', (req: Request, res: Response) => {
  const { playerId, cardType, duration } = req.body;
  
  if (!playerId || !cardType || !duration) {
    return res.json({ success: false, message: '参数不完整' });
  }
  
  let config = multiplierStore.get(playerId);
  if (!config) {
    config = initMultiplier(playerId);
  }
  
  const now = Date.now();
  const multiplierMap: Record<string, number> = {
    'exp_1.5': 1.5,
    'exp_2': 2,
    'exp_3': 3,
    'drop_1.5': 1.5,
    'drop_2': 2,
    'drop_3': 3,
    'spirit_1.5': 1.5,
    'spirit_2': 2,
    'spirit_3': 3,
    'skill_1.5': 1.5,
    'skill_2': 2,
    'skill_3': 3,
  };
  
  const multiplier = multiplierMap[cardType];
  if (!multiplier) {
    return res.json({ success: false, message: '无效的卡片类型' });
  }
  
  // 根据类型激活对应的多倍
  if (cardType.startsWith('exp')) {
    config.expMultiplier = multiplier;
  } else if (cardType.startsWith('drop')) {
    config.dropMultiplier = multiplier;
  } else if (cardType.startsWith('spirit')) {
    config.spiritMultiplier = multiplier;
  } else if (cardType.startsWith('skill')) {
    config.skillMultiplier = multiplier;
  }
  
  config.activeUntil = Math.max(config.activeUntil, now) + duration;
  multiplierStore.set(playerId, config);
  
  res.json({
    success: true,
    message: `成功激活 ${cardType}`,
    data: {
      activeUntil: config.activeUntil,
      remainingTime: duration,
    }
  });
});

// 获取VIP多倍加成
router.get('/multiplier/vip/:playerId', (req: Request, res: Response) => {
  const { playerId } = req.params;
  
  // 模拟VIP等级（实际应从玩家数据获取）
  const vipLevel = 1; // 假设VIP1
  
  const vipBonus = {
    0: { exp: 1, drop: 1, spirit: 1, skill: 1 },
    1: { exp: 1.1, drop: 1.05, spirit: 1.1, skill: 1.05 },
    2: { exp: 1.2, drop: 1.1, spirit: 1.2, skill: 1.1 },
    3: { exp: 1.3, drop: 1.15, spirit: 1.3, skill: 1.15 },
    4: { exp: 1.5, drop: 1.2, spirit: 1.5, skill: 1.2 },
    5: { exp: 2, drop: 1.5, spirit: 2, skill: 1.5 },
  };
  
  const bonus = vipBonus[vipLevel as keyof typeof vipBonus] || vipBonus[0];
  
  res.json({
    success: true,
    data: {
      vipLevel,
      bonus,
      description: `VIP${vipLevel}享${bonus.exp}倍经验加成`
    }
  });
});

export default router;
