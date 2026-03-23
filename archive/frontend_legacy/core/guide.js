let guideSystem = {
  currentStep: 0,
  isActive: false,
  steps: [],
  onComplete: null,
  onSkip: null
};

// 引导步骤配置 - 使用CSS选择器
const guideSteps = [
  {
    target: '#cultivateBtn',
    title: '🧘 开始修炼',
    content: '点击「修炼」按钮进行挂机修炼，获得灵气提升境界，灵气是修仙的核心资源！',
    position: 'bottom',
    showArrow: true
  },
  {
    target: '.card:nth-child(2) .card-title',
    title: '⚔️ 挑战怪物',
    content: '灵气足够后，点击「战斗」挑战怪物获得经验和灵石，击败怪物会掉落装备哦！',
    position: 'bottom', 
    showArrow: true
  },
  {
    target: '.card:nth-child(3) .card-title',
    title: '🏠 洞府建设',
    content: '洞府可以升级建筑，提升修炼效率和灵石产出，升级丹炉还能炼制丹药！',
    position: 'bottom',
    showArrow: true
  },
  {
    target: '.card:nth-child(4) .card-title',
    title: '📚 功法系统',
    content: '学习功法可以获得属性加成，不同功法有不同效果，组合搭配更强！',
    position: 'bottom',
    showArrow: true
  },
  {
    target: '.system-buttons .btn:nth-child(1)',
    title: '🦊 灵兽系统',
    content: '捕捉和培养灵兽，灵兽会跟随你修炼并提供属性加成，还能协同战斗！',
    position: 'bottom',
    showArrow: true
  },
  {
    target: '.system-buttons .btn:nth-child(2)',
    title: '🏛️ 宗门系统',
    content: '加入宗门可获得大量属性加成，还能招收弟子、建设建筑、学习宗门技能！',
    position: 'bottom',
    showArrow: true
  },
  {
    target: '.system-buttons .btn:nth-child(3)',
    title: '👹 世界BOSS',
    content: '挑战世界BOSS获得稀有道具和大量奖励，伤害越高奖励越丰厚！',
    position: 'bottom',
    showArrow: true
  },
  {
    target: '.system-buttons .btn:nth-child(8)',
    title: '🎉 活动中心',
    content: '每日签到获得灵石奖励，参与活动获得额外加成，快来领取吧！',
    position: 'top',
    showArrow: true
  },
  {
    target: '.nav-item[data-tab="inventory"]',
    title: '🎒 背包',
    content: '在背包中查看和管理你获得的装备和材料，装备强力法宝提升战力！',
    position: 'right',
    showArrow: true
  },
  {
    target: '.nav-item[data-tab="sect"]',
    title: '🏛️ 宗门',
    content: '加入宗门，与其他修仙者一起闯荡，获得宗门加成！',
    position: 'right',
    showArrow: true
  }
];

// 创建引导遮罩元素
function createGuideElements() {
  // 移除已存在的元素
  removeGuideElements();
  
  // 创建遮罩层
  const mask = document.createElement('div');
  mask.id = 'guideMask';
  mask.className = 'guide-mask';
  document.body.appendChild(mask);
  
  // 创建高亮框
  const spotlight = document.createElement('div');
  spotlight.id = 'guideSpotlight';
  spotlight.className = 'guide-spotlight';
  document.body.appendChild(spotlight);
  
  // 创建箭头
  const arrow = document.createElement('div');
  arrow.id = 'guideArrow';
  arrow.className = 'guide-arrow';
  document.body.appendChild(arrow);
  
  // 创建提示框
  const tooltip = document.createElement('div');
  tooltip.id = 'guideTooltip';
  tooltip.className = 'guide-tooltip';
  document.body.appendChild(tooltip);
}

// 移除引导元素
function removeGuideElements() {
  const elements = ['guideMask', 'guideSpotlight', 'guideArrow', 'guideTooltip'];
  elements.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
}

// 启动引导
function startGuide(steps = guideSteps, onComplete = null, onSkip = null) {
  guideSystem.steps = steps;
  guideSystem.currentStep = 0;
  guideSystem.onComplete = onComplete;
  guideSystem.onSkip = onSkip;
  guideSystem.isActive = true;
  
  createGuideElements();
  showGuideStep(0);
}

