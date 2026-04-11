let currentChatChannel = 'world';
let chatLastId = { world: 0, sect: 0, private: 0 };
let chatPollInterval = null;

// 打开聊天弹窗
function openChatModal() {
  const modal = document.getElementById('chatModal');
  if (!modal) {
    addLog('聊天面板未找到', 'error');
    return;
  }
  
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  
  // 加载消息
  loadChatMessages();
  
  // 开始轮询新消息
  if (chatPollInterval) clearInterval(chatPollInterval);
  chatPollInterval = setInterval(loadChatMessages, 3000);
  
  // 聚焦输入框
  setTimeout(() => {
    const input = document.getElementById('chatMessageInput');
    if (input) input.focus();
  }, 100);
}

// 关闭聊天弹窗
function closeChatModal() {
  const modal = document.getElementById('chatModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
  if (chatPollInterval) {
    clearInterval(chatPollInterval);
    chatPollInterval = null;
  }
}

// 切换聊天频道
function switchChatChannel(channel) {
  currentChatChannel = channel;
  
  // 更新标签样式
  document.querySelectorAll('.chat-tab-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.channel === channel) {
      btn.classList.add('active');
    }
  });
  
  // 显示/隐藏私信收件人选择
  const privateSelect = document.getElementById('privateReceiverSelect');
  if (privateSelect) {
    privateSelect.style.display = channel === 'private' ? 'block' : 'none';
  }
  
  // 重置最后消息ID
  chatLastId[channel] = 0;
  
  // 加载新频道消息
  loadChatMessages();
}

