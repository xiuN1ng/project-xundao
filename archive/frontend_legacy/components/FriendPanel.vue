<template>
  <div class="friend-panel">
    <div class="friend-header">
      <div class="friend-title">👥 好友</div>
      <div class="friend-actions">
        <button class="action-btn" @click="showAddFriend = true">
          ➕ 添加好友
        </button>
      </div>
    </div>
    
    <!-- 好友分类 -->
    <div class="friend-tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.icon }} {{ tab.name }}
        <span class="badge" v-if="getCount(tab.id) > 0">{{ getCount(tab.id) }}</span>
      </button>
    </div>
    
    <!-- 好友列表 -->
    <div class="friend-content">
      <!-- 好友列表 -->
      <div class="friend-list" v-if="activeTab === 'friends'">
        <div 
          v-for="friend in friends" 
          :key="friend.id"
          class="friend-item"
          :class="{ online: friend.online, offline: !friend.online }"
        >
          <div class="friend-avatar">
            <img v-if="friend.avatar" :src="friend.avatar" :alt="friend.name">
            <span v-else class="avatar-placeholder">{{ friend.name.charAt(0) }}</span>
            <span class="online-status" :class="{ online: friend.online }"></span>
          </div>
          <div class="friend-info">
            <div class="friend-name">
              {{ friend.name }}
              <span class="note-name" v-if="friend.note">({{ friend.note }})</span>
            </div>
            <div class="friend-level">{{ friend.level }}级 {{ friend.realm || '练气' }}</div>
          </div>
          <div class="friend-actions">
            <button class="icon-btn" @click="sendMessage(friend)" title="发消息">
              💬
            </button>
            <button class="icon-btn" @click="viewPlayer(friend)" title="查看资料">
              👁️
            </button>
            <button class="icon-btn" @click="showFriendMenu(friend)" title="更多">
              ⋯
            </button>
          </div>
        </div>
        
        <div class="empty-state" v-if="friends.length === 0">
          <span class="empty-icon">👥</span>
          <p>暂无好友</p>
          <button class="add-btn-large" @click="showAddFriend = true">添加好友</button>
        </div>
      </div>
      
      <!-- 申请列表 -->
      <div class="request-list" v-if="activeTab === 'requests'">
        <div 
          v-for="request in friendRequests" 
          :key="request.id"
          class="request-item"
        >
          <div class="request-avatar">
            <span class="avatar-placeholder">{{ request.name.charAt(0) }}</span>
          </div>
          <div class="request-info">
            <div class="request-name">{{ request.name }}</div>
            <div class="request-level">{{ request.level }}级 {{ request.realm || '练气' }}</div>
            <div class="request-time">{{ request.time }}</div>
          </div>
          <div class="request-actions">
            <button class="accept-btn" @click="acceptRequest(request)">接受</button>
            <button class="reject-btn" @click="rejectRequest(request)">拒绝</button>
          </div>
        </div>
        
        <div class="empty-state" v-if="friendRequests.length === 0">
          <span class="empty-icon">📭</span>
          <p>暂无好友申请</p>
        </div>
      </div>
      
      <!-- 黑名单 -->
      <div class="blacklist" v-if="activeTab === 'blacklist'">
        <div 
          v-for="user in blacklist" 
          :key="user.id"
          class="blacklist-item"
        >
          <div class="blacklist-avatar">
            <span class="avatar-placeholder">{{ user.name.charAt(0) }}</span>
          </div>
          <div class="blacklist-info">
            <div class="blacklist-name">{{ user.name }}</div>
          </div>
          <div class="blacklist-actions">
            <button class="remove-btn" @click="removeFromBlacklist(user)">移出</button>
          </div>
        </div>
        
        <div class="empty-state" v-if="blacklist.length === 0">
          <span class="empty-icon">😌</span>
          <p>黑名单为空</p>
        </div>
      </div>
    </div>
    
    <!-- 添加好友弹窗 -->
    <div class="modal-overlay" v-if="showAddFriend" @click="showAddFriend = false">
      <div class="add-friend-dialog" @click.stop>
        <div class="dialog-header">
          <span>添加好友</span>
          <button class="close-btn" @click="showAddFriend = false">×</button>
        </div>
        <div class="dialog-body">
          <input 
            type="text" 
            v-model="searchKeyword" 
            placeholder="输入玩家ID或名字搜索..."
            class="search-input"
          >
          <div class="search-results" v-if="searchResults.length > 0">
            <div 
              v-for="result in searchResults" 
              :key="result.id"
              class="result-item"
              @click="addFriend(result)"
            >
              <div class="result-avatar">
                <span class="avatar-placeholder">{{ result.name.charAt(0) }}</span>
              </div>
              <div class="result-info">
                <div class="result-name">{{ result.name }}</div>
                <div class="result-level">{{ result.level }}级 {{ result.realm || '练气' }}</div>
              </div>
              <button class="add-btn">添加</button>
            </div>
          </div>
          <div class="search-hint" v-else-if="searchKeyword">
            <p>未找到相关玩家</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 好友菜单弹窗 -->
    <div class="modal-overlay" v-if="selectedFriend" @click="selectedFriend = null">
      <div class="friend-menu-dialog" @click.stop>
        <div class="menu-header">
          <div class="menu-avatar">
            <span class="avatar-placeholder">{{ selectedFriend.name.charAt(0) }}</span>
          </div>
          <div class="menu-name">{{ selectedFriend.name }}</div>
        </div>
        <div class="menu-body">
          <button class="menu-item" @click="sendMessage(selectedFriend); selectedFriend = null">
            💬 发消息
          </button>
          <button class="menu-item" @click="viewPlayer(selectedFriend); selectedFriend = null">
            👁️ 查看资料
          </button>
          <button class="menu-item" @click="setNote(selectedFriend)">
            📝 修改备注
          </button>
          <button class="menu-item danger" @click="addToBlacklist(selectedFriend); selectedFriend = null">
            🚫 加入黑名单
          </button>
          <button class="menu-item danger" @click="deleteFriend(selectedFriend); selectedFriend = null">
            ❌ 删除好友
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FriendPanel',
  data() {
    return {
      activeTab: 'friends',
      showAddFriend: false,
      searchKeyword: '',
      selectedFriend: null,
      tabs: [
        { id: 'friends', name: '好友', icon: '👥' },
        { id: 'requests', name: '申请', icon: '📨' },
        { id: 'blacklist', name: '黑名单', icon: '🚫' }
      ],
      friends: [],
      friendRequests: [],
      blacklist: [],
      searchResults: []
    };
  },
  mounted() {
    this.loadFriendData();
  },
  watch: {
    searchKeyword: {
      immediate: false,
      handler(keyword) {
        if (keyword.length >= 1) {
          this.searchPlayers();
        } else {
          this.searchResults = [];
        }
      }
    }
  },
  methods: {
    // 获取当前玩家ID
    getPlayerId() {
      const user = localStorage.getItem('currentUser');
      if (user) {
        try {
          return JSON.parse(user).id;
        } catch (e) {
          return null;
        }
      }
      return null;
    },
    
    // 加载好友数据
    async loadFriendData() {
      const playerId = this.getPlayerId();
      if (!playerId) {
        console.warn('未找到玩家ID');
        return;
      }
      
      this.loading = true;
      try {
        const result = await friendAPI.getList(playerId);
        if (result.success) {
          this.friends = result.data.friends || [];
          this.friendRequests = result.data.pending || [];
          this.blacklist = result.data.blocked || [];
        }
      } catch (err) {
        console.error('加载好友数据失败:', err);
      } finally {
        this.loading = false;
      }
    },
    
    // 搜索玩家
    async searchPlayers() {
      const playerId = this.getPlayerId();
      if (!playerId || !this.searchKeyword) return;
      
      try {
        const result = await friendAPI.search(this.searchKeyword, playerId);
        if (result.success) {
          this.searchResults = result.data || [];
        }
      } catch (err) {
        console.error('搜索玩家失败:', err);
      }
    },
    
    // 格式化时间
    formatTime(timestamp) {
      if (!timestamp) return '';
      const diff = Date.now() - timestamp;
      const minutes = Math.floor(diff / 60000);
      if (minutes < 1) return '刚刚';
      if (minutes < 60) return `${minutes}分钟前`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}小时前`;
      const days = Math.floor(hours / 24);
      return `${days}天前`;
    },
    
    getCount(tab) {
      if (tab === 'friends') return this.friends.length;
      if (tab === 'requests') return this.friendRequests.length;
      if (tab === 'blacklist') return this.blacklist.length;
      return 0;
    },
    
    sendMessage(friend) {
      console.log('Send message to:', friend.name);
    },
    
    viewPlayer(friend) {
      console.log('View player:', friend.name);
    },
    
    showFriendMenu(friend) {
      this.selectedFriend = friend;
    },
    
    async acceptRequest(request) {
      const playerId = this.getPlayerId();
      if (!playerId) return;
      
      try {
        const result = await friendAPI.accept(playerId, request.id);
        if (result.success) {
          this.friends.push({
            ...request,
            addedAt: Date.now(),
            lastInteract: Date.now(),
            online: true
          });
          this.friendRequests = this.friendRequests.filter(r => r.id !== request.id);
        }
      } catch (err) {
        console.error('接受好友申请失败:', err);
      }
    },
    
    async rejectRequest(request) {
      const playerId = this.getPlayerId();
      if (!playerId) return;
      
      try {
        const result = await friendAPI.reject(playerId, request.id);
        if (result.success) {
          this.friendRequests = this.friendRequests.filter(r => r.id !== request.id);
        }
      } catch (err) {
        console.error('拒绝好友申请失败:', err);
      }
    },
    
    async addFriend(result) {
      const playerId = this.getPlayerId();
      if (!playerId) return;
      
      try {
        const addResult = await friendAPI.add(playerId, result.name);
        if (addResult.success) {
          this.friends.push(addResult.data);
          this.searchKeyword = '';
          this.searchResults = [];
        }
      } catch (err) {
        console.error('添加好友失败:', err);
      }
    },
    
    setNote(friend) {
      const note = prompt('请输入备注名:', friend.note || '');
      if (note !== null) {
        friend.note = note;
      }
    },
    
    async addToBlacklist(friend) {
      const playerId = this.getPlayerId();
      if (!playerId) return;
      
      try {
        const result = await friendAPI.block(playerId, friend.id);
        if (result.success) {
          this.blacklist.push({
            id: friend.id,
            name: friend.name,
            blockedAt: Date.now()
          });
          this.friends = this.friends.filter(f => f.id !== friend.id);
        }
      } catch (err) {
        console.error('拉黑好友失败:', err);
      }
    },
    
    async removeFromBlacklist(user) {
      const playerId = this.getPlayerId();
      if (!playerId) return;
      
      try {
        const result = await friendAPI.unblock(playerId, user.id);
        if (result.success) {
          this.blacklist = this.blacklist.filter(b => b.id !== user.id);
        }
      } catch (err) {
        console.error('移出黑名单失败:', err);
      }
    },
    
    async deleteFriend(friend) {
      const playerId = this.getPlayerId();
      if (!playerId) return;
      
      if (confirm(`确定要删除 ${friend.name} 为好友吗?`)) {
        try {
          const result = await friendAPI.remove(playerId, friend.id);
          if (result.success) {
            this.friends = this.friends.filter(f => f.id !== friend.id);
          }
        } catch (err) {
          console.error('删除好友失败:', err);
        }
      }
    }
  }
};
</script>

<style scoped>
.friend-panel {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 12px;
  padding: 20px;
  color: #fff;
  max-height: 80vh;
  overflow-y: auto;
}

.friend-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.friend-title {
  font-size: 24px;
  font-weight: bold;
}

.action-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: #fff;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 12px;
}

.friend-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.tab-btn {
  position: relative;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s;
}

.tab-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: transparent;
}

.badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #ff4757;
  color: #fff;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

.friend-list, .request-list, .blacklist {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.friend-item, .request-item, .blacklist-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  transition: all 0.3s;
}

.friend-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.friend-item.offline {
  opacity: 0.6;
}

.friend-avatar, .request-avatar, .blacklist-avatar {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-placeholder {
  font-size: 20px;
  font-weight: bold;
}

.online-status {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #666;
  border: 2px solid #1a1a2e;
}

.online-status.online {
  background: #4caf50;
}

.friend-info, .request-info, .blacklist-info {
  flex: 1;
}

.friend-name, .request-name, .blacklist-name {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 4px;
}

.note-name {
  color: #aaa;
  font-size: 12px;
  font-weight: normal;
}

.friend-level, .request-level {
  font-size: 12px;
  color: #aaa;
}

.request-time {
  font-size: 11px;
  color: #666;
}

.friend-actions {
  display: flex;
  gap: 4px;
}

.icon-btn {
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.request-actions {
  display: flex;
  gap: 8px;
}

.accept-btn {
  background: #4caf50;
  border: none;
  color: #fff;
  padding: 6px 12px;
  border-radius: 16px;
  cursor: pointer;
  font-size: 12px;
}

.reject-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #fff;
  padding: 6px 12px;
  border-radius: 16px;
  cursor: pointer;
  font-size: 12px;
}

.remove-btn {
  background: #f44336;
  border: none;
  color: #fff;
  padding: 6px 12px;
  border-radius: 16px;
  cursor: pointer;
  font-size: 12px;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 40px;
  color: #aaa;
}

.empty-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
}

.add-btn-large {
  margin-top: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: #fff;
  padding: 12px 24px;
  border-radius: 24px;
  cursor: pointer;
  font-size: 14px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.add-friend-dialog, .friend-menu-dialog {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 24px;
  width: 90%;
  max-width: 400px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  font-size: 18px;
  font-weight: bold;
}

.close-btn {
  background: none;
  border: none;
  color: #fff;
  font-size: 24px;
  cursor: pointer;
}

.search-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  margin-bottom: 16px;
}

.search-input::placeholder {
  color: #aaa;
}

.search-results, .result-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-item {
  flex-direction: row;
  align-items: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.result-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.result-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.result-info {
  flex: 1;
}

.result-name {
  font-size: 14px;
  font-weight: bold;
}

.result-level {
  font-size: 12px;
  color: #aaa;
}

.add-btn {
  background: #4caf50;
  border: none;
  color: #fff;
  padding: 6px 12px;
  border-radius: 16px;
  cursor: pointer;
  font-size: 12px;
}

.search-hint {
  text-align: center;
  color: #aaa;
  padding: 20px;
}

/* Friend Menu */
.menu-header {
  text-align: center;
  margin-bottom: 20px;
}

.menu-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
}

.menu-avatar .avatar-placeholder {
  font-size: 28px;
}

.menu-name {
  font-size: 18px;
  font-weight: bold;
}

.menu-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.menu-item {
  width: 100%;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: none;
  color: #fff;
  border-radius: 12px;
  cursor: pointer;
  font-size: 14px;
  text-align: left;
  transition: all 0.3s;
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.menu-item.danger {
  color: #f44336;
}

.menu-item.danger:hover {
  background: rgba(244, 67, 54, 0.2);
}
</style>
