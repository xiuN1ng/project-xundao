<template>
  <div class="task-panel">
    <!-- 任务统计 -->
    <div class="task-stats">
      <div class="stat-card daily">
        <span class="stat-icon">📋</span>
        <div class="stat-info">
          <span class="value">{{ dailyCount }}/{{ dailyTotal }}</span>
          <span class="label">日常</span>
        </div>
      </div>
      <div class="stat-card main">
        <span class="stat-icon">📜</span>
        <div class="stat-info">
          <span class="value">{{ mainCount }}/{{ mainTotal }}</span>
          <span class="label">主线</span>
        </div>
      </div>
      <div class="stat-card achievement">
        <span class="stat-icon">🏆</span>
        <div class="stat-info">
          <span class="value">{{ achievementCount }}</span>
          <span class="label">成就</span>
        </div>
      </div>
    </div>
    
    <!-- 任务标签 -->
    <div class="task-tabs">
      <button v-for="tab in tabs" :key="tab.id"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id">
        {{ tab.icon }} {{ tab.name }}
      </button>
    </div>
    
    <!-- 任务列表 -->
    <div class="task-list">
      <div v-for="task in filteredTasks" :key="task.id" 
           class="task-card"
           :class="{ completed: task.completed, urgent: task.urgent }">
        
        <!-- 任务图标 -->
        <div class="task-icon">
          <span>{{ task.icon }}</span>
        </div>
        
        <!-- 任务信息 -->
        <div class="task-info">
          <span class="task-name">{{ task.name }}</span>
          <span class="task-desc">{{ task.desc }}</span>
          
          <!-- 进度条 -->
          <div v-if="task.progress !== undefined" class="task-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: task.progress + '%' }"></div>
            </div>
            <span class="progress-text">{{ task.current }}/{{ task.target }}</span>
          </div>
        </div>
        
        <!-- 奖励 -->
        <div class="task-reward">
          <span class="reward-icon">💰</span>
          <span class="reward-value">+{{ task.reward }}</span>
        </div>
        
        <!-- 按钮 -->
        <button v-if="!task.completed" 
                 class="task-btn" 
                 @click="claim(task)"
                 :disabled="task.progress !== undefined && task.progress < 100">
          {{ task.progress !== undefined && task.progress < 100 ? '进行中' : '领取' }}
        </button>
        <span v-else class="completed-tag">✓</span>
      </div>
    </div>
    
    <!-- 成就预览 -->
    <div class="achievement-preview">
      <h3>🏆 成就进度</h3>
      <div class="achievement-list">
        <div v-for="ach in achievements" :key="ach.id" class="achievement-item">
          <span class="ach-icon">{{ ach.icon }}</span>
          <div class="ach-info">
            <span class="ach-name">{{ ach.name }}</span>
            <div class="ach-progress">
              <div class="progress-bar" style="height: 6px;">
                <div class="progress-fill" :style="{ width: (ach.current / ach.target * 100) + '%' }"></div>
              </div>
            </div>
          </div>
          <span class="ach-status" :class="{ done: ach.current >= ach.target }">
            {{ ach.current >= ach.target ? '✓' : ach.current + '/' + ach.target }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import axios from 'axios'

const activeTab = ref('daily')
const tabs = [
  { id: 'daily', name: '日常', icon: '📋' },
  { id: 'main', name: '主线', icon: '📜' },
  { id: 'weekly', name: '周常', icon: '📆' }
]

const dailyCount = ref(3)
const dailyTotal = ref(5)
const mainCount = ref(2)
const mainTotal = ref(8)
const achievementCount = ref(12)

const tasks = ref([
  { id: 1, icon: '⚔️', name: '击败10只怪物', desc: '完成每日战斗任务', progress: 100, current: 10, target: 10, reward: 100, completed: false, type: 'daily' },
  { id: 2, icon: '🧘', name: '修炼1小时', desc: '累计修炼时间', progress: 60, current: 36, target: 60, reward: 200, completed: false, type: 'daily', urgent: true },
  { id: 3, icon: '💰', name: '消耗1000灵石', desc: '消费任务', progress: 100, current: 1000, target: 1000, reward: 150, completed: true, type: 'daily' },
  { id: 4, icon: '🏯', name: '加入宗门', desc: '加入一个宗门', reward: 300, completed: false, type: 'main' },
  { id: 5, icon: '🦊', name: '捕捉灵兽', desc: '捕捉第一只灵兽', reward: 500, completed: false, type: 'main' }
])

const achievements = ref([
  { id: 1, icon: '⚔️', name: '战斗达人', current: 150, target: 100 },
  { id: 2, icon: '🧘', name: '修炼狂人', current: 50, target: 100 },
  { id: 3, icon: '💰', name: '灵石大亨', current: 100000, target: 100000 }
])

const filteredTasks = computed(() => {
  return tasks.value.filter(t => t.type === activeTab.value)
})

async function claim(task) {
  if (task.progress !== undefined && task.progress < 100) return
  task.completed = true
  await axios.post('/api/tasks/' + task.id + '/claim')
}
</script>

<style scoped>
.task-panel { padding: 20px; }

/* 统计 */
.task-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px; }

