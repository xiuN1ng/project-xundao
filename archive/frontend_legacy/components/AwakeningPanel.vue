<template>
  <div class="awakening-panel">
    <div class="panel-header">
      <h2>觉醒特效</h2>
      <button class="close-btn" @click="close">×</button>
    </div>
    
    <div class="panel-content">
      <div class="character-display">
        <div class="character-model">
          <div class="aura-effect" :class="{ active: isAwakening }">
            <div class="aura-ring ring-1"></div>
            <div class="aura-ring ring-2"></div>
            <div class="aura-ring ring-3"></div>
          </div>
          <div class="character-sprite"></div>
        </div>
      </div>
      
      <div class="awakening-info">
        <div class="info-section">
          <h3>觉醒等级</h3>
          <div class="level-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: progress + '%' }"></div>
            </div>
            <span class="level-text">Lv.{{ currentLevel }}/{{ maxLevel }}</span>
          </div>
        </div>
        
        <div class="info-section">
          <h3>觉醒穴位</h3>
          <div class="meridian-grid">
            <div 
              v-for="(meridian, index) in meridians" 
              :key="index"
              class="meridian-point"
              :class="{ 
                active: meridian.activated,
                available: meridian.available,
                locked: !meridian.activated && !meridian.available
              }"
              @click="activateMeridian(index)"
            >
              <span class="meridian-name">{{ meridian.name }}</span>
              <div class="meridian-effect" v-if="meridian.activated">
                <span class="effect-value">+{{ meridian.value }}%</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="info-section">
          <h3>觉醒加成</h3>
          <div class="bonus-list">
            <div v-for="(bonus, index) in bonuses" :key="index" class="bonus-item">
              <span class="bonus-name">{{ bonus.name }}</span>
              <span class="bonus-value" :class="bonus.type">{{ bonus.value }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="action-buttons">
        <button 
          class="awaken-btn" 
          :disabled="!canAwaken"
          @click="startAwakening"
        >
          <span v-if="isAwakening">觉醒中...</span>
          <span v-else>开始觉醒</span>
        </button>
        <button class="auto-awaken-btn" :disabled="!canAutoAwaken">
          一键觉醒
        </button>
      </div>
    </div>
    
    <!-- Awakening Effect Overlay -->
    <div class="awakening-overlay" v-if="showAwakeningEffect">
      <div class="effect-container">
        <div class="light-burst"></div>
        <div class="energy-flows">
          <div v-for="n in 8" :key="n" class="energy-particle"></div>
        </div>
        <div class="awakening-text">觉醒!</div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AwakeningPanel',
  data() {
    return {
      currentLevel: 0,
      maxLevel: 10,
      progress: 0,
      isAwakening: false,
      showAwakeningEffect: false,
      meridians: [
        { name: '百会', activated: true, available: false, value: 15 },
        { name: '风池', activated: true, available: false, value: 12 },
        { name: '太阳', activated: false, available: true, value: 18 },
        { name: '人中', activated: false, available: false, value: 20 },
        { name: '膻中', activated: false, available: false, value: 25 },
        { name: '气海', activated: false, available: false, value: 30 },
      ],
      bonuses: [
        { name: '攻击力', value: '+25%', type: 'attack' },
        { name: '防御力', value: '+20%', type: 'defense' },
        { name: '生命上限', value: '+30%', type: 'health' },
        { name: '暴击率', value: '+15%', type: 'critical' },
      ]
    }
  },
  computed: {
    canAwaken() {
      return this.currentLevel < this.maxLevel && !this.isAwakening
    },
    canAutoAwaken() {
      return this.currentLevel < this.maxLevel
    }
  },
  methods: {
    close() {
      this.$emit('close')
    },
    activateMeridian(index) {
      if (this.meridians[index].available) {
        this.meridians[index].activated = true
      }
    },
    startAwakening() {
      this.isAwakening = true
      this.showAwakeningEffect = true
      
      setTimeout(() => {
        this.progress = Math.min(this.progress + 20, 100)
        if (this.progress >= 100) {
          this.currentLevel++
          this.progress = 0
          this.meridians.forEach((m, i) => {
            if (m.available) m.activated = true
            m.available = i < this.currentLevel + 1
          })
        }
        this.isAwakening = false
        this.showAwakeningEffect = false
      }, 2000)
    }
  }
}
</script>

