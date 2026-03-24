<template>
  <div class="fc-overlay" @click.self="close">
    <div class="fc-panel">
      <!-- 顶部标题栏 -->
      <div class="fc-header">
        <div class="fc-title">
          <span class="fc-icon">🏆</span>
          <span class="fc-name">{{ currentContest?.name || '钓鱼大赛' }}</span>
          <span :class="['fc-badge', statusClass]">{{ statusLabel }}</span>
        </div>
        <div class="fc-timer" v-if="phase !== 'idle'">
          <span class="timer-label">{{ timerLabel }}</span>
          <span class="timer-value">{{ displayTime }}</span>
        </div>
        <button class="fc-close" @click="close">×</button>
      </div>

      <!-- 比赛信息区 -->
      <div class="fc-info-bar">
        <div class="info-cell">
          <div class="ic-label">📍 比赛水域</div>
          <div class="ic-value">{{ currentContest?.pondName || '仙池' }}</div>
        </div>
        <div class="info-cell">
          <div class="ic-label">🎯 目标鱼数</div>
          <div class="ic-value">{{ currentContest?.goal || 20 }}条</div>
        </div>
        <div class="info-cell">
          <div class="ic-label">⏱️ 比赛时长</div>
          <div class="ic-value">{{ currentContest?.duration || 30 }}分钟</div>
        </div>
        <div class="info-cell">
          <div class="ic-label">👥 参赛人数</div>
          <div class="ic-value">{{ leaderboard.length }}人</div>
        </div>
      </div>

      <!-- 我的参赛状态 -->
      <div class="fc-my-status" v-if="joined">
        <div class="ms-left">
          <div class="ms-rank">{{ myRank || '-' }}</div>
          <div class="ms-rank-label">当前排名</div>
        </div>
        <div class="ms-center">
          <div class="ms-name">{{ playerName }}</div>
          <div class="ms-progress">
            <div class="msp-bar"><div class="msp-fill" :style="{width: Math.min(100, myFishCount/contestGoal*100)+'%'}"></div></div>
            <span class="msp-text">{{ myFishCount }}/{{ contestGoal }}鱼</span>
          </div>
        </div>
        <div class="ms-right">
          <div class="ms-bonus" v-if="potentialReward > 0">+{{ potentialReward }}💠</div>
          <div class="ms-pts">🐟 {{ myPoints }}分</div>
        </div>
      </div>

      <!-- 排行榜 -->
      <div class="fc-leaderboard">
        <div class="lb-header">
          <span>🏅 实时排行</span>
          <span class="lb-update" v-if="phase === 'active'">● 实时更新</span>
        </div>
        <div class="lb-list">
          <div v-for="(entry, idx) in leaderboard" :key="entry.playerId"
            :class="['lb-entry', {'me': entry.isMe, 'top3': idx < 3, 'rank-up': entry.rankChange > 0, 'rank-down': entry.rankChange < 0}]">
            <div class="lb-rank">
              <span class="lb-pos" :class="['p'+(idx+1)]">{{ idx+1 }}</span>
              <span class="rank-arrow up" v-if="entry.rankChange > 0">▲{{ entry.rankChange }}</span>
              <span class="rank-arrow down" v-if="entry.rankChange < 0">▼{{ Math.abs(entry.rankChange) }}</span>
            </div>
            <div class="lb-avatar">{{ entry.avatar }}</div>
            <div class="lb-name">{{ entry.name }}</div>
            <div class="lb-fish">
              <span class="fish-icon">🐟</span>
              <span>{{ entry.fishCount }}</span>
            </div>
            <div class="lb-points">+{{ entry.points }}</div>
            <div class="lb-reward-preview" v-if="idx < 3 && phase === 'active'">
              <span class="rp-chip">保底{{ rewardTiers[idx]?.min }}💠</span>
            </div>
          </div>
          <div v-if="leaderboard.length === 0" class="lb-empty">
            暂无参赛者，赶快报名吧！
          </div>
        </div>
      </div>

      <!-- 比赛规则 -->
      <div class="fc-rules">
        <div class="rules-title">📜 比赛规则</div>
        <div class="rules-list">
          <div class="rule-item">• 比赛期间可在指定水域自由钓鱼</div>
          <div class="rule-item">• 钓到的鱼计入比赛成绩，自动上传</div>
          <div class="rule-item">• 比赛结束后按钓鱼数量排名</div>
          <div class="rule-item">• 前三名额外获得排名奖励</div>
          <div class="rule-item" v-if="currentContest?.specialRule">• {{ currentContest.specialRule }}</div>
        </div>
      </div>

      <!-- 奖励预览 -->
      <div class="fc-rewards">
        <div class="rw-title">🎁 排名奖励</div>
        <div class="rw-grid">
          <div v-for="(tier, idx) in rewardTiers" :key="idx" :class="['rw-card', 'tier'+(idx+1), {'won': joined && myRank === idx+1}]">
            <div class="rw-rank">{{ tier.label }}</div>
            <div class="rw-icon">{{ tier.icon }}</div>
            <div class="rw-name">{{ tier.name }}</div>
            <div class="rw-desc">{{ tier.desc }}</div>
            <div class="rw-pts">{{ tier.min }}+💠</div>
          </div>
        </div>
      </div>

      <!-- 底部操作区 -->
      <div class="fc-actions">
        <div class="act-left" v-if="phase === 'idle'">
          <div class="next-info">
            <span class="ni-label">下一场:</span>
            <span class="ni-value">{{ nextContestTime }}</span>
          </div>
        </div>
        <div class="act-left" v-if="phase === 'countdown'">
          <div class="cd-info">距开始: <strong>{{ displayTime }}</strong></div>
        </div>
        <div class="act-left" v-if="phase === 'ended'">
          <div class="ended-info">
            <span v-if="myRank && myRank <= 3" class="ei-win">🎉 获得第{{ myRank }}名！</span>
            <span v-else class="ei-miss">下次继续加油！</span>
          </div>
        </div>
        <div class="act-main">
          <!-- 未报名 -->
          <button v-if="!joined && phase === 'countdown'" class="act-btn register-btn" @click="register">
            🎣 立即报名 ({{ currentContest?.entryFee || 0 }}💠)
          </button>
          <button v-if="!joined && phase === 'idle'" class="act-btn register-btn" disabled>
            🔒 报名未开启
          </button>
          <!-- 已报名/参赛中 -->
          <button v-if="joined && phase === 'active'" class="act-btn fishing-btn" @click="goFishing">
            🎣 去钓鱼
          </button>
          <button v-if="joined && phase === 'countdown'" class="act-btn ready-btn" disabled>
            ✅ 已报名
          </button>
          <!-- 比赛结束 -->
          <button v-if="joined && phase === 'ended' && myRank && myRank <= 3" class="act-btn claim-btn" @click="claimReward">
            🎁 领取奖励
          </button>
          <button v-if="joined && phase === 'ended' && (!myRank || myRank > 3)" class="act-btn done-btn" disabled>
            已结束
          </button>
          <button v-if="!joined && phase === 'active'" class="act-btn spectate-btn" @click="spectate">
            👁️ 观战
          </button>
        </div>
      </div>

      <!-- 排名跃升动画 -->
      <transition name="rank-pop">
        <div v-if="rankUpNotif" class="rank-notif">
          <div class="rn-icon">🚀</div>
          <div class="rn-text">{{ rankUpNotif }}</div>
        </div>
      </transition>

      <!-- 奖励领取成功 -->
      <transition name="reward-pop">
        <div v-if="showRewardClaim" class="reward-claim-ov">
          <div class="rc-box">
            <div class="rc-title">🎉 奖励发放</div>
            <div class="rc-items">
              <div class="rc-item" v-for="r in claimResult" :key="r.name">
                <span class="rc-icon">{{ r.icon }}</span>
                <span class="rc-name">{{ r.name }}</span>
                <span class="rc-count">×{{ r.count }}</span>
              </div>
            </div>
            <button class="rc-close-btn" @click="showRewardClaim=false">确定</button>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const emit = defineEmits(['close', 'go-fishing'])

