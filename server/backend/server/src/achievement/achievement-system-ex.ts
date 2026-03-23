// 成就系统扩展 - 成就特效与成就分享
// 基于 target-system.ts 的成就系统进行扩展

export interface Achievement {
  achievementId: string
  name: string
  nameCN: string
  description: string
  category: AchievementCategory
  // 条件
  requirement: {
    type: AchievementType
    targetId: string
    count: number
  }
  // 奖励
  rewards: {
    gold?: number
    exp?: number
    items?: Array<{ itemId: string; itemNameCN: string; count: number }>
    title?: string
    point?: number  // 成就点数
  }
  // 成就特效
  effect?: AchievementEffect
  // 分享奖励
  shareReward?: {
    enabled: boolean
    rewards: {
      gold?: number
      exp?: number
      point?: number
    }
  }
}

export type AchievementCategory = 
  | 'combat'      // 战斗成就
  | 'collection'  // 收集成就
  | 'social'      // 社交成就
  | 'explore'     // 探索成就
  | 'wealth'      // 财富成就
  | 'special'     // 特殊成就
  | 'season'      // 赛季成就

export type AchievementType = 
  | 'kill' | 'pvp' | 'dungeon' | 'boss'
  | 'item' | 'equipment' | 'pet'
  | 'friend' | 'guild' | 'couple' | 'master'
  | 'map' | 'quest' | 'realm'
  | 'gold' | 'spirit_stone' | 'recharge'
  | 'login' | 'time' | 'custom'

// 成就特效配置
export interface AchievementEffect {
  // 特效类型
  type: 'particle' | 'sound' | 'title' | 'badge' | 'border' | 'avatar_frame' | 'emote'
  // 特效ID
  effectId: string
  // 特效等级
  level: number
  // 是否在达成时显示
  showOnComplete: boolean
  // 是否永久拥有
  permanent: boolean
  // 持续时间（毫秒），0表示永久
  duration?: number
  // 特效参数
  params?: {
    color?: string
    animation?: string
    soundId?: string
  }
}

// 成就分享配置
export interface ShareConfig {
  // 是否启用分享
  enabled: boolean
  // 分享平台
  platforms: Array<'feishu' | 'wechat' | ' Moments' | 'qq' | 'custom'>
  // 分享模板
  templates: {
    default: string
    custom: { [key: string]: string }
  }
  // 分享奖励配置
  rewardConfig: {
    // 首次分享奖励
    firstShare: { gold: number; exp: number }
    // 每日分享奖励
    dailyShare: { gold: number; exp: number }
    // 每日分享上限
    dailyLimit: number
  }
}

// 玩家成就数据
export interface PlayerAchievement {
  achievementId: string
  playerId: string
  progress: number
  completed: boolean
  completedTime?: number
  claimed: boolean      // 奖励是否已领取
  shared: boolean       // 是否已分享
  firstShareTime?: number
  effectActive: boolean // 特效是否激活
  effectEndTime?: number
}

// 成就特效库
export const ACHIEVEMENT_EFFECTS: { [key: string]: AchievementEffect } = {
  // 粒子特效
  particle_fire: {
    type: 'particle',
    effectId: 'fire',
    level: 1,
    showOnComplete: true,
    permanent: false,
    duration: 60000,
    params: { color: '#FF4500', animation: 'fountain' }
  },
  particle_gold: {
    type: 'particle',
    effectId: 'gold_rain',
    level: 2,
    showOnComplete: true,
    permanent: false,
    duration: 120000,
    params: { color: '#FFD700', animation: 'rain' }
  },
  particle_rainbow: {
    type: 'particle',
    effectId: 'rainbow',
    level: 3,
    showOnComplete: true,
    permanent: false,
    duration: 180000,
    params: { color: '#FF00FF', animation: 'rainbow' }
  },
  // 称号特效
  title_glow: {
    type: 'title',
    effectId: 'glow',
    level: 1,
    showOnComplete: true,
    permanent: true,
    params: { color: '#FFD700', animation: 'pulse' }
  },
  // 徽章特效
  badge_shine: {
    type: 'badge',
    effectId: 'shine',
    level: 1,
    showOnComplete: true,
    permanent: true,
    params: { color: '#00FF00', animation: 'shine' }
  },
  // 头像框特效
  avatar_frame_diamond: {
    type: 'avatar_frame',
    effectId: 'diamond',
    level: 2,
    showOnComplete: true,
    permanent: true,
    params: { color: '#B9F2FF', animation: 'shimmer' }
  },
  avatar_frame_legend: {
    type: 'avatar_frame',
    effectId: 'legend',
    level: 3,
    showOnComplete: true,
    permanent: true,
    params: { color: '#FFD700', animation: 'legendary' }
  },
  // 表情特效
  emote_celebration: {
    type: 'emote',
    effectId: 'celebration',
    level: 1,
    showOnComplete: true,
    permanent: false,
    duration: 30000,
    params: { animation: 'dance' }
  },
  // 音效特效
  sound_fanfare: {
    type: 'sound',
    effectId: 'fanfare',
    level: 1,
    showOnComplete: true,
    permanent: true,
    params: { soundId: 'fanfare_1' }
  },
  sound_legendary: {
    type: 'sound',
    effectId: 'legendary_achievement',
    level: 2,
    showOnComplete: true,
    permanent: true,
    params: { soundId: 'legendary_1' }
  }
}

