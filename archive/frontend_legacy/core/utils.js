function showToast(message, type = 'info', duration = 3000) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  // 添加图标 (修仙风格)
  const icons = {
    success: '✨',
    error: '💢',
    warning: '⚡',
    info: '📜',
    spirit: '🌟',
    cultivation: '🔮',
    realm: '📈'
  };
  const icon = icons[type] || 'ℹ️';
  
  // 修仙光芒效果
  const glowColors = {
    success: 'rgba(0, 255, 136, 0.4)',
    error: 'rgba(239, 68, 68, 0.4)',
    warning: 'rgba(249, 115, 22, 0.4)',
    info: 'rgba(59, 130, 246, 0.4)',
    spirit: 'rgba(0, 255, 255, 0.4)',
    cultivation: 'rgba(139, 92, 246, 0.4)',
    realm: 'rgba(255, 215, 0, 0.4)'
  };
  const glowColor = glowColors[type] || 'rgba(59, 130, 246, 0.4)';
  
  // 添加渐入动画
  toast.style.animation = 'toastSlideIn 0.3s ease forwards';
  toast.style.background = `linear-gradient(135deg, rgba(20, 20, 35, 0.95), rgba(30, 25, 45, 0.95))`;
  toast.style.border = `1px solid ${glowColor}`;
  toast.style.boxShadow = `0 4px 20px ${glowColor}, 0 0 30px ${glowColor}`;
  toast.innerHTML = `<span class="toast-icon" style="text-shadow: 0 0 10px ${glowColor}">${icon}</span><span class="toast-message">${message}</span>`;
  
  container.appendChild(toast);
  
  // 移动端震动反馈
  if (navigator.vibrate && window.innerWidth < 768) {
    navigator.vibrate(type === 'error' ? [100, 50, 100] : 50);
  }
  
  // 自动隐藏
  setTimeout(() => {
    toast.style.animation = 'toastSlideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// 增强toast动画样式
const toastStyle = document.createElement('style');
toastStyle.textContent = `
  @keyframes toastSlideIn {
    from { opacity: 0; transform: translateY(-20px) translateX(-50%); }
    to { opacity: 1; transform: translateY(0) translateX(-50%); }
  }
  @keyframes toastSlideOut {
    from { opacity: 1; transform: translateY(0) translateX(-50%); }
    to { opacity: 0; transform: translateY(-20px) translateX(-50%); }
  }
  .toast-message {
    word-break: break-word;
    max-width: 280px;
  }
  @media (max-width: 480px) {
    .toast {
      max-width: 90vw;
      padding: 10px 14px;
      font-size: 13px;
    }
    .toast-message {
      max-width: 80vw;
    }
  }
`;
document.head.appendChild(toastStyle);

// 按钮loading状态 - 增强版
function setButtonLoading(btn, loading, customText = null) {
  if (loading) {
    btn.classList.add('loading');
    btn.disabled = true;
    // 保存原始文本
    btn.dataset.originalText = btn.innerHTML;
    // 显示加载文本
    if (customText) {
      btn.innerHTML = `<span class="btn-text">${customText}</span>`;
    }
  } else {
    btn.classList.remove('loading');
    btn.disabled = false;
    // 恢复原始文本
    if (btn.dataset.originalText) {
      btn.innerHTML = btn.dataset.originalText;
    }
  }
}

// 按钮波纹效果
function createRipple(event) {
  const btn = event.currentTarget;
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = event.clientX - rect.left - size/2 + 'px';
  ripple.style.top = event.clientY - rect.top - size/2 + 'px';
  
  btn.appendChild(ripple);
  
  setTimeout(() => ripple.remove(), 600);
