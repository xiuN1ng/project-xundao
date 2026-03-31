/**
 * 炼丹系统 API - backend/routes/alchemy.js
 * 完整的炼丹系统，包含丹方、材料、炼丹、丹炉等
 * 
 * 端点:
 * GET  /              - 炼丹系统完整信息
 * GET  /info          - 玩家炼丹信息摘要
 * GET  /recipes       - 丹方列表
 * GET  /recipes/:id   - 丹方详情
 * GET  /materials     - 玩家材料仓库
 * POST /materials     - 添加材料
 * POST /refine        - 炼丹（别名）
 * POST /craft         - 炼丹
 * POST /learn         - 学习新丹方
 * GET  /pills         - 玩家丹药
 * POST /use           - 使用丹药
 * GET  /furnace       - 丹炉信息
 * POST /furnace/upgrade - 升级丹炉
 */

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
function initAlchemyTables(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS alchemy_recipes (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      effect TEXT NOT NULL,
      quality TEXT NOT NULL,
      level_req INTEGER DEFAULT 1,
      realm_req INTEGER DEFAULT 1,
      materials TEXT NOT NULL,
      exp_bonus INTEGER DEFAULT 0,
      success_rate REAL DEFAULT 0.8
    );

    CREATE TABLE IF NOT EXISTS player_alchemy_materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      material_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(player_id, material_name)
    );

    CREATE TABLE IF NOT EXISTS player_alchemy_pills (
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

    CREATE TABLE IF NOT EXISTS player_alchemy_furnace (
      player_id INTEGER PRIMARY KEY,
      furnace_level INTEGER DEFAULT 1,
      furnace_exp INTEGER DEFAULT 0,
      total_crafts INTEGER DEFAULT 0,
      successful_crafts INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS player_learned_recipes (
      player_id INTEGER NOT NULL,
      recipe_id INTEGER NOT NULL,
      learned_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (player_id, recipe_id)
    );
  `);

  // 初始化丹药配方（如果没有）
  const existing = database.prepare('SELECT COUNT(*) as cnt FROM alchemy_recipes').get();
  if (existing.cnt === 0) {
    const insertRecipe = database.prepare(
      'INSERT OR IGNORE INTO alchemy_recipes (id, name, type, effect, quality, level_req, realm_req, materials, exp_bonus, success_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const recipes = [
      { id: 1, name: '灵气丹', type: 'cultivation', effect: JSON.stringify({ cultivation: 100 }), quality: 'common', level_req: 1, realm_req: 1, materials: JSON.stringify([{ name: '灵草', count: 2 }]), exp_bonus: 10, success_rate: 0.9 },
      { id: 2, name: '筑基丹', type: 'realm', effect: JSON.stringify({ cultivation: 1000 }), quality: 'uncommon', level_req: 10, realm_req: 2, materials: JSON.stringify([{ name: '灵草', count: 5 }, { name: '灵石', count: 50 }]), exp_bonus: 50, success_rate: 0.8 },
      { id: 3, name: '金丹丹', type: 'realm', effect: JSON.stringify({ cultivation: 10000 }), quality: 'rare', level_req: 30, realm_req: 4, materials: JSON.stringify([{ name: '灵草', count: 20 }, { name: '灵石', count: 500 }, { name: '火精', count: 3 }]), exp_bonus: 200, success_rate: 0.6 },
      { id: 4, name: '生命丹', type: 'hp', effect: JSON.stringify({ hp: 500 }), quality: 'common', level_req: 1, realm_req: 1, materials: JSON.stringify([{ name: '灵草', count: 3 }]), exp_bonus: 10, success_rate: 0.9 },
      { id: 5, name: '攻击丹', type: 'attack', effect: JSON.stringify({ attack: 20 }), quality: 'uncommon', level_req: 15, realm_req: 2, materials: JSON.stringify([{ name: '矿石', count: 5 }]), exp_bonus: 30, success_rate: 0.8 },
      { id: 6, name: '防御丹', type: 'defense', effect: JSON.stringify({ defense: 20 }), quality: 'uncommon', level_req: 15, realm_req: 2, materials: JSON.stringify([{ name: '矿石', count: 5 }]), exp_bonus: 30, success_rate: 0.8 },
      { id: 7, name: '悟道丹', type: 'skill', effect: JSON.stringify({ exp: 1000 }), quality: 'epic', level_req: 40, realm_req: 5, materials: JSON.stringify([{ name: '悟道石', count: 1 }, { name: '灵草', count: 30 }]), exp_bonus: 500, success_rate: 0.5 },
      { id: 8, name: '大还丹', type: 'exp', effect: JSON.stringify({ exp: 2000 }), quality: 'uncommon', level_req: 20, realm_req: 3, materials: JSON.stringify([{ name: '灵草', count: 10 }, { name: '火精', count: 2 }]), exp_bonus: 100, success_rate: 0.75 },
      { id: 9, name: '小还丹', type: 'exp', effect: JSON.stringify({ exp: 500 }), quality: 'common', level_req: 5, realm_req: 1, materials: JSON.stringify([{ name: '灵草', count: 3 }]), exp_bonus: 20, success_rate: 0.9 },
      { id: 10, name: '气血丹', type: 'hp', effect: JSON.stringify({ hp: 1000 }), quality: 'uncommon', level_req: 20, realm_req: 2, materials: JSON.stringify([{ name: '灵草', count: 5 }, { name: '矿石', count: 2 }]), exp_bonus: 50, success_rate: 0.8 },
      { id: 11, name: '天元丹', type: 'realm', effect: JSON.stringify({ cultivation: 50000 }), quality: 'epic', level_req: 50, realm_req: 6, materials: JSON.stringify([{ name: '灵草', count: 50 }, { name: '灵石', count: 2000 }, { name: '火精', count: 10 }]), exp_bonus: 1000, success_rate: 0.4 },
      { id: 12, name: '淬体丹', type: 'defense', effect: JSON.stringify({ defense: 50 }), quality: 'rare', level_req: 25, realm_req: 3, materials: JSON.stringify([{ name: '矿石', count: 15 }, { name: '火精', count: 5 }]), exp_bonus: 100, success_rate: 0.65 },
    ];
    for (const r of recipes) {
      insertRecipe.run(r.id, r.name, r.type, JSON.stringify(r.effect), r.quality, r.level_req, r.realm_req, JSON.stringify(r.materials), r.exp_bonus, r.success_rate);
    }
  }
}

// 启动时初始化
try {
  const Database = require('better-sqlite3');
  const initDb = new Database(DB_PATH);
  initDb.pragma('journal_mode=WAL');
  initAlchemyTables(initDb);
  initDb.close();
} catch (e) {
  console.error('[alchemy] 数据库初始化失败:', e.message);
}

// ========== 辅助函数 ==========

// 获取或创建玩家丹炉
function getOrCreateFurnace(db, playerId) {
  let furnace = db.prepare('SELECT * FROM player_alchemy_furnace WHERE player_id = ?').get(playerId);
  if (!furnace) {
    db.prepare('INSERT INTO player_alchemy_furnace (player_id) VALUES (?)').run(playerId);
    furnace = db.prepare('SELECT * FROM player_alchemy_furnace WHERE player_id = ?').get(playerId);
  }
  return furnace;
}

// 计算丹炉加成
function getFurnaceBonus(level) {
  return {
    success_rate_bonus: Math.min(level * 2, 30),
    exp_bonus: level * 5,
    yield_bonus: Math.floor(level / 2)
  };
}

// ========== 主信息 API ==========

// GET /api/alchemy - 炼丹系统完整信息
router.get('/', (req, res) => {
  try {
    const playerId = parseInt(req.query.player_id || req.query.userId || 1);
    const database = getDb(req);

    const recipes = database.prepare('SELECT * FROM alchemy_recipes ORDER BY id').all();
    const materials = database.prepare(
      'SELECT * FROM player_alchemy_materials WHERE player_id = ? AND quantity > 0'
    ).all(playerId);
    const pills = database.prepare(
      'SELECT * FROM player_alchemy_pills WHERE player_id = ? ORDER BY created_at DESC'
    ).all(playerId);
    const furnace = getOrCreateFurnace(database, playerId);
    const learnedRows = database.prepare(
      'SELECT recipe_id FROM player_learned_recipes WHERE player_id = ?'
    ).all(playerId);
    const learnedRecipeIds = new Set(learnedRows.map(r => r.recipe_id));

    const formattedRecipes = recipes.map(r => ({
      id: r.id,
      name: r.name,
      type: r.type,
      quality: r.quality,
      level_req: r.level_req,
      realm_req: r.realm_req,
      materials: JSON.parse(r.materials),
      effects: JSON.parse(r.effect),
      exp_bonus: r.exp_bonus,
      success_rate: r.success_rate,
      learned: learnedRecipeIds.has(r.id)
    }));

    const formattedMaterials = materials.map(m => ({
      name: m.material_name,
      quantity: m.quantity
    }));

    const formattedPills = pills.map(p => ({
      id: p.pill_id,
      name: p.pill_name,
      type: p.pill_type,
      quality: p.quality,
      effect: JSON.parse(p.effect)
    }));

    const bonus = getFurnaceBonus(furnace.furnace_level);

    res.json({
      success: true,
      data: {
        recipes: formattedRecipes,
        materials: formattedMaterials,
        pills: formattedPills,
        furnace: {
          level: furnace.furnace_level,
          exp: furnace.furnace_exp,
          total_crafts: furnace.total_crafts,
          successful_crafts: furnace.successful_crafts,
          bonus
        },
        recipe_count: formattedRecipes.length,
        material_count: formattedMaterials.length,
        pill_count: formattedPills.length
      }
    });
  } catch (e) {
    console.error('[alchemy/]', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/alchemy/info - 玩家炼丹信息摘要
router.get('/info', (req, res) => {
  try {
    const playerId = parseInt(req.query.player_id || req.query.userId || 1);
    const database = getDb(req);

    const furnace = getOrCreateFurnace(database, playerId);
    const pillCount = database.prepare(
      'SELECT COUNT(*) as cnt FROM player_alchemy_pills WHERE player_id = ?'
    ).get(playerId);
    const materialCount = database.prepare(
      'SELECT COUNT(*) as cnt FROM player_alchemy_materials WHERE player_id = ? AND quantity > 0'
    ).get(playerId);
    const learnedCount = database.prepare(
      'SELECT COUNT(*) as cnt FROM player_learned_recipes WHERE player_id = ?'
    ).get(playerId);
    const totalRecipes = database.prepare('SELECT COUNT(*) as cnt FROM alchemy_recipes').get();

    const bonus = getFurnaceBonus(furnace.furnace_level);
    const successRate = Math.min(30 + furnace.furnace_level * 5, 95);

    res.json({
      success: true,
      data: {
        player_id: playerId,
        furnace_level: furnace.furnace_level,
        furnace_exp: furnace.furnace_exp,
        total_crafts: furnace.total_crafts,
        successful_crafts: furnace.successful_crafts,
        success_rate: successRate,
        pill_count: pillCount.cnt,
        material_count: materialCount.cnt,
        learned_count: learnedCount.cnt,
        total_recipes: totalRecipes.cnt,
        bonus
      }
    });
  } catch (e) {
    console.error('[alchemy/info]', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ========== 丹方 API ==========

// GET /api/alchemy/recipes - 丹方列表
router.get('/recipes', (req, res) => {
  try {
    const database = getDb(req);
    const playerId = parseInt(req.query.player_id || req.query.userId || 1);
    const { type, quality } = req.query;

    let sql = 'SELECT * FROM alchemy_recipes WHERE 1=1';
    const params = [];
    if (type) { sql += ' AND type = ?'; params.push(type); }
    if (quality) { sql += ' AND quality = ?'; params.push(quality); }
    sql += ' ORDER BY id';

    const recipes = database.prepare(sql).all(...params);
    const learnedRows = database.prepare(
      'SELECT recipe_id FROM player_learned_recipes WHERE player_id = ?'
    ).all(playerId);
    const learnedRecipeIds = new Set(learnedRows.map(r => r.recipe_id));

    const result = recipes.map(r => ({
      id: r.id,
      name: r.name,
      type: r.type,
      quality: r.quality,
      level_req: r.level_req,
      realm_req: r.realm_req,
      materials: JSON.parse(r.materials),
      effects: JSON.parse(r.effect),
      exp_bonus: r.exp_bonus,
      success_rate: r.success_rate,
      learned: learnedRecipeIds.has(r.id)
    }));

    res.json({ success: true, data: result });
  } catch (e) {
    console.error('[alchemy/recipes]', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/alchemy/recipes/:id - 丹方详情
router.get('/recipes/:id', (req, res) => {
  try {
    const database = getDb(req);
    const recipeId = parseInt(req.params.id);
    const playerId = parseInt(req.query.player_id || req.query.userId || 1);

    const recipe = database.prepare('SELECT * FROM alchemy_recipes WHERE id = ?').get(recipeId);
    if (!recipe) {
      return res.status(404).json({ success: false, error: '丹方不存在' });
    }

    const learned = database.prepare(
      'SELECT 1 FROM player_learned_recipes WHERE player_id = ? AND recipe_id = ?'
    ).get(playerId, recipeId);

    res.json({
      success: true,
      data: {
        id: recipe.id,
        name: recipe.name,
        type: recipe.type,
        quality: recipe.quality,
        level_req: recipe.level_req,
        realm_req: recipe.realm_req,
        materials: JSON.parse(recipe.materials),
        effects: JSON.parse(recipe.effect),
        exp_bonus: recipe.exp_bonus,
        success_rate: recipe.success_rate,
        learned: !!learned
      }
    });
  } catch (e) {
    console.error('[alchemy/recipes/:id]', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ========== 材料 API ==========

// GET /api/alchemy/materials - 玩家材料仓库
router.get('/materials', (req, res) => {
  try {
    const playerId = parseInt(req.query.player_id || req.query.userId || 1);
    const database = getDb(req);

    const materials = database.prepare(
      'SELECT * FROM player_alchemy_materials WHERE player_id = ? AND quantity > 0 ORDER BY material_name'
    ).all(playerId);

    res.json({
      success: true,
      data: materials.map(m => ({
        name: m.material_name,
        quantity: m.quantity
      }))
    });
  } catch (e) {
    console.error('[alchemy/materials]', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/alchemy/materials - 添加材料
router.post('/materials', (req, res) => {
  try {
    const playerId = parseInt(req.body.player_id || req.body.userId || 1);
    const { material_name, materialName, quantity } = req.body;
    const matName = material_name || materialName;
    const qty = parseInt(quantity);

    if (!matName || !qty || qty <= 0) {
      return res.status(400).json({ success: false, error: '参数错误' });
    }

    const database = getDb(req);

    const existing = database.prepare(
      'SELECT id, quantity FROM player_alchemy_materials WHERE player_id = ? AND material_name = ?'
    ).get(playerId, matName);

    if (existing) {
      database.prepare(
        `UPDATE player_alchemy_materials SET quantity = quantity + ?, updated_at = datetime('now') WHERE id = ?`
      ).run(qty, existing.id);
    } else {
      database.prepare(
        'INSERT INTO player_alchemy_materials (player_id, material_name, quantity) VALUES (?, ?, ?)'
      ).run(playerId, matName, qty);
    }

    const updated = database.prepare(
      'SELECT quantity FROM player_alchemy_materials WHERE player_id = ? AND material_name = ?'
    ).get(playerId, matName);

    res.json({
      success: true,
      message: `成功添加 ${qty} 个 ${matName}`,
      data: { material_name: matName, quantity: updated.quantity }
    });
  } catch (e) {
    console.error('[alchemy/materials post]', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ========== 炼丹 API ==========

// POST /api/alchemy/refine - 炼丹（别名，支持 recipe_id 参数名）
router.post('/refine', (req, res) => {
  try {
    const playerId = parseInt(req.body.player_id || req.body.userId || 1);
    const recipeId = parseInt(req.body.recipe_id || req.body.recipeId || req.body.id || 0);
    const database = getDb(req);

    const recipe = database.prepare('SELECT * FROM alchemy_recipes WHERE id = ?').get(recipeId);
    if (!recipe) {
      return res.status(404).json({ success: false, error: '丹方不存在' });
    }

    // 检查是否已学习
    const learned = database.prepare(
      'SELECT 1 FROM player_learned_recipes WHERE player_id = ? AND recipe_id = ?'
    ).get(playerId, recipeId);
    if (!learned) {
      return res.status(400).json({ success: false, error: '尚未学习该丹方，请先学习后再尝试炼制' });
    }

    const materials = JSON.parse(recipe.materials);
    const userMaterials = {};
    for (const m of materials) {
      const row = database.prepare(
        'SELECT quantity FROM player_alchemy_materials WHERE player_id = ? AND material_name = ?'
      ).get(playerId, m.name);
      userMaterials[m.name] = row ? row.quantity : 0;
    }

    // 检查材料
    for (const m of materials) {
      if (userMaterials[m.name] < m.count) {
        return res.json({ success: false, error: `材料不足: ${m.name} (需要${m.count}, 拥有${userMaterials[m.name] || 0})` });
      }
    }

    // 扣除材料
    for (const m of materials) {
      database.prepare(
        `UPDATE player_alchemy_materials SET quantity = quantity - ?, updated_at = datetime('now') WHERE player_id = ? AND material_name = ?`
      ).run(m.count, playerId, m.name);
    }

    // 获取丹炉加成
    const furnace = getOrCreateFurnace(database, playerId);
    const bonus = getFurnaceBonus(furnace.furnace_level);

    // 计算成功率
    let successRate = recipe.success_rate + bonus.success_rate_bonus / 100;
    successRate = Math.min(successRate, 1);

    // 随机判定
    const roll = Math.random();
    const isSuccess = roll <= successRate;

    // 更新丹炉记录
    database.prepare(
      'UPDATE player_alchemy_furnace SET total_crafts = total_crafts + 1, successful_crafts = successful_crafts + ?, furnace_exp = furnace_exp + ? WHERE player_id = ?'
    ).run(isSuccess ? 1 : 0, isSuccess ? recipe.exp_bonus + bonus.exp_bonus : Math.floor(recipe.exp_bonus / 3), playerId);

    if (isSuccess) {
      // 写入丹药
      const effect = JSON.parse(recipe.effect);
      database.prepare(
        `INSERT INTO player_alchemy_pills (player_id, pill_id, pill_name, pill_type, effect, quality)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(player_id, pill_id) DO UPDATE SET
           pill_name = excluded.pill_name, pill_type = excluded.pill_type, effect = excluded.effect, quality = excluded.quality`
      ).run(playerId, recipeId, recipe.name, recipe.type, recipe.effect, recipe.quality);

      res.json({
        success: true,
        data: {
          recipe_id: recipeId,
          name: recipe.name,
          type: recipe.type,
          quality: recipe.quality,
          effect,
          furnace_exp_gained: recipe.exp_bonus + bonus.exp_bonus
        },
        message: `🎉 炼丹成功！获得 ${recipe.name}！`
      });
    } else {
      res.json({
        success: false,
        message: `💨 炼丹失败，材料化为灰烬...`,
        roll: roll.toFixed(3),
        success_rate: (successRate * 100).toFixed(1) + '%'
      });
    }
  } catch (e) {
    console.error('[alchemy/refine]', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/alchemy/craft - 炼丹
router.post('/craft', (req, res) => {
  // 直接复用 /refine 逻辑
  const playerId = parseInt(req.body.player_id || req.body.userId || 1);
  const recipeId = parseInt(req.body.recipe_id || req.body.recipeId || req.body.id || 0);
  const database = getDb(req);

  const recipe = database.prepare('SELECT * FROM alchemy_recipes WHERE id = ?').get(recipeId);
  if (!recipe) {
    return res.status(404).json({ success: false, error: '丹方不存在' });
  }

  // 检查是否已学习
  const learned = database.prepare(
    'SELECT 1 FROM player_learned_recipes WHERE player_id = ? AND recipe_id = ?'
  ).get(playerId, recipeId);
  if (!learned) {
    return res.status(400).json({ success: false, error: '尚未学习该丹方，请先学习后再尝试炼制' });
  }

  const materials = JSON.parse(recipe.materials);
  const userMaterials = {};
  for (const m of materials) {
    const row = database.prepare(
      'SELECT quantity FROM player_alchemy_materials WHERE player_id = ? AND material_name = ?'
    ).get(playerId, m.name);
    userMaterials[m.name] = row ? row.quantity : 0;
  }

  for (const m of materials) {
    if (userMaterials[m.name] < m.count) {
      return res.json({ success: false, error: `材料不足: ${m.name} (需要${m.count}, 拥有${userMaterials[m.name] || 0})` });
    }
  }

  for (const m of materials) {
    database.prepare(
      `UPDATE player_alchemy_materials SET quantity = quantity - ?, updated_at = datetime('now') WHERE player_id = ? AND material_name = ?`
    ).run(m.count, playerId, m.name);
  }

  const furnace = getOrCreateFurnace(database, playerId);
  const bonus = getFurnaceBonus(furnace.furnace_level);
  let successRate = Math.min(recipe.success_rate + bonus.success_rate_bonus / 100, 1);
  const roll = Math.random();
  const isSuccess = roll <= successRate;

  database.prepare(
    'UPDATE player_alchemy_furnace SET total_crafts = total_crafts + 1, successful_crafts = successful_crafts + ?, furnace_exp = furnace_exp + ? WHERE player_id = ?'
  ).run(isSuccess ? 1 : 0, isSuccess ? recipe.exp_bonus + bonus.exp_bonus : Math.floor(recipe.exp_bonus / 3), playerId);

  if (isSuccess) {
    const effect = JSON.parse(recipe.effect);
    database.prepare(
      `INSERT INTO player_alchemy_pills (player_id, pill_id, pill_name, pill_type, effect, quality)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(player_id, pill_id) DO UPDATE SET
         pill_name = excluded.pill_name, pill_type = excluded.pill_type, effect = excluded.effect, quality = excluded.quality`
    ).run(playerId, recipeId, recipe.name, recipe.type, recipe.effect, recipe.quality);

    res.json({
      success: true,
      data: {
        recipe_id: recipeId,
        name: recipe.name,
        type: recipe.type,
        quality: recipe.quality,
        effect,
        furnace_exp_gained: recipe.exp_bonus + bonus.exp_bonus
      },
      message: `🎉 炼丹成功！获得 ${recipe.name}！`
    });
  } else {
    res.json({
      success: false,
      message: `💨 炼丹失败，材料化为灰烬...`,
      roll: roll.toFixed(3),
      success_rate: (successRate * 100).toFixed(1) + '%'
    });
  }
});

// POST /api/alchemy/learn - 学习新丹方
router.post('/learn', (req, res) => {
  try {
    const playerId = parseInt(req.body.player_id || req.body.userId || 1);
    const recipeId = parseInt(req.body.recipe_id || req.body.recipeId || req.body.id || 0);
    const database = getDb(req);

    if (!recipeId) {
      return res.status(400).json({ success: false, error: '缺少丹方ID' });
    }

    const recipe = database.prepare('SELECT * FROM alchemy_recipes WHERE id = ?').get(recipeId);
    if (!recipe) {
      return res.status(404).json({ success: false, error: '丹方不存在' });
    }

    const existing = database.prepare(
      'SELECT 1 FROM player_learned_recipes WHERE player_id = ? AND recipe_id = ?'
    ).get(playerId, recipeId);

    if (existing) {
      return res.json({ success: true, message: `已学习过该丹方：${recipe.name}`, data: { recipe_id: recipeId, name: recipe.name, learned: true } });
    }

    // 检查等级要求
    const player = database.prepare('SELECT * FROM Users WHERE id = ?').get(playerId);
    if (player && player.level < recipe.level_req) {
      return res.status(400).json({ success: false, error: `等级不足，需要 ${recipe.level_req} 级才能学习该丹方` });
    }

    // 学习丹方
    database.prepare(
      'INSERT INTO player_learned_recipes (player_id, recipe_id) VALUES (?, ?)'
    ).run(playerId, recipeId);

    res.json({
      success: true,
      message: `成功学习丹方：${recipe.name}！`,
      data: {
        recipe_id: recipeId,
        name: recipe.name,
        type: recipe.type,
        quality: recipe.quality,
        learned: true
      }
    });
  } catch (e) {
    console.error('[alchemy/learn]', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ========== 丹药 API ==========

// GET /api/alchemy/pills - 玩家丹药
router.get('/pills', (req, res) => {
  try {
    const playerId = parseInt(req.query.player_id || req.query.userId || 1);
    const database = getDb(req);

    const pills = database.prepare(
      'SELECT * FROM player_alchemy_pills WHERE player_id = ? ORDER BY created_at DESC'
    ).all(playerId);

    res.json({
      success: true,
      data: pills.map(p => ({
        id: p.pill_id,
        name: p.pill_name,
        type: p.pill_type,
        quality: p.quality,
        effect: JSON.parse(p.effect)
      }))
    });
  } catch (e) {
    console.error('[alchemy/pills]', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/alchemy/use - 使用丹药
router.post('/use', (req, res) => {
  try {
    const playerId = parseInt(req.body.player_id || req.body.userId || 1);
    const pillId = parseInt(req.body.pill_id || req.body.pillId || req.body.id || 0);
    const database = getDb(req);

    const pill = database.prepare(
      'SELECT * FROM player_alchemy_pills WHERE player_id = ? AND pill_id = ? LIMIT 1'
    ).get(playerId, pillId);

    if (!pill) {
      return res.json({ success: false, message: '丹药不存在' });
    }

    const effect = JSON.parse(pill.effect);
    const pillName = pill.pill_name;
    const pillType = pill.pill_type;

    // 删除丹药
    database.prepare(
      'DELETE FROM player_alchemy_pills WHERE player_id = ? AND pill_id = ? LIMIT 1'
    ).run(playerId, pillId);

    // 触发效果
    let rewardMessage = '';
    try {
      if (effect.cultivation) {
        const current = database.prepare('SELECT value FROM Cultivations WHERE userId = ?').get(playerId);
        if (current) {
          database.prepare('UPDATE Cultivations SET value = value + ? WHERE userId = ?').run(effect.cultivation, playerId);
          rewardMessage += `灵气+${effect.cultivation} `;
        }
      }
      if (effect.exp) {
        database.prepare('UPDATE Users SET exp = exp + ? WHERE id = ?').run(effect.exp, playerId);
        rewardMessage += `经验+${effect.exp} `;
      }
      if (effect.hp) {
        database.prepare('UPDATE Users SET hp = hp + ? WHERE id = ?').run(effect.hp, playerId);
        rewardMessage += `生命+${effect.hp} `;
      }
      if (effect.attack) {
        database.prepare('UPDATE Users SET attack = attack + ? WHERE id = ?').run(effect.attack, playerId);
        rewardMessage += `攻击+${effect.attack} `;
      }
      if (effect.defense) {
        database.prepare('UPDATE Users SET defense = defense + ? WHERE id = ?').run(effect.defense, playerId);
        rewardMessage += `防御+${effect.defense} `;
      }
    } catch (attrErr) {
      console.error('[alchemy/use] 属性更新失败', attrErr.message);
    }

    res.json({
      success: true,
      message: `使用成功：${pillName}，${rewardMessage || '效果已生效'}`,
      effect,
      type: pillType
    });
  } catch (e) {
    console.error('[alchemy/use]', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ========== 丹炉 API ==========

// GET /api/alchemy/furnace - 丹炉信息
router.get('/furnace', (req, res) => {
  try {
    const playerId = parseInt(req.query.player_id || req.query.userId || 1);
    const database = getDb(req);

    const furnace = getOrCreateFurnace(database, playerId);
    const bonus = getFurnaceBonus(furnace.furnace_level);
    const nextLevelExp = furnace.furnace_level * 500;
    const successRate = Math.min(30 + furnace.furnace_level * 5, 95);

    res.json({
      success: true,
      data: {
        player_id: playerId,
        level: furnace.furnace_level,
        exp: furnace.furnace_exp,
        total_crafts: furnace.total_crafts,
        successful_crafts: furnace.successful_crafts,
        success_rate: successRate,
        bonus,
        exp_needed_for_upgrade: nextLevelExp - furnace.furnace_exp,
        next_level_exp: nextLevelExp
      }
    });
  } catch (e) {
    console.error('[alchemy/furnace]', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/alchemy/furnace/upgrade - 升级丹炉
router.post('/furnace/upgrade', (req, res) => {
  try {
    const playerId = parseInt(req.body.player_id || req.body.userId || 1);
    const database = getDb(req);

    const furnace = getOrCreateFurnace(database, playerId);
    const nextLevel = furnace.furnace_level + 1;
    const expNeeded = nextLevel * 500; // 每级500点经验

    if (furnace.furnace_exp < expNeeded) {
      return res.status(400).json({
        success: false,
        error: `升级需要 ${expNeeded} 点丹炉经验，当前仅有 ${furnace.furnace_exp} 点`,
        current_exp: furnace.furnace_exp,
        exp_needed: expNeeded,
        shortfall: expNeeded - furnace.furnace_exp
      });
    }

    database.prepare(
      'UPDATE player_alchemy_furnace SET furnace_level = ?, furnace_exp = furnace_exp - ? WHERE player_id = ?'
    ).run(nextLevel, expNeeded, playerId);

    const newFurnace = getOrCreateFurnace(database, playerId);
    const newBonus = getFurnaceBonus(newFurnace.furnace_level);

    res.json({
      success: true,
      message: `🔥 丹炉升级成功！等级提升至 ${newFurnace.furnace_level}！`,
      data: {
        level: newFurnace.furnace_level,
        exp: newFurnace.furnace_exp,
        bonus: newBonus
      }
    });
  } catch (e) {
    console.error('[alchemy/furnace/upgrade]', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/alchemy/furnace/upgrade-info - 丹炉升级预览
router.get('/furnace/upgrade-info', (req, res) => {
  try {
    const playerId = parseInt(req.query.player_id || req.query.userId || 1);
    const database = getDb(req);

    const furnace = getOrCreateFurnace(database, playerId);
    const nextLevel = furnace.furnace_level + 1;
    const expNeeded = nextLevel * 500;
    const currentBonus = getFurnaceBonus(furnace.furnace_level);
    const nextBonus = getFurnaceBonus(nextLevel);

    res.json({
      success: true,
      data: {
        current_level: furnace.furnace_level,
        current_exp: furnace.furnace_exp,
        next_level: nextLevel,
        exp_needed: expNeeded,
        can_upgrade: furnace.furnace_exp >= expNeeded,
        current_bonus: currentBonus,
        next_bonus: nextBonus,
        bonus_improvement: {
          success_rate_bonus: nextBonus.success_rate_bonus - currentBonus.success_rate_bonus,
          exp_bonus: nextBonus.exp_bonus - currentBonus.exp_bonus,
          yield_bonus: nextBonus.yield_bonus - currentBonus.yield_bonus
        }
      }
    });
  } catch (e) {
    console.error('[alchemy/furnace/upgrade-info]', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
