<template>
  <div class="counter-attack-panel" :class="{ active: isVisible }">
    <!-- 反击触发提示 -->
    <div v-if="showTrigger" class="trigger-notification">
      <div class="trigger-icon">⚔️</div>
      <div class="trigger-text">反击！</div>
    </div>
    
    <!-- 反击伤害飘字 -->
    <div class="damage-float-container">
      <div 
        v-for="damage in damageFloats" 
        :key="damage.id"
        class="damage-float"
        :class="damage.type"
        :style="damage.style"
      >
        <span class="damage-value">{{ damage.value }}</span>
        <span v-if="damage.isCritical" class="damage-critical">暴击!</span>
      </div>
    </div>
    
    <!-- 反击特效动画 -->
    <div class="counter-effect-container">
      <div 
        v-for="effect in activeEffects" 
        :key="effect.id"
        class="counter-effect"
        :class="effect.type"
      >
        <div class="effect-ring"></div>
        <div class="effect-particles">
          <span 
            v-for="n in 8" 
            :key="n" 
            class="particle"
            :style="{ '--i': n }"
          >✦</span>
        </div>
        <div class="effect-center">{{ effect.icon }}</div>
      </div>
    </div>
    
    <!-- 反击详情面板 -->
    <div v-if="showDetails" class="counter-details">
      <div class="details-header">
        <span class="details-title">⚔️ 反击详情</span>
        <button class="close-btn" @click="closePanel">×</button>
      </div>
      
      <div class="details-content">
        <!-- 反击统计 -->
        <div class="counter-stats">
          <div class="stat-item">
            <span class="stat-label">反击次数</span>
            <span class="stat-value">{{ totalCounters }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">反击伤害</span>
            <span class="stat-value damage">{{ totalDamage }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">暴击次数</span>
            <span class="stat-value critical">{{ criticalCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">反击率</span>
            <span class="stat-value">{{ counterRate }}%</span>
          </div>
        </div>
        
        <!-- 反击历史 -->
        <div class="counter-history">
          <h4>反击记录</h4>
          <div class="history-list">
            <div 
              v-for="record in counterHistory" 
              :key="record.id"
              class="history-item"
              :class="{ critical: record.isCritical }"
            >
              <span class="history-target">{{ record.target }}</span>
              <span class="history-damage">{{ record.damage }}</span>
              <span v-if="record.isCritical" class="history-critical">暴击</span>
            </div>
          </div>
        </div>
        
        <!-- 反击加成 -->
        <div class="counter-bonus">
          <h4>反击加成</h4>
          <div class="bonus-list">
            <div 
              v-for="bonus in bonuses" 
              :key="bonus.id"
              class="bonus-item"
              :class="{ active: bonus.active }"
            >
              <span class="bonus-icon">{{ bonus.icon }}</span>
              <span class="bonus-name">{{ bonus.name }}</span>
              <span class="bonus-value">+{{ bonus.value }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CounterAttackPanel',
  emits: ['close'],
  data() {
    return {
      isVisible: false,
      showTrigger: false,
      showDetails: false,
      totalCounters: 0,
      totalDamage: 0,
      criticalCount: 0,
      counterRate: 0,
      damageFloats: [],
      activeEffects: [],
      counterHistory: [],
      bonuses: [
        { id: 1, name: '反击专精', icon: '⚔️', value: 20, active: true },
        { id: 2, name: '反击暴击', icon: '💥', value: 15, active: true },
        { id: 3, name: '反击连携', icon: '🔗', value: 10, active: false },
        { id: 4, name: '反击强化', icon: '💪', value: 25, active: true },
      ],
      effectId: 0,
      damageId: 0,
    };
  },
  methods: {
    // 触发反击
    triggerCounter(data) {
      const { target, damage, isCritical = false, attackerDamage = 0 } = data;
      
      this.showTrigger = true;
      
      // 添加反击伤害飘字
      const damageFloat = {
        id: ++this.damageId,
        value: `-${damage}`,
        type: isCritical ? 'critical' : 'normal',
        style: {
          '--x': (Math.random() - 0.5) * 200 + 'px',
          '--delay': '0s'
        }
      };
      this.damageFloats.push(damageFloat);
      
      // 添加反击特效
      const effect = {
        id: ++this.effectId,
        type: isCritical ? 'critical' : 'normal',
        icon: isCritical ? '💥' : '⚔️'
      };
      this.activeEffects.push(effect);
      
      // 更新统计
      this.totalCounters++;
      this.totalDamage += damage;
      if (isCritical) this.criticalCount++;
      
      // 添加历史记录
      this.counterHistory.unshift({
        id: Date.now(),
        target: target,
        damage: damage,
        isCritical: isCritical
      });
      
      // 限制历史记录数量
      if (this.counterHistory.length > 10) {
        this.counterHistory.pop();
      }
      
      // 清理飘字
      setTimeout(() => {
        this.damageFloats = this.damageFloats.filter(d => d.id !== damageFloat.id);
      }, 1000);
      
      // 清理特效
      setTimeout(() => {
        this.activeEffects = this.activeEffects.filter(e => e.id !== effect.id);
      }, 800);
      
      // 隐藏触发提示
      setTimeout(() => {
        this.showTrigger = false;
      }, 500);
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
    
    // 更新反击率
    updateCounterRate(rate) {
      this.counterRate = rate;
    },
    
    // 重置统计
    resetStats() {
      this.totalCounters = 0;
      this.totalDamage = 0;
      this.criticalCount = 0;
      this.counterRate = 0;
      this.counterHistory = [];
    }
  }
};
</script>

<style scoped>
.counter-attack-panel {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 999;
}

.counter-attack-panel.active {
  pointer-events: auto;
}

/* 触发通知 */
.trigger-notification {
  position: absolute;
  top: 30%;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px 40px;
  background: linear-gradient(135deg, rgba(231, 76, 60, 0.9), rgba(192, 57, 43, 0.9));
  border-radius: 50px;
  animation: triggerPop 0.5s ease-out;
}

.trigger-icon {
  font-size: 48px;
  animation: iconShake 0.3s ease-in-out infinite;
}

.trigger-text {
  font-size: 36px;
  font-weight: bold;
  color: white;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
}

@keyframes triggerPop {
  0% { transform: translateX(-50%) scale(0); opacity: 0; }
  50% { transform: translateX(-50%) scale(1.2); }
  100% { transform: translateX(-50%) scale(1); opacity: 1; }
}

@keyframes iconShake {
  0%, 100% { transform: rotate(-10deg); }
  50% { transform: rotate(10deg); }
}

/* 伤害飘字 */
.damage-float-container {
  position: absolute;
  top: 40%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.damage-float {
  position: absolute;
  left: var(--x);
  font-size: 32px;
  font-weight: bold;
  color: #fff;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  animation: damageFloat 1s ease-out forwards;
}

.damage-float.normal {
  color: #fff;
}

.damage-float.critical {
  color: #f39c12;
  font-size: 48px;
  text-shadow: 0 0 20px rgba(243, 156, 18, 0.8);
}

.damage-critical {
  display: block;
  font-size: 16px;
  color: #e74c3c;
  animation: criticalPulse 0.3s ease-in-out infinite;
}

@keyframes damageFloat {
  0% {
    transform: translateY(0) scale(0.5);
    opacity: 1;
  }
  100% {
    transform: translateY(-100px) scale(1);
    opacity: 0;
  }
}

@keyframes criticalPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

/* 反击特效 */
.counter-effect-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.counter-effect {
  position: relative;
  width: 150px;
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: effectFade 0.8s ease-out forwards;
}

.effect-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 3px solid #e74c3c;
  border-radius: 50%;
  animation: ringExpand 0.8s ease-out forwards;
}

.counter-effect.critical .effect-ring {
  border-color: #f39c12;
}

.effect-particles {
  position: absolute;
  width: 100%;
  height: 100%;
}

.particle {
  position: absolute;
  font-size: 20px;
  color: #e74c3c;
  left: 50%;
  top: 50%;
  transform: rotate(calc(var(--i) * 45deg)) translateX(60px);
  animation: particleFly 0.8s ease-out forwards;
  animation-delay: calc(var(--i) * 0.05s);
}

.counter-effect.critical .particle {
  color: #f39c12;
}

@keyframes ringExpand {
  0% {
    transform: scale(0);
    opacity: 1;
  }
  100% {
    transform: scale(2);
    opacity: 0;
  }
}

@keyframes particleFly {
  0% {
    transform: rotate(calc(var(--i) * 45deg)) translateX(20px) scale(0);
    opacity: 1;
  }
  100% {
    transform: rotate(calc(var(--i) * 45deg)) translateX(80px) scale(1);
    opacity: 0;
  }
}

.effect-center {
  font-size: 48px;
  z-index: 1;
}

@keyframes effectFade {
  0% { opacity: 1; transform: translate(-50%, -50%) scale(0.5); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(1.5); }
}

/* 详情面板 */
.counter-details {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 450px;
  max-height: 80vh;
  background: linear-gradient(135deg, #c0392b 0%, #e74c3c 100%);
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

/* 统计 */
.counter-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
}

.stat-label {
  font-size: 12px;
  opacity: 0.8;
  margin-bottom: 5px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
}

.stat-value.damage {
  color: #f39c12;
}

.stat-value.critical {
  color: #e74c3c;
}

/* 历史记录 */
.counter-history {
  margin-bottom: 20px;
}

.counter-history h4 {
  margin-bottom: 10px;
  font-size: 16px;
}

.history-list {
  max-height: 150px;
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

.history-item.critical {
  background: rgba(243, 156, 18, 0.2);
  border: 1px solid rgba(243, 156, 18, 0.3);
}

.history-target {
  flex: 1;
  font-size: 14px;
}

.history-damage {
  color: #f39c12;
  font-weight: bold;
}

.history-critical {
  font-size: 12px;
  color: #e74c3c;
}

/* 加成 */
.counter-bonus h4 {
  margin-bottom: 10px;
  font-size: 16px;
}

.bonus-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bonus-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.bonus-item.active {
  background: rgba(46, 204, 113, 0.2);
  border: 1px solid rgba(46, 204, 113, 0.3);
}

.bonus-icon {
  font-size: 20px;
}

.bonus-name {
  flex: 1;
  font-size: 14px;
}

.bonus-value {
  color: #2ecc71;
  font-weight: bold;
}
</style>
