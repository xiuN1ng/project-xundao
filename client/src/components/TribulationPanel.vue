<template>
  <div class="tribulation-panel">
    <div class="panel-header">
      <div class="panel-title">⚡ 渡劫系统</div>
      <button class="close-btn" @click="$emit('close')">×</button>
    </div>

    <!-- 当前状态 -->
    <div class="tribulation-status-card">
      <div class="status-icon">{{ currentTribulation?.icon || '⚡' }}</div>
      <div class="status-info">
        <div class="status-title">当前境界: {{ playerData.realmName || '凡人' }}</div>
        <div class="status-desc">{{ currentStatusText }}</div>
        <div class="status-progress" v-if="nextRealmText">
          <span class="progress-label">{{ nextRealmText }}</span>
        </div>
      </div>
    </div>

    <!-- 天劫类型选择 -->
    <div class="tribulation-types-section">
      <div class="section-title">选择天劫类型</div>
      <div class="tribulation-list">
        <div
          v-for="(trib, key) in tribulationTypes"
          :key="key"
          class="tribulation-option"
          :class="[
            trib.difficulty,
            { selected: selectedType === key }
          ]"
          @click="selectType(key)"
        >
          <div class="trib-icon" :style="{ color: trib.color }">{{ trib.icon }}</div>
          <div class="trib-info">
            <div class="trib-name">{{ trib.name }}</div>
            <div class="trib-element">元素: {{ trib.element }}</div>
            <div class="trib-desc">{{ trib.description }}</div>
            <div class="trib-suitable">适用: {{ trib.suitableRealm }}</div>
            <div class="trib-rate">
              基础成功率: <span :class="getRateClass(trib.baseSuccessRate)">{{ Math.round(trib.baseSuccessRate * 100) }}%</span>
            </div>
          </div>
          <div class="trib-select-indicator" v-if="selectedType === key">✓</div>
        </div>
      </div>
    </div>

    <!-- 成功率计算 -->
    <div class="success-rate-section" v-if="selectedType">
      <div class="section-title">渡劫成功率</div>
      <div class="rate-display">
        <div class="rate-circle" :class="rateClass">
          <span class="rate-value">{{ Math.round(effectiveRate * 100) }}%</span>
          <span class="rate-label">成功率</span>
        </div>
        <div class="rate-breakdown">
          <div class="breakdown-item">
            <span class="breakdown-label">基础成功率</span>
            <span class="breakdown-value">{{ Math.round(selectedTribData?.baseSuccessRate * 100) }}%</span>
          </div>
          <div class="breakdown-item" v-if="playerSpiritRoot">
            <span class="breakdown-label">灵根加成</span>
            <span class="breakdown-value spirit-bonus">+{{ spiritRootBonus }}%</span>
          </div>
          <div class="breakdown-item" v-if="protectionBonus > 0">
            <span class="breakdown-label">护身物品</span>
            <span class="breakdown-value protection-bonus">+{{ protectionBonus }}%</span>
          </div>
          <div class="breakdown-item" v-if="realmAdvantage > 0">
            <span class="breakdown-label">境界优势</span>
            <span class="breakdown-value">+{{ realmAdvantage }}%</span>
          </div>
          <div class="breakdown-item total">
            <span class="breakdown-label">总计</span>
            <span class="breakdown-value">{{ Math.round(effectiveRate * 100) }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 护身物品 -->
    <div class="protection-section" v-if="selectedType">
      <div class="section-title">护身物品 (降低雷劫伤害)</div>
      <div class="protection-list" v-if="protectionItems.length > 0">
        <div
          v-for="item in protectionItems"
          :key="item.id"
          class="protection-item"
          :class="{ active: selectedProtection === item.id }"
          @click="toggleProtection(item)"
        >
          <div class="protection-icon">{{ item.icon }}</div>
          <div class="protection-info">
            <div class="protection-name">{{ item.name }}</div>
            <div class="protection-effect">{{ item.effect }}</div>
          </div>
          <div class="protection-count">×{{ item.count }}</div>
          <div class="protection-check" v-if="selectedProtection === item.id">✓</div>
        </div>
      </div>
      <div class="no-protection" v-else>
        <span>暂无护身物品</span>
        <span class="tip">可在商店购买「渡劫护符」增加渡劫成功率</span>
      </div>
    </div>

    <!-- 渡劫按钮 -->
    <div class="tribulation-action" v-if="selectedType">
      <div class="risk-warning" v-if="effectiveRate < 0.5">
        <span class="warning-icon">⚠️</span>
        <span>成功率较低 ({{ Math.round(effectiveRate * 100) }}%)，失败将损失部分修为</span>
      </div>
      <button
        class="tribulation-btn"
        :class="[selectedTribData?.difficulty]"
        :disabled="isAttempting"
        @click="attemptTribulation"
      >
        <span v-if="isAttempting" class="btn-loading">渡劫中...</span>
        <span v-else>🔥 尝试渡劫</span>
      </button>
    </div>

    <!-- 结果展示 -->
    <div class="tribulation-result" v-if="result">
      <div class="result-card" :class="result.success ? 'success' : 'failure'">
        <div class="result-icon">{{ result.success ? '🎉' : '💀' }}</div>
        <div class="result-title">{{ result.success ? '渡劫成功！' : '渡劫失败...' }}</div>
        <div class="result-message">{{ result.message }}</div>
        <div class="result-rewards" v-if="result.success && result.rewards">
          <div class="reward-title">渡劫奖励:</div>
          <div class="reward-item" v-if="result.rewards.spirit">+{{ result.rewards.spirit }} 灵气</div>
          <div class="reward-item" v-if="result.rewards.spiritStones">+{{ result.rewards.spiritStones }} 灵石</div>
          <div class="reward-item" v-if="result.rewards.item">获得: {{ result.rewards.item }} ×{{ result.rewards.itemCount }}</div>
        </div>
        <button class="result-close-btn" @click="result = null">确定</button>
      </div>
    </div>

    <!-- 历史记录 -->
    <div class="history-section" v-if="tribulationHistory.length > 0">
      <div class="section-title">历史记录</div>
      <div class="history-list">
        <div
          v-for="(record, idx) in tribulationHistory"
          :key="idx"
          class="history-item"
          :class="record.success ? 'success' : 'failure'"
        >
          <span class="history-icon">{{ record.success ? '✅' : '❌' }}</span>
          <span class="history-text">{{ record.type }} - {{ record.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'react';

const props = defineProps({
  player: {
    type: Object,
    default: () => ({})
  }
});

defineEmits(['close']);

const playerData = ref({});
const tribulationTypes = ref({});
const selectedType = ref(null);
const isAttempting = ref(false);
const result = ref(null);
const protectionItems = ref([]);
const selectedProtection = ref(null);
const tribulationHistory = ref([]);

const REALM_DATA = {
  '凡人': { order: 0, next: '炼气' },
  '炼气': { order: 1, next: '筑基' },
  '筑基': { order: 2, next: '金丹' },
  '金丹': { order: 3, next: '元婴' },
  '元婴': { order: 4, next: '化神' },
  '化神': { order: 5, next: '炼虚' },
  '炼虚': { order: 6, next: '合体' },
  '合体': { order: 7, next: '大乘' },
  '大乘': { order: 8, next: '飞升' },
  '飞升': { order: 9, next: null }
};

const PROTECTION_ITEMS_DATA = [
  { id: 'trib_protect_1', name: '渡劫护符', icon: '🛡️', effect: '闪避+10% 伤害-15%', dodgeBonus: 0.1, damageReduction: 0.15 },
  { id: 'trib_protect_2', name: '渡劫珠', icon: '💎', effect: '伤害-25%', dodgeBonus: 0, damageReduction: 0.25 },
  { id: 'trib_protect_3', name: '天道护符', icon: '✨', effect: '闪避+20% 伤害-20%', dodgeBonus: 0.2, damageReduction: 0.2 },
  { id: 'trib_protect_4', name: '避雷针', icon: '📍', effect: '雷击闪避+30%', dodgeBonus: 0.3, damageReduction: 0.1 },
  { id: 'trib_protect_5', name: '心魔丹', icon: '💊', effect: '心魔劫成功率+25%', dodgeBonus: 0.15, damageReduction: 0.15, heartDemonOnly: true }
];

onMounted(() => {
  loadData();
});

async function loadData() {
  try {
    const parsed = JSON.parse(localStorage.getItem('idleCultivationGame') || '{}');
    const p = parsed.gameState?.player || {};
    playerData.value = { ...props.player, ...p };

    // 加载渡劫类型
    try {
      const res = await fetch('/api/tribulation/types');
      if (res.ok) {
        const data = await res.json();
        tribulationTypes.value = data.types || getDefaultTypes();
      } else {
        tribulationTypes.value = getDefaultTypes();
      }
    } catch (e) {
      tribulationTypes.value = getDefaultTypes();
    }

    // 加载护身物品
    loadProtectionItems();

    // 加载历史记录
    loadHistory();
  } catch (e) {
    playerData.value = { ...props.player };
    tribulationTypes.value = getDefaultTypes();
  }
}

function getDefaultTypes() {
  return {
    metal: { id: 'metal', name: '金劫', element: '金', icon: '⚔️', color: '#D4AF37', description: '金属性雷劫', baseSuccessRate: 0.8, difficulty: 'normal', suitableRealm: '炼气→筑基' },
    water: { id: 'water', name: '水劫', element: '水', icon: '💧', color: '#1E90FF', description: '水属性雷劫', baseSuccessRate: 0.7, difficulty: 'normal', suitableRealm: '金丹→元婴' },
    fire: { id: 'fire', name: '火劫', element: '火', icon: '🔥', color: '#FF4500', description: '火属性雷劫', baseSuccessRate: 0.6, difficulty: 'hard', suitableRealm: '元婴→化神' },
    heart_demon: { id: 'heart_demon', name: '心魔劫', element: '心', icon: '😈', color: '#9400D3', description: '考验道心', baseSuccessRate: 0.6, difficulty: 'hard', suitableRealm: '每逢大境界突破' }
  };
}

function loadProtectionItems() {
  try {
    const parsed = JSON.parse(localStorage.getItem('idleCultivationGame') || '{}');
    const inventory = parsed.gameState?.player?.inventory || {};
    const items = [];
    PROTECTION_ITEMS_DATA.forEach(p => {
      const count = inventory[p.id] || 0;
      if (count > 0) {
        items.push({ ...p, count });
      }
    });
    protectionItems.value = items;
  } catch (e) {
    protectionItems.value = [];
  }
}

function loadHistory() {
  try {
    const history = localStorage.getItem('tribulation_history');
    if (history) {
      tribulationHistory.value = JSON.parse(history).slice(0, 5);
    }
  } catch (e) {}
}

const currentTribulation = computed(() => {
  const realm = playerData.value.realmName || '凡人';
  // 根据当前境界推荐一个天劫类型
  const types = Object.values(tribulationTypes.value);
  return types[0] || null;
});

const currentStatusText = computed(() => {
  const realm = playerData.value.realmName || '凡人';
  const realmInfo = REALM_DATA[realm];
  if (!realmInfo?.next) return '已达最高境界，无需渡劫';
  return `即将突破至 ${realmInfo.next}，需渡过天劫`;
});

const nextRealmText = computed(() => {
  const realm = playerData.value.realmName || '凡人';
  const realmInfo = REALM_DATA[realm];
  if (!realmInfo?.next) return null;
  return `下一境界: ${realmInfo.next}`;
});

const selectedTribData = computed(() => {
  return tribulationTypes.value[selectedType.value];
});

const playerSpiritRoot = computed(() => {
  return playerData.value.spiritRoot || '五行杂灵根';
});

const spiritRootBonus = computed(() => {
  const root = playerSpiritRoot.value;
  if (root === '混沌灵根') return 20;
  if (root === '天灵根') return 15;
  if (root === '火灵根' || root === '水灵根') return 5;
  return 0;
});

const protectionBonus = computed(() => {
  if (!selectedProtection.value) return 0;
  const item = protectionItems.value.find(i => i.id === selectedProtection.value);
  if (!item) return 0;
  if (selectedTribData.value?.element === '心' && !item.heartDemonOnly) return 0;
  return Math.round(item.dodgeBonus * 100 + item.damageReduction * 10);
});

const realmAdvantage = computed(() => {
  const realm = playerData.value.realmName || '凡人';
  const realmOrder = REALM_DATA[realm]?.order || 0;
  if (realmOrder >= 3) return 10; // 金丹以上有境界优势
  if (realmOrder >= 1) return 5;
  return 0;
});

const effectiveRate = computed(() => {
  if (!selectedTribData.value) return 0;
  let rate = selectedTribData.value.baseSuccessRate;
  rate += spiritRootBonus.value / 100;
  rate += protectionBonus.value / 100;
  rate += realmAdvantage.value / 100;
  return Math.min(rate, 0.98);
});

const rateClass = computed(() => {
  const rate = effectiveRate.value;
  if (rate >= 0.8) return 'high';
  if (rate >= 0.5) return 'medium';
  return 'low';
});

function getRateClass(baseRate) {
  if (baseRate >= 0.8) return 'rate-high';
  if (baseRate >= 0.5) return 'rate-medium';
  return 'rate-low';
}

function selectType(key) {
  selectedType.value = key;
  selectedProtection.value = null;
  result.value = null;
}

function toggleProtection(item) {
  if (selectedProtection.value === item.id) {
    selectedProtection.value = null;
  } else {
    selectedProtection.value = item.id;
  }
}

async function attemptTribulation() {
  if (!selectedType.value || isAttempting.value) return;
  isAttempting.value = true;
  result.value = null;

  try {
    const res = await fetch('/api/tribulation/attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        realm: playerData.value.realmName,
        tribulationType: selectedType.value,
        bonuses: {
          spiritRoot: playerSpiritRoot.value,
          protection: selectedProtection.value
        }
      })
    });
    const data = await res.json();
    handleResult(data);
  } catch (e) {
    // Fallback simulation
    const success = Math.random() < effectiveRate.value;
    handleResult({
      success,
      message: success ? '天劫已过，修为精进！' : '天劫降临，渡劫失败...',
      rewards: success ? { spirit: 10000, spiritStones: 500 } : null
    });
  }
  isAttempting.value = false;
}

