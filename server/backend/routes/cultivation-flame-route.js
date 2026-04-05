/**
 * 灵火修炼系统
 * 点燃灵火 → 挂机修炼 → 收获灵气/经验
 */

const Database = require('better-sqlite3');
const path = require('path');
const DB_PATH = path.join(__dirname, '../data/game.db');
const express = require('express');
const flameRouter = express.Router();
let _db;

function db() {
  if (!_db) _db = new Database(DB_PATH);
  return _db;
}

// =============================================
// 初始化
// =============================================
try {
  db().exec(`
    CREATE TABLE IF NOT EXISTS cultivation_flames (
      player_id INTEGER PRIMARY KEY,
      flame_level INTEGER DEFAULT 1,
      flame_exp INTEGER DEFAULT 0,
      flame_quality TEXT DEFAULT 'common' CHECK(flame_quality IN ('common','uncommon','rare','epic','legendary')),
      is_lit INTEGER DEFAULT 0,
      lit_at DATETIME,
      total_burn_time INTEGER DEFAULT 0,
      last_harvest_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db().exec(`
    CREATE TABLE IF NOT EXISTS flame_rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      flame_level INTEGER NOT NULL,
      spirit_stones INTEGER NOT NULL,
      exp INTEGER NOT NULL,
      harvest_duration INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
} catch(e) {}

// 灵火品质配置
const FLAME_QUALITIES = {
  common: { name: '普通灵火', color: '#aaaaaa', bonus_mult: 1.0, cost: 0, harvest_bonus: 1.0 },
  uncommon: { name: '优良灵火', color: '#4ade80', bonus_mult: 1.5, cost: 500, harvest_bonus: 1.5 },
  rare: { name: '稀有灵火', color: '#60a5fa', bonus_mult: 2.0, cost: 2000, harvest_bonus: 2.0 },
  epic: { name: '史诗灵火', color: '#a855f7', bonus_mult: 3.0, cost: 8000, harvest_bonus: 3.5 },
  legendary: { name: '传说灵火', color: '#f59e0b', bonus_mult: 5.0, cost: 30000, harvest_bonus: 5.0 }
};

// 灵火升级配置（每级基础产出）
const FLAME_LEVEL_CONFIG = {
  1: { baseSpirit: 10, baseExp: 5, perHour: true },
  2: { baseSpirit: 25, baseExp: 12 },
  3: { baseSpirit: 60, baseExp: 30 },
  4: { baseSpirit: 150, baseExp: 70 },
  5: { baseSpirit: 350, baseExp: 160 },
  6: { baseSpirit: 800, baseExp: 370 },
  7: { baseSpirit: 1800, baseExp: 840 },
  8: { baseSpirit: 4000, baseExp: 1900 },
  9: { baseSpirit: 9000, baseExp: 4200 },
  10: { baseSpirit: 20000, baseExp: 9500 }
};

function ensureFlame(playerId) {
  try {
    const existing = db().prepare('SELECT * FROM cultivation_flames WHERE player_id = ?').get(playerId);
    if (!existing) {
      db().prepare('INSERT INTO cultivation_flames (player_id) VALUES (?)').run(playerId);
    }
    return db().prepare('SELECT * FROM cultivation_flames WHERE player_id = ?').get(playerId);
  } catch(e) { return null; }
}

function calculateReward(flame, hoursBurned) {
  const level = flame.flame_level || 1;
  const quality = flame.flame_quality || 'common';
  const cfg = FLAME_LEVEL_CONFIG[level] || FLAME_LEVEL_CONFIG[1];
  const qual = FLAME_QUALITIES[quality] || FLAME_QUALITIES.common;

  const spiritPerHour = cfg.baseSpirit * qual.bonus_mult;
  const expPerHour = cfg.baseExp * qual.bonus_mult;

  const hours = Math.min(hoursBurned, 24); // 最多24小时
  const spirit = Math.floor(spiritPerHour * hours);
  const exp = Math.floor(expPerHour * hours);

  return { spirit, exp, spiritPerHour, expPerHour, quality: qual.name, qualityColor: qual.color };
}

// =============================================
// GET /flame - 获取灵火状态
// =============================================
flameRouter.get('/flame', (req, res) => {
  const playerId = parseInt(req.query.playerId);
  if (!playerId) return res.json({ success: false, message: '缺少playerId' });

  try {
    const flame = ensureFlame(playerId);
    if (!flame) return res.json({ success: false, message: '灵火数据错误' });

    let reward = null;
    if (flame.is_lit && flame.lit_at) {
      const hoursBurned = (Date.now() - new Date(flame.lit_at).getTime()) / 3600000;
      if (hoursBurned > 0) {
        reward = calculateReward(flame, hoursBurned);
        reward.hoursBurned = Math.round(hoursBurned * 10) / 10;
      }
    }

    // 计算升级所需经验
    const level = flame.flame_level || 1;
    const nextLevelExp = level * 500 + level * level * 100;
    const currentExp = flame.flame_exp || 0;

    const qualities = Object.entries(FLAME_QUALITIES).map(([key, val]) => ({
      key, ...val
    }));

    res.json({
      success: true,
      flame: {
        level,
        exp: currentExp,
        nextLevelExp,
        quality: flame.flame_quality || 'common',
        isLit: !!flame.is_lit,
        litAt: flame.lit_at,
        totalBurnTime: flame.total_burn_time || 0
      },
      currentReward: reward,
      qualities
    });
  } catch(e) {
    res.json({ success: false, message: e.message });
  }
});

// =============================================
// POST /flame/light - 点燃灵火
// =============================================
flameRouter.post('/flame/light', (req, res) => {
  const playerId = parseInt(req.body.playerId);
  if (!playerId) return res.json({ success: false, message: '缺少playerId' });

  try {
    const flame = ensureFlame(playerId);
    if (flame.is_lit) {
      return res.json({ success: false, message: '灵火已经点燃，先收获再重新点燃' });
    }

    db().prepare(`
      UPDATE cultivation_flames SET is_lit = 1, lit_at = CURRENT_TIMESTAMP WHERE player_id = ?
    `).run(playerId);

    const reward = calculateReward(flame, 0);
    res.json({ success: true, message: '灵火点燃成功！', reward });
  } catch(e) {
    res.json({ success: false, message: e.message });
  }
});

// =============================================
// POST /flame/harvest - 收获灵气
// =============================================
flameRouter.post('/flame/harvest', (req, res) => {
  const playerId = parseInt(req.body.playerId);
  if (!playerId) return res.json({ success: false, message: '缺少playerId' });

  try {
    const flame = ensureFlame(playerId);
    if (!flame.is_lit || !flame.lit_at) {
      return res.json({ success: false, message: '灵火未点燃' });
    }

    const hoursBurned = (Date.now() - new Date(flame.lit_at).getTime()) / 3600000;
    if (hoursBurned < 0.1) {
      return res.json({ success: false, message: '燃烧时间太短（需至少6分钟）' });
    }

    const reward = calculateReward(flame, hoursBurned);
    const spiritEarned = reward.spirit;
    const expEarned = reward.exp;

    // 添加奖励
    db().prepare('UPDATE Users SET lingshi = lingshi + ?, exp = exp + ? WHERE id = ?').run(spiritEarned, expEarned, playerId);

    // 记录奖励
    db().prepare(`
      INSERT INTO flame_rewards (player_id, flame_level, spirit_stones, exp, harvest_duration)
      VALUES (?, ?, ?, ?, ?)
    `).run(playerId, flame.flame_level, spiritEarned, expEarned, Math.floor(hoursBurned * 60));

    // 重置灵火燃烧时间（但保留等级）
    db().prepare(`
      UPDATE cultivation_flames 
      SET is_lit = 0, lit_at = NULL, 
          flame_exp = flame_exp + ?,
          total_burn_time = total_burn_time + ?
      WHERE player_id = ?
    `).run(Math.floor(expEarned * 0.1), Math.floor(hoursBurned * 60), playerId);

    // 检查是否升级
    const updated = db().prepare('SELECT flame_exp, flame_level FROM cultivation_flames WHERE player_id = ?').get(playerId);
    const nextLevelExp = updated.flame_level * 500 + updated.flame_level * updated.flame_level * 100;
    let leveledUp = false;
    if (updated.flame_exp >= nextLevelExp && updated.flame_level < 10) {
      db().prepare('UPDATE cultivation_flames SET flame_level = flame_level + 1 WHERE player_id = ?').run(playerId);
      leveledUp = true;
    }

    res.json({
      success: true,
      message: `收获 ${spiritEarned} 灵石、${expEarned} 经验`,
      spiritEarned, expEarned,
      flameExpGained: Math.floor(expEarned * 0.1),
      leveledUp,
      newLevel: leveledUp ? updated.flame_level + 1 : updated.flame_level
    });
  } catch(e) {
    res.json({ success: false, message: e.message });
  }
});

// =============================================
// POST /flame/upgrade-quality - 升级灵火品质
// =============================================
flameRouter.post('/flame/upgrade-quality', (req, res) => {
  const { playerId, targetQuality } = req.body;
  if (!playerId) return res.json({ success: false, message: '缺少playerId' });

  const qual = FLAME_QUALITIES[targetQuality];
  if (!qual) return res.json({ success: false, message: '无效的品质' });

  try {
    const flame = ensureFlame(playerId);
    if (!flame) return res.json({ success: false, message: '灵火数据错误' });

    // 检查当前品质等级
    const qualOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    const currentIdx = qualOrder.indexOf(flame.flame_quality || 'common');
    const targetIdx = qualOrder.indexOf(targetQuality);
    if (targetIdx <= currentIdx) return res.json({ success: false, message: '目标品质不能低于当前品质' });

    const cost = qual.cost;
    const player = db().prepare('SELECT lingshi FROM Users WHERE id = ?').get(playerId);
    if (!player || player.lingshi < cost) return res.json({ success: false, message: `灵石不足（需要${cost}灵石）` });

    db().prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(cost, playerId);
    db().prepare('UPDATE cultivation_flames SET flame_quality = ? WHERE player_id = ?').run(targetQuality, playerId);

    res.json({ success: true, message: `灵火升级为【${qual.name}】！`, newQuality: qual.name, qualityColor: qual.color, cost });
  } catch(e) {
    res.json({ success: false, message: e.message });
  }
});

// =============================================
// GET /flame/rewards - 获取收获历史
// =============================================
flameRouter.get('/flame/rewards', (req, res) => {
  const playerId = parseInt(req.query.playerId);
  if (!playerId) return res.json({ success: false, message: '缺少playerId' });

  try {
    const rewards = db().prepare(`
      SELECT * FROM flame_rewards
      WHERE player_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(playerId);

    const totals = db().prepare(`
      SELECT SUM(spirit_stones) as totalSpirit, SUM(exp) as totalExp, COUNT(*) as harvestCount
      FROM flame_rewards WHERE player_id = ?
    `).get(playerId);

    res.json({ success: true, rewards, totals: totals || { totalSpirit: 0, totalExp: 0, harvestCount: 0 } });
  } catch(e) {
    res.json({ success: false, message: e.message });
  }
});

module.exports = flameRouter;
