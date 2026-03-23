<template>
  <div class="holiday-panel">
    <div class="holiday-header">
      <div class="holiday-title">🎊 活动日历</div>
      <div class="current-month">{{ currentMonth }}</div>
      <button class="close-btn" @click="$emit('close')">×</button>
    </div>
    
    <!-- 活动列表 -->
    <div class="activity-list">
      <div 
        v-for="activity in filteredActivities" 
        :key="activity.id"
        class="activity-card"
        :class="'status-' + activity.status"
        @click="selectActivity(activity)"
      >
        <!-- 活动状态标签 -->
        <div class="activity-status">
          <span class="status-badge" :class="activity.status">
            {{ getStatusLabel(activity.status) }}
          </span>
        </div>
        
        <!-- 活动信息 -->
        <div class="activity-info">
          <div class="activity-top">
            <span class="activity-icon">{{ activity.icon }}</span>
            <span class="activity-name">{{ activity.name }}</span>
          </div>
          
          <div class="activity-time">
            <span class="time-icon">🕐</span>
            <span class="time-range">{{ activity.startTime }} - {{ activity.endTime }}</span>
          </div>
          
          <!-- 倒计时显示 -->
          <div class="activity-countdown" v-if="activity.status === 'active'">
            <span class="countdown-icon">⏰</span>
            <span class="countdown-text">剩余: {{ formatCountdown(activity.endTimestamp - Date.now()) }}</span>
          </div>
          <div class="activity-countdown upcoming" v-else-if="activity.status === 'upcoming'">
            <span class="countdown-icon">📅</span>
            <span class="countdown-text">开始: {{ formatCountdown(activity.startTimestamp - Date.now()) }}</span>
          </div>
          
          <!-- 活动奖励预览 -->
          <div class="activity-rewards">
            <span class="rewards-label">奖励:</span>
            <div class="rewards-items">
              <span 
                v-for="(reward, idx) in activity.rewards.slice(0, 3)" 
                :key="idx"
                class="reward-tag"
                @click.stop="showRewardDetail(activity, reward)"
              >
                {{ reward.icon }} {{ reward.name }}
              </span>
              <span v-if="activity.rewards.length > 3" class="reward-more">
                +{{ activity.rewards.length - 3 }}更多
              </span>
            </div>
          </div>
        </div>
        
        <!-- 活动详情按钮 -->
        <button class="detail-btn" @click.stop="viewDetail(activity)">
          📖 详情
        </button>
      </div>
    </div>
    
    <!-- 奖励预览弹窗 -->
    <div class="modal-overlay" v-if="showRewardModal" @click="showRewardModal = false">
      <div class="reward-modal" @click.stop>
        <div class="modal-header">
          <span class="modal-title">🎁 奖励预览</span>
          <button class="modal-close" @click="showRewardModal = false">×</button>
        </div>
        <div class="modal-content" v-if="selectedActivity">
          <div class="activity-title">{{ selectedActivity.icon }} {{ selectedActivity.name }}</div>
          <div class="reward-list">
            <div v-for="(reward, idx) in selectedActivity.rewards" :key="idx" class="reward-item" :class="reward.rarity">
              <span class="reward-icon">{{ reward.icon }}</span>
              <div class="reward-details">
                <span class="reward-name">{{ reward.name }}</span>
                <span class="reward-desc">{{ reward.desc || '暂无描述' }}</span>
              </div>
              <span class="reward-rarity">{{ getRarityLabel(reward.rarity) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 月份筛选 -->
    <div class="month-selector">
      <button class="month-btn" @click="prevMonth">◀</button>
      <span class="month-display">{{ currentMonthFull }}</span>
      <button class="month-btn" @click="nextMonth">▶</button>
    </div>
  </div>
</template>

<script>
const { ref, computed, onMounted, onUnmounted } = Vue;

export default {
  name: 'HolidayCalendarPanel',
  emits: ['close', 'viewDetail'],
  setup(props, { emit }) {
    const currentMonth = ref('3月');
    const currentMonthFull = ref('2026年3月');
    const selectedActivity = ref(null);
    const showRewardModal = ref(false);
    const selectedReward = ref(null);
    
    // 活动模拟数据 - 带时间戳
    const activities = ref([
      {
        id: 1,
        name: '春节庆典',
        icon: '🧧',
        startTime: '01-01',
        endTime: '01-07',
        startTimestamp: 1735689600000,
        endTimestamp: 1736265600000,
        status: 'ended',
        rewards: [
          { icon: '💰', name: '灵石', desc: '基础货币', rarity: 'common', amount: 10000 },
          { icon: '🧧', name: '红包', desc: '随机红包奖励', rarity: 'rare', amount: 1 },
          { icon: '🎁', name: '福袋', desc: '随机道具', rarity: 'epic', amount: 3 }
        ]
      },
      {
        id: 2,
        name: '情人节活动',
        icon: '💕',
        startTime: '02-14',
        endTime: '02-20',
        startTimestamp: 1707840000000,
        endTimestamp: 1708358400000,
        status: 'ended',
        rewards: [
          { icon: '💎', name: '元宝', desc: 'VIP货币', rarity: 'rare', amount: 500 },
          { icon: '🌹', name: '玫瑰', desc: '用于求婚', rarity: 'common', amount: 99 }
        ]
      },
      {
        id: 3,
        name: '元宵节灯会',
        icon: '🏮',
        startTime: '03-05',
        endTime: '03-10',
        startTimestamp: 1739616000000,
        endTimestamp: 1740009600000,
        status: 'active',
        rewards: [
          { icon: '💰', name: '灵石', desc: '大量灵石', rarity: 'common', amount: 5000 },
          { icon: '🏮', name: '花灯', desc: '活动专属', rarity: 'rare', amount: 10 },
          { icon: '🥣', name: '汤圆', desc: '增加修为', rarity: 'uncommon', amount: 50 }
        ]
      },
      {
        id: 4,
        name: '妇女节特惠',
        icon: '🌸',
        startTime: '03-08',
        endTime: '03-12',
        startTimestamp: 1738867200000,
        endTimestamp: 1740057600000,
        status: 'active',
        rewards: [
          { icon: '💎', name: '元宝', desc: '充值返利', rarity: 'epic', amount: 1000 },
          { icon: '🎁', name: '礼包', desc: '特惠礼包', rarity: 'rare', amount: 1 }
        ]
      },
      {
        id: 5,
        name: '植树节活动',
        icon: '🌱',
        startTime: '03-12',
        endTime: '03-18',
        startTimestamp: 1741708800000,
        endTimestamp: 1742227200000,
        status: 'upcoming',
        rewards: [
          { icon: '🌿', name: '灵草', desc: '炼丹材料', rarity: 'uncommon', amount: 100 },
          { icon: '🌳', name: '仙树', desc: '背包装饰', rarity: 'rare', amount: 1 }
        ]
      },
      {
        id: 6,
        name: '清明踏青',
        icon: '🍃',
        startTime: '04-04',
        endTime: '04-10',
        startTimestamp: 1743705600000,
        endTimestamp: 1744224000000,
        status: 'upcoming',
        rewards: [
          { icon: '💰', name: '灵石', desc: '踏青奖励', rarity: 'common', amount: 3000 },
          { icon: '🏃', name: '体力', desc: '恢复体力', rarity: 'common', amount: 100 }
        ]
      },
      {
        id: 7,
        name: '劳动节狂欢',
        icon: '🎉',
        startTime: '05-01',
        endTime: '05-07',
        startTimestamp: 1746086400000,
        endTimestamp: 1746604800000,
        status: 'upcoming',
        rewards: [
          { icon: '💎', name: '元宝', desc: '劳动奖励', rarity: 'epic', amount: 2000 },
          { icon: '⚔️', name: '装备', desc: '随机装备', rarity: 'rare', amount: 1 },
          { icon: '🎁', name: '宝箱', desc: '豪华宝箱', rarity: 'epic', amount: 5 }
        ]
      }
    ]);
    
    const filteredActivities = computed(() => activities.value);
    
    const getStatusLabel = (status) => {
      const labels = {
        active: '进行中',
        upcoming: '未开始',
        ended: '已结束'
      };
      return labels[status] || status;
    };
    
    const getRarityLabel = (rarity) => {
      const labels = {
        common: '普通',
        uncommon: '优秀',
        rare: '稀有',
        epic: '史诗',
        legendary: '传说'
      };
      return labels[rarity] || rarity;
    };
    
    const formatCountdown = (ms) => {
      if (ms <= 0) return '已结束';
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      
      if (days > 0) return `${days}天${hours % 24}小时`;
      if (hours > 0) return `${hours}小时${minutes % 60}分`;
      if (minutes > 0) return `${minutes}分${seconds % 60}秒`;
      return `${seconds}秒`;
    };
    
    const selectActivity = (activity) => {
      selectedActivity.value = activity;
    };
    
    const viewDetail = (activity) => {
      emit('viewDetail', activity);
      console.log('查看活动详情:', activity.name);
    };
    
    const showRewardDetail = (activity, reward) => {
      selectedActivity.value = activity;
      selectedReward.value = reward;
      showRewardModal.value = true;
    };
    
    const prevMonth = () => {
      console.log('上一个月');
    };
    
    const nextMonth = () => {
      console.log('下一个月');
    };
    
    // 定时更新倒计时
    let timer = null;
    
    onMounted(() => {
      timer = setInterval(() => {
        const now = Date.now();
        activities.value.forEach(activity => {
          if (activity.startTimestamp && activity.endTimestamp) {
            if (now < activity.startTimestamp) {
              activity.status = 'upcoming';
            } else if (now >= activity.startTimestamp && now <= activity.endTimestamp) {
              activity.status = 'active';
            } else {
              activity.status = 'ended';
            }
          }
        });
      }, 1000);
    });
    
    onUnmounted(() => {
      if (timer) clearInterval(timer);
    });
    
    return {
      currentMonth,
      currentMonthFull,
      activities,
      filteredActivities,
      selectedActivity,
      showRewardModal,
      selectedReward,
      getStatusLabel,
      getRarityLabel,
      formatCountdown,
      selectActivity,
      viewDetail,
      showRewardDetail,
      prevMonth,
      nextMonth
    };
  }
};
</script>

<style scoped>
.holiday-panel {
  width: 500px;
  max-height: 650px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 20px;
  color: #fff;
}

.holiday-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  position: relative;
}

.holiday-title {
  font-size: 22px;
  font-weight: bold;
}

.current-month {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 16px;
  color: #aaa;
}

.close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #fff;
}

