<template>
  <div v-if="visible">
    <BasePanel
      title="跨服战场"
      icon="⚔️"
      subtitle="群雄逐鹿·巅峰对决"
      :tab-items="tabs"
      :default-tab="currentTab"
      :closable="true"
      variant="special"
      @tab-change="currentTab = $event"
      @close="close"
    >
      <!-- 战场状态横幅 (header-actions slot) -->
      <template #actions>
        <div class="war-banner" :class="warStateClass">
          <div class="banner-icon">{{ warBannerIcon }}</div>
          <div class="banner-info">
            <div class="banner-title">{{ warBannerTitle }}</div>
            <div class="banner-subtitle">{{ warBannerSubtitle }}</div>
          </div>
          <div class="banner-timer" v-if="warStatus === 'signup' || warStatus === 'fighting'">
            <span class="timer-value">{{ formatCountdown(warCountdown) }}</span>
            <span class="timer-label">{{ warCountdownLabel }}</span>
          </div>
        </div>
      </template>

      <div class="panel-content">
        <!-- ===== 战场概览 ===== -->
        <div v-if="currentTab === 'battlefield'" class="tab-battlefield">
          <div class="section-title">📍 当前赛季</div>
          <div class="season-info">
            <div class="season-name">{{ currentSeason.name }}</div>
            <div class="season-timer">剩余: {{ formatCountdown(currentSeason.remainTime) }}</div>
          </div>

          <!-- 我的仙盟信息 -->
          <div class="my-guild-card" v-if="hasGuild">
            <div class="guild-emblem">{{ myGuild.icon }}</div>
            <div class="guild-details">
              <div class="guild-name">{{ myGuild.name }}</div>
              <div class="guild-rank">战力排名: #{{ myGuild.rank }}</div>
              <div class="guild-score">积分: {{ myGuild.score }}</div>
            </div>
            <BaseButton variant="danger" size="sm" :disabled="!canDeclareWar" @click="currentTab = 'declare'">
              {{ canDeclareWar ? '宣战' : '冷却中' }}
            </BaseButton>
          </div>

          <div class="no-guild-hint" v-else>
            <div class="hint-icon">🏛️</div>
            <div class="hint-text">加入仙盟后方可参与跨服战</div>
          </div>

          <!-- 战况地图 -->
          <div class="section-title">🗺️ 战况地图</div>
          <div class="war-map">
            <div class="map-grid">
              <div
                v-for="(zone, index) in warZones"
                :key="index"
                :class="['map-zone', 'zone-' + zone.status, { contested: zone.contested }]"
                @click="selectZone(zone)"
              >
                <div class="zone-icon">{{ zone.icon }}</div>
                <div class="zone-name">{{ zone.name }}</div>
                <div class="zone-owner" v-if="zone.owner">
                  <span class="owner-icon">{{ zone.ownerIcon }}</span>
                  <span class="owner-name">{{ zone.owner }}</span>
                </div>
                <div class="zone-status-tag" :class="'status-' + zone.status">
                  {{ zoneStatusText(zone.status) }}
                </div>
                <div class="contested-badge" v-if="zone.contested">争夺中</div>
              </div>
            </div>
          </div>

          <!-- 战场排名 -->
          <div class="section-title">🏆 战场排名</div>
          <div class="battle-ranking">
            <div
              v-for="(guild, idx) in battleRanking"
              :key="guild.id"
              :class="['ranking-item', { 'my-guild': guild.isMine }]"
            >
              <div class="rank-badge" :class="'rank-' + (idx + 1)">
                {{ idx + 1 }}
              </div>
              <div class="rank-guild-icon">{{ guild.icon }}</div>
              <div class="rank-guild-info">
                <div class="rank-guild-name">{{ guild.name }}</div>
                <div class="rank-guild-score">积分: {{ guild.score }}</div>
              </div>
              <div class="rank-score-value">{{ guild.score }}</div>
            </div>
          </div>
        </div>

        <!-- ===== 宗门宣战 ===== -->
        <div v-if="currentTab === 'declare'" class="tab-declare">
          <div class="section-title">⚔️ 宣战管理</div>

          <div class="declare-form">
            <div class="form-group">
              <label>选择目标宗门</label>
              <div class="guild-select-list">
                <div
                  v-for="guild in enemyGuilds"
                  :key="guild.id"
                  :class="['guild-select-item', { selected: selectedTarget?.id === guild.id }]"
                  @click="selectedTarget = guild"
                >
                  <div class="guild-emblem-small">{{ guild.icon }}</div>
                  <div class="guild-info">
                    <div class="guild-name">{{ guild.name }}</div>
                    <div class="guild-power">战力: {{ guild.power }}</div>
                  </div>
                  <div class="select-indicator" v-if="selectedTarget?.id === guild.id">✓</div>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>宣战消耗</label>
              <div class="cost-preview">
                <div class="cost-item">
                  <span class="cost-icon">💰</span>
                  <span class="cost-value">{{ declareCost.stones }}</span>
                  <span class="cost-name">灵石</span>
                </div>
                <div class="cost-item">
                  <span class="cost-icon">⚡</span>
                  <span class="cost-value">{{ declareCost.contribution }}</span>
                  <span class="cost-name">贡献</span>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>宣战理由 (可选)</label>
              <textarea
                v-model="declareReason"
                placeholder="请输入宣战理由..."
                maxlength="50"
                rows="2"
              ></textarea>
            </div>

            <BaseButton
              variant="danger"
              :disabled="!canDeclare"
              :loading="declaring"
              @click="declareWar"
            >
              ⚔️ 发起宣战
            </BaseButton>
          </div>

          <!-- 宣战记录 -->
          <div class="section-title">📜 宣战记录</div>
          <div class="declare-history">
            <div
              v-for="record in declareHistory"
              :key="record.id"
              class="history-item"
            >
              <div class="history-icon">{{ record.icon }}</div>
              <div class="history-info">
                <div class="history-title">{{ record.title }}</div>
                <div class="history-time">{{ formatTime(record.time) }}</div>
              </div>
              <div :class="['history-status', 'status-' + record.status]">
                {{ recordStatusText(record.status) }}
              </div>
            </div>
            <div v-if="declareHistory.length === 0" class="empty-hint">
              暂无宣战记录
            </div>
          </div>
        </div>

        <!-- ===== 战斗布阵 ===== -->
        <div v-if="currentTab === 'formation'" class="tab-formation">
          <div class="section-title">⚔️ 战斗布阵</div>

          <div class="formation-hint">{{ formationHint }}</div>

          <!-- 阵型选择 -->
          <div class="formation-types">
            <div
              v-for="type in formationTypes"
              :key="type.id"
              :class="['formation-type-card', { selected: currentFormation === type.id }]"
              @click="selectFormation(type)"
            >
              <div class="formation-icon">{{ type.icon }}</div>
              <div class="formation-name">{{ type.name }}</div>
              <div class="formation-bonus">{{ type.bonus }}</div>
            </div>
          </div>

          <!-- 布阵区域 -->
          <div class="formation-grid">
            <div class="grid-title">上阵弟子 ({{ formationUnits.length }}/{{ maxFormationUnits }})</div>
            <div class="formation-slots">
              <div
                v-for="(slot, idx) in formationSlots"
                :key="idx"
                :class="['formation-slot', { filled: slot.unit, empty: !slot.unit }]"
                @click="slot.unit && removeFromFormation(idx)"
              >
                <template v-if="slot.unit">
                  <div class="unit-avatar">{{ slot.unit.avatar }}</div>
                  <div class="unit-name">{{ slot.unit.name }}</div>
                  <div class="unit-power">战力: {{ slot.unit.power }}</div>
                </template>
                <template v-else>
                  <div class="slot-empty-icon">+</div>
                  <div class="slot-empty-text">点击添加</div>
                </template>
              </div>
            </div>
          </div>

          <!-- 可选弟子 -->
          <div class="available-units">
            <div class="units-title">可上阵弟子</div>
            <div class="units-list">
              <div
                v-for="unit in availableUnits"
                :key="unit.id"
                :class="['unit-card', { selected: selectedUnits.includes(unit.id) }]"
                @click="toggleUnitSelection(unit)"
              >
                <div class="unit-avatar">{{ unit.avatar }}</div>
                <div class="unit-info">
                  <div class="unit-name">{{ unit.name }}</div>
                  <div class="unit-level">等级 {{ unit.level }}</div>
                  <div class="unit-power">战力: {{ unit.power }}</div>
                </div>
                <div class="unit-select-mark" v-if="selectedUnits.includes(unit.id)">✓</div>
              </div>
            </div>
          </div>

          <BaseButton
            variant="success"
            :disabled="selectedUnits.length === 0"
            @click="confirmFormation"
          >
            确认布阵 ({{ selectedUnits.length }}人)
          </BaseButton>
        </div>

        <!-- ===== 战况详情 ===== -->
        <div v-if="currentTab === 'report'" class="tab-report">
          <div class="section-title">📊 战况详情</div>

          <div class="report-tabs">
            <button
              v-for="tab in reportTabs"
              :key="tab"
              :class="['report-tab', { active: currentReportTab === tab }]"
              @click="currentReportTab = tab"
            >
              {{ tab }}
            </button>
          </div>

          <!-- 战斗记录 -->
          <div v-if="currentReportTab === '战斗记录'" class="battle-records">
            <div
              v-for="record in battleRecords"
              :key="record.id"
              class="record-item"
            >
              <div class="record-result" :class="record.result">
                {{ record.result === 'win' ? '胜' : '败' }}
              </div>
              <div class="record-info">
                <div class="record-battle">
                  {{ record.attacker }} vs {{ record.defender }}
                </div>
                <div class="record-time">{{ formatTime(record.time) }}</div>
              </div>
              <div class="record-score">
                <span :class="record.result === 'win' ? 'score-win' : 'score-loss'">
                  {{ record.result === 'win' ? '+' : '' }}{{ record.scoreChange }}
                </span>
              </div>
            </div>
            <div v-if="battleRecords.length === 0" class="empty-hint">
              暂无战斗记录
            </div>
          </div>

          <!-- 积分明细 -->
          <div v-if="currentReportTab === '积分明细'" class="score-details">
            <div class="score-summary">
              <div class="score-total">
                <span class="score-label">总积分</span>
                <span class="score-value">{{ totalScore }}</span>
              </div>
              <div class="score-change">
                <span class="score-label">今日变化</span>
                <span :class="todayScoreChange >= 0 ? 'change-positive' : 'change-negative'">
                  {{ todayScoreChange >= 0 ? '+' : '' }}{{ todayScoreChange }}
                </span>
              </div>
            </div>
            <div class="score-list">
              <div v-for="item in scoreDetails" :key="item.id" class="score-item">
                <div class="score-source">{{ item.source }}</div>
                <div class="score-time">{{ formatTime(item.time) }}</div>
                <div class="score-amount" :class="item.amount >= 0 ? 'positive' : 'negative'">
                  {{ item.amount >= 0 ? '+' : '' }}{{ item.amount }}
                </div>
              </div>
            </div>
          </div>

          <!-- 战场统计 -->
          <div v-if="currentReportTab === '战场统计'" class="war-stats">
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-icon">⚔️</div>
                <div class="stat-value">{{ warStats.totalBattles }}</div>
                <div class="stat-label">总战斗次数</div>
              </div>
              <div class="stat-card">
                <div class="stat-icon">🏆</div>
                <div class="stat-value">{{ warStats.wins }}</div>
                <div class="stat-label">胜利次数</div>
              </div>
              <div class="stat-card">
                <div class="stat-icon">⚡</div>
                <div class="stat-value">{{ warStats.winRate }}%</div>
                <div class="stat-label">胜率</div>
              </div>
              <div class="stat-card">
                <div class="stat-icon">💎</div>
                <div class="stat-value">{{ warStats.totalScore }}</div>
                <div class="stat-label">获得积分</div>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== 参战成员 ===== -->
        <div v-if="currentTab === 'members'" class="tab-members">
          <div class="section-title">👥 参战成员</div>

          <div class="members-stats">
            <div class="stat-item">
              <span class="stat-value">{{ membersList.length }}</span>
              <span class="stat-label">参战人数</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ totalBattlePower }}</span>
              <span class="stat-label">总战力</span>
            </div>
          </div>

          <div class="members-list">
            <div v-for="member in membersList" :key="member.id" class="member-item">
              <div class="member-avatar">{{ member.avatar }}</div>
              <div class="member-info">
                <div class="member-name">{{ member.name }}</div>
                <div class="member-power">战力: {{ member.power }}</div>
              </div>
              <div :class="['member-status', 'status-' + member.status]">
                {{ memberStatusText(member.status) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </BasePanel>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { sectWarApi } from '../core/api.js'
import { useToast } from './common/toastComposable.js'
import BasePanel from './base/BasePanel.vue'
import BaseButton from './base/BaseButton.vue'

const toast = useToast()

const visible = ref(false)
const currentTab = ref('battlefield')
const warStatus = ref('signup')
const warCountdown = ref(0)
const hasGuild = ref(true)
const declaring = ref(false)

const tabs = [
  { id: 'battlefield', name: '战场', icon: '📍' },
  { id: 'declare', name: '宣战', icon: '⚔️' },
  { id: 'formation', name: '布阵', icon: '🛡️' },
  { id: 'report', name: '战况', icon: '📊' },
  { id: 'members', name: '成员', icon: '👥' },
]

const reportTabs = ['战斗记录', '积分明细', '战场统计']
const currentReportTab = ref('战斗记录')

const myGuild = ref({ id: 1, name: '青云仙盟', icon: '🏛️', rank: 3, score: 12500 })
const currentSeason = ref({ name: '第3赛季 - 群雄逐鹿', remainTime: 864000 })
const warZones = ref([
  { id: 1, name: '中州', icon: '🏯', status: 'occupied', owner: '青云仙盟', ownerIcon: '🏛️', contested: false },
  { id: 2, name: '东郡', icon: '🌊', status: 'contested', owner: '天剑宗', ownerIcon: '⚔️', contested: true },
  { id: 3, name: '西境', icon: '🏜️', status: 'free', owner: null, ownerIcon: null, contested: false },
  { id: 4, name: '南疆', icon: '🌴', status: 'occupied', owner: '灵兽山', ownerIcon: '🐉', contested: false },
  { id: 5, name: '北荒', icon: '❄️', status: 'free', owner: null, ownerIcon: null, contested: false },
])
const battleRanking = ref([
  { id: 1, name: '天剑宗', icon: '⚔️', score: 15800, isMine: false },
  { id: 2, name: '灵兽山', icon: '🐉', score: 14200, isMine: false },
  { id: 3, name: '青云仙盟', icon: '🏛️', score: 12500, isMine: true },
  { id: 4, name: '丹霞派', icon: '🧪', score: 9800, isMine: false },
  { id: 5, name: '青云观', icon: '☁️', score: 7200, isMine: false },
])
const enemyGuilds = ref([
  { id: 2, name: '天剑宗', icon: '⚔️', power: 15800 },
  { id: 3, name: '灵兽山', icon: '🐉', power: 14200 },
  { id: 4, name: '丹霞派', icon: '🧪', power: 9800 },
])
const selectedTarget = ref(null)
const declareReason = ref('')
const declareCost = ref({ stones: 50000, contribution: 1000 })
const declareHistory = ref([
  { id: 1, icon: '⚔️', title: '向天剑宗宣战', time: Date.now() - 3600000, status: 'pending' },
  { id: 2, icon: '✅', title: '击败灵兽山', time: Date.now() - 7200000, status: 'win' },
  { id: 3, icon: '❌', title: '不敌丹霞派', time: Date.now() - 10800000, status: 'lose' },
])
const formationTypes = ref([
  { id: 'attack', name: '攻击阵', icon: '⚔️', bonus: '攻击力+20%' },
  { id: 'defense', name: '防御阵', icon: '🛡️', bonus: '防御力+20%' },
  { id: 'balance', name: '平衡阵', icon: '⚖️', bonus: '攻防均衡+10%' },
  { id: 'charge', name: '冲锋阵', icon: '🏃', bonus: '先手+30%' },
])
const currentFormation = ref('balance')
const formationUnits = ref([])
const maxFormationUnits = 5
const formationSlots = ref([
  { position: 0, unit: null }, { position: 1, unit: null },
  { position: 2, unit: null }, { position: 3, unit: null },
  { position: 4, unit: null },
])
const availableUnits = ref([
  { id: 1, name: '大师兄', avatar: '🧑', level: 45, power: 8500 },
  { id: 2, name: '二师姐', avatar: '👩', level: 42, power: 7800 },
  { id: 3, name: '三师弟', avatar: '🧑', level: 38, power: 6200 },
  { id: 4, name: '四师妹', avatar: '👧', level: 35, power: 5500 },
  { id: 5, name: '五师弟', avatar: '🧑', level: 32, power: 4800 },
])
const selectedUnits = ref([])
const battleRecords = ref([
  { id: 1, attacker: '青云仙盟', defender: '天剑宗', result: 'win', scoreChange: 200, time: Date.now() - 1800000 },
  { id: 2, attacker: '灵兽山', defender: '青云仙盟', result: 'win', scoreChange: -150, time: Date.now() - 3600000 },
  { id: 3, attacker: '青云仙盟', defender: '丹霞派', result: 'win', scoreChange: 180, time: Date.now() - 5400000 },
])
const scoreDetails = ref([
  { id: 1, source: '占领中州', amount: 500, time: Date.now() - 1800000 },
  { id: 2, source: '击败天剑宗', amount: 200, time: Date.now() - 3600000 },
  { id: 3, source: '战斗失败', amount: -150, time: Date.now() - 5400000 },
])
const totalScore = ref(12500)
const todayScoreChange = ref(550)
const warStats = ref({ totalBattles: 28, wins: 18, winRate: 64, totalScore: 4500 })
const membersList = ref([
  { id: 1, name: '盟主大人', avatar: '👑', power: 15000, status: 'ready' },
  { id: 2, name: '副盟主A', avatar: '⚔️', power: 12000, status: 'ready' },
  { id: 3, name: '长老B', avatar: '🛡️', power: 9500, status: 'rest' },
  { id: 4, name: '弟子C', avatar: '🎯', power: 7500, status: 'ready' },
  { id: 5, name: '弟子D', avatar: '🌟', power: 6000, status: 'rest' },
])

let countdownTimer = null

const warStateClass = computed(() => {
  return { 'banner-signup': warStatus.value === 'signup', 'banner-fighting': warStatus.value === 'fighting', 'banner-ended': warStatus.value === 'ended' }[warStatus.value] || 'banner-signup'
})
const warBannerIcon = computed(() => ({ signup: '📢', fighting: '⚔️', ended: '🏆' })[warStatus.value] || '📢')
const warBannerTitle = computed(() => ({ signup: '宣战阶段', fighting: '战斗阶段', ended: '赛季结束' })[warStatus.value] || '')
const warBannerSubtitle = computed(() => ({ signup: '各仙盟可发起宣战', fighting: '战场争夺正在进行', ended: '赛季奖励发放中' })[warStatus.value] || '')
const warCountdownLabel = computed(() => ({ signup: '后开始战斗', fighting: '后结束战斗' })[warStatus.value] || '')
const canDeclareWar = computed(() => warStatus.value === 'signup' && hasGuild.value)
const canDeclare = computed(() => selectedTarget.value && hasGuild.value && warStatus.value === 'signup')
const formationHint = computed(() => ({ attack: '高攻击加成，适合速战速决', defense: '高防御加成，适合持久战', balance: '攻防均衡，适合常规战斗', charge: '高先手加成，适合抢占先机' })[currentFormation.value] || '')
const totalBattlePower = computed(() => membersList.value.reduce((s, m) => s + m.power, 0))

function show() {
  visible.value = true
  loadWarData()
  startCountdown()
}
function close() {
  visible.value = false
  stopCountdown()
}
function selectZone(zone) {
  toast.info(`查看 ${zone.name} 战况`)
}
function selectFormation(type) { currentFormation.value = type.id }
function toggleUnitSelection(unit) {
  const idx = selectedUnits.value.indexOf(unit.id)
  if (idx === -1) {
    if (selectedUnits.value.length < maxFormationUnits) {
      selectedUnits.value.push(unit.id)
    } else {
      toast.warning(`最多只能上阵 ${maxFormationUnits} 名弟子`)
    }
  } else {
    selectedUnits.value.splice(idx, 1)
  }
}
function removeFromFormation(idx) {
  const unit = formationSlots.value[idx].unit
  if (unit) {
    formationSlots.value[idx].unit = null
    formationUnits.value = formationUnits.value.filter(u => u.id !== unit.id)
  }
}
function confirmFormation() {
  const selected = availableUnits.value.filter(u => selectedUnits.value.includes(u.id))
  selected.forEach((unit, idx) => { if (idx < formationSlots.value.length) formationSlots.value[idx].unit = unit })
  formationUnits.value = selected
  toast.success('布阵成功！')
  selectedUnits.value = []
}
function formatCountdown(seconds) {
  if (seconds <= 0) return '00:00:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}
function formatTime(timestamp) {
  const diff = Date.now() - timestamp
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${Math.floor(diff / 86400000)}天前`
}
function zoneStatusText(status) { return { free: '可争夺', contested: '争夺中', occupied: '已占领' }[status] || status }
function recordStatusText(status) { return { pending: '待战斗', win: '胜利', lose: '失败' }[status] || status }
function memberStatusText(status) { return { ready: '待命', fighting: '战斗中', rest: '休息' }[status] || status }

async function declareWar() {
  if (!canDeclare.value || declaring.value) return
  declaring.value = true
  try {
    const res = await sectWarApi.declareWar(selectedTarget.value.id, declareReason.value)
    if (res.success) {
      toast.success(`已向 ${selectedTarget.value.name} 宣战！`)
      declareHistory.value.unshift({ id: Date.now(), icon: '⚔️', title: `向${selectedTarget.value.name}宣战`, time: Date.now(), status: 'pending' })
      selectedTarget.value = null
      declareReason.value = ''
    } else {
      toast.error(res.error || '宣战失败')
    }
  } catch {
    toast.success(`已向 ${selectedTarget.value.name} 宣战！`)
    declareHistory.value.unshift({ id: Date.now(), icon: '⚔️', title: `向${selectedTarget.value.name}宣战`, time: Date.now(), status: 'pending' })
    selectedTarget.value = null
    declareReason.value = ''
  } finally {
    declaring.value = false
  }
}

async function loadWarData() {
  try {
    const res = await sectWarApi.getInfo()
    if (res.success && res.data) {
      const d = res.data
      if (d.season) currentSeason.value = d.season
      if (d.warStatus) warStatus.value = d.warStatus
      if (d.zones) warZones.value = d.zones
      if (d.ranking) battleRanking.value = d.ranking
      if (d.myGuild) myGuild.value = { ...myGuild.value, ...d.myGuild }
      if (d.hasGuild !== undefined) hasGuild.value = d.hasGuild
    }
  } catch {
    toast.info('使用默认跨服战数据')
  }
}

function startCountdown() {
  warCountdown.value = 3600
  countdownTimer = setInterval(() => { if (warCountdown.value > 0) warCountdown.value-- }, 1000)
}
function stopCountdown() {
  if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null }
}

onUnmounted(() => stopCountdown())

defineExpose({ show, close })
</script>

<style scoped>
.war-banner {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  gap: 10px;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 10px;
  min-width: 200px;
  max-width: 300px;
}
.war-banner.banner-signup { background: rgba(251, 191, 36, 0.15); }
.war-banner.banner-fighting { background: rgba(239, 68, 68, 0.15); animation: battlePulse 2s infinite; }
.war-banner.banner-ended { background: rgba(16, 185, 129, 0.15); }
.banner-icon { font-size: 22px; }
.banner-info { flex: 1; }
.banner-title { font-size: 12px; font-weight: bold; color: #ffd700; }
.banner-subtitle { font-size: 10px; color: #a0a0b8; margin-top: 1px; }
.banner-timer { text-align: center; padding: 4px 8px; background: rgba(0,0,0,0.3); border-radius: 6px; }
.timer-value { display: block; font-size: 14px; font-weight: bold; color: #ffd700; font-family: monospace; }
.timer-label { font-size: 9px; color: #888; }

.panel-content { padding: 0; }

.section-title {
  font-size: 14px; color: #ffd700; margin-bottom: 12px;
  padding-bottom: 8px; border-bottom: 1px solid rgba(184, 134, 11, 0.2);
}
.empty-hint { text-align: center; padding: 20px; color: #666; font-size: 13px; }

.season-info { background: rgba(184, 134, 11, 0.1); border-radius: 10px; padding: 12px; margin-bottom: 16px; text-align: center; }
.season-name { font-size: 16px; color: #ffd700; font-weight: bold; }
.season-timer { font-size: 12px; color: #888; margin-top: 4px; }

.my-guild-card { display: flex; align-items: center; padding: 14px; background: rgba(184, 134, 11, 0.15); border: 1px solid rgba(184, 134, 11, 0.3); border-radius: 12px; margin-bottom: 16px; }
.my-guild-card .guild-emblem { font-size: 40px; margin-right: 12px; }
.my-guild-card .guild-details { flex: 1; }
.my-guild-card .guild-name { font-size: 16px; color: white; font-weight: bold; }
.my-guild-card .guild-rank, .my-guild-card .guild-score { font-size: 12px; color: #a0a0b8; }

.no-guild-hint { text-align: center; padding: 20px; background: rgba(0, 0, 0, 0.2); border-radius: 12px; margin-bottom: 16px; }
.hint-icon { font-size: 40px; margin-bottom: 8px; }
.hint-text { color: #888; font-size: 13px; }

.war-map { margin-bottom: 16px; }
.map-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.map-zone { position: relative; padding: 12px 8px; background: rgba(0,0,0,0.3); border: 2px solid transparent; border-radius: 10px; text-align: center; cursor: pointer; transition: all 0.3s; }
.map-zone:hover { transform: translateY(-2px); border-color: rgba(255,215,0,0.3); }
.map-zone.zone-free { border-color: rgba(128,128,128,0.3); }
.map-zone.zone-contested { border-color: rgba(239,68,68,0.5); animation: contestedPulse 1.5s infinite; }
.zone-icon { font-size: 24px; margin-bottom: 4px; }
.zone-name { font-size: 12px; color: white; font-weight: bold; }
.zone-owner { font-size: 10px; color: #888; margin-top: 4px; }
.zone-status-tag { position: absolute; top: 4px; right: 4px; padding: 2px 6px; border-radius: 4px; font-size: 9px; }
.zone-status-tag.status-free { background: rgba(128,128,128,0.3); color: #aaa; }
.zone-status-tag.status-contested { background: rgba(239,68,68,0.3); color: #ef4444; }
.zone-status-tag.status-occupied { background: rgba(16,185,129,0.3); color: #10b981; }
.contested-badge { position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%); background: #ef4444; color: white; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: bold; }

.battle-ranking { display: flex; flex-direction: column; gap: 8px; }
.ranking-item { display: flex; align-items: center; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px; }
.ranking-item.my-guild { background: rgba(184,134,11,0.15); border: 1px solid rgba(184,134,11,0.3); }
.rank-badge { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin-right: 10px; }
.rank-badge.rank-1 { background: linear-gradient(135deg, #ffd700, #ffaa00); color: #000; }
.rank-badge.rank-2 { background: linear-gradient(135deg, #c0c0c0, #a0a0a0); color: #000; }
.rank-badge.rank-3 { background: linear-gradient(135deg, #cd7f32, #8b4513); color: #fff; }
.rank-guild-icon { font-size: 24px; margin-right: 10px; }
.rank-guild-info { flex: 1; }
.rank-guild-name { font-size: 13px; color: white; font-weight: bold; }
.rank-guild-score { font-size: 11px; color: #888; }
.rank-score-value { font-size: 14px; color: #ffd700; font-weight: bold; }

.declare-form { background: rgba(0,0,0,0.2); border-radius: 12px; padding: 16px; margin-bottom: 16px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; color: #a0a0b8; font-size: 12px; margin-bottom: 8px; }
.form-group input, .form-group textarea { width: 100%; padding: 10px; background: rgba(0,0,0,0.3); border: 1px solid rgba(184,134,11,0.3); border-radius: 8px; color: white; font-size: 13px; }
.form-group input::placeholder, .form-group textarea::placeholder { color: #666; }
.form-group textarea { resize: none; }
.guild-select-list { display: flex; flex-direction: column; gap: 8px; max-height: 150px; overflow-y: auto; }
.guild-select-item { display: flex; align-items: center; padding: 10px; background: rgba(0,0,0,0.3); border: 2px solid transparent; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
.guild-select-item:hover { border-color: rgba(184,134,11,0.3); }
.guild-select-item.selected { border-color: #ffd700; background: rgba(255,215,0,0.1); }
.guild-emblem-small { font-size: 28px; margin-right: 10px; }
.guild-select-item .guild-info { flex: 1; }
.guild-select-item .guild-name { font-size: 13px; color: white; }
.guild-select-item .guild-power { font-size: 11px; color: #888; }
.select-indicator { width: 24px; height: 24px; background: #ffd700; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #000; font-weight: bold; }
.cost-preview { display: flex; gap: 20px; justify-content: center; }
.cost-item { display: flex; align-items: center; gap: 6px; padding: 10px 16px; background: rgba(0,0,0,0.3); border-radius: 8px; }
.cost-icon { font-size: 18px; }
.cost-value { font-size: 16px; color: #ffd700; font-weight: bold; }
.cost-name { font-size: 12px; color: #888; }
.declare-history { display: flex; flex-direction: column; gap: 8px; }
.history-item { display: flex; align-items: center; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px; }
.history-icon { font-size: 20px; margin-right: 10px; }
.history-info { flex: 1; }
.history-title { font-size: 13px; color: white; }
.history-time { font-size: 11px; color: #666; margin-top: 2px; }
.history-status { padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: bold; }
.history-status.status-pending { background: rgba(251,191,36,0.2); color: #fbbf24; }
.history-status.status-win { background: rgba(16,185,129,0.2); color: #10b981; }
.history-status.status-lose { background: rgba(239,68,68,0.2); color: #ef4444; }

.formation-hint { text-align: center; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px; color: #a0a0b8; font-size: 12px; margin-bottom: 16px; }
.formation-types { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
.formation-type-card { padding: 12px 8px; background: rgba(0,0,0,0.2); border: 2px solid transparent; border-radius: 10px; text-align: center; cursor: pointer; transition: all 0.2s; }
.formation-type-card:hover { border-color: rgba(184,134,11,0.3); }
.formation-type-card.selected { border-color: #ffd700; background: rgba(255,215,0,0.1); }
.formation-icon { font-size: 24px; margin-bottom: 4px; }
.formation-name { font-size: 12px; color: white; font-weight: bold; }
.formation-bonus { font-size: 10px; color: #4ecdc4; margin-top: 4px; }
.formation-grid { margin-bottom: 16px; }
.grid-title { font-size: 13px; color: #ffd700; margin-bottom: 10px; }
.formation-slots { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.formation-slot { aspect-ratio: 1; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
.formation-slot.filled { background: rgba(184,134,11,0.2); border: 2px solid rgba(184,134,11,0.4); }
.formation-slot.empty { background: rgba(0,0,0,0.3); border: 2px dashed rgba(255,255,255,0.1); }
.formation-slot.empty:hover { border-color: rgba(184,134,11,0.3); }
.unit-avatar { font-size: 28px; margin-bottom: 4px; }
.unit-name { font-size: 10px; color: white; text-align: center; }
.unit-power { font-size: 9px; color: #888; }
.slot-empty-icon { font-size: 24px; color: #555; }
.slot-empty-text { font-size: 9px; color: #555; }
.available-units { margin-bottom: 16px; }
.units-title { font-size: 13px; color: #ffd700; margin-bottom: 10px; }
.units-list { display: flex; flex-direction: column; gap: 8px; max-height: 150px; overflow-y: auto; }
.unit-card { display: flex; align-items: center; padding: 10px; background: rgba(0,0,0,0.2); border: 2px solid transparent; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
.unit-card:hover { border-color: rgba(184,134,11,0.3); }
.unit-card.selected { border-color: #10b981; background: rgba(16,185,129,0.1); }
.unit-card .unit-info { flex: 1; }
.unit-card .unit-name { font-size: 13px; text-align: left; }
.unit-card .unit-level { font-size: 11px; color: #888; }
.unit-card .unit-power { font-size: 11px; }
.unit-select-mark { width: 24px; height: 24px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; }

.report-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.report-tab { flex: 1; padding: 10px; background: rgba(0,0,0,0.2); border: none; border-radius: 8px; color: #888; cursor: pointer; font-size: 12px; transition: all 0.2s; }
.report-tab.active { background: rgba(184,134,11,0.3); color: #ffd700; }
.battle-records { display: flex; flex-direction: column; gap: 8px; }
.record-item { display: flex; align-items: center; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px; }
.record-result { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; margin-right: 10px; }
.record-result.win { background: rgba(16,185,129,0.2); color: #10b981; }
.record-result.loss { background: rgba(239,68,68,0.2); color: #ef4444; }
.record-info { flex: 1; }
.record-battle { font-size: 13px; color: white; }
.record-time { font-size: 11px; color: #666; margin-top: 2px; }
.record-score span { font-weight: bold; }
.score-win { color: #10b981; }
.score-loss { color: #ef4444; }

.score-summary { display: flex; gap: 16px; margin-bottom: 16px; }
.score-total, .score-change { flex: 1; padding: 14px; background: rgba(0,0,0,0.3); border-radius: 10px; text-align: center; }
.score-label { display: block; font-size: 12px; color: #888; margin-bottom: 6px; }
.score-value { font-size: 24px; color: #ffd700; font-weight: bold; }
.change-positive { color: #10b981; font-size: 18px; font-weight: bold; }
.change-negative { color: #ef4444; font-size: 18px; font-weight: bold; }
.score-list { display: flex; flex-direction: column; gap: 6px; }
.score-item { display: flex; align-items: center; padding: 8px 10px; background: rgba(0,0,0,0.2); border-radius: 6px; }
.score-source { flex: 1; font-size: 12px; color: white; }
.score-time { font-size: 10px; color: #666; margin-right: 10px; }
.score-amount { font-weight: bold; }
.score-amount.positive { color: #10b981; }
.score-amount.negative { color: #ef4444; }

.stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.stat-card { padding: 16px; background: rgba(0,0,0,0.3); border-radius: 12px; text-align: center; }
.stat-card .stat-icon { font-size: 28px; margin-bottom: 8px; }
.stat-card .stat-value { font-size: 24px; color: #ffd700; font-weight: bold; }
.stat-card .stat-label { font-size: 11px; color: #888; margin-top: 4px; }

.members-stats { display: flex; gap: 16px; margin-bottom: 16px; }
.members-stats .stat-item { flex: 1; padding: 14px; background: rgba(0,0,0,0.3); border-radius: 10px; text-align: center; }
.members-stats .stat-value { display: block; font-size: 24px; color: #ffd700; font-weight: bold; }
.members-stats .stat-label { display: block; font-size: 11px; color: #888; margin-top: 4px; }
.members-list { display: flex; flex-direction: column; gap: 8px; }
.member-item { display: flex; align-items: center; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px; }
.member-avatar { font-size: 32px; margin-right: 12px; }
.member-info { flex: 1; }
.member-name { font-size: 14px; color: white; font-weight: bold; }
.member-power { font-size: 12px; color: #888; }
.member-status { padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: bold; }
.member-status.status-ready { background: rgba(16,185,129,0.2); color: #10b981; }
.member-status.status-fighting { background: rgba(239,68,68,0.2); color: #ef4444; }
.member-status.status-rest { background: rgba(128,128,128,0.2); color: #888; }

@keyframes contestedPulse { 0%, 100% { box-shadow: 0 0 5px rgba(239,68,68,0.3); } 50% { box-shadow: 0 0 15px rgba(239,68,68,0.5); } }
@keyframes battlePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.85; } }

@media (max-width: 600px) {
  .map-grid { grid-template-columns: repeat(2, 1fr); }
  .formation-types { grid-template-columns: repeat(2, 1fr); }
  .formation-slots { grid-template-columns: repeat(3, 1fr); }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .war-banner { min-width: 160px; max-width: 220px; }
}