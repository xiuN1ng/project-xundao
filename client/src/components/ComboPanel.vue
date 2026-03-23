<template>
  <div class="combo-panel">
    <div class="panel-header">
      <h2>⚡ 连击系统</h2>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>
    
    <div class="panel-content">
      <!-- 当前连击状态 -->
      <div class="combo-status">
        <div class="combo-display">
          <div class="combo-count" :class="{ active: currentCombo > 0 }">
            {{ currentCombo }}
          </div>
          <div class="combo-label">连击数</div>
        </div>
        <div class="combo-bar">
          <div class="bar-fill" :style="{ width: comboProgress + '%' }"></div>
          <div class="bar-timer">{{ comboTimer }}s</div>
        </div>
      </div>
      
      <!-- 连击技能列表 -->
      <div class="combo-skills">
        <h4>连击技能</h4>
        <div class="skills-list">
          <div 
            v-for="skill in comboSkills" 
            :key="skill.id"
            class="skill-item"
            :class="{ 
              ready: skill.ready, 
              triggered: skill.triggered,
              disabled: !canTrigger 
            }"
            @click="triggerSkill(skill)"
          >
            <div class="skill-icon">{{ skill.icon }}</div>
            <div class="skill-info">
              <div class="skill-name">{{ skill.name }}</div>
              <div class="skill-desc">{{ skill.description }}</div>
              <div class="skill-bonus">连击加成: +{{ skill.comboBonus }}%</div>
            </div>
            <div class="skill-cooldown" v-if="skill.cooldown > 0">
              {{ skill.cooldown }}s
            </div>
            <div class="skill-ready" v-else>就绪</div>
          </div>
        </div>
      </div>
      
      <!-- 连击效果展示 -->
      <div class="combo-effects">
        <h4>连击效果</h4>
        <div class="effects-grid">
          <div 
            v-for="effect in comboEffects" 
            :key="effect.id"
            class="effect-card"
            :class="{ active: currentCombo >= effect.required }"
          >
            <div class="effect-icon">{{ effect.icon }}</div>
            <div class="effect-name">{{ effect.name }}</div>
            <div class="effect-requirement">需要 {{ effect.required }} 连击</div>
            <div class="effect-bonus" v-if="currentCombo >= effect.required">
              {{ effect.bonus }}
            </div>
          </div>
        </div>
      </div>
      
      <!-- 统计数据 -->
      <div class="combo-stats">
        <div class="stat-box">
          <div class="stat-value">{{ totalCombos }}</div>
          <div class="stat-label">总连击次数</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">{{ maxCombo }}</div>
          <div class="stat-label">最高连击</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">{{ comboDamage }}</div>
          <div class="stat-label">连击伤害</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">{{ averageCombo.toFixed(1) }}</div>
          <div class="stat-label">平均连击</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ComboPanel',
  data() {
    return {
      currentCombo: 0,
      comboTimer: 0,
      maxCombo: 0,
      totalCombos: 0,
      comboDamage: 0,
      canTrigger: true,
      comboSkills: [
        { 
          id: 'skill_1', 
          name: '连环击', 
          icon: '🔄', 
          description: '快速连续攻击',
          comboBonus: 10,
          cooldown: 0,
          ready: true,
          triggered: false
        },
        { 
          id: 'skill_2', 
          name: '暴风斩', 
          icon: '🌪️', 
          description: '范围性连击技能',
          comboBonus: 20,
          cooldown: 0,
          ready: true,
          triggered: false
        },
        { 
          id: 'skill_3', 
          name: '天打雷劈', 
          icon: '⚡', 
          description: '雷电连击',
          comboBonus: 35,
          cooldown: 0,
          ready: true,
          triggered: false
        },
        { 
          id: 'skill_4', 
          name: '狂龙出海', 
          icon: '🐉', 
          description: '龙形连击',
          comboBonus: 50,
          cooldown: 0,
          ready: true,
          triggered: false
        }
      ],
      comboEffects: [
        { id: 'effect_1', name: '轻击', icon: '👊', required: 1, bonus: '伤害+10%' },
        { id: 'effect_2', name: '猛击', icon: '💪', required: 3, bonus: '伤害+25%' },
        { id: 'effect_3', name: '粉碎', icon: '💥', required: 5, bonus: '伤害+50%' },
        { id: 'effect_4', name: '毁灭', icon: '🔥', required: 10, bonus: '伤害+100%' },
        { id: 'effect_5', name: '终结', icon: '💀', required: 15, bonus: '伤害+150%' },
        { id: 'effect_6', name: '神罚', icon: '⚡', required: 20, bonus: '伤害+200%' }
      ]
    };
  },
  computed: {
    comboProgress() {
      return Math.min(100, (this.comboTimer / 5) * 100);
    },
    averageCombo() {
      return this.totalCombos > 0 ? this.comboDamage / this.totalCombos : 0;
    }
  },
  methods: {
    triggerSkill(skill) {
      if (!this.canTrigger || skill.cooldown > 0) return;
      
      // 增加连击数
      this.currentCombo++;
      this.totalCombos++;
      
      if (this.currentCombo > this.maxCombo) {
        this.maxCombo = this.currentCombo;
      }
      
      // 计算伤害加成
      const bonusMultiplier = 1 + (skill.comboBonus / 100) * this.currentCombo;
      const baseDamage = 100;
      const damage = Math.floor(baseDamage * bonusMultiplier);
      this.comboDamage += damage;
      
      // 标记技能已触发
      skill.triggered = true;
      setTimeout(() => {
        skill.triggered = false;
      }, 300);
      
      // 重置连击计时器
      this.comboTimer = 5;
      
      // 设置技能冷却
      skill.cooldown = 3;
      const skillCooldown = skill.cooldown;
      const cooldownInterval = setInterval(() => {
        skill.cooldown--;
        if (skill.cooldown <= 0) {
          clearInterval(cooldownInterval);
          skill.ready = true;
        }
      }, 1000);
      
      // 显示连击效果
      this.showComboEffect(damage, skill.comboBonus);
    },
    showComboEffect(damage, bonus) {
      // 通知主游戏显示连击效果
      if (window.gameEvents) {
        window.gameEvents.emit('combo', {
          combo: this.currentCombo,
          damage: damage,
          bonus: bonus
        });
      }
    },
    resetCombo() {
      if (this.currentCombo > 0) {
        this.currentCombo = 0;
        this.comboTimer = 0;
      }
    }
  },
  mounted() {
    // 启动连击计时器
    this.comboTimerInterval = setInterval(() => {
      if (this.comboTimer > 0) {
        this.comboTimer--;
      }
      if (this.comboTimer === 0 && this.currentCombo > 0) {
        // 连击超时，重置
        setTimeout(() => {
          if (this.comboTimer === 0) {
            this.resetCombo();
          }
        }, 1000);
      }
    }, 1000);
  },
  beforeDestroy() {
    if (this.comboTimerInterval) {
      clearInterval(this.comboTimerInterval);
    }
  }
};
</script>

