// ==================== 好友系统 UI ====================
// 参考: 梦幻西游好友系统 + 微信好友功能
// API: /api/friend/* (xundao-server backend)

const API_BASE = window.API_BASE || 'http://localhost:3001';

// 当前状态
let friendCurrentTab = 'friends';
let friendData = {
  friends: [],
  friendCount: 0,
  onlineCount: 0,
  received: [],
  sent: []
};
let friendSearchResults = [];
let currentFriendChat = null;

// ===== 打开好友面板 =====
function showFriendPanel() {
  document.getElementById('friendModal').classList.add('active');
  friendCurrentTab = 'friends';
  loadFriendData();
}

// ===== 加载好友数据 =====
async function loadFriendData() {
  try {
    const res = await fetch(`${API_BASE}/api/friend?player_id=${getCurrentPlayerId()}`, {
      credentials: 'include'
    });
    if (res.ok) {
      const result = await res.json();
      if (result.success) {
        friendData.friends = result.data.friends || [];
        friendData.friendCount = result.data.friendCount || 0;
        friendData.onlineCount = result.data.onlineCount || 0;
      }
    }
  } catch (e) {
    console.log('[friend] 加载好友列表失败,使用本地数据');
  }

  try {
    const res = await fetch(`${API_BASE}/api/friend/requests?player_id=${getCurrentPlayerId()}`, {
      credentials: 'include'
    });
    if (res.ok) {
      const result = await res.json();
      if (result.success) {
        friendData.received = result.data.received || [];
        friendData.sent = result.data.sent || [];
      }
    }
  } catch (e) {
    console.log('[friend] 加载好友申请失败');
  }

  renderFriendUI();
}

// ===== 切换标签页 =====
function switchFriendTab(tab) {
  friendCurrentTab = tab;
  renderFriendUI();
}

// ===== 渲染好友UI =====
function renderFriendUI() {
  const container = document.getElementById('friendContent');
  const pendingCount = friendData.received.length;

  let html = `
  <div class="friend-header">
    <div class="friend-header-title">👥 好友系统</div>
    <div class="friend-header-stats">
      <span class="stat-item">💚 ${friendData.onlineCount} 在线</span>
      <span class="stat-item">👥 ${friendData.friendCount}/50</span>
    </div>
  </div>`;

  // 搜索区域
  html += `
  <div class="friend-search-section">
    <input type="text" id="friendSearchInput" class="friend-search-input" 
           placeholder="🔍 搜索玩家名称..." 
           onkeyup="handleFriendSearch(event)">
    <button class="friend-search-btn" onclick="doFriendSearch()">搜索</button>
  </div>`;

  // 搜索结果
  html += `<div id="friendSearchResults" class="friend-search-results"></div>`;

  // 标签页
  const tabs = [
    { id: 'friends', name: '💚 好友', count: friendData.friendCount },
    { id: 'requests', name: '📨 申请', count: pendingCount },
    { id: 'search', name: '🔍 发现', count: 0 }
  ];

  html += '<div class="friend-tabs">';
  for (const t of tabs) {
    const badge = t.count > 0 ? `<span class="friend-tab-badge">${t.count}</span>` : '';
    html += `<button class="friend-tab ${friendCurrentTab === t.id ? 'active' : ''}" onclick="switchFriendTab('${t.id}')">${t.name}${badge}</button>`;
  }
  html += '</div>';

  // 内容区
  if (friendCurrentTab === 'friends') {
    html += renderFriendList();
  } else if (friendCurrentTab === 'requests') {
    html += renderRequestsList();
  } else if (friendCurrentTab === 'search') {
    html += renderDiscoverList();
  }

  container.innerHTML = html;
}

