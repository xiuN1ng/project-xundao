<template>
  <div class="block-panel" :class="{ active: isVisible }">
    <!-- 格挡触发提示 -->
    <div v-if="showBlock" class="block-notification" :class="{ perfect: isPerfectBlock }">
      <div class="block-shield">🛡️</div>
      <div class="block-text">{{ isPerfectBlock ? '完美格挡!' : '格挡成功!' }}</div>
    </div>
    
    <!-- 格挡特效动画 -->
    <div class="block-effect-container">
      <div 
        v-for="effect in activeEffects" 
        :key="effect.id"
        class="block-effect"
        :class="effect.type"
      >
        <div class="shield-glow"></div>
        <div class="shield-ring">
          <div class="ring-segment" v-for="n in 6" :key="n" :style="{ '--i': n }"></div>
        </div>
        <div class="block-particles">
          <span 
            v-for="n in 12" 
            :key="n" 
            class="particle"
            :style="{ '--i': n }"
          >✦</span>
        </div>
      </div>
    </div>
    
    <!-- 格挡成功动画 -->
    <div class="block-success-container">
      <div 
        v-for="success in successAnimations" 
        :key="success.id"
        class="success-effect"
      >
        <div class="success-shield">🛡️</div>
        <div class="success-ripple"></div>
      </div>
    </div>
    
    <!-- 格挡详情面板 -->
    <div v-if="showDetails" class="block-details">
      <div class="details-header">
        <span class="details-title">🛡️ 格挡系统</span>
        <button class="close-btn" @click="closePanel">×</button>
      </div>
      
      <div class="details-content">
        <!-- 格挡状态 -->
        <div class="block-status">
          <div class="status-item">
            <span class="status-icon">🛡️</span>
            <span class="status-label">格挡状态</span>
            <span class="status-value" :class="{ active: isBlocking }">
              {{ isBlocking ? '格挡中' : '未格挡' }}
            </span>
          </div>
          <div class="status-item">
            <span class="status-icon">⭐</span>
            <span class="status-label">完美格挡</span>
            <span class="status-value perfect">{{ perfectBlockCount }}次</span>
          </div>
        </div>
        
        <!-- 格挡属性 -->
        <div class="block-attributes">
          <h4>格挡属性</h4>
          <div class="attr-grid">
            <div class="attr-item">
              <span class="attr-icon">🔰</span>
              <span class="attr-name">格挡率</span>
              <span class="attr-value">{{ blockRate }}%</span>
            </div>
            <div class="attr-item">
              <span class="attr-icon">💎</span>
              <span class="attr-name">完美率</span>
              <span class="attr-value">{{ perfectRate }}%</span>
            </div>
            <div class="attr-item">
              <span class="attr-icon">🛡️</span>
              <span class="attr-name">减伤</span>
              <span class="attr-value">{{ damageReduction }}%</span>
            </div>
            <div class="attr-item">
              <span class="attr-icon">⚡</span>
              <span class="attr-name">格挡反击</span>
              <span class="attr-value">{{ counterBonus }}%</span>
            </div>
          </div>
        </div>
        
        <!-- 格挡统计 -->
        <div class="block-stats">
          <h4>战斗统计</h4>
          <div class="stats-grid">
            <div class="stat-box">
              <div class="stat-value">{{ totalBlocks }}</div>
              <div class="stat-label">格挡次数</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">{{ successfulBlocks }}</div>
              <div class="stat-label">成功格挡</div>
            </div>
            <div class="stat-box">
              <div class="stat-value perfect">{{ perfectBlocks }}</div>
              <div class="stat-label">完美格挡</div>
            </div>
            <div class="stat-box">
              <div class="stat-value damage">{{ damageBlocked }}</div>
              <div class="stat-label">减免伤害</div>
            </div>
          </div>
        </div>
        
        <!-- 格挡记录 -->
        <div class="block-history">
          <h4>格挡记录</h4>
          <div class="history-list">
            <div 
              v-for="record in blockHistory" 
              :key="record.id"
              class="history-item"
              :class="{ perfect: record.isPerfect }"
            >
              <span class="history-icon">{{ record.isPerfect ? '⭐' : '🛡️' }}</span>
              <span class="history-damage">-{{ record.damageBlocked }}</span>
              <span class="history-time">{{ record.time }}</span>
            </div>
          </div>
        </div>
        
        <!-- 格挡技巧 -->
        <div class="block-tips">
          <h4>格挡技巧</h4>
          <div class="tips-list">
            <div 
              v-for="tip in tips" 
              :key="tip.id"
              class="tip-item"
              :class="{ unlocked: tip.unlocked }"
            >
              <span class="tip-icon">{{ tip.icon }}</span>
              <span class="tip-name">{{ tip.name }}</span>
              <span class="tip-effect">{{ tip.effect }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BlockPanel',
  emits: ['close'],
  data() {
    return {
      isVisible: false,
      showBlock: false,
      showDetails: false,
      isBlocking: false,
      isPerfectBlock: false,
      perfectBlockCount: 0,
      blockRate: 35,
      perfectRate: 15,
      damageReduction: 50,
      counterBonus: 25,
      totalBlocks: 0,
      successfulBlocks: 0,
      perfectBlocks: 0,
      damageBlocked: 0,
      activeEffects: [],
      successAnimations: [],
      blockHistory: [],
      tips: [
        { id: 1, name: '精准格挡', icon: '🎯', effect: '格挡+5%', unlocked: true },
        { id: 2, name: '钢铁意志', icon: '💪', effect: '完美+3%', unlocked: true },
        { id: 3, name: '反击时机', icon: '⚔️', effect: '格挡反击+10%', unlocked: false },
        { id: 4, name: '绝对防御', icon: '🛡️', effect: '完美格挡无敌', unlocked: false },
      ],
      effectId: 0,
      successId: 0,
    };
  },
  methods: {
    // 触发格挡
    triggerBlock(data) {
      const { damage, isPerfect = false, originalDamage = 0 } = data;
      
      this.isPerfectBlock = isPerfect;
      this.showBlock = true;
      this.isBlocking = true;
      
      // 添加格挡特效
      const effect = {
        id: ++this.effectId,
        type: isPerfect ? 'perfect' : 'normal'
      };
      this.activeEffects.push(effect);
      
      // 添加成功动画
      const success = {
        id: ++this.successId
      };
      this.successAnimations.push(success);
      
      // 更新统计
      this.totalBlocks++;
      this.successfulBlocks++;
      const blockedDamage = originalDamage > 0 ? originalDamage * (this.damageReduction / 100) : damage;
      this.damageBlocked += blockedDamage;
      
      if (isPerfect) {
        this.perfectBlocks++;
        this.perfectBlockCount++;
      }
      
      // 添加历史记录
      this.blockHistory.unshift({
        id: Date.now(),
        damageBlocked: Math.round(blockedDamage),
        isPerfect: isPerfect,
        time: new Date().toLocaleTimeString()
      });
      
      // 限制历史记录数量
      if (this.blockHistory.length > 10) {
        this.blockHistory.pop();
      }
      
      // 清理特效
      setTimeout(() => {
        this.activeEffects = this.activeEffects.filter(e => e.id !== effect.id);
      }, 800);
      
      // 清理成功动画
      setTimeout(() => {
        this.successAnimations = this.successAnimations.filter(s => s.id !== success.id);
      }, 600);
      
      // 隐藏格挡提示
      setTimeout(() => {
        this.showBlock = false;
        this.isBlocking = false;
      }, isPerfect ? 800 : 500);
    },
    
    // 开始格挡
    startBlock() {
      this.isBlocking = true;
    },
    
    // 结束格挡
    endBlock() {
      this.isBlocking = false;
    },
    
    // 显示面板
    openPanel() {
      this.isVisible = true;
      this.showDetails = true;
    },
    
    // 关闭面板
    closePanel() {
      this.showDetails = false;
      this.isVisible = false;
      this.$emit('close');
    },
    
    // 更新格挡率
    updateBlockRate(rate) {
      this.blockRate = rate;
    },
    
    // 更新完美格挡率
    updatePerfectRate(rate) {
      this.perfectRate = rate;
    },
    
    // 重置统计
    resetStats() {
      this.totalBlocks = 0;
      this.successfulBlocks = 0;
      this.perfectBlocks = 0;
      this.damageBlocked = 0;
      this.perfectBlockCount = 0;
      this.blockHistory = [];
    }
  }
};
</script>

