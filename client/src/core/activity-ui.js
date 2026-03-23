// ==================== 活动 UI ====================
let eventCurrentTab = 'all';

function showEventPanel() {
  document.getElementById('eventModal').classList.add('active');
  eventCurrentTab = 'all';
  renderEventUI();
}

// 使用Vue组件显示活动面板
function showActivityPanel() {
  if (window.UIComponents && window.UIComponents.showPanel) {
    window.UIComponents.showPanel('ActivityPanel', {});
  } else {
    // 降级到旧的事件面板
    showEventPanel();
  }
}

// 使用Vue组件显示技能树面板
function showSkillTreePanel() {
  if (window.UIComponents) {
    window.UIComponents.showPanel('SkillTreePanel', {});
  } else {
    showToast('组件加载中，请稍后重试');
  }
}

// 使用Vue组件显示装备强化面板
function showEnhancementPanel() {
  if (window.UIComponents) {
    window.UIComponents.showPanel('EnhancementPanel', {});
  } else {
    showToast('组件加载中，请稍后重试');
  }
}

function switchEventTab(tab) {
  eventCurrentTab = tab;
  renderEventUI();
}

function renderEventUI() {
  const container = document.getElementById('eventContent');
  const signInfo = getSignInfo();
  const activeEvents = getActiveEvents();
  const bonus = getEventBonus();
  
  // 计算是否有活动在进行
  const hasActiveBonus = bonus.exp > 1 || bonus.drop > 1;
  
  let html = `<div class="event-header">
    <div class="event-header-title">🎉 活动中心</div>
    <div class="event-header-subtitle">参与活动获得丰厚奖励</div>
  </div>`;
  
  // 当前加成显示
  if (hasActiveBonus) {
    html += `<div class="event-bonus-bar">
      <div class="event-bonus-title">✨ 当前活动加成</div>
      <div class="event-bonus-items">
        <div class="event-bonus-item">
          <div class="event-bonus-icon">✨</div>
          <div class="event-bonus-value">${Math.round((bonus.exp - 1) * 100)}%</div>
          <div class="event-bonus-label">经验</div>
        </div>
        <div class="event-bonus-item">
          <div class="event-bonus-icon">💎</div>
          <div class="event-bonus-value">${Math.round((bonus.drop - 1) * 100)}%</div>
          <div class="event-bonus-label">掉落</div>
        </div>
        <div class="event-bonus-item">
          <div class="event-bonus-icon">🪙</div>
          <div class="event-bonus-value">${Math.round((bonus.stones - 1) * 100)}%</div>
          <div class="event-bonus-label">灵石</div>
        </div>
      </div>
    </div>`;
  }
  
  // 签到日历
  html += renderSignCalendar(signInfo);
  
  // 活动标签页
  const tabs = [
    { id: 'all', name: '全部', icon: '🎉' },
    { id: 'daily', name: '每日', icon: '📅' },
    { id: 'limited', name: '限时', icon: '⏰' },
    { id: 'special', name: '特殊', icon: '⭐' }
  ];
  
  html += '<div class="event-tabs">';
  for (const t of tabs) {
    html += `<button class="event-tab ${eventCurrentTab === t.id ? 'active' : ''}" onclick="switchEventTab('${t.id}')">${t.icon} ${t.name}</button>`;
  }
  html += '</div>';
  
  // 活动列表
  const filteredEvents = eventCurrentTab === 'all' 
    ? Object.entries(EVENT_CONFIG) 
    : Object.entries(EVENT_CONFIG).filter(([_, e]) => e.type === eventCurrentTab);
  
  if (filteredEvents.length === 0) {
    html += `<div class="event-empty">
      <div class="event-empty-icon">📭</div>
      <div>暂无活动</div>
    </div>`;
  } else {
    html += '<div class="event-list">';
    for (const [id, event] of filteredEvents) {
      html += renderEventCard(id, event);
    }
    html += '</div>';
  }
  
  container.innerHTML = html;
}

function renderSignCalendar(signInfo) {
  const event = EVENT_CONFIG.daily_sign;
  const todaySigned = signInfo.todaySigned;
  const signedDays = signInfo.signedDays;
  
  // 计算连续签到
  const streakDays = todaySigned ? signedDays : signedDays;
  
  let html = `<div class="event-sign-calendar">
    <div class="event-sign-title">📝 每日签到</div>
    <div class="event-sign-streak">连续签到 <span>${streakDays}</span> 天</div>
    <div class="event-sign-days">`;
  
  for (let i = 0; i < 7; i++) {
    const reward = event.rewards[i];
    const isCurrent = i === signedDays % 7;
    const isSigned = i < signedDays % 7 || (todaySigned && i === signedDays % 7 - 1);
    const isSignedToday = todaySigned && i === (signedDays - 1) % 7;
    
    let className = 'event-sign-day';
    if (isSignedToday) className += ' signed';
    else if (isCurrent && !todaySigned) className += ' current';
    
    // 第7天有特殊标记
    const isBigReward = i === 6;
    
    html += `<div class="${className}" ${isBigReward ? 'style="border-color:#FFD700"' : ''}>
      <div class="event-sign-day-num">${i + 1}</div>
      <div class="event-sign-day-reward">+${reward.value}</div>
    </div>`;
  }
  
  html += `</div>
    <button class="event-sign-btn" onclick="signInUI()" ${todaySigned ? 'disabled' : ''}>
      ${todaySigned ? '✅ 今日已签到' : '📝 立即签到'}
    </button>
    
    <div class="event-sign-rewards-preview">
      <div class="event-sign-rewards-title">📋 签到奖励预览</div>
      <div class="event-sign-rewards-list">`;
  
  // 添加奖励预览
  const previewRewards = [
    { day: 1, value: 100, icon: '🪙' },
    { day: 2, value: 200, icon: '🪙' },
    { day: 3, value: 300, icon: '🪙' },
    { day: 4, value: 500, icon: '🪙' },
    { day: 5, value: 800, icon: '🪙' },
    { day: 6, value: 1000, icon: '🪙' },
    { day: 7, value: 2000, icon: '💎' }
  ];
  
  for (const r of previewRewards) {
    html += `<div class="event-sign-rewards-item">
      <div class="event-sign-rewards-icon">${r.icon}</div>
      <div class="event-sign-rewards-value">+${r.value}</div>
      <div class="event-sign-rewards-day">第${r.day}天</div>
    </div>`;
  }
  
  html += `</div></div></div>`;
  
  return html;
}

