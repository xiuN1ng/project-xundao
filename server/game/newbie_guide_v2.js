/**
 * 挂机修仙 - 新手引导系统 v2
 * 
 * 功能：
 * 1. 步骤引导：修炼→突破→战斗→功法→装备
 * 2. 每步有明确目标和奖励
 * 3. 完成后自动解锁下一功能
 * 4. 进度可保存
 */

// ==================== 引导步骤配置 ====================
const GUIDE_STEPS = [
  {
    id: 'step_1_cultivate',
    title: '初入仙途',
    description: '点击"修炼"按钮进行修炼',
    target: { action: 'cultivate', count: 10 },
    reward: { spirit: 100 },
    unlock: ['breakthrough']
  },
  {
    id: 'step_2_breakthrough',
    title: '境界突破',
    description: '积累灵气后突破境界',
    target: { action: 'breakthrough' },
    reward: { spirit: 200, stone: 50 },
    unlock: ['combat']
  },
  {
    id: 'step_3_first_battle',
    title: '首战告捷',
    description: '击败第一只怪物',
    target: { action: 'battle', win: 1 },
    reward: { stone: 100, technique_point: 1 },
    unlock: ['technique']
  },
  {
    id: 'step_4_learn_technique',
    title: '修炼功法',
    description: '学习第一本功法',
    target: { action: 'learn_technique' },
    reward: { technique_point: 2 },
    unlock: ['equipment']
  },
  {
    id: 'step_5_equip',
    title: '装备强化',
    description: '强化第一件装备',
    target: { action: 'enhance_equipment' },
    reward: { stone: 200 },
    unlock: ['dungeon']
  },
  {
    id: 'step_6_dungeon',
    title: '挑战副本',
    description: '通关第一个副本',
    target: { action: 'clear_dungeon' },
    reward: { stone: 500, spirit: 1000 },
    unlock: ['complete']
  }
];

/**
 * 新手引导系统
 */
class NewbieGuideSystem {
  constructor() {
    this.steps = GUIDE_STEPS;
    this.playerProgress = new Map(); // playerId -> { currentStep, completed: [] }
  }
  
  /**
   * 获取玩家引导状态
   */
  getGuideStatus(playerId) {
    if (!this.playerProgress.has(playerId)) {
      this.playerProgress.set(playerId, {
        currentStep: 0,
        completed: [],
        rewards: {}
      });
    }
    return this.playerProgress.get(playerId);
  }
  
  /**
   * 获取当前步骤
   */
  getCurrentStep(playerId) {
    const progress = this.getGuideStatus(playerId);
    if (progress.currentStep >= this.steps.length) {
      return null; // 引导已完成
    }
    return this.steps[progress.currentStep];
  }
  
  /**
   * 检查进度并更新
   */
  checkProgress(playerId, action, data = {}) {
    const progress = this.getGuideStatus(playerId);
    const currentStep = this.getCurrentStep(playerId);
    
    if (!currentStep) return { completed: true };
    
    const target = currentStep.target;
    
    // 检查是否达成目标
    let completed = false;
    if (target.action === action) {
      switch (action) {
        case 'cultivate':
          // 累计次数
          progress.rewards.cultivate = (progress.rewards.cultivate || 0) + 1;
          if (progress.rewards.cultivate >= target.count) completed = true;
          break;
        case 'breakthrough':
          if (data.success) completed = true;
          break;
        case 'battle':
          if (data.win >= target.win) completed = true;
          break;
        case 'learn_technique':
          completed = true;
          break;
        case 'enhance_equipment':
          completed = true;
          break;
        case 'clear_dungeon':
          if (data.success) completed = true;
          break;
      }
    }
    
    if (completed) {
      // 记录完成
      progress.completed.push(currentStep.id);
      progress.currentStep++;
      
      // 返回奖励信息
      return {
        stepCompleted: currentStep,
        reward: currentStep.reward,
        nextStep: this.getCurrentStep(playerId),
        unlock: currentStep.unlock
      };
    }
    
    return { completed: false, progress: progress.rewards };
  }
  
  /**
   * 领取奖励
   */
  claimReward(playerId) {
    const progress = this.getGuideStatus(playerId);
    const currentStep = this.getCurrentStep(playerId);
    
    if (!currentStep || progress.currentStep === 0) {
      return { success: false, message: '没有可领取的奖励' };
    }
    
    // 获取上一个完成的步骤
    const completedIndex = progress.currentStep - 1;
    if (completedIndex < 0) {
      return { success: false, message: '没有可领取的奖励' };
    }
    
    const completedStep = this.steps[completedIndex];
    return {
      success: true,
      reward: completedStep.reward,
      message: `领取 ${completedStep.title} 奖励成功！`
    };
  }
  
  /**
   * 跳过引导（用于测试或特殊情况下）
   */
  skipGuide(playerId) {
    const progress = this.getGuideStatus(playerId);
    progress.currentStep = this.steps.length;
    progress.completed = this.steps.map(s => s.id);
    return { success: true };
  }
  
  /**
   * 是否完成全部引导
   */
  isGuideCompleted(playerId) {
    const progress = this.getGuideStatus(playerId);
    return progress.currentStep >= this.steps.length;
  }
}

/**
 * 生成引导UI数据
 */
function generateGuideUI(playerId) {
  const guide = new NewbieGuideSystem();
  const status = guide.getGuideStatus(playerId);
  const currentStep = guide.getCurrentStep(playerId);
  
  if (guide.isGuideCompleted(playerId)) {
    return {
      completed: true,
      message: '🎉 恭喜完成新手引导！'
    };
  }
  
  return {
    completed: false,
    currentStep: status.currentStep + 1,
    totalSteps: guide.steps.length,
    title: currentStep.title,
    description: currentStep.description,
    target: currentStep.target,
    reward: currentStep.reward
  };
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    NewbieGuideSystem,
    GUIDE_STEPS,
    generateGuideUI
  };
}
