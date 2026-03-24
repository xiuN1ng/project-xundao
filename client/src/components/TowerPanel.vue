<template>
  <BasePanel
    title="无尽塔"
    icon="🗼"
    subtitle="挑战极限·登顶为尊"
    :tab-items="modeTabs"
    :default-tab="activeMode"
    :closable="true"
    variant="primary"
    @tab-change="activeMode = $event"
    @close="$emit('close')"
  >
    <!-- ===== 资源状态栏 ===== -->
    <template #header-actions>
      <div class="tower-resources">
        <div class="resource-item">
          <span class="res-label">当前层</span>
          <span class="res-value current-floor">{{ currentFloor }}</span>
        </div>
        <div class="resource-item">
          <span class="res-label">最高层</span>
          <span class="res-value max-floor">{{ maxFloor }}</span>
        </div>
        <div class="resource-item">
          <span class="res-label">今日扫荡</span>
          <span class="res-value">{{ todaySweep }}次</span>
        </div>
      </div>
    </template>

    <!-- ===== 挑战模式 ===== -->
    <div v-if="activeMode === 'challenge'" class="mode-content">
      <div class="enemy-section">
        <!-- 层数指示 -->
        <div class="floor-indicator">
          <span class="floor-label">第</span>
          <span class="floor-num">{{ currentFloor }}</span>
          <span class="floor-label">层</span>
          <span v-if="isBossFloor" class="boss-badge">👑 BOSS</span>
        </div>

        <!-- 战斗 Arena -->
        <div class="battle-arena" :class="{ 'boss-mode': isBossFloor }" style="position:relative">
          <!-- 伤害飘字层 -->
          <DamageNumber ref="dmgRef" />

          <!-- 玩家侧 -->
          <div class="combatant player-side" :class="{ attacking: isAttacking && attacker === 'player' }">
            <div class="combatant-avatar player-avatar">
              <span class="avatar-icon">🧘</span>
            </div>
            <HPBar :current="playerHp" :max="playerMaxHp" color="hp" :height="6" inline />
            <span class="hp-text">{{ playerHp }}/{{ playerMaxHp }}</span>
            <div class="combatant-info">
              <span class="combatant-name">{{ playerName }}</span>
              <span class="combatant-title">{{ playerTitle }}</span>
            </div>
          </div>

          <!-- VS 标识 -->
          <div class="vs-zone">
            <div class="vs-text" :class="{ flash: battleActive }">VS</div>
            <div class="battle-round" v-if="battleActive">第 {{ battleRound }} 回合</div>
          </div>

          <!-- 敌人侧 -->
          <div class="combatant enemy-side" :class="{ attacking: isAttacking && attacker === 'enemy' }">
            <div class="combatant-avatar enemy-avatar" :class="{ 'boss-avatar': isBossFloor }">
              <span class="avatar-icon">{{ currentEnemy.icon }}</span>
            </div>
            <HPBar :current="enemyHp" :max="enemyMaxHp" :color="isBossFloor ? 'boss' : 'hp'" :height="6" inline />
            <span class="hp-text">{{ enemyHp }}/{{ enemyMaxHp }}</span>
            <div class="combatant-info">
              <span class="combatant-name">{{ currentEnemy.name }}</span>
              <span class="combatant-title">{{ isBossFloor ? 'BOSS' : '守关者' }}</span>
            </div>
          </div>
        </div>

        <!-- 战斗操作 -->
        <div class="battle-actions" v-if="!battleActive && !battleEnded">
          <BaseButton variant="primary" size="lg" @click="startBattle" :disabled="currentFloor > maxFloor + 1">
            ⚔️ 开始挑战
          </BaseButton>
        </div>
        <div class="battle-actions" v-else-if="battleActive">
          <div class="battle-status">⚔️ 战斗中...</div>
        </div>
        <div class="battle-actions" v-else-if="battleEnded">
          <div class="battle-result" :class="battleWin ? 'win' : 'lose'">
            <div class="result-msg">{{ battleWin ? '🎉 挑战成功！' : '😔 挑战失败' }}</div>
            <div class="result-rewards" v-if="battleWin">
              <span class="reward-tag" v-for="r in battleRewards" :key="r.icon">{{ r.icon }} {{ r.text }}</span>
            </div>
            <div class="result-btns">
              <BaseButton v-if="battleWin" variant="primary" size="sm" @click="nextFloor">下一层 →</BaseButton>
              <BaseButton v-if="!battleWin" variant="ghost" size="sm" @click="retryBattle">重试</BaseButton>
            </div>
          </div>
        </div>
      </div>

      <!-- 塔层快速选择 -->
      <div class="floor-selector">
        <div class="selector-header">
          <span class="selector-title">🗂 塔层列表</span>
          <div class="floor-range">
            <BaseButton variant="ghost" size="sm" @click="scrollFloors(-5)">◀◀</BaseButton>
            <span>{{ Math.max(1, visibleStartFloor) }}-{{ visibleEndFloor }}层</span>
            <BaseButton variant="ghost" size="sm" @click="scrollFloors(5)">▶▶</BaseButton>
          </div>
        </div>
        <div class="floor-list">
          <div
            v-for="floor in displayedFloors"
            :key="floor.num"
            class="floor-card"
            :class="{
              'current': floor.num === currentFloor,
              'passed': floor.num < currentFloor,
              'boss': floor.isBoss,
              'locked': floor.num > maxFloor + 1
            }"
            @click="selectFloor(floor)"
          >
            <div class="floor-num">{{ floor.num }}</div>
            <div class="floor-info">
              <span class="floor-name">{{ floor.name }}</span>
              <span class="floor-difficulty" v-if="floor.isBoss">👑</span>
            </div>
            <div class="floor-status">
              <span v-if="floor.num < currentFloor" class="status-passed">✓</span>
              <span v-else-if="floor.num === currentFloor" class="status-current">进行中</span>
              <span v-else-if="floor.isBoss && floor.num <= maxFloor + 1" class="status-boss">BOSS</span>
              <span v-else-if="floor.num <= maxFloor + 1" class="status-available">可挑战</span>
              <span v-else class="status-locked">🔒</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 扫荡模式 ===== -->
    <div v-if="activeMode === 'sweep'" class="mode-content">
      <!-- 扫荡配置 -->
      <div class="sweep-config">
        <div class="sweep-header">
          <span class="sweep-title">🧹 扫荡设置</span>
        </div>
        <div class="sweep-range">
          <div class="range-row">
            <span class="range-label">起始层</span>
            <div class="range-input-group">
              <BaseButton variant="ghost" size="sm" @click="sweepStartFloor = Math.max(1, sweepStartFloor - 1)">-</BaseButton>
              <span class="range-val">{{ sweepStartFloor }}</span>
              <BaseButton variant="ghost" size="sm" @click="sweepStartFloor++">+</BaseButton>
            </div>
          </div>
          <div class="range-row">
            <span class="range-label">结束层</span>
            <div class="range-input-group">
              <BaseButton variant="ghost" size="sm" @click="sweepEndFloor = Math.max(sweepStartFloor, sweepEndFloor - 1)">-</BaseButton>
              <span class="range-val">{{ sweepEndFloor }}</span>
              <BaseButton variant="ghost" size="sm" @click="sweepEndFloor++">+</BaseButton>
            </div>
          </div>
        </div>

        <div class="sweep-speed">
          <span class="speed-label">扫荡速度</span>
          <div class="speed-options">
            <BaseButton
              v-for="spd in [1, 2, 5]"
              :key="spd"
              :variant="sweepSpeed === spd ? 'primary' : 'ghost'"
              size="sm"
              @click="sweepSpeed = spd"
            >{{ spd }}x</BaseButton>
          </div>
        </div>

        <div class="sweep-info">
          <div class="sweep-calc">
            预计扫荡 <span class="highlight">{{ Math.max(0, sweepEndFloor - sweepStartFloor + 1) }}</span> 层
            <span class="vline">|</span>
            剩余次数: <span class="highlight">{{ maxSweepTimes - todaySweep }}</span>
          </div>
        </div>

        <div class="sweep-rewards-preview">
          <div class="rewards-title">预计奖励</div>
          <div class="rewards-items">
            <div class="reward-item" v-for="r in estimatedRewards" :key="r.icon">
              <span class="reward-icon">{{ r.icon }}</span>
              <span class="reward-val">+{{ r.val }}</span>
            </div>
          </div>
        </div>

        <BaseButton
          variant="primary"
          block
          :loading="sweeping"
          :disabled="sweepEndFloor < sweepStartFloor || todaySweep >= maxSweepTimes"
          @click="startSweep"
        >
          {{ sweeping ? `⏳ 扫荡中... ${sweepProgress}/${sweepTotal}` : '🧹 开始扫荡' }}
        </BaseButton>
      </div>

      <!-- 扫荡进度 -->
      <div class="sweep-progress" v-if="sweeping">
        <div class="progress-header">
          <span>正在扫荡第 {{ sweepCurrentFloor - 1 }} 层</span>
          <span class="progress-pct">{{ sweepTotal > 0 ? Math.round((sweepProgress / sweepTotal) * 100) : 0 }}%</span>
        </div>
        <ProgressBar :current="sweepProgress" :total="sweepTotal" color="success" />
        <div class="sweep-log">
          <div
            v-for="(log, i) in sweepLogs.slice(-5)"
            :key="i"
            class="log-item"
            :class="log.type"
          >{{ log.text }}</div>
        </div>
      </div>

      <!-- 扫荡记录 -->
      <div class="sweep-history" v-if="!sweeping && sweepHistory.length > 0">
        <div class="history-title">📜 扫荡记录</div>
        <div class="history-list">
          <div v-for="(h, i) in sweepHistory.slice(0, 5)" :key="i" class="history-item">
            <span class="h-range">{{ h.floorStart }}-{{ h.floorEnd }}层</span>
            <span class="h-rewards">{{ h.rewards }}</span>
            <span class="h-time">{{ h.time }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 排行榜 ===== -->
    <div v-if="activeMode === 'rank'" class="mode-content">
      <div class="rank-section">
        <div class="my-rank-card" v-if="myRank">
          <div class="my-rank-position">#{{ myRank.position }}</div>
          <div class="my-rank-info">
            <span class="my-rank-name">{{ playerName }}</span>
            <span class="my-rank-floor">已达 {{ myRank.floor }} 层</span>
          </div>
        </div>

        <div class="rank-list">
          <div
            v-for="(player, idx) in towerRanking"
            :key="player.id"
            class="rank-item"
            :class="{ 'top-3': idx < 3, 'me': player.isMe }"
          >
            <div class="rank-pos">
              <span v-if="idx === 0" class="medal">🥇</span>
              <span v-else-if="idx === 1" class="medal">🥈</span>
              <span v-else-if="idx === 2" class="medal">🥉</span>
              <span v-else class="pos-num">{{ idx + 1 }}</span>
            </div>
            <div class="rank-avatar">{{ player.icon }}</div>
            <div class="rank-info">
              <span class="rank-name">{{ player.name }}</span>
              <span class="rank-realm">{{ player.realm }}</span>
            </div>
            <div class="rank-floor">
              <span class="floor-num">{{ player.floor }}</span>
              <span class="floor-label">层</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 奖励预览 ===== -->
    <div v-if="activeMode === 'rewards'" class="mode-content">
      <div class="rewards-section">
        <div class="rewards-header">
          <span class="rewards-title">🎁 每层奖励</span>
          <div class="floor-filter">
            <BaseButton
              v-for="type in rewardTypes"
              :key="type.id"
              :variant="selectedRewardType === type.id ? 'primary' : 'ghost'"
              size="sm"
              @click="selectedRewardType = type.id"
            >{{ type.name }}</BaseButton>
          </div>
        </div>

        <div class="rewards-grid">
          <div
            v-for="floor in filteredFloorRewards"
            :key="floor.num"
            class="reward-floor-card"
            :class="{ 'boss-floor': floor.isBoss }"
          >
            <div class="rf-header">
              <span class="rf-num">第{{ floor.num }}层</span>
              <span v-if="floor.isBoss" class="rf-boss">👑</span>
            </div>
            <div class="rf-items">
              <span v-for="item in floor.rewards" :key="item.icon" class="rf-item">{{ item.icon }} {{ item.val }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </BasePanel>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import BasePanel from './base/BasePanel.vue'
import BaseButton from './base/BaseButton.vue'
import HPBar from './common/HPBar.vue'
import DamageNumber from './common/DamageNumber.vue'
import ProgressBar from './common/ProgressBar.vue'
import { useToast } from './common/toastComposable.js'

defineEmits(['close'])

const toast = useToast()
const dmgRef = ref(null)

// ===== 基础状态 =====
const playerName = ref('修仙者')
const playerTitle = ref('筑基修士')
const currentFloor = ref(1)
const maxFloor = ref(5)
const todaySweep = ref(0)
const maxSweepTimes = ref(10)

// ===== 模式 =====
const activeMode = ref('challenge')
const modeTabs = [
  { id: 'challenge', name: '挑战', icon: '⚔️' },
  { id: 'sweep', name: '扫荡', icon: '🧹' },
  { id: 'rank', name: '排行', icon: '🏆' },
  { id: 'rewards', name: '奖励', icon: '🎁' },
]

// ===== 战斗状态 =====
const battleActive = ref(false)
const battleEnded = ref(false)
const battleWin = ref(false)
const battleRound = ref(0)
const isAttacking = ref(false)
const attacker = ref('')
const playerHp = ref(10000)
const playerMaxHp = ref(10000)
const enemyHp = ref(5000)
const enemyMaxHp = ref(5000)
const battleRewards = ref([])

// ===== 塔层数据 =====
const visibleStartFloor = ref(1)

const enemyTypes = [
  { name: '练气小妖', icon: '👺', hp: 5000, atk: 200 },
  { name: '筑基散修', icon: '🧙', hp: 8000, atk: 350 },
  { name: '结丹修士', icon: '🧝', hp: 12000, atk: 550 },
  { name: '元婴老怪', icon: '🧛', hp: 18000, atk: 800 },
  { name: '化神强者', icon: '🦸', hp: 25000, atk: 1200 },
  { name: '大乘尊者', icon: '🧚', hp: 35000, atk: 1800 },
  { name: '渡劫真人', icon: '👼', hp: 50000, atk: 2500 },
  { name: '真仙下凡', icon: '🌟', hp: 80000, atk: 4000 },
]

const bossTypes = [
  { name: '金翅大鹏', icon: '🦅', hp: 80000, atk: 5000 },
  { name: '太古凶兽', icon: '🐉', hp: 120000, atk: 7000 },
  { name: '上古真龙', icon: '🐲', hp: 200000, atk: 10000 },
  { name: '混沌魔神', icon: '👹', hp: 300000, atk: 15000 },
  { name: '天道意志', icon: '☁️', hp: 500000, atk: 25000 },
]

const floorNames = ['', '幽冥入口', '迷雾森林', '烈焰山谷', '寒冰洞窟', '雷霆之巅', '虚空裂隙', '魔龙巢穴', '九幽深渊', '天外天宫', '大道归一']

function getEnemyForFloor(floor) {
  if (floor % 10 === 0) {
    const bossIdx = Math.min(Math.floor(floor / 10) - 1, bossTypes.length - 1)
    return { ...bossTypes[bossIdx] }
  }
  const idx = Math.min(Math.floor((floor - 1) / 3), enemyTypes.length - 1)
  return { ...enemyTypes[idx] }
}

const currentEnemy = computed(() => getEnemyForFloor(currentFloor.value))
const isBossFloor = computed(() => currentFloor.value % 10 === 0)

const displayedFloors = computed(() => {
  const floors = []
  for (let i = visibleStartFloor.value; i <= Math.min(visibleStartFloor.value + 9, 100); i++) {
    floors.push({
      num: i,
      name: floorNames[i] || `第${i}层`,
      isBoss: i % 10 === 0,
      passed: i < currentFloor.value,
    })
  }
  return floors
})

const visibleEndFloor = computed(() => displayedFloors.value[displayedFloors.value.length - 1]?.num || 1)

function scrollFloors(delta) {
  visibleStartFloor.value = Math.max(1, visibleStartFloor.value + delta)
}

function selectFloor(floor) {
  if (floor.num <= maxFloor.value + 1) {
    currentFloor.value = floor.num
  }
}

// ===== 战斗逻辑 =====
let battleTimer = null

function startBattle() {
  if (battleActive.value) return
  battleActive.value = true
  battleEnded.value = false
  battleWin.value = false
  battleRound.value = 0
  battleRewards.value = []

  const enemy = currentEnemy.value
  enemyHp.value = enemy.hp
  enemyMaxHp.value = enemy.hp
  playerHp.value = playerMaxHp.value

  battleTimer = setInterval(battleTick, 600)
}

function battleTick() {
  if (!battleActive.value) return

  battleRound.value++

  // 玩家攻击
  isAttacking.value = true
  attacker.value = 'player'
  const playerDmg = Math.floor(playerMaxHp.value * 0.15 * (0.8 + Math.random() * 0.4))
  enemyHp.value = Math.max(0, enemyHp.value - playerDmg)
  dmgRef.value?.crit(playerDmg)

  setTimeout(() => {
    isAttacking.value = false
    attacker.value = ''
  }, 300)

  if (enemyHp.value <= 0) {
    clearInterval(battleTimer)
    battleActive.value = false
    battleEnded.value = true
    battleWin.value = true
    processWin()
    return
  }

  // 敌人攻击
  setTimeout(() => {
    if (!battleActive.value) return
    isAttacking.value = true
    attacker.value = 'enemy'
    const enemyDmg = Math.floor(currentEnemy.value.atk * (0.8 + Math.random() * 0.4))
    playerHp.value = Math.max(0, playerHp.value - enemyDmg)
    dmgRef.value?.add(enemyDmg)

    setTimeout(() => {
      isAttacking.value = false
      attacker.value = ''
    }, 300)

    if (playerHp.value <= 0) {
      clearInterval(battleTimer)
      battleActive.value = false
      battleEnded.value = true
      battleWin.value = false
    }
  }, 400)
}

function processWin() {
  const floor = currentFloor.value
  battleRewards.value = []

  const spiritBase = floor * 50
  const expBase = floor * 100

  battleRewards.value.push(
    { icon: '💎', text: `灵气 +${spiritBase}` },
    { icon: '📚', text: `经验 +${expBase}` },
  )

  const stones = Math.floor(Math.random() * floor * 20 + floor * 10)
  battleRewards.value.push({ icon: '💰', text: `灵石 +${stones}` })

  if (isBossFloor.value) {
    const bossBonus = floor * 200
    battleRewards.value.push({ icon: '⭐', text: `声望 +${bossBonus}` })
  }

  if (currentFloor.value > maxFloor.value) {
    maxFloor.value = currentFloor.value
  }

  toast.reward(`通关第 ${currentFloor.value} 层！`)
}

function nextFloor() {
  currentFloor.value++
  battleEnded.value = false
  battleWin.value = false
  battleRewards.value = []
  playerHp.value = playerMaxHp.value
}

function retryBattle() {
  battleEnded.value = false
  battleWin.value = false
  battleRewards.value = []
  playerHp.value = playerMaxHp.value
  enemyHp.value = enemyMaxHp.value
}

// ===== 扫荡状态 =====
const sweeping = ref(false)
const sweepProgress = ref(0)
const sweepTotal = ref(0)
const sweepCurrentFloor = ref(0)
const sweepLogs = ref([])
const sweepHistory = ref([])
const sweepStartFloor = ref(1)
const sweepEndFloor = ref(10)
const sweepSpeed = ref(5)

const estimatedRewards = computed(() => {
  const count = Math.max(0, sweepEndFloor.value - sweepStartFloor.value + 1)
  const midFloor = Math.ceil((sweepStartFloor.value + sweepEndFloor.value) / 2)
  const spirit = count * 50 * midFloor
  const exp = count * 100 * midFloor
  return [
    { icon: '💎', val: spirit },
    { icon: '📚', val: exp },
    { icon: '💰', val: Math.floor(spirit * 0.3) },
  ]
})

function startSweep() {
  if (sweeping.value) return
  sweeping.value = true
  sweepProgress.value = 0
  sweepTotal.value = sweepEndFloor.value - sweepStartFloor.value + 1
  sweepLogs.value = []
  sweepCurrentFloor.value = sweepStartFloor.value

  simulateSweep()
}

function simulateSweep() {
  if (sweepProgress.value >= sweepTotal.value) {
    sweeping.value = false
    todaySweep.value++

    const historyEntry = {
      floorStart: sweepStartFloor.value,
      floorEnd: sweepCurrentFloor.value - 1,
      rewards: sweepLogs.value.length > 0 ? sweepLogs.value[sweepLogs.value.length - 1].text : '',
      time: new Date().toLocaleTimeString(),
    }
    sweepHistory.value.unshift(historyEntry)

    if (sweepCurrentFloor.value - 1 > maxFloor.value) {
      maxFloor.value = sweepCurrentFloor.value - 1
    }
    toast.success(`扫荡完成！共扫荡 ${sweepTotal.value} 层`)
    return
  }

  const floor = sweepStartFloor.value + sweepProgress.value
  const isBoss = floor % 10 === 0
  const spiritReward = floor * 50
  const expReward = floor * 100

  sweepLogs.value.push({
    type: isBoss ? 'boss' : 'normal',
    text: `第${floor}层 ${isBoss ? '👑BOSS' : '⚔️'} 灵气+${spiritReward} 经验+${expReward}`,
  })

  sweepCurrentFloor.value = floor + 1
  sweepProgress.value++

  setTimeout(simulateSweep, 400 / sweepSpeed.value)
}

// ===== 排行榜 =====
const myRank = ref({ position: 42, floor: 15 })
const towerRanking = ref([
  { id: 'p1', name: '剑圣', icon: '⚔️', realm: '大乘境', floor: 87, isMe: false },
  { id: 'p2', name: '道君', icon: '☯️', realm: '大乘境', floor: 76, isMe: false },
  { id: 'p3', name: '魔尊', icon: '👹', realm: '合体境', floor: 65, isMe: false },
  { id: 'p4', name: '丹圣', icon: '🧪', realm: '合体境', floor: 54, isMe: false },
  { id: 'p5', name: '阵仙', icon: '📐', realm: '炼虚境', floor: 48, isMe: false },
  { id: 'p6', name: '符神', icon: '📜', realm: '炼虚境', floor: 42, isMe: false },
  { id: 'p7', name: '器皇', icon: '🔨', realm: '化神境', floor: 38, isMe: false },
  { id: 'p8', name: '我', icon: '🧘', realm: '筑基境', floor: 15, isMe: true },
  { id: 'p9', name: '丹童', icon: '🌿', realm: '金丹境', floor: 12, isMe: false },
  { id: 'p10', name: '剑童', icon: '🗡️', realm: '筑基境', floor: 8, isMe: false },
])

// ===== 奖励预览 =====
const selectedRewardType = ref('all')
const rewardTypes = [
  { id: 'all', name: '全部' },
  { id: 'normal', name: '普通层' },
  { id: 'boss', name: 'BOSS层' },
]

const floorRewardsData = computed(() => {
  const floors = []
  for (let i = 1; i <= 30; i++) {
    const isBoss = i % 10 === 0
    floors.push({
      num: i,
      isBoss,
      rewards: [
        { icon: '💎', val: `${i * 50}` },
        { icon: '📚', val: `${i * 100}` },
        { icon: '💰', val: `${i * 20}` },
        ...(isBoss ? [{ icon: '⭐', val: `${i * 200}` }] : []),
      ],
    })
  }
  return floors
})

const filteredFloorRewards = computed(() => {
  if (selectedRewardType.value === 'all') return floorRewardsData.value
  if (selectedRewardType.value === 'boss') return floorRewardsData.value.filter(f => f.isBoss)
  return floorRewardsData.value.filter(f => !f.isBoss)
})

onUnmounted(() => {
  if (battleTimer) clearInterval(battleTimer)
})
</script>

<style scoped>
/* ===== 资源栏 ===== */
.tower-resources {
  display: flex;
  gap: 16px;
}
.resource-item {
  text-align: center;
}
.res-label {
  display: block;
  font-size: 11px;
  color: #888;
  margin-bottom: 2px;
}
.res-value {
  font-size: 18px;
  font-weight: bold;
  color: #fff;
}
.current-floor { color: #f093fb; }
.max-floor { color: #ffd700; }

/* ===== Mode Content ===== */
.mode-content {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ===== Enemy Section ===== */
.enemy-section {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 14px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.floor-indicator {
  text-align: center;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.floor-label { font-size: 14px; color: #888; }
.floor-num {
  font-size: 28px;
  font-weight: bold;
  color: #f093fb;
  text-shadow: 0 0 15px rgba(240, 147, 251, 0.5);
}
.boss-badge {
  background: linear-gradient(135deg, #f093fb, #f5576c);
  color: #fff;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  animation: bossPulse 1.5s infinite;
}
@keyframes bossPulse {
  0%, 100% { box-shadow: 0 0 10px rgba(240, 147, 251, 0.5); }
  50% { box-shadow: 0 0 25px rgba(240, 147, 251, 0.9); }
}

/* ===== Battle Arena ===== */
.battle-arena {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 8px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 12px;
  min-height: 140px;
}
.battle-arena.boss-mode {
  background: linear-gradient(135deg, rgba(240, 147, 251, 0.08), rgba(245, 87, 108, 0.08));
  border: 1px solid rgba(240, 147, 251, 0.2);
}

.combatant {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transition: transform 0.15s;
}
.combatant.attacking { animation: attackShake 0.3s ease; }
@keyframes attackShake {
  0% { transform: translateX(0); }
  25% { transform: translateX(-8px); }
  75% { transform: translateX(8px); }
  100% { transform: translateX(0); }
}
.player-side.attacking { animation: attackRight 0.3s ease; }
.enemy-side.attacking { animation: attackLeft 0.3s ease; }
@keyframes attackRight {
  0% { transform: translateX(0); }
  50% { transform: translateX(20px); }
  100% { transform: translateX(0); }
}
@keyframes attackLeft {
  0% { transform: translateX(0); }
  50% { transform: translateX(-20px); }
  100% { transform: translateX(0); }
}

.combatant-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
}
.player-avatar {
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: 2px solid rgba(102, 126, 234, 0.6);
}
.enemy-avatar {
  background: linear-gradient(135deg, #434343, #000000);
  border: 2px solid rgba(255, 255, 255, 0.2);
}
.boss-avatar {
  width: 75px;
  height: 75px;
  font-size: 38px;
  border: 2px solid #ffd700;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.4);
  animation: bossGlow 2s infinite;
}
@keyframes bossGlow {
  0%, 100% { box-shadow: 0 0 15px rgba(255, 215, 0, 0.3); }
  50% { box-shadow: 0 0 30px rgba(255, 215, 0, 0.7); }
}

.avatar-icon { font-size: 28px; }

.hp-text {
  font-size: 10px;
  color: #aaa;
  text-align: center;
}

.combatant-info {
  text-align: center;
  margin-top: 2px;
}
.combatant-name {
  display: block;
  font-size: 13px;
  font-weight: bold;
  color: #fff;
}
.combatant-title { font-size: 11px; color: #888; }

/* ===== VS Zone ===== */
.vs-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 50px;
}
.vs-text {
  font-size: 24px;
  font-weight: bold;
  color: #667eea;
  text-shadow: 0 0 15px rgba(102, 126, 234, 0.6);
}
.vs-text.flash { animation: vsFlash 0.6s infinite; }
@keyframes vsFlash {
  0%, 100% { opacity: 1; text-shadow: 0 0 15px rgba(102, 126, 234, 0.6); }
  50% { opacity: 0.5; text-shadow: 0 0 30px rgba(102, 126, 234, 1); }
}
.battle-round {
  font-size: 11px;
  color: #888;
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 8px;
  border-radius: 10px;
}

/* ===== Battle Actions ===== */
.battle-actions { margin-top: 14px; text-align: center; }
.battle-status { color: #667eea; font-size: 16px; padding: 12px; }

/* ===== Battle Result ===== */
.battle-result {
  padding: 16px;
  border-radius: 12px;
  animation: resultSlide 0.3s ease;
}
@keyframes resultSlide {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.battle-result.win {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(46, 125, 50, 0.15));
  border: 1px solid rgba(76, 175, 80, 0.3);
}
.battle-result.lose {
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.2), rgba(211, 47, 47, 0.15));
  border: 1px solid rgba(244, 67, 54, 0.3);
}
.result-msg { font-size: 18px; font-weight: bold; text-align: center; margin-bottom: 12px; }
.win .result-msg { color: #4caf50; }
.lose .result-msg { color: #f44336; }
.result-rewards { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 12px; }
.reward-tag {
  padding: 4px 12px;
  background: rgba(255, 215, 0, 0.15);
  border-radius: 15px;
  font-size: 13px;
  color: #ffd700;
}
.result-btns { display: flex; justify-content: center; gap: 10px; }

/* ===== Floor Selector ===== */
.floor-selector {
  background: rgba(0, 0, 0, 0.25);
  border-radius: 12px;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.selector-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.selector-title { font-size: 14px; color: #667eea; font-weight: bold; }
.floor-range { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #888; }
.floor-list { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.floor-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 10px 6px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}
.floor-card:hover:not(.locked) {
  background: rgba(102, 126, 234, 0.15);
  border-color: rgba(102, 126, 234, 0.3);
  transform: translateY(-2px);
}
.floor-card.current { background: rgba(102, 126, 234, 0.25); border-color: #667eea; box-shadow: 0 0 15px rgba(102,126,234,0.3); }
.floor-card.passed { background: rgba(76, 175, 80, 0.1); border-color: rgba(76, 175, 80, 0.2); }
.floor-card.boss { background: linear-gradient(135deg, rgba(240, 147, 251, 0.1), rgba(245, 87, 108, 0.1)); border-color: rgba(240, 147, 251, 0.3); }
.floor-card.locked { opacity: 0.4; cursor: not-allowed; }
.floor-card .floor-num { font-size: 20px; font-weight: bold; color: #fff; margin-bottom: 2px; display: block; }
.floor-card.current .floor-num { color: #667eea; }
.floor-card.passed .floor-num { color: #4caf50; }
.floor-info { display: flex; align-items: center; justify-content: center; gap: 3px; margin-bottom: 4px; }
.floor-name { font-size: 10px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 50px; }
.floor-status { font-size: 10px; }
.status-passed { color: #4caf50; }
.status-current { color: #667eea; font-weight: bold; }
.status-boss { color: #ffd700; font-weight: bold; }
.status-available { color: #888; }
.status-locked { color: #555; }

/* ===== Sweep Mode ===== */
.sweep-config {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 14px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.sweep-header { margin-bottom: 14px; }
.sweep-title { font-size: 16px; color: #4caf50; font-weight: bold; }
.sweep-range { display: flex; gap: 20px; margin-bottom: 14px; }
.range-row { flex: 1; display: flex; align-items: center; gap: 10px; }
.range-label { font-size: 13px; color: #888; min-width: 50px; }
.range-input-group { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.05); border-radius: 8px; padding: 4px 8px; }
.range-val { font-size: 18px; font-weight: bold; color: #fff; min-width: 30px; text-align: center; }
.sweep-speed { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.speed-label { font-size: 13px; color: #888; }
.speed-options { display: flex; gap: 8px; }
.sweep-info { margin-bottom: 14px; }
.sweep-calc { font-size: 13px; color: #888; background: rgba(0,0,0,0.2); padding: 10px 14px; border-radius: 8px; }
.highlight { color: #ffd700; font-weight: bold; }
.vline { color: #555; margin: 0 8px; }
.sweep-rewards-preview { background: rgba(255, 215, 0, 0.05); border: 1px solid rgba(255, 215, 0, 0.15); border-radius: 10px; padding: 12px; margin-bottom: 14px; }
.rewards-title { font-size: 12px; color: #888; margin-bottom: 8px; }
.rewards-items { display: flex; gap: 16px; flex-wrap: wrap; }
.reward-item { display: flex; align-items: center; gap: 6px; }
.reward-icon { font-size: 18px; }
.reward-val { font-size: 14px; color: #ffd700; font-weight: bold; }
.sweep-progress {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 14px;
  border: 1px solid rgba(76, 175, 80, 0.3);
  animation: progressAppear 0.3s ease;
}
@keyframes progressAppear { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.progress-header { display: flex; justify-content: space-between; font-size: 13px; color: #aaa; margin-bottom: 8px; }
.progress-pct { color: #4caf50; font-weight: bold; }
.sweep-log { display: flex; flex-direction: column; gap: 4px; max-height: 100px; overflow: hidden; margin-top: 8px; }
.log-item { font-size: 12px; padding: 4px 8px; border-radius: 6px; background: rgba(0,0,0,0.2); color: #aaa; }
.log-item.boss { color: #ffd700; background: rgba(255, 215, 0, 0.1); }
.log-item.normal { color: #4caf50; }
.sweep-history { background: rgba(0, 0, 0, 0.25); border-radius: 12px; padding: 14px; border: 1px solid rgba(255,255,255,0.06); }
.history-title { font-size: 14px; color: #667eea; margin-bottom: 10px; font-weight: bold; }
.history-list { display: flex; flex-direction: column; gap: 6px; }
.history-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; background: rgba(0,0,0,0.2); border-radius: 8px; font-size: 12px; }
.h-range { color: #fff; font-weight: bold; min-width: 70px; }
.h-rewards { flex: 1; color: #ffd700; font-size: 11px; }
.h-time { color: #555; font-size: 11px; }

/* ===== Rank Mode ===== */
.rank-section { display: flex; flex-direction: column; gap: 14px; }
.my-rank-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.25), rgba(118, 75, 162, 0.2));
  border: 1px solid rgba(102, 126, 234, 0.4);
  border-radius: 12px;
  padding: 14px;
}
.my-rank-position { font-size: 32px; font-weight: bold; color: #667eea; text-shadow: 0 0 15px rgba(102, 126, 234, 0.5); }
.my-rank-info { flex: 1; }
.my-rank-name { display: block; font-size: 16px; font-weight: bold; color: #fff; }
.my-rank-floor { font-size: 13px; color: #aaa; }
.rank-list { display: flex; flex-direction: column; gap: 6px; }
.rank-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.2s;
}
.rank-item:hover { background: rgba(255, 255, 255, 0.05); }
.rank-item.top-3 { background: linear-gradient(135deg, rgba(255, 215, 0, 0.08), rgba(184, 134, 11, 0.05)); border-color: rgba(255, 215, 0, 0.2); }
.rank-item.me { background: rgba(102, 126, 234, 0.2); border-color: rgba(102, 126, 234, 0.4); }
.rank-pos { width: 30px; text-align: center; }
.medal { font-size: 22px; }
.pos-num { font-size: 14px; color: #888; font-weight: bold; }
.rank-avatar {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.3), rgba(118, 75, 162, 0.2));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}
.rank-info { flex: 1; }
.rank-name { display: block; font-size: 14px; font-weight: bold; color: #fff; }
.rank-realm { font-size: 11px; color: #888; }
.rank-floor { text-align: right; }
.rank-floor .floor-num { display: block; font-size: 18px; font-weight: bold; color: #ffd700; }
.rank-floor .floor-label { font-size: 11px; color: #888; }

/* ===== Rewards Mode ===== */
.rewards-section { display: flex; flex-direction: column; gap: 14px; }
.rewards-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
.rewards-title { font-size: 16px; color: #ffd700; font-weight: bold; }
.floor-filter { display: flex; gap: 6px; }
.rewards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
.reward-floor-card {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 12px;
  transition: all 0.2s;
}
.reward-floor-card:hover { background: rgba(0, 0, 0, 0.35); transform: translateY(-2px); }
.reward-floor-card.boss-floor { background: linear-gradient(135deg, rgba(240, 147, 251, 0.1), rgba(245, 87, 108, 0.08)); border-color: rgba(240, 147, 251, 0.25); }
.rf-header { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.rf-num { font-size: 14px; font-weight: bold; color: #fff; }
.rf-boss { font-size: 14px; }
.rf-items { display: flex; flex-wrap: wrap; gap: 5px; }
.rf-item { font-size: 11px; color: #aaa; background: rgba(255, 255, 255, 0.05); padding: 2px 7px; border-radius: 8px; }

/* ===== Responsive ===== */
@media (max-width: 480px) {
  .tower-resources { gap: 12px; }
  .mode-content { padding: 12px; }
  .floor-list { grid-template-columns: repeat(4, 1fr); }
  .battle-arena { flex-direction: column; gap: 8px; }
  .vs-zone { flex-direction: row; gap: 10px; }
  .rewards-grid { grid-template-columns: repeat(2, 1fr); }
  .sweep-range { flex-direction: column; gap: 10px; }
}