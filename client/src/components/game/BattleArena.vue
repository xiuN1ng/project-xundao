<template>
  <div class="battle-arena" v-if="visible">
    <!-- 战斗头部 -->
    <div class="battle-header">
      <div class="battle-title">
        <span v-if="currentChapter">第 {{ currentChapter }} 章</span>
        <span class="enemy-type" :class="enemyType">{{ enemyTypeName }}</span>
      </div>
      <div class="battle-controls">
        <button class="btn-speed" @click="toggleSpeed" :disabled="battleState !== 'fighting'">
          {{ speedLabel }}
        </button>
        <button class="btn-skip" @click="skipBattle" :disabled="battleState !== 'fighting'">
          跳过
        </button>
        <button class="btn-close" @click="closeBattle">×</button>
      </div>
    </div>

    <!-- 战斗区域 -->
    <div class="battle-stage" :class="{ 'battle-animation': battleState === 'fighting' }">
      <!-- 玩家区域 -->
      <div class="combatant player-side" :class="{ 'attacking': lastAction?.actor === 'player', 'hurt': lastAction?.target === 'player' }">
        <div class="combatant-avatar">
          <div class="avatar-ring player"></div>
          <div class="avatar-icon">🧘</div>
        </div>
        <div class="combatant-info">
          <div class="combatant-name">{{ player.name }}</div>
          <div class="combatant-level">Lv.{{ player.level }}</div>
        </div>
        <!-- HP条 -->
        <div class="hp-bar">
          <div class="hp-fill" :style="{ width: player.hpPercent + '%' }"></div>
          <div class="hp-text">{{ player.hp }}/{{ player.maxHp }}</div>
        </div>
        <!-- MP条 -->
        <div class="mp-bar">
          <div class="mp-fill" :style="{ width: player.mp + '%' }"></div>
          <div class="mp-text">{{ player.mp }}</div>
        </div>
        <!-- 护盾 -->
        <div class="shield-bar" v-if="player.shield > 0">
          <div class="shield-fill" :style="{ width: (player.shield / player.maxHp * 100) + '%' }"></div>
          <div class="shield-text">护盾 {{ player.shield }}</div>
        </div>
      </div>

      <!-- VS 标志 -->
      <div class="vs-badge" v-if="battleState === 'fighting'">VS</div>

      <!-- 敌人区域 -->
      <div class="combatant enemy-side" :class="{ 'attacking': lastAction?.actor === 'enemy', 'hurt': lastAction?.target === 'enemy', 'boss': enemyType === 'boss' }">
        <div class="combatant-avatar">
          <div class="avatar-ring enemy"></div>
          <div class="avatar-icon">{{ enemyIcon }}</div>
        </div>
        <div class="combatant-info">
          <div class="combatant-name">{{ enemy.name }}</div>
          <div class="combatant-level">Lv.{{ enemy.level }}</div>
        </div>
        <!-- HP条 -->
        <div class="hp-bar" :class="{ 'boss-hp': enemyType === 'boss' }">
          <div class="hp-fill enemy" :style="{ width: enemy.hpPercent + '%' }"></div>
          <div class="hp-text">{{ enemy.hp }}/{{ enemy.maxHp }}</div>
        </div>
        <!-- 元素标记 -->
        <div class="element-tag" :class="enemy.element">{{ elementName(enemy.element) }}</div>
      </div>
    </div>

    <!-- 伤害数字飘字 -->
    <div class="damage-numbers">
      <div 
        v-for="(dmg, index) in damageNumbers" 
        :key="index"
        class="damage-number"
        :class="{ 
          'crit': dmg.isCrit, 
          'heal': dmg.type === 'heal',
          'miss': dmg.type === 'miss',
          'elemental': dmg.elementalBonus > 1
        }"
        :style="{ left: dmg.x + 'px', top: dmg.y + 'px' }"
      >
        {{ dmg.text }}
      </div>
    </div>

    <!-- 技能栏 -->
    <div class="skill-bar" v-if="battleState === 'fighting'">
      <div
        v-for="skill in skills"
        :key="skill.skillId"
        class="skill-btn"
        :class="{
          'on-cooldown': skill.remainingCooldown > 0,
          'skill-attack': skill.type === 'attack',
          'skill-heal': skill.type === 'heal',
          'skill-buff': skill.type === 'buff' || skill.type === 'defense',
          'skill-ultimate': skill.type === 'ultimate'
        }"
        @click="castSkill(skill)"
        :title="`${skill.skillNameCN} (${skill.type}) - 冷却: ${Math.round(skill.cooldown / 1000)}秒`"
      >
        <div class="skill-icon">{{ getSkillIcon(skill.type) }}</div>
        <div class="skill-name">{{ skill.skillNameCN }}</div>
        <!-- 冷却遮罩 -->
        <div class="skill-cooldown-overlay" v-if="skill.remainingCooldown > 0">
          <div class="cooldown-text">{{ Math.ceil(skill.remainingCooldown / 1000) }}s</div>
        </div>
        <!-- 冷却进度环 -->
        <svg v-if="skill.remainingCooldown > 0" class="cooldown-ring" viewBox="0 0 40 40">
          <circle
            class="cooldown-bg"
            cx="20" cy="20" r="18"
            fill="none"
            stroke-width="3"
          />
          <circle
            class="cooldown-progress"
            cx="20" cy="20" r="18"
            fill="none"
            stroke-width="3"
            :stroke-dasharray="`${113} ${113}`"
            :stroke-dashoffset="113 - (113 * (1 - skill.remainingCooldown / skill.cooldown))"
            transform="rotate(-90 20 20)"
          />
        </svg>
      </div>
    </div>

    <!-- 战斗日志 -->
    <div class="battle-log" v-if="showLog">
      <div class="log-content" ref="logContent">
        <div
          v-for="(entry, index) in battleLog"
          :key="index"
          class="log-entry"
          :class="{ 'crit': entry.isCrit, 'miss': entry.type === 'miss' }"
        >
          {{ entry.message }}
        </div>
      </div>
    </div>

    <!-- 战斗结果 -->
    <div class="battle-result" v-if="battleState === 'ended'">
      <div class="result-overlay" :class="resultClass">
        <div class="result-icon">{{ resultIcon }}</div>
        <div class="result-text">{{ resultText }}</div>
        <div class="result-rewards" v-if="rewards">
          <div class="reward-item">经验 +{{ rewards.exp }}</div>
          <div class="reward-item">灵石 +{{ rewards.gold }}</div>
        </div>
        <button class="btn-continue" @click="handleContinue">{{ rewards ? '领取奖励' : '继续' }}</button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div class="battle-loading" v-if="battleState === 'loading'">
      <div class="loading-spinner"></div>
      <div class="loading-text">战斗加载中...</div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, nextTick } from 'vue';

