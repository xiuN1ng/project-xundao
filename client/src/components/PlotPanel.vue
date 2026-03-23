<template>
  <div class="plot-panel">
    <div class="plot-header">
      <div class="plot-title">📖 剧情</div>
      <div class="plot-stats">
        <span>进度: {{ completedChapters }}/{{ totalChapters }}</span>
        <span class="completion-rate">{{ completionRate }}%</span>
      </div>
    </div>
    
    <!-- 剧情进度条 -->
    <div class="plot-progress-bar">
      <div class="progress-fill" :style="{ width: completionRate + '%' }"></div>
    </div>
    
    <!-- 剧情线列表 -->
    <div class="plot-lines">
      <div 
        v-for="line in plotLines" 
        :key="line.id"
        class="plot-line-item"
        :class="{ 
          locked: !line.isUnlocked, 
          completed: line.isCompleted,
          unlocked: line.isUnlocked && !line.isCompleted 
        }"
        @click="selectPlotLine(line)"
      >
        <div class="plot-line-icon">
          <span v-if="line.isCompleted">✅</span>
          <span v-else-if="!line.isUnlocked">🔒</span>
          <span v-else>{{ line.icon }}</span>
        </div>
        <div class="plot-line-info">
          <div class="plot-line-name">{{ line.name }}</div>
          <div class="plot-line-desc">{{ line.description }}</div>
          <div class="plot-line-meta">
            <span class="chapter-count">共 {{ line.chapterCount }} 章</span>
            <span class="requirement" v-if="!line.isUnlocked">
              需要境界: {{ line.requirement.realm }}重
            </span>
            <span class="status completed" v-if="line.isCompleted">已完成</span>
            <span class="status in-progress" v-else-if="line.isUnlocked">可体验</span>
          </div>
        </div>
        <div class="plot-line-arrow">›</div>
      </div>
    </div>

    <!-- 剧情详情弹窗 -->
    <div class="modal-overlay" v-if="selectedLine" @click="closeDetail">
      <div class="plot-detail" @click.stop>
        <div class="detail-header">
          <div class="detail-icon">{{ selectedLine.icon }}</div>
          <div class="detail-title">{{ selectedLine.name }}</div>
          <button class="close-btn" @click="closeDetail">×</button>
        </div>
        
        <div class="detail-body">
          <p class="detail-desc">{{ selectedLine.description }}</p>
          
          <!-- 章节列表 -->
          <div class="chapter-list">
            <h4>章节列表</h4>
            <div 
              v-for="chapter in selectedLine.chapters" 
              :key="chapter.id"
              class="chapter-item"
              :class="{ 
                locked: !chapter.isUnlocked,
                completed: chapter.isCompleted,
                current: chapter.id === selectedLine.currentChapter && !chapter.isCompleted
              }"
            >
              <span class="chapter-status">
                <span v-if="chapter.isCompleted">✅</span>
                <span v-else-if="chapter.id === selectedLine.currentChapter">▶️</span>
                <span v-else-if="!chapter.isUnlocked">🔒</span>
                <span v-else>⭕</span>
              </span>
              <span class="chapter-title">{{ chapter.title }}</span>
            </div>
          </div>
          
          <!-- 奖励信息 -->
          <div class="reward-info" v-if="selectedLine.reward">
            <h4>完成奖励:</h4>
            <div class="reward-badge" v-if="selectedLine.reward.title">
              <span>🏅 {{ selectedLine.reward.title }}</span>
            </div>
          </div>
          
          <!-- 操作按钮 -->
          <div class="detail-actions">
            <button 
              v-if="!selectedLine.isCompleted && selectedLine.isUnlocked"
              class="action-btn primary"
              @click="startPlot"
              :disabled="loading"
            >
              {{ selectedLine.currentChapter > 1 ? '继续剧情' : '开始剧情' }}
            </button>
            <button 
              v-if="selectedLine.isCompleted"
              class="action-btn"
              disabled
            >
              已完成
            </button>
            <button 
              v-if="!selectedLine.isUnlocked"
              class="action-btn"
              disabled
            >
              境界不足
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 剧情内容弹窗 -->
    <div class="modal-overlay" v-if="showChapter" @click="closeChapter">
      <div class="chapter-content" @click.stop>
        <div class="chapter-header">
          <div class="chapter-title">{{ currentChapter?.title }}</div>
          <div class="chapter-progress">{{ currentChapter?.id }} / {{ totalChaptersInLine }}</div>
          <button class="close-btn" @click="closeChapter">×</button>
        </div>
        
        <div class="chapter-body">
          <div class="chapter-text">{{ currentChapter?.content }}</div>
          
          <!-- 选择选项 -->
          <div class="choices" v-if="currentChapter?.choices && !isChapterCompleted">
            <div 
              v-for="choice in currentChapter.choices" 
              :key="choice.id"
              class="choice-item"
              @click="makeChoice(choice.id)"
              :class="{ disabled: loading }"
            >
              {{ choice.text }}
            </div>
          </div>
          
          <!-- 章节完成提示 -->
          <div class="chapter-complete" v-if="isChapterCompleted">
            <div class="complete-message">章节已完成</div>
            <button class="action-btn primary" @click="nextChapterContent" :disabled="loading">
              继续阅读
            </button>
          </div>
        </div>
        
        <!-- 奖励提示 -->
        <div class="rewards-toast" v-if="showRewards" @click="showRewards = false">
          <div class="rewards-content">
            <h4>🎉 获得奖励</h4>
            <div v-for="(reward, idx) in lastRewards" :key="idx" class="reward-row">
              <span v-if="reward.type === 'spirit_stones'">💎 灵石 +{{ reward.amount }}</span>
              <span v-else-if="reward.type === 'exp'">⭐ 经验 +{{ reward.amount }}</span>
              <span v-else-if="reward.type === 'item'">📦 {{ reward.item }} x{{ reward.quantity }}</span>
              <span v-else-if="reward.type === 'title'">🏅 获得称号: {{ reward.title }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PlotPanel',
  emits: ['close'],
  data() {
    return {
      plotLines: [],
      selectedLine: null,
      showChapter: false,
      currentChapter: null,
      totalChaptersInLine: 0,
      isChapterCompleted: false,
      loading: false,
      showRewards: false,
      lastRewards: [],
      completedChapters: 0,
      totalChapters: 0,
      completionRate: 0,
      playerId: null
    };
  },
  mounted() {
    // 获取 player_id
    this.playerId = this.getPlayerId();
    this.loadPlotStatus();
  },
  methods: {
    getPlayerId() {
      // 尝试从多个来源获取 player_id
      if (window.player_id) {
        return window.player_id;
      }
      // 从 localStorage 获取
      const userStr = localStorage.getItem('currentUser');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          return user.id;
        } catch (e) {
          console.error('解析用户信息失败:', e);
        }
      }
      return null;
    },
    async loadPlotStatus() {
      const pid = this.playerId || this.getPlayerId();
      if (!pid) {
        console.error('无法获取 player_id');
        return;
      }
      try {
        const response = await fetch(`/api/plot/status?player_id=${pid}`);
        const result = await response.json();
        if (result.success) {
          this.completedChapters = result.data.completedChapters;
          this.totalChapters = result.data.totalChapters;
          this.completionRate = result.data.completionRate;
        }
      } catch (e) {
        console.error('加载剧情状态失败:', e);
      }
      this.loadPlotLines();
    },
    async loadPlotLines() {
      const pid = this.playerId || this.getPlayerId();
      if (!pid) return;
      try {
        const response = await fetch(`/api/plot/lines?player_id=${pid}`);
        const result = await response.json();
        if (result.success) {
          this.plotLines = result.data;
        }
      } catch (e) {
        console.error('加载剧情线失败:', e);
      }
    },
    async selectPlotLine(line) {
      if (!line.isUnlocked) return;
      const pid = this.playerId || this.getPlayerId();
      if (!pid) return;
      
      try {
        const response = await fetch(`/api/plot/line/${line.id}?player_id=${pid}`);
        const result = await response.json();
        if (result.success) {
          this.selectedLine = result.data;
          this.totalChaptersInLine = result.data.chapters.length;
        }
      } catch (e) {
        console.error('加载剧情详情失败:', e);
      }
    },
    closeDetail() {
      this.selectedLine = null;
    },
    async startPlot() {
      if (!this.selectedLine) return;
      const pid = this.playerId || this.getPlayerId();
      if (!pid) return;
      
      this.loading = true;
      try {
        const response = await fetch('/api/plot/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            player_id: pid, 
            plotLineId: this.selectedLine.id 
          })
        });
        const result = await response.json();
        
        if (result.success) {
          this.selectedLine.currentChapter = result.data.currentChapter;
          await this.loadChapterContent(result.data.currentChapter);
        } else {
          alert(result.error || '开始剧情失败');
        }
      } catch (e) {
        console.error('开始剧情失败:', e);
      }
      this.loading = false;
    },
    async loadChapterContent(chapterId) {
      if (!this.selectedLine) return;
      const pid = this.playerId || this.getPlayerId();
      if (!pid) return;
      
      try {
        const response = await fetch(
          `/api/plot/chapter/${this.selectedLine.id}/${chapterId}?player_id=${pid}`
        );
        const result = await response.json();
        
        if (result.success) {
          this.currentChapter = result.data;
          this.isChapterCompleted = result.data.isCompleted;
          this.showChapter = true;
          this.selectedLine = null;
        } else {
          alert(result.error || '加载章节失败');
        }
      } catch (e) {
        console.error('加载章节失败:', e);
      }
    },
    async makeChoice(choiceId) {
      if (!this.selectedLine || !this.currentChapter) return;
      const pid = this.playerId || this.getPlayerId();
      if (!pid) return;
      
      this.loading = true;
      try {
        const response = await fetch('/api/plot/choice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            player_id: pid, 
            plotLineId: this.selectedLine.id,
            choiceId: choiceId
          })
        });
        const result = await response.json();
        
        if (result.success) {
          // 显示奖励
          if (result.data.rewards && result.data.rewards.length > 0) {
            this.lastRewards = result.data.rewards;
            this.showRewards = true;
            
            // 3秒后自动关闭奖励提示
            setTimeout(() => {
              this.showRewards = false;
            }, 3000);
          }
          
          if (result.data.isCompleted) {
            // 剧情完成
            alert('🎉 恭喜完成剧情！');
            this.closeChapter();
            this.loadPlotLines();
            this.loadPlotStatus();
          } else if (result.data.nextChapter) {
            // 加载下一章
            await this.loadChapterContent(result.data.nextChapter.id);
          }
        } else {
          alert(result.error || '选择失败');
        }
      } catch (e) {
        console.error('选择失败:', e);
      }
      this.loading = false;
    },
    closeChapter() {
      this.showChapter = false;
      this.currentChapter = null;
      this.showRewards = false;
      this.loadPlotLines();
    },
    async nextChapterContent() {
      if (!this.selectedLine) return;
      const nextId = this.currentChapter.id + 1;
      if (nextId <= this.totalChaptersInLine) {
        await this.loadChapterContent(nextId);
      } else {
        this.closeChapter();
      }
    }
  }
};
</script>

