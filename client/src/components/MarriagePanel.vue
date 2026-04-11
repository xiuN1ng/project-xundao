<template>
  <div class="marriage-panel">
    <!-- 顶部标题栏 -->
    <div class="panel-header">
      <h2>💍 婚姻系统</h2>
      <button class="close-btn" @click="closePanel">×</button>
    </div>

    <!-- 标签页切换 -->
    <div class="marriage-tabs">
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

    <!-- 单身 - 求婚 TAB -->
    <div v-else-if="activeTab === 'propose'" class="tab-content">
      <!-- 向TA求婚 -->
      <div class="section-card">
        <h3 class="section-title">💍 向TA求婚</h3>
        <p class="section-hint">输入对方玩家ID，向心仪的对象发送求婚请求</p>
        <div class="propose-form">
          <input
            v-model="proposeeId"
            type="number"
            placeholder="对方玩家ID"
            class="propose-input"
            min="1"
          />
          <button
            class="btn-propose"
            @click="doPropose"
            :disabled="!proposeeId || actionLoading"
          >
            {{ actionLoading === 'propose' ? '发送中...' : '发送求婚 💍' }}
          </button>
        </div>
        <div v-if="proposeError" class="error-text">{{ proposeError }}</div>
      </div>

      <!-- 我发出的求婚 -->
      <div class="section-card">
        <h3 class="section-title">📤 我发出的求婚</h3>
        <div v-if="sentProposals.length === 0" class="empty-hint">暂无发出的求婚</div>
        <div v-else class="proposal-list">
          <div
            v-for="p in sentProposals"
            :key="p.id"
            class="proposal-item sent"
          >
            <div class="proposal-info">
              <span class="proposal-player">对象ID: {{ p.proposee_id }}</span>
              <span class="proposal-status" :class="'status-' + p.status">
                {{ statusLabel(p.status) }}
              </span>
            </div>
            <span class="proposal-time">{{ formatTime(p.created_at) }}</span>
            <button
              v-if="p.status === 'pending'"
              class="btn-cancel"
              @click="cancelProposal(p.id)"
              :disabled="actionLoading === 'cancel-' + p.id"
            >
              {{ actionLoading === 'cancel-' + p.id ? '取消中...' : '取消求婚' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 我收到的求婚 -->
      <div class="section-card">
        <h3 class="section-title">📥 我收到的求婚</h3>
        <div v-if="receivedProposals.length === 0" class="empty-hint">暂无收到的求婚</div>
        <div v-else class="proposal-list">
          <div
            v-for="p in receivedProposals"
            :key="p.id"
            class="proposal-item received"
          >
            <div class="proposal-info">
              <span class="proposal-player">求婚者ID: {{ p.proposer_id }}</span>
              <span class="proposal-status" :class="'status-' + p.status">
                {{ statusLabel(p.status) }}
              </span>
            </div>
            <span class="proposal-time">{{ formatTime(p.created_at) }}</span>
            <div v-if="p.status === 'pending'" class="proposal-actions">
              <button
                class="btn-accept"
                @click="respondProposal(p.id, true)"
                :disabled="actionLoading === 'respond-' + p.id"
              >
                {{ actionLoading === 'respond-' + p.id ? '处理中...' : '接受 💕' }}
              </button>
              <button
                class="btn-reject"
                @click="respondProposal(p.id, false)"
                :disabled="actionLoading === 'respond-' + p.id"
              >
                拒绝 💔
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 已婚 - 夫妻 TAB -->
    <div v-else-if="activeTab === 'married'" class="tab-content">
      <!-- 配偶信息 -->
      <div class="section-card spouse-card">
        <div class="spouse-avatar-large">👫</div>
        <div class="spouse-name-large">{{ marriageInfo.spouse?.name || '未知' }}</div>
        <div class="spouse-id">ID: {{ marriageInfo.spouse?.id || marriageInfo.spouse_id }}</div>
        <div class="wedding-date-info" v-if="marriageInfo.married_at">
          💒 结婚日期: {{ formatDate(marriageInfo.married_at) }}
        </div>
      </div>

      <!-- 亲密度 -->
      <div class="section-card intimacy-card">
        <h3 class="section-title">❤️ 亲密度</h3>
        <div class="intimacy-header">
          <span>Lv.{{ intimacyLevel }} {{ intimacyLevelName }}</span>
          <span>{{ marriageInfo.intimacy || 0 }} / {{ intimacyNext }}</span>
        </div>
        <div class="intimacy-bar">
          <div
            class="intimacy-fill"
            :style="{ width: intimacyPercent + '%' }"
          ></div>
        </div>
        <div class="intimacy-bonus">
          <span>夫妻技能效果: </span>
          <span class="bonus-value">+{{ intimacyBonus }}%</span>
        </div>
      </div>

      <!-- 夫妻技能 -->
      <div class="section-card skills-card">
        <h3 class="section-title">⚡ 夫妻技能</h3>
        <div class="skills-list">
          <div
            v-for="skill in coupleSkills"
            :key="skill.id"
            class="skill-item"
            :class="{ locked: !skill.unlocked }"
          >
            <span class="skill-icon">{{ skill.icon }}</span>
            <div class="skill-info">
              <div class="skill-name">{{ skill.name }}</div>
              <div class="skill-desc">{{ skill.desc }}</div>
            </div>
            <div class="skill-effect">
              <span v-if="skill.unlocked" class="effect-active">+{{ skill.effect }}%</span>
              <span v-else class="effect-locked">🔒 Lv.{{ skill.level }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 每日互动 -->
      <div class="section-card interact-card">
        <h3 class="section-title">🎮 每日互动</h3>
        <div class="interact-info">
          <span class="interact-count">今日已互动: {{ dailyInteractCount }} / {{ maxDailyInteract }}</span>
          <span v-if="dailyInteractCount >= maxDailyInteract" class="interact-full">已用完</span>
        </div>
        <div class="interact-buttons">
          <button
            v-for="action in interactActions"
            :key="action.key"
            class="interact-btn"
            :class="'interact-btn-' + action.key"
            @click="doInteract(action.key)"
            :disabled="dailyInteractCount >= maxDailyInteract || actionLoading === action.key"
          >
            <span class="interact-icon">{{ action.icon }}</span>
            <span class="interact-name">{{ action.name }}</span>
            <span v-if="actionLoading === action.key" class="interact-loading">...</span>
          </button>
        </div>
      </div>

      <!-- 戒指升级 -->
      <div class="section-card ring-card">
        <h3 class="section-title">💎 戒指升级</h3>
        <div class="ring-info">
          <span class="ring-name">{{ currentRing.name }} ({{ currentRing.quality }})</span>
          <span class="ring-level">等级 {{ currentRing.level }}</span>
        </div>
        <div class="ring-list">
          <div
            v-for="ring in rings"
            :key="ring.quality"
            class="ring-item"
            :class="{
              active: ring.quality === currentRing.quality,
              locked: ring.unlock_level > intimacyLevel,
              upgrade: ring.unlock_level <= intimacyLevel && ring.quality !== currentRing.quality,
            }"
          >
            <span class="ring-icon">{{ ring.icon }}</span>
            <span class="ring-quality">{{ ring.quality_name }}</span>
            <span class="ring-requirement">需要亲密度 Lv.{{ ring.unlock_level }}</span>
            <button
              v-if="ring.unlock_level <= intimacyLevel && ring.quality !== currentRing.quality"
              class="btn-upgrade-ring"
              @click="upgradeRing(ring.quality)"
              :disabled="actionLoading === 'upgrade-' + ring.quality"
            >
              {{ actionLoading === 'upgrade-' + ring.quality ? '升级中...' : '升级' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 离婚 -->
      <div class="section-card divorce-section">
        <button class="btn-divorce" @click="confirmDivorce">
          💔 申请离婚
        </button>
        <p class="divorce-hint">离婚将解除夫妻关系，亲密度清零</p>
      </div>
    </div>

    <!-- Toast -->
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
const API_BASE = '/api/marriage'

// ─── Player ID helper ─────────────────────────────────────────────────────────
function getPlayerId() {
  return playerStore.player?.player?.id || playerStore.player?.id || 1
}

// ─── State ────────────────────────────────────────────────────────────────────
const activeTab = ref('propose')
const loading = ref(false)
const errorMsg = ref('')
const actionLoading = ref(null)
const proposeeId = ref('')
const proposeError = ref('')

const marriageInfo = ref({
  married: false,
  spouse: null,
  spouse_id: null,
  intimacy: 0,
  married_at: null,
  ring: { quality: 'common', level: 0 },
})

const receivedProposals = ref([])
const sentProposals = ref([])
const rings = ref([])
const configData = ref({})

const toast = ref({ show: false, message: '', type: 'info' })
let toastTimer = null

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const tabs = [
  { id: 'propose', name: '求婚', icon: '💍' },
  { id: 'married', name: '夫妻', icon: '👫' },
]

// ─── Computed ─────────────────────────────────────────────────────────────────
const isMarried = computed(() => marriageInfo.value.married)

const intimacyLevel = computed(() => {
  const levelThresholds = configData.value.intimacy_levels || [0, 100, 300, 600, 1000, 1500, 2500, 4000, 6000, 10000]
  const intimacy = marriageInfo.value.intimacy || 0
  let level = 0
  for (let i = 0; i < levelThresholds.length; i++) {
    if (intimacy >= levelThresholds[i]) level = i + 1
  }
  return Math.min(level, levelThresholds.length)
})

const intimacyNext = computed(() => {
  const levels = configData.value.intimacy_levels || [0, 100, 300, 600, 1000, 1500, 2500, 4000, 6000, 10000]
  const next = intimacyLevel.value
  return next < levels.length ? levels[next] : 'MAX'
})

const intimacyPercent = computed(() => {
  const levels = configData.value.intimacy_levels || [0, 100, 300, 600, 1000, 1500, 2500, 4000, 6000, 10000]
  const current = intimacyLevel.value
  const intimacy = marriageInfo.value.intimacy || 0
  if (current >= levels.length) return 100
  const currentThreshold = levels[current - 1] || 0
  const nextThreshold = levels[current] || currentThreshold + 100
  return Math.min(100, Math.round((intimacy - currentThreshold) / (nextThreshold - currentThreshold) * 100))
})

const intimacyLevelName = computed(() => {
  const names = ['陌生', '初识', '相识', '熟悉', '好感', '喜欢', '相爱', '热恋', '心有灵犀', '命中注定']
  return names[Math.min(intimacyLevel.value - 1, names.length - 1)] || '陌生'
})

const intimacyBonus = computed(() => {
  const bonusPerLevel = configData.value.intimacy_bonus_per_level || 2
  return intimacyLevel.value * bonusPerLevel
})

const currentRing = computed(() => {
  const ringData = marriageInfo.value.ring || {}
  const ringInfo = rings.value.find(r => r.quality === ringData.quality) || { icon: '💍', quality_name: '普通', level: 0 }
  return {
    quality: ringData.quality || 'common',
    level: ringData.level || 0,
    ...ringInfo,
  }
})

const dailyInteractCount = computed(() => {
  return marriageInfo.value.daily_interact_count || 0
})

const maxDailyInteract = computed(() => {
  return configData.value.max_daily_interact || 10
})

const coupleSkills = computed(() => {
  const skills = configData.value.skills || []
  const level = intimacyLevel.value
  return skills.map((s, idx) => ({
    id: idx,
    icon: s.icon || '⚡',
    name: s.name || '夫妻技能',
    desc: s.desc || '',
    effect: s.effect || 5,
    level: s.unlock_level || (idx + 1) * 2,
    unlocked: level >= (s.unlock_level || (idx + 1) * 2),
  }))
})

const interactActions = computed(() => {
  const actions = configData.value.interact_actions || []
  return actions.map(a => ({
    key: a.key,
    icon: a.icon || '❤️',
    name: a.name || '互动',
  }))
})

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  clearTimeout(toastTimer)
  toast.value = { show: true, message, type }
  toastTimer = setTimeout(() => { toast.value.show = false }, 2500)
}

// ─── API helpers ──────────────────────────────────────────────────────────────
async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}),
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
      ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}),
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
  if (tabId === 'propose') {
    await fetchProposals()
  } else if (tabId === 'married') {
    await fetchInfo()
  }
}

