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

/* 伤害数字动画 */
.damage-floating {
  position: absolute;
  font-size: 28px;
  font-weight: bold;
  color: var(--dmg-color);
  text-shadow: 0 0 10px var(--dmg-color), 2px 2px 4px rgba(0, 0, 0, 0.5);
  animation: damageBounce var(--duration) ease-out forwards;
  pointer-events: none;
  transform: translate(-50%, -50%);
}

.damage-floating.crit {
  font-size: 36px;
}

.damage-floating.heal {
  color: var(--dmg-color);
}

.combo-count {
  font-size: 14px;
  color: #ff6b6b;
  margin-left: 4px;
}

@keyframes damageBounce {
  0% {
    transform: translate(-50%, -50%) scale(0) rotate(calc(-1 * var(--rotation)));
    opacity: 0;
  }
  10% {
    transform: translate(-50%, calc(-50% - var(--bounce) * 0.3)) scale(var(--scale)) rotate(0deg);
    opacity: 1;
  }
  25% {
    transform: translate(-50%, calc(-50% - var(--bounce) * 0.8)) scale(calc(var(--scale) * 0.9)) rotate(calc(var(--rotation) * 0.3));
  }
  50% {
    transform: translate(-50%, calc(-50% - var(--bounce))) scale(1) rotate(0deg);
  }
  75% {
    transform: translate(-50%, calc(-50% - var(--bounce) * 0.6)) scale(0.95);
    opacity: 0.8;
  }
  100% {
    transform: translate(-50%, calc(-50% - var(--bounce) * 1.2)) scale(0.8);
    opacity: 0;
  }
}
</style>
