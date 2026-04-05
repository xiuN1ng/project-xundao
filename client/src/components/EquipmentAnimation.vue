<template>
  <Teleport to="body">
    <Transition name="equipment">
      <div v-if="show" class="equipment-overlay" @click="close">
        <div class="equipment-card" :class="rarityClass">
          <!-- 光效背景 -->
          <div class="glow-bg"></div>
          
          <!-- 标题 -->
          <div class="title">
            <span class="title-text">{{ title }}</span>
          </div>
          
          <!-- 装备展示 -->
          <div class="equipment-display">
            <div class="equipment-icon">{{ icon }}</div>
            <div class="equipment-name">{{ equipmentName }}</div>
            <div class="equipment-rarity">{{ rarityText }}</div>
          </div>
          
          <!-- 装备属性 -->
          <div v-if="attributes.length > 0" class="attributes">
            <div v-for="attr in attributes" :key="attr.name" class="attr-row">
              <span class="attr-name">{{ attr.name }}</span>
              <span class="attr-value">+{{ attr.value }}</span>
            </div>
          </div>
          
          <!-- 特效 -->
          <div class="effects">
            <div v-for="i in 12" :key="i" class="effect-particle"></div>
          </div>
          
          <!-- 提示 -->
          <div class="hint">点击任意位置继续</div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, watch, onMounted } from 'vue'

const props = defineProps({
  show: Boolean,
  equipment: Object,
  rarity: { type: String, default: 'common' }
})

const emit = defineEmits(['close'])

// 计算属性
const rarityClass = computed(() => `rarity-${props.rarity}`)

const icon = computed(() => {
  if (!props.equipment) return '📦'
  return props.equipment.icon || '⚔️'
})

const equipmentName = computed(() => {
  if (!props.equipment) return '未知装备'
  return props.equipment.name || '装备'
})

const rarityText = computed(() => {
  const rarityMap = {
    common: '普通',
    uncommon: '优秀',
    rare: '稀有',
    epic: '史诗',
    legendary: '传说',
    mythic: '神话'
  }
  return rarityMap[props.rarity] || '普通'
})

const title = computed(() => {
  const titleMap = {
    common: '获得新装备!',
    uncommon: '优秀装备!',
    rare: '稀有装备!',
    epic: '史诗装备!',
    legendary: '传说装备!',
    mythic: '神话装备!'
  }
  return titleMap[props.rarity] || '获得装备'
})

const attributes = computed(() => {
  if (!props.equipment || !props.equipment.attributes) return []
  return props.equipment.attributes
})

function close() {
  emit('close')
}

// 自动关闭
watch(() => props.show, (newVal) => {
  if (newVal) {
    setTimeout(() => {
      close()
    }, 4000)
  }
})
</script>

<style scoped>
.equipment-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  cursor: pointer;
}

.equipment-card {
  position: relative;
  padding: 40px 50px;
  background: linear-gradient(180deg, #1e1e2e 0%, #2d2d3d 100%);
  border-radius: 20px;
  text-align: center;
  min-width: 380px;
  overflow: hidden;
}

/* 稀有度样式 */
.rarity-common {
  border: 2px solid #94a3b8;
  box-shadow: 0 0 30px rgba(148, 163, 184, 0.3);
}

.rarity-uncommon {
  border: 2px solid #22c55e;
  box-shadow: 0 0 40px rgba(34, 197, 94, 0.4);
}

.rarity-rare {
  border: 2px solid #3b82f6;
  box-shadow: 0 0 50px rgba(59, 130, 246, 0.5);
}

.rarity-epic {
  border: 2px solid #a855f7;
  box-shadow: 0 0 60px rgba(168, 85, 247, 0.6);
}

.rarity-legendary {
  border: 2px solid #f59e0b;
  box-shadow: 0 0 80px rgba(245, 158, 11, 0.7);
  animation: legendaryGlow 1s ease-in-out infinite;
}

.rarity-mythic {
  border: 2px solid #ef4444;
  box-shadow: 0 0 100px rgba(239, 68, 68, 0.8);
  animation: mythicPulse 0.5s ease-in-out infinite;
}

@keyframes legendaryGlow {
  0%, 100% { box-shadow: 0 0 80px rgba(245, 158, 11, 0.7); }
  50% { box-shadow: 0 0 120px rgba(245, 158, 11, 0.9); }
}

@keyframes mythicPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

/* 光效背景 */
.glow-bg {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, 
    rgba(102, 126, 234, 0.2) 0%, 
    transparent 50%);
  animation: rotateBg 10s linear infinite;
}

