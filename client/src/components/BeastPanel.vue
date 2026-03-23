<template>
  <div class="beast-panel">
    <h2>🦊 灵兽系统</h2>
    
    <!-- 灵兽展示台 -->
    <div class="beast-stage" v-if="selectedBeast">
      <div class="stage-glow"></div>
      <div class="beast-display">
        <span class="beast-sprite" :class="selectedBeast.quality">{{ selectedBeast.icon }}</span>
      </div>
      <div class="beast-name">{{ selectedBeast.name }}</div>
      <div class="beast-quality" :class="selectedBeast.quality">{{ qualityName }}</div>
    </div>
    
    <!-- 属性条 -->
    <div class="beast-stats" v-if="selectedBeast">
      <div class="stat-bar">
        <span class="stat-label">等级 Lv.{{ selectedBeast.level }}</span>
        <div class="bar">
          <div class="bar-fill" :style="{ width: '80%' }"></div>
        </div>
      </div>
      <div class="stat-row">
        <div class="stat">
          <span>攻击</span>
          <span class="value">{{ selectedBeast.attack }}</span>
        </div>
        <div class="stat">
          <span>生命</span>
          <span class="value">{{ selectedBeast.hp }}</span>
        </div>
      </div>
    </div>
    
    <!-- 灵兽列表 -->
    <div class="beast-list">
      <div v-for="beast in beasts" :key="beast.id" 
           class="beast-card" 
           :class="{ active: selectedBeast?.id === beast.id, [beast.quality]: true }"
           @click="selectBeast(beast)">
        <div class="card-glow"></div>
        <span class="beast-icon">{{ beast.icon }}</span>
        <div class="beast-info">
          <span class="name">{{ beast.name }}</span>
          <span class="level">Lv.{{ beast.level }}</span>
        </div>
        <div class="quality-badge" :class="beast.quality"></div>
      </div>
    </div>
    
    <!-- 操作按钮 -->
    <div class="beast-actions">
      <button class="action-btn upgrade" @click="upgradeBeast">
        <span>⬆️</span> 升级
      </button>
      <button class="action-btn feed" @click="feedBeast">
        <span>🍖</span> 喂养
      </button>
      <button class="action-btn battle" @click="battleBeast">
        <span>⚔️</span> 出战
      </button>
    </div>
    
    <!-- 捕捉按钮 -->
    <button class="capture-btn" @click="captureBeast">
      <span class="btn-icon">🎯</span>
      <span>捕捉灵兽</span>
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

const loading = ref(true)
const beasts = ref([])

async function loadData() {
  loading.value = true
  try {
    const res = await beastApi.getList()
    beasts.value = res.data || []
    if (beasts.value.length > 0) selectedBeast.value = beasts.value[0]
  } finally { loading.value = false }
}

onMounted(loadData)
const selectedBeast = ref(null)

const qualityNames = { common: '普通', uncommon: '优秀', rare: '稀有', epic: '史诗', legendary: '传说' }
const qualityName = computed(() => selectedBeast.value ? qualityNames[selectedBeast.value.quality] : '')

onMounted(async () => {
  try {
    const res = await axios.get('/api/beast/my/list')
    beasts.value = res.data || []
    if (beasts.value.length > 0) selectedBeast.value = beasts.value[0]
  } catch (e) {
    // 模拟数据
    beasts.value = [
      { id: 1, icon: '🦊', name: '灵狐', level: 5, quality: 'common', attack: 50, hp: 200 },
      { id: 2, icon: '🦅', name: '雷鹰', level: 10, quality: 'uncommon', attack: 120, hp: 500 }
    ]
    selectedBeast.value = beasts.value[0]
  }
})

function selectBeast(beast) {
  selectedBeast.value = beast
}

async function upgradeBeast() {
  if (!selectedBeast.value) return
  await axios.post('/api/beast/upgrade', { beastId: selectedBeast.value.id })
}

async function feedBeast() {
  if (!selectedBeast.value) return
  await axios.post('/api/beast/feed', { beastId: selectedBeast.value.id })
}

async function battleBeast() {
  // 出战逻辑
}

async function captureBeast() {
  await axios.post('/api/beast/capture', { beastId: 'spirit_fox' })
}
</script>

<style scoped>
.beast-panel { padding: 20px; }

/* 标题 */
h2 { 
  color: #f093fb; 
  font-size: 24px; 
  margin-bottom: 20px; 
  text-shadow: 0 0 20px rgba(240,147,251,0.5);
}

/* 灵兽展示台 */
.beast-stage {
  position: relative; text-align: center; padding: 40px 20px;
  background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
  border-radius: 20px; margin-bottom: 25px; overflow: hidden;
}

.stage-glow {
  position: absolute; inset: 0;
  background: radial-gradient(circle at 50% 30%, rgba(240,147,251,0.2), transparent 60%);
}

.beast-display { position: relative; z-index: 1; }

