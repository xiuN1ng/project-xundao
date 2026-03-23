function openSettingsModal() {
  const currentUser = getCurrentUser();
  let modal = document.getElementById('settingsModal');
  if (!modal) {
    const html = `
      <div class="modal-overlay" id="settingsModal" onclick="closeSettingsModal(event)">
        <div class="modal-content" onclick="event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title">⚙️ 设置</div>
            <div class="modal-close" onclick="closeSettingsModal()">&times;</div>
          </div>
          <div class="modal-body">
            <div style="padding:15px">
              ${currentUser ? `<div style="margin-bottom:15px;padding:10px;background:rgba(255,215,0,0.1);border-radius:8px">
                <div style="color:#888;font-size:12px">当前登录</div>
                <div style="color:#ffd700;font-size:16px">👤 ${currentUser.username}</div>
              </div>` : ''}
              <button class="btn btn-primary" style="width:100%;margin-bottom:10px" onclick="restartGuide()">🔄 重新开始引导</button>
              <button class="btn btn-secondary" style="width:100%;margin-bottom:10px" onclick="exportGameData()">💾 导出存档</button>
              <button class="btn btn-secondary" style="width:100%;margin-bottom:10px" onclick="importGameData()">📂 导入存档</button>
              ${currentUser ? `<button class="btn btn-danger" style="width:100%" onclick="logout()">🚪 退出登录</button>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
  }
  document.getElementById('settingsModal').classList.add('active');
}

function closeSettingsModal(event) {
  if (event && event.target !== event.currentTarget) return;
  const modal = document.getElementById('settingsModal');
  if (modal) modal.classList.remove('active');
}

// 重新开始引导
function restartGuide() {
  if (confirm('确定要重新开始新手引导吗？当前进度将会丢失！')) {
    localStorage.removeItem('xundao_player');
    window.location.href = 'guide.html';
  }
}

// 导出存档
function exportGameData() {
  const data = localStorage.getItem('xundao_player');
  if (data) {
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'xundao_backup_' + new Date().toISOString().slice(0,10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    addLog('存档已导出', 'success');
  }
}

// 导入存档
function importGameData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          localStorage.setItem('xundao_player', JSON.stringify(data));
          addLog('存档导入成功，请刷新页面', 'success');
          setTimeout(() => location.reload(), 1000);
        } catch (err) {
          addLog('存档导入失败', 'error');
        }
      };
      reader.readAsText(file);
    }
  };
  input.click();
}

// 打开签到弹窗
function openSignModal() {
  // 复用现有的签到逻辑
  if (typeof game !== 'undefined' && game.signIn) {
    game.signIn();
  }
}

// 打开背包弹窗
function openInventoryModal() {
  if (typeof game !== 'undefined' && game.showInventory) {
    game.showInventory();
  } else {
    addLog('点击左侧面板的背包按钮查看物品', 'info');
  }
}

// 打开宗门弹窗
function openSectModal() {
  if (typeof openSectPanel === 'function') {
    openSectPanel();
  } else {
    addLog('点击左侧面板的宗门按钮', 'info');
  }
}
