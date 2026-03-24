<template>
  <BasePanel
    title="仙盟"
    icon="🏯"
    :tab-items="tabs"
    :default-tab="activeTab"
    variant="primary"
    @tab-change="activeTab = $event"
    @close="$emit('close')"
  >
    <!-- ========== 仙盟信息 ========== -->
    <div v-if="activeTab === 'info'" class="clan-info-tab">
      <div class="info-emblem">
        <div class="info-avatar">{{ sectData?.icon || '🏯' }}</div>
        <div class="info-title-row">
          <h2>{{ sectData?.name || '未加入宗门' }}</h2>
          <span class="level-badge">Lv.{{ sectData?.sect_level || 0 }}</span>
        </div>
        <p class="info-rank">宗门排名: #{{ sectData?.rank || '--' }}</p>
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
      <div v-if="bonus" class="bonus-grid">
        <div v-if="bonus.attack_boost" class="bonus-item">
          <span>⚔️ 攻击</span><span class="bonus-green">+{{ (bonus.attack_boost * 100).toFixed(0) }}%</span>
        </div>
        <div v-if="bonus.defense_boost" class="bonus-item">
          <span>🛡️ 防御</span><span class="bonus-green">+{{ (bonus.defense_boost * 100).toFixed(0) }}%</span>
        </div>
        <div v-if="bonus.exp_boost" class="bonus-item">
          <span>📖 经验</span><span class="bonus-green">+{{ (bonus.exp_boost * 100).toFixed(0) }}%</span>
        </div>
        <div v-if="bonus.gold_boost" class="bonus-item">
          <span>💎 灵石</span><span class="bonus-green">+{{ (bonus.gold_boost * 100).toFixed(0) }}%</span>
        </div>
      </div>

      <!-- 快速操作 -->
      <div class="quick-actions">
        <div class="section-label">⚡ 快速操作</div>
        <div class="action-row">
          <BaseButton variant="primary" @click="showDonate = true">💰 捐赠</BaseButton>
          <BaseButton variant="ghost" @click="$emit('changeTab', 'sect')">📋 宗门任务</BaseButton>
        </div>
      </div>

      <!-- 公告 -->
      <div v-if="sectData?.notice" class="notice-box">
        <span class="notice-label">📜 公告</span>
        <span>{{ sectData.notice }}</span>
      </div>
    </div>

    <!-- ========== 成员 ========== -->
    <div v-else-if="activeTab === 'members'" class="clan-members-tab">
      <div class="tab-header-row">
        <h3>👥 宗门成员</h3>
        <span class="count-badge">{{ members.length }} 人</span>
      </div>

      <div class="member-list">
        <div v-for="m in members" :key="m.id" class="member-row">
          <div class="member-avatar">{{ m.role === '掌门' ? '👑' : m.role === '副掌门' ? '🎖️' : m.role === '长老' ? '🛡️' : '🥉' }}</div>
          <div class="member-info">
            <div class="member-name">{{ m.username }}</div>
            <div class="member-meta">
              <span class="role-badge" :class="'role-' + m.role">{{ m.role }}</span>
              <span>战力: {{ m.combat_power || 0 }}</span>
            </div>
          </div>
          <div class="member-contrib">
            <span class="contrib-num">{{ m.contribution || 0 }}</span>
            <span class="contrib-lbl">贡献</span>
          </div>
          <div v-if="isLeader && m.player_id !== playerId" class="member-ops">
            <BaseButton variant="ghost" size="sm" @click="showPromote(m)">晋升</BaseButton>
            <BaseButton variant="ghost" size="sm" @click="handleKick(m)">踢出</BaseButton>
            <BaseButton variant="ghost" size="sm" @click="handleTransfer(m)">转让</BaseButton>
          </div>
        </div>
      </div>

      <div v-if="members.length === 0" class="empty-box">
        <p>暂无宗门成员</p>
      </div>

      <!-- 晋升弹窗 -->
      <div v-if="showPromoteModal" class="modal-overlay" @click.self="showPromoteModal = false">
        <div class="mini-modal">
          <h3>晋升 {{ promoteTarget?.username }}</h3>
          <div class="role-row">
            <BaseButton
              v-for="r in ['成员', '精英', '长老', '副掌门']" :key="r"
              variant="ghost" size="sm"
              :class="{ 'role-selected': selectedRole === r }"
              @click="selectedRole = r"
            >{{ r }}</BaseButton>
          </div>
          <div class="modal-btn-row">
            <BaseButton variant="ghost" @click="showPromoteModal = false">取消</BaseButton>
            <BaseButton variant="primary" @click="handlePromote">确认晋升</BaseButton>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 技能 ========== -->
    <div v-else-if="activeTab === 'skills'" class="clan-skills-tab">
      <div class="tab-header-row">
        <h3>📖 宗门技能</h3>
        <span class="contrib-inline">💰 贡献度: {{ contribution }}</span>
      </div>

      <div class="skills-grid">
        <div v-for="s in skills" :key="s.key" class="skill-card">
          <div class="skill-top">
            <span class="skill-icon">{{ getSkillIcon(s.key) }}</span>
            <div>
              <div class="skill-name">{{ s.name }}</div>
              <div class="skill-desc">{{ s.desc }}</div>
            </div>
          </div>
          <div class="skill-bar">
            <div class="skill-fill" :style="{ width: (s.current_level / s.max * 100) + '%' }"></div>
            <span class="skill-level-text">{{ s.current_level }}/{{ s.max }}</span>
          </div>
          <BaseButton
            variant="primary" size="sm"
            :disabled="s.current_level >= s.max || contribution < s.cost_next"
            @click="handleLearnSkill(s)"
          >
            {{ s.current_level >= s.max ? '已满级' : `学习 ${s.cost_next}贡献` }}
          </BaseButton>
        </div>
      </div>

      <div v-if="skills.length === 0 && !loading" class="empty-box">
        <p>加入宗门后可学习技能</p>
      </div>
    </div>

    <!-- ========== 副本 ========== -->
    <div v-else-if="activeTab === 'dungeon'" class="clan-dungeon-tab">
      <div class="tab-header-row">
        <h3>👹 心魔试炼</h3>
        <span v-if="dungeonData && !dungeonData.available" class="unlock-hint">
          宗门达到{{ dungeonData.unlock_level }}级开放
        </span>
      </div>

      <div v-if="dungeonData?.available">
        <div class="diff-row">
          <BaseButton
            v-for="d in ['简单', '普通', '困难', '噩梦']" :key="d"
            variant="ghost" size="sm"
            :class="{ 'diff-active': selectedDifficulty === d }"
            @click="selectedDifficulty = d"
          >{{ d }}</BaseButton>
        </div>

        <div class="floor-grid">
          <div
            v-for="f in 10" :key="f" class="floor-cell"
            :class="{ cleared: dungeonData.progress?.[f], current: f === currentFloor }"
            @click="selectFloor(f)"
          >
            <span>{{ f }}</span>
            <span v-if="dungeonData.progress?.[f]">✓</span>
          </div>
        </div>

        <div v-if="currentFloor" class="floor-info">
          <p>第 {{ currentFloor }} 层</p>
          <p>奖励: {{ getDungeonRewards(currentFloor) }}</p>
          <p>难度倍数: {{ getDifficultyMult(selectedDifficulty) }}x</p>
          <BaseButton variant="danger" @click="handleChallenge">挑战！</BaseButton>
        </div>

        <div v-if="challengeResult" class="result-box">
          <p>{{ challengeResult.message }}</p>
          <div v-if="challengeResult.rewards" class="reward-row">
            <span>💰 {{ challengeResult.rewards.gold }}</span>
            <span>📖 {{ challengeResult.rewards.exp }}</span>
            <span v-if="challengeResult.rewards.item">🎁 {{ challengeResult.rewards.item }}</span>
          </div>
        </div>
      </div>

      <div v-else-if="dungeonData && !dungeonData.available" class="empty-box locked">
        <div>🔒</div>
        <p>宗门需达到 {{ dungeonData.unlock_level }} 级</p>
        <p>当前: Lv.{{ sectData?.sect_level || 0 }}</p>
      </div>
    </div>

    <!-- ========== 红包 ========== -->
    <div v-else-if="activeTab === 'redpackets'" class="clan-redpackets-tab">
      <div class="tab-header-row">
        <h3>🧧 宗门红包</h3>
        <BaseButton variant="primary" size="sm" @click="showSendRP = true">发红包</BaseButton>
      </div>

      <div class="rp-list">
        <div v-for="rp in redPackets" :key="rp.id" class="rp-card">
          <div class="rp-sender">{{ rp.sender_name }}</div>
          <div class="rp-msg">{{ rp.message }}</div>
          <div class="rp-amount">💰 {{ rp.amount }}</div>
          <div class="rp-status">已领 {{ rp.claimed }}/20</div>
          <BaseButton
            v-if="!rp.claims?.find(c => c.player_id === playerId) && rp.claimed < 20"
            variant="gold" size="sm"
            @click="handleClaimRP(rp.id)"
          >领取</BaseButton>
          <span v-else class="rp-claimed">已领</span>
        </div>
      </div>

      <div v-if="redPackets.length === 0" class="empty-box">
        <p>暂无红包记录</p>
      </div>

      <!-- 发红包弹窗 -->
      <div v-if="showSendRP" class="modal-overlay" @click.self="showSendRP = false">
        <div class="mini-modal">
          <h3>🧧 发红包</h3>
          <div class="form-group">
            <label>金额 (灵石)</label>
            <input v-model.number="rpAmount" type="number" min="100" placeholder="最低100" />
          </div>
          <div class="form-group">
            <label>祝福语</label>
            <input v-model="rpMessage" type="text" placeholder="恭喜发财！" />
          </div>
          <div class="form-group">
            <label>类型</label>
            <div class="type-row">
              <BaseButton variant="ghost" size="sm" :class="{ 'diff-active': rpType === 'random' }" @click="rpType = 'random'">随机</BaseButton>
              <BaseButton variant="ghost" size="sm" :class="{ 'diff-active': rpType === 'fixed' }" @click="rpType = 'fixed'">定额</BaseButton>
            </div>
          </div>
          <div class="modal-btn-row">
            <BaseButton variant="ghost" @click="showSendRP = false">取消</BaseButton>
            <BaseButton variant="primary" @click="handleSendRP">发送</BaseButton>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 管理 ========== -->
    <div v-else-if="activeTab === 'admin'" class="clan-admin-tab">
      <div v-if="!isLeader" class="empty-box">
        <p>🔒 仅掌门可访问管理面板</p>
      </div>
      <div v-else>
        <div class="section-label">⚙️ 宗门管理</div>

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

        <div class="section-label" style="font-size:12px">📜 最近日志</div>
        <div class="log-list">
          <div v-for="log in (adminData?.logs || []).slice(0, 20)" :key="log.id" class="log-item">
            <span>{{ log.action }}</span>
            <span class="log-detail">{{ log.detail || '' }}</span>
            <span class="log-time">{{ formatTime(log.created_at) }}</span>
          </div>
          <div v-if="!adminData?.logs?.length" class="empty-box"><p>暂无日志</p></div>
        </div>
      </div>
    </div>

    <!-- ========== 捐赠弹窗 ========== -->
    <div v-if="showDonate" class="modal-overlay" @click.self="showDonate = false">
      <div class="mini-modal">
        <h3>💰 宗门捐赠</h3>
        <p>当前贡献度: <strong>{{ sectData?.contribution || 0 }}</strong></p>
        <div class="donate-row">
          <BaseButton
            v-for="a in [100, 500, 1000, 5000]" :key="a"
            variant="ghost" size="sm"
            :class="{ 'diff-active': donateAmount === a }"
            @click="donateAmount = a"
          >{{ a >= 1000 ? a/1000 + 'K' : a }}</BaseButton>
        </div>
        <div class="modal-btn-row">
          <BaseButton variant="ghost" @click="showDonate = false">取消</BaseButton>
          <BaseButton variant="primary" :loading="donating" @click="handleDonate">捐赠</BaseButton>
        </div>
      </div>
    </div>
  </BasePanel>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { guildApi } from '../api'
