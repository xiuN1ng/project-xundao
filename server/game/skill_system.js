/**
 * 功法系统 v1.0
 * 包含：功法数据模型、功法配置、功法逻辑
 */

// 功法类型
const SKILL_TYPES = {
  attack: { name: '攻击功法', icon: '⚔️' },
  defense: { name: '防御功法', icon: '🛡️' },
  utility: { name: '辅助功法', icon: '✨' },
  passive: { name: '被动功法', icon: '🔮' }
};

// 功法效果属性
const SKILL_EFFECT_TYPES = {
  hp_bonus: { name: '气血加成', icon: '❤️' },
  atk_bonus: { name: '攻击加成', icon: '⚔️' },
  def_bonus: { name: '防御加成', icon: '🛡️' },
  crit_rate: { name: '暴击率', icon: '💥' },
  dodge_rate: { name: '闪避率', icon: '💨' },
  exp_bonus: { name: '经验加成', icon: '📚' },
  spirit_bonus: { name: '灵气加成', icon: '🌟' },
  stone_bonus: { name: '灵石加成', icon: '💎' }
};

// 功法数据配置
const SKILL_DATA = {
  // 基础功法: 吐纳术 (气血+5%/级)
  'tuna_technique': {
    id: 'tuna_technique',
    name: '吐纳术',
    desc: '基础的呼吸吐纳之法，可提升气血上限',
    type: 'passive',
    maxLevel: 10,
    baseEffect: { hp_bonus: 0.05 },
    levelEffect: { hp_bonus: 0.05 }, // 每级+5%
    learnCost: { spiritStones: 50 },
    upgradeCost: (level) => ({ spiritStones: Math.floor(50 * Math.pow(1.5, level)) }),
    realm_req: 0
  },

  // 攻击功法: 裂石功 (攻击+8%/级)
  'crush_stone_fist': {
    id: 'crush_stone_fist',
    name: '裂石功',
    desc: '刚猛无匹的拳法，可大幅提升攻击力',
    type: 'attack',
    maxLevel: 10,
    baseEffect: { atk_bonus: 0.08 },
    levelEffect: { atk_bonus: 0.08 }, // 每级+8%
    learnCost: { spiritStones: 100 },
    upgradeCost: (level) => ({ spiritStones: Math.floor(100 * Math.pow(1.5, level)) }),
    realm_req: 1
  },

  // 防御功法: 金刚罩 (防御+8%/级)
  'vajra_shield': {
    id: 'vajra_shield',
    name: '金刚罩',
    desc: '佛门护体神功，可大幅提升防御力',
    type: 'defense',
    maxLevel: 10,
    baseEffect: { def_bonus: 0.08 },
    levelEffect: { def_bonus: 0.08 }, // 每级+8%
    learnCost: { spiritStones: 100 },
    upgradeCost: (level) => ({ spiritStones: Math.floor(100 * Math.pow(1.5, level)) }),
    realm_req: 1
  },

  // 暴击功法: 破甲拳 (暴击+2%/级)
  'armor_break_fist': {
    id: 'armor_break_fist',
    name: '破甲拳',
    desc: '专门破除防御的拳法，提升暴击率',
    type: 'attack',
    maxLevel: 10,
    baseEffect: { crit_rate: 0.02 },
    levelEffect: { crit_rate: 0.02 }, // 每级+2%
    learnCost: { spiritStones: 150 },
    upgradeCost: (level) => ({ spiritStones: Math.floor(150 * Math.pow(1.5, level)) }),
    realm_req: 2
  },

  // 闪避功法: 凌波微步 (闪避+2%/级)
  'cloud_step': {
    id: 'cloud_step',
    name: '凌波微步',
    desc: '轻灵飘逸的步法，提升闪避率',
    type: 'defense',
    maxLevel: 10,
    baseEffect: { dodge_rate: 0.02 },
    levelEffect: { dodge_rate: 0.02 }, // 每级+2%
    learnCost: { spiritStones: 150 },
    upgradeCost: (level) => ({ spiritStones: Math.floor(150 * Math.pow(1.5, level)) }),
    realm_req: 2
  },

  // 经验功法: 悟道经 (经验+10%/级)
  'enlightenment_sutra': {
    id: 'enlightenment_sutra',
    name: '悟道经',
    desc: '圣贤所传经典，提升修炼效率',
    type: 'utility',
    maxLevel: 10,
    baseEffect: { exp_bonus: 0.10 },
    levelEffect: { exp_bonus: 0.10 }, // 每级+10%
    learnCost: { spiritStones: 200 },
    upgradeCost: (level) => ({ spiritStones: Math.floor(200 * Math.pow(1.5, level)) }),
    realm_req: 3
  },

  // 灵气功法: 聚灵诀 (灵气+10%/级)
  'spirit_gather': {
    id: 'spirit_gather',
    name: '聚灵诀',
    desc: '聚集天地灵气的法门，提升灵气获取',
    type: 'utility',
    maxLevel: 10,
    baseEffect: { spirit_bonus: 0.10 },
    levelEffect: { spirit_bonus: 0.10 }, // 每级+10%
    learnCost: { spiritStones: 180 },
    upgradeCost: (level) => ({ spiritStones: Math.floor(180 * Math.pow(1.5, level)) }),
    realm_req: 2
  },

  // 灵石功法: 招财术 (灵石+10%/级)
  'fortune_technique': {
    id: 'fortune_technique',
    name: '招财术',
    desc: '增加灵石获取的秘术',
    type: 'utility',
    maxLevel: 10,
    baseEffect: { stone_bonus: 0.10 },
    levelEffect: { stone_bonus: 0.10 }, // 每级+10%
    learnCost: { spiritStones: 180 },
    upgradeCost: (level) => ({ spiritStones: Math.floor(180 * Math.pow(1.5, level)) }),
    realm_req: 2
  }
};

