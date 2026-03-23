<template>
  <div class="transfer-power-panel">
    <div class="panel-header">
      <h3>🔮 传功双修</h3>
      <button class="close-btn" @click="closePanel">×</button>
    </div>
    
    <div class="panel-content">
      <!-- 传功模式选择 -->
      <div class="mode-tabs">
        <button 
          :class="['tab-btn', { active: mode === 'master' }]"
          @click="mode = 'master'"
        >
          👨‍🏫 传功
        </button>
        <button 
          :class="['tab-btn', { active: mode === 'couple' }]"
          @click="mode = 'couple'"
        >
          💑 双修
        </button>
      </div>
      
      <!-- 传功模式 -->
      <div v-if="mode === 'master'" class="mode-content">
        <div class="partner-info">
          <div class="info-card">
            <div class="avatar-section">
              <div class="avatar master-avatar">师</div>
            </div>
            <div class="info-details">
              <h4>师父</h4>
              <p class="level">境界: {{ masterInfo.level }}</p>
              <p class="power">可传授经验: {{ formatNumber(masterInfo.exp) }}</p>
            </div>
          </div>
          
          <div class="transfer-arrow">⬇️</div>
          
          <div class="info-card">
            <div class="avatar-section">
              <div class="avatar disciple-avatar">徒</div>
            </div>
            <div class="info-details">
              <h4>徒弟</h4>
              <p class="level">境界: {{ discipleInfo.level }}</p>
              <p class="power">当前经验: {{ formatNumber(discipleInfo.exp) }}</p>
            </div>
          </div>
        </div>
        
        <div class="transfer-controls">
          <div class="amount-slider">
            <label>传授比例</label>
            <input 
              type="range" 
              min="10" 
              max="100" 
              step="10"
              v-model="transferRatio"
              @input="updatePreview"
            >
            <span class="ratio-value">{{ transferRatio }}%</span>
          </div>
          
          <div class="preview-box">
            <p>预计传授经验: <span class="highlight">{{ formatNumber(previewExp) }}</span></p>
          </div>
          
          <button 
            class="action-btn transfer-btn"
            :disabled="!canTransfer"
            @click="startTransfer"
          >
            开始传功
          </button>
        </div>
      </div>
      
      <!-- 双修模式 -->
      <div v-if="mode === 'couple'" class="mode-content">
        <div class="couple-info">
          <div class="couple-avatars">
            <div class="avatar player-avatar">{{ player1.avatar }}</div>
            <div class="heart-animation">❤️</div>
            <div class="avatar partner-avatar">{{ player2.avatar }}</div>
          </div>
          
          <div class="couple-stats">
            <div class="stat-item">
              <span class="stat-label">你的经验+</span>
              <span class="stat-value">+{{ formatNumber(sharedExp) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">对方经验+</span>
              <span class="stat-value">+{{ formatNumber(sharedExp) }}</span>
            </div>
          </div>
        </div>
        
        <div class="couple-controls">
          <div class="duration-select">
            <label>双修时长</label>
            <div class="duration-buttons">
              <button 
                v-for="d in durations" 
                :key="d.value"
                :class="['duration-btn', { active: duration === d.value }]"
                @click="duration = d.value"
              >
                {{ d.label }}
              </button>
            </div>
          </div>
          
          <button 
            class="action-btn couple-btn"
            :disabled="!canCouple"
            @click="startCouplePractice"
          >
            开始双修
          </button>
        </div>
        
        <!-- 双修加成效果 -->
        <div class="bonus-effects">
          <h4>双修加成</h4>
          <div class="effect-list">
            <div class="effect-item">
              <span>经验获取</span>
              <span class="bonus">+50%</span>
            </div>
            <div class="effect-item">
              <span>灵气回复</span>
              <span class="bonus">+30%</span>
            </div>
            <div class="effect-item">
              <span>悟性加成</span>
              <span class="bonus">+20%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 传功进度 -->
    <div v-if="isTransferring" class="transfer-progress">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>
      <p>传功中... {{ progress }}%</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TransferPowerPanel',
  emits: ['close'],
  data() {
    return {
      mode: 'master',
      transferRatio: 50,
      previewExp: 0,
      progress: 0,
      isTransferring: false,
      duration: 30,
      durations: [
        { value: 10, label: '10分钟' },
        { value: 30, label: '30分钟' },
        { value: 60, label: '1小时' },
        { value: 120, label: '2小时' }
      ],
      masterInfo: {
        level: '化神期',
        exp: 1000000
      },
      discipleInfo: {
        level: '元婴期',
        exp: 500000
      },
      player1: { avatar: '👨' },
      player2: { avatar: '👩' },
      sharedExp: 5000
    };
  },
  computed: {
    canTransfer() {
      return this.masterInfo.exp > 0 && !this.isTransferring;
    },
    canCouple() {
      return !this.isTransferring;
    }
  },
  mounted() {
    this.loadPartnerData();
  },
  methods: {
    closePanel() {
      this.$emit('close');
    },
    formatNumber(num) {
      if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万';
      }
      return num.toString();
    },
    loadPartnerData() {
      // 模拟数据，实际应从服务器获取
    },
    updatePreview() {
      this.previewExp = Math.floor(this.masterInfo.exp * (this.transferRatio / 100));
    },
    startTransfer() {
      if (!this.canTransfer) return;
      
      this.isTransferring = true;
      this.progress = 0;
      
      const interval = setInterval(() => {
        this.progress += 10;
        if (this.progress >= 100) {
          clearInterval(interval);
          this.completeTransfer();
        }
      }, 500);
    },
    completeTransfer() {
      // 发送传功请求到服务器
      this.isTransferring = false;
      this.$emit('close');
    },
    startCouplePractice() {
      if (!this.canCouple) return;
      
      this.isTransferring = true;
      this.progress = 0;
      
      const interval = setInterval(() => {
        this.progress += 5;
        if (this.progress >= 100) {
          clearInterval(interval);
          this.completeCouple();
        }
      }, 500);
    },
    completeCouple() {
      this.isTransferring = false;
      this.$emit('close');
    }
  }
};
</script>

