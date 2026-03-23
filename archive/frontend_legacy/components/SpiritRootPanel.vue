<template>
  <div class="spirit-root-panel">
    <div class="panel-header">
      <div class="panel-title">🌟 灵根系统</div>
      <button class="close-btn" @click="$emit('close')">×</button>
    </div>

    <!-- 当前灵根信息 -->
    <div class="current-root-section">
      <div class="current-root-card" :class="currentRootClass">
        <div class="root-icon">
          <img v-if="getSpiritRootImg(playerData.spiritRoot)" :src="getSpiritRootImg(playerData.spiritRoot)" :alt="playerData.spiritRoot" style="width:48px;height:48px">
          <span v-else>{{ currentRootIcon }}</span>
        </div>
        <div class="root-info">
          <div class="root-name">{{ playerData.spiritRoot || '五行杂灵根' }}</div>
          <div class="root-desc">{{ currentRootData?.desc || '灵根信息加载中...' }}</div>
          <div class="root-stats">
            <span class="stat">修炼速率: ×{{ currentRootData?.spirit_rate || 1 }}</span>
            <span class="stat">攻击加成: ×{{ currentRootData?.atk_bonus || 1 }}</span>
            <span class="stat">防御加成: ×{{ currentRootData?.def_bonus || 1 }}</span>
          </div>
          <div class="root-special" v-if="currentRootData?.special !== '无'">
            <span class="special-tag">{{ currentRootData?.special }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 境界要求提示 -->
    <div class="realm-tip" v-if="currentRootData?.realm_req > 0">
      <span class="tip-icon">📜</span>
      <span>需要境界等级 {{ currentRootData.realm_req }} 才能觉醒此灵根</span>
    </div>

    <!-- 灵根列表 -->
    <div class="root-list-section">
      <div class="section-title">灵根一览</div>
      <div class="root-list">
        <div
          v-for="(root, key) in spiritRootData"
          :key="key"
          class="root-option"
          :class="[
            getRootClass(key),
            { selected: playerData.spiritRoot === key, locked: !canSwitchTo(key) }
          ]"
          @click="handleSelectRoot(key)"
        >
          <div class="root-option-icon">
            <img v-if="getSpiritRootImg(key)" :src="getSpiritRootImg(key)" :alt="key" style="width:36px;height:36px">
            <span v-else>{{ getRootIcon(key) }}</span>
          </div>
          <div class="root-option-info">
            <div class="root-option-name">{{ root.name }}</div>
            <div class="root-option-desc">{{ root.desc }}</div>
            <div class="root-option-bonus">
              <span class="bonus-item">修炼×{{ root.spirit_rate }}</span>
              <span class="bonus-item">攻击×{{ root.atk_bonus }}</span>
              <span class="bonus-item">防御×{{ root.def_bonus }}</span>
            </div>
            <div class="root-option-special" v-if="root.special !== '无'">
              <span class="special-label">{{ root.special }}</span>
            </div>
            <div class="root-option-req" v-if="root.realm_req > 0">
              <span class="req-label">境界要求: {{ root.realm_req }} ({{ getRealmName(root.realm_req) }})</span>
            </div>
          </div>
          <div class="root-option-status">
            <span v-if="playerData.spiritRoot === key" class="status-badge current">当前</span>
            <span v-else-if="canSwitchTo(key)" class="status-badge available">可切换</span>
            <span v-else class="status-badge locked">🔒</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 切换提示 -->
    <div class="switch-tip" v-if="selectedRoot && selectedRoot !== playerData.spiritRoot">
      <div class="tip-box">
        <span class="tip-text">确定切换为「{{ selectedRoot }}」吗？</span>
        <div class="tip-buttons">
          <button class="confirm-btn" @click="confirmSwitch">确认切换</button>
          <button class="cancel-btn" @click="selectedRoot = null">取消</button>
        </div>
      </div>
    </div>

    <!-- 切换成功提示 -->
    <div class="switch-success" v-if="showSuccess">
      <span>✅ 灵根切换成功！</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

const props = defineProps({
  player: {
    type: Object,
    default: () => ({})
  }
});

defineEmits(['close']);

const playerData = ref({});
const spiritRootData = ref({});
const selectedRoot = ref(null);
const showSuccess = ref(false);

const REALM_NAMES = ['凡人', '炼气', '筑基', '金丹', '元婴', '化神', '炼虚', '合体', '大乘', '飞升'];

const ICONS = {
  '五行杂灵根': '🔮',
  '火灵根': '🔥',
  '水灵根': '💧',
  '木灵根': '🌿',
  '金属性': '⚔️',
  '土灵根': '🪨',
  '天灵根': '⭐',
  '混沌灵根': '🌌'
};

