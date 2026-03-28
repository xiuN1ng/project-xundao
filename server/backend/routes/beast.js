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

// GET /api/beast/stats - 获取玩家灵兽统计信息
router.get('/stats', (req, res) => {
  const db = getDb(req);
  initBeastTables(db);
  const userId = extractUserId(req);
  try {
    const beasts = db.prepare('SELECT * FROM player_beasts WHERE user_id = ? ORDER BY level DESC').all(userId);
    const active = beasts.find(b => b.is_active === 1);
    const totalAttack = beasts.reduce((sum, b) => sum + b.attack, 0);
    const totalHp = beasts.reduce((sum, b) => sum + b.hp, 0);
    const qualityCount = {};
    beasts.forEach(b => { qualityCount[b.quality] = (qualityCount[b.quality] || 0) + 1; });
    res.json({
      total: beasts.length,
      totalAttack,
      totalHp,
      activeBeast: active ? { id: active.id, name: active.name, level: active.level, quality: active.quality, attack: active.attack, hp: active.hp } : null,
      qualityCount,
      maxLevel: beasts.length > 0 ? Math.max(...beasts.map(b => b.level)) : 0,
      avgIntimacy: beasts.length > 0 ? Math.round(beasts.reduce((sum, b) => sum + b.intimacy, 0) / beasts.length) : 0
    });
  } catch(e) {
    res.json({ total: 0, totalAttack: 0, totalHp: 0, activeBeast: null, qualityCount: {}, maxLevel: 0, avgIntimacy: 0, error: e.message });
  }
});

// POST /api/beast/release - 放生灵兽
router.post('/release', (req, res) => {
  const db = getDb(req);
  initBeastTables(db);
  const userId = extractUserId(req);
  const { beastId } = req.body;

  if (!beastId) return res.json({ success: false, message: '缺少beastId' });

  try {
    const beast = db.prepare('SELECT * FROM player_beasts WHERE id = ? AND user_id = ?').get(beastId, userId);
    if (!beast) return res.json({ success: false, message: '灵兽不存在' });
    if (beast.is_active === 1) return res.json({ success: false, message: '请先取消出战再放生' });

    // 返还少量灵石作为补偿
    const refund = beast.level * 20;
    db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(refund, userId);
    db.prepare('DELETE FROM player_beast_skills WHERE beast_id = ?').run(beastId);
    db.prepare('DELETE FROM player_beasts WHERE id = ?').run(beastId);

    res.json({ success: true, message: `灵兽已放生，返还${refund}灵石`, refund });
  } catch(e) {
    res.json({ success: false, message: e.message });
  }
});

// GET /api/beast/shop - 灵兽商店（灵兽捕捉道具、灵兽食品等）
router.get('/shop', (req, res) => {
  const db = getDb(req);
  initBeastTables(db);
  const userId = extractUserId(req);

  const shopItems = [
    { id: 'beast_ball', name: '灵兽球', icon: '🔮', price: 50, desc: '捕捉灵兽的必备道具', category: 'capture', stock: -1 },
    { id: 'beast_food_1', name: '普通兽粮', icon: '🍖', price: 30, desc: '喂养灵兽增加好感度+10', category: 'food', stock: -1 },
    { id: 'beast_food_2', name: '精制灵粮', icon: '🍱', price: 100, desc: '喂养灵兽增加好感度+40，额外+5攻击', category: 'food', stock: -1 },
    { id: 'beast_food_3', name: '仙丹', icon: '💊', price: 300, desc: '喂养灵兽好感度+120，攻防各+15', category: 'food', stock: -1 },
    { id: 'beast_egg_1', name: '普通灵兽蛋', icon: '🥚', price: 500, desc: '可孵化出普通~稀有灵兽', category: 'egg', stock: 10 },
    { id: 'beast_egg_2', name: '史诗灵兽蛋', icon: '🌟', price: 2000, desc: '可孵化出稀有~史诗灵兽', category: 'egg', stock: 5 },
    { id: 'beast_skill_book', name: '灵兽技能书·攻', icon: '📖', price: 800, desc: '让灵兽学习撕咬技能', category: 'skill', stock: -1 },
    { id: 'beast_skill_book_def', name: '灵兽技能书·防', icon: '📕', price: 800, desc: '让灵兽学习护甲技能', category: 'skill', stock: -1 },
    { id: 'beast_enhance_stone', name: '灵兽强化石', icon: '💎', price: 150, desc: '升级灵兽成功率+20%', category: 'enhance', stock: -1 },
    { id: 'beast_quality_scroll', name: '品质提升符', icon: '📜', price: 5000, desc: '灵兽进化成功率+30%', category: 'enhance', stock: 3 }
  ];

  // 获取玩家背包中的灵兽商店物品
  let inventory = {};
  try {
    const items = db.prepare(`SELECT item_id, count FROM player_items WHERE user_id = ? AND item_id LIKE 'beast_%'`).all(userId);
    items.forEach(i => { inventory[i.item_id] = i.count; });
  } catch(e) {}

  res.json({
    items: shopItems,
    inventory,
    refreshTime: '次日00:00'
  });
});