function renderEventCard(id, event) {
  const typeInfo = EVENT_TYPE[event.type];
  const isClaimed = eventState.dailyRewards && eventState.dailyRewards[id];
  const canClaim = event.condition && event.condition();
  
  let rewardsHtml = '';
  if (event.rewards) {
    for (const reward of event.rewards) {
      if (reward.type === 'stones') {
        rewardsHtml += `<span class="event-reward-tag">🪙 +${reward.value}</span>`;
      } else if (reward.type === 'exp') {
        rewardsHtml += `<span class="event-reward-tag">✨ +${reward.value}</span>`;
      } else if (reward.type === 'item') {
        rewardsHtml += `<span class="event-reward-tag">📦 ${reward.value}</span>`;
      }
    }
  }
  
  if (event.bonus) {
    if (event.bonus.exp) {
      rewardsHtml += `<span class="event-reward-tag">✨ 经验x${event.bonus.exp}</span>`;
    }
    if (event.bonus.drop) {
      rewardsHtml += `<span class="event-reward-tag">💎 掉落x${event.bonus.drop}</span>`;
    }
  }
  
  let actionBtn = '';
  if (event.rewards && !event.oneTime) {
    if (isClaimed) {
      actionBtn = `<button class="event-btn event-btn-claimed" disabled>✅ 已领取</button>`;
    } else if (canClaim) {
      actionBtn = `<button class="event-btn event-btn-primary" onclick="claimEventRewardUI('${id}')">🎁 领取</button>`;
    } else {
      actionBtn = `<button class="event-btn event-btn-disabled" disabled>🔒 条件不足</button>`;
    }
  } else if (event.oneTime) {
    actionBtn = `<button class="event-btn event-btn-primary" onclick="claimEventRewardUI('${id}')">🎁 领取</button>`;
  }
  
  const bgColor = typeInfo ? typeInfo.color : '#667eea';
  
  return `<div class="event-card">
    <div class="event-card-header">
      <div class="event-card-icon" style="background: linear-gradient(135deg, ${bgColor}33, ${bgColor}66)">${event.icon}</div>
      <div class="event-card-info">
        <div class="event-card-name">${event.name}</div>
        <div class="event-card-type">${typeInfo ? typeInfo.name : ''}</div>
      </div>
      <div class="event-card-badge" style="background: ${bgColor}">${typeInfo ? typeInfo.icon : ''}</div>
    </div>
    <div class="event-card-desc">${event.desc}</div>
    ${rewardsHtml ? `<div class="event-card-rewards">${rewardsHtml}</div>` : ''}
    ${actionBtn ? `<div class="event-card-action">${actionBtn}</div>` : ''}
  </div>`;
}

function signInUI() {
  const result = signIn();
  if (result.success) {
    addLog(result.message, 'success');
    // 显示签到成功动画
    showSignSuccessAnimation(result.reward);
  } else {
    addLog(result.message, 'error');
  }
  renderEventUI();
}

// 签到成功动画
function showSignSuccessAnimation(reward) {
  const container = document.getElementById('eventContent');
  if (!container) return;
  
  // 创建成功提示
  const popup = document.createElement('div');
  popup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: #fff;
    padding: 30px 50px;
    border-radius: 20px;
    font-size: 24px;
    font-weight: bold;
    z-index: 10000;
    animation: signSuccessPop 1.5s ease-out forwards;
    box-shadow: 0 10px 40px rgba(102, 126, 234, 0.5);
  `;
  popup.innerHTML = `
    <div style="font-size:48px;margin-bottom:15px">🎉</div>
    <div>签到成功！</div>
    <div style="color:#FFD700;font-size:20px;margin-top:10px">+${reward.value} 灵石</div>
  `;
  
  // 添加动画样式
  const style = document.createElement('style');
  style.textContent = `
    @keyframes signSuccessPop {
      0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
      30% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
      100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(popup);
  
  setTimeout(() => {
    popup.remove();
    style.remove();
  }, 1500);
}

function claimEventRewardUI(eventId) {
  const result = claimDailyReward(eventId);
  addLog(result.message, result.success ? 'success' : 'error');
  if (result.success) {
    renderEventUI();
  }
}

