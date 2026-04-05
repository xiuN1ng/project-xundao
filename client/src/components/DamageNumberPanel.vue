<template>
  <div class="damage-number-panel">
    <div class="panel-header">
      <h2>💥 伤害数字跳动效果</h2>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>
    
    <div class="panel-content">
      <!-- 伤害数字预览 -->
      <div class="effect-section">
        <h3>🎯 伤害数字效果预览</h3>
        <div class="preview-stage" ref="stageRef">
          <div 
            v-for="dmg in activeDamages" 
            :key="dmg.id"
            class="damage-floating"
            :class="dmg.type"
            :style="dmg.style"
          >
            <span class="dmg-value">{{ dmg.value }}</span>
            <span v-if="dmg.isCombo" class="combo-count">x{{ dmg.combo }}</span>
          </div>
        </div>
        <button class="preview-btn" @click="playDamageDemo">▶ 预览效果</button>
      </div>
      
      <!-- 伤害类型设置 -->
      <div class="effect-section">
        <h3>⚔️ 伤害类型</h3>
        <div class="damage-types">
          <div 
            v-for="type in damageTypes" 
            :key="type.id"
            class="damage-type-card"
            :class="{ active: selectedTypes.includes(type.id) }"
            @click="toggleType(type.id)"
          >
            <div class="type-icon" :style="{ color: type.color }">{{ type.icon }}</div>
            <div class="type-name">{{ type.name }}</div>
            <div class="type-sample" :style="{ color: type.color }">{{ type.sample }}</div>
          </div>
        </div>
      </div>
      
      <!-- 动画效果设置 -->
      <div class="effect-section">
        <h3>✨ 动画效果</h3>
        <div class="settings-group">
          <div class="setting-item">
            <label>动画时长</label>
            <input type="range" v-model="settings.duration" min="0.5" max="3" step="0.1" />
            <span>{{ settings.duration }}s</span>
          </div>
          <div class="setting-item">
            <label>跳动幅度</label>
            <input type="range" v-model="settings.bounce" min="10" max="100" />
            <span>{{ settings.bounce }}px</span>
          </div>
          <div class="setting-item">
            <label>缩放效果</label>
            <input type="range" v-model="settings.scale" min="0.5" max="2" step="0.1" />
            <span>{{ settings.scale }}x</span>
          </div>
          <div class="setting-item">
            <label>旋转角度</label>
            <input type="range" v-model="settings.rotation" min="0" max="360" />
            <span>{{ settings.rotation }}°</span>
          </div>
        </div>
      </div>
      
      <!-- 特效设置 -->
      <div class="effect-section">
        <h3>🎨 特效颜色</h3>
        <div class="color-picker-group">
          <div class="color-picker-item">
            <label>普通伤害</label>
            <input type="color" v-model="settings.normalColor" />
          </div>
          <div class="color-picker-item">
            <label>暴击伤害</label>
            <input type="color" v-model="settings.critColor" />
          </div>
          <div class="color-picker-item">
            <label>治疗效果</label>
            <input type="color" v-model="settings.healColor" />
          </div>
          <div class="color-picker-item">
            <label>Miss效果</label>
            <input type="color" v-model="settings.missColor" />
          </div>
        </div>
      </div>
      
      <!-- 高级设置 -->
      <div class="effect-section">
        <h3>⚙️ 高级设置</h3>
        <div class="toggle-group">
          <label class="toggle-item">
            <input type="checkbox" v-model="settings.showCombo" />
            <span>显示连击计数</span>
          </label>
          <label class="toggle-item">
            <input type="checkbox" v-model="settings.shake" />
            <span>屏幕震动效果</span>
          </label>
          <label class="toggle-item">
            <input type="checkbox" v-model="settings.glow" />
            <span>发光效果</span>
          </label>
          <label class="toggle-item">
            <input type="checkbox" v-model="settings.particle" />
            <span>粒子特效</span>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DamageNumberPanel',
  emits: ['close'],
  data() {
    return {
      activeDamages: [],
      selectedTypes: ['normal', 'crit', 'heal'],
      damageId: 0,
      settings: {
        duration: 1.5,
        bounce: 50,
        scale: 1.2,
        rotation: 15,
        normalColor: '#ffffff',
        critColor: '#ffd700',
        healColor: '#00ff88',
        missColor: '#888888',
        showCombo: true,
        shake: true,
        glow: true,
        particle: true
      },
      damageTypes: [
        { id: 'normal', name: '普通伤害', icon: '⚔️', color: '#ffffff', sample: '1234' },
        { id: 'crit', name: '暴击伤害', icon: '💥', color: '#ffd700', sample: '2468' },
        { id: 'heal', name: '治疗效果', icon: '💚', color: '#00ff88', sample: '+500' },
        { id: 'miss', name: 'Miss', icon: '❌', color: '#888888', sample: 'Miss' },
        { id: 'dodge', name: '闪避', icon: '💨', color: '#4facfe', sample: 'Dodge' },
        { id: 'block', name: '格挡', icon: '🛡️', color: '#a8edea', sample: 'Block' }
      ]
    };
  },
  methods: {
    toggleType(typeId) {
      const idx = this.selectedTypes.indexOf(typeId);
      if (idx > -1) {
        this.selectedTypes.splice(idx, 1);
      } else {
        this.selectedTypes.push(typeId);
      }
    },
    playDamageDemo() {
      // 生成多组伤害数字
      const types = this.selectedTypes.length > 0 ? this.selectedTypes : ['normal', 'crit', 'heal'];
      
      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          const type = types[Math.floor(Math.random() * types.length)];
          const dmg = this.createDamage(type, i);
          this.activeDamages.push(dmg);
          
          // 清理
          setTimeout(() => {
            this.activeDamages = this.activeDamages.filter(d => d.id !== dmg.id);
          }, this.settings.duration * 1000);
        }, i * 150);
      }
    },
    createDamage(type, index) {
      const typeInfo = this.damageTypes.find(t => t.id === type) || this.damageTypes[0];
      const baseValue = type === 'heal' ? Math.floor(Math.random() * 500) + 100 : 
                        type === 'crit' ? Math.floor(Math.random() * 2000) + 1000 :
                        Math.floor(Math.random() * 1000) + 500;
      
      const angle = (index / 8) * Math.PI * 2;
      const radius = 50 + Math.random() * 30;
      
      return {
        id: ++this.damageId,
        type: type,
        value: type === 'miss' || type === 'dodge' || type === 'block' ? typeInfo.sample : 
               (type === 'heal' ? '+' : '-') + baseValue,
        isCombo: this.settings.showCombo && Math.random() > 0.5,
        combo: Math.floor(Math.random() * 5) + 2,
        style: {
          '--dmg-color': typeInfo.color,
          '--duration': this.settings.duration + 's',
          '--bounce': this.settings.bounce + 'px',
          '--scale': this.settings.scale,
          '--rotation': this.settings.rotation + 'deg',
          left: `calc(50% + ${Math.cos(angle) * radius}px)`,
          top: `calc(50% + ${Math.sin(angle) * radius}px)`
        }
      };
    }
  }
};
</script>

