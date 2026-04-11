/**
 * 宠物天赋树 API路由
 * P52-2: 宠物天赋树系统
 * 端点: /api/pet-talent/*
 */

const express = require('express');
const router = express.Router();
const path = require('path');

let talent;
try {
  talent = require('../../game/pet_talent_tree');
} catch (e) {
  talent = {
    PET_TALENT: { branches: {} },
    getPetTalentTree: () => ({}),
    learnTalent: () => ({ success: false, message: '天赋系统未加载' }),
    resetTalent: () => ({ success: false }),
    getTalentTreeSummary: () => ({}),
    calculateTalentBonus: () => ({})
  };
}

const DB_PATH = path.join(__dirname, '..', 'data', 'game.db');
let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
} catch (e) {
  db = {
    prepare: () => ({ get: () => null, all: () => [], run: () => {} }),
    exec: () => {}
  };
}

function getPlayerId(req) {
  return req.query.player_id || req.body?.player_id || 1;
}

// ============ 天赋树查询 ============

// GET /api/pet-talent/tree/:petId - 获取宠物天赋树
router.get('/tree/:petId', (req, res) => {
  const petId = parseInt(req.params.petId);
  const playerId = getPlayerId(req);

  let pet = null;
  try {
    pet = db.prepare(`SELECT * FROM player_pets WHERE id = ? AND player_id = ?`).get(petId, playerId);
  } catch (e) {
    try {
      pet = db.prepare(`SELECT * FROM pets WHERE id = ? AND owner_id = ?`).get(petId, playerId);
    } catch (e2) {
      pet = null;
    }
  }

  if (!pet) {
    return res.json({ code: 404, message: '灵兽不存在' });
  }

  // 解析talent_tree字段
  if (pet.talent_tree && typeof pet.talent_tree === 'string') {
    try { pet.talent_tree = JSON.parse(pet.talent_tree); } catch (e) { pet.talent_tree = {}; }
  }

  const tree = talent.getPetTalentTree(pet);
  const summary = talent.getTalentTreeSummary(pet);
  const bonus = talent.calculateTalentBonus(pet);

  res.json({ code: 0, data: { tree, summary, bonus } });
});

// GET /api/pet-talent/summary/:petId - 获取天赋树总览
router.get('/summary/:petId', (req, res) => {
  const petId = parseInt(req.params.petId);
  const playerId = getPlayerId(req);

  let pet = null;
  try {
    pet = db.prepare(`SELECT * FROM player_pets WHERE id = ? AND player_id = ?`).get(petId, playerId);
  } catch (e) {
    pet = null;
  }

  if (!pet) {
    return res.json({ code: 404, message: '灵兽不存在' });
  }

  if (pet.talent_tree && typeof pet.talent_tree === 'string') {
    try { pet.talent_tree = JSON.parse(pet.talent_tree); } catch (e) { pet.talent_tree = {}; }
  }

  const summary = talent.getTalentTreeSummary(pet);
  res.json({ code: 0, data: summary });
});

// GET /api/pet-talent/bonus/:petId - 获取天赋属性加成
router.get('/bonus/:petId', (req, res) => {
  const petId = parseInt(req.params.petId);
  const playerId = getPlayerId(req);

  let pet = null;
  try {
    pet = db.prepare(`SELECT * FROM player_pets WHERE id = ? AND player_id = ?`).get(petId, playerId);
  } catch (e) {
    pet = null;
  }

  if (!pet) {
    return res.json({ code: 404, message: '灵兽不存在' });
  }

  if (pet.talent_tree && typeof pet.talent_tree === 'string') {
    try { pet.talent_tree = JSON.parse(pet.talent_tree); } catch (e) { pet.talent_tree = {}; }
  }

  const bonus = talent.calculateTalentBonus(pet);
  res.json({ code: 0, data: { bonus } });
});

// ============ 天赋学习 ============

