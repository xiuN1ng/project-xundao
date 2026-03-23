<template>
  <div class="forge-panel" style="background-image: url('/assets/bg-enhance-forge.png') !important; background-size: cover; background-position: center;">
    <h2>🔨 炼器系统</h2>
    
    <!-- Tab Navigation -->
    <div class="tab-nav">
      <button 
        v-for="tab in tabs" 
        :key="tab.id" 
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id">
        {{ tab.icon }} {{ tab.name }}
      </button>
    </div>
    
    <!-- Forge Tab -->
    <div v-if="activeTab === 'forge'" class="tab-content">
      <!-- Materials Display -->
      <div class="materials-bar">
        <div class="material-item" v-for="(count, matId) in materials" :key="matId">
          <span class="mat-icon">{{ getMaterialIcon(matId) }}</span>
          <span class="mat-name">{{ getMaterialName(matId) }}</span>
          <span class="mat-count">{{ count }}</span>
        </div>
      </div>
      
      <!-- Recipe Categories -->
      <div class="recipe-categories">
        <div class="category" v-for="cat in categories" :key="cat.id">
          <h3>{{ cat.icon }} {{ cat.name }}</h3>
          <div class="recipe-grid">
            <div 
              v-for="recipe in getRecipesByType(cat.id)" 
              :key="recipe.id" 
              class="recipe-card"
              :style="{ '--quality-color': recipe.color }">
              <div class="recipe-header">
                <span class="recipe-icon">{{ getTypeIcon(recipe.type) }}</span>
                <span class="recipe-name" :style="{ color: recipe.color }">{{ recipe.name }}</span>
                <span class="recipe-quality">{{ getQualityText(recipe.quality) }}</span>
              </div>
              <div class="recipe-desc">{{ recipe.desc }}</div>
              <div class="recipe-stats">
                <span v-for="(val, stat) in recipe.stats" :key="stat" class="stat-badge">
                  {{ getStatName(stat) }}+{{ val }}
                </span>
              </div>
              <div class="recipe-materials">
                <div 
                  v-for="cost in recipe.materialCosts" 
                  :key="cost.id" 
                  class="cost-item"
                  :class="{ insufficient: !cost.sufficient }">
                  <span>{{ cost.name }}</span>
                  <span>{{ cost.available }}/{{ cost.required }}</span>
                </div>
              </div>
              <button 
                class="forge-btn" 
                @click="forgeItem(recipe)"
                :disabled="!canForge(recipe)">
                {{ canForge(recipe) ? '打造' : '材料不足' }}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Forge Result Modal -->
      <div v-if="forgeResult" class="result-modal" :class="forgeResult.success ? 'success' : 'failure'">
        <div class="result-content">
          <span class="result-icon">{{ forgeResult.success ? '✨' : '💨' }}</span>
          <p>{{ forgeResult.message }}</p>
          <div v-if="forgeResult.success && forgeResult.equipment" class="forge-item">
            <span :style="{ color: forgeResult.equipment.color }">{{ forgeResult.equipment.name }}</span>
            <span class="level">+{{ forgeResult.equipment.strengthenLevel }}</span>
          </div>
          <button @click="forgeResult = null">确定</button>
        </div>
      </div>
    </div>
    
    <!-- Strengthen Tab -->
    <div v-if="activeTab === 'strengthen'" class="tab-content">
      <div class="strengthen-info">
        <h3>强化说明</h3>
        <p>强化失败不会降级，保护您的装备！</p>
      </div>
      
      <div class="strengthen-list">
        <div 
          v-for="eq in strengthenableEquipment" 
          :key="eq.id" 
          class="strengthen-card"
          :style="{ '--quality-color': eq.color }">
          <div class="equip-info">
            <span class="equip-icon">{{ getTypeIcon(eq.type) }}</span>
            <div class="equip-details">
              <span class="equip-name" :style="{ color: eq.color }">{{ eq.name }}</span>
              <span class="equip-level">强化等级: +{{ eq.strengthenLevel }}</span>
            </div>
          </div>
          
          <div class="strengthen-cost">
            <div class="cost-row">
              <span>成功率</span>
              <span class="success-rate">{{ eq.successRate }}%</span>
            </div>
            <div class="cost-row">
              <span>强化石</span>
              <span>{{ eq.strengthenCost?.stone || 0 }}</span>
            </div>
            <div class="cost-row">
              <span>灵石</span>
              <span>{{ eq.strengthenCost?.spirit || 0 }}</span>
            </div>
          </div>
          
          <button 
            class="strengthen-btn" 
            @click="strengthen(eq)"
            :disabled="!canStrengthen(eq)">
            {{ canStrengthen(eq) ? '强化' : '材料不足' }}
          </button>
        </div>
        
        <div v-if="strengthenableEquipment.length === 0" class="empty-state">
          <p>没有可强化的装备</p>
        </div>
      </div>
      
      <!-- Strengthen Result -->
      <div v-if="strengthenResult" class="result-modal" :class="strengthenResult.success ? 'success' : 'failure'">
        <div class="result-content" :class="{ shake: !strengthenResult.success }">
          <span class="result-icon">{{ strengthenResult.success ? '⬆️' : '💨' }}</span>
          <p>{{ strengthenResult.message }}</p>
          <button @click="strengthenResult = null">确定</button>
        </div>
      </div>
    </div>
    
    <!-- My Equipment Tab -->
    <div v-if="activeTab === 'equipment'" class="tab-content">
      <div class="equipment-grid">
        <div 
          v-for="eq in allEquipment" 
          :key="eq.id" 
          class="equipment-card"
          :class="{ equipped: eq.isEquipped }"
          :style="{ '--quality-color': eq.color }">
          <div class="equip-header">
            <span class="equip-icon">{{ getTypeIcon(eq.type) }}</span>
            <span class="equip-name" :style="{ color: eq.color }">{{ eq.name }}</span>
          </div>
          <div class="equip-quality">{{ getQualityText(eq.quality) }}</div>
          <div class="equip-stats">
            <span v-for="(val, stat) in eq.stats" :key="stat" class="stat-badge">
              {{ getStatName(stat) }}+{{ val }}
            </span>
            <span v-if="eq.bonusStats && Object.keys(eq.bonusStats).length > 0" 
                  v-for="(val, stat) in eq.bonusStats" 
                  :key="'bonus-'+stat" 
                  class="stat-badge bonus">
              {{ getStatName(stat) }}+{{ val }}
            </span>
          </div>
          <div class="equip-level-badge" v-if="eq.strengthenLevel > 0">
            +{{ eq.strengthenLevel }}
          </div>
          <div class="equip-actions">
            <button 
              v-if="!eq.isEquipped" 
              class="equip-btn" 
              @click="equipItem(eq)">
              装备
            </button>
            <button 
              v-else 
              class="unequip-btn" 
              @click="unequipItem(eq)">
              卸下
            </button>
          </div>
        </div>
      </div>
      
      <div v-if="allEquipment.length === 0" class="empty-state">
        <p>还没有打造过装备，快去打造吧！</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const activeTab = ref('forge')
