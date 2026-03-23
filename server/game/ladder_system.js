/**
 * 挂机修仙 - 天梯/段位系统
 * 
 * 段位: 青铜、白银、黄金、铂金、钻石、大师、王者
 * 段位内分: I、II、III、IV、V (如青铜I→青铜V)
 * 积分规则：胜利+25、失败-10、连胜额外+5
 */

// 天梯段位配置
const LADDER_RANKS = {
  // 青铜段位
  BRONZE: {
    id: 'bronze',
    name: '青铜',
    icon: '🥉',
    tierNames: ['V', 'IV', 'III', 'II', 'I'],
    minPoints: 0,
    maxPoints: 999,
    winPoints: 25,
    losePoints: 10,
    streakBonus: 5,
    dailyReward: { spiritStones: 10 },
    seasonReward: { spiritStones: 100 },
    description: '初入天梯的修士'
  },
  // 白银段位
  SILVER: {
    id: 'silver',
    name: '白银',
    icon: '🥈',
    tierNames: ['V', 'IV', 'III', 'II', 'I'],
    minPoints: 1000,
    maxPoints: 2499,
    winPoints: 25,
    losePoints: 10,
    streakBonus: 5,
    dailyReward: { spiritStones: 30 },
    seasonReward: { spiritStones: 300 },
    description: '小有所成的修士'
  },
  // 黄金段位
  GOLD: {
    id: 'gold',
    name: '黄金',
    icon: '🥇',
    tierNames: ['V', 'IV', 'III', 'II', 'I'],
    minPoints: 2500,
    maxPoints: 4999,
    winPoints: 25,
    losePoints: 10,
    streakBonus: 5,
    dailyReward: { spiritStones: 80 },
    seasonReward: { spiritStones: 800 },
    description: '实力不凡的修士'
  },
  // 铂金段位
  PLATINUM: {
    id: 'platinum',
    name: '铂金',
    icon: '💎',
    tierNames: ['V', 'IV', 'III', 'II', 'I'],
    minPoints: 5000,
    maxPoints: 9999,
    winPoints: 25,
    losePoints: 10,
    streakBonus: 5,
    dailyReward: { spiritStones: 150 },
    seasonReward: { spiritStones: 1500 },
    description: '一方高手'
  },
  // 钻石段位
  DIAMOND: {
    id: 'diamond',
    name: '钻石',
    icon: '💠',
    tierNames: ['V', 'IV', 'III', 'II', 'I'],
    minPoints: 10000,
    maxPoints: 19999,
    winPoints: 25,
    losePoints: 10,
    streakBonus: 5,
    dailyReward: { spiritStones: 300 },
    seasonReward: { spiritStones: 3000 },
    description: '人中龙凤'
  },
  // 大师段位
  MASTER: {
    id: 'master',
    name: '大师',
    icon: '🏆',
    tierNames: ['V', 'IV', 'III', 'II', 'I'],
    minPoints: 20000,
    maxPoints: 39999,
    winPoints: 25,
    losePoints: 10,
    streakBonus: 5,
    dailyReward: { spiritStones: 500 },
    seasonReward: { spiritStones: 5000 },
    description: '一代宗师'
  },
  // 王者段位
  KING: {
    id: 'king',
    name: '王者',
    icon: '👑',
    tierNames: ['V', 'IV', 'III', 'II', 'I'],
    minPoints: 40000,
    maxPoints: 999999,
    winPoints: 25,
    losePoints: 10,
    streakBonus: 5,
    dailyReward: { spiritStones: 1000 },
    seasonReward: { spiritStones: 10000 },
    description: '天梯王者'
  }
};

// 段位排序（从低到高）
const RANK_ORDER = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'KING'];

// 赛季配置
const SEASON_CONFIG = {
  duration: 30 * 24 * 60 * 60 * 1000, // 30天
  resetPoints: 0,
  preserveRank: true // 保留段位，只重置积分
};

class LadderSystem {
  constructor() {
    this.ladderData = {
      players: {}, // playerId -> ladderInfo
      seasonStart: Date.now(),
      matchHistory: [],
      aiOpponents: this._generateAiOpponents()
    };
  }

