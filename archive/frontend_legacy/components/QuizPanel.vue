<template>
  <div class="quiz-panel">
    <div class="panel-header">
      <h2>📚 答题挑战</h2>
      <div class="quiz-info">
        <span class="question-count">第 {{ currentQuestion + 1 }} / {{ questions.length }} 题</span>
        <button class="close-btn" @click="closePanel">×</button>
      </div>
    </div>
    
    <div class="panel-content">
      <!-- 计时器 -->
      <div class="timer-section">
        <div class="timer-bar">
          <div 
            class="timer-fill" 
            :class="{ warning: timeLeft <= 10, critical: timeLeft <= 5 }"
            :style="{ width: (timeLeft / totalTime * 100) + '%' }"
          ></div>
        </div>
        <div class="timer-text" :class="{ warning: timeLeft <= 10, critical: timeLeft <= 5 }">
          ⏱️ {{ timeLeft }}秒
        </div>
      </div>
      
      <!-- 答题状态 -->
      <div v-if="quizStatus === 'not_started'" class="quiz-start">
        <div class="start-icon">📝</div>
        <h3>答题挑战</h3>
        <p>回答问题获得经验和灵石奖励</p>
        <p class="reward-info">答对: +{{ rewardCorrect }}经验 +{{ rewardStoneCorrect }}灵石</p>
        <p class="reward-info wrong">答错: +{{ rewardWrong }}经验</p>
        <button class="start-btn" @click="startQuiz">
          开始答题
        </button>
      </div>
      
      <!-- 答题中 -->
      <div v-else-if="quizStatus === 'in_progress'" class="quiz-content">
        <!-- 题目 -->
        <div class="question-section">
          <div class="question-header">
            <span class="question-type">{{ getQuestionTypeText(currentQ.type) }}</span>
            <span class="question-difficulty" :class="'difficulty-' + currentQ.difficulty">
              {{ getDifficultyText(currentQ.difficulty) }}
            </span>
          </div>
          
          <div class="question-text">
            <span class="question-number">Q{{ currentQuestion + 1 }}:</span>
            {{ currentQ.question }}
          </div>
          
          <!-- 图片题目 -->
          <div v-if="currentQ.image" class="question-image">
            <img :src="currentQ.image" alt="题目图片" />
          </div>
        </div>
        
        <!-- 答案选项 -->
        <div class="answers-section">
          <button 
            v-for="(answer, index) in currentQ.answers" 
            :key="index"
            class="answer-btn"
            :class="{ 
              selected: selectedAnswer === index,
              correct: showResult && index === currentQ.correctIndex,
              wrong: showResult && selectedAnswer === index && index !== currentQ.correctIndex
            }"
            :disabled="showResult"
            @click="selectAnswer(index)"
          >
            <span class="answer-label">{{ getAnswerLabel(index) }}</span>
            <span class="answer-text">{{ answer }}</span>
            <span v-if="showResult && index === currentQ.correctIndex" class="answer-icon">✓</span>
            <span v-if="showResult && selectedAnswer === index && index !== currentQ.correctIndex" class="answer-icon">✗</span>
          </button>
        </div>
        
        <!-- 提交按钮 -->
        <div class="action-section">
          <button 
            v-if="!showResult"
            class="submit-btn"
            :disabled="selectedAnswer === null"
            @click="submitAnswer"
          >
            确认答案
          </button>
          <button 
            v-else
            class="next-btn"
            @click="nextQuestion"
          >
            {{ currentQuestion < questions.length - 1 ? '下一题' : '查看结果' }}
          </button>
        </div>
      </div>
      
      <!-- 答题结果 -->
      <div v-else-if="quizStatus === 'finished'" class="quiz-result">
        <div class="result-icon">{{ resultScore >= 60 ? '🎉' : '💪' }}</div>
        <h3>{{ resultScore >= 60 ? '答题完成！' : '再接再厉！' }}</h3>
        
        <div class="result-stats">
          <div class="stat-item">
            <span class="stat-label">正确数</span>
            <span class="stat-value correct">{{ correctCount }} / {{ questions.length }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">正确率</span>
            <span class="stat-value">{{ resultScore }}%</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">用时</span>
            <span class="stat-value">{{ usedTime }}秒</span>
          </div>
        </div>
        
        <div class="result-rewards">
          <h4>获得奖励</h4>
          <div class="reward-items">
            <div class="reward-item">
              <span class="reward-icon">✨</span>
              <span class="reward-name">经验</span>
              <span class="reward-amount">+{{ expReward }}</span>
            </div>
            <div class="reward-item">
              <span class="reward-icon">💎</span>
              <span class="reward-name">灵石</span>
              <span class="reward-amount">+{{ stoneReward }}</span>
            </div>
          </div>
        </div>
        
        <button class="restart-btn" @click="restartQuiz">
          再次挑战
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue';

const emit = defineEmits(['close']);

// 答题状态
const quizStatus = ref('not_started'); // not_started, in_progress, finished
const currentQuestion = ref(0);
const selectedAnswer = ref(null);
const showResult = ref(false);
const correctCount = ref(0);
const usedTime = ref(0);
const timeLeft = ref(30);
const totalTime = ref(30);

let timer = null;

// 奖励设置
const rewardCorrect = ref(50);
const rewardStoneCorrect = ref(20);
const rewardWrong = ref(10);

// 题目数据
const questions = ref([
  {
    id: 1,
    type: 'cultivation',
    difficulty: 1,
    question: '修仙体系中，筑基期之后是什么境界？',
    answers: ['练气期', '金丹期', '元婴期', '化神期'],
    correctIndex: 1
  },
  {
    id: 2,
    type: 'knowledge',
    difficulty: 2,
    question: '以下哪种灵草通常用于炼制突破境界的丹药？',
    answers: ['灵心草', '七霞莲', '养魂花', '冰心莲'],
    correctIndex: 1
  },
  {
    id: 3,
    type: 'history',
    difficulty: 2,
    question: '传说中道祖是谁？',
    answers: ['太上老君', '元始天尊', '道德天尊', '通天教主'],
    correctIndex: 2
  },
  {
    id: 4,
    type: 'practice',
    difficulty: 3,
    question: '修仙者渡劫时，最常经历的劫难是什么？',
    answers: ['心魔劫', '雷劫', '风劫', '火劫'],
    correctIndex: 1
  },
  {
    id: 5,
    type: 'cultivation',
    difficulty: 1,
    question: '灵气复苏发生在哪个时代？',
    answers: ['末法时代', '上古时代', '近现代', '神话时代'],
    correctIndex: 2
  },
]);

// 当前题目
const currentQ = computed(() => questions.value[currentQuestion.value]);

// 结果
const resultScore = computed(() => {
  return Math.round((correctCount.value / questions.value.length) * 100);
});

const expReward = computed(() => {
  return correctCount.value * rewardCorrect.value;
});

const stoneReward = computed(() => {
  return correctCount.value * rewardStoneCorrect.value;
});

// 获取题目类型文本
const getQuestionTypeText = (type) => {
  const texts = {
    'cultivation': '修炼知识',
    'knowledge': '灵草知识',
    'history': '仙界历史',
    'practice': '实战技巧',
  };
  return texts[type] || '综合';
};

// 获取难度文本
const getDifficultyText = (difficulty) => {
  const texts = ['', '简单', '中等', '困难'];
  return texts[difficulty] || '未知';
};

// 获取答案标签
const getAnswerLabel = (index) => {
  return ['A', 'B', 'C', 'D'][index];
};

// 开始答题
const startQuiz = () => {
  quizStatus.value = 'in_progress';
  currentQuestion.value = 0;
  correctCount.value = 0;
  usedTime.value = 0;
  startTimer();
};

// 计时器
const startTimer = () => {
  timeLeft.value = totalTime.value;
  
  timer = setInterval(() => {
    timeLeft.value--;
    usedTime.value++;
    
    if (timeLeft.value <= 0) {
      // 时间到，自动提交
      if (!showResult.value) {
        submitAnswer();
      }
    }
  }, 1000);
};

// 选择答案
const selectAnswer = (index) => {
  if (showResult.value) return;
  selectedAnswer.value = index;
};

// 提交答案
const submitAnswer = () => {
  if (selectedAnswer.value === null) return;
  
  showResult.value = true;
  
  if (selectedAnswer.value === currentQ.value.correctIndex) {
    correctCount.value++;
  }
};

// 下一题
const nextQuestion = () => {
  if (currentQuestion.value < questions.value.length - 1) {
    currentQuestion.value++;
    selectedAnswer.value = null;
    showResult.value = false;
  } else {
    // 答题结束
    clearInterval(timer);
    quizStatus.value = 'finished';
  }
};

// 重新开始
const restartQuiz = () => {
  currentQuestion.value = 0;
  selectedAnswer.value = null;
  showResult.value = false;
  correctCount.value = 0;
  usedTime.value = 0;
  startQuiz();
};

const closePanel = () => {
  clearInterval(timer);
  emit('close');
};

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
  }
});
</script>