export default {
  name: 'BattleArena',
  
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    player: {
      type: Object,
      required: true
    },
    enemy: {
      type: Object,
      required: true
    },
    enemyType: {
      type: String,
      default: 'normal' // normal, elite, boss
    },
    currentChapter: {
      type: Number,
      default: 1
    },
    autoStart: {
      type: Boolean,
      default: false
    }
  },

  emits: ['battle-end', 'close', 'continue'],

  setup(props, { emit }) {
    const battleState = ref('idle'); // idle, loading, fighting, ended
    const battleLog = ref([]);
    const damageNumbers = ref([]);
    const lastAction = ref(null);
    const showLog = ref(true);
    const speed = ref(1);
    const rewards = ref(null);
    const logContent = ref(null);
    const skills = ref([]);
    let cooldownInterval = null;

    const speedLabel = computed(() => `${speed.value}x`);
    const enemyIcon = computed(() => {
      const icons = { normal: '👹', elite: '👺', boss: '👿' };
      return icons[props.enemyType] || '👹';
    });
    const enemyTypeName = computed(() => {
      const names = { normal: '普通', elite: '精英', boss: 'Boss' };
      return names[props.enemyType] || '普通';
    });

    const resultClass = computed(() => {
      if (!rewards.value) return 'lose';
      return rewards.value.exp > 0 || rewards.value.gold > 0 ? 'win' : 'lose';
    });
    const resultIcon = computed(() => {
      return resultClass.value === 'win' ? '🏆' : '💀';
    });
    const resultText = computed(() => {
      return resultClass.value === 'win' ? '胜利！' : '失败...';
    });

    const elementName = (element) => {
      const names = { metal: '金', wood: '木', water: '水', fire: '火', earth: '土' };
      return names[element] || '金';
    };

    // 获取技能图标
    const getSkillIcon = (type) => {
      const icons = {
        attack: '⚔️',
        heal: '💚',
        buff: '🛡️',
        defense: '🛡️',
        debuff: '💀',
        ultimate: '🔥',
        passive: '✨'
      };
      return icons[type] || '✨';
    };

    // 加载玩家技能列表
    const loadSkills = async () => {
      try {
        const response = await fetch(`/api/auto-cast/player-skills/${props.player.id}`);
        const result = await response.json();
        if (result.success && result.data && result.data.skills) {
          skills.value = result.data.skills.map(s => ({
            ...s,
            remainingCooldown: s.remainingCooldown || 0
          }));
        }
      } catch (e) {
        console.error('Failed to load skills:', e);
      }
    };

    // 施放技能
    const castSkill = async (skill) => {
      if (skill.remainingCooldown > 0) {
        return;
      }
      if (battleState.value !== 'fighting') return;

      try {
        const response = await fetch('/api/auto-cast/cast-skill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: props.player.id,
            skillId: skill.skillId,
            battleState: {
              selfHealthPercent: props.player.hpPercent || 100,
              selfManaPercent: props.player.mp || 100,
              enemyCount: 1,
              enemyHealthPercent: props.enemy.hpPercent || 100,
              comboCount: 0,
              battleElapsedTime: 0,
              activeBuffs: []
            }
          })
        });

        const result = await response.json();
        if (!result.success) {
          console.warn('Skill cast failed:', result.error);
          return;
        }

        // 设置技能冷却
        skill.remainingCooldown = result.data.cooldownTotal;

        // 添加技能使用日志
        const logEntry = {
          message: `🎯 使用 ${skill.skillNameCN}！`,
          isCrit: false,
          type: 'skill'
        };
        battleLog.value.push(logEntry);

        // 显示技能效果
        if (result.data.damage) {
          addDamageNumber({
            text: `-${result.data.damage}`,
            isCrit: skill.type === 'ultimate',
            elementalBonus: 1,
            x: 200,
            y: 250
          });
          // 更新敌人HP
          if (props.enemy && result.data.damage) {
            const newHp = Math.max(0, (props.enemy.hpPercent || 0) - (result.data.damage / (props.enemy.maxHp || 1) * 100));
            props.enemy.hpPercent = Math.min(100, newHp);
          }
        }
        if (result.data.heal) {
          addDamageNumber({
            text: `+${result.data.heal}`,
            type: 'heal',
            x: 200,
            y: 100
          });
        }
        if (result.data.buffs) {
          const logEntry2 = {
            message: `✨ 获得 ${result.data.buffs.join(', ')} 效果！`,
            isCrit: false,
            type: 'buff'
          };
          battleLog.value.push(logEntry2);
        }

        // 添加到战斗日志
        const battleData = {
          result: 'skill_cast',
          skillName: skill.skillNameCN,
          damage: result.data.damage || 0,
          heal: result.data.heal || 0,
          buffs: result.data.buffs || []
        };
        addBattleRecord(battleData);

      } catch (e) {
        console.error('Failed to cast skill:', e);
      }
    };

    // 更新技能冷却倒计时
    const updateSkillCooldowns = () => {
      skills.value.forEach(skill => {
        if (skill.remainingCooldown > 0) {
          skill.remainingCooldown = Math.max(0, skill.remainingCooldown - 100);
        }
      });
    };

    // 添加战斗记录
    const addBattleRecord = (data) => {
      window.dispatchEvent(new CustomEvent('skill-cast-record', { detail: data }));
    };

    // 开始战斗
    const startBattle = async () => {
      battleState.value = 'loading';
      battleLog.value = [];
      damageNumbers.value = [];
      rewards.value = null;

      // 加载技能列表
      await loadSkills();

      // 启动冷却倒计时更新
      if (cooldownInterval) clearInterval(cooldownInterval);
      cooldownInterval = setInterval(updateSkillCooldowns, 100);

      try {
        const response = await fetch('/api/battle/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            player_id: props.player.id,
            enemy: props.enemy
          })
        });

        const result = await response.json();

        if (result.success) {
          battleState.value = 'fighting';
          battleLog.value = result.log || [];
          
          // 模拟战斗动画
          await simulateBattleAnimation(result);
          
          rewards.value = result.rewards;
          battleState.value = 'ended';
        } else {
          console.error('Battle failed:', result.message);
          battleState.value = 'idle';
        }
      } catch (error) {
        console.error('Battle error:', error);
        battleState.value = 'idle';
      }
    };

    // 模拟战斗动画
    const simulateBattleAnimation = async (result) => {
      if (!result.log) return;

      for (const entry of result.log) {
        if (battleState.value !== 'fighting') break;
        
        lastAction.value = entry;
        
        // 添加伤害数字
        if (entry.type === 'damage' && entry.damage > 0) {
          const isPlayer = entry.actor === 'player';
          addDamageNumber({
            text: `-${entry.damage}`,
            isCrit: entry.isCrit,
            elementalBonus: entry.elementalBonus,
            x: isPlayer ? 200 : 200,
            y: isPlayer ? 100 : 250
          });
        } else if (entry.type === 'miss') {
          addDamageNumber({
            text: '闪避',
            type: 'miss',
            x: 200,
            y: 150
          });
        } else if (entry.effect === 'heal') {
          addDamageNumber({
            text: `+${entry.value}`,
            type: 'heal',
            x: 200,
            y: 150
          });
        }

        await sleep(500 / speed.value);
      }
    };

    // 添加伤害数字
    const addDamageNumber = (dmg) => {
      damageNumbers.value.push(dmg);
      setTimeout(() => {
        damageNumbers.value.shift();
      }, 1500);
    };

    // 睡眠函数
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // 切换速度
    const toggleSpeed = () => {
      const speeds = [1, 2, 3];
      const currentIndex = speeds.indexOf(speed.value);
      speed.value = speeds[(currentIndex + 1) % speeds.length];
    };

    // 跳过战斗
    const skipBattle = async () => {
      battleState.value = 'loading';
      
      try {
        const response = await fetch('/api/battle/quick', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            player_id: props.player.id,
            enemy: props.enemy
          })
        });

        const result = await response.json();

        if (result.success) {
          rewards.value = result.rewards;
          battleState.value = 'ended';
        }
      } catch (error) {
        console.error('Skip battle error:', error);
        battleState.value = 'fighting';
      }
    };

    // 关闭战斗
    const closeBattle = () => {
      battleState.value = 'idle';
      if (cooldownInterval) {
        clearInterval(cooldownInterval);
        cooldownInterval = null;
      }
      emit('close');
    };

    // 继续
    const handleContinue = () => {
      emit('continue', rewards.value);
      emit('battle-end', { rewards: rewards.value, won: rewards.value?.exp > 0 });
      closeBattle();
    };

    // 监听自动开始
    watch(() => props.autoStart, (newVal) => {
      if (newVal && battleState.value === 'idle') {
        startBattle();
      }
    }, { immediate: true });

    // 滚动日志到底部
    watch(battleLog, async () => {
      await nextTick();
      if (logContent.value) {
        logContent.value.scrollTop = logContent.value.scrollHeight;
      }
    });

    return {
      battleState,
      battleLog,
      damageNumbers,
      lastAction,
      showLog,
      speed,
      speedLabel,
      rewards,
      enemyIcon,
      enemyTypeName,
      resultClass,
      resultIcon,
      resultText,
      logContent,
      elementName,
      getSkillIcon,
      skills,
      castSkill,
      toggleSpeed,
      skipBattle,
      closeBattle,
      handleContinue
    };
  }
};
</script>

