<template>
  <BasePanel
    title="每日签到"
    icon="📝"
    :tab-items="tabs"
    :default-tab="activeTab"
    variant="primary"
    @tab-change="activeTab = $event"
    @close="$emit('close')"
  >
    <!-- ====== 每日签到 Tab ====== -->
    <div v-if="activeTab === 'daily'" class="daily-tab">

      <!-- 连续签到状态 -->
      <div class="streak-card">
        <div class="streak-left">
          <span class="streak-fire">🔥</span>
          <div>
            <div class="streak-num">{{ signData.currentStreak || 0 }}</div>
            <div class="streak-lbl">连续签到</div>
          </div>
        </div>
        <div class="streak-right" :class="{ signed: signData.todaySigned }">
          {{ signData.todaySigned ? '✅ 今日已签到' : '📝 今日未签到' }}
        </div>
      </div>

      <!-- 签到按钮 / 已签到提示 -->
      <div class="sign-action">
        <BaseButton
          v-if="!signData.todaySigned"
          variant="primary"
          block
          :loading="signing"
          @click="handleSignIn"
        >
          ✨ {{ signing ? '签到中...' : '立即签到' }}
          <span v-if="todayReward" class="btn-reward">+{{ todayReward }}灵石</span>
        </BaseButton>
        <div v-else class="signed-banner">
          <span class="banner-icon">🎉</span>
          <span class="banner-text">今日已签到</span>
          <p class="banner-hint">明天再来领取更多奖励吧~</p>
        </div>
      </div>

      <!-- 7天奖励循环 -->
      <div class="section-lbl">🎁 每日签到奖励</div>
      <div class="reward-row">
        <div
          v-for="(r, i) in weekRewards" :key="i"
          class="day-cell"
          :class="{
            'day-signed': r.signed,
            'day-today': r.isToday,
            'day-claim': r.canClaim && !signData.todaySigned
          }"
          @click="handleClaimDay(r)"
        >
          <span class="day-num">第{{ i + 1 }}天</span>
          <span class="day-icon">{{ r.icon }}</span>
          <span class="day-amt">{{ r.amount }}</span>
          <span class="day-status">
            <span v-if="r.signed" class="st-ok">✓</span>
            <span v-else-if="r.canClaim && !signData.todaySigned" class="st-claim">领</span>
            <span v-else-if="r.isToday && !signData.todaySigned" class="st-dot"></span>
          </span>
        </div>
      </div>

      <!-- 累计奖励 -->
      <div class="section-lbl">🏆 累计签到奖励</div>
      <div class="cum-list">
        <div
          v-for="c in cumulativeRewards" :key="c.days"
          class="cum-row"
          :class="{ 'cum-done': c.claimed, 'cum-ready': signData.currentStreak >= c.days && !c.claimed }"
          @click="handleClaimCumulative(c)"
        >
          <span class="cum-days">{{ c.days }}天</span>
          <span class="cum-icon">{{ c.icon }}</span>
          <span class="cum-name">{{ c.name }}</span>
          <span v-if="c.claimed" class="cum-st st-ok">✓</span>
          <BaseButton v-else-if="signData.currentStreak >= c.days" variant="gold" size="sm">领</BaseButton>
          <span v-else class="cum-st">—</span>
        </div>
      </div>

      <!-- 补签卡提示 -->
      <div v-if="signData.repairCards > 0" class="repair-hint">
        💳 补签卡: {{ signData.repairCards }} 张
      </div>
    </div>

    <!-- ====== 补签 Tab ====== -->
    <div v-else-if="activeTab === 'makeup'" class="makeup-tab">
      <div class="repair-info">
        <span>💳 可用补签卡: <strong>{{ signData.repairCards || 0 }}</strong> 张</span>
      </div>

      <!-- 月份选择 -->
      <div class="month-nav">
        <button class="month-btn" @click="changeMonth(-1)">◀</button>
        <span class="month-label">{{ monthLabel }}</span>
        <button class="month-btn" @click="changeMonth(1)">▶</button>
      </div>

      <!-- 日历网格 -->
      <div class="cal-grid">
        <div v-for="d in ['一','二','三','四','五','六','日']" :key="d" class="cal-hd">{{ d }}</div>
        <!-- 空白填充 -->
        <div v-for="_ in firstDayOffset" :key="'blank'+_"></div>
        <!-- 日期格子 -->
        <div
          v-for="day in daysInMonth" :key="day"
          class="cal-cell"
          :class="{
            'cal-signed': isSigned(day),
            'cal-today': isToday(day),
            'cal-missed': isMissed(day),
            'cal-future': isFuture(day)
          }"
          @click="selectMakeupDay(day)"
        >
          <span>{{ day }}</span>
          <span v-if="isSigned(day)" class="cal-check">✓</span>
          <span v-else-if="isMissed(day)" class="cal-miss">补</span>
        </div>
      </div>

      <div v-if="selectedMakeupDay" class="makeup-action">
        <p class="makeup-info">
          补签 <strong>{{ selectedMakeupDay }}</strong> 日将消耗 1 张补签卡
        </p>
        <BaseButton variant="primary" :loading="makeupLoading" block @click="handleMakeup">
          确认补签
        </BaseButton>
      </div>
    </div>

    <!-- ====== 签到记录 Tab ====== -->
    <div v-else-if="activeTab === 'history'" class="history-tab">
      <div v-if="signHistory.length === 0" class="empty-box">
        <p>暂无签到记录</p>
      </div>
      <div v-else class="history-list">
        <div
          v-for="h in signHistory" :key="h.date"
          class="history-row"
          :class="{ 'h-makeup': h.makeup }"
        >
          <span class="h-date">{{ h.date }}</span>
          <span class="h-day">第{{ h.day }}天</span>
          <span class="h-reward">
            💰 {{ h.reward?.lingshi || 0 }}灵石
            <span v-if="h.reward?.equipment">+ 装备</span>
          </span>
          <span v-if="h.makeup" class="h-badge">补</span>
        </div>
      </div>
    </div>

  </BasePanel>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { welfareApi } from '../api/index.js'