// 灵根名称到图标key的映射
const SPIRIT_ROOT_KEY_MAP = {
  '金属性': 'metal',
  '木灵根': 'wood',
  '水灵根': 'water',
  '火灵根': 'fire',
  '土灵根': 'earth',
};

// 获取灵根图标图片URL
function getSpiritRootImg(rootName) {
  const key = SPIRIT_ROOT_KEY_MAP[rootName];
  if (key && window.SPIRIT_ROOT_ICONS && window.SPIRIT_ROOT_ICONS[key]) {
    return window.SPIRIT_ROOT_ICONS[key];
  }
  return null;
}

onMounted(() => {
  loadData();
});

function loadData() {
  // 获取玩家数据
  try {
    const parsed = JSON.parse(localStorage.getItem('idleCultivationGame') || '{}');
    const p = parsed.gameState?.player || {};
    playerData.value = { ...props.player, ...p };

    // 获取灵根数据
    if (window.SPIRIT_ROOT_DATA) {
      spiritRootData.value = window.SPIRIT_ROOT_DATA;
    }
  } catch (e) {
    playerData.value = { ...props.player };
    spiritRootData.value = window.SPIRIT_ROOT_DATA || {};
  }
}

const currentRootData = computed(() => {
  return spiritRootData.value[playerData.value.spiritRoot] || spiritRootData.value['五行杂灵根'];
});

const currentRootClass = computed(() => {
  const name = playerData.value.spiritRoot || '五行杂灵根';
  return getRootClass(name);
});

const currentRootIcon = computed(() => {
  return ICONS[playerData.value.spiritRoot] || '🔮';
});

function getRootIcon(name) {
  return ICONS[name] || '✨';
}

function getRootClass(name) {
  const cls = {
    '五行杂灵根': 'mixed',
    '火灵根': 'fire',
    '水灵根': 'water',
    '木灵根': 'wood',
    '金属性': 'metal',
    '土灵根': 'earth',
    '天灵根': 'heaven',
    '混沌灵根': 'chaos'
  };
  return cls[name] || 'mixed';
}

function canSwitchTo(rootName) {
  const root = spiritRootData.value[rootName];
  if (!root) return false;
  if (root.realm_req === 0) return true;
  const realmOrder = getRealmOrder(playerData.value.realmName);
  return realmOrder >= root.realm_req;
}

function getRealmOrder(realmName) {
  return REALM_NAMES.indexOf(realmName || '凡人');
}

function getRealmName(order) {
  return REALM_NAMES[order] || `境界${order}`;
}

function handleSelectRoot(key) {
  if (playerData.value.spiritRoot === key) return;
  if (!canSwitchTo(key)) {
    const root = spiritRootData.value[key];
    if (root?.realm_req > 0) {
      showToast(`需要境界达到 ${getRealmName(root.realm_req)} 才能切换至此灵根`, 'error');
    }
    return;
  }
  selectedRoot.value = key;
}

async function confirmSwitch() {
  if (!selectedRoot.value) return;
  try {
    const res = await fetch('/api/game/switch-spirit-root', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spiritRoot: selectedRoot.value })
    });
    const data = await res.json();
    if (data.success) {
      playerData.value.spiritRoot = selectedRoot.value;
      showSuccess.value = true;
      selectedRoot.value = null;
      setTimeout(() => { showSuccess.value = false; }, 2000);
      // 更新localStorage
      try {
        const parsed = JSON.parse(localStorage.getItem('idleCultivationGame') || '{}');
        if (parsed.gameState?.player) {
          parsed.gameState.player.spiritRoot = selectedRoot.value;
          localStorage.setItem('idleCultivationGame', JSON.stringify(parsed));
        }
      } catch (e) {}
    } else {
      showToast(data.message || '切换失败', 'error');
    }
  } catch (e) {
    // fallback: 直接本地切换
    playerData.value.spiritRoot = selectedRoot.value;
    showSuccess.value = true;
    selectedRoot.value = null;
    setTimeout(() => { showSuccess.value = false; }, 2000);
  }
}
</script>

