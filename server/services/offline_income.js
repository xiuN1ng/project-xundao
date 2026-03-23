/**
 * 离线收益系统
 * 玩家离线期间根据修炼效率获得收益
 */

let db;
function getDb() {
  if (!db) {
    const Database = require('better-sqlite3');
    const path = require('path');
    const dbPath = path.join(__dirname, '..', 'data', 'game.db');
    db = new Database(dbPath);
  }
  return db;
}

// 初始化离线收益相关表
function initOfflineIncomeTable() {
  const database = getDb();
  
  // 检查并添加离线收益相关字段
  try {
    // 添加 last_logout_at 字段
    database.exec(`
      ALTER TABLE player ADD COLUMN last_logout_at DATETIME
    `);
  } catch (e) {
    // 字段已存在，忽略
  }
  
  try {
    // 添加 offline_income_claimed 字段
    database.exec(`
      ALTER TABLE player ADD COLUMN offline_income_claimed DATETIME
    `);
  } catch (e) {
    // 字段已存在，忽略
  }
  
  console.log('✅ 离线收益表初始化完成');
}

// 离线收益配置
const OFFLINE_CONFIG = {
  // 最大离线时间（小时）
  max_offline_hours: 24,
  // 基础收益（灵石/小时）
  base_income: 10,
  // 等级加成（每级增加）
  level_bonus: 5,
  // 境界加成
  realm_bonus: {
    1: 0,    // 凡人
    2: 50,   // 练气
    3: 150,  // 筑基
    4: 400,  // 金丹
    5: 1000, // 元婴
    6: 2500, // 化神
    7: 6000, // 炼虚
    8: 15000 // 大乘
  },
  // VIP加成（百分比）
  vip_bonus: {
    0: 0,
    1: 10,
    2: 20,
    3: 30,
    4: 50,
    5: 75,
    6: 100,
    7: 150,
    8: 200,
    9: 300,
    10: 500
  }
};

// 计算离线收益
function calculateOfflineIncome(playerId) {
  const database = getDb();
  
  // 获取玩家信息
  const player = database.prepare(`
    SELECT p.*, 
           COALESCE(p.last_logout_at, p.created_at) as last_active_at,
           COALESCE(p.offline_income_claimed, p.created_at) as last_claimed_at
    FROM player p 
    WHERE p.id = ?
  `).get(playerId);
  
  if (!player) {
    return { success: false, error: '玩家不存在' };
  }
  
  const now = new Date();
  const lastLogout = new Date(player.last_active_at);
  
  // 计算离线时长（小时）
  const offlineMs = now - lastLogout;
  const offlineHours = offlineMs / (1000 * 60 * 60);
  
  // 限制最大离线时间
  const effectiveHours = Math.min(offlineHours, OFFLINE_CONFIG.max_offline_hours);
  
  if (effectiveHours < 1) {
    return {
      success: true,
      data: {
        offline_hours: 0,
        income: 0,
        message: '离线时间不足1小时'
      }
    };
  }
  
  // 计算收益
  const baseIncome = OFFLINE_CONFIG.base_income;
  const levelBonus = player.level * OFFLINE_CONFIG.level_bonus;
  const realmBonus = OFFLINE_CONFIG.realm_bonus[player.realm_level] || 0;
  const vipBonus = (OFFLINE_CONFIG.vip_bonus[player.vip_level] || 0) / 100;
  
  // 每小时基础收益
  const hourlyIncome = baseIncome + levelBonus + realmBonus;
  // VIP加成
  const totalHourlyIncome = hourlyIncome * (1 + vipBonus);
  // 总收益
  const totalIncome = Math.floor(totalHourlyIncome * effectiveHours);
  
  return {
    success: true,
    data: {
      offline_hours: Math.floor(effectiveHours * 10) / 10,
      effective_hours: Math.floor(effectiveHours * 10) / 10,
      base_income: baseIncome,
      level_bonus: levelBonus,
      realm_bonus: realmBonus,
      vip_bonus_percent: OFFLINE_CONFIG.vip_bonus[player.vip_level] || 0,
      hourly_income: Math.floor(totalHourlyIncome),
      total_income: totalIncome,
      max_hours: OFFLINE_CONFIG.max_offline_hours
    }
  };
}

// 领取离线收益
function claimOfflineIncome(playerId) {
  const database = getDb();
  
  // 获取玩家信息
  const player = database.prepare(`
    SELECT p.*, 
           COALESCE(p.last_logout_at, p.created_at) as last_active_at,
           COALESCE(p.offline_income_claimed, p.created_at) as last_claimed_at
    FROM player p 
    WHERE p.id = ?
  `).get(playerId);
  
  if (!player) {
    return { success: false, error: '玩家不存在' };
  }
  
  const now = new Date();
  const lastClaimed = new Date(player.last_claimed_at);
  
  // 检查是否已领取（每24小时可领取一次）
  const hoursSinceLastClaim = (now - lastClaimed) / (1000 * 60 * 60);
  if (hoursSinceLastClaim < 24) {
    const remainingHours = Math.floor((24 - hoursSinceLastClaim) * 60);
    return { 
      success: false, 
      error: `距离下次领取还有 ${remainingHours} 分钟`,
      next_claim_in_minutes: remainingHours
    };
  }
  
  // 计算收益
  const incomeData = calculateOfflineIncome(playerId);
  if (!incomeData.success || incomeData.data.total_income <= 0) {
    return incomeData;
  }
  
  // 发放收益
  database.prepare(`
    UPDATE player 
    SET spirit_stones = spirit_stones + ?,
        offline_income_claimed = ?
    WHERE id = ?
  `).run(incomeData.data.total_income, now.toISOString(), playerId);
  
  return {
    success: true,
    data: {
      claimed: true,
      income: incomeData.data.total_income,
      offline_hours: incomeData.data.offline_hours,
      message: `离线${incomeData.data.offline_hours}小时，获得${incomeData.data.total_income}灵石`
    }
  };
}

// 更新玩家最后登出时间
function updateLastLogout(playerId) {
  const database = getDb();
  const now = new Date().toISOString();
  
  database.prepare(`
    UPDATE player SET last_logout_at = ? WHERE id = ?
  `).run(now, playerId);
  
  return { success: true };
}

// 获取离线收益状态
function getOfflineIncomeStatus(playerId) {
  const database = getDb();
  
  const player = database.prepare(`
    SELECT p.*, 
           COALESCE(p.offline_income_claimed, p.created_at) as last_claimed_at
    FROM player p 
    WHERE p.id = ?
  `).get(playerId);
  
  if (!player) {
    return { success: false, error: '玩家不存在' };
  }
  
  const now = new Date();
  const lastClaimed = new Date(player.last_claimed_at);
  const hoursSinceLastClaim = (now - lastClaimed) / (1000 * 60 * 60);
  
  return {
    success: true,
    data: {
      can_claim: hoursSinceLastClaim >= 24,
      hours_until_claim: Math.max(0, 24 - hoursSinceLastClaim),
      next_claim_at: new Date(lastClaimed.getTime() + 24 * 60 * 60 * 1000).toISOString()
    }
  };
}

// 初始化
initOfflineIncomeTable();

module.exports = {
  calculateOfflineIncome,
  claimOfflineIncome,
  updateLastLogout,
  getOfflineIncomeStatus,
  OFFLINE_CONFIG
};
