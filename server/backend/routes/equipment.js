const express = require('express');
const router = express.Router();

// 成就触发服务
let achievementTrigger;
try {
  achievementTrigger = require('../../game/achievement_trigger_service');
} catch (e) {
  console.log('[equipment] 成就触发服务未找到:', e.message);
  achievementTrigger = null;
}

// ==================== 套装配置 ====================
const EQUIPMENT_SUIT_CONFIGS = {
  flame_set: {
    id: 'flame_set', name: '烈焰套装', icon: '🔥', rarity: 4,
    description: '传说中驾驭烈焰的勇者所穿戴的套装，激活后可召唤火焰之力。',
    pieces: { weapon: 'flame_sword', armor: 'flame_armor', helmet: 'flame_helm', accessory: 'flame_ring' },
    bonuses: {
      2: { name: '烈焰之心', description: '攻击时附加15%火焰伤害', stats: { fire_dmg: 15 } },
      4: { name: '焚天灭世', description: '火焰伤害提升50%，暴击伤害+25%', stats: { fire_dmg: 50, crit_dmg: 25 } },
    },
  },
  thunder_set: {
    id: 'thunder_set', name: '雷霆套装', icon: '⚡', rarity: 5,
    description: '汇聚九天雷霆之威，佩戴者可引雷入体，威力无边。',
    pieces: { weapon: 'thunder_blade', armor: 'thunder_armor', helmet: 'thunder_crown', accessory: 'thunder_brace' },
    bonuses: {
      2: { name: '雷鸣之力', description: '攻击速度+20%，闪避率+10%', stats: { speed: 20, dodge: 10 } },
      4: { name: '天罚降临', description: '暴击率+30%，暴击伤害+50%', stats: { crit_rate: 30, crit_dmg: 50 } },
    },
  },
  ice_set: {
    id: 'ice_set', name: '寒冰套装', icon: '❄️', rarity: 3,
    description: '取自万年寒冰精炼而成，佩戴者身法如风寒冰彻骨。',
    pieces: { weapon: 'ice_sword', armor: 'ice_armor', helmet: 'ice_helm', accessory: 'ice_amulet' },
    bonuses: {
      2: { name: '冰封护体', description: '受到伤害-10%，生命回复+5%/秒', stats: { damage_reduction: 10, hp_regen: 5 } },
      4: { name: '绝对零度', description: '冰冻几率+15%，防御+30%', stats: { frost_dmg: 15, def: 30 } },
    },
  },
  dragon_set: {
    id: 'dragon_set', name: '龙鳞套装', icon: '🐉', rarity: 5,
    description: '以真龙鳞片铸就，传说穿戴者可获龙之守护。',
    pieces: { weapon: 'dragon_blade', armor: 'dragon_armor', helmet: 'dragon_helm', accessory: 'dragon_pendant' },
    bonuses: {
      2: { name: '龙之守护', description: '生命上限+30%，伤害减免+15%', stats: { hp: 30, damage_reduction: 15 } },
      4: { name: '龙威降临', description: '全属性+15%，受到致命伤害时有20%几率无敌1秒', stats: { all_stats: 15, damage_reduction: 20 } },
    },
  },
  shadow_set: {
    id: 'shadow_set', name: '暗影套装', icon: '🌑', rarity: 4,
    description: '源自幽冥深处的暗影之力，适合刺客类修士。',
    pieces: { weapon: 'shadow_dagger', armor: 'shadow_cloak', helmet: 'shadow_hood', accessory: 'shadow_ring' },
    bonuses: {
      2: { name: '暗影步伐', description: '闪避率+25%，攻击速度+15%', stats: { dodge: 25, speed: 15 } },
      4: { name: '影分身术', description: '击杀目标后生成一个影子分身协助作战', stats: { atk: 40, crit_rate: 15 } },
    },
  },
  immortal_set: {
    id: 'immortal_set', name: '仙风套装', icon: '☁️', rarity: 5,
    description: '飞升成仙者遗留的套装，蕴含天道法则之力。',
    pieces: { weapon: 'immortal_sword', armor: 'immortal_robe', helmet: 'immortal_crown', accessory: 'immortal_jade' },
    bonuses: {
      2: { name: '仙气缭绕', description: '灵气回复+50%，技能冷却-20%', stats: { spirit_regen: 50, speed: 20 } },
      4: { name: '天人合一', description: '全属性+25%，每次攻击回复生命+3%', stats: { all_stats: 25, hp_regen: 3 } },
    },
  },
};

