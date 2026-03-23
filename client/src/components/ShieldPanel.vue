<template>
  <div class="shield-panel">
    <div class="panel-header">
      <h2>🛡️ 护盾系统</h2>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>
    
    <div class="panel-content">
      <!-- 当前护盾状态 -->
      <div class="shield-status">
        <div class="shield-display">
          <div class="shield-icon" :class="{ active: currentShield > 0 }">🛡️</div>
          <div class="shield-value">
            <span class="current">{{ currentShield }}</span>
            <span class="max">/ {{ maxShield }}</span>
          </div>
        </div>
        <div class="shield-bar">
          <div class="bar-fill" :style="{ width: shieldPercent + '%' }"></div>
        </div>
        <div class="shield-info">
          <span>护盾值: {{ currentShield }}</span>
          <span>恢复速度: +{{ shieldRegen }}/s</span>
          <span>减伤: {{ damageReduction }}%</span>
        </div>
      </div>
      
      <!-- 护盾技能 -->
      <div class="shield-skills">
        <h4>护盾技能</h4>
        <div class="skills-grid">
          <div 
            v-for="skill in shieldSkills" 
            :key="skill.id"
            class="skill-card"
            :class="{ active: skill.active, onCooldown: skill.cooldown > 0 }"
            @click="activateSkill(skill)"
          >
            <div class="skill-icon">{{ skill.icon }}</div>
            <div class="skill-name">{{ skill.name }}</div>
            <div class="skill-effect">{{ skill.effect }}</div>
            <div class="skill-cost">消耗: {{ skill.cost }}能量</div>
            <div class="cooldown-overlay" v-if="skill.cooldown > 0">
              {{ skill.cooldown }}s
            </div>
          </div>
        </div>
      </div>
      
      <!-- 护盾类型 -->
      <div class="shield-types">
        <h4>护盾类型</h4>
        <div class="types-list">
          <div 
            v-for="type in shieldTypes" 
            :key="type.id"
            class="type-item"
            :class="{ active: activeShieldType === type.id, locked: !type.unlocked }"
            @click="selectShieldType(type)"
          >
            <div class="type-icon">{{ type.icon }}</div>
            <div class="type-info">
              <div class="type-name">{{ type.name }}</div>
              <div class="type-desc">{{ type.description }}</div>
              <div class="type-bonus" v-if="type.unlocked">
                {{ type.bonus }}
              </div>
              <div class="type-lock" v-else>
                需要等级 {{ type.requiredLevel }}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 护盾属性 -->
      <div class="shield-attributes">
        <h4>护盾属性</h4>
        <div class="attributes-grid">
          <div class="attr-item">
            <div class="attr-label">护盾强化</div>
            <div class="attr-value">+{{ shieldEnhance }}%</div>
            <button class="upgrade-btn" @click="upgradeAttribute('enhance')">升级</button>
          </div>
          <div class="attr-item">
            <div class="attr-label">恢复强化</div>
            <div class="attr-value">+{{ regenEnhance }}%</div>
            <button class="upgrade-btn" @click="upgradeAttribute('regen')">升级</button>
          </div>
          <div class="attr-item">
            <div class="attr-label">减伤强化</div>
            <div class="attr-value">+{{ mitigationEnhance }}%</div>
            <button class="upgrade-btn" @click="upgradeAttribute('mitigation')">升级</button>
          </div>
          <div class="attr-item">
            <div class="attr-label">反射强化</div>
            <div class="attr-value">+{{ reflectEnhance }}%</div>
            <button class="upgrade-btn" @click="upgradeAttribute('reflect')">升级</button>
          </div>
        </div>
      </div>
      
      <!-- 伤害统计 -->
      <div class="damage-stats">
        <h4>战斗统计</h4>
        <div class="stats-row">
          <div class="stat">
            <span class="stat-label">吸收伤害</span>
            <span class="stat-value">{{ damageAbsorbed.toLocaleString() }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">反射伤害</span>
            <span class="stat-value">{{ damageReflected.toLocaleString() }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">护盾破碎</span>
            <span class="stat-value">{{ shieldBroken }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ShieldPanel',
  data() {
    return {
      currentShield: 500,
      maxShield: 1000,
      shieldRegen: 5,
      damageReduction: 20,
      activeShieldType: 'basic',
      damageAbsorbed: 0,
      damageReflected: 0,
      shieldBroken: 0,
      shieldEnhance: 0,
      regenEnhance: 0,
      mitigationEnhance: 0,
      reflectEnhance: 0,
      shieldSkills: [
        { 
          id: 'skill_1', 
          name: '能量护盾', 
          icon: '💠', 
          effect: '获得护盾值',
          cost: 30,
          cooldown: 10,
          active: false 
        },
        { 
          id: 'skill_2', 
          name: '反射护盾', 
          icon: '🔄', 
          effect: '反弹部分伤害',
          cost: 50,
          cooldown: 15,
          active: false 
        },
        { 
          id: 'skill_3', 
          name: '绝对防御', 
          icon: '🛡️', 
          effect: '短时间无敌',
          cost: 100,
          cooldown: 30,
          active: false 
        },
        { 
          id: 'skill_4', 
          name: '生命链接', 
          icon: '🔗', 
          effect: '生命转换为护盾',
          cost: 20,
          cooldown: 5,
          active: false 
        }
      ],
      shieldTypes: [
        { 
          id: 'basic', 
          name: '基础护盾', 
          icon: '🛡️', 
          description: '基础护盾效果',
          bonus: '普通减伤',
          unlocked: true 
        },
        { 
          id: 'fire', 
          name: '火焰护盾', 
          icon: '🔥', 
          description: '火焰属性护盾',
          bonus: '火属性伤害+10%',
          unlocked: true 
        },
        { 
          id: 'ice', 
          name: '冰霜护盾', 
          icon: '❄️', 
          description: '冰霜属性护盾',
          bonus: '冰属性伤害+10%',
          unlocked: true 
        },
        { 
          id: 'thunder', 
          name: '雷电护盾', 
          icon: '⚡', 
          description: '雷电属性护盾',
          bonus: '雷属性伤害+10%',
          requiredLevel: 50,
          unlocked: false 
        },
        { 
          id: 'void', 
          name: '虚空护盾', 
          icon: '🌑', 
          description: '虚空属性护盾',
          bonus: '全伤害+15%',
          requiredLevel: 80,
          unlocked: false 
        }
      ]
    };
  },
  computed: {
    shieldPercent() {
      return Math.min(100, (this.currentShield / this.maxShield) * 100);
    }
  },
  methods: {
    activateSkill(skill) {
      if (skill.cooldown > 0) return;
      
      const player = window.gameData?.player || {};
      const energy = player.energy || 100;
      
      if (energy < skill.cost) {
        this.showMessage('能量不足！');
        return;
      }
      
      // 消耗能量
      player.energy -= skill.cost;
      
      // 激活技能效果
      skill.active = true;
      
      switch(skill.id) {
        case 'skill_1': // 能量护盾
          this.currentShield = Math.min(this.maxShield, this.currentShield + 300);
          break;
        case 'skill_2': // 反射护盾
          this.damageReflected += 50;
          break;
        case 'skill_3': // 绝对防御
          this.damageReduction = 100;
          break;
        case 'skill_4': // 生命链接
          const hpCost = 50;
          if (player.hp > hpCost) {
            player.hp -= hpCost;
            this.currentShield = Math.min(this.maxShield, this.currentShield + 200);
          }
          break;
      }
      
      // 设置冷却
      skill.cooldown = skill.cooldownTime || 10;
      const originalCooldown = skill.cooldown;
      const cooldownInterval = setInterval(() => {
        skill.cooldown--;
        if (skill.cooldown <= 0) {
          clearInterval(cooldownInterval);
          skill.active = false;
        }
      }, 1000);
      
      this.showMessage(`${skill.name} 已激活！`);
    },
    selectShieldType(type) {
      if (!type.unlocked) {
        this.showMessage(`需要达到 ${type.requiredLevel} 级才能解锁`);
        return;
      }
      this.activeShieldType = type.id;
      this.showMessage(`已切换到 ${type.name}`);
    },
    upgradeAttribute(attr) {
      const cost = 100;
      const player = window.gameData?.player || {};
      
      if ((player.currency || 0) < cost) {
        this.showMessage('灵石不足！');
        return;
      }
      
      player.currency -= cost;
      
      switch(attr) {
        case 'enhance':
          this.shieldEnhance += 5;
          this.maxShield += 100;
          break;
        case 'regen':
          this.regenEnhance += 5;
          this.shieldRegen += 1;
          break;
        case 'mitigation':
          this.mitigationEnhance += 3;
          this.damageReduction += 3;
          break;
        case 'reflect':
          this.reflectEnhance += 5;
          break;
      }
      
      this.showMessage('升级成功！');
    },
    takeDamage(amount) {
      let damage = amount;
      const reducedDamage = Math.floor(damage * (1 - this.damageReduction / 100));
      const shieldDamage = Math.min(this.currentShield, reducedDamage);
      
      this.currentShield -= shieldDamage;
      this.damageAbsorbed += shieldDamage;
      
      if (this.currentShield <= 0) {
        this.shieldBroken++;
        this.currentShield = 0;
      }
      
      return reducedDamage - shieldDamage;
    },
    showMessage(msg) {
      if (window.showMessage) {
        window.showMessage(msg);
      } else {
        alert(msg);
      }
    }
  },
  mounted() {
    // 启动护盾恢复
    this.regenInterval = setInterval(() => {
      if (this.currentShield < this.maxShield) {
        this.currentShield = Math.min(this.maxShield, this.currentShield + this.shieldRegen);
      }
    }, 1000);
  },
  beforeDestroy() {
    if (this.regenInterval) {
      clearInterval(this.regenInterval);
    }
  }
};
</script>

<style scoped>
.shield-panel {
  width: 750px;
  max-height: 700px;
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
  color: #63b3ed;
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
  max-height: 620px;
  overflow-y: auto;
}

/* 护盾状态 */
.shield-status {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
}

.shield-display {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.shield-icon {
  font-size: 48px;
  margin-right: 16px;
  opacity: 0.5;
}

.shield-icon.active {
  opacity: 1;
  animation: shieldPulse 2s ease-in-out infinite;
}

@keyframes shieldPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.shield-value {
  font-size: 36px;
  font-weight: bold;
}

.shield-value .current {
  color: #63b3ed;
}

.shield-value .max {
  color: #718096;
  font-size: 0.6em;
}

.shield-bar {
  height: 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 12px;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #4299e1, #63b3ed);
  transition: width 0.3s;
}

.shield-info {
  display: flex;
  justify-content: space-around;
  color: #a0aec0;
  font-size: 0.9em;
}

/* 护盾技能 */
.shield-skills {
  margin-bottom: 20px;
}

.shield-skills h4, .shield-types h4, .shield-attributes h4, .damage-stats h4 {
  color: #f7fafc;
  margin: 0 0 12px 0;
}

.skills-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.skill-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
  position: relative;
  overflow: hidden;
}

.skill-card:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.skill-card.active {
  border-color: #63b3ed;
  background: rgba(99, 179, 237, 0.1);
}

.skill-card.onCooldown {
  opacity: 0.6;
}

.skill-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.skill-name {
  color: #f7fafc;
  font-weight: bold;
  font-size: 0.95em;
}

.skill-effect {
  color: #a0aec0;
  font-size: 0.8em;
  margin: 4px 0;
}

.skill-cost {
  color: #f6e05e;
  font-size: 0.8em;
}

.cooldown-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  font-weight: bold;
}

/* 护盾类型 */
.types-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.type-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.type-item:hover:not(.locked) {
  background: rgba(255, 255, 255, 0.1);
}

.type-item.active {
  border-color: #63b3ed;
  background: rgba(99, 179, 237, 0.1);
}

.type-item.locked {
  opacity: 0.5;
  cursor: not-allowed;
}

.type-icon {
  font-size: 36px;
  margin-right: 16px;
}

.type-info {
  flex: 1;
}

.type-name {
  color: #f7fafc;
  font-weight: bold;
}

.type-desc {
  color: #a0aec0;
  font-size: 0.85em;
}

.type-bonus {
  color: #48bb78;
  font-size: 0.85em;
}

.type-lock {
  color: #e53e3e;
  font-size: 0.85em;
}

/* 护盾属性 */
.attributes-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.attr-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}

.attr-label {
  color: #a0aec0;
  font-size: 0.9em;
  margin-bottom: 8px;
}

.attr-value {
  color: #63b3ed;
  font-size: 1.5em;
  font-weight: bold;
  margin-bottom: 12px;
}

.upgrade-btn {
  padding: 8px 20px;
  background: linear-gradient(135deg, #4299e1, #3182ce);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.upgrade-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(66, 153, 225, 0.4);
}

/* 伤害统计 */
.stats-row {
  display: flex;
  gap: 16px;
}

.stat {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 12px;
  text-align: center;
}

.stat-label {
  color: #a0aec0;
  font-size: 0.85em;
  display: block;
  margin-bottom: 4px;
}

.stat-value {
  color: #f6e05e;
  font-size: 1.2em;
  font-weight: bold;
}
</style>
