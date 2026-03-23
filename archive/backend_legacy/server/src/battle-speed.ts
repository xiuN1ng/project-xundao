/**
 * 战斗加速系统 (Battle Speed System)
 * 提供战斗加速功能，包括速度配置、状态管理、经验/奖励计算、时间计算
 */

import express, { Request, Response } from 'express';
import Database from 'better-sqlite3';

// 战斗速度配置
export const BATTLE_SPEED_CONFIG = {
  // 速度等级定义
  speeds: {
    1: { 
      name: '正常速度', 
      multiplier: 1, 
      description: '正常战斗速度',
      expMultiplier: 1.0,
      rewardMultiplier: 1.0,
      timeMultiplier: 1.0
    },
    2: { 
      name: '2倍速', 
      multiplier: 2, 
      description: '战斗速度提升至2倍',
      expMultiplier: 1.0,
      rewardMultiplier: 1.0,
      timeMultiplier: 0.5
    },
    3: { 
      name: '3倍速', 
      multiplier: 3, 
      description: '战斗速度提升至3倍',
      expMultiplier: 1.1,  // 额外10%经验
      rewardMultiplier: 1.1, // 额外10%奖励
      timeMultiplier: 0.33
    },
    4: { 
      name: '4倍速', 
      multiplier: 4, 
      description: '战斗速度提升至4倍',
      expMultiplier: 1.2,  // 额外20%经验
      rewardMultiplier: 1.2, // 额外20%奖励
      timeMultiplier: 0.25
    },
    5: { 
      name: '5倍速', 
      multiplier: 5, 
      description: '战斗速度提升至5倍',
      expMultiplier: 1.3,  // 额外30%经验
      rewardMultiplier: 1.3, // 额外30%奖励
      timeMultiplier: 0.2
    },
    10: { 
      name: '10倍速', 
      multiplier: 10, 
      description: '战斗速度提升至10倍',
      expMultiplier: 1.5,  // 额外50%经验
      rewardMultiplier: 1.5, // 额外50%奖励
      timeMultiplier: 0.1
    }
  },
  
  // 加速战斗消耗配置
  cost: {
    // 每次加速战斗消耗的灵石（基础值）
    baseSpiritStones: 10,
    // 每提升1倍速额外消耗
    perSpeedMultiplier: 5,
    // 每日免费加速次数
    freeDailyUses: 0,
    // VIP额外加速次数
    vipBonusUses: {
      1: 5,
      2: 10,
      3: 20,
      4: 30,
      5: 50
    }
  },
  
  // 加速战斗冷却时间（毫秒）
  cooldown: 0,
  
  // 加速战斗时间段配置
  timeWindows: {
    // 全天可用
    always: { start: '00:00', end: '23:59' },
    // 周末加成
    weekend: { start: '00:00', end: '23:59', bonus: 0.2 }
  }
};

// 战斗加速状态
export interface BattleSpeedState {
  playerId: number;
  currentSpeed: number;
  todayUses: number;
  lastBattleTime: string;
  totalAcceleratedBattles: number;
  totalExpEarned: number;
  totalRewardsEarned: number;
}

// 加速战斗结果
export interface AcceleratedBattleResult {
  success: boolean;
  battleId: string;
  speed: number;
  // 实际战斗时间（毫秒）
  actualBattleTime: number;
  // 原始战斗时间（毫秒）
  originalBattleTime: number;
  // 节省的时间（毫秒）
  savedTime: number;
  // 获得的经验
  expGained: number;
  // 原始经验
  baseExpGained: number;
  // 额外经验
  bonusExpGained: number;
  // 获得的奖励
  rewards: {
    spiritStones: number;
    items: Array<{ itemId: string; name: string; quantity: number }>;
  };
  // 原始奖励
  baseRewards: {
    spiritStones: number;
    items: Array<{ itemId: string; name: string; quantity: number }>;
  };
  // 额外奖励
  bonusRewards: {
    spiritStones: number;
    items: Array<{ itemId: string; name: string; quantity: number }>;
  };
  // 消耗
  cost: {
    spiritStones: number;
  };
  // 时间戳
  timestamp: string;
}

// 路由器
const router = express.Router();

