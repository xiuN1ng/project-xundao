/**
 * 抽奖系统 Gacha API
 * 实现奖池配置、抽取逻辑、保底机制、玩家历史
 */

const express = require('express');
const router = express.Router();
const path = require('path');

// 数据库路径 (统一使用 backend/data/game.db)
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
} catch (e) {
  console.error('[gacha] Failed to load better-sqlite3:', e.message);
}

// ============================================================
// P0-1 修复：服务端鉴权中间件
// 从 req.user.id 获取登录用户ID，禁止从 body/query 接收
// ============================================================
function requireAuth(req, res, next) {
  const userId = req.user && req.user.id;
  if (!userId) {
    return res.status(401).json({ success: false, error: '未登录或登录已过期' });
  }
  req.authUserId = userId;
  next();
}

// ==================== 数据库初始化 ====================

function initGachaTables() {
  if (!db) return;
  try {
    db.exec(`
      -- 奖池配置表
      CREATE TABLE IF NOT EXISTS gacha_pools (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pool_key TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        cost_single INTEGER NOT NULL DEFAULT 100,
        cost_ten INTEGER NOT NULL DEFAULT 900,
        is_premium INTEGER DEFAULT 0,
        weights TEXT DEFAULT '[]',
        items TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- 玩家抽卡记录表
      CREATE TABLE IF NOT EXISTS gacha_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        pool_key TEXT NOT NULL,
        draw_type TEXT NOT NULL DEFAULT 'single',
        item_key TEXT NOT NULL,
        item_name TEXT NOT NULL,
        rarity TEXT NOT NULL,
        cost INTEGER NOT NULL,
        pity_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- 玩家保底计数器
      CREATE TABLE IF NOT EXISTS gacha_pity (
        user_id INTEGER NOT NULL,
        pool_key TEXT NOT NULL,
        non_premium_count INTEGER DEFAULT 0,
        last_draw_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, pool_key)
      );
    `);

    // 插入默认奖池数据（如果为空）
    const count = db.prepare('SELECT COUNT(*) as c FROM gacha_pools').get().c;
    if (count === 0) {
      insertDefaultPools();
    }
  } catch (e) {
    console.error('[gacha] initGachaTables error:', e.message);
  }
}

