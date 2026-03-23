/**
 * 签到系统 (Signin System)
 * 每日签到、补签功能、累计签到奖励
 */

export interface SigninReward {
  day: number;
  gold: number;
  exp: number;
  items: Array<{ id: string; name: string; count: number }>;
}

export interface CumulativeReward {
  days: number;
  gold: number;
  exp: number;
  items: Array<{ id: string; name: string; count: number }>;
  title?: string;
}

export interface SigninData {
  playerId: string;
  lastSigninDate: string | null;
  currentStreak: number;
  totalDays: number;
  signinHistory: string[];
  claimedRewards: number[];
  makeupCount: number;
  lastMakeupMonth: string | null;
}

export interface MakeupDate {
  date: string;
  cost: number;
  reward: SigninReward;
}

class SigninSystem {
  private signinData: Map<string, SigninData> = new Map();
  
  // 每日签到奖励配置 (7天循环)
  private dailyRewards: SigninReward[] = [
    { day: 1, gold: 100, exp: 500, items: [{ id: 'spirit_stone', name: '灵石', count: 10 }] },
    { day: 2, gold: 150, exp: 600, items: [{ id: ' Qi', name: '灵气丹', count: 1 }] },
    { day: 3, gold: 200, exp: 700, items: [{ id: 'spirit_stone', name: '灵石', count: 20 }] },
    { day: 4, gold: 250, exp: 800, items: [{ id: 'realm_token', name: '境界令牌', count: 1 }] },
    { day: 5, gold: 300, exp: 1000, items: [{ id: 'spirit_stone', name: '灵石', count: 30 }] },
    { day: 6, gold: 350, exp: 1200, items: [{ id: 'magic_scroll', name: '功法卷轴', count: 1 }] },
    { day: 7, gold: 500, exp: 2000, items: [{ id: 'treasure_box', name: '珍宝盒', count: 1 }] }
  ];
  
  // 累计签到奖励
  private cumulativeRewards: CumulativeReward[] = [
    { days: 7, gold: 1000, exp: 5000, items: [{ id: 'rare_box', name: '稀有宝盒', count: 1 }] },
    { days: 14, gold: 2000, exp: 10000, items: [{ id: 'epic_box', name: '史诗宝盒', count: 1 }] },
    { days: 21, gold: 3000, exp: 15000, items: [{ id: 'legendary_box', name: '传奇宝盒', count: 1 }] },
    { days: 30, gold: 5000, exp: 30000, items: [{ id: 'monthly_treasure', name: '月卡宝箱', count: 1 }], title: '月签到达人' },
    { days: 60, gold: 10000, exp: 60000, items: [{ id: 'exclusive_title', name: '专属称号', count: 1 }], title: '签到仙人' },
    { days: 90, gold: 20000, exp: 100000, items: [{ id: 'ultimate_treasure', name: '终极宝箱', count: 1 }], title: '签到神话' }
  ];
  
  // 补签配置
  private makeupConfig = {
    baseCost: 100,        // 基础消耗灵石
    costIncrease: 50,    // 每次补签增加消耗
    maxMakeupsPerMonth: 3 // 每月最大补签次数
  };
  
  /**
   * 获取玩家签到数据
   */
  getPlayerSigninData(playerId: string): SigninData {
    if (!this.signinData.has(playerId)) {
      this.signinData.set(playerId, {
        playerId,
        lastSigninDate: null,
        currentStreak: 0,
        totalDays: 0,
        signinHistory: [],
        claimedRewards: [],
        makeupCount: 0,
        lastMakeupMonth: null
      });
    }
    return this.signinData.get(playerId)!;
  }
  
  /**
   * 获取今日是第几天签到 (1-7)
   */
  private getDayOfWeek(): number {
    const today = new Date();
    const dayOfWeek = today.getDay() || 7; // 周日=7
    return dayOfWeek;
  }
  
