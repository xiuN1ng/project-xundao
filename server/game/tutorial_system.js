/**
 * 新手引导系统
 * 引导玩家完成游戏基本操作
 */

const TUTORIAL_STEPS = [
  {
    id: 1,
    title: '踏入修仙之路',
    description: '欢迎来到挂机修仙世界！点击「修炼」开始你的修仙之旅',
    target: 'btnCultivate',
    position: 'bottom',
    type: 'cultivate',
    reward: { stones: 100 }
  },
  {
    id: 2,
    title: '学习功法',
    description: '点击功法按钮学习功法，提升修炼效率',
    target: 'techniquePanels',
    position: 'right',
    type: 'learn_gongfa',
    reward: { stones: 150 }
  },
  {
    id: 3,
    title: '挑战副本',
    description: '点击「境界副本」挑战怪物，获得更多经验和灵石',
    target: 'dungeon-btn',
    position: 'bottom',
    type: 'enter_dungeon',
    reward: { stones: 200 }
  },
  {
    id: 4,
    title: '境界突破',
    description: '积累足够灵气后，点击「突破境界」大幅提升实力',
    target: 'btnBreakthrough',
    position: 'bottom',
    type: 'breakthrough',
    reward: { stones: 300 }
  },
  {
    id: 5,
    title: '加入宗门',
    description: '点击「宗门」加入宗门，获得宗门加成',
    target: 'sect-btn',
    position: 'right',
    type: 'join_sect',
    reward: { stones: 500 }
  },
  {
    id: 6,
    title: '世界BOSS',
    description: '点击「BOSS」挑战世界BOSS，获得稀有道具',
    target: 'boss-btn',
    position: 'right',
    type: 'boss_battle',
    reward: { stones: 800 }
  }
];

// 引导状态
const tutorialState = {
  currentStep: 0,
  completedSteps: [],
  isActive: false,
  isCompleted: false,
  overlay: null,
  tooltip: null
};

// 初始化引导
function initTutorial() {
  const player = gameState.player;
  
  // 检查是否需要显示引导
  if (!player.tutorial) {
    player.tutorial = { currentStep: 1, completedSteps: [], isCompleted: false };
    startTutorial();
  } else if (!player.tutorial.isCompleted && player.tutorial.currentStep) {
    startTutorial();
  }
}

// 开始引导
function startTutorial() {
  const player = gameState.player;
  if (!player.tutorial || player.tutorial.isCompleted) return;
  
  tutorialState.currentStep = player.tutorial.currentStep || 1;
  tutorialState.completedSteps = player.tutorial.completedSteps || [];
  tutorialState.isActive = true;
  
  // 显示当前步骤
  showCurrentStep();
  
  // 添加日志提示
  addLog('📚 新手引导已开启', 'info');
}

// 显示当前步骤
function showCurrentStep() {
  const player = gameState.player;
  if (!player.tutorial || player.tutorial.isCompleted) return;
  
  const stepIndex = (player.tutorial.currentStep || 1) - 1;
  if (stepIndex >= TUTORIAL_STEPS.length) {
    completeTutorial();
    return;
  }
  
  const step = TUTORIAL_STEPS[stepIndex];
  
  // 创建引导浮层
  createTutorialOverlay(step);
  
  // 高亮目标元素
  highlightTarget(step.target);
}

