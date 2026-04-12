/**
 * 生活技能系统 API
 * 支持 6 种生活技能：炼丹、采矿、采药、狩猎、钓鱼、烹饪
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const Database = require('better-sqlite3');
const config = require('../../game/life_skill_config');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db = null;
function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode=WAL');
    db.pragma('busy_timeout=5000');
    initTables();
  }
  return db;
}

function initTables() {
  const localDb = db;
  localDb.exec(`
    CREATE TABLE IF NOT EXISTS player_life_skills (
      player_id INTEGER,
      skill_type VARCHAR(50),
      level INTEGER DEFAULT 1,
      exp INTEGER DEFAULT 0,
      PRIMARY KEY(player_id, skill_type)
    );

    CREATE TABLE IF NOT EXISTS player_vitality (
      player_id INTEGER PRIMARY KEY,
      current INTEGER DEFAULT 100,
      max_value INTEGER DEFAULT 100,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS player_life_inventory (
      player_id INTEGER,
      item_type VARCHAR(50),
      item_id VARCHAR(50),
      count INTEGER DEFAULT 0,
      quality VARCHAR(20) DEFAULT 'white',
      PRIMARY KEY(player_id, item_type, item_id)
    );

    CREATE TABLE IF NOT EXISTS player_life_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER,
      skill_type VARCHAR(50),
      action VARCHAR(30),
      result TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

function getPlayerVitality(playerId) {
  const localDb = getDb();
  let vit = localDb.prepare('SELECT * FROM player_vitality WHERE player_id = ?').get(playerId);
  if (!vit) {
    localDb.prepare('INSERT INTO player_vitality (player_id, current, max_value) VALUES (?, 100, 100)').run(playerId);
    vit = localDb.prepare('SELECT * FROM player_vitality WHERE player_id = ?').get(playerId);
  }

  // 活力恢复逻辑
  const now = Date.now();
  const updatedAt = new Date(vit.updated_at).getTime();
  const hoursPassed = (now - updatedAt) / (1000 * 60 * 60);
  const recovered = Math.floor(hoursPassed * config.vitality.recoveryPerHour);
  if (recovered > 0) {
    const newCurrent = Math.min(vit.max_value, vit.current + recovered);
    localDb.prepare(
      "UPDATE player_vitality SET current = ?, updated_at = datetime('now') WHERE player_id = ?"
    ).run(newCurrent, playerId);
    vit.current = newCurrent;
  }
  return vit;
}

function getPlayerSkill(playerId, skillType) {
  const localDb = getDb();
  let skill = localDb.prepare(
    'SELECT * FROM player_life_skills WHERE player_id = ? AND skill_type = ?'
  ).get(playerId, skillType);
  if (!skill) {
    localDb.prepare(
      'INSERT INTO player_life_skills (player_id, skill_type, level, exp) VALUES (?, ?, 1, 0)'
    ).run(playerId, skillType);
    skill = localDb.prepare(
      'SELECT * FROM player_life_skills WHERE player_id = ? AND skill_type = ?'
    ).get(playerId, skillType);
  }
  return skill;
}

function addExp(playerId, skillType, exp) {
  const localDb = getDb();
  const skill = getPlayerSkill(playerId, skillType);
  const newExp = skill.exp + exp;
  const expNeeded = config.expForLevel(skill.level);

  if (newExp >= expNeeded && skill.level < config.maxLevel) {
    const newLevel = skill.level + 1;
    localDb.prepare(
      'UPDATE player_life_skills SET exp = ?, level = ? WHERE player_id = ? AND skill_type = ?'
    ).run(newExp - expNeeded, newLevel, playerId, skillType);
    return { leveled: true, newLevel, exp: newExp - expNeeded };
  } else {
    localDb.prepare(
      'UPDATE player_life_skills SET exp = ? WHERE player_id = ? AND skill_type = ?'
    ).run(newExp, playerId, skillType);
    return { leveled: false, newLevel: skill.level, exp: newExp };
  }
}

function addItem(playerId, itemType, itemId, count, quality) {
  const localDb = getDb();
  localDb.prepare(`
    INSERT INTO player_life_inventory (player_id, item_type, item_id, count, quality)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(player_id, item_type, item_id)
    DO UPDATE SET count = count + ?, quality = CASE WHEN ? > (SELECT CAST(SUBSTR(quality, 1, 1) AS INTEGER) FROM player_life_inventory WHERE player_id = ? AND item_id = ?) THEN ? ELSE quality END
  `).run(playerId, itemType, itemId, count, quality, count, quality, playerId, itemId, quality);
}

function extractUserId(req) {
  return parseInt(
    req.body?.player_id || req.body?.userId ||
    req.query?.player_id || req.query?.userId ||
    req.userId || 1
  );
}

// GET /api/life-skill/types - 生活技能类型列表
router.get('/types', (req, res) => {
  try {
    const types = Object.entries(config.skillTypes).map(([key, val]) => ({
      type: key,
      name: val.name,
      icon: val.icon,
      description: val.description,
    }));
    res.json({ success: true, types });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// GET /api/life-skill/info - 玩家所有生活技能信息
router.get('/info', (req, res) => {
  try {
    const userId = extractUserId(req);
    const allSkills = Object.keys(config.skillTypes);
    const skills = allSkills.map(st => {
      const s = getPlayerSkill(userId, st);
      const conf = config.skillTypes[st];
      const expNeeded = config.expForLevel(s.level);
      const progress = expNeeded > 0 ? Math.floor((s.exp / expNeeded) * 100) : 100;
      return {
        type: st,
        name: conf.name,
        icon: conf.icon,
        level: s.level,
        exp: s.exp,
        expNeeded,
        progress,
        isMax: s.level >= config.maxLevel,
      };
    });

    const vitality = getPlayerVitality(userId);
    res.json({
      success: true,
      skills,
      vitality: {
        current: vitality.current,
        max: vitality.max_value,
        recoveryRate: config.vitality.recoveryPerHour + '/小时',
      },
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// GET /api/life-skill/detail/:skillType - 单个技能详情
router.get('/detail/:skillType', (req, res) => {
  try {
    const userId = extractUserId(req);
    const skillType = req.params.skillType;
    if (!config.skillTypes[skillType]) {
      return res.json({ success: false, message: '不存在的生活技能类型' });
    }

    const skill = getPlayerSkill(userId, skillType);
    const conf = config.skillTypes[skillType];
    const expNeeded = config.expForLevel(skill.level);
    const progress = expNeeded > 0 ? Math.floor((skill.exp / expNeeded) * 100) : 100;

    // 获取该技能的物品
    const items = localDb => {
      if (skillType === 'alchemy') {
        return Object.entries(config.alchemyProducts).map(([id, p]) => ({
          id,
          name: p.name,
          icon: p.icon,
          quality: p.quality,
          minLevel: p.minSkillLevel,
          sellPrice: p.sellPrice,
          description: p.description,
          ingredients: p.ingredients,
        }));
      } else if (skillType === 'cooking') {
        return Object.entries(config.cookingProducts).map(([id, p]) => ({
          id,
          name: p.name,
          icon: p.icon,
          quality: p.quality,
          minLevel: p.minSkillLevel,
          sellPrice: p.sellPrice,
          description: p.description,
          ingredients: p.ingredients,
        }));
      } else if (config.gatherItems) {
        return Object.entries(config.gatherItems)
          .filter(([, item]) => item.minSkillLevel <= skill.level + 5)
          .map(([id, item]) => ({
            id,
            name: item.name,
            icon: item.icon,
            quality: item.quality,
            minLevel: item.minSkillLevel,
            sellPrice: item.sellPrice,
          }));
      }
      return [];
    };

    const localDb = getDb();
    const itemList = items(localDb);

    res.json({
      success: true,
      skill: {
        type: skillType,
        name: conf.name,
        icon: conf.icon,
        description: conf.description,
        level: skill.level,
        exp: skill.exp,
        expNeeded,
        progress,
        isMax: skill.level >= config.maxLevel,
      },
      items: itemList,
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/life-skill/gather - 采集（采矿/采药/狩猎）
router.post('/gather', (req, res) => {
  try {
    const userId = extractUserId(req);
    const skillType = req.body.skill_type || req.body.skillType;
    const skillCost = config.vitality.costPerAction[skillType];

    if (!skillType || !['mining', 'herbing', 'hunting'].includes(skillType)) {
      return res.json({ success: false, message: '无效的采集技能类型' });
    }

    const vitality = getPlayerVitality(userId);
    if (vitality.current < skillCost) {
      return res.json({ success: false, message: `活力不足，需要 ${skillCost} 点活力` });
    }

    const skill = getPlayerSkill(userId, skillType);
    const gatherConfig = config.gatherItems;
    const skillLevel = skill.level;

    // 根据技能等级筛选可采集的物品
    const eligibleItems = Object.entries(gatherConfig)
      .filter(([, item]) => item.minSkillLevel <= skillLevel + 3)
      .map(([id, item]) => ({ id, ...item }));

    if (eligibleItems.length === 0) {
      return res.json({ success: false, message: '当前等级没有可采集的物品' });
    }

    // 计算品质
    const qChance = config.qualityChance(skillLevel);
    const roll = Math.random();
    let quality;
    if (roll < qChance.orange) quality = 'orange';
    else if (roll < qChance.orange + qChance.purple) quality = 'purple';
    else if (roll < qChance.orange + qChance.purple + qChance.blue) quality = 'blue';
    else if (roll < qChance.orange + qChance.purple + qChance.blue + qChance.green) quality = 'green';
    else quality = 'white';

    // 根据品质调整权重
    const qualityMultiplier = config.qualityTiers.find(t => t.label === quality)?.multiplier || 1;

    // 随机选择一个物品（高品质物品权重更高）
    const weights = eligibleItems.map(item => {
      const base = item.minSkillLevel <= skillLevel ? 2 : 0.5;
      return base * (item.quality === 'orange' ? 3 : item.quality === 'purple' ? 2 : item.quality === 'blue' ? 1.5 : 1);
    });
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let rand = Math.random() * totalWeight;
    let selected = eligibleItems[0];
    for (let i = 0; i < eligibleItems.length; i++) {
      rand -= weights[i];
      if (rand <= 0) { selected = eligibleItems[i]; break; }
    }

    // 数量
    const [minYield, maxYield] = selected.baseYield;
    const yieldAmount = Math.floor(Math.random() * (maxYield - minYield + 1)) + minYield;
    const bonusYield = Math.floor(skillLevel / 10);
    const finalYield = yieldAmount + bonusYield;

    // 经验
    const expGained = Math.floor(selected.baseExp * qualityMultiplier);

    // 消耗活力
    const localDb = getDb();
    localDb.prepare('UPDATE player_vitality SET current = current - ? WHERE player_id = ?').run(skillCost, userId);

    // 添加物品
    addItem(userId, skillType, selected.id, finalYield, quality);

    // 增加熟练度
    const expResult = addExp(userId, skillType, expGained);

    // 记录
    localDb.prepare(
      'INSERT INTO player_life_records (player_id, skill_type, action, result) VALUES (?, ?, ?, ?)'
    ).run(userId, skillType, 'gather', `${selected.name} x${finalYield} (${quality})`);

    const qualityLabel = config.qualityTiers.find(t => t.label === quality)?.name || quality;
    res.json({
      success: true,
      item: {
        id: selected.id,
        name: selected.name,
        icon: selected.icon,
        quality: qualityLabel,
        count: finalYield,
        sellPrice: Math.round(selected.sellPrice * qualityMultiplier),
      },
      expGained,
      skillLevel: expResult.newLevel,
      leveledUp: expResult.leveled,
      newLevel: expResult.leveled ? expResult.newLevel : null,
      vitalityUsed: skillCost,
      remainingVitality: vitality.current - skillCost,
      message: `采集获得【${qualityLabel}】${selected.icon}${selected.name} x${finalYield}`,
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/life-skill/cook - 烹饪
router.post('/cook', (req, res) => {
  try {
    const userId = extractUserId(req);
    const productId = req.body.product_id || req.body.productId;
    const skillCost = config.vitality.costPerAction.cooking;

    if (!productId || !config.cookingProducts[productId]) {
      return res.json({ success: false, message: '无效的烹饪配方' });
    }

    const product = config.cookingProducts[productId];
    const skill = getPlayerSkill(userId, 'cooking');

    if (skill.level < product.minSkillLevel) {
      return res.json({ success: false, message: `烹饪等级不足，需要 ${product.minSkillLevel} 级` });
    }

    const vitality = getPlayerVitality(userId);
    if (vitality.current < skillCost) {
      return res.json({ success: false, message: `活力不足，需要 ${skillCost} 点活力` });
    }

    // 检查材料
    const localDb = getDb();
    const missing = [];
    for (const ing of product.ingredients) {
      if (ing.type === 'gather' || !ing.type) {
        const row = localDb.prepare(
          'SELECT count FROM player_life_inventory WHERE player_id = ? AND item_type = ? AND item_id = ?'
        ).get(userId, 'herbing', ing.item);
        if (!row || row.count < ing.count) {
          missing.push(`${ing.item} x${ing.count}`);
        }
      }
    }

    if (missing.length > 0) {
      return res.json({ success: false, message: `材料不足: ${missing.join(', ')}` });
    }

    // 扣除材料
    for (const ing of product.ingredients) {
      if (ing.type === 'gather' || !ing.type) {
        localDb.prepare(
          'UPDATE player_life_inventory SET count = count - ? WHERE player_id = ? AND item_type = ? AND item_id = ?'
        ).run(ing.count, userId, 'herbing', ing.item);
      }
    }

    // 消耗活力
    localDb.prepare('UPDATE player_vitality SET current = current - ? WHERE player_id = ?').run(skillCost, userId);

    // 品质计算
    const qChance = config.qualityChance(skill.level);
    const roll = Math.random();
    let quality;
    if (roll < qChance.orange) quality = 'orange';
    else if (roll < qChance.orange + qChance.purple) quality = 'purple';
    else if (roll < qChance.orange + qChance.purple + qChance.blue) quality = 'blue';
    else if (roll < qChance.orange + qChance.purple + qChance.blue + qChance.green) quality = 'green';
    else quality = 'white';

    const qualityMultiplier = config.qualityTiers.find(t => t.label === quality)?.multiplier || 1;

    // 添加产物
    addItem(userId, 'cooking', productId, 1, quality);

    // 经验
    const expGained = Math.floor(product.baseExp * qualityMultiplier);
    const expResult = addExp(userId, 'cooking', expGained);

    localDb.prepare(
      'INSERT INTO player_life_records (player_id, skill_type, action, result) VALUES (?, ?, ?, ?)'
    ).run(userId, 'cooking', 'cook', `${product.name} (${quality})`);

    const qualityLabel = config.qualityTiers.find(t => t.label === quality)?.name || quality;
    res.json({
      success: true,
      product: {
        id: productId,
        name: product.name,
        icon: product.icon,
        quality: qualityLabel,
        description: product.description,
        sellPrice: Math.round(product.sellPrice * qualityMultiplier),
      },
      expGained,
      skillLevel: expResult.newLevel,
      leveledUp: expResult.leveled,
      newLevel: expResult.leveled ? expResult.newLevel : null,
      vitalityUsed: skillCost,
      remainingVitality: vitality.current - skillCost,
      message: `烹饪获得【${qualityLabel}】${product.icon}${product.name}！`,
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/life-skill/alchemy - 炼丹
router.post('/alchemy', (req, res) => {
  try {
    const userId = extractUserId(req);
    const productId = req.body.product_id || req.body.productId;
    const skillCost = config.vitality.costPerAction.alchemy;

    if (!productId || !config.alchemyProducts[productId]) {
      return res.json({ success: false, message: '无效的炼丹配方' });
    }

    const product = config.alchemyProducts[productId];
    const skill = getPlayerSkill(userId, 'alchemy');

    if (skill.level < product.minSkillLevel) {
      return res.json({ success: false, message: `炼丹等级不足，需要 ${product.minSkillLevel} 级` });
    }

    const vitality = getPlayerVitality(userId);
    if (vitality.current < skillCost) {
      return res.json({ success: false, message: `活力不足，需要 ${skillCost} 点活力` });
    }

    const localDb = getDb();
    const missing = [];
    for (const ing of product.ingredients) {
      const row = localDb.prepare(
        'SELECT count FROM player_life_inventory WHERE player_id = ? AND item_type = ? AND item_id = ?'
      ).get(userId, 'herbing', ing.item);
      if (!row || row.count < ing.count) {
        missing.push(`${config.gatherItems[ing.item]?.name || ing.item} x${ing.count}`);
      }
    }

    if (missing.length > 0) {
      return res.json({ success: false, message: `材料不足: ${missing.join(', ')}` });
    }

    for (const ing of product.ingredients) {
      localDb.prepare(
        'UPDATE player_life_inventory SET count = count - ? WHERE player_id = ? AND item_type = ? AND item_id = ?'
      ).run(ing.count, userId, 'herbing', ing.item);
    }

    localDb.prepare('UPDATE player_vitality SET current = current - ? WHERE player_id = ?').run(skillCost, userId);

    const qChance = config.qualityChance(skill.level);
    const roll = Math.random();
    let quality;
    if (roll < qChance.orange) quality = 'orange';
    else if (roll < qChance.orange + qChance.purple) quality = 'purple';
    else if (roll < qChance.orange + qChance.purple + qChance.blue) quality = 'blue';
    else if (roll < qChance.orange + qChance.purple + qChance.blue + qChance.green) quality = 'green';
    else quality = 'white';

    const qualityMultiplier = config.qualityTiers.find(t => t.label === quality)?.multiplier || 1;

    addItem(userId, 'alchemy', productId, 1, quality);

    const expGained = Math.floor(product.baseExp * qualityMultiplier);
    const expResult = addExp(userId, 'alchemy', expGained);

    localDb.prepare(
      'INSERT INTO player_life_records (player_id, skill_type, action, result) VALUES (?, ?, ?, ?)'
    ).run(userId, 'alchemy', 'alchemy', `${product.name} (${quality})`);

    const qualityLabel = config.qualityTiers.find(t => t.label === quality)?.name || quality;
    res.json({
      success: true,
      product: {
        id: productId,
        name: product.name,
        icon: product.icon,
        quality: qualityLabel,
        description: product.description,
        sellPrice: Math.round(product.sellPrice * qualityMultiplier),
      },
      expGained,
      skillLevel: expResult.newLevel,
      leveledUp: expResult.leveled,
      newLevel: expResult.leveled ? expResult.newLevel : null,
      vitalityUsed: skillCost,
      remainingVitality: vitality.current - skillCost,
      message: `炼制成功！【${qualityLabel}】${product.icon}${product.name}！`,
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});


// POST /api/life-skill/upgrade - 升级生活技能（手动消耗道具）
router.post('/upgrade', (req, res) => {
  try {
    const userId = extractUserId(req);
    const skillType = req.body.skill_type || req.body.skillType;

    if (!skillType || !config.skillTypes[skillType]) {
      return res.json({ success: false, message: '无效的生活技能类型' });
    }

    const skill = getPlayerSkill(userId, skillType);
    if (skill.level >= config.maxLevel) {
      return res.json({ success: false, message: '该技能已达到最高等级' });
    }

    const expNeeded = config.expForLevel(skill.level);
    const missing = expNeeded - skill.exp;

    res.json({
      success: true,
      skillType,
      level: skill.level,
      exp: skill.exp,
      expNeeded,
      expMissing: missing,
      message: `升级还需 ${missing} 点熟练度。继续使用该技能来积累熟练度吧！`,
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// GET /api/life-skill/recipes - 生产配方
router.get('/recipes', (req, res) => {
  try {
    const skillType = req.query.skill_type || req.query.skillType;
    const localDb = getDb();
    const userId = extractUserId(req);

    if (skillType && skillType !== 'alchemy' && skillType !== 'cooking') {
      return res.json({ success: false, message: '只有炼丹和烹饪有配方' });
    }

    const alchemyRecipes = Object.entries(config.alchemyProducts).map(([id, p]) => ({
      id,
      type: 'alchemy',
      name: p.name,
      icon: p.icon,
      quality: p.quality,
      minLevel: p.minSkillLevel,
      sellPrice: p.sellPrice,
      description: p.description,
      ingredients: p.ingredients.map(i => ({
        item: i.item,
        name: config.gatherItems[i.item]?.name || i.item,
        count: i.count,
        have: (() => {
          const row = localDb.prepare(
            'SELECT count FROM player_life_inventory WHERE player_id = ? AND item_type = ? AND item_id = ?'
          ).get(userId, 'herbing', i.item);
          return row ? row.count : 0;
        })(),
      })),
    }));

    const cookingRecipes = Object.entries(config.cookingProducts).map(([id, p]) => ({
      id,
      type: 'cooking',
      name: p.name,
      icon: p.icon,
      quality: p.quality,
      minLevel: p.minSkillLevel,
      sellPrice: p.sellPrice,
      description: p.description,
      ingredients: p.ingredients.map(i => ({
        item: i.item,
        name: config.gatherItems[i.item]?.name || i.item,
        count: i.count,
        have: (() => {
          const row = localDb.prepare(
            'SELECT count FROM player_life_inventory WHERE player_id = ? AND item_type = ? AND item_id = ?'
          ).get(userId, 'herbing', i.item);
          return row ? row.count : 0;
        })(),
      })),
    }));

    res.json({
      success: true,
      recipes: {
        alchemy: alchemyRecipes,
        cooking: cookingRecipes,
      },
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// GET /api/life-skill/vitality - 活力状态
router.get('/vitality', (req, res) => {
  try {
    const userId = extractUserId(req);
    const vitality = getPlayerVitality(userId);
    res.json({
      success: true,
      vitality: {
        current: vitality.current,
        max: vitality.max_value,
        recoveryRate: config.vitality.recoveryPerHour + '/小时',
        costPerAction: config.vitality.costPerAction,
      },
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
