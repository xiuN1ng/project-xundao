<template>
  <div class="bag-panel">
    <div class="bag-header">
      <div class="bag-title">🎒 背包</div>
      <div class="bag-controls">
        <!-- 筛选功能 -->
        <div class="filter-group">
          <select v-model="qualityFilter" @change="filterItems" class="filter-select">
            <option value="">全部品质</option>
            <option value="common">普通</option>
            <option value="uncommon">优秀</option>
            <option value="rare">稀有</option>
            <option value="epic">史诗</option>
            <option value="legendary">传说</option>
          </select>
          <select v-model="typeFilter" @change="filterItems" class="filter-select">
            <option value="">全部类型</option>
            <option value="material">材料</option>
            <option value="equipment">装备</option>
            <option value="pill">丹药</option>
            <option value="artifact">法宝</option>
          </select>
        </div>
        <!-- 整理按钮 -->
        <button class="sort-btn" @click="sortItems">
          🔄 整理
        </button>
        <!-- 分解入口 -->
        <button class="action-btn dismantle-btn" @click="openDismantle">
          🔨 分解
        </button>
        <!-- 合成入口 -->
        <button class="action-btn synthesis-btn" @click="openSynthesis">
          ✨ 合成
        </button>
      </div>
    </div>
    
    <!-- 背包进度 -->
    <div class="bag-progress">
      <span>容量: {{ usedSlots }} / {{ totalSlots }}</span>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
    </div>
    
    <!-- 物品列表 -->
    <div class="bag-grid">
      <div 
        v-for="item in filteredItems" 
        :key="item.id" 
        class="bag-item"
        :class="['quality-' + item.quality, { selected: selectedItem?.id === item.id }]"
        @click="selectItem(item)"
      >
        <div class="item-icon">{{ item.icon }}</div>
        <div class="item-name">{{ item.name }}</div>
        <div class="item-count" v-if="item.count > 1">x{{ item.count }}</div>
        <div class="item-quality-badge" :class="'badge-' + item.quality"></div>
      </div>
      
      <!-- 空格子 -->
      <div 
        v-for="n in emptySlots" 
        :key="'empty-' + n" 
        class="bag-item empty"
      ></div>
    </div>
    
    <!-- 物品详情 -->
    <div class="item-detail" v-if="selectedItem">
      <div class="detail-header">
        <span class="detail-icon">{{ selectedItem.icon }}</span>
        <span class="detail-name" :class="'text-' + selectedItem.quality">{{ selectedItem.name }}</span>
      </div>
      <div class="detail-desc">{{ selectedItem.description }}</div>
      <div class="detail-stats" v-if="selectedItem.stats">
        <div v-for="(value, key) in selectedItem.stats" :key="key" class="stat-row">
          <span>{{ getStatName(key) }}:</span>
          <span class="stat-value">+{{ value }}</span>
        </div>
      </div>
      <div class="detail-actions">
        <button class="action-btn use" @click="useItem" v-if="selectedItem.type === 'pill'">使用</button>
        <button class="action-btn equip" @click="equipItem" v-if="selectedItem.type === 'equipment'">装备</button>
        <button class="action-btn sell" @click="sellItem">出售</button>
      </div>
    </div>
  </div>
</template>

<script>
const { ref, computed, onMounted } = Vue;

export default {
  name: 'BagPanel',
  emits: ['close', 'open-dismantle', 'open-synthesis'],
  setup(props, { emit }) {
    const qualityFilter = ref('');
    const typeFilter = ref('');
    const sortBy = ref('quality'); // quality, name, type
    const items = ref([]);
    const selectedItem = ref(null);
    const totalSlots = ref(50);
    
    // 模拟物品数据
    const mockItems = [
      { id: 1, name: '灵气丹', icon: '💊', quality: 'common', type: 'pill', count: 10, description: '回复50灵气', stats: { spirit: 50 } },
      { id: 2, name: '精铁剑', icon: '⚔️', quality: 'uncommon', type: 'equipment', count: 1, description: '普通精铁打造的剑', stats: { atk: 15 } },
      { id: 3, name: '玄冰甲', icon: '🛡️', quality: 'rare', type: 'equipment', count: 1, description: '蕴含冰之灵气的护甲', stats: { def: 25 } },
      { id: 4, name: '灵草', icon: '🌿', quality: 'common', type: 'material', count: 25, description: '普通的灵草' },
      { id: 5, name: '金丹', icon: '🔮', quality: 'epic', type: 'pill', count: 3, description: '大幅提升修炼效率', stats: { spiritRate: 1.5 } },
      { id: 6, name: '八卦盘', icon: '🧿', quality: 'legendary', type: 'artifact', count: 1, description: '推演天机的至宝', stats: { atk: 60, def: 40, spirit: 30 } },
      { id: 7, name: '陨铁', icon: '🪨', quality: 'uncommon', type: 'material', count: 8, description: '用于炼器的珍稀材料' },
      { id: 8, name: '紫霞仙衣', icon: '👘', quality: 'epic', type: 'equipment', count: 1, description: '仙子遗落的仙衣', stats: { def: 40, spirit: 20 } },
    ];
    
    const filteredItems = computed(() => {
      let result = [...items.value];
      
      if (qualityFilter.value) {
        result = result.filter(item => item.quality === qualityFilter.value);
      }
      
      if (typeFilter.value) {
        result = result.filter(item => item.type === typeFilter.value);
      }
      
      // 排序
      result.sort((a, b) => {
        if (sortBy.value === 'quality') {
          const qualityOrder = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
          return qualityOrder[b.quality] - qualityOrder[a.quality];
        } else if (sortBy.value === 'name') {
          return a.name.localeCompare(b.name);
        }
        return 0;
      });
      
      return result;
    });
    
    const usedSlots = computed(() => items.value.length);
    
    const progressPercent = computed(() => {
      return Math.min(100, (usedSlots.value / totalSlots.value) * 100);
    });
    
    const emptySlots = computed(() => {
      return Math.max(0, totalSlots.value - usedSlots.value);
    });
    
    const filterItems = () => {
      // 筛选逻辑已通过computed自动处理
    };
    
    const sortItems = () => {
      // 切换排序方式
      const order = ['quality', 'name'];
      const currentIndex = order.indexOf(sortBy.value);
      sortBy.value = order[(currentIndex + 1) % order.length];
    };
    
    const selectItem = (item) => {
      selectedItem.value = selectedItem.value?.id === item.id ? null : item;
    };
    
    const useItem = () => {
      console.log('使用物品:', selectedItem.value.name);
      // 实现物品使用逻辑
    };
    
    const equipItem = () => {
      console.log('装备物品:', selectedItem.value.name);
      // 实现装备逻辑
    };
    
    const sellItem = () => {
      console.log('出售物品:', selectedItem.value.name);
      // 实现出售逻辑
    };
    
    const openDismantle = () => {
      emit('open-dismantle');
    };
    
    const openSynthesis = () => {
      emit('open-synthesis');
    };
    
    const getStatName = (key) => {
      const names = {
        atk: '攻击',
        def: '防御',
        spirit: '灵气',
        spiritRate: '灵气效率'
      };
      return names[key] || key;
    };
    
    onMounted(() => {
      items.value = mockItems;
    });
    
    return {
      qualityFilter,
      typeFilter,
      filteredItems,
      selectedItem,
      usedSlots,
      totalSlots,
      progressPercent,
      emptySlots,
      filterItems,
      sortItems,
      selectItem,
      useItem,
      equipItem,
      sellItem,
      openDismantle,
      openSynthesis,
      getStatName
    };
  }
};
</script>

