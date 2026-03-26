/**
 * 宠物/灵兽系统 API
 * 包含：宠物数据结构、捕捉、培养/升级、战斗加成计算
 */

const express = require('express');
const router = express.Router();

// 数据库连接 (由 initBeastDatabase 设置)
let db = null;

// ============ 灵兽配置数据 ============

// 灵兽数据
const BEAST_DATA = {
  'spirit_fox': {
    id: 'spirit_fox',
    name: '灵狐',
    type: 'beast',
    quality: 'common',
    icon: '🦊',
    base_atk: 10,
    base_hp: 50,
    growth_atk: 2,
    growth_hp: 10,
    skill: 'spirit_bite',
    skill_name: '灵气撕咬',
    description: '普通攻击，有几率吸取灵气',
    capture_rate: 0.5,
    habitat: 'forest',
    rarity: 1
  },
  'thunder_eagle': {
    id: 'thunder_eagle',
    name: '雷鹰',
    type: 'beast',
    quality: 'uncommon',
    icon: '🦅',
    base_atk: 30,
    base_hp: 120,
    growth_atk: 5,
    growth_hp: 20,
    skill: 'thunder_claw',
    skill_name: '雷爪',
    description: '高伤害攻击，有几率麻痹敌人',
    capture_rate: 0.3,
    habitat: 'mountain',
    rarity: 2
  },
  'flame_qilin': {
    id: 'flame_qilin',
    name: '火麒麟',
    type: 'beast',
    quality: 'rare',
    icon: '🦄',
    base_atk: 80,
    base_hp: 300,
    growth_atk: 12,
    growth_hp: 50,
    skill: 'flame_breath',
    skill_name: '火焰吐息',
    description: '范围伤害，附带灼烧效果',
    capture_rate: 0.15,
    habitat: 'volcano',
    rarity: 3
  },
  'ice_phoenix': {
    id: 'ice_phoenix',
    name: '冰凤凰',
    type: 'beast',
    quality: 'epic',
    icon: '🦚',
    base_atk: 200,
    base_hp: 800,
    growth_atk: 30,
    growth_hp: 120,
    skill: 'ice_freeze',
    skill_name: '冰封',
    description: '冰冻敌人，减速效果',
    capture_rate: 0.08,
    habitat: 'ice_plain',
    rarity: 4
  },
  'divine_dragon': {
    id: 'divine_dragon',
    name: '神龙',
    type: 'beast',
    quality: 'legendary',
    icon: '🐉',
    base_atk: 500,
    base_hp: 2000,
    growth_atk: 80,
    growth_hp: 300,
    skill: 'dragon_roar',
    skill_name: '龙吟',
    description: '终极技能，恐惧效果',
    capture_rate: 0.03,
    habitat: 'sky',
    rarity: 5
  },
  'chaos_beast': {
    id: 'chaos_beast',
    name: '混沌兽',
    type: 'beast',
    quality: 'mythical',
    icon: '👹',
    base_atk: 1500,
    base_hp: 6000,
    growth_atk: 200,
    growth_hp: 800,
    skill: 'chaos_annihilation',
    skill_name: '混沌灭世',
    description: '毁天灭地的终极力量',
    capture_rate: 0.01,
    habitat: 'void',
    rarity: 6
  }
};

// 灵兽品质配置
const BEAST_QUALITY = {
  common: { name: '普通', color: '#8B8B8B', capture_bonus: 1.0, bonus_multiplier: 1.0 },
  uncommon: { name: '优秀', color: '#00FF7F', capture_bonus: 1.2, bonus_multiplier: 1.2 },
  rare: { name: '稀有', color: '#1E90FF', capture_bonus: 1.5, bonus_multiplier: 1.5 },
  epic: { name: '史诗', color: '#9932CC', capture_bonus: 2.0, bonus_multiplier: 2.0 },
  legendary: { name: '传说', color: '#FFD700', capture_bonus: 3.0, bonus_multiplier: 3.0 },
  mythical: { name: '神话', color: '#FF4500', capture_bonus: 5.0, bonus_multiplier: 5.0 }
};

// 灵兽技能配置
const BEAST_SKILLS = {
  'spirit_bite': { name: '灵气撕咬', damage: 1.2, effect: 'spirit_drain', effect_chance: 0.2 },
  'thunder_claw': { name: '雷爪', damage: 1.5, effect: 'stun', effect_chance: 0.3 },
  'flame_breath': { name: '火焰吐息', damage: 1.8, effect: 'burn', effect_chance: 0.4 },
  'ice_freeze': { name: '冰封', damage: 1.3, effect: 'freeze', effect_chance: 0.35 },
  'dragon_roar': { name: '龙吟', damage: 2.5, effect: 'fear', effect_chance: 0.5 },
  'chaos_annihilation': { name: '混沌灭世', damage: 5.0, effect: 'chaos', effect_chance: 1.0 }
};

// 灵兽心情配置
const BEAST_MOOD = {
  happy: { bonus: 1.3, name: '开心', color: '#FFD700' },
  normal: { bonus: 1.0, name: '普通', color: '#8B8B8B' },
  sad: { bonus: 0.7, name: '低落', color: '#4169E1' },
  angry: { bonus: 0.5, name: '愤怒', color: '#FF4500' }
};

// 灵兽亲密度配置
const BEAST_AFFECTION = {
  love: { threshold: 100, bonus: 1.5, name: '生死与共', color: '#FF69B4' },
  close: { threshold: 70, bonus: 1.3, name: '亲密', color: '#FF1493' },
  friendly: { threshold: 40, bonus: 1.1, name: '友好', color: '#32CD32' },
  neutral: { threshold: 10, bonus: 1.0, name: '陌生', color: '#8B8B8B' },
  hostile: { threshold: 0, bonus: 0.5, name: '敌对', color: '#FF0000' }
};

// 灵兽升级经验曲线
const BEAST_EXP_CURVE = (level) => Math.floor(100 * Math.pow(1.5, level - 1));

// 灵兽饲料配置
const BEAST_FOODS = {
  'beast_food': { id: 'beast_food', name: '灵兽饲料', affection: 10, cost: 10, icon: '🌿' },
  'beast_treat': { id: 'beast_treat', name: '灵兽零食', affection: 30, cost: 50, icon: '🍖' },
  'beast_meat': { id: 'beast_meat', name: '灵兽肉干', affection: 50, cost: 200, icon: '🥩' },
  'divine_food': { id: 'divine_food', name: '神兽美食', affection: 100, cost: 1000, icon: '🍜' }
};

// 灵兽栏位扩展配置
const BEAST_SLOT_UPGRADE = {
  5: { slots: 5, cost: 0, name: '初始栏位' },
  10: { slots: 10, cost: 10000, name: '扩展至10格' },
  15: { slots: 15, cost: 50000, name: '扩展至15格' },
  20: { slots: 20, cost: 200000, name: '扩展至20格' }
};

// ============ 辅助函数 ============

// 获取灵兽亲密度等级
function getAffectionLevel(affection) {
  const levels = Object.values(BEAST_AFFECTION).reverse();
  return levels.find(level => affection >= level.threshold) || BEAST_AFFECTION.neutral;
}