const playerName = ref('逍遥子')
const phase = ref('countdown') // idle | countdown | active | ended
const currentContest = ref({
  name: '春季钓鱼大赛',
  pondName: '仙池',
  goal: 20,
  duration: 30,
  entryFee: 50,
  specialRule: '传说鱼计双倍',
})

// Timer state
const timerSecs = ref(47) // seconds remaining
const displayTime = ref('00:47')
let timerInterval = null

// Leaderboard
const leaderboard = ref([
  { playerId: 'p1', name: '东海龙王', avatar: '🐲', fishCount: 14, points: 420, isMe: false, rankChange: 0 },
  { playerId: 'p2', name: '小鱼儿', avatar: '🧜', fishCount: 12, points: 360, isMe: false, rankChange: 1 },
  { playerId: 'p3', name: '逍遥子', avatar: '🧘', fishCount: 11, points: 330, isMe: true, rankChange: -1 },
  { playerId: 'p4', name: '白眉道长', avatar: '👴', fishCount: 9, points: 270, isMe: false, rankChange: 0 },
  { playerId: 'p5', name: '小青', avatar: '🐍', fishCount: 7, points: 210, isMe: false, rankChange: 2 },
  { playerId: 'p6', name: '昆仑弟子', avatar: '🥋', fishCount: 5, points: 150, isMe: false, rankChange: 0 },
])

