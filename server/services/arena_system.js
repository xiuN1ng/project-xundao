/**
 * 挂机修仙 - 仙道大会（竞技场/排位赛）系统
 * 
 * 段位体系：凡人→练气→筑基→金丹→元婴→化神→渡劫→仙人→天仙→金仙→大罗金仙
 */

const ARENA_RANKS = {
  // 凡人 → 练气 → 筑基 → 金丹 → 元婴 → 化神 → 渡劫 → 仙人 → 天仙 → 金仙 → 大罗金仙
  0: {
    id: 0,
    name: '凡人',
    icon: '👤',
    minPoints: 0,
    maxPoints: 999,
    winPoints: 50,
    losePoints: 0,
    dailyReward: { spiritStones: 0 },
    promotionReward: { spiritStones: 100 },
    description: '尚未踏入修仙之路的凡人'
  },
  1: {
    id: 1,
    name: '练气',
    icon: '💨',
    minPoints: 1000,
    maxPoints: 2499,
    winPoints: 60,
    losePoints: 0,
    dailyReward: { spiritStones: 50 },
    promotionReward: { spiritStones: 200 },
    description: '初步感应天地灵气，开始修炼'
  },
  2: {
    id: 2,
    name: '筑基',
    icon: '🧱',
    minPoints: 2500,
    maxPoints: 4999,
    winPoints: 70,
    losePoints: 0,
    dailyReward: { spiritStones: 150 },
    promotionReward: { spiritStones: 500 },
    description: '灵气化液，筑就仙基'
  },
  3: {
    id: 3,
    name: '金丹',
    icon: '⚪',
    minPoints: 5000,
    maxPoints: 9999,
    winPoints: 80,
    losePoints: 5,
    dailyReward: { spiritStones: 300 },
    promotionReward: { spiritStones: 1000 },
    description: '灵气凝结成丹，修为大增'
  },
  4: {
    id: 4,
    name: '元婴',
    icon: '👶',
    minPoints: 10000,
    maxPoints: 19999,
    winPoints: 90,
    losePoints: 10,
    dailyReward: { spiritStones: 600 },
    promotionReward: { spiritStones: 2000 },
    description: '金丹化婴，神通广大'
  },
  5: {
    id: 5,
    name: '化神',
    icon: '🧘',
    minPoints: 20000,
    maxPoints: 39999,
    winPoints: 100,
    losePoints: 15,
    dailyReward: { spiritStones: 1200 },
    promotionReward: { spiritStones: 5000 },
    description: '神魂化神，返璞归真'
  },
  6: {
    id: 6,
    name: '渡劫',
    icon: '⚡',
    minPoints: 40000,
    maxPoints: 79999,
    winPoints: 120,
    losePoints: 20,
    dailyReward: { spiritStones: 2500 },
    promotionReward: { spiritStones: 10000 },
    description: '承受天劫，寻求飞升'
  },
  7: {
    id: 7,
    name: '仙人',
    icon: '✨',
    minPoints: 80000,
    maxPoints: 149999,
    winPoints: 140,
    losePoints: 25,
    dailyReward: { spiritStones: 5000 },
    promotionReward: { spiritStones: 20000 },
    description: '渡过天劫，飞升仙界'
  },
  8: {
    id: 8,
    name: '天仙',
    icon: '🌟',
    minPoints: 150000,
    maxPoints: 299999,
    winPoints: 160,
    losePoints: 30,
    dailyReward: { spiritStones: 10000 },
    promotionReward: { spiritStones: 40000 },
    description: '天界仙人，神通广大'
  },
  9: {
    id: 9,
    name: '金仙',
    icon: '👑',
    minPoints: 300000,
    maxPoints: 599999,
    winPoints: 180,
    losePoints: 35,
    dailyReward: { spiritStones: 20000 },
    promotionReward: { spiritStones: 80000 },
    description: '金身不坏，与天同寿'
  },
  10: {
    id: 10,
    name: '大罗金仙',
    icon: '🏆',
    minPoints: 600000,
    maxPoints: 99999999,
    winPoints: 200,
    losePoints: 40,
    dailyReward: { spiritStones: 50000 },
    promotionReward: { spiritStones: 200000 },
    description: '跳出三界外，不在五行中'
  }
};

// 赛季配置
const SEASON_CONFIG = {
  type: 'weekly', // weekly | monthly
  durationDays: 7,
  resetTime: '00:00', // 每周重置时间
  gracePeriodHours: 24 // 缓冲期（重置后24小时内可领取上赛季奖励）
};

// 挑战配置
const CHALLENGE_CONFIG = {
  dailyFreeChallenges: 5, // 每日免费挑战次数
  vipBonusChallenges: { 1: 2, 2: 5, 3: 10 }, // VIP额外次数
  refreshCost: 50, // 刷新对手消耗
  maxOpponents: 5 // 可挑战对手数量
};

// 竞技场系统类
class ArenaSystem {
  constructor() {
    this.ranks = ARENA_RANKS;
    this.seasonConfig = SEASON_CONFIG;
    this.challengeConfig = CHALLENGE_CONFIG;
  }

  // 初始化玩家竞技场数据
  initPlayerArenaData(playerId) {
    return {
      playerId: playerId,
      arenaPoints: 0,
      rankId: 0,
      rankName: '凡人',
      winCount: 0,
      loseCount: 0,
      totalBattles: 0,
      currentSeasonId: this.getCurrentSeasonId(),
      dailyChallengesUsed: 0,
      lastChallengeDate: null,
      dailyRewardClaimed: false,
      lastSeasonRank: 0,
      highestRank: 0,
      highestRankId: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  // 获取当前赛季ID
  getCurrentSeasonId() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    
    if (this.seasonConfig.type === 'weekly') {
      // 每周一个赛季
      const weekOfYear = Math.ceil((now - new Date(year, 0, 1)) / (7 * 24 * 60 * 60 * 1000));
      return `${year}_W${weekOfYear}`;
    } else {
      // 每月一个赛季
      return `${year}_M${month}`;
    }
  }

  // 获取当前赛季剩余时间
  getSeasonRemainingTime() {
    const now = new Date();
    const endOfSeason = new Date();
    
    if (this.seasonConfig.type === 'weekly') {
      // 计算本周结束时间（周日24:00）
      const dayOfWeek = now.getDay();
      const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
      endOfSeason.setDate(now.getDate() + daysUntilSunday);
    } else {
      // 计算本月结束时间
      endOfSeason.setMonth(now.getMonth() + 1);
      endOfSeason.setDate(0);
    }
    
    endOfSeason.setHours(23, 59, 59, 999);
    
    return {
      endTime: endOfSeason.toISOString(),
      remainingMs: endOfSeason.getTime() - now.getTime(),
      remainingDays: Math.ceil((endOfSeason.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    };
  }

  // 根据积分获取段位
  getRankByPoints(points) {
    for (let i = this.ranks.length - 1; i >= 0; i--) {
      if (points >= this.ranks[i].minPoints) {
        return this.ranks[i];
      }
    }
    return this.ranks[0];
  }

  // 获取段位信息
  getRank(rankId) {
    return this.ranks[rankId] || this.ranks[0];
  }

  // 获取所有段位信息
  getAllRanks() {
    return Object.values(this.ranks);
  }

  // 检查是否可以晋升
  checkPromotion(currentRankId) {
    const nextRankId = currentRankId + 1;
    if (nextRankId >= this.ranks.length) {
      return { canPromote: false, reason: '已达最高段位' };
    }
    
    const currentRank = this.ranks[currentRankId];
    const nextRank = this.ranks[nextRankId];
    
    return {
      canPromote: true,
      currentRank,
      nextRank,
      requiredPoints: nextRank.minPoints,
      description: `达到${nextRank.minPoints}积分可晋升为${nextRank.name}`
    };
  }

  // 计算每日可挑战次数
  getDailyChallengeCount(vipLevel = 0) {
    const baseCount = this.challengeConfig.dailyFreeChallenges;
    const bonusCount = this.challengeConfig.vipBonusChallenges[vipLevel] || 0;
    return baseCount + bonusCount;
  }

  // 模拟战斗结果（基于战力对比）
  simulateBattle(attackerPower, defenderPower) {
    // 战力对比影响胜率
    const powerRatio = attackerPower / defenderPower;
    
    // 基础胜率
    let winChance = 0.5;
    
    if (powerRatio >= 2) {
      winChance = 0.9; // 战力远超，基本必胜
    } else if (powerRatio >= 1.5) {
      winChance = 0.75;
    } else if (powerRatio >= 1.2) {
      winChance = 0.65;
    } else if (powerRatio >= 1.0) {
      winChance = 0.55; // 略高
    } else if (powerRatio >= 0.8) {
      winChance = 0.4;
    } else if (powerRatio >= 0.5) {
      winChance = 0.25;
    } else {
      winChance = 0.1; // 战力远低于对手
    }
    
    const roll = Math.random();
    return roll < winChance;
  }

  // 生成战斗报告
  generateBattleReport(winner, loser, winnerPower, loserPower) {
    const winnerRank = this.getRankByPoints(winner.arenaPoints);
    const loserRank = this.getRankByPoints(loser.arenaPoints);
    
    // 计算胜负积分
    const winnerPoints = winnerRank.winPoints;
    const loserPoints = loserRank.losePoints;
    
    // 战斗回合数（3-10回合）
    const rounds = Math.floor(Math.random() * 8) + 3;
    
    // 生成战斗详情
    const battleDetails = [];
    let winnerCurrentHp = 100;
    let loserCurrentHp = 100;
    
    for (let i = 1; i <= rounds; i++) {
      // 随机伤害
      const winnerDamage = Math.floor(loserPower * (0.1 + Math.random() * 0.15));
      const loserDamage = Math.floor(winnerPower * (0.1 + Math.random() * 0.15));
      
      loserCurrentHp = Math.max(0, loserCurrentHp - winnerDamage);
      winnerCurrentHp = Math.max(0, winnerCurrentHp - loserDamage);
      
      battleDetails.push({
        round: i,
        winnerDamage,
        loserDamage,
        winnerHp: winnerCurrentHp,
        loserHp: loserCurrentHp,
        winnerAction: winnerPower > loserPower ? '发起猛烈攻击' : '巧妙周旋',
        loserAction: loserPower > winnerPower ? '全力防守' : '反击'
      });
      
      if (winnerCurrentHp <= 0 || loserCurrentHp <= 0) {
        break;
      }
    }
    
    return {
      winner: {
        id: winner.playerId,
        username: winner.username,
        power: winnerPower
      },
      loser: {
        id: loser.playerId,
        username: loser.username,
        power: loserPower
      },
      winnerPoints,
      loserPoints,
      rounds: battleDetails.length,
      details: battleDetails
    };
  }

  // 获取段位奖励配置
  getRankRewards() {
    const rewards = [];
    for (const rank of Object.values(this.ranks)) {
      rewards.push({
        rankId: rank.id,
        rankName: rank.name,
        icon: rank.icon,
        minPoints: rank.minPoints,
        dailyReward: rank.dailyReward,
        promotionReward: rank.promotionReward,
        description: rank.description
      });
    }
    return rewards;
  }
}

// 创建竞技场系统单例
const arenaSystem = new ArenaSystem();

module.exports = {
  arenaSystem,
  ARENA_RANKS,
  SEASON_CONFIG,
  CHALLENGE_CONFIG
};
