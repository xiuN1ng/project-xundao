/**
 * 翅膀/化神系统 v1.0
 * 翅膀养成/幻化/化神
 */

const WING_DATA = {
  // 翅膀类型
  'cloud_wing': {
    name: '云翼', type: 'wing', quality: 'common',
    base_atk: 20, base_hp: 100, base_def: 10, growth_atk: 4, growth_hp: 20, growth_def: 2,
    skill: 'cloud_step', skill_name: '云步', description: '提升闪避率',
    evolve_stage: 1, required_realm: 'qi_refining', cost: 1000
  },
  'thunder_wing': {
    name: '雷翼', type: 'wing', quality: 'uncommon',
    base_atk: 60, base_hp: 240, base_def: 25, growth_atk: 10, growth_hp: 50, growth_def: 5,
    skill: 'thunder_bolt', skill_name: '雷击', description: '雷电攻击',
    evolve_stage: 2, required_realm: 'foundation', cost: 5000
  },
  'flame_wing': {
    name: '火翼', type: 'wing', quality: 'rare',
    base_atk: 150, base_hp: 560, base_def: 60, growth_atk: 25, growth_hp: 110, growth_def: 12,
    skill: 'inferno', skill_name: '烈焰', description: '范围火焰伤害',
    evolve_stage: 3, required_realm: 'core_formation', cost: 20000
  },
  'ice_wing': {
    name: '冰翼', type: 'wing', quality: 'epic',
    base_atk: 380, base_hp: 1500, base_def: 150, growth_atk: 60, growth_hp: 280, growth_def: 30,
    skill: 'frost_nova', skill_name: '冰霜新星', description: '冰冻敌人',
    evolve_stage: 4, required_realm: 'nascent_soul', cost: 80000
  },
  'void_wing': {
    name: '虚空之翼', type: 'wing', quality: 'legendary',
    base_atk: 950, base_hp: 3800, base_def: 380, growth_atk: 150, growth_hp: 700, growth_def: 75,
    skill: 'void_collapse', skill_name: '虚空崩塌', description: '虚空之力',
    evolve_stage: 5, required_realm: 'spirit_king', cost: 300000
  },
  'celestial_wing': {
    name: '天翼', type: 'wing', quality: 'mythical',
    base_atk: 2800, base_hp: 11000, base_def: 1100, growth_atk: 400, growth_hp: 2000, growth_def: 200,
    skill: 'heaven_divine', skill_name: '天降神光', description: '终极化神',
    evolve_stage: 6, required_realm: 'immortal', cost: 1000000
  }
};

const WING_QUALITY = {
  common: { name: '普通', color: '#8B8B8B', attribute_bonus: 1.0, cost_reduction: 1.0 },
  uncommon: { name: '优秀', color: '#00FF7F', attribute_bonus: 1.2, cost_reduction: 0.9 },
  rare: { name: '稀有', color: '#1E90FF', attribute_bonus: 1.5, cost_reduction: 0.8 },
  epic: { name: '史诗', color: '#9932CC', attribute_bonus: 2.0, cost_reduction: 0.7 },
  legendary: { name: '传说', color: '#FFD700', attribute_bonus: 3.0, cost_reduction: 0.5 },
  mythical: { name: '神话', color: '#FF4500', attribute_bonus: 5.0, cost_reduction: 0.3 }
};

const WING_SKILLS = {
  'cloud_step': { name: '云步', dodge_bonus: 0.15, description: '提升15%闪避率' },
  'thunder_bolt': { name: '雷击', damage: 1.5, crit_bonus: 0.1, description: '雷电攻击' },
  'inferno': { name: '烈焰', damage: 1.8, burn_damage: 0.1, description: '持续燃烧' },
  'frost_nova': { name: '冰霜新星', damage: 1.3, freeze_turns: 2, description: '冰冻敌人2回合' },
  'void_collapse': { name: '虚空崩塌', damage: 2.5, penetration: 0.3, description: '无视30%防御' },
  'heaven_divine': { name: '天降神光', damage: 5.0, heal_percent: 0.2, description: '终极化神技能' }
};

