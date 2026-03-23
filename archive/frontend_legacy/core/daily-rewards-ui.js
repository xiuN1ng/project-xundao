// ==================== 每日奖励系统 ====================
// 每日奖励数据配置
const dailyBonusConfig = {
  days: [
    { day: 1, spiritStones: 100, spirit: 1000, items: [] },
    { day: 2, spiritStones: 200, spirit: 2000, items: [{ name: '下品灵石袋', count: 1 }] },
    { day: 3, spiritStones: 300, spirit: 3000, items: [{ name: '中品灵石袋', count: 1 }] },
    { day: 4, spiritStones: 400, spirit: 4000, items: [] },
    { day: 5, spiritStones: 500, spirit: 5000, items: [{ name: '上品灵石袋', count: 1 }] },
    { day: 6, spiritStones: 600, spirit: 6000, items: [] },
    { day: 7, spiritStones: 1000, spirit: 10000, items: [{ name: '极品灵石袋', count: 1 }, { name: '筑基丹', count: 1 }] }
  ]
};

// 每日奖励本地存储键
const DAILY_BONUS_KEY = 'xundao_daily_bonus';

// 获取每日奖励数据
function getDailyBonusData() {
  const saved = localStorage.getItem(DAILY_BONUS_KEY);
  if (saved) {
    return JSON.parse(saved);
  }
  return {
    totalDays: 0,
    lastClaimDate: null,
    claimedDays: [],
    currentCycle: 1
  };
}

// 保存每日奖励数据
function saveDailyBonusData(data) {
  localStorage.setItem(DAILY_BONUS_KEY, JSON.stringify(data));
}

// 检查是否可以领取今日奖励
function canClaimToday(bonusData) {
  if (!bonusData.lastClaimDate) return true;
  const today = new Date().toDateString();
  const lastClaim = new Date(bonusData.lastClaimDate).toDateString();
  return today !== lastClaim;
}

// 获取今日应该领取的奖励天数
function getTodayClaimDay(bonusData) {
  if (!bonusData.lastClaimDate) return 1;
  const today = new Date().toDateString();
  const lastClaim = new Date(bonusData.lastClaimDate).toDateString();
  if (today === lastClaim) return null; // 今日已领取

  const lastClaimDay = new Date(bonusData.lastClaimDate);
  const todayDate = new Date();
  const diffDays = Math.floor((todayDate - lastClaimDay) / (1000 * 60 * 60 * 24));

  if (diffDays >= 1) {
    // 检查是否连续登录
    const nextDay = (bonusData.totalDays % 7) + 1;
    return nextDay;
  }
  return null;
}

// 排行榜类型配置
const RANKING_TYPES = {
  'realm': { name: '境界排行', icon: '🧘', color: '#FFD700', api: 'realm' },
  'spiritStones': { name: '灵石排行', icon: '💎', color: '#4ecdc4', api: 'spiritStones' },
  'level': { name: '等级排行', icon: '⭐', color: '#667eea', api: 'level' },
  'achievement': { name: '成就排行', icon: '🏅', color: '#ef4444', api: 'achievement' }
};

let currentRankingType = 'realm';

