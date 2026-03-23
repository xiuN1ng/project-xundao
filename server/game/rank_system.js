/**
 * 挂机修仙 - 爵位/段位系统
 * 包含：爵位等级定义、晋升条件、属性加成、每日奖励
 */

// ==================== 爵位等级体系 ====================
const RANK_DATA = {
  // 凡人 → 练气 → 筑基 → 金丹 → 元婴 → 化神 → 渡劫 → 仙人 → 天仙 → 金仙 → 大罗金仙 → 准圣 → 圣人 → 天道
  0: {
    id: 0,
    name: '凡人',
    title: '凡夫俗子',
    requiredHonor: 0,
    honorGainRate: 1.0,
    bonus: { atk: 0, def: 0, hp: 0, crit: 0, dodge: 0, spiritRate: 0 },
    dailyReward: { spiritStones: 0 },
    description: '尚未踏入修仙之路的凡人'
  },
  1: {
    id: 1,
    name: '练气',
    title: '练气修士',
    requiredHonor: 100,
    honorGainRate: 1.1,
    bonus: { atk: 5, def: 2, hp: 20, crit: 0, dodge: 0, spiritRate: 0.05 },
    dailyReward: { spiritStones: 50 },
    description: '初步感应天地灵气，开始修炼'
  },
  2: {
    id: 2,
    name: '筑基',
    title: '筑基真人',
    requiredHonor: 500,
    honorGainRate: 1.2,
    bonus: { atk: 15, def: 8, hp: 60, crit: 1, dodge: 0, spiritRate: 0.1 },
    dailyReward: { spiritStones: 150 },
    description: '灵气化液，筑就仙基'
  },
  3: {
    id: 3,
    name: '金丹',
    title: '金丹宗师',
    requiredHonor: 2000,
    honorGainRate: 1.3,
    bonus: { atk: 35, def: 20, hp: 150, crit: 3, dodge: 1, spiritRate: 0.15 },
    dailyReward: { spiritStones: 400 },
    description: '灵气凝结成丹，修为大增'
  },
  4: {
    id: 4,
    name: '元婴',
    title: '元婴老怪',
    requiredHonor: 8000,
    honorGainRate: 1.4,
    bonus: { atk: 70, def: 40, hp: 300, crit: 5, dodge: 3, spiritRate: 0.2 },
    dailyReward: { spiritStones: 1000 },
    description: '金丹化婴，神通广大'
  },
  5: {
    id: 5,
    name: '化神',
    title: '化神真君',
    requiredHonor: 25000,
    honorGainRate: 1.5,
    bonus: { atk: 120, def: 70, hp: 500, crit: 8, dodge: 5, spiritRate: 0.25 },
    dailyReward: { spiritStones: 2500 },
    description: '神魂化神，返璞归真'
  },
  6: {
    id: 6,
    name: '渡劫',
    title: '渡劫大能',
    requiredHonor: 80000,
    honorGainRate: 1.6,
    bonus: { atk: 200, def: 120, hp: 800, crit: 12, dodge: 8, spiritRate: 0.3 },
    dailyReward: { spiritStones: 6000 },
    description: '承受天劫，寻求飞升'
  },
  7: {
    id: 7,
    name: '仙人',
    title: '逍遥仙人',
    requiredHonor: 200000,
    honorGainRate: 1.7,
    bonus: { atk: 350, def: 200, hp: 1200, crit: 18, dodge: 12, spiritRate: 0.35 },
    dailyReward: { spiritStones: 15000 },
    description: '渡过天劫，飞升仙界'
  },
  8: {
    id: 8,
    name: '天仙',
    title: '太乙天仙',
    requiredHonor: 500000,
    honorGainRate: 1.8,
    bonus: { atk: 500, def: 300, hp: 1800, crit: 25, dodge: 18, spiritRate: 0.4 },
    dailyReward: { spiritStones: 35000 },
    description: '天界仙人，神通广大'
  },
  9: {
    id: 9,
    name: '金仙',
    title: '大罗金仙',
    requiredHonor: 1200000,
    honorGainRate: 1.9,
    bonus: { atk: 750, def: 450, hp: 2500, crit: 35, dodge: 25, spiritRate: 0.45 },
    dailyReward: { spiritStones: 80000 },
    description: '金身不坏，与天同寿'
  },
  10: {
    id: 10,
    name: '大罗金仙',
    title: '混元大罗金仙',
    requiredHonor: 3000000,
    honorGainRate: 2.0,
    bonus: { atk: 1000, def: 600, hp: 3500, crit: 50, dodge: 35, spiritRate: 0.5 },
    dailyReward: { spiritStones: 150000 },
    description: '跳出三界外，不在五行中'
  },
  11: {
    id: 11,
    name: '准圣',
    title: '准圣之尊',
    requiredHonor: 8000000,
    honorGainRate: 2.2,
    bonus: { atk: 1500, def: 900, hp: 5000, crit: 70, dodge: 50, spiritRate: 0.6 },
    dailyReward: { spiritStones: 300000 },
    description: '仅次于圣人的存在'
  },
  12: {
    id: 12,
    name: '圣人',
    title: '混元圣人',
    requiredHonor: 20000000,
    honorGainRate: 2.5,
    bonus: { atk: 2500, def: 1500, hp: 8000, crit: 100, dodge: 70, spiritRate: 0.7 },
    dailyReward: { spiritStones: 600000 },
    description: '与道合真，万劫不灭'
  },
  13: {
    id: 13,
    name: '天道',
    title: '天道化身',
    requiredHonor: 50000000,
    honorGainRate: 3.0,
    bonus: { atk: 5000, def: 3000, hp: 15000, crit: 150, dodge: 100, spiritRate: 1.0 },
    dailyReward: { spiritStones: 1000000 },
    description: '化身天道，主宰万界'
  }
};