  /**
   * 获取日期字符串
   */
  private getDateString(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  /**
   * 获取月份字符串
   */
  private getMonthString(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
  
  /**
   * 签到
   */
  signin(playerId: string): {
    success: boolean;
    message: string;
    streak?: number;
    totalDays?: number;
    reward?: SigninReward;
    cumulativeReward?: CumulativeReward | null;
  } {
    const signinData = this.getPlayerSigninData(playerId);
    const today = this.getDateString();
    
    // 检查今天是否已签到
    if (signinData.lastSigninDate === today) {
      return { success: false, message: '今日已签到' };
    }
    
    // 更新连续签到
    const yesterday = this.getDateString(new Date(Date.now() - 86400000));
    
    if (signinData.lastSigninDate === yesterday) {
      // 昨天已签到，连续签到+1
      signinData.currentStreak++;
    } else {
      // 中断连续签到，重新计算
      signinData.currentStreak = 1;
    }
    
    // 更新数据
    signinData.lastSigninDate = today;
    signinData.totalDays++;
    signinData.signinHistory.push(today);
    
    // 获取今日奖励
    const dayIndex = (signinData.currentStreak - 1) % 7;
    const reward = this.dailyRewards[dayIndex];
    
    // 检查累计签到奖励
    let cumulativeReward: CumulativeReward | null = null;
    for (const cumulative of this.cumulativeRewards) {
      if (signinData.totalDays >= cumulative.days && 
          !signinData.claimedRewards.includes(cumulative.days)) {
        signinData.claimedRewards.push(cumulative.days);
        cumulativeReward = cumulative;
        break;
      }
    }
    
    return {
      success: true,
      message: '签到成功',
      streak: signinData.currentStreak,
      totalDays: signinData.totalDays,
      reward,
      cumulativeReward
    };
  }
  
  /**
   * 补签
   */
  makeupSignin(playerId: string, targetDate: string, playerGold: number): {
    success: boolean;
    message: string;
    makeupCost?: number;
    remainingMakeups?: number;
    reward?: SigninReward;
    streak?: number;
    totalDays?: number;
  } {
    const signinData = this.getPlayerSigninData(playerId);
    const currentMonth = this.getMonthString();
    const today = this.getDateString();
    
    // 每月重置补签次数
    if (signinData.lastMakeupMonth !== currentMonth) {
      signinData.makeupCount = 0;
    }
    
    const maxMakeups = this.makeupConfig.maxMakeupsPerMonth;
    if (signinData.makeupCount >= maxMakeups) {
      return { success: false, message: `本月补签次数已用完（${maxMakeups}次）` };
    }
    
    // 检查目标日期
    if (targetDate >= today) {
      return { success: false, message: '无法补签当天或未来的日期' };
    }
    
    // 检查该日期是否已签到
    if (signinData.signinHistory.includes(targetDate)) {
      return { success: false, message: '该日期已签到' };
    }
    
    // 计算补签消耗
    const cost = this.calculateMakeupCost(signinData.makeupCount);
    
    if (playerGold < cost) {
      return { success: false, message: `灵石不足，需要${cost}灵石` };
    }
    
    // 更新数据
    signinData.makeupCount++;
    signinData.lastMakeupMonth = currentMonth;
    signinData.signinHistory.push(targetDate);
    signinData.totalDays++;
    
    // 获取补签日期对应的奖励
    const targetDateObj = new Date(targetDate);
    const dayOfWeek = targetDateObj.getDay() || 7;
    const reward = this.dailyRewards[dayOfWeek - 1];
    
    // 重新计算连续签到
    const streak = this.calculateStreak(signinData.signinHistory);
    signinData.currentStreak = streak;
    
    return {
      success: true,
      message: `补签成功！消耗${cost}灵石`,
      makeupCost: cost,
      remainingMakeups: maxMakeups - signinData.makeupCount,
      reward,
      streak: signinData.currentStreak,
      totalDays: signinData.totalDays
    };
  }
  
  /**
   * 计算补签消耗
   */
  private calculateMakeupCost(makeupCount: number): number {
    return this.makeupConfig.baseCost + (this.makeupConfig.costIncrease * makeupCount);
  }
  
  /**
   * 计算连续签到
   */
  private calculateStreak(signinHistory: string[]): number {
    if (signinHistory.length === 0) return 0;
    
    const sortedDates = [...signinHistory].sort().reverse();
    const today = this.getDateString();
    const yesterday = this.getDateString(new Date(Date.now() - 86400000));
    
    // 必须今天或昨天签到才有连续
    if (sortedDates[0] !== today && sortedDates[0] !== yesterday) {
      return 1;
    }
    
    let streak = 1;
    let currentDate = new Date(sortedDates[0]);
    
    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(currentDate.getTime() - 86400000);
      if (sortedDates[i] === this.getDateString(prevDate)) {
        streak++;
        currentDate = prevDate;
      } else {
        break;
      }
    }
    
    return streak;
  }
  
  /**
   * 获取签到状态
   */
  getSigninStatus(playerId: string): {
    isSignedToday: boolean;
    currentStreak: number;
    totalDays: number;
    todayReward: SigninReward;
    nextCumulative: { days: number; remaining: number; reward: CumulativeReward } | null;
    claimedRewards: number[];
    availableMakeups: MakeupDate[];
    remainingMakeups: number;
    makeupCost: number;
  } {
    const signinData = this.getPlayerSigninData(playerId);
    const today = this.getDateString();
    const currentMonth = this.getMonthString();
    
    const isSignedToday = signinData.lastSigninDate === today;
    const dayIndex = (signinData.currentStreak) % 7;
    
    // 今日奖励
    const todayReward = this.dailyRewards[dayIndex];
    
    // 下次累计奖励
    const nextCumulative = this.cumulativeRewards.find(
      c => !signinData.claimedRewards.includes(c.days) && signinData.totalDays < c.days
    );
    
    // 可补签日期
    const availableMakeups = this.getAvailableMakeupDates(signinData);
    
    // 本月剩余补签次数
    const isNewMonth = signinData.lastMakeupMonth !== currentMonth;
    const remainingMakeups = isNewMonth 
      ? this.makeupConfig.maxMakeupsPerMonth 
      : this.makeupConfig.maxMakeupsPerMonth - signinData.makeupCount;
    
    return {
      isSignedToday,
      currentStreak: signinData.currentStreak,
      totalDays: signinData.totalDays,
      todayReward,
      nextCumulative: nextCumulative ? {
        days: nextCumulative.days,
        remaining: nextCumulative.days - signinData.totalDays,
        reward: nextCumulative
      } : null,
      claimedRewards: signinData.claimedRewards,
      availableMakeups,
      remainingMakeups,
      makeupCost: this.calculateMakeupCost(signinData.makeupCount)
    };
  }
  
  /**
   * 获取可补签的日期
   */
  private getAvailableMakeupDates(signinData: SigninData): MakeupDate[] {
    const dates: MakeupDate[] = [];
    const today = new Date();
    const currentMonth = this.getMonthString();
    
    let makeupCount = signinData.makeupCount;
    if (signinData.lastMakeupMonth !== currentMonth) {
      makeupCount = 0;
    }
    
    const maxMakeups = this.makeupConfig.maxMakeupsPerMonth;
    if (makeupCount >= maxMakeups) {
      return dates;
    }
    
    // 遍历最近7天
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today.getTime() - i * 86400000);
      const dateStr = this.getDateString(date);
      
      if (!signinData.signinHistory.includes(dateStr)) {
        const dayOfWeek = date.getDay() || 7;
        dates.push({
          date: dateStr,
          cost: this.calculateMakeupCost(dates.length + makeupCount),
          reward: this.dailyRewards[dayOfWeek - 1]
        });
      }
      
      if (dates.length >= (maxMakeups - makeupCount)) {
        break;
      }
    }
    
    return dates;
  }
  
  /**
   * 获取签到日历
   */
  getSigninCalendar(playerId: string, year: number, month: number): Array<{
    day: number;
    date: string;
    signed: boolean;
    reward: SigninReward;
  }> {
    const signinData = this.getPlayerSigninData(playerId);
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const daysInMonth = endDate.getDate();
    const calendar = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dateStr = this.getDateString(date);
      
      calendar.push({
        day,
        date: dateStr,
        signed: signinData.signinHistory.includes(dateStr),
        reward: this.dailyRewards[date.getDay() || 7 - 1]
      });
    }
    
    return calendar;
  }
  
  /**
   * 获取签到配置
   */
  getRewardConfigs(): { daily: SigninReward[]; cumulative: CumulativeReward[] } {
    return {
      daily: this.dailyRewards,
      cumulative: this.cumulativeRewards
    };
  }
}

export const signinSystem = new SigninSystem();
export default SigninSystem;
