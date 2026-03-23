<template>
  <div class="equipment-enhance-panel">
    <!-- 顶部标题栏 -->
    <div class="panel-header">
      <h2>⚔️ 装备强化</h2>
      <div class="header-info">
        <span class="lingshi-display">💰 灵石: {{ playerResources.spiritStones.toLocaleString() }}</span>
      <span class="lingshi-display">💎 强化石: {{ playerResources.refineStones }}</span>
      <span class="lingshi-display">🎫 增幅券: {{ playerResources.augmentTickets }}</span>
      </div>
    </div>

    <!-- Tab切换：强化 / 增幅 / 打孔 / 继承 -->
    <div class="tab-bar">
      <button v-for="tab in tabs" :key="tab.id"
        class="tab-btn" :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id">
        {{ tab.icon }} {{ tab.name }}
      </button>
    </div>

    <!-- 装备选择区（通用） -->
    <div class="equip-selector">
      <div class="selector-label">选择装备</div>
      <div class="equip-list">
        <div v-for="item in equippableItems" :key="item.id"
          class="equip-item" :class="{ selected: selectedItem?.id === item.id, equipped: item.equipped }"
          :style="{ '--rarity-color': getRarityColor(item.rarity) }"
          @click="selectItem(item)">
          <span class="item-icon">{{ item.icon || '📦' }}</span>
          <div class="item-info">
            <span class="item-name">{{ item.name }}</span>
            <span class="item-level">+{{ item.enhanceLevel || 0 }}</span>
          </div>
          <span v-if="item.equipped" class="equipped-badge">已穿</span>
        </div>
        <div v-if="equippableItems.length === 0" class="empty-equip">
          <span>🎒 暂无可强化装备</span>
        </div>
      </div>
    </div>

    <!-- ========== Tab 1: 强化 ========== -->
    <div v-if="activeTab === 'enhance'" class="tab-content">
      <div v-if="selectedItem" class="enhance-content">
        <div class="selected-item-display">
          <span class="display-icon">{{ selectedItem.icon }}</span>
          <div class="display-info">
            <span class="display-name">{{ selectedItem.name }}</span>
            <span class="display-level">+{{ selectedItem.enhanceLevel || 0 }} → +{{ Math.min((selectedItem.enhanceLevel || 0) + 1, 15) }}</span>
          </div>
        </div>

        <!-- +1~+15滑动选择 -->
        <div class="enhance-slider-section">
          <div class="slider-label">目标强化等级</div>
          <div class="level-slider">
            <button v-for="lv in 15" :key="lv"
              class="level-btn"
              :class="{
                active: targetEnhanceLevel === lv,
                current: (selectedItem.enhanceLevel || 0) === lv,
                locked: lv <= (selectedItem.enhanceLevel || 0)
              }"
              @click="targetEnhanceLevel = lv">
              +{{ lv }}
            </button>
          </div>
        </div>

        <!-- 强化信息 -->
        <div class="enhance-info-panel">
          <div class="info-row">
            <span class="info-label">成功率</span>
            <span class="info-value" :class="successRateClass">{{ getEnhanceSuccessRate(targetEnhanceLevel) }}%</span>
          </div>
          <div class="info-row">
            <span class="info-label">强化费用</span>
            <span class="info-value">{{ getEnhanceCost(targetEnhanceLevel) }} 💰</span>
          </div>
          <div class="info-row">
            <span class="info-label">保护符</span>
            <span class="info-value">{{ hasProtection ? '有 (失败不掉级)' : '无' }}</span>
          </div>
        </div>

        <button class="enhance-btn" :disabled="isEnhancing || targetEnhanceLevel <= (selectedItem.enhanceLevel || 0)"
          @click="startEnhance">
          {{ isEnhancing ? '强化中...' : '🚀 开始强化' }}
        </button>
      </div>
      <div v-else class="no-selection">
        <span>👆 请先选择要强化的装备</span>
      </div>
    </div>

    <!-- ========== Tab 2: 增幅 ========== -->
    <div v-if="activeTab === 'amplify'" class="tab-content">
      <div v-if="selectedItem" class="amplify-content">
        <div class="selected-item-display">
          <span class="display-icon">{{ selectedItem.icon }}</span>
          <div class="display-info">
            <span class="display-name">{{ selectedItem.name }}</span>
            <span class="display-level">+{{ selectedItem.enhanceLevel || 0 }}</span>
          </div>
        </div>

        <!-- 红字属性区 -->
        <div class="amplify-stats">
          <div class="section-title">🔥 增幅属性 (红字)</div>
          <div class="red-stats-grid">
            <div v-for="stat in amplifyStats" :key="stat.key"
              class="red-stat-card"
              :class="{ enhanced: selectedItem.amplifyStats?.[stat.key] }">
              <span class="red-stat-name">{{ stat.name }}</span>
              <span class="red-stat-value" v-if="selectedItem.amplifyStats?.[stat.key]">
                +{{ selectedItem.amplifyStats[stat.key] }}
              </span>
              <span class="red-stat-value empty" v-else>—</span>
              <button class="add-red-btn" @click="openAmplifyModal(stat)">+ 增幅</button>
            </div>
          </div>
        </div>

        <!-- 增幅说明 -->
        <div class="amplify-guide">
          <div class="guide-title">📖 增幅说明</div>
          <ul>
            <li>增幅可为主装备附加额外红字属性</li>
            <li>增幅需要消耗增幅券和灵石</li>
            <li>增幅失败不扣除材料，但会消耗增幅券</li>
            <li>每次增幅随机提升1~10点红字属性</li>
          </ul>
        </div>
      </div>
      <div v-else class="no-selection">
        <span>👆 请先选择要增幅的装备</span>
      </div>

      <!-- 增幅弹窗 -->
      <div v-if="showAmplifyModal" class="modal-overlay" @click.self="showAmplifyModal = false">
        <div class="modal-content">
          <h3>🔥 增幅 {{ amplifyingStat?.name }}</h3>
          <div class="modal-info">
            <span>消耗: 增幅券 x1 + 灵石 x{{ amplifyCost }}</span>
          </div>
          <div class="modal-actions">
            <button class="modal-confirm" @click="confirmAmplify">确认增幅</button>
            <button class="modal-cancel" @click="showAmplifyModal = false">取消</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== Tab 3: 打孔 ========== -->
    <div v-if="activeTab === 'socket'" class="tab-content">
      <div v-if="selectedItem" class="socket-content">
        <div class="selected-item-display">
          <span class="display-icon">{{ selectedItem.icon }}</span>
          <div class="display-info">
            <span class="display-name">{{ selectedItem.name }}</span>
            <span class="display-level">{{ selectedItem.socketCount || 0 }}/{{ maxSockets }} 孔位</span>
          </div>
        </div>

        <!-- 徽章孔位展示 -->
        <div class="socket-grid">
          <div v-for="i in maxSockets" :key="i"
            class="socket-slot"
            :class="{
              filled: selectedItem.sockets && selectedItem.sockets[i - 1],
              empty: !selectedItem.sockets || !selectedItem.sockets[i - 1]
            }">
            <span v-if="selectedItem.sockets && selectedItem.sockets[i - 1]" class="socket-gem">
              {{ selectedItem.sockets[i - 1].icon }}
            </span>
            <span v-else class="socket-empty">+{{ i }}</span>
          </div>
        </div>

        <!-- 打孔按钮 -->
        <div class="socket-actions">
          <button v-if="(selectedItem.socketCount || 0) < maxSockets"
            class="socket-btn" :disabled="!canSocket"
            @click="openSocketModal">
            🔨 打孔 (💰 {{ socketCost }})
          </button>
          <button v-if="(selectedItem.socketCount || 0) > 0"
            class="socket-btn embed" @click="openEmbedModal">
            💎 镶嵌徽章
          </button>
        </div>

        <!-- 打孔说明 -->
        <div class="socket-guide">
          <div class="guide-title">📖 打孔说明</div>
          <ul>
            <li>每件装备最多{{ maxSockets }}个孔位</li>
            <li>打孔需要消耗打孔符和灵石</li>
            <li>可镶嵌对应等级的徽章提升属性</li>
            <li>可镶嵌/取下徽章不损坏装备</li>
          </ul>
        </div>
      </div>
      <div v-else class="no-selection">
        <span>👆 请先选择要打孔的装备</span>
      </div>

      <!-- 打孔弹窗 -->
      <div v-if="showSocketModal" class="modal-overlay" @click.self="showSocketModal = false">
        <div class="modal-content">
          <h3>🔨 打孔</h3>
          <div class="modal-info">
            <span>消耗: 打孔符 x1 + 灵石 x{{ socketCost }}</span>
          </div>
          <div class="modal-actions">
            <button class="modal-confirm" @click="confirmSocket">确认打孔</button>
            <button class="modal-cancel" @click="showSocketModal = false">取消</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== Tab 4: 继承 ========== -->
    <div v-if="activeTab === 'inherit'" class="tab-content">
      <div class="inherit-content">
        <div class="inherit-slots">
          <!-- 源装备 -->
          <div class="inherit-slot source">
            <div class="slot-title">📤 源装备 (材料)</div>
            <div v-if="sourceItem" class="selected-source" @click="sourceItem = null">
              <span>{{ sourceItem.icon }}</span>
              <span>{{ sourceItem.name }}</span>
              <span>+{{ sourceItem.enhanceLevel || 0 }}</span>
            </div>
            <div v-else class="empty-source" @click="sourceItem = selectedItem">
              <span>点击选中装备作为材料</span>
            </div>
          </div>

          <!-- 目标装备 -->
          <div class="inherit-arrow">→</div>
          <div class="inherit-slot target">
            <div class="slot-title">📥 目标装备 (继承)</div>
            <div v-if="targetItem" class="selected-source" @click="targetItem = null">
              <span>{{ targetItem.icon }}</span>
              <span>{{ targetItem.name }}</span>
              <span>+{{ targetItem.enhanceLevel || 0 }}</span>
            </div>
            <div v-else class="empty-source" @click="targetItem = selectedItem">
              <span>点击选择目标装备</span>
            </div>
          </div>
        </div>

        <!-- 继承信息 -->
        <div class="inherit-info-panel">
          <div class="info-row">
            <span class="info-label">继承消耗</span>
            <span class="info-value">{{ inheritCost }} 💰</span>
          </div>
          <div class="info-row">
            <span class="info-label">继承内容</span>
            <span class="info-value">强化等级{{ sourceItem ? `+${sourceItem.enhanceLevel || 0}` : '—'}}</span>
          </div>
        </div>

        <button class="inherit-btn" :disabled="!canInherit || isInheriting"
          @click="startInherit">
          {{ isInheriting ? '继承中...' : '🔄 开始继承' }}
        </button>

        <!-- 继承说明 -->
        <div class="inherit-guide">
          <div class="guide-title">📖 继承说明</div>
          <ul>
            <li>继承可将源装备的强化等级转移到目标装备</li>
            <li>继承后源装备强化等级归零</li>
            <li>仅同部位装备可进行继承</li>
            <li>继承不继承增幅属性和打孔</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- ========== 强化结果动画 ========== -->
    <Transition name="result-anim">
      <div v-if="showResult" class="result-overlay" :class="resultType">
        <div class="result-effect">
          <div v-if="resultType === 'success'" class="effect-success">
            <div class="sparkle sparkle-1">✨</div>
            <div class="sparkle sparkle-2">✨</div>
            <div class="sparkle sparkle-3">✨</div>
            <span class="result-text">{{ resultMessage || '强化成功！' }}</span>
            <span class="result-level">+{{ resultLevel }}</span>
          </div>
          <div v-if="resultType === 'fail'" class="effect-fail">
            <div class="shake shake-1">💥</div>
            <span class="result-text fail-text">强化失败！</span>
            <span v-if="hasProtection" class="protection-note">保护符生效，装备安全</span>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePlayerStore } from '../stores/player'
