<template>
  <div class="activity-panel">
    <div class="activity-header">
      <div class="activity-title">🎉 活动</div>
      <div class="activity-timer">
        <span class="timer-label">刷新倒计时:</span>
        <span class="timer-value">{{ formatTime(nextRefresh) }}</span>
      </div>
    </div>
    
    <!-- 活动分类 -->
    <div class="activity-tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.icon }} {{ tab.name }}
        <span class="badge" v-if="getCountByType(tab.id) > 0">{{ getCountByType(tab.id) }}</span>
      </button>
    </div>
    
    <!-- 活动列表 -->
    <div class="activity-list">
      <div 
        v-for="activity in filteredActivities" 
        :key="activity.id"
        class="activity-card"
        :class="{ 'is-limited': activity.type === 'limited', 'is-daily': activity.type === 'daily' }"
      >
        <div class="activity-banner" v-if="activity.banner">
          <img :src="activity.banner" :alt="activity.name">
          <div class="banner-overlay" v-if="activity.endTime">
            <span class="countdown">{{ getCountdown(activity.endTime) }}</span>
          </div>
        </div>
        
        <div class="activity-content">
          <div class="activity-header-row">
            <div class="activity-name">{{ activity.name }}</div>
            <span class="activity-tag" :class="activity.type">
              {{ getTypeLabel(activity.type) }}
            </span>
          </div>
          
          <div class="activity-desc">{{ activity.description }}</div>
          
          <div class="activity-progress" v-if="activity.progress">
            <div class="progress-info">
              <span>进度: {{ activity.progress.current }}/{{ activity.progress.max }}</span>
              <span class="progress-percent">{{ Math.round(activity.progress.current / activity.progress.max * 100) }}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: (activity.progress.current / activity.progress.max * 100) + '%' }"></div>
            </div>
          </div>
          
          <div class="activity-actions">
            <button 
              class="action-btn"
              :class="{ 'claim-btn': activity.canClaim, 'disabled': !activity.canClaim }"
              @click="claimReward(activity)"
              :disabled="!activity.canClaim"
            >
              {{ activity.canClaim ? '🎁 领取奖励' : '⏳ 进行中' }}
            </button>
            
            <button 
              class="action-btn go-btn"
              @click="goToActivity(activity)"
              v-if="activity.link"
            >
              前往 ▶
            </button>
          </div>
          
          <div class="activity-rewards" v-if="activity.rewards && activity.rewards.length">
            <span class="rewards-label">奖励:</span>
            <div class="rewards-list">
              <span v-for="(reward, idx) in activity.rewards" :key="idx" class="reward-item">
                {{ reward.icon }} {{ reward.name }}x{{ reward.amount }}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 空状态 -->
      <div class="empty-state" v-if="filteredActivities.length === 0">
        <span class="empty-icon">📭</span>
        <p>暂无活动</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ActivityPanel',
  data() {
    return {
      activeTab: 'all',
      nextRefresh: 3600 * 12, // 12小时后刷新
      tabs: [
        { id: 'all', name: '全部', icon: '📋' },
        { id: 'limited', name: '限时', icon: '⏰' },
        { id: 'daily', name: '日常', icon: '📅' },
        { id: 'special', name: 'special', icon: '⭐' }
      ],
      activities: [
        {
          id: 1,
          name: '首充特惠',
          description: '首次充值任意金额即可获得超值大礼包',
          type: 'limited',
          endTime: Date.now() + 86400000 * 2, // 2天后
          canClaim: true,
          progress: null,
          rewards: [
            { icon: '💰', name: '灵石', amount: 10000 },
            { icon: '💎', name: '元宝', amount: 500 },
            { icon: '🎁', name: 'VIP礼包', amount: 1 }
          ],
          banner: null,
          link: 'payment'
        },
        {
          id: 2,
          name: '每日签到',
          description: '连续签到7天领取海量奖励',
          type: 'daily',
          endTime: null,
          canClaim: true,
          progress: { current: 5, max: 7 },
          rewards: [
            { icon: '💰', name: '灵石', amount: 1000 },
            { icon: '🎁', name: '签到礼包', amount: 1 }
          ],
          banner: null,
          link: 'sign'
        },
        {
          id: 3,
          name: '世界BOSS挑战',
          description: '全服玩家共同讨伐世界BOSS',
          type: 'limited',
          endTime: Date.now() + 3600000 * 3, // 3小时后
          canClaim: false,
          progress: { current: 7500000, max: 10000000 },
          rewards: [
            { icon: '💰', name: '灵石', amount: 50000 },
            { icon: '🎁', name: 'BOSS宝箱', amount: 3 }
          ],
          banner: null,
          link: 'worldboss'
        },
        {
          id: 4,
          name: '宗门任务',
          description: '完成宗门发布的任务获得贡献值',
          type: 'daily',
          endTime: null,
          canClaim: false,
          progress: { current: 3, max: 5 },
          rewards: [
            { icon: '🏛️', name: '宗门贡献', amount: 500 }
          ],
          banner: null,
          link: 'faction'
        },
        {
          id: 5,
          name: '天梯挑战',
          description: '段位赛赛季火热进行中',
          type: 'special',
          endTime: Date.now() + 86400000 * 5, // 5天后
          canClaim: false,
          progress: null,
          rewards: [
            { icon: '🏆', name: '赛季奖励', amount: 1 }
          ],
          banner: null,
          link: 'ladder'
        },
        {
          id: 6,
          name: '灵石副本',
          description: '挑战灵石副本获得大量灵石',
          type: 'daily',
          endTime: null,
          canClaim: true,
          progress: { current: 0, max: 3 },
          rewards: [
            { icon: '💰', name: '灵石', amount: 10000 }
          ],
          banner: null,
          link: 'dungeon'
        },
        {
          id: 7,
          name: '炼丹大赛',
          description: '限时活动：炼丹获得双倍奖励',
          type: 'limited',
          endTime: Date.now() + 86400000, // 1天后
          canClaim: false,
          progress: null,
          rewards: [
            { icon: '⚗️', name: '丹药', amount: 10 }
          ],
          banner: null,
          link: 'alchemy'
        }
      ],
      timer: null
    };
  },
  computed: {
    filteredActivities() {
      if (this.activeTab === 'all') {
        return this.activities;
      }
      return this.activities.filter(a => a.type === this.activeTab);
    }
  },
  mounted() {
    this.startTimer();
  },
  beforeUnmount() {
    this.stopTimer();
  },
  methods: {
    getCountByType(type) {
      if (type === 'all') return this.activities.filter(a => a.canClaim).length;
      return this.activities.filter(a => a.type === type && a.canClaim).length;
    },
    getTypeLabel(type) {
      const labels = {
        limited: '限时',
        daily: '日常',
        special: 'special'
      };
      return labels[type] || type;
    },
    getCountdown(endTime) {
      if (!endTime) return '';
      const diff = endTime - Date.now();
      if (diff <= 0) return '已结束';
      
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      
      if (hours > 24) {
        const days = Math.floor(hours / 24);
        return `${days}天`;
      }
      return `${hours}小时${minutes}分`;
    },
    formatTime(seconds) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      return `${h}:${m.toString().padStart(2, '0')}`;
    },
    startTimer() {
      this.timer = setInterval(() => {
        if (this.nextRefresh > 0) {
          this.nextRefresh--;
        } else {
          this.nextRefresh = 3600 * 12;
        }
      }, 1000);
    },
    stopTimer() {
      if (this.timer) {
        clearInterval(this.timer);
      }
    },
    claimReward(activity) {
      if (activity.canClaim) {
        activity.canClaim = false;
        // 触发奖励领取逻辑
        console.log('Claimed reward for:', activity.name);
      }
    },
    goToActivity(activity) {
      console.log('Go to activity:', activity.link);
    }
  }
};
</script>

