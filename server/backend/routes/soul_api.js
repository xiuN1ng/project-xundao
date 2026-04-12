/**
 * 挂机修仙 - 星魂 API (Soul API)
 * 星魂背包、装备、升级、碎片合成
 */
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

// 延迟初始化表（与starmap_api共享同一DB）
function initTables() {
  const database = getDb();
  try {
    database.exec(`
      CREATE TABLE IF NOT EXISTS player_souls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        soul_type TEXT NOT NULL,
        quality TEXT NOT NULL DEFAULT 'white',
        level INTEGER DEFAULT 1,
        is_equipped INTEGER DEFAULT 0,
        slot_index INTEGER,
        obtained_at TEXT DEFAULT (datetime('now', '+8 hours')),
        created_at TEXT DEFAULT (datetime('now', '+8 hours'))
      )
    `);
    database.exec(`
      CREATE TABLE IF NOT EXISTS player_soul_fragments (
        player_id INTEGER,
        soul_type TEXT,
        count INTEGER DEFAULT 0,
        PRIMARY KEY(player_id, soul_type)
      )
    `);
    database.exec(`
      CREATE TABLE IF NOT EXISTS player_soul_essence (
        player_id INTEGER PRIMARY KEY,
        essence INTEGER DEFAULT 0,
        updated_at TEXT DEFAULT (datetime('now', '+8 hours'))
      )
    `);
    database.exec(`
      CREATE TABLE IF NOT EXISTS player_starmap (
        player_id INTEGER PRIMARY KEY,
        unlocked_nodes TEXT DEFAULT '[]',
        lit_nodes TEXT DEFAULT '[]',
        total_bonus TEXT DEFAULT '{}',
        updated_at TEXT DEFAULT (datetime('now', '+8 hours'))
      )
    `);
  } catch (e) {
    console.error('[soul] initTables error:', e.message);
  }
}
initTables();

let soulConfig;
let starmapConfig;
try {
  soulConfig = require('../../game/soul_config');
  starmapConfig = require('../../game/starmap_config');
} catch (e) {
  console.error('[soul] config load error:', e.message);
  soulConfig = {};
  starmapConfig = {};
}

function extractPlayerId(req) {
  return parseInt(req.body?.player_id || req.query?.player_id || req.userId || 1) || 1;
}

function ensureSoulEssence(playerId) {
  const database = getDb();
  const existing = database.prepare('SELECT * FROM player_soul_essence WHERE player_id = ?').get(playerId);
  if (!existing) {
    database.prepare('INSERT OR IGNORE INTO player_soul_essence (player_id, essence) VALUES (?, ?)').run(playerId, 100);
  }
  return database.prepare('SELECT essence FROM player_soul_essence WHERE player_id = ?').get(playerId);
}

function ensurePlayerStarmap(playerId) {
  const database = getDb();
  const existing = database.prepare('SELECT * FROM player_starmap WHERE player_id = ?').get(playerId);
  if (!existing) {
    database.prepare('INSERT OR IGNORE INTO player_starmap (player_id) VALUES (?)').run(playerId);
  }
  return existing || { lit_nodes: '[]' };
}

// ============ 星魂 API ============

// GET /api/soul/types - 星魂类型列表
router.get('/types', (req, res) => {
  const types = soulConfig.SOUL_TYPES || {};
  const list = Object.entries(types).map(([key, soul]) => ({
    id: soul.id,
    name: soul.name,
    symbol: soul.symbol,
    element: soul.element,
    quality: soul.quality,
    qualityName: soulConfig.QUALITY_NAMES?.[soul.quality] || soul.quality,
    baseStats: soul.baseStats,
    fragmentCount: soul.fragmentCount,
  }));
  res.json({ success: true, types: list, qualities: soulConfig.QUALITIES || [] });
});