<style scoped>
.block-panel {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 998;
}

.block-panel.active {
  pointer-events: auto;
}

/* 格挡提示 */
.block-notification {
  position: absolute;
  top: 25%;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px 50px;
  background: linear-gradient(135deg, rgba(52, 152, 219, 0.9), rgba(41, 128, 185, 0.9));
  border-radius: 20px;
  animation: blockPop 0.5s ease-out;
}

.block-notification.perfect {
  background: linear-gradient(135deg, rgba(241, 196, 15, 0.9), rgba(230, 126, 34, 0.9));
  animation: perfectBlockPop 0.6s ease-out;
}

.block-shield {
  font-size: 48px;
  animation: shieldBounce 0.4s ease-in-out infinite;
}

.block-text {
  font-size: 28px;
  font-weight: bold;
  color: white;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
}

@keyframes blockPop {
  0% { transform: translateX(-50%) scale(0); opacity: 0; }
  50% { transform: translateX(-50%) scale(1.1); }
  100% { transform: translateX(-50%) scale(1); opacity: 1; }
}

@keyframes perfectBlockPop {
  0% { transform: translateX(-50%) scale(0) rotate(-10deg); opacity: 0; }
  50% { transform: translateX(-50%) scale(1.3) rotate(5deg); }
  75% { transform: translateX(-50%) scale(0.9) rotate(-3deg); }
  100% { transform: translateX(-50%) scale(1) rotate(0); opacity: 1; }
}

