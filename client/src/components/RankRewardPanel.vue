<template>
  <div class="rank-reward-panel">
    <h2>🎁 排行奖励</h2>
    <div class="reward-tips">每晚22:00结算</div>
    <div class="reward-list">
      <div v-for="r in rewards" :key="r.rank" class="reward-card" :class="{top3:r.rank<=3}">
        <span class="rank">{{ r.rank<=3?['🥇','🥈','🥉'][r.rank-1]:'#'+r.rank }}</span>
        <div class="reward-items">
          <span v-for="item in r.items" :key="item" class="item">{{ item }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue'
const rewards = ref([
  {rank:1,items:['💰5000','💎50']},
  {rank:2,items:['💰3000','💎30']},
  {rank:3,items:['💰2000','💎20']},
  {rank:4,items:['💰1000']}
])
</script>
<style scoped>
.rank-reward-panel { padding: 20px; }
h2 { color: #f093fb; font-size: 24px; margin-bottom: 10px; }
.reward-tips { color: #ffd700; font-size: 14px; margin-bottom: 20px; }
.reward-list { display: flex; flex-direction: column; gap: 12px; }
.reward-card { display: flex; align-items: center; gap: 15px; background: rgba(255,255,255,0.05); padding: 18px; border-radius: 15px; }
.reward-card.top3 { border: 1px solid rgba(255,215,0,0.3); }
.rank { font-size: 24px; width: 40px; }
.reward-items { flex: 1; display: flex; gap: 10px; }
.item { padding: 8px 15px; background: rgba(255,215,0,0.1); border-radius: 20px; color: #ffd700; }
</style>