async function retry() {
  errorMsg.value = ''
  await switchTab(activeTab.value)
}

// ─── Data fetching ────────────────────────────────────────────────────────────
async function fetchInfo() {
  loading.value = true
  errorMsg.value = ''
  try {
    const data = await apiGet('/info')
    marriageInfo.value = {
      married: data.married || false,
      spouse: data.spouse || null,
      spouse_id: data.spouse_id || null,
      intimacy: data.intimacy || 0,
      married_at: data.married_at || null,
      ring: data.ring || { quality: 'common', level: 0 },
      daily_interact_count: data.daily_interact_count || 0,
    }
    // Update active tab based on marriage status
    activeTab.value = data.married ? 'married' : 'propose'
  } catch (e) {
    errorMsg.value = e.message || '加载婚姻信息失败'
  } finally {
    loading.value = false
  }
}

async function fetchProposals() {
  loading.value = true
  errorMsg.value = ''
  try {
    const [received, sent] = await Promise.all([
      apiGet('/proposals'),
      apiGet('/proposals/sent'),
    ])
    receivedProposals.value = received.proposals || []
    sentProposals.value = sent.proposals || []
  } catch (e) {
    errorMsg.value = e.message || '加载求婚信息失败'
  } finally {
    loading.value = false
  }
}

