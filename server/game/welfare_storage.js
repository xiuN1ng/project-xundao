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

// 签到存储操作
const welfareStorage = {
  // 初始化
  init() {
    initSignInTable();
    initMonthlyCardTable();
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

// 导出
module.exports = {
  welfareStorage,
  SIGN_IN_REWARDS,
  EQUIPMENT_TEMPLATES,
  WELFARE_MONTHLY_CARDS,
  getDb: () => db
};
