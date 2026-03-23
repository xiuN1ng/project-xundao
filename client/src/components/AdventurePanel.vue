<template>
  <div class="adventure-panel">
    <!-- 顶部标题栏 -->
    <div class="panel-header">
      <h2>✨ 仙侠奇遇</h2>
      <div class="header-info">
        <span class="cooldown-hint" v-if="globalCooldown > 0">
          ⏳ 全局冷却: {{ formatTime(globalCooldown) }}
        </span>
        <span class="adventure-count">
          今日奇遇: {{ todayCount }}/{{ maxDailyAdventures }}
        </span>
      </div>
    </div>

    <!-- 当前奇遇状态 -->
    <div v-if="currentAdventure" class="current-adventure-banner" :class="currentAdventure.state">
      <div class="banner-icon">{{ currentAdventure.icon }}</div>
      <div class="banner-content">
        <h3>{{ currentAdventure.name }}</h3>
        <p>{{ currentAdventure.description }}</p>
        <div v-if="currentAdventure.state === 'active'" class="adventure-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{width: currentAdventure.progress + '%'}"></div>
          </div>
          <span class="progress-text">{{ currentAdventure.progress }}%</span>
        </div>
        <div v-if="currentAdventure.state === 'pending'" class="pending-reward">
          <span>🎁 待领取奖励</span>
          <button class="claim-btn" @click="claimReward">领取</button>
        </div>
      </div>
    </div>

    <!-- 奇遇入口按钮区 -->
    <div class="adventure-grid">
      <div v-for="adventure in adventureTypes" :key="adventure.id"
        class="adventure-card"
        :class="{
          locked: !adventure.unlocked,
          cooldown: adventure.cooldown > 0,
          active: currentAdventure?.type === adventure.id
        }"
        :style="{ '--card-color': adventure.color }"
        @click="enterAdventure(adventure)">
        <div class="card-glow"></div>
        <div class="card-icon">{{ adventure.icon }}</div>
        <h3 class="card-title">{{ adventure.name }}</h3>
        <p class="card-desc">{{ adventure.description }}</p>
        <div class="card-meta">
          <span class="difficulty" :class="'diff-' + adventure.difficulty">
            {{ ['★','★★','★★★'][adventure.difficulty - 1] }}
          </span>
          <span class="reward-preview">奖励: {{ adventure.rewardPreview }}</span>
        </div>
        <!-- 冷却遮罩 -->
        <div v-if="adventure.cooldown > 0" class="cooldown-overlay">
          <div class="cooldown-timer">
            <span class="cooldown-icon">⏳</span>
            <span class="cooldown-text">{{ formatTime(adventure.cooldown) }}</span>
          </div>
        </div>
        <!-- 锁定遮罩 -->
        <div v-if="!adventure.unlocked" class="locked-overlay">
          <span class="locked-icon">🔒</span>
          <span class="locked-reason">{{ adventure.lockReason }}</span>
        </div>
      </div>
    </div>

    <!-- Tab切换：奇遇日志 / 历史记录 -->
    <div class="tab-bar">
      <button v-for="tab in tabs" :key="tab.id"
        class="tab-btn" :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id">
        {{ tab.icon }} {{ tab.name }}
      </button>
    </div>

    <!-- Tab内容：奇遇日志 -->
    <div v-if="activeTab === 'log'" class="log-content">
      <div v-if="adventureLogs.length === 0" class="empty-state">
        <span>📜 暂无奇遇记录</span>
        <p>快去探索奇遇吧！</p>
      </div>
      <div v-else class="log-list">
        <div v-for="log in adventureLogs" :key="log.id"
          class="log-entry"
          :class="'log-' + log.result">
          <div class="log-header">
            <span class="log-icon">{{ log.icon }}</span>
            <span class="log-title">{{ log.title }}</span>
            <span class="log-time">{{ log.time }}</span>
          </div>
          <div class="log-body">
            <span class="log-desc">{{ log.description }}</span>
            <div v-if="log.rewards && log.rewards.length > 0" class="log-rewards">
              <span v-for="reward in log.rewards" :key="reward.type" class="reward-chip">
                {{ reward.icon }} {{ reward.amount }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab内容：历史记录 -->
    <div v-if="activeTab === 'history'" class="history-content">
      <div v-if="adventureHistory.length === 0" class="empty-state">
        <span>📖 暂无历史记录</span>
      </div>
      <div v-else class="history-list">
        <div v-for="record in adventureHistory" :key="record.id" class="history-entry">
          <div class="history-icon">{{ record.icon }}</div>
          <div class="history-info">
            <span class="history-title">{{ record.name }}</span>
            <span class="history-date">{{ record.date }}</span>
          </div>
          <div class="history-result" :class="record.result">
            {{ record.result === 'success' ? '✅ 成功' : record.result === 'fail' ? '❌ 失败' : '⏸️ 中止' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const activeTab = ref('log')
const tabs = [
  { id: 'log', name: '奇遇日志', icon: '📜' },
  { id: 'history', name: '历史记录', icon: '📖' }
]

// 当前奇遇状态
const currentAdventure = ref(null)

// 全局冷却
const globalCooldown = ref(0)
const maxDailyAdventures = ref(10)
const todayCount = ref(3)

// 奇遇类型定义
const adventureTypes = ref([
  {
    id: 'ruins',
    icon: '🏛️',
    name: '遗迹探索',
    description: '探索上古遗迹，寻找失落的法宝与秘笈',
    difficulty: 2,
    rewardPreview: '灵石、功法残页',
    color: '#f093fb',
    cooldown: 0,
    unlocked: true,
    lockReason: '境界不足'
  },
  {
    id: 'immortal',
    icon: '🧘',
    name: '仙人指路',
    description: '偶遇仙人，获得顿悟与指点',
    difficulty: 3,
    rewardPreview: '顿悟、境界提升',
    color: '#67d6f7',
    cooldown: 3600,
    unlocked: true,
    lockReason: '境界不足'
  },
  {
    id: 'beast',
    icon: '🐉',
    name: '妖兽袭击',
    description: '妖兽来袭，击杀后可获得妖丹与材料',
    difficulty: 1,
    rewardPreview: '妖丹、兽皮',
    color: '#ff6b6b',
    cooldown: 0,
    unlocked: true,
    lockReason: '需加入宗门'
  },
  {
    id: 'treasure',
    icon: '💎',
    name: '遗失宝物',
    description: '探查流落民间的遗失宝物，有缘者得之',
    difficulty: 2,
    rewardPreview: '稀有装备、灵石',
    color: '#ffd93d',
    cooldown: 7200,
    unlocked: false,
    lockReason: '需完成前置奇遇'
  }
])

// 奇遇日志
const adventureLogs = ref([
  {
    id: 1,
    icon: '🏛️',
    title: '遗迹探索',
    description: '在昆仑山脉深处发现了一处上古洞府...',
    time: '刚刚',
    result: 'success',
    rewards: [
      { type: 'lingshi', icon: '💰', amount: 500 },
      { type: 'gongfa', icon: '📜', amount: 3 }
    ]
  },
  {
    id: 2,
    icon: '🧘',
    title: '仙人指路',
    description: '山崖边偶遇一位白发老者，他向你点拨了修炼之道',
    time: '10分钟前',
    result: 'success',
    rewards: [
      { type: 'dunwu', icon: '✨', amount: 1 }
    ]
  },
  {
    id: 3,
    icon: '🐉',
    title: '妖兽袭击',
    description: '一头筑基期妖兽突然袭击，被你成功击退',
    time: '30分钟前',
    result: 'success',
    rewards: [
      { type: 'yaodan', icon: '💊', amount: 2 }
    ]
  }
])

// 历史记录
const adventureHistory = ref([
  {
    id: 1,
    icon: '🏛️',
    name: '遗迹探索·敦煌秘境',
    date: '2026-03-22 15:30',
    result: 'success'
  },
  {
    id: 2,
    icon: '💎',
    name: '遗失宝物·青铜古镜',
    date: '2026-03-21 20:15',
    result: 'fail'
  },
  {
    id: 3,
    icon: '🐉',
    name: '妖兽袭击·赤焰蟒',
    date: '2026-03-20 10:00',
    result: 'success'
  }
])

// 格式化时间
function formatTime(seconds) {
  if (seconds <= 0) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// 进入奇遇
function enterAdventure(adventure) {
  if (!adventure.unlocked || adventure.cooldown > 0) return

  currentAdventure.value = {
    type: adventure.id,
    icon: adventure.icon,
    name: adventure.name,
    description: adventure.description,
    state: 'active',
    progress: 0
  }

  // 模拟进度
  const interval = setInterval(() => {
    if (currentAdventure.value && currentAdventure.value.state === 'active') {
      currentAdventure.value.progress += 5
      if (currentAdventure.value.progress >= 100) {
        currentAdventure.value.progress = 100
        currentAdventure.value.state = 'pending'
        clearInterval(interval)
      }
    }
  }, 300)
}

// 领取奖励
function claimReward() {
  if (!currentAdventure.value) return
  currentAdventure.value = null
  todayCount.value++
}

// 全局计时器
let globalTimer = null
onMounted(() => {
  globalTimer = setInterval(() => {
    if (globalCooldown.value > 0) globalCooldown.value--
    adventureTypes.value.forEach(a => {
      if (a.cooldown > 0) a.cooldown--
    })
  }, 1000)
})
onUnmounted(() => {
  if (globalTimer) clearInterval(globalTimer)
})
</script>

<style scoped>
.adventure-panel {
  padding: 20px;
  min-height: 100vh;
  background: linear-gradient(135deg, rgba(30, 10, 30, 0.88) 0%, rgba(20, 10, 30, 0.90) 100%), url('@/assets/images/bg-marriage-scene.png') center/cover no-repeat;
  box-sizing: border-box;
}
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.panel-header h2 { color: #f093fb; font-size: 22px; margin: 0; }
.header-info { display: flex; gap: 15px; align-items: center; }
.cooldown-hint { background: rgba(255,107,107,0.2); padding: 4px 12px; border-radius: 15px; font-size: 12px; color: #ff6b6b; }
.adventure-count { background: rgba(102,126,234,0.2); padding: 4px 12px; border-radius: 15px; font-size: 12px; }

/* 当前奇遇横幅 */
.current-adventure-banner { display: flex; gap: 15px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 15px; margin-bottom: 20px; border: 1px solid rgba(240,147,251,0.3); }
.current-adventure-banner.active { border-color: #f093fb; }
.current-adventure-banner.pending { border-color: #ffd93d; }
.banner-icon { font-size: 50px; }
.banner-content h3 { margin: 0 0 5px 0; color: #fff; }
.banner-content p { margin: 0 0 10px 0; font-size: 13px; opacity: 0.7; }
.adventure-progress { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.progress-bar { flex: 1; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg,#667eea,#f093fb); border-radius: 4px; transition: width 0.3s; }
.progress-text { font-size: 12px; color: #f093fb; }
.pending-reward { display: flex; align-items: center; gap: 10px; }
.claim-btn { padding: 8px 20px; background: linear-gradient(135deg,#f093fb,#764ba2); border: none; border-radius: 20px; color: #fff; cursor: pointer; font-weight: bold; }

/* 奇遇卡片网格 */
.adventure-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px; }
.adventure-card { position: relative; padding: 20px 15px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; cursor: pointer; overflow: hidden; transition: transform 0.2s, border-color 0.2s; }
.adventure-card:hover { transform: translateY(-3px); border-color: var(--card-color, #667eea); }
.adventure-card.active { border-color: var(--card-color, #667eea); background: rgba(255,255,255,0.08); }
.adventure-card.locked, .adventure-card.cooldown { cursor: not-allowed; opacity: 0.6; }
.card-glow { position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, var(--card-color, transparent) 0%, transparent 70%); opacity: 0; transition: opacity 0.3s; pointer-events: none; }
.adventure-card:hover .card-glow { opacity: 0.05; }
.card-icon { font-size: 40px; margin-bottom: 10px; }
.card-title { margin: 0 0 5px 0; font-size: 15px; color: #fff; }
.card-desc { margin: 0 0 10px 0; font-size: 11px; opacity: 0.6; line-height: 1.4; }
.card-meta { display: flex; justify-content: space-between; align-items: center; }
.difficulty { color: #ffd93d; font-size: 12px; }
.reward-preview { font-size: 10px; opacity: 0.5; }
.cooldown-overlay, .locked-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.7); display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 16px; }
.cooldown-timer { display: flex; align-items: center; gap: 5px; }
.cooldown-text { color: #fff; font-size: 14px; }
.locked-reason { font-size: 11px; color: rgba(255,255,255,0.6); margin-top: 5px; }

/* Tab栏 */
.tab-bar { display: flex; gap: 10px; margin-bottom: 15px; }
.tab-btn { padding: 8px 16px; background: transparent; border: 1px solid rgba(102,126,234,0.3); color: rgba(255,255,255,0.6); border-radius: 20px; cursor: pointer; font-size: 13px; transition: all 0.2s; }
.tab-btn.active { background: linear-gradient(90deg,#667eea,#764ba2); border-color: transparent; color: #fff; }

/* 日志 */
.log-content, .history-content { min-height: 200px; }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; color: rgba(255,255,255,0.4); gap: 10px; }
.log-list, .history-list { display: flex; flex-direction: column; gap: 10px; }
.log-entry { padding: 12px 15px; background: rgba(255,255,255,0.04); border-radius: 12px; border-left: 3px solid transparent; }
.log-entry.log-success { border-left-color: #4ade80; }
.log-entry.log-fail { border-left-color: #ff6b6b; }
.log-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.log-icon { font-size: 20px; }
.log-title { font-weight: bold; font-size: 13px; color: #fff; flex: 1; }
.log-time { font-size: 11px; opacity: 0.4; }
.log-body { padding-left: 28px; }
.log-desc { font-size: 12px; opacity: 0.7; display: block; margin-bottom: 6px; }
.log-rewards { display: flex; flex-wrap: wrap; gap: 6px; }
.reward-chip { background: rgba(255,255,255,0.08); padding: 2px 8px; border-radius: 10px; font-size: 11px; }

/* 历史 */
.history-entry { display: flex; align-items: center; gap: 12px; padding: 12px 15px; background: rgba(255,255,255,0.04); border-radius: 12px; }
.history-icon { font-size: 30px; }
.history-info { flex: 1; display: flex; flex-direction: column; }
.history-title { font-size: 13px; color: #fff; }
.history-date { font-size: 11px; opacity: 0.4; }
.history-result { font-size: 12px; padding: 3px 10px; border-radius: 10px; }
.history-result.success { color: #4ade80; background: rgba(74,222,128,0.1); }
.history-result.fail { color: #ff6b6b; background: rgba(255,107,107,0.1); }
</style>
