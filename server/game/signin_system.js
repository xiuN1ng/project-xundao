/**
 * 签到系统 v2.0
 * 每日签到、累计奖励
 */

// 签到奖励配置
const SIGNIN_REWARDS = {
  // 每日签到奖励（7天循环）
  daily: [
    { day: 1, type: 'spiritStones', amount: 100, icon: '💎', name: '灵石' },
    { day: 2, type: 'spiritStones', amount: 150, icon: '💎', name: '灵石' },
    { day: 3, type: 'spiritStones', amount: 200, icon: '💎', name: '灵石' },
    { day: 4, type: 'spiritStones', amount: 300, icon: '💎', name: '灵石' },
    { day: 5, type: 'spiritStones', amount: 400, icon: '💎', name: '灵石' },
    { day: 6, type: 'spiritStones', amount: 500, icon: '💎', name: '灵石' },
    { day: 7, type: 'spiritStones', amount: 1000, icon: '💎', name: '灵石', isBig: true }
  ],
  // 累计签到奖励
  cumulative: [
    { days: 7, type: 'spiritStones', amount: 500, icon: '🎁', name: '灵石袋', desc: '7天累计' },
    { days: 14, type: 'technique', amount: 1, icon: '📜', name: '功法卷轴', desc: '14天累计' },
    { days: 21, type: 'spiritStones', amount: 2000, icon: '💰', name: '灵石箱', desc: '21天累计' },
    { days: 30, type: 'artifact', amount: 'random_rare', icon: '🔮', name: '神秘宝箱', desc: '30天累计' }
  ]
};

/**
 * 签到系统类
 */
class SigninSystem {
  constructor() {
    this.rewards = SIGNIN_REWARDS;
  }

  // 初始化签到系统状态
  init() {
    if (!gameState.signin) {
      gameState.signin = {
        lastSigninDate: null,        // 上次签到日期
        consecutiveDays: 0,         // 当前连续签到天数
        totalSignins: 0,            // 累计签到总天数
        rewardsClaimed: []          // 已领取的累计奖励
      };
    }
  }

  // 获取今天的日期字符串 (YYYY-MM-DD)
  getTodayString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  // 获取昨天的日期字符串
  getYesterdayString() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  }

  // 检查今天是否可以签到
  canSignin() {
    const today = this.getTodayString();
    const signin = gameState.signin;
    
    if (signin.lastSigninDate !== today) {
      return { canSignin: true, message: '可以签到' };
    }
    return { canSignin: false, message: '今日已签到' };
  }

  // 获取连续签到天数
  getConsecutiveDays() {
    return gameState.signin?.consecutiveDays || 0;
  }

  // 获取今日签到奖励配置
  getTodayReward() {
    const signin = gameState.signin;
    const dayIndex = Math.min((signin.consecutiveDays) % 7, this.rewards.daily.length - 1);
    return this.rewards.daily[dayIndex];
  }

  // 获取指定天数的累计奖励配置
  getCumulativeReward(day) {
    return this.rewards.cumulative.find(r => r.days === day) || null;
  }

  // 执行签到，返回今日奖励
  signin() {
    const today = this.getTodayString();
    const signin = gameState.signin;
    
    // 检查是否可以签到
    const check = this.canSignin();
    if (!check.canSignin) {
      return { success: false, message: check.message };
    }

    const yesterdayStr = this.getYesterdayString();
    
    // 计算连续签到天数
    if (signin.lastSigninDate === yesterdayStr) {
      // 昨天签到了，连续签到继续
      signin.consecutiveDays++;
    } else {
      // 断签了或第一次签到，重新开始
      signin.consecutiveDays = 1;
    }

    // 更新签到状态
    signin.lastSigninDate = today;
    signin.totalSignins++;

    // 发放每日奖励
    const dailyReward = this.getTodayReward();
    const rewards = this.giveReward(dailyReward);
    
    // 检查可领取的累计奖励
    const availableCumulative = this.checkCumulativeRewards();
    
    return {
      success: true,
      message: `签到成功！连续签到 ${signin.consecutiveDays} 天`,
      reward: dailyReward,
      rewards: rewards,
      cumulativeRewards: availableCumulative,
      totalSignins: signin.totalSignins,
      consecutiveDays: signin.consecutiveDays
    };
  }

  // 发放奖励
  giveReward(reward) {
    const results = [];
    
    if (reward.type === 'spiritStones') {
      gameState.player.spiritStones += reward.amount;
      results.push({ type: 'spiritStones', amount: reward.amount, icon: reward.icon, name: reward.name });
    } else if (reward.type === 'technique') {
      // 功法卷轴 - 暂时给予灵石补偿
      gameState.player.spiritStones += 500;
      results.push({ type: 'spiritStones', amount: 500, icon: '📜', name: '功法卷轴' });
    } else if (reward.type === 'artifact') {
      // 神秘宝箱 - 随机给予一个稀有法宝
      gameState.player.spiritStones += 1000;
      results.push({ type: 'spiritStones', amount: 1000, icon: '🔮', name: '神秘宝箱' });
    }
    
    return results;
  }

  // 检查累计奖励
  checkCumulativeRewards() {
    const signin = gameState.signin;
    const availableRewards = [];
    
    for (const cumReward of this.rewards.cumulative) {
      if (signin.totalSignins >= cumReward.days && !signin.rewardsClaimed.includes(cumReward.days)) {
        availableRewards.push({
          ...cumReward,
          canClaim: true
        });
      }
    }
    
    return availableRewards;
  }

  // 领取累计奖励
  claimCumulativeReward(days) {
    const signin = gameState.signin;
    
    // 检查是否已经领取
    if (signin.rewardsClaimed.includes(days)) {
      return { success: false, message: '该奖励已领取' };
    }
    
    // 检查是否满足条件
    if (signin.totalSignins < days) {
      return { success: false, message: '累计天数不足' };
    }
    
    // 查找奖励配置
    const rewardConfig = this.rewards.cumulative.find(r => r.days === days);
    if (!rewardConfig) {
      return { success: false, message: '奖励配置错误' };
    }
    
    // 发放奖励
    const rewards = this.giveReward(rewardConfig);
    signin.rewardsClaimed.push(days);
    
    return {
      success: true,
      message: `领取 ${days} 天累计奖励成功！`,
      rewards: rewards
    };
  }

  // 获取签到状态（供UI使用）
  getStatus() {
    const signin = gameState.signin;
    const today = this.getTodayString();
    const canCheck = this.canSignin();
    
    // 当前是第几天签到（1-7循环）
    const currentDay = ((signin.consecutiveDays - 1) % 7) + 1;
    
    // 可领取的累计奖励
    const availableCumulative = this.checkCumulativeRewards();
    
    return {
      lastSigninDate: signin.lastSigninDate,
      today: today,
      canSignin: canCheck.canSignin,
      totalSignins: signin.totalSignins,
      consecutiveDays: signin.consecutiveDays,
      rewardsClaimed: signin.rewardsClaimed,
      currentDay: currentDay,
      availableCumulative: availableCumulative,
      dailyRewards: this.rewards.daily,
      cumulativeRewards: this.rewards.cumulative
    };
  }
}

// 创建实例
const signinSystem = new SigninSystem();

// 全局函数供 UI 调用
window.signinSystem = signinSystem;
window.SigninSystem = SigninSystem;
