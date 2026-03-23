<template>
  <div class="quest-commission-panel" v-if="visible">
    <div class="panel-header">
      <h2>📋 委托任务</h2>
      <button class="close-btn" @click="close">×</button>
    </div>
    
    <div class="panel-tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        :class="['tab-btn', { active: currentTab === tab.id }]"
        @click="currentTab = tab.id"
      >
        {{ tab.name }}
      </button>
    </div>
    
    <div class="panel-content">
      <!-- 日常委托 -->
      <div v-if="currentTab === 'daily'" class="daily-quests">
        <div class="refresh-info">
          <span>刷新时间: {{ nextRefresh }}</span>
          <button class="refresh-btn" @click="refreshQuests">🔄 刷新</button>
        </div>
        
        <div class="quest-list">
          <div v-for="quest in dailyQuests" :key="quest.id" class="quest-item" :class="quest.status">
            <div class="quest-header">
              <span class="quest-icon">{{ quest.icon }}</span>
              <span class="quest-name">{{ quest.name }}</span>
              <span class="quest-difficulty" :class="quest.difficulty">{{ quest.difficultyText }}</span>
            </div>
            <div class="quest-desc">{{ quest.description }}</div>
            <div class="quest-progress">
              <div class="progress-bar">
                <div class="progress" :style="{ width: (quest.progress / quest.target * 100) + '%' }"></div>
              </div>
              <span class="progress-text">{{ quest.progress }}/{{ quest.target }}</span>
            </div>
            <div class="quest-rewards">
              <span v-for="reward in quest.rewards" :key="reward.type" class="reward">
                {{ reward.icon }} {{ reward.amount }}
              </span>
            </div>
            <div class="quest-actions">
              <button 
                v-if="quest.status === 'available'"
                class="accept-btn"
                @click="acceptQuest(quest)"
              >
                接受
              </button>
              <button 
                v-else-if="quest.status === 'completed'"
                class="claim-btn"
                @click="claimReward(quest)"
              >
                领取
              </button>
              <span v-else class="status-text">{{ quest.statusText }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 赏金任务 -->
      <div v-if="currentTab === 'bounty'" class="bounty-quests">
        <div class="bounty-header">
          <div class="bounty-level">赏金等级: <span class="level-value">VIP {{ bountyLevel }}</span></div>
          <button class="upgrade-bounty-btn" @click="upgradeBountyLevel">升级</button>
        </div>
        
        <div class="bounty-quest-list">
          <div v-for="quest in bountyQuests" :key="quest.id" class="bounty-quest-item">
            <div class="bounty-icon">{{ quest.icon }}</div>
            <div class="bounty-info">
              <div class="bounty-name">{{ quest.name }}</div>
              <div class="bounty-desc">{{ quest.description }}</div>
              <div class="bounty-rewards">
                <span class="reward">💰 {{ quest.gold }}</span>
                <span class="reward">⭐ {{ quest.points }}</span>
              </div>
            </div>
            <button class="bounty-accept-btn" @click="acceptBounty(quest)">接取</button>
          </div>
        </div>
      </div>
      
      <!-- 任务成就 -->
      <div v-if="currentTab === 'achievement'" class="quest-achievements">
        <h3>🎯 任务成就</h3>
        <div class="achievement-list">
          <div v-for="achievement in achievements" :key="achievement.id" class="achievement-item" :class="{ completed: achievement.completed }">
            <div class="achievement-icon">{{ achievement.icon }}</div>
            <div class="achievement-info">
              <div class="achievement-name">{{ achievement.name }}</div>
              <div class="achievement-progress">
                <div class="progress-bar">
                  <div class="progress" :style="{ width: (achievement.progress / achievement.target * 100) + '%' }"></div>
                </div>
                <span>{{ achievement.progress }}/{{ achievement.target }}</span>
              </div>
            </div>
            <div class="achievement-reward" v-if="achievement.completed && !achievement.claimed">
              <button class="claim-btn" @click="claimAchievement(achievement)">领取</button>
            </div>
            <div class="achievement-check" v-else-if="achievement.completed">✅</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'QuestCommissionPanel',
  data() {
    return {
      visible: false,
      currentTab: 'daily',
      tabs: [
        { id: 'daily', name: '日常委托' },
        { id: 'bounty', name: '赏金任务' },
        { id: 'achievement', name: '任务成就' }
      ],
      nextRefresh: '3:00:00',
      bountyLevel: 1,
      dailyQuests: [
        {
          id: 1,
          name: '采集灵草',
          icon: '🌿',
          description: '在灵田采集10株灵草',
          difficulty: 'easy',
          difficultyText: '简单',
          progress: 7,
          target: 10,
          status: 'in_progress',
          statusText: '进行中',
          rewards: [{ type: 'gold', icon: '💰', amount: 500 }, { type: 'exp', icon: '✨', amount: 100 }]
        },
        {
          id: 2,
          name: '击败妖兽',
          icon: '👹',
          description: '击败5只金丹期妖兽',
          difficulty: 'hard',
          difficultyText: '困难',
          progress: 0,
          target: 5,
          status: 'available',
          statusText: '可接取',
          rewards: [{ type: 'gold', icon: '💰', amount: 2000 }, { type: 'exp', icon: '✨', amount: 500 }, { type: 'item', icon: '🎁', amount: 1 }]
        },
        {
          id: 3,
          name: '炼制丹药',
          icon: '⚗️',
          description: '成功炼制3炉丹药',
          difficulty: 'medium',
          difficultyText: '中等',
          progress: 3,
          target: 3,
          status: 'completed',
          statusText: '待领取',
          rewards: [{ type: 'gold', icon: '💰', amount: 800 }, { type: 'exp', icon: '✨', amount: 200 }]
        },
        {
          id: 4,
          name: '挑战天梯',
          icon: '🏆',
          description: '完成3场天梯对战',
          difficulty: 'medium',
          difficultyText: '中等',
          progress: 1,
          target: 3,
          status: 'in_progress',
          statusText: '进行中',
          rewards: [{ type: 'gold', icon: '💰', amount: 1000 }, { type: 'points', icon: '⭐', amount: 50 }]
        }
      ],
      bountyQuests: [
        { id: 1, name: '护送商队', icon: '🐫', description: '护送商队到达目的地', gold: 5000, points: 200 },
        { id: 2, name: '清除叛徒', icon: '⚔️', description: '击败叛徒修士', gold: 8000, points: 300 },
        { id: 3, name: '探索遗迹', icon: '🗺️', description: '探索上古遗迹', gold: 10000, points: 500 }
      ],
      achievements: [
        { id: 1, name: '初出茅庐', icon: '🌟', progress: 10, target: 10, completed: true, claimed: false },
        { id: 2, name: '任务达人', icon: '📋', progress: 50, target: 100, completed: false, claimed: false },
        { id: 3, name: '赏金猎人', icon: '💰', progress: 25, target: 50, completed: false, claimed: false },
        { id: 4, name: '全勤玩家', icon: '🏅', progress: 7, target: 30, completed: false, claimed: false }
      ]
    };
  },
  methods: {
    show() {
      this.visible = true;
    },
    close() {
      this.visible = false;
    },
    refreshQuests() {
      // 刷新日常任务
      this.dailyQuests.forEach(quest => {
        if (quest.status === 'available') {
          quest.progress = 0;
          quest.status = 'available';
        }
      });
      this.$root.showMessage('任务已刷新', 'success');
    },
    acceptQuest(quest) {
      quest.status = 'in_progress';
      quest.statusText = '进行中';
      quest.progress = 0;
      this.$root.showMessage(`已接受: ${quest.name}`, 'success');
    },
    claimReward(quest) {
      quest.status = 'available';
      quest.statusText = '可接取';
      quest.progress = 0;
      this.$root.showMessage(`奖励已领取: ${quest.name}`, 'success');
    },
    acceptBounty(quest) {
      this.$root.showMessage(`已接受赏金: ${quest.name}`, 'success');
    },
    upgradeBountyLevel() {
      if (this.bountyLevel < 10) {
        this.bountyLevel++;
        this.$root.showMessage(`赏金等级提升至: VIP ${this.bountyLevel}`, 'success');
      } else {
        this.$root.showMessage('已达最高等级', 'error');
      }
    },
    claimAchievement(achievement) {
      achievement.claimed = true;
      this.$root.showMessage(`成就奖励已领取: ${achievement.name}`, 'success');
    }
  }
};
</script>