<style scoped>
.battle-arena {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, #0a0a12 0%, #1a1a2e 100%);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  color: #e2e8f0;
  font-family: 'PingFang SC', sans-serif;
}

/* 头部 */
.battle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.battle-title {
  font-size: 18px;
  font-weight: 600;
}

.enemy-type {
  margin-left: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.enemy-type.elite { background: #8b5cf6; }
.enemy-type.boss { background: #ef4444; animation: pulse 1s infinite; }

.battle-controls {
  display: flex;
  gap: 8px;
}

.battle-controls button {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-speed { background: #6366f1; color: white; }
.btn-skip { background: #475569; color: white; }
.btn-close { 
  background: rgba(255, 255, 255, 0.1); 
  color: white;
  width: 32px;
  height: 32px;
  font-size: 20px;
}

/* 战斗舞台 */
.battle-stage {
  flex: 1;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 20px;
  position: relative;
}

.combatant {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  transition: transform 0.2s ease;
}

.combatant.attacking {
  animation: attack 0.3s ease;
}

.combatant.hurt {
  animation: hurt 0.3s ease;
}

@keyframes attack {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(30px); }
}

@keyframes hurt {
  0%, 100% { transform: translateX(0); opacity: 1; }
  25% { transform: translateX(-10px); opacity: 0.7; }
  75% { transform: translateX(10px); opacity: 0.7; }
}

.avatar-ring {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 3px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
}

.avatar-ring.player { border-color: #6366f1; }
.avatar-ring.enemy { border-color: #ef4444; }

.avatar-icon {
  font-size: 40px;
}

.combatant-name {
  font-size: 16px;
  font-weight: 600;
}

.combatant-level {
  font-size: 12px;
  color: #94a3b8;
}

/* HP/MP 条 */
.hp-bar, .mp-bar, .shield-bar {
  width: 200px;
  height: 16px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.hp-fill {
  height: 100%;
  background: linear-gradient(90deg, #22c55e, #4ade80);
  transition: width 0.3s ease;
}

.hp-fill.enemy {
  background: linear-gradient(90deg, #ef4444, #f87171);
}

.mp-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
  transition: width 0.3s ease;
}

.shield-fill {
  height: 100%;
  background: linear-gradient(90deg, #a855f7, #c084fc);
}

.hp-text, .mp-text, .shield-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 10px;
  font-weight: 600;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.boss-hp {
  height: 24px;
  width: 280px;
}

.vs-badge {
  font-size: 32px;
  font-weight: 900;
  color: #f59e0b;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

/* 元素标记 */
.element-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.element-tag.metal { background: #d4d4d4; color: #1a1a1a; }
.element-tag.wood { background: #22c55e; color: white; }
.element-tag.water { background: #3b82f6; color: white; }
.element-tag.fire { background: #ef4444; color: white; }
.element-tag.earth { background: #ca8a04; color: white; }

/* 伤害数字 */
.damage-numbers {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
}

.damage-number {
  position: absolute;
  font-size: 24px;
  font-weight: 900;
  animation: floatUp 1.5s ease-out forwards;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
}

.damage-number.crit {
  font-size: 32px;
  color: #fbbf24;
}

.damage-number.heal {
  color: #22c55e;
}

.damage-number.miss {
  color: #94a3b8;
  font-size: 18px;
}

.damage-number.elemental {
  color: #f97316;
}

@keyframes floatUp {
  0% { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-80px) scale(0.8); }
}

/* 战斗日志 */
.battle-log {
  height: 120px;
  background: rgba(0, 0, 0, 0.5);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  overflow-y: auto;
}

.log-content {
  padding: 8px 16px;
}

.log-entry {
  font-size: 12px;
  padding: 4px 0;
  color: #94a3b8;
}

.log-entry.crit {
  color: #fbbf24;
  font-weight: 600;
}

.log-entry.miss {
  color: #64748b;
  font-style: italic;
}

/* 战斗结果 */
.battle-result {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.result-overlay {
  background: rgba(0, 0, 0, 0.9);
  padding: 40px 60px;
  border-radius: 16px;
  text-align: center;
}

.result-icon {
  font-size: 80px;
  margin-bottom: 16px;
}

.result-text {
  font-size: 32px;
  font-weight: 900;
  margin-bottom: 24px;
}

.result-overlay.win .result-text { color: #fbbf24; }
.result-overlay.lose .result-text { color: #ef4444; }

.result-rewards {
  margin-bottom: 24px;
}

.reward-item {
  font-size: 16px;
  padding: 8px 0;
  color: #e2e8f0;
}

.btn-continue {
  padding: 12px 32px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

/* 加载状态 */
.battle-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  margin-top: 16px;
  font-size: 16px;
  color: #94a3b8;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* ==================== 技能栏 ==================== */
.skill-bar {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.4);
  border-top: 1px solid rgba(102, 126, 234, 0.3);
}

.skill-btn {
  position: relative;
  width: 64px;
  height: 72px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  background: rgba(255, 255, 255, 0.08);
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.skill-btn:hover:not(.on-cooldown) {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.skill-btn:active:not(.on-cooldown) {
  transform: translateY(-1px);
}

.skill-btn.on-cooldown {
  opacity: 0.6;
  cursor: not-allowed;
  filter: grayscale(0.5);
}

.skill-btn.skill-attack { border-color: rgba(239, 68, 68, 0.5); }
.skill-btn.skill-attack:hover:not(.on-cooldown) { border-color: rgba(239, 68, 68, 0.8); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4); }

.skill-btn.skill-heal { border-color: rgba(34, 197, 94, 0.5); }
.skill-btn.skill-heal:hover:not(.on-cooldown) { border-color: rgba(34, 197, 94, 0.8); box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4); }

.skill-btn.skill-buff { border-color: rgba(59, 130, 246, 0.5); }
.skill-btn.skill-buff:hover:not(.on-cooldown) { border-color: rgba(59, 130, 246, 0.8); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4); }

.skill-btn.skill-ultimate { border-color: rgba(234, 179, 8, 0.5); }
.skill-btn.skill-ultimate:hover:not(.on-cooldown) { border-color: rgba(234, 179, 8, 0.8); box-shadow: 0 4px 12px rgba(234, 179, 8, 0.4); }

.skill-icon {
  font-size: 24px;
  line-height: 1;
}

.skill-name {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.85);
  text-align: center;
  max-width: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 冷却遮罩 */
.skill-cooldown-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.cooldown-text {
  font-size: 14px;
  font-weight: 700;
  color: #fbbf24;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

/* 冷却进度环 */
.cooldown-ring {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  pointer-events: none;
}

.cooldown-bg {
  stroke: rgba(255, 255, 255, 0.1);
}

.cooldown-progress {
  stroke: #fbbf24;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.1s linear;
}

/* 战斗日志中技能条目 */
.log-entry.type-skill,
.log-entry.type-buff {
  color: #a78bfa;
  font-weight: 600;
}
</style>
