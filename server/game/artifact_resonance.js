/**
 * 神器共鸣与觉醒系统 v1.0
 * P52-1: 神器共鸣效果增强 + 神器觉醒技能解锁 + 神器词缀随机化
 * 
 * 共鸣套装效果（2件/4件套）
 * 觉醒技能（每个品质5级）
 * 随机词缀系统
 */

const ARTIFACT_RESONANCE = {
  // ============ 共鸣套装配置 ============
  // 同类型（武器/防具/饰品/伴生）装备2件/4件触发共鸣
  sets: {
    // 飞剑系共鸣 - 攻击型
    'sword_set': {
      name: '剑意共鸣',
      pieces: ['weapon'],
      minPieces: 2,
      effects: {
        2: { atk_boost: 0.15, crit_rate: 0.05, desc: '剑意+15% 暴击率+5%' },
        4: { atk_boost: 0.30, crit_rate: 0.10, skill_cd_reduce: 0.20, desc: '剑意+30% 暴击率+10% 技能CD-20%' }
      },
      desc: '飞剑类神器共鸣'
    },
    // 宝甲方共鸣 - 防御型
    'armor_set': {
      name: '金身共鸣',
      pieces: ['armor'],
      minPieces: 2,
      effects: {
        2: { def_boost: 0.20, hp_boost: 0.10, desc: '防御+20% 生命+10%' },
        4: { def_boost: 0.40, hp_boost: 0.25, shield_reflect: 0.15, desc: '防御+40% 生命+25% 护盾反伤15%' }
      },
      desc: '宝甲类神器共鸣'
    },
    // 配饰系共鸣 - 辅助型
    'accessory_set': {
      name: '灵气共鸣',
      pieces: ['accessory'],
      minPieces: 2,
      effects: {
        2: { spirit_boost: 0.25, spirit_rate: 0.15, desc: '灵气上限+25% 灵气速率+15%' },
        4: { spirit_boost: 0.50, spirit_rate: 0.35, cultivation_speed: 0.20, desc: '灵气上限+50% 速率+35% 修炼速度+20%' }
      },
      desc: '配饰类神器共鸣'
    },
    // 伴生系共鸣 - 特殊型
    'companion_set': {
      name: '灵兽共鸣',
      pieces: ['companion'],
      minPieces: 2,
      effects: {
        2: { pet_damage: 0.20, pet_hp: 0.15, desc: '灵兽伤害+20% 灵兽生命+15%' },
        4: { pet_damage: 0.40, pet_hp: 0.30, companion_skill_free: true, desc: '灵兽伤害+40% 生命+30% 伴生技无CD' }
      },
      desc: '伴生类神器共鸣'
    },
    // 混搭共鸣 - 集齐4种不同类型
    'mixed_set': {
      name: '天人合一',
      pieces: ['weapon', 'armor', 'accessory', 'companion'],
      minPieces: 4,
      effects: {
        4: { all_stats: 0.25, realm_bonus: 0.10, dodge_rate: 0.08, desc: '全属性+25% 境界加成+10% 闪避率+8%' }
      },
      desc: '集齐4种类型触发，天人合一'
    }
  },

  // ============ 觉醒技能系统 ============
  // 每件神器有觉醒技能，需要达到一定等级解锁
  awakening_skills: {
    // 神器觉醒技能（按品质）
    'mortal': {
      max_awaken_level: 3,
      awakening_materials: { 'awaken_dust': 10, 'spirit_essence': 5 },
      exp_per_awaken: 100,
      skills: [
        { level: 1, name: '初阶觉醒·攻', effect: { atk_flat: 50 }, desc: '攻击力+50' },
        { level: 2, name: '初阶觉醒·守', effect: { def_flat: 30 }, desc: '防御力+30' },
        { level: 3, name: '初阶觉醒·生', effect: { hp_flat: 500 }, desc: '生命值+500' }
      ]
    },
    'spirit': {
      max_awaken_level: 5,
      awakening_materials: { 'awaken_essence': 5, 'fire_essence': 10 },
      exp_per_awaken: 250,
      skills: [
        { level: 1, name: '灵阶觉醒·锐', effect: { atk_percent: 0.10 }, desc: '攻击力+10%' },
        { level: 2, name: '灵阶觉醒·固', effect: { def_percent: 0.08 }, desc: '防御力+8%' },
        { level: 3, name: '灵阶觉醒·命', effect: { hp_percent: 0.12 }, desc: '生命值+12%' },
        { level: 4, name: '灵阶觉醒·速', effect: { atk_speed: 0.10 }, desc: '攻击速度+10%' },
        { level: 5, name: '灵阶觉醒·灵', effect: { spirit_all: 0.15 }, desc: '灵气全部+15%' }
      ]
    },
    'treasure': {
      max_awaken_level: 7,
      awakening_materials: { 'awaken_stone': 3, 'thunder_essence': 15 },
      exp_per_awaken: 600,
      skills: [
        { level: 1, name: '宝阶觉醒·斩', effect: { atk_crit_damage: 0.20 }, desc: '暴击伤害+20%' },
        { level: 2, name: '宝阶觉醒·护', effect: { damage_reduce: 0.15 }, desc: '受伤-15%' },
        { level: 3, name: '宝阶觉醒·回', effect: { hp_regen: 0.05 }, desc: '生命回复+5%/秒' },
        { level: 4, name: '宝阶觉醒·破', effect: { armor_penetration: 0.15 }, desc: '护甲穿透+15%' },
        { level: 5, name: '宝阶觉醒·反', effect: { counter_rate: 0.10 }, desc: '反击率+10%' },
        { level: 6, name: '宝阶觉醒·聚', effect: { spirit_rate_boost: 0.30 }, desc: '灵气速率+30%' },
        { level: 7, name: '宝阶觉醒·天', effect: { all_stats_boost: 0.15 }, desc: '全属性+15%' }
      ]
    },
    'immortal': {
      max_awaken_level: 10,
      awakening_materials: { 'awaken_crystal': 2, 'immortal_core': 5 },
      exp_per_awaken: 1500,
      skills: [
        { level: 1, name: '仙阶觉醒·灭', effect: { atk_percent: 0.20, crit_rate: 0.05 }, desc: '攻击+20% 暴击+5%' },
        { level: 2, name: '仙阶觉醒·守', effect: { def_percent: 0.18, damage_reduce: 0.10 }, desc: '防御+18% 减伤10%' },
        { level: 3, name: '仙阶觉醒·续', effect: { hp_percent: 0.25, revive_count: 1 }, desc: '生命+25% 复活1次' },
        { level: 4, name: '仙阶觉醒·速', effect: { skill_cd_total: -0.25 }, desc: '全技能CD-25%' },
        { level: 5, name: '仙阶觉醒·爆', effect: { aoe_damage: 0.30 }, desc: '范围伤害+30%' },
        { level: 6, name: '仙阶觉醒·愈', effect: { heal_power: 0.35 }, desc: '治疗效果+35%' },
        { level: 7, name: '仙阶觉醒·盾', effect: { shield_create: 0.20 }, desc: '获得护盾+20%HP' },
        { level: 8, name: '仙阶觉醒·噬', effect: { lifesteal: 0.15 }, desc: '生命偷取+15%' },
        { level: 9, name: '仙阶觉醒·免', effect: { cc_immunity: 0.50 }, desc: '控制免疫+50%' },
        { level: 10, name: '仙阶觉醒·道', effect: { realm_speed_boost: 0.20 }, desc: '境界突破速度+20%' }
      ]
    },
    'divine': {
      max_awaken_level: 15,
      awakening_materials: { 'divine_awaken_shard': 1, 'world_dust': 20 },
      exp_per_awaken: 5000,
      skills: [
        { level: 1, name: '神阶觉醒·天威', effect: { atk_all: 0.30 }, desc: '全攻击+30%' },
        { level: 2, name: '神阶觉醒·不灭', effect: { hp_all: 0.35 }, desc: '全生命+35%' },
        { level: 3, name: '神阶觉醒·金刚', effect: { def_all: 0.30 }, desc: '全防御+30%' },
        { level: 4, name: '神阶觉醒·暴虐', effect: { crit_rate: 0.15, crit_damage: 0.30 }, desc: '暴击率+15% 暴伤+30%' },
        { level: 5, name: '神阶觉醒·轮回', effect: { revive_hp: 0.80, revive_count: 2 }, desc: '复活恢复80%HP，可复活2次' },
        { level: 6, name: '神阶觉醒·无双', effect: { all_damage_reduce: 0.25 }, desc: '受到所有伤害-25%' },
        { level: 7, name: '神阶觉醒·苍穹', effect: { skill_cd_all: -0.35 }, desc: '所有技能CD-35%' },
        { level: 8, name: '神阶觉醒·天命', effect: { final_damage_boost: 0.40 }, desc: '最终伤害+40%' },
        { level: 9, name: '神阶觉醒·护法', effect: { shield_all: 0.50 }, desc: '护盾效果+50%' },
        { level: 10, name: '神阶觉醒·破界', effect: { armor_penetration: 0.35, resist_penetration: 0.35 }, desc: '护甲/抗性穿透+35%' },
        { level: 11, name: '神阶觉醒·生生', effect: { hp_regen_all: 0.10 }, desc: '生命回复+10%/秒' },
        { level: 12, name: '神阶觉醒·夺灵', effect: { spirit_steal: 0.20 }, desc: '击杀回蓝+20%' },
        { level: 13, name: '神阶觉醒·真言', effect: { buff_duration: 0.40 }, desc: 'BUFF持续时间+40%' },
        { level: 14, name: '神阶觉醒·禁', effect: { crowd_control_boost: 0.30 }, desc: '控制效果+30%' },
        { level: 15, name: '神阶觉醒·本源', effect: { all_stats_final: 0.50 }, desc: '最终全属性+50%' }
      ]
    }
  },

  // ============ 随机词缀系统 ============
  affix_types: {
    // 攻击类词缀
    attack: [
      { id: 'atk_1', name: '锋利', stat: 'atk_percent', min_val: 0.03, max_val: 0.08, weight: 30, rarity: 'common' },
      { id: 'atk_2', name: '凌厉', stat: 'atk_percent', min_val: 0.08, max_val: 0.15, weight: 20, rarity: 'rare' },
      { id: 'atk_3', name: '狂暴', stat: 'atk_percent', min_val: 0.15, max_val: 0.25, weight: 10, rarity: 'epic' },
      { id: 'crit_1', name: '致命', stat: 'crit_rate', min_val: 0.02, max_val: 0.06, weight: 30, rarity: 'common' },
      { id: 'crit_2', name: '致死', stat: 'crit_rate', min_val: 0.06, max_val: 0.12, weight: 15, rarity: 'rare' },
      { id: 'critd_1', name: '毁灭', stat: 'crit_damage', min_val: 0.10, max_val: 0.25, weight: 20, rarity: 'common' },
      { id: 'critd_2', name: '湮灭', stat: 'crit_damage', min_val: 0.25, max_val: 0.45, weight: 8, rarity: 'epic' },
      { id: 'armpen_1', name: '破甲', stat: 'armor_penetration', min_val: 0.05, max_val: 0.12, weight: 15, rarity: 'rare' },
      { id: 'armpen_2', name: '贯穿', stat: 'armor_penetration', min_val: 0.12, max_val: 0.22, weight: 5, rarity: 'epic' },
      { id: 'lifesteal_1', name: '吸血', stat: 'lifesteal', min_val: 0.03, max_val: 0.08, weight: 12, rarity: 'rare' },
      { id: 'lifesteal_2', name: '嗜血', stat: 'lifesteal', min_val: 0.08, max_val: 0.15, weight: 4, rarity: 'epic' }
    ],
    // 防御类词缀
    defense: [
      { id: 'def_1', name: '坚固', stat: 'def_percent', min_val: 0.03, max_val: 0.08, weight: 30, rarity: 'common' },
      { id: 'def_2', name: '铁壁', stat: 'def_percent', min_val: 0.08, max_val: 0.15, weight: 20, rarity: 'rare' },
      { id: 'def_3', name: '不灭', stat: 'def_percent', min_val: 0.15, max_val: 0.25, weight: 8, rarity: 'epic' },
      { id: 'hp_1', name: '生命力', stat: 'hp_percent', min_val: 0.05, max_val: 0.12, weight: 30, rarity: 'common' },
      { id: 'hp_2', name: '生机', stat: 'hp_percent', min_val: 0.12, max_val: 0.20, weight: 15, rarity: 'rare' },
      { id: 'hp_3', name: '不屈', stat: 'hp_percent', min_val: 0.20, max_val: 0.35, weight: 5, rarity: 'epic' },
      { id: 'dodge_1', name: '闪避', stat: 'dodge_rate', min_val: 0.02, max_val: 0.05, weight: 20, rarity: 'rare' },
      { id: 'dodge_2', name: '幻影', stat: 'dodge_rate', min_val: 0.05, max_val: 0.10, weight: 6, rarity: 'epic' },
      { id: 'resist_1', name: '抗性', stat: 'resistance', min_val: 0.03, max_val: 0.08, weight: 25, rarity: 'common' },
      { id: 'resist_2', name: '魔抗', stat: 'resistance', min_val: 0.08, max_val: 0.15, weight: 10, rarity: 'rare' }
    ],
    // 辅助类词缀
    utility: [
      { id: 'spd_1', name: '迅捷', stat: 'atk_speed', min_val: 0.03, max_val: 0.08, weight: 25, rarity: 'common' },
      { id: 'spd_2', name: '疾风', stat: 'atk_speed', min_val: 0.08, max_val: 0.15, weight: 10, rarity: 'rare' },
      { id: 'cd_1', name: '冷却', stat: 'skill_cd_reduce', min_val: 0.03, max_val: 0.08, weight: 20, rarity: 'common' },
      { id: 'cd_2', name: '时空', stat: 'skill_cd_reduce', min_val: 0.08, max_val: 0.15, weight: 8, rarity: 'rare' },
      { id: 'spirit_1', name: '聚灵', stat: 'spirit_bonus', min_val: 0.05, max_val: 0.15, weight: 20, rarity: 'rare' },
      { id: 'spirit_2', name: '灵气', stat: 'spirit_bonus', min_val: 0.15, max_val: 0.30, weight: 6, rarity: 'epic' },
      { id: 'exp_1', name: '悟性', stat: 'exp_bonus', min_val: 0.05, max_val: 0.12, weight: 18, rarity: 'rare' },
      { id: 'exp_2', name: '天资', stat: 'exp_bonus', min_val: 0.12, max_val: 0.20, weight: 5, rarity: 'epic' },
      { id: 'gold_1', name: '财运', stat: 'gold_bonus', min_val: 0.05, max_val: 0.15, weight: 22, rarity: 'rare' },
      { id: 'gold_2', name: '招财', stat: 'gold_bonus', min_val: 0.15, max_val: 0.25, weight: 6, rarity: 'epic' }
    ],
    // 特殊词缀（传说）
    legendary: [
      { id: 'leg_1', name: '天罚', stat: 'true_damage', min_val: 0.10, max_val: 0.20, weight: 1, rarity: 'legendary', desc: '造成真实伤害' },
      { id: 'leg_2', name: '无敌', stat: 'invincible_sec', min_val: 1, max_val: 3, weight: 1, rarity: 'legendary', desc: '每回合1-3秒无敌' },
      { id: 'leg_3', name: '连锁', stat: 'chain_damage', min_val: 0.15, max_val: 0.30, weight: 1, rarity: 'legendary', desc: '伤害链式传递' },
      { id: 'leg_4', name: '反弹', stat: 'damage_reflect', min_val: 0.20, max_val: 0.40, weight: 1, rarity: 'legendary', desc: '伤害反弹' },
      { id: 'leg_5', name: '秒杀', stat: 'execute_hp', min_val: 0.05, max_val: 0.10, weight: 1, rarity: 'legendary', desc: '概率秒杀低血量目标' }
    ]
  },

  // ============ 词缀数量规则 ============
  // 按品质决定词缀数量和类型
  affix_rules: {
    'mortal':   { min_affixes: 1, max_affixes: 2, types: ['attack', 'defense', 'utility'], legendary_chance: 0 },
    'spirit':   { min_affixes: 2, max_affixes: 3, types: ['attack', 'defense', 'utility'], legendary_chance: 0.02 },
    'treasure': { min_affixes: 2, max_affixes: 4, types: ['attack', 'defense', 'utility'], legendary_chance: 0.05 },
    'immortal': { min_affixes: 3, max_affixes: 5, types: ['attack', 'defense', 'utility', 'legendary'], legendary_chance: 0.10 },
    'divine':   { min_affixes: 4, max_affixes: 6, types: ['attack', 'defense', 'utility', 'legendary'], legendary_chance: 0.20 }
  }
};

