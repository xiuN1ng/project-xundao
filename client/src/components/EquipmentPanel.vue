<template>
  <BasePanel
    title="装备套装"
    icon="⚔️"
    variant="primary"
    :tab-items="tabs"
    :default-tab="activeTab"
    @tab-change="activeTab = $event"
    @close="$emit('close')"
  >
    <!-- Header: 套装激活数 badge -->
    <template #actions>
      <span v-if="activeBonusCount > 0" class="bonus-badge">
        🔥 {{ activeBonusCount }} 套效果已激活
      </span>
    </template>

    <!-- Tab 1: 已穿戴装备 -->
    <div v-if="activeTab === 'equipped'" class="tab-content">
      <div class="equip-slots-grid">
        <div
          v-for="slot in equipSlots"
          :key="slot.type"
          class="equip-slot"
          :class="{ filled: equippedItems[slot.type], empty: !equippedItems[slot.type], 'set-active': equippedItems[slot.type]?.set_id && getSetCount(equippedItems[slot.type].set_id) >= 2 }"
          :style="equippedItems[slot.type]?.set_id ? { '--set-color': getSetColor(equippedItems[slot.type].set_id) } : {}"
          @click="selectSlot(slot.type)"
        >
          <div class="slot-inner">
            <span class="slot-emoji">{{ slot.icon }}</span>
            <span class="slot-label">{{ slot.name }}</span>
            <span v-if="equippedItems[slot.type]" class="slot-item-name">{{ equippedItems[slot.type].name }}</span>
            <span v-else class="slot-empty-text">空</span>
            <span v-if="equippedItems[slot.type]?.set_id" class="slot-set-badge">
              {{ getSetIcon(equippedItems[slot.type].set_id) }}
            </span>
          </div>
          <!-- 套装染色边框 + 激活特效 -->
          <div v-if="equippedItems[slot.type]?.set_id" class="set-glow"></div>
          <div v-if="equippedItems[slot.type]?.set_id && getSetCount(equippedItems[slot.type].set_id) >= 2" class="set-activation-ring"></div>
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
          <BaseButton variant="primary" size="sm" @click="upgradeItem(selectedSlot)">
            ⬆️ 强化 (+{{ equippedItems[selectedSlot].enhanceLevel || 0 }})
          </BaseButton>
          <BaseButton variant="ghost" size="sm" @click="unequipItem(selectedSlot)">
            📤 卸下
          </BaseButton>
        </div>
      </div>

      <!-- 套装总览 -->
      <div v-if="Object.keys(activeSets).length > 0" class="set-overview">
        <h3 class="section-title">🔥 已激活套装效果</h3>
        <div v-for="(info, setId) in activeSets" :key="setId" class="set-info-row">
          <span class="set-icon-lg">{{ getSetIcon(setId) }}</span>
          <div class="set-info">
            <span class="set-name">{{ getSetName(setId) }}</span>
            <ProgressBar
              :current="info.count"
              :total="4"
              :height="6"
              :show-label="false"
              :color="info.count >= 4 ? 'gold' : info.count >= 2 ? 'success' : 'primary'"
            />
            <span class="set-count">{{ info.count }}/4 件</span>
          </div>
          <div class="set-bonus-list">
            <span
              v-if="info.count >= 2"
              class="bonus-chip active"
              :style="{ borderColor: getSetColor(setId), '--set-color': getSetColor(setId) }"
            >
              2件: {{ getSetBonusDesc(setId, 2) }}
            </span>
            <span
              v-else
              class="bonus-chip inactive"
            >
              2件: {{ getSetBonusDesc(setId, 2) }}
            </span>
            <span
              v-if="info.count >= 4"
              class="bonus-chip active gold"
              :style="{ borderColor: getSetColor(setId), '--set-color': getSetColor(setId) }"
            >
              4件: {{ getSetBonusDesc(setId, 4) }}
            </span>
            <span
              v-else
              class="bonus-chip inactive"
            >
              4件: {{ getSetBonusDesc(setId, 4) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 2: 套装一览 -->
    <div v-if="activeTab === 'sets'" class="tab-content">
      <!-- 套装收集总进度 -->
      <div class="sets-progress-header">
        <div class="sets-progress-info">
          <span>套装收集进度</span>
          <span class="sets-progress-count">{{ totalCollectedSets }}/{{ allSets.length }} 套</span>
        </div>
        <ProgressBar
          :current="totalCollectedSets"
          :total="allSets.length"
          :height="10"
          color="gold"
          :show-label="false"
          :animated="true"
        />
      </div>

      <div class="sets-grid">
        <div
          v-for="set in allSets"
          :key="set.id"
          class="set-card"
          :class="{
            'has-2piece': getSetCount(set.id) >= 2,
            'has-full': getSetCount(set.id) >= 4
          }"
          :style="{ '--set-color': getSetColor(set.id) }"
        >
          <!-- 套装激活光环 -->
          <div v-if="getSetCount(set.id) >= 2" class="set-card-glow"></div>

          <div class="set-card-header">
            <span class="set-icon-xl">{{ set.icon }}</span>
            <div class="set-card-title">
              <h3>{{ set.name }}</h3>
              <span class="set-rarity-tag" :style="{ color: getSetColor(set.id) }">
                {{ getRarityName(set.rarity) }}
              </span>
            </div>
            <div class="set-header-right">
              <span class="set-progress-badge">
                {{ getSetCount(set.id) }}/4
              </span>
              <div class="set-progress-mini">
                <ProgressBar
                  :current="getSetCount(set.id)"
                  :total="4"
                  :height="5"
                  :show-label="false"
                  :color="getSetCount(set.id) >= 4 ? 'gold' : getSetCount(set.id) >= 2 ? 'success' : 'primary'"
                />
              </div>
            </div>
          </div>

          <p class="set-desc">{{ set.description }}</p>

          <!-- 套装部件 + 收集度 -->
          <div class="set-pieces">
            <div
              v-for="(piece, slot) in set.pieces"
              :key="slot"
              class="set-piece"
              :class="{ owned: hasSetPiece(set.id, slot) }"
            >
              <span class="piece-icon">{{ piece.icon || '📦' }}</span>
              <span class="piece-name">{{ piece.name || slot }}</span>
              <span v-if="hasSetPiece(set.id, slot)" class="piece-owned-check">✓</span>
            </div>
          </div>

          <!-- 套装技能说明 -->
          <div class="set-bonuses">
            <div
              class="bonus-item"
              :class="{ active: getSetCount(set.id) >= 2, 'tier-2': true }"
            >
              <div class="bonus-header">
                <span class="bonus-tier">2件套</span>
                <span v-if="getSetCount(set.id) >= 2" class="bonus-active-indicator">✓ 已激活</span>
              </div>
              <span class="bonus-name">{{ set.bonuses[2].name }}</span>
              <span class="bonus-desc">{{ set.bonuses[2].description }}</span>
              <div v-if="set.bonuses[2].stats" class="bonus-stats">
                <span v-for="(val, stat) in set.bonuses[2].stats" :key="stat" class="bonus-stat-chip">
                  {{ getStatName(stat) }}+{{ val }}{{ getStatSuffix(stat) }}
                </span>
              </div>
            </div>

            <div
              class="bonus-item"
              :class="{ active: getSetCount(set.id) >= 4, 'tier-4': true }"
            >
              <div class="bonus-header">
                <span class="bonus-tier">4件套</span>
                <span v-if="getSetCount(set.id) >= 4" class="bonus-active-indicator gold">★ 已激活</span>
              </div>
              <span class="bonus-name">{{ set.bonuses[4].name }}</span>
              <span class="bonus-desc">{{ set.bonuses[4].description }}</span>
              <div v-if="set.bonuses[4].stats" class="bonus-stats">
                <span v-for="(val, stat) in set.bonuses[4].stats" :key="stat" class="bonus-stat-chip">
                  {{ getStatName(stat) }}+{{ val }}{{ getStatSuffix(stat) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 3: 背包 -->
    <div v-if="activeTab === 'inventory'" class="tab-content">
      <div class="inventory-filter">
        <BaseButton
          v-for="filter in filters"
          :key="filter.type"
          variant="ghost"
          size="sm"
          :class="{ 'filter-active': activeFilter === filter.type }"
          @click="activeFilter = filter.type"
        >
          {{ filter.icon }} {{ filter.name }}
        </BaseButton>
      </div>

      <div class="inventory-list">
        <div
          v-for="item in filteredInventory"
          :key="item.id"
          class="inventory-item"
          :class="{ equipped: item.equipped, 'has-set': item.set_id }"
          :style="item.set_id ? { '--rarity-color': getSetColor(item.set_id), '--rarity': getRarityColor(item.rarity) } : { '--rarity': getRarityColor(item.rarity) }"
        >
          <span class="item-icon">{{ item.icon || '📦' }}</span>
          <div class="item-info">
            <span class="item-name" :style="{ color: getRarityColor(item.rarity) }">{{ item.name }}</span>
            <span class="item-type">{{ getSlotName(item.slot) }}</span>
            <span v-if="item.set_id" class="item-set">
              {{ getSetIcon(item.set_id) }} {{ getSetName(item.set_id) }}
              <span v-if="getSetCount(item.set_id) >= 2" class="item-set-badge">可激活</span>
            </span>
          </div>
          <div class="item-stats-mini">
            <span v-for="(val, key) in getItemStats(item)" :key="key" class="mini-stat">
              {{ getStatName(key) }}+{{ val }}
            </span>
          </div>
          <BaseButton
            v-if="!item.equipped"
            variant="primary"
            size="sm"
            :loading="equippingId === item.id"
            @click="equipItem(item)"
          >
            📥 穿戴
          </BaseButton>
          <span v-else class="equipped-label">已穿戴</span>
        </div>

        <div v-if="filteredInventory.length === 0" class="empty-state">
          <span class="empty-icon">🎒</span>
          <span class="empty-text">背包空空如也</span>
        </div>
      </div>
    </div>

    <!-- Tab 4: 强化 -->
    <div v-if="activeTab === 'enhance'" class="tab-content">
      <div class="enhance-tip">
        <span>💡 选择一件已穿戴的装备进行强化</span>
      </div>
      <div class="enhance-slot-list">
        <div
          v-for="(item, slot) in equippedItems"
          :key="slot"
          class="enhance-slot-item"
          :class="{ selected: enhanceSelectedSlot === slot }"
          @click="enhanceSelectedSlot = slot"
        >
          <span class="item-icon">{{ item?.icon || '📦' }}</span>
          <div class="item-info">
            <span class="item-name">{{ item?.name || '空' }}</span>
            <span v-if="item" class="enhance-level">+{{ item.enhanceLevel || 0 }}</span>
          </div>
        </div>
      </div>
      <div v-if="enhanceSelectedSlot && equippedItems[enhanceSelectedSlot]" class="enhance-action">
        <BaseButton
          variant="primary"
          :loading="enhancing"
          :disabled="!equippedItems[enhanceSelectedSlot]"
          @click="doEnhance"
        >
          ⬆️ 强化 +{{ (equippedItems[enhanceSelectedSlot]?.enhanceLevel || 0) + 1 }}
        </BaseButton>
        <span class="enhance-cost">消耗: {{ enhanceCost }} 强化石</span>
      </div>
    </div>

    <!-- 套装总加成展示 (底部) -->
    <template #footer>
      <div v-if="totalSetStats && Object.keys(totalSetStats).length > 0" class="set-total-bonus">
        <h3>📊 套装总加成</h3>
        <div class="total-stats-grid">
          <span
            v-for="(val, stat) in totalSetStats"
            :key="stat"
            class="total-stat-chip"
          >
            {{ getStatName(stat) }}+{{ val }}{{ getStatSuffix(stat) }}
          </span>
        </div>
      </div>
    </template>
  </BasePanel>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import BasePanel from './base/BasePanel.vue'
import BaseButton from './base/BaseButton.vue'
import ProgressBar from './common/ProgressBar.vue'
import { useToast } from './common/toastComposable.js'
import { equipmentApi } from '../api'

defineEmits(['close'])

const toast = useToast()

// ===================== 本地套装配置（防止模块缺失报错） =====================
const RARITY_COLORS = {
  1: '#9ca3af',  // 普通-灰
  2: '#34d399',  // 优秀-绿
  3: '#60a5fa',  // 稀有-蓝
  4: '#a855f7',  // 史诗-紫
  5: '#f59e0b',  // 传说-橙
}

const RARITY_NAMES = {
  1: '普通', 2: '优秀', 3: '稀有', 4: '史诗', 5: '传说'
}

// 套装配置数据（向后兼容，API 优先）
const EQUIPMENT_SETS = {
  flame_set: {
    id: 'flame_set', name: '烈焰套装', icon: '🔥', rarity: 4,
    description: '传说中驾驭烈焰的勇者所穿戴的套装，激活后可召唤火焰之力。',
    pieces: {
      weapon: { id: 'flame_sword', name: '烈焰剑', icon: '⚔️' },
      armor: { id: 'flame_armor', name: '烈焰甲', icon: '🛡️' },
      helmet: { id: 'flame_helm', name: '烈焰盔', icon: '⛑️' },
      accessory: { id: 'flame_ring', name: '烈焰戒', icon: '💍' },
    },
    bonuses: {
      2: { name: '烈焰之心', description: '攻击时附加15%火焰伤害', stats: { fire_dmg: 15 } },
      4: { name: '焚天灭世', description: '火焰伤害提升50%，暴击伤害+25%', stats: { fire_dmg: 50, crit_dmg: 25 } },
    },
  },
  thunder_set: {
    id: 'thunder_set', name: '雷霆套装', icon: '⚡', rarity: 5,
    description: '汇聚九天雷霆之威，佩戴者可引雷入体，威力无边。',
    pieces: {
      weapon: { id: 'thunder_blade', name: '惊雷刀', icon: '⚔️' },
      armor: { id: 'thunder_armor', name: '雷霆甲', icon: '🛡️' },
      helmet: { id: 'thunder_crown', name: '雷冠', icon: '⛑️' },
      accessory: { id: 'thunder_brace', name: '雷镯', icon: '💍' },
    },
    bonuses: {
      2: { name: '雷鸣之力', description: '攻击速度+20%，闪避率+10%', stats: { speed: 20, dodge: 10 } },
      4: { name: '天罚降临', description: '暴击率+30%，暴击伤害+50%', stats: { crit_rate: 30, crit_dmg: 50 } },
    },
  },
  ice_set: {
    id: 'ice_set', name: '寒冰套装', icon: '❄️', rarity: 3,
    description: '取自万年寒冰精炼而成，佩戴者身法如风寒冰彻骨。',
    pieces: {
      weapon: { id: 'ice_sword', name: '寒冰剑', icon: '⚔️' },
      armor: { id: 'ice_armor', name: '寒冰甲', icon: '🛡️' },
      helmet: { id: 'ice_helm', name: '寒冰盔', icon: '⛑️' },
      accessory: { id: 'ice_amulet', name: '寒冰符', icon: '💍' },
    },
    bonuses: {
      2: { name: '冰封护体', description: '受到伤害-10%，生命回复+5%/秒', stats: { damage_reduction: 10, hp_regen: 5 } },
      4: { name: '绝对零度', description: '冰冻几率+15%，防御+30%', stats: { frost_dmg: 15, def: 30 } },
    },
  },
  dragon_set: {
    id: 'dragon_set', name: '龙鳞套装', icon: '🐉', rarity: 5,
    description: '以真龙鳞片铸就，传说穿戴者可获龙之守护。',
    pieces: {
      weapon: { id: 'dragon_blade', name: '龙牙刃', icon: '⚔️' },
      armor: { id: 'dragon_armor', name: '龙鳞甲', icon: '🛡️' },
      helmet: { id: 'dragon_helm', name: '龙角盔', icon: '⛑️' },
      accessory: { id: 'dragon_pendant', name: '龙珠吊坠', icon: '💍' },
    },
    bonuses: {
      2: { name: '龙之守护', description: '生命上限+30%，伤害减免+15%', stats: { hp: 30, damage_reduction: 15 } },
      4: { name: '龙威降临', description: '全属性+15%，受到致命伤害时有20%几率无敌1秒', stats: { all_stats: 15, damage_reduction: 20 } },
    },
  },
  shadow_set: {
    id: 'shadow_set', name: '暗影套装', icon: '🌑', rarity: 4,
    description: '源自幽冥深处的暗影之力，适合刺客类修士。',
    pieces: {
      weapon: { id: 'shadow_dagger', name: '暗影匕', icon: '⚔️' },
      armor: { id: 'shadow_cloak', name: '暗影披风', icon: '🛡️' },
      helmet: { id: 'shadow_hood', name: '暗影兜帽', icon: '⛑️' },
      accessory: { id: 'shadow_ring', name: '暗影戒', icon: '💍' },
    },
    bonuses: {
      2: { name: '暗影步伐', description: '闪避率+25%，攻击速度+15%', stats: { dodge: 25, speed: 15 } },
      4: { name: '影分身术', description: '击杀目标后生成一个影子分身协助作战', stats: { atk: 40, crit_rate: 15 } },
    },
  },
  immortal_set: {
    id: 'immortal_set', name: '仙风套装', icon: '☁️', rarity: 5,
    description: '飞升成仙者遗留的套装，蕴含天道法则之力。',
    pieces: {
      weapon: { id: 'immortal_sword', name: '仙剑', icon: '⚔️' },
      armor: { id: 'immortal_robe', name: '仙袍', icon: '🛡️' },
      helmet: { id: 'immortal_crown', name: '仙冠', icon: '⛑️' },
      accessory: { id: 'immortal_jade', name: '仙玉', icon: '💍' },
    },
    bonuses: {
      2: { name: '仙气缭绕', description: '灵气回复+50%，技能冷却-20%', stats: { spirit_regen: 50, speed: 20 } },
      4: { name: '天人合一', description: '全属性+25%，每次攻击回复生命+3%', stats: { all_stats: 25, hp_regen: 3 } },
    },
  },
}

// ===================== 状态 =====================
const activeTab = ref('equipped')
const activeFilter = ref('all')
const equippedItems = ref({})
const inventoryItems = ref([])
const allSets = ref([])
const selectedSlot = ref(null)
const enhanceSelectedSlot = ref(null)
const equippingId = ref(null)
const enhancing = ref(false)
const loading = ref(false)

const tabs = [
  { id: 'equipped', name: '已穿戴', icon: '👤' },
  { id: 'sets', name: '套装一览', icon: '🔥' },
  { id: 'inventory', name: '背包', icon: '🎒' },
  { id: 'enhance', name: '强化', icon: '⬆️' },
]

const filters = [
  { type: 'all', name: '全部', icon: '📦' },
  { type: 'weapon', name: '武器', icon: '⚔️' },
  { type: 'armor', name: '护甲', icon: '🛡️' },
  { type: 'helmet', name: '头盔', icon: '⛑️' },
  { type: 'accessory', name: '饰品', icon: '💍' },
]

const equipSlots = [
  { type: 'weapon', name: '武器', icon: '⚔️' },
  { type: 'armor', name: '护甲', icon: '🛡️' },
  { type: 'helmet', name: '头盔', icon: '⛑️' },
  { type: 'accessory', name: '饰品', icon: '💍' },
]

// ===================== 计算属性 =====================
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

const totalCollectedSets = computed(() => {
  return Object.values(activeSets.value).filter(info => info.count >= 2).length
})

const enhanceCost = computed(() => {
  const level = equippedItems.value[enhanceSelectedSlot.value]?.enhanceLevel || 0
  return Math.floor(10 * Math.pow(1.5, level))
})

// 监听装备变化，检测套装激活
let prevActiveSets = {}
watch(activeSets, (newSets) => {
  for (const [setId, info] of Object.entries(newSets)) {
    const prev = prevActiveSets[setId]?.count || 0
    const now = info.count
    if (now > prev) {
      if (now === 2) {
        toast.reward(`🎉 套装【${getSetName(setId)}】2件套效果已激活！`)
      } else if (now === 4) {
        toast.reward(`🌟 套装【${getSetName(setId)}】4件套效果已激活！`)
      }
    }
  }
  prevActiveSets = { ...newSets }
}, { deep: true })

// ===================== 辅助函数 =====================
function getRarityColor(rarity) {
  return RARITY_COLORS[rarity] || '#a855f7'
}

function getRarityName(rarity) {
  return RARITY_NAMES[rarity] || '普通'
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
  if (stat.includes('rate') || stat.includes('percent') || stat.includes('_dmg') && !stat.includes('crit')) return '%'
  return ''
}

function getSlotName(slot) {
  const names = { weapon: '武器', armor: '护甲', helmet: '头盔', accessory: '饰品' }
  return names[slot] || slot
}

function selectSlot(slot) {
  selectedSlot.value = selectedSlot.value === slot ? null : slot
}

// ===================== API 操作 =====================
async function loadData() {
  loading.value = true
  try {
    const userId = 1
    const [equippedRes, invRes, setsRes] = await Promise.all([
      equipmentApi.getEquipped(userId),
      equipmentApi.get(userId),
      equipmentApi.getSetConfig(),
    ])

    const slots = {}
    ;(equippedRes.data || []).forEach(e => { slots[e.slot] = e })
    equippedItems.value = slots
    inventoryItems.value = invRes.data || []
    allSets.value = setsRes.data || Object.values(EQUIPMENT_SETS)
  } catch (e) {
    console.warn('加载装备数据失败，使用演示数据', e)
    _loadDemoData()
  }
  loading.value = false
}

function _loadDemoData() {
  equippedItems.value = {
    weapon: { id: 1, name: '铁剑', slot: 'weapon', icon: '⚔️', rarity: 1, set_id: null, base_stats: { atk: 10 }, enhanceLevel: 0 },
    armor: { id: 2, name: '布衣', slot: 'armor', icon: '👕', rarity: 1, set_id: null, base_stats: { def: 5 }, enhanceLevel: 0 },
  }
  inventoryItems.value = [
    { id: 3, name: '烈焰剑', slot: 'weapon', icon: '🔥', rarity: 4, set_id: 'flame_set', base_stats: { atk: 80, fire_dmg: 30 }, enhanceLevel: 0 },
    { id: 4, name: '烈焰甲', slot: 'armor', icon: '🔥', rarity: 4, set_id: 'flame_set', base_stats: { def: 50, hp: 100 }, enhanceLevel: 0 },
    { id: 5, name: '惊雷刀', slot: 'weapon', icon: '⚡', rarity: 5, set_id: 'thunder_set', base_stats: { atk: 120, crit_rate: 10 }, enhanceLevel: 0 },
    { id: 6, name: '雷霆甲', slot: 'armor', icon: '⚡', rarity: 5, set_id: 'thunder_set', base_stats: { def: 80, hp: 200 }, enhanceLevel: 2 },
    { id: 7, name: '寒冰剑', slot: 'weapon', icon: '❄️', rarity: 3, set_id: 'ice_set', base_stats: { atk: 40, frost_dmg: 10 }, enhanceLevel: 1 },
    { id: 8, name: '木棒', slot: 'weapon', icon: '🪵', rarity: 1, set_id: null, base_stats: { atk: 5 }, enhanceLevel: 0 },
  ]
  allSets.value = Object.values(EQUIPMENT_SETS)
}

async function equipItem(item) {
  equippingId.value = item.id
  try {
    await equipmentApi.equip(1, item.id)
    item.equipped = true
    equippedItems.value[item.slot] = item
    toast.success(`已穿戴 ${item.name}`)
  } catch (e) {
    toast.error('穿戴失败，请重试')
  } finally {
    equippingId.value = null
  }
}

async function unequipItem(slot) {
  const item = equippedItems.value[slot]
  if (!item) return
  try {
    await equipmentApi.unequip(1, item.id)
    item.equipped = false
    equippedItems.value[slot] = null
    toast.success('已卸下装备')
  } catch (e) {
    toast.error('卸下失败，请重试')
  }
}

async function doEnhance() {
  const item = equippedItems.value[enhanceSelectedSlot.value]
  if (!item) return
  enhancing.value = true
  try {
    const res = await equipmentApi.refine(1, item.id)
    if (res.data?.success) {
      item.enhanceLevel = res.data.level
      toast.success(`强化成功！+${item.enhanceLevel}`)
    } else {
      toast.error(res.data?.error || '强化失败')
    }
  } catch (e) {
    toast.error('强化失败，请重试')
  } finally {
    enhancing.value = false
  }
}

async function upgradeItem(slot) {
  enhanceSelectedSlot.value = slot
  activeTab.value = 'enhance'
}

onMounted(loadData)
</script>

<style scoped>
.equipment-panel { font-family: 'Microsoft YaHei', sans-serif; }

/* Bonus Badge */
.bonus-badge {
  background: linear-gradient(135deg, #f093fb, #f5576c);
  color: #fff; padding: 6px 14px; border-radius: 20px;
  font-size: 12px; font-weight: bold; white-space: nowrap;
}

/* Tab Content */
.tab-content { display: flex; flex-direction: column; gap: 14px; }

/* Equip Slots Grid */
.equip-slots-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
}
.equip-slot {
  position: relative; border-radius: 16px; padding: 16px;
  background: rgba(255,255,255,0.05); min-height: 120px;
  cursor: pointer; transition: all 0.3s; overflow: hidden;
}
.equip-slot:hover { background: rgba(255,255,255,0.1); transform: translateY(-2px); }
.equip-slot.filled { border: 2px solid rgba(102,126,234,0.6); }
.equip-slot.empty { border: 2px dashed rgba(255,255,255,0.15); }
.equip-slot.set-active { border-color: var(--set-color, #a855f7); }
.slot-inner { display: flex; flex-direction: column; align-items: center; gap: 6px; position: relative; z-index: 1; }
.slot-emoji { font-size: 36px; }
.slot-label { font-size: 11px; color: rgba(255,255,255,0.4); text-transform: uppercase; }
.slot-item-name { color: #fff; font-size: 13px; font-weight: bold; text-align: center; }
.slot-empty-text { color: rgba(255,255,255,0.2); font-size: 12px; }
.slot-set-badge { position: absolute; top: 6px; right: 6px; font-size: 16px; }

/* Set Glow & Activation Effects */
.set-glow {
  position: absolute; inset: 0; border-radius: 14px;
  box-shadow: inset 0 0 20px var(--set-color, #a855f7);
  opacity: 0.35; pointer-events: none; transition: opacity 0.3s;
}
.equip-slot:hover .set-glow { opacity: 0.6; }

.set-activation-ring {
  position: absolute; inset: -4px; border-radius: 20px;
  border: 2px solid var(--set-color, #a855f7);
  animation: setPulse 2s ease-in-out infinite;
  pointer-events: none;
}

@keyframes setPulse {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.02); }
}

/* Equip Detail */
.equip-detail {
  background: rgba(255,255,255,0.05); border-radius: 16px; padding: 16px;
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

/* Set Overview */
.set-overview { margin-top: 4px; }
.section-title { color: #f093fb; font-size: 14px; margin: 0 0 10px; }
.set-info-row {
  display: flex; align-items: center; gap: 10px;
  background: rgba(255,255,255,0.03); border-radius: 12px; padding: 12px; margin-bottom: 8px;
}
.set-icon-lg { font-size: 28px; flex-shrink: 0; }
.set-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.set-info .set-name { color: #fff; font-weight: bold; font-size: 14px; }
.set-count { font-size: 11px; color: rgba(255,255,255,0.5); }
.set-bonus-list { display: flex; flex-direction: column; gap: 4px; flex-shrink: 0; }
.bonus-chip {
  font-size: 11px; padding: 3px 8px; border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.2); color: rgba(255,255,255,0.4);
  white-space: nowrap; max-width: 160px; overflow: hidden; text-overflow: ellipsis;
}
.bonus-chip.active { color: #fff; background: rgba(168,85,247,0.12); }
.bonus-chip.active.gold { background: rgba(245,158,11,0.12); }
.bonus-chip.inactive { opacity: 0.4; }

/* Sets Progress Header */
.sets-progress-header {
  background: rgba(255,255,255,0.04); border-radius: 12px; padding: 14px;
  margin-bottom: 4px;
}
.sets-progress-info {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 8px; font-size: 13px; color: rgba(255,255,255,0.7);
}
.sets-progress-count { color: #f59e0b; font-weight: bold; }

/* Sets Grid */
.sets-grid { display: flex; flex-direction: column; gap: 16px; max-height: 65vh; overflow-y: auto; padding-right: 4px; }
.set-card {
  position: relative; overflow: hidden;
  background: rgba(255,255,255,0.04); border-radius: 16px; padding: 16px;
  border: 1px solid rgba(255,255,255,0.08); transition: all 0.3s;
}
.set-card.has-2piece { border-color: rgba(168,85,247,0.3); }
.set-card.has-full { border-color: var(--set-color, #a855f7); box-shadow: 0 0 20px rgba(168,85,247,0.15); }

.set-card-glow {
  position: absolute; top: -20px; right: -20px;
  width: 100px; height: 100px; border-radius: 50%;
  background: radial-gradient(circle, var(--set-color, #a855f7), transparent 70%);
  opacity: 0.15; pointer-events: none; animation: glowFloat 3s ease-in-out infinite;
}
@keyframes glowFloat {
  0%, 100% { opacity: 0.1; transform: scale(1); }
  50% { opacity: 0.2; transform: scale(1.1); }
}

.set-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.set-icon-xl { font-size: 36px; flex-shrink: 0; }
.set-card-title { flex: 1; }
.set-card-title h3 { margin: 0; color: #fff; font-size: 16px; }
.set-rarity-tag { font-size: 11px; }
.set-header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.set-progress-badge {
  background: rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 20px;
  font-size: 12px; font-weight: bold;
}
.set-progress-mini { width: 60px; }
.set-desc { font-size: 12px; color: rgba(255,255,255,0.5); margin: 0 0 12px; }

/* Set Pieces */
.set-pieces { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 12px; }
.set-piece {
  position: relative;
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  background: rgba(255,255,255,0.05); border-radius: 8px; padding: 8px 4px;
  opacity: 0.4; transition: all 0.3s;
}
.set-piece.owned { opacity: 1; background: rgba(168,85,247,0.15); }
.piece-icon { font-size: 24px; }
.piece-name { font-size: 9px; color: rgba(255,255,255,0.6); text-align: center; }
.piece-owned-check { position: absolute; top: 2px; right: 2px; font-size: 10px; color: #4ade80; }

/* Set Bonuses / Set Skill Descriptions */
.set-bonuses { display: flex; flex-direction: column; gap: 8px; }
.bonus-item {
  display: flex; flex-direction: column; gap: 4px;
  background: rgba(255,255,255,0.03); border-radius: 10px; padding: 10px;
  border-left: 3px solid rgba(255,255,255,0.2); transition: all 0.3s;
}
.bonus-item.active { border-left-color: var(--set-color, #a855f7); background: rgba(168,85,247,0.08); }
.bonus-item.tier-4.active { border-left-color: #f59e0b; background: rgba(245,158,11,0.08); }
.bonus-header { display: flex; justify-content: space-between; align-items: center; }
.bonus-tier { font-size: 11px; color: #a855f7; font-weight: bold; }
.tier-4 .bonus-tier { color: #f59e0b; }
.bonus-active-indicator { font-size: 10px; color: #4ade80; }
.bonus-active-indicator.gold { color: #f59e0b; }
.bonus-name { font-size: 13px; color: #fff; font-weight: bold; }
.bonus-desc { font-size: 11px; color: rgba(255,255,255,0.6); }
.bonus-stats { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.bonus-stat-chip {
  font-size: 10px; padding: 2px 7px; border-radius: 12px;
  background: rgba(74,222,128,0.12); color: #4ade80;
}

/* Inventory */
.inventory-filter { display: flex; gap: 6px; flex-wrap: wrap; }
.filter-active { background: rgba(102,126,234,0.25) !important; color: #fff !important; border-color: #667eea !important; }
.inventory-list { display: flex; flex-direction: column; gap: 8px; max-height: 58vh; overflow-y: auto; }
.inventory-item {
  display: flex; align-items: center; gap: 10px;
  background: rgba(255,255,255,0.04); border-radius: 12px; padding: 12px;
  border-left: 3px solid var(--rarity, rgba(255,255,255,0.2));
  transition: all 0.2s;
}
.inventory-item:hover { background: rgba(255,255,255,0.08); }
.inventory-item.equipped { opacity: 0.6; }
.inventory-item.has-set { border-left-color: var(--set-color, #a855f7); }
.item-icon { font-size: 30px; flex-shrink: 0; }
.item-info { flex: 1; }
.item-info .item-name { display: block; font-weight: bold; font-size: 13px; }
.item-info .item-type { font-size: 11px; color: rgba(255,255,255,0.4); }
.item-set { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #a855f7; margin-top: 2px; }
.item-set-badge { background: #4ade80; color: #000; font-size: 9px; padding: 1px 5px; border-radius: 8px; font-weight: bold; }
.item-stats-mini { display: flex; flex-direction: column; gap: 2px; flex-shrink: 0; }
.mini-stat { font-size: 11px; color: #4ade80; white-space: nowrap; }
.equipped-label { font-size: 11px; color: rgba(255,255,255,0.4); }

/* Empty State */
.empty-state { text-align: center; padding: 40px; color: rgba(255,255,255,0.3); display: flex; flex-direction: column; align-items: center; gap: 8px; }
.empty-icon { font-size: 40px; }
.empty-text { font-size: 14px; }

/* Enhance Tab */
.enhance-tip { font-size: 12px; color: rgba(255,255,255,0.5); margin-bottom: 12px; }
.enhance-slot-list { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
.enhance-slot-item {
  display: flex; align-items: center; gap: 10px;
  background: rgba(255,255,255,0.05); border-radius: 12px; padding: 12px;
  cursor: pointer; border: 2px solid transparent; transition: all 0.2s;
}
.enhance-slot-item:hover { background: rgba(255,255,255,0.1); }
.enhance-slot-item.selected { border-color: #667eea; background: rgba(102,126,234,0.15); }
.enhance-slot-item .item-icon { font-size: 28px; }
.enhance-slot-item .item-info { flex: 1; }
.enhance-slot-item .item-name { display: block; color: #fff; font-size: 13px; }
.enhance-level { font-size: 12px; color: #f59e0b; font-weight: bold; }
.enhance-action { display: flex; align-items: center; gap: 12px; }
.enhance-cost { font-size: 12px; color: rgba(255,255,255,0.5); }

/* Set Total Bonus Footer */
.set-total-bonus {
  background: rgba(168,85,247,0.08); border-radius: 12px; padding: 12px;
  border: 1px solid rgba(168,85,247,0.2);
}
.set-total-bonus h3 { color: #a855f7; font-size: 13px; margin: 0 0 8px; }
.total-stats-grid { display: flex; flex-wrap: wrap; gap: 6px; }
.total-stat-chip {
  background: rgba(168,85,247,0.15); color: #e879f9;
  padding: 4px 10px; border-radius: 20px; font-size: 12px;
}

/* Scrollbar */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 2px; }
::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.4); border-radius: 2px; }

@media (max-width: 600px) {
  .equip-slots-grid { grid-template-columns: 1fr 1fr; }
  .set-pieces { grid-template-columns: repeat(4, 1fr); }
}
</style>