function insertDefaultPools() {
  // 普通奖池
  const standardItems = [
    { key: 'iron_ingot', name: '玄铁锭', rarity: 'white', weight: 30 },
    { key: 'spirit_stone_10', name: '灵石×10', rarity: 'white', weight: 25 },
    { key: 'jade', name: '玉石', rarity: 'white', weight: 15 },
    { key: 'fire_crystal', name: '火焰结晶', rarity: 'green', weight: 12 },
    { key: 'ice_crystal', name: '寒冰结晶', rarity: 'green', weight: 8 },
    { key: 'wood_essence', name: '木之精华', rarity: 'green', weight: 5 },
    { key: 'mid_tonic', name: '中品丹药', rarity: 'blue', weight: 3 },
    { key: 'spirit_beast_egg', name: '灵兽蛋(绿)', rarity: 'green', weight: 1.5 },
    { key: 'high_tonic', name: '上品丹药', rarity: 'purple', weight: 0.4 },
    { key: 'rare_beast_egg', name: '灵兽蛋(紫)', rarity: 'purple', weight: 0.09 },
    { key: 'myth_beast_egg', name: '混沌灵兽蛋', rarity: 'orange', weight: 0.08 },
    { key: 'destiny_beast_egg', name: '天命灵兽蛋', rarity: 'red', weight: 0.01 },
  ];

  // 高级奖池
  const premiumItems = [
    { key: 'spirit_stone_50', name: '灵石×50', rarity: 'white', weight: 25 },
    { key: 'high_tonic', name: '上品丹药', rarity: 'white', weight: 25 },
    { key: 'fire_crystal', name: '火焰结晶', rarity: 'green', weight: 20 },
    { key: 'ice_crystal', name: '寒冰结晶', rarity: 'green', weight: 15 },
    { key: 'rare_beast_egg', name: '灵兽蛋(紫)', rarity: 'purple', weight: 10 },
    { key: 'legend_tonic', name: '极品丹药', rarity: 'purple', weight: 4 },
    { key: 'myth_beast_egg', name: '混沌灵兽蛋', rarity: 'orange', weight: 1 },
    { key: 'destiny_beast_egg', name: '天命灵兽蛋', rarity: 'red', weight: 0.05 },
  ];

  // 装备奖池
  const equipItems = [
    { key: 'weapon_shard', name: '仙剑碎片', rarity: 'white', weight: 30 },
    { key: 'armor_shard', name: '仙袍碎片', rarity: 'white', weight: 30 },
    { key: 'weapon_rare', name: '仙剑(紫)', rarity: 'purple', weight: 3 },
    { key: 'armor_rare', name: '仙袍(紫)', rarity: 'purple', weight: 3 },
    { key: 'weapon_legend', name: '仙剑(金)', rarity: 'orange', weight: 0.5 },
    { key: 'armor_legend', name: '仙袍(金)', rarity: 'orange', weight: 0.5 },
    { key: 'weapon_destiny', name: '天命仙剑', rarity: 'red', weight: 0.1 },
    { key: 'armor_destiny', name: '天命仙袍', rarity: 'red', weight: 0.1 },
  ];

  const pools = [
    {
      pool_key: 'standard',
      name: '普通奖池',
      description: '修炼资源奖池，涵盖灵石、丹药、材料',
      cost_single: 100,
      cost_ten: 900,
      is_premium: 0,
      items: standardItems
    },
    {
      pool_key: 'premium',
      name: '高级奖池',
      description: '珍稀灵兽与极品丹药，保底90抽',
      cost_single: 300,
      cost_ten: 2700,
      is_premium: 1,
      items: premiumItems
    },
    {
      pool_key: 'equipment',
      name: '装备奖池',
      description: '仙剑仙袍装备抽取',
      cost_single: 200,
      cost_ten: 1800,
      is_premium: 1,
      items: equipItems
    },
  ];

  const insert = db.prepare(`
    INSERT INTO gacha_pools (pool_key, name, description, cost_single, cost_ten, is_premium, items)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const p of pools) {
    insert.run(p.pool_key, p.name, p.description, p.cost_single, p.cost_ten, p.is_premium, JSON.stringify(p.items));
  }
}

// ==================== 稀有度映射 ====================
// 统一稀有度: N(白) R(绿) SR(蓝) SSR(紫) UR(橙) DR(红)
const RARITY_MAP = {
  white: 'N',
  green: 'R',
  blue: 'SR',
  purple: 'SSR',
  orange: 'UR',
  red: 'DR'
};

function toFrontendRarity(r) {
  return RARITY_MAP[r] || 'N';
}

// ==================== 工具函数 ====================

// 按权重随机抽取
function weightedRandom(items) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item;
  }
  return items[items.length - 1];
}

// 获取或初始化保底计数
function getPityRecord(userId, poolKey) {
  try {
    const existing = db.prepare('SELECT * FROM gacha_pity WHERE user_id = ? AND pool_key = ?').get(userId, poolKey);
    if (existing) return existing;
    // 初始化
    db.prepare('INSERT OR IGNORE INTO gacha_pity (user_id, pool_key, non_premium_count) VALUES (?, ?, 0)').run(userId, poolKey);
    return { user_id: userId, pool_key: poolKey, non_premium_count: 0 };
  } catch (e) {
    return { user_id: userId, pool_key: poolKey, non_premium_count: 0 };
  }
}

// 更新保底计数
function updatePityRecord(userId, poolKey, nonPremiumCount) {
  try {
    db.prepare(`
      INSERT INTO gacha_pity (user_id, pool_key, non_premium_count, last_draw_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, pool_key) DO UPDATE SET non_premium_count = ?, last_draw_at = CURRENT_TIMESTAMP
    `).run(userId, poolKey, nonPremiumCount, nonPremiumCount);
  } catch (e) {
    console.error('[gacha] updatePityRecord error:', e.message);
  }
}

// 记录抽卡历史
function recordDraw(userId, poolKey, drawType, item, cost, pityCount) {
  try {
    db.prepare(`
      INSERT INTO gacha_history (user_id, pool_key, draw_type, item_key, item_name, rarity, cost, pity_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, poolKey, drawType, item.key, item.name, item.rarity, cost, pityCount);
  } catch (e) {
    console.error('[gacha] recordDraw error:', e.message);
  }
}

