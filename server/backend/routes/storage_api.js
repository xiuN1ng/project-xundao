/**
 * 仓库系统 API
 * 多页仓库，物品存入取出
 * 10页×50格=500格总容量
 */

const express = require('express');
const router = express.Router();
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');
const STORAGE_PAGES = 10;
const SLOTS_PER_PAGE = 50;
const MAX_STACK = 999;

let db = null;

function getDb() {
  if (!db) {
    const Database = require('better-sqlite3');
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
    initStorageTables(db);
  }
  return db;
}

function initStorageTables(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS player_storage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      page INTEGER DEFAULT 1,
      slot INTEGER NOT NULL,
      item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      item_icon TEXT,
      item_data TEXT,
      quantity INTEGER DEFAULT 1,
      quality TEXT DEFAULT 'normal',
      source TEXT DEFAULT 'storage',
      acquired_at TEXT DEFAULT (datetime('now', '+8 hours')),
      UNIQUE(player_id, page, slot)
    )
  `);
  
  database.exec(`
    CREATE TABLE IF NOT EXISTS player_storage_config (
      player_id INTEGER PRIMARY KEY,
      current_page INTEGER DEFAULT 1,
      max_pages INTEGER DEFAULT ${STORAGE_PAGES},
      max_slots_per_page INTEGER DEFAULT ${SLOTS_PER_PAGE},
      updated_at TEXT DEFAULT (datetime('now', '+8 hours'))
    )
  `);
}

function getStorageConfig(database, playerId) {
  let config = database.prepare('SELECT * FROM player_storage_config WHERE player_id = ?').get(playerId);
  if (!config) {
    database.prepare('INSERT INTO player_storage_config (player_id) VALUES (?)').run(playerId);
    config = database.prepare('SELECT * FROM player_storage_config WHERE player_id = ?').get(playerId);
  }
  return config;
}

function findBagItem(database, playerId, itemId) {
  return database.prepare(
    'SELECT * FROM player_items WHERE user_id = ? AND item_id = ?'
  ).get(playerId, itemId);
}

function getStorageItem(database, playerId, page, slot) {
  return database.prepare(
    'SELECT * FROM player_storage WHERE player_id = ? AND page = ? AND slot = ?'
  ).get(playerId, page, slot);
}

function findStorageItem(database, playerId, itemId) {
  return database.prepare(
    'SELECT * FROM player_storage WHERE player_id = ? AND item_id = ? AND quantity < ? ORDER BY acquired_at ASC'
  ).get(playerId, itemId, MAX_STACK);
}

function getPageItems(database, playerId, page) {
  return database.prepare(
    'SELECT * FROM player_storage WHERE player_id = ? AND page = ? ORDER BY slot ASC'
  ).all(playerId, page);
}

function allocateSlot(database, playerId, page) {
  const items = getPageItems(database, playerId, page);
  const occupiedSlots = new Set(items.map(i => i.slot));
  for (let s = 1; s <= SLOTS_PER_PAGE; s++) {
    if (!occupiedSlots.has(s)) return s;
  }
  return null;
}

function countStorageItems(database, playerId) {
  return database.prepare('SELECT COUNT(*) as count FROM player_storage WHERE player_id = ?').get(playerId).count;
}

function findBagItemById(database, bagItemId) {
  return database.prepare('SELECT * FROM player_items WHERE id = ?').get(bagItemId);
}

// ============ API 端点 ============

// GET /api/storage/pages - 获取仓库页数信息
router.get('/pages', (req, res) => {
  const playerId = parseInt(req.query.player_id || req.query.playerId || req.headers['x-player-id'] || '1');
  
  try {
    const database = getDb();
    const config = getStorageConfig(database, playerId);
    const totalItems = countStorageItems(database, playerId);
    const totalSlots = config.max_pages * config.max_slots_per_page;
    
    res.json({
      success: true,
      data: {
        currentPage: config.current_page,
        maxPages: config.max_pages,
        totalSlots: totalSlots,
        usedSlots: totalItems,
        freeSlots: totalSlots - totalItems,
        slotsPerPage: config.max_slots_per_page
      }
    });
  } catch (e) {
    res.json({ success: false, message: '获取仓库信息失败', error: e.message });
  }
});

// GET /api/storage/items - 获取仓库物品列表
router.get('/items', (req, res) => {
  const playerId = parseInt(req.query.player_id || req.query.playerId || req.headers['x-player-id'] || '1');
  const page = parseInt(req.query.page || 1);
  
  try {
    const database = getDb();
    const config = getStorageConfig(database, playerId);
    if (page < 1 || page > config.max_pages) {
      return res.json({ success: false, message: '无效的页码' });
    }
    
    const items = getPageItems(database, playerId, page);
    const formattedItems = items.map(item => ({
      id: item.id,
      itemId: item.item_id,
      name: item.item_name,
      icon: item.item_icon || '📦',
      quantity: item.quantity,
      quality: item.quality,
      source: item.source,
      page: item.page,
      slot: item.slot,
      createdAt: item.acquired_at
    }));
    
    res.json({
      success: true,
      data: {
        page,
        maxPages: config.max_pages,
        items: formattedItems,
        totalItems: formattedItems.length,
        slotsPerPage: config.max_slots_per_page
      }
    });
  } catch (e) {
    res.json({ success: false, message: '获取仓库物品失败', error: e.message });
  }
});

// POST /api/storage/deposit - 背包→仓库
router.post('/deposit', (req, res) => {
  const playerId = parseInt(req.body.player_id || req.body.playerId || req.headers['x-player-id'] || '1');
  const { item_id, itemId, quantity = 1, page } = req.body;
  
  const itemIdStr = item_id || itemId;
  if (!itemIdStr) {
    return res.json({ success: false, message: '请提供物品ID' });
  }
  
  const qty = parseInt(quantity);
  
  try {
    const database = getDb();
    
    const bagItem = findBagItem(database, playerId, itemIdStr);
    if (!bagItem) {
      return res.json({ success: false, message: '背包中没有该物品' });
    }
    if (bagItem.count < qty) {
      return res.json({ success: false, message: '物品数量不足' });
    }
    
    const config = getStorageConfig(database, playerId);
    const targetPage = page || config.current_page;
    
    const existingItem = findStorageItem(database, playerId, itemIdStr);
    if (existingItem && existingItem.page === targetPage) {
      const canAdd = MAX_STACK - existingItem.quantity;
      const actualAdd = Math.min(canAdd, qty);
      database.prepare('UPDATE player_storage SET quantity = quantity + ? WHERE id = ?').run(actualAdd, existingItem.id);
    } else {
      const slot = allocateSlot(database, playerId, targetPage);
      if (slot === null) {
        return res.json({ success: false, message: '该页仓库已满' });
      }
      
      database.prepare(
        'INSERT INTO player_storage (player_id, page, slot, item_id, item_name, item_icon, quantity, quality, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(playerId, targetPage, slot, itemIdStr, bagItem.item_name, bagItem.icon, qty, bagItem.quality || 'normal', bagItem.source || 'storage');
    }
    
    if (bagItem.count === qty) {
      database.prepare('DELETE FROM player_items WHERE id = ?').run(bagItem.id);
    } else {
      database.prepare('UPDATE player_items SET count = count - ? WHERE id = ?').run(qty, bagItem.id);
    }
    
    res.json({ success: true, message: '物品已存入仓库' });
  } catch (e) {
    res.json({ success: false, message: '存入仓库失败', error: e.message });
  }
});

// POST /api/storage/withdraw - 仓库→背包
router.post('/withdraw', (req, res) => {
  const playerId = parseInt(req.body.player_id || req.body.playerId || req.headers['x-player-id'] || '1');
  const { item_id, itemId, quantity = 1, page, slot } = req.body;
  
  const itemIdStr = item_id || itemId;
  if (!itemIdStr) {
    return res.json({ success: false, message: '请提供物品ID' });
  }
  
  const qty = parseInt(quantity);
  
  try {
    const database = getDb();
    
    let storageItem;
    if (page && slot) {
      storageItem = getStorageItem(database, playerId, page, slot);
      if (storageItem && storageItem.item_id !== itemIdStr) {
        storageItem = null;
      }
    }
    if (!storageItem) {
      storageItem = database.prepare(
        'SELECT * FROM player_storage WHERE player_id = ? AND item_id = ? ORDER BY acquired_at ASC'
      ).get(playerId, itemIdStr);
    }
    
    if (!storageItem) {
      return res.json({ success: false, message: '仓库中没有该物品' });
    }
    if (storageItem.quantity < qty) {
      return res.json({ success: false, message: '仓库中物品数量不足' });
    }
    
    const bagItem = findBagItem(database, playerId, itemIdStr);
    if (bagItem) {
      const canAdd = MAX_STACK - bagItem.count;
      const actualAdd = Math.min(canAdd, qty);
      if (actualAdd > 0) {
        database.prepare('UPDATE player_items SET count = count + ? WHERE id = ?').run(actualAdd, bagItem.id);
      }
      const remaining = qty - actualAdd;
      if (remaining > 0) {
        const newBagItem = database.prepare(
          'SELECT * FROM player_items WHERE user_id = ? AND item_id = ? AND count < ?'
        ).get(playerId, itemIdStr, MAX_STACK);
        if (newBagItem) {
          const canAdd2 = MAX_STACK - newBagItem.count;
          const actualAdd2 = Math.min(canAdd2, remaining);
          database.prepare('UPDATE player_items SET count = count + ? WHERE id = ?').run(actualAdd2, newBagItem.id);
        } else {
          database.prepare(
            'INSERT INTO player_items (user_id, item_id, item_name, item_type, count, icon, source, quality) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
          ).run(playerId, itemIdStr, storageItem.item_name, 'material', remaining, storageItem.item_icon || '📦', 'storage', storageItem.quality || 'normal');
        }
      }
    } else {
      database.prepare(
        'INSERT INTO player_items (user_id, item_id, item_name, item_type, count, icon, source, quality) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(playerId, itemIdStr, storageItem.item_name, 'material', qty, storageItem.item_icon || '📦', 'storage', storageItem.quality || 'normal');
    }
    
    if (storageItem.quantity === qty) {
      database.prepare('DELETE FROM player_storage WHERE id = ?').run(storageItem.id);
    } else {
      database.prepare('UPDATE player_storage SET quantity = quantity - ? WHERE id = ?').run(qty, storageItem.id);
    }
    
    res.json({ success: true, message: '物品已取出到背包' });
  } catch (e) {
    res.json({ success: false, message: '取出仓库失败', error: e.message });
  }
});

module.exports = router;
