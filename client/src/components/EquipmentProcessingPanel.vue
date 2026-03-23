<template>
  <div class="equipment-processing-panel">
    <div class="panel-header">
      <div class="panel-title">⚙️ 装备处理</div>
      <button class="close-btn" @click="closePanel">✕</button>
    </div>
    
    <div class="panel-tabs">
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'decompose' }"
        @click="activeTab = 'decompose'"
      >
        🔨 分解
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'synthesize' }"
        @click="activeTab = 'synthesize'"
      >
        ✨ 合成
      </button>
    </div>
    
    <!-- 分解界面 -->
    <div v-if="activeTab === 'decompose'" class="tab-content">
      <div class="info-section">
        <div class="info-title">💡 分解说明</div>
        <div class="info-text">
          选择装备进行分解，可获得强化石和金币
        </div>
      </div>
      
      <div class="equipment-list">
        <div 
          v-for="item in equipmentItems" 
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
          </div>
          <div class="item-rewards">
            <span>🪨 +{{ item.stoneReward }}</span>
            <span>💰 +{{ item.goldReward }}</span>
          </div>
        </div>
      </div>
      
      <div class="action-bar">
        <div class="selected-info">
          已选择: {{ selectedItems.length }} 件
        </div>
        <button 
          class="action-btn decompose-btn" 
          :disabled="selectedItems.length === 0"
          @click="decomposeEquipment"
        >
          🔨 分解装备
        </button>
      </div>
    </div>
    
    <!-- 合成界面 -->
    <div v-if="activeTab === 'synthesize'" class="tab-content">
      <div class="synthesize-section">
        <div class="synthesize-target">
          <div class="target-label">目标装备</div>
          <div v-if="targetEquipment" class="target-equipment">
            <div class="target-icon">{{ targetEquipment.icon }}</div>
            <div class="target-name">{{ targetEquipment.name }}</div>
            <div class="target-quality" :class="'quality-' + targetEquipment.quality">
              {{ targetEquipment.qualityName }}
            </div>
          </div>
          <div v-else class="target-placeholder">
            点击下方材料选择目标
          </div>
        </div>
        
        <div class="synthesize-materials">
          <div class="materials-label">材料 (需3件同名装备)</div>
          <div class="materials-grid">
            <div 
              v-for="(material, index) in materials" 
              :key="index"
              class="material-slot"
              :class="{ filled: material }"
              @click="selectMaterial(material, index)"
            >
              <span v-if="material">{{ material.icon }}</span>
              <span v-else>+</span>
            </div>
          </div>
          <div class="synthesize-cost">
            <span>💰 合成费用: {{ synthesizeCost }}</span>
          </div>
        </div>
        
        <button 
          class="action-btn synthesize-btn"
          :disabled="!canSynthesize"
          @click="synthesizeEquipment"
        >
          ✨ 开始合成
        </button>
      </div>
    </div>
    
    <!-- 分解结果弹窗 -->
    <div v-if="showResult" class="result-overlay" @click="showResult = false">
      <div class="result-modal" @click.stop>
        <div class="result-title">分解完成!</div>
        <div class="result-rewards">
          <div class="reward-item">
            <span class="reward-icon">🪨</span>
            <span class="reward-name">强化石</span>
            <span class="reward-count">+{{ resultData.stones }}</span>
          </div>
          <div class="reward-item">
            <span class="reward-icon">💰</span>
            <span class="reward-name">金币</span>
            <span class="reward-count">+{{ resultData.gold }}</span>
          </div>
        </div>
        <button class="confirm-btn" @click="showResult = false">确定</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'EquipmentProcessingPanel',
  emits: ['close'],
  setup(props, { emit }) {
    const activeTab = ref('decompose');
    const equipmentItems = ref([]);
    const selectedItems = ref([]);
    const materials = ref([null, null, null]);
    const targetEquipment = ref(null);
    const showResult = ref(false);
    const resultData = ref({ stones: 0, gold: 0 });
    const synthesizeCost = ref(1000);
    
    const canSynthesize = computed(() => {
      return targetEquipment.value && materials.value.every(m => m !== null);
    });
    
    const toggleSelection = (id) => {
      const index = selectedItems.value.indexOf(id);
      if (index > -1) {
        selectedItems.value.splice(index, 1);
      } else {
        selectedItems.value.push(id);
      }
    };
    
    const decomposeEquipment = async () => {
      try {
        const response = await fetch('/api/equipment/decompose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemIds: selectedItems.value })
        });
        const data = await response.json();
        if (data.success) {
          resultData.value = { stones: data.stones, gold: data.gold };
          showResult.value = true;
          selectedItems.value = [];
          loadEquipment();
        }
      } catch (e) {
        console.error('分解失败:', e);
      }
    };
    
    const selectMaterial = (material, index) => {
      if (material) {
        materials.value[index] = null;
        checkSynthesizeTarget();
      }
    };
    
    const checkSynthesizeTarget = () => {
      const filled = materials.value.filter(m => m !== null);
      if (filled.length > 0) {
        const first = filled[0];
        targetEquipment.value = {
          ...first,
          quality: first.quality === 'legendary' ? 'epic' : 
                   first.quality === 'epic' ? 'rare' : 'uncommon'
        };
      }
    };
    
    const synthesizeEquipment = async () => {
      try {
        const response = await fetch('/api/equipment/synthesize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            materials: materials.value.map(m => m.id),
            targetId: targetEquipment.value.id
          })
        });
        const data = await response.json();
        if (data.success) {
          alert('合成成功!获得: ' + data.equipment.name);
          materials.value = [null, null, null];
          targetEquipment.value = null;
        }
      } catch (e) {
        console.error('合成失败:', e);
      }
    };
    
    const loadEquipment = async () => {
      try {
        const response = await fetch('/api/player/bag?type=equipment');
        const data = await response.json();
        equipmentItems.value = data.items || [];
      } catch (e) {
        console.error('加载装备失败:', e);
      }
    };
    
    const closePanel = () => {
      emit('close');
    };
    
    onMounted(() => {
      loadEquipment();
    });
    
    return {
      activeTab,
      equipmentItems,
      selectedItems,
      materials,
      targetEquipment,
      showResult,
      resultData,
      synthesizeCost,
      canSynthesize,
      toggleSelection,
      decomposeEquipment,
      selectMaterial,
      synthesizeEquipment,
      closePanel
    };
  }
};
</script>

