<template>
  <div class="deity-panel">
    <h2>🎭 封神榜</h2>
    
    <!-- 榜单类型选择 -->
    <div class="list-types">
      <button 
        v-for="listType in listTypes" 
        :key="listType.type"
        class="type-btn"
        :class="{ active: activeType === listType.type }"
        @click="selectType(listType.type)"
      >
        <span class="type-icon">{{ listType.icon }}</span>
        <span class="type-name">{{ listType.name }}</span>
      </button>
    </div>
    
    <!-- 玩家排名 -->
    <div class="player-rank-card" v-if="playerRank">
      <div class="rank-icon">🏅</div>
      <div class="rank-info">
        <div class="rank-label">我的排名</div>
        <div class="rank-number">第 {{ playerRank.rank }} 名</div>
        <div class="rank-value">{{ playerRank.value }}</div>
      </div>
    </div>
    
    <!-- 最佳排名 -->
    <div class="best-rank-card" v-if="bestRank">
      <div class="best-title">📊 全榜最佳</div>
      <div class="best-list">
        <div class="best-item" v-for="(rank, type) in bestRank.rankings" :key="type">
          <span class="list-icon">{{ getTypeIcon(type) }}</span>
          <span class="list-name">{{ getTypeName(type) }}</span>
          <span class="list-rank">#{{ rank }}</span>
        </div>
      </div>
      <div class="best-overall">
        最高: {{ bestRank.best_list_name }} 第{{ bestRank.best_rank }}名
      </div>
    </div>
    
    <!-- 挑战按钮 -->
    <div class="challenge-section" v-if="canChallenge">
      <button class="challenge-btn" @click="showChallengeList = true">
        ⚔️ 挑战上榜玩家
      </button>
    </div>
    
    <!-- 挑战列表弹窗 -->
    <div v-if="showChallengeList" class="challenge-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>⚔️ 挑战对手</h3>
          <button class="close-btn" @click="showChallengeList = false">×</button>
        </div>
        
        <div class="challenge-list">
          <div 
            v-for="target in challengeTargets" 
            :key="target.player_id"
            class="challenge-item"
            @click="challengePlayer(target)"
          >
            <div class="target-rank">#{{ target.rank }}</div>
            <div class="target-info">
              <span class="target-name">{{ target.username }}</span>
              <span class="target-value">{{ target.value }}</span>
            </div>
            <button class="fight-btn">挑战</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 挑战结果弹窗 -->
    <div v-if="showResult" class="result-modal">
      <div class="result-content" :class="challengeResult.challenger_wins ? 'win' : 'lose'">
        <div class="result-icon">
          {{ challengeResult.challenger_wins ? '🎉' : '😢' }}
        </div>
        <h3>{{ challengeResult.challenger_wins ? '挑战成功!' : '挑战失败' }}</h3>
        
        <div class="result-stats">
          <div class="stat-row">
            <span>你的战力:</span>
            <span>{{ challengeResult.challenger_power }}</span>
          </div>
          <div class="stat-row">
            <span>对手战力:</span>
            <span>{{ challengeResult.target_power }}</span>
          </div>
        </div>
        
        <div v-if="challengeResult.reward" class="reward-section">
          <div class="reward-label">获得奖励</div>
          <div class="reward-value">
            💎 +{{ challengeResult.reward.spirit_stones }}
          </div>
        </div>
        
        <p class="result-message">{{ challengeResult.message }}</p>
        
        <button class="confirm-btn" @click="showResult = false">确定</button>
      </div>
    </div>
    
    <!-- 排行榜列表 -->
    <div class="rankings-section">
      <h3>{{ getTypeName(activeType) }} 📊</h3>
      <div class="rankings-list">
        <div 
          v-for="player in rankings" 
          :key="player.player_id"
          class="ranking-item"
          :class="{ 'top-10': player.rank <= 10 }"
        >
          <div class="rank-number">
            <span v-if="player.rank === 1" class="medal gold">👑</span>
            <span v-else-if="player.rank === 2" class="medal">🥈</span>
            <span v-else-if="player.rank === 3" class="medal">🥉</span>
            <span v-else>{{ player.rank }}</span>
          </div>
          <div class="player-info">
            <span class="player-name">{{ player.username }}</span>
            <span class="player-level">Lv.{{ player.level }} · 境界{{ player.realm }}</span>
          </div>
          <div class="player-value">
            <span class="value-icon">{{ getTypeIcon(activeType) }}</span>
            <span class="value-num">{{ formatValue(player.value) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { usePlayerStore } from '../stores/player'

const playerStore = usePlayerStore()
const player = playerStore.player

const listTypes = ref([])
const activeType = ref('combat_power')
const rankings = ref([])
const playerRank = ref(null)
const bestRank = ref(null)
const canChallenge = ref(true)
const showChallengeList = ref(false)
const showResult = ref(false)
const challengeTargets = ref([])
const challengeResult = ref({})

// 加载榜单类型
async function loadListTypes() {
  try {
    const res = await fetch('/api/deity-list/types')
    const data = await res.json()
    if (data.success) {
      listTypes.value = data.data
      if (listTypes.value.length > 0) {
        activeType.value = listTypes.value[0].type
      }
    }
  } catch (e) {
    listTypes.value = [
      { type: 'combat_power', name: '战力榜', icon: '⚔️' },
      { type: 'realm', name: '境界榜', icon: '⬆️' },
      { type: 'wealth', name: '富豪榜', icon: '💎' }
    ]
  }
}

// 选择榜单类型
function selectType(type) {
  activeType.value = type
  loadRankings()
  loadPlayerRank()
}

// 加载排行榜
async function loadRankings() {
  try {
    const res = await fetch(`/api/deity-list/ranking?type=${activeType.value}&limit=50`)
    const data = await res.json()
    if (data.success) {
      rankings.value = data.data
    }
  } catch (e) {
    rankings.value = []
  }
}

// 加载玩家排名
async function loadPlayerRank() {
  try {
    const res = await fetch(`/api/deity-list/player-rank?player_id=${player.id}&type=${activeType.value}`)
    const data = await res.json()
    if (data.success) {
      playerRank.value = data.data
    }
  } catch (e) {
    playerRank.value = { rank: '--', value: 0 }
  }
}

// 加载最佳排名
async function loadBestRank() {
  try {
    const res = await fetch(`/api/deity-list/best-rank?player_id=${player.id}`)
    const data = await res.json()
    if (data.success) {
      bestRank.value = data.data
    }
  } catch (e) {
    bestRank.value = null
  }
}

// 打开挑战列表
function openChallengeList() {
  challengeTargets.value = rankings.value.slice(0, 10)
  showChallengeList.value = true
}

// 挑战玩家
async function challengePlayer(target) {
  showChallengeList.value = false
  
  try {
    const res = await fetch('/api/deity-list/challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        challenger_id: player.id,
        target_id: target.player_id,
        type: activeType.value
      })
    })
    const data = await res.json()
    
    if (data.success) {
      challengeResult.value = data.data
      showResult.value = true
      
      // 刷新数据
      loadRankings()
      loadPlayerRank()
    }
  } catch (e) {
    console.error('挑战失败:', e)
  }
}

