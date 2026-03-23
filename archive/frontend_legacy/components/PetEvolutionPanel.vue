<template>
  <div class="pet-evolution-panel">
    <div class="panel-header">
      <h2>🐾 宠物进化</h2>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>
    
    <div class="panel-content">
      <!-- 宠物列表 -->
      <div class="pet-list">
        <div 
          v-for="pet in petList" 
          :key="pet.id"
          class="pet-card"
          :class="{ active: selectedPet && selectedPet.id === pet.id }"
          @click="selectPet(pet)"
        >
          <div class="pet-avatar" :style="{ background: getPetColor(pet.type) }">
            <img v-if="getSpiritBeastImage(pet.type)" :src="getSpiritBeastImage(pet.type)" :alt="pet.name || '灵兽'" style="width:40px;height:40px;border-radius:8px;">
            <span v-else>{{ getPetIcon(pet.type) }}</span>
          </div>
          <div class="pet-info">
            <div class="pet-name">{{ pet.name || getDefaultName(pet.type) }}</div>
            <div class="pet-level">等级 {{ pet.level || 1 }}</div>
            <div class="pet-type">{{ getPetTypeName(pet.type) }}</div>
            <div class="pet-evolution" v-if="pet.evolution">
              ✨ {{ pet.evolution }}
            </div>
          </div>
        </div>
        
        <div v-if="petList.length === 0" class="empty-tip">
          还没有宠物，去捕捉灵兽吧！
        </div>
      </div>
      
      <!-- 进化详情 -->
      <div class="evolution-detail" v-if="selectedPet">
        <div class="detail-header">
          <div class="pet-avatar large" :style="{ background: getPetColor(selectedPet.type) }">
            <img v-if="getSpiritBeastImage(selectedPet.type)" :src="getSpiritBeastImage(selectedPet.type)" :alt="selectedPet.name || '灵兽'" style="width:80px;height:80px;border-radius:8px;">
            <span v-else>{{ getPetIcon(selectedPet.type) }}</span>
          </div>
          <div class="detail-info">
            <h3>{{ selectedPet.name || getDefaultName(selectedPet.type) }}</h3>
            <div class="pet-stats">
              <span>等级: {{ selectedPet.level || 1 }}</span>
              <span>类型: {{ getPetTypeName(selectedPet.type) }}</span>
            </div>
            <div class="pet-attributes" v-if="selectedPet.bonus_atk || selectedPet.bonus_def || selectedPet.bonus_hp">
              <span v-if="selectedPet.bonus_atk">攻击+{{ selectedPet.bonus_atk }}</span>
              <span v-if="selectedPet.bonus_def">防御+{{ selectedPet.bonus_def }}</span>
              <span v-if="selectedPet.bonus_hp">生命+{{ selectedPet.bonus_hp }}</span>
            </div>
          </div>
        </div>
        
        <!-- 进化路线 -->
        <div class="evolution-path">
          <h4>🗺️ 进化路线</h4>
          <div class="path-steps">
            <div 
              v-for="(step, idx) in evolutionPath" 
              :key="idx"
              class="path-step"
              :class="{ 
                completed: selectedPet.level >= step.level,
                current: selectedPet.level >= (prevLevel(step.level)) && selectedPet.level < step.level,
                locked: selectedPet.level < (prevLevel(step.level))
              }"
            >
              <div class="step-icon">
                {{ idx === 0 ? '🌱' : (selectedPet.level >= step.level ? '✅' : '🔒') }}
              </div>
              <div class="step-info">
                <div class="step-name">{{ step.name }}</div>
                <div class="step-level">等级 {{ step.level }}</div>
                <div class="step-bonus" v-if="selectedPet.level >= step.level">
                  +{{ step.bonus.atk || 0 }}攻击 +{{ step.bonus.def || 0 }}防御
                </div>
              </div>
              <div class="step-arrow" v-if="idx < evolutionPath.length - 1">→</div>
            </div>
          </div>
        </div>
        
        <!-- 当前可进化 -->
        <div class="can-evolve" v-if="nextEvolution">
          <div class="evolve-info">
            <h4>✨ 可进化</h4>
            <div class="evolve-target">
              <span class="current-name">{{ selectedPet.name || getDefaultName(selectedPet.type) }}</span>
              <span class="arrow">→</span>
              <span class="target-name">{{ nextEvolution.name.split('→')[1] }}</span>
            </div>
            <div class="evolve-bonus">
              进化奖励：
              <span v-if="nextEvolution.bonus.atk">攻击+{{ nextEvolution.bonus.atk }} </span>
              <span v-if="nextEvolution.bonus.def">防御+{{ nextEvolution.bonus.def }} </span>
              <span v-if="nextEvolution.bonus.hp">生命+{{ nextEvolution.bonus.hp }} </span>
              <span v-if="nextEvolution.bonus.crit_rate">暴击率+{{ nextEvolution.bonus.crit_rate }}%</span>
            </div>
          </div>
          <button class="evolve-btn" @click="doEvolve">
            🐾 立即进化
          </button>
        </div>
        
        <!-- 不可进化提示 -->
        <div class="cannot-evolve" v-else-if="!nextEvolution && selectedPet.level < 80">
          <div class="level-tip">
            <span v-if="selectedPet.level < 10">等级达到10级可解锁第一次进化</span>
            <span v-else-if="selectedPet.level < 30">等级达到30级可解锁下一次进化</span>
            <span v-else-if="selectedPet.level < 50">等级达到50级可解锁下一次进化</span>
            <span v-else-if="selectedPet.level < 80">等级达到80级可解锁下一次进化</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: getProgressWidth() + '%' }"></div>
          </div>
          <div class="progress-text">
            距离下一进化还需 {{ nextLevelRequired - (selectedPet.level || 1) }} 级
          </div>
        </div>
        
        <div class="max-evolution" v-else-if="!nextEvolution">
          🌟 宠物已达到最高进化形态！
        </div>
        
        <div class="evolution-tips">
          💡 宠物等级越高，进化后获得属性越多。灵兽会跟随主人修炼并提供属性加成！
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PetEvolutionPanel',
  emits: ['close'],
  data() {
    return {
      petList: [],
      selectedPet: null,
      evolutionPath: [],
      nextEvolution: null,
      nextLevelRequired: 10
    };
  },
  async mounted() {
    await this.loadPets();
  },
  methods: {
    async loadPets() {
      try {
        const playerId = window.gamePlayerId || 1;
        const playerData = JSON.parse(localStorage.getItem('playerData') || '{}');
        
        // 模拟宠物数据
        if (!playerData.beasts || playerData.beasts.length === 0) {
          // 创建示例宠物
          this.petList = [
            { id: 'beast_1', name: '小灵', type: 'spirit_beast', level: 15, bonus_atk: 0, bonus_def: 0, bonus_hp: 0 },
            { id: 'beast_2', name: '小青', type: 'winged_beast', level: 8, bonus_atk: 0, bonus_def: 0, bonus_hp: 0 },
            { id: 'beast_3', name: '小红', type: 'aquatic_beast', level: 35, bonus_atk: 0, bonus_def: 0, bonus_hp: 0, evolution: '灵狐' }
          ];
        } else {
          this.petList = playerData.beasts;
        }
        
        if (this.petList.length > 0) {
          this.selectPet(this.petList[0]);
        }
      } catch (e) {
        console.error('加载宠物失败:', e);
      }
    },
    getPetIcon(type) {
      const icons = {
        'spirit_beast': '🦊',
        'winged_beast': '🦅',
        'aquatic_beast': '🐉'
      };
      return icons[type] || '🐾';
    },
    getSpiritBeastImage(type) {
      if (type === 'spirit_beast' && window.SPIRIT_BEAST_IMAGE) {
        return window.SPIRIT_BEAST_IMAGE;
      }
      return null;
    },
    getPetColor(type) {
      const colors = {
        'spirit_beast': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'winged_beast': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'aquatic_beast': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
      };
      return colors[type] || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    },
    getPetTypeName(type) {
      const names = {
        'spirit_beast': '灵兽',
        'winged_beast': '飞禽',
        'aquatic_beast': '水族'
      };
      return names[type] || '灵兽';
    },
    getDefaultName(type) {
      const names = {
        'spirit_beast': '小灵',
        'winged_beast': '小青',
        'aquatic_beast': '小红'
      };
      return names[type] || '灵兽';
    },
    selectPet(pet) {
      this.selectedPet = pet;
      this.loadEvolutionPath(pet);
    },
    loadEvolutionPath(pet) {
      const recipes = {
        'spirit_beast': [
          { level: 1, name: '灵兽', bonus: { atk: 0, def: 0, hp: 0 } },
          { level: 10, name: '灵兽→灵狐', bonus: { atk: 20, def: 10 } },
          { level: 30, name: '灵狐→灵狼', bonus: { atk: 50, def: 25 } },
          { level: 50, name: '灵狼→灵虎', bonus: { atk: 100, def: 50 } },
          { level: 80, name: '灵虎→圣兽', bonus: { atk: 200, def: 100 } }
        ],
        'winged_beast': [
          { level: 1, name: '飞禽', bonus: { atk: 0, def: 0, hp: 0 } },
          { level: 10, name: '飞禽→青鹰', bonus: { atk: 25, crit_rate: 2 } },
          { level: 30, name: '青鹰→金鹏', bonus: { atk: 60, crit_rate: 5 } },
          { level: 50, name: '金鹏→鲲鹏', bonus: { atk: 120, crit_rate: 8 } },
          { level: 80, name: '鲲鹏→神兽', bonus: { atk: 250, crit_rate: 15 } }
        ],
        'aquatic_beast': [
          { level: 1, name: '水族', bonus: { atk: 0, def: 0, hp: 0 } },
          { level: 10, name: '水族→锦鲤', bonus: { hp: 100, def: 10 } },
          { level: 30, name: '锦鲤→青龙', bonus: { hp: 250, def: 25 } },
          { level: 50, name: '青龙→应龙', bonus: { hp: 500, def: 50 } },
          { level: 80, name: '应龙→祖龙', bonus: { hp: 1000, def: 100 } }
        ]
      };
      
      this.evolutionPath = recipes[pet.type] || recipes['spirit_beast'];
      
      // 找到下一个可进化阶段
      const currentLevel = pet.level || 1;
      this.nextEvolution = this.evolutionPath.find(e => currentLevel < e.level);
      
      // 计算下一级所需等级
      if (this.nextEvolution) {
        this.nextLevelRequired = this.nextEvolution.level;
      }
    },
    prevLevel(level) {
      const idx = this.evolutionPath.findIndex(e => e.level === level);
      return idx > 0 ? this.evolutionPath[idx - 1].level : 1;
    },
    getProgressWidth() {
      if (!this.selectedPet || !this.nextEvolution) return 100;
      const currentLevel = this.selectedPet.level || 1;
      const prev = this.prevLevel(this.nextEvolution.level);
      const progress = ((currentLevel - prev) / (this.nextEvolution.level - prev)) * 100;
      return Math.min(100, Math.max(0, progress));
    },
    async doEvolve() {
      if (!this.nextEvolution || !this.selectedPet) return;
      
      const confirmMsg = `确定要将 ${this.selectedPet.name || getDefaultName(this.selectedPet.type)} 进化为 ${this.nextEvolution.name.split('→')[1]} 吗？`;
      
      if (confirm(confirmMsg)) {
        try {
          const playerId = window.gamePlayerId || 1;
          const response = await fetch('/api/pet/evolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId, petId: this.selectedPet.id })
          });
          
          const result = await response.json();
          
          if (result.success) {
            alert('✅ ' + result.message);
            await this.loadPets();
          } else {
            alert('❌ ' + result.message);
          }
        } catch (e) {
          // 模拟进化
          this.selectedPet.evolution = this.nextEvolution.name.split('→')[1];
          this.selectedPet.bonus_atk = (this.selectedPet.bonus_atk || 0) + (this.nextEvolution.bonus.atk || 0);
          this.selectedPet.bonus_def = (this.selectedPet.bonus_def || 0) + (this.nextEvolution.bonus.def || 0);
          this.selectedPet.bonus_hp = (this.selectedPet.bonus_hp || 0) + (this.nextEvolution.bonus.hp || 0);
          
          alert('✅ 进化成功！' + this.selectedPet.name + '进化为' + this.selectedPet.evolution);
          await this.loadPets();
        }
      }
    }
  }
};
</script>