// ===== 渲染好友列表 =====
function renderFriendList() {
  const friends = friendData.friends;
  if (friends.length === 0) {
    return `<div class="friend-empty">
      <div class="friend-empty-icon">😔</div>
      <div>还没有好友，快去搜索添加吧！</div>
      <div class="friend-empty-hint">点击「发现」标签页搜索玩家</div>
    </div>`;
  }

  let html = '<div class="friend-list">';
  for (const f of friends) {
    const onlineClass = f.online ? 'online' : 'offline';
    const onlineBadge = f.online ? '🟢' : '⚫';
    html += `
    <div class="friend-card ${onlineClass}">
      <div class="friend-avatar" onclick="openFriendChat(${f.friendId}, '${escapeHtml(f.name)}')">
        <span class="avatar-icon">🧑</span>
        <span class="online-indicator ${onlineClass}">${onlineBadge}</span>
      </div>
      <div class="friend-info" onclick="openFriendChat(${f.friendId}, '${escapeHtml(f.name)}')">
        <div class="friend-name">${escapeHtml(f.name)}</div>
        <div class="friend-meta">Lv.${f.level || 1} · ${f.realm || '练气'}</div>
        <div class="friend-since">加为好友: ${formatDate(f.since)}</div>
      </div>
      <div class="friend-actions">
        <button class="friend-btn friend-btn-chat" onclick="openFriendChat(${f.friendId}, '${escapeHtml(f.name)}')" title="私聊">💬</button>
        <button class="friend-btn friend-btn-gift" onclick="showGiftPanel(${f.friendId}, '${escapeHtml(f.name)}')" title="送礼">🎁</button>
        <button class="friend-btn friend-btn-more" onclick="showFriendMoreMenu(${f.friendId}, '${escapeHtml(f.name)}')" title="更多">⋯</button>
      </div>
    </div>`;
  }
  html += '</div>';
  return html;
}

// ===== 渲染申请列表 =====
function renderRequestsList() {
  const received = friendData.received;
  const sent = friendData.sent;

  let html = `<div class="requests-section">`;

  // 收到的申请
  html += `<div class="requests-group">
    <div class="requests-group-title">📥 收到的申请 (${received.length})</div>`;
  if (received.length === 0) {
    html += `<div class="requests-empty">暂无好友申请</div>`;
  } else {
    html += `<div class="requests-list">`;
    for (const r of received) {
      html += `
      <div class="request-card">
        <div class="request-avatar">🧑</div>
        <div class="request-info">
          <div class="request-name">${escapeHtml(r.fromName)}</div>
          <div class="request-meta">Lv.${r.level || 1} · ${r.realm || '练气'}</div>
          ${r.message ? `<div class="request-message">"${escapeHtml(r.message)}"</div>` : ''}
          <div class="request-time">${formatDate(r.createdAt)}</div>
        </div>
        <div class="request-actions">
          <button class="friend-btn friend-btn-accept" onclick="acceptFriendRequest(${r.requestId})">✅ 接受</button>
          <button class="friend-btn friend-btn-reject" onclick="rejectFriendRequest(${r.requestId})">❌ 拒绝</button>
        </div>
      </div>`;
    }
    html += `</div>`;
  }
  html += `</div>`;

  // 发出的申请
  html += `<div class="requests-group">
    <div class="requests-group-title">📤 发出的申请 (${sent.length})</div>`;
  if (sent.length === 0) {
    html += `<div class="requests-empty">暂无发出的申请</div>`;
  } else {
    html += `<div class="requests-list">`;
    for (const s of sent) {
      const statusMap = { pending: '⏳ 待回复', accepted: '✅ 已接受', rejected: '❌ 已拒绝' };
      const statusClass = s.status === 'accepted' ? 'status-accepted' : s.status === 'rejected' ? 'status-rejected' : 'status-pending';
      html += `
      <div class="request-card sent ${statusClass}">
        <div class="request-avatar">🧑</div>
        <div class="request-info">
          <div class="request-name">${escapeHtml(s.toName)}</div>
          <div class="request-time">${formatDate(s.createdAt)}</div>
        </div>
        <div class="request-status">${statusMap[s.status] || s.status}</div>
      </div>`;
    }
    html += `</div>`;
  }
  html += `</div>`;

  html += `</div>`;
  return html;
}

// ===== 渲染发现页 =====
function renderDiscoverList() {
  return `
  <div class="friend-discover">
    <div class="discover-tip">👆 在上方搜索框输入玩家名称发送好友申请</div>
    <div class="discover-info">
      <p>💡 <b>好友功能说明：</b></p>
      <ul>
        <li>好友上限：50人</li>
        <li>可以向好友发送灵石、道具等礼物</li>
        <li>点击好友头像可发起私聊</li>
        <li>拉黑后双方将不再是好友关系</li>
      </ul>
    </div>
  </div>`;
}

// ===== 搜索玩家 =====
function handleFriendSearch(e) {
  if (e.key === 'Enter') {
    doFriendSearch();
  }
}

