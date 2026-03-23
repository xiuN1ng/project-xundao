<template>
  <div class="ladder-panel">
    <h2>🏆 天梯系统</h2>
    
    <!-- 赛季信息 -->
    <div class="season-info">
      <div class="season-badge">
        <span class="season-icon">🎖️</span>
        <span class="season-text">第{{ seasonInfo.season_num || 1 }}赛季</span>
      </div>
      <div class="season-time" v-if="seasonInfo.end_date">
        结束: {{ formatTime(seasonInfo.end_date) }}
      </div>
    </div>
    
    <!-- 玩家段位信息 -->
    <div class="player-rank-card">
      <div class="rank-icon">{{ playerRank.division_icon || '🥉' }}</div>
      <div class="rank-info">
        <div class="rank-name">{{ playerRank.division_name || '青铜' }}</div>
        <div class="rank-points">{{ playerRank.points || 0 }} 积分</div>
        <div class="rank-stats">
          <span class="win">胜 {{ playerRank.wins || 0 }}</span>
          <span class="lose">负 {{ playerRank.losses || 0 }}</span>
          <span class="streak" v-if="playerRank.current_streak > 0">连胜 {{ playerRank.current_streak }}</span>
        </div>
      </div>
      <button class="match-btn" @click="startMatch" :disabled="isMatching">
        {{ isMatching ? '匹配中...' : '开始匹配' }}
      </button>
    </div>
    
    <!-- 匹配弹窗 -->
    <div v-if="showMatchModal" class="match-modal">
      <div class="modal-content">
        <h3>🎮 匹配对手中...</h3>
        <div class="match-loading">
          <div class="loading-spinner"></div>
        </div>
        <p>正在寻找实力相当的对手...</p>
        <button class="cancel-btn" @click="cancelMatch">取消匹配</button>
      </div>
    </div>
    
    <!-- 战斗结果弹窗 -->
    <div v-if="showResultModal" class="result-modal">
      <div class="result-content" :class="battleResult.is_victory ? 'victory' : 'defeat'">
        <div class="result-icon">
          {{ battleResult.is_victory ? '🎉' : '😢' }}
        </div>
        <h3>{{ battleResult.is_victory ? '胜利!' : '失败' }}</h3>
        
        <div class="result-details">
          <div class="points-change">
            <span class="label">积分变化:</span>
            <span :class="battleResult.points_change > 0 ? 'positive' : 'negative'">
              {{ battleResult.points_change > 0 ? '+' : '' }}{{ battleResult.points_change }}
            </span>
          </div>
          <div class="new-points">
            当前积分: {{ battleResult.new_points }}
          </div>
          <div v-if="battleResult.division_changed" class="division-up">
            🎊 恭喜升级到 {{ battleResult.division_name }}!
          </div>
        </div>
        
        <button class="confirm-btn" @click="closeResult">确定</button>
      </div>
    </div>
    
    <!-- 排行榜 -->
    <div class="rankings-section">
      <h3>📊 天梯排行榜</h3>
      <div class="rankings-list">
        <div 
          v-for="player in rankings" 
          :key="player.player_id"
          class="ranking-item"
          :class="{ 'top-3': player.rank <= 3 }"
        >
          <div class="rank-number">
            <span v-if="player.rank === 1" class="medal gold">🥇</span>
            <span v-else-if="player.rank === 2" class="medal silver">🥈</span>
            <span v-else-if="player.rank === 3" class="medal bronze">🥉</span>
            <span v-else>{{ player.rank }}</span>
          </div>
          <div class="player-info">
            <span class="player-name">{{ player.username }}</span>
            <span class="player-level">Lv.{{ player.level }}</span>
          </div>
          <div class="player-division">
            <span class="division-icon">{{ player.division_icon }}</span>
            <span class="division-name">{{ player.division_name }}</span>
          </div>
          <div class="player-points">{{ player.points }}分</div>
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

const seasonInfo = ref({})
const playerRank = ref({})
const rankings = ref([])
const isMatching = ref(false)
const showMatchModal = ref(false)
const showResultModal = ref(false)
const battleResult = ref({})

// 加载赛季信息
async function loadSeason() {
  try {
    const res = await fetch('/api/ladder/season')
    const data = await res.json()
    if (data.success) {
      seasonInfo.value = data.data
    }
  } catch (e) {
    seasonInfo.value = { season_num: 1 }
  }
}

// 加载玩家段位
async function loadPlayerRank() {
  try {
    const res = await fetch(`/api/ladder/info?player_id=${player.id}`)
    const data = await res.json()
    if (data.success) {
      playerRank.value = data.data
    }
  } catch (e) {
    playerRank.value = { division: 0, division_name: '青铜', points: 0, wins: 0, losses: 0 }
  }
}

// 加载排行榜
async function loadRankings() {
  try {
    const res = await fetch('/api/ladder/rankings?limit=50')
    const data = await res.json()
    if (data.success) {
      rankings.value = data.data
    }
  } catch (e) {
    rankings.value = []
  }
}

