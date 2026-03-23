/**
 * 团队任务 API 路由
 * 任务发布、接取、进度查询、奖励分配
 */

import express, { Request, Response } from 'express';
import { TeamTaskSystem, TEAM_TASK_CONFIG, TEAM_TASK_TEMPLATES, TeamTask } from './team-task-system';

const router = express.Router();

// 初始化系统实例
const teamTaskSystem = new TeamTaskSystem();

// ==================== 团队任务配置 API ====================

// GET /api/team-task/config - 获取团队任务配置
router.get('/team-task/config', (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        taskTypes: TEAM_TASK_CONFIG.taskTypes,
        difficulty: TEAM_TASK_CONFIG.difficulty,
        taskStatus: TEAM_TASK_CONFIG.taskStatus,
        teamBonus: TEAM_TASK_CONFIG.teamBonus,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /api/team-task/templates - 获取任务模板列表
router.get('/team-task/templates', (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    
    let templates = Object.values(TEAM_TASK_TEMPLATES).flat();
    
    if (type) {
      templates = (templates as any[]).filter(t => t.type === parseInt(type as string));
    }
    
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ==================== 任务发布 API ====================

// POST /api/team-task/publish - 发布团队任务
router.post('/team-task/publish', (req: Request, res: Response) => {
  try {
    const { player_id, player_name, team_id, template_id, required_members } = req.body;
    
    if (!player_id || !player_name || !team_id || !template_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const result = teamTaskSystem.publishTask(
      player_id,
      player_name,
      team_id,
      template_id,
      required_members || 2
    );
    
    res.json({
      success: result.success,
      message: result.message,
      data: result.task
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ==================== 任务接取 API ====================

// POST /api/team-task/claim - 接取团队任务
router.post('/team-task/claim', (req: Request, res: Response) => {
  try {
    const { player_id, player_name, task_id } = req.body;
    
    if (!player_id || !player_name || !task_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const result = teamTaskSystem.claimTask(player_id, player_name, task_id);
    
    res.json({
      success: result.success,
      message: result.message,
      data: result.task
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ==================== 任务进度 API ====================

// GET /api/team-task/list - 获取团队任务列表
router.get('/team-task/list', (req: Request, res: Response) => {
  try {
    const { team_id, player_id } = req.query;
    
    if (!team_id && !player_id) {
      return res.status(400).json({ success: false, error: '缺少 team_id 或 player_id 参数' });
    }
    
    let tasks: TeamTask[] = [];
    
    if (team_id) {
      tasks = teamTaskSystem.getTeamTasks(team_id as string);
    } else if (player_id) {
      tasks = teamTaskSystem.getPlayerTasks(player_id as string);
    }
    
    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /api/team-task/available - 获取可接取的任务
router.get('/team-task/available', (req: Request, res: Response) => {
  try {
    const { team_id } = req.query;
    
    if (!team_id) {
      return res.status(400).json({ success: false, error: '缺少 team_id 参数' });
    }
    
    const tasks = teamTaskSystem.getAvailableTasks(team_id as string);
    
    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /api/team-task/detail - 获取任务详情
router.get('/team-task/detail', (req: Request, res: Response) => {
  try {
    const { task_id } = req.query;
    
    if (!task_id) {
      return res.status(400).json({ success: false, error: '缺少 task_id 参数' });
    }
    
    const task = teamTaskSystem.getTaskDetail(task_id as string);
    
    if (!task) {
      return res.status(404).json({ success: false, error: '任务不存在' });
    }
    
    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ==================== 任务进度更新 API ====================

// POST /api/team-task/progress - 更新任务进度
router.post('/team-task/progress', (req: Request, res: Response) => {
  try {
    const { task_id, player_id, progress, damage, healing, support } = req.body;
    
    if (!task_id || !player_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const result = teamTaskSystem.updateTaskProgress(
      task_id,
      player_id,
      progress || 0,
      damage || 0,
      healing || 0,
      support || 0
    );
    
    res.json({
      success: result.success,
      message: result.message,
      data: result.task
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ==================== 团队进度共享 API ====================

// GET /api/team-task/team-progress - 获取团队进度共享
router.get('/team-task/team-progress', (req: Request, res: Response) => {
  try {
    const { team_id } = req.query;
    
    if (!team_id) {
      return res.status(400).json({ success: false, error: '缺少 team_id 参数' });
    }
    
    const progress = teamTaskSystem.getTeamProgress(team_id as string);
    
    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ==================== 任务操作 API ====================

// POST /api/team-task/abandon - 放弃任务
router.post('/team-task/abandon', (req: Request, res: Response) => {
  try {
    const { task_id, player_id } = req.body;
    
    if (!task_id || !player_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const result = teamTaskSystem.abandonTask(task_id, player_id);
    
    res.json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ==================== 奖励分配 API ====================

// POST /api/team-task/distribute - 分配任务奖励
router.post('/team-task/distribute', (req: Request, res: Response) => {
  try {
    const { task_id } = req.body;
    
    if (!task_id) {
      return res.status(400).json({ success: false, error: '缺少 task_id 参数' });
    }
    
    const result = teamTaskSystem.distributeRewards(task_id);
    
    res.json({
      success: result.success,
      message: result.message,
      data: {
        rewards: result.rewards
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /api/team-task/claim-reward - 领取个人奖励
router.post('/team-task/claim-reward', (req: Request, res: Response) => {
  try {
    const { task_id, player_id } = req.body;
    
    if (!task_id || !player_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const result = teamTaskSystem.claimReward(task_id, player_id);
    
    res.json({
      success: result.success,
      message: result.message,
      data: result.reward
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