// 初始化战斗加速数据库
export function initBattleSpeedDatabase(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS battle_speed_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL UNIQUE,
      current_speed INTEGER DEFAULT 1,
      today_uses INTEGER DEFAULT 0,
      last_battle_time DATETIME,
      total_accelerated_battles INTEGER DEFAULT 0,
      total_exp_earned INTEGER DEFAULT 0,
      total_rewards_earned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS battle_speed_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      speed INTEGER NOT NULL,
      battle_duration INTEGER DEFAULT 0,
      exp_gained INTEGER DEFAULT 0,
      rewards_gained TEXT,
      cost_spirit_stones INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 索引优化
  db.exec(`CREATE INDEX IF NOT EXISTS idx_battle_speed_player ON battle_speed_state(player_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_battle_speed_history_player ON battle_speed_history(player_id)`);

  console.log('✅ 战斗加速系统数据库初始化完成');
}

// 获取玩家战斗加速状态
export function getBattleSpeedState(db: Database.Database, playerId: number): BattleSpeedState {
  let state = db.prepare('SELECT * FROM battle_speed_state WHERE player_id = ?').get(playerId) as BattleSpeedState | undefined;
  
  if (!state) {
    // 创建新状态
    const result = db.prepare(`
      INSERT INTO battle_speed_state (player_id, current_speed, today_uses, total_accelerated_battles)
      VALUES (?, 1, 0, 0)
    `).run(playerId);
    
    state = {
      playerId: playerId,
      currentSpeed: 1,
      todayUses: 0,
      lastBattleTime: '',
      totalAcceleratedBattles: 0,
      totalExpEarned: 0,
      totalRewardsEarned: 0
    };
  }
  
  // 检查是否需要重置每日次数
  const today = new Date().toISOString().split('T')[0];
  const lastDate = state.lastBattleTime ? state.lastBattleTime.split('T')[0] : null;
  
  if (lastDate !== today) {
    db.prepare(`
      UPDATE battle_speed_state 
      SET today_uses = 0, updated_at = CURRENT_TIMESTAMP 
      WHERE player_id = ?
    `).run(playerId);
    state.todayUses = 0;
  }
  
  return state;
}

// 获取速度配置
export function getSpeedConfig(speed: number) {
  return BATTLE_SPEED_CONFIG.speeds[speed] || BATTLE_SPEED_CONFIG.speeds[1];
}

// 计算加速战斗消耗
export function calculateBattleSpeedCost(speed: number, vipLevel: number = 0): number {
  const baseCost = BATTLE_SPEED_CONFIG.cost.baseSpiritStones;
  const perSpeedCost = BATTLE_SPEED_CONFIG.cost.perSpeedMultiplier;
  const baseCostTotal = baseCost + (speed - 1) * perSpeedCost;
  
  // VIP折扣
  const discount = Math.min(vipLevel * 0.1, 0.5); // 最高50%折扣
  return Math.floor(baseCostTotal * (1 - discount));
}

// 计算加速战斗时间
export function calculateBattleTime(originalTime: number, speed: number): {
  actualTime: number;
  savedTime: number;
  originalTime: number;
} {
  const config = getSpeedConfig(speed);
  const actualTime = Math.max(100, Math.floor(originalTime * config.timeMultiplier)); // 最低100ms
  const savedTime = originalTime - actualTime;
  
  return {
    actualTime,
    savedTime,
    originalTime
  };
}

// 计算加速战斗经验和奖励
export function calculateAcceleratedRewards(
  baseExp: number,
  baseRewards: { spiritStones: number; items: Array<{ itemId: string; name: string; quantity: number }> },
  speed: number
): {
  exp: {
    base: number;
    bonus: number;
    total: number;
  };
  rewards: {
    base: { spiritStones: number; items: Array<{ itemId: string; name: string; quantity: number }> };
    bonus: { spiritStones: number; items: Array<{ itemId: string; name: string; quantity: number }> };
    total: { spiritStones: number; items: Array<{ itemId: string; name: string; quantity: number }> };
  };
} {
  const config = getSpeedConfig(speed);
  
  // 经验计算
  const bonusExp = Math.floor(baseExp * (config.expMultiplier - 1));
  const totalExp = baseExp + bonusExp;
  
  // 奖励计算
  const bonusSpiritStones = Math.floor(baseRewards.spiritStones * (config.rewardMultiplier - 1));
  const totalSpiritStones = baseRewards.spiritStones + bonusSpiritStones;
  
  // 物品奖励（随机额外掉落）
  const bonusItems: Array<{ itemId: string; name: string; quantity: number }> = [];
  if (speed >= 3 && Math.random() < (config.rewardMultiplier - 1)) {
    // 3倍及以上速度有概率获得额外物品
    const bonusItemPool = [
      { itemId: 'spirit_pill', name: '灵气丹', quantity: Math.floor(speed / 2) },
      { itemId: 'exp_book', name: '经验心得', quantity: 1 }
    ];
    bonusItems.push(bonusItemPool[Math.floor(Math.random() * bonusItemPool.length)]);
  }
  
  return {
    exp: {
      base: baseExp,
      bonus: bonusExp,
      total: totalExp
    },
    rewards: {
      base: { ...baseRewards },
      bonus: {
        spiritStones: bonusSpiritStones,
        items: bonusItems
      },
      total: {
        spiritStones: totalSpiritStones,
        items: [...baseRewards.items, ...bonusItems]
      }
    }
  };
}

