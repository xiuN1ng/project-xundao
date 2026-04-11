<template>
  <div class="fishing-panel">
    <!-- 顶部标题栏 -->
    <div class="panel-header">
      <h2>🎣 悠闲钓鱼</h2>
      <div class="player-stats" v-if="playerStore.player">
        <span class="stat-item">💰 {{ playerStore.player.lingshi ?? playerStore.player.player?.lingshi ?? 0 }} 灵石</span>
        <span class="stat-item">🎣 等级 {{ stats.rodLevel }}</span>
      </div>
    </div>

    <!-- 标签页 -->
    <div class="fishing-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="{ active: activeTab === tab.id }"
        @click="switchTab(tab.id)"
      >
        {{ tab.icon }} {{ tab.name }}
      </button>
    </div>

    <!-- 钓鱼区域 -->
    <div v-if="activeTab === 'fish'" class="tab-content">
      <!-- 鱼塘选择 -->
      <div class="pond-selector">
        <div
          v-for="pond in ponds"
          :key="pond.id"
          class="pond-card"
          :class="{
            selected: selectedPond?.id === pond.id,
            locked: (playerStore.player?.level ?? 1) < pond.min_level
          }"
          @click="selectPond(pond)"
        >
          <span class="pond-icon">{{ pond.icon }}</span>
          <div class="pond-info">
            <span class="pond-name">{{ pond.name }}</span>
            <span class="pond-level">Lv.{{ pond.min_level }}</span>
            <span class="pond-cost" v-if="pond.cost > 0">💰 {{ pond.cost }}灵石</span>
            <span class="pond-cost free" v-else>免费</span>
          </div>
          <span class="pond-rare">{{ Math.round(pond.rare_chance * 100) }}%稀有</span>
        </div>
      </div>

      <!-- 钓鱼动画区 -->
      <div class="fishing-area">
        <div class="pond-scene" :class="{ fishing: isFishing, hasBite: hasBite }">
          <div class="water-surface"></div>
          <div class="fish-rod" :class="{ casting: isFishing && !hasBite, reeling: isReeling }">🎣</div>
          <div v-if="hasBite" class="bite-indicator">
            <span class="bite-text">🐟 咬钩了！</span>
            <span class="bite-sub">快收竿！</span>
          </div>
          <div v-if="lastCatch" class="catch-result">
            <span class="catch-icon">{{ lastCatch.icon }}</span>
            <span class="catch-name">{{ lastCatch.name }}</span>
            <span class="catch-info">{{ lastCatch.weight }}kg | 💰{{ lastCatch.sellPrice }}</span>
            <span class="catch-rarity" :class="lastCatch.rarity">{{ getRarityLabel(lastCatch.rarity) }}</span>
          </div>
          <div v-if="isFishing && !hasBite && countdown > 0" class="countdown">
            <span class="countdown-number">{{ countdown }}</span>
            <span class="countdown-text">秒后咬钩</span>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="fishing-actions">
          <button
            class="action-btn cast-btn"
            :disabled="isFishing || (selectedPond?.cost ?? 0) > (playerStore.player?.lingshi ?? 0)"
            @click="doCast"
          >
            {{ isFishing ? (hasBite ? '收竿！' : '钓鱼中...') : '抛竿' }}
          </button>
          <button
            v-if="isFishing && hasBite"
            class="action-btn reel-btn"
            @click="doReel"
          >
            🎯 收竿！
          </button>
          <button
            v-if="isFishing"
            class="action-btn cancel-btn"
            @click="cancelCast"
          >
            放弃
          </button>
        </div>

        <!-- 钓鱼结果提示 -->
        <div v-if="message" class="fishing-message" :class="messageType">
          {{ message }}
        </div>
      </div>
    </div>

    <!-- 鱼获库存 -->
    <div v-if="activeTab === 'inventory'" class="tab-content">
      <div class="inventory-header">
        <span>共 {{ inventory.length }} 种鱼</span>
        <button class="sell-all-btn" @click="sellAll" :disabled="inventory.length === 0">一键出售</button>
      </div>
      <div class="fish-inventory">
        <div v-for="fish in inventory" :key="fish.fish_id" class="inventory-item">
          <div class="fish-icon-area">
            <span class="fish-icon">{{ getFishIcon(fish.fish_name) }}</span>
            <span class="fish-rarity" :class="fish.rarity">{{ getRarityLabel(fish.rarity) }}</span>
          </div>
          <div class="fish-details">
            <span class="fish-name">{{ fish.fish_name }}</span>
            <span class="fish-meta">x{{ fish.count }} | 均重{{ fish.weight }}kg</span>
            <span class="fish-price">💰 {{ fish.sell_price }}灵石/条</span>
          </div>
          <div class="fish-actions">
            <input type="number" v-model="sellCounts[fish.fish_id]" :max="fish.count" min="1" class="sell-input" />
            <button class="sell-btn" @click="sellFish(fish)">出售</button>
          </div>
        </div>
        <div v-if="inventory.length === 0" class="empty-state">
          <span>🎣 还没有钓到鱼，快去钓鱼吧！</span>
        </div>
      </div>
    </div>

    <!-- 钓鱼历史 -->
    <div v-if="activeTab === 'history'" class="tab-content">
      <div class="history-list">
        <div v-for="(record, idx) in history" :key="idx" class="history-item">
          <span class="history-icon">{{ getFishIcon(record.fish_name) }}</span>
          <span class="history-name">{{ record.fish_name }}</span>
          <span class="history-rarity" :class="record.rarity">{{ getRarityLabel(record.rarity) }}</span>
          <span class="history-price">💰 {{ record.sell_price }}</span>
          <span class="history-date">{{ formatDate(record.caught_at) }}</span>
        </div>
        <div v-if="history.length === 0" class="empty-state">
          <span>📜 还没有钓鱼记录</span>
        </div>
      </div>
    </div>

    <!-- 渔具升级 -->
    <div v-if="activeTab === 'upgrade'" class="tab-content">
      <div class="rod-info">
        <div class="rod-display">
          <span class="rod-icon">🎣</span>
          <span class="rod-level">Lv.{{ stats.rodLevel }}</span>
        </div>
        <div class="rod-stats">
          <span>🐟 总钓获: {{ stats.totalCatches }}</span>
          <span>⭐ 总积分: {{ stats.totalPoints }}</span>
          <span>🏆 最大鱼获: {{ stats.biggestCatch || '暂无' }}</span>
        </div>
      </div>
      <div class="upgrade-section">
        <h3>🎣 渔具升级</h3>
        <p class="upgrade-hint">升级渔具可提高钓鱼成功率和稀有鱼概率</p>
        <div class="upgrade-cost">
          <span>升级费用: 💰 {{ getUpgradeCost() }} 灵石</span>
        </div>
        <button
          class="upgrade-btn"
          @click="upgradeRod"
          :disabled="(playerStore.player?.lingshi ?? 0) < getUpgradeCost()"
        >
          升级渔具
        </button>
      </div>
    </div>

    <!-- 鱼种图鉴 -->
    <div v-if="activeTab === 'types'" class="tab-content">
      <div class="fish-types-grid">
        <div
          v-for="fish in fishTypes"
          :key="fish.id"
          class="fish-type-card"
          :class="fish.rarity"
        >
          <span class="ft-icon">{{ fish.icon || '🐟' }}</span>
          <span class="ft-name">{{ fish.name }}</span>
          <span class="ft-rarity">{{ getRarityLabel(fish.rarity) }}</span>
          <span class="ft-level">需要Lv.{{ fish.min_level }}</span>
          <span class="ft-price">💰 {{ fish.sell_price }}</span>
          <span class="ft-desc">{{ fish.description }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { usePlayerStore } from '../stores/player'

const playerStore = usePlayerStore()

// ─── Constants ───────────────────────────────────────────────────────────────
const tabs = [
  { id: 'fish', name: '钓鱼', icon: '🎣' },
  { id: 'inventory', name: '鱼获', icon: '📦' },
  { id: 'history', name: '历史', icon: '📜' },
  { id: 'upgrade', name: '渔具', icon: '⚙️' },
  { id: 'types', name: '图鉴', icon: '📖' },
]

const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary']

// ─── State ────────────────────────────────────────────────────────────────────
const activeTab = ref('fish')
const ponds = ref([])
const fishTypes = ref([])
const inventory = ref([])
const history = ref([])
const stats = reactive({ totalCatches: 0, totalPoints: 0, rodLevel: 1, biggestCatch: '' })
const selectedPond = ref(null)
const isFishing = ref(false)
const hasBite = ref(false)
const isReeling = ref(false)
const countdown = ref(0)
const lastCatch = ref(null)
const message = ref('')
const messageType = ref('info')
const sellCounts = reactive({})

let countdownTimer = null

// ─── API Helpers ──────────────────────────────────────────────────────────────
const API = '/api'

async function apiGet(path) {
  const headers = { 'Content-Type': 'application/json' }
  const token = localStorage.getItem('token')
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API}${path}`, { headers })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`)
  return data
}