<style scoped>
.quest-commission-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 520px;
  max-height: 80vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 2px solid #a29bfe;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(90deg, #6c5ce7, #a29bfe);
  color: white;
}

.panel-header h2 { margin: 0; font-size: 20px; }

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 28px;
  cursor: pointer;
}

.panel-tabs {
  display: flex;
  background: #0f0f23;
  padding: 8px;
  gap: 4px;
}

.tab-btn {
  flex: 1;
  padding: 10px 8px;
  background: transparent;
  border: none;
  color: #8b9dc3;
  cursor: pointer;
  border-radius: 8px;
  font-size: 13px;
}

.tab-btn.active {
  background: linear-gradient(135deg, #6c5ce7, #a29bfe);
  color: white;
}

.panel-content {
  padding: 16px;
  max-height: 65vh;
  overflow-y: auto;
}

.refresh-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  color: #8b9dc3;
}

.refresh-btn {
  padding: 6px 12px;
  background: #6c5ce7;
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
}

.quest-list, .bounty-quest-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quest-item, .bounty-quest-item {
  background: rgba(162, 155, 254, 0.1);
  border: 1px solid rgba(162, 155, 254, 0.3);
  border-radius: 12px;
  padding: 14px;
}

.quest-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.quest-icon { font-size: 24px; }
.quest-name { flex: 1; color: white; font-weight: bold; }
.quest-difficulty {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
}
.quest-difficulty.easy { background: #00b894; }
.quest-difficulty.medium { background: #fdcb6e; color: #333; }
.quest-difficulty.hard { background: #d63031; }

.quest-desc { color: #8b9dc3; font-size: 13px; margin-bottom: 10px; }

.quest-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: #2d3436;
  border-radius: 4px;
  overflow: hidden;
}

.progress {
  height: 100%;
  background: linear-gradient(90deg, #6c5ce7, #a29bfe);
  border-radius: 4px;
}

.progress-text { color: #a29bfe; font-size: 12px; }

.quest-rewards {
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
}

.reward {
  color: #ffd700;
  font-size: 13px;
}

.quest-actions {
  display: flex;
  justify-content: flex-end;
}

.accept-btn, .claim-btn, .bounty-accept-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}

.accept-btn { background: #6c5ce7; color: white; }
.claim-btn { background: linear-gradient(135deg, #fdcb6e, #f39c12); color: #333; }
.status-text { color: #8b9dc3; font-size: 13px; }

.bounty-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(162, 155, 254, 0.15);
  border-radius: 8px;
}

.bounty-level { color: white; }
.level-value { color: #fdcb6e; font-weight: bold; }
.upgrade-bounty-btn {
  padding: 6px 16px;
  background: #6c5ce7;
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
}

.bounty-icon { font-size: 32px; margin-bottom: 8px; }
.bounty-name { color: white; font-weight: bold; margin-bottom: 4px; }
.bounty-desc { color: #8b9dc3; font-size: 12px; margin-bottom: 8px; }
.bounty-rewards { display: flex; gap: 12px; }

.achievement-list { display: flex; flex-direction: column; gap: 12px; }
.achievement-item {
  display: flex;
  align-items: center;
  padding: 14px;
  background: rgba(162, 155, 254, 0.1);
  border-radius: 10px;
  gap: 12px;
}
.achievement-item.completed { border: 1px solid #00b894; }
.achievement-icon { font-size: 32px; }
.achievement-info { flex: 1; }
.achievement-name { color: white; font-weight: bold; margin-bottom: 6px; }
.achievement-progress { display: flex; align-items: center; gap: 10px; }
.achievement-progress .progress-bar { flex: 1; }
.achievement-progress span { color: #a29bfe; font-size: 12px; }
.achievement-check { font-size: 24px; }
</style>