// ==================== 核心函数 ====================

/**
 * 计算神器共鸣效果
 * @param {Array} equippedArtifacts - 玩家装备的神器列表
 * @returns {Object} 共鸣加成
 */
function calculateResonance(equippedArtifacts) {
  const result = {
    active_sets: [],
    total_bonus: {}
  };

  // 按类型分组
  const byType = {};
  for (const art of equippedArtifacts) {
    const type = art.type || 'weapon';
    if (!byType[type]) byType[type] = [];
    byType[type].push(art);
  }

  // 检查各套装
  for (const [setKey, setData] of Object.entries(ARTIFACT_RESONANCE.sets)) {
    const pieces = setData.pieces.map(t => byType[t] || []).flat();
    const count = pieces.length;

    if (count >= setData.minPieces) {
      // 获取生效效果
      let effectKey = null;
      for (const key of Object.keys(setData.effects).map(Number).sort((a, b) => b - a)) {
        if (count >= key) { effectKey = key; break; }
      }
      if (effectKey) {
        const effect = setData.effects[effectKey];
        result.active_sets.push({ set: setKey, name: setData.name, pieces: count, effect });
        // 合并到总加成
        for (const [stat, val] of Object.entries(effect)) {
          if (stat !== 'desc') {
            result.total_bonus[stat] = (result.total_bonus[stat] || 0) + val;
          }
        }
      }
    }
  }

  return result;
}

