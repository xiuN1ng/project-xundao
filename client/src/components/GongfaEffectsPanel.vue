<template>
  <div class="gongfa-effects-panel">
    <h2>📚 功法特效</h2>
    
    <!-- 已装备功法 -->
    <div class="equipped-section">
      <h3>⚔️ 已装备功法</h3>
      <div class="gongfa-list">
        <div 
          v-for="gongfa in equippedGongfa" 
          :key="gongfa.id"
          class="gongfa-card"
          :class="{ active: selectedGongfa === gongfa.id }"
          @click="selectGongfa(gongfa)"
        >
          <div class="gongfa-icon">{{ gongfa.icon || '📜' }}</div>
          <div class="gongfa-info">
            <div class="gongfa-name">{{ gongfa.name }}</div>
            <div class="gongfa-level">Lv.{{ gongfa.level }}</div>
          </div>
          <div class="gongfa-effect-count">
            <span class="effect-badge">{{ Object.keys(gongfa.effects || {}).length }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 特效详情 -->
    <div v-if="selectedGongfaData" class="effects-detail">
      <h3>✨ {{ selectedGongfaData.name }} 特效</h3>
      
      <div class="effect-list">
        <div 
          v-for="(effect, key) in selectedGongfaData.effects" 
          :key="key"
          class="effect-card"
        >
          <div class="effect-icon">{{ getEffectIcon(key) }}</div>
          <div class="effect-info">
            <div class="effect-name">{{ getEffectName(key) }}</div>
            <div class="effect-desc">{{ getEffectDesc(key, effect) }}</div>
            <div class="effect-value" :class="getEffectClass(key)">
              +{{ formatValue(effect) }}
            </div>
          </div>
          <div class="effect-particles">
            <span v-for="i in 3" :key="i" class="particle">✨</span>
          </div>
        </div>
      </div>
      
      <!-- 总属性加成 -->
      <div class="total-bonus">
        <h4>📊 当前总加成</h4>
        <div class="bonus-grid">
          <div v-for="(value, attr) in totalBonus" :key="attr" class="bonus-item">
            <span class="bonus-icon">{{ getAttrIcon(attr) }}</span>
            <span class="bonus-name">{{ getAttrName(attr) }}</span>
            <span class="bonus-value" :class="value > 0 ? 'positive' : ''">
              {{ value > 0 ? '+' : '' }}{{ value }}
            </span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 无功法提示 -->
    <div v-if="equippedGongfa.length === 0" class="empty-state">
      <span class="empty-icon">📜</span>
      <p>暂无装备功法</p>
      <p class="hint">装备功法后可查看特效</p>
    </div>
    
    <!-- 特效动画层 -->
    <div v-if="showEffect" class="effect-overlay">
      <div class="effect-container">
        <span v-for="i in 20" :key="i" class="effect-particle" :style="getParticleStyle(i)">
          {{ getParticleEmoji() }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePlayerStore } from '../stores/player'

const playerStore = usePlayerStore()
const player = playerStore.player

const equippedGongfa = ref([])
const selectedGongfa = ref(null)
const showEffect = ref(false)

// 特效类型配置
const EFFECT_CONFIG = {
  attack: { icon: '⚔️', name: '攻击力', desc: '提升物理攻击力', class: 'attack' },
  defense: { icon: '🛡️', name: '防御力', desc: '提升物理防御力', class: 'defense' },
  hp: { icon: '❤️', name: '生命值', desc: '提升最大生命值', class: 'hp' },
  crit: { icon: '💥', name: '暴击率', desc: '暴击概率', class: 'crit' },
  crit_damage: { icon: '💢', name: '暴击伤害', desc: '暴击时伤害加成', class: 'crit-damage' },
  speed: { icon: '⚡', name: '速度', desc: '战斗速度', class: 'speed' },
  dodge: { icon: '💨', name: '闪避', desc: '闪避概率', class: 'dodge' },
  lifesteal: { icon: '🩸', name: '生命偷取', desc: '攻击时恢复生命', class: 'lifesteal' },
  cultivation_speed: { icon: '🧘', name: '修炼速度', desc: '灵气获取速度', class: 'cultivation' },
  realm_cultivation: { icon: '🌟', name: '境界修炼', desc: '境界经验加成', class: 'realm' },
  exp_bonus: { icon: '📈', name: '经验加成', desc: '获取经验提升', class: 'exp' },
  drop_bonus: { icon: '🎁', name: '掉落加成', desc: '掉落概率提升', class: 'drop' },
  metal_bonus: { icon: '💎', name: '灵石加成', desc: '灵石获取提升', class: 'metal' },
  vip_bonus: { icon: '👑', name: 'VIP加成', desc: 'VIP专属加成', class: 'vip' }
}

// 属性图标映射
const ATTR_ICONS = {
  attack: '⚔️',
  defense: '🛡️',
  hp: '❤️',
  crit: '💥',
  crit_damage: '💢',
  speed: '⚡',
  dodge: '💨',
  lifesteal: '🩸',
  cultivation_speed: '🧘',
  realm_cultivation: '🌟',
  exp_bonus: '📈',
  drop_bonus: '🎁',
  metal_bonus: '💎'
}

// 属性名称映射
const ATTR_NAMES = {
  attack: '攻击力',
  defense: '防御力',
  hp: '生命',
  crit: '暴击率',
  crit_damage: '暴击伤害',
  speed: '速度',
  dodge: '闪避',
  lifesteal: '生命偷取',
  cultivation_speed: '修炼速度',
  realm_cultivation: '境界修炼',
  exp_bonus: '经验加成',
  drop_bonus: '掉落加成',
  metal_bonus: '灵石加成'
}

// 获取装备的功法
async function loadEquippedGongfa() {
  try {
    const res = await fetch(`/api/gongfa/status?player_id=${player.id}`)
    const data = await res.json()
    if (data.success && data.data) {
      equippedGongfa.value = data.data.equipped || []
      if (equippedGongfa.value.length > 0 && !selectedGongfa.value) {
        selectedGongfa.value = equippedGongfa.value[0].id
      }
    }
  } catch (e) {
    console.error('加载功法失败:', e)
    // 使用模拟数据
    equippedGongfa.value = [
      { id: 1, name: '基础练气诀', level: 5, icon: '📜', effects: { attack: 50, hp: 200, cultivation_speed: 20 } },
      { id: 2, name: '玄天真经', level: 3, icon: '📕', effects: { defense: 30, crit: 5, speed: 10 } }
    ]
    selectedGongfa.value = 1
  }
}

// 选择功法查看特效
function selectGongfa(gongfa) {
  selectedGongfa.value = gongfa.id
  showEffect.value = true
  setTimeout(() => {
    showEffect.value = false
  }, 1500)
}

// 获取选中的功法数据
const selectedGongfaData = computed(() => {
  if (!selectedGongfa.value) return null
  return equippedGongfa.value.find(g => g.id === selectedGongfa.value)
})

// 计算总属性加成
const totalBonus = computed(() => {
  const totals = {}
  equippedGongfa.value.forEach(gongfa => {
    if (gongfa.effects) {
      Object.entries(gongfa.effects).forEach(([key, value]) => {
        totals[key] = (totals[key] || 0) + value
      })
    }
  })
  return totals
})

// 获取特效图标
function getEffectIcon(key) {
  return EFFECT_CONFIG[key]?.icon || '✨'
}

// 获取特效名称
function getEffectName(key) {
  return EFFECT_CONFIG[key]?.name || key
}

// 获取特效描述
function getEffectDesc(key, effect) {
  return EFFECT_CONFIG[key]?.desc || ''
}

// 获取特效样式类
function getEffectClass(key) {
  return EFFECT_CONFIG[key]?.class || ''
}

// 格式化数值
function formatValue(value) {
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'k'
  }
  return value
}

