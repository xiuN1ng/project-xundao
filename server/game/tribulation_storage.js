/**
 * 渡劫存储 - 渡劫会话与动画阶段管理
 * 支持前端天劫动画的阶段数据
 */

// DB not available in this module
const db = null;

// 渡劫会话状态
const SESSION_STATUS = {
  PENDING: 'pending',     // 等待开始
  ANIMATING: 'animating', // 动画播放中
  COMPLETED: 'completed', // 已完成
  EXPIRED: 'expired'      // 已过期/放弃
};

// 天劫动画阶段配置
const TRIBULATION_ANIM_PHASES = {
  metal: {
    id: 'metal',
    name: '金劫',
    totalPhases: 5,
    phases: [
      { phase: 1, name: '天雷降临', duration: 1500, emoji: '⚡', description: '金色天雷从九霄云外凝聚', effect: 'lightning_gather' },
      { phase: 2, name: '金光破空', duration: 1200, emoji: '✨', description: '金光撕裂天空，直指修士', effect: 'golden_beam' },
      { phase: 3, name: '金雷灌顶', duration: 1000, emoji: '💥', description: '金色雷劫灌入体内', effect: 'thunder_strike' },
      { phase: 4, name: '金气淬体', duration: 800, emoji: '🛡️', description: '金属性灵气淬炼肉身', effect: 'spirit_bathing' },
      { phase: 5, name: '金劫散尽', duration: 600, emoji: '🎊', description: '金劫散去，功德圆满', effect: 'tribulation_end' }
    ]
  },
  wood: {
    id: 'wood',
    name: '木劫',
    totalPhases: 5,
    phases: [
      { phase: 1, name: '木灵觉醒', duration: 1500, emoji: '🌿', description: '木属性灵气汇聚成灵', effect: 'wood_gather' },
      { phase: 2, name: '藤蔓缚身', duration: 1200, emoji: '🌱', description: '雷藤缠绕，考验韧性', effect: 'vine_bind' },
      { phase: 3, name: '木雷交加', duration: 1000, emoji: '⚡', description: '木雷双重考验', effect: 'thunder_wood' },
      { phase: 4, name: '生机复苏', duration: 800, emoji: '🌸', description: '雷霆过后，生机复苏', effect: 'revival' },
      { phase: 5, name: '木劫化尽', duration: 600, emoji: '🎊', description: '木劫消散，道心更坚', effect: 'tribulation_end' }
    ]
  },
  water: {
    id: 'water',
    name: '水劫',
    totalPhases: 5,
    phases: [
      { phase: 1, name: '水幕遮天', duration: 1500, emoji: '🌧️', description: '滔天洪水从天而降', effect: 'water_fall' },
      { phase: 2, name: '寒冰封灵', duration: 1200, emoji: '🧊', description: '寒冰试图封住灵识', effect: 'ice_seal' },
      { phase: 3, name: '水雷共振', duration: 1000, emoji: '⚡', description: '水雷共鸣，考验变化', effect: 'thunder_resonance' },
      { phase: 4, name: '水润万物', duration: 800, emoji: '💧', description: '水属性滋养周身', effect: 'water_nourish' },
      { phase: 5, name: '水劫归一', duration: 600, emoji: '🎊', description: '水劫化入体内，灵动倍增', effect: 'tribulation_end' }
    ]
  },
  fire: {
    id: 'fire',
    name: '火劫',
    totalPhases: 5,
    phases: [
      { phase: 1, name: '业火焚天', duration: 1500, emoji: '🔥', description: '红色火焰铺天盖地', effect: 'fire_gather' },
      { phase: 2, name: '烈焰焚身', duration: 1200, emoji: '💢', description: '火焰灼烧修士肉身', effect: 'fire_burn' },
      { phase: 3, name: '火雷合一', duration: 1000, emoji: '⚡', description: '火与雷交织成劫', effect: 'fire_thunder' },
      { phase: 4, name: '涅槃重生', duration: 800, emoji: '🔥', description: '浴火重生，脱胎换骨', effect: 'rebirth' },
      { phase: 5, name: '火劫涅盘', duration: 600, emoji: '🎊', description: '火劫散去，肉身成圣', effect: 'tribulation_end' }
    ]
  },
  earth: {
    id: 'earth',
    name: '土劫',
    totalPhases: 5,
    phases: [
      { phase: 1, name: '大地崩裂', duration: 1500, emoji: '🌋', description: '山川崩裂，大地震动', effect: 'earthquake' },
      { phase: 2, name: '山岳压顶', duration: 1200, emoji: '🏔️', description: '山岳虚影压向修士', effect: 'mountain_press' },
      { phase: 3, name: '土雷地动', duration: 1000, emoji: '⚡', description: '土雷从地底爆发', effect: 'earth_thunder' },
      { phase: 4, name: '厚德载物', duration: 800, emoji: '🪨', description: '土属性灵气温养', effect: 'earth_nourish' },
      { phase: 5, name: '土劫承地', duration: 600, emoji: '🎊', description: '土劫融入体魄，稳重如山', effect: 'tribulation_end' }
    ]
  },
  heart_demon: {
    id: 'heart_demon',
    name: '心魔劫',
    totalPhases: 6,
    phases: [
      { phase: 1, name: '心魔初现', duration: 1500, emoji: '😈', description: '心魔从识海深处苏醒', effect: 'demon_appear' },
      { phase: 2, name: '心魔乱神', duration: 1200, emoji: '👻', description: '心魔化作幻象干扰神识', effect: 'demon_haunt' },
      { phase: 3, name: '魔影缠身', duration: 1000, emoji: '💀', description: '魔影缠绕，试图吞噬', effect: 'demon_bind' },
      { phase: 4, name: '道心照明', duration: 800, emoji: '💡', description: '道心通明，驱散心魔', effect: 'willpower_light' },
      { phase: 5, name: '斩灭心魔', duration: 800, emoji: '⚔️', description: '以道心之力斩灭心魔', effect: 'demon_slayer' },
      { phase: 6, name: '心境圆满', duration: 600, emoji: '🎊', description: '心境圆满，道行大增', effect: 'tribulation_end' }
    ]
  },
  celestial: {
    id: 'celestial',
    name: '九天雷劫',
    totalPhases: 9,
    phases: [
      { phase: 1, name: '九霄云动', duration: 1200, emoji: '☁️', description: '九霄之上，风云变色', effect: 'sky_darken' },
      { phase: 2, name: '第一道雷', duration: 800, emoji: '⚡', description: '第一道天雷降临', effect: 'thunder_1' },
      { phase: 3, name: '第二道雷', duration: 800, emoji: '⚡', description: '第二道天雷紧随', effect: 'thunder_2' },
      { phase: 4, name: '第三至五道雷', duration: 1000, emoji: '⚡', description: '连续三道天雷轰击', effect: 'thunder_345' },
      { phase: 5, name: '第六道雷', duration: 800, emoji: '⚡', description: '第六道天雷威力剧增', effect: 'thunder_6' },
      { phase: 6, name: '第七道雷', duration: 800, emoji: '⚡', description: '第七道天雷毁天灭地', effect: 'thunder_7' },
      { phase: 7, name: '第八道雷', duration: 900, emoji: '⚡', description: '第八道天雷最为凶险', effect: 'thunder_8' },
      { phase: 8, name: '最终天雷', duration: 1200, emoji: '💥', description: '第九道天雷决定成败', effect: 'thunder_final' },
      { phase: 9, name: '雷云消散', duration: 600, emoji: '🎊', description: '九天雷劫散去', effect: 'tribulation_end' }
    ]
  },
  chaos: {
    id: 'chaos',
    name: '混沌天劫',
    totalPhases: 7,
    phases: [
      { phase: 1, name: '混沌开天', duration: 2000, emoji: '🌀', description: '混沌之力开辟，天地变色', effect: 'chaos_open' },
      { phase: 2, name: '天雷地火', duration: 1500, emoji: '🔥', description: '天地之威同时降临', effect: 'chaos_element' },
      { phase: 3, name: '万物归尘', duration: 1200, emoji: '🌑', description: '混沌之力吞噬一切', effect: 'chaos_consume' },
      { phase: 4, name: '道心种魔', duration: 1000, emoji: '💀', description: '心魔与天劫合一', effect: 'chaos_demon' },
      { phase: 5, name: '逆天改命', duration: 1200, emoji: '⚔️', description: '以凡人之躯对抗天道', effect: 'defy_heaven' },
      { phase: 6, name: '混沌炼体', duration: 1000, emoji: '✨', description: '混沌之力重塑肉身', effect: 'chaos_body' },
      { phase: 7, name: '混沌归一', duration: 800, emoji: '🎊', description: '混沌归一，功德圆满', effect: 'tribulation_end' }
    ]
  }
};

