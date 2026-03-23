<template>
  <div class="material-synthesis-panel">
    <div class="panel-header">
      <div class="panel-title">✨ 材料合成</div>
      <button class="close-btn" @click="closePanel">✕</button>
    </div>
    
    <div class="panel-tip">
      💡 选择材料进行合成，合成需要消耗金币
    </div>
    
    <!-- 材料分类 -->
    <div class="category-tabs">
      <button 
        v-for="cat in categories" 
        :key="cat.id"
        class="tab-btn"
        :class="{ active: activeCategory === cat.id }"
        @click="activeCategory = cat.id"
      >
        {{ cat.icon }} {{ cat.name }}
      </button>
    </div>
    
    <!-- 当前材料 -->
    <div class="materials-section">
      <div class="section-title">我的材料</div>
      <div class="materials-grid">
        <div 
          v-for="item in currentMaterials" 
          :key="item.id"
          class="material-item"
          :class="{ selected: selectedMaterial?.id === item.id }"
          @click="selectMaterial(item)"
        >
          <div class="material-icon">{{ item.icon }}</div>
          <div class="material-name">{{ item.name }}</div>
          <div class="material-count">x{{ item.count }}</div>
        </div>
        
        <div v-if="currentMaterials.length === 0" class="empty-tip">
          暂无材料
        </div>
      </div>
    </div>
    
    <!-- 合成预览 -->
    <div class="synthesis-preview" v-if="selectedMaterial">
      <div class="preview-header">
        <span>合成目标: </span>
        <span class="target-name">{{ synthesisTarget.name }}</span>
      </div>
      
      <div class="preview-content">
        <div class="preview-materials">
          <div class="materials-required">
            <span>所需材料:</span>
          </div>
          <div class="material-cost">
            <div class="cost-item">
              <span class="cost-icon">{{ selectedMaterial.icon }}</span>
              <span class="cost-name">{{ selectedMaterial.name }}</span>
              <span class="cost-count" :class="{ enough: selectedMaterial.count >= synthesisTarget.costCount }">
                {{ selectedMaterial.count }}/{{ synthesisTarget.costCount }}
              </span>
            </div>
          </div>
          <div class="gold-cost">
            <span>💰 金币消耗: {{ synthesisTarget.goldCost }}</span>
          </div>
        </div>
        
        <div class="preview-arrow">➡️</div>
        
        <div class="preview-result">
          <div class="result-label">产出</div>
          <div class="result-item">
            <span class="result-icon">{{ synthesisTarget.resultIcon }}</span>
            <span class="result-name">{{ synthesisTarget.resultName }}</span>
            <span class="result-count">x{{ synthesisTarget.resultCount }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 操作栏 -->
    <div class="action-bar">
      <div class="synthesis-info" v-if="selectedMaterial">
        <span v-if="selectedMaterial.count >= synthesisTarget.costCount" class="can-synthesize">
          ✅ 材料充足
        </span>
        <span v-else class="cannot-synthesize">
          ❌ 材料不足
        </span>
      </div>
      <button 
        class="action-btn synthesis-btn"
        :disabled="!canSynthesize"
        @click="synthesizeMaterial"
      >
        ✨ 一键合成
      </button>
    </div>
    
    <!-- 结果弹窗 -->
    <div v-if="showResult" class="result-overlay" @click="showResult = false">
      <div class="result-modal" @click.stop>
        <div class="result-title">合成成功!</div>
        <div class="result-content">
          <div class="result-item-display">
            <span class="result-icon">{{ resultData.icon }}</span>
            <span class="result-name">{{ resultData.name }}</span>
            <span class="result-count">x{{ resultData.count }}</span>
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
  name: 'MaterialSynthesisPanel',
  emits: ['close'],
  setup(props, { emit }) {
    const activeCategory = ref('weapon');
    const selectedMaterial = ref(null);
    const showResult = ref(false);
    const resultData = ref({});
    
    const categories = [
      { id: 'weapon', name: '武器', icon: '⚔️' },
      { id: 'armor', name: '防具', icon: '🛡️' },
      { id: 'accessory', name: '饰品', icon: '💍' },
      { id: 'material', name: '炼器', icon: '🔧' }
    ];
    
    // 模拟材料数据
    const materialsData = ref({
      weapon: [
        { id: 1, name: '精铁', icon: '🪨', quality: 'uncommon', count: 5, category: 'weapon' },
        { id: 2, name: '陨铁', icon: '🌑', quality: 'rare', count: 3, category: 'weapon' },
        { id: 3, name: '天外玄铁', icon: '⭐', quality: 'epic', count: 1, category: 'weapon' },
      ],
      armor: [
        { id: 4, name: '灵绸', icon: '🎭', quality: 'uncommon', count: 8, category: 'armor' },
        { id: 5, name: '冰蚕丝', icon: '🧣', quality: 'rare', count: 2, category: 'armor' },
        { id: 6, name: '九幽蚕衣', icon: '👘', quality: 'epic', count: 0, category: 'armor' },
      ],
      accessory: [
        { id: 7, name: '普通宝石', icon: '💎', quality: 'common', count: 10, category: 'accessory' },
        { id: 8, name: '精致宝石', icon: '💠', quality: 'uncommon', count: 4, category: 'accessory' },
        { id: 9, name: '完美宝石', icon: '🔮', quality: 'rare', count: 1, category: 'accessory' },
      ],
      material: [
        { id: 10, name: '炼器符', icon: '📜', quality: 'uncommon', count: 5, category: 'material' },
        { id: 11, name: '进阶石', icon: '💠', quality: 'rare', count: 3, category: 'material' },
        { id: 12, name: '仙晶', icon: '💎', quality: 'legendary', count: 0, category: 'material' },
      ]
    });
    
    // 合成配方配置
    const synthesisRecipes = {
      1: { resultId: 2, resultName: '陨铁', resultIcon: '🌑', resultCount: 1, costCount: 3, goldCost: 500 },
      2: { resultId: 3, resultName: '天外玄铁', resultIcon: '⭐', resultCount: 1, costCount: 3, goldCost: 1500 },
      4: { resultId: 5, resultName: '冰蚕丝', resultIcon: '🧣', resultCount: 1, costCount: 3, goldCost: 600 },
      5: { resultId: 6, resultName: '九幽蚕衣', resultIcon: '👘', resultCount: 1, costCount: 3, goldCost: 1800 },
      7: { resultId: 8, resultName: '精致宝石', resultIcon: '💠', resultCount: 1, costCount: 3, goldCost: 200 },
      8: { resultId: 9, resultName: '完美宝石', resultIcon: '🔮', resultCount: 1, costCount: 3, goldCost: 800 },
      10: { resultId: 11, resultName: '进阶石', resultIcon: '💠', resultCount: 1, costCount: 3, goldCost: 400 },
      11: { resultId: 12, resultName: '仙晶', resultIcon: '💎', resultCount: 1, costCount: 5, goldCost: 3000 },
    };
    
    const currentMaterials = computed(() => {
      return materialsData.value[activeCategory.value] || [];
    });
    
    const synthesisTarget = computed(() => {
      if (!selectedMaterial.value) return null;
      
      const recipe = synthesisRecipes[selectedMaterial.value.id];
      if (!recipe) {
        // 没有更高一级的合成
        return {
          name: selectedMaterial.value.name,
          resultName: '无合成配方',
          resultIcon: '❓',
          resultCount: 0,
          costCount: 0,
          goldCost: 0
        };
      }
      
      return {
        name: selectedMaterial.value.name,
        resultName: recipe.resultName,
        resultIcon: recipe.resultIcon,
        resultCount: recipe.resultCount,
        costCount: recipe.costCount,
        goldCost: recipe.goldCost
      };
    });
    
    const canSynthesize = computed(() => {
      if (!selectedMaterial.value || !synthesisTarget.value) return false;
      if (synthesisTarget.value.resultName === '无合成配方') return false;
      return selectedMaterial.value.count >= synthesisTarget.value.costCount;
    });
    
    const selectMaterial = (item) => {
      if (item.count > 0) {
        selectedMaterial.value = selectedMaterial.value?.id === item.id ? null : item;
      }
    };
    
    const synthesizeMaterial = async () => {
      if (!canSynthesize.value) return;
      
      try {
        // 模拟API调用
        // const response = await fetch('/api/material/synthesize', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ materialId: selectedMaterial.value.id })
        // });
        
        // 模拟结果
        const recipe = synthesisRecipes[selectedMaterial.value.id];
        resultData.value = {
          icon: recipe.resultIcon,
          name: recipe.resultName,
          count: recipe.resultCount
        };
        
        // 扣减材料
        const mat = materialsData.value[activeCategory.value].find(
          m => m.id === selectedMaterial.value.id
        );
        if (mat) {
          mat.count -= recipe.costCount;
        }
        
        // 添加产物（如果有的话）
        const resultMat = materialsData.value[activeCategory.value].find(
          m => m.name === recipe.resultName
        );
        if (resultMat) {
          resultMat.count += recipe.resultCount;
        } else {
          materialsData.value[activeCategory.value].push({
            id: recipe.resultId,
            name: recipe.resultName,
            icon: recipe.resultIcon,
            quality: 'rare',
            count: recipe.resultCount,
            category: activeCategory.value
          });
        }
        
        showResult.value = true;
        
        // 更新选中状态
        const updatedMat = materialsData.value[activeCategory.value].find(
          m => m.id === selectedMaterial.value.id
        );
        if (updatedMat && updatedMat.count > 0) {
          selectedMaterial.value = updatedMat;
        } else {
          selectedMaterial.value = null;
        }
      } catch (e) {
        console.error('合成失败:', e);
      }
    };
    
    const closePanel = () => {
      emit('close');
    };
    
    return {
      categories,
      activeCategory,
      currentMaterials,
      selectedMaterial,
      synthesisTarget,
      canSynthesize,
      showResult,
      resultData,
      selectMaterial,
      synthesizeMaterial,
      closePanel
    };
  }
};
</script>

