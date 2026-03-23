// ==================== 离线收益系统 ====================
let offlineData = null;
let offlineClaimTimer = null;

// 打开离线收益面板
function showOfflinePanel() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    showToast('请先登录', 'warning');
    return;
  }
  
  // 显示弹窗
  const modal = document.getElementById('offlineModal');
  if (modal) {
    modal.classList.add('active');
    loadOfflineInfo();
  }
}

// 加载离线收益信息
async function loadOfflineInfo() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  const content = document.getElementById('offlineContent');
  if (!content) return;
  
  // 显示加载状态
  content.innerHTML = '<div class="offline-loading">加载中...</div>';
  
  try {
    // 调用API获取离线收益信息
    if (typeof offlineAPI !== 'undefined') {
      const result = await offlineAPI.getInfo(currentUser.id);
      if (result.success) {
        offlineData = result.data;
        renderOfflineContent(offlineData);
      } else {
        content.innerHTML = `<div class="offline-empty">${result.message || '加载失败'}</div>`;
      }
    } else {
      // 模拟数据（当API不可用时）
      simulateOfflineData(content);
    }
  } catch (err) {
    console.error('加载离线收益信息失败:', err);
    content.innerHTML = '<div class="offline-empty">加载失败，请稍后重试</div>';
  }
}

// 模拟离线数据（用于测试）
function simulateOfflineData(content) {
  const now = Date.now();
  const offlineTime = Math.min(now - (window.gameState?.player?.offline_start_time || now), 24 * 60 * 60 * 1000);
  const hours = Math.floor(offlineTime / (60 * 60 * 1000));
  const minutes = Math.floor((offlineTime % (60 * 60 * 1000)) / (60 * 1000));
  const level = window.gameState?.player?.level || 1;
  
  const estimatedExp = Math.floor(level * 100 * (offlineTime / (60 * 60 * 1000)));
  const estimatedStones = Math.floor(level * 50 * (offlineTime / (60 * 60 * 1000)));
  const canClaim = offlineTime >= 60 * 1000;
  
  offlineData = {
    offline_time: offlineTime,
    offline_hours: hours,
    offline_minutes: minutes,
    max_time: 24 * 60 * 60 * 1000,
    can_claim: canClaim,
    estimated: {
      exp: estimatedExp,
      spirit_stones: estimatedStones
    }
  };
  
  renderOfflineContent(offlineData);
}

