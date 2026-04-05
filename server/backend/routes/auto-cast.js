const express = require('express');
const router = express.Router();

// ==================== 内存存储 ====================

// 技能冷却状态存储
const skillCooldowns = new Map();

// 玩家自动施法配置
const playerAutoCastConfigs = new Map();

// 技能模板库
const skillTemplateLibrary = new Map([
  ['slash', {
    skillId: 'slash',
    skillName: 'Slash',
    skillNameCN: '横斩',
    type: 'attack',
    targetType: 'single',
    cooldown: 2000,
    manaCost: 10,
    priority: 10,
    enabled: true,
    triggers: [{ condition: 'always', value: 0 }]
  }],
  ['double_strike', {
    skillId: 'double_strike',
    skillName: 'Double Strike',
    skillNameCN: '连击',
    type: 'attack',
    targetType: 'single',
    cooldown: 4000,
    manaCost: 20,
    priority: 8,
    enabled: true,
    triggers: [{ condition: 'combo_count', value: 3 }]
  }],
  ['fire_ball', {
    skillId: 'fire_ball',
    skillName: 'Fire Ball',
    skillNameCN: '火球术',
    type: 'attack',
    targetType: 'area',
    cooldown: 5000,
    manaCost: 30,
    priority: 6,
    enabled: true,
    triggers: [{ condition: 'enemy_count', value: 2 }]
  }],
  ['heal', {
    skillId: 'heal',
    skillName: 'Heal',
    skillNameCN: '治疗术',
    type: 'heal',
    targetType: 'ally',
    cooldown: 8000,
    manaCost: 25,
    priority: 1,
    enabled: true,
    triggers: [{ condition: 'health_below', value: 40 }]
  }],
  ['group_heal', {
    skillId: 'group_heal',
    skillName: 'Group Heal',
    skillNameCN: '群体治疗',
    type: 'heal',
    targetType: 'area',
    cooldown: 15000,
    manaCost: 50,
    priority: 2,
    enabled: true,
    triggers: [{ condition: 'health_below', value: 30 }]
  }],
  ['shield', {
    skillId: 'shield',
    skillName: 'Shield',
    skillNameCN: '护盾',
    type: 'defense',
    targetType: 'self',
    cooldown: 10000,
    manaCost: 15,
    priority: 3,
    enabled: true,
    triggers: [{ condition: 'health_below', value: 25 }]
  }],
  ['iron_body', {
    skillId: 'iron_body',
    skillName: 'Iron Body',
    skillNameCN: '铁布衫',
    type: 'defense',
    targetType: 'self',
    cooldown: 20000,
    manaCost: 30,
    priority: 4,
    enabled: true,
    triggers: [{ condition: 'health_below', value: 50 }, { condition: 'enemy_count', value: 3 }]
  }],
  ['power_up', {
    skillId: 'power_up',
    skillName: 'Power Up',
    skillNameCN: '力量祝福',
    type: 'buff',
    targetType: 'self',
    cooldown: 30000,
    manaCost: 20,
    priority: 2,
    enabled: true,
    triggers: [{ condition: 'buff_missing', value: 1 }]
  }],
  ['speed_up', {
    skillId: 'speed_up',
    skillName: 'Speed Up',
    skillNameCN: '加速',
    type: 'buff',
    targetType: 'self',
    cooldown: 25000,
    manaCost: 15,
    priority: 2,
    enabled: true,
    triggers: [{ condition: 'always', value: 0 }]
  }],
  ['ultimate_slash', {
    skillId: 'ultimate_slash',
    skillName: 'Ultimate Slash',
    skillNameCN: '终极斩',
    type: 'ultimate',
    targetType: 'area',
    cooldown: 60000,
    manaCost: 80,
    priority: 10,
    enabled: true,
    triggers: [{ condition: 'enemy_health_below', value: 15 }, { condition: 'combo_count', value: 5 }]
  }],
  ['meteor_strike', {
    skillId: 'meteor_strike',
    skillName: 'Meteor Strike',
    skillNameCN: '陨石术',
    type: 'ultimate',
    targetType: 'area',
    cooldown: 90000,
    manaCost: 100,
    priority: 10,
    enabled: true,
    triggers: [{ condition: 'enemy_count', value: 5 }]
  }]
]);

// ==================== 辅助函数 ====================

function recordSkillCast(playerId, skillId, cooldown) {
  let playerCDs = skillCooldowns.get(playerId);
  if (!playerCDs) {
    playerCDs = new Map();
    skillCooldowns.set(playerId, playerCDs);
  }
  playerCDs.set(skillId, {
    skillId,
    lastCastTime: Date.now(),
    cooldown
  });
}

function getSkillCooldown(playerId, skillId) {
  const playerCDs = skillCooldowns.get(playerId);
  if (!playerCDs) return 0;
  const skillCD = playerCDs.get(skillId);
  if (!skillCD) return 0;
  const remaining = skillCD.lastCastTime + skillCD.cooldown - Date.now();
  return Math.max(0, remaining);
}

