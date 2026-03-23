/**
 * 浏览器端入口文件
 * 加载HTML模板并初始化游戏
 */
(async function() {
  // 加载HTML模板
  try {
    const response = await fetch('templates/game-body.html');
    const html = await response.text();
    document.getElementById('game-body-container').innerHTML = html;
  } catch (e) {
    console.error('Failed to load game body template:', e);
    return;
  }
  
  // 隐藏初始加载遮罩
  const initialLoading = document.getElementById('initialLoading');
  if (initialLoading) {
    initialLoading.classList.add('hidden');
    setTimeout(() => initialLoading.remove(), 500);
  }
  
  // 调用bootstrap初始化游戏
  if (typeof window.bootstrapGame === 'function') {
    await window.bootstrapGame();
  }
})();
