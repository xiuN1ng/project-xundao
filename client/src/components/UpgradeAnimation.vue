<template>
  <Teleport to="body">
    <Transition name="upgrade">
      <div v-if="show" class="upgrade-overlay" @click="close">
        <div class="upgrade-content">
          <!-- 升级粒子效果 -->
          <div class="particles">
            <div v-for="i in 20" :key="i" class="particle" :style="getParticleStyle(i)"></div>
          </div>
          
          <!-- 主标题 -->
          <div class="title">
            <span class="title-text">等级提升!</span>
          </div>
          
          <!-- 等级数字 -->
          <div class="level-display">
            <div class="level-circle">
              <span class="level-number">{{ fromLevel }}</span>
              <span class="level-arrow">→</span>
              <span class="level-number new">{{ toLevel }}</span>
            </div>
          </div>
          
          <!-- 属性提升 -->
          <div v-if="attributes.length > 0" class="attributes">
            <div v-for="attr in attributes" :key="attr.name" class="attribute-row">
              <span class="attr-name">{{ attr.name }}</span>
              <span class="attr-change">
                <span class="old-value">{{ attr.from }}</span>
                <span class="arrow">→</span>
                <span class="new-value">+{{ attr.to }}</span>
              </span>
            </div>
          </div>
          
          <!-- 奖励展示 -->
          <div v-if="rewards.length > 0" class="rewards">
            <h4>升级奖励</h4>
            <div class="reward-items">
              <div v-for="(reward, index) in rewards" :key="index" class="reward-item">
                <span class="reward-icon">{{ reward.icon }}</span>
                <span class="reward-text">{{ reward.text }}</span>
                <span class="reward-value">+{{ reward.value }}</span>
              </div>
            </div>
          </div>
          
          <!-- 特效光环 -->
          <div class="glow-ring"></div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  show: Boolean,
  fromLevel: { type: Number, default: 0 },
  toLevel: { type: Number, default: 1 },
  attributes: { type: Array, default: () => [] },
  rewards: { type: Array, default: () => [] },
  autoClose: { type: Number, default: 3000 }
})

const emit = defineEmits(['close'])

function close() {
  emit('close')
}

// 自动关闭
watch(() => props.show, (newVal) => {
  if (newVal && props.autoClose > 0) {
    setTimeout(() => {
      close()
    }, props.autoClose)
  }
})

// 生成粒子样式
function getParticleStyle(index) {
  const angle = (index / 20) * 360
  const distance = 100 + Math.random() * 100
  const delay = Math.random() * 0.5
  const duration = 1 + Math.random() * 1
  
  return {
    '--angle': `${angle}deg`,
    '--distance': `${distance}px`,
    '--delay': `${delay}s`,
    '--duration': `${duration}s`
  }
}
</script>

<style scoped>
.upgrade-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  cursor: pointer;
}

.upgrade-content {
  position: relative;
  text-align: center;
  padding: 40px 60px;
  background: linear-gradient(180deg, 
    rgba(102, 126, 234, 0.3) 0%, 
    rgba(118, 75, 162, 0.3) 50%,
    rgba(0, 0, 0, 0.9) 100%);
  border-radius: 20px;
  border: 2px solid rgba(240, 147, 251, 0.5);
  box-shadow: 
    0 0 60px rgba(102, 126, 234, 0.5),
    0 0 100px rgba(240, 147, 251, 0.3);
  overflow: hidden;
  min-width: 400px;
}

/* 标题 */
.title {
  margin-bottom: 20px;
}

.title-text {
  font-size: 42px;
  font-weight: bold;
  background: linear-gradient(180deg, #fff 0%, #f093fb 50%, #667eea 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 0 30px rgba(240, 147, 251, 0.8);
  animation: titlePulse 1s ease-in-out infinite;
}

@keyframes titlePulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

/* 等级展示 */
.level-display {
  margin: 30px 0;
}

.level-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  font-size: 64px;
  font-weight: bold;
}

.level-number {
  color: #94a3b8;
  text-shadow: 0 0 20px rgba(148, 163, 184, 0.5);
}

.level-number.new {
  color: #4ade80;
  text-shadow: 0 0 30px rgba(74, 222, 128, 0.8);
  animation: newLevelPulse 0.5s ease-out;
}

@keyframes newLevelPulse {
  0% { transform: scale(0.5); opacity: 0; }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}

.level-arrow {
  color: #f093fb;
  animation: arrowPulse 1s ease-in-out infinite;
}

@keyframes arrowPulse {
  0%, 100% { opacity: 0.5; transform: translateX(0); }
  50% { opacity: 1; transform: translateX(5px); }
}

/* 属性提升 */
.attributes {
  margin: 20px 0;
  padding: 15px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
}

.attribute-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 20px;
  font-size: 18px;
}

.attr-name {
  color: #94a3b8;
}

.attr-change {
  display: flex;
  align-items: center;
  gap: 10px;
}

.old-value {
  color: #64748b;
  text-decoration: line-through;
}

.arrow {
  color: #f093fb;
}

.new-value {
  color: #4ade80;
  font-weight: bold;
}

/* 奖励 */
.rewards {
  margin-top: 20px;
}

.rewards h4 {
  color: #fbbf24;
  margin-bottom: 15px;
  font-size: 20px;
}

.reward-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reward-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  padding: 12px 20px;
  background: linear-gradient(90deg, 
    rgba(251, 191, 36, 0.2) 0%, 
    rgba(251, 191, 36, 0.1) 100%);
  border-radius: 8px;
  border: 1px solid rgba(251, 191, 36, 0.3);
}

.reward-icon {
  font-size: 24px;
}

.reward-text {
  color: #fff;
  flex: 1;
  text-align: left;
}

.reward-value {
  color: #4ade80;
  font-weight: bold;
  font-size: 18px;
}

/* 光环 */
.glow-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 300px;
  height: 300px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 2px solid rgba(240, 147, 251, 0.3);
  animation: ringExpand 2s ease-out infinite;
  pointer-events: none;
}

@keyframes ringExpand {
  0% { 
    width: 100px; 
    height: 100px; 
    opacity: 1;
  }
  100% { 
    width: 500px; 
    height: 500px; 
    opacity: 0;
  }
}

/* 粒子效果 */
.particles {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
}

.particle {
  position: absolute;
  width: 8px;
  height: 8px;
  background: radial-gradient(circle, #f093fb 0%, transparent 70%);
  border-radius: 50%;
  transform: rotate(var(--angle)) translateY(var(--distance));
  animation: particleFloat var(--duration) ease-out infinite;
  animation-delay: var(--delay);
  opacity: 0;
}

@keyframes particleFloat {
  0% { 
    transform: rotate(var(--angle)) translateY(0); 
    opacity: 1;
  }
  100% { 
    transform: rotate(var(--angle)) translateY(calc(var(--distance) * 2)); 
    opacity: 0;
  }
}

/* 过渡动画 */
.upgrade-enter-active {
  animation: upgradeIn 0.5s ease-out;
}

.upgrade-leave-active {
  animation: upgradeOut 0.3s ease-in;
}

@keyframes upgradeIn {
  0% {
    opacity: 0;
    transform: scale(0.5);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    opacity: 1;
    transform: scale(1);
 Out {
  0% {
    }
}

@keyframes upgrade opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.5);
  }
}
</style>