// 发放物品给玩家
function awardItem(userId, item, count = 1) {
  try {
    const existing = db.prepare(`
      SELECT id, count FROM player_items WHERE user_id = ? AND item_key = ?
    `).get(userId, item.key);

    if (existing) {
      db.prepare('UPDATE player_items SET count = count + ? WHERE id = ?').run(count, existing.id);
    } else {
      db.prepare(`
        INSERT INTO player_items (user_id, item_key, item_name, item_type, count, icon, source)
        VALUES (?, ?, ?, ?, ?, '🎁', 'gacha')
      `).run(userId, item.key, item.name, item.rarity, count);
    }

    // 直接发放灵石
    if (item.key === 'spirit_stone_10') {
      db.prepare('UPDATE Users SET lingshi = lingshi + 10 WHERE id = ?').run(userId);
    } else if (item.key === 'spirit_stone_50') {
      db.prepare('UPDATE Users SET lingshi = lingshi + 50 WHERE id = ?').run(userId);
    }
  } catch (e) {
    console.error('[gacha] awardItem error:', e.message);
  }
}

// 扣除灵石
function deductCost(userId, amount) {
  try {
    const player = db.prepare('SELECT lingshi FROM Users WHERE id = ?').get(userId);
    if (!player || player.lingshi < amount) {
      return false;
    }
    db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(amount, userId);
    return true;
  } catch (e) {
    console.error('[gacha] deductCost error:', e.message);
    return false;
  }
}

// ==================== 路由端点 ====================

// 初始化数据库
initGachaTables();

