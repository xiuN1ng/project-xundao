<template>
  <div class="achievement-panel">
    <div class="achievement-header">
      <div class="achievement-title">🏆 成就</div>
      <div class="achievement-stats">
        <span>已完成: {{ completedCount }}/{{ totalCount }}</span>
      </div>
    </div>
    
    <!-- 成就分类标签 -->
    <div class="achievement-tabs">
      <button 
        v-for="category in categories" 
        :key="category.id"
        class="tab-btn"
        :class="{ active: activeCategory === category.id }"
        @click="activeCategory = category.id"
      >
        {{ category.icon }} {{ category.name }}
      </button>
    </div>
    
    <!-- 成就列表 -->
    <div class="achievement-list">
      <div 
        v-for="achievement in filteredAchievements" 
        :key="achievement.id"
        class="achievement-item"
        :class="{ completed: achievement.completed, locked: !achievement.completed && !achievement.unlocked }"
        @click="showDetail(achievement)"
      >
        <div class="achievement-icon">
          <span v-if="achievement.completed">{{ achievement.icon }}</span>
          <span v-else>🔒</span>
        </div>
        <div class="achievement-info">
          <div class="achievement-name">{{ achievement.name }}</div>
          <div class="achievement-desc">{{ achievement.description }}</div>
          <div class="achievement-progress" v-if="!achievement.completed">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: achievement.progress + '%' }"></div>
            </div>
            <span class="progress-text">{{ achievement.current }}/{{ achievement.target }}</span>
          </div>
          <div class="achievement-reward" v-if="achievement.completed">
            <span class="reward-badge">✅ 已完成</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 成就详情弹窗 -->
    <div class="modal-overlay" v-if="selectedAchievement" @click="selectedAchievement = null">
      <div class="achievement-detail" @click.stop>
        <div class="detail-header">
          <div class="detail-icon">{{ selectedAchievement.icon }}</div>
          <div class="detail-title">{{ selectedAchievement.name }}</div>
          <button class="close-btn" @click="selectedAchievement = null">×</button>
        </div>
        <div class="detail-body">
          <p class="detail-desc">{{ selectedAchievement.description }}</p>
          <div class="detail-progress" v-if="!selectedAchievement.completed">
            <span>进度: {{ selectedAchievement.current }}/{{ selectedAchievement.target }}</span>
            <div class="progress-bar large">
              <div class="progress-fill" :style="{ width: selectedAchievement.progress + '%' }"></div>
            </div>
          </div>
          <div class="detail-reward" v-if="selectedAchievement.rewards && selectedAchievement.rewards.length">
            <h4>奖励:</h4>
            <div class="reward-list">
              <div v-for="(reward, idx) in selectedAchievement.rewards" :key="idx" class="reward-item">
                <span class="reward-icon">{{ reward.icon }}</span>
                <span class="reward-name">{{ reward.name }}</span>
                <span class="reward-amount">x{{ reward.amount }}</span>
              </div>
            </div>
          </div>
          <div class="detail-claim" v-if="selectedAchievement.completed && !selectedAchievement.claimed">
            <button class="claim-btn" @click="claimReward(selectedAchievement)">
              {{ claimingId === selectedAchievement.id ? '领取中...' : '🎁 领取奖励' }}
            </button>
          </div>
          <div class="detail-claimed" v-if="selectedAchievement.completed && selectedAchievement.claimed">
            <span class="claimed-badge">✅ 已领取</span>
          </div>
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
      activeCategory: 'all',
      selectedAchievement: null,
      claimingId: null,
      categories: [
        { id: 'all', name: '全部', icon: '📋' },
        { id: 'combat', name: '战斗', icon: '⚔️' },
        { id: 'cultivation', name: '修炼', icon: '🧘' },
        { id: 'social', name: '社交', icon: '👥' },
        { id: 'collection', name: '收集', icon: '📦' },
        { id: 'special', name: '特殊', icon: '⭐' }
      ],
      achievements: [
        {
          id: 1,
          category: 'combat',
          name: '初出茅庐',
          description: '击败10个敌人',
          icon: '⚔️',
          current: 10,
          target: 10,
          progress: 100,
          completed: true,
          unlocked: true,
          rewards: [{ icon: '💰', name: '灵石', amount: 1000 }]
        },
        {
          id: 2,
          category: 'combat',
          name: '战斗达人',
          description: '击败100个敌人',
          icon: '⚔️',
          current: 45,
          target: 100,
          progress: 45,
          completed: false,
          unlocked: true,
          rewards: [{ icon: '💰', name: '灵石', amount: 5000 }]
        },
        {
          id: 3,
          category: 'cultivation',
          name: '筑基成功',
          description: '突破到筑基期',
          icon: '🧘',
          current: 1,
          target: 1,
          progress: 100,
          completed: true,
          unlocked: true,
          rewards: [{ icon: '🎁', name: '境界礼包', amount: 1 }]
        },
        {
          id: 4,
          category: 'cultivation',
          name: '金丹大道',
          description: '突破到金丹期',
          icon: '🧘',
          current: 0,
          target: 1,
          progress: 0,
          completed: false,
          unlocked: true,
          rewards: [{ icon: '🎁', name: '金丹大礼包', amount: 1 }]
        },
        {
          id: 5,
          category: 'social',
          name: '广交朋友',
          description: '添加10个好友',
          icon: '👥',
          current: 8,
          target: 10,
          progress: 80,
          completed: false,
          unlocked: true,
          rewards: [{ icon: '💰', name: '灵石', amount: 2000 }]
        },
        {
          id: 6,
          category: 'collection',
          name: '装备收藏家',
          description: '收集50件不同装备',
          icon: '📦',
          current: 32,
          target: 50,
          progress: 64,
          completed: false,
          unlocked: true,
          rewards: [{ icon: '🎁', name: '收藏礼包', amount: 1 }]
        },
        {
          id: 7,
          category: 'special',
          name: '首充豪礼',
          description: '完成首次充值',
          icon: '💎',
          current: 0,
          target: 1,
          progress: 0,
          completed: false,
          unlocked: false,
          rewards: [{ icon: '💰', name: 'VIP礼包', amount: 1 }]
        }
      ]
    };
  },
  computed: {
    filteredAchievements() {
      if (this.activeCategory === 'all') {
        return this.achievements.filter(a => a.unlocked);
      }
      return this.achievements.filter(a => a.category === this.activeCategory && a.unlocked);
    },
    completedCount() {
      return this.achievements.filter(a => a.completed).length;
    },
    totalCount() {
      return this.achievements.filter(a => a.unlocked).length;
    }
  },
  methods: {
    showDetail(achievement) {
      this.selectedAchievement = achievement;
    },
    async claimReward(achievement) {
      if (this.claimingId !== null) return;
      this.claimingId = achievement.id;
      try {
        // 优先使用 window.achievementAPI（前端 api.js）
        let result;
        if (window.achievementAPI) {
          result = await window.achievementAPI.claim(achievement.id);
        } else {
          // 降级：模拟成功响应
          result = { success: true, achievement };
        }
        if (result && result.success) {
          const achData = result.achievement || {
            id: achievement.id,
            name: achievement.name,
            desc: achievement.description,
            icon: achievement.icon,
            reward: achievement.rewards && achievement.rewards[0]
              ? { lingshi: achievement.rewards[0].amount }
              : {}
          };
          // 标记为已领取
          achievement.claimed = true;
          // 触发成就特效面板
          if (window.__UIComponents && window.__UIComponents.showAchievementEffect) {
            window.__UIComponents.showAchievementEffect(achData);
          } else if (window.showAchievementEffectPanel) {
            window.showAchievementEffectPanel(achData);
          }
          this.selectedAchievement = null;
        }
      } catch (e) {
        console.warn('成就领取失败:', e);
      } finally {
        this.claimingId = null;
      }
    }
  }
};
</script>