// 计算套装属性加成
function calculateSuitBonusAttributes(suitId, count, baseAttrs) {
  const result = {};
  if (count < 2) return result;
  const suit = EQUIPMENT_SUIT_CONFIGS[suitId];
  if (!suit) return result;
  
  for (const tier of [2, 3, 4]) {
    if (count < tier) continue;
    const bonus = suit.bonuses[tier];
    if (!bonus) continue;
    
    for (const [attr, percent] of Object.entries(bonus.stats)) {
      if (attr === 'all_stats') {
        ['attack', 'defense', 'hp', 'crit', 'dodge', 'speed'].forEach(key => {
          const baseVal = baseAttrs[key] || 0;
          result[key] = (result[key] || 0) + Math.floor(baseVal * percent / 100);
        });
      } else if (attr === 'atk' || attr === 'def' || attr === 'hp') {
        const keyMap = { atk: 'attack', def: 'defense', hp: 'hp' };
        const key = keyMap[attr];
        const baseVal = baseAttrs[key] || 0;
        result[key] = (result[key] || 0) + Math.floor(baseVal * percent / 100);
      } else {
        result[attr] = (result[attr] || 0) + percent;
      }
    }
  }
  return result;
}

// 获取玩家已穿戴装备的套装计数
function getEquippedSuitCounts(userId) {
  const counts = {};
  const equipped = userEquipments.filter(e => e.userId === userId && e.equipped);
  for (const equip of equipped) {
    if (equip.set_id) {
      counts[equip.set_id] = (counts[equip.set_id] || 0) + 1;
    }
  }
  return counts;
}

// 获取玩家激活的套装效果
function getActiveSuitEffects(userId) {
  const counts = getEquippedSuitCounts(userId);
  const results = [];
  
  for (const [suitId, count] of Object.entries(counts)) {
    if (count < 2) continue;
    const suit = EQUIPMENT_SUIT_CONFIGS[suitId];
    if (!suit) continue;
    
    const activeBonuses = [];
    const bonusList = [];
    for (const tier of [2, 3, 4]) {
      if (count >= tier && suit.bonuses[tier]) {
        activeBonuses.push(tier);
        bonusList.push(suit.bonuses[tier]);
      }
    }
    
    results.push({
      suitId,
      nameCN: suit.name,
      icon: suit.icon,
      count,
      activeBonuses,
      bonuses: bonusList,
    });
  }
  return results;
}