async function apiPost(path, body = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const token = localStorage.getItem('token')
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`)
  return data
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getPlayerId() {
  return playerStore.player?.player?.id || playerStore.player?.id || 1
}

function getLingshi() {
  return playerStore.player?.lingshi ?? playerStore.player?.player?.lingshi ?? 0
}

function showMsg(text, type = 'info', duration = 3000) {
  message.value = text
  messageType.value = type
  if (duration > 0) setTimeout(() => { message.value = '' }, duration)
}

function getRarityLabel(r) {
  const map = { common: '普通', rare: '稀有', epic: '史诗', legendary: '传说' }
  return map[r] || r
}

function getFishIcon(name) {
  const iconMap = {
    '草鱼': '🐟', '鲤鱼': '🐟', '鲫鱼': '🐟', '鲢鱼': '🐟',
    '鳜鱼': '🐠', '鲈鱼': '🐟', '鳗鱼': '🐍', '鲳鱼': '🐟',
    '带鱼': '🐉', '石斑': '🦈', '金枪鱼': '🐟', '飞仙鱼': '✨',
    '锦鲤': '🐲', '巨型石斑': '🦈', '龙鱼': '🐉',
  }
  return iconMap[name] || '🐟'
}

function getUpgradeCost() {
  return stats.rodLevel * 500
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`
}