// 翅膀升级经验曲线
const WING_EXP_CURVE = level => Math.floor(120 * Math.pow(1.6, level));

// 幻化形态解锁条件
const ILLUSION_UNLOCK = {
  'default': { name: '本体', cost: 0, require_wing_level: 1 },
  'radiant': { name: '光辉', cost: 10000, require_wing_level: 10 },
  'ethereal': { name: '飘渺', cost: 50000, require_wing_level: 20 },
  'divine': { name: '神圣', cost: 200000, require_wing_level: 30 },
  'celestial': { name: '天仙', cost: 500000, require_wing_level: 40 },
  'transcendent': { name: ' transcendent', cost: 2000000, require_wing_level: 50 }
};

// 翅膀升星系统
const WING_STAR_EXP = {
  1: { exp: 0, atk_bonus: 0, hp_bonus: 0, def_bonus: 0 },
  2: { exp: 1000, atk_bonus: 50, hp_bonus: 200, def_bonus: 20 },
  3: { exp: 5000, atk_bonus: 150, hp_bonus: 600, def_bonus: 60 },
  4: { exp: 20000, atk_bonus: 400, hp_bonus: 1600, def_bonus: 160 },
  5: { exp: 80000, atk_bonus: 1000, hp_bonus: 4000, def_bonus: 400 },
  6: { exp: 300000, atk_bonus: 2500, hp_bonus: 10000, def_bonus: 1000 },
  7: { exp: 1000000, atk_bonus: 6000, hp_bonus: 24000, def_bonus: 2400 },
  8: { exp: 5000000, atk_bonus: 15000, hp_bonus: 60000, def_bonus: 6000 },
  9: { exp: 20000000, atk_bonus: 35000, hp_bonus: 140000, def_bonus: 14000 },
  10: { exp: 100000000, atk_bonus: 80000, hp_bonus: 320000, def_bonus: 32000 }
};

// ============ 翅膀培养 ============
async function obtainWing(wingId) {
  const player = gameState.player;
  const data = WING_DATA[wingId];
  if (!data) return { success: false, message: '翅膀不存在' };
  
  if (!player.wings) player.wings = [];
  if (player.wings.length >= (player.wing_slots || 3)) {
    return { success: false, message: '翅膀栏已满' };
  }
  
  const wing = {
    id: wingId,
    name: data.name,
    quality: data.quality,
    level: 1,
    exp: 0,
    star: 1,
    star_exp: 0,
    illusion: 'default',
    equipped: player.wings.length === 0,
    skills: [data.skill],
    attributes: {
      atk: data.base_atk,
      hp: data.base_hp,
      def: data.base_def
    },
    obtained_at: Date.now()
  };
  
  player.wings.push(wing);
  updateCombatPower();
  
  return { 
    success: true, 
    message: `获得 ${data.name}！`,
    wing: wing
  };
}

// ============ 翅膀升级 ============
async function levelupWing(wingIndex, lingshi = 0, materials = []) {
  const player = gameState.player;
  if (!player.wings || !player.wings[wingIndex]) {
    return { success: false, message: '翅膀不存在' };
  }
  
  const wing = player.wings[wingIndex];
  const data = WING_DATA[wing.id];
  if (!data) return { success: false, message: '翅膀数据错误' };
  
  // 消耗灵石升级
  let totalExp = lingshi * 10; // 1灵石 = 10经验
  for (const mat of materials) {
    if (mat.type === 'material' && mat.exp) {
      totalExp += mat.exp;
    }
  }
  
  const expNeeded = WING_EXP_CURVE(wing.level);
  
  if (wing.exp + totalExp < expNeeded) {
    return { 
      success: false, 
      message: `经验不足，需要 ${expNeeded} 经验，当前 ${wing.exp}` 
    };
  }
  
  wing.level++;
  wing.exp = wing.exp + totalExp - expNeeded;
  
  // 属性成长
  const qualityBonus = WING_QUALITY[wing.quality].attribute_bonus;
  wing.attributes.atk += Math.floor(data.growth_atk * qualityBonus);
  wing.attributes.hp += Math.floor(data.growth_hp * qualityBonus);
  wing.attributes.def += Math.floor(data.growth_def * qualityBonus);
  
  // 升级时回复满耐久度（如果有）
  if (wing.durability !== undefined) {
    wing.durability = 100;
  }
  
  updateCombatPower();
  
  return { 
    success: true, 
    message: `${wing.name} 升级到 ${wing.level} 级！`,
    wing: wing
  };
}

