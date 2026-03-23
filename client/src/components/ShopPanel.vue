<template>
  <div class="shop-panel">
    <!-- 货币栏 -->
    <div class="currency-bar">
      <div class="currency-item">
        <span class="icon">💰</span>
        <span class="amount">{{ lingshi.toLocaleString() }}</span>
        <span class="label">灵石</span>
      </div>
      <div class="currency-item diamond">
        <span class="icon">💎</span>
        <span class="amount">{{ diamonds }}</span>
        <span class="label">钻石</span>
      </div>
    </div>
    
    <!-- 分类标签 -->
    <div class="shop-tabs">
      <button v-for="tab in tabs" :key="tab.id"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id">
        <span class="tab-icon">{{ tab.icon }}</span>
        <span>{{ tab.name }}</span>
      </button>
    </div>
    
    <!-- 搜索 -->
    <div class="search-bar">
      <input v-model="searchQuery" placeholder="搜索商品..." />
      <span class="search-icon">🔍</span>
    </div>
    
    <!-- 商品网格 -->
    <div class="goods-grid">
      <div v-for="item in filteredGoods" :key="item.id" 
           class="goods-card"
           :class="{ 'on-sale': item.discount, hot: item.hot }">
        
        <!-- 折扣标签 -->
        <div v-if="item.discount" class="discount-tag">
          -{{ item.discount }}%
        </div>
        
        <!-- 热门标签 -->
        <div v-if="item.hot" class="hot-tag">🔥</div>
        
        <!-- 商品图标 -->
        <div class="goods-icon">{{ item.icon }}</div>
        
        <!-- 商品信息 -->
        <div class="goods-info">
          <span class="name">{{ item.name }}</span>
          <span class="desc">{{ item.desc }}</span>
          
          <div class="price-row">
            <span class="price">
              <span class="icon">{{ item.currency === 'diamond' ? '💎' : '💰' }}</span>
              {{ item.price }}
            </span>
            <span v-if="item.discount" class="original-price">
              {{ Math.floor(item.price / (1 - item.discount/100)) }}
            </span>
          </div>
        </div>
        
        <!-- 购买按钮 -->
        <button class="buy-btn" @click="buy(item)">
          <span>购买</span>
        </button>
      </div>
    </div>
    
    <!-- 底部提示 -->
    <div class="shop-footer">
      <span>每日刷新: 12:00 / 18:00 / 24:00</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { shopApi } from '../api'
import axios from 'axios'

const activeTab = ref('all')
const searchQuery = ref('')
const lingshi = ref(125680)
const diamonds = ref(520)

const tabs = [
  { id: 'all', name: '全部', icon: '📦' },
  { id: 'weapon', name: '武器', icon: '⚔️' },
  { id: 'armor', name: '防具', icon: '🛡️' },
  { id: 'potion', name: '药品', icon: '🧪' },
  { id: 'material', name: '材料', icon: '💎' }
]

