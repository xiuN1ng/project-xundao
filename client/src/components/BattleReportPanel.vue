<template>
  <div class="battle-report-panel">
    <div class="panel-header">
      <h3>战斗回放</h3>
      <button class="close-btn" @click="closePanel">×</button>
    </div>
    
    <div class="panel-content">
      <div class="battle-list" v-if="battleList.length > 0">
        <div 
          v-for="battle in battleList" 
          :key="battle.id" 
          class="battle-item"
          :class="{ active: selectedBattle?.id === battle.id }"
          @click="selectBattle(battle)"
        >
          <div class="battle-type" :class="'type-' + battle.type">
            {{ getBattleTypeName(battle.type) }}
          </div>
          <div class="battle-info">
            <div class="battle-result" :class="battle.win ? 'win' : 'lose'">
              {{ battle.win ? '胜利' : '失败' }}
            </div>
            <div class="battle-time">{{ formatTime(battle.time) }}</div>
          </div>
          <div class="battle-rival">
            <span>vs {{ battle.rivalName }}</span>
          </div>
        </div>
      </div>
      
      <div class="empty-state" v-else>
        <span class="empty-icon">⚔️</span>
        <p>暂无战斗记录</p>
      </div>
      
      <div class="battle-detail" v-if="selectedBattle">
        <h4>战斗详情</h4>
        
        <div class="battle-summary">
          <div class="my-stats">
            <div class="stat-label">我方</div>
            <div class="stat-value">{{ selectedBattle.myDamage }} 伤害</div>
            <div class="stat-detail">造成</div>
          </div>
          <div class="vs-divider">VS</div>
          <div class="enemy-stats">
            <div class="stat-label">敌方</div>
            <div class="stat-value">{{ selectedBattle.enemyDamage }} 伤害</div>
            <div class="stat-detail">造成</div>
          </div>
        </div>
        
        <div class="battle-timeline">
          <h5>战斗过程</h5>
          <div class="timeline-list">
            <div v-for="(event, index) in selectedBattle.events" :key="index" class="timeline-event">
              <div class="event-time">{{ event.time }}s</div>
              <div class="event-content" :class="event.type">
                <span class="event-icon">{{ getEventIcon(event.type) }}</span>
                <span class="event-text">{{ event.description }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="battle-rewards" v-if="selectedBattle.rewards && selectedBattle.rewards.length > 0">
          <h5>战斗奖励</h5>
          <div class="rewards-list">
            <div v-for="(reward, idx) in selectedBattle.rewards" :key="idx" class="reward-item">
              <span class="reward-icon">{{ reward.icon }}</span>
              <span class="reward-name">{{ reward.name }}</span>
              <span class="reward-count">x{{ reward.count }}</span>
            </div>
          </div>
        </div>
        
        <button class="replay-btn" @click="replayBattle">
          🔄 回放战斗
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BattleReportPanel',
  emits: ['close'],
  setup(props, { emit }) {
    const battleList = ref([]);
    const selectedBattle = ref(null);
    
    const getBattleTypeName = (type) => {
      const typeMap = {
        'pvp': 'PVP',
        'pve': '副本',
        'boss': 'BOSS',
        'arena': '竞技场',
        'ladder': '天梯'
      };
      return typeMap[type] || '战斗';
    };
    
    const formatTime = (timestamp) => {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;
      
      if (diff < 60000) return '刚刚';
      if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
      if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
      return date.toLocaleDateString();
    };
    
    const getEventIcon = (type) => {
      const iconMap = {
        'attack': '⚔️',
        'skill': '✨',
        'damage': '💥',
        'heal': '💚',
        'buff': '🔰',
        'dead': '💀'
      };
      return iconMap[type] || '•';
    };
    
    const loadBattleList = async () => {
      try {
        const response = await fetch('/api/battle/report/list');
        const data = await response.json();
        
        if (data.success) {
          battleList.value = data.list || [];
        }
      } catch (error) {
        console.error('加载战斗记录失败:', error);
      }
    };
    
    const selectBattle = async (battle) => {
      selectedBattle.value = battle;
      
      try {
        const response = await fetch(`/api/battle/report/${battle.id}`);
        const data = await response.json();
        
        if (data.success) {
          selectedBattle.value = { ...battle, ...data.detail };
        }
      } catch (error) {
        console.error('加载战斗详情失败:', error);
      }
    };
    
    const replayBattle = () => {
      if (selectedBattle.value) {
        // 触发战斗回放
        window.dispatchEvent(new CustomEvent('battle-replay', {
          detail: selectedBattle.value
        }));
      }
    };
    
    const closePanel = () => {
      emit('close');
    };
    
    onMounted(() => {
      loadBattleList();
    });
    
    return {
      battleList,
      selectedBattle,
      getBattleTypeName,
      formatTime,
      getEventIcon,
      selectBattle,
      replayBattle,
      closePanel
    };
  }
};
</script>

<style scoped>
.battle-report-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 500px;
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
  display: flex;
  gap: 20px;
}

.battle-list {
  width: 180px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.battle-item {
  padding: 12px;
  background: #2d3748;
  border-radius: 8px;
  border: 1px solid #4a5568;
  cursor: pointer;
  transition: all 0.3s;
}

.battle-item:hover {
  background: #4a5568;
}

.battle-item.active {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.2);
}

.battle-type {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
  margin-bottom: 6px;
}

.battle-type.type-pvp { background: #e53e3e; }
.battle-type.type-pve { background: #38a169; }
.battle-type.type-boss { background: #d69e2e; }
.battle-type.type-arena { background: #805ad5; }
.battle-type.type-ladder { background: #3182ce; }

.battle-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.battle-result {
  font-size: 14px;
  font-weight: bold;
}

.battle-result.win { color: #48bb78; }
.battle-result.lose { color: #f56565; }

.battle-time {
  font-size: 11px;
  color: #a0aec0;
}

.battle-rival {
  font-size: 12px;
  color: #cbd5e0;
}

.battle-detail {
  flex: 1;
}

.battle-detail h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #f6e05e;
}

.battle-summary {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 16px;
  background: #2d3748;
  border-radius: 12px;
  margin-bottom: 16px;
}

.stat-label {
  font-size: 12px;
  color: #a0aec0;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 20px;
  font-weight: bold;
  color: #f6e05e;
}

.stat-detail {
  font-size: 11px;
  color: #718096;
}

.vs-divider {
  font-size: 18px;
  font-weight: bold;
  color: #4a5568;
}

.battle-timeline h5 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #cbd5e0;
}

.timeline-list {
  max-height: 200px;
  overflow-y: auto;
}

.timeline-event {
  display: flex;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #2d3748;
}

.event-time {
  font-size: 12px;
  color: #718096;
  width: 40px;
}

.event-content {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.event-icon {
  font-size: 16px;
}

.event-content.attack .event-text { color: #fc8181; }
.event-content.skill .event-text { color: #b794f4; }
.event-content.damage .event-text { color: #f56565; }
.event-content.heal .event-text { color: #68d391; }
.event-content.buff .event-text { color: #63b3ed; }

.battle-rewards {
  margin-top: 16px;
}

.battle-rewards h5 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #cbd5e0;
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
  padding: 6px 10px;
  background: #2d3748;
  border-radius: 6px;
  font-size: 12px;
}

.reward-icon {
  font-size: 16px;
}

.reward-name {
  color: #cbd5e0;
}

.reward-count {
  color: #f6e05e;
}

.replay-btn {
  width: 100%;
  margin-top: 16px;
  padding: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.replay-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
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
}
</style>
