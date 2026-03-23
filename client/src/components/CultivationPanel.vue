<template>
  <div class="cultivation-panel">
    <!-- 境界展示 -->
    <div class="realm-showcase">
      <div class="realm-bg"></div>
      <div class="realm-particles">
        <span v-for="i in 20" :key="i" class="particle" :style="{ '--delay': i * 0.5 + 's' }">✨</span>
      </div>
      <div class="realm-content">
        <div class="realm-icon">{{ realmIcon }}</div>
        <h2 class="realm-name">{{ realmName }}</h2>
        <div class="realm-level">境界 {{ realm }}</div>
      </div>
    </div>
    
    <!-- 灵气进度 -->
    <div class="cultivation-progress">
      <div class="progress-header">
        <span>灵气值</span>
        <span class="progress-value">{{ cultivation }} / {{ cost }}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progress + '%' }">
          <span class="progress-glow"></span>
        </div>
      </div>
      <p class="progress-hint">修炼中自动增长灵气</p>
    </div>
    
    <!-- 属性展示 -->
    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-icon">⚔️</span>
        <span class="stat-value">{{ attack }}</span>
        <span class="stat-label">攻击力</span>
      </div>
      <div class="stat-card">
        <span class="stat-icon">🛡️</span>
        <span class="stat-value">{{ defense }}</span>
        <span class="stat-label">防御力</span>
      </div>
      <div class="stat-card">
        <span class="stat-icon">❤️</span>
        <span class="stat-value">{{ hp }}</span>
        <span class="stat-label">生命值</span>
      </div>
      <div class="stat-card">
        <span class="stat-icon">⚡</span>
        <span class="stat-value">{{ speed }}</span>
        <span class="stat-label">速度</span>
      </div>
    </div>
    
    <!-- 修炼按钮 -->
    <div class="actions">
      <button class="cultivate-btn" @click="doCultivate" :disabled="isCultivating">
        <span class="btn-icon">🧘</span>
        <span class="btn-text">{{ isCultivating ? '修炼中...' : '开始修炼' }}</span>
        <span class="btn-glow"></span>
      </button>
      <button class="breakthrough-btn" @click="doBreakthrough" :disabled="!canBreakthrough">
        <span class="btn-icon">✨</span>
        <span class="btn-text">{{ canBreakthrough ? '突破境界' : '灵气不足' }}</span>
      </button>
    </div>
    
    <!-- 加载状态 -->
    <div v-if="loading" class="loading">加载中...</div>
    
    <!-- 特效层 -->
    <div v-if="showEffect" class="effect-layer">
      <div class="breakthrough-effect">
        <span v-for="i in 30" :key="i" class="effect-particle">✨</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { cultivationApi, playerApi } from '../api'

const cultivation = ref(0)
const realm = ref(1)
const realmName = ref('练气')
const realmIcon = ref('🧘')
const cost = ref(1000)
const attack = ref(100)
const defense = ref(50)
const hp = ref(1000)
const speed = ref(10)
const isCultivating = ref(false)
const showEffect = ref(false)
const loading = ref(true)

const progress = computed(() => Math.min(100, (cultivation.value / cost.value) * 100))
const canBreakthrough = computed(() => cultivation.value >= cost.value)

// 加载数据
async function loadData() {
  loading.value = true
  try {
    // 并行请求
    const [cultRes, playerRes] = await Promise.all([
      cultivationApi.get(),
      playerApi.get()
    ])
    
    const cultData = cultRes.data
    const playerData = playerRes.data
    
    cultivation.value = cultData.value
    realm.value = cultData.realm
    realmName.value = cultData.realmName
    realmIcon.value = cultData.realmIcon
    cost.value = cultData.cost
    
    attack.value = playerData.attack
    defense.value = playerData.defense
    hp.value = playerData.hp
    speed.value = playerData.speed
    
  } catch (e) {
    console.error('加载失败:', e)
  } finally {
    loading.value = false
  }
}

// 修炼
async function doCultivate() {
  isCultivating.value = true
  try {
    const res = await cultivationApi.start()
    cultivation.value = res.data.cultivation
  } catch (e) {
    console.error('修炼失败:', e)
  } finally {
    isCultivating.value = false
  }
}

// 突破
async function doBreakthrough() {
  if (!canBreakthrough.value) return
  
  try {
    const res = await cultivationApi.breakthrough()
    if (res.data.success) {
      showEffect.value = true
      realm.value = res.data.newRealm
      realmName.value = res.data.realmName
      cultivation.value = 0
      setTimeout(() => { showEffect.value = false }, 2000)
    }
  } catch (e) {
    console.error('突破失败:', e)
  }
}

