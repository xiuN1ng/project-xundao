/**
 * 新手引导系统
 * 配置和记录玩家新手步骤
 */

interface GuideStep {
  id: string;
  title: string;
  description: string;
  trigger: {
    type: 'level' | 'quest' | 'item' | 'location' | 'npc' | 'custom';
    target: string;
    count?: number;
  };
  reward?: {
    gold?: number;
    exp?: number;
    items?: Array<{ id: string; count: number }>;
  };
  position?: {
    x: number;
    y: number;
    scene?: string;
  };
  highlight?: {
    uiElement?: string;
    npcId?: string;
    monsterId?: string;
  };
  isOptional: boolean;
  autoComplete: boolean;
}

interface PlayerGuideProgress {
  playerId: string;
  currentStep: string;
  completedSteps: string[];
  skippedSteps: string[];
  startTime: number;
  stepStartTimes: Record<string, number>;
}

interface GuideConfig {
  guideId: string;
  name: string;
  description: string;
  requiredLevel: number;
  steps: GuideStep[];
  rewards?: {
    completion?: Array<{ id: string; count: number }>;
    gold?: number;
    exp?: number;
  };
}

class NewbieGuideSystem {
  private static guides: Map<string, GuideConfig> = new Map();
  private static playerProgress: Map<string, PlayerGuideProgress> = new Map();
  
  /**
   * 初始化引导配置
   */
  static initDefaultGuides(): void {
    // 主线引导
    this.registerGuide({
      guideId: 'main_guide',
      name: '修仙入门',
      description: '带你了解修仙世界的基本操作',
      requiredLevel: 1,
      steps: [
        {
          id: 'step_1',
          title: '创建角色',
          description: '欢迎来到修仙世界！首先创建你的角色',
          trigger: { type: 'custom', target: 'character_created' },
          isOptional: false,
          autoComplete: true
        },
        {
          id: 'step_2',
          title: '学习移动',
          description: '使用键盘方向键或点击地图移动角色',
          trigger: { type: 'custom', target: 'first_move' },
          isOptional: false,
          autoComplete: false
        },
        {
          id: 'step_3',
          title: '击败第一只怪物',
          description: '在修炼场击败一只新手怪物',
          trigger: { type: 'npc', target: 'practice_dummy', count: 1 },
          reward: { exp: 100, gold: 50 },
          highlight: { monsterId: 'practice_dummy' },
          isOptional: false,
          autoComplete: false
        },
        {
          id: 'step_4',
          title: '获取装备',
          description: '打开背包，装备你的第一件武器',
          trigger: { type: 'item', target: 'weapon_wooden_sword', count: 1 },
          reward: { items: [{ id: 'weapon_wooden_sword', count: 1 }] },
          highlight: { uiElement: 'inventory' },
          isOptional: false,
          autoComplete: false
        },
        {
          id: 'step_5',
          title: '学习技能',
          description: '打开技能面板，学习第一个技能',
          trigger: { type: 'custom', target: 'learned_first_skill' },
          highlight: { uiElement: 'skill_panel' },
          isOptional: false,
          autoComplete: false
        },
        {
          id: 'step_6',
          title: '境界突破',
          description: '达到10级后进行境界突破',
          trigger: { type: 'level', target: '10', count: 1 },
          position: { x: 100, y: 200, scene: 'temple' },
          reward: { exp: 500 },
          isOptional: false,
          autoComplete: false
        },
        {
          id: 'step_7',
          title: '加入宗门',
          description: '加入一个宗门，结识更多修仙者',
          trigger: { type: 'custom', target: 'joined_cultivation_sect' },
          highlight: { uiElement: 'sect_panel' },
          isOptional: true,
          autoComplete: false
        }
      ],
      rewards: {
        completion: [{ id: 'title_beginner_cultivator', count: 1 }],
        gold: 1000,
        exp: 2000
      }
    });
    
    // 战斗引导
    this.registerGuide({
      guideId: 'combat_guide',
      name: '战斗入门',
      description: '学习战斗基本操作',
      requiredLevel: 1,
      steps: [
        {
          id: 'combat_1',
          title: '自动战斗',
          description: '启用自动战斗模式',
          trigger: { type: 'custom', target: 'auto_combat_enabled' },
          isOptional: false,
          autoComplete: false
        },
        {
          id: 'combat_2',
          title: '手动释放技能',
          description: '点击技能图标手动释放',
          trigger: { type: 'custom', target: 'manual_skill_used' },
          highlight: { uiElement: 'skill_button' },
          isOptional: false,
          autoComplete: false
        },
        {
          id: 'combat_3',
          title: '使用药品',
          description: '在血量不足时使用药品',
          trigger: { type: 'item', target: 'potion_health', count: 1 },
          reward: { items: [{ id: 'potion_health', count: 5 }] },
          highlight: { uiElement: 'item_hotkey' },
          isOptional: false,
          autoComplete: false
        },
        {
          id: 'combat_4',
          title: '闪避操作',
          description: '使用闪避技能躲避攻击',
          trigger: { type: 'custom', target: 'dodge_used' },
          isOptional: true,
          autoComplete: false
        }
      ]
    });
  }
  
