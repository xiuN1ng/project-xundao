const express = require('express');
const router = express.Router();
const path = require('path');

// 数据库路径
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');
let db = null;

function getDb(req) {
  if (db) return db;
  if (req.app && req.app.locals && req.app.locals.db) {
    db = req.app.locals.db;
    return db;
  }
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  db.pragma('journal_mode=WAL');
  return db;
}

// 初始化数据库表
function initPillTables(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS player_pills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      pill_id INTEGER NOT NULL,
      pill_name TEXT NOT NULL,
      pill_type TEXT NOT NULL,
      effect TEXT NOT NULL,
      quality TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(player_id, pill_id)
    );

    CREATE TABLE IF NOT EXISTS player_materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      material_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(player_id, material_name)
    );

    CREATE TABLE IF NOT EXISTS pill_recipes (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      effect TEXT NOT NULL,
      quality TEXT NOT NULL,
      materials TEXT NOT NULL
    );
  `);

  // 初始化丹药配方
  const existing = database.prepare('SELECT COUNT(*) as cnt FROM pill_recipes').get();
  if (existing.cnt === 0) {
    const insertRecipe = database.prepare(
      'INSERT OR IGNORE INTO pill_recipes (id, name, type, effect, quality, materials) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const recipes = [
      { id: 1, name: '灵气丹', type: 'cultivation', effect: JSON.stringify({ cultivation: 100 }), quality: 'common', materials: JSON.stringify([{ name: '灵草', count: 2 }]) },
      { id: 2, name: '筑基丹', type: 'realm', effect: JSON.stringify({ cultivation: 1000 }), quality: 'uncommon', materials: JSON.stringify([{ name: '灵草', count: 5 }, { name: '灵石', count: 50 }]) },
      { id: 3, name: '金丹丹', type: 'realm', effect: JSON.stringify({ cultivation: 10000 }), quality: 'rare', materials: JSON.stringify([{ name: '灵草', count: 20 }, { name: '灵石', count: 500 }, { name: '火精', count: 3 }]) },
      { id: 4, name: '生命丹', type: 'hp', effect: JSON.stringify({ hp: 500 }), quality: 'common', materials: JSON.stringify([{ name: '灵草', count: 3 }]) },
      { id: 5, name: '攻击丹', type: 'attack', effect: JSON.stringify({ attack: 20 }), quality: 'uncommon', materials: JSON.stringify([{ name: '矿石', count: 5 }]) },
      { id: 6, name: '防御丹', type: 'defense', effect: JSON.stringify({ defense: 20 }), quality: 'uncommon', materials: JSON.stringify([{ name: '矿石', count: 5 }]) },
      { id: 7, name: '悟道丹', type: 'skill', effect: JSON.stringify({ exp: 1000 }), quality: 'epic', materials: JSON.stringify([{ name: '悟道石', count: 1 }]) },
      { id: 8, name: '大还丹', type: 'exp', effect: JSON.stringify({ exp: 2000 }), quality: 'uncommon', materials: JSON.stringify([{ name: '灵草', count: 10 }, { name: '火精', count: 2 }]) },
      { id: 9, name: '小还丹', type: 'exp', effect: JSON.stringify({ exp: 500 }), quality: 'common', materials: JSON.stringify([{ name: '灵草', count: 3 }]) },
      { id: 10, name: '气血丹', type: 'hp', effect: JSON.stringify({ hp: 1000 }), quality: 'uncommon', materials: JSON.stringify([{ name: '灵草', count: 5 }, { name: '矿石', count: 2 }]) },
      { id: 11, name: '天元丹', type: 'realm', effect: JSON.stringify({ cultivation: 50000 }), quality: 'epic', materials: JSON.stringify([{ name: '灵草', count: 50 }, { name: '灵石', count: 2000 }, { name: '火精', count: 10 }]) },
      { id: 12, name: '淬体丹', type: 'defense', effect: JSON.stringify({ defense: 50 }), quality: 'rare', materials: JSON.stringify([{ name: '矿石', count: 15 }, { name: '火精', count: 5 }]) },
    ];
    for (const r of recipes) {
      insertRecipe.run(r.id, r.name, r.type, r.effect, r.quality, r.materials);
    }
  }
}

// 启动时初始化
try {
  const Database = require('better-sqlite3');
  const initDb = new Database(DB_PATH);
  initDb.pragma('journal_mode=WAL');
  initPillTables(initDb);
  initDb.close();
} catch (e) {
  console.error('[pill] 数据库初始化失败:', e.message);
}

// 丹药配方列表
router.get('/recipes', (req, res) => {
  try {
    const database = getDb(req);
    const recipes = database.prepare('SELECT * FROM pill_recipes ORDER BY id').all();
    const result = recipes.map(r => ({
      ...r,
      effect: JSON.parse(r.effect),
      materials: JSON.parse(r.materials)
    }));
    res.json({ success: true, recipes: result });
  } catch (e) {
    console.error('[pill/recipes]', e.message);
    res.json({ success: false, message: e.message });
  }
});

// 玩家丹药和材料
router.get('/my', (req, res) => {
  try {
    const userId = parseInt(req.query.userId || req.query.player_id || req.query.user_id || 1);
    const database = getDb(req);

    const pills = database.prepare(
      'SELECT * FROM player_pills WHERE player_id = ? ORDER BY created_at DESC'
    ).all(userId);

    const materials = database.prepare(
      'SELECT material_name, quantity FROM player_materials WHERE player_id = ? AND quantity > 0'
    ).all(userId);

    const materialsMap = {};
    for (const m of materials) {
      materialsMap[m.material_name] = m.quantity;
    }

    res.json({
      success: true,
      pills: pills.map(p => ({ ...p, effect: JSON.parse(p.effect) })),
      materials: materialsMap
    });
  } catch (e) {
    console.error('[pill/my]', e.message);
    res.json({ success: false, message: e.message });
  }
});

// 添加材料到玩家背包（游戏行为触发）
router.post('/add-material', (req, res) => {
  try {
    const userId = parseInt(req.body.userId || req.body.player_id || 1);
    const { materialName, quantity } = req.body;
    if (!materialName || !quantity || quantity <= 0) {
      return res.json({ success: false, message: '参数错误' });
    }
    const database = getDb(req);

    const existing = database.prepare(
      'SELECT id, quantity FROM player_materials WHERE player_id = ? AND material_name = ?'
    ).get(userId, materialName);

    if (existing) {
      database.prepare(
        `UPDATE player_materials SET quantity = quantity + ?, updated_at = datetime('now') WHERE id = ?`
      ).run(quantity, existing.id);
    } else {
      database.prepare(
        'INSERT INTO player_materials (player_id, material_name, quantity) VALUES (?, ?, ?)'
      ).run(userId, materialName, quantity);
    }

    const mat = database.prepare(
      'SELECT quantity FROM player_materials WHERE player_id = ? AND material_name = ?'
    ).get(userId, materialName);

    res.json({ success: true, material: materialName, quantity: mat.quantity });
  } catch (e) {
    console.error('[pill/add-material]', e.message);
    res.json({ success: false, message: e.message });
  }
});

// 炼丹
router.post('/craft', (req, res) => {
  try {
    const userId = parseInt(req.body.userId || req.body.player_id || 1);
    const recipeId = parseInt(req.body.recipeId || req.body.id || 0);
    const database = getDb(req);

    const recipe = database.prepare('SELECT * FROM pill_recipes WHERE id = ?').get(recipeId);
    if (!recipe) {
      return res.json({ success: false, message: '丹方不存在' });
    }

    const materials = JSON.parse(recipe.materials);
    const userMaterials = {};
    for (const m of materials) {
      const row = database.prepare(
        'SELECT quantity FROM player_materials WHERE player_id = ? AND material_name = ?'
      ).get(userId, m.name);
      userMaterials[m.name] = row ? row.quantity : 0;
    }

    // 检查材料
    for (const m of materials) {
      if (userMaterials[m.name] < m.count) {
        return res.json({ success: false, message: `材料不足: ${m.name} (需要${m.count}, 拥有${userMaterials[m.name] || 0})` });
      }
    }

    // 扣除材料
    for (const m of materials) {
      database.prepare(
        `UPDATE player_materials SET quantity = quantity - ?, updated_at = datetime('now') WHERE player_id = ? AND material_name = ?`
      ).run(m.count, userId, m.name);
    }

    // 写入丹药
    const effect = JSON.parse(recipe.effect);
    const quality = recipe.quality;
    const pillName = recipe.name;

    database.prepare(
      'INSERT INTO player_pills (player_id, pill_id, pill_name, pill_type, effect, quality) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(userId, recipeId, pillName, recipe.type, recipe.effect, quality);

    res.json({
      success: true,
      pill: {
        id: recipeId,
        name: pillName,
        type: recipe.type,
        effect,
        quality
      },
      message: `炼制成功：${pillName}`
    });
  } catch (e) {
    console.error('[pill/craft]', e.message);
    res.json({ success: false, message: e.message });
  }
});

// POST /api/pill/refine - 炼丹（/refine 别名，支持 recipe_id/furnace_type 参数名）
router.post('/refine', (req, res) => {
  try {
    const userId = parseInt(req.body.userId || req.body.player_id || req.body.userId || 1);
    const recipeId = parseInt(req.body.recipeId || req.body.recipe_id || req.body.id || 0);
    const furnaceType = req.body.furnace_type || req.body.furnaceType || 'ordinary';
    const database = getDb(req);

    const recipe = database.prepare('SELECT * FROM pill_recipes WHERE id = ?').get(recipeId);
    if (!recipe) {
      return res.json({ success: false, message: '丹方不存在' });
    }

    const materials = JSON.parse(recipe.materials);
    const userMaterials = {};
    for (const m of materials) {
      const row = database.prepare(
        'SELECT quantity FROM player_materials WHERE player_id = ? AND material_name = ?'
      ).get(userId, m.name);
      userMaterials[m.name] = row ? row.quantity : 0;
    }

    for (const m of materials) {
      if (userMaterials[m.name] < m.count) {
        return res.json({ success: false, message: `材料不足: ${m.name} (需要${m.count}, 拥有${userMaterials[m.name] || 0})` });
      }
    }

    for (const m of materials) {
      database.prepare(
        `UPDATE player_materials SET quantity = quantity - ?, updated_at = datetime('now') WHERE player_id = ? AND material_name = ?`
      ).run(m.count, userId, m.name);
    }

    const effect = JSON.parse(recipe.effect);
    const quality = recipe.quality;
    const pillName = recipe.name;

    database.prepare(
      'INSERT INTO player_pills (player_id, pill_id, pill_name, pill_type, effect, quality) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(userId, recipeId, pillName, recipe.type, recipe.effect, quality);

    res.json({
      success: true,
      pill: {
        id: recipeId,
        name: pillName,
        type: recipe.type,
        effect,
        quality,
        furnaceType
      },
      message: `炼制成功：${pillName}`
    });
  } catch (e) {
    console.error('[pill/refine]', e.message);
    res.json({ success: false, message: e.message });
  }
});

// 使用丹药
router.post('/use', (req, res) => {
  try {
    const userId = parseInt(req.body.userId || req.body.player_id || 1);
    const pillId = parseInt(req.body.pillId || req.body.id || 0);
    const database = getDb(req);

    const pill = database.prepare(
      'SELECT * FROM player_pills WHERE player_id = ? AND pill_id = ? LIMIT 1'
    ).get(userId, pillId);

    if (!pill) {
      return res.json({ success: false, message: '丹药不存在' });
    }

    const effect = JSON.parse(pill.effect);
    const pillName = pill.pill_name;
    const pillType = pill.pill_type;

    // 从玩家背包删除丹药（每吃1个）
    database.prepare(
      'DELETE FROM player_pills WHERE player_id = ? AND pill_id = ? LIMIT 1'
    ).run(userId, pillId);

    // 触发效果
    let rewardMessage = '';
    try {
      // 更新玩家属性
      if (effect.cultivation) {
        const current = database.prepare('SELECT value FROM Cultivations WHERE userId = ?').get(userId);
        if (current) {
          database.prepare('UPDATE Cultivations SET value = value + ? WHERE userId = ?').run(effect.cultivation, userId);
          rewardMessage += `灵气+${effect.cultivation} `;
        }
      }
      if (effect.exp) {
        database.prepare('UPDATE Users SET exp = exp + ? WHERE id = ?').run(effect.exp, userId);
        rewardMessage += `经验+${effect.exp} `;
      }
      if (effect.hp) {
        database.prepare('UPDATE Users SET hp = hp + ? WHERE id = ?').run(effect.hp, userId);
        rewardMessage += `生命+${effect.hp} `;
      }
      if (effect.attack) {
        database.prepare('UPDATE Users SET attack = attack + ? WHERE id = ?').run(effect.attack, userId);
        rewardMessage += `攻击+${effect.attack} `;
      }
      if (effect.defense) {
        database.prepare('UPDATE Users SET defense = defense + ? WHERE id = ?').run(effect.defense, userId);
        rewardMessage += `防御+${effect.defense} `;
      }
    } catch (attrErr) {
      console.error('[pill/use] 属性更新失败', attrErr.message);
    }

    res.json({
      success: true,
      message: `使用成功：${pillName}，${rewardMessage || '效果已生效'}`,
      effect,
      type: pillType
    });
  } catch (e) {
    console.error('[pill/use]', e.message);
    res.json({ success: false, message: e.message });
  }
});

// 材料列表（获取玩家所有材料）
router.get('/materials', (req, res) => {
  try {
    const userId = parseInt(req.query.userId || req.query.player_id || 1);
    const database = getDb(req);

    const materials = database.prepare(
      'SELECT material_name, quantity FROM player_materials WHERE player_id = ? AND quantity > 0 ORDER BY material_name'
    ).all(userId);

    res.json({ success: true, materials });
  } catch (e) {
    console.error('[pill/materials]', e.message);
    res.json({ success: false, message: e.message });
  }
});

module.exports = router;
