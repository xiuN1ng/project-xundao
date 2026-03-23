<template>
  <div class="guild-building-panel" v-if="visible">
    <div class="panel-header">
      <h2>🏗️ 宗门建筑</h2>
      <button class="close-btn" @click="close">×</button>
    </div>
    
    <div class="panel-content">
      <!-- 宗门资源显示 -->
      <div class="resources-bar">
        <div class="resource-item">
          <span class="resource-icon">💰</span>
          <span class="resource-label">灵石:</span>
          <span class="resource-value">{{ formatNumber(guildResources.gold) }}</span>
        </div>
        <div class="resource-item">
          <span class="resource-icon">⭐</span>
          <span class="resource-label">贡献:</span>
          <span class="resource-value">{{ formatNumber(guildResources.contribution) }}</span>
        </div>
      </div>
      
      <!-- 建筑列表 -->
      <div class="building-list">
        <div 
          v-for="building in buildings" 
          :key="building.id" 
          class="building-card"
          :class="{ 'max-level': building.level >= building.maxLevel }"
        >
          <div class="building-icon">{{ building.icon }}</div>
          <div class="building-info">
            <div class="building-name">{{ building.name }}</div>
            <div class="building-level">
              等级 {{ building.level }} / {{ building.maxLevel }}
              <span v-if="building.level >= building.maxLevel" class="max-badge">满级</span>
            </div>
            <div class="building-effect">
              <div class="effect-label">效果:</div>
              <div class="effect-desc">{{ building.effect }}</div>
            </div>
            <div class="building-progress">
              <div class="progress-track">
                <div class="progress-fill" :style="{ width: (building.level / building.maxLevel * 100) + '%' }"></div>
              </div>
            </div>
          </div>
          <div class="building-action">
            <div class="upgrade-cost" v-if="building.level < building.maxLevel">
              <div class="cost-item" :class="{ insufficient: guildResources.gold < building.upgradeCost.gold }">
                <span>💰</span>
                <span>{{ formatNumber(building.upgradeCost.gold) }}</span>
              </div>
              <div class="cost-item" :class="{ insufficient: guildResources.contribution < building.upgradeCost.contribution }">
                <span>⭐</span>
                <span>{{ formatNumber(building.upgradeCost.contribution) }}</span>
              </div>
            </div>
            <button 
              class="upgrade-btn" 
              :disabled="building.level >= building.maxLevel || !canUpgrade(building)"
              @click="upgradeBuilding(building)"
            >
              <span v-if="building.level >= building.maxLevel">已满级</span>
              <span v-else>升级</span>
            </button>
          </div>
        </div>
      </div>
      
      <!-- 升级提示 -->
      <div class="upgrade-tip">
        💡 建筑等级越高，效果越强
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const visible = ref(false);

const guildResources = ref({
  gold: 125000,
  contribution: 5600
});

const buildings = ref([
  { 
    id: 'hall', 
    name: '大殿', 
    icon: '🏛️', 
    level: 5, 
    maxLevel: 10, 
    effect: '宗门核心建筑，提升所有建筑等级上限+1，全宗门成员获得属性加成',
    upgradeCost: { gold: 50000, contribution: 1000 }
  },
  { 
    id: 'alchemy', 
    name: '炼丹房', 
    icon: '⚗️', 
    level: 3, 
    maxLevel: 10, 
    effect: '提升炼丹成功率+15%，炼制丹药品质等级+1',
    upgradeCost: { gold: 30000, contribution: 600 }
  },
  { 
    id: 'forge', 
    name: '炼器室', 
    icon: '🔨', 
    level: 2, 
    maxLevel: 10, 
    effect: '提升炼器成功率+12%，炼制装备属性加成+5%',
    upgradeCost: { gold: 25000, contribution: 500 }
  },
  { 
    id: 'library', 
    name: '藏经阁', 
    icon: '📚', 
    level: 4, 
    maxLevel: 10, 
    effect: '宗门功法阁，弟子修炼效率+10%，解锁更多功法',
    upgradeCost: { gold: 35000, contribution: 700 }
  },
  { 
    id: 'teaching', 
    name: '传功殿', 
    icon: '📖', 
    level: 3, 
    maxLevel: 10, 
    effect: '师徒传承场所，弟子出师后获得额外属性奖励',
    upgradeCost: { gold: 28000, contribution: 550 }
  }
]);

function canUpgrade(building) {
  return guildResources.value.gold >= building.upgradeCost.gold && 
         guildResources.value.contribution >= building.upgradeCost.contribution;
}

