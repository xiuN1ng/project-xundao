<template>
  <div class="ultimate-combo-panel">
    <div class="panel-header">
      <h2>⚡ 绝招系统</h2>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>
    
    <div class="panel-content">
      <!-- 连击数显示区域 -->
      <div class="combo-display-area">
        <div class="combo-main">
          <div class="combo-count-wrapper">
            <div class="combo-count" :class="{ 'combo-active': comboCount > 0 }">
              {{ comboCount }}
            </div>
            <div class="combo-label">连击</div>
          </div>
          
          <!-- 连击伤害飘字容器 -->
          <div class="damage-floats">
            <transition-group name="float">
              <div 
                v-for="damage in recentDamages" 
                :key="damage.id"
                class="damage-float"
                :class="damage.type"
                :style="{ left: damage.x + 'px', top: damage.y + 'px' }"
              >
                {{ formatDamage(damage.value) }}
              </div>
            </transition-group>
          </div>
        </div>
        
        <div class="combo-timer-bar">
          <div class="timer-fill" :style="{ width: timerProgress + '%' }"></div>
          <span class="timer-text">{{ comboTimer }}s</span>
        </div>
      </div>
      
      <!-- 大招触发按钮 -->
      <div class="ultimate-section">
        <h3>🎯 大招释放</h3>
        <div class="ultimate-buttons">
          <button 
            v-for="ultimate in ultimateSkills" 
            :key="ultimate.id"
            class="ultimate-btn"
            :class="{ 
              'ready': ultimate.ready && !ultimate.cooldown,
              'cooldown': ultimate.cooldown > 0,
              'triggered': ultimate.triggered
            }"
            :disabled="ultimate.cooldown > 0 || !canTriggerUltimate"
            @click="triggerUltimate(ultimate)"
          >
            <span class="ultimate-icon">{{ ultimate.icon }}</span>
            <span class="ultimate-name">{{ ultimate.name }}</span>
            <span class="ultimate-combo-req" v-if="ultimate.comboReq > 0">
              需{{ ultimate.comboReq }}连击
            </span>
            <div class="cooldown-overlay" v-if="ultimate.cooldown > 0">
              <svg viewBox="0 0 36 36" class="cooldown-circle">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="3"/>
                <circle 
                  cx="18" cy="18" r="15.9" 
                  fill="none" 
                  stroke="#60a5fa" 
                  stroke-width="3"
                  stroke-linecap="round"
                  :stroke-dasharray="`${(1 - ultimate.cooldown / ultimate.maxCooldown) * 100}, 100`"
                  transform="rotate(-90 18 18)"
                />
              </svg>
              <span class="cooldown-text">{{ ultimate.cooldown }}s</span>
            </div>
          </button>
        </div>
      </div>
      
      <!-- 连击统计 -->
      <div class="combo-stats">
        <h3>📊 连击统计</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">{{ totalComboCount }}</div>
            <div class="stat-label">总连击次数</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ maxCombo }}</div>
            <div class="stat-label">最高连击</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ totalDamage }}</div>
            <div class="stat-label">累计伤害</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ ultimateTriggerCount }}</div>
            <div class="stat-label">大招释放</div>
          </div>
        </div>
      </div>
      
      <!-- 连击效果加成 -->
      <div class="combo-bonus">
        <h3>✨ 连击效果</h3>
        <div class="bonus-list">
          <div 
            v-for="bonus in comboBonuses" 
            :key="bonus.required"
            class="bonus-item"
            :class="{ active: comboCount >= bonus.required }"
          >
            <div class="bonus-icon">{{ bonus.icon }}</div>
            <div class="bonus-info">
              <div class="bonus-name">{{ bonus.name }}</div>
              <div class="bonus-effect">{{ bonus.effect }}</div>
            </div>
            <div class="bonus-req">{{ bonus.required }}连击</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const { ref, computed, onMounted, onUnmounted } = Vue;