// 显示指定步骤
function showGuideStep(stepIndex) {
  if (!guideSystem.isActive || stepIndex >= guideSystem.steps.length) {
    completeGuide();
    return;
  }
  
  guideSystem.currentStep = stepIndex;
  const step = guideSystem.steps[stepIndex];
  const targetEl = document.getElementById(step.target) || document.querySelector(step.target);
  
  if (!targetEl) {
    // 目标元素不存在，跳过此步骤
    showGuideStep(stepIndex + 1);
    return;
  }
  
  // 显示遮罩
  const mask = document.getElementById('guideMask');
  const spotlight = document.getElementById('guideSpotlight');
  const arrow = document.getElementById('guideArrow');
  const tooltip = document.getElementById('guideTooltip');
  
  if (mask) mask.classList.add('active');
  
  // 获取目标元素位置
  const rect = targetEl.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  
  // 设置高亮框位置和大小
  if (spotlight) {
    spotlight.style.top = (rect.top + scrollTop - 8) + 'px';
    spotlight.style.left = (rect.left + scrollLeft - 8) + 'px';
    spotlight.style.width = (rect.width + 16) + 'px';
    spotlight.style.height = (rect.height + 16) + 'px';
  }
  
  // 设置箭头位置
  if (arrow && step.showArrow) {
    arrow.style.display = 'block';
    const arrowPos = getArrowPosition(rect, step.position, scrollTop, scrollLeft);
    arrow.style.top = arrowPos.top + 'px';
    arrow.style.left = arrowPos.left + 'px';
    arrow.className = 'guide-arrow ' + step.position;
    arrow.textContent = getArrowIcon(step.position);
  } else if (arrow) {
    arrow.style.display = 'none';
  }
  
  // 设置提示框位置
  if (tooltip) {
    const tooltipPos = getTooltipPosition(rect, step.position, scrollTop, scrollLeft);
    tooltip.style.top = tooltipPos.top + 'px';
    tooltip.style.left = tooltipPos.left + 'px';
    
    const totalSteps = guideSystem.steps.length;
    tooltip.innerHTML = `
      <span class="guide-tooltip-close" onclick="skipGuide()">×</span>
      <div class="guide-tooltip-header">
        <span class="guide-tooltip-icon">${step.title.split(' ')[0]}</span>
        <span class="guide-tooltip-title">${step.title.split(' ').slice(1).join(' ')}</span>
      </div>
      <div class="guide-tooltip-content">${step.content}</div>
      <div class="guide-tooltip-footer">
        <span class="guide-tooltip-step">${stepIndex + 1} / ${totalSteps}</span>
        <div>
          <button class="guide-tooltip-btn secondary" onclick="skipGuide()">跳过</button>
          <button class="guide-tooltip-btn primary" onclick="nextGuideStep()">${stepIndex === totalSteps - 1 ? '完成' : '下一步'}</button>
        </div>
      </div>
    `;
  }
}

// 获取箭头位置
function getArrowPosition(rect, position, scrollTop, scrollLeft) {
  const offset = 50;
  switch (position) {
    case 'top':
      return { top: rect.top + scrollTop - offset - 30, left: rect.left + scrollLeft + rect.width / 2 - 15 };
    case 'bottom':
      return { top: rect.bottom + scrollTop + 10, left: rect.left + scrollLeft + rect.width / 2 - 15 };
    case 'left':
      return { top: rect.top + scrollTop + rect.height / 2 - 15, left: rect.left + scrollLeft - offset - 30 };
    case 'right':
      return { top: rect.top + scrollTop + rect.height / 2 - 15, left: rect.right + scrollLeft + 10 };
    default:
      return { top: rect.top + scrollTop - offset, left: rect.left + scrollLeft + rect.width / 2 };
  }
}

// 获取提示框位置
function getTooltipPosition(rect, position, scrollTop, scrollLeft) {
  const offset = 20;
  switch (position) {
    case 'top':
      return { top: rect.top + scrollTop - offset - 200, left: rect.left + scrollLeft + rect.width / 2 - 140 };
    case 'bottom':
      return { top: rect.bottom + scrollTop + offset + 60, left: rect.left + scrollLeft + rect.width / 2 - 140 };
    case 'left':
      return { top: rect.top + scrollTop + rect.height / 2 - 80, left: rect.left + scrollLeft - offset - 280 };
    case 'right':
      return { top: rect.top + scrollTop + rect.height / 2 - 80, left: rect.right + scrollLeft + offset };
    default:
      return { top: rect.top + scrollTop - 100, left: rect.left + scrollLeft + rect.width / 2 - 140 };
  }
}

// 获取箭头图标
function getArrowIcon(position) {
  const arrows = { top: '⬇️', bottom: '⬆️', left: '➡️', right: '⬅️' };
  return arrows[position] || '⬇️';
}

// 下一步
function nextGuideStep() {
  showGuideStep(guideSystem.currentStep + 1);
}

// 跳过引导
function skipGuide() {
  guideSystem.isActive = false;
  removeGuideElements();
  if (guideSystem.onSkip) guideSystem.onSkip();
  addLog('引导已跳过', 'info');
}

// 完成引导
function completeGuide() {
  guideSystem.isActive = false;
  removeGuideElements();
  
  // 显示完成庆祝
  showGuideCelebration();
  
  if (guideSystem.onComplete) guideSystem.onComplete();
  addLog('引导完成！', 'success');
}

// 显示完成庆祝
function showGuideCelebration() {
  const celebration = document.createElement('div');
  celebration.className = 'guide-celebration';
  celebration.innerHTML = `
    <div class="guide-celebration-icon">🎉</div>
    <div class="guide-celebration-text">引导完成！</div>
  `;
  document.body.appendChild(celebration);
  
  setTimeout(() => {
    celebration.remove();
  }, 2000);
}

