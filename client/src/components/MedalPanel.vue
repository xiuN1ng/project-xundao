<template>
  <div class="medal-panel">
    <h2>🏅 勋章系统</h2>
    <div class="medal-slots">
      <div v-for="i in 4" :key="i" class="medal-slot"><span>+</span></div>
    </div>
    <div class="medal-list">
      <div v-for="m in medals" :key="m.id" class="medal-card" :class="{equipped:m.equipped}">
        <span class="medal-icon">{{ m.icon }}</span>
        <div class="medal-info"><span class="name">{{ m.name }}</span><span class="attr">{{ m.attr }}</span></div>
        <button class="equip-btn">{{ m.equipped?'卸下':'装备' }}</button>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue'
const medals = ref([
  {id:1,icon:'🥇',name:'冠军勋章',attr:'全属性+5%',equipped:true},
  {id:2,icon:'⭐',name:'明星勋章',attr:'攻击+10%',equipped:false}
])
</script>
<style scoped>
.medal-panel { padding: 20px; }
h2 { color: #f093fb; font-size: 24px; margin-bottom: 20px; }
.medal-slots { display: flex; gap: 15px; margin-bottom: 25px; }
.medal-slot { flex: 1; height: 70px; background: rgba(255,255,255,0.05); border: 2px dashed rgba(255,255,255,0.2); border-radius: 15px; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.3); font-size: 24px; }
.medal-list { display: flex; flex-direction: column; gap: 12px; }
.medal-card { display: flex; align-items: center; gap: 15px; background: rgba(255,255,255,0.05); padding: 18px; border-radius: 15px; }
.medal-card.equipped { border: 2px solid #667eea; background: rgba(102,126,234,0.1); }
.medal-icon { font-size: 40px; }
.medal-info { flex: 1; }
.medal-info .name { display: block; color: #fff; font-weight: bold; }
.medal-info .attr { font-size: 12px; color: #f093fb; }
.equip-btn { padding: 10px 20px; background: linear-gradient(135deg,#667eea,#764ba2); border: none; border-radius: 20px; color: #fff; cursor: pointer; }
</style>