// GET /api/soul/list - 玩家星魂背包
router.get('/list', (req, res) => {
  const playerId = extractPlayerId(req);
  const { quality, symbol, equipped } = req.query;
  const database = getDb();
  try {
    let sql = 'SELECT id, soul_type as soulType, quality, level, is_equipped as isEquipped, slot_index as slotIndex, obtained_at as obtainedAt FROM player_souls WHERE player_id = ?';
    const params = [playerId];
    if (quality) { sql += ' AND quality = ?'; params.push(quality); }
    if (symbol) { sql += ' AND soul_type LIKE ?'; params.push(`%${symbol}%`); }
    if (equipped !== undefined) { sql += ' AND is_equipped = ?'; params.push(equipped === 'true' ? 1 : 0); }
    sql += ' ORDER BY level DESC, quality DESC, id';
    const souls = database.prepare(sql).all(...params);
    // 附加属性计算
    const enriched = souls.map(s => {
      const stats = soulConfig.calcSoulStats?.(s.soulType, s.level, s.quality) || {};
      const typeInfo = soulConfig.SOUL_TYPES?.[s.soulType] || {};
      return { ...s, name: typeInfo.name, symbol: typeInfo.symbol, stats };
    });
    res.json({ success: true, souls: enriched, count: enriched.length });
  } catch (e) {
    console.error('[soul] GET /list error:', e.message);
    res.json({ success: false, souls: [], message: e.message });
  }
});

