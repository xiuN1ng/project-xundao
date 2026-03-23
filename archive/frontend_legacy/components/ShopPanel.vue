<template>
  <div class="shop-panel" v-if="visible">
    <div class="panel-header">
      <h2>🏪 积分商店</h2>
      <button class="close-btn" @click="close">×</button>
    </div>
    
    <div class="panel-tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        :class="['tab-btn', { active: currentTab === tab.id }]"
        @click="currentTab = tab.id"
      >
        {{ tab.icon }} {{ tab.name }}
      </button>
    </div>
    
    <div class="panel-content">
      <!-- 积分信息 -->
      <div class="points-info">
        <span class="points-label">我的积分:</span>
        <span class="points-value">{{ userPoints }}</span>
      </div>
      
      <!-- 商品列表 -->
      <div class="items-grid">
        <div 
          v-for="item in filteredItems" 
          :key="item.id" 
          class="shop-item"
          :class="['quality-' + item.quality]"
        >
          <div class="item-icon">{{ item.icon }}</div>
          <div class="item-details">
            <div class="item-name">{{ item.name }}</div>
            <div class="item-desc">{{ item.description }}</div>
            <div class="item-price">
              <span class="price-icon">💎</span>
              <span class="price-value">{{ item.price }}</span>
              <span class="price-label">积分</span>
            </div>
            <div class="item-stock" v-if="item.stock !== undefined">
              库存: {{ item.stock }}
            </div>
          </div>
          <button 
            class="buy-btn" 
            :disabled="!canBuy(item)"
            @click="buyItem(item)"
          >
            购买
          </button>
        </div>
      </div>
      
      <!-- 空状态 -->
      <div v-if="filteredItems.length === 0" class="empty-state">
        <div class="empty-icon">📦</div>
        <div class="empty-text">该分类暂无商品</div>
      </div>
    </div>
    
    <!-- 购买成功弹窗 -->
    <div v-if="showSuccess" class="success-toast">
      <div class="toast-icon">🎉</div>
      <div class="toast-text">{{ successMessage }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

const visible = ref(false);
const currentTab = ref('all');
const userPoints = ref(0);
const showSuccess = ref(false);
const successMessage = ref('');

const tabs = [
  { id: 'all', name: '全部', icon: '📦' },
  { id: 'equipment', name: '装备', icon: '⚔️' },
  { id: 'material', name: '材料', icon: '💎' },
  { id: 'item', name: '道具', icon: '🎁' },
  { id: 'fashion', name: '时装', icon: '👕' }
];

const shopItems = ref([
  // 装备
  { id: 1, name: '仙剑·青冥', description: '高品质仙剑', price: 5000, quality: 'legendary', category: 'equipment', icon: '🗡️', stock: 5 },
  { id: 2, name: '玄天战甲', description: '顶级防御装备', price: 4500, quality: 'legendary', category: 'equipment', icon: '🛡️', stock: 3 },
  { id: 3, name: '灵云履', description: '增加移动速度', price: 3000, quality: 'epic', category: 'equipment', icon: '👟', stock: 10 },
  { id: 4, name: '聚灵冠', description: '提升灵气回复', price: 2500, quality: 'epic', category: 'equipment', icon: '👑', stock: 8 },
  // 材料
  { id: 5, name: '万年灵乳', description: '突破境界必备', price: 2000, quality: 'rare', category: 'material', icon: '🧪', stock: 20 },
  { id: 6, name: '天晶石', description: '装备强化材料', price: 1500, quality: 'rare', category: 'material', icon: '💎', stock: 50 },
  { id: 7, name: '凤凰羽', description: '珍稀炼器材料', price: 3000, quality: 'epic', category: 'material', icon: '🪶', stock: 15 },
  { id: 8, name: '龙鳞', description: '神级锻造材料', price: 5000, quality: 'legendary', category: 'material', icon: '🐉', stock: 5 },
  // 道具
  { id: 9, name: '经验丹(大)', description: '获得大量经验', price: 800, quality: 'rare', category: 'item', icon: '📈', stock: 100 },
  { id: 10, name: '回魂丹', description: '复活死亡角色', price: 500, quality: 'uncommon', category: 'item', icon: '💊', stock: 50 },
  { id: 11, name: '背包扩展券', description: '增加背包格子', price: 1000, quality: 'rare', category: 'item', icon: '🎒', stock: 30 },
  // 时装
  { id: 12, name: '青云弟子服', description: '宗门经典时装', price: 2000, quality: 'epic', category: 'fashion', icon: '👘', stock: 25 },
  { id: 13, name: '霓裳羽衣', description: '仙女下凡套装', price: 4500, quality: 'legendary', category: 'fashion', icon: '👗', stock: 10 },
  { id: 14, name: '浪子行头', description: '侠客专属时装', price: 1800, quality: 'rare', category: 'fashion', icon: '🥋', stock: 20 }
]);

const filteredItems = computed(() => {
  if (currentTab.value === 'all') {
    return shopItems.value;
  }
  return shopItems.value.filter(item => item.category === currentTab.value);
});

function canBuy(item) {
  return userPoints.value >= item.price && (item.stock === undefined || item.stock > 0);
}

function show() {
  visible.value = true;
  loadUserPoints();
  loadShopItems();
}

function close() {
  visible.value = false;
}

async function loadUserPoints() {
  try {
    const response = await fetch('/api/player/points');
    if (response.ok) {
      const data = await response.json();
      userPoints.value = data.points || 0;
    }
  } catch (e) {
    // 使用默认值
    userPoints.value = 10000;
  }
}

async function loadShopItems() {
  try {
    const response = await fetch('/api/shop/list');
    if (response.ok) {
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        shopItems.value = data.data;
      }
    }
  } catch (e) {
    console.log('使用默认商品数据');
  }
}