<style scoped>
.plot-panel {
  width: 100%;
  max-width: 600px;
  max-height: 80vh;
  background: rgba(18, 18, 32, 0.95);
  border-radius: 16px;
  border: 1px solid rgba(184, 134, 11, 0.3);
  overflow: hidden;
}

.plot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, rgba(184, 134, 11, 0.2), rgba(138, 43, 226, 0.1));
  border-bottom: 1px solid rgba(184, 134, 11, 0.2);
}

.plot-title {
  font-size: 24px;
  font-weight: bold;
  color: #ffd700;
}

.plot-stats {
  color: #a0a0b8;
  font-size: 14px;
}

.completion-rate {
  color: #00ff88;
  margin-left: 10px;
}

.plot-progress-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 20px;
  border-radius: 2px;
  overflow: hidden;
}

.plot-progress-bar .progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #b8860b, #ffd700);
  transition: width 0.3s ease;
}

.plot-lines {
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
}

.plot-line-item {
  display: flex;
  align-items: center;
  padding: 16px;
  margin-bottom: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(184, 134, 11, 0.15);
  cursor: pointer;
  transition: all 0.2s ease;
}

.plot-line-item:hover:not(.locked) {
  background: rgba(184, 134, 11, 0.1);
  border-color: rgba(184, 134, 11, 0.3);
  transform: translateX(4px);
}

