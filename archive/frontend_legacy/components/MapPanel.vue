<template>
  <div class="map-panel">
    <div class="panel-header">
      <h3>🗺️ 世界地图</h3>
      <button class="close-btn" @click="closePanel">×</button>
    </div>
    
    <div class="panel-content">
      <!-- 地图视图切换 -->
      <div class="view-tabs">
        <button 
          :class="['tab-btn', { active: viewMode === 'world' }]"
          @click="viewMode = 'world'"
        >
          🌍 世界地图
        </button>
        <button 
          :class="['tab-btn', { active: viewMode === 'mini' }]"
          @click="viewMode = 'mini'"
        >
          🧭 小地图
        </button>
      </div>
      
      <!-- 世界地图视图 -->
      <div v-if="viewMode === 'world'" class="world-map">
        <div class="map-container">
          <!-- 地图区域 -->
          <div class="map-areas">
            <div 
              v-for="area in worldAreas" 
              :key="area.id"
              :class="['map-area', area.id, { locked: !area.unlocked, current: area.id === currentArea }]"
              :style="area.style"
              @click="selectArea(area)"
            >
              <span class="area-name">{{ area.name }}</span>
              <span v-if="area.unlocked" class="area-level">Lv.{{ area.level }}</span>
              <span v-else class="area-lock">🔒</span>
            </div>
          </div>
          
          <!-- 当前区域信息 -->
          <div v-if="selectedArea" class="area-info">
            <div class="info-header">
              <h4>{{ selectedArea.name }}</h4>
              <span class="level-badge">Lv.{{ selectedArea.level }}</span>
            </div>
            <p class="description">{{ selectedArea.description }}</p>
            <div class="area-stats">
              <div class="stat">
                <span class="stat-label">怪物等级</span>
                <span class="stat-value">{{ selectedArea.monsterLevel }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">推荐战力</span>
                <span class="stat-value">{{ formatNumber(selectedArea.reqPower) }}</span>
              </div>
            </div>
            <div class="area-rewards">
              <span class="reward-title">产出:</span>
              <div class="reward-icons">
                <span v-for="reward in selectedArea.rewards" :key="reward" class="reward-icon">
                  {{ reward }}
                </span>
              </div>
            </div>
            <button 
              class="teleport-btn"
              :disabled="!selectedArea.unlocked || currentArea === selectedArea.id"
              @click="teleportTo(selectedArea)"
            >
              {{ currentArea === selectedArea.id ? '当前所在' : '传送进入' }}
            </button>
          </div>
        </div>
      </div>
      
      <!-- 小地图视图 -->
      <div v-if="viewMode === 'mini'" class="mini-map">
        <div class="mini-map-container">
          <div class="player-marker">👤</div>
          <div class="compass">
            <span class="direction n">北</span>
            <span class="direction e">东</span>
            <span class="direction s">南</span>
            <span class="direction w">西</span>
          </div>
          <div class="monster-markers">
            <div 
              v-for="(monster, idx) in nearbyMonsters" 
              :key="idx"
              class="monster-marker"
              :style="{ top: monster.y + '%', left: monster.x + '%' }"
            >
              {{ monster.icon }}
            </div>
          </div>
        </div>
        
        <!-- 当前位置信息 -->
        <div class="location-info">
          <div class="location-row">
            <span class="label">当前区域:</span>
            <span class="value">{{ currentAreaName }}</span>
          </div>
          <div class="location-row">
            <span class="label">坐标:</span>
            <span class="value">{{ playerX }}, {{ playerY }}</span>
          </div>
        </div>
        
        <!-- 快速传送 -->
        <div class="quick-teleport">
          <h4>快速传送</h4>
          <div class="teleport-list">
            <button 
              v-for="area in quickAreas" 
              :key="area.id"
              class="teleport-item"
              :disabled="!area.unlocked"
              @click="teleportTo(area)"
            >
              <span class="area-icon">{{ area.icon }}</span>
              <span class="area-name">{{ area.name }}</span>
              <span v-if="!area.unlocked" class="lock-icon">🔒</span>
            </button>
          </div>
        </div>
      </div>
      
      <!-- 已解锁区域列表 -->
      <div class="unlocked-areas">
        <h4>已解锁区域</h4>
        <div class="area-grid">
          <div 
            v-for="area in unlockedAreas" 
            :key="area.id"
            :class="['area-card', { current: area.id === currentArea }]"
            @click="selectArea(area)"
          >
            <div class="card-icon">{{ area.icon }}</div>
            <div class="card-info">
              <span class="card-name">{{ area.name }}</span>
              <span class="card-level">Lv.{{ area.level }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MapPanel',
  emits: ['close'],
  data() {
    return {
      viewMode: 'world',
      currentArea: 'start',
      currentAreaName: '新手村',
      playerX: 50,
      playerY: 50,
      selectedArea: null,
      worldAreas: [
        {
          id: 'start',
          name: '新手村',
          level: 1,
          icon: '🏘️',
          unlocked: true,
          monsterLevel: '1-10',
          reqPower: 0,
          description: '凡人的起点，灵气稀薄的和平之地',
          rewards: ['📦', '💰', '🧪'],
          style: { top: '70%', left: '50%' }
        },
        {
          id: 'forest',
          name: '青云森林',
          level: 10,
          icon: '🌲',
          unlocked: true,
          monsterLevel: '10-30',
          reqPower: 500,
          description: '灵气充沛的原始森林，各类灵兽栖息',
          rewards: ['🪵', '🌿', '🐾'],
          style: { top: '55%', left: '35%' }
        },
        {
          id: 'mountain',
          name: '苍云山',
          level: 30,
          icon: '⛰️',
          unlocked: true,
          monsterLevel: '30-50',
          reqPower: 2000,
          description: '高耸入云的仙山，有诸多门派遗址',
          rewards: ['🪨', '⚔️', '📜'],
          style: { top: '30%', left: '45%' }
        },
        {
          id: 'lake',
          name: '碧波湖',
          level: 50,
          icon: '🌊',
          unlocked: true,
          monsterLevel: '50-70',
          reqPower: 5000,
          description: '神秘的湖泊水下有龙宫遗迹',
          rewards: ['💎', '🔮', '🐉'],
          style: { top: '45%', left: '65%' }
        },
        {
          id: 'desert',
          name: '火焰沙漠',
          level: 70,
          icon: '🏜️',
          unlocked: false,
          monsterLevel: '70-90',
          reqPower: 15000,
          description: '炽热的沙漠，有上古仙人洞府',
          rewards: ['🔥', '💀', '🏺'],
          style: { top: '20%', left: '75%' }
        },
        {
          id: 'abyss',
          name: '万魔渊',
          level: 90,
          icon: '👹',
          unlocked: false,
          monsterLevel: '90-110',
          reqPower: 50000,
          description: '魔气纵横的深渊，镇压着上古魔头',
          rewards: ['😈', '🩸', '👻'],
          style: { top: '60%', left: '85%' }
        },
        {
          id: 'heaven',
          name: '仙界入口',
          level: 100,
          icon: '☁️',
          unlocked: false,
          monsterLevel: '100+',
          reqPower: 100000,
          description: '飞升仙界，万灵向往之地',
          rewards: ['✨', '🌟', '👼'],
          style: { top: '10%', left: '50%' }
        }
      ],
      nearbyMonsters: [
        { x: 30, y: 40, icon: '👾' },
        { x: 70, y: 30, icon: '👹' },
        { x: 50, y: 70, icon: '🐉' }
      ]
    };
  },
  computed: {
    unlockedAreas() {
      return this.worldAreas.filter(a => a.unlocked);
    },
    quickAreas() {
      return this.worldAreas.slice(0, 5);
    }
  },
  mounted() {
    this.loadMapData();
  },
  methods: {
    closePanel() {
      this.$emit('close');
    },
    loadMapData() {
      // 从服务器加载地图数据
      const savedArea = localStorage.getItem('currentArea');
      if (savedArea) {
        this.currentArea = savedArea;
        const area = this.worldAreas.find(a => a.id === savedArea);
        if (area) {
          this.currentAreaName = area.name;
        }
      }
    },
    formatNumber(num) {
      if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万';
      }
      return num.toString();
    },
    selectArea(area) {
      this.selectedArea = area;
    },
    teleportTo(area) {
      if (!area.unlocked || this.currentArea === area.id) return;
      
      // 发送传送请求
      if (window.gameEngine) {
        window.gameEngine.teleport(area.id);
      }
      
      this.currentArea = area.id;
      this.currentAreaName = area.name;
      localStorage.setItem('currentArea', area.id);
      this.closePanel();
    }
  }
};
</script>