let userEquipments = [
  { userId: 1, id: 1, name: '铁剑', type: 'weapon', attack: 10, enhanceLevel: 0, sockets: [], gems: [], set_id: null },
  { userId: 1, id: 2, name: '布衣', type: 'armor', defense: 5, enhanceLevel: 0, sockets: [], gems: [], set_id: null },
  { userId: 1, id: 3, name: '银甲', type: 'armor', defense: 15, enhanceLevel: 3, sockets: [0], gems: ['def_gem'], set_id: null },
  // 烈焰套装
  { userId: 1, id: 4, name: '烈焰剑', type: 'weapon', attack: 80, crit: 5, enhanceLevel: 0, quality: 'epic', rarity: 4, set_id: 'flame_set', icon: '🔥', base_stats: { attack: 80, crit: 5 } },
  { userId: 1, id: 5, name: '烈焰甲', type: 'armor', defense: 50, hp: 150, enhanceLevel: 0, quality: 'epic', rarity: 4, set_id: 'flame_set', icon: '🔥', base_stats: { defense: 50, hp: 150 } },
  { userId: 1, id: 6, name: '烈焰盔', type: 'helmet', defense: 25, hp: 80, enhanceLevel: 0, quality: 'epic', rarity: 4, set_id: 'flame_set', icon: '🔥', base_stats: { defense: 25, hp: 80 } },
  { userId: 1, id: 7, name: '烈焰戒', type: 'ring', attack: 30, crit: 3, enhanceLevel: 0, quality: 'epic', rarity: 4, set_id: 'flame_set', icon: '🔥', base_stats: { attack: 30, crit: 3 } },
  // 雷霆套装
  { userId: 1, id: 8, name: '惊雷刀', type: 'weapon', attack: 150, crit: 8, enhanceLevel: 0, quality: 'legendary', rarity: 5, set_id: 'thunder_set', icon: '⚡', base_stats: { attack: 150, crit: 8 } },
  { userId: 1, id: 9, name: '雷霆甲', type: 'armor', defense: 80, hp: 300, enhanceLevel: 0, quality: 'legendary', rarity: 5, set_id: 'thunder_set', icon: '⚡', base_stats: { defense: 80, hp: 300 } },
  { userId: 1, id: 10, name: '雷冠', type: 'helmet', defense: 40, hp: 150, enhanceLevel: 0, quality: 'legendary', rarity: 5, set_id: 'thunder_set', icon: '⚡', base_stats: { defense: 40, hp: 150 } },
  { userId: 1, id: 11, name: '雷镯', type: 'bracelet', defense: 30, hp: 120, enhanceLevel: 0, quality: 'legendary', rarity: 5, set_id: 'thunder_set', icon: '⚡', base_stats: { defense: 30, hp: 120 } },
  // 寒冰套装
  { userId: 1, id: 12, name: '寒冰剑', type: 'weapon', attack: 45, crit: 3, enhanceLevel: 0, quality: 'rare', rarity: 3, set_id: 'ice_set', icon: '❄️', base_stats: { attack: 45, crit: 3 } },
  { userId: 1, id: 13, name: '寒冰甲', type: 'armor', defense: 30, hp: 100, enhanceLevel: 0, quality: 'rare', rarity: 3, set_id: 'ice_set', icon: '❄️', base_stats: { defense: 30, hp: 100 } },
];

const playerResources = { 1: { spiritStones: 10000, refineStones: 50, augmentTickets: 10, materials: {} } };
const augmentHistory = [];
const gemTypes = [
  { id: 'atk_gem', name: '攻击宝石', effect: 'attack+10' },
  { id: 'def_gem', name: '防御宝石', effect: 'defense+10' },
  { id: 'hp_gem', name: '生命宝石', effect: 'hp+100' },
  { id: 'crit_gem', name: '暴击宝石', effect: 'crit+5%' }
];

// GET /gems - 获取宝石列表（必须在 /:userId 之前，否则会被匹配）
router.get('/gems', (req, res) => {
  res.json({ success: true, gems: gemTypes });
});

// GET /:userId - 获取用户装备列表
router.get('/:userId', (req, res) => {
  const userId = parseInt(req.params.userId) || 1;
  res.json(userEquipments.filter(e => e.userId === userId));
});

// GET /:userId/equipped - 获取已穿戴装备
router.get('/:userId/equipped', (req, res) => {
  const userId = parseInt(req.params.userId) || 1;
  const equipped = userEquipments.filter(e => e.userId === userId && e.equipped);
  res.json({ success: true, equipped });
});

// POST /equip - 穿戴装备
router.post('/equip', (req, res) => {
  const { userId, equipmentId } = req.body;
  const equip = userEquipments.find(e => e.id === equipmentId);
  if (!equip) return res.json({ success: false, message: '装备不存在' });
  equip.equipped = true;
  res.json({ success: true, equip });
});

