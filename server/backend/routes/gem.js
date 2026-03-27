const express = require('express');
const router = express.Router();
const path = require('path');
const Database = require('better-sqlite3');

// DB path: backend/data/game.db
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

function getDb() {
  return new Database(DB_PATH);
}

// ─── Gem Templates ────────────────────────────────────────────────────────────
const GEM_TEMPLATES = {
  // Key → { name, icon, quality, attrType, attrBase, attrGrowth, slotColor }
  blue:   { name: '蓝宝石',   icon: '💠', quality: 'normal',    attrType: 'attack',      attrBase: 5,   attrGrowth: 3,   slotColor: 'blue'   },
  red:    { name: '红宝石',   icon: '🔴', quality: 'normal',    attrType: 'hp',          attrBase: 50,  attrGrowth: 20,  slotColor: 'red'    },
  green:  { name: '绿宝石',   icon: '💚', quality: 'rare',      attrType: 'defense',     attrBase: 10,  attrGrowth: 5,   slotColor: 'green'  },
  yellow: { name: '黄宝石',   icon: '💛', quality: 'rare',      attrType: 'speed',       attrBase: 5,   attrGrowth: 3,   slotColor: 'yellow' },
  purple: { name: '紫宝石',   icon: '💜', quality: 'epic',      attrType: 'all',         attrBase: 5,   attrGrowth: 3,   slotColor: 'purple' },
  orange: { name: '橙宝石',   icon: '🟠', quality: 'legendary', attrType: 'crit_rate',  attrBase: 2,   attrGrowth: 1,   slotColor: 'orange' },
  cyan:   { name: '青宝石',   icon: '🔵', quality: 'epic',       attrType: 'crit_dmg',    attrBase: 10,  attrGrowth: 5,   slotColor: 'cyan'   },
  pink:   { name: '粉宝石',   icon: '🩷', quality: 'rare',       attrType: 'hp',          attrBase: 100, attrGrowth: 50,  slotColor: 'pink'   },
  white:  { name: '白宝石',   icon: '⚪', quality: 'legendary', attrType: 'all',         attrBase: 10,  attrGrowth: 5,   slotColor: 'white'  },
  black:  { name: '黑曜石',   icon: '🖤', quality: 'epic',       attrType: 'attack',      attrBase: 20,  attrGrowth: 10,  slotColor: 'black'  },
};

const QUALITY_MULTIPLIER = { normal: 1, rare: 2, epic: 4, legendary: 8 };

function calcGemAttr(gemKey, level = 1) {
  const tpl = GEM_TEMPLATES[gemKey];
  if (!tpl) return 0;
  return Math.floor((tpl.attrBase + tpl.attrGrowth * (level - 1)) * QUALITY_MULTIPLIER[tpl.quality]);
}

// ─── Init Tables ──────────────────────────────────────────────────────────────
function initGemTables() {
  const db = getDb();
  try {
    db.exec(`
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
        obtained_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, gem_key, quality)
      );

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
        equipped_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, equipment_id, slot_index)
      );
    `);

    // Add gem_slots column to Equipment if not exists
    try {
      db.exec("ALTER TABLE Equipment ADD COLUMN gem_slots TEXT DEFAULT '[]'");
    } catch (e) { /* column may already exist */ }

  } finally {
    db.close();
  }
}
initGemTables();

// ─── Auth helper ──────────────────────────────────────────────────────────────
function getUserId(req) {
  return parseInt(req.userId || req.body?.player_id || req.body?.userId || req.query?.player_id || req.query?.userId || 1);
}

// ─── GET /api/gem ─────────────────────────────────────────────────────────────
// 玩家拥有的所有宝石
router.get('/', (req, res) => {
  const userId = getUserId(req);
  const db = getDb();
  try {
    const gems = db.prepare('SELECT * FROM player_gems WHERE user_id = ? ORDER BY id').all(userId);
    // Calculate current attr values
    const enriched = gems.map(g => ({
      ...g,
      currentAttr: calcGemAttr(g.gem_key, g.level),
    }));
    res.json({ success: true, gems: enriched });
  } catch (err) {
    res.json({ success: true, gems: [] });
  } finally {
    db.close();
  }
});

// ─── GET /api/gem/templates ───────────────────────────────────────────────────
// 所有宝石模板
router.get('/templates', (req, res) => {
  const templates = Object.entries(GEM_TEMPLATES).map(([key, tpl]) => ({
    key,
    ...tpl,
    attrLv1: calcGemAttr(key, 1),
    attrLv10: calcGemAttr(key, 10),
  }));
  res.json({ success: true, templates });
});

