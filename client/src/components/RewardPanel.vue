<template>
  <div class="reward-panel">
    <h2>🎁 奖励中心</h2>
    <div class="reward-grid">
      <div v-for="r in rewards" :key="r.id" class="reward-card">
        <span class="reward-icon">{{ r.icon }}</span>
        <span class="reward-name">{{ r.name }}</span>
        <button class="claim-btn" :disabled="!r.canClaim">{{ r.canClaim?'领取':'已领取' }}</button>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue'
const rewards = ref([
  {id:1,icon:'💰',name:'灵石',canClaim:true},
  {id:2,icon:'💎',name:'钻石',canClaim:false}
])
</script>
<style scoped>
.reward-panel { padding: 20px; }
h2 { color: #f093fb; font-size: 24px; margin-bottom: 20px; }
.reward-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 15px; }
.reward-card { text-align: center; padding: 25px; background: rgba(255,255,255,0.05); border-radius: 15px; }
.reward-icon { display: block; font-size: 40px; margin-bottom: 10px; }
.reward-name { display: block; color: #fff; margin-bottom: 15px; }
.claim-btn { padding: 10px 25px; background: linear-gradient(135deg,#667eea,#764ba2); border: none; border-radius: 20px; color: #fff; cursor: pointer; }
.claim-btn:disabled { opacity: 0.5; }
</style>
