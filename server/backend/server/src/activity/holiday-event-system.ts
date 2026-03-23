/**
 * 节日活动系统 (Holiday Event System)
 * 各类节日活动、限时活动、节日奖励
 */

export interface HolidayEvent {
  id: string;
  name: string;
  description: string;
  type: 'festival' | 'limited' | 'weekly' | 'special';
  startTime: number;
  endTime: number;
  rewards: EventReward[];
  conditions?: EventCondition;
  active: boolean;
}

export interface EventReward {
  day?: number;
  type: 'daily' | 'cumulative' | 'one-time';
  rewards: Array<{
    id: string;
    name: string;
    amount: number;
  }>;
}

export interface EventCondition {
  minLevel?: number;
  requiredActivity?: number;
  requiredVip?: number;
}

export interface PlayerEventData {
  playerId: string;
  eventId: string;
  progress: number;
  claimedDays: number[];
  claimedCumulative: number[];
  joinTime: number;
}

export interface PlayerActivityData {
  playerId: string;
  dailyActivity: number;
  weeklyActivity: number;
  lastActivityDate: string;
  lastWeeklyReset: string;
}

class HolidayEventSystem {
  private events: Map<string, HolidayEvent> = new Map();
  private playerEventData: Map<string, PlayerEventData[]> = new Map();
  private playerActivityData: Map<string, PlayerActivityData> = new Map();
  
  // 节日活动配置
  private defaultEvents: HolidayEvent[] = [
    {
      id: 'spring_festival',
      name: '春节庆典',
      description: '新年到，福气到！春节期间签到额外奖励',
      type: 'festival',
      startTime: this.getFestivalTime('spring'), // 春节
      endTime: this.getFestivalTime('spring') + 7 * 24 * 60 * 60 * 1000,
      active: true,
      rewards: [
        { type: 'daily', rewards: [{ id: 'red_envelope', name: '红包', amount: 1 }] },
        { day: 3, type: 'cumulative', rewards: [{ id: 'gold', name: '金币', amount: 1000 }] },
        { day: 7, type: 'cumulative', rewards: [{ id: 'legendary_box', name: '传奇宝盒', amount: 1 }] }
      ],
      conditions: { minLevel: 1 }
    },
    {
      id: 'mid_autumn',
      name: '中秋节',
      description: '月圆之夜，仙气浓郁，修炼加速',
      type: 'festival',
      startTime: this.getFestivalTime('mid_autumn'),
      endTime: this.getFestivalTime('mid_autumn') + 5 * 24 * 60 * 60 * 1000,
      active: true,
      rewards: [
        { type: 'daily', rewards: [{ id: 'moon_cake', name: '月饼', amount: 1 }] },
        { day: 3, type: 'cumulative', rewards: [{ id: 'exp_boost', name: '经验加成', amount: 50 }] },
        { day: 5, type: 'cumulative', rewards: [{ id: 'rare_box', name: '稀有宝盒', amount: 1 }] }
      ]
    },
    {
      id: 'valentine',
      name: '情人节',
      description: '仙侣同修，甜蜜双倍',
      type: 'festival',
      startTime: this.getFestivalTime('valentine'),
      endTime: this.getFestivalTime('valentine') + 3 * 24 * 60 * 60 * 1000,
      active: true,
      rewards: [
        { type: 'daily', rewards: [{ id: 'love_token', name: '情缘币', amount: 1 }] },
        { type: 'one-time', rewards: [{ id: 'couple_title', name: '仙侣称号', amount: 1 }] }
      ]
    },
    {
      id: 'weekly_blessing',
      name: '周末加成',
      description: '周末修炼，经验加成',
      type: 'weekly',
      startTime: 0, // 每周自动计算
      endTime: 0,
      active: true,
      rewards: [
        { type: 'daily', rewards: [{ id: 'exp_boost', name: '经验加成', amount: 30 }] }
      ]
    }
  ];
  
  constructor() {
    this.initDefaultEvents();
  }
  
  /**
   * 初始化默认节日
   */
  private initDefaultEvents(): void {
    for (const event of this.defaultEvents) {
      this.events.set(event.id, event);
    }
  }
  
  /**
   * 获取节日时间
   */
  private getFestivalTime(type: string): number {
    const now = new Date();
    const year = now.getFullYear();
    
    // 简单节假日时间计算 (实际应该从配置读取)
    const festivals: Record<string, Date> = {
      'spring': new Date(year, 0, 25),        // 春节 (农历正月初一)
      'mid_autumn': new Date(year, 8, 15),    // 中秋节 (农历八月十五)
      'valentine': new Date(year, 1, 14)      // 情人节
    };
    
    const festival = festivals[type];
    if (!festival) return now.getTime();
    
    // 如果已过，推到下一年
    if (festival.getTime() < now.getTime()) {
      festival.setFullYear(year + 1);
    }
    
    return festival.getTime();
  }
  
  /**
   * 获取当前活动列表
   */
  getActiveEvents(): HolidayEvent[] {
    const now = Date.now();
    const activeEvents: HolidayEvent[] = [];
    
    for (const event of this.events.values()) {
      if (event.active && now >= event.startTime && now <= event.endTime) {
        activeEvents.push(event);
      }
    }
    
    return activeEvents;
  }
  
  /**
   * 获取所有活动
   */
  getAllEvents(): HolidayEvent[] {
    return Array.from(this.events.values());
  }
  
  /**
   * 获取活动详情
   */
  getEvent(eventId: string): HolidayEvent | undefined {
    return this.events.get(eventId);
  }
  
