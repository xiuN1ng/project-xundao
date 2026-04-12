/**
 * 神器系统 API路由
 * P87-5: 神器炼制/套装进阶系统
 * 端点: /api/artifact/*
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

let artifactConfig;
let db;

function initDeps() {
  if (artifactConfig) return;
  try {
    artifactConfig = require('../../game/artifact_config');
  } catch (e) {
    artifactConfig = {
      getArtifactTypes: () => [],
      getArtifactList: () => [],
      getArtifactById: () => null,
      calcArtifactStats: () => null,
      calcResonance: () => ({ activeResonances: [], totalBonus: {} }),
      FORGE_RECIPES: {}
    };
  }

  const DB_PATH = path.join(__dirname, '..', '..', 'data', 'game.db');
  try {
    const Database = require('better-sqlite3');
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initTables();
  } catch (e) {
    db = null;
  }
}

function initTables() {
  if (!db) return;
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_artifacts_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      artifact_type TEXT NOT NULL,
      name TEXT NOT NULL,
      quality TEXT NOT NULL,
      level INT DEFAULT 1,
      exp INT DEFAULT 0,
      is_equipped INTEGER DEFAULT 0,
      skill_active TEXT,
      skill_passive TEXT,
      resonance_level INT DEFAULT 0,
      obtained_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_artifact_fragments (
      player_id INTEGER NOT NULL,
      artifact_type TEXT NOT NULL,
      count INTEGER DEFAULT 0,
      PRIMARY KEY(player_id, artifact_type)
    )
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_pan_player ON player_artifacts_new(player_id)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_paf_player ON player_artifact_fragments(player_id)
  `);
}

function getPlayerId(req) {
  return parseInt(req.query.player_id || req.body?.player_id || 1);
}

// ============ 神器类型 API ============

// GET /api/artifact/types - 神器类型列表
router.get('/types', (req, res) => {
  initDeps();
  const types = artifactConfig.getArtifactTypes();
  const allArtifacts = artifactConfig.getArtifactList();
  res.json({
    success: true,
    data: {
      types,
      artifacts: allArtifacts
    }
  });
});

// GET /api/artifact/list - 玩家神器列表
router.get('/list', (req, res) => {
  initDeps();
  const playerId = getPlayerId(req);

  if (!db) {
    return res.json({ success: false, error: '数据库不可用' });
  }

  try {
    const artifacts = db.prepare(`
      SELECT * FROM player_artifacts_new WHERE player_id = ? ORDER BY level DESC, quality DESC
    `).all(playerId);

    const enriched = artifacts.map(a => {
      const cfg = artifactConfig.getArtifactById(a.artifact_type);
      const stats = cfg ? artifactConfig.calcArtifactStats(a.artifact_type, a.level) : null;
      return {
        ...a,
        type: cfg?.type,
        qualityName: cfg?.qualityName,
        baseStats: cfg?.baseStats,
        currentStats: stats,
        skillActive: cfg?.skillActive,
        skillPassive: cfg?.skillPassive
      };
    });

    res.json({ success: true, data: enriched, count: artifacts.length });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/artifact/equipped - 已装备神器
router.get('/equipped', (req, res) => {
  initDeps();
  const playerId = getPlayerId(req);

  if (!db) return res.json({ success: false, error: '数据库不可用' });

  try {
    const artifacts = db.prepare(`
      SELECT * FROM player_artifacts_new WHERE player_id = ? AND is_equipped = 1
    `).all(playerId);

    const enriched = artifacts.map(a => {
      const cfg = artifactConfig.getArtifactById(a.artifact_type);
      const stats = cfg ? artifactConfig.calcArtifactStats(a.artifact_type, a.level) : null;
      return {
        ...a,
        type: cfg?.type,
        qualityName: cfg?.qualityName,
        currentStats: stats,
        skillActive: cfg?.skillActive,
        skillPassive: cfg?.skillPassive
      };
    });

    res.json({ success: true, data: enriched, count: artifacts.length });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/artifact/resonance - 神器共鸣效果
router.get('/resonance', (req, res) => {
  initDeps();
  const playerId = getPlayerId(req);

  if (!db) return res.json({ success: false, error: '数据库不可用' });

  try {
    const artifacts = db.prepare(`
      SELECT * FROM player_artifacts_new WHERE player_id = ?
    `).all(playerId);

    const resonance = artifactConfig.calcResonance(artifacts);

    // 按类型分组展示
    const byType = {};
    for (const a of artifacts) {
      const cfg = artifactConfig.getArtifactById(a.artifact_type);
      if (!cfg) continue;
      const type = cfg.resonanceType;
      if (!byType[type]) byType[type] = [];
      byType[type].push({
        name: a.name,
        level: a.level,
        quality: a.quality
      });
    }

    res.json({
      success: true,
      data: {
        activeResonances: resonance.activeResonances,
        totalBonus: resonance.totalBonus,
        byType
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============ 神器炼制 ============

// POST /api/artifact/forge - 炼制神器
router.post('/forge', (req, res) => {
  initDeps();
  const playerId = getPlayerId(req);
  const { artifactType } = req.body;

  if (!artifactType) {
    return res.status(400).json({ success: false, error: '缺少artifactType参数' });
  }

  const cfg = artifactConfig.getArtifactById(artifactType);
  if (!cfg) {
    return res.status(400).json({ success: false, error: '未知的神器类型' });
  }

  if (!db) return res.json({ success: false, error: '数据库不可用' });

  try {
    // 检查碎片数量
    const fragmentRow = db.prepare(`
      SELECT count FROM player_artifact_fragments WHERE player_id = ? AND artifact_type = ?
    `).get(playerId, artifactType);
    const fragmentCount = fragmentRow ? fragmentRow.count : 0;

    if (fragmentCount < cfg.forgeFragmentCount) {
      return res.json({
        success: false,
        error: `碎片不足，需要${cfg.forgeFragmentCount}个，当前${fragmentCount}个`
      });
    }

    // 检查玩家灵石
    const player = db.prepare('SELECT lingshi FROM players WHERE id = ?').get(playerId);
    if (!player || player.lingshi < cfg.forgeLingshiCost) {
      return res.json({
        success: false,
        error: `灵石不足，需要${cfg.forgeLingshiCost}灵石`
      });
    }

    // 扣除碎片和灵石
    db.prepare(`
      UPDATE player_artifact_fragments SET count = count - ? WHERE player_id = ? AND artifact_type = ?
    `).run(cfg.forgeFragmentCount, playerId, artifactType);

    db.prepare('UPDATE players SET lingshi = lingshi - ? WHERE id = ?').run(cfg.forgeLingshiCost, playerId);

    // 创建神器
    const now = new Date().toISOString();
    const result = db.prepare(`
      INSERT INTO player_artifacts_new (player_id, artifact_type, name, quality, level, exp, is_equipped, skill_active, skill_passive, resonance_level, obtained_at)
      VALUES (?, ?, ?, ?, 1, 0, 0, ?, ?, 0, ?)
    `).run(playerId, artifactType, cfg.name, cfg.quality, cfg.skillActive?.id || null, cfg.skillPassive?.id || null, now);

    const newArtifact = db.prepare('SELECT * FROM player_artifacts_new WHERE id = ?').get(result.lastInsertRowid);

    res.json({
      success: true,
      message: `成功炼制【${cfg.name}】！`,
      data: {
        artifact: {
          ...newArtifact,
          type: cfg.type,
          qualityName: cfg.qualityName,
          skillActive: cfg.skillActive,
          skillPassive: cfg.skillPassive
        },
        fragmentUsed: cfg.forgeFragmentCount,
        lingshiUsed: cfg.forgeLingshiCost,
        remainingFragments: fragmentCount - cfg.forgeFragmentCount
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============ 神器装备/卸下 ============

// POST /api/artifact/equip/:artifactId - 装备神器
router.post('/equip/:artifactId', (req, res) => {
  initDeps();
  const playerId = getPlayerId(req);
  const artifactId = parseInt(req.params.artifactId);

  if (!db) return res.json({ success: false, error: '数据库不可用' });

  try {
    const artifact = db.prepare('SELECT * FROM player_artifacts_new WHERE id = ? AND player_id = ?').get(artifactId, playerId);
    if (!artifact) {
      return res.json({ success: false, error: '神器不存在' });
    }

    // 检查是否已装备
    if (artifact.is_equipped) {
      return res.json({ success: false, error: '该神器已在装备栏中' });
    }

    // 装备神器（最多同时装备3把）
    const equippedCount = db.prepare('SELECT COUNT(*) as count FROM player_artifacts_new WHERE player_id = ? AND is_equipped = 1').get(playerId);
    if (equippedCount.count >= 3) {
      return res.json({ success: false, error: '最多同时装备3把神器，请先卸下其他神器' });
    }

    db.prepare('UPDATE player_artifacts_new SET is_equipped = 1 WHERE id = ?').run(artifactId);

    const cfg = artifactConfig.getArtifactById(artifact.artifact_type);
    res.json({
      success: true,
      message: `成功装备【${artifact.name}】！`,
      data: {
        artifact: {
          ...artifact,
          is_equipped: 1,
          type: cfg?.type,
          skillActive: cfg?.skillActive
        },
        equippedCount: equippedCount.count + 1,
        maxEquipped: 3
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/artifact/unequip/:artifactId - 卸下神器
router.post('/unequip/:artifactId', (req, res) => {
  initDeps();
  const playerId = getPlayerId(req);
  const artifactId = parseInt(req.params.artifactId);

  if (!db) return res.json({ success: false, error: '数据库不可用' });

  try {
    const artifact = db.prepare('SELECT * FROM player_artifacts_new WHERE id = ? AND player_id = ?').get(artifactId, playerId);
    if (!artifact) {
      return res.json({ success: false, error: '神器不存在' });
    }

    if (!artifact.is_equipped) {
      return res.json({ success: false, error: '该神器未在装备栏中' });
    }

    db.prepare('UPDATE player_artifacts_new SET is_equipped = 0 WHERE id = ?').run(artifactId);

    res.json({
      success: true,
      message: `已卸下【${artifact.name}】`,
      data: { artifact: { ...artifact, is_equipped: 0 } }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============ 神器升级 ============

// POST /api/artifact/upgrade/:artifactId - 升级神器
router.post('/upgrade/:artifactId', (req, res) => {
  initDeps();
  const playerId = getPlayerId(req);
  const artifactId = parseInt(req.params.artifactId);

  if (!db) return res.json({ success: false, error: '数据库不可用' });

  try {
    const artifact = db.prepare('SELECT * FROM player_artifacts_new WHERE id = ? AND player_id = ?').get(artifactId, playerId);
    if (!artifact) {
      return res.json({ success: false, error: '神器不存在' });
    }

    const cfg = artifactConfig.getArtifactById(artifact.artifact_type);
    if (!cfg) {
      return res.json({ success: false, error: '神器配置不存在' });
    }

    const currentLevel = artifact.level;
    if (currentLevel >= cfg.levelRange[1]) {
      return res.json({ success: false, error: `已达最高等级${cfg.levelRange[1]}级` });
    }

    // 升级消耗：每级需要 (level * 10000) 灵石
    const upgradeCost = currentLevel * 10000;
    const player = db.prepare('SELECT lingshi FROM players WHERE id = ?').get(playerId);

    if (!player || player.lingshi < upgradeCost) {
      return res.json({ success: false, error: `灵石不足，需要${upgradeCost}灵石` });
    }

    // 扣除灵石
    db.prepare('UPDATE players SET lingshi = lingshi - ? WHERE id = ?').run(upgradeCost, playerId);

    // 更新等级
    db.prepare('UPDATE player_artifacts_new SET level = level + 1, exp = 0 WHERE id = ?').run(artifactId);

    const newLevel = currentLevel + 1;
    const newStats = artifactConfig.calcArtifactStats(artifact.artifact_type, newLevel);

    res.json({
      success: true,
      message: `【${artifact.name}】升级至${newLevel}级！`,
      data: {
        artifact: {
          ...artifact,
          level: newLevel,
          currentStats: newStats
        },
        upgradeCost,
        newLevel,
        newStats
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============ 神器获取（GM/活动直接发放）============

// POST /api/artifact/obtain - 直接获取神器
router.post('/obtain', (req, res) => {
  initDeps();
  const playerId = getPlayerId(req);
  const { artifactType } = req.body;

  if (!artifactType) {
    return res.status(400).json({ success: false, error: '缺少artifactType参数' });
  }

  const cfg = artifactConfig.getArtifactById(artifactType);
  if (!cfg) {
    return res.status(400).json({ success: false, error: '未知的神器类型' });
  }

  if (!db) return res.json({ success: false, error: '数据库不可用' });

  try {
    const now = new Date().toISOString();
    const result = db.prepare(`
      INSERT INTO player_artifacts_new (player_id, artifact_type, name, quality, level, exp, is_equipped, skill_active, skill_passive, resonance_level, obtained_at)
      VALUES (?, ?, ?, ?, 1, 0, 0, ?, ?, 0, ?)
    `).run(playerId, artifactType, cfg.name, cfg.quality, cfg.skillActive?.id || null, cfg.skillPassive?.id || null, now);

    const newArtifact = db.prepare('SELECT * FROM player_artifacts_new WHERE id = ?').get(result.lastInsertRowid);

    res.json({
      success: true,
      message: `获得【${cfg.name}】！`,
      data: {
        artifact: {
          ...newArtifact,
          type: cfg.type,
          qualityName: cfg.qualityName,
          skillActive: cfg.skillActive,
          skillPassive: cfg.skillPassive
        }
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============ 神器碎片 API ============

// GET /api/artifact/fragments - 碎片库存
router.get('/fragments', (req, res) => {
  initDeps();
  const playerId = getPlayerId(req);

  if (!db) return res.json({ success: false, error: '数据库不可用' });

  try {
    const fragments = db.prepare(`
      SELECT * FROM player_artifact_fragments WHERE player_id = ? AND count > 0
    `).all(playerId);

    const enriched = fragments.map(f => {
      const cfg = artifactConfig.getArtifactById(f.artifact_type);
      return {
        artifact_type: f.artifact_type,
        artifact_name: cfg?.name || f.artifact_type,
        quality: cfg?.quality,
        qualityName: cfg?.qualityName,
        count: f.count,
        requiredForForge: cfg?.forgeFragmentCount || 0
      };
    });

    res.json({ success: true, data: enriched, count: fragments.length });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/artifact/recipes - 炼制配方
router.get('/recipes', (req, res) => {
  initDeps();
  const playerId = getPlayerId(req);

  const recipes = Object.entries(artifactConfig.FORGE_RECIPES || {}).map(([id, r]) => {
    const cfg = artifactConfig.getArtifactById(id);
    let fragmentCount = 0;
    if (db) {
      const row = db.prepare('SELECT count FROM player_artifact_fragments WHERE player_id = ? AND artifact_type = ?').get(playerId, id);
      fragmentCount = row ? row.count : 0;
    }
    return {
      ...r,
      fragmentName: `${cfg?.name || id}碎片`,
      currentFragments: fragmentCount,
      canForge: fragmentCount >= r.fragmentCount
    };
  });

  res.json({ success: true, data: recipes });
});

// POST /api/artifact/fragments/add - 增加碎片（GM/奖励）
router.post('/fragments/add', (req, res) => {
  initDeps();
  const playerId = getPlayerId(req);
  const { artifactType, count } = req.body;

  if (!artifactType || !count || count <= 0) {
    return res.status(400).json({ success: false, error: '参数错误' });
  }

  const cfg = artifactConfig.getArtifactById(artifactType);
  if (!cfg) {
    return res.status(400).json({ success: false, error: '未知的神器类型' });
  }

  if (!db) return res.json({ success: false, error: '数据库不可用' });

  try {
    db.prepare(`
      INSERT INTO player_artifact_fragments (player_id, artifact_type, count)
      VALUES (?, ?, ?)
      ON CONFLICT(player_id, artifact_type) DO UPDATE SET count = count + ?
    `).run(playerId, artifactType, count, count);

    const row = db.prepare('SELECT count FROM player_artifact_fragments WHERE player_id = ? AND artifact_type = ?').get(playerId, artifactType);

    res.json({
      success: true,
      message: `获得${count}个【${cfg.name}碎片】！`,
      data: {
        artifact_type: artifactType,
        artifact_name: cfg.name,
        added: count,
        total: row.count
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