// 飞升特殊奖励配置
const ASCENSION_REWARDS = {
  // 大乘→飞升的特殊奖励
  '大乘→飞升': {
    title: '飞升成就',
    spirit: 100000000,
    spiritStones: 20000000,
    items: [
      { id: 'immortal_robe', name: '仙袍·天羽', count: 1 },
      { id: 'immortal_sword', name: '仙剑·太虚', count: 1 },
      { id: 'celestial_jade', name: '天元丹', count: 3 }
    ],
    title_reward: '飞升仙人',
    aura: 'celestial_light',
    broadcast: true
  }
};

// 创建渡劫会话
function createSession(playerId, tribulationType, difficulty) {
  const sessionId = `trib_${playerId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = Date.now();
  const expiresAt = now + 30 * 60 * 1000; // 30分钟过期
  
  // 获取动画配置
  const animConfig = TRIBULATION_ANIM_PHASES[tribulationType] || TRIBULATION_ANIM_PHASES.water;
  
  // 存储会话（内存缓存 + 可选DB持久化）
  const session = {
    sessionId,
    playerId,
    tribulationType,
    difficulty: difficulty || 'normal',
    status: SESSION_STATUS.PENDING,
    currentPhase: 0,
    totalPhases: animConfig.totalPhases,
    phases: animConfig.phases,
    createdAt: now,
    expiresAt,
    result: null,
    successRate: 0,
    rewards: null
  };
  
  // 保存到内存
  SESSIONS.set(sessionId, session);
  
  return session;
}

// 获取会话
function getSession(sessionId) {
  return SESSIONS.get(sessionId) || null;
}

// 获取玩家的进行中会话
function getPlayerActiveSession(playerId) {
  for (const [id, session] of SESSIONS) {
    if (session.playerId === playerId && 
        (session.status === SESSION_STATUS.PENDING || session.status === SESSION_STATUS.ANIMATING)) {
      return session;
    }
  }
  return null;
}

// 更新会话阶段
function advancePhase(sessionId) {
  const session = SESSIONS.get(sessionId);
  if (!session) return null;
  
  session.currentPhase++;
  if (session.currentPhase >= session.totalPhases) {
    session.status = SESSION_STATUS.COMPLETED;
  }
  
  return session;
}

// 完成会话（设置结果）
function completeSession(sessionId, success, rewards) {
  const session = SESSIONS.get(sessionId);
  if (!session) return null;
  
  session.status = SESSION_STATUS.COMPLETED;
  session.result = success ? 'success' : 'failed';
  session.rewards = rewards;
  
  return session;
}

// 获取动画配置
function getAnimConfig(tribulationType) {
  return TRIBULATION_ANIM_PHASES[tribulationType] || TRIBULATION_ANIM_PHASES.water;
}

// 获取所有动画配置
function getAllAnimConfigs() {
  return TRIBULATION_ANIM_PHASES;
}

// 计算渡劫成功率（详细版）
function calculateSuccessRateDetailed(playerRealmLevel, tribulationType, difficulty, bonusItems = []) {
  const tribType = TRIBULATION_TYPES[tribulationType] || TRIBULATION_TYPES.water;
  const diffConfig = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.normal;
  
  // 基础成功率
  let baseRate = tribType.base_success_rate;
  
  // 境界修正（境界越高，成功率越低）
  const realmModifier = 0.1 - (playerRealmLevel * 0.05);
  baseRate = Math.max(0.1, baseRate + realmModifier);
  
  // 道具加成
  let bonusRate = 0;
  for (const itemId of bonusItems) {
    const item = PROTECTION_ITEMS[itemId];
    if (item && item.success_bonus) {
      bonusRate += item.success_bonus;
    }
  }
  
  // 难度修正
  const diffPenalty = diffConfig.success_rate_modifier;
  
  // 飞升加成（大乘期渡劫有额外祝福）
  let ascensionBonus = 0;
  if (playerRealmLevel >= 7) {
    ascensionBonus = 0.05; // 大乘期额外5%成功率
  }
  
  const finalRate = Math.min(0.98, Math.max(0.01, baseRate + bonusRate + diffPenalty + ascensionBonus));
  
  return {
    baseRate: Math.round(baseRate * 100),
    bonusRate: Math.round(bonusRate * 100),
    diffPenalty: Math.round(diffPenalty * 100),
    ascensionBonus: Math.round(ascensionBonus * 100),
    finalRate: Math.round(finalRate * 100),
    breakdown: {
      tribulation_type: tribType.name,
      difficulty: diffConfig.name,
      realm_level: playerRealmLevel
    }
  };
}

// 计算飞升奖励
function calculateAscensionRewards(fromRealm, toRealm, difficulty) {
  const diffConfig = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.normal;
  const multiplier = diffConfig.reward_multiplier;
  
  // 先检查是否有特殊飞升奖励
  const key = `${fromRealm}→${toRealm}`;
  if (ASCENSION_REWARDS[key]) {
    return { ...ASCENSION_REWARDS[key], multiplier };
  }
  
  // 标准奖励
  const baseRewards = {
    spirit: 10000 * multiplier,
    spiritStones: 500 * multiplier,
    items: []
  };
  
  // 难度额外奖励
  if (difficulty === 'nightmare' || difficulty === 'legendary') {
    baseRewards.items.push({ id: 'tribulation_spirit', name: '渡劫精魄', count: difficulty === 'legendary' ? 10 : 5 });
  }
  
  return { ...baseRewards, multiplier };
}

// 清理过期会话（定时清理）
function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [id, session] of SESSIONS) {
    if (session.expiresAt < now && session.status !== SESSION_STATUS.COMPLETED) {
      session.status = SESSION_STATUS.EXPIRED;
    }
  }
}

// 内存会话存储
const SESSIONS = new Map();

// 启动定期清理（每5分钟）
setInterval(cleanupExpiredSessions, 5 * 60 * 1000);

// 外部引用（用于成功率计算）
let TRIBULATION_TYPES = {};
let DIFFICULTY_CONFIG = {};
let PROTECTION_ITEMS = {};

function configure(refs) {
  if (refs.TRIBULATION_TYPES) TRIBULATION_TYPES = refs.TRIBULATION_TYPES;
  if (refs.DIFFICULTY_CONFIG) DIFFICULTY_CONFIG = refs.DIFFICULTY_CONFIG;
  if (refs.PROTECTION_ITEMS) PROTECTION_ITEMS = refs.PROTECTION_ITEMS;
}

module.exports = {
  SESSION_STATUS,
  TRIBULATION_ANIM_PHASES,
  ASCENSION_REWARDS,
  createSession,
  getSession,
  getPlayerActiveSession,
  advancePhase,
  completeSession,
  getAnimConfig,
  getAllAnimConfigs,
  calculateSuccessRateDetailed,
  calculateAscensionRewards,
  cleanupExpiredSessions,
  configure
};
