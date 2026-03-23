<template>
  <div class="dungeon-panel" style="background-image: url('/assets/bg-dungeon-gate.png'); background-size: cover; background-position: center;">
    <h2>🏔️ 副本挑战</h2>
    <div class="dungeon-list">
      <div v-for="d in dungeons" :key="d.id" class="dungeon-card" :class="{unlocked:d.unlocked}">
        <div class="dungeon-icon">{{ d.icon }}</div>
        <div class="dungeon-info">
          <span class="name">{{ d.name }}</span>
          <span class="level">推荐等级 Lv.{{ d.reqLevel }}</span>
          <div class="progress"><div class="bar" :style="{width:d.progress+'%'}"></div></div>
        </div>
        <button class="enter-btn">进入</button>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { dungeonApi } from '../api'
const dungeons = ref([
  {id:1,icon:'🗿',name:'新手副本',reqLevel:1,progress:100,unlocked:true},
  {id:2,icon:'🌋',name:'火山洞穴',reqLevel:10,progress:60,unlocked:true},
  {id:3,icon:'🌊',name:'深海遗迹',reqLevel:20,progress:0,unlocked:false}
])
</script>
<style scoped>
.dungeon-panel {
  padding: 20px;
  background-image: url('@/assets/images/bg-battle-dungeon.png');
  background-size: cover;
  background-position: center;
  position: relative;
  min-height: 100%;
}
.dungeon-panel::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(26, 26, 46, 0.82);
  pointer-events: none;
}
h2 { color: #f093fb; font-size: 24px; margin-bottom: 20px; }
.dungeon-list { display: flex; flex-direction: column; gap: 15px; }
.dungeon-card { display: flex; align-items: center; gap: 15px; background: rgba(255,255,255,0.05); padding: 20px; border-radius: 15px; }
.dungeon-card:not(.unlocked) { opacity: 0.5; }
.dungeon-icon { font-size: 50px; }
.dungeon-info { flex: 1; }
.dungeon-info .name { display: block; color: #fff; font-weight: bold; margin-bottom: 5px; }
.dungeon-info .level { display: block; font-size: 12px; color: #f093fb; margin-bottom: 10px; }
.dungeon-info .progress { height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; }
.dungeon-info .bar { height: 100%; background: linear-gradient(90deg,#667eea,#764ba2); border-radius: 3px; }
.enter-btn { padding: 15px 30px; background: linear-gradient(135deg,#667eea,#764ba2); border: none; border-radius: 25px; color: #fff; font-weight: bold; cursor: pointer; }
</style>
