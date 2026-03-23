function animateNumberChange(element, newValue, oldValue) {
  if (!element) return;
  
  // 添加变化方向类
  element.classList.remove('number-up', 'number-down');
  if (newValue > oldValue) {
    element.classList.add('number-up');
  } else if (newValue < oldValue) {
    element.classList.add('number-down');
  }
  
  // 数字滚动效果
  element.style.transform = newValue > oldValue ? 'translateY(10px)' : 'translateY(-10px)';
  element.style.opacity = '0';
  
  setTimeout(() => {
    element.textContent = newValue;
    element.style.transform = 'translateY(0)';
    element.style.opacity = '1';
  }, 150);
  
  // 移除动画类
  setTimeout(() => {
    element.classList.remove('number-up', 'number-down');
  }, 400);
}

// 按钮成功反馈动画
function showButtonSuccess(btn) {
  btn.classList.add('btn-success-anim');
  setTimeout(() => btn.classList.remove('btn-success-anim'), 600);
}

// 按钮警告反馈动画
function showButtonWarning(btn) {
  btn.classList.add('btn-warning-anim');
  setTimeout(() => btn.classList.remove('btn-warning-anim'), 600);
}

// 按钮危险反馈动画
function showButtonDanger(btn) {
  btn.classList.add('btn-danger-anim');
  setTimeout(() => btn.classList.remove('btn-danger-anim'), 600);
}

// 卡片入场动画
function animateCardsIn() {
  const cards = document.querySelectorAll('.card:not(.animated)');
  cards.forEach((card, index) => {
    card.classList.add('animated');
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    
    setTimeout(() => {
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, index * 80);
  });
}

// 资源获得时的视觉反馈
function showResourceGain(element, amount) {
  if (!element) return;
  
  // 添加弹跳效果
  element.classList.add('resource-gain');
  
  // 创建飘字
  if (amount > 0) {
    const floatText = document.createElement('span');
    floatText.className = 'resource-gain-text';
    floatText.textContent = `+${amount}`;
    floatText.style.cssText = `
      position: absolute;
      right: -30px;
      top: 50%;
      transform: translateY(-50%);
      color: #38ef7d;
      font-size: 12px;
      font-weight: bold;
      animation: resourceGainFade 1s ease-out forwards;
      pointer-events: none;
    `;
    element.style.position = 'relative';
    element.appendChild(floatText);
    
    setTimeout(() => floatText.remove(), 1000);
  }
  
  setTimeout(() => element.classList.remove('resource-gain'), 500);
}

// 境界升级动画
function showRealmUpgrade(element) {
  if (!element) return;
  
  element.classList.add('realm-upgrade');
  setTimeout(() => element.classList.remove('realm-upgrade'), 1500);
}

// 列表项入场动画
function animateListItems() {
  const lists = document.querySelectorAll('.mobile-list-item, .task-item, .sect-building-card, .sect-disciple-card');
  lists.forEach((item, index) => {
    if (item.classList.contains('animating')) return;
    
    item.classList.add('animating');
    item.style.opacity = '0';
    item.style.transform = 'translateX(-20px)';
    
    setTimeout(() => {
      item.style.opacity = '1';
      item.style.transform = 'translateX(0)';
    }, index * 50);
  });
}

// 初始化动画样式
function initUIAnimations() {
  // 创建动画关键帧样式
  const animationStyle = document.createElement('style');
  animationStyle.textContent = `
    @keyframes resourceGainFade {
      0% { opacity: 1; transform: translateY(-50%) scale(1); }
      100% { opacity: 0; transform: translateY(-100%) scale(0.8); }
    }
    
    .number-up {
      color: #38ef7d !important;
      animation: numberUpAnim 0.4s ease-out;
    }
    
    .number-down {
      color: #ef4444 !important;
      animation: numberDownAnim 0.4s ease-out;
    }
    
    @keyframes numberUpAnim {
      0% { transform: translateY(10px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
    
    @keyframes numberDownAnim {
      0% { transform: translateY(-10px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
    
    .btn-success-anim {
      animation: btnSuccessFull 0.6s ease !important;
    }
    
    @keyframes btnSuccessFull {
      0%, 100% { filter: brightness(1); transform: scale(1); }
      50% { filter: brightness(1.3); transform: scale(1.02); box-shadow: 0 0 25px rgba(16, 185, 129, 0.6); }
    }
    
    .btn-warning-anim {
      animation: btnWarningFull 0.6s ease !important;
    }
    
    @keyframes btnWarningFull {
      0%, 100% { filter: brightness(1); transform: scale(1); }
      50% { filter: brightness(1.3); transform: scale(1.02); box-shadow: 0 0 25px rgba(245, 158, 11, 0.6); }
    }
    
    .btn-danger-anim {
      animation: btnDangerFull 0.6s ease !important;
    }
    
    @keyframes btnDangerFull {
      0%, 100% { filter: brightness(1); transform: scale(1); }
      50% { filter: brightness(1.3); transform: scale(1.02); box-shadow: 0 0 25px rgba(239, 68, 68, 0.6); }
    }
    
    .resource-gain {
      animation: resourceBounce 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    }
    
    @keyframes resourceBounce {
      0% { transform: scale(1); }
      50% { transform: scale(1.15); }
      100% { transform: scale(1); }
    }
    
    .realm-upgrade {
      animation: realmUpgradeFull 1.5s ease-in-out !important;
    }
    
    @keyframes realmUpgradeFull {
      0% { box-shadow: 0 0 20px rgba(168, 85, 247, 0.3); border-color: rgba(168, 85, 247, 0.3); }
      50% { box-shadow: 0 0 50px rgba(168, 85, 247, 0.6), 0 0 80px rgba(139, 92, 246, 0.4); border-color: rgba(168, 85, 247, 0.8); transform: scale(1.02); }
      100% { box-shadow: 0 0 20px rgba(168, 85, 247, 0.3); border-color: rgba(168, 85, 247, 0.3); }
    }
  `;
  document.head.appendChild(animationStyle);
  
  // 为卡片添加入场动画
  animateCardsIn();
  
  // 监听滚动来触发动画
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(animateListItems, 200);
  });
}

// 初始化按钮波纹效果和音效
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      createRipple(e);
      // 播放点击音效
      if (!this.disabled) {
        AudioManager.playClick();
      }
    });
  });
  
  // 触摸设备优化
  if ('ontouchstart' in window) {
    document.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('touchstart', function() {
        this.classList.add('btn-bounce');
        setTimeout(() => this.classList.remove('btn-bounce'), 150);
      });
    });
  }
});

// 修炼按钮处理
