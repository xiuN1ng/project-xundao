/**
 * 游戏后端模块导出
 * 整合所有游戏系统模块
 */

// 活动系统 (v29: 跨服活动、全服活动)
export * from './activity';
export * from './activity/cross-server-activity';
export * from './activity/global-server-activity';

// 成就系统
export * from './achievement';

// 战斗加速系统
export { 
  BATTLE_SPEED_CONFIG,
  default as battleSpeedRouter
} from './battle-speed';

export type {
  BattleSpeedState,
  AcceleratedBattleResult
} from './battle-speed';

// 技能系统 (v29: 必杀奥义、战斗姿态)
export * from './skill/skill-system';
export * from './skill/ultimate-skill-system';
export * from './skill/battle-stance-system';

// 经脉系统 (v29: 经脉突破)
export * from './meridian/meridian-system';
export * from './meridian/meridian-breakthrough-system';

// 天赋系统 (v29: 天赋觉醒)
export * from './talent/talent-system';
export * from './talent/talent-awakening-system';

// 神器系统 (v30: 神器获取、强化、精炼、合成)
export * from './artifact';

// 资源交易系统 (v30: 自由市场、拍卖行、玩家店铺)
export * from './trade';

// 资源回收系统 (v30: 装备回收、道具回收、分解熔炼)
export * from './recycle';

// 社交系统 - 情缘传承 (v30: 结婚纪念日、情缘传承、情缘称号)
export * from './social';

// 游戏系统 API (技能升级/突破, 装备强化/精炼, 师徒任务)
export { default as gameApiRouter } from './game-api';

// 答题活动系统 API
export { default as quizApiRouter } from './activity/quiz-api';

// 其他系统导出
export { default as worldMapRouter } from './world-map';
export { default as teleportRouter } from './teleport';
export { default as multiplierRouter } from './multiplier';
export { default as taskFeedbackRouter } from './task-feedback';
export { default as realmSuppressionRouter } from './realm-suppression';

// 赏金任务系统 (v31)
export * from './bounty/bounty-task-system';

// 红包系统 (v31)
export * from './redpacket/redpacket-system';

// 黑市系统 (v31)
export * from './blackmarket/blackmarket-system';

// 自动躲避系统 (v31)
export * from './auto-dodge/auto-dodge-system';

// 一键扫荡系统 (v31)
export * from './sweep/sweep-system';

// 团队任务共享系统 (v1.0)
export * from './team-task';

// 自动技能施放系统 (v1.0)
export * from './auto-cast-system';

// 翅膀系统 (v1.0: 飞行翅膀外观与属性加成)
export * from './wing';

// 聊天系统 API (世界频道、宗门频道、私信)
export { default as chatApiRouter } from './chat-api';
export * from './chat-system';

// 福利系统 API (签到系统、次日/三日登录奖励)
export { default as welfareApiRouter, initWelfareApi } from './welfare_api';

// 灵兽进化系统 (v1.0: 灵兽进化、资质提升、技能学习)
export * from './pet';
export { default as petApiRouter } from './pet/pet-api';
export { initPetSystem } from './pet';

// 魔器装备系统 (v1.0: 魔器属性、特效、魔器商店)
export * from './demon-artifact';

// ... 可以继续添加其他模块