/**
 * 生成随机词缀
 * @param {string} quality - 神器品质
 * @param {string} type - 神器类型（weapon/armor/accessory/companion）
 * @returns {Array} 词缀列表
 */
function generateAffixes(quality, type = 'weapon') {
  const rules = ARTIFACT_RESONANCE.affix_rules[quality];
  if (!rules) return [];

  const count = Math.floor(Math.random() * (rules.max_affixes - rules.min_affixes + 1)) + rules.min_affixes;
  const affixes = [];
  const usedIds = new Set();

  // 先尝试词缀类型平衡
  const possibleTypes = rules.types.filter(t => t !== 'legendary');

  for (let i = 0; i < count; i++) {
    // 传奇词缀独立判定
    const isLegendary = Math.random() < rules.legendary_chance;
    let pool = isLegendary ? ARTIFACT_RESONANCE.affix_types.legendary : 
               ARTIFACT_RESONANCE.affix_types[possibleTypes[i % possibleTypes.length]] || 
               ARTIFACT_RESONANCE.affix_types.attack;

    // 按权重随机
    const totalWeight = pool.reduce((sum, a) => sum + a.weight, 0);
    let r = Math.random() * totalWeight;
    let selected = pool[0];

    for (const affix of pool) {
      r -= affix.weight;
      if (r <= 0) { selected = affix; break; }
    }

    if (!usedIds.has(selected.id)) {
      usedIds.add(selected.id);
      const val = selected.min_val + Math.random() * (selected.max_val - selected.min_val);
      affixes.push({
        id: selected.id,
        name: selected.name,
        stat: selected.stat,
        value: parseFloat(val.toFixed(4)),
        rarity: selected.rarity,
        desc: selected.desc || `${selected.name}: ${selected.stat}+${(val * 100).toFixed(1)}%`
      });
    } else {
      i--; // 重复，重新选
    }
  }

  return affixes;
}

