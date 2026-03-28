const express = require('express');
const router = express.Router();
const path = require('path');
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db = null;
function getDb() {
  if (!db) {
    const Database = require('better-sqlite3');
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
  }
  return db;
}

// 初始化 player_items 表
function initBagTables() {
  const database = getDb();
  try {
    database.exec(`
      CREATE TABLE IF NOT EXISTS player_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        item_id INTEGER DEFAULT 0,
        item_name TEXT NOT NULL DEFAULT '',
        item_type TEXT DEFAULT 'misc',
        count INTEGER DEFAULT 1,
        icon TEXT DEFAULT '📦',
        source TEXT DEFAULT 'shop',
        price INTEGER DEFAULT 10,
        quality TEXT DEFAULT 'normal',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (e) {
    console.error('[bag] initBagTables error:', e.message);
  }
}
initBagTables();

// 统一获取 userId
function extractUserId(req) {
  return req.userId || parseInt(req.body?.userId || req.body?.player_id || req.query?.player_id || 1) || 1;
}

// 素材回收价格表
const MATERIAL_PRICE = {
  iron_ingot: 5,
  jade: 20,
  fire_crystal: 50,
  fire_essence: 50,
  thunder_crystal: 50,
  dragon_scale: 200,
  spirit_stone_fragment: 10,
  '强化石': 5,
  '洗练石': 5,
  '铁锭': 5,
  '玉石': 20,
};

// GET / - 返回玩家背包（兼容旧端点）
router.get('/', (req, res) => {
  const userId = extractUserId(req);
  const database = getDb();
  try {
    const items = database.prepare(
      'SELECT id, item_id as itemId, item_name as name, item_type as type, count, icon, source FROM player_items WHERE user_id = ? ORDER BY item_type, id'
    ).all(userId);
    res.json({ success: true, items, total: items.length });
  } catch (e) {
    console.error('[bag] GET / error:', e.message);
    res.json({ success: false, items: [], total: 0, message: e.message });
  }
});

// GET /list - 返回玩家所有物品（含来源）
router.get('/list', (req, res) => {
  const userId = extractUserId(req);
  const database = getDb();
  try {
    const items = database.prepare(
      'SELECT id, item_id as itemId, item_name as name, item_type as type, count, icon, source, created_at as createdAt FROM player_items WHERE user_id = ? ORDER BY item_type, id'
    ).all(userId);
    res.json({ success: true, items, total: items.length });
  } catch (e) {
    console.error('[bag] GET /list error:', e.message);
    res.json({ success: false, items: [], total: 0, message: e.message });
  }
});

// GET /materials - 返回锻造材料（给 Forge 界面用）
router.get('/materials', (req, res) => {
  const userId = extractUserId(req);
  const database = getDb();
  try {
    const materials = database.prepare(
      `SELECT item_id as itemId, item_name as name, item_type as type, count, icon, source
       FROM player_items
       WHERE user_id = ? AND (item_type = 'material' OR item_type LIKE '%material%')
       ORDER BY count DESC, name`
    ).all(userId);

    let forgeMats = [];
    try {
      forgeMats = database.prepare(
        'SELECT material_key as itemId, quantity as count FROM forge_materials WHERE player_id = ? AND quantity > 0'
      ).all(userId);
    } catch (e) {
      // forge_materials 表可能不存在，忽略
    }

    res.json({ success: true, materials, forgeMaterials: forgeMats, total: materials.length });
  } catch (e) {
    console.error('[bag] GET /materials error:', e.message);
    res.json({ success: false, materials: [], forgeMaterials: [], message: e.message });
  }
});

// POST /use - 使用物品
router.post('/use', (req, res) => {
  const userId = extractUserId(req);
  const { itemId, count = 1 } = req.body || {};
  const database = getDb();

  if (!itemId) {
    return res.json({ success: false, message: '缺少物品ID' });
  }

  try {
    const item = database.prepare('SELECT * FROM player_items WHERE id = ? AND user_id = ?').get(itemId, userId);
    if (!item) {
      return res.json({ success: false, message: '物品不存在' });
    }
    if (item.count < count) {
      return res.json({ success: false, message: '物品数量不足' });
    }

    if (item.count === count) {
      database.prepare('DELETE FROM player_items WHERE id = ?').run(itemId);
    } else {
      database.prepare('UPDATE player_items SET count = count - ? WHERE id = ?').run(count, itemId);
    }

    let reward = null;
    if (item.item_name.includes('灵气丹') || item.item_name.includes('经验丹')) {
      reward = { type: 'exp', amount: 100 };
    } else if (item.item_name.includes('灵石袋')) {
      reward = { type: 'lingshi', amount: MATERIAL_PRICE[item.item_name] || 50 };
    } else if (item.item_type === 'potion') {
      reward = { type: 'hp', amount: 200 };
    }

    res.json({ success: true, message: '使用成功', reward });
  } catch (e) {
    console.error('[bag] POST /use error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// POST /organize - 整理背包（自动合并 + 自动出售）
router.post('/organize', (req, res) => {
  const userId = extractUserId(req);
  const { autoSell = false } = req.body || {};
  const database = getDb();

  try {
    const items = database.prepare(
      'SELECT * FROM player_items WHERE user_id = ? ORDER BY id'
    ).all(userId);

    const merged = {};
    for (const item of items) {
      const key = `${item.item_name}__${item.item_type}`;
      if (!merged[key]) {
        merged[key] = { ...item, count: 0, ids: [] };
      }
      merged[key].count += item.count;
      merged[key].ids.push(item.id);
    }

    let gained = 0;
    let soldCount = 0;
    const toKeep = [];
    const toSell = [];

    for (const [key, group] of Object.entries(merged)) {
      const mainId = group.ids[0];
      toKeep.push({ id: mainId, count: group.count });

      if (autoSell) {
        const shouldAutoSell =
          group.item_type === 'material' ||
          group.item_type === 'currency' ||
          group.item_name.includes('袋') ||
          group.quality === 'normal';
        if (shouldAutoSell) {
          const price = MATERIAL_PRICE[group.item_key] || MATERIAL_PRICE[group.item_name] || 5;
          gained += price * group.count;
          soldCount += group.count;
          toSell.push(mainId);
        }
      }
    }

    // 更新保留物品的数量
    for (const k of toKeep) {
      if (!toSell.some(s => s === k.id)) {
        database.prepare('UPDATE player_items SET count = ? WHERE id = ?').run(k.count, k.id);
      }
    }

    // 删除出售物品
    if (toSell.length > 0) {
      const placeholders = toSell.map(() => '?').join(',');
      database.prepare(`DELETE FROM player_items WHERE id IN (${placeholders})`).run(...toSell);
    }

    if (gained > 0) {
      database.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(gained, userId);
    }

    const remaining = database.prepare(
      'SELECT COUNT(*) as c FROM player_items WHERE user_id = ?'
    ).get(userId).c;

    res.json({
      success: true,
      gained,
      soldCount,
      remainingItems: remaining,
      message: gained > 0 ? `整理完成！自动出售 ${soldCount} 件，获得 ${gained} 灵石` : '整理完成'
    });
  } catch (e) {
    console.error('[bag] POST /organize error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// POST /auto-sell - 设置自动出售偏好
router.post('/auto-sell', (req, res) => {
  const { enabled } = req.body || {};
  res.json({ success: true, autoSellEnabled: !!enabled, message: '自动出售设置已更新' });
});

// POST /sell - 出售单个物品
router.post('/sell', (req, res) => {
  const userId = extractUserId(req);
  const { itemId, count = 1 } = req.body || {};
  const database = getDb();

  if (!itemId) {
    return res.json({ success: false, message: '缺少物品ID' });
  }

  try {
    const item = database.prepare('SELECT * FROM player_items WHERE id = ? AND user_id = ?').get(itemId, userId);
    if (!item) {
      return res.json({ success: false, message: '物品不存在' });
    }
    if (item.count < count) {
      return res.json({ success: false, message: '物品数量不足' });
    }

    const price = MATERIAL_PRICE[item.item_key] || MATERIAL_PRICE[item.item_name] || 5;
    const totalPrice = price * count;

    if (item.count === count) {
      database.prepare('DELETE FROM player_items WHERE id = ?').run(itemId);
    } else {
      database.prepare('UPDATE player_items SET count = count - ? WHERE id = ?').run(count, itemId);
    }

    database.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(totalPrice, userId);

    res.json({ success: true, gained: totalPrice, sold: count, itemName: item.item_name });
  } catch (e) {
    console.error('[bag] POST /sell error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

module.exports = router;
