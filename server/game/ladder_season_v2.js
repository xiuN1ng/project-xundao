/**
 * 天梯赛季系统 v2.0 - 深化版
 * P52-3: 赛季奖励优化 + 段位保护机制 + 跨服战预选赛
 * 
 * 增强内容：
 * - 赛季每日/每周奖励
 * - 段位保护（连败保护/晋级保护）
 * - 赛季通行证（Season Pass）
 * - 跨服战匹配系统
 */

const SEASON_V2 = {
  // ============ 赛季配置 ============
  season_duration_days: 30,
  placement_matches: 10,  // 定级赛场次

  // ============ 段位保护配置 ============
  protection: {
    // 连败保护：连续N场失败后，下一场失败不扣分
    loss_streak_protection: {
      threshold: 3,      // 3连败后触发
      protection_count: 1,  // 保护1场
      message: '连败保护：下场失败不扣分'
    },
    // 晋级保护：晋级赛后失败不降段
    promotion_protection: {
      enabled: true,
      protection_matches: 3,  // 晋级后3场内输了不降段
      message: '晋级保护：晋级后3场输了不降段'
    },
    // 段位保护罩：达到特定段位后不降段
    rank_shield: {
      platinum: { minScore: 2000, no_demote: true },    // 白金及以上不降段
      diamond: { minScore: 2400, no_demote: true },     // 钻石及以上不降段
      grandmaster: { minScore: 2800, no_demote: true }, // 宗师及以上不降段
    }
  },

  // ============ 每日/每周奖励 ============
  daily_rewards: {
    // 每日首胜
    first_win: { stones: 100, exp: 50, item: 'arena_ticket', item_count: 1 },
    // 每日参与奖励（根据参与场次）
    participation: [
      { matches: 1, stones: 20, exp: 10 },
      { matches: 5, stones: 50, exp: 30 },
      { matches: 10, stones: 100, exp: 60 },
      { matches: 20, stones: 200, exp: 120 }
    ]
  },
  weekly_rewards: {
    // 每周段位奖励（按最高段位）
    by_division: {
      bronze: { stones: 500, exp: 200 },
      silver: { stones: 1000, exp: 400 },
      gold: { stones: 2000, exp: 800 },
      platinum: { stones: 4000, exp: 1500 },
      diamond: { stones: 8000, exp: 3000 },
      grandmaster: { stones: 15000, exp: 5000 },
      king: { stones: 30000, exp: 10000 }
    },
    // 每周胜场奖励
    weekly_wins: [
      { wins: 10, stones: 500, item: 'arena_box_bronze', count: 1 },
      { wins: 25, stones: 1500, item: 'arena_box_silver', count: 1 },
      { wins: 50, stones: 5000, item: 'arena_box_gold', count: 1 }
    ]
  },

  // ============ 赛季通行证（Season Pass） ============
  season_pass: {
    free_tiers: 30,
    premium_cost: 3000,  // 灵石购买 premium
    tiers: {
      1: { free: { exp: 100 }, premium: { stones: 50 } },
      5: { free: { atk_scroll: 1 }, premium: { arena_ticket: 3 } },
      10: { free: { exp: 500 }, premium: { stones: 200 } },
      15: { free: { spirit_essence: 5 }, premium: { awakening_essence: 2 } },
      20: { free: { exp: 1000 }, premium: { divine_shard: 1 } },
      25: { free: { atk_scroll: 2 }, premium: { arena_box_gold: 1 } },
      30: { free: { exp: 2000, title: '天梯精英' }, premium: { stones: 2000, title: '天梯王者' } }
    }
  },

  // ============ 跨服战预选配置 ============
  cross_server: {
    enabled: false,  // 需达到宗师段位
    min_rank: 'grandmaster',  // 宗师以上
    qualification_matches: 20,  // 需要完成20场选拔赛
    server_groups: ['server_1', 'server_2', 'server_3'],
    match_history_days: 7,  // 只取最近7天的表现
    // 选拔赛评分标准
    qualification_score: {
      win: 100,
      loss: 30,
      mvp: 50,
      consecutive_win: 20  // 每连胜一场额外
    }
  }
};

// ==================== 段位计算 ====================

/**
 * 根据积分获取段位信息
 */
