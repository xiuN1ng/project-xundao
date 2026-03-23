<template>
  <div class="title-panel">
    <h2>📜 称号系统</h2>
    
    <!-- 当前称号 -->
    <div class="current-title">
      <span class="current-label">当前称号</span>
      <span class="current-name">{{ currentTitle?.name || '无' }}</span>
    </div>
    
    <!-- 称号列表 -->
    <div class="title-list">
      <div v-for="title in titles" :key="title.id" 
           class="title-card"
           :class="{ active: currentTitle?.id === title.id, locked: !title.unlocked }">
        <div class="title-icon">{{ title.icon }}</div>
        <div class="title-info">
          <span class="title-name">{{ title.name }}</span>
          <span class="title-desc">{{ title.description }}</span>
          <span v-if="!title.unlocked" class="unlock-req">{{ title.unlock }}</span>
        </div>
        <button v-if="title.unlocked && currentTitle?.id !== title.id" @click="setTitle(title)">
          装备
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const currentTitle = ref({ id: 1, name: '初入仙途' })

const titles = ref([
  { id: 1, icon: '🌱', name: '初入仙途', description: '刚开始修仙的玩家', unlock: '', unlocked: true },
  { id: 2, icon: '🧘', name: '筑基修士', description: '境界达到筑基', unlock: '筑基境界', unlocked: true },
  { id: 3, icon: '⚔️', name: '战斗达人', description: '累计1000场战斗', unlock: '战斗1000次', unlocked: false },
  { id: 4, icon: '💰', name: '灵石大亨', description: '拥有100万灵石', unlock: '灵石100万', unlocked: false },
  { id: 5, icon: '👑', name: '宗门之主', description: '成为宗门掌门', unlock: '建立宗门', unlocked: false }
])

function setTitle(title) {
  currentTitle.value = title
}
</script>

<style scoped>
.title-panel { padding: 20px; }
h2 { color: #f093fb; margin-bottom: 20px; }

.current-title { background: linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,165,0,0.2)); padding: 20px; border-radius: 15px; text-align: center; margin-bottom: 25px; }
.current-label { display: block; opacity: 0.7; font-size: 14px; margin-bottom: 10px; }
.current-name { font-size: 24px; color: #ffd700; font-weight: bold; }

.title-list { display: flex; flex-direction: column; gap: 12px; }
.title-card { display: flex; align-items: center; gap: 15px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 12px; }
.title-card.locked { opacity: 0.5; }
.title-card.active { border: 2px solid #ffd700; background: rgba(255,215,0,0.1); }
.title-icon { width: 45px; height: 45px; background: rgba(255,215,0,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; }
.title-info { flex: 1; }
.title-name { display: block; color: #fff; font-weight: bold; }
.title-desc { display: block; font-size: 12px; opacity: 0.7; }
.unlock-req { display: block; font-size: 11px; color: #f44336; margin-top: 5px; }
.title-card button { padding: 8px 20px; background: #667eea; border: none; border-radius: 20px; color: #fff; cursor: pointer; }
</style>
