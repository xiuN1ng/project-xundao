const express = require('express');
const router = express.Router();
const path = require('path');

// 输入校验
const { validate, PRESETS, commonSchemas } = require('../../middleware/api_validator');

// 每日任务集成
let dailyQuestRouter;
try {
  dailyQuestRouter = require('./dailyQuest');
} catch (e) {
  console.log('[shop] dailyQuest 路由加载失败:', e.message);
}

// 时装系统集成
let addFashionToPlayer = null;
try {
  const fashionModule = require('./fashion');
  addFashionToPlayer = fashionModule.addFashionToPlayer;
} catch (e) {
  console.log('[shop] fashion 路由加载失败:', e.message);
}

// 数据库路径 (统一使用 backend/data/game.db)
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

// ============================================================
// 首充礼包系统 (First Charge System)
// ============================================================

// 首充礼包配置
const FIRST_CHARGE_TIERS = [
  {
    id: 'first_charge_6',
    name: '初入道途·入门礼包',
    icon: '🌟',
    price: 6,         // 价格（元）
    price_lingshi: 300, // 基础灵石数量
    double_bonus: 600,  // 首充双倍后
    description: '首次充值特惠！获得双倍灵石',
    sort: 1,
    // 专属奖励
    exclusive_rewards: {
      title: '初入道途',
      avatar_frame: 'first_charge_frame',
      fashion_id: 8  // 青云弟子服
    }
  },
  {
    id: 'first_charge_30',
    name: '初入道途·进阶礼包',
    icon: '💎',
    price: 30,
    price_lingshi: 1800,
    double_bonus: 3600,
    description: '首次充值特惠！获得双倍灵石',
    sort: 2,
    exclusive_rewards: {
      title: '初入道途',
      avatar_frame: 'first_charge_frame',
      fashion_id: 8
    }
  },
  {
    id: 'first_charge_98',
    name: '初入道途·豪华礼包',
    icon: '👑',
    price: 98,
    price_lingshi: 6000,
    double_bonus: 12000,
    description: '首次充值特惠！获得双倍灵石',
    sort: 3,
    exclusive_rewards: {
      title: '初入道途',
      avatar_frame: 'first_charge_frame',
      fashion_id: 8
    }
  },
  {
    id: 'first_charge_328',
    name: '初入道途·尊享礼包',
    icon: '🌈',
    price: 328,
    price_lingshi: 20000,
    double_bonus: 40000,
    description: '首次充值特惠！获得双倍灵石',
    sort: 4,
    exclusive_rewards: {
      title: '初入道途',
      avatar_frame: 'first_charge_frame',
      fashion_id: 8
    }
  }
];

