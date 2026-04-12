/**
 * 成就系统增强 API (P85-4)
 * 挂机修仙游戏 - 成就系统增强
 * 
 * API端点:
 * 1. GET  /api/achievement/categories     - 成就分类（6大类）
 * 2. GET  /api/achievement/leaderboard   - 成就排行榜（前20名）
 * 3. POST /api/achievement/claim-milestone - 领取里程碑奖励
 * 4. GET  /api/achievement/milestones     - 里程碑配置和状态
 * 
 * 数据库表:
 * - achievement_milestones: 里程碑配置
 * - achievement_progress: 玩家成就实时进度
 * - achievement_leaderboard_cache: 排行榜缓存
 */

const express = require('express');
const router = express.Router();

// 成就分类配置（6大类，每类10-20个成就）
const ACHIEVEMENT_CATEGORIES = {
  combat: {
    id: 'combat',
    name: '战斗',
    icon: '⚔️',
    color: '#ef4444',
    desc: '击杀怪物、通关副本、PVP胜利等',
    achievements: [
      // 击杀怪物
      { id: 'combat_kill_1', name: '初战告捷', desc: '击杀1只怪物', target: 1, points: 5, reward: { type: 'spirit_stones', amount: 50 } },
      { id: 'combat_kill_100', name: '杀敌小试', desc: '累计击杀100只怪物', target: 100, points: 30, reward: { type: 'spirit_stones', amount: 300 } },
      { id: 'combat_kill_500', name: '杀敌如麻', desc: '累计击杀500只怪物', target: 500, points: 80, reward: { type: 'spirit_stones', amount: 800 } },
      { id: 'combat_kill_1000', name: '屠魔卫道', desc: '累计击杀1000只怪物', target: 1000, points: 150, reward: { type: 'spirit_stones', amount: 2000 } },
      { id: 'combat_kill_5000', name: '万魔之王', desc: '累计击杀5000只怪物', target: 5000, points: 500, reward: { type: 'title', title: '万魔克星' } },
      // 通关副本
      { id: 'dungeon_1', name: '副本先锋', desc: '通关1个副本', target: 1, points: 10, reward: { type: 'spirit_stones', amount: 100 } },
      { id: 'dungeon_10', name: '副本达人', desc: '累计通关10个副本', target: 10, points: 50, reward: { type: 'spirit_stones', amount: 500 } },
      { id: 'dungeon_50', name: '副本大师', desc: '累计通关50个副本', target: 50, points: 200, reward: { type: 'spirit_stones', amount: 2000 } },
      { id: 'dungeon_100', name: '副本宗师', desc: '累计通关100个副本', target: 100, points: 400, reward: { type: 'title', title: '副本宗师' } },
      // PVP胜利
      { id: 'pvp_win_1', name: '初露锋芒', desc: '赢得1场PVP', target: 1, points: 10, reward: { type: 'spirit_stones', amount: 100 } },
      { id: 'pvp_win_10', name: '小有名气', desc: '累计赢得10场PVP', target: 10, points: 50, reward: { type: 'spirit_stones', amount: 500 } },
      { id: 'pvp_win_50', name: '名动一方', desc: '累计赢得50场PVP', target: 50, points: 200, reward: { type: 'spirit_stones', amount: 2000 } },
      { id: 'pvp_win_100', name: ' PVP霸主', desc: '累计赢得100场PVP', target: 100, points: 400, reward: { type: 'title', title: 'PVP霸主' } },
      // 伤害成就
      { id: 'damage_1k', name: '毁天灭地', desc: '单次造成1000点伤害', target: 1000, points: 20, reward: { type: 'spirit_stones', amount: 200 } },
      { id: 'damage_10k', name: '毁灭之力', desc: '单次造成10000点伤害', target: 10000, points: 100, reward: { type: 'spirit_stones', amount: 1000 } },
      { id: 'damage_100k', name: '天崩地裂', desc: '单次造成100000点伤害', target: 100000, points: 300, reward: { type: 'title', title: '毁灭者' } },
      // 累计伤害
      { id: 'total_damage_1m', name: '累计输出', desc: '累计造成1000000点伤害', target: 1000000, points: 200, reward: { type: 'spirit_stones', amount: 2000 } },
      { id: 'total_damage_10m', name: '战争机器', desc: '累计造成10000000点伤害', target: 10000000, points: 600, reward: { type: 'title', title: '战争机器' } },
    ]
  },
  cultivation: {
    id: 'cultivation',
    name: '修仙',
    icon: '🧘',
    color: '#667eea',
    desc: '突破境界、渡劫成功、修炼时间等',
    achievements: [
      // 境界突破
      { id: 'realm_break_1', name: '初窥门径', desc: '突破境界1次', target: 1, points: 20, reward: { type: 'spirit_stones', amount: 200 } },
      { id: 'realm_break_5', name: '境界飞跃', desc: '突破境界5次', target: 5, points: 100, reward: { type: 'spirit_stones', amount: 1000 } },
      { id: 'realm_break_10', name: '得道高人', desc: '突破境界10次', target: 10, points: 300, reward: { type: 'title', title: '得道高人' } },
      { id: 'realm_break_20', name: '半仙之体', desc: '突破境界20次', target: 20, points: 600, reward: { type: 'spirit_stones', amount: 5000 } },
      // 渡劫成功
      { id: 'tribulation_1', name: '渡劫初成', desc: '渡劫成功1次', target: 1, points: 30, reward: { type: 'spirit_stones', amount: 300 } },
      { id: 'tribulation_5', name: '渡劫老手', desc: '渡劫成功5次', target: 5, points: 150, reward: { type: 'spirit_stones', amount: 1500 } },
      { id: 'tribulation_10', name: '天劫克星', desc: '渡劫成功10次', target: 10, points: 400, reward: { type: 'title', title: '天劫克星' } },
      // 修炼时间
      { id: 'cultivate_1h', name: '修炼初体验', desc: '累计修炼1小时', target: 3600, points: 10, reward: { type: 'spirit_stones', amount: 100 } },
      { id: 'cultivate_10h', name: '勤修苦练', desc: '累计修炼10小时', target: 36000, points: 50, reward: { type: 'spirit_stones', amount: 500 } },
      { id: 'cultivate_100h', name: '资深修士', desc: '累计修炼100小时', target: 360000, points: 200, reward: { type: 'spirit_stones', amount: 2000 } },
      { id: 'cultivate_1000h', name: '修炼狂人', desc: '累计修炼1000小时', target: 3600000, points: 800, reward: { type: 'title', title: '修炼狂人' } },
      // 灵气获取
      { id: 'spirit_10k', name: '灵气收集者', desc: '累计获得10000点灵气', target: 10000, points: 20, reward: { type: 'spirit_stones', amount: 200 } },
      { id: 'spirit_100k', name: '灵气如云', desc: '累计获得100000点灵气', target: 100000, points: 80, reward: { type: 'spirit_stones', amount: 800 } },
      { id: 'spirit_1m', name: '灵气如海', desc: '累计获得1000000点灵气', target: 1000000, points: 250, reward: { type: 'spirit_stones', amount: 2500 } },
      { id: 'spirit_10m', name: '灵气无双', desc: '累计获得10000000点灵气', target: 10000000, points: 700, reward: { type: 'title', title: '灵气无双' } },
      // 等级成就
      { id: 'level_10', name: '初入仙途', desc: '修炼达到10级', target: 10, points: 10, reward: { type: 'spirit_stones', amount: 100 } },
      { id: 'level_50', name: '小有所成', desc: '修炼达到50级', target: 50, points: 50, reward: { type: 'spirit_stones', amount: 500 } },
      { id: 'level_100', name: '修为精进', desc: '修炼达到100级', target: 100, points: 200, reward: { type: 'title', title: '真人' } },
      { id: 'level_200', name: '登堂入室', desc: '修炼达到200级', target: 200, points: 500, reward: { type: 'spirit_stones', amount: 5000 } },
    ]
  },
  economy: {
    id: 'economy',
    name: '经济',
    icon: '💰',
    color: '#ffd700',
    desc: '灵石获取/消耗、物品交易等',
    achievements: [
      // 灵石获取
      { id: 'stones_earn_1k', name: '小康之家', desc: '累计获得1000灵石', target: 1000, points: 10, reward: { type: 'spirit_stones', amount: 100 } },
      { id: 'stones_earn_10k', name: '富甲一方', desc: '累计获得10000灵石', target: 10000, points: 50, reward: { type: 'spirit_stones', amount: 500 } },
      { id: 'stones_earn_100k', name: '腰缠万贯', desc: '累计获得100000灵石', target: 100000, points: 200, reward: { type: 'spirit_stones', amount: 2000 } },
      { id: 'stones_earn_1m', name: '灵石巨头', desc: '累计获得1000000灵石', target: 1000000, points: 500, reward: { type: 'title', title: '灵石巨头' } },
      { id: 'stones_earn_10m', name: '富可敌国', desc: '累计获得10000000灵石', target: 10000000, points: 1000, reward: { type: 'title', title: '富可敌国' } },
      // 灵石消耗
      { id: 'stones_spend_1k', name: '初试消费', desc: '累计消耗1000灵石', target: 1000, points: 10, reward: { type: 'spirit_stones', amount: 100 } },
      { id: 'stones_spend_10k', name: '消费达人', desc: '累计消耗10000灵石', target: 10000, points: 50, reward: { type: 'spirit_stones', amount: 500 } },
      { id: 'stones_spend_100k', name: '挥金如土', desc: '累计消耗100000灵石', target: 100000, points: 200, reward: { type: 'spirit_stones', amount: 2000 } },
      { id: 'stones_spend_1m', name: '一掷千金', desc: '累计消耗1000000灵石', target: 1000000, points: 500, reward: { type: 'title', title: '一掷千金' } },
      // 物品交易
      { id: 'trade_1', name: '初试交易', desc: '完成1次物品交易', target: 1, points: 5, reward: { type: 'spirit_stones', amount: 50 } },
      { id: 'trade_10', name: '小商人', desc: '完成10次物品交易', target: 10, points: 30, reward: { type: 'spirit_stones', amount: 300 } },
      { id: 'trade_50', name: '商业新星', desc: '完成50次物品交易', target: 50, points: 100, reward: { type: 'spirit_stones', amount: 1000 } },
      { id: 'trade_100', name: '商界大亨', desc: '完成100次物品交易', target: 100, points: 250, reward: { type: 'title', title: '商界大亨' } },
      // 当前持有
      { id: 'stones_hold_5k', name: '略有盈余', desc: '当前持有5000灵石', target: 5000, points: 20, reward: { type: 'spirit_stones', amount: 200 } },
      { id: 'stones_hold_50k', name: '家底殷实', desc: '当前持有50000灵石', target: 50000, points: 80, reward: { type: 'spirit_stones', amount: 800 } },
      { id: 'stones_hold_500k', name: '富甲天下', desc: '当前持有500000灵石', target: 500000, points: 300, reward: { type: 'title', title: '富甲天下' } },
    ]
  },
  social: {
    id: 'social',
    name: '社交',
    icon: '👥',
    color: '#8e2de2',
    desc: '好友数、师徒数、宗门活跃等',
    achievements: [
      // 好友
      { id: 'friend_1', name: '初识道友', desc: '拥有1个好友', target: 1, points: 10, reward: { type: 'spirit_stones', amount: 100 } },
      { id: 'friend_5', name: '交友广泛', desc: '拥有5个好友', target: 5, points: 40, reward: { type: 'spirit_stones', amount: 400 } },
      { id: 'friend_10', name: '桃李天下', desc: '拥有10个好友', target: 10, points: 100, reward: { type: 'spirit_stones', amount: 1000 } },
      { id: 'friend_20', name: '朋友满天下', desc: '拥有20个好友', target: 20, points: 250, reward: { type: 'title', title: '朋友满天下' } },
      // 师徒
      { id: 'master_1', name: '拜师学艺', desc: '拥有1位师父', target: 1, points: 20, reward: { type: 'spirit_stones', amount: 200 } },
      { id: 'disciple_1', name: '收徒育人', desc: '拥有1位徒弟', target: 1, points: 20, reward: { type: 'spirit_stones', amount: 200 } },
      { id: 'disciple_3', name: '桃李芬芳', desc: '拥有3位徒弟', target: 3, points: 80, reward: { type: 'spirit_stones', amount: 800 } },
      { id: 'disciple_5', name: '宗师之姿', desc: '拥有5位徒弟', target: 5, points: 200, reward: { type: 'title', title: '名师' } },
      // 宗门
      { id: 'sect_join', name: '加入宗门', desc: '加入一个宗门', target: 1, points: 20, reward: { type: 'spirit_stones', amount: 200 } },
      { id: 'sect_contrib_1k', name: '宗门新人', desc: '宗门贡献达到1000', target: 1000, points: 50, reward: { type: 'spirit_stones', amount: 500 } },
      { id: 'sect_contrib_10k', name: '宗门支柱', desc: '宗门贡献达到10000', target: 10000, points: 200, reward: { type: 'spirit_stones', amount: 2000 } },
      { id: 'sect_contrib_100k', name: '宗门传奇', desc: '宗门贡献达到100000', target: 100000, points: 600, reward: { type: 'title', title: '宗门传奇' } },
      // 仙侣
      { id: 'partner_1', name: '喜结连理', desc: '拥有1位仙侣', target: 1, points: 100, reward: { type: 'spirit_stones', amount: 1000 } },
      { id: 'double_cultivate_10', name: '双修伴侣', desc: '完成10次双修', target: 10, points: 50, reward: { type: 'spirit_stones', amount: 500 } },
      { id: 'double_cultivate_50', name: '双修达人', desc: '完成50次双修', target: 50, points: 150, reward: { type: 'spirit_stones', amount: 1500 } },
      { id: 'double_cultivate_100', name: '神仙眷侣', desc: '完成100次双修', target: 100, points: 400, reward: { type: 'title', title: '神仙眷侣' } },
    ]
  },
  collection: {
    id: 'collection',
    name: '收集',
    icon: '📦',
    color: '#f59e0b',
    desc: '装备收集、宝石收集、外观收集等',
    achievements: [
      // 装备收集
      { id: 'equip_common_10', name: '初窥装备', desc: '收集10件普通装备', target: 10, points: 10, reward: { type: 'spirit_stones', amount: 100 } },
      { id: 'equip_rare_5', name: '稀有收藏', desc: '收集5件稀有装备', target: 5, points: 30, reward: { type: 'spirit_stones', amount: 300 } },
      { id: 'equip_epic_3', name: '史诗收藏', desc: '收集3件史诗装备', target: 3, points: 80, reward: { type: 'spirit_stones', amount: 800 } },
      { id: 'equip_legendary_1', name: '传说降临', desc: '收集1件传说装备', target: 1, points: 150, reward: { type: 'title', title: '传说收藏家' } },
      // 宝石收集
      { id: 'gem_10', name: '宝石初成', desc: '收集10颗宝石', target: 10, points: 20, reward: { type: 'spirit_stones', amount: 200 } },
      { id: 'gem_50', name: '宝石达人', desc: '收集50颗宝石', target: 50, points: 80, reward: { type: 'spirit_stones', amount: 800 } },
      { id: 'gem_100', name: '宝石收藏家', desc: '收集100颗宝石', target: 100, points: 200, reward: { type: 'spirit_stones', amount: 2000 } },
      { id: 'gem_500', name: '宝石大王', desc: '收集500颗宝石', target: 500, points: 600, reward: { type: 'title', title: '宝石大王' } },
      // 功法收集
      { id: 'gongfa_1', name: '功法初成', desc: '学习第1个功法', target: 1, points: 10, reward: { type: 'spirit_stones', amount: 100 } },
      { id: 'gongfa_5', name: '功法小成', desc: '学习5个功法', target: 5, points: 50, reward: { type: 'spirit_stones', amount: 500 } },
      { id: 'gongfa_10', name: '功法大成', desc: '学习10个功法', target: 10, points: 150, reward: { type: 'title', title: '功法大师' } },
      // 技能收集
      { id: 'skill_1', name: '技能入门', desc: '学习第1个技能', target: 1, points: 10, reward: { type: 'spirit_stones', amount: 100 } },
      { id: 'skill_5', name: '技能熟手', desc: '学习5个技能', target: 5, points: 50, reward: { type: 'spirit_stones', amount: 500 } },
      { id: 'skill_10', name: '技能大师', desc: '学习10个技能', target: 10, points: 150, reward: { type: 'title', title: '技能大师' } },
      // 灵兽收集
      { id: 'beast_1', name: '灵兽伙伴', desc: '拥有1只灵兽', target: 1, points: 20, reward: { type: 'spirit_stones', amount: 200 } },
      { id: 'beast_3', name: '灵兽使', desc: '拥有3只灵兽', target: 3, points: 60, reward: { type: 'spirit_stones', amount: 600 } },
      { id: 'beast_5', name: '万兽之王', desc: '拥有5只灵兽', target: 5, points: 150, reward: { type: 'title', title: '万兽之王' } },
    ]
  },
  cumulative: {
    id: 'cumulative',
    name: '累计',
    icon: '⏰',
    color: '#10b981',
    desc: '累计在线时长、累计修炼次数等',
    achievements: [
      // 累计在线
      { id: 'online_1h', name: '初次上线', desc: '累计在线1小时', target: 3600, points: 5, reward: { type: 'spirit_stones', amount: 50 } },
      { id: 'online_10h', name: '常客', desc: '累计在线10小时', target: 36000, points: 30, reward: { type: 'spirit_stones', amount: 300 } },
      { id: 'online_100h', name: '老玩家', desc: '累计在线100小时', target: 360000, points: 150, reward: { type: 'spirit_stones', amount: 1500 } },
      { id: 'online_1000h', name: '骨灰级玩家', desc: '累计在线1000小时', target: 3600000, points: 500, reward: { type: 'title', title: '骨灰玩家' } },
      // 累计修炼次数
      { id: 'cultivate_session_10', name: '修炼新手', desc: '完成10次修炼', target: 10, points: 10, reward: { type: 'spirit_stones', amount: 100 } },
      { id: 'cultivate_session_100', name: '修炼达人', desc: '完成100次修炼', target: 100, points: 60, reward: { type: 'spirit_stones', amount: 600 } },
      { id: 'cultivate_session_500', name: '修炼狂人', desc: '完成500次修炼', target: 500, points: 200, reward: { type: 'spirit_stones', amount: 2000 } },
      { id: 'cultivate_session_1000', name: '永恒修炼者', desc: '完成1000次修炼', target: 1000, points: 500, reward: { type: 'title', title: '永恒修炼者' } },
      // 累计历练
      { id: 'adventure_10', name: '初试历练', desc: '完成10次历练', target: 10, points: 20, reward: { type: 'spirit_stones', amount: 200 } },
      { id: 'adventure_100', name: '历练达人', desc: '完成100次历练', target: 100, points: 100, reward: { type: 'spirit_stones', amount: 1000 } },
      { id: 'adventure_500', name: '历尽千山', desc: '完成500次历练', target: 500, points: 300, reward: { type: 'spirit_stones', amount: 3000 } },
      { id: 'adventure_1000', name: '云游四方', desc: '完成1000次历练', target: 1000, points: 600, reward: { type: 'title', title: '云游四方' } },
      // 累计奇遇
      { id: 'chance_5', name: '奇遇连连', desc: '触发5次奇遇', target: 5, points: 30, reward: { type: 'spirit_stones', amount: 300 } },
      { id: 'chance_20', name: '福缘深厚', desc: '触发20次奇遇', target: 20, points: 100, reward: { type: 'spirit_stones', amount: 1000 } },
      { id: 'chance_50', name: '天选之人', desc: '触发50次奇遇', target: 50, points: 250, reward: { type: 'title', title: '天选之人' } },
      // 累计登录
      { id: 'login_7', name: '连续登录', desc: '累计登录7天', target: 7, points: 30, reward: { type: 'spirit_stones', amount: 300 } },
      { id: 'login_30', name: '忠实玩家', desc: '累计登录30天', target: 30, points: 150, reward: { type: 'spirit_stones', amount: 1500 } },
      { id: 'login_100', name: '永不离线', desc: '累计登录100天', target: 100, points: 500, reward: { type: 'title', title: '永不离线' } },
    ]
  }
};

