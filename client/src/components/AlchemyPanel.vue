<template>
  <div class="alchemy-panel">
    <h2>⚗️ 炼丹系统</h2>
    
    <!-- 炼丹炉 -->
    <div class="furnace-section">
      <div class="furnace-display">
        <div class="furnace-glow"></div>
        <span class="furnace-icon" :class="{ active: isCrafting }">🏺</span>
        <div class="flames">
          <span v-for="i in 5" :key="i" class="flame" :style="{ '--i': i }">🔥</span>
        </div>
      </div>
      <div class="furnace-info">
        <div class="furnace-level">
          <span class="level-num">{{ furnace.level }}</span>
          <span class="level-label">炼丹炉等级</span>
        </div>
        <button class="upgrade-btn" @click="upgradeFurnace">
          ⬆️ 升级
        </button>
      </div>
    </div>
    
    <!-- 材料 -->
    <div class="materials-section">
      <h3>🎒 材料</h3>
      <div class="material-grid">
        <div v-for="mat in materials" :key="mat.id" class="material-card">
          <span class="mat-icon">{{ mat.icon }}</span>
          <span class="mat-name">{{ mat.name }}</span>
          <span class="mat-count">x{{ mat.count }}</span>
        </div>
      </div>
    </div>
    
    <!-- 丹方 -->
    <div class="recipes-section">
      <h3>📜 丹方</h3>
      <div class="recipe-list">
        <div v-for="recipe in recipes" :key="recipe.id" class="recipe-card">
          <div class="recipe-header">
            <span class="recipe-icon">{{ recipe.icon }}</span>
            <span class="recipe-name">{{ recipe.name }}</span>
            <span class="recipe-rate">{{ recipe.success }}%</span>
          </div>
          <div class="recipe-materials">
            <span v-for="(mat, idx) in recipe.materials" :key="idx">
              {{ mat.name }}x{{ mat.count }}
            </span>
          </div>
          <button class="craft-btn" @click="craft(recipe)" :disabled="isCrafting">
            {{ isCrafting ? '炼制中...' : '炼制' }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- 丹药 -->
    <div class="pills-section">
      <h3>💊 我的丹药</h3>
      <div class="pill-grid">
        <div v-for="pill in pills" :key="pill.id" class="pill-card">
          <span class="pill-icon">{{ pill.icon }}</span>
          <span class="pill-name">{{ pill.name }}</span>
          <span class="pill-count">x{{ pill.count }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'

const furnace = ref({ level: 3 })
const isCrafting = ref(false)

const materials = ref([
  { id: 1, icon: '🌿', name: '灵草', count: 25 },
  { id: 2, icon: '💎', name: '灵石', count: 100 },
  { id: 3, icon: '🔥', name: '火精', count: 5 }
])

const recipes = ref([
  { id: 1, icon: '💊', name: '灵气丹', success: 90, materials: [{ name: '灵草', count: 2 }, { name: '灵石', count: 10 }] },
  { id: 2, icon: '💊', name: '筑基丹', success: 70, materials: [{ name: '灵草', count: 5 }, { name: '灵石', count: 50 }] }
])

const pills = ref([
  { id: 1, icon: '💊', name: '灵气丹', count: 10 },
  { id: 2, icon: '💊', name: '筑基丹', count: 3 }
])

async function upgradeFurnace() {
  await axios.post('/api/alchemy/furnace/upgrade')
}

async function craft(recipe) {
  isCrafting.value = true
  try {
    await axios.post('/api/alchemy/craft', { recipeId: recipe.id })
  } finally {
    isCrafting.value = false
  }
}
</script>

<style scoped>
.alchemy-panel { padding: 20px; }

h2 { color: #f093fb; font-size: 24px; margin-bottom: 25px; }
h3 { color: #667eea; font-size: 16px; margin-bottom: 15px; }

/* 炼丹炉 */
.furnace-section {
  background: linear-gradient(135deg, rgba(255,152,0,0.1), rgba(255,87,34,0.1));
  border-radius: 20px; padding: 30px; margin-bottom: 25px;
}

.furnace-display { text-align: center; position: relative; margin-bottom: 20px; }

.furnace-glow {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 150px; height: 150px;
  background: radial-gradient(circle, rgba(255,152,0,0.3), transparent 70%);
}

.furnace-icon {
  font-size: 100px; position: relative; z-index: 1;
  display: inline-block; transition: all 0.3s;
}

.furnace-icon.active { animation: shake 0.5s infinite; }

@keyframes shake {
  0%, 100% { transform: rotate(-5deg); }
  50% { transform: rotate(5deg); }
}

.flames {
  position: absolute; bottom: -20px; left: 50%; transform: translateX(-50%);
  display: flex; gap: 5px;
}

.flame { font-size: 20px; animation: flicker 0.5s infinite; opacity: 0; }
.flame:nth-child(1) { animation-delay: 0s; }
.flame:nth-child(2) { animation-delay: 0.1s; }
.flame:nth-child(3) { animation-delay: 0.2s; }

@keyframes flicker {
  0%, 100% { opacity: 0; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(-10px); }
}

.furnace-info { display: flex; justify-content: space-between; align-items: center; }

.level-num { display: block; font-size: 32px; color: #ff9800; font-weight: bold; }
.level-label { font-size: 12px; opacity: 0.7; }

.upgrade-btn {
  padding: 12px 25px;
  background: linear-gradient(135deg, #ff9800, #ff5722);
  border: none; border-radius: 25px; color: #fff; font-weight: bold;
  cursor: pointer;
}

/* 材料 */
.material-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 25px; }

.material-card {
  background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px;
  text-align: center;
}

.mat-icon { display: block; font-size: 30px; margin-bottom: 8px; }
.mat-name { display: block; color: #fff; font-size: 14px; }
.mat-count { display: block; color: #f093fb; font-size: 12px; }

/* 丹方 */
.recipe-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 25px; }

.recipe-card {
  background: rgba(255,255,255,0.05); padding: 18px; border-radius: 15px;
}

.recipe-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.recipe-icon { font-size: 30px; }
.recipe-name { flex: 1; color: #fff; font-weight: bold; }
.recipe-rate { color: #4caf50; font-weight: bold; }

.recipe-materials { font-size: 12px; opacity: 0.7; margin-bottom: 15px; }

.craft-btn {
  width: 100%; padding: 12px;
  background: linear-gradient(135deg, #f093fb, #f5576c);
  border: none; border-radius: 12px; color: #fff; font-weight: bold;
  cursor: pointer;
}

/* 丹药 */
.pill-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }

.pill-card {
  background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px;
  text-align: center;
}

.pill-icon { display: block; font-size: 24px; margin-bottom: 8px; }
.pill-name { display: block; color: #fff; font-size: 12px; }
.pill-count { display: block; color: #f093fb; font-size: 11px; }
</style>