function selectPond(pond) {
  if ((playerStore.player?.level ?? 1) < pond.min_level) {
    showMsg(`需要等级 ${pond.min_level} 才能进入此鱼塘`, 'error')
    return
  }
  selectedPond.value = pond
}

// ─── Tab Switching ────────────────────────────────────────────────────────────
async function switchTab(tabId) {
  activeTab.value = tabId
  if (tabId === 'fish') {
    await loadPondsAndStats()
  } else if (tabId === 'inventory') {
    await loadInventory()
  } else if (tabId === 'history') {
    await loadHistory()
  } else if (tabId === 'types') {
    await loadFishTypes()
  }
}

// ─── Data Loading ────────────────────────────────────────────────────────────
async function loadFishingData() {
  try {
    const data = await apiGet('/fishing')
    ponds.value = data.ponds || []
    fishTypes.value = data.fishTypes || []
    Object.assign(stats, data.stats || {})
    if (ponds.value.length > 0 && !selectedPond.value) {
      selectedPond.value = ponds.value[0]
    }
  } catch (e) {
    console.error('加载钓鱼数据失败:', e)
    ponds.value = []
    fishTypes.value = []
  }
}

async function loadPondsAndStats() {
  await loadFishingData()
}

async function loadInventory() {
  try {
    const data = await apiGet('/fishing/inventory')
    inventory.value = data.inventory || []
    inventory.value.forEach(f => {
      if (sellCounts[f.fish_id] === undefined) sellCounts[f.fish_id] = 1
    })
  } catch (e) {
    console.error('加载鱼获失败:', e)
    inventory.value = []
  }
}

async function loadHistory() {
  try {
    const data = await apiGet('/fishing/history')
    history.value = data.recentRecords || []
  } catch (e) {
    console.error('加载历史失败:', e)
    history.value = []
  }
}

async function loadFishTypes() {
  try {
    const data = await apiGet('/fishing/types')
    fishTypes.value = data.fishTypes || []
  } catch (e) {
    console.error('加载鱼种失败:', e)
  }
}

// ─── Fishing Actions ─────────────────────────────────────────────────────────
async function doCast() {
  if (isFishing.value) return
  if (!selectedPond.value) {
    showMsg('请先选择一个鱼塘', 'error')
    return
  }
  const pond = selectedPond.value
  if (pond.cost > getLingshi()) {
    showMsg(`灵石不足，需要 ${pond.cost} 灵石`, 'error')
    return
  }

  try {
    const data = await apiPost('/fishing/cast', { player_id: getPlayerId(), pond_id: pond.id })
    if (data.waiting) {
      isFishing.value = true
      hasBite.value = false
      countdown.value = data.remainingSeconds
      startCountdown(data.remainingSeconds)
      showMsg(data.message, 'info')
    } else {
      showMsg(data.message || '抛竿失败', 'error')
    }
  } catch (e) {
    showMsg(e.message || '抛竿失败', 'error')
  }
}

