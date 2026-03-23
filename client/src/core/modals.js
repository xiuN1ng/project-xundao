// ==================== 通用弹窗 ====================
function closeModal(id) { 
  document.getElementById(id).classList.remove('active'); 
  // 关闭聊天面板时停止轮询
  if (id === 'chatModal' && chatPollInterval) {
    clearInterval(chatPollInterval);
    chatPollInterval = null;
  }
}

function closeWelcomeModal() {
  document.getElementById('welcomeModal').classList.remove('active');
  // 关闭后启动引导
  setTimeout(() => {
    const state = game.getState();
    if (state && state.stats && state.stats.totalCultivateTime < 60) {
      startGuide(guideSteps, () => {
        addLog('🎉 新手引导完成！祝您修仙愉快！', 'success');
      });
    }
  }, 1000);
}