async function fetchConfig() {
  try {
    const data = await apiGet('/config')
    configData.value = data
    rings.value = data.rings || []
  } catch (e) {
    console.warn('加载婚姻配置失败:', e.message)
  }
}

// ─── Actions ──────────────────────────────────────────────────────────────────
async function doPropose() {
  if (!proposeeId.value) return
  proposeError.value = ''
  actionLoading.value = 'propose'
  try {
    const data = await apiPost('/propose', { proposee_id: parseInt(proposeeId.value) })
    showToast(data.message || '求婚请求已发送！', 'success')
    proposeeId.value = ''
    await fetchProposals()
  } catch (e) {
    proposeError.value = e.message || '求婚失败'
    showToast(e.message || '求婚失败', 'error')
  } finally {
    actionLoading.value = null
  }
}

async function respondProposal(proposalId, accept) {
  actionLoading.value = 'respond-' + proposalId
  try {
    const data = await apiPost('/respond', {
      proposal_id: parseInt(proposalId),
      accept,
    })
    showToast(data.message || (accept ? '已接受求婚！🎉' : '已拒绝求婚'), accept ? 'success' : 'info')
    await fetchProposals()
    if (accept) await fetchInfo()
  } catch (e) {
    showToast(e.message || '响应失败', 'error')
  } finally {
    actionLoading.value = null
  }
}

