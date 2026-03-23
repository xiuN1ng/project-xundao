<template>
  <div class="forge-panel">
    <div class="panel-header">
      <h2>⚒️ 炼器系统</h2>
      <div class="header-stats">
        <span class="stat-item">💰 灵石: {{ playerSpiritStones || 0 }}</span>
        <span class="stat-item">💎 强化石: {{ qianghuaStones || 0 }}</span>
      </div>
    </div>

    <!-- Tab导航 -->
    <div class="forge-tabs">
      <button v-for="tab in tabList" :key="tab.id"
        :class="{ active: activeTab === tab.id }"
        @click="switchTab(tab.id)">
        {{ tab.icon }} {{ tab.name }}
      </button>
    </div>

    <!-- ========== 打造 tab ========== -->
    <div v-if="activeTab === 'craft'" class="tab-content">
      <!-- 类型筛选 -->
      <div class="filter-bar">
        <button v-for="type in equipTypes" :key="type.id"
          :class="{ active: craftType === type.id }"
          @click="craftType = type.id">
          {{ type.icon }} {{ type.name }}
        </button>
      </div>

      <!-- 配方列表 -->
      <div class="recipe-grid">
        <div v-for="recipe in filteredRecipes" :key="recipe.id"
          class="recipe-card" :style="{ borderColor: getQualityColor(recipe.quality) }">
          <div class="recipe-header">
            <span class="recipe-icon">{{ getTypeIcon(recipe.type) }}</span>
            <span class="recipe-name" :style="{ color: getQualityColor(recipe.quality) }">
              {{ recipe.name }}
            </span>
            <span class="quality-badge" :style="{ background: getQualityColor(recipe.quality) }">
              {{ getQualityName(recipe.quality) }}
            </span>
          </div>
          <div class="recipe-desc">{{ recipe.description }}</div>
          <div class="recipe-stats" v-if="recipe.baseStats">
            <span v-for="(val, stat) in recipe.baseStats" :key="stat" class="stat-tag">
              {{ getStatName(stat) }}+{{ val }}
            </span>
          </div>
          <div class="recipe-materials">
            <div v-for="(qty, matId) in recipe.materials" :key="matId" class="mat-item">
              <span class="mat-icon">{{ getMaterialIcon(matId) }}</span>
              <span class="mat-name">{{ getMaterialName(matId) }}</span>
              <span class="mat-qty" :class="{ insufficient: !hasMaterial(matId, qty) }">
                x{{ qty }} ({{ getPlayerMatQty(matId) }})
              </span>
            </div>
          </div>
          <div class="recipe-footer">
            <span class="success-rate">成功率: {{ recipe.success_rate || 100 }}%</span>
            <button class="craft-btn"
              :class="{ disabled: !canCraft(recipe) }"
              @click="doCraft(recipe)">
              🔨 打造
            </button>
          </div>
        </div>
      </div>
      <div v-if="filteredRecipes.length === 0" class="empty-tip">暂无配方</div>
    </div>

    <!-- ========== 强化 tab ========== -->
    <div v-if="activeTab === 'enhance'" class="tab-content">
      <div class="enhance-section">
        <h3>我的装备</h3>
        <div class="equipment-list">
          <div v-for="eq in playerEquipment" :key="eq.id"
            class="eq-card" :class="{ selected: selectedEquipment?.id === eq.id }"
            @click="selectEquipment(eq)">
            <span class="eq-icon">{{ getTypeIcon(eq.type) }}</span>
            <div class="eq-info">
              <span class="eq-name" :style="{ color: getQualityColor(eq.rarity) }">{{ eq.name }}</span>
              <span class="eq-level">+{{ eq.level || 0 }}</span>
            </div>
            <span class="eq-slot">{{ getSlotName(eq.slot) }}</span>
          </div>
        </div>
        <div v-if="playerEquipment.length === 0" class="empty-tip">暂无装备，请先打造</div>
      </div>

      <!-- 选中装备强化 -->
      <div v-if="selectedEquipment" class="enhance-section">
        <h3>强化装备</h3>
        <div class="selected-eq-display">
          <span class="eq-icon lg">{{ getTypeIcon(selectedEquipment.type) }}</span>
          <div class="eq-info">
            <span class="eq-name" :style="{ color: getQualityColor(selectedEquipment.rarity) }">
              {{ selectedEquipment.name }}
            </span>
            <span class="eq-level">+{{ selectedEquipment.level || 0 }} 级</span>
          </div>
        </div>
        <div class="enhance-info">
          <div class="enhance-rate">
            <span>成功率: {{ calcEnhanceRate(selectedEquipment.level || 0) }}%</span>
            <span v-if="failCount >= 5" class="guaranteed-badge">🔥 保底触发</span>
            <span v-else class="fail-hint">连败{{ failCount }}次</span>
          </div>
          <div class="enhance-preview" v-if="selectedEquipment.base_stats">
            <span v-for="(val, stat) in selectedEquipment.base_stats" :key="stat">
              {{ getStatName(stat) }}: {{ val }} → {{ Math.floor(val * (1 + ((selectedEquipment.level||0)+1) * 0.1)) }}
            </span>
          </div>
        </div>
        <button class="enhance-btn" @click="doEnhance" :disabled="isEnhancing">
          {{ isEnhancing ? '强化中...' : '⬆️ 强化 (+1)' }}
        </button>
      </div>
    </div>

    <!-- ========== 分解 tab ========== -->
    <div v-if="activeTab === 'decompose'" class="tab-content">
      <div class="decompose-info">
        <p>🎯 将不需要的装备分解为强化石</p>
        <div class="rarity-rewards">
          <span v-for="(qty, rarity) in decomposeRewards" :key="rarity" class="reward-item">
            {{ getQualityName(parseInt(rarity)) }} → {{ qty }}强化石
          </span>
        </div>
      </div>
      <div class="equipment-list decompose-list">
        <div v-for="eq in decomposableEquipment" :key="eq.id"
          class="eq-card" :class="{ selected: selectedDecompose.includes(eq.id) }"
          @click="toggleDecompose(eq.id)">
          <span class="eq-icon">{{ getTypeIcon(eq.type) }}</span>
          <div class="eq-info">
            <span class="eq-name" :style="{ color: getQualityColor(eq.rarity) }">{{ eq.name }}</span>
            <span class="eq-level">+{{ eq.level || 0 }}</span>
          </div>
          <span class="decompose-reward">+{{ getDecomposeReward(eq.rarity) }}强化石</span>
          <span class="eq-slot">{{ getSlotName(eq.slot) }}</span>
        </div>
      </div>
      <div v-if="decomposableEquipment.length === 0" class="empty-tip">暂无可分解装备</div>
      <div class="decompose-actions" v-if="selectedDecompose.length > 0">
        <span>已选 {{ selectedDecompose.length }} 件</span>
        <button class="decompose-btn" @click="doBatchDecompose">
          🗑️ 分解所选
        </button>
      </div>
    </div>

    <!-- ========== 回收 tab ========== -->
    <div v-if="activeTab === 'recycle'" class="tab-content">
      <div class="recycle-info">
        <p>💰 将废弃装备回收为灵石（装备不保留）</p>
      </div>
      <div class="equipment-list recycle-list">
        <div v-for="eq in unequippedEquipment" :key="eq.id"
          class="eq-card" :class="{ selected: selectedRecycle.includes(eq.id) }"
          @click="toggleRecycle(eq.id)">
          <span class="eq-icon">{{ getTypeIcon(eq.type) }}</span>
          <div class="eq-info">
            <span class="eq-name" :style="{ color: getQualityColor(eq.rarity) }">{{ eq.name }}</span>
            <span class="eq-level">+{{ eq.level || 0 }}</span>
          </div>
          <span class="recycle-reward">+{{ getRecycleValue(eq) }}灵石</span>
        </div>
      </div>
      <div v-if="unequippedEquipment.length === 0" class="empty-tip">无可回收装备（已穿戴的装备无法回收）</div>
      <div class="recycle-actions" v-if="selectedRecycle.length > 0">
        <span>已选 {{ selectedRecycle.length }} 件</span>
        <button class="recycle-btn" @click="doBatchRecycle">
          ♻️ 回收所选
        </button>
      </div>
    </div>

    <!-- 结果提示 -->
    <div v-if="resultMsg" class="result-toast" :class="resultType">
      {{ resultMsg }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { forgeApi } from '../api/index.js'
import { usePlayerStore } from '../stores/player'

const playerStore = usePlayerStore()
const playerId = computed(() => playerStore.player?.id || 1)

const activeTab = ref('craft')
const tabList = [
  { id: 'craft', name: '打造', icon: '⚒️' },
  { id: 'enhance', name: '强化', icon: '⬆️' },
  { id: 'decompose', name: '分解', icon: '💎' },
  { id: 'recycle', name: '回收', icon: '♻️' }
]

const equipTypes = [
  { id: 'all', name: '全部', icon: '📦' },
  { id: 'weapon', name: '武器', icon: '⚔️' },
  { id: 'armor', name: '防具', icon: '🛡️' },
  { id: 'accessory', name: '饰品', icon: '💍' }
]

// 配方数据
const recipes = ref([])
const craftType = ref('all')
const filteredRecipes = computed(() => {
  if (craftType.value === 'all') return recipes.value
  return recipes.value.filter(r => r.type === craftType.value)
})

// 玩家材料
const playerMaterials = ref([])
const playerSpiritStones = ref(0)
const qianghuaStones = ref(0)
const failCount = ref(0)

// 玩家装备
const playerEquipment = ref([])
const selectedEquipment = ref(null)
const isEnhancing = ref(false)

// 分解
const selectedDecompose = ref([])
const selectedRecycle = ref([])

// 结果
const resultMsg = ref('')
const resultType = ref('success')

// ========== 数据加载 ==========
onMounted(async () => {
  await loadRecipes()
  await loadPlayerData()
})

async function loadRecipes() {
  try {
    const res = await forgeApi.getRecipes()
    if (res.data.success) {
      recipes.value = res.data.data || []
    }
  } catch (e) {
    console.error('加载配方失败', e)
  }
}

async function loadPlayerData() {
  try {
    const pid = playerId.value
    const [matRes, eqRes, stoneRes] = await Promise.all([
      forgeApi.getPlayerMaterials(pid),
      forgeApi.getPlayerEquipment(pid),
      forgeApi.getQianghuaStone(pid)
    ])
    if (matRes.data.success) playerMaterials.value = matRes.data.data || []
    if (eqRes.data.success) playerEquipment.value = eqRes.data.data || []
    if (stoneRes.data.success) {
      qianghuaStones.value = stoneRes.data.data?.qianghua_stones || 0
    }
    // 额外获取灵石
    try {
      const playerRes = await fetch(`http://localhost:3001/api/player?id=${pid}`)
      const pd = await playerRes.json()
      if (pd.data) playerSpiritStones.value = pd.data.lingshi || 0
    } catch {}
  } catch (e) {
    console.error('加载玩家数据失败', e)
  }
}

// ========== 打造 ==========
function getPlayerMatQty(matId) {
  const m = playerMaterials.value.find(m => m.material_id === matId)
  return m ? m.quantity : 0
}

function hasMaterial(matId, qty) {
  return getPlayerMatQty(matId) >= qty
}

function canCraft(recipe) {
  for (const [matId, qty] of Object.entries(recipe.materials || {})) {
    if (!hasMaterial(matId, qty)) return false
  }
  return true
}

async function doCraft(recipe) {
  if (!canCraft(recipe)) {
    showResult('材料不足！', 'error')
    return
  }
  try {
    const res = await forgeApi.craft(playerId.value, recipe.id)
    if (res.data.success) {
      if (res.data.data.success) {
        showResult(`打造成功！获得 ${recipe.name}！`, 'success')
      } else {
        showResult('打造失败，返还了一半材料', 'error')
      }
      await loadPlayerData()
    } else {
      showResult(res.data.error || '打造失败', 'error')
    }
  } catch (e) {
    showResult('网络错误', 'error')
  }
}

// ========== 强化 ==========
function selectEquipment(eq) {
  selectedEquipment.value = selectedEquipment.value?.id === eq.id ? null : eq
}

function calcEnhanceRate(level) {
  const base = 80
  const penalty = (level || 0) * 5
  return Math.max(10, base - penalty)
}

async function doEnhance() {
  if (!selectedEquipment.value || isEnhancing.value) return
  isEnhancing.value = true
  try {
    const res = await forgeApi.enhance(playerId.value, selectedEquipment.value.id)
    if (res.data.success) {
      if (res.data.data.success) {
        showResult(res.data.message || '强化成功！', 'success')
        failCount.value = 0
      } else {
        if (res.data.data.degraded) {
          showResult('强化失败，装备降级了...', 'error')
        } else {
          showResult('强化失败', 'error')
        }
        failCount.value++
      }
      // 刷新装备数据
      const eqRes = await forgeApi.getEquipment(selectedEquipment.value.id, playerId.value)
      if (eqRes.data.success) selectedEquipment.value = eqRes.data.data
      await loadPlayerData()
    } else {
      showResult(res.data.error || '强化失败', 'error')
    }
  } catch (e) {
    showResult('网络错误', 'error')
  } finally {
    isEnhancing.value = false
  }
}

// ========== 分解 ==========
const decomposableEquipment = computed(() =>
  playerEquipment.value.filter(eq => [2, 3, 4, 5].includes(eq.rarity)) // uncommon及以上
)
const unequippedEquipment = computed(() =>
  playerEquipment.value.filter(eq => !eq.is_equipped)
)

const decomposeRewards = { 2: 1, 3: 3, 4: 8, 5: 20 }
function getDecomposeReward(rarity) {
  return decomposeRewards[rarity] || 0
}

function getRecycleValue(eq) {
  const base = 10
  const level = eq.level || 1
  const rarity = eq.rarity || 1
  return Math.floor(base * (1 + level * 0.2) * (1 + (rarity - 1) * 0.5))
}

function toggleDecompose(id) {
  const idx = selectedDecompose.value.indexOf(id)
  if (idx >= 0) selectedDecompose.value.splice(idx, 1)
  else selectedDecompose.value.push(id)
}

function toggleRecycle(id) {
  const idx = selectedRecycle.value.indexOf(id)
  if (idx >= 0) selectedRecycle.value.splice(idx, 1)
  else selectedRecycle.value.push(id)
}

async function doBatchDecompose() {
  if (selectedDecompose.value.length === 0) return
  try {
    const res = await forgeApi.batchDecompose(playerId.value, selectedDecompose.value)
    if (res.data.success) {
      showResult(res.data.message || `分解成功！获得 ${res.data.data.total_reward} 强化石`, 'success')
      selectedDecompose.value = []
      await loadPlayerData()
    } else {
      showResult(res.data.error || '分解失败', 'error')
    }
  } catch (e) {
    showResult('网络错误', 'error')
  }
}

async function doBatchRecycle() {
  if (selectedRecycle.value.length === 0) return
  try {
    const res = await forgeApi.recycle(playerId.value, selectedRecycle.value)
    if (res.data.success) {
      showResult(res.data.message || `回收成功！`, 'success')
      selectedRecycle.value = []
      await loadPlayerData()
    } else {
      showResult(res.data.error || '回收失败', 'error')
    }
  } catch (e) {
    showResult('网络错误', 'error')
  }
}

// ========== 工具函数 ==========
function switchTab(tab) {
  activeTab.value = tab
  resultMsg.value = ''
}

function showResult(msg, type = 'success') {
  resultMsg.value = msg
  resultType.value = type
  setTimeout(() => { resultMsg.value = '' }, 3000)
}

function getQualityColor(quality) {
  const colors = {
    common: '#8B8B8B',
    uncommon: '#00FF7F',
    rare: '#1E90FF',
    epic: '#FFD700',
    legendary: '#FF4500'
  }
  return colors[quality] || '#8B8B8B'
}

function getQualityName(quality) {
  const names = {
    common: '普通', uncommon: '优秀', rare: '稀有', epic: '史诗', legendary: '传说'
  }
  return names[quality] || '普通'
}

function getTypeIcon(type) {
  const icons = { weapon: '⚔️', armor: '🛡️', accessory: '💍' }
  return icons[type] || '📦'
}

function getSlotName(slot) {
  const names = { weapon: '武器', armor: '防具', accessory: '饰品' }
  return names[slot] || slot || ''
}

function getStatName(stat) {
  const names = { atk: '攻击', def: '防御', hp: '气血', crit_rate: '暴击', spirit_rate: '灵气' }
  return names[stat] || stat
}

const MATERIAL_NAMES = {
  iron_ingot: '铁锭', refined_iron: '精炼铁', jade: '玉石', fire_crystal: '火焰结晶',
  thunder_crystal: '雷霆结晶', dragon_scale: '龙鳞', spirit_stone: '灵石', strengthen_stone: '强化石'
}
const MATERIAL_ICONS = {
  iron_ingot: '🔩', refined_iron: '⚙️', jade: '💎', fire_crystal: '🔥',
  thunder_crystal: '⚡', dragon_scale: '🐉', spirit_stone: '💰', strengthen_stone: '💎'
}
function getMaterialName(id) { return MATERIAL_NAMES[id] || id }
function getMaterialIcon(id) { return MATERIAL_ICONS[id] || '📦' }
</script>

<style scoped>
.forge-panel {
  padding: 16px;
  min-height: 100%;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: #e0e0e0;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.panel-header h2 { margin: 0; font-size: 18px; color: #ffd700; }
.header-stats { display: flex; gap: 16px; font-size: 14px; }
.stat-item { background: rgba(255,255,255,0.08); padding: 4px 10px; border-radius: 12px; }

.forge-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.forge-tabs button {
  flex: 1;
  min-width: 70px;
  padding: 8px 4px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  color: #a0a0a0;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}
.forge-tabs button.active {
  background: rgba(255, 215, 0, 0.15);
  border-color: #ffd700;
  color: #ffd700;
}

.tab-content { animation: fadeIn 0.2s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

.filter-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.filter-bar button {
  padding: 4px 12px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  color: #a0a0a0;
  cursor: pointer;
  font-size: 12px;
}
.filter-bar button.active {
  background: rgba(100, 180, 255, 0.15);
  border-color: #1e90ff;
  color: #1e90ff;
}

/* 配方卡片 */
.recipe-grid { display: flex; flex-direction: column; gap: 10px; }
.recipe-card {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 10px;
  padding: 12px;
}
.recipe-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.recipe-icon { font-size: 20px; }
.recipe-name { font-weight: bold; font-size: 15px; flex: 1; }
.quality-badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; color: #fff; }
.recipe-desc { font-size: 12px; color: #888; margin-bottom: 6px; }
.recipe-stats { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 6px; }
.stat-tag { font-size: 11px; background: rgba(255,215,0,0.1); padding: 2px 6px; border-radius: 4px; color: #ffd700; }
.recipe-materials { margin-bottom: 8px; }
.mat-item { display: flex; align-items: center; gap: 6px; font-size: 12px; padding: 2px 0; }
.mat-icon { font-size: 14px; }
.mat-name { flex: 1; }
.mat-qty { color: #888; }
.mat-qty.insufficient { color: #ff6b6b; }
.recipe-footer { display: flex; justify-content: space-between; align-items: center; }
.success-rate { font-size: 12px; color: #888; }
.craft-btn, .enhance-btn, .decompose-btn, .recycle-btn {
  padding: 6px 16px;
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  border: none;
  border-radius: 6px;
  color: #1a1a2e;
  font-weight: bold;
  cursor: pointer;
  font-size: 13px;
}
.craft-btn.disabled, .enhance-btn:disabled { background: #444; color: #888; cursor: not-allowed; }

/* 装备列表 */
.enhance-section, .decompose-section, .recycle-section { margin-bottom: 16px; }
.enhance-section h3, .decompose-info h3 { font-size: 14px; color: #a0a0a0; margin-bottom: 8px; }
.equipment-list { display: flex; flex-direction: column; gap: 6px; max-height: 280px; overflow-y: auto; }
.eq-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.eq-card:hover { background: rgba(255,255,255,0.08); }
.eq-card.selected { border-color: #ffd700; background: rgba(255,215,0,0.1); }
.eq-icon { font-size: 22px; }
.eq-icon.lg { font-size: 28px; }
.eq-info { flex: 1; display: flex; flex-direction: column; }
.eq-name { font-size: 14px; font-weight: bold; }
.eq-level { font-size: 11px; color: #888; }
.eq-slot { font-size: 11px; color: #666; background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px; }

.selected-eq-display { display: flex; align-items: center; gap: 12px; background: rgba(255,215,0,0.08); border: 1px solid rgba(255,215,0,0.3); border-radius: 10px; padding: 12px; margin-bottom: 12px; }
.enhance-info { margin-bottom: 12px; }
.enhance-rate { font-size: 14px; color: #ffd700; margin-bottom: 4px; }
.guaranteed-badge { color: #ff6b6b; margin-left: 8px; font-size: 12px; }
.fail-hint { color: #888; font-size: 12px; margin-left: 8px; }
.enhance-preview { font-size: 12px; color: #888; }

/* 分解/回收 */
.decompose-info, .recycle-info { background: rgba(255,255,255,0.04); border-radius: 8px; padding: 10px; margin-bottom: 12px; font-size: 13px; color: #a0a0a0; }
.rarity-rewards { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 6px; }
.reward-item { font-size: 12px; background: rgba(100,180,255,0.1); padding: 2px 8px; border-radius: 4px; }
.decompose-reward, .recycle-reward { font-size: 12px; color: #ffd700; }
.decompose-actions, .recycle-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); }
.decompose-btn { background: linear-gradient(135deg, #9b59b6, #8e44ad); color: #fff; }
.recycle-btn { background: linear-gradient(135deg, #27ae60, #2ecc71); color: #fff; }

.empty-tip { text-align: center; color: #666; padding: 40px; font-size: 14px; }

/* 结果提示 */
.result-toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 24px;
  border-radius: 20px;
  font-size: 14px;
  z-index: 9999;
  animation: toastIn 0.3s ease;
  white-space: nowrap;
}
.result-toast.success { background: rgba(39, 174, 96, 0.95); color: #fff; }
.result-toast.error { background: rgba(231, 76, 60, 0.95); color: #fff; }
@keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
</style>