import { equipmentApi } from '../api/index.js'

const playerStore = usePlayerStore()
const USER_ID = 1 // 模拟用户ID，实际应从store获取

const activeTab = ref('enhance')
const tabs = [
  { id: 'enhance', name: '强化', icon: '⬆️' },
  { id: 'amplify', name: '增幅', icon: '🔥' },
  { id: 'socket', name: '打孔', icon: '💎' },
  { id: 'inherit', name: '继承', icon: '🔄' }
]

// 玩家资源
const playerResources = ref({ spiritStones: 0, refineStones: 0, augmentTickets: 0 })

// 装备数据（从API加载）
const equippableItems = ref([])
const selectedItem = ref(null)
const sourceItem = ref(null)
const targetItem = ref(null)
const targetEnhanceLevel = ref(1)
const isEnhancing = ref(false)
const isInheriting = ref(false)
const hasProtection = ref(false)
const maxSockets = ref(4)
const socketCost = ref(500)

// 增幅相关
const showAmplifyModal = ref(false)
const showSocketModal = ref(false)
const amplifyingStat = ref(null)
const amplifyCost = ref(1000)

// 强化结果
const showResult = ref(false)
const resultType = ref('')
const resultLevel = ref(0)
const resultMessage = ref('')

// 加载装备列表和玩家资源
async function loadData() {
  try {
    const [equipRes, playerRes] = await Promise.all([
      equipmentApi.get(USER_ID),
      equipmentApi.getPlayer(USER_ID)
    ])
    if (equipRes.data?.equipment) {
      // 转换后端数据结构到前端格式
      equippableItems.value = equipRes.data.equipment.map(e => ({
        id: e.id,
        icon: e.icon || '📦',
        name: e.name,
        rarity: e.rarity || 1,
        enhanceLevel: e.refineLevel || 0,
        equipped: e.equipped || false,
        amplifyStats: e.augmentStats || {},
        sockets: (e.sockets || []).map(s => s ? { icon: '💠' } : null),
        socketCount: (e.sockets || []).filter(s => s !== null).length,
        baseAttack: e.baseAttack || e.attack || 0,
        baseDef: e.baseDef || e.defense || 0,
        baseHp: e.baseHp || e.hp || 0,
        type: e.type,
      }))
    }
    if (playerRes.data?.player) {
      playerResources.value = {
        spiritStones: playerRes.data.player.spiritStones || 0,
        refineStones: playerRes.data.player.refineStones || 0,
        augmentTickets: playerRes.data.player.augmentTickets || 0,
      }
    }
  } catch (e) {
    console.error('加载装备数据失败:', e)
  }
}