// POST /unequip - 卸下装备
router.post('/unequip', (req, res) => {
  const { userId, equipmentId } = req.body;
  const equip = userEquipments.find(e => e.id === equipmentId);
  if (!equip) return res.json({ success: false, message: '装备不存在' });
  equip.equipped = false;
  res.json({ success: true, equip });
});

// POST /refine - 强化装备
router.post('/refine', (req, res) => {
  const { userId, equipId } = req.body;
  const uid = userId || 1;
  const equip = userEquipments.find(e => e.id == equipId);
  if (!equip) return res.json({ success: false, message: '装备不存在' });

  const level = equip.enhanceLevel || 0;
  const spiritCost = Math.floor(500 * Math.pow(1.5, level));
  const materialCost = 1 + Math.floor(level / 3);

  const resources = playerResources[uid] || playerResources[1];
  if ((resources.spiritStones || 0) < spiritCost) {
    return res.json({ success: false, message: `灵石不足！需要${spiritCost}灵石，当前${resources.spiritStones}灵石`, code: 'INSUFFICIENT_SPIRIT' });
  }
  if ((resources.refineStones || 0) < materialCost) {
    return res.json({ success: false, message: `强化石不足！需要${materialCost}个，当前${resources.refineStones}个`, code: 'INSUFFICIENT_MATERIAL' });
  }

  // 扣除资源
  resources.spiritStones -= spiritCost;
  resources.refineStones -= materialCost;

  equip.enhanceLevel = level + 1;
  const bonus = equip.enhanceLevel * 10;
  equip.attack = (equip.attack || 0) + bonus;
  equip.defense = (equip.defense || 0) + bonus;

  res.json({
    success: true,
    message: `强化成功！+${equip.enhanceLevel}`,
    equip,
    remainingStones: resources.spiritStones,
    remainingRefineStones: resources.refineStones,
    spiritCost,
    materialCost
  });
});

// POST /augment - 增幅装备
router.post('/augment', (req, res) => {
  const { userId, equipId } = req.body;
  const uid = userId || 1;
  const equip = userEquipments.find(e => e.id == equipId);
  if (!equip) return res.json({ success: false, message: '装备不存在' });

  const spiritCost = 5000;
  const ticketCost = 1;
  const resources = playerResources[uid] || playerResources[1];

  if ((resources.spiritStones || 0) < spiritCost) {
    return res.json({ success: false, message: `灵石不足！需要${spiritCost}灵石，当前${resources.spiritStones}灵石`, code: 'INSUFFICIENT_SPIRIT' });
  }
  if ((resources.augmentTickets || 0) < ticketCost) {
    return res.json({ success: false, message: `增幅券不足！`, code: 'INSUFFICIENT_TICKET' });
  }

  resources.spiritStones -= spiritCost;
  resources.augmentTickets -= ticketCost;

  const bonusType = ['attack', 'defense', 'hp'][Math.floor(Math.random() * 3)];
  const bonusValue = Math.floor(Math.random() * 10) + 1;
  if (!equip.augment) equip.augment = {};
  equip.augment[bonusType] = (equip.augment[bonusType] || 0) + bonusValue;

  const record = { equipId, bonusType, bonusValue, time: new Date() };
  augmentHistory.unshift(record);
  if (augmentHistory.length > 20) augmentHistory.pop();

  res.json({
    success: true,
    message: `${bonusType}增幅+${bonusValue}`,
    equip,
    remainingStones: resources.spiritStones,
    remainingTickets: resources.augmentTickets
  });
});

// POST /socket/add - 打孔
router.post('/socket/add', (req, res) => {
  const { userId, equipId } = req.body;
  const equip = userEquipments.find(e => e.id === equipId);
  if (!equip) return res.json({ success: false, message: '装备不存在' });
  if ((equip.sockets || []).length >= 4) return res.json({ success: false, message: '孔位已满' });
  equip.sockets = equip.sockets || [];
  equip.sockets.push(null);
  res.json({ success: true, equip });
});

