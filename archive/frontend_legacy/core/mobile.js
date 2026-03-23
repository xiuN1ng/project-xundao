let currentMobileTab = 'main';

// 移动端Tab切换
function switchMobileTab(tab) {
  // 移动端震动反馈
  if (navigator.vibrate) {
    navigator.vibrate(10);
  }
  
  // 更新导航状态
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.tab === tab) {
      item.classList.add('active');
    }
  });
  
  currentMobileTab = tab;
  
  // 隐藏所有面板，显示对应的移动端面板
  const leftPanel = document.querySelector('.left-panel');
  const rightPanel = document.querySelector('.right-panel');
  
  if (!leftPanel || !rightPanel) return;
  
  // 根据tab显示/隐藏内容
  if (tab === 'main') {
    // 主页 - 显示主要内容
    leftPanel.style.display = 'flex';
    rightPanel.style.display = 'flex';
  } else if (tab === 'inventory') {
    // 背包
    openInventoryModal();
  } else if (tab === 'sect') {
    // 宗门
    openSectModal();
  } else if (tab === 'chat') {
    // 聊天
    openChatModal();
  } else if (tab === 'plot') {
    // 剧情
    openPlotPanel();
  } else if (tab === 'settings') {
    // 设置
    openSettingsModal();
  }
}

// 打开剧情面板
async function openPlotPanel() {
  if (typeof showPlotPanel === 'function') {
    showPlotPanel();
  } else {
    // 尝试动态加载
    if (window.VueComponentLoader) {
      await window.VueComponentLoader.load('./components/PlotPanel.vue');
      setTimeout(() => {
        if (typeof showPlotPanel === 'function') {
          showPlotPanel();
        } else {
          addLog('剧情系统加载失败，请刷新页面重试', 'error');
        }
      }, 500);
    } else {
      addLog('剧情系统加载中...', 'info');
    }
  }
}

// 更新移动端顶部状态栏
function updateMobileTopBar() {
  const state = game.getState();
  if (!state || !state.player) return;
  
  const staminaEl = document.getElementById('mobileStamina');
  const spiritStonesEl = document.getElementById('mobileSpiritStones');
  
  if (staminaEl) {
    staminaEl.textContent = Math.floor(state.player.spirit || 0);
  }
  
  if (spiritStonesEl) {
    spiritStonesEl.textContent = fmt(state.player.spiritStones || 0);
  }
}
