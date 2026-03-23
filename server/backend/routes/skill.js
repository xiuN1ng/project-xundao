const express = require('express');
const router = express.Router();

// 功法模板 - 扩展到50+
const skillTemplates = [
  // 修炼功法 (10)
  { id: 1, name: '引气诀', type: 'passive', category: 'cultivation', effect: { attack: 10 }, desc: '提升10点攻击力', quality: 'common', price: 100, level: 1 },
  { id: 2, name: '灵气凝聚', type: 'passive', category: 'cultivation', effect: { cultivationRate: 0.1 }, desc: '修炼效率+10%', quality: 'common', price: 150, level: 1 },
  { id: 3, name: '吐纳术', type: 'passive', category: 'cultivation', effect: { hp: 50 }, desc: '提升50点生命', quality: 'common', price: 120, level: 1 },
  { id: 4, name: '心法入门', type: 'passive', category: 'cultivation', effect: { speed: 1 }, desc: '提升1点速度', quality: 'common', price: 100, level: 1 },
  { id: 5, name: '清心咒', type: 'passive', category: 'cultivation', effect: { defense: 5 }, desc: '提升5点防御', quality: 'common', price: 80, level: 1 },
  { id: 6, name: '混元心法', type: 'passive', category: 'cultivation', effect: { cultivationRate: 0.2, attack: 20 }, desc: '修炼效率+20%,攻击+20', quality: 'uncommon', price: 500, level: 5 },
  { id: 7, name: '九转心经', type: 'passive', category: 'cultivation', effect: { cultivationRate: 0.3, hp: 200 }, desc: '修炼效率+30%,生命+200', quality: 'rare', price: 1500, level: 10 },
  { id: 8, name: '太上感应篇', type: 'passive', category: 'cultivation', effect: { cultivationRate: 0.5, allAttr: 0.1 }, desc: '修炼效率+50%,全属性+10%', quality: 'epic', price: 5000, level: 20 },
  { id: 9, name: '道心种魔', type: 'passive', category: 'cultivation', effect: { cultivationRate: 1.0, criticalRate: 0.1 }, desc: '修炼效率+100%,暴击+10%', quality: 'legendary', price: 20000, level: 40 },
  { id: 10, name: '天道无始', type: 'passive', category: 'cultivation', effect: { cultivationRate: 2.0, allAttr: 0.3 }, desc: '修炼效率+200%,全属性+30%', quality: 'mythical', price: 100000, level: 60 },
  
  // 攻击功法 (15)
  { id: 11, name: '烈焰掌', type: 'active', category: 'attack', effect: { damage: 150 }, desc: '造成150%伤害', quality: 'common', price: 200, level: 2 },
  { id: 12, name: '寒冰指', type: 'active', category: 'attack', effect: { damage: 150, slow: 0.3 }, desc: '造成150%伤害,减速30%', quality: 'common', price: 250, level: 2 },
  { id: 13, name: '雷霆击', type: 'active', category: 'attack', effect: { damage: 200 }, desc: '造成200%伤害', quality: 'uncommon', price: 400, level: 5 },
  { id: 14, name: '天雷降世', type: 'active', category: 'attack', effect: { damage: 300, stun: 1 }, desc: '造成300%伤害,眩晕1秒', quality: 'uncommon', price: 600, level: 8 },
  { id: 15, name: '剑意无形', type: 'active', category: 'attack', effect: { damage: 400, ignoreDefense: 0.3 }, desc: '造成400%伤害,忽视30%防御', quality: 'rare', price: 1200, level: 12 },
  { id: 16, name: '破空斩', type: 'active', category: 'attack', effect: { damage: 500, range: 3 }, desc: '造成500%伤害,群体', quality: 'rare', price: 1800, level: 15 },
  { id: 17, name: '万剑归宗', type: 'active', category: 'attack', effect: { damage: 800, range: 5 }, desc: '造成800%伤害,大范围', quality: 'epic', price: 4000, level: 25 },
  { id: 18, name: '寂灭指', type: 'active', category: 'attack', effect: { damage: 1000, lifeDrain: 0.5 }, desc: '造成1000%伤害,吸血50%', quality: 'epic', price: 6000, level: 30 },
  { id: 19, name: '裂天崩', type: 'active', category: 'attack', effect: { damage: 1500, criticalDamage: 0.5 }, desc: '造成1500%伤害,暴击伤害+50%', quality: 'legendary', price: 15000, level: 40 },
  { id: 20, name: '星辰变', type: 'active', category: 'attack', effect: { damage: 2000, extraAttack: 2 }, desc: '造成2000%伤害,额外2次攻击', quality: 'legendary', price: 25000, level: 50 },
  { id: 21, name: '混沌开天', type: 'active', category: 'attack', effect: { damage: 3000, trueDamage: 1 }, desc: '造成3000%伤害,真实伤害', quality: 'mythical', price: 80000, level: 60 },
  { id: 22, name: '紫霄神雷', type: 'active', category: 'attack', effect: { damage: 2500, stun: 2, damagePerLevel: 500 }, desc: '造成2500%伤害,眩晕2秒,每级+500', quality: 'mythical', price: 60000, level: 55 },
  { id: 23, name: '南明离火', type: 'active', category: 'attack', effect: { damage: 2000, burn: 3 }, desc: '造成2000%伤害,灼烧3秒', quality: 'mythical', price: 50000, level: 50 },
  { id: 24, name: '太极无相', type: 'active', category: 'attack', effect: { damage: 1800, reflect: 0.3 }, desc: '造成1800%伤害,反弹30%', quality: 'legendary', price: 30000, level: 45 },
  { id: 25, name: '天外飞仙', type: 'active', category: 'attack', effect: { damage: 3500, jump: 5 }, desc: '造成3500%伤害,可跳跃5人', quality: 'mythical', price: 100000, level: 65 },
  
  // 防御功法 (10)
  { id: 26, name: '护体神光', type: 'passive', category: 'defense', effect: { defense: 15 }, desc: '提升15点防御', quality: 'common', price: 120, level: 1 },
  { id: 27, name: '金钟罩', type: 'passive', category: 'defense', effect: { defense: 25, hp: 100 }, desc: '防御+25,生命+100', quality: 'common', price: 200, level: 3 },
  { id: 28, name: '不灭体', type: 'passive', category: 'defense', effect: { hp: 300, regen: 1 }, desc: '生命+300,每秒回血1%', quality: 'uncommon', price: 500, level: 8 },
  { id: 29, name: '玄武盾', type: 'passive', category: 'defense', effect: { defense: 100, damageReduction: 0.1 }, desc: '防御+100,伤害减免10%', quality: 'rare', price: 1500, level: 15 },
  { id: 30, name: '金刚不坏', type: 'passive', category: 'defense', effect: { defense: 200, hp: 500, damageReduction: 0.2 }, desc: '防御+200,生命+500,减免20%', quality: 'epic', price: 4000, level: 25 },
  { id: 31, name: '天地同寿', type: 'passive', category: 'defense', effect: { hp: 1000, regen: 3, lifesteal: 0.1 }, desc: '生命+1000,回血3%,吸血10%', quality: 'legendary', price: 15000, level: 40 },
  { id: 32, name: '混沌护体', type: 'passive', category: 'defense', effect: { allAttr: 0.2, damageReduction: 0.3 }, desc: '全属性+20%,伤害减免30%', quality: 'mythical', price: 50000, level: 55 },
  { id: 33, name: '永恒不灭', type: 'passive', category: 'defense', effect: { hp: 5000, revive: 1 }, desc: '生命+5000,额外一条命', quality: 'mythical', price: 100000, level: 65 },
  { id: 34, name: '万劫不磨', type: 'passive', category: 'defense', effect: { damageReduction: 0.5, defense: 500 }, desc: '伤害减免50%,防御+500', quality: 'mythical', price: 80000, level: 60 },
  { id: 35, name: '道法自然', type: 'passive', category: 'defense', effect: { allAttr: 0.5, regen: 5 }, desc: '全属性+50%,回血5%', quality: 'mythical', price: 150000, level: 70 },
  
  // 辅助功法 (10)
  { id: 36, name: '御风术', type: 'passive', category: 'speed', effect: { speed: 3 }, desc: '速度+3', quality: 'common', price: 100, level: 1 },
  { id: 37, name: '神行百变', type: 'passive', category: 'speed', effect: { speed: 5, dodge: 0.1 }, desc: '速度+5,闪避10%', quality: 'uncommon', price: 400, level: 5 },
  { id: 38, name: '瞬影步', type: 'active', category: 'speed', effect: { speedBuff: 1, duration: 5 }, desc: '速度+100%,持续5秒', quality: 'rare', price: 1000, level: 10 },
  { id: 39, name: '凌波微步', type: 'passive', category: 'speed', effect: { speed: 10, dodge: 0.2 }, desc: '速度+10,闪避20%', quality: 'epic', price: 3500, level: 20 },
  { id: 40, name: '缩地成寸', type: 'active', category: 'speed', effect: { teleport: 1 }, desc: '瞬间移动到敌人身后', quality: 'legendary', price: 12000, level: 35 },
  { id: 41, name: '天眼通', type: 'passive', category: 'special', effect: { critRate: 0.15 }, desc: '暴击率+15%', quality: 'rare', price: 2000, level: 15 },
  { id: 42, name: '先手必胜', type: 'passive', category: 'special', effect: { firstStrike: 1 }, desc: '首次攻击必定暴击', quality: 'epic', price: 5000, level: 25 },
  { id: 43, name: '气运之子', type: 'passive', category: 'special', effect: { dropRate: 0.3, critRate: 0.1 }, desc: '掉落率+30%,暴击+10%', quality: 'legendary', price: 20000, level: 45 },
  { id: 44, name: '天人合一', type: 'passive', category: 'special', effect: { allAttr: 0.3, cultSpeed: 0.5 }, desc: '全属性+30%,修炼速度+50%', quality: 'mythical', price: 80000, level: 60 },
  { id: 45, name: '大道至简', type: 'passive', category: 'special', effect: { allAttr: 1.0, cooldown: 0.3 }, desc: '全属性+100%,技能冷却-30%', quality: 'mythical', price: 200000, level: 80 },
  
  // 光环功法 (5)
  { id: 46, name: '队伍增益', type: 'aura', category: 'support', effect: { teamAttack: 0.1 }, desc: '队伍攻击+10%', quality: 'rare', price: 3000, level: 20 },
  { id: 47, name: '团结之力', type: 'aura', category: 'support', effect: { teamDefense: 0.15 }, desc: '队伍防御+15%', quality: 'rare', price: 3500, level: 22 },
  { id: 48, name: ' sharedFortune', type: 'aura', category: 'support', effect: { teamCritRate: 0.1 }, desc: '队伍暴击+10%', quality: 'epic', price: 8000, level: 30 },
  { id: 49, name: '众志成城', type: 'aura', category: 'support', effect: { teamAllAttr: 0.2 }, desc: '队伍全属性+20%', quality: 'legendary', price: 30000, level: 50 },
  { id: 50, name: '万灵加护', type: 'aura', category: 'support', effect: { teamDamageReduction: 0.2, teamRegen: 2 }, desc: '队伍减伤20%,回血2%', quality: 'mythical', price: 100000, level: 70 },
  { id: 51, name: '鸿蒙祝福', type: 'aura', category: 'support', effect: { teamAllAttr: 0.5, expRate: 0.5 }, desc: '队伍全属性+50%,经验+50%', quality: 'mythical', price: 300000, level: 80 }
];