<style scoped>
.activity-panel {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 12px;
  padding: 20px;
  color: #fff;
  max-height: 80vh;
  overflow-y: auto;
}

.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.activity-title {
  font-size: 24px;
  font-weight: bold;
}

.activity-timer {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.timer-label {
  color: #aaa;
}

.timer-value {
  color: #ffd700;
  font-weight: bold;
}

.activity-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.tab-btn {
  position: relative;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s;
}

.tab-btn.active {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
  border-color: transparent;
}

.badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #ff4757;
  color: #fff;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid transparent;
  transition: all 0.3s;
}

.activity-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.activity-card.is-limited {
  border-color: rgba(250, 112, 154, 0.3);
}

.activity-card.is-daily {
  border-color: rgba(254, 225, 64, 0.3);
}

.activity-banner {
  position: relative;
  height: 80px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.activity-banner img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.banner-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  padding: 8px 16px;
  text-align: right;
}

.countdown {
  color: #ffd700;
  font-size: 14px;
  font-weight: bold;
}

.activity-content {
  padding: 16px;
}

.activity-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.activity-name {
  font-size: 16px;
  font-weight: bold;
}

.activity-tag {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
}

.activity-tag.limited {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.activity-tag.daily {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
  color: #333;
}

.activity-desc {
  font-size: 12px;
  color: #aaa;
  margin-bottom: 12px;
}

.activity-progress {
  margin-bottom: 12px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-bottom: 4px;
}

.progress-percent {
  color: #ffd700;
}

.progress-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s;
}

.activity-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.action-btn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s;
}

.claim-btn {
  background: linear-gradient(135deg, #ffd700 0%, #ff9900 100%);
  color: #333;
  font-weight: bold;
}

.action-btn.disabled {
  background: rgba(255, 255, 255, 0.1);
  color: #aaa;
  cursor: not-allowed;
}

.go-btn {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  max-width: 80px;
}

.activity-rewards {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.rewards-label {
  font-size: 12px;
  color: #aaa;
}

.rewards-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.reward-item {
  font-size: 11px;
  padding: 4px 8px;
  background: rgba(255, 215, 0, 0.1);
  border-radius: 4px;
  color: #ffd700;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #aaa;
}

.empty-icon {
  font-size: 48px;
}
</style>
