// ==================== UI动画增强模块 ====================

// 1. 按钮波纹点击效果
function initButtonRipple() {
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('.btn');
    if (!btn || btn.classList.contains('no-ripple')) return;
    
    // 如果按钮禁用，不添加波纹
    if (btn.disabled) return;
    
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ripple = document.createElement('span');
    ripple.className = 'btn-ripple';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    
    btn.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
  });
}

// 2. 数值变化动画
function animateValue(element, start, end, duration = 500) {
  if (!element) return;
  
  const startTime = performance.now();
  const diff = end - start;
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // 使用缓动函数
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(start + diff * easeProgress);
    
    element.textContent = typeof end === 'string' ? end : fmt(current);
    
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = typeof end === 'string' ? end : fmt(end);
    }
  }
  
  requestAnimationFrame(update);
}

// 3. 数值变化带方向指示
function animateStatChange(element, oldValue, newValue, duration = 400) {
  if (!element) return;
  
  const increase = newValue > oldValue;
  const direction = increase ? 'up' : 'down';
  
  element.classList.add('pulse-' + direction);
  
  animateValue(element, oldValue, newValue, duration);
  
  setTimeout(() => {
    element.classList.remove('pulse-' + direction);
  }, duration);
}

// 4. 页面元素淡入动画
function fadeInElements(selector, delay = 100) {
  const elements = document.querySelectorAll(selector);
  elements.forEach((el, index) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
      el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, index * delay);
  });
}

// 5. 触摸/点击反馈效果
function initClickFeedback() {
  document.addEventListener('click', function(e) {
    // 跳过按钮（已有波纹效果）
    if (e.target.closest('.btn')) return;
    
    const feedback = document.createElement('div');
    feedback.className = 'click-feedback';
    feedback.style.left = (e.clientX - 10) + 'px';
    feedback.style.top = (e.clientY - 10) + 'px';
    
    document.body.appendChild(feedback);
    
    setTimeout(() => feedback.remove(), 500);
  }, true);
}

// 6. 卡片交互增强
function initCardInteractions() {
  document.addEventListener('click', function(e) {
    const card = e.target.closest('.card.interactive');
    if (!card) return;
    
    card.classList.add('selected');
    
    setTimeout(() => {
      card.classList.remove('selected');
    }, 500);
  });
}

// 7. 增强模态框动画
function enhancedModalOpen(modalId, animationType = 'default') {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  
  // 移除其他动画类型
  modal.classList.remove('modal-slide-left', 'modal-slide-right', 'modal-zoom-in');
  
  // 添加指定动画类型
  if (animationType !== 'default') {
    modal.classList.add('modal-' + animationType);
  }
  
  modal.classList.add('active');
  
  // 震动反馈
  if (navigator.vibrate) {
    navigator.vibrate(10);
  }
}

// 8. 物品获取动画
function playItemGetAnimation(element) {
  if (!element) return;
  
  element.classList.add('item-glow');
  
  setTimeout(() => {
    element.classList.remove('item-glow');
  }, 800);
}

// 9. 资源获取动画
function playResourceGain(element) {
  if (!element) return;
  
  element.classList.add('resource-gain');
  
  setTimeout(() => {
    element.classList.remove('resource-gain');
  }, 600);
}

// 10. 境界提升动画
function playRealmUpgradeAnimation(element) {
  if (!element) return;
  
  element.classList.add('realm-upgrade');
  
  setTimeout(() => {
    element.classList.remove('realm-upgrade');
  }, 1000);
}

// 11. 平滑滚动到元素
function smoothScrollTo(elementId, offset = 0) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  const targetPosition = element.getBoundingClientRect().top + window.pageYOffset - offset;
  
  window.scrollTo({
    top: targetPosition,
    behavior: 'smooth'
  });
}

// 12. 初始化所有UI动画
function initUIAnimations() {
  initButtonRipple();
  initClickFeedback();
  initCardInteractions();
  
  // 页面加载完成后添加淡入效果
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
      fadeInElements('.card', 50);
      fadeInElements('.top-bar-item', 30);
      fadeInElements('.log-entry', 30);
    }, 100);
  });
}

// 自动初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUIAnimations);
} else {
  initUIAnimations();
}

