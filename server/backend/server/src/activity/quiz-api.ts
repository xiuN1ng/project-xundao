/**
 * 答题活动系统 API 路由
 * 题目管理、活动管理、玩家答题、排行榜
 */

import express, { Request, Response } from 'express';
import { 
  quizActivitySystem, 
  Question, 
  QuizActivity, 
  QuestionDifficulty 
} from './quiz-activity';

const router = express.Router();

// ==================== 题目库管理 API ====================

// GET /api/quiz/questions - 获取所有题目
router.get('/questions', (req: Request, res: Response) => {
  try {
    const { difficulty, category } = req.query;
    
    let questions;
    if (difficulty) {
      questions = quizActivitySystem.getQuestionsByDifficulty(difficulty as QuestionDifficulty);
    } else if (category) {
      questions = quizActivitySystem.getQuestionsByCategory(category as string);
    } else {
      questions = quizActivitySystem.getAllQuestions();
    }
    
    res.json({
      success: true,
      data: questions
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /api/quiz/questions/:id - 获取题目详情
router.get('/questions/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const question = quizActivitySystem.getQuestion(id);
    
    if (!question) {
      return res.status(404).json({ success: false, error: '题目不存在' });
    }
    
    res.json({
      success: true,
      data: question
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /api/quiz/categories - 获取题目分类
router.get('/categories', (req: Request, res: Response) => {
  try {
    const categories = quizActivitySystem.getCategories();
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /api/quiz/questions - 添加题目
router.post('/questions', (req: Request, res: Response) => {
  try {
    const question: Question = req.body;
    
    const result = quizActivitySystem.addQuestion(question);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// PUT /api/quiz/questions/:id - 更新题目
router.put('/questions/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const result = quizActivitySystem.updateQuestion(id, updates);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// DELETE /api/quiz/questions/:id - 删除题目
router.delete('/questions/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = quizActivitySystem.deleteQuestion(id);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ==================== 活动管理 API ====================

// GET /api/quiz/activities - 获取所有活动
router.get('/activities', (req: Request, res: Response) => {
  try {
    const { active } = req.query;
    
    let activities;
    if (active === 'true') {
      activities = quizActivitySystem.getActiveActivities();
    } else {
      activities = quizActivitySystem.getAllActivities();
    }
    
    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /api/quiz/activities/:id - 获取活动详情
router.get('/activities/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const activity = quizActivitySystem.getActivity(id);
    
    if (!activity) {
      return res.status(404).json({ success: false, error: '活动不存在' });
    }
    
    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /api/quiz/activities - 创建活动
router.post('/activities', (req: Request, res: Response) => {
  try {
    const activity: QuizActivity = req.body;
    
    const result = quizActivitySystem.createActivity(activity);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// PUT /api/quiz/activities/:id - 更新活动
router.put('/activities/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const result = quizActivitySystem.updateActivity(id, updates);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /api/quiz/activities/:id/toggle - 开启/关闭活动
router.post('/activities/:id/toggle', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { active } = req.body;
    
    if (typeof active !== 'boolean') {
      return res.status(400).json({ success: false, error: '缺少 active 参数' });
    }
    
    const result = quizActivitySystem.toggleActivity(id, active);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ==================== 玩家答题 API ====================

// POST /api/quiz/start - 开始答题
router.post('/start', (req: Request, res: Response) => {
  try {
    const { player_id, activity_id } = req.body;
    
    if (!player_id || !activity_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const result = quizActivitySystem.startQuiz(player_id, activity_id);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /api/quiz/current - 获取当前题目
router.get('/current', (req: Request, res: Response) => {
  try {
    const { player_id, activity_id } = req.query;
    
    if (!player_id || !activity_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const result = quizActivitySystem.getCurrentQuestion(
      player_id as string,
      activity_id as string
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /api/quiz/answer - 提交答案
router.post('/answer', (req: Request, res: Response) => {
  try {
    const { player_id, activity_id, question_id, answers } = req.body;
    
    if (!player_id || !activity_id || !question_id || !answers) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const result = quizActivitySystem.submitAnswer(
      player_id,
      activity_id,
      question_id,
      answers
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /api/quiz/result - 获取答题结果
router.get('/result', (req: Request, res: Response) => {
  try {
    const { player_id, activity_id } = req.query;
    
    if (!player_id || !activity_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const result = quizActivitySystem.getQuizResult(
      player_id as string,
      activity_id as string
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /api/quiz/player/activities - 获取玩家参与的活动
router.get('/player/activities', (req: Request, res: Response) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id 参数' });
    }
    
    const activities = quizActivitySystem.getPlayerActivities(player_id as string);
    
    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ==================== 排行榜 API ====================

// GET /api/quiz/leaderboard - 获取排行榜
router.get('/leaderboard', (req: Request, res: Response) => {
  try {
    const { activity_id, limit } = req.query;
    
    if (!activity_id) {
      return res.status(400).json({ success: false, error: '缺少 activity_id 参数' });
    }
    
    const leaderboard = quizActivitySystem.getLeaderboard(
      activity_id as string,
      limit ? parseInt(limit as string) : undefined
    );
    
    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /api/quiz/player/rank - 获取玩家排名
router.get('/player/rank', (req: Request, res: Response) => {
  try {
    const { player_id, activity_id } = req.query;
    
    if (!player_id || !activity_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const result = quizActivitySystem.getPlayerRank(
      player_id as string,
      activity_id as string
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ==================== 系统 API ====================

// POST /api/quiz/check-expired - 检查超时答题
router.post('/check-expired', (req: Request, res: Response) => {
  try {
    const expiredCount = quizActivitySystem.checkExpiredSessions();
    
    res.json({
      success: true,
      message: `已标记 ${expiredCount} 个超时答题`,
      expiredCount
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
