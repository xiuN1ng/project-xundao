<template>
  <BasePanel
    title="排行榜"
    icon="🏆"
    :tab-items="tabs"
    :default-tab="activeTab"
    variant="primary"
    @tab-change="onTabChange"
    @close="$emit('close')"
  >
    <div v-if="loading && ranks.length === 0" class="loading-state">
      <div class="spinner">🏆</div>
      <span>加载排名中...</span>
    </div>

    <div class="rank-list">
      <div
        v-for="(p, index) in ranks"
        :key="p.id || index"
        :class="['rank-card', { 'top3': index < 3 }]"
      >
        <span class="rank-num">
          <span v-if="index === 0">🥇</span>
          <span v-else-if="index === 1">🥈</span>
          <span v-else-if="index === 2">🥉</span>
          <span v-else>#{{ index + 1 }}</span>
        </span>
        <div class="player-avatar">{{ (p.name || '?')[0] }}</div>
        <div class="player-info">
          <span class="name">{{ p.name || '神秘修士' }}</span>
          <span class="value">{{ formatValue(p.value) }}</span>
        </div>
      </div>
      <div v-if="!loading && ranks.length === 0" class="empty-state">
        暂无排名数据
      </div>
    </div>
  </BasePanel>
</template>

<script setup>
import { ref, watch } from 'vue'
import BasePanel from './base/BasePanel.vue'
import { useToast } from './common/toastComposable.js'
import { rankingApi } from '../core/api.js'

const emit = defineEmits(['close'])
const toast = useToast()

const activeTab = ref('power')
const tabs = [
  { id: 'power', name: '战力', icon: '⚔️' },
  { id: 'level', name: '等级', icon: '📊' },
  { id: 'wealth', name: '财富', icon: '💰' },
]

const ranks = ref([])
const loading = ref(false)

function formatValue(val) {
  if (!val && val !== 0) return '0'
  val = Number(val)
  if (val >= 100000000) return (val / 100000000).toFixed(1) + '亿'
  if (val >= 10000) return (val / 10000).toFixed(1) + '万'
  return val.toLocaleString()
}

async function loadRanking(type) {
  loading.value = true
  ranks.value = []
  try {
    let res
    if (type === 'power') {
      res = await rankingApi.getPowerRanking()
    } else if (type === 'level') {
      res = await rankingApi.getLevelRanking()
    } else if (type === 'wealth') {
      res = await rankingApi.getWealthRanking()
    }
    if (Array.isArray(res)) {
      ranks.value = res
    } else if (res?.data) {
      ranks.value = res.data
    }
  } catch (err) {
    toast.error('加载排行榜失败，请稍后重试')
    console.error('加载排行榜失败:', err)
  } finally {
    loading.value = false
  }
}

function onTabChange(tab) {
  activeTab.value = tab
  loadRanking(tab)
}

// Initial load
loadRanking(activeTab.value)
</script>

<style scoped>
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px;
  color: #888;
}
.spinner { font-size: 32px; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.rank-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
}

.rank-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 14px 16px;
  border-radius: 12px;
  transition: background 0.2s;
}
.rank-card:hover { background: rgba(255, 255, 255, 0.08); }
.rank-card.top3 {
  background: rgba(255, 215, 0, 0.06);
  border-color: rgba(255, 215, 0, 0.3);
}

.rank-num { font-size: 22px; width: 38px; text-align: center; }

.player-avatar {
  width: 42px;
  height: 42px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: bold;
  font-size: 18px;
  flex-shrink: 0;
}

.player-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.name { color: #fff; font-weight: bold; font-size: 14px; }
.value { color: #f093fb; font-size: 13px; }

.empty-state {
  text-align: center;
  padding: 40px;
  color: #666;
  font-size: 14px;
}
</style>
