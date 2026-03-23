<template>
  <div class="ultimate-panel">
    <div class="ultimate-header">
      <div class="ultimate-title">⚔️ 必杀技能</div>
      <button class="close-btn" @click="$emit('close')">×</button>
    </div>
    
    <!-- 技能列表 -->
    <div class="skill-list">
      <div 
        v-for="skill in skills" 
        :key="skill.id"
        class="skill-card"
        :class="{ 'on-cooldown': skill.cooldown > 0, equipped: skill.equipped }"
      >
        <!-- 技能图标 -->
        <div class="skill-icon">
          <span class="icon-img">{{ skill.icon }}</span>
          <div class="cooldown-overlay" v-if="skill.cooldown > 0">
            <svg class="cooldown-progress" viewBox="0 0 36 36">
              <circle
                class="cooldown-bg"
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke-width="3"
              />
              <circle
                class="cooldown-fg"
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke-width="3"
                :stroke-dasharray="`${skill.cooldown / skill.maxCooldown * 100}, 100`"
              />
            </svg>
            <span class="cooldown-text">{{ formatCooldown(skill.cooldown) }}</span>
          </div>
        </div>
        
        <!-- 技能信息 -->
        <div class="skill-info">
          <div class="skill-header">
            <span class="skill-name">{{ skill.name }}</span>
            <span class="skill-level">Lv.{{ skill.level }}</span>
          </div>
          <div class="skill-desc">{{ skill.description }}</div>
          
          <!-- 技能属性 -->
          <div class="skill-stats">
            <span class="stat-item">
              <span class="stat-icon">⚔️</span>
              <span class="stat-value">{{ skill.damage }}</span>
            </span>
            <span class="stat-item">
              <span class="stat-icon">⏱️</span>
              <span class="stat-value">{{ skill.maxCooldown }}秒</span>
            </span>
          </div>
        </div>
        
        <!-- 装备/卸下按钮 -->
        <button 
          class="equip-btn" 
          :class="{ equipped: skill.equipped }"
          @click="toggleEquip(skill)"
        >
          {{ skill.equipped ? '卸下' : '装备' }}
        </button>
      </div>
    </div>
    
    <!-- 已装备技能栏 -->
    <div class="equipped-bar" v-if="equippedCount > 0">
      <div class="bar-label">已装备 ({{ equippedCount }}/{{ maxEquip }})</div>
      <div class="bar-icons">
        <div 
          v-for="skill in equippedSkills" 
          :key="skill.id"
          class="bar-slot"
          :class="{ 'on-cooldown': skill.cooldown > 0 }"
        >
          <span class="slot-icon">{{ skill.icon }}</span>
          <span class="slot-cooldown" v-if="skill.cooldown > 0">{{ formatCooldown(skill.cooldown) }}</span>
        </div>
        <div 
          v-for="n in (maxEquip - equippedCount)" 
          :key="'empty-' + n"
          class="bar-slot empty"
        ></div>
      </div>
    </div>
  </div>
</template>

<script>
const { ref, computed, onMounted, onUnmounted } = Vue;

export default {
  name: 'UltimateSkillPanel',
  emits: ['close', 'equip', 'unequip'],
  setup(props, { emit }) {
    const maxEquip = ref(3);
    const cooldownTimer = ref(null);
    
    // 必杀技能模拟数据
    const skills = ref([
      {
        id: 1,
        name: '天雷降世',
        icon: '⚡',
        level: 5,
        description: '召唤天雷之力，对敌方造成巨额雷电伤害',
        damage: 5000,
        maxCooldown: 60,
        cooldown: 0,
        equipped: true
      },
      {
        id: 2,
        name: '万剑归宗',
        icon: '🗡️',
        level: 3,
        description: '万把飞剑齐发，造成连续剑雨伤害',
        damage: 3500,
        maxCooldown: 45,
        cooldown: 0,
        equipped: true
      },
      {
        id: 3,
        name: '烈焰焚天',
        icon: '🔥',
        level: 4,
        description: '召唤滔天烈焰，焚烧范围内所有敌人',
        damage: 4200,
        maxCooldown: 50,
        cooldown: 0,
        equipped: true
      },
      {
        id: 4,
        name: '冰封千里',
        icon: '❄️',
        level: 2,
        description: '极寒之力冰封大地，冻结敌人',
        damage: 2000,
        maxCooldown: 40,
        cooldown: 0,
        equipped: false
      },
      {
        id: 5,
        name: '噬魂夺魄',
        icon: '👻',
        level: 1,
        description: '吸取敌人魂魄，造成持续伤害并回复自身',
        damage: 1500,
        maxCooldown: 35,
        cooldown: 0,
        equipped: false
      },
      {
        id: 6,
        name: '星辰陨落',
        icon: '☄️',
        level: 1,
        description: '召唤流星雨，对目标区域造成毁灭性打击',
        damage: 6000,
        maxCooldown: 90,
        cooldown: 0,
        equipped: false
      }
    ]);
    
    const equippedCount = computed(() => {
      return skills.value.filter(s => s.equipped).length;
    });
    
    const equippedSkills = computed(() => {
      return skills.value.filter(s => s.equipped);
    });
    
    const toggleEquip = (skill) => {
      if (skill.equipped) {
        // 卸下
        skill.equipped = false;
        emit('unequip', skill);
      } else {
        // 装备
        if (equippedCount.value < maxEquip.value) {
          skill.equipped = true;
          emit('equip', skill);
        } else {
          console.log('已达到最大装备数量');
        }
      }
    };
    
    const formatCooldown = (seconds) => {
      if (seconds <= 0) return '';
      if (seconds < 60) return seconds + 's';
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return m + ':' + s.toString().padStart(2, '0');
    };
    
    // 模拟冷却倒计时
    const startCooldownTimer = () => {
      cooldownTimer.value = setInterval(() => {
        skills.value.forEach(skill => {
          if (skill.cooldown > 0) {
            skill.cooldown--;
          }
        });
      }, 1000);
    };
    
    // 模拟随机触发技能冷却（测试用）
    const simulateCooldown = () => {
      // 随机选择一个已装备且不在冷却中的技能
      const readySkills = skills.value.filter(s => s.equipped && s.cooldown === 0);
      if (readySkills.length > 0) {
        const randomSkill = readySkills[Math.floor(Math.random() * readySkills.length)];
        randomSkill.cooldown = randomSkill.maxCooldown;
        console.log('技能进入冷却:', randomSkill.name);
      }
    };
    
    onMounted(() => {
      startCooldownTimer();
      
      // 每10秒模拟一次技能冷却（测试用）
      setInterval(simulateCooldown, 10000);
    });
    
    onUnmounted(() => {
      if (cooldownTimer.value) {
        clearInterval(cooldownTimer.value);
      }
    });
    
    return {
      maxEquip,
      skills,
      equippedCount,
      equippedSkills,
      toggleEquip,
      formatCooldown
    };
  }
};
</script>