// 成就配置
export const ACHIEVEMENTS: Achievement[] = [
  // ========== 前期成就 - 成长篇 ==========
  {
    achievementId: 'early_level_5',
    name: 'Novice Cultivator',
    nameCN: '初入仙途',
    description: '达到5级',
    category: 'combat',
    requirement: { type: 'custom', targetId: 'level', count: 5 },
    rewards: { gold: 50, exp: 200, point: 5 },
    shareReward: { enabled: true, rewards: { gold: 5, exp: 20, point: 1 } }
  },
  {
    achievementId: 'early_level_10',
    name: 'Apprentice Cultivator',
    nameCN: '初窥门径',
    description: '达到10级',
    category: 'combat',
    requirement: { type: 'custom', targetId: 'level', count: 10 },
    rewards: { gold: 100, exp: 500, point: 10 },
    shareReward: { enabled: true, rewards: { gold: 10, exp: 50, point: 1 } }
  },
  {
    achievementId: 'early_level_20',
    name: 'Junior Cultivator',
    nameCN: '小有所成',
    description: '达到20级',
    category: 'combat',
    requirement: { type: 'custom', targetId: 'level', count: 20 },
    rewards: { gold: 200, exp: 1000, point: 20 },
    shareReward: { enabled: true, rewards: { gold: 20, exp: 100, point: 2 } }
  },
  // ========== 前期成就 - 战斗篇 ==========
  {
    achievementId: 'early_kill_10',
    name: 'First Blood',
    nameCN: '初试锋芒',
    description: '击败10只怪物',
    category: 'combat',
    requirement: { type: 'kill', targetId: 'monster', count: 10 },
    rewards: { gold: 50, exp: 200, point: 5 },
    shareReward: { enabled: true, rewards: { gold: 5, exp: 20, point: 1 } }
  },
  {
    achievementId: 'early_kill_50',
    name: 'Monster Hunter',
    nameCN: '小试牛刀',
    description: '击败50只怪物',
    category: 'combat',
    requirement: { type: 'kill', targetId: 'monster', count: 50 },
    rewards: { gold: 100, exp: 500, point: 10 },
    shareReward: { enabled: true, rewards: { gold: 10, exp: 50, point: 1 } }
  },
  {
    achievementId: 'early_dungeon_1',
    name: 'Dungeon Beginner',
    nameCN: '初入副本',
    description: '通关1次副本',
    category: 'combat',
    requirement: { type: 'dungeon', targetId: 'clear', count: 1 },
    rewards: { gold: 100, exp: 500, point: 10 },
    shareReward: { enabled: true, rewards: { gold: 10, exp: 50, point: 1 } }
  },
  {
    achievementId: 'early_dungeon_3',
    name: 'Dungeon Explorer',
    nameCN: '副本探索者',
    description: '通关3次副本',
    category: 'combat',
    requirement: { type: 'dungeon', targetId: 'clear', count: 3 },
    rewards: { gold: 200, exp: 1000, point: 20 },
    shareReward: { enabled: true, rewards: { gold: 20, exp: 100, point: 2 } }
  },
  {
    achievementId: 'early_pvp_1',
    name: 'PvP Debut',
    nameCN: '初战竞技',
    description: 'PVP获得1场胜利',
    category: 'combat',
    requirement: { type: 'pvp', targetId: 'win', count: 1 },
    rewards: { gold: 50, exp: 300, point: 5 },
    shareReward: { enabled: true, rewards: { gold: 5, exp: 30, point: 1 } }
  },
  {
    achievementId: 'early_pvp_5',
    name: 'PvP Fighter',
    nameCN: '竞技新星',
    description: 'PVP获得5场胜利',
    category: 'combat',
    requirement: { type: 'pvp', targetId: 'win', count: 5 },
    rewards: { gold: 150, exp: 800, point: 15 },
    shareReward: { enabled: true, rewards: { gold: 15, exp: 80, point: 2 } }
  },
  // ========== 前期成就 - 社交篇 ==========
  {
    achievementId: 'early_friend_1',
    name: 'First Friend',
    nameCN: '初识同道',
    description: '添加1个好友',
    category: 'social',
    requirement: { type: 'friend', targetId: 'count', count: 1 },
    rewards: { gold: 30, exp: 100, point: 3 },
    shareReward: { enabled: true, rewards: { gold: 3, exp: 10, point: 1 } }
  },
  {
    achievementId: 'early_friend_5',
    name: 'Social Beginner',
    nameCN: '结交同道',
    description: '添加5个好友',
    category: 'social',
    requirement: { type: 'friend', targetId: 'count', count: 5 },
    rewards: { gold: 80, exp: 400, point: 8 },
    shareReward: { enabled: true, rewards: { gold: 8, exp: 40, point: 1 } }
  },
  {
    achievementId: 'early_guild_1',
    name: 'Sect Member',
    nameCN: '加入宗门',
    description: '加入或创建一个宗门',
    category: 'social',
    requirement: { type: 'guild', targetId: 'join', count: 1 },
    rewards: { gold: 100, exp: 500, point: 10 },
    shareReward: { enabled: true, rewards: { gold: 10, exp: 50, point: 1 } }
  },
  // ========== 前期成就 - 探索篇 ==========
  {
    achievementId: 'early_map_3',
    name: 'Explorer',
    nameCN: '初探江湖',
    description: '探索3张地图',
    category: 'explore',
    requirement: { type: 'map', targetId: 'discovered', count: 3 },
    rewards: { gold: 50, exp: 200, point: 5 },
    shareReward: { enabled: true, rewards: { gold: 5, exp: 20, point: 1 } }
  },
  {
    achievementId: 'early_map_5',
    name: 'World Traveler',
    nameCN: '江湖历练',
    description: '探索5张地图',
    category: 'explore',
    requirement: { type: 'map', targetId: 'discovered', count: 5 },
    rewards: { gold: 100, exp: 500, point: 10 },
    shareReward: { enabled: true, rewards: { gold: 10, exp: 50, point: 1 } }
  },
  {
    achievementId: 'early_quest_5',
    name: 'Quest Beginner',
    nameCN: '初试任务',
    description: '完成5个任务',
    category: 'explore',
    requirement: { type: 'quest', targetId: 'completed', count: 5 },
    rewards: { gold: 50, exp: 250, point: 5 },
    shareReward: { enabled: true, rewards: { gold: 5, exp: 25, point: 1 } }
  },
  {
    achievementId: 'early_quest_20',
    name: 'Quest Hunter',
    nameCN: '任务达人',
    description: '完成20个任务',
    category: 'explore',
    requirement: { type: 'quest', targetId: 'completed', count: 20 },
    rewards: { gold: 200, exp: 1000, point: 20 },
    shareReward: { enabled: true, rewards: { gold: 20, exp: 100, point: 2 } }
  },
  // ========== 前期成就 - 收集篇 ==========
  {
    achievementId: 'early_item_10',
    name: 'Collector',
    nameCN: '初学收藏',
    description: '收集10种不同道具',
    category: 'collection',
    requirement: { type: 'item', targetId: 'unique', count: 10 },
    rewards: { gold: 50, exp: 300, point: 5 },
    shareReward: { enabled: true, rewards: { gold: 5, exp: 30, point: 1 } }
  },
  {
    achievementId: 'early_equipment_1',
    name: 'First Equipment',
    nameCN: '初得装备',
    description: '获得第1件装备',
    category: 'collection',
    requirement: { type: 'equipment', targetId: 'unique', count: 1 },
    rewards: { gold: 30, exp: 100, point: 3 },
    shareReward: { enabled: true, rewards: { gold: 3, exp: 10, point: 1 } }
  },
  {
    achievementId: 'early_equipment_10',
    name: 'Equipment Collector',
    nameCN: '装备收集者',
    description: '收集10件不同装备',
    category: 'collection',
    requirement: { type: 'equipment', targetId: 'unique', count: 10 },
    rewards: { gold: 150, exp: 800, point: 15 },
    shareReward: { enabled: true, rewards: { gold: 15, exp: 80, point: 2 } }
  },
  // ========== 前期成就 - 财富篇 ==========
  {
    achievementId: 'early_gold_1000',
    name: 'Wealthy Beginner',
    nameCN: '小有积蓄',
    description: '累计拥有1000金币',
    category: 'wealth',
    requirement: { type: 'gold', targetId: 'total', count: 1000 },
    rewards: { gold: 50, exp: 200, point: 5 },
    shareReward: { enabled: true, rewards: { gold: 5, exp: 20, point: 1 } }
  },
  {
    achievementId: 'early_gold_10000',
    name: 'Wealthy',
    nameCN: '小富翁',
    description: '累计拥有10000金币',
    category: 'wealth',
    requirement: { type: 'gold', targetId: 'total', count: 10000 },
    rewards: { gold: 300, exp: 1500, point: 30 },
    shareReward: { enabled: true, rewards: { gold: 30, exp: 150, point: 3 } }
  },
  // ========== 前期成就 - 登录篇 ==========
  {
    achievementId: 'early_login_3',
    name: 'Getting Started',
    nameCN: '渐入佳境',
    description: '连续登录3天',
    category: 'special',
    requirement: { type: 'login', targetId: 'streak', count: 3 },
    rewards: { gold: 80, exp: 400, point: 8 },
    shareReward: { enabled: true, rewards: { gold: 8, exp: 40, point: 1 } }
  },
  {
    achievementId: 'early_login_7',
    name: 'Dedicated Player',
    nameCN: '坚持不懈',
    description: '连续登录7天',
    category: 'special',
    requirement: { type: 'login', targetId: 'streak', count: 7 },
    rewards: { gold: 200, exp: 1000, point: 30 },
    effect: ACHIEVEMENT_EFFECTS.particle_fire,
    shareReward: { enabled: true, rewards: { gold: 20, exp: 100, point: 3 } }
  },
  // ========== 战斗成就 ==========
  {
    achievementId: 'combat_kill_100',
    name: 'Monster Slayer',
    nameCN: '初试锋芒',
    description: '击败100只怪物',
    category: 'combat',
    requirement: { type: 'kill', targetId: 'monster', count: 100 },
    rewards: { gold: 100, exp: 500, point: 10 },
    effect: ACHIEVEMENT_EFFECTS.particle_fire,
    shareReward: { enabled: true, rewards: { gold: 10, exp: 50, point: 1 } }
  },
  {
    achievementId: 'combat_kill_1000',
    name: 'Warrior',
    nameCN: '百战百胜',
    description: '击败1000只怪物',
    category: 'combat',
    requirement: { type: 'kill', targetId: 'monster', count: 1000 },
    rewards: { gold: 500, exp: 2000, point: 50 },
    effect: ACHIEVEMENT_EFFECTS.particle_gold,
    shareReward: { enabled: true, rewards: { gold: 50, exp: 200, point: 5 } }
  },
  {
    achievementId: 'combat_kill_10000',
    name: 'Legendary Warrior',
    nameCN: '万人敌',
    description: '击败10000只怪物',
    category: 'combat',
    requirement: { type: 'kill', targetId: 'monster', count: 10000 },
    rewards: { gold: 2000, exp: 10000, point: 200, title: '万人敌' },
    effect: ACHIEVEMENT_EFFECTS.avatar_frame_legend,
    shareReward: { enabled: true, rewards: { gold: 200, exp: 1000, point: 20 } }
  },
  // PVP成就
  {
    achievementId: 'pvp_win_10',
    name: 'PvP Beginner',
    nameCN: '初入江湖',
    description: 'PVP获得10场胜利',
    category: 'combat',
    requirement: { type: 'pvp', targetId: 'win', count: 10 },
    rewards: { gold: 100, exp: 500, point: 10 },
    effect: ACHIEVEMENT_EFFECTS.badge_shine,
    shareReward: { enabled: true, rewards: { gold: 10, exp: 50, point: 1 } }
  },
  {
    achievementId: 'pvp_win_100',
    name: 'PvP Master',
    nameCN: '武林高手',
    description: 'PVP获得100场胜利',
    category: 'combat',
    requirement: { type: 'pvp', targetId: 'win', count: 100 },
    rewards: { gold: 500, exp: 3000, point: 80 },
    effect: ACHIEVEMENT_EFFECTS.particle_gold,
    shareReward: { enabled: true, rewards: { gold: 50, exp: 300, point: 8 } }
  },
  // BOSS成就
  {
    achievementId: 'boss_kill_1',
    name: 'Boss Hunter',
    nameCN: '初试牛刀',
    description: '击败1个世界BOSS',
    category: 'combat',
    requirement: { type: 'boss', targetId: 'world_boss', count: 1 },
    rewards: { gold: 200, exp: 1000, point: 20 },
    effect: ACHIEVEMENT_EFFECTS.sound_fanfare,
    shareReward: { enabled: true, rewards: { gold: 20, exp: 100, point: 2 } }
  },
  {
    achievementId: 'boss_kill_10',
    name: 'Boss Slayer',
    nameCN: '屠龙者',
    description: '击败10个世界BOSS',
    category: 'combat',
    requirement: { type: 'boss', targetId: 'world_boss', count: 10 },
    rewards: { gold: 1000, exp: 5000, point: 100 },
    effect: ACHIEVEMENT_EFFECTS.avatar_frame_diamond,
    shareReward: { enabled: true, rewards: { gold: 100, exp: 500, point: 10 } }
  },
  // ========== 收集成就 ==========
  {
    achievementId: 'collection_item_50',
    name: 'Collector',
    nameCN: '收藏家',
    description: '收集50种不同道具',
    category: 'collection',
    requirement: { type: 'item', targetId: 'unique', count: 50 },
    rewards: { gold: 300, exp: 1500, point: 30 },
    effect: ACHIEVEMENT_EFFECTS.badge_shine,
    shareReward: { enabled: true, rewards: { gold: 30, exp: 150, point: 3 } }
  },
  {
    achievementId: 'collection_equipment_100',
    name: 'Equipment Collector',
    nameCN: '装备收藏家',
    description: '收集100件不同装备',
    category: 'collection',
    requirement: { type: 'equipment', targetId: 'unique', count: 100 },
    rewards: { gold: 500, exp: 3000, point: 60 },
    effect: ACHIEVEMENT_EFFECTS.particle_rainbow,
    shareReward: { enabled: true, rewards: { gold: 50, exp: 300, point: 6 } }
  },
  // ========== 社交成就 ==========
  {
    achievementId: 'social_friend_10',
    name: 'Social Butterfly',
    nameCN: '广结善缘',
    description: '添加10个好友',
    category: 'social',
    requirement: { type: 'friend', targetId: 'count', count: 10 },
    rewards: { gold: 100, exp: 500, point: 10 },
    effect: ACHIEVEMENT_EFFECTS.emote_celebration,
    shareReward: { enabled: true, rewards: { gold: 10, exp: 50, point: 1 } }
  },
  {
    achievementId: 'social_friend_50',
    name: 'Popular',
    nameCN: '名满天下',
    description: '添加50个好友',
    category: 'social',
    requirement: { type: 'friend', targetId: 'count', count: 50 },
    rewards: { gold: 400, exp: 2000, point: 40 },
    effect: ACHIEVEMENT_EFFECTS.particle_gold,
    shareReward: { enabled: true, rewards: { gold: 40, exp: 200, point: 4 } }
  },
  // 仙侣成就
  {
    achievementId: 'social_couple',
    name: 'Coupled',
    nameCN: '神仙眷侣',
    description: '与心仪对象结为仙侣',
    category: 'social',
    requirement: { type: 'couple', targetId: 'marriage', count: 1 },
    rewards: { gold: 1000, exp: 5000, point: 100, title: '神仙眷侣' },
    effect: ACHIEVEMENT_EFFECTS.particle_rainbow,
    shareReward: { enabled: true, rewards: { gold: 100, exp: 500, point: 10 } }
  },
  // 师徒成就
  {
    achievementId: 'social_master',
    name: 'Master',
    nameCN: '良师益友',
    description: '收取第一个徒弟',
    category: 'social',
    requirement: { type: 'master', targetId: 'disciple', count: 1 },
    rewards: { gold: 500, exp: 2000, point: 50 },
    effect: ACHIEVEMENT_EFFECTS.title_glow,
    shareReward: { enabled: true, rewards: { gold: 50, exp: 200, point: 5 } }
  },
  // ========== 探索成就 ==========
  {
    achievementId: 'explore_map_10',
    name: 'Explorer',
    nameCN: '初探江湖',
    description: '探索10张地图',
    category: 'explore',
    requirement: { type: 'map', targetId: 'discovered', count: 10 },
    rewards: { gold: 200, exp: 1000, point: 20 },
    effect: ACHIEVEMENT_EFFECTS.emote_celebration,
    shareReward: { enabled: true, rewards: { gold: 20, exp: 100, point: 2 } }
  },
  {
    achievementId: 'explore_quest_100',
    name: 'Quester',
    nameCN: '任务达人',
    description: '完成100个任务',
    category: 'explore',
    requirement: { type: 'quest', targetId: 'completed', count: 100 },
    rewards: { gold: 500, exp: 3000, point: 60 },
    effect: ACHIEVEMENT_EFFECTS.badge_shine,
    shareReward: { enabled: true, rewards: { gold: 50, exp: 300, point: 6 } }
  },
  // ========== 财富成就 ==========
  {
    achievementId: 'wealth_gold_1m',
    name: 'Wealthy',
    nameCN: '腰缠万贯',
    description: '累计拥有100万金币',
    category: 'wealth',
    requirement: { type: 'gold', targetId: 'total', count: 1000000 },
    rewards: { gold: 1000, exp: 5000, point: 100 },
    effect: ACHIEVEMENT_EFFECTS.particle_gold,
    shareReward: { enabled: true, rewards: { gold: 100, exp: 500, point: 10 } }
  },
  {
    achievementId: 'wealth_recharge_1',
    name: 'First Recharge',
    nameCN: '初试充值',
    description: '完成首次充值',
    category: 'wealth',
    requirement: { type: 'recharge', targetId: 'first', count: 1 },
    rewards: { gold: 0, exp: 0, items: [{ itemId: 'recharge_bonus', itemNameCN: '首充礼包', count: 1 }], point: 50 },
    effect: ACHIEVEMENT_EFFECTS.sound_fanfare,
    shareReward: { enabled: true, rewards: { gold: 100, exp: 500, point: 5 } }
  },
  // ========== 特殊成就 ==========
  {
    achievementId: 'special_login_7',
    name: 'Dedicated Player',
    nameCN: '坚持不懈',
    description: '连续登录7天',
    category: 'special',
    requirement: { type: 'login', targetId: 'streak', count: 7 },
    rewards: { gold: 200, exp: 1000, point: 30 },
    effect: ACHIEVEMENT_EFFECTS.particle_fire,
    shareReward: { enabled: true, rewards: { gold: 20, exp: 100, point: 3 } }
  },
  {
    achievementId: 'special_login_30',
    name: 'Loyal Player',
    nameCN: '情有独钟',
    description: '连续登录30天',
    category: 'special',
    requirement: { type: 'login', targetId: 'streak', count: 30 },
    rewards: { gold: 1000, exp: 5000, point: 150, title: '忠实玩家' },
    effect: ACHIEVEMENT_EFFECTS.avatar_frame_diamond,
    shareReward: { enabled: true, rewards: { gold: 100, exp: 500, point: 15 } }
  },
  // ========== 赛季成就 ==========
  {
    achievementId: 'season_rank_1',
    name: 'Season Champion',
    nameCN: '赛季冠军',
    description: '达到赛季排名第一',
    category: 'season',
    requirement: { type: 'custom', targetId: 'rank_1', count: 1 },
    rewards: { gold: 5000, exp: 20000, point: 500, title: '赛季冠军' },
    effect: ACHIEVEMENT_EFFECTS.avatar_frame_legend,
    shareReward: { enabled: true, rewards: { gold: 500, exp: 2000, point: 50 } }
  }
]

