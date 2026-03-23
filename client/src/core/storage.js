/**
 * 数据持久化模块
 */
let autoSaveTimer = null;
let lastSaveTime = 0;
const SAVE_COOLDOWN = 10000;

// 保存游戏数据到服务器
async function saveGame(showMessage = false) {
  const now = Date.now();
  if (now - lastSaveTime < SAVE_COOLDOWN && !showMessage) return;
  if (!window.game || !window.authToken) return;
  try {
    const gameState = window.game.getState();
    const response = await fetch('/api/storage/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + window.authToken
      },
      body: JSON.stringify({
        player_id: window.playerId,
        game_data: JSON.stringify(gameState)
      })
    });
    const result = await response.json();
    lastSaveTime = now;
    if (showMessage && result.success) {
      showToast('✅ 游戏已自动保存', 'success');
    }
    return result;
  } catch (error) {
    console.error('保存失败:', error);
    if (showMessage) showToast('❌ 保存失败: ' + error.message, 'error');
    return { success: false, error: error.message };
  }
}

// 从服务器加载游戏数据
async function loadGame() {
  if (!window.authToken || !window.playerId) return false;
  try {
    const response = await fetch(`/api/storage/load?player_id=${encodeURIComponent(window.playerId)}`, {
      headers: { 'Authorization': 'Bearer ' + window.authToken }
    });
    const result = await response.json();
    if (result.success && result.data && result.data.game_data) {
      try {
        const gameState = JSON.parse(result.data.game_data);
        if (window.game && typeof window.game.loadState === 'function') {
          window.game.loadState(gameState);
          addLog('📥 已加载存档数据', 'success');
          return true;
        }
      } catch (e) { console.error('解析存档失败:', e); }
    }
    return false;
  } catch (error) {
    console.error('加载失败:', error);
    return false;
  }
}

// 启动自动保存
function startAutoSave() {
  if (autoSaveTimer) clearInterval(autoSaveTimer);
  autoSaveTimer = setInterval(() => saveGame(false), 30000);
}

export { saveGame, loadGame, startAutoSave };
