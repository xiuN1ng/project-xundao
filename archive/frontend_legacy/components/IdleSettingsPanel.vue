<template>
  <div class="idle-settings-panel">
    <div class="panel-header">
      <div class="panel-title">🎯 挂机设置</div>
      <button class="close-btn" @click="closePanel">✕</button>
    </div>
    
    <div class="panel-content">
      <!-- 收益倍数设置 -->
      <div class="settings-section">
        <div class="section-title">⚡ 收益倍数</div>
        <div class="multiplier-options">
          <button 
            v-for="option in multiplierOptions" 
            :key="option.value"
            class="multiplier-btn"
            :class="{ active: multiplier === option.value }"
            @click="setMultiplier(option.value)"
          >
            <div class="multiplier-value">{{ option.value }}x</div>
            <div class="multiplier-label">{{ option.label }}</div>
            <div class="multiplier-cost" v-if="option.cost > 0">
              💰 {{ option.cost }}/小时
            </div>
          </button>
        </div>
      </div>
      
      <!-- 离线收益设置 -->
      <div class="settings-section">
        <div class="section-title">🌙 离线收益</div>
        <div class="setting-row">
          <div class="setting-label">启用离线收益</div>
          <label class="toggle-switch">
            <input type="checkbox" v-model="offlineEnabled" @change="saveSettings">
            <span class="slider"></span>
          </label>
        </div>
        <div class="setting-row" v-if="offlineEnabled">
          <div class="setting-label">离线时长上限</div>
          <select v-model="offlineMaxHours" @change="saveSettings" class="setting-select">
            <option :value="2">2小时</option>
            <option :value="4">4小时</option>
            <option :value="8">8小时</option>
            <option :value="12">12小时</option>
            <option :value="24">24小时</option>
          </select>
        </div>
      </div>
      
      <!-- 战斗设置 -->
      <div class="settings-section">
        <div class="section-title">⚔️ 战斗设置</div>
        <div class="setting-row">
          <div class="setting-label">自动使用技能</div>
          <label class="toggle-switch">
            <input type="checkbox" v-model="autoUseSkill" @change="saveSettings">
            <span class="slider"></span>
          </label>
        </div>
        <div class="setting-row">
          <div class="setting-label">自动喝药</div>
          <label class="toggle-switch">
            <input type="checkbox" v-model="autoHeal" @change="saveSettings">
            <span class="slider"></span>
          </label>
        </div>
        <div class="setting-row" v-if="autoHeal">
          <div class="setting-label">血量低于</div>
          <div class="setting-input-group">
            <input 
              type="range" 
              v-model.number="healThreshold" 
              min="10" 
              max="90" 
              @change="saveSettings"
            >
            <span class="range-value">{{ healThreshold }}%</span>
          </div>
        </div>
      </div>
      
      <!-- 掉落设置 -->
      <div class="settings-section">
        <div class="section-title">📦 掉落设置</div>
        <div class="setting-row">
          <div class="setting-label">自动拾取装备</div>
          <label class="toggle-switch">
            <input type="checkbox" v-model="autoPickup" @change="saveSettings">
            <span class="slider"></span>
          </label>
        </div>
        <div class="setting-row">
          <div class="setting-label">自动出售白色装备</div>
          <label class="toggle-switch">
            <input type="checkbox" v-model="autoSellCommon" @change="saveSettings">
            <span class="slider"></span>
          </label>
        </div>
        <div class="setting-row">
          <div class="setting-label">最低保留品质</div>
          <select v-model="minKeepQuality" @change="saveSettings" class="setting-select">
            <option value="common">普通</option>
            <option value="uncommon">优秀</option>
            <option value="rare">稀有</option>
            <option value="epic">史诗</option>
          </select>
        </div>
      </div>
      
      <!-- 挂机地图 -->
      <div class="settings-section">
        <div class="section-title">🗺️ 挂机地图</div>
        <div class="map-list">
          <div 
            v-for="map in availableMaps" 
            :key="map.id"
            class="map-item"
            :class="{ active: selectedMap === map.id }"
            @click="selectMap(map.id)"
          >
            <div class="map-icon">{{ map.icon }}</div>
            <div class="map-info">
              <div class="map-name">{{ map.name }}</div>
              <div class="map-level">等级需求: {{ map.minLevel }}</div>
            </div>
            <div class="map-benefit">
              <span>💰 {{ map.goldRate }}/s</span>
              <span>✨ {{ map.expRate }}/s</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 经验加成显示 -->
      <div class="bonus-display">
        <div class="bonus-title">当前加成</div>
        <div class="bonus-items">
          <div class="bonus-item">
            <span class="bonus-icon">⚡</span>
            <span class="bonus-label">收益倍数</span>
            <span class="bonus-value">x{{ multiplier }}</span>
          </div>
          <div class="bonus-item">
            <span class="bonus-icon">🌙</span>
            <span class="bonus-label">离线加成</span>
            <span class="bonus-value">{{ offlineEnabled ? '已启用' : '未启用' }}</span>
          </div>
          <div class="bonus-item">
            <span class="bonus-icon">📈</span>
            <span class="bonus-label">预计收益</span>
            <span class="bonus-value">{{ expectedRevenue }}/小时</span>
          </div>
        </div>
      </div>
      
      <button class="save-btn" @click="saveSettings">
        💾 保存设置
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'IdleSettingsPanel',
  emits: ['close'],
  setup(props, { emit }) {
    const multiplier = ref(1);
    const offlineEnabled = ref(true);
    const offlineMaxHours = ref(8);
    const autoUseSkill = ref(true);
    const autoHeal = ref(true);
    const healThreshold = ref(30);
    const autoPickup = ref(true);
    const autoSellCommon = ref(true);
    const minKeepQuality = ref('uncommon');
    const selectedMap = ref(1);
    
    const multiplierOptions = [
      { value: 1, label: '普通', cost: 0 },
      { value: 2, label: '双倍', cost: 100 },
      { value: 3, label: '三倍', cost: 200 },
      { value: 5, label: '五倍', cost: 500 },
      { value: 10, label: '十倍', cost: 1000 }
    ];
    
    const availableMaps = ref([
      { id: 1, icon: '🌲', name: '新手森林', minLevel: 1, goldRate: 10, expRate: 5 },
      { id: 2, icon: '🏔️', name: '幽暗山脉', minLevel: 10, goldRate: 25, expRate: 12 },
      { id: 3, icon: '🌋', name: '烈焰火山', minLevel: 30, goldRate: 60, expRate: 30 },
      { id: 4, icon: '❄️', name: '冰封雪原', minLevel: 50, goldRate: 120, expRate: 60 },
      { id: 5, icon: '☁️', name: '云霄仙境', minLevel: 80, goldRate: 250, expRate: 125 },
      { id: 6, icon: '✨', name: '神魔战场', minLevel: 100, goldRate: 500, expRate: 250 }
    ]);
    
    const expectedRevenue = computed(() => {
      const base = 100;
      return base * multiplier.value;
    });
    
    const setMultiplier = (value) => {
      multiplier.value = value;
      saveSettings();
    };
    
    const selectMap = (mapId) => {
      selectedMap.value = mapId;
      saveSettings();
    };
    
    const saveSettings = async () => {
      try {
        const settings = {
          multiplier: multiplier.value,
          offlineEnabled: offlineEnabled.value,
          offlineMaxHours: offlineMaxHours.value,
          autoUseSkill: autoUseSkill.value,
          autoHeal: autoHeal.value,
          healThreshold: healThreshold.value,
          autoPickup: autoPickup.value,
          autoSellCommon: autoSellCommon.value,
          minKeepQuality: minKeepQuality.value,
          selectedMap: selectedMap.value
        };
        
        const response = await fetch('/api/idle/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings)
        });
        
        const data = await response.json();
        if (data.success) {
          console.log('设置已保存');
        }
      } catch (e) {
        console.error('保存设置失败:', e);
      }
    };
    
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/idle/settings');
        const data = await response.json();
        if (data.settings) {
          multiplier.value = data.settings.multiplier || 1;
          offlineEnabled.value = data.settings.offlineEnabled !== false;
          offlineMaxHours.value = data.settings.offlineMaxHours || 8;
          autoUseSkill.value = data.settings.autoUseSkill !== false;
          autoHeal.value = data.settings.autoHeal !== false;
          healThreshold.value = data.settings.healThreshold || 30;
          autoPickup.value = data.settings.autoPickup !== false;
          autoSellCommon.value = data.settings.autoSellCommon || false;
          minKeepQuality.value = data.settings.minKeepQuality || 'uncommon';
          selectedMap.value = data.settings.selectedMap || 1;
        }
      } catch (e) {
        console.error('加载设置失败:', e);
      }
    };
    
    const closePanel = () => {
      emit('close');
    };
    
    onMounted(() => {
      loadSettings();
    });
    
    return {
      multiplier,
      offlineEnabled,
      offlineMaxHours,
      autoUseSkill,
      autoHeal,
      healThreshold,
      autoPickup,
      autoSellCommon,
      minKeepQuality,
      selectedMap,
      multiplierOptions,
      availableMaps,
      expectedRevenue,
      setMultiplier,
      selectMap,
      saveSettings,
      closePanel
    };
  }
};
</script>

