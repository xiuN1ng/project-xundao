<template>
  <BasePanel
    title="竞技场"
    icon="⚔️"
    :tab-items="tabs"
    :default-tab="activeTab"
    variant="primary"
    @tab-change="activeTab = $event"
    @close="$emit('close')"
  >
    <!-- 我的排名 -->
    <div class="my-rank-card">
      <span class="rank-label">我的排名</span>
      <span class="rank-value">#{{ myRank }}</span>
    </div>

    <!-- 排行榜 Tab -->
    <div v-if="activeTab === 'rank'" class="tab-content">
      <div v-if="loading" class="loading-state">
        <div class="spinner">⚔️</div>
        <span>加载排名中...</span>
      </div>
      <div v-else class="rank-list">
        <div
          v-for="r in ranks"
          :key="r.rank"
          :class="['rank-item', { 'top3': r.rank <= 3 }]"
        >
          <span class="rank-num">
            <span v-if="r.rank === 1">🥇</span>
            <span v-else-if="r.rank === 2">🥈</span>
            <span v-else-if="r.rank === 3">🥉</span>
            <span v-else>#{{ r.rank }}</span>
          </span>
          <span class="rank-name">{{ r.name }}</span>
          <span class="rank-combat">{{ formatNumber(r.combat) }}战力</span>
        </div>
        <div v-if="ranks.length === 0" class="empty-state">
          暂无排名数据
        </div>
      </div>
    </div>

    <!-- 挑战 Tab -->
    <div v-if="activeTab === 'challenge'" class="tab-content">
      <div v-if="loading" class="loading-state">
        <div class="spinner">⚔️</div>
        <span>加载对手中...</span>
      </div>
      <div v-else class="challenge-list">
        <div
          v-for="op in opponents"
          :key="op.userId"
          class="opponent-item"
        >
          <div class="opponent-info">
            <div class="opponent-name">{{ op.name }}</div>
            <div class="opponent-combat">{{ formatNumber(op.combat) }}战力</div>
          </div>
          <BaseButton
            variant="danger"
            size="sm"
            :loading="challengingId === op.userId"
            @click="challenge(op)"
          >
            挑战
          </BaseButton>
        </div>
        <div v-if="opponents.length === 0" class="empty-state">
          暂无可挑战对手
        </div>
      </div>
    </div>

    <!-- 战报 Tab -->
    <div v-if="activeTab === 'record'" class="tab-content">
      <div v-if="loading" class="loading-state">
        <div class="spinner">⚔️</div>
        <span>加载战报...</span>
      </div>
      <div v-else class="record-list">
        <div
          v-for="rec in records"
          :key="rec.id"
          :class="['record-item', rec.result]"
        >
          <span :class="['record-badge', rec.result]">
            {{ rec.result === 'win' ? '胜' : '负' }}
          </span>
          <span class="record-vs">
            {{ rec.challengerName }} vs {{ rec.targetName }}
          </span>
          <span class="record-time">{{ formatTime(rec.time) }}</span>
        </div>
        <div v-if="records.length === 0" class="empty-state">
          暂无战报记录
        </div>
      </div>
    </div>
  </BasePanel>
</template>

<script setup>
import { ref } from 'vue'
import BasePanel from './base/BasePanel.vue'
import BaseButton from './base/BaseButton.vue'
import { useToast } from './common/toastComposable.js'
import { arenaApi } from '../core/api.js'

const emit = defineEmits(['close'])
const toast = useToast()

const activeTab = ref('rank')
const tabs = [
  { id: 'rank', name: '排行榜', icon: '🏆' },
  { id: 'challenge', name: '挑战', icon: '⚔️' },
  { id: 'record', name: '战报', icon: '📋' },
]

const myRank = ref(0)
const ranks = ref([])
const opponents = ref([])
const records = ref([])
const loading = ref(false)
const challengingId = ref(null)

function getPlayerId() {
  try {
    const playerStore = window.playerStore
    if (playerStore?.player?.id) return playerStore.player.id
    const p = JSON.parse(localStorage.getItem('player') || '{}')
    return p.id
  } catch { return null }
}

