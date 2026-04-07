/**
 * 挂机修仙 - 称号系统
 * 包含：称号类型定义、称号属性加成、称号获取条件
 */

// ==================== 称号类型枚举 ====================
const TitleType = {
  /** 修炼境界称号 */
  REALM: 'realm',
  /** 爵位成就称号 */
  RANK: 'rank',
  /** 副本通关称号 */
  DUNGEON: 'dungeon',
  /** 竞技场称号 */
  ARENA: 'arena',
  /** 宗门称号 */
  SECT: 'sect',
  /** 活动限时称号 */
  EVENT: 'event',
  /** 累积成就称号 */
  ACHIEVEMENT: 'achievement',
  /** 段位称号 */
  LADDER: 'ladder',
  /** 特殊称号 */
  SPECIAL: 'special',
  /** 收藏称号 */
  COLLECTION: 'collection'
};

// ==================== 称号稀有度 ====================
const TitleRarity = {
  COMMON: { id: 0, name: '普通', color: '#888888', multiplier: 1.0 },
  UNCOMMON: { id: 1, name: '优秀', color: '#1EFF00', multiplier: 1.2 },
  RARE: { id: 2, name: '稀有', color: '#0070DD', multiplier: 1.5 },
  EPIC: { id: 3, name: '史诗', color: '#A335EE', multiplier: 2.0 },
  LEGENDARY: { id: 4, name: '传说', color: '#FF8000', multiplier: 3.0 },
  MYTHIC: { id: 5, name: '神话', color: '#FF0000', multiplier: 5.0 }
};

// ==================== 称号属性类型 ====================
const TitleAttributeType = {
  /** 攻击力 */
  ATK: 'atk',
  /** 防御力 */
  DEF: 'def',
  /** 生命值 */
  HP: 'hp',
  /** 暴击率 */
  CRIT: 'crit',
  /** 闪避率 */
  DODGE: 'dodge',
  /** 灵根倍率 */
  SPIRIT_RATE: 'spiritRate',
  /** 修炼效率 */
  CULTIVATION_EFFICIENCY: 'cultivationEfficiency',
  /** 掉落倍率 */
  DROP_RATE: 'dropRate',
  /** 灵石倍率 */
  SPIRIT_STONE_RATE: 'spiritStoneRate',
  /** 伤害倍率 */
  DAMAGE_RATE: 'damageRate',
  /** 免伤率 */
  DAMAGE_REDUCTION: 'damageReduction',
  /** 生命恢复 */
  HP_REGEN: 'hpRegen',
  /** 灵力恢复 */
  SPIRIT_REGEN: 'spiritRegen',
  /** 经验倍率 */
  EXP_RATE: 'expRate',
  /** 宠物战力加成 */
  BEAST_POWER: 'beastPower',
  /** 装备强化成功率 */
  ENCHANT_RATE: 'enchantRate',
  /** 悟道加成 */
  COMPREHENSION: 'comprehension'
};

