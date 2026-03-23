<template>
  <div class="pet-panel">
    <div class="panel-header">
      <h2>🐾 灵兽系统</h2>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>
    
    <div class="panel-content">
      <!-- 灵兽列表 -->
      <div class="pet-list">
        <div 
          v-for="pet in petList" 
          :key="pet.id"
          class="pet-card"
          :class="{ active: selectedPet && selectedPet.id === pet.id, equipped: pet.equipped }"
          @click="selectPet(pet)"
        >
          <div class="pet-avatar" :style="{ background: getPetColor(pet.rarity) }">
            <img v-if="getPetBeastImage(pet.type)" :src="getPetBeastImage(pet.type)" :alt="pet.name || '灵兽'" style="width:40px;height:40px;border-radius:8px;">
            <span v-else>{{ getPetIcon(pet.type) }}</span>
          </div>
          <div class="pet-info">
            <div class="pet-name">{{ pet.name || getDefaultName(pet.type) }}</div>
            <div class="pet-level">等级 {{ pet.level || 1 }}</div>
            <div class="pet-type">{{ getTypeName(pet.type) }}</div>
            <div class="pet-equipped" v-if="pet.equipped">✅ 已参战</div>
          </div>
        </div>
        
        <div v-if="petList.length === 0" class="empty-tip">
          还没有灵兽，去捕捉灵兽吧！
        </div>
      </div>
      
      <!-- 灵兽详情 -->
      <div class="pet-detail" v-if="selectedPet">
        <div class="detail-header">
          <div class="pet-avatar large" :style="{ background: getPetColor(selectedPet.rarity) }">
            <img v-if="getPetBeastImage(selectedPet.type)" :src="getPetBeastImage(selectedPet.type)" :alt="selectedPet.name || '灵兽'" style="width:80px;height:80px;border-radius:8px;">
            <span v-else>{{ getPetIcon(selectedPet.type) }}</span>
          </div>
          <div class="detail-info">
            <h3>{{ selectedPet.name || getDefaultName(selectedPet.type) }}</h3>
            <div class="pet-stats">
              <span>等级: {{ selectedPet.level || 1 }}</span>
              <span>品质: {{ getRarityName(selectedPet.rarity) }}</span>
              <span>类型: {{ getTypeName(selectedPet.type) }}</span>
            </div>
            <div class="pet-attributes" v-if="selectedPet.bonus_atk || selectedPet.bonus_def || selectedPet.bonus_hp || selectedPet.bonus_crit_rate">
              <span v-if="selectedPet.bonus_atk">攻击+{{ selectedPet.bonus_atk }}</span>
              <span v-if="selectedPet.bonus_def">防御+{{ selectedPet.bonus_def }}</span>
              <span v-if="selectedPet.bonus_hp">生命+{{ selectedPet.bonus_hp }}</span>
              <span v-if="selectedPet.bonus_crit_rate">暴击+{{ selectedPet.bonus_crit_rate }}%</span>
            </div>
          </div>
        </div>
        
        <!-- 进化路线 -->
        <div class="evolution-path" v-if="evolutionInfo">
          <h4>进化路线</h4>
          <div class="path-nodes">
            <div 
              v-for="(evo, index) in evolutionInfo.recipe.evolutions" 
              :key="index"
              class="path-node"
              :class="{ current: (selectedPet.level || 1) >= evo.level, unlocked: (selectedPet.level || 1) >= evo.level }"
            >
              <div class="node-icon">{{ getEvolutionIcon(evo.name) }}</div>
              <div class="node-name">{{ evo.name.split('→')[1] || evo.name }}</div>
              <div class="node-level">Lv.{{ evo.level }}</div>
            </div>
          </div>
        </div>
        
        <!-- 参战状态 -->
        <div class="battle-status" v-if="selectedPet.equipped">
          <div class="status-icon">⚔️</div>
          <div class="status-info">
            <span class="status-label">当前参战:</span>
            <span class="status-value">{{ selectedPet.name || getDefaultName(selectedPet.type) }}</span>
          </div>
        </div>
        
        <!-- 操作按钮 -->
        <div class="action-buttons">
          <button 
            class="equip-btn" 
            @click="equipPet"
            :disabled="selectedPet.equipped"
          >
            {{ selectedPet.equipped ? '✅ 已参战' : '⚔️ 参战' }}
          </button>
          <button 
            class="unequip-btn"
            @click="unequipPet"
            :disabled="!selectedPet.equipped"
          >
            ⏸️ 休息
          </button>
          <button 
            class="evolve-btn" 
            @click="openEvolution"
            :disabled="!canEvolve"
          >
            ⬆️ 进化
          </button>
          <button 
            class="equipment-btn" 
            @click="openEquipment"
          >
            📦 装备
          </button>
        </div>
        
        <!-- 进化提示 -->
        <div class="evolve-tip" v-if="!canEvolve && evolutionInfo && evolutionInfo.nextEvo">
          <span v-if="(selectedPet.level || 1) < evolutionInfo.nextEvo.level">
            等级达到 {{ evolutionInfo.nextEvo.level }} 级可进化为 {{ evolutionInfo.nextEvo.name.split('→')[1] }}
          </span>
        </div>
      </div>
      
      <!-- 无选中状态 -->
      <div class="no-selection" v-else>
        <div class="no-selection-icon">🐾</div>
        <p>选择一个灵兽查看详情</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';