// 获取属性图标
function getAttrIcon(attr) {
  return ATTR_ICONS[attr] || '📊'
}

// 获取属性名称
function getAttrName(attr) {
  return ATTR_NAMES[attr] || attr
}

// 获取粒子样式
function getParticleStyle(index) {
  const angle = (index / 20) * 360
  const distance = 50 + Math.random() * 50
  return {
    '--angle': `${angle}deg`,
    '--distance': `${distance}px`,
    '--delay': `${index * 0.05}s`
  }
}

// 获取粒子emoji
function getParticleEmoji() {
  const emojis = ['✨', '⭐', '💫', '🌟']
  return emojis[Math.floor(Math.random() * emojis.length)]
}

onMounted(() => {
  loadEquippedGongfa()
})
</script>

<style scoped>
.gongfa-effects-panel {
  padding: 20px;
  background: #1a1a2e;
  background-image: url('@/assets/images/bg-debate.png');
  background-size: cover;
  background-position: center;
  border-radius: 12px;
  min-height: 500px;
  position: relative;
}
.gongfa-effects-panel::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(26, 26, 46, 0.82);
  pointer-events: none;
  border-radius: 12px;
}

.gongfa-effects-panel h2 {
  color: #f093fb;
  font-size: 24px;
  margin-bottom: 20px;
}

