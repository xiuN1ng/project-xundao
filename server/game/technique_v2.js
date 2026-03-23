/**
 * 挂机修仙 - 功法系统 v2.0 (风格化扩展版)
 * 
 * 优化策略：
 * 1. 功法风格化：剑修、丹道、符箓、阵法、炼体、问道
 * 2. 数量扩展：7种 → 30+种
 * 3. 包装升级：更吸引人的名称和描述
 * 4. 境界对应：每个境界有专属功法
 */

// ==================== 功法风格 ====================
const TECHNIQUE_STYLES = {
  // 剑修 - 极致攻击
  'sword': {
    name: '剑修',
    icon: '⚔️',
    color: '#FF4444',
    desc: '以剑入道，杀伐果断',
    bonus: { atk: 1.2, crit: 1.1 },
    primary: 'attack'
  },
  // 丹道 - 辅助治疗
  'alchemy': {
    name: '丹道',
    icon: '⚗️',
    color: '#44FF44',
    desc: '炼丹制药，救死扶伤',
    bonus: { hp_regen: 1.3, spirit_rate: 1.1 },
    primary: 'auxiliary'
  },
  // 符箓 - 增益buff
  'talisman': {
    name: '符箓',
    icon: '📜',
    color: '#4444FF',
    desc: '绘制灵符，增幅战力',
    bonus: { atk: 1.1, def: 1.1 },
    primary: 'support'
  },
  // 阵法 - 防守控制
  'formation': {
    name: '阵法',
    icon: '⬡',
    color: '#8844FF',
    desc: '布阵御敌，困敌杀阵',
    bonus: { def: 1.2, hp: 1.1 },
    primary: 'defense'
  },
  // 炼体 - 肉盾
  'body': {
    name: '炼体',
    icon: '💪',
    color: '#FF8844',
    desc: '锤炼肉身，金刚不坏',
    bonus: { hp: 1.3, def: 1.2 },
    primary: 'tank'
  },
  // 问道 - 全面均衡
  'tao': {
    name: '问道',
    icon: '☯️',
    color: '#FFFF44',
    desc: '道法自然，天人合一',
    bonus: { all_stats: 1.15 },
    primary: 'balanced'
  }
};

