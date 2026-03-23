<template>
  <div class="quest-panel">
    <h2>📜 任务系统</h2>
    <div class="quest-tabs">
      <button :class="{active:tab==='main'}" @click="tab='main'">主线</button>
      <button :class="{active:tab==='side'}" @click="tab='side'">支线</button>
      <button :class="{active:tab==='daily'}" @click="tab='daily'">日常</button>
    </div>
    <div class="quest-list">
      <div v-for="q in quests" :key="q.id" class="quest-card">
        <span class="quest-icon">{{ q.icon }}</span>
        <div class="quest-info">
          <span class="title">{{ q.title }}</span>
          <span class="desc">{{ q.desc }}</span>
          <div class="quest-progress"><div class="bar" :style="{width:q.progress+'%'}"></div></div>
        </div>
        <button class="go-btn">前往</button>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue'
const tab = ref('main')
const quests = ref([
  {id:1,icon:'⚔️',title:'击败BOSS',desc:'通关副本',progress:80},
  {id:2,icon:'🧘',title:'修炼',desc:'提升境界',progress:50}
])
</script>
<style scoped>
.quest-panel { padding: 20px; }
h2 { color: #f093fb; font-size: 24px; margin-bottom: 20px; }
.quest-tabs { display: flex; gap: 10px; margin-bottom: 20px; }
.quest-tabs button { flex: 1; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: #fff; cursor: pointer; }
.quest-tabs button.active { background: linear-gradient(135deg,#667eea,#764ba2); border-color: transparent; }
.quest-list { display: flex; flex-direction: column; gap: 12px; }
.quest-card { display: flex; align-items: center; gap: 15px; background: rgba(255,255,255,0.05); padding: 18px; border-radius: 15px; }
.quest-icon { font-size: 36px; }
.quest-info { flex: 1; }
.quest-info .title { display: block; color: #fff; font-weight: bold; }
.quest-info .desc { font-size: 12px; opacity: 0.7; }
.quest-progress { height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; margin-top: 8px; }
.quest-progress .bar { height: 100%; background: linear-gradient(90deg,#667eea,#764ba2); }
.go-btn { padding: 12px 25px; background: linear-gradient(135deg,#667eea,#764ba2); border: none; border-radius: 25px; color: #fff; font-weight: bold; cursor: pointer; }
</style>