.stat-card {
  display: flex; align-items: center; gap: 12px;
  padding: 20px; border-radius: 15px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
}

.stat-card.daily { border-color: rgba(102,126,234,0.3); }
.stat-card.main { border-color: rgba(240,147,251,0.3); }
.stat-card.achievement { border-color: rgba(255,215,0,0.3); }

.stat-icon { font-size: 30px; }

.stat-info .value { display: block; font-size: 24px; color: #fff; font-weight: bold; }
.stat-info .label { font-size: 12px; opacity: 0.7; }

/* 标签 */
.task-tabs { display: flex; gap: 10px; margin-bottom: 20px; }

.task-tabs button {
  flex: 1; padding: 15px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px; color: #fff; cursor: pointer; transition: all 0.3s;
}

.task-tabs button:hover { background: rgba(255,255,255,0.08); }
.task-tabs button.active {
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-color: transparent;
}

/* 任务列表 */
.task-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 25px; }

.task-card {
  display: flex; align-items: center; gap: 15px;
  background: rgba(255,255,255,0.05); padding: 18px; border-radius: 15px;
  transition: all 0.3s; border: 1px solid transparent;
}

.task-card:hover { background: rgba(255,255,255,0.08); }
.task-card.completed { opacity: 0.6; }
.task-card.urgent { border-color: rgba(244,67,54,0.5); animation: pulse-urgent 2s infinite; }

@keyframes pulse-urgent {
  0%, 100% { border-color: rgba(244,67,54,0.3); }
  50% { border-color: rgba(244,67,54,0.8); }
}

.task-icon {
  width: 50px; height: 50px;
  background: linear-gradient(135deg, rgba(102,126,234,0.2), rgba(118,75,162,0.2));
  border-radius: 12px; display: flex; align-items: center; justify-content: center;
  font-size: 24px;
}

.task-info { flex: 1; }
.task-name { display: block; color: #fff; font-weight: bold; margin-bottom: 4px; }
.task-desc { display: block; font-size: 12px; opacity: 0.7; margin-bottom: 10px; }

.task-progress { display: flex; align-items: center; gap: 10px; }
.task-progress .progress-bar {
  flex: 1; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;
}
.task-progress .progress-fill {
  height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 4px;
}
.task-progress .progress-text { font-size: 12px; color: #f093fb; }

.task-reward { text-align: center; min-width: 60px; }
.reward-icon { font-size: 14px; }
.reward-value { display: block; color: #ffd700; font-weight: bold; }

.task-btn {
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none; border-radius: 20px; color: #fff; font-weight: bold;
  cursor: pointer; transition: all 0.3s;
}

.task-btn:hover:not(:disabled) { transform: scale(1.05); }
.task-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.completed-tag {
  width: 35px; height: 35px; background: rgba(76,175,80,0.2);
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  color: #4caf50; font-size: 18px;
}

/* 成就 */
.achievement-preview h3 { color: #667eea; font-size: 18px; margin-bottom: 15px; }

.achievement-list { display: flex; flex-direction: column; gap: 12px; }

.achievement-item {
  display: flex; align-items: center; gap: 15px;
  background: rgba(255,255,255,0.03); padding: 15px; border-radius: 12px;
}

.ach-icon { font-size: 24px; }

.ach-info { flex: 1; }
.ach-name { display: block; color: #fff; font-size: 14px; margin-bottom: 8px; }
.ach-progress { width: 100%; }

.ach-status { 
  min-width: 40px; text-align: center;
  color: #f093fb; font-weight: bold;
}

.ach-status.done { color: #4caf50; }
</style>
