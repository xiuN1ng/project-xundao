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

let userEquipments = [
  { userId: 1, id: 1, name: '铁剑', type: 'weapon', attack: 10, enhanceLevel: 0, sockets: [], gems: [] },
  { userId: 1, id: 2, name: '布衣', type: 'armor', defense: 5, enhanceLevel: 0, sockets: [], gems: [] },
  { userId: 1, id: 3, name: '银甲', type: 'armor', defense: 15, enhanceLevel: 3, sockets: [0], gems: ['def_gem'] }
];

const playerResources = { 1: { spiritStones: 10000, refineStones: 50, augmentTickets: 10 } };
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
  const equip = userEquipments.find(e => e.id === equipId);
  if (!equip) return res.json({ success: false, message: '装备不存在' });
  
  equip.enhanceLevel += 1;
  const bonus = equip.enhanceLevel * 10;
  equip.attack = (equip.attack || 0) + bonus;
  equip.defense = (equip.defense || 0) + bonus;
  
  res.json({ success: true, message: `强化成功！+${equip.enhanceLevel}`, equip });
});

// POST /augment - 增幅装备
router.post('/augment', (req, res) => {
  const { userId, equipId } = req.body;
  const equip = userEquipments.find(e => e.id === equipId);
  if (!equip) return res.json({ success: false, message: '装备不存在' });
  
  const bonusType = ['attack', 'defense', 'hp'][Math.floor(Math.random() * 3)];
  const bonusValue = Math.floor(Math.random() * 10) + 1;
  if (!equip.augment) equip.augment = {};
  equip.augment[bonusType] = (equip.augment[bonusType] || 0) + bonusValue;
  
  const record = { equipId, bonusType, bonusValue, time: new Date() };
  augmentHistory.unshift(record);
  if (augmentHistory.length > 20) augmentHistory.pop();
  
  res.json({ success: true, message: `${bonusType}增幅+${bonusValue}`, equip });
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

module.exports = router;