<style>
.damage-number-panel {
  background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
  color: #e8e8f0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(90deg, rgba(255, 107, 107, 0.1), transparent);
  border-bottom: 1px solid rgba(255, 107, 107, 0.2);
}

.panel-header h2 {
  margin: 0;
  font-size: 18px;
  color: #ff6b6b;
}

.panel-content {
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
}

.effect-section {
  margin-bottom: 24px;
}

.effect-section h3 {
  font-size: 14px;
  color: #ff6b6b;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 107, 107, 0.1);
}

.preview-stage {
  height: 150px;
  background: linear-gradient(180deg, #0f0f23 0%, #1a1a2e 100%);
  border-radius: 12px;
  position: relative;
  overflow: hidden;
  margin-bottom: 12px;
  border: 1px solid rgba(255, 107, 107, 0.2);
}

.preview-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.preview-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
}

.damage-types {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.damage-type-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 12px 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.damage-type-card:hover {
  background: rgba(255, 255, 255, 0.1);
}

.damage-type-card.active {
  border-color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
}

.type-icon {
  font-size: 24px;
  margin-bottom: 4px;
}

.type-name {
  font-size: 11px;
  color: #aaa;
  margin-bottom: 4px;
}

.type-sample {
  font-size: 14px;
  font-weight: bold;
}

.settings-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.setting-item label {
  min-width: 60px;
  font-size: 12px;
  color: #aaa;
}

.setting-item input[type="range"] {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.setting-item input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  background: #ff6b6b;
  border-radius: 50%;
  cursor: pointer;
}

.setting-item span {
  min-width: 40px;
  text-align: right;
  font-size: 12px;
  color: #888;
}

.color-picker-group {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.color-picker-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-picker-item label {
  font-size: 12px;
  color: #aaa;
}

.color-picker-item input[type="color"] {
  width: 40px;
  height: 30px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.toggle-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toggle-item {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.toggle-item input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #ff6b6b;
}

.toggle-item span {
  font-size: 13px;
  color: #aaa;
}

/* 伤害数字动画 - 优化版 */
.damage-floating {
  position: absolute;
  font-family: 'KaiTi', 'STKaiti', 'SimSun', serif;
  font-weight: bold;
  text-shadow: 0 0 8px currentColor, 0 0 16px currentColor, 2px 2px 4px rgba(0, 0, 0, 0.8);
  pointer-events: none;
  transform: translate(-50%, -50%);
  will-change: transform, opacity;
}

.damage-floating.normal {
  font-size: 24px;
  color: var(--dmg-color);
  animation: damageFloatUp var(--duration, 1.2s) cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

.damage-floating.crit {
  font-size: 36px;
  color: var(--dmg-color);
  text-shadow: 0 0 12px var(--dmg-color), 0 0 24px #ff8c00, 0 0 48px #ff4500, 3px 3px 6px rgba(0, 0, 0, 0.9);
  animation: damageCrit 1.0s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

.damage-floating.heal {
  font-size: 28px;
  color: var(--dmg-color);
  text-shadow: 0 0 10px var(--dmg-color), 0 0 20px #00fa9a, 0 0 40px #00ff7f, 2px 2px 4px rgba(0, 0, 0, 0.7);
  animation: damageHeal 1.4s ease-out forwards;
}

.damage-floating.miss {
  font-size: 20px;
  color: var(--dmg-color);
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
  animation: damageMiss 1.0s ease-out forwards;
}

.damage-floating.dodge {
  font-size: 18px;
  color: var(--dmg-color);
  text-shadow: 0 0 8px var(--dmg-color), 1px 1px 3px rgba(0, 0, 0, 0.8);
  animation: damageDodge 0.9s ease-out forwards;
}

.damage-floating.block {
  font-size: 20px;
  color: var(--dmg-color);
  text-shadow: 0 0 8px var(--dmg-color), 1px 1px 3px rgba(0, 0, 0, 0.8);
  animation: damageBlock 1.1s ease-out forwards;
}

@keyframes damageFloatUp {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.3) translateY(0); }
  15% { opacity: 1; transform: translate(-50%, -50%) scale(1.3) translateY(-10px); }
  30% { transform: translate(-50%, -50%) scale(1) translateY(-30px); }
  60% { transform: translate(-50%, -50%) scale(0.95) translateY(-60px); opacity: 0.9; }
  85% { opacity: 0.5; }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8) translateY(-100px); }
}

@keyframes damageCrit {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0) rotate(-20deg); }
  10% { opacity: 1; transform: translate(-50%, -50%) scale(1.8) rotate(10deg); }
  20% { transform: translate(-50%, -50%) scale(0.9) rotate(-5deg) translateY(-15px); }
  35% { transform: translate(-50%, -50%) scale(1.1) rotate(3deg) translateY(-40px); }
  55% { transform: translate(-50%, -50%) scale(1) rotate(0deg) translateY(-70px); opacity: 0.9; }
  80% { opacity: 0.4; }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(0.7) rotate(0deg) translateY(-120px); }
}