// ==================== 称号数据定义 ====================
const TITLE_DATA = {
  // ==================== 境界称号 ====================
  'realm_1': {
    id: 'realm_1',
    type: TitleType.REALM,
    name: '练气修士',
    rarity: TitleRarity.COMMON,
    requiredRealm: 1,
    attributes: {
      [TitleAttributeType.ATK]: 5,
      [TitleAttributeType.DEF]: 2,
      [TitleAttributeType.HP]: 20
    },
    description: '初步踏入修仙之路的练气修士',
    icon: 'realm_1'
  },
  'realm_2': {
    id: 'realm_2',
    type: TitleType.REALM,
    name: '筑基真人',
    rarity: TitleRarity.UNCOMMON,
    requiredRealm: 2,
    attributes: {
      [TitleAttributeType.ATK]: 15,
      [TitleAttributeType.DEF]: 8,
      [TitleAttributeType.HP]: 60,
      [TitleAttributeType.CRIT]: 1
    },
    description: '筑就仙基，灵气化液的筑基真人',
    icon: 'realm_2'
  },
  'realm_3': {
    id: 'realm_3',
    type: TitleType.REALM,
    name: '金丹宗师',
    rarity: TitleRarity.RARE,
    requiredRealm: 3,
    attributes: {
      [TitleAttributeType.ATK]: 35,
      [TitleAttributeType.DEF]: 20,
      [TitleAttributeType.HP]: 150,
      [TitleAttributeType.CRIT]: 3,
      [TitleAttributeType.DODGE]: 1
    },
    description: '灵气凝结成丹的金丹宗师',
    icon: 'realm_3'
  },
  'realm_4': {
    id: 'realm_4',
    type: TitleType.REALM,
    name: '元婴老怪',
    rarity: TitleRarity.EPIC,
    requiredRealm: 4,
    attributes: {
      [TitleAttributeType.ATK]: 70,
      [TitleAttributeType.DEF]: 40,
      [TitleAttributeType.HP]: 300,
      [TitleAttributeType.CRIT]: 5,
      [TitleAttributeType.DODGE]: 3,
      [TitleAttributeType.SPIRIT_RATE]: 0.1
    },
    description: '金丹化婴，神通广大的元婴老怪',
    icon: 'realm_4'
  },
  'realm_5': {
    id: 'realm_5',
    type: TitleType.REALM,
    name: '化神真君',
    rarity: TitleRarity.LEGENDARY,
    requiredRealm: 5,
    attributes: {
      [TitleAttributeType.ATK]: 120,
      [TitleAttributeType.DEF]: 70,
      [TitleAttributeType.HP]: 500,
      [TitleAttributeType.CRIT]: 8,
      [TitleAttributeType.DODGE]: 5,
      [TitleAttributeType.SPIRIT_RATE]: 0.15,
      [TitleAttributeType.DAMAGE_RATE]: 0.1
    },
    description: '神魂化神，返璞归真的化神真君',
    icon: 'realm_5'
  },
  'realm_6': {
    id: 'realm_6',
    type: TitleType.REALM,
    name: '渡劫大能',
    rarity: TitleRarity.MYTHIC,
    requiredRealm: 6,
    attributes: {
      [TitleAttributeType.ATK]: 200,
      [TitleAttributeType.DEF]: 120,
      [TitleAttributeType.HP]: 800,
      [TitleAttributeType.CRIT]: 12,
      [TitleAttributeType.DODGE]: 8,
      [TitleAttributeType.SPIRIT_RATE]: 0.2,
      [TitleAttributeType.DAMAGE_RATE]: 0.15,
      [TitleAttributeType.DROP_RATE]: 0.1
    },
    description: '承受天劫，寻求飞升的渡劫大能',
    icon: 'realm_6'
  },

  // ==================== 爵位称号 ====================
  'rank_duke': {
    id: 'rank_duke',
    type: TitleType.RANK,
    name: '逍遥侯',
    rarity: TitleRarity.RARE,
    requiredRank: 5,
    attributes: {
      [TitleAttributeType.ATK]: 50,
      [TitleAttributeType.DEF]: 30,
      [TitleAttributeType.HP]: 200,
      [TitleAttributeType.SPIRIT_STONE_RATE]: 0.1
    },
    description: '拥有侯爵爵位的修仙者',
    icon: 'rank_duke'
  },
  'rank_prince': {
    id: 'rank_prince',
    type: TitleType.RANK,
    name: '镇国王',
    rarity: TitleRarity.LEGENDARY,
    requiredRank: 8,
    attributes: {
      [TitleAttributeType.ATK]: 150,
      [TitleAttributeType.DEF]: 100,
      [TitleAttributeType.HP]: 600,
      [TitleAttributeType.SPIRIT_STONE_RATE]: 0.2,
      [TitleAttributeType.DROP_RATE]: 0.1
    },
    description: '拥有王爵爵位的修仙者',
    icon: 'rank_prince'
  },

  // ==================== 副本称号 ====================
  'dungeon_first_kill': {
    id: 'dungeon_first_kill',
    type: TitleType.DUNGEON,
    name: '首杀得主',
    rarity: TitleRarity.UNCOMMON,
    requiredDungeons: 1,
    attributes: {
      [TitleAttributeType.ATK]: 10,
      [TitleAttributeType.DAMAGE_RATE]: 0.05
    },
    description: '首次通关副本的修仙者',
    icon: 'dungeon_first_kill'
  },
  'dungeon_master': {
    id: 'dungeon_master',
    type: TitleType.DUNGEON,
    name: '副本大师',
    rarity: TitleRarity.EPIC,
    requiredDungeons: 50,
    attributes: {
      [TitleAttributeType.ATK]: 50,
      [TitleAttributeType.DEF]: 30,
      [TitleAttributeType.DAMAGE_RATE]: 0.15,
      [TitleAttributeType.DROP_RATE]: 0.1
    },
    description: '通关50个不同副本的修仙者',
    icon: 'dungeon_master'
  },
  'dungeon_legend': {
    id: 'dungeon_legend',
    type: TitleType.DUNGEON,
    name: '副本传奇',
    rarity: TitleRarity.LEGENDARY,
    requiredDungeons: 100,
    attributes: {
      [TitleAttributeType.ATK]: 100,
      [TitleAttributeType.DEF]: 60,
      [TitleAttributeType.DAMAGE_RATE]: 0.2,
      [TitleAttributeType.DROP_RATE]: 0.15,
      [TitleAttributeType.EXP_RATE]: 0.1
    },
    description: '通关100个不同副本的传奇修仙者',
    icon: 'dungeon_legend'
  },

  // ==================== 竞技场称号 ====================
  'arena_winner': {
    id: 'arena_winner',
    type: TitleType.ARENA,
    name: '竞技王者',
    rarity: TitleRarity.EPIC,
    requiredArenaWins: 100,
    attributes: {
      [TitleAttributeType.ATK]: 80,
      [TitleAttributeType.CRIT]: 5,
      [TitleAttributeType.DAMAGE_RATE]: 0.15
    },
    description: '在竞技场中获得100场胜利',
    icon: 'arena_winner'
  },
  'arena_legend': {
    id: 'arena_legend',
    type: TitleType.ARENA,
    name: '不败神话',
    rarity: TitleRarity.LEGENDARY,
    requiredArenaRank: 1,
    attributes: {
      [TitleAttributeType.ATK]: 150,
      [TitleAttributeType.CRIT]: 10,
      [TitleAttributeType.DAMAGE_RATE]: 0.2,
      [TitleAttributeType.DAMAGE_REDUCTION]: 0.1
    },
    description: '登顶竞技场排名第一',
    icon: 'arena_legend'
  },

  // ==================== 活动称号 ====================
  'event_new_year': {
    id: 'event_new_year',
    type: TitleType.EVENT,
    name: '迎春仙使',
    rarity: TitleRarity.RARE,
    isLimited: true,
    validPeriod: 30, // 天数
    attributes: {
      [TitleAttributeType.ATK]: 30,
      [TitleAttributeType.DROP_RATE]: 0.1,
      [TitleAttributeType.SPIRIT_STONE_RATE]: 0.1
    },
    description: '新年活动的纪念称号',
    icon: 'event_new_year'
  },
  'event_anniversary': {
    id: 'event_anniversary',
    type: TitleType.EVENT,
    name: '周年庆典使',
    rarity: TitleRarity.LEGENDARY,
    isLimited: true,
    validPeriod: 14,
    attributes: {
      [TitleAttributeType.ATK]: 100,
      [TitleAttributeType.DEF]: 50,
      [TitleAttributeType.HP]: 300,
      [TitleAttributeType.EXP_RATE]: 0.2,
      [TitleAttributeType.DROP_RATE]: 0.15
    },
    description: '周年庆典活动的纪念称号',
    icon: 'event_anniversary'
  },

  // ==================== 成就称号 ====================
  'achievement_rich': {
    id: 'achievement_rich',
    type: TitleType.ACHIEVEMENT,
    name: '富甲一方',
    rarity: TitleRarity.EPIC,
    requiredAchievement: 'rich_1m',
    attributes: {
      [TitleAttributeType.SPIRIT_STONE_RATE]: 0.2,
      [TitleAttributeType.DROP_RATE]: 0.1
    },
    description: '累计拥有100万灵石',
    icon: 'achievement_rich'
  },
  'achievement_collector': {
    id: 'achievement_collector',
    type: TitleType.ACHIEVEMENT,
    name: '收藏大家',
    rarity: TitleRarity.LEGENDARY,
    requiredAchievement: 'collector_100',
    attributes: {
      [TitleAttributeType.DROP_RATE]: 0.15,
      [TitleAttributeType.ENCHANT_RATE]: 0.1
    },
    description: '收集100件不同藏品',
    icon: 'achievement_collector'
  },

  // ==================== 特殊称号 ====================
  'special_beta_tester': {
    id: 'special_beta_tester',
    type: TitleType.SPECIAL,
    name: '创世先驱',
    rarity: TitleRarity.MYTHIC,
    isPermanent: true,
    attributes: {
      [TitleAttributeType.ATK]: 200,
      [TitleAttributeType.DEF]: 150,
      [TitleAttributeType.HP]: 1000,
      [TitleAttributeType.CRIT]: 10,
      [TitleAttributeType.DODGE]: 10,
      [TitleAttributeType.DAMAGE_RATE]: 0.2,
      [TitleAttributeType.DROP_RATE]: 0.2,
      [TitleAttributeType.EXP_RATE]: 0.2
    },
    description: '参与游戏测试的先驱者专属称号',
    icon: 'special_beta'
  },
  'special_vip': {
    id: 'special_vip',
    type: TitleType.SPECIAL,
    name: '仙道至尊',
    rarity: TitleRarity.MYTHIC,
    isPermanent: true,
    requiredVipLevel: 15,
    attributes: {
      [TitleAttributeType.ATK]: 300,
      [TitleAttributeType.DEF]: 200,
      [TitleAttributeType.HP]: 1500,
      [TitleAttributeType.CRIT]: 15,
      [TitleAttributeType.DODGE]: 15,
      [TitleAttributeType.DAMAGE_RATE]: 0.25,
      [TitleAttributeType.DROP_RATE]: 0.25,
      [TitleAttributeType.EXP_RATE]: 0.25,
      [TitleAttributeType.SPIRIT_STONE_RATE]: 0.3
    },
    description: 'VIP15以上专属的至尊称号',
    icon: 'special_vip'
  },
  'special_founder': {
    id: 'special_founder',
    type: TitleType.SPECIAL,
    name: '开派祖师',
    rarity: TitleRarity.MYTHIC,
    isPermanent: true,
    attributes: {
      [TitleAttributeType.ATK]: 250,
      [TitleAttributeType.DEF]: 180,
      [TitleAttributeType.HP]: 1200,
      [TitleAttributeType.CRIT]: 12,
      [TitleAttributeType.DODGE]: 12,
      [TitleAttributeType.SPIRIT_RATE]: 0.15,
      [TitleAttributeType.COMPREHENSION]: 0.2
    },
    description: '创建宗门的修仙者专属称号',
    icon: 'special_founder'
  }
};

