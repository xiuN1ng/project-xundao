<template>
  <div class="mount-panel">
    <h2>🦄 坐骑系统</h2>
    <div class="current-mount" v-if="current">
      <span class="mount-display">{{ current.icon }}</span>
      <div class="mount-info">
        <span class="name">{{ current.name }}</span>
        <span class="speed">速度 +{{ current.speed }}</span>
      </div>
    </div>
    <div class="mount-list">
      <div v-for="m in mounts" :key="m.id" class="mount-card" :class="{owned:m.owned,active:current?.id===m.id}">
        <span class="mount-icon">{{ m.icon }}</span>
        <span class="mount-name">{{ m.name }}</span>
        <button v-if="m.owned" class="ride-btn">骑行</button>
        <span v-else class="price">💰{{ m.price }}</span>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { mountApi } from '../api'
const current = ref({id:1,icon:'🦄',name:'独角兽',speed:50})
const mounts = ref([
  {id:1,icon:'🦄',name:'独角兽',speed:50,owned:true},
  {id:2,icon:'🐉',name:'神龙',speed:100,owned:false,price:10000}
])
</script>
<style scoped>
.mount-panel { padding: 20px; }
h2 { color: #f093fb; font-size: 24px; margin-bottom: 20px; }
.current-mount { text-align: center; padding: 30px; background: linear-gradient(135deg,rgba(102,126,234,0.2),rgba(118,75,162,0.2)); border-radius: 20px; margin-bottom: 25px; }
.mount-display { font-size: 80px; display: block; margin-bottom: 15px; animation: float 3s ease-in-out infinite; }
@keyframes float { 0%,100%{transform:translateY(0);}50%{transform:translateY(-10px);} }
.mount-info .name { display: block; color: #fff; font-size: 24px; margin-bottom: 5px; }
.mount-info .speed { color: #f093fb; }
.mount-list { display: grid; grid-template-columns: repeat(2,1fr); gap: 12px; }
.mount-card { text-align: center; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 15px; }
.mount-card.active { border: 2px solid #667eea; background: rgba(102,126,234,0.1); }
.mount-icon { display: block; font-size: 40px; margin-bottom: 10px; }
.mount-name { display: block; color: #fff; font-size: 14px; margin-bottom: 10px; }
.ride-btn { padding: 8px 20px; background: linear-gradient(135deg,#667eea,#764ba2); border: none; border-radius: 15px; color: #fff; cursor: pointer; }
.price { color: #ffd700; font-weight: bold; }
</style>
