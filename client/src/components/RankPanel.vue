<template>
  <div class="rank-panel">
    <h2>📊 排行榜</h2>
    <div class="rank-tabs">
      <button :class="{active:tab==='power'}" @click="tab='power'">战力</button>
      <button :class="{active:tab==='level'}" @click="tab='level'">等级</button>
      <button :class="{active:tab==='wealth'}" @click="tab='wealth'">财富</button>
    </div>
    <div class="rank-list">
      <div v-for="(p,index) in ranks" :key="p.id" class="rank-card" :class="{top3:index<3}">
        <span class="rank-num">{{ index<3?['🥇','🥈','🥉'][index]:'#'+(index+1) }}</span>
        <div class="player-avatar">{{ p.name[0] }}</div>
        <div class="player-info">
          <span class="name">{{ p.name }}</span>
          <span class="value">{{ p.value.toLocaleString() }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { rankApi } from '../api'
const tab = ref('power')
const ranks = ref([
  {id:1,name:'剑仙李白',value:158000},
  {id:2,name:'丹帝',value:142000},
  {id:3,name:'阵法师',value:135000},
  {id:4,name:'散修',value:98000}
])
</script>
<style scoped>
.rank-panel { padding: 20px; }
h2 { color: #f093fb; font-size: 24px; margin-bottom: 20px; }
.rank-tabs { display: flex; gap: 10px; margin-bottom: 20px; }
.rank-tabs button { flex: 1; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: #fff; cursor: pointer; }
.rank-tabs button.active { background: linear-gradient(135deg,#667eea,#764ba2); border-color: transparent; }
.rank-list { display: flex; flex-direction: column; gap: 12px; }
.rank-card { display: flex; align-items: center; gap: 15px; background: rgba(255,255,255,0.05); padding: 18px; border-radius: 15px; }
.rank-card.top3 { border: 1px solid rgba(255,215,0,0.3); }
.rank-num { font-size: 24px; width: 40px; text-align: center; }
.player-avatar { width: 45px; height: 45px; background: linear-gradient(135deg,#667eea,#764ba2); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: bold; }
.player-info { flex: 1; }
.player-info .name { display: block; color: #fff; font-weight: bold; }
.player-info .value { color: #f093fb; }
</style>