// GET /api/gacha/ - 根路径，返回奖池概览
router.get('/', (req, res) => {
  if (!db) return res.status(500).json({ success: false, error: '数据库未初始化' });
  try {
    const pools = db.prepare('SELECT pool_key, name, description, cost_single, cost_ten, is_premium FROM gacha_pools').all();
    res.json({ success: true, pools: pools.map(p => ({
      poolKey: p.pool_key,
      name: p.name,
      description: p.description,
      costSingle: p.cost_single,
      costTen: p.cost_ten,
      isPremium: p.is_premium === 1,
    })) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/gacha/pools - 获取所有奖池配置
router.get('/pools', (req, res) => {
  if (!db) return res.status(500).json({ success: false, error: '数据库未初始化' });
  try {
    const pools = db.prepare('SELECT * FROM gacha_pools').all();
    const result = pools.map(p => ({
      poolKey: p.pool_key,
      name: p.name,
      description: p.description,
      costSingle: p.cost_single,
      costTen: p.cost_ten,
      isPremium: p.is_premium === 1,
      itemCount: JSON.parse(p.items || '[]').length,
    }));
    res.json({ success: true, pools: result });
  } catch (e) {
    console.error('[gacha/pools] error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/gacha/pools/:poolKey - 获取单个奖池详情
router.get('/pools/:poolKey', (req, res) => {
  if (!db) return res.status(500).json({ success: false, error: '数据库未初始化' });
  try {
    const pool = db.prepare('SELECT * FROM gacha_pools WHERE pool_key = ?').get(req.params.poolKey);
    if (!pool) return res.status(404).json({ success: false, error: '奖池不存在' });
    const items = JSON.parse(pool.items || '[]');
    res.json({
      success: true,
      pool: {
        poolKey: pool.pool_key,
        name: pool.name,
        description: pool.description,
        costSingle: pool.cost_single,
        costTen: pool.cost_ten,
        isPremium: pool.is_premium === 1,
        items: items.map(i => ({ ...i, rarity: toFrontendRarity(i.rarity) })),
      }
    });
  } catch (e) {
    console.error('[gacha/pools/:poolKey] error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/gacha/draw - 单抽
// P0-1: 添加鉴权，P0-4: 事务保证原子性
router.post('/draw', requireAuth, (req, res) => {
  if (!db) return res.status(500).json({ success: false, error: '数据库未初始化' });

  const userId = req.authUserId;
  const poolKey = req.body.pool_key ?? req.body.poolKey ?? 'standard';

  const pool = db.prepare('SELECT * FROM gacha_pools WHERE pool_key = ?').get(poolKey);
  if (!pool) return res.status(404).json({ success: false, error: '奖池不存在' });

  const cost = pool.cost_single;
  const items = JSON.parse(pool.items || '[]');
  const pityRecord = getPityRecord(userId, poolKey);
  let pityCount = pityRecord.non_premium_count;

  let item;
  if (pool.is_premium === 1 && pityCount >= 89) {
    // 保底：必出紫色或橙色
    const guaranteed = items.filter(i => i.rarity === 'purple' || i.rarity === 'orange');
    item = weightedRandom(guaranteed.length > 0 ? guaranteed : items);
  } else {
    item = weightedRandom(items);
  }

  const newPityCount = (item.rarity !== 'purple' && item.rarity !== 'orange') ? pityCount + 1 : 0;

  // P0-4 修复：事务保证原子性（扣费 + 更新保底 + 发奖 + 记录）
  try {
    const transaction = db.transaction(() => {
      // 扣灵石
      const player = db.prepare('SELECT lingshi FROM Users WHERE id = ?').get(userId);
      if (!player || player.lingshi < cost) {
        throw new Error('灵石不足');
      }
      db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(cost, userId);

      // 更新保底计数
      updatePityRecord(userId, poolKey, newPityCount);

      // 发放物品
      awardItem(userId, item, 1);

      // 记录抽卡历史
      recordDraw(userId, poolKey, 'single', item, cost, pityCount);
    });

    transaction();
  } catch (err) {
    if (err.message === '灵石不足') {
      return res.json({ success: false, error: '灵石不足', required: cost });
    }
    console.error('[gacha/draw] error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }

  res.json({
    success: true,
    item: { key: item.key, name: item.name, rarity: toFrontendRarity(item.rarity) },
    pityCount: newPityCount,
    cost,
    remainingPity: pool.is_premium === 1 ? Math.max(0, 90 - newPityCount) : null,
  });
});

// POST /api/gacha/draw-ten - 十连抽
// P0-1: 添加鉴权，P0-4: 事务保证原子性
router.post('/draw-ten', requireAuth, (req, res) => {
  if (!db) return res.status(500).json({ success: false, error: '数据库未初始化' });

  const userId = req.authUserId;
  const poolKey = req.body.pool_key ?? req.body.poolKey ?? 'standard';

  const pool = db.prepare('SELECT * FROM gacha_pools WHERE pool_key = ?').get(poolKey);
  if (!pool) return res.status(404).json({ success: false, error: '奖池不存在' });

  const cost = pool.cost_ten;
  const items = JSON.parse(pool.items || '[]');
  const pityRecord = getPityRecord(userId, poolKey);
  let pityCount = pityRecord.non_premium_count;

  const drawnItems = [];
  let guaranteedPurple = false;

  // 十连前9抽
  for (let i = 0; i < 9; i++) {
    if (pool.is_premium === 1 && pityCount >= 89) {
      const guaranteed = items.filter(it => it.rarity === 'purple' || it.rarity === 'orange');
      const item = weightedRandom(guaranteed.length > 0 ? guaranteed : items);
      drawnItems.push(item);
      pityCount = 0;
    } else {
      const item = weightedRandom(items);
      drawnItems.push(item);
      if (item.rarity !== 'purple' && item.rarity !== 'orange') {
        pityCount++;
      } else {
        pityCount = 0;
        if (item.rarity === 'purple' || item.rarity === 'orange') guaranteedPurple = true;
      }
    }
  }

  // 第10抽：保底紫色或橙色
  const guaranteedPool = items.filter(it => it.rarity === 'purple' || it.rarity === 'orange');
  const lastItem = pool.is_premium === 1 && !guaranteedPurple
    ? weightedRandom(guaranteedPool.length > 0 ? guaranteedPool : items)
    : weightedRandom(items);
  drawnItems.push(lastItem);

  const newPityCount = 0;

  // P0-4 修复：事务保证原子性（扣费 + 更新保底 + 发奖 + 记录）
  try {
    const transaction = db.transaction(() => {
      // 扣灵石
      const player = db.prepare('SELECT lingshi FROM Users WHERE id = ?').get(userId);
      if (!player || player.lingshi < cost) {
        throw new Error('灵石不足');
      }
      db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(cost, userId);

      // 更新保底计数
      updatePityRecord(userId, poolKey, newPityCount);

      // 发放所有物品并记录历史
      for (const item of drawnItems) {
        awardItem(userId, item, 1);
        recordDraw(userId, poolKey, 'ten', item, Math.floor(cost / 10), pityCount);
      }
    });

    transaction();
  } catch (err) {
    if (err.message === '灵石不足') {
      return res.json({ success: false, error: '灵石不足', required: cost });
    }
    console.error('[gacha/draw-ten] error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }

  // 按稀有度排序展示（统一格式：DR > UR > SSR > SR > R > N）
  const rarityOrder = { red: 0, orange: 1, purple: 2, blue: 3, green: 4, white: 5 };
  drawnItems.sort((a, b) => (rarityOrder[a.rarity] || 6) - (rarityOrder[b.rarity] || 6));

  res.json({
    success: true,
    items: drawnItems.map(item => ({ key: item.key, name: item.name, rarity: toFrontendRarity(item.rarity) })),
    cost: cost,
    isGuaranteed: guaranteedPurple || lastItem.rarity === 'purple' || lastItem.rarity === 'orange',
  });
});

// GET /api/gacha/history - 获取抽卡历史
router.get('/history', requireAuth, (req, res) => {
  if (!db) return res.status(500).json({ success: false, error: '数据库未初始化' });

  const userId = req.authUserId;
  const poolKey = req.query.pool_key ?? req.query.poolKey;
  const limit = Math.min(parseInt(req.query.limit ?? 20), 100);

  try {
    let query = `
      SELECT h.*, p.name as pool_name
      FROM gacha_history h
      LEFT JOIN gacha_pools p ON p.pool_key = h.pool_key
      WHERE h.user_id = ?
    `;
    const params = [userId];

    if (poolKey) {
      query += ' AND h.pool_key = ?';
      params.push(poolKey);
    }

    query += ' ORDER BY h.created_at DESC LIMIT ?';
    params.push(limit);

    const history = db.prepare(query).all(...params);
    res.json({
      success: true,
      history: history.map(h => ({
        itemKey: h.item_key,
        itemName: h.item_name,
        rarity: toFrontendRarity(h.rarity),
        poolKey: h.pool_key,
        poolName: h.pool_name,
        drawType: h.draw_type,
        cost: h.cost,
        pityCount: h.pity_count,
        createdAt: h.created_at,
      }))
    });
  } catch (e) {
    console.error('[gacha/history] error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/gacha/pity - 获取保底状态
router.get('/pity', requireAuth, (req, res) => {
  if (!db) return res.status(500).json({ success: false, error: '数据库未初始化' });

  const userId = req.authUserId;
  const poolKey = req.query.pool_key ?? req.query.poolKey ?? 'standard';

  try {
    const pool = db.prepare('SELECT * FROM gacha_pools WHERE pool_key = ?').get(poolKey);
    if (!pool) return res.status(404).json({ success: false, error: '奖池不存在' });

    const pity = getPityRecord(userId, poolKey);
    const nonPremiumCount = pity ? pity.non_premium_count : 0;
    const remainingPity = pool.is_premium === 1 ? Math.max(0, 90 - nonPremiumCount) : null;

    res.json({
      success: true,
      poolKey,
      nonPremiumCount,
      remainingPity,
      isPityReady: pool.is_premium === 1 && nonPremiumCount >= 89,
    });
  } catch (e) {
    console.error('[gacha/pity] error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