@keyframes shieldBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

/* 格挡特效 */
.block-effect-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.block-effect {
  position: relative;
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: effectPulse 0.8s ease-out forwards;
}

.shield-glow {
  position: absolute;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, rgba(52, 152, 219, 0.6) 0%, transparent 70%);
  animation: glowPulse 0.8s ease-out forwards;
}

.block-effect.perfect .shield-glow {
  background: radial-gradient(circle, rgba(241, 196, 15, 0.8) 0%, transparent 70%);
}

.shield-ring {
  position: absolute;
  width: 100%;
  height: 100%;
}

.ring-segment {
  position: absolute;
  width: 20px;
  height: 20px;
  border: 2px solid #3498db;
  border-radius: 50%;
  left: 50%;
  top: 50%;
  transform: rotate(calc(var(--i) * 60deg)) translateX(80px);
  animation: segmentRotate 0.8s ease-out forwards;
  animation-delay: calc(var(--i) * 0.05s);
}

.block-effect.perfect .ring-segment {
  border-color: #f1c40f;
}

@keyframes glowPulse {
  0% { transform: scale(0.5); opacity: 1; }
  100% { transform: scale(2); opacity: 0; }
}

@keyframes segmentRotate {
  0% { transform: rotate(calc(var(--i) * 60deg)) translateX(30px) scale(0); }
  50% { transform: rotate(calc(var(--i) * 60deg)) translateX(90px) scale(1.2); }
  100% { transform: rotate(calc(var(--i) * 60deg)) translateX(100px) scale(0.8); opacity: 0; }
}

.block-particles {
  position: absolute;
  width: 100%;
  height: 100%;
}

.particle {
  position: absolute;
  font-size: 16px;
  color: #3498db;
  left: 50%;
  top: 50%;
  transform: rotate(calc(var(--i) * 30deg)) translateX(50px);
  animation: particleFloat 0.8s ease-out forwards;
  animation-delay: calc(var(--i) * 0.03s);
}

.block-effect.perfect .particle {
  color: #f1c40f;
}