// 首充礼包表初始化
function initFirstChargeTables(dbInstance) {
  if (!dbInstance) return;
  try {
    // 首充购买记录表
    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS player_first_charge (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        tier_id TEXT NOT NULL,
        purchased_at DATETIME DEFAULT (datetime('now', '+8 hours')),
        lingshi_awarded INTEGER NOT NULL,
        is_first_charge INTEGER DEFAULT 1,
        UNIQUE(user_id, tier_id)
      )
    `);
    // 首充专属奖励记录表
    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS player_first_charge_rewards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        reward_type TEXT NOT NULL,
        reward_value TEXT NOT NULL,
        awarded_at DATETIME DEFAULT (datetime('now', '+8 hours')),
        UNIQUE(user_id, reward_type)
      )
    `);
    // 头像框表
    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS player_avatar_frames (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        frame_id TEXT NOT NULL,
        frame_name TEXT NOT NULL,
        icon TEXT DEFAULT '🔮',
        equipped INTEGER DEFAULT 0,
        acquired_at DATETIME DEFAULT (datetime('now', '+8 hours')),
        UNIQUE(user_id, frame_id)
      )
    `);
    console.log('[首充] 数据库表初始化完成');
  } catch (e) {
    console.error('[首充] 表初始化失败:', e.message);
  }
}

// 检查玩家是否已购买过首充礼包
function hasPurchasedFirstCharge(dbInstance, userId) {
  if (!dbInstance) return false;
  try {
    const row = dbInstance.prepare(
      'SELECT COUNT(*) as c FROM player_first_charge WHERE user_id = ?'
    ).get(userId);
    return (row?.c || 0) > 0;
  } catch (e) {
    return false;
  }
}

// 检查玩家是否已购买特定档位的首充礼包
function hasPurchasedTier(dbInstance, userId, tierId) {
  if (!dbInstance) return false;
  try {
    const row = dbInstance.prepare(
      'SELECT id FROM player_first_charge WHERE user_id = ? AND tier_id = ?'
    ).get(userId, tierId);
    return !!row;
  } catch (e) {
    return false;
  }
}

// 发放首充专属奖励
function deliverFirstChargeRewards(dbInstance, userId, rewards) {
  if (!dbInstance || !rewards) return;
  try {
    // 1. 发放称号
    if (rewards.title) {
      // 直接给玩家设置称号（Users.title 字段）
      dbInstance.prepare('UPDATE Users SET title = ? WHERE id = ?').run(rewards.title, userId);
      // 也写入 player_titles 表
      dbInstance.prepare(`
        INSERT OR IGNORE INTO player_titles (player_id, title_id, unlocked_at)
        VALUES (?, ?, datetime('now', '+8 hours'))
      `).run(userId, rewards.title);
      console.log(`[首充] 玩家 ${userId} 获得称号: ${rewards.title}`);
    }
    // 2. 发放头像框
    if (rewards.avatar_frame) {
      dbInstance.prepare(`
        INSERT OR IGNORE INTO player_avatar_frames (user_id, frame_id, frame_name, icon, equipped)
        VALUES (?, ?, ?, '🔮', 0)
      `).run(userId, rewards.avatar_frame, '首充限定头像框');
      console.log(`[首充] 玩家 ${userId} 获得头像框: ${rewards.avatar_frame}`);
    }
    // 3. 发放时装 (青云弟子服 fashion_id: 8)
    if (rewards.fashion_id) {
      if (addFashionToPlayer) {
        addFashionToPlayer(userId, rewards.fashion_id);
        console.log(`[首充] 玩家 ${userId} 获得时装: 青云弟子服 (fashion_id: ${rewards.fashion_id})`);
      }
    }
  } catch (e) {
    console.error('[首充] 奖励发放失败:', e.message);
  }
}

// 写入首充购买记录
function recordFirstChargePurchase(dbInstance, userId, tier, lingshiAwarded) {
  if (!dbInstance) return;
  try {
    dbInstance.prepare(`
      INSERT OR IGNORE INTO player_first_charge (user_id, tier_id, lingshi_awarded, is_first_charge)
      VALUES (?, ?, ?, 1)
    `).run(userId, tier.id, lingshiAwarded);
  } catch (e) {
    console.error('[首充] 购买记录写入失败:', e.message);
  }
}

// 获取玩家首充礼包状态
function getFirstChargeStatus(dbInstance, userId) {
  const purchasedTiers = new Set();
  const purchasedRecords = [];
  if (dbInstance) {
    try {
      const rows = dbInstance.prepare(
        'SELECT tier_id, lingshi_awarded FROM player_first_charge WHERE user_id = ?'
      ).all(userId);
      rows.forEach(row => {
        purchasedTiers.add(row.tier_id);
        purchasedRecords.push({ tier_id: row.tier_id, lingshi: row.lingshi_awarded });
      });
    } catch (e) {
      console.error('[首充] 查询购买记录失败:', e.message);
    }
  }

  // 检查是否已获得专属奖励
  const exclusiveRewarded = new Set();
  if (dbInstance) {
    try {
      const rewardRows = dbInstance.prepare(
        'SELECT reward_type, reward_value FROM player_first_charge_rewards WHERE user_id = ?'
      ).all(userId);
      rewardRows.forEach(row => exclusiveRewarded.add(row.reward_type));
    } catch (e) {
      // ignore
    }
  }

  return {
    purchasedTiers: Array.from(purchasedTiers),
    purchasedRecords,
    exclusiveRewarded: Array.from(exclusiveRewarded),
    hasPurchasedAny: purchasedTiers.size > 0
  };
}

// 共享数据库实例（用于表初始化，路由操作优先使用 req.app.locals.db）
let sharedDb = null;
try {
  const Database = require('better-sqlite3');
  sharedDb = new Database(DB_PATH);
  // 启用 WAL 模式 +  busy timeout，避免多实例写锁冲突
  sharedDb.pragma('journal_mode = WAL');
  sharedDb.pragma('busy_timeout = 5000');
  // 初始化 shop_items 表（如果不存在）
  sharedDb.exec(`
    CREATE TABLE IF NOT EXISTS shop_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '📦',
      price INTEGER NOT NULL DEFAULT 100,
      category TEXT NOT NULL DEFAULT 'misc',
      item_type TEXT NOT NULL DEFAULT 'misc',
      description TEXT DEFAULT '',
      stock INTEGER DEFAULT -1,
      vip_level_required INTEGER DEFAULT 0,
      level_required INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      fashion_id INTEGER DEFAULT NULL
    )
  `);
  // 初始化 player_items 表（如果不存在）
  sharedDb.exec(`
    CREATE TABLE IF NOT EXISTS player_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      item_id INTEGER DEFAULT 0,
      item_name TEXT NOT NULL,
      item_type TEXT DEFAULT 'misc',
      count INTEGER DEFAULT 1,
      icon TEXT DEFAULT '📦',
      source TEXT DEFAULT 'shop',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // 种子数据：15件商品
  const count = sharedDb.prepare('SELECT COUNT(*) as c FROM shop_items').get().c || 0;
  if (count === 0) {
    const seedItems = [
      { name: '铁剑', icon: '⚔️', price: 100, category: 'weapon', type: 'weapon', sort: 1 },
      { name: '精钢甲', icon: '🛡️', price: 150, category: 'armor', type: 'armor', sort: 2 },
      { name: '灵气丹', icon: '🧪', price: 50, category: 'potion', type: 'potion', sort: 3 },
      { name: '灵石袋(小)', icon: '💎', price: 500, category: 'currency', type: 'currency', sort: 4 },
      { name: '护身符', icon: '📿', price: 200, category: 'accessory', type: 'accessory', sort: 5 },
      { name: '破境丹', icon: '💊', price: 1000, category: 'potion', type: 'potion', sort: 6 },
      { name: '灵石袋(大)', icon: '💎', price: 2000, category: 'currency', type: 'currency', sort: 7 },
      { name: '玄冰剑', icon: '❄️', price: 800, category: 'weapon', type: 'weapon', sort: 8 },
      { name: '烈焰甲', icon: '🔥', price: 800, category: 'armor', type: 'armor', sort: 9 },
      { name: '疾风靴', icon: '👢', price: 300, category: 'accessory', type: 'accessory', sort: 10 },
      { name: '经验丹', icon: '⭐', price: 100, category: 'potion', type: 'potion', sort: 11 },
      { name: '召唤令', icon: '📜', price: 5000, category: 'special', type: 'special', sort: 12 },
      { name: '强化石', icon: '🔨', price: 200, category: 'material', type: 'material', sort: 13 },
      { name: '洗练石', icon: '💧', price: 300, category: 'material', type: 'material', sort: 14 },
      { name: '天元丹', icon: '🌟', price: 5000, category: 'potion', type: 'potion', sort: 15 },
      // 时装类商品 (sort 16-18)
      { name: '青云弟子服', icon: '⚪', price: 2000, category: 'fashion', type: 'fashion', sort: 16, fashion_id: 8 },
      { name: '霓裳羽衣', icon: '👗', price: 4500, category: 'fashion', type: 'fashion', sort: 17, fashion_id: 9 },
      { name: '浪子行头', icon: '🎭', price: 1800, category: 'fashion', type: 'fashion', sort: 18, fashion_id: 10 },
    ];
    const insert = sharedDb.prepare('INSERT INTO shop_items (name, icon, price, category, item_type, sort_order, fashion_id) VALUES (?,?,?,?,?,?,?)');
    for (const item of seedItems) {
      insert.run(item.name, item.icon, item.price, item.category, item.type || item.item_type, item.sort, item.fashion_id || null);
    }
    console.log('[shop] 18件商品初始化完成（含时装）');
  }
  // 在数据库初始化完成后创建首充表
  initFirstChargeTables(sharedDb);
} catch (err) {
  console.log('[shop] 数据库连接失败:', err.message);
  sharedDb = null;
}

// 获取数据库实例：优先使用 req.app.locals.db（共享主实例），降级使用 sharedDb
function getDb(req) {
  if (req.app && req.app.locals && req.app.locals.db) {
    return req.app.locals.db;
  }
  return sharedDb;
}

// 内存商品缓存（用于无数据库时）
const fallbackGoods = [
  { id: 1, icon: '⚔️', name: '铁剑', price: 100, category: 'weapon', type: 'weapon' },
  { id: 2, icon: '🛡️', name: '精钢甲', price: 150, category: 'armor', type: 'armor' },
  { id: 3, icon: '🧪', name: '灵气丹', price: 50, category: 'potion', type: 'potion' }
];