@keyframes rotateBg {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 标题 */
.title {
  position: relative;
  z-index: 1;
  margin-bottom: 30px;
}

.title-text {
  font-size: 32px;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 0 20px currentColor;
}

.rarity-common .title-text { color: #94a3b8; }
.rarity-uncommon .title-text { color: #22c55e; }
.rarity-rare .title-text { color: #3b82f6; }
.rarity-epic .title-text { color: #a855f7; }
.rarity-legendary .title-text { color: #f59e0b; }
.rarity-mythic .title-text { color: #ef4444; }

/* 装备展示 */
.equipment-display {
  position: relative;
  z-index: 1;
  margin: 20px 0;
}

.equipment-icon {
  font-size: 80px;
  margin-bottom: 15px;
  animation: iconBounce 1s ease-in-out infinite;
}

@keyframes iconBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.equipment-name {
  font-size: 24px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 8px;
}

.equipment-rarity {
  font-size: 16px;
  padding: 5px 15px;
  border-radius: 15px;
  display: inline-block;
}

.rarity-common .equipment-rarity { background: rgba(148, 163, 184, 0.2); color: #94a3b8; }
.rarity-uncommon .equipment-rarity { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
.rarity-rare .equipment-rarity { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
.rarity-epic .equipment-rarity { background: rgba(168, 85, 247, 0.2); color: #a855f7; }
.rarity-legendary .equipment-rarity { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
.rarity-mythic .equipment-rarity { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

/* 属性 */
.attributes {
  position: relative;
  z-index: 1;
  margin: 20px 0;
  padding: 15px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
}

.attr-row {
  display: flex;
  justify-content: space-between;
  padding: 5px 10px;
  font-size: 16px;
}

.attr-name {
  color: #94a3b8;
}

.attr-value {
  color: #4ade80;
  font-weight: bold;
}

/* 特效粒子 */
.effects {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
}

.effect-particle {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  opacity: 0;
  animation: particleOut 1.5s ease-out infinite;
}

.rarity-common .effect-particle { background: #94a3b8; }
.rarity-uncommon .effect-particle { background: #22c55e; }
.rarity-rare .effect-particle { background: #3b82f6; }
.rarity-epic .effect-particle { background: #a855f7; }
.rarity-legendary .effect-particle { background: #f59e0b; }
.rarity-mythic .effect-particle { background: #ef4444; }

.effect-particle:nth-child(1) { animation-delay: 0s; }
.effect-particle:nth-child(2) { animation-delay: 0.1s; }
.effect-particle:nth-child(3) { animation-delay: 0.2s; }
.effect-particle:nth-child(4) { animation-delay: 0.3s; }
.effect-particle:nth-child(5) { animation-delay: 0.4s; }
.effect-particle:nth-child(6) { animation-delay: 0.5s; }
.effect-particle:nth-child(7) { animation-delay: 0.6s; }
.effect-particle:nth-child(8) { animation-delay: 0.7s; }
.effect-particle:nth-child(9) { animation-delay: 0.8s; }
.effect-particle:nth-child(10) { animation-delay: 0.9s; }
.effect-particle:nth-child(11) { animation-delay: 1s; }
.effect-particle:nth-child(12) { animation-delay: 1.1s; }

@keyframes particleOut {
  0% {
    transform: translate(-50%, -50%) rotate(0deg) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) rotate(var(--angle, 180deg)) scale(0);
    opacity: 0;
  }
}

.effect-particle:nth-child(1) { --angle: 0deg; }
.effect-particle:nth-child(2) { --angle: 30deg; }
.effect-particle:nth-child(3) { --angle: 60deg; }
.effect-particle:nth-child(4) { --angle: 90deg; }
.effect-particle:nth-child(5) { --angle: 120deg; }
.effect-particle:nth-child(6) { --angle: 150deg; }
.effect-particle:nth-child(7) { --angle: 180deg; }
.effect-particle:nth-child(8) { --angle: 210deg; }
.effect-particle:nth-child(9) { --angle: 240deg; }
.effect-particle:nth-child(10) { --angle: 270deg; }
.effect-particle:nth-child(11) { --angle: 300deg; }
.effect-particle:nth-child(12) { --angle: 330deg; }

/* 提示 */
.hint {
  position: relative;
  z-index: 1;
  margin-top: 20px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
}

/* 过渡动画 - 改进的滑入+闪光效果 */
.equipment-enter-active {
  animation: equipmentIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

.equipment-leave-active {
  animation: equipmentOut 0.4s ease-in forwards;
}

@keyframes equipmentIn {
  0% {
    opacity: 0;
    transform: scale(0.2) translateY(100px) rotate(-15deg);
  }
  50% {
    transform: scale(1.1) translateY(-20px) rotate(5deg);
  }
  70% {
    transform: scale(0.95) translateY(10px) rotate(-2deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0) rotate(0deg);
  }
}

@keyframes equipmentOut {
  0% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  100% {
    opacity: 0;
    transform: scale(0.5) translateY(-50px);
  }
}

/* 装备滑入闪光效果 */
.equipment-card::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 100%
  );
  animation: equipmentGlowSlide 0.8s ease-out forwards;
  animation-delay: 0.3s;
  pointer-events: none;
  z-index: 2;
}

@keyframes equipmentGlowSlide {
  0% { left: -100%; }
  100% { left: 200%; }
}

/* 装备图标弹入动画 */
.equipment-icon {
  font-size: 80px;
  margin-bottom: 15px;
  animation: equipmentIconBounce 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  will-change: transform, opacity;
}

@keyframes equipmentIconBounce {
  0% {
    transform: scale(0) rotate(-180deg);
    opacity: 0;
  }
  50% {
    transform: scale(1.3) rotate(20deg);
    opacity: 1;
  }
  70% {
    transform: scale(0.85) rotate(-10deg);
  }
  85% {
    transform: scale(1.1) rotate(5deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
}

/* 装备名称文字闪烁出现 */
.equipment-name {
  font-size: 24px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 8px;
  animation: equipmentNameAppear 0.5s ease-out forwards;
  animation-delay: 0.4s;
  opacity: 0;
  will-change: transform, opacity;
}

@keyframes equipmentNameAppear {
  0% {
    opacity: 0;
    transform: translateY(20px);
    filter: blur(5px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}

/* 属性依次显示动画 */
.attr-row {
  display: flex;
  justify-content: space-between;
  padding: 5px 10px;
  font-size: 16px;
  opacity: 0;
  animation: equipmentAttrShow 0.4s ease-out forwards;
  will-change: transform, opacity;
}

.attr-row:nth-child(1) { animation-delay: 0.5s; }
.attr-row:nth-child(2) { animation-delay: 0.6s; }
.attr-row:nth-child(3) { animation-delay: 0.7s; }
.attr-row:nth-child(4) { animation-delay: 0.8s; }
.attr-row:nth-child(5) { animation-delay: 0.9s; }

@keyframes equipmentAttrShow {
  0% {
    opacity: 0;
    transform: translateX(-20px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