onMounted(loadData)

const amplifyStats = [
  { key: 'attack', name: '攻击', bonusType: 'atkBonus' },
  { key: 'defense', name: '防御', bonusType: 'defBonus' },
  { key: 'hp', name: '生命', bonusType: 'hpBonus' },
  { key: 'crit', name: '暴击', bonusType: 'critBonus' },
  { key: 'speed', name: '速度', bonusType: 'speedBonus' }
]

const inheritCost = computed(() => {
  if (!sourceItem.value) return 0
  return Math.max(10000, (sourceItem.value.enhanceLevel || 0) * 500)
})

const canInherit = computed(() => {
  return sourceItem.value && targetItem.value &&
    sourceItem.value.id !== targetItem.value.id &&
    sourceItem.value.enhanceLevel > 0
})

const canSocket = computed(() => {
  return selectedItem.value && (selectedItem.value.socketCount || 0) < maxSockets.value
})

function selectItem(item) {
  selectedItem.value = item
  targetEnhanceLevel.value = Math.min((item.enhanceLevel || 0) + 1, 15)
  if (activeTab.value === 'inherit') {
    if (!targetItem.value) targetItem.value = item
  }
}

function getRarityColor(rarity) {
  const colors = { 1: '#9ca3af', 2: '#34d399', 3: '#60a5fa', 4: '#f59e0b', 5: '#f43f5e' }
  return colors[rarity] || '#9ca3af'
}

