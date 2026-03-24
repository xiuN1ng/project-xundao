const express = require('express');
const router = express.Router();

// 成就触发服务
let achievementTrigger;
try {
  achievementTrigger = require('../../game/achievement_trigger_service');
} catch (e) {
  console.log('[forge] 成就触发服务未找到:', e.message);
  achievementTrigger = null;
}

// Player materials (shared with cave system for iron_ingot, etc)
let playerMaterials = {
  user1: { iron_ingot: 50, refined_iron: 20, jade: 30, fire_crystal: 10, thunder_crystal: 5, dragon_scale: 2, strengthen_stone: 25, spirit_stone: 5000 }
};

// Recipes (hardcode these)
const recipes = [
  { id: 'flying_sword', name: '飞剑', type: 'weapon', desc: '基础飞剑', materials: { iron_ingot: 3 }, stats: { atk: 10 }, quality: 'common', color: '#8B8B8B' },
  { id: 'flame_blade', name: '烈焰刀', type: 'weapon', desc: '火焰伤害', materials: { iron_ingot: 5, fire_crystal: 2 }, stats: { atk: 25, crit_rate: 5 }, quality: 'uncommon', color: '#00FF7F' },
  { id: 'thunder_sword', name: '雷霆剑', type: 'weapon', desc: '雷霆之力', materials: { flame_blade: 1, thunder_crystal: 3, refined_iron: 5 }, stats: { atk: 50, crit_rate: 10 }, quality: 'rare', color: '#1E90FF' },
  { id: 'battle_armor', name: '战甲', type: 'armor', desc: '基础防具', materials: { iron_ingot: 3 }, stats: { def: 10 }, quality: 'common', color: '#8B8B8B' },
  { id: 'jade_armor', name: '玉鳞甲', type: 'armor', desc: '玉石护甲', materials: { iron_ingot: 5, jade: 2 }, stats: { def: 25, hp: 50 }, quality: 'uncommon', color: '#00FF7F' },
  { id: 'dragon_scale_armor', name: '龙鳞甲', type: 'armor', desc: '龙鳞护甲', materials: { jade_armor: 1, dragon_scale: 3, refined_iron: 5 }, stats: { def: 50, hp: 100 }, quality: 'rare', color: '#1E90FF' },
  { id: 'health_pendant', name: '护符', type: 'accessory', desc: '基础饰品', materials: { jade: 2 }, stats: { hp: 50 }, quality: 'common', color: '#8B8B8B' },
  { id: 'spirit_pendant', name: '灵玉佩', type: 'accessory', desc: '灵气玉佩', materials: { jade: 3, spirit_stone: 200 }, stats: { hp: 100, spirit_rate: 5 }, quality: 'uncommon', color: '#00FF7F' },
  { id: 'crit_ring', name: '戒指', type: 'accessory', desc: '基础戒指', materials: { jade: 2 }, stats: { crit_rate: 5 }, quality: 'common', color: '#8B8B8B' },
  { id: 'warrior_ring', name: '战神戒', type: 'accessory', desc: '战神之戒', materials: { crit_ring: 1, fire_crystal: 2, thunder_crystal: 1 }, stats: { crit_rate: 15, atk: 10 }, quality: 'rare', color: '#1E90FF' }
];

// Player Equipment Store
let playerEquipment = [
  { id: 1, name: '铁剑', type: 'weapon', quality: 'common', color: '#8B8B8B', stats: { atk: 10 }, strengthenLevel: 0, bonusStats: {} }
];
let nextId = 2;

// Equipped items
let equippedItems = {
  user1: {
    weapon: null,
    armor: null,
    accessory: null
  }
};

// Material name mapping
const materialNames = {
  iron_ingot: '铁锭',
  refined_iron: '精铁',
  jade: '玉石',
  fire_crystal: '火晶',
  thunder_crystal: '雷晶',
  dragon_scale: '龙鳞',
  strengthen_stone: '强化石',
  spirit_stone: '灵石',
  flying_sword: '飞剑',
  flame_blade: '烈焰刀',
  battle_armor: '战甲',
  jade_armor: '玉鳞甲',
  health_pendant: '护符',
  spirit_pendant: '灵玉佩',
  crit_ring: '戒指'
};