.beast-sprite {
  font-size: 100px; 
  display: inline-block;
  animation: bounce 2s infinite ease-in-out;
  filter: drop-shadow(0 10px 20px rgba(0,0,0,0.3));
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-15px); }
}

.beast-sprite.common { filter: drop-shadow(0 0 10px rgba(255,255,255,0.3)); }
.beast-sprite.uncommon { filter: drop-shadow(0 0 15px rgba(76,175,80,0.5)); }
.beast-sprite.rare { filter: drop-shadow(0 0 20px rgba(33,150,243,0.6)); }
.beast-sprite.epic { filter: drop-shadow(0 0 25px rgba(156,39,176,0.7)); }
.beast-sprite.legendary { filter: drop-shadow(0 0 30px rgba(255,152,0,0.8)); animation: bounce 1.5s infinite, glow 2s infinite alternate; }

@keyframes glow { from { filter: drop-shadow(0 0 20px rgba(255,152,0,0.5)); } to { filter: drop-shadow(0 0 40px rgba(255,152,0,1)); } }

.beast-name { font-size: 28px; color: #fff; margin: 15px 0 8px; position: relative; z-index: 1; }

.quality-badge {
  display: inline-block; padding: 5px 15px; border-radius: 20px; font-size: 12px; position: relative; z-index: 1;
}
.quality-badge.common { background: rgba(158,158,158,0.3); }
.quality-badge.uncommon { background: rgba(76,175,80,0.3); }
.quality-badge.rare { background: rgba(33,150,243,0.3); }
.quality-badge.epic { background: rgba(156,39,176,0.3); }
.quality-badge.legendary { background: rgba(255,152,0,0.3); }

/* 属性条 */
.beast-stats { margin-bottom: 25px; }
.stat-bar { margin-bottom: 15px; }
.stat-label { display: block; color: #fff; font-size: 14px; margin-bottom: 8px; }
.bar { height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; }
.bar-fill { height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 4px; }

.stat-row { display: flex; gap: 20px; }
.stat { flex: 1; text-align: center; }
.stat span:first-child { display: block; opacity: 0.7; font-size: 13px; }
.stat .value { display: block; font-size: 24px; color: #f093fb; font-weight: bold; }

/* 灵兽列表 */
.beast-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px; margin-bottom: 25px; }

.beast-card {
  position: relative; padding: 20px; background: rgba(255,255,255,0.05);
  border-radius: 15px; cursor: pointer; transition: all 0.3s; overflow: hidden;
  border: 2px solid transparent;
}

.beast-card:hover { transform: translateY(-5px); background: rgba(255,255,255,0.08); }
.beast-card.active { border-color: #667eea; background: rgba(102,126,234,0.15); }

.card-glow { position: absolute; inset: 0; opacity: 0; transition: opacity 0.3s; }
.beast-card:hover .card-glow, .beast-card.active .card-glow { opacity: 1; }
.beast-card.common .card-glow { background: radial-gradient(circle at 50% 0%, rgba(158,158,158,0.2), transparent 70%); }
.beast-card.uncommon .card-glow { background: radial-gradient(circle at 50% 0%, rgba(76,175,80,0.2), transparent 70%); }
.beast-card.rare .card-glow { background: radial-gradient(circle at 50% 0%, rgba(33,150,243,0.2), transparent 70%); }
.beast-card.epic .card-glow { background: radial-gradient(circle at 50% 0%, rgba(156,39,176,0.2), transparent 70%); }
.beast-card.legendary .card-glow { background: radial-gradient(circle at 50% 0%, rgba(255,152,0,0.2), transparent 70%); }

.beast-icon { font-size: 40px; display: block; margin-bottom: 10px; }
.beast-info { position: relative; z-index: 1; }
.beast-info .name { display: block; color: #fff; font-weight: bold; margin-bottom: 5px; }
.beast-info .level { font-size: 12px; opacity: 0.7; }

.quality-badge { position: absolute; top: 10px; right: 10px; width: 10px; height: 10px; padding: 0; border-radius: 50%; }

/* 操作按钮 */
.beast-actions { display: flex; gap: 12px; margin-bottom: 20px; }

.action-btn {
  flex: 1; padding: 15px; border: none; border-radius: 12px;
  color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: all 0.3s;
}

.action-btn.upgrade { background: linear-gradient(135deg, #667eea, #764ba2); }
.action-btn.feed { background: linear-gradient(135deg, #4caf50, #8bc34a); }
.action-btn.battle { background: linear-gradient(135deg, #f093fb, #f5576c); }

.action-btn:hover { transform: translateY(-3px); box-shadow: 0 10px 25px rgba(0,0,0,0.3); }

/* 捕捉按钮 */
.capture-btn {
  width: 100%; padding: 18px; border: none; border-radius: 15px;
  background: linear-gradient(135deg, #ff9800, #f57c00);
  color: #fff; font-size: 18px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 12px;
  transition: all 0.3s;
}

.capture-btn:hover { transform: translateY(-3px); box-shadow: 0 15px 35px rgba(255,152,0,0.4); }
.btn-icon { font-size: 24px; }
</style>
