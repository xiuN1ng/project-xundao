/**
 * 神器共鸣与觉醒 API路由
 * P52-1: 神器共鸣 + 觉醒技能 + 词缀系统
 * 端点: /api/artifact-resonance/*
 */

const express = require('express');
const router = express.Router();
const path = require('path');

const ARTIFACT_RESONANCE_PATH = path.join(__dirname, '..', '..', 'game', 'artifact_resonance.js');
let resonance;
try {
  resonance = require(ARTIFACT_RESONANCE_PATH);
} catch (e) {
  console.log('[artifact_resonance_api] 加载失败:', e.message);
  resonance = require('./artifact_resonance_fallback');
}

const DB_PATH = path.join(__dirname, '..', 'data', 'game.db');
let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
} catch (e) {
  db = { prepare: () => ({ get: () => null, all: () => [], run: () => {} }) };
}

function getPlayerId(req) {
  return req.query.player_id || req.body?.player_id || 1;
}

// ============ 共鸣系统 ============

// GET /api/artifact-resonance/equipped - 获取已装备神器的共鸣效果
router.get('/equipped', (req, res) => {
  const playerId = getPlayerId(req);
  
  // 获取已装备神器
  let equipped = [];
  try {
    equipped = db.prepare(`
      SELECT pa.*, a.type, a.quality, a.name, a.base_atk, a.base_def, a.awaken_level, a.awaken_exp, a.affixes
      FROM player_equipment pe
      JOIN player_artifacts pa ON pe.item_id = pa.id
      JOIN artifacts a ON pa.artifact_id = a.id
      WHERE pe.player_id = ? AND pe.equipped = 1 AND pe.slot IN ('weapon','armor','accessory','companion')
    `).all(playerId);
  } catch (e) {
    // fallback: 尝试直接从player_artifacts查
    try {
      equipped = db.prepare(`SELECT * FROM player_artifacts WHERE player_id = ? AND is_equipped = 1`).all(playerId);
    } catch (e2) {
      equipped = [];
    }
  }

  const bonus = resonance.calculateResonance(equipped);
  res.json({ code: 0, data: { equipped: equipped.length, active_sets: bonus.active_sets, total_bonus: bonus.total_bonus } });
});

// ============ 觉醒系统 ============

// GET /api/artifact-resonance/awakening/:artifactId - 获取神器觉醒状态
router.get('/awakening/:artifactId', (req, res) => {
  const artifactId = parseInt(req.params.artifactId);
  const playerId = getPlayerId(req);

  let artifact = null;
  try {
    artifact = db.prepare(`SELECT * FROM player_artifacts WHERE id = ? AND player_id = ?`).get(artifactId, playerId);
  } catch (e) {
    artifact = null;
  }

  if (!artifact) {
    return res.json({ code: 404, message: '神器不存在' });
  }

  const status = resonance.getAwakeningStatus(artifact);
  res.json({ code: 0, data: status });
});

// POST /api/artifact-resonance/awakening/:artifactId/up - 提升觉醒等级
router.post('/awakening/:artifactId/up', (req, res) => {
  const artifactId = parseInt(req.params.artifactId);
  const playerId = getPlayerId(req);
  const { materials } = req.body; // { awakan_dust: 10, spirit_essence: 5 }

  let artifact = null;
  try {
    artifact = db.prepare(`SELECT * FROM player_artifacts WHERE id = ? AND player_id = ?`).get(artifactId, playerId);
  } catch (e) {
    artifact = null;
  }

  if (!artifact) {
    return res.json({ code: 404, message: '神器不存在' });
  }

  const awakenData = resonance.ARTIFACT_RESONANCE.awakening_skills[artifact.quality];
  if (!awakenData) {
    return res.json({ code: 400, message: '该品质神器不支持觉醒' });
  }

  const currentLevel = artifact.awaken_level || 0;
  if (currentLevel >= awakenData.max_awaken_level) {
    return res.json({ code: 400, message: '已达最大觉醒等级' });
  }

  // 验证材料
  if (materials) {
    // 检查玩家背包是否有足够材料
    for (const [mat, need] of Object.entries(awakenData.awakening_materials)) {
      const has = db.prepare(`SELECT COUNT(*) as cnt FROM player_items WHERE player_id = ? AND item_id = ?`).get(playerId, mat)?.cnt || 0;
      if (has < need) {
        return res.json({ code: 400, message: `材料不足: ${mat}` });
      }
    }
    // 扣除材料
    for (const [mat, need] of Object.entries(awakenData.awakening_materials)) {
      db.prepare(`UPDATE player_items SET count = count - ? WHERE player_id = ? AND item_id = ?`).run(need, playerId, mat);
    }
  }

  // 添加觉醒经验
  const expGain = awakenData.exp_per_awaken;
  const updated = resonance.addAwakeningExp(artifact, expGain);

  // 更新数据库
  try {
    db.prepare(`UPDATE player_artifacts SET awaken_level = ?, awaken_exp = ? WHERE id = ?`).run(
      updated.awaken_level || 0, updated.awaken_exp || 0, artifactId
    );
  } catch (e) {
    // 表可能没有这些字段，忽略
  }

  const newStatus = resonance.getAwakeningStatus(updated);
  res.json({
    code: 0,
    message: updated.new_awaken_skills ? `觉醒升级！解锁「${updated.new_awaken_skills[0].name}」` : '觉醒经验+1',
    data: newStatus
  });
});

