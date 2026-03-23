<template>
  <div class="activity-event-panel" :class="{ 'panel-enter': show }">
    <div class="panel-backdrop" @click="$emit('close')"></div>
    <div class="event-content" :class="{ 'content-enter': show }">
      <!-- 关闭按钮 -->
      <button class="close-btn" @click="$emit('close')">×</button>
      
      <!-- 活动开启时间 -->
      <div class="event-time">
        <span class="time-icon">⏰</span>
        <span class="time-label">活动开启时间:</span>
        <span class="time-value">{{ formatActivityTime(activityStartTime) }}</span>
      </div>
      
      <!-- 活动类型切换 -->
      <div class="event-tabs">
        <button 
          class="tab-btn"
          :class="{ active: eventType === 'quiz' }"
          @click="switchEventType('quiz')"
        >
          📝 答题活动
        </button>
        <button 
          class="tab-btn"
          :class="{ active: eventType === 'escort' }"
          @click="switchEventType('escort')"
        >
          🚚 护送活动
        </button>
      </div>
      
      <!-- 答题活动界面 -->
      <div class="quiz-section" v-if="eventType === 'quiz'">
        <!-- 答题进度 -->
        <div class="quiz-progress">
          <span class="progress-text">第 {{ currentQuestion + 1 }} / {{ questions.length }} 题</span>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: ((currentQuestion + 1) / questions.length * 100) + '%' }"></div>
          </div>
        </div>
        
        <!-- 倒计时 -->
        <div class="countdown" :class="{ 'countdown-warning': timeLeft <= 10 }">
          <span class="countdown-icon">⏳</span>
          <span class="countdown-value">{{ timeLeft }}秒</span>
        </div>
        
        <!-- 题目展示 -->
        <div class="question-area" v-if="!quizResult && currentQuestion < questions.length">
          <div class="question-icon">❓</div>
          <div class="question-text">{{ questions[currentQuestion].question }}</div>
        </div>
        
        <!-- 选项按钮 -->
        <div class="options-grid" v-if="!quizResult && currentQuestion < questions.length">
          <button 
            v-for="(option, idx) in questions[currentQuestion].options" 
            :key="idx"
            class="option-btn"
            :class="{ 
              'option-selected': selectedAnswer === idx,
              'option-correct': quizResult === 'correct' && selectedAnswer === idx,
              'option-wrong': quizResult === 'wrong' && selectedAnswer === idx
            }"
            @click="selectAnswer(idx)"
            :disabled="quizResult !== null"
          >
            <span class="option-letter">{{ ['A', 'B', 'C', 'D'][idx] }}</span>
            <span class="option-text">{{ option }}</span>
          </button>
        </div>
        
        <!-- 答题结果 -->
        <div class="quiz-result" v-if="quizResult">
          <div class="result-icon" :class="quizResult">
            {{ quizResult === 'correct' ? '✅' : '❌' }}
          </div>
          <div class="result-text">
            {{ quizResult === 'correct' ? '回答正确！' : '回答错误！' }}
          </div>
          <div class="correct-answer" v-if="quizResult === 'wrong'">
            正确答案: {{ ['A', 'B', 'C', 'D'][questions[currentQuestion].correctAnswer] }}
          </div>
        </div>
        
        <!-- 答题奖励 -->
        <div class="quiz-rewards" v-if="quizResult">
          <div class="rewards-title">🎁 答题奖励</div>
          <div class="rewards-list">
            <div class="reward-item" v-for="(reward, idx) in currentRewards" :key="idx">
              <span class="reward-icon">{{ reward.icon }}</span>
              <span class="reward-name">{{ reward.name }}</span>
              <span class="reward-amount">x{{ reward.amount }}</span>
            </div>
          </div>
        </div>
        
        <!-- 答题操作按钮 -->
        <div class="quiz-actions">
          <button 
            class="action-btn next" 
            @click="nextQuestion"
            v-if="quizResult"
          >
            {{ currentQuestion < questions.length - 1 ? '下一题 →' : '查看结果' }}
          </button>
          <button 
            class="action-btn submit" 
            @click="submitAnswer"
            v-if="selectedAnswer !== null && !quizResult"
          >
            提交答案
          </button>
        </div>
      </div>
      
      <!-- 护送活动界面 -->
      <div class="escort-section" v-if="eventType === 'escort'">
        <!-- 护送状态显示 -->
        <div class="escort-status" :class="escortStatus">
          <span class="status-icon">
            {{ escortStatus === 'idle' ? '🛤️' : 
               escortStatus === 'in_progress' ? '🚚' : 
               escortStatus === 'robbed' ? '💥' : '✅' }}
          </span>
          <span class="status-text">
            {{ escortStatus === 'idle' ? '等待出发' : 
               escortStatus === 'in_progress' ? '护送中...' : 
               escortStatus === 'robbed' ? '被劫持！' : '护送完成' }}
          </span>
        </div>
        
        <!-- 护送任务选择 -->
        <div class="escort-tasks" v-if="escortStatus === 'idle'">
          <div class="tasks-title">选择护送任务</div>
          <div class="tasks-list">
            <button 
              class="task-btn"
              :class="{ 'task-selected': selectedTask === 'goods' }"
              @click="selectTask('goods')"
            >
              <span class="task-icon">📦</span>
              <span class="task-name">护送货物</span>
              <span class="task-desc">风险较低，奖励稳定</span>
            </button>
            <button 
              class="task-btn"
              :class="{ 'task-selected': selectedTask === 'npc' }"
              @click="selectTask('npc')"
            >
              <span class="task-icon">👤</span>
              <span class="task-name">护送NPC</span>
              <span class="task-desc">风险较高，奖励丰厚</span>
            </button>
          </div>
        </div>
        
        <!-- 护送路线展示 -->
        <div class="escort-route" v-if="escortStatus !== 'idle'">
          <div class="route-title">🚏 护送路线</div>
          <div class="route-path">
            <div class="route-point start">
              <span class="point-icon">🏠</span>
              <span class="point-name">长安城</span>
            </div>
            <div class="route-line">
              <div class="line-progress" :style="{ width: routeProgress + '%' }"></div>
            </div>
            <div class="route-point end" :class="{ reached: routeProgress >= 100 }">
              <span class="point-icon">🏯</span>
              <span class="point-name">{{ selectedTask === 'goods' ? '洛阳城' : '青云宗' }}</span>
            </div>
          </div>
          <div class="route-progress-text">
            行程进度: {{ routeProgress }}%
          </div>
        </div>
        
        <!-- 劫匪来袭提示 -->
        <div class="robber-alert" v-if="showRobberAlert" @click="triggerBattle">
          <div class="alert-content">
            <span class="alert-icon">👹</span>
            <span class="alert-text">⚠️ 劫匪来袭！</span>
            <span class="alert-hint">点击进入战斗</span>
          </div>
        </div>
        
        <!-- 护送奖励预览 -->
        <div class="escort-rewards">
          <div class="rewards-title">🎁 护送奖励</div>
          <div class="rewards-list">
            <div class="reward-item" v-for="(reward, idx) in escortRewards" :key="idx">
              <span class="reward-icon">{{ reward.icon }}</span>
              <span class="reward-name">{{ reward.name }}</span>
              <span class="reward-amount">x{{ reward.amount }}</span>
            </div>
          </div>
        </div>
        
        <!-- 护送操作按钮 -->
        <div class="escort-actions">
          <button 
            class="action-btn start" 
            @click="startEscort"
            v-if="escortStatus === 'idle' && selectedTask"
          >
            开始护送
          </button>
          <button 
            class="action-btn complete" 
            @click="completeEscort"
            v-if="routeProgress >= 100 && escortStatus !== 'completed'"
          >
            领取奖励
          </button>
          <button 
            class="action-btn cancel" 
            @click="cancelEscort"
            v-if="escortStatus === 'in_progress'"
          >
            取消护送
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const { ref, computed, onMounted, onUnmounted } = Vue;

