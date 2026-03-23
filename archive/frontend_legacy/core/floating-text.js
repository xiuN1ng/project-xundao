function showFloatText(text, type = 'spirit', x = null, y = null) {
  const el = document.createElement('div');
  el.className = `float-text ${type}`;
  el.textContent = text;
  
  // 添加类型对应的图标
  const icons = {
    'spirit': '✨',
    'stones': '💎',
    'exp': '📈',
    'damage': '💥',
    'heal': '💚',
    'bonus': '🎁',
    'realm': '🧘',
    'achievement': '🏆',
    'danger': '⚠️'
  };
  
  // 如果没有指定位置，则随机显示在屏幕中央区域
  if (x === null || y === null) {
    x = window.innerWidth * 0.3 + Math.random() * window.innerWidth * 0.4;
    y = window.innerHeight * 0.4 + Math.random() * window.innerHeight * 0.2;
  }
  
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  
  // 根据类型添加不同颜色和图标
  if (icons[type]) {
    el.innerHTML = `<span style="margin-right:4px">${icons[type]}</span>${text}`;
  }
  
  // 根据类型添加不同的动画效果
  if (type === 'damage') {
    el.style.animation = 'floatTextDamage 1.5s ease-out forwards';
  } else if (type === 'realm') {
    el.style.animation = 'floatTextRealm 2s ease-out forwards';
    el.style.fontSize = '24px';
  } else if (type === 'achievement') {
    el.style.animation = 'floatTextAchievement 2s ease-out forwards';
  } else {
    el.style.animation = 'floatTextEnhanced 1.5s ease-out forwards';
  }
  
  document.body.appendChild(el);
  
  // 动画结束后移除元素
  setTimeout(() => el.remove(), 1500);
}

// 增强的飘字动画样式
const style = document.createElement('style');
style.textContent = `
  @keyframes floatTextEnhanced {
    0% { opacity: 1; transform: translateY(0) scale(0.5); }
    20% { opacity: 1; transform: translateY(-20px) scale(1.2); }
    80% { opacity: 0.8; transform: translateY(-50px) scale(1); }
    100% { opacity: 0; transform: translateY(-80px) scale(0.8); }
  }
  @keyframes floatTextDamage {
    0% { opacity: 1; transform: translateY(0) scale(0.3) rotate(-10deg); }
    30% { opacity: 1; transform: translateY(-30px) scale(1.3) rotate(5deg); }
    60% { opacity: 0.8; transform: translateY(-60px) scale(1) rotate(-3deg); }
    100% { opacity: 0; transform: translateY(-100px) scale(0.7) rotate(0deg); }
  }
  @keyframes floatTextRealm {
    0% { opacity: 0; transform: translateY(20px) scale(0.5); filter: blur(10px); }
    30% { opacity: 1; transform: translateY(-30px) scale(1.3); filter: blur(0); }
    50% { transform: translateY(-50px) scale(1.1); }
    100% { opacity: 0; transform: translateY(-100px) scale(0.8); filter: blur(5px); }
  }
  @keyframes floatTextAchievement {
    0% { opacity: 0; transform: scale(0) rotate(-180deg); }
    30% { opacity: 1; transform: scale(1.3) rotate(10deg); }
    50% { transform: scale(1) rotate(-5deg); }
    70% { transform: scale(1.1) rotate(3deg); }
    100% { opacity: 0; transform: scale(0.8) translateY(-80px) rotate(0deg); }
  }
`;
document.head.appendChild(style);

// 显示伤害数字
function showDamageNumber(damage, isCritical = false, elementId = 'enemyList') {
  const container = document.getElementById(elementId);
  if (!container) return;
  
  const el = document.createElement('div');
  el.className = 'damage-number' + (isCritical ? ' critical' : '');
  el.textContent = (isCritical ? '暴击! ' : '') + Math.floor(damage);
  
  // 随机位置
  const rect = container.getBoundingClientRect();
  const x = rect.left + rect.width * 0.3 + Math.random() * rect.width * 0.4;
  const y = rect.top + rect.height * 0.3 + Math.random() * rect.height * 0.4;
  
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  
  document.body.appendChild(el);
  
  setTimeout(() => el.remove(), 1000);
}

// 显示治疗数字
function showHealNumber(heal) {
  const el = document.createElement('div');
  el.className = 'damage-number heal';
  el.textContent = '+' + Math.floor(heal);
  
  // 显示在玩家生命值位置
  const hpEl = document.getElementById('playerHp');
  if (hpEl) {
    const rect = hpEl.getBoundingClientRect();
    el.style.left = rect.left + 'px';
    el.style.top = rect.top + 'px';
  } else {
    el.style.left = '50%';
    el.style.top = '50%';
  }
  
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

