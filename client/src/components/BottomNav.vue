<template>
  <nav class="bottom-nav">
    <div class="nav-item" 
         v-for="item in navItems" 
         :key="item.path"
         :class="{ active: isActive(item.path) }"
         @click="navigate(item.path)">
      <div class="nav-icon">{{ item.icon }}</div>
      <span class="nav-label">{{ item.label }}</span>
    </div>
  </nav>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const navItems = [
  { path: '/', icon: '🏠', label: '首页' },
  { path: '/cultivation', icon: '🧘', label: '修炼' },
  { path: '/sect', icon: '🏯', label: '宗门' },
  { path: '/battle', icon: '⚔️', label: '战斗' },
  { path: '/more', icon: '📱', label: '更多' }
]

function isActive(path) {
  return route.path === path
}

function navigate(path) {
  router.push(path)
}
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: rgba(26,26,46,0.95);
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 0 10px;
  padding-bottom: env(safe-area-inset-bottom, 8px);
  border-top: 1px solid rgba(255,255,255,0.1);
  z-index: 1000;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-item:active { transform: scale(0.95); }
.nav-item.active .nav-icon { transform: scale(1.1); }

.nav-icon { font-size: 22px; margin-bottom: 2px; }
.nav-label { font-size: 10px; color: rgba(255,255,255,0.6); }
.nav-item.active .nav-label { color: #f093fb; font-weight: bold; }
</style>
