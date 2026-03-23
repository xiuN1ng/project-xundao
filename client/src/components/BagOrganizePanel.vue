<template>
  <div class="bag-organize-panel">
    <div class="panel-header">
      <h3>背包整理</h3>
      <button class="close-btn" @click="closePanel">×</button>
    </div>
    
    <div class="panel-content">
      <div class="organize-options">
        <div class="option-item">
          <span class="option-label">一键整理</span>
          <button class="action-btn" @click="organizeBag" :disabled="organizing">
            {{ organizing ? '整理中...' : '开始整理' }}
          </button>
        </div>
        
        <div class="option-item">
          <span class="option-label">自动出售</span>
          <label class="toggle-switch">
            <input type="checkbox" v-model="autoSell" @change="toggleAutoSell">
            <span class="toggle-slider"></span>
          </label>
        </div>
        
        <div class="option-item">
          <span class="option-label">出售品质</span>
          <select v-model="sellQuality" class="quality-select">
            <option value="all">全部</option>
            <option value="white">白色</option>
            <option value="green">绿色</option>
            <option value="blue">蓝色</option>
            <option value="purple">紫色</option>
            <option value="orange">橙色</option>
          </select>
        </div>
      </div>
      
      <div class="organize-preview" v-if="previewItems.length > 0">
        <h4>将自动出售 {{ previewItems.length }} 件物品</h4>
        <div class="preview-list">
          <div v-for="item in previewItems" :key="item.id" class="preview-item">
            <span class="item-name" :class="'quality-' + item.quality">{{ item.name }}</span>
            <span class="item-price">+{{ item.price }}灵石</span>
          </div>
        </div>
        <div class="preview-total">
          预计获得: <span class="total-price">{{ totalPrice }}</span> 灵石
        </div>
      </div>
      
      <div class="organize-result" v-if="resultMessage">
        <div class="result-message" :class="resultType">{{ resultMessage }}</div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BagOrganizePanel',
  emits: ['close'],
  setup(props, { emit }) {
    const organizing = ref(false);
    const autoSell = ref(false);
    const sellQuality = ref('all');
    const previewItems = ref([]);
    const resultMessage = ref('');
    const resultType = ref('');
    
    const organizeBag = async () => {
      organizing.value = true;
      resultMessage.value = '';
      
      try {
        const response = await fetch('/api/bag/organize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            autoSell: autoSell.value,
            quality: sellQuality.value
          })
        });
        
        const data = await response.json();
        
        if (data.success) {
          resultMessage.value = `整理完成！获得 ${data.gained || 0 } 灵石`;
          resultType.value = 'success';
          previewItems.value = [];
        } else {
          resultMessage.value = data.message || '整理失败';
          resultType.value = 'error';
        }
      } catch (error) {
        resultMessage.value = '整理失败，请稍后重试';
        resultType.value = 'error';
      } finally {
        organizing.value = false;
      }
    };
    
    const toggleAutoSell = async () => {
      try {
        await fetch('/api/bag/auto-sell', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: autoSell.value })
        });
      } catch (error) {
        console.error('设置自动出售失败:', error);
      }
    };
    
    const closePanel = () => {
      emit('close');
    };
    
    const totalPrice = computed(() => {
      return previewItems.value.reduce((sum, item) => sum + (item.price || 0), 0);
    });
    
    return {
      organizing,
      autoSell,
      sellQuality,
      previewItems,
      resultMessage,
      resultType,
      totalPrice,
      organizeBag,
      toggleAutoSell,
      closePanel
    };
  }
};
</script>

<style scoped>
.bag-organize-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 400px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  border: 2px solid #4a5568;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  color: #e2e8f0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #4a5568;
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
}

.organize-options {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.option-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.option-label {
  font-size: 14px;
  color: #cbd5e0;
}

.action-btn {
  padding: 8px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.toggle-switch {
  position: relative;
  width: 50px;
  height: 26px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #4a5568;
  border-radius: 26px;
  transition: 0.4s;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: 0.4s;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: #48bb78;
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(24px);
}

.quality-select {
  padding: 6px 12px;
  background: #2d3748;
  border: 1px solid #4a5568;
  border-radius: 6px;
  color: #e2e8f0;
  font-size: 14px;
  cursor: pointer;
}

.organize-preview {
  margin-top: 20px;
  padding: 16px;
  background: #2d3748;
  border-radius: 8px;
}

.organize-preview h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #fc8181;
}

.preview-list {
  max-height: 150px;
  overflow-y: auto;
}

.preview-item {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 13px;
}

.item-name.quality-white { color: #fff; }
.item-name.quality-green { color: #68d391; }
.item-name.quality-blue { color: #63b3ed; }
.item-name.quality-purple { color: #b794f4; }
.item-name.quality-orange { color: #f6ad55; }

.item-price {
  color: #f6e05e;
}

.preview-total {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #4a5568;
  text-align: right;
  font-size: 14px;
}

.total-price {
  color: #f6e05e;
  font-weight: bold;
  font-size: 16px;
}

.organize-result {
  margin-top: 16px;
}

.result-message {
  padding: 12px;
  border-radius: 8px;
  text-align: center;
  font-size: 14px;
}

.result-message.success {
  background: rgba(72, 187, 120, 0.2);
  color: #68d391;
  border: 1px solid #48bb78;
}

.result-message.error {
  background: rgba(245, 101, 101, 0.2);
  color: #fc8181;
  border: 1px solid #f56565;
}
</style>