  /**
   * 玩家参与活动
   */
  joinEvent(playerId: string, eventId: string): {
    success: boolean;
    message: string;
    event?: HolidayEvent;
  } {
    const event = this.events.get(eventId);
    if (!event) {
      return { success: false, message: '活动不存在' };
    }
    
    // 检查活动是否开启
    const now = Date.now();
    if (now < event.startTime || now > event.endTime) {
      return { success: false, message: '活动未开启' };
    }
    
    // 检查条件
    if (event.conditions?.minLevel && event.conditions.minLevel > 1) {
      // 需要检查玩家等级
    }
    
    // 检查是否已参与
    const playerEvents = this.getPlayerEvents(playerId);
    if (playerEvents.find(e => e.eventId === eventId)) {
      return { success: false, message: '已参与该活动' };
    }
    
    // 记录参与
    const eventData: PlayerEventData = {
      playerId,
      eventId,
      progress: 0,
      claimedDays: [],
      claimedCumulative: [],
      joinTime: now
    };
    
    const key = `player:${playerId}:events`;
    if (!this.playerEventData.has(key)) {
      this.playerEventData.set(key, []);
    }
    this.playerEventData.get(key)!.push(eventData);
    
    return {
      success: true,
      message: '活动参与成功',
      event
    };
  }
  
  /**
   * 获取玩家参与的活动
   */
  getPlayerEvents(playerId: string): PlayerEventData[] {
    const key = `player:${playerId}:events`;
    return this.playerEventData.get(key) || [];
  }
  
  /**
   * 领取每日奖励
   */
  claimDailyReward(playerId: string, eventId: string, day: number): {
    success: boolean;
    message: string;
    rewards?: Array<{ id: string; name: string; amount: number }>;
  } {
    const event = this.events.get(eventId);
    if (!event) {
      return { success: false, message: '活动不存在' };
    }
    
    const playerEvents = this.getPlayerEvents(playerId);
    const playerEvent = playerEvents.find(e => e.eventId === eventId);
    
    if (!playerEvent) {
      return { success: false, message: '未参与该活动' };
    }
    
    // 检查是否已领取
    if (playerEvent.claimedDays.includes(day)) {
      return { success: false, message: '今日奖励已领取' };
    }
    
    // 获取奖励
    const reward = event.rewards.find(r => r.type === 'daily');
    if (!reward) {
      return { success: false, message: '无每日奖励' };
    }
    
    // 记录领取
    playerEvent.claimedDays.push(day);
    playerEvent.progress++;
    
    return {
      success: true,
      message: '奖励领取成功',
      rewards: reward.rewards
    };
  }
  
  /**
   * 领取累计奖励
   */
  claimCumulativeReward(playerId: string, eventId: string, day: number): {
    success: boolean;
    message: string;
    rewards?: Array<{ id: string; name: string; amount: number }>;
  } {
    const event = this.events.get(eventId);
    if (!event) {
      return { success: false, message: '活动不存在' };
    }
    
    const playerEvents = this.getPlayerEvents(playerId);
    const playerEvent = playerEvents.find(e => e.eventId === eventId);
    
    if (!playerEvent) {
      return { success: false, message: '未参与该活动' };
    }
    
    // 检查是否已领取
    if (playerEvent.claimedCumulative.includes(day)) {
      return { success: false, message: '累计奖励已领取' };
    }
    
    // 检查进度
    if (playerEvent.progress < day) {
      return { success: false, message: '进度不足' };
    }
    
    // 获取奖励
    const reward = event.rewards.find(r => r.day === day && r.type === 'cumulative');
    if (!reward) {
      return { success: false, message: '无累计奖励' };
    }
    
    // 记录领取
    playerEvent.claimedCumulative.push(day);
    
    return {
      success: true,
      message: '累计奖励领取成功',
      rewards: reward.rewards
    };
  }
  
  /**
   * 获取玩家活动进度
   */
  getPlayerEventProgress(playerId: string, eventId: string): PlayerEventData | null {
    const playerEvents = this.getPlayerEvents(playerId);
    return playerEvents.find(e => e.eventId === eventId) || null;
  }
  
  /**
   * 增加活跃度
   */
  addActivity(playerId: string, amount: number): void {
    const data = this.getPlayerActivityData(playerId);
    const today = this.getDateString();
    const weekStart = this.getWeekStart();
    
    // 每日重置
    if (data.lastActivityDate !== today) {
      data.dailyActivity = 0;
      data.lastActivityDate = today;
    }
    
    // 每周重置
    if (data.lastWeeklyReset !== weekStart) {
      data.weeklyActivity = 0;
      data.lastWeeklyReset = weekStart;
    }
    
    data.dailyActivity += amount;
    data.weeklyActivity += amount;
  }
  
  /**
   * 获取玩家活跃度数据
   */
  getPlayerActivityData(playerId: string): PlayerActivityData {
    if (!this.playerActivityData.has(playerId)) {
      const today = this.getDateString();
      const weekStart = this.getWeekStart();
      
      this.playerActivityData.set(playerId, {
        playerId,
        dailyActivity: 0,
        weeklyActivity: 0,
        lastActivityDate: today,
        lastWeeklyReset: weekStart
      });
    }
    
    return this.playerActivityData.get(playerId)!;
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
   * 获取周开始日期
   */
  private getWeekStart(): string {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
    return this.getDateString(weekStart);
  }
  
  /**
   * 创建自定义活动
   */
  createEvent(event: HolidayEvent): void {
    this.events.set(event.id, event);
  }
  
  /**
   * 结束活动
   */
  endEvent(eventId: string): void {
    const event = this.events.get(eventId);
    if (event) {
      event.active = false;
      event.endTime = Date.now();
    }
  }
}

export const holidayEventSystem = new HolidayEventSystem();
export default HolidayEventSystem;