function getEnhanceSuccessRate(targetLevel) {
  // 对应后端 REFINE_SUCCESS_RATES
  const rates = { 0:100,1:100,2:100,3:80,4:80,5:80,6:80,7:60,8:60,9:60,10:40,11:40,12:40,13:20,14:20,15:20 }
  return rates[targetLevel] || 20
}

function getEnhanceCost(targetLevel) {
  // 基础500 * 1.5^level
  return Math.floor(500 * Math.pow(1.5, targetLevel))
}

const successRateClass = computed(() => {
  const rate = getEnhanceSuccessRate(targetEnhanceLevel.value)
  if (rate >= 70) return 'rate-high'
  if (rate >= 40) return 'rate-mid'
  return 'rate-low'
})

async function startEnhance() {
  if (!selectedItem.value || isEnhancing.value) return
  isEnhancing.value = true
  resultMessage.value = ''

  try {
    const res = await equipmentApi.refine(USER_ID, selectedItem.value.id)
    const data = res.data

    resultType.value = data.success ? 'success' : 'fail'
    resultLevel.value = data.level || targetEnhanceLevel.value
    resultMessage.value = data.message || ''
    showResult.value = true

    if (data.success) {
      // 更新本地装备数据
      const item = equippableItems.value.find(e => e.id === selectedItem.value.id)
      if (item) {
        item.enhanceLevel = data.level
        if (data.newStats) {
          item.baseAttack = data.newStats.attack || item.baseAttack
          item.baseDef = data.newStats.defense || item.baseDef
        }
      }
    }

    // 更新玩家资源
    if (data.remainingStones !== undefined) {
      playerResources.value.spiritStones = data.remainingStones
    }
    if (data.remainingRefineStones !== undefined) {
      playerResources.value.refineStones = data.remainingRefineStones
    }
  } catch (e) {
    resultType.value = 'fail'
    resultMessage.value = '网络错误'
    showResult.value = true
  }

  setTimeout(() => {
    showResult.value = false
    isEnhancing.value = false
  }, 3000)
}

