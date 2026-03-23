<template>
  <div class="equipment-panel" style="background-image: url('/assets/bg-equipment-panel.png') !important; background-size: cover; background-position: center;">
    <h2>⚔️ 装备系统</h2>
    <div class="equip-slots">
      <div v-for="slot in slots" :key="slot.type" class="equip-slot" :class="{filled:slot.item}">
        <span class="slot-icon">{{ slot.icon }}</span>
        <span v-if="slot.item" class="item-name">{{ slot.item.name }}</span>
        <span v-else class="empty">{{ slot.name }}</span>
      </div>
    </div>
    <div class="equipment-list">
      <div v-for="eq in equipment" :key="eq.id" class="equip-card">
        <span class="eq-icon">{{ eq.icon }}</span>
        <div class="eq-info"><span class="name">{{ eq.name }}</span><span class="attr">{{ eq.attr }}</span></div>
        <button class="equip-btn">穿戴</button>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { bagApi } from '../api'
const slots = ref([
  {type:'weapon',icon:'⚔️',name:'武器',item:{name:'铁剑'}},
  {type:'armor',icon:'🛡️',name:'护甲',item:null},
  {type:'helmet',icon:'⛑️',name:'头盔',item:null}
])
const equipment = ref([{id:1,icon:'⚔️',name:'铁剑',attr:'攻击+10'}])
</script>
<style scoped>
.equipment-panel { padding: 20px; }
h2 { color: #f093fb; font-size: 24px; margin-bottom: 20px; }
.equip-slots { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 25px; }
.equip-slot { width: 100px; height: 100px; background: rgba(255,255,255,0.05); border: 2px dashed rgba(255,255,255,0.2); border-radius: 15px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.equip-slot.filled { border-style: solid; border-color: #667eea; background: rgba(102,126,234,0.1); }
.slot-icon { font-size: 30px; }
.item-name { color: #fff; font-size: 12px; margin-top: 5px; }
.empty { color: rgba(255,255,255,0.3); font-size: 12px; }
.equipment-list { display: flex; flex-direction: column; gap: 12px; }
.equip-card { display: flex; align-items: center; gap: 15px; background: rgba(255,255,255,0.05); padding: 18px; border-radius: 15px; }
.eq-icon { font-size: 40px; }
.eq-info { flex: 1; }
.eq-info .name { display: block; color: #fff; font-weight: bold; }
.eq-info .attr { font-size: 12px; color: #f093fb; }
.equip-btn { padding: 10px 20px; background: linear-gradient(135deg,#667eea,#764ba2); border: none; border-radius: 20px; color: #fff; cursor: pointer; }
</style>
