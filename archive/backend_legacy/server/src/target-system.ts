/**
 * 目标系统
 * 阶段性目标指引和奖励
 */

interface Target {
  id: string;
  name: string;
  description: string;
  category: 'daily' | 'weekly' | 'achievement' | 'story' | 'milestone';
  type: 'level' | 'quest' | 'kill' | 'collect' | 'social' | 'combat' | 'custom';
  requirement: {
    targetId: string;
    count: number;
    description?: string;
  };
  rewards: {
    gold?: number;
    exp?: number;
    items?: Array<{ id: string; count: number }>;
    title?: string;
  };
  prerequisite?: string;
  unlockLevel?: number;
  expireTime?: number;
}

interface PlayerTarget {
  targetId: string;
  playerId: string;
  progress: number;
  completed: boolean;
  claimed: boolean;
  startTime: number;
  completeTime?: number;
}

interface TargetGroup {
  groupId: string;
  name: string;
  description: string;
  targets: string[];
  totalRewards?: {
    gold?: number;
    exp?: number;
    items?: Array<{ id: string; count: number }>;
  };
}

class TargetSystem {
  private static targets: Map<string, Target> = new Map();
  private static groups: Map<string, TargetGroup> = new Map();
  private static playerTargets: Map<string, PlayerTarget[]> = new Map();
  
  /**
   * 初始化默认目标
   */
  static initDefaultTargets(): void {
    // 日常目标
    this.registerTarget({
      id: 'daily_1',
      name: '日常修炼',
      description: '完成10次修炼',
      category: 'daily',
      type: 'custom',
      requirement: { targetId: 'cultivate', count: 10 },
      rewards: { gold: 100, exp: 500 }
    });
    
    this.registerTarget({
      id: 'daily_2',
      name: '斩妖除魔',
      description: '击败50只怪物',
      category: 'daily',
      type: 'kill',
      requirement: { targetId: 'monster', count: 50 },
      rewards: { gold: 200, exp: 1000 }
    });
    
    this.registerTarget({
      id: 'daily_3',
      name: '副本挑战',
      description: '通关1次副本',
      category: 'daily',
      type: 'quest',
      requirement: { targetId: 'dungeon', count: 1 },
      rewards: { gold: 300, exp: 1500, items: [{ id: 'dungeon_key', count: 1 }] }
    });
    
    // 每周目标
    this.registerTarget({
      id: 'weekly_1',
      name: '周常BOSS',
      description: '击败5只世界BOSS',
      category: 'weekly',
      type: 'kill',
      requirement: { targetId: 'world_boss', count: 5 },
      rewards: { gold: 2000, exp: 10000, items: [{ id: 'boss_essence', count: 10 }] }
    });
    
    this.registerTarget({
      id: 'weekly_2',
      name: '竞技场王者',
      description: '在竞技场获得100场胜利',
      category: 'weekly',
      type: 'combat',
      requirement: { targetId: 'arena_win', count: 100 },
      rewards: { gold: 3000, exp: 15000, title: '竞技王者' }
    });
    
    // 成就目标
    this.registerTarget({
      id: 'achieve_1',
      name: '初入修仙',
      description: '达到10级',
      category: 'achievement',
      type: 'level',
      requirement: { targetId: 'level', count: 10 },
      rewards: { gold: 500, exp: 2000, title: '初窥门径' }
    });
    
    this.registerTarget({
      id: 'achieve_2',
      name: '筑基成功',
      description: '达到50级',
      category: 'achievement',
      type: 'level',
      requirement: { targetId: 'level', count: 50 },
      rewards: { gold: 2000, exp: 10000, title: '筑基修士' }
    });
    
    this.registerTarget({
      id: 'achieve_3',
      name: '金丹大道',
      description: '达到100级',
      category: 'achievement',
      type: 'level',
      requirement: { targetId: 'level', count: 100 },
      rewards: { gold: 10000, exp: 50000, title: '金丹真人' }
    });
    
    this.registerTarget({
      id: 'achieve_4',
      name: '装备收藏家',
      description: '收集100件不同装备',
      category: 'achievement',
      type: 'collect',
      requirement: { targetId: 'equipment', count: 100 },
      rewards: { gold: 5000, exp: 20000, items: [{ id: 'equipment_chest', count: 10 }] }
    });
    
    // 里程碑目标
    this.registerTarget({
      id: 'milestone_1',
      name: '首充礼包',
      description: '完成首次充值',
      category: 'milestone',
      type: 'custom',
      requirement: { targetId: 'first_recharge', count: 1 },
      rewards: { gold: 1000, exp: 5000, items: [{ id: 'first_recharge_pack', count: 1 }] }
    });
    
    this.registerTarget({
      id: 'milestone_2',
      name: '宗门之主',
      description: '创建或加入宗门',
      category: 'milestone',
      type: 'social',
      requirement: { targetId: 'sect', count: 1 },
      rewards: { gold: 2000, exp: 10000 }
    });
    
    // 目标组
    this.registerGroup({
      groupId: 'daily_group',
      name: '每日目标',
      description: '每日刷新的人生目标',
      targets: ['daily_1', 'daily_2', 'daily_3'],
      totalRewards: { gold: 600, exp: 3000 }
    });
    
    this.registerGroup({
      groupId: 'weekly_group',
      name: '每周目标',
      description: '每周挑战',
      targets: ['weekly_1', 'weekly_2'],
      totalRewards: { gold: 5000, exp: 25000 }
    });
  }
  
