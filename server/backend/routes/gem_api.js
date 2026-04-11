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

// 宝石配置：类型 → 颜色 → 属性
const GEM_TYPES = {
  attack: { name: '攻击宝石', color: '🔴', attrs: ['attack', 'crit', 'crit_dmg'] },
  defense: { name: '防御宝石', color: '🔵', attrs: ['defense', 'dodge', 'block'] },
  health: { name: '生命宝石', color: '🟢', attrs: ['health', 'hp_regen', 'tenacity'] },
  speed: { name: '速度宝石', color: '🟡', attrs: ['speed', 'initiative', 'action'] },
  cultivation: { name: '修炼宝石', color: '🟣', attrs: ['cultivation', 'spirit', 'comprehension'] },
};

const GEM_QUALITIES = ['normal', 'fine', 'rare', 'epic', 'legendary', 'mythical'];
const GEM_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// 初始化宝石表
function initGemTables() {
  const database = getDb();
  try {
    database.exec(`
      CREATE TABLE IF NOT EXISTS player_gems (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        gem_key TEXT NOT NULL,
        gem_name TEXT NOT NULL,
        quality TEXT NOT NULL,
        attr_type TEXT NOT NULL,
        attr_value INTEGER NOT NULL,
        level INTEGER DEFAULT 1,
        count INTEGER DEFAULT 1,
        obtained_at TEXT DEFAULT (datetime('now', '+8 hours')),
        UNIQUE(user_id, gem_key, quality)
      )
    `);
    database.exec(`
      CREATE TABLE IF NOT EXISTS equipment_gems (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        equipment_id INTEGER NOT NULL,
        slot_index INTEGER NOT NULL DEFAULT 0,
        gem_key TEXT NOT NULL,
        gem_name TEXT NOT NULL,
        quality TEXT NOT NULL,
        attr_type TEXT NOT NULL,
        attr_value INTEGER NOT NULL,
        level INTEGER DEFAULT 1,
        equipped_at TEXT DEFAULT (datetime('now', '+8 hours')),
        UNIQUE(user_id, equipment_id, slot_index)
      )
    `);
    // Equipment表添加gem_slots列（如没有）
    try {
      database.exec("ALTER TABLE Equipment ADD COLUMN gem_slots TEXT DEFAULT '[]'");
    } catch (e) { /* column may already exist */ }
  } catch (e) {
    console.error('[gem] initGemTables error:', e.message);
  }
}
initGemTables();

function extractUserId(req) {
  return parseInt(req.body?.player_id || req.query?.player_id || req.userId || 1) || 1;
}

// 计算宝石属性值
function calcGemAttr(level, baseValue, quality) {
  const qualityMultiplier = { normal: 1, fine: 1.3, rare: 1.6, epic: 2.0, legendary: 2.5, mythical: 3.0 };
  const mult = qualityMultiplier[quality] || 1;
  return Math.floor(baseValue * level * mult);
}

// GET /api/gem/list - 玩家宝石列表
router.get('/list', (req, res) => {
  const userId = extractUserId(req);
  const { type, quality, level } = req.query;
  const database = getDb();
  try {
    let sql = 'SELECT id, gem_key as gemKey, gem_name as name, quality, attr_type as attrType, attr_value as attrValue, level, count, obtained_at as obtainedAt FROM player_gems WHERE user_id = ?';
    const params = [userId];
    if (type) { sql += ' AND attr_type = ?'; params.push(type); }
    if (quality) { sql += ' AND quality = ?'; params.push(quality); }
    if (level) { sql += ' AND level = ?'; params.push(parseInt(level)); }
    sql += ' ORDER BY level DESC, quality DESC, id';
    const gems = database.prepare(sql).all(...params);
    const total = gems.reduce((s, g) => s + g.count, 0);
    res.json({ success: true, gems, total, count: gems.length });
  } catch (e) {
    console.error('[gem] GET /list error:', e.message);
    res.json({ success: false, gems: [], message: e.message });
  }
});

// GET /api/gem/types - 宝石类型配置
router.get('/types', (req, res) => {
  res.json({ success: true, types: GEM_TYPES, qualities: GEM_QUALITIES, maxLevel: 10 });
});

