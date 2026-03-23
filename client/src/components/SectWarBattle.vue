<template>
  <div class="sect-war-battle">
    <!-- 战斗中 Loading -->
    <div v-if="battleLoading" class="battle-loading">
      <div class="battle-anim">
        <div class="anim-sect left">⚔️</div>
        <div class="anim-vs">⚡</div>
        <div class="anim-sect right">🛡️</div>
      </div>
      <p>战斗进行中...</p>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progressWidth + '%' }"></div>
      </div>
    </div>

    <!-- 战斗结果 -->
    <div v-else-if="battleResult" class="battle-result">
      <div class="result-banner" :class="battleResult.won ? 'victory' : 'defeat'">
        <div class="result-icon">{{ battleResult.won ? '🏆' : '💀' }}</div>
        <div class="result-title">{{ battleResult.won ? '胜利！' : '失败' }}</div>
      </div>

      <div class="result-summary">
        <div class="summary-item" v-if="battleResult.winner">
          <span class="s-label">获胜宗门</span>
          <span class="s-value">{{ battleResult.winner.name }}</span>
        </div>
        <div class="summary-item" v-if="battleResult.rounds">
          <span class="s-label">战斗回合</span>
          <span class="s-value">{{ battleResult.rounds }}</span>
        </div>
        <div class="summary-item" v-if="battleResult.reward_contribution">
          <span class="s-label">贡献奖励</span>
          <span class="s-value gain">+{{ battleResult.reward_contribution }}</span>
        </div>
      </div>

      <!-- 战斗摘要日志 -->
      <div class="battle-summary-log" v-if="battleResult.battle_summary?.length">
        <div class="log-title">📜 战斗记录</div>
        <p v-for="(line, i) in battleResult.battle_summary" :key="i" class="log-line">{{ line }}</p>
      </div>

      <button @click="resetBattle" class="return-btn">返回宗门战</button>
    </div>

    <!-- 匹配选择 -->
    <div v-else-if="!currentMatch" class="match-select">
      <h3>📋 选择对战宗门</h3>
      <div v-if="availableMatches.length === 0" class="no-matches">
        <p>暂无可用对战</p>
        <p class="tip">请等待系统匹配或刷新</p>
        <button @click="doRefresh" class="refresh-btn">🔄 刷新</button>
      </div>
      <div v-else class="match-list">
        <div
          v-for="match in availableMatches"
          :key="match.match_id || match.id"
          class="match-card"
          :class="{ selected: selectedMatchId === (match.match_id || match.id) }"
          @click="selectedMatchId = match.match_id || match.id"
        >
          <div class="match-teams">
            <div class="team my-team">
              <span class="team-name">{{ match.sect_a_id || match.sect_a?.name }}</span>
              <span v-if="match.sect_a_score !== undefined" class="team-score">{{ match.sect_a_score }}</span>
            </div>
            <div class="vs">VS</div>
            <div class="team enemy-team">
              <span class="team-name">{{ match.sect_b_id || match.sect_b?.name }}</span>
              <span v-if="match.sect_b_score !== undefined" class="team-score">{{ match.sect_b_score }}</span>
            </div>
          </div>
          <div class="match-meta">
            <span v-if="match.round_num" class="round-badge">第{{ match.round_num }}轮</span>
            <span v-if="match.status === 'ready'" class="status ready">可挑战</span>
            <span v-else-if="match.status === 'finished'" class="status finished">已结束</span>
            <span v-else class="status pending">等待中</span>
          </div>
        </div>
      </div>
      <button
        v-if="availableMatches.length > 0"
        @click="startBattle"
        :disabled="!selectedMatchId || battleLoading"
        class="start-btn"
      >
        {{ battleLoading ? '战斗结算中...' : '⚔️ 发起挑战' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  playerSect: Object,
  warId: [String, Number],
})
const emit = defineEmits(['battle-ended', 'loading-change'])

const API_BASE = 'http://localhost:3001/api'
const matches = ref([])
const selectedMatchId = ref(null)
const currentMatch = ref(null)
const battleResult = ref(null)
const battleLoading = ref(false)
const progressWidth = ref(0)
let progressTimer = null

const availableMatches = computed(() => {
  return matches.value.filter(m => {
    const myType = props.playerSect?.sect_type
    return (m.sect_a_id === myType || m.sect_b_id === myType) && m.status === 'ready'
  })
})

async function getPlayerId() {
  try {
    const res = await fetch(`${API_BASE}/player`)
    const data = await res.json()
    return data.data?.id
  } catch { return null }
}

async function loadMatches() {
  try {
    const res = await fetch(`${API_BASE}/sect-war/matches`)
    const data = await res.json()
    if (data.success) {
      matches.value = data.data || []
    }
  } catch (e) { matches.value = [] }
}

async function doRefresh() {
  emit('loading-change', true)
  await loadMatches()
  emit('loading-change', false)
}

