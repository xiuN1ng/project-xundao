<template>
  <div class="auto-settings-panel">
    <div class="panel-header">
      <h3>⚙️ 自动设置</h3>
      <button class="close-btn" @click="closePanel">×</button>
    </div>
    
    <div class="panel-content">
      <!-- 自动喝药 -->
      <div class="setting-group">
        <div class="group-title">
          <span class="icon">💊</span>
          <span>自动喝药</span>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-name">生命值低于</span>
            <span class="setting-value">{{ autoHealHp }}%</span>
          </div>
          <input 
            type="range" 
            min="10" 
            max="90" 
            step="5"
            v-model="autoHealHp"
            @change="saveSettings"
          >
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-name">灵气值低于</span>
            <span class="setting-value">{{ autoHealMp }}%</span>
          </div>
          <input 
            type="range" 
            min="10" 
            max="90" 
            step="5"
            v-model="autoHealMp"
            @change="saveSettings"
          >
        </div>
        <label class="toggle-item">
          <span>启用自动喝药</span>
          <label class="toggle-switch">
            <input type="checkbox" v-model="enableAutoHeal" @change="saveSettings">
            <span class="slider"></span>
          </label>
        </label>
      </div>
      
      <!-- 自动修理 -->
      <div class="setting-group">
        <div class="group-title">
          <span class="icon">🔧</span>
          <span>自动修理</span>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-name">装备耐久低于</span>
            <span class="setting-value">{{ autoRepairDurability }}%</span>
          </div>
          <input 
            type="range" 
            min="5" 
            max="50" 
            step="5"
            v-model="autoRepairDurability"
            @change="saveSettings"
          >
        </div>
        <label class="toggle-item">
          <span>自动修理装备</span>
          <label class="toggle-switch">
            <input type="checkbox" v-model="enableAutoRepair" @change="saveSettings">
            <span class="slider"></span>
          </label>
        </label>
      </div>
      
      <!-- 自动强化 -->
      <div class="setting-group">
        <div class="group-title">
          <span class="icon">⚒️</span>
          <span>自动强化</span>
        </div>
        <label class="toggle-item">
          <span>自动强化装备</span>
          <label class="toggle-switch">
            <input type="checkbox" v-model="enableAutoRefine" @change="saveSettings">
            <span class="slider"></span>
          </label>
        </label>
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-name">强化目标等级</span>
            <span class="setting-value">+{{ autoRefineTarget }}</span>
          </div>
          <input 
            type="range" 
            min="1" 
            max="15" 
            step="1"
            v-model="autoRefineTarget"
            @change="saveSettings"
            :disabled="!enableAutoRefine"
          >
        </div>
      </div>
      
      <!-- 自动炼丹 -->
      <div class="setting-group">
        <div class="group-title">
          <span class="icon">🔥</span>
          <span>自动炼丹</span>
        </div>
        <label class="toggle-item">
          <span>自动炼制丹药</span>
          <label class="toggle-switch">
            <input type="checkbox" v-model="enableAutoCraft" @change="saveSettings">
            <span class="slider"></span>
          </label>
        </label>
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-name">目标丹药品质</span>
            <span class="setting-value quality-badge" :class="craftQualityClass">
              {{ craftQualityLabels[craftQuality] }}
            </span>
          </div>
          <select v-model="craftQuality" @change="saveSettings" :disabled="!enableAutoCraft">
            <option value="1">普通</option>
            <option value="2">优良</option>
            <option value="3">珍贵</option>
            <option value="4">稀有</option>
            <option value="5">史诗</option>
          </select>
        </div>
      </div>
      
      <!-- 自动拾取 -->
      <div class="setting-group">
        <div class="group-title">
          <span class="icon">✨</span>
          <span>自动拾取</span>
        </div>
        <label class="toggle-item">
          <span>自动拾取掉落</span>
          <label class="toggle-switch">
            <input type="checkbox" v-model="enableAutoPickup" @change="saveSettings">
            <span class="slider"></span>
          </label>
        </label>
        <div class="pickup-settings" v-if="enableAutoPickup">
          <label class="checkbox-item">
            <input type="checkbox" v-model="pickupItems" value="equipment" @change="saveSettings">
            <span>装备</span>
          </label>
          <label class="checkbox-item">
            <input type="checkbox" v-model="pickupItems" value="material" @change="saveSettings">
            <span>材料</span>
          </label>
          <label class="checkbox-item">
            <input type="checkbox" v-model="pickupItems" value="drug" @change="saveSettings">
            <span>丹药</span>
          </label>
          <label class="checkbox-item">
            <input type="checkbox" v-model="pickupItems" value="currency" @change="saveSettings">
            <span>货币</span>
          </label>
        </div>
      </div>
      
      <!-- 一键配置 -->
      <div class="quick-settings">
        <h4>快捷配置</h4>
        <div class="preset-buttons">
          <button class="preset-btn" @click="applyPreset('peaceful')">
            🧘 和平发育
          </button>
          <button class="preset-btn" @click="applyPreset('combat')">
            ⚔️ 战斗模式
          </button>
          <button class="preset-btn" @click="applyPreset('afk')">
            💤 挂机模式
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AutoSettingsPanel',
  emits: ['close'],
  data() {
    return {
      // 自动喝药
      autoHealHp: 30,
      autoHealMp: 20,
      enableAutoHeal: true,
      
      // 自动修理
      autoRepairDurability: 20,
      enableAutoRepair: true,
      
      // 自动强化
      enableAutoRefine: false,
      autoRefineTarget: 10,
      
      // 自动炼丹
      enableAutoCraft: false,
      craftQuality: 2,
      craftQualityLabels: {
        1: '普通',
        2: '优良',
        3: '珍贵',
        4: '稀有',
        5: '史诗'
      },
      
      // 自动拾取
      enableAutoPickup: true,
      pickupItems: ['equipment', 'material', 'drug', 'currency']
    };
  },
  computed: {
    craftQualityClass() {
      return 'quality-' + this.craftQuality;
    }
  },
  mounted() {
    this.loadSettings();
  },
  methods: {
    closePanel() {
      this.$emit('close');
    },
    loadSettings() {
      const settings = JSON.parse(localStorage.getItem('autoSettings') || '{}');
      Object.assign(this, settings);
    },
    saveSettings() {
      const settings = {
        autoHealHp: this.autoHealHp,
        autoHealMp: this.autoHealMp,
        enableAutoHeal: this.enableAutoHeal,
        autoRepairDurability: this.autoRepairDurability,
        enableAutoRepair: this.enableAutoRepair,
        enableAutoRefine: this.enableAutoRefine,
        autoRefineTarget: this.autoRefineTarget,
        enableAutoCraft: this.enableAutoCraft,
        craftQuality: this.craftQuality,
        enableAutoPickup: this.enableAutoPickup,
        pickupItems: this.pickupItems
      };
      localStorage.setItem('autoSettings', JSON.stringify(settings));
      
      // 通知游戏引擎
      if (window.gameEngine) {
        window.gameEngine.updateAutoSettings(settings);
      }
    },
    applyPreset(preset) {
      switch(preset) {
        case 'peaceful':
          this.autoHealHp = 50;
          this.autoHealMp = 40;
          this.enableAutoHeal = true;
          this.enableAutoRepair = true;
          this.enableAutoRefine = false;
          this.enableAutoCraft = false;
          this.enableAutoPickup = true;
          this.pickupItems = ['equipment', 'material', 'drug', 'currency'];
          break;
        case 'combat':
          this.autoHealHp = 20;
          this.autoHealMp = 10;
          this.enableAutoHeal = true;
          this.enableAutoRepair = true;
          this.enableAutoRefine = true;
          this.autoRefineTarget = 12;
          this.enableAutoCraft = false;
          this.enableAutoPickup = true;
          this.pickupItems = ['equipment', 'currency'];
          break;
        case 'afk':
          this.autoHealHp = 30;
          this.autoHealMp = 20;
          this.enableAutoHeal = true;
          this.enableAutoRepair = true;
          this.enableAutoRefine = true;
          this.autoRefineTarget = 15;
          this.enableAutoCraft = true;
          this.craftQuality = 3;
          this.enableAutoPickup = true;
          this.pickupItems = ['equipment', 'material', 'drug', 'currency'];
          break;
      }
      this.saveSettings();
    }
  }
};
</script>