const tabs = [
  { id: 'forge', name: '打造', icon: '🔨' },
  { id: 'strengthen', name: '强化', icon: '⚡' },
  { id: 'equipment', name: '我的装备', icon: '💎' }
]

const categories = [
  { id: 'weapon', name: '武器', icon: '⚔️' },
  { id: 'armor', name: '防具', icon: '🛡️' },
  { id: 'accessory', name: '饰品', icon: '💍' }
]

const materials = ref({})
const recipes = ref([])
const allEquipment = ref([])
const strengthenList = ref([])

const forgeResult = ref(null)
const strengthenResult = ref(null)

const materialNames = {
  iron_ingot: '铁锭',
  refined_iron: '精铁',
  jade: '玉石',
  fire_crystal: '火晶',
  thunder_crystal: '雷晶',
  dragon_scale: '龙鳞',
  strengthen_stone: '强化石',
  spirit_stone: '灵石',
  flying_sword: '飞剑',
  flame_blade: '烈焰刀',
  battle_armor: '战甲',
  jade_armor: '玉鳞甲',
  crit_ring: '戒指'
}

const materialIcons = {
  iron_ingot: '🧱',
  refined_iron: '🔩',
  jade: '💎',
  fire_crystal: '🔥',
  thunder_crystal: '⚡',
  dragon_scale: '🐉',
  strengthen_stone: '💠',
  spirit_stone: '💰'
}

function getMaterialName(id) {
  return materialNames[id] || id
}

function getMaterialIcon(id) {
  return materialIcons[id] || '📦'
}

function getTypeIcon(type) {
  const icons = { weapon: '⚔️', armor: '🛡️', accessory: '💍' }
  return icons[type] || '📦'
}

function getQualityText(quality) {
  const texts = { common: '普通', uncommon: '优秀', rare: '稀有' }
  return texts[quality] || quality
}

function getStatName(stat) {
  const names = { atk: '攻击', def: '防御', hp: '生命', crit_rate: '暴击率', spirit_rate: '灵气效率' }
  return names[stat] || stat
}

