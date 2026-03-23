<template>
  <div class="paradise-panel" v-if="visible">
    <div class="panel-header">
      <h2>🏞️ 洞天福地</h2>
      <button class="close-btn" @click="close">×</button>
    </div>
    
    <div class="panel-content">
      <!-- 福地资源产出概览 -->
      <div class="paradise-overview">
        <div class="overview-item">
          <span class="overview-icon">⏱️</span>
          <div class="overview-info">
            <span class="overview-label">探索状态</span>
            <span class="overview-value" :class="{ exploring: currentQuest && currentQuest.status === 'exploring' }">
              {{ getExplorationStatus() }}
            </span>
          </div>
        </div>
        <div class="overview-item">
          <span class="overview-icon">📊</span>
          <div class="overview-info">
            <span class="overview-label">总探索次数</span>
            <span class="overview-value">{{ totalExplorations }}</span>
          </div>
        </div>
        <div class="overview-item">
          <span class="overview-icon">⭐</span>
          <div class="overview-info">
            <span class="overview-label">已占领福地</span>
            <span class="overview-value">{{ occupiedLands.length }} / {{ totalLands }}</span>
          </div>
        </div>
      </div>

      <!-- 当前探索任务 -->
      <div class="current-quest-section" v-if="currentQuest">
        <div class="section-title">🔍 当前探索</div>
        <div class="current-quest-card" :class="{ completed: currentQuest.status === 'completed' }">
          <div class="quest-header">
            <span class="quest-icon">{{ getLandIcon(currentQuest.landId) }}</span>
            <div class="quest-info">
              <span class="quest-name">{{ currentQuest.landName }}</span>
              <span class="quest-status" :class="currentQuest.status">
                {{ currentQuest.status === 'exploring' ? '探索中' : '已完成' }}
              </span>
            </div>
            <div class="quest-timer" v-if="currentQuest.status === 'exploring'">
              <span class="timer-value">{{ formatTime(currentQuest.remaining) }}</span>
            </div>
          </div>
          
          <!-- 探索进度 -->
          <div class="quest-progress">
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: currentQuest.progress + '%' }"></div>
            </div>
            <span class="progress-text">{{ currentQuest.progress }}%</span>
          </div>

          <!-- 事件列表 -->
          <div class="quest-events" v-if="currentQuest.events && currentQuest.events.length">
            <div 
              v-for="(event, idx) in currentQuest.events" 
              :key="idx"
              class="event-item"
              :class="{ triggered: event.triggered, resolved: event.resolved }"
            >
              <span class="event-icon">{{ event.icon }}</span>
              <span class="event-name">{{ event.name }}</span>
              <span class="event-status" v-if="event.triggered">✓</span>
            </div>
          </div>

          <!-- 完成按钮 -->
          <div class="quest-actions" v-if="currentQuest.status === 'completed'">
            <button class="claim-btn" @click="claimRewards">
              领取奖励
            </button>
          </div>
        </div>
      </div>

      <!-- 福地列表 -->
      <div class="lands-section">
        <div class="section-title">🗺️ 可探索福地</div>
        <div class="lands-grid">
          <div 
            v-for="land in availableLands" 
            :key="land.id"
            class="land-card"
            :class="{ 
              occupied: isOccupied(land.id),
              locked: !canExplore(land),
              selected: selectedLand === land.id
            }"
            @click="selectLand(land)"
          >
            <div class="land-icon">{{ getLandIcon(land.id) }}</div>
            <div class="land-info">
              <div class="land-name">{{ land.name }}</div>
              <div class="land-desc">{{ land.description }}</div>
              <div class="land-meta">
                <span class="land-realm">境界: {{ land.minRealm }}</span>
                <span class="land-time">⏱️ {{ formatTime(land.explorationTime) }}</span>
              </div>
            </div>
            <div class="land-status">
              <span v-if="isOccupied(land.id)" class="occupied-badge">已占领</span>
              <span v-else-if="!canExplore(land)" class="locked-badge">境界不足</span>
              <span v-else class="available-badge">可探索</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 探索按钮 -->
      <div class="explore-action" v-if="selectedLand && canExplore(selectedLand) && !currentQuest">
        <button class="explore-btn" @click="startExploration">
          <span class="btn-icon">🔍</span>
          <span>开始探索 {{ selectedLand.name }}</span>
        </button>
      </div>

      <!-- 探索历史 -->
      <div class="history-section" v-if="explorationHistory.length">
        <div class="section-title">📜 探索记录</div>
        <div class="history-list">
          <div 
            v-for="(record, idx) in explorationHistory.slice(0, 5)" 
            :key="idx"
            class="history-item"
          >
            <span class="history-icon">{{ getLandIcon(record.landId) }}</span>
            <div class="history-info">
              <span class="history-name">{{ record.landName }}</span>
              <span class="history-time">{{ formatDateTime(record.completedTime) }}</span>
            </div>
            <div class="history-rewards">
              <span class="reward-tag" v-if="record.totalRewards?.spiritStones">💰 {{ formatNumber(record.totalRewards.spiritStones) }}</span>
              <span class="reward-tag" v-if="record.totalRewards?.exp">📈 {{ formatNumber(record.totalRewards.exp) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 提示 -->
      <div class="tips-section">
        <div class="tip-item">💡 福地探索可获得灵石、材料、丹药等奖励</div>
        <div class="tip-item">💡 境界越高，可探索的福地越多</div>
        <div class="tip-item">💡 探索过程中会触发随机事件</div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ParadisePanel',
  data() {
    return {
      visible: false,
      currentQuest: null,
      selectedLand: null,
      totalExplorations: 12,
      occupiedLands: ['spiritual-spring'],
      totalLands: 4,
      
      // 可用福地数据（来自后端）
      availableLands: [
        { 
          id: 'spiritual-spring', 
          name: '灵泉福地', 
          description: '拥有灵泉的洞天福地，灵气充沛',
          minRealm: '金丹期',
          explorationTime: 300,
          icon: '⛲'
        },
        { 
          id: 'ancient-ruins', 
          name: '古遗址', 
          description: '上古修士遗留下来的洞府',
          minRealm: '元婴期',
          explorationTime: 600,
          icon: '🏛️'
        },
        { 
          id: 'immortal-island', 
          name: '仙灵岛', 
          description: '传说中的仙人居所',
          minRealm: '化神期',
          explorationTime: 900,
          icon: '🏝️'
        },
        { 
          id: 'chaos-rift', 
          name: '混沌裂缝', 
          description: '空间裂缝中蕴含的混沌之力',
          minRealm: '炼虚期',
          explorationTime: 1200,
          icon: '🌀'
        }
      ],
      
      // 探索历史
      explorationHistory: [
        {
          landId: 'spiritual-spring',
          landName: '灵泉福地',
          completedTime: Date.now() - 3600000,
          totalRewards: { spiritStones: 520, exp: 1200, materials: 3 }
        },
        {
          landId: 'ancient-ruins',
          landName: '古遗址',
          completedTime: Date.now() - 86400000,
          totalRewards: { spiritStones: 2800, exp: 3500, materials: 8 }
        }
      ],
      
      // 玩家当前境界（模拟）
      playerRealm: '金丹中期',
      playerRealmLevel: 5
    };
  },
  
  methods: {
    show() {
      this.visible = true;
      this.loadParadiseData();
    },
    
    close() {
      this.visible = false;
    },
    
    getExplorationStatus() {
      if (!this.currentQuest) return '空闲';
      if (this.currentQuest.status === 'exploring') return '探索中';
      if (this.currentQuest.status === 'completed') return '待领取';
      return '空闲';
    },
    
    getLandIcon(landId) {
      const icons = {
        'spiritual-spring': '⛲',
        'ancient-ruins': '🏛️',
        'immortal-island': '🏝️',
        'chaos-rift': '🌀',
        '灵泉福地': '⛲',
        '古遗址': '🏛️',
        '仙灵岛': '🏝️',
        '混沌裂缝': '🌀'
      };
      return icons[landId] || '🏞️';
    },
    
    formatTime(seconds) {
      if (!seconds || seconds <= 0) return '00:00';
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },
    
    formatNumber(num) {
      if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万';
      }
      return num.toString();
    },
    
    formatDateTime(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;
      
      if (diff < 3600000) {
        return Math.floor(diff / 60000) + '分钟前';
      } else if (diff < 86400000) {
        return Math.floor(diff / 3600000) + '小时前';
      } else {
        return Math.floor(diff / 86400000) + '天前';
      }
    },
    
    isOccupied(landId) {
      return this.occupiedLands.includes(landId);
    },
    
    canExplore(land) {
      const realmOrder = ['凡人', '炼气期', '筑基期', '金丹期', '元婴期', '化神期', '炼虚期', '合体期', '大乘期', '真仙'];
      const playerIndex = realmOrder.indexOf(this.playerRealm);
      const requiredIndex = realmOrder.indexOf(land.minRealm);
      return playerIndex >= requiredIndex;
    },
    
    selectLand(land) {
      if (!this.canExplore(land)) {
        this.$root.showMessage('境界不足，无法探索', 'error');
        return;
      }
      this.selectedLand = land;
    },
    
    async startExploration() {
      if (!this.selectedLand) {
        this.$root.showMessage('请选择要探索的福地', 'error');
        return;
      }
      
      if (this.currentQuest && this.currentQuest.status === 'exploring') {
        this.$root.showMessage('已有进行中的探索任务', 'error');
        return;
      }
      
      try {
        const response = await fetch('/api/paradise/types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ landId: this.selectedLand.id })
        });
        
        if (response.ok) {
          const data = await response.json();
          this.currentQuest = data.quest;
          this.totalExplorations++;
          this.$root.showMessage(`开始探索${this.selectedLand.name}！`, 'success');
        } else {
          throw new Error('探索失败');
        }
      } catch (e) {
        // 模拟探索开始
        this.currentQuest = {
          id: 'quest_' + Date.now(),
          landId: this.selectedLand.id,
          landName: this.selectedLand.name,
          status: 'exploring',
          startTime: Date.now(),
          endTime: Date.now() + this.selectedLand.explorationTime * 1000,
          remaining: this.selectedLand.explorationTime,
          progress: 0,
          events: [
            { id: 'spiritual-spring', name: '发现灵泉', icon: '⛲', triggered: false },
            { id: 'rare-herb', name: '发现灵草', icon: '🌿', triggered: false },
            { id: 'ancient-ruins', name: '古修士遗迹', icon: '🏛️', triggered: false }
          ]
        };
        this.totalExplorations++;
        this.$root.showMessage(`开始探索${this.selectedLand.name}！`, 'success');
        
        // 启动计时器模拟
        this.startExplorationTimer();
      }
    },
    
    startExplorationTimer() {
      if (this.explorationTimer) {
        clearInterval(this.explorationTimer);
      }
      
      this.explorationTimer = setInterval(() => {
        if (this.currentQuest && this.currentQuest.status === 'exploring') {
          this.currentQuest.remaining--;
          
          // 模拟随机事件触发
          if (Math.random() < 0.05 && this.currentQuest.events) {
            const untriggered = this.currentQuest.events.filter(e => !e.triggered);
            if (untriggered.length > 0) {
              const event = untriggered[Math.floor(Math.random() * untriggered.length)];
              event.triggered = true;
              this.currentQuest.progress = Math.min(100, this.currentQuest.progress + 33);
              this.$root.showMessage(`触发事件：${event.name}！`, 'info');
            }
          }
          
          if (this.currentQuest.remaining <= 0) {
            this.currentQuest.status = 'completed';
            this.currentQuest.canComplete = true;
            this.currentQuest.progress = 100;
            this.$root.showMessage(`${this.currentQuest.landName}探索完成！`, 'success');
            clearInterval(this.explorationTimer);
          }
        }
      }, 1000);
    },
    
    async claimRewards() {
      if (!this.currentQuest || this.currentQuest.status !== 'completed') {
        return;
      }
      
      try {
        const response = await fetch('/api/paradise/claim-reward', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questId: this.currentQuest.id })
        });
        
        if (response.ok) {
          const data = await response.json();
          this.showRewardSummary(data.rewards);
        } else {
          throw new Error('领取失败');
        }
      } catch (e) {
        // 模拟奖励
        const rewards = {
          spiritStones: Math.floor(Math.random() * 500) + 100,
          exp: Math.floor(Math.random() * 1000) + 500,
          materials: Math.floor(Math.random() * 5) + 1
        };
        this.showRewardSummary(rewards);
      }
      
      // 添加到历史
      this.explorationHistory.unshift({
        landId: this.currentQuest.landId,
        landName: this.currentQuest.landName,
        completedTime: Date.now(),
        totalRewards: this.currentQuest.totalRewards || {}
      });
      
      this.currentQuest = null;
    },
    
    showRewardSummary(rewards) {
      let msg = '🎉 探索奖励：';
      if (rewards.spiritStones) msg += `灵石+${this.formatNumber(rewards.spiritStones)} `;
      if (rewards.exp) msg += `经验+${this.formatNumber(rewards.exp)} `;
      if (rewards.materials) msg += `材料+${rewards.materials}`;
      this.$root.showMessage(msg, 'success');
    },
    
    async loadParadiseData() {
      try {
        const response = await fetch('/api/paradise/info');
        if (response.ok) {
          const data = await response.json();
          if (data.currentQuest) {
            this.currentQuest = data.currentQuest;
            if (this.currentQuest.status === 'exploring') {
              this.startExplorationTimer();
            }
          }
          if (data.availableLands) {
            this.availableLands = data.availableLands;
          }
          if (data.history) {
            this.explorationHistory = data.history;
          }
          if (data.totalExplorations !== undefined) {
            this.totalExplorations = data.totalExplorations;
          }
        }
      } catch (e) {
        console.log('使用默认数据');
      }
    }
  },
  
  beforeDestroy() {
    if (this.explorationTimer) {
      clearInterval(this.explorationTimer);
    }
  }
};
</script>