// GET / - Get all recipes with their material costs
router.get('/', (req, res) => {
  const userId = req.query.userId || 'user1';
  const materials = playerMaterials[userId] || {};
  
  const recipesWithCosts = recipes.map(recipe => {
    const materialCosts = [];
    for (const [matId, count] of Object.entries(recipe.materials)) {
      const available = materials[matId] || 0;
      materialCosts.push({
        id: matId,
        name: materialNames[matId] || matId,
        required: count,
        available: available,
        sufficient: available >= count
      });
    }
    return {
      ...recipe,
      materialCosts
    };
  });
  
  res.json(recipesWithCosts);
});

// GET /materials - Get player materials
router.get('/materials', (req, res) => {
  const userId = req.query.userId || 'user1';
  const materials = playerMaterials[userId] || {};
  res.json(materials);
});

// POST /forge - Forge equipment
router.post('/forge', (req, res) => {
  const { userId = 'user1', recipeId } = req.body;
  
  if (!playerMaterials[userId]) {
    playerMaterials[userId] = {};
  }
  
  const recipe = recipes.find(r => r.id === recipeId);
  if (!recipe) {
    return res.json({ success: false, message: '配方不存在' });
  }
  
  // Check materials
  for (const [matId, count] of Object.entries(recipe.materials)) {
    const available = playerMaterials[userId][matId] || 0;
    if (available < count) {
      return res.json({ 
        success: false, 
        message: `材料不足: ${materialNames[matId] || matId} 需要${count}个，现有${available}个` 
      });
    }
  }
  
  // Deduct materials
  for (const [matId, count] of Object.entries(recipe.materials)) {
    playerMaterials[userId][matId] -= count;
  }
  
  // Create equipment
  const equipment = {
    id: nextId++,
    name: recipe.name,
    type: recipe.type,
    quality: recipe.quality,
    color: recipe.color,
    stats: { ...recipe.stats },
    strengthenLevel: 0,
    bonusStats: {}
  };
  
  playerEquipment.push(equipment);
  
  // ========== 成就触发：获得装备 ==========
  let achievementResults = [];
  if (achievementTrigger) {
    try {
      const userNumId = parseInt(userId) || 1;
      const totalEquipment = playerEquipment.filter(e => e.userId === userNumId || e.id).length;
      achievementResults = achievementTrigger.onEquipmentObtain(userNumId, playerEquipment.length, recipe.quality);
      const notifications = achievementTrigger.popNotifications(userNumId);
      if (notifications.length > 0) {
        console.log(`[成就通知] 用户${userId}达成成就:`, notifications.map(n => n.achievementName).join(', '));
      }
    } catch (e) {
      console.error('[forge] 成就触发失败:', e.message);
    }
  }
  
  res.json({ 
    success: true, 
    equipment,
    achievements: achievementResults.length > 0 ? achievementResults.map(a => ({
      id: a.id,
      name: a.name,
      desc: a.desc,
      reward: a.reward
    })) : undefined
  });
});

// GET /equipment - Get player forged equipment list
router.get('/equipment', (req, res) => {
  const userId = req.query.userId || 'user1';
  const equipped = equippedItems[userId] || { weapon: null, armor: null, accessory: null };
  
  const equipmentWithStatus = playerEquipment.map(eq => ({
    ...eq,
    isEquipped: equipped[eq.type] === eq.id
  }));
  
  res.json(equipmentWithStatus);
});

// GET /equipment/:id - Get single equipment details
router.get('/equipment/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const equipment = playerEquipment.find(e => e.id === id);
  
  if (!equipment) {
    return res.json({ success: false, message: '装备不存在' });
  }
  
  // Calculate strengthen cost and success rate
  const level = equipment.strengthenLevel;
  const stoneCost = Math.floor(5 * Math.pow(1.5, level));
  const spiritCost = Math.floor(100 * Math.pow(2, level));
  const successRate = Math.max(20, 100 - level * 10);
  
  // Calculate bonus stats
  const bonusStats = {};
  const statBonusPerLevel = 0.1; // 10% bonus per level
  for (const [stat, value] of Object.entries(equipment.stats)) {
    bonusStats[stat] = Math.floor(value * statBonusPerLevel * level);
  }
  
  res.json({
    ...equipment,
    strengthenCost: { stone: stoneCost, spirit: spiritCost },
    successRate,
    bonusStats
  });
});

