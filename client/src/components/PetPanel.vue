<template>
  <div class="pet-panel" style="background-image: url('/assets/spirit-beast-fox.png') !important; background-size: cover; background-position: center;">
    <h2>🐾 宠物系统</h2>
    <div class="pet-display" v-if="activePet">
      <span class="pet-sprite">{{ activePet.icon }}</span>
      <div class="pet-stats">
        <span class="name">{{ activePet.name }}</span>
        <span class="level">Lv.{{ activePet.level }}</span>
      </div>
    </div>
    <div class="pet-list">
      <div v-for="pet in pets" :key="pet.id" class="pet-card" :class="{active:activePet?.id===pet.id}">
        <span class="pet-icon">{{ pet.icon }}</span>
        <div class="pet-info"><span>{{ pet.name }}</span><span>Lv.{{ pet.level }}</span></div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue'
const activePet = ref({id:1,icon:'🐱',name:'灵猫',level:10})
const pets = ref([
  {id:1,icon:'🐱',name:'灵猫',level:10},
  {id:2,icon:'🐕',name:'灵犬',level:5}
])
</script>
<style scoped>
.pet-panel { padding: 20px; }
h2 { color: #f093fb; font-size: 24px; margin-bottom: 20px; }
.pet-display { text-align: center; padding: 30px; background: linear-gradient(135deg,rgba(255,152,0,0.2),rgba(255,87,34,0.2)); border-radius: 20px; margin-bottom: 25px; }
.pet-sprite { font-size: 80px; display: block; margin-bottom: 15px; animation: bounce 2s infinite; }
@keyframes bounce { 0%,100%{transform:translateY(0);}50%{transform:translateY(-10px);} }
.pet-stats .name { display: block; color: #fff; font-size: 24px; }
.pet-stats .level { color: #f093fb; }
.pet-list { display: flex; flex-direction: column; gap: 12px; }
.pet-card { display: flex; align-items: center; gap: 15px; background: rgba(255,255,255,0.05); padding: 15px; border-radius: 15px; }
.pet-card.active { border: 2px solid #ff9800; background: rgba(255,152,0,0.1); }
.pet-icon { font-size: 36px; }
.pet-info { flex: 1; display: flex; justify-content: space-between; }
.pet-info span { color: #fff; }
</style>