/**
 * 获取觉醒进度和技能
 * @param {Object} artifact - 神器对象
 * @param {number} currentExp - 当前觉醒经验
 * @returns {Object} 觉醒状态
 */
function getAwakeningStatus(artifact) {
  const quality = artifact.quality || 'mortal';
  const awakenData = ARTIFACT_RESONANCE.awakening_skills[quality];
  if (!awakenData) return { level: 0, skills: [], progress: 0 };

  const level = artifact.awaken_level || 0;
  const exp = artifact.awaken_exp || 0;
  const expNeeded = awakenData.exp_per_awaken;

  const skills = [];
  for (let l = 1; l <= level && l <= awakenData.skills.length; l++) {
    skills.push({ ...awakenData.skills[l - 1], unlocked: true });
  }
  // 下一个技能
  if (level < awakenData.max_awaken_level && level < awakenData.skills.length) {
    const nextSkill = awakenData.skills[level];
    skills.push({ ...nextSkill, unlocked: false, progress: Math.min(1, exp / expNeeded) });
  }

  return {
    level,
    maxLevel: awakenData.max_awaken_level,
    exp,
    expNeeded,
    progress: Math.min(1, exp / expNeeded),
    skills,
    materials: awakenData.awakening_materials
  };
}

/**
 * 执行觉醒升级
 * @param {Object} artifact - 神器
 * @param {number} addExp - 增加的经验
 * @returns {Object} 升级结果
 */