// ==================== 晋升条件类型 ====================
const PROMOTE_CONDITIONS = {
  honor: { type: 'honor', name: '荣誉值', description: '累计获得足够的荣誉值' },
  win: { type: 'win', name: '战斗胜利', description: '在挑战中获胜' },
  dungeon: { type: 'dungeon', name: '副本通关', description: '通关指定难度副本' },
  realm: { type: 'realm', name: '境界突破', description: '突破到指定境界' },
  level: { type: 'level', name: '修炼等级', description: '达到指定修炼等级' }
};

// ==================== 荣誉值获取来源 ====================
const HONOR_SOURCES = {
  // 战斗胜利
  combat_win: { base: 10, description: '战斗胜利', scale: 1.0 },
  worldboss_kill: { base: 100, description: '世界BOSS击杀', scale: 1.5 },
  dungeon_clear: { base: 20, description: '副本通关', scale: 1.2 },
  
  // 修炼相关
  realm_break: { base: 50, description: '境界突破', scale: 1.0 },
  level_up: { base: 5, description: '升级', scale: 1.0 },
  
  // 社交相关
  sect_contribute: { base: 5, description: '宗门贡献', scale: 1.0 },
  friend_help: { base: 3, description: '协助好友', scale: 1.0 },
  
  // 活动相关
  daily_login: { base: 5, description: '每日登录', scale: 1.0 },
  activity_complete: { base: 15, description: '活动完成', scale: 1.0 },
  
  // 成就相关
  achievement_complete: { base: 25, description: '成就完成', scale: 1.0 }
};

// ==================== 玩家爵位数据 ====================
class RankSystem {
  constructor() {
    this.ranks = RANK_DATA;
    this.honorSources = HONOR_SOURCES;
  }

  // 获取所有爵位信息
  getAllRanks() {
    return Object.values(this.ranks).map(rank => ({
      id: rank.id,
      name: rank.name,
      title: rank.title,
      requiredHonor: rank.requiredHonor,
      bonus: rank.bonus,
      dailyReward: rank.dailyReward,
      description: rank.description
    }));
  }

  // 获取单个爵位信息
  getRank(rankId) {
    return this.ranks[rankId] || null;
  }

  // 获取爵位名称
  getRankName(rankId) {
    const rank = this.ranks[rankId];
    return rank ? rank.name : '未知';
  }

  // 获取爵位称号
  getRankTitle(rankId) {
    const rank = this.ranks[rankId];
    return rank ? rank.title : '无';
  }

  // 获取当前爵位属性加成
  getRankBonus(rankId) {
    const rank = this.ranks[rankId];
    return rank ? rank.bonus : this.ranks[0].bonus;
  }

