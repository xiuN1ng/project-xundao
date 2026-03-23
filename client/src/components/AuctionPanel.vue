<template>
  <div class="auction-panel">
    <h2>🔨 拍卖行</h2>
    <div class="auction-tabs">
      <button :class="{active:activeTab===t.id}" v-for="t in tabs" :key="t.id" @click="activeTab=t.id">{{t.name}}</button>
    </div>
    <div class="auction-list">
      <div v-for="item in items" :key="item.id" class="auction-card">
        <span class="item-icon">{{ item.icon }}</span>
        <div class="item-info"><span class="name">{{ item.name }}</span><span class="seller">卖家: {{ item.seller }}</span></div>
        <div class="item-price"><span class="current">{{ item.currentPrice }}</span><span class="count">{{ item.bidCount }}次出价</span></div>
        <button class="bid-btn">出价</button>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue'
const activeTab = ref('all')
const tabs = [{id:'all',name:'全部'},{id:'weapon',name:'武器'},{id:'armor',name:'防具'}]
const items = ref([{id:1,icon:'⚔️',name:'紫金剑',seller:'剑仙',currentPrice:5000,bidCount:5}])
</script>
<style scoped>
.auction-panel { padding: 20px; }
h2 { color: #f093fb; font-size: 24px; margin-bottom: 20px; }
.auction-tabs { display: flex; gap: 10px; margin-bottom: 20px; }
.auction-tabs button { flex: 1; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: #fff; cursor: pointer; }
.auction-tabs button.active { background: linear-gradient(135deg,#667eea,#764ba2); border-color: transparent; }
.auction-list { display: flex; flex-direction: column; gap: 12px; }
.auction-card { display: flex; align-items: center; gap: 15px; background: rgba(255,255,255,0.05); padding: 18px; border-radius: 15px; }
.auction-card:hover { background: rgba(255,255,255,0.08); }
.item-icon { font-size: 40px; }
.item-info { flex: 1; }
.item-info .name { display: block; color: #fff; font-weight: bold; }
.item-info .seller { font-size: 12px; opacity: 0.7; }
.item-price { text-align: right; }
.item-price .current { display: block; color: #ffd700; font-weight: bold; font-size: 18px; }
.item-price .count { font-size: 11px; opacity: 0.6; }
.bid-btn { padding: 12px 25px; background: linear-gradient(135deg,#f093fb,#f5576c); border: none; border-radius: 25px; color: #fff; font-weight: bold; cursor: pointer; }
</style>
