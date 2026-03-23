<template>
  <div class="festival-panel">
    <h2>🎉 节日活动</h2>
    <div class="festival-banner"><span>🎊 春节庆典</span><span class="time">剩余 5 天</span></div>
    <div class="festival-activities">
      <div v-for="a in activities" :key="a.id" class="activity-card">
        <span class="act-icon">{{ a.icon }}</span>
        <div class="act-info"><span class="name">{{ a.name }}</span><span class="desc">{{ a.desc }}</span></div>
        <button class="join-btn">参加</button>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue'
const activities = ref([
  {id:1,icon:'🧧',name:'红包雨',desc:'领取海量灵石'},
  {id:2,icon:'🎆',name:'烟花盛典',desc:'观看动画得奖励'}
])
</script>
<style scoped>
.festival-panel { padding: 20px; }
h2 { color: #f093fb; font-size: 24px; margin-bottom: 20px; }
.festival-banner { background: linear-gradient(135deg,rgba(244,67,54,0.3),rgba(255,152,0,0.3)); padding: 30px; border-radius: 20px; text-align: center; margin-bottom: 25px; }
.festival-banner span { display: block; color: #fff; font-size: 24px; }
.festival-banner .time { color: #ffd700; font-size: 14px; margin-top: 10px; }
.festival-activities { display: flex; flex-direction: column; gap: 12px; }
.activity-card { display: flex; align-items: center; gap: 15px; background: rgba(255,255,255,0.05); padding: 18px; border-radius: 15px; }
.act-icon { font-size: 40px; }
.act-info { flex: 1; }
.act-info .name { display: block; color: #fff; font-weight: bold; }
.act-info .desc { font-size: 12px; opacity: 0.7; }
.join-btn { padding: 12px 25px; background: linear-gradient(135deg,#ff9800,#ff5722); border: none; border-radius: 25px; color: #fff; font-weight: bold; cursor: pointer; }
</style>