  // 获取每日奖励
  getDailyReward(rankId) {
    const rank = this.ranks[rankId];
    return rank ? rank.dailyReward : { spiritStones: 0 };
  }

  // 检查是否可以晋升
  canPromote(currentRankId, playerData) {
    const nextRankId = currentRankId + 1;
    const nextRank = this.ranks[nextRankId];
    
    if (!nextRank) {
      return { canPromote: false, reason: '已达最高爵位' };
    }

    const honor = playerData.honor || 0;
    if (honor < nextRank.requiredHonor) {
      return { 
        canPromote: false, 
        reason: `需要${nextRank.requiredHonor}荣誉值，当前${honor}`,
        required: nextRank.requiredHonor,
        current: honor
      };
    }

    return { canPromote: true, nextRank: nextRank };
  }

  // 计算荣誉值获取（考虑爵位加成）
  calculateHonorGain(baseHonor, rankId) {
    const rank = this.ranks[rankId];
    const rate = rank ? rank.honorGainRate : 1.0;
    return Math.floor(baseHonor * rate);
  }

  // 添加荣誉值
  addHonor(playerData, source, additionalScale = 1.0) {
    const sourceConfig = this.honorSources[source];
    if (!sourceConfig) return 0;

    const rankId = playerData.rank || 0;
    const baseHonor = sourceConfig.base;
    const scale = sourceConfig.scale * additionalScale;
    
    const gainedHonor = this.calculateHonorGain(Math.floor(baseHonor * scale), rankId);
    
    playerData.honor = (playerData.honor || 0) + gainedHonor;
    
    return gainedHonor;
  }

  // 晋升处理
  promote(playerData) {
    const currentRankId = playerData.rank || 0;
    const checkResult = this.canPromote(currentRankId, playerData);
    
    if (!checkResult.canPromote) {
      return { success: false, message: checkResult.reason };
    }

    const nextRank = checkResult.nextRank;
    const honorCost = nextRank.requiredHonor;
    
    if (playerData.honor < honorCost) {
      return { success: false, message: '荣誉值不足' };
    }

    // 扣除荣誉值并晋升
    playerData.honor -= honorCost;
    playerData.rank = nextRank.id;
    playerData.rankTitle = nextRank.title;
    
    // 记录晋升历史
    if (!playerData.rankHistory) {
      playerData.rankHistory = [];
    }
    playerData.rankHistory.push({
      rankId: nextRank.id,
      rankName: nextRank.name,
      promotedAt: Date.now()
    });

    return { 
      success: true, 
      message: `恭喜晋升为${nextRank.name}！`,
      newRank: {
        id: nextRank.id,
        name: nextRank.name,
        title: nextRank.title,
        bonus: nextRank.bonus,
        dailyReward: nextRank.dailyReward
      }
    };
  }

  // 获取爵位进度信息
  getRankProgress(playerData) {
    const currentRankId = playerData.rank || 0;
    const currentRank = this.ranks[currentRankId];
    const nextRankId = currentRankId + 1;
    const nextRank = this.ranks[nextRankId];
    
    const honor = playerData.honor || 0;
    
    let progress = 100;
    let required = 0;
    let current = honor;
    
    if (nextRank) {
      required = nextRank.requiredHonor;
      current = honor;
      progress = Math.min(100, Math.floor((honor / required) * 100));
    }

    return {
      currentRank: {
        id: currentRankId,
        name: currentRank.name,
        title: currentRank.title,
        bonus: currentRank.bonus
      },
      nextRank: nextRank ? {
        id: nextRankId,
        name: nextRank.name,
        title: nextRank.title,
        requiredHonor: nextRank.requiredHonor
      } : null,
      honor: honor,
      progress: progress,
      required: required,
      current: current,
      canPromote: nextRank ? honor >= nextRank.requiredHonor : false
    };
  }

  // 初始化玩家爵位数据
  initPlayerRankData() {
    return {
      rank: 0,
      rankTitle: '凡夫俗子',
      honor: 0,
      totalHonor: 0,
      rankHistory: [],
      lastDailyReward: 0
    };
  }
}

// 导出单例
const rankSystem = new RankSystem();

module.exports = {
  rankSystem,
  RANK_DATA,
  HONOR_SOURCES,
  PROMOTE_CONDITIONS
};