<style scoped>
.paradise-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 580px;
  max-height: 85vh;
  background: linear-gradient(rgba(26, 26, 46, 0.88), rgba(22, 33, 62, 0.92)), url('../assets/bg-art-20260321-200019.png') center/cover no-repeat;
  border: 2px solid #00ffff;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 255, 255, 0.15);
  z-index: 1000;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(90deg, #00b894, #00cec9);
  color: white;
}

.panel-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: bold;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 28px;
  cursor: pointer;
  line-height: 1;
  transition: transform 0.2s;
}

.close-btn:hover {
  transform: rotate(90deg);
}

.panel-content {
  padding: 16px;
  max-height: 75vh;
  overflow-y: auto;
}

/* 概览区域 */
.paradise-overview {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  background: rgba(0, 255, 255, 0.08);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 12px;
  margin-bottom: 16px;
}

.overview-item {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.overview-icon {
  font-size: 24px;
}

.overview-info {
  display: flex;
  flex-direction: column;
}

.overview-label {
  font-size: 11px;
  color: #8b9dc3;
}

.overview-value {
  font-size: 15px;
  color: #00cec9;
  font-weight: bold;
}

.overview-value.exploring {
  color: #ffd700;
  animation: pulse 1.5s infinite;
}

/* 区域标题 */
.section-title {
  font-size: 14px;
  color: #00cec9;
  font-weight: bold;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(0, 255, 255, 0.2);
}

/* 当前探索 */
.current-quest-section {
  margin-bottom: 16px;
}

.current-quest-card {
  background: rgba(0, 255, 255, 0.05);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 12px;
  padding: 14px;
  transition: all 0.3s;
}

.current-quest-card.completed {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.08);
}

