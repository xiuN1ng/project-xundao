<template>
  <div class="sect-panel" style="background: linear-gradient(135deg, rgba(20,20,50,0.92) 0%, rgba(10,10,30,0.90) 100%), url(@/assets/images/bg-sect-court-new.png) center/cover no-repeat fixed;">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading">加载中...</div>
    
    <!-- 宗门展示 -->
    <div class="sect-header" v-if="sect">
      <div class="sect-banner"></div>
      <div class="sect-emblem">{{ sect.icon }}</div>
      <div class="sect-title">
        <h2>{{ sect.name }}</h2>
        <span class="sect-level">等级 {{ sect.level }}</span>
      </div>
    </div>
    
    <!-- 宗门信息 -->
    <div class="sect-info" v-if="sect">
      <div class="info-grid">
        <div class="info-item">
          <span class="value">{{ sect.members }}</span>
          <span class="label">成员</span>
        </div>
        <div class="info-item">
          <span class="value">{{ sect.rank }}</span>
          <span class="label">排名</span>
        </div>
        <div class="info-item">
          <span class="value">{{ sect.contribution }}</span>
          <span class="label">贡献</span>
        </div>
      </div>
    </div>
    
    <!-- 宗门建筑 -->
    <div class="buildings-section">
      <h3>🏛️ 建筑</h3>
      <div class="building-grid">
        <div v-for="b in buildings" :key="b.id" class="building-card">
          <div class="building-icon">{{ b.icon }}</div>
          <div class="building-info">
            <span class="name">{{ b.name }}</span>
            <span class="level">Lv.{{ b.level }}</span>
          </div>
          <button class="upgrade-btn" @click="upgradeBuilding(b.id)">升级</button>
        </div>
      </div>
    </div>
    
    <!-- 成员列表 -->
    <div class="members-section">
      <h3>👥 成员 ({{ members.length }})</h3>
      <div class="member-list">
        <div v-for="m in members" :key="m.id" class="member-card">
          <div class="member-avatar">{{ m.name[0] }}</div>
          <div class="member-info">
            <span class="name">{{ m.name }}</span>
            <span class="role">{{ m.role }}</span>
          </div>
          <div class="member-contrib">{{ m.contribution }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { sectApi } from '../api'

const sect = ref(null)
const members = ref([])
const buildings = ref([])
const loading = ref(true)

async function loadData() {
  loading.value = true
  try {
    const res = await sectApi.get()
    sect.value = res.data.sect
    members.value = res.data.members
    buildings.value = res.data.sect.buildings
  } catch (e) {
    console.error('加载失败:', e)
  } finally {
    loading.value = false
  }
}

async function upgradeBuilding(buildingId) {
  try {
    await sectApi.upgradeBuilding(buildingId)
    await loadData()
  } catch (e) {
    console.error('升级失败:', e)
  }
}

onMounted(loadData)
</script>

<style scoped>
.sect-panel { padding: 20px; }
.loading { text-align: center; padding: 20px; color: #f093fb; }
.sect-header { position: relative; padding: 30px 20px; border-radius: 20px; overflow: hidden; margin-bottom: 25px; }
.sect-banner { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(102,126,234,0.4), rgba(118,75,162,0.4)); }
.sect-emblem { position: relative; z-index: 1; font-size: 80px; text-align: center; animation: float 3s ease-in-out infinite; }
@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
.sect-title { position: relative; z-index: 1; text-align: center; }
.sect-title h2 { color: #fff; font-size: 28px; margin-bottom: 8px; }
.sect-level { display: inline-block; padding: 5px 15px; background: rgba(240,147,251,0.3); border-radius: 20px; color: #f093fb; font-size: 14px; }
.sect-info { margin-bottom: 25px; }
.info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
.info-item { background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05)); padding: 20px; border-radius: 15px; text-align: center; }
.info-item .value { display: block; font-size: 28px; color: #f093fb; font-weight: bold; }
.info-item .label { display: block; font-size: 12px; opacity: 0.7; margin-top: 5px; }
.buildings-section, .members-section { margin-bottom: 25px; }
h3 { color: #667eea; font-size: 18px; margin-bottom: 15px; }
.building-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.building-card { display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; transition: all 0.3s; }
.building-card:hover { background: rgba(255,255,255,0.08); transform: translateX(5px); }
.building-icon { font-size: 30px; }
.building-info { flex: 1; }
.building-info .name { display: block; color: #fff; font-weight: bold; }
.building-info .level { font-size: 12px; color: #f093fb; }
.upgrade-btn { padding: 8px 15px; background: linear-gradient(135deg, #667eea, #764ba2); border: none; border-radius: 20px; color: #fff; font-size: 12px; cursor: pointer; }
.member-list { display: flex; flex-direction: column; gap: 10px; }
.member-card { display: flex; align-items: center; gap: 15px; background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; transition: all 0.3s; }
.member-card:hover { background: rgba(255,255,255,0.08); }
.member-avatar { width: 45px; height: 45px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: bold; font-size: 18px; }
.member-info { flex: 1; }
.member-info .name { display: block; color: #fff; }
.member-info .role { font-size: 12px; color: #f093fb; }
.member-contrib { color: #ffd700; font-weight: bold; }
</style>
