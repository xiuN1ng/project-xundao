<template>
  <div class="realm-panel" :class="{ active: isVisible }">
    <!-- 境界粒子特效 -->
    <div class="realm-particles">
      <span v-for="n in 20" :key="n" class="particle" :style="{ '--i': n, '--delay': n * 0.2 + 's' }">✨</span>
    </div>
    
    <!-- 境界压制提示 -->
    <div v-if="showSuppression" class="suppression-notification" :class="{ suppressed: isSuppressed }">
      <div class="notification-icon">{{ isSuppressed ? '⚠️' : '⚡' }}</div>
      <div class="notification-text">
        {{ isSuppressed ? '你被压制了!' : '境界压制生效!' }}
      </div>
      <div v-if="suppressionBonus > 0" class="notification-bonus">
        压制加成: +{{ suppressionBonus }}%
      </div>
    </div>
    
    <!-- 跨境界战斗提示 -->
    <div v-if="showCrossRealmAlert" class="cross-realm-alert" :class="crossRealmType">
      <div class="alert-icon">{{ crossRealmType === 'advantage' ? '🎉' : '💀' }}</div>
      <div class="alert-text">{{ crossRealmMessage }}</div>
      <div class="alert-bonus" v-if="crossRealmBonus > 0">
        {{ crossRealmType === 'advantage' ? '+' : '-' }}{{ crossRealmBonus }}%
      </div>
    </div>
    
    <!-- 境界压制特效 -->
    <div class="suppression-effect-container">
      <div 
        v-for="effect in suppressionEffects" 
        :key="effect.id"
        class="suppression-effect"
        :class="effect.type"
      >
        <div class="effect-aura"></div>
        <div class="effect-lightning">
          <span v-for="n in 5" :key="n" class="lightning-bolt" :style="{ '--i': n }">⚡</span>
        </div>
      </div>
    </div>
    
    <!-- 境界详情面板 -->
    <div v-if="showDetails" class="realm-details">
      <div class="panel-header">
        <h2>⚡ 境界压制</h2>
        <button class="close-btn" @click="closePanel">×</button>
      </div>
      
      <div class="panel-content">
        <!-- 当前境界 - 优化版本 -->
        <div class="current-realm enhanced">
          <div class="realm-badge animated">
            <span class="realm-icon">{{ currentRealm.icon }}</span>
            <div class="badge-glow"></div>
          </div>
          <div class="realm-info">
            <span class="realm-name">{{ currentRealm.name }}</span>
            <span class="realm-level">第 {{ currentRealm.level }} 重</span>
          </div>
          <div class="realm-power">
            <span class="power-value">{{ formatNumber(realmPower) }}</span>
            <span class="power-label">境界战力</span>
          </div>
          <!-- 境界属性摘要 -->
          <div class="realm-attributes">
            <div class="attr-item" v-for="attr in realmAttributes" :key="attr.key">
              <span class="attr-icon">{{ attr.icon }}</span>
              <span class="attr-value" :class="attr.type">+{{ attr.value }}%</span>
            </div>
          </div>
        </div>
        
        <!-- 境界进度 -->
        <div class="realm-progress-section">
          <div class="progress-header">
            <span>境界经验</span>
            <span class="progress-values">{{ realmExp }} / {{ expToNext }}</span>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar">
              <div class="progress-fill animated" :style="{ width: realmProgressPct + '%' }"></div>
            </div>
            <span class="progress-pct">{{ realmProgressPct }}%</span>
          </div>
        </div>
        
        <!-- 压制效果 -->
        <div class="suppression-section">
          <h3>🔥 境界压制</h3>
          <div class="suppression-info">
            <div class="suppression-item">
              <span class="label">压制等级:</span>
              <span class="value">{{ suppressionLevel }} 级</span>
            </div>
            <div class="suppression-item">
              <span class="label">攻击力加成:</span>
              <span class="value attack">+{{ attackBonus }}%</span>
            </div>
            <div class="suppression-item">
              <span class="label">防御力加成:</span>
              <span class="value defense">+{{ defenseBonus }}%</span>
            </div>
            <div class="suppression-item">
              <span class="label">暴击加成:</span>
              <span class="value critical">+{{ critBonus }}%</span>
            </div>
          </div>
          
          <!-- 压制特效 -->
          <div class="suppression-effect-display">
            <div 
              v-for="target in nearbyPlayers" 
              :key="target.id"
              class="target-item"
              :class="{ suppressed: target.suppressed }"
            >
              <span class="target-name">{{ target.name }}</span>
              <span class="target-realm">{{ target.realm }}</span>
              <div v-if="target.suppressed" class="suppress-indicator">
                <span class="suppress-icon">⚡</span>
                <span class="suppress-dmg">-{{ target.damageReduction }}%</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 越级战斗加成 -->
        <div class="cross-realm-section">
          <h3>⚔️ 越级战斗</h3>
          <div class="cross-realm-bonus">
            <div 
              v-for="level in crossRealmLevels" 
              :key="level.diff"
              class="bonus-item"
              :class="{ active: currentLevelDiff >= level.diff }"
            >
              <span class="level-diff">{{ level.diff > 0 ? '+' : '' }}{{ level.diff }}级</span>
              <span class="bonus-value">{{ level.bonus }}%</span>
            </div>
          </div>
        </div>
        
        <!-- 被压制提示 -->
        <div v-if="isSuppressed" class="suppressed-warning">
          <span class="warning-icon">⚠️</span>
          <span class="warning-text">你正处于{{ suppressorName }}的境界压制中！</span>
          <div class="debuff-list">
            <div v-for="debuff in debuffs" :key="debuff.id" class="debuff-item">
              <span class="debuff-icon">{{ debuff.icon }}</span>
              <span class="debuff-name">{{ debuff.name }}</span>
              <span class="debuff-value">-{{ debuff.value }}</span>
            </div>
          </div>
        </div>
        
        <!-- 突破境界 -->
        <div class="breakthrough-section">
          <h3>🚀 境界突破</h3>
          <div class="breakthrough-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: breakthroughProgress + '%' }"></div>
            </div>
            <span class="progress-text">{{ breakthroughProgress }}%</span>
          </div>
          
          <button 
            class="breakthrough-btn"
            :disabled="breakthroughProgress < 100"
            @click="breakthrough"
          >
            <span class="btn-icon">🌟</span>
            <span class="btn-text">突破境界</span>
          </button>
          
          <!-- 突破特效 -->
          <div v-if="showBreakthroughEffect" class="breakthrough-effect">
            <div class="light-rays"></div>
            <div class="breakthrough-text">突破成功！</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'RealmPanel',
  data() {
    return {
      isVisible: false,
      showDetails: true,
      showSuppression: false,
      showCrossRealmAlert: false,
      isSuppressed: false,
      suppressionBonus: 0,
      crossRealmType: '',
      crossRealmMessage: '',
      crossRealmBonus: 0,
      realmPower: 50000,
      realmExp: 25000,
      expToNext: 50000,
      currentRealm: {
        icon: '☯️',
        name: '金丹期',
        level: 5,
      },
      suppressionLevel: 2,
      attackBonus: 15,
      defenseBonus: 10,
      critBonus: 8,
      suppressorName: '',
      suppressionEffects: [],
      // 境界属性摘要
      realmAttributes: [
        { key: 'attack', icon: '⚔️', value: 15, type: 'attack' },
        { key: 'defense', icon: '🛡️', value: 10, type: 'defense' },
        { key: 'hp', icon: '❤️', value: 20, type: 'hp' },
        { key: 'crit', icon: '💥', value: 8, type: 'critical' },
        { key: 'spirit', icon: '💎', value: 25, type: 'spirit' },
      ],
      nearbyPlayers: [
        { id: 1, name: '玩家A', realm: '金丹期', suppressed: true, damageReduction: 20 },
        { id: 2, name: '玩家B', realm: '元婴期', suppressed: false, damageReduction: 0 },
        { id: 3, name: '玩家C', realm: '筑基期', suppressed: true, damageReduction: 30 },
      ],
      crossRealmLevels: [
        { diff: -2, bonus: -20 },
        { diff: -1, bonus: -10 },
        { diff: 0, bonus: 0 },
        { diff: 1, bonus: 10 },
        { diff: 2, bonus: 20 },
        { diff: 3, bonus: 30 },
      ],
      currentLevelDiff: 0,
      debuffs: [
        { id: 1, name: '攻击力下降', icon: '⚔️', value: '15%' },
        { id: 2, name: '防御力下降', icon: '🛡️', value: '10%' },
      ],
      breakthroughProgress: 75,
      showBreakthroughEffect: false,
      effectId: 0,
    };
  },
  computed: {
    // 境界进度百分比
    realmProgressPct() {
      if (this.expToNext <= 0) return 100;
      return Math.min(100, Math.floor((this.realmExp / this.expToNext) * 100));
    },
  },
  methods: {
    // 格式化数字
    formatNumber(num) {
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
      if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
      return num.toString();
    },
    
    // 显示面板
    openPanel() {
      this.isVisible = true;
      this.showDetails = true;
    },
    
    closePanel() {
      this.showDetails = false;
      this.isVisible = false;
      this.$emit('close');
    },
    
    // 触发境界压制
    triggerSuppression(data) {
      const { targetLevel, isSuppressing = true } = data;
      
      this.showSuppression = true;
      this.isSuppressed = !isSuppressing;
      
      if (isSuppressing) {
        this.suppressionBonus = Math.min(50, (this.currentRealm.level - targetLevel) * 10);
        
        // 添加压制特效
        const effect = {
          id: ++this.effectId,
          type: 'suppress'
        };
        this.suppressionEffects.push(effect);
        
        setTimeout(() => {
          this.suppressionEffects = this.suppressionEffects.filter(e => e.id !== effect.id);
        }, 1000);
      } else {
        this.suppressionBonus = 0;
      }
      
      setTimeout(() => {
        this.showSuppression = false;
      }, 2000);
    },
    
    // 跨境界战斗提示
    showCrossRealmBattle(enemyLevel) {
      const diff = this.currentRealm.level - enemyLevel;
      this.currentLevelDiff = diff;
      
      if (diff > 0) {
        this.crossRealmType = 'advantage';
        this.crossRealmMessage = `越${diff}级战斗，伤害加成！`;
        this.crossRealmBonus = Math.min(50, diff * 10);
      } else if (diff < 0) {
        this.crossRealmType = 'disadvantage';
        this.crossRealmMessage = `被越${Math.abs(diff)}级战斗，伤害减少！`;
        this.crossRealmBonus = Math.min(30, Math.abs(diff) * 10);
      } else {
        this.crossRealmType = 'equal';
        this.crossRealmMessage = '同级战斗';
        this.crossRealmBonus = 0;
      }
      
      this.showCrossRealmAlert = true;
      
      setTimeout(() => {
        this.showCrossRealmAlert = false;
      }, 3000);
    },
    
    breakthrough() {
      if (this.breakthroughProgress < 100) return;
      
      this.showBreakthroughEffect = true;
      
      // 突破成功
      setTimeout(() => {
        this.currentRealm.level++;
        this.realmPower += 10000;
        this.breakthroughProgress = 0;
        this.updateRealmBonus();
        this.showBreakthroughEffect = false;
      }, 2000);
    },
    
    updateRealmBonus() {
      // 更新境界加成
      this.attackBonus = 10 + this.currentRealm.level * 2;
      this.defenseBonus = 8 + this.currentRealm.level * 2;
      this.critBonus = 5 + this.currentRealm.level;
    },
    
    // 更新玩家境界信息
    updateRealm(realmInfo) {
      Object.assign(this.currentRealm, realmInfo);
      this.realmPower = realmInfo.power || this.realmPower;
      this.updateRealmBonus();
    },
    
    // 更新附近玩家
    updateNearbyPlayers(players) {
      this.nearbyPlayers = players;
    }
  },
};
</script>

