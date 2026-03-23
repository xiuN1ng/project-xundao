<template>
  <div class="offline-reward-panel">
    <div class="panel-header">
      <div class="header-title">🎁 离线收益</div>
      <button class="close-btn" @click="closePanel">✕</button>
    </div>
    
    <div class="panel-content">
      <!-- 离线时间显示 -->
      <div class="offline-time-card">
        <div class="time-icon">⏰</div>
        <div class="time-info">
          <div class="time-label">离线时长</div>
          <div class="time-value">{{ offlineHours }}小时 {{ offlineMinutes }}分钟</div>
        </div>
      </div>
      
      <!-- 收益预览 -->
      <div class="reward-preview">
        <div class="preview-title">预估收益</div>
        <div class="preview-items">
          <div class="preview-item">
            <span class="item-icon">✨</span>
            <span class="item-label">经验</span>
            <span class="item-value">+{{ formatNumber(estimatedExp) }}</span>
          </div>
          <div class="preview-item">
            <span class="item-icon">💎</span>
            <span class="item-label">灵石</span>
            <span class="item-value">+{{ formatNumber(estimatedSpiritStones) }}</span>
          </div>
        </div>
        <div class="realm-bonus" v-if="realmBonus > 1">
          境界加成: +{{ Math.round((realmBonus - 1) * 100) }}%
        </div>
      </div>
      
      <!-- 进度条 -->
      <div class="progress-section">
        <div class="progress-label">
          <span>收益进度</span>
          <span>{{ progressPercent }}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <div class="progress-hint">至少离线1分钟可领取</div>
      </div>
      
      <!-- 领取按钮 -->
      <div class="claim-section">
        <button 
          class="claim-btn" 
          :class="{ 'can-claim': canClaim, 'disabled': !canClaim }"
          :disabled="!canClaim"
          @click="claimReward"
        >
          {{ canClaim ? '🎁 领取离线收益' : '⏳ 离线时间不足' }}
        </button>
      </div>
      
      <!-- 收益说明 -->
      <div class="info-section">
        <div class="info-title">📋 收益说明</div>
        <div class="info-content">
          <p>• 离线收益最长计算24小时</p>
          <p>• 收益根据角色等级和境界计算</p>
          <p>• 境界越高，收益加成越多</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'OfflineRewardPanel',
  data() {
    return {
      offlineTime: 0,
      offlineHours: 0,
      offlineMinutes: 0,
      maxTime: 86400000,
      canClaim: false,
      estimatedExp: 0,
      estimatedSpiritStones: 0,
      realmBonus: 1,
      loading: false
    };
  },
  computed: {
    progressPercent() {
      return Math.min(100, Math.round((this.offlineTime / this.maxTime) * 100));
    }
  },
  mounted() {
    this.loadOfflineInfo();
  },
  methods: {
    async loadOfflineInfo() {
      this.loading = true;
      try {
        const playerId = this.$root.playerId || 'player_1';
        const response = await fetch(`/api/offline/info?player_id=${playerId}`);
        const result = await response.json();
        
        if (result.success) {
          const data = result.data;
          this.offlineTime = data.offline_time;
          this.offlineHours = data.offline_hours;
          this.offlineMinutes = data.offline_minutes;
          this.maxTime = data.max_time;
          this.canClaim = data.can_claim;
          this.estimatedExp = data.estimated.exp;
          this.estimatedSpiritStones = data.estimated.spirit_stones;
          this.realmBonus = data.estimated.realm_bonus;
        }
      } catch (error) {
        console.error('加载离线收益信息失败:', error);
      }
      this.loading = false;
    },
    
    async claimReward() {
      if (!this.canClaim || this.loading) return;
      
      this.loading = true;
      try {
        const playerId = this.$root.playerId || 'player_1';
        const response = await fetch('/api/offline/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ player_id: playerId })
        });
        const result = await response.json();
        
        if (result.success) {
          alert(`领取成功！\n经验 +${this.formatNumber(this.estimatedExp)}\n灵石 +${this.formatNumber(this.estimatedSpiritStones)}`);
          // 刷新数据
          this.loadOfflineInfo();
          // 通知主面板刷新
          if (this.$root.refreshPlayerData) {
            this.$root.refreshPlayerData();
          }
        } else {
          alert(result.error || '领取失败');
        }
      } catch (error) {
        console.error('领取离线收益失败:', error);
        alert('领取失败，请重试');
      }
      this.loading = false;
    },
    
    formatNumber(num) {
      if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万';
      }
      return num.toLocaleString();
    },
    
    closePanel() {
      if (this.$root.closePanel) {
        this.$root.closePanel('OfflineRewardPanel');
      }
    }
  }
};
</script>

<style scoped>
.offline-reward-panel {
  width: 100%;
  height: 100%;
  background: linear-gradient(rgba(26, 26, 46, 0.88), rgba(22, 33, 62, 0.92)), url('../assets/bg-offline-cultivation.png') center/cover no-repeat;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  color: #fff;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(90deg, #e94560 0%, #ff6b6b 100%);
}

.header-title {
  font-size: 18px;
  font-weight: bold;
}

.close-btn {
  background: none;
  border: none;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;
}

.panel-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.offline-time-card {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
}

.time-icon {
  font-size: 40px;
  margin-right: 16px;
}

.time-info {
  flex: 1;
}

.time-label {
  font-size: 14px;
  color: #aaa;
  margin-bottom: 4px;
}

.time-value {
  font-size: 24px;
  font-weight: bold;
  color: #ffd700;
}

.reward-preview {
  background: linear-gradient(135deg, rgba(233, 69, 96, 0.2) 0%, rgba(255, 107, 107, 0.2) 100%);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid rgba(233, 69, 96, 0.3);
}

.preview-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 16px;
  text-align: center;
}

.preview-items {
  display: flex;
  justify-content: space-around;
  margin-bottom: 12px;
}

.preview-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.item-icon {
  font-size: 28px;
  margin-bottom: 4px;
}

.item-label {
  font-size: 12px;
  color: #aaa;
  margin-bottom: 4px;
}

.item-value {
  font-size: 18px;
  font-weight: bold;
  color: #4ade80;
}

.realm-bonus {
  text-align: center;
  font-size: 14px;
  color: #fbbf24;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.progress-section {
  margin-bottom: 20px;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  margin-bottom: 8px;
  color: #aaa;
}

.progress-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #e94560 0%, #ff6b6b 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-hint {
  font-size: 12px;
  color: #666;
  text-align: center;
  margin-top: 8px;
}

.claim-section {
  margin-bottom: 20px;
}

.claim-btn {
  width: 100%;
  padding: 16px;
  font-size: 16px;
  font-weight: bold;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.claim-btn.can-claim {
  background: linear-gradient(90deg, #e94560 0%, #ff6b6b 100%);
  color: #fff;
}

.claim-btn.can-claim:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 20px rgba(233, 69, 96, 0.4);
}

.claim-btn.disabled {
  background: #333;
  color: #666;
  cursor: not-allowed;
}

.info-section {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
}

.info-title {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 12px;
  color: #aaa;
}

.info-content p {
  font-size: 13px;
  color: #888;
  margin: 6px 0;
  line-height: 1.5;
}
</style>
