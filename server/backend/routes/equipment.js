/**
 * equipment.js - 装备强化 + 精炼 + 传承系统 API
 * 强化: +1~+15, +1~+5无风险, +6以上失败不掉级, +10解锁光效
 * 精炼: 额外随机属性，0~10级
 * 传承: 将强化等级/属性转移至另一件装备
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

// 精炼配置
const REFINE_STATS = ['attack', 'defense', 'hp', 'speed', 'critRate', 'critDamage', 'dodge', 'tenacity'];
const REFINE_MAX_LEVEL = 10;
const REFINE_STONE_COSTS = [5, 8, 12, 18, 25, 35, 50, 70, 100, 150];
const REFINE_LINGSHI_COSTS = [0, 100, 300, 600, 1200, 2500, 5000, 10000, 20000, 40000];
const REFINE_SUCCESS_RATES = [100,100,100,100,100, 95,90,85,80,75];

// 传承配置
const TRANSFER_GOLD_COST = 10000;

function getPlayerId(req) {
  return parseInt(req.userId || req.query.userId || req.body?.userId || 1);
}

// ============================================================
// 强化相关
// ============================================================

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

    const mat = db.prepare("SELECT quantity FROM forge_materials WHERE player_id=? AND material_key='strengthen_stone'").get(playerId);
    if ((mat?.quantity || 0) < stoneCost) {
      return res.json({ success: false, message: `强化石不足，需要${stoneCost}个，当前${mat?.quantity || 0}个` });
    }
    const user = db.prepare('SELECT lingshi FROM Users WHERE id=?').get(playerId);
    if ((user?.lingshi || 0) < lingshiCost) {
      return res.json({ success: false, message: `灵石不足，需要${lingshiCost}灵石` });
    }

    db.prepare("UPDATE forge_materials SET quantity = quantity - ? WHERE player_id=? AND material_key='strengthen_stone'").run(stoneCost, playerId);
    if (lingshiCost > 0) {
      db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id=?').run(lingshiCost, playerId);
    }

    const roll = Math.random() * 100;
    const success = roll < successRate;

    if (success) {
      const newLevel = level + 1;
      const baseStats = JSON.parse(equip.stats || '{}');
      const bonus = {};
      for (const [k, v] of Object.entries(baseStats)) {
        bonus[k] = Math.floor(v * 0.1 * newLevel);
      }
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
        refine_level: equip.refine_level || 0,
        refine_stats: JSON.parse(equip.refine_stats || '{}'),
        next_bonus: nextBonus,
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

// ============================================================
// 精炼相关 - 为装备添加额外随机属性
// ============================================================

// GET /api/equipment/refine-info - 精炼预览
router.get('/refine-info', (req, res) => {
  const playerId = getPlayerId(req);
  const { equipmentId } = req.query;
  if (!equipmentId) return res.json({ success: false, message: '请提供 equipmentId' });

  try {
    const equip = db.prepare('SELECT * FROM forge_equipment WHERE id=? AND player_id=?').get(parseInt(equipmentId), playerId);
    if (!equip) return res.json({ success: false, message: '装备不存在' });

    const refineLevel = equip.refine_level || 0;
    const refineStats = JSON.parse(equip.refine_stats || '{}');
    const nextStat = REFINE_STATS[refineLevel % REFINE_STATS.length];
    const baseVal = 5 + refineLevel * 5;

    res.json({
      success: true,
      refineLevel,
      refineStats,
      nextPreview: { [nextStat]: baseVal },
      nextCost: refineLevel < REFINE_MAX_LEVEL ? {
        refine_stone: REFINE_STONE_COSTS[refineLevel] || 10,
        lingshi: REFINE_LINGSHI_COSTS[refineLevel] || 0,
        success_rate: REFINE_SUCCESS_RATES[refineLevel] || 75,
      } : null,
      maxLevel: REFINE_MAX_LEVEL,
    });
  } catch(e) {
    console.error('[equipment:refine-info]', e.message);
    res.json({ success: false, message: e.message });
  }
});

// POST /api/equipment/refine - 精炼装备
router.post('/refine', (req, res) => {
  const playerId = getPlayerId(req);
  const { equipmentId } = req.body;
  if (!equipmentId) return res.json({ success: false, message: '请提供 equipmentId' });

  try {
    const equip = db.prepare('SELECT * FROM forge_equipment WHERE id=? AND player_id=?').get(parseInt(equipmentId), playerId);
    if (!equip) return res.json({ success: false, message: '装备不存在' });

    const refineLevel = equip.refine_level || 0;
    if (refineLevel >= REFINE_MAX_LEVEL) {
      return res.json({ success: false, message: `已达最高精炼等级（${REFINE_MAX_LEVEL}级）` });
    }

    const stoneCost = REFINE_STONE_COSTS[refineLevel] || 10;
    const lingshiCost = REFINE_LINGSHI_COSTS[refineLevel] || 0;
    const successRate = REFINE_SUCCESS_RATES[refineLevel] || 75;

    const mat = db.prepare("SELECT quantity FROM forge_materials WHERE player_id=? AND material_key='refine_stone'").get(playerId);
    if ((mat?.quantity || 0) < stoneCost) {
      return res.json({ success: false, message: `精炼石不足，需要${stoneCost}个，当前${mat?.quantity || 0}个` });
    }
    const user = db.prepare('SELECT lingshi FROM Users WHERE id=?').get(playerId);
    if ((user?.lingshi || 0) < lingshiCost) {
      return res.json({ success: false, message: `灵石不足，需要${lingshiCost}灵石` });
    }

    // 扣费
    db.prepare("UPDATE forge_materials SET quantity = quantity - ? WHERE player_id=? AND material_key='refine_stone'").run(stoneCost, playerId);
    if (lingshiCost > 0) db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id=?').run(lingshiCost, playerId);

    const roll = Math.random() * 100;
    const success = roll < successRate;

    if (success) {
      const newLevel = refineLevel + 1;
      const statKey = REFINE_STATS[refineLevel % REFINE_STATS.length];
      const statVal = 5 + refineLevel * 5;
      const currentStats = JSON.parse(equip.refine_stats || '{}');
      currentStats[statKey] = (currentStats[statKey] || 0) + statVal;

      db.prepare('UPDATE forge_equipment SET refine_level=?, refine_stats=? WHERE id=?').run(newLevel, JSON.stringify(currentStats), equipmentId);

      res.json({
        success: true,
        level: newLevel,
        newStat: { [statKey]: statVal },
        allStats: currentStats,
        message: `精炼成功！${statKey}+${statVal}（精炼${newLevel}级）`,
      });
    } else {
      res.json({
        success: false,
        level: refineLevel,
        message: `精炼失败（${successRate}%成功率），精炼等级不变`,
      });
    }
  } catch(e) {
    console.error('[equipment:refine]', e.message);
    res.json({ success: false, message: e.message });
  }
});

// ============================================================
// 传承相关 - 将强化等级传承给另一件装备
// ============================================================

// GET /api/equipment/transfer-preview - 传承预览
router.get('/transfer-preview', (req, res) => {
  const playerId = getPlayerId(req);
  const { sourceId, targetId } = req.query;
  if (!sourceId || !targetId) return res.json({ success: false, message: '请提供 sourceId 和 targetId' });

  try {
    const source = db.prepare('SELECT * FROM forge_equipment WHERE id=? AND player_id=?').get(parseInt(sourceId), playerId);
    const target = db.prepare('SELECT * FROM forge_equipment WHERE id=? AND player_id=?').get(parseInt(targetId), playerId);
    if (!source) return res.json({ success: false, message: '源装备不存在' });
    if (!target) return res.json({ success: false, message: '目标装备不存在' });

    res.json({
      success: true,
      source: { id: source.id, name: source.name, level: source.strengthen_level || 0, glow_effect: source.glow_effect },
      target: { id: target.id, name: target.name, level: target.strengthen_level || 0, glow_effect: target.glow_effect },
      cost: TRANSFER_GOLD_COST,
      note: '传承后源装备强化等级归零，目标装备获得全部强化属性和光效',
    });
  } catch(e) {
    console.error('[equipment:transfer-preview]', e.message);
    res.json({ success: false, message: e.message });
  }
});

// POST /api/equipment/transfer - 传承强化等级
router.post('/transfer', (req, res) => {
  const playerId = getPlayerId(req);
  const { sourceId, targetId } = req.body;
  if (!sourceId || !targetId) return res.json({ success: false, message: '请提供 sourceId 和 targetId' });
  if (sourceId === targetId) return res.json({ success: false, message: '源装备和目标装备不能相同' });

  try {
    const source = db.prepare('SELECT * FROM forge_equipment WHERE id=? AND player_id=?').get(parseInt(sourceId), playerId);
    const target = db.prepare('SELECT * FROM forge_equipment WHERE id=? AND player_id=?').get(parseInt(targetId), playerId);
    if (!source) return res.json({ success: false, message: '源装备不存在' });
    if (!target) return res.json({ success: false, message: '目标装备不存在' });

    const sourceLevel = source.strengthen_level || 0;
    if (sourceLevel === 0) return res.json({ success: false, message: '源装备强化等级为0，无需传承' });

    const user = db.prepare('SELECT lingshi FROM Users WHERE id=?').get(playerId);
    if ((user?.lingshi || 0) < TRANSFER_GOLD_COST) {
      return res.json({ success: false, message: `传承费用不足，需要${TRANSFER_GOLD_COST}灵石` });
    }

    db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id=?').run(TRANSFER_GOLD_COST, playerId);

    // 合并强化属性到目标
    const sourceBonus = JSON.parse(source.bonus_stats || '{}');
    const targetBonus = JSON.parse(target.bonus_stats || '{}');
    const mergedBonus = { ...targetBonus };
    for (const [k, v] of Object.entries(sourceBonus)) {
      mergedBonus[k] = (mergedBonus[k] || 0) + v;
    }
    const newTargetLevel = (target.strengthen_level || 0) + sourceLevel;
    const targetGlow = target.glow_effect || source.glow_effect;

    db.prepare('UPDATE forge_equipment SET strengthen_level=?, bonus_stats=?, glow_effect=? WHERE id=?').run(
      newTargetLevel, JSON.stringify(mergedBonus), targetGlow, targetId
    );

    // 源装备清零
    db.prepare('UPDATE forge_equipment SET strengthen_level=0, bonus_stats=? WHERE id=?').run(
      JSON.stringify({}), sourceId
    );

    res.json({
      success: true,
      message: `传承成功！目标装备强化等级：${target.strengthen_level||0} → ${newTargetLevel}`,
      newTargetLevel,
      mergedBonus,
    });
  } catch(e) {
    console.error('[equipment:transfer]', e.message);
    res.json({ success: false, message: e.message });
  }
});

module.exports = router;