const joined = ref(false)
const myRank = computed(() => {
  const idx = leaderboard.value.findIndex(e => e.isMe)
  return idx >= 0 ? idx + 1 : null
})
const myFishCount = computed(() => leaderboard.value.find(e => e.isMe)?.fishCount || 0)
const myPoints = computed(() => leaderboard.value.find(e => e.isMe)?.points || 0)
const contestGoal = computed(() => currentContest.value?.goal || 20)
const potentialReward = computed(() => {
  if (!myRank.value) return 0
  return rewardTiers[myRank.value - 1]?.min || 0
})
const nextContestTime = ref('每周六 20:00')

const rewardTiers = [
  { label: '🥇 第一名', icon: '👑', name: '冠军', desc: '传说鱼饵×3 + 钓分×3', min: 500 },
  { label: '🥈 第二名', icon: '🥈', name: '亚军', desc: '传说鱼饵×1 + 钓分×2', min: 300 },
  { label: '🥉 第三名', icon: '🥉', name: '季军', desc: '高级鱼饵×2 + 钓分×1', min: 150 },
]

const statusClass = computed(() => ({
  idle: 's-idle',
  countdown: 's-countdown',
  active: 's-active',
  ended: 's-ended',
}[phase.value]))

const statusLabel = computed(() => ({
  idle: '未开始',
  countdown: '报名中',
  active: '进行中',
  ended: '已结束',
}[phase.value]))

const timerLabel = computed(() => phase.value === 'countdown' ? '距开始' : phase.value === 'active' ? '剩余时间' : '已结束')

const showRewardClaim = ref(false)
const claimResult = ref([])
const rankUpNotif = ref('')
let rankUpTimer = null

function close() { emit('close') }