// ─── POST /api/gem/acquire ───────────────────────────────────────────────────
// 获得宝石（商城购买 / 副本掉落 / 活动奖励）
// Body: { gemKey, quality?, count? }
router.post('/acquire', (req, res) => {
  const userId = getUserId(req);
  const { gemKey, quality, count = 1 } = req.body;

  if (!gemKey || !GEM_TEMPLATES[gemKey]) {
    return res.json({ success: false, message: '无效的宝石类型' });
  }

  const tpl = GEM_TEMPLATES[gemKey];
  const q = quality || tpl.quality;
  const db = getDb();
  try {
    // Upsert into player_gems
    const existing = db.prepare(
      'SELECT * FROM player_gems WHERE user_id = ? AND gem_key = ? AND quality = ?'
    ).get(userId, gemKey, q);

    if (existing) {
      db.prepare(
        'UPDATE player_gems SET count = count + ?, level = MAX(level, ?), attr_value = ? WHERE id = ?'
      ).run(count, 1, calcGemAttr(gemKey, existing.level), existing.id);
    } else {
      db.prepare(
        'INSERT INTO player_gems (user_id, gem_key, gem_name, quality, attr_type, attr_value, level, count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(userId, gemKey, tpl.name, q, tpl.attrType, calcGemAttr(gemKey, 1), 1, count);
    }

    const updated = db.prepare('SELECT * FROM player_gems WHERE user_id = ?').all(userId);
    res.json({ success: true, message: `获得 ${count} 个 ${tpl.name}`, gems: updated });
  } catch (err) {
    res.json({ success: false, message: err.message });
  } finally {
    db.close();
  }
});

// ─── POST /api/gem/embed ─────────────────────────────────────────────────────
// 将宝石镶嵌到装备上
// Body: { equipmentId, gemKey, quality, slotIndex?, fromInventory: bool }
router.post('/embed', (req, res) => {
  const userId = getUserId(req);
  const { equipmentId, gemKey, quality, slotIndex = 0 } = req.body;

  if (!equipmentId || !gemKey || !GEM_TEMPLATES[gemKey]) {
    return res.json({ success: false, message: '参数不完整或宝石类型无效' });
  }

  const tpl = GEM_TEMPLATES[gemKey];
  const q = quality || tpl.quality;
  const db = getDb();

  try {
    // Check equipment belongs to user
    const eq = db.prepare('SELECT * FROM Equipment WHERE id = ? AND userId = ?').get(equipmentId, userId);
    if (!eq) {
      return res.json({ success: false, message: '装备不存在或不属于你' });
    }

    // Remove any gem already in that slot
    const oldGem = db.prepare(
      'SELECT * FROM equipment_gems WHERE user_id = ? AND equipment_id = ? AND slot_index = ?'
    ).get(userId, equipmentId, slotIndex);

    if (oldGem) {
      // Return old gem to inventory
      const invOld = db.prepare(
        'SELECT * FROM player_gems WHERE user_id = ? AND gem_key = ? AND quality = ?'
      ).get(userId, oldGem.gem_key, oldGem.quality);
      if (invOld) {
        db.prepare('UPDATE player_gems SET count = count + 1 WHERE id = ?').run(invOld.id);
      } else {
        db.prepare(
          'INSERT INTO player_gems (user_id, gem_key, gem_name, quality, attr_type, attr_value, level, count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(userId, oldGem.gem_key, oldGem.gem_name, oldGem.quality, oldGem.attr_type, oldGem.attr_value, 1, 1);
      }
      db.prepare('DELETE FROM equipment_gems WHERE id = ?').run(oldGem.id);
    }

    // Remove gem from inventory (consume 1)
    if (req.body.fromInventory !== false) {
      const invGem = db.prepare(
        'SELECT * FROM player_gems WHERE user_id = ? AND gem_key = ? AND quality = ? AND count > 0'
      ).get(userId, gemKey, q);
      if (!invGem) {
        return res.json({ success: false, message: '背包中没有该宝石' });
      }
      if (invGem.count <= 1) {
        db.prepare('DELETE FROM player_gems WHERE id = ?').run(invGem.id);
      } else {
        db.prepare('UPDATE player_gems SET count = count - 1 WHERE id = ?').run(invGem.id);
      }
    }

    // Insert into equipment_gems
    const attrVal = calcGemAttr(gemKey, 1);
    db.prepare(
      'INSERT OR REPLACE INTO equipment_gems (user_id, equipment_id, slot_index, gem_key, gem_name, quality, attr_type, attr_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(userId, equipmentId, slotIndex, gemKey, tpl.name, q, tpl.attrType, attrVal);

    // Update equipment gem_slots JSON
    let slots = [];
    try { slots = JSON.parse(eq.gem_slots || '[]'); } catch (e) { slots = []; }
    // Remove old entry at slotIndex and insert new
    slots = slots.filter(s => s.slotIndex !== slotIndex);
    slots.push({ slotIndex, gemKey, gemName: tpl.name, quality: q, attrType: tpl.attrType, attrValue: attrVal });
    db.prepare('UPDATE Equipment SET gem_slots = ? WHERE id = ?').run(JSON.stringify(slots), equipmentId);

    // Apply gem stat bonus to Equipment
    const bonus = applyGemBonus(db, equipmentId);

    res.json({
      success: true,
      message: `成功镶嵌 ${tpl.name}`,
      equipment: { ...eq, gem_slots: slots },
      gemBonus: bonus,
    });
  } catch (err) {
    res.json({ success: false, message: err.message });
  } finally {
    db.close();
  }
});

// ─── POST /api/gem/unequip ────────────────────────────────────────────────────
// 从装备上卸下宝石
// Body: { equipmentId, slotIndex }
router.post('/unequip', (req, res) => {
  const userId = getUserId(req);
  const { equipmentId, slotIndex = 0 } = req.body;

  const db = getDb();
  try {
    const eg = db.prepare(
      'SELECT * FROM equipment_gems WHERE user_id = ? AND equipment_id = ? AND slot_index = ?'
    ).get(userId, equipmentId, slotIndex);

    if (!eg) {
      return res.json({ success: false, message: '该槽位没有宝石' });
    }

    // Return to inventory
    const inv = db.prepare(
      'SELECT * FROM player_gems WHERE user_id = ? AND gem_key = ? AND quality = ?'
    ).get(userId, eg.gem_key, eg.quality);
    if (inv) {
      db.prepare('UPDATE player_gems SET count = count + 1 WHERE id = ?').run(inv.id);
    } else {
      db.prepare(
        'INSERT INTO player_gems (user_id, gem_key, gem_name, quality, attr_type, attr_value, level, count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(userId, eg.gem_key, eg.gem_name, eg.quality, eg.attr_type, eg.attr_value, 1, 1);
    }

    // Remove from equipment_gems
    db.prepare('DELETE FROM equipment_gems WHERE id = ?').run(eg.id);

    // Update equipment gem_slots
    const eq = db.prepare('SELECT * FROM Equipment WHERE id = ? AND userId = ?').get(equipmentId, userId);
    if (eq) {
      let slots = [];
      try { slots = JSON.parse(eq.gem_slots || '[]'); } catch (e) { slots = []; }
      slots = slots.filter(s => s.slotIndex !== slotIndex);
      db.prepare('UPDATE Equipment SET gem_slots = ? WHERE id = ?').run(JSON.stringify(slots), equipmentId);
      // Recalculate bonus
      const bonus = applyGemBonus(db, equipmentId);
      return res.json({ success: true, message: `卸下 ${eg.gem_name}`, bonus });
    }

    res.json({ success: true, message: `卸下 ${eg.gem_name}` });
  } catch (err) {
    res.json({ success: false, message: err.message });
  } finally {
    db.close();
  }
});

// ─── GET /api/gem/equipment/:equipmentId ────────────────────────────────────
// 查看某装备上的宝石
router.get('/equipment/:equipmentId', (req, res) => {
  const userId = getUserId(req);
  const equipmentId = parseInt(req.params.equipmentId);
  const db = getDb();
  try {
    const eq = db.prepare('SELECT * FROM Equipment WHERE id = ? AND userId = ?').get(equipmentId, userId);
    if (!eq) return res.json({ success: false, message: '装备不存在' });

    const gems = db.prepare(
      'SELECT * FROM equipment_gems WHERE user_id = ? AND equipment_id = ? ORDER BY slot_index'
    ).all(userId, equipmentId);

    let slots = [];
    try { slots = JSON.parse(eq.gem_slots || '[]'); } catch (e) { slots = []; }

    const bonus = calcTotalGemBonus(gems);
    res.json({ success: true, equipment: eq, gems, slots, bonus });
  } catch (err) {
    res.json({ success: false, message: err.message });
  } finally {
    db.close();
  }
});

// ─── POST /api/gem/combine ────────────────────────────────────────────────────
// 合成宝石：3个同品质同key宝石 → 1个更高品质宝石
// Body: { gemKey, quality, count }
router.post('/combine', (req, res) => {
  const userId = getUserId(req);
  const { gemKey, quality, count = 3 } = req.body;

  if (!gemKey || !GEM_TEMPLATES[gemKey]) {
    return res.json({ success: false, message: '无效宝石类型' });
  }

  const QUALITY_ORDER = ['normal', 'rare', 'epic', 'legendary'];
  const qIdx = QUALITY_ORDER.indexOf(quality || 'normal');
  if (qIdx === -1 || qIdx >= QUALITY_ORDER.length - 1) {
    return res.json({ success: false, message: '该品质无法继续合成' });
  }

  const db = getDb();
  try {
    const inv = db.prepare(
      'SELECT * FROM player_gems WHERE user_id = ? AND gem_key = ? AND quality = ? AND count >= ?'
    ).get(userId, gemKey, quality, count);

    if (!inv) {
      return res.json({ success: false, message: `背包中没有足够的 ${GEM_TEMPLATES[gemKey].name}（${quality}）×${count}` });
    }

    // Consume
    if (inv.count <= count) {
      db.prepare('DELETE FROM player_gems WHERE id = ?').run(inv.id);
    } else {
      db.prepare('UPDATE player_gems SET count = count - ? WHERE id = ?').run(count, inv.id);
    }

    // Produce higher quality
    const newQuality = QUALITY_ORDER[qIdx + 1];
    const tpl = GEM_TEMPLATES[gemKey];
    const newAttr = calcGemAttr(gemKey, 1);

    const existingNew = db.prepare(
      'SELECT * FROM player_gems WHERE user_id = ? AND gem_key = ? AND quality = ?'
    ).get(userId, gemKey, newQuality);

    if (existingNew) {
      db.prepare('UPDATE player_gems SET count = count + 1 WHERE id = ?').run(existingNew.id);
    } else {
      db.prepare(
        'INSERT INTO player_gems (user_id, gem_key, gem_name, quality, attr_type, attr_value, level, count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(userId, gemKey, tpl.name, newQuality, tpl.attrType, newAttr, 1, 1);
    }

    res.json({
      success: true,
      message: `合成成功！获得 ${tpl.name}（${newQuality}）×1`,
    });
  } catch (err) {
    res.json({ success: false, message: err.message });
  } finally {
    db.close();
  }
});

// ─── Helper: apply gem bonus to Equipment table ────────────────────────────────
function applyGemBonus(db, equipmentId) {
  const gems = db.prepare(
    'SELECT * FROM equipment_gems WHERE equipment_id = ?'
  ).all(equipmentId);

  const bonus = calcTotalGemBonus(gems);

  const eq = db.prepare('SELECT * FROM Equipment WHERE id = ?').get(equipmentId);
  if (eq) {
    const newAtk = Math.floor((eq.attack || 0) + (bonus.attack || 0));
    const newDef = Math.floor((eq.defense || 0) + (bonus.defense || 0));
    const newHp  = Math.floor((eq.hp || 0) + (bonus.hp || 0));
    db.prepare('UPDATE Equipment SET attack = ?, defense = ?, hp = ? WHERE id = ?').run(newAtk, newDef, newHp, equipmentId);
  }

  return bonus;
}

function calcTotalGemBonus(gems) {
  const bonus = { attack: 0, defense: 0, hp: 0, speed: 0, crit_rate: 0, crit_dmg: 0, all: 0 };
  for (const g of gems) {
    if (g.attr_type === 'attack')    bonus.attack    += g.attr_value;
    else if (g.attr_type === 'defense') bonus.defense   += g.attr_value;
    else if (g.attr_type === 'hp')     bonus.hp         += g.attr_value;
    else if (g.attr_type === 'speed')  bonus.speed      += g.attr_value;
    else if (g.attr_type === 'crit_rate') bonus.crit_rate += g.attr_value;
    else if (g.attr_type === 'crit_dmg') bonus.crit_dmg  += g.attr_value;
    else if (g.attr_type === 'all')    bonus.all        += g.attr_value;
  }
  // Distribute "all" bonus
  if (bonus.all > 0) {
    bonus.attack += bonus.all;
    bonus.defense += bonus.all;
    bonus.hp     += bonus.all;
  }
  return bonus;
}

// ─── GET /api/gem/shop ───────────────────────────────────────────────────────
// 宝石商店
router.get('/shop', (req, res) => {
  const shopItems = Object.entries(GEM_TEMPLATES).map(([key, tpl]) => ({
    gemKey: key,
    name: tpl.name,
    icon: tpl.icon,
    quality: tpl.quality,
    attrType: tpl.attrType,
    attrLv1: calcGemAttr(key, 1),
    price: Math.floor(50 * QUALITY_MULTIPLIER[tpl.quality]),
  }));
  res.json({ success: true, items: shopItems });
});

module.exports = router;
