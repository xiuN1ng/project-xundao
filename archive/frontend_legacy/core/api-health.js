let apiStatus = { online: false, lastCheck: 0 };

// API健康检查函数
async function checkApiHealth() {
  try {
    const response = await fetch('/api/health', { 
      method: 'GET',
      cache: 'no-cache'
    });
    const data = await response.json();
    apiStatus = { 
      online: data.success && data.status === 'healthy', 
      lastCheck: Date.now() 
    };
    updateApiStatusUI();
    return apiStatus.online;
  } catch (error) {
    apiStatus = { online: false, lastCheck: Date.now() };
    updateApiStatusUI();
    return false;
  }
}

// 更新API状态UI
function updateApiStatusUI() {
  let statusEl = document.getElementById('apiStatus');
  if (!statusEl) {
    statusEl = document.createElement('div');
    statusEl.id = 'apiStatus';
    statusEl.className = 'api-status';
    document.body.appendChild(statusEl);
  }
  
  if (apiStatus.online) {
    statusEl.className = 'api-status online';
    statusEl.innerHTML = '<span class="api-status-dot"></span>服务器在线';
  } else {
    statusEl.className = 'api-status offline';
    statusEl.innerHTML = '<span class="api-status-dot"></span>离线模式';
  }
}

// 启动API健康检查循环
function startApiHealthCheck() {
  // 首次检查
  checkApiHealth();
  
  // 每30秒检查一次
  setInterval(() => {
    checkApiHealth();
  }, 30000);
}
