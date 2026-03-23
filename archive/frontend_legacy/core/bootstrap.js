// ==================== 启动函数 ====================
async function bootstrap() {
  // 移除loading层
  const loadingEl = document.getElementById('loadingOverlay');
  if (loadingEl) loadingEl.remove();
  
  // 加载资源
  if (typeof ResourceLoader !== 'undefined' && ResourceLoader.load) {
    await ResourceLoader.load();
  }
  
  // 初始化游戏
  if (typeof initGame === 'function') {
    initGame();
  }
}

// 导出bootstrap函数供main.js调用
window.bootstrapGame = bootstrap;