onMounted(loadData)
</script>

<style scoped>
.cultivation-panel { padding: 20px; position: relative; overflow: hidden; }
.loading { text-align: center; padding: 20px; color: #f093fb; }

/* 境界展示 */
.realm-showcase { position: relative; text-align: center; padding: 40px 20px; background: linear-gradient(135deg, rgba(102,126,234,0.3), rgba(118,75,162,0.3)); border-radius: 20px; margin-bottom: 25px; overflow: hidden; }
.realm-bg { position: absolute; inset: 0; background: radial-gradient(circle at 50% 50%, rgba(102,126,234,0.2), transparent 70%), url('@/assets/images/bg-cultivation-main-new.png') center/cover no-repeat; }
.realm-particles { position: absolute; inset: 0; pointer-events: none; }
.particle { position: absolute; font-size: 12px; opacity: 0; animation: float-particle 3s infinite ease-in-out; left: calc(var(--delay) * 10 % 100); top: calc(var(--delay) * 15 % 100); }
@keyframes float-particle { 0%, 100% { opacity: 0; transform: translateY(20px); } 50% { opacity: 0.8; transform: translateY(-20px); } }
.realm-content { position: relative; z-index: 1; }
.realm-icon { font-size: 80px; margin-bottom: 15px; animation: pulse 2s infinite; }
@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
.realm-name { color: #fff; font-size: 28px; margin-bottom: 10px; text-shadow: 0 0 20px rgba(102,126,234,0.8); }
.realm-level { color: #f093fb; font-size: 16px; }

/* 进度条 */
.cultivation-progress { margin-bottom: 25px; }
.progress-header { display: flex; justify-content: space-between; margin-bottom: 10px; color: #fff; }
.progress-value { color: #f093fb; }
.progress-bar { height: 20px; background: rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #667eea, #764ba2, #f093fb); border-radius: 10px; transition: width 0.5s; position: relative; overflow: hidden; }
.progress-glow { position: absolute; top: 0; left: 0; right: 0; height: 50%; background: linear-gradient(to bottom, rgba(255,255,255,0.3), transparent); }
.progress-hint { text-align: center; opacity: 0.6; font-size: 12px; margin-top: 8px; }

/* 属性卡片 */
.stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 25px; }
.stat-card { background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05)); padding: 20px; border-radius: 15px; text-align: center; border: 1px solid rgba(255,255,255,0.1); transition: all 0.3s; }
.stat-card:hover { transform: translateY(-5px); border-color: rgba(102,126,234,0.5); }
.stat-icon { font-size: 30px; display: block; margin-bottom: 10px; }
.stat-value { display: block; font-size: 24px; font-weight: bold; color: #fff; }
.stat-label { display: block; font-size: 12px; opacity: 0.7; margin-top: 5px; }

/* 按钮 */
.actions { display: flex; gap: 15px; }
.cultivate-btn, .breakthrough-btn { flex: 1; padding: 18px; border: none; border-radius: 15px; color: #fff; cursor: pointer; position: relative; overflow: hidden; transition: all 0.3s; }
.cultivate-btn { background: linear-gradient(135deg, #667eea, #764ba2); }
.breakthrough-btn { background: linear-gradient(135deg, #f093fb, #f5576c); }
.cultivate-btn:hover, .breakthrough-btn:hover { transform: translateY(-3px); box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
.cultivate-btn:disabled, .breakthrough-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.btn-icon { font-size: 24px; display: block; margin-bottom: 8px; }
.btn-text { font-size: 16px; font-weight: bold; }

/* 特效 */
.effect-layer { position: fixed; inset: 0; pointer-events: none; z-index: 1000; display: flex; align-items: center; justify-content: center; }
.breakthrough-effect { font-size: 50px; animation: effect-burst 2s forwards; }
.effect-particle { position: absolute; font-size: 30px; animation: explode 1s forwards; }
@keyframes effect-burst { 0% { transform: scale(0); opacity: 1; } 50% { transform: scale(2); opacity: 1; } 100% { transform: scale(3); opacity: 0; } }
@keyframes explode { 0% { transform: translate(0, 0) scale(1); opacity: 1; } 100% { transform: translate(var(--x), var(--y)) scale(0); opacity: 0; } }
</style>