function getPlayerName() {
  try {
    const playerStore = window.playerStore
    if (playerStore?.player?.username) return playerStore.player.username
    const p = JSON.parse(localStorage.getItem('player') || '{}')
    return p.username || '神秘修士'
  } catch { return '神秘修士' }
}

function formatNumber(num) {
  if (!num && num !== 0) return '0'
  num = Number(num)
  if (num >= 100000000) return (num / 100000000).toFixed(1) + '亿'
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  return num.toLocaleString()
}

function formatTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString()
}

async function loadRank() {
  loading.value = true
  try {
    const res = await arenaApi.getRanks(20)
    ranks.value = Array.isArray(res) ? res : []
  } catch (err) {
    toast.error('加载排行榜失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

async function loadMyRank() {
  const playerId = getPlayerId() || 1
  try {
    const res = await arenaApi.getMyRank(playerId)
    myRank.value = res?.rank || 0
  } catch (err) {
    console.error('加载排名失败:', err)
  }
}

async function loadOpponents() {
  const playerId = getPlayerId() || 1
  loading.value = true
  try {
    const res = await arenaApi.getOpponents(playerId)
    opponents.value = Array.isArray(res) ? res : []
  } catch (err) {
    toast.error('加载对手失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

async function loadRecords() {
  const playerId = getPlayerId() || 1
  loading.value = true
  try {
    const res = await arenaApi.getRecords(playerId)
    records.value = Array.isArray(res) ? res : []
  } catch (err) {
    toast.error('加载战报失败')
    console.error(err)
  } finally {
    loading.value = false
  }
}

async function challenge(opponent) {
  const playerId = getPlayerId() || 1
  const playerName = getPlayerName()
  challengingId.value = opponent.userId
  try {
    const res = await arenaApi.challenge(
      playerId,
      opponent.userId,
      playerName,
      opponent.name,
      opponent.combat
    )
    if (res.success) {
      toast.success(res.win ? '🏆 挑战胜利！' : '💀 挑战失败')
    } else {
      toast.error(res.message || '挑战失败')
    }
    await Promise.all([loadOpponents(), loadRecords()])
  } catch (err) {
    toast.error('挑战请求失败')
    console.error(err)
  } finally {
    challengingId.value = null
  }
}

// Initial data load
loadRank()
loadMyRank()
loadOpponents()
loadRecords()
</script>

<style scoped>
.my-rank-card {
  text-align: center;
  padding: 16px;
  background: linear-gradient(135deg, #16213e, #0f3460);
  border-radius: 10px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.rank-label { font-size: 13px; color: #888; }
.rank-value { font-size: 36px; color: #ffd700; font-weight: bold; }

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px;
  color: #888;
}
.spinner { font-size: 32px; animation: shake 0.5s ease infinite; }
@keyframes shake {
  0%, 100% { transform: rotate(-5deg); }
  50% { transform: rotate(5deg); }
}

.tab-content { min-height: 200px; }

.rank-list,
.challenge-list,
.record-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rank-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
}
.rank-item.top3 {
  border-color: rgba(255, 215, 0, 0.4);
  background: rgba(255, 215, 0, 0.06);
}
.rank-num { width: 36px; text-align: center; font-size: 16px; }
.rank-name { flex: 1; font-size: 14px; color: #fff; }
.rank-combat { color: #00d4ff; font-size: 12px; }

.opponent-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
}
.opponent-info { display: flex; flex-direction: column; gap: 2px; }
.opponent-name { font-weight: bold; font-size: 14px; color: #fff; }
.opponent-combat { font-size: 12px; color: #888; }

.record-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
}
.record-badge {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}
.record-badge.win { background: rgba(0, 255, 0, 0.2); color: #00ff00; }
.record-badge.lose { background: rgba(255, 0, 0, 0.2); color: #ff4444; }
.record-vs { flex: 1; font-size: 13px; color: #ddd; }
.record-time { font-size: 11px; color: #666; }

.empty-state {
  text-align: center;
  padding: 40px;
  color: #666;
  font-size: 14px;
}
</style>
