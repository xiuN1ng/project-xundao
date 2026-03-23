<template>
  <div class="wing-panel">
    <h2>🪽 翅膀系统</h2>
    <div class="wings">
      <span class="wing-icon">{{ currentWing?.icon || '🪽' }}</span>
    </div>
    <div class="wing-list">
      <div v-for="w in wings" :key="w.id" class="wing-card">
        <span>{{ w.icon }}</span>
        <span>{{ w.name }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { wingApi } from '../api'
const currentWing = ref(null)
const wings = ref([
  { id: 1, icon: '🪽', name: '初阶翅膀' },
  { id: 2, icon: '🕊️', name: '天使翅膀' }
])
</script>

<style scoped>
.wing-panel { padding: 20px; }
h2 { color: #f093fb; }
.wings { text-align: center; padding: 40px; }
.wing-icon { font-size: 100px; }
.wing-list { display: flex; gap: 15px; }
.wing-card { padding: 20px; background: rgba(255,255,255,0.05); border-radius: 10px; }
</style>