// 默认分享配置
const DEFAULT_SHARE_CONFIG: ShareConfig = {
  enabled: true,
  platforms: ['feishu', 'wechat'],
  templates: {
    default: '🎉 我完成了[{成就名称}]成就！{描述} #游戏成就 #修仙游戏',
    custom: {
      combat: '⚔️ 我在战斗中获得[{成就名称}]！{描述}',
      collection: '📦 我收集了[{成就名称}]！{描述}',
      social: '👥 我在社交中达成[{成就名称}]！{描述}',
      wealth: '💰 我在财富上达成[{成就名称}]！{描述}'
    }
  },
  rewardConfig: {
    firstShare: { gold: 50, exp: 100 },
    dailyShare: { gold: 10, exp: 20 },
    dailyLimit: 3
  }
}

export class AchievementSystemEx {
  private shareConfig: ShareConfig
  private playerAchievements: Map<string, PlayerAchievement[]> = new Map()
  private playerShareCount: Map<string, { date: string; count: number }> = new Map()
  private playerTotalPoints: Map<string, number> = new Map()
  private activeEffects: Map<string, { effect: AchievementEffect; endTime: number }[]> = new Map()

  constructor(config: Partial<ShareConfig> = {}) {
    this.shareConfig = { ...DEFAULT_SHARE_CONFIG, ...config }
  }

