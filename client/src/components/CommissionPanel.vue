<template>
  <div class="commission-panel">
    <div class="panel-header">
      <h2>📋 委托任务</h2>
      <button class="close-btn" @click="closePanel">×</button>
    </div>
    
    <div class="panel-content">
      <!-- 任务分类标签 -->
      <div class="tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          class="tab-btn"
          :class="{ active: currentTab === tab.id }"
          @click="currentTab = tab.id"
        >
          {{ tab.icon }} {{ tab.name }}
        </button>
      </div>
      
      <!-- 任务列表 -->
      <div class="task-list">
        <div 
          v-for="task in filteredTasks" 
          :key="task.id"
          class="task-card"
          :class="{ selected: selectedTask?.id === task.id, completed: task.status === 'completed' }"
          @click="selectTask(task)"
        >
          <div class="task-header">
            <span class="task-icon">{{ task.icon }}</span>
            <div class="task-info">
              <span class="task-name">{{ task.name }}</span>
              <span class="task-difficulty" :class="'difficulty-' + task.difficulty">
                {{ getDifficultyText(task.difficulty) }}
              </span>
            </div>
            <span class="task-status" :class="'status-' + task.status">
              {{ getStatusText(task.status) }}
            </span>
          </div>
          
          <div class="task-rewards">
            <span class="reward-label">奖励:</span>
            <span class="reward-item" v-for="reward in task.rewards" :key="reward.type">
              {{ reward.icon }} {{ reward.amount }}
            </span>
          </div>
          
          <div class="task-requirements" v-if="task.requirements">
            <span class="req-label">要求:</span>
            <span class="req-item">{{ task.requirements }}</span>
          </div>
        </div>
      </div>
      
      <!-- 任务详情 -->
      <div v-if="selectedTask" class="task-detail">
        <div class="detail-header">
          <span class="detail-icon">{{ selectedTask.icon }}</span>
          <span class="detail-title">{{ selectedTask.name }}</span>
        </div>
        
        <div class="detail-description">
          {{ selectedTask.description }}
        </div>
        
        <div class="detail-info">
          <div class="info-item">
            <span class="info-label">难度:</span>
            <span class="info-value difficulty" :class="'difficulty-' + selectedTask.difficulty">
              {{ getDifficultyText(selectedTask.difficulty) }}
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">预计时间:</span>
            <span class="info-value">{{ selectedTask.duration }}分钟</span>
          </div>
          <div class="info-item">
            <span class="info-label">状态:</span>
            <span class="info-value status" :class="'status-' + selectedTask.status">
              {{ getStatusText(selectedTask.status) }}
            </span>
          </div>
        </div>
        
        <div class="detail-rewards">
          <h4>任务奖励</h4>
          <div class="reward-list">
            <div v-for="reward in selectedTask.rewards" :key="reward.type" class="reward-item">
              <span class="reward-icon">{{ reward.icon }}</span>
              <span class="reward-name">{{ reward.name }}</span>
              <span class="reward-amount">+{{ reward.amount }}</span>
            </div>
          </div>
        </div>
        
        <div class="detail-actions">
          <button 
            v-if="selectedTask.status === 'available'"
            class="accept-btn"
            @click="acceptTask(selectedTask)"
          >
            接受任务
          </button>
          <button 
            v-else-if="selectedTask.status === 'in_progress'"
            class="complete-btn"
            @click="completeTask(selectedTask)"
            :disabled="selectedTask.progress < 100"
          >
            完成 ({{ selectedTask.progress }}%)
          </button>
          <button 
            v-else-if="selectedTask.status === 'completed'"
            class="claimed-btn"
            disabled
          >
            已领取
          </button>
        </div>
      </div>
      
      <!-- 没有任务时显示 -->
      <div v-if="filteredTasks.length === 0" class="no-tasks">
        <span class="no-tasks-icon">📭</span>
        <p>暂无任务</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const emit = defineEmits(['close']);

// 标签页
const tabs = ref([
  { id: 'all', name: '全部', icon: '📋' },
  { id: 'daily', name: '每日', icon: '📅' },
  { id: 'weekly', name: '每周', icon: '📆' },
  { id: 'special', name: '特殊', icon: '⭐' },
]);

const currentTab = ref('all');
const selectedTask = ref(null);

