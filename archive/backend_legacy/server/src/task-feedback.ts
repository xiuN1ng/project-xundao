/**
 * 任务评价系统 - 任务反馈
 * 提供任务完成后的评价、评分、反馈功能
 */

import { Router, Request, Response } from 'express';

const router = Router();

// 任务评价数据
interface TaskFeedback {
  taskId: string;
  playerId: string;
  rating: number; // 1-5星
  comment: string;
  timestamp: number;
  difficulty: 'easy' | 'normal' | 'hard' | 'nightmare';
  completionTime: number; // 完成耗时（秒）
  rewards: {
    exp: number;
    spirit: number;
    items: string[];
  };
  isRecommended: boolean;
}

// 任务评价统计
interface TaskRatingStats {
  taskId: string;
  totalRatings: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
  recommendRate: number;
}

// 玩家任务反馈存储
const feedbackStore: Map<string, TaskFeedback[]> = new Map();
// 任务评分统计缓存
const ratingStatsCache: Map<string, TaskRatingStats> = new Map();

// 任务评价配置
const TASK_RATING_CONFIG = {
  minRating: 1,
  maxRating: 5,
  rewardPerStar: {
    exp: 10,
    spirit: 5,
  },
};

// 提交任务评价
router.post('/task/feedback', (req: Request, res: Response) => {
  const { playerId, taskId, rating, comment, difficulty, completionTime, rewards, isRecommended } = req.body;
  
  if (!playerId || !taskId || !rating) {
    return res.json({ success: false, message: '参数不完整' });
  }
  
  if (rating < TASK_RATING_CONFIG.minRating || rating > TASK_RATING_CONFIG.maxRating) {
    return res.json({ success: false, message: '评分应在1-5之间' });
  }
  
  const feedback: TaskFeedback = {
    taskId,
    playerId,
    rating,
    comment: comment || '',
    timestamp: Date.now(),
    difficulty: difficulty || 'normal',
    completionTime: completionTime || 0,
    rewards: rewards || { exp: 0, spirit: 0, items: [] },
    isRecommended: isRecommended || false,
  };
  
  // 存储评价
  const taskFeedbacks = feedbackStore.get(taskId) || [];
  taskFeedbacks.push(feedback);
  feedbackStore.set(taskId, taskFeedbacks);
  
  // 更新统计缓存
  updateRatingStats(taskId);
  
  // 评分奖励
  const bonusExp = rating * TASK_RATING_CONFIG.rewardPerStar.exp;
  const bonusSpirit = rating * TASK_RATING_CONFIG.rewardPerStar.spirit;
  
  res.json({
    success: true,
    message: '评价提交成功',
    data: {
      rating,
      bonus: {
        exp: bonusExp,
        spirit: bonusSpirit,
      },
      timestamp: feedback.timestamp,
    }
  });
});

// 获取任务评价列表
router.get('/task/feedback/:taskId', (req: Request, res: Response) => {
  const { taskId } = req.params;
  const { limit = 10, offset = 0 } = req.query;
  
  const feedbacks = feedbackStore.get(taskId) || [];
  const total = feedbacks.length;
  
  // 按时间倒序
  const sorted = feedbacks
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(Number(offset), Number(offset) + Number(limit));
  
  res.json({
    success: true,
    data: {
      total,
      list: sorted,
      limit: Number(limit),
      offset: Number(offset),
    }
  });
});

// 获取任务评分统计
router.get('/task/rating-stats/:taskId', (req: Request, res: Response) => {
  const { taskId } = req.params;
  
  let stats = ratingStatsCache.get(taskId);
  
  if (!stats) {
    stats = {
      taskId,
      totalRatings: 0,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      recommendRate: 0,
    };
  }
  
  res.json({
    success: true,
    data: stats
  });
});