// ==================== 称号系统核心类 ====================
class TitleSystem {
  constructor() {
    this.titleData = TITLE_DATA;
    this.titleType = TitleType;
    this.titleRarity = TitleRarity;
    this.attributeType = TitleAttributeType;
  }

  /**
   * 获取所有称号数据
   * @returns {Object} 称号数据对象
   */
  getAllTitles() {
    return this.titleData;
  }

  /**
   * 根据ID获取称号
   * @param {string} titleId - 称号ID
   * @returns {Object|null} 称号数据
   */
  getTitleById(titleId) {
    return this.titleData[titleId] || null;
  }

  /**
   * 根据类型获取称号列表
   * @param {string} type - 称号类型
   * @returns {Array} 称号列表
   */
  getTitlesByType(type) {
    return Object.values(this.titleData).filter(title => title.type === type);
  }

  /**
   * 根据稀有度获取称号列表
   * @param {string} rarity - 稀有度
   * @returns {Array} 称号列表
   */
  getTitlesByRarity(rarity) {
    return Object.values(this.titleData).filter(title => title.rarity === rarity);
  }

  /**
   * 计算称号属性加成
   * @param {Array} titles - 已装备的称号列表
   * @returns {Object} 总属性加成
   */
  calculateTitleBonus(titles) {
    const totalBonus = {};

    for (const titleId of titles) {
      const title = this.getTitleById(titleId);
      if (!title || !title.attributes) continue;

      const multiplier = title.rarity.multiplier;

      for (const [attr, value] of Object.entries(title.attributes)) {
        if (!totalBonus[attr]) {
          totalBonus[attr] = 0;
        }
        // 应用稀有度倍率
        totalBonus[attr] += value * multiplier;
      }
    }

    return totalBonus;
  }

