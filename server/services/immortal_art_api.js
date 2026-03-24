/**
 * 仙术系统 API (immortal_art_api.js)
 * 仙术学习/升级/战斗应用
 */

const express = require('express');
const router = express.Router();

let artStorage, db;

function loadDeps() {
  if (!artStorage) {
    try {
      artStorage = require('./immortal_art_storage');
      artStorage.initArtTables();
    } catch (e) {
      console.error('加载immortal_art_storage失败:', e.message);
    }
  }
  if (!db) {
    try {
      const server = require('../../server');
      db = server.db;
    } catch (e) {
      const Database = require('better-sqlite3');
      const path = require('path');
      const dbPath = path.join(__dirname, '..', 'data', 'game.db');
      db = new Database(dbPath);
    }
  }
}

// ============================================================
// 配置 & 模板
// ============================================================

// 获取仙术模板库
router.get('/templates', (req, res) => {
  loadDeps();
  res.json({
    success: true,
    templates: artStorage.ART_TEMPLATES,
    types: artStorage.ART_TYPES,
    qualities: artStorage.ART_QUALITIES,
    realmLevels: artStorage.REALM_ART_LEVEL,
  });
});

// 获取仙术分类
router.get('/categories', (req, res) => {
  loadDeps();
  res.json({ success: true, categories: artStorage.getArtCategories() });
});

// ============================================================
// 玩家仙术
// ============================================================

// 获取玩家所有仙术
router.get('/my/:playerId', (req, res) => {
  loadDeps();
  const playerId = parseInt(req.params.playerId);
  const arts = artStorage.getPlayerArts(playerId);
  res.json({ success: true, arts });
});

// 获取已装备仙术
router.get('/equipped/:playerId', (req, res) => {
  loadDeps();
  const playerId = parseInt(req.params.playerId);
  const arts = artStorage.getEquippedArts(playerId);
  res.json({ success: true, arts });
});

// 获取可学习仙术
router.get('/available/:playerId', (req, res) => {
  loadDeps();
  const playerId = parseInt(req.params.playerId);

  const player = db.prepare('SELECT realm_level, level FROM player WHERE id = ?').get(playerId);
  if (!player) return res.json({ success: false, message: '玩家不存在' });

  const arts = artStorage.getAvailableArts(player.realm_level || 0, player.level || 1, playerId);
  res.json({ success: true, arts });
});

// ============================================================
// 学习 & 升级
// ============================================================

// 学习仙术
router.post('/learn', (req, res) => {
  loadDeps();
  const { playerId, artId } = req.body;
  if (!playerId || !artId) return res.status(400).json({ success: false, message: '缺少参数' });

  const player = db.prepare('SELECT realm_level, level FROM player WHERE id = ?').get(playerId);
  if (!player) return res.json({ success: false, message: '玩家不存在' });

  const result = artStorage.learnArt(playerId, artId, player.realm_level || 0, player.level || 1);
  res.json(result);
});

// 升级仙术（灵石）
router.post('/upgrade', (req, res) => {
  loadDeps();
  const { playerId, artId } = req.body;
  if (!playerId || !artId) return res.status(400).json({ success: false, message: '缺少参数' });

  const result = artStorage.upgradeArt(playerId, artId);
  res.json(result);
});

// ============================================================
// 装备
// ============================================================

// 装备/卸下仙术
router.post('/equip', (req, res) => {
  loadDeps();
  const { playerId, artId, equipped } = req.body;
  if (!playerId || !artId) return res.status(400).json({ success: false, message: '缺少参数' });

  const result = artStorage.equipArt(playerId, artId, !!equipped);
  res.json(result);
});

// ============================================================
// 战斗应用
// ============================================================

// 计算仙术伤害（用于战斗系统调用）
router.post('/damage', (req, res) => {
  loadDeps();
  const { artId, artLevel, caster, target } = req.body;
  if (!artId || !caster) return res.status(400).json({ success: false, message: '缺少参数' });

  const art = artStorage.ART_TEMPLATES[artId];
  if (!art) return res.json({ success: false, message: '仙术不存在' });

  const result = artStorage.calcArtDamage(artId, artLevel || 1, caster, target);
  res.json({ success: true, ...result });
});

// 使用仙术后增加熟练度
router.post('/use', (req, res) => {
  loadDeps();
  const { playerId, artId } = req.body;
  if (!playerId || !artId) return res.status(400).json({ success: false, message: '缺少参数' });

  const art = artStorage.ART_TEMPLATES[artId];
  if (!art) return res.json({ success: false, message: '仙术不存在' });

  // 主动仙术才能增加熟练度
  if (art.category !== 'active') {
    return res.json({ success: false, message: '被动仙术无需使用' });
  }

  const result = artStorage.addProficiency(playerId, artId, 1);
  res.json({ success: true, ...result });
});

// ============================================================
// 仙术详情
// ============================================================

router.get('/info/:artId', (req, res) => {
  loadDeps();
  const art = artStorage.getArtInfo(req.params.artId);
  if (!art) return res.json({ success: false, message: '仙术不存在' });
  res.json({ success: true, art });
});

// 获取升级信息
router.get('/upgrade-info/:playerId/:artId', (req, res) => {
  loadDeps();
  const playerId = parseInt(req.params.playerId);
  const artId = req.params.artId;

  const record = db.prepare(
    'SELECT level, proficiency FROM player_immortal_arts WHERE player_id = ? AND art_id = ?'
  ).get(playerId, artId);
  if (!record) return res.json({ success: false, message: '未学习此仙术' });

  const art = artStorage.ART_TEMPLATES[artId];
  if (!art) return res.json({ success: false, message: '仙术不存在' });

  res.json({
    success: true,
    level: record.level,
    proficiency: record.proficiency,
    upgradeCost: artStorage.getUpgradeCost(artId, record.level),
    proficiencyRequired: artStorage.getProficiencyRequired(artId, record.level),
    canUpgrade: record.level < 10,
  });
});

// ============================================================
// 批量操作
// ============================================================

// 批量装备仙术（最多6个）
router.post('/equip-batch', (req, res) => {
  loadDeps();
  const { playerId, artIds } = req.body;
  if (!playerId || !artIds || !Array.isArray(artIds)) {
    return res.status(400).json({ success: false, message: '参数错误' });
  }

  if (artIds.length > 6) {
    return res.json({ success: false, message: '最多装备6个仙术' });
  }

  // 先卸下所有
  db.prepare('UPDATE player_immortal_arts SET equipped = 0 WHERE player_id = ?').run(playerId);

  // 装备新的
  for (const artId of artIds) {
    artStorage.equipArt(playerId, artId, true);
  }

  res.json({ success: true, message: '已更新装备' });
});

module.exports = router;