<style scoped>
.auto-settings-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 460px;
  max-height: 80vh;
  background: linear-gradient(145deg, #1a1a2e, #16213e);
  background-image: url('../assets/ui-icons.jpg');
  background-size: 180px;
  background-position: left bottom;
  background-repeat: no-repeat;
  border-radius: 16px;
  border: 2px solid #4299e1;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  color: #e2e8f0;
  overflow-y: auto;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #4a5568;
  background: linear-gradient(90deg, #2b6cb0, #1a365d);
  border-radius: 14px 14px 0 0;
  position: sticky;
  top: 0;
  z-index: 10;
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
}

.close-btn:hover {
  color: #fc8181;
}

.panel-content {
  padding: 20px;
}

.setting-group {
  margin-bottom: 24px;
  padding: 16px;
  background: rgba(45, 55, 72, 0.5);
  border-radius: 12px;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: bold;
  color: #63b3ed;
}

.group-title .icon {
  font-size: 20px;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.setting-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.setting-name {
  color: #a0aec0;
  font-size: 14px;
}

.setting-value {
  color: #4299e1;
  font-weight: bold;
}

.setting-item input[type="range"] {
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: #4a5568;
  outline: none;
}

.setting-item input[type="range"]:disabled {
  opacity: 0.5;
}

.setting-item select {
  padding: 8px 12px;
  border: 2px solid #4a5568;
  border-radius: 8px;
  background: #2d3748;
  color: #e2e8f0;
  font-size: 14px;
}

.setting-item select:disabled {
  opacity: 0.5;
}

.toggle-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  cursor: pointer;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 26px;
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
  border-radius: 26px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .slider {
  background: linear-gradient(90deg, #4299e1, #3182ce);
}

input:checked + .slider:before {
  transform: translateX(22px);
}

.quality-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: bold;
}

.quality-1 { background: #718096; }
.quality-2 { background: #48bb78; }
.quality-3 { background: #4299e1; }
.quality-4 { background: #9f7aea; }
.quality-5 { background: linear-gradient(90deg, #f6ad55, #ed64a6); }

.pickup-settings {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
  padding: 12px;
  background: rgba(66, 153, 225, 0.1);
  border-radius: 8px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.checkbox-item input {
  width: 16px;
  height: 16px;
}

.quick-settings {
  margin-top: 20px;
  padding: 16px;
  background: rgba(237, 137, 54, 0.1);
  border-radius: 12px;
  border: 1px solid #ed8936;
}

.quick-settings h4 {
  margin: 0 0 12px 0;
  color: #ed8936;
}

.preset-buttons {
  display: flex;
  gap: 10px;
}

.preset-btn {
  flex: 1;
  padding: 12px 8px;
  border: 2px solid #4a5568;
  border-radius: 10px;
  background: #2d3748;
  color: #e2e8f0;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.preset-btn:hover {
  border-color: #ed8936;
  background: rgba(237, 137, 54, 0.2);
}
</style>
