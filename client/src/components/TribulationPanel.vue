<template>
  <div class="tribulation-panel">
    <!-- 天劫动画遮罩 -->
    <transition name="fade">
      <div v-if="isAnimating" class="thunder-overlay">
        <div class="thunder-bg"></div>
        <div class="thunder-flashes">
          <span v-for="i in 8" :key="i" class="thunder-bolt" :style="getThunderStyle(i)">⚡</span>
        </div>
        <div class="thunder-text" :class="{ success: animationResult === 'success', fail: animationResult === 'fail' }">
          <span v-if="animationPhase === 'warning'">天劫正在酝酿...</span>
          <span v-else-if="animationPhase === 'striking'">天雷降临！</span>
          <span v-else-if="animationResult === 'success'">🎉 渡劫成功！</span>
          <span v-else>💀 渡劫失败...</span>
        </div>
        <div v-if="animationPhase === 'striking'" class="thunder-particles">
          <span v-for="i in 20" :key="i" class="particle" :style="getParticleStyle(i)">{{ ['', '✨', '💫', '⭐', '🔮'][i % 5] }}</span>
        </div>
      </div>
    </transition>

    <!-- 面板头部 -->
    <div class="panel-header">
      <div class="panel-title">
        <span class="title-icon">⚡</span>
        <span>渡劫系统</span>
      </div>
      <div class="realm-badge">
        <span>{{ player?.realmName || '凡人' }}</span>
        <span class="arrow">→</span>
        <span class="next-realm">{{ nextRealm }}</span>
      </div>
    </div>

    <!-- 当前境界信息 -->
    <div class="realm-card">
      <div class="realm-visual">
        <div class="realm-circle" :class="realmClass">
          <span class="circle-glow"></span>
          <span class="realm-emoji">{{ realmEmoji }}</span>
        </div>
      </div>
      <div class="realm-info">
        <div class="info-row">
          <span class="info-label">当前境界</span>
          <span class="info-value gold">{{ player?.realmName || '凡人' }}</span>
        </div>
        <div class="info-row" v-if="nextRealm">
          <span class="info-label">突破目标</span>
          <span class="info-value">{{ nextRealm }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">境界优势</span>
          <span class="info-value" :class="realmAdvantage > 0 ? 'green' : ''">+{{ realmAdvantage }}%</span>
        </div>
        <div class="info-row">
          <span class="info-label">灵气根基</span>
          <span class="info-value purple">{{ player?.spiritRoot || '五行杂灵根' }}</span>
        </div>
      </div>
    </div>

    <!-- 天劫类型选择 -->
    <div class="section">
      <div class="section-title">
        <span>🌩️ 选择天劫类型</span>
        <span class="hint">点击选择，查看详情</span>
      </div>
      <div class="tribulation-grid">
        <div
          v-for="trib in tribulationTypes"
          :key="trib.id"
          class="trib-card"
          :class="[trib.difficulty, { selected: selectedType?.id === trib.id }]"
          @click="selectTribulation(trib)"
        >
          <div class="trib-icon" :style="{ color: trib.color }">{{ trib.icon }}</div>
          <div class="trib-name">{{ trib.name }}</div>
          <div class="trib-element">{{ trib.element }}</div>
          <div class="trib-rate-bar">
            <div class="rate-fill" :style="{ width: trib.baseSuccessRate * 100 + '%', background: getRateColor(trib.baseSuccessRate) }"></div>
          </div>
          <div class="trib-rate-text" :class="getRateClass(trib.baseSuccessRate)">
            {{ Math.round(trib.baseSuccessRate * 100) }}%
          </div>
        </div>
      </div>
    </div>

    <!-- 选中天劫详情 -->
    <transition name="slide-up">
      <div v-if="selectedType" class="selected-detail">
        <div class="detail-header" :style="{ borderColor: selectedType.color }">
          <div class="detail-icon" :style="{ color: selectedType.color }">{{ selectedType.icon }}</div>
          <div class="detail-info">
            <div class="detail-name" :style="{ color: selectedType.color }">{{ selectedType.name }}</div>
            <div class="detail-desc">{{ selectedType.description }}</div>
            <div class="detail-suitable">适用: {{ selectedType.suitableRealm }}</div>
          </div>
          <div class="detail-difficulty" :class="selectedType.difficulty">
            {{ getDifficultyText(selectedType.difficulty) }}
          </div>
        </div>

        <!-- 成功率计算 -->
        <div class="success-calc">
          <div class="calc-title">成功率计算</div>
          <div class="calc-breakdown">
            <div class="calc-row">
              <span>天劫基础</span>
              <span :class="getRateClass(selectedType.baseSuccessRate)">
                {{ Math.round(selectedType.baseSuccessRate * 100) }}%
              </span>
            </div>
            <div class="calc-row" v-if="spiritRootBonus > 0">
              <span>灵根加成</span>
              <span class="green">+{{ spiritRootBonus }}%</span>
            </div>
            <div class="calc-row" v-if="realmAdvantage > 0">
              <span>境界优势</span>
              <span class="green">+{{ realmAdvantage }}%</span>
            </div>
            <div class="calc-row" v-if="protectionBonus > 0">
              <span>护身物品</span>
              <span class="blue">+{{ protectionBonus }}%</span>
            </div>
            <div class="calc-row total">
              <span>总计成功率</span>
              <span class="gold">{{ Math.round(effectiveRate * 100) }}%</span>
            </div>
          </div>
          <div class="rate-visual">
            <div class="rate-track">
              <div class="rate-thumb" :style="{ left: effectiveRate * 100 + '%' }"></div>
            </div>
            <div class="rate-labels">
              <span>0%</span>
              <span class="current">{{ Math.round(effectiveRate * 100) }}%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        <!-- 奖励预览 -->
        <div class="reward-preview" v-if="currentReward">
          <div class="reward-title">🎁 突破奖励预览</div>
          <div class="reward-items">
            <div class="reward-item" v-if="currentReward.spirit">
              <span class="ri-icon">⚡</span>
              <span class="ri-value green">+{{ fmt(currentReward.spirit) }}</span>
              <span class="ri-label">灵气</span>
            </div>
            <div class="reward-item" v-if="currentReward.spiritStones">
              <span class="ri-icon">💰</span>
              <span class="ri-value gold">+{{ fmt(currentReward.spiritStones) }}</span>
              <span class="ri-label">灵石</span>
            </div>
            <div class="reward-item" v-if="currentReward.item">
              <span class="ri-icon">🎁</span>
              <span class="ri-value purple">×{{ currentReward.itemCount }}</span>
              <span class="ri-label">{{ currentReward.item }}</span>
            </div>
          </div>
        </div>

        <!-- 护身物品 -->
        <div class="protection-section" v-if="protectionItems.length > 0">
          <div class="prot-title">🛡️ 护身物品</div>
          <div class="prot-list">
            <div
              v-for="item in protectionItems"
              :key="item.id"
              class="prot-item"
              :class="{ active: selectedProtection?.id === item.id }"
              @click="toggleProtection(item)"
            >
              <span class="prot-icon">{{ item.icon }}</span>
              <span class="prot-name">{{ item.name }}</span>
              <span class="prot-effect">{{ item.effect }}</span>
              <span class="prot-count">×{{ item.count }}</span>
              <span v-if="selectedProtection?.id === item.id" class="prot-check">✓</span>
            </div>
          </div>
        </div>

        <!-- 警告提示 -->
        <div class="risk-warn" v-if="effectiveRate < 0.5">
          <span class="warn-icon">⚠️</span>
          <span>成功率低于50%，失败将损失{{ penaltyPercent }}%当前灵气</span>
        </div>

        <!-- 渡劫按钮 -->
        <button
          class="trib-btn"
          :class="[selectedType?.difficulty, { disabled: !canAttempt }]"
          :disabled="!canAttempt || isAttemping"
          @click="attemptTribulation"
        >
          <span v-if="isAttemping" class="btn-text">⏳ 天雷洗礼中...</span>
          <span v-else-if="!nextRealm" class="btn-text">已达最高境界</span>
          <span v-else class="btn-text">🔥 接受天劫洗礼</span>
        </button>
      </div>
    </transition>

    <!-- 历史记录 -->
    <div class="history-section" v-if="history.length > 0">
      <div class="history-title">📜 渡劫记录</div>
      <div class="history-list">
        <div
          v-for="(record, idx) in history"
          :key="idx"
          class="history-item"
          :class="record.success ? 'success' : 'fail'"
        >
          <span class="h-icon">{{ record.success ? '✅' : '❌' }}</span>
          <span class="h-type">{{ record.typeName }}</span>
          <span class="h-msg">{{ record.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { playerApi, tribulationApi } from '../api'

const player = ref(null)
const tribulationTypes = ref([])
const selectedType = ref(null)
const selectedProtection = ref(null)
const isAttemping = ref(false)
const isAnimating = ref(false)
const animationPhase = ref('warning')
const animationResult = ref(null)
const protectionItems = ref([])
const history = ref([])

const nextRealm = computed(() => {
  const realmMap = {
    '凡人': '炼气', '炼气': '筑基', '筑基': '金丹',
    '金丹': '元婴', '元婴': '化神', '化神': '炼虚',
    '炼虚': '合体', '合体': '大乘', '大乘': '飞升', '飞升': null
  }
  return realmMap[player.value?.realmName] || null
})

const realmAdvantage = computed(() => {
  const realmOrder = { '凡人': 0, '炼气': 1, '筑基': 2, '金丹': 3, '元婴': 4, '化神': 5, '炼虚': 6, '合体': 7, '大乘': 8, '飞升': 9 }
  const order = realmOrder[player.value?.realmName] || 0
  if (order >= 6) return 15
  if (order >= 3) return 10
  if (order >= 1) return 5
  return 0
})

const spiritRootBonus = computed(() => {
  const root = player.value?.spiritRoot || '五行杂灵根'
  if (root === '混沌灵根') return 20
  if (root === '天灵根') return 15
  if (root === '单一天灵根') return 18
  if (root.includes('火') || root.includes('水')) return 8
  if (root.includes('金') || root.includes('木') || root.includes('土')) return 5
  return 0
})

const protectionBonus = computed(() => {
  if (!selectedProtection.value) return 0
  return Math.round(selectedProtection.value.dodgeBonus * 100 + selectedProtection.value.damageReduction * 10)
})

const effectiveRate = computed(() => {
  if (!selectedType.value) return 0
  let rate = selectedType.value.baseSuccessRate
  rate += spiritRootBonus.value / 100
  rate += realmAdvantage.value / 100
  rate += protectionBonus.value / 100
  return Math.min(0.98, Math.max(0.01, rate))
})

const penaltyPercent = computed(() => {
  const rate = effectiveRate.value
  if (rate < 0.4) return 80
  if (rate < 0.6) return 50
  return 30
})

const canAttempt = computed(() => !!nextRealm.value && !!selectedType.value)

const realmEmoji = computed(() => {
  const m = { '凡人': '🧘', '炼气': '🌬️', '筑基': '🪨', '金丹': '🌟', '元婴': '👶', '化神': '⚡', '炼虚': '🌙', '合体': '☀️', '大乘': '🚀', '飞升': '🌈' }
  return m[player.value?.realmName] || '🧘'
})

const realmClass = computed(() => {
  const order = { '凡人': 0, '炼气': 1, '筑基': 2, '金丹': 3, '元婴': 4, '化神': 5, '炼虚': 6, '合体': 7, '大乘': 8, '飞升': 9 }
  const o = order[player.value?.realmName] || 0
  if (o >= 7) return 'high'
  if (o >= 4) return 'mid'
  return 'low'
})

const currentReward = computed(() => {
  if (!nextRealm.value) return null
  const rewards = {
    '炼气': { spirit: 10000, spiritStones: 500, item: '筑基丹', itemCount: 1 },
    '筑基': { spirit: 50000, spiritStones: 2000, item: '金丹', itemCount: 1 },
    '金丹': { spirit: 200000, spiritStones: 10000, item: '元婴丹', itemCount: 1 },
    '元婴': { spirit: 800000, spiritStones: 50000, item: '化神果', itemCount: 1 },
    '化神': { spirit: 3000000, spiritStones: 200000, item: '炼虚丹', itemCount: 1 },
    '炼虚': { spirit: 10000000, spiritStones: 1000000, item: '合体期功法碎片', itemCount: 1 },
    '合体': { spirit: 30000000, spiritStones: 3000000, item: '大乘期功法碎片', itemCount: 1 },
    '大乘': { spirit: 50000000, spiritStones: 5000000, item: '仙品装备', itemCount: 1 }
  }
  return rewards[nextRealm.value] || null
})

const defaultTribulationTypes = [
  { id: 'metal', name: '金劫', element: '金', icon: '⚔️', color: '#D4AF37', description: '金属性雷劫，考验锐利与坚硬', baseSuccessRate: 0.8, difficulty: 'normal', suitableRealm: '炼气→筑基' },
  { id: 'wood', name: '木劫', element: '木', icon: '🌿', color: '#228B22', description: '木属性雷劫，考验生长与韧性', baseSuccessRate: 0.8, difficulty: 'normal', suitableRealm: '筑基→金丹' },
  { id: 'water', name: '水劫', element: '水', icon: '💧', color: '#1E90FF', description: '水属性雷劫，考验流动与变化', baseSuccessRate: 0.7, difficulty: 'normal', suitableRealm: '金丹→元婴' },
  { id: 'fire', name: '火劫', element: '火', icon: '🔥', color: '#FF4500', description: '火属性雷劫，考验炽热与毁灭', baseSuccessRate: 0.6, difficulty: 'hard', suitableRealm: '元婴→化神' },
  { id: 'earth', name: '土劫', element: '土', icon: '🪨', color: '#8B4513', description: '土属性雷劫，考验厚重与稳固', baseSuccessRate: 0.5, difficulty: 'hard', suitableRealm: '化神→炼虚' },
  { id: 'heart_demon', name: '心魔劫', element: '心', icon: '😈', color: '#9400D3', description: '考验道心，需击败心魔', baseSuccessRate: 0.6, difficulty: 'hard', suitableRealm: '每逢大境界突破' },
  { id: 'heavenly_thunder', name: '九天雷劫', element: '雷', icon: '⚡', color: '#FFFF00', description: '九道天雷连续降落，极难渡劫', baseSuccessRate: 0.3, difficulty: 'nightmare', suitableRealm: '炼虚→合体' }
]

const defaultProtectionItems = [
  { id: 'protect_1', name: '渡劫护符', icon: '🛡️', effect: '闪避+10% 伤害-15%', dodgeBonus: 0.1, damageReduction: 0.15, count: 0 },
  { id: 'protect_2', name: '渡劫珠', icon: '💎', effect: '伤害-25%', dodgeBonus: 0, damageReduction: 0.25, count: 0 },
  { id: 'protect_3', name: '天道护符', icon: '✨', effect: '闪避+20% 伤害-20%', dodgeBonus: 0.2, damageReduction: 0.2, count: 0 }
]

function fmt(n) {
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '亿'
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  return n.toLocaleString()
}

function getRateColor(rate) {
  if (rate >= 0.8) return '#22c55e'
  if (rate >= 0.5) return '#f59e0b'
  return '#ef4444'
}

function getRateClass(rate) {
  if (rate >= 0.8) return 'high'
  if (rate >= 0.5) return 'mid'
  return 'low'
}

function getDifficultyText(d) {
  return { normal: '普通', hard: '困难', nightmare: '噩梦' }[d] || d
}

function getThunderStyle(i) {
  const positions = [
    { left: '10%', top: '5%' }, { left: '80%', top: '8%' }, { left: '30%', top: '0%' },
    { left: '60%', top: '3%' }, { left: '45%', top: '2%' }, { left: '20%', top: '6%' },
    { left: '70%', top: '1%' }, { left: '50%', top: '4%' }
  ]
  const delays = ['0s', '0.15s', '0.3s', '0.1s', '0.2s', '0.05s', '0.25s', '0.12s']
  const p = positions[i - 1] || positions[0]
  return { left: p.left, top: p.top, animationDelay: delays[i - 1] || '0s' }
}

function getParticleStyle(i) {
  return {
    left: (Math.random() * 100) + '%',
    top: (20 + Math.random() * 60) + '%',
    animationDelay: (Math.random() * 0.8) + 's',
    fontSize: (12 + Math.random() * 16) + 'px'
  }
}

function selectTribulation(trib) {
  selectedType.value = trib
  selectedProtection.value = null
}

function toggleProtection(item) {
  selectedProtection.value = selectedProtection.value?.id === item.id ? null : item
}

async function attemptTribulation() {
  if (!canAttempt.value || isAttemping.value) return
  isAttemping.value = true
  isAnimating.value = true
  animationPhase.value = 'warning'
  animationResult.value = null

  await sleep(1500)
  animationPhase.value = 'striking'
  await sleep(2000)

  const success = Math.random() < effectiveRate.value
  animationResult.value = success ? 'success' : 'fail'
  await sleep(1800)

  isAnimating.value = false
  isAttemping.value = false

  history.value.unshift({
    typeName: selectedType.value?.name || '天劫',
    success,
    message: success
      ? '🎊 渡劫成功！突破至' + nextRealm.value + '！'
      : '💀 渡劫失败...损失' + penaltyPercent.value + '%灵气'
  })
  history.value = history.value.slice(0, 10)

  if (success) {
    player.value = { ...player.value, realmName: nextRealm.value }
  }

  try { localStorage.setItem('trib_history', JSON.stringify(history.value)) } catch (e) {}
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)) }

async function loadData() {
  try {
    const res = await playerApi.get()
    if (res.data?.player) player.value = res.data.player
  } catch (e) {
    player.value = { realmName: '金丹', spiritRoot: '火金双灵根' }
  }

  try {
    const res = await tribulationApi.getTypes()
    if (res.data?.success && res.data.types?.length > 0) {
      tribulationTypes.value = defaultTribulationTypes.map(t => {
        const apiType = res.data.types.find(at => at.id === t.id)
        return apiType ? { ...t, baseSuccessRate: apiType.success_rate || t.baseSuccessRate } : t
      })
    } else {
      tribulationTypes.value = defaultTribulationTypes
    }
  } catch (e) {
    tribulationTypes.value = defaultTribulationTypes
  }

  try {
    const saved = localStorage.getItem('trib_protection_items')
    if (saved) {
      const counts = JSON.parse(saved)
      protectionItems.value = defaultProtectionItems.map(p => ({ ...p, count: counts[p.id] || 0 })).filter(p => p.count > 0)
    }
  } catch (e) {}

  try {
    const h = localStorage.getItem('trib_history')
    if (h) history.value = JSON.parse(h).slice(0, 10)
  } catch (e) {}
}

onMounted(() => { loadData() })
</script>

<style scoped>
.tribulation-panel {
  position: relative;
  background: linear-gradient(180deg, #0d0d1a 0%, #1a0a2e 50%, #0d0d1a 100%);
  min-height: 100%;
  padding: 16px;
  color: #fff;
  overflow: hidden;
}

/* Thunder Overlay */
.thunder-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.thunder-bg {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  background-image: url('@/assets/images/bg-tribulation-new.png');
  background-size: cover;
  background-position: center;
  animation: thunderBg 3.5s infinite;
}
@keyframes thunderBg {
  0%, 100% { background: rgba(0, 0, 0, 0.7); }
  10%, 30% { background: rgba(30, 30, 80, 0.85); }
  20%, 50% { background: rgba(0, 0, 0, 0.75); }
  40% { background: rgba(255, 255, 200, 0.3); }
  60%, 80% { background: rgba(20, 10, 40, 0.8); }
}
.thunder-flashes { position: absolute; inset: 0; pointer-events: none; }
.thunder-bolt {
  position: absolute;
  font-size: 48px;
  opacity: 0;
  animation: thunderFlash 1.5s infinite;
}
@keyframes thunderFlash {
  0%, 100% { opacity: 0; transform: scale(1) translateY(0); }
  5% { opacity: 1; transform: scale(1.5) translateY(20px); color: #fff200; }
  10% { opacity: 0.3; }
  15% { opacity: 0.9; transform: scale(1.8) translateY(40px); color: #ffffaa; }
  25% { opacity: 0; transform: scale(1) translateY(60px); }
}
.thunder-text {
  position: relative;
  z-index: 2;
  font-size: 28px;
  font-weight: bold;
  text-align: center;
  text-shadow: 0 0 30px currentColor;
  animation: textPulse 0.8s infinite alternate;
}
.thunder-text.success { color: #4ecdc4; }
.thunder-text.fail { color: #ef4444; }
.thunder-text:not(.success):not(.fail) { color: #ffd700; }
@keyframes textPulse {
  from { opacity: 0.7; transform: scale(1); }
  to { opacity: 1; transform: scale(1.05); }
}
.thunder-particles { position: absolute; inset: 0; pointer-events: none; }
.thunder-particles .particle {
  position: absolute;
  animation: particleFall 1.5s ease-out forwards;
  opacity: 0;
}
@keyframes particleFall {
  0% { opacity: 0; transform: translateY(-30px) scale(0.5) rotate(0deg); }
  30% { opacity: 1; }
  100% { opacity: 0; transform: translateY(100px) scale(1.2) rotate(360deg); }
}

/* Panel Header */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: bold;
  color: #ffd700;
}
.title-icon { font-size: 24px; }
.realm-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: rgba(255, 215, 0, 0.1);
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 20px;
  font-size: 13px;
}
.realm-badge .next-realm { color: #4ecdc4; font-weight: bold; }
.arrow { color: #888; }

/* Realm Card */
.realm-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 215, 0, 0.15);
  border-radius: 16px;
  margin-bottom: 16px;
}
.realm-visual { flex-shrink: 0; }
.realm-circle {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: rgba(255, 255, 255, 0.05);
}
.realm-circle.low { border: 3px solid rgba(102, 126, 234, 0.5); }
.realm-circle.mid { border: 3px solid rgba(255, 215, 0, 0.5); }
.realm-circle.high { border: 3px solid rgba(139, 92, 246, 0.6); box-shadow: 0 0 20px rgba(139, 92, 246, 0.3); }
.circle-glow {
  position: absolute;
  inset: -5px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.15), transparent 70%);
  animation: glowPulse 3s infinite;
}
@keyframes glowPulse {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.1); }
}
.realm-emoji { font-size: 32px; position: relative; z-index: 1; }
.realm-info { flex: 1; }
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  font-size: 13px;
}
.info-label { color: #888; }
.info-value { color: #fff; font-weight: 500; }
.info-value.gold { color: #ffd700; }
.info-value.green { color: #4ecdc4; }
.info-value.purple { color: #a78bfa; }

/* Section */
.section { margin-bottom: 16px; }
.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
  font-weight: bold;
  color: #ffd700;
  margin-bottom: 12px;
}
.hint { font-size: 11px; color: #666; font-weight: normal; }

/* Tribulation Grid */
.tribulation-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
@media (max-width: 400px) {
  .tribulation-grid { grid-template-columns: repeat(3, 1fr); }
}
.trib-card {
  background: rgba(20, 20, 40, 0.8);
  border: 2px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 10px 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}
.trib-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, transparent 40%, rgba(255, 255, 255, 0.03) 100%);
}
.trib-card:hover { transform: translateY(-2px); border-color: rgba(255, 215, 0, 0.3); }
.trib-card.selected { border-color: #ffd700; box-shadow: 0 0 15px rgba(255, 215, 0, 0.3); }
.trib-card.normal { border-left: 3px solid #3b82f6; }
.trib-card.hard { border-left: 3px solid #f59e0b; }
.trib-card.nightmare { border-left: 3px solid #ef4444; }
.trib-icon { font-size: 26px; margin-bottom: 4px; }
.trib-name { font-size: 12px; font-weight: bold; color: #fff; margin-bottom: 2px; }
.trib-element { font-size: 10px; color: #888; margin-bottom: 6px; }
.trib-rate-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 4px;
}
.rate-fill { height: 100%; border-radius: 2px; transition: width 0.3s; }
.trib-rate-text { font-size: 11px; font-weight: bold; }
.trib-rate-text.high { color: #22c55e; }
.trib-rate-text.mid { color: #f59e0b; }
.trib-rate-text.low { color: #ef4444; }

/* Selected Detail */
.selected-detail {
  background: rgba(20, 20, 50, 0.6);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
}
.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 12px;
}
.detail-icon { font-size: 40px; }
.detail-info { flex: 1; }
.detail-name { font-size: 18px; font-weight: bold; }
.detail-desc { font-size: 12px; color: #aaa; margin: 4px 0; }
.detail-suitable { font-size: 11px; color: #22c55e; }
.detail-difficulty {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}
.detail-difficulty.normal { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
.detail-difficulty.hard { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
.detail-difficulty.nightmare { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

/* Success Rate Calc */
.success-calc { margin-bottom: 14px; }
.calc-title { font-size: 13px; color: #ffd700; margin-bottom: 8px; }
.calc-breakdown {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 8px;
}
.calc-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 13px;
  color: #aaa;
}
.calc-row span:last-child { color: #fff; font-weight: 500; }
.calc-row.total { border-top: 1px solid rgba(255, 255, 255, 0.1); margin-top: 4px; padding-top: 8px; }
.calc-row.total span { color: #ffd700; font-weight: bold; font-size: 15px; }
.green { color: #4ecdc4 !important; }
.blue { color: #3b82f6 !important; }
.gold { color: #ffd700 !important;.rate-visual { padding: 0 4px; }
.rate-track {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  position: relative;
  margin-bottom: 4px;
}
.rate-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ffd700;
  box-shadow: 0 0 8px rgba(255, 215, 0, 0.6);
  transition: left 0.3s;
}
.rate-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #666;
}
.rate-labels .current { color: #ffd700; font-weight: bold; }

/* Reward Preview */
.reward-preview { margin-bottom: 14px; }
.reward-title {
  font-size: 13px;
  color: #ffd700;
  margin-bottom: 8px;
}
.reward-items {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.reward-item {
  flex: 1;
  min-width: 80px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 8px;
  text-align: center;
}
.ri-icon { font-size: 18px; display: block; margin-bottom: 4px; }
.ri-value { font-size: 14px; font-weight: bold; display: block; }
.ri-value.green { color: #4ecdc4; }
.ri-value.gold { color: #ffd700; }
.ri-value.purple { color: #a78bfa; }
.ri-label { font-size: 10px; color: #888; display: block; margin-top: 2px; }

/* Protection */
.protection-section { margin-bottom: 14px; }
.prot-title { font-size: 13px; color: #a78bfa; margin-bottom: 8px; }
.prot-list { display: flex; flex-direction: column; gap: 6px; }
.prot-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.prot-item:hover { background: rgba(167, 139, 250, 0.1); }
.prot-item.active { border-color: #a78bfa; background: rgba(167, 139, 250, 0.15); }
.prot-icon { font-size: 20px; }
.prot-name { font-size: 13px; font-weight: bold; color: #fff; }
.prot-effect { font-size: 11px; color: #888; flex: 1; }
.prot-count { font-size: 12px; color: #ffd700; }
.prot-check { color: #a78bfa; font-size: 16px; }

/* Risk Warning */
.risk-warn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  color: #ef4444;
  margin-bottom: 12px;
}
.warn-icon { font-size: 16px; }

/* Tribulation Button */
.trib-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: bold;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}
.trib-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), transparent);
}
.trib-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4); }
.trib-btn:active:not(:disabled) { transform: scale(0.98); }
.trib-btn:disabled, .trib-btn.disabled { opacity: 0.5; cursor: not-allowed; }
.trib-btn.hard { background: linear-gradient(135deg, #f59e0b, #d97706); }
.trib-btn.hard:hover:not(:disabled) { box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4); }
.trib-btn.nightmare { background: linear-gradient(135deg, #7c3aed, #5b21b6); }
.trib-btn.nightmare:hover:not(:disabled) { box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4); }

/* History */
.history-section { margin-top: 8px; }
.history-title { font-size: 13px; color: #ffd700; margin-bottom: 8px; }
.history-list { display: flex; flex-direction: column; gap: 6px; }
.history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(20, 20, 40, 0.6);
  border-radius: 8px;
  font-size: 12px;
}
.history-item.success .h-icon { color: #22c55e; }
.history-item.fail .h-icon { color: #ef4444; }
.h-type { font-weight: bold; color: #fff; }
.h-msg { color: #888; }

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-up-enter-active { transition: all 0.3s ease-out; }
.slide-up-leave-active { transition: all 0.2s ease-in; }
.slide-up-enter-from { opacity: 0; transform: translateY(20px); }
.slide-up-leave-to { opacity: 0; transform: translateY(-10px); }