// 获取商品列表（从DB读取）
function getShopItems(dbInstance) {
  if (!dbInstance) return fallbackGoods;
  try {
    return dbInstance.prepare('SELECT id, name, icon, price, category, item_type as type, description, stock, vip_level_required, level_required, fashion_id FROM shop_items ORDER BY sort_order').all();
  } catch (e) {
    console.error('[shop] getShopItems错误:', e.message);
    return fallbackGoods;
  }
}

router.get('/', (req, res) => {
  const items = getShopItems(getDb(req));
  res.json({ success: true, items });
});
router.get('/list', (req, res) => {
  const items = getShopItems(getDb(req));
  res.json({ success: true, items });
});
// /items 别名 - 兼容旧版客户端
router.get('/items', (req, res) => {
  const items = getShopItems(getDb(req));
  res.json({ success: true, items });
});

router.post('/buy',
  // 输入校验
  validate({
    playerId: { type: 'playerId', required: true },
    itemId: { type: 'string', max: 100, required: true },
    quantity: { type: 'int', min: 1, max: 9999, required: false }
  }),
  (req, res) => {
  // 使用校验后的数据（支持多种参数名）
  const data = req.sanitizedBody || req.body;
  const userId = parseInt(data.playerId || data.player_id || req.body.playerId || 1, 10);
  let itemId = data.itemId || data.item_id;
  const count = parseInt(data.quantity || data.count || 1, 10);

  // 前端时装商品ID映射 (前端ID → 后端shop商品ID)
  const FRONTEND_FASHION_ID_MAP = {
    12: 16, // 青云弟子服 (shop item id 16, fashion template id 8)
    13: 17, // 霓裳羽衣 (shop item id 17, fashion template id 9)
    14: 18, // 浪子行头 (shop item id 18, fashion template id 10)
  };
  if (FRONTEND_FASHION_ID_MAP[itemId]) {
    itemId = FRONTEND_FASHION_ID_MAP[itemId];
  }

  const db = getDb(req);
  const items = getShopItems(db);
  const good = items.find(g => g.id === itemId);
  if (!good) {
    return res.status(404).json({ success: false, error: '商品不存在' });
  }

  const totalCost = good.price * count;

  // 扣除灵石
  if (db) {
    try {
      // 先查询当前灵石（优先从 Users.lingshi 读取，权威数据源）
      const user = db.prepare('SELECT * FROM Users WHERE id = ?').get(userId);
      if (!user) {
        return res.status(404).json({ success: false, error: '玩家不存在' });
      }

      const currentStones = user.lingshi || 0;
      if (currentStones < totalCost) {
        return res.status(400).json({ success: false, error: '灵石不足' });
      }

      // 扣除灵石（写入 Users.lingshi，权威数据源）
      db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(totalCost, userId);

      // 写入背包
      const itemName = good.name + (count > 1 ? ` x${count}` : '');
      db.prepare(`
        INSERT INTO player_items (user_id, item_id, item_name, item_type, count, icon, source, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'shop', CURRENT_TIMESTAMP)
      `).run(userId, good.id, itemName, good.type || good.category, count, good.icon);

      // 时装物品：直接写入 player_fashions
      if (addFashionToPlayer && (good.category === 'fashion' || good.type === 'fashion')) {
        try {
          // good.fashion_id 是时装模板ID（如8=青云弟子服），good.id是商城商品ID（如16）
          const fashionId = good.fashion_id || good.id;
          addFashionToPlayer(userId, fashionId);
          console.log(`[shop] 时装 ${good.name}(fashion_id:${fashionId}) 已添加到玩家 ${userId} 的衣橱`);
        } catch (e) {
          console.error('[shop] 时装添加失败:', e.message);
        }
      }

      // 触发每日任务：消费灵石
      if (dailyQuestRouter && dailyQuestRouter.updateDailyQuestProgress) {
        dailyQuestRouter.updateDailyQuestProgress(userId, 'shop', totalCost);
      }

      res.json({ success: true, item: good, count, cost: totalCost });
    } catch (e) {
      console.error('[shop] buy错误:', e.message);
      res.status(500).json({ success: false, error: e.message });
    }
  } else {
    res.json({ success: true, item: good, count, cost: totalCost });
  }
});

// ============================================================
// 每日限购礼包系统
// ============================================================

const DAILY_PACKAGE_DEFINITIONS = [
  // 灵气礼包：每日可买，6元，限购1次/天
  {
    id: 'spirit_daily',
    name: '灵气礼包',
    icon: '💎',
    price: 60, // 6元档（灵石数量）
    price_diamond: 6, // 6钻石
    category: 'spirit',
    description: '每日限购：购买后立即获得500灵石，每日可购买1次',
    contents: { spirit_stones: 500 },
    limit_type: 'daily', // 每天重置
    limit_count: 1,
    vip_required: 0,
    level_required: 1,
    sort: 1,
  },
  // 修炼礼包：30元，30天有效期，每日双倍修炼
  {
    id: 'cultivation_monthly',
    name: '修炼大礼包',
    icon: '📿',
    price: 300,
    price_diamond: 30,
    category: 'cultivation',
    description: '30天内每日修炼双倍灵气收益，还附赠2000灵石',
    contents: { spirit_stones: 2000, cultivation_bonus_days: 30 },
    limit_type: 'permanent', // 一次购买长期有效
    limit_count: 1,
    vip_required: 0,
    level_required: 5,
    sort: 2,
  },
  // 突破礼包：6元，7天冷却，附突破道具
  {
    id: 'breakthrough_weekly',
    name: '突破冲刺礼包',
    icon: '💥',
    price: 60,
    price_diamond: 6,
    category: 'breakthrough',
    description: '内含破境丹×3 + 800灵石，7天限购1次，适合突破前使用',
    contents: { spirit_stones: 800, breakthrough_pills: 3 },
    limit_type: 'weekly', // 每周重置
    limit_count: 1,
    vip_required: 0,
    level_required: 3,
    sort: 3,
  },
  // 豪华礼包：98元，一次性，附全套装备
  {
    id: 'luxury_pack',
    name: '豪华修炼礼包',
    icon: '👑',
    price: 980,
    price_diamond: 98,
    category: 'luxury',
    description: '新手上路必备！内含5000灵石 + 强化石×20 + 精钢甲×1 + 天元丹×5',
    contents: { spirit_stones: 5000, enhance_stones: 20, steel_armor: 1, tianyuan_pill: 5 },
    limit_type: 'permanent',
    limit_count: 1,
    vip_required: 0,
    level_required: 1,
    sort: 4,
  },
  // 月卡（灵石月卡）：30元，每天领100灵石
  {
    id: 'monthly_card_spirit',
    name: '灵石月卡',
    icon: '🃏',
    price: 300,
    price_diamond: 30,
    category: 'monthly_card',
    description: '30天每日可领取100灵石，超值优惠！',
    contents: { daily_spirit_stones: 100, days: 30 },
    limit_type: 'permanent',
    limit_count: 1,
    vip_required: 0,
    level_required: 1,
    sort: 5,
    is_monthly_card: true,
    card_type: 'spirit',
  },
  // 尊享月卡：98元，每天领300灵石+双倍修炼
  {
    id: 'monthly_card_vip',
    name: '尊享月卡',
    icon: '💳',
    price: 980,
    price_diamond: 98,
    category: 'monthly_card',
    description: '30天每日可领取300灵石 + 双倍修炼特权，性价比之王！',
    contents: { daily_spirit_stones: 300, cultivation_double: true, days: 30 },
    limit_type: 'permanent',
    limit_count: 1,
    vip_required: 1,
    level_required: 1,
    sort: 6,
    is_monthly_card: true,
    card_type: 'vip',
  },
  // 战令（battle pass）：68元，赛季制
  {
    id: 'battle_pass_s1',
    name: '第1赛季战令',
    icon: '🎖️',
    price: 680,
    price_diamond: 68,
    category: 'battle_pass',
    description: '第1赛季战令：解锁30级奖励路线，完成赛季任务获取独家时装和称号',
    contents: { battle_pass_season: 1, bonus_tasks: true },
    limit_type: 'season', // 赛季制
    limit_count: 1,
    vip_required: 0,
    level_required: 10,
    sort: 7,
    is_battle_pass: true,
    season: 1,
  },
];