function openAmplifyModal(stat) {
  amplifyingStat.value = stat
  showAmplifyModal.value = true
}

async function confirmAmplify() {
  if (!selectedItem.value || !amplifyingStat.value) return
  try {
    const res = await equipmentApi.augment(USER_ID, selectedItem.value.id)
    const data = res.data
    if (data.success && data.newAugment) {
      // 更新增幅属性（使用后端返回的实际stat和total）
      if (!selectedItem.value.augmentStats) selectedItem.value.augmentStats = {}
      // 将后端stat key (atkBonus/defBonus/hpBonus) 映射到前端key (attack/defense/hp)
      const statKeyMap = { atkBonus: 'attack', defBonus: 'defense', hpBonus: 'hp', critBonus: 'crit', speedBonus: 'speed' }
      const frontendKey = statKeyMap[data.newAugment.stat] || data.newAugment.stat
      selectedItem.value.augmentStats[frontendKey] = data.newAugment.total[data.newAugment.stat] || 0
    }
    alert(data.message || (data.success ? '增幅成功！' : '增幅失败'))
  } catch (e) {
    alert('增幅请求失败')
  }
  showAmplifyModal.value = false
}

function openSocketModal() {
  showSocketModal.value = true
}

async function confirmSocket() {
  if (!selectedItem.value) return
  try {
    const res = await equipmentApi.socketAdd(USER_ID, selectedItem.value.id)
    const data = res.data
    if (data.success) {
      // 更新孔位
      if (!selectedItem.value.sockets) selectedItem.value.sockets = []
      selectedItem.value.sockets.push(null)
      selectedItem.value.socketCount = (selectedItem.value.socketCount || 0) + 1
    }
    alert(data.message || (data.success ? '打孔成功！' : '打孔失败'))
  } catch (e) {
    alert('打孔请求失败')
  }
  showSocketModal.value = false
}