function getDivisionInfo(score) {
  const DIVISION_CONFIG = [
    { id: 0, name: '青铜Ⅰ', tier: 'bronze', icon: '🥉', color: '#CD7F32', minScore: 0, reward: 500, stars: 3 },
    { id: 1, name: '青铜Ⅱ', tier: 'bronze', icon: '🥉', color: '#CD7F32', minScore: 1000, reward: 600, stars: 3 },
    { id: 2, name: '白银Ⅰ', tier: 'silver', icon: '🥈', color: '#C0C0C0', minScore: 1200, reward: 800, stars: 3 },
    { id: 3, name: '白银Ⅱ', tier: 'silver', icon: '🥈', color: '#C0C0C0', minScore: 1400, reward: 1000, stars: 3 },
    { id: 4, name: '黄金Ⅰ', tier: 'gold', icon: '🥇', color: '#FFD700', minScore: 1600, reward: 1500, stars: 4 },
    { id: 5, name: '黄金Ⅱ', tier: 'gold', icon: '🥇', color: '#FFD700', minScore: 1800, reward: 2000, stars: 4 },
    { id: 6, name: '白金Ⅰ', tier: 'platinum', icon: '💎', color: '#38bdf8', minScore: 2000, reward: 3000, stars: 4 },
    { id: 7, name: '白金Ⅱ', tier: 'platinum', icon: '💎', color: '#38bdf8', minScore: 2200, reward: 4000, stars: 4 },
    { id: 8, name: '钻石Ⅰ', tier: 'diamond', icon: '💠', color: '#667eea', minScore: 2400, reward: 6000, stars: 5 },
    { id: 9, name: '钻石Ⅱ', tier: 'diamond', icon: '💠', color: '#667eea', minScore: 2600, reward: 8000, stars: 5 },
    { id: 10, name: '宗师', tier: 'grandmaster', icon: '🏆', color: '#f472b6', minScore: 2800, reward: 12000, stars: 5 },
    { id: 11, name: '王者', tier: 'king', icon: '👑', color: '#ffd700', minScore: 3000, reward: 20000, stars: 5 }
  ];

  let division = DIVISION_CONFIG[0];
  for (const d of DIVISION_CONFIG) {
    if (score >= d.minScore) division = d;
  }
  return division;
}

/**
 * 计算积分变化
 */
function calculateScoreChange(playerData, matchResult) {
  const { win, isMvp, consecutiveWins } = matchResult;
  const opponent = matchResult.opponentScore || playerData.score || 1500;
  
  // ELO公式
  const K = getKFactor(playerData);
  const expected = 1 / (1 + Math.pow(10, (opponent - (playerData.score || 1500)) / 400));
  const actual = win ? 1 : 0;
  
  let change = Math.round(K * (actual - expected));
  
  // MVP加成
  if (isMvp && win) change += 10;
  
  // 连胜加成
  if (consecutiveWins > 2) {
    const bonus = Math.min(20, (consecutiveWins - 2) * 5);
    if (win) change += bonus;
  }

  // 检查段位保护
  const newScore = (playerData.score || 1500) + change;
  const newDiv = getDivisionInfo(newScore);
  const oldDiv = getDivisionInfo(playerData.score || 1500);

  // 晋级保护检查
  if (playerData.promotion_protection_remaining && playerData.promotion_protection_remaining > 0) {
    if (newDiv.tier !== oldDiv.tier && !win) {
      // 晋级后保护期内输了，不降段
      change = Math.max(change, -(getDivisionInfo(newScore - 1).minScore - playerData.score));
    }
  }

  // 段位护盾检查（白金以上不降段）
  const shieldConfig = SEASON_V2.protection.rank_shield;
  if (shieldConfig.platinum?.no_demote && playerData.score >= 2000 && newScore < 2000) {
    change = Math.max(change, 0); // 只涨不跌
  }

  // 连败保护
  let lossStreakProtected = false;
  if (!win && playerData.loss_streak >= SEASON_V2.protection.loss_streak_protection.threshold) {
    if (playerData.loss_streak_protection_remaining > 0) {
      change = 0; // 保护期内失败不扣分
      lossStreakProtected = true;
    }
  }

  return {
    change,
    newScore: Math.max(0, (playerData.score || 1500) + change),
    newDivision: getDivisionInfo(Math.max(0, (playerData.score || 1500) + change)),
    mvpBonus: isMvp && win ? 10 : 0,
    consecutiveWinBonus: (consecutiveWins > 2 && win) ? Math.min(20, (consecutiveWins - 2) * 5) : 0,
    lossStreakProtected,
    promoted: newDiv.tier !== oldDiv.tier && newDiv.id > oldDiv.id
  };
}

function getKFactor(playerData) {
  const score = playerData.score || 1500;
  if (score < 1500) return 40;
  if (score < 2000) return 32;
  if (score < 2500) return 24;
  return 20;
}

/**
 * 获取每日奖励进度
 */
function getDailyRewardProgress(playerData) {
  const today = new Date().toISOString().split('T')[0];
  const lastClaim = playerData.last_daily_reward_date;
  
  if (lastClaim === today) {
    return { claimed: true, nextRefresh: getNextDayReset() };
  }

  // 今日胜场
  const todayWins = (playerData.today_matches || []).filter(m => m.win && isToday(m.time)).length;
  const firstWinClaimed = playerData.daily_first_win_claimed;
  const participationClaims = playerData.daily_participation_claimed || 0;

  const rewards = [];
  if (!firstWinClaimed && todayWins >= 1) {
    rewards.push({ ...SEASON_V2.daily_rewards.first_win, type: '首胜' });
  }

  for (const req of SEASON_V2.daily_rewards.participation) {
    if (todayWins >= req.matches && !(participationClaims & (1 << req.matches))) {
      rewards.push({ ...req, type: `${req.matches}场` });
    }
  }

  return {
    claimed: false,
    todayWins,
    rewards,
    nextRefresh: getNextDayReset()
  };
}

