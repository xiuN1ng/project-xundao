<template>
  <div class="ladder-season-panel">
    <div class="panel-header">
      <h3>🏆 天梯赛季</h3>
      <button class="close-btn" @click="closePanel">×</button>
    </div>
    
    <div class="panel-content">
      <!-- 赛季信息 -->
      <div class="season-banner" v-if="seasonInfo">
        <div class="season-title">
          <span class="season-name">{{ seasonInfo.seasonName }}</span>
          <span class="season-days">{{ seasonInfo.daysLeft }}天</span>
        </div>
        <div class="season-timer">
          <span>结束: {{ formatDate(seasonInfo.endTime) }}</span>
        </div>
        <div class="season-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: (100 - seasonInfo.daysLeft / 14 * 100) + '%' }"></div>
          </div>
        </div>
      </div>
      
      <!-- 段位展示 -->
      <div class="rank-section" v-if="playerRank">
        <div class="my-rank-card">
          <div class="rank-icon" :style="{ background: rankBgColor }">
            <span>{{ rankIcon }}</span>
          </div>
          <div class="rank-info">
            <div class="rank-name">{{ rankName }}</div>
            <div class="rank-stars">
              <span v-for="i in 5" :key="i" :class="{ filled: i <= stars }">★</span>
            </div>
            <div class="rank-points">{{ playerRank.points || 0 }} 分</div>
          </div>
          <div class="rank-detail">
            <div class="detail-item">
              <span class="label">胜场</span>
              <span class="value win">{{ playerRank.wins || 0 }}</span>
            </div>
            <div class="detail-item">
              <span class="label">负场</span>
              <span class="value lose">{{ playerRank.losses || 0 }}</span>
            </div>
            <div class="detail-item">
              <span class="label">胜率</span>
              <span class="value">{{ winRate }}%</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 排行榜 -->
      <div class="rankings-section">
        <h4>排行榜</h4>
        <div class="rankings-list">
          <div 
            v-for="(player, idx) in rankings" 
            :key="player.id" 
            class="ranking-item"
            :class="{ 'top-three': idx < 3, 'me': player.id === currentPlayerId }"
          >
            <div class="rank-position">
              <span v-if="idx === 0" class="gold">🥇</span>
              <span v-else-if="idx === 1" class="silver">🥈</span>
              <span v-else-if="idx === 2" class="bronze">🥉</span>
              <span v-else class="position">{{ idx + 1 }}</span>
            </div>
            <div class="player-info">
              <span class="player-name">{{ player.name }}</span>
              <span class="player-realm">{{ player.rankName || '青铜' }}</span>
            </div>
            <div class="player-points">{{ player.points || 0 }}分</div>
          </div>
        </div>
      </div>
      
      <!-- 赛季奖励 -->
      <div class="rewards-section">
        <h4>赛季奖励预览</h4>
        <div class="rewards-list">
          <div v-for="reward in seasonRewards" :key="reward.rank" class="reward-item">
            <div class="reward-rank">{{ reward.rank }}</div>
            <div class="reward-info">
              <span class="reward-icon">{{ reward.icon }}</span>
              <span class="reward-name">{{ reward.name }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 领取奖励按钮 -->
      <div class="reward-claim" v-if="canClaimReward">
        <button class="claim-btn" @click="claimReward">
          领取赛季奖励 💰
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

const emit = defineEmits(['close']);

const seasonInfo = ref(null);
const playerRank = ref(null);
const rankings = ref([]);
const currentPlayerId = 1;

// 段位配置 (王者荣耀风格)
const rankConfig = [
  { name: '青铜', icon: '🥉', bg: '#8B4513', min: 0, max: 999 },
  { name: '白银', icon: '🤍', bg: '#C0C0C0', min: 1000, max: 1999 },
  { name: '黄金', icon: '🥇', bg: '#FFD700', min: 2000, max: 2999 },
  { name: '铂金', icon: '💎', bg: '#E5E4E2', min: 3000, max: 3999 },
  { name: '钻石', icon: '💠', bg: '#B9F2FF', min: 4000, max: 4999 },
  { name: '星耀', icon: '⭐', bg: '#9370DB', min: 5000, max: 5999 },
  { name: '王者', icon: '👑', bg: '#FF6B6B', min: 6000, max: 6999 },
  { name: '荣耀王者', icon: '🌟', bg: '#FF4500', min: 7000, max: 7999 },
  { name: '巅峰王者', icon: '🔥', bg: '#DC143C', min: 8000, max: 9999 },
];

const seasonRewards = [
  { rank: '前10', icon: '🏆', name: '冠军宝箱' },
  { rank: '前100', icon: '💰', name: '赛季限定头像框' },
  { rank: '前1000', icon: '🎁', name: '稀有称号' },
  { rank: '参与者', icon: '📦', name: '参与奖励' },
];

const rankName = computed(() => {
  const points = playerRank.value?.points || 0;
  const rank = rankConfig.find(r => points >= r.min && points <= r.max);
  return rank?.name || '青铜';
});

const rankIcon = computed(() => {
  const points = playerRank.value?.points || 0;
  const rank = rankConfig.find(r => points >= r.min && points <= r.max);
  return rank?.icon || '🥉';
});

const rankBgColor = computed(() => {
  const points = playerRank.value?.points || 0;
  const rank = rankConfig.find(r => points >= r.min && points <= r.max);
  return rank?.bg || '#8B4513';
});

const stars = computed(() => {
  const points = playerRank.value?.points || 0;
  return Math.min(5, Math.floor((points % 1000) / 200));
});

const winRate = computed(() => {
  const wins = playerRank.value?.wins || 0;
  const losses = playerRank.value?.losses || 0;
  const total = wins + losses;
  return total > 0 ? Math.round(wins / total * 100) : 0;
});

const canClaimReward = computed(() => {
  return seasonInfo.value && playerRank.value && playerRank.value.points > 0;
});

const loadSeasonInfo = async () => {
  try {
    const response = await fetch('/api/ladder-season/info?userId=1');
    const data = await response.json();
    if (data.success) {
      seasonInfo.value = data.data;
    }
  } catch (error) {
    console.error('加载赛季信息失败:', error);
  }
};

const loadRankings = async () => {
  try {
    const response = await fetch('/api/ladder-season/rankings?userId=1&limit=20');
    const data = await response.json();
    if (data.success) {
      rankings.value = data.data || [];
    }
  } catch (error) {
    console.error('加载排行榜失败:', error);
  }
};

const loadPlayerRank = async () => {
  try {
    const response = await fetch('/api/ladder-season/player?userId=1');
    const data = await response.json();
    if (data.success) {
      playerRank.value = data.data;
    }
  } catch (error) {
    console.error('加载玩家段位失败:', error);
  }
};

const claimReward = async () => {
  try {
    const response = await fetch('/api/ladder-season/reward', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentPlayerId })
    });
    const data = await response.json();
    if (data.success) {
      alert('奖励领取成功！');
    } else {
      alert(data.error || '领取失败');
    }
  } catch (error) {
    console.error('领取奖励失败:', error);
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const closePanel = () => {
  emit('close');
};

onMounted(() => {
  loadSeasonInfo();
  loadRankings();
  loadPlayerRank();
});
</script>

<style scoped>
.ladder-season-panel {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 12px;
  padding: 16px;
  color: #fff;
  max-width: 500px;
  margin: 0 auto;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-header h3 {
  margin: 0;
  font-size: 18px;
  color: #ffd700;
}

.close-btn {
  background: none;
  border: none;
  color: #fff;
  font-size: 24px;
  cursor: pointer;
  padding: 0 8px;
}

.close-btn:hover {
  color: #ff6b6b;
}

.season-banner {
  background: linear-gradient(135deg, #2c1810 0%, #4a2c20 100%);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.season-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.season-name {
  font-size: 20px;
  font-weight: bold;
  color: #ffd700;
}

.season-days {
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
}

.season-timer {
  font-size: 12px;
  color: #aaa;
  margin-bottom: 8px;
}

.progress-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ffd700, #ff8c00);
  border-radius: 2px;
  transition: width 0.3s;
}

.my-rank-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.05);
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.rank-icon {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
}

.rank-info {
  flex: 1;
}

.rank-name {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 4px;
}

.rank-stars {
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}

.rank-stars .filled {
  color: #ffd700;
}

.rank-points {
  font-size: 12px;
  color: #aaa;
}

.rank-detail {
  display: flex;
  gap: 12px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.detail-item .label {
  font-size: 10px;
  color: #888;
}

.detail-item .value {
  font-size: 14px;
  font-weight: bold;
}

.detail-item .value.win {
  color: #4caf50;
}

.detail-item .value.lose {
  color: #ff6b6b;
}

.rankings-section,
.rewards-section {
  margin-bottom: 16px;
}

.rankings-section h4,
.rewards-section h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #ffd700;
}

.rankings-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 250px;
  overflow-y: auto;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 4px;
}

.ranking-item.top-three {
  background: rgba(255, 215, 0, 0.1);
}

.ranking-item.me {
  background: rgba(100, 181, 246, 0.2);
  border: 1px solid rgba(100, 181, 246, 0.5);
}

.rank-position {
  width: 32px;
  text-align: center;
}

.rank-position .gold { font-size: 20px; }
.rank-position .silver { font-size: 18px; }
.rank-position .bronze { font-size: 16px; }
.rank-position .position {
  font-size: 12px;
  color: #aaa;
}

.player-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.player-name {
  font-size: 13px;
}

.player-realm {
  font-size: 10px;
  color: #888;
}

.player-points {
  font-size: 12px;
  color: #ffd700;
}

.rewards-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.reward-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 4px;
}

.reward-rank {
  font-size: 12px;
  color: #ffd700;
  min-width: 50px;
}

.reward-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.reward-icon {
  font-size: 16px;
}

.reward-name {
  font-size: 12px;
}

.claim-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
  border: none;
  border-radius: 8px;
  color: #1a1a2e;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
}

.claim-btn:hover {
  opacity: 0.9;
}
</style>