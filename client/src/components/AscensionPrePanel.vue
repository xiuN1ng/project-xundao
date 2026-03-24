<template>
  <div class="ascension-pre-panel">
    <!-- 顶部标题栏 -->
    <div class="panel-header">
      <div class="header-left">
        <div class="panel-title">🌟 飞升前置</div>
        <div class="panel-subtitle">飞升准备 · 灵魂契合 · 天劫洗礼</div>
      </div>
      <button class="close-btn" @click="$emit('close')">×</button>
    </div>

    <!-- 子导航 -->
    <div class="sub-nav">
      <button
        v-for="tab in subTabs"
        :key="tab.id"
        class="sub-nav-btn"
        :class="{ active: activeSubTab === tab.id }"
        @click="activeSubTab = tab.id"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-name">{{ tab.name }}</span>
      </button>
    </div>

    <!-- ========== 灵魂契合度 ========== -->
    <div v-if="activeSubTab === 'compatibility'" class="tab-content">
      <div class="section-desc">
        💡 灵魂契合度反映你与天地灵气的共鸣程度，共鸣越高飞升成功率越大
      </div>

      <!-- 综合契合度 -->
      <div class="overall-compatibility">
        <div class="compat-gauge-wrapper">
          <svg viewBox="0 0 200 120" class="compat-gauge">
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#ef4444"/>
                <stop offset="50%" style="stop-color:#f59e0b"/>
                <stop offset="100%" style="stop-color:#22c55e"/>
              </linearGradient>
            </defs>
            <!-- 背景弧 -->
            <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#2d3748" stroke-width="12" stroke-linecap="round"/>
            <!-- 进度弧 -->
            <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#gaugeGradient)" stroke-width="12" stroke-linecap="round"
              :stroke-dasharray="gaugeDashArray"
              stroke-dashoffset="0"
              style="transition: stroke-dasharray 1s ease"/>
            <!-- 中心数值 -->
            <text x="100" y="85" text-anchor="middle" class="gauge-value">{{ overallCompatibility }}</text>
            <text x="100" y="105" text-anchor="middle" class="gauge-label">契合度</text>
          </svg>
        </div>
        <div class="compat-status-badge" :class="compatStatusClass">
          {{ compatStatusText }}
        </div>
      </div>

      <!-- 五行契合度详情 -->
      <div class="element-compat-section">
        <div class="section-title">🔮 五行契合</div>
        <div class="element-grid">
          <div
            v-for="elem in elementCompat"
            :key="elem.name"
            class="element-card"
            :class="elem.cls"
          >
            <div class="elem-icon">{{ elem.icon }}</div>
            <div class="elem-name">{{ elem.name }}</div>
            <div class="elem-bar-bg">
              <div class="elem-bar-fill" :style="{ width: elem.value + '%' }"></div>
            </div>
            <div class="elem-value">{{ elem.value }}%</div>
            <div class="elem-bonus">{{ elem.bonusText }}</div>
          </div>
        </div>
      </div>

      <!-- 契合度加成说明 -->
      <div class="bonus-explain-section">
        <div class="section-title">📋 契合加成</div>
        <div class="bonus-list">
          <div class="bonus-item" v-for="b in bonusList" :key="b.label">
            <span class="bonus-icon">{{ b.icon }}</span>
            <span class="bonus-label">{{ b.label }}</span>
            <span class="bonus-value" :class="b.positive ? 'positive' : 'negative'">{{ b.value }}</span>
          </div>
        </div>
        <div class="total-bonus">
          <span>飞升成功率总加成: </span>
          <span class="total-value">+{{ totalBonus }}%</span>
        </div>
      </div>

      <!-- 提升建议 -->
      <div class="suggestion-section">
        <div class="section-title">💡 提升建议</div>
        <div class="suggestion-list">
          <div class="suggestion-item" v-for="s in suggestions" :key="s.text">
            <span class="suggest-icon">{{ s.icon }}</span>
            <span class="suggest-text">{{ s.text }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 天劫洗礼 ========== -->
    <div v-if="activeSubTab === 'tribulation'" class="tab-content">
      <div class="section-desc">
        ⚡ 经历天劫洗礼可洗涤凡尘，渡过天劫方能羽化登仙
      </div>

      <!-- 当前洗礼状态 -->
      <div class="baptism-status-card">
        <div class="baptism-icon">⚡</div>
        <div class="baptism-info">
          <div class="baptism-title">当前进度</div>
          <div class="baptism-desc">
            {{ baptismProgress.completed ? '已完成天劫洗礼' : `第 ${baptismProgress.current} 次 / 共 ${baptismProgress.total} 次` }}
          </div>
          <div class="baptism-progress-bar">
            <div class="baptism-progress-fill" :style="{ width: baptismProgressPercent + '%' }"></div>
          </div>
        </div>
      </div>

      <!-- 天劫类型选择 -->
      <div class="trib-type-section">
        <div class="section-title">选择天劫类型</div>
        <div class="trib-type-list">
          <div
            v-for="trib in tribTypes"
            :key="trib.id"
            class="trib-type-card"
            :class="{ selected: selectedTrib === trib.id, locked: !trib.unlocked }"
            @click="trib.unlocked && (selectedTrib = trib.id)"
          >
            <div class="trib-type-icon">{{ trib.icon }}</div>
            <div class="trib-type-name">{{ trib.name }}</div>
            <div class="trib-type-desc">{{ trib.desc }}</div>
            <div class="trib-type-rate">
              成功率: <span :class="getRateClass(trib.rate)">{{ trib.rate }}%</span>
            </div>
            <div v-if="!trib.unlocked" class="trib-locked-overlay">
              🔒 需 {{ trib.unlockReq }}
            </div>
          </div>
        </div>
      </div>

      <!-- 洗礼效果预览 -->
      <div class="baptism-effect-section" v-if="selectedTrib">
        <div class="section-title">洗礼效果</div>
        <div class="effect-preview">
          <div class="effect-item" v-for="e in currentTribEffect" :key="e.label">
            <span class="effect-icon">{{ e.icon }}</span>
            <span class="effect-label">{{ e.label }}</span>
            <span class="effect-value positive">+{{ e.value }}</span>
          </div>
        </div>
      </div>

      <!-- 雷劫降临动画区 -->
      <div class="lightning-arena" v-if="isBaptizing">
        <div class="lightning-title">⚡ 天劫降临中...</div>
        <div class="lightning-effects">
          <div class="lightning-bolt" v-for="i in 5" :key="i" :style="{ animationDelay: (i * 0.2) + 's' }">⚡</div>
        </div>
        <div class="baptize-character">
          <span>🧘</span>
          <div class="character-aura" :class="{ absorbing: isBaptizing }"></div>
        </div>
        <div class="baptize-status">{{ baptizeStatusText }}</div>
        <div class="lightning-progress">
          <div class="lightning-progress-fill" :style="{ width: baptizeProgress + '%' }"></div>
        </div>
      </div>

      <!-- 开始洗礼按钮 -->
      <div class="baptize-action">
        <button
          class="baptize-btn"
          :disabled="!canBaptize || isBaptizing"
          @click="startBaptism"
        >
          {{ isBaptizing ? '⚡ 洗礼进行中...' : '⚡ 开始天劫洗礼' }}
        </button>
        <div class="baptize-warning" v-if="selectedTrib && tribTypes.find(t => t.id === selectedTrib)?.rate < 50">
          ⚠️ 当前天劫成功率较低，建议提升契合度后再尝试
        </div>
      </div>

      <!-- 洗礼记录 -->
      <div class="baptism-record-section">
        <div class="section-title">📜 洗礼记录</div>
        <div class="record-list">
          <div class="record-item" v-for="r in baptismRecords" :key="r.time">
            <span class="record-icon" :class="r.success ? 'success' : 'fail'">{{ r.success ? '✅' : '❌' }}</span>
            <span class="record-type">{{ r.type }} ({{ r.rate }}%)</span>
            <span class="record-time">{{ r.time }}</span>
          </div>
          <div v-if="baptismRecords.length === 0" class="record-empty">暂无洗礼记录</div>
        </div>
      </div>
    </div>

    <!-- ========== 材料合成 ========== -->
    <div v-if="activeSubTab === 'synthesis'" class="tab-content">
      <div class="section-desc">
        ✨ 飞升需要特殊材料，使用下方合成功能制作飞升所需物品
      </div>

      <!-- 合成分类 -->
      <div class="synth-category-tabs">
        <button
          v-for="cat in synthCategories"
          :key="cat.id"
          class="synth-tab-btn"
          :class="{ active: activeSynthCategory === cat.id }"
          @click="activeSynthCategory = cat.id"
        >
          {{ cat.icon }} {{ cat.name }}
        </button>
      </div>

      <!-- 材料格子 -->
      <div class="synth-materials-grid">
        <div
          v-for="mat in currentSynthMaterials"
          :key="mat.id"
          class="synth-material-item"
          :class="{ selected: selectedSynthMaterial?.id === mat.id, empty: mat.count === 0 }"
          @click="mat.count > 0 && selectSynthMaterial(mat)"
        >
          <div class="mat-icon">{{ mat.icon }}</div>
          <div class="mat-name">{{ mat.name }}</div>
          <div class="mat-count" :class="{ zero: mat.count === 0 }">×{{ mat.count }}</div>
          <div class="mat-quality-dot" :class="mat.quality"></div>
        </div>
        <div v-if="currentSynthMaterials.length === 0" class="synth-empty">
          暂无相关材料
        </div>
      </div>

      <!-- 合成配方预览 -->
      <div class="synth-recipe-section" v-if="selectedSynthMaterial">
        <div class="recipe-header">
          <span class="recipe-title">合成配方</span>
          <span class="recipe-target">{{ selectedSynthMaterial.name }} → {{ recipeResult?.name || '无配方' }}</span>
        </div>

        <div class="recipe-body" v-if="recipeResult">
          <div class="recipe-costs">
            <div class="cost-label">消耗材料:</div>
            <div class="cost-item-row">
              <span class="cost-icon">{{ selectedSynthMaterial.icon }}</span>
              <span class="cost-name">{{ selectedSynthMaterial.name }}</span>
              <span class="cost-count" :class="{ enough: selectedSynthMaterial.count >= recipeResult.costCount }">
                {{ selectedSynthMaterial.count }}/{{ recipeResult.costCount }}
              </span>
            </div>
            <div class="cost-gold-row">
              💰 金币: <span :class="{ enough: playerGold >= recipeResult.goldCost }">{{ playerGold }}/{{ recipeResult.goldCost }}</span>
            </div>
          </div>
          <div class="recipe-arrow">➜</div>
          <div class="recipe-output">
            <div class="output-icon">{{ recipeResult.icon }}</div>
            <div class="output-name">{{ recipeResult.name }}</div>
            <div class="output-count">×{{ recipeResult.count }}</div>
          </div>
        </div>
        <div class="recipe-no-formula" v-else>
          该材料暂无合成配方
        </div>
      </div>

      <!-- 合成按钮 -->
      <div class="synth-action-bar">
        <div class="synth-status" v-if="selectedSynthMaterial && recipeResult">
          <span v-if="canSynthAscend" class="status-ok">✅ 可合成</span>
          <span v-else class="status-no">❌ 材料不足</span>
        </div>
        <button
          class="synth-btn"
          :disabled="!canSynthAscend"
          @click="doSynthesize"
        >
          ✨ 开始合成
        </button>
      </div>

      <!-- 飞升材料进度 -->
      <div class="ascension-mats-progress">
        <div class="section-title">飞升材料进度</div>
        <div class="ascension-progress-list">
          <div class="asc-mat-item" v-for="am in ascensionMaterials" :key="am.name">
            <span class="am-icon">{{ am.icon }}</span>
            <span class="am-name">{{ am.name }}</span>
            <div class="am-bar-bg">
              <div class="am-bar-fill" :style="{ width: Math.min(100, am.current / am.needed * 100) + '%' }"
                :class="am.current >= am.needed ? 'full' : ''"></div>
            </div>
            <span class="am-count">{{ am.current }}/{{ am.needed }}</span>
          </div>
        </div>
        <div class="ascension-ready" v-if="ascensionMaterials.every(am => am.current >= am.needed)">
          🎉 飞升材料已集齐，可以尝试飞升！
        </div>
      </div>

      <!-- 合成成功弹窗 -->
      <div v-if="showSynthResult" class="synth-result-overlay" @click="showSynthResult = false">
        <div class="synth-result-modal">
          <div class="result-title">✨ 合成成功!</div>
          <div class="result-display">
            <div class="result-icon">{{ synthResultData.icon }}</div>
            <div class="result-name">{{ synthResultData.name }}</div>
            <div class="result-count">×{{ synthResultData.count }}</div>
          </div>
          <button class="result-confirm-btn" @click="showSynthResult = false">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const emit = defineEmits(['close'])

// ===== 子导航 =====
const activeSubTab = ref('compatibility')
const subTabs = [
  { id: 'compatibility', name: '灵魂契合', icon: '🔮' },
  { id: 'tribulation', name: '天劫洗礼', icon: '⚡' },
  { id: 'synthesis', name: '材料合成', icon: '⚗️' },
]

// ===== 灵魂契合度 =====
const playerData = ref({
  spiritRoot: '火灵根',
  realmName: '大乘',
  gold: 50000,
  compatibility: 72
})

const elementCompat = ref([
  { name: '金', icon: '⚔️', value: 45, cls: 'metal', bonusText: '攻击+5%' },
  { name: '木', icon: '🌿', value: 80, cls: 'wood', bonusText: '防御+8%' },
  { name: '水', icon: '💧', value: 65, cls: 'water', bonusText: '生命+6%' },
  { name: '火', icon: '🔥', value: 90, cls: 'fire', bonusText: '暴击+9%' },
  { name: '土', icon: '🪨', value: 55, cls: 'earth', bonusText: '韧性+5%' },
])

const overallCompatibility = computed(() => {
  const sum = elementCompat.value.reduce((acc, e) => acc + e.value, 0)
  return Math.round(sum / elementCompat.value.length)
})

const gaugeDashArray = computed(() => {
  const circumference = 251 // 2 * PI * 40 (radius=40 arc)
  const filled = (overallCompatibility.value / 100) * circumference
  return `${filled} ${circumference}`
})

const compatStatusClass = computed(() => {
  const v = overallCompatibility.value
  if (v >= 80) return 'excellent'
  if (v >= 60) return 'good'
  if (v >= 40) return 'fair'
  return 'poor'
})

const compatStatusText = computed(() => {
  const v = overallCompatibility.value
  if (v >= 80) return '🌟 天人合一'
  if (v >= 60) return '✨ 灵根通畅'
  if (v >= 40) return '🌙 略有感应'
  return '⚠️ 感应微弱'
})

const totalBonus = computed(() => Math.round((overallCompatibility.value - 50) * 0.6))

const bonusList = computed(() => [
  { icon: '⚡', label: '天劫成功率', value: `+${totalBonus.value}%`, positive: true },
  { icon: '🌟', label: '飞升属性加成', value: `+${Math.round(totalBonus.value * 0.5)}%`, positive: true },
  { icon: '💫', label: '雷劫抗性', value: `+${Math.round(totalBonus.value * 0.3)}%`, positive: true },
])

const suggestions = computed(() => {
  const list = []
  const low = elementCompat.value.filter(e => e.value < 60)
  if (low.length > 0) {
    list.push({
      icon: '🔮',
      text: `提升${low.map(e => e.name).join('、')}属性契合度，可增加飞升成功率`
    })
  }
  if (overallCompatibility.value < 60) {
    list.push({ icon: '📿', text: '佩戴灵根相关的装备可提升契合度' })
  }
  if (playerData.value.realmName !== '飞升') {
    list.push({ icon: '⚡', text: '完成更多天劫洗礼可提升灵魂纯净度' })
  }
  return list.length ? list : [{ icon: '🎉', text: '契合度良好，保持当前状态即可尝试飞升！' }]
})

// ===== 天劫洗礼 =====
const baptismProgress = ref({
  completed: false,
  current: 2,
  total: 5
})

const baptismProgressPercent = computed(() => {
  if (baptismProgress.value.completed) return 100
  return Math.round((baptismProgress.value.current / baptismProgress.value.total) * 100)
})

const tribTypes = ref([
  { id: 'thunder', name: '雷劫', icon: '⚡', desc: '最常见的九天神雷', rate: 75, unlocked: true, unlockReq: null, effectText: '雷抗+15 灵魂+10' },
  { id: 'fire', name: '火劫', icon: '🔥', desc: '焚天烈焰洗涤凡躯', rate: 65, unlocked: true, unlockReq: null, effectText: '火抗+20 体质+8' },
  { id: 'ice', name: '冰魄劫', icon: '❄️', desc: '千年寒冰凝结神魂', rate: 55, unlocked: false, unlockReq: '完成雷劫洗礼' },
  { id: 'spirit', name: '心魔劫', icon: '👻', desc: '渡心魔方可成正果', rate: 45, unlocked: false, unlockReq: '完成火劫洗礼' },
  { id: 'heaven', name: '天罚', icon: '🌌', desc: '天道降下最终审判', rate: 30, unlocked: false, unlockReq: '完成冰魄劫' },
])

const selectedTrib = ref('thunder')
const isBaptizing = ref(false)
const baptizeProgress = ref(0)
const baptizeStatusText = ref('')
const baptismRecords = ref([
  { type: '雷劫', rate: 75, success: true, time: '2026-03-23 14:20' },
  { type: '火劫', rate: 65, success: false, time: '2026-03-22 09:15' },
])

const currentTribEffect = computed(() => {
  const trib = tribTypes.value.find(t => t.id === selectedTrib.value)
  if (!trib) return []
  const effects = trib.effectText.split(' ')
  return effects.map(e => {
    const [icon, label, value] = e.match(/([^\d]+)(\d+)/).slice(1)
    return { icon: '✨', label, value }
  })
})

const canBaptize = computed(() => {
  const trib = tribTypes.value.find(t => t.id === selectedTrib.value)
  return trib && trib.unlocked && !baptismProgress.value.completed
})

function getRateClass(rate) {
  if (rate >= 70) return 'rate-high'
  if (rate >= 50) return 'rate-mid'
  return 'rate-low'
}

function startBaptism() {
  if (!canBaptize.value || isBaptizing.value) return
  isBaptizing.value = true
  baptizeProgress.value = 0
  const trib = tribTypes.value.find(t => t.id === selectedTrib.value)
  const success = Math.random() * 100 < trib.rate

  let phase = 0
  const phases = ['凝聚灵气...', '天雷降临...', '灵魂洗涤...', success ? '洗礼成功！' : '洗礼失败...']
  const interval = setInterval(() => {
    phase++
    baptizeProgress.value = Math.min(100, (phase / phases.length) * 100)
    baptizeStatusText.value = phases[Math.min(phase, phases.length - 1)]
    if (phase >= phases.length) {
      clearInterval(interval)
      setTimeout(() => {
        isBaptizing.value = false
        baptismRecords.value.unshift({
          type: trib.name,
          rate: trib.rate,
          success,
          time: new Date().toLocaleString('zh-CN')
        })
        if (success && baptismProgress.value.current < baptismProgress.value.total) {
          baptismProgress.value.current++
        }
        if (baptismProgress.value.current >= baptismProgress.value.total) {
          baptismProgress.value.completed = true
        }
      }, 500)
    }
  }, 1000)
}

// ===== 材料合成 =====
const activeSynthCategory = ref('ascension')
const playerGold = ref(50000)

const synthCategories = [
  { id: 'ascension', name: '飞升', icon: '🌟' },
  { id: 'weapon', name: '武器', icon: '⚔️' },
  { id: 'alchemy', name: '丹药', icon: '⚗️' },
  { id: 'talisman', name: '符箓', icon: '📜' },
]

const synthMaterialsData = ref({
  ascension: [
    { id: 101, name: '灵气结晶', icon: '💎', quality: 'rare', count: 3 },
    { id: 102, name: '天雷碎片', icon: '⚡', quality: 'epic', count: 1 },
    { id: 103, name: '星辰之尘', icon: '⭐', quality: 'legendary', count: 0 },
    { id: 104, name: '混沌之气', icon: '🌌', quality: 'legendary', count: 0 },
  ],
  weapon: [
    { id: 201, name: '精铁', icon: '🪨', quality: 'uncommon', count: 5 },
    { id: 202, name: '陨铁', icon: '🌑', quality: 'rare', count: 3 },
    { id: 203, name: '天外玄铁', icon: '⭐', quality: 'epic', count: 1 },
  ],
  alchemy: [
    { id: 301, name: '灵草', icon: '🌿', quality: 'common', count: 8 },
    { id: 302, name: '灵芝', icon: '🍄', quality: 'uncommon', count: 4 },
    { id: 303, name: '九转灵芝', icon: '💠', quality: 'rare', count: 2 },
  ],
  talisman: [
    { id: 401, name: '符纸', icon: '📄', quality: 'common', count: 10 },
    { id: 402, name: '灵符', icon: '📜', quality: 'uncommon', count: 5 },
    { id: 403, name: '天师符', icon: '✨', quality: 'rare', count: 1 },
  ],
})

const synthesisRecipes = {
  101: { resultId: 102, name: '天雷碎片', icon: '⚡', count: 1, costCount: 3, goldCost: 2000 },
  102: { resultId: 103, name: '星辰之尘', icon: '⭐', count: 1, costCount: 3, goldCost: 5000 },
  103: { resultId: 104, name: '混沌之气', icon: '🌌', count: 1, costCount: 3, goldCost: 10000 },
  201: { resultId: 202, name: '陨铁', icon: '🌑', count: 1, costCount: 3, goldCost: 800 },
  202: { resultId: 203, name: '天外玄铁', icon: '⭐', count: 1, costCount: 3, goldCost: 3000 },
  301: { resultId: 302, name: '灵芝', icon: '🍄', count: 1, costCount: 3, goldCost: 500 },
  302: { resultId: 303, name: '九转灵芝', icon: '💠', count: 1, costCount: 3, goldCost: 2000 },
  401: { resultId: 402, name: '灵符', icon: '📜', count: 1, costCount: 3, goldCost: 300 },
  402: { resultId: 403, name: '天师符', icon: '✨', count: 1, costCount: 3, goldCost: 1500 },
}

const selectedSynthMaterial = ref(null)
const showSynthResult = ref(false)
const synthResultData = ref({})

const currentSynthMaterials = computed(() => {
  return synthMaterialsData.value[activeSynthCategory.value] || []
})

const recipeResult = computed(() => {
  if (!selectedSynthMaterial.value) return null
  return synthesisRecipes[selectedSynthMaterial.value.id] || null
})

const canSynthAscend = computed(() => {
  if (!selectedSynthMaterial.value || !recipeResult.value) return false
  const mat = selectedSynthMaterial.value
  const recipe = recipeResult.value
  return mat.count >= recipe.costCount && playerGold.value >= recipe.goldCost
})

const ascensionMaterials = ref([
  { name: '灵气结晶', icon: '💎', current: 3, needed: 5 },
  { name: '天雷碎片', icon: '⚡', current: 1, needed: 3 },
  { name: '星辰之尘', icon: '⭐', current: 0, needed: 1 },
  { name: '混沌之气', icon: '🌌', current: 0, needed: 1 },
])

function selectSynthMaterial(mat) {
  selectedSynthMaterial.value = selectedSynthMaterial.value?.id === mat.id ? null : mat
}

function doSynthesize() {
  if (!canSynthAscend.value) return
  const mat = selectedSynthMaterial.value
  const recipe = recipeResult.value

  // 扣材料扣钱
  mat.count -= recipe.costCount
  playerGold.value -= recipe.goldCost

  // 添加产物
  synthResultData.value = { icon: recipe.icon, name: recipe.name, count: recipe.count }
  showSynthResult.value = true

  // 更新产物数量
  const target = synthMaterialsData.value[activeSynthCategory.value].find(m => m.id === recipe.resultId)
  if (target) {
    target.count += recipe.count
  }

  // 更新飞升材料进度
  const am = ascensionMaterials.value.find(a => a.name === recipe.name)
  if (am) am.current += recipe.count

  // 更新选中状态
  const updatedMat = synthMaterialsData.value[activeSynthCategory.value].find(m => m.id === mat.id)
  if (updatedMat && updatedMat.count > 0) {
    selectedSynthMaterial.value = updatedMat
  } else {
    selectedSynthMaterial.value = null
  }
}

onMounted(() => {
  // 加载玩家数据
  try {
    const saved = JSON.parse(localStorage.getItem('idleCultivationGame') || '{}')
    if (saved.gameState?.player) {
      const p = saved.gameState.player
      playerData.value.spiritRoot = p.spiritRoot || '火灵根'
      playerData.value.realmName = p.realmName || '大乘'
      playerGold.value = p.gold || 50000
    }
  } catch (e) {}
})
</script>

<style scoped>
.ascension-pre-panel {
  background: linear-gradient(135deg, #1a0a2e 0%, #16213e 50%, #0d1b2a 100%);
  border-radius: 16px;
  border: 2px solid #7c3aed;
  box-shadow: 0 20px 60px rgba(124, 58, 237, 0.3);
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-family: 'Microsoft YaHei', sans-serif;
}

/* ===== 头部 ===== */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(90deg, #2d1b69 0%, #1a1a2e 100%);
  border-bottom: 1px solid rgba(124, 58, 237, 0.4);
}

.panel-title {
  font-size: 22px;
  font-weight: bold;
  color: #c4b5fd;
  text-shadow: 0 0 10px rgba(124, 58, 237, 0.5);
}

.panel-subtitle {
  font-size: 12px;
  color: #a78bfa;
  margin-top: 2px;
}

.close-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #a78bfa;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 20px;
  cursor: pointer;
  line-height: 1;
}

.close-btn:hover {
  background: rgba(124, 58, 237, 0.3);
  color: #fff;
}

/* ===== 子导航 ===== */
.sub-nav {
  display: flex;
  padding: 10px 16px;
  gap: 8px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(124, 58, 237, 0.2);
}

.sub-nav-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(124, 58, 237, 0.3);
  border-radius: 10px;
  color: #a78bfa;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.sub-nav-btn.active {
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 4px 15px rgba(124, 58, 237, 0.4);
}

