<template>
  <div class="world-boss-panel">
    <h2>👹 世界BOSS</h2>
    <div class="boss-info">
      <span class="name">{{ boss.name }}</span>
      <div class="hp-bar">
        <div class="hp" :style="{ width: boss.hp + '%' }"></div>
      </div>
      <span>{{ boss.hp }}% HP</span>
    </div>
    <button class="attack-btn">攻击</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const boss = ref({ name: '年兽', hp: 75 })
</script>

<style scoped>
.world-boss-panel { padding: 20px; text-align: center; }
h2 { color: #f093fb; }
.boss-info { padding: 30px; background: rgba(244,67,54,0.1); border-radius: 15px; margin: 20px 0; }
.name { font-size: 30px; color: #f44336; display: block; margin-bottom: 15px; }
.hp-bar { height: 20px; background: rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden; margin-bottom: 10px; }
.hp { height: 100%; background: #f44336; }
.attack-btn { padding: 20px 80px; font-size: 24px; background: linear-gradient(90deg, #f44336, #ff9800); border: none; border-radius: 30px; color: #fff; cursor: pointer; }
</style>
