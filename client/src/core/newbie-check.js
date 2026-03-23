// ==================== 新手引导检查 ====================
function checkGuide() {
  // 首先检查是否需要显示登录界面
  const authContainer = document.getElementById('authContainer');
  if (!authContainer) {
    // 页面结构问题，隐藏loading并继续
    const loadingEl = document.getElementById('loadingOverlay');
    if (loadingEl) loadingEl.classList.add('hidden');
    return true;
  }
  
  // 检查登录状态
  const currentUser = getCurrentUser();
  const session = JSON.parse(localStorage.getItem(AUTH_KEYS.SESSION) || '{}');
  
  if (!currentUser || !session.userId) {
    // 未登录，显示登录界面，隐藏loading
    authContainer.classList.remove('hidden');
    const loadingEl = document.getElementById('loadingOverlay');
    if (loadingEl) loadingEl.classList.add('hidden');
    return false;
  }
  
  // 已登录，检查游戏数据
  const savedData = localStorage.getItem('xundao_player');
  if (!savedData) {
    // 没有玩家数据，跳转到引导页面（跳转前隐藏loading）
    const loadingEl = document.getElementById('loadingOverlay');
    if (loadingEl) loadingEl.classList.add('hidden');
    window.location.href = 'guide.html';
    return false;
  }
  try {
    const playerData = JSON.parse(savedData);
    if (!playerData.guide || !playerData.guide.completed) {
      // 引导未完成，跳转到引导页面（跳转前隐藏loading）
      const loadingEl = document.getElementById('loadingOverlay');
      if (loadingEl) loadingEl.classList.add('hidden');
      window.location.href = 'guide.html';
      return false;
    }
  } catch (e) {
    // 数据解析错误，跳转到引导页面
    const loadingEl = document.getElementById('loadingOverlay');
    if (loadingEl) loadingEl.classList.add('hidden');
    window.location.href = 'guide.html';
    return false;
  }
  
  // 登录成功且有游戏数据，隐藏登录界面和移除加载遮罩
  authContainer.classList.add('hidden');
  const loadingEl = document.getElementById('loadingOverlay');
  if (loadingEl) loadingEl.remove();
  return true;
}

