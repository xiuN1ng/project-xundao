/**
 * 神器配置 v1.0
 * P87-5: 神器炼制/套装进阶系统
 * 
 * 7把神器配置：东皇钟、轩辕剑、盘古斧、女娲石、神农鼎、蚩尤旗、昊天塔
 */

const ARTIFACT_TYPES = ['法宝', '剑', '斧', '鼎', '旗', '塔'];

const ARTIFACT_QUALITY_COLOR = {
  red: { name: '红色', color: '#FF0000', tier: 6 },
  orange: { name: '橙色', color: '#FF8C00', tier: 5 },
  purple: { name: '紫色', color: '#8B00FF', tier: 4 },
  blue: { name: '蓝色', color: '#1E90FF', tier: 3 }
};

const ARTIFACT_CONFIG = {
  // 东皇钟 - 红色品质 法宝
  'donghuang_bell': {
    id: 'donghuang_bell',
    name: '东皇钟',
    type: '法宝',
    quality: 'red',
    qualityName: '红色',
    baseStats: {
      hp: 50000,
      atk: 0,
      def: 0,
      spirit: 0,
      all_attr_percent: 0
    },
    levelRange: [1, 15],
    skillActive: {
      id: 'absolute_defense',
      name: '绝对防御',
      desc: '3秒无敌，免疫所有伤害和控制效果',
      duration: 3,
      cooldown: 120
    },
    skillPassive: {
      id: 'titan_vitality',
      name: '泰坦生命力',
      desc: '气血上限+15%',
      effect: { hp_percent: 0.15 }
    },
    forgeFragmentCount: 100,
    forgeLingshiCost: 500000,
    resonanceGroup: 'artifact_type',
    resonanceType: '法宝',
    obtainMethods: ['fragment_exchange', 'dungeon_drop', 'activity_reward']
  },

  // 轩辕剑 - 橙色品质 剑
  'xuanyuan_sword': {
    id: 'xuanyuan_sword',
    name: '轩辕剑',
    type: '剑',
    quality: 'orange',
    qualityName: '橙色',
    baseStats: {
      hp: 0,
      atk: 5000,
      def: 0,
      spirit: 0,
      all_attr_percent: 0
    },
    levelRange: [1, 15],
    skillActive: {
      id: 'sword_wave',
      name: '剑荡八荒',
      desc: '对所有敌方造成250%攻击力的群攻伤害',
      damage: 2.5,
      cooldown: 45
    },
    skillPassive: {
      id: 'sword_intent',
      name: '剑意',
      desc: '攻击+12%',
      effect: { atk_percent: 0.12 }
    },
    forgeFragmentCount: 80,
    forgeLingshiCost: 300000,
    resonanceGroup: 'artifact_type',
    resonanceType: '剑',
    obtainMethods: ['fragment_exchange', 'dungeon_drop', 'activity_reward']
  },

  // 盘古斧 - 橙色品质 斧
  'pangu_axe': {
    id: 'pangu_axe',
    name: '盘古斧',
    type: '斧',
    quality: 'orange',
    qualityName: '橙色',
    baseStats: {
      hp: 0,
      atk: 0,
      def: 3000,
      spirit: 0,
      all_attr_percent: 0
    },
    levelRange: [1, 15],
    skillActive: {
      id: 'world_cleave',
      name: '劈天裂地',
      desc: '下一次攻击伤害+300%，并破甲50%持续10秒',
      damage: 3.0,
      armor_break: 0.5,
      cooldown: 60
    },
    skillPassive: {
      id: 'creator_resilience',
      name: '创世韧性',
      desc: '防御+12%',
      effect: { def_percent: 0.12 }
    },
    forgeFragmentCount: 80,
    forgeLingshiCost: 300000,
    resonanceGroup: 'artifact_type',
    resonanceType: '斧',
    obtainMethods: ['fragment_exchange', 'dungeon_drop', 'activity_reward']
  },

  // 女娲石 - 橙色品质 法宝
  'nuwa_stone': {
    id: 'nuwa_stone',
    name: '女娲石',
    type: '法宝',
    quality: 'orange',
    qualityName: '橙色',
    baseStats: {
      hp: 0,
      atk: 0,
      def: 0,
      spirit: 5000,
      all_attr_percent: 0
    },
    levelRange: [1, 15],
    skillActive: {
      id: 'resurrection',
      name: '补天续命',
      desc: '死亡时自动复活，回复50%最大气血，仅触发一次',
      trigger: 'on_death',
      revive_hp_percent: 0.5,
      cooldown: 0
    },
    skillPassive: {
      id: 'earth_goddess_blessing',
      name: '大地之母祝福',
      desc: '灵力+15%',
      effect: { spirit_percent: 0.15 }
    },
    forgeFragmentCount: 80,
    forgeLingshiCost: 300000,
    resonanceGroup: 'artifact_type',
    resonanceType: '法宝',
    obtainMethods: ['fragment_exchange', 'dungeon_drop', 'activity_reward']
  },

  // 神农鼎 - 紫色品质 鼎
  'shennong_ding': {
    id: 'shennong_ding',
    name: '神农鼎',
    type: '鼎',
    quality: 'purple',
    qualityName: '紫色',
    baseStats: {
      hp: 0,
      atk: 0,
      def: 0,
      spirit: 0,
      all_attr_percent: 0.10
    },
    levelRange: [1, 15],
    skillActive: {
      id: 'herb_skill',
      name: '百草灵枢',
      desc: '每秒回复3%最大气血，持续15秒',
      heal_percent: 0.03,
      duration: 15,
      cooldown: 90
    },
    skillPassive: {
      id: 'alchemist_blessing',
      name: '药师祝福',
      desc: '全属性+10%',
      effect: { all_attr_percent: 0.10 }
    },
    forgeFragmentCount: 50,
    forgeLingshiCost: 150000,
    resonanceGroup: 'artifact_type',
    resonanceType: '鼎',
    obtainMethods: ['fragment_exchange', 'dungeon_drop', 'activity_reward']
  },

  // 蚩尤旗 - 紫色品质 旗
  'chiyou_flag': {
    id: 'chiyou_flag',
    name: '蚩尤旗',
    type: '旗',
    quality: 'purple',
    qualityName: '紫色',
    baseStats: {
      hp: 0,
      atk: 0,
      def: 0,
      spirit: 0,
      all_attr_percent: 0
    },
    levelRange: [1, 15],
    skillActive: {
      id: 'war_fury',
      name: '战意滔天',
      desc: '攻击速度+50%，持续20秒',
      atk_speed_boost: 0.5,
      duration: 20,
      cooldown: 90
    },
    skillPassive: {
      id: 'war_god_blessing',
      name: '战神祝福',
      desc: '攻击+15%',
      effect: { atk_percent: 0.15 }
    },
    forgeFragmentCount: 50,
    forgeLingshiCost: 150000,
    resonanceGroup: 'artifact_type',
    resonanceType: '旗',
    obtainMethods: ['fragment_exchange', 'dungeon_drop', 'activity_reward']
  },

  // 昊天塔 - 蓝色品质 塔
  'haotian_tower': {
    id: 'haotian_tower',
    name: '昊天塔',
    type: '塔',
    quality: 'blue',
    qualityName: '蓝色',
    baseStats: {
      hp: 0,
      atk: 0,
      def: 0,
      spirit: 0,
      all_attr_percent: 0
    },
    levelRange: [1, 15],
    skillActive: {
      id: 'net_heaven',
      name: '天罗地网',
      desc: '定身所有敌方5秒，期间受到伤害+30%',
      stun_duration: 5,
      damage_bonus: 0.3,
      cooldown: 120
    },
    skillPassive: {
      id: 'tower_defense',
      name: '塔防',
      desc: '防御+10%',
      effect: { def_percent: 0.10 }
    },
    forgeFragmentCount: 30,
    forgeLingshiCost: 80000,
    resonanceGroup: 'artifact_type',
    resonanceType: '塔',
    obtainMethods: ['fragment_exchange', 'dungeon_drop', 'activity_reward']
  }
};