import { useToast } from './common/toastComposable.js'
import BasePanel from './base/BasePanel.vue'
import BaseButton from './base/BaseButton.vue'

const props = defineProps({ playerId: { type: Number, default: 1 } })
const emit = defineEmits(['changeTab', 'close'])

const toast = useToast()
const activeTab = ref('info')
const loading = ref(false)
const donating = ref(false)

const tabs = [
  { id: 'info',      name: '仙盟',  icon: '🏯' },
  { id: 'members',  name: '成员',  icon: '👥' },
  { id: 'skills',   name: '技能',  icon: '📖' },
  { id: 'admin',    name: '管理',  icon: '⚙️' }
]

const sectData     = ref(null)
const bonus        = ref(null)
const members      = ref([])
const skills       = ref([])
const adminData    = ref(null)
const contribution = ref(0)

const redPackets   = ref([])
const dungeonData  = ref(null)
const selectedDifficulty = ref('普通')
const currentFloor      = ref(null)
const challengeResult  = ref(null)

const playerId = computed(() => props.playerId || 1)
const isLeader = computed(() => sectData.value?.leaderId === playerId.value)

const buildings = computed(() => []) // 建筑功能后端暂未实现

const showDonate       = ref(false)
const donateAmount     = ref(100)
const showPromoteModal = ref(false)
const promoteTarget    = ref(null)
const selectedRole     = ref('成员')
const showSendRP       = ref(false)
const rpAmount         = ref(1000)
const rpMessage        = ref('')
const rpType           = ref('random')