@keyframes damageHeal {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5) translateY(0); }
  20% { opacity: 1; transform: translate(-50%, -50%) scale(1.2) translateY(-20px); }
  40% { transform: translate(-50%, -50%) scale(1) translateY(-45px); }
  70% { opacity: 0.8; transform: translate(-50%, -50%) scale(1) translateY(-80px); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9) translateY(-130px); }
}

@keyframes damageMiss {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5) translateY(0) translateX(-20px); }
  30% { opacity: 1; transform: translate(-50%, -50%) scale(1.1) translateY(-15px) translateX(10px); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9) translateY(-50px) translateX(30px); }
}

@keyframes damageDodge {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8) translateX(-30px); }
  25% { opacity: 1; transform: translate(-50%, -50%) scale(1) translateX(0) translateY(-10px); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8) translateX(50px) translateY(-60px); }
}

@keyframes damageBlock {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.6) translateY(10px); }
  20% { opacity: 1; transform: translate(-50%, -50%) scale(1.1) translateY(-5px); }
  40% { transform: translate(-50%, -50%) scale(0.95) translateY(-25px); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(0.85) translateY(-70px); }
}

.combo-count {
  display: inline-block;
  margin-left: 6px;
  font-size: 14px;
  color: #ff6b6b;
  font-weight: bold;
  animation: comboPulse 0.5s ease-out infinite;
}

@keyframes comboPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}
</style>
