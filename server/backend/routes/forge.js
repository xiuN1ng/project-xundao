const express = require('express');
const router = express.Router();
const path = require('path');
const Database = require('better-sqlite3');

// 每日任务集成
let dailyQuestRouter;
try {
  dailyQuestRouter = require('./dailyQuest');
} catch (e) {
  console.log('[forge] dailyQuest 路由加载失败:', e.message);
}

// 事件总线
let eventBus;
try {
  eventBus = require('../../game/eventBus');
} catch (e) {
  console.log('[forge] eventBus加载失败:', e.message);
  eventBus = null;
}

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

// 初始化数据库表
function initForgeTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS forge_materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      material_key TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER DEFAULT (strftime('%s','now')),
      UNIQUE(player_id, material_key)
    );

    CREATE TABLE IF NOT EXISTS forge_equipment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      recipe_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      quality TEXT NOT NULL,
      color TEXT NOT NULL,
      stats TEXT NOT NULL,
      strengthen_level INTEGER NOT NULL DEFAULT 0,
      bonus_stats TEXT DEFAULT '{}',
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS forge_equipped (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL UNIQUE,
      weapon_id INTEGER,
      armor_id INTEGER,
      accessory_id INTEGER,
      updated_at INTEGER DEFAULT (strftime('%s','now'))
    );
  `);
}

function getDb() {
  return new Database(DB_PATH);
}

// 初始化表
try {
  const db = getDb();
  initForgeTables(db);
  db.close();
} catch(e) {
  console.log('[forge] init:', e.message);
}

// 成就触发服务
let achievementTrigger;
try {
  achievementTrigger = require('../../game/achievement_trigger_service');
} catch (e) {
  console.log('[forge] 成就触发服务未找到:', e.message);
  achievementTrigger = null;
}

// Recipes
const recipes = [
  { id: 'flying_sword', name: '飞剑', type: 'weapon', desc: '基础飞剑', materials: { iron_ingot: 3 }, stats: { atk: 10 }, quality: 'common', color: '#8B8B8B' },
  { id: 'flame_blade', name: '烈焰刀', type: 'weapon', desc: '火焰伤害', materials: { iron_ingot: 5, fire_crystal: 2 }, stats: { atk: 25, crit_rate: 5 }, quality: 'uncommon', color: '#00FF7F' },
  { id: 'thunder_sword', name: '雷霆剑', type: 'weapon', desc: '雷霆之力', materials: { flame_blade: 1, thunder_crystal: 3, refined_iron: 5 }, stats: { atk: 50, crit_rate: 10 }, quality: 'rare', color: '#1E90FF' },
  { id: 'battle_armor', name: '战甲', type: 'armor', desc: '基础防具', materials: { iron_ingot: 3 }, stats: { def: 10 }, quality: 'common', color: '#8B8B8B' },
  { id: 'jade_armor', name: '玉鳞甲', type: 'armor', desc: '玉石护甲', materials: { iron_ingot: 5, jade: 2 }, stats: { def: 25, hp: 50 }, quality: 'uncommon', color: '#00FF7F' },
  { id: 'dragon_scale_armor', name: '龙鳞甲', type: 'armor', desc: '龙鳞护甲', materials: { jade_armor: 1, dragon_scale: 3, refined_iron: 5 }, stats: { def: 50, hp: 100 }, quality: 'rare', color: '#1E90FF' },
  { id: 'health_pendant', name: '护符', type: 'accessory', desc: '基础饰品', materials: { jade: 2 }, stats: { hp: 50 }, quality: 'common', color: '#8B8B8B' },
  { id: 'spirit_pendant', name: '灵玉佩', type: 'accessory', desc: '灵气玉佩', materials: { jade: 3, spirit_stone_mat: 200 }, stats: { hp: 100, spirit_rate: 5 }, quality: 'uncommon', color: '#00FF7F' },
  { id: 'crit_ring', name: '戒指', type: 'accessory', desc: '基础戒指', materials: { jade: 2 }, stats: { crit_rate: 5 }, quality: 'common', color: '#8B8B8B' },
  { id: 'warrior_ring', name: '战神戒', type: 'accessory', desc: '战神之戒', materials: { crit_ring: 1, fire_crystal: 2, thunder_crystal: 1 }, stats: { crit_rate: 15, atk: 10 }, quality: 'rare', color: '#1E90FF' }
];

const materialNames = {
  iron_ingot: '铁锭', refined_iron: '精铁', jade: '玉石',
  fire_crystal: '火晶', thunder_crystal: '雷晶', dragon_scale: '龙鳞',
  strengthen_stone: '强化石', spirit_stone_mat: '灵石(材料)',
  flying_sword: '飞剑', flame_blade: '烈焰刀', battle_armor: '战甲',
  jade_armor: '玉鳞甲', health_pendant: '护符', spirit_pendant: '灵玉佩',
  crit_ring: '戒指'
};

function getPlayerMaterials(db, playerId) {
  const rows = db.prepare('SELECT material_key, quantity FROM forge_materials WHERE player_id=?').all(playerId);
  const materials = {};
  for (const r of rows) materials[r.material_key] = r.quantity;
  return materials;
}

function getEquipped(db, playerId) {
  const row = db.prepare('SELECT weapon_id, armor_id, accessory_id FROM forge_equipped WHERE player_id=?').get(playerId);
  if (!row) return { weapon: null, armor: null, accessory: null };
  return { weapon: row.weapon_id, armor: row.armor_id, accessory: row.accessory_id };
}

function getNextEquipId(db) {
  const row = db.prepare('SELECT MAX(id) as maxId FROM forge_equipment').get();
  return (row?.maxId || 0) + 1;
}

// GET /api/forge - 获取所有配方
router.get('/', (req, res) => {
  const playerId = parseInt(req.query.player_id || req.query.userId || 1);
  const db = getDb();
  try {
    const materials = getPlayerMaterials(db, playerId);
    const result = recipes.map(recipe => {
      const materialCosts = Object.entries(recipe.materials).map(([matId, count]) => ({
        id: matId, name: materialNames[matId] || matId,
        required: count, available: materials[matId] || 0,
        sufficient: (materials[matId] || 0) >= count
      }));
      return { ...recipe, materialCosts };
    });
    res.json({ success: true, recipes: result });
  } catch(e) {
    res.json({ success: false, message: e.message });
  } finally {
    db.close();
  }
});

// GET /api/forge/status - 获取锻造状态（强化石数量 + 装备强化等级）
router.get('/status', (req, res) => {
  const playerId = parseInt(req.query.player_id || req.query.userId || 1);
  const db = getDb();
  try {
    // 获取玩家材料（强化石数量）
    const materials = getPlayerMaterials(db, playerId);
    const strengthenStones = materials['strengthen_stone'] || 0;
    const spiritStones = materials['spirit_stone_mat'] || 0;

    // 获取玩家所有装备及强化等级
    const equips = db.prepare('SELECT * FROM forge_equipment WHERE player_id=? ORDER BY strengthen_level DESC').all(playerId);
    const equipSummary = equips.map(e => ({
      id: e.id, name: e.name, type: e.type, quality: e.quality,
      strengthenLevel: e.strengthen_level,
      stats: JSON.parse(e.stats || '{}'),
      bonusStats: JSON.parse(e.bonus_stats || '{}')
    }));

    // 获取已穿戴装备
    const equipped = getEquipped(db, playerId);

    // 每日领取状态
    const today = new Date(Date.now() + 8 * 3600000).toISOString().substring(0, 10);
    const dailyClaim = db.prepare('SELECT last_claim_date FROM forge_daily_claims WHERE player_id=?').get(playerId);
    const dailyClaimed = dailyClaim?.last_claim_date === today;

    res.json({
      success: true,
      materials: {
        strengthenStones,
        spiritStones,
        ironIngot: materials['iron_ingot'] || 0,
        fireEssence: materials['fire_essence'] || 0,
        jade: materials['jade'] || 0
      },
      equipmentCount: equips.length,
      highestStrengthenLevel: equips.length > 0 ? Math.max(...equips.map(e => e.strengthen_level)) : 0,
      equippedWeapons: equipSummary.filter(e => [equipped.weapon, equipped.armor, equipped.accessory].includes(e.id)),
      dailyClaimed,
      message: `强化石×${strengthenStones}，最高强化等级${equips.length > 0 ? Math.max(...equips.map(e => e.strengthen_level)) : 0}`
    });
  } catch(e) {
    res.json({ success: false, message: e.message });
  } finally {
    db.close();
  }
});

// GET /api/forge/recipes - 获取所有配方（别名）
router.get('/recipes', (req, res) => {
  const playerId = parseInt(req.query.player_id || req.query.userId || 1);
  const db = getDb();
  try {
    const materials = getPlayerMaterials(db, playerId);
    const result = recipes.map(recipe => {
      const materialCosts = Object.entries(recipe.materials).map(([matId, count]) => ({
        id: matId, name: materialNames[matId] || matId,
        required: count, available: materials[matId] || 0,
        sufficient: (materials[matId] || 0) >= count
      }));
      return { ...recipe, materialCosts };
    });
    res.json({ success: true, recipes: result });
  } catch(e) {
    // 表格不存在时返回配方不含材料数据
    res.json({ success: true, recipes: recipes.map(r => ({ ...r, materialCosts: [] })) });
  } finally {
    db.close();
  }
});

// GET /api/forge/materials - 获取玩家材料
router.get('/materials', (req, res) => {
  const playerId = parseInt(req.query.player_id || req.query.userId || 1);
  const db = getDb();
  try {
    const materials = getPlayerMaterials(db, playerId);
    res.json({ success: true, materials });
  } catch(e) {
    res.json({ success: false, message: e.message });
  } finally {
    db.close();
  }
});

// POST /api/forge/forge - 锻造装备
router.post('/forge', (req, res) => {
  const playerId = parseInt(req.body.player_id || req.body.userId || 1);
  const { recipeId } = req.body;
  const db = getDb();
  try {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return res.json({ success: false, message: '配方不存在' });

    const materials = getPlayerMaterials(db, playerId);
    for (const [matId, count] of Object.entries(recipe.materials)) {
      if ((materials[matId] || 0) < count) {
        return res.json({ success: false, message: `材料不足: ${materialNames[matId]||matId} 需要${count}个，现有${materials[matId]||0}个` });
      }
    }

    // 扣除材料（UPDATE + INSERT OR IGNORE 安全方式，防止首次UPSERT插入负数）
    for (const [matId, count] of Object.entries(recipe.materials)) {
      const changes = db.prepare('UPDATE forge_materials SET quantity = quantity - ? WHERE player_id = ? AND material_key = ? AND quantity >= ?').run(count, playerId, matId, count);
      if (changes.changes === 0) {
        // 材料不足或行不存在，插入占位行供后续追踪
        db.prepare('INSERT OR IGNORE INTO forge_materials (player_id, material_key, quantity) VALUES (?, ?, 0)').run(playerId, matId);
      }
    }

    // 创建装备
    const equipId = getNextEquipId(db);
    db.prepare('INSERT INTO forge_equipment (id, player_id, recipe_id, name, type, quality, color, stats, strengthen_level, bonus_stats) VALUES (?,?,?,?,?,?,?,?,0,?)').run(
      equipId, playerId, recipe.id, recipe.name, recipe.type, recipe.quality, recipe.color, JSON.stringify(recipe.stats), '{}'
    );

    const equipment = { id: equipId, name: recipe.name, type: recipe.type, quality: recipe.quality, color: recipe.color, stats: recipe.stats, strengthenLevel: 0, bonusStats: {} };

    // 成就触发
    let achievementResults = [];
    if (achievementTrigger) {
      try {
        achievementResults = achievementTrigger.onEquipmentObtain(playerId, equipId, recipe.quality);
        const notifications = achievementTrigger.popNotifications(playerId);
        if (notifications.length > 0) {
          console.log(`[成就通知] 用户${playerId}达成成就:`, notifications.map(n => n.achievementName).join(', '));
        }
      } catch(e) {}
    }

    // ========== 事件总线触发：锻造完成 ==========
    if (eventBus) {
      eventBus.emit('forge:make', { userId: playerId, recipeId: recipe.id, quality: recipe.quality });
    }

    res.json({ success: true, equipment, achievements: achievementResults.length > 0 ? achievementResults : undefined });
  } catch(e) {
    res.json({ success: false, message: e.message });
  } finally {
    db.close();
  }
});

// POST /api/forge/make - 锻造装备 (/forge 别名)
router.post('/make', (req, res) => {
  const playerId = parseInt(req.body.player_id || req.body.userId || 1);
  const { recipeId } = req.body;
  const db = getDb();
  try {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return res.json({ success: false, message: '配方不存在' });

    const materials = getPlayerMaterials(db, playerId);
    for (const [matId, count] of Object.entries(recipe.materials)) {
      if ((materials[matId] || 0) < count) {
        return res.json({ success: false, message: `材料不足: ${materialNames[matId]||matId} 需要${count}个，现有${materials[matId]||0}个` });
      }
    }

    // 扣除材料（UPDATE + INSERT OR IGNORE 安全方式，防止首次UPSERT插入负数）
    for (const [matId, count] of Object.entries(recipe.materials)) {
      const changes = db.prepare('UPDATE forge_materials SET quantity = quantity - ? WHERE player_id = ? AND material_key = ? AND quantity >= ?').run(count, playerId, matId, count);
      if (changes.changes === 0) {
        db.prepare('INSERT OR IGNORE INTO forge_materials (player_id, material_key, quantity) VALUES (?, ?, 0)').run(playerId, matId);
      }
    }

    const equipId = getNextEquipId(db);
    db.prepare('INSERT INTO forge_equipment (id, player_id, recipe_id, name, type, quality, color, stats, strengthen_level, bonus_stats) VALUES (?,?,?,?,?,?,?,?,0,?)').run(
      equipId, playerId, recipe.id, recipe.name, recipe.type, recipe.quality, recipe.color, JSON.stringify(recipe.stats), '{}'
    );

    const equipment = { id: equipId, name: recipe.name, type: recipe.type, quality: recipe.quality, color: recipe.color, stats: recipe.stats, strengthenLevel: 0, bonusStats: {} };

    let achievementResults = [];
    if (achievementTrigger) {
      try {
        achievementResults = achievementTrigger.onEquipmentObtain(playerId, equipId, recipe.quality);
        const notifications = achievementTrigger.popNotifications(playerId);
        if (notifications.length > 0) {
          console.log(`[成就通知] 用户${playerId}达成成就:`, notifications.map(n => n.achievementName).join(', '));
        }
      } catch(e) {}
    }

    // ========== 事件总线触发：锻造完成 ==========
    if (eventBus) {
      eventBus.emit('forge:make', { userId: playerId, recipeId: recipe.id, quality: recipe.quality });
    }

    // ========== 每日任务触发：装备锻造 ==========
    if (dailyQuestRouter && dailyQuestRouter.updateDailyQuestProgress) {
      try {
        dailyQuestRouter.updateDailyQuestProgress(playerId, 'equipment', 1);
      } catch (e) {
        console.warn('[forge] 每日任务更新失败:', e.message);
      }
    }

    res.json({ success: true, equipment, achievements: achievementResults.length > 0 ? achievementResults : undefined });
  } catch(e) {
    res.json({ success: false, message: e.message });
  } finally {
    db.close();
  }
});

// GET /api/forge/equipment - 获取已锻装的装备列表
router.get('/equipment', (req, res) => {
  const playerId = parseInt(req.query.player_id || req.query.userId || 1);
  const db = getDb();
  try {
    const equipped = getEquipped(db, playerId);
    const equips = db.prepare('SELECT * FROM forge_equipment WHERE player_id=?').all(playerId);
    const result = equips.map(e => ({
      ...e, stats: JSON.parse(e.stats || '{}'), bonusStats: JSON.parse(e.bonusStats || '{}'),
      isEquipped: equipped[e.type + '_id'] === e.id
    }));
    res.json({ success: true, equipment: result });
  } catch(e) {
    res.json({ success: false, message: e.message });
  } finally {
    db.close();
  }
});

// GET /api/forge/equipment/:id - 装备详情（含强化信息）
router.get('/equipment/:id', (req, res) => {
  const equipId = parseInt(req.params.id);
  const db = getDb();
  try {
    const e = db.prepare('SELECT * FROM forge_equipment WHERE id=?').get(equipId);
    if (!e) return res.json({ success: false, message: '装备不存在' });

    const level = e.strengthen_level;
    const stoneCost = Math.floor(5 * Math.pow(1.5, level));
    const spiritCost = Math.floor(100 * Math.pow(2, level));
    const successRate = Math.max(20, 100 - level * 10);
    const stats = JSON.parse(e.stats || '{}');
    const bonusStats = {};
    const statBonusPerLevel = 0.1;
    for (const [stat, value] of Object.entries(stats)) {
      bonusStats[stat] = Math.floor(value * statBonusPerLevel * level);
    }

    res.json({ success: true, equipment: { ...e, stats, bonusStats }, strengthenCost: { stone: stoneCost, spirit: spiritCost }, successRate });
  } catch(e) {
    res.json({ success: false, message: e.message });
  } finally {
    db.close();
  }
});

// POST /api/forge/strengthen - 强化装备
router.post('/strengthen', (req, res) => {
  const playerId = parseInt(req.body.player_id || req.body.userId || 1);
  const { equipmentId } = req.body;
  const db = getDb();
  try {
    const e = db.prepare('SELECT * FROM forge_equipment WHERE id=? AND player_id=?').get(equipmentId, playerId);
    if (!e) return res.json({ success: false, message: '装备不存在' });

    const level = e.strengthen_level;
    if (level >= 15) return res.json({ success: false, message: '已达最高强化等级' });

    const stoneCost = Math.floor(5 * Math.pow(1.5, level));
    const spiritCost = Math.floor(100 * Math.pow(2, level));
    const successRate = Math.max(20, 100 - level * 10);

    const materials = getPlayerMaterials(db, playerId);
    if ((materials.strengthen_stone || 0) < stoneCost) return res.json({ success: false, message: `强化石不足，需要${stoneCost}个` });
    if ((materials.spirit_stone_mat || 0) < spiritCost) return res.json({ success: false, message: `灵石(材料)不足，需要${spiritCost}个` });

    // 扣除材料（UPDATE + INSERT OR IGNORE 安全方式，防止首次UPSERT插入负数）
    const deduct = (matId, count) => {
      const changes = db.prepare('UPDATE forge_materials SET quantity = quantity - ? WHERE player_id = ? AND material_key = ? AND quantity >= ?').run(count, playerId, matId, count);
      if (changes.changes === 0) {
        db.prepare('INSERT OR IGNORE INTO forge_materials (player_id, material_key, quantity) VALUES (?, ?, 0)').run(playerId, matId);
      }
    };
    deduct('strengthen_stone', stoneCost);
    deduct('spirit_stone_mat', spiritCost);

    const roll = Math.random() * 100;
    const success = roll < successRate;

    if (success) {
      const newLevel = level + 1;
      const stats = JSON.parse(e.stats || '{}');
      const bonusStats = {};
      for (const [stat, value] of Object.entries(stats)) {
        bonusStats[stat] = Math.floor(value * 0.1 * newLevel);
      }
      db.prepare('UPDATE forge_equipment SET strengthen_level=?, bonus_stats=? WHERE id=?').run(newLevel, JSON.stringify(bonusStats), equipmentId);
      // 触发每日任务：装备强化
      if (dailyQuestRouter && dailyQuestRouter.updateDailyQuestProgress) {
        dailyQuestRouter.updateDailyQuestProgress(playerId, 'equipment', 1);
      }
      // ========== 事件总线触发：装备强化 ==========
      if (eventBus) {
        eventBus.emit('forge:strengthen', { userId: playerId, equipId: equipmentId, newLevel });
      }
      res.json({ success: true, level: newLevel, message: `强化成功！等级提升至${newLevel}` });
    } else {
      res.json({ success: false, level, message: '强化失败，但装备不会降级' });
    }
  } catch(e) {
    res.json({ success: false, message: e.message });
  } finally {
    db.close();
  }
});

// POST /api/forge/equip - 穿戴装备
router.post('/equip', (req, res) => {
  const playerId = parseInt(req.body.player_id || req.body.userId || 1);
  const { equipmentId } = req.body;
  const db = getDb();
  try {
    const e = db.prepare('SELECT * FROM forge_equipment WHERE id=? AND player_id=?').get(equipmentId, playerId);
    if (!e) return res.json({ success: false, message: '装备不存在' });

    db.prepare('INSERT INTO forge_equipped (player_id, ' + e.type + '_id) VALUES (?,?) ON CONFLICT(player_id) DO UPDATE SET ' + e.type + '_id=?').run(playerId, equipmentId, equipmentId);
    res.json({ success: true, message: `已装备${e.name}` });
  } catch(e) {
    res.json({ success: false, message: e.message });
  } finally {
    db.close();
  }
});

// POST /api/forge/unequip - 卸下装备
router.post('/unequip', (req, res) => {
  const playerId = parseInt(req.body.player_id || req.body.userId || 1);
  const { slot } = req.body;
  const db = getDb();
  try {
    if (!['weapon', 'armor', 'accessory'].includes(slot)) return res.json({ success: false, message: '无效装备栏' });
    const old = db.prepare('SELECT ' + slot + '_id as id FROM forge_equipped WHERE player_id=?').get(playerId);
    if (old && old.id) {
      const eq = db.prepare('SELECT name FROM forge_equipment WHERE id=?').get(old.id);
      db.prepare('UPDATE forge_equipped SET ' + slot + '_id=NULL WHERE player_id=?').run(playerId);
      res.json({ success: true, message: `已卸下${eq?.name || ''}` });
    } else {
      res.json({ success: false, message: '该装备栏没有装备' });
    }
  } catch(e) {
    res.json({ success: false, message: e.message });
  } finally {
    db.close();
  }
});

// GET /api/forge/equipped - 获取已穿戴装备
router.get('/equipped', (req, res) => {
  const playerId = parseInt(req.query.player_id || req.query.userId || 1);
  const db = getDb();
  try {
    const equipped = getEquipped(db, playerId);
    const result = [];
    for (const [slot, equipId] of Object.entries(equipped)) {
      if (equipId) {
        const e = db.prepare('SELECT * FROM forge_equipment WHERE id=?').get(equipId);
        if (e) result.push({ slot, ...e, stats: JSON.parse(e.stats || '{}'), bonusStats: JSON.parse(e.bonusStats || '{}') });
      }
    }
    res.json({ success: true, equipped: result });
  } catch(e) {
    res.json({ success: false, message: e.message });
  } finally {
    db.close();
  }
});

// ============================================================
// 每日免费材料领取
// POST /api/forge/daily-claim
// 发放: iron_ingot×5, fire_essence×1, jade×2
// 防重复: 使用 forge_daily_claims 表记录 last_claim_date (SQLite)
// ============================================================
router.post('/daily-claim', (req, res) => {
  const db = getDb();
  try {
    const player_id = parseInt(req.body.player_id ?? req.body.userId ?? 1);

    // 确保 forge_daily_claims 表存在
    db.exec(`
      CREATE TABLE IF NOT EXISTS forge_daily_claims (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        last_claim_date TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s','now')),
        UNIQUE(player_id, last_claim_date)
      )
    `);

    const todayStr = new Date().toISOString().split('T')[0];

    // 检查今日是否已领取
    const existing = db.prepare(
      'SELECT last_claim_date FROM forge_daily_claims WHERE player_id = ? AND last_claim_date = ?'
    ).get(player_id, todayStr);

    if (existing) {
      // 已领取，计算下次可领取时间
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const remainingMs = tomorrow - now;
      const hours = Math.floor(remainingMs / 3600000);
      const minutes = Math.floor((remainingMs % 3600000) / 60000);

      return res.json({
        success: false,
        error: '今日材料已领取',
        next_claim_in: `${hours}小时${minutes}分钟`
      });
    }

    // 发放材料：iron_ingot×5, fire_essence×1, jade×2
    const rewards = [
      { id: 'iron_ingot', name: '铁锭', quantity: 5 },
      { id: 'fire_essence', name: '火精', quantity: 1 },
      { id: 'jade', name: '玉石', quantity: 2 }
    ];

    for (const r of rewards) {
      // 使用 INSERT OR REPLACE 处理已存在材料的情况
      const existing = db.prepare(
        'SELECT quantity FROM forge_materials WHERE player_id = ? AND material_key = ?'
      ).get(player_id, r.id);

      if (existing) {
        db.prepare(
          'UPDATE forge_materials SET quantity = quantity + ?, updated_at = strftime(\'%s\', \'now\') WHERE player_id = ? AND material_key = ?'
        ).run(r.quantity, player_id, r.id);
      } else {
        db.prepare(
          'INSERT INTO forge_materials (player_id, material_key, quantity, updated_at) VALUES (?, ?, ?, strftime(\'%s\', \'now\'))'
        ).run(player_id, r.id, r.quantity);
      }
    }

    // 记录每日领取（使用 INSERT OR IGNORE 处理并发重复领取）
    try {
      db.prepare(
        'INSERT OR IGNORE INTO forge_daily_claims (player_id, last_claim_date) VALUES (?, ?)'
      ).run(player_id, todayStr);
    } catch (_) { /* 并发已领取 */ }

    // 获取更新后的材料
    const materials = db.prepare(
      'SELECT material_key as id, quantity FROM forge_materials WHERE player_id = ?'
    ).all(player_id);

    res.json({
      success: true,
      message: '每日材料领取成功',
      data: { rewards, materials }
    });
  } catch (e) {
    res.json({ success: false, error: e.message });
  } finally {
    db.close();
  }
});

// 获取每日领取状态
// GET /api/forge/daily-claim/status
router.get('/daily-claim/status', (req, res) => {
  const db = getDb();
  try {
    const player_id = parseInt(req.query.player_id ?? req.query.userId ?? 1);
    const todayStr = new Date().toISOString().split('T')[0];

    const existing = db.prepare(
      'SELECT last_claim_date FROM forge_daily_claims WHERE player_id = ? AND last_claim_date = ?'
    ).get(player_id, todayStr);

    if (existing) {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const remainingMs = tomorrow - now;
      const hours = Math.floor(remainingMs / 3600000);
      const minutes = Math.floor((remainingMs % 3600000) / 60000);
      return res.json({ success: true, claimed: true, next_claim_in: `${hours}小时${minutes}分钟` });
    }

    res.json({ success: true, claimed: false });
  } catch (e) {
    res.json({ success: true, claimed: false });
  } finally {
    db.close();
  }
});

module.exports = router;
