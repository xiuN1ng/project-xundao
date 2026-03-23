/**
 * 团队任务共享系统 v1.0
 * 包含：任务发布、任务接取、任务进度共享、任务奖励分配、团队任务加成
 */

import express, { Request, Response } from 'express';

const router = express.Router();

// ==================== 团队任务配置 ====================
export const TEAM_TASK_CONFIG = {
  // 团队任务状态
  taskStatus: {
    PENDING: 1,      // 待接取
    IN_PROGRESS: 2, // 进行中
    COMPLETED: 3,   // 已完成
    EXPIRED: 4,      // 已过期
  },

  // 团队任务类型
  taskTypes: {
    COMMON: 1,      // 普通任务
    ELITE: 2,       // 精英任务
    BOSS: 3,        // BOSS任务
    DAILY: 4,       // 每日任务
    WEEKLY: 5,      // 每周任务
  },

  // 任务难度
  difficulty: {
    EASY: 1,        // 简单
    NORMAL: 2,      // 普通
    HARD: 3,        // 困难
    NIGHTMARE: 4,   // 噩梦
  },

  // 最大团队任务数
  maxTeamTasks: 10,

  // 任务接取冷却 (毫秒)
  claimCooldown: 60 * 1000,

  // 任务过期时间 (毫秒) - 默认24小时
  expireTime: 24 * 60 * 60 * 1000,

  // 团队加成配置
  teamBonus: {
    // 成员数量加成
    memberBonus: {
      2: 1.1,   // 2人团队 10%加成
      3: 1.15,  // 3人团队 15%加成
      4: 1.2,   // 4人团队 20%加成
      5: 1.25,  // 5人团队 25%加成
    },
    // 任务完成加成
    completionBonus: {
      1: 1.0,   // 1人完成 100%
      2: 1.2,   // 2人完成 120%
      3: 1.4,   // 3人完成 140%
      4: 1.6,   // 4人完成 160%
      5: 1.8,   // 5人完成 180%
    },
  },

  // 贡献度计算权重
  contributionWeight: {
    damage: 0.4,      // 伤害贡献 40%
    healing: 0.3,    // 治疗贡献 30%
    support: 0.3,   // 辅助贡献 30%
  },
};