<style scoped>
.awakening-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  max-height: 80vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  border: 2px solid #4a90d9;
  box-shadow: 0 0 30px rgba(74, 144, 217, 0.3);
  z-index: 1000;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: linear-gradient(90deg, #4a90d9, #6a5acd);
  color: white;
}

.panel-header h2 {
  margin: 0;
  font-size: 20px;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 28px;
  cursor: pointer;
  line-height: 1;
}

.panel-content {
  padding: 20px;
  max-height: calc(80vh - 60px);
  overflow-y: auto;
}

.character-display {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.character-model {
  position: relative;
  width: 120px;
  height: 150px;
}

.character-sprite {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 120px;
  background: linear-gradient(180deg, #ffd700, #ff8c00);
  border-radius: 8px;
}

.aura-effect {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 150px;
  height: 150px;
  opacity: 0;
  transition: opacity 0.5s;
}

.aura-effect.active {
  opacity: 1;
}

.aura-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 2px solid #ffd700;
  animation: pulse 2s infinite;
}

.ring-1 { width: 60px; height: 60px; }
.ring-2 { width: 100px; height: 100px; animation-delay: 0.3s; }
.ring-3 { width: 140px; height: 140px; animation-delay: 0.6s; }

@keyframes pulse {
  0%, 100% { opacity: 0.3; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
}

.awakening-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-section h3 {
  color: #ffd700;
  margin: 0 0 10px 0;
  font-size: 16px;
}

.level-progress {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar {
  flex: 1;
  height: 20px;
  background: #2a2a4a;
  border-radius: 10px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ffd700, #ff8c00);
  transition: width 0.5s;
}

.level-text {
  color: #ffd700;
  font-weight: bold;
}

.meridian-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.meridian-point {
  padding: 10px;
  background: #2a2a4a;
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.meridian-point.active {
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  border-color: #ffd700;
}

.meridian-point.available {
  border-color: #4a90d9;
  cursor: pointer;
}

.meridian-point.available:hover {
  background: #3a3a5a;
}

.meridian-point.locked {
  opacity: 0.5;
  cursor: not-allowed;
}

.meridian-name {
  display: block;
  color: white;
  font-size: 14px;
}

.meridian-effect {
  margin-top: 4px;
}

.effect-value {
  color: #00ff88;
  font-size: 12px;
}

.bonus-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bonus-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: #2a2a4a;
  border-radius: 6px;
}

.bonus-name {
  color: #aaa;
}

.bonus-value {
  font-weight: bold;
}

.bonus-value.attack { color: #ff6b6b; }
.bonus-value.defense { color: #4ecdc4; }
.bonus-value.health { color: #95e1d3; }
.bonus-value.critical { color: #ffd700; }

.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.awaken-btn, .auto-awaken-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.awaken-btn {
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  color: #1a1a2e;
  font-weight: bold;
}

.awaken-btn:hover:not(:disabled) {
  transform: scale(1.02);
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
}

.awaken-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.auto-awaken-btn {
  background: linear-gradient(135deg, #6a5acd, #9370db);
  color: white;
}

.auto-awaken-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #7b68ee, #a855f7);
}

.auto-awaken-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.awakening-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.effect-container {
  text-align: center;
}

.light-burst {
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(255,215,0,0.8) 0%, transparent 70%);
  margin: 0 auto;
  animation: burst 1s infinite;
}

@keyframes burst {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.5); opacity: 0.5; }
}

.awakening-text {
  font-size: 48px;
  font-weight: bold;
  color: #ffd700;
  text-shadow: 0 0 20px #ffd700;
  animation: glow 1s infinite;
}

@keyframes glow {
  0%, 100% { text-shadow: 0 0 20px #ffd700; }
  50% { text-shadow: 0 0 40px #ffd700, 0 0 60px #ff8c00; }
}
</style>