  /**
   * 检查是否符合称号获取条件
   * @param {string} titleId - 称号ID
   * @param {Object} playerData - 玩家数据
   * @returns {boolean} 是否满足条件
   */
  checkTitleCondition(titleId, playerData) {
    const title = this.getTitleById(titleId);
    if (!title) return false;

    switch (title.type) {
      case TitleType.REALM:
        return playerData.realm >= title.requiredRealm;

      case TitleType.RANK:
        return playerData.rank >= title.requiredRank;

      case TitleType.DUNGEON:
        return (playerData.dungeonsCompleted || 0) >= title.requiredDungeons;

      case TitleType.ARENA:
        if (title.requiredArenaRank) {
          return playerData.arenaRank === title.requiredArenaRank;
        }
        return (playerData.arenaWins || 0) >= title.requiredArenaWins;

      case TitleType.SPECIAL:
        if (title.requiredVipLevel) {
          return playerData.vipLevel >= title.requiredVipLevel;
        }
        return true;

      case TitleType.ACHIEVEMENT:
        return playerData.achievements?.includes(title.requiredAchievement);

      default:
        return false;
    }
  }

  /**
   * 获取称号显示信息
   * @param {string} titleId - 称号ID
   * @returns {Object} 显示信息
   */
  getTitleDisplayInfo(titleId) {
    const title = this.getTitleById(titleId);
    if (!title) return null;

    return {
      name: title.name,
      rarity: title.rarity.name,
      color: title.rarity.color,
      description: title.description,
      type: title.type,
      attributes: title.attributes,
      icon: title.icon,
      isLimited: title.isLimited || false,
      isPermanent: title.isPermanent || false,
      validPeriod: title.validPeriod || null
    };
  }

  /**
   * 获取玩家可获取的称号列表
   * @param {Object} playerData - 玩家数据
   * @returns {Array} 可获取的称号列表
   */
  getAvailableTitles(playerData) {
    const available = [];

    for (const titleId of Object.keys(this.titleData)) {
      if (this.checkTitleCondition(titleId, playerData)) {
        available.push(titleId);
      }
    }

    return available;
  }

  /**
   * 创建称号实例（玩家获得的称号）
   * @param {string} titleId - 称号ID
   * @param {number} obtainTime - 获取时间戳
   * @returns {Object} 称号实例
   */
  createTitleInstance(titleId, obtainTime = Date.now()) {
    const title = this.getTitleById(titleId);
    if (!title) return null;

    return {
      id: titleId,
      name: title.name,
      rarity: title.rarity,
      attributes: { ...title.attributes },
      obtainTime,
      isEquipped: false,
      isLimited: title.isLimited || false,
      validPeriod: title.validPeriod || null,
      expireTime: title.isLimited && title.validPeriod
        ? obtainTime + title.validPeriod * 24 * 60 * 60 * 1000
        : null
    };
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TitleSystem,
    TitleType,
    TitleRarity,
    TitleAttributeType,
    TITLE_DATA
  };
}
