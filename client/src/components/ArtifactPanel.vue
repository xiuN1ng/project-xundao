<template>
  <div class="artifact-panel">
    <h2>🔱 神器系统</h2>
    <div class="artifact-slot">
      <div class="slot-card" v-for="slot in slots" :key="slot.id">
        <span class="slot-icon">{{ slot.icon }}</span>
        <span class="slot-name">{{ slot.name }}</span>
        <span class="slot-level">+{{ slot.level }}</span>
      </div>
    </div>
    <div class="artifact-list">
      <div v-for="art in artifacts" :key="art.id" class="artifact-card">
        <span class="art-icon">{{ art.icon }}</span>
        <div class="art-info"><span class="name">{{ art.name }}</span><span class="attr">{{ art.attr }}</span></div>
        <button class="equip-btn">装备</button>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue'
const slots = ref([{id:1,icon:'⚔️',name:'武器',level:5},{id:2,icon:'🛡️',name:'护甲',level:3}])
const artifacts = ref([{id:1,icon:'🗡️',name:'轩辕剑',attr:'攻击+100',level:1}])
</script>
<style scoped>
.artifact-panel { padding: 20px; }
h2 { color: #f093fb; font-size: 24px; margin-bottom: 20px; }
.artifact-slot { display: flex; gap: 15px; margin-bottom: 25px; }
.slot-card { flex: 1; text-align: center; padding: 25px; background: rgba(255,255,255,0.05); border-radius: 15px; border: 1px solid rgba(255,215,0,0.3); }
.slot-icon { display: block; font-size: 40px; margin-bottom: 10px; }
.slot-name { display: block; color: #fff; }
.slot-level { display: block; color: #ffd700; font-size: 14px; margin-top: 5px; }
.artifact-list { display: flex; flex-direction: column; gap: 12px; }
.artifact-card { display: flex; align-items: center; gap: 15px; background: rgba(255,255,255,0.05); padding: 18px; border-radius: 15px; }
.artifact-card:hover { background: rgba(255,255,255,0.08); }
.art-icon { font-size: 40px; }
.art-info { flex: 1; }
.art-info .name { display: block; color: #fff; font-weight: bold; }
.art-info .attr { font-size: 12px; color: #f093fb; }
.equip-btn { padding: 10px 20px; background: linear-gradient(135deg,#667eea,#764ba2); border: none; border-radius: 20px; color: #fff; cursor: pointer; }
</style>