// 获取榜单图标
function getTypeIcon(type) {
  const icons = {
    combat_power: '⚔️',
    realm: '⬆️',
    wealth: '💎',
    arena: '🏆'
  }
  return icons[type] || '📊'
}

// 获取榜单名称
function getTypeName(type) {
  const names = {
    combat_power: '战力榜',
    realm: '境界榜',
    wealth: '富豪榜',
    arena: '竞技榜'
  }
  return names[type] || '榜单'
}

// 格式化数值
function formatValue(value) {
  if (value >= 10000) {
    return (value / 10000).toFixed(1) + 'w'
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'k'
  }
  return value
}

onMounted(() => {
  loadListTypes()
  loadRankings()
  loadPlayerRank()
  loadBestRank()
})
</script>

<style scoped>
.deity-panel {
  padding: 20px;
  background: #1a1a2e;
  border-radius: 12px;
}

.deity-panel h2 {
  color: #f093fb;
  font-size: 24px;
  margin-bottom: 20px;
}

.deity-panel h3 {
  color: #667eea;
  font-size: 16px;
  margin: 20px 0 15px;
}

/* 榜单类型 */
.list-types {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.type-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(102, 126, 234, 0.3);
  border-radius: 25px;
  color: #fff;
  cursor: pointer;
  transition: all 0.3s;
}

