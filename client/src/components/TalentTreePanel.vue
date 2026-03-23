<template>
  <div class="talent-panel">
    <div class="panel-header">
      <h2>🌟 天赋系统</h2>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>
    
    <div class="panel-content">
      <!-- 天赋点显示 -->
      <div class="talent-points-display">
        <div class="points-info">
          <div class="points-icon">💎</div>
          <div class="points-details">
            <div class="points-value">{{ availablePoints }}</div>
            <div class="points-label">可用天赋点</div>
          </div>
        </div>
        <div class="points-source">
          <div class="source-item">
            <span class="source-icon">📈</span>
            <span class="source-label">升级获得:</span>
            <span class="source-value">+{{ pointsFromLevel }}</span>
          </div>
          <div class="source-item">
            <span class="source-icon">🎁</span>
            <span class="source-label">活动奖励:</span>
            <span class="source-value">+{{ pointsFromActivity }}</span>
          </div>
        </div>
      </div>
      
      <!-- 技能树展示 -->
      <div class="skill-tree-section">
        <div class="tree-tabs">
          <button 
            v-for="tab in talentCategories" 
            :key="tab.id"
            class="tab-btn"
            :class="{ active: activeCategory === tab.id }"
            @click="activeCategory = tab.id"
          >
            <span class="tab-icon">{{ tab.icon }}</span>
            <span class="tab-name">{{ tab.name }}</span>
          </button>
        </div>
        
        <div class="tree-container">
          <div class="tree-nodes">
            <div 
              v-for="talent in filteredTalents" 
              :key="talent.id"
              class="talent-node"
              :class="{ 
                locked: !talent.unlocked,
                available: talent.unlocked && talent.points < talent.maxPoints,
                maxed: talent.points >= talent.maxPoints
              }"
              :style="talent.position"
              @click="selectTalent(talent)"
            >
              <div class="node-icon" :class="'rarity-' + talent.rarity">
                <span class="icon-emoji">{{ talent.icon }}</span>
                <div class="points-badge" v-if="talent.points > 0">
                  {{ talent.points }}/{{ talent.maxPoints }}
                </div>
              </div>
              <div class="node-name">{{ talent.name }}</div>
              
              <!-- 锁定遮罩 -->
              <div class="lock-mask" v-if="!talent.unlocked">
                <span class="lock-icon">🔒</span>
              </div>
            </div>
            
            <!-- 连接线 -->
            <svg class="connection-lines">
              <line 
                v-for="line in connections" 
                :key="line.id"
                :x1="line.x1" 
                :y1="line.y1" 
                :x2="line.x2" 
                :y2="line.y2"
                :class="{ active: line.active }"
              />
            </svg>
          </div>
        </div>
      </div>
      
      <!-- 选中天赋详情 -->
      <div class="talent-detail" v-if="selectedTalent">
        <div class="detail-header">
          <div class="detail-icon" :class="'rarity-' + selectedTalent.rarity">
            {{ selectedTalent.icon }}
          </div>
          <div class="detail-info">
            <div class="detail-name">{{ selectedTalent.name }}</div>
            <div class="detail-category">{{ getCategoryLabel(selectedTalent.category) }}</div>
          </div>
        </div>
        
        <div class="detail-desc">{{ selectedTalent.description }}</div>
        
        <!-- 当前效果 -->
        <div class="detail-effects" v-if="selectedTalent.unlocked">
          <div class="effects-title">当前效果</div>
          <div class="effect-list">
            <div 
              v-for="(value, key) in selectedTalent.effects" 
              :key="key"
              class="effect-row"
            >
              <span class="effect-name">{{ getEffectLabel(key) }}</span>
              <span class="effect-value">+{{ formatEffectValue(key, value) }}</span>
            </div>
          </div>
        </div>
        
        <!-- 解锁/加点条件 -->
        <div class="detail-requirements" v-if="!selectedTalent.unlocked || selectedTalent.points < selectedTalent.maxPoints">
          <div class="req-title">{{ selectedTalent.unlocked ? '升级条件' : '解锁条件' }}</div>
          <div class="req-list">
            <div 
              v-for="req in selectedTalent.requirements" 
              :key="req.type"
              class="req-row"
              :class="{ met: checkRequirement(req) }"
            >
              <span class="req-icon">{{ checkRequirement(req) ? '✅' : '❌' }}</span>
              <span class="req-label">{{ req.label }}</span>
              <span class="req-value">{{ req.current }}/{{ req.need }}</span>
            </div>
          </div>
        </div>
        
        <!-- 操作按钮 -->
        <div class="detail-actions">
          <button 
            v-if="!selectedTalent.unlocked"
            class="action-btn unlock-btn"
            :disabled="!canUnlock(selectedTalent)"
            @click="unlockTalent(selectedTalent)"
          >
            🔓 解锁 ({{ selectedTalent.unlockCost }}点)
          </button>
          
          <button 
            v-else-if="selectedTalent.points < selectedTalent.maxPoints"
            class="action-btn add-point-btn"
            :disabled="!canAddPoint(selectedTalent)"
            @click="addTalentPoint(selectedTalent)"
          >
            ➕ 加点 ({{ selectedTalent.pointCost }}点)
          </button>
          
          <button 
            v-else
            class="action-btn max-btn"
            disabled
          >
            ⭐ 已满级
          </button>
        </div>
      </div>
      
      <!-- 总属性加成 -->
      <div class="total-bonus">
        <div class="bonus-title">💪 总属性加成</div>
        <div class="bonus-grid">
          <div 
            v-for="(value, key) in totalBonuses" 
            :key="key"
            class="bonus-item"
            v-show="value > 0"
          >
            <span class="bonus-icon">{{ getBonusIcon(key) }}</span>
            <span class="bonus-label">{{ getEffectLabel(key) }}</span>
            <span class="bonus-value">+{{ formatEffectValue(key, value) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const { ref, computed, onMounted } = Vue;

export default {
  name: 'TalentTreePanel',
  emits: ['close', 'unlock-talent', 'add-point'],
  setup(props, { emit }) {
    const activeCategory = ref('combat');
    const selectedTalent = ref(null);
    const availablePoints = ref(15);
    const pointsFromLevel = ref(10);
    const pointsFromActivity = ref(5);
    
    const talentCategories = [
      { id: 'combat', name: '战斗', icon: '⚔️' },
      { id: 'cultivation', name: '修炼', icon: '🧘' },
      { id: 'survival', name: '生存', icon: '🛡️' },
      { id: 'special', name: '特殊', icon: '✨' }
    ];
    
    const talents = ref([
      // 战斗系天赋
      {
        id: 'combat_1',
        name: '战力激发',
        category: 'combat',
        description: '激发战斗潜能，大幅提升攻击力',
        icon: '💥',
        rarity: 1,
        points: 3,
        maxPoints: 5,
        unlockCost: 0,
        unlocked: true,
        position: { left: '50%', top: '10%' },
        requires: [],
        requirements: [],
        effects: { atk: 0.05 }
      },
      {
        id: 'combat_2',
        name: '暴击专精',
        category: 'combat',
        description: '专注暴击技巧，提升暴击率和暴击伤害',
        icon: '🎯',
        rarity: 2,
        points: 0,
        maxPoints: 5,
        unlockCost: 3,
        unlocked: false,
        position: { left: '30%', top: '25%' },
        requires: ['combat_1'],
        requirements: [
          { type: 'points', label: '投入战意激发', need: 3, current: 3 }
        ],
        effects: { critRate: 0.02, critDamage: 0.1 }
      },
      {
        id: 'combat_3',
        name: '致命打击',
        category: 'combat',
        description: '强化致命一击的伤害',
        icon: '💀',
        rarity: 3,
        points: 0,
        maxPoints: 5,
        unlockCost: 6,
        unlocked: false,
        position: { left: '50%', top: '40%' },
        requires: ['combat_2'],
        requirements: [
          { type: 'points', label: '投入暴击专精', need: 3, current: 0 }
        ],
        effects: { critDamage: 0.2 }
      },
      {
        id: 'combat_4',
        name: '战斗直觉',
        category: 'combat',
        description: '提升战斗中的闪避和招架能力',
        icon: '👁️',
        rarity: 2,
        points: 0,
        maxPoints: 5,
        unlockCost: 4,
        unlocked: false,
        position: { left: '70%', top: '25%' },
        requires: ['combat_1'],
        requirements: [
          { type: 'points', label: '投入战力激发', need: 2, current: 3 }
        ],
        effects: { dodge: 0.01, parry: 0.02 }
      },
      // 修炼系天赋
      {
        id: 'cult_1',
        name: '灵根觉醒',
        category: 'cultivation',
        description: '觉醒灵根，提升修炼效率',
        icon: '🌱',
        rarity: 1,
        points: 2,
        maxPoints: 5,
        unlockCost: 0,
        unlocked: true,
        position: { left: '50%', top: '55%' },
        requires: [],
        requirements: [],
        effects: { cultivationSpeed: 0.1 }
      },
      {
        id: 'cult_2',
        name: '聚气成丹',
        category: 'cultivation',
        description: '凝聚灵气为内丹，大幅提升修为',
        icon: '🔮',
        rarity: 3,
        points: 0,
        maxPoints: 5,
        unlockCost: 5,
        unlocked: false,
        position: { left: '35%', top: '70%' },
        requires: ['cult_1'],
        requirements: [
          { type: 'points', label: '投入灵根觉醒', need: 3, current: 2 }
        ],
        effects: { cultivationSpeed: 0.15, maxQi: 50 }
      },
      {
        id: 'cult_3',
        name: '灵气亲和',
        category: 'cultivation',
        description: '增强与天地灵气的亲和度',
        icon: '🌀',
        rarity: 2,
        points: 0,
        maxPoints: 5,
        unlockCost: 3,
        unlocked: false,
        position: { left: '65%', top: '70%' },
        requires: ['cult_1'],
        requirements: [
          { type: 'points', label: '投入灵根觉醒', need: 2, current: 2 }
        ],
        effects: { spiritAbsorb: 0.1 }
      },
      // 生存系天赋
      {
        id: 'surv_1',
        name: '强身健体',
        category: 'survival',
        description: '强化肉体，提升生命上限',
        icon: '💪',
        rarity: 1,
        points: 2,
        maxPoints: 5,
        unlockCost: 0,
        unlocked: true,
        position: { left: '20%', top: '60%' },
        requires: [],
        requirements: [],
        effects: { maxHp: 0.1 }
      },
      {
        id: 'surv_2',
        name: '防御专精',
        category: 'survival',
        description: '提升防御力，减少受到的伤害',
        icon: '🛡️',
        rarity: 2,
        points: 0,
        maxPoints: 5,
        unlockCost: 3,
        unlocked: false,
        position: { left: '10%', top: '75%' },
        requires: ['surv_1'],
        requirements: [
          { type: 'points', label: '投入强身健体', need: 2, current: 2 }
        ],
        effects: { def: 0.05, damageReduction: 0.02 }
      },
      {
        id: 'surv_3',
        name: '再生体质',
        category: 'survival',
        description: '加速生命恢复',
        icon: '❤️',
        rarity: 2,
        points: 0,
        maxPoints: 5,
        unlockCost: 4,
        unlocked: false,
        position: { left: '30%', top: '80%' },
        requires: ['surv_1'],
        requirements: [
          { type: 'points', label: '投入强身健体', need: 3, current: 2 }
        ],
        effects: { hpRegen: 0.1 }
      },
      // 特殊系天赋
      {
        id: 'spec_1',
        name: '气运加身',
        category: 'special',
        description: '提升掉落率和稀有奖励概率',
        icon: '🍀',
        rarity: 3,
        points: 0,
        maxPoints: 3,
        unlockCost: 8,
        unlocked: false,
        position: { left: '80%', top: '60%' },
        requires: [],
        requirements: [
          { type: 'totalPoints', label: '总天赋点', need: 10, current: 7 }
        ],
        effects: { dropRate: 0.1, rareChance: 0.05 }
      },
      {
        id: 'spec_2',
        name: '悟道',
        category: 'special',
        description: '领悟天道，提升境界突破成功率',
        icon: '🏔️',
        rarity: 4,
        points: 0,
        maxPoints: 3,
        unlockCost: 15,
        unlocked: false,
        position: { left: '80%', top: '80%' },
        requires: ['spec_1'],
        requirements: [
          { type: 'points', label: '投入气运加身', need: 2, current: 0 }
        ],
        effects: { realmBreakChance: 0.1 }
      }
    ]);
    
    const filteredTalents = computed(() => {
      return talents.value.filter(t => t.category === activeCategory.value);
    });
    
    const connections = computed(() => {
      const lines = [];
      const categoryTalents = filteredTalents.value;
      
      categoryTalents.forEach(talent => {
        talent.requires.forEach(reqId => {
          const reqTalent = categoryTalents.find(t => t.id === reqId);
          if (reqTalent) {
            const active = reqTalent.unlocked && talent.unlocked;
            lines.push({
              id: `${reqId}-${talent.id}`,
              x1: parseFloat(reqTalent.position.left),
              y1: parseFloat(reqTalent.position.top) + 5,
              x2: parseFloat(talent.position.left),
              y2: parseFloat(talent.position.top),
              active
            });
          }
        });
      });
      
      return lines;
    });
    
    const totalBonuses = computed(() => {
      const bonuses = {
        atk: 0,
        critRate: 0,
        critDamage: 0,
        dodge: 0,
        parry: 0,
        cultivationSpeed: 0,
        maxQi: 0,
        spiritAbsorb: 0,
        maxHp: 0,
        def: 0,
        damageReduction: 0,
        hpRegen: 0,
        dropRate: 0,
        rareChance: 0,
        realmBreakChance: 0
      };
      
      talents.value.forEach(talent => {
        if (talent.unlocked) {
          const multiplier = talent.points;
          Object.keys(talent.effects).forEach(key => {
            if (bonuses[key] !== undefined) {
              bonuses[key] += talent.effects[key] * multiplier;
            }
          });
        }
      });
      
      return bonuses;
    });
    
    const getCategoryLabel = (category) => {
      const labels = {
        combat: '战斗',
        cultivation: '修炼',
        survival: '生存',
        special: '特殊'
      };
      return labels[category] || category;
    };
    
    const getEffectLabel = (key) => {
      const labels = {
        atk: '攻击力',
        critRate: '暴击率',
        critDamage: '暴击伤害',
        dodge: '闪避率',
        parry: '招架率',
        cultivationSpeed: '修炼速度',
        maxQi: '最大灵气',
        spiritAbsorb: '灵气吸收',
        maxHp: '生命上限',
        def: '防御力',
        damageReduction: '伤害减免',
        hpRegen: '生命恢复',
        dropRate: '掉落率',
        rareChance: '稀有概率',
        realmBreakChance: '突破成功率'
      };
      return labels[key] || key;
    };
    
    const formatEffectValue = (key, value) => {
      if (key === 'maxQi') {
        return value;
      }
      return (value * 100).toFixed(0) + '%';
    };
    
    const getBonusIcon = (key) => {
      const icons = {
        atk: '⚔️',
        critRate: '🎯',
        critDamage: '💥',
        dodge: '💨',
        parry: '🛡️',
        cultivationSpeed: '🧘',
        maxQi: '🔮',
        spiritAbsorb: '🌀',
        maxHp: '❤️',
        def: '🛡️',
        damageReduction: '💪',
        hpRegen: '💖',
        dropRate: '📦',
        rareChance: '⭐',
        realmBreakChance: '🏔️'
      };
      return icons[key] || '✨';
    };
    
    const checkRequirement = (req) => {
      if (req.type === 'points') {
        const talent = talents.value.find(t => req.label.includes(t.name));
        if (talent) {
          req.current = talent.points;
          return talent.points >= req.need;
        }
      } else if (req.type === 'totalPoints') {
        const totalPoints = talents.value.reduce((sum, t) => sum + (t.unlocked ? t.points : 0), 0);
        req.current = totalPoints;
        return totalPoints >= req.need;
      }
      return false;
    };
    
    const canUnlock = (talent) => {
      if (talent.unlocked) return false;
      if (availablePoints.value < talent.unlockCost) return false;
      
      for (const req of talent.requirements) {
        if (!checkRequirement(req)) return false;
      }
      return true;
    };
    
    const canAddPoint = (talent) => {
      if (!talent.unlocked) return false;
      if (talent.points >= talent.maxPoints) return false;
      if (availablePoints.value < talent.pointCost) return false;
      return true;
    };
    
    const selectTalent = (talent) => {
      selectedTalent.value = talent;
    };
    
    const unlockTalent = (talent) => {
      if (!canUnlock(talent)) return;
      
      availablePoints.value -= talent.unlockCost;
      talent.unlocked = true;
      talent.points = 1;
      
      emit('unlock-talent', talent);
    };
    
    const addTalentPoint = (talent) => {
      if (!canAddPoint(talent)) return;
      
      availablePoints.value -= talent.pointCost;
      talent.points++;
      
      emit('add-point', talent);
    };
    
    return {
      activeCategory,
      selectedTalent,
      availablePoints,
      pointsFromLevel,
      pointsFromActivity,
      talentCategories,
      talents,
      filteredTalents,
      connections,
      totalBonuses,
      getCategoryLabel,
      getEffectLabel,
      formatEffectValue,
      getBonusIcon,
      checkRequirement,
      canUnlock,
      canAddPoint,
      selectTalent,
      unlockTalent,
      addTalentPoint
    };
  }
};
</script>

<style scoped>
.talent-panel {
  width: 650px;
  max-height: 750px;
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
  color: #9f7aea;
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
  max-height: 670px;
  overflow-y: auto;
}

/* 天赋点显示 */
.talent-points-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  margin-bottom: 16px;
}

.points-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.points-icon {
  font-size: 40px;
}

.points-value {
  font-size: 36px;
  font-weight: bold;
  color: #9f7aea;
}

.points-label {
  color: #a0aec0;
  font-size: 12px;
}

.points-source {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.source-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.source-icon {
  font-size: 14px;
}

.source-label {
  color: #a0aec0;
}

.source-value {
  color: #48bb78;
  font-weight: bold;
}

/* 技能树区域 */
.skill-tree-section {
  margin-bottom: 16px;
}

.tree-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  color: #a0aec0;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 13px;
}

.tab-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.tab-btn.active {
  background: linear-gradient(135deg, #9f7aea, #805ad5);
  border-color: transparent;
  color: #fff;
}

.tree-container {
  position: relative;
  height: 280px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  overflow: hidden;
}

.tree-nodes {
  position: relative;
  width: 100%;
  height: 100%;
}

/* 连接线 */
.connection-lines {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.connection-lines line {
  stroke: rgba(255, 255, 255, 0.1);
  stroke-width: 2;
  transition: stroke 0.3s;
}

.connection-lines line.active {
  stroke: #9f7aea;
}

/* 天赋节点 */
.talent-node {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transform: translate(-50%, -50%);
  z-index: 1;
  transition: all 0.3s;
}

.talent-node:hover {
  transform: translate(-50%, -50%) scale(1.1);
  z-index: 10;
}

.node-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid rgba(255, 255, 255, 0.2);
  position: relative;
  transition: all 0.3s;
}

.node-icon.rarity-1 { border-color: #a0aec0; }
.node-icon.rarity-2 { border-color: #48bb78; box-shadow: 0 0 10px rgba(72, 187, 120, 0.3); }
.node-icon.rarity-3 { border-color: #9f7aea; box-shadow: 0 0 15px rgba(159, 122, 234, 0.4); }
.node-icon.rarity-4 { border-color: #f6e05e; box-shadow: 0 0 20px rgba(246, 224, 94, 0.5); }

.icon-emoji {
  font-size: 24px;
}

.points-badge {
  position: absolute;
  bottom: -8px;
  right: -8px;
  background: linear-gradient(135deg, #9f7aea, #805ad5);
  color: white;
  font-size: 10px;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 10px;
  white-space: nowrap;
}

.node-name {
  margin-top: 8px;
  font-size: 11px;
  color: #a0aec0;
  text-align: center;
  white-space: nowrap;
}

.talent-node.locked .node-icon {
  filter: grayscale(80%);
  opacity: 0.6;
}

.lock-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 12px;
}

.lock-icon {
  font-size: 18px;
}

.talent-node.available .node-icon {
  border-color: #9f7aea;
  box-shadow: 0 0 15px rgba(159, 122, 234, 0.4);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 15px rgba(159, 122, 234, 0.4); }
  50% { box-shadow: 0 0 25px rgba(159, 122, 234, 0.6); }
}

.talent-node.maxed .node-icon {
  border-color: #f6e05e;
  box-shadow: 0 0 20px rgba(246, 224, 94, 0.5);
}

/* 天赋详情 */
.talent-detail {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.detail-icon {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  border: 2px solid #a0aec0;
}

.detail-icon.rarity-1 { border-color: #a0aec0; }
.detail-icon.rarity-2 { border-color: #48bb78; }
.detail-icon.rarity-3 { border-color: #9f7aea; }
.detail-icon.rarity-4 { border-color: #f6e05e; }

.detail-name {
  font-size: 18px;
  font-weight: bold;
  color: #fff;
}

.detail-category {
  font-size: 12px;
  color: #a0aec0;
}

.detail-desc {
  font-size: 13px;
  color: #a0aec0;
  margin-bottom: 12px;
  line-height: 1.5;
}

.detail-effects {
  margin-bottom: 12px;
}

.effects-title, .req-title {
  font-size: 13px;
  color: #718096;
  margin-bottom: 8px;
}

.effect-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.effect-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  font-size: 12px;
}

.effect-value {
  color: #48bb78;
  font-weight: bold;
}

.detail-requirements {
  margin-bottom: 12px;
}

.req-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.req-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  font-size: 12px;
}

.req-row.met .req-value {
  color: #48bb78;
}

.req-value {
  margin-left: auto;
  color: #e53e3e;
}

.detail-actions {
  display: flex;
  gap: 10px;
}

.action-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.3s;
}

.unlock-btn {
  background: linear-gradient(135deg, #9f7aea, #805ad5);
  color: white;
}

.add-point-btn {
  background: linear-gradient(135deg, #48bb78, #38a169);
  color: white;
}

.max-btn {
  background: rgba(246, 224, 94, 0.2);
  color: #f6e05e;
  cursor: not-allowed;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn:not(:disabled):hover {
  transform: translateY(-2px);
}

/* 总属性加成 */
.total-bonus {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 16px;
}

.bonus-title {
  font-size: 14px;
  color: #a0aec0;
  margin-bottom: 12px;
}

.bonus-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.bonus-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  font-size: 11px;
}

.bonus-icon {
  font-size: 14px;
}

.bonus-label {
  color: #a0aec0;
  flex: 1;
}

.bonus-value {
  color: #48bb78;
  font-weight: bold;
}
</style>