function addAwakeningExp(artifact, addExp) {
  const quality = artifact.quality || 'mortal';
  const awakenData = ARTIFACT_RESONANCE.awakening_skills[quality];
  if (!awakenData) return artifact;

  const level = artifact.awaken_level || 0;
  if (level >= awakenData.max_awaken_level) return artifact;

  let exp = artifact.awaken_exp || 0;
  exp += addExp;
  const expNeeded = awakenData.exp_per_awaken;
  const newSkills = [];
  let leveled = false;

  while (exp >= expNeeded && (artifact.awaken_level || 0) < awakenData.max_awaken_level) {
    exp -= expNeeded;
    artifact.awaken_level = (artifact.awaken_level || 0) + 1;
    leveled = true;
    if (artifact.awaken_level <= awakenData.skills.length) {
      newSkills.push(awakenData.skills[artifact.awaken_level - 1]);
    }
  }

  artifact.awaken_exp = exp;
  if (newSkills.length > 0) {
    artifact.new_awaken_skills = newSkills;
  }

  return artifact;
}

/**
 * 获取神器总战斗力加成
 */
function getArtifactCombatPower(artifact) {
  if (!artifact) return 0;
  let cp = 0;
  const quality = artifact.quality || 'mortal';
  const qualityMult = { mortal: 1, spirit: 2.5, treasure: 6, immortal: 15, divine: 40 };
  cp += (artifact.base_atk || 0) * (qualityMult[quality] || 1) * 2;
  cp += (artifact.base_def || 0) * (qualityMult[quality] || 1) * 1.5;
  
  // 词缀加成
  if (artifact.affixes && artifact.affixes.length > 0) {
    for (const aff of artifact.affixes) {
      if (aff.stat === 'atk_percent') cp += 500 * aff.value * (qualityMult[quality] || 1);
      if (aff.stat === 'def_percent') cp += 300 * aff.value * (qualityMult[quality] || 1);
      if (aff.stat === 'hp_percent') cp += 200 * aff.value * (qualityMult[quality] || 1);
    }
  }
  
  // 觉醒加成
  const awakenLevel = artifact.awaken_level || 0;
  cp += awakenLevel * 100 * (qualityMult[quality] || 1);
  
  return Math.floor(cp);
}

module.exports = {
  ARTIFACT_RESONANCE,
  calculateResonance,
  generateAffixes,
  getAwakeningStatus,
  addAwakeningExp,
  getArtifactCombatPower
};