async function doReel() {
  if (!isFishing.value) return
  isReeling.value = true
  try {
    const data = await apiPost('/fishing/reel', { player_id: getPlayerId() })
    clearCountdown()
    isFishing.value = false
    isReeling.value = false

    if (data.caught) {
      lastCatch.value = data.fish
      showMsg(data.message, 'success')
      stats.totalCatches++
      // Refresh inventory
      if (activeTab.value === 'inventory') await loadInventory()
      else if (activeTab.value === 'fish') await loadFishingData()
    } else {
      hasBite.value = false
      lastCatch.value = null
      showMsg(data.message || '鱼跑了...', 'error')
    }
  } catch (e) {
    clearCountdown()
    isFishing.value = false
    isReeling.value = false
    hasBite.value = false
    showMsg(e.message || '收竿失败', 'error')
  }
}

function cancelCast() {
  clearCountdown()
  isFishing.value = false
  hasBite.value = false
  countdown.value = 0
  showMsg('放弃了本次钓鱼', 'info')
}

// ─── Countdown ────────────────────────────────────────────────────────────────
function startCountdown(seconds) {
  clearCountdown()
  countdown.value = seconds
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearCountdown()
      hasBite.value = true
      isFishing.value = true
    }
  }, 1000)
}

function clearCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

// ─── Sell ─────────────────────────────────────────────────────────────────────
async function sellFish(fish) {
  const count = Math.min(sellCounts[fish.fish_id] || 1, fish.count)
  try {
    const data = await apiPost('/fishing/sell', { player_id: getPlayerId(), fish_id: fish.fish_id, count })
    showMsg(`出售成功，获得 ${data.earned} 灵石`, 'success')
    // Update player lingshi
    if (playerStore.player) {
      const current = getLingshi()
      if (playerStore.player.player) playerStore.player.player.lingshi = current + data.earned
      else playerStore.player.lingshi = current + data.earned
    }
    await loadInventory()
    await loadFishingData()
  } catch (e) {
    showMsg(e.message || '出售失败', 'error')
  }
}

async function sellAll() {
  try {
    for (const fish of inventory.value) {
      await apiPost('/fishing/sell', { player_id: getPlayerId(), fish_id: fish.fish_id, count: fish.count })
    }
    showMsg('全部出售成功！', 'success')
    if (playerStore.player) {
      await loadFishingData()
    }
    await loadInventory()
  } catch (e) {
    showMsg(e.message || '一键出售失败', 'error')
  }
}

