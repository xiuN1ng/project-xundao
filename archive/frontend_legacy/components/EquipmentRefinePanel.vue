<template>
  <div class="equipment-refine-panel">
    <div class="panel-header">
      <h2>⚔️ 装备精炼·觉醒</h2>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>
    
    <div class="panel-tabs">
      <div 
        class="tab-item" 
        :class="{ active: activeTab === 'refine' }"
        @click="activeTab = 'refine'"
      >
        🔨 精炼
      </div>
      <div 
        class="tab-item" 
        :class="{ active: activeTab === 'awaken' }"
        @click="activeTab = 'awaken'"
      >
        ✨ 觉醒
      </div>
    </div>
    
    <div class="panel-content">
      <!-- 装备列表 -->
      <div class="equip-list" v-if="!selectedEquip">
        <div 
          v-for="equip in equipmentList" 
          :key="equip.id"
          class="equip-card"
          @click="selectEquip(equip)"
        >
          <div class="equip-icon" :class="equip.rarity">
            {{ getEquipIcon(equip.type) }}
          </div>
          <div class="equip-info">
            <div class="equip-name">{{ equip.name }}</div>
            <div class="equip-rarity" :class="equip.rarity">{{ getRarityName(equip.rarity) }}</div>
            <div class="equip-stats">
              <span v-if="equip.atk">攻击+{{ equip.atk }}</span>
              <span v-if="equip.def">防御+{{ equip.def }}</span>
              <span v-if="equip.hp">生命+{{ equip.hp }}</span>
            </div>
            <div class="equip-level" v-if="equip.refine_level > 0">
              精炼+{{ equip.refine_level }}
            </div>
            <div class="equip-awakened" v-if="equip.awakened">
              ✨ 已觉醒
            </div>
          </div>
        </div>
        
        <div v-if="equipmentList.length === 0" class="empty-tip">
          暂无装备，请先挑战怪物获得装备
        </div>
      </div>
      
      <!-- 精炼界面 -->
      <div class="refine-view" v-if="selectedEquip && activeTab === 'refine'">
        <div class="back-btn" @click="selectedEquip = null">← 返回装备列表</div>
        
        <div class="selected-equip">
          <div class="equip-icon large" :class="selectedEquip.rarity">
            {{ getEquipIcon(selectedEquip.type) }}
          </div>
          <div class="equip-detail">
            <h3>{{ selectedEquip.name }}</h3>
            <div class="rarity" :class="selectedEquip.rarity">{{ getRarityName(selectedEquip.rarity) }}</div>
            
            <div class="current-stats">
              <div class="stat-row">
                <span>当前精炼等级：</span>
                <span class="highlight">+{{ selectedEquip.refine_level || 0 }}</span>
              </div>
              <div class="stat-row">
                <span>攻击：</span>
                <span>{{ selectedEquip.atk || 0 }}</span>
              </div>
              <div class="stat-row">
                <span>防御：</span>
                <span>{{ selectedEquip.def || 0 }}</span>
              </div>
              <div class="stat-row">
                <span>生命：</span>
                <span>{{ selectedEquip.hp || 0 }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="refine-info">
          <h4>📋 精炼预览</h4>
          <div class="preview-bonus">
            <div class="bonus-item">
              <span>精炼+{{ (selectedEquip.refine_level || 0) + 1 }}属性：</span>
              <span class="bonus-value">攻击+{{ refineBonus.atk }} 防御+{{ refineBonus.def }} 生命+{{ refineBonus.hp }}</span>
            </div>
          </div>
        </div>
        
        <div class="refine-cost">
          <div class="cost-item">
            <span>消耗灵石：</span>
            <span class="cost-value" :class="{ insufficient: !canRefine }">
              {{ refineCost }} 💰
            </span>
          </div>
          <div class="player-stones">
            当前灵石：{{ playerSpiritStones }} 💰
          </div>
        </div>
        
        <button 
          class="refine-btn"
          :disabled="!canRefine"
          @click="doRefine"
        >
          🔨 开始精炼
        </button>
        
        <div class="refine-tips">
          💡 精炼可以提升装备属性，精炼等级越高，消耗越多
        </div>
      </div>
      
      <!-- 觉醒界面 -->
      <div class="awaken-view" v-if="selectedEquip && activeTab === 'awaken'">
        <div class="back-btn" @click="selectedEquip = null">← 返回装备列表</div>
        
        <div class="selected-equip">
          <div class="equip-icon large" :class="selectedEquip.rarity">
            {{ getEquipIcon(selectedEquip.type) }}
          </div>
          <div class="equip-detail">
            <h3>{{ selectedEquip.name }}</h3>
            <div class="rarity" :class="selectedEquip.rarity">{{ getRarityName(selectedEquip.rarity) }}</div>
            
            <div class="current-stats">
              <div class="stat-row" v-if="selectedEquip.awakened">
                <span>觉醒状态：</span>
                <span class="highlight awakened">✨ 已觉醒</span>
              </div>
              <div class="stat-row" v-if="selectedEquip.awakened">
                <span>暴击率：</span>
                <span>+{{ selectedEquip.crit_rate || 0 }}%</span>
              </div>
              <div class="stat-row" v-if="!selectedEquip.awakened">
                <span>觉醒状态：</span>
                <span class="not-awakened">未觉醒</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="awaken-info" v-if="!selectedEquip.awakened">
          <h4>✨ 觉醒效果</h4>
          <div class="awaken-bonus">
            <div class="bonus-item">
              <span>觉醒后获得：</span>
              <span class="bonus-value">
                攻击+{{ awakenEffect.atk }} 暴击率+{{ awakenEffect.crit_rate }}%
              </span>
            </div>
          </div>
        </div>
        
        <div class="awaken-material" v-if="!selectedEquip.awakened">
          <h4>📦 觉醒材料</h4>
          <div class="material-item">
            <span>{{ awakenMaterial.name }}：</span>
            <span :class="{ insufficient: !hasMaterial }">
              {{ materialCount }} / 1
            </span>
          </div>
        </div>
        
        <button 
          v-if="!selectedEquip.awakened"
          class="awaken-btn"
          :disabled="!canAwaken"
          @click="doAwaken"
        >
          ✨ 觉醒装备
        </button>
        
        <div v-if="selectedEquip.awakened" class="already-awakened">
          ✅ 该装备已觉醒，无法再次觉醒
        </div>
        
        <div class="awaken-tips">
          💡 觉醒可以解锁装备额外属性，每个装备只能觉醒一次
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'EquipmentRefinePanel',
  emits: ['close'],
  data() {
    return {
      activeTab: 'refine',
      selectedEquip: null,
      equipmentList: [],
      playerSpiritStones: 0,
      refineCost: 0,
      refineBonus: { atk: 0, def: 0, hp: 0 },
      awakenMaterial: { item_id: '', name: '', cost: 0 },
      awakenEffect: { atk: 0, crit_rate: 0 },
      materialCount: 0,
      canRefine: false,
      canAwaken: false
    };
  },
  async mounted() {
    await this.loadEquipment();
  },
  methods: {
    async loadEquipment() {
      try {
        const playerId = window.gamePlayerId || 1;
        
        // 从本地存储获取玩家数据
        const playerData = JSON.parse(localStorage.getItem('playerData') || '{}');
        this.playerSpiritStones = playerData.spirit_stones || 0;
        
        // 获取装备列表
        const inventory = playerData.inventory || [];
        this.equipmentList = inventory.filter(item => 
          item.type === 'weapon' || item.type === 'armor' || item.type === 'accessory'
        );
        
        if (this.equipmentList.length > 0) {
          this.selectEquip(this.equipmentList[0]);
        }
      } catch (e) {
        console.error('加载装备失败:', e);
      }
    },
    getEquipIcon(type) {
      const icons = {
        weapon: '⚔️',
        armor: '🛡️',
        accessory: '💍'
      };
      return icons[type] || '📦';
    },
    getRarityName(rarity) {
      const names = {
        common: '普通',
        uncommon: '优秀',
        rare: '稀有',
        epic: '史诗',
        legendary: '传说',
        mythic: '神话'
      };
      return names[rarity] || '普通';
    },
    async selectEquip(equip) {
      this.selectedEquip = equip;
      
      if (this.activeTab === 'refine') {
        await this.loadRefineInfo(equip);
      } else {
        await this.loadAwakenInfo(equip);
      }
    },
    async loadRefineInfo(equip) {
      try {
        const playerId = window.gamePlayerId || 1;
        const response = await fetch(`/api/equipment/refine-info?playerId=${playerId}&equipId=${equip.id}`);
        const result = await response.json();
        
        if (result.success) {
          this.refineCost = result.data.cost;
          this.refineBonus = result.data.bonus;
          this.canRefine = result.data.canRefine;
        }
      } catch (e) {
        // 使用默认计算
        const quality = equip.rarity || 'common';
        const costs = { common: 100, uncommon: 300, rare: 800, epic: 2000, legendary: 5000, mythic: 15000 };
        const bonuses = {
          common: { atk: 5, def: 3, hp: 20 },
          uncommon: { atk: 12, def: 8, hp: 50 },
          rare: { atk: 25, def: 15, hp: 100 },
          epic: { atk: 50, def: 30, hp: 200 },
          legendary: { atk: 100, def: 60, hp: 400 },
          mythic: { atk: 200, def: 120, hp: 800 }
        };
        
        this.refineCost = costs[quality] || 100;
        this.refineBonus = bonuses[quality] || bonuses.common;
        this.canRefine = this.playerSpiritStones >= this.refineCost;
      }
    },
    async loadAwakenInfo(equip) {
      try {
        const playerId = window.gamePlayerId || 1;
        const response = await fetch(`/api/equipment/awaken-info?playerId=${playerId}&equipId=${equip.id}`);
        const result = await response.json();
        
        if (result.success) {
          this.awakenMaterial = result.data.material;
          this.awakenEffect = result.data.effect;
          this.canAwaken = result.data.canAwaken;
          
          const playerData = JSON.parse(localStorage.getItem('playerData') || '{}');
          const inventory = playerData.inventory || [];
          const material = inventory.find(i => i.item_id === this.awakenMaterial.item_id);
          this.materialCount = material ? material.quantity : 0;
        }
      } catch (e) {
        const quality = equip.rarity || 'common';
        const materials = {
          common: { item_id: 'awaken_stone_common', name: '初级觉醒石' },
          uncommon: { item_id: 'awaken_stone_uncommon', name: '中级觉醒石' },
          rare: { item_id: 'awaken_stone_rare', name: '高级觉醒石' },
          epic: { item_id: 'awaken_stone_epic', name: '顶级觉醒石' },
          legendary: { item_id: 'awaken_stone_legendary', name: '神级觉醒石' },
          mythic: { item_id: 'awaken_stone_mythic', name: '神话觉醒石' }
        };
        const effects = {
          common: { atk: 10, crit_rate: 1 },
          uncommon: { atk: 25, crit_rate: 2 },
          rare: { atk: 50, crit_rate: 3 },
          epic: { atk: 100, crit_rate: 5 },
          legendary: { atk: 200, crit_rate: 8 },
          mythic: { atk: 400, crit_rate: 12 }
        };
        
        this.awakenMaterial = materials[quality] || materials.common;
        this.awakenEffect = effects[quality] || effects.common;
        this.materialCount = 0;
        this.canAwaken = false;
      }
    },
    async doRefine() {
      if (!this.canRefine || !this.selectedEquip) return;
      
      try {
        const playerId = window.gamePlayerId || 1;
        const response = await fetch('/api/equipment/refine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, equipId: this.selectedEquip.id })
        });
        
        const result = await response.json();
        
        if (result.success) {
          alert('✅ ' + result.message);
          await this.loadEquipment();
        } else {
          alert('❌ ' + result.message);
        }
      } catch (e) {
        // 模拟精炼
        this.playerSpiritStones -= this.refineCost;
        this.selectedEquip.refine_level = (this.selectedEquip.refine_level || 0) + 1;
        this.selectedEquip.atk = (this.selectedEquip.atk || 0) + this.refineBonus.atk;
        this.selectedEquip.def = (this.selectedEquip.def || 0) + this.refineBonus.def;
        this.selectedEquip.hp = (this.selectedEquip.hp || 0) + this.refineBonus.hp;
        
        alert('✅ 精炼成功！装备精炼等级+1');
        await this.loadEquipment();
      }
    },
    async doAwaken() {
      if (!this.canAwaken || !this.selectedEquip) return;
      
      try {
        const playerId = window.gamePlayerId || 1;
        const response = await fetch('/api/equipment/awaken', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, equipId: this.selectedEquip.id })
        });
        
        const result = await response.json();
        
        if (result.success) {
          alert('✅ ' + result.message);
          await this.loadEquipment();
        } else {
          alert('❌ ' + result.message);
        }
      } catch (e) {
        alert('❌ 觉醒失败，请确保有觉醒材料');
      }
    }
  },
  watch: {
    async activeTab() {
      if (this.selectedEquip) {
        if (this.activeTab === 'refine') {
          await this.loadRefineInfo(this.selectedEquip);
        } else {
          await this.loadAwakenInfo(this.selectedEquip);
        }
      }
    }
  }
};
</script>

