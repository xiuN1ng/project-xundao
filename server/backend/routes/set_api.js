/**
 * 套装进阶系统 API路由
 * P87-5: 神器炼制/套装进阶系统
 * 端点: /api/set/*
 */

const express = require('express');
const router = express.Router();
const path = require('path');

let setConfig;
let db;

function initDeps() {
  if (setConfig) return;
  try {
    setConfig = require('../../game/set_config');
  } catch (e) {
    setConfig = {
      getSetTypes: () => [],
      getSetBonus: () => null,
      calcSetBonusPreview: () => null,
      getAwakenRecipe: () => null
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
    CREATE TABLE IF NOT EXISTS player_set_progress_new (
      player_id INTEGER NOT NULL,
      set_type TEXT NOT NULL,
      pieces_owned TEXT DEFAULT '{}',
      quality TEXT DEFAULT 'mortal',
      quality_upgrade_count INTEGER DEFAULT 0,
      awaken_level INTEGER DEFAULT 0,
      enhance_level INTEGER DEFAULT 0,
      refine_level INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(player_id, set_type)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS player_set_pieces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      set_type TEXT NOT NULL,
      piece_id TEXT NOT NULL,
      quality TEXT DEFAULT 'mortal',
      enhance_level INTEGER DEFAULT 0,
      refine_level INTEGER DEFAULT 0,
      equipped INTEGER DEFAULT 0,
      obtained_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(player_id, set_type, piece_id)
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_psp_player ON player_set_progress_new(player_id)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_pspieces_player ON player_set_pieces(player_id)
  `);
}

function getPlayerId(req) {
  return parseInt(req.query.player_id || req.body?.player_id || 1);
}

// ============ 套装类型 API ============

// GET /api/set/types - 套装类型列表
router.get('/types', (req, res) => {
  initDeps();
  const types = setConfig.getSetTypes();
  res.json({ success: true, data: types });
});

// GET /api/set/player - 玩家套装信息
router.get('/player', (req, res) => {
  initDeps();
  const playerId = getPlayerId(req);

  if (!db) return res.json({ success: false, error: '数据库不可用' });

  try {
    const progress = db.prepare(`
      SELECT * FROM player_set_progress_new WHERE player_id = ?
    `).all(playerId);

    const pieces = db.prepare(`
      SELECT * FROM player_set_pieces WHERE player_id = ?
    `).all(playerId);

    // 按套装分组
    const bySet = {};
    const allSetTypes = setConfig.getSetTypes();

    for (const st of allSetTypes) {
      bySet[st.id] = {
        id: st.id,
        name: st.name,
        icon: st.icon,
        baseType: st.baseType,
        quality: 'mortal',
        piecesOwned: 0,
        totalPieces: st.pieceCount,
        enhanceLevel: 0,
        refineLevel: 0,
        awakenLevel: 0,
        setPieces: []
      };
    }

    for (const p of progress) {
      if (bySet[p.set_type]) {
        bySet[p.set_type].quality = p.quality;
        bySet[p.set_type].qualityUpgradeCount = p.quality_upgrade_count;
        bySet[p.set_type].awakenLevel = p.awaken_level;
        bySet[p.set_type].enhanceLevel = p.enhance_level;
        bySet[p.set_type].refineLevel = p.refine_level;
        bySet[p.set_type].piecesOwned = Object.keys(JSON.parse(p.pieces_owned || '{}')).length;
      }
    }

    for (const p of pieces) {
      if (bySet[p.set_type]) {
        bySet[p.set_type].setPieces.push({
          id: p.piece_id,
          quality: p.quality,
          enhanceLevel: p.enhance_level,
          refineLevel: p.refine_level,
          equipped: !!p.equipped
        });
        bySet[p.set_type].piecesOwned = bySet[p.set_type].setPieces.length;
      }
    }

    // 计算当前加成
    const setBonuses = {};
    for (const [setId, info] of Object.entries(bySet)) {
      const owned = info.piecesOwned;
      const quality = info.quality;
      const bonuses = {};

      for (const [pieces, bonus] of Object.entries(setConfig.SET_TYPES[setId]?.setBonus || {})) {
        if (parseInt(pieces) <= owned) {
          bonuses[pieces] = setConfig.getSetBonus(setId, parseInt(pieces), quality);
        }
      }

      setBonuses[setId] = bonuses;
    }

    res.json({
      success: true,
      data: {
        sets: Object.values(bySet),
        setBonuses,
        totalSets: allSetTypes.length
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/set/bonus - 套装属性加成预览
router.get('/bonus', (req, res) => {
  initDeps();
  const playerId = getPlayerId(req);
  const { setType } = req.query;

  if (!db) return res.json({ success: false, error: '数据库不可用' });

  if (!setType) {
    // 返回所有套装的预览
    const allSetTypes = setConfig.getSetTypes();
    const previews = {};

    for (const st of allSetTypes) {
      const pieces = db.prepare(`
        SELECT piece_id FROM player_set_pieces WHERE player_id = ? AND set_type = ?
      `).all(playerId, st.id);

      const ownedPieces = pieces.map(p => p.piece_id);
      const preview = setConfig.calcSetBonusPreview(st.id, ownedPieces);
      if (preview) previews[st.id] = preview;
    }

    return res.json({ success: true, data: previews });
  }

  // 指定套装的详细预览
  const pieces = db.prepare(`
    SELECT piece_id FROM player_set_pieces WHERE player_id = ? AND set_type = ?
  `).all(playerId, setType);

  const ownedPieces = pieces.map(p => p.piece_id);
  const preview = setConfig.calcSetBonusPreview(setType, ownedPieces);

  if (!preview) {
    return res.json({ success: false, error: '套装类型不存在' });
  }

  res.json({ success: true, data: preview });
});

// ============ 套装转换 ============

// POST /api/set/convert - 套装转换（凡品→指定套）
router.post('/convert', (req, res) => {
  initDeps();
  const playerId = getPlayerId(req);
  const { fromSetType, fromPieceId, toSetType } = req.body;

  if (!fromSetType || !fromPieceId || !toSetType) {
    return res.status(400).json({ success: false, error: '缺少必要参数' });
  }

  const toSet = setConfig.SET_TYPES[toSetType];
  if (!toSet) {
    return res.status(400).json({ success: false, error: '目标套装类型不存在' });
  }

  if (!db) return res.json({ success: false, error: '数据库不可用' });

  try {
    // 检查玩家是否有指定的套装部件
    const piece = db.prepare(`
      SELECT * FROM player_set_pieces WHERE player_id = ? AND set_type = ? AND piece_id = ?
    `).get(playerId, fromSetType, fromPieceId);

    if (!piece) {
      return res.json({ success: false, error: '该套装部件不存在' });
    }

    // 检查目标套装部件是否已拥有
    const targetPieceName = toSet.pieceNames[toSet.pieces[toSet.pieces.indexOf(fromPieceId)]];
    if (!targetPieceName) {
      return res.json({ success: false, error: '套装部件配置错误' });
    }

    // 转换消耗：50000灵石 + 转换石×1
    const convertCost = 50000;
    const player = db.prepare('SELECT lingshi FROM players WHERE id = ?').get(playerId);

    if (!player || player.lingshi < convertCost) {
      return res.json({ success: false, error: `灵石不足，需要${convertCost}灵石` });
    }

    // 扣除灵石
    db.prepare('UPDATE players SET lingshi = lingshi - ? WHERE id = ?').run(convertCost, playerId);

    // 删除原套装部件
    db.prepare(`
      DELETE FROM player_set_pieces WHERE player_id = ? AND set_type = ? AND piece_id = ?
    `).run(playerId, fromSetType, fromPieceId);

    // 创建新的套装部件
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO player_set_pieces (player_id, set_type, piece_id, quality, enhance_level, refine_level, equipped, obtained_at)
      VALUES (?, ?, ?, 'mortal', 0, 0, 0, ?)
    `).run(playerId, toSetType, fromPieceId, now);

    res.json({
      success: true,
      message: `成功将【${piece.piece_id}】转换为【${toSet.name}】套装部件！`,
      data: {
        originalSet: fromSetType,
        targetSet: toSetType,
        pieceId: fromPieceId,
        lingshiCost: convertCost
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============ 属性继承 ============

// POST /api/set/inherit - 属性继承（强化等级传承）
router.post('/inherit', (req, res) => {
  initDeps();
  const playerId = getPlayerId(req);
  const { fromPieceId, toPieceId, fromSetType, toSetType } = req.body;

  if (!fromPieceId || !toPieceId || !fromSetType || !toSetType) {
    return res.status(400).json({ success: false, error: '缺少必要参数' });
  }

  if (!db) return res.json({ success: false, error: '数据库不可用' });

  try {
    const fromPiece = db.prepare(`
      SELECT * FROM player_set_pieces WHERE player_id = ? AND set_type = ? AND piece_id = ?
    `).get(playerId, fromSetType, fromPieceId);

    if (!fromPiece) {
      return res.json({ success: false, error: '源装备不存在' });
    }

    const toPiece = db.prepare(`
      SELECT * FROM player_set_pieces WHERE player_id = ? AND set_type = ? AND piece_id = ?
    `).get(playerId, toSetType, toPieceId);

    if (!toPiece) {
      return res.json({ success: false, error: '目标装备不存在' });
    }

    const enhanceLevel = fromPiece.enhance_level;
    const refineLevel = fromPiece.refine_level;

    if (enhanceLevel === 0 && refineLevel === 0) {
      return res.json({ success: false, error: '源装备没有可继承的属性' });
    }

    // 继承消耗：灵石×强化等级×5000
    const inheritCost = Math.max(enhanceLevel, refineLevel) * 5000;
    const player = db.prepare('SELECT lingshi FROM players WHERE id = ?').get(playerId);

    if (!player || player.lingshi < inheritCost) {
      return res.json({ success: false, error: `灵石不足，需要${inheritCost}灵石` });
    }

    db.prepare('UPDATE players SET lingshi = lingshi - ? WHERE id = ?').run(inheritCost, playerId);

    // 继承属性
    db.prepare(`
      UPDATE player_set_pieces SET enhance_level = ?, refine_level = ? WHERE id = ?
    `).run(enhanceLevel, refineLevel, toPiece.id);

    // 源装备属性清零
    db.prepare(`
      UPDATE player_set_pieces SET enhance_level = 0, refine_level = 0 WHERE id = ?
    `).run(fromPiece.id);

    res.json({
      success: true,
      message: `成功继承强化等级${enhanceLevel}、精炼等级${refineLevel}！`,
      data: {
        inherited: { enhanceLevel, refineLevel },
        cost: inheritCost,
        fromPieceId: fromPieceId,
        toPieceId: toPieceId
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============ 套装觉醒 ============

// POST /api/set/awaken - 套装觉醒（升品）
router.post('/awaken', (req, res) => {
  initDeps();
  const playerId = getPlayerId(req);
  const { setType } = req.body;

  if (!setType) {
    return res.status(400).json({ success: false, error: '缺少setType参数' });
  }

  if (!db) return res.json({ success: false, error: '数据库不可用' });

  try {
    const progress = db.prepare(`
      SELECT * FROM player_set_progress_new WHERE player_id = ? AND set_type = ?
    `).get(playerId, setType);

    const currentQuality = progress?.quality || 'mortal';
    const qualities = ['mortal', 'refined', 'excellent', 'supreme', 'mythic'];
    const currentIdx = qualities.indexOf(currentQuality);

    if (currentIdx >= qualities.length - 1) {
      return res.json({ success: false, error: '已达到最高品质，无法继续觉醒' });
    }

    const nextQuality = qualities[currentIdx + 1];
    const recipe = setConfig.getAwakenRecipe(currentQuality, nextQuality);

    if (!recipe) {
      return res.json({ success: false, error: '觉醒路径不存在' });
    }

    // 检查灵石
    const player = db.prepare('SELECT lingshi FROM players WHERE id = ?').get(playerId);
    if (!player || player.lingshi < recipe.lingshi) {
      return res.json({ success: false, error: `灵石不足，需要${recipe.lingshi}灵石` });
    }

    // 检查材料
    for (const mat of recipe.materials) {
      const matRow = db.prepare(`
        SELECT count FROM player_materials WHERE player_id = ? AND material_id = ?
      `).get(playerId, mat.id);
      const matCount = matRow ? matRow.count : 0;
      if (matCount < mat.count) {
        return res.json({ success: false, error: `材料不足：需要${mat.count}个${mat.id}，当前${matCount}个` });
      }
    }

    // 扣除消耗
    db.prepare('UPDATE players SET lingshi = lingshi - ? WHERE id = ?').run(recipe.lingshi, playerId);
    for (const mat of recipe.materials) {
      db.prepare(`
        UPDATE player_materials SET count = count - ? WHERE player_id = ? AND material_id = ?
      `).run(mat.count, playerId, mat.id);
    }

    // 更新品质
    const qualityUpgradeCount = (progress?.quality_upgrade_count || 0) + 1;
    const awakenLevel = (progress?.awaken_level || 0) + 1;

    if (progress) {
      db.prepare(`
        UPDATE player_set_progress_new SET quality = ?, quality_upgrade_count = ?, awaken_level = ?, updated_at = datetime('now') WHERE player_id = ? AND set_type = ?
      `).run(nextQuality, qualityUpgradeCount, awakenLevel, playerId, setType);
    } else {
      db.prepare(`
        INSERT INTO player_set_progress_new (player_id, set_type, quality, quality_upgrade_count, awaken_level, pieces_owned)
        VALUES (?, ?, ?, ?, ?, '{}')
      `).run(playerId, setType, nextQuality, qualityUpgradeCount, awakenLevel);
    }

    const setInfo = setConfig.SET_TYPES[setType];
    res.json({
      success: true,
      message: `【${setInfo?.name || setType}】觉醒成功，品质提升至【${setConfig.SET_QUALITY[nextQuality].name}】！`,
      data: {
        setType,
        setName: setInfo?.name,
        previousQuality: currentQuality,
        newQuality: nextQuality,
        qualityName: setConfig.SET_QUALITY[nextQuality].name,
        awakenLevel,
        lingshiCost: recipe.lingshi
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============ 套装部件获取（GM/奖励）============

// POST /api/set/obtain - 获取套装部件
router.post('/obtain', (req, res) => {
  initDeps();
  const playerId = getPlayerId(req);
  const { setType, pieceId } = req.body;

  if (!setType) {
    return res.status(400).json({ success: false, error: '缺少setType参数' });
  }

  const setInfo = setConfig.SET_TYPES[setType];
  if (!setInfo) {
    return res.status(400).json({ success: false, error: '套装类型不存在' });
  }

  if (!db) return res.json({ success: false, error: '数据库不可用' });

  try {
    const pieceIdentifier = pieceId || setInfo.pieces[0];

    // 检查是否已有
    const existing = db.prepare(`
      SELECT * FROM player_set_pieces WHERE player_id = ? AND set_type = ? AND piece_id = ?
    `).get(playerId, setType, pieceIdentifier);

    if (existing) {
      return res.json({ success: false, error: '已拥有该套装部件' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO player_set_pieces (player_id, set_type, piece_id, quality, enhance_level, refine_level, equipped, obtained_at)
      VALUES (?, ?, ?, 'mortal', 0, 0, 0, ?)
    `).run(playerId, setType, pieceIdentifier, now);

    // 更新进度
    const progress = db.prepare(`
      SELECT * FROM player_set_progress_new WHERE player_id = ? AND set_type = ?
    `).get(playerId, setType);

    const owned = JSON.parse(progress?.pieces_owned || '{}');
    owned[pieceIdentifier] = true;

    if (progress) {
      db.prepare(`UPDATE player_set_progress_new SET pieces_owned = ?, updated_at = datetime('now') WHERE player_id = ? AND set_type = ?`).run(JSON.stringify(owned), playerId, setType);
    } else {
      db.prepare(`INSERT INTO player_set_progress_new (player_id, set_type, pieces_owned, quality) VALUES (?, ?, ?, 'mortal')`).run(playerId, setType, JSON.stringify(owned));
    }

    res.json({
      success: true,
      message: `获得【${setInfo.name}·${setInfo.pieceNames[pieceIdentifier] || pieceIdentifier}】！`,
      data: {
        setType,
        setName: setInfo.name,
        pieceId: pieceIdentifier,
        pieceName: setInfo.pieceNames[pieceIdentifier] || pieceIdentifier
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/set/pieces - 获取玩家套装部件
router.get('/pieces', (req, res) => {
  initDeps();
  const playerId = getPlayerId(req);

  if (!db) return res.json({ success: false, error: '数据库不可用' });

  try {
    const pieces = db.prepare(`
      SELECT psp.*, pp.quality as set_quality_name
      FROM player_set_pieces psp
      LEFT JOIN player_set_progress_new pp ON psp.player_id = pp.player_id AND psp.set_type = pp.set_type
      WHERE psp.player_id = ?
    `).all(playerId);

    const enriched = pieces.map(p => {
      const setInfo = setConfig.SET_TYPES[p.set_type];
      return {
        ...p,
        setName: setInfo?.name,
        pieceName: setInfo?.pieceNames[p.piece_id] || p.piece_id
      };
    });

    res.json({ success: true, data: enriched, count: pieces.length });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