// 初始化每日礼包表
function initDailyPackageTables(db) {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS daily_package_purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        package_id TEXT NOT NULL,
        purchased_at TEXT DEFAULT (datetime('now', '+8 hours')),
        expires_at TEXT,
        active INTEGER DEFAULT 1,
        UNIQUE(user_id, package_id)
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS daily_package_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        package_id TEXT NOT NULL,
        purchased_at TEXT DEFAULT (datetime('now', '+8 hours')),
        cost_type TEXT DEFAULT 'spirit_stones',
        cost_amount INTEGER DEFAULT 0
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS player_monthly_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        card_type TEXT NOT NULL,
        purchased_at TEXT DEFAULT (datetime('now', '+8 hours')),
        expire_at TEXT,
        last_claim_at TEXT,
        active INTEGER DEFAULT 1,
        UNIQUE(user_id, card_type)
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS player_battle_passes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        season INTEGER NOT NULL,
        purchased_at TEXT DEFAULT (datetime('now', '+8 hours')),
        level INTEGER DEFAULT 0,
        exp INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        UNIQUE(user_id, season)
      )
    `);
  } catch (e) {
    console.error('[shop] initDailyPackageTables错误:', e.message);
  }
}

// 获取上海时间字符串 YYYY-MM-DD
function getShanghaiDateStr() {
  const now = new Date(Date.now() + 8 * 3600 * 1000);
  return now.toISOString().slice(0, 10);
}

// 获取本周一上海时间字符串
function getShanghaiWeekStart() {
  const now = new Date(Date.now() + 8 * 3600 * 1000);
  const day = now.getUTCDay() || 7;
  const monday = new Date(now);
  monday.setUTCDate(monday.getUTCDate() - day + 1);
  return monday.toISOString().slice(0, 10);
}

// 检查玩家是否可购买礼包
function canPurchasePackage(db, userId, pkg, user) {
  // 检查等级
  if (user.level < pkg.level_required) {
    return { ok: false, reason: `需要达到${pkg.level_required}级才能购买此礼包` };
  }
  // 检查VIP
  if ((user.vipLevel || 0) < pkg.vip_required) {
    return { ok: false, reason: `需要VIP${pkg.vip_required}才能购买此礼包` };
  }

  // 检查购买限制
  const today = getShanghaiDateStr();
  const weekStart = getShanghaiWeekStart();

  if (pkg.limit_type === 'permanent') {
    // 永久礼包：检查是否已购买
    const existing = db.prepare(
      'SELECT id FROM daily_package_purchases WHERE user_id=? AND package_id=? AND active=1'
    ).get(userId, pkg.id);
    if (existing) {
      return { ok: false, reason: '您已购买过此礼包' };
    }
  } else if (pkg.limit_type === 'daily') {
    // 每日礼包：检查今日是否已买
    const existing = db.prepare(
      "SELECT id FROM daily_package_logs WHERE user_id=? AND package_id=? AND purchased_at >= ?"
    ).get(userId, pkg.id, today + ' 00:00:00');
    if (existing) {
      return { ok: false, reason: '今日已购买过此礼包，请明日再来' };
    }
  } else if (pkg.limit_type === 'weekly') {
    // 每周礼包：检查本周是否已买
    const existing = db.prepare(
      "SELECT id FROM daily_package_logs WHERE user_id=? AND package_id=? AND purchased_at >= ?"
    ).get(userId, pkg.id, weekStart + ' 00:00:00');
    if (existing) {
      return { ok: false, reason: '本周已购买过此礼包，请下周再来' };
    }
  }
  return { ok: true };
}

// 发放礼包内容
function deliverPackage(db, userId, pkg) {
  const rewards = [];
  try {
    // 灵石
    if (pkg.contents.spirit_stones) {
      db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(pkg.contents.spirit_stones, userId);
      rewards.push({ item: '灵石', count: pkg.contents.spirit_stones });
    }
    // 突破丹
    if (pkg.contents.breakthrough_pills) {
      const itemName = '破境丹';
      db.prepare(`
        INSERT INTO player_items (user_id, item_id, item_name, item_type, count, icon, source, created_at)
        VALUES (?, 0, ?, 'potion', ?, '💊', 'daily_package', datetime('now', '+8 hours'))
      `).run(userId, itemName, pkg.contents.breakthrough_pills);
      rewards.push({ item: '破境丹', count: pkg.contents.breakthrough_pills });
    }
    // 强化石
    if (pkg.contents.enhance_stones) {
      const itemName = '强化石';
      db.prepare(`
        INSERT INTO player_items (user_id, item_id, item_name, item_type, count, icon, source, created_at)
        VALUES (?, 0, ?, 'material', ?, '🔨', 'daily_package', datetime('now', '+8 hours'))
      `).run(userId, itemName, pkg.contents.enhance_stones);
      rewards.push({ item: '强化石', count: pkg.contents.enhance_stones });
    }
    // 天元丹
    if (pkg.contents.tiyuan_pill) {
      const itemName = '天元丹';
      db.prepare(`
        INSERT INTO player_items (user_id, item_id, item_name, item_type, count, icon, source, created_at)
        VALUES (?, 0, ?, 'potion', ?, '🌟', 'daily_package', datetime('now', '+8 hours'))
      `).run(userId, itemName, pkg.contents.tiyuan_pill);
      rewards.push({ item: '天元丹', count: pkg.contents.tiyuan_pill });
    }
    // 精钢甲（装备）
    if (pkg.contents.steel_armor) {
      db.prepare(`
        INSERT INTO player_items (user_id, item_id, item_name, item_type, count, icon, source, created_at)
        VALUES (?, 0, '精钢甲', 'armor', 1, '🛡️', 'daily_package', datetime('now', '+8 hours'))
      `).run(userId);
      rewards.push({ item: '精钢甲', count: 1 });
    }

    // 月卡：写入 player_monthly_cards
    if (pkg.is_monthly_card) {
      const days = pkg.contents.days || 30;
      const expireAt = new Date(Date.now() + 8 * 3600 * 1000 + days * 24 * 3600 * 1000).toISOString().slice(0, 10);
      db.prepare(`
        INSERT OR REPLACE INTO player_monthly_cards (user_id, card_type, purchased_at, expire_at, last_claim_at, active)
        VALUES (?, ?, datetime('now', '+8 hours'), ?, NULL, 1)
      `).run(userId, pkg.card_type, expireAt);
    }

    // 战令：写入 player_battle_passes
    if (pkg.is_battle_pass) {
      db.prepare(`
        INSERT OR REPLACE INTO player_battle_passes (user_id, season, purchased_at, level, exp, active)
        VALUES (?, ?, datetime('now', '+8 hours'), 0, 0, 1)
      `).run(userId, pkg.season || 1);
    }

    // 永久礼包：写入购买记录
    if (pkg.limit_type === 'permanent' && !pkg.is_monthly_card && !pkg.is_battle_pass) {
      const expireAt = pkg.contents.cultivation_bonus_days
        ? new Date(Date.now() + 8 * 3600 * 1000 + (pkg.contents.cultivation_bonus_days) * 24 * 3600 * 1000).toISOString().slice(0, 10)
        : null;
      db.prepare(`
        INSERT OR REPLACE INTO daily_package_purchases (user_id, package_id, purchased_at, expires_at, active)
        VALUES (?, ?, datetime('now', '+8 hours'), ?, 1)
      `).run(userId, pkg.id, expireAt);
    }

    // 每日/每周礼包：写入日志
    if (pkg.limit_type === 'daily' || pkg.limit_type === 'weekly') {
      db.prepare(`
        INSERT INTO daily_package_logs (user_id, package_id, purchased_at)
        VALUES (?, ?, datetime('now', '+8 hours'))
      `).run(userId, pkg.id);
    }
  } catch (e) {
    console.error('[shop] deliverPackage错误:', e.message);
  }
  return rewards;
}

// POST /api/shop/buy-package — 前端礼包购买接口（支持前端礼包ID）
const ID_MAP = {
  'daily-1': 'spirit_daily',
  'daily-2': 'cultivation_daily',
  'daily-3': 'realm_daily',
  'monthly-card': 'monthly_card_spirit',
  'battle-pass': 'battle_pass_s1',
  'direct-1': 'direct_fudu_s1',
  'direct-2': 'direct_fudu_s2',
  'direct-3': 'direct_fudu_s3',
};

router.post('/buy-package', (req, res) => {
  const userId = req.body.player_id || req.body.userId || 1;
  const rawPackageId = req.body.package_id || req.body.packageId;
  if (!rawPackageId) {
    return res.status(400).json({ success: false, error: '缺少 package_id 参数' });
  }
  const packageId = ID_MAP[rawPackageId] || rawPackageId;
  const db = getDb(req);
  if (!db) return res.status(500).json({ success: false, error: '数据库不可用' });
  initDailyPackageTables(db);
  const pkg = DAILY_PACKAGE_DEFINITIONS.find(p => p.id === packageId);
  if (!pkg) {
    return res.status(404).json({ success: false, error: '礼包不存在' });
  }
  const user = db.prepare('SELECT * FROM Users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ success: false, error: '玩家不存在' });
  const check = canPurchasePackage(db, userId, pkg, user);
  if (!check.ok) return res.status(400).json({ success: false, error: check.reason });
  const cost = pkg.price;
  if ((user.lingshi || 0) < cost) return res.status(400).json({ success: false, error: '灵石不足' });
  db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(cost, userId);
  const rewards = deliverPackage(db, userId, pkg);
  if (dailyQuestRouter && dailyQuestRouter.updateDailyQuestProgress) {
    dailyQuestRouter.updateDailyQuestProgress(userId, 'shop', cost);
  }
  res.json({ success: true, package: pkg.name, cost, rewards });
});

// POST /api/shop/daily-packages/buy — 购买礼包
router.post('/daily-packages/buy', (req, res) => {
  const userId = req.body.userId ?? req.body.player_id ?? 1;
  const packageId = req.body.packageId ?? req.body.package_id;
  const payWith = req.body.payWith || 'spirit_stones'; // spirit_stones | diamond

  if (!packageId) {
    return res.status(400).json({ success: false, error: '缺少 packageId 参数' });
  }

  const db = getDb(req);
  if (!db) {
    return res.status(500).json({ success: false, error: '数据库不可用' });
  }

  initDailyPackageTables(db);

  // 查找礼包
  const pkg = DAILY_PACKAGE_DEFINITIONS.find(p => p.id === packageId);
  if (!pkg) {
    return res.status(404).json({ success: false, error: '礼包不存在' });
  }

  // 获取玩家
  const user = db.prepare('SELECT * FROM Users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ success: false, error: '玩家不存在' });
  }

  // 检查购买限制
  const check = canPurchasePackage(db, userId, pkg, user);
  if (!check.ok) {
    return res.status(400).json({ success: false, error: check.reason });
  }

  // 扣款
  const cost = payWith === 'diamond' ? pkg.price_diamond : pkg.price;
  if (payWith === 'diamond') {
    const diamondBalance = user.diamonds || 0;
    if (diamondBalance < cost) {
      return res.status(400).json({ success: false, error: '钻石不足' });
    }
    db.prepare('UPDATE Users SET diamonds = diamonds - ? WHERE id = ?').run(cost, userId);
  } else {
    const stoneBalance = user.lingshi || 0;
    if (stoneBalance < cost) {
      return res.status(400).json({ success: false, error: '灵石不足' });
    }
    db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(cost, userId);
  }

  // 发放奖励
  const rewards = deliverPackage(db, userId, pkg);

  // 触发每日任务（消费任务）
  if (dailyQuestRouter && dailyQuestRouter.updateDailyQuestProgress) {
    dailyQuestRouter.updateDailyQuestProgress(userId, 'shop', cost);
  }

  res.json({
    success: true,
    package: pkg.name,
    cost,
    costType: payWith,
    rewards,
  });
});

// GET /api/shop/daily-packages/claim/:cardType — 领取月卡每日奖励
router.get('/daily-packages/claim/:cardType', (req, res) => {
  const userId = req.query.userId || req.query.player_id || 1;
  const cardType = req.params.cardType;
  const db = getDb(req);
  if (!db) return res.status(500).json({ success: false, error: '数据库不可用' });

  const today = getShanghaiDateStr();
  const card = db.prepare('SELECT * FROM player_monthly_cards WHERE user_id=? AND card_type=? AND active=1').get(userId, cardType);
  if (!card) {
    return res.status(404).json({ success: false, error: '您未购买此月卡' });
  }
  if (card.expire_at && card.expire_at < today) {
    return res.status(400).json({ success: false, error: '月卡已过期' });
  }
  if (card.last_claim_at && card.last_claim_at >= today + ' 00:00:00') {
    return res.status(400).json({ success: false, error: '今日已领取，请明日再来' });
  }

  // 计算每日领取数量
  const amount = cardType === 'vip' ? 300 : 100;
  db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(amount, userId);
  db.prepare("UPDATE player_monthly_cards SET last_claim_at = ? WHERE id = ?").run(today + ' 23:59:59', card.id);

  res.json({ success: true, message: `领取成功！获得${amount}灵石`, amount, currency: '灵石' });
});

// ============================================================
// 灵石直购礼包系统
// ============================================================

// 礼包模板配置
const DIRECT_PACKAGES = [
  {
    id: 'daily_100',
    name: '灵气福袋',
    icon: '💰',
    price: 100,
    description: '内含经验丹×3、灵石×100、强化石×1',
    items: [
      { name: '经验丹', icon: '⭐', count: 3 },
      { name: '灵石', icon: '💎', count: 100, isCurrency: true },
      { name: '强化石', icon: '🔨', count: 1 }
    ]
  },
  {
    id: 'daily_500',
    name: '修炼福袋',
    icon: '🎁',
    price: 500,
    description: '内含洗练石×1、灵石×500、强化石×2、铁锭×2',
    items: [
      { name: '洗练石', icon: '💧', count: 1 },
      { name: '灵石', icon: '💎', count: 500, isCurrency: true },
      { name: '强化石', icon: '🔨', count: 2 },
      { name: '铁锭', icon: '🔩', count: 2 }
    ]
  },
  {
    id: 'daily_2000',
    name: '天元宝匣',
    icon: '👑',
    price: 2000,
    description: '内含天元丹×1、灵石×2000、洗练石×5、玉石×1',
    items: [
      { name: '天元丹', icon: '🌟', count: 1 },
      { name: '灵石', icon: '💎', count: 2000, isCurrency: true },
      { name: '洗练石', icon: '💧', count: 5 },
      { name: '玉石', icon: '💠', count: 1 }
    ]
  }
];

// 获取3个每日随机礼包（每天固定，同日期同礼包）
function getDailyPackages(userId) {
  const db = sharedDb;
  if (!db) return DIRECT_PACKAGES;

  const today = getShanghaiDateStr();
  // 伪随机：根据日期+userId 确定包顺序
  const seed = parseInt(today.replace(/-/g, '')) * 1000 + (userId % 100);
  const sorted = [...DIRECT_PACKAGES].sort((a, b) => {
    const sa = (seed * (a.id.charCodeAt(5) || 1)) % 100;
    const sb = (seed * (b.id.charCodeAt(5) || 1)) % 100;
    return sb - sa;
  });

  // 检查玩家今日是否已购买
  const purchased = new Set();
  try {
    const rows = db.prepare(
      "SELECT package_id FROM daily_direct_purchases WHERE user_id = ? AND purchase_date = ?"
    ).all(userId, today);
    rows.forEach(r => purchased.add(r.package_id));
  } catch (e) {
    // 表可能不存在，忽略
  }

  return sorted.slice(0, 3).map(pkg => ({
    packageId: pkg.id,
    name: pkg.name,
    icon: pkg.icon,
    price: pkg.price,
    description: pkg.description,
    items: pkg.items,
    purchased: purchased.has(pkg.id)
  }));
}

// GET /api/shop/daily-packages — 返回3个每日礼包
router.get('/daily-packages', (req, res) => {
  const userId = req.userId || req.query.userId || req.query.player_id || 1;
  const packages = getDailyPackages(userId);
  res.json({ success: true, packages, date: getShanghaiDateStr() });
});

// POST /api/shop/direct-buy — 购买直购礼包
router.post('/direct-buy', (req, res) => {
  const userId = req.userId || req.body.userId || req.body.player_id || 1;
  const packageId = req.body.packageId;
  const db = getDb(req) || sharedDb;

  if (!db) {
    return res.status(500).json({ success: false, error: '数据库未连接' });
  }

  // 找到礼包配置
  const pkg = DIRECT_PACKAGES.find(p => p.id === packageId);
  if (!pkg) {
    return res.status(400).json({ success: false, error: '不存在的礼包' });
  }

  // 检查今日是否已购买
  const today = getShanghaiDateStr();
  try {
    const existing = db.prepare(
      "SELECT id FROM daily_direct_purchases WHERE user_id = ? AND package_id = ? AND purchase_date = ?"
    ).get(userId, packageId, today);
    if (existing) {
      return res.status(400).json({ success: false, error: '今日已购买此礼包，请明日再来' });
    }
  } catch (e) {
    // 表可能不存在，继续执行
  }

  // 检查灵石是否足够
  const player = db.prepare('SELECT lingshi FROM Users WHERE id = ?').get(userId);
  if (!player || player.lingshi < pkg.price) {
    return res.status(400).json({
      success: false,
      error: `灵石不足，需要${pkg.price}灵石，当前${player ? player.lingshi : 0}灵石`
    });
  }

  // 扣灵石
  const updateUser = db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?');
  const result = updateUser.run(pkg.price, userId);
  if (result.changes === 0) {
    return res.status(500).json({ success: false, error: '扣款失败' });
  }

  // 写入购买记录
  try {
    db.prepare(
      "INSERT OR IGNORE INTO daily_direct_purchases (user_id, package_id, purchase_date, created_at) VALUES (?, ?, ?, datetime('now'))"
    ).run(userId, packageId, today);
  } catch (e) {
    // 如果表不存在则跳过，不影响物品发放
  }

  // 发放物品到背包
  const insertedItems = [];
  const itemInsert = db.prepare(
    "INSERT INTO player_items (user_id, item_id, item_name, item_type, count, icon, source) VALUES (?, 0, ?, 'material', ?, '📦', 'daily_package')"
  );
  const currencyUpdate = db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?');

  for (const item of pkg.items) {
    if (item.isCurrency) {
      // 灵石直接加到用户账户（已扣减 pkg.price，所以这里加的是礼包内的灵石）
      currencyUpdate.run(item.count, userId);
      insertedItems.push({ name: item.name, icon: item.icon, count: item.count });
    } else {
      // 查找或创建物品记录（UPSERT）
      const existing = db.prepare(
        "SELECT id, count FROM player_items WHERE user_id = ? AND item_name = ? AND item_type = 'material'"
      ).get(userId, item.name);
      if (existing) {
        db.prepare(
          "UPDATE player_items SET count = count + ? WHERE id = ?"
        ).run(item.count, existing.id);
      } else {
        itemInsert.run(userId, item.name, item.count);
      }
      insertedItems.push({ name: item.name, icon: item.icon, count: item.count });
    }
  }

  res.json({
    success: true,
    message: `购买成功！花费${pkg.price}灵石`,
    package: { packageId: pkg.id, name: pkg.name, icon: pkg.icon, price: pkg.price },
    items: insertedItems,
    remainingLingshi: (player.lingshi - pkg.price) + pkg.items.filter(i => i.isCurrency).reduce((s, i) => s + i.count, 0)
  });
});

// ============================================================
// 首充礼包 API 路由
// ============================================================

// GET /api/shop/first-charge — 获取首充礼包信息
router.get('/first-charge', (req, res) => {
  const userId = parseInt(req.query.userId || req.query.player_id || 1);
  const db = getDb(req);
  initFirstChargeTables(db);

  const status = getFirstChargeStatus(db, userId);
  const tiers = FIRST_CHARGE_TIERS.map(tier => {
    const purchased = status.purchasedTiers.includes(tier.id);
    // 计算下一档解锁进度
    const currentIndex = FIRST_CHARGE_TIERS.findIndex(t => t.id === tier.id);
    const prevTier = currentIndex > 0 ? FIRST_CHARGE_TIERS[currentIndex - 1] : null;
    const prevPurchased = prevTier ? status.purchasedTiers.includes(prevTier.id) : true;

    return {
      id: tier.id,
      name: tier.name,
      icon: tier.icon,
      price: tier.price,
      price_lingshi: tier.price_lingshi,
      double_bonus: tier.double_bonus,
      description: tier.description,
      sort: tier.sort,
      purchased,
      // 专属奖励展示
      exclusive_rewards: {
        title: tier.exclusive_rewards.title,
        avatar_frame: tier.exclusive_rewards.avatar_frame,
        fashion_id: tier.exclusive_rewards.fashion_id,
        fashion_name: '青云弟子装',
        fashion_icon: '⚪'
      },
      // 进度信息
      progress: {
        prev_tier_unlocked: prevPurchased,
        current_tier: tier.sort,
        total_tiers: FIRST_CHARGE_TIERS.length,
        next_tier: currentIndex < FIRST_CHARGE_TIERS.length - 1
          ? FIRST_CHARGE_TIERS[currentIndex + 1].name
          : null,
        next_tier_price: currentIndex < FIRST_CHARGE_TIERS.length - 1
          ? FIRST_CHARGE_TIERS[currentIndex + 1].price
          : null
      }
    };
  });

  res.json({
    success: true,
    first_charge_active: !status.hasPurchasedAny, // 未购买过任何档位则首充礼包激活
    has_purchased_any: status.hasPurchasedAny,
    purchased_tiers: status.purchasedTiers,
    exclusive_rewards_awarded: status.exclusiveRewarded,
    tiers,
    message: status.hasPurchasedAny
      ? '您已享受首充特惠，但各档位礼包仍可购买'
      : '首次充值，双倍灵石！专属奖励等你拿！'
  });
});

// GET /api/shop/first-charge/popup — 获取首充弹窗信息（首次登录引导用）
router.get('/first-charge/popup', (req, res) => {
  const userId = parseInt(req.query.userId || req.query.player_id || 1);
  const db = getDb(req);
  initFirstChargeTables(db);

  const status = getFirstChargeStatus(db, userId);

  // 找出下一个未购买的档位
  const nextUnpurchasedTier = FIRST_CHARGE_TIERS.find(t => !status.purchasedTiers.includes(t.id));

  if (!nextUnpurchasedTier) {
    return res.json({
      success: true,
      show_popup: false,
      message: '已购买所有首充礼包'
    });
  }

  // 计算所有未购买档位的最低价格
  const unpurchasedTiers = FIRST_CHARGE_TIERS.filter(t => !status.purchasedTiers.includes(t.id));
  const minPrice = Math.min(...unpurchasedTiers.map(t => t.price));

  res.json({
    success: true,
    show_popup: true,
    has_first_charge_bonus: true, // 首充双倍标识
    tiers: unpurchasedTiers.map(t => ({
      id: t.id,
      name: t.name,
      icon: t.icon,
      price: t.price,
      double_bonus: t.double_bonus,
      description: t.description
    })),
    recommended_tier: nextUnpurchasedTier,
    min_price: minPrice,
    exclusive_rewards: {
      title: '初入道途',
      title_icon: '🎖️',
      avatar_frame: '首充限定头像框',
      avatar_frame_icon: '🔮',
      fashion_name: '青云弟子装',
      fashion_icon: '⚪'
    },
   限时特惠: true,
    首充双倍提示: '首次充值灵石双倍！'
  });
});

// POST /api/shop/first-charge/buy — 购买首充礼包
router.post('/first-charge/buy', (req, res) => {
  const userId = parseInt(req.body.userId || req.body.player_id || 1);
  const tierId = req.body.tierId || req.body.tier_id;
  const payWith = req.body.payWith || 'spirit_stones'; // spirit_stones | diamond

  if (!tierId) {
    return res.status(400).json({ success: false, error: '缺少 tierId 参数' });
  }

  const db = getDb(req);
  if (!db) {
    return res.status(500).json({ success: false, error: '数据库不可用' });
  }
  initFirstChargeTables(db);

  // 查找礼包配置
  const tier = FIRST_CHARGE_TIERS.find(t => t.id === tierId);
  if (!tier) {
    return res.status(404).json({ success: false, error: '首充礼包不存在' });
  }

  // 获取玩家
  const user = db.prepare('SELECT * FROM Users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ success: false, error: '玩家不存在' });
  }

  // 检查是否已购买此档位
  if (hasPurchasedTier(db, userId, tierId)) {
    return res.status(400).json({ success: false, error: `您已购买过「${tier.name}」，每个档位限购买1次` });
  }

  // 检查是否满足解锁条件（前一个档位必须已购买，或者这是第一档）
  const currentIndex = FIRST_CHARGE_TIERS.findIndex(t => t.id === tierId);
  if (currentIndex > 0) {
    const prevTier = FIRST_CHARGE_TIERS[currentIndex - 1];
    if (!hasPurchasedTier(db, userId, prevTier.id)) {
      return res.status(400).json({
        success: false,
        error: `需要先购买「${prevTier.name}」才能购买此档位`,
        required_tier: prevTier.id,
        required_tier_name: prevTier.name
      });
    }
  }

  // 扣款
  const cost = payWith === 'diamond' ? tier.price * 10 : tier.price_lingshi; // 钻石按1元=10钻折算
  if (payWith === 'diamond') {
    const diamondBalance = user.diamonds || 0;
    if (diamondBalance < cost) {
      return res.status(400).json({ success: false, error: '钻石不足' });
    }
    db.prepare('UPDATE Users SET diamonds = diamonds - ? WHERE id = ?').run(cost, userId);
  } else {
    const stoneBalance = user.lingshi || 0;
    if (stoneBalance < cost) {
      return res.status(400).json({ success: false, error: `灵石不足，需要${cost}灵石，当前${stoneBalance}灵石` });
    }
    db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(cost, userId);
  }

  // 发放双倍灵石
  const lingshiAwarded = tier.double_bonus; // 首充双倍
  db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(lingshiAwarded, userId);

  // 记录购买
  recordFirstChargePurchase(db, userId, tier, lingshiAwarded);

  // 发放专属奖励（只发放一次）
  const status = getFirstChargeStatus(db, userId);
  const rewardKey = `first_charge_${tierId}`;
  if (!status.exclusiveRewarded.includes(rewardKey) && !status.exclusiveRewarded.includes('all')) {
    deliverFirstChargeRewards(db, userId, tier.exclusive_rewards);
    // 标记奖励已发放
    try {
      db.prepare(`
        INSERT OR IGNORE INTO player_first_charge_rewards (user_id, reward_type, reward_value)
        VALUES (?, ?, ?)
      `).run(userId, rewardKey, JSON.stringify(tier.exclusive_rewards));
    } catch (e) {
      console.error('[首充] 奖励记录写入失败:', e.message);
    }
  }

  // 更新玩家灵石余额
  const updatedUser = db.prepare('SELECT lingshi, diamonds FROM Users WHERE id = ?').get(userId);

  // 触发每日任务（消费灵石）
  if (dailyQuestRouter && dailyQuestRouter.updateDailyQuestProgress) {
    dailyQuestRouter.updateDailyQuestProgress(userId, 'first_charge', cost);
  }

  res.json({
    success: true,
    message: `首充成功！获得${lingshiAwarded}灵石（首充双倍）`,
    tier: {
      id: tier.id,
      name: tier.name,
      icon: tier.icon,
      price: tier.price
    },
    rewards: {
      lingshi: lingshiAwarded,
      is_first_charge_double: true,
      exclusive: tier.exclusive_rewards
    },
    cost,
    cost_type: payWith,
    remaining_lingshi: updatedUser?.lingshi || 0,
    remaining_diamonds: updatedUser?.diamonds || 0
  });
});

// GET /api/shop/first-charge/exclusive — 获取首充专属奖励列表
router.get('/first-charge/exclusive', (req, res) => {
  const userId = parseInt(req.query.userId || req.query.player_id || 1);
  const db = getDb(req);
  initFirstChargeTables(db);

  const status = getFirstChargeStatus(db, userId);

  const exclusiveRewards = [
    {
      type: 'title',
      id: 'first_charge_title',
      name: '初入道途',
      icon: '🎖️',
      description: '首次充值专属称号',
      awarded: status.exclusiveRewarded.includes('first_charge_6') ||
                status.exclusiveRewarded.includes('first_charge_30') ||
                status.exclusiveRewarded.includes('first_charge_98') ||
                status.exclusiveRewarded.includes('first_charge_328') ||
                status.exclusiveRewarded.includes('all')
    },
    {
      type: 'avatar_frame',
      id: 'first_charge_frame',
      name: '首充限定头像框',
      icon: '🔮',
      description: '首次充值专属头像框',
      awarded: status.exclusiveRewarded.includes('first_charge_6') ||
                status.exclusiveRewarded.includes('first_charge_30') ||
                status.exclusiveRewarded.includes('first_charge_98') ||
                status.exclusiveRewarded.includes('first_charge_328') ||
                status.exclusiveRewarded.includes('all')
    },
    {
      type: 'fashion',
      id: 'fashion_8',
      name: '青云弟子装',
      icon: '⚪',
      description: '首次充值专属时装',
      awarded: status.exclusiveRewarded.includes('first_charge_6') ||
                status.exclusiveRewarded.includes('first_charge_30') ||
                status.exclusiveRewarded.includes('first_charge_98') ||
                status.exclusiveRewarded.includes('first_charge_328') ||
                status.exclusiveRewarded.includes('all')
    }
  ];

  res.json({
    success: true,
    exclusive_rewards: exclusiveRewards,
    has_all_rewards: exclusiveRewards.every(r => r.awarded),
    player_id: userId
  });
});

// POST /api/shop/first-charge/equip-frame — 装备头像框
router.post('/first-charge/equip-frame', (req, res) => {
  const userId = parseInt(req.body.userId || req.body.player_id || 1);
  const frameId = req.body.frameId || req.body.frame_id || 'first_charge_frame';
  const db = getDb(req);

  if (!db) {
    return res.status(500).json({ success: false, error: '数据库不可用' });
  }
  initFirstChargeTables(db);

  // 检查是否拥有该头像框
  const owned = db.prepare(
    'SELECT * FROM player_avatar_frames WHERE user_id = ? AND frame_id = ?'
  ).get(userId, frameId);

  if (!owned) {
    return res.status(400).json({ success: false, error: '未拥有该头像框' });
  }

  // 装备头像框（先卸下其他）
  db.prepare('UPDATE player_avatar_frames SET equipped = 0 WHERE user_id = ?').run(userId);
  db.prepare('UPDATE player_avatar_frames SET equipped = 1 WHERE user_id = ? AND frame_id = ?').run(userId, frameId);

  res.json({
    success: true,
    message: `已装备头像框「${owned.frame_name}」`,
    frame_id: frameId
  });
});

module.exports = router;