<style>
.pet-evolution-panel {
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
  background: linear-gradient(90deg, rgba(0, 255, 136, 0.1), transparent);
  border-bottom: 1px solid rgba(0, 255, 136, 0.2);
}

.panel-header h2 {
  margin: 0;
  font-size: 18px;
  color: #00ff88;
}

.close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 20px;
  cursor: pointer;
}

.panel-content {
  padding: 16px;
  max-height: 60vh;
  overflow-y: auto;
}

.pet-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}

.pet-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid transparent;
}

.pet-card:hover {
  background: rgba(255, 255, 255, 0.1);
}

.pet-card.active {
  border-color: #00ff88;
  background: rgba(0, 255, 136, 0.1);
}

.pet-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin: 0 auto 8px;
}

.pet-avatar.large {
  width: 80px;
  height: 80px;
  font-size: 40px;
}

.pet-name {
  font-size: 12px;
  color: #fff;
  margin-bottom: 2px;
}

.pet-level {
  font-size: 11px;
  color: #ffd700;
  margin-bottom: 2px;
}

.pet-type {
  font-size: 10px;
  color: #888;
}

.pet-evolution {
  font-size: 10px;
  color: #00ff88;
  margin-top: 4px;
}

.evolution-detail {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
}

.detail-header {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.detail-info h3 {
  margin: 0 0 8px;
  color: #fff;
}

.pet-stats {
  font-size: 12px;
  color: #888;
  margin-bottom: 8px;
}

.pet-stats span {
  margin-right: 12px;
}

.pet-attributes {
  font-size: 11px;
  color: #00ff88;
}

.pet-attributes span {
  margin-right: 8px;
}

.evolution-path {
  margin-bottom: 20px;
}

.evolution-path h4 {
  margin: 0 0 12px;
  font-size: 13px;
  color: #ffd700;
}

.path-steps {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.path-step {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  font-size: 11px;
}

.path-step.completed {
  background: rgba(0, 255, 136, 0.2);
  border: 1px solid rgba(0, 255, 136, 0.3);
}

.path-step.current {
  background: rgba(255, 215, 0, 0.2);
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.path-step.locked {
  opacity: 0.5;
}

.step-icon {
  font-size: 16px;
}

.step-info {
  flex: 1;
}

.step-name {
  color: #fff;
}

.step-level {
  color: #888;
  font-size: 10px;
}

.step-bonus {
  color: #00ff88;
  font-size: 10px;
}

.step-arrow {
  color: #666;
  font-size: 14px;
}

.can-evolve {
  background: rgba(0, 255, 136, 0.1);
  border: 1px solid rgba(0, 255, 136, 0.3);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.evolve-info h4 {
  margin: 0 0 12px;
  color: #00ff88;
}

.evolve-target {
  font-size: 14px;
  margin-bottom: 8px;
}

.current-name {
  color: #fff;
}

.arrow {
  margin: 0 8px;
  color: #888;
}

.target-name {
  color: #ffd700;
  font-weight: bold;
}

.evolve-bonus {
  font-size: 12px;
  color: #aaa;
}

.evolve-btn {
  width: 100%;
  padding: 12px;
  margin-top: 12px;
  background: linear-gradient(135deg, #00ff88, #00cc6a);
  border: none;
  border-radius: 8px;
  color: #000;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.evolve-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 255, 136, 0.4);
}

.cannot-evolve {
  text-align: center;
  padding: 16px;
}

.level-tip {
  color: #888;
  font-size: 12px;
  margin-bottom: 12px;
}

.progress-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ffd700, #ff8c00);
  border-radius: 4px;
  transition: width 0.3s;
}

.progress-text {
  font-size: 11px;
  color: #666;
}

.max-evolution {
  text-align: center;
  padding: 20px;
  color: #ffd700;
  font-size: 14px;
}

.evolution-tips {
  font-size: 11px;
  color: #666;
  text-align: center;
  margin-top: 16px;
}

.empty-tip {
  text-align: center;
  padding: 40px;
  color: #666;
  grid-column: span 3;
}
</style>