<style scoped>
.idle-settings-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 550px;
  max-height: 85vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  border: 2px solid #4a5568;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(90deg, #2d3748 0%, #1a202c 100%);
  border-bottom: 1px solid #4a5568;
}

.panel-title {
  font-size: 20px;
  font-weight: bold;
  color: #ffd700;
}

.close-btn {
  background: none;
  border: none;
  color: #a0aec0;
  font-size: 20px;
  cursor: pointer;
}

.close-btn:hover {
  color: #fff;
}

.panel-content {
  padding: 20px;
  max-height: calc(85vh - 60px);
  overflow-y: auto;
}

.settings-section {
  background: #2d3748;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #ffd700;
  margin-bottom: 12px;
}

.multiplier-options {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.multiplier-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  background: #1a202c;
  border: 2px solid #4a5568;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.multiplier-btn:hover {
  border-color: #667eea;
}

.multiplier-btn.active {
  border-color: #ffd700;
  background: #3d4a5c;
}

.multiplier-value {
  font-size: 20px;
  font-weight: bold;
  color: #fff;
}

.multiplier-label {
  font-size: 12px;
  color: #a0aec0;
  margin: 4px 0;
}

.multiplier-cost {
  font-size: 10px;
  color: #ffd700;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #3d4a5c;
}