<style scoped>
.map-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  height: 80vh;
  background: linear-gradient(145deg, #1a1a2e, #16213e);
  border-radius: 16px;
  border: 2px solid #38b2ac;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  color: #e2e8f0;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #4a5568;
  background: linear-gradient(90deg, #285e61, #1d4044);
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
}

.close-btn:hover {
  color: #fc8181;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.view-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.tab-btn {
  flex: 1;
  padding: 10px;
  border: 2px solid #4a5568;
  border-radius: 10px;
  background: #2d3748;
  color: #a0aec0;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.tab-btn.active {
  border-color: #38b2ac;
  background: linear-gradient(145deg, #38b2ac, #2c7a7b);
  color: #fff;
}

/* 世界地图 */
.world-map {
  height: 400px;
}

.map-container {
  display: flex;
  gap: 16px;
  height: 100%;
}

.map-areas {
  flex: 2;
  position: relative;
  background: linear-gradient(180deg, #1a365d, #2d3748);
  border-radius: 12px;
  border: 2px solid #4a5568;
  min-height: 350px;
}

.map-area {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: rgba(56, 178, 172, 0.3);
  border: 2px solid #38b2ac;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.map-area:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 15px rgba(56, 178, 172, 0.5);
}

.map-area.locked {
  background: rgba(113, 128, 150, 0.3);
  border-color: #718096;
}

.map-area.current {
  background: rgba(237, 137, 54, 0.4);
  border-color: #ed8936;
  box-shadow: 0 0 20px rgba(237, 137, 54, 0.6);
}

.area-name {
  font-size: 12px;
  font-weight: bold;
  color: #e2e8f0;
}

.area-level {
  font-size: 10px;
  color: #38b2ac;
}

.area-lock {
  font-size: 14px;
}

.area-info {
  flex: 1;
  padding: 16px;
  background: rgba(45, 55, 72, 0.8);
  border-radius: 12px;
  border: 1px solid #4a5568;
}

.info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.info-header h4 {
  margin: 0;
  color: #38b2ac;
}

.level-badge {
  padding: 4px 10px;
  background: rgba(56, 178, 172, 0.3);
  border-radius: 20px;
  font-size: 12px;
  color: #38b2ac;
}

.description {
  font-size: 13px;
  color: #a0aec0;
  margin-bottom: 16px;
}

.area-stats {
  display: flex;
  gap: 20px;
  margin-bottom: 16px;
}

.stat {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 12px;
  color: #718096;
}

.stat-value {
  font-size: 16px;
  color: #fbbf24;
  font-weight: bold;
}

.area-rewards {
  margin-bottom: 16px;
}

.reward-title {
  font-size: 12px;
  color: #718096;
  display: block;
  margin-bottom: 8px;
}

.reward-icons {
  display: flex;
  gap: 8px;
}

.reward-icon {
  font-size: 20px;
}

.teleport-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(145deg, #38b2ac, #2c7a7b);
  color: #fff;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.teleport-btn:hover:not(:disabled) {
  box-shadow: 0 4px 15px rgba(56, 178, 172, 0.4);
}

.teleport-btn:disabled {
  background: #4a5568;
  cursor: not-allowed;
}

/* 小地图 */
.mini-map {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mini-map-container {
  position: relative;
  height: 200px;
  background: radial-gradient(circle, #2d3748, #1a365d);
  border-radius: 12px;
  border: 2px solid #4a5568;
  overflow: hidden;
}

.player-marker {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 24px;
}

.compass {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 50px;
  height: 50px;
  border: 2px solid #4a5568;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
}

.direction {
  position: absolute;
  font-size: 10px;
  color: #a0aec0;
}

.direction.n { top: 2px; left: 50%; transform: translateX(-50%); }
.direction.s { bottom: 2px; left: 50%; transform: translateX(-50%); }
.direction.w { top: 50%; left: 2px; transform: translateY(-50%); }
.direction.e { top: 50%; right: 2px; transform: translateY(-50%); }

.monster-marker {
  position: absolute;
  font-size: 16px;
  transform: translate(-50%, -50%);
}

.location-info {
  padding: 12px;
  background: rgba(45, 55, 72, 0.8);
  border-radius: 8px;
}

.location-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
}

.location-row .label {
  color: #718096;
}

.location-row .value {
  color: #38b2ac;
  font-weight: bold;
}

.quick-teleport {
  padding: 12px;
  background: rgba(237, 137, 54, 0.1);
  border-radius: 10px;
  border: 1px solid #ed8936;
}

.quick-teleport h4 {
  margin: 0 0 10px 0;
  color: #ed8936;
  font-size: 14px;
}

.teleport-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.teleport-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  background: rgba(45, 55, 72, 0.8);
  border: 1px solid #4a5568;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.teleport-item:hover:not(:disabled) {
  border-color: #ed8936;
  background: rgba(237, 137, 54, 0.2);
}

.teleport-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.area-icon {
  font-size: 18px;
}

.area-name {
  flex: 1;
  text-align: left;
  font-size: 13px;
}

.lock-icon {
  font-size: 14px;
}

/* 已解锁区域 */
.unlocked-areas {
  margin-top: 20px;
}

.unlocked-areas h4 {
  margin: 0 0 12px 0;
  color: #38b2ac;
}

.area-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}

.area-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: rgba(45, 55, 72, 0.6);
  border: 2px solid #4a5568;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.area-card:hover {
  border-color: #38b2ac;
}

.area-card.current {
  border-color: #ed8936;
  background: rgba(237, 137, 54, 0.2);
}

.card-icon {
  font-size: 24px;
}

.card-info {
  display: flex;
  flex-direction: column;
}

.card-name {
  font-size: 13px;
  font-weight: bold;
}

.card-level {
  font-size: 11px;
  color: #38b2ac;
}
</style>
