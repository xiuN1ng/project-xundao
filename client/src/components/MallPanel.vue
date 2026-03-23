<template>
  <div class="mall-panel">
    <h2>🛍️ 珍宝阁</h2>
    
    <!-- 货币显示 -->
    <div class="currency-bar">
      <div class="currency">
        <span class="icon">💰</span>
        <span>{{ currency.lingshi }}</span>
      </div>
      <div class="currency">
        <span class="icon">💎</span>
        <span>{{ currency.diamond }}</span>
      </div>
    </div>
    
    <!-- 商品分类 -->
    <div class="mall-tabs">
      <button v-for="tab in tabs" :key="tab.id"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id">
        {{ tab.icon }} {{ tab.name }}
      </button>
    </div>
    
    <!-- 特卖 -->
    <div v-if="flashSale.length > 0" class="flash-sale">
      <h3>⚡ 限时特卖</h3>
      <div class="flash-items">
        <div v-for="item in flashSale" :key="item.id" class="flash-item">
          <div class="flash-info">
            <span class="name">{{ item.name }}</span>
            <span class="original">¥{{ item.original }}</span>
            <span class="price">¥{{ item.price }}</span>
          </div>
          <button @click="buy(item)">抢购</button>
        </div>
      </div>
    </div>
    
    <!-- 商品列表 -->
    <div class="goods-grid">
      <div v-for="goods in goodsList" :key="goods.id" class="goods-card">
        <div class="goods-icon">{{ goods.icon }}</div>
        <div class="goods-info">
          <span class="name">{{ goods.name }}</span>
          <span class="price">¥{{ goods.price }}</span>
        </div>
        <button @click="buy(goods)">购买</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const activeTab = ref('items')
const tabs = [
  { id: 'items', name: '道具', icon: '📦' },
  { id: 'fashion', name: '时装', icon: '👘' },
  { id: 'mount', name: '坐骑', icon: '🐎' },
  { id: 'title', name: '称号', icon: '📜' }
]

const currency = ref({ lingshi: 100000, diamond: 50 })

const flashSale = ref([
  { id: 1, name: '灵兽蛋', original: 100, price: 50 },
  { id: 2, name: '修为丹', original: 50, price: 25 }
])

const goodsList = ref([
  { id: 1, icon: '📦', name: '灵石袋x1000', price: 10 },
  { id: 2, icon: '📦', name: '修为丹x10', price: 20 },
  { id: 3, icon: '📦', name: '灵兽袋x5', price: 30 },
  { id: 4, icon: '📦', name: '进阶丹x1', price: 50 }
])

function buy(item) {
  console.log('购买', item.name)
}
</script>

<style scoped>
.mall-panel { padding: 20px; }
h2 { color: #f093fb; margin-bottom: 20px; }

.currency-bar { display: flex; gap: 20px; margin-bottom: 20px; }
.currency { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: rgba(255,255,255,0.05); border-radius: 25px; }
.currency .icon { font-size: 20px; }
.currency span:last-child { color: #ffd700; font-weight: bold; }

.mall-tabs { display: flex; gap: 10px; margin-bottom: 20px; }
.mall-tabs button { padding: 10px 20px; background: transparent; border: 1px solid rgba(102,126,234,0.3); color: #fff; border-radius: 20px; cursor: pointer; }
.mall-tabs button.active { background: #667eea; }

.flash-sale { background: linear-gradient(135deg, rgba(244,67,54,0.2), rgba(255,152,0,0.2)); padding: 15px; border-radius: 12px; margin-bottom: 20px; }
.flash-sale h3 { color: #f44336; margin: 0 0 15px; }
.flash-items { display: flex; gap: 15px; }
.flash-item { flex: 1; background: rgba(0,0,0,0.3); padding: 15px; border-radius: 10px; }
.flash-info { margin-bottom: 10px; }
.flash-info .name { display: block; color: #fff; margin-bottom: 5px; }
.flash-info .original { text-decoration: line-through; opacity: 0.5; font-size: 12px; margin-right: 10px; }
.flash-info .price { color: #f44336; font-weight: bold; }
.flash-item button { width: 100%; padding: 8px; background: #f44336; border: none; border-radius: 8px; color: #fff; cursor: pointer; }

.goods-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
.goods-card { background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; text-align: center; }
.goods-icon { font-size: 36px; margin-bottom: 10px; }
.goods-info .name { display: block; color: #fff; margin-bottom: 8px; }
.goods-info .price { color: #ffd700; font-weight: bold; }
.goods-card button { margin-top: 10px; padding: 8px 20px; background: #667eea; border: none; border-radius: 20px; color: #fff; cursor: pointer; }
</style>
