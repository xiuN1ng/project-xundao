<template>
  <div class="enhancement-panel">
    <div class="enhancement-header">
      <div class="header-title">
        <span class="title-icon">⚒️</span>
        <span>装备强化</span>
      </div>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>
    
    <!-- 强化分类 -->
    <div class="enhancement-tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-name">{{ tab.name }}</span>
      </button>
    </div>
    
    <!-- 装备选择 -->
    <div class="equipment-select" v-if="activeTab === 'refine'">
      <div class="select-title">选择装备</div>
      <div class="equipment-list">
        <div 
          v-for="equip in playerEquipments" 
          :key="equip.id"
          class="equipment-card"
          :class="{ selected: selectedEquipment?.id === equip.id }"
          @click="selectEquipment(equip)"
        >
          <div class="equip-icon" :class="'rarity-' + equip.rarity">
            {{ equip.icon }}
          </div>
          <div class="equip-info">
            <div class="equip-name">{{ equip.name }}</div>
            <div class="equip-level">强化等级: +{{ equip.refineLevel || 0 }}</div>
          </div>
          <div class="equip-select-btn" v-if="selectedEquipment?.id === equip.id">
            ✓
          </div>
        </div>
      </div>
    </div>
    
    <!-- 精炼界面 -->
    <div class="refine-container" v-if="activeTab === 'refine' && selectedEquipment">
      <div class="refine-preview">
        <div class="preview-equip">
          <div class="preview-icon" :class="'rarity-' + selectedEquipment.rarity">
            {{ selectedEquipment.icon }}
          </div>
          <div class="preview-name">{{ selectedEquipment.name }}</div>
          <div class="preview-level">
            <span class="level-label">强化等级</span>
            <span class="level-value">+{{ selectedEquipment.refineLevel || 0 }}</span>
          </div>
        </div>
        
        <!-- 强化效果 -->
        <div class="refine-effects">
          <div class="effect-title">强化效果</div>
          <div class="effect-item">
            <span>攻击力</span>
            <span class="effect-bonus">+{{ getRefineBonus('atk', selectedEquipment.refineLevel || 0) }}</span>
          </div>
          <div class="effect-item">
            <span>防御力</span>
            <span class="effect-bonus">+{{ getRefineBonus('def', selectedEquipment.refineLevel || 0) }}</span>
          </div>
        </div>
        
        <!-- 升级预览 -->
        <div class="upgrade-preview" v-if="selectedEquipment.refineLevel < maxRefineLevel">
          <div class="preview-label">升级后</div>
          <div class="preview-arrow">⬇️</div>
          <div class="preview-result">
            <span class="result-level">+{{ selectedEquipment.refineLevel + 1 }}</span>
            <span class="result-bonus">攻击+{{ getRefineBonus('atk', selectedEquipment.refineLevel + 1) }}</span>
          </div>
        </div>
      </div>
      
      <!-- 强化操作 -->
      <div class="refine-operation">
        <div class="operation-cost">
          <div class="cost-item">
            <span class="cost-icon">💰</span>
            <span class="cost-label">消耗灵石:</span>
            <span class="cost-value" :class="{ insufficient: playerData.spiritStones < refineCost }">
              {{ refineCost }}
            </span>
          </div>
          <div class="cost-item">
            <span class="cost-icon">📦</span>
            <span class="cost-label">消耗材料:</span>
            <span class="cost-value">
              {{ refineMaterial.name }} x{{ refineMaterial.count }}
            </span>
          </div>
        </div>
        
        <!-- 成功率 -->
        <div class="success-rate">
          <div class="rate-label">成功率</div>
          <div class="rate-bar">
            <div class="rate-fill" :style="{ width: successRate + '%' }"></div>
          </div>
          <div class="rate-value">{{ successRate }}%</div>
        </div>
        
        <!-- 强化按钮 -->
        <button 
          class="refine-btn"
          :class="{ 'can-refine': canRefine, 'refining': isRefining }"
          :disabled="!canRefine || isRefining"
          @click="startRefine"
        >
          <span v-if="isRefining" class="refine-text">
            <span class="refine-loader">🔄</span> 强化中...
          </span>
          <span v-else class="refine-text">
            ⚒️ 开始强化
          </span>
        </button>
        
        <!-- 一键强化 -->
        <button 
          class="quick-refine-btn"
          :disabled="!canQuickRefine || isRefining"
          @click="quickRefine"
        >
          ⚡ 一键强化至+{{ maxRefineLevel }}
        </button>
      </div>
    </div>
    
    <!-- 觉醒界面 -->
    <div class="awaken-container" v-if="activeTab === 'awaken'">
      <div class="awaken-info">
        <div class="awaken-title">装备觉醒</div>
        <div class="awaken-desc">觉醒装备可获得额外属性加成</div>
        
        <div class="awaken-equip" v-if="selectedEquipment">
          <div class="equip-icon large" :class="'rarity-' + selectedEquipment.rarity">
            {{ selectedEquipment.icon }}
          </div>
          <div class="equip-name">{{ selectedEquipment.name }}</div>
        </div>
        
        <div class="awaken-effects">
          <div class="effect-title">觉醒效果</div>
          <div class="effect-list">
            <div class="effect-row">
              <span>全属性</span>
              <span class="effect-value">+15%</span>
            </div>
            <div class="effect-row">
              <span>暴击率</span>
              <span class="effect-value">+5%</span>
            </div>
            <div class="effect-row">
              <span>伤害加成</span>
              <span class="effect-value">+10%</span>
            </div>
          </div>
        </div>
        
        <div class="awaken-cost">
          <div class="cost-item">
            <span>觉醒石</span>
            <span> x10</span>
          </div>
          <div class="cost-item">
            <span>灵石</span>
            <span> x100000</span>
          </div>
        </div>
        
        <button 
          class="awaken-btn"
          :disabled="!canAwaken || isAwakening"
          @click="startAwaken"
        >
          {{ isAwakening ? '觉醒中...' : '✨ 觉醒' }}
        </button>
      </div>
    </div>
    
    <!-- 转移界面 -->
    <div class="transfer-container" v-if="activeTab === 'transfer'">
      <div class="transfer-info">
        <div class="transfer-title">强化转移</div>
        <div class="transfer-desc">将装备的强化等级转移到另一件装备</div>
        
        <div class="transfer-slots">
          <div class="transfer-slot">
            <div class="slot-label">源装备</div>
            <div 
              class="slot-equip"
              :class="{ filled: sourceEquip }"
              @click="selectTransferEquip('source')"
            >
              <span v-if="!sourceEquip" class="slot-placeholder">+</span>
              <template v-else>
                <div class="equip-icon small" :class="'rarity-' + sourceEquip.rarity">
                  {{ sourceEquip.icon }}
                </div>
                <div class="equip-level">+{{ sourceEquip.refineLevel || 0 }}</div>
              </template>
            </div>
          </div>
          
          <div class="transfer-arrow">➡️</div>
          
          <div class="transfer-slot">
            <div class="slot-label">目标装备</div>
            <div 
              class="slot-equip"
              :class="{ filled: targetEquip }"
              @click="selectTransferEquip('target')"
            >
              <span v-if="!targetEquip" class="slot-placeholder">+</span>
              <template v-else>
                <div class="equip-icon small" :class="'rarity-' + targetEquip.rarity">
                  {{ targetEquip.icon }}
                </div>
                <div class="equip-level">+{{ targetEquip.refineLevel || 0 }}</div>
              </template>
            </div>
          </div>
        </div>
        
        <div class="transfer-cost">
          <span>转移消耗:</span>
          <span class="cost-value">5000 灵石</span>
        </div>
        
        <button 
          class="transfer-btn"
          :disabled="!canTransfer || isTransferring"
          @click="startTransfer"
        >
          {{ isTransferring ? '转移中...' : '🔄 开始转移' }}
        </button>
      </div>
    </div>
    
    <!-- 玩家资源 -->
    <div class="player-resources">
      <div class="resource-item">
        <span class="resource-icon">💰</span>
        <span class="resource-value">{{ playerData.spiritStones }}</span>
      </div>
      <div class="resource-item">
        <span class="resource-icon">📦</span>
        <span class="resource-value">{{ playerData.materials['强化石'] || 0 }}</span>
      </div>
      <div class="resource-item">
        <span class="resource-icon">💎</span>
        <span class="resource-value">{{ playerData.materials['觉醒石'] || 0 }}</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'EnhancementPanel',
  data() {
    return {
      activeTab: 'refine',
      tabs: [
        { id: 'refine', name: '强化', icon: '⚒️' },
        { id: 'awaken', name: '觉醒', icon: '✨' },
        { id: 'transfer', name: '转移', icon: '🔄' }
      ],
      selectedEquipment: null,
      sourceEquip: null,
      targetEquip: null,
      isRefining: false,
      isAwakening: false,
      isTransferring: false,
      maxRefineLevel: 15,
      playerData: {
        spiritStones: 50000,
        materials: {
          '强化石': 50,
          '觉醒石': 5
        }
      },
      playerEquipments: [
        { id: 1, name: '青锋剑', type: 'weapon', rarity: 2, icon: '⚔️', refineLevel: 3, baseAtk: 100, baseDef: 0 },
        { id: 2, name: '玄铁甲', type: 'armor', rarity: 2, icon: '🛡️', refineLevel: 1, baseAtk: 0, baseDef: 80 },
        { id: 3, name: '腾云靴', type: 'boots', rarity: 1, icon: '👢', refineLevel: 0, baseAtk: 0, baseDef: 30 },
        { id: 4, name: '灵玉戒', type: 'ring', rarity: 3, icon: '💍', refineLevel: 2, baseAtk: 20, baseDef: 20 },
        { id: 5, name: '天蚕丝腰带', type: 'belt', rarity: 1, icon: '👔', refineLevel: 0, baseAtk: 0, baseDef: 25 }
      ]
    };
  },
  computed: {
    refineCost() {
      if (!this.selectedEquipment) return 0;
      const level = this.selectedEquipment.refineLevel || 0;
      return Math.floor(500 * Math.pow(1.5, level));
    },
    refineMaterial() {
      return { name: '强化石', count: 1 + Math.floor((this.selectedEquipment?.refineLevel || 0) / 3) };
    },
    successRate() {
      if (!this.selectedEquipment) return 0;
      const level = this.selectedEquipment.refineLevel || 0;
      // 基础100%，每级降低5%
      return Math.max(10, 100 - level * 5);
    },
    canRefine() {
      if (!this.selectedEquipment) return false;
      if (this.selectedEquipment.refineLevel >= this.maxRefineLevel) return false;
      if (this.playerData.spiritStones < this.refineCost) return false;
      if ((this.playerData.materials['强化石'] || 0) < this.refineMaterial.count) return false;
      return true;
    },
    canQuickRefine() {
      if (!this.selectedEquipment) return false;
      if (this.selectedEquipment.refineLevel >= this.maxRefineLevel) return false;
      
      // 计算一键强化总成本
      let totalCost = 0;
      let totalMaterial = 0;
      for (let i = (this.selectedEquipment.refineLevel || 0); i < this.maxRefineLevel; i++) {
        totalCost += Math.floor(500 * Math.pow(1.5, i));
        totalMaterial += 1 + Math.floor(i / 3);
      }
      
      return this.playerData.spiritStones >= totalCost && 
             (this.playerData.materials['强化石'] || 0) >= totalMaterial;
    },
    canAwaken() {
      if (!this.selectedEquipment) return false;
      if (this.selectedEquipment.refineLevel < 10) return false;
      if ((this.playerData.materials['觉醒石'] || 0) < 10) return false;
      return this.playerData.spiritStones >= 100000;
    },
    canTransfer() {
      if (!this.sourceEquip || !this.targetEquip) return false;
      if (this.sourceEquip.refineLevel <= 0) return false;
      if (this.targetEquip.refineLevel >= this.sourceEquip.refineLevel) return false;
      return this.playerData.spiritStones >= 5000;
    }
  },
  methods: {
    selectEquipment(equip) {
      this.selectedEquipment = equip;
    },
    getRefineBonus(type, level) {
      if (!this.selectedEquipment) return 0;
      const baseValue = type === 'atk' ? this.selectedEquipment.baseAtk : this.selectedEquipment.baseDef;
      // 每级增加5%
      return Math.floor(baseValue * (level * 0.05));
    },
    startRefine() {
      if (!this.canRefine) return;
      
      this.isRefining = true;
      
      // 模拟强化过程
      setTimeout(() => {
        const roll = Math.random() * 100;
        
        if (roll < this.successRate) {
          // 强化成功
          this.selectedEquipment.refineLevel++;
          this.playerData.spiritStones -= this.refineCost;
          this.playerData.materials['强化石'] -= this.refineMaterial.count;
          console.log('强化成功！当前等级:', this.selectedEquipment.refineLevel);
        } else {
          // 强化失败
          console.log('强化失败...');
        }
        
        this.isRefining = false;
      }, 1500);
    },
    quickRefine() {
      if (!this.canQuickRefine) return;
      
      this.isRefining = true;
      
      // 连续强化
      let attempts = 0;
      const maxAttempts = this.maxRefineLevel - (this.selectedEquipment.refineLevel || 0);
      
      const attemptRefine = () => {
        if (attempts >= maxAttempts || this.selectedEquipment.refineLevel >= this.maxRefineLevel) {
          this.isRefining = false;
          return;
        }
        
        const roll = Math.random() * 100;
        const level = this.selectedEquipment.refineLevel;
        const rate = Math.max(10, 100 - level * 5);
        
        if (roll < rate) {
          this.selectedEquipment.refineLevel++;
          this.playerData.spiritStones -= Math.floor(500 * Math.pow(1.5, level));
          this.playerData.materials['强化石'] -= (1 + Math.floor(level / 3));
        }
        
        attempts++;
        
        if (this.selectedEquipment.refineLevel < this.maxRefineLevel) {
          setTimeout(attemptRefine, 100);
        } else {
          this.isRefining = false;
        }
      };
      
      attemptRefine();
    },
    selectTransferEquip(slot) {
      // 简化实现
      if (slot === 'source') {
        this.sourceEquip = this.playerEquipments.find(e => e.refineLevel > 0) || null;
      } else {
        this.targetEquip = this.playerEquipments.find(e => e.id !== this.sourceEquip?.id) || null;
      }
    },
    startTransfer() {
      if (!this.canTransfer) return;
      
      this.isTransferring = true;
      
      setTimeout(() => {
        this.targetEquip.refineLevel = this.sourceEquip.refineLevel;
        this.sourceEquip.refineLevel = 0;
        this.playerData.spiritStones -= 5000;
        
        console.log('转移成功！');
        this.isTransferring = false;
      }, 1500);
    },
    startAwaken() {
      if (!this.canAwaken) return;
      
      this.isAwakening = true;
      
      setTimeout(() => {
        this.playerData.materials['觉醒石'] -= 10;
        this.playerData.spiritStones -= 100000;
        console.log('觉醒成功！');
        this.isAwakening = false;
      }, 2000);
    }
  }
};
</script>

