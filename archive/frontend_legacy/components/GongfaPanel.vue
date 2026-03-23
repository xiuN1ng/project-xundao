<template>
  <div class="gongfa-panel" :class="{ active: isVisible }">
    <!-- 功法粒子特效 -->
    <div class="gongfa-particles">
      <span v-for="n in 15" :key="n" class="particle" :style="{ '--i': n, '--delay': n * 0.15 + 's' }">✦</span>
    </div>
    
    <div class="panel-header">
      <h2>📜 功法系统</h2>
      <button class="close-btn" @click="closePanel">×</button>
    </div>
    
    <div class="panel-content">
      <!-- 功法槽位 -->
      <div class="gongfa-slots">
        <h3>🎯 已装备功法</h3>
        <div class="slots-grid">
          <div
            v-for="slot in gongfaSlots"
            :key="slot.type"
            class="slot-item"
            :class="{ filled: slot.gongfa }"
            @click="selectSlot(slot)"
          >
            <div class="slot-icon">
              <img v-if="slot.gongfa && slot.gongfa.skillIconKey && skillIcons[slot.gongfa.skillIconKey]" :src="skillIcons[slot.gongfa.skillIconKey]" :alt="slot.gongfa.name" style="width:28px;height:28px">
              <span v-else-if="slot.gongfa">{{ slot.gongfa.icon }}</span>
              <img v-else-if="slot.skillIconKey && skillIcons[slot.skillIconKey]" :src="skillIcons[slot.skillIconKey]" :alt="slot.label" style="width:28px;height:28px;opacity:0.5">
              <span v-else>{{ slot.icon }}</span>
            </div>
            <div class="slot-info">
              <span class="slot-type">{{ slot.label }}</span>
              <span v-if="slot.gongfa" class="slot-name">{{ slot.gongfa.name }}</span>
              <span v-else class="slot-empty">未装备</span>
            </div>
            <div v-if="slot.gongfa" class="slot-level">Lv.{{ slot.gongfa.level }}</div>
          </div>
        </div>
      </div>
      
      <!-- 功法属性摘要 -->
      <div class="gongfa-stats">
        <h3>📊 功法加成</h3>
        <div class="stats-grid">
          <div v-for="stat in totalStats" :key="stat.key" class="stat-item">
            <span class="stat-icon">{{ stat.icon }}</span>
            <span class="stat-label">{{ stat.label }}</span>
            <span class="stat-value" :class="stat.type">+{{ stat.value }}%</span>
          </div>
        </div>
      </div>
      
      <!-- 功法分类 -->
      <div class="gongfa-categories">
        <div class="category-tabs">
          <button 
            v-for="cat in categories" 
            :key="cat.id"
            class="category-btn"
            :class="{ active: activeCategory === cat.id }"
            @click="activeCategory = cat.id"
          >
            <span>{{ cat.icon }}</span>
            <span>{{ cat.name }}</span>
            <span class="cat-count">{{ getCategoryCount(cat.id) }}</span>
          </button>
        </div>
      </div>
      
      <!-- 功法列表 -->
      <div class="gongfa-list">
        <div 
          v-for="gongfa in filteredGongfaList" 
          :key="gongfa.id"
          class="gongfa-card"
          :class="{ learned: gongfa.learned, locked: !gongfa.unlocked }"
          @click="showGongfaDetail(gongfa)"
        >
          <div class="gongfa-icon" :class="'rarity-' + gongfa.rarity">
            <img v-if="gongfa.skillIconKey && skillIcons[gongfa.skillIconKey]" :src="skillIcons[gongfa.skillIconKey]" :alt="gongfa.name" style="width:32px;height:32px">
            <span v-else>{{ gongfa.icon }}</span>
            <div v-if="gongfa.learned" class="learned-badge">✓</div>
          </div>
          <div class="gongfa-info">
            <div class="gongfa-name">{{ gongfa.name }}</div>
            <div class="gongfa-type">{{ gongfa.type_label }}</div>
            <div class="gongfa-desc">{{ gongfa.description }}</div>
          </div>
          <div class="gongfa-meta">
            <div v-if="gongfa.learned" class="gongfa-level">Lv.{{ gongfa.level }}/{{ gongfa.max_level }}</div>
            <div v-else class="gongfa-req">
              <span v-if="gongfa.realm_req > 0">境界: {{ gongfa.realm_req }}</span>
              <span v-if="gongfa.level_req > 0">等级: {{ gongfa.level_req }}</span>
            </div>
            <div class="gongfa-rarity">
              <span v-for="n in gongfa.rarity" :key="n" class="star">★</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 功法详情弹窗 -->
    <div v-if="showDetail" class="gongfa-detail-modal" @click.self="closeDetail">
      <div class="detail-content">
        <div class="detail-header">
          <div class="detail-icon" :class="'rarity-' + selectedGongfa.rarity">
            <img v-if="selectedGongfa.skillIconKey && skillIcons[selectedGongfa.skillIconKey]" :src="skillIcons[selectedGongfa.skillIconKey]" :alt="selectedGongfa.name" style="width:48px;height:48px">
            <span v-else>{{ selectedGongfa.icon }}</span>
          </div>
          <div class="detail-title">
            <h3>{{ selectedGongfa.name }}</h3>
            <div class="detail-rarity">
              <span v-for="n in selectedGongfa.rarity" :key="n" class="star">★</span>
            </div>
          </div>
          <button class="close-btn" @click="closeDetail">×</button>
        </div>
        
        <div class="detail-body">
          <div class="detail-desc">{{ selectedGongfa.description }}</div>
          
          <div class="detail-type-row">
            <span class="type-label">类型:</span>
            <span class="type-value">{{ selectedGongfa.type_label }}</span>
          </div>
          
          <div v-if="selectedGongfa.learned" class="detail-level">
            <div class="level-header">
              <span>等级 {{ selectedGongfa.level }} / {{ selectedGongfa.max_level }}</span>
              <span class="level-progress">{{ Math.floor(selectedGongfa.level / selectedGongfa.max_level * 100) }}%</span>
            </div>
            <div class="level-bar">
              <div class="level-fill" :style="{ width: (selectedGongfa.level / selectedGongfa.max_level * 100) + '%' }"></div>
            </div>
          </div>
          
          <div class="detail-effects">
            <h4>📈 升级效果</h4>
            <div class="effect-table">
              <div class="effect-header">
                <span>等级</span>
                <span>效果</span>
                <span>消耗</span>
              </div>
              <div 
                v-for="(effect, level) in selectedGongfa.effects" 
                :key="level"
                class="effect-row"
                :class="{ current: selectedGongfa.learned && selectedGongfa.level == level, locked: selectedGongfa.learned && selectedGongfa.level < level }"
              >
                <span class="level-col">{{ level }}</span>
                <span class="effect-col">{{ formatEffect(effect) }}</span>
                <span class="cost-col">{{ formatCost(selectedGongfa.upgrade_cost[level]) }}</span>
              </div>
            </div>
          </div>
          
          <div v-if="!selectedGongfa.learned" class="detail-requirements">
            <h4>🔒 解锁条件</h4>
            <div class="req-list">
              <div class="req-item" :class="{ met: playerData.realm_level >= selectedGongfa.realm_req }">
                <span class="req-icon">{{ playerData.realm_level >= selectedGongfa.realm_req ? '✅' : '❌' }}</span>
                <span>境界等级 ≥ {{ selectedGongfa.realm_req }}</span>
              </div>
              <div class="req-item" :class="{ met: playerData.level >= selectedGongfa.level_req }">
                <span class="req-icon">{{ playerData.level >= selectedGongfa.level_req ? '✅' : '❌' }}</span>
                <span>角色等级 ≥ {{ selectedGongfa.level_req }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="detail-actions">
          <button 
            v-if="!selectedGongfa.learned"
            class="action-btn learn"
            :disabled="!canLearn"
            @click="learnGongfa"
          >
            学习功法
          </button>
          <button 
            v-else-if="selectedGongfa.level < selectedGongfa.max_level"
            class="action-btn upgrade"
            :disabled="!canUpgrade"
            @click="upgradeGongfa"
          >
            升级功法
          </button>
          <button 
            v-else
            class="action-btn maxed"
            disabled
          >
            已满级
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'GongfaPanel',
  data() {
    return {
      isVisible: false,
      showDetail: false,
      selectedGongfa: null,
      selectedSlot: null,
      activeCategory: 'all',
      categories: [
        { id: 'all', name: '全部', icon: '📚' },
        { id: 'cultivation', name: '修炼', icon: '🧘' },
        { id: 'attack', name: '攻击', icon: '⚔️' },
        { id: 'defense', name: '防御', icon: '🛡️' },
        { id: 'support', name: '辅助', icon: '✨' },
      ],
      playerData: {
        level: 50,
        realm_level: 5,
        spirit_stones: 100000,
      },
      // 功法槽位
      gongfaSlots: [
        { type: 'cultivation', label: '修炼', icon: '🧘', skillIconKey: 'spirit_heal', gongfa: null },
        { type: 'attack', label: '攻击', icon: '⚔️', skillIconKey: 'sword_qi', gongfa: null },
        { type: 'defense', label: '防御', icon: '🛡️', skillIconKey: 'earth_shield', gongfa: null },
        { type: 'support', label: '辅助', icon: '✨', skillIconKey: 'light_heal', gongfa: null },
      ],
      // 总属性加成
      totalStats: [
        { key: 'spirit_rate', icon: '💎', label: '灵气效率', value: 15, type: 'spirit' },
        { key: 'attack', icon: '⚔️', label: '攻击力', value: 10, type: 'attack' },
        { key: 'defense', icon: '🛡️', label: '防御力', value: 8, type: 'defense' },
        { key: 'hp', icon: '❤️', label: '生命值', value: 12, type: 'hp' },
        { key: 'crit', icon: '💥', label: '暴击率', value: 5, type: 'crit' },
      ],
      // 功法列表
      gongfaList: [
        { id: 'iron_body', name: '铁布衫', type: 'defense', description: '基础的护体功法，提升防御力', icon: '🛡️', skillIconKey: 'earth_shield', rarity: 1, level: 3, max_level: 5, learned: true, realm_req: 0, level_req: 1, type_label: '防御' },
        { id: 'swift_strike', name: '疾风拳', type: 'attack', description: '快速攻击敌人，造成额外伤害', icon: '👊', skillIconKey: 'sword_qi', rarity: 2, level: 2, max_level: 5, learned: true, realm_req: 1, level_req: 10, type_label: '攻击' },
        { id: 'meditation', name: '冥想术', type: 'cultivation', description: '提升修炼效率，增加灵气获取', icon: '🧘', skillIconKey: 'spirit_heal', rarity: 2, level: 4, max_level: 5, learned: true, realm_req: 2, level_req: 15, type_label: '修炼' },
        { id: 'flame_fist', name: '烈焰拳', type: 'attack', description: '炽热的拳法，附带燃烧效果', icon: '🔥', skillIconKey: 'fire_blast', rarity: 3, level: 0, max_level: 5, learned: false, realm_req: 3, level_req: 25, type_label: '攻击' },
        { id: 'ice_shield', name: '冰盾术', type: 'defense', description: '凝聚冰之护盾，反击敌人', icon: '❄️', skillIconKey: 'water_flow', rarity: 3, level: 0, max_level: 5, learned: false, realm_req: 4, level_req: 30, type_label: '防御' },
        { id: 'healing', name: '治疗术', type: 'support', description: '恢复自身生命值', icon: '💚', skillIconKey: 'light_heal', rarity: 2, level: 1, max_level: 5, learned: true, realm_req: 2, level_req: 20, type_label: '辅助' },
        { id: 'thunder_strike', name: '天雷击', type: 'attack', description: '召唤天雷攻击敌人', icon: '⚡', skillIconKey: 'void_shadow', rarity: 4, level: 0, max_level: 5, learned: false, realm_req: 5, level_req: 40, type_label: '攻击' },
        { id: 'celestial_breath', name: '先天混元功', type: 'cultivation', description: '沟通天地元气的无上功法', icon: '✨', skillIconKey: 'wood_growth', rarity: 4, level: 0, max_level: 5, learned: false, realm_req: 5, level_req: 50, type_label: '修炼' },
      ],
      // 升级效果示例
      effectsData: {
        iron_body: { 1: { def: 0.1 }, 2: { def: 0.15 }, 3: { def: 0.2 }, 4: { def: 0.25 }, 5: { def: 0.3 } },
        swift_strike: { 1: { atk: 0.1 }, 2: { atk: 0.15 }, 3: { atk: 0.2 }, 4: { atk: 0.25 }, 5: { atk: 0.3 } },
        meditation: { 1: { spirit: 0.1 }, 2: { spirit: 0.15 }, 3: { spirit: 0.2 }, 4: { spirit: 0.25 }, 5: { spirit: 0.3 } },
      },
      upgradeCostData: {
        iron_body: { 1: { spirit_stones: 100 }, 2: { spirit_stones: 200 }, 3: { spirit_stones: 400 }, 4: { spirit_stones: 800 }, 5: { spirit_stones: 1600 } },
        swift_strike: { 1: { spirit_stones: 500 }, 2: { spirit_stones: 1000 }, 3: { spirit_stones: 2000 }, 4: { spirit_stones: 4000 }, 5: { spirit_stones: 8000 } },
        meditation: { 1: { spirit_stones: 300 }, 2: { spirit_stones: 600 }, 3: { spirit_stones: 1200 }, 4: { spirit_stones: 2400 }, 5: { spirit_stones: 4800 } },
      },
    };
  },
  computed: {
    filteredGongfaList() {
      if (this.activeCategory === 'all') {
        return this.gongfaList;
      }
      return this.gongfaList.filter(g => g.type === this.activeCategory);
    },
    canLearn() {
      if (!this.selectedGongfa) return false;
      return this.playerData.realm_level >= this.selectedGongfa.realm_req &&
             this.playerData.level >= this.selectedGongfa.level_req;
    },
    canUpgrade() {
      if (!this.selectedGongfa || !this.selectedGongfa.learned) return false;
      const nextLevel = this.selectedGongfa.level + 1;
      const cost = this.selectedGongfa.upgrade_cost?.[nextLevel]?.spirit_stones || 0;
      return this.playerData.spirit_stones >= cost && nextLevel <= this.selectedGongfa.max_level;
    },
    // 技能图标映射
    skillIcons() {
      return window.SKILL_ICONS || {};
    },
  },
  methods: {
    openPanel() {
      this.isVisible = true;
    },
    
    closePanel() {
      this.isVisible = false;
      this.$emit('close');
    },
    
    getCategoryCount(categoryId) {
      if (categoryId === 'all') return this.gongfaList.length;
      return this.gongfaList.filter(g => g.type === categoryId).length;
    },
    
    selectSlot(slot) {
      this.selectedSlot = slot;
    },
    
    showGongfaDetail(gongfa) {
      this.selectedGongfa = { ...gongfa };
      this.showDetail = true;
    },
    
    closeDetail() {
      this.showDetail = false;
      this.selectedGongfa = null;
    },
    
    formatEffect(effect) {
      const entries = Object.entries(effect);
      return entries.map(([key, val]) => {
        const labels = { def: '防御', atk: '攻击', spirit: '灵气', hp: '生命', crit: '暴击' };
        return `+${(val * 100).toFixed(0)}%${labels[key] || key}`;
      }).join(', ');
    },
    
    formatCost(cost) {
      if (!cost) return '-';
      return `${cost.spirit_stones || 0}灵石`;
    },
    
    learnGongfa() {
      if (!this.canLearn) return;
      const gongfa = this.gongfaList.find(g => g.id === this.selectedGongfa.id);
      if (gongfa) {
        gongfa.learned = true;
        gongfa.level = 1;
      }
      this.closeDetail();
    },
    
    upgradeGongfa() {
      if (!this.canUpgrade) return;
      const gongfa = this.gongfaList.find(g => g.id === this.selectedGongfa.id);
      if (gongfa && gongfa.level < gongfa.max_level) {
        gongfa.level++;
      }
      this.selectedGongfa.level = gongfa.level;
    },
  },
};
</script>