  // 初始化玩家天梯数据
  initPlayer(playerId) {
    if (!this.ladderData.players[playerId]) {
      this.ladderData.players[playerId] = {
        rank: 'BRONZE',
        tier: 4, // 0=V, 1=IV, 2=III, 3=II, 4=I (从V开始，积分0)
        points: 0,
        wins: 0,
        losses: 0,
        winStreak: 0,
        maxWinStreak: 0,
        seasonWins: 0,
        seasonLosses: 0,
        lastMatchTime: 0,
        dailyMatches: 0,
        dailyWinMatches: 0,
        lastDailyReset: Date.now()
      };
    }
    return this.ladderData.players[playerId];
  }

  // 获取玩家段位信息
  getRankInfo(playerId) {
    const player = this.initPlayer(playerId);
    const rankConfig = LADDER_RANKS[player.rank];
    
    // 计算当前段位的实际积分范围
    const tierPoints = player.tier * 200; // 每 tier 200分
    const totalPoints = player.points + tierPoints;
    
    // 计算距离下一级还需要多少分
    const nextTierPoints = player.tier > 0 ? (player.tier - 1) * 200 : 200;
    const pointsToNext = nextTierPoints - (player.points % 200);
    
    return {
      playerId,
      rank: player.rank,
      rankName: rankConfig.name,
      rankIcon: rankConfig.icon,
      tier: player.tier,
      tierName: rankConfig.tierNames[player.tier],
      points: player.points,
      totalPoints,
      displayRank: `${rankConfig.name}${rankConfig.tierNames[player.tier]}`,
      wins: player.wins,
      losses: player.losses,
      winRate: player.wins + player.losses > 0 
        ? Math.round((player.wins / (player.wins + player.losses)) * 100) 
        : 0,
      winStreak: player.winStreak,
      maxWinStreak: player.maxWinStreak,
      seasonWins: player.seasonWins,
      seasonLosses: player.seasonLosses,
      dailyMatches: player.dailyMatches,
      dailyWinMatches: player.dailyWinMatches,
      pointsToNext: player.tier > 0 ? pointsToNext : null,
      isMaxTier: player.tier === 0,
      description: rankConfig.description,
      dailyReward: rankConfig.dailyReward,
      seasonReward: rankConfig.seasonReward
    };
  }

  // 生成AI对手
  _generateAiOpponents() {
    const opponents = [];
    const aiNames = [
      '青云子', '玄冥子', '天璇子', '玉虚子', '紫阳子',
      '九幽散人', '凌霄子', '乾坤子', '无量子', '太乙子',
      '血魔子', '剑仙子', '丹霞子', '天雷子', '幽冥子'
    ];
    
    for (let i = 0; i < 15; i++) {
      const rankIndex = Math.floor(Math.random() * RANK_ORDER.length);
      const rank = RANK_ORDER[rankIndex];
      const tier = Math.floor(Math.random() * 5);
      opponents.push({
        id: `ai_${i}`,
        name: aiNames[i],
        rank,
        tier,
        points: Math.floor(Math.random() * 2000),
        atk: 50 + Math.floor(Math.random() * 200),
        hp: 500 + Math.floor(Math.random() * 2000)
      });
    }
    return opponents;
  }

