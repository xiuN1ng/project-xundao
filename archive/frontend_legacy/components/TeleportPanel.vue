<template>
  <div class="teleport-panel">
    <div class="panel-header">
      <h2>🗺️ 传送系统</h2>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>
    
    <div class="panel-content">
      <!-- 当前所在位置 -->
      <div class="current-location">
        <div class="location-icon">📍</div>
        <div class="location-info">
          <div class="location-name">{{ currentLocation.name }}</div>
          <div class="location-desc">{{ currentLocation.description }}</div>
        </div>
      </div>
      
      <!-- 传送卷轴背包 -->
      <div class="teleport-items">
        <h4>传送卷轴</h4>
        <div class="items-grid">
          <div 
            v-for="item in teleportItems" 
            :key="item.id"
            class="item-card"
            :class="{ selected: selectedItem && selectedItem.id === item.id }"
            @click="selectItem(item)"
          >
            <div class="item-icon">{{ item.icon }}</div>
            <div class="item-name">{{ item.name }}</div>
            <div class="item-count">x{{ item.count }}</div>
          </div>
        </div>
      </div>
      
      <!-- 目的地选择 -->
      <div class="destination-selector" v-if="selectedItem">
        <h4>选择目的地</h4>
        <div class="destinations-list">
          <div 
            v-for="dest in availableDestinations" 
            :key="dest.id"
            class="destination-card"
            :class="{ 
              selected: selectedDestination && selectedDestination.id === dest.id,
              locked: !dest.unlocked
            }"
            @click="selectDestination(dest)"
          >
            <div class="dest-icon">{{ dest.icon }}</div>
            <div class="dest-info">
              <div class="dest-name">{{ dest.name }}</div>
              <div class="dest-region">{{ dest.region }}</div>
              <div class="dest-desc">{{ dest.description }}</div>
              <div class="dest-cost" v-if="dest.unlocked">
                消耗: {{ dest.cost }} {{ dest.currencyType }}
              </div>
              <div class="dest-requirement" v-else>
                条件: {{ dest.requirement }}
              </div>
            </div>
            <div class="dest-check" v-if="selectedDestination && selectedDestination.id === dest.id">
              ✓
            </div>
          </div>
        </div>
      </div>
      
      <!-- 最近传送 -->
      <div class="recent-teleports">
        <h4>最近传送</h4>
        <div class="recent-list">
          <div 
            v-for="record in recentTeleports" 
            :key="record.id"
            class="recent-item"
            @click="quickTeleport(record)"
          >
            <span class="recent-icon">{{ record.icon }}</span>
            <span class="recent-name">{{ record.name }}</span>
            <span class="recent-time">{{ record.time }}</span>
          </div>
          <div v-if="recentTeleports.length === 0" class="empty-tip">
            暂无传送记录
          </div>
        </div>
      </div>
      
      <!-- 快速传送 -->
      <div class="quick-teleport">
        <h4>常用地点</h4>
        <div class="quick-grid">
          <button 
            v-for="place in quickPlaces" 
            :key="place.id"
            class="quick-btn"
            @click="quickTeleport(place)"
          >
            <span class="quick-icon">{{ place.icon }}</span>
            <span class="quick-name">{{ place.name }}</span>
          </button>
        </div>
      </div>
      
      <!-- 传送确认 -->
      <div class="teleport-confirm" v-if="selectedDestination">
        <div class="confirm-info">
          <div class="confirm-route">
            {{ currentLocation.name }} → {{ selectedDestination.name }}
          </div>
          <div class="confirm-cost">
            消耗: {{ selectedItem.cost }} {{ selectedDestination.currencyType }}
          </div>
        </div>
        <button class="teleport-btn" @click="confirmTeleport">
          开始传送
        </button>
      </div>
    </div>
    
    <!-- 传送动画 -->
    <div class="teleport-animation" v-if="isTeleporting">
      <div class="teleport-effect">
        <div class="circle-outer"></div>
        <div class="circle-middle"></div>
        <div class="circle-inner"></div>
        <div class="teleport-text">传送中...</div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TeleportPanel',
  data() {
    return {
      currentLocation: {
        id: 'starting_zone',
        name: '青云镇',
        description: '新手出生的村落'
      },
      selectedItem: null,
      selectedDestination: null,
      isTeleporting: false,
      teleportItems: [
        { id: 'scroll_1', name: '回城卷', icon: '🏠', count: 10, cost: 1 },
        { id: 'scroll_2', name: '随机卷', icon: '🎲', count: 5, cost: 1 },
        { id: 'scroll_3', name: '定向卷', icon: '📜', count: 3, cost: 1 }
      ],
      availableDestinations: [
        { 
          id: 'dest_1', 
          name: '青云镇', 
          icon: '🏘️', 
          region: '新手区',
          description: '安全的出生地',
          cost: 0,
          currencyType: '灵石',
          unlocked: true 
        },
        { 
          id: 'dest_2', 
          name: '青云山', 
          icon: '⛰️', 
          region: '练气区',
          description: '修炼者们聚集的山峰',
          cost: 10,
          currencyType: '灵石',
          unlocked: true 
        },
        { 
          id: 'dest_3', 
          name: '玄冰洞', 
          icon: '🧊', 
          region: '结丹区',
          description: '极寒之地',
          cost: 50,
          currencyType: '灵石',
          unlocked: true 
        },
        { 
          id: 'dest_4', 
          name: '烈焰谷', 
          icon: '🌋', 
          region: '元婴区',
          description: '炽热之地',
          cost: 100,
          currencyType: '灵石',
          requirement: '需要元婴境界',
          unlocked: false 
        },
        { 
          id: 'dest_5', 
          name: '万妖山', 
          icon: '🏔️', 
          region: '化神区',
          description: '妖族的领地',
          cost: 200,
          currencyType: '灵石',
          requirement: '需要化神境界',
          unlocked: false 
        },
        { 
          id: 'dest_6', 
          name: '仙魔战场', 
          icon: '⚔️', 
          region: '大乘区',
          description: '仙魔大战的遗迹',
          cost: 500,
          currencyType: '灵石',
          requirement: '需要大乘境界',
          unlocked: false 
        }
      ],
      recentTeleports: [
        { id: 'recent_1', name: '青云山', icon: '⛰️', time: '5分钟前' },
        { id: 'recent_2', name: '玄冰洞', icon: '🧊', time: '30分钟前' }
      ],
      quickPlaces: [
        { id: 'quick_1', name: '主城', icon: '🏰' },
        { id: 'quick_2', name: '副本', icon: '🚪' },
        { id: 'quick_3', name: '交易市场', icon: '🏪' },
        { id: 'quick_4', name: '仙盟', icon: '🏛️' }
      ]
    };
  },
  methods: {
    selectItem(item) {
      this.selectedItem = item;
      this.selectedDestination = null;
    },
    selectDestination(dest) {
      if (!dest.unlocked) {
        this.showMessage(dest.requirement || '未解锁');
        return;
      }
      this.selectedDestination = dest;
    },
    quickTeleport(place) {
      // 快速传送逻辑
      const dest = this.availableDestinations.find(d => d.name === place.name);
      if (dest && dest.unlocked) {
        this.selectedDestination = dest;
        this.selectedItem = this.teleportItems[0];
        this.confirmTeleport();
      } else {
        this.showMessage('该地点未解锁');
      }
    },
    confirmTeleport() {
      if (!this.selectedDestination || !this.selectedItem) return;
      
      const player = window.gameData?.player || {};
      const cost = this.selectedDestination.cost;
      
      if (cost > 0 && (player.currency || 0) < cost) {
        this.showMessage('灵石不足！');
        return;
      }
      
      if (this.selectedDestination.cost > 0) {
        player.currency -= cost;
      }
      
      // 消耗卷轴
      if (this.selectedItem.count > 0) {
        this.selectedItem.count--;
      }
      
      // 开始传送动画
      this.isTeleporting = true;
      
      setTimeout(() => {
        this.currentLocation = {
          id: this.selectedDestination.id,
          name: this.selectedDestination.name,
          description: this.selectedDestination.description
        };
        
        // 添加到最近传送
        const existingIndex = this.recentTeleports.findIndex(r => r.name === this.selectedDestination.name);
        if (existingIndex !== -1) {
          this.recentTeleports.splice(existingIndex, 1);
        }
        
        this.recentTeleports.unshift({
          id: 'recent_' + Date.now(),
          name: this.selectedDestination.name,
          icon: this.selectedDestination.icon,
          time: '刚刚'
        });
        
        // 限制记录数量
        if (this.recentTeleports.length > 5) {
          this.recentTeleports.pop();
        }
        
        this.isTeleporting = false;
        this.selectedDestination = null;
        
        // 更新玩家位置
        if (window.gameData?.player) {
          window.gameData.player.location = this.currentLocation.id;
        }
        
        this.showMessage(`已传送到 ${this.currentLocation.name}`);
      }, 2000);
    },
    showMessage(msg) {
      if (window.showMessage) {
        window.showMessage(msg);
      } else {
        alert(msg);
      }
    }
  }
};
</script>