export default {
  name: 'PetPanel',
  emits: ['close'],
  setup(props, { emit }) {
    const petList = ref([]);
    const selectedPet = ref(null);
    const evolutionInfo = ref(null);
    const playerId = ref('1');
    
    // 加载灵兽列表
    const loadPetList = async () => {
      try {
        const response = await fetch(`/api/pet/evolution-info?playerId=${playerId.value}`);
        const result = await response.json();
        if (result.success) {
          petList.value = result.data || [];
          // 默认选中第一个
          if (petList.value.length > 0 && !selectedPet.value) {
            selectPet(petList.value[0]);
          }
        }
      } catch (error) {
        console.error('加载灵兽列表失败:', error);
      }
    };
    
    // 选中灵兽
    const selectPet = async (pet) => {
      selectedPet.value = pet;
      // 获取进化信息
      try {
        const response = await fetch(`/api/pet/evolution-info?playerId=${playerId.value}`);
        const result = await response.json();
        if (result.success) {
          const petEvo = (result.data || []).find(p => p.pet.id === pet.id);
          if (petEvo) {
            evolutionInfo.value = petEvo;
          }
        }
      } catch (error) {
        console.error('获取进化信息失败:', error);
      }
    };
    
    // 参战
    const equipPet = async () => {
      if (!selectedPet.value) return;
      
      try {
        const response = await fetch('/api/pet/equip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: playerId.value,
            petId: selectedPet.value.id
          })
        });
        const result = await response.json();
        if (result.success) {
          selectedPet.value.equipped = true;
          // 更新列表
          petList.value.forEach(p => {
            p.equipped = p.id === selectedPet.value.id;
          });
        }
      } catch (error) {
        console.error('参战失败:', error);
      }
    };
    
    // 休息
    const unequipPet = async () => {
      if (!selectedPet.value) return;
      
      try {
        const response = await fetch('/api/pet/unequip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: playerId.value,
            petId: selectedPet.value.id
          })
        });
        const result = await response.json();
        if (result.success) {
          selectedPet.value.equipped = false;
          // 更新列表
          petList.value.forEach(p => {
            if (p.id === selectedPet.value.id) {
              p.equipped = false;
            }
          });
        }
      } catch (error) {
        console.error('休息失败:', error);
      }
    };
    
    // 打开进化面板
    const openEvolution = () => {
      if (selectedPet.value) {
        if (window.UIComponents && window.UIComponents.showPanel) {
          window.UIComponents.showPanel('PetEvolutionPanel', { pet: selectedPet.value });
        }
      }
    };
    
    // 打开装备面板
    const openEquipment = () => {
      if (selectedPet.value) {
        if (window.UIComponents && window.UIComponents.showPanel) {
          window.UIComponents.showPanel('PetEquipmentPanel', { pet: selectedPet.value });
        }
      }
    };
    
    // 能否进化
    const canEvolve = computed(() => {
      return evolutionInfo.value && evolutionInfo.value.canEvolve;
    });
    
    // 获取灵兽颜色
    const getPetColor = (rarity) => {
      const colors = {
        'common': 'linear-gradient(135deg, #8B8B8B, #6B6B6B)',
        'uncommon': 'linear-gradient(135deg, #4CAF50, #2E7D32)',
        'rare': 'linear-gradient(135deg, #2196F3, #1565C0)',
        'epic': 'linear-gradient(135deg, #9C27B0, #7B1FA2)',
        'legendary': 'linear-gradient(135deg, #FF9800, #F57C00)',
        'mythical': 'linear-gradient(135deg, #F44336, #C62828)'
      };
      return colors[rarity] || colors['common'];
    };
    
    // 灵兽立绘图片
    const spiritBeastImg = window.SPIRIT_BEAST_IMAGE || null;
    
    // 获取灵兽图标
    const getPetIcon = (type) => {
      const icons = {
        'spirit_beast': '🦊',
        'winged_beast': '🦅',
        'aquatic_beast': '🐉',
        'default': '🐾'
      };
      return icons[type] || icons['default'];
    };
    
    // 获取灵兽立绘（用于 spirit_beast 类型）
    const getPetBeastImage = (type) => {
      if (type === 'spirit_beast' && spiritBeastImg) {
        return spiritBeastImg;
      }
      return null;
    };
    
    // 获取类型名称
    const getTypeName = (type) => {
      const names = {
        'spirit_beast': '灵兽',
        'winged_beast': '飞禽',
        'aquatic_beast': '水族',
        'default': '灵兽'
      };
      return names[type] || names['default'];
    };
    
    // 获取默认名称
    const getDefaultName = (type) => {
      const names = {
        'spirit_beast': '小灵狐',
        'winged_beast': '幼鹰',
        'aquatic_beast': '锦鲤',
        'default': '灵兽'
      };
      return names[type] || names['default'];
    };
    
    // 获取品质名称
    const getRarityName = (rarity) => {
      const names = {
        'common': '普通',
        'uncommon': '优秀',
        'rare': '稀有',
        'epic': '史诗',
        'legendary': '传说',
        'mythical': '神话'
      };
      return names[rarity] || names['common'];
    };
    
    // 获取进化图标
    const getEvolutionIcon = (name) => {
      if (name.includes('狐') || name.includes('狼') || name.includes('虎')) return '🦊';
      if (name.includes('鹰') || name.includes('鹏') || name.includes('鲲')) return '🦅';
      if (name.includes('鲤') || name.includes('龙')) return '🐉';
      return '⭐';
    };
    
    onMounted(() => {
      loadPetList();
    });
    
    return {
      petList,
      selectedPet,
      evolutionInfo,
      canEvolve,
      selectPet,
      equipPet,
      unequipPet,
      openEvolution,
      openEquipment,
      getPetColor,
      getPetIcon,
      getTypeName,
      getDefaultName,
      getRarityName,
      getEvolutionIcon
    };
  }
};
</script>