function openEmbedModal() {
  // 打开镶嵌面板（简化版：自动用攻击宝石填充第一个空孔）
  if (!selectedItem.value || !selectedItem.value.sockets) return
  const emptyIdx = selectedItem.value.sockets.findIndex(s => s === null)
  if (emptyIdx >= 0) {
    equipmentApi.socketInlay(USER_ID, selectedItem.value.id, 'attack_gem', emptyIdx).catch(() => {})
      .then(res => {
        if (res.data.success) {
          selectedItem.value.sockets[emptyIdx] = { icon: '💠' }
        }
      })
      .catch(() => {})
  }
}

async function startInherit() {
  if (!canInherit.value || isInheriting.value) return
  isInheriting.value = true
  try {
    const res = await equipmentApi.inherit(USER_ID, sourceItem.value.id, targetItem.value.id)
    const data = res.data
    if (data.success) {
      const oldLevel = targetItem.value.enhanceLevel
      targetItem.value.enhanceLevel = sourceItem.value.enhanceLevel
      sourceItem.value.enhanceLevel = 0
      alert(`继承成功！强化等级 ${oldLevel} → +${targetItem.value.enhanceLevel}`)
    } else {
      alert(data.message || '继承失败')
    }
  } catch (e) {
    alert('继承请求失败')
  }
  isInheriting.value = false
}
</script>