async function upgradeBuilding(building) {
  if (!canUpgrade(building)) {
    showMessage('资源不足，无法升级', 'error');
    return;
  }
  
  if (building.level >= building.maxLevel) {
    return;
  }
  
  try {
    const response = await fetch('/api/guild/building/upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buildingId: building.id })
    });
    
    if (response.ok) {
      building.level++;
      guildResources.value.gold -= building.upgradeCost.gold;
      guildResources.value.contribution -= building.upgradeCost.contribution;
      // 更新升级费用
      building.upgradeCost.gold = Math.floor(building.upgradeCost.gold * 1.5);
      building.upgradeCost.contribution = Math.floor(building.upgradeCost.contribution * 1.5);
      showMessage(`${building.name}升级成功! 等级提升至${building.level}`, 'success');
    }
  } catch (e) {
    // 模拟成功
    building.level++;
    guildResources.value.gold -= building.upgradeCost.gold;
    guildResources.value.contribution -= building.upgradeCost.contribution;
    building.upgradeCost.gold = Math.floor(building.upgradeCost.gold * 1.5);
    building.upgradeCost.contribution = Math.floor(building.upgradeCost.contribution * 1.5);
    showMessage(`${building.name}升级成功! 等级提升至${building.level}`, 'success');
  }
}

function formatNumber(num) {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万';
  }
  return num.toString();
}

function showMessage(msg, type = 'info') {
  if (window.showMessage) {
    window.showMessage(msg, type);
  } else {
    console.log(`[${type}] ${msg}`);
  }
}

function show() {
  visible.value = true;
  loadData();
}

function close() {
  visible.value = false;
}

async function loadData() {
  try {
    const response = await fetch('/api/guild/data');
    if (response.ok) {
      const data = await response.json();
      if (data.resources) {
        guildResources.value = data.resources;
      }
      if (data.buildings) {
        buildings.value = data.buildings;
      }
    }
  } catch (e) {
    console.log('使用默认数据');
  }
}

defineExpose({
  show,
  close
});
</script>

<style scoped>
.guild-building-panel {
  width: 600px;
  max-height: 85vh;
  background: linear-gradient(rgba(26, 26, 46, 0.88), rgba(22, 33, 62, 0.92)), url('../assets/bg-sect-hall.png') center/cover no-repeat;
  border: 2px solid #4a69bd;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(90deg, #4a69bd, #6a89cc);
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
  padding: 16px;
  max-height: 75vh;
  overflow-y: auto;
}

/* 资源栏 */
.resources-bar {
  display: flex;
  justify-content: center;
  gap: 30px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  margin-bottom: 16px;
}

.resource-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}

.resource-icon {
  font-size: 16px;
}

.resource-label {
  color: #8b9dc3;
}

.resource-value {
  color: #ffd700;
  font-weight: bold;
}

/* 建筑列表 */
.building-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.building-card {
  display: flex;
  align-items: stretch;
  padding: 16px;
  background: rgba(74, 105, 189, 0.15);
  border: 1px solid rgba(74, 105, 189, 0.3);
  border-radius: 12px;
  transition: all 0.3s;
}

.building-card:hover {
  background: rgba(74, 105, 189, 0.25);
  transform: translateY(-2px);
}

.building-card.max-level {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.1);
}

.building-icon {
  font-size: 40px;
  margin-right: 16px;
  display: flex;
  align-items: center;
}

.building-info {
  flex: 1;
}

.building-name {
  font-size: 16px;
  font-weight: bold;
  color: white;
  margin-bottom: 4px;
}

.building-level {
  font-size: 13px;
  color: #8b9dc3;
  margin-bottom: 8px;
}

.max-badge {
  background: linear-gradient(135deg, #ffd700, #ffaa00);
  color: #1a1a2e;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  margin-left: 8px;
  font-weight: bold;
}

.building-effect {
  margin-bottom: 8px;
}

.effect-label {
  font-size: 12px;
  color: #8b9dc3;
  margin-bottom: 2px;
}

.effect-desc {
  font-size: 12px;
  color: #a4b0de;
  line-height: 1.4;
}

.building-progress {
  margin-top: 8px;
}

.progress-track {
  height: 6px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4a69bd, #6a89cc);
  border-radius: 3px;
  transition: width 0.3s ease;
}

/* 右侧操作区 */
.building-action {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  margin-left: 16px;
  min-width: 120px;
}

.upgrade-cost {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.cost-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #a4b0de;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.cost-item.insufficient {
  color: #e74c3c;
  background: rgba(231, 76, 60, 0.2);
}

.upgrade-btn {
  padding: 10px 24px;
  background: linear-gradient(135deg, #4a69bd, #6a89cc);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.upgrade-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(74, 105, 189, 0.4);
}

.upgrade-btn:disabled {
  background: #636e72;
  cursor: not-allowed;
}

/* 提示 */
.upgrade-tip {
  text-align: center;
  color: #8b9dc3;
  font-size: 12px;
  margin-top: 16px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
}

/* 滚动条样式 */
.panel-content::-webkit-scrollbar {
  width: 6px;
}

.panel-content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb {
  background: #4a69bd;
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: #6a89cc;
}
</style>