<style scoped>
.material-synthesis-panel {
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
  color: #a78bfa;
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
  background: rgba(167, 139, 250, 0.1);
  border-left: 3px solid #a78bfa;
  padding: 10px 16px;
  font-size: 13px;
  color: #a78bfa;
}

.category-tabs {
  display: flex;
  padding: 10px 16px;
  gap: 8px;
  background: #1a202c;
}

.tab-btn {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  background: #2d3748;
  color: #a0aec0;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.tab-btn.active {
  background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%);
  color: #fff;
}

.tab-btn:hover:not(.active) {
  background: #3d4a5c;
}

.materials-section {
  flex: 1;
  padding: 12px 16px;
  max-height: 200px;
  overflow-y: auto;
}

.section-title {
  color: #a0aec0;
  font-size: 13px;
  margin-bottom: 10px;
}

.materials-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.material-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  background: #2d3748;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.material-item:hover {
  background: #3d4a5c;
}

.material-item.selected {
  border-color: #a78bfa;
  background: #3d4a5c;
}

.material-item[style*="opacity: 0.5"] {
  opacity: 0.5;
  cursor: not-allowed;
}

.material-icon {
  font-size: 24px;
}

.material-name {
  color: #fff;
  font-size: 12px;
  margin-top: 4px;
  text-align: center;
}

