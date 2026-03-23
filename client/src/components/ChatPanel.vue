<template>
  <div class="chat-panel">
    <div class="chat-header">
      <div class="chat-tabs">
        <button 
          v-for="tab in chatTabs" 
          :key="tab.id"
          class="chat-tab"
          :class="{ active: activeTab === tab.id }"
          @click="switchTab(tab.id)"
        >
          {{ tab.icon }} {{ tab.name }}
        </button>
      </div>
      <div class="chat-header-actions">
        <button class="settings-btn" @click="showChatSettings">⚙️</button>
      </div>
    </div>
    
    <!-- 频道信息 -->
    <div class="channel-info" v-if="activeTab === 'world'">
      <span class="channel-icon">🌍</span>
      <span class="channel-name">世界频道</span>
      <span class="channel-count">在线 {{ onlineCount }} 人</span>
    </div>
    <div class="channel-info" v-if="activeTab === 'sect'">
      <span class="channel-icon">🏛️</span>
      <span class="channel-name">宗门频道</span>
      <span class="channel-count">{{ sectMemberCount }} 成员</span>
    </div>
    <div class="channel-info" v-if="activeTab === 'private'">
      <span class="channel-icon">💌</span>
      <span class="channel-name">私聊</span>
    </div>
    
    <!-- 消息列表 -->
    <div class="chat-messages" ref="messagesContainer">
      <div 
        v-for="(msg, index) in filteredMessages" 
        :key="index"
        class="message"
        :class="{ 'own-message': msg.isOwn, 'system-message': msg.type === 'system' }"
      >
        <div class="message-avatar" v-if="msg.type !== 'system'">
          {{ msg.avatar }}
        </div>
        <div class="message-content">
          <div class="message-header" v-if="msg.type !== 'system'">
            <span class="message-sender" :class="'level-' + (msg.level || 1)">{{ msg.sender }}</span>
            <span class="message-level" v-if="msg.level">Lv.{{ msg.level }}</span>
            <span class="message-time">{{ msg.time }}</span>
          </div>
          <div class="message-body" :class="'text-' + msg.type">
            <span v-if="msg.type === 'system'" class="system-badge">系统</span>
            {{ msg.content }}
          </div>
          <div class="message-actions" v-if="msg.type !== 'system'">
            <button @click="replyTo(msg)" class="action-icon">回复</button>
          </div>
        </div>
      </div>
      
      <!-- 空状态 -->
      <div class="empty-state" v-if="filteredMessages.length === 0">
        <div class="empty-icon">💬</div>
        <div class="empty-text">暂无消息</div>
      </div>
    </div>
    
    <!-- 快捷表情 -->
    <div class="quick-emotes" v-if="showEmotes">
      <button 
        v-for="emoji in quickEmojis" 
        :key="emoji"
        class="emote-btn"
        @click="addEmote(emoji)"
      >
        {{ emoji }}
      </button>
    </div>
    
    <!-- 输入区域 -->
    <div class="chat-input-area">
      <div class="input-actions">
        <button class="emote-toggle" @click="toggleEmotes">
          😊
        </button>
        <button class="emoji-toggle" @click="addEmoji('🎰')">
          🎰
        </button>
      </div>
      <input 
        type="text" 
        class="chat-input"
        v-model="inputMessage"
        :placeholder="inputPlaceholder"
        @keyup.enter="sendMessage"
        ref="chatInput"
      >
      <button 
        class="send-btn"
        :disabled="!inputMessage.trim()"
        @click="sendMessage"
      >
        发送
      </button>
    </div>
    
    <!-- 私聊选择 -->
    <div class="private-chat-select" v-if="activeTab === 'private' && !currentPrivateChat">
      <div class="select-title">选择聊天对象</div>
      <div class="friend-list">
        <div 
          v-for="friend in friendsList" 
          :key="friend.id"
          class="friend-item"
          @click="startPrivateChat(friend)"
        >
          <span class="friend-avatar">{{ friend.avatar }}</span>
          <span class="friend-name">{{ friend.name }}</span>
          <span class="friend-status" :class="friend.online ? 'online' : 'offline'">
            {{ friend.online ? '在线' : '离线' }}
          </span>
        </div>
        <div class="empty-friends" v-if="friendsList.length === 0">
          暂无好友
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const { ref, computed, nextTick, onMounted } = Vue;

