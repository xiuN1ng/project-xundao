/**
 * 福利系统 API (Welfare System API)
 * 签到系统、次日登录奖励、三日登录奖励
 */

import express, { Request, Response } from 'express';
import Database from 'better-sqlite3';
import { signinSystem, SigninData } from './signin/signin-system';

const router = express.Router();

// 全局数据库变量（由server.js设置）
let db: Database.Database;

/**
 * 初始化福利系统
 */
function initWelfareApi(dbInstance: Database.Database) {
  db = dbInstance;
  console.log('✅ 福利系统API已加载');
}

/**
 * 获取玩家数据
 */
function getPlayer(playerId: string) {
  return db.prepare('SELECT * FROM player WHERE id = ?').get(playerId);
}

/**
 * 更新玩家数据
 */
function updatePlayer(playerId: string, updates: Record<string, any>) {
  const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = Object.values(updates);
  return db.prepare(`UPDATE player SET ${fields} WHERE id = ?`).run(...values, playerId);
}

/**
 * 添加道具到玩家背包
 */
function addItemToBackpack(playerId: string, itemId: string, itemName: string, count: number) {
  const existing = db.prepare('SELECT * FROM backpack WHERE player_id = ? AND item_id = ?').get(playerId, itemId);
  
  if (existing) {
    db.prepare('UPDATE backpack SET count = count + ? WHERE player_id = ? AND item_id = ?')
      .run(count, playerId, itemId);
  } else {
    db.prepare('INSERT INTO backpack (player_id, item_id, item_name, count) VALUES (?, ?, ?, ?)')
      .run(playerId, itemId, itemName, count);
  }
}

/**
 * 添加或更新玩家称号
 * @param playerId 玩家ID
 * @param titleId 称号ID（唯一标识）
 * @param titleName 称号显示名称（可选，如果与titleId相同则省略）
 */
function addTitle(playerId: string, titleId: string, titleName?: string) {
  const existing = db.prepare('SELECT * FROM player_titles WHERE player_id = ? AND title_id = ?')
    .get(playerId, titleId);
  
  if (!existing) {
    db.prepare('INSERT INTO player_titles (player_id, title_id) VALUES (?, ?)')
      .run(playerId, titleId);
  }
  
  // 同时更新玩家的当前称号
  const displayTitle = titleName || titleId;
  db.prepare('UPDATE player SET title = ? WHERE id = ?').run(displayTitle, playerId);
}

// ==================== 签到系统 API ====================