// ============ 词缀系统 ============

// GET /api/artifact-resonance/affix/generate - 生成随机词缀（用于展示/刷新）
router.get('/affix/generate', (req, res) => {
  const quality = req.query.quality || 'spirit';
  const type = req.query.type || 'weapon';
  
  const affixes = resonance.generateAffixes(quality, type);
  res.json({ code: 0, data: { affixes, quality, type } });
});

// POST /api/artifact-resonance/affix/apply - 使用道具刷新词缀
router.post('/affix/apply', (req, res) => {
  const playerId = getPlayerId(req);
  const { artifact_id, use_item } = req.body; // use_item: 'affix_scroll' 或灵石刷新

  // 检查道具
  if (use_item) {
    const has = db.prepare(`SELECT COUNT(*) as cnt FROM player_items WHERE player_id = ? AND item_id = ?`).get(playerId, use_item)?.cnt || 0;
    if (has < 1) {
      return res.json({ code: 400, message: '刷新道具不足' });
    }
    db.prepare(`UPDATE player_items SET count = count - 1 WHERE player_id = ? AND item_id = ?`).run(playerId, use_item);
  } else {
    // 灵石刷新（500灵石）
    const stones = db.prepare(`SELECT stones FROM players WHERE id = ?`).get(playerId)?.stones || 0;
    if (stones < 500) {
      return res.json({ code: 400, message: '灵石不足（需要500）' });
    }
    db.prepare(`UPDATE players SET stones = stones - 500 WHERE id = ?`).run(playerId);
  }

  // 获取神器品质
  let artifact = null;
  try {
    artifact = db.prepare(`SELECT * FROM player_artifacts WHERE id = ? AND player_id = ?`).get(req.body.artifact_id, playerId);
  } catch (e) {
    artifact = { quality: 'spirit' };
  }

  const quality = artifact?.quality || 'spirit';
  const type = artifact?.type || 'weapon';
  const newAffixes = resonance.generateAffixes(quality, type);

  // 更新数据库
  try {
    db.prepare(`UPDATE player_artifacts SET affixes = ? WHERE id = ?`).run(JSON.stringify(newAffixes), req.body.artifact_id);
  } catch (e) {}

  res.json({ code: 0, message: '词缀刷新成功', data: { affixes: newAffixes } });
});

// GET /api/artifact-resonance/stats - 获取神器总战斗力
router.get('/stats', (req, res) => {
  const playerId = getPlayerId(req);

  let artifacts = [];
  try {
    artifacts = db.prepare(`SELECT * FROM player_artifacts WHERE player_id = ?`).all(playerId);
  } catch (e) {
    artifacts = [];
  }

  const totalCP = artifacts.reduce((sum, a) => sum + resonance.getArtifactCombatPower(a), 0);
  const resonanceBonus = resonance.calculateResonance(artifacts.filter(a => a.is_equipped));

  res.json({
    code: 0,
    data: {
      total_combat_power: totalCP,
      resonance_sets: resonanceBonus.active_sets.length,
      resonance_bonus: resonanceBonus.total_bonus
    }
  });
});

module.exports = router;