.material-count {
  color: #fbbf24;
  font-size: 11px;
  font-weight: bold;
}

.empty-tip {
  grid-column: span 4;
  text-align: center;
  color: #a0aec0;
  padding: 30px;
}

.synthesis-preview {
  background: #1a202c;
  padding: 12px 16px;
  border-top: 1px solid #2d3748;
}

.preview-header {
  font-size: 13px;
  color: #a0aec0;
  margin-bottom: 10px;
}

.target-name {
  color: #a78bfa;
  font-weight: bold;
}

.preview-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.preview-materials {
  flex: 1;
}

.materials-required {
  font-size: 12px;
  color: #a0aec0;
  margin-bottom: 6px;
}

.cost-item {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #2d3748;
  padding: 6px 10px;
  border-radius: 6px;
}

.cost-icon {
  font-size: 16px;
}

.cost-name {
  color: #fff;
  font-size: 12px;
}

.cost-count {
  color: #ef4444;
  font-weight: bold;
  font-size: 12px;
}

.cost-count.enough {
  color: #22c55e;
}

.gold-cost {
  font-size: 12px;
  color: #fbbf24;
  margin-top: 6px;
}

.preview-arrow {
  font-size: 20px;
  color: #a78bfa;
}

.preview-result {
  flex: 1;
  text-align: center;
}

.result-label {
  font-size: 12px;
  color: #a0aec0;
  margin-bottom: 6px;
}

.result-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #2d3748;
  padding: 10px;
  border-radius: 8px;
}

.result-item .result-icon {
  font-size: 28px;
}

.result-item .result-name {
  color: #fff;
  font-size: 13px;
  margin-top: 4px;
}

.result-item .result-count {
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

.synthesis-info {
  font-size: 13px;
}

.can-synthesize {
  color: #22c55e;
}

.cannot-synthesize {
  color: #ef4444;
}

.action-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.synthesis-btn {
  background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%);
  color: #fff;
}

.synthesis-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.synthesis-btn:hover:not(:disabled) {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(167, 139, 250, 0.4);
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
  border: 2px solid #a78bfa;
}

.result-title {
  font-size: 22px;
  color: #a78bfa;
  font-weight: bold;
  margin-bottom: 16px;
}

.result-content {
  margin-bottom: 20px;
}

.result-item-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #2d3748;
  padding: 16px;
  border-radius: 8px;
}

.result-item-display .result-icon {
  font-size: 36px;
}

.result-item-display .result-name {
  color: #fff;
  font-size: 16px;
  margin-top: 8px;
}

.result-item-display .result-count {
  color: #22c55e;
  font-weight: bold;
  font-size: 14px;
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