// POST /socket/inlay - 镶嵌宝石
router.post('/socket/inlay', (req, res) => {
  const { userId, equipId, gemId, socketIndex } = req.body;
  const equip = userEquipments.find(e => e.id === equipId);
  if (!equip) return res.json({ success: false, message: '装备不存在' });
  if (!equip.sockets || socketIndex >= equip.sockets.length) return res.json({ success: false, message: '孔位不存在' });
  equip.gems = equip.gems || [];
  equip.gems[socketIndex] = gemId;
  res.json({ success: true, equip });
});

// POST /socket/remove - 取下宝石
router.post('/socket/remove', (req, res) => {
  const { userId, equipId, socketIndex } = req.body;
  const equip = userEquipments.find(e => e.id === equipId);
  if (!equip) return res.json({ success: false, message: '装备不存在' });
  if (equip.gems) equip.gems[socketIndex] = null;
  res.json({ success: true, equip });
});

// POST /inherit - 继承装备强化
router.post('/inherit', (req, res) => {
  const { userId, sourceEquipId, targetEquipId } = req.body;
  const source = userEquipments.find(e => e.id === sourceEquipId);
  const target = userEquipments.find(e => e.id === targetEquipId);
  if (!source || !target) return res.json({ success: false, message: '装备不存在' });
  
  target.enhanceLevel = source.enhanceLevel;
  target.augment = { ...source.augment };
  target.sockets = [...(source.sockets || [])];
  target.gems = [...(source.gems || [])];
  
  res.json({ success: true, message: '继承成功', target });
});

// GET /player/:userId - 获取玩家资源
router.get('/player/:userId', (req, res) => {
  const userId = parseInt(req.params.userId) || 1;
  res.json({ success: true, ...playerResources[userId] });
});

// GET /augment/history/:equipId - 增幅历史
router.get('/augment/history/:equipId', (req, res) => {
  const equipId = parseInt(req.params.equipId);
  const history = augmentHistory.filter(h => h.equipId === equipId);
  res.json({ success: true, history });
});

// ==================== 套装系统 API ====================

// GET /sets/config/all - 获取所有套装配置
router.get('/sets/config/all', (req, res) => {
  const suits = Object.values(EQUIPMENT_SUIT_CONFIGS).map(suit => ({
    id: suit.id,
    name: suit.name,
    nameCN: suit.name,
    icon: suit.icon,
    rarity: suit.rarity,
    description: suit.description,
    pieces: suit.pieces,
    bonuses: suit.bonuses,
  }));
  res.json({ success: true, data: suits });
});

// GET /sets/:userId - 获取玩家套装信息
router.get('/sets/:userId', (req, res) => {
  const userId = parseInt(req.params.userId) || 1;
  const activeEffects = getActiveSuitEffects(userId);
  const suitCounts = getEquippedSuitCounts(userId);
  res.json({ success: true, data: { activeEffects, suitCounts } });
});

// ============================================================
// 装备分解 & 合成系统
// ============================================================

// 分解配方：品质 -> 返还材料
const DECOMPOSE_RECIPES = {
  normal:    { spirit_return: 50,  material: '普通精华', mat_count: 1 },
  good:      { spirit_return: 120, material: '精良精华', mat_count: 2 },
  rare:      { spirit_return: 300, material: '稀有精华', mat_count: 3 },
  epic:      { spirit_return: 800, material: '史诗精华', mat_count: 5 },
  legendary: { spirit_return: 2000, material: '传说精华', mat_count: 10 },
};

