<template>
  <div class="story-panel">
    <div class="panel-header">
      <div class="header-title">📖 修仙剧情</div>
      <button class="close-btn" @click="closePanel">✕</button>
    </div>
    
    <div class="panel-content">
      <!-- 剧情线列表 -->
      <div class="story-lines" v-if="!currentStory">
        <div 
          v-for="line in storyLines" 
          :key="line.id"
          class="story-line-card"
          :class="{ 'locked': !line.isUnlocked, 'completed': line.isCompleted }"
          @click="selectStoryLine(line)"
        >
          <div class="line-icon">{{ line.isUnlocked ? line.icon : '🔒' }}</div>
          <div class="line-info">
            <div class="line-name">{{ line.name }}</div>
            <div class="line-desc">{{ line.description }}</div>
            <div class="line-meta">
              <span class="chapter-count">📑 {{ line.chapterCount }}章</span>
              <span class="requirement" v-if="!line.isUnlocked">
                需要境界: {{ line.requirement?.realm || 1 }}重
              </span>
              <span class="status completed" v-if="line.isCompleted">✅ 已完成</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 剧情线详情 -->
      <div class="story-detail" v-else>
        <button class="back-btn" @click="backToList">← 返回</button>
        
        <div class="detail-header">
          <div class="detail-icon">{{ currentStory.icon }}</div>
          <div class="detail-title">{{ currentStory.name }}</div>
          <div class="detail-desc">{{ currentStory.description }}</div>
        </div>
        
        <!-- 章节列表 -->
        <div class="chapters-list">
          <div 
            v-for="chapter in currentStory.chapters" 
            :key="chapter.id"
            class="chapter-item"
            :class="{ 
              'unlocked': chapter.isUnlocked, 
              'completed': chapter.isCompleted,
              'current': chapter.isCurrent
            }"
            @click="viewChapter(chapter)"
          >
            <div class="chapter-status">
              <span v-if="chapter.isCompleted">✅</span>
              <span v-else-if="chapter.isCurrent">🔄</span>
              <span v-else-if="chapter.isUnlocked">📄</span>
              <span v-else>🔒</span>
            </div>
            <div class="chapter-info">
              <div class="chapter-title">{{ chapter.title }}</div>
              <div class="chapter-desc">{{ chapter.description }}</div>
            </div>
          </div>
        </div>
        
        <!-- 开始剧情按钮 -->
        <div class="start-section" v-if="!currentStory.hasStarted && currentStory.isUnlocked">
          <button class="start-btn" @click="startStory">🚀 开始剧情</button>
        </div>
      </div>
      
      <!-- 剧情章节弹窗 -->
      <div class="chapter-modal" v-if="viewingChapter">
        <div class="modal-content">
          <div class="modal-header">
            <div class="modal-title">{{ viewingChapter.title }}</div>
            <button class="modal-close" @click="closeChapter">✕</button>
          </div>
          
          <div class="chapter-content">
            <div class="content-text" v-html="viewingChapter.content"></div>
            
            <!-- 剧情选项 -->
            <div class="choice-section" v-if="viewingChapter.choices && viewingChapter.choices.length > 0">
              <div class="choice-title">请选择：</div>
              <div 
                v-for="(choice, index) in viewingChapter.choices" 
                :key="index"
                class="choice-item"
                @click="makeChoice(choice)"
              >
                <span class="choice-index">{{ ['A', 'B', 'C', 'D'][index] }}</span>
                <span class="choice-text">{{ choice.text }}</span>
              </div>
            </div>
            
            <!-- 章节奖励 -->
            <div class="reward-section" v-if="viewingChapter.reward">
              <div class="reward-title">🎁 本章奖励</div>
              <div class="reward-items">
                <span v-if="viewingChapter.reward.exp">✨ 经验 +{{ viewingChapter.reward.exp }}</span>
                <span v-if="viewingChapter.reward.spirit_stones">💎 灵石 +{{ viewingChapter.reward.spirit_stones }}</span>
              </div>
            </div>
            
            <!-- 继续按钮 -->
            <div class="continue-section" v-if="viewingChapter.nextChapter">
              <button class="continue-btn" @click="continueStory">
                继续 → 
              </button>
            </div>
            
            <!-- 完成提示 -->
            <div class="complete-section" v-if="viewingChapter.nextChapter === null">
              <div class="complete-message">🎉 剧情线已完成！</div>
              <button class="back-list-btn" @click="backToList">返回剧情列表</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'StoryPanel',
  data() {
    return {
      storyLines: [],
      currentStory: null,
      viewingChapter: null,
      loading: false
    };
  },
  mounted() {
    this.loadStoryLines();
  },
  methods: {
    async loadStoryLines() {
      this.loading = true;
      try {
        const playerId = this.$root.playerId || 'player_1';
        const response = await fetch(`/api/plot/lines?player_id=${playerId}`);
        const result = await response.json();
        
        if (result.success) {
          this.storyLines = result.data;
        }
      } catch (error) {
        console.error('加载剧情线失败:', error);
      }
      this.loading = false;
    },
    
    async selectStoryLine(line) {
      if (!line.isUnlocked) {
        alert('境界不足，无法解锁此剧情线');
        return;
      }
      
      this.loading = true;
      try {
        const playerId = this.$root.playerId || 'player_1';
        const response = await fetch(`/api/plot/line/${line.id}?player_id=${playerId}`);
        const result = await response.json();
        
        if (result.success) {
          this.currentStory = result.data;
        }
      } catch (error) {
        console.error('加载剧情详情失败:', error);
      }
      this.loading = false;
    },
    
    async viewChapter(chapter) {
      if (!chapter.isUnlocked) {
        alert('请先完成前一章');
        return;
      }
      
      this.loading = true;
      try {
        const playerId = this.$root.playerId || 'player_1';
        const response = await fetch(
          `/api/plot/chapter/${this.currentStory.id}/${chapter.id}?player_id=${playerId}`
        );
        const result = await response.json();
        
        if (result.success) {
          this.viewingChapter = result.data;
        }
      } catch (error) {
        console.error('加载章节内容失败:', error);
      }
      this.loading = false;
    },
    
    async startStory() {
      if (!this.currentStory) return;
      
      this.loading = true;
      try {
        const playerId = this.$root.playerId || 'player_1';
        const response = await fetch('/api/plot/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            player_id: playerId,
            plot_line_id: this.currentStory.id
          })
        });
        const result = await response.json();
        
        if (result.success) {
          alert(result.message);
          // 刷新剧情线详情
          this.selectStoryLine(this.currentStory);
        } else {
          alert(result.error || '开始剧情失败');
        }
      } catch (error) {
        console.error('开始剧情失败:', error);
      }
      this.loading = false;
    },
    
    async makeChoice(choice) {
      this.loading = true;
      try {
        const playerId = this.$root.playerId || 'player_1';
        const response = await fetch('/api/plot/choice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            player_id: playerId,
            plot_line_id: this.currentStory.id,
            chapter_id: this.viewingChapter.id,
            choice_index: choice.index
          })
        });
        const result = await response.json();
        
        if (result.success) {
          // 显示选择结果
          if (result.data && result.data.rewards) {
            let rewardText = '选择成功！';
            result.data.rewards.forEach(r => {
              if (r.type === 'exp') rewardText += `\n✨ 经验 +${r.amount}`;
              if (r.type === 'spirit_stones') rewardText += `\n💎 灵石 +${r.amount}`;
            });
            alert(rewardText);
          }
          // 刷新章节内容
          this.viewChapter({ id: this.viewingChapter.id });
          // 更新剧情线详情
          this.selectStoryLine(this.currentStory);
        } else {
          alert(result.error || '选择失败');
        }
      } catch (error) {
        console.error('选择失败:', error);
      }
      this.loading = false;
    },
    
    continueStory() {
      if (this.viewingChapter.nextChapter) {
        this.viewChapter({ id: this.viewingChapter.nextChapter });
      }
    },
    
    closeChapter() {
      this.viewingChapter = null;
    },
    
    backToList() {
      this.currentStory = null;
      this.loadStoryLines();
    },
    
    closePanel() {
      if (this.$root.closePanel) {
        this.$root.closePanel('StoryPanel');
      }
    }
  }
};
</script>