<style scoped>
.bag-panel {
  width: 500px;
  max-height: 600px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 20px;
  color: #fff;
}

.bag-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.bag-title {
  font-size: 24px;
  font-weight: bold;
}

.bag-controls {
  display: flex;
  gap: 10px;
}

.filter-group {
  display: flex;
  gap: 5px;
}

.filter-select {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  padding: 5px 10px;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
}

.filter-select option {
  background: #1a1a2e;
}

.sort-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 6px;
  padding: 5px 15px;
  color: #fff;
  cursor: pointer;
  transition: transform 0.2s;
}

.sort-btn:hover {
  transform: scale(1.05);
}

.action-btn {
  background: none;
  border: none;
  border-radius: 6px;
  padding: 5px 12px;
  cursor: pointer;
  font-size: 12px;
  transition: transform 0.2s;
}

.dismantle-btn {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: #fff;
}

.dismantle-btn:hover {
  transform: scale(1.05);
}

.synthesis-btn {
  background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%);
  color: #fff;
}

.synthesis-btn:hover {
  transform: scale(1.05);
}

.bag-progress {
  margin-bottom: 15px;
  font-size: 12px;
  color: #888;
}

.progress-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  margin-top: 5px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s ease;
}

.bag-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 5px;
}

.bag-item {
  aspect-ratio: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid transparent;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
}

.bag-item:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: scale(1.05);
}

.bag-item.empty {
  background: rgba(255, 255, 255, 0.02);
  cursor: default;
}

.bag-item.empty:hover {
  transform: none;
}

.bag-item.selected {
  border-color: #ffd700;
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
}

.bag-item.quality-common { border-color: #888; }
.bag-item.quality-uncommon { border-color: #4ade80; }
.bag-item.quality-rare { border-color: #60a5fa; }
.bag-item.quality-epic { border-color: #a78bfa; }
.bag-item.quality-legendary { border-color: #fbbf24; }

.item-icon {
  font-size: 24px;
}

.item-name {
  font-size: 10px;
  margin-top: 2px;
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-count {
  position: absolute;
  bottom: 2px;
  right: 4px;
  font-size: 10px;
  color: #ffd700;
  font-weight: bold;
}

.item-quality-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.badge-common { background: #888; }
.badge-uncommon { background: #4ade80; }
.badge-rare { background: #60a5fa; }
.badge-epic { background: #a78bfa; }
.badge-legendary { background: #fbbf24; }

.item-detail {
  margin-top: 15px;
  padding: 15px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.detail-icon {
  font-size: 28px;
}

.detail-name {
  font-size: 18px;
  font-weight: bold;
}

.text-common { color: #888; }
.text-uncommon { color: #4ade80; }
.text-rare { color: #60a5fa; }
.text-epic { color: #a78bfa; }
.text-legendary { color: #fbbf24; }

.detail-desc {
  color: #888;
  font-size: 12px;
  margin-bottom: 10px;
}

.detail-stats {
  margin-bottom: 10px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  padding: 3px 0;
}

.stat-value {
  color: #4ade80;
}

.detail-actions {
  display: flex;
  gap: 10px;
}

.action-btn {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: transform 0.2s;
}

.action-btn:hover {
  transform: scale(1.02);
}

.action-btn.use {
  background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
  color: #fff;
}

.action-btn.equip {
  background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
  color: #fff;
}

.action-btn.sell {
  background: linear-gradient(135deg, #f87171 0%, #ef4444 100%);
  color: #fff;
}
</style>