export default {
  name: 'ActivityEventPanel',
  emits: ['close', 'quizComplete', 'escortComplete', 'battleTrigger'],
  props: {
    activityId: {
      type: Number,
      default: 1
    }
  },
  setup(props, { emit }) {
    const show = ref(false);
    const eventType = ref('quiz');
    const activityStartTime = ref(Date.now() - 3600000); // 活动1小时前开始
    
    // 答题相关状态
    const currentQuestion = ref(0);
    const selectedAnswer = ref(null);
    const quizResult = ref(null);
    const timeLeft = ref(30);
    let quizTimer = null;
    
    // 答题题目数据
    const questions = ref([
      {
        question: "修仙世界中，以下哪种灵根资质最高？",
        options: ["单灵根", "双灵根", "三灵根", "四灵根"],
        correctAnswer: 0
      },
      {
        question: "炼丹时，三昧真火主要用于炼制什么级别的丹药？",
        options: ["一品丹药", "三品丹药", "五品丹药", "九品丹药"],
        correctAnswer: 2
      },
      {
        question: "以下哪个不是修仙界的境界？",
        options: ["筑基", "金丹", "元婴", "天人"],
        correctAnswer: 3
      },
      {
        question: "御剑飞行最低需要什么境界？",
        options: ["练气", "筑基", "金丹", "元婴"],
        correctAnswer: 1
      },
      {
        question: "以下哪种天材地宝可以帮助突破境界瓶颈？",
        options: ["千年灵芝", "九转还魂丹", "悟道茶", "以上都是"],
        correctAnswer: 3
      }
    ]);
    
    // 当前奖励
    const currentRewards = computed(() => {
      if (quizResult.value === 'correct') {
        return [
          { icon: '💰', name: '灵石', amount: 100 },
          { icon: '📜', name: '修为', amount: 50 }
        ];
      }
      return [];
    });
    
    // 护送相关状态
    const escortStatus = ref('idle');
    const selectedTask = ref(null);
    const routeProgress = ref(0);
    const showRobberAlert = ref(false);
    let escortTimer = null;
    
    // 护送奖励
    const escortRewards = [
      { icon: '💰', name: '灵石', amount: 500 },
      { icon: '💎', name: '元宝', amount: 10 },
      { icon: '🎁', name: '护送礼包', amount: 1 }
    ];
    
    // 格式化活动时间
    const formatActivityTime = (timestamp) => {
      const date = new Date(timestamp);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    };
    
    // 切换活动类型
    const switchEventType = (type) => {
      eventType.value = type;
      if (type === 'quiz') {
        startQuizTimer();
      } else {
        stopQuizTimer();
      }
    };
    
    // 选择答案
    const selectAnswer = (idx) => {
      if (quizResult.value !== null) return;
      selectedAnswer.value = idx;
    };
    
    // 提交答案
    const submitAnswer = () => {
      if (selectedAnswer.value === null) return;
      
      stopQuizTimer();
      
      if (selectedAnswer.value === questions.value[currentQuestion.value].correctAnswer) {
        quizResult.value = 'correct';
      } else {
        quizResult.value = 'wrong';
      }
    };
    
    // 下一题
    const nextQuestion = () => {
      if (currentQuestion.value < questions.value.length - 1) {
        currentQuestion.value++;
        selectedAnswer.value = null;
        quizResult.value = null;
        timeLeft.value = 30;
        startQuizTimer();
      } else {
        // 答题完成
        emit('quizComplete', {
          total: questions.value.length,
          correct: currentQuestion.value + 1
        });
      }
    };
    
    // 答题计时器
    const startQuizTimer = () => {
      stopQuizTimer();
      quizTimer = setInterval(() => {
        if (timeLeft.value > 0) {
          timeLeft.value--;
        } else {
          // 时间到，自动提交错误答案
          quizResult.value = 'wrong';
          stopQuizTimer();
        }
      }, 1000);
    };
    
    const stopQuizTimer = () => {
      if (quizTimer) {
        clearInterval(quizTimer);
        quizTimer = null;
      }
    };
    
    // 护送任务选择
    const selectTask = (task) => {
      selectedTask.value = task;
    };
    
    // 开始护送
    const startEscort = () => {
      if (!selectedTask.value) return;
      
      escortStatus.value = 'in_progress';
      routeProgress.value = 0;
      
      // 护送进度计时器
      escortTimer = setInterval(() => {
        if (routeProgress.value < 100) {
          routeProgress.value += 2;
          
          // 30%几率触发劫匪
          if (Math.random() < 0.3 && !showRobberAlert.value) {
            triggerRobber();
          }
        } else {
          clearInterval(escortTimer);
        }
      }, 1000);
    };
    
    // 触发劫匪
    const triggerRobber = () => {
      showRobberAlert.value = true;
      escortStatus.value = 'robbed';
    };
    
    // 进入战斗
    const triggerBattle = () => {
      emit('battleTrigger');
    };
    
    // 完成护送
    const completeEscort = () => {
      escortStatus.value = 'completed';
      emit('escortComplete', {
        task: selectedTask.value,
        rewards: escortRewards
      });
    };
    
    // 取消护送
    const cancelEscort = () => {
      if (escortTimer) {
        clearInterval(escortTimer);
      }
      escortStatus.value = 'idle';
      selectedTask.value = null;
      routeProgress.value = 0;
      showRobberAlert.value = false;
    };
    
    onMounted(() => {
      setTimeout(() => {
        show.value = true;
      }, 100);
      startQuizTimer();
    });
    
    onUnmounted(() => {
      stopQuizTimer();
      if (escortTimer) {
        clearInterval(escortTimer);
      }
    });
    
    return {
      show,
      eventType,
      activityStartTime,
      // 答题相关
      currentQuestion,
      selectedAnswer,
      quizResult,
      timeLeft,
      questions,
      currentRewards,
      // 护送相关
      escortStatus,
      selectedTask,
      routeProgress,
      showRobberAlert,
      escortRewards,
      // 方法
      formatActivityTime,
      switchEventType,
      selectAnswer,
      submitAnswer,
      nextQuestion,
      selectTask,
      startEscort,
      triggerBattle,
      completeEscort,
      cancelEscort
    };
  }
};
</script>