// ---- Data loaders ----

async function loadSectInfo() {
  try {
    const res = await guildApi.getPlayerGuild(playerId.value)
    if (res.data?.guild) {
      const g = res.data.guild
      sectData.value = {
        ...g,
        leader_id: g.leaderId,
        sect_level: g.level,
        fund: g.exp || 0,
        rank: '--',
        icon: '🏯'
      }
      if (res.data.myRole) sectData.value.myRole = res.data.myRole
    } else {
      sectData.value = null
    }
  } catch (e) {
    console.error('loadSectInfo failed:', e)
    toast.error('加载仙盟信息失败')
  }
}

async function loadMembers() {
  if (sectData.value?.members) {
    members.value = sectData.value.members.map(m => ({
      ...m,
      player_id: m.id,
      username: m.name,
      contribution: 0
    }))
  }
}

async function loadSkills() {
  if (!sectData.value?.id) return
  try {
    const res = await guildApi.getSkills(sectData.value.id)
    if (res.data?.skills) skills.value = res.data.skills
  } catch (e) {
    console.error('loadSkills failed:', e)
  }
}

async function loadAdmin() { /* 后端暂未实现 */ }
async function loadRedPackets() { /* 后端暂未实现 */ }
async function loadDungeon() { /* 后端暂未实现 */ }

