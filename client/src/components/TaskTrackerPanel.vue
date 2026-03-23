<template>
  <div class="task-tracker-panel">
    <div class="panel-header">
      <div class="panel-title">📋 任务追踪</div>
      <button class="close-btn" @click="closePanel">✕</button>
    </div>
    
    <div class="panel-tabs">
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'current' }"
        @click="activeTab = 'current'"
      >
        当前任务
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'daily' }"
        @click="activeTab = 'daily'"
      >
        日常任务
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'main' }"
        @click="activeTab = 'main'"
      >
        主线任务
      </button>
    </div>
    
    <div class="panel-content">
      <!-- 当前追踪 -->
      <div v-if="activeTab === 'current'" class="tab-content">
        <div v-if="trackedTask" class="tracked-task-card">
          <div class="tracked-header">
            <span class="tracked-badge">追踪中</span>
            <button class="untrack-btn" @click="untrackTask">取消追踪</button>
          </div>
          <div class="tracked-info">
            <div class="tracked-icon">{{ trackedTask.icon }}</div>
            <div class="tracked-details">
              <div class="tracked-name">{{ trackedTask.name }}</div>
              <div class="tracked-desc">{{ trackedTask.description }}</div>
            </div>
          </div>
          <div class="tracked-progress">
            <div class="progress-bar">
              <div 
                class="progress-fill" 
                :style="{ width: trackedTask.progress + '%' }"
              ></div>
            </div>
            <div class="progress-text">
              {{ trackedTask.current }}/{{ trackedTask.target }}
            </div>
          </div>
          <div class="tracked-rewards">
            <div class="rewards-title">任务奖励</div>
            <div class="rewards-list">
              <span v-if="trackedTask.exp">✨ {{ trackedTask.exp }}经验</span>
              <span v-if="trackedTask.gold">💰 {{ trackedTask.gold }}金币</span>
              <span v-if="trackedTask.items" v-for="item in trackedTask.items" :key="item">
                {{ item }}
              </span>
            </div>
          </div>
          <button class="goto-btn" @click="goToTask">
            前往任务 ▶
          </button>
        </div>
        
        <div v-else class="no-task">
          <div class="no-task-icon">📋</div>
          <div class="no-task-text">暂无追踪任务</div>
          <div class="no-task-hint">点击下方任务进行追踪</div>
        </div>
      </div>
      
      <!-- 日常任务 -->
      <div v-if="activeTab === 'daily'" class="tab-content">
        <div class="task-list">
          <div 
            v-for="task in dailyTasks" 
            :key="task.id"
            class="task-item"
            :class="{ completed: task.completed, active: trackedTask?.id === task.id }"
            @click="trackTask(task)"
          >
            <div class="task-icon">{{ task.icon }}</div>
            <div class="task-info">
              <div class="task-name">{{ task.name }}</div>
              <div class="task-desc">{{ task.description }}</div>
              <div class="task-progress">
                <div class="progress-bar small">
                  <div 
                    class="progress-fill" 
                    :style="{ width: (task.current / task.target * 100) + '%' }"
                  ></div>
                </div>
                <span>{{ task.current }}/{{ task.target }}</span>
              </div>
            </div>
            <div class="task-rewards">
              <span v-if="task.exp">✨ {{ task.exp }}</span>
              <span v-if="task.gold">💰 {{ task.gold }}</span>
            </div>
            <div class="task-status">
              <span v-if="task.completed" class="status-completed">✅</span>
              <span v-else-if="trackedTask?.id === task.id" class="status-tracking">📍</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 主线任务 -->
      <div v-if="activeTab === 'main'" class="tab-content">
        <div class="task-list">
          <div 
            v-for="task in mainTasks" 
            :key="task.id"
            class="task-item"
            :class="{ completed: task.completed, active: trackedTask?.id === task.id }"
            @click="trackTask(task)"
          >
            <div class="task-icon">{{ task.icon }}</div>
            <div class="task-info">
              <div class="task-name">{{ task.name }}</div>
              <div class="task-desc">{{ task.description }}</div>
              <div class="task-progress" v-if="!task.completed">
                <div class="progress-bar small">
                  <div 
                    class="progress-fill" 
                    :style="{ width: (task.current / task.target * 100) + '%' }"
                  ></div>
                </div>
                <span>{{ task.current }}/{{ task.target }}</span>
              </div>
            </div>
            <div class="task-rewards">
              <span v-if="task.exp">✨ {{ task.exp }}</span>
              <span v-if="task.gold">💰 {{ task.gold }}</span>
            </div>
            <div class="task-status">
              <span v-if="task.completed" class="status-completed">✅</span>
              <span v-else-if="trackedTask?.id === task.id" class="status-tracking">📍</span>
              <span v-else class="status-locked">🔒</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 快速导航 -->
      <div class="quick-nav">
        <div class="nav-title">快速跳转</div>
        <div class="nav-buttons">
          <button class="nav-btn" @click="navigateTo('world')">
            🌍 世界
          </button>
          <button class="nav-btn" @click="navigateTo('dungeon')">
            🏰 副本
          </button>
          <button class="nav-btn" @click="navigateTo('shop')">
            🏪 商店
          </button>
          <button class="nav-btn" @click="navigateTo('bag')">
            🎒 背包
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TaskTrackerPanel',
  emits: ['close', 'navigate'],
  setup(props, { emit }) {
    const activeTab = ref('current');
    const trackedTask = ref(null);
    
    const dailyTasks = ref([
      { 
        id: 'daily-1', 
        icon: '⚔️', 
        name: '击败10只怪物', 
        description: '在任意地图击败怪物',
        current: 7, 
        target: 10, 
        exp: 100, 
        gold: 50,
        completed: false 
      },
      { 
        id: 'daily-2', 
        icon: '📦', 
        name: '收集5件装备', 
        description: '击败怪物收集装备',
        current: 5, 
        target: 5, 
        exp: 150, 
        gold: 80,
        completed: true 
      },
      { 
        id: 'daily-3', 
        icon: '💰', 
        name: '交易3次', 
        description: '在商店进行买卖',
        current: 2, 
        target: 3, 
        exp: 80, 
        gold: 100,
        completed: false 
      },
      { 
        id: 'daily-4', 
        icon: '⛰️', 
        name: '探索1个新地图', 
        description: '发现新的区域',
        current: 0, 
        target: 1, 
        exp: 200, 
        gold: 150,
        completed: false 
      },
      { 
        id: 'daily-5', 
        icon: '🎯', 
        name: '完成5个委托', 
        description: '执行委托任务',
        current: 3, 
        target: 5, 
        exp: 120, 
        gold: 60,
        completed: false 
      }
    ]);
    
    const mainTasks = ref([
      { 
        id: 'main-1', 
        icon: '🏠', 
        name: '初入修仙界', 
        description: '创建角色并进入游戏',
        current: 1, 
        target: 1, 
        exp: 100, 
        gold: 0,
        completed: true 
      },
      { 
        id: 'main-2', 
        icon: '⚔️', 
        name: '首次战斗', 
        description: '击败第一只怪物',
        current: 1, 
        target: 1, 
        exp: 200, 
        gold: 50,
        completed: true 
      },
      { 
        id: 'main-3', 
        icon: '📦', 
        name: '获得装备', 
        description: '获取第一件装备',
        current: 1, 
        target: 1, 
        exp: 150, 
        gold: 30,
        completed: true 
      },
      { 
        id: 'main-4', 
        icon: '⬆️', 
        name: '提升等级', 
        description: '升级到5级',
        current: 3, 
        target: 5, 
        exp: 500, 
        gold: 100,
        completed: false 
      },
      { 
        id: 'main-5', 
        icon: '🗡️', 
        name: '强化武器', 
        description: '强化武器到+3',
        current: 1, 
        target: 3, 
        exp: 300, 
        gold: 200,
        completed: false 
      },
      { 
        id: 'main-6', 
        icon: '🌲', 
        name: '探索森林', 
        description: '进入幽暗山脉',
        current: 0, 
        target: 1, 
        exp: 400, 
        gold: 150,
        completed: false 
      },
      { 
        id: 'main-7', 
        icon: '👹', 
        name: '击败BOSS', 
        description: '击败第一个BOSS',
        current: 0, 
        target: 1, 
        exp: 1000, 
        gold: 500,
        completed: false 
      }
    ]);
    
    const trackTask = (task) => {
      if (task.completed) return;
      trackedTask.value = task;
      saveTracking();
    };
    
    const untrackTask = () => {
      trackedTask.value = null;
      saveTracking();
    };
    
    const goToTask = () => {
      if (trackedTask.value) {
        emit('navigate', trackedTask.value.target);
      }
    };
    
    const navigateTo = (location) => {
      emit('navigate', location);
    };
    
    const saveTracking = async () => {
      try {
        await fetch('/api/task/tracking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            taskId: trackedTask.value?.id || null 
          })
        });
      } catch (e) {
        console.error('保存追踪失败:', e);
      }
    };
    
    const loadTracking = async () => {
      try {
        const response = await fetch('/api/task/tracking');
        const data = await response.json();
        if (data.taskId) {
          const allTasks = [...dailyTasks.value, ...mainTasks.value];
          trackedTask.value = allTasks.find(t => t.id === data.taskId);
        }
      } catch (e) {
        console.error('加载追踪失败:', e);
      }
    };
    
    const closePanel = () => {
      emit('close');
    };
    
    onMounted(() => {
      loadTracking();
    });
    
    return {
      activeTab,
      trackedTask,
      dailyTasks,
      mainTasks,
      trackTask,
      untrackTask,
      goToTask,
      navigateTo,
      closePanel
    };
  }
};
</script>