.quest-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.quest-icon {
  font-size: 36px;
}

.quest-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.quest-name {
  font-size: 16px;
  color: white;
  font-weight: bold;
}

.quest-status {
  font-size: 12px;
  color: #8b9dc3;
}

.quest-status.exploring {
  color: #ffd700;
}

.quest-status.completed {
  color: #00cec9;
}

.quest-timer {
  text-align: right;
}

.timer-value {
  font-size: 20px;
  color: #ffd700;
  font-weight: bold;
  font-family: monospace;
}

.quest-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.progress-track {
  flex: 1;
  height: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00cec9, #00ffff);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: #00cec9;
  font-weight: bold;
  min-width: 40px;
}

/* 事件列表 */
.quest-events {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.event-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  font-size: 12px;
  color: #8b9dc3;
  transition: all 0.3s;
}

.event-item.triggered {
  background: rgba(0, 255, 255, 0.15);
  color: #00cec9;
}

.event-icon {
  font-size: 14px;
}

.event-status {
  color: #ffd700;
  font-weight: bold;
}

/* 领取按钮 */
.quest-actions {
  display: flex;
  justify-content: center;
}

.claim-btn {
  padding: 10px 30px;
  background: linear-gradient(135deg, #ffd700, #f39c12);
  border: none;
  border-radius: 8px;
  color: #1a1a2e;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.claim-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
}

/* 福地网格 */
.lands-section {
  margin-bottom: 16px;
}

.lands-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.land-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.land-card:hover:not(.locked) {
  background: rgba(0, 255, 255, 0.08);
  border-color: rgba(0, 255, 255, 0.3);
  transform: translateY(-2px);
}

.land-card.selected {
  background: rgba(0, 255, 255, 0.12);
  border-color: #00cec9;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.2);
}

.land-card.occupied {
  border-color: rgba(255, 215, 0, 0.4);
  background: rgba(255, 215, 0, 0.05);
}

.land-card.locked {
  opacity: 0.5;
  cursor: not-allowed;
}

.land-icon {
  font-size: 36px;
  min-width: 50px;
  text-align: center;
}

.land-info {
  flex: 1;
}

.land-name {
  font-size: 15px;
  color: white;
  font-weight: bold;
  margin-bottom: 4px;
}

.land-desc {
  font-size: 12px;
  color: #8b9dc3;
  margin-bottom: 6px;
}

.land-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: #666;
}