<style scoped>
.activity-event-panel {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.panel-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
}

.event-content {
  position: relative;
  width: 520px;
  max-height: 85vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  border-radius: 20px;
  padding: 30px;
  color: #fff;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(165, 94, 234, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow-y: auto;
}

/* 进入动画 */
.content-enter {
  animation: slideIn 0.5s ease-out forwards;
}

@keyframes slideIn {
  0% {
    opacity: 0;
    transform: scale(0.8) translateY(20px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* 关闭按钮 */
.close-btn {
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  color: #888;
  font-size: 28px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color 0.3s;
}

.close-btn:hover {
  color: #fff;
}

/* 活动开启时间 */
.event-time {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px;
  padding: 10px;
  background: rgba(255, 215, 0, 0.1);
  border-radius: 10px;
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.time-icon {
  font-size: 16px;
}

.time-label {
  font-size: 12px;
  color: #aaa;
}

.time-value {
  font-size: 14px;
  color: #ffd700;
  font-weight: bold;
}

/* 活动类型切换 */
.event-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 25px;
}

.tab-btn {
  flex: 1;
  padding: 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  color: #aaa;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
}

.tab-btn.active {
  background: linear-gradient(135deg, #a855f7 0%, #6366f1 100%);
  border-color: transparent;
  color: #fff;
  font-weight: bold;
}

.tab-btn:hover:not(.active) {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

/* ========== 答题活动样式 ========== */
.quiz-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 答题进度 */
.quiz-progress {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-text {
  font-size: 12px;
  color: #aaa;
  text-align: center;
}

.progress-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #a855f7 0%, #6366f1 100%);
  transition: width 0.3s ease;
}

/* 倒计时 */
.countdown {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 15px;
  background: rgba(0, 255, 136, 0.1);
  border-radius: 10px;
  border: 1px solid rgba(0, 255, 136, 0.3);
}

.countdown-warning {
  background: rgba(255, 71, 87, 0.1);
  border-color: rgba(255, 71, 87, 0.3);
  animation: pulse 0.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.countdown-icon {
  font-size: 20px;
}

.countdown-value {
  font-size: 24px;
  font-weight: bold;
  color: #00ff88;
}

.countdown-warning .countdown-value {
  color: #ff4757;
}

/* 题目区域 */
.question-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  padding: 25px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
}

.question-icon {
  font-size: 40px;
}

.question-text {
  font-size: 18px;
  text-align: center;
  line-height: 1.6;
  color: #fff;
}

/* 选项按钮 */
.options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.option-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  color: #fff;
  cursor: pointer;
  transition: all 0.3s;
}

.option-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(168, 85, 247, 0.5);
}

.option-btn.option-selected {
  background: rgba(168, 85, 247, 0.3);
  border-color: #a855f7;
}

.option-btn.option-correct {
  background: rgba(0, 255, 136, 0.3);
  border-color: #00ff88;
}

.option-btn.option-wrong {
  background: rgba(255, 71, 87, 0.3);
  border-color: #ff4757;
}

.option-letter {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  font-weight: bold;
  font-size: 14px;
}

.option-text {
  flex: 1;
  text-align: left;
  font-size: 14px;
}

/* 答题结果 */
.quiz-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 25px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
}

.result-icon {
  font-size: 48px;
}

.result-icon.correct {
  animation: bounce 0.5s ease;
}

.result-icon.wrong {
  animation: shake 0.5s ease;
}

@keyframes bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}

.result-text {
  font-size: 20px;
  font-weight: bold;
}

.result-text.correct {
  color: #00ff88;
}

.result-text.wrong {
  color: #ff4757;
}

.correct-answer {
  font-size: 14px;
  color: #aaa;
}

/* 答题奖励 */
.quiz-rewards {
  padding: 15px;
  background: rgba(255, 215, 0, 0.1);
  border-radius: 10px;
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.rewards-title {
  font-size: 14px;
  color: #ffd700;
  margin-bottom: 10px;
  text-align: center;
}

.rewards-list {
  display: flex;
  justify-content: center;
  gap: 15px;
}

.reward-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
}

.reward-icon {
  font-size: 18px;
}

.reward-name {
  font-size: 12px;
  color: #fff;
}

.reward-amount {
  font-size: 12px;
  color: #ffd700;
  font-weight: bold;
}

/* 答题操作按钮 */
.quiz-actions {
  display: flex;
  gap: 10px;
}

.action-btn {
  flex: 1;
  padding: 14px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.action-btn:hover {
  transform: scale(1.02);
}

.action-btn.next {
  background: linear-gradient(135deg, #a855f7 0%, #6366f1 100%);
  color: #fff;
}

.action-btn.submit {
  background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%);
  color: #1a1a2e;
}

/* ========== 护送活动样式 ========== */
.escort-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 护送状态 */
.escort-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 15px;
  border-radius: 10px;
  transition: all 0.3s;
}

.escort-status.idle {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.escort-status.in_progress {
  background: rgba(0, 255, 136, 0.1);
  border: 1px solid rgba(0, 255, 136, 0.3);
}

.escort-status.robbed {
  background: rgba(255, 71, 87, 0.1);
  border: 1px solid rgba(255, 71, 87, 0.3);
  animation: pulse 0.5s infinite;
}

.escort-status.completed {
  background: rgba(255, 215, 0, 0.1);
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.status-icon {
  font-size: 24px;
}

.status-text {
  font-size: 16px;
  font-weight: bold;
}

/* 护送任务选择 */
.escort-tasks {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.tasks-title {
  font-size: 14px;
  color: #aaa;
  text-align: center;
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  color: #fff;
  cursor: pointer;
  transition: all 0.3s;
}

.task-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.task-btn.task-selected {
  background: rgba(168, 85, 247, 0.3);
  border-color: #a855f7;
}

.task-icon {
  font-size: 32px;
}

.task-name {
  font-size: 16px;
  font-weight: bold;
}

.task-desc {
  font-size: 12px;
  color: #aaa;
}

/* 护送路线 */
.escort-route {
  padding: 20px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
}

.route-title {
  font-size: 14px;
  color: #aaa;
  margin-bottom: 15px;
  text-align: center;
}

.route-path {
  display: flex;
  align-items: center;
  gap: 10px;
}

.route-point {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.point-icon {
  font-size: 28px;
}

.point-name {
  font-size: 12px;
  color: #aaa;
}

.route-point.end.reached .point-name {
  color: #00ff88;
}

.route-line {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  position: relative;
}

.line-progress {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(90deg, #a855f7 0%, #6366f1 100%);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.route-progress-text {
  text-align: center;
  font-size: 12px;
  color: #aaa;
  margin-top: 10px;
}

/* 劫匪来袭提示 */
.robber-alert {
  padding: 20px;
  background: rgba(255, 71, 87, 0.2);
  border: 2px solid #ff4757;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.robber-alert:hover {
  background: rgba(255, 71, 87, 0.3);
  transform: scale(1.02);
}

.alert-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.alert-icon {
  font-size: 40px;
}

.alert-text {
  font-size: 20px;
  font-weight: bold;
  color: #ff4757;
}

.alert-hint {
  font-size: 12px;
  color: #aaa;
}

/* 护送奖励 */
.escort-rewards {
  padding: 15px;
  background: rgba(255, 215, 0, 0.1);
  border-radius: 10px;
  border: 1px solid rgba(255, 215, 0, 0.3);
}

/* 护送操作按钮 */
.escort-actions {
  display: flex;
  gap: 10px;
}

.action-btn.start {
  background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%);
  color: #1a1a2e;
}

.action-btn.complete {
  background: linear-gradient(135deg, #ffd700 0%, #ff9900 100%);
  color: #1a1a2e;
}

.action-btn.cancel {
  background: rgba(255, 255, 255, 0.1);
  color: #aaa;
  border: 1px solid rgba(255, 255, 255, 0.2);
}
</style>