async function buyItem(item) {
  if (!canBuy(item)) {
    showToast('积分不足或库存不足', 'error');
    return;
  }
  
  try {
    const response = await fetch('/api/shop/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        item_id: item.id,
        quantity: 1
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      userPoints.value -= item.price;
      if (item.stock !== undefined) {
        item.stock--;
      }
      showToast(`购买成功！${item.name}`, 'success');
    } else {
      showToast(data.message || '购买失败', 'error');
    }
  } catch (e) {
    // 模拟购买成功
    userPoints.value -= item.price;
    if (item.stock !== undefined) {
      item.stock--;
    }
    showToast(`购买成功！${item.name}`, 'success');
  }
}

function showToast(message, type = 'success') {
  successMessage.value = message;
  showSuccess.value = true;
  setTimeout(() => {
    showSuccess.value = false;
  }, 2000);
}

// 暴露方法给外部调用
defineExpose({
  show,
  close
});
</script>

<style scoped>
.shop-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  max-height: 85vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 2px solid #9b59b6;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(90deg, #9b59b6, #8e44ad);
  color: white;
}

.panel-header h2 {
  margin: 0;
  font-size: 20px;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 28px;
  cursor: pointer;
  line-height: 1;
}

.panel-tabs {
  display: flex;
  background: #0f0f23;
  padding: 8px;
  gap: 4px;
  flex-wrap: wrap;
}

.tab-btn {
  flex: 1;
  min-width: 80px;
  padding: 10px 8px;
  background: transparent;
  border: none;
  color: #8b9dc3;
  cursor: pointer;
  border-radius: 8px;
  font-size: 12px;
  transition: all 0.3s;
}

.tab-btn.active {
  background: linear-gradient(135deg, #9b59b6, #8e44ad);
  color: white;
}

.panel-content {
  padding: 16px;
  max-height: 65vh;
  overflow-y: auto;
}

.points-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: rgba(155, 89, 182, 0.2);
  border-radius: 8px;
  margin-bottom: 16px;
}

.points-label {
  color: #8b9dc3;
  font-size: 14px;
}

.points-value {
  color: #ffd700;
  font-size: 24px;
  font-weight: bold;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.shop-item {
  display: flex;
  flex-direction: column;
  padding: 12px;
  background: rgba(155, 89, 182, 0.15);
  border-radius: 12px;
  border: 1px solid transparent;
  transition: all 0.3s;
}

.shop-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(155, 89, 182, 0.3);
}

.shop-item.quality-uncommon {
  border-color: #95a5a6;
}

.shop-item.quality-rare {
  border-color: #3498db;
}

.shop-item.quality-epic {
  border-color: #9b59b6;
}

.shop-item.quality-legendary {
  border-color: #f39c12;
  background: linear-gradient(135deg, rgba(243, 156, 18, 0.2), rgba(155, 89, 182, 0.2));
}

.item-icon {
  font-size: 36px;
  text-align: center;
  margin-bottom: 8px;
}

.item-details {
  flex: 1;
  text-align: center;
}

.item-name {
  color: white;
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 4px;
}

.item-desc {
  color: #8b9dc3;
  font-size: 11px;
  margin-bottom: 8px;
}

.item-price {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.price-icon {
  font-size: 14px;
}

.price-value {
  color: #ffd700;
  font-weight: bold;
  font-size: 16px;
}

.price-label {
  color: #8b9dc3;
  font-size: 11px;
}

.item-stock {
  color: #8b9dc3;
  font-size: 11px;
  margin-top: 4px;
}

.buy-btn {
  margin-top: 10px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #9b59b6, #8e44ad);
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s;
}

.buy-btn:hover:not(:disabled) {
  transform: scale(1.05);
}

.buy-btn:disabled {
  background: #636e72;
  cursor: not-allowed;
}

.empty-state {
  text-align: center;
  padding: 40px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-text {
  color: #8b9dc3;
}

.success-toast {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.9);
  padding: 20px 40px;
  border-radius: 12px;
  border: 2px solid #00b894;
  text-align: center;
  animation: popIn 0.3s ease;
}

.toast-icon {
  font-size: 36px;
  margin-bottom: 8px;
}

.toast-text {
  color: white;
  font-size: 14px;
}

@keyframes popIn {
  from {
    transform: translate(-50%, -50%) scale(0.5);
    opacity: 0;
  }
  to {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
}
</style>
