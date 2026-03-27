/**
 * 翅膀系统路由
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// ==================== 翅膀数据定义 ====================

const RARITY_NAMES = {
  common: '普通', uncommon: '优秀', rare: '稀有',
  epic: '史诗', legendary: '传说', mythical: '神话'
};

const WING_TYPES = {
  angel: { icon: '👼', name: '天使', color: '#FFFFFF' },
  flame: { icon: '🔥', name: '烈焰', color: '#FF4500' },
  ice: { icon: '❄️', name: '寒冰', color: '#00BFFF' },
  thunder: { icon: '⚡', name: '雷霆', color: '#FFD700' },
  shadow: { icon: '🌑', name: '暗影', color: '#4B0082' },
  dragon: { icon: '🐉', name: '龙翼', color: '#228B22' },
  phoenix: { icon: '🦅', name: '凤凰', color: '#FF6347' },
  celestial: { icon: '✨', name: '天使', color: '#E6E6FA' }
};

// 翅膀模板
const WING_TEMPLATES = [
  { id: 1, type: 'angel', name: '天使翅膀', rarity: 'common', atkBonus: 10, defBonus: 5, hpBonus: 20, price: 800, description: '新手标配，简单大方' },
  { id: 2, type: 'flame', name: '烈焰翅膀', rarity: 'rare', atkBonus: 25, defBonus: 10, hpBonus: 50, price: 15000, description: '烈焰灼烧，攻击力大幅提升' },
  { id: 3, type: 'ice', name: '寒冰翅膀', rarity: 'rare', atkBonus: 15, defBonus: 25, hpBonus: 60, description: '寒冰护体，防御大幅提升' },
  { id: 4, type: 'thunder', name: '雷霆翅膀', rarity: 'epic', atkBonus: 35, defBonus: 15, hpBonus: 70, price: 60000, description: '雷霆万钧，攻守兼备' },
  { id: 5, type: 'shadow', name: '暗影翅膀', rarity: 'epic', atkBonus: 40, defBonus: 20, hpBonus: 50, price: 80000, description: '来去如影，闪避提升' },
  { id: 6, type: 'dragon', name: '龙翼', rarity: 'legendary', atkBonus: 60, defBonus: 30, hpBonus: 100, price: 200000, description: '真龙之翼，傲视群雄' },
  { id: 7, type: 'phoenix', name: '凤凰翅膀', rarity: 'legendary', atkBonus: 50, defBonus: 40, hpBonus: 150, price: 250000, description: '涅槃之翼，死亡后可复活' },
  { id: 8, type: 'celestial', name: '天使翅膀', rarity: 'mythical', atkBonus: 100, defBonus: 80, hpBonus: 300, price: 800000, description: '神圣天使之翼，全属性大幅提升' }
];

// 翅膀技能
const WING_SKILLS = {
  common: ['护盾 I'],
  uncommon: ['护盾 II', '疾风 I'],
  rare: ['护盾 III', '疾风 II', '闪避 I'],
  epic: ['护盾 IV', '疾风 III', '闪避 II', '反伤 I'],
  legendary: ['护盾 V', '疾风 IV', '闪避 III', '反伤 II', '复活 I'],
  mythical: ['神圣护盾', '疾风 V', '闪避 IV', '反伤 III', '复活 II', '天使祝福']
};

// 玩家翅膀存储
const PLAYER_WINGS_FILE = path.join(__dirname, '../data/wings.json');

function loadPlayerWings() {
  try {
    if (fs.existsSync(PLAYER_WINGS_FILE)) {
      return JSON.parse(fs.readFileSync(PLAYER_WINGS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[wing] 加载翅膀数据失败:', e.message);
  }
  return {};
}

function savePlayerWings(data) {
  try {
    const dir = path.dirname(PLAYER_WINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(PLAYER_WINGS_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('[wing] 保存翅膀数据失败:', e.message);
  }
}

function initPlayerWings(userId) {
  const allWings = loadPlayerWings();
  if (!allWings[userId]) {
    allWings[userId] = {
      owned: [
        {
          id: 1, type: 'angel', name: '天使翅膀',
          rarity: 'common', level: 1, exp: 0,
          atkBonus: 10, defBonus: 5, hpBonus: 20,
          active: true, skills: ['护盾 I'],
          acquiredAt: new Date().toISOString()
        }
      ]
    };
    savePlayerWings(allWings);
  }
  return allWings[userId];
}

// ==================== 路由 ====================

// GET /api/wing - 获取玩家翅膀
router.get('/', (req, res) => {
  try {
    const userId = req.query.player_id || req.query.userId || '1';
    const playerData = initPlayerWings(userId);
    res.json({ success: true, data: playerData.owned });
  } catch (e) {
    console.error('[wing] 获取翅膀列表失败:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/wing/info
router.get('/info', (req, res) => {
  const userId = req.query.player_id || req.query.userId || '1';
  res.json({ success: true, data: initPlayerWings(userId).owned });
});

// GET /api/wing/templates - 获取翅膀模板
router.get('/templates', (req, res) => {
  try {
    const templates = WING_TEMPLATES.map(t => ({
      id: t.id, type: t.type, name: t.name, rarity: t.rarity,
      rarityName: RARITY_NAMES[t.rarity],
      icon: WING_TYPES[t.type]?.icon || '🪽',
      atkBonus: t.atkBonus, defBonus: t.defBonus, hpBonus: t.hpBonus,
      price: t.price, description: t.description,
      skills: WING_SKILLS[t.rarity]
    }));
    res.json({ success: true, data: templates });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/wing/market - 翅膀市场
router.get('/market', (req, res) => {
  try {
    const userId = req.query.player_id || req.query.userId || '1';
    const playerData = initPlayerWings(userId);
    const ownedIds = playerData.owned.map(w => w.id);
    
    const items = WING_TEMPLATES.map(t => ({
      id: t.id, type: t.type, name: t.name, rarity: t.rarity,
      rarityName: RARITY_NAMES[t.rarity],
      icon: WING_TYPES[t.type]?.icon || '🪽',
      atkBonus: t.atkBonus, defBonus: t.defBonus, hpBonus: t.hpBonus,
      price: t.price, description: t.description,
      skills: WING_SKILLS[t.rarity],
      owned: ownedIds.includes(t.id)
    }));
    
    res.json({ success: true, data: { items, refreshCost: 100 } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/wing/skills
router.get('/skills', (req, res) => {
  try {
    const wingId = parseInt(req.query.wing_id) || parseInt(req.query.id);
    const userId = req.query.player_id || req.query.userId || '1';
    const playerData = initPlayerWings(userId);
    const wing = playerData.owned.find(w => w.id == wingId);
    if (!wing) return res.status(404).json({ success: false, message: '翅膀不存在' });
    res.json({ success: true, data: { skills: wing.skills, level: wing.level, exp: wing.exp } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/wing/activate
router.post('/activate', (req, res) => {
  try {
    const { userId, player_id, id, wing_id } = req.body;
    const user = userId || player_id || '1';
    const targetId = parseInt(wing_id) || parseInt(id) || wing_id || id;
    
    const allWings = loadPlayerWings();
    const playerData = allWings[user];
    if (!playerData) return res.status(400).json({ success: false, message: '玩家翅膀数据不存在' });
    
    const wing = playerData.owned.find(w => w.id == targetId);
    if (!wing) return res.status(400).json({ success: false, message: '翅膀不存在' });
    
    playerData.owned.forEach(w => w.active = false);
    wing.active = true;
    savePlayerWings(allWings);
    
    res.json({ success: true, data: { active: wing.id, name: wing.name } });
  } catch (e) {
    console.error('[wing] 激活翅膀失败:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/wing/buy
router.post('/buy', (req, res) => {
  try {
    const { userId, player_id, id, wing_id } = req.body;
    const user = userId || player_id || '1';
    const targetId = parseInt(wing_id) || parseInt(id) || wing_id || id;
    
    const template = WING_TEMPLATES.find(t => t.id == targetId);
    if (!template) return res.status(404).json({ success: false, message: '翅膀模板不存在' });
    
    const playerData = initPlayerWings(user);
    if (playerData.owned.some(w => w.id == targetId)) {
      return res.status(400).json({ success: false, message: '已拥有该翅膀' });
    }
    
    const typeInfo = WING_TYPES[template.type] || {};
    const newWing = {
      id: Date.now(),
      templateId: template.id,
      type: template.type,
      name: template.name,
      rarity: template.rarity,
      level: 1, exp: 0,
      atkBonus: template.atkBonus,
      defBonus: template.defBonus,
      hpBonus: template.hpBonus,
      active: false,
      skills: WING_SKILLS[template.rarity] || ['护盾 I'],
      acquiredAt: new Date().toISOString()
    };
    
    playerData.owned.push(newWing);
    savePlayerWings(loadPlayerWings());
    
    // Re-save with new wing
    const all = loadPlayerWings();
    all[user] = playerData;
    savePlayerWings(all);
    
    res.json({ success: true, data: { wing: newWing, cost: template.price } });
  } catch (e) {
    console.error('[wing] 购买翅膀失败:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/wing/feed
router.post('/feed', (req, res) => {
  try {
    const { userId, player_id, id, wing_id, feed_type } = req.body;
    const user = userId || player_id || '1';
    const targetId = parseInt(wing_id) || parseInt(id) || wing_id || id;
    const feedType = feed_type || 'normal';
    
    const FEED_COSTS = { normal: 50, premium: 200, divine: 1000 };
    const FEED_EXP = { normal: 10, premium: 50, divine: 300 };
    
    const allWings = loadPlayerWings();
    const playerData = allWings[user];
    if (!playerData) return res.status(400).json({ success: false, message: '玩家翅膀数据不存在' });
    
    const wing = playerData.owned.find(w => w.id == targetId);
    if (!wing) return res.status(400).json({ success: false, message: '翅膀不存在' });
    
    const cost = FEED_COSTS[feedType] || 50;
    const expGain = FEED_EXP[feedType] || 10;
    wing.exp += expGain;
    
    let leveledUp = false;
    const EXP_PER_LEVEL = 100;
    while (wing.exp >= EXP_PER_LEVEL * wing.level) {
      wing.exp -= EXP_PER_LEVEL * wing.level;
      wing.level++;
      wing.atkBonus += 3;
      wing.defBonus += 2;
      wing.hpBonus += 8;
      leveledUp = true;
    }
    
    savePlayerWings(allWings);
    res.json({ success: true, data: { wingId: wing.id, exp: wing.exp, level: wing.level, expGain, cost, leveledUp } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
