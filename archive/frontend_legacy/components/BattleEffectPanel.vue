<template>
  <div class="battle-effect-panel">
    <div class="panel-header">
      <h2>⚔️ 战斗特效</h2>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>
    
    <div class="panel-content">
      <!-- 技能动画展示 -->
      <div class="effect-section">
        <h3>🔥 技能动画预览</h3>
        <div class="skill-animation-container">
          <div 
            v-for="skill in skills" 
            :key="skill.id"
            class="skill-card"
            :class="{ active: activeSkill === skill.id }"
            @click="playSkillAnimation(skill)"
          >
            <div class="skill-icon" :style="{ background: skill.color }">
              {{ skill.icon }}
            </div>
            <div class="skill-name">{{ skill.name }}</div>
            <div class="skill-effect-type">{{ skill.type }}</div>
          </div>
        </div>
        
        <!-- 动画播放区域 -->
        <div class="animation-stage" ref="stageRef">
          <div 
            v-for="effect in activeEffects" 
            :key="effect.id"
            class="battle-effect"
            :class="effect.type"
            :style="effect.style"
          >
            {{ effect.icon }}
          </div>
        </div>
        
        <!-- 伤害数字 -->
        <div class="damage-numbers">
          <div 
            v-for="(dmg, idx) in damageNumbers" 
            :key="idx"
            class="damage-number"
            :class="dmg.type"
            :style="{ animationDelay: idx * 0.1 + 's' }"
          >
            {{ dmg.value }}
          </div>
        </div>
      </div>
      
      <!-- Buff效果展示 -->
      <div class="effect-section">
        <h3>✨ Buff效果</h3>
        <div class="buff-list">
          <div 
            v-for="buff in buffs" 
            :key="buff.id"
            class="buff-item"
            :class="buff.type"
          >
            <span class="buff-icon">{{ buff.icon }}</span>
            <span class="buff-name">{{ buff.name }}</span>
            <span class="buff-duration">{{ buff.duration }}秒</span>
          </div>
        </div>
      </div>
      
      <!-- 特效设置 -->
      <div class="effect-section">
        <h3>⚙️ 特效设置</h3>
        <div class="settings-row">
          <label>
            <input type="checkbox" v-model="settings.enabled" />
            启用战斗特效
          </label>
        </div>
        <div class="settings-row">
          <label>
            <input type="checkbox" v-model="settings.sound" />
            启用音效
          </label>
        </div>
        <div class="settings-row">
          <label>特效等级：</label>
          <select v-model="settings.quality">
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BattleEffectPanel',
  emits: ['close'],
  data() {
    return {
      activeSkill: null,
      activeEffects: [],
      damageNumbers: [],
      effects: [],
      settings: {
        enabled: true,
        sound: true,
        quality: 'high'
      },
      skills: [
        { id: 1, name: '天雷诀', icon: '⚡', type: '雷电', color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
        { id: 2, name: '烈焰掌', icon: '🔥', type: '火焰', color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
        { id: 3, name: '冰封术', icon: '❄️', type: '冰霜', color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
        { id: 4, name: '风刃斩', icon: '🌀', type: '风系', color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
        { id: 5, name: '裂地击', icon: '💥', type: '土系', color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
        { id: 6, name: '天剑诀', icon: '🗡️', type: '金属', color: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' }
      ],
      buffs: [
        { id: 1, name: '攻击强化', icon: '⚔️', type: 'buff', duration: 30 },
        { id: 2, name: '防御护盾', icon: '🛡️', type: 'buff', duration: 20 },
        { id: 3, name: '速度提升', icon: '⚡', type: 'buff', duration: 15 },
        { id: 4, name: '暴击几率', icon: '💥', type: 'buff', duration: 10 },
        { id: 5, name: '中毒', icon: '☠️', type: 'debuff', duration: 12 },
        { id: 6, name: '减速', icon: '🐌', type: 'debuff', duration: 8 }
      ]
    };
  },
  mounted() {
    this.effectId = 0;
  },
  methods: {
    playSkillAnimation(skill) {
      this.activeSkill = skill.id;
      
      // 创建技能特效
      const effectId = ++this.effectId;
      const effect = {
        id: effectId,
        type: skill.type,
        icon: skill.icon,
        style: {
          '--effect-color': skill.color
        }
      };
      
      this.activeEffects.push(effect);
      
      // 随机生成伤害数字
      this.showDamageNumbers();
      
      // 清理特效
      setTimeout(() => {
        this.activeEffects = this.activeEffects.filter(e => e.id !== effectId);
        this.activeSkill = null;
      }, 1500);
    },
    showDamageNumbers() {
      const damageValues = [
        { value: Math.floor(Math.random() * 1000) + 500, type: 'normal' },
        { value: Math.floor(Math.random() * 2000) + 1000, type: 'crit' },
        { value: Math.floor(Math.random() * 500) + 100, type: 'miss' }
      ];
      
      this.damageNumbers = [];
      
      damageValues.forEach((dmg, idx) => {
        setTimeout(() => {
          this.damageNumbers.push(dmg);
        }, idx * 100);
      });
      
      // 清理伤害数字
      setTimeout(() => {
        this.damageNumbers = [];
      }, 1500);
    }
  }
};
</script>

<style>
.battle-effect-panel {
  background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
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
  padding: 4px 8px;
}

.close-btn:hover {
  color: #fff;
}

.panel-content {
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
}

.effect-section {
  margin-bottom: 24px;
}

.effect-section h3 {
  font-size: 14px;
  color: #ffd700;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 215, 0, 0.1);
}

.skill-animation-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.skill-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.skill-card:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 215, 0, 0.3);
  transform: translateY(-2px);
}

.skill-card.active {
  border-color: #ffd700;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
}

.skill-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin: 0 auto 8px;
}

.skill-name {
  font-size: 12px;
  color: #fff;
  margin-bottom: 4px;
}

.skill-effect-type {
  font-size: 10px;
  color: #888;
}

.animation-stage {
  height: 100px;
  background: rgba(0, 0, 0, 0.3);
  background-image: url('../assets/game-effects.jpg');
  background-size: cover;
  background-position: center;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.battle-effect {
  font-size: 48px;
  animation: skillRelease 1s ease-out forwards;
  position: absolute;
}

@keyframes skillRelease {
  0% {
    transform: scale(0) rotate(0deg);
    opacity: 0;
  }
  30% {
    transform: scale(1.5) rotate(180deg);
    opacity: 1;
  }
  100% {
    transform: scale(2) rotate(360deg);
    opacity: 0;
  }
}

.damage-numbers {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.damage-number {
  position: absolute;
  font-size: 24px;
  font-weight: bold;
  animation: damageFloat 1.5s ease-out forwards;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.damage-number.normal {
  color: #fff;
}

.damage-number.crit {
  color: #ffd700;
  font-size: 32px;
}

.damage-number.miss {
  color: #888;
}

@keyframes damageFloat {
  0% {
    transform: translateY(0) scale(0.5);
    opacity: 0;
  }
  20% {
    transform: translateY(-20px) scale(1.2);
    opacity: 1;
  }
  100% {
    transform: translateY(-80px) scale(1);
    opacity: 0;
  }
}

.buff-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.buff-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  font-size: 12px;
}

.buff-item.buff {
  border: 1px solid rgba(0, 255, 136, 0.3);
}

.buff-item.debuff {
  border: 1px solid rgba(255, 68, 68, 0.3);
}

.buff-icon {
  font-size: 14px;
}

.buff-name {
  color: #e8e8f0;
}

.buff-duration {
  color: #888;
  font-size: 10px;
}

.settings-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.settings-row label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #aaa;
}

.settings-row select {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
}
</style>