// ---- Actions ----

async function handleDonate() {
  if (!sectData.value?.id) return
  donating.value = true
  try {
    const res = await guildApi.donate(playerId.value, donateAmount.value)
    if (res.data?.success) {
      toast.success('捐赠成功！')
      await loadSectInfo()
    } else {
      toast.error(res.data?.message || '捐赠失败')
    }
  } catch (e) {
    toast.error('捐赠功能暂未开放')
  } finally {
    donating.value = false
    showDonate.value = false
  }
}

async function handlePromote() {
  if (!promoteTarget.value) return
  try {
    const res = await guildApi.promoteMember(
      playerId.value,
      promoteTarget.value.player_id,
      selectedRole.value
    )
    if (res.data?.success) {
      toast.success(`已晋升为${selectedRole.value}`)
      await loadMembers()
    } else {
      toast.error(res.data?.message || '晋升失败')
    }
  } catch (e) {
    toast.error('晋升功能暂未开放')
  }
  showPromoteModal.value = false
}

async function handleKick(member) {
  try {
    const res = await guildApi.kickMember(playerId.value, member.player_id)
    if (res.data?.success) {
      toast.success(`已踢出 ${member.username}`)
      await loadMembers()
    } else {
      toast.error(res.data?.message || '踢出失败')
    }
  } catch (e) {
    toast.error('踢出功能暂未开放')
  }
}

async function handleTransfer(member) {
  try {
    const res = await guildApi.transferLeader(playerId.value, member.player_id)
    if (res.data?.success) {
      toast.success(`已转让给 ${member.username}`)
      await loadSectInfo()
    } else {
      toast.error(res.data?.message || '转让失败')
    }
  } catch (e) {
    toast.error('转让功能暂未开放')
  }
}

function showPromote(member) {
  promoteTarget.value = member
  selectedRole.value = '成员'
  showPromoteModal.value = true
}

async function handleLearnSkill(skill) {
  if (!sectData.value?.id) return
  try {
    const res = await guildApi.upgradeSkill(playerId.value, sectData.value.id, skill.id)
    if (res.data?.success) {
      toast.success(res.data.message)
      await loadSkills()
    } else {
      toast.error(res.data?.message || '升级失败')
    }
  } catch (e) {
    toast.error('升级失败')
  }
}

function selectFloor(f) {
  currentFloor.value = f
  challengeResult.value = null
}

async function handleChallenge() {
  toast.info('宗门副本后端暂未实现')
}

