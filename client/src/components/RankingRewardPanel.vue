<template>
  <div class="ranking-reward-panel">
    <div class="panel-header">
      <h3>排行奖励</h3>
      <button class="close-btn" @click="closePanel">×</button>
    </div>
    
    <div class="panel-content">
      <div class="ranking-tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          class="tab-btn"
          :class="{ active: activeTab === tab.id }"
          @click="switchTab(tab.id)"
        >
          {{ tab.name }}
        </button>
      </div>
      
      <div class="reward-info">
        <div class="current-rank" v-if="currentRank">
          <span class="rank-label">当前排名</span>
          <span class="rank-value" :class="getRankClass(currentRank)">第 {{ currentRank }} 名</span>
        </div>
        
        <div class="reward-preview" v-if="currentReward">
          <h4>本次奖励</h4>
          <div class="reward-items">
            <div v-for="(item, index) in currentReward.items" :key="index" class="reward-item">
              <span class="item-icon">{{ item.icon }}</span>
              <span class="item-name">{{ item.name }}</span>
              <span class="item-count">x{{ item.count }}</span>
            </div>
          </div>
        </div>
        
        <div class="reward-tiers">
          <h4>排名奖励</h4>
          <div class="tier-list">
            <div v-for="tier in rewardTiers" :key="tier.rank" class="tier-item" :class="{ 'my-tier': tier.rank === currentRank }">
              <div class="tier-rank">
                <span v-if="tier.start === tier.end">第 {{ tier.start }} 名</span>
                <span v-else>第 {{ tier.start }}-{{ tier.end }} 名</span>
              </div>
              <div class="tier-rewards">
                <span v-for="(item, idx) in tier.items" :key="idx" class="tier-item-name">
                  {{ item.icon }} {{ item.name }}x{{ item.count }}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="countdown" v-if="nextRewardTime">
          <span>距离下次奖励发放还有:</span>
          <span class="countdown-time">{{ countdown }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'RankingRewardPanel',
  emits: ['close'],
  setup(props, { emit }) {
    const activeTab = ref('combat');
    const currentRank = ref(0);
    const currentReward = ref(null);
    const rewardTiers = ref([]);
    const nextRewardTime = ref(null);
    const countdown = ref('');
    
    const tabs = [
      { id: 'combat', name: '战力榜' },
      { id: 'level', name: '等级榜' },
      { id: 'rich', name: '财富榜' }
    ];
    
    const getRankClass = (rank) => {
      if (rank <= 3) return `rank-top-${rank}`;
      return '';
    };
    
    const switchTab = async (tabId) => {
      activeTab.value = tabId;
      await loadRankingData(tabId);
    };
    
    const loadRankingData = async (type) => {
      try {
        const response = await fetch(`/api/ranking/${type}/reward`);
        const data = await response.json();
        
        if (data.success) {
          currentRank.value = data.currentRank || 0;
          currentReward.value = data.currentReward;
          rewardTiers.value = data.tiers || [];
          nextRewardTime.value = data.nextRewardTime;
        }
      } catch (error) {
        console.error('加载排行奖励失败:', error);
      }
    };
    
    const updateCountdown = () => {
      if (!nextRewardTime.value) return;
      
      const now = Date.now();
      const diff = nextRewardTime.value - now;
      
      if (diff <= 0) {
        countdown.value = '即将发放';
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      countdown.value = `${hours}小时${minutes}分${seconds}秒`;
    };
    
    const closePanel = () => {
      emit('close');
    };
    
    onMounted(() => {
      loadRankingData(activeTab.value);
      setInterval(updateCountdown, 1000);
    });
    
    return {
      tabs,
      activeTab,
      currentRank,
      currentReward,
      rewardTiers,
      nextRewardTime,
      countdown,
      getRankClass,
      switchTab,
      closePanel
    };
  }
};
</script>

<style scoped>
.ranking-reward-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 450px;
  max-height: 80vh;
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
  max-height: calc(80vh - 60px);
  overflow-y: auto;
}

.ranking-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.tab-btn {
  flex: 1;
  padding: 10px;
  background: #2d3748;
  border: 1px solid #4a5568;
  border-radius: 8px;
  color: #a0aec0;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.tab-btn:hover {
  background: #4a5568;
}

.tab-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: #667eea;
  color: #fff;
}

.current-rank {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
  border-radius: 12px;
  margin-bottom: 16px;
}

.rank-label {
  font-size: 14px;
  color: #a0aec0;
}

.rank-value {
  font-size: 24px;
  font-weight: bold;
}

.rank-top-1 { color: #ffd700; }
.rank-top-2 { color: #c0c0c0; }
.rank-top-3 { color: #cd7f32; }

.reward-preview {
  padding: 16px;
  background: rgba(102, 126, 234, 0.1);
  border: 1px solid #667eea;
  border-radius: 12px;
  margin-bottom: 16px;
}

.reward-preview h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #667eea;
}

.reward-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reward-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-icon {
  font-size: 20px;
}

.item-name {
  flex: 1;
  font-size: 14px;
}

.item-count {
  color: #f6e05e;
  font-weight: bold;
}

.reward-tiers h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #cbd5e0;
}

.tier-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tier-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #2d3748;
  border-radius: 8px;
  border: 1px solid #4a5568;
}

.tier-item.my-tier {
  border-color: #f6e05e;
  background: rgba(246, 224, 94, 0.1);
}

.tier-rank {
  font-size: 14px;
  font-weight: bold;
  color: #f6e05e;
}

.tier-rewards {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tier-item-name {
  font-size: 12px;
  color: #a0aec0;
}

.countdown {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding: 12px;
  background: #2d3748;
  border-radius: 8px;
  font-size: 14px;
  color: #a0aec0;
}

.countdown-time {
  color: #f56565;
  font-weight: bold;
}
</style>