<style scoped>
.realm-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 500px;
  max-height: 80vh;
  background: linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%);
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  color: white;
  z-index: 1000;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.panel-content {
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
}

.current-realm {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 15px;
  margin-bottom: 20px;
}

/* 增强的当前境界样式 */
.current-realm.enhanced {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 15px;
}

.realm-badge.animated {
  position: relative;
  animation: badgePulse 2s ease-in-out infinite;
}

@keyframes badgePulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(255, 215, 0, 0.5); }
  50% { transform: scale(1.05); box-shadow: 0 0 40px rgba(255, 215, 0, 0.8); }
}

.badge-glow {
  position: absolute;
  top: -5px;
  left: -5px;
  right: -5px;
  bottom: -5px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.3) 0%, transparent 70%);
  animation: glowPulse 1.5s ease-in-out infinite;
}

@keyframes glowPulse {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.2); }
}

/* 境界属性摘要 */
.realm-attributes {
  width: 100%;
  display: flex;
  justify-content: space-around;
  padding: 10px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  margin-top: 10px;
}

.attr-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
}

.attr-icon {
  font-size: 14px;
}

.attr-value {
  font-weight: bold;
  font-size: 12px;
}

.attr-value.attack { color: #e74c3c; }
.attr-value.defense { color: #3498db; }
.attr-value.hp { color: #2ecc71; }
.attr-value.critical { color: #f39c12; }
.attr-value.spirit { color: #9b59b6; }

/* 境界进度区块 */
.realm-progress-section {
  margin-bottom: 20px;
  padding: 15px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 14px;
}

.progress-values {
  color: #f39c12;
  font-weight: bold;
}

.progress-bar-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-bar-container .progress-bar {
  flex: 1;
  height: 12px;
}

.progress-pct {
  font-size: 12px;
  color: #f39c12;
  font-weight: bold;
  min-width: 40px;
}

.progress-fill.animated {
  animation: progressShine 2s ease-in-out infinite;
}

@keyframes progressShine {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.3); }
}

/* 粒子特效 */
.realm-particles {
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
  font-size: 10px;
  animation: floatParticle 3s ease-in-out infinite;
  animation-delay: var(--delay);
  opacity: 0.6;
}

.particle:nth-child(odd) {
  left: calc(var(--i) * 5%);
  top: calc(var(--i) * 3%);
}

.particle:nth-child(even) {
  right: calc(var(--i) * 5%);
  bottom: calc(var(--i) * 3%);
}

@keyframes floatParticle {
  0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.6; }
  50% { transform: translateY(-20px) rotate(180deg); opacity: 1; }
}

.realm-badge {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #ffd700, #ffaa00);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
}

.realm-info {
  display: flex;
  flex-direction: column;
}

.realm-name {
  font-size: 24px;
  font-weight: bold;
}

.realm-level {
  font-size: 16px;
  opacity: 0.8;
}

.suppression-section, .cross-realm-section, .breakthrough-section {
  margin-bottom: 20px;
}

h3 {
  margin-bottom: 15px;
  font-size: 18px;
}

.suppression-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 15px;
}

.suppression-item {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

.value {
  color: #f39c12;
  font-weight: bold;
}

.target-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  margin-bottom: 10px;
  transition: all 0.3s ease;
}

.target-item.suppressed {
  background: rgba(231, 76, 60, 0.3);
  border: 1px solid rgba(231, 76, 60, 0.5);
}

.suppress-indicator {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 5px;
  color: #e74c3c;
  font-weight: bold;
}

.cross-realm-bonus {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.bonus-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

.bonus-item.active {
  background: rgba(46, 204, 113, 0.3);
  border: 1px solid rgba(46, 204, 113, 0.5);
}

.level-diff {
  font-size: 14px;
}

.bonus-value {
  color: #f39c12;
  font-weight: bold;
}

.suppressed-warning {
  padding: 15px;
  background: rgba(231, 76, 60, 0.3);
  border: 1px solid rgba(231, 76, 60, 0.5);
  border-radius: 10px;
  margin-bottom: 20px;
}

.warning-icon {
  font-size: 24px;
}

.warning-text {
  display: block;
  margin: 10px 0;
}

.debuff-list {
  display: flex;
  gap: 10px;
}

.debuff-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 5px;
}

.debuff-value {
  color: #e74c3c;
}

.breakthrough-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}

.progress-bar {
  flex: 1;
  height: 20px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #f39c12, #e74c3c);
  transition: width 0.3s ease;
}

.breakthrough-btn {
  width: 100%;
  padding: 15px;
  border: none;
  border-radius: 15px;
  cursor: pointer;
  font-size: 18px;
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.3s ease;
}

.breakthrough-btn:disabled {
  background: rgba(255, 255, 255, 0.2);
  cursor: not-allowed;
}

.breakthrough-btn:not(:disabled):hover {
  transform: scale(1.02);
  box-shadow: 0 5px 20px rgba(231, 76, 60, 0.5);
}

.breakthrough-effect {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
}

.light-rays {
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.8) 0%, transparent 70%);
  animation: raysAnim 2s ease-in-out infinite;
}

@keyframes raysAnim {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.5); opacity: 0.5; }
}

.breakthrough-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 32px;
  font-weight: bold;
  color: #ffd700;
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
  animation: textPop 2s ease-out;
}

@keyframes textPop {
  0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
  50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
}
</style>