// 功法类型
const skillTypes = [
  { id: 'passive', name: '被动', desc: '永久生效' },
  { id: 'active', name: '主动', desc: '手动释放' },
  { id: 'aura', name: '光环', desc: '队伍增益' }
];

// 品质颜色
const qualityColors = {
  common: '#9E9E9E',
  uncommon: '#4CAF50',
  rare: '#2196F3',
  epic: '#9C27B0',
  legendary: '#FF9800',
  mythical: '#E91E63'
};

let userSkills = [
  { userId: 1, skillId: 1, level: 1, unlocked: true }
];

// 获取功法库
router.get('/list', (req, res) => {
  res.json({
    skills: skillTemplates,
    types: skillTypes,
    qualities: qualityColors
  });
});

// 获取用户已学功法
router.get('/my', (req, res) => {
  const userId = parseInt(req.query.userId) || 1;
  const mySkills = userSkills.filter(s => s.userId === userId && s.unlocked);
  const result = mySkills.map(s => {
    const template = skillTemplates.find(t => t.id === s.skillId);
    return { ...template, level: s.level };
  });
  res.json(result);
});

// 学习功法
router.post('/learn', (req, res) => {
  const { userId, skillId } = req.body;
  const skill = skillTemplates.find(s => s.id === skillId);
  if (!skill) return res.json({ success: false, message: '功法不存在' });
  
  const existing = userSkills.find(s => s.userId === userId && s.skillId === skillId);
  if (existing) return res.json({ success: false, message: '已学习此功法' });
  
  userSkills.push({ userId, skillId, level: 1, unlocked: true });
  res.json({ success: true, message: '成功学习 ' + skill.name, skill });
});