function getRecipesByType(type) {
  return recipes.value.filter(r => r.type === type)
}

function canForge(recipe) {
  return recipe.materialCosts?.every(c => c.sufficient)
}

function canStrengthen(eq) {
  const mat = materials.value
  const cost = eq.strengthenCost || {}
  return (mat.strengthen_stone || 0) >= (cost.stone || 0) && 
         (mat.spirit_stone || 0) >= (cost.spirit || 0)
}

const strengthenableEquipment = computed(() => {
  return strengthenList.value.filter(eq => eq.strengthenLevel < 15)
})

async function fetchMaterials() {
  try {
    const res = await fetch('/api/forge/materials')
    materials.value = await res.json()
  } catch (e) {
    console.error('Failed to fetch materials:', e)
  }
}

async function fetchRecipes() {
  try {
    const res = await fetch('/api/forge')
    recipes.value = await res.json()
  } catch (e) {
    console.error('Failed to fetch recipes:', e)
  }
}

async function fetchEquipment() {
  try {
    const res = await fetch('/api/forge/equipment')
    allEquipment.value = await res.json()
    
    // Fetch strengthen details for each equipment
    const details = await Promise.all(
      allEquipment.value.map(async eq => {
        const res = await fetch(`/api/forge/equipment/${eq.id}`)
        return res.json()
      })
    )
    strengthenList.value = details
  } catch (e) {
    console.error('Failed to fetch equipment:', e)
  }
}

async function forgeItem(recipe) {
  try {
    const res = await fetch('/api/forge/forge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipeId: recipe.id })
    })
    const result = await res.json()
    forgeResult.value = result
    if (result.success) {
      await fetchMaterials()
      await fetchRecipes()
      await fetchEquipment()
    }
  } catch (e) {
    console.error('Failed to forge:', e)
    forgeResult.value = { success: false, message: '锻造失败' }
  }
}

async function strengthen(eq) {
  try {
    const res = await fetch('/api/forge/strengthen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ equipmentId: eq.id })
    })
    const result = await res.json()
    strengthenResult.value = result
    if (result.success || result.success === false) {
      await fetchMaterials()
      await fetchEquipment()
    }
  } catch (e) {
    console.error('Failed to strengthen:', e)
    strengthenResult.value = { success: false, message: '强化失败' }
  }
}

async function equipItem(eq) {
  try {
    await fetch('/api/forge/equip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ equipmentId: eq.id })
    })
    await fetchEquipment()
  } catch (e) {
    console.error('Failed to equip:', e)
  }
}

async function unequipItem(eq) {
  try {
    await fetch('/api/forge/unequip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot: eq.type })
    })
    await fetchEquipment()
  } catch (e) {
    console.error('Failed to unequip:', e)
  }
}

onMounted(() => {
  fetchMaterials()
  fetchRecipes()
  fetchEquipment()
})
</script>

<style scoped>
.forge-panel {
  padding: 20px;
  background: #0a0a15;
  min-height: 100%;
}

h2 {
  color: #f97316;
  font-size: 24px;
  margin-bottom: 20px;
  text-shadow: 0 0 20px rgba(249, 115, 22, 0.5);
}

h3 {
  color: #fbbf24;
  font-size: 16px;
  margin-bottom: 12px;
}

/* Tab Navigation */
.tab-nav {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.tab-nav button {
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(249, 115, 22, 0.3);
  color: #fff;
  border-radius: 25px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.tab-nav button.active {
  background: linear-gradient(135deg, #f97316, #ea580c);
  border-color: transparent;
  box-shadow: 0 0 20px rgba(249, 115, 22, 0.4);
}

.tab-nav button:hover:not(.active) {
  border-color: #f97316;
  background: rgba(249, 115, 22, 0.1);
}

/* Materials Bar */
.materials-bar {
  display: flex;
  gap: 15px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 15px;
  margin-bottom: 25px;
  flex-wrap: wrap;
}

.material-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}

.mat-icon { font-size: 18px; }
.mat-name { font-size: 12px; color: #aaa; }
.mat-count { font-size: 14px; color: #fbbf24; font-weight: bold; }

/* Recipe Categories */
.recipe-categories {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.category h3 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.recipe-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 15px;
}

.recipe-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 15px;
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
}

.recipe-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--quality-color);
}

.recipe-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 5px 20px rgba(var(--quality-color), 0.2);
  border-color: var(--quality-color);
}

.recipe-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.recipe-icon { font-size: 28px; }
.recipe-name { font-size: 18px; font-weight: bold; }
.recipe-quality {
  margin-left: auto;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
}