  // 获取今日日期
  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0]
  }

  // 获取成就配置
  getAchievement(achievementId: string): Achievement | null {
    return ACHIEVEMENTS.find(a => a.achievementId === achievementId) || null
  }

  // 获取所有成就
  getAllAchievements(): Achievement[] {
    return ACHIEVEMENTS
  }

  // 获取分类成就
  getAchievementsByCategory(category: AchievementCategory): Achievement[] {
    return ACHIEVEMENTS.filter(a => a.category === category)
  }

  // 初始化玩家成就
  initPlayerAchievements(playerId: string): PlayerAchievement[] {
    const achievements: PlayerAchievement[] = []
    
    for (const achievement of ACHIEVEMENTS) {
      achievements.push({
        achievementId: achievement.achievementId,
        playerId,
        progress: 0,
        completed: false,
        claimed: false,
        shared: false,
        effectActive: false
      })
    }

    this.playerAchievements.set(playerId, achievements)
    this.playerShareCount.set(playerId, { date: this.getTodayDate(), count: 0 })
    this.playerTotalPoints.set(playerId, 0)

    return achievements
  }

  // 获取玩家成就列表
  getPlayerAchievements(playerId: string): PlayerAchievement[] {
    if (!this.playerAchievements.has(playerId)) {
      return this.initPlayerAchievements(playerId)
    }
    return this.playerAchievements.get(playerId)!
  }

  // 更新成就进度
  updateProgress(playerId: string, type: AchievementType, targetId: string, amount: number = 1): { achievementId: string; completed: boolean }[] {
    const achievements = this.getPlayerAchievements(playerId)
    const results: { achievementId: string; completed: boolean }[] = []

    for (const pa of achievements) {
      // 已完成的跳过
      if (pa.completed) continue

      const achievement = this.getAchievement(pa.achievementId)
      if (!achievement) continue

      // 检查类型匹配
      if (achievement.requirement.type !== type) continue

      // 检查目标ID匹配
      if (achievement.requirement.targetId !== targetId) continue

      // 更新进度
      pa.progress += amount

      // 检查完成
      if (pa.progress >= achievement.requirement.count) {
        pa.completed = true
        pa.completedTime = Date.now()
        
        // 激活特效
        if (achievement.effect) {
          this.activateEffect(playerId, achievement.achievementId, achievement.effect)
        }

        results.push({ achievementId: pa.achievementId, completed: true })
      }
    }

    return results
  }

  // 激活成就特效
  private activateEffect(playerId: string, achievementId: string, effect: AchievementEffect): void {
    const achievement = this.getAchievement(achievementId)
    if (!achievement || !effect.showOnComplete) return

    if (!this.activeEffects.has(playerId)) {
      this.activeEffects.set(playerId, [])
    }

    const effects = this.activeEffects.get(playerId)!
    const endTime = effect.duration && effect.duration > 0 ? Date.now() + effect.duration : 0

    effects.push({ effect, endTime })
    this.activeEffects.set(playerId, effects)
  }

  // 获取玩家激活的特效
  getActiveEffects(playerId: string): AchievementEffect[] {
    const effects = this.activeEffects.get(playerId)
    if (!effects) return []

    const now = Date.now()
    const active: AchievementEffect[] = []

    for (const { effect, endTime } of effects) {
      if (effect.permanent || endTime === 0 || endTime > now) {
        active.push(effect)
      }
    }

    return active
  }

  // 领取成就奖励
  claimReward(playerId: string, achievementId: string): { success: boolean; rewards?: any; message: string } {
    const achievements = this.getPlayerAchievements(playerId)
    const pa = achievements.find(a => a.achievementId === achievementId)

    if (!pa) {
      return { success: false, message: '成就不存在' }
    }

    if (!pa.completed) {
      return { success: false, message: '成就未完成' }
    }

    if (pa.claimed) {
      return { success: false, message: '奖励已领取' }
    }

    const achievement = this.getAchievement(achievementId)
    if (!achievement) {
      return { success: false, message: '成就配置错误' }
    }

    pa.claimed = true

    // 添加成就点数
    const currentPoints = this.playerTotalPoints.get(playerId) || 0
    this.playerTotalPoints.set(playerId, currentPoints + (achievement.rewards.point || 0))

    return {
      success: true,
      rewards: achievement.rewards,
      message: `领取成就奖励：${achievement.nameCN}`
    }
  }

  // 分享成就
  shareAchievement(playerId: string, achievementId: string, platform: string = 'default'): { success: boolean; rewards?: any; message: string; shareText?: string } {
    if (!this.shareConfig.enabled) {
      return { success: false, message: '分享功能未启用' }
    }

    const achievements = this.getPlayerAchievements(playerId)
    const pa = achievements.find(a => a.achievementId === achievementId)

    if (!pa) {
      return { success: false, message: '成就不存在' }
    }

    if (!pa.completed) {
      return { success: false, message: '成就未完成' }
    }

    if (pa.shared && !this.shareConfig.rewardConfig.dailyLimit) {
      return { success: false, message: '已分享过该成就' }
    }

    const achievement = this.getAchievement(achievementId)
    if (!achievement || !achievement.shareReward?.enabled) {
      return { success: false, message: '该成就不支持分享' }
    }

    // 检查分享次数
    const shareCount = this.playerShareCount.get(playerId)
    const today = this.getTodayDate()

    if (shareCount?.date !== today) {
      // 新的一天，重置次数
      this.playerShareCount.set(playerId, { date: today, count: 0 })
    }

    const currentCount = this.playerShareCount.get(playerId)!.count
    if (currentCount >= this.shareConfig.rewardConfig.dailyLimit) {
      return { success: false, message: '今日分享次数已用完' }
    }

    // 生成分享文本
    const category = achievement.category
    let template = this.shareConfig.templates.custom[category] || this.shareConfig.templates.default
    const shareText = template
      .replace('{成就名称}', achievement.nameCN)
      .replace('{描述}', achievement.description)

    // 发放分享奖励
    let rewards = null
    if (pa.shared === false) {
      // 首次分享
      rewards = this.shareConfig.rewardConfig.firstShare
      pa.firstShareTime = Date.now()
    } else {
      // 日常分享
      rewards = this.shareConfig.rewardConfig.dailyShare
    }

    // 更新分享状态
    pa.shared = true
    this.playerShareCount.get(playerId)!.count++

    // 添加成就点数
    const sharePoint = achievement.shareReward.rewards.point || 0
    if (sharePoint > 0) {
      const currentPoints = this.playerTotalPoints.get(playerId) || 0
      this.playerTotalPoints.set(playerId, currentPoints + sharePoint)
    }

    return {
      success: true,
      rewards,
      message: '分享成功！',
      shareText
    }
  }

  // 获取成就点数
  getAchievementPoints(playerId: string): number {
    return this.playerTotalPoints.get(playerId) || 0
  }

  // 获取成就进度
  getAchievementProgress(playerId: string, achievementId: string): PlayerAchievement | null {
    const achievements = this.getPlayerAchievements(playerId)
    return achievements.find(a => a.achievementId === achievementId) || null
  }

  // 获取成就统计
  getAchievementStats(playerId: string): {
    total: number
    completed: number
    claimed: number
    points: number
    byCategory: { [key in AchievementCategory]?: { total: number; completed: number } }
  } {
    const achievements = this.getPlayerAchievements(playerId)
    const byCategory: any = {}

    let completed = 0
    let claimed = 0

    for (const pa of achievements) {
      const achievement = this.getAchievement(pa.achievementId)
      if (!achievement) continue

      const category = achievement.category
      if (!byCategory[category]) {
        byCategory[category] = { total: 0, completed: 0 }
      }
      byCategory[category].total++

      if (pa.completed) {
        completed++
        byCategory[category].completed++

        if (pa.claimed) {
          claimed++
        }
      }
    }

    return {
      total: achievements.length,
      completed,
      claimed,
      points: this.getAchievementPoints(playerId),
      byCategory
    }
  }

  // 获取分享文本
  generateShareText(playerId: string, achievementId: string): string | null {
    const achievement = this.getAchievement(achievementId)
    if (!achievement) return null

    const category = achievement.category
    const template = this.shareConfig.templates.custom[category] || this.shareConfig.templates.default

    return template
      .replace('{成就名称}', achievement.nameCN)
      .replace('{描述}', achievement.description)
  }

  // 获取可分享的成就
  getShareableAchievements(playerId: string): Achievement[] {
    const achievements = this.getPlayerAchievements(playerId)
    const shareable: Achievement[] = []

    for (const pa of achievements) {
      if (!pa.completed) continue

      const achievement = this.getAchievement(pa.achievementId)
      if (!achievement?.shareReward?.enabled) continue

      shareable.push(achievement)
    }

    return shareable
  }

  // 获取分享配置
  getShareConfig(): ShareConfig {
    return this.shareConfig
  }

  // 获取今日剩余分享次数
  getRemainingShareCount(playerId: string): number {
    const shareCount = this.playerShareCount.get(playerId)
    const today = this.getTodayDate()

    if (!shareCount || shareCount.date !== today) {
      return this.shareConfig.rewardConfig.dailyLimit
    }

    return Math.max(0, this.shareConfig.rewardConfig.dailyLimit - shareCount.count)
  }
}

export default AchievementSystemEx