<style scoped>
.task-tracker-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 500px;
  max-height: 80vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  border: 2px solid #4a5568;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(90deg, #2d3748 0%, #1a202c 100%);
  border-bottom: 1px solid #4a5568;
}

.panel-title {
  font-size: 20px;
  font-weight: bold;
  color: #ffd700;
}

.close-btn {
  background: none;
  border: none;
  color: #a0aec0;
  font-size: 20px;
  cursor: pointer;
}

.close-btn:hover {
  color: #fff;
}

.panel-tabs {
  display: flex;
  padding: 12px 20px;
  gap: 10px;
  background: #1a202c;
}

.tab-btn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 8px;
  background: #2d3748;
  color: #a0aec0;
  cursor: pointer;
  transition: all 0.3s;
}

.tab-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.panel-content {
  padding: 20px;
  max-height: calc(80vh - 120px);
  overflow-y: auto;
}

.tab-content {
  min-height: 200px;
}

/* 追踪任务卡片 */
.tracked-task-card {
  background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
  border-radius: 12px;
  padding: 16px;
  border: 2px solid #ffd700;
}

.tracked-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.tracked-badge {
  background: #ffd700;
  color: #000;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: bold;
}

.untrack-btn {
  background: #4a5568;
  border: none;
  color: #a0aec0;
  padding: 4px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
}