// 渲染离线收益内容
function renderOfflineContent(data) {
  const content = document.getElementById('offlineContent');
  if (!content) return;
  
  const hours = data.offline_hours || 0;
  const minutes = data.offline_minutes || 0;
  const timeStr = hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`;
  const progress = Math.min((data.offline_time / data.max_time) * 100, 100);
  
  if (hours === 0 && minutes < 1) {
    content.innerHTML = `
      <div class="offline-empty">
        <div class="offline-empty-icon">⏳</div>
        <div>离线时间不足，无法领取收益</div>
        <div style="margin-top:10px;font-size:12px;color:var(--text-muted)">下次退出游戏后将开始计算离线收益</div>
      </div>
    `;
    return;
  }
  
  const exp = data.estimated?.exp || 0;
  const stones = data.estimated?.spirit_stones || 0;
  
  content.innerHTML = `
    <div class="offline-info">
      <div class="offline-time-label">离线时长</div>
      <div class="offline-time">${timeStr}</div>
      <div class="offline-progress">
        <div class="offline-progress-bar" style="width:${progress}%"></div>
      </div>
      <div class="offline-max-tip">离线收益上限: 24小时</div>
    </div>
    
    <div class="offline-rewards">
      <div class="offline-reward-item">
        <span class="offline-reward-label">✨ 预估经验</span>
        <span class="offline-reward-value exp">+${fmt(exp)}</span>
      </div>
      <div class="offline-reward-item">
        <span class="offline-reward-label">💎 预估灵石</span>
        <span class="offline-reward-value stones">+${fmt(stones)}</span>
      </div>
    </div>
    
    <button class="offline-claim-btn" id="offlineClaimBtn" onclick="claimOfflineReward()" ${!data.can_claim ? 'disabled' : ''}>
      ${data.can_claim ? '🎁 领取离线收益' : '离线时间不足'}
    </button>
  `;
}

// 领取离线收益
async function claimOfflineReward() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    showToast('请先登录', 'warning');
    return;
  }
  
  const btn = document.getElementById('offlineClaimBtn');
  if (!btn || btn.disabled) return;
  
  btn.disabled = true;
  btn.textContent = '领取中...';
  
  try {
    if (typeof offlineAPI !== 'undefined') {
      const result = await offlineAPI.claim(currentUser.id);
      if (result.success) {
        showToast(result.message, 'success');
        
        // 更新玩家数据
        if (result.data && window.gameState && window.gameState.player) {
          window.gameState.player.exp = (window.gameState.player.exp || 0) + (result.data.earned?.exp || 0);
          window.gameState.player.spirit_stones = (window.gameState.player.spirit_stones || 0) + (result.data.earned?.spirit_stones || 0);
          
          // 如果升级了
          if (result.data.leveled_up) {
            window.gameState.player.level = result.data.new_level;
            showToast(`🎉 恭喜升级到 ${result.data.new_level} 级！`, 'success');
          }
          
          // 更新UI显示
          updatePlayerDisplay();
        }
        
        // 刷新显示
        loadOfflineInfo();
      } else {
        showToast(result.message || '领取失败', 'error');
        btn.disabled = false;
        btn.textContent = '🎁 领取离线收益';
      }
    } else {
      // 模拟领取
      simulateClaimOffline(content);
    }
  } catch (err) {
    console.error('领取离线收益失败:', err);
    showToast('领取失败，请稍后重试', 'error');
    btn.disabled = false;
    btn.textContent = '🎁 领取离线收益';
  }
}

// 模拟领取（用于测试）
function simulateClaimOffline() {
  if (!offlineData) return;
  
  const exp = offlineData.estimated?.exp || 0;
  const stones = offlineData.estimated?.spirit_stones || 0;
  
  // 更新本地数据
  if (window.gameState && window.gameState.player) {
    window.gameState.player.exp = (window.gameState.player.exp || 0) + exp;
    window.gameState.player.spirit_stones = (window.gameState.player.spirit_stones || 0) + stones;
    window.gameState.player.offline_start_time = Date.now();
    
    updatePlayerDisplay();
  }
  
  showToast(`离线收益领取成功！获得${fmt(exp)}经验、${fmt(stones)}灵石`, 'success');
  
  // 刷新显示
  loadOfflineInfo();
}

// 页面加载时自动开始记录离线时间
function initOfflineTracking() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  // 调用API开始记录离线时间
  if (typeof offlineAPI !== 'undefined') {
    offlineAPI.start(currentUser.id).catch(err => {
      console.error('开始离线记录失败:', err);
    });
  } else {
    // 模拟开始记录
    if (window.gameState && window.gameState.player) {
      window.gameState.player.offline_start_time = Date.now();
    }
  }
  
  // 页面卸载时记录时间（用于下次登录计算离线收益）
  window.addEventListener('beforeunload', function() {
    const currentUser = getCurrentUser();
    if (currentUser && window.gameState && window.gameState.player) {
      window.gameState.player.offline_start_time = Date.now();
      // 尝试保存到服务器
      if (typeof offlineAPI !== 'undefined') {
        navigator.sendBeacon('/api/offline/start', JSON.stringify({ player_id: currentUser.id }));
      }
    }
  });
  
  // 页面可见性变化时处理
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
      // 页面隐藏时记录时间
      const currentUser = getCurrentUser();
      if (currentUser && window.gameState && window.gameState.player) {
        window.gameState.player.offline_start_time = Date.now();
      }
    } else if (document.visibilityState === 'visible') {
      // 页面重新可见时刷新离线收益信息
      const modal = document.getElementById('offlineModal');
      if (modal && modal.classList.contains('active')) {
        loadOfflineInfo();
      }
    }
  });
}

// 定期刷新离线收益信息（每30秒）
function startOfflineInfoRefresh() {
  if (offlineClaimTimer) {
    clearInterval(offlineClaimTimer);
  }
  
  offlineClaimTimer = setInterval(() => {
    const modal = document.getElementById('offlineModal');
    if (modal && modal.classList.contains('active')) {
      loadOfflineInfo();
    }
  }, 30000);
}

// 将离线收益函数暴露到全局作用域
window.showOfflinePanel = showOfflinePanel;
window.loadOfflineInfo = loadOfflineInfo;
window.claimOfflineReward = claimOfflineReward;
window.initOfflineTracking = initOfflineTracking;

// 打开设置弹窗