<style scoped>
.combo-panel {
  width: 700px;
  max-height: 650px;
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
  max-height: 570px;
  overflow-y: auto;
}

/* 连击状态 */
.combo-status {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
}

.combo-display {
  text-align: center;
  margin-bottom: 16px;
}

.combo-count {
  font-size: 72px;
  font-weight: bold;
  color: #4a5568;
  text-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
  transition: all 0.3s;
}

.combo-count.active {
  color: #f6e05e;
  text-shadow: 0 0 30px rgba(246, 224, 94, 0.5);
  animation: pulse 0.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.combo-label {
  color: #a0aec0;
  font-size: 1.2em;
}

.combo-bar {
  height: 24px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #f6e05e, #ed8936);
  transition: width 0.3s;
}

.bar-timer {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-weight: bold;
  font-size: 0.9em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

/* 连击技能 */
.combo-skills {
  margin-bottom: 20px;
}

.combo-skills h4, .combo-effects h4 {
  color: #f7fafc;
  margin: 0 0 12px 0;
}

.skills-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.skill-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.skill-item:hover:not(.disabled) {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.skill-item.ready {
  border-color: #48bb78;
}

.skill-item.triggered {
  border-color: #f6e05e;
  animation: triggerFlash 0.3s;
}

@keyframes triggerFlash {
  0% { background: rgba(246, 224, 94, 0.3); }
  100% { background: rgba(255, 255, 255, 0.05); }
}

.skill-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.skill-icon {
  font-size: 32px;
  margin-right: 12px;
}

.skill-info {
  flex: 1;
}

.skill-name {
  color: #f7fafc;
  font-weight: bold;
}

.skill-desc {
  color: #a0aec0;
  font-size: 0.85em;
}

.skill-bonus {
  color: #48bb78;
  font-size: 0.85em;
}

.skill-cooldown, .skill-ready {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.85em;
}

.skill-cooldown {
  background: #e53e3e;
  color: white;
}

.skill-ready {
  background: #48bb78;
  color: white;
}

/* 连击效果 */
.effects-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.effect-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.effect-card.active {
  border-color: #f6e05e;
  background: rgba(246, 224, 94, 0.1);
}

.effect-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.effect-name {
  color: #f7fafc;
  font-weight: bold;
  margin-bottom: 4px;
}

.effect-requirement {
  color: #718096;
  font-size: 0.85em;
  margin-bottom: 8px;
}

.effect-bonus {
  color: #48bb78;
  font-weight: bold;
  font-size: 0.9em;
}

/* 统计数据 */
.combo-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 20px;
}

.stat-box {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}

.stat-value {
  color: #f6e05e;
  font-size: 1.5em;
  font-weight: bold;
}

.stat-label {
  color: #a0aec0;
  font-size: 0.85em;
  margin-top: 4px;
}
</style>