/**
 * 获取功法效果
 * @param {string} skillId - 功法ID
 * @param {number} level - 功法等级
 * @returns {object} 功法效果
 */
function getSkillEffect(skillId, level = 1) {
  const skill = SKILL_DATA[skillId];
  if (!skill) return {};

  const effect = {};
  for (const [key, baseValue] of Object.entries(skill.baseEffect)) {
    // 效果 = 基础值 + (等级-1) * 每级加成
    effect[key] = baseValue + (level - 1) * (skill.levelEffect[key] || 0);
  }
  return effect;
}

/**
 * 获取所有已装备/已学习功法的总效果
 * @param {Array} playerSkills - 玩家功法列表 [{skillId, level, unlocked}]
 * @returns {object} 总效果
 */
function getAllEffects(playerSkills = []) {
  const totalEffect = {
    hp_bonus: 0,
    atk_bonus: 0,
    def_bonus: 0,
    crit_rate: 0,
    dodge_rate: 0,
    exp_bonus: 0,
    spirit_bonus: 0,
    stone_bonus: 0
  };

  for (const playerSkill of playerSkills) {
    if (!playerSkill.unlocked) continue;
    const effect = getSkillEffect(playerSkill.skillId, playerSkill.level);
    for (const [key, value] of Object.entries(effect)) {
      if (totalEffect[key] !== undefined) {
        totalEffect[key] += value;
      }
    }
  }

  return totalEffect;
}

/**
 * 学习功法
 * @param {object} player - 玩家对象
 * @param {string} skillId - 功法ID
 * @returns {object} 学习结果
 */
function learnSkill(player, skillId) {
  const skill = SKILL_DATA[skillId];
  if (!skill) {
    return { success: false, message: '功法不存在' };
  }

  // 检查是否已学习
  if (!player.skills) player.skills = [];
  const existingSkill = player.skills.find(s => s.skillId === skillId);
  if (existingSkill) {
    return { success: false, message: '已学习此功法' };
  }

  // 检查境界要求
  if (player.realmLevel < skill.realm_req) {
    return { success: false, message: `需要境界 ${skill.realm_req} 才能学习` };
  }

  // 检查灵石
  const cost = skill.learnCost;
  if (cost.spiritStones && player.spiritStones < cost.spiritStones) {
    return { success: false, message: `需要 ${cost.spiritStones} 灵石` };
  }

  // 扣除灵石
  if (cost.spiritStones) {
    player.spiritStones -= cost.spiritStones;
  }

  // 添加功法
  player.skills.push({
    skillId: skillId,
    level: 1,
    unlocked: true,
    learnedAt: Date.now()
  });

  return { success: true, message: `✅ 学会 ${skill.name}!` };
}

/**
 * 升级功法
 * @param {object} player - 玩家对象
 * @param {string} skillId - 功法ID
 * @returns {object} 升级结果
 */