<style scoped>
.equipment-processing-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  max-height: 80vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  border: 2px solid #4a5568;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  overflow: hidden;
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

.panel-tabs {
  display: flex;
  padding: 12px 20px;
  gap: 10px;
  background: #1a202c;
}

.tab-btn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 8px;
  background: #2d3748;
  color: #a0aec0;
  cursor: pointer;
  transition: all 0.3s;
}

.tab-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.tab-content {
  padding: 20px;
  max-height: 400px;
  overflow-y: auto;
}

.info-section {
  background: #2d3748;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
}

.info-title {
  color: #ffd700;
  font-weight: bold;
  margin-bottom: 6px;
}

.info-text {
  color: #a0aec0;
  font-size: 14px;
}

.equipment-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.equipment-item {
  display: flex;
  align-items: center;
  padding: 10px;
  background: #2d3748;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.equipment-item:hover {
  background: #3d4a5c;
}

.equipment-item.selected {
  border-color: #667eea;
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
}

.item-quality {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  display: inline-block;
}

.quality-common { background: #9ca3af; color: #000; }
.quality-uncommon { background: #22c55e; color: #fff; }
.quality-rare { background: #3b82f6; color: #fff; }
.quality-epic { background: #a855f7; color: #fff; }
.quality-legendary { background: #f59e0b; color: #000; }

.item-rewards {
  display: flex;
  gap: 8px;
  color: #a0aec0;
  font-size: 12px;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.selected-info {
  color: #a0aec0;
}

.action-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.decompose-btn {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: #fff;
}

.synthesize-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  width: 100%;
  margin-top: 16px;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.synthesize-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.synthesize-target,
.synthesize-materials {
  background: #2d3748;
  border-radius: 8px;
  padding: 16px;
}

.target-label,
.materials-label {
  color: #ffd700;
  font-weight: bold;
  margin-bottom: 12px;
}

.target-equipment {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #1a202c;
  border-radius: 8px;
}

.target-icon {
  font-size: 36px;
}

.target-name {
  color: #fff;
  font-weight: bold;
}

.target-placeholder {
  color: #a0aec0;
  text-align: center;
  padding: 20px;
}

.materials-grid {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.material-slot {
  width: 60px;
  height: 60px;
  border: 2px dashed #4a5568;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  cursor: pointer;
  transition: all 0.3s;
}

.material-slot.filled {
  border-style: solid;
  border-color: #667eea;
}

.synthesize-cost {
  text-align: center;
  color: #ffd700;
  margin-top: 12px;
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
  border: 2px solid #ffd700;
}

.result-title {
  font-size: 24px;
  color: #ffd700;
  font-weight: bold;
  margin-bottom: 16px;
}

.result-rewards {
  display: flex;
  gap: 20px;
  justify-content: center;
  margin-bottom: 20px;
}

.reward-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.reward-icon {
  font-size: 32px;
}

.reward-name {
  color: #a0aec0;
}

.reward-count {
  color: #22c55e;
  font-weight: bold;
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