// ─── Upgrade ───────────────────────────────────────────────────────────────────
async function upgradeRod() {
  const cost = getUpgradeCost()
  if (getLingshi() < cost) {
    showMsg('灵石不足', 'error')
    return
  }
  try {
    const data = await apiPost('/fishing/upgrade', { player_id: getPlayerId() })
    showMsg(`升级成功！渔具等级提升至 Lv.${data.newLevel}`, 'success')
    stats.rodLevel = data.newLevel
    // Update lingshi
    if (playerStore.player) {
      const current = getLingshi()
      if (playerStore.player.player) playerStore.player.player.lingshi = current - cost
      else playerStore.player.lingshi = current - cost
    }
  } catch (e) {
    showMsg(e.message || '升级失败', 'error')
  }
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(async () => {
  await loadFishingData()
})

onUnmounted(() => {
  clearCountdown()
})
</script>

<style scoped>
.fishing-panel {
  padding: 20px;
  min-height: 100vh;
  background: linear-gradient(135deg, rgba(10, 30, 60, 0.95), rgba(20, 60, 100, 0.9));
  box-sizing: border-box;
  color: #fff;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.panel-header h2 {
  color: #7dd3fc;
  font-size: 22px;
  margin: 0;
}

.player-stats {
  display: flex;
  gap: 15px;
}

.stat-item {
  background: rgba(255, 255, 255, 0.1);
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
}

.fishing-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.fishing-tabs button {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  color: #aaa;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.fishing-tabs button.active {
  background: linear-gradient(135deg, #0ea5e9, #6366f1);
  color: #fff;
  border-color: transparent;
}

.tab-content {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ─── Pond Selector ─── */
.pond-selector {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.pond-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.07);
  padding: 14px 16px;
  border-radius: 14px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.pond-card.selected {
  border-color: #0ea5e9;
  background: rgba(14, 165, 233, 0.15);
}

.pond-card.locked {
  opacity: 0.5;
  cursor: not-allowed;
}

.pond-icon {
  font-size: 36px;
}

.pond-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pond-name {
  font-weight: bold;
  color: #fff;
}

.pond-level, .pond-cost {
  font-size: 12px;
  color: #94a3b8;
}

.pond-cost.free {
  color: #4ade80;
}

.pond-rare {
  font-size: 12px;
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.1);
  padding: 3px 8px;
  border-radius: 10px;
}

/* ─── Fishing Area ─── */
.fishing-area {
  margin-bottom: 20px;
}

.pond-scene {
  height: 220px;
  background: linear-gradient(to bottom, #1e3a5f, #0c2340);
  border-radius: 20px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.1);
  transition: border-color 0.3s;
}

.pond-scene.hasBite {
  border-color: #fbbf24;
  animation: glow 0.5s infinite alternate;
}

@keyframes glow {
  from { box-shadow: 0 0 10px rgba(251, 191, 36, 0.3); }
  to { box-shadow: 0 0 25px rgba(251, 191, 36, 0.7); }
}

.water-surface {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60%;
  background: linear-gradient(to bottom, rgba(14, 165, 233, 0.2), rgba(14, 165, 233, 0.05));
  animation: wave 3s ease-in-out infinite;
}

@keyframes wave {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

.fish-rod {
  font-size: 56px;
  z-index: 2;
  transition: transform 0.3s;
}

.fish-rod.casting {
  animation: swing 1.2s ease-in-out infinite;
}

@keyframes swing {
  0%, 100% { transform: rotate(-15deg); }
  50% { transform: rotate(15deg); }
}

.bite-indicator {
  position: absolute;
  top: 30%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  animation: bounce 0.4s infinite alternate;
  z-index: 3;
}

@keyframes bounce {
  from { transform: translate(-50%, -50%) scale(1); }
  to { transform: translate(-50%, -55%) scale(1.1); }
}

.bite-text {
  display: block;
  font-size: 28px;
  font-weight: bold;
  color: #fbbf24;
  text-shadow: 0 2px 10px rgba(0,0,0,0.8);
}

.bite-sub {
  font-size: 14px;
  color: #fef3c7;
}

.countdown {
  position: absolute;
  top: 20%;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  z-index: 3;
}

.countdown-number {
  display: block;
  font-size: 48px;
  font-weight: bold;
  color: #7dd3fc;
  text-shadow: 0 2px 10px rgba(0,0,0,0.5);
}

.countdown-text {
  font-size: 13px;
  color: #94a3b8;
}

.catch-result {
  position: absolute;
  bottom: 20%;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  padding: 12px 24px;
  border-radius: 16px;
  text-align: center;
  z-index: 3;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.catch-icon { font-size: 40px; }
.catch-name { font-size: 18px; font-weight: bold; color: #fff; }
.catch-info { font-size: 12px; color: #94a3b8; }
.catch-rarity {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 10px;
  display: inline-block;
}
.catch-rarity.common { background: rgba(156,163,175,0.3); color: #d1d5db; }
.catch-rarity.rare { background: rgba(59,130,246,0.3); color: #60a5fa; }
.catch-rarity.epic { background: rgba(168,85,247,0.3); color: #c084fc; }
.catch-rarity.legendary { background: rgba(251,191,36,0.3); color: #fbbf24; }

.fishing-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  justify-content: center;
}

.action-btn {
  padding: 14px 30px;
  border: none;
  border-radius: 25px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.cast-btn {
  background: linear-gradient(135deg, #0ea5e9, #3b82f6);
  color: #fff;
  flex: 1;
}

.cast-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.reel-btn {
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  color: #fff;
  animation: pulse-btn 0.5s infinite alternate;
}

@keyframes pulse-btn {
  from { transform: scale(1); }
  to { transform: scale(1.05); }
}

.cancel-btn {
  background: rgba(255,255,255,0.1);
  color: #94a3b8;
  font-size: 14px;
  padding: 14px 20px;
}

.fishing-message {
  margin-top: 12px;
  padding: 10px 16px;
  border-radius: 10px;
  text-align: center;
  font-size: 14px;
}

.fishing-message.info { background: rgba(14,165,233,0.2); color: #7dd3fc; }
.fishing-message.success { background: rgba(34,197,94,0.2); color: #4ade80; }
.fishing-message.error { background: rgba(239,68,68,0.2); color: #f87171; }

/* ─── Inventory ─── */
.inventory-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.sell-all-btn {
  padding: 8px 16px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border: none;
  border-radius: 20px;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

.sell-all-btn:disabled { opacity: 0.5; }

.fish-inventory {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.inventory-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255,255,255,0.06);
  padding: 14px;
  border-radius: 14px;
}

.fish-icon-area {
  position: relative;
  text-align: center;
}

.fish-icon-area .fish-icon { font-size: 36px; }

.fish-rarity {
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 8px;
  white-space: nowrap;
}

.fish-rarity.common { background: rgba(156,163,175,0.3); color: #d1d5db; }
.fish-rarity.rare { background: rgba(59,130,246,0.3); color: #60a5fa; }
.fish-rarity.epic { background: rgba(168,85,247,0.3); color: #c084fc; }
.fish-rarity.legendary { background: rgba(251,191,36,0.3); color: #fbbf24; }

.fish-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.fish-name { font-weight: bold; color: #fff; }
.fish-meta { font-size: 12px; color: #94a3b8; }
.fish-price { font-size: 12px; color: #fbbf24; }

.fish-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.sell-input {
  width: 50px;
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.1);
  color: #fff;
  font-size: 13px;
  text-align: center;
}

.sell-btn {
  padding: 8px 14px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border: none;
  border-radius: 20px;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

/* ─── History ─── */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255,255,255,0.05);
  padding: 12px 14px;
  border-radius: 12px;
}

.history-icon { font-size: 28px; }
.history-name { flex: 1; font-size: 14px; color: #fff; }
.history-rarity { font-size: 11px; padding: 2px 8px; border-radius: 8px; }
.history-rarity.common { background: rgba(156,163,175,0.3); color: #d1d5db; }
.history-rarity.rare { background: rgba(59,130,246,0.3); color: #60a5fa; }
.history-rarity.epic { background: rgba(168,85,247,0.3); color: #c084fc; }
.history-rarity.legendary { background: rgba(251,191,36,0.3); color: #fbbf24; }
.history-price { font-size: 13px; color: #fbbf24; }
.history-date { font-size: 11px; color: #64748b; }

/* ─── Upgrade ─── */
.rod-info {
  background: rgba(255,255,255,0.06);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
  display: flex;
  gap: 20px;
  align-items: center;
}

.rod-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.rod-icon { font-size: 48px; }
.rod-level {
  background: linear-gradient(135deg, #0ea5e9, #6366f1);
  padding: 4px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: bold;
}

.rod-stats {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
  color: #94a3b8;
}

.upgrade-section {
  background: rgba(255,255,255,0.06);
  border-radius: 16px;
  padding: 20px;
}

.upgrade-section h3 {
  color: #7dd3fc;
  margin-bottom: 8px;
}

.upgrade-hint {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 16px;
}

.upgrade-cost {
  margin-bottom: 16px;
  font-size: 15px;
  color: #fbbf24;
}

.upgrade-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #0ea5e9, #3b82f6);
  border: none;
  border-radius: 25px;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
}

.upgrade-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ─── Fish Types ─── */
.fish-types-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.fish-type-card {
  background: rgba(255,255,255,0.05);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
  border: 1px solid rgba(255,255,255,0.05);
}

.fish-type-card.common { border-color: rgba(156,163,175,0.2); }
.fish-type-card.rare { border-color: rgba(59,130,246,0.3); background: rgba(59,130,246,0.05); }
.fish-type-card.epic { border-color: rgba(168,85,247,0.3); background: rgba(168,85,247,0.05); }
.fish-type-card.legendary { border-color: rgba(251,191,36,0.3); background: rgba(251,191,36,0.05); }

.ft-icon { font-size: 36px; }
.ft-name { font-weight: bold; color: #fff; font-size: 14px; }
.ft-rarity { font-size: 11px; padding: 2px 8px; border-radius: 10px; }
.ft-rarity.common { background: rgba(156,163,175,0.3); color: #d1d5db; }
.ft-rarity.rare { background: rgba(59,130,246,0.3); color: #60a5fa; }
.ft-rarity.epic { background: rgba(168,85,247,0.3); color: #c084fc; }
.ft-rarity.legendary { background: rgba(251,191,36,0.3); color: #fbbf24; }
.ft-level { font-size: 11px; color: #64748b; }
.ft-price { font-size: 12px; color: #fbbf24; }
.ft-desc { font-size: 11px; color: #475569; }

/* ─── Empty State ─── */
.empty-state {
  text-align: center;
  padding: 40px;
  color: #64748b;
  font-size: 14px;
}
</style>