async function cancelProposal(proposalId) {
  actionLoading.value = 'cancel-' + proposalId
  try {
    const data = await apiPost('/proposal/cancel', { proposal_id: parseInt(proposalId) })
    showToast(data.message || '已取消求婚', 'info')
    await fetchProposals()
  } catch (e) {
    showToast(e.message || '取消失败', 'error')
  } finally {
    actionLoading.value = null
  }
}

async function doInteract(actionKey) {
  actionLoading.value = actionKey
  try {
    const data = await apiPost('/interact', { action: actionKey })
    showToast(data.message || '互动成功！', 'success')
    marriageInfo.value.intimacy = data.intimacy || marriageInfo.value.intimacy
    marriageInfo.value.daily_interact_count = data.daily_interact_count || marriageInfo.value.daily_interact_count
  } catch (e) {
    showToast(e.message || '互动失败', 'error')
  } finally {
    actionLoading.value = null
  }
}

async function upgradeRing(quality) {
  actionLoading.value = 'upgrade-' + quality
  try {
    const data = await apiPost('/ring/upgrade', { ring_quality: quality })
    showToast(data.message || `戒指升级为「${quality}」！`, 'success')
    await fetchInfo()
  } catch (e) {
    showToast(e.message || '升级失败', 'error')
  } finally {
    actionLoading.value = null
  }
}

