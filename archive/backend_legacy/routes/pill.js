const express = require('express');
const router = express.Router();

const pillRecipes = [
  { id: 1, name: '灵气丹', type: 'cultivation', effect: { cultivation: 100 }, materials: [{ name: '灵草', count: 2 }], quality: 'common' },
  { id: 2, name: '筑基丹', type: 'realm', effect: { cultivation: 1000 }, materials: [{ name: '灵草', count: 5 }, { name: '灵石', count: 50 }], quality: 'uncommon' },
  { id: 3, name: '金丹丹', type: 'realm', effect: { cultivation: 10000 }, materials: [{ name: '灵草', count: 20 }, { name: '灵石', count: 500 }, { name: '火精', count: 3 }], quality: 'rare' },
  { id: 4, name: '生命丹', type: 'hp', effect: { hp: 500 }, materials: [{ name: '灵草', count: 3 }], quality: 'common' },
  { id: 5, name: '攻击丹', type: 'attack', effect: { attack: 20 }, materials: [{ name: '矿石', count: 5 }], quality: 'uncommon' },
  { id: 6, name: '防御丹', type: 'defense', effect: { defense: 20 }, materials: [{ name: '矿石', count: 5 }], quality: 'uncommon' },
  { id: 7, name: '悟道丹', type: 'skill', effect: { exp: 1000 }, materials: [{ name: '悟道石', count: 1 }], quality: 'epic' }
];

let userPills = [];
let userMaterials = { 1: { '灵草': 100, '灵石': 1000, '矿石': 50, '火精': 5, '悟道石': 0 } };

router.get('/recipes', (req, res) => res.json(pillRecipes));

router.get('/my', (req, res) => {
  const userId = parseInt(req.query.userId) || 1;
  res.json({ pills: userPills.filter(p => p.userId === userId), materials: userMaterials[userId] || {} });
});

router.post('/craft', (req, res) => {
  const { userId, recipeId } = req.body;
  const recipe = pillRecipes.find(r => r.id === recipeId);
  if (!recipe) return res.json({ success: false, message: '丹方不存在' });
  
  const materials = userMaterials[userId] || {};
  for (const mat of recipe.materials) {
    if ((materials[mat.name] || 0) < mat.count) {
      return res.json({ success: false, message: '材料不足: ' + mat.name });
    }
  }
  
  for (const mat of recipe.materials) {
    materials[mat.name] -= mat.count;
  }
  
  const pill = { userId, id: Date.now(), name: recipe.name, type: recipe.type, effect: recipe.effect, quality: recipe.quality };
  userPills.push(pill);
  userMaterials[userId] = materials;
  
  res.json({ success: true, pill });
});

router.post('/use', (req, res) => {
  const { userId, pillId } = req.body;
  const pillIndex = userPills.findIndex(p => p.id === pillId && p.userId === userId);
  if (pillIndex === -1) return res.json({ success: false, message: '丹药不存在' });
  
  const pill = userPills[pillIndex];
  userPills.splice(pillIndex, 1);
  
  res.json({ success: true, message: '使用成功', effect: pill.effect });
});

module.exports = router;