<style scoped>
.pet-panel {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.panel-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  border-bottom: 2px solid #4a4a6a;
}

.panel-header h2 {
  color: #ffd700;
  font-size: 24px;
  margin: 0;
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
}

.close-btn {
  background: none;
  border: none;
  color: #aaa;
  font-size: 28px;
  cursor: pointer;
  padding: 5px 10px;
}

.close-btn:hover {
  color: #fff;
}

.panel-content {
  width: 90%;
  max-width: 1200px;
  height: 80%;
  display: flex;
  background: linear-gradient(180deg, #1e1e3f, #2a2a5a);
  border-radius: 15px;
  overflow: hidden;
  margin-top: 60px;
}

/* 灵兽列表 */
.pet-list {
  width: 35%;
  padding: 20px;
  overflow-y: auto;
  border-right: 2px solid #4a4a6a;
}

.pet-card {
  display: flex;
  align-items: center;
  padding: 15px;
  margin-bottom: 15px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.pet-card:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateX(5px);
}

.pet-card.active {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.1);
}

.pet-card.equipped {
  border-color: #4CAF50;
}

.pet-avatar {
  width: 60px;
  height: 60px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  margin-right: 15px;
  flex-shrink: 0;
}

.pet-avatar.large {
  width: 100px;
  height: 100px;
  font-size: 50px;
}

