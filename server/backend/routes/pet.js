/**
 * 灵兽进化系统 API 路由
 * 端点: GET /list, POST /equip, POST /unequip, GET /evolution-info
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db = null;

function getDb(req) {
  if (db) return db;
  if (req.app && req.app.locals && req.app.locals.db) {
    db = req.app.locals.db;
  } else {
    const Database = require('better-sqlite3');
    db = new Database(DB_PATH);
    db.pragma('journal_mode=WAL');
    db.pragma('busy_timeout=5000');
  }
  return db;
}

// ========== 数据库初始化 ==========
function initPetTables(database) {
  const localDb = database || getDb({ app: { locals: { db: null } } });
  
  // 灵兽表
  localDb.exec(`
    CREATE TABLE IF NOT EXISTS pets (
      pet_id TEXT PRIMARY KEY,
      player_id INTEGER NOT NULL,
      template_id TEXT NOT NULL,
      name TEXT NOT NULL,
      name_cn TEXT,
      level INTEGER DEFAULT 1,
      exp INTEGER DEFAULT 0,
      form INTEGER DEFAULT 1,
      talent_level TEXT DEFAULT 'normal',
      max_level INTEGER DEFAULT 100,
      health INTEGER DEFAULT 1000,
      attack INTEGER DEFAULT 100,
      defense INTEGER DEFAULT 50,
      speed INTEGER DEFAULT 50,
      skills TEXT DEFAULT '[]',
      innate_skills TEXT DEFAULT '[]',
      appearance TEXT DEFAULT 'default',
      equipped INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);

  // 灵兽装备槽位表
  localDb.exec(`
    CREATE TABLE IF NOT EXISTS pet_equipment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      slot_type TEXT DEFAULT 'main',
      pet_id TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);

  // 灵兽模板表（预置数据）
  try {
    const count = localDb.prepare('SELECT COUNT(*) as c FROM pet_templates').get();
    if (count.c === 0) {
      const templates = getPetTemplates();
      const insert = localDb.prepare(`
        INSERT OR IGNORE INTO pet_templates 
        (template_id, name, name_cn, description, base_health, base_attack, base_defense, base_speed, max_form, rarity, icon, learnable_skills)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const t of templates) {
        insert.run(t.templateId, t.name, t.nameCn, t.description, t.baseHealth, t.baseAttack, t.baseDefense, t.baseSpeed, t.maxForm, t.rarity, t.icon, JSON.stringify(t.learnableSkills));
      }
      console.log('[Pet] 灵兽模板初始化完成');
    }
  } catch (e) {
    // 表可能不存在
    localDb.exec(`
      CREATE TABLE IF NOT EXISTS pet_templates (
        template_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        name_cn TEXT,
        description TEXT,
        base_health INTEGER DEFAULT 1000,
        base_attack INTEGER DEFAULT 100,
        base_defense INTEGER DEFAULT 50,
        base_speed INTEGER DEFAULT 50,
        max_form INTEGER DEFAULT 5,
        rarity TEXT DEFAULT 'normal',
        icon TEXT,
        learnable_skills TEXT DEFAULT '[]'
      )
    `);
    const templates = getPetTemplates();
    const insert = localDb.prepare(`
      INSERT OR IGNORE INTO pet_templates 
      (template_id, name, name_cn, description, base_health, base_attack, base_defense, base_speed, max_form, rarity, icon, learnable_skills)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const t of templates) {
      insert.run(t.templateId, t.name, t.nameCn, t.description, t.baseHealth, t.baseAttack, t.baseDefense, t.baseSpeed, t.maxForm, t.rarity, t.icon, JSON.stringify(t.learnableSkills));
    }
  }

  // 灵兽进化配置表
  try {
    const count = localDb.prepare('SELECT COUNT(*) as c FROM pet_evolution_configs').get();
    if (count.c === 0) {
      const configs = getEvolutionConfigs();
      const insert = localDb.prepare(`
        INSERT OR IGNORE INTO pet_evolution_configs (from_form, to_form, cost_item, cost_amount, stat_multiplier, description)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const c of configs) {
        insert.run(c.fromForm, c.toForm, c.costItem, c.costAmount, c.statMultiplier, c.description);
      }
    }
  } catch (e) {
    localDb.exec(`
      CREATE TABLE IF NOT EXISTS pet_evolution_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_form INTEGER,
        to_form INTEGER,
        cost_item TEXT,
        cost_amount INTEGER,
        stat_multiplier REAL,
        description TEXT
      )
    `);
    const configs = getEvolutionConfigs();
    const insert = localDb.prepare(`
      INSERT OR IGNORE INTO pet_evolution_configs (from_form, to_form, cost_item, cost_amount, stat_multiplier, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const c of configs) {
      insert.run(c.fromForm, c.toForm, c.costItem, c.costAmount, c.statMultiplier, c.description);
    }
  }

  console.log('[Pet] 数据库表初始化完成');
}

// ========== 灵兽模板数据 ==========
function getPetTemplates() {
  return [
    { templateId: 'spirit_fox', name: 'Spirit Fox', nameCn: '灵狐', description: '火属性灵兽，擅长速度和暴击', baseHealth: 1200, baseAttack: 120, baseDefense: 60, baseSpeed: 90, maxForm: 5, rarity: 'rare', icon: '🦊', learnableSkills: ['fireball', 'speed_up', 'critical_strike'] },
    { templateId: 'thunder_bird', name: 'Thunder Bird', nameCn: '雷鸟', description: '雷属性灵兽，擅长群体攻击', baseHealth: 1500, baseAttack: 100, baseDefense: 80, baseSpeed: 70, maxForm: 5, rarity: 'epic', icon: '🐦', learnableSkills: ['thunder_bolt', 'chain_lightning', 'shield'] },
    { templateId: 'ice_dragon', name: 'Ice Dragon', nameCn: '冰龙', description: '冰属性灵兽，擅长控制和防御', baseHealth: 2000, baseAttack: 80, baseDefense: 120, baseSpeed: 50, maxForm: 5, rarity: 'legendary', icon: '🐉', learnableSkills: ['frost_nova', 'ice_shield', 'freeze'] },
    { templateId: 'flame_lion', name: 'Flame Lion', nameCn: '火狮', description: '火属性灵兽，擅长单体高伤害', baseHealth: 1800, baseAttack: 150, baseDefense: 70, baseSpeed: 60, maxForm: 5, rarity: 'epic', icon: '🦁', learnableSkills: ['fire_blast', 'roar', 'burn'] },
    { templateId: 'shadow_panther', name: 'Shadow Panther', nameCn: '暗豹', description: '暗属性灵兽，擅长暴击和闪避', baseHealth: 1000, baseAttack: 140, baseDefense: 50, baseSpeed: 100, maxForm: 5, rarity: 'rare', icon: '🐆', learnableSkills: ['shadow_strike', 'evade', 'backstab'] },
    { templateId: 'cloud_crane', name: 'Cloud Crane', nameCn: '云鹤', description: '风属性灵兽，擅长治疗和辅助', baseHealth: 900, baseAttack: 70, baseDefense: 90, baseSpeed: 85, maxForm: 5, rarity: 'normal', icon: '🦢', learnableSkills: ['heal', 'wind_shield', 'cloud_step'] },
    { templateId: 'earth_turtle', name: 'Earth Turtle', nameCn: '地龟', description: '土属性灵兽，擅长持久战和防御', baseHealth: 3000, baseAttack: 60, baseDefense: 150, baseSpeed: 30, maxForm: 5, rarity: 'rare', icon: '🐢', learnableSkills: ['shell_defense', 'earthquake', 'fortify'] },
    { templateId: 'celestial_deer', name: 'Celestial Deer', nameCn: '天鹿', description: '光属性灵兽，擅长增益和净化', baseHealth: 1100, baseAttack: 90, baseDefense: 80, baseSpeed: 75, maxForm: 5, rarity: 'epic', icon: '🦌', learnableSkills: ['divine_blessing', 'purify', 'light_arrow'] },
  ];
}

// ========== 进化配置数据 ==========
function getEvolutionConfigs() {
  return [
    { fromForm: 1, toForm: 2, costItem: 'evolution_stone', costAmount: 5, statMultiplier: 1.3, description: '消耗5个进化石进化到第二形态' },
    { fromForm: 2, toForm: 3, costItem: 'evolution_stone', costAmount: 10, statMultiplier: 1.6, description: '消耗10个进化石进化到第三形态' },
    { fromForm: 3, toForm: 4, costItem: 'evolution_stone', costAmount: 20, statMultiplier: 2.0, description: '消耗20个进化石进化到第四形态' },
    { fromForm: 4, toForm: 5, costItem: 'evolution_stone', costAmount: 50, statMultiplier: 2.5, description: '消耗50个进化石进化到最终形态' },
  ];
}

// ========== 辅助函数 ==========
function getUserId(req) {
  return parseInt(req.query.player_id || req.query.userId || req.query.playerId || req.body.player_id || req.body.userId || req.body.playerId || 1);
}

function parsePet(row) {
  if (!row) return null;
  return {
    petId: row.pet_id,
    playerId: row.player_id,
    templateId: row.template_id,
    name: row.name,
    nameCn: row.name_cn,
    level: row.level,
    exp: row.exp,
    form: row.form,
    talentLevel: row.talent_level,
    maxLevel: row.max_level,
    health: row.health,
    attack: row.attack,
    defense: row.defense,
    speed: row.speed,
    skills: JSON.parse(row.skills || '[]'),
    innateSkills: JSON.parse(row.innate_skills || '[]'),
    appearance: row.appearance,
    equipped: !!row.equipped,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function generatePetId() {
  return 'pet_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ========== 路由 ==========

// GET /api/pet/list - 获取灵兽列表
router.get('/list', (req, res) => {
  try {
    const database = getDb(req);
    initPetTables(database);
    
    const playerId = getUserId(req);
    const pets = database.prepare('SELECT * FROM pets WHERE player_id = ? ORDER BY level DESC').all(playerId);
    
    res.json({
      success: true,
      data: {
        pets: pets.map(parsePet),
        total: pets.length
      }
    });
  } catch (error) {
    console.error('[Pet /list]', error);
    res.json({ success: false, message: '获取灵兽列表失败' });
  }
});

// GET /api/pet/templates - 获取灵兽模板列表
router.get('/templates', (req, res) => {
  try {
    const database = getDb(req);
    initPetTables(database);
    
    const templates = database.prepare('SELECT * FROM pet_templates').all();
    
    res.json({
      success: true,
      data: {
        templates: templates.map(t => ({
          ...t,
          learnableSkills: JSON.parse(t.learnable_skills || '[]')
        }))
      }
    });
  } catch (error) {
    console.error('[Pet /templates]', error);
    res.json({ success: false, message: '获取灵兽模板失败' });
  }
});

// GET /api/pet/evolution-info - 获取进化配置
router.get('/evolution-info', (req, res) => {
  try {
    const database = getDb(req);
    initPetTables(database);
    
    const playerId = getUserId(req);
    const petId = req.query.pet_id || req.query.petId;
    
    let pet = null;
    if (petId) {
      const row = database.prepare('SELECT * FROM pets WHERE pet_id = ? AND player_id = ?').get(petId, playerId);
      pet = parsePet(row);
    }
    
    const configs = database.prepare('SELECT * FROM pet_evolution_configs').all();
    
    res.json({
      success: true,
      data: {
        configs: configs.map(c => ({
          fromForm: c.from_form,
          toForm: c.to_form,
          costItem: c.cost_item,
          costAmount: c.cost_amount,
          statMultiplier: c.stat_multiplier,
          description: c.description
        })),
        currentPet: pet
      }
    });
  } catch (error) {
    console.error('[Pet /evolution-info]', error);
    res.json({ success: false, message: '获取进化信息失败' });
  }
});

// POST /api/pet/equip - 装备灵兽
router.post('/equip', (req, res) => {
  try {
    const database = getDb(req);
    initPetTables(database);
    
    const playerId = getUserId(req);
    const { pet_id, petId } = req.body;
    const targetPetId = pet_id || petId;
    
    if (!targetPetId) {
      return res.json({ success: false, message: '缺少 pet_id 参数' });
    }
    
    // 验证灵兽属于该玩家
    const pet = database.prepare('SELECT * FROM pets WHERE pet_id = ? AND player_id = ?').get(targetPetId, playerId);
    if (!pet) {
      return res.json({ success: false, message: '灵兽不存在' });
    }
    
    // 先卸下当前装备的灵兽
    database.prepare('UPDATE pets SET equipped = 0 WHERE player_id = ? AND equipped = 1').run(playerId);
    
    // 装备新灵兽
    database.prepare('UPDATE pets SET equipped = 1, updated_at = ? WHERE pet_id = ?').run(Date.now(), targetPetId);
    
    const updated = database.prepare('SELECT * FROM pets WHERE pet_id = ?').get(targetPetId);
    
    res.json({
      success: true,
      message: '灵兽装备成功',
      data: parsePet(updated)
    });
  } catch (error) {
    console.error('[Pet /equip]', error);
    res.json({ success: false, message: '装备灵兽失败' });
  }
});

// POST /api/pet/unequip - 卸下灵兽
router.post('/unequip', (req, res) => {
  try {
    const database = getDb(req);
    const playerId = getUserId(req);
    const { pet_id, petId } = req.body;
    const targetPetId = pet_id || petId;
    
    if (!targetPetId) {
      return res.json({ success: false, message: '缺少 pet_id 参数' });
    }
    
    const result = database.prepare('UPDATE pets SET equipped = 0, updated_at = ? WHERE pet_id = ? AND player_id = ?').run(Date.now(), targetPetId, playerId);
    
    if (result.changes === 0) {
      return res.json({ success: false, message: '灵兽不存在或未装备' });
    }
    
    res.json({
      success: true,
      message: '灵兽已卸下'
    });
  } catch (error) {
    console.error('[Pet /unequip]', error);
    res.json({ success: false, message: '卸下灵兽失败' });
  }
});

// GET /api/pet/equipped - 获取当前装备的灵兽
router.get('/equipped', (req, res) => {
  try {
    const database = getDb(req);
    const playerId = getUserId(req);
    
    const pet = database.prepare('SELECT * FROM pets WHERE player_id = ? AND equipped = 1').get(playerId);
    
    res.json({
      success: true,
      data: pet ? parsePet(pet) : null
    });
  } catch (error) {
    console.error('[Pet /equipped]', error);
    res.json({ success: false, message: '获取装备灵兽失败' });
  }
});

// POST /api/pet/evolve - 灵兽进化
router.post('/evolve', (req, res) => {
  try {
    const database = getDb(req);
    initPetTables(database);
    
    const playerId = getUserId(req);
    const { pet_id, petId } = req.body;
    const targetPetId = pet_id || petId;
    
    if (!targetPetId) {
      return res.json({ success: false, message: '缺少 pet_id 参数' });
    }
    
    const pet = database.prepare('SELECT * FROM pets WHERE pet_id = ? AND player_id = ?').get(targetPetId, playerId);
    if (!pet) {
      return res.json({ success: false, message: '灵兽不存在' });
    }
    
    const currentForm = pet.form;
    const config = database.prepare('SELECT * FROM pet_evolution_configs WHERE from_form = ?').get(currentForm);
    
    if (!config) {
      return res.json({ success: false, message: '灵兽已达到最高形态' });
    }
    
    // 检查进化道具
    const materialRow = database.prepare("SELECT * FROM player_items WHERE player_id = ? AND item_id = ?").get(playerId, config.cost_item);
    if (!materialRow || materialRow.count < config.cost_amount) {
      return res.json({ success: false, message: `进化需要 ${config.cost_amount} 个 ${config.cost_item}，材料不足` });
    }
    
    // 扣除道具
    database.prepare('UPDATE player_items SET count = count - ? WHERE player_id = ? AND item_id = ?').run(config.cost_amount, playerId, config.cost_item);
    
    // 更新灵兽形态和属性
    const newForm = config.to_form;
    const newHealth = Math.floor(pet.base_health || pet.health * config.stat_multiplier);
    const newAttack = Math.floor(pet.base_attack || pet.attack * config.stat_multiplier);
    const newDefense = Math.floor(pet.base_defense || pet.defense * config.stat_multiplier);
    const newSpeed = Math.floor(pet.base_speed || pet.speed * config.stat_multiplier);
    
    database.prepare(`
      UPDATE pets SET 
        form = ?,
        health = ?,
        attack = ?,
        defense = ?,
        speed = ?,
        updated_at = ?
      WHERE pet_id = ?
    `).run(newForm, newHealth, newAttack, newDefense, newSpeed, Date.now(), targetPetId);
    
    const updated = database.prepare('SELECT * FROM pets WHERE pet_id = ?').get(targetPetId);
    
    res.json({
      success: true,
      message: `灵兽进化成功，当前形态：${newForm}`,
      data: parsePet(updated)
    });
  } catch (error) {
    console.error('[Pet /evolve]', error);
    res.json({ success: false, message: '灵兽进化失败' });
  }
});

// POST /api/pet/create - 创建灵兽（捕捉/获得）
router.post('/create', (req, res) => {
  try {
    const database = getDb(req);
    initPetTables(database);
    
    const playerId = getUserId(req);
    const { template_id, templateId, name } = req.body;
    const tId = template_id || templateId || 'spirit_fox';
    
    // 获取模板
    const template = database.prepare('SELECT * FROM pet_templates WHERE template_id = ?').get(tId);
    if (!template) {
      return res.json({ success: false, message: '灵兽模板不存在' });
    }
    
    const petId = generatePetId();
    const petName = name || template.name_cn || template.name;
    
    database.prepare(`
      INSERT INTO pets (pet_id, player_id, template_id, name, name_cn, level, exp, form, talent_level, max_level, health, attack, defense, speed, skills, innate_skills, equipped, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, 0, 1, 'normal', 100, ?, ?, ?, ?, '[]', '[]', 0, ?, ?)
    `).run(petId, playerId, tId, petName, template.name_cn, template.base_health, template.base_attack, template.base_defense, template.base_speed, Date.now(), Date.now());
    
    const pet = database.prepare('SELECT * FROM pets WHERE pet_id = ?').get(petId);
    
    res.json({
      success: true,
      message: `获得灵兽：${petName}`,
      data: parsePet(pet)
    });
  } catch (error) {
    console.error('[Pet /create]', error);
    res.json({ success: false, message: '创建灵兽失败' });
  }
});

// GET /api/pet/ - 根路由
router.get('/', (req, res) => {
  try {
    const database = getDb(req);
    initPetTables(database);
    const playerId = getUserId(req);
    
    const pets = database.prepare('SELECT * FROM pets WHERE player_id = ? ORDER BY level DESC').all(playerId);
    const templates = database.prepare('SELECT * FROM pet_templates').all();
    const equipped = database.prepare('SELECT * FROM pets WHERE player_id = ? AND equipped = 1').get(playerId);
    
    res.json({
      success: true,
      data: {
        pets: pets.map(parsePet),
        templates: templates.map(t => ({ ...t, learnableSkills: JSON.parse(t.learnable_skills || '[]') })),
        equipped: equipped ? parsePet(equipped) : null
      }
    });
  } catch (error) {
    console.error('[Pet /]', error);
    res.json({ success: false, message: '获取灵兽信息失败' });
  }
});

module.exports = router;