  /**
   * 注册目标
   */
  static registerTarget(target: Target): void {
    this.targets.set(target.id, target);
  }
  
  /**
   * 注册目标组
   */
  static registerGroup(group: TargetGroup): void {
    this.groups.set(group.groupId, group);
  }
  
  /**
   * 初始化玩家目标
   */
  static initPlayerTargets(playerId: string): PlayerTarget[] {
    const targets: PlayerTarget[] = [];
    
    // 添加所有可用目标
    for (const target of this.targets.values()) {
      // 检查等级限制
      if (target.unlockLevel && target.unlockLevel > 1) continue;
      
      // 检查先决条件
      if (target.prerequisite) continue;
      
      // 检查是否日常目标（需要刷新）
      if (target.category === 'daily') {
        // TODO: 检查是否今日已初始化
      }
      
      targets.push({
        targetId: target.id,
        playerId,
        progress: 0,
        completed: false,
        claimed: false,
        startTime: Date.now()
      });
    }
    
    this.playerTargets.set(playerId, targets);
    return targets;
  }
  
  /**
   * 更新目标进度
   */
  static updateProgress(playerId: string, targetId: string, progress: number): {
    completed: boolean;
    claimed: boolean;
  } {
    const targets = this.playerTargets.get(playerId);
    if (!targets) return { completed: false, claimed: false };
    
    const playerTarget = targets.find(t => t.targetId === targetId);
    if (!playerTarget) return { completed: false, claimed: false };
    
    const targetConfig = this.targets.get(targetId);
    if (!targetConfig) return { completed: false, claimed: false };
    
    playerTarget.progress = Math.min(progress, targetConfig.requirement.count);
    
    if (playerTarget.progress >= targetConfig.requirement.count) {
      playerTarget.completed = true;
      playerTarget.completeTime = Date.now();
    }
    
    return {
      completed: playerTarget.completed,
      claimed: playerTarget.claimed
    };
  }
  
  /**
   * 增加目标进度
   */
  static addProgress(playerId: string, targetType: string, targetId: string, amount: number = 1): void {
    const targets = this.playerTargets.get(playerId);
    if (!targets) return;
    
    for (const playerTarget of targets) {
      const targetConfig = this.targets.get(playerTarget.targetId);
      if (!targetConfig) continue;
      
      // 检查类型匹配
      if (targetConfig.type !== targetType && targetType !== 'custom') continue;
      
      // 检查目标ID匹配
      if (targetConfig.requirement.targetId !== targetId) continue;
      
      // 检查是否已完成
      if (playerTarget.completed) continue;
      
      // 增加进度
      playerTarget.progress = Math.min(
        playerTarget.progress + amount,
        targetConfig.requirement.count
      );
      
      // 检查完成
      if (playerTarget.progress >= targetConfig.requirement.count) {
        playerTarget.completed = true;
        playerTarget.completeTime = Date.now();
      }
    }
  }
  
  /**
   * 领取目标奖励
   */
  static claimReward(playerId: string, targetId: string): {
    success: boolean;
    rewards?: {
      gold?: number;
      exp?: number;
      items?: Array<{ id: string; count: number }>;
      title?: string;
    };
    message: string;
  } {
    const targets = this.playerTargets.get(playerId);
    if (!targets) {
      return { success: false, message: '目标不存在' };
    }
    
    const playerTarget = targets.find(t => t.targetId === targetId);
    if (!playerTarget) {
      return { success: false, message: '目标不存在' };
    }
    
    if (!playerTarget.completed) {
      return { success: false, message: '目标未完成' };
    }
    
    if (playerTarget.claimed) {
      return { success: false, message: '奖励已领取' };
    }
    
    const targetConfig = this.targets.get(targetId);
    if (!targetConfig) {
      return { success: false, message: '目标配置错误' };
    }
    
    playerTarget.claimed = true;
    
    return {
      success: true,
      rewards: targetConfig.rewards,
      message: `成功领取${targetConfig.name}奖励！`
    };
  }
  
  /**
   * 获取玩家目标列表
   */
  static getPlayerTargets(playerId: string, category?: string): PlayerTarget[] {
    const targets = this.playerTargets.get(playerId);
    if (!targets) return [];
    
    if (category) {
      return targets.filter(t => {
        const config = this.targets.get(t.targetId);
        return config?.category === category;
      });
    }
    
    return targets;
  }
  
  /**
   * 获取可领取奖励的目标
   */
  static getClaimableTargets(playerId: string): Array<{ target: Target; playerTarget: PlayerTarget }> {
    const targets = this.playerTargets.get(playerId);
    if (!targets) return [];
    
    return targets
      .filter(t => t.completed && !t.claimed)
      .map(t => ({
        target: this.targets.get(t.targetId)!,
        playerTarget: t
      }))
      .filter(t => t.target);
  }
}

export default TargetSystem;
export { Target, TargetGroup, PlayerTarget };