.setting-row:last-child {
  border-bottom: none;
}

.setting-label {
  color: #e2e8f0;
}

.setting-select {
  padding: 6px 12px;
  background: #1a202c;
  border: 1px solid #4a5568;
  border-radius: 6px;
  color: #e2e8f0;
}

.setting-input-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.setting-input-group input[type="range"] {
  width: 100px;
}

.range-value {
  color: #ffd700;
  font-weight: bold;
  min-width: 40px;
}

.toggle-switch {
  position: relative;
  width: 50px;
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
  background-color: #4a5568;
  transition: 0.4s;
  border-radius: 26px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #667eea;
}

input:checked + .slider:before {
  transform: translateX(24px);
}

.map-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.map-item {
  display: flex;
  align-items: center;
  padding: 10px;
  background: #1a202c;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.map-item:hover {
  background: #3d4a5c;
}

.map-item.active {
  border-color: #ffd700;
  background: #3d4a5c;
}

.map-icon {
  font-size: 28px;
  margin-right: 12px;
}

.map-info {
  flex: 1;
}

.map-name {
  color: #fff;
  font-weight: bold;
}

.map-level {
  font-size: 12px;
  color: #a0aec0;
}

.map-benefit {
  display: flex;
  gap: 12px;
  color: #ffd700;
  font-size: 12px;
}

.bonus-display {
  background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid #ffd700;
}

.bonus-title {
  color: #ffd700;
  font-weight: bold;
  margin-bottom: 12px;
}

.bonus-items {
  display: flex;
  justify-content: space-around;
}

.bonus-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.bonus-icon {
  font-size: 24px;
}

.bonus-label {
  color: #a0aec0;
  font-size: 12px;
}

.bonus-value {
  color: #22c55e;
  font-weight: bold;
}

.save-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.save-btn:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
}
</style>
