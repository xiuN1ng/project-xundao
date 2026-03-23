<template>
  <div class="cave-panel">
    <h2>⛏️ 矿洞探险</h2>
    <div class="cave-energy"><span>体力: {{ energy }}/100</span><div class="energy-bar"><div class="fill" :style="{width:energy+'%'}"></div></div></div>
    <div class="cave-list">
      <div v-for="cave in caves" :key="cave.id" class="cave-card" :class="{locked:cave.locked}">
        <span class="cave-icon">{{ cave.icon }}</span>
        <div class="cave-info"><span class="name">{{ cave.name }}</span><span class="level">Lv.{{ cave.level }}</span></div>
        <button class="explore-btn">{{ cave.locked?'🔒':'探索' }}</button>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue'
const energy = ref(80)
const caves = ref([{id:1,icon:'🪨',name:'初级矿洞',level:1,locked:false},{id:2,icon:'💎',name:'中级矿洞',level:5,locked:false},{id:3,icon:'💠',name:'高级矿洞',level:10,locked:true}])
</script>
<style scoped>
.cave-panel { padding: 20px; }
h2 { color: #f093fb; font-size: 24px; margin-bottom: 20px; }
.cave-energy { margin-bottom: 25px; }
.cave-energy span { display: block; color: #fff; margin-bottom: 10px; }
.energy-bar { height: 12px; background: rgba(255,255,255,0.1); border-radius: 6px; overflow: hidden; }
.fill { height: 100%; background: linear-gradient(90deg,#667eea,#764ba2); }
.cave-list { display: flex; flex-direction: column; gap: 12px; }
.cave-card { display: flex; align-items: center; gap: 15px; background: rgba(255,255,255,0.05); padding: 18px; border-radius: 15px; }
.cave-card.locked { opacity: 0.5; }
.cave-icon { font-size: 40px; }
.cave-info { flex: 1; }
.cave-info .name { display: block; color: #fff; font-weight: bold; }
.cave-info .level { font-size: 12px; color: #f093fb; }
.explore-btn { padding: 12px 25px; background: linear-gradient(135deg,#ff9800,#ff5722); border: none; border-radius: 25px; color: #fff; font-weight: bold; cursor: pointer; }
</style>