// 任务列表数据
const tasks = ref([
  {
    id: 1,
    name: '采集灵草',
    description: '前往灵草园采集炼制丹药所需的灵草，需要仔细辨别年份',
    icon: '🌿',
    difficulty: 1,
    type: 'daily',
    status: 'available',
    progress: 0,
    duration: 10,
    requirements: '境界: 练气期',
    rewards: [
      { type: 'exp', name: '经验', icon: '✨', amount: 100 },
      { type: 'herb', name: '灵草', icon: '🌿', amount: 5 },
    ]
  },
  {
    id: 2,
    name: '守护药园',
    description: '守护宗门药园，击退来犯的妖邪入侵者',
    icon: '🛡️',
    difficulty: 2,
    type: 'daily',
    status: 'in_progress',
    progress: 60,
    duration: 15,
    requirements: '境界: 筑基期',
    rewards: [
      { type: 'exp', name: '经验', icon: '✨', amount: 200 },
      { type: 'spirit_stone', name: '灵石', icon: '💎', amount: 50 },
    ]
  },
  {
    id: 3,
    name: '寻找仙根',
    description: '根据线索前往指定地点寻找仙根，用于炼制极品丹药',
    icon: '🔍',
    difficulty: 3,
    type: 'weekly',
    status: 'available',
    progress: 0,
    duration: 30,
    requirements: '境界: 金丹期',
    rewards: [
      { type: 'exp', name: '经验', icon: '✨', amount: 500 },
      { type: 'spirit_stone', name: '灵石', icon: '💎', amount: 200 },
      { type: 'item', name: '仙根', icon: '🌱', amount: 1 },
    ]
  },
  {
    id: 4,
    name: '协助炼丹',
    description: '帮助长老炼丹，学习高级炼丹技巧',
    icon: '⚗️',
    difficulty: 2,
    type: 'daily',
    status: 'completed',
    progress: 100,
    duration: 20,
    requirements: '境界: 筑基期',
    rewards: [
      { type: 'exp', name: '经验', icon: '✨', amount: 150 },
      { type: 'skill', name: '炼丹熟练度', icon: '📈', amount: 30 },
    ]
  },
  {
    id: 5,
    name: '讨伐妖王',
    description: '组队讨伐危害人间的妖王，获取珍贵材料',
    icon: '👹',
    difficulty: 5,
    type: 'special',
    status: 'available',
    progress: 0,
    duration: 60,
    requirements: '境界: 化神期 + 战力: 100万',
    rewards: [
      { type: 'exp', name: '经验', icon: '✨', amount: 2000 },
      { type: 'spirit_stone', name: '灵石', icon: '💎', content: 1000 },
      { type: 'item', name: '妖王内丹', icon: '🔴', amount: 1 },
    ]
  },
  {
    id: 6,
    name: '送花传情',
    description: '将弟子精心培育的花朵送给心仪的仙子',
    icon: '💐',
    difficulty: 1,
    type: 'daily',
    status: 'available',
    progress: 0,
    duration: 5,
    requirements: '境界: 练气期',
    rewards: [
      { type: 'exp', name: '经验', icon: '✨', amount: 50 },
      { type: 'affection', name: '好感度', icon: '❤️', amount: 10 },
    ]
  },
]);

// 筛选任务
const filteredTasks = computed(() => {
  if (currentTab.value === 'all') {
    return tasks.value;
  }
  return tasks.value.filter(task => task.type === currentTab.value);
});

// 获取难度文本
const getDifficultyText = (difficulty) => {
  const texts = ['', '简单', '普通', '困难', '极难', '史诗'];
  return texts[difficulty] || '未知';
};

// 获取状态文本
const getStatusText = (status) => {
  const texts = {
    'available': '可接取',
    'in_progress': '进行中',
    'completed': '已完成',
  };
  return texts[status] || '未知';
};

// 选择任务
const selectTask = (task) => {
  selectedTask.value = task;
};

// 接受任务
const acceptTask = async (task) => {
  try {
    const response = await fetch('/api/commission/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: task.id })
    });
    
    const data = await response.json();
    
    if (data.success) {
      task.status = 'in_progress';
      task.progress = 0;
      // 开始进度计时
      startProgress(task);
    } else {
      alert(data.message || '接受任务失败');
    }
  } catch (error) {
    console.error('接受任务失败:', error);
    // 模拟本地操作
    task.status = 'in_progress';
    task.progress = 0;
    startProgress(task);
  }
};

// 开始进度计时
const startProgress = (task) => {
  const interval = setInterval(() => {
    if (task.progress < 100) {
      task.progress += 100 / (task.duration * 6); // 每10秒增加进度
    } else {
      clearInterval(interval);
      task.progress = 100;
    }
  }, 10000);
};

// 完成任务
const completeTask = async (task) => {
  if (task.progress < 100) return;
  
  try {
    const response = await fetch('/api/commission/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: task.id })
    });
    
    const data = await response.json();
    
    if (data.success) {
      task.status = 'completed';
      // 显示奖励
      showRewards(task.rewards);
    } else {
      alert(data.message || '完成任务失败');
    }
  } catch (error) {
    console.error('完成任务失败:', error);
    // 模拟本地操作
    task.status = 'completed';
    showRewards(task.rewards);
  }
};

