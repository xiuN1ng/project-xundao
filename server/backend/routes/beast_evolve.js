const express = require('express');
const router = express.Router();
const path = require('path');

// 使用共享DB连接（支持WAL模式）
function getDb(req) {
  if (req.app && req.app.locals && req.app.locals.db) {
    return req.app.locals.db;
  }
  const Database = require('better-sqlite3');
  const DB_PATH = path.join(__dirname, '..', 'data', 'game.db');
  return new Database(DB_PATH);
}

const Logger = {
  info: (...args) => console.log('[beast_evolve]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[beast_evolve:error]', new Date().toISOString(), ...args),
};

// 初始化合成记录表
function initEvolveTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS beast_evolve_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      main_beast_id INTEGER NOT NULL,
      assist_beast_id INTEGER NOT NULL,
      material_key TEXT,
      material_count INTEGER DEFAULT 0,
      result_beast_id INTEGER,
      success INTEGER DEFAULT 0,
      new_quality TEXT,
      new_talent REAL,
      cost_lingshi INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS beast_fusion_materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      material_key TEXT NOT NULL,
      name TEXT NOT NULL,
      count INTEGER DEFAULT 0,
      UNIQUE(player_id, material_key)
    );
  `);
}

// 灵兽品质定义
const QUALITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical'];
const QUALITY_INDEX = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, mythical: 5 };

// 合成材料定义
const FUSION_MATERIALS = {
  beast_essence: { id: 'beast_essence', name: '灵兽精华', icon: '💎', desc: '灵兽合成核心材料' },
  heavenly_charm: { id: 'heavenly_charm', name: '天道符咒', icon: '📜', desc: '提升合成成功率' },
  atk_crystal:   { id: 'atk_crystal', name: '攻击灵石', icon: '⚔️', desc: '增加攻击资质' },
  def_crystal:   { id: 'def_crystal', name: '防御灵石', icon: '🛡️', desc: '增加防御资质' },
  hp_crystal:    { id: 'hp_crystal', name: '生命灵石', icon: '❤️', desc: '增加生命资质' },
  speed_crystal: { id: 'speed_crystal', name: '速度灵石', icon: '⚡', desc: '增加速度资质' },
};

// 合成配方表
const FUSION_RECIPES = {
  common:      { baseRate: 0.80, cost: 500,  materials: { beast_essence: 2 } },
  uncommon:    { baseRate: 0.70, cost: 2000, materials: { beast_essence: 5 } },
  rare:        { baseRate: 0.60, cost: 8000, materials: { beast_essence: 10, heavenly_charm: 2 } },
  epic:        { baseRate: 0.50, cost: 30000, materials: { beast_essence: 20, heavenly_charm: 5, atk_crystal: 3 } },
  legendary:   { baseRate: 0.40, cost: 100000, materials: { beast_essence: 50, heavenly_charm: 10, atk_crystal: 5, def_crystal: 5, hp_crystal: 5 } },
};

// 品质属性倍率
const QUALITY_STAT_MULT = {
  common:    { atk: 1.0,  hp: 1.0,  talent: 1.0 },
  uncommon:  { atk: 1.3,  hp: 1.3,  talent: 1.1 },
  rare:      { atk: 1.8,  hp: 1.8,  talent: 1.2 },
  epic:      { atk: 2.5,  hp: 2.5,  talent: 1.4 },
  legendary: { atk: 3.5,  hp: 3.5,  talent: 1.7 },
  mythical:   { atk: 5.0,  hp: 5.0,  talent: 2.0 },
};

// 合成结果品质概率表（按主灵兽品质）
const QUALITY_PROBS = {
  common:    { common: 0.40, uncommon: 0.60 },
  uncommon:  { uncommon: 0.35, rare: 0.65 },
  rare:      { rare: 0.30, epic: 0.70 },
  epic:      { epic: 0.30, legendary: 0.70 },
  legendary: { legendary: 0.40, mythical: 0.60 },
};

// extract userId from request
function extractUserId(req) {
  return parseInt(req.query.userId) || parseInt(req.query.player_id) || parseInt(req.body?.userId) || parseInt(req.body?.player_id) || 1;
}

// 品质权重随机
function rollQuality(mainQuality) {
  const probs = QUALITY_PROBS[mainQuality];
  if (!probs) return mainQuality;
  const roll = Math.random();
  let cumulative = 0;
  for (const [q, p] of Object.entries(probs)) {
    cumulative += p;
    if (roll < cumulative) return q;
  }
  return mainQuality;
}

// 计算资质倍率
function calcTalent(mainQuality, assistQuality) {
  const mainIdx = QUALITY_INDEX[mainQuality] || 0;
  const assistIdx = QUALITY_INDEX[assistQuality] || 0;
  const higherIdx = Math.max(mainIdx, assistIdx);
  const mult = QUALITY_STAT_MULT[QUALITY_ORDER[higherIdx]] || QUALITY_STAT_MULT.common;
  const talentBonus = mult.talent;
  // 公式: max(主,副)*(1.1~1.3)
  const talentRange = 1.1 + Math.random() * 0.2;
  return Math.round(talentBonus * talentRange * 100) / 100;
}

// GET /api/beast-evolve/materials - 获取玩家材料仓库
router.get('/materials', (req, res) => {
  const db = getDb(req);
  initEvolveTables(db);
  const userId = extractUserId(req);
  try {
    const rows = db.prepare('SELECT * FROM beast_fusion_materials WHERE player_id = ?').all(userId);
    // 合并FUSION_MATERIALS模板与玩家持有量
    const materials = Object.values(FUSION_MATERIALS).map(tpl => {
      const row = rows.find(r => r.material_key === tpl.id);
      return { ...tpl, count: row ? row.count : 0 };
    });
    res.json({ success: true, materials });
  } catch (err) {
    Logger.error('GET /materials error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/beast-evolve/templates - 获取合成配方列表
router.get('/templates', (req, res) => {
  const templates = Object.entries(FUSION_RECIPES).map(([quality, recipe]) => ({
    quality,
    name: `${quality.charAt(0).toUpperCase() + quality.slice(1)}合成`,
    baseRate: recipe.baseRate,
    cost: recipe.cost,
    materials: Object.entries(recipe.materials).map(([key, count]) => ({
      ...FUSION_MATERIALS[key],
      required: count,
    })),
  }));
  res.json({ success: true, templates });
});

// GET /api/beast-evolve/history - 获取合成历史
router.get('/history', (req, res) => {
  const db = getDb(req);
  initEvolveTables(db);
  const userId = extractUserId(req);
  try {
    const records = db.prepare(
      'SELECT * FROM beast_evolve_records WHERE player_id = ? ORDER BY id DESC LIMIT 50'
    ).all(userId);
    res.json({ success: true, records });
  } catch (err) {
    Logger.error('GET /history error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/beast-evolve/preview - 预览合成结果（不消耗材料）
router.post('/preview', (req, res) => {
  const db = getDb(req);
  initEvolveTables(db);
  const userId = extractUserId(req);
  const { mainBeastId, assistBeastId } = req.body;
  const userIdInt = parseInt(userId);

  try {
    const mainBeast = db.prepare('SELECT * FROM player_beasts WHERE id = ? AND player_id = ?').get(mainBeastId, userIdInt);
    const assistBeast = db.prepare('SELECT * FROM player_beasts WHERE id = ? AND player_id = ?').get(assistBeastId, userIdInt);

    if (!mainBeast) return res.json({ success: false, message: '主灵兽不存在' });
    if (!assistBeast) return res.json({ success: false, message: '副灵兽不存在' });
    if (mainBeastId === assistBeastId) return res.json({ success: false, message: '不能使用同一灵兽' });

    const recipe = FUSION_RECIPES[assistBeast.quality] || FUSION_RECIPES.common;
    const successRate = recipe.baseRate;

    // 预览结果品质（加权随机）
    const previewQuality = rollQuality(assistBeast.quality);
    const previewTalent = calcTalent(mainBeast.quality, assistBeast.quality);

    res.json({
      success: true,
      preview: {
        mainBeast: { id: mainBeast.id, name: mainBeast.name, quality: mainBeast.quality, level: mainBeast.level },
        assistBeast: { id: assistBeast.id, name: assistBeast.name, quality: assistBeast.quality, level: assistBeast.level },
        cost: recipe.cost,
        successRate: Math.round(successRate * 100) + '%',
        previewQuality,
        previewTalent,
        materials: Object.entries(recipe.materials).map(([key, count]) => ({
          ...FUSION_MATERIALS[key],
          required: count,
        })),
      },
    });
  } catch (err) {
    Logger.error('POST /preview error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/beast-evolve/synthesize - 灵兽合成（主+副+材料）
router.post('/synthesize', (req, res) => {
  const db = getDb(req);
  initEvolveTables(db);
  const userId = extractUserId(req);
  const { mainBeastId, assistBeastId, materialKey } = req.body;
  const userIdInt = parseInt(userId);

  const closeDb = db !== req.app?.locals?.db;
  try {
    const mainBeast = db.prepare('SELECT * FROM player_beasts WHERE id = ? AND player_id = ?').get(mainBeastId, userIdInt);
    const assistBeast = db.prepare('SELECT * FROM player_beasts WHERE id = ? AND player_id = ?').get(assistBeastId, userIdInt);

    if (!mainBeast) return res.json({ success: false, message: '主灵兽不存在' });
    if (!assistBeast) return res.json({ success: false, message: '副灵兽不存在' });
    if (mainBeastId === assistBeastId) return res.json({ success: false, message: '不能使用同一灵兽合成' });

    const recipe = FUSION_RECIPES[assistBeast.quality] || FUSION_RECIPES.common;

    // 检查灵石
    const player = db.prepare('SELECT lingshi FROM Users WHERE id = ?').get(userIdInt);
    if (!player || player.lingshi < recipe.cost) {
      return res.json({ success: false, message: `灵石不足，需要 ${recipe.cost} 灵石` });
    }

    // 检查材料
    for (const [matKey, matCount] of Object.entries(recipe.materials)) {
      const matRow = db.prepare('SELECT count FROM beast_fusion_materials WHERE player_id = ? AND material_key = ?').get(userIdInt, matKey);
      const owned = matRow ? matRow.count : 0;
      if (owned < matCount) {
        const matTpl = FUSION_MATERIALS[matKey];
        return res.json({ success: false, message: `材料不足：需要 ${matTpl?.name || matKey} ×${matCount}，持有 ${owned}` });
      }
    }

    // 扣除灵石
    db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(recipe.cost, userIdInt);

    // 扣除材料
    for (const [matKey, matCount] of Object.entries(recipe.materials)) {
      const matRow = db.prepare('SELECT count FROM beast_fusion_materials WHERE player_id = ? AND material_key = ?').get(userIdInt, matKey);
      const newCount = matRow.count - matCount;
      if (newCount <= 0) {
        db.prepare('DELETE FROM beast_fusion_materials WHERE player_id = ? AND material_key = ?').run(userIdInt, matKey);
      } else {
        db.prepare('UPDATE beast_fusion_materials SET count = ? WHERE player_id = ? AND material_key = ?').run(newCount, userIdInt, matKey);
      }
    }

    // 成功率判定
    const successRate = recipe.baseRate;
    const roll = Math.random();
    const success = roll < successRate;

    let resultQuality = assistBeast.quality;
    let resultTalent = 1.0;
    let newBeastId = null;

    if (success) {
      // 成功：升级品质
      resultQuality = rollQuality(assistBeast.quality);
      resultTalent = calcTalent(mainBeast.quality, assistBeast.quality);

      // 属性计算
      const mult = QUALITY_STAT_MULT[resultQuality] || QUALITY_STAT_MULT.common;
      const avgLevel = Math.ceil((mainBeast.level + assistBeast.level) / 2);
      const newAttack = Math.round(mult.atk * 50 * avgLevel * resultTalent);
      const newHp = Math.round(mult.hp * 200 * avgLevel * resultTalent);

      // 继承主灵兽的名字，等级取平均
      const newName = `${assistBeast.name}·融合`;

      // 更新主灵兽为新品质/属性
      db.prepare(`
        UPDATE player_beasts
        SET quality = ?, attack = ?, hp = ?, level = ?, intimacy = intimacy + 50
        WHERE id = ?
      `).run(resultQuality, newAttack, newHp, avgLevel, mainBeastId);

      newBeastId = mainBeastId;

      // 消耗副灵兽（从player_beasts删除）
      db.prepare('DELETE FROM player_beasts WHERE id = ?').run(assistBeastId);

      Logger.info(`合成成功: player=${userIdInt}, main=${mainBeastId}, assist=${assistBeastId}, quality=${resultQuality}, talent=${resultTalent}`);
    } else {
      // 失败：返还50%材料
      for (const [matKey, matCount] of Object.entries(recipe.materials)) {
        const retCount = Math.floor(matCount * 0.5);
        if (retCount > 0) {
          const existing = db.prepare('SELECT id, count FROM beast_fusion_materials WHERE player_id = ? AND material_key = ?').get(userIdInt, matKey);
          if (existing) {
            db.prepare('UPDATE beast_fusion_materials SET count = count + ? WHERE player_id = ? AND material_key = ?').run(retCount, userIdInt, matKey);
          } else {
            const matTpl = FUSION_MATERIALS[matKey];
            db.prepare('INSERT INTO beast_fusion_materials (player_id, material_key, name, count) VALUES (?, ?, ?, ?)').run(userIdInt, matKey, matTpl?.name || matKey, retCount);
          }
        }
      }
      Logger.info(`合成失败: player=${userIdInt}, main=${mainBeastId}, assist=${assistBeastId}`);
    }

    // 记录合成历史
    db.prepare(`
      INSERT INTO beast_evolve_records (player_id, main_beast_id, assist_beast_id, material_key, material_count, result_beast_id, success, new_quality, new_talent, cost_lingshi)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userIdInt, mainBeastId, assistBeastId,
      materialKey || null,
      Object.values(recipe.materials).reduce((a, b) => a + b, 0),
      newBeastId,
      success ? 1 : 0,
      resultQuality,
      resultTalent,
      recipe.cost
    );

    res.json({
      success,
      message: success ? `合成成功！灵兽品质提升为 ${resultQuality}，资质倍率 ${resultTalent}` : '合成失败，返还50%材料',
      data: {
        cost: recipe.cost,
        successRate: Math.round(successRate * 100) + '%',
        newQuality: resultQuality,
        newTalent: resultTalent,
        newBeastId,
        mainBeastId,
      },
    });
  } catch (err) {
    Logger.error('POST /synthesize error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/beast-evolve/materials/claim - 领取合成材料（每日任务奖励等途径）
router.post('/materials/claim', (req, res) => {
  const db = getDb(req);
  initEvolveTables(db);
  const userId = extractUserId(req);
  const { materialKey, count } = req.body;
  const userIdInt = parseInt(userId);

  if (!materialKey || !FUSION_MATERIALS[materialKey]) {
    return res.json({ success: false, message: '无效材料类型' });
  }

  try {
    const amount = parseInt(count) || 1;
    const existing = db.prepare('SELECT id, count FROM beast_fusion_materials WHERE player_id = ? AND material_key = ?').get(userIdInt, materialKey);
    if (existing) {
      db.prepare('UPDATE beast_fusion_materials SET count = count + ? WHERE player_id = ? AND material_key = ?').run(amount, userIdInt, materialKey);
    } else {
      const tpl = FUSION_MATERIALS[materialKey];
      db.prepare('INSERT INTO beast_fusion_materials (player_id, material_key, name, count) VALUES (?, ?, ?, ?)').run(userIdInt, materialKey, tpl?.name || materialKey, amount);
    }
    const updated = db.prepare('SELECT count FROM beast_fusion_materials WHERE player_id = ? AND material_key = ?').get(userIdInt, materialKey);
    res.json({ success: true, message: `获得 ${tpl?.name || materialKey} ×${amount}`, total: updated ? updated.count : amount });
  } catch (err) {
    Logger.error('POST /materials/claim error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/beast-evolve/status - 获取合成系统状态
router.get('/status', (req, res) => {
  const db = getDb(req);
  initEvolveTables(db);
  const userId = extractUserId(req);
  try {
    const materials = db.prepare('SELECT * FROM beast_fusion_materials WHERE player_id = ?').all(userId);
    const recentCount = db.prepare('SELECT COUNT(*) as cnt FROM beast_evolve_records WHERE player_id = ? AND created_at > datetime("now", "-1 day")').get(userId);
    res.json({
      success: true,
      materials: materials.map(m => ({ ...m, ...FUSION_MATERIALS[m.material_key], count: m.count })),
      todaySynthesize: recentCount ? recentCount.cnt : 0,
      templates: Object.keys(FUSION_RECIPES),
    });
  } catch (err) {
    Logger.error('GET /status error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
