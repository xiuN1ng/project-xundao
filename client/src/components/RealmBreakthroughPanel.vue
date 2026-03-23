<template>
  <div class="realm-breakthrough-panel">
    <div class="panel-header">
      <div class="panel-title">🚀 境界突破</div>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>
    
    <!-- 当前境界 -->
    <div class="current-realm-section">
      <div class="realm-icon">{{ currentRealm.icon }}</div>
      <div class="realm-info">
        <div class="realm-name">{{ currentRealm.name }}</div>
        <div class="realm-level">第 {{ currentRealm.level }} 层</div>
      </div>
      <div class="realm-status" :class="{ 'ready': canBreakthrough }">
        {{ canBreakthrough ? '🎉 可突破!' : '⏳ 修炼中' }}
      </div>
    </div>
    
    <!-- 境界进度 -->
    <div class="realm-progress-section">
      <div class="progress-header">
        <span>灵气进度</span>
        <span class="progress-value">{{ spiritProgress }} / {{ spiritRequired }}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
      <div class="progress-hint" v-if="!canBreakthrough">
        还需要 {{ spiritRequired - spiritProgress }} 灵气即可突破
      </div>
    </div>
    
    <!-- 下一境界预览 -->
    <div class="next-realm-section" v-if="nextRealm">
      <div class="section-title">📖 下一境界</div>
      <div class="next-realm-card">
        <div class="next-realm-icon">{{ nextRealm.icon }}</div>
        <div class="next-realm-info">
          <div class="next-realm-name">{{ nextRealm.name }}</div>
          <div class="next-realm-desc">{{ nextRealm.description }}</div>
        </div>
      </div>
      
      <!-- 突破条件 -->
      <div class="breakthrough-conditions">
        <div class="condition-title">突破条件</div>
        <div class="condition-item" :class="{ met: conditions.spirit >= conditions.spiritRequired }">
          <span class="condition-icon">💎</span>
          <span class="condition-label">灵气</span>
          <span class="condition-value">{{ conditions.spirit }} / {{ conditions.spiritRequired }}</span>
          <span class="condition-status">{{ conditions.spirit >= conditions.spiritRequired ? '✅' : '❌' }}</span>
        </div>
        <div class="condition-item" :class="{ met: conditions.spiritCap >= conditions.spiritCapRequired }">
          <span class="condition-icon">🔮</span>
          <span class="condition-label">灵气上限</span>
          <span class="condition-value">{{ conditions.spiritCap }} / {{ conditions.spiritCapRequired }}</span>
          <span class="condition-status">{{ conditions.spiritCap >= conditions.spiritCapRequired ? '✅' : '❌' }}</span>
        </div>
        <div class="condition-item" :class="{ met: conditions.realmItem }">
          <span class="condition-icon">🎯</span>
          <span class="condition-label">突破丹</span>
          <span class="condition-value">{{ conditions.realmItem ? '已准备' : '未准备' }}</span>
          <span class="condition-status">{{ conditions.realmItem ? '✅' : '❌' }}</span>
        </div>
      </div>
      
      <!-- 突破奖励 -->
      <div class="breakthrough-rewards">
        <div class="rewards-title">🎁 突破奖励</div>
        <div class="rewards-list">
          <div class="reward-item" v-for="(reward, idx) in nextRealm.rewards" :key="idx">
            <span class="reward-icon">{{ reward.icon }}</span>
            <span class="reward-name">{{ reward.name }}</span>
            <span class="reward-amount">+{{ reward.amount }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 已达最高境界 -->
    <div class="max-realm-section" v-else>
      <div class="max-realm-icon">🏆</div>
      <div class="max-realm-text">已达最高境界!</div>
      <div class="max-realm-hint">继续修炼，冲击更高的层次</div>
    </div>
    
    <!-- 突破按钮 -->
    <div class="breakthrough-action">
      <button 
        class="breakthrough-btn" 
        :class="{ 'ready': canBreakthrough }"
        :disabled="!canBreakthrough"
        @click="handleBreakthrough"
      >
        <span v-if="canBreakthrough">🚀 开始突破</span>
        <span v-else>⏳ 条件不足</span>
      </button>
      
      <div class="breakthrough-hint" v-if="!canBreakthrough">
        集齐所有突破条件即可突破
      </div>
    </div>
    
    <!-- 境界历史 -->
    <div class="realm-history">
      <div class="history-title">📜 境界历程</div>
      <div class="history-list">
        <div 
          v-for="(realm, idx) in realmHistory" 
          :key="idx" 
          class="history-item"
          :class="{ 'current': idx === 0 }"
        >
          <span class="history-icon">{{ realm.icon }}</span>
          <span class="history-name">{{ realm.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'RealmBreakthroughPanel',
  data() {
    return {
      currentRealm: {
        name: '筑基期',
        level: 3,
        icon: '🧘'
      },
      nextRealm: {
        name: '金丹期',
        icon: '⚡',
        description: '凝聚金丹，灵气化液，实力飞跃',
        rewards: [
          { icon: '💰', name: '灵石', amount: 50000 },
          { icon: '⚔️', name: '攻击力', amount: 50 },
          { icon: '🛡️', name: '防御力', amount: 30 }
        ]
      },
      spiritProgress: 8500,
      spiritRequired: 10000,
      conditions: {
        spirit: 8500,
        spiritRequired: 10000,
        spiritCap: 12000,
        spiritCapRequired: 10000,
        realmItem: false
      },
      realmHistory: [
        { name: '筑基期', icon: '🧘' },
        { name: '练气期', icon: '🌬️' },
        { name: '凡人', icon: '🧑' }
      ]
    };
  },
  computed: {
    canBreakthrough() {
      return this.conditions.spirit >= this.conditions.spiritRequired &&
             this.conditions.spiritCap >= this.conditions.spiritCapRequired &&
             this.conditions.realmItem;
    },
    progressPercent() {
      return Math.min(100, (this.spiritProgress / this.spiritRequired) * 100);
    }
  },
  methods: {
    handleBreakthrough() {
      if (this.canBreakthrough) {
        console.log('开始境界突破...');
        // 触发突破逻辑
        this.$emit('breakthrough', {
          currentRealm: this.currentRealm,
          nextRealm: this.nextRealm
        });
      }
    }
  }
};
</script>

<style scoped>
.realm-breakthrough-panel {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 24px;
  color: #fff;
  max-height: 85vh;
  overflow-y: auto;
  min-width: 400px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.panel-title {
  font-size: 22px;
  font-weight: bold;
  background: linear-gradient(135deg, #ffd700, #ff9900);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.close-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #fff;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: rotate(90deg);
}

/* 当前境界 */
.current-realm-section {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  margin-bottom: 20px;
}

.realm-icon {
  font-size: 48px;
}

.realm-info {
  flex: 1;
}

.realm-name {
  font-size: 24px;
  font-weight: bold;
  color: #ffd700;
}

.realm-level {
  font-size: 14px;
  color: #aaa;
  margin-top: 4px;
}

.realm-status {
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.1);
}

.realm-status.ready {
  background: linear-gradient(135deg, #00c853, #00e676);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

/* 进度条 */
.realm-progress-section {
  margin-bottom: 20px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.progress-value {
  color: #ffd700;
}

.progress-bar {
  height: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #ffd700 100%);
  transition: width 0.5s ease;
}

.progress-hint {
  font-size: 12px;
  color: #888;
  margin-top: 8px;
  text-align: center;
}

/* 下一境界 */
.next-realm-section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 12px;
  color: #aaa;
}

.next-realm-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 153, 0, 0.1) 100%);
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 12px;
  margin-bottom: 16px;
}

.next-realm-icon {
  font-size: 36px;
}

.next-realm-name {
  font-size: 20px;
  font-weight: bold;
  color: #ffd700;
}

.next-realm-desc {
  font-size: 12px;
  color: #aaa;
  margin-top: 4px;
}

/* 突破条件 */
.breakthrough-conditions {
  margin-bottom: 16px;
}

.condition-title {
  font-size: 14px;
  color: #aaa;
  margin-bottom: 8px;
}

.condition-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  margin-bottom: 8px;
  border-left: 3px solid #ff4757;
}

.condition-item.met {
  border-left-color: #00c853;
  background: rgba(0, 200, 83, 0.1);
}

.condition-icon {
  font-size: 16px;
}

.condition-label {
  flex: 1;
  font-size: 13px;
}

.condition-value {
  font-size: 13px;
  color: #aaa;
}

.condition-status {
  font-size: 14px;
}

/* 突破奖励 */
.breakthrough-rewards {
  margin-bottom: 20px;
}

.rewards-title {
  font-size: 14px;
  color: #aaa;
  margin-bottom: 8px;
}

.rewards-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.reward-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(255, 215, 0, 0.1);
  border-radius: 8px;
  font-size: 12px;
}

