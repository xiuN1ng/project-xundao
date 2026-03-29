/**
 * 福利系统存储层 - 签到数据管理
 */

// Asia/Shanghai 时区获取当日日期字符串 (YYYY-MM-DD)
function getShanghaiDate() {
  const d = new Date(Date.now() + 8 * 3600000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 获取指定日期的上海日期字符串
function getShanghaiDateStr(date) {
  const d = new Date(date.getTime() + 8 * 3600000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ========== 月卡配置 ==========
const WELFARE_MONTHLY_CARDS = {
  spirit: {
    id: 'spirit',
    name: '灵石月卡',
    cost: 100, // 钻石价格
    costType: 'diamond',
    dailyReward: { type: 'spirit_stones', amount: 500, name: '每日500灵石' },
    description: '购买后每日可领取500灵石，连续30天'
  },
  premium: {
    id: 'premium',
    name: '尊享月卡',
    cost: 300,
    costType: 'diamond',
    dailyReward: { type: 'spirit_stones', amount: 1000, name: '每日1000灵石' },
    bonus: { type: 'exp_bonus', amount: 1.5, name: '修炼经验+50%' },
    description: '购买后每日可领取1000灵石，修炼经验+50%，连续30天'
  }
};

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
    database.exec(`
      CREATE TABLE IF NOT EXISTS welfare_sign_in (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id TEXT NOT NULL,
        current_streak INTEGER DEFAULT 0,
        total_sign_days INTEGER DEFAULT 0,
        last_sign_date TEXT,
        sign_history TEXT DEFAULT '[]',
        repair_cards INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // SQLite不支持UNIQUE KEY，用CREATE UNIQUE INDEX代替
    try {
      database.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_welfare_player ON welfare_sign_in(player_id)`);
    } catch (e) {
      // index may already exist
    }
    console.log('✅ 签到表初始化完成');
    return true;
  } catch (e) {
    console.error('签到表初始化失败:', e.message);
    return false;
  }
}

// 初始化月卡表
function initMonthlyCardTable() {
  const database = getDb();
  if (!database) return false;

  try {
    database.exec(`
      CREATE TABLE IF NOT EXISTS welfare_monthly_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id TEXT NOT NULL,
        card_type TEXT NOT NULL,
        purchase_time TEXT,
        last_claim_time TEXT,
        expire_time TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(player_id, card_type)
      )
    `);
    console.log('✅ 福利月卡表初始化完成');
    return true;
  } catch (e) {
    console.error('月卡表初始化失败:', e.message);
    return false;
  }
}

// 初始化首充表
function initFirstRechargeTable() {
  try {
    const database = getDb();
    if (!database) return false;
    database.exec(`
      CREATE TABLE IF NOT EXISTS welfare_first_recharge (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        purchased INTEGER DEFAULT 0,
        purchased_at TEXT,
        claimed INTEGER DEFAULT 0,
        claimed_at TEXT,
        reward_amount INTEGER DEFAULT 600,
        UNIQUE(player_id)
      )
    `);
    return true;
  } catch (e) {
    console.error('首充表初始化失败:', e.message);
    return false;
  }
}

// 初始化成长基金表
function initGrowthFundTable() {
  try {
    const database = getDb();
    if (!database) return false;
    database.exec(`
      CREATE TABLE IF NOT EXISTS welfare_growth_fund (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        purchased INTEGER DEFAULT 0,
        purchased_at TEXT,
        claimed_levels TEXT DEFAULT '[]',
        last_claim_at TEXT,
        UNIQUE(player_id)
      )
    `);
    return true;
  } catch (e) {
    console.error('成长基金表初始化失败:', e.message);
    return false;
  }
}

// 签到存储操作
const welfareStorage = {
  // 初始化
  init() {
    initSignInTable();
    initMonthlyCardTable();
    initFirstRechargeTable();
    initGrowthFundTable();
    return true;
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

    const today = getShanghaiDate();
    const lastSignDate = record.last_sign_date;

    // 检查今天是否已签到
    const signedToday = lastSignDate === today;

    // 计算连续签到（如果昨天签到了，则连续；否则重置）
    let currentStreak = record.current_streak;
    if (lastSignDate) {
      const yesterday = new Date(Date.now() + 8 * 3600000);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getShanghaiDateStr(yesterday);

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

    const status = this.getSignInStatus(playerId);

    if (status.signedToday) {
      return { success: false, error: '今天已经签到过了' };
    }

    // 计算新的连续签到天数
    let newStreak = status.currentStreak + 1;
    const today = getShanghaiDate();

    // 获取奖励
    const dayIndex = (newStreak - 1) % 7;
    const reward = SIGN_IN_REWARDS[dayIndex];

    // 获取当前签到历史长度（避免 JSON_LENGTH 兼容性问题）
    const existing = database.prepare(
      'SELECT sign_history FROM welfare_sign_in WHERE player_id = ?'
    ).get(playerId);
    let historyArr = [];
    if (existing && existing.sign_history) {
      try { historyArr = JSON.parse(existing.sign_history); } catch (e) { historyArr = []; }
    }
    const insertIndex = historyArr.length;

    // 更新数据库
    database.prepare(`
      UPDATE welfare_sign_in 
      SET current_streak = ?,
          total_sign_days = total_sign_days + 1,
          last_sign_date = ?,
          sign_history = JSON_INSERT(
            COALESCE(sign_history, '[]'),
            '$[${insertIndex}]',
            JSON_OBJECT('date', ?, 'day', ?, 'reward', ?)
          )
      WHERE player_id = ?
    `).run(newStreak, today, today, newStreak, JSON.stringify(reward), playerId);

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

  // ==================== 月卡相关 ====================

  // 购买月卡
  buyMonthlyCard(playerId, cardType) {
    const database = getDb();
    if (!database) return { success: false, error: '数据库未连接' };
    if (!WELFARE_MONTHLY_CARDS[cardType]) return { success: false, error: '无效的月卡类型' };

    const card = WELFARE_MONTHLY_CARDS[cardType];
    const now = new Date();
    const expireTime = new Date(now.getTime() + 30 * 24 * 3600 * 1000); // 30天后过期
    const nowStr = now.toISOString();
    const expireStr = expireTime.toISOString();

    // 检查是否已有该类型月卡且未过期
    const existing = database.prepare(
      'SELECT * FROM welfare_monthly_cards WHERE player_id = ? AND card_type = ? AND expire_time > ?'
    ).get(playerId, cardType, nowStr);

    if (existing) {
      // 已有过期时间更晚的月卡，延长有效期
      const newExpire = new Date(new Date(existing.expire_time).getTime() + 30 * 24 * 3600 * 1000);
      database.prepare(
        'UPDATE welfare_monthly_cards SET expire_time = ? WHERE id = ?'
      ).run(newExpire.toISOString(), existing.id);
      return {
        success: true,
        cardType,
        cardName: card.name,
        expireTime: newExpire.toISOString(),
        message: `月卡有效期已延长至${newExpire.toLocaleDateString()}`
      };
    }

    // 插入新记录
    database.prepare(
      `INSERT OR REPLACE INTO welfare_monthly_cards (player_id, card_type, purchase_time, last_claim_time, expire_time)
       VALUES (?, ?, ?, ?, ?)`
    ).run(playerId, cardType, nowStr, null, expireStr);

    return {
      success: true,
      cardType,
      cardName: card.name,
      expireTime: expireStr,
      message: `购买成功！月卡有效期至${expireTime.toLocaleDateString()}`
    };
  },

  // 获取月卡状态
  getMonthlyCardStatus(playerId) {
    const database = getDb();
    if (!database) return {};

    const nowStr = new Date().toISOString();
    const cards = database.prepare(
      'SELECT * FROM welfare_monthly_cards WHERE player_id = ?'
    ).all(playerId);

    const result = {};
    for (const cardType of Object.keys(WELFARE_MONTHLY_CARDS)) {
      const card = WELFARE_MONTHLY_CARDS[cardType];
      const dbCard = cards.find(c => c.card_type === cardType);
      const isActive = dbCard && dbCard.expire_time > nowStr;
      const canClaimToday = isActive && dbCard.last_claim_time
        ? !isSameShanghaiDay(new Date(dbCard.last_claim_time), new Date())
        : isActive;

      result[cardType] = {
        cardType,
        name: card.name,
        description: card.description,
        dailyReward: card.dailyReward,
        bonus: card.bonus || null,
        isActive: !!isActive,
        canClaimToday,
        purchaseTime: dbCard ? dbCard.purchase_time : null,
        lastClaimTime: dbCard ? dbCard.last_claim_time : null,
        expireTime: dbCard ? dbCard.expire_time : null,
        daysRemaining: dbCard && dbCard.expire_time > nowStr
          ? Math.ceil((new Date(dbCard.expire_time).getTime() - Date.now()) / (24 * 3600 * 1000))
          : 0
      };
    }
    return result;
  },

  // 领取每日月卡奖励
  claimMonthlyCardReward(playerId, cardType) {
    const database = getDb();
    if (!database) return { success: false, error: '数据库未连接' };
    if (!WELFARE_MONTHLY_CARDS[cardType]) return { success: false, error: '无效的月卡类型' };

    const card = WELFARE_MONTHLY_CARDS[cardType];
    const now = new Date();
    const nowStr = now.toISOString();
    const todayStr = getShanghaiDate();

    // 检查是否有有效月卡
    const dbCard = database.prepare(
      'SELECT * FROM welfare_monthly_cards WHERE player_id = ? AND card_type = ? AND expire_time > ?'
    ).get(playerId, cardType, nowStr);

    if (!dbCard) {
      return { success: false, error: `没有有效的${card.name}` };
    }

    // 检查今日是否已领取
    if (dbCard.last_claim_time && isSameShanghaiDay(new Date(dbCard.last_claim_time), now)) {
      return { success: false, error: '今日已领取过该月卡奖励' };
    }

    // 更新领取时间
    database.prepare(
      'UPDATE welfare_monthly_cards SET last_claim_time = ? WHERE id = ?'
    ).run(nowStr, dbCard.id);

    return {
      success: true,
      cardType,
      cardName: card.name,
      reward: card.dailyReward,
      message: `领取成功！获得${card.dailyReward.amount}灵石`
    };
  },

  // ========== 首充双倍 ==========
  getFirstRechargeStatus(playerId) {
    const database = getDb();
    if (!database) return { purchased: false, claimed: false, rewardAmount: 600 };
    const record = database.prepare(
      'SELECT * FROM welfare_first_recharge WHERE player_id = ?'
    ).get(playerId);
    if (!record) return { purchased: false, claimed: false, rewardAmount: 600 };
    return {
      purchased: !!record.purchased,
      claimed: !!record.claimed,
      rewardAmount: record.reward_amount || 600,
      purchasedAt: record.purchased_at,
      claimedAt: record.claimed_at
    };
  },

  purchaseFirstRecharge(playerId) {
    const database = getDb();
    if (!database) return { success: false, error: '数据库未连接' };
    database.prepare(
      'INSERT OR REPLACE INTO welfare_first_recharge (player_id, purchased, purchased_at) VALUES (?, 1, ?)'
    ).run(playerId, new Date().toISOString());
    return { success: true, message: '首充双倍已激活，充值时获得双倍灵石' };
  },

  claimFirstRechargeReward(playerId) {
    const database = getDb();
    if (!database) return { success: false, error: '数据库未连接' };
    const record = database.prepare(
      'SELECT * FROM welfare_first_recharge WHERE player_id = ? AND purchased = 1'
    ).get(playerId);
    if (!record) return { success: false, error: '未购买首充双倍' };
    if (record.claimed) return { success: false, error: '已领取过首充奖励' };
    database.prepare(
      'UPDATE welfare_first_recharge SET claimed = 1, claimed_at = ? WHERE player_id = ?'
    ).run(new Date().toISOString(), playerId);
    return {
      success: true,
      reward: { type: 'first_recharge', amount: record.reward_amount || 600, name: '首充双倍奖励' },
      message: `领取成功！获得${record.reward_amount || 600}灵石`
    };
  },

  // ========== 成长基金 ==========
  GROWTH_FUND_LEVELS: [
    { level: 1, cost: 30, reward: 100, minLevel: 1 },
    { level: 2, cost: 50, reward: 200, minLevel: 5 },
    { level: 3, cost: 50, reward: 200, minLevel: 10 },
    { level: 4, cost: 50, reward: 200, minLevel: 15 },
    { level: 5, cost: 68, reward: 400, minLevel: 20 },
    { level: 6, cost: 68, reward: 400, minLevel: 25 },
    { level: 7, cost: 68, reward: 400, minLevel: 30 },
    { level: 8, cost: 100, reward: 600, minLevel: 35 },
    { level: 9, cost: 100, reward: 600, minLevel: 40 },
    { level: 10, cost: 100, reward: 1000, minLevel: 45 }
  ],

  getGrowthFundStatus(playerId) {
    const database = getDb();
    const levels = this.GROWTH_FUND_LEVELS;
    if (!database) return { purchased: false, claimedLevels: [], levels };
    const record = database.prepare(
      'SELECT * FROM welfare_growth_fund WHERE player_id = ?'
    ).get(playerId);
    if (!record || !record.purchased) return { purchased: false, claimedLevels: [], levels };
    let claimedLevels = [];
    try { claimedLevels = JSON.parse(record.claimed_levels || '[]'); } catch (_) {}
    return { purchased: true, claimedLevels, levels, purchasedAt: record.purchased_at };
  },

  purchaseGrowthFund(playerId) {
    const database = getDb();
    if (!database) return { success: false, error: '数据库未连接' };
    const existing = database.prepare(
      'SELECT * FROM welfare_growth_fund WHERE player_id = ? AND purchased = 1'
    ).get(playerId);
    if (existing) return { success: false, error: '已购买过成长基金' };
    database.prepare(
      'INSERT INTO welfare_growth_fund (player_id, purchased, purchased_at) VALUES (?, 1, ?)'
    ).run(playerId, new Date().toISOString());
    return { success: true, message: '成长基金购买成功' };
  },

  claimGrowthFundReward(playerId, level, currentPlayerLevel) {
    const database = getDb();
    if (!database) return { success: false, error: '数据库未连接' };
    const fundRecord = database.prepare(
      'SELECT * FROM welfare_growth_fund WHERE player_id = ? AND purchased = 1'
    ).get(playerId);
    if (!fundRecord) return { success: false, error: '未购买成长基金' };
    const fundLevel = this.GROWTH_FUND_LEVELS[level - 1];
    if (!fundLevel) return { success: false, error: '无效的成长基金等级' };
    let claimedLevels = [];
    try { claimedLevels = JSON.parse(fundRecord.claimed_levels || '[]'); } catch (_) {}
    if (claimedLevels.includes(level)) return { success: false, error: '该等级奖励已领取' };
    if (currentPlayerLevel < fundLevel.minLevel) return { success: false, error: `需要达到${fundLevel.minLevel}级才能领取` };
    claimedLevels.push(level);
    database.prepare(
      'UPDATE welfare_growth_fund SET claimed_levels = ?, last_claim_at = ? WHERE player_id = ?'
    ).run(JSON.stringify(claimedLevels), new Date().toISOString(), playerId);
    return {
      success: true,
      level,
      reward: { type: 'growth_fund', amount: fundLevel.reward, name: `成长基金L${level}` },
      message: `领取成功！获得${fundLevel.reward}灵石`
    };
  }
};

// 辅助函数：判断两个日期是否是同一上海日
function isSameShanghaiDay(d1, d2) {
  return getShanghaiDateStr(d1) === getShanghaiDateStr(d2);
}

// 导出
module.exports = {
  welfareStorage,
  SIGN_IN_REWARDS,
  EQUIPMENT_TEMPLATES,
  WELFARE_MONTHLY_CARDS,
  getDb: () => db
};

