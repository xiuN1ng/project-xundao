<template>
  <div class="equipment-dismantle-panel">
    <div class="panel-header">
      <div class="panel-title">🔨 装备分解</div>
      <button class="close-btn" @click="closePanel">✕</button>
    </div>
    
    <div class="panel-tip">
      💡 只有绿色及以上品质的装备可以分解
    </div>
    
    <!-- 筛选 -->
    <div class="filter-section">
      <select v-model="qualityFilter" class="filter-select">
        <option value="">全部品质</option>
        <option value="uncommon">优秀(绿)</option>
        <option value="rare">稀有(蓝)</option>
        <option value="epic">史诗(紫)</option>
        <option value="legendary">传说(金)</option>
      </select>
      <button class="quick-btn" @click="selectAllDismantable">全选可分解</button>
    </div>
    
    <!-- 装备列表 -->
    <div class="equipment-list">
      <div 
        v-for="item in filteredEquipment" 
        :key="item.id"
        class="equipment-item"
        :class="{ selected: selectedItems.includes(item.id) }"
        @click="toggleSelection(item.id)"
      >
        <div class="item-icon">{{ item.icon }}</div>
        <div class="item-info">
          <div class="item-name">{{ item.name }}</div>
          <div class="item-quality" :class="'quality-' + item.quality">
            {{ item.qualityName }}
          </div>
          <div class="item-level" v-if="item.level">Lv.{{ item.level }}</div>
        </div>
      </div>
      
      <div v-if="filteredEquipment.length === 0" class="empty-tip">
        没有可分解的装备
      </div>
    </div>
    
    <!-- 分解预览 -->
    <div class="preview-section" v-if="selectedItems.length > 0">
      <div class="preview-title">分解预览</div>
      <div class="preview-rewards">
        <div class="reward-item" v-for="(reward, key) in previewRewards" :key="key">
          <span class="reward-icon">{{ reward.icon }}</span>
          <span class="reward-name">{{ reward.name }}</span>
          <span class="reward-count">+{{ reward.count }}</span>
        </div>
      </div>
    </div>
    
    <!-- 操作栏 -->
    <div class="action-bar">
      <div class="selected-info">
        已选择: {{ selectedItems.length }} 件
      </div>
      <button 
        class="action-btn dismantle-btn" 
        :disabled="selectedItems.length === 0"
        @click="dismantleEquipment"
      >
        🔨 一键分解
      </button>
    </div>
    
    <!-- 结果弹窗 -->
    <div v-if="showResult" class="result-overlay" @click="showResult = false">
      <div class="result-modal" @click.stop>
        <div class="result-title">分解完成!</div>
        <div class="result-rewards">
          <div class="reward-item" v-for="(reward, key) in resultData" :key="key">
            <span class="reward-icon">{{ reward.icon }}</span>
            <span class="reward-name">{{ reward.name }}</span>
            <span class="reward-count">+{{ reward.count }}</span>
          </div>
        </div>
        <button class="confirm-btn" @click="showResult = false">确定</button>
      </div>
    </div>
  </div>
</template>

<script>
const { ref, computed, onMounted } = Vue;

export default {
  name: 'EquipmentDismantlePanel',
  emits: ['close'],
  setup(props, { emit }) {
    const qualityFilter = ref('');
    const selectedItems = ref([]);
    const showResult = ref(false);
    const resultData = ref({});
    
    // 模拟装备数据
    const equipmentList = ref([
      { id: 1, name: '精铁剑', icon: '⚔️', quality: 'uncommon', qualityName: '优秀', level: 10 },
      { id: 2, name: '玄冰甲', icon: '🛡️', quality: 'rare', qualityName: '稀有', level: 15 },
      { id: 3, name: '烈焰刀', icon: '🔪', quality: 'uncommon', qualityName: '优秀', level: 12 },
      { id: 4, name: '紫霞仙衣', icon: '👘', quality: 'epic', qualityName: '史诗', level: 20 },
      { id: 5, name: '八卦盘', icon: '🧿', quality: 'legendary', qualityName: '传说', level: 25 },
      { id: 6, name: '天雷剑', icon: '⚡', quality: 'rare', qualityName: '稀有', level: 18 },
      { id: 7, name: '玄武盾', icon: '🛡️', quality: 'epic', qualityName: '史诗', level: 22 },
      { id: 8, name: '青虹靴', icon: '👢', quality: 'uncommon', qualityName: '优秀', level: 8 },
    ]);
    
    // 品质分解奖励配置
    const rewardConfig = {
      uncommon: { 强化石: { icon: '🪨', name: '强化石', count: 2 }, 金币: { icon: '💰', name: '金币', count: 100 } },
      rare: { 强化石: { icon: '🪨', name: '强化石', count: 5 }, 金币: { icon: '💰', name: '金币', count: 300 }, 进阶石: { icon: '💎', name: '进阶石', count: 1 } },
      epic: { 强化石: { icon: '🪨', name: '强化石', count: 10 }, 金币: { icon: '💰', name: '金币', count: 800 }, 进阶石: { icon: '💎', name: '进阶石', count: 3 }, 炼器符: { icon: '📜', name: '炼器符', count: 1 } },
      legendary: { 强化石: { icon: '🪨', name: '强化石', count: 20 }, 金币: { icon: '💰', name: '金币', count: 2000 }, 进阶石: { icon: '💎', name: '进阶石', count: 5 }, 炼器符: { icon: '📜', name: '炼器符', count: 3 }, 仙晶: { icon: '💠', name: '仙晶', count: 1 } }
    };
    
    const filteredEquipment = computed(() => {
      if (!qualityFilter.value) return equipmentList.value;
      return equipmentList.value.filter(item => item.quality === qualityFilter.value);
    });
    
    const previewRewards = computed(() => {
      const rewards = {};
      selectedItems.value.forEach(id => {
        const item = equipmentList.value.find(e => e.id === id);
        if (item) {
          const config = rewardConfig[item.quality];
          for (const [key, value] of Object.entries(config)) {
            if (rewards[key]) {
              rewards[key].count += value.count;
            } else {
              rewards[key] = { ...value };
            }
          }
        }
      });
      return rewards;
    });
    
    const toggleSelection = (id) => {
      const index = selectedItems.value.indexOf(id);
      if (index > -1) {
        selectedItems.value.splice(index, 1);
      } else {
        selectedItems.value.push(id);
      }
    };
    
    const selectAllDismantable = () => {
      selectedItems.value = filteredEquipment.value.map(item => item.id);
    };
    
    const dismantleEquipment = async () => {
      // 模拟API调用
      try {
        // const response = await fetch('/api/equipment/dismantle', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ itemIds: selectedItems.value })
        // });
        
        // 模拟结果
        resultData.value = { ...previewRewards.value };
        showResult.value = true;
        
        // 移除已分解的装备
        equipmentList.value = equipmentList.value.filter(
          item => !selectedItems.value.includes(item.id)
        );
        selectedItems.value = [];
      } catch (e) {
        console.error('分解失败:', e);
      }
    };
    
    const closePanel = () => {
      emit('close');
    };
    
    onMounted(() => {
      // 可以在这里加载真实数据
    });
    
    return {
      qualityFilter,
      filteredEquipment,
      selectedItems,
      previewRewards,
      showResult,
      resultData,
      toggleSelection,
      selectAllDismantable,
      dismantleEquipment,
      closePanel
    };
  }
};
</script>