async function handleSendRP() {
  toast.info('红包功能后端暂未实现')
  showSendRP.value = false
}

async function handleClaimRP() {
  toast.info('红包功能后端暂未实现')
}

function getSkillIcon(key) {
  return {
    attack_boost: '⚔️', defense_boost: '🛡️', exp_boost: '📖',
    gold_boost: '💎', drop_boost: '🎁', speed_boost: '⏰',
    rescue_boost: '🆘', war_boost: '⚔️'
  }[key] || '✨'
}

function getDifficultyMult(d) {
  return { '简单': 0.8, '普通': 1.0, '困难': 1.5, '噩梦': 2.0 }[d] || 1.0
}

function getDungeonRewards(f) {
  return ['灵兽蛋', '紫色装备', '灵石×5000', '称号·心魔克星'][(f - 1) % 4]
}

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function loadAll() {
  loading.value = true
  await loadSectInfo()
  if (sectData.value) await loadMembers()
  loading.value = false
}

onMounted(loadAll)
</script>

<style scoped>
/* ── Layout helpers ─────────────────────────────────── */
.info-emblem { text-align: center; padding: 8px 0 12px; }
.info-avatar { font-size: 56px; margin-bottom: 6px; }
.info-title-row { display: flex; align-items: center; justify-content: center; gap: 10px; }
.info-title-row h2 { margin: 0; color: #f0e6ff; font-size: 18px; }
.level-badge {
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px;
}
.info-rank { color: #a89cc8; font-size: 12px; margin: 4px 0 0; }

.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 12px; }
.stat-card { background: rgba(147,51,234,0.15); border: 1px solid rgba(147,51,234,0.25); border-radius: 10px; padding: 10px 4px; text-align: center; }
.stat-icon { font-size: 18px; }
.stat-val { font-size: 15px; font-weight: bold; color: #e9d5ff; }
.stat-label { font-size: 10px; color: #a89cc8; }

.bonus-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-top: 12px; }
.bonus-item { display: flex; justify-content: space-between; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); padding: 6px 10px; border-radius: 6px; font-size: 12px; }
.bonus-green { color: #34d399; font-weight: bold; }

.quick-actions { margin-top: 16px; }
.section-label { font-size: 13px; color: #c9a0dc; margin-bottom: 8px; border-bottom: 1px solid rgba(147,51,234,0.3); padding-bottom: 4px; }
.action-row { display: flex; gap: 10px; }

.notice-box { margin-top: 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(147,51,234,0.2); border-radius: 8px; padding: 10px 12px; font-size: 13px; }
.notice-label { color: #c9a0dc; margin-right: 8px; }

/* Members */
.tab-header-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.tab-header-row h3 { margin: 0; font-size: 14px; color: #c9a0dc; }
.count-badge { font-size: 12px; color: #a89cc8; background: rgba(147,51,234,0.2); padding: 2px 8px; border-radius: 10px; }

.member-list { display: flex; flex-direction: column; gap: 8px; }
.member-row { display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(147,51,234,0.2); border-radius: 10px; padding: 10px; }
.member-avatar { font-size: 24px; flex-shrink: 0; }
.member-info { flex: 1; min-width: 0; }
.member-name { font-size: 13px; color: #e9d5ff; font-weight: bold; }
.member-meta { display: flex; gap: 6px; font-size: 11px; color: #a89cc8; margin-top: 2px; }
.role-badge { padding: 1px 6px; border-radius: 4px; font-size: 10px; }
.role-掌门 { background: rgba(234,179,8,0.3); color: #fbbf24; }
.role-副掌门 { background: rgba(168,85,247,0.3); color: #c084fc; }
.role-长老 { background: rgba(59,130,246,0.3); color: #60a5fa; }
.role-精英 { background: rgba(16,185,129,0.3); color: #34d399; }
.role-成员 { background: rgba(255,255,255,0.1); color: #a89cc8; }
.member-contrib { text-align: center; flex-shrink: 0; }
.contrib-num { display: block; font-size: 14px; font-weight: bold; color: #e9d5ff; }
.contrib-lbl { font-size: 10px; color: #a89cc8; }
.member-ops { display: flex; flex-direction: column; gap: 4px; flex-shrink: 0; }

/* Skills */
.contrib-inline { font-size: 12px; color: #a89cc8; }
.skills-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 8px; }
.skill-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(147,51,234,0.2); border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.skill-top { display: flex; gap: 8px; align-items: flex-start; }
.skill-icon { font-size: 22px; }
.skill-name { font-size: 13px; color: #e9d5ff; font-weight: bold; }
.skill-desc { font-size: 11px; color: #a89cc8; margin-top: 2px; }
.skill-bar { position: relative; height: 8px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden; }
.skill-fill { height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 4px; transition: width 0.3s; }
.skill-level-text { position: absolute; right: 4px; top: -1px; font-size: 10px; color: #a89cc8; }

/* Dungeon */
.diff-row { display: flex; gap: 6px; margin-bottom: 12px; }
.diff-active { background: rgba(102,126,234,0.35) !important; border-color: #667eea !important; color: #fff !important; }
.floor-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-bottom: 12px; }
.floor-cell { background: rgba(255,255,255,0.05); border: 1px solid rgba(147,51,234,0.2); border-radius: 8px; padding: 10px; text-align: center; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 13px; transition: all 0.2s; }
.floor-cell:hover { background: rgba(102,126,234,0.2); }
.floor-cell.cleared { background: rgba(16,185,129,0.2); border-color: rgba(16,185,129,0.4); }
.floor-cell.current { background: rgba(147,51,234,0.4); border-color: #9333ea; }
.unlock-hint { font-size: 12px; color: #a89cc8; }
.floor-info { background: rgba(255,255,255,0.04); border: 1px solid rgba(147,51,234,0.2); border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 6px; align-items: center; font-size: 13px; }
.result-box { margin-top: 10px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); border-radius: 10px; padding: 12px; text-align: center; }
.reward-row { display: flex; gap: 12px; justify-content: center; margin-top: 6px; font-size: 13px; }
.empty-box { text-align: center; padding: 32px; color: #a89cc8; }
.empty-box.locked { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.locked > div:first-child { font-size: 48px; }

/* Red Packets */
.rp-list { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
.rp-card { display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(147,51,234,0.2); border-radius: 10px; padding: 10px; }
.rp-sender { font-weight: bold; font-size: 13px; color: #e9d5ff; flex-shrink: 0; }
.rp-msg { flex: 1; font-size: 12px; color: #a89cc8; }
.rp-amount { font-size: 13px; font-weight: bold; color: #ffd700; flex-shrink: 0; }
.rp-status { font-size: 11px; color: #a89cc8; flex-shrink: 0; }
.rp-claimed { font-size: 12px; color: #a89cc8; }
.form-group { margin-bottom: 10px; }
.form-group label { display: block; font-size: 12px; color: #a89cc8; margin-bottom: 4px; }
.form-group input { width: 100%; padding: 8px; background: rgba(255,255,255,0.06); border: 1px solid rgba(147,51,234,0.3); border-radius: 6px; color: #e8d5f0; font-size: 13px; box-sizing: border-box; }
.form-group input:focus { outline: none; border-color: #9333ea; }
.type-row { display: flex; gap: 6px; }

/* Admin */
.admin-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
.admin-stat { background: rgba(147,51,234,0.15); border: 1px solid rgba(147,51,234,0.25); border-radius: 10px; padding: 12px; text-align: center; }
.admin-stat-val { display: block; font-size: 18px; font-weight: bold; color: #e9d5ff; }
.admin-stat-label { font-size: 11px; color: #a89cc8; }
.log-list { display: flex; flex-direction: column; gap: 4px; }
.log-item { display: flex; gap: 8px; font-size: 12px; color: #a89cc8; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
.log-detail { flex: 1; color: #667eea; }
.log-time { flex-shrink: 0; font-size: 11px; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.mini-modal { background: linear-gradient(135deg, #1a1040, #2d1b69); border: 1px solid rgba(147,51,234,0.5); border-radius: 16px; padding: 24px; width: 300px; max-width: 90vw; color: #e8d5f0; }
.mini-modal h3 { margin: 0 0 16px; color: #f0e6ff; font-size: 16px; }
.role-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
.role-selected { background: rgba(147,51,234,0.4) !important; border-color: #9333ea !important; color: #fff !important; }
.modal-btn-row { display: flex; gap: 10px; margin-top: 16px; }
.modal-btn-row > * { flex: 1; }
.donate-row { display: flex; gap: 6px; margin: 10px 0 16px; }

/* Loading */
.loading-row { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px; gap: 12px; color: #a89cc8; }
.loading-spin { width: 28px; height: 28px; border: 3px solid rgba(147,51,234,0.3); border-top-color: #9333ea; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