import { useToast } from './common/toastComposable.js'
import BasePanel from './base/BasePanel.vue'
import BaseButton from './base/BaseButton.vue'

const emit = defineEmits(['close'])

const toast = useToast()
const activeTab = ref('daily')
const signing = ref(false)
const makeupLoading = ref(false)

// ── Tabs ──────────────────────────────────────────────
const tabs = [
  { id: 'daily',   name: '每日签到', icon: '✨' },
  { id: 'makeup',  name: '补签',    icon: '💳' },
  { id: 'history', name: '记录',    icon: '📜' },
]

// ── Sign data ──────────────────────────────────────────
const signData = ref({
  currentStreak: 0,
  todaySigned: false,
  repairCards: 0,
  nextReward: null,
})

const todayReward = computed(() => signData.value.nextReward?.lingshi || 0)

// 7天循环奖励
const weekRewards = ref([])
const cumulativeRewards = ref([])
const signHistory = ref([])

// ── Calendar ───────────────────────────────────────────
const calMonth = ref(new Date())
const selectedMakeupDay = ref(null)

const monthLabel = computed(() => {
  const d = calMonth.value
  return `${d.getFullYear()}年${d.getMonth() + 1}月`
})

const daysInMonth = computed(() => {
  return new Date(calMonth.value.getFullYear(), calMonth.value.getMonth() + 1, 0).getDate()
})

// 获取本月1号是星期几（周一=0）
const firstDayOffset = computed(() => {
  const d = new Date(calMonth.value.getFullYear(), calMonth.value.getMonth(), 1)
  return (d.getDay() + 6) % 7
})

const todayStr = computed(() => new Date().toISOString().split('T')[0])

function isSigned(day) {
  const date = fmtDate(calMonth.value.getFullYear(), calMonth.value.getMonth() + 1, day)
  return signHistory.value.some(h => h.date === date)
}

function isToday(day) {
  return fmtDate(calMonth.value.getFullYear(), calMonth.value.getMonth() + 1, day) === todayStr.value
}

function isMissed(day) {
  const date = fmtDate(calMonth.value.getFullYear(), calMonth.value.getMonth() + 1, day)
  const d = new Date(date)
  const today = new Date(todayStr.value)
  return d < today && !isSigned(day)
}

function isFuture(day) {
  const date = fmtDate(calMonth.value.getFullYear(), calMonth.value.getMonth() + 1, day)
  return date > todayStr.value
}

function fmtDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function selectMakeupDay(day) {
  if (!isMissed(day)) return
  selectedMakeupDay.value = day
}

function changeMonth(delta) {
  const d = new Date(calMonth.value)
  d.setMonth(d.getMonth() + delta)
  // 不允许选择未来月份
  const today = new Date()
  if (d.getFullYear() > today.getFullYear() ||
      (d.getFullYear() === today.getFullYear() && d.getMonth() > today.getMonth())) {
    return
  }
  calMonth.value = d
  selectedMakeupDay.value = null
}

// ── API calls ──────────────────────────────────────────
async function loadConfig() {
  try {
    const res = await welfareApi.getConfig()
    if (res.data?.data?.rewards) {
      const todayDow = (new Date().getDay() + 6) % 7 // Mon=0
      weekRewards.value = res.data.data.rewards.map((r, i) => ({
        ...r,
        icon: r.equipment ? '🎁' : '💰',
        amount: r.lingshi,
        unit: '灵石',
        isToday: i === todayDow,
        signed: false,
        canClaim: false,
      }))
    }
  } catch (e) {
    // use defaults
    setDefaultRewards()
  }
}

function setDefaultRewards() {
  const defaults = [
    { amount: 100, unit: '灵石', icon: '💰' },
    { amount: 150, unit: '灵石', icon: '💰' },
    { amount: 200, unit: '灵石', icon: '💰' },
    { amount: 5,    unit: '经验丹', icon: '⚗️' },
    { amount: 250, unit: '灵石', icon: '💰' },
    { amount: 300, unit: '灵石', icon: '💰' },
    { amount: 10,  unit: '钻石', icon: '💎' },
  ]
  const todayDow = (new Date().getDay() + 6) % 7
  weekRewards.value = defaults.map((r, i) => ({
    ...r,
    isToday: i === todayDow,
    signed: false,
    canClaim: false,
  }))
  cumulativeRewards.value = [
    { days: 7,  icon: '💰', name: '500灵石',   claimed: false },
    { days: 14, icon: '⚗️', name: '中级经验丹x3', claimed: false },
    { days: 21, icon: '💎', name: '50钻石',    claimed: false },
    { days: 30, icon: '🎁', name: '豪华礼包',  claimed: false },
  ]
}

async function loadStatus() {
  try {
    const pid = getPlayerId()
    const res = await welfareApi.getSignInStatus(pid)
    if (res.data?.data) {
      const d = res.data.data
      signData.value.currentStreak = d.currentStreak || 0
      signData.value.todaySigned = d.todaySigned || false
      signData.value.repairCards = d.repairCards || 0
      signData.value.nextReward = d.nextReward || null

      // 更新weekRewards签到状态
      if (d.signedDays?.length && weekRewards.value.length) {
        weekRewards.value.forEach((r, i) => {
          r.signed = d.signedDays.includes(i + 1)
        })
      }

      // 更新累计奖励状态
      if (d.cumulativeClaimed?.length) {
        cumulativeRewards.value.forEach(c => {
          c.claimed = d.cumulativeClaimed.includes(c.days)
        })
      }
    }
  } catch (e) {
    toast.error('加载签到状态失败')
  }
}

async function loadHistory() {
  try {
    const pid = getPlayerId()
    const res = await welfareApi.getHistory(pid)
    if (res.data?.data) {
      signHistory.value = res.data.data
    }
  } catch (e) {
    // ignore
  }
}

function getPlayerId() {
  return window.gamePlayerId || 1
}

// ── Actions ────────────────────────────────────────────
async function handleSignIn() {
  if (signing.value || signData.value.todaySigned) return
  signing.value = true
  try {
    const pid = getPlayerId()
    const res = await welfareApi.claimSignIn(pid)
    if (res.data?.success) {
      signData.value.todaySigned = true
      signData.value.currentStreak = res.data.data?.streak || signData.value.currentStreak + 1
      signData.value.repairCards = res.data.data?.repairCard
        ? (signData.value.repairCards + res.data.data.repairCard)
        : signData.value.repairCards

      const reward = res.data.data?.reward
      const rewardText = Array.isArray(res.data.data?.rewards)
        ? res.data.data.rewards.map(r => r.description || r.lingshi).join(', ')
        : (reward?.lingshi ? `${reward.lingshi}灵石` : '奖励')

      toast.success(`签到成功！连续签到${signData.value.currentStreak}天`)
      if (res.data.data?.rewards?.length) {
        toast.reward(`获得: ${rewardText}`)
      }

      // 更新当日状态
      const todayDow = (new Date().getDay() + 6) % 7
      if (weekRewards.value[todayDow]) {
        weekRewards.value[todayDow].signed = true
        weekRewards.value[todayDow].canClaim = false
      }

      await loadHistory()
    } else {
      toast.error(res.data?.error || res.data?.message || '签到失败')
    }
  } catch (e) {
    toast.error('签到失败，请稍后重试')
  } finally {
    signing.value = false
  }
}

