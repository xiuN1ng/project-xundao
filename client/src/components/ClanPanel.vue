<template>
  <div class="clan-panel" :style="panelStyle">
    <!-- 顶部标签导航 -->
    <div class="clan-nav">
      <button v-for="tab in tabs" :key="tab.key"
        class="nav-btn" :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key">
        <span class="nav-icon">{{ tab.icon }}</span>
        <span class="nav-label">{{ tab.label }}</span>
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="clan-loading">
      <div class="loading-spinner"></div>
      <span>加载中...</span>
    </div>

    <!-- 宗门信息 -->
    <div v-else-if="activeTab === 'info'" class="clan-info-tab">
      <div class="clan-emblem-section">
        <div class="clan-emblem">{{ sectData?.icon || '🏯' }}</div>
        <div class="clan-name-row">
          <h2>{{ sectData?.name || '未加入宗门' }}</h2>
          <span class="clan-level-badge">Lv.{{ sectData?.sect_level || 0 }}</span>
        </div>
        <p class="clan-rank">宗门排名: #{{ sectData?.rank || '--' }}</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-val">{{ sectData?.members?.length || 0 }}</div>
          <div class="stat-label">成员</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">💰</div>
          <div class="stat-val">{{ sectData?.contribution || 0 }}</div>
          <div class="stat-label">贡献度</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🏛️</div>
          <div class="stat-val">{{ sectData?.fund || 0 }}</div>
          <div class="stat-label">宗门基金</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⚔️</div>
          <div class="stat-val">{{ sectData?.exp || 0 }}</div>
          <div class="stat-label">经验值</div>
        </div>
      </div>

      <!-- 宗门加成 -->
      <div v-if="bonus" class="bonus-section">
        <h3 class="section-title">🌟 宗门加成</h3>
        <div class="bonus-grid">
          <div v-if="bonus.attack_boost" class="bonus-item">
            <span>⚔️ 攻击</span><span class="bonus-val">+{{ (bonus.attack_boost * 100).toFixed(0) }}%</span>
          </div>
          <div v-if="bonus.defense_boost" class="bonus-item">
            <span>🛡️ 防御</span><span class="bonus-val">+{{ (bonus.defense_boost * 100).toFixed(0) }}%</span>
          </div>
          <div v-if="bonus.exp_boost" class="bonus-item">
            <span>📖 经验</span><span class="bonus-val">+{{ (bonus.exp_boost * 100).toFixed(0) }}%</span>
          </div>
          <div v-if="bonus.gold_boost" class="bonus-item">
            <span>💎 灵石</span><span class="bonus-val">+{{ (bonus.gold_boost * 100).toFixed(0) }}%</span>
          </div>
        </div>
      </div>

      <!-- 快速操作 -->
      <div class="quick-actions">
        <h3 class="section-title">⚡ 快速操作</h3>
        <div class="action-btns">
          <button class="action-btn donate-btn" @click="showDonate = true">
            💰 捐赠
          </button>
          <button class="action-btn recruit-btn" @click="$emit('changeTab', 'sect')">
            📋 宗门任务
          </button>
        </div>
      </div>

      <!-- 捐赠弹窗 -->
      <div v-if="showDonate" class="modal-overlay" @click.self="showDonate = false">
        <div class="modal-box">
          <h3>💰 宗门捐赠</h3>
          <p>当前贡献度: <strong>{{ sectData?.contribution || 0 }}</strong></p>
          <div class="donate-amounts">
            <button v-for="a in [100, 500, 1000, 5000]" :key="a"
              class="donate-opt" :class="{ selected: donateAmount === a }"
              @click="donateAmount = a">
              {{ a >= 1000 ? (a/1000)+'K' : a }}
            </button>
          </div>
          <div class="modal-btns">
            <button class="modal-cancel" @click="showDonate = false">取消</button>
            <button class="modal-confirm" @click="handleDonate">捐赠</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 成员管理 -->
    <div v-else-if="activeTab === 'members'" class="clan-members-tab">
      <div class="tab-header">
        <h3>👥 宗门成员</h3>
        <span class="member-count">{{ members.length }} 人</span>
      </div>

      <div class="member-list">
        <div v-for="m in members" :key="m.id" class="member-card">
          <div class="member-avatar">{{ m.role === '掌门' ? '👑' : m.role === '副掌门' ? '🎖️' : m.role === '长老' ? '🛡️' : '🥉' }}</div>
          <div class="member-info">
            <div class="member-name">{{ m.username }}</div>
            <div class="member-meta">
              <span class="member-role" :class="'role-' + m.role">{{ m.role }}</span>
              <span>战力: {{ m.combat_power || 0 }}</span>
            </div>
          </div>
          <div class="member-contribution">
            <span class="contrib-value">{{ m.contribution || 0 }}</span>
            <span class="contrib-label">贡献</span>
          </div>
          <div v-if="isLeader && m.player_id !== playerId" class="member-actions">
            <button class="mini-btn" @click="showPromote(m)">晋升</button>
            <button class="mini-btn kick-btn" @click="handleKick(m)">踢出</button>
          </div>
          <div v-if="isLeader && m.player_id !== playerId" class="member-actions" style="margin-top:4px">
            <button class="mini-btn transfer-btn" @click="handleTransfer(m)">转让</button>
          </div>
        </div>
      </div>

      <div v-if="members.length === 0" class="empty-state">
        <p>暂无宗门成员</p>
      </div>

      <!-- 晋升弹窗 -->
      <div v-if="showPromoteModal" class="modal-overlay" @click.self="showPromoteModal = false">
        <div class="modal-box">
          <h3>晋升 {{ promoteTarget?.username }}</h3>
          <div class="role-options">
            <button v-for="r in ['成员', '精英', '长老', '副掌门']" :key="r"
              class="role-opt" :class="{ selected: selectedRole === r }"
              @click="selectedRole = r">{{ r }}</button>
          </div>
          <div class="modal-btns">
            <button class="modal-cancel" @click="showPromoteModal = false">取消</button>
            <button class="modal-confirm" @click="handlePromote">确认晋升</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 宗门建筑 -->
    <div v-else-if="activeTab === 'buildings'" class="clan-buildings-tab">
      <h3 class="section-title">🏛️ 宗门建筑</h3>
      <div class="building-grid">
        <div v-for="b in buildings" :key="b.id" class="building-card">
          <div class="building-icon">{{ b.icon || '🏠' }}</div>
          <div class="building-name">{{ b.name }}</div>
          <div class="building-level">Lv.{{ b.level || 0 }}</div>
          <div class="building-effect">{{ b.effect || '—' }}</div>
          <button v-if="b.level < b.maxLevel" class="upgrade-btn"
            :disabled="!canUpgrade(b)"
            @click="handleUpgradeBuilding(b.id)">
            升级 {{ getUpgradeCost(b) }}灵石
          </button>
          <div v-else class="max-badge">已满级</div>
        </div>
      </div>
    </div>

    <!-- 宗门技能 -->
    <div v-else-if="activeTab === 'skills'" class="clan-skills-tab">
      <div class="skills-header">
        <h3 class="section-title">📖 宗门技能</h3>
        <div class="contrib-balance">
          <span>💰 贡献度: {{ contribution }}</span>
        </div>
      </div>

      <div class="skills-grid">
        <div v-for="s in skills" :key="s.key" class="skill-card">
          <div class="skill-icon">{{ getSkillIcon(s.key) }}</div>
          <div class="skill-name">{{ s.name }}</div>
          <div class="skill-desc">{{ s.desc }}</div>
          <div class="skill-level-bar">
            <div class="skill-level-fill" :style="{ width: (s.current_level / s.max * 100) + '%' }"></div>
            <span class="skill-level-text">{{ s.current_level }}/{{ s.max }}</span>
          </div>
          <button class="skill-learn-btn"
            :disabled="s.current_level >= s.max || contribution < s.cost_next"
            @click="handleLearnSkill(s)">
            {{ s.current_level >= s.max ? '已满级' : `学习 ${s.cost_next}贡献` }}
          </button>
        </div>
      </div>

      <div v-if="skills.length === 0 && !loading" class="empty-state">
        <p>加入宗门后可学习技能</p>
      </div>
    </div>

    <!-- 宗门副本 -->
    <div v-else-if="activeTab === 'dungeon'" class="clan-dungeon-tab">
      <div class="dungeon-header">
        <h3 class="section-title">👹 心魔试炼</h3>
        <span v-if="dungeonData && !dungeonData.available" class="unlock-hint">
          宗门达到{{ dungeonData.unlock_level }}级开放
        </span>
      </div>

      <div v-if="dungeonData?.available" class="dungeon-content">
        <div class="difficulty-tabs">
          <button v-for="d in ['简单', '普通', '困难', '噩梦']" :key="d"
            class="diff-btn" :class="{ active: selectedDifficulty === d }"
            @click="selectedDifficulty = d">{{ d }}</button>
        </div>

        <div class="floor-grid">
          <div v-for="f in 10" :key="f" class="floor-cell"
            :class="{
              cleared: dungeonData.progress && dungeonData.progress[f],
              current: f === currentFloor
            }"
            @click="selectFloor(f)">
            <span class="floor-num">{{ f }}</span>
            <span v-if="dungeonData.progress && dungeonData.progress[f]" class="floor-check">✓</span>
          </div>
        </div>

        <div v-if="currentFloor" class="dungeon-info-box">
          <p>第 {{ currentFloor }} 层</p>
          <p class="reward-preview">奖励: {{ getDungeonRewards(currentFloor) }}</p>
          <p class="mult-info">难度倍数: {{ getDifficultyMult(selectedDifficulty) }}x</p>
          <button class="challenge-btn" @click="handleChallenge">挑战！</button>
        </div>

        <!-- 挑战结果 -->
        <div v-if="challengeResult" class="result-box">
          <p class="result-msg">{{ challengeResult.message }}</p>
          <div v-if="challengeResult.rewards" class="rewards-row">
            <span>💰 {{ challengeResult.rewards.gold }}</span>
            <span>📖 {{ challengeResult.rewards.exp }}</span>
            <span v-if="challengeResult.rewards.item">🎁 {{ challengeResult.rewards.item }}</span>
          </div>
        </div>
      </div>

      <div v-else-if="dungeonData && !dungeonData.available" class="empty-state locked">
        <div class="lock-icon">🔒</div>
        <p>宗门需达到 {{ dungeonData.unlock_level }} 级</p>
        <p class="current-level">当前: Lv.{{ sectData?.sect_level || 0 }}</p>
      </div>
    </div>

    <!-- 红包 -->
    <div v-else-if="activeTab === 'redpackets'" class="clan-redpackets-tab">
      <div class="rp-header">
        <h3 class="section-title">🧧 宗门红包</h3>
        <button class="send-rp-btn" @click="showSendRP = true">发红包</button>
      </div>

      <div class="redpacket-list">
        <div v-for="rp in redPackets" :key="rp.id" class="rp-card">
          <div class="rp-sender">{{ rp.sender_name }}</div>
          <div class="rp-msg">{{ rp.message }}</div>
          <div class="rp-amount">💰 {{ rp.amount }}</div>
          <div class="rp-status">已领 {{ rp.claimed }}/20</div>
          <button v-if="!rp.claims?.find(c => c.player_id === playerId) && rp.claimed < 20"
            class="claim-rp-btn" @click="handleClaimRP(rp.id)">
            领取
          </button>
          <span v-else class="rp-claimed">已领</span>
        </div>
      </div>

      <div v-if="redPackets.length === 0" class="empty-state">
        <p>暂无红包记录</p>
      </div>

      <!-- 发红包弹窗 -->
      <div v-if="showSendRP" class="modal-overlay" @click.self="showSendRP = false">
        <div class="modal-box">
          <h3>🧧 发红包</h3>
          <div class="rp-form">
            <label>金额 (灵石)</label>
            <input v-model.number="rpAmount" type="number" min="100" placeholder="最低100" />
            <label>祝福语</label>
            <input v-model="rpMessage" type="text" placeholder="恭喜发财！" />
            <label>类型</label>
            <div class="rp-type-btns">
              <button :class="{ active: rpType === 'random' }" @click="rpType = 'random'">随机</button>
              <button :class="{ active: rpType === 'fixed' }" @click="rpType = 'fixed'">定额</button>
            </div>
          </div>
          <div class="modal-btns">
            <button class="modal-cancel" @click="showSendRP = false">取消</button>
            <button class="modal-confirm" @click="handleSendRP">发送</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 管理面板 -->
    <div v-else-if="activeTab === 'admin'" class="clan-admin-tab">
      <div v-if="!isLeader" class="empty-state">
        <p>🔒 仅掌门可访问管理面板</p>
      </div>
      <div v-else>
        <h3 class="section-title">⚙️ 宗门管理</h3>

        <div class="admin-stats">
          <div class="admin-stat">
            <span class="admin-stat-val">{{ adminData?.stats?.total_members || 0 }}</span>
            <span class="admin-stat-label">成员</span>
          </div>
          <div class="admin-stat">
            <span class="admin-stat-val">{{ adminData?.stats?.total_contribution || 0 }}</span>
            <span class="admin-stat-label">总贡献</span>
          </div>
          <div class="admin-stat">
            <span class="admin-stat-val">{{ adminData?.stats?.total_fund || 0 }}</span>
            <span class="admin-stat-label">宗门基金</span>
          </div>
        </div>

        <div class="admin-logs">
          <h4 class="section-title" style="font-size:13px">📜 最近日志</h4>
          <div class="log-list">
            <div v-for="log in (adminData?.logs || []).slice(0, 20)" :key="log.id" class="log-item">
              <span class="log-action">{{ log.action }}</span>
              <span class="log-detail">{{ log.detail || '' }}</span>
              <span class="log-time">{{ formatTime(log.created_at) }}</span>
            </div>
            <div v-if="!adminData?.logs?.length" class="empty-state"><p>暂无日志</p></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast提示 -->
    <div v-if="toastMsg" class="clan-toast" :class="toastType">{{ toastMsg }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { sectApi } from '../api'

const props = defineProps({ playerId: { type: Number, default: 1 } })
const emit = defineEmits(['changeTab'])

const activeTab = ref('info')
const loading = ref(false)
const toastMsg = ref('')
const toastType = ref('info')

const tabs = [
  { key: 'info',       label: '宗门',  icon: '🏯' },
  { key: 'members',    label: '成员',  icon: '👥' },
  { key: 'buildings',  label: '建筑',  icon: '🏛️' },
  { key: 'skills',     label: '技能',  icon: '📖' },
  { key: 'dungeon',    label: '副本',  icon: '👹' },
  { key: 'redpackets', label: '红包',  icon: '🧧' },
  { key: 'admin',      label: '管理',  icon: '⚙️' }
]

const sectData     = ref(null)
const bonus        = ref(null)
const members      = ref([])
const skills       = ref([])
const redPackets   = ref([])
const adminData    = ref(null)
const contribution = ref(0)
const dungeonData  = ref(null)
const selectedDifficulty = ref('普通')
const currentFloor      = ref(null)
const challengeResult   = ref(null)

const playerId = computed(() => props.playerId || 1)
const isLeader = computed(() => sectData.value?.leader_id === playerId.value)

const buildings = computed(() => {
  if (!sectData.value?.buildings) return []
  const SECT_BUILDINGS = {
    mountain_gate:   { icon: '⛩️', name: '山门',     effect: '弟子上限+2/级',      maxLevel: 10 },
    main_hall:       { icon: '🏛️', name: '主殿',     effect: '宗门经验+5%/级',    maxLevel: 10 },
    treasury:        { icon: '💰', name: '仓库',     effect: '基金上限+1000/级',  maxLevel: 10 },
    training_hall:   { icon: '⚔️', name: '传功堂',   effect: '弟子修炼+10%/级',   maxLevel: 10 },
    library:         { icon: '📚', name: '藏经阁',   effect: '技能经验+5%/级',    maxLevel: 10 },
    alchemy_room:    { icon: '⚗️', name: '炼丹房',   effect: '丹药效果+8%/级',    maxLevel: 8 },
    beast_den:       { icon: '🦁', name: '灵兽园',   effect: '灵兽经验+10%/级',   maxLevel: 8 },
    hall_of_justice: { icon: '⚖️', name: '执法堂',   effect: '成员管理+1/级',     maxLevel: 5 }
  }
  return Object.entries(sectData.value.buildings)
    .map(([key, level]) => ({ id: key, ...SECT_BUILDINGS[key], level, maxLevel: SECT_BUILDINGS[key]?.maxLevel || 10 }))
    .filter(b => b.icon)
})

const showDonate       = ref(false)
const donateAmount     = ref(100)
const showPromoteModal = ref(false)
const promoteTarget    = ref(null)
const selectedRole     = ref('成员')
const showSendRP       = ref(false)
const rpAmount         = ref(1000)
const rpMessage        = ref('')
const rpType           = ref('random')

const panelStyle = {
  background: 'linear-gradient(135deg, rgba(20,15,50,0.93) 0%, rgba(10,10,30,0.95) 100%)',
  backgroundImage: "url('/assets/bg-abyss-20260321.png'), linear-gradient(135deg, rgba(20,15,50,0.93) 0%, rgba(10,10,30,0.95) 100%)",
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundBlendMode: 'overlay'
}

function getSkillIcon(key) {
  return { attack_boost:'⚔️', defense_boost:'🛡️', exp_boost:'📖', gold_boost:'💎', drop_boost:'🎁', speed_boost:'⏰', rescue_boost:'🆘', war_boost:'⚔️' }[key] || '✨'
}
function canUpgrade(b) { return !!sectData.value?.building_costs?.[b.id] }
function getUpgradeCost(b) { return sectData.value?.building_costs?.[b.id] || 0 }
function getDifficultyMult(d) { return { '简单':0.8, '普通':1.0, '困难':1.5, '噩梦':2.0 }[d] || 1.0 }
function getDungeonRewards(f) { return ['灵兽蛋','紫色装备','灵石×5000','称号·心魔克星'][(f-1)%4] }
function formatTime(ts) { if (!ts) return ''; const d=new Date(ts); return `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}` }
function showToast(msg, type='info') { toastMsg.value = msg; toastType.value = type; setTimeout(() => { toastMsg.value = '' }, 2500) }

async function loadSectInfo() {
  try {
    const res = await sectApi.getInfo(playerId.value)
    if (res.data?.success !== false && res.data?.data) {
      sectData.value = res.data.data
      contribution.value = res.data.data.contribution || 0
    }
  } catch (e) {}
}
async function loadBonus() {
  try {
    const res = await sectApi.getBonus(playerId.value)
    if (res.data?.success && res.data?.data) bonus.value = res.data.data
  } catch (e) {}
}
async function loadMembers() {
  try {
    const res = await sectApi.getMembers(playerId.value)
    if (res.data?.success) members.value = res.data.data || []
  } catch (e) {}
}
async function loadSkills() {
  try {
    const res = await sectApi.getSkills(playerId.value)
    if (res.data?.success) { skills.value = res.data.data || []; contribution.value = res.data.total_contribution || contribution.value }
  } catch (e) {}
}
async function loadRedPackets() {
  try {
    const res = await sectApi.getRedPackets(playerId.value)
    if (res.data?.success) redPackets.value = res.data.data || []
  } catch (e) {}
}
async function loadDungeon() {
  try {
    const res = await sectApi.getDungeon(playerId.value)
    if (res.data?.success) dungeonData.value = res.data.data
  } catch (e) {}
}
async function loadAdmin() {
  try {
    const res = await sectApi.getAdmin(playerId.value)
    if (res.data?.success) adminData.value = res.data.data
  } catch (e) {}
}

async function loadAll() { loading.value = true; await Promise.all([loadSectInfo(), loadBonus()]); loading.value = false }

async function handleDonate() {
  try {
    const res = await sectApi.donate(playerId.value, donateAmount.value)
    if (res.data?.success) {
      showToast(`捐赠成功！+${donateAmount.value}贡献`, 'success')
      contribution.value += donateAmount.value
      if (sectData.value) sectData.value.contribution = (sectData.value.contribution||0) + donateAmount.value
    } else { showToast(res.data?.message || '捐赠失败', 'error') }
  } catch (e) { showToast('捐赠失败', 'error') }
  showDonate.value = false
}
async function handleUpgradeBuilding(buildingId) {
  try {
    const res = await sectApi.upgradeBuilding(buildingId)
    if (res.data?.success) { showToast('建筑升级成功！', 'success'); await loadSectInfo() }
    else { showToast(res.data?.message || '升级失败', 'error') }
  } catch (e) { showToast('升级失败', 'error') }
}
function showPromote(member) { promoteTarget.value = member; selectedRole.value = '成员'; showPromoteModal.value = true }
async function handlePromote() {
  try {
    const res = await sectApi.promoteMember(playerId.value, promoteTarget.value.player_id, selectedRole.value)
    if (res.data?.success) { showToast(res.data.message, 'success'); await loadMembers() }
    else { showToast(res.data?.message || '晋升失败', 'error') }
  } catch (e) { showToast('晋升失败', 'error') }
  showPromoteModal.value = false
}
async function handleKick(member) {
  if (!confirm(`确认踢出 ${member.username}？`)) return
  try {
    const res = await sectApi.kickMember(playerId.value, member.player_id)
    if (res.data?.success) { showToast(`已踢出 ${member.username}`, 'success'); await loadMembers() }
    else { showToast(res.data?.message || '操作失败', 'error') }
  } catch (e) { showToast('操作失败', 'error') }
}
async function handleTransfer(member) {
  if (!confirm(`确认将掌门之位转让给 ${member.username}？此操作不可撤销！`)) return
  try {
    const res = await sectApi.transferLeader(playerId.value, member.player_id)
    if (res.data?.success) { showToast('掌门已转让！', 'success'); await loadSectInfo() }
    else { showToast(res.data?.message || '转让失败', 'error') }
  } catch (e) { showToast('转让失败', 'error') }
}
async function handleLearnSkill(skill) {
  try {
    const res = await sectApi.learnSkill(playerId.value, skill.key)
    if (res.data?.success) { showToast(res.data.message, 'success'); await loadSkills(); await loadSectInfo() }
    else { showToast(res.data?.message || '学习失败', 'error') }
  } catch (e) { showToast('学习失败', 'error') }
}
function selectFloor(f) { currentFloor.value = f; challengeResult.value = null }
async function handleChallenge() {
  if (!currentFloor.value) return
  try {
    const res = await sectApi.challengeDungeon(playerId.value, currentFloor.value, selectedDifficulty.value)
    if (res.data?.success) { challengeResult.value = res.data; showToast(`通关第${currentFloor.value}层！`, 'success'); await loadDungeon() }
    else { showToast(res.data?.message || '挑战失败', 'error') }
  } catch (e) { showToast('挑战失败', 'error') }
}
async function handleSendRP() {
  if (rpAmount.value < 100) { showToast('红包最小100灵石', 'error'); return }
  try {
    const res = await sectApi.sendRedPacket(playerId.value, rpAmount.value, rpType.value, rpMessage.value)
    if (res.data?.success) { showToast('红包已发出！', 'success'); await loadRedPackets() }
    else { showToast(res.data?.message || '发送失败', 'error') }
  } catch (e) { showToast('发送失败', 'error') }
  showSendRP.value = false
}
async function handleClaimRP(packetId) {
  try {
    const res = await sectApi.claimRedPacket(playerId.value, packetId)
    if (res.data?.success) { showToast(`领取到 ${res.data.amount} 灵石！`, 'success'); await loadRedPackets() }
    else { showToast(res.data?.message || '领取失败', 'error') }
  } catch (e) { showToast('领取失败', 'error') }
}

watch(activeTab, async (tab) => {
  if (tab === 'members') await loadMembers()
  else if (tab === 'skills') await loadSkills()
  else if (tab === 'redpackets') await loadRedPackets()
  else if (tab === 'dungeon') await loadDungeon()
  else if (tab === 'admin') await loadAdmin()
})

onMounted(loadAll)
</script>

<style scoped>
.clan-panel {
  position: relative; min-height: 100vh;
  color: #e8d5f0;
  font-family: 'Microsoft YaHei', sans-serif;
  padding-bottom: 80px;
}
.clan-nav {
  display: flex; gap: 2px; padding: 8px 10px 0;
  background: rgba(0,0,0,0.3); overflow-x: auto;
  scrollbar-width: none; flex-wrap: wrap;
}
.clan-nav::-webkit-scrollbar { display: none; }
.nav-btn {
  display: flex; flex-direction: column; align-items: center;
  padding: 6px 10px; border: none;
  background: rgba(255,255,255,0.05); color: #a89cc8;
  border-radius: 8px 8px 0 0; cursor: pointer; transition: all 0.2s; min-width: 48px;
}
.nav-btn.active { background: rgba(147,51,234,0.4); color: #f0e6ff; }
.nav-btn:hover:not(.active) { background: rgba(255,255,255,0.1); }
.nav-icon { font-size: 16px; }
.nav-label { font-size: 10px; margin-top: 2px; }

.clan-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px; gap: 12px; color: #a89cc8; }
.loading-spinner { width: 32px; height: 32px; border: 3px solid rgba(147,51,234,0.3); border-top-color: #9333ea; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.section-title { font-size: 14px; color: #c9a0dc; margin: 16px 16px 8px; border-bottom: 1px solid rgba(147,51,234,0.3); padding-bottom: 6px; }

.clan-emblem-section { text-align: center; padding: 24px 16px 16px; }
.clan-emblem { font-size: 72px; margin-bottom: 8px; }
.clan-name-row { display: flex; align-items: center; justify-content: center; gap: 10px; }
.clan-name-row h2 { margin: 0; color: #f0e6ff; font-size: 20px; }
.clan-level-badge { background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px; }
.clan-rank { color: #a89cc8; font-size: 12px; margin: 4px 0 0; }

.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; padding: 0 12px; margin-top: 8px; }
.stat-card { background: rgba(147,51,234,0.15); border: 1px solid rgba(147,51,234,0.25); border-radius: 10px; padding: 10px 4px; text-align: center; }
.stat-icon { font-size: 18px; margin-bottom: 4px; }
.stat-val { font-size: 15px; font-weight: bold; color: #e9d5ff; }
.stat-label { font-size: 10px; color: #a89cc8; }

.bonus-section { margin-top: 8px; }
.bonus-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; padding: 0 12px; }
.bonus-item { display: flex; justify-content: space-between; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); padding: 6px 10px; border-radius: 6px; font-size: 12px; }
.bonus-val { color: #34d399; font-weight: bold; }

.quick-actions { margin-top: 8px; }
.action-btns { display: flex; gap: 10px; padding: 0 12px; }
.action-btn { flex: 1; padding: 10px; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; }
.donate-btn { background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; }
.recruit-btn { background: rgba(255,255,255,0.1); color: #e8d5f0; border: 1px solid rgba(255,255,255,0.1); }

/* 弹窗 */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-box { background: linear-gradient(135deg, #1a1040, #2d1b69); border: 1px solid rgba(147,51,234,0.5); border-radius: 16px; padding: 24px; width: 300px; max-width: 90vw; color: #e8d5f0; }
.modal-box h3 { margin: 0 0 16px; color: #f0e6ff; font-size: 16px; }
.modal-btns { display: flex; gap: 10px; margin-top: 16px; }
.modal-cancel, .modal-confirm { flex: 1; padding: 8px; border-radius: 8px; border: none; cursorpointer; font-size: 13px; }
.modal-cancel { background: rgba(255,255,255,0.1); color: #a89cc8; }
.modal-confirm { background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; }

.donate-amounts { display: flex; gap: 6px; margin: 10px 0; }
.donate-opt { flex: 1; padding: 6px; border: 1px solid rgba(147,51,234,0.4); background: rgba(255,255,255,0.05); color: #e8d5f0; border-radius: 6px; cursor: pointer; font-size: 12px; }
.donate-opt.selected { background: rgba(147,51,234,0.4); border-color: #9333ea; }

/* 成员 */
.tab-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px 0; }
.tab-header h3 { margin: 0; font-size: 15px; color: #c9a0dc; }
.member-count { font-size: 12px; color: #a89cc8; background: rgba(147,51,234,0.2); padding: 2px 8px; border-radius: 10px; }
.member-list { padding: 8px 12px; display: flex; flex-direction: column; gap: 8px; }
.member-card { display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(147,51,234,0.2); border-radius: 10px; padding: 10px; }
.member-avatar { font-size: 28px; flex-shrink: 0; }
.member-info { flex: 1; min-width: 0; }
.member-name { font-size: 13px; color: #e9d5ff; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.member-meta { display: flex; gap: 6px; font-size: 11px; color: #a89cc8; margin-top: 2px; }
.member-role { padding: 1px 6px; border-radius: 4px; font-size: 10px; }
.role-掌门 { background: rgba(234,179,8,0.3); color: #fbbf24; }
.role-副掌门 { background: rgba(168,85,247,0.3); color: #c084fc; }
.role-长老 { background: rgba(59,130,246,0.3); color: #60a5fa; }
.role-精英 { background: rgba(16,185,129,0.3); color: #34d399; }
.role-成员 { background: rgba(255,255,255,0.1); color: #a89cc8; }
.member-contribution { text-align: center; flex-shrink: 0; }
.contrib-value { display: block; font-size: 14px; color: #fbbf24; font-weight: bold; }
.contrib-label { font-size: 10px; color: #a89cc8; }
.member-actions { display: flex; flex-direction: column; gap: 2px; flex-shrink: 0; }
.mini-btn { padding: 3px 6px; border: none; border-radius: 4px; cursor: pointer; font-size: 10px; background: rgba(147,51,234,0.3); color: #e9d5ff; }
.kick-btn { background: rgba(239,68,68,0.3); color: #fca5a5; }
.transfer-btn { background: rgba(234,179,8,0.3); color: #fbbf24; font-size: 10px; padding: 3px 6px; border: none; border-radius: 4px; cursor: pointer; }

.role-options { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
.role-opt { padding: 8px 14px; border: 1px solid rgba(147,51,234,0.4); background: rgba(255,255,255,0.05); color: #e8d5f0; border-radius: 8px; cursor: pointer; }
.role-opt.selected { background: rgba(147,51,234,0.4); border-color: #9333ea; }

/* 建筑 */
.building-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 0 12px; }
.building-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(147,51,234,0.2); border-radius: 10px; padding: 12px; text-align: center; }
.building-icon { font-size: 32px; margin-bottom: 4px; }
.building-name { font-size: 13px; color: #e9d5ff; font-weight: bold; }
.building-level { font-size: 11px; color: #9333ea; margin: 2px 0; }
.building-effect { font-size: 10px; color: #a89cc8; margin-bottom: 6px; }
.upgrade-btn { width: 100%; padding: 6px; border: none; border-radius: 6px; background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; cursor: pointer; font-size: 11px; }
.upgrade-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.max-badge { font-size: 11px; color: #34d399; background: rgba(52,211,153,0.1); padding: 4px; border-radius: 4px; }

/* 技能 */
.skills-header { display: flex; align-items: center; justify-content: space-between; padding-right: 16px; }
.contrib-balance { font-size: 12px; color: #fbbf24; }
.skills-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 0 12px; }
.skill-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(147,51,234,0.2); border-radius: 10px; padding: 12px; }
.skill-icon { font-size: 24px; margin-bottom: 4px; }
.skill-name { font-size: 13px; color: #e9d5ff; font-weight: bold; }
.skill-desc { font-size: 10px; color: #a89cc8; margin: 2px 0 6px; }
.skill-level-bar { position: relative; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; margin-bottom: 6px; overflow: hidden; }
.skill-level-fill { height: 100%; background: linear-gradient(90deg, #7c3aed, #a855f7); border-radius: 4px; transition: width 0.3s; }
.skill-level-text { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 9px; color: white; font-weight: bold; }
.skill-learn-btn { width: 100%; padding: 5px; border: none; border-radius: 6px; background: linear-gradient(135deg, #059669, #10b981); color: white; cursor: pointer; font-size: 11px; }
.skill-learn-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* 副本 */
.dungeon-header { display: flex; align-items: center; gap: 10px; }
.unlock-hint { font-size: 11px; color: #f97316; }
.difficulty-tabs { display: flex; gap: 6px; padding: 8px 12px; }
.diff-btn { flex: 1; padding: 6px; border: 1px solid rgba(147,51,234,0.3); background: rgba(255,255,255,0.05); color: #a89cc8; border-radius: 6px; cursor: pointer; font-size: 12px; }
.diff-btn.active { background: rgba(147,51,234,0.4); color: #f0e6ff; border-color: #9333ea; }
.floor-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; padding: 0 12px; }
.floor-cell { aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); border: 1px solid rgba(147,51,234,0.2); border-radius: 8px; cursor: pointer; transition: all 0.2s; }
.floor-cell.current { border-color: #9333ea; background: rgba(147,51,234,0.3); }
.floor-cell.cleared { background: rgba(52,211,153,0.2); border-color: rgba(52,211,153,0.4); }
.floor-num { font-size: 14px; color: #e9d5ff; font-weight: bold; }
.floor-check { font-size: 10px; color: #34d399; }
.dungeon-info-box { margin: 12px; padding: 12px; background: rgba(147,51,234,0.15); border: 1px solid rgba(147,51,234,0.3); border-radius: 10px; text-align: center; }
.dungeon-info-box p { margin: 4px 0; font-size: 13px; color: #e9d5ff; }
.reward-preview { color: #fbbf24 !important; font-size: 12px !important; }
.mult-info { font-size: 11px !important; color: #a89cc8 !important; }
.challenge-btn { margin-top: 8px; padding: 8px 24px; border: none; border-radius: 8px; background: linear-gradient(135deg, #dc2626, #ef4444); color: white; cursor: pointer; font-size: 14px; }
.result-box { margin: 12px; padding: 12px; background: rgba(52,211,153,0.15); border: 1px solid rgba(52,211,153,0.3); border-radius: 10px; text-align: center; }
.result-msg { color: #34d399; font-size: 14px; font-weight: bold; margin-bottom: 8px; }
.rewards-row { display: flex; gap: 12px; justify-content: center; font-size: 12px; color: #e9d5ff; }
.locked { text-align: center; padding: 40px; }
.lock-icon { font-size: 48px; margin-bottom: 12px; }
.current-level { font-size: 12px; color: #a89cc8; }

/* 红包 */
.rp-header { display: flex; align-items: center; justify-content: space-between; padding-right: 12px; }
.send-rp-btn { padding: 5px 12px; border: none; border-radius: 8px; background: linear-gradient(135deg, #dc2626, #ef4444); color: white; cursor: pointer; font-size: 12px; }
.redpacket-list { padding: 0 12px; display: flex; flex-direction: column; gap: 8px; }
.rp-card { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(147,51,234,0.2); border-radius: 10px; padding: 10px; }
.rp-sender { font-size: 12px; color: #e9d5ff; font-weight: bold; min-width: 60px; }
.rp-msg { flex: 1; font-size: 11px; color: #a89cc8; }
.rp-amount { font-size: 13px; color: #fbbf24; font-weight: bold; }
.rp-status { font-size: 10px; color: #a89cc8; }
.claim-rp-btn { padding: 4px 10px; border: none; border-radius: 6px; background: linear-gradient(135deg, #dc2626, #ef4444); color: white; cursor: pointer; font-size: 11px; }
.rp-claimed { font-size: 11px; color: #a89cc8; }
.rp-form { display: flex; flex-direction: column; gap: 8px; }
.rp-form label { font-size: 12px; color: #a89cc8; }
.rp-form input { padding: 8px; border: 1px solid rgba(147,51,234,0.3); background: rgba(255,255,255,0.05); border-radius: 6px; color: #e8d5f0; font-size: 13px; }
.rp-type-btns { display: flex; gap: 8px; }
.rp-type-btns button { flex: 1; padding: 6px; border: 1px solid rgba(147,51,234,0.3); background: rgba(255,255,255,0.05); color: #a89cc8; border-radius: 6px; cursor: pointer; font-size: 12px; }
.rp-type-btns button.active { background: rgba(147,51,234,0.4); border-color: #9333ea; color: #f0e6ff; }

/* 管理 */
.admin-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 0 12px; }
.admin-stat { background: rgba(147,51,234,0.15); border: 1px solid rgba(147,51,234,0.25); border-radius: 10px; padding: 12px 4px; text-align: center; }
.admin-stat-val { display: block; font-size: 16px; font-weight: bold; color: #e9d5ff; }
.admin-stat-label { font-size: 10px; color: #a89cc8; }
.admin-logs { margin-top: 8px; }
.log-list { padding: 0 12px; max-height: 300px; overflow-y: auto; }
.log-item { display: flex; gap: 8px; padding: 6px 0; border-bottom: 1px solid rgba(147,51,234,0.1); font-size: 11px; }
.log-action { color: #c084fc; min-width: 60px; }
.log-detail { flex: 1; color: #a89cc8; }
.log-time { color: #6b7280; font-size: 10px; flex-shrink: 0; }

/* 空状态 */
.empty-state { text-align: center; padding: 40px; color: #a89cc8; font-size: 13px; }

/* Toast */
.clan-toast { position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); padding: 10px 20px; border-radius: 10px; font-size: 13px; z-index: 2000; white-space: nowrap; }
.clan-toast.info { background: rgba(147,51,234,0.9); color: white; }
.clan-toast.success { background: rgba(16,185,129,0.9); color: white; }
.clan-toast.error { background: rgba(220,38,38,0.9); color: white; }
