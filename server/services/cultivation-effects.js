/* ==================== 修仙风格动效增强 ==================== */

/**
 * 添加灵气流转效果到进度条
 */
function addSpiritFlowEffect(element) {
  if (!element) return;
  
  // 添加流动效果类
  element.style.backgroundSize = '200% 100%';
  element.style.animation = 'spiritFlow 2s ease infinite';
  
  // 如果还没有这个动画，则添加
  if (!document.getElementById('spirit-flow-style')) {
    const style = document.createElement('style');
    style.id = 'spirit-flow-style';
    style.textContent = `
      @keyframes spiritFlow {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      
      @keyframes shimmer {
        0% { left: -100%; }
        100% { left: 200%; }
      }
      
      .progress-fill::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 50%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
        animation: shimmer 2s infinite;
        z-index: 1;
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * 初始化所有进度条的灵气效果
 */
function initSpiritFlowBars() {
  const bars = document.querySelectorAll('.progress-fill');
  bars.forEach(bar => {
    addSpiritFlowEffect(bar);
  });
}

/**
 * 境界突破特效
 */
function playRealmBreakthroughEffect() {
  // 创建特效元素
  const effect = document.createElement('div');
  effect.className = 'realm-breakthrough-effect';
  effect.innerHTML = `
    <div class="breakthrough-rings">
      <div class="ring ring-1"></div>
      <div class="ring ring-2"></div>
      <div class="ring ring-3"></div>
    </div>
    <div class="breakthrough-particles">
      ${Array(20).fill('<div class="particle"></div>').join('')}
    </div>
  `;
  
  // 添加样式
  const style = document.createElement('style');
  style.textContent = `
    .realm-breakthrough-effect {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .breakthrough-rings {
      position: absolute;
      width: 200px;
      height: 200px;
    }
    
    .ring {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      border: 2px solid rgba(255, 215, 0, 0.8);
      border-radius: 50%;
      animation: ringExpand 1.5s ease-out forwards;
    }
    
    .ring-1 { width: 50px; height: 50px; animation-delay: 0s; }
    .ring-2 { width: 100px; height: 100px; animation-delay: 0.2s; }
    .ring-3 { width: 150px; height: 150px; animation-delay: 0.4s; }
    
    @keyframes ringExpand {
      0% {
        transform: translate(-50%, -50%) scale(0.5);
        opacity: 1;
      }
      100% {
        transform: translate(-50%, -50%) scale(3);
        opacity: 0;
      }
    }
    
    .breakthrough-particles {
      position: absolute;
      width: 100%;
      height: 100%;
    }
    
    .particle {
      position: absolute;
      width: 8px;
      height: 8px;
      background: radial-gradient(circle, #ffd700, transparent);
      border-radius: 50%;
      animation: particleExplode 1s ease-out forwards;
    }
    
    ${Array(20).fill('').map((_, i) => `
    .particle:nth-child(${i + 1}) {
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      animation-delay: ${Math.random() * 0.5}s;
      --angle: ${Math.random() * 360}deg;
      --distance: ${100 + Math.random() * 200}px;
    }
    `).join('')}
    
    @keyframes particleExplode {
      0% {
        transform: translate(-50%, -50%) rotate(var(--angle)) translateY(0);
        opacity: 1;
      }
      100% {
        transform: translate(-50%, -50%) rotate(var(--angle)) translateY(var(--distance));
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(effect);
  
  // 1.5秒后移除
  setTimeout(() => {
    effect.remove();
    style.remove();
  }, 2000);
}

/**
 * 攻击动画
 */
function playAttackAnimation(element) {
  if (!element) return;
  element.classList.add('attack-animation');
  
  const style = document.createElement('style');
  style.textContent = `
    @keyframes attackAnimation {
      0% { transform: scale(1); }
      25% { transform: scale(1.1) translateX(5px); }
      50% { transform: scale(0.95); }
      75% { transform: scale(1.05) translateX(-5px); }
      100% { transform: scale(1); }
    }
    .attack-animation {
      animation: attackAnimation 0.3s ease-out;
    }
  `;
  document.head.appendChild(style);
  
  setTimeout(() => {
    element.classList.remove('attack-animation');
    style.remove();
  }, 300);
}

/**
 * 受击动画
 */
function playHitAnimation(element) {
  if (!element) return;
  element.classList.add('hit-animation');
  
  const style = document.createElement('style');
  style.textContent = `
    @keyframes hitAnimation {
      0%, 100% { filter: brightness(1); }
      25% { filter: brightness(1.5) sepia(1); }
      50% { filter: brightness(0.8); }
      75% { filter: brightness(1.2); }
    }
    .hit-animation {
      animation: hitAnimation 0.4s ease-out;
    }
  `;
  document.head.appendChild(style);
  
  setTimeout(() => {
    element.classList.remove('hit-animation');
    style.remove();
  }, 400);
}

/**
 * 暴击动画
 */
function playCritAnimation(element) {
  if (!element) return;
  element.classList.add('crit-animation');
  
  const style = document.createElement('style');
  style.textContent = `
    @keyframes critAnimation {
      0% { transform: scale(1); }
      50% { transform: scale(1.3); filter: brightness(2); }
      100% { transform: scale(1); }
    }
    .crit-animation {
      animation: critAnimation 0.5s ease-out;
    }
  `;
  document.head.appendChild(style);
  
  setTimeout(() => {
    element.classList.remove('crit-animation');
    style.remove();
  }, 500);
}

/**
 * 飘字动画 - 显示伤害/回复等数值
 */
function showFloatingText(element, text, type = 'damage') {
  if (!element) return;
  
  const floater = document.createElement('div');
  floater.className = `floating-text floating-${type}`;
  floater.textContent = text;
  
  const colors = {
    damage: '#ef4444',
    heal: '#22c55e',
    mana: '#3b82f6',
    spirit: '#ffd700',
    crit: '#ff4500'
  };
  
  floater.style.cssText = `
    position: absolute;
    color: ${colors[type] || '#fff'};
    font-size: 18px;
    font-weight: bold;
    font-family: 'KaiTi', 'STKaiti', '楷体', serif;
    text-shadow: 0 0 10px ${colors[type] || '#fff'}, 2px 2px 4px rgba(0,0,0,0.8);
    pointer-events: none;
    animation: floatUp 1s ease-out forwards;
    z-index: 1000;
  `;
  
  // 添加动画样式
  if (!document.getElementById('float-animation-style')) {
    const style = document.createElement('style');
    style.id = 'float-animation-style';
    style.textContent = `
      @keyframes floatUp {
        0% {
          opacity: 1;
          transform: translateY(0) scale(0.5);
        }
        20% {
          transform: translateY(-20px) scale(1.2);
        }
        100% {
          opacity: 0;
          transform: translateY(-60px) scale(1);
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  element.appendChild(floater);
  
  setTimeout(() => {
    floater.remove();
  }, 1000);
}

/**
 * 添加法宝发光效果
 */
function addArtifactGlow(element, quality) {
  if (!element) return;
  
  const glowColors = {
    mortal: 'rgba(139, 139, 139, 0.5)',
    spirit: 'rgba(0, 255, 127, 0.5)',
    treasure: 'rgba(30, 144, 255, 0.5)',
    immortal: 'rgba(255, 215, 0, 0.6)',
    divine: 'rgba(255, 69, 0, 0.7)'
  };
  
  const color = glowColors[quality] || glowColors.mortal;
  element.style.boxShadow = `0 0 15px ${color}, 0 0 30px ${color}`;
  
  if (quality === 'divine') {
    element.style.animation = 'pulseGlow 2s infinite';
    
    if (!document.getElementById('pulse-glow-style')) {
      const style = document.createElement('style');
      style.id = 'pulse-glow-style';
      style.textContent = `
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 15px rgba(255, 69, 0, 0.7), 0 0 30px rgba(255, 69, 0, 0.4); }
          50% { box-shadow: 0 0 25px rgba(255, 69, 0, 0.9), 0 0 50px rgba(255, 69, 0, 0.6); }
        }
      `;
      document.head.appendChild(style);
    }
  }
}

/**
 * 初始化页面加载后的效果
 */
function initPageEffects() {
  // 页面加载后初始化进度条效果
  setTimeout(() => {
    initSpiritFlowBars();
  }, 500);
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPageEffects);
} else {
  initPageEffects();
}

// 导出到全局
window.cultivationEffects = {
  addSpiritFlowEffect,
  initSpiritFlowBars,
  playRealmBreakthroughEffect,
  playAttackAnimation,
  playHitAnimation,
  playCritAnimation,
  showFloatingText,
  addArtifactGlow
};