// 执行加速战斗
export function executeAcceleratedBattle(
  db: Database.Database,
  playerId: number,
  speed: number,
  originalBattleTime: number,
  baseExp: number,
  baseRewards: { spiritStones: number; items: Array<{ itemId: string; name: string; quantity: number }> }
): AcceleratedBattleResult {
  // 验证速度配置
  const speedConfig = getSpeedConfig(speed);
  if (!speedConfig) {
    throw new Error(`无效的战斗速度: ${speed}`);
  }
  
  // 获取玩家状态
  const state = getBattleSpeedState(db, playerId);
  
  // 获取玩家VIP等级
  const player = db.prepare('SELECT vip_level, spirit_stones FROM player WHERE id = ?').get(playerId) as { vip_level: number; spirit_stones: number } | undefined;
  const vipLevel = player?.vip_level || 0;
  
  // 计算消耗
  const cost = calculateBattleSpeedCost(speed, vipLevel);
  
  // 检查灵石是否足够
  if (player && player.spirit_stones < cost) {
    throw new Error(`灵石不足，需要 ${cost} 灵石`);
  }
  
  // 计算时间
  const timeResult = calculateBattleTime(originalBattleTime, speed);
  
  // 计算经验和奖励
  const rewardResult = calculateAcceleratedRewards(baseExp, baseRewards, speed);
  
  // 扣除灵石
  if (player) {
    db.prepare('UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?').run(cost, playerId);
  }
  
  // 更新玩家状态
  db.prepare(`
    UPDATE battle_speed_state 
    SET current_speed = ?,
        today_uses = today_uses + 1,
        last_battle_time = CURRENT_TIMESTAMP,
        total_accelerated_battles = total_accelerated_battles + 1,
        total_exp_earned = total_exp_earned + ?,
        total_rewards_earned = total_rewards_earned + ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE player_id = ?
  `).run(speed, rewardResult.exp.total, rewardResult.rewards.total.spiritStones, playerId);
  
  // 记录历史
  db.prepare(`
    INSERT INTO battle_speed_history 
    (player_id, speed, battle_duration, exp_gained, rewards_gained, cost_spirit_stones)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    playerId,
    speed,
    timeResult.actualTime,
    rewardResult.exp.total,
    JSON.stringify(rewardResult.rewards.total),
    cost
  );
  
  // 更新玩家经验和等级
  if (baseExp > 0) {
    db.prepare('UPDATE player SET experience = experience + ? WHERE id = ?').run(rewardResult.exp.total, playerId);
  }
  
  return {
    success: true,
    battleId: `battle_${Date.now()}_${playerId}`,
    speed,
    actualBattleTime: timeResult.actualTime,
    originalBattleTime: timeResult.originalTime,
    savedTime: timeResult.savedTime,
    expGained: rewardResult.exp.total,
    baseExpGained: rewardResult.exp.base,
    bonusExpGained: rewardResult.exp.bonus,
    rewards: rewardResult.rewards.total,
    baseRewards: rewardResult.rewards.base,
    bonusRewards: rewardResult.rewards.bonus,
    cost: { spiritStones: cost },
    timestamp: new Date().toISOString()
  };
}

// ============ API 路由 ============

// GET /api/battle/speed/config - 获取战斗加速配置
router.get('/config', (req: Request, res: Response) => {
  try {
    const { player_id } = req.query;
    
    // 构建速度配置列表
    const speeds = Object.entries(BATTLE_SPEED_CONFIG.speeds).map(([key, config]) => ({
      speed: parseInt(key),
      name: config.name,
      description: config.description,
      expMultiplier: config.expMultiplier,
      rewardMultiplier: config.rewardMultiplier,
      timeMultiplier: config.timeMultiplier
    }));
    
    res.json({
      success: true,
      data: {
        speeds,
        cost: BATTLE_SPEED_CONFIG.cost,
        cooldown: BATTLE_SPEED_CONFIG.cooldown,
        timeWindows: BATTLE_SPEED_CONFIG.timeWindows
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /api/battle/speed/status - 获取玩家战斗加速状态
router.get('/status', (req: Request, res: Response) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id 参数' });
    }
    
    // 获取或创建玩家
    let player = db.prepare('SELECT id, vip_level, spirit_stones FROM player WHERE id = ?').get(player_id);
    let actualPlayerId = player_id;
    
    if (!player) {
      const result = db.prepare('INSERT INTO player (username, spirit_stones, level, realm_level) VALUES (?, ?, ?, ?)').run(`player_${player_id}`, 10000, 1, 0);
      actualPlayerId = result.lastInsertRowid as number;
      player = db.prepare('SELECT id, vip_level, spirit_stones FROM player WHERE id = ?').get(actualPlayerId);
    }
    
    // 获取战斗加速状态
    const state = getBattleSpeedState(db, actualPlayerId);
    
    // 获取VIP额外加速次数
    const vipLevel = (player as { vip_level: number }).vip_level || 0;
    const vipBonusUses = BATTLE_SPEED_CONFIG.cost.vipBonusUses[vipLevel] || 0;
    const totalDailyUses = BATTLE_SPEED_CONFIG.cost.freeDailyUses + vipBonusUses;
    
    // 计算当前速度配置
    const currentSpeedConfig = getSpeedConfig(state.currentSpeed);
    
    // 估算下次加速消耗
    const nextCost = calculateBattleSpeedCost(state.currentSpeed + 1, vipLevel);
    
    res.json({
      success: true,
      data: {
        player: {
          id: actualPlayerId,
          vip_level: vipLevel,
          spirit_stones: (player as { spirit_stones: number }).spirit_stones
        },
        current_speed: state.currentSpeed,
        speed_config: currentSpeedConfig,
        today_uses: state.todayUses,
        total_daily_uses: totalDailyUses,
        remaining_daily_uses: Math.max(0, totalDailyUses - state.todayUses),
        next_speed_cost: nextCost,
        last_battle_time: state.lastBattleTime,
        stats: {
          total_accelerated_battles: state.totalAcceleratedBattles,
          total_exp_earned: state.totalExpEarned,
          total_rewards_earned: state.totalRewardsEarned
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /api/battle/speed/set - 设置战斗速度
router.post('/set', (req: Request, res: Response) => {
  try {
    const { player_id, speed } = req.body;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id 参数' });
    }
    
    if (!speed || !BATTLE_SPEED_CONFIG.speeds[speed]) {
      return res.status(400).json({ success: false, error: '无效的速度等级' });
    }
    
    // 获取或创建玩家
    let player = db.prepare('SELECT id, vip_level, spirit_stones FROM player WHERE id = ?').get(player_id);
    let actualPlayerId = player_id;
    
    if (!player) {
      const result = db.prepare('INSERT INTO player (username, spirit_stones, level, realm_level) VALUES (?, ?, ?, ?)').run(`player_${player_id}`, 10000, 1, 0);
      actualPlayerId = result.lastInsertRowid as number;
    }
    
    // 更新速度设置
    db.prepare(`
      UPDATE battle_speed_state 
      SET current_speed = ?, updated_at = CURRENT_TIMESTAMP
      WHERE player_id = ?
    `).run(speed, actualPlayerId);
    
    const speedConfig = getSpeedConfig(speed);
    
    res.json({
      success: true,
      message: `战斗速度已设置为 ${speedConfig.name}`,
      data: {
        current_speed: speed,
        speed_config: speedConfig
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /api/battle/speed/battle - 执行加速战斗
router.post('/battle', (req: Request, res: Response) => {
  try {
    const { player_id, speed, original_battle_time, base_exp, base_spirit_stones, items } = req.body;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id 参数' });
    }
    
    const battleSpeed = speed || 1;
    
    if (!BATTLE_SPEED_CONFIG.speeds[battleSpeed]) {
      return res.status(400).json({ success: false, error: '无效的速度等级' });
    }
    
    // 默认值
    const battleTime = original_battle_time || 60000; // 默认1分钟
    const exp = base_exp || 100;
    const spiritStones = base_spirit_stones || 10;
    const battleItems = items || [];
    
    // 获取玩家状态检查次数限制
    const state = getBattleSpeedState(db, player_id);
    const vipLevel = (db.prepare('SELECT vip_level FROM player WHERE id = ?').get(player_id) as { vip_level: number })?.vip_level || 0;
    const vipBonusUses = BATTLE_SPEED_CONFIG.cost.vipBonusUses[vipLevel] || 0;
    const totalDailyUses = BATTLE_SPEED_CONFIG.cost.freeDailyUses + vipBonusUses;
    
    // 检查次数限制（仅对加速战斗）
    if (battleSpeed > 1 && state.todayUses >= totalDailyUses) {
      return res.status(400).json({ 
        success: false, 
        error: '今日加速次数已用完',
        data: {
          today_uses: state.todayUses,
          total_daily_uses: totalDailyUses,
          vip_level: vipLevel,
          vip_bonus_uses: vipBonusUses
        }
      });
    }
    
    // 执行加速战斗
    const result = executeAcceleratedBattle(
      db,
      player_id,
      battleSpeed,
      battleTime,
      exp,
      { spiritStones, items: battleItems }
    );
    
    res.json({
      success: true,
      message: `加速战斗完成！速度: ${battleSpeed}x，节省时间: ${(result.savedTime / 1000).toFixed(1)}秒`,
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /api/battle/speed/history - 获取加速战斗历史
router.get('/history', (req: Request, res: Response) => {
  try {
    const { player_id, limit = 20 } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id 参数' });
    }
    
    const history = db.prepare(`
      SELECT * FROM battle_speed_history 
      WHERE player_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(player_id, limit);
    
    const parsedHistory = history.map((record: any) => ({
      ...record,
      rewards_gained: record.rewards_gained ? JSON.parse(record.rewards_gained) : null
    }));
    
    // 统计信息
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_battles,
        SUM(exp_gained) as total_exp,
        SUM(cost_spirit_stones) as total_cost
      FROM battle_speed_history 
      WHERE player_id = ?
    `).get(player_id) as { total_battles: number; total_exp: number; total_cost: number };
    
    res.json({
      success: true,
      data: {
        history: parsedHistory,
        stats: {
          total_battles: stats.total_battles || 0,
          total_exp: stats.total_exp || 0,
          total_cost: stats.total_cost || 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /api/battle/speed/reset-daily - 重置每日次数（仅管理员或系统）
router.post('/reset-daily', (req: Request, res: Response) => {
  try {
    const { player_id, admin_key } = req.body;
    
    // 简单的管理员验证（实际应该使用更安全的方式）
    if (admin_key !== 'admin_secret_key') {
      return res.status(403).json({ success: false, error: '无权限执行此操作' });
    }
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id 参数' });
    }
    
    db.prepare(`
      UPDATE battle_speed_state 
      SET today_uses = 0, updated_at = CURRENT_TIMESTAMP
      WHERE player_id = ?
    `).run(player_id);
    
    res.json({
      success: true,
      message: '每日加速次数已重置',
      data: { player_id }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 计算器：预估加速收益
router.get('/preview', (req: Request, res: Response) => {
  try {
    const { speed, original_time, base_exp, base_spirit_stones } = req.query;
    
    const battleSpeed = parseInt(speed as string) || 1;
    const battleTime = parseInt(original_time as string) || 60000;
    const exp = parseInt(base_exp as string) || 100;
    const spiritStones = parseInt(base_spirit_stones as string) || 10;
    
    if (!BATTLE_SPEED_CONFIG.speeds[battleSpeed]) {
      return res.status(400).json({ success: false, error: '无效的速度等级' });
    }
    
    const timeResult = calculateBattleTime(battleTime, battleSpeed);
    const rewardResult = calculateAcceleratedRewards(exp, { spiritStones, items: [] }, battleSpeed);
    const cost = calculateBattleSpeedCost(battleSpeed, 0); // 默认非VIP
    
    res.json({
      success: true,
      data: {
        speed: battleSpeed,
        speed_config: getSpeedConfig(battleSpeed),
        time: timeResult,
        rewards: rewardResult,
        cost: { spiritStones: cost },
        summary: {
          time_saved_seconds: (timeResult.savedTime / 1000).toFixed(1),
          exp_bonus: `+${Math.round((BATTLE_SPEED_CONFIG.speeds[battleSpeed].expMultiplier - 1) * 100)}%`,
          reward_bonus: `+${Math.round((BATTLE_SPEED_CONFIG.speeds[battleSpeed].rewardMultiplier - 1) * 100)}%`,
          cost_per_battle: cost
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 全局数据库变量（由server.js设置）
let db: Database.Database;

// 导出初始化函数
export function initBattleSpeed(dbInstance: Database.Database) {
  db = dbInstance;
  initBattleSpeedDatabase(db);
  console.log('✅ 战斗加速系统已加载');
}

export default router;
