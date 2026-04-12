/**
 * 生活技能系统配置
 * 6种生活技能：炼丹、采矿、采药、狩猎、钓鱼、烹饪
 */

module.exports = {
  // 技能类型定义
  skillTypes: {
    alchemy: {
      name: '炼丹',
      icon: '⚗️',
      description: '炼制各类丹药，辅助修行',
      gatherSkill: null,
      gathers: null,
    },
    mining: {
      name: '采矿',
      icon: '⛏️',
      description: '采集矿石，锻造装备',
      gatherSkill: null,
      gathers: ['iron_ore', 'silver_ore', 'mithril_ore', 'gold_ore', 'spirit_ore'],
    },
    herbing: {
      name: '采药',
      icon: '🌿',
      description: '采集灵草，炼制丹药',
      gatherSkill: null,
      gathers: ['lingzhi', 'ginseng', 'he_shouwu', 'snow_lotus', 'moon_flower'],
    },
    hunting: {
      name: '狩猎',
      icon: '🏹',
      description: '猎取兽皮，制作装备',
      gatherSkill: null,
      gathers: ['beast_hide', 'spirit_beast_hide', 'demon_beast_hide', 'phoenix_feather', 'dragon_scale'],
    },
    fishing: {
      name: '钓鱼',
      icon: '🎣',
      description: '钓取鱼类，交易获利',
      gatherSkill: null,
      gathers: null, // uses fishing system
    },
    cooking: {
      name: '烹饪',
      icon: '🍳',
      description: '烹饪食物，恢复灵力',
      gatherSkill: null,
      gathers: null,
    },
  },

  // 品质等级
  qualityTiers: [
    { name: '普通', color: '#FFFFFF', multiplier: 1.0, label: 'white' },
    { name: '优秀', color: '#00FF00', multiplier: 1.3, label: 'green' },
    { name: '精良', color: '#0070FF', multiplier: 1.6, label: 'blue' },
    { name: '史诗', color: '#A335EE', multiplier: 2.0, label: 'purple' },
    { name: '传说', color: '#FF8000', multiplier: 2.5, label: 'orange' },
  ],

  // 最大等级
  maxLevel: 30,

  // 升级所需经验公式
  expForLevel: (level) => level * 100,

  // 活力值配置
  vitality: {
    maxBase: 100,
    recoveryPerHour: 10,
    costPerAction: {
      alchemy: 15,
      mining: 8,
      herbing: 6,
      hunting: 10,
      cooking: 12,
    },
  },

  // 采集产物配置
  gatherItems: {
    // 矿石
    iron_ore: {
      name: '玄铁矿石',
      icon: '�ite',
      quality: 'white',
      baseExp: 10,
      baseYield: [1, 2],
      sellPrice: 5,
      minSkillLevel: 1,
    },
    silver_ore: {
      name: '秘银矿石',
      icon: '�ite',
      quality: 'green',
      baseExp: 15,
      baseYield: [1, 1],
      sellPrice: 15,
      minSkillLevel: 5,
    },
    mithril_ore: {
      name: '精金矿石',
      icon: '💎',
      quality: 'blue',
      baseExp: 25,
      baseYield: [1, 1],
      sellPrice: 40,
      minSkillLevel: 10,
    },
    gold_ore: {
      name: '灵金矿石',
      icon: '🏅',
      quality: 'purple',
      baseExp: 40,
      baseYield: [1, 1],
      sellPrice: 100,
      minSkillLevel: 15,
    },
    spirit_ore: {
      name: '魂晶矿石',
      icon: '🔮',
      quality: 'orange',
      baseExp: 60,
      baseYield: [1, 1],
      sellPrice: 300,
      minSkillLevel: 20,
    },
    // 草药
    lingzhi: {
      name: '灵芝',
      icon: '🍄',
      quality: 'white',
      baseExp: 8,
      baseYield: [1, 3],
      sellPrice: 8,
      minSkillLevel: 1,
    },
    ginseng: {
      name: '人参',
      icon: '🥕',
      quality: 'green',
      baseExp: 12,
      baseYield: [1, 2],
      sellPrice: 20,
      minSkillLevel: 5,
    },
    he_shouwu: {
      name: '何首乌',
      icon: '🌱',
      quality: 'blue',
      baseExp: 20,
      baseYield: [1, 1],
      sellPrice: 50,
      minSkillLevel: 10,
    },
    snow_lotus: {
      name: '雪莲',
      icon: '❄️',
      quality: 'purple',
      baseExp: 35,
      baseYield: [1, 1],
      sellPrice: 120,
      minSkillLevel: 15,
    },
    moon_flower: {
      name: '月华花',
      icon: '🌸',
      quality: 'orange',
      baseExp: 55,
      baseYield: [1, 1],
      sellPrice: 350,
      minSkillLevel: 20,
    },
    // 兽皮
    beast_hide: {
      name: '妖兽皮',
      icon: '🧥',
      quality: 'white',
      baseExp: 10,
      baseYield: [1, 2],
      sellPrice: 10,
      minSkillLevel: 1,
    },
    spirit_beast_hide: {
      name: '灵兽皮',
      icon: '🦌',
      quality: 'green',
      baseExp: 18,
      baseYield: [1, 1],
      sellPrice: 30,
      minSkillLevel: 8,
    },
    demon_beast_hide: {
      name: '魔兽皮',
      icon: '🐉',
      quality: 'blue',
      baseExp: 30,
      baseYield: [1, 1],
      sellPrice: 80,
      minSkillLevel: 12,
    },
    phoenix_feather: {
      name: '凤凰羽',
      icon: '🪶',
      quality: 'purple',
      baseExp: 50,
      baseYield: [1, 1],
      sellPrice: 200,
      minSkillLevel: 18,
    },
    dragon_scale: {
      name: '龙鳞',
      icon: '🐲',
      quality: 'orange',
      baseExp: 80,
      baseYield: [1, 1],
      sellPrice: 500,
      minSkillLevel: 22,
    },
  },

  // 炼丹产物
  alchemyProducts: {
    zhu_shi_dan: {
      name: '筑基丹',
      icon: '💊',
      quality: 'green',
      baseExp: 30,
      ingredients: [
        { item: 'lingzhi', count: 3 },
        { item: 'ginseng', count: 2 },
      ],
      sellPrice: 100,
      minSkillLevel: 1,
      description: '辅助筑基，增加筑基成功率',
    },
    po_jing_dan: {
      name: '破境丹',
      icon: '💎',
      quality: 'blue',
      baseExp: 50,
      ingredients: [
        { item: 'he_shouwu', count: 3 },
        { item: 'snow_lotus', count: 1 },
      ],
      sellPrice: 300,
      minSkillLevel: 10,
      description: '增加突破境界的成功率',
    },
    fu_huo_dan: {
      name: '复活丹',
      icon: '🌟',
      quality: 'purple',
      baseExp: 80,
      ingredients: [
        { item: 'moon_flower', count: 2 },
        { item: 'ginseng', count: 3 },
      ],
      sellPrice: 800,
      minSkillLevel: 18,
      description: '死亡后可原地复活',
    },
    bu_ling_dan: {
      name: '补灵丹',
      icon: '💚',
      quality: 'white',
      baseExp: 15,
      ingredients: [
        { item: 'lingzhi', count: 2 },
      ],
      sellPrice: 30,
      minSkillLevel: 1,
      description: '恢复大量灵力',
    },
    hui_chun_dan: {
      name: '回春丹',
      icon: '💖',
      quality: 'green',
      baseExp: 25,
      ingredients: [
        { item: 'lingzhi', count: 2 },
        { item: 'ginseng', count: 1 },
      ],
      sellPrice: 80,
      minSkillLevel: 5,
      description: '恢复生命值',
    },
  },

  // 烹饪产物
  cookingProducts: {
    ling_man_tou: {
      name: '灵馒头',
      icon: '🥟',
      quality: 'white',
      baseExp: 8,
      ingredients: [
        { type: 'gather', item: 'ginseng', count: 1 },
      ],
      sellPrice: 15,
      minSkillLevel: 1,
      description: '恢复少量灵力',
    },
    xian_tao_su: {
      name: '仙桃酥',
      icon: '🍑',
      quality: 'green',
      baseExp: 15,
      ingredients: [
        { type: 'gather', item: 'lingzhi', count: 2 },
      ],
      sellPrice: 40,
      minSkillLevel: 3,
      description: '恢复中量灵力',
    },
    long_jing_cha: {
      name: '龙井茶',
      icon: '🍵',
      quality: 'blue',
      baseExp: 25,
      ingredients: [
        { type: 'gather', item: 'snow_lotus', count: 1 },
      ],
      sellPrice: 100,
      minSkillLevel: 8,
      description: '恢复灵力并获得临时增益',
    },
    yun_bao_fan: {
      name: '孕灵饭',
      icon: '🍚',
      quality: 'purple',
      baseExp: 45,
      ingredients: [
        { type: 'gather', item: 'moon_flower', count: 1 },
        { type: 'gather', item: 'ginseng', count: 2 },
      ],
      sellPrice: 300,
      minSkillLevel: 15,
      description: '大幅恢复灵力并增加修为',
    },
    shou_bao_mian: {
      name: '寿包面',
      icon: '🥮',
      quality: 'orange',
      baseExp: 70,
      ingredients: [
        { type: 'gather', item: 'lingzhi', count: 3 },
        { type: 'gather', item: 'he_shouwu', count: 2 },
      ],
      sellPrice: 600,
      minSkillLevel: 20,
      description: '全属性大幅恢复',
    },
  },

  // 品质计算：技能等级越高，获得高品质概率越高
  qualityChance: (skillLevel) => ({
    white: Math.max(0.1, 0.8 - skillLevel * 0.025),
    green: Math.max(0.05, 0.15 + skillLevel * 0.01),
    blue: Math.min(0.4, 0.04 + skillLevel * 0.015),
    purple: Math.min(0.25, skillLevel * 0.01),
    orange: Math.min(0.08, skillLevel * 0.003),
  }),

  // 采集耗时（秒）
  gatherTime: {
    mining: 5,
    herbing: 4,
    hunting: 6,
  },
};