async function doFriendSearch() {
  const input = document.getElementById('friendSearchInput');
  const keyword = input.value.trim();
  const container = document.getElementById('friendSearchResults');

  if (!keyword) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = '<div class="search-loading">搜索中...</div>';

  try {
    const res = await fetch(`${API_BASE}/api/friend/search?keyword=${encodeURIComponent(keyword)}&player_id=${getCurrentPlayerId()}`, {
      credentials: 'include'
    });
    const result = await res.json();

    if (result.success && result.data.length > 0) {
      friendSearchResults = result.data;
      container.innerHTML = result.data.map(p => `
        <div class="search-result-item">
          <div class="search-result-info">
            <span class="search-result-name">${escapeHtml(p.name)}</span>
            <span class="search-result-meta">Lv.${p.level} · ${p.realm}</span>
            <span class="search-result-online ${p.online ? 'online' : ''}">${p.online ? '🟢 在线' : '⚫ 离线'}</span>
          </div>
          <button class="friend-btn friend-btn-add" onclick="addFriendById(${p.playerId}, '${escapeHtml(p.name)}')">加好友</button>
        </div>
      `).join('');
    } else {
      container.innerHTML = '<div class="search-no-result">未找到玩家 「' + escapeHtml(keyword) + '」</div>';
      friendSearchResults = [];
    }
  } catch (e) {
    container.innerHTML = '<div class="search-no-result">搜索失败，请稍后重试</div>';
  }
}

// ===== 添加好友 =====
async function addFriendById(targetId, targetName) {
  if (!confirm(`确定要向 「${targetName}」 发送好友申请吗？`)) return;

  try {
    const res = await fetch(`${API_BASE}/api/friend/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        player_id: getCurrentPlayerId(),
        targetId: targetId,
        message: ''
      })
    });
    const result = await res.json();

    if (result.success) {
      addLog(`已向 「${targetName}」 发送好友申请`, 'success');
      doFriendSearch();
      loadFriendData();
    } else {
      addLog(result.error || '发送失败', 'error');
    }
  } catch (e) {
    addLog('网络错误，发送失败', 'error');
  }
}

// ===== 接受好友申请 =====
async function acceptFriendRequest(requestId) {
  try {
    const res = await fetch(`${API_BASE}/api/friend/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        player_id: getCurrentPlayerId(),
        requestId: requestId
      })
    });
    const result = await res.json();

    if (result.success) {
      addLog(`已接受好友申请！`, 'success');
      loadFriendData();
    } else {
      addLog(result.error || '接受失败', 'error');
    }
  } catch (e) {
    addLog('网络错误', 'error');
  }
}

// ===== 拒绝好友申请 =====
async function rejectFriendRequest(requestId) {
  try {
    const res = await fetch(`${API_BASE}/api/friend/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        player_id: getCurrentPlayerId(),
        requestId: requestId
      })
    });
    const result = await res.json();

    if (result.success) {
      addLog(`已拒绝好友申请`, 'info');
      loadFriendData();
    } else {
      addLog(result.error || '操作失败', 'error');
    }
  } catch (e) {
    addLog('网络错误', 'error');
  }
}

// ===== 删除好友 =====
async function deleteFriend(friendId, friendName) {
  if (!confirm(`确定要删除好友 「${friendName}」 吗？`)) return;

  try {
    const res = await fetch(`${API_BASE}/api/friend/${friendId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ player_id: getCurrentPlayerId() })
    });
    const result = await res.json();

    if (result.success) {
      addLog(`已删除好友 「${friendName}」`, 'success');
      loadFriendData();
    } else {
      addLog(result.error || '删除失败', 'error');
    }
  } catch (e) {
    addLog('网络错误', 'error');
  }
}

// ===== 拉黑好友 =====
async function blockFriend(friendId, friendName) {
  if (!confirm(`确定要将 「${friendName}」 移至黑名单？\n黑名单中的玩家将不再是您的好友。`)) return;

  try {
    const res = await fetch(`${API_BASE}/api/friend/block`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        player_id: getCurrentPlayerId(),
        targetId: friendId
      })
    });
    const result = await res.json();

    if (result.success) {
      addLog(`已将 「${friendName}」 移至黑名单`, 'success');
      loadFriendData();
    } else {
      addLog(result.error || '操作失败', 'error');
    }
  } catch (e) {
    addLog('网络错误', 'error');
  }
}