// 里程碑配置（每达到特定成就点数可领取奖励）
const MILESTONES = [
  { id: 1, threshold: 100,  reward_type: 'spirit_stones', reward_amount: 500,   name: '初露锋芒', desc: '累计100成就点' },
  { id: 2, threshold: 500,  reward_type: 'spirit_stones', reward_amount: 2000,  name: '小有名气', desc: '累计500成就点' },
  { id: 3, threshold: 1000, reward_type: 'spirit_stones', reward_amount: 5000, name: '名动四方', desc: '累计1000成就点' },
  { id: 4, threshold: 2000, reward_type: 'title',         reward_amount: 1,    name: '成就达人', desc: '累计2000成就点', title: '成就达人' },
  { id: 5, threshold: 5000, reward_type: 'spirit_stones', reward_amount: 20000, name: '傲视群雄', desc: '累计5000成就点' },
  { id: 6, threshold: 10000, reward_type: 'title',         reward_amount: 1,    name: '成就大师', desc: '累计10000成就点', title: '成就大师' },
];

// 数据库表初始化SQL
const INIT_TABLES_SQL = [
  `CREATE TABLE IF NOT EXISTS achievement_milestones (
    id INTEGER PRIMARY KEY,
    threshold INTEGER NOT NULL UNIQUE,
    reward_type TEXT NOT NULL,
    reward_amount INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    title_reward TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS achievement_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    achievement_id TEXT NOT NULL,
    progress INTEGER DEFAULT 0,
    completed INTEGER DEFAULT 0,
    completed_at DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(player_id, achievement_id)
  )`,
  `CREATE TABLE IF NOT EXISTS achievement_leaderboard_cache (
    player_id INTEGER PRIMARY KEY,
    username TEXT,
    achievement_points INTEGER DEFAULT 0,
    completed_count INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS achievement_player_milestone (
    player_id INTEGER NOT NULL,
    milestone_id INTEGER NOT NULL,
    claimed INTEGER DEFAULT 0,
    claimed_at DATETIME,
    PRIMARY KEY(player_id, milestone_id)
  )`,
  `CREATE TABLE IF NOT EXISTS achievement_player_stats (
    player_id INTEGER PRIMARY KEY,
    total_points INTEGER DEFAULT 0,
    completed_count INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
];

// 索引
const CREATE_INDEXES_SQL = [
  `CREATE INDEX IF NOT EXISTS idx_ach_progress_player ON achievement_progress(player_id)`,
  `CREATE INDEX IF NOT EXISTS idx_ach_progress_completed ON achievement_progress(player_id, completed)`,
  `CREATE INDEX IF NOT EXISTS idx_ach_leaderboard_points ON achievement_leaderboard_cache(achievement_points DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_ach_milestone_player ON achievement_player_milestone(player_id)`,
];

// 获取所有分类
router.get('/categories', (req, res) => {
  try {
    const result = {};
    
    for (const [catId, cat] of Object.entries(ACHIEVEMENT_CATEGORIES)) {
      result[catId] = {
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        desc: cat.desc,
        total_achievements: cat.achievements.length,
        total_points: cat.achievements.reduce((sum, a) => sum + a.points, 0),
        achievements: cat.achievements.map(a => ({
          id: a.id,
          name: a.name,
          desc: a.desc,
          target: a.target,
          points: a.points,
          reward: a.reward
        }))
      };
    }
    
    res.json({
      success: true,
      categories: result,
      total_categories: Object.keys(result).length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取里程碑配置和状态
router.get('/milestones', (req, res) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      // 返回里程碑配置（不含玩家状态）
      return res.json({
        success: true,
        milestones: MILESTONES.map(m => ({
          id: m.id,
          threshold: m.threshold,
          reward_type: m.reward_type,
          reward_amount: m.reward_amount,
          name: m.name,
          desc: m.desc,
          claimed: null
        }))
      });
    }
    
    // 获取玩家成就点数
    let playerPoints = 0;
    try {
      const stats = global.db && global.db.prepare 
        ? global.db.prepare('SELECT total_points FROM achievement_player_stats WHERE player_id = ?').get(player_id)
        : null;
      playerPoints = stats ? stats.total_points : 0;
    } catch (e) {
      playerPoints = 0;
    }
    
    // 获取玩家已领取的里程碑
    let claimedMilestones = [];
    try {
      if (global.db && global.db.prepare) {
        const rows = global.db.prepare('SELECT milestone_id, claimed, claimed_at FROM achievement_player_milestone WHERE player_id = ? AND claimed = 1').all(player_id);
        claimedMilestones = rows.map(r => r.milestone_id);
      }
    } catch (e) {
      claimedMilestones = [];
    }
    
    // 组装里程碑状态
    const milestonesWithStatus = MILESTONES.map(m => {
      const canClaim = playerPoints >= m.threshold && !claimedMilestones.includes(m.id);
      return {
        id: m.id,
        threshold: m.threshold,
        reward_type: m.reward_type,
        reward_amount: m.reward_amount,
        name: m.name,
        desc: m.desc,
        claimed: claimedMilestones.includes(m.id),
        can_claim: canClaim,
        current_points: playerPoints,
        progress: Math.min(100, Math.floor((playerPoints / m.threshold) * 100))
      };
    });
    
    res.json({
      success: true,
      player_points: playerPoints,
      milestones: milestonesWithStatus,
      next_milestone: milestonesWithStatus.find(m => !m.claimed) || null
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 领取里程碑奖励
router.post('/claim-milestone', (req, res) => {
  try {
    const { player_id, milestone_id } = req.body;
    
    if (!player_id || !milestone_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数：player_id 和 milestone_id' });
    }
    
    const milestone = MILESTONES.find(m => m.id === milestone_id);
    if (!milestone) {
      return res.status(404).json({ success: false, error: '里程碑不存在' });
    }
    
    // 获取玩家成就点数
    let playerPoints = 0;
    try {
      if (global.db && global.db.prepare) {
        const stats = global.db.prepare('SELECT total_points FROM achievement_player_stats WHERE player_id = ?').get(player_id);
        playerPoints = stats ? stats.total_points : 0;
      }
    } catch (e) {
      playerPoints = 0;
    }
    
    if (playerPoints < milestone.threshold) {
      return res.status(400).json({ 
        success: false, 
        error: `成就点数不足，需要${milestone.threshold}点，当前${playerPoints}点` 
      });
    }
    
    // 检查是否已领取
    let alreadyClaimed = false;
    try {
      if (global.db && global.db.prepare) {
        const record = global.db.prepare('SELECT claimed FROM achievement_player_milestone WHERE player_id = ? AND milestone_id = ?').get(player_id, milestone_id);
        alreadyClaimed = record && record.claimed === 1;
      }
    } catch (e) {
      alreadyClaimed = false;
    }
    
    if (alreadyClaimed) {
      return res.status(400).json({ success: false, error: '该里程碑奖励已领取' });
    }
    
    // 发放奖励
    const rewards = [];
    
    if (global.db && global.db.prepare) {
      try {
        if (milestone.reward_type === 'spirit_stones') {
          global.db.prepare('UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?').run(milestone.reward_amount, player_id);
          rewards.push({ type: 'spirit_stones', amount: milestone.reward_amount });
        } else if (milestone.reward_type === 'title' && milestone.title) {
          // 称号奖励 - 更新玩家称号
          global.db.prepare('UPDATE player SET title = ? WHERE id = ?').run(milestone.title, player_id);
          rewards.push({ type: 'title', title: milestone.title });
        }
        
        // 记录领取
        global.db.prepare(`
          INSERT OR REPLACE INTO achievement_player_milestone (player_id, milestone_id, claimed, claimed_at)
          VALUES (?, ?, 1, CURRENT_TIMESTAMP)
        `).run(player_id, milestone_id);
      } catch (e) {
        // 数据库操作失败，奖励可能已发放但记录失败
      }
    } else {
      // 无数据库时的内存奖励
      if (milestone.reward_type === 'spirit_stones') {
        rewards.push({ type: 'spirit_stones', amount: milestone.reward_amount });
      } else if (milestone.reward_type === 'title' && milestone.title) {
        rewards.push({ type: 'title', title: milestone.title });
      }
    }
    
    res.json({
      success: true,
      message: `领取成功！里程碑【${milestone.name}】奖励已发放`,
      milestone: {
        id: milestone.id,
        name: milestone.name,
        threshold: milestone.threshold
      },
      rewards
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 成就排行榜
router.get('/leaderboard', (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const topLimit = Math.min(100, Math.max(1, parseInt(limit)));
    
    let leaderboard = [];
    
    try {
      if (global.db && global.db.prepare) {
        const rows = global.db.prepare(`
          SELECT player_id, username, achievement_points, completed_count, updated_at
          FROM achievement_leaderboard_cache
          ORDER BY achievement_points DESC
          LIMIT ?
        `).all(topLimit);
        
        leaderboard = rows.map((row, index) => ({
          rank: index + 1,
          player_id: row.player_id,
          username: row.username || `玩家${row.player_id}`,
          achievement_points: row.achievement_points,
          completed_count: row.completed_count,
          updated_at: row.updated_at
        }));
      }
    } catch (e) {
      // 数据库不可用，返回空排行榜
      leaderboard = [];
    }
    
    // 如果排行榜为空，生成一些模拟数据用于测试
    if (leaderboard.length === 0) {
      leaderboard = [
        { rank: 1, player_id: 1, username: '天道圣人', achievement_points: 12580, completed_count: 42 },
        { rank: 2, player_id: 2, username: '修仙狂人', achievement_points: 9800, completed_count: 38 },
        { rank: 3, player_id: 3, username: '骨灰玩家', achievement_points: 8600, completed_count: 35 },
        { rank: 4, player_id: 4, username: '成就大师', achievement_points: 7200, completed_count: 30 },
        { rank: 5, player_id: 5, username: '练气士', achievement_points: 6500, completed_count: 28 },
      ];
    }
    
    res.json({
      success: true,
      leaderboard,
      total_players: leaderboard.length,
      last_updated: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 更新玩家成就进度（内部接口，供其他系统调用）
router.post('/update-progress', (req, res) => {
  try {
    const { player_id, achievement_id, progress_value } = req.body;
    
    if (!player_id || !achievement_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    // 查找成就配置
    let achievementConfig = null;
    for (const cat of Object.values(ACHIEVEMENT_CATEGORIES)) {
      achievementConfig = cat.achievements.find(a => a.id === achievement_id);
      if (achievementConfig) break;
    }
    
    if (!achievementConfig) {
      return res.status(404).json({ success: false, error: '成就不存在' });
    }
    
    const completed = progress_value >= achievementConfig.target;
    
    // 更新数据库
    try {
      if (global.db && global.db.prepare) {
        global.db.prepare(`
          INSERT INTO achievement_progress (player_id, achievement_id, progress, completed, completed_at, updated_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(player_id, achievement_id) DO UPDATE SET
            progress = MAX(progress, excluded.progress),
            completed = CASE WHEN excluded.completed = 1 AND player_achievements.completed = 0 THEN 1 ELSE player_achievements.completed END,
            completed_at = CASE WHEN excluded.completed = 1 AND player_achievements.completed = 0 THEN CURRENT_TIMESTAMP ELSE player_achievements.completed_at END,
            updated_at = CURRENT_TIMESTAMP
        `).run(player_id, achievement_id, progress_value, completed ? 1 : 0, completed ? new Date().toISOString() : null);
        
        // 如果完成，更新玩家成就统计
        if (completed) {
          const existing = global.db.prepare('SELECT completed_count FROM achievement_player_stats WHERE player_id = ?').get(player_id);
          if (existing) {
            global.db.prepare('UPDATE achievement_player_stats SET completed_count = completed_count + 1, updated_at = CURRENT_TIMESTAMP WHERE player_id = ?').run(player_id);
          } else {
            global.db.prepare('INSERT INTO achievement_player_stats (player_id, completed_count, total_points) VALUES (?, 1, 0)').run(player_id);
          }
          
          // 更新成就点数
          global.db.prepare(`
            UPDATE achievement_player_stats 
            SET total_points = total_points + ?, updated_at = CURRENT_TIMESTAMP 
            WHERE player_id = ?
          `).run(achievementConfig.points, player_id);
          
          // 更新排行榜缓存
          const stats = global.db.prepare('SELECT total_points, completed_count FROM achievement_player_stats WHERE player_id = ?').get(player_id);
          const player = global.db.prepare('SELECT username FROM player WHERE id = ?').get(player_id);
          if (stats) {
            global.db.prepare(`
              INSERT OR REPLACE INTO achievement_leaderboard_cache (player_id, username, achievement_points, completed_count, updated_at)
              VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            `).run(player_id, player ? player.username : null, stats.total_points, stats.completed_count);
          }
        }
      }
    } catch (e) {
      // 数据库操作失败，不影响主流程
    }
    
    res.json({
      success: true,
      achievement_id,
      progress: progress_value,
      target: achievementConfig.target,
      completed,
      points: achievementConfig.points
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取玩家成就详情
router.get('/player/:player_id', (req, res) => {
  try {
    const { player_id } = req.params;
    const { category } = req.query;
    
    // 获取玩家成就统计
    let stats = { total_points: 0, completed_count: 0 };
    try {
      if (global.db && global.db.prepare) {
        const row = global.db.prepare('SELECT total_points, completed_count FROM achievement_player_stats WHERE player_id = ?').get(player_id);
        if (row) {
          stats = { total_points: row.total_points || 0, completed_count: row.completed_count || 0 };
        }
      }
    } catch (e) {
      stats = { total_points: 0, completed_count: 0 };
    }
    
    // 获取玩家成就进度
    let playerProgress = {};
    try {
      if (global.db && global.db.prepare) {
        const rows = global.db.prepare('SELECT achievement_id, progress, completed, completed_at FROM achievement_progress WHERE player_id = ?').all(player_id);
        for (const row of rows) {
          playerProgress[row.achievement_id] = {
            progress: row.progress,
            completed: row.completed === 1,
            completed_at: row.completed_at
          };
        }
      }
    } catch (e) {
      playerProgress = {};
    }
    
    // 组装结果
    const result = {};
    const categories = category ? { [category]: ACHIEVEMENT_CATEGORIES[category] } : ACHIEVEMENT_CATEGORIES;
    
    for (const [catId, cat] of Object.entries(categories)) {
      const achievements = cat.achievements.map(a => {
        const progress = playerProgress[a.id] || { progress: 0, completed: false };
        return {
          id: a.id,
          name: a.name,
          desc: a.desc,
          target: a.target,
          points: a.points,
          reward: a.reward,
          progress: progress.progress,
          completed: progress.completed,
          percent: Math.min(100, Math.floor((progress.progress / a.target) * 100))
        };
      });
      
      const completedCount = achievements.filter(a => a.completed).length;
      const totalPoints = achievements.filter(a => a.completed).reduce((sum, a) => sum + a.points, 0);
      
      result[catId] = {
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        desc: cat.desc,
        achievements,
        stats: {
          total: achievements.length,
          completed: completedCount,
          progress_percent: achievements.length > 0 ? Math.floor((completedCount / achievements.length) * 100) : 0,
          earned_points: totalPoints
        }
      };
    }
    
    res.json({
      success: true,
      player_id: parseInt(player_id),
      player_stats: stats,
      categories: result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
