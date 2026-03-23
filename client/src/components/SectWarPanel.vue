<template>
  <div class="sect-war-panel" style="background-image: url('/assets/bg-sect-grand-hall.png') !important; background-size: cover; background-position: center;">
    <h2>⚔️ 宗门战</h2>
    <div class="war-status">
      <span class="status-badge">{{ status }}</span>
      <span class="countdown" v-if="status==='即将开始'">开始倒计时 2:30:00</span>
    </div>
    <div class="war-sect">
      <div class="sect vs">VS</div>
    </div>
    <div class="war-actions">
      <button>参战</button><button>观战</button>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue'
const status = ref('即将开始')
</script>
<style scoped>
.sect-war-panel { padding: 20px; }
h2 { color: #f093fb; font-size: 24px; margin-bottom: 20px; }
.war-status { text-align: center; margin-bottom: 30px; }
.status-badge { display: inline-block; padding: 10px 25px; background: rgba(244,67,54,0.2); border: 1px solid rgba(244,67,54,0.5); border-radius: 25px; color: #f44336; font-weight: bold; }
.countdown { display: block; color: #ffd700; margin-top: 10px; }
.war-sect { text-align: center; padding: 50px; background: linear-gradient(135deg,rgba(102,126,234,0.2),rgba(244,67,54,0.2)); border-radius: 20px; margin-bottom: 25px; }
.sect.vs { font-size: 60px; color: #fff; }
.war-actions { display: flex; gap: 15px; }
.war-actions button { flex: 1; padding: 18px; background: linear-gradient(135deg,#667eea,#764ba2); border: none; border-radius: 15px; color: #fff; font-weight: bold; cursor: pointer; }
</style>