export default {
  name: 'ChatPanel',
  emits: ['close'],
  setup(props, { emit }) {
    const activeTab = ref('world');
    const inputMessage = ref('');
    const showEmotes = ref(false);
    const messagesContainer = ref(null);
    const chatInput = ref(null);
    const currentPrivateChat = ref(null);
    const onlineCount = ref(1234);
    const sectMemberCount = ref(50);
    
    const chatTabs = [
      { id: 'world', name: '世界', icon: '🌍' },
      { id: 'sect', name: '宗门', icon: '🏛️' },
      { id: 'private', name: '私聊', icon: '💌' },
    ];
    
    const quickEmojis = ['👍', '❤️', '😂', '🎉', '🔥', '💪', '🙏', '😢'];
    
    // 模拟消息数据
    const messages = ref([
      { type: 'world', sender: '修仙大师', avatar: '🧘', level: 50, content: '新人求带副本~', time: '12:30', isOwn: false },
      { type: 'world', sender: '剑仙李白', avatar: '⚔️', level: 45, content: '组队刷洞天福地，来人！', time: '12:31', isOwn: false },
      { type: 'system', sender: '系统', avatar: '📢', content: '欢迎来到挂机修仙世界！', time: '12:00', isOwn: false },
      { type: 'world', sender: '丹炉小童', avatar: '🔮', level: 30, content: '出售丹药，便宜实惠！', time: '12:32', isOwn: false },
      { type: 'sect', sender: '宗主', avatar: '👑', level: 60, content: '宗门任务已刷新，速来完成！', time: '12:25', isOwn: false },
      { type: 'sect', sender: '长老甲', avatar: '�道教', level: 40, content: '来宗门大殿领取奖励', time: '12:28', isOwn: false },
    ]);
    
    // 好友列表
    const friendsList = ref([
      { id: 1, name: '小明', avatar: '👦', online: true },
      { id: 2, name: '小红', avatar: '👧', online: false },
      { id: 3, name: '老王', avatar: '👨', online: true },
    ]);
    
    const filteredMessages = computed(() => {
      if (activeTab.value === 'private') {
        if (currentPrivateChat.value) {
          // 私聊消息筛选
          return messages.value.filter(m => 
            m.type === 'private' && 
            (m.sender === currentPrivateChat.value.name || m.isOwn)
          );
        }
        return [];
      }
      return messages.value.filter(m => m.type === activeTab.value);
    });
    
    const inputPlaceholder = computed(() => {
      if (activeTab.value === 'world') return '发送消息到世界频道...';
      if (activeTab.value === 'sect') return '发送消息到宗门频道...';
      if (activeTab.value === 'private' && currentPrivateChat.value) {
        return `对 ${currentPrivateChat.value.name} 说...`;
      }
      return '选择聊天对象...';
    });
    
    const switchTab = (tabId) => {
      activeTab.value = tabId;
      currentPrivateChat.value = null;
      scrollToBottom();
    };
    
    const toggleEmotes = () => {
      showEmotes.value = !showEmotes.value;
    };
    
    const addEmote = (emoji) => {
      inputMessage.value += emoji;
      showEmotes.value = false;
      chatInput.value?.focus();
    };
    
    const addEmoji = (emoji) => {
      inputMessage.value += emoji;
      chatInput.value?.focus();
    };
    
    const sendMessage = () => {
      if (!inputMessage.value.trim()) return;
      
      const newMessage = {
        type: activeTab.value,
        sender: '我',
        avatar: '😀',
        level: 1,
        content: inputMessage.value.trim(),
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        isOwn: true
      };
      
      // 如果是私聊，添加目标信息
      if (activeTab.value === 'private' && currentPrivateChat.value) {
        newMessage.target = currentPrivateChat.value.name;
      }
      
      messages.value.push(newMessage);
      inputMessage.value = '';
      
      nextTick(() => {
        scrollToBottom();
      });
    };
    
    const replyTo = (msg) => {
      if (msg.sender === '我') return;
      inputMessage.value = `回复 ${msg.sender}: `;
      chatInput.value?.focus();
    };
    
    const startPrivateChat = (friend) => {
      currentPrivateChat.value = friend;
      // 添加模拟私聊消息
      messages.value.push({
        type: 'private',
        sender: friend.name,
        avatar: friend.avatar,
        level: 20,
        content: '你好呀！',
        time: '12:20',
        isOwn: false
      });
      scrollToBottom();
    };
    
    const showChatSettings = () => {
      console.log('显示聊天设置');
    };
    
    const scrollToBottom = () => {
      nextTick(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
        }
      });
    };
    
    onMounted(() => {
      scrollToBottom();
    });
    
    return {
      activeTab,
      chatTabs,
      inputMessage,
      showEmotes,
      messagesContainer,
      chatInput,
      currentPrivateChat,
      onlineCount,
      sectMemberCount,
      quickEmojis,
      filteredMessages,
      friendsList,
      inputPlaceholder,
      switchTab,
      toggleEmotes,
      addEmote,
      addEmoji,
      sendMessage,
      replyTo,
      startPrivateChat,
      showChatSettings
    };
  }
};
</script>