export default {
  name: 'UltimateComboPanel',
  emits: ['close', 'trigger-ultimate'],
  setup(props, { emit }) {
    const comboCount = ref(0);
    const comboTimer = ref(0);
    const maxCombo = ref(0);
    const totalComboCount = ref(0);
    const totalDamage = ref(0);
    const ultimateTriggerCount = ref(0);
    const canTriggerUltimate = ref(true);
    const recentDamages = ref([]);
    const comboTimerInterval = ref(null);
    const damageIdCounter = ref(0);
    
    const ultimateSkills = ref([
      {
        id: 1,
        name: '天雷降世',
        icon: '⚡',
        comboReq: 5,
        damage: 5000,
        maxCooldown: 30,
        cooldown: 0,
        ready: true,
        triggered: false
      },
      {
        id: 2,
        name: '万剑归宗',
        icon: '🗡️',
        comboReq: 10,
        damage: 12000,
        maxCooldown: 45,
        cooldown: 0,
        ready: true,
        triggered: false
      },
      {
        id: 3,
        name: '烈焰焚城',
        icon: '🔥',
        comboReq: 15,
        damage: 25000,
        maxCooldown: 60,
        cooldown: 0,
        ready: true,
        triggered: false
      },
      {
        id: 4,
        name: '冰封千里',
        icon: '❄️',
        comboReq: 20,
        damage: 40000,
        maxCooldown: 90,
        cooldown: 0,
        ready: true,
        triggered: false
      }
    ]);
    
    const comboBonuses = ref([
      { required: 3, name: '轻击', icon: '👊', effect: '伤害+10%' },
      { required: 5, name: '猛击', icon: '💪', effect: '伤害+25%' },
      { required: 10, name: '粉碎', icon: '💥', effect: '伤害+50%' },
      { required: 15, name: '毁灭', icon: '🔥', effect: '伤害+100%' },
      { required: 20, name: '终结', icon: '⚡', effect: '伤害+150%' },
      { required: 30, name: '神罚', icon: '👑', effect: '伤害+200%' }
    ]);
    
    const timerProgress = computed(() => {
      return Math.min(100, (comboTimer.value / 5) * 100);
    });
    
    const formatDamage = (damage) => {
      if (damage >= 10000) {
        return (damage / 10000).toFixed(1) + 'w';
      }
      return damage.toString();
    };
    
    const triggerUltimate = (ultimate) => {
      if (ultimate.cooldown > 0 || comboCount.value < ultimate.comboReq) return;
      
      // 增加连击
      comboCount.value++;
      totalComboCount.value++;
      
      if (comboCount.value > maxCombo.value) {
        maxCombo.value = comboCount.value;
      }
      
      // 计算伤害
      const bonusMultiplier = 1 + (comboCount.value * 0.1);
      const damage = Math.floor(ultimate.damage * bonusMultiplier);
      totalDamage.value += damage;
      
      // 显示伤害飘字
      showDamageFloat(damage, ultimate.type || 'ultimate');
      
      // 标记触发
      ultimate.triggered = true;
      setTimeout(() => {
        ultimate.triggered = false;
      }, 300);
      
      // 设置冷却
      ultimate.cooldown = ultimate.maxCooldown;
      
      // 增加大招计数
      ultimateTriggerCount.value++;
      
      // 发送事件
      emit('trigger-ultimate', { skill: ultimate, damage, combo: comboCount.value });
      
      // 启动冷却计时
      startCooldownTimer(ultimate);
    };
    
    const startCooldownTimer = (ultimate) => {
      const interval = setInterval(() => {
        ultimate.cooldown--;
        if (ultimate.cooldown <= 0) {
          clearInterval(interval);
          ultimate.ready = true;
        }
      }, 1000);
    };
    
    const showDamageFloat = (damage, type) => {
      const id = damageIdCounter.value++;
      const x = Math.random() * 200 + 50;
      const y = Math.random() * 100 + 50;
      
      recentDamages.value.push({ id, value: damage, type, x, y });
      
      // 2秒后移除
      setTimeout(() => {
        recentDamages.value = recentDamages.value.filter(d => d.id !== id);
      }, 2000);
    };
    
    const addCombo = (amount = 1) => {
      comboCount.value += amount;
      totalComboCount.value += amount;
      comboTimer.value = 5;
      
      if (comboCount.value > maxCombo.value) {
        maxCombo.value = comboCount.value;
      }
      
      // 模拟伤害
      const baseDamage = 100 * comboCount.value;
      showDamageFloat(baseDamage, 'combo');
      totalDamage.value += baseDamage;
    };
    
    onMounted(() => {
      // 启动连击计时器
      comboTimerInterval.value = setInterval(() => {
        if (comboTimer.value > 0) {
          comboTimer.value--;
        }
        if (comboTimer.value === 0 && comboCount.value > 0) {
          // 连击超时，清零
          setTimeout(() => {
            if (comboTimer.value === 0) {
              comboCount.value = 0;
            }
          }, 1000);
        }
      }, 1000);
      
      // 模拟测试：每3秒增加连击
      setInterval(() => {
        addCombo(1);
      }, 3000);
    });
    
    onUnmounted(() => {
      if (comboTimerInterval.value) {
        clearInterval(comboTimerInterval.value);
      }
    });
    
    return {
      comboCount,
      comboTimer,
      timerProgress,
      maxCombo,
      totalComboCount,
      totalDamage,
      ultimateTriggerCount,
      canTriggerUltimate,
      ultimateSkills,
      comboBonuses,
      recentDamages,
      formatDamage,
      triggerUltimate
    };
  }
};
</script>

