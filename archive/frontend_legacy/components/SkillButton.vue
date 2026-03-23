<template>
  <div 
    class="skill-button" 
    :class="{ 
      'cooldown': isCooldown, 
      'ready': !isCooldown && !isCasting,
      'casting': isCasting,
      'disabled': disabled
    }"
    :style="{ '--cooldown-progress': cooldownProgress }"
    @click="handleClick"
  >
    <!-- 技能图标 -->
    <div class="skill-icon">
      <span class="skill-icon-emoji">{{ skill.icon || '⚡' }}</span>
    </div>
    
    <!-- 技能名称 -->
    <div class="skill-name">{{ skill.name }}</div>
    
    <!-- 冷却遮罩 -->
    <div class="cooldown-overlay" v-if="isCooldown">
      <svg class="cooldown-circle" viewBox="0 0 100 100">
        <circle 
          class="cooldown-circle-bg" 
          cx="50" cy="50" r="45"
        />
        <circle 
          class="cooldown-circle-progress" 
          cx="50" cy="50" r="45"
          :style="{ 
            'stroke-dashoffset': cooldownProgress * 283 / 100,
            'stroke-dasharray': '283'
          }"
        />
      </svg>
      <span class="cooldown-text">{{ Math.ceil(cooldownTime) }}s</span>
    </div>
    
    <!-- 释放动画 -->
    <div class="cast-effect" v-if="isCasting">
      <div class="cast-ripple"></div>
      <div class="cast-ripple delay-1"></div>
      <div class="cast-ripple delay-2"></div>
    </div>
    
    <!-- 快捷键提示 -->
    <span class="hotkey-hint" v-if="skill.hotkey">{{ skill.hotkey }}</span>
    
    <!-- 准备就绪光效 -->
    <div class="ready-glow" v-if="!isCooldown && !isCasting && !disabled"></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  skill: {
    type: Object,
    required: true,
    default: () => ({
      id: '',
      name: '技能',
      icon: '⚡',
      cooldown: 0,
      hotkey: '',
      mpCost: 0,
      description: ''
    })
  },
  disabled: {
    type: Boolean,
    default: false
  },
  currentMp: {
    type: Number,
    default: 100
  }
})

const emit = defineEmits(['cast', 'cooldown-start', 'cooldown-end'])

const isCooldown = ref(false)
const isCasting = ref(false)
const cooldownTime = ref(0)
const cooldownProgress = ref(0)

let cooldownTimer = null
let progressTimer = null

const castSkill = () => {
  if (isCooldown.value || isCasting.value || props.disabled) return
  
  // 检查MP是否足够
  if (props.skill.mpCost && props.currentMp < props.skill.mpCost) {
    return { success: false, reason: '灵气不足' }
  }
  
  // 触发释放
  isCasting.value = true
  emit('cast', props.skill)
  
  // 释放动画时长
  setTimeout(() => {
    isCasting.value = false
  }, 500)
  
  // 开始冷却
  if (props.skill.cooldown > 0) {
    startCooldown()
  }
  
  return { success: true }
}

const startCooldown = () => {
  isCooldown.value = true
  cooldownTime.value = props.skill.cooldown
  cooldownProgress.value = 100
  emit('cooldown-start', props.skill)
  
  const interval = 100 // 每100ms更新一次
  const totalTime = props.skill.cooldown * 1000
  
  cooldownTimer = setInterval(() => {
    cooldownTime.value -= interval / 1000
    cooldownProgress.value = (cooldownTime.value / props.skill.cooldown) * 100
    
    if (cooldownTime.value <= 0) {
      clearInterval(cooldownTimer)
      clearInterval(progressTimer)
      isCooldown.value = false
      cooldownTime.value = 0
      cooldownProgress.value = 0
      emit('cooldown-end', props.skill)
    }
  }, interval)
}

const handleClick = () => {
  castSkill()
}

// 键盘快捷键监听
const handleKeydown = (e) => {
  if (props.skill.hotkey && e.key.toLowerCase() === props.skill.hotkey.toLowerCase()) {
    handleClick()
  }
}

onMounted(() => {
  if (props.skill.hotkey) {
    window.addEventListener('keydown', handleKeydown)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (cooldownTimer) clearInterval(cooldownTimer)
  if (progressTimer) clearInterval(progressTimer)
})

defineExpose({
  castSkill,
  startCooldown,
  isCooldown,
  isCasting
})
</script>

<style scoped>
.skill-button {
  position: relative;
  width: 80px;
  height: 100px;
  background: linear-gradient(180deg, rgba(30, 30, 50, 0.95), rgba(20, 20, 35, 0.95));
  border: 2px solid rgba(184, 134, 11, 0.3);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.skill-button:hover:not(.disabled):not(.cooldown) {
  transform: translateY(-4px);
  border-color: rgba(255, 215, 0, 0.5);
  box-shadow: 0 8px 25px rgba(255, 215, 0, 0.25);
}

.skill-button:active:not(.disabled):not(.cooldown) {
  transform: scale(0.95);
}

.skill-button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(50%);
}

/* 技能图标 */
.skill-icon {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(124, 58, 237, 0.2));
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  border: 1px solid rgba(139, 92, 246, 0.3);
}

.skill-icon-emoji {
  font-size: 28px;
}

/* 技能名称 */
.skill-name {
  font-size: 12px;
  color: #e8e8f0;
  font-weight: 600;
  text-align: center;
  max-width: 70px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 冷却遮罩 */
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
  z-index: 10;
}

.cooldown-circle {
  position: absolute;
  width: 70px;
  height: 70px;
  transform: rotate(-90deg);
}

.cooldown-circle-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.1);
  stroke-width: 4;
}

.cooldown-circle-progress {
  fill: none;
  stroke: #4ecdc4;
  stroke-width: 4;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.1s linear;
  filter: drop-shadow(0 0 6px rgba(78, 205, 196, 0.5));
}

.cooldown-text {
  font-size: 18px;
  font-weight: bold;
  color: #4ecdc4;
  text-shadow: 0 0 10px rgba(78, 205, 196, 0.8);
}

/* 释放动画 */
.cast-effect {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.cast-ripple {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  border: 2px solid rgba(255, 215, 0, 0.6);
  border-radius: 50%;
  transform: translate(-50%, -50%) scale(0);
  animation: castRipple 0.6s ease-out forwards;
}

.cast-ripple.delay-1 { animation-delay: 0.15s; }
.cast-ripple.delay-2 { animation-delay: 0.3s; }

@keyframes castRipple {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(2);
    opacity: 0;
  }
}

/* 快捷键提示 */
.hotkey-hint {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  background: rgba(0, 0, 0, 0.4);
  padding: 2px 5px;
  border-radius: 3px;
}

/* 准备就绪光效 */
.ready-glow {
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border-radius: 14px;
  background: linear-gradient(45deg, transparent, rgba(0, 255, 136, 0.1), transparent);
  animation: readyPulse 2s ease-in-out infinite;
  pointer-events: none;
}

@keyframes readyPulse {
  0%, 100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

/* 准备就绪状态 */
.skill-button.ready {
  border-color: rgba(0, 255, 136, 0.5);
}

.skill-button.ready:hover {
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
}

/* 释放中状态 */
.skill-button.casting {
  border-color: rgba(255, 215, 0, 0.8);
  box-shadow: 0 0 30px rgba(255, 215, 0, 0.4);
}

.skill-button.casting .skill-icon {
  animation: castingBounce 0.3s ease;
}

@keyframes castingBounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}
</style>
