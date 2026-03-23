<template>
  <div class="friend-recommend-panel">
    <div class="panel-header">
      <h3>好友推荐</h3>
      <button class="close-btn" @click="closePanel">×</button>
    </div>
    
    <div class="panel-content">
      <div class="refresh-bar">
        <span>为你推荐以下玩家</span>
        <button class="refresh-btn" @click="refreshRecommend" :disabled="refreshing">
          <span class="refresh-icon">🔄</span>
          {{ refreshing ? '刷新中...' : '换一批' }}
        </button>
      </div>
      
      <div class="recommend-list" v-if="recommendList.length > 0">
        <div v-for="player in recommendList" :key="player.id" class="recommend-item">
          <div class="player-avatar">
            <span class="avatar-img">{{ player.avatar || '👤' }}</span>
          </div>
          
          <div class="player-info">
            <div class="player-name">{{ player.name }}</div>
            <div class="player-level">境界: {{ player.realm }}</div>
            <div class="player-combat">战力: {{ formatNumber(player.combat) }}</div>
          </div>
          
          <div class="player-actions">
            <button class="add-btn" @click="addFriend(player.id)" :disabled="player.added">
              {{ player.added ? '已添加' : '➕ 添加' }}
            </button>
            <button class="blacklist-btn" @click="addBlacklist(player.id)">
              🚫
            </button>
          </div>
        </div>
      </div>
      
      <div class="empty-state" v-else>
        <span class="empty-icon">👥</span>
        <p>暂无推荐玩家</p>
        <button class="refresh-btn" @click="refreshRecommend">点击刷新</button>
      </div>
      
      <div class="result-message" v-if="resultMessage" :class="resultType">
        {{ resultMessage }}
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FriendRecommendPanel',
  emits: ['close'],
  setup(props, { emit }) {
    const recommendList = ref([]);
    const refreshing = ref(false);
    const resultMessage = ref('');
    const resultType = ref('');
    
    const formatNumber = (num) => {
      if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万';
      }
      return num.toString();
    };
    
    const loadRecommendList = async () => {
      refreshing.value = true;
      resultMessage.value = '';
      
      try {
        const response = await fetch('/api/friend/recommend');
        const data = await response.json();
        
        if (data.success) {
          recommendList.value = data.list || [];
        } else {
          resultMessage.value = data.message || '加载失败';
          resultType.value = 'error';
        }
      } catch (error) {
        resultMessage.value = '加载失败，请稍后重试';
        resultType.value = 'error';
      } finally {
        refreshing.value = false;
      }
    };
    
    const refreshRecommend = async () => {
      await loadRecommendList();
    };
    
    const addFriend = async (playerId) => {
      try {
        const response = await fetch('/api/friend/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId })
        });
        
        const data = await response.json();
        
        if (data.success) {
          resultMessage.value = '添加成功！';
          resultType.value = 'success';
          
          // 更新列表状态
          const player = recommendList.value.find(p => p.id === playerId);
          if (player) {
            player.added = true;
          }
          
          setTimeout(() => {
            resultMessage.value = '';
          }, 2000);
        } else {
          resultMessage.value = data.message || '添加失败';
          resultType.value = 'error';
        }
      } catch (error) {
        resultMessage.value = '添加失败，请稍后重试';
        resultType.value = 'error';
      }
    };
    
    const addBlacklist = async (playerId) => {
      try {
        const response = await fetch('/api/friend/blacklist/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId })
        });
        
        const data = await response.json();
        
        if (data.success) {
          // 从列表中移除
          recommendList.value = recommendList.value.filter(p => p.id !== playerId);
          resultMessage.value = '已加入黑名单';
          resultType.value = 'success';
          
          setTimeout(() => {
            resultMessage.value = '';
          }, 2000);
        }
      } catch (error) {
        console.error('加入黑名单失败:', error);
      }
    };
    
    const closePanel = () => {
      emit('close');
    };
    
    onMounted(() => {
      loadRecommendList();
    });
    
    return {
      recommendList,
      refreshing,
      resultMessage,
      resultType,
      formatNumber,
      refreshRecommend,
      addFriend,
      addBlacklist,
      closePanel
    };
  }
};
</script>

<style scoped>
.friend-recommend-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 420px;
  max-height: 70vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  border: 2px solid #4a5568;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  color: #e2e8f0;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #4a5568;
  background: linear-gradient(90deg, #2d3748 0%, #1a202c 100%);
}

.panel-header h3 {
  margin: 0;
  font-size: 18px;
  color: #f6e05e;
}

.close-btn {
  background: none;
  border: none;
  color: #a0aec0;
  font-size: 24px;
  cursor: pointer;
  transition: color 0.3s;
}

.close-btn:hover {
  color: #fff;
}

.panel-content {
  padding: 20px;
  max-height: calc(70vh - 60px);
  overflow-y: auto;
}

.refresh-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-size: 14px;
  color: #a0aec0;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
}

.refresh-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.refresh-icon {
  display: inline-block;
}

.recommend-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recommend-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #2d3748;
  border-radius: 12px;
  border: 1px solid #4a5568;
}

.player-avatar {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a202c;
  border-radius: 50%;
  font-size: 28px;
}

.player-info {
  flex: 1;
}

.player-name {
  font-size: 15px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 4px;
}

.player-level {
  font-size: 12px;
  color: #a0aec0;
}

.player-combat {
  font-size: 12px;
  color: #f6e05e;
}

.player-actions {
  display: flex;
  gap: 8px;
}

.add-btn {
  padding: 6px 12px;
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.add-btn:hover:not(:disabled) {
  transform: scale(1.05);
}

.add-btn:disabled {
  background: #4a5568;
  cursor: not-allowed;
}

.blacklist-btn {
  padding: 6px 8px;
  background: #4a5568;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.blacklist-btn:hover {
  background: #f56565;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.empty-state p {
  color: #a0aec0;
  margin-bottom: 16px;
}

.result-message {
  margin-top: 16px;
  padding: 12px;
  border-radius: 8px;
  text-align: center;
  font-size: 14px;
}

.result-message.success {
  background: rgba(72, 187, 120, 0.2);
  color: #68d391;
  border: 1px solid #48bb78;
}

.result-message.error {
  background: rgba(245, 101, 101, 0.2);
  color: #fc8181;
  border: 1px solid #f56565;
}
</style>