// 神器等级经验表 (1-15级)
const ARTIFACT_EXP_TABLE = {};
for (let level = 1; level <= 15; level++) {
  ARTIFACT_EXP_TABLE[level] = level * level * 1000;
}

// 神器升级属性增长 (每级百分比)
const ARTIFACT_LEVEL_BONUS = {
  hp: 0.08,       // 每级+8%气血
  atk: 0.08,      // 每级+8%攻击
  def: 0.08,      // 每级+8%防御
  spirit: 0.08,  // 每级+8%灵力
  all: 0.02      // 每级额外+2%全属性
};

// 神器共鸣配置
const ARTIFACT_RESONANCE_CONFIG = {
  // 按类型共鸣
  '法宝': {
    3: { hp_percent: 0.20, desc: '法宝共鸣：气血+20%' },
    5: { hp_percent: 0.20, spirit_percent: 0.20, desc: '法宝共鸣：气血+20% 灵力+20%' }
  },
  '剑': {
    3: { atk_percent: 0.20, crit_rate: 0.05, desc: '剑共鸣：攻击+20% 暴击+5%' },
    5: { atk_percent: 0.20, crit_rate: 0.10, skill_damage: 0.15, desc: '剑共鸣：攻击+20% 暴击+10% 技能伤害+15%' }
  },
  '斧': {
    3: { def_percent: 0.20, damage_reduce: 0.10, desc: '斧共鸣：防御+20% 减伤+10%' },
    5: { def_percent: 0.20, damage_reduce: 0.15, counter_damage: 0.20, desc: '斧共鸣：防御+20% 减伤+15% 反击+20%' }
  },
  '鼎': {
    3: { heal_effect: 0.20, cooldown_reduce: 0.15, desc: '鼎共鸣：治疗效果+20% CD-15%' },
    5: { heal_effect: 0.30, cooldown_reduce: 0.25, max_hp_percent: 0.10, desc: '鼎共鸣：治疗+30% CD-25% 气血上限+10%' }
  },
  '旗': {
    3: { atk_speed: 0.20, atk_percent: 0.10, desc: '旗共鸣：攻速+20% 攻击+10%' },
    5: { atk_speed: 0.30, atk_percent: 0.15, rage_gain: 0.30, desc: '旗共鸣：攻速+30% 攻击+15% 怒气获取+30%' }
  },
  '塔': {
    3: { def_percent: 0.15, cc_duration_reduce: 0.20, desc: '塔共鸣：防御+15% 控制减免+20%' },
    5: { def_percent: 0.20, cc_duration_reduce: 0.30, reflect: 0.15, desc: '塔共鸣：防御+20% 控制减免+30% 伤害反弹+15%' }
  }
};