// ===== 显示更多菜单 =====
function showFriendMoreMenu(friendId, friendName) {
  const menuHtml = `
  <div class="friend-more-menu" id="friendMoreMenu">
    <div class="more-menu-item" onclick="openFriendChat(${friendId}, '${friendName}')">💬 发起私聊</div>
    <div class="more-menu-item" onclick="showGiftPanel(${friendId}, '${friendName}')">🎁 赠送礼物</div>
    <div class="more-menu-divider"></div>
    <div class="more-menu-item danger" onclick="deleteFriend(${friendId}, '${friendName}')">🗑️ 删除好友</div>
    <div class="more-menu-item danger" onclick="blockFriend(${friendId}, '${friendName}')">🚫 加入黑名单</div>
  </div>`;

  const existing = document.getElementById('friendMoreMenu');
  if (existing) existing.remove();

  document.body.insertAdjacentHTML('beforeend', menuHtml);
  setTimeout(() => {
    document.addEventListener('click', closeFriendMoreMenu, { once: true });
  }, 0);
}

function closeFriendMoreMenu(e) {
  const menu = document.getElementById('friendMoreMenu');
  if (menu && !menu.contains(e.target)) {
    menu.remove();
  }
}

// ===== 好友聊天功能 =====
async function openFriendChat(friendId, friendName) {
  const menu = document.getElementById('friendMoreMenu');
  if (menu) menu.remove();

  currentFriendChat = { friendId, name: friendName };

  // 关闭好友面板，打开聊天面板并切换到私信
  closeModal('friendModal');
  const chatModal = document.getElementById('chatModal');
  if (chatModal) {
    chatModal.classList.add('active');
    loadChatMessages();
  }

  setTimeout(() => {
    switchChatChannel('private');
    selectPrivateChatPartner(friendId, friendName);
  }, 100);
}

// ===== 工具函数 =====
function getCurrentPlayerId() {
  return parseInt(
    window.currentPlayerId ||
    window.currentUserId ||
    window.playerId ||
    window.gameState?.player?.id ||
    1
  );
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';

    return `${d.getMonth() + 1}/${d.getDate()}`;
  } catch {
    return dateStr;
  }
}

// 礼物配置
const GIFT_CONFIG = {
  'stone_10': { name: '10灵石', value: 10, icon: '🪙' },
  'stone_100': { name: '100灵石', value: 100, icon: '💰' },
  'stone_1000': { name: '1000灵石', value: 1000, icon: '💎' },
  'herb': { name: '灵草', value: 50, icon: '🌿' },
  'pill': { name: '丹药', value: 200, icon: '💊' }
};

function showGiftPanel(friendId, friendName) {
  const menu = document.getElementById('friendMoreMenu');
  if (menu) menu.remove();

  const container = document.getElementById('friendContent');
  let html = `
  <div class="friend-gift-panel">
    <div class="gift-header">
      <button class="gift-back-btn" onclick="renderFriendUI()">← 返回</button>
      <div class="gift-title">🎁 选择礼物送给 ${escapeHtml(friendName)}</div>
    </div>
    <div class="gift-list">
  `;

  for (const [id, gift] of Object.entries(GIFT_CONFIG)) {
    html += `
    <div class="gift-item" onclick="sendFriendGift(${friendId}, '${escapeHtml(friendName)}', '${id}')">
      <span class="gift-icon">${gift.icon}</span>
      <span class="gift-name">${gift.name}</span>
      <span class="gift-value">💎 ${gift.value}</span>
    </div>`;
  }

  html += '</div></div>';
  container.innerHTML = html;
}

function sendFriendGift(friendId, friendName, giftId) {
  const gift = GIFT_CONFIG[giftId];
  if (!gift) return;
  addLog(`🎁 已送给 ${friendName} ${gift.name}！`, 'success');
  renderFriendUI();
}

// ===== 导出到全局 =====
window.showFriendPanel = showFriendPanel;
window.switchFriendTab = switchFriendTab;
window.loadFriendData = loadFriendData;
window.doFriendSearch = doFriendSearch;
window.handleFriendSearch = handleFriendSearch;
window.addFriendById = addFriendById;
window.acceptFriendRequest = acceptFriendRequest;
window.rejectFriendRequest = rejectFriendRequest;
window.deleteFriend = deleteFriend;
window.blockFriend = blockFriend;
window.showFriendMoreMenu = showFriendMoreMenu;
window.openFriendChat = openFriendChat;
window.showGiftPanel = showGiftPanel;
window.sendFriendGift = sendFriendGift;
window.renderFriendUI = renderFriendUI;

console.log('👥 好友系统 UI 已加载');