<style scoped>
.teleport-panel {
  width: 700px;
  max-height: 700px;
  background: linear-gradient(145deg, #1a1a2e, #16213e);
  border-radius: 16px;
  border: 2px solid #4a5568;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  position: relative;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(90deg, #2d3748, #4a5568);
  border-bottom: 2px solid #4a5568;
}

.panel-header h2 {
  margin: 0;
  color: #9f7aea;
  font-size: 1.4em;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.close-btn {
  background: #e53e3e;
  color: white;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s;
}

.close-btn:hover {
  background: #c53030;
}

.panel-content {
  padding: 16px;
  max-height: 620px;
  overflow-y: auto;
}

/* 当前所在位置 */
.current-location {
  display: flex;
  align-items: center;
  padding: 16px;
  background: rgba(159, 122, 234, 0.1);
  border-radius: 12px;
  margin-bottom: 20px;
  border: 2px solid #9f7aea;
}

.location-icon {
  font-size: 36px;
  margin-right: 16px;
}

.location-name {
  color: #f7fafc;
  font-size: 1.2em;
  font-weight: bold;
}

.location-desc {
  color: #a0aec0;
  font-size: 0.9em;
}

/* 传送卷轴 */
.teleport-items {
  margin-bottom: 20px;
}

.teleport-items h4, .destination-selector h4, .recent-teleports h4, .quick-teleport h4 {
  color: #f7fafc;
  margin: 0 0 12px 0;
}

.items-grid {
  display: flex;
  gap: 12px;
}

.item-card {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.item-card:hover {
  background: rgba(255, 255, 255, 0.1);
}

.item-card.selected {
  border-color: #9f7aea;
  background: rgba(159, 122, 234, 0.1);
}

.item-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.item-name {
  color: #f7fafc;
  font-weight: bold;
}

.item-count {
  color: #f6e05e;
  font-size: 0.9em;
}

/* 目的地选择 */
.destinations-list {
  max-height: 250px;
  overflow-y: auto;
}

.destination-card {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.destination-card:hover:not(.locked) {
  background: rgba(255, 255, 255, 0.1);
}

.destination-card.selected {
  border-color: #9f7aea;
  background: rgba(159, 122, 234, 0.1);
}

.destination-card.locked {
  opacity: 0.5;
  cursor: not-allowed;
}

.dest-icon {
  font-size: 36px;
  margin-right: 16px;
}

.dest-info {
  flex: 1;
}

.dest-name {
  color: #f7fafc;
  font-weight: bold;
}

.dest-region {
  color: #9f7aea;
  font-size: 0.85em;
}

.dest-desc {
  color: #718096;
  font-size: 0.85em;
}

.dest-cost {
  color: #f6e05e;
  font-size: 0.85em;
}

.dest-requirement {
  color: #e53e3e;
  font-size: 0.85em;
}

.dest-check {
  color: #48bb78;
  font-size: 24px;
  font-weight: bold;
}

/* 最近传送 */
.recent-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recent-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.recent-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.recent-icon {
  font-size: 20px;
  margin-right: 12px;
}

.recent-name {
  flex: 1;
  color: #f7fafc;
}

.recent-time {
  color: #718096;
  font-size: 0.85em;
}

/* 快速传送 */
.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.quick-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
}

.quick-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.quick-icon {
  font-size: 28px;
  margin-bottom: 8px;
}

.quick-name {
  color: #f7fafc;
  font-size: 0.9em;
}

/* 传送确认 */
.teleport-confirm {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: rgba(159, 122, 234, 0.1);
  border-radius: 12px;
  margin-top: 20px;
  border: 2px solid #9f7aea;
}

.confirm-route {
  color: #f7fafc;
  font-weight: bold;
}

.confirm-cost {
  color: #f6e05e;
  font-size: 0.9em;
}

.teleport-btn {
  padding: 12px 32px;
  background: linear-gradient(135deg, #9f7aea, #805ad5);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1.1em;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.teleport-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(159, 122, 234, 0.4);
}

/* 传送动画 */
.teleport-animation {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.teleport-effect {
  text-align: center;
}

.circle-outer, .circle-middle, .circle-inner {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 3px solid #9f7aea;
}

.circle-outer {
  width: 150px;
  height: 150px;
  animation: expand 1s ease-out infinite;
}

.circle-middle {
  width: 100px;
  height: 100px;
  border-color: #b794f4;
  animation: expand 1s ease-out 0.3s infinite;
}

.circle-inner {
  width: 50px;
  height: 50px;
  border-color: #d6bcfa;
  animation: expand 1s ease-out 0.6s infinite;
}

@keyframes expand {
  0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
}

.teleport-text {
  color: #9f7aea;
  font-size: 1.5em;
  font-weight: bold;
  margin-top: 100px;
  animation: blink 1s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.empty-tip {
  color: #718096;
  text-align: center;
  padding: 20px;
}
</style>