// 计算灵兽属性
function calculateBeastStats(beast, beastTemplate) {
  if (!beast || !beastTemplate) return null;

  const affectionData = getAffectionLevel(beast.affection);
  const moodBonus = BEAST_MOOD[beast.mood]?.bonus || 1;

  const baseAtk = beastTemplate.base_atk + (beast.level - 1) * beastTemplate.growth_atk;
  const baseHp = beastTemplate.base_hp + (beast.level - 1) * beastTemplate.growth_hp;

  return {
    atk: Math.floor(baseAtk * affectionData.bonus * moodBonus),
    hp: Math.floor(baseHp * affectionData.bonus * moodBonus),
    level: beast.level,
    affection: beast.affection,
    affection_level: affectionData.name,
    mood: beast.mood,
    mood_bonus: moodBonus,
    skill: beastTemplate.skill_name
  };
}

// ============ 数据库表初始化 ============

// 导出初始化函数供主服务器调用
function initBeastDatabase(database) {
  // 如果已初始化，检查是否是相同数据库；否则覆盖（支持多进程场景）
  if (db && db !== database) {
    // 不同数据库实例，比较路径
    const existingPath = db.name || '';
    const newPath = database.name || '';
    if (existingPath !== newPath) {
      console.log('[beast_api] initBeastDatabase: switching db from', existingPath, 'to', newPath);
      db = database;
    } else {
      console.log('[beast_api] initBeastDatabase skipped (same db already initialized)');
    }
    return;
  }
  if (db) return; // already initialized with same db
  db = database;
  db.exec(`
    CREATE TABLE IF NOT EXISTS beast_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      quality TEXT NOT NULL,
      icon TEXT,
      base_atk INTEGER DEFAULT 10,
      base_hp INTEGER DEFAULT 50,
      growth_atk INTEGER DEFAULT 2,
      growth_hp INTEGER DEFAULT 10,
      skill TEXT,
      skill_name TEXT,
      description TEXT,
      capture_rate REAL DEFAULT 0.3,
      habitat TEXT,
      rarity INTEGER DEFAULT 1
    )
  `);

  // 玩家灵兽表
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_beasts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      beast_id TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      exp INTEGER DEFAULT 0,
      affection INTEGER DEFAULT 50,
      mood TEXT DEFAULT 'normal',
      mood_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER DEFAULT 0,
      obtained_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(player_id, beast_id)
    )
  `);

  // 玩家灵兽栏位表
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_beast_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL UNIQUE,
      slots INTEGER DEFAULT 5,
      upgraded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 玩家灵兽捕捉记录
  db.exec(`
    CREATE TABLE IF NOT EXISTS beast_capture_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      beast_id TEXT NOT NULL,
      success INTEGER DEFAULT 1,
      capture_rate REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 灵兽捕捉保底计数器（90次未出神话则下次必出混沌兽）
  db.exec(`
    CREATE TABLE IF NOT EXISTS beast_pity_counter (
      player_id INTEGER PRIMARY KEY,
      consecutive_non_mythical INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 灵兽战斗记录
  db.exec(`
    CREATE TABLE IF NOT EXISTS beast_battle_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      beast_id INTEGER NOT NULL,
      battle_type TEXT NOT NULL,
      damage INTEGER DEFAULT 0,
      exp_gained INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 种子数据
  const count = db.prepare('SELECT COUNT(*) as count FROM beast_templates').get();
  if (count.count === 0) {
    const stmt = db.prepare(`
      INSERT INTO beast_templates
      (id, name, type, quality, icon, base_atk, base_hp, growth_atk, growth_hp, skill, skill_name, description, capture_rate, habitat, rarity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const [id, beast] of Object.entries(BEAST_DATA)) {
      stmt.run(
        id, beast.name, beast.type, beast.quality, beast.icon,
        beast.base_atk, beast.base_hp, beast.growth_atk, beast.growth_hp,
        beast.skill, beast.skill_name, beast.description, beast.capture_rate, beast.habitat, beast.rarity
      );
    }
    console.log('灵兽数据种子完成');
  }
}

// ============ API 路由 ============

// 获取灵兽类型列表（/list 的别名，保持API兼容性）
router.get('/types', (req, res) => {
  try {
    const { habitat } = req.query;

    let sql = 'SELECT * FROM beast_templates';
    const params = [];

    if (habitat) {
      sql += ' WHERE habitat = ?';
      params.push(habitat);
    }

    sql += ' ORDER BY rarity DESC, capture_rate ASC';

    const beasts = db.prepare(sql).all(...params);

    // 获取玩家已拥有的灵兽
    const playerId = req.query.player_id;
    let ownedBeasts = [];
    if (playerId) {
      ownedBeasts = db.prepare('SELECT beast_id FROM player_beasts WHERE player_id = ?').all(playerId);
    }

    const ownedIds = new Set(ownedBeasts.map(b => b.beast_id));

    const result = beasts.map(b => ({
      ...b,
      owned: ownedIds.has(b.id) ? true : null
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('获取灵兽类型失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取灵兽列表（所有可捕捉的灵兽）
router.get('/list', (req, res) => {
  try {
    const { player_id, habitat } = req.query;

    let sql = 'SELECT * FROM beast_templates';
    const params = [];

    if (habitat) {
      sql += ' WHERE habitat = ?';
      params.push(habitat);
    }

    sql += ' ORDER BY rarity DESC, capture_rate ASC';

    const beasts = db.prepare(sql).all(...params);

    // 获取玩家已拥有的灵兽
    const ownedBeasts = {};
    if (player_id) {
      const owned = db.prepare('SELECT beast_id, level, affection, is_active FROM player_beasts WHERE player_id = ?').all(player_id);
      owned.forEach(b => { ownedBeasts[b.beast_id] = { level: b.level, affection: b.affection, is_active: b.is_active }; });
    }

    const result = beasts.map(b => ({
      id: b.id,
      name: b.name,
      quality: b.quality,
      quality_name: BEAST_QUALITY[b.quality]?.name || b.quality,
      icon: b.icon,
      base_atk: b.base_atk,
      base_hp: b.base_hp,
      growth_atk: b.growth_atk,
      growth_hp: b.growth_hp,
      skill: b.skill_name,
      description: b.description,
      capture_rate: b.capture_rate,
      habitat: b.habitat,
      rarity: b.rarity,
      owned: ownedBeasts[b.id] || null
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取灵兽捕捉保底进度
router.get('/pity/status', (req, res) => {
  try {
    const { player_id } = req.query;
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id' });
    }
    
    let pity = db.prepare('SELECT * FROM beast_pity_counter WHERE player_id = ?').get(player_id);
    if (!pity) {
      db.prepare('INSERT INTO beast_pity_counter (player_id, consecutive_non_mythical) VALUES (?, 0)').run(player_id);
      pity = { consecutive_non_mythical: 0 };
    }
    
    const remaining = Math.max(0, 90 - pity.consecutive_non_mythical);
    const nextMythicalIn = remaining === 0 ? '下次捕捉必出神话！' : `还差 ${remaining} 次`;
    
    res.json({
      success: true,
      data: {
        consecutive_non_mythical: pity.consecutive_non_mythical,
        pity_threshold: 90,
        remaining_to_guaranteed: remaining,
        next_mythical_hint: nextMythicalIn,
        guaranteed_active: pity.consecutive_non_mythical >= 90
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取灵兽详情
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { player_id } = req.query;

    const beast = db.prepare('SELECT * FROM beast_templates WHERE id = ?').get(id);
    if (!beast) {
      return res.status(404).json({ success: false, error: '灵兽不存在' });
    }

    // 获取玩家拥有的该灵兽信息
    let playerBeast = null;
    if (player_id) {
      playerBeast = db.prepare('SELECT * FROM player_beasts WHERE player_id = ? AND beast_id = ?').get(player_id, id);
    }

    const result = {
      ...beast,
      quality_name: BEAST_QUALITY[beast.quality]?.name || beast.quality,
      skill_detail: BEAST_SKILLS[beast.skill] || null,
      owned: playerBeast ? {
        level: playerBeast.level,
        exp: playerBeast.exp,
        affection: playerBeast.affection,
        mood: playerBeast.mood,
        is_active: playerBeast.is_active,
        exp_to_next: BEAST_EXP_CURVE(playerBeast.level),
        stats: calculateBeastStats(playerBeast, beast)
      } : null
    };

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ 宠物捕捉 API ============

// 捕捉灵兽
router.post('/capture', (req, res) => {
  try {
    const { player_id, beast_id } = req.body;
    
    if (!player_id || !beast_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数 player_id 或 beast_id' });
    }
    
    // 获取玩家
    let player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    let actualPlayerId = player_id;
    
    if (!player) {
      const result = db.prepare('INSERT INTO player (username, spirit_stones, level, realm_level) VALUES (?, ?, ?, ?)').run(`player_${player_id}`, 10000, 1, 0);
      actualPlayerId = result.lastInsertRowid;
      player = db.prepare('SELECT * FROM player WHERE id = ?').get(actualPlayerId);
    }
    
    // === 保底系统：检查保底计数器 ===
    let pityCounter = db.prepare('SELECT * FROM beast_pity_counter WHERE player_id = ?').get(actualPlayerId);
    if (!pityCounter) {
      db.prepare('INSERT INTO beast_pity_counter (player_id, consecutive_non_mythical) VALUES (?, 0)').run(actualPlayerId);
      pityCounter = { consecutive_non_mythical: 0 };
    }
    
    // 获取灵兽模板
    const beastTemplate = db.prepare('SELECT * FROM beast_templates WHERE id = ?').get(beast_id);
    if (!beastTemplate) {
      return res.status(404).json({ success: false, error: '灵兽不存在' });
    }
    
    // 检查是否已拥有该灵兽
    const existingBeast = db.prepare('SELECT * FROM player_beasts WHERE player_id = ? AND beast_id = ?').get(actualPlayerId, beast_id);
    if (existingBeast) {
      return res.status(400).json({ success: false, error: '已拥有该灵兽' });
    }
    
    // 获取玩家灵兽栏位
    let slotRecord = db.prepare('SELECT * FROM player_beast_slots WHERE player_id = ?').get(actualPlayerId);
    if (!slotRecord) {
      db.prepare('INSERT INTO player_beast_slots (player_id, slots) VALUES (?, 5)').run(actualPlayerId);
      slotRecord = { slots: 5 };
    }
    
    // 检查灵兽栏位是否已满
    const currentBeasts = db.prepare('SELECT COUNT(*) as count FROM player_beasts WHERE player_id = ?').get(actualPlayerId);
    if (currentBeasts.count >= slotRecord.slots) {
      return res.status(400).json({ success: false, error: `灵兽栏位已满（${slotRecord.slots}格），请扩展栏位` });
    }
    
    // === 保底逻辑：90次未出神话，下次必出混沌兽 ===
    let guaranteedPity = pityCounter.consecutive_non_mythical >= 90;
    let captureResult;
    let finalBeastTemplate = beastTemplate;
    
    if (guaranteedPity) {
      // 保底触发：强制捕捉混沌兽
      finalBeastTemplate = db.prepare("SELECT * FROM beast_templates WHERE id = 'chaos_beast'").get();
      if (!finalBeastTemplate) {
        return res.status(500).json({ success: false, error: '混沌兽模板不存在' });
      }
      
      // 检查是否已有混沌兽
      const existingChaos = db.prepare('SELECT * FROM player_beasts WHERE player_id = ? AND beast_id = ?').get(actualPlayerId, 'chaos_beast');
      if (existingChaos) {
        // 已有混沌兽，保底转为基础成功率
        guaranteedPity = false;
      } else {
        captureResult = { success: true, guaranteed: true };
      }
    }
    
    if (!guaranteedPity) {
      // 正常捕捉流程
      const baseRate = beastTemplate.capture_rate || 0.3;
      const realmBonus = player.realm_level * 0.02;
      const qualityBonus = BEAST_QUALITY[beastTemplate.quality]?.capture_bonus || 1;
      const finalRate = Math.min(0.8, baseRate * qualityBonus + realmBonus);
      
      db.prepare('INSERT INTO beast_capture_records (player_id, beast_id, success, capture_rate) VALUES (?, ?, ?, ?)').run(actualPlayerId, beast_id, 0, finalRate);
      
      const roll = Math.random();
      captureResult = { success: roll <= finalRate, guaranteed: false, roll, finalRate };
    }
    
    if (!captureResult.success) {
      // 捕捉失败：如果是神话兽逃走，仍重置保底（因为已经见过神话了）
      const isMythical = beastTemplate.quality === 'mythical';
      if (isMythical) {
        db.prepare('UPDATE beast_pity_counter SET consecutive_non_mythical = 0, updated_at = datetime("now") WHERE player_id = ?').run(actualPlayerId);
      } else {
        db.prepare('UPDATE beast_pity_counter SET consecutive_non_mythical = consecutive_non_mythical + 1, updated_at = datetime("now") WHERE player_id = ?').run(actualPlayerId);
      }
      
      return res.json({
        success: false,
        message: `捕捉${beastTemplate.name}失败！它逃走了`,
        data: {
          beast_id,
          beast_name: beastTemplate.name,
          capture_rate: captureResult.finalRate || null,
          roll: captureResult.roll || null,
          escaped: true,
          pity_counter: pityCounter.consecutive_non_mythical + (isMythical ? 0 : 1),
          pity_triggered: false
        }
      });
    }
    
    // 成功捕捉
    const moodOptions = ['happy', 'normal', 'normal', 'sad'];
    const randomMood = moodOptions[Math.floor(Math.random() * moodOptions.length)];
    
    db.prepare(`
      INSERT INTO player_beasts (player_id, beast_id, level, exp, affection, mood, is_active)
      VALUES (?, ?, 1, 0, 50, ?, 0)
    `).run(actualPlayerId, finalBeastTemplate.id, randomMood);
    
    // 更新捕捉成功记录
    if (!guaranteedPity) {
      db.prepare('UPDATE beast_capture_records SET success = 1 WHERE player_id = ? AND beast_id = ? AND success = 0 ORDER BY created_at DESC LIMIT 1').run(actualPlayerId, beast_id);
    }
    
    // 保底重置（成功捕捉神话 → 重置计数器）
    db.prepare('UPDATE beast_pity_counter SET consecutive_non_mythical = 0, updated_at = datetime("now") WHERE player_id = ?').run(actualPlayerId);
    
    const isMythicalCaught = finalBeastTemplate.quality === 'mythical';
    res.json({
      success: true,
      message: isMythicalCaught && captureResult.guaranteed
        ? `🎉 保底成功！获得${finalBeastTemplate.name}！`
        : `🎉 成功捕捉${finalBeastTemplate.name}！`,
      data: {
        beast_id: finalBeastTemplate.id,
        beast_name: finalBeastTemplate.name,
        icon: finalBeastTemplate.icon,
        quality: finalBeastTemplate.quality,
        quality_name: BEAST_QUALITY[finalBeastTemplate.quality]?.name,
        level: 1,
        affection: 50,
        mood: randomMood,
        capture_rate: captureResult.finalRate || null,
        pity_counter: 0,
        pity_triggered: !!guaranteedPity
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ 宠物培养/升级 API ============

// 获取玩家所有灵兽
router.get('/my/list', (req, res) => {
  try {
    const { player_id } = req.query;

    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id' });
    }

    // 获取玩家灵兽
    const beasts = db.prepare(`
      SELECT pb.*, bt.name, bt.icon, bt.quality, bt.base_atk, bt.base_hp,
             bt.growth_atk, bt.growth_hp, bt.skill, bt.skill_name, bt.rarity
      FROM player_beasts pb
      JOIN beast_templates bt ON pb.beast_id = bt.id
      WHERE pb.player_id = ?
      ORDER BY pb.is_active DESC, pb.level DESC, pb.obtained_at DESC
    `).all(player_id);

    // 获取栏位信息
    let slotRecord = db.prepare('SELECT * FROM player_beast_slots WHERE player_id = ?').get(player_id);
    if (!slotRecord) {
      slotRecord = { slots: 5 };
    }

    const result = {
      slots: slotRecord.slots,
      beasts: beasts.map(b => {
        const template = {
          base_atk: b.base_atk,
          base_hp: b.base_hp,
          growth_atk: b.growth_atk,
          growth_hp: b.growth_hp
        };
        const stats = calculateBeastStats(b, template);

        return {
          id: b.id,
          beast_id: b.beast_id,
          name: b.name,
          icon: b.icon,
          quality: b.quality,
          quality_name: BEAST_QUALITY[b.quality]?.name,
          level: b.level,
          exp: b.exp,
          exp_to_next: BEAST_EXP_CURVE(b.level),
          affection: b.affection,
          affection_level: getAffectionLevel(b.affection).name,
          mood: b.mood,
          mood_name: BEAST_MOOD[b.mood]?.name || b.mood,
          is_active: b.is_active === 1,
          skill: b.skill_name,
          rarity: b.rarity,
          stats
        };
      })
    };

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 灵兽升级
router.post('/upgrade', (req, res) => {
  try {
    const { player_id, beast_id, use_spirit_stones } = req.body;

    if (!player_id || !beast_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    // 获取玩家灵兽
    const playerBeast = db.prepare(`
      SELECT pb.*, bt.name, bt.icon, bt.quality, bt.growth_atk, bt.growth_hp
      FROM player_beasts pb
      JOIN beast_templates bt ON pb.beast_id = bt.id
      WHERE pb.id = ? AND pb.player_id = ?
    `).get(beast_id, player_id);

    if (!playerBeast) {
      return res.status(404).json({ success: false, error: '灵兽不存在' });
    }

    // 获取玩家
    const player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);

    // 检查经验是否足够升级
    const expNeeded = BEAST_EXP_CURVE(playerBeast.level);

    if (playerBeast.exp >= expNeeded) {
      // 经验升级
      const newExp = playerBeast.exp - expNeeded;
      const newLevel = playerBeast.level + 1;

      db.prepare('UPDATE player_beasts SET level = ?, exp = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newLevel, newExp, beast_id);

      res.json({
        success: true,
        message: `${playerBeast.name} 升级到 Lv.${newLevel}！`,
        data: {
          beast_id,
          beast_name: playerBeast.name,
          old_level: playerBeast.level,
          new_level: newLevel,
          exp: newExp,
          exp_to_next: BEAST_EXP_CURVE(newLevel)
        }
      });
    } else if (use_spirit_stones) {
      // 灵石直接升级
      const upgradeCost = Math.floor(50 * Math.pow(1.5, playerBeast.level));

      if (player.spirit_stones < upgradeCost) {
        return res.status(400).json({ success: false, error: `灵石不足，需要${upgradeCost}灵石` });
      }

      const newLevel = playerBeast.level + 1;

      db.prepare('UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?').run(upgradeCost, player_id);
      db.prepare('UPDATE player_beasts SET level = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newLevel, beast_id);

      res.json({
        success: true,
        message: `${playerBeast.name} 花费${upgradeCost}灵石升级到 Lv.${newLevel}！`,
        data: {
          beast_id,
          beast_name: playerBeast.name,
          old_level: playerBeast.level,
          new_level: newLevel,
          cost: upgradeCost,
          remaining_spirit_stones: player.spirit_stones - upgradeCost
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        error: `经验不足，需要${expNeeded}经验，当前${playerBeast.exp}经验。可使用use_spirit_stones=true消耗灵石直接升级`
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 喂食灵兽（增加亲密度）
router.post('/feed', (req, res) => {
  try {
    const { player_id, beast_id, food_id } = req.body;

    if (!player_id || !beast_id || !food_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const food = BEAST_FOODS[food_id];
    if (!food) {
      return res.status(400).json({ success: false, error: '饲料不存在' });
    }

    // 获取玩家灵兽
    const playerBeast = db.prepare('SELECT * FROM player_beasts WHERE id = ? AND player_id = ?').get(beast_id, player_id);
    if (!playerBeast) {
      return res.status(404).json({ success: false, error: '灵兽不存在' });
    }

    // 获取灵兽模板
    const beastTemplate = db.prepare('SELECT * FROM beast_templates WHERE id = ?').get(playerBeast.beast_id);

    // 获取玩家
    const player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);

    // 检查灵石
    if (player.spirit_stones < food.cost) {
      return res.status(400).json({ success: false, error: `灵石不足，需要${food.cost}灵石` });
    }

    // 扣除灵石
    db.prepare('UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?').run(food.cost, player_id);

    // 增加亲密度
    const newAffection = Math.min(100, playerBeast.affection + food.affection);

    // 心情变化
    let newMood = playerBeast.mood;
    if (food.affection >= 50) {
      newMood = 'happy';
    } else if (food.affection >= 30 && playerBeast.mood === 'sad') {
      newMood = 'normal';
    } else if (food.affection >= 10 && playerBeast.mood === 'angry') {
      newMood = 'sad';
    }

    db.prepare(`
      UPDATE player_beasts
      SET affection = ?, mood = ?, mood_updated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newAffection, newMood, beast_id);

    res.json({
      success: true,
      message: `${beastTemplate.name} 亲密度+${food.affection}，当前亲密度：${newAffection}`,
      data: {
        beast_id,
        beast_name: beastTemplate.name,
        food: food.name,
        food_icon: food.icon,
        affection_gained: food.affection,
        new_affection: newAffection,
        new_mood: newMood,
        mood_name: BEAST_MOOD[newMood]?.name,
        cost: food.cost,
        remaining_spirit_stones: player.spirit_stones - food.cost
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 激活灵兽（设为参战）
router.post('/activate', (req, res) => {
  try {
    const { player_id, beast_id } = req.body;

    if (!player_id || !beast_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    // 获取玩家灵兽
    const playerBeast = db.prepare('SELECT * FROM player_beasts WHERE id = ? AND player_id = ?').get(beast_id, player_id);
    if (!playerBeast) {
      return res.status(404).json({ success: false, error: '灵兽不存在' });
    }

    // 如果已经是激活状态
    if (playerBeast.is_active === 1) {
      return res.json({ success: true, message: '该灵兽已经是参战状态' });
    }

    // 先取消其他灵兽的激活状态
    db.prepare('UPDATE player_beasts SET is_active = 0 WHERE player_id = ?').run(player_id);

    // 激活指定灵兽
    db.prepare('UPDATE player_beasts SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(beast_id);

    // 获取模板信息
    const beastTemplate = db.prepare('SELECT * FROM beast_templates WHERE id = ?').get(playerBeast.beast_id);

    res.json({
      success: true,
      message: `${beastTemplate.name} 已设为参战灵兽！`,
      data: {
        beast_id,
        beast_name: beastTemplate.name,
        icon: beastTemplate.icon,
        is_active: true
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 取消激活灵兽
router.post('/deactivate', (req, res) => {
  try {
    const { player_id, beast_id } = req.body;

    if (!player_id || !beast_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    // 取消激活
    db.prepare('UPDATE player_beasts SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND player_id = ?').run(beast_id, player_id);

    res.json({
      success: true,
      message: '灵兽已取消参战',
      data: { beast_id, is_active: false }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 扩展灵兽栏位
router.post('/expand-slots', (req, res) => {
  try {
    const { player_id } = req.body;

    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id' });
    }

    // 获取当前栏位
    const slotRecord = db.prepare('SELECT * FROM player_beast_slots WHERE player_id = ?').get(player_id);
    const currentSlots = slotRecord?.slots || 5;

    // 找到下一个升级目标
    let nextUpgrade = null;
    for (const [slots, config] of Object.entries(BEAST_SLOT_UPGRADE)) {
      if (parseInt(slots) > currentSlots) {
        nextUpgrade = { slots: parseInt(slots), ...config };
        break;
      }
    }

    if (!nextUpgrade) {
      return res.status(400).json({ success: false, error: '灵兽栏位已达到最大上限' });
    }

    // 获取玩家
    const player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);

    if (player.spirit_stones < nextUpgrade.cost) {
      return res.status(400).json({ success: false, error: `灵石不足，需要${nextUpgrade.cost}灵石` });
    }

    // 扣除灵石并扩展栏位
    db.prepare('UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?').run(nextUpgrade.cost, player_id);

    if (slotRecord) {
      db.prepare('UPDATE player_beast_slots SET slots = ?, upgraded_at = CURRENT_TIMESTAMP WHERE player_id = ?').run(nextUpgrade.slots, player_id);
    } else {
      db.prepare('INSERT INTO player_beast_slots (player_id, slots) VALUES (?, ?)').run(player_id, nextUpgrade.slots);
    }

    res.json({
      success: true,
      message: `灵兽栏位扩展至${nextUpgrade.slots}格！`,
      data: {
        old_slots: currentSlots,
        new_slots: nextUpgrade.slots,
        cost: nextUpgrade.cost,
        remaining_spirit_stones: player.spirit_stones - nextUpgrade.cost
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ 宠物战斗加成计算 API ============

// 获取灵兽战斗加成
router.get('/battle-bonus', (req, res) => {
  try {
    const { player_id } = req.query;

    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id' });
    }

    // 获取激活的灵兽
    const activeBeast = db.prepare(`
      SELECT pb.*, bt.name, bt.icon, bt.quality, bt.base_atk, bt.base_hp,
             bt.growth_atk, bt.growth_hp, bt.skill, bt.skill_name
      FROM player_beasts pb
      JOIN beast_templates bt ON pb.beast_id = bt.id
      WHERE pb.player_id = ? AND pb.is_active = 1
    `).get(player_id);

    // 获取所有灵兽
    const allBeasts = db.prepare(`
      SELECT pb.*, bt.name, bt.quality, bt.rarity
      FROM player_beasts pb
      JOIN beast_templates bt ON pb.beast_id = bt.id
      WHERE pb.player_id = ?
    `).all(player_id);

    // 灵兽战斗加成配置
    const QUALITY_BONUS = {
      common: { atk: 0.05, hp: 0.05 },
      uncommon: { atk: 0.10, hp: 0.10 },
      rare: { atk: 0.15, hp: 0.15 },
      epic: { atk: 0.20, hp: 0.20 },
      legendary: { atk: 0.30, hp: 0.30 },
      mythical: { atk: 0.50, hp: 0.50 }
    };

    // 计算加成
    const bonus = {
      atk_bonus: 0,
      hp_bonus: 0,
      crit_rate_bonus: 0,
      spirit_rate_bonus: 0,
      exp_rate_bonus: 0,
      drop_rate_bonus: 0,
      special_effects: []
    };

    // 激活灵兽加成
    if (activeBeast) {
      const qualityBonus = QUALITY_BONUS[activeBeast.quality] || QUALITY_BONUS.common;
      const affectionData = getAffectionLevel(activeBeast.affection);
      const moodBonus = BEAST_MOOD[activeBeast.mood]?.bonus || 1;

      // 基础属性加成 = 品质加成 * 亲密度加成 * 心情加成
      bonus.atk_bonus = qualityBonus.atk * affectionData.bonus * moodBonus;
      bonus.hp_bonus = qualityBonus.hp * affectionData.bonus * moodBonus;

      // 等级加成：每10级+1%
      const levelBonus = Math.floor(activeBeast.level / 10) * 0.01;
      bonus.atk_bonus += levelBonus;
      bonus.hp_bonus += levelBonus;

      // 特殊效果
      const skillInfo = BEAST_SKILLS[activeBeast.skill];
      if (skillInfo) {
        bonus.special_effects.push({
          skill: skillInfo.name,
          effect: skillInfo.effect,
          chance: skillInfo.effect_chance,
          description: getEffectDescription(skillInfo.effect)
        });

        // 特殊效果额外加成
        if (skillInfo.effect === 'burn') {
          bonus.atk_bonus += 0.05;
        } else if (skillInfo.effect === 'freeze') {
          bonus.hp_bonus += 0.05;
        } else if (skillInfo.effect === 'stun') {
          bonus.crit_rate_bonus += 0.05;
        } else if (skillInfo.effect === 'fear') {
          bonus.drop_rate_bonus += 0.1;
        }
      }
    }

    // 所有灵兽收藏加成（根据拥有数量和品质）
    const beastCount = allBeasts.length;
    const rareBeastCount = allBeasts.filter(b => ['rare', 'epic', 'legendary', 'mythical'].includes(b.quality)).length;
    const legendaryBeastCount = allBeasts.filter(b => ['legendary', 'mythical'].includes(b.quality)).length;

    // 收藏加成
    if (beastCount >= 3) bonus.spirit_rate_bonus += 0.05;
    if (beastCount >= 5) bonus.exp_rate_bonus += 0.05;
    if (rareBeastCount >= 3) bonus.drop_rate_bonus += 0.1;
    if (legendaryBeastCount >= 1) bonus.atk_bonus += 0.1;

    res.json({
      success: true,
      data: {
        active_beast: activeBeast ? {
          id: activeBeast.id,
          beast_id: activeBeast.beast_id,
          name: activeBeast.name,
          icon: activeBeast.icon,
          quality: activeBeast.quality,
          level: activeBeast.level,
          affection: activeBeast.affection,
          mood: activeBeast.mood,
          stats: calculateBeastStats(activeBeast, activeBeast)
        } : null,
        total_beasts: beastCount,
        bonus: {
          atk_bonus: Math.round(bonus.atk_bonus * 100) / 100,
          hp_bonus: Math.round(bonus.hp_bonus * 100) / 100,
          crit_rate_bonus: Math.round(bonus.crit_rate_bonus * 100) / 100,
          spirit_rate_bonus: Math.round(bonus.spirit_rate_bonus * 100) / 100,
          exp_rate_bonus: Math.round(bonus.exp_rate_bonus * 100) / 100,
          drop_rate_bonus: Math.round(bonus.drop_rate_bonus * 100) / 100,
          special_effects: bonus.special_effects
        },
        collection_bonus: {
          total_beasts: beastCount,
          rare_beasts: rareBeastCount,
          legendary_beasts: legendaryBeastCount
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取技能效果描述
function getEffectDescription(effect) {
  const descriptions = {
    'spirit_drain': '攻击时吸取敌人灵气',
    'stun': '攻击时有几率麻痹敌人',
    'burn': '攻击附带灼烧效果',
    'freeze': '攻击冰冻敌人',
    'fear': '攻击恐惧敌人',
    'chaos': '混沌之力，无视防御'
  };
  return descriptions[effect] || '未知效果';
}

// 获取饲料列表
router.get('/foods', (req, res) => {
  try {
    const foods = Object.values(BEAST_FOODS).map(f => ({
      id: f.id,
      name: f.name,
      icon: f.icon,
      affection: f.affection,
      cost: f.cost
    }));

    res.json({ success: true, data: foods });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取栏位升级信息
router.get('/slots/info', (req, res) => {
  try {
    const { player_id } = req.query;

    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id' });
    }

    const slotRecord = db.prepare('SELECT * FROM player_beast_slots WHERE player_id = ?').get(player_id);
    const currentSlots = slotRecord?.slots || 5;

    // 获取所有升级选项
    const upgrades = [];
    for (const [slots, config] of Object.entries(BEAST_SLOT_UPGRADE)) {
      upgrades.push({
        slots: parseInt(slots),
        name: config.name,
        cost: config.cost,
        available: parseInt(slots) > currentSlots
      });
    }

    res.json({
      success: true,
      data: {
        current_slots: currentSlots,
        upgrades
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取灵兽战斗记录
router.get('/battle-records', (req, res) => {
  try {
    const { player_id, limit = 20 } = req.query;

    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id' });
    }

    const records = db.prepare(`
      SELECT bbr.*, bt.name as beast_name, bt.icon
      FROM beast_battle_records bbr
      JOIN player_beasts pb ON bbr.beast_id = pb.id
      JOIN beast_templates bt ON pb.beast_id = bt.id
      WHERE bbr.player_id = ?
      ORDER BY bbr.created_at DESC
      LIMIT ?
    `).all(player_id, parseInt(limit));

    res.json({
      success: true,
      data: records.map(r => ({
        id: r.id,
        beast_name: r.beast_name,
        icon: r.icon,
        battle_type: r.battle_type,
        damage: r.damage,
        exp_gained: r.exp_gained,
        created_at: r.created_at
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取捕捉记录
router.get('/capture-records', (req, res) => {
  try {
    const { player_id, limit = 20 } = req.query;

    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id' });
    }

    const records = db.prepare(`
      SELECT bcr.*, bt.name as beast_name, bt.icon, bt.quality
      FROM beast_capture_records bcr
      JOIN beast_templates bt ON bcr.beast_id = bt.id
      WHERE bcr.player_id = ?
      ORDER BY bcr.created_at DESC
      LIMIT ?
    `).all(player_id, parseInt(limit));

    const stats = {
      total_attempts: records.length,
      success_count: records.filter(r => r.success).length,
      fail_count: records.filter(r => !r.success).length
    };

    res.json({
      success: true,
      data: {
        records: records.map(r => ({
          id: r.id,
          beast_name: r.beast_name,
          icon: r.icon,
          quality: r.quality,
          success: r.success === 1,
          capture_rate: r.capture_rate,
          created_at: r.created_at
        })),
        stats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 添加灵兽经验（战斗后调用）
router.post('/add-exp', (req, res) => {
  try {
    const { player_id, beast_id, exp, battle_type = 'dungeon' } = req.body;

    if (!player_id || !beast_id || !exp) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    // 获取玩家灵兽
    const playerBeast = db.prepare('SELECT * FROM player_beasts WHERE id = ? AND player_id = ?').get(beast_id, player_id);
    if (!playerBeast) {
      return res.status(404).json({ success: false, error: '灵兽不存在' });
    }

    // 获取灵兽模板
    const beastTemplate = db.prepare('SELECT * FROM beast_templates WHERE id = ?').get(playerBeast.beast_id);

    // 增加经验
    const newExp = playerBeast.exp + exp;

    // 检查是否升级
    let newLevel = playerBeast.level;
    let remainingExp = newExp;
    const expNeeded = BEAST_EXP_CURVE(newLevel);

    if (newExp >= expNeeded) {
      // 自动升级
      remainingExp = newExp - expNeeded;
      newLevel++;
    }

    // 更新经验
    db.prepare('UPDATE player_beasts SET exp = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(remainingExp, beast_id);

    // 记录战斗
    db.prepare(`
      INSERT INTO beast_battle_records (player_id, beast_id, battle_type, exp_gained)
      VALUES (?, ?, ?, ?)
    `).run(player_id, beast_id, battle_type, exp);

    res.json({
      success: true,
      message: `${beastTemplate.name} 获得 ${exp} 经验`,
      data: {
        beast_id,
        beast_name: beastTemplate.name,
        exp_gained: exp,
        current_exp: remainingExp,
        current_level: newLevel,
        exp_to_next: BEAST_EXP_CURVE(newLevel),
        leveled_up: newLevel > playerBeast.level
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 灵兽加速成长 - 消耗灵石加速灵兽获得经验
router.post('/speedup', async (req, res) => {
  try {
    const { player_id, beast_id, hours } = req.body;

    if (!player_id || !beast_id || !hours) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const hoursInt = parseInt(hours, 10);
    if (hoursInt <= 0 || hoursInt > 24) {
      return res.status(400).json({ success: false, error: '加速时间必须在1-24小时之间' });
    }

    // 加载playerStorage
    let playerStorage;
    try {
      const storage = require('../storage');
      playerStorage = storage.playerStorage;
    } catch (e) {
      return res.status(500).json({ success: false, error: '无法加载存储模块' });
    }

    const player = await playerStorage.getOrCreatePlayer(player_id);

    // 加速费用：1小时 50 灵石
    const cost = hoursInt * 50;

    // 检查灵石是否足够
    if (player.spirit_stones < cost) {
      return res.status(400).json({ success: false, error: `需要 ${cost} 灵石，当前只有 ${player.spirit_stones} 灵石` });
    }

    // 获取玩家灵兽
    const playerBeast = db.prepare('SELECT * FROM player_beasts WHERE id = ? AND player_id = ?').get(beast_id, player_id);
    if (!playerBeast) {
      return res.status(404).json({ success: false, error: '灵兽不存在' });
    }

    // 获取灵兽模板
    const beastTemplate = db.prepare('SELECT * FROM beast_templates WHERE id = ?').get(playerBeast.beast_id);

    // 计算加速获得的经验（每小时获得相当于1小时挂机收益）
    // 假设每小时获得 100 经验 * 灵兽等级
    const baseExpPerHour = 100;
    const speedupExp = baseExpPerHour * playerBeast.level * hoursInt;

    // 扣除灵石
    await playerStorage.updateSpiritStones(player_id, -cost);

    // 添加经验
    const newExp = playerBeast.exp + speedupExp;
    let newLevel = playerBeast.level;
    let remainingExp = newExp;
    let leveledUp = false;

    // 检查升级
    while (remainingExp >= BEAST_EXP_CURVE(newLevel)) {
      remainingExp -= BEAST_EXP_CURVE(newLevel);
      newLevel++;
      leveledUp = true;
    }

    // 更新灵兽经验和等级
    db.prepare('UPDATE player_beasts SET exp = ?, level = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(remainingExp, newLevel, beast_id);

    // 记录加速
    db.prepare(`
      INSERT INTO beast_battle_records (player_id, beast_id, battle_type, exp_gained)
      VALUES (?, ?, ?, ?)
    `).run(player_id, beast_id, 'speedup', speedupExp);

    res.json({
      success: true,
      message: `⚡ ${beastTemplate.name} 加速成长 ${hoursInt} 小时，获得 ${speedupExp} 经验，消耗 ${cost} 灵石`,
      data: {
        beast_id,
        beast_name: beastTemplate.name,
        hours: hoursInt,
        cost,
        exp_gained: speedupExp,
        current_exp: remainingExp,
        current_level: newLevel,
        exp_to_next: BEAST_EXP_CURVE(newLevel),
        leveled_up: leveledUp
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 放生灵兽
router.post('/release', (req, res) => {
  try {
    const { player_id, beast_id } = req.body;

    if (!player_id || !beast_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    // 获取玩家灵兽
    const playerBeast = db.prepare('SELECT * FROM player_beasts WHERE id = ? AND player_id = ?').get(beast_id, player_id);
    if (!playerBeast) {
      return res.status(404).json({ success: false, error: '灵兽不存在' });
    }

    // 获取灵兽模板
    const beastTemplate = db.prepare('SELECT * FROM beast_templates WHERE id = ?').get(playerBeast.beast_id);

    // 传说及以上返还道具
    let reward = null;
    if (['legendary', 'mythical'].includes(beastTemplate.quality)) {
      reward = { type: 'beast_soul', amount: 1 };
    }

    // 删除灵兽
    db.prepare('DELETE FROM player_beasts WHERE id = ?').run(beast_id);

    res.json({
      success: true,
      message: `放生了${beastTemplate.name}，` + (reward ? `获得${reward.amount}个灵兽魂魄` : '灵兽重获自由'),
      data: {
        beast_name: beastTemplate.name,
        quality: beastTemplate.quality,
        reward
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ 灵兽共鸣羁绊系统 API ============

// 共鸣羁绊配置
const RESONANCE_BONDS = {
  // 双兽羁绊
  'wind_fire': {
    id: 'wind_fire',
    name: '风火轮',
    beasts: ['spirit_fox', 'thunder_eagle'],
    type: 'dual',
    bonus: { stat: 'speed', value: 0.20, name: '速度+20%' },
    description: '狐狸与雷鹰共鸣，风火交融',
    icon: '🌀'
  },
  'earth_mountain': {
    id: 'earth_mountain',
    name: '山河之势',
    beasts: ['flame_qilin', 'divine_dragon'],
    type: 'dual',
    bonus: { stat: 'atk', value: 0.25, name: '攻击+25%' },
    description: '火麒麟与神龙共鸣，山河震动',
    icon: '⛰️'
  },
  'ice_thunder': {
    id: 'ice_thunder',
    name: '冰雷九天',
    beasts: ['ice_phoenix', 'thunder_eagle'],
    type: 'dual',
    bonus: { stat: 'crit_rate', value: 0.15, name: '暴击率+15%' },
    description: '冰凤凰与雷鹰共鸣，冰雷交加',
    icon: '⚡'
  },
  // 四圣羁绊
  'four_sages': {
    id: 'four_sages',
    name: '四圣灵',
    beasts: ['divine_dragon', 'flame_qilin', 'ice_phoenix', 'chaos_beast'],
    type: 'quad',
    bonus: { stat: 'all', value: 0.15, name: '全属性+15%' },
    description: '青龙、白虎、朱雀、玄武四圣灵齐聚',
    icon: '🐲'
  },
  'sky_dragon': {
    id: 'sky_dragon',
    name: '苍穹之龙',
    beasts: ['divine_dragon', 'thunder_eagle', 'spirit_fox'],
    type: 'triple',
    bonus: { stat: 'hp', value: 0.30, name: '生命+30%' },
    description: '龙鹰狐三者共鸣，苍穹之主',
    icon: '🌌'
  },
  'phoenix_reborn': {
    id: 'phoenix_reborn',
    name: '凤凰涅槃',
    beasts: ['ice_phoenix', 'flame_qilin', 'chaos_beast'],
    type: 'triple',
    bonus: { stat: 'atk', value: 0.35, name: '攻击+35%' },
    description: '冰火混沌三兽共鸣，涅槃重生',
    icon: '🔥'
  },
  'beast_king': {
    id: 'beast_king',
    name: '万兽之王',
    beasts: ['chaos_beast', 'divine_dragon', 'ice_phoenix', 'flame_qilin', 'thunder_eagle', 'spirit_fox'],
    type: 'six',
    bonus: { stat: 'all', value: 0.25, name: '全属性+25%' },
    description: '六大灵兽齐聚，万兽朝拜',
    icon: '👑'
  }
};

// 初始化共鸣羁绊表
function initResonanceTables() {
  if (!db) {
    console.error('[beast_api] initResonanceTables: db not initialized!');
    return;
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_resonance_bonds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      bond_id TEXT NOT NULL,
      activated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(player_id, bond_id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS player_beast_equipment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      beast_id INTEGER NOT NULL,
      gear_id TEXT,
      mount_id TEXT,
      accessory_id TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(player_id, beast_id)
    )
  `);
}

// 获取玩家共鸣羁绊信息
router.get('/resonance/bonds', (req, res) => {
  try {
    const { player_id } = req.query;

    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id' });
    }

    // 获取玩家拥有的灵兽
    console.log('[resonance] player_id:', player_id, 'type:', typeof player_id);
    console.log('[resonance] db open:', !!db, 'db name:', db ? (db.name || 'unknown') : 'null');
    const ownedBeasts = db.prepare(
      'SELECT beast_id FROM player_beasts WHERE player_id = ?'
    ).all(player_id);
    console.log('[resonance] ownedBeasts:', JSON.stringify(ownedBeasts));
    const ownedIds = new Set(ownedBeasts.map(b => b.beast_id));

    // 获取已激活的羁绊
    let activatedBonds;
    try {
      activatedBonds = db.prepare('SELECT bond_id FROM player_resonance_bonds WHERE player_id = ?').all(player_id);
    } catch(e) {
      console.error('[beast_api] resonance query error:', e.message);
      return res.status(500).json({ success: false, error: e.message });
    }
    const activatedSet = new Set(activatedBonds.map(b => b.bond_id));

    // 计算所有羁绊状态
    const bonds = Object.entries(RESONANCE_BONDS).map(([id, bond]) => {
      const owned = bond.beasts.filter(b => ownedIds.has(b));
      const canActivate = owned.length === bond.beasts.length;
      const isActive = activatedSet.has(id);

      return {
        id: bond.id,
        name: bond.name,
        type: bond.type,
        beasts: bond.beasts.map(bid => {
          const template = BEAST_DATA[bid];
          return {
            id: bid,
            name: template?.name || bid,
            icon: template?.icon || '❓',
            owned: ownedIds.has(bid)
          };
        }),
        bonus: bond.bonus,
        description: bond.description,
        icon: bond.icon,
        owned_count: owned.length,
        required_count: bond.beasts.length,
        can_activate: canActivate,
        is_active: isActive
      };
    });

    // 计算当前激活的共鸣加成
    let totalBonus = { atk: 0, hp: 0, speed: 0, crit_rate: 0 };
    for (const bondId of activatedSet) {
      const bond = RESONANCE_BONDS[bondId];
      if (bond) {
        if (bond.bonus.stat === 'all') {
          totalBonus.atk += bond.bonus.value;
          totalBonus.hp += bond.bonus.value;
          totalBonus.speed += bond.bonus.value;
          totalBonus.crit_rate += bond.bonus.value;
        } else if (bond.bonus.stat === 'atk') {
          totalBonus.atk += bond.bonus.value;
        } else if (bond.bonus.stat === 'hp') {
          totalBonus.hp += bond.bonus.value;
        } else if (bond.bonus.stat === 'speed') {
          totalBonus.speed += bond.bonus.value;
        } else if (bond.bonus.stat === 'crit_rate') {
          totalBonus.crit_rate += bond.bonus.value;
        }
      }
    }

    res.json({
      success: true,
      data: {
        bonds,
        active_bonds: Array.from(activatedSet),
        total_bonus: {
          atk_bonus: Math.round(totalBonus.atk * 100) / 100,
          hp_bonus: Math.round(totalBonus.hp * 100) / 100,
          speed_bonus: Math.round(totalBonus.speed * 100) / 100,
          crit_rate_bonus: Math.round(totalBonus.crit_rate * 100) / 100
        }
      }
    });
  } catch (error) {
    console.error('获取共鸣羁绊失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 激活共鸣羁绊
router.post('/resonance/activate', (req, res) => {
  try {
    const { player_id, bond_id } = req.body;

    if (!player_id || !bond_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const bond = RESONANCE_BONDS[bond_id];
    if (!bond) {
      return res.status(404).json({ success: false, error: '羁绊不存在' });
    }

    // 检查是否已激活
    const existing = db.prepare(
      'SELECT * FROM player_resonance_bonds WHERE player_id = ? AND bond_id = ?'
    ).get(player_id, bond_id);
    if (existing) {
      return res.status(400).json({ success: false, error: '该羁绊已经激活' });
    }

    // 检查玩家是否拥有所有需要的灵兽
    const ownedBeasts = db.prepare(
      'SELECT beast_id FROM player_beasts WHERE player_id = ?'
    ).all(player_id);
    const ownedIds = new Set(ownedBeasts.map(b => b.beast_id));

    const missingBeasts = bond.beasts.filter(b => !ownedIds.has(b));
    if (missingBeasts.length > 0) {
      const missingNames = missingBeasts.map(bid => BEAST_DATA[bid]?.name || bid).join('、');
      return res.status(400).json({
        success: false,
        error: `缺少灵兽: ${missingNames}，无法激活此羁绊`
      });
    }

    // 激活羁绊
    db.prepare(
      'INSERT INTO player_resonance_bonds (player_id, bond_id) VALUES (?, ?)'
    ).run(player_id, bond_id);

    res.json({
      success: true,
      message: `🎉 激活【${bond.name}】成功！${bond.bonus.name}`,
      data: {
        bond_id: bond.id,
        bond_name: bond.name,
        bonus: bond.bonus,
        icon: bond.icon
      }
    });
  } catch (error) {
    console.error('激活共鸣羁绊失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 取消激活共鸣羁绊
router.post('/resonance/deactivate', (req, res) => {
  try {
    const { player_id, bond_id } = req.body;

    if (!player_id || !bond_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const bond = RESONANCE_BONDS[bond_id];

    db.prepare(
      'DELETE FROM player_resonance_bonds WHERE player_id = ? AND bond_id = ?'
    ).run(player_id, bond_id);

    res.json({
      success: true,
      message: `已取消【${bond?.name || bond_id}】羁绊`,
      data: { bond_id }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ 灵兽装备 API (基于SQLite) ============

// 获取灵兽装备信息（使用SQLite）
router.get('/equipment/info', (req, res) => {
  try {
    const { player_id, beast_id } = req.query;

    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id' });
    }

    // 获取玩家灵兽
    const playerBeast = beast_id
      ? db.prepare('SELECT pb.*, bt.name, bt.icon FROM player_beasts pb JOIN beast_templates bt ON pb.beast_id = bt.id WHERE pb.id = ? AND pb.player_id = ?').get(beast_id, player_id)
      : db.prepare('SELECT pb.*, bt.name, bt.icon FROM player_beasts pb JOIN beast_templates bt ON pb.beast_id = bt.id WHERE pb.player_id = ? AND pb.is_active = 1').get(player_id);

    if (!playerBeast) {
      return res.json({ success: true, data: { equipped: null, bonuses: {} } });
    }

    // 获取装备
    const equipped = db.prepare(
      'SELECT * FROM player_beast_equipment WHERE player_id = ? AND beast_id = ?'
    ).get(player_id, playerBeast.id);

    res.json({
      success: true,
      data: {
        beast: {
          id: playerBeast.id,
          name: playerBeast.name,
          icon: playerBeast.icon,
          level: playerBeast.level
        },
        equipped: equipped ? {
          gear: equipped.gear_id,
          mount: equipped.mount_id,
          accessory: equipped.accessory_id
        } : { gear: null, mount: null, accessory: null }
      }
    });
  } catch (error) {
    console.error('获取灵兽装备失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 装备灵兽装备
router.post('/equipment/equip', (req, res) => {
  try {
    const { player_id, beast_id, slot, equipment_id } = req.body;

    if (!player_id || !beast_id || !slot) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    if (!['gear', 'mount', 'accessory'].includes(slot)) {
      return res.status(400).json({ success: false, error: '无效的装备槽位' });
    }

    // 获取玩家灵兽
    const playerBeast = db.prepare(
      'SELECT * FROM player_beasts WHERE id = ? AND player_id = ?'
    ).get(beast_id, player_id);
    if (!playerBeast) {
      return res.status(404).json({ success: false, error: '灵兽不存在' });
    }

    // 初始化装备记录
    const existing = db.prepare(
      'SELECT * FROM player_beast_equipment WHERE player_id = ? AND beast_id = ?'
    ).get(player_id, beast_id);

    if (!existing) {
      db.prepare(
        'INSERT INTO player_beast_equipment (player_id, beast_id) VALUES (?, ?)'
      ).run(player_id, beast_id);
    }

    // 更新装备
    const colMap = { gear: 'gear_id', mount: 'mount_id', accessory: 'accessory_id' };
    const col = colMap[slot];

    if (equipment_id) {
      db.prepare(`UPDATE player_beast_equipment SET ${col} = ?, updated_at = CURRENT_TIMESTAMP WHERE player_id = ? AND beast_id = ?`).run(equipment_id, player_id, beast_id);
    } else {
      db.prepare(`UPDATE player_beast_equipment SET ${col} = NULL, updated_at = CURRENT_TIMESTAMP WHERE player_id = ? AND beast_id = ?`).run(player_id, beast_id);
    }

    // 获取更新后的装备
    const updated = db.prepare(
      'SELECT * FROM player_beast_equipment WHERE player_id = ? AND beast_id = ?'
    ).get(player_id, beast_id);

    res.json({
      success: true,
      message: equipment_id ? `装备成功` : '卸下成功',
      data: {
        gear: updated.gear_id,
        mount: updated.mount_id,
        accessory: updated.accessory_id
      }
    });
  } catch (error) {
    console.error('装备灵兽失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 导出模块
module.exports = router;
module.exports.initBeastDatabase = initBeastDatabase;
module.exports.initResonanceTables = initResonanceTables;
module.exports.BEAST_DATA = BEAST_DATA;
module.exports.BEAST_QUALITY = BEAST_QUALITY;
module.exports.BEAST_FOODS = BEAST_FOODS;
module.exports.RESONANCE_BONDS = RESONANCE_BONDS;
