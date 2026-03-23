<template>
  <div class="equipment-panel" :style="panelStyle">
    <!-- 顶部标题栏 -->
    <div class="panel-header">
      <h2>⚔️ 装备套装</h2>
      <div class="header-stats" v-if="activeBonusCount > 0">
        <span class="bonus-badge">🔥 {{ activeBonusCount }} 套效果已激活</span>
      </div>
    </div>

    <!-- Tab切换：装备/套装/强化 -->
    <div class="tab-bar">
      <button v-for="tab in tabs" :key="tab.id" 
        class="tab-btn" :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id">
        {{ tab.icon }} {{ tab.name }}
      </button>
    </div>

    <!-- Tab 1: 已穿戴装备 -->
    <div v-if="activeTab === 'equipped'" class="tab-content">
      <div class="equip-slots-grid">
        <div v-for="slot in equipSlots" :key="slot.type" 
          class="equip-slot" :class="{ filled: equippedItems[slot.type], empty: !equippedItems[slot.type] }"
          @click="selectSlot(slot.type)">
          <div class="slot-inner">
            <span class="slot-emoji">{{ slot.icon }}</span>
            <span class="slot-label">{{ slot.name }}</span>
            <span v-if="equippedItems[slot.type]" class="slot-item-name">{{ equippedItems[slot.type].name }}</span>
            <span v-else class="slot-empty-text">空</span>
            <span v-if="equippedItems[slot.type]?.set_id" class="slot-set-badge">
              {{ getSetIcon(equippedItems[slot.type].set_id) }}
            </span>
          </div>
          <!-- 套装染色边框 -->
          <div v-if="equippedItems[slot.type]?.set_id" 
            class="set-glow" :style="{ '--set-color': getSetColor(equippedItems[slot.type].set_id) }">
          </div>
        </div>
      </div>

      <!-- 装备详情 -->
      <div v-if="selectedSlot && equippedItems[selectedSlot]" class="equip-detail">
        <div class="detail-header">
          <span class="detail-icon">{{ equippedItems[selectedSlot].icon || '📦' }}</span>
          <div class="detail-info">
            <h3>{{ equippedItems[selectedSlot].name }}</h3>
            <span class="rarity-tag" :style="{ color: getRarityColor(equippedItems[selectedSlot].rarity) }">
              {{ getRarityName(equippedItems[selectedSlot].rarity) }}
            </span>
            <span v-if="equippedItems[selectedSlot].set_id" class="set-tag">
              {{ getSetIcon(equippedItems[selectedSlot].set_id) }} {{ getSetName(equippedItems[selectedSlot].set_id) }}
            </span>
          </div>
        </div>
        <div class="detail-stats">
          <div v-for="(val, key) in getItemStats(equippedItems[selectedSlot])" :key="key" class="stat-row">
            <span class="stat-name">{{ getStatName(key) }}</span>
            <span class="stat-value">+{{ val }}</span>
          </div>
        </div>
        <div class="detail-actions">
          <button class="action-btn upgrade" @click="upgradeItem(selectedSlot)">
            ⬆️ 强化 (+{{ equippedItems[selectedSlot].enhanceLevel || 0 }})
          </button>
          <button class="action-btn unequip" @click="unequipItem(selectedSlot)">
            📤 卸下
          </button>
        </div>
      </div>

      <!-- 套装总览（在已穿戴Tab底部） -->
      <div v-if="Object.keys(activeSets).length > 0" class="set-overview">
        <h3>🔥 已激活套装效果</h3>
        <div v-for="(info, setId) in activeSets" :key="setId" class="set-info-row">
          <span class="set-icon-lg">{{ getSetIcon(setId) }}</span>
          <div class="set-info">
            <span class="set-name">{{ getSetName(setId) }}</span>
            <span class="set-count">{{ info.count }}/4 件</span>
          </div>
          <div class="set-bonus-list">
            <span v-if="info.count >= 2" class="bonus-chip active" :style="{ borderColor: getSetColor(setId) }">
              2件: {{ getSetBonusDesc(setId, 2) }}
            </span>
            <span v-if="info.count >= 4" class="bonus-chip active" :style="{ borderColor: getSetColor(setId) }">
              4件: {{ getSetBonusDesc(setId, 4) }}
            </span>
            <span v-if="info.count < 2" class="bonus-chip inactive">
              2件: {{ getSetBonusDesc(setId, 2) }}
            </span>
            <span v-if="info.count < 4" class="bonus-chip inactive">
              4件: {{ getSetBonusDesc(setId, 4) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 2: 套装一览 -->
    <div v-if="activeTab === 'sets'" class="tab-content">
      <div class="sets-grid">
        <div v-for="set in allSets" :key="set.id" 
          class="set-card" :class="{ 'has-full': isSetComplete(set.id) }"
          :style="{ '--set-color': getSetColor(set.id) }">
          <div class="set-card-header">
            <span class="set-icon-xl">{{ set.icon }}</span>
            <div class="set-card-title">
              <h3>{{ set.name }}</h3>
              <span class="set-rarity-tag">{{ getRarityName(set.rarity) }}</span>
            </div>
            <span class="set-progress">{{ getSetCount(set.id) }}/4</span>
          </div>
          <p class="set-desc">{{ set.description }}</p>
          
          <!-- 套装部件展示 -->
          <div class="set-pieces">
            <div v-for="slot in ['weapon', 'armor', 'helmet', 'accessory']" :key="slot"
              class="set-piece" :class="{ owned: hasSetPiece(set.id, slot) }">
              <span>{{ set.pieces[slot]?.icon || '📦' }}</span>
              <span class="piece-name">{{ set.pieces[slot]?.name || slot }}</span>
            </div>
          </div>
          
          <!-- 套装效果 -->
          <div class="set-bonuses">
            <div class="bonus-item" :class="{ active: getSetCount(set.id) >= 2 }">
              <span class="bonus-tier">2件套</span>
              <span class="bonus-name">{{ set.bonuses[2].name }}</span>
              <span class="bonus-desc">{{ set.bonuses[2].description }}</span>
            </div>
            <div class="bonus-item" :class="{ active: getSetCount(set.id) >= 4 }">
              <span class="bonus-tier">4件套</span>
              <span class="bonus-name">{{ set.bonuses[4].name }}</span>
              <span class="bonus-desc">{{ set.bonuses[4].description }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 3: 背包中的装备 -->
    <div v-if="activeTab === 'inventory'" class="tab-content">
      <div class="inventory-filter">
        <button v-for="filter in filters" :key="filter.type"
          class="filter-btn" :class="{ active: activeFilter === filter.type }"
          @click="activeFilter = filter.type">
          {{ filter.icon }} {{ filter.name }}
        </button>
      </div>
      <div class="inventory-list">
        <div v-for="item in filteredInventory" :key="item.id"
          class="inventory-item" :class="{ equipped: item.equipped }"
          :style="{ '--rarity-color': getRarityColor(item.rarity) }">
          <span class="item-icon">{{ item.icon || '📦' }}</span>
          <div class="item-info">
            <span class="item-name">{{ item.name }}</span>
            <span class="item-type">{{ getSlotName(item.slot) }}</span>
            <span v-if="item.set_id" class="item-set">{{ getSetIcon(item.set_id) }} {{ getSetName(item.set_id) }}</span>
          </div>
          <div class="item-stats-mini">
            <span v-for="(val, key) in getItemStats(item)" :key="key" class="mini-stat">
              {{ getStatName(key) }}+{{ val }}
            </span>
          </div>
          <button v-if="!item.equipped" class="equip-btn" @click="equipItem(item)">
            📥 穿戴
          </button>
          <span v-else class="equipped-label">已穿戴</span>
        </div>
        <div v-if="filteredInventory.length === 0" class="empty-inventory">
          <span>🎒 背包空空如也</span>
        </div>
      </div>
    </div>

    <!-- 套装效果总加成展示 -->
    <div v-if="totalSetStats && Object.keys(totalSetStats).length > 0" class="set-total-bonus">
      <h3>📊 套装总加成</h3>
      <div class="total-stats-grid">
        <div v-for="(val, stat) in totalSetStats" :key="stat" class="total-stat-chip">
          {{ getStatName(stat) }}+{{ val }}{{ getStatSuffix(stat) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { equipmentApi } from '../api'
import { EQUIPMENT_SETS, RARITY_COLORS, getRarityColor } from '../core/equipment_set_config'

// State
const activeTab = ref('equipped')
const activeFilter = ref('all')
const equippedItems = ref({})
const inventoryItems = ref([])
const allSets = ref([])
const selectedSlot = ref(null)
const loading = ref(false)

// Computed
const equipSlots = [
  { type: 'weapon', name: '武器', icon: '⚔️' },
  { type: 'armor', name: '护甲', icon: '🛡️' },
  { type: 'helmet', name: '头盔', icon: '⛑️' },
  { type: 'accessory', name: '饰品', icon: '💍' }
]

const tabs = [
  { id: 'equipped', name: '已穿戴', icon: '👤' },
  { id: 'sets', name: '套装一览', icon: '🔥' },
  { id: 'inventory', name: '背包', icon: '🎒' }
]

const filters = [
  { type: 'all', name: '全部', icon: '📦' },
  { type: 'weapon', name: '武器', icon: '⚔️' },
  { type: 'armor', name: '护甲', icon: '🛡️' },
  { type: 'helmet', name: '头盔', icon: '⛑️' },
  { type: 'accessory', name: '饰品', icon: '💍' }
]

const activeSets = computed(() => {
  const counts = {}
  for (const item of Object.values(equippedItems.value)) {
    if (item?.set_id) {
      counts[item.set_id] = counts[item.set_id] || { count: 0 }
      counts[item.set_id].count++
    }
  }
  return counts
})

const activeBonusCount = computed(() => {
  let count = 0
  for (const info of Object.values(activeSets.value)) {
    if (info.count >= 2) count++
    if (info.count >= 4) count++
  }
  return count
})

const totalSetStats = computed(() => {
  const stats = {}
  for (const [setId, info] of Object.entries(activeSets.value)) {
    const setConfig = EQUIPMENT_SETS[setId]
    if (!setConfig) continue
    if (info.count >= 2) {
      const bonus2 = setConfig.bonuses[2].stats || {}
      for (const [k, v] of Object.entries(bonus2)) {
        stats[k] = (stats[k] || 0) + v
      }
    }
    if (info.count >= 4) {
      const bonus4 = setConfig.bonuses[4].stats || {}
      for (const [k, v] of Object.entries(bonus4)) {
        stats[k] = (stats[k] || 0) + v
      }
    }
  }
  return stats
})

const filteredInventory = computed(() => {
  let items = inventoryItems.value
  if (activeFilter.value !== 'all') {
    items = items.filter(i => i.slot === activeFilter.value)
  }
  return items
})

// Panel style
const panelStyle = {
  background: 'linear-gradient(135deg, rgba(26,26,46,0.95) 0%, rgba(22,33,62,0.98) 50%, rgba(15,52,96,0.95) 100%)',
  minHeight: '100%',
  padding: '20px',
  color: '#fff'
}

// Helper functions
function getRarityName(rarity) {
  const names = { 1: '普通', 2: '优秀', 3: '稀有', 4: '史诗', 5: '传说' }
  return names[rarity] || '普通'
}

function getSetIcon(setId) {
  return EQUIPMENT_SETS[setId]?.icon || '❓'
}

function getSetName(setId) {
  return EQUIPMENT_SETS[setId]?.name || setId
}

function getSetColor(setId) {
  const rarity = EQUIPMENT_SETS[setId]?.rarity || 4
  return RARITY_COLORS[rarity] || '#a855f7'
}

function getSetCount(setId) {
  return activeSets.value[setId]?.count || 0
}

function isSetComplete(setId) {
  return getSetCount(setId) >= 4
}

function hasSetPiece(setId, slot) {
  const setConfig = EQUIPMENT_SETS[setId]
  if (!setConfig) return false
  const pieceId = setConfig.pieces[slot]?.id
  return Object.values(equippedItems.value).some(item => item?.id === pieceId)
}

function getSetBonusDesc(setId, tier) {
  return EQUIPMENT_SETS[setId]?.bonuses[tier]?.description || ''
}

function getItemStats(item) {
  const stats = item.base_stats || {}
  // 强化加成
  const enhanceLevel = item.enhanceLevel || 0
  const enhanced = {}
  for (const [k, v] of Object.entries(stats)) {
    enhanced[k] = Math.floor(v * (1 + enhanceLevel * 0.1))
  }
  return enhanced
}

function getStatName(stat) {
  const names = {
    atk: '攻击', def: '防御', hp: '生命', spirit: '灵气',
    atk_percent: '攻击%', def_percent: '防御%', hp_percent: '生命%',
    crit_rate: '暴击率', crit_dmg: '暴伤', dodge: '闪避',
    fire_dmg: '火伤', thunder_dmg: '雷伤', frost_dmg: '冰伤',
    all_stats: '全属性', all_dmg: '增伤', damage_reduction: '减伤',
    hp_regen: '生命回复', spirit_regen: '灵气回复', speed: '速度'
  }
  return names[stat] || stat
}

function getStatSuffix(stat) {
  if (stat.includes('rate') || stat.includes('percent') || stat.includes('chance')) return '%'
  return ''
}

function getSlotName(slot) {
  const names = { weapon: '武器', armor: '护甲', helmet: '头盔', accessory: '饰品' }
  return names[slot] || slot
}

function selectSlot(slot) {
  selectedSlot.value = selectedSlot.value === slot ? null : slot
}

// API actions
async function loadData() {
  loading.value = true
  try {
    const userId = 1
    // 获取穿戴中的装备
    const equippedRes = await equipmentApi.getEquipped(userId)
    const equipped = equippedRes.data || []
    const slots = {}
    equipped.forEach(e => { slots[e.slot] = e })
    equippedItems.value = slots

    // 获取背包中的装备
    const invRes = await equipmentApi.get(userId)
    inventoryItems.value = invRes.data || []

    // 获取套装配置
    const setsRes = await equipmentApi.getSetConfig()
    allSets.value = setsRes.data || Object.values(EQUIPMENT_SETS)
  } catch (e) {
    console.error('加载装备数据失败', e)
    // 使用demo数据
    equippedItems.value = {
      weapon: { id: 1, name: '铁剑', slot: 'weapon', icon: '⚔️', rarity: 1, set_id: null, base_stats: { atk: 10 }, enhanceLevel: 0 },
      armor: { id: 2, name: '布衣', slot: 'armor', icon: '👕', rarity: 1, set_id: null, base_stats: { def: 5 }, enhanceLevel: 0 }
    }
    inventoryItems.value = [
      { id: 3, name: '烈焰剑', slot: 'weapon', icon: '🔥', rarity: 4, set_id: 'flame_set', base_stats: { atk: 80, fire_dmg: 30 }, enhanceLevel: 0 },
      { id: 4, name: '烈焰甲', slot: 'armor', icon: '🔥', rarity: 4, set_id: 'flame_set', base_stats: { def: 50, hp: 100 }, enhanceLevel: 0 },
      { id: 5, name: '惊雷刀', slot: 'weapon', icon: '⚡', rarity: 5, set_id: 'thunder_set', base_stats: { atk: 120, crit_rate: 10 }, enhanceLevel: 0 }
    ]
    allSets.value = Object.values(EQUIPMENT_SETS)
  }
  loading.value = false
}

async function equipItem(item) {
  try {
    await equipmentApi.equip(1, item.id)
    item.equipped = true
    equippedItems.value[item.slot] = item
  } catch (e) {
    console.error('穿戴失败', e)
  }
}

async function unequipItem(slot) {
  const item = equippedItems.value[slot]
  if (!item) return
  try {
    await equipmentApi.unequip(1, item.id)
    item.equipped = false
    equippedItems.value[slot] = null
  } catch (e) {
    console.error('卸下失败', e)
  }
}

async function upgradeItem(slot) {
  const item = equippedItems.value[slot]
  if (!item) return
  try {
    const res = await equipmentApi.enhance(1, item.id)
    if (res.data?.success) {
      item.enhanceLevel = res.data.level
    }
  } catch (e) {
    console.error('强化失败', e)
  }
}

onMounted(loadData)
</script>

<style scoped>
.equipment-panel { font-family: 'Microsoft YaHei', sans-serif; }

.panel-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 15px;
}
.panel-header h2 { color: #f093fb; font-size: 22px; margin: 0; }
.bonus-badge {
  background: linear-gradient(135deg, #f093fb, #f5576c);
  color: #fff; padding: 6px 14px; border-radius: 20px;
  font-size: 12px; font-weight: bold;
}

/* Tab Bar */
.tab-bar {
  display: flex; gap: 8px; margin-bottom: 15px;
  background: rgba(255,255,255,0.05); padding: 6px;
  border-radius: 12px;
}
.tab-btn {
  flex: 1; padding: 10px; border: none; background: transparent;
  color: rgba(255,255,255,0.5); border-radius: 10px;
  cursor: pointer; font-size: 13px; transition: all 0.2s;
}
.tab-btn.active {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff; font-weight: bold;
}
.tab-btn:hover:not(.active) { color: #fff; }

/* Equip Slots */
.equip-slots-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
  margin-bottom: 20px;
}
.equip-slot {
  position: relative; border-radius: 16px; padding: 16px;
  background: rgba(255,255,255,0.05); min-height: 120px;
  cursor: pointer; transition: all 0.3s;
  overflow: hidden;
}
.equip-slot:hover { background: rgba(255,255,255,0.1); transform: translateY(-2px); }
.equip-slot.filled { border: 2px solid rgba(102,126,234,0.6); }
.equip-slot.empty { border: 2px dashed rgba(255,255,255,0.15); }
.slot-inner { display: flex; flex-direction: column; align-items: center; gap: 6px; position: relative; z-index: 1; }
.slot-emoji { font-size: 36px; }
.slot-label { font-size: 11px; color: rgba(255,255,255,0.4); text-transform: uppercase; }
.slot-item-name { color: #fff; font-size: 13px; font-weight: bold; text-align: center; }
.slot-empty-text { color: rgba(255,255,255,0.2); font-size: 12px; }
.slot-set-badge { position: absolute; top: 6px; right: 6px; font-size: 16px; }

/* 套装发光边框 */
.set-glow {
  position: absolute; inset: 0; border-radius: 14px;
  box-shadow: inset 0 0 20px var(--set-color, #a855f7), 0 0 10px var(--set-color, #a855f7);
  opacity: 0.4; pointer-events: none;
}

/* Equip Detail */
.equip-detail {
  background: rgba(255,255,255,0.05); border-radius: 16px; padding: 16px; margin-bottom: 20px;
  border: 1px solid rgba(255,255,255,0.1);
}
.detail-header { display: flex; gap: 12px; align-items: center; margin-bottom: 12px; }
.detail-icon { font-size: 40px; }
.detail-info h3 { margin: 0 0 4px; color: #fff; font-size: 16px; }
.rarity-tag { font-size: 12px; font-weight: bold; }
.set-tag { font-size: 11px; background: rgba(168,85,247,0.2); color: #a855f7; padding: 2px 8px; border-radius: 10px; margin-left: 6px; }
.detail-stats { margin-bottom: 12px; }
.stat-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
.stat-name { color: rgba(255,255,255,0.6); font-size: 13px; }
.stat-value { color: #4ade80; font-weight: bold; font-size: 13px; }
.detail-actions { display: flex; gap: 8px; }
.action-btn {
  flex: 1; padding: 10px; border: none; border-radius: 10px;
  font-size: 13px; cursor: pointer; transition: all 0.2s;
}
.action-btn.upgrade { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; }
.action-btn.unequip { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.7); }
.action-btn:hover { transform: scale(1.02); }

/* Set Overview */
.set-overview { margin-top: 10px; }
.set-overview h3 { color: #f093fb; font-size: 14px; margin-bottom: 10px; }
.set-info-row {
  display: flex; align-items: center; gap: 10px;
  background: rgba(255,255,255,0.03); border-radius: 12px; padding: 12px; margin-bottom: 8px;
}
.set-icon-lg { font-size: 28px; }
.set-info { flex: 1; }
.set-info .set-name { display: block; color: #fff; font-weight: bold; font-size: 14px; }
.set-info .set-count { font-size: 11px; color: rgba(255,255,255,0.5); }
.set-bonus-list { display: flex; flex-direction: column; gap: 4px; }
.bonus-chip {
  font-size: 11px; padding: 3px 8px; border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.2); color: rgba(255,255,255,0.4);
  white-space: nowrap;
}
.bonus-chip.active { color: #fff; }
.bonus-chip.inactive { opacity: 0.4; }

/* Sets Grid */
.sets-grid { display: flex; flex-direction: column; gap: 16px; max-height: 70vh; overflow-y: auto; padding-right: 4px; }
.set-card {
  background: rgba(255,255,255,0.04); border-radius: 16px; padding: 16px;
  border: 1px solid rgba(255,255,255,0.08);
  transition: all 0.3s;
}
.set-card.has-full { border-color: var(--set-color, #a855f7); box-shadow: 0 0 20px rgba(168,85,247,0.15); }
.set-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.set-icon-xl { font-size: 36px; }
.set-card-title h3 { margin: 0; color: #fff; font-size: 16px; }
.set-rarity-tag { font-size: 11px; color: rgba(255,255,255,0.5); }
.set-progress {
  margin-left: auto; background: rgba(255,255,255,0.1);
  padding: 4px 10px; border-radius: 20px; font-size: 12px;
}
.set-desc { font-size: 12px; color: rgba(255,255,255,0.5); margin: 0 0 12px; }
.set-pieces { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 12px; }
.set-piece {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  background: rgba(255,255,255,0.05); border-radius: 8px; padding: 8px 4px;
  opacity: 0.4; transition: all 0.3s;
}
.set-piece.owned { opacity: 1; background: rgba(168,85,247,0.15); }
.piece-name { font-size: 9px; color: rgba(255,255,255,0.6); text-align: center; }
.set-bonuses { display: flex; flex-direction: column; gap: 6px; }
.bonus-item {
  display: flex; gap: 8px; align-items: flex-start;
  background: rgba(255,255,255,0.03); border-radius: 8px; padding: 8px;
  opacity: 0.5; border-left: 3px solid rgba(255,255,255,0.2);
}
.bonus-item.active { opacity: 1; border-left-color: #a855f7; background: rgba(168,85,247,0.08); }
.bonus-tier { font-size: 11px; color: #a855f7; font-weight: bold; min-width: 40px; }
.bonus-name { font-size: 12px; color: #fff; font-weight: bold; }
.bonus-desc { font-size: 11px; color: rgba(255,255,255,0.6); }

/* Inventory */
.inventory-filter { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
.filter-btn {
  padding: 6px 12px; border: 1px solid rgba(255,255,255,0.15);
  background: transparent; color: rgba(255,255,255,0.5);
  border-radius: 20px; font-size: 12px; cursor: pointer; transition: all 0.2s;
}
.filter-btn.active { background: rgba(102,126,234,0.3); color: #fff; border-color: #667eea; }
.filter-btn:hover:not(.active) { color: #fff; }
.inventory-list { display: flex; flex-direction: column; gap: 8px; max-height: 60vh; overflow-y: auto; }
.inventory-item {
  display: flex; align-items: center; gap: 10px;
  background: rgba(255,255,255,0.04); border-radius: 12px; padding: 12px;
  border-left: 3px solid var(--rarity-color, rgba(255,255,255,0.2));
  transition: all 0.2s;
}
.inventory-item:hover { background: rgba(255,255,255,0.08); }
.inventory-item.equipped { opacity: 0.6; }
.item-icon { font-size: 30px; }
.item-info { flex: 1; }
.item-info .item-name { display: block; color: #fff; font-weight: bold; font-size: 13px; }
.item-info .item-type { font-size: 11px; color: rgba(255,255,255,0.4); }
.item-info .item-set { display: block; font-size: 11px; color: #a855f7; margin-top: 2px; }
.item-stats-mini { display: flex; flex-direction: column; gap: 2px; }
.mini-stat { font-size: 11px; color: #4ade80; }
.equip-btn {
  padding: 8px 14px; background: linear-gradient(135deg, #667eea, #764ba2);
  border: none; border-radius: 10px; color: #fff; font-size: 12px; cursor: pointer;
}
.equipped-label { font-size: 11px; color: rgba(255,255,255,0.4); }
.empty-inventory { text-align: center; padding: 40px; color: rgba(255,255,255,0.3); font-size: 14px; }

/* Set Total Bonus */
.set-total-bonus {
  margin-top: 20px; background: rgba(168,85,247,0.08);
  border-radius: 16px; padding: 16px; border: 1px solid rgba(168,85,247,0.2);
}
.set-total-bonus h3 { color: #a855f7; font-size: 14px; margin: 0 0 10px; }
.total-stats-grid { display: flex; flex-wrap: wrap; gap: 6px; }
.total-stat-chip {
  background: rgba(168,85,247,0.15); color: #e879f9;
  padding: 4px 10px; border-radius: 20px; font-size: 12px;
}

/* Scrollbar */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 2px; }
::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.4); border-radius: 2px; }

/* Mobile */
@media (max-width: 600px) {
  .equip-slots-grid { grid-template-columns: 1fr 1fr; }
  .set-pieces { grid-template-columns: repeat(4, 1fr); }
}
</style>