// GET /api/soul/equip - 已装备星魂
router.get('/equip', (req, res) => {
  const playerId = extractPlayerId(req);
  const database = getDb();
  try {
    const souls = database.prepare(
      'SELECT id, soul_type as soulType, quality, level, is_equipped as isEquipped, slot_index as slotIndex, obtained_at as obtainedAt FROM player_souls WHERE player_id = ? AND is_equipped = 1 ORDER BY slot_index'
    ).all(playerId);
    const enriched = souls.map(s => {
      const stats = soulConfig.calcSoulStats?.(s.soulType, s.level, s.quality) || {};
      const typeInfo = soulConfig.SOUL_TYPES?.[s.soulType] || {};
      return { ...s, name: typeInfo.name, symbol: typeInfo.symbol, stats };
    });
    const maxSlots = soulConfig.EQUIP_SLOTS || 8;
    const slots = Array.from({ length: maxSlots }, (_, i) => {
      const equipped = enriched.find(s => s.slotIndex === i);
      return equipped || { slotIndex: i, empty: true };
    });
    res.json({ success: true, equipped: enriched, slots, totalSlots: maxSlots });
  } catch (e) {
    console.error('[soul] GET /equip error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// POST /api/soul/equip/:soulId - 装备星魂
router.post('/equip/:soulId', (req, res) => {
  const playerId = extractPlayerId(req);
  const { soulId } = req.params;
  const { slotIndex } = req.body;
  const database = getDb();
  try {
    const soul = database.prepare('SELECT * FROM player_souls WHERE id = ? AND player_id = ?').get(soulId, playerId);
    if (!soul) return res.json({ success: false, message: '星魂不存在' });
    if (soul.is_equipped) return res.json({ success: false, message: '该星魂已装备' });

    const maxSlots = soulConfig.EQUIP_SLOTS || 8;

    // 如果指定了槽位，检查是否被占用
    if (slotIndex !== undefined) {
      const slot = parseInt(slotIndex);
      if (slot < 0 || slot >= maxSlots) return res.json({ success: false, message: '无效的槽位' });
      const existing = database.prepare('SELECT id FROM player_souls WHERE player_id = ? AND is_equipped = 1 AND slot_index = ?').get(playerId, slot);
      if (existing) return res.json({ success: false, message: '该槽位已有星魂' });
      database.prepare('UPDATE player_souls SET is_equipped = 1, slot_index = ? WHERE id = ?').run(slot, soulId);
    } else {
      // 自动找空槽
      const usedSlots = database.prepare('SELECT slot_index FROM player_souls WHERE player_id = ? AND is_equipped = 1').all(playerId).map(s => s.slot_index);
      const freeSlot = Array.from({ length: maxSlots }, (_, i) => i).find(i => !usedSlots.includes(i));
      if (freeSlot === undefined) return res.json({ success: false, message: '装备槽位已满' });
      database.prepare('UPDATE player_souls SET is_equipped = 1, slot_index = ? WHERE id = ?').run(freeSlot, soulId);
    }

    const typeInfo = soulConfig.SOUL_TYPES?.[soul.soul_type] || {};
    res.json({ success: true, message: `${typeInfo.name || soul.soul_type}已装备`, soulId });
  } catch (e) {
    console.error('[soul] POST /equip error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// POST /api/soul/unequip/:soulId - 卸下星魂
router.post('/unequip/:soulId', (req, res) => {
  const playerId = extractPlayerId(req);
  const { soulId } = req.params;
  const database = getDb();
  try {
    const soul = database.prepare('SELECT * FROM player_souls WHERE id = ? AND player_id = ?').get(soulId, playerId);
    if (!soul) return res.json({ success: false, message: '星魂不存在' });
    if (!soul.is_equipped) return res.json({ success: false, message: '该星魂未装备' });

    database.prepare('UPDATE player_souls SET is_equipped = 0, slot_index = NULL WHERE id = ?').run(soulId);
    const typeInfo = soulConfig.SOUL_TYPES?.[soul.soul_type] || {};
    res.json({ success: true, message: `${typeInfo.name || soul.soul_type}已卸下`, soulId });
  } catch (e) {
    console.error('[soul] POST /unequip error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// POST /api/soul/upgrade/:soulId - 升级星魂
router.post('/upgrade/:soulId', (req, res) => {
  const playerId = extractPlayerId(req);
  const { soulId } = req.params;
  const database = getDb();
  try {
    const soul = database.prepare('SELECT * FROM player_souls WHERE id = ? AND player_id = ?').get(soulId, playerId);
    if (!soul) return res.json({ success: false, message: '星魂不存在' });

    const currentLevel = soul.level;
    if (currentLevel >= 10) return res.json({ success: false, message: '星魂已满级' });

    const upgradeConfig = soulConfig.UPGRADE_COSTS?.[currentLevel + 1];
    if (!upgradeConfig) return res.json({ success: false, message: '升级配置不存在' });

    // 检查同名星魂作为狗粮
    const feedSouls = database.prepare(
      'SELECT id FROM player_souls WHERE player_id = ? AND soul_type = ? AND id != ? AND is_equipped = 0 ORDER BY level ASC LIMIT ?'
    ).all(playerId, soul.soul_type, soulId, upgradeConfig.feedCount);

    if (feedSouls.length < upgradeConfig.feedCount) {
      return res.json({ success: false, message: `需要${upgradeConfig.feedCount}个同名星魂作为升级材料，当前${feedSouls.length}个` });
    }

    // 检查精华
    const essenceData = ensureSoulEssence(playerId);
    const currentEssence = essenceData?.essence || 0;
    if (currentEssence < upgradeConfig.essenceCost) {
      return res.json({ success: false, message: `星魂精华不足，需要${upgradeConfig.essenceCost}，当前${currentEssence}` });
    }

    const tx = database.transaction(() => {
      // 扣除精华
      database.prepare('UPDATE player_soul_essence SET essence = essence - ? WHERE player_id = ?').run(upgradeConfig.essenceCost, playerId);
      // 删除狗粮星魂
      for (const feed of feedSouls) {
        database.prepare('DELETE FROM player_souls WHERE id = ?').run(feed.id);
      }
      // 升级星魂
      database.prepare('UPDATE player_souls SET level = level + 1 WHERE id = ?').run(soulId);
    });
    tx();

    const newLevel = currentLevel + 1;
    const newStats = soulConfig.calcSoulStats?.(soul.soul_type, newLevel, soul.quality) || {};
    res.json({
      success: true,
      message: `星魂升级成功！当前等级${newLevel}`,
      soulId,
      newLevel,
      newStats,
    });
  } catch (e) {
    console.error('[soul] POST /upgrade error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// POST /api/soul/obtain - 获取星魂（碎片合成）
router.post('/obtain', (req, res) => {
  const playerId = extractPlayerId(req);
  const { soulType, fragments } = req.body;
  const database = getDb();
  try {
    const typeInfo = soulConfig.SOUL_TYPES?.[soulType];
    if (!typeInfo) return res.json({ success: false, message: '无效的星魂类型' });

    // 碎片合成模式: 需要传入 fragments: true 且碎片足够
    if (fragments === true) {
      // 检查碎片数量
      const fragData = database.prepare('SELECT count FROM player_soul_fragments WHERE player_id = ? AND soul_type = ?').get(playerId, soulType);
      const fragCount = fragData?.count || 0;
      const needed = typeInfo.fragmentCount;
      if (fragCount < needed) {
        return res.json({ success: false, message: `碎片不足，需要${needed}个，当前${fragCount}个` });
      }
      // 检查精华
      const recipe = soulConfig.FRAGMENT_RECIPES?.[soulType];
      const essenceCost = recipe?.essenceCost || 50;
      const essenceData = ensureSoulEssence(playerId);
      if ((essenceData?.essence || 0) < essenceCost) {
        return res.json({ success: false, message: `星魂精华不足，需要${essenceCost}` });
      }
      // 合成
      const tx = database.transaction(() => {
        database.prepare('UPDATE player_soul_fragments SET count = count - ? WHERE player_id = ? AND soul_type = ?').run(needed, playerId, soulType);
        database.prepare('UPDATE player_soul_essence SET essence = essence - ? WHERE player_id = ?').run(essenceCost, playerId);
        database.prepare('INSERT INTO player_souls (player_id, soul_type, quality, level) VALUES (?, ?, ?, 1)').run(playerId, soulType, typeInfo.quality);
      });
      tx();
      return res.json({ success: true, message: `${typeInfo.name}合成成功！`, soulType, quality: typeInfo.quality });
    }

    // 直接获得（测试/GM用）
    const quality = req.body.quality || typeInfo.quality || 'white';
    database.prepare('INSERT INTO player_souls (player_id, soul_type, quality, level) VALUES (?, ?, ?, 1)').run(playerId, soulType, quality);
    return res.json({ success: true, message: `${typeInfo.name}获得成功！`, soulType, quality });
  } catch (e) {
    console.error('[soul] POST /obtain error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// GET /api/soul/currency - 星魂精华数量
router.get('/currency', (req, res) => {
  const playerId = extractPlayerId(req);
  const essenceData = ensureSoulEssence(playerId);
  res.json({ success: true, essence: essenceData?.essence || 0, playerId });
});

// GET /api/soul/recipes - 碎片合成配方
router.get('/recipes', (req, res) => {
  const recipes = soulConfig.FRAGMENT_RECIPES || {};
  const list = Object.entries(recipes).map(([key, recipe]) => {
    const typeInfo = soulConfig.SOUL_TYPES?.[key] || {};
    return {
      soulType: key,
      name: typeInfo.name || key,
      quality: recipe.quality,
      qualityName: soulConfig.QUALITY_NAMES?.[recipe.quality] || recipe.quality,
      fragmentCount: recipe.fragmentCount,
      essenceCost: recipe.essenceCost,
      symbol: typeInfo.symbol,
    };
  });
  res.json({ success: true, recipes: list });
});

// GET /api/soul/fragments - 玩家碎片背包
router.get('/fragments', (req, res) => {
  const playerId = extractPlayerId(req);
  const database = getDb();
  try {
    const fragments = database.prepare('SELECT soul_type as soulType, count FROM player_soul_fragments WHERE player_id = ? AND count > 0').all(playerId);
    const enriched = fragments.map(f => {
      const typeInfo = soulConfig.SOUL_TYPES?.[f.soulType] || {};
      return { ...f, name: typeInfo.name, quality: typeInfo.quality, symbol: typeInfo.symbol, fragmentCount: typeInfo.fragmentCount };
    });
    res.json({ success: true, fragments: enriched, count: enriched.length });
  } catch (e) {
    console.error('[soul] GET /fragments error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// POST /api/soul/add-fragment - 增加碎片（GM/掉落用）
router.post('/add-fragment', (req, res) => {
  const playerId = extractPlayerId(req);
  const { soulType, count = 1 } = req.body;
  const database = getDb();
  try {
    const typeInfo = soulConfig.SOUL_TYPES?.[soulType];
    if (!typeInfo) return res.json({ success: false, message: '无效的星魂类型' });
    database.prepare('INSERT OR REPLACE INTO player_soul_fragments (player_id, soul_type, count) VALUES (?, ?, COALESCE((SELECT count FROM player_soul_fragments WHERE player_id = ? AND soul_type = ?), 0) + ?)').run(playerId, soulType, playerId, soulType, count);
    const fragData = database.prepare('SELECT count FROM player_soul_fragments WHERE player_id = ? AND soul_type = ?').get(playerId, soulType);
    res.json({ success: true, soulType, added: count, total: fragData?.count || 0 });
  } catch (e) {
    console.error('[soul] POST /add-fragment error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// POST /api/soul/add-essence - 增加星魂精华（GM/掉落用）
router.post('/add-essence', (req, res) => {
  const playerId = extractPlayerId(req);
  const { count = 1 } = req.body;
  const database = getDb();
  try {
    database.prepare('INSERT OR IGNORE INTO player_soul_essence (player_id, essence) VALUES (?, ?)').run(playerId, 0);
    database.prepare('UPDATE player_soul_essence SET essence = essence + ? WHERE player_id = ?').run(count, playerId);
    const essenceData = ensureSoulEssence(playerId);
    res.json({ success: true, added: count, total: essenceData?.essence || 0 });
  } catch (e) {
    console.error('[soul] POST /add-essence error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

module.exports = router;