// ============ 翅膀升星 ============
async function starUpWing(wingIndex) {
  const player = gameState.player;
  if (!player.wings || !player.wings[wingIndex]) {
    return { success: false, message: '翅膀不存在' };
  }
  
  const wing = player.wings[wingIndex];
  const currentStarExp = WING_STAR_EXP[wing.star];
  const nextStarExp = WING_STAR_EXP[wing.star + 1];
  
  if (!nextStarExp) {
    return { success: false, message: '翅膀已达到最高星级' };
  }
  
  if (wing.star_exp < currentStarExp.exp) {
    return { 
      success: false, 
      message: `升星经验不足，需要 ${currentStarExp.exp}，当前 ${wing.star_exp}` 
    };
  }
  
  wing.star++;
  wing.star_exp = wing.star_exp - currentStarExp.exp;
  
  // 属性加成
  wing.attributes.atk += nextStarExp.atk_bonus;
  wing.attributes.hp += nextStarExp.hp_bonus;
  wing.attributes.def += nextStarExp.def_bonus;
  
  updateCombatPower();
  
  return { 
    success: true, 
    message: `${wing.name} 升星到 ${wing.star} 星！`,
    wing: wing
  };
}

// ============ 翅膀幻化 ============
async function illusionWing(wingIndex, illusionId) {
  const player = gameState.player;
  if (!player.wings || !player.wings[wingIndex]) {
    return { success: false, message: '翅膀不存在' };
  }
  
  const wing = player.wings[wingIndex];
  const illusionData = ILLUSION_UNLOCK[illusionId];
  
  if (!illusionData) {
    return { success: false, message: '幻化形态不存在' };
  }
  
  if (wing.level < illusionData.require_wing_level) {
    return { 
      success: false, 
      message: `翅膀等级不足，需要 ${illusionData.require_wing_level} 级` 
    };
  }
  
  if (!wing.unlocked_illusions) wing.unlocked_illusions = [];
  if (!wing.unlocked_illusions.includes(illusionId)) {
    if (player.lingshi < illusionData.cost) {
      return { success: false, message: `灵石不足，需要 ${illusionData.cost}` };
    }
    player.lingshi -= illusionData.cost;
    wing.unlocked_illusions.push(illusionId);
  }
  
  wing.illusion = illusionId;
  
  return { 
    success: true, 
    message: `幻化形态已切换为 ${illusionData.name}`,
    wing: wing
  };
}

// ============ 翅膀幻化解锁 ============
async function unlockIllusion(wingIndex, illusionId) {
  const player = gameState.player;
  if (!player.wings || !player.wings[wingIndex]) {
    return { success: false, message: '翅膀不存在' };
  }
  
  const wing = player.wings[wingIndex];
  const illusionData = ILLUSION_UNLOCK[illusionId];
  
  if (!illusionData) {
    return { success: false, message: '幻化形态不存在' };
  }
  
  if (wing.level < illusionData.require_wing_level) {
    return { 
      success: false, 
      message: `翅膀等级不足，需要 ${illusionData.require_wing_level} 级` 
    };
  }
  
  if (!wing.unlocked_illusions) wing.unlocked_illusions = ['default'];
  if (wing.unlocked_illusions.includes(illusionId)) {
    return { success: false, message: '幻化形态已解锁' };
  }
  
  if (player.lingshi < illusionData.cost) {
    return { success: false, message: `灵石不足，需要 ${illusionData.cost}` };
  }
  
  player.lingshi -= illusionData.cost;
  wing.unlocked_illusions.push(illusionId);
  
  return { 
    success: true, 
    message: `解锁幻化形态 ${illusionData.name} 成功！`,
    wing: wing
  };
}

