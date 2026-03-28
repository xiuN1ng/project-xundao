const express = require('express');
const router = express.Router();
const path = require('path');
const crypto = require('crypto');

// 使用共享DB连接（支持WAL模式）
function getDb(req) {
  if (req.app && req.app.locals && req.app.locals.db) {
    return req.app.locals.db;
  }
  // 后备：独立连接
  const DB_PATH = path.join(__dirname, '..', 'data', 'game.db');
  return new (require('better-sqlite3')(DB_PATH, { readonly: false }));
}

// 初始化数据库表
function initBeastTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_beasts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      template_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      quality TEXT DEFAULT 'common',
      attack INTEGER DEFAULT 0,
      hp INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 0,
      skill_id INTEGER,
      intimacy INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, template_id)
    );
    CREATE TABLE IF NOT EXISTS beast_pity_counter (
      user_id INTEGER PRIMARY KEY,
      count INTEGER DEFAULT 0,
      last_capture_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS player_beast_skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      beast_id INTEGER NOT NULL,
      skill_id INTEGER NOT NULL,
      UNIQUE(beast_id, skill_id)
    );
  `);
}

// beast templates
const beastTemplates = [
  { id: 1, icon: '🦊', name: '灵狐', quality: 'common', baseAttack: 50, baseHp: 200 },
  { id: 2, icon: '🦅', name: '雷鹰', quality: 'uncommon', baseAttack: 120, baseHp: 500 },
  { id: 3, icon: '🐉', name: '青龙', quality: 'rare', baseAttack: 300, baseHp: 1500 },
  { id: 4, icon: '🦄', name: '白虎', quality: 'epic', baseAttack: 600, baseHp: 3000 },
  { id: 5, icon: '👑', name: '麒麟', quality: 'legendary', baseAttack: 1000, baseHp: 5000 }
];

const evolveRules = {
  common: { to: 'uncommon', cost: 1000, rate: 0.7 },
  uncommon: { to: 'rare', cost: 5000, rate: 0.5 },
  rare: { to: 'epic', cost: 20000, rate: 0.3 },
  epic: { to: 'legendary', cost: 100000, rate: 0.15 }
};

const beastSkills = [
  { id: 1, name: '撕咬', effect: 'attack*0.5', desc: '普攻加成' },
  { id: 2, name: '护甲', effect: 'defense*0.3', desc: '防御加成' },
  { id: 3, name: '生命', effect: 'hp*0.2', desc: '生命加成' }
];

// GET /api/beast/templates - 获取灵兽模板
router.get('/templates', (req, res) => {
  res.json(beastTemplates);
});

// GET /api/beast/skills - 获取灵兽技能列表
router.get('/skills', (req, res) => {
  res.json(beastSkills);
});

// GET /api/beast/list - 获取灵兽模板列表
router.get('/list', (req, res) => {
  res.json(beastTemplates);
});

// extract userId from request (support various parameter names)
function extractUserId(req) {
  return parseInt(req.query.userId) || parseInt(req.query.player_id) || parseInt(req.body?.userId) || parseInt(req.body?.player_id) || 1;
}

// GET /api/beast/my - 获取玩家灵兽列表（DB持久化）
router.get('/my', (req, res) => {
  const db = getDb(req);
  initBeastTables(db);
  const userId = extractUserId(req);
  try {
    const beasts = db.prepare('SELECT * FROM player_beasts WHERE user_id = ? ORDER BY level DESC').all(userId);
    const pity = db.prepare('SELECT * FROM beast_pity_counter WHERE user_id = ?').get(userId);
    res.json({
      beasts: beasts.map(b => ({
        id: b.id, userId: b.user_id, templateId: b.template_id, name: b.name,
        level: b.level, quality: b.quality, attack: b.attack, hp: b.hp,
        isActive: !!b.is_active, skillId: b.skill_id, intimacy: b.intimacy
      })),
      pity: pity || { user_id: userId, count: 0 }
    });
  } catch(e) {
    res.json({ beasts: [], pity: { user_id: userId, count: 0 }, error: e.message });
  }
});

router.get('/my/list', (req, res) => {
  const db = getDb(req);
  initBeastTables(db);
  const userId = extractUserId(req);
  try {
    const beasts = db.prepare('SELECT * FROM player_beasts WHERE user_id = ? ORDER BY level DESC').all(userId);
    res.json(beasts.map(b => ({
      id: b.id, userId: b.user_id, templateId: b.template_id, name: b.name,
      level: b.level, quality: b.quality, attack: b.attack, hp: b.hp,
      isActive: !!b.is_active, skillId: b.skill_id, intimacy: b.intimacy
    })));
  } catch(e) {
    res.json([]);
  }
});

// POST /api/beast/capture - 捕捉灵兽（DB持久化 + 保底逻辑）
router.post('/capture', (req, res) => {
  const db = getDb(req);
  initBeastTables(db);
  const userId = extractUserId(req);
  const { templateId, beastId, cost = 50 } = req.body;
  const targetTemplateId = templateId || beastId || 1;

  // 扣除灵石
  try {
    const player = db.prepare('SELECT lingshi FROM Users WHERE id = ?').get(userId);
    if (!player || player.lingshi < cost) {
      return res.json({ success: false, message: '灵石不足' });
    }
    db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(cost, userId);
  } catch(e) {
    // 如果Users表查不到灵石，跳过扣费但继续
    console.log('[beast] capture: lingshi deduct error:', e.message);
  }

  // 保底逻辑: 累计90次未出神话则下次必出
  const pity = db.prepare('SELECT * FROM beast_pity_counter WHERE user_id = ?').get(userId) || { count: 0 };
  const newPityCount = pity.count + 1;
  const guaranteedMyth = newPityCount >= 90;

  let capturedTemplate;
  if (guaranteedMyth) {
    capturedTemplate = beastTemplates.find(t => t.quality === 'legendary');
    db.prepare('UPDATE beast_pity_counter SET count = 0, last_capture_at = datetime("now") WHERE user_id = ?').run(userId);
  } else {
    // 普通抽取: common 60%, uncommon 25%, rare 10%, epic 4%, legendary 1%
    const roll = Math.random() * 100;
    let quality;
    if (roll < 1) quality = 'legendary';
    else if (roll < 5) quality = 'epic';
    else if (roll < 15) quality = 'rare';
    else if (roll < 40) quality = 'uncommon';
    else quality = 'common';

    const templates = beastTemplates.filter(t => t.quality === quality);
    if (targetTemplateId && !guaranteedMyth) {
      const specified = beastTemplates.find(t => t.id === targetTemplateId);
      if (specified) templates.push(specified);
    }
    capturedTemplate = templates[Math.floor(Math.random() * templates.length)] || beastTemplates[0];

    db.prepare('INSERT OR REPLACE INTO beast_pity_counter (user_id, count, last_capture_at) VALUES (?, ?, datetime("now"))').run(userId, newPityCount);
  }

  // 写入DB
  try {
    db.prepare(`INSERT INTO player_beasts (user_id, template_id, name, level, quality, attack, hp, is_active, intimacy)
      VALUES (?, ?, ?, 1, ?, ?, ?, 0, 0)
      ON CONFLICT(user_id, template_id) DO UPDATE SET level = level + 0`).run(
      userId, capturedTemplate.id, capturedTemplate.name, capturedTemplate.quality,
      capturedTemplate.baseAttack, capturedTemplate.baseHp
    );
  } catch(e) {
    console.log('[beast] capture insert error:', e.message);
  }

  res.json({
    success: true,
    beast: {
      templateId: capturedTemplate.id, name: capturedTemplate.name, quality: capturedTemplate.quality,
      attack: capturedTemplate.baseAttack, hp: capturedTemplate.baseHp, level: 1, isActive: false
    },
    pity: { count: guaranteedMyth ? 0 : newPityCount, guaranteedMyth }
  });
});

// POST /api/beast/activate - 出战激活（DB持久化）
router.post('/activate', (req, res) => {
  const db = getDb(req);
  initBeastTables(db);
  const userId = extractUserId(req);
  const { beastId } = req.body;

  if (!beastId) return res.json({ success: false, message: '缺少beastId' });

  try {
    // 取消所有出战状态
    db.prepare('UPDATE player_beasts SET is_active = 0 WHERE user_id = ?').run(userId);
    // 激活指定灵兽
    const result = db.prepare('UPDATE player_beasts SET is_active = 1 WHERE id = ? AND user_id = ?').run(beastId, userId);
    if (result.changes === 0) {
      return res.json({ success: false, message: '灵兽不存在' });
    }
    res.json({ success: true, message: '灵兽已出战' });
  } catch(e) {
    res.json({ success: false, message: e.message });
  }
});

// POST /api/beast/evolve - 灵兽进化（DB持久化）
router.post('/evolve', (req, res) => {
  const db = getDb(req);
  initBeastTables(db);
  const userId = extractUserId(req);
  const { beastId } = req.body;

  const beast = db.prepare('SELECT * FROM player_beasts WHERE id = ? AND user_id = ?').get(beastId, userId);
  if (!beast) return res.json({ success: false, message: '灵兽不存在' });

  const rule = evolveRules[beast.quality];
  if (!rule) return res.json({ success: false, message: '已是最高品质' });

  // 扣除灵石
  const player = db.prepare('SELECT lingshi FROM Users WHERE id = ?').get(userId);
  if (!player || player.lingshi < rule.cost) {
    return res.json({ success: false, message: '灵石不足' });
  }

  const success = Math.random() < rule.rate;
  if (success) {
    db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(rule.cost, userId);
    const newTemplate = beastTemplates.find(t => t.quality === rule.to);
    db.prepare('UPDATE player_beasts SET quality = ?, attack = ?, hp = ? WHERE id = ?').run(
      rule.to, newTemplate.baseAttack * beast.level, newTemplate.baseHp * beast.level, beastId
    );
    res.json({ success: true, message: '进化成功！', quality: rule.to });
  } else {
    res.json({ success: false, message: '进化失败' });
  }
});

// POST /api/beast/learnSkill - 学习技能（DB持久化）
router.post('/learnSkill', (req, res) => {
  const db = getDb(req);
  initBeastTables(db);
  const userId = extractUserId(req);
  const { beastId, skillId } = req.body;

  const beast = db.prepare('SELECT * FROM player_beasts WHERE id = ? AND user_id = ?').get(beastId, userId);
  if (!beast) return res.json({ success: false, message: '灵兽不存在' });

  const skill = beastSkills.find(s => s.id === skillId);
  if (!skill) return res.json({ success: false, message: '技能不存在' });

  db.prepare('INSERT OR REPLACE INTO player_beast_skills (beast_id, skill_id) VALUES (?, ?)').run(beastId, skillId);
  db.prepare('UPDATE player_beasts SET skill_id = ? WHERE id = ?').run(skillId, beastId);

  res.json({ success: true, skill });
});

// POST /api/beast/upgrade - 升级灵兽（DB持久化，消耗灵石）
router.post('/upgrade', (req, res) => {
  const db = getDb(req);
  initBeastTables(db);
  const userId = extractUserId(req);
  const { beastId } = req.body;

  const beast = db.prepare('SELECT * FROM player_beasts WHERE id = ? AND user_id = ?').get(beastId, userId);
  if (!beast) return res.json({ success: false, message: '灵兽不存在' });

  const cost = beast.level * 50;
  const player = db.prepare('SELECT lingshi FROM Users WHERE id = ?').get(userId);
  if (!player || player.lingshi < cost) {
    return res.json({ success: false, message: '灵石不足' });
  }

  db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(cost, userId);
  db.prepare('UPDATE player_beasts SET level = level + 1, attack = attack + 10, hp = hp + 30 WHERE id = ?').run(beastId);

  const updated = db.prepare('SELECT * FROM player_beasts WHERE id = ?').get(beastId);
  res.json({ success: true, message: `升级成功！等级提升至 ${updated.level}`, beast: updated });
});

// POST /api/beast/feed - 喂养灵兽（DB持久化，消耗灵石）
router.post('/feed', (req, res) => {
  const db = getDb(req);
  initBeastTables(db);
  const userId = extractUserId(req);
  const { beastId } = req.body;

  const beast = db.prepare('SELECT * FROM player_beasts WHERE id = ? AND user_id = ?').get(beastId, userId);
  if (!beast) return res.json({ success: false, message: '灵兽不存在' });

  const cost = 30;
  const player = db.prepare('SELECT lingshi FROM Users WHERE id = ?').get(userId);
  if (!player || player.lingshi < cost) {
    return res.json({ success: false, message: '灵石不足' });
  }

  db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(cost, userId);
  const feedBonus = Math.floor(beast.level * 5);
  db.prepare('UPDATE player_beasts SET attack = attack + ?, hp = hp + ?, intimacy = intimacy + 10 WHERE id = ?').run(feedBonus, feedBonus * 2, beastId);

  const updated = db.prepare('SELECT * FROM player_beasts WHERE id = ?').get(beastId);
  res.json({ success: true, message: '喂养成功！灵兽属性提升', beast: updated });
});

// GET /api/beast/battle-bonus - 获取灵兽战斗加成（供战斗系统调用）
router.get('/battle-bonus', (req, res) => {
  const db = getDb(req);
  initBeastTables(db);
  const userId = extractUserId(req);

  try {
    const active = db.prepare('SELECT * FROM player_beasts WHERE user_id = ? AND is_active = 1').get(userId);
    if (!active) {
      return res.json({ hasBeast: false, atkBonus: 0, hpBonus: 0, skill: null });
    }
    const skill = active.skill_id ? beastSkills.find(s => s.id === active.skill_id) : null;
    let atkBonus = active.attack * 0.3;
    let hpBonus = active.hp * 0.2;
    if (skill) {
      if (skill.effect.includes('attack')) atkBonus *= 1.5;
      if (skill.effect.includes('hp')) hpBonus *= 1.5;
    }
    res.json({
      hasBeast: true,
      beast: { id: active.id, name: active.name, level: active.level, quality: active.quality },
      atkBonus: Math.floor(atkBonus),
      hpBonus: Math.floor(hpBonus),
      skill
    });
  } catch(e) {
    res.json({ hasBeast: false, atkBonus: 0, hpBonus: 0, skill: null });
  }
});

// GET /api/beast/pity - 获取保底进度
router.get('/pity', (req, res) => {
  const db = getDb(req);
  initBeastTables(db);
  const userId = extractUserId(req);
  const pity = db.prepare('SELECT * FROM beast_pity_counter WHERE user_id = ?').get(userId);
  res.json({ userId, count: pity ? pity.count : 0, nextMythical: pity ? (90 - pity.count) : 90 });
});

module.exports = router;
