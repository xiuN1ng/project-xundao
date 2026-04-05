<template>
  <div class="couple-dungeon-panel">
    <div class="panel-header">
      <h3>阴阳双修洞府</h3>
      <button class="close-btn" @click="closePanel">×</button>
    </div>
    
    <div class="panel-content">
      <!-- 副本列表 -->
      <div class="dungeon-list" v-if="!selectedDungeon">
        <div 
          v-for="dungeon in dungeons" 
          :key="dungeon.id" 
          class="dungeon-item"
          @click="selectDungeon(dungeon)"
        >
          <span class="dungeon-icon">{{ dungeon.icon }}</span>
          <div class="dungeon-info">
            <div class="dungeon-name">{{ dungeon.name }}</div>
            <div class="dungeon-meta">
              <span class="req-level">需境界: {{ dungeon.reqLevel }}</span>
              <span class="cost" v-if="dungeon.cost > 0">💰 {{ dungeon.cost }}</span>
              <span class="cost free" v-else>免费</span>
            </div>
            <div class="dungeon-desc">{{ dungeon.description }}</div>
            <div class="lock-status" v-if="!dungeon.unlocked">
              <span class="locked">🔒 未解锁</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 副本详情 -->
      <div class="dungeon-detail" v-else>
        <button class="back-btn" @click="selectedDungeon = null">← 返回</button>
        
        <div class="detail-header">
          <span class="dungeon-icon large">{{ selectedDungeon.icon }}</span>
          <div class="dungeon-title">
            <h4>{{ selectedDungeon.name }}</h4>
            <p>{{ selectedDungeon.description }}</p>
          </div>
        </div>
        
        <div class="dungeon-stats">
          <div class="stat-item">
            <span class="stat-label">进入次数</span>
            <span class="stat-value">{{ timesRemaining }} / 3</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">通关奖励</span>
            <span class="stat-value">💰 {{ Math.floor(selectedDungeon.cost * 0.5) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">掉落概率</span>
            <span class="stat-value">{{ (selectedDungeon.dropChance * 100).toFixed(0) }}%</span>
          </div>
        </div>
        
        <div class="drops-section" v-if="selectedDungeon.drops">
          <h4>可能掉落</h4>
          <div class="drops-list">
            <div v-for="drop in selectedDungeon.drops" :key="drop.itemId" class="drop-item">
              <span class="drop-icon">{{ drop.icon }}</span>
              <span class="drop-name">{{ drop.name }}</span>
            </div>
          </div>
        </div>
        
        <div class="enter-section">
          <button 
            class="enter-btn" 
            @click="enterDungeon" 
            :disabled="!selectedDungeon.unlocked || timesRemaining <= 0"
          >
            {{ selectedDungeon.unlocked ? (timesRemaining > 0 ? '进入副本' : '今日次数已用完') : '未解锁' }}
          </button>
        </div>
        
        <!-- 战斗结果 -->
        <div class="battle-result" v-if="battleResult">
          <div class="result-header" :class="{ won: battleResult.won }">
            {{ battleResult.won ? '🎉 战斗胜利' : '💀 战斗失败' }}
          </div>
          <div class="result-drops" v-if="battleResult.drops && battleResult.drops.length > 0">
            <h4>获得掉落</h4>
            <div class="drops-list">
              <div v-for="drop in battleResult.drops" :key="drop.itemId" class="drop-item">
                <span class="drop-icon">{{ drop.icon }}</span>
                <span class="drop-name">{{ drop.name }} x{{ drop.count }}</span>
              </div>
            </div>
          </div>
          <div class="result-reward" v-if="battleResult.reward">
            <span class="exp">+{{ battleResult.reward.exp }} 经验</span>
            <span class="intimacy" v-if="battleResult.reward.intimacy">+{{ battleResult.reward.intimacy }} 亲密度</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const props = defineProps({
  initialDungeon: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['close', 'navigate']);

const dungeons = ref([]);
const selectedDungeon = ref(null);
const timesRemaining = ref(0);
const battleId = ref(null);
const battleResult = ref(null);

const loadDungeons = async () => {
  try {
    const response = await fetch('/api/couple/dungeon/list');
    const data = await response.json();
    if (data.success) {
      dungeons.value = data.data;
    }
  } catch (error) {
    console.error('加载副本列表失败:', error);
  }
};

const selectDungeon = async (dungeon) => {
  selectedDungeon.value = dungeon;
  battleResult.value = null;
  
  try {
    const response = await fetch(`/api/couple/dungeon/info/${dungeon.id}?userId=1`);
    const data = await response.json();
    if (data.success) {
      timesRemaining.value = data.timesRemaining;
    }
  } catch (error) {
    console.error('加载副本详情失败:', error);
  }
};

const enterDungeon = async () => {
  if (!selectedDungeon.value || timesRemaining.value <= 0) return;
  
  try {
    const response = await fetch('/api/couple/dungeon/enter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        dungeonId: selectedDungeon.value.id,
        userId: 1
      })
    });
    
    const data = await response.json();
    if (data.success) {
      battleId.value = data.battleId;
      
      // 模拟战斗结果（实际需要前端战斗逻辑或服务器计算）
      // 这里简化：直接请求战斗结算
      setTimeout(() => {
        finishBattle(true);
      }, 1500);
    } else {
      alert(data.error || '进入失败');
    }
  } catch (error) {
    console.error('进入副本失败:', error);
  }
};