.land-realm {
  color: #a29bfe;
}

.land-status {
  min-width: 80px;
  text-align: right;
}

.occupied-badge {
  color: #ffd700;
  font-size: 12px;
  font-weight: bold;
}

.locked-badge {
  color: #e74c3c;
  font-size: 12px;
}

.available-badge {
  color: #00cec9;
  font-size: 12px;
}

/* 探索按钮 */
.explore-action {
  margin-bottom: 16px;
}

.explore-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #00b894, #00cec9);
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.explore-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 206, 201, 0.4);
}

.btn-icon {
  font-size: 18px;
}

/* 历史记录 */
.history-section {
  margin-bottom: 16px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  transition: background 0.2s;
}

.history-item:hover {
  background: rgba(0, 0, 0, 0.3);
}

.history-icon {
  font-size: 24px;
}

.history-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.history-name {
  font-size: 13px;
  color: white;
}

.history-time {
  font-size: 11px;
  color: #666;
}

.history-rewards {
  display: flex;
  gap: 8px;
}

.reward-tag {
  font-size: 11px;
  padding: 3px 8px;
  background: rgba(255, 215, 0, 0.15);
  border-radius: 4px;
  color: #ffd700;
}

/* 提示 */
.tips-section {
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  margin-top: 16px;
}

.tip-item {
  font-size: 12px;
  color: #8b9dc3;
  margin-bottom: 6px;
  line-height: 1.4;
}

.tip-item:last-child {
  margin-bottom: 0;
}

/* 动画 */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* 滚动条 */
.panel-content::-webkit-scrollbar {
  width: 6px;
}

.panel-content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb {
  background: #00cec9;
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: #00ffff;
}

/* 响应式 */
@media (max-width: 600px) {
  .paradise-panel {
    width: 95%;
    max-height: 90vh;
  }
  
  .paradise-overview {
    flex-direction: column;
    gap: 10px;
  }
  
  .land-card {
    flex-wrap: wrap;
  }
  
  .land-status {
    width: 100%;
    text-align: left;
    margin-top: 8px;
  }
}
</style>