function castSkill(skill, battleState) {
  const result = { success: true, skillId: skill.skillId, skillName: skill.skillNameCN };
  switch (skill.type) {
    case 'attack':
      result.damage = calculateDamage(skill, battleState);
      break;
    case 'heal':
      result.heal = calculateHeal(skill, battleState);
      break;
    case 'buff':
      result.buffs = [skill.skillId];
      break;
    case 'defense':
      result.buffs = ['shield'];
      break;
    case 'ultimate':
      result.damage = calculateDamage(skill, battleState) * 2;
      break;
  }
  return result;
}

function calculateDamage(skill, battleState) {
  const baseDamage = 100;
  const multiplier = skill.type === 'ultimate' ? 2.5 : skill.type === 'attack' ? 1.5 : 1;
  const enemyCountBonus = (battleState.enemyCount || 1) > 1 ? 0.2 : 0;
  return Math.floor(baseDamage * multiplier * (1 + enemyCountBonus));
}

function calculateHeal(skill, battleState) {
  const baseHeal = 80;
  const multiplier = skill.type === 'ultimate' ? 2 : 1;
  const missingHealthBonus = (100 - (battleState.selfHealthPercent || 100)) / 100;
  return Math.floor(baseHeal * multiplier * (1 + missingHealthBonus));
}

function getPlayerAutoCastConfig(playerId) {
  if (!playerAutoCastConfigs.has(playerId)) {
    // 默认配置：启用所有技能
    const skills = [];
    skillTemplateLibrary.forEach((template, skillId) => {
      skills.push({ skillId, ...template });
    });
    playerAutoCastConfigs.set(playerId, { playerId, enabled: true, skillPriority: skills });
  }
  return playerAutoCastConfigs.get(playerId);
}

// ==================== API 路由 ====================

// 获取玩家已激活的技能列表（含冷却状态）
router.get('/player-skills/:playerId', (req, res) => {
  const { playerId } = req.params;
  const config = getPlayerAutoCastConfig(playerId);
  const allTemplates = Array.from(skillTemplateLibrary.values());

  const skills = allTemplates.map(template => {
    const configSkill = config.skillPriority.find(s => s.skillId === template.skillId);
    return {
      skillId: template.skillId,
      skillName: template.skillName,
      skillNameCN: template.skillNameCN,
      type: template.type,
      targetType: template.targetType,
      cooldown: template.cooldown,
      manaCost: template.manaCost,
      enabled: configSkill ? configSkill.enabled : template.enabled,
      remainingCooldown: getSkillCooldown(playerId, template.skillId)
    };
  });

  res.json({ success: true, data: { enabled: config.enabled, skills } });
});

// 手动施放技能
router.post('/cast-skill', (req, res) => {
  const { playerId, skillId, battleState } = req.body;

  if (!playerId || !skillId) {
    return res.status(400).json({ error: '缺少必要参数 playerId 或 skillId' });
  }

  // 检查冷却
  const remainingCooldown = getSkillCooldown(playerId, skillId);
  if (remainingCooldown > 0) {
    return res.json({ success: false, error: '技能冷却中', remainingCooldown });
  }

  // 获取技能模板
  const template = skillTemplateLibrary.get(skillId);
  if (!template) {
    return res.status(404).json({ error: '技能不存在' });
  }

  // 构建战斗状态
  const battle = battleState || {
    selfHealthPercent: 100,
    selfManaPercent: 100,
    enemyCount: 1,
    enemyHealthPercent: 100,
    comboCount: 0,
    battleElapsedTime: 0,
    activeBuffs: []
  };

  // 记录冷却
  recordSkillCast(playerId, skillId, template.cooldown);

  // 执行技能
  const result = castSkill(template, battle);

  res.json({
    success: true,
    data: {
      ...result,
      remainingCooldown: template.cooldown,
      cooldownTotal: template.cooldown
    }
  });
});

// 获取技能冷却状态
router.get('/cooldown/:playerId', (req, res) => {
  const { playerId } = req.params;
  const config = getPlayerAutoCastConfig(playerId);
  const cooldowns = {};

  config.skillPriority.forEach(skill => {
    cooldowns[skill.skillId] = getSkillCooldown(playerId, skill.skillId);
  });

  res.json({ success: true, data: cooldowns });
});

// 重置所有技能冷却
router.post('/reset-cooldown', (req, res) => {
  const { playerId } = req.body;
  if (!playerId) {
    return res.status(400).json({ error: '缺少玩家ID' });
  }
  skillCooldowns.delete(playerId);
  res.json({ success: true, message: '技能冷却已重置' });
});

// 获取可用技能模板
router.get('/templates', (req, res) => {
  const templates = Array.from(skillTemplateLibrary.values());
  res.json({ success: true, data: templates });
});

module.exports = router;