<style>
.equipment-refine-panel {
  background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  color: #e8e8f0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(90deg, rgba(255, 215, 0, 0.1), transparent);
  border-bottom: 1px solid rgba(255, 215, 0, 0.2);
}

.panel-header h2 {
  margin: 0;
  font-size: 18px;
  color: #ffd700;
}

.close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 20px;
  cursor: pointer;
}

.panel-tabs {
  display: flex;
  background: rgba(0, 0, 0, 0.2);
}

.tab-item {
  flex: 1;
  padding: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  border-bottom: 2px solid transparent;
}

.tab-item.active {
  background: rgba(255, 215, 0, 0.1);
  border-bottom-color: #ffd700;
  color: #ffd700;
}

.panel-content {
  padding: 16px;
  max-height: 60vh;
  overflow-y: auto;
}

.equip-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.equip-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid transparent;
}

.equip-card:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 215, 0, 0.3);
}

.equip-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin: 0 auto 8px;
  background: rgba(255, 255, 255, 0.1);
}

.equip-icon.large {
  width: 80px;
  height: 80px;
  font-size: 40px;
}

.equip-icon.common { border: 2px solid #999; }
.equip-icon.uncommon { border: 2px solid #1eff00; }
.equip-icon.rare { border: 2px solid #0070dd; }
.equip-icon.epic { border: 2px solid #a335ee; }
.equip-icon.legendary { border: 2px solid #ff8000; }
.equip-icon.mythic { border: 2px solid #e5cc80; }

.equip-name {
  font-size: 13px;
  color: #fff;
  text-align: center;
}

.equip-rarity {
  font-size: 11px;
  text-align: center;
  margin-bottom: 4px;
}

.equip-rarity.common { color: #999; }
.equip-rarity.uncommon { color: #1eff00; }
.equip-rarity.rare { color: #0070dd; }
.equip-rarity.epic { color: #a335ee; }
.equip-rarity.legendary { color: #ff8000; }
.equip-rarity.mythic { color: #e5cc80; }

.equip-stats {
  font-size: 10px;
  color: #888;
  text-align: center;
  margin-bottom: 4px;
}

.equip-stats span {
  margin: 0 4px;
}

.equip-level {
  font-size: 11px;
  color: #ffd700;
  text-align: center;
}

.equip-awakened {
  font-size: 11px;
  color: #00ff88;
  text-align: center;
}

.back-btn {
  color: #ffd700;
  cursor: pointer;
  margin-bottom: 16px;
  font-size: 14px;
}

.selected-equip {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.equip-detail h3 {
  margin: 0 0 8px;
  color: #fff;
}

.equip-detail .rarity {
  font-size: 12px;
  margin-bottom: 12px;
}

.current-stats {
  font-size: 12px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.stat-row .highlight {
  color: #ffd700;
}

.stat-row .awakened {
  color: #00ff88;
}

.stat-row .not-awakened {
  color: #666;
}

.refine-info, .awaken-info, .awaken-material {
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.refine-info h4, .awaken-info h4, .awaken-material h4 {
  margin: 0 0 8px;
  font-size: 13px;
  color: #ffd700;
}

.bonus-item, .material-item {
  font-size: 12px;
  color: #aaa;
}

.bonus-value, .cost-value {
  color: #00ff88;
}

.cost-value.insufficient {
  color: #ff4444;
}

.refine-cost, .awaken-material {
  margin-bottom: 16px;
}

.cost-item {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  margin-bottom: 8px;
}

.player-stones {
  font-size: 12px;
  color: #888;
  text-align: right;
}

.refine-btn, .awaken-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  border: none;
  border-radius: 8px;
  color: #000;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.refine-btn:disabled, .awaken-btn:disabled {
  background: #444;
  color: #888;
  cursor: not-allowed;
}

.refine-btn:hover:not(:disabled), .awaken-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(255, 215, 0, 0.4);
}

.refine-tips, .awaken-tips {
  font-size: 11px;
  color: #666;
  text-align: center;
  margin-top: 12px;
}

.already-awakened {
  text-align: center;
  padding: 16px;
  color: #00ff88;
  font-size: 14px;
}

.insufficient {
  color: #ff4444;
}

.empty-tip {
  text-align: center;
  padding: 40px;
  color: #666;
  grid-column: span 2;
}
</style>
