<template>
  <div class="hero-panel">
    <h2>🦸 英灵系统</h2>
    <div class="hero-list">
      <div v-for="hero in heroes" :key="hero.id" class="hero-card">
        <span class="hero-avatar" :class="hero.rarity">{{ hero.icon }}</span>
        <div class="hero-info">
          <span class="name">{{ hero.name }}</span>
          <span class="rarity">{{ hero.rarity }}</span>
          <div class="attr-row">
            <span>攻{{ hero.atk }}</span><span>防{{ hero.def }}</span><span>血{{ hero.hp }}</span>
          </div>
        </div>
        <button class="summon-btn">召唤</button>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue'
const heroes = ref([
  {id:1,icon:'⚔️',name:'剑圣',rarity:'SSR',atk:1000,def:500,hp:8000},
  {id:2,icon:'🛡️',name:'圣骑士',rarity:'SR',atk:600,def:800,hp:10000}
])
</script>
<style scoped>
.hero-panel { padding: 20px; }
h2 { color: #f093fb; font-size: 24px; margin-bottom: 20px; }
.hero-list { display: flex; flex-direction: column; gap: 15px; }
.hero-card { display: flex; align-items: center; gap: 15px; background: rgba(255,255,255,0.05); padding: 20px; border-radius: 15px; }
.hero-avatar { font-size: 50px; }
.hero-avatar.SSR { filter: drop-shadow(0 0 15px rgba(255,215,0,0.8)); }
.hero-avatar.SR { filter: drop-shadow(0 0 10px rgba(156,39,176,0.6)); }
.hero-info { flex: 1; }
.hero-info .name { display: block; color: #fff; font-weight: bold; }
.hero-info .rarity { font-size: 12px; color: #ffd700; }
.attr-row { display: flex; gap: 15px; margin-top: 8px; font-size: 12px; color: #f093fb; }
.summon-btn { padding: 12px 25px; background: linear-gradient(135deg,#ff9800,#ff5722); border: none; border-radius: 25px; color: #fff; font-weight: bold; cursor: pointer; }
</style>