async function handleClaimDay(r) {
  if (r.signed) return
  if (!signData.value.todaySigned) {
    await handleSignIn()
  }
}

async function handleClaimCumulative(c) {
  if (c.claimed || signData.value.currentStreak < c.days) return
  try {
    const pid = getPlayerId()
    const res = await welfareApi.claimCumulative(pid, c.days)
    if (res.data?.success) {
      c.claimed = true
      toast.reward(`累计${c.days}天奖励领取成功！`)
    } else {
      toast.error(res.data?.error || res.data?.message || '领取失败')
    }
  } catch (e) {
    toast.error('领取失败，请重试')
  }
}

async function handleMakeup() {
  if (!selectedMakeupDay.value || signData.value.repairCards <= 0) return
  makeupLoading.value = true
  try {
    const pid = getPlayerId()
    const targetDate = fmtDate(
      calMonth.value.getFullYear(),
      calMonth.value.getMonth() + 1,
      selectedMakeupDay.value
    )
    const res = await welfareApi.makeupSign(pid, targetDate)
    if (res.data?.success) {
      signData.value.repairCards--
      toast.success(res.data.message || '补签成功')
      selectedMakeupDay.value = null
      await loadHistory()
      await loadStatus()
    } else {
      toast.error(res.data?.error || res.data?.message || '补签失败')
    }
  } catch (e) {
    toast.error('补签失败，请重试')
  } finally {
    makeupLoading.value = false
  }
}

// ── Init ───────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([loadConfig(), loadStatus(), loadHistory()])
})
</script>