.recipe-desc {
  font-size: 12px;
  color: #888;
  margin-bottom: 12px;
}

.recipe-stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.stat-badge {
  font-size: 11px;
  padding: 3px 8px;
  background: rgba(102, 126, 234, 0.2);
  border-radius: 8px;
  color: #a5b4fc;
}

.stat-badge.bonus {
  background: rgba(249, 115, 22, 0.2);
  color: #fbbf24;
}

.recipe-materials {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 15px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
}

.cost-item {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.cost-item span:first-child { color: #aaa; }
.cost-item span:last-child { color: #4ade80; }

.cost-item.insufficient span:last-child { color: #ef4444; }

.forge-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #f97316, #ea580c);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.forge-btn:hover:not(:disabled) {
  transform: scale(1.02);
  box-shadow: 0 0 20px rgba(249, 115, 22, 0.5);
}

.forge-btn:disabled {
  background: #444;
  cursor: not-allowed;
  opacity: 0.6;
}

/* Strengthen Tab */
.strengthen-info {
  background: rgba(255, 255, 255, 0.03);
  padding: 15px;
  border-radius: 15px;
  margin-bottom: 20px;
}

.strengthen-info p {
  font-size: 13px;
  color: #888;
  margin-top: 8px;
}

.strengthen-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.strengthen-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 15px;
  border-left: 3px solid var(--quality-color);
}

.equip-info {
  display: flex;
  align-items: center;
  gap: 15px;
  flex: 1;
}

.equip-icon { font-size: 36px; }

.equip-details {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.equip-name { font-size: 18px; font-weight: bold; }
.equip-level { font-size: 12px; color: #888; }

.strengthen-cost {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 15px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  min-width: 140px;
}

.cost-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.cost-row span:first-child { color: #888; }
.cost-row span:last-child { color: #fff; }

.success-rate {
  color: #4ade80 !important;
  font-weight: bold;
}

.strengthen-btn {
  padding: 12px 25px;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.strengthen-btn:hover:not(:disabled) {
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
}

.strengthen-btn:disabled {
  background: #444;
  cursor: not-allowed;
}

/* My Equipment Tab */
.equipment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
}

.equipment-card {
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 15px;
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.3s;
}

.equipment-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--quality-color);
}

.equipment-card.equipped {
  border-color: #4ade80;
  box-shadow: 0 0 15px rgba(74, 222, 128, 0.2);
}

.equipment-card:hover {
  transform: translateY(-3px);
}

.equip-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.equipment-card .equip-icon { font-size: 24px; }
.equipment-card .equip-name { font-size: 16px; font-weight: bold; }

.equip-quality {
  font-size: 11px;
  color: #888;
  margin-bottom: 10px;
}

.equipment-card .equip-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.equip-level-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background: linear-gradient(135deg, #f97316, #ea580c);
  padding: 4px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: bold;
}

.equip-actions {
  margin-top: 10px;
}

.equip-btn, .unequip-btn {
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.equip-btn {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: #fff;
}

.equip-btn:hover {
  box-shadow: 0 0 15px rgba(34, 197, 94, 0.4);
}

.unequip-btn {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.unequip-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Result Modal */
.result-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.result-content {
  background: #1a1a2e;
  padding: 40px;
  border-radius: 20px;
  text-align: center;
  min-width: 300px;
  animation: modalIn 0.3s ease;
}

.result-modal.success .result-content {
  border: 2px solid #4ade80;
  box-shadow: 0 0 40px rgba(74, 222, 128, 0.3);
}

.result-modal.failure .result-content {
  border: 2px solid #ef4444;
}

.result-icon {
  font-size: 60px;
  display: block;
  margin-bottom: 20px;
}

.result-content p {
  font-size: 18px;
  color: #fff;
  margin-bottom: 20px;
}

.forge-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  margin-bottom: 20px;
  animation: glow 1s infinite alternate;
}

.forge-item .level {
  background: linear-gradient(135deg, #f97316, #ea580c);
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 12px;
}

.result-content button {
  padding: 12px 30px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  border-radius: 25px;
  color: #fff;
  font-weight: bold;
  cursor: pointer;
}

.result-content button:hover {
  transform: scale(1.05);
}

@keyframes modalIn {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes glow {
  from { box-shadow: 0 0 20px rgba(249, 115, 22, 0.3); }
  to { box-shadow: 0 0 40px rgba(249, 115, 22, 0.6); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.result-content.shake {
  animation: shake 0.3s ease;
}

.empty-state {
  text-align: center;
  padding: 60px;
  color: #666;
}

.empty-state p {
  font-size: 16px;
}
</style>
