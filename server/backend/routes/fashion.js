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

// ─── Fashion Templates ────────────────────────────────────────────────────────
const FASHION_TEMPLATES = [
  { id: 1,  name: '新手布衣',    icon: '👕', quality: 'common',    bonus_atk: 0,   bonus_def: 5,   bonus_hp: 20,  bonus_spd: 0,   description: '系统赠送的朴素衣裳' },
  { id: 2,  name: '侠客服',      icon: '🥋', quality: 'rare',      bonus_atk: 10,  bonus_def: 15,  bonus_hp: 50,  bonus_spd: 0,   description: '商城购买的武侠风格服装' },
  { id: 3,  name: '玄冰袍',      icon: '🧊', quality: 'rare',      bonus_atk: 15,  bonus_def: 20,  bonus_hp: 80,  bonus_spd: 0,   description: '副本掉落的冰系时装' },
  { id: 4,  name: '烈焰甲',      icon: '🔥', quality: 'epic',      bonus_atk: 25,  bonus_def: 25,  bonus_hp: 120, bonus_spd: 0,   description: '烈火系极品战甲' },
  { id: 5,  name: '紫霞仙衣',    icon: '👗', quality: 'epic',      bonus_atk: 30,  bonus_def: 30,  bonus_hp: 150, bonus_spd: 5,   description: '仙侣赠送的霓裳羽衣' },
  { id: 6,  name: '天帝战袍',    icon: '👘', quality: 'legendary', bonus_atk: 50,  bonus_def: 50,  bonus_hp: 300, bonus_spd: 10,  description: '限时活动专属神袍' },
  { id: 7,  name: '混沌神甲',    icon: '🛡️', quality: 'legendary', bonus_atk: 80,  bonus_def: 80,  bonus_hp: 500, bonus_spd: 15,  description: '巅峰对决终极奖励' },
  { id: 8,  name: '青云弟子服',  icon: '⚪', quality: 'epic',      bonus_atk: 20,  bonus_def: 25,  bonus_hp: 100, bonus_spd: 0,   description: '宗门经典时装' },
  { id: 9,  name: '霓裳羽衣',    icon: '👗', quality: 'legendary', bonus_atk: 60,  bonus_def: 60,  bonus_hp: 400, bonus_spd: 20,  description: '仙女下凡套装' },
  { id: 10, name: '浪子行头',    icon: '🎭', quality: 'rare',      bonus_atk: 12,  bonus_def: 18,  bonus_hp: 60,  bonus_spd: 5,   description: '侠客专属时装' },
  { id: 11, name: '和风雅韵',    icon: '👘', quality: 'rare',      bonus_atk: 18,  bonus_def: 22,  bonus_hp: 90,  bonus_spd: 3,   description: '东瀛和风雅韵服装' },
  { id: 12, name: '剑修袍',      icon: '👔', quality: 'epic',      bonus_atk: 35,  bonus_def: 35,  bonus_hp: 180, bonus_spd: 8,   description: '剑道修士专属战袍' },
];

const QUALITY_COLORS = {
  common:    '#9E9E9E',
  rare:      '#2196F3',
  epic:      '#9C27B0',
  legendary: '#FF9800',
};

