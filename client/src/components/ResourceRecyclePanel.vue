<template>
  <div class="recycle-panel">
    <div class="recycle-header">
      <div class="recycle-title">♻️ 一键回收</div>
      <button class="close-btn" @click="$emit('close')">×</button>
    </div>
    
    <!-- 回收统计 -->
    <div class="recycle-summary">
      <div class="summary-item">
        <span class="summary-icon">💰</span>
        <span class="summary-label">灵石回收</span>
        <span class="summary-value">+{{ totalStone }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-icon">💎</span>
        <span class="summary-label">元宝回收</span>
        <span class="summary-value">+{{ totalGold }}</span>
      </div>
    </div>
    
    <!-- 全选控制 -->
    <div class="select-controls">
      <label class="checkbox-label">
        <input type="checkbox" v-model="selectAll" @change="toggleSelectAll">
        <span>全选</span>
      </label>
      <span class="select-count">已选 {{ selectedCount }}/{{ recyclables.length }} 项</span>
    </div>
    
    <!-- 可回收资源列表 -->
    <div class="recycle-list">
      <div 
        v-for="item in recyclables" 
        :key="item.id"
        class="recycle-item"
        :class="{ selected: item.selected }"
        @click="toggleSelect(item)"
      >
        <div class="item-checkbox">
          <span v-if="item.selected">✅</span>
          <span v-else>⬜</span>
        </div>
        <div class="item-icon">{{ item.icon }}</div>
        <div class="item-info">
          <div class="item-name">{{ item.name }}</div>
          <div class="item-desc">{{ item.desc }}</div>
        </div>
        <div class="item-rewards">
          <span class="reward-stone" v-if="item.stone > 0">💰{{ item.stone }}</span>
          <span class="reward-gold" v-if="item.gold > 0">💎{{ item.gold }}</span>
        </div>
      </div>
    </div>
    
    <!-- 确认回收按钮 -->
    <button 
      class="recycle-btn" 
      :class="{ disabled: selectedCount === 0 }"
      :disabled="selectedCount === 0"
      @click="confirmRecycle"
    >
      🔄 确认回收
    </button>
  </div>
</template>

<script>
const { ref, computed, onMounted } = Vue;

export default {
  name: 'ResourceRecyclePanel',
  emits: ['close', 'recycle'],
  setup(props, { emit }) {
    const selectAll = ref(false);
    
    // 可回收资源模拟数据
    const recyclables = ref([
      { id: 1, name: '强化石', icon: '🪨', desc: '白色强化石', stone: 100, gold: 0, selected: true },
      { id: 2, name: '低级装备', icon: '⚔️', desc: '1阶武器', stone: 50, gold: 5, selected: true },
      { id: 3, name: '灵草', icon: '🌿', desc: '普通灵草', stone: 20, gold: 0, selected: false },
      { id: 4, name: '破损装备', icon: '🛡️', desc: '破损的护甲', stone: 30, gold: 2, selected: true },
      { id: 5, name: '灵石碎片', icon: '💎', desc: '散落灵石', stone: 80, gold: 0, selected: false },
      { id: 6, name: '中级材料', icon: '🔧', desc: '精铁x5', stone: 150, gold: 10, selected: true },
      { id: 7, name: '过期丹药', icon: '💊', desc: '灵气丹(过期)', stone: 10, gold: 0, selected: false },
      { id: 8, name: '废弃法宝', icon: '🧿', desc: '损坏的八卦盘', stone: 200, gold: 20, selected: true },
    ]);
    
    const selectedCount = computed(() => {
      return recyclables.value.filter(item => item.selected).length;
    });
    
    const totalStone = computed(() => {
      return recyclables.value
        .filter(item => item.selected)
        .reduce((sum, item) => sum + item.stone, 0);
    });
    
    const totalGold = computed(() => {
      return recyclables.value
        .filter(item => item.selected)
        .reduce((sum, item) => sum + item.gold, 0);
    });
    
    const toggleSelect = (item) => {
      item.selected = !item.selected;
      selectAll.value = selectedCount.value === recyclables.value.length;
    };
    
    const toggleSelectAll = () => {
      recyclables.value.forEach(item => {
        item.selected = selectAll.value;
      });
    };
    
    const confirmRecycle = () => {
      if (selectedCount.value === 0) return;
      
      // 触发回收事件
      emit('recycle', {
        stone: totalStone.value,
        gold: totalGold.value,
        items: recyclables.value.filter(item => item.selected)
      });
      
      // 模拟回收后移除已选中的物品
      recyclables.value = recyclables.value.filter(item => !item.selected);
      selectAll.value = false;
      
      console.log('回收成功:', { stone: totalStone.value, gold: totalGold.value });
    };
    
    return {
      selectAll,
      recyclables,
      selectedCount,
      totalStone,
      totalGold,
      toggleSelect,
      toggleSelectAll,
      confirmRecycle
    };
  }
};
</script>

<style scoped>
.recycle-panel {
  width: 420px;
  max-height: 550px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 20px;
  color: #fff;
}

.recycle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.recycle-title {
  font-size: 22px;
  font-weight: bold;
}

.close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #fff;
}

.recycle-summary {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  padding: 15px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
}

.summary-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-icon {
  font-size: 20px;
}

.summary-label {
  font-size: 12px;
  color: #aaa;
}

.summary-value {
  font-size: 16px;
  font-weight: bold;
  color: #ffd700;
}

.select-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
}

.checkbox-label input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.select-count {
  font-size: 12px;
  color: #888;
}

.recycle-list {
  max-height: 300px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
  padding-right: 5px;
}

.recycle-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.recycle-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.recycle-item.selected {
  border-color: #4ade80;
  background: rgba(74, 222, 128, 0.1);
}

.item-checkbox {
  font-size: 16px;
}

.item-icon {
  font-size: 24px;
}

.item-info {
  flex: 1;
}

.item-name {
  font-size: 14px;
  font-weight: bold;
}

.item-desc {
  font-size: 11px;
  color: #888;
}

.item-rewards {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.reward-stone {
  font-size: 12px;
  color: #ffd700;
}

.reward-gold {
  font-size: 12px;
  color: #60a5fa;
}

.recycle-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.recycle-btn:hover:not(.disabled) {
  transform: scale(1.02);
  box-shadow: 0 4px 15px rgba(74, 222, 128, 0.4);
}

.recycle-btn.disabled {
  background: rgba(255, 255, 255, 0.1);
  color: #888;
  cursor: not-allowed;
}
</style>