// POST /api/pet-talent/learn - 学习天赋
router.post('/learn', (req, res) => {
  const { pet_id, talent_id } = req.body;
  const playerId = getPlayerId(req);

  if (!pet_id || !talent_id) {
    return res.json({ code: 400, message: '参数不完整' });
  }

  let pet = null;
  try {
    pet = db.prepare(`SELECT * FROM player_pets WHERE id = ? AND player_id = ?`).get(pet_id, playerId);
  } catch (e) {
    try {
      pet = db.prepare(`SELECT * FROM pets WHERE id = ? AND owner_id = ?`).get(pet_id, playerId);
    } catch (e2) {
      pet = null;
    }
  }

  if (!pet) {
    return res.json({ code: 404, message: '灵兽不存在' });
  }

  if (pet.talent_tree && typeof pet.talent_tree === 'string') {
    try { pet.talent_tree = JSON.parse(pet.talent_tree); } catch (e) { pet.talent_tree = {}; }
  }

  const result = talent.learnTalent(pet, talent_id);

  if (result.success) {
    // 保存到数据库
    try {
      const treeJson = JSON.stringify(pet.talent_tree);
      db.prepare(`UPDATE player_pets SET talent_tree = ? WHERE id = ?`).run(treeJson, pet_id);
    } catch (e) {
      try {
        db.prepare(`UPDATE pets SET talent_tree = ? WHERE id = ?`).run(treeJson, pet_id);
      } catch (e2) {}
    }
  }

  res.json({ code: result.success ? 0 : 400, message: result.message, data: result });
});

// POST /api/pet-talent/reset - 重置天赋
router.post('/reset', (req, res) => {
  const { pet_id, talent_id } = req.body; // talent_id为null表示全重置
  const playerId = getPlayerId(req);

  let pet = null;
  try {
    pet = db.prepare(`SELECT * FROM player_pets WHERE id = ? AND player_id = ?`).get(pet_id, playerId);
  } catch (e) {
    try {
      pet = db.prepare(`SELECT * FROM pets WHERE id = ? AND owner_id = ?`).get(pet_id, playerId);
    } catch (e2) {
      pet = null;
    }
  }

  if (!pet) {
    return res.json({ code: 404, message: '灵兽不存在' });
  }

  if (pet.talent_tree && typeof pet.talent_tree === 'string') {
    try { pet.talent_tree = JSON.parse(pet.talent_tree); } catch (e) { pet.talent_tree = {}; }
  }

  const result = talent.resetTalent(pet, talent_id || null);

  if (result.success) {
    const treeJson = JSON.stringify(pet.talent_tree || {});
    try {
      db.prepare(`UPDATE player_pets SET talent_tree = ? WHERE id = ?`).run(treeJson, pet_id);
    } catch (e) {
      try {
        db.prepare(`UPDATE pets SET talent_tree = ? WHERE id = ?`).run(treeJson, pet_id);
      } catch (e2) {}
    }

    // 返还灵石（天赋重置费用）
    if (result.refund) {
      const refundAmount = talent_id ? Math.ceil(result.refund * talent.PET_TALENT.reset.single_reset_cost * 0.5) 
                                  : talent.PET_TALENT.reset.full_reset_cost;
      try {
        db.prepare(`UPDATE players SET stones = stones + ? WHERE id = ?`).run(refundAmount, playerId);
      } catch (e) {}
    }
  }

  res.json({ code: result.success ? 0 : 400, message: result.message, data: result });
});

// ============ 天赋树配置查询 ============

// GET /api/pet-talent/config - 获取天赋树配置（客户端初始化用）
router.get('/config', (req, res) => {
  res.json({ code: 0, data: talent.PET_TALENT });
});

// ============ 批量获取宠物天赋信息 ============

// GET /api/pet-talent/batch - 批量获取多只宠物天赋摘要
router.get('/batch', (req, res) => {
  const petIds = (req.query.ids || '').split(',').map(Number).filter(n => n > 0);
  const playerId = getPlayerId(req);

  if (petIds.length === 0) {
    return res.json({ code: 0, data: [] });
  }

  const results = [];
  for (const petId of petIds) {
    let pet = null;
    try {
      pet = db.prepare(`SELECT id, name, level, quality, talent_tree FROM player_pets WHERE id = ? AND player_id = ?`).get(petId, playerId);
    } catch (e) {
      pet = null;
    }
    if (pet) {
      if (pet.talent_tree && typeof pet.talent_tree === 'string') {
        try { pet.talent_tree = JSON.parse(pet.talent_tree); } catch (e) { pet.talent_tree = {}; }
      }
      results.push({
        petId: pet.id,
        name: pet.name,
        level: pet.level,
        quality: pet.quality,
        summary: talent.getTalentTreeSummary(pet)
      });
    }
  }

  res.json({ code: 0, data: results });
});

module.exports = router;