// 加载聊天消息
async function loadChatMessages() {
  const messagesContainer = document.getElementById('chatMessages');
  if (!messagesContainer) return;
  
  const state = game.getState ? game.getState() : window.gameState;
  const playerId = state?.player?.id || state?.player?.player_id || 1;
  const username = state?.player?.username || '修仙者';
  
  try {
    const url = `/api/chat/messages?channel=${currentChatChannel}&last_id=${chatLastId[currentChatChannel]}&player_id=${playerId}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.success && data.messages && data.messages.length > 0) {
      chatLastId[currentChatChannel] = data.messages[data.messages.length - 1].id;
      
      // 如果是第一页，显示所有消息；否则追加新消息
      if (chatLastId[currentChatChannel] === data.messages[data.messages.length - 1].id) {
        renderChatMessages(data.messages);
      } else {
        appendChatMessages(data.messages);
      }
    } else if (chatLastId[currentChatChannel] === 0) {
      messagesContainer.innerHTML = '<div class="chat-empty">暂无消息，快来发送第一条吧！</div>';
    }
  } catch (err) {
    console.error('加载聊天消息失败:', err);
    if (chatLastId[currentChatChannel] === 0) {
      messagesContainer.innerHTML = '<div class="chat-empty">加载失败，请稍后重试</div>';
    }
  }
}

// 渲染聊天消息（第一页）
function renderChatMessages(messages) {
  const container = document.getElementById('chatMessages');
  if (!container) return;
  
  if (!messages || messages.length === 0) {
    container.innerHTML = '<div class="chat-empty">暂无消息，快来发送第一条吧！</div>';
    return;
  }
  
  container.innerHTML = messages.map(msg => createChatMessageHTML(msg)).join('');
  container.scrollTop = container.scrollHeight;
}

// 追加聊天消息（新消息）
function appendChatMessages(messages) {
  const container = document.getElementById('chatMessages');
  if (!container || !messages || messages.length === 0) return;
  
  // 移除"暂无消息"提示
  const emptyMsg = container.querySelector('.chat-empty');
  if (emptyMsg) emptyMsg.remove();
  
  container.innerHTML += messages.map(msg => createChatMessageHTML(msg)).join('');
  container.scrollTop = container.scrollHeight;
}

// 创建单条消息HTML
function createChatMessageHTML(msg) {
  const time = new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const channelClass = currentChatChannel === 'private' ? 'private' : (currentChatChannel === 'sect' ? 'sect' : '');
  const receiverInfo = msg.receiver_name ? `<div class="chat-receiver-info">发送给: ${msg.receiver_name}</div>` : '';
  
  return `
    <div class="chat-message ${channelClass}">
      <div class="chat-message-header">
        <span class="chat-sender">${escapeHtml(msg.sender_name)}</span>
        <span class="chat-time">${time}</span>
      </div>
      <div class="chat-text">${escapeHtml(msg.message)}</div>
      ${receiverInfo}
    </div>
  `;
}

// HTML转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 发送聊天消息
async function sendChatMessage() {
  const input = document.getElementById('chatMessageInput');
  const message = input.value.trim();
  
  if (!message) {
    showToast('请输入消息内容', 'warning');
    return;
  }
  
  const state = game.getState ? game.getState() : window.gameState;
  const playerId = state?.player?.id || state?.player?.player_id || 1;
  const username = state?.player?.username || '修仙者';
  
  let receiverId = null;
  let receiverName = null;
  
  if (currentChatChannel === 'private') {
    const receiverSelect = document.getElementById('privateReceiver');
    if (!receiverSelect || !receiverSelect.value) {
      showToast('请选择收件人', 'warning');
      return;
    }
    receiverId = receiverSelect.value;
    receiverName = receiverSelect.options[receiverSelect.selectedIndex].text;
  }
  
  try {
    const response = await fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: currentChatChannel,
        player_id: playerId,
        username: username,
        message: message,
        receiver_id: receiverId,
        receiver_name: receiverName
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      input.value = '';
      // 立即刷新消息
      chatLastId[currentChatChannel] = 0;
      loadChatMessages();
      showToast('发送成功', 'success');
    } else {
      showToast(data.error || '发送失败', 'error');
    }
  } catch (err) {
    console.error('发送消息失败:', err);
    showToast('发送失败，请稍后重试', 'error');
  }
}

// 键盘发送
function handleChatKeyPress(event) {
  if (event.key === 'Enter') {
    sendChatMessage();
  }
}

// 加载私信收件人列表
async function loadPrivateReceivers() {
  try {
    const response = await fetch('/api/chat/online');
    const data = await response.json();
    
    const select = document.getElementById('privateReceiver');
    if (!select) return;
    
    const state = game.getState ? game.getState() : window.gameState;
    const currentPlayerId = state?.player?.id || state?.player?.player_id || 1;
    
    // 保留第一个默认选项
    select.innerHTML = '<option value="">选择收件人...</option>';
    
    if (data.players) {
      data.players.forEach(player => {
        if (player.id != currentPlayerId) {
          const option = document.createElement('option');
          option.value = player.id;
          option.textContent = `${player.username} (Lv.${player.level} ${getRealmName(player.realm_level || 1)})`;
          select.appendChild(option);
        }
      });
    }
  } catch (err) {
    console.error('加载收件人列表失败:', err);
  }
}

// 获取境界名称
function getRealmName(level) {
  const realms = ['凡人', '练气', '筑基', '金丹', '元婴', '化神', '炼虚', '合体', '大乘', '渡劫', '仙人'];
  return realms[Math.min(level - 1, realms.length - 1)] || '凡人';
}

// 打开聊天弹窗（带初始化）
function openChatModal() {
  const modal = document.getElementById('chatModal');
  if (!modal) {
    addLog('聊天面板未找到', 'error');
    return;
  }
  
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  
  // 加载私信收件人列表
  loadPrivateReceivers();
  
  // 加载消息
  loadChatMessages();
  
  // 开始轮询新消息
  if (chatPollInterval) clearInterval(chatPollInterval);
  chatPollInterval = setInterval(loadChatMessages, 3000);
  
  // 聚焦输入框
  setTimeout(() => {
    const input = document.getElementById('chatMessageInput');
    if (input) input.focus();
  }, 100);
}

// ===== 好友聊天集成 =====
// 从好友列表直接发起私聊
function selectPrivateChatPartner(friendId, friendName) {
  const select = document.getElementById('privateReceiver');
  if (!select) {
    showToast('私信选择器未找到', 'error');
    return;
  }

  // 如果下拉选项中不存在该好友，动态添加
  let exists = false;
  for (let i = 0; i < select.options.length; i++) {
    if (parseInt(select.options[i].value) === friendId) {
      exists = true;
      break;
    }
  }

  if (!exists) {
    const option = document.createElement('option');
    option.value = friendId;
    option.textContent = `${friendName} (好友)`;
    select.appendChild(option);
  }

  select.value = friendId;
  // 触发变更以加载与该好友的私聊历史
  chatLastId['private'] = 0;
  loadChatMessages();

  showToast(`正在与 ${friendName} 私聊`, 'info');
}