// 炼制配方
const FORGE_RECIPES = {};
for (const [artifactId, cfg] of Object.entries(ARTIFACT_CONFIG)) {
  FORGE_RECIPES[artifactId] = {
    artifactId,
    name: cfg.name,
    quality: cfg.quality,
    fragmentType: `${artifactId}_fragment`,
    fragmentCount: cfg.forgeFragmentCount,
    lingshiCost: cfg.forgeLingshiCost
  };
}

function getArtifactById(id) {
  return ARTIFACT_CONFIG[id] || null;
}

function getArtifactList() {
  return Object.values(ARTIFACT_CONFIG);
}

function getArtifactTypes() {
  return ARTIFACT_TYPES.map(type => ({
    type,
    count: Object.values(ARTIFACT_CONFIG).filter(a => a.type === type).length,
    artifacts: Object.values(ARTIFACT_CONFIG).filter(a => a.type === type).map(a => ({
      id: a.id,
      name: a.name,
      quality: a.quality,
      qualityName: a.qualityName
    }))
  }));
}

function calcArtifactStats(artifactId, level) {
  const cfg = ARTIFACT_CONFIG[artifactId];
  if (!cfg) return null;
  
  const stats = { ...cfg.baseStats };
  const levelBonusMultiplier = (level - 1) * 1.0; // 每级恢复基数

  // 应用等级加成
  const atkBonus = levelBonusMultiplier * (stats.atk > 0 ? ARTIFACT_LEVEL_BONUS.atk : 0);
  const defBonus = levelBonusMultiplier * (stats.def > 0 ? ARTIFACT_LEVEL_BONUS.def : 0);
  const hpBonus = levelBonusMultiplier * (stats.hp > 0 ? ARTIFACT_LEVEL_BONUS.hp : 0);
  const spiritBonus = levelBonusMultiplier * (stats.spirit > 0 ? ARTIFACT_LEVEL_BONUS.spirit : 0);
  const allBonus = levelBonusMultiplier * (stats.all_attr_percent > 0 ? ARTIFACT_LEVEL_BONUS.all : 0);

  return {
    hp: Math.floor(stats.hp * (1 + levelBonusMultiplier * 0.08)),
    atk: Math.floor(stats.atk * (1 + levelBonusMultiplier * 0.08)),
    def: Math.floor(stats.def * (1 + levelBonusMultiplier * 0.08)),
    spirit: Math.floor(stats.spirit * (1 + levelBonusMultiplier * 0.08)),
    all_attr_percent: +(stats.all_attr_percent + levelBonusMultiplier * 0.02).toFixed(4)
  };
}

function calcResonance(playerArtifacts) {
  // 按类型分组
  const byType = {};
  for (const a of playerArtifacts) {
    const cfg = ARTIFACT_CONFIG[a.artifact_type];
    if (!cfg) continue;
    const type = cfg.resonanceType;
    if (!byType[type]) byType[type] = [];
    byType[type].push(a);
  }

  const activeResonances = [];
  const totalBonus = {};

  for (const [type, artifacts] of Object.entries(byType)) {
    const count = artifacts.length;
    const totalLevel = artifacts.reduce((sum, a) => sum + (a.level || 1), 0);
    const config = ARTIFACT_RESONANCE_CONFIG[type];
    
    if (!config) continue;

    for (const [threshold, effect] of Object.entries(config)) {
      if (totalLevel >= parseInt(threshold)) {
        activeResonances.push({
          type,
          threshold: parseInt(threshold),
          effect,
          desc: effect.desc
        });
        Object.assign(totalBonus, effect);
      }
    }
  }

  return { activeResonances, totalBonus };
}

module.exports = {
  ARTIFACT_CONFIG,
  ARTIFACT_TYPES,
  ARTIFACT_QUALITY_COLOR,
  ARTIFACT_EXP_TABLE,
  ARTIFACT_LEVEL_BONUS,
  ARTIFACT_RESONANCE_CONFIG,
  FORGE_RECIPES,
  getArtifactById,
  getArtifactList,
  getArtifactTypes,
  calcArtifactStats,
  calcResonance
};