// ==================== 功法数据 v2 ====================
const TECHNIQUES_V2 = [
  // ========== 凡人界 (境界0) ==========
  {
    id: 'breath_foundation', name: '引气入体', style: 'tao',
    description: '感应天地灵气的入门功法',
    rarity: 1, realm_req: 0, level_req: 1,
    icon: '🌬️', primary_attr: 'spirit_rate', base_bonus: 0.1
  },
  {
    id: 'iron_palm', name: '铁砂掌', style: 'body',
    description: '外家功夫，炼体入门',
    rarity: 1, realm_req: 0, level_req: 1,
    icon: '🖐️', primary_attr: 'atk', base_bonus: 0.08
  },
  
  // ========== 练气期 (境界1-3) ==========
  {
    id: 'spirit_orb', name: '聚气成丹', style: 'alchemy',
    description: '将灵气凝聚成丹，事半功倍',
    rarity: 2, realm_req: 1, level_req: 10,
    icon: '🔮', primary_attr: 'spirit_rate', base_bonus: 0.15
  },
  {
    id: 'sword_qi', name: '剑意初现', style: 'sword',
    description: '初步领悟剑意，攻击力大增',
    rarity: 2, realm_req: 1, level_req: 10,
    icon: '🗡️', primary_attr: 'atk', base_bonus: 0.12
  },
  {
    id: 'body_iron', name: '铜皮铁骨', style: 'body',
    description: '刀枪不入，水火不侵',
    rarity: 2, realm_req: 2, level_req: 15,
    icon: '🛡️', primary_attr: 'def', base_bonus: 0.12
  },
  {
    id: 'talisman_basic', name: '基础符箓', style: 'talisman',
    description: '绘制最简单的符箓',
    rarity: 2, realm_req: 2, level_req: 15,
    icon: '📃', primary_attr: 'atk', base_bonus: 0.1
  },
  {
    id: 'formation_guard', name: '守护阵', style: 'formation',
    description: '基础防护阵法',
    rarity: 2, realm_req: 2, level_req: 15,
    icon: '🔯', primary_attr: 'def', base_bonus: 0.1
  },
  
  // ========== 筑基期 (境界4-6) ==========
  {
    id: 'golden_core', name: '金丹大道', style: 'alchemy',
    description: '凝聚金丹，质的飞跃',
    rarity: 3, realm_req: 4, level_req: 25,
    icon: '🌟', primary_attr: 'spirit_rate', base_bonus: 0.2
  },
  {
    id: 'sword_style', name: '落英剑诀', style: 'sword',
    description: '剑如落英，缤纷而下',
    rarity: 3, realm_req: 4, level_req: 25,
    icon: '🌸', primary_attr: 'atk', base_bonus: 0.18
  },
  {
    id: 'iron_wall', name: '金钟罩', style: 'body',
    description: '金钟护体，万邪不侵',
    rarity: 3, realm_req: 5, level_req: 30,
    icon: '🔔', primary_attr: 'hp', base_bonus: 0.2
  },
  {
    id: 'fire_talisman', name: '烈焰符', style: 'talisman',
    description: '激活火焰之力',
    rarity: 3, realm_req: 5, level_req: 30,
    icon: '🔥', primary_attr: 'atk', base_bonus: 0.15
  },
  {
    id: 'ice_wall', name: '玄冰阵', style: 'formation',
    description: '玄冰凝结，冻敌于无形',
    rarity: 3, realm_req: 5, level_req: 30,
    icon: '❄️', primary_attr: 'def', base_bonus: 0.15
  },
  {
    id: 'harmony_tao', name: '阴阳调和', style: 'tao',
    description: '阴阳平衡，灵气生生不息',
    rarity: 3, realm_req: 5, level_req: 30,
    icon: '☯️', primary_attr: 'all', base_bonus: 0.1
  },
  
  // ========== 金丹期 (境界7-9) ==========
  {
    id: 'pill_refining', name: '炼丹术', style: 'alchemy',
    description: '提炼仙丹，服用可飞升',
    rarity: 4, realm_req: 7, level_req: 40,
    icon: '⚗️', primary_attr: 'spirit_rate', base_bonus: 0.25
  },
  {
    id: 'sword_storm', name: '万剑归宗', style: 'sword',
    description: '万剑齐发，毁天灭地',
    rarity: 4, realm_req: 7, level_req: 40,
    icon: '🌪️', primary_attr: 'atk', base_bonus: 0.22
  },
  {
    id: 'diamond_body', name: '金刚不坏', style: 'body',
    description: '肉身成圣，金刚不坏',
    rarity: 4, realm_req: 8, level_req: 45,
    icon: '💎', primary_attr: 'hp', base_bonus: 0.25
  },
  {
    id: 'thunder_talisman', name: '天雷符', style: 'talisman',
    description: '引动天雷，惩戒妖魔',
    rarity: 4, realm_req: 8, level_req: 45,
    icon: '⚡', primary_attr: 'atk', base_bonus: 0.2
  },
  {
    id: 'trap_array', name: '困仙阵', style: 'formation',
    description: '困敌于阵，无处可逃',
    rarity: 4, realm_req: 8, level_req: 45,
    icon: '⛓️', primary_attr: 'def', base_bonus: 0.2
  },
  {
    id: 'celestial_tao', name: '天道悟真', style: 'tao',
    description: '悟透天道，与道合真',
    rarity: 4, realm_req: 8, level_req: 45,
    icon: '🏔️', primary_attr: 'all', base_bonus: 0.15
  },
  
  // ========== 元婴期及以上 ==========
  {
    id: 'immortal_pill', name: '不死仙丹', style: 'alchemy',
    description: '服用后可长生不老',
    rarity: 5, realm_req: 10, level_req: 60,
    icon: '🧬', primary_attr: 'hp_regen', base_bonus: 0.5
  },
  {
    id: 'sword_mind', name: '剑道通神', style: 'sword',
    description: '人剑合一，一剑开天',
    rarity: 5, realm_req: 10, level_req: 60,
    icon: '🔱', primary_attr: 'atk', base_bonus: 0.3
  },
  {
    id: 'immortal_body', name: '鸿蒙道体', style: 'body',
    description: '与天地同寿，与日月同辉',
    rarity: 5, realm_req: 11, level_req: 70,
    icon: '🌞', primary_attr: 'hp', base_bonus: 0.4
  },
  {
    id: 'god_talisman', name: '天帝符', style: 'talisman',
    description: '天帝亲授，毁天灭地',
    rarity: 5, realm_req: 11, level_req: 70,
    icon: '👑', primary_attr: 'atk', base_bonus: 0.28
  },
  {
    id: 'world_formation', name: '界王阵', style: 'formation',
    description: '一界之隔，弹指灭国',
    rarity: 5, realm_req: 11, level_req: 70,
    icon: '🌐', primary_attr: 'def', base_bonus: 0.28
  },
  {
    id: 'ultimate_tao', name: '大道至简', style: 'tao',
    description: '返璞归真，道法自然',
    rarity: 5, realm_req: 11, level_req: 70,
    icon: '✨', primary_attr: 'all', base_bonus: 0.25
  },
  
  // ========== 化神期 ==========
  {
    id: 'creation_alchemy', name: '造化石', style: 'alchemy',
    description: '可创造万物，重塑天地',
    rarity: 6, realm_req: 13, level_req: 80,
    icon: '🌀', primary_attr: 'spirit_rate', base_bonus: 0.4
  },
  {
    id: 'void_sword', name: '虚空剑意', style: 'sword',
    description: '斩破虚空，一剑永恒',
    rarity: 6, realm_req: 13, level_req: 80,
    icon: '🕳️', primary_attr: 'atk', base_bonus: 0.35
  },
  {
    id: 'chaos_body', name: '混沌道体', style: 'body',
    description: '混沌之身，万法不侵',
    rarity: 6, realm_req: 14, level_req: 90,
    icon: '🌌', primary_attr: 'hp', base_bonus: 0.5
  },
  {
    id: 'world_talisman', name: '世界符', style: 'talisman',
    description: '一符一世界',
    rarity: 6, realm_req: 14, level_req: 90,
    icon: '🌍', primary_attr: 'atk', base_bonus: 0.32
  },
  {
    id: 'universe_formation', name: '宇宙阵', style: 'formation',
    description: '宇宙生灭，阵法永存',
    rarity: 6, realm_req: 14, level_req: 90,
    icon: '🔮', primary_attr: 'def', base_bonus: 0.32
  },
  {
    id: 'eternal_tao', name: '永恒之道', style: 'tao',
    description: '超越时间，超脱永恒',
    rarity: 6, realm_req: 14, level_req: 90,
    icon: '♾️', primary_attr: 'all', base_bonus: 0.3
  }
];