function formatTime(secs) {
  if (secs < 0) secs = 0
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function register() {
  joined.value = true
  // Add me to leaderboard if not present
  if (!leaderboard.value.find(e => e.isMe)) {
    leaderboard.value.push({ playerId: 'me', name: playerName.value, avatar: '🧘', fishCount: 0, points: 0, isMe: true, rankChange: 0 })
  }
}

function goFishing() { emit('go-fishing') }

function spectate() { /* watch mode - just observe */ }

// Simulate leaderboard updates during active phase
function simulateUpdates() {
  if (phase.value !== 'active') return
  leaderboard.value.forEach(e => {
    if (!e.isMe && Math.random() < 0.3) {
      const fishGain = Math.floor(Math.random() * 3) + 1
      const ptsGain = fishGain * 30
      e.fishCount += fishGain
      e.points += ptsGain
      // Random rank change
      if (Math.random() < 0.2) {
        e.rankChange = Math.floor(Math.random() * 3) - 1
      }
    }
  })
  // Re-sort by fish count descending
  leaderboard.value.sort((a, b) => b.fishCount - a.fishCount)
  // Check rank changes
  const myEntry = leaderboard.value.find(e => e.isMe)
  if (myEntry) {
    const oldRank = myRank.value
    const newRank = leaderboard.value.indexOf(myEntry) + 1
    if (oldRank && newRank < oldRank) {
      rankUpNotif.value = `排名上升至第${newRank}名！`
      if (rankUpTimer) clearTimeout(rankUpTimer)
      rankUpTimer = setTimeout(() => { rankUpNotif.value = '' }, 3000)
    }
  }
  // Legendary fish counts double
  if (leaderboard.value[0] && leaderboard.value[0].fishCount > 5) {
    // Top player gets legendary bonus occasionally
    if (Math.random() < 0.1) {
      const top = leaderboard.value[0]
      top.fishCount += 2 // legendary double
      top.points += 60
    }
  }
}

function claimReward() {
  const tier = rewardTiers[myRank.value - 1]
  if (!tier) return
  claimResult.value = [
    { name: '钓鱼积分', icon: '💠', count: tier.min },
    { name: '高级鱼饵', icon: '🪤', count: myRank.value === 1 ? 3 : myRank.value === 2 ? 1 : 2 },
    { name: '称号: ' + tier.name, icon: '🏅', count: 1 },
  ]
  showRewardClaim.value = true
}

onMounted(() => {
  // Start countdown simulation
  timerInterval = setInterval(() => {
    if (phase.value === 'countdown') {
      timerSecs.value--
      displayTime.value = formatTime(timerSecs.value)
      if (timerSecs.value <= 0) {
        phase.value = 'active'
        timerSecs.value = (currentContest.value?.duration || 30) * 60
        displayTime.value = formatTime(timerSecs.value)
      }
    } else if (phase.value === 'active') {
      timerSecs.value--
      displayTime.value = formatTime(timerSecs.value)
      if (timerSecs.value % 30 === 0) simulateUpdates()
      if (timerSecs.value <= 0) {
        phase.value = 'ended'
        displayTime.value = '00:00'
      }
    }
  }, 1000)
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
  if (rankUpTimer) clearTimeout(rankUpTimer)
})
</script>

<style scoped>
.fc-overlay { position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.75); display:flex; align-items:center; justify-content:center; z-index:9000; backdrop-filter:blur(4px); }
.fc-panel { width:680px; max-height:90vh; overflow-y:auto; background:linear-gradient(160deg,#0c1445 0%,#1a0a30 100%); border-radius:20px; border:1px solid rgba(102,126,234,0.3); color:#fff; font-family:'Microsoft YaHei',sans-serif; display:flex; flex-direction:column; gap:0; position:relative; scrollbar-width:thin; scrollbar-color:#667eea transparent; }
.fc-panel::-webkit-scrollbar { width:6px; }
.fc-panel::-webkit-scrollbar-thumb { background:#667eea; border-radius:3px; }

/* Header */
.fc-header { display:flex; align-items:center; padding:18px 20px; border-bottom:1px solid rgba(255,255,255,0.08); }
.fc-title { display:flex; align-items:center; gap:10px; flex:1; }
.fc-icon { font-size:26px; }
.fc-name { font-size:20px; font-weight:bold; background:linear-gradient(90deg,#f093fb,#fbbf24); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
.fc-badge { font-size:11px; padding:3px 10px; border-radius:20px; font-weight:bold; }
.s-idle { background:rgba(156,163,175,0.2); color:#9ca3af; }
.s-countdown { background:rgba(251,191,36,0.2); color:#fbbf24; animation:pulse-badge 1.5s infinite; }
.s-active { background:rgba(52,211,153,0.2); color:#34d399; animation:pulse-badge 2s infinite; }
.s-ended { background:rgba(239,68,68,0.2); color:#f87171; }
@keyframes pulse-badge { 0%,100%{opacity:1} 50%{opacity:0.7} }
.fc-timer { display:flex; flex-direction:column; align-items:center; margin-right:15px; }
.timer-label { font-size:10px; color:rgba(255,255,255,0.4); }
.timer-value { font-size:22px; font-weight:bold; color:#ffd700; font-variant-numeric:tabular-nums; }
.fc-close { background:rgba(255,255,255,0.08); border:none; color:#fff; width:32px; height:32px; border-radius:50%; font-size:20px; cursor:pointer; margin-left:10px; }
.fc-close:hover { background:rgba(255,100,100,0.3); }

/* Info bar */
.fc-info-bar { display:flex; background:rgba(255,255,255,0.04); margin:14px 20px 0; border-radius:12px; padding:12px; gap:0; }
.info-cell { flex:1; text-align:center; border-right:1px solid rgba(255,255,255,0.06); }
.info-cell:last-child { border-right:none; }
.ic-label { font-size:10px; color:rgba(255,255,255,0.4); margin-bottom:4px; }
.ic-value { font-size:14px; font-weight:bold; color:#f093fb; }

/* My status */
.fc-my-status { display:flex; align-items:center; gap:14px; margin:14px 20px 0; padding:14px; background:linear-gradient(135deg,rgba(102,126,234,0.15),rgba(118,75,162,0.15)); border-radius:14px; border:1px solid rgba(102,126,234,0.25); }
.ms-left { text-align:center; min-width:60px; }
.ms-rank { font-size:32px; font-weight:bold; color:#fbbf24; }
.ms-rank-label { font-size:10px; color:rgba(255,255,255,0.4); }
.ms-center { flex:1; }
.ms-name { font-size:14px; font-weight:bold; margin-bottom:6px; }
.ms-progress { display:flex; align-items:center; gap:8px; }
.msp-bar { flex:1; height:8px; background:rgba(255,255,255,0.1); border-radius:4px; overflow:hidden; }
.msp-fill { height:100%; background:linear-gradient(90deg,#34d399,#667eea); border-radius:4px; transition:width 0.5s; }
.msp-text { font-size:11px; color:rgba(255,255,255,0.6); min-width:55px; }
.ms-right { text-align:right; }
.ms-bonus { font-size:16px; color:#fbbf24; font-weight:bold; }
.ms-pts { font-size:12px; color:rgba(255,255,255,0.5); margin-top:3px; }

/* Leaderboard */
.fc-leaderboard { margin:14px 20px 0; }
.lb-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; font-size:13px; font-weight:bold; }
.lb-update { font-size:10px; color:#34d399; animation:blink-dot 1s infinite; }
@keyframes blink-dot { 0%,100%{opacity:1} 50%{opacity:0.3} }
.lb-list { display:flex; flex-direction:column; gap:4px; max-height:260px; overflow-y:auto; }
.lb-entry { display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:10px; background:rgba(255,255,255,0.04); transition:all 0.3s; }
.lb-entry.top3 { background:rgba(255,255,255,0.07); }
.lb-entry.me { background:rgba(102,126,234,0.15); border:1px solid rgba(102,126,234,0.3); }
.lb-entry.rank-up .rank-arrow.up { color:#34d399; }
.lb-entry.rank-down .rank-arrow.down { color:#f87171; }
.lb-rank { display:flex; flex-direction:column; align-items:center; min-width:36px; }
.lb-pos { font-size:16px; font-weight:bold; }
.lb-pos.p1 { color:#fbbf24; }
.lb-pos.p2 { color:#c0c0c0; }
.lb-pos.p3 { color:#cd7f32; }
.lb-pos.p4,.lb-pos.p5,.lb-pos.p6 { color:rgba(255,255,255,0.4); }
.rank-arrow { font-size:9px; }
.lb-avatar { font-size:20px; }
.lb-name { flex:1; font-size:13px; font-weight:bold; }
.lb-name.me::after { content:' (我)'; color:#667eea; font-weight:normal; font-size:11px; }
.lb-fish { display:flex; align-items:center; gap:4px; color:#a78bfa; font-size:13px; min-width:40px; }
.fish-icon { font-size:14px; }
.lb-points { font-size:12px; color:#fbbf24; min-width:50px; text-align:right; }
.lb-reward-preview { min-width:70px; text-align:right; }
.rp-chip { font-size:9px; background:rgba(251,191,36,0.15); color:#fbbf24; padding:2px 6px; border-radius:8px; }
.lb-empty { text-align:center; padding:20px; color:rgba(255,255,255,0.4); font-size:13px; }

/* Rules */
.fc-rules { margin:14px 20px 0; }
.rules-title { font-size:12px; color:rgba(255,255,255,0.5); margin-bottom:6px; font-weight:bold; }
.rules-list { background:rgba(255,255,255,0.03); border-radius:10px; padding:10px 14px; }
.rule-item { font-size:11px; color:rgba(255,255,255,0.55); line-height:1.8; }

/* Rewards */
.fc-rewards { margin:14px 20px 0; }
.rw-title { font-size:12px; color:rgba(255,255,255,0.5); margin-bottom:8px; font-weight:bold; }
.rw-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
.rw-card { padding:12px 8px; border-radius:12px; text-align:center; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06); }
.rw-card.tier1 { border-color:rgba(251,191,36,0.3); background:rgba(251,191,36,0.05); }
.rw-card.tier2 { border-color:rgba(192,192,192,0.25); background:rgba(192,192,192,0.03); }
.rw-card.tier3 { border-color:rgba(205,127,50,0.25); background:rgba(205,127,50,0.03); }
.rw-card.won { box-shadow:0 0 20px rgba(251,191,36,0.3); }
.rw-rank { font-size:10px; margin-bottom:4px; color:rgba(255,255,255,0.5); }
.rw-icon { font-size:24px; margin-bottom:4px; }
.rw-name { font-size:12px; font-weight:bold; margin-bottom:3px; }
.rw-desc { font-size:9px; color:rgba(255,255,255,0.4); margin-bottom:4px; line-height:1.4; }
.rw-pts { font-size:11px; color:#fbbf24; }

/* Actions */
.fc-actions { display:flex; align-items:center; gap:12px; padding:16px 20px; margin-top:14px; border-top:1px solid rgba(255,255,255,0.08); }
.act-left { flex:1; }
.next-info, .cd-info, .ended-info { font-size:13px; color:rgba(255,255,255,0.6); }
.ni-value { color:#ffd700; font-weight:bold; }
.cd-info strong { color:#fbbf24; }
.ei-win { color:#fbbf24; font-weight:bold; font-size:14px; }
.act-main { flex:2; display:flex; gap:8px; }
.act-btn { flex:1; padding:12px 16px; border:none; border-radius:12px; font-size:14px; font-weight:bold; cursor:pointer; transition:all 0.2s; }
.register-btn { background:linear-gradient(135deg,#667eea,#764ba2); color:#fff; }
.register-btn:hover { transform:translateY(-1px); box-shadow:0 4px 15px rgba(102,126,234,0.4); }
.register-btn:disabled { opacity:0.4; cursor:not-allowed; transform:none; }
.fishing-btn { background:linear-gradient(135deg,#34d399,#667eea); color:#fff; }
.fishing-btn:hover { transform:translateY(-1px); box-shadow:0 4px 15px rgba(52,211,153,0.4); }
.ready-btn { background:rgba(52,211,153,0.2); color:#34d399; cursor:default; }
.claim-btn { background:linear-gradient(135deg,#fbbf24,#f97316); color:#fff; animation:claim-glow 1.5s infinite; }
@keyframes claim-glow { 0%,100%{box-shadow:0 0 0 0 rgba(251,191,36,0.4)} 50%{box-shadow:0 0 0 10px rgba(251,191,36,0)} }
.done-btn { background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.4); cursor:default; }
.spectate-btn { background:rgba(255,255,255,0.08); color:#fff; border:1px solid rgba(255,255,255,0.1); }
.spectate-btn:hover { background:rgba(255,255,255,0.12); }

/* Rank up notification */
.rank-notif { position:absolute; top:80px; left:50%; transform:translateX(-50%); background:linear-gradient(135deg,rgba(52,211,153,0.95),rgba(102,126,234,0.95)); border-radius:30px; padding:10px 24px; display:flex; align-items:center; gap:8px; z-index:10; box-shadow:0 4px 20px rgba(52,211,153,0.4); }
.rn-icon { font-size:20px; }
.rn-text { font-size:14px; font-weight:bold; white-space:nowrap; }
.rank-pop-enter-active { animation:rankPopIn 0.4s ease-out; }
.rank-pop-leave-active { animation:rankPopOut 0.3s ease-in; }
@keyframes rankPopIn { 0%{transform:translateX(-50%) translateY(-20px); opacity:0} 100%{transform:translateX(-50%) translateY(0); opacity:1} }
@keyframes rankPopOut { 0%{transform:translateX(-50%); opacity:1} 100%{transform:translateX(-50%) translateY(-10px); opacity:0} }

/* Reward claim overlay */
.reward-claim-ov { position:absolute; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:20; }
.rc-box { background:linear-gradient(160deg,#1a0a40,#0c1445); border:2px solid #fbbf24; border-radius:20px; padding:28px 32px; text-align:center; min-width:300px; box-shadow:0 0 50px rgba(251,191,36,0.3); }
.rc-title { font-size:20px; font-weight:bold; color:#fbbf24; margin-bottom:20px; }
.rc-items { display:flex; flex-direction:column; gap:10px; margin-bottom:20px; }
.rc-item { display:flex; align-items:center; gap:10px; padding:10px; background:rgba(255,255,255,0.05); border-radius:10px; }
.rc-icon { font-size:22px; }
.rc-name { flex:1; text-align:left; font-size:13px; }
.rc-count { font-size:14px; color:#fbbf24; font-weight:bold; }
.rc-close-btn { width:100%; padding:10px; background:linear-gradient(135deg,#fbbf24,#f97316); border:none; border-radius:10px; color:#fff; font-size:14px; font-weight:bold; cursor:pointer; }
.reward-pop-enter-active { animation:rewardPopIn 0.4s ease-out; }
.reward-pop-leave-active { animation:rewardPopOut 0.3s ease-in; }
@keyframes rewardPopIn { 0%{transform:scale(0.7); opacity:0} 70%{transform:scale(1.05)} 100%{transform:scale(1); opacity:1} }
@keyframes rewardPopOut { 0%{transform:scale(1); opacity:1} 100%{transform:scale(0.8); opacity:0} }
</style>
