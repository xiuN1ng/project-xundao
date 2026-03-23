<template>
  <div class="secret-panel" style="background-image: url('/assets/bg-adventure-mystery.png') !important; background-size: cover; background-position: center;">
    <h2>🔐 密室探险</h2>
    <div class="secret-gate">
      <span class="gate-icon">🚪</span>
      <span class="gate-status">{{ unlocked?'已开启':'未开启' }}</span>
    </div>
    <div class="secret-rewards">
      <h3>密室奖励</h3>
      <div class="reward-list">
        <span v-for="r in rewards" :key="r">{{ r }}</span>
      </div>
    </div>
    <button class="enter-btn" :disabled="!unlocked">进入密室</button>
  </div>
</template>
<script setup>
import { ref } from 'vue'
const unlocked = ref(false)
const rewards = ref(['💰1000','📜功法','💎10'])
</script>
<style scoped>
.secret-panel { padding: 20px; }
h2 { color: #f093fb; font-size: 24px; margin-bottom: 20px; }
.secret-gate { text-align: center; padding: 40px; background: linear-gradient(135deg,rgba(0,0,0,0.3),rgba(0,0,0,0.5)); border-radius: 20px; margin-bottom: 25px; }
.gate-icon { display: block; font-size: 80px; margin-bottom: 15px; }
.gate-status { color: #f093fb; }
.secret-rewards { margin-bottom: 25px; }
.secret-rewards h3 { color: #667eea; font-size: 16px; margin-bottom: 15px; }
.reward-list { display: flex; gap: 10px; flex-wrap: wrap; }
.reward-list span { padding: 10px 20px; background: rgba(255,215,0,0.1); border-radius: 20px; color: #ffd700; }
.enter-btn { width: 100%; padding: 18px; background: linear-gradient(135deg,#f093fb,#f5576c); border: none; border-radius: 15px; color: #fff; font-size: 18px; font-weight: bold; cursor: pointer; }
.enter-btn:disabled { opacity: 0.5; }
</style>