  // 匹配对手
  match(playerId) {
    const player = this.initPlayer(playerId);
    const playerInfo = this.getRankInfo(playerId);
    
    // 检查是否有正在进行的天梯匹配
    if (this.ladderData.currentMatch && this.ladderData.currentMatch.playerId === playerId) {
      return {
        success: false,
        message: '已有进行中的天梯匹配',
        match: this.ladderData.currentMatch
      };
    }
    
    // 重置每日次数
    this._resetDailyIfNeeded(player);
    
    // 限制每日匹配次数
    if (player.dailyMatches >= 10) {
      return {
        success: false,
        message: '今日匹配次数已用完',
        dailyMatches: player.dailyMatches,
        maxDailyMatches: 10
      };
    }
    
    // 基于玩家段位选择合适的对手
    const rankIndex = RANK_ORDER.indexOf(player.rank);
    const minRankIndex = Math.max(0, rankIndex - 2);
    const maxRankIndex = Math.min(RANK_ORDER.length - 1, rankIndex + 2);
    
    // 筛选符合段位范围的对手
    let availableOpponents = this.ladderData.aiOpponents.filter(opp => {
      const oppRankIndex = RANK_ORDER.indexOf(opp.rank);
      return oppRankIndex >= minRankIndex && oppRankIndex <= maxRankIndex;
    });
    
    // 如果没有合适的对手，使用全部对手
    if (availableOpponents.length === 0) {
      availableOpponents = this.ladderData.aiOpponents;
    }
    
    // 随机选择对手
    const opponent = availableOpponents[Math.floor(Math.random() * availableOpponents.length)];
    
    // 创建匹配
    const match = {
      id: `match_${Date.now()}`,
      playerId,
      opponent: { ...opponent },
      startTime: Date.now(),
      status: 'ready',
      playerPower: this._calculatePlayerPower(playerId),
      opponentPower: this._calculateOpponentPower(opponent)
    };
    
    this.ladderData.currentMatch = match;
    player.lastMatchTime = Date.now();
    player.dailyMatches++;
    
    return {
      success: true,
      match,
      opponent: {
        name: opponent.name,
        rank: LADDER_RANKS[opponent.rank].name + LADDER_RANKS[opponent.rank].tierNames[opponent.tier],
        rankIcon: LADDER_RANKS[opponent.rank].icon,
        power: match.opponentPower
      },
      playerPower: match.playerPower,
      dailyMatchesLeft: 10 - player.dailyMatches
    };
  }

  // 计算玩家战力
  _calculatePlayerPower(playerId) {
    // 这里可以集成 game.js 的玩家属性计算
    // 暂时使用基础值，实际需要从 gameState 获取
    try {
      if (typeof gameState !== 'undefined' && gameState.player) {
        const p = gameState.player;
        return Math.floor((p.atk || 10) * 2 + (p.hp || 100) * 0.5);
      }
    } catch (e) {
      // 忽略错误
    }
    return 100; // 默认战力
  }

  // 计算对手战力
  _calculateOpponentPower(opponent) {
    return Math.floor(opponent.atk * 2 + opponent.hp * 0.5);
  }

  // 处理战斗结果
  battleResult(playerId, result) {
    const player = this.initPlayer(playerId);
    
    // 检查是否有进行中的匹配
    if (!this.ladderData.currentMatch || this.ladderData.currentMatch.playerId !== playerId) {
      return {
        success: false,
        message: '没有进行中的天梯匹配'
      };
    }
    
    const match = this.ladderData.currentMatch;
    const isWin = result === 'win';
    
    // 计算积分变化
    let pointChange = 0;
    const rankConfig = LADDER_RANKS[player.rank];
    
    if (isWin) {
      pointChange = rankConfig.winPoints;
      // 连胜奖励
      if (player.winStreak >= 2) {
        pointChange += rankConfig.streakBonus;
      }
      player.wins++;
      player.seasonWins++;
      player.winStreak++;
      player.dailyWinMatches++;
      if (player.winStreak > player.maxWinStreak) {
        player.maxWinStreak = player.winStreak;
      }
    } else {
      pointChange = -rankConfig.losePoints;
      player.losses++;
      player.seasonLosses++;
      player.winStreak = 0;
    }
    
    // 更新积分
    player.points = Math.max(0, player.points + pointChange);
    
    // 检查是否需要升级/降级
    const { newRank, newTier, promotion } = this._checkRankChange(player);
    
    const oldRank = player.rank;
    const oldTier = player.tier;
    player.rank = newRank;
    player.tier = newTier;
    
    // 记录匹配历史
    this.ladderData.matchHistory.unshift({
      id: match.id,
      playerId,
      opponent: match.opponent.name,
      result: isWin ? 'win' : 'lose',
      pointChange,
      oldRank,
      oldTier,
      newRank,
      newTier,
      timestamp: Date.now()
    });
    
    // 保留最近50条记录
    if (this.ladderData.matchHistory.length > 50) {
      this.ladderData.matchHistory = this.ladderData.matchHistory.slice(0, 50);
    }
    
    // 清除当前匹配
    this.ladderData.currentMatch = null;
    
    // 获取更新后的信息
    const rankInfo = this.getRankInfo(playerId);
    
    return {
      success: true,
      result: isWin ? 'win' : 'lose',
      pointChange,
      wasWin: isWin,
      winStreak: player.winStreak,
      streakBonus: isWin && player.winStreak >= 2 ? rankConfig.streakBonus : 0,
      oldRank: LADDER_RANKS[oldRank].name + LADDER_RANKS[oldRank].tierNames[oldTier],
      newRank: rankInfo.displayRank,
      promoted: promotion === 'up',
      demoted: promotion === 'down',
      rankInfo,
      matchHistory: this.ladderData.matchHistory.slice(0, 10)
    };
  }