<style scoped>
.achievement-panel {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 12px;
  padding: 20px;
  color: #fff;
  max-height: 80vh;
  overflow-y: auto;
}

.achievement-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.achievement-title {
  font-size: 24px;
  font-weight: bold;
}

.achievement-stats {
  color: #ffd700;
  font-size: 14px;
}

.achievement-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.tab-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s;
}

.tab-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: transparent;
}

.achievement-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.achievement-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid transparent;
}

.achievement-item:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.achievement-item.completed {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.1);
}

.achievement-item.locked {
  opacity: 0.5;
}

.achievement-icon {
  font-size: 36px;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}

.achievement-info {
  flex: 1;
}

.achievement-name {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 4px;
}

.achievement-desc {
  font-size: 12px;
  color: #aaa;
  margin-bottom: 8px;
}

.achievement-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-bar {
  flex: 1;
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

.progress-text {
  font-size: 12px;
  color: #ffd700;
}

.reward-badge {
  color: #4caf50;
  font-size: 12px;
}

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

.achievement-detail {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  position: relative;
}

.detail-icon {
  font-size: 48px;
}

.detail-title {
  font-size: 20px;
  font-weight: bold;
}

.close-btn {
  position: absolute;
  right: 0;
  top: 0;
  background: none;
  border: none;
  color: #fff;
  font-size: 24px;
  cursor: pointer;
}

.detail-body {
  color: #aaa;
}

.detail-desc {
  margin-bottom: 16px;
}

.detail-progress {
  margin-bottom: 20px;
}

.progress-bar.large {
  height: 12px;
  margin-top: 8px;
}

.detail-reward h4 {
  color: #ffd700;
  margin-bottom: 12px;
}

.reward-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reward-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.reward-icon {
  font-size: 20px;
}

.reward-name {
  flex: 1;
}

.reward-amount {
  color: #ffd700;
}

.detail-claim {
  margin-top: 16px;
  text-align: center;
}

.claim-btn {
  background: linear-gradient(135deg, #f6d365 0%, #fda085 100%);
  border: none;
  color: #1a1a2e;
  font-size: 16px;
  font-weight: bold;
  padding: 12px 32px;
  border-radius: 25px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(253, 160, 133, 0.4);
}

.claim-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(253, 160, 133, 0.6);
}

.claim-btn:active {
  transform: translateY(0);
}

.claimed-badge {
  display: block;
  text-align: center;
  margin-top: 16px;
  color: #4caf50;
  font-size: 16px;
}
</style>
