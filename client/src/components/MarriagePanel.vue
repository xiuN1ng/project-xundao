<template>
  <div class="marriage-panel">
    <div class="panel-header">
      <h2>💑 仙侣系统</h2>
    </div>

    <div class="tab-nav">
      <button :class="{ active: subTab === 'apply' }" @click="subTab = 'apply'">结缘</button>
      <button :class="{ active: subTab === 'partner' }" @click="subTab = 'partner'" :disabled="!statusData?.has_partner">仙侣</button>
      <button :class="{ active: subTab === 'cultivate' }" @click="subTab = 'cultivate'" :disabled="!statusData?.has_partner">双修</button>
    </div>

    <!-- 结缘 Tab -->
    <div v-if="subTab === 'apply'" class="tab-content">
      <!-- 无仙侣状态 -->
      <div v-if="!statusData?.has_partner">
        <div class="section-title">🔍 寻找道侣</div>
        <div class="input-row">
          <input v-model="applyTargetId" type="number" placeholder="对方玩家ID" />
          <button class="btn-primary" @click="sendApply" :disabled="sending">
            {{ sending ? '发送中...' : '发送结缘申请 (1000灵石)' }}
          </button>
        </div>

        <div v-if="statusData?.pending_application" class="pending-notice">
          <div class="notice-title">📩 待处理申请</div>
          <div class="pending-item">
            <span>{{ statusData.pending_application.applicant_name }} ({{ statusData.pending_application.applicant_id }}) 申请与您结缘</span>
            <div class="btn-row">
              <button class="btn-accept" @click="acceptApply(statusData.pending_application.applicant_id)">接受</button>
              <button class="btn-reject" @click="rejectApply(statusData.pending_application.id)">拒绝</button>
            </div>
          </div>
        </div>

        <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>
        <div v-if="successMsg" class="success-msg">{{ successMsg }}</div>

        <div class="section-title" style="margin-top:20px">📜 亲密度等级</div>
        <div class="intimacy-levels">
          <div v-for="lv in INTIMACY_LEVELS" :key="lv.level" class="level-card" :class="{ current: statusData?.intimacy_level === lv.level }">
            <div class="level-name">{{ lv.level }}</div>
            <div class="level-range">{{ lv.min }} ~ {{ lv.max }}</div>
            <div class="level-bonus">灵石+{{ (lv.spirit_bonus * 100).toFixed(0) }}% 经验+{{ (lv.exp_bonus * 100).toFixed(0) }}%</div>
            <div class="level-title">{{ lv.title }}</div>
          </div>
        </div>
      </div>

      <!-- 已有仙侣 -->
      <div v-else class="partner-section">
        <div class="partner-card">
          <div class="partner-avatar">💑</div>
          <div class="partner-info">
            <div class="partner-name">{{ statusData.partner?.username }}</div>
            <div class="partner-meta">境界: {{ statusData.partner?.realm_name }} | 等级: {{ statusData.partner?.level }}</div>
            <div class="partner-online" :class="{ online: statusData.partner?.online_status === 'online' }">
              {{ statusData.partner?.online_status === 'online' ? '🟢 在线' : '⚫ 离线' }}
            </div>
          </div>
        </div>
        <div class="intimacy-bar-section">
          <div class="intimacy-label">
            <span>亲密度: {{ statusData.intimacy }}</span>
            <span>{{ statusData.intimacy_level }} - {{ statusData.title }}</span>
          </div>
          <div class="intimacy-bar-bg">
            <div class="intimacy-bar-fill" :style="{ width: intimacyPercent + '%' }"></div>
          </div>
          <div class="bonus-row">
            <span class="bonus-tag">💎 灵石加成 +{{ (statusData.spirit_bonus * 100).toFixed(0) }}%</span>
            <span class="bonus-tag">✨ 经验加成 +{{ (statusData.exp_bonus * 100).toFixed(0) }}%</span>
          </div>
        </div>
        <div class="marriage-date">🎉 结缘日期: {{ formatDate(statusData.marriage_date) }}</div>
        <button class="btn-secondary" @click="subTab = 'cultivate'">进入双修</button>
      </div>
    </div>

    <!-- 仙侣 Tab -->
    <div v-if="subTab === 'partner'" class="tab-content">
      <div v-if="statusData?.has_partner" class="partner-detail">
        <div class="section-title">💑 我的道侣</div>
        <div class="detail-card">
          <div class="detail-row"><span class="label">道侣名称:</span><span class="value">{{ statusData.partner?.username }}</span></div>
          <div class="detail-row"><span class="label">境界:</span><span class="value">{{ statusData.partner?.realm_name }}</span></div>
          <div class="detail-row"><span class="label">等级:</span><span class="value">{{ statusData.partner?.level }}</span></div>
          <div class="detail-row"><span class="label">在线状态:</span>
            <span :class="{ 'text-green': statusData.partner?.online_status === 'online' }">
              {{ statusData.partner?.online_status === 'online' ? '🟢 在线' : '⚫ 离线' }}
            </span>
          </div>
        </div>

        <div class="section-title" style="margin-top:16px">💕 亲密度信息</div>
        <div class="detail-card">
          <div class="detail-row"><span class="label">当前等级:</span><span class="value">{{ statusData.intimacy_level }} ({{ statusData.intimacy }}/{{ nextIntimacyThreshold }})</span></div>
          <div class="detail-row"><span class="label">称号:</span><span class="value">{{ statusData.title }}</span></div>
          <div class="detail-row"><span class="label">灵石加成:</span><span class="value text-gold">+{{ (statusData.spirit_bonus * 100).toFixed(0) }}%</span></div>
          <div class="detail-row"><span class="label">经验加成:</span><span class="value text-purple">+{{ (statusData.exp_bonus * 100).toFixed(0) }}%</span></div>
          <div class="detail-row"><span class="label">结缘日期:</span><span class="value">{{ formatDate(statusData.marriage_date) }}</span></div>
          <div class="detail-row"><span class="label">今日双修:</span><span class="value">{{ statusData.daily_double_cultivate_used || 0 }}/3</span></div>
          <div class="detail-row"><span class="label">累计双修:</span><span class="value">{{ statusData.double_cultivate_count || 0 }}次</span></div>
        </div>

        <div class="section-title" style="margin-top:16px">🎁 夫妻技能</div>
        <div class="skill-list">
          <div class="skill-item" v-for="skill in coupleSkills" :key="skill.name">
            <span class="skill-icon">{{ skill.icon }}</span>
            <span class="skill-name">{{ skill.name }}</span>
            <span class="skill-desc">{{ skill.desc }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 双修 Tab -->
    <div v-if="subTab === 'cultivate'" class="tab-content">
      <div v-if="!statusData?.has_partner" class="empty-state">
        <p>暂无仙侣，无法进行双修</p>
        <button class="btn-primary" @click="subTab = 'apply'">去寻找道侣</button>
      </div>
      <div v-else>
        <div class="cultivate-header">
          <div class="cultivate-info">
            <div class="cultivate-title">🌟 双修</div>
            <div class="cultivate-desc">与道侣一同修炼，获得大量灵力和经验，亲密度+50</div>
          </div>
          <div class="cultivate-uses">
            <span>今日剩余: {{ 3 - (statusData.daily_double_cultivate_used || 0) }} / 3</span>
          </div>
        </div>

        <div class="cultivate-rewards">
          <div class="reward-card">
            <span class="reward-icon">💎</span>
            <span class="reward-val">+{{ cultivationReward.spiritStones }}</span>
            <span class="reward-label">灵石</span>
          </div>
          <div class="reward-card">
            <span class="reward-icon">✨</span>
            <span class="reward-val">+{{ cultivationReward.exp }}</span>
            <span class="reward-label">经验</span>
          </div>
          <div class="reward-card">
            <span class="reward-icon">💕</span>
            <span class="reward-val">+50</span>
            <span class="reward-label">亲密度</span>
          </div>
        </div>

        <div class="cultivate-bonus">
          <span class="bonus-tag gold">💎 总灵石加成 +{{ ((statusData.spirit_bonus + 0.05) * 100).toFixed(0) }}%</span>
          <span class="bonus-tag purple">✨ 总经验加成 +{{ ((statusData.exp_bonus + 0.05) * 100).toFixed(0) }}%</span>
        </div>

        <button class="btn-cultivate" @click="doDoubleCultivate" :disabled="cultivating || (statusData.daily_double_cultivate_used || 0) >= 3">
          {{ cultivating ? '🌿 双修中...' : '🌿 开始双修' }}
        </button>

        <div v-if="cultivating" class="cultivate-animation">
          <div class="spirit-orb" v-for="n in 8" :key="n" :style="{ animationDelay: (n * 0.15) + 's' }"></div>
        </div>

        <div v-if="cultivateResult" class="cultivate-result">
          <div class="result-title">🌸 双修完成！</div>
          <div class="result-item">💎 获得灵石: +{{ cultivateResult.spirit_stones_gained }}</div>
          <div class="result-item">✨ 获得经验: +{{ cultivateResult.exp_gained }}</div>
          <div class="result-item">💕 亲密度: +{{ cultivateResult.intimacy_gained }}</div>
          <div class="result-item">📊 当前亲密度: {{ cultivateResult.current_intimacy }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'

const INTIMACY_LEVELS = [
  { level: '萍水', min: 0, max: 499, title: '初识', spirit_bonus: 0.05, exp_bonus: 0.05 },
  { level: '知己', min: 500, max: 1999, title: '知己', spirit_bonus: 0.10, exp_bonus: 0.10 },
  { level: '伴侣', min: 2000, max: 4999, title: '道侣', spirit_bonus: 0.15, exp_bonus: 0.15 },
  { level: '神仙眷侣', min: 5000, max: 9999, title: '神仙眷侣', spirit_bonus: 0.25, exp_bonus: 0.25 },
  { level: '天作之合', min: 10000, max: 999999, title: '天作之合', spirit_bonus: 0.40, exp_bonus: 0.40 }
]

const coupleSkills = [
  { icon: '💑', name: '阴阳和合', desc: '双修时额外+10%灵石收益' },
  { icon: '🌟', name: '心意相通', desc: '双修时额外+10%经验收益' },
  { icon: '💎', name: '资源共享', desc: '道侣在线时挂机收益+5%' },
  { icon: '🛡️', name: '守护契约', desc: '受到致命伤害时，道侣可替你承受50%' }
]

export default {
  name: 'MarriagePanel',
  setup() {
    const subTab = ref('apply')
    const statusData = ref(null)
    const applyTargetId = ref('')
    const sending = ref(false)
    const cultivating = ref(false)
    const cultivateResult = ref(null)
    const errorMsg = ref('')
    const successMsg = ref('')

    const playerId = computed(() => {
      try {
        const data = localStorage.getItem('playerData')
        return data ? JSON.parse(data)?.id : null
      } catch { return null }
    })

    const cultivationReward = computed(() => {
      if (!statusData.value) return { spiritStones: 0, exp: 0 }
      const spiritBonus = (statusData.value.spirit_bonus || 0) + 0.05
      const expBonus = (statusData.value.exp_bonus || 0) + 0.05
      const realmLevel = statusData.value.player?.realm_level || 1
      const realmMult = 1 + realmLevel * 0.2
      return {
        spiritStones: Math.floor(100 * realmMult * (1 + spiritBonus)),
        exp: Math.floor(500 * realmMult * (1 + expBonus))
      }
    })

    const intimacyPercent = computed(() => {
      if (!statusData.value) return 0
      const lv = INTIMACY_LEVELS.find(l => l.level === statusData.value.intimacy_level)
      if (!lv) return 0
      const prevMax = INTIMACY_LEVELS[INTIMACY_LEVELS.indexOf(lv) - 1]?.max || 0
      const range = lv.max - prevMax
      const progress = statusData.value.intimacy - prevMax
      return Math.min(100, Math.floor((progress / range) * 100))
    })

    const nextIntimacyThreshold = computed(() => {
      if (!statusData.value) return 0
      const idx = INTIMACY_LEVELS.findIndex(l => l.level === statusData.value.intimacy_level)
      return idx >= 0 && idx < INTIMACY_LEVELS.length - 1 ? INTIMACY_LEVELS[idx + 1].min : '已满级'
    })

    async function fetchStatus() {
      if (!playerId.value) return
      try {
        const res = await fetch(`http://localhost:3001/api/partner/status?player_id=${playerId.value}`)
        const json = await res.json()
        if (json.success) statusData.value = json.data
      } catch (e) {
        console.error('Failed to fetch partner status:', e)
      }
    }

    async function sendApply() {
      errorMsg.value = ''
      successMsg.value = ''
      if (!applyTargetId.value) { errorMsg.value = '请输入对方玩家ID'; return }
      if (applyTargetId.value == playerId.value) { errorMsg.value = '不能与自己结缘'; return }
      sending.value = true
      try {
        const res = await fetch('http://localhost:3001/api/partner/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ player_id: playerId.value, target_id: parseInt(applyTargetId.value) })
        })
        const json = await res.json()
        if (json.success) {
          successMsg.value = json.message
          applyTargetId.value = ''
          await fetchStatus()
        } else {
          errorMsg.value = json.error || '申请失败'
        }
      } catch (e) {
        errorMsg.value = '网络错误: ' + e.message
      }
      sending.value = false
    }

    async function acceptApply(applicantId) {
      errorMsg.value = ''
      try {
        const res = await fetch('http://localhost:3001/api/partner/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ player_id: playerId.value, applicant_id: applicantId })
        })
        const json = await res.json()
        if (json.success) {
          successMsg.value = '结缘成功！'
          await fetchStatus()
          setTimeout(() => { subTab.value = 'partner' }, 1000)
        } else {
          errorMsg.value = json.error || '接受失败'
        }
      } catch (e) {
        errorMsg.value = '网络错误: ' + e.message
      }
    }

    async function rejectApply(appId) {
      errorMsg.value = ''
      try {
        const res = await fetch('http://localhost:3001/api/partner/reject', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ player_id: playerId.value, application_id: appId })
        })
        const json = await res.json()
        if (json.success) {
          successMsg.value = '已拒绝'
          await fetchStatus()
        } else {
          errorMsg.value = json.error || '拒绝失败'
        }
      } catch (e) {
        errorMsg.value = '网络错误: ' + e.message
      }
    }

    async function doDoubleCultivate() {
      cultivating.value = true
      cultivateResult.value = null
      errorMsg.value = ''
      try {
        const res = await fetch('http://localhost:3001/api/partner/doublecultivate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ player_id: playerId.value })
        })
        const json = await res.json()
        if (json.success) {
          cultivateResult.value = json.data
          await fetchStatus()
        } else {
          errorMsg.value = json.error || '双修失败'
        }
      } catch (e) {
        errorMsg.value = '网络错误: ' + e.message
      }
      cultivating.value = false
    }

    function formatDate(dateStr) {
      if (!dateStr) return '—'
      return new Date(dateStr).toLocaleDateString('zh-CN')
    }

    onMounted(() => { fetchStatus() })

    return {
      subTab, statusData, applyTargetId, sending, cultivating,
      cultivateResult, errorMsg, successMsg, INTIMACY_LEVELS,
      coupleSkills, cultivationReward, intimacyPercent, nextIntimacyThreshold,
      playerId, fetchStatus, sendApply, acceptApply, rejectApply,
      doDoubleCultivate, formatDate
    }
  }
}
</script>