// 更新任务评分统计
function updateRatingStats(taskId: string): void {
  const feedbacks = feedbackStore.get(taskId) || [];
  if (feedbacks.length === 0) return;
  
  const totalRatings = feedbacks.length;
  const totalRating = feedbacks.reduce((sum, f) => sum + f.rating, 0);
  const averageRating = totalRating / totalRatings;
  
  const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  feedbacks.forEach(f => {
    ratingDistribution[f.rating] = (ratingDistribution[f.rating] || 0) + 1;
  });
  
  const recommendedCount = feedbacks.filter(f => f.isRecommended).length;
  const recommendRate = recommendedCount / totalRatings;
  
  ratingStatsCache.set(taskId, {
    taskId,
    totalRatings,
    averageRating: Math.round(averageRating * 10) / 10,
    ratingDistribution,
    recommendRate: Math.round(recommendRate * 100) / 100,
  });
}

// 获取玩家评价历史
router.get('/task/player-feedback/:playerId', (req: Request, res: Response) => {
  const { playerId } = req.params;
  
  const allFeedbacks: TaskFeedback[] = [];
  feedbackStore.forEach feedbacks => {
    const playerFeedbacks = feedbacks.filter(f => f.playerId === playerId);
    allFeedbacks.push(...playerFeedbacks);
  });
  
  // 按时间倒序
  allFeedbacks.sort((a, b) => b.timestamp - a.timestamp);
  
  res.json({
    success: true,
    data: {
      total: allFeedbacks.length,
      list: allFeedbacks.slice(0, 20),
    }
  });
});

// 任务完成反馈（简化版）
router.post('/task/complete-feedback', (req: Request, res: Response) => {
  const { playerId, taskId, completionTime, difficulty } = req.body;
  
  if (!playerId || !taskId) {
    return res.json({ success: false, message: '参数不完整' });
  }
  
  // 返回评价提示
  res.json({
    success: true,
    message: '任务完成！请对任务进行评价',
    data: {
      taskId,
      completionTime: completionTime || 0,
      difficulty: difficulty || 'normal',
      prompt: '感谢完成本次任务，请对任务难度和体验进行评价',
    }
  });
});

// 获取热门任务（评价最多）
router.get('/task/popular', (req: Request, res: Response) => {
  const { limit = 10 } = req.query;
  
  const taskStats: Array<{ taskId: string; totalRatings: number; averageRating: number }> = [];
  
  ratingStatsCache.forEach((stats, taskId) => {
    taskStats.push({
      taskId,
      totalRatings: stats.totalRatings,
      averageRating: stats.averageRating,
    });
  });
  
  // 按评价数量排序
  taskStats.sort((a, b) => b.totalRatings - a.totalRatings);
  
  res.json({
    success: true,
    data: taskStats.slice(0, Number(limit))
  });
});

// 获取推荐任务（好评率高）
router.get('/task/recommended', (req: Request, res: Response) => {
  const { limit = 10, minRating = 4 } = req.query;
  
  const recommendedTasks: Array<{ taskId: string; recommendRate: number; averageRating: number }> = [];
  
  ratingStatsCache.forEach((stats, taskId) => {
    if (stats.averageRating >= Number(minRating) && stats.recommendRate > 0.5) {
      recommendedTasks.push({
        taskId,
        recommendRate: stats.recommendRate,
        averageRating: stats.averageRating,
      });
    }
  });
  
  // 按好评率排序
  recommendedTasks.sort((a, b) => b.recommendRate - a.recommendRate);
  
  res.json({
    success: true,
    data: recommendedTasks.slice(0, Number(limit))
  });
});

// 批量获取任务评分
router.post('/task/ratings-batch', (req: Request, res: Response) => {
  const { taskIds } = req.body;
  
  if (!taskIds || !Array.isArray(taskIds)) {
    return res.json({ success: false, message: '请提供任务ID数组' });
  }
  
  const results: Record<string, TaskRatingStats> = {};
  taskIds.forEach(taskId => {
    const stats = ratingStatsCache.get(taskId);
    if (stats) {
      results[taskId] = stats;
    }
  });
  
  res.json({
    success: true,
    data: results
  });
});

export default router;