<style scoped>
.gongfa-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  max-height: 85vh;
  background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  color: white;
  z-index: 1000;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, #3498db, #2980b9);
}

.panel-header h2 {
  margin: 0;
  font-size: 20px;
}

.close-btn {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.3s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.panel-content {
  padding: 20px;
  max-height: calc(85vh - 80px);
  overflow-y: auto;
}

/* 功法槽位 */
.gongfa-slots {
  margin-bottom: 20px;
}

.gongfa-slots h3 {
  font-size: 16px;
  margin-bottom: 10px;
}

.slots-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.slot-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
}

.slot-item:hover {
  background: rgba(255, 255, 255, 0.2);
}

.slot-item.filled {
  background: rgba(52, 152, 219, 0.3);
  border: 1px solid rgba(52, 152, 219, 0.5);
}

.slot-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
}

.slot-info {
  flex: 1;
}

.slot-type {
  display: block;
  font-size: 12px;
  opacity: 0.7;
}

.slot-name {
  font-weight: bold;
}

.slot-empty {
  font-size: 12px;
  opacity: 0.5;
}

.slot-level {
  font-size: 12px;
  color: #f39c12;
  font-weight: bold;
}

/* 属性摘要 */
.gongfa-stats {
  margin-bottom: 20px;
}

.gongfa-stats h3 {
  font-size: 16px;
  margin-bottom: 10px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.stat-icon {
  font-size: 14px;
}

.stat-label {
  font-size: 11px;
  opacity: 0.7;
}

.stat-value {
  margin-left: auto;
  font-weight: bold;
  font-size: 12px;
}

.stat-value.spirit { color: #9b59b6; }
.stat-value.attack { color: #e74c3c; }
.stat-value.defense { color: #3498db; }
.stat-value.hp { color: #2ecc71; }
.stat-value.crit { color: #f39c12; }

/* 分类标签 */
.gongfa-categories {
  margin-bottom: 15px;
}

.category-tabs {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.category-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 12px;
  border: none;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s;
}

.category-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.category-btn.active {
  background: linear-gradient(135deg, #3498db, #2980b9);
}

.cat-count {
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 10px;
}

/* 功法列表 */
.gongfa-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.gongfa-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.gongfa-card:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateX(5px);
}

.gongfa-card.learned {
  background: rgba(46, 204, 113, 0.2);
}

.gongfa-card.locked {
  opacity: 0.7;
}

.gongfa-icon {
  position: relative;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
}

.gongfa-icon.rarity-1 { border: 2px solid #95a5a6; }
.gongfa-icon.rarity-2 { border: 2px solid #2ecc71; box-shadow: 0 0 10px rgba(46, 204, 113, 0.3); }
.gongfa-icon.rarity-3 { border: 2px solid #3498db; box-shadow: 0 0 10px rgba(52, 152, 219, 0.3); }
.gongfa-icon.rarity-4 { border: 2px solid #9b59b6; box-shadow: 0 0 15px rgba(155, 89, 182, 0.5); }

.learned-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 18px;
  height: 18px;
  background: #2ecc71;
  border-radius: 50%;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gongfa-info {
  flex: 1;
}

.gongfa-name {
  font-weight: bold;
  margin-bottom: 2px;
}

.gongfa-type {
  font-size: 11px;
  color: #f39c12;
  margin-bottom: 4px;
}

.gongfa-desc {
  font-size: 11px;
  opacity: 0.7;
}

.gongfa-meta {
  text-align: right;
}

.gongfa-level {
  color: #2ecc71;
  font-weight: bold;
  font-size: 12px;
}

.gongfa-req {
  font-size: 10px;
  opacity: 0.6;
  display: flex;
  flex-direction: column;
}

.gongfa-rarity {
  margin-top: 5px;
}

.star {
  color: #f39c12;
  font-size: 10px;
}

/* 详情弹窗 */
.gongfa-detail-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.detail-content {
  width: 450px;
  max-height: 80vh;
  background: linear-gradient(135deg, #2c3e50, #34495e);
  border-radius: 20px;
  overflow: hidden;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px;
  background: linear-gradient(135deg, #3498db, #2980b9);
}

.detail-icon {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 15px;
}

.detail-title h3 {
  margin: 0;
}

.detail-rarity .star {
  font-size: 14px;
}

.detail-body {
  padding: 20px;
  max-height: 50vh;
  overflow-y: auto;
}

.detail-desc {
  margin-bottom: 15px;
  opacity: 0.9;
  line-height: 1.5;
}

.detail-type-row {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.type-label {
  opacity: 0.7;
}

.type-value {
  color: #f39c12;
}

.detail-level {
  margin-bottom: 20px;
}

.level-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 12px;
}

.level-progress {
  color: #2ecc71;
}

.level-bar {
  height: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  overflow: hidden;
}

.level-fill {
  height: 100%;
  background: linear-gradient(90deg, #2ecc71, #27ae60);
  transition: width 0.3s;
}

.detail-effects h4 {
  margin-bottom: 10px;
  font-size: 14px;
}

.effect-table {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  overflow: hidden;
}

.effect-header {
  display: grid;
  grid-template-columns: 50px 1fr 80px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.3);
  font-size: 12px;
  opacity: 0.7;
}

.effect-row {
  display: grid;
  grid-template-columns: 50px 1fr 80px;
  padding: 10px;
  font-size: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.effect-row.current {
  background: rgba(46, 204, 113, 0.2);
}

.effect-row.locked {
  opacity: 0.5;
}

.detail-requirements {
  margin-top: 20px;
}

.detail-requirements h4 {
  margin-bottom: 10px;
  font-size: 14px;
}

.req-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.req-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  font-size: 12px;
}

.req-item.met {
  background: rgba(46, 204, 113, 0.2);
}

.detail-actions {
  padding: 20px;
  display: flex;
  gap: 10px;
}

.action-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.action-btn.learn {
  background: linear-gradient(135deg, #2ecc71, #27ae60);
  color: white;
}

.action-btn.learn:disabled {
  background: rgba(255, 255, 255, 0.2);
  cursor: not-allowed;
}

.action-btn.upgrade {
  background: linear-gradient(135deg, #f39c12, #e67e22);
  color: white;
}

.action-btn.upgrade:disabled {
  background: rgba(255, 255, 255, 0.2);
  cursor: not-allowed;
}

.action-btn.maxed {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  cursor: not-allowed;
}

/* 粒子特效 */
.gongfa-particles {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
  border-radius: 20px;
}

.particle {
  position: absolute;
  font-size: 8px;
  color: #f39c12;
  animation: floatParticle 2s ease-in-out infinite;
  animation-delay: var(--delay);
  opacity: 0.5;
}

.particle:nth-child(odd) {
  left: calc(var(--i) * 6%);
  top: 10%;
}

.particle:nth-child(even) {
  right: calc(var(--i) * 6%);
  bottom: 10%;
}

@keyframes floatParticle {
  0%, 100% { transform: translateY(0) scale(1); opacity: 0.5; }
  50% { transform: translateY(-15px) scale(1.2); opacity: 1; }
}
</style>
