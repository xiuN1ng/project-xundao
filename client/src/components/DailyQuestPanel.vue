<template>
  <div class="panel daily-quest">
    <div class="panel-header">
      <h2>每日任务</h2>
      <button class="btn-close" @click="$emit('close')">×</button>
    </div>
    
    <div class="quest-tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        :class="['tab-btn', { active: currentTab === tab.id }]"
        @click="currentTab = tab.id"
      >
        {{ tab.name }}
      </button>
    </div>
    
    <div class="quest-list">
      <div v-for="quest in currentQuests" :key="quest.id" class="quest-item">
        <div class="quest-info">
          <div class="quest-name">{{ quest.name }}</div>
          <div class="quest-desc">{{ quest.desc }}</div>
          <div class="quest-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: (quest.progress / quest.target * 100) + '%' }"></div>
            </div>
            <span class="progress-text">{{ quest.progress }}/{{ quest.target }}{{ quest.unit }}</span>
          </div>
        </div>
        <div class="quest-action">
          <button 
            v-if="quest.completed && !quest.claimed" 
            class="btn-claim"
            @click="claimReward(quest.id)"
          >
            领取
          </button>
          <span v-else-if="quest.claimed" class="claimed">已领取</span>
          <span v-else class="uncomplete">未完成</span>
        </div>
      </div>
    </div>
    
    <div class="quest-footer">
      <div class="quest-summary">
        进度: {{ completedCount }}/{{ totalCount }}
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DailyQuestPanel',
  data() {
    return {
      currentTab: 'daily',
      tabs: [
        { id: 'daily', name: '每日任务' },
        { id: 'weekly', name: '每周任务' },
        { id: 'challenge', name: '挑战任务' }
      ],
      quests: {
        daily: [],
        weekly: [],
        challenge: []
      }
    }
  },
  computed: {
    currentQuests() {
      return this.quests[this.currentTab] || []
    },
    totalCount() {
      return this.currentQuests.length
    },
    completedCount() {
      return this.currentQuests.filter(q => q.completed).length
    }
  },
  mounted() {
    this.loadQuests()
  },
  methods: {
    async loadQuests() {
      try {
        const res = await fetch('http://localhost:3001/api/dailyQuest/1')
        const data = await res.json()
        this.quests.daily = data.daily || []
        this.quests.weekly = data.weekly || []
        this.quests.challenge = data.challenge || []
      } catch (e) {
        console.error('加载任务失败', e)
      }
    },
    async claimReward(questId) {
      try {
        const res = await fetch('http://localhost:3001/api/dailyQuest/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 1, questId })
        })
        const data = await res.json()
        if (data.success) {
          alert('领取成功: ' + data.message)
          this.loadQuests()
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
.quest-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}
.tab-btn {
  flex: 1;
  padding: 12px;
  background: #16213e;
  border: 1px solid #0f3460;
  color: #aaa;
  cursor: pointer;
}
.tab-btn.active {
  background: #0f3460;
  color: #ffd700;
  border-color: #ffd700;
}
.quest-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.quest-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #16213e;
  padding: 15px;
  border-radius: 8px;
}
.quest-name {
  font-size: 16px;
  font-weight: bold;
  color: #ffd700;
}
.quest-desc {
  font-size: 12px;
  color: #888;
  margin: 5px 0;
}
.quest-progress {
  display: flex;
  align-items: center;
  gap: 10px;
}
.progress-bar {
  width: 120px;
  height: 8px;
  background: #0f3460;
  border-radius: 4px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00d4ff, #ffd700);
  transition: width 0.3s;
}
.progress-text {
  font-size: 12px;
  color: #aaa;
}
.btn-claim {
  padding: 8px 20px;
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  border: none;
  border-radius: 20px;
  color: #000;
  font-weight: bold;
  cursor: pointer;
}
.claimed, .uncomplete {
  color: #666;
  font-size: 14px;
}
.quest-footer {
  margin-top: 20px;
  text-align: center;
  color: #ffd700;
}
</style>