<style scoped>
.quiz-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 500px;
  max-height: 80vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  border: 2px solid #667eea;
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
  border-bottom: 1px solid #667eea;
  background: linear-gradient(90deg, #2d3748 0%, #1a202c 100%);
}

.panel-header h2 {
  margin: 0;
  font-size: 18px;
  color: #667eea;
}

.quiz-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.question-count {
  font-size: 13px;
  color: #a0aec0;
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

.timer-section {
  margin-bottom: 20px;
}

.timer-bar {
  height: 8px;
  background: #2d3748;
  border-radius: 4px;
  overflow: hidden;
}

.timer-fill {
  height: 100%;
  background: linear-gradient(90deg, #48bb78 0%, #38a169 100%);
  border-radius: 4px;
  transition: width 1s linear;
}

.timer-fill.warning {
  background: linear-gradient(90deg, #ed8936 0%, #dd6b20 100%);
}

.timer-fill.critical {
  background: linear-gradient(90deg, #e53e3e 0%, #c53030 100%);
  animation: timerPulse 0.5s ease-in-out infinite;
}

@keyframes timerPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.timer-text {
  text-align: center;
  margin-top: 8px;
  font-size: 14px;
  color: #a0aec0;
}

.timer-text.warning {
  color: #ed8936;
}

.timer-text.critical {
  color: #e53e3e;
}

.quiz-start {
  text-align: center;
  padding: 40px 20px;
}

.start-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.quiz-start h3 {
  margin: 0 0 12px 0;
  font-size: 20px;
  color: #fff;
}

.quiz-start p {
  color: #a0aec0;
  margin-bottom: 8px;
}

.reward-info {
  font-size: 13px;
  color: #48bb78;
}

.reward-info.wrong {
  color: #718096;
}

.start-btn {
  margin-top: 20px;
  padding: 14px 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.start-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
}

.quiz-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.question-section {
  padding: 16px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 12px;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.question-type {
  font-size: 12px;
  padding: 4px 8px;
  background: rgba(102, 126, 234, 0.3);
  border-radius: 4px;
  color: #a0aec0;
}

.question-difficulty {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
}

.difficulty-1 { background: #48bb78; color: white; }
.difficulty-2 { background: #ed8936; color: white; }
.difficulty-3 { background: #e53e3e; color: white; }

.question-text {
  font-size: 16px;
  line-height: 1.6;
  color: #fff;
}

.question-number {
  font-weight: bold;
  color: #667eea;
}

.question-image {
  margin-top: 12px;
  text-align: center;
}

.question-image img {
  max-width: 100%;
  border-radius: 8px;
}

.answers-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.answer-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #2d3748;
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
  text-align: left;
}

.answer-btn:hover:not(:disabled) {
  background: rgba(102, 126, 234, 0.2);
  border-color: rgba(102, 126, 234, 0.4);
}

.answer-btn.selected {
  background: rgba(102, 126, 234, 0.3);
  border-color: #667eea;
}

.answer-btn.correct {
  background: rgba(72, 187, 120, 0.3);
  border-color: #48bb78;
}

.answer-btn.wrong {
  background: rgba(229, 62, 62, 0.3);
  border-color: #e53e3e;
}

.answer-btn:disabled {
  cursor: default;
}

.answer-label {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: rgba(102, 126, 234, 0.3);
  border-radius: 50%;
  font-size: 14px;
  font-weight: bold;
  color: #667eea;
}

.answer-text {
  flex: 1;
  font-size: 14px;
  color: #e2e8f0;
}

.answer-icon {
  font-size: 18px;
  font-weight: bold;
}

.answer-btn.correct .answer-icon {
  color: #48bb78;
}

.answer-btn.wrong .answer-icon {
  color: #e53e3e;
}

.action-section {
  margin-top: 10px;
}

.submit-btn, .next-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.submit-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.submit-btn:disabled {
  background: #4a5568;
  cursor: not-allowed;
}

.next-btn {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
  color: white;
}

.next-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(72, 187, 120, 0.4);
}

.quiz-result {
  text-align: center;
  padding: 30px 20px;
}

.result-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.quiz-result h3 {
  margin: 0 0 24px 0;
  font-size: 22px;
  color: #fff;
}

.result-stats {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 24px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: #718096;
}

.stat-value {
  font-size: 18px;
  font-weight: bold;
  color: #fff;
}

.stat-value.correct {
  color: #48bb78;
}

.result-rewards {
  margin-bottom: 24px;
}

.result-rewards h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #cbd5e0;
}

.reward-items {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.reward-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(102, 126, 234, 0.2);
  border-radius: 8px;
}

.reward-icon {
  font-size: 20px;
}

.reward-name {
  font-size: 13px;
  color: #a0aec0;
}

.reward-amount {
  font-size: 14px;
  font-weight: bold;
  color: #48bb78;
}

.restart-btn {
  padding: 14px 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 15px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.restart-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
}
</style>
