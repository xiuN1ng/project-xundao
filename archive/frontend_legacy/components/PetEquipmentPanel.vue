<template>
  <div class="pet-equipment-panel">
    <div class="panel-header">
      <h2>🎒 宠物装备</h2>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>
    
    <div class="panel-content">
      <!-- 宠物选择 -->
      <div class="pet-selector">
        <h4>选择宠物</h4>
        <div class="pet-tabs">
          <div 
            v-for="pet in petList" 
            :key="pet.id"
            class="pet-tab"
            :class="{ active: selectedPet && selectedPet.id === pet.id }"
            @click="selectPet(pet)"
          >
            <span class="pet-icon">{{ getPetIcon(pet.type) }}</span>
            <span class="pet-name">{{ pet.name || getDefaultName(pet.type) }}</span>
          </div>
        </div>
      </div>
      
      <!-- 装备槽位 -->
      <div class="equipment-slots" v-if="selectedPet">
        <h4>装备槽位</h4>
        <div class="slots-grid">
          <div 
            v-for="slot in equipmentSlots" 
            :key="slot.type"
            class="slot"
            :class="{ filled: slot.item, empty: !slot.item }"
            @click="openEquipmentSelector(slot)"
          >
            <div class="slot-icon">{{ slot.item ? slot.item.icon : slot.icon }}</div>
            <div class="slot-name">{{ slot.item ? slot.item.name : slot.name }}</div>
            <div class="slot-bonus" v-if="slot.item">
              <span v-if="slot.item.bonus_atk">攻+{{ slot.item.bonus_atk }}</span>
              <span v-if="slot.item.bonus_def">防+{{ slot.item.bonus_def }}</span>
              <span v-if="slot.item.bonus_hp">血+{{ slot.item.bonus_hp }}</span>
            </div>
            <button 
              v-if="slot.item" 
              class="unequip-btn"
              @click.stop="unequipSlot(slot)"
            >
              卸下
            </button>
          </div>
        </div>
      </div>
      
      <!-- 装备属性 -->
      <div class="equipment-stats" v-if="selectedPet">
        <h4>装备加成</h4>
        <div class="stats-list">
          <div class="stat-item">
            <span class="stat-label">攻击加成</span>
            <span class="stat-value">+{{ totalBonus.atk }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">防御加成</span>
            <span class="stat-value">+{{ totalBonus.def }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">生命加成</span>
            <span class="stat-value">+{{ totalBonus.hp }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">速度加成</span>
            <span class="stat-value">+{{ totalBonus.speed }}</span>
          </div>
        </div>
      </div>
      
      <!-- 装备选择弹窗 -->
      <div class="equipment-selector" v-if="showSelector" @click.self="closeSelector">
        <div class="selector-content">
          <div class="selector-header">
            <h3>选择{{ currentSlot?.name }}</h3>
            <button class="close-btn" @click="closeSelector">✕</button>
          </div>
          <div class="selector-items">
            <div 
              v-for="item in availableItems" 
              :key="item.id"
              class="selector-item"
              :class="{ selected: selectedItem && selectedItem.id === item.id }"
              @click="selectItem(item)"
            >
              <div class="item-icon">{{ item.icon }}</div>
              <div class="item-info">
                <div class="item-name">{{ item.name }}</div>
                <div class="item-bonus">
                  <span v-if="item.bonus_atk">攻+{{ item.bonus_atk }}</span>
                  <span v-if="item.bonus_def">防+{{ item.bonus_def }}</span>
                  <span v-if="item.bonus_hp">血+{{ item.bonus_hp }}</span>
                </div>
              </div>
            </div>
            <div v-if="availableItems.length === 0" class="empty-tip">
              没有可用的装备
            </div>
          </div>
          <div class="selector-actions">
            <button class="cancel-btn" @click="closeSelector">取消</button>
            <button class="confirm-btn" @click="confirmEquip" :disabled="!selectedItem">装备</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PetEquipmentPanel',
  data() {
    return {
      petList: [],
      selectedPet: null,
      equipmentSlots: [],
      showSelector: false,
      currentSlot: null,
      selectedItem: null,
      availableItems: [],
      // 模拟装备数据
      equipmentDatabase: [
        { id: 'equip_1', type: 'weapon', name: '兽牙剑', icon: '🗡️', bonus_atk: 15, bonus_def: 0, bonus_hp: 0, rarity: 'rare' },
        { id: 'equip_2', type: 'weapon', name: '狼牙棒', icon: '🔨', bonus_atk: 25, bonus_def: 5, bonus_hp: 0, rarity: 'epic' },
        { id: 'equip_3', type: 'armor', name: '鳞甲', icon: '🛡️', bonus_atk: 0, bonus_def: 20, bonus_hp: 50, rarity: 'rare' },
        { id: 'equip_4', type: 'armor', name: '神甲', icon: '🦺', bonus_atk: 5, bonus_def: 35, bonus_hp: 100, rarity: 'epic' },
        { id: 'equip_5', type: 'helmet', name: '兽皮帽', icon: '🎩', bonus_atk: 5, bonus_def: 10, bonus_hp: 30, rarity: 'common' },
        { id: 'equip_6', type: 'helmet', name: '龙头盔', icon: '🐲', bonus_atk: 10, bonus_def: 20, bonus_hp: 50, rarity: 'rare' },
        { id: 'equip_7', type: 'boots', name: '皮靴', icon: '👢', bonus_atk: 0, bonus_def: 5, bonus_hp: 20, speed: 10, rarity: 'common' },
        { id: 'equip_8', type: 'boots', name: '风火轮', icon: '🔥', bonus_atk: 10, bonus_def: 10, bonus_hp: 30, speed: 25, rarity: 'epic' },
        { id: 'equip_9', type: 'accessory', name: '灵玉', icon: '💎', bonus_atk: 8, bonus_def: 8, bonus_hp: 40, rarity: 'rare' },
        { id: 'equip_10', type: 'accessory', name: '仙珠', icon: '🔮', bonus_atk: 15, bonus_def: 15, bonus_hp: 80, rarity: 'epic' }
      ]
    };
  },
  computed: {
    totalBonus() {
      let atk = 0, def = 0, hp = 0, speed = 0;
      this.equipmentSlots.forEach(slot => {
        if (slot.item) {
          atk += slot.item.bonus_atk || 0;
          def += slot.item.bonus_def || 0;
          hp += slot.item.bonus_hp || 0;
          speed += slot.item.speed || 0;
        }
      });
      return { atk, def, hp, speed };
    }
  },
  mounted() {
    this.loadPets();
  },
  methods: {
    loadPets() {
      const player = window.gameData?.player || {};
      this.petList = player.pets || [
        { id: 'pet_1', type: 'wolf', name: '灰风', level: 10 },
        { id: 'pet_2', type: 'bear', name: '熊大', level: 5 }
      ];
      if (this.petList.length > 0) {
        this.selectPet(this.petList[0]);
      }
    },
    selectPet(pet) {
      this.selectedPet = pet;
      // 初始化装备槽位
      this.equipmentSlots = [
        { type: 'weapon', name: '武器', icon: '⚔️', item: pet.equipment?.weapon || null },
        { type: 'armor', name: '护甲', icon: '🛡️', item: pet.equipment?.armor || null },
        { type: 'helmet', name: '头盔', icon: '🎩', item: pet.equipment?.helmet || null },
        { type: 'boots', name: '鞋子', icon: '👢', item: pet.equipment?.boots || null },
        { type: 'accessory', name: '饰品', icon: '💍', item: pet.equipment?.accessory || null }
      ];
    },
    openEquipmentSelector(slot) {
      this.currentSlot = slot;
      // 获取该类型可用装备
      this.availableItems = this.equipmentDatabase.filter(item => item.type === slot.type);
      this.selectedItem = null;
      this.showSelector = true;
    },
    closeSelector() {
      this.showSelector = false;
      this.currentSlot = null;
      this.selectedItem = null;
    },
    selectItem(item) {
      this.selectedItem = item;
    },
    confirmEquip() {
      if (!this.selectedItem || !this.currentSlot) return;
      
      // 更新装备槽位
      const slotIndex = this.equipmentSlots.findIndex(s => s.type === this.currentSlot.type);
      if (slotIndex !== -1) {
        this.equipmentSlots[slotIndex].item = { ...this.selectedItem };
      }
      
      // 更新宠物装备数据
      if (!this.selectedPet.equipment) {
        this.selectedPet.equipment = {};
      }
      this.selectedPet.equipment[this.currentSlot.type] = { ...this.selectedItem };
      
      this.closeSelector();
      this.showMessage('装备成功！');
    },
    unequipSlot(slot) {
      slot.item = null;
      if (this.selectedPet.equipment) {
        this.selectedPet.equipment[slot.type] = null;
      }
      this.showMessage('已卸下装备');
    },
    getPetIcon(type) {
      const icons = {
        wolf: '🐺',
        bear: '🐻',
        tiger: '🐯',
        lion: '🦁',
        fox: '🦊',
        dragon: '🐲'
      };
      return icons[type] || '🐾';
    },
    getDefaultName(type) {
      const names = {
        wolf: '灰狼',
        bear: '棕熊',
        tiger: '猛虎',
        lion: '雄狮',
        fox: '灵狐',
        dragon: '神龙'
      };
      return names[type] || '灵兽';
    },
    showMessage(msg) {
      if (window.showMessage) {
        window.showMessage(msg);
      } else {
        alert(msg);
      }
    }
  }
};
</script>

<style scoped>
.pet-equipment-panel {
  width: 700px;
  max-height: 600px;
  background: linear-gradient(145deg, #1a1a2e, #16213e);
  border-radius: 16px;
  border: 2px solid #4a5568;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(90deg, #2d3748, #4a5568);
  border-bottom: 2px solid #4a5568;
}

.panel-header h2 {
  margin: 0;
  color: #f6e05e;
  font-size: 1.4em;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.close-btn {
  background: #e53e3e;
  color: white;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s;
}

.close-btn:hover {
  background: #c53030;
}

.panel-content {
  padding: 16px;
  max-height: 520px;
  overflow-y: auto;
}

.pet-selector {
  margin-bottom: 20px;
}

.pet-selector h4, .equipment-slots h4, .equipment-stats h4 {
  color: #f7fafc;
  margin: 0 0 12px 0;
  font-size: 1.1em;
}

.pet-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.pet-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.pet-tab:hover {
  background: rgba(255, 255, 255, 0.1);
}

.pet-tab.active {
  border-color: #f6e05e;
  background: rgba(246, 224, 94, 0.1);
}

.pet-icon {
  font-size: 20px;
}

.pet-name {
  color: #f7fafc;
}

.slots-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.slot {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px dashed #4a5568;
  position: relative;
}

.slot:hover {
  border-color: #f6e05e;
}

.slot.filled {
  border-style: solid;
  border-color: #9f7aea;
  background: rgba(159, 122, 234, 0.1);
}

.slot-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.slot-name {
  color: #a0aec0;
  font-size: 0.9em;
  margin-bottom: 4px;
}

.slot-bonus {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px;
}

.slot-bonus span {
  font-size: 0.75em;
  padding: 2px 6px;
  background: rgba(72, 187, 120, 0.2);
  color: #48bb78;
  border-radius: 4px;
}

.unequip-btn {
  margin-top: 8px;
  padding: 4px 12px;
  background: #e53e3e;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8em;
}

.unequip-btn:hover {
  background: #c53030;
}

.equipment-stats {
  margin-top: 20px;
}

.stats-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.stat-label {
  color: #a0aec0;
}

.stat-value {
  color: #48bb78;
  font-weight: bold;
}

/* 装备选择弹窗 */
.equipment-selector {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.selector-content {
  background: linear-gradient(145deg, #1a1a2e, #2d3748);
  border-radius: 16px;
  width: 500px;
  max-height: 80%;
  overflow: hidden;
  border: 2px solid #4a5568;
}

.selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: rgba(0, 0, 0, 0.2);
}

.selector-header h3 {
  margin: 0;
  color: #f7fafc;
}

.selector-items {
  max-height: 400px;
  overflow-y: auto;
  padding: 16px;
}

.selector-item {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.selector-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.selector-item.selected {
  border-color: #f6e05e;
  background: rgba(246, 224, 94, 0.1);
}

.item-icon {
  font-size: 28px;
  margin-right: 12px;
}

.item-info {
  flex: 1;
}

.item-name {
  color: #f7fafc;
  font-weight: bold;
}

.item-bonus span {
  font-size: 0.85em;
  color: #48bb78;
  margin-right: 8px;
}

.selector-actions {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
}

.cancel-btn, .confirm-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 1em;
  cursor: pointer;
}

.cancel-btn {
  background: #4a5568;
  color: #f7fafc;
}

.confirm-btn {
  background: linear-gradient(135deg, #48bb78, #38a169);
  color: white;
}

.confirm-btn:disabled {
  background: #4a5568;
  cursor: not-allowed;
}

.empty-tip {
  color: #718096;
  text-align: center;
  padding: 40px;
}
</style>