// 合成配方：类型+品质 -> 消耗
const SYNTHESIZE_RECIPES = {
  weapon_normal:    { spirit: 200,  materials: { '普通精华': 3 }, attack: 20,  defense: 0,  hp: 50,  quality: 'normal' },
  weapon_good:      { spirit: 600,  materials: { '精良精华': 3 }, attack: 45,  defense: 0,  hp: 100, quality: 'good' },
  weapon_rare:      { spirit: 1500, materials: { '稀有精华': 3 }, attack: 90,  defense: 0,  hp: 200, quality: 'rare' },
  weapon_epic:      { spirit: 4000, materials: { '史诗精华': 3 }, attack: 180, defense: 0,  hp: 400, quality: 'epic' },
  weapon_legendary: { spirit: 10000, materials: { '传说精华': 3 }, attack: 350, defense: 0,  hp: 800, quality: 'legendary' },
  armor_normal:     { spirit: 200,  materials: { '普通精华': 3 }, attack: 0,  defense: 20, hp: 80,  quality: 'normal' },
  armor_good:       { spirit: 600,  materials: { '精良精华': 3 }, attack: 0,  defense: 45, hp: 160, quality: 'good' },
  armor_rare:      { spirit: 1500, materials: { '稀有精华': 3 }, attack: 0,  defense: 90, hp: 320, quality: 'rare' },
  armor_epic:      { spirit: 4000, materials: { '史诗精华': 3 }, attack: 0,  defense: 180, hp: 640, quality: 'epic' },
  armor_legendary: { spirit: 10000, materials: { '传说精华': 3 }, attack: 0, defense: 350, hp: 1280, quality: 'legendary' },
  helmet_normal:    { spirit: 150,  materials: { '普通精华': 2 }, attack: 5,  defense: 10, hp: 40,  quality: 'normal' },
  helmet_good:      { spirit: 450,  materials: { '精良精华': 2 }, attack: 12, defense: 22, hp: 80,  quality: 'good' },
  helmet_rare:      { spirit: 1200, materials: { '稀有精华': 2 }, attack: 25, defense: 45, hp: 160, quality: 'rare' },
  helmet_epic:      { spirit: 3200, materials: { '史诗精华': 2 }, attack: 50, defense: 90, hp: 320, quality: 'epic' },
  helmet_legendary: { spirit: 8000, materials: { '传说精华': 2 }, attack: 100, defense: 175, hp: 640, quality: 'legendary' },
  shoes_normal:     { spirit: 150,  materials: { '普通精华': 2 }, attack: 5,  defense: 8,  hp: 30,  quality: 'normal' },
  shoes_good:       { spirit: 450,  materials: { '精良精华': 2 }, attack: 12, defense: 18, hp: 60,  quality: 'good' },
  shoes_rare:      { spirit: 1200, materials: { '稀有精华': 2 }, attack: 25, defense: 36, hp: 120, quality: 'rare' },
  shoes_epic:      { spirit: 3200, materials: { '史诗精华': 2 }, attack: 50, defense: 72, hp: 240, quality: 'epic' },
  shoes_legendary: { spirit: 8000, materials: { '传说精华': 2 }, attack: 100, defense: 145, hp: 480, quality: 'legendary' },
  accessory_normal:    { spirit: 150,  materials: { '普通精华': 2 }, attack: 8,  defense: 8,  hp: 25,  quality: 'normal' },
  accessory_good:      { spirit: 450,  materials: { '精良精华': 2 }, attack: 18, defense: 18, hp: 50,  quality: 'good' },
  accessory_rare:     { spirit: 1200, materials: { '稀有精华': 2 }, attack: 36, defense: 36, hp: 100, quality: 'rare' },
  accessory_epic:     { spirit: 3200, materials: { '史诗精华': 2 }, attack: 72, defense: 72, hp: 200, quality: 'epic' },
  accessory_legendary: { spirit: 8000, materials: { '传说精华': 2 }, attack: 145, defense: 145, hp: 400, quality: 'legendary' },
};

// 品质名称映射
const QUALITY_NAMES = { normal: '普通', good: '精良', rare: '稀有', epic: '史诗', legendary: '传说' };
const TYPE_NAMES = { weapon: '剑', armor: '甲', helmet: '盔', shoes: '鞋', accessory: '饰品' };