/* 活动列表 */
.activity-list {
  max-height: 450px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
  padding-right: 5px;
}

.activity-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 2px solid transparent;
  transition: all 0.3s;
}

.activity-card:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateX(5px);
}

/* 状态颜色 */
.activity-card.status-active {
  border-color: rgba(74, 222, 128, 0.3);
}

.activity-card.status-upcoming {
  border-color: rgba(96, 165, 250, 0.3);
}

.activity-card.status-ended {
  border-color: rgba(156, 163, 175, 0.3);
  opacity: 0.7;
}

/* 活动状态标签 */
.activity-status {
  flex-shrink: 0;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: bold;
  white-space: nowrap;
}

.status-badge.active {
  background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
  color: #fff;
}

.status-badge.upcoming {
  background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
  color: #fff;
}

.status-badge.ended {
  background: rgba(156, 163, 175, 0.3);
  color: #aaa;
}

/* 活动信息 */
.activity-info {
  flex: 1;
  min-width: 0;
}

.activity-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.activity-icon {
  font-size: 20px;
}

.activity-name {
  font-size: 15px;
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.activity-time {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #aaa;
  margin-bottom: 6px;
}

.time-icon {
  font-size: 12px;
}

/* 活动奖励 */
.activity-rewards {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.rewards-label {
  font-size: 11px;
  color: #888;
}

.rewards-items {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.reward-tag {
  font-size: 10px;
  padding: 2px 8px;
  background: rgba(255, 215, 0, 0.1);
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 10px;
  color: #ffd700;
}

/* 详情按钮 */
.detail-btn {
  flex-shrink: 0;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.detail-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
}

/* 倒计时 */
.activity-countdown {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #4ade80;
  margin-bottom: 8px;
}

.activity-countdown.upcoming {
  color: #60a5fa;
}

.countdown-icon {
  font-size: 12px;
}

.countdown-text {
  font-weight: bold;
}

/* 奖励预览 */
.reward-more {
  font-size: 10px;
  color: #888;
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

/* 奖励弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.reward-modal {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 20px;
  width: 400px;
  max-height: 500px;
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.modal-title {
  font-size: 18px;
  font-weight: bold;
  color: #ffd700;
}

.modal-close {
  background: none;
  border: none;
  color: #888;
  font-size: 20px;
  cursor: pointer;
}

.modal-content {
  max-height: 380px;
  overflow-y: auto;
}

.activity-title {
  font-size: 16px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.reward-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reward-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  border: 1px solid transparent;
}

.reward-item.common {
  border-color: rgba(156, 163, 175, 0.3);
}

.reward-item.uncommon {
  border-color: rgba(74, 222, 128, 0.3);
}

.reward-item.rare {
  border-color: rgba(96, 165, 250, 0.3);
}

.reward-item.epic {
  border-color: rgba(167, 139, 250, 0.3);
}

.reward-item.legendary {
  border-color: rgba(255, 215, 0, 0.5);
}

.reward-icon {
  font-size: 28px;
}

.reward-details {
  flex: 1;
}

.reward-name {
  display: block;
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 3px;
}

.reward-desc {
  font-size: 11px;
  color: #888;
}

.reward-rarity {
  font-size: 10px;
  padding: 3px 8px;
  border-radius: 8px;
}

.reward-item.common .reward-rarity {
  background: rgba(156, 163, 175, 0.2);
  color: #9ca3af;
}

.reward-item.uncommon .reward-rarity {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

.reward-item.rare .reward-rarity {
  background: rgba(96, 165, 250, 0.2);
  color: #60a5fa;
}

.reward-item.epic .reward-rarity {
  background: rgba(167, 139, 250, 0.2);
  color: #a78bfa;
}

.reward-item.legendary .reward-rarity {
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
}

/* 月份筛选 */
.month-selector {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  padding-top: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.month-btn {
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 50%;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.month-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.month-display {
  font-size: 16px;
  font-weight: bold;
  color: #aaa;
}
</style>