// ============ 翅膀装备/卸下 ============
async function equipWing(wingIndex) {
  const player = gameState.player;
  if (!player.wings || !player.wings[wingIndex]) {
    return { success: false, message: '翅膀不存在' };
  }
  
  // 卸下其他翅膀
  player.wings.forEach((w, i) => {
    if (i !== wingIndex) w.equipped = false;
  });
  
  player.wings[wingIndex].equipped = true;
  
  return { 
    success: true, 
    message: `已装备 ${player.wings[wingIndex].name}`,
    wing: player.wings[wingIndex]
  };
}

// ============ 化神系统 ============
async function evolveWing(wingIndex) {
  const player = gameState.player;
  if (!player.wings || !player.wings[wingIndex]) {
    return { success: false, message: '翅膀不存在' };
  }
  
  const wing = player.wings[wingIndex];
  const data = WING_DATA[wing.id];
  if (!data) return { success: false, message: '翅膀数据错误' };
  
  // 检查是否已达化神阶段上限
  if (!data.evolve_stage) {
    return { success: false, message: '该翅膀无法化神' };
  }
  
  // 检查玩家境界是否满足
  const realmMap = {
    'qi_refining': 1, 'foundation': 2, 'core_formation': 3,
    'nascent_soul': 4, 'spirit_king': 5, 'immortal': 6
  };
  const playerRealmLevel = realmMap[player.realm] || 0;
  const requiredRealmLevel = realmMap[data.required_realm] || 999;
  
  if (playerRealmLevel < requiredRealmLevel) {
    return { 
      success: false, 
      message: `境界不足，需要达到 ${data.required_realm} 境界` 
    };
  }
  
  // 检查是否已化神
  if (wing.evolved) {
    return { success: false, message: '该翅膀已完成化神' };
  }
  
  // 检查灵石
  if (player.lingshi < data.cost) {
    return { success: false, message: `灵石不足，需要 ${data.cost}` };
  }
  
  player.lingshi -= data.cost;
  wing.evolved = true;
  wing.evolve_stage = data.evolve_stage;
  
  // 化神属性飞跃
  wing.attributes.atk *= 2;
  wing.attributes.hp *= 2;
  wing.attributes.def *= 2;
  
  // 解锁化神技能
  if (data.skill && !wing.skills.includes(data.skill)) {
    wing.skills.push(data.skill);
  }
  
  updateCombatPower();
  
  return { 
    success: true, 
    message: `化神成功！${wing.name} 获得终极力量！`,
    wing: wing
  };
}

// ============ 翅膀合成 ============
async function compositeWing(wingIndices) {
  const player = gameState.player;
  if (!wingIndices || wingIndices.length < 2) {
    return { success: false, message: '需要至少2个翅膀进行合成' };
  }
  
  const wings = wingIndices.map(i => player.wings && player.wings[i]).filter(w => w);
  if (wings.length < 2) {
    return { success: false, message: '翅膀不存在' };
  }
  
  // 检查是否已装备
  if (wings.some(w => w.equipped)) {
    return { success: false, message: '请先卸下要合成的翅膀' };
  }
  
  // 品质判断：只能同品质合成
  const qualities = wings.map(w => w.quality);
  if (!qualities.every(q => q === qualities[0])) {
    return { success: false, message: '只能合成相同品质的翅膀' };
  }
  
  // 移除旧翅膀
  wingIndices.sort((a, b) => b - a).forEach(i => {
    if (player.wings) player.wings.splice(i, 1);
  });
  
  // 查找更高品质翅膀
  const qualityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical'];
  const currentIdx = qualityOrder.indexOf(qualities[0]);
  const newQuality = qualityOrder[Math.min(currentIdx + 1, qualityOrder.length - 1)];
  
  // 随机获得同阶段或更高品质翅膀
  const availableWings = Object.entries(WING_DATA)
    .filter(([_, d]) => d.quality === newQuality)
    .map(([id, data]) => ({ id, ...data }));
  
  if (availableWings.length === 0) {
    return { success: false, message: '已达到最高品质' };
  }
  
  const randomWing = availableWings[Math.floor(Math.random() * availableWings.length)];
  const result = await obtainWing(randomWing.id);
  
  return { 
    success: true, 
    message: `合成成功！获得 ${randomWing.name}！`,
    newWing: result.wing
  };
}

