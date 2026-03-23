<template>
  <div class="vip-panel">
    <h2>👑 VIP系统</h2>
    <div class="vip-level">
      <span>VIP</span>
      <span class="level">{{ vipLevel }}</span>
    </div>
    <div class="vip-rights">
      <div v-for="r in rights" :key="r.id" class="right">
        <span>{{ r.name }}</span>
        <span :class="{ active: r.unlocked }">{{ r.unlocked ? '✓' : '✗' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const vipLevel = ref(1)
const rights = ref([
  { id: 1, name: '专属副本', unlocked: true },
  { id: 2, name: '经验加成', unlocked: true },
  { id: 3, name: '每日礼包', unlocked: false }
])
</script>

<style scoped>
.vip-panel { padding: 20px; }
h2 { color: #f093fb; }
.vip-level { text-align: center; padding: 30px; background: linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,165,0,0.2)); border-radius: 15px; }
.vip-level .level { font-size: 50px; color: #ffd700; display: block; }
.right { display: flex; justify-content: space-between; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 10px; margin-bottom: 10px; }
.right .active { color: #4caf50; }
</style>