<style scoped>
.equipment-enhance-panel {
  padding: 20px;
  min-height: 100vh;
  background: linear-gradient(135deg, rgba(20, 10, 5, 0.90) 0%, rgba(40, 15, 5, 0.92) 100%), url('@/assets/images/bg-forge-shop-new.png') center/cover no-repeat;
  box-sizing: border-box;
}
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.panel-header h2 { color: #f093fb; font-size: 22px; margin: 0; }
.lingshi-display { background: rgba(255,255,255,0.05); padding: 5px 12px; border-radius: 15px; font-size: 13px; }

.tab-bar { display: flex; gap: 8px; margin-bottom: 15px; flex-wrap: wrap; }
.tab-btn { padding: 8px 16px; background: transparent; border: 1px solid rgba(102,126,234,0.3); color: rgba(255,255,255,0.6); border-radius: 20px; cursor: pointer; font-size: 13px; transition: all 0.2s; }
.tab-btn.active { background: linear-gradient(90deg,#667eea,#764ba2); border-color: transparent; color: #fff; }

/* 装备选择器 */
.equip-selector { margin-bottom: 15px; }
.selector-label { font-size: 12px; opacity: 0.5; margin-bottom: 8px; color: rgba(255,255,255,0.5); }
.equip-list { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 5px; }
.equip-item { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 10px; background: rgba(255,255,255,0.04); border: 2px solid transparent; border-radius: 12px; cursor: pointer; min-width: 80px; transition: all 0.2s; position: relative; }
.equip-item.selected { border-color: var(--rarity-color, #667eea); background: rgba(255,255,255,0.08); }
.equip-item:hover { background: rgba(255,255,255,0.08); }
.equip-item .item-icon { font-size: 30px; }
.equip-item .item-name { font-size: 10px; color: rgba(255,255,255,0.8); text-align: center; max-width: 70px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.equip-item .item-level { font-size: 11px; color: #f093fb; font-weight: bold; }
.equipped-badge { position: absolute; top: -5px; right: -5px; background: #4ade80; color: #000; font-size: 8px; padding: 1px 4px; border-radius: 8px; }
.empty-equip { width: 100%; text-align: center; padding: 20px; color: rgba(255,255,255,0.3); font-size: 13px; }

/* Tab内容 */
.tab-content { min-height: 300px; }
.no-selection { display: flex; align-items: center; justify-content: center; height: 200px; color: rgba(255,255,255,0.3); font-size: 14px; }

/* 选中装备展示 */
.selected-item-display { display: flex; align-items: center; gap: 12px; padding: 12px 15px; background: rgba(255,255,255,0.05); border-radius: 12px; margin-bottom: 15px; }
.display-icon { font-size: 40px; }
.display-info { display: flex; flex-direction: column; }
.display-name { color: #fff; font-weight: bold; }
.display-level { color: #f093fb; font-size: 13px; }

/* 强化滑动选择 */
.enhance-slider-section { margin-bottom: 15px; }
.slider-label { font-size: 12px; color: rgba(255,255,255,0.5); margin-bottom: 8px; }
.level-slider { display: flex; gap: 5px; flex-wrap: wrap; }
.level-btn { width: 42px; height: 36px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: rgba(255,255,255,0.6); cursor: pointer; font-size: 11px; transition: all 0.2s; }
.level-btn.current { background: rgba(102,126,234,0.3); border-color: #667eea; color: #fff; }
.level-btn.active { background: linear-gradient(135deg,#f093fb,#764ba2); border-color: transparent; color: #fff; font-weight: bold; }
.level-btn.locked { opacity: 0.3; cursor: not-allowed; }

/* 强化信息面板 */
.enhance-info-panel { background: rgba(255,255,255,0.04); border-radius: 12px; padding: 12px 15px; margin-bottom: 15px; }
.info-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; }
.info-label { color: rgba(255,255,255,0.6); font-size: 13px; }
.info-value { color: #fff; font-weight: bold; }
.info-value.rate-high { color: #4ade80; }
.info-value.rate-mid { color: #ffd93d; }
.info-value.rate-low { color: #ff6b6b; }

.enhance-btn { width: 100%; padding: 14px; background: linear-gradient(135deg,#667eea,#764ba2); border: none; border-radius: 12px; color: #fff; font-size: 15px; font-weight: bold; cursor: pointer; }
.enhance-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* 增幅 */
.red-stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 15px; }
.red-stat-card { padding: 12px; background: rgba(255,255,255,0.04); border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); display: flex; flex-direction: column; gap: 5px; }
.red-stat-card.enhanced { border-color: rgba(244,63,94,0.4); }
.red-stat-name { font-size: 12px; color: rgba(255,255,255,0.6); }
.red-stat-value { font-size: 18px; color: #f43f5e; font-weight: bold; }
.red-stat-value.empty { color: rgba(255,255,255,0.2); font-size: 14px; }
.add-red-btn { padding: 6px; background: rgba(244,63,94,0.2); border: 1px solid rgba(244,63,94,0.4); border-radius: 8px; color: #f43f5e; font-size: 11px; cursor: pointer; }
.amplify-guide, .socket-guide, .inherit-guide { margin-top: 15px; }
.guide-title { color: rgba(255,255,255,0.6); font-size: 12px; margin-bottom: 8px; }
.amplify-guide ul, .socket-guide ul, .inherit-guide ul { margin: 0; padding-left: 18px; font-size: 11px; color: rgba(255,255,255,0.4); line-height: 1.8; }

/* 打孔 */
.socket-grid { display: flex; gap: 12px; margin-bottom: 15px; justify-content: center; }
.socket-slot { width: 60px; height: 60px; border: 2px dashed rgba(255,255,255,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.socket-slot.filled { border-style: solid; border-color: #60a5fa; background: rgba(96,165,250,0.1); }
.socket-slot .socket-gem { font-size: 28px; }
.socket-slot .socket-empty { color: rgba(255,255,255,0.2); font-size: 14px; }
.socket-actions { display: flex; gap: 10px; margin-bottom: 10px; }
.socket-btn { flex: 1; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(102,126,234,0.3); border-radius: 12px; color: #fff; cursor: pointer; font-size: 13px; transition: all 0.2s; }
.socket-btn:hover { background: rgba(102,126,234,0.2); border-color: #667eea; }
.socket-btn.embed { border-color: rgba(244,63,94,0.3); }
.socket-btn.embed:hover { background: rgba(244,63,94,0.2); }

/* 继承 */
.inherit-content { }
.inherit-slots { display: flex; align-items: center; gap: 15px; margin-bottom: 15px; }
.inherit-slot { flex: 1; }
.slot-title { font-size: 12px; color: rgba(255,255,255,0.5); margin-bottom: 8px; }
.selected-source { display: flex; align-items: center; gap: 8px; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 12px; cursor: pointer; border: 1px solid rgba(102,126,234,0.3); }
.selected-source:hover { border-color: rgba(255,107,107,0.5); }
.empty-source { padding: 20px; background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.15); border-radius: 12px; text-align: center; color: rgba(255,255,255,0.3); font-size: 12px; cursor: pointer; }
.inherit-arrow { font-size: 24px; color: rgba(255,255,255,0.3); }
.inherit-btn { width: 100%; padding: 14px; background: linear-gradient(135deg,#f093fb,#764ba2); border: none; border-radius: 12px; color: #fff; font-size: 15px; font-weight: bold; cursor: pointer; margin-top: 10px; }
.inherit-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* 弹窗 */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { background: rgba(30,30,60,0.95); border: 1px solid rgba(102,126,234,0.3); border-radius: 16px; padding: 25px; width: 300px; }
.modal-content h3 { margin: 0 0 15px 0; color: #f093fb; }
.modal-info { margin-bottom: 15px; font-size: 13px; color: rgba(255,255,255,0.7); }
.modal-actions { display: flex; gap: 10px; }
.modal-confirm { flex: 1; padding: 10px; background: linear-gradient(135deg,#667eea,#764ba2); border: none; border-radius: 10px; color: #fff; cursor: pointer; }
.modal-cancel { flex: 1; padding: 10px; background: rgba(255,255,255,0.1); border: none; border-radius: 10px; color: rgba(255,255,255,0.7); cursor: pointer; }

/* 强化结果动画 */
.result-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 2000; }
.result-overlay.success { background: rgba(0,50,0,0.8); }
.result-overlay.fail { background: rgba(50,0,0,0.8); }
.result-effect { display: flex; flex-direction: column; align-items: center; justify-content: center; }
.effect-success { display: flex; flex-direction: column; align-items: center; animation: popIn 0.4s ease; }
.sparkle { position: absolute; font-size: 30px; animation: float 1.5s ease-in-out infinite; }
.sparkle-1 { top: -100px; left: -80px; animation-delay: 0s; }
.sparkle-2 { top: -80px; right: -90px; animation-delay: 0.3s; }
.sparkle-3 { bottom: -90px; left: 50%; animation-delay: 0.6s; }
.result-text { font-size: 36px; font-weight: bold; color: #4ade80; text-shadow: 0 0 30px #4ade80; }
.result-text.fail-text { color: #ff6b6b; text-shadow: 0 0 30px #ff6b6b; }
.result-level { font-size: 48px; color: #ffd93d; font-weight: bold; text-shadow: 0 0 20px #ffd93d; animation: pulse 0.6s ease infinite; }
.protection-note { font-size: 14px; color: rgba(255,255,255,0.6); margin-top: 10px; }
.shake { font-size: 50px; animation: shake 0.5s ease; }

@keyframes popIn { from { transform: scale(0.3); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.1); } }
@keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
@keyframes shake { 0%,100% { transform: translateX(0); } 20%,60% { transform: translateX(-8px); } 40%,80% { transform: translateX(8px); } }

/* Transition */
.result-anim-enter-active { animation: popIn 0.4s ease; }
.result-anim-leave-active { animation: popIn 0.3s ease reverse; }
</style>