  /**
   * 注册引导配置
   */
  static registerGuide(config: GuideConfig): void {
    this.guides.set(config.guideId, config);
  }
  
  /**
   * 开始引导
   */
  static startGuide(playerId: string, guideId: string): {
    success: boolean;
    step?: GuideStep;
    message: string;
  } {
    const guide = this.guides.get(guideId);
    if (!guide) {
      return { success: false, message: '引导不存在' };
    }
    
    const progress: PlayerGuideProgress = {
      playerId,
      currentStep: guide.steps[0].id,
      completedSteps: [],
      skippedSteps: [],
      startTime: Date.now(),
      stepStartTimes: { [guide.steps[0].id]: Date.now() }
    };
    
    this.playerProgress.set(playerId, progress);
    
    return {
      success: true,
      step: guide.steps[0],
      message: `开始引导：${guide.name}`
    };
  }
  
  /**
   * 更新引导进度
   */
  static updateProgress(playerId: string, triggerType: string, triggerTarget: string): {
    completed: boolean;
    step?: GuideStep;
    rewards?: Array<{ id: string; count: number }>;
  } {
    const progress = this.playerProgress.get(playerId);
    if (!progress) {
      return { completed: false };
    }
    
    // 找到当前步骤配置
    let currentGuide: GuideConfig | undefined;
    for (const guide of this.guides.values()) {
      if (guide.steps.some(s => s.id === progress.currentStep)) {
        currentGuide = guide;
        break;
      }
    }
    
    if (!currentGuide) {
      return { completed: false };
    }
    
    const currentStep = currentGuide.steps.find(s => s.id === progress.currentStep);
    if (!currentStep) {
      return { completed: false };
    }
    
    // 检查触发条件
    if (currentStep.trigger.type === triggerType && 
        currentStep.trigger.target === triggerTarget) {
      
      const targetCount = currentStep.trigger.count || 1;
      // TODO: 记录触发次数
      
      // 标记完成
      progress.completedSteps.push(currentStep.currentStep);
      
      // 获取奖励
      let rewards: Array<{ id: string; count: number }> = [];
      if (currentStep.reward?.items) {
        rewards = currentStep.reward.items;
      }
      
      // 进入下一步
      const nextStepIndex = currentGuide.steps.findIndex(s => s.id === currentStep.id) + 1;
      if (nextStepIndex < currentGuide.steps.length) {
        const nextStep = currentGuide.steps[nextStepIndex];
        progress.currentStep = nextStep.id;
        progress.stepStartTimes[nextStep.id] = Date.now();
        
        return {
          completed: true,
          step: nextStep,
          rewards
        };
      } else {
        // 引导完成
        const completionRewards = currentGuide.rewards?.completion || [];
        return {
          completed: true,
          rewards: [...rewards, ...completionRewards]
        };
      }
    }
    
    return { completed: false };
  }
  
  /**
   * 跳过当前步骤
   */
  static skipStep(playerId: string): boolean {
    const progress = this.playerProgress.get(playerId);
    if (!progress) return false;
    
    progress.skippedSteps.push(progress.currentStep);
    
    // 进入下一步
    for (const guide of this.guides.values()) {
      const currentIndex = guide.steps.findIndex(s => s.id === progress.currentStep);
      if (currentIndex >= 0 && currentIndex < guide.steps.length - 1) {
        const nextStep = guide.steps[currentIndex + 1];
        progress.currentStep = nextStep.id;
        progress.stepStartTimes[nextStep.id] = Date.now();
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * 获取玩家当前引导进度
   */
  static getPlayerProgress(playerId: string): PlayerGuideProgress | null {
    return this.playerProgress.get(playerId) || null;
  }
  
  /**
   * 获取当前步骤详情
   */
  static getCurrentStep(playerId: string): GuideStep | null {
    const progress = this.playerProgress.get(playerId);
    if (!progress) return null;
    
    for (const guide of this.guides.values()) {
      const step = guide.steps.find(s => s.id === progress.currentStep);
      if (step) return step;
    }
    
    return null;
  }
}

export default NewbieGuideSystem;
export { GuideStep, GuideConfig, PlayerGuideProgress };