// GET /api/gem/slots?equipmentId=X - 装备宝石孔位
router.get('/slots', (req, res) => {
  const userId = extractUserId(req);
  const { equipmentId } = req.query;
  const database = getDb();
  if (!equipmentId) return res.json({ success: false, message: '缺少装备ID' });
  try {
    const equipped = database.prepare(
      'SELECT slot_index as slot, gem_key as gemKey, gem_name as name, quality, attr_type as attrType, attr_value as attrValue, level, equipped_at as equippedAt FROM equipment_gems WHERE user_id = ? AND equipment_id = ? ORDER BY slot_index'
    ).all(userId, parseInt(equipmentId));
    const equipment = database.prepare('SELECT gem_slots FROM Equipment WHERE id = ? AND userId = ?').get(parseInt(equipmentId), userId);
    const maxSlots = equipment ? JSON.parse(equipment.gem_slots || '[]').length || 3 : 3;
    const slots = [];
    for (let i = 0; i < maxSlots; i++) {
      const gem = equipped.find(g => g.slot === i);
      slots.push({ index: i, gem: gem || null });
    }
    const totalBonus = equipped.reduce((sum, g) => sum + g.attrValue, 0);
    res.json({ success: true, equipmentId: parseInt(equipmentId), maxSlots, slots, equippedCount: equipped.length, totalBonus });
  } catch (e) {
    console.error('[gem] GET /slots error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// POST /api/gem/embed - 镶嵌宝石
router.post('/embed', (req, res) => {
  const userId = extractUserId(req);
  const { gemId, equipmentId, slot } = req.body || {};
  const database = getDb();
  if (!gemId || !equipmentId) return res.json({ success: false, message: '缺少宝石ID或装备ID' });
  try {
    const gem = database.prepare('SELECT * FROM player_gems WHERE id = ? AND user_id = ?').get(gemId, userId);
    if (!gem) return res.json({ success: false, message: '宝石不存在' });
    if (gem.count < 1) return res.json({ success: false, message: '宝石数量不足' });
    const equipment = database.prepare('SELECT * FROM Equipment WHERE id = ? AND userId = ?').get(equipmentId, userId);
    if (!equipment) return res.json({ success: false, message: '装备不存在' });
    const gemSlots = JSON.parse(equipment.gem_slots || '[]');
    const maxSlots = gemSlots.length || 3;
    const slotIndex = slot !== undefined ? parseInt(slot) : 0;
    if (slotIndex < 0 || slotIndex >= maxSlots) return res.json({ success: false, message: `孔位范围: 0-${maxSlots - 1}` });
    // 检查该孔位是否已有宝石
    const existing = database.prepare('SELECT * FROM equipment_gems WHERE user_id = ? AND equipment_id = ? AND slot_index = ?').get(userId, equipmentId, slotIndex);
    if (existing) return res.json({ success: false, message: `孔位${slotIndex}已有宝石，请先卸下` });
    // 镶嵌
    database.prepare(
      'INSERT INTO equipment_gems (user_id, equipment_id, slot_index, gem_key, gem_name, quality, attr_type, attr_value, level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(userId, equipmentId, slotIndex, gem.gem_key, gem.gem_name, gem.quality, gem.attr_type, gem.attr_value, gem.level);
    // 消耗宝石
    if (gem.count === 1) {
      database.prepare('DELETE FROM player_gems WHERE id = ?').run(gemId);
    } else {
      database.prepare('UPDATE player_gems SET count = count - 1 WHERE id = ?').run(gemId);
    }
    // 更新装备属性（加属性到装备）
    const newAttack = (equipment.attack || 0) + gem.attr_value;
    const newDefense = (equipment.defense || 0) + (gem.attr_type === 'defense' ? gem.attr_value : 0);
    database.prepare('UPDATE Equipment SET attack = ?, defense = ?, updatedAt = datetime("now") WHERE id = ?').run(newAttack, newDefense, equipmentId);
    res.json({ success: true, message: `成功将${gem.gem_name}镶嵌到装备孔位${slotIndex}`, gem: { name: gem.gem_name, quality: gem.quality, level: gem.level }, newAttack, newDefense });
  } catch (e) {
    console.error('[gem] POST /embed error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// POST /api/gem/unequip - 卸下宝石
router.post('/unequip', (req, res) => {
  const userId = extractUserId(req);
  const { equipmentId, slot } = req.body || {};
  const database = getDb();
  if (!equipmentId || slot === undefined) return res.json({ success: false, message: '缺少装备ID或孔位' });
  try {
    const equipped = database.prepare('SELECT * FROM equipment_gems WHERE user_id = ? AND equipment_id = ? AND slot_index = ?').get(userId, equipmentId, parseInt(slot));
    if (!equipped) return res.json({ success: false, message: '该孔位没有宝石' });
    // 卸下到背包
    const existingBag = database.prepare('SELECT * FROM player_gems WHERE user_id = ? AND gem_key = ? AND quality = ? AND level = ?').get(userId, equipped.gem_key, equipped.quality, equipped.level);
    if (existingBag) {
      database.prepare('UPDATE player_gems SET count = count + 1 WHERE id = ?').run(existingBag.id);
    } else {
      database.prepare('INSERT INTO player_gems (user_id, gem_key, gem_name, quality, attr_type, attr_value, level, count) VALUES (?, ?, ?, ?, ?, ?, ?, 1)').run(
        userId, equipped.gem_key, equipped.gem_name, equipped.quality, equipped.attr_type, equipped.attr_value, equipped.level
      );
    }
    database.prepare('DELETE FROM equipment_gems WHERE id = ?').run(equipped.id);
    // 扣属性
    const equipment = database.prepare('SELECT * FROM Equipment WHERE id = ? AND userId = ?').get(equipmentId, userId);
    if (equipment) {
      const newAttack = Math.max(0, (equipment.attack || 0) - equipped.attr_value);
      const newDefense = gem.attr_type === 'defense' ? Math.max(0, (equipment.defense || 0) - equipped.attr_value) : (equipment.defense || 0);
      database.prepare('UPDATE Equipment SET attack = ?, defense = ?, updatedAt = datetime("now") WHERE id = ?').run(newAttack, newDefense, equipmentId);
    }
    res.json({ success: true, message: `已从孔位${slot}卸下${equipped.gem_name}`, gem: { name: equipped.gem_name, quality: equipped.quality, level: equipped.level } });
  } catch (e) {
    console.error('[gem] POST /unequip error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// POST /api/gem/synthesize - 宝石合成（3个同品质→1个高一级）
router.post('/synthesize', (req, res) => {
  const userId = extractUserId(req);
  const { gemKey, quality, count = 3 } = req.body || {};
  const database = getDb();
  if (!gemKey || !quality) return res.json({ success: false, message: '缺少宝石key或品质' });
  const qualityIndex = GEM_QUALITIES.indexOf(quality);
  if (qualityIndex === -1) return res.json({ success: false, message: '无效的品质' });
  if (qualityIndex >= GEM_QUALITIES.length - 1) return res.json({ success: false, message: '当前品质已是最高，无法继续合成' });
  try {
    const needed = count || 3;
    const gem = database.prepare('SELECT * FROM player_gems WHERE user_id = ? AND gem_key = ? AND quality = ? AND level = 1').get(userId, gemKey, quality);
    if (!gem || gem.count < needed) return res.json({ success: false, message: `需要${needed}个同品质${quality}宝石，当前只有${gem?.count || 0}个` });
    const nextQuality = GEM_QUALITIES[qualityIndex + 1];
    // 消耗原料
    if (gem.count === needed) {
      database.prepare('DELETE FROM player_gems WHERE id = ?').run(gem.id);
    } else {
      database.prepare('UPDATE player_gems SET count = count - ? WHERE id = ?').run(needed, gem.id);
    }
    // 产出
    const newGem = database.prepare('SELECT * FROM player_gems WHERE user_id = ? AND gem_key = ? AND quality = ? AND level = 1').get(userId, gemKey, nextQuality);
    if (newGem) {
      database.prepare('UPDATE player_gems SET count = count + 1 WHERE id = ?').run(newGem.id);
    } else {
      const baseValue = { attack: 50, defense: 40, health: 300, speed: 20, cultivation: 100, crit: 30, crit_dmg: 50 }[gem.attr_type] || 30;
      database.prepare('INSERT INTO player_gems (user_id, gem_key, gem_name, quality, attr_type, attr_value, level, count) VALUES (?, ?, ?, ?, ?, ?, 1, 1)').run(
        userId, gemKey, gem.gem_name.replace(quality, nextQuality), nextQuality, gem.attr_type, calcGemAttr(1, baseValue, nextQuality)
      );
    }
    res.json({ success: true, message: `成功！消耗${needed}个${quality}→获得1个${nextQuality}${gem.gem_name}`, nextQuality });
  } catch (e) {
    console.error('[gem] POST /synthesize error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// POST /api/gem/forge - 打造宝石（消耗材料）
router.post('/forge', (req, res) => {
  const userId = extractUserId(req);
  const { gemType, quality = 'fine' } = req.body || {};
  const database = getDb();
  if (!gemType || !GEM_TYPES[gemType]) return res.json({ success: false, message: '无效的宝石类型' });
  const qualityIndex = Math.max(0, GEM_QUALITIES.indexOf(quality));
  const finalQuality = GEM_QUALITIES[qualityIndex] || 'fine';
  const costs = { normal: 100, fine: 300, rare: 800, epic: 2000, legendary: 5000, mythical: 15000 };
  const cost = costs[finalQuality] || 300;
  const user = database.prepare('SELECT lingshi FROM Users WHERE id = ?').get(userId);
  if (!user || user.lingshi < cost) return res.json({ success: false, message: `灵石不足，需要${cost}灵石` });
  try {
    database.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(cost, userId);
    const baseValue = { attack: 50, defense: 40, health: 300, speed: 20, cultivation: 100, crit: 30, crit_dmg: 50 }[GEM_TYPES[gemType].attrs[0]] || 30;
    const gemKey = `gem_${gemType}_${finalQuality}`;
    const existing = database.prepare('SELECT * FROM player_gems WHERE user_id = ? AND gem_key = ? AND quality = ? AND level = 1').get(userId, gemKey, finalQuality);
    if (existing) {
      database.prepare('UPDATE player_gems SET count = count + 1 WHERE id = ?').run(existing.id);
    } else {
      database.prepare('INSERT INTO player_gems (user_id, gem_key, gem_name, quality, attr_type, attr_value, level, count) VALUES (?, ?, ?, ?, ?, ?, 1, 1)').run(
        userId, gemKey, `${GEM_TYPES[gemType].name}[${finalQuality}]`, finalQuality, GEM_TYPES[gemType].attrs[0], calcGemAttr(1, baseValue, finalQuality)
      );
    }
    res.json({ success: true, message: `打造成功！消耗${cost}灵石，获得${finalQuality}${GEM_TYPES[gemType].name}`, cost });
  } catch (e) {
    console.error('[gem] POST /forge error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

module.exports = router;
