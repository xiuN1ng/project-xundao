<template>
  <div class="friend-panel">
    <h2>👥 好友系统</h2>
    
    <!-- 搜索 -->
    <div class="search-section">
      <input v-model="searchName" placeholder="搜索玩家名称..." />
      <button @click="searchFriend">🔍</button>
    </div>
    
    <!-- 统计 -->
    <div class="friend-stats">
      <div class="stat">
        <span class="value">{{ friends.length }}</span>
        <span class="label">好友</span>
      </div>
      <div class="stat">
        <span class="value">{{ requests.length }}</span>
        <span class="label">申请</span>
      </div>
      <div class="stat">
        <span class="value">{{ blackList.length }}</span>
        <span class="label">黑名单</span>
      </div>
    </div>
    
    <!-- 标签 -->
    <div class="friend-tabs">
      <button :class="{ active: activeTab === 'friends' }" @click="activeTab = 'friends'">
        好友列表
      </button>
      <button :class="{ active: activeTab === 'requests' }" @click="activeTab = 'requests'">
        申请列表
      </button>
      <button :class="{ active: activeTab === 'blacklist' }" @click="activeTab = 'blacklist'">
        黑名单
      </button>
    </div>
    
    <!-- 好友列表 -->
    <div v-if="activeTab === 'friends'" class="friend-list">
      <div v-for="friend in friends" :key="friend.id" class="friend-card">
        <div class="friend-avatar" :class="friend.online ? 'online' : ''">
          {{ friend.name[0] }}
        </div>
        <div class="friend-info">
          <span class="name">{{ friend.name }}</span>
          <span class="status">{{ friend.online ? '在线' : '离线' }}</span>
        </div>
        <div class="friend-actions">
          <button @click="chatWith(friend)" class="chat-btn">💬</button>
          <button @click="sendGift(friend)" class="gift-btn">🎁</button>
        </div>
      </div>
    </div>
    
    <!-- 申请列表 -->
    <div v-if="activeTab === 'requests'" class="request-list">
      <div v-for="req in requests" :key="req.id" class="request-card">
        <div class="req-avatar">{{ req.name[0] }}</div>
        <div class="req-info">
          <span class="name">{{ req.name }}</span>
          <span class="time">{{ req.time }}</span>
        </div>
        <div class="req-actions">
          <button @click="acceptRequest(req)" class="accept-btn">✓</button>
          <button @click="rejectRequest(req)" class="reject-btn">✕</button>
        </div>
      </div>
    </div>
    
    <!-- 黑名单 -->
    <div v-if="activeTab === 'blacklist'" class="blacklist">
      <div v-for="black in blackList" :key="black.id" class="black-card">
        <span>{{ black.name }}</span>
        <button @click="removeBlack(black)">移除</button>
      </div>
    </div>
    
    <!-- 聊天弹窗 -->
    <div v-if="chattingFriend" class="chat-modal" @click.self="chattingFriend = null">
      <div class="chat-content">
        <div class="chat-header">
          <span>{{ chattingFriend.name }}</span>
          <button @click="chattingFriend = null">✕</button>
        </div>
        <div class="chat-messages">
          <div v-for="msg in chatMessages" :key="msg.id" 
               class="message" :class="{ self: msg.from === 'me' }">
            <span>{{ msg.text }}</span>
          </div>
        </div>
        <div class="chat-input">
          <input v-model="chatInput" placeholder="发送消息..." @keyup.enter="sendMessage" />
          <button @click="sendMessage">发送</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const searchName = ref('')
const activeTab = ref('friends')
const chattingFriend = ref(null)
const chatInput = ref('')

const friends = ref([
  { id: 1, name: '剑仙李白', online: true },
  { id: 2, name: '丹帝', online: false },
  { id: 3, name: '阵法师', online: true }
])

const requests = ref([
  { id: 1, name: '新人修士', time: '5分钟前' }
])

const blackList = ref([])

const chatMessages = ref([
  { id: 1, from: 'other', text: '你好！' }
])

function searchFriend() {}
function chatWith(friend) { chattingFriend.value = friend }
function sendGift(friend) {}
function acceptRequest(req) {
  friends.value.push({ id: req.id, name: req.name, online: false })
  requests.value = requests.value.filter(r => r.id !== req.id)
}
function rejectRequest(req) {
  requests.value = requests.value.filter(r => r.id !== req.id)
}
function removeBlack(black) {
  blackList.value = blackList.value.filter(b => b.id !== black.id)
}