async function startBattle() {
  if (!selectedMatchId.value) return
  battleLoading.value = true
  progressWidth.value = 0

  // 模拟进度条动画
  progressTimer = setInterval(() => {
    if (progressWidth.value < 85) {
      progressWidth.value += Math.random() * 15
    }
  }, 200)

  try {
    const playerId = await getPlayerId()
    const res = await fetch(`${API_BASE}/sect-war/battle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player_id: playerId,
        match_id: selectedMatchId.value,
      }),
    })
    const data = await res.json()
    if (data.success) {
      // 判断是否我方获胜
      const myType = props.playerSect?.sect_type
      const won = data.data.winner?.id === myType
      battleResult.value = {
        ...data.data,
        won,
      }
      currentMatch.value = selectedMatchId.value
      progressWidth.value = 100
    } else {
      alert(data.error || '挑战失败')
    }
  } catch (e) {
    alert('网络错误')
  } finally {
    clearInterval(progressTimer)
    battleLoading.value = false
    emit('battle-ended')
  }
}

function resetBattle() {
  currentMatch.value = null
  battleResult.value = null
  selectedMatchId.value = null
  progressWidth.value = 0
}

onMounted(async () => {
  await loadMatches()
})
</script>

<style scoped>
.sect-war-battle { min-height: 400px; }

.battle-loading {
  text-align: center;
  padding: 50px 20px;
}
.battle-anim {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 30px;
  margin-bottom: 20px;
}
.anim-sect {
  font-size: 40px;
  animation: pulse 1.5s ease-in-out infinite;
}
.anim-sect.left { animation-delay: 0s; }
.anim-sect.right { animation-delay: 0.75s; }
@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.7; }
  50% { transform: scale(1.3); opacity: 1; }
}
.anim-vs {
  font-size: 30px;
  animation: flash 0.8s ease-in-out infinite alternate;
}
@keyframes flash { from { opacity: 0.3; } to { opacity: 1; color: #ffd700; } }
.progress-bar {
  height: 6px;
  background: rgba(255,255,255,0.1);
  border-radius: 3px;
  overflow: hidden;
  max-width: 300px;
  margin: 20px auto 0;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #f093fb);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.result-banner {
  text-align: center;
  padding: 30px;
  border-radius: 16px;
  margin-bottom: 20px;
}
.result-banner.victory { background: linear-gradient(135deg, rgba(76,175,80,0.2), rgba(76,175,80,0.05)); border: 1px solid rgba(76,175,80,0.4); }
.result-banner.defeat { background: linear-gradient(135deg, rgba(244,67,54,0.2), rgba(244,67,54,0.05)); border: 1px solid rgba(244,67,54,0.4); }
.result-icon { font-size: 48px; margin-bottom: 10px; }
.result-title { font-size: 28px; font-weight: bold; color: #fff; }

.result-summary {
  background: rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}
.summary-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  font-size: 14px;
}
.summary-item:last-child { border-bottom: none; }
.s-label { color: #aaa; }
.s-value { color: #fff; font-weight: bold; }
.gain { color: #ffd700; }

.battle-summary-log {
  background: rgba(0,0,0,0.3);
  border-radius: 10px;
  padding: 12px;
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 16px;
  font-size: 12px;
  font-family: monospace;
}
.log-title { color: #f093fb; font-size: 13px; margin-bottom: 8px; font-family: sans-serif; }
.log-line { margin: 3px 0; color: #bbb; }

.return-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-weight: bold;
  font-size: 15px;
  cursor: pointer;
}

.match-select h3 { color: #ddd; margin-bottom: 14px; font-size: 16px; }
.no-matches { text-align: center; padding: 30px; color: #888; }
.tip { font-size: 13px; margin-top: 6px; }
.refresh-btn {
  margin-top: 12px;
  padding: 8px 24px;
  background: rgba(102,126,234,0.3);
  border: 1px solid rgba(102,126,234,0.5);
  border-radius: 20px;
  color: #fff;
  cursor: pointer;
}
.match-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
.match-card {
  background: rgba(255,255,255,0.05);
  border: 2px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 14px;
  cursor: pointer;
  transition: all 0.2s;
}
.match-card.selected { border-color: #667eea; background: rgba(102,126,234,0.15); }
.match-teams { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.team {
  flex: 1;
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.team-name { font-size: 13px; font-weight: bold; color: #fff; }
.team-score { font-size: 16px; color: #ffd700; font-weight: bold; }
.vs { color: #666; font-weight: bold; font-size: 12px; }
.match-meta { display: flex; gap: 8px; align-items: center; }
.round-badge { background: rgba(102,126,234,0.3); padding: 2px 8px; border-radius: 8px; font-size: 11px; color: #aaa; }
.status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 8px;
}
.status.ready { background: rgba(76,175,80,0.2); color: #4caf50; }
.status.finished { background: rgba(255,255,255,0.1); color: #aaa; }
.status.pending { background: rgba(255,152,0,0.2); color: #ff9800; }

.start-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #f44336, #e91e63);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-weight: bold;
  font-size: 15px;
  cursor: pointer;
}
.start-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