async function confirmDivorce() {
  if (!confirm('确定要离婚吗？离婚后将解除夫妻关系，所有亲密度将清零！')) return
  try {
    const data = await apiPost('/divorce', {})
    showToast(data.message || '已离婚', 'info')
    await fetchInfo()
    await fetchProposals()
  } catch (e) {
    showToast(e.message || '离婚失败', 'error')
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function closePanel() {
  // Navigate back via router or emit close
  if (window.history.length > 1) {
    window.history.back()
  }
}

function statusLabel(status) {
  const map = { pending: '等待中', accepted: '已接受', rejected: '已拒绝', cancelled: '已取消' }
  return map[status] || status
}

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function formatDate(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
}

// ─── Mount ────────────────────────────────────────────────────────────────────
onMounted(async () => {
  await fetchConfig()
  await fetchInfo()
  if (!isMarried.value) {
    await fetchProposals()
  }
})
</script>

<style scoped>
/* ─── Base ─────────────────────────────────────────────────────────────────── */
.marriage-panel {
  min-height: 100vh;
  background: linear-gradient(180deg, #1a0a2e 0%, #2d1b4e 50%, #1a0a2e 100%);
  color: #fff;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  position: relative;
  padding-bottom: 40px;
}

/* ─── Header ───────────────────────────────────────────────────────────────── */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
}
.panel-header h2 {
  font-size: 20px;
  color: #fff;
  margin: 0;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
.close-btn {
  background: rgba(255, 255, 255, 0.15);
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  line-height: 1;
  transition: background 0.2s;
}
.close-btn:hover { background: rgba(255, 255, 255, 0.25); }

/* ─── Tabs ─────────────────────────────────────────────────────────────────── */
.marriage-tabs {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.marriage-tabs button {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 10px 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  transition: all 0.25s ease;
  font-size: 12px;
}
.marriage-tabs button .tab-icon { font-size: 18px; }
.marriage-tabs button.active {
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

/* ─── Content ──────────────────────────────────────────────────────────────── */
.tab-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-card {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 16px;
}
.section-title {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 6px;
}
.section-hint {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  margin: 0 0 12px 0;
}

/* ─── Propose Form ────────────────────────────────────────────────────────── */
.propose-form {
  display: flex;
  gap: 10px;
  align-items: center;
}
.propose-input {
  flex: 1;
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  color: #fff;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}
.propose-input:focus { border-color: #667eea; }
.propose-input::placeholder { color: rgba(255, 255, 255, 0.3); }
.btn-propose {
  padding: 10px 18px;
  background: linear-gradient(135deg, #f093fb, #f5576c);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.2s;
}
.btn-propose:disabled { opacity: 0.4; cursor: not-allowed; }
.error-text {
  margin-top: 8px;
  font-size: 12px;
  color: #ff6b6b;
}

/* ─── Proposal List ──────────────────────────────────────────────────────── */
.proposal-list { display: flex; flex-direction: column; gap: 10px; }
.proposal-item {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.proposal-info { display: flex; justify-content: space-between; align-items: center; }
.proposal-player { font-size: 13px; color: rgba(255, 255, 255, 0.85); }
.proposal-status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
}
.status-pending { background: rgba(255, 200, 0, 0.15); color: #ffd700; }
.status-accepted { background: rgba(76, 175, 80, 0.15); color: #4caf50; }
.status-rejected, .status-cancelled { background: rgba(255, 80, 80, 0.15); color: #ff6b6b; }
.proposal-time { font-size: 11px; color: rgba(255, 255, 255, 0.35); }
.proposal-actions { display: flex; gap: 8px; margin-top: 4px; }
.btn-accept {
  flex: 1;
  padding: 8px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn-accept:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-reject {
  flex: 1;
  padding: 8px;
  background: rgba(255, 80, 80, 0.15);
  border: 1px solid rgba(255, 80, 80, 0.3);
  border-radius: 8px;
  color: #ff6b6b;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-reject:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-cancel {
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 11px;
  cursor: pointer;
  margin-top: 4px;
  transition: all 0.2s;
}
.btn-cancel:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-cancel:hover { background: rgba(255, 80, 80, 0.1); border-color: rgba(255, 80, 80, 0.3); color: #ff6b6b; }
.empty-hint { font-size: 12px; color: rgba(255, 255, 255, 0.3); text-align: center; padding: 20px 0; }

/* ─── Spouse Card ─────────────────────────────────────────────────────────── */
.spouse-card {
  text-align: center;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.15));
  border-color: rgba(102, 126, 234, 0.3);
}
.spouse-avatar-large { font-size: 56px; margin-bottom: 8px; }
.spouse-name-large { font-size: 22px; font-weight: 700; color: #fff; margin-bottom: 4px; }
.spouse-id { font-size: 12px; color: rgba(255, 255, 255, 0.45); margin-bottom: 6px; }
.wedding-date-info { font-size: 12px; color: rgba(255, 255, 255, 0.6); }

/* ─── Intimacy ────────────────────────────────────────────────────────────── */
.intimacy-header { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px; }
.intimacy-header span:first-child { color: #f093fb; font-weight: 700; }
.intimacy-header span:last-child { color: rgba(255, 255, 255, 0.55); }
.intimacy-bar {
  height: 14px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 7px;
  overflow: hidden;
  margin-bottom: 8px;
}
.intimacy-fill {
  height: 100%;
  background: linear-gradient(90deg, #f093fb, #f5576c);
  border-radius: 7px;
  transition: width 0.4s ease;
  box-shadow: 0 0 8px rgba(240, 147, 251, 0.4);
}
.intimacy-bonus { font-size: 12px; color: rgba(255, 255, 255, 0.5); }
.bonus-value { color: #ffd700; font-weight: 700; }

/* ─── Skills ─────────────────────────────────────────────────────────────── */
.skills-list { display: flex; flex-direction: column; gap: 8px; }
.skill-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(102, 126, 234, 0.12);
  border: 1px solid rgba(102, 126, 234, 0.25);
  border-radius: 12px;
  transition: all 0.3s;
}
.skill-item.locked {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.06);
  opacity: 0.6;
}
.skill-icon { font-size: 28px; }
.skill-info { flex: 1; }
.skill-name { font-size: 14px; font-weight: 600; color: #fff; margin-bottom: 2px; }
.skill-desc { font-size: 11px; color: rgba(255, 255, 255, 0.45); }
.skill-effect { font-size: 14px; font-weight: 700; }
.effect-active { color: #ffd700; }
.effect-locked { color: rgba(255, 255, 255, 0.3); font-size: 11px; }

/* ─── Interact ────────────────────────────────────────────────────────────── */
.interact-info { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 10px; }
.interact-count { color: rgba(255, 255, 255, 0.6); }
.interact-full { color: #ff6b6b; font-weight: 700; }
.interact-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.interact-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
}
.interact-btn:hover:not(:disabled) { background: rgba(102, 126, 234, 0.2); border-color: rgba(102, 126, 234, 0.4); transform: translateY(-1px); }
.interact-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.interact-icon { font-size: 28px; }
.interact-name { font-size: 13px; font-weight: 600; }
.interact-loading { font-size: 11px; color: rgba(255, 255, 255, 0.5); }
.interact-btn-hug:hover:not(:disabled) { background: rgba(255, 152, 0, 0.15); border-color: rgba(255, 152, 0, 0.4); }
.interact-btn-kiss:hover:not(:disabled) { background: rgba(255, 87, 34, 0.15); border-color: rgba(255, 87, 34, 0.4); }
.interact-btn-gift:hover:not(:disabled) { background: rgba(255, 215, 0, 0.15); border-color: rgba(255, 215, 0, 0.4); }
.interact-btn-cultivate:hover:not(:disabled) { background: rgba(156, 39, 176, 0.15); border-color: rgba(156, 39, 176, 0.4); }

/* ─── Ring ────────────────────────────────────────────────────────────────── */
.ring-info { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 10px; }
.ring-name { color: rgba(255, 255, 255, 0.85); }
.ring-level { color: rgba(255, 255, 255, 0.45); }
.ring-list { display: flex; flex-direction: column; gap: 8px; }
.ring-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  transition: all 0.2s;
}
.ring-item.active {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
  border-color: rgba(102, 126, 234, 0.5);
  box-shadow: 0 0 15px rgba(102, 126, 234, 0.2);
}
.ring-item.locked { opacity: 0.45; }
.ring-item.upgrade { border-color: rgba(255, 215, 0, 0.3); }
.ring-icon { font-size: 24px; }
.ring-quality { font-size: 13px; font-weight: 600; color: #fff; flex: 1; }
.ring-requirement { font-size: 11px; color: rgba(255, 255, 255, 0.35); }
.btn-upgrade-ring {
  padding: 6px 12px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 11px;
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn-upgrade-ring:disabled { opacity: 0.4; cursor: not-allowed; }

/* ─── Divorce ────────────────────────────────────────────────────────────── */
.divorce-section { text-align: center; }
.btn-divorce {
  padding: 12px 32px;
  background: rgba(255, 80, 80, 0.15);
  border: 1px solid rgba(255, 80, 80, 0.35);
  border-radius: 12px;
  color: #ff6b6b;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-divorce:hover { background: rgba(255, 80, 80, 0.25); border-color: rgba(255, 80, 80, 0.5); }
.divorce-hint { font-size: 11px; color: rgba(255, 255, 255, 0.3); margin-top: 8px; }

/* ─── Loading / Error ────────────────────────────────────────────────────── */
.loading-state, .error-state {
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

/* ─── Toast ──────────────────────────────────────────────────────────────── */
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
.toast-notification.info { background: rgba(102, 126, 234, 0.9); color: #fff; }
.toast-notification.success { background: rgba(76, 175, 80, 0.9); color: #fff; }
.toast-notification.error { background: rgba(244, 67, 54, 0.9); color: #fff; }
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(10px); }

/* ─── Scrollbar ──────────────────────────────────────────────────────────── */
.marriage-panel::-webkit-scrollbar { width: 4px; }
.marriage-panel::-webkit-scrollbar-track { background: transparent; }
.marriage-panel::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 2px; }
</style>