{ loading: true, goods: ref([
  { id: 1, icon: '⚔️', name: '铁剑', desc: '基础武器', price: 100, currency: 'lingshi', category: 'weapon', hot: true },
  { id: 2, icon: '🛡️', name: '木盾', desc: '基础防具', price: 80, currency: 'lingshi', category: 'armor' },
  { id: 3, icon: '🧪', name: '灵气丹', desc: '恢复100灵气', price: 50, currency: 'lingshi', category: 'potion', discount: 20 },
  { id: 4, icon: '💎', name: '灵石袋x1000', desc: '大量灵石', price: 10, currency: 'diamond', category: 'material', hot: true },
  { id: 5, icon: '⚔️', name: '精钢剑', desc: '优秀武器', price: 500, currency: 'lingshi', category: 'weapon' },
  { id: 6, icon: '🧪', name: '生命药水', desc: '恢复500生命', price: 100, currency: 'lingshi', category: 'potion' },
  { id: 7, icon: '📦', name: '灵兽袋', desc: '捕捉灵兽', price: 200, currency: 'lingshi', category: 'material', discount: 15 },
  { id: 8, icon: '💎', name: '修为丹x10', desc: '大量修为', price: 50, currency: 'diamond', category: 'material' }
])

const filteredGoods = computed(() => {
  let result = goods.value
  if (activeTab.value !== 'all') {
    result = result.filter(g => g.category === activeTab.value)
  }
  if (searchQuery.value) {
    result = result.filter(g => g.name.includes(searchQuery.value) || g.desc.includes(searchQuery.value))
  }
  return result
})

async function buy(item) {
  await axios.post('/api/shop/buy', { itemId: item.id })
  if (item.currency === 'lingshi') {
    lingshi.value -= item.price
  } else {
    diamonds.value -= item.price
  }
}
</script>

<style scoped>
.shop-panel { padding: 20px; }

/* 货币栏 */
.currency-bar {
  display: flex; gap: 15px; margin-bottom: 20px;
}

.currency-item {
  flex: 1; display: flex; align-items: center; gap: 10px;
  padding: 15px 20px; background: rgba(255,255,255,0.05);
  border-radius: 15px; border: 1px solid rgba(255,255,255,0.1);
}

.currency-item.diamond { background: rgba(33,150,243,0.1); border-color: rgba(33,150,243,0.3); }

.currency-item .icon { font-size: 24px; }
.currency-item .amount { font-size: 22px; font-weight: bold; color: #fff; flex: 1; }
.currency-item .label { font-size: 12px; opacity: 0.7; }

/* 标签 */
.shop-tabs {
  display: flex; gap: 10px; margin-bottom: 20px; overflow-x: auto;
}

.shop-tabs button {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 20px; background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1); border-radius: 25px;
  color: #fff; cursor: pointer; white-space: nowrap;
  transition: all 0.3s;
}

.shop-tabs button:hover { background: rgba(255,255,255,0.1); }
.shop-tabs button.active {
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-color: transparent;
}

.tab-icon { font-size: 18px; }

/* 搜索 */
.search-bar { position: relative; margin-bottom: 20px; }

.search-bar input {
  width: 100%; padding: 15px 50px 15px 20px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 15px; color: #fff; font-size: 14px;
}

.search-bar input:focus { outline: none; border-color: #667eea; }

.search-icon {
  position: absolute; right: 20px; top: 50%; transform: translateY(-50%);
  font-size: 18px; opacity: 0.5;
}

/* 商品网格 */
.goods-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }

.goods-card {
  position: relative; background: rgba(255,255,255,0.05);
  border-radius: 16px; padding: 20px; overflow: hidden;
  transition: all 0.3s; border: 1px solid transparent;
}

.goods-card:hover { 
  transform: translateY(-5px); 
  border-color: rgba(102,126,234,0.5);
  box-shadow: 0 15px 35px rgba(0,0,0,0.3);
}

.goods-card.on-sale { border-color: rgba(244,67,54,0.5); }
.goods-card.hot { border-color: rgba(255,152,0,0.5); }

.discount-tag {
  position: absolute; top: 10px; right: 10px;
  padding: 5px 10px; background: #f44336;
  border-radius: 15px; color: #fff; font-size: 12px; font-weight: bold;
}

.hot-tag { position: absolute; top: 10px; left: 10px; font-size: 20px; }

.goods-icon {
  font-size: 50px; text-align: center; margin-bottom: 15px;
}

.goods-info .name { display: block; color: #fff; font-weight: bold; margin-bottom: 5px; }
.goods-info .desc { display: block; font-size: 12px; opacity: 0.7; margin-bottom: 12px; }

.price-row { display: flex; align-items: center; gap: 10px; }
.price {
  display: flex; align-items: center; gap: 5px;
  font-size: 20px; color: #ffd700; font-weight: bold;
}

.original-price {
  font-size: 14px; color: rgba(255,255,255,0.5);
  text-decoration: line-through;
}

.buy-btn {
  width: 100%; margin-top: 15px; padding: 12px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none; border-radius: 12px; color: #fff; font-weight: bold;
  cursor: pointer; transition: all 0.3s;
}

.buy-btn:hover { transform: scale(1.02); }

/* 底部 */
.shop-footer { 
  text-align: center; margin-top: 25px; 
  padding: 15px; background: rgba(255,255,255,0.03);
  border-radius: 10px; font-size: 12px; opacity: 0.6; 
}
</style>