<style scoped>
.story-panel {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  color: #fff;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
}

.header-title {
  font-size: 18px;
  font-weight: bold;
}

.close-btn {
  background: none;
  border: none;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
}

.panel-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

/* 剧情线列表 */
.story-lines {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.story-line-card {
  display: flex;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.story-line-card:hover:not(.locked) {
  background: rgba(255, 255, 255, 0.15);
  transform: translateX(4px);
}

.story-line-card.locked {
  opacity: 0.6;
  cursor: not-allowed;
}

.story-line-card.completed {
  border: 1px solid #4ade80;
}

.line-icon {
  font-size: 36px;
  margin-right: 16px;
}

.line-info {
  flex: 1;
}

.line-name {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 4px;
}

.line-desc {
  font-size: 13px;
  color: #aaa;
  margin-bottom: 8px;
}

.line-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #888;
}

.requirement {
  color: #f59e0b;
}

.status.completed {
  color: #4ade80;
}

/* 剧情详情 */
.back-btn {
  background: none;
  border: none;
  color: #667eea;
  font-size: 14px;
  cursor: pointer;
  margin-bottom: 16px;
}

.detail-header {
  text-align: center;
  margin-bottom: 20px;
}

.detail-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.detail-title {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 8px;
}

.detail-desc {
  font-size: 14px;
  color: #aaa;
}

.chapters-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chapter-item {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.chapter-item:hover:not(.locked) {
  background: rgba(255, 255, 255, 0.1);
}

.chapter-item.locked {
  opacity: 0.5;
  cursor: not-allowed;
}

.chapter-item.completed {
  border-left: 3px solid #4ade80;
}

.chapter-item.current {
  border-left: 3px solid #667eea;
  background: rgba(102, 126, 234, 0.2);
}

.chapter-status {
  font-size: 20px;
  margin-right: 12px;
}

.chapter-title {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 2px;
}

.chapter-desc {
  font-size: 12px;
  color: #888;
}

.start-section {
  margin-top: 20px;
}

.start-btn {
  width: 100%;
  padding: 14px;
  font-size: 16px;
  font-weight: bold;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.start-btn:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
}

/* 章节弹窗 */
.chapter-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 90%;
  max-height: 80%;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
}

.modal-title {
  font-size: 18px;
  font-weight: bold;
}

.modal-close {
  background: none;
  border: none;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
}

.chapter-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.content-text {
  font-size: 15px;
  line-height: 1.8;
  color: #ddd;
  margin-bottom: 20px;
  white-space: pre-wrap;
}

.choice-section {
  margin-bottom: 20px;
}

.choice-title {
  font-size: 14px;
  color: #aaa;
  margin-bottom: 12px;
}

.choice-item {
  display: flex;
  align-items: center;
  background: rgba(102, 126, 234, 0.2);
  border: 1px solid rgba(102, 126, 234, 0.3);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.choice-item:hover {
  background: rgba(102, 126, 234, 0.3);
}

.choice-index {
  width: 28px;
  height: 28px;
  background: #667eea;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-right: 12px;
}

.reward-section {
  background: rgba(74, 222, 128, 0.1);
  border: 1px solid rgba(74, 222, 128, 0.3);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 20px;
}

.reward-title {
  font-size: 14px;
  font-weight: bold;
  color: #4ade80;
  margin-bottom: 8px;
}

.reward-items {
  display: flex;
  gap: 16px;
  font-size: 14px;
}

.continue-section {
  margin-bottom: 20px;
}

.continue-btn {
  width: 100%;
  padding: 14px;
  font-size: 16px;
  font-weight: bold;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 12px;
  cursor: pointer;
}

.complete-section {
  text-align: center;
}

.complete-message {
  font-size: 18px;
  font-weight: bold;
  color: #4ade80;
  margin-bottom: 16px;
}

.back-list-btn {
  padding: 12px 24px;
  font-size: 14px;
  background: #667eea;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
</style>
