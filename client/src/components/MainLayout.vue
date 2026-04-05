<template>
  <div class="main-layout" style="background-image: url('/assets/bg-main-cultivation.png') !important; background-size: cover; background-position: center; background-attachment: fixed; background-repeat: no-repeat;">
    <!-- 顶部状态栏 -->
    <header class="top-bar">
      <div class="user-info">
        <span class="level-badge">Lv.{{ level }}</span>
        <span class="username">{{ username }}</span>
      </div>
      <div class="resources">
        <span class="resource">💰 {{ lingshi }}</span>
        <span class="resource">💎 {{ diamonds }}</span>
        <button class="guide-btn" @click="showGuide = true" title="新手引导">🌟</button>
      </div>
    </header>
    
    <!-- 主内容区 -->
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    
    <!-- 新手引导浮层 -->
    <GuidePanel v-if="showGuide" @close="showGuide = false" />

    <!-- 底部导航 -->
    <BottomNav />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import BottomNav from './BottomNav.vue'
import GuidePanel from './GuidePanel.vue'

const username = ref('修仙者')
const level = ref(5)
const lingshi = ref(125680)
const diamonds = ref(520)
const showGuide = ref(false)
</script>

<style scoped>
.main-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  overflow: hidden;
}

/* 顶部状态栏 */
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  padding-top: max(12px, env(safe-area-inset-top));
  background: rgba(26,26,46,0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255,255,255,0.1);
  z-index: 100;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.level-badge {
  padding: 4px 10px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 12px;
  color: #fff;
  font-size: 12px;
  font-weight: bold;
}

.username {
  color: #fff;
  font-size: 14px;
  font-weight: bold;
}

.resources {
  display: flex;
  gap: 12px;
}

.resource {
  padding: 6px 12px;
  background: rgba(255,255,255,0.1);
  border-radius: 15px;
  color: #fff;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 5px;
}

/* 主内容区 */
.main-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: 80px;
  -webkit-overflow-scrolling: touch;
}

/* 页面切换动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 新手引导按钮 */
.guide-btn {
  background: rgba(201,169,110,0.2);
  border: 1px solid rgba(201,169,110,0.4);
  color: #c9a96e;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
}
.guide-btn:hover {
  background: rgba(201,169,110,0.3);
}
</style>