// ─── Init Tables ──────────────────────────────────────────────────────────────
function initFashionTables() {
  const db = getDb();
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS fashion_templates (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        quality TEXT NOT NULL DEFAULT 'common',
        bonus_atk INTEGER DEFAULT 0,
        bonus_def INTEGER DEFAULT 0,
        bonus_hp INTEGER DEFAULT 0,
        bonus_spd INTEGER DEFAULT 0,
        description TEXT DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS player_fashions (
        user_id INTEGER NOT NULL,
        fashion_id INTEGER NOT NULL,
        equipped INTEGER DEFAULT 0,
        acquired_at TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (user_id, fashion_id)
      );
    `);

    // Seed templates if empty
    const count = db.prepare('SELECT COUNT(*) as c FROM fashion_templates').get();
    if (count.c === 0) {
      const insert = db.prepare(
        'INSERT OR IGNORE INTO fashion_templates (id, name, icon, quality, bonus_atk, bonus_def, bonus_hp, bonus_spd, description) VALUES (?,?,?,?,?,?,?,?,?)'
      );
      const insertAll = db.transaction((items) => {
        for (const t of items) {
          insert.run(t.id, t.name, t.icon, t.quality, t.bonus_atk, t.bonus_def, t.bonus_hp, t.bonus_spd, t.description);
        }
      });
      insertAll(FASHION_TEMPLATES);
    }
  } finally {
    db.close();
  }
}
initFashionTables();

// ─── Auth helper ──────────────────────────────────────────────────────────────
function getUserId(req) {
  return parseInt(req.userId || req.body?.player_id || req.body?.userId || req.query?.player_id || req.query?.userId || 1);
}

// ─── GET /api/fashion ─────────────────────────────────────────────────────────
// Return player's owned fashion items
router.get('/', (req, res) => {
  const userId = getUserId(req);
  const db = getDb();
  try {
    const owned = db.prepare('SELECT * FROM player_fashions WHERE user_id = ?').all(userId);
    const equippedRow = owned.find(r => r.equipped === 1);

    const items = FASHION_TEMPLATES.map(tpl => {
      const owned_entry = owned.find(r => r.fashion_id === tpl.id);
      return {
        id: String(tpl.id),
        type: 'fashion',
        name: tpl.name,
        icon: tpl.icon,
        rarity: tpl.quality,
        quality_color: QUALITY_COLORS[tpl.quality] || '#9E9E9E',
        owned: !!owned_entry,
        equipped: owned_entry ? owned_entry.equipped === 1 : false,
        bonus_atk: tpl.bonus_atk,
        bonus_def: tpl.bonus_def,
        bonus_hp: tpl.bonus_hp,
        bonus_spd: tpl.bonus_spd,
        description: tpl.description,
        obtained: owned_entry ? '已拥有' : '未获得',
        effect: tpl.quality === 'legendary' ? '🌟' : tpl.quality === 'epic' ? '✨' : '💫',
      };
    });

    const equipped = equippedRow
      ? items.find(i => String(i.id) === String(equippedRow.fashion_id))
      : null;

    res.json({
      success: true,
      fashionList: items,
      equippedFashion: equipped,
      totalOwned: owned.length,
    });
  } catch (err) {
    console.error('[fashion] GET / error:', err.message);
    res.status(500).json({ success: false, error: '服务器错误' });
  } finally {
    db.close();
  }
});

// ─── GET /api/fashion/info ─────────────────────────────────────────────────────
router.get('/info', (req, res) => {
  const userId = getUserId(req);
  const db = getDb();
  try {
    const owned = db.prepare('SELECT * FROM player_fashions WHERE user_id = ?').all(userId);
    const equippedRow = owned.find(r => r.equipped === 1);
    const equipped = equippedRow
      ? FASHION_TEMPLATES.find(t => t.id === equippedRow.fashion_id)
      : null;

    res.json({
      success: true,
      data: {
        equipped: equipped ? { ...equipped, equipped: true } : null,
        totalOwned: owned.length,
      },
    });
  } catch (err) {
    console.error('[fashion] GET /info error:', err.message);
    res.status(500).json({ success: false, error: '服务器错误' });
  } finally {
    db.close();
  }
});

// ─── POST /api/fashion/equip ──────────────────────────────────────────────────
router.post('/equip', (req, res) => {
  const userId = getUserId(req);
  const fashionId = parseInt(req.body.id || req.body.fashion_id || 0);

  if (!fashionId) {
    return res.status(400).json({ success: false, error: '无效的时装ID' });
  }

  const db = getDb();
  try {
    // Check if player owns this fashion
    const owned = db.prepare('SELECT * FROM player_fashions WHERE user_id = ? AND fashion_id = ?').get(userId, fashionId);
    if (!owned) {
      return res.status(400).json({ success: false, error: '未拥有该时装' });
    }

    const isCurrentlyEquipped = owned.equipped === 1;

    if (isCurrentlyEquipped) {
      // Unequip
      db.prepare('UPDATE player_fashions SET equipped = 0 WHERE user_id = ? AND fashion_id = ?').run(userId, fashionId);
      return res.json({ success: true, equipped: false, message: '已卸下时装' });
    } else {
      // Equip: first unequip all, then equip this one
      db.prepare('UPDATE player_fashions SET equipped = 0 WHERE user_id = ?').run(userId);
      db.prepare('UPDATE player_fashions SET equipped = 1 WHERE user_id = ? AND fashion_id = ?').run(userId, fashionId);
      const tpl = FASHION_TEMPLATES.find(t => t.id === fashionId);
      return res.json({
        success: true,
        equipped: true,
        message: `已穿上「${tpl?.name || '时装'}」`,
        bonus: tpl ? { atk: tpl.bonus_atk, def: tpl.bonus_def, hp: tpl.bonus_hp, spd: tpl.bonus_spd } : null,
      });
    }
  } catch (err) {
    console.error('[fashion] POST /equip error:', err.message);
    res.status(500).json({ success: false, error: '服务器错误' });
  } finally {
    db.close();
  }
});

// ─── Internal: add fashion to player (called by shop when purchasing) ──────────
function addFashionToPlayer(userId, fashionId) {
  const db = getDb();
  try {
    db.prepare(
      'INSERT OR IGNORE INTO player_fashions (user_id, fashion_id, equipped) VALUES (?, ?, 0)'
    ).run(userId, fashionId);
  } finally {
    db.close();
  }
}

// Export for use by shop
module.exports = router;
module.exports.addFashionToPlayer = addFashionToPlayer;