.reward-icon {
  font-size: 14px;
}

.reward-name {
  color: #aaa;
}

.reward-amount {
  color: #ffd700;
  font-weight: bold;
}

/* 最高境界 */
.max-realm-section {
  text-align: center;
  padding: 40px 20px;
  background: rgba(255, 215, 0, 0.1);
  border-radius: 12px;
  margin-bottom: 20px;
}

.max-realm-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.max-realm-text {
  font-size: 24px;
  font-weight: bold;
  color: #ffd700;
  margin-bottom: 8px;
}

.max-realm-hint {
  font-size: 14px;
  color: #aaa;
}

/* 突破按钮 */
.breakthrough-action {
  text-align: center;
  margin-bottom: 20px;
}

.breakthrough-btn {
  width: 100%;
  padding: 16px 32px;
  font-size: 18px;
  font-weight: bold;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.1);
  color: #aaa;
  transition: all 0.3s;
}

.breakthrough-btn.ready {
  background: linear-gradient(135deg, #ffd700, #ff9900);
  color: #333;
  animation: btnPulse 1.5s ease-in-out infinite;
}

@keyframes btnPulse {
  0%, 100% { box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3); }
  50% { box-shadow: 0 4px 25px rgba(255, 215, 0, 0.6); }
}

.breakthrough-btn:disabled {
  cursor: not-allowed;
}

.breakthrough-hint {
  font-size: 12px;
  color: #888;
  margin-top: 8px;
}

/* 境界历史 */
.realm-history {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 20px;
}

.history-title {
  font-size: 14px;
  color: #aaa;
  margin-bottom: 12px;
}

.history-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  font-size: 12px;
  color: #666;
}

.history-item.current {
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
}

.history-icon {
  font-size: 14px;
}
</style>