function sendMessage() {
  if (!chatInput.value.trim()) return
  chatMessages.value.push({ id: Date.now(), from: 'me', text: chatInput.value })
  chatInput.value = ''
}
</script>

<style scoped>
.friend-panel { padding: 20px; }

h2 { color: #f093fb; font-size: 24px; margin-bottom: 20px; }

/* 搜索 */
.search-section { display: flex; gap: 10px; margin-bottom: 20px; }

.search-section input {
  flex: 1; padding: 15px 20px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 25px; color: #fff;
}

.search-section button {
  width: 50px; background: linear-gradient(135deg, #667eea, #764ba2);
  border: none; border-radius: 50%; color: #fff; cursor: pointer;
}

/* 统计 */
.friend-stats { display: flex; gap: 15px; margin-bottom: 20px; }

.stat {
  flex: 1; text-align: center; padding: 20px;
  background: rgba(255,255,255,0.05); border-radius: 15px;
}

.stat .value { display: block; font-size: 28px; color: #f093fb; font-weight: bold; }
.stat .label { font-size: 12px; opacity: 0.7; }

/* 标签 */
.friend-tabs { display: flex; gap: 10px; margin-bottom: 20px; }

.friend-tabs button {
  flex: 1; padding: 15px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px; color: #fff; cursor: pointer; transition: all 0.3s;
}

.friend-tabs button.active {
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-color: transparent;
}

/* 列表 */
.friend-list, .request-list, .blacklist { display: flex; flex-direction: column; gap: 12px; }

.friend-card, .request-card {
  display: flex; align-items: center; gap: 15px;
  background: rgba(255,255,255,0.05); padding: 18px; border-radius: 15px;
}

.friend-avatar {
  width: 50px; height: 50px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: bold; font-size: 20px;
}

.friend-avatar.online { box-shadow: 0 0 15px rgba(76,175,80,0.5); }

.friend-info { flex: 1; }
.friend-info .name { display: block; color: #fff; font-weight: bold; }
.friend-info .status { font-size: 12px; opacity: 0.7; }

.friend-actions { display: flex; gap: 10px; }

.chat-btn, .gift-btn {
  width: 40px; height: 40px;
  background: rgba(255,255,255,0.1); border: none; border-radius: 50%;
  cursor: pointer; font-size: 18px;
}

.chat-btn:hover { background: #667eea; }
.gift-btn:hover { background: #ffd700; }

.req-actions { display: flex; gap: 10px; }

.accept-btn, .reject-btn {
  width: 35px; height: 35px; border: none; border-radius: 50%;
  cursor: pointer; font-size: 16px;
}

.accept-btn { background: rgba(76,175,80,0.3); color: #4caf50; }
.reject-btn { background: rgba(244,67,54,0.3); color: #f44336; }

.black-card {
  display: flex; justify-content: space-between; align-items: center;
  padding: 15px; background: rgba(244,67,54,0.1); border-radius: 12px;
}

.black-card button {
  padding: 8px 15px;
  background: rgba(244,67,54,0.3); border: none; border-radius: 15px;
  color: #f44336; cursor: pointer;
}

/* 聊天弹窗 */
.chat-modal {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.8); display: flex; align-items: flex-end; justify-content: center;
  z-index: 1000;
}

.chat-content {
  width: 100%; max-width: 500px; height: 70vh;
  background: #1a1a2e; border-radius: 20px 20px 0 0;
  display: flex; flex-direction: column;
}

.chat-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.1);
}

.chat-header button {
  background: none; border: none; color: #fff; font-size: 20px; cursor: pointer;
}

.chat-messages { flex: 1; padding: 20px; overflow-y: auto; }

.message { margin-bottom: 15px; max-width: 70%; }
.message.self { margin-left: auto; text-align: right; }

.message span {
  display: inline-block; padding: 12px 18px;
  background: rgba(255,255,255,0.1); border-radius: 18px; color: #fff;
}

.message.self span { background: #667eea; }

.chat-input {
  display: flex; gap: 10px; padding: 20px;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.chat-input input {
  flex: 1; padding: 15px;
  background: rgba(255,255,255,0.05); border: none; border-radius: 25px; color: #fff;
}

.chat-input button {
  padding: 15px 25px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none; border-radius: 25px; color: #fff; cursor: pointer;
}
</style>
