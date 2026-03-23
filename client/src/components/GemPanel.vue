<template>
  <div class="gem-panel">
    <h2>💎 宝石系统</h2>
    <div class="gem-slots">
      <div v-for="i in 6" :key="i" class="gem-slot">
        <span class="empty">+</span>
      </div>
    </div>
    <div class="gem-list">
      <div v-for="gem in gems" :key="gem.id" class="gem-card" :class="gem.quality">
        <span class="gem-icon">{{ gem.icon }}</span>
        <div class="gem-info"><span class="name">{{ gem.name }}</span><span class="attr">{{ gem.attr }}</span></div>
        <button class="embed-btn">镶嵌</button>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue'
const gems = ref([
  {id:1,icon:'💠',name:'蓝宝石',attr:'攻击+5',quality:'blue'},
  {id:2,icon:'🔴',name:'红宝石',attr:'生命+50',quality:'red'}
])
</script>
<style scoped>
.gem-panel { padding: 20px; }
h2 { color: #f093fb; font-size: 24px; margin-bottom: 20px; }
.gem-slots { display: flex; gap: 10px; margin-bottom: 25px; }
.gem-slot { flex: 1; height: 60px; background: rgba(255,255,255,0.05); border: 2px dashed rgba(255,255,255,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.gem-slot .empty { color: rgba(255,255,255,0.3); font-size: 24px; }
.gem-list { display: flex; flex-direction: column; gap: 12px; }
.gem-card { display: flex; align-items: center; gap: 15px; background: rgba(255,255,255,0.05); padding: 15px; border-radius: 15px; }
.gem-card.blue { border-left: 3px solid #2196f3; }
.gem-card.red { border-left: 3px solid #f44336; }
.gem-icon { font-size: 36px; }
.gem-info { flex: 1; }
.gem-info .name { display: block; color: #fff; font-weight: bold; }
.gem-info .attr { font-size: 12px; color: #f093fb; }
.embed-btn { padding: 10px 20px; background: linear-gradient(135deg,#667eea,#764ba2); border: none; border-radius: 20px; color: #fff; cursor: pointer; }
</style>