/**
 * 获取每周奖励进度
 */
function getWeeklyRewardProgress(playerData) {
  const now = new Date();
  const weekStart = getWeekStart(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const weekWins = (playerData.weekly_matches || []).filter(m => m.win && new Date(m.time) >= weekStart).length;
  const currentDivision = getDivisionInfo(playerData.score || 1500);
  const claimed = playerData.weekly_reward_claimed_week === getWeekKey(now);

  const rewards = [];
  if (!claimed) {
    const divReward = SEASON_V2.weekly_rewards.by_division[currentDivision.tier];
    if (divReward) rewards.push({ ...divReward, type: '段位奖励' });
    
    for (const req of SEASON_V2.weekly_rewards.weekly_wins) {
      if (weekWins >= req.wins) {
        rewards.push({ ...req, type: `${req.wins}胜` });
      }
    }
  }

  return {
    claimed,
    weekWins,
    currentDivision,
    rewards,
    nextRefresh: weekEnd.toISOString()
  };
}

/**
 * 赛季通行证进度
 */
function getSeasonPassProgress(playerData, seasonNum) {
  const exp = playerData.season_pass_exp || 0;
  const premium = playerData.season_pass_premium || false;
  
  // 计算等级
  let level = 1;
  let expNeeded = 100;
  let totalExp = 0;
  
  while (totalExp + expNeeded <= exp && level < 30) {
    totalExp += expNeeded;
    level++;
    expNeeded = 100 + (level - 1) * 20;
  }

  const tiers = SEASON_V2.season_pass.tiers;
  const claimedTiers = playerData.season_pass_claimed || [];
  const claimable = [];

  for (const [tier, rewards] of Object.entries(tiers)) {
    const tierNum = parseInt(tier);
    if (level >= tierNum) {
      const freeClaimed = claimedTiers.includes(`free_${tier}`);
      const premiumClaimed = claimedTiers.includes(`premium_${tier}`);
      
      if (!freeClaimed) claimable.push({ tier: tierNum, type: 'free', rewards: rewards.free });
      if (premium && !premiumClaimed) claimable.push({ tier: tierNum, type: 'premium', rewards: rewards.premium });
    }
  }

  return {
    level,
    exp,
    expNeeded,
    progress: Math.min(1, exp / (totalExp + expNeeded)),
    premium,
    claimable,
    nextTier: level < 30 ? level + 1 : null
  };
}

/**
 * 跨服战资格判定
 */
function getCrossServerQualification(playerData) {
  const cfg = SEASON_V2.cross_server;
  const currentDiv = getDivisionInfo(playerData.score || 1500);
  
  const qualified = currentDiv.tier === 'grandmaster' || currentDiv.tier === 'king';
  const matchesPlayed = (playerData.cross_server_qualification_matches || []).length;
  const matchesNeeded = cfg.qualification_matches;

  let score = 0;
  for (const m of playerData.cross_server_qualification_matches || []) {
    score += SEASON_V2.cross_server.qualification_score.win * (m.win ? 1 : 0);
    score += SEASON_V2.cross_server.qualification_score.loss;
    if (m.mvp) score += SEASON_V2.cross_server.qualification_score.mvp;
    if (m.consecutive_wins > 2) score += SEASON_V2.cross_server.qualification_score.consecutive_win * (m.consecutive_wins - 2);
  }

  return {
    qualified,
    currentDiv: currentDiv.name,
    matchesPlayed,
    matchesNeeded,
    qualificationScore: score,
    serverGroup: cfg.server_groups[Math.floor(Math.random() * cfg.server_groups.length)],
    canQualify: matchesPlayed >= matchesNeeded && score >= 1000
  };
}

// ==================== 辅助函数 ====================

function isToday(date) {
  const d = new Date(date).toISOString().split('T')[0];
  return d === new Date().toISOString().split('T')[0];
}

function getNextDayReset() {
  const now = new Date();
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(4, 0, 0, 0);
  return next.toISOString();
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekKey(date) {
  const ws = getWeekStart(date);
  return `${ws.getFullYear()}-W${Math.ceil((ws.getDate()) / 7)}`;
}

module.exports = {
  SEASON_V2,
  getDivisionInfo,
  calculateScoreChange,
  getDailyRewardProgress,
  getWeeklyRewardProgress,
  getSeasonPassProgress,
  getCrossServerQualification
};
