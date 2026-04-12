/**
 * dye_api.js - 装备外观染色/幻彩系统 API
 * 玩家可以给装备/时装/翅膀染上不同颜色
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db;
try {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
} catch (e) {
  db = { prepare: () => ({ run: () => {}, get: () => null, all: () => [] }), exec: () => {} };
}

// ============================================================
// 染料配方配置
// ============================================================
const DYE_RECIPES = [
  // 基础色 (6种) - 灵石200
  { id: 'white',    name: '纯白',    nameCN: '纯白',    hex: '#FFFFFF', tier: 'basic',     cost: 200,  item_key: 'dye_stone_white' },
  { id: 'black',    name: '漆黑',    nameCN: '漆黑',    hex: '#1A1A2E', tier: 'basic',     cost: 200,  item_key: 'dye_stone_black' },
  { id: 'crimson',  name: '血红',    nameCN: '血红',    hex: '#DC143C', tier: 'basic',     cost: 200,  item_key: 'dye_stone_crimson' },
  { id: 'emerald',  name: '碧绿',    nameCN: '碧绿',    hex: '#50C878', tier: 'basic',     cost: 200,  item_key: 'dye_stone_emerald' },
  { id: 'azure',    name: '湛蓝',    nameCN: '湛蓝',    hex: '#007FFF', tier: 'basic',     cost: 200,  item_key: 'dye_stone_azure' },
  { id: 'golden',   name: '金黄',    nameCN: '金黄',    hex: '#FFD700', tier: 'basic',     cost: 200,  item_key: 'dye_stone_golden' },
  // 进阶色 (6种) - 灵石500
  { id: 'violet',   name: '紫罗兰',  nameCN: '紫罗兰',  hex: '#8B00FF', tier: 'advanced',  cost: 500,  item_key: 'dye_stone_violet' },
  { id: 'pink',     name: '粉红',    nameCN: '粉红',    hex: '#FF69B4', tier: 'advanced',  cost: 500,  item_key: 'dye_stone_pink' },
  { id: 'orange',   name: '橙色',    nameCN: '橙色',    hex: '#FF8C00', tier: 'advanced',  cost: 500,  item_key: 'dye_stone_orange' },
  { id: 'cyan',     name: '青色',    nameCN: '青色',    hex: '#00CED1', tier: 'advanced',  cost: 500,  item_key: 'dye_stone_cyan' },
  { id: 'silver',   name: '银色',    nameCN: '银色',    hex: '#C0C0C0', tier: 'advanced',  cost: 500,  item_key: 'dye_stone_silver' },
  { id: 'bronze',   name: '古铜',    nameCN: '古铜',    hex: '#CD7F32', tier: 'advanced',  cost: 500,  item_key: 'dye_stone_bronze' },
  // 稀有色 (6种) - 灵石1500
  { id: 'rainbow',  name: '彩虹',    nameCN: '彩虹',    hex: 'rainbow',  tier: 'rare',      cost: 1500, item_key: 'dye_stone_rainbow' },
  { id: 'obsidian', name: '曜石',    nameCN: '曜石',    hex: '#1C1C1C', tier: 'rare',      cost: 1500, item_key: 'dye_stone_obsidian' },
  { id: 'star',     name: '星辰',    nameCN: '星辰',    hex: '#191970', tier: 'rare',      cost: 1500, item_key: 'dye_stone_star' },
  { id: 'aurora',   name: '极光',    nameCN: '极光',    hex: '#7FFFD4', tier: 'rare',      cost: 1500, item_key: 'dye_stone_aurora' },
  { id: 'phoenix',  name: '凤凰',    nameCN: '凤凰',    hex: '#FF4500', tier: 'rare',      cost: 1500, item_key: 'dye_stone_phoenix' },
  { id: 'ice',      name: '玄冰',    nameCN: '玄冰',    hex: '#E8FFFF', tier: 'rare',      cost: 1500, item_key: 'dye_stone_ice' },
  // 特殊：幻彩流光 - 灵石10000
  { id: 'flowing',  name: '幻彩流光', nameCN: '幻彩流光', hex: 'flowing',  tier: 'special',  cost: 10000, item_key: 'dye_stone_flowing' },
];

const DYE_TYPES = [
  { id: 'weapon',  name: '武器染色',  nameCN: '武器染色' },
  { id: 'armor',   name: '防具染色',  nameCN: '防具染色' },
  { id: 'fashion', name: '时装染色',  nameCN: '时装染色' },
  { id: 'wing',    name: '翅膀染色',  nameCN: '翅膀染色' },
];

// 可染色的装备类型
const DYEABLE_SLOTS = ['weapon', 'armor', 'helmet', 'shoes', 'accessory', 'fashion', 'wing'];

// ============================================================
// 数据库初始化
// ============================================================
function initDyeTables() {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS player_dye_recipes (
        player_id INTEGER PRIMARY KEY,
        unlocked_recipes TEXT DEFAULT '[]',
        unlocked_at DATETIME
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS equipment_dye (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        equipment_id INTEGER NOT NULL,
        dye_color TEXT,
        dye_type TEXT,
        dyed_at DATETIME,
        UNIQUE(player_id, equipment_id)
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS dye_color_schemes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        scheme_name TEXT,
        scheme_data TEXT,
        created_at DATETIME
      )
    `);
    // 初始化 dye_materials 表（染料材料）
    db.exec(`
      CREATE TABLE IF NOT EXISTS dye_materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        material_key TEXT NOT NULL,
        quantity INTEGER DEFAULT 0,
        UNIQUE(player_id, material_key)
      )
    `);
    console.log('[dye_api] 数据库表初始化完成');
  } catch (e) {
    console.error('[dye_api] initDyeTables error:', e.message);
  }
}
initDyeTables();

// ============================================================
// 辅助函数
// ============================================================
function getPlayerId(req) {
  return parseInt(req.userId || req.query.playerId || req.body?.playerId || req.query?.userId || 1) || 1;
}

// 转换为装备类型 (weapon->武器, armor->防具等)
function toEquipSlot(itemType) {
  const map = {
    weapon: 'weapon', armor: 'armor', helmet: 'armor',
    shoes: 'armor', accessory: 'armor', ring: 'armor',
    necklace: 'armor', fashion: 'fashion', wing: 'wing'
  };
  return map[itemType] || 'armor';
}

// 检查装备是否可染色
function isDyeableEquip(equip) {
  if (!equip) return false;
  // 部分稀有装备有 can_dye 字段
  if (equip.can_dye !== undefined && equip.can_dye === 0) return false;
  return true;
}

// ============================================================
// API 1: GET /api/dye/recipes - 获取染料配方列表
// ============================================================
router.get('/recipes', (req, res) => {
  try {
    const playerId = getPlayerId(req);
    // 获取玩家已解锁的配方
    const row = db.prepare('SELECT unlocked_recipes FROM player_dye_recipes WHERE player_id=?').get(playerId);
    const unlocked = row ? JSON.parse(row.unlocked_recipes || '[]') : [];

    // 基础配方全部解锁，高级配方需要解锁
    const recipes = DYE_RECIPES.map(r => ({
      ...r,
      unlocked: r.tier === 'basic' || unlocked.includes(r.id)
    }));

    res.json({
      success: true,
      data: {
        recipes,
        tiers: {
          basic:     { name: '基础色', cost: 200 },
          advanced:  { name: '进阶色', cost: 500 },
          rare:      { name: '稀有色', cost: 1500 },
          special:   { name: '特殊',   cost: 10000 }
        }
      }
    });
  } catch (e) {
    console.error('[dye/recipes] error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// ============================================================
// API 2: GET /api/dye/types - 获取染色类型
// ============================================================
router.get('/types', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        types: DYE_TYPES,
        dyeableSlots: DYEABLE_SLOTS
      }
    });
  } catch (e) {
    console.error('[dye/types] error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// ============================================================
// API 3: POST /api/dye/preview - 染色预览
// ============================================================
router.post('/preview', (req, res) => {
  try {
    const playerId = getPlayerId(req);
    const { equipmentId, color, dyeId } = req.body;

    if (!equipmentId) {
      return res.json({ success: false, message: '请提供 equipmentId' });
    }
    if (!color && !dyeId) {
      return res.json({ success: false, message: '请提供 color 或 dyeId' });
    }

    // 查找装备
    const equip = db.prepare('SELECT * FROM forge_equipment WHERE id=? AND player_id=?').get(equipmentId, playerId);
    if (!equip) {
      return res.json({ success: false, message: '装备不存在' });
    }

    if (!isDyeableEquip(equip)) {
      return res.json({ success: false, message: '该装备不可染色' });
    }

    // 解析颜色
    let targetHex = color;
    let targetDye = null;
    if (dyeId) {
      targetDye = DYE_RECIPES.find(r => r.id === dyeId);
      if (!targetDye) {
        return res.json({ success: false, message: '未知的染料配方' });
      }
      targetHex = targetDye.hex;
    }

    // 预览不消耗任何材料，只返回预览结果
    res.json({
      success: true,
      data: {
        equipmentId: parseInt(equipmentId),
        equipmentName: equip.name || `装备#${equipmentId}`,
        currentColor: equip.dye_color || null,
        previewColor: targetHex,
        dyeId: dyeId || null,
        isRainbow: targetHex === 'rainbow',
        isFlowing: targetHex === 'flowing',
        message: '预览成功，实际染色将消耗材料'
      }
    });
  } catch (e) {
    console.error('[dye/preview] error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// ============================================================
// API 4: POST /api/dye/apply - 应用染色
// ============================================================
router.post('/apply', (req, res) => {
  try {
    const playerId = getPlayerId(req);
    const { equipmentId, color, dyeId, saveScheme } = req.body;

    if (!equipmentId) {
      return res.json({ success: false, message: '请提供 equipmentId' });
    }
    if (!color && !dyeId) {
      return res.json({ success: false, message: '请提供 color 或 dyeId' });
    }

    // 解析目标颜色
    let targetHex = color;
    let targetDye = null;
    if (dyeId) {
      targetDye = DYE_RECIPES.find(r => r.id === dyeId);
      if (!targetDye) {
        return res.json({ success: false, message: '未知的染料配方' });
      }
      targetHex = targetDye.hex;

      // 检查是否已解锁（基础色自动解锁）
      if (targetDye.tier !== 'basic') {
        const row = db.prepare('SELECT unlocked_recipes FROM player_dye_recipes WHERE player_id=?').get(playerId);
        const unlocked = row ? JSON.parse(row.unlocked_recipes || '[]') : [];
        if (!unlocked.includes(dyeId)) {
          return res.json({ success: false, message: `需要先解锁【${targetDye.nameCN}】染料配方` });
        }
      }
    }

    // 查找装备
    const equip = db.prepare('SELECT * FROM forge_equipment WHERE id=? AND player_id=?').get(equipmentId, playerId);
    if (!equip) {
      return res.json({ success: false, message: '装备不存在' });
    }
    if (!isDyeableEquip(equip)) {
      return res.json({ success: false, message: '该装备不可染色' });
    }

    // 检查/消耗材料
    const dyeType = toEquipSlot(equip.type);

    // 彩墨消耗（统一）
    const caiMo = db.prepare('SELECT quantity FROM dye_materials WHERE player_id=? AND material_key=?').get(playerId, 'cai_mo');
    const caiMoCount = caiMo?.quantity || 0;
    if (caiMoCount < 3) {
      return res.json({ success: false, message: `彩墨不足，需要3个，当前${caiMoCount}个` });
    }

    // 染料配方石消耗
    if (dyeId) {
      const dyeStone = db.prepare('SELECT quantity FROM dye_materials WHERE player_id=? AND material_key=?').get(playerId, targetDye.item_key);
      const dyeStoneCount = dyeStone?.quantity || 0;
      if (dyeStoneCount < 1) {
        return res.json({ success: false, message: `染料配方石【${targetDye.nameCN}】不足，需要1个` });
      }
    }

    // 灵石消耗
    const cost = targetDye ? targetDye.cost : 200;
    const user = db.prepare('SELECT lingshi FROM Users WHERE id=?').get(playerId);
    if ((user?.lingshi || 0) < cost) {
      return res.json({ success: false, message: `灵石不足，需要${cost}灵石，当前${user?.lingshi || 0}灵石` });
    }

    // 扣减材料（使用事务）
    const applyDye = db.transaction(() => {
      // 扣彩墨
      db.prepare('UPDATE dye_materials SET quantity = quantity - 3 WHERE player_id=? AND material_key=?').run(playerId, 'cai_mo');
      // 扣染料配方石
      if (dyeId) {
        db.prepare('UPDATE dye_materials SET quantity = quantity - 1 WHERE player_id=? AND material_key=?').run(playerId, targetDye.item_key);
      }
      // 扣灵石
      if (cost > 0) {
        db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id=?').run(cost, playerId);
      }
      // 更新装备染色记录
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO equipment_dye (player_id, equipment_id, dye_color, dye_type, dyed_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(player_id, equipment_id) DO UPDATE SET
          dye_color=excluded.dye_color,
          dye_type=excluded.dye_type,
          dyed_at=excluded.dyed_at
      `).run(playerId, equipmentId, targetHex, dyeType, now);
      // 更新 forge_equipment 上的染色字段（前端显示用）
      db.prepare('UPDATE forge_equipment SET dye_color=?, dye_type=? WHERE id=?').run(targetHex, dyeType, equipmentId);
    });

    applyDye();

    res.json({
      success: true,
      message: `染色成功！消耗彩墨×3，${targetDye ? `染料配方石【${targetDye.nameCN}】×1，` : ''}灵石×${cost}`,
      data: {
        equipmentId: parseInt(equipmentId),
        dyeColor: targetHex,
        dyeType,
        isRainbow: targetHex === 'rainbow',
        isFlowing: targetHex === 'flowing'
      }
    });
  } catch (e) {
    console.error('[dye/apply] error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// ============================================================
// API 5: GET /api/dye/player-colors - 获取玩家已解锁的染色方案
// ============================================================
router.get('/player-colors', (req, res) => {
  try {
    const playerId = getPlayerId(req);

    // 获取已解锁配方
    const row = db.prepare('SELECT unlocked_recipes, unlocked_at FROM player_dye_recipes WHERE player_id=?').get(playerId);
    const unlocked = row ? JSON.parse(row.unlocked_recipes || '[]') : [];

    // 获取玩家拥有的染料材料
    const materials = db.prepare('SELECT material_key, quantity FROM dye_materials WHERE player_id=? AND quantity > 0').all(playerId);
    const matMap = {};
    materials.forEach(m => { matMap[m.material_key] = m.quantity; });

    // 构造配方状态
    const recipes = DYE_RECIPES.map(r => ({
      id: r.id,
      name: r.name,
      nameCN: r.nameCN,
      hex: r.hex,
      tier: r.tier,
      cost: r.cost,
      unlocked: r.tier === 'basic' || unlocked.includes(r.id),
      hasMaterial: (matMap[r.item_key] || 0) >= 1,
      caiMoCount: matMap['cai_mo'] || 0
    }));

    res.json({
      success: true,
      data: {
        playerId,
        unlockedCount: unlocked.length + 6, // 6种基础色
        totalRecipes: DYE_RECIPES.length,
        materials: {
          cai_mo: matMap['cai_mo'] || 0
        },
        recipes
      }
    });
  } catch (e) {
    console.error('[dye/player-colors] error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// ============================================================
// API 6: POST /api/dye/save-scheme - 保存染色方案
// ============================================================
router.post('/save-scheme', (req, res) => {
  try {
    const playerId = getPlayerId(req);
    const { schemeName, schemeData } = req.body;

    if (!schemeName || !schemeData) {
      return res.json({ success: false, message: '请提供 schemeName 和 schemeData' });
    }

    // schemeData格式: {weapon:'#color', armor:'#color', fashion:'#color', wing:'#color'}
    const schemeJson = JSON.stringify(schemeData);

    // 检查该玩家已保存的方案数量（最多5个）
    const count = db.prepare('SELECT COUNT(*) as cnt FROM dye_color_schemes WHERE player_id=?').get(playerId);
    if (count.cnt >= 5) {
      return res.json({ success: false, message: '最多保存5种染色方案，请删除旧方案后再试' });
    }

    const now = new Date().toISOString();
    const result = db.prepare(`
      INSERT INTO dye_color_schemes (player_id, scheme_name, scheme_data, created_at)
      VALUES (?, ?, ?, ?)
    `).run(playerId, schemeName, schemeJson, now);

    res.json({
      success: true,
      message: `染色方案【${schemeName}】保存成功`,
      data: {
        schemeId: result.lastInsertRowid,
        schemeName,
        schemeData
      }
    });
  } catch (e) {
    console.error('[dye/save-scheme] error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// ============================================================
// API 7: GET /api/dye/equipment-status - 获取装备染色状态
// ============================================================
router.get('/equipment-status', (req, res) => {
  try {
    const playerId = getPlayerId(req);

    // 获取玩家所有装备的染色状态
    const equips = db.prepare(`
      SELECT fe.id, fe.name, fe.type, fe.dye_color, fe.dye_type
      FROM forge_equipment fe
      WHERE fe.player_id=?
      ORDER BY fe.id DESC
    `).all(playerId);

    // 读取已保存的染色方案
    const schemes = db.prepare(`
      SELECT id, scheme_name as schemeName, scheme_data as schemeData, created_at as createdAt
      FROM dye_color_schemes
      WHERE player_id=?
      ORDER BY id DESC
    `).all(playerId);

    const status = equips.map(eq => ({
      equipmentId: eq.id,
      name: eq.name || `装备#${eq.id}`,
      itemType: eq.type,
      dyeType: toEquipSlot(eq.type),
      dyeColor: eq.dye_color || null,
      canDye: true,
      isDyed: !!eq.dye_color
    }));

    const schemeList = schemes.map(s => ({
      ...s,
      schemeData: JSON.parse(s.schemeData || '{}')
    }));

    res.json({
      success: true,
      data: {
        playerId,
        totalEquipments: equips.length,
        dyedCount: status.filter(s => s.isDyed).length,
        equipments: status,
        schemes: schemeList
      }
    });
  } catch (e) {
    console.error('[dye/equipment-status] error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// ============================================================
// 额外端点：解锁染料配方（可从商店购买或活动获得）
// ============================================================
router.post('/unlock-recipe', (req, res) => {
  try {
    const playerId = getPlayerId(req);
    const { dyeId } = req.body;

    if (!dyeId) {
      return res.json({ success: false, message: '请提供 dyeId' });
    }

    const dye = DYE_RECIPES.find(r => r.id === dyeId);
    if (!dye) {
      return res.json({ success: false, message: '未知的染料配方' });
    }
    if (dye.tier === 'basic') {
      return res.json({ success: false, message: '基础色无需解锁' });
    }

    // 检查是否已解锁
    const row = db.prepare('SELECT unlocked_recipes FROM player_dye_recipes WHERE player_id=?').get(playerId);
    const unlocked = row ? JSON.parse(row.unlocked_recipes || '[]') : [];
    if (unlocked.includes(dyeId)) {
      return res.json({ success: false, message: `【${dye.nameCN}】配方已解锁` });
    }

    // 解锁（使用 UPSERT）
    unlocked.push(dyeId);
    db.prepare(`
      INSERT INTO player_dye_recipes (player_id, unlocked_recipes, unlocked_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(player_id) DO UPDATE SET unlocked_recipes=excluded.unlocked_recipes
    `).run(playerId, JSON.stringify(unlocked));

    res.json({
      success: true,
      message: `解锁【${dye.nameCN}】染料配方成功！`,
      data: { dyeId, name: dye.nameCN, tier: dye.tier }
    });
  } catch (e) {
    console.error('[dye/unlock-recipe] error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// ============================================================
// 额外端点：删除保存的染色方案
// ============================================================
router.delete('/scheme/:schemeId', (req, res) => {
  try {
    const playerId = getPlayerId(req);
    const schemeId = parseInt(req.params.schemeId);

    const result = db.prepare('DELETE FROM dye_color_schemes WHERE id=? AND player_id=?').run(schemeId, playerId);
    if (result.changes === 0) {
      return res.json({ success: false, message: '方案不存在或无权删除' });
    }

    res.json({ success: true, message: '染色方案删除成功' });
  } catch (e) {
    console.error('[dye/scheme delete] error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

module.exports = router;