.gongfa-effects-panel h3 {
  color: #667eea;
  font-size: 16px;
  margin-bottom: 15px;
}

.gongfa-effects-panel h4 {
  color: #fbbf24;
  font-size: 14px;
  margin-bottom: 12px;
}

/* 已装备功法 */
.equipped-section {
  margin-bottom: 25px;
}

.gongfa-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.gongfa-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid transparent;
}

.gongfa-card:hover {
  background: rgba(102, 126, 234, 0.15);
}

.gongfa-card.active {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.2);
}

.gongfa-icon {
  font-size: 36px;
}

.gongfa-info {
  flex: 1;
}

.gongfa-name {
  color: #fff;
  font-weight: bold;
  font-size: 16px;
}

.gongfa-level {
  color: #f093fb;
  font-size: 12px;
}

.effect-badge {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
}

/* 特效详情 */
.effects-detail {
  margin-top: 25px;
}

.effect-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 25px;
}

.effect-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  position: relative;
  overflow: hidden;
}

.effect-icon {
  font-size: 32px;
  z-index: 1;
}

.effect-info {
  flex: 1;
  z-index: 1;
}

.effect-name {
  color: #fff;
  font-weight: bold;
  font-size: 15px;
}

.effect-desc {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  margin: 4px 0;
}

.effect-value {
  font-size: 18px;
  font-weight: bold;
}

.effect-value.attack { color: #ef4444; }
.effect-value.defense { color: #3b82f6; }
.effect-value.hp { color: #22c55e; }
.effect-value.crit { color: #f59e0b; }
.effect-value.crit-damage { color: #a855f7; }
.effect-value.speed { color: #06b6d4; }

.effect-particles {
  position: absolute;
  right: 20px;
  opacity: 0.3;
}

.particle {
  font-size: 12px;
  animation: particleFloat 2s ease-in-out infinite;
}

.particle:nth-child(1) { animation-delay: 0s; }
.particle:nth-child(2) { animation-delay: 0.3s; }
.particle:nth-child(3) { animation-delay: 0.6s; }

@keyframes particleFloat {
  0%, 100% { transform: translateY(0); opacity: 0.3; }
  50% { transform: translateY(-5px); opacity: 0.6; }
}

/* 总加成 */
.total-bonus {
  background: rgba(0, 0, 0, 0.3);
  padding: 20px;
  border-radius: 12px;
  border: 1px solid rgba(251, 191, 36, 0.3);
}

.bonus-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.bonus-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.bonus-icon {
  font-size: 24px;
}

.bonus-name {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
}

.bonus-value {
  color: #94a3b8;
  font-weight: bold;
}

.bonus-value.positive {
  color: #4ade80;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 64px;
  opacity: 0.5;
}

.empty-state p {
  color: rgba(255, 255, 255, 0.6);
  margin: 10px 0;
}

.empty-state .hint {
  font-size: 12px;
  opacity: 0.5;
}

/* 特效动画 */
.effect-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 100;
}

.effect-container {
  position: absolute;
  top: 50%;
  left: 50%;
}

.effect-particle {
  position: absolute;
  font-size: 20px;
  animation: particleBurst 1.5s ease-out forwards;
  animation-delay: var(--delay);
}

@keyframes particleBurst {
  0% {
    transform: translate(-50%, -50%) rotate(var(--angle)) translateY(0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) rotate(var(--angle)) translateY(var(--distance)) scale(0);
    opacity: 0;
  }
}
</style>
