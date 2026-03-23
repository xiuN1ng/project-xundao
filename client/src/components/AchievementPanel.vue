<template>
  <div class="panel achievement" style="background-image: url('/assets/bg-achievement-hall.png') !important; background-size: cover; background-position: center;">
    <div class="panel-header">
      <h2>成就系统</h2>
      <button class="btn-close" @click="$emit('close')">×</button>
    </div>
    
    <div class="achievement-stats">
      <div class="stat-item">
        <span class="stat-value">{{ stats.completed }}</span>
        <span class="stat-label">已完成</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ stats.claimed }}</span>
        <span class="stat-label">已领取</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ stats.total }}</span>
        <span class="stat-label">总成就</span>
      </div>
    </div>
    
    <div class="achievement-list">
      <div 
        v-for="ach in achievements" 
        :key="ach.id" 
        :class="['achievement-item', { completed: ach.completed, claimed: ach.claimed }]"
      >
        <div class="achievement-icon">{{ ach.icon }}</div>
        <div class="achievement-info">
          <div class="achievement-name">{{ ach.name }}</div>
          <div class="achievement-desc">{{ ach.desc }}</div>
          <div class="achievement-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: Math.min(100, (ach.progress / ach.target) * 100) + '%' }"></div>
            </div>
            <span>{{ ach.progress }}/{{ ach.target }}</span>
          </div>
        </div>
        <div class="achievement-action">
          <button 
            v-if="ach.completed && !ach.claimed" 
            class="btn-claim"
            @click="claimReward(ach.id)"
          >
            领取
          </button>
          <span v-else-if="ach.claimed" class="claimed">✓</span>
          <span v-else class="lock">🔒</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AchievementPanel',
  data() {
    return {
      achievements: [],
      stats: { completed: 0, claimed: 0, total: 0 }
    }
  },
  mounted() {
    this.loadAchievements()
  },
  methods: {
    async loadAchievements() {
      try {
        const res = await fetch('http://localhost:3001/api/achievement/1')
        const data = await res.json()
        this.achievements = data.achievements || []
        this.stats = data.stats
      } catch (e) {
        console.error('加载成就失败', e)
      }
    },
    async claimReward(achievementId) {
      try {
        const res = await fetch('http://localhost:3001/api/achievement/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 1, achievementId })
        })
        const data = await res.json()
        if (data.success) {
          alert('领取成功: ' + data.message)
          this.loadAchievements()
        }
      } catch (e) {
        console.error('领取奖励失败', e)
      }
    }
  }
}
</script>

<style scoped>
.panel {
  background: #1a1a2e;
  color: #fff;
  padding: 20px;
  height: 100%;
  overflow-y: auto;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.panel-header h2 {
  font-size: 24px;
  color: #ffd700;
}
.btn-close {
  background: none;
  border: none;
  color: #fff;
  font-size: 30px;
  cursor: pointer;
}
.achievement-stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 20px;
  padding: 15px;
  background: #16213e;
  border-radius: 8px;
}
.stat-item {
  text-align: center;
}
.stat-value {
  display: block;
  font-size: 24px;
  color: #ffd700;
  font-weight: bold;
}
.stat-label {
  font-size: 12px;
  color: #888;
}
.achievement-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.achievement-item {
  display: flex;
  align-items: center;
  gap: 15px;
  background: #16213e;
  padding: 15px;
  border-radius: 8px;
  opacity: 0.6;
}
.achievement-item.completed {
  opacity: 1;
  border: 1px solid #ffd700;
}
.achievement-item.claimed {
  opacity: 0.8;
}
.achievement-icon {
  font-size: 32px;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0f3460;
  border-radius: 8px;
}
.achievement-info {
  flex: 1;
}
.achievement-name {
  font-size: 16px;
  font-weight: bold;
  color: #ffd700;
}
.achievement-desc {
  font-size: 12px;
  color: #888;
  margin: 5px 0;
}
.achievement-progress {
  display: flex;
  align-items: center;
  gap: 10px;
}
.progress-bar {
  width: 100px;
  height: 6px;
  background: #0f3460;
  border-radius: 3px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: #00d4ff;
}
.achievement-action {
  width: 60px;
  text-align: center;
}
.btn-claim {
  padding: 8px 16px;
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  border: none;
  border-radius: 20px;
  color: #000;
  font-weight: bold;
  cursor: pointer;
}
.claimed {
  color: #00ff00;
  font-size: 20px;
}
.lock {
  font-size: 20px;
}
</style>