<style scoped>
.spirit-root-panel {
  background: linear-gradient(rgba(26, 26, 46, 0.88), rgba(22, 33, 62, 0.92)), url('../assets/bg-cultivation-20260321-050042.png') center/cover no-repeat;
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

.current-root-section {
  margin-bottom: 16px;
}

.current-root-card {
  display: flex;
  align-items: center;
  padding: 16px;
  border-radius: 14px;
  background: rgba(255,255,255,0.05);
  border: 2px solid #ffd700;
}

.current-root-card.fire { border-color: #ef4444; }
.current-root-card.water { border-color: #3b82f6; }
.current-root-card.wood { border-color: #22c55e; }
.current-root-card.metal { border-color: #d4af37; }
.current-root-card.earth { border-color: #8b4513; }
.current-root-card.heaven { border-color: #a855f7; }
.current-root-card.chaos { border-color: #ec4899; }

.root-icon {
  font-size: 48px;
  margin-right: 16px;
}

.root-info {
  flex: 1;
}

.root-name {
  font-size: 18px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 4px;
}

.root-desc {
  font-size: 13px;
  color: #aaa;
  margin-bottom: 8px;
}

.root-stats {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #ccc;
  flex-wrap: wrap;
}

.stat {
  background: rgba(255,255,255,0.1);
  padding: 2px 8px;
  border-radius: 10px;
}

.root-special {
  margin-top: 6px;
}

.special-tag {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  color: #fff;
}

.realm-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(168, 85, 247, 0.2);
  border: 1px solid rgba(168, 85, 247, 0.4);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  color: #a855f7;
  margin-bottom: 16px;
}

.root-list-section {
  margin-bottom: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #ffd700;
  margin-bottom: 12px;
}

.root-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.root-option {
  display: flex;
  align-items: center;
  padding: 12px;
  background: rgba(30, 30, 50, 0.9);
  border-radius: 12px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.3s;
}

.root-option:active { transform: scale(0.98); }

.root-option.selected {
  border-color: #ffd700;
  background: linear-gradient(90deg, rgba(255,215,0,0.15) 0%, rgba(30,30,50,0.9) 60%);
}

.root-option.locked {
  opacity: 0.5;
  cursor: not-allowed;
}

.root-option.fire { border-left: 4px solid #ef4444; }
.root-option.water { border-left: 4px solid #3b82f6; }
.root-option.wood { border-left: 4px solid #22c55e; }
.root-option.metal { border-left: 4px solid #d4af37; }
.root-option.earth { border-left: 4px solid #8b4513; }
.root-option.heaven { border-left: 4px solid #a855f7; }
.root-option.chaos { border-left: 4px solid #ec4899; }

.root-option-icon {
  font-size: 32px;
  margin-right: 12px;
}

.root-option-info {
  flex: 1;
}

.root-option-name {
  font-size: 15px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 2px;
}

.root-option-desc {
  font-size: 12px;
  color: #888;
  margin-bottom: 4px;
}

.root-option-bonus {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.bonus-item {
  font-size: 11px;
  color: #aaa;
  background: rgba(255,255,255,0.08);
  padding: 1px 6px;
  border-radius: 6px;
}

.root-option-special {
  margin-top: 4px;
}

.special-label {
  font-size: 11px;
  color: #f59e0b;
}

.root-option-req {
  margin-top: 4px;
}

.req-label {
  font-size: 11px;
  color: #a855f7;
}

.root-option-status {
  margin-left: 10px;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
}

.status-badge.current {
  background: linear-gradient(135deg, #ffd700, #d97706);
  color: #000;
  font-weight: bold;
}

.status-badge.available {
  background: rgba(34, 197, 94, 0.3);
  color: #22c55e;
  border: 1px solid #22c55e;
}

.status-badge.locked {
  font-size: 18px;
}

.switch-tip {
  margin-top: 12px;
}

.tip-box {
  background: rgba(255,215,0,0.1);
  border: 1px solid rgba(255,215,0,0.3);
  border-radius: 12px;
  padding: 12px;
  text-align: center;
}

.tip-text {
  display: block;
  margin-bottom: 10px;
  font-size: 14px;
  color: #ffd700;
}

.tip-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.confirm-btn, .cancel-btn {
  padding: 8px 20px;
  border-radius: 20px;
  border: none;
  font-size: 14px;
  cursor: pointer;
}

.confirm-btn {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: #fff;
}

.cancel-btn {
  background: rgba(255,255,255,0.1);
  color: #aaa;
}

.switch-success {
  position: fixed;
  bottom: 120px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(34, 197, 94, 0.9);
  color: #fff;
  padding: 10px 24px;
  border-radius: 20px;
  font-size: 14px;
  z-index: 10000;
  animation: fadeInUp 0.3s;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateX(-50%) translateY(10px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

@media (max-width: 600px) {
  .spirit-root-panel {
    width: 95vw;
    max-height: 90vh;
    border-radius: 12px 12px 0 0;
    top: 5%;
    transform: translateX(-50%);
  }
  .spirit-root-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  .spirit-root-card {
    padding: 10px;
  }
  .root-name {
    font-size: 14px;
  }
  .root-desc {
    font-size: 11px;
  }
  .confirm-btn, .cancel-btn {
    padding: 10px;
    font-size: 13px;
  }
}
</style>