.pet-info {
  flex: 1;
}

.pet-name {
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 5px;
}

.pet-level, .pet-type {
  color: #aaa;
  font-size: 14px;
}

.pet-equipped {
  color: #4CAF50;
  font-size: 12px;
  margin-top: 5px;
}

.empty-tip {
  color: #888;
  text-align: center;
  padding: 40px;
  font-size: 16px;
}

/* 灵兽详情 */
.pet-detail {
  flex: 1;
  padding: 30px;
  overflow-y: auto;
}

.detail-header {
  display: flex;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #4a4a6a;
}

.detail-info {
  margin-left: 20px;
}

.detail-info h3 {
  color: #ffd700;
  font-size: 28px;
  margin: 0 0 10px 0;
}

.pet-stats {
  color: #aaa;
  font-size: 14px;
  margin-bottom: 10px;
}

.pet-stats span {
  margin-right: 20px;
}

.pet-attributes {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.pet-attributes span {
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
  padding: 5px 12px;
  border-radius: 15px;
  font-size: 14px;
}

/* 进化路线 */
.evolution-path {
  margin: 20px 0;
}

.evolution-path h4 {
  color: #aaa;
  font-size: 16px;
  margin-bottom: 15px;
}

.path-nodes {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.path-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  min-width: 80px;
}

.path-node.current {
  background: rgba(255, 215, 0, 0.2);
  border: 2px solid #ffd700;
}

.path-node.unlocked .node-icon {
  opacity: 1;
}

.node-icon {
  font-size: 32px;
  opacity: 0.3;
  margin-bottom: 5px;
}

.node-name {
  color: #fff;
  font-size: 14px;
  text-align: center;
}

.node-level {
  color: #888;
  font-size: 12px;
}

/* 参战状态 */
.battle-status {
  display: flex;
  align-items: center;
  padding: 15px;
  background: rgba(76, 175, 80, 0.2);
  border-radius: 10px;
  margin: 20px 0;
}

.status-icon {
  font-size: 32px;
  margin-right: 15px;
}

.status-info {
  color: #4CAF50;
}

.status-label {
  margin-right: 10px;
}

.status-value {
  font-weight: bold;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  gap: 15px;
  margin-top: 30px;
  flex-wrap: wrap;
}

.action-buttons button {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.equip-btn {
  background: linear-gradient(135deg, #4CAF50, #2E7D32);
  color: white;
}

.equip-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
}

.unequip-btn {
  background: linear-gradient(135deg, #FF9800, #F57C00);
  color: white;
}

.unequip-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(255, 152, 0, 0.4);
}

.evolve-btn {
  background: linear-gradient(135deg, #9C27B0, #7B1FA2);
  color: white;
}

.evolve-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(156, 39, 176, 0.4);
}

.equipment-btn {
  background: linear-gradient(135deg, #2196F3, #1565C0);
  color: white;
}

.equipment-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(33, 150, 243, 0.4);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 进化提示 */
.evolve-tip {
  margin-top: 20px;
  padding: 15px;
  background: rgba(255, 152, 0, 0.1);
  border-radius: 10px;
  color: #FF9800;
  font-size: 14px;
}

/* 无选中状态 */
.no-selection {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #888;
}

.no-selection-icon {
  font-size: 80px;
  margin-bottom: 20px;
  opacity: 0.3;
}

.no-selection p {
  font-size: 18px;
}
</style>