<style scoped>
.ultimate-panel {
  width: 520px;
  max-height: 650px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 20px;
  color: #fff;
}

.ultimate-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.ultimate-title {
  font-size: 22px;
  font-weight: bold;
}

.close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #fff;
}

/* 技能列表 */
.skill-list {
  max-height: 400px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
  padding-right: 5px;
}

.skill-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid transparent;
  border-radius: 12px;
  transition: all 0.3s;
}

.skill-card:hover {
  background: rgba(255, 255, 255, 0.08);
}

.skill-card.equipped {
  border-color: rgba(255, 215, 0, 0.3);
}

.skill-card.on-cooldown {
  opacity: 0.8;
}

/* 技能图标 */
.skill-icon {
  position: relative;
  width: 60px;
  height: 60px;
  flex-shrink: 0;
}

.icon-img {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 32px;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 165, 0, 0.2) 100%);
  border-radius: 12px;
  border: 2px solid rgba(255, 215, 0, 0.3);
}

.cooldown-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 12px;
}

.cooldown-progress {
  position: absolute;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.cooldown-bg {
  stroke: rgba(255, 255, 255, 0.1);
}

.cooldown-fg {
  stroke: #60a5fa;
  stroke-linecap: round;
  transition: stroke-dasharray 0.3s;
}

.cooldown-text {
  font-size: 14px;
  font-weight: bold;
  color: #60a5fa;
  z-index: 1;
}

/* 技能信息 */
.skill-info {
  flex: 1;
  min-width: 0;
}

.skill-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.skill-name {
  font-size: 16px;
  font-weight: bold;
}

.skill-level {
  font-size: 12px;
  padding: 2px 8px;
  background: linear-gradient(135deg, #ffd700 0%, #ff9900 100%);
  border-radius: 10px;
  color: #333;
  font-weight: bold;
}

.skill-desc {
  font-size: 12px;
  color: #aaa;
  margin-bottom: 8px;
  line-height: 1.4;
}

.skill-stats {
  display: flex;
  gap: 15px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.stat-icon {
  font-size: 12px;
}

.stat-value {
  color: #ffd700;
}

/* 装备按钮 */
.equip-btn {
  flex-shrink: 0;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  background: linear-gradient(135deg, #ffd700 0%, #ff9900 100%);
  color: #333;
}

.equip-btn:hover {
  transform: scale(1.05);
}

.equip-btn.equipped {
  background: linear-gradient(135deg, #f87171 0%, #ef4444 100%);
  color: #fff;
}

/* 已装备技能栏 */
.equipped-bar {
  padding: 15px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
}

.bar-label {
  font-size: 12px;
  color: #aaa;
  margin-bottom: 10px;
}

.bar-icons {
  display: flex;
  gap: 10px;
}

.bar-slot {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 215, 0, 0.3);
  border-radius: 10px;
  position: relative;
}

.bar-slot.empty {
  border: 2px dashed rgba(255, 255, 255, 0.1);
  background: transparent;
}

.bar-slot.on-cooldown {
  opacity: 0.6;
}

.slot-icon {
  font-size: 24px;
}

.slot-cooldown {
  position: absolute;
  bottom: 2px;
  right: 2px;
  font-size: 10px;
  color: #60a5fa;
  font-weight: bold;
}
</style>
