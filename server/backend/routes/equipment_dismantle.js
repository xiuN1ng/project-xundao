/**
 * 装备分解 API 路由
 * 提供装备分解为材料的功能
 */

const express = require('express');
const router = express.Router();
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');
let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  initTables();
} catch (e) {
  console.log('[equipment_dismantle] DB连接失败:', e.message);
  db = null;
}

function initTables() {
  if (!db) return;
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS player_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        item_id INTEGER,
        item_name TEXT,
        item_type TEXT,
        count INTEGER DEFAULT 1,
        icon TEXT,
        source TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (e) {
    console.error('[equipment_dismantle] 建表失败:', e.message);
  }
}

// 装备品质对应的分解材料
const DISMANTLE_RECIPES = {
  normal: { material: '普通精华', amount: 1, icon: '💎' },
  good: { material: '精良精华', amount: 2, icon: '💠' },
  rare: { material: '稀有精华', amount: 3, icon: '💎' },
  epic: { material: '史诗精华', amount: 5, icon: '🔮' },
  legendary: { material: '传说精华', amount: 10, icon: '🌟' },
};

// 默认分解配方（未知品质）
const DEFAULT_RECIPE = { material: '装备碎片', amount: 1, icon: '🔧' };

/**
 * GET /api/equipmentDismantle/info
 * 获取分解信息（配方预览）
 */
router.get('/info', (req, res) => {
  res.json({
    success: true,
    recipes: DISMANTLE_RECIPES
  });
});

/**
 * POST /api/equipmentDismantle/dismantle
 * 分解装备
 * body: { userId, itemId } 或 { userId, itemDbId } (直接传数据库记录ID)
 */
router.post('/dismantle', (req, res) => {
  const userId = parseInt(req.body.userId) || 1;
  const itemDbId = parseInt(req.body.itemDbId);
  const itemId = parseInt(req.body.itemId);
  
  if (!itemDbId && !itemId) {
    return res.json({ success: false, message: '缺少itemDbId或itemId' });
  }
  
  if (!db) {
    return res.json({ success: false, message: '数据库未连接' });
  }
  
  try {
    // 查找装备
    let item;
    if (itemDbId) {
      item = db.prepare('SELECT * FROM player_items WHERE id = ? AND user_id = ?').get(itemDbId, userId);
    } else {
      item = db.prepare('SELECT * FROM player_items WHERE item_id = ? AND user_id = ? LIMIT 1').get(itemId, userId);
    }
    
    if (!item) {
      return res.json({ success: false, message: '装备不存在' });
    }
    
    // 检查是否可分解（装备类型）
    const dismantleable = ['weapon', 'armor', 'helmet', 'shoes', 'accessory'];
    if (!dismantleable.includes(item.item_type)) {
      return res.json({ success: false, message: '该物品不可分解' });
    }
    
    // 确定品质（从item_name或默认normal）
    let quality = 'normal';
    const name = item.item_name || '';
    if (name.includes('传说') || name.includes('Legendary')) quality = 'legendary';
    else if (name.includes('史诗') || name.includes('Epic')) quality = 'epic';
    else if (name.includes('稀有') || name.includes('Rare')) quality = 'rare';
    else if (name.includes('精良') || name.includes('Good')) quality = 'good';
    
    const recipe = DISMANTLE_RECIPES[quality] || DEFAULT_RECIPE;
    
    // 扣除装备
    if (item.count > 1) {
      db.prepare('UPDATE player_items SET count = count - 1 WHERE id = ?').run(item.id);
    } else {
      db.prepare('DELETE FROM player_items WHERE id = ?').run(item.id);
    }
    
    // 发放分解材料
    db.prepare(`
      INSERT INTO player_items (user_id, item_name, item_type, count, icon, source)
      VALUES (?, ?, 'material', ?, ?, 'dismantle')
    `).run(userId, recipe.material, recipe.amount, recipe.icon);
    
    res.json({
      success: true,
      message: `分解成功，获得【${recipe.material}】×${recipe.amount}`,
      material: recipe
    });
  } catch (e) {
    console.error('[equipment_dismantle] 分解错误:', e.message);
    res.json({ success: false, message: e.message });
  }
});

/**
 * GET /api/equipmentDismantle/list
 * 获取玩家可分解的装备列表
 */
router.get('/list', (req, res) => {
  const userId = parseInt(req.query.userId) || 1;
  
  if (!db) {
    return res.json({ success: false, message: '数据库未连接' });
  }
  
  try {
    const dismantleable = ['weapon', 'armor', 'helmet', 'shoes', 'accessory'];
    const placeholders = dismantleable.map(() => '?').join(',');
    const items = db.prepare(
      `SELECT * FROM player_items WHERE user_id = ? AND item_type IN (${placeholders}) AND count > 0`
    ).all(userId, ...dismantable);
    
    const list = items.map(item => {
      let quality = 'normal';
      const name = item.item_name || '';
      if (name.includes('传说') || name.includes('Legendary')) quality = 'legendary';
      else if (name.includes('史诗') || name.includes('Epic')) quality = 'epic';
      else if (name.includes('稀有') || name.includes('Rare')) quality = 'rare';
      else if (name.includes('精良') || name.includes('Good')) quality = 'good';
      
      const recipe = DISMANTLE_RECIPES[quality] || DEFAULT_RECIPE;
      return {
        id: item.id,
        itemId: item.item_id,
        name: item.item_name,
        type: item.item_type,
        count: item.count,
        icon: item.icon,
        quality,
        materialReward: recipe
      };
    });
    
    res.json({ success: true, items: list });
  } catch (e) {
    console.error('[equipment_dismantle] list错误:', e.message);
    res.json({ success: false, message: e.message });
  }
});

module.exports = router;