.type-btn:hover {
  background: rgba(102, 126, 234, 0.2);
}

.type-btn.active {
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-color: transparent;
}

.type-icon {
  font-size: 18px;
}

/* 玩家排名卡片 */
.player-rank-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.1));
  border-radius: 16px;
  margin-bottom: 20px;
  border: 1px solid rgba(251, 191, 36, 0.3);
}

.rank-icon {
  font-size: 48px;
}

.rank-label {
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}

.rank-number {
  color: #fbbf24;
  font-size: 28px;
  font-weight: bold;
}

.rank-value {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}

/* 最佳排名 */
.best-rank-card {
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  margin-bottom: 20px;
}

.best-title {
  color: #667eea;
  font-weight: bold;
  margin-bottom: 15px;
}

.best-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.best-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}

.list-icon {
  font-size: 16px;
}

.list-name {
  flex: 1;
  color: rgba(255, 255, 255, 0.7);
}

.list-rank {
  color: #fbbf24;
  font-weight: bold;
}

.best-overall {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  color: #4ade80;
  font-weight: bold;
}

/* 挑战按钮 */
.challenge-section {
  margin-bottom: 20px;
}

.challenge-btn {
  width: 100%;
  padding: 15px;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
}

/* 挑战弹窗 */
.challenge-modal, .result-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: linear-gradient(180deg, #2d1b4e 0%, #1a1a2e 100%);
  padding: 20px;
  border-radius: 20px;
  width: 90%;
  max-height: 80%;
  overflow-y: auto;
  border: 1px solid rgba(102, 126, 234, 0.5);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-header h3 {
  color: #f093fb;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: #fff;
  font-size: 24px;
  cursor: pointer;
}

.challenge-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.challenge-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
}

.target-rank {
  width: 40px;
  font-weight: bold;
  color: #fbbf24;
}

.target-info {
  flex: 1;
}

.target-name {
  display: block;
  color: #fff;
  font-weight: bold;
}

.target-value {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.fight-btn {
  padding: 8px 15px;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  border: none;
  border-radius: 20px;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
}

/* 结果弹窗 */
.result-content {
  background: linear-gradient(180deg, #2d1b4e 0%, #1a1a2e 100%);
  padding: 40px;
  border-radius: 20px;
  text-align: center;
  border: 2px solid rgba(102, 126, 234, 0.5);
  max-width: 400px;
}

.result-content.win {
  border-color: rgba(74, 222, 128, 0.5);
}

.result-content.lose {
  border-color: rgba(239, 68, 68, 0.5);
}

.result-icon {
  font-size: 64px;
}

.result-content h3 {
  font-size: 28px;
  margin: 15px 0;
}

.result-content.win h3 { color: #4ade80; }
.result-content.lose h3 { color: #ef4444; }

.result-stats {
  background: rgba(0, 0, 0, 0.3);
  padding: 15px;
  border-radius: 12px;
  margin: 20px 0;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
}

.reward-section {
  margin: 20px 0;
  padding: 15px;
  background: rgba(74, 222, 128, 0.1);
  border-radius: 12px;
}

.reward-label {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}

.reward-value {
  color: #4ade80;
  font-size: 24px;
  font-weight: bold;
}

.result-message {
  color: rgba(255, 255, 255, 0.7);
  margin: 20px 0;
}

.confirm-btn {
  padding: 12px 40px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  border-radius: 25px;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
}

/* 排行榜 */
.rankings-section {
  margin-top: 20px;
}

.rankings-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
}

.ranking-item.top-10 {
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.2);
}

.rank-number {
  width: 40px;
  text-align: center;
  font-weight: bold;
  color: rgba(255, 255, 255, 0.6);
}

.medal {
  font-size: 24px;
}

.player-info {
  flex: 1;
}

.player-name {
  display: block;
  color: #fff;
  font-weight: bold;
}

.player-level {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.player-value {
  display: flex;
  align-items: center;
  gap: 8px;
}

.value-icon {
  font-size: 18px;
}

.value-num {
  color: #f093fb;
  font-weight: bold;
}
</style>