// 升级功法
router.post('/upgrade', (req, res) => {
  const { userId, skillId } = req.body;
  const skill = userSkills.find(s => s.userId === userId && s.skillId === skillId);
  if (!skill) return res.json({ success: false, message: '未学习此功法' });
  
  const template = skillTemplates.find(t => t.id === skillId);
  const upgradeCost = template.price * skill.level;
  
  skill.level += 1;
  res.json({ success: true, level: skill.level, message: template.name + ' 升级到 ' + skill.level + ' 级' });
});

// 遗忘功法
router.post('/forget', (req, res) => {
  const { userId, skillId } = req.body;
  const index = userSkills.findIndex(s => s.userId === userId && s.skillId === skillId);
  if (index === -1) return res.json({ success: false, message: '未学习此功法' });
  
  const template = skillTemplates.find(t => t.id === skillId);
  userSkills.splice(index, 1);
  res.json({ success: true, message: '已遗忘 ' + template.name, refund: Math.floor(template.price * 0.5) });
});

// 获取功法分类
router.get('/categories', (req, res) => {
  const categories = [
    { id: 'cultivation', name: '修炼', icon: '🧘' },
    { id: 'attack', name: '攻击', icon: '⚔️' },
    { id: 'defense', name: '防御', icon: '🛡️' },
    { id: 'speed', name: '速度', icon: '⚡' },
    { id: 'special', name: '特殊', icon: '✨' },
    { id: 'support', name: '辅助', icon: '💫' }
  ];
  res.json(categories);
});

module.exports = router;