// GET /api/welfare/signin-status - 获取签到状态
router.get('/signin-status', (req: Request, res: Response) => {
  try {
    // 支持 player_id 和 playerId 两种参数名
    const player_id = req.query.player_id || req.query.playerId;
    
    if (!player_id) {
      return res.status(400).json({ success: false, message: '缺少 player_id 参数' });
    }
    
    const playerId = player_id as string;
    const player = getPlayer(playerId);
    
    if (!player) {
      return res.status(404).json({ success: false, message: '玩家不存在' });
    }
    
    const status = signinSystem.getSigninStatus(playerId);
    
    res.json({
      success: true,
      message: '获取签到状态成功',
      data: {
        isSignedToday: status.isSignedToday,
        currentStreak: status.currentStreak,
        totalDays: status.totalDays,
        todayReward: status.todayReward,
        nextCumulative: status.nextCumulative,
        claimedRewards: status.claimedRewards,
        remainingMakeups: status.remainingMakeups,
        makeupCost: status.makeupCost,
        availableMakeups: status.availableMakeups
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

// POST /api/welfare/signin - 签到
router.post('/signin', (req: Request, res: Response) => {
  try {
    // 支持 player_id 和 playerId 两种参数名
    const player_id = req.body.player_id || req.body.playerId;
    
    if (!player_id) {
      return res.status(400).json({ success: false, message: '缺少 player_id 参数' });
    }
    
    const playerId = player_id as string;
    const player = getPlayer(playerId) as any;
    
    if (!player) {
      return res.status(404).json({ success: false, message: '玩家不存在' });
    }
    
    // 执行签到
    const result = signinSystem.signin(playerId);
    
    if (!result.success) {
      return res.json({
        success: false,
        message: result.message,
        data: null
      });
    }
    
    // 发放奖励
    const rewards = [];
    
    if (result.reward) {
      // 发放灵石
      if (result.reward.gold > 0) {
        updatePlayer(playerId, { spirit_stones: (player.spirit_stones || 0) + result.reward.gold });
        rewards.push({ type: 'spirit_stones', amount: result.reward.gold });
      }
      
      // 发放经验
      if (result.reward.exp > 0) {
        const newExp = (player.exp || 0) + result.reward.exp;
        const newLevel = calculateLevel(newExp);
        updatePlayer(playerId, { exp: newExp, level: newLevel });
        rewards.push({ type: 'exp', amount: result.reward.exp });
      }
      
      // 发放物品
      for (const item of result.reward.items) {
        addItemToBackpack(playerId, item.id, item.name, item.count);
        rewards.push({ type: 'item', itemId: item.id, itemName: item.name, count: item.count });
      }
    }
    
    // 发放累计签到奖励
    if (result.cumulativeReward) {
      const cumReward = result.cumulativeReward;
      
      if (cumReward.gold > 0) {
        updatePlayer(playerId, { spirit_stones: (player.spirit_stones || 0) + cumReward.gold });
        rewards.push({ type: 'cumulative_spirit_stones', amount: cumReward.gold });
      }
      
      if (cumReward.exp > 0) {
        const newExp = (player.exp || 0) + cumReward.exp;
        const newLevel = calculateLevel(newExp);
        updatePlayer(playerId, { exp: newExp, level: newLevel });
        rewards.push({ type: 'cumulative_exp', amount: cumReward.exp });
      }
      
      for (const item of cumReward.items) {
        addItemToBackpack(playerId, item.id, item.name, item.count);
        rewards.push({ type: 'cumulative_item', itemId: item.id, itemName: item.name, count: item.count });
      }
      
      // 发放累计称号
      if (cumReward.title) {
        addTitle(playerId, cumReward.title, cumReward.title);
        rewards.push({ type: 'title', title: cumReward.title });
      }
    }
    
    res.json({
      success: true,
      message: '签到成功',
      data: {
        streak: result.streak,
        totalDays: result.totalDays,
        rewards: rewards,
        cumulativeReward: result.cumulativeReward ? {
          days: result.cumulativeReward.days,
          title: result.cumulativeReward.title
        } : null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

// GET /api/welfare/rewards - 获取签到奖励配置
router.get('/rewards', (req: Request, res: Response) => {
  try {
    const configs = signinSystem.getRewardConfigs();
    
    res.json({
      success: true,
      message: '获取签到奖励配置成功',
      data: {
        daily: configs.daily,
        cumulative: configs.cumulative
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

// ==================== 次日登录奖励 API ====================

// POST /api/welfare/second-day-reward - 领取次日登录奖励
router.post('/second-day-reward', (req: Request, res: Response) => {
  try {
    // 支持 player_id 和 playerId 两种参数名
    const player_id = req.body.player_id || req.body.playerId;
    
    if (!player_id) {
      return res.status(400).json({ success: false, message: '缺少 player_id 参数' });
    }
    
    const playerId = player_id as string;
    const player = getPlayer(playerId) as any;
    
    if (!player) {
      return res.status(404).json({ success: false, message: '玩家不存在' });
    }
    
    // 检查是否已领取过次日奖励
    const existingReward = db.prepare(
      'SELECT * FROM welfare_rewards WHERE player_id = ? AND reward_type = ?'
    ).get(playerId, 'second_day');
    
    if (existingReward) {
      return res.json({
        success: false,
        message: '次日登录奖励已领取',
        data: null
      });
    }
    
    // 发放奖励：5000灵石 + 专属称号"次日礼"
    const rewards = [];
    
    // 5000灵石
    const spiritStonesReward = 5000;
    updatePlayer(playerId, { spirit_stones: (player.spirit_stones || 0) + spiritStonesReward });
    rewards.push({ type: 'spirit_stones', amount: spiritStonesReward });
    
    // 专属称号"次日礼"
    addTitle(playerId, '次日礼', '次日礼');
    rewards.push({ type: 'title', title: '次日礼' });
    
    // 记录奖励领取
    db.prepare(
      'INSERT INTO welfare_rewards (player_id, reward_type, claimed_at) VALUES (?, ?, ?)'
    ).run(playerId, 'second_day', new Date().toISOString());
    
    res.json({
      success: true,
      message: '次日登录奖励领取成功',
      data: {
        rewards: rewards,
        description: '获得5000灵石 + 专属称号"次日礼"'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

// ==================== 三日登录奖励 API ====================

// POST /api/welfare/third-day-reward - 领取三日登录奖励
router.post('/third-day-reward', (req: Request, res: Response) => {
  try {
    // 支持 player_id 和 playerId 两种参数名
    const player_id = req.body.player_id || req.body.playerId;
    
    if (!player_id) {
      return res.status(400).json({ success: false, message: '缺少 player_id 参数' });
    }
    
    const playerId = player_id as string;
    const player = getPlayer(playerId) as any;
    
    if (!player) {
      return res.status(404).json({ success: false, message: '玩家不存在' });
    }
    
    // 检查是否已领取过三日奖励
    const existingReward = db.prepare(
      'SELECT * FROM welfare_rewards WHERE player_id = ? AND reward_type = ?'
    ).get(playerId, 'third_day');
    
    if (existingReward) {
      return res.json({
        success: false,
        message: '三日登录奖励已领取',
        data: null
      });
    }
    
    // 发放奖励：灵根觉醒石×1 + 紫色功法箱×1 + 终身月卡体验卡×3天
    const rewards = [];
    
    // 灵根觉醒石×1
    addItemToBackpack(playerId, 'root_awakening_stone', '灵根觉醒石', 1);
    rewards.push({ type: 'item', itemId: 'root_awakening_stone', itemName: '灵根觉醒石', count: 1 });
    
    // 紫色功法箱×1
    addItemToBackpack(playerId, 'purple_skill_box', '紫色功法箱', 1);
    rewards.push({ type: 'item', itemId: 'purple_skill_box', itemName: '紫色功法箱', count: 1 });
    
    // 终身月卡体验卡×3天 - 记录到player表或单独的表中
    // 这里我们使用vip相关字段或添加月卡天数
    const currentMonthlyCard = player.monthly_card_days || 0;
    updatePlayer(playerId, { monthly_card_days: currentMonthlyCard + 3 });
    rewards.push({ type: 'monthly_card', days: 3 });
    
    // 记录奖励领取
    db.prepare(
      'INSERT INTO welfare_rewards (player_id, reward_type, claimed_at) VALUES (?, ?, ?)'
    ).run(playerId, 'third_day', new Date().toISOString());
    
    res.json({
      success: true,
      message: '三日登录奖励领取成功',
      data: {
        rewards: rewards,
        description: '获得灵根觉醒石×1 + 紫色功法箱×1 + 终身月卡体验卡×3天'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

// ==================== 福利奖励状态 API ====================

// GET /api/welfare/claim-status - 获取福利奖励领取状态
router.get('/claim-status', (req: Request, res: Response) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, message: '缺少 player_id 参数' });
    }
    
    const playerId = player_id as string;
    const player = getPlayer(playerId);
    
    if (!player) {
      return res.status(404).json({ success: false, message: '玩家不存在' });
    }
    
    // 获取已领取的福利奖励
    const claimedRewards = db.prepare(
      'SELECT reward_type, claimed_at FROM welfare_rewards WHERE player_id = ?'
    ).all(playerId) as Array<{ reward_type: string; claimed_at: string }>;
    
    const claimed = claimedRewards.map(r => r.reward_type);
    
    res.json({
      success: true,
      message: '获取福利领取状态成功',
      data: {
        secondDayClaimed: claimed.includes('second_day'),
        thirdDayClaimed: claimed.includes('third_day'),
        claimedList: claimedRewards
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

// ==================== 辅助函数 ====================

/**
 * 根据经验计算等级
 * 简化版：每1000经验升一级
 */
function calculateLevel(exp: number): number {
  return Math.floor(exp / 1000) + 1;
}

export default router;
export { initWelfareApi };

// 兼容 CommonJS 导出
module.exports = router;
module.exports.initWelfareApi = initWelfareApi;