function upgradeSkill(player, skillId) {
  const skill = SKILL_DATA[skillId];
  if (!skill) {
    return { success: false, message: '功法不存在' };
  }

  // 检查是否已学习
  if (!player.skills) player.skills = [];
  const playerSkill = player.skills.find(s => s.skillId === skillId);
  if (!playerSkill) {
    return { success: false, message: '请先学习此功法' };
  }

  // 检查是否已满级
  if (playerSkill.level >= skill.maxLevel) {
    return { success: false, message: '已达最大等级' };
  }

  // 计算升级费用
  const cost = skill.upgradeCost(playerSkill.level);
  if (cost.spiritStones && player.spiritStones < cost.spiritStones) {
    return { success: false, message: `需要 ${cost.spiritStones} 灵石` };
  }

  // 扣除灵石
  if (cost.spiritStones) {
    player.spiritStones -= cost.spiritStones;
  }

  // 升级功法
  playerSkill.level++;

  return { 
    success: true, 
    message: `⬆️ ${skill.name} 升级到 ${playerSkill.level} 级!`,
    newLevel: playerSkill.level
  };
}

/**
 * 获取功法信息
 * @param {string} skillId - 功法ID
 * @returns {object|null} 功法信息
 */
function getSkillInfo(skillId) {
  return SKILL_DATA[skillId] || null;
}

/**
 * 获取玩家功法列表（包含详细信息）
 * @param {object} player - 玩家对象
 * @returns {Array} 功法列表
 */
function getPlayerSkills(player) {
  if (!player.skills) return [];
  
  return player.skills.map(ps => {
    const skill = SKILL_DATA[ps.skillId];
    if (!skill) return null;
    
    return {
      ...ps,
      name: skill.name,
      desc: skill.desc,
      type: skill.type,
      typeName: SKILL_TYPES[skill.type]?.name || skill.type,
      typeIcon: SKILL_TYPES[skill.type]?.icon || '',
      maxLevel: skill.maxLevel,
      currentEffect: getSkillEffect(ps.skillId, ps.level),
      nextEffect: ps.level < skill.maxLevel ? getSkillEffect(ps.skillId, ps.level + 1) : null,
      upgradeCost: ps.level < skill.maxLevel ? skill.upgradeCost(ps.level) : null,
      realm_req: skill.realm_req
    };
  }).filter(Boolean);
}

/**
 * 获取可学习的功法列表
 * @param {object} player - 玩家对象
 * @returns {Array} 可学习功法列表
 */
function getAvailableSkills(player) {
  const learnedIds = player.skills ? player.skills.map(s => s.skillId) : [];
  
  return Object.values(SKILL_DATA)
    .filter(skill => !learnedIds.includes(skill.id))
    .map(skill => ({
      id: skill.id,
      name: skill.name,
      desc: skill.desc,
      type: skill.type,
      typeName: SKILL_TYPES[skill.type]?.name || skill.type,
      typeIcon: SKILL_TYPES[skill.type]?.icon || '',
      maxLevel: skill.maxLevel,
      learnCost: skill.learnCost,
      realm_req: skill.realm_req,
      baseEffect: skill.baseEffect,
      canLearn: player.realmLevel >= skill.realm_req
    }));
}

/**
 * 计算功法加成后的玩家属性
 * @param {object} baseStats - 基础属性 {hp, atk, def, ...}
 * @param {object} player - 玩家对象
 * @returns {object} 加成后的属性
 */
function calculateSkillBonus(baseStats, player) {
  const effects = getAllEffects(player.skills || []);
  
  return {
    ...baseStats,
    hp: Math.floor(baseStats.hp * (1 + effects.hp_bonus)),
    atk: Math.floor(baseStats.atk * (1 + effects.atk_bonus)),
    def: Math.floor(baseStats.def * (1 + effects.def_bonus)),
    crit_rate: Math.min(1, (baseStats.crit_rate || 0) + effects.crit_rate),
    dodge_rate: Math.min(1, (baseStats.dodge_rate || 0) + effects.dodge_rate),
    exp_bonus: effects.exp_bonus,
    spirit_bonus: effects.spirit_bonus,
    stone_bonus: effects.stone_bonus
  };
}

// 导出函数
if (typeof window !== 'undefined') {
  window.SKILL_TYPES = SKILL_TYPES;
  window.SKILL_EFFECT_TYPES = SKILL_EFFECT_TYPES;
  window.SKILL_DATA = SKILL_DATA;
  window.getSkillEffect = getSkillEffect;
  window.getAllEffects = getAllEffects;
  window.learnSkill = learnSkill;
  window.upgradeSkill = upgradeSkill;
  window.getSkillInfo = getSkillInfo;
  window.getPlayerSkills = getPlayerSkills;
  window.getAvailableSkills = getAvailableSkills;
  window.calculateSkillBonus = calculateSkillBonus;
}

// Node.js 环境导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SKILL_TYPES,
    SKILL_EFFECT_TYPES,
    SKILL_DATA,
    getSkillEffect,
    getAllEffects,
    learnSkill,
    upgradeSkill,
    getSkillInfo,
    getPlayerSkills,
    getAvailableSkills,
    calculateSkillBonus
  };
}
