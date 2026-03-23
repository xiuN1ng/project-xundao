<template>
  <div class="sect-mission-overlay" @click.self="closePanel">
    <div class="sect-mission-panel">
      <!-- 顶部 -->
      <div class="panel-header">
        <h2>📋 宗门任务</h2>
        <button class="close-btn" @click="closePanel">✕</button>
      </div>

      <!-- 玩家贡献度 -->
      <div class="player-contrib">
        <span>我的贡献度: <b>{{ playerContribution.toLocaleString() }}</b></span>
        <button class="shop-btn" @click="activeTab = 'shop'">🎁 贡献商店</button>
      </div>

      <!-- Tab -->
      <div class="tabs">
        <button class="tab" :class="{ active: activeTab === 'daily' }" @click="switchTab('daily')">
          ☀️ 每日任务 <span class="badge" v-if="dailyCompleteCount > 0">{{ dailyCompleteCount }}</span>
        </button>
        <button class="tab" :class="{ active: activeTab === 'weekly' }" @click="switchTab('weekly')">
          📅 每周任务 <span class="badge" v-if="weeklyCompleteCount > 0">{{ weeklyCompleteCount }}</span>
        </button>
        <button class="tab" :class="{ active: activeTab === 'shop' }" @click="switchTab('shop')">🏪 贡献商店</button>
      </div>

      <!-- 每日任务 -->
      <div v-if="activeTab === 'daily'" class="tab-content">
        <div class="mission-progress">
          <span>完成进度: {{ dailyCompleteCount }} / {{ dailyMissions.length }}</span>
          <button v-if="dailyClaimableCount > 0" class="claim-all-btn" @click="claimAllDaily">一键领取 ({{ dailyClaimableCount }})</button>
        </div>
        <div class="reset-info">重置时间: {{ nextDailyReset }}</div>
        <div class="mission-list">
          <div v-for="m in dailyMissions" :key="m.id" class="mission-item" :class="{ complete: m.complete, claimable: m.canClaim }">
            <div class="mission-icon">{{ getMissionIcon(m.type) }}</div>
            <div class="mission-info">
              <p class="mission-name">{{ m.name }}</p>
              <p class="mission-desc">{{ m.desc }}</p>
              <div class="mission-progress-bar">
                <div class="mission-progress-fill" :style="{ width: Math.min(100, (m.current / m.target) * 100) + '%' }"></div>
              </div>
              <p class="mission-progress-text">{{ m.current }} / {{ m.target }}</p>
            </div>
            <div class="mission-reward">
              <p>exp {{ m.exp_reward }}</p>
              <p>灵石 {{ m.gold_reward }}</p>
              <p>贡献 {{ m.contrib }}</p>
            </div>
            <button v-if="m.canClaim" class="claim-btn" @click="claimDaily(m.id)">领取</button>
            <span v-else-if="m.complete" class="claimed-badge">已领</span>
            <span v-else class="pending-badge">进行中</span>
          </div>
        </div>
      </div>

      <!-- 每周任务 -->
      <div v-if="activeTab === 'weekly'" class="tab-content">
        <div class="mission-progress">
          <span>完成进度: {{ weeklyCompleteCount }} / {{ weeklyMissions.length }}</span>
          <button v-if="weeklyClaimableCount > 0" class="claim-all-btn" @click="claimAllWeekly">一键领取 ({{ weeklyClaimableCount }})</button>
        </div>
        <div class="reset-info">重置时间: 每周一 00:00</div>
        <div class="mission-list">
          <div v-for="m in weeklyMissions" :key="m.id" class="mission-item" :class="{ complete: m.complete, claimable: m.canClaim }">
            <div class="mission-icon">{{ getMissionIcon(m.type) }}</div>
            <div class="mission-info">
              <p class="mission-name">{{ m.name }}</p>
              <p class="mission-desc">{{ m.desc }}</p>
              <div class="mission-progress-bar">
                <div class="mission-progress-fill" :style="{ width: Math.min(100, (m.current / m.target) * 100) + '%' }"></div>
              </div>
              <p class="mission-progress-text">{{ m.current }} / {{ m.target }}</p>
            </div>
            <div class="mission-reward">
              <p>exp {{ m.exp_reward }}</p>
              <p>灵石 {{ m.gold_reward }}</p>
              <p>贡献 {{ m.contrib }}</p>
            </div>
            <button v-if="m.canClaim" class="claim-btn" @click="claimWeekly(m.id)">领取</button>
            <span v-else-if="m.complete" class="claimed-badge">已领</span>
            <span v-else class="pending-badge">进行中</span>
          </div>
        </div>
      </div>

      <!-- 贡献商店 -->
      <div v-if="activeTab === 'shop'" class="tab-content">
        <div class="shop-header">
          <h4>可用贡献度: <span class="contrib-amount">{{ playerContribution.toLocaleString() }}</span></h4>
        </div>
        <div class="shop-list">
          <div v-for="item in shopRewards" :key="item.id" class="shop-item" :class="{ affordable: playerContribution >= item.cost, locked: playerContribution < item.cost }">
            <div class="shop-icon">{{ item.icon }}</div>
            <div class="shop-info">
              <p class="shop-name">{{ item.name }}</p>
              <p class="shop-desc">{{ item.desc }}</p>
              <p class="shop-cost">💰 {{ item.cost }} 贡献度</p>
            </div>
            <button class="exchange-btn" @click="exchange(item.id)" :disabled="playerContribution < item.cost">
              {{ playerContribution >= item.cost ? '兑换' : '不足' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const activeTab = ref('daily')
const dailyMissions = ref([])
const weeklyMissions = ref([])
const shopRewards = ref([])
const playerContribution = ref(5000)
const nextDailyReset = ref('')

const API_BASE = '/api/sect'

const dailyCompleteCount = computed(() => dailyMissions.value.filter(m => m.complete).length)
const dailyClaimableCount = computed(() => dailyMissions.value.filter(m => m.canClaim).length)
const weeklyCompleteCount = computed(() => weeklyMissions.value.filter(m => m.complete).length)
const weeklyClaimableCount = computed(() => weeklyMissions.value.filter(m => m.canClaim).length)

const MISSION_ICONS = {
  dungeon_kill: '👹', collect_herb: '🌿', pvp_duel: '⚔️', donate_gold: '💰',
  boss_damage: '👹', dungeon_complete: '🏰', escort: '🛡️', worship: '🙏',
  pvp_win: '🏆', sect_war_win: '⚔️', adventure: '🔮', default: '📋'
}

onMounted(() => {
  loadDaily()
  loadWeekly()
  loadShop()
})

async function switchTab(tab) {
  activeTab.value = tab
}

async function loadDaily() {
  try {
    const res = await fetch(`${API_BASE}/missions/daily`)
    const data = await res.json()
    dailyMissions.value = data.missions || []
    nextDailyReset.value = data.resetTime ? new Date(data.resetTime).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '00:00'
  } catch (e) {
    console.error('[SectMission] 加载每日任务失败:', e)
  }
}

async function loadWeekly() {
  try {
    const res = await fetch(`${API_BASE}/missions/weekly`)
    const data = await res.json()
    weeklyMissions.value = data.missions || []
  } catch (e) {
    console.error('[SectMission] 加载每周任务失败:', e)
  }
}

async function loadShop() {
  try {
    const res = await fetch(`${API_BASE}/shop`)
    const data = await res.json()
    shopRewards.value = data.rewards || []
    playerContribution.value = data.playerContribution || 0
  } catch (e) {
    console.error('[SectMission] 加载商店失败:', e)
  }
}

async function claimDaily(missionId) {
  try {
    const res = await fetch(`${API_BASE}/missions/daily/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ missionId })
    })
    const data = await res.json()
    if (data.success) {
      alert(data.message)
      loadDaily()
    } else {
      alert(data.message)
    }
  } catch (e) {
    console.error('[SectMission] 领取每日奖励失败:', e)
  }
}

async function claimWeekly(missionId) {
  try {
    const res = await fetch(`${API_BASE}/missions/weekly/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ missionId })
    })
    const data = await res.json()
    if (data.success) {
      alert(data.message)
      loadWeekly()
    } else {
      alert(data.message)
    }
  } catch (e) {
    console.error('[SectMission] 领取每周奖励失败:', e)
  }
}