// ==================== 套装效果 ====================
const TECHNIQUE_SETS = {
  'sword_master': {
    name: '剑道宗师',
    techniques: ['sword_qi', 'sword_style', 'sword_storm', 'sword_mind', 'void_sword'],
    bonus: { atk: 0.3, crit: 0.15 }
  },
  'alchemy_master': {
    name: '丹道至尊',
    techniques: ['spirit_orb', 'golden_core', 'pill_refining', 'immortal_pill', 'creation_alchemy'],
    bonus: { spirit_rate: 0.3, hp_regen: 0.3 }
  },
  'body_master': {
    name: '炼体极限',
    techniques: ['iron_palm', 'iron_wall', 'diamond_body', 'immortal_body', 'chaos_body'],
    bonus: { hp: 0.4, def: 0.2 }
  },
  'tao_master': {
    name: '道法自然',
    techniques: ['breath_foundation', 'harmony_tao', 'celestial_tao', 'ultimate_tao', 'eternal_tao'],
    bonus: { all: 0.25, exp_rate: 0.2 }
  }
};

/**
 * 获取功法详情
 */
function getTechnique(id) {
  return TECHNIQUES_V2.find(t => t.id === id);
}

/**
 * 获取风格信息
 */
function getStyleInfo(style) {
  return TECHNIQUE_STYLES[style];
}

/**
 * 获取套装效果
 */
function getSetBonus(setId) {
  return TECHNIQUE_SETS[setId];
}

/**
 * 计算功法属性加成
 */
function calculateTechniqueBonus(technique, level) {
  const style = TECHNIQUE_STYLES[technique.style];
  const levelBonus = technique.base_bonus * level;
  
  let attrs = {};
  if (technique.primary_attr === 'all') {
    attrs = { all_stats: levelBonus };
  } else {
    attrs[technique.primary_attr] = levelBonus;
  }
  
  // 风格加成
  if (style && style.bonus) {
    for (const [key, value] of Object.entries(style.bonus)) {
      attrs[key] = (attrs[key] || 0) + (value - 1);
    }
  }
  
  return attrs;
}

/**
 * 获取玩家可学习的功法
 */
function getAvailableTechniques(realmLevel, playerLevel) {
  return TECHNIQUES_V2.filter(t => 
    t.realm_req <= realmLevel && t.level_req <= playerLevel
  );
}

/**
 * 导出
 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TECHNIQUE_STYLES,
    TECHNIQUES_V2,
    TECHNIQUE_SETS,
    getTechnique,
    getStyleInfo,
    getSetBonus,
    calculateTechniqueBonus,
    getAvailableTechniques
  };
}
