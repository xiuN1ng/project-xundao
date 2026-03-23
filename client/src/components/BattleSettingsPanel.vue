<template>
  <div class="battle-settings-panel">
    <div class="panel-header">
      <h3>⚔️ 战斗设置</h3>
      <button class="close-btn" @click="closePanel">×</button>
    </div>
    
    <div class="panel-content">
      <!-- 战斗速度 -->
      <div class="setting-item">
        <div class="setting-label">
          <span class="label-icon">⚡</span>
          <span>战斗速度</span>
        </div>
        <div class="speed-buttons">
          <button 
            v-for="speed in speedOptions" 
            :key="speed.value"
            :class="['speed-btn', { active: currentSpeed === speed.value }]"
            @click="setSpeed(speed.value)"
          >
            {{ speed.label }}
          </button>
        </div>
      </div>
      
      <!-- 自动战斗 -->
      <div class="setting-item">
        <div class="setting-label">
          <span class="label-icon">🤖</span>
          <span>自动战斗</span>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" v-model="autoBattle" @change="toggleAutoBattle">
          <span class="slider"></span>
        </label>
      </div>
      
      <!-- 技能自动释放 -->
      <div class="setting-item">
        <div class="setting-label">
          <span class="label-icon">✨</span>
          <span>技能自动释放</span>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" v-model="autoSkill" @change="toggleAutoSkill">
          <span class="slider"></span>
        </label>
      </div>
      
      <!-- 战后自动拾取 -->
      <div class="setting-item">
        <div class="setting-label">
          <span class="label-icon">💎</span>
          <span>战后自动拾取</span>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" v-model="autoPickup" @change="toggleAutoPickup">
          <span class="slider"></span>
        </label>
      </div>
      
      <!-- 战后自动出售 -->
      <div class="setting-item">
        <div class="setting-label">
          <span class="label-icon">💰</span>
          <span>战后自动出售</span>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" v-model="autoSell" @change="toggleAutoSell">
          <span class="slider"></span>
        </label>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BattleSettingsPanel',
  emits: ['close'],
  data() {
    return {
      currentSpeed: 1,
      autoBattle: false,
      autoSkill: true,
      autoPickup: true,
      autoSell: false,
      speedOptions: [
        { value: 1, label: '1x' },
        { value: 2, label: '2x' },
        { value: 3, label: '3x' },
        { value: 4, label: '4x' },
        { value: 5, label: '5x' }
      ]
    };
  },
  mounted() {
    this.loadSettings();
  },
  methods: {
    closePanel() {
      this.$emit('close');
    },
    loadSettings() {
      const settings = JSON.parse(localStorage.getItem('battleSettings') || '{}');
      this.currentSpeed = settings.speed || 1;
      this.autoBattle = settings.autoBattle || false;
      this.autoSkill = settings.autoSkill ?? true;
      this.autoPickup = settings.autoPickup ?? true;
      this.autoSell = settings.autoSell || false;
    },
    saveSettings() {
      const settings = {
        speed: this.currentSpeed,
        autoBattle: this.autoBattle,
        autoSkill: this.autoSkill,
        autoPickup: this.autoPickup,
        autoSell: this.autoSell
      };
      localStorage.setItem('battleSettings', JSON.stringify(settings));
    },
    setSpeed(speed) {
      this.currentSpeed = speed;
      this.saveSettings();
      // 应用速度设置
      if (window.gameEngine) {
        window.gameEngine.setBattleSpeed(speed);
      }
    },
    toggleAutoBattle() {
      this.saveSettings();
    },
    toggleAutoSkill() {
      this.saveSettings();
    },
    toggleAutoPickup() {
      this.saveSettings();
    },
    toggleAutoSell() {
      this.saveSettings();
    }
  }
};
</script>

<style scoped>
.battle-settings-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 420px;
  background: linear-gradient(145deg, #1a1a2e, #16213e);
  background-image: url('../assets/ui-icons.jpg');
  background-size: 200px;
  background-position: right bottom;
  background-repeat: no-repeat;
  border-radius: 16px;
  border: 2px solid #4a5568;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  color: #e2e8f0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #4a5568;
  background: linear-gradient(90deg, #2d3748, #1a202c);
  border-radius: 14px 14px 0 0;
}

.panel-header h3 {
  margin: 0;
  font-size: 18px;
  color: #fbbf24;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.close-btn {
  background: none;
  border: none;
  color: #a0aec0;
  font-size: 28px;
  cursor: pointer;
  line-height: 1;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #fc8181;
}

.panel-content {
  padding: 20px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 0;
  border-bottom: 1px solid #2d3748;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 10px;
}

.label-icon {
  font-size: 20px;
}

.speed-buttons {
  display: flex;
  gap: 6px;
}

.speed-btn {
  padding: 6px 14px;
  border: 2px solid #4a5568;
  border-radius: 8px;
  background: #2d3748;
  color: #a0aec0;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: bold;
}

.speed-btn:hover {
  border-color: #fbbf24;
  color: #fbbf24;
}

.speed-btn.active {
  background: linear-gradient(145deg, #f6ad55, #dd6b20);
  border-color: #f6ad55;
  color: #fff;
  box-shadow: 0 2px 8px rgba(246, 173, 85, 0.4);
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 52px;
  height: 28px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #4a5568;
  transition: 0.3s;
  border-radius: 28px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 22px;
  width: 22px;
  left: 3px;
  bottom: 3px;
  background: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .slider {
  background: linear-gradient(90deg, #48bb78, #38a169);
}

input:checked + .slider:before {
  transform: translateX(24px);
}
</style>