// 从装备名推断品质
function inferQuality(name) {
  if (!name) return 'normal';
  if (name.includes('传说') || name.includes('Legendary')) return 'legendary';
  if (name.includes('史诗') || name.includes('Epic')) return 'epic';
  if (name.includes('稀有') || name.includes('Rare')) return 'rare';
  if (name.includes('精良') || name.includes('Good')) return 'good';
  return 'normal';
}

// 确保玩家材料数据结构存在
function ensureMaterials(uid) {
  if (!playerResources[uid]) {
    playerResources[uid] = { spiritStones: 500, refineStones: 10, augmentTickets: 1, materials: {} };
  }
  if (!playerResources[uid].materials) playerResources[uid].materials = {};
  return playerResources[uid];
}

/**
 * GET /decompose-recipes - 获取分解配方
 */
router.get('/decompose-recipes', (req, res) => {
  res.json({ success: true, recipes: DECOMPOSE_RECIPES });
});

/**
 * GET /synthesize-recipes - 获取合成配方
 */
router.get('/synthesize-recipes', (req, res) => {
  res.json({ success: true, recipes: SYNTHESIZE_RECIPES });
});

/**
 * POST /decompose - 分解装备
 * body: { userId, equipId }
 */
router.post('/decompose', (req, res) => {
  const userId = parseInt(req.body.userId) || parseInt(req.body.player_id) || 1;
  const equipId = parseInt(req.body.equipId);

  if (!equipId) return res.json({ success: false, message: '缺少equipId' });

  const idx = userEquipments.findIndex(e => e.id === equipId && e.userId === userId);
  if (idx === -1) return res.json({ success: false, message: '装备不存在' });

  const equip = userEquipments[idx];
  const quality = inferQuality(equip.name);
  const recipe = DECOMPOSE_RECIPES[quality] || DECOMPOSE_RECIPES.normal;

  // 从玩家装备列表移除
  userEquipments.splice(idx, 1);

  // 返还灵石和材料
  const resources = ensureMaterials(userId);
  resources.spiritStones = (resources.spiritStones || 0) + recipe.spirit_return;
  resources.materials[recipe.material] = (resources.materials[recipe.material] || 0) + recipe.mat_count;

  console.log(`[equipment] 分解: userId=${userId} equipId=${equipId} quality=${quality} -> ${recipe.material}×${recipe.mat_count} + ${recipe.spirit_return}灵石`);

  res.json({
    success: true,
    message: `分解成功！获得【${recipe.material}】×${recipe.mat_count}，返还${recipe.spirit_return}灵石`,
    spirit_return: recipe.spirit_return,
    material: { name: recipe.material, count: recipe.mat_count },
    remainingSpiritStones: resources.spiritStones
  });
});

/**
 * POST /synthesize - 合成装备
 * body: { userId, equipType, quality }
 * equipType: weapon | armor | helmet | shoes | accessory
 * quality: normal | good | rare | epic | legendary
 */