// ==================== 团队任务模板 ====================
export const TEAM_TASK_TEMPLATES = {
  // 普通任务
  [TEAM_TASK_CONFIG.taskTypes.COMMON]: [
    { id: 'common_1', name: '采集药材', desc: '在指定地点采集药材x10', difficulty: 1, requireLevel: 1, rewardExp: 100, rewardGold: 50, rewardPoints: 10 },
    { id: 'common_2', name: '消灭怪物', desc: '击败指定怪物x20', difficulty: 1, requireLevel: 1, rewardExp: 150, rewardGold: 80, rewardPoints: 15 },
    { id: 'common_3', name: '护送任务', desc: '护送NPC到达目的地', difficulty: 2, requireLevel: 5, rewardExp: 300, rewardGold: 150, rewardPoints: 30 },
    { id: 'common_4', name: '寻找物品', desc: '寻找指定的物品x5', difficulty: 2, requireLevel: 3, rewardExp: 250, rewardGold: 120, rewardPoints: 25 },
    { id: 'common_5', name: '挑战副本', desc: '通关指定副本', difficulty: 3, requireLevel: 10, rewardExp: 500, rewardGold: 300, rewardPoints: 50 },
  ],
  // 精英任务
  [TEAM_TASK_CONFIG.taskTypes.ELITE]: [
    { id: 'elite_1', name: '精英怪讨伐', desc: '讨伐精英怪物', difficulty: 2, requireLevel: 8, rewardExp: 800, rewardGold: 500, rewardPoints: 80 },
    { id: 'elite_2', name: '据点清理', desc: '清理敌人据点', difficulty: 3, requireLevel: 15, rewardExp: 1200, rewardGold: 800, rewardPoints: 120 },
    { id: 'elite_3', name: '护送商队', desc: '保护商队安全到达', difficulty: 3, requireLevel: 12, rewardExp: 1000, rewardGold: 600, rewardPoints: 100 },
  ],
  // BOSS任务
  [TEAM_TASK_CONFIG.taskTypes.BOSS]: [
    { id: 'boss_1', name: 'BOSS讨伐', desc: '击败指定BOSS', difficulty: 3, requireLevel: 20, rewardExp: 3000, rewardGold: 2000, rewardPoints: 300 },
    { id: 'boss_2', name: '世界BOSS', desc: '参与击败世界BOSS', difficulty: 4, requireLevel: 30, rewardExp: 5000, rewardGold: 3000, rewardPoints: 500 },
    { id: 'boss_3', name: '公会BOSS', desc: '参与击败公会BOSS', difficulty: 4, requireLevel: 25, rewardExp: 4000, rewardGold: 2500, rewardPoints: 400 },
  ],
  // 每日任务
  [TEAM_TASK_CONFIG.taskTypes.DAILY]: [
    { id: 'daily_1', name: '每日副本', desc: '通关一次副本', difficulty: 1, requireLevel: 1, rewardExp: 200, rewardGold: 100, rewardPoints: 20 },
    { id: 'daily_2', name: '每日答题', desc: '回答5道题目', difficulty: 1, requireLevel: 5, rewardExp: 150, rewardGold: 80, rewardPoints: 15 },
    { id: 'daily_3', name: '每日PVP', desc: '完成3场PVP战斗', difficulty: 2, requireLevel: 10, rewardExp: 300, rewardGold: 150, rewardPoints: 30 },
  ],
  // 每周任务
  [TEAM_TASK_CONFIG.taskTypes.WEEKLY]: [
    { id: 'weekly_1', name: '周副本挑战', desc: '通关所有副本一次', difficulty: 2, requireLevel: 15, rewardExp: 2000, rewardGold: 1000, rewardPoints: 200 },
    { id: 'weekly_2', name: '周PVP荣耀', desc: '完成20场PVP战斗', difficulty: 3, requireLevel: 20, rewardExp: 3000, rewardGold: 1500, rewardPoints: 300 },
    { id: 'weekly_3', name: '周公会贡献', desc: '为公会做出足够贡献', difficulty: 2, requireLevel: 15, rewardExp: 2500, rewardGold: 1200, rewardPoints: 250 },
  ],
};

// ==================== 团队任务数据类 ====================
export interface TeamTask {
  id: string;
  templateId: string;
  name: string;
  desc: string;
  type: number;
  difficulty: number;
  requireLevel: number;
  rewardExp: number;
  rewardGold: number;
  rewardPoints: number;
  publisherId: string;
  publisherName: string;
  teamId: string;
  status: number;
  createdAt: number;
  expireAt: number;
  completedAt?: number;
  requiredMembers: number;  // 需要的成员数
  currentMembers: number;   // 当前成员数
  progress: number;         // 任务进度 0-100
  participants: TeamTaskParticipant[];
}

export interface TeamTaskParticipant {
  playerId: string;
  playerName: string;
  level: number;
  joinedAt: number;
  status: number;           // 1:进行中 2:已完成 3:已放弃
  contribution: number;     // 贡献度
  damage: number;           // 造成伤害
  healing: number;          // 治疗量
  support: number;         // 辅助贡献
  progress: number;         // 个人进度 0-100
  claimed: boolean;         // 是否已领取奖励
}

export interface TeamTaskData {
  playerTasks: Map<string, TeamTask>;
  publishedTasks: Map<string, TeamTask>;
  taskHistory: TeamTask[];
}

// ==================== 团队任务系统类 ====================
export class TeamTaskSystem {
  private playerData: Map<string, TeamTaskData> = new Map();
  private globalTasks: Map<string, TeamTask> = new Map();

  // 获取或创建玩家数据
  private getOrCreatePlayerData(playerId: string): TeamTaskData {
    if (!this.playerData.has(playerId)) {
      this.playerData.set(playerId, {
        playerTasks: new Map(),
        publishedTasks: new Map(),
        taskHistory: [],
      });
    }
    return this.playerData.get(playerId)!;
  }

