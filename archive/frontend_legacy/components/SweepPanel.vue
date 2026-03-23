<template>
  <div class="sweep-panel">
    <div class="panel-header">
      <h2>一键扫荡</h2>
      <button class="close-btn" @click="emit('close')">×</button>
    </div>
    
    <div class="panel-content">
      <div class="sweep-info">
        <div class="info-item">
          <span class="label">当前关卡:</span>
          <span class="value">{{ currentStage }}</span>
        </div>
        <div class="info-item">
          <span class="label">扫荡券:</span>
          <span class="value highlight">{{ sweepTickets }}</span>
        </div>
      </div>
      
      <div class="sweep-modes">
        <div 
          class="mode-card" 
          :class="{ active: selectedMode === 1 }"
          @click="selectedMode = 1"
        >
          <div class="mode-icon">1</div>
          <div class="mode-name">单次扫荡</div>
          <div class="mode-cost">消耗 1 张扫荡券</div>
        </div>
        
        <div 
          class="mode-card" 
          :class="{ active: selectedMode === 10 }"
          @click="selectedMode = 10"
        >
          <div class="mode-icon">10</div>
          <div class="mode-name">十次扫荡</div>
          <div class="mode-cost">消耗 10 张扫荡券</div>
        </div>
        
        <div 
          class="mode-card" 
          :class="{ active: selectedMode === 'max' }"
          @click="selectedMode = 'max'"
        >
          <div class="mode-icon">∞</div>
          <div class="mode-name">最大扫荡</div>
          <div class="mode-cost">消耗全部扫荡券</div>
        </div>
      </div>
      
      <div class="sweep-preview" v-if="sweepTickets > 0">
        <div class="preview-title">扫荡预览</div>
        <div class="preview-items">
          <div class="preview-item" v-for="(reward, index) in previewRewards" :key="index">
            <span class="reward-icon">{{ reward.icon }}</span>
            <span class="reward-name">{{ reward.name }}</span>
            <span class="reward-amount">×{{ reward.amount }}</span>
          </div>
        </div>
      </div>
      
      <div class="no-tickets" v-if="sweepTickets === 0">
        <p>扫荡券不足</p>
        <button class="get-tickets-btn" @click="buyTickets">获取扫荡券</button>
      </div>
      
      <button 
        class="sweep-btn" 
        :disabled="sweepTickets < 1 || isSweeping"
        @click="startSweep"
      >
        {{ isSweeping ? '扫荡中...' : '开始扫荡' }}
      </button>
    </div>
    
    <div class="sweep-result" v-if="showResult">
      <div class="result-header">扫荡完成!</div>
      <div class="result-items">
        <div class="result-item" v-for="(item, index) in resultItems" :key="index">
          <span class="result-icon">{{ item.icon }}</span>
          <span class="result-name">{{ item.name }}</span>
          <span class="result-amount">×{{ item.amount }}</span>
        </div>
      </div>
      <button class="confirm-btn" @click="showResult = false">确定</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  player: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['close']);

const currentStage = ref(1);
const sweepTickets = ref(5);
const selectedMode = ref(1);
const isSweeping = ref(false);
const showResult = ref(false);
const resultItems = ref([]);

const previewRewards = computed(() => {
  const times = selectedMode.value === 'max' ? sweepTickets.value : selectedMode.value;
  return [
    { icon: '💎', name: '灵石', amount: times * 1000 },
    { icon: '⭐', name: '经验', amount: times * 500 },
    { icon: '📦', name: '装备', amount: times * 2 }
  ];
});

function startSweep() {
  if (sweepTickets.value < 1 || isSweeping.value) return;
  
  isSweeping.value = true;
  const times = selectedMode.value === 'max' ? sweepTickets.value : selectedMode.value;
  
  setTimeout(() => {
    sweepTickets.value -= times;
    resultItems.value = previewRewards.value.map(r => ({
      ...r,
      amount: r.amount
    }));
    isSweeping.value = false;
    showResult.value = true;
  }, 1500);
}

function buyTickets() {
  // 购买扫荡券逻辑
  console.log('购买扫荡券');
}
</script>

<style scoped>
.sweep-panel {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 20px;
  color: #fff;
  min-width: 400px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.panel-header h2 {
  margin: 0;
  font-size: 24px;
  color: #ffd700;
}

.close-btn {
  background: none;
  border: none;
  color: #fff;
  font-size: 28px;
  cursor: pointer;
  opacity: 0.7;
}

.close-btn:hover {
  opacity: 1;
}

.sweep-info {
  display: flex;
  justify-content: space-around;
  margin-bottom: 20px;
  padding: 15px;
  background: rgba(255,255,255,0.05);
  border-radius: 10px;
}

.info-item {
  text-align: center;
}

.info-item .label {
  display: block;
  font-size: 14px;
  color: #aaa;
  margin-bottom: 5px;
}

.info-item .value {
  font-size: 20px;
  font-weight: bold;
}

.info-item .value.highlight {
  color: #ffd700;
}

.sweep-modes {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.mode-card {
  flex: 1;
  padding: 15px;
  background: rgba(255,255,255,0.05);
  border-radius: 10px;
  text-align: center;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.3s;
}

.mode-card:hover {
  background: rgba(255,255,255,0.1);
}

.mode-card.active {
  border-color: #ffd700;
  background: rgba(255,215,0,0.1);
}

.mode-icon {
  font-size: 28px;
  margin-bottom: 5px;
}

.mode-name {
  font-size: 14px;
  margin-bottom: 5px;
}

.mode-cost {
  font-size: 12px;
  color: #aaa;
}

.sweep-preview {
  margin-bottom: 20px;
  padding: 15px;
  background: rgba(255,255,255,0.05);
  border-radius: 10px;
}

.preview-title {
  font-size: 14px;
  color: #aaa;
  margin-bottom: 10px;
}

.preview-item {
  display: flex;
  align-items: center;
  padding: 5px 0;
}

.reward-icon {
  margin-right: 10px;
  font-size: 18px;
}

.reward-name {
  flex: 1;
}

.reward-amount {
  color: #ffd700;
}

.no-tickets {
  text-align: center;
  padding: 20px;
  color: #ff6b6b;
}

.get-tickets-btn {
  margin-top: 10px;
  padding: 8px 20px;
  background: #4CAF50;
  border: none;
  border-radius: 5px;
  color: #fff;
  cursor: pointer;
}

.sweep-btn {
  width: 100%;
  padding: 15px;
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  border: none;
  border-radius: 10px;
  color: #1a1a2e;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.sweep-btn:hover:not(:disabled) {
  transform: scale(1.02);
  box-shadow: 0 0 20px rgba(255,215,0,0.5);
}

.sweep-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sweep-result {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
}

.result-header {
  font-size: 24px;
  color: #ffd700;
  margin-bottom: 20px;
}

.result-items {
  margin-bottom: 20px;
}

.result-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
}

.result-icon {
  margin-right: 10px;
  font-size: 20px;
}

.result-name {
  flex: 1;
}

.result-amount {
  color: #ffd700;
  font-size: 18px;
}

.confirm-btn {
  padding: 10px 40px;
  background: #ffd700;
  border: none;
  border-radius: 8px;
  color: #1a1a2e;
  font-weight: bold;
  cursor: pointer;
}
</style>
