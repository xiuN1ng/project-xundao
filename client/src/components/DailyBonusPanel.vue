<template>
  <div class="daily-bonus-panel">
    <h2>🎁 每日奖励</h2>
    <div class="bonus-calendar">
      <div v-for="(day,index) in 7" :key="index" class="day-card" :class="{claimed:index<claimed,current:index===today}">
        <span class="day">Day{{index+1}}</span>
        <span class="reward">{{rewards[index]}}</span>
        <span v-if="index<claimed" class="check">✓</span>
      </div>
    </div>
    <button v-if="!todayClaimed" class="claim-all-btn">一键领取</button>
  </div>
</template>
<script setup>
import { ref } from 'vue'
const claimed = ref(3), today = ref(3), todayClaimed = ref(true)
const rewards = ['💰100','💰200','💰300','💰500','📦','💰800','🎁']
</script>
<style scoped>
.daily-bonus-panel { padding: 20px; }
h2 { color: #f093fb; font-size: 24px; margin-bottom: 20px; }
.bonus-calendar { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 25px; }
.day-card { text-align: center; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 15px; position: relative; }
.day-card.current { border: 2px solid #667eea; }
.day-card.claimed { background: rgba(76,175,80,0.1); }
.day { display: block; color: #fff; margin-bottom: 8px; }
.reward { color: #ffd700; font-weight: bold; }
.check { position: absolute; top: 8px; right: 8px; width: 25px; height: 25px; background: #4caf50; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; }
.claim-all-btn { width: 100%; padding: 18px; background: linear-gradient(135deg,#f093fb,#f5576c); border: none; border-radius: 15px; color: #fff; font-size: 18px; font-weight: bold; cursor: pointer; }
</style>