<style scoped>
.equipment-dismantle-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 550px;
  max-height: 80vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  border: 2px solid #4a5568;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(90deg, #2d3748 0%, #1a202c 100%);
  border-bottom: 1px solid #4a5568;
}

.panel-title {
  font-size: 20px;
  font-weight: bold;
  color: #ffd700;
}

.close-btn {
  background: none;
  border: none;
  color: #a0aec0;
  font-size: 20px;
  cursor: pointer;
}

.close-btn:hover {
  color: #fff;
}

.panel-tip {
  background: rgba(251, 191, 36, 0.1);
  border-left: 3px solid #fbbf24;
  padding: 10px 16px;
  font-size: 13px;
  color: #fbbf24;
}

.filter-section {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  background: #1a202c;
}

.filter-select {
  flex: 1;
  background: #2d3748;
  border: 1px solid #4a5568;
  border-radius: 6px;
  padding: 8px 12px;
  color: #fff;
  cursor: pointer;
}

.filter-select option {
  background: #1a1a2e;
}

.quick-btn {
  background: #4a5568;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
}

.quick-btn:hover {
  background: #5a6578;
}

.equipment-list {
  flex: 1;
  padding: 12px 16px;
  max-height: 280px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.equipment-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  background: #2d3748;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.equipment-item:hover {
  background: #3d4a5c;
}

.equipment-item.selected {
  border-color: #fbbf24;
  background: #3d4a5c;
}

.item-icon {
  font-size: 28px;
  margin-right: 12px;
}

.item-info {
  flex: 1;
}

.item-name {
  color: #fff;
  font-weight: bold;
  font-size: 14px;
}

.item-quality {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
  margin-top: 2px;
}

.quality-uncommon { background: #22c55e; color: #fff; }
.quality-rare { background: #3b82f6; color: #fff; }
.quality-epic { background: #a855f7; color: #fff; }
.quality-legendary { background: #f59e0b; color: #000; }

.item-level {
  font-size: 11px;
  color: #a0aec0;
  margin-top: 2px;
}

.empty-tip {
  text-align: center;
  color: #a0aec0;
  padding: 40px;
}

.preview-section {
  background: #1a202c;
  padding: 12px 16px;
  border-top: 1px solid #2d3748;
}

.preview-title {
  color: #fbbf24;
  font-weight: bold;
  font-size: 13px;
  margin-bottom: 8px;
}

.preview-rewards {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.reward-item {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #2d3748;
  padding: 6px 12px;
  border-radius: 6px;
}

.reward-icon {
  font-size: 16px;
}

.reward-name {
  color: #a0aec0;
  font-size: 12px;
}

.reward-count {
  color: #22c55e;
  font-weight: bold;
  font-size: 12px;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #1a202c;
  border-top: 1px solid #2d3748;
}

.selected-info {
  color: #a0aec0;
  font-size: 13px;
}

.action-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.dismantle-btn {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: #fff;
}

.dismantle-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dismantle-btn:hover:not(:disabled) {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

.result-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
}

.result-modal {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  border: 2px solid #fbbf24;
}

.result-title {
  font-size: 22px;
  color: #fbbf24;
  font-weight: bold;
  margin-bottom: 16px;
}

.result-rewards {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 20px;
}

.confirm-btn {
  padding: 10px 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
}
</style>