// 创建引导浮层
function createTutorialOverlay(step) {
  // 移除旧浮层
  removeTutorialOverlay();
  
  // 创建遮罩
  tutorialState.overlay = document.createElement('div');
  tutorialState.overlay.id = 'tutorial-overlay';
  tutorialState.overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    z-index: 9998;
    display: flex;
    justify-content: center;
    align-items: center;
  `;
  
  // 创建提示框
  tutorialState.tooltip = document.createElement('div');
  tutorialState.tooltip.id = 'tutorial-tooltip';
  tutorialState.tooltip.style.cssText = `
    background: linear-gradient(135deg, #1a1a2e, #16213e);
    border: 2px solid #ffd700;
    border-radius: 12px;
    padding: 20px;
    max-width: 350px;
    text-align: center;
    box-shadow: 0 0 30px rgba(255, 215, 0, 0.3);
    z-index: 9999;
    animation: tutorialPop 0.3s ease;
  `;
  
  // 步骤进度
  const player = gameState.player;
  const currentStepNum = player.tutorial?.currentStep || 1;
  const totalSteps = TUTORIAL_STEPS.length;
  
  tutorialState.tooltip.innerHTML = `
    <div style="color: #ffd700; font-size: 12px; margin-bottom: 8px">
      步骤 ${currentStepNum} / ${totalSteps}
    </div>
    <div style="color: #fff; font-size: 18px; font-weight: bold; margin-bottom: 10px">
      ${step.title}
    </div>
    <div style="color: #aaa; font-size: 14px; margin-bottom: 15px; line-height: 1.5">
      ${step.description}
    </div>
    ${step.reward ? `
      <div style="color: #4ecdc4; font-size: 12px; margin-bottom: 15px">
        🎁 完成后奖励: ${step.reward.stones} 灵石
      </div>
    ` : ''}
    <div style="display: flex; gap: 10px; justify-content: center">
      <button onclick="skipTutorial()" style="
        background: transparent;
        border: 1px solid #666;
        color: #888;
        padding: 8px 20px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
      ">跳过</button>
      <button onclick="nextTutorialStep()" style="
        background: linear-gradient(135deg, #ffd700, #ff8c00);
        border: none;
        color: #1a1a2e;
        padding: 8px 25px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: bold;
        font-size: 14px;
      ">知道了</button>
    </div>
  `;
  
  tutorialState.overlay.appendChild(tutorialState.tooltip);
  document.body.appendChild(tutorialState.overlay);
  
  // 点击遮罩也可以继续
  tutorialState.overlay.onclick = () => {
    nextTutorialStep();
  };
}

// 移除引导浮层
function removeTutorialOverlay() {
  if (tutorialState.overlay) {
    tutorialState.overlay.remove();
    tutorialState.overlay = null;
  }
  if (tutorialState.tooltip) {
    tutorialState.tooltip.remove();
    tutorialState.tooltip = null;
  }
  // 移除高亮
  document.querySelectorAll('.tutorial-highlight').forEach(el => {
    el.classList.remove('tutorial-highlight');
    el.style.position = '';
    el.style.zIndex = '';
    el.style.boxShadow = '';
  });
}

// 高亮目标元素
function highlightTarget(targetId) {
  // 延迟执行确保DOM已渲染
  setTimeout(() => {
    const targetEl = document.getElementById(targetId) || document.querySelector(`[onclick*="${targetId}"]`);
    if (targetEl) {
      targetEl.classList.add('tutorial-highlight');
      targetEl.style.position = 'relative';
      targetEl.style.zIndex = '10000';
      targetEl.style.boxShadow = '0 0 20px #ffd700';
    }
  }, 100);
}

// 完成步骤
function completeTutorialStep(stepType) {
  const player = gameState.player;
  if (!player.tutorial || player.tutorial.isCompleted) return;
  
  const currentStepNum = player.tutorial.currentStep || 1;
  const stepIndex = currentStepNum - 1;
  
  if (stepIndex >= TUTORIAL_STEPS.length) return;
  
  const step = TUTORIAL_STEPS[stepIndex];
  
  // 检查是否是当前步骤的目标
  if (step.type === stepType) {
    // 发放奖励
    if (step.reward && step.reward.stones) {
      player.spiritStones += step.reward.stones;
      addLog(`🎁 引导奖励: +${step.reward.stones} 灵石`, 'success');
    }
    
    // 标记步骤完成
    player.tutorial.completedSteps = player.tutorial.completedSteps || [];
    if (!player.tutorial.completedSteps.includes(currentStepNum)) {
      player.tutorial.completedSteps.push(currentStepNum);
    }
    
    // 进入下一步
    player.tutorial.currentStep = currentStepNum + 1;
    
    // 检查是否完成全部
    if (player.tutorial.currentStep > TUTORIAL_STEPS.length) {
      player.tutorial.isCompleted = true;
      addLog('🎉 恭喜完成新手引导！', 'success');
    }
    
    // 显示下一步
    if (!player.tutorial.isCompleted) {
      showCurrentStep();
    } else {
      completeTutorial();
    }
    
    // 更新UI
    updateUI();
  }
}

// 跳过当前步骤
function skipTutorial() {
  removeTutorialOverlay();
  
  const player = gameState.player;
  if (!player.tutorial || player.tutorial.isCompleted) return;
  
  const currentStepNum = player.tutorial.currentStep || 1;
  
  // 标记跳过
  player.tutorial.completedSteps = player.tutorial.completedSteps || [];
  if (!player.tutorial.completedSteps.includes(currentStepNum)) {
    player.tutorial.completedSteps.push(-currentStepNum); // 负数表示跳过
  }
  
  // 进入下一步
  player.tutorial.currentStep = currentStepNum + 1;
  
  // 检查是否完成
  if (player.tutorial.currentStep > TUTORIAL_STEPS.length) {
    player.tutorial.isCompleted = true;
  }
  
  // 显示下一步或完成
  if (!player.tutorial.isCompleted) {
    showCurrentStep();
  } else {
    completeTutorial();
  }
}

// 完成下一步
function nextTutorialStep() {
  removeTutorialOverlay();
  
  const player = gameState.player;
  if (!player.tutorial || player.tutorial.isCompleted) return;
  
  const currentStepNum = player.tutorial.currentStep || 1;
  
  // 标记步骤完成
  player.tutorial.completedSteps = player.tutorial.completedSteps || [];
  if (!player.tutorial.completedSteps.includes(currentStepNum)) {
    player.tutorial.completedSteps.push(currentStepNum);
  }
  
  // 进入下一步
  player.tutorial.currentStep = currentStepNum + 1;
  
  // 检查是否完成
  if (player.tutorial.currentStep > TUTORIAL_STEPS.length) {
    player.tutorial.isCompleted = true;
    addLog('🎉 恭喜完成新手引导！', 'success');
    completeTutorial();
  } else {
    // 显示下一步
    showCurrentStep();
  }
}

// 完成引导
function completeTutorial() {
  const player = gameState.player;
  if (player.tutorial) {
    player.tutorial.isCompleted = true;
  }
  removeTutorialOverlay();
  addLog('🎉 恭喜完成新手引导！开始你的修仙之旅吧！', 'success');
}

// 重置引导（用于测试）
function resetTutorial() {
  const player = gameState.player;
  player.tutorial = { currentStep: 1, completedSteps: [], isCompleted: false };
  startTutorial();
  addLog('📚 新手引导已重置', 'info');
}

// 添加CSS动画（仅在浏览器环境执行）
if (typeof document !== 'undefined') {
  const tutorialStyle = document.createElement('style');
  tutorialStyle.textContent = `
    @keyframes tutorialPop {
      0% { transform: scale(0.8); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    
    .tutorial-highlight {
      position: relative;
      z-index: 10000;
      box-shadow: 0 0 20px #ffd700, 0 0 40px rgba(255, 215, 0, 0.5) !important;
      border-radius: 8px;
    }
  `;
  document.head.appendChild(tutorialStyle);
}

// 导出（仅在浏览器环境）
if (typeof window !== 'undefined') {
  window.TUTORIAL_STEPS = TUTORIAL_STEPS;
  window.initTutorial = initTutorial;
  window.startTutorial = startTutorial;
  window.completeTutorialStep = completeTutorialStep;
  window.skipTutorial = skipTutorial;
  window.nextTutorialStep = nextTutorialStep;
  window.resetTutorial = resetTutorial;
}

console.log('📚 新手引导系统已加载');
