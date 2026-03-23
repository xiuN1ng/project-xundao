const express = require('express');
const router = express.Router();

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

let userBeasts = [
  { userId: 1, id: 1, templateId: 1, name: '灵狐', level: 5, quality: 'common', attack: 80, hp: 300, isActive: true, skill: null }
];

router.get('/list', (req, res) => res.json(beastTemplates));

router.get('/my', (req, res) => {
  const userId = parseInt(req.query.userId) || 1;
  res.json(userBeasts.filter(b => b.userId === userId));
});

router.post('/capture', (req, res) => {
  const { userId, templateId } = req.body;
  const template = beastTemplates.find(t => t.id === templateId);
  if (!template) return res.json({ success: false, message: '模板不存在' });
  
  const newBeast = {
    userId, id: Date.now(),
    templateId: template.id,
    name: template.name,
    level: 1,
    quality: template.quality,
    attack: template.baseAttack,
    hp: template.baseHp,
    isActive: false,
    skill: null
  };
  userBeasts.push(newBeast);
  res.json({ success: true, beast: newBeast });
});

router.post('/activate', (req, res) => {
  const { userId, beastId } = req.body;
  userBeasts.forEach(b => b.isActive = (b.id === beastId));
  res.json({ success: true });
});

router.post('/evolve', (req, res) => {
  const { userId, beastId } = req.body;
  const beast = userBeasts.find(b => b.id === beastId && b.userId === userId);
  if (!beast) return res.json({ success: false, message: '灵兽不存在' });
  
  const rule = evolveRules[beast.quality];
  if (!rule) return res.json({ success: false, message: '无法进化' });
  
  const success = Math.random() < rule.rate;
  if (success) {
    const newTemplate = beastTemplates.find(t => t.quality === rule.to);
    beast.quality = rule.to;
    beast.attack = newTemplate.baseAttack * beast.level;
    beast.hp = newTemplate.baseHp * beast.level;
    res.json({ success: true, message: '进化成功！', quality: beast.quality });
  } else {
    res.json({ success: false, message: '进化失败' });
  }
});

router.post('/learnSkill', (req, res) => {
  const { userId, beastId, skillId } = req.body;
  const beast = userBeasts.find(b => b.id === beastId && b.userId === userId);
  const skill = beastSkills.find(s => s.id === skillId);
  if (!beast || !skill) return res.json({ success: false });
  
  beast.skill = skill;
  res.json({ success: true, skill: skill });
});

module.exports = router;