.plot-line-item.locked {
  opacity: 0.5;
  cursor: not-allowed;
}

.plot-line-item.completed {
  border-color: rgba(0, 255, 136, 0.3);
}

.plot-line-icon {
  font-size: 32px;
  margin-right: 16px;
}

.plot-line-info {
  flex: 1;
}

.plot-line-name {
  font-size: 18px;
  font-weight: bold;
  color: #e8e8f0;
  margin-bottom: 4px;
}

.plot-line-desc {
  font-size: 13px;
  color: #a0a0b8;
  margin-bottom: 8px;
}

.plot-line-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #606080;
}

.plot-line-meta .requirement {
  color: #ff8c00;
}

.plot-line-meta .status.completed {
  color: #00ff88;
}

.plot-line-meta .status.in-progress {
  color: #00ffff;
}

.plot-line-arrow {
  font-size: 24px;
  color: #606080;
}

/* 详情弹窗 */
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

.plot-detail {
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  background: rgba(18, 18, 32, 0.98);
  border-radius: 16px;
  border: 1px solid rgba(184, 134, 11, 0.4);
  overflow: hidden;
}

.detail-header {
  display: flex;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, rgba(184, 134, 11, 0.2), rgba(138, 43, 226, 0.1));
  border-bottom: 1px solid rgba(184, 134, 11, 0.2);
}