// POST /api/beast/shop/buy - 购买灵兽商店物品
router.post('/shop/buy', (req, res) => {
  const db = getDb(req);
  initBeastTables(db);
  const userId = extractUserId(req);
  const { itemId, quantity = 1 } = req.body;

  if (!itemId) return res.json({ success: false, message: '缺少itemId' });

  const shopItems = {
    'beast_ball': { name: '灵兽球', price: 50 },
    'beast_food_1': { name: '普通兽粮', price: 30 },
    'beast_food_2': { name: '精制灵粮', price: 100 },
    'beast_food_3': { name: '仙丹', price: 300 },
    'beast_egg_1': { name: '普通灵兽蛋', price: 500 },
    'beast_egg_2': { name: '史诗灵兽蛋', price: 2000 },
    'beast_skill_book': { name: '灵兽技能书·攻', price: 800 },
    'beast_skill_book_def': { name: '灵兽技能书·防', price: 800 },
    'beast_enhance_stone': { name: '灵兽强化石', price: 150 },
    'beast_quality_scroll': { name: '品质提升符', price: 5000 }
  };

  const item = shopItems[itemId];
  if (!item) return res.json({ success: false, message: '商品不存在' });

  const totalCost = item.price * quantity;
  try {
    const player = db.prepare('SELECT lingshi FROM Users WHERE id = ?').get(userId);
    if (!player || player.lingshi < totalCost) {
      return res.json({ success: false, message: '灵石不足' });
    }

    // 扣灵石
    db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(totalCost, userId);

    // 写入背包 player_items 表
    try {
      db.prepare(`INSERT INTO player_items (user_id, item_id, item_name, item_type, icon, count, source)
        VALUES (?, ?, ?, 'beast', ?, ?, 'beast_shop')
        ON CONFLICT(user_id, item_id) DO UPDATE SET count = count + ?`).run(
        userId, itemId, item.name, '📦', quantity, quantity
      );
    } catch(e) {
      console.log('[beast/shop/buy] player_items write error:', e.message);
    }

    res.json({ success: true, message: `购买成功：${item.name} x${quantity}`, cost: totalCost, remaining: player.lingshi - totalCost });
  } catch(e) {
    res.json({ success: false, message: e.message });
  }
});