<style scoped>
.enhancement-panel {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 20px;
  color: #fff;
  max-width: 800px;
  max-height: 85vh;
  overflow-y: auto;
}

.enhancement-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 24px;
  font-weight: bold;
}

.title-icon {
  font-size: 28px;
}

.close-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #fff;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  transition: all 0.3s;
}

.close-btn:hover {
  background: rgba(255, 100, 100, 0.3);
  transform: rotate(90deg);
}

/* 标签页 */
.enhancement-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #aaa;
  padding: 12px 20px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
}

.tab-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.tab-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: transparent;
  color: #fff;
}

.tab-icon {
  font-size: 18px;
}

/* 装备选择 */
.equipment-select {
  margin-bottom: 20px;
}

.select-title {
  font-size: 14px;
  color: #aaa;
  margin-bottom: 12px;
}

.equipment-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
  max-height: 200px;
  overflow-y: auto;
}

.equipment-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
}

.equipment-card:hover {
  background: rgba(255, 255, 255, 0.1);
}

.equipment-card.selected {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.2);
}

.equip-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  border: 2px solid #aaa;
}

.equip-icon.rarity-1 { border-color: #aaa; }
.equip-icon.rarity-2 { border-color: #4ecdc4; }
.equip-icon.rarity-3 { border-color: #9b59b6; }
.equip-icon.rarity-4 { border-color: #f39c12; }

.equip-info {
  flex: 1;
  min-width: 0;
}

.equip-name {
  font-size: 13px;
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.equip-level {
  font-size: 11px;
  color: #ffd700;
}

.equip-select-btn {
  color: #4ecdc4;
  font-size: 18px;
}

/* 精炼界面 */
.refine-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.refine-preview {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 20px;
}

.preview-equip {
  text-align: center;
  margin-bottom: 20px;
}

.preview-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  border: 3px solid #aaa;
}

.preview-icon.rarity-1 { border-color: #aaa; }
.preview-icon.rarity-2 { border-color: #4ecdc4; }
.preview-icon.rarity-3 { border-color: #9b59b6; }
.preview-icon.rarity-4 { border-color: #f39c12; }

.preview-name {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 8px;
}

.preview-level {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.level-label {
  font-size: 12px;
  color: #aaa;
}

.level-value {
  font-size: 24px;
  font-weight: bold;
  color: #ffd700;
}

.refine-effects {
  margin-bottom: 20px;
}

.effect-title {
  font-size: 14px;
  color: #aaa;
  margin-bottom: 10px;
}

.effect-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  margin-bottom: 8px;
  font-size: 13px;
}

.effect-bonus {
  color: #4ecdc4;
  font-weight: bold;
}

.upgrade-preview {
  text-align: center;
  padding: 15px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 8px;
  border: 1px dashed rgba(102, 126, 234, 0.3);
}

.preview-label {
  font-size: 12px;
  color: #aaa;
}

.preview-arrow {
  font-size: 20px;
  margin: 8px 0;
}

.preview-result {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.result-level {
  font-size: 20px;
  font-weight: bold;
  color: #ffd700;
}

.result-bonus {
  font-size: 12px;
  color: #4ecdc4;
}

/* 强化操作 */
.refine-operation {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.operation-cost {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  padding: 15px;
}

.cost-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  font-size: 13px;
}

.cost-icon {
  font-size: 16px;
}

.cost-label {
  color: #aaa;
}

.cost-value {
  color: #ffd700;
  font-weight: bold;
}

.cost-value.insufficient {
  color: #ff4757;
}

.success-rate {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  padding: 15px;
}

.rate-label {
  font-size: 13px;
  color: #aaa;
  margin-bottom: 8px;
}

.rate-bar {
  height: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 8px;
}

.rate-fill {
  height: 100%;
  background: linear-gradient(90deg, #4ecdc4, #44a08d);
  border-radius: 5px;
  transition: width 0.3s;
}

.rate-value {
  text-align: center;
  font-size: 18px;
  font-weight: bold;
  color: #4ecdc4;
}

.refine-btn {
  width: 100%;
  padding: 15px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.refine-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
}

.refine-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.refine-btn.can-refine {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.refine-btn.refining {
  background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
}

.refine-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.refine-loader {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.quick-refine-btn {
  width: 100%;
  padding: 12px;
  background: rgba(255, 215, 0, 0.1);
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 8px;
  color: #ffd700;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
}

.quick-refine-btn:hover:not(:disabled) {
  background: rgba(255, 215, 0, 0.2);
}

.quick-refine-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 觉醒界面 */
.awaken-container, .transfer-container {
  display: flex;
  justify-content: center;
}

.awaken-info, .transfer-info {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 30px;
  text-align: center;
  max-width: 400px;
  width: 100%;
}

.awaken-title, .transfer-title {
  font-size: 22px;
  font-weight: bold;
  margin-bottom: 8px;
}

.awaken-desc, .transfer-desc {
  font-size: 13px;
  color: #aaa;
  margin-bottom: 20px;
}

.awaken-equip {
  margin-bottom: 20px;
}

.equip-icon.large {
  width: 80px;
  height: 80px;
  margin: 0 auto 10px;
  font-size: 40px;
}

.equip-icon.small {
  width: 50px;
  height: 50px;
  font-size: 24px;
}

.awaken-effects {
  margin-bottom: 20px;
}

.effect-list {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 10px;
}

.effect-row {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  font-size: 13px;
}

.effect-value {
  color: #4ecdc4;
  font-weight: bold;
}

.awaken-cost, .transfer-cost {
  margin-bottom: 20px;
  font-size: 13px;
}

.cost-value {
  color: #ffd700;
  font-weight: bold;
}

.awaken-btn, .transfer-btn {
  width: 100%;
  padding: 15px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.awaken-btn:disabled, .transfer-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 转移界面 */
.transfer-slots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 20px;
}

.transfer-slot {
  text-align: center;
}

.slot-label {
  font-size: 12px;
  color: #aaa;
  margin-bottom: 8px;
}

.slot-equip {
  width: 80px;
  height: 80px;
  border: 2px dashed rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
}

.slot-equip:hover {
  border-color: #667eea;
}

.slot-equip.filled {
  border-style: solid;
  background: rgba(255, 255, 255, 0.05);
}

.slot-placeholder {
  font-size: 30px;
  color: #aaa;
}

.transfer-arrow {
  font-size: 24px;
}

/* 玩家资源 */
.player-resources {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-top: 20px;
  padding: 15px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
}

.resource-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.resource-icon {
  font-size: 18px;
}

.resource-value {
  font-size: 16px;
  font-weight: bold;
  color: #ffd700;
}

/* 响应式 */
@media (max-width: 600px) {
  .refine-container {
    grid-template-columns: 1fr;
  }
  
  .equipment-list {
    grid-template-columns: 1fr;
  }
}
</style>