router.post('/synthesize', (req, res) => {
  const userId = parseInt(req.body.userId) || parseInt(req.body.player_id) || 1;
  const equipType = req.body.equipType || 'weapon';
  const quality = req.body.quality || 'normal';

  const recipeKey = `${equipType}_${quality}`;
  const recipe = SYNTHESIZE_RECIPES[recipeKey];
  if (!recipe) return res.json({ success: false, message: `不支持的装备类型或品质: ${equipType} ${quality}` });

  const resources = ensureMaterials(userId);

  // 检查灵石
  if ((resources.spiritStones || 0) < recipe.spirit) {
    return res.json({ success: false, message: `灵石不足！需要${recipe.spirit}，当前${resources.spiritStones}`, code: 'INSUFFICIENT_SPIRIT' });
  }

  // 检查材料
  for (const [mat, needed] of Object.entries(recipe.materials)) {
    if ((resources.materials[mat] || 0) < needed) {
      return res.json({ success: false, message: `材料不足！需要【${mat}】×${needed}，当前${resources.materials[mat] || 0}`, code: 'INSUFFICIENT_MATERIAL' });
    }
  }

  // 扣除资源
  resources.spiritStones -= recipe.spirit;
  for (const [mat, needed] of Object.entries(recipe.materials)) {
    resources.materials[mat] -= needed;
  }

  // 生成新装备
  const maxId = userEquipments.reduce((m, e) => Math.max(m, e.id), 0);
  const qualityName = QUALITY_NAMES[quality] || '普通';
  const typeName = TYPE_NAMES[equipType] || '装';
  const newEquip = {
    userId,
    id: maxId + 1,
    name: `${qualityName}${typeName}`,
    type: equipType,
    quality: recipe.quality,
    attack: recipe.attack,
    defense: recipe.defense,
    hp: recipe.hp,
    enhanceLevel: 0,
    sockets: quality === 'legendary' ? [null, null] : quality === 'epic' ? [null] : [],
    gems: [],
    equipped: false,
    crafted: true
  };

  userEquipments.push(newEquip);

  console.log(`[equipment] 合成: userId=${userId} type=${equipType} quality=${quality} -> ${newEquip.name}`);

  res.json({
    success: true,
    message: `合成成功！获得【${newEquip.name}】`,
    equip: newEquip,
    remainingSpiritStones: resources.spiritStones
  });
});

// POST /initialize - 新手初始装备（武器+防具各1件）
router.post('/initialize', (req, res) => {
  const userId = parseInt(req.body.userId) || parseInt(req.body.player_id) || 1;

  // 检查是否已有装备
  const existing = userEquipments.filter(e => e.userId === userId);
  if (existing.length > 0) {
    return res.json({ success: true, message: '已有装备，跳过', equips: existing });
  }

  // 生成唯一ID
  const maxId = userEquipments.reduce((m, e) => Math.max(m, e.id), 0);

  const starterWeapon = {
    userId,
    id: maxId + 1,
    name: '新手木剑',
    type: 'weapon',
    quality: 'common',
    attack: 15,
    defense: 0,
    hp: 0,
    enhanceLevel: 0,
    sockets: [],
    gems: [],
    equipped: true
  };

  const starterArmor = {
    userId,
    id: maxId + 2,
    name: '新手布衣',
    type: 'armor',
    quality: 'common',
    attack: 0,
    defense: 10,
    hp: 50,
    enhanceLevel: 0,
    sockets: [],
    gems: [],
    equipped: true
  };

  userEquipments.push(starterWeapon, starterArmor);

  // 初始化玩家资源（如果不存在）
  if (!playerResources[userId]) {
    playerResources[userId] = { spiritStones: 500, refineStones: 10, augmentTickets: 1, materials: {} };
  }

  console.log(`[equipment] 初始装备发放: userId=${userId}, weapon=${starterWeapon.name}, armor=${starterArmor.name}`);

  res.json({
    success: true,
    message: '初始装备发放成功',
    equips: [starterWeapon, starterArmor]
  });
});

// 导出数据供其他模块使用（如 auth.js 新用户注册时发放装备）
module.exports = router;
module.exports._userEquipments = userEquipments;
module.exports._playerResources = playerResources;
module.exports.initStarterEquipment = function(userId) {
  const existing = userEquipments.filter(e => e.userId === userId);
  if (existing.length > 0) return existing;
  const maxId = userEquipments.reduce((m, e) => Math.max(m, e.id), 0);
  userEquipments.push(
    { userId, id: maxId + 1, name: '新手木剑', type: 'weapon', quality: 'common', attack: 15, defense: 0, hp: 0, enhanceLevel: 0, sockets: [], gems: [], equipped: true },
    { userId, id: maxId + 2, name: '新手布衣', type: 'armor', quality: 'common', attack: 0, defense: 10, hp: 50, enhanceLevel: 0, sockets: [], gems: [], equipped: true }
  );
  if (!playerResources[userId]) playerResources[userId] = { spiritStones: 500, refineStones: 10, augmentTickets: 1, materials: {} };
  return userEquipments.filter(e => e.userId === userId);
};
