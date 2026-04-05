<template>
  <div class="fashion-panel">
    <!-- 顶部标题栏 -->
    <div class="panel-header">
      <h2>👗 时装系统</h2>
      <div class="player-lingshi" v-if="playerStore.player">
        💎 {{ playerStore.player.lingshi ?? 0 }} 灵石
      </div>
    </div>

    <!-- 标签页切换 -->
    <div class="fashion-tabs">
      <button
        v-for="t in tabs"
        :key="t.id"
        :class="{ active: activeTab === t.id }"
        @click="switchTab(t.id)"
      >
        <span class="tab-icon">{{ t.icon }}</span>
        <span class="tab-name">{{ t.name }}</span>
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>加载中...</span>
    </div>

    <!-- 错误提示 -->
    <div v-else-if="errorMsg" class="error-state">
      <span>{{ errorMsg }}</span>
      <button @click="retry">重试</button>
    </div>

    <!-- 已拥有 tab -->
    <div v-else-if="activeTab === 'owned'" class="tab-content">
      <div class="content-header">
        <span class="content-title">已拥有 ({{ ownedList.length }} 件)</span>
        <span class="equipped-info" v-if="equippedFashion">
          当前穿戴: <span class="equipped-name" :style="{ color: equippedFashion.quality_color }">
            {{ equippedFashion.icon }} {{ equippedFashion.name }}
          </span>
        </span>
      </div>

      <div v-if="ownedList.length === 0" class="empty-state">
        <div class="empty-icon">👗</div>
        <div class="empty-text">暂未拥有任何时装</div>
        <div class="empty-hint">前往商店购买时装吧！</div>
      </div>

      <div class="fashion-grid" v-else>
        <div
          v-for="f in ownedList"
          :key="f.id"
          class="fashion-card"
          :class="{
            equipped: f.equipped,
            'legendary-glow': f.quality === 'legendary',
            'epic-border': f.quality === 'epic',
            'rare-border': f.quality === 'rare',
          }"
        >
          <div class="card-icon-wrap">
            <span class="card-icon">{{ f.icon }}</span>
            <span class="card-effect">{{ f.effect }}</span>
          </div>
          <div class="card-name" :style="{ color: f.quality_color }">{{ f.name }}</div>
          <div class="card-quality-badge" :style="{ background: f.quality_color }">
            {{ qualityLabel(f.quality) }}
          </div>
          <div class="card-bonus" v-if="f.bonus_atk || f.bonus_def || f.bonus_hp || f.bonus_spd">
            <span v-if="f.bonus_atk">⚔️+{{ f.bonus_atk }}</span>
            <span v-if="f.bonus_def">🛡️+{{ f.bonus_def }}</span>
            <span v-if="f.bonus_hp">❤️+{{ f.bonus_hp }}</span>
            <span v-if="f.bonus_spd">💨+{{ f.bonus_spd }}</span>
          </div>
          <div class="card-desc">{{ f.description }}</div>
          <div class="card-actions">
            <button
              v-if="!f.equipped"
              class="btn-equip"
              @click="equipFashion(f)"
              :disabled="actionLoading === f.id"
            >
              {{ actionLoading === f.id ? '穿戴中...' : '穿戴' }}
            </button>
            <button
              v-else
              class="btn-unequip"
              @click="unequipFashion(f)"
              :disabled="actionLoading === f.id"
            >
              {{ actionLoading === f.id ? '卸下中...' : '已穿戴 ▶ 卸下' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 时装商店 tab -->
    <div v-else-if="activeTab === 'shop'" class="tab-content">
      <div class="content-header">
        <span class="content-title">时装商店</span>
        <span class="owned-count">已拥有: {{ ownedList.length }}/{{ catalog.length }}</span>
      </div>

      <div class="shop-grid">
        <div
          v-for="item in catalog"
          :key="item.id"
          class="shop-card"
          :class="{
            owned: item.owned,
            'legendary-glow': item.quality === 'legendary',
            'epic-border': item.quality === 'epic',
            'rare-border': item.quality === 'rare',
          }"
        >
          <div class="shop-icon-wrap">
            <span class="shop-icon">{{ item.icon }}</span>
            <span class="shop-effect">{{ item.effect }}</span>
          </div>
          <div class="shop-name" :style="{ color: item.quality_color }">{{ item.name }}</div>
          <div class="shop-quality-badge" :style="{ background: item.quality_color }">
            {{ qualityLabel(item.quality) }}
          </div>
          <div class="shop-bonus">
            <span v-if="item.bonus_atk">⚔️+{{ item.bonus_atk }}</span>
            <span v-if="item.bonus_def">🛡️+{{ item.bonus_def }}</span>
            <span v-if="item.bonus_hp">❤️+{{ item.bonus_hp }}</span>
            <span v-if="item.bonus_spd">💨+{{ item.bonus_spd }}</span>
          </div>
          <div class="shop-desc">{{ item.description }}</div>
          <div class="shop-price">
            <span class="price-tag">💎 {{ item.price }}</span>
          </div>
          <div class="shop-actions">
            <button
              v-if="item.owned"
              class="btn-owned"
              disabled
            >
              ✓ 已拥有
            </button>
            <button
              v-else
              class="btn-buy"
              @click="buyFashion(item)"
              :disabled="actionLoading === item.id || (playerStore.player?.lingshi ?? 0) < item.price"
            >
              {{ actionLoading === item.id ? '购买中...' : '购买' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 套装效果 tab -->
    <div v-else-if="activeTab === 'sets'" class="tab-content">
      <div class="content-header">
        <span class="content-title">套装效果</span>
      </div>

      <div class="sets-list">
        <div
          v-for="set in setsInfo"
          :key="set.id"
          class="set-card"
          :class="{
            'set-partial': set.ownedCount >= 2 && set.ownedCount < 4,
            'set-complete': set.ownedCount >= 4,
          }"
        >
          <div class="set-header">
            <div class="set-icon-name">
              <span class="set-icon">{{ set.icon }}</span>
              <div class="set-title">
                <div class="set-name">{{ set.name }}</div>
                <div class="set-desc">{{ set.description }}</div>
              </div>
            </div>
            <div class="set-progress">
              <span class="progress-text">{{ set.ownedCount }}/{{ set.pieces.length }}</span>
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :style="{ width: (set.ownedCount / set.pieces.length * 100) + '%' }"
                ></div>
              </div>
            </div>
          </div>

          <div class="set-pieces">
            <div
              v-for="pieceId in set.pieces"
              :key="pieceId"
              class="piece-item"
              :class="{ 'piece-owned': isPieceOwned(set, pieceId) }"
            >
              <span class="piece-icon">{{ getPieceIcon(pieceId) }}</span>
              <span class="piece-name">{{ getPieceName(pieceId) }}</span>
              <span class="piece-check">{{ isPieceOwned(set, pieceId) ? '✓' : '🔒' }}</span>
            </div>
          </div>

          <div class="set-bonuses">
            <!-- 2件套效果 -->
            <div
              class="bonus-item"
              :class="{ 'bonus-active': set.ownedCount >= 2, 'bonus-locked': set.ownedCount < 2 }"
            >
              <div class="bonus-label">
                <span class="bonus-badge">2件套</span>
                <span class="bonus-threshold">{{ set.bonuses[2]?.desc || '---' }}</span>
              </div>
              <div class="bonus-status">
                <span v-if="set.ownedCount >= 2" class="status-active">✓ 已激活</span>
                <span v-else class="status-locked">🔒 {{ 2 - set.ownedCount }}件后激活</span>
              </div>
            </div>

            <!-- 4件套效果 -->
            <div
              class="bonus-item"
              :class="{ 'bonus-active': set.ownedCount >= 4, 'bonus-locked': set.ownedCount < 4 }"
            >
              <div class="bonus-label">
                <span class="bonus-badge bonus-badge-full">4件套</span>
                <span class="bonus-threshold">{{ set.bonuses[4]?.desc || '---' }}</span>
              </div>
              <div class="bonus-status">
                <span v-if="set.ownedCount >= 4" class="status-active">✓ 已激活</span>
                <span v-else class="status-locked">🔒 {{ 4 - set.ownedCount }}件后激活</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast 通知 -->
    <Transition name="toast">
      <div v-if="toast.show" class="toast-notification" :class="toast.type">
        {{ toast.message }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePlayerStore } from '../stores/player'

const playerStore = usePlayerStore()
const API_BASE = '/api'

// ─── State ───────────────────────────────────────────────────────────────────
const activeTab = ref('owned')
const loading = ref(false)
const errorMsg = ref('')
const actionLoading = ref(null)

const fashionData = ref({
  fashionList: [],
  equippedFashion: null,
  totalOwned: 0,
})
const catalogData = ref({
  catalog: [],
  sets: [],
  totalTemplates: 0,
})
const setsData = ref({ sets: [] })

const toast = ref({ show: false, message: '', type: 'info' })
let toastTimer = null

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const tabs = [
  { id: 'owned', name: '已拥有', icon: '👗' },
  { id: 'shop', name: '时装商店', icon: '🛒' },
  { id: 'sets', name: '套装效果', icon: '⚔️' },
]

// ─── Computed ─────────────────────────────────────────────────────────────────
const ownedList = computed(() =>
  fashionData.value.fashionList.filter(f => f.owned)
)

const equippedFashion = computed(() => fashionData.value.equippedFashion)

const catalog = computed(() => catalogData.value.catalog || [])

const setsInfo = computed(() => {
  const playerOwned = new Set(ownedList.value.map(f => String(f.id)))
  return (catalogData.value.sets || setsData.value.sets || []).map(set => {
    const ownedInSet = set.pieces.filter(p => playerOwned.has(String(p))).length
    return {
      ...set,
      ownedCount: ownedInSet,
      bonuses: set.bonuses || {},
    }
  })
})

// ─── Quality helpers ──────────────────────────────────────────────────────────
function qualityLabel(quality) {
  const map = {
    common: '普通',
    rare: '稀有',
    epic: '史诗',
    legendary: '传说',
  }
  return map[quality] || quality
}

function getPieceIcon(pieceId) {
  const item = catalog.value.find(c => String(c.id) === String(pieceId))
  return item?.icon || '❓'
}

function getPieceName(pieceId) {
  const item = catalog.value.find(c => String(c.id) === String(pieceId))
  return item?.name || `时装#${pieceId}`
}

function isPieceOwned(set, pieceId) {
  return ownedList.value.some(f => String(f.id) === String(pieceId))
}

// ─── Toast ───────────────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  clearTimeout(toastTimer)
  toast.value = { show: true, message, type }
  toastTimer = setTimeout(() => {
    toast.value.show = false
  }, 2500)
}

// ─── API helpers ─────────────────────────────────────────────────────────────
async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(playerStore.player?.token ? { Authorization: `Bearer ${playerStore.player.token}` } : {}),
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

async function apiPost(path, body = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(playerStore.player?.token ? { Authorization: `Bearer ${playerStore.player.token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// ─── Tab switching ────────────────────────────────────────────────────────────
async function switchTab(tabId) {
  activeTab.value = tabId
  if (tabId === 'owned') {
    await fetchOwned()
  } else if (tabId === 'shop') {
    await fetchCatalog()
  } else if (tabId === 'sets') {
    await fetchSets()
  }
}

async function retry() {
  errorMsg.value = ''
  await switchTab(activeTab.value)
}

// ─── Data fetching ────────────────────────────────────────────────────────────
async function fetchOwned() {
  loading.value = true
  errorMsg.value = ''
  try {
    const data = await apiGet('/fashion')
    fashionData.value = {
      fashionList: data.fashionList || [],
      equippedFashion: data.equippedFashion || null,
      totalOwned: data.totalOwned || 0,
    }
  } catch (e) {
    errorMsg.value = e.message || '加载时装失败'
  } finally {
    loading.value = false
  }
}

async function fetchCatalog() {
  loading.value = true
  errorMsg.value = ''
  try {
    const data = await apiGet('/fashion/catalog')
    catalogData.value = {
      catalog: data.catalog || [],
      sets: data.sets || [],
      totalTemplates: data.totalTemplates || 0,
    }
  } catch (e) {
    errorMsg.value = e.message || '加载商店失败'
  } finally {
    loading.value = false
  }
}

async function fetchSets() {
  loading.value = true
  errorMsg.value = ''
  try {
    // Also need catalog for piece names/icons
    if (catalogData.value.catalog.length === 0) {
      const catData = await apiGet('/fashion/catalog')
      catalogData.value = {
        catalog: catData.catalog || [],
        sets: catData.sets || [],
        totalTemplates: catData.totalTemplates || 0,
      }
    }
    const data = await apiGet('/fashion/sets')
    setsData.value = { sets: data.sets || [] }
  } catch (e) {
    errorMsg.value = e.message || '加载套装信息失败'
  } finally {
    loading.value = false
  }
}

// ─── Actions ──────────────────────────────────────────────────────────────────
async function equipFashion(fashion) {
  actionLoading.value = fashion.id
  try {
    const data = await apiPost('/fashion/equip', { id: parseInt(fashion.id) })
    showToast(data.message || '穿戴成功', 'success')
    await fetchOwned()
    // Refresh sets info too
    if (catalogData.value.catalog.length === 0) {
      await fetchCatalog()
    }
  } catch (e) {
    showToast(e.message || '穿戴失败', 'error')
  } finally {
    actionLoading.value = null
  }
}

async function unequipFashion(fashion) {
  actionLoading.value = fashion.id
  try {
    const data = await apiPost('/fashion/unequip', { id: parseInt(fashion.id) })
    showToast(data.message || '已卸下', 'info')
    await fetchOwned()
  } catch (e) {
    showToast(e.message || '卸下失败', 'error')
  } finally {
    actionLoading.value = null
  }
}

async function buyFashion(item) {
  actionLoading.value = item.id
  try {
    const data = await apiPost('/fashion/buy', { id: parseInt(item.id) })
    showToast(data.message || `成功购买「${item.name}」！`, 'success')
    // Refresh lingshi in player store
    if (playerStore.player && data.remainingLingshi !== undefined) {
      playerStore.player.lingshi = data.remainingLingshi
    }
    // Reload all data
    await Promise.all([fetchOwned(), fetchCatalog()])
  } catch (e) {
    showToast(e.message || '购买失败', 'error')
  } finally {
    actionLoading.value = null
  }
}

// ─── Mount ────────────────────────────────────────────────────────────────────
onMounted(async () => {
  await fetchOwned()
  // Preload catalog in background
  fetchCatalog().catch(() => {})
})
</script>

<style scoped>
/* ─── Base ─────────────────────────────────────────────────────────────────── */
.fashion-panel {
  padding: 16px;
  min-height: 80vh;
  background: linear-gradient(180deg, #0f0f23 0%, #1a1a3e 100%);
  color: #fff;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  position: relative;
}

/* ─── Header ───────────────────────────────────────────────────────────────── */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.panel-header h2 {
  font-size: 22px;
  color: #f093fb;
  margin: 0;
  text-shadow: 0 0 10px rgba(240, 147, 251, 0.4);
}
.player-lingshi {
  background: rgba(255, 200, 0, 0.12);
  border: 1px solid rgba(255, 200, 0, 0.3);
  border-radius: 20px;
  padding: 6px 14px;
  font-size: 13px;
  color: #ffd700;
}

/* ─── Tabs ─────────────────────────────────────────────────────────────────── */
.fashion-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 12px;
}
.fashion-tabs button {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.25s ease;
  font-size: 12px;
}
.fashion-tabs button .tab-icon { font-size: 18px; }
.fashion-tabs button .tab-name { font-size: 12px; }
.fashion-tabs button:hover {
  background: rgba(102, 126, 234, 0.15);
  color: rgba(255, 255, 255, 0.9);
}
.fashion-tabs button.active {
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.35);
}

/* ─── Content header ───────────────────────────────────────────────────────── */
.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.content-title {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 600;
}
.equipped-info {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}
.equipped-name { font-weight: 600; }
.owned-count {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

/* ─── Loading / Error / Empty ──────────────────────────────────────────────── */
.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 12px;
  color: rgba(255, 255, 255, 0.5);
}
.loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.error-state button {
  padding: 6px 16px;
  background: rgba(255, 80, 80, 0.2);
  border: 1px solid rgba(255, 80, 80, 0.4);
  border-radius: 8px;
  color: #ff6b6b;
  cursor: pointer;
  font-size: 12px;
}
.empty-icon { font-size: 48px; opacity: 0.4; }
.empty-text { font-size: 16px; color: rgba(255, 255, 255, 0.7); }
.empty-hint { font-size: 12px; color: rgba(255, 255, 255, 0.4); }

/* ─── Fashion Grid (owned) ─────────────────────────────────────────────────── */
.fashion-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

/* ─── Fashion Card ──────────────────────────────────────────────────────────── */
.fashion-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 14px 10px;
  text-align: center;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}
.fashion-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}
.fashion-card.equipped {
  border: 2px solid #667eea;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.15));
  box-shadow: 0 0 15px rgba(102, 126, 234, 0.25);
}
.fashion-card.legendary-glow {
  border-color: rgba(255, 152, 0, 0.6);
  box-shadow: 0 0 20px rgba(255, 152, 0, 0.2);
  animation: legendaryPulse 2.5s ease-in-out infinite;
}
@keyframes legendaryPulse {
  0%, 100% { box-shadow: 0 0 15px rgba(255, 152, 0, 0.2); }
  50% { box-shadow: 0 0 25px rgba(255, 152, 0, 0.45); }
}
.fashion-card.epic-border { border-color: rgba(156, 39, 176, 0.6); }
.fashion-card.rare-border { border-color: rgba(33, 150, 243, 0.5); }

.card-icon-wrap { position: relative; display: inline-block; margin-bottom: 6px; }
.card-icon { font-size: 40px; display: block; }
.card-effect { position: absolute; top: -4px; right: -8px; font-size: 14px; }
.card-name { font-size: 13px; font-weight: 700; margin-bottom: 4px; }
.card-quality-badge {
  display: inline-block;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  color: #fff;
  margin-bottom: 6px;
  opacity: 0.9;
}
.card-bonus {
  display: flex;
  justify-content: center;
  gap: 4px;
  flex-wrap: wrap;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.65);
  margin-bottom: 4px;
}
.card-desc {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.38);
  margin-bottom: 8px;
  line-height: 1.3;
}
.card-actions { margin-top: 6px; }
.btn-equip {
  width: 100%;
  padding: 7px 0;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn-equip:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-unequip {
  width: 100%;
  padding: 7px 0;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-unequip:hover {
  background: rgba(255, 80, 80, 0.15);
  border-color: rgba(255, 80, 80, 0.4);
  color: #ff6b6b;
}
.btn-unequip:disabled { opacity: 0.5; cursor: not-allowed; }

/* ─── Shop Grid ─────────────────────────────────────────────────────────────── */
.shop-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(155px, 1fr));
  gap: 12px;
}
.shop-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 14px 10px;
  text-align: center;
  transition: all 0.3s ease;
}
.shop-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.3); }
.shop-card.owned {
  opacity: 0.55;
  border-style: dashed;
}
.shop-icon-wrap { position: relative; display: inline-block; margin-bottom: 6px; }
.shop-icon { font-size: 38px; display: block; }
.shop-effect { position: absolute; top: -4px; right: -8px; font-size: 13px; }
.shop-name { font-size: 13px; font-weight: 700; margin-bottom: 4px; }
.shop-quality-badge {
  display: inline-block;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  color: #fff;
  margin-bottom: 5px;
  opacity: 0.9;
}
.shop-bonus {
  display: flex;
  justify-content: center;
  gap: 3px;
  flex-wrap: wrap;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.65);
  margin-bottom: 4px;
}
.shop-desc {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.35);
  margin-bottom: 6px;
  line-height: 1.3;
}
.shop-price { margin-bottom: 8px; }
.price-tag {
  font-size: 13px;
  color: #ffd700;
  font-weight: 600;
}
.btn-buy {
  width: 100%;
  padding: 7px 0;
  background: linear-gradient(135deg, #f093fb, #f5576c);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn-buy:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-owned {
  width: 100%;
  padding: 7px 0;
  background: rgba(76, 175, 80, 0.15);
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 10px;
  color: #4caf50;
  font-size: 12px;
  cursor: not-allowed;
}

/* ─── Sets ──────────────────────────────────────────────────────────────────── */
.sets-list { display: flex; flex-direction: column; gap: 16px; }
.set-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 16px;
  transition: all 0.3s;
}
.set-card.set-partial {
  border-color: rgba(102, 126, 234, 0.4);
  background: linear-gradient(135deg, rgba(102,126,234,0.08), rgba(118,75,162,0.05));
}
.set-card.set-complete {
  border-color: rgba(255, 152, 0, 0.5);
  background: linear-gradient(135deg, rgba(255,152,0,0.1), rgba(255,87,34,0.08));
  box-shadow: 0 0 20px rgba(255, 152, 0, 0.15);
}
.set-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.set-icon-name { display: flex; align-items: center; gap: 10px; }
.set-icon { font-size: 32px; }
.set-name { font-size: 16px; font-weight: 700; color: #fff; }
.set-desc { font-size: 11px; color: rgba(255, 255, 255, 0.45); margin-top: 2px; }
.set-progress { text-align: right; }
.progress-text { font-size: 12px; color: rgba(255, 255, 255, 0.6); margin-bottom: 4px; display: block; }
.progress-bar {
  width: 100px;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 3px;
  transition: width 0.4s ease;
}

.set-pieces {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
}
.piece-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  transition: all 0.2s;
}
.piece-item.piece-owned {
  background: rgba(102, 126, 234, 0.15);
  border-color: rgba(102, 126, 234, 0.4);
  color: rgba(255, 255, 255, 0.9);
}
.piece-icon { font-size: 14px; }
.piece-name { max-width: 70px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.piece-check { font-size: 10px; }

.set-bonuses { display: flex; flex-direction: column; gap: 8px; }
.bonus-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-radius: 10px;
  transition: all 0.3s;
}
.bonus-item.bonus-active {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.25), rgba(118, 75, 162, 0.2));
  border: 1px solid rgba(102, 126, 234, 0.4);
}
.bonus-item.bonus-locked {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.bonus-label { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.bonus-badge {
  font-size: 10px;
  padding: 2px 8px;
  background: rgba(102, 126, 234, 0.4);
  border-radius: 8px;
  color: #fff;
  white-space: nowrap;
}
.bonus-badge-full {
  background: rgba(255, 152, 0, 0.4);
}
.bonus-threshold { font-size: 12px; color: rgba(255, 255, 255, 0.75); }
.bonus-status { font-size: 11px; white-space: nowrap; margin-left: 8px; }
.status-active { color: #4caf50; font-weight: 600; }
.status-locked { color: rgba(255, 255, 255, 0.3); }

/* ─── Toast ─────────────────────────────────────────────────────────────────── */
.toast-notification {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 24px;
  border-radius: 25px;
  font-size: 13px;
  z-index: 9999;
  pointer-events: none;
  white-space: nowrap;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
}
.toast-notification.info {
  background: rgba(102, 126, 234, 0.9);
  color: #fff;
}
.toast-notification.success {
  background: rgba(76, 175, 80, 0.9);
  color: #fff;
}
.toast-notification.error {
  background: rgba(244, 67, 54, 0.9);
  color: #fff;
}
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(10px); }

/* ─── Scrollbar ─────────────────────────────────────────────────────────────── */
.fashion-panel::-webkit-scrollbar { width: 4px; }
.fashion-panel::-webkit-scrollbar-track { background: transparent; }
.fashion-panel::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 2px; }
</style>