  // 检查段位变化
  _checkRankChange(player) {
    const currentRankConfig = LADDER_RANKS[player.rank];
    const currentTierPoints = player.tier * 200;
    const totalPoints = player.points + currentTierPoints;
    
    let newRank = player.rank;
    let newTier = player.tier;
    let promotion = null;
    
    // 升级检查
    if (player.tier === 0 && player.points >= currentRankConfig.maxPoints) {
      const currentIndex = RANK_ORDER.indexOf(player.rank);
      if (currentIndex < RANK_ORDER.length - 1) {
        newRank = RANK_ORDER[currentIndex + 1];
        newTier = 4; // 降到新段位的最低 tier
        player.points = 0;
        promotion = 'up';
      } else {
        // 已是最高段位
        player.points = currentRankConfig.maxPoints;
      }
    } else if (player.tier > 0 && player.points >= 200) {
      // 段位内升级
      player.points -= 200;
      newTier = player.tier - 1;
      promotion = 'up';
    } else if (player.points < 0) {
      // 降级检查
      const currentIndex = RANK_ORDER.indexOf(player.rank);
      if (currentIndex > 0) {
        newRank = RANK_ORDER[currentIndex - 1];
        newTier = 0; // 降到新段位的最高 tier
        player.points = 100;
        promotion = 'down';
      } else {
        // 最低段位，保持青铜V
        player.points = 0;
      }
    }
    
    return { newRank, newTier, promotion };
  }

  // 重置每日数据
  _resetDailyIfNeeded(player) {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    if (now - player.lastDailyReset > dayMs) {
      player.dailyMatches = 0;
      player.dailyWinMatches = 0;
      player.lastDailyReset = now;
    }
  }

  // 获取赛季奖励
  getSeasonRewards(playerId) {
    const player = this.initPlayer(playerId);
    const rankInfo = this.getRankInfo(playerId);
    const seasonDuration = SEASON_CONFIG.duration;
    const seasonElapsed = Date.now() - this.ladderData.seasonStart;
    const seasonRemaining = Math.max(0, seasonDuration - seasonElapsed);
    
    // 计算赛季天数
    const seasonDays = Math.floor(seasonElapsed / (24 * 60 * 60 * 1000));
    
    // 赛季进度（0-100%）
    const seasonProgress = Math.min(100, Math.round((seasonElapsed / seasonDuration) * 100));
    
    // 奖励列表
    const rewards = {
      daily: {
        available: true,
        claimed: player.dailyWinMatches > 0,
        reward: rankInfo.dailyReward,
        claimable: player.dailyWinMatches > 0 && !this._isDailyRewardClaimed(player)
      },
      season: {
        progress: seasonProgress,
        daysElapsed: seasonDays,
        daysRemaining: Math.ceil(seasonRemaining / (24 * 60 * 60 * 1000)),
        currentRank: rankInfo.displayRank,
        totalWins: player.seasonWins,
        totalLosses: player.seasonLosses,
        winRate: rankInfo.winRate,
        rewards: [
          {
            rank: '青铜',
            reward: LADDER_RANKS.BRONZE.seasonReward,
            achieved: true
          },
          {
            rank: '白银',
            reward: LADDER_RANKS.SILVER.seasonReward,
            achieved: RANK_ORDER.indexOf(player.rank) >= 1
          },
          {
            rank: '黄金',
            reward: LADDER_RANKS.GOLD.seasonReward,
            achieved: RANK_ORDER.indexOf(player.rank) >= 2
          },
          {
            rank: '铂金',
            reward: LADDER_RANKS.PLATINUM.seasonReward,
            achieved: RANK_ORDER.indexOf(player.rank) >= 3
          },
          {
            rank: '钻石',
            reward: LADDER_RANKS.DIAMOND.seasonReward,
            achieved: RANK_ORDER.indexOf(player.rank) >= 4
          },
          {
            rank: '大师',
            reward: LADDER_RANKS.MASTER.seasonReward,
            achieved: RANK_ORDER.indexOf(player.rank) >= 5
          },
          {
            rank: '王者',
            reward: LADDER_RANKS.KING.seasonReward,
            achieved: player.rank === 'KING'
          }
        ]
      }
    };
    
    return rewards;
  }