.sub-nav-btn:hover:not(.active) {
  background: rgba(124, 58, 237, 0.2);
}

.tab-icon { font-size: 16px; }

/* ===== 内容区 ===== */
.tab-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.section-desc {
  background: rgba(124, 58, 237, 0.1);
  border-left: 3px solid #7c3aed;
  padding: 10px 14px;
  font-size: 13px;
  color: #c4b5fd;
  border-radius: 0 8px 8px 0;
  margin-bottom: 16px;
}

.section-title {
  font-size: 15px;
  font-weight: bold;
  color: #fbbf24;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* ===== 契合度 ===== */
.overall-compatibility {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
}

.compat-gauge-wrapper {
  width: 180px;
  height: 100px;
}

.compat-gauge {
  width: 100%;
  height: 100%;
}

.gauge-value {
  font-size: 28px;
  font-weight: bold;
  fill: #fbbf24;
}

.gauge-label {
  font-size: 12px;
  fill: #a78bfa;
}

.compat-status-badge {
  padding: 6px 20px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: bold;
  margin-top: 6px;
}

.compat-status-badge.excellent { background: linear-gradient(135deg, #22c55e, #16a34a); color: #fff; }
.com
.compat-status-badge.good { background: linear-gradient(135deg, #3b82f6, #2563eb); color: #fff; }
.compat-status-badge.fair { background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; }
.compat-status-badge.poor { background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; }

/* ===== 五行契合 ===== */
.element-compat-section { margin-bottom: 16px; }
.element-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}
.element-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  border: 2px solid transparent;
  transition: all 0.3s;
}
.element-card.metal { border-color: #d4af37; }
.element-card.wood { border-color: #22c55e; }
.element-card.water { border-color: #3b82f6; }
.element-card.fire { border-color: #ef4444; }
.element-card.earth { border-color: #8b4513; }
.elem-icon { font-size: 24px; }
.elem-name { font-size: 12px; color: #fff; font-weight: bold; margin: 4px 0; }
.elem-bar-bg { width: 100%; height: 6px; background: #2d3748; border-radius: 3px; overflow: hidden; }
.elem-bar-fill { height: 100%; background: linear-gradient(90deg, #ef4444, #f59e0b, #22c55e); border-radius: 3px; transition: width 0.5s; }
.elem-value { font-size: 11px; color: #fbbf24; font-weight: bold; margin-top: 4px; }
.elem-bonus { font-size: 10px; color: #a78bfa; margin-top: 2px; }

/* ===== 契合加成 ===== */
.bonus-explain-section { margin-bottom: 16px; }
.bonus-list { display: flex; flex-direction: column; gap: 6px; }
.bonus-item { display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: rgba(255, 255, 255, 0.04); border-radius: 6px; }
.bonus-icon { font-size: 14px; }
.bonus-label { flex: 1; font-size: 13px; color: #a78bfa; }
.bonus-value { font-weight: bold; font-size: 13px; }
.bonus-value.positive { color: #22c55e; }
.bonus-value.negative { color: #ef4444; }
.total-bonus { margin-top: 8px; padding: 8px 12px; background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 8px; font-size: 13px; color: #fbbf24; }
.total-value { font-weight: bold; font-size: 16px; }

/* ===== 提升建议 ===== */
.suggestion-section { margin-bottom: 8px; }
.suggestion-list { display: flex; flex-direction: column; gap: 6px; }
.suggestion-item { display: flex; align-items: flex-start; gap: 8px; padding: 8px 10px; background: rgba(255, 255, 255, 0.04); border-radius: 8px; font-size: 13px; color: #c4b5fd; }
.suggest-icon { font-size: 14px; margin-top: 1px; flex-shrink: 0; }

/* ===== 天劫洗礼 ===== */
.baptism-status-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(109, 40, 217, 0.1));
  border: 1px solid rgba(124, 58, 237, 0.4);
  border-radius: 12px;
  margin-bottom: 16px;
}
.baptism-icon { font-size: 40px; }
.baptism-info { flex: 1; }
.baptism-title { font-size: 14px; color: #a78bfa; margin-bottom: 4px; }
.baptism-desc { font-size: 13px; color: #fff; margin-bottom: 6px; }
.baptism-progress-bar { width: 100%; height: 8px; background: #2d3748; border-radius: 4px; overflow: hidden; }
.baptism-progress-fill { height: 100%; background: linear-gradient(90deg, #7c3aed, #a78bfa); border-radius: 4px; transition: width 0.5s; }

.trib-type-section { margin-bottom: 16px; }
.trib-type-list { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.trib-type-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 14px 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(124, 58, 237, 0.3);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
}
.trib-type-card.selected { border-color: #7c3aed; background: rgba(124, 58, 237, 0.15); box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3); }
.trib-type-card.locked { opacity: 0.5; cursor: not-allowed; }
.trib-type-icon { font-size: 28px; margin-bottom: 6px; }
.trib-type-name { font-size: 14px; font-weight: bold; color: #fff; margin-bottom: 4px; }
.trib-type-desc { font-size: 11px; color: #888; text-align: center; margin-bottom: 6px; }
.trib-type-rate { font-size: 12px; }
.rate-high { color: #22c55e; font-weight: bold; }
.rate-mid { color: #f59e0b; font-weight: bold; }
.rate-low { color: #ef4444; font-weight: bold; }
.trib-locked-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; font-size: 11px; color: #aaa; }

.baptism-effect-section { margin-bottom: 16px; }
.effect-preview { display: flex; gap: 10px; flex-wrap: wrap; }
.effect-item { display: flex; align-items: center; gap: 6px; padding: 6px 12px; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 8px; }
.effect-icon { font-size: 14px; }
.effect-label { font-size: 12px; color: #aaa; }
.effect-value { font-weight: bold; font-size: 13px; }
.effect-value.positive { color: #22c55e; }

/* 雷劫动画 */
.lightning-arena {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: linear-gradient(180deg, rgba(124, 58, 237, 0.1) 0%, rgba(0, 0, 0, 0.2) 100%);
  border: 1px solid rgba(124, 58, 237, 0.3);
  border-radius: 12px;
  margin-bottom: 16px;
  min-height: 200px;
}
.lightning-title { font-size: 16px; color: #fbbf24; margin-bottom: 10px; font-weight: bold; }
.lightning-effects { display: flex; gap: 20px; margin-bottom: 10px; }
.lightning-bolt { font-size: 28px; animation: lightningFlash 0.6s infinite alternate; color: #fbbf24; }
@keyframes lightningFlash {
  0% { opacity: 0.3; transform: scale(0.9); }
  100% { opacity: 1; transform: scale(1.1); }
}
.baptize-character { font-size: 48px; position: relative; margin: 10px 0; }
.character-aura {
  position: absolute;
  inset: -20px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(124, 58, 237, 0.3) 0%, transparent 70%);
  animation: none;
}
.character-aura.absorbing { animation: auraPulse 1s infinite alternate; }
@keyframes auraPulse {
  0% { transform: scale(0.8); opacity: 0.3; }
  100% { transform: scale(1.3); opacity: 0.8; }
}
.baptize-status { font-size: 14px; color: #a78bfa; margin: 8px 0; }
.lightning-progress { width: 80%; height: 8px; background: #2d3748; border-radius: 4px; overflow: hidden; }
.lightning-progress-fill { height: 100%; background: linear-gradient(90deg, #fbbf24, #f59e0b); border-radius: 4px; transition: width 0.3s; }

.baptize-action { margin-bottom: 16px; }
.baptize-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 15px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}
.baptize-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.baptize-btn:hover:not(:disabled) { box-shadow: 0 4px 15px rgba(124, 58, 237, 0.5); transform: scale(1.01); }
.baptize-warning { margin-top: 8px; font-size: 12px; color: #f59e0b; text-align: center; }

.baptism-record-section { margin-bottom: 8px; }
.record-list { display: flex; flex-direction: column; gap: 6px; }
.record-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: rgba(255, 255, 255, 0.04); border-radius: 8px; font-size: 13px; }
.record-icon { font-size: 16px; }
.record-type { flex: 1; color: #a78bfa; }
.record-time { color: #666; font-size: 11px; }
.record-empty { text-align: center; color: #666; padding: 20px; font-size: 13px; }

/* ===== 材料合成 ===== */
.synth-category-tabs { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.synth-tab-btn {
  padding: 8px 16px;
  border: 1px solid rgba(124, 58, 237, 0.4);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.05);
  color: #a78bfa;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}
.synth-tab-btn.active { background: linear-gradient(135deg, #7c3aed, #6d28d9); color: #fff; border-color: transparent; }
.synth-tab-btn:hover:not(.active) { background: rgba(124, 58, 237, 0.2); }

.synth-materials-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; }
.synth-material-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  background: #2d3748;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
  position: relative;
}
.synth-material-item:hover { background: #3d4a5c; }
.synth-material-item.selected { border-color: #7c3aed; background: rgba(124, 58, 237, 0.15); }
.synth-material-item.empty { opacity: 0.4; cursor: not-allowed; }
.mat-icon { font-size: 24px; }
.mat-name { font-size: 12px; color: #fff; margin-top: 4px; text-align: center; }
.mat-count { font-size: 11px; color: #fbbf24; font-weight: bold; }
.mat-count.zero { color: #ef4444; }
.mat-quality-dot { position: absolute; top: 6px; right: 6px; width: 8px; height: 8px; border-radius: 50%; }
.mat-quality-dot.legendary { background: #f59e0b; box-shadow: 0 0 4px #f59e0b; }
.mat-quality-dot.epic { background: #a855f7; }
.mat-quality-dot.rare { background: #3b82f6; }
.mat-quality-dot.uncommon { background: #22c55e; }
.mat-quality-dot.common { background: #9ca3af; }
.synth-empty { grid-column: span 4; text-align: center; color: #666; padding: 30px; }

.synth-recipe-section {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(124, 58, 237, 0.3);
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 12px;
}
.recipe-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.recipe-title { font-size: 13px; color: #a78bfa; }
.recipe-target { font-size: 14px; color: #fbbf24; font-weight: bold; }
.recipe-body { display: flex; align-items: center; gap: 12px; }
.recipe-costs { flex: 1; }
.cost-label { font-size: 12px; color: #888; margin-bottom: 6px; }
.cost-item-row { display: flex; align-items: center; gap: 6px; background: #2d3748; padding: 6px 10px; border-radius: 6px; margin-bottom: 4px; }
.cost-icon { font-size: 16px; }
.cost-name { flex: 1; font-size: 13px; color: #fff; }
.cost-count { font-size: 12px; font-weight: bold; color: #ef4444; }
.cost-count.enough { color: #22c55e; }
.cost-gold-row { font-size: 12px; color: #fbbf24; margin-top: 4px; }
.cost-gold-row .enough { color: #22c55e; }
.recipe-arrow { font-size: 22px; color: #7c3aed; }
.recipe-output { display: flex; flex-direction: column; align-items: center; background: #2d3748; padding: 12px; border-radius: 8px; min-width: 80px; }
.output-icon { font-size: 28px; }
.output-name { font-size: 13px; color: #fff; margin-top: 4px; }
.output-count { font-size: 12px; color: #22c55e; font-weight: bold; }
.recipe-no-formula { text-align: center; color: #666; padding: 20px; font-size: 13px; }

.synth-action-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.synth-status { font-size: 14px; }
.status-ok { color: #22c55e; }
.status-no { color: #ef4444; }
.synth-btn {
  padding: 10px 24px;
  background: linear-gradient(135deg, #7c3aed, #6d28d9);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}
.synth-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.synth-btn:hover:not(:disabled) { box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4); }

.ascension-mats-progress { margin-bottom: 8px; }
.ascension-progress-list { display: flex; flex-direction: column; gap: 8px; }
.asc-mat-item { display: flex; align-items: center; gap: 10px; padding: 6px 10px; background: rgba(255, 255, 255, 0.04); border-radius: 8px; }
.am-icon { font-size: 18px; }
.am-name { width: 70px; font-size: 12px; color: #a78bfa; }
.am-bar-bg { flex: 1; height: 8px; background: #2d3748; border-radius: 4px; overflow: hidden; }
.am-bar-fill { height: 100%; background: linear-gradient(90deg, #7c3aed, #a78bfa); border-radius: 4px; transition: width 0.5s; }
.am-bar-fill.full { background: linear-gradient(90deg, #22c55e, #16a34a); }
.am-count { width: 45px; text-align: right; font-size: 12px; color: #fbbf24; font-weight: bold; }
.ascension-ready { margin-top: 10px; padding: 10px; background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.4); border-radius: 8px; color: #22c55e; text-align: center; font-size: 13px; font-weight: bold; }

/* 合成结果弹窗 */
.synth-result-overlay {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 2000;
}
.synth-result-modal {
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  border-radius: 16px; padding: 28px; text-align: center; border: 2px solid #7c3aed;
  box-shadow: 0 20px 60px rgba(124, 58, 237, 0.4);
  min-width: 260px;
}
.result-title { font-size: 22px; color: #c4b5fd; font-weight: bold; margin-bottom: 16px; }
.result-display { display: flex; flex-direction: column; align-items: center; background: #2d3748; padding: 16px; border-radius: 12px; margin-bottom: 20px; }
.result-icon { font-size: 40px; }
.result-name { font-size: 16px; color: #fff; margin-top: 8px; }
.result-count { font-size: 14px; color: #22c55e; font-weight: bold; margin-top: 4px; }
.result-confirm-btn {
  padding: 10px 40px; background: linear-gradient(135deg, #7c3aed, #6d28d9);
  color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 14px;
}
.result-confirm-btn:hover { box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4); }

@media (max-width: 600px) {
  .ascension-pre-panel { border-radius: 12px; }
  .element-grid { grid-template-columns: repeat(3, 1fr); }
  .trib-type-list { grid-template-columns: repeat(2, 1fr); }
  .synth-materials-grid { grid-template-columns: repeat(3, 1fr); }
}
</style>