<style scoped>
.chat-panel {
  width: 400px;
  height: 550px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  color: #fff;
  overflow: hidden;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.chat-tabs {
  display: flex;
  gap: 5px;
}

.chat-tab {
  padding: 6px 12px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #888;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.chat-tab:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.chat-tab.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.settings-btn {
  background: transparent;
  border: none;
  font-size: 16px;
  cursor: pointer;
  opacity: 0.7;
}

.settings-btn:hover {
  opacity: 1;
}

.channel-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 15px;
  background: rgba(0, 0, 0, 0.2);
  font-size: 12px;
}

.channel-icon {
  font-size: 16px;
}

.channel-name {
  font-weight: bold;
}

.channel-count {
  color: #888;
  margin-left: auto;
}

/* 消息列表 */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 10px 15px;
}

.message {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.message-sender {
  font-weight: bold;
  font-size: 13px;
}

.message-sender.level-1 { color: #888; }
.message-sender.level-10 { color: #4ade80; }
.message-sender.level-30 { color: #60a5fa; }
.message-sender.level-50 { color: #a78bfa; }
.message-sender.level-60 { color: #fbbf24; }

.message-level {
  font-size: 10px;
  color: #888;
  background: rgba(255, 255, 255, 0.1);
  padding: 1px 4px;
  border-radius: 3px;
}

.message-time {
  font-size: 10px;
  color: #666;
  margin-left: auto;
}

.message-body {
  font-size: 13px;
  line-height: 1.4;
  word-break: break-word;
}

.message-body.text-system {
  color: #fbbf24;
  font-style: italic;
}

.message-actions {
  margin-top: 4px;
}

.action-icon {
  background: transparent;
  border: none;
  color: #666;
  font-size: 11px;
  cursor: pointer;
  padding: 2px 6px;
}

.action-icon:hover {
  color: #fff;
}

.own-message {
  flex-direction: row-reverse;
}

.own-message .message-content {
  text-align: right;
}

.own-message .message-header {
  flex-direction: row-reverse;
}

.system-message {
  justify-content: center;
}

.system-message .message-avatar {
  width: 24px;
  height: 24px;
  font-size: 14px;
}

.system-badge {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 10px;
  margin-right: 6px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #666;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 10px;
  opacity: 0.5;
}

/* 快捷表情 */
.quick-emotes {
  display: flex;
  gap: 5px;
  padding: 8px 15px;
  background: rgba(0, 0, 0, 0.2);
  overflow-x: auto;
}

.emote-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 16px;
  cursor: pointer;
  transition: transform 0.2s;
}

.emote-btn:hover {
  transform: scale(1.2);
  background: rgba(255, 255, 255, 0.2);
}

/* 输入区域 */
.chat-input-area {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.input-actions {
  display: flex;
  gap: 5px;
}

.emote-toggle, .emoji-toggle {
  background: transparent;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.emote-toggle:hover, .emoji-toggle:hover {
  opacity: 1;
}

.chat-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 8px 15px;
  color: #fff;
  font-size: 13px;
}

.chat-input::placeholder {
  color: #666;
}

.chat-input:focus {
  outline: none;
  border-color: #667eea;
}

.send-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 20px;
  padding: 8px 16px;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  transition: transform 0.2s;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.05);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 私聊选择 */
.private-chat-select {
  padding: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.select-title {
  font-size: 12px;
  color: #888;
  margin-bottom: 10px;
}

.friend-list {
  max-height: 150px;
  overflow-y: auto;
}

.friend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.friend-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.friend-avatar {
  font-size: 20px;
}

.friend-name {
  flex: 1;
  font-size: 13px;
}

.friend-status {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 3px;
}

.friend-status.online {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

.friend-status.offline {
  background: rgba(136, 136, 136, 0.2);
  color: #888;
}

.empty-friends {
  text-align: center;
  color: #666;
  padding: 20px;
  font-size: 12px;
}
</style>