<style scoped>
.transfer-power-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 480px;
  background: linear-gradient(145deg, #1a1a2e, #16213e);
  border-radius: 16px;
  border: 2px solid #9f7aea;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  color: #e2e8f0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #4a5568;
  background: linear-gradient(90deg, #553c9a, #44337a);
  border-radius: 14px 14px 0 0;
}

.panel-header h3 {
  margin: 0;
  font-size: 18px;
  color: #fbbf24;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.close-btn {
  background: none;
  border: none;
  color: #a0aec0;
  font-size: 28px;
  cursor: pointer;
  line-height: 1;
}

.close-btn:hover {
  color: #fc8181;
}

.panel-content {
  padding: 20px;
}

.mode-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.tab-btn {
  flex: 1;
  padding: 12px;
  border: 2px solid #4a5568;
  border-radius: 10px;
  background: #2d3748;
  color: #a0aec0;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.tab-btn.active {
  border-color: #9f7aea;
  background: linear-gradient(145deg, #805ad5, #6b46c1);
  color: #fff;
}

.partner-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(45, 55, 72, 0.8);
  border-radius: 12px;
  border: 1px solid #4a5568;
}

.avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
}

.master-avatar {
  background: linear-gradient(145deg, #ed8936, #dd6b20);
}

.disciple-avatar {
  background: linear-gradient(145deg, #48bb78, #38a169);
}

.info-details h4 {
  margin: 0 0 6px 0;
  color: #fbbf24;
}

.info-details p {
  margin: 4px 0;
  font-size: 14px;
  color: #a0aec0;
}

.transfer-arrow {
  text-align: center;
  font-size: 24px;
}

.transfer-controls {
  margin-top: 20px;
}

.amount-slider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.amount-slider label {
  min-width: 80px;
  color: #a0aec0;
}

.amount-slider input[type="range"] {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: #4a5568;
  outline: none;
}

.ratio-value {
  min-width: 50px;
  text-align: right;
  color: #9f7aea;
  font-weight: bold;
}

.preview-box {
  padding: 12px;
  background: rgba(159, 122, 234, 0.2);
  border-radius: 8px;
  margin-bottom: 16px;
  text-align: center;
}

.preview-box .highlight {
  color: #9f7aea;
  font-weight: bold;
  font-size: 18px;
}

.action-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.transfer-btn {
  background: linear-gradient(145deg, #ed8936, #dd6b20);
  color: #fff;
}

.transfer-btn:hover:not(:disabled) {
  box-shadow: 0 4px 15px rgba(237, 137, 54, 0.4);
}

.transfer-btn:disabled {
  background: #4a5568;
  cursor: not-allowed;
}

/* 双修模式样式 */
.couple-info {
  text-align: center;
  margin-bottom: 20px;
}

.couple-avatars {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 16px;
}

.couple-avatars .avatar {
  width: 70px;
  height: 70px;
  font-size: 32px;
}

.heart-animation {
  font-size: 28px;
  animation: heartbeat 1s infinite;
}

@keyframes heartbeat {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.couple-stats {
  display: flex;
  justify-content: center;
  gap: 30px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 12px;
  color: #a0aec0;
}

.stat-value {
  font-size: 18px;
  color: #48bb78;
  font-weight: bold;
}

.couple-controls {
  margin-bottom: 20px;
}

.duration-select label {
  display: block;
  margin-bottom: 10px;
  color: #a0aec0;
}

.duration-buttons {
  display: flex;
  gap: 8px;
}

.duration-btn {
  flex: 1;
  padding: 8px;
  border: 2px solid #4a5568;
  border-radius: 8px;
  background: #2d3748;
  color: #a0aec0;
  cursor: pointer;
  transition: all 0.2s;
}

.duration-btn.active {
  border-color: #ed64a6;
  background: linear-gradient(145deg, #ed64a6, #d53f8c);
  color: #fff;
}

.couple-btn {
  margin-top: 16px;
  background: linear-gradient(145deg, #ed64a6, #d53f8c);
  color: #fff;
}

.couple-btn:hover:not(:disabled) {
  box-shadow: 0 4px 15px rgba(237, 100, 166, 0.4);
}

.bonus-effects {
  padding: 16px;
  background: rgba(72, 187, 120, 0.1);
  border-radius: 10px;
  border: 1px solid #48bb78;
}

.bonus-effects h4 {
  margin: 0 0 12px 0;
  color: #48bb78;
}

.effect-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.effect-item {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.effect-item .bonus {
  color: #48bb78;
  font-weight: bold;
}

.transfer-progress {
  padding: 20px;
  border-top: 1px solid #4a5568;
  text-align: center;
}

.progress-bar {
  height: 10px;
  background: #2d3748;
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #9f7aea, #ed64a6);
  transition: width 0.5s;
}
</style>