// 显示奖励
const showRewards = (rewards) => {
  const rewardText = rewards.map(r => `${r.icon} ${r.name} +${r.amount}`).join('\n');
  alert(`任务完成！\n\n奖励:\n${rewardText}`);
};

const closePanel = () => {
  emit('close');
};
</script>

<style scoped>
.commission-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 520px;
  max-height: 80vh;
  background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
  border-radius: 16px;
  border: 2px solid #9f7aea;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  color: #e2e8f0;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #9f7aea;
  background: linear-gradient(90deg, #4a5568 0%, #2d3748 100%);
}

.panel-header h2 {
  margin: 0;
  font-size: 18px;
  color: #9f7aea;
}

.close-btn {
  background: none;
  border: none;
  color: #a0aec0;
  font-size: 24px;
  cursor: pointer;
  transition: color 0.3s;
}

.close-btn:hover {
  color: #fff;
}

.panel-content {
  padding: 20px;
  max-height: calc(80vh - 60px);
  overflow-y: auto;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.tab-btn {
  flex: 1;
  padding: 10px;
  background: rgba(159, 122, 234, 0.2);
  border: 1px solid rgba(159, 122, 234, 0.3);
  border-radius: 8px;
  color: #a0aec0;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
}

.tab-btn:hover {
  background: rgba(159, 122, 234, 0.3);
}

.tab-btn.active {
  background: linear-gradient(135deg, #9f7aea 0%, #805ad5 100%);
  color: white;
  border-color: transparent;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.task-card {
  padding: 14px;
  background: #2d3748;
  border: 1px solid rgba(159, 122, 234, 0.2);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
}

.task-card:hover {
  background: rgba(159, 122, 234, 0.1);
  border-color: rgba(159, 122, 234, 0.4);
}

.task-card.selected {
  background: rgba(159, 122, 234, 0.2);
  border-color: #9f7aea;
}

.task-card.completed {
  opacity: 0.6;
}

.task-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.task-icon {
  font-size: 28px;
}

.task-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.task-name {
  font-size: 15px;
  font-weight: bold;
  color: #fff;
}

.task-difficulty {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
  width: fit-content;
}

.difficulty-1 { background: #48bb78; color: white; }
.difficulty-2 { background: #4299e1; color: white; }
.difficulty-3 { background: #ed8936; color: white; }
.difficulty-4 { background: #e53e3e; color: white; }
.difficulty-5 { background: #805ad5; color: white; }

.task-status {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
}

.status-available {
  background: rgba(72, 187, 120, 0.2);
  color: #48bb78;
}

.status-in_progress {
  background: rgba(66, 153, 225, 0.2);
  color: #4299e1;
}

.status-completed {
  background: rgba(160, 174, 192, 0.2);
  color: #a0aec0;
}

.task-rewards {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #a0aec0;
}

.reward-item {
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.task-requirements {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 11px;
  color: #718096;
}

.task-detail {
  padding: 16px;
  background: #1a202c;
  border: 1px solid rgba(159, 122, 234, 0.3);
  border-radius: 12px;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.detail-icon {
  font-size: 36px;
}

.detail-title {
  font-size: 18px;
  font-weight: bold;
  color: #fff;
}

.detail-description {
  font-size: 13px;
  color: #a0aec0;
  line-height: 1.6;
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}

.detail-info {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.info-label {
  color: #718096;
}

.info-value {
  color: #fff;
}

.detail-rewards h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #cbd5e0;
}

.reward-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reward-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: rgba(159, 122, 234, 0.1);
  border-radius: 6px;
}

.reward-icon {
  font-size: 20px;
}

.reward-name {
  flex: 1;
  font-size: 13px;
  color: #a0aec0;
}

.reward-amount {
  font-size: 14px;
  color: #48bb78;
  font-weight: bold;
}

.detail-actions {
  margin-top: 16px;
  display: flex;
  gap: 10px;
}

.accept-btn, .complete-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.accept-btn {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
  color: white;
}

.accept-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(72, 187, 120, 0.4);
}

.complete-btn {
  background: linear-gradient(135deg, #9f7aea 0%, #805ad5 100%);
  color: white;
}

.complete-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(159, 122, 234, 0.4);
}

.complete-btn:disabled {
  background: #4a5568;
  cursor: not-allowed;
  opacity: 0.6;
}

.claimed-btn {
  flex: 1;
  padding: 12px;
  background: #4a5568;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  color: #a0aec0;
}

.no-tasks {
  text-align: center;
  padding: 40px;
  color: #718096;
}

.no-tasks-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}
</style>
