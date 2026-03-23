<template>
  <div class="defense-panel">
    <div class="panel-header">
      <h2>🛡️ 防御系统</h2>
      <button class="close-btn" @click="closePanel">×</button>
    </div>
    
    <div class="panel-content">
      <!-- 防御属性 -->
      <div class="defense-stats">
        <div class="stat-item">
          <span class="stat-label">防御力</span>
          <span class="stat-value">{{ defense }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">闪避率</span>
          <span class="stat-value">{{ dodge }}%</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">格挡率</span>
          <span class="stat-value">{{ block }}%</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">减伤率</span>
          <span class="stat-value">{{ damageReduction }}%</span>
        </div>
      </div>
      
      <!-- 格挡系统 -->
      <div class="block-section">
        <h3>⚔️ 格挡系统</h3>
        <div class="block-info">
          <div class="perfect-block">
            <span class="label">完美格挡:</span>
            <span class="value">{{ perfectBlockChance }}%</span>
          </div>
          <div class="block-effect">
            <span class="label">格挡效果:</span>
            <span class="value">{{ blockEffect }}% 伤害</span>
          </div>
        </div>
        
        <div class="block-skill" v-if="blockSkillUnlocked">
          <button 
            class="block-btn" 
            :class="{ active: isBlocking, ready: blockCooldown <= 0 }"
            :disabled="blockCooldown > 0"
            @click="activateBlock"
          >
            <span class="btn-icon">🛡️</span>
            <span class="btn-text">{{ isBlocking ? '格挡中' : '格挡' }}</span>
            <span v-if="blockCooldown > 0" class="cooldown">{{ blockCooldown }}s</span>
          </button>
          
          <!-- 格挡特效 -->
          <div v-if="isBlocking" class="block-effect-visual">
            <div class="shield-outer"></div>
            <div class="shield-inner"></div>
          </div>
        </div>
      </div>
      
      <!-- 闪避系统 -->
      <div class="dodge-section">
        <h3>💨 闪避系统</h3>
        <div class="dodge-info">
          <div class="dodge-bar">
            <div class="dodge-fill" :style="{ width: dodgeEnergy + '%' }"></div>
          </div>
          <span class="dodge-energy">{{ dodgeEnergy }}/100</span>
        </div>
        
        <div class="dodge-skill" v-if="dodgeSkillUnlocked">
          <button 
            class="dodge-btn"
            :class="{ active: isDodging }"
            :disabled="dodgeEnergy < 30"
            @click="activateDodge"
          >
            <span class="btn-icon">💨</span>
            <span class="btn-text">{{ isDodging ? '闪避中' : '闪避' }}</span>
          </button>
          
          <!-- 闪避特效 -->
          <div v-if="isDodging" class="dodge-effect-visual">
            <div class="trail trail-1"></div>
            <div class="trail trail-2"></div>
            <div class="trail trail-3"></div>
          </div>
        </div>
      </div>
      
      <!-- 防御特效 -->
      <div class="defense-effects">
        <h3>✨ 防御特效</h3>
        <div class="effect-list">
          <div 
            v-for="effect in defenseEffects" 
            :key="effect.id"
            class="effect-item"
            :class="{ active: effect.active }"
          >
            <span class="effect-icon">{{ effect.icon }}</span>
            <span class="effect-name">{{ effect.name }}</span>
            <span class="effect-value">{{ effect.value }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DefensePanel',
  data() {
    return {
      defense: 1500,
      dodge: 25,
      block: 20,
      damageReduction: 30,
      perfectBlockChance: 10,
      blockEffect: 50,
      blockSkillUnlocked: true,
      isBlocking: false,
      blockCooldown: 0,
      dodgeSkillUnlocked: true,
      isDodging: false,
      dodgeEnergy: 80,
      defenseEffects: [
        { id: 1, name: '铁壁', icon: '🧱', value: '+10% 防御', active: true },
        { id: 2, name: '灵敏', icon: '🦊', value: '+5% 闪避', active: true },
        { id: 3, name: '反伤', icon: '🔙', value: '5% 反伤', active: false },
        { id: 4, name: '护盾', icon: '🔮', value: '吸收伤害', active: false },
      ],
    };
  },
  methods: {
    closePanel() {
      this.$emit('close');
    },
    activateBlock() {
      if (this.blockCooldown > 0) return;
      
      this.isBlocking = true;
      this.blockCooldown = 10;
      
      // 播放格挡音效
      this.playBlockSound();
      
      // 持续时间
      setTimeout(() => {
        this.isBlocking = false;
      }, 2000);
      
      // 冷却计时
      const timer = setInterval(() => {
        this.blockCooldown--;
        if (this.blockCooldown <= 0) {
          clearInterval(timer);
        }
      }, 1000);
    },
    activateDodge() {
      if (this.dodgeEnergy < 30) return;
      
      this.dodgeEnergy -= 30;
      this.isDodging = true;
      
      // 闪避持续时间
      setTimeout(() => {
        this.isDodging = false;
      }, 500);
      
      // 能量回复
      const energyTimer = setInterval(() => {
        this.dodgeEnergy = Math.min(100, this.dodgeEnergy + 2);
        if (this.dodgeEnergy >= 100) {
          clearInterval(energyTimer);
        }
      }, 200);
    },
    playBlockSound() {
      // 播放格挡音效
    },
  },
};
</script>

<style scoped>
.defense-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 500px;
  max-height: 80vh;
  background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
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

.defense-stats {
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
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

.stat-label {
  font-size: 14px;
  opacity: 0.8;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #3498db;
}

.block-section, .dodge-section, .defense-effects {
  margin-bottom: 20px;
}

h3 {
  margin-bottom: 15px;
  font-size: 18px;
}

.block-info, .dodge-info {
  display: flex;
  gap: 20px;
  margin-bottom: 15px;
}

.block-skill, .dodge-skill {
  position: relative;
  display: flex;
  justify-content: center;
}

.block-btn, .dodge-btn {
  padding: 15px 30px;
  border: none;
  border-radius: 15px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s ease;
}

.block-btn {
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: white;
}

.block-btn.active {
  background: linear-gradient(135deg, #2ecc71, #27ae60);
  box-shadow: 0 0 20px rgba(46, 204, 113, 0.5);
}

.dodge-btn {
  background: linear-gradient(135deg, #9b59b6, #8e44ad);
  color: white;
}

.dodge-btn.active {
  animation: dodgeAnim 0.5s ease-in-out;
}

@keyframes dodgeAnim {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-20px); }
  75% { transform: translateX(20px); }
}

.dodge-bar {
  height: 20px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 10px;
}

.dodge-fill {
  height: 100%;
  background: linear-gradient(90deg, #9b59b6, #e74c3c);
  transition: width 0.3s ease;
}

.block-effect-visual {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.shield-outer, .shield-inner {
  position: absolute;
  border-radius: 50%;
  animation: shieldPulse 0.5s ease-in-out infinite;
}

.shield-outer {
  width: 120px;
  height: 120px;
  border: 3px solid rgba(52, 152, 219, 0.8);
  transform: translate(-50%, -50%);
}

.shield-inner {
  width: 80px;
  height: 80px;
  border: 2px solid rgba(52, 152, 219, 0.5);
  transform: translate(-50%, -50%);
}

@keyframes shieldPulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.5; }
}

.dodge-effect-visual {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.trail {
  position: absolute;
  width: 30px;
  height: 30px;
  background: rgba(155, 89, 182, 0.5);
  border-radius: 50%;
  animation: trailAnim 0.5s ease-out forwards;
}

@keyframes trailAnim {
  0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
}

.effect-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.effect-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  transition: all 0.3s ease;
}

.effect-item.active {
  background: rgba(46, 204, 113, 0.3);
  border: 1px solid rgba(46, 204, 113, 0.5);
}

.effect-icon {
  font-size: 24px;
}

.effect-name {
  flex: 1;
}

.effect-value {
  color: #f39c12;
  font-weight: bold;
}
</style>