function handleResult(data) {
  result.value = data;

  // 保存历史
  const history = JSON.parse(localStorage.getItem('tribulation_history') || '[]');
  history.unshift({
    type: selectedTribData.value?.name || '天劫',
    success: data.success,
    message: data.message,
    time: new Date().toLocaleString()
  });
  localStorage.setItem('tribulation_history', JSON.stringify(history.slice(0, 10)));
  tribulationHistory.value = history.slice(0, 5);

  // 更新玩家数据
  if (data.success && data.newRealm) {
    playerData.value.realmName = data.newRealm;
    try {
      const parsed = JSON.parse(localStorage.getItem('idleCultivationGame') || '{}');
      if (parsed.gameState?.player) {
        parsed.gameState.player.realmName = data.newRealm;
        localStorage.setItem('idleCultivationGame', JSON.stringify(parsed));
      }
    } catch (e) {}
  }
}
</script>

<style scoped>
.tribulation-panel {
  background: linear-gradient(rgba(26, 26, 46, 0.88), rgba(22, 33, 62, 0.92)), url('../assets/bg-tribulation-storm.png') center/cover no-repeat;
  border-radius: 16px;
  padding: 16px;
  max-height: 80vh;
  overflow-y: auto;
  color: #fff;
  font-family: 'Microsoft YaHei', sans-serif;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.panel-title {
  font-size: 20px;
  font-weight: bold;
  color: #ffd700;
}

.close-btn {
  background: rgba(255,255,255,0.1);
  border: none;
  color: #fff;
  font-size: 24px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  line-height: 1;
}

.tribulation-status-card {
  display: flex;
  align-items: center;
  padding: 14px;
  background: rgba(255,255,255,0.05);
  border-radius: 12px;
  border: 1px solid rgba(255,215,0,0.3);
  margin-bottom: 16px;
}

.status-icon {
  font-size: 40px;
  margin-right: 14px;
}

.status-title {
  font-size: 16px;
  font-weight: bold;
  color: #ffd700;
  margin-bottom: 4px;
}

.status-desc {
  font-size: 13px;
  color: #aaa;
  margin-bottom: 4px;
}

.status-progress {
  font-size: 12px;
  color: #22c55e;
}

.tribulation-types-section {
  margin-bottom: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #ffd700;
  margin-bottom: 12px;
}

.tribulation-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tribulation-option {
  display: flex;
  align-items: flex-start;
  padding: 12px;
  background: rgba(30,30,50,0.9);
  border-radius: 12px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.tribulation-option:active { transform: scale(0.98); }

.tribulation-option.selected {
  border-color: #ffd700;
  background: linear-gradient(90deg, rgba(255,215,0,0.15) 0%, rgba(30,30,50,0.9) 60%);
}

.tribulation-option.normal { border-left: 4px solid #3b82f6; }
.tribulation-option.hard { border-left: 4px solid #f59e0b; }
.tribulation-option.nightmare { border-left: 4px solid #ef4444; }

.trib-icon {
  font-size: 32px;
  margin-right: 12px;
}

.trib-info { flex: 1; }

.trib-name {
  font-size: 15px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 2px;
}

.trib-element {
  font-size: 12px;
  color: #888;
  margin-bottom: 4px;
}

.trib-desc {
  font-size: 12px;
  color: #aaa;
  margin-bottom: 4px;
}

.trib-suitable {
  font-size: 11px;
  color: #22c55e;
  margin-bottom: 4px;
}

.trib-rate {
  font-size: 12px;
  color: #888;
}

.rate-high { color: #22c55e; }
.rate-medium { color: #f59e0b; }
.rate-low { color: #ef4444; }

.trib-select-indicator {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 20px;
  color: #ffd700;
}

.success-rate-section {
  margin-bottom: 16px;
}

.rate-display {
  display: flex;
  align-items: center;
  gap: 20px;
  background: rgba(30,30,50,0.9);
  border-radius: 12px;
  padding: 16px;
}

.rate-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 3px solid;
}

.rate-circle.high { border-color: #22c55e; background: rgba(34,197,94,0.2); }
.rate-circle.medium { border-color: #f59e0b; background: rgba(245,158,11,0.2); }
.rate-circle.low { border-color: #ef4444; background: rgba(239,68,68,0.2); }

.rate-value {
  font-size: 22px;
  font-weight: bold;
  color: #fff;
}

.rate-label {
  font-size: 10px;
  color: #aaa;
}

.rate-breakdown {
  flex: 1;
}

.breakdown-item {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 13px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.breakdown-item:last-child { border-bottom: none; }

.breakdown-label { color: #888; }
.breakdown-value { color: #fff; }
.spirit-bonus { color: #22c55e; }
.protection-bonus { color: #3b82f6; }
.breakdown-item.total .breakdown-value { color: #ffd700; font-weight: bold; }

.protection-section { margin-bottom: 16px; }

.protection-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.protection-item {
  display: flex;
  align-items: center;
  padding: 10px;
  background: rgba(30,30,50,0.9);
  border-radius: 10px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.protection-item.active {
  border-color: #3b82f6;
  background: rgba(59,130,246,0.15);
}

.protection-icon {
  font-size: 28px;
  margin-right: 10px;
}

.protection-name {
  font-size: 14px;
  font-weight: bold;
  color: #fff;
}

.protection-effect {
  font-size: 12px;
  color: #aaa;
}

.protection-count {
  margin-left: auto;
  font-size: 14px;
  color: #ffd700;
}

.protection-check {
  margin-left: 8px;
  font-size: 18px;
  color: #3b82f6;
}

.no-protection {
  text-align: center;
  padding: 16px;
  background: rgba(30,30,50,0.9);
  border-radius: 10px;
  font-size: 13px;
  color: #888;
}

.tip {
  display: block;
  margin-top: 6px;
  color: #f59e0b;
  font-size: 12px;
}

.tribulation-action {
  margin-bottom: 16px;
}

.risk-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(239,68,68,0.15);
  border: 1px solid rgba(239,68,68,0.3);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  color: #ef4444;
  margin-bottom: 10px;
}

.warning-icon { font-size: 16px; }

.tribulation-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-size: 18px;
  font-weight: bold;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  transition: all 0.3s;
}

.tribulation-btn:active:not(:disabled) { transform: scale(0.98); }
.tribulation-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.tribulation-btn.nightmare {
  background: linear-gradient(135deg, #7c3aed, #5b21b6);
}

.btn-loading {
  display: inline-block;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.tribulation-result {
  margin-bottom: 16px;
}

.result-card {
  border-radius: 16px;
  padding: 24px;
  text-align: center;
}

.result-card.success {
  background: linear-gradient(135deg, rgba(34,197,94,0.3), rgba(22,163,74,0.3));
  border: 2px solid #22c55e;
}

.result-card.failure {
  background: linear-gradient(135deg, rgba(239,68,68,0.3), rgba(220,38,38,0.3));
  border: 2px solid #ef4444;
}

.result-icon {
  font-size: 56px;
  margin-bottom: 12px;
}

.result-title {
  font-size: 22px;
  font-weight: bold;
  margin-bottom: 8px;
  color: #fff;
}

.result-card.success .result-title { color: #22c55e; }
.result-card.failure .result-title { color: #ef4444; }

.result-message {
  font-size: 14px;
  color: #aaa;
  margin-bottom: 12px;
}

.result-rewards {
  text-align: left;
  background: rgba(0,0,0,0.3);
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 12px;
}

.reward-title {
  font-size: 13px;
  color: #ffd700;
  margin-bottom: 6px;
}

.reward-item {
  font-size: 13px;
  color: #22c55e;
  padding: 2px 0;
}

.result-close-btn {
  padding: 10px 30px;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  background: rgba(255,255,255,0.15);
  color: #fff;
}

.result-close-btn:active { transform: scale(0.95); }

.history-section { margin-top: 8px; }

.history-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(30,30,50,0.9);
  border-radius: 8px;
  font-size: 12px;
}

.history-item.success .history-icon { color: #22c55e; }
.history-item.failure .history-icon { color: #ef4444; }
.history-text { color: #aaa; }

@media (max-width: 600px) {
  .tribulation-panel {
    width: 95vw;
    max-height: 90vh;
    border-radius: 12px 12px 0 0;
  }
  .tribulation-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  .tribulation-card {
    padding: 10px;
  }
  .tribulation-name {
    font-size: 13px;
  }
  .tribulation-desc {
    font-size: 11px;
  }
  .tribulation-rewards {
    font-size: 11px;
  }
}
</style>
