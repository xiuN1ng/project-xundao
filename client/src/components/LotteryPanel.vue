<template>
  <div class="lottery-panel">
    <h2>🎰 幸运抽奖</h2>
    <div class="lottery-wheel">
      <div class="wheel" :class="{spinning:isSpinning}">
        <span v-for="(item,index) in items" :key="index" class="wheel-item" :style="{transform:`rotate(${index*60}deg)`}">{{ item.icon }}</span>
      </div>
      <div class="pointer">🔻</div>
    </div>
    <div class="lottery-actions">
      <button @click="spin(1)">单抽 💰100</button>
      <button @click="spin(10)">十连 💰900</button>
    </div>
    <div class="lottery-history">
      <h3>抽奖记录</h3>
      <div class="history-list">
        <span v-for="h in history" :key="h" class="history-item">{{ h }}</span>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { lotteryApi } from '../api'
const isSpinning = ref(false)
const items = ref([{icon:'💎'},{icon:'⚔️'},{icon:'🛡️'},{icon:'📦'},{icon:'🎁'},{icon:'💰'}])
const history = ref(['💎','⚔️','📦'])
function spin(count){isSpinning.value=true;setTimeout(()=>{isSpinning.value=false},3000)}
</script>
<style scoped>
.lottery-panel { padding: 20px; }
h2 { color: #f093fb; font-size: 24px; margin-bottom: 20px; }
.lottery-wheel { position: relative; width: 250px; height: 250px; margin: 0 auto 25px; }
.wheel { width: 100%; height: 100%; border-radius: 50%; background: linear-gradient(135deg,#667eea,#764ba2); display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; }
.wheel.spinning { animation: spin 3s ease-out; }
@keyframes spin { from{transform:rotate(0);}to{transform:rotate(1440deg);} }
.wheel-item { position: absolute; font-size: 24px; }
.pointer { position: absolute; top: -20px; left: 50%; transform: translateX(-50%); font-size: 40px; }
.lottery-actions { display: flex; gap: 15px; margin-bottom: 25px; }
.lottery-actions button { flex: 1; padding: 18px; background: linear-gradient(135deg,#f093fb,#f5576c); border: none; border-radius: 15px; color: #fff; font-weight: bold; cursor: pointer; }
.lottery-history h3 { color: #667eea; font-size: 16px; margin-bottom: 15px; }
.history-list { display: flex; flex-wrap: wrap; gap: 8px; }
.history-item { padding: 8px 15px; background: rgba(255,255,255,0.05); border-radius: 20px; font-size: 20px; }
</style>
