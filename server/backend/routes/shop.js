const express = require('express');
const router = express.Router();
const path = require('path');

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

router.post('/buy', (req, res) => {
  const userId = req.body.userId ?? req.body.player_id ?? 1;
  let itemId = req.body.itemId ?? req.body.item_id;
  const count = req.body.count ?? req.body.quantity ?? 1;

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

// GET /api/shop/daily-packages — 礼包列表（含玩家购买状态）
router.get('/daily-packages', (req, res) => {
  const userId = req.query.userId || req.query.player_id || 1;
  const db = getDb(req);
  if (!db) {
    return res.status(500).json({ success: false, error: '数据库不可用' });
  }

  // 初始化表
  initDailyPackageTables(db);

  // 获取玩家信息（等级/VIP）
  const user = db.prepare('SELECT id, level, vipLevel, lingshi FROM Users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ success: false, error: '玩家不存在' });
  }

  const today = getShanghaiDateStr();
  const weekStart = getShanghaiWeekStr();
  const packages = DAILY_PACKAGE_DEFINITIONS.map(pkg => {
    // 检查购买状态
    let purchased = false;
    let remaining = null;

    if (pkg.limit_type === 'permanent') {
      const row = db.prepare('SELECT id FROM daily_package_purchases WHERE user_id=? AND package_id=? AND active=1').get(userId, pkg.id);
      purchased = !!row;
    } else if (pkg.limit_type === 'daily') {
      const row = db.prepare("SELECT id FROM daily_package_logs WHERE user_id=? AND package_id=? AND purchased_at >= ?").get(userId, pkg.id, today + ' 00:00:00');
      purchased = !!row;
      remaining = purchased ? 0 : 1;
    } else if (pkg.limit_type === 'weekly') {
      const row = db.prepare("SELECT id FROM daily_package_logs WHERE user_id=? AND package_id=? AND purchased_at >= ?").get(userId, pkg.id, weekStart + ' 00:00:00');
      purchased = !!row;
      remaining = purchased ? 0 : 1;
    }

    // 月卡状态
    let monthlyCardStatus = null;
    if (pkg.is_monthly_card) {
      const card = db.prepare('SELECT expire_at, last_claim_at FROM player_monthly_cards WHERE user_id=? AND card_type=? AND active=1').get(userId, pkg.card_type);
      if (card) {
        const expired = card.expire_at && card.expire_at < today;
        const canClaimToday = !card.last_claim_at || card.last_claim_at < today + ' 00:00:00';
        monthlyCardStatus = { active: !expired, expired, canClaimToday, expireAt: card.expire_at };
        purchased = !expired;
      }
    }

    // 战令状态
    let battlePassStatus = null;
    if (pkg.is_battle_pass) {
      const bp = db.prepare('SELECT level, exp FROM player_battle_passes WHERE user_id=? AND season=? AND active=1').get(userId, pkg.season || 1);
      if (bp) {
        battlePassStatus = { level: bp.level, exp: bp.exp };
        purchased = true;
      }
    }

    return {
      id: pkg.id,
      name: pkg.name,
      icon: pkg.icon,
      price: pkg.price,
      price_diamond: pkg.price_diamond,
      category: pkg.category,
      description: pkg.description,
      contents: pkg.contents,
      limit_type: pkg.limit_type,
      remaining,
      purchased,
      monthlyCardStatus,
      battlePassStatus,
      level_required: pkg.level_required,
      vip_required: pkg.vip_required,
      canBuy: canPurchasePackage(db, userId, pkg, user).ok,
    };
  });

  res.json({ success: true, packages, playerLevel: user.level, playerVip: user.vipLevel || 0 });
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

// 辅助函数：获取本周一
function getShanghaiWeekStr() {
  const now = new Date(Date.now() + 8 * 3600 * 1000);
  const day = now.getUTCDay() || 7;
  const monday = new Date(now);
  monday.setUTCDate(monday.getUTCDate() - day + 1);
  return monday.toISOString().slice(0, 10);
}

module.exports = router;