<style scoped>
.marriage-panel { padding: 16px; max-width: 600px; margin: 0 auto; }
.panel-header { text-align: center; margin-bottom: 16px; }
.panel-header h2 { margin: 0; color: #f093fb; font-size: 20px; }

.tab-nav { display: flex; gap: 8px; margin-bottom: 16px; background: rgba(255,255,255,0.05); padding: 8px; border-radius: 12px; }
.tab-nav button { flex: 1; padding: 8px 12px; background: rgba(255,255,255,0.05); border: none; border-radius: 8px; color: #ccc; cursor: pointer; transition: all 0.2s; font-size: 14px; }
.tab-nav button.active { background: rgba(240,147,251,0.2); color: #f093fb; }
.tab-nav button:disabled { opacity: 0.4; cursor: not-allowed; }

.tab-content { background: rgba(255,255,255,0.03); border-radius: 12px; padding: 16px; }

.section-title { font-size: 14px; color: #f093fb; margin-bottom: 10px; font-weight: bold; }

.input-row { display: flex; gap: 8px; margin-bottom: 12px; }
.input-row input { flex: 1; padding: 10px 12px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 14px; }
.input-row input::placeholder { color: rgba(255,255,255,0.3); }

.btn-primary { padding: 10px 16px; background: linear-gradient(135deg, #667eea, #764ba2); border: none; border-radius: 8px; color: #fff; cursor: pointer; font-size: 14px; white-space: nowrap; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary { padding: 10px 20px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff; cursor: pointer; font-size: 14px; margin-top: 12px; }
.btn-accept { padding: 6px 16px; background: rgba(76,175,80,0.3); border: 1px solid #4caf50; border-radius: 6px; color: #4caf50; cursor: pointer; font-size: 13px; }
.btn-reject { padding: 6px 16px; background: rgba(244,67,54,0.2); border: 1px solid #f44336; border-radius: 6px; color: #f44336; cursor: pointer; font-size: 13px; }

.pending-notice { background: rgba(240,147,251,0.08); border: 1px solid rgba(240,147,251,0.2); border-radius: 10px; padding: 12px; margin: 12px 0; }
.notice-title { font-size: 13px; color: #f093fb; margin-bottom: 8px; }
.pending-item { display: flex; flex-direction: column; gap: 8px; font-size: 13px; color: #ccc; }
.btn-row { display: flex; gap: 8px; }

.intimacy-levels { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px; margin-top: 8px; }
.level-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 10px; text-align: center; transition: all 0.2s; }
.level-card.current { border-color: #f093fb; background: rgba(240,147,251,0.1); }
.level-name { font-size: 14px; color: #f093fb; font-weight: bold; }
.level-range { font-size: 11px; color: rgba(255,255,255,0.5); margin: 4px 0; }
.level-bonus { font-size: 11px; color: #4caf50; }
.level-title { font-size: 12px; color: #aaa; margin-top: 4px; }

.error-msg { background: rgba(244,67,54,0.15); border: 1px solid rgba(244,67,54,0.3); border-radius: 6px; padding: 8px 12px; color: #f44336; font-size: 13px; margin: 8px 0; }
.success-msg { background: rgba(76,175,80,0.15); border: 1px solid rgba(76,175,80,0.3); border-radius: 6px; padding: 8px 12px; color: #4caf50; font-size: 13px; margin: 8px 0; }

.partner-section { display: flex; flex-direction: column; gap: 12px; }
.partner-card { display: flex; gap: 16px; align-items: center; background: rgba(240,147,251,0.08); border: 1px solid rgba(240,147,251,0.2); border-radius: 12px; padding: 16px; }
.partner-avatar { font-size: 48px; }
.partner-info { flex: 1; }
.partner-name { font-size: 18px; color: #f093fb; font-weight: bold; margin-bottom: 4px; }
.partner-meta { font-size: 13px; color: #aaa; }
.partner-online { font-size: 12px; color: #666; margin-top: 4px; }
.partner-online.online { color: #4caf50; }

.intimacy-bar-section { background: rgba(255,255,255,0.03); border-radius: 10px; padding: 12px; }
.intimacy-label { display: flex; justify-content: space-between; font-size: 13px; color: #ccc; margin-bottom: 8px; }
.intimacy-bar-bg { height: 10px; background: rgba(255,255,255,0.1); border-radius: 5px; overflow: hidden; }
.intimacy-bar-fill { height: 100%; background: linear-gradient(90deg, #f093fb, #e040fb); border-radius: 5px; transition: width 0.5s ease; }
.bonus-row { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
.bonus-tag { font-size: 12px; padding: 3px 8px; border-radius: 4px; }
.bonus-tag.gold { background: rgba(255,215,0,0.15); color: #ffd700; }
.bonus-tag.purple { background: rgba(156,39,176,0.15); color: #ce93d8; }

.marriage-date { font-size: 13px; color: #aaa; text-align: center; }

.partner-detail {}
.detail-card { background: rgba(255,255,255,0.03); border-radius: 10px; padding: 12px; }
.detail-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; }
.detail-row:last-child { border-bottom: none; }
.detail-row .label { color: #aaa; }
.detail-row .value { color: #fff; }
.text-green { color: #4caf50 !important; }
.text-gold { color: #ffd700 !important; }
.text-purple { color: #ce93d8 !important; }

.skill-list { display: flex; flex-direction: column; gap: 8px; }
.skill-item { display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.03); border-radius: 8px; padding: 10px 12px; font-size: 13px; }
.skill-icon { font-size: 20px; }
.skill-name { color: #f093fb; font-weight: bold; min-width: 80px; }
.skill-desc { color: #aaa; }

.cultivate-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.cultivate-title { font-size: 18px; color: #f093fb; font-weight: bold; }
.cultivate-desc { font-size: 12px; color: #aaa; margin-top: 4px; }
.cultivate-uses { font-size: 14px; color: #4caf50; }

.cultivate-rewards { display: flex; gap: 12px; margin-bottom: 12px; }
.reward-card { flex: 1; background: rgba(255,255,255,0.05); border-radius: 10px; padding: 14px; text-align: center; }
.reward-icon { font-size: 24px; display: block; margin-bottom: 4px; }
.reward-val { font-size: 18px; color: #fff; font-weight: bold; display: block; }
.reward-label { font-size: 12px; color: #aaa; }

.cultivate-bonus { display: flex; gap: 8px; margin-bottom: 16px; }

.btn-cultivate { width: 100%; padding: 14px; background: linear-gradient(135deg, #f093fb, #e040fb); border: none; border-radius: 10px; color: #fff; font-size: 16px; font-weight: bold; cursor: pointer; transition: all 0.2s; }
.btn-cultivate:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-cultivate:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(240,147,251,0.4); }

.cultivate-animation { position: relative; height: 60px; margin: 16px 0; }
.spirit-orb { position: absolute; width: 12px; height: 12px; background: radial-gradient(circle, #f093fb, transparent); border-radius: 50%; animation: float-up 1.5s ease-out infinite; left: 50%; bottom: 0; }
@keyframes float-up {
  0% { transform: translateX(0) translateY(0) scale(1); opacity: 1; }
  100% { transform: translateX(var(--x, 0)) translateY(-60px) scale(0); opacity: 0; }
}

.cultivate-result { background: rgba(76,175,80,0.1); border: 1px solid rgba(76,175,80,0.3); border-radius: 10px; padding: 14px; margin-top: 12px; text-align: center; }
.result-title { font-size: 16px; color: #4caf50; margin-bottom: 10px; }
.result-item { font-size: 14px; color: #ccc; padding: 4px 0; }

.empty-state { text-align: center; padding: 30px; color: #aaa; }
.empty-state p { margin-bottom: 16px; }
</style>