.detail-icon {
  font-size: 36px;
  margin-right: 16px;
}

.detail-title {
  flex: 1;
  font-size: 22px;
  font-weight: bold;
  color: #ffd700;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: #a0a0b8;
  font-size: 20px;
  border-radius: 50%;
  cursor: pointer;
}

.close-btn:hover {
  background: rgba(255, 100, 100, 0.3);
  color: #fff;
}

.detail-body {
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
}

.detail-desc {
  color: #a0a0b8;
  line-height: 1.6;
  margin-bottom: 20px;
}

.chapter-list h4,
.reward-info h4 {
  color: #e8e8f0;
  margin-bottom: 12px;
  font-size: 16px;
}

.chapter-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  font-size: 14px;
}

.chapter-item.locked {
  opacity: 0.4;
}

.chapter-item.completed {
  color: #00ff88;
}

.chapter-item.current {
  background: rgba(184, 134, 11, 0.2);
  color: #ffd700;
}

.chapter-status {
  margin-right: 10px;
}

.reward-badge {
  display: inline-block;
  padding: 8px 16px;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(184, 134, 11, 0.2));
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 20px;
  color: #ffd700;
  font-size: 14px;
}

.detail-actions {
  margin-top: 20px;
  display: flex;
  gap: 12px;
}

.action-btn {
  flex: 1;
  padding: 14px 24px;
  border: 1px solid rgba(184, 134, 11, 0.3);
  background: rgba(255, 255, 255, 0.05);
  color: #e8e8f0;
  font-size: 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover:not(:disabled) {
  background: rgba(184, 134, 11, 0.2);
  border-color: rgba(184, 134, 11, 0.5);
}

.action-btn.primary {
  background: linear-gradient(135deg, rgba(184, 134, 11, 0.4), rgba(218, 165, 32, 0.3));
  border-color: rgba(255, 215, 0, 0.5);
  color: #ffd700;
}

.action-btn.primary:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(184, 134, 11, 0.6), rgba(218, 165, 32, 0.5));
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 章节内容弹窗 */
.chapter-content {
  width: 90%;
  max-width: 600px;
  max-height: 85vh;
  background: rgba(18, 18, 32, 0.98);
  border-radius: 16px;
  border: 1px solid rgba(184, 134, 11, 0.4);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.chapter-header {
  display: flex;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, rgba(184, 134, 11, 0.2), rgba(138, 43, 226, 0.1));
  border-bottom: 1px solid rgba(184, 134, 11, 0.2);
}

.chapter-header .chapter-title {
  flex: 1;
  font-size: 20px;
  font-weight: bold;
  color: #ffd700;
}

.chapter-progress {
  font-size: 14px;
  color: #a0a0b8;
  margin-right: 16px;
}

.chapter-body {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.chapter-text {
  color: #e8e8f0;
  line-height: 1.8;
  font-size: 15px;
  white-space: pre-wrap;
  margin-bottom: 24px;
}

.choices {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.choice-item {
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(184, 134, 11, 0.2);
  border-radius: 8px;
  color: #e8e8f0;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.choice-item:hover:not(.disabled) {
  background: rgba(184, 134, 11, 0.15);
  border-color: rgba(255, 215, 0, 0.4);
  transform: translateX(4px);
}

.choice-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chapter-complete {
  text-align: center;
  padding: 20px;
}

.complete-message {
  color: #00ff88;
  font-size: 18px;
  margin-bottom: 16px;
}

/* 奖励提示 */
.rewards-toast {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(18, 18, 32, 0.98);
  border: 2px solid rgba(255, 215, 0, 0.5);
  border-radius: 16px;
  padding: 24px 32px;
  z-index: 1001;
  cursor: pointer;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

.rewards-content h4 {
  color: #ffd700;
  margin-bottom: 16px;
  text-align: center;
}

.reward-row {
  color: #e8e8f0;
  padding: 8px 0;
  text-align: center;
  font-size: 15px;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: rgba(184, 134, 11, 0.3);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(184, 134, 11, 0.5);
}
</style>