<style scoped>
/* ── Streak card ── */
.streak-card {
  display: flex; align-items: center; justify-content: space-between;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(0,255,136,0.2);
  border-radius: 12px; padding: 14px 16px; margin-bottom: 14px;
}
.streak-left { display: flex; align-items: center; gap: 10px; }
.streak-fire { font-size: 28px; }
.streak-num { font-size: 26px; font-weight: bold; color: #ffd700; line-height: 1; }
.streak-lbl { font-size: 11px; color: #a89cc8; }
.streak-right {
  padding: 5px 12px; border-radius: 20px; font-size: 12px;
  background: rgba(255,68,68,0.2); color: #ff4444;
}
.streak-right.signed { background: rgba(0,255,136,0.2); color: #00ff88; }

/* ── Sign action ── */
.sign-action { margin-bottom: 16px; }
.btn-reward { color: #ffe0a0; font-size: 13px; margin-left: 4px; }
.signed-banner {
  text-align: center; padding: 16px;
  background: rgba(0,255,136,0.08); border: 1px solid rgba(0,255,136,0.3);
  border-radius: 12px;
}
.banner-icon { font-size: 28px; display: block; margin-bottom: 6px; }
.banner-text { font-size: 16px; color: #00ff88; font-weight: bold; }
.banner-hint { font-size: 12px; color: #a89cc8; margin: 6px 0 0; }

/* ── Section label ── */
.section-lbl { font-size: 13px; color: #ffd700; margin: 16px 0 8px; }

/* ── 7-day reward row ── */
.reward-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.day-cell {
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; padding: 8px 2px; text-align: center; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  transition: all 0.2s; font-size: 11px; position: relative;
}
.day-cell:hover { background: rgba(102,126,234,0.2); }
.day-signed { background: rgba(0,255,136,0.1) !important; border-color: rgba(0,255,136,0.4) !important; }
.day-today { border-color: #ffd700 !important; box-shadow: 0 0 8px rgba(255,215,0,0.3); }
.day-claim { animation: pulseCell 1.5s infinite; }
@keyframes pulseCell { 0%,100%{transform:scale(1)} 50%{transform:scale(1.03)} }
.day-num { font-size: 10px; color: #888; }
.day-icon { font-size: 16px; }
.day-amt { font-size: 10px; color: #e9d5ff; }
.day-status { position: absolute; top: 2px; right: 2px; }
.st-ok { color: #00ff88; font-size: 10px; font-weight: bold; }
.st-claim { background: #ffd700; color: #000; font-size: 9px; font-weight: bold; width: 14px; height: 14px; border-radius: 50%; display: inline-block; line-height: 14px; text-align: center; }
.st-dot { width: 6px; height: 6px; background: #ffd700; border-radius: 50%; display: inline-block; animation: blinkDot 1s infinite; }
@keyframes blinkDot { 0%,100%{opacity:1} 50%{opacity:0.2} }

/* ── Cumulative rewards ── */
.cum-list { display: flex; flex-direction: column; gap: 8px; }
.cum-row {
  display: flex; align-items: center; gap: 10px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px; padding: 12px 14px; cursor: pointer; transition: all 0.2s;
}
.cum-row:hover { background: rgba(102,126,234,0.15); }
.cum-done { background: rgba(0,255,136,0.08) !important; border-color: rgba(0,255,136,0.3) !important; cursor: default; }
.cum-ready { border-color: rgba(255,215,0,0.4) !important; }
.cum-days { font-size: 14px; font-weight: bold; color: #ffd700; min-width: 40px; }
.cum-icon { font-size: 20px; }
.cum-name { flex: 1; font-size: 13px; color: #e8d5f0; }
.cum-st { font-size: 13px; color: #a89cc8; }

/* ── Repair hint ── */
.repair-hint {
  margin-top: 14px; font-size: 12px; color: #a89cc8;
  background: rgba(147,51,234,0.1); border: 1px solid rgba(147,51,234,0.2);
  border-radius: 8px; padding: 8px 12px; text-align: center;
}

/* ── Makeup tab ── */
.repair-info { font-size: 13px; color: #a89cc8; margin-bottom: 12px; }
.repair-info strong { color: #ffd700; }
.month-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.month-btn { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #a89cc8; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; }
.month-btn:hover { background: rgba(102,126,234,0.2); }
.month-label { font-size: 14px; color: #e9d5ff; }

.cal-grid {
  display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;
  margin-bottom: 16px;
}
.cal-hd { text-align: center; font-size: 11px; color: #888; padding: 4px 0; }
.cal-cell {
  aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  border-radius: 8px; font-size: 13px; cursor: pointer; position: relative;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); transition: all 0.2s;
}
.cal-cell:hover:not(.cal-future) { background: rgba(102,126,234,0.2); }
.cal-signed { background: rgba(0,255,136,0.15) !important; border-color: rgba(0,255,136,0.4) !important; color: #00ff88; }
.cal-today { border-color: #ffd700 !important; box-shadow: 0 0 6px rgba(255,215,0,0.3); }
.cal-missed { background: rgba(255,68,68,0.1) !important; border-color: rgba(255,68,68,0.3) !important; }
.cal-future { opacity: 0.3; cursor: default; }
.cal-check { font-size: 10px; color: #00ff88; }
.cal-miss { font-size: 9px; color: #ff6b6b; }

.makeup-action { margin-top: 8px; }
.makeup-info { font-size: 13px; color: #a89cc8; text-align: center; margin-bottom: 10px; }
.makeup-info strong { color: #ffd700; }

/* ── History tab ── */
.history-list { display: flex; flex-direction: column; gap: 6px; }
.history-row {
  display: flex; align-items: center; gap: 10px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px; padding: 10px 12px; font-size: 12px;
}
.h-makeup { background: rgba(255,68,68,0.05) !important; border-color: rgba(255,68,68,0.2) !important; }
.h-date { color: #e9d5ff; font-weight: bold; min-width: 90px; }
.h-day { color: #888; flex-shrink: 0; }
.h-reward { flex: 1; color: #a89cc8; }
.h-badge { background: rgba(255,68,68,0.3); color: #ff6b6b; font-size: 10px; padding: 1px 5px; border-radius: 4px; }

/* ── Empty ── */
.empty-box { text-align: center; padding: 40px; color: #888; font-size: 13px; }
</style>
