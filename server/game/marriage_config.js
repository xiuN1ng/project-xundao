/**
 * 婚姻系统配置
 */

const MARRIAGE_CONFIG = {
  // 结婚条件
  REQUIREMENTS: {
    MIN_LEVEL: 30,              // 最低等级要求
    MIN_INTIMACY: 1000,         // 最低亲密度要求（求婚时）
    PROPOSE_COST: 9999,         // 求婚花费灵石
    DAILY_INTIMACY_CAP: 500,    // 每日亲密度上限
  },

  // 亲密度获取方式
  INTIMACY_GAIN: {
    DAILY_INTERACTION: 10,       // 每日互动+10
    GIFT_STONE_10: 5,            // 赠送10灵石礼物+5
    GIFT_STONE_100: 50,          // 赠送100灵石礼物+50
    GIFT_STONE_1000: 500,        // 赠送1000灵石礼物+500
    GIFT_HERB: 30,               // 赠送灵草+30
    GIFT_PILL: 100,              // 赠送丹药+100
    SHARED_CULTIVATION: 20,      // 双修一次+20
    SHARED_DUNGEON: 30,          // 一起副本+30
    WISH_EACH_OTHER: 5,          // 每日互相祝福+5
  },

  // 亲密度等级
  INTIMACY_LEVELS: [
    { level: 1, name: '陌生', min: 0 },
    { level: 2, name: '相识', min: 100 },
    { level: 3, name: '好感', min: 500 },
    { level: 4, name: '喜欢', min: 1000 },
    { level: 5, name: '深爱', min: 5000 },
    { level: 6, name: '生死相依', min: 20000 },
  ],

  // 离婚代价
  DIVORCE: {
    COST_STONES: 5000,          // 离婚花费5000灵石
    COOLDOWN_HOURS: 24,          // 离婚后24小时不能再次求婚
  },

  // 戒指等级（影响双修加成）
  RING_LEVELS: [
    { quality: 'iron', name: '玄铁戒', atk_bonus: 0.05, def_bonus: 0.05, spirit_bonus: 0.05, cost: 1000 },
    { quality: 'silver', name: '白银戒', atk_bonus: 0.10, def_bonus: 0.10, spirit_bonus: 0.10, cost: 5000 },
    { quality: 'gold', name: '金灵戒', atk_bonus: 0.15, def_bonus: 0.15, spirit_bonus: 0.15, cost: 20000 },
    { quality: 'jade', name: '玉心戒', atk_bonus: 0.20, def_bonus: 0.20, spirit_bonus: 0.20, cost: 50000 },
    { quality: 'heavenly', name: '同心戒', atk_bonus: 0.30, def_bonus: 0.30, spirit_bonus: 0.30, cost: 100000 },
  ],

  // 双修配置
  SHARED_CULTIVATION: {
    BASE_EXP: 100,              // 基础双修经验
    LEVEL_BONUS: 5,             // 每级+5%经验
    REALM_BONUS: 10,            // 每境界+10%经验
    RING_BONUS_MAX: 0.50,       // 戒指最高+50%经验
    DURATION_MINUTES: 30,       // 每次双修需要30分钟
    DAILY_LIMIT: 3,             // 每日双修次数限制
  },
};

// 礼物配置
const MARRIAGE_GIFTS = {
  'stone_10': { name: '10灵石', cost: 10, intimacy: 5, icon: '🪙' },
  'stone_100': { name: '100灵石', cost: 100, intimacy: 50, icon: '💰' },
  'stone_1000': { name: '1000灵石', cost: 1000, intimacy: 500, icon: '💎' },
  'herb': { name: '灵草', cost: 100, intimacy: 30, icon: '🌿' },
  'pill': { name: '丹药', cost: 500, intimacy: 100, icon: '💊' },
  'fairy_grass': { name: '仙灵草', cost: 2000, intimacy: 300, icon: '✨' },
  'dragon_blood': { name: '龙血', cost: 5000, intimacy: 800, icon: '🐉' },
};

module.exports = { MARRIAGE_CONFIG, MARRIAGE_GIFTS };
