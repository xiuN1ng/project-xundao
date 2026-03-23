<template>
  <div class="spirit-panel">
    <h2>🌟 灵气系统</h2>
    <div class="spirit-orbs">
      <div v-for="i in 8" :key="i" class="orb" :class="{ active: i <= spiritLevel }"></div>
    </div>
    <button @click="breakthrough" class="break-btn">突破</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const spiritLevel = ref(3)
function breakthrough() { spiritLevel.value++ }
</script>

<style scoped>
.spirit-panel {
  padding: 20px;
  background-image: url('@/assets/images/bg-spirit-root.png');
  background-size: cover;
  background-position: center;
  position: relative;
}
.spirit-panel::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(26, 26, 46, 0.85);
  pointer-events: none;
}
h2 { color: #f093fb; }
.spirit-orbs { display: flex; justify-content: center; gap: 20px; margin: 30px 0; }
.orb { width: 40px; height: 40px; background: rgba(255,255,255,0.1); border-radius: 50%; }
.orb.active { background: linear-gradient(135deg, #667eea, #764ba2); }
.break-btn { display: block; margin: 0 auto; padding: 15px 50px; background: linear-gradient(90deg, #667eea, #764ba2); border: none; border-radius: 25px; color: #fff; cursor: pointer; }
</style>