  // 生成任务ID
  private generateTaskId(): string {
    return `team_task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 发布团队任务
  publishTask(
    playerId: string,
    playerName: string,
    teamId: string,
    templateId: string,
    requiredMembers: number = 2
  ): { success: boolean; message: string; task?: TeamTask } {
    // 验证模板是否存在
    let template: any = null;
    for (const templates of Object.values(TEAM_TASK_TEMPLATES)) {
      template = (templates as any[]).find(t => t.id === templateId);
      if (template) break;
    }

    if (!template) {
      return { success: false, message: '任务模板不存在' };
    }

    // 检查玩家发布的任务数是否已达上限
    const playerData = this.getOrCreatePlayerData(playerId);
    if (playerData.publishedTasks.size >= TEAM_TASK_CONFIG.maxTeamTasks) {
      return { success: false, message: '已发布任务数量已达上限' };
    }

    // 创建任务
    const task: TeamTask = {
      id: this.generateTaskId(),
      templateId: template.id,
      name: template.name,
      desc: template.desc,
      type: template.type || TEAM_TASK_CONFIG.taskTypes.COMMON,
      difficulty: template.difficulty,
      requireLevel: template.requireLevel,
      rewardExp: template.rewardExp,
      rewardGold: template.rewardGold,
      rewardPoints: template.rewardPoints,
      publisherId: playerId,
      publisherName: playerName,
      teamId: teamId,
      status: TEAM_TASK_CONFIG.taskStatus.PENDING,
      createdAt: Date.now(),
      expireAt: Date.now() + TEAM_TASK_CONFIG.expireTime,
      requiredMembers: requiredMembers,
      currentMembers: 1,  // 发布者算作第一个成员
      progress: 0,
      participants: [
        {
          playerId: playerId,
          playerName: playerName,
          level: 1,  // 实际应从玩家数据获取
          joinedAt: Date.now(),
          status: TEAM_TASK_CONFIG.taskStatus.IN_PROGRESS,
          contribution: 0,
          damage: 0,
          healing: 0,
          support: 0,
          progress: 0,
          claimed: false,
        },
      ],
    };

    playerData.publishedTasks.set(task.id, task);
    this.globalTasks.set(task.id, task);

    return { success: true, message: '任务发布成功', task };
  }

  // 接取团队任务
  claimTask(playerId: string, playerName: string, taskId: string): { success: boolean; message: string; task?: TeamTask } {
    const task = this.globalTasks.get(taskId);
    if (!task) {
      return { success: false, message: '任务不存在' };
    }

    // 检查任务状态
    if (task.status !== TEAM_TASK_CONFIG.taskStatus.PENDING) {
      return { success: false, message: '任务当前不可接取' };
    }

    // 检查任务是否已过期
    if (Date.now() > task.expireAt) {
      task.status = TEAM_TASK_CONFIG.taskStatus.EXPIRED;
      return { success: false, message: '任务已过期' };
    }

    // 检查成员数是否已满
    if (task.currentMembers >= task.requiredMembers) {
      return { success: false, message: '任务成员已满' };
    }

    // 检查是否已参加过该任务
    const existingParticipant = task.participants.find(p => p.playerId === playerId);
    if (existingParticipant) {
      return { success: false, message: '您已参与过此任务' };
    }

    // 添加参与者
    const participant: TeamTaskParticipant = {
      playerId: playerId,
      playerName: playerName,
      level: 1,
      joinedAt: Date.now(),
      status: TEAM_TASK_CONFIG.taskStatus.IN_PROGRESS,
      contribution: 0,
      damage: 0,
      healing: 0,
      support: 0,
      progress: 0,
      claimed: false,
    };

    task.participants.push(participant);
    task.currentMembers++;

    // 如果成员已满，任务开始
    if (task.currentMembers >= task.requiredMembers) {
      task.status = TEAM_TASK_CONFIG.taskStatus.IN_PROGRESS;
    }

    // 更新玩家任务数据
    const playerData = this.getOrCreatePlayerData(playerId);
    playerData.playerTasks.set(taskId, task);

    return { success: true, message: '任务接取成功', task };
  }

  // 更新任务进度
  updateTaskProgress(
    taskId: string,
    playerId: string,
    progress: number,
    damage: number = 0,
    healing: number = 0,
    support: number = 0
  ): { success: boolean; message: string; task?: TeamTask } {
    const task = this.globalTasks.get(taskId);
    if (!task) {
      return { success: false, message: '任务不存在' };
    }

    const participant = task.participants.find(p => p.playerId === playerId);
    if (!participant) {
      return { success: false, message: '您未参与此任务' };
    }

    // 更新个人进度
    participant.progress = Math.min(100, Math.max(participant.progress, progress));
    participant.damage += damage;
    participant.healing += healing;
    participant.support += support;

    // 计算贡献度
    participant.contribution = Math.floor(
      participant.damage * TEAM_TASK_CONFIG.contributionWeight.damage +
      participant.healing * TEAM_TASK_CONFIG.contributionWeight.healing +
      participant.support * TEAM_TASK_CONFIG.contributionWeight.support
    );

    // 更新团队整体进度 (取平均值)
    const totalProgress = task.participants.reduce((sum, p) => sum + p.progress, 0);
    task.progress = Math.floor(totalProgress / task.participants.length);

    // 检查任务是否完成
    if (task.progress >= 100) {
      task.status = TEAM_TASK_CONFIG.taskStatus.COMPLETED;
      task.completedAt = Date.now();
    }

    return { success: true, message: '进度更新成功', task };
  }

  // 获取团队任务列表
  getTeamTasks(teamId: string): TeamTask[] {
    const tasks: TeamTask[] = [];
    for (const task of this.globalTasks.values()) {
      if (task.teamId === teamId) {
        tasks.push(task);
      }
    }
    return tasks;
  }

  // 获取玩家参与的任务
  getPlayerTasks(playerId: string): TeamTask[] {
    const playerData = this.getOrCreatePlayerData(playerId);
    return Array.from(playerData.playerTasks.values());
  }

  // 获取可接取的任务列表
  getAvailableTasks(teamId: string): TeamTask[] {
    const tasks: TeamTask[] = [];
    for (const task of this.globalTasks.values()) {
      if (
        task.teamId === teamId &&
        task.status === TEAM_TASK_CONFIG.taskStatus.PENDING &&
        task.currentMembers < task.requiredMembers &&
        Date.now() < task.expireAt
      ) {
        tasks.push(task);
      }
    }
    return tasks;
  }

  // 获取任务详情
  getTaskDetail(taskId: string): TeamTask | null {
    return this.globalTasks.get(taskId) || null;
  }

  // 放弃任务
  abandonTask(taskId: string, playerId: string): { success: boolean; message: string } {
    const task = this.globalTasks.get(taskId);
    if (!task) {
      return { success: false, message: '任务不存在' };
    }

    // 发布者不能放弃任务
    if (task.publisherId === playerId) {
      return { success: false, message: '发布者不能放弃任务' };
    }

    const participantIndex = task.participants.findIndex(p => p.playerId === playerId);
    if (participantIndex === -1) {
      return { success: false, message: '您未参与此任务' };
    }

    // 标记参与者状态为放弃
    task.participants[participantIndex].status = 3; // 已放弃
    task.currentMembers--;

    // 从玩家任务列表中移除
    const playerData = this.getOrCreatePlayerData(playerId);
    playerData.playerTasks.delete(taskId);

    // 如果成员不足，任务失效
    if (task.currentMembers < 1) {
      task.status = TEAM_TASK_CONFIG.taskStatus.EXPIRED;
    }

    return { success: true, message: '已放弃任务' };
  }

  // 计算并分配奖励
  distributeRewards(taskId: string): { success: boolean; message: string; rewards: any[] } {
    const task = this.globalTasks.get(taskId);
    if (!task) {
      return { success: false, message: '任务不存在', rewards: [] };
    }

    if (task.status !== TEAM_TASK_CONFIG.taskStatus.COMPLETED) {
      return { success: false, message: '任务未完成', rewards: [] };
    }

    // 计算团队加成
    const memberCount = task.participants.filter(p => p.status === TEAM_TASK_CONFIG.taskStatus.IN_PROGRESS).length;
    const teamBonus = TEAM_TASK_CONFIG.teamBonus.memberBonus[memberCount as keyof typeof TEAM_TASK_CONFIG.teamBonus.memberBonus] || 1.0;
    const completionBonus = TEAM_TASK_CONFIG.teamBonus.completionBonus[memberCount as keyof typeof TEAM_TASK_CONFIG.teamBonus.completionBonus] || 1.0;
    const totalBonus = teamBonus * completionBonus;

    // 计算总贡献度
    const totalContribution = task.participants.reduce((sum, p) => sum + p.contribution, 0);

    // 分配奖励
    const rewards: any[] = [];
    for (const participant of task.participants) {
      if (participant.status === 3) continue; // 跳过已放弃的参与者

      // 按贡献度比例分配奖励
      const contributionRatio = totalContribution > 0 ? participant.contribution / totalContribution : 1 / task.participants.length;

      const reward = {
        playerId: participant.playerId,
        playerName: participant.playerName,
        exp: Math.floor(task.rewardExp * contributionRatio * totalBonus),
        gold: Math.floor(task.rewardGold * contributionRatio * totalBonus),
        points: Math.floor(task.rewardPoints * contributionRatio * totalBonus),
        bonusExp: Math.floor(task.rewardExp * totalBonus - task.rewardExp * contributionRatio),
        bonusGold: Math.floor(task.rewardGold * totalBonus - task.rewardGold * contributionRatio),
        bonusPoints: Math.floor(task.rewardPoints * totalBonus - task.rewardPoints * contributionRatio),
        contribution: participant.contribution,
        contributionRatio: Math.floor(contributionRatio * 100),
      };

      rewards.push(reward);
      participant.claimed = true;
    }

    return { success: true, message: '奖励分配成功', rewards };
  }

  // 玩家领取奖励
  claimReward(taskId: string, playerId: string): { success: boolean; message: string; reward?: any } {
    const task = this.globalTasks.get(taskId);
    if (!task) {
      return { success: false, message: '任务不存在' };
    }

    const participant = task.participants.find(p => p.playerId === playerId);
    if (!participant) {
      return { success: false, message: '您未参与此任务' };
    }

    if (!participant.claimed) {
      return { success: false, message: '奖励已领取或不可领取' };
    }

    if (task.status !== TEAM_TASK_CONFIG.taskStatus.COMPLETED) {
      return { success: false, message: '任务未完成' };
    }

    // 计算个人奖励
    const memberCount = task.participants.filter(p => p.status === TEAM_TASK_CONFIG.taskStatus.IN_PROGRESS).length;
    const teamBonus = TEAM_TASK_CONFIG.teamBonus.memberBonus[memberCount as keyof typeof TEAM_TASK_CONFIG.teamBonus.memberBonus] || 1.0;
    const completionBonus = TEAM_TASK_CONFIG.teamBonus.completionBonus[memberCount as keyof typeof TEAM_TASK_CONFIG.teamBonus.completionBonus] || 1.0;
    const totalBonus = teamBonus * completionBonus;

    const totalContribution = task.participants.reduce((sum, p) => sum + p.contribution, 0);
    const contributionRatio = totalContribution > 0 ? participant.contribution / totalContribution : 1 / task.participants.length;

    const reward = {
      exp: Math.floor(task.rewardExp * contributionRatio * totalBonus),
      gold: Math.floor(task.rewardGold * contributionRatio * totalBonus),
      points: Math.floor(task.rewardPoints * contributionRatio * totalBonus),
      contribution: participant.contribution,
    };

    participant.claimed = false; // 标记为已领取

    return { success: true, message: '奖励领取成功', reward };
  }

  // 获取团队任务进度 (所有成员可见)
  getTeamProgress(teamId: string): any {
    const tasks = this.getTeamTasks(teamId);
    
    return {
      teamId: teamId,
      tasks: tasks.map(task => ({
        id: task.id,
        name: task.name,
        desc: task.desc,
        type: task.type,
        difficulty: task.difficulty,
        status: task.status,
        progress: task.progress,
        requiredMembers: task.requiredMembers,
        currentMembers: task.currentMembers,
        publisherName: task.publisherName,
        createdAt: task.createdAt,
        expireAt: task.expireAt,
        participants: task.participants.map(p => ({
          playerId: p.playerId,
          playerName: p.playerName,
          level: p.level,
          status: p.status,
          progress: p.progress,
          contribution: p.contribution,
          claimed: p.claimed,
        })),
      })),
    };
  }
}

// 导出单例
export const teamTaskSystem = new TeamTaskSystem();
export default router;