// 开始匹配
async function startMatch() {
  isMatching.value = true
  showMatchModal.value = true
  
  try {
    const res = await fetch('/api/ladder/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: player.id })
    })
    const data = await res.json()
    
    if (data.success) {
      // 模拟战斗（实际应该由玩家操作）
      setTimeout(() => {
        finishMatch(data.data.opponent)
      }, 2000)
    }
  } catch (e) {
    isMatching.value = false
    showMatchModal.value = false
  }
}

// 取消匹配
function cancelMatch() {
  isMatching.value = false
  showMatchModal.value = false
}

// 模拟战斗完成
async function finishMatch(opponent) {
  // 简单模拟：50%胜率
  const win = Math.random() > 0.5
  const winnerId = win ? player.id : opponent.player_id
  
  try {
    const res = await fetch('/api/ladder/finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player_id: player.id,
        opponent_id: opponent.player_id || 0,
        winner_id: winnerId,
        is_ai: opponent.is_ai || false
      })
    })
    const data = await res.json()
    
    if (data.success) {
      battleResult.value = data.data
      showMatchModal.value = false
      showResultModal.value = true
      
      // 刷新数据
      loadPlayerRank()
      loadRankings()
    }
  } catch (e) {
    showMatchModal.value = false
  }
  
  isMatching.value = false
}

// 关闭结果弹窗
function closeResult() {
  showResultModal.value = false
}

// 格式化时间
function formatTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

onMounted(() => {
  loadSeason()
  loadPlayerRank()
  loadRankings()
})
</script>

<style scoped>
.ladder-panel {
  padding: 20px;
  background: #1a1a2e;
  border-radius: 12px;
}

.ladder-panel h2 {
  color: #f093fb;
  font-size: 24px;
  margin-bottom: 20px;
}

.ladder-panel h3 {
  color: #667eea;
  font-size: 16px;
  margin: 20px 0 15px;
}

/* 赛季信息 */
.season-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  margin-bottom: 20px;
}

.season-badge {
  display: flex;
  align-items: center;
  gap: 10px;
}

.season-icon {
  font-size: 24px;
}

.season-text {
  color: #fbbf24;
  font-weight: bold;
}

.season-time {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
}

/* 玩家段位卡片 */
.player-rank-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 25px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
  border-radius: 16px;
  margin-bottom: 25px;
  border: 1px solid rgba(102, 126, 234, 0.3);
}

.rank-icon {
  font-size: 64px;
}

.rank-info {
  flex: 1;
}

.rank-name {
  font-size: 28px;
  font-weight: bold;
  color: #fff;
}

.rank-points {
  color: #f093fb;
  font-size: 18px;
  margin: 5px 0;
}

.rank-stats {
  display: flex;
  gap: 15px;
  font-size: 13px;
}

.win { color: #4ade80; }
.lose { color: #ef4444; }
.streak { color: #fbbf24; }

.match-btn {
  padding: 15px 30px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  border-radius: 25px;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: transform 0.2s;
}

.match-btn:hover:not(:disabled) {
  transform: scale(1.05);
}

.match-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 匹配弹窗 */
.match-modal, .result-modal {
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

.modal-content, .result-content {
  background: linear-gradient(180deg, #2d1b4e 0%, #1a1a2e 100%);
  padding: 40px;
  border-radius: 20px;
  text-align: center;
  border: 2px solid rgba(102, 126, 234, 0.5);
}

.match-modal h3 {
  color: #f093fb;
  font-size: 24px;
  margin-bottom: 20px;
}

.match-loading {
  margin: 30px 0;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(102, 126, 234, 0.3);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.cancel-btn {
  padding: 10px 25px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;
  border-radius: 20px;
  cursor: pointer;
  margin-top: 20px;
}

/* 结果弹窗 */
.result-content.victory {
  border-color: rgba(74, 222, 128, 0.5);
}

.result-content.defeat {
  border-color: rgba(239, 68, 68, 0.5);
}

.result-icon {
  font-size: 64px;
  margin-bottom: 15px;
}

.result-content h3 {
  font-size: 32px;
  margin-bottom: 20px;
}

.result-content.victory h3 { color: #4ade80; }
.result-content.defeat h3 { color: #ef4444; }

.result-details {
  margin: 20px 0;
  padding: 20px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
}

.points-change {
  display: flex;
  justify-content: center;
  gap: 15px;
  font-size: 18px;
}

.points-change .positive { color: #4ade80; }
.points-change .negative { color: #ef4444; }

.new-points {
  color: rgba(255, 255, 255, 0.7);
  margin-top: 10px;
}

.division-up {
  margin-top: 15px;
  color: #fbbf24;
  font-size: 18px;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.confirm-btn {
  padding: 12px 40px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  border-radius: 25px;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  margin-top: 20px;
}

/* 排行榜 */
.rankings-section {
  margin-top: 30px;
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

.ranking-item.top-3 {
  background: rgba(102, 126, 234, 0.15);
  border: 1px solid rgba(102, 126, 234, 0.3);
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

.player-division {
  display: flex;
  align-items: center;
  gap: 8px;
}

.division-icon {
  font-size: 20px;
}

.division-name {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}

.player-points {
  color: #f093fb;
  font-weight: bold;
}
</style>