async function claimAllDaily() {
  try {
    const res = await fetch(`${API_BASE}/missions/daily/claim-all`, { method: 'POST' })
    const data = await res.json()
    if (data.success) {
      alert(data.message)
      loadDaily()
    } else {
      alert(data.message)
    }
  } catch (e) {
    console.error('[SectMission] 一键领取失败:', e)
  }
}

async function claimAllWeekly() {
  alert('每周任务请逐个领取')
}

async function exchange(rewardId) {
  try {
    const res = await fetch(`${API_BASE}/shop/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rewardId })
    })
    const data = await res.json()
    if (data.success) {
      alert(data.message)
      loadShop()
    } else {
      alert(data.message)
    }
  } catch (e) {
    console.error('[SectMission] 兑换失败:', e)
  }
}

function getMissionIcon(type) {
  return MISSION_ICONS[type] || MISSION_ICONS.default
}

function closePanel() {
  if (window.hidePanel) window.hidePanel('SectMissionPanel')
}
</script>

<style scoped>
.sect-mission-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 9000;
  display: flex; align-items: center; justify-content: center;
}
.sect-mission-panel {
  width: 580px; max-height: 85vh; background: linear-gradient(135deg, #1a1a2e, #16213e);
  border: 2px solid #667eea; border-radius: 20px; overflow: hidden;
  box-shadow: 0 0 40px rgba(102,126,234,0.3); display: flex; flex-direction: column;
}
.panel-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; background: rgba(102,126,234,0.2); border-bottom: 1px solid rgba(102,126,234,0.3);
}
.panel-header h2 { color: #a78bfa; margin: 0; font-size: 20px; }
.close-btn { background: none; border: none; color: #aaa; font-size: 18px; cursor: pointer; }
.close-btn:hover { color: #fff; }
.player-contrib {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 20px; background: rgba(255,255,255,0.03); color: #ccc; font-size: 14px;
}
.player-contrib b { color: #667eea; }
.shop-btn { padding: 6px 16px; background: linear-gradient(90deg, #667eea, #764ba2); border: none; border-radius: 15px; color: #fff; cursor: pointer; font-size: 13px; }
.tabs { display: flex; border-bottom: 1px solid rgba(255,255,255,0.1); }
.tab { flex: 1; padding: 12px; background: none; border: none; color: #888; cursor: pointer; font-size: 14px; border-bottom: 2px solid transparent; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; }
.tab.active { color: #a78bfa; border-bottom-color: #a78bfa; }
.badge { background: #ff4444; color: #fff; font-size: 11px; padding: 1px 6px; border-radius: 10px; }
.tab-content { padding: 16px 20px; overflow-y: auto; flex: 1; }
.mission-progress { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; color: #aaa; font-size: 13px; }
.claim-all-btn { padding: 5px 14px; background: linear-gradient(90deg, #667eea, #764ba2); border: none; border-radius: 15px; color: #fff; cursor: pointer; font-size: 12px; }
.reset-info { color: #666; font-size: 12px; margin-bottom: 12px; }
.mission-list { display: flex; flex-direction: column; gap: 10px; }
.mission-item {
  display: flex; align-items: center; gap: 12px; padding: 12px;
  background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);
  transition: all 0.2s;
}
.mission-item.complete { border-color: rgba(102,126,234,0.3); background: rgba(102,126,234,0.05); }
.mission-item.claimable { border-color: #667eea; background: rgba(102,126,234,0.1); animation: glow 2s infinite; }
@keyframes glow { 0%,100% { box-shadow: 0 0 5px rgba(102,126,234,0.3); } 50% { box-shadow: 0 0 15px rgba(102,126,234,0.5); } }
.mission-icon { font-size: 30px; width: 40px; text-align: center; }
.mission-info { flex: 1; }
.mission-name { color: #ddd; font-size: 14px; margin: 0 0 2px; font-weight: bold; }
.mission-desc { color: #888; font-size: 12px; margin: 0 0 6px; }
.mission-progress-bar { height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; }
.mission-progress-fill { height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 3px; transition: width 0.3s; }
.mission-progress-text { color: #aaa; font-size: 11px; margin: 4px 0 0; }
.mission-reward { text-align: right; font-size: 11px; color: #888; min-width: 70px; }
.mission-reward p { margin: 2px 0; }
.claim-btn { padding: 6px 16px; background: linear-gradient(90deg, #667eea, #764ba2); border: none; border-radius: 15px; color: #fff; cursor: pointer; font-size: 13px; }
.claimed-badge { color: #4ade80; font-size: 12px; }
.pending-badge { color: #666; font-size: 12px; }
.shop-header { margin-bottom: 16px; }
.shop-header h4 { color: #a78bfa; margin: 0; font-size: 15px; }
.contrib-amount { color: #667eea; font-size: 18px; }
.shop-list { display: flex; flex-direction: column; gap: 10px; }
.shop-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); }
.shop-item.affordable { border-color: rgba(102,126,234,0.3); }
.shop-item.locked { opacity: 0.5; }
.shop-icon { font-size: 30px; width: 40px; text-align: center; }
.shop-info { flex: 1; }
.shop-name { color: #ddd; font-size: 14px; margin: 0 0 2px; font-weight: bold; }
.shop-desc { color: #888; font-size: 12px; margin: 0 0 4px; }
.shop-cost { color: #667eea; font-size: 13px; margin: 0; }
.exchange-btn { padding: 6px 16px; background: linear-gradient(90deg, #667eea, #764ba2); border: none; border-radius: 15px; color: #fff; cursor: pointer; font-size: 13px; }
.exchange-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
