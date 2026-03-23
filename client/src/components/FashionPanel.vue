<template>
  <div class="fashion-panel">
    <h2>👗 时装系统</h2>
    <div class="fashion-tabs">
      <button :class="{active:tab==='owned'}" @click="tab='owned'">已拥有</button>
      <button :class="{active:tab==='shop'}" @click="tab='shop'">商店</button>
    </div>
    <div class="fashion-grid">
      <div v-for="f in fashionList" :key="f.id" class="fashion-card" :class="{equipped:f.equipped}">
        <span class="fashion-icon">{{ f.icon }}</span>
        <span class="fashion-name">{{ f.name }}</span>
        <button v-if="!f.equipped" class="wear-btn">穿戴</button>
        <span v-else class="equipped-tag">已穿戴</span>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue'
const tab = ref('owned')
const fashionList = ref([
  {id:1,icon:'👘',name:'和风',equipped:true},
  {id:2,icon:'👔',name:'西装',equipped:false},
  {id:3,icon:'🧥',name:'大衣',equipped:false}
])
</script>
<style scoped>
.fashion-panel { padding: 20px; }
h2 { color: #f093fb; font-size: 24px; margin-bottom: 20px; }
.fashion-tabs { display: flex; gap: 10px; margin-bottom: 20px; }
.fashion-tabs button { flex: 1; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: #fff; cursor: pointer; }
.fashion-tabs button.active { background: linear-gradient(135deg,#667eea,#764ba2); border-color: transparent; }
.fashion-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; }
.fashion-card { text-align: center; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 15px; }
.fashion-card.equipped { border: 2px solid #667eea; background: rgba(102,126,234,0.1); }
.fashion-icon { display: block; font-size: 40px; margin-bottom: 10px; }
.fashion-name { display: block; color: #fff; font-size: 14px; margin-bottom: 10px; }
.wear-btn { padding: 8px 15px; background: linear-gradient(135deg,#f093fb,#f5576c); border: none; border-radius: 15px; color: #fff; font-size: 12px; cursor: pointer; }
.equipped-tag { color: #4caf50; font-size: 12px; }
</style>