// POST /api/beast/feed-item - 使用背包物品喂养灵兽
router.post('/feed-item', (req, res) => {
  const db = getDb(req);
  initBeastTables(db);
  const userId = extractUserId(req);
  const { beastId, itemId } = req.body;

  if (!beastId || !itemId) return res.json({ success: false, message: '缺少参数' });

  const beast = db.prepare('SELECT * FROM player_beasts WHERE id = ? AND user_id = ?').get(beastId, userId);
  if (!beast) return res.json({ success: false, message: '灵兽不存在' });

  const feedItems = {
    'beast_food_1': { intimacy: 10, atk: 0, hp: 0 },
    'beast_food_2': { intimacy: 40, atk: 5, hp: 0 },
    'beast_food_3': { intimacy: 120, atk: 15, hp: 15 }
  };

  const feed = feedItems[itemId];
  if (!feed) return res.json({ success: false, message: '该物品无法用于喂养' });

  // 扣除物品
  try {
    const itemRow = db.prepare('SELECT * FROM player_items WHERE user_id = ? AND item_id = ?').get(userId, itemId);
    if (!itemRow || itemRow.count < 1) return res.json({ success: false, message: '物品不足' });

    const newCount = itemRow.count - 1;
    if (newCount <= 0) {
      db.prepare('DELETE FROM player_items WHERE user_id = ? AND item_id = ?').run(userId, itemId);
    } else {
      db.prepare('UPDATE player_items SET count = ? WHERE user_id = ? AND item_id = ?').run(newCount, userId, itemId);
    }
  } catch(e) {
    console.log('[beast/feed-item] item deduct error:', e.message);
  }

  // 更新灵兽
  db.prepare('UPDATE player_beasts SET intimacy = intimacy + ?, attack = attack + ?, hp = hp + ? WHERE id = ?').run(
    feed.intimacy, feed.atk, feed.hp, beastId
  );

  const updated = db.prepare('SELECT * FROM player_beasts WHERE id = ?').get(beastId);
  res.json({ success: true, message: `喂养成功，好感度+${feed.intimacy}`, beast: updated });
});

// POST /api/beast/attack - 灵兽出战攻击（命令灵兽对敌人造成伤害）
router.post('/attack', (req, res) => {
  const db = getDb(req);
  initBeastTables(db);
  const userId = extractUserId(req);
  // 支持 camelCase 和 kebab-case 参数别名
  const { enemyHp = 0, enemyDef = 0, enemyLevel = 1, targetType = 'normal' } = req.body;
  const rawEnemyHp = req.body.enemyHp ?? req.body.enemy_hp ?? 0;
  const rawEnemyDef = req.body.enemyDef ?? req.body.enemy_def ?? 0;
  const eHp = parseInt(rawEnemyHp) || 0;
  const eDef = parseInt(rawEnemyDef) || 0;

  try {
    const active = db.prepare('SELECT * FROM player_beasts WHERE user_id = ? AND is_active = 1').get(userId);
    if (!active) {
      return res.json({ success: false, message: '请先激活一只灵兽出战', hasBeast: false });
    }

    // 计算灵兽攻击力（基础攻击 * 等级修正 * 好感度修正）
    const levelBonus = 1 + (active.level - 1) * 0.1;
    const intimacyBonus = 1 + Math.min(active.intimacy, 100) * 0.005;
    const baseAtk = Math.floor(active.attack * levelBonus * intimacyBonus);

    // 技能加成
    let skillBonus = 1.0;
    let skillName = null;
    if (active.skill_id) {
      const skill = beastSkills.find(s => s.id === active.skill_id);
      if (skill) {
        skillName = skill.name;
        if (skill.effect.includes('attack')) skillBonus = 1.5;
      }
    }

    // 伤害计算：攻击 * 技能加成 - 防御减免，最低1点
    const rawDamage = Math.floor(baseAtk * skillBonus - eDef * 0.3);
    const damage = Math.max(1, rawDamage);

    // 暴击判定（好感度>60解锁，8%概率）
    const critChance = active.intimacy > 60 ? 0.08 : 0;
    const isCrit = Math.random() < critChance;
    const finalDamage = isCrit ? Math.floor(damage * 1.5) : damage;

    // 灵兽消耗忠诚度（每次攻击消耗1点）
    db.prepare('UPDATE player_beasts SET intimacy = MAX(0, intimacy - 1) WHERE id = ?').run(active.id);

    res.json({
      success: true,
      hasBeast: true,
      beast: { id: active.id, name: active.name, level: active.level, quality: active.quality },
      baseAtk,
      damage: finalDamage,
      isCrit,
      skillName,
      loyaltyCost: 1,
      message: isCrit ? `暴击！灵兽${active.name}造成${finalDamage}点伤害` : `灵兽${active.name}造成${finalDamage}点伤害`
    });
  } catch(e) {
    res.json({ success: false, message: e.message, hasBeast: false });
  }
});

// POST /api/beast/learn-skill - 学习技能（kebab-case别名，修复camelCase）
router.post('/learn-skill', (req, res) => {
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

module.exports = router;
