<template>
  <div class="pvp-panel">
    <!-- 顶部状态栏 -->
    <div class="pvp-header">
      <div class="pvp-title">
        <span class="pvp-icon">⚔️</span>
        <span>PVP对战</span>
      </div>
      <div class="pvp-status" :class="battleStatus">
        <span class="status-dot"></span>
        <span>{{ statusText }}</span>
      </div>
    </div>

    <!-- 对战双方信息 -->
    <div class="battle-arena" v-if="battleState !== 'idle'">
      <!-- 玩家方 -->
      <div class="combatant player-side">
        <div class="combatant-avatar">
          <span class="avatar-emoji">🧘</span>
          <div class="level-badge">{{ player.level }}</div>
        </div>
        <div class="combatant-info">
          <div class="combatant-name">{{ player.name }}</div>
          <div class="combatant-realm">{{ player.realm }}</div>
          <div class="hp-bar">
            <div class="hp-fill" :style="{ width: player.hpPercent + '%' }"></div>
            <span class="hp-text">{{ player.hp }}/{{ player.maxHp }}</span>
          </div>
        </div>
        <div class="combatant-stats">
          <div class="stat-item">
            <span class="stat-icon">⚔️</span>
            <span class="stat-value">{{ player.attack }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-icon">🛡️</span>
            <span class="stat-value">{{ player.defense }}</span>
          </div>
        </div>
      </div>

      <!-- VS -->
      <div class="vs-divider">
        <span class="vs-text">VS</span>
      </div>

      <!-- 对手方 -->
      <div class="combatant enemy-side">
        <div class="combatant-avatar enemy">
          <span class="avatar-emoji">{{ enemy.avatar || '👹' }}</span>
          <div class="level-badge">{{ enemy.level }}</div>
        </div>
        <div class="combatant-info">
          <div class="combatant-name">{{ enemy.name }}</div>
          <div class="combatant-realm">{{ enemy.realm }}</div>
          <div class="hp-bar">
            <div class="hp-fill enemy" :style="{ width: enemy.hpPercent + '%' }"></div>
            <span class="hp-text">{{ enemy.hp }}/{{ enemy.maxHp }}</span>
          </div>
        </div>
        <div class="combatant-stats">
          <div class="stat-item">
            <span class="stat-icon">⚔️</span>
            <span class="stat-value">{{ enemy.attack }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-icon">🛡️</span>
            <span class="stat-value">{{ enemy.defense }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 战斗操作区 -->
    <div class="battle-actions" v-if="battleState === 'ready'">
      <button class="btn btn-attack" @click="startBattle">
        <span>⚔️ 开始战斗</span>
      </button>
    </div>

    <!-- 战斗进行中 -->
    <div class="battle-progress" v-if="battleState === 'fighting'">
      <div class="battle-timer">
        <span class="timer-label">战斗进行中</span>
        <span class="timer-value">{{ battleTimer }}s</span>
      </div>
      <div class="battle-log-container">
        <div 
          v-for="(log, index) in battleLogs" 
          :key="index" 
          class="battle-log"
          :class="log.type"
        >
          <span class="log-time">[{{ log.time }}]</span>
          <span class="log-content">{{ log.content }}</span>
        </div>
      </div>
      <div class="battle-result" v-if="showResult">
        <div class="result-content" :class="resultClass">
          <div class="result-icon">{{ resultIcon }}</div>
          <div class="result-title">{{ resultTitle }}</div>
          <div class="result-message">{{ resultMessage }}</div>
          <div class="result-rewards" v-if="battleRewards.length > 0">
            <div class="rewards-title">获得奖励</div>
            <div class="rewards-list">
              <div v-for="(reward, idx) in battleRewards" :key="idx" class="reward-item">
                <span class="reward-icon">{{ reward.icon }}</span>
                <span class="reward-name">{{ reward.name }}</span>
                <span class="reward-value" :class="reward.type">+{{ reward.value }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 匹配对手 -->
    <div class="match-section" v-if="battleState === 'idle'">
      <div class="match-header">
        <h3>选择对手</h3>
      </div>
      <div class="opponent-list">
        <div 
          v-for="opponent in opponents" 
          :key="opponent.id"
          class="opponent-card"
          :class="{ selected: selectedOpponent?.id === opponent.id }"
          @click="selectOpponent(opponent)"
        >
          <div class="opponent-avatar">
            <span>{{ opponent.avatar }}</span>
          </div>
          <div class="opponent-info">
            <div class="opponent-name">{{ opponent.name }}</div>
            <div class="opponent-realm">{{ opponent.realm }}</div>
            <div class="opponent-power">
              <span class="power-label">战力:</span>
              <span class="power-value">{{ opponent.power }}</span>
            </div>
          </div>
          <div class="opponent-action">
            <button 
              class="btn btn-sm"
              :disabled="!selectedOpponent || selectedOpponent.id !== opponent.id"
              @click.stop="matchOpponent"
            >
              挑战
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 排名信息 -->
    <div class="pvp-ranking">
      <div class="ranking-header">
        <span>当前排名</span>
        <span class="ranking-value">#{{ currentRank }}</span>
      </div>
      <div class="ranking-change" :class="rankChangeClass" v-if="rankChange !== 0">
        <span>{{ rankChange > 0 ? '↑' : '↓' }}</span>
        <span>{{ Math.abs(rankChange) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'

const props = defineProps({
  player: {
    type: Object,
    default: () => ({
      name: '修士',
      level: 1,
      realm: '筑基期',
      hp: 1000,
      maxHp: 1000,
      attack: 100,
      defense: 50
    })
  }
})

const emit = defineEmits(['battle-start', 'battle-end', 'match'])

const battleState = ref('idle') // idle, matching, ready, fighting, ended
const selectedOpponent = ref(null)
const currentRank = ref(100)
const rankChange = ref(0)
const battleTimer = ref(0)
const battleLogs = ref([])
const showResult = ref(false)
const battleRewards = ref([])

let timerInterval = null
let battleInterval = null

// 对手列表
const opponents = ref([
  { id: 1, name: '筑基修士', avatar: '🧑', realm: '筑基期', level: 1, power: 1200 },
  { id: 2, name: '金丹散人', avatar: '👨', realm: '金丹期', level: 2, power: 3500 },
  { id: 3, name: '元婴老怪', avatar: '👴', realm: '元婴期', level: 3, power: 8000 },
  { id: 4, name: '化神强者', avatar: '🧙', realm: '化神期', level: 4, power: 15000 },
  { id: 5, name: '渡劫真人', avatar: '🧚', realm: '渡劫期', level: 5, power: 30000 }
])

// 模拟敌人数据
const enemy = ref({
  name: '筑基修士',
  avatar: '🧑',
  realm: '筑基期',
  level: 1,
  hp: 800,
  maxHp: 800,
  hpPercent: 100,
  attack: 80,
  defense: 30
})

const battleStatus = computed(() => {
  switch (battleState.value) {
    case 'idle': return 'status-idle'
    case 'matching': return 'status-matching'
    case 'ready': return 'status-ready'
    case 'fighting': return 'status-fighting'
    case 'ended': return 'status-ended'
    default: return 'status-idle'
  }
})

const statusText = computed(() => {
  switch (battleState.value) {
    case 'idle': return '等待挑战'
    case 'matching': return '匹配中...'
    case 'ready': return '准备就绪'
    case 'fighting': return '战斗进行'
    case 'ended': return '战斗结束'
    default: return ''
  }
})

const resultClass = computed(() => showResult.value === true ? (battleLogs.value.find(l => l.type === 'win') ? 'victory' : 'defeat') : '')
const resultIcon = computed(() => battleLogs.value.find(l => l.type === 'win') ? '🏆' : '💀')
const resultTitle = computed(() => battleLogs.value.find(l => l.type === 'win') ? '战斗胜利!' : '战斗失败')
const resultMessage = computed(() => battleLogs.value.find(l => l.type === 'win') 
  ? '恭喜你击败了对手！' 
  : '对手实力强大，请再接再厉！')

const rankChangeClass = computed(() => rankChange.value > 0 ? 'positive' : 'negative')

const selectOpponent = (opponent) => {
  selectedOpponent.value = opponent
  enemy.value = { ...opponent, hp: opponent.power / 10, maxHp: opponent.power / 10, hpPercent: 100 }
  emit('match', opponent)
}

const matchOpponent = () => {
  if (!selectedOpponent.value) return
  battleState.value = 'matching'
  
  // 模拟匹配延迟
  setTimeout(() => {
    battleState.value = 'ready'
  }, 1000)
}

const startBattle = () => {
  battleState.value = 'fighting'
  battleTimer.value = 0
  battleLogs.value = []
  showResult.value = false
  battleRewards.value = []
  
  emit('battle-start', { player: props.player, enemy: enemy.value })
  
  // 启动战斗计时器
  timerInterval = setInterval(() => {
    battleTimer.value++
  }, 1000)
  
  // 模拟战斗过程
  let playerHp = props.player.hp
  let enemyHp = enemy.value.maxHp
  
  battleInterval = setInterval(() => {
    // 玩家攻击
    const playerDamage = Math.max(1, props.player.attack - enemy.value.defense)
    enemyHp -= playerDamage
    enemy.value.hpPercent = Math.max(0, (enemyHp / enemy.value.maxHp) * 100)
    
    battleLogs.value.push({
      time: battleTimer.value + 's',
      content: `你对${enemy.value.name}造成 ${playerDamage} 点伤害`,
      type: 'damage'
    })
    
    // 检查是否击败敌人
    if (enemyHp <= 0) {
      endBattle(true)
      return
    }
    
    // 敌人攻击
    const enemyDamage = Math.max(1, enemy.value.attack - props.player.defense)
    playerHp -= enemyDamage
    
    battleLogs.value.push({
      time: battleTimer.value + 's',
      content: `${enemy.value.name}对你造成 ${enemyDamage} 点伤害`,
      type: 'hurt'
    })
    
    // 检查是否被击败
    if (playerHp <= 0) {
      endBattle(false)
      return
    }
    
    // 限制日志数量
    if (battleLogs.value.length > 20) {
      battleLogs.value = battleLogs.value.slice(-15)
    }
  }, 1500)
}

const endBattle = (win) => {
  clearInterval(timerInterval)
  clearInterval(battleInterval)
  
  if (win) {
    battleLogs.value.push({
      time: battleTimer.value + 's',
      content: `🎉 你击败了${enemy.value.name}！`,
      type: 'win'
    })
    
    // 计算奖励
    const expGain = enemy.value.level * 100
    const stoneGain = enemy.value.level * 50
    
    battleRewards.value = [
      { icon: '✨', name: '经验', value: expGain, type: 'exp' },
      { icon: '💰', name: '灵石', value: stoneGain, type: 'stones' }
    ]
    
    // 排名提升
    rankChange.value = Math.floor(Math.random() * 5) + 1
    currentRank.value = Math.max(1, currentRank.value - rankChange.value)
  } else {
    battleLogs.value.push({
      time: battleTimer.value + 's',
      content: `💀 你被${enemy.value.name}击败了...`,
      type: 'defeat'
    })
    
    // 排名下降
    rankChange.value = -Math.floor(Math.random() * 3) - 1
    currentRank.value += Math.abs(rankChange.value)
  }
  
  showResult.value = true
  battleState.value = 'ended'
  
  emit('battle-end', { win, rewards: battleRewards.value })
  
  // 3秒后重置
  setTimeout(() => {
    battleState.value = 'idle'
    selectedOpponent.value = null
    showResult.value = false
  }, 5000)
}

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
  if (battleInterval) clearInterval(battleInterval)
})

defineExpose({
  battleState,
  startBattle,
  matchOpponent
})
</script>

<style scoped>
.pvp-panel {
  background: linear-gradient(180deg, rgba(18, 18, 32, 0.98), rgba(10, 10, 18, 0.98));
  border: 1px solid rgba(184, 134, 11, 0.25);
  border-radius: 16px;
  padding: 20px;
  color: #e8e8f0;
}

/* 顶部状态栏 */
.pvp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(184, 134, 11, 0.2);
}

.pvp-title {
  font-size: 20px;
  font-weight: bold;
  color: #ffd700;
  display: flex;
  align-items: center;
  gap: 8px;
}

.pvp-icon {
  font-size: 24px;
}

.pvp-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: statusPulse 2s infinite;
}

.status-idle { background: rgba(128, 128, 128, 0.2); color: #888; }
.status-idle .status-dot { background: #888; }

.status-matching { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
.status-matching .status-dot { background: #fbbf24; animation: blink 1s infinite; }

.status-ready { background: rgba(16, 185, 129, 0.2); color: #10b981; }
.status-ready .status-dot { background: #10b981; }

.status-fighting { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
.status-fighting .status-dot { background: #ef4444; animation: blink 0.5s infinite; }

.status-ended { background: rgba(139, 92, 246, 0.2); color: #8b5cf6; }
.status-ended .status-dot { background: #8b5cf6; }

@keyframes statusPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* 对战双方 */
.battle-arena {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 20px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
}

.combatant {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.combatant-avatar {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.3), rgba(118, 75, 162, 0.3));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  position: relative;
  border: 2px solid rgba(102, 126, 234, 0.5);
}

.combatant-avatar.enemy {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(220, 38, 38, 0.3));
  border-color: rgba(239, 68, 68, 0.5);
}

.level-badge {
  position: absolute;
  bottom: -5px;
  right: -5px;
  background: linear-gradient(135deg, #ffd700, #b8860b);
  color: #000;
  font-size: 10px;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 10px;
}

.combatant-info {
  text-align: center;
  width: 100%;
}

.combatant-name {
  font-size: 16px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 2px;
}

.combatant-realm {
  font-size: 12px;
  color: #4ecdc4;
  margin-bottom: 8px;
}

.hp-bar {
  height: 20px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 10px;
  overflow: hidden;
  position: relative;
}

.hp-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #34d399);
  border-radius: 10px;
  transition: width 0.3s ease;
}

.hp-fill.enemy {
  background: linear-gradient(90deg, #ef4444, #f87171);
}

.hp-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 10px;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}

.combatant-stats {
  display: flex;
  gap: 15px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #888;
}

.stat-icon {
  font-size: 14px;
}

.stat-value {
  color: #ffd700;
  font-weight: bold;
}

.vs-divider {
  width: 60px;
  text-align: center;
}

.vs-text {
  font-size: 28px;
  font-weight: bold;
  color: #ffd700;
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
}

/* 战斗操作 */
.battle-actions {
  text-align: center;
  margin-bottom: 20px;
}

.btn-attack {
  padding: 15px 40px;
  font-size: 18px;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-attack:hover {
  transform: scale(1.05);
  box-shadow: 0 8px 25px rgba(239, 68, 68, 0.5);
}

/* 战斗进行中 */
.battle-progress {
  margin-bottom: 20px;
}

.battle-timer {
  text-align: center;
  margin-bottom: 15px;
}

.timer-label {
  display: block;
  font-size: 14px;
  color: #888;
  margin-bottom: 5px;
}

.timer-value {
  font-size: 36px;
  font-weight: bold;
  color: #ef4444;
  text-shadow: 0 0 20px rgba(239, 68, 68, 0.5);
}

.battle-log-container {
  max-height: 150px;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 15px;
}

.battle-log {
  font-size: 12px;
  padding: 5px 8px;
  border-radius: 4px;
  margin-bottom: 4px;
  animation: logSlideIn 0.3s ease;
}

.battle-log.damage { color: #10b981; }
.battle-log.hurt { color: #ef4444; }
.battle-log.win { color: #ffd700; background: rgba(255, 215, 0, 0.1); }
.battle-log.defeat { color: #888; }

.log-time {
  color: #666;
  margin-right: 8px;
}

@keyframes logSlideIn {
  from { opacity: 0; transform: translateX(-10px); }
  to { opacity: 1; transform: translateX(0); }
}

/* 战斗结果 */
.battle-result {
  animation: resultPop 0.5s ease;
}

@keyframes resultPop {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}

.result-content {
  text-align: center;
  padding: 25px;
  border-radius: 12px;
}

.result-content.victory {
  background: linear-gradient(180deg, rgba(255, 215, 0, 0.15), rgba(16, 185, 129, 0.1));
  border: 2px solid rgba(255, 215, 0, 0.3);
}

.result-content.defeat {
  background: linear-gradient(180deg, rgba(239, 68, 68, 0.15), rgba(0, 0, 0, 0.1));
  border: 2px solid rgba(239, 68, 68, 0.3);
}

.result-icon {
  font-size: 64px;
  margin-bottom: 15px;
  animation: resultBounce 0.5s ease;
}

@keyframes resultBounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.result-title {
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 10px;
}

.victory .result-title { color: #ffd700; }
.defeat .result-title { color: #ef4444; }

.result-message {
  color: #aaa;
  font-size: 14px;
  margin-bottom: 20px;
}

.result-rewards {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 15px;
}

.rewards-title {
  color: #ffd700;
  font-size: 14px;
  margin-bottom: 10px;
}

.rewards-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reward-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.reward-icon {
  font-size: 18px;
}

.reward-name {
  flex: 1;
  color: #aaa;
}

.reward-value.exp { color: #f472b6; }
.reward-value.stones { color: #ffd700; }

/* 对手列表 */
.match-section {
  margin-bottom: 20px;
}

.match-header h3 {
  color: #ffd700;
  font-size: 16px;
  margin-bottom: 15px;
}

.opponent-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.opponent-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
}

.opponent-card:hover {
  border-color: rgba(255, 215, 0, 0.3);
  background: rgba(255, 215, 0, 0.05);
}

.opponent-card.selected {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.1);
  box-shadow: 0 0 15px rgba(255, 215, 0, 0.2);
}

.opponent-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.2));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.opponent-info {
  flex: 1;
}

.opponent-name {
  font-weight: bold;
  color: #fff;
}

.opponent-realm {
  font-size: 12px;
  color: #4ecdc4;
}

.opponent-power {
  font-size: 11px;
  color: #888;
}

.power-value {
  color: #ffd700;
  font-weight: bold;
}

.btn-sm {
  padding: 6px 14px;
  font-size: 12px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-sm:hover:not(:disabled) {
  transform: scale(1.05);
}

.btn-sm:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 排名信息 */
.pvp-ranking {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
}

.ranking-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ranking-value {
  font-size: 24px;
  font-weight: bold;
  color: #ffd700;
}

.ranking-change {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: bold;
}

.ranking-change.positive { color: #10b981; }
.ranking-change.negative { color: #ef4444; }
</style>