  // 检查每日奖励是否已领取
  _isDailyRewardClaimed(player) {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    return player.lastDailyReset && (now - player.lastDailyReset < dayMs);
  }

  // 领取每日奖励
  claimDailyReward(playerId) {
    const player = this.initPlayer(playerId);
    const rankInfo = this.getRankInfo(playerId);
    
    if (!this._isDailyRewardClaimed(player)) {
      return {
        success: false,
        message: '今日奖励已领取或无可领取的奖励'
      };
    }
    
    if (player.dailyWinMatches === 0) {
      return {
        success: false,
        message: '今日还未获得胜利，无法领取奖励'
      };
    }
    
    // 发放奖励
    const reward = rankInfo.dailyReward;
    try {
      if (typeof gameState !== 'undefined' && gameState.player) {
        gameState.player.spiritStones = (gameState.player.spiritStones || 0) + reward.spiritStones;
      }
    } catch (e) {
      // 忽略错误
    }
    
    // 更新领取时间
    player.lastDailyReset = Date.now();
    
    return {
      success: true,
      message: `领取成功，获得 ${reward.spiritStones} 灵石`,
      reward
    };
  }

  // 获取排行榜
  getLeaderboard(playerId, limit = 20) {
    // 模拟排行榜数据（实际需要从服务器获取）
    const leaderboard = [];
    
    // 添加AI对手
    for (let i = 0; i < Math.min(limit, this.ladderData.aiOpponents.length); i++) {
      const opp = this.ladderData.aiOpponents[i];
      const rankIndex = RANK_ORDER.indexOf(opp.rank);
      const totalPoints = opp.points + rankIndex * 1000;
      leaderboard.push({
        rank: i + 1,
        playerId: opp.id,
        name: opp.name,
        rankName: LADDER_RANKS[opp.rank].name + LADDER_RANKS[opp.rank].tierNames[opp.tier],
        rankIcon: LADDER_RANKS[opp.rank].icon,
        points: totalPoints,
        isAi: true
      });
    }
    
    // 添加当前玩家
    if (playerId) {
      const playerInfo = this.getRankInfo(playerId);
      leaderboard.push({
        rank: leaderboard.length + 1,
        playerId,
        name: '你',
        rankName: playerInfo.displayRank,
        rankIcon: playerInfo.rankIcon,
        points: playerInfo.totalPoints,
        isPlayer: true
      });
    }
    
    // 按积分排序
    leaderboard.sort((a, b) => b.points - a.points);
    
    // 重新设置排名
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });
    
    return leaderboard.slice(0, limit);
  }

  // 获取天梯状态
  getLadderStatus(playerId) {
    const player = this.initPlayer(playerId);
    const rankInfo = this.getRankInfo(playerId);
    
    return {
      isInMatch: this.ladderData.currentMatch && this.ladderData.currentMatch.playerId === playerId,
      matchId: this.ladderData.currentMatch?.id || null,
      dailyMatches: player.dailyMatches,
      dailyMatchesLeft: 10 - player.dailyMatches,
      dailyWins: player.dailyWinMatches,
      seasonStart: this.ladderData.seasonStart,
      seasonDuration: SEASON_CONFIG.duration,
      rankInfo
    };
  }

  // 保存数据
  saveData() {
    return {
      ladderData: this.ladderData
    };
  }

  // 加载数据
  loadData(data) {
    if (data && data.ladderData) {
      this.ladderData = data.ladderData;
      // 重新生成AI对手（如果需要）
      if (!this.ladderData.aiOpponents || this.ladderData.aiOpponents.length === 0) {
        this.ladderData.aiOpponents = this._generateAiOpponents();
      }
    }
  }
}

// 导出模块
module.exports = {
  LadderSystem,
  LADDER_RANKS,
  RANK_ORDER,
  SEASON_CONFIG
};
