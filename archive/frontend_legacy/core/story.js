// ==================== 剧情系统 ====================

// 打开剧情面板
async function showStoryPanel() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    showToast('请先登录', 'warning');
    return;
  }
  
  // 使用 Vue 组件方式打开面板
  if (window.VueComponentLoader) {
    try {
      await window.VueComponentLoader.load('./components/PlotPanel.vue');
    } catch (e) {
      console.warn('加载PlotPanel组件失败:', e);
    }
  }
  
  if (window.UIComponents && window.UIComponents.showPanel) {
    window.UIComponents.showPanel('PlotPanel', {});
  }
}

// 打开离线收益面板（使用Vue组件）
async function showOfflineRewardPanel() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    showToast('请先登录', 'warning');
    return;
  }
  
  // 使用 Vue 组件方式打开面板
  if (window.VueComponentLoader) {
    try {
      await window.VueComponentLoader.load('./components/OfflineRewardPanel.vue');
    } catch (e) {
      console.warn('加载OfflineRewardPanel组件失败:', e);
    }
  }
  
  if (window.UIComponents && window.UIComponents.showPanel) {
    window.UIComponents.showPanel('OfflineRewardPanel', {});
  }
}