const finishBattle = async (won) => {
  if (!battleId.value) return;
  
  try {
    const response = await fetch(`/api/couple/dungeon/battle/${battleId.value}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dungeonId: selectedDungeon.value.id,
        won: won,
        time: 30,
        userId: 1
      })
    });
    
    const data = await response.json();
    if (data.success) {
      battleResult.value = data;
      timesRemaining.value = Math.max(0, timesRemaining.value - 1);
    }
  } catch (error) {
    console.error('战斗结算失败:', error);
  }
};

const closePanel = () => {
  emit('close');
};

onMounted(() => {
  loadDungeons();
  if (props.initialDungeon) {
    selectDungeon(props.initialDungeon);
  }
});
</script>

<style scoped>
.couple-dungeon-panel {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 12px;
  padding: 16px;
  color: #fff;
  max-width: 500px;
  margin: 0 auto;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-header h3 {
  margin: 0;
  font-size: 18px;
  color: #ffd700;
}

.close-btn {
  background: none;
  border: none;
  color: #fff;
  font-size: 24px;
  cursor: pointer;
  padding: 0 8px;
}

.close-btn:hover {
  color: #ff6b6b;
}

.dungeon-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dungeon-item {
  display: flex;
  gap: 12px;
  background: rgba(255, 255, 255, 0.05);
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.dungeon-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.dungeon-icon {
  font-size: 32px;
}

.dungeon-icon.large {
  font-size: 48px;
}

.dungeon-info {
  flex: 1;
}

.dungeon-name {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 4px;
}

.dungeon-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #aaa;
  margin-bottom: 4px;
}

.cost {
  color: #ffd700;
}

.cost.free {
  color: #4caf50;
}

.dungeon-desc {
  font-size: 12px;
  color: #888;
}

.locked {
  color: #ff6b6b;
  font-size: 12px;
}

.back-btn {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 12px;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.detail-header {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 16px;
}

.dungeon-title h4 {
  margin: 0 0 4px 0;
  font-size: 18px;
}

.dungeon-title p {
  margin: 0;
  font-size: 12px;
  color: #aaa;
}

.dungeon-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: #888;
}

.stat-value {
  font-size: 14px;
  font-weight: bold;
}

.drops-section {
  margin-bottom: 16px;
}

.drops-section h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #ffd700;
}

.drops-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.drop-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(255, 215, 0, 0.1);
  border-radius: 4px;
  font-size: 12px;
}

.drop-icon {
  font-size: 16px;
}

.enter-section {
  margin-bottom: 16px;
}

.enter-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
  border: none;
  border-radius: 8px;
  color: #1a1a2e;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
}

.enter-btn:disabled {
  background: #555;
  color: #888;
  cursor: not-allowed;
}

.battle-result {
  margin-top: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  text-align: center;
}

.result-header {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 12px;
}

.result-header.won {
  color: #4caf50;
}

.result-reward {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 12px;
}

.exp {
  color: #ffd700;
}

.intimacy {
  color: #ff69b4;
}
</style>