@keyframes particleFloat {
  0% { transform: rotate(calc(var(--i) * 30deg)) translateX(30px) scale(0); opacity: 1; }
  100% { transform: rotate(calc(var(--i) * 30deg)) translateX(90px) scale(1); opacity: 0; }
}

@keyframes effectPulse {
  0% { transform: scale(0.5); opacity: 1; }
  100% { transform: scale(1.5); opacity: 0; }
}

/* 成功动画 */
.block-success-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.success-effect {
  position: relative;
  animation: successPop 0.6s ease-out forwards;
}

.success-shield {
  font-size: 64px;
  animation: shieldShine 0.6s ease-out;
}

.success-ripple {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100px;
  height: 100px;
  border: 3px solid rgba(52, 152, 219, 0.8);
  border-radius: 50%;
  animation: rippleExpand 0.6s ease-out forwards;
}

@keyframes successPop {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1); opacity: 0; }
}

@keyframes shieldShine {
  0% { filter: brightness(1); }
  50% { filter: brightness(2); }
  100% { filter: brightness(1); }
}

@keyframes rippleExpand {
  0% { width: 0; height: 0; opacity: 1; }
  100% { width: 150px; height: 150px; opacity: 0; }
}

/* 详情面板 */
.block-details {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 480px;
  max-height: 80vh;
  background: linear-gradient(135deg, #2980b9 0%, #3498db 100%);
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  color: white;
  z-index: 1000;
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.details-title {
  font-size: 20px;
  font-weight: bold;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.3s;
}

.close-btn:hover {
  opacity: 1;
}

.details-content {
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
}

/* 格挡状态 */
.block-status {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
}

.status-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
}

.status-icon {
  font-size: 24px;
  margin-bottom: 5px;
}

.status-label {
  font-size: 12px;
  opacity: 0.8;
}

.status-value {
  font-size: 18px;
  font-weight: bold;
  margin-top: 5px;
}

.status-value.active {
  color: #2ecc71;
}

.status-value.perfect {
  color: #f1c40f;
}

/* 属性 */
.block-attributes {
  margin-bottom: 20px;
}

.block-attributes h4 {
  margin-bottom: 10px;
  font-size: 16px;
}

.attr-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.attr-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.attr-icon {
  font-size: 20px;
  margin-bottom: 5px;
}

.attr-name {
  font-size: 12px;
  opacity: 0.8;
}

.attr-value {
  font-size: 18px;
  font-weight: bold;
  color: #f1c40f;
}

/* 统计 */
.block-stats {
  margin-bottom: 20px;
}

.block-stats h4 {
  margin-bottom: 10px;
  font-size: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.stat-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
}

.stat-value.perfect {
  color: #f1c40f;
}

.stat-value.damage {
  color: #2ecc71;
}

.stat-label {
  font-size: 12px;
  opacity: 0.8;
  margin-top: 5px;
}

/* 历史记录 */
.block-history {
  margin-bottom: 20px;
}

.block-history h4 {
  margin-bottom: 10px;
  font-size: 16px;
}

.history-list {
  max-height: 120px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 5px;
  margin-bottom: 5px;
}

.history-item.perfect {
  background: rgba(241, 196, 15, 0.2);
  border: 1px solid rgba(241, 196, 15, 0.3);
}

.history-icon {
  font-size: 16px;
}

.history-damage {
  flex: 1;
  color: #2ecc71;
  font-weight: bold;
}

.history-time {
  font-size: 12px;
  opacity: 0.7;
}

/* 技巧 */
.block-tips h4 {
  margin-bottom: 10px;
  font-size: 16px;
}

.tips-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tip-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  opacity: 0.6;
}

.tip-item.unlocked {
  opacity: 1;
  background: rgba(46, 204, 113, 0.2);
  border: 1px solid rgba(46, 204, 113, 0.3);
}

.tip-icon {
  font-size: 20px;
}

.tip-name {
  flex: 1;
  font-size: 14px;
}

.tip-effect {
  font-size: 12px;
  color: #2ecc71;
}
</style>
