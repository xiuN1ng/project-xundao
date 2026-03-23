<template>
  <div class="marriage-panel">
    <div class="panel-header">
      <h2>🏩 婚姻系统</h2>
      <button class="close-btn" @click="closePanel">×</button>
    </div>
    
    <div class="panel-content">
      <!-- 求婚状态 -->
      <div v-if="!isMarried" class="proposal-section">
        <div class="status-info">
          <span class="label">当前状态:</span>
          <span class="value">{{ hasPartner ? '有伴侣' : '单身' }}</span>
        </div>
        
        <div v-if="hasPartner && !proposed" class="proposal-actions">
          <h3>💍 求婚</h3>
          <p>向TA发送求婚请求</p>
          <button class="action-btn propose-btn" @click="propose">
            发送求婚 💍
          </button>
        </div>
        
        <div v-if="proposePending" class="pending-status">
          <p>⏳ 等待对方响应...</p>
          <button class="cancel-btn" @click="cancelProposal">取消求婚</button>
        </div>
      </div>
      
      <!-- 已婚状态 -->
      <div v-else class="married-section">
        <div class="spouse-info">
          <div class="avatar-area">
            <div class="avatar spouse-avatar">👫</div>
            <div class="spouse-name">{{ spouseName }}</div>
          </div>
          
          <div class="wedding-date">
            <span class="label">结婚日期:</span>
            <span class="value">{{ weddingDate }}</span>
          </div>
          
          <div class="love-level">
            <span class="label">亲密度:</span>
            <div class="love-bar">
              <div class="love-fill" :style="{ width: loveLevel + '%' }"></div>
            </div>
            <span class="love-value">{{ loveLevel }}%</span>
          </div>
        </div>
        
        <!-- 夫妻技能 -->
        <div class="couple-skills">
          <h3>💕 夫妻技能</h3>
          <div class="skill-list">
            <div 
              v-for="skill in coupleSkills" 
              :key="skill.id"
              class="skill-item"
              :class="{ active: skill.unlocked }"
            >
              <span class="skill-icon">{{ skill.icon }}</span>
              <span class="skill-name">{{ skill.name }}</span>
              <span class="skill-effect">+{{ skill.effect }}%</span>
            </div>
          </div>
        </div>
        
        <!-- 互动动作 -->
        <div class="interaction-actions">
          <h3>❤️ 亲密互动</h3>
          <div class="action-buttons">
            <button 
              v-for="action in interactions" 
              :key="action.id"
              class="interaction-btn"
              :disabled="action.cooldown > 0"
              @click="doInteraction(action.id)"
            >
              <span class="icon">{{ action.icon }}</span>
              <span class="name">{{ action.name }}</span>
              <span v-if="action.cooldown > 0" class="cooldown">
                {{ action.cooldown }}s
              </span>
            </button>
          </div>
        </div>
        
        <!-- 离婚选项 -->
        <div class="divorce-section">
          <button class="divorce-btn" @click="showDivorceConfirm">
            💔 离婚
          </button>
        </div>
      </div>
      
      <!-- 婚礼特效 -->
      <div v-if="showWeddingEffect" class="wedding-effect">
        <div class="hearts">💕 💗 💖 💘 💝</div>
        <div class="effect-text">恭喜结婚！</div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MarriagePanel',
  data() {
    return {
      isMarried: false,
      hasPartner: false,
      proposed: false,
      proposePending: false,
      spouseName: '',
      weddingDate: '',
      loveLevel: 50,
      showWeddingEffect: false,
      coupleSkills: [
        { id: 1, name: '双修加成', icon: '🧘', effect: 10, unlocked: true },
        { id: 2, name: '经验共享', icon: '📖', effect: 15, unlocked: false },
        { id: 3, name: '属性共鸣', icon: '⚡', effect: 20, unlocked: false },
      ],
      interactions: [
        { id: 'hug', name: '拥抱', icon: '🤗', cooldown: 0 },
        { id: 'kiss', name: '亲吻', icon: '💏', cooldown: 0 },
        { id: 'gift', name: '送礼', icon: '🎁', cooldown: 0 },
        { id: 'chat', name: '私聊', icon: '💬', cooldown: 0 },
      ],
    };
  },
  methods: {
    closePanel() {
      this.$emit('close');
    },
    propose() {
      this.proposePending = true;
      // 发送求婚请求API
    },
    cancelProposal() {
      this.proposePending = false;
    },
    doInteraction(actionId) {
      const action = this.interactions.find(a => a.id === actionId);
      if (action) {
        action.cooldown = 60;
        this.loveLevel = Math.min(100, this.loveLevel + 5);
        
        // 播放互动特效
        this.showInteractionEffect(actionId);
        
        // 冷却计时
        const timer = setInterval(() => {
          action.cooldown--;
          if (action.cooldown <= 0) {
            clearInterval(timer);
          }
        }, 1000);
      }
    },
    showInteractionEffect(actionId) {
      // 显示互动特效
    },
    showDivorceConfirm() {
      if (confirm('确定要离婚吗？离婚后将解除夫妻关系！')) {
        this.divorce();
      }
    },
    divorce() {
      this.isMarried = false;
      this.hasPartner = false;
    },
  },
};
</script>

<style scoped>
.marriage-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 500px;
  max-height: 80vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  color: white;
  z-index: 1000;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.panel-content {
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
}

.proposal-section, .married-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.status-info, .wedding-date, .love-level {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

.love-bar {
  flex: 1;
  height: 20px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  overflow: hidden;
}

.love-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff6b6b, #ee5a6f);
  transition: width 0.3s ease;
}

.action-btn, .interaction-btn, .divorce-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s ease;
}

.propose-btn {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.interaction-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.interaction-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.interaction-btn:disabled {
  opacity: 0.5;
}

.divorce-section {
  margin-top: 20px;
  text-align: center;
}

.divorce-btn {
  background: rgba(255, 0, 0, 0.5);
  color: white;
}

.wedding-effect {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 48px;
  animation: weddingAnim 2s ease-in-out;
}

@keyframes weddingAnim {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.5; }
}
</style>