<style scoped>
.ultimate-combo-panel {
  width: 600px;
  max-height: 700px;
  background: linear-gradient(145deg, #1a1a2e, #16213e);
  border-radius: 16px;
  border: 2px solid #4a5568;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(90deg, #2d3748, #4a5568);
  border-bottom: 2px solid #4a5568;
}

.panel-header h2 {
  margin: 0;
  color: #f6e05e;
  font-size: 1.4em;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.close-btn {
  background: #e53e3e;
  color: white;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s;
}

.close-btn:hover {
  background: #c53030;
}

.panel-content {
  padding: 16px;
  max-height: 620px;
  overflow-y: auto;
}

/* 连击显示区域 */
.combo-display-area {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
}

.combo-main {
  position: relative;
  text-align: center;
  min-height: 150px;
}

.combo-count-wrapper {
  display: inline-block;
}

.combo-count {
  font-size: 80px;
  font-weight: bold;
  color: #4a5568;
  text-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
  transition: all 0.3s;
  line-height: 1;
}

.combo-count.combo-active {
  color: #f6e05e;
  text-shadow: 0 0 30px rgba(246, 224, 94, 0.5);
  animation: comboPulse 0.5s ease-in-out infinite;
}

@keyframes comboPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.combo-label {
  color: #a0aec0;
  font-size: 1.2em;
  margin-top: 8px;
}

/* 伤害飘字 */
.damage-floats {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: visible;
}

.damage-float {
  position: absolute;
  font-size: 24px;
  font-weight: bold;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
  animation: floatUp 2s ease-out forwards;
  white-space: nowrap;
}

.damage-float.combo {
  color: #f6e05e;
}

.damage-float.ultimate {
  color: #ff6b6b;
  font-size: 32px;
}

@keyframes floatUp {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-80px) scale(1.5);
  }
}

.combo-timer-bar {
  height: 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  margin-top: 20px;
}

.timer-fill {
  height: 100%;
  background: linear-gradient(90deg, #f6e05e, #ed8936);
  transition: width 0.3s;
}

.timer-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 12px;
  font-weight: bold;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

/* 大招区域 */
.ultimate-section {
  margin-bottom: 20px;
}

.ultimate-section h3 {
  color: #f7fafc;
  margin: 0 0 12px 0;
}

.ultimate-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.ultimate-btn {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  overflow: hidden;
}

.ultimate-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.ultimate-btn.ready {
  border-color: #ffd700;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
}

.ultimate-btn.cooldown {
  opacity: 0.7;
}

.ultimate-btn.triggered {
  border-color: #ff6b6b;
  animation: triggerFlash 0.3s;
}

@keyframes triggerFlash {
  0% { background: rgba(255, 107, 107, 0.3); }
  100% { background: rgba(255, 255, 255, 0.05); }
}

.ultimate-btn:disabled {
  cursor: not-allowed;
}

.ultimate-icon {
  font-size: 36px;
  margin-bottom: 8px;
}

.ultimate-name {
  color: #f7fafc;
  font-weight: bold;
  font-size: 14px;
}

.ultimate-combo-req {
  color: #a0aec0;
  font-size: 11px;
  margin-top: 4px;
}

.cooldown-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
}

.cooldown-circle {
  position: absolute;
  width: 100%;
  height: 100%;
}

.cooldown-text {
  color: #60a5fa;
  font-weight: bold;
  font-size: 18px;
  z-index: 1;
}

/* 统计区域 */
.combo-stats {
  margin-bottom: 20px;
}

.combo-stats h3 {
  color: #f7fafc;
  margin: 0 0 12px 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.stat-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}

.stat-value {
  color: #f6e05e;
  font-size: 1.5em;
  font-weight: bold;
}

.stat-label {
  color: #a0aec0;
  font-size: 0.85em;
  margin-top: 4px;
}

/* 连击效果 */
.combo-bonus h3 {
  color: #f7fafc;
  margin: 0 0 12px 0;
}

.bonus-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bonus-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  border: 2px solid transparent;
  transition: all 0.3s;
}

.bonus-item.active {
  border-color: #f6e05e;
  background: rgba(246, 224, 94, 0.1);
}

.bonus-icon {
  font-size: 28px;
  margin-right: 12px;
}

.bonus-info {
  flex: 1;
}

.bonus-name {
  color: #f7fafc;
  font-weight: bold;
}

.bonus-effect {
  color: #a0aec0;
  font-size: 0.85em;
}

.bonus-req {
  color: #718096;
  font-size: 0.85em;
}

.bonus-item.active .bonus-req {
  color: #48bb78;
}

/* 过渡动画 */
.float-enter-active,
.float-leave-active {
  transition: all 0.5s ease;
}

.float-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.float-leave-to {
  opacity: 0;
  transform: translateY(-80px);
}
</style>