// POST /strengthen - Strengthen equipment
router.post('/strengthen', (req, res) => {
  const { userId = 'user1', equipmentId } = req.body;
  
  const equipment = playerEquipment.find(e => e.id === equipmentId);
  if (!equipment) {
    return res.json({ success: false, message: '装备不存在' });
  }
  
  if (equipment.strengthenLevel >= 15) {
    return res.json({ success: false, message: '已达最高强化等级' });
  }
  
  if (!playerMaterials[userId]) {
    playerMaterials[userId] = {};
  }
  
  const level = equipment.strengthenLevel;
  const stoneCost = Math.floor(5 * Math.pow(1.5, level));
  const spiritCost = Math.floor(100 * Math.pow(2, level));
  const successRate = Math.max(20, 100 - level * 10);
  
  // Check materials
  if ((playerMaterials[userId].strengthen_stone || 0) < stoneCost) {
    return res.json({ success: false, message: `强化石不足，需要${stoneCost}个` });
  }
  if ((playerMaterials[userId].spirit_stone || 0) < spiritCost) {
    return res.json({ success: false, message: `灵石不足，需要${spiritCost}个` });
  }
  
  // Deduct materials
  playerMaterials[userId].strengthen_stone -= stoneCost;
  playerMaterials[userId].spirit_stone -= spiritCost;
  
  // Roll for success
  const roll = Math.random() * 100;
  const success = roll < successRate;
  
  if (success) {
    equipment.strengthenLevel += 1;
    
    // Apply stat bonus
    const statBonusPerLevel = 0.1;
    for (const [stat, value] of Object.entries(equipment.stats)) {
      if (!equipment.bonusStats) equipment.bonusStats = {};
      equipment.bonusStats[stat] = Math.floor(value * statBonusPerLevel * equipment.strengthenLevel);
    }
    
    return res.json({ 
      success: true, 
      level: equipment.strengthenLevel,
      message: `强化成功！等级提升至${equipment.strengthenLevel}`
    });
  } else {
    return res.json({ 
      success: false, 
      level: equipment.strengthenLevel,
      message: '强化失败，但装备不会降级'
    });
  }
});

// POST /equip - Equip item
router.post('/equip', (req, res) => {
  const { userId = 'user1', equipmentId } = req.body;
  
  const equipment = playerEquipment.find(e => e.id === equipmentId);
  if (!equipment) {
    return res.json({ success: false, message: '装备不存在' });
  }
  
  if (!equippedItems[userId]) {
    equippedItems[userId] = { weapon: null, armor: null, accessory: null };
  }
  
  equippedItems[userId][equipment.type] = equipmentId;
  
  res.json({ success: true, message: `已装备${equipment.name}` });
});

// POST /unequip - Unequip item
router.post('/unequip', (req, res) => {
  const { userId = 'user1', slot } = req.body;
  
  if (!equippedItems[userId]) {
    equippedItems[userId] = { weapon: null, armor: null, accessory: null };
  }
  
  const oldEquipId = equippedItems[userId][slot];
  equippedItems[userId][slot] = null;
  
  if (oldEquipId) {
    const oldEquip = playerEquipment.find(e => e.id === oldEquipId);
    res.json({ success: true, message: `已卸下${oldEquip?.name || ''}` });
  } else {
    res.json({ success: false, message: '该装备栏没有装备' });
  }
});

// GET /equipped - Get currently equipped items
router.get('/equipped', (req, res) => {
  const userId = req.query.userId || 'user1';
  const equipped = equippedItems[userId] || { weapon: null, armor: null, accessory: null };
  
  const equippedList = [];
  for (const [slot, equipId] of Object.entries(equipped)) {
    if (equipId) {
      const equipment = playerEquipment.find(e => e.id === equipId);
      if (equipment) {
        equippedList.push({ slot, ...equipment });
      }
    }
  }
  
  res.json(equippedList);
});

module.exports = router;