.untrack-btn:hover {
  background: #ef4444;
  color: #fff;
}

.tracked-info {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.tracked-icon {
  font-size: 40px;
}

.tracked-details {
  flex: 1;
}

.tracked-name {
  color: #fff;
  font-weight: bold;
  font-size: 16px;
  margin-bottom: 4px;
}

.tracked-desc {
  color: #a0aec0;
  font-size: 12px;
}

.tracked-progress {
  margin-bottom: 12px;
}

.progress-bar {
  height: 20px;
  background: #1a202c;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 4px;
}

.progress-bar.small {
  height: 8px;
  width: 100px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s;
}

.progress-text {
  text-align: right;
  color: #ffd700;
  font-size: 12px;
}

.tracked-rewards {
  background: #1a202c;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 12px;
}

.rewards-title {
  color: #ffd700;
  font-size: 12px;
  margin-bottom: 6px;
}

.rewards-list {
  display: flex;
  gap: 12px;
  color: #a0aec0;
  font-size: 12px;
}

.goto-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
}

.goto-btn:hover {
  transform: scale(1.02);
}

/* 无任务状态 */
.no-task {
  text-align: center;
  padding: 40px;
}

.no-task-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.no-task-text {
  color: #fff;
  font-size: 16px;
  margin-bottom: 8px;
}

.no-task-hint {
  color: #a0aec0;
  font-size: 12px;
}

/* 任务列表 */
.task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #2d3748;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.task-item:hover {
  background: #3d4a5c;
}

.task-item.active {
  border-color: #ffd700;
}

.task-item.completed {
  opacity: 0.7;
}

.task-icon {
  font-size: 28px;
}

.task-info {
  flex: 1;
}

.task-name {
  color: #fff;
  font-weight: bold;
  font-size: 14px;
}

.task-desc {
  color: #a0aec0;
  font-size: 11px;
  margin: 2px 0;
}

.task-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-progress span {
  color: #ffd700;
  font-size: 11px;
}

.task-rewards {
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: #ffd700;
  font-size: 11px;
}

.task-status {
  font-size: 18px;
}

.status-completed {
  color: #22c55e;
}

.status-tracking {
  color: #ffd700;
}

.status-locked {
  color: #4a5568;
}

/* 快速导航 */
.quick-nav {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #4a5568;
}

.nav-title {
  color: #ffd700;
  font-size: 14px;
  margin-bottom: 12px;
}

.nav-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.nav-btn {
  padding: 10px;
  background: #2d3748;
  border: 1px solid #4a5568;
  border-radius: 8px;
  color: #e2e8f0;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 12px;
}

.nav-btn:hover {
  background: #3d4a5c;
  border-color: #667eea;
}
</style>
