/**
 * 福利系统存储层 - 签到数据管理
 */

// 签到奖励配置（7天为一个周期）
const SIGN_IN_REWARDS = [
  { day: 1, lingshi: 50, equipment: null, repairCard: 0 },
  { day: 2, lingshi: 100, equipment: null, repairCard: 0 },
  { day: 3, lingshi: 150, equipment: 'green', repairCard: 0 },  // 绿色装备
  { day: 4, lingshi: 200, equipment: null, repairCard: 0 },
  { day: 5, lingshi: 300, equipment: 'blue', repairCard: 0 },   // 蓝色装备
  { day: 6, lingshi: 400, equipment: null, repairCard: 0 },
  { day: 7, lingshi: 500, equipment: 'purple', repairCard: 1 }  // 紫色装备 + 补签卡
];

// 装备模板
const EQUIPMENT_TEMPLATES = {
  green: {
    id: 'sign_green_equipment',
    name: '签到礼包-绿色装备',
    type: 'gear',
    quality: 'uncommon',
    icon: '🎁',
    atk_bonus: 50,
    hp_bonus: 200,
    description: '每日签到奖励',
    level_req: 1
  },
  blue: {
    id: 'sign_blue_equipment',
    name: '签到礼包-蓝色装备',
    type: 'gear',
    quality: 'rare',
    icon: '🎁',
    atk_bonus: 100,
    hp_bonus: 500,
    description: '每日签到奖励',
    level_req: 1
  },
  purple: {
    id: 'sign_purple_equipment',
    name: '签到礼包-紫色装备',
    type: 'gear',
    quality: 'epic',
    icon: '🎁',
    atk_bonus: 200,
    hp_bonus: 1000,
    description: '每日签到奖励',
    level_req: 1
  }
};

let db = null;

function getDb() {
  if (!db) {
    try {
      const Database = require('better-sqlite3');
      const path = require('path');
      const dbPath = path.join(__dirname, '..', 'backend', 'data', 'game.db');
      db = new Database(dbPath);
    } catch (e) {
      console.error('数据库连接失败:', e.message);
    }
  }
  return db;
}

// 初始化签到表
function initSignInTable() {
  const database = getDb();
  if (!database) return false;
  
  try {
    // Use SQLite-compatible syntax (AUTOINCREMENT, no VARCHAR/DATETIME/JSON/UNIQUE KEY)
    database.exec(`
      CREATE TABLE IF NOT EXISTS welfare_sign_in (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id TEXT NOT NULL,
        current_streak INTEGER DEFAULT 0,
        total_sign_days INTEGER DEFAULT 0,
        last_sign_date TEXT,
        sign_history TEXT DEFAULT '[]',
        repair_cards INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(player_id)
      )
    `);
    console.log('✅ 签到表初始化完成');
    return true;
  } catch (e) {
    console.error('签到表初始化失败:', e.message);
    return false;
  }
}

