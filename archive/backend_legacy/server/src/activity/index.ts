export { holidayEventSystem, default } from './holiday-event-system';
export * from './holiday-event-system';

export { escortActivitySystem, default as EscortActivitySystem } from './escort-activity';
export * from './escort-activity';

export { quizActivitySystem, default as QuizActivitySystem } from './quiz-activity';
export * from './quiz-activity';
export { default as quizApiRouter } from './quiz-api';

/**
 * 答题活动系统 (Quiz Activity System)
 * 答题竞赛活动，玩家回答问题获取积分和奖励
 * 
 * 主要功能：
 * - 题目库管理（增删改查）
 * - 答题竞赛活动开启与管理
 * - 玩家答题接口
 * - 答题计时和得分计算（基础分 + 速度加成）
 * - 排行榜功能
 */