// ============ 获取翅膀总属性 ============
function getWingTotalAttributes(player) {
  if (!player.wings) return { atk: 0, hp: 0, def: 0 };
  
  const total = { atk: 0, hp: 0, def: 0 };
  for (const wing of player.wings) {
    if (wing.equipped) {
      total.atk += wing.attributes.atk;
      total.hp += wing.attributes.hp;
      total.def += wing.attributes.def;
      
      // 星级加成
      if (wing.star > 1) {
        const starBonus = WING_STAR_EXP[wing.star];
        if (starBonus) {
          total.atk += starBonus.atk_bonus;
          total.hp += starBonus.hp_bonus;
          total.def += starBonus.def_bonus;
        }
      }
      
      // 幻化加成
      const illusionBonus = ILLUSION_UNLOCK[wing.illusion];
      if (illusionBonus && wing.illusion !== 'default') {
        total.atk *= 1.1;
        total.hp *= 1.1;
        total.def *= 1.1;
      }
    }
  }
  
  return total;
}

// ============ 翅膀战斗 ============
function getWingSkillEffect(wing) {
  const data = WING_DATA[wing.id];
  if (!data || !data.skill) return null;
  return WING_SKILLS[data.skill];
}

// ============ 更新战斗力 ============
function updateCombatPower() {
  const player = gameState.player;
  const attrs = getWingTotalAttributes(player);
  player.wing_combat_power = Math.floor(attrs.atk * 2 + attrs.hp * 0.5 + attrs.def * 1.5);
  
  // 更新总战斗力
  if (player.combat_power !== undefined) {
    player.combat_power = (player.combat_power || 0) - (player.wing_combat_power || 0) + attrs.atk * 2 + attrs.hp * 0.5 + attrs.def * 1.5;
  }
}

// ============ 翅膀信息 ============
function getWingInfo(wing) {
  const data = WING_DATA[wing.id];
  const qualityData = WING_QUALITY[wing.quality];
  const starBonus = WING_STAR_EXP[wing.star];
  const illusionData = ILLUSION_UNLOCK[wing.illusion];
  
  return {
    ...wing,
    name: data.name,
    quality_name: qualityData.name,
    quality_color: qualityData.color,
    skill_name: data.skill_name,
    skill_description: data.description,
    star_bonus: starBonus,
    illusion_name: illusionData.name,
    exp_needed: WING_EXP_CURVE(wing.level),
    evolve_available: !wing.evolved && data.evolve_stage,
    evolve_cost: data.cost,
    evolve_stage_name: data.evolve_stage ? `化神${data.evolve_stage}阶` : null
  };
}

// ============ API ============
const wing_api = {
  obtain: obtainWing,
  levelup: levelupWing,
  starUp: starUpWing,
  illusion: illusionWing,
  unlockIllusion: unlockIllusion,
  equip: equipWing,
  evolve: evolveWing,
  composite: compositeWing,
  getAttributes: getWingTotalAttributes,
  getSkillEffect: getWingSkillEffect,
  getInfo: getWingInfo,
  data: WING_DATA,
  quality: WING_QUALITY,
  skills: WING_SKILLS,
  illusionData: ILLUSION_UNLOCK,
  starExp: WING_STAR_EXP
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = wing_api;
}