// 签到存储操作
const welfareStorage = {
  // 初始化
  init() {
    return initSignInTable();
  },
  
  // 获取或创建签到记录
  getOrCreateSignInRecord(playerId) {
    const database = getDb();
    if (!database) return null;
    
    let record = database.prepare(
      'SELECT * FROM welfare_sign_in WHERE player_id = ?'
    ).get(playerId);
    
    if (!record) {
      // 创建新记录
      const result = database.prepare(
        'INSERT INTO welfare_sign_in (player_id, current_streak, total_sign_days, repair_cards) VALUES (?, ?, ?, ?)'
      ).run(playerId, 0, 0, 0);
      
      record = database.prepare(
        'SELECT * FROM welfare_sign_in WHERE id = ?'
      ).get(result.lastInsertRowid);
    }
    
    return record;
  },
  
  // 获取签到状态
  getSignInStatus(playerId) {
    const record = this.getOrCreateSignInRecord(playerId);
    if (!record) return null;
    
    const today = new Date().toISOString().split('T')[0];
    const lastSignDate = record.last_sign_date;
    
    // 检查今天是否已签到
    const signedToday = lastSignDate === today;
    
    // 计算连续签到（如果昨天签到了，则连续；否则重置）
    let currentStreak = record.current_streak;
    if (lastSignDate) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (lastSignDate !== yesterdayStr && lastSignDate !== today) {
        // 中断了，重新开始
        currentStreak = 0;
      }
    }
    
    // 获取今天的奖励
    const nextDay = (currentStreak % 7) + 1;
    const todayReward = SIGN_IN_REWARDS[nextDay - 1];
    
    return {
      playerId: playerId,
      currentStreak: currentStreak,
      totalSignDays: record.total_sign_days,
      signedToday: signedToday,
      canClaim: !signedToday,
      lastSignDate: lastSignDate,
      nextReward: todayReward,
      repairCards: record.repair_cards || 0
    };
  },
  
  // 执行签到
  signIn(playerId) {
    const database = getDb();
    if (!database) return { success: false, error: '数据库不可用' };
    
    const record = this.getOrCreateSignInRecord(playerId);
    if (!record) return { success: false, error: '记录不可用' };
    
    const today = new Date().toISOString().split('T')[0];
    if (record.last_sign_date === today) {
      return { success: false, error: '今天已经签到过了' };
    }
    
    // 计算新的连续签到天数
    let currentStreak = record.current_streak;
    if (record.last_sign_date) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      if (record.last_sign_date !== yesterdayStr && record.last_sign_date !== today) {
        currentStreak = 0;
      }
    }
    let newStreak = currentStreak + 1;
    
    // 获取奖励
    const dayIndex = (newStreak - 1) % 7;
    const reward = SIGN_IN_REWARDS[dayIndex];
    
    // SQLite-compatible: build new history entry as JSON string
    const newEntry = JSON.stringify({ date: today, day: newStreak, reward: reward });
    const existingHistory = record.sign_history || '[]';
    // Remove trailing ] if present, then append new entry
    const cleanHistory = existingHistory.endsWith(']') 
      ? existingHistory.slice(0, -1) : existingHistory;
    const newHistory = cleanHistory + (cleanHistory === '[' ? '' : ',') + newEntry + ']';
    
    // 更新数据库
    database.prepare(`
      UPDATE welfare_sign_in 
      SET current_streak = ?,
          total_sign_days = total_sign_days + 1,
          last_sign_date = ?,
          sign_history = ?
      WHERE player_id = ?
    `).run(newStreak, today, newHistory, playerId);
    
    return {
      success: true,
      streak: newStreak,
      day: newStreak,
      reward: reward,
      message: `签到成功！连续签到第${newStreak}天`
    };
  },
  
  // 获取签到历史
  getSignInHistory(playerId) {
    const database = getDb();
    if (!database) return [];
    
    const record = database.prepare(
      'SELECT sign_history FROM welfare_sign_in WHERE player_id = ?'
    ).get(playerId);
    
    if (!record || !record.sign_history) return [];
    
    try {
      return JSON.parse(record.sign_history);
    } catch {
      return [];
    }
  },

  // ==================== 登录奖励存储（次日/三日/七日） ====================

  // 初始化登录奖励表
  initLoginRewardsTable() {
    const database = getDb();
    if (!database) return false;
    try {
      database.exec(`
        CREATE TABLE IF NOT EXISTS welfare_login_rewards (
          player_id INTEGER PRIMARY KEY,
          second_day_claimed INTEGER DEFAULT 0,
          third_day_claimed INTEGER DEFAULT 0,
          seven_day_claimed TEXT DEFAULT '[]',
          first_recharge_claimed INTEGER DEFAULT 0,
          first_recharge_claimed_at TEXT
        )
      `);
      return true;
    } catch (e) {
      console.error('登录奖励表初始化失败:', e.message);
      return false;
    }
  },

  // 获取或创建登录奖励记录
  getOrCreateLoginRewardRecord(playerId) {
    const database = getDb();
    if (!database) return null;
    let record = database.prepare(
      'SELECT * FROM welfare_login_rewards WHERE player_id = ?'
    ).get(playerId);
    if (!record) {
      database.prepare(
        'INSERT OR IGNORE INTO welfare_login_rewards (player_id) VALUES (?)'
      ).run(playerId);
      record = database.prepare(
        'SELECT * FROM welfare_login_rewards WHERE player_id = ?'
      ).get(playerId);
    }
    return record;
  },

  // 获取次日登录奖励状态
  getSecondDayRewardStatus(playerId) {
    const database = getDb();
    if (!database) return { claimed: false, canClaim: false };
    const record = this.getOrCreateLoginRewardRecord(playerId);
    if (!record) return { claimed: false, canClaim: false };
    const signStatus = this.getSignInStatus(playerId);
    const canClaim = signStatus && signStatus.totalSignDays >= 2 && !record.second_day_claimed;
    return {
      claimed: !!record.second_day_claimed,
      canClaim,
      items: [
        { icon: '💎', name: '钻石', amount: 30 },
        { icon: '💰', name: '灵石', amount: 200 }
      ]
    };
  },

  // 领取次日奖励
  claimSecondDayReward(playerId) {
    const database = getDb();
    if (!database) return { success: false, error: '数据库不可用' };
    const record = this.getOrCreateLoginRewardRecord(playerId);
    if (!record) return { success: false, error: '记录不存在' };
    if (record.second_day_claimed) return { success: false, error: '已领取过次日奖励' };
    const signStatus = this.getSignInStatus(playerId);
    if (!signStatus || signStatus.totalSignDays < 2) return { success: false, error: '需要连续签到2天以上' };
    database.prepare(
      'UPDATE welfare_login_rewards SET second_day_claimed = 1 WHERE player_id = ?'
    ).run(playerId);
    return {
      success: true,
      rewards: [
        { icon: '💎', name: '钻石', amount: 30 },
        { icon: '💰', name: '灵石', amount: 200 }
      ],
      message: '领取成功！获得30钻石+200灵石'
    };
  },

  // 获取三日登录奖励状态
  getThirdDayRewardStatus(playerId) {
    const database = getDb();
    if (!database) return { claimed: false, canClaim: false };
    const record = this.getOrCreateLoginRewardRecord(playerId);
    if (!record) return { claimed: false, canClaim: false };
    const signStatus = this.getSignInStatus(playerId);
    const canClaim = signStatus && signStatus.totalSignDays >= 3 && !record.third_day_claimed;
    return {
      claimed: !!record.third_day_claimed,
      canClaim,
      items: [
        { icon: '💎', name: '钻石', amount: 50 },
        { icon: '💰', name: '灵石', amount: 500 }
      ]
    };
  },

  // 领取三日奖励
  claimThirdDayReward(playerId) {
    const database = getDb();
    if (!database) return { success: false, error: '数据库不可用' };
    const record = this.getOrCreateLoginRewardRecord(playerId);
    if (!record) return { success: false, error: '记录不存在' };
    if (record.third_day_claimed) return { success: false, error: '已领取过三日奖励' };
    const signStatus = this.getSignInStatus(playerId);
    if (!signStatus || signStatus.totalSignDays < 3) return { success: false, error: '需要连续签到3天以上' };
    database.prepare(
      'UPDATE welfare_login_rewards SET third_day_claimed = 1 WHERE player_id = ?'
    ).run(playerId);
    return {
      success: true,
      rewards: [
        { icon: '💎', name: '钻石', amount: 50 },
        { icon: '💰', name: '灵石', amount: 500 }
      ],
      message: '领取成功！获得50钻石+500灵石'
    };
  },

  // 七日豪礼奖励配置
  SEVEN_DAY_REWARDS: [
    { day: 1, items: [{ icon: '💰', name: '灵石', amount: 100 }] },
    { day: 2, items: [{ icon: '💰', name: '灵石', amount: 200 }] },
    { day: 3, items: [{ icon: '⚗️', name: '经验丹', amount: 3 }] },
    { day: 4, items: [{ icon: '💰', name: '灵石', amount: 300 }] },
    { day: 5, items: [{ icon: '💎', name: '钻石', amount: 10 }] },
    { day: 6, items: [{ icon: '💰', name: '灵石', amount: 500 }, { icon: '⚗️', name: '经验丹', amount: 5 }] },
    { day: 7, items: [{ icon: '🎁', name: '豪华礼包', amount: 1 }] }
  ],

  // 获取七日豪礼状态
  getSevenDayRewardStatus(playerId) {
    const database = getDb();
    if (!database) return [];
    this.getOrCreateLoginRewardRecord(playerId);
    const record = database.prepare(
      'SELECT seven_day_claimed FROM welfare_login_rewards WHERE player_id = ?'
    ).get(playerId);
    const claimedDays = record ? JSON.parse(record.seven_day_claimed || '[]') : [];
    const signStatus = this.getSignInStatus(playerId);
    const streak = signStatus ? signStatus.currentStreak : 0;
    const today = new Date().toISOString().split('T')[0];
    return this.SEVEN_DAY_REWARDS.map(reward => {
      const claimed = claimedDays.includes(reward.day);
      const canClaim = !claimed && streak >= reward.day;
      return {
        ...reward,
        claimed,
        canClaim,
        isToday: reward.day === Math.min(streak + 1, 7)
      };
    });
  },

  // 领取七日奖励
  claimSevenDayReward(playerId, day) {
    const database = getDb();
    if (!database) return { success: false, error: '数据库不可用' };
    const record = database.prepare(
      'SELECT seven_day_claimed FROM welfare_login_rewards WHERE player_id = ?'
    ).get(playerId);
    if (!record) {
      this.getOrCreateLoginRewardRecord(playerId);
    }
    const claimedDays = JSON.parse(record?.seven_day_claimed || '[]');
    if (claimedDays.includes(day)) return { success: false, error: '已领取过该日奖励' };
    const signStatus = this.getSignInStatus(playerId);
    if (!signStatus || signStatus.currentStreak < day) return { success: false, error: `需要连续签到${day}天才能领取` };
    claimedDays.push(day);
    database.prepare(
      'UPDATE welfare_login_rewards SET seven_day_claimed = ? WHERE player_id = ?'
    ).run(JSON.stringify(claimedDays), playerId);
    const reward = this.SEVEN_DAY_REWARDS.find(r => r.day === day);
    return {
      success: true,
      rewards: reward ? reward.items : [],
      message: `领取成功！获得第${day}天奖励`
    };
  },

  // 获取首充状态（来自 welfare_first_recharge 表）
  getFirstRechargeStatus(playerId) {
    const database = getDb();
    if (!database) return { claimed: false, purchased: false, isActive: true, countdown: 0 };
    const record = database.prepare(
      'SELECT * FROM welfare_first_recharge WHERE player_id = ?'
    ).get(playerId);
    if (!record) return { claimed: false, purchased: false, isActive: true, countdown: 0 };
    return {
      claimed: !!record.claimed,
      purchased: !!record.purchased,
      isActive: true,
      countdown: 0,
      rewards: {
        spirit_stones: 1200,
        skill_book_purple: 1,
        strengthening_stone: 50,
        linggen_fruit: 3
      },
      title: '仙盟创始人'
    };
  },

  // 领取首充奖励
  claimFirstRechargeReward(playerId) {
    const database = getDb();
    if (!database) return { success: false, error: '数据库不可用' };
    const record = database.prepare(
      'SELECT * FROM welfare_first_recharge WHERE player_id = ?'
    ).get(playerId);
    if (!record) return { success: false, error: '未购买首充' };
    if (!record.purchased) return { success: false, error: '未购买首充双倍' };
    if (record.claimed) return { success: false, error: '已领取过首充奖励' };
    const now = new Date().toISOString();
    database.prepare(
      'UPDATE welfare_first_recharge SET claimed = 1, claimed_at = ? WHERE player_id = ?'
    ).run(now, playerId);
    return {
      success: true,
      rewards: {
        spirit_stones: 1200,
        skill_book_purple: 1,
        strengthening_stone: 50,
        linggen_fruit: 3
      },
      title: '仙盟创始人',
      message: '领取成功！获得首充双倍奖励'
    };
  }
};

// 导出
module.exports = {
  welfareStorage,
  SIGN_IN_REWARDS,
  EQUIPMENT_TEMPLATES,
  getDb: () => db
};
