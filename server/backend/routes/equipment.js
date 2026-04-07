/**
 * equipment.js - 装备强化系统 API
 * P0-3: /api/equipment/enhance (强化) + /api/equipment/detail (详情)
 * 强化规则: +1~+15, +1~+5无风险, +6以上失败不掉级, +10解锁光效
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
} catch(e) {
  db = { prepare: () => ({ run: () => {}, get: () => null, all: () => [] }), close: () => {} };
}

// 强化成功率配置（%）
const SUCCESS_RATES = [100,100,100,100,100, 95,90,85,80,75, 70,65,60,55,50];
// 每级强化石消耗
const STONE_COSTS  = [3,5,8,12,18, 25,35,50,70,100, 130,170,220,280,350];
// 灵石消耗
const LINGSHI_COSTS = [0,50,100,200,400, 800,1500,2500,4000,6500, 10000,15000,22000,32000,50000];
// 光效解锁等级
const GLOW_LEVEL = 10;

function getPlayerId(req) {
  return parseInt(req.userId || req.query.userId || req.body?.userId || 1);
}

// 装备强化
router.post('/enhance', (req, res) => {
  const playerId = getPlayerId(req);
  const { equipmentId } = req.body;

  if (!equipmentId) return res.json({ success: false, message: '请提供 equipmentId' });

  try {
    const equip = db.prepare('SELECT * FROM forge_equipment WHERE id=? AND player_id=?').get(equipmentId, playerId);
    if (!equip) return res.json({ success: false, message: '装备不存在' });

    const level = equip.strengthen_level || 0;
    if (level >= 15) return res.json({ success: false, message: '已达最高强化等级（15级）' });

    const stoneCost  = STONE_COSTS[level]  || 1;
    const lingshiCost = LINGSHI_COSTS[level] || 0;
    const successRate = SUCCESS_RATES[level] || 50;

    // 检查强化石
    const mat = db.prepare("SELECT quantity FROM forge_materials WHERE player_id=? AND material_key='strengthen_stone'").get(playerId);
    if ((mat?.quantity || 0) < stoneCost) {
      return res.json({ success: false, message: `强化石不足，需要${stoneCost}个，当前${mat?.quantity || 0}个` });
    }
    // 检查灵石
    const user = db.prepare('SELECT lingshi FROM Users WHERE id=?').get(playerId);
    if ((user?.lingshi || 0) < lingshiCost) {
      return res.json({ success: false, message: `灵石不足，需要${lingshiCost}灵石` });
    }

    // 扣费
    db.prepare("UPDATE forge_materials SET quantity = quantity - ? WHERE player_id=? AND material_key='strengthen_stone'").run(stoneCost, playerId);
    if (lingshiCost > 0) {
      db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id=?').run(lingshiCost, playerId);
    }

    const roll = Math.random() * 100;
    const success = roll < successRate;

    if (success) {
      const newLevel = level + 1;
      // 计算属性加成
      const baseStats = JSON.parse(equip.stats || '{}');
      const bonus = {};
      for (const [k, v] of Object.entries(baseStats)) {
        bonus[k] = Math.floor(v * 0.1 * newLevel);
      }
      // +10解锁光效
      let glowEffect = equip.glow_effect || null;
      if (newLevel >= GLOW_LEVEL && !glowEffect) {
        const glowColors = ['golden', 'purple', 'red', 'rainbow'];
        glowEffect = glowColors[Math.floor(Math.random() * glowColors.length)];
      }
      const updateFields = glowEffect
        ? 'strengthen_level=?, bonus_stats=?, glow_effect=?'
        : 'strengthen_level=?, bonus_stats=?';
      const updateValues = glowEffect
        ? [newLevel, JSON.stringify(bonus), glowEffect, equipmentId]
        : [newLevel, JSON.stringify(bonus), equipmentId];
      db.prepare(`UPDATE forge_equipment SET ${updateFields} WHERE id=?`).run(...updateValues);

      res.json({
        success: true,
        level: newLevel,
        bonus,
        glowEffect,
        message: newLevel >= GLOW_LEVEL && glowEffect
          ? `强化成功！+${newLevel}级，解锁【${glowEffect}】光效！`
          : `强化成功！等级提升至+${newLevel}`,
      });
    } else {
      // +1~+5失败不掉级（已是当前level，无操作）; +6+ 失败不掉级（规则要求）
      res.json({
        success: false,
        level,
        message: level < 5 ? '强化失败，装备降回原级' : '强化失败，装备不降级',
        degraded: level < 5,
      });
    }
  } catch(e) {
    console.error('[equipment:enhance]', e.message);
    res.json({ success: false, message: e.message });
  }
});

// GET /api/equipment/detail - 装备详情（含强化信息）
router.get('/detail', (req, res) => {
  const playerId = getPlayerId(req);
  const { equipmentId } = req.query;

  if (!equipmentId) return res.json({ success: false, message: '请提供 equipmentId' });

  try {
    const equip = db.prepare('SELECT * FROM forge_equipment WHERE id=? AND player_id=?').get(parseInt(equipmentId), playerId);
    if (!equip) return res.json({ success: false, message: '装备不存在' });

    // 下级强化属性预览
    const nextBonus = {};
    if ((equip.strengthen_level || 0) < 15) {
      const baseStats = JSON.parse(equip.stats || '{}');
      const nextLevel = (equip.strengthen_level || 0) + 1;
      for (const [k, v] of Object.entries(baseStats)) {
        nextBonus[k] = Math.floor(v * 0.1 * nextLevel);
      }
    }

    res.json({
      success: true,
      equipment: {
        id: equip.id,
        name: equip.name || '未知装备',
        quality: equip.quality || 'white',
        level: equip.level || 1,
        stats: JSON.parse(equip.stats || '{}'),
        strengthen_level: equip.strengthen_level || 0,
        bonus_stats: JSON.parse(equip.bonus_stats || '{}'),
        glow_effect: equip.glow_effect || null,
        next_bonus: nextBonus,
        // 强化费用预览
        next_cost: (equip.strengthen_level || 0) < 15 ? {
          strengthen_stone: STONE_COSTS[equip.strengthen_level || 0] || 1,
          lingshi: LINGSHI_COSTS[equip.strengthen_level || 0] || 0,
          success_rate: SUCCESS_RATES[equip.strengthen_level || 0] || 50,
        } : null,
      }
    });
  } catch(e) {
    console.error('[equipment:detail]', e.message);
    res.json({ success: false, message: e.message });
  }
});

module.exports = router;
