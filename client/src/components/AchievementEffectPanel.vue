<template>
  <Teleport to="body">
    <transition name="achievement-fx">
      <div v-if="visible" class="achievement-effect-overlay" @click="dismiss">
        <!-- 背景光晕 -->
        <div class="bg-glow"></div>
        
        <!-- 主内容卡片 -->
        <div class="achievement-card" :style="{ '--accent': accentColor }">
          <!-- 顶部装饰 -->
          <div class="top-decor">
            <span class="sparkle s1">✨</span>
            <span class="sparkle s2">⭐</span>
            <span class="sparkle s3">💫</span>
          </div>
          
          <!-- 成就标签 -->
          <div class="achievement-badge">
            <span class="badge-text">成就达成</span>
          </div>
          
          <!-- 成就图标 -->
          <div class="achievement-icon-wrapper">
            <div class="icon-ring"></div>
            <div class="icon-glow"></div>
            <div class="achievement-icon">{{ icon }}</div>
            <div class="icon-particles">
              <span v-for="i in 12" :key="i" class="particle" :style="{ '--i': i }">·</span>
            </div>
          </div>
          
          <!-- 成就名称 -->
          <h2 class="achievement-name">{{ name }}</h2>
          <p class="achievement-desc">{{ desc }}</p>
          
          <!-- 奖励预览 -->
          <div v-if="rewards.length" class="rewards-preview">
            <div v-for="(r, i) in rewards" :key="i" class="reward-item">
              <span class="reward-icon">{{ r.icon }}</span>
              <span class="reward-text">{{ r.text }}</span>
            </div>
          </div>
          
          <!-- 底部装饰 -->
          <div class="bottom-decor">
            <div class="progress-dots">
              <span v-for="i in 3" :key="i" class="dot" :class="{ active: dotIndex >= i }"></span>
            </div>
          </div>
          
          <!-- 点击提示 -->
          <p class="tap-hint">点击任意处关闭</p>
        </div>
        
        <!-- 背景粒子 -->
        <div class="bg-particles">
          <span v-for="i in 20" :key="i" class="bg-particle" :style="particleStyle(i)"></span>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps({
  achievement: { type: Object, default: null }
})

const emit = defineEmits(['dismiss'])

const visible = ref(false)
const icon = ref('⭐')
const name = ref('')
const desc = ref('')
const rewards = ref([])
const accentColor = ref('#ffd700')
const dotIndex = ref(1)

let audioCtx = null
let dismissTimer = null
let dotTimer = null

// 成就类型配色
const TYPE_COLORS = {
  cultivation: '#667eea',
  combat: '#ef4444',
  collection: '#f59e0b',
  exploration: '#10b981',
  social: '#8e2de2',
  wealth: '#ffd700',
  special: '#ff4500'
}

const TYPE_ICONS = {
  cultivation: '🧘',
  combat: '⚔️',
  collection: '📦',
  exploration: '🗺️',
  social: '👥',
  wealth: '💰',
  special: '⭐'
}

function playSound() {
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    const ctx = audioCtx
    
    // 主旋律 - 上升音阶
    const notes = [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12)
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12)
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.12 + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.4)
      osc.start(ctx.currentTime + i * 0.12)
      osc.stop(ctx.currentTime + i * 0.12 + 0.4)
    })
    
    // 和弦 - 庆典音
    const chordTime = ctx.currentTime + 0.4
    const chordFreqs = [523.25, 659.25, 783.99]
    chordFreqs.forEach(freq => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, chordTime)
      gain.gain.setValueAtTime(0, chordTime)
      gain.gain.linearRampToValueAtTime(0.08, chordTime + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, chordTime + 1.2)
      osc.start(chordTime)
      osc.stop(chordTime + 1.2)
    })
    
    // 高频叮声
    const sparkle = ctx.createOscillator()
    const sparkleGain = ctx.createGain()
    sparkle.connect(sparkleGain)
    sparkleGain.connect(ctx.destination)
    sparkle.type = 'sine'
    sparkle.frequency.setValueAtTime(2093, ctx.currentTime + 0.3)
    sparkleGain.gain.setValueAtTime(0, ctx.currentTime + 0.3)
    sparkleGain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.35)
    sparkleGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
    sparkle.start(ctx.currentTime + 0.3)
    sparkle.stop(ctx.currentTime + 0.8)
    
    setTimeout(() => { if (audioCtx) { audioCtx.close(); audioCtx = null } }, 2000)
  } catch (e) {
    console.warn('Audio playback failed:', e)
  }
}

function parseRewards(reward) {
  const items = []
  if (!reward) return items
  if (reward.spiritStones) items.push({ icon: '💰', text: `+${reward.spiritStones} 灵石` })
  if (reward.title) items.push({ icon: '🏅', text: `称号: ${reward.title}` })
  if (reward.spiritRateBonus) items.push({ icon: '📈', text: `修炼速度+${Math.round(reward.spiritRateBonus * 100)}%` })
  if (reward.atkBonus) items.push({ icon: '⚔️', text: `攻击+${Math.round(reward.atkBonus * 100)}%` })
  if (reward.defBonus) items.push({ icon: '🛡️', text: `防御+${Math.round(reward.defBonus * 100)}%` })
  if (reward.expBonus) items.push({ icon: '✨', text: `经验+${Math.round(reward.expBonus * 100)}%` })
  if (reward.stoneBonus) items.push({ icon: '💎', text: `灵石+${Math.round(reward.stoneBonus * 100)}%` })
  if (reward.realmExpBonus) items.push({ icon: '🌟', text: `境界经验+${Math.round(realmExpBonus * 100)}%` })
  return items.slice(0, 3) // 最多显示3个
}

function showAchievement(ach) {
  // 清理旧定时器
  clearTimeout(dismissTimer)
  clearInterval(dotTimer)
  if (audioCtx) { audioCtx.close(); audioCtx = null }
  
  // 设置成就数据
  const achData = ach._rawData || ach
  icon.value = TYPE_ICONS[achData.type] || '⭐'
  name.value = achData.name || achData.achievement_name || '成就达成'
  desc.value = achData.desc || achData.description || '恭喜解锁成就'
  rewards.value = parseRewards(achData.reward || achData.reward_info)
  accentColor.value = TYPE_COLORS[achData.type] || '#ffd700'
  
  // 重置状态
  dotIndex.value = 1
  visible.value = true
  
  // 播放音效
  playSound()
  
  // 进度点动画
  dotTimer = setInterval(() => {
    if (dotIndex.value < 3) dotIndex.value++
  }, 800)
  
  // 自动关闭 (4秒)
  dismissTimer = setTimeout(() => dismiss(), 4000)
}

function dismiss() {
  visible.value = false
  clearTimeout(dismissTimer)
  clearInterval(dotTimer)
  emit('dismiss')
}

function particleStyle(i) {
  const angle = (i / 20) * 360
  const delay = (i * 0.15) % 2
  const size = 4 + (i % 4) * 2
  const xOffset = 20 + (i % 5) * 15
  return {
    '--angle': angle + 'deg',
    '--delay': delay + 's',
    '--size': size + 'px',
    left: xOffset + '%'
  }
}

watch(() => props.achievement, (ach) => {
  if (ach) showAchievement(ach)
}, { immediate: true })

onUnmounted(() => {
  clearTimeout(dismissTimer)
  clearInterval(dotTimer)
  if (audioCtx) audioCtx.close()
})

defineExpose({ showAchievement })
</script>

<style scoped>
.achievement-effect-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  cursor: pointer;
}

/* 背景光晕 */
.bg-glow {
  position: absolute;
  width: 500px;
  height: 500px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%);
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { transform: scale(0.8); opacity: 0.5; }
  50% { transform: scale(1.2); opacity: 0.8; }
}

/* 主卡片 */
.achievement-card {
  position: relative;
  width: 320px;
  padding: 32px 28px 24px;
  background: linear-gradient(145deg, #1e1e3f 0%, #2a1a4a 50%, #1a1a3e 100%);
  border: 2px solid var(--accent, #ffd700);
  border-radius: 20px;
  box-shadow: 
    0 0 40px rgba(255,215,0,0.3),
    0 0 80px rgba(255,215,0,0.15),
    inset 0 1px 0 rgba(255,255,255,0.1);
  text-align: center;
  animation: card-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes card-in {
  0% { transform: scale(0.3) translateY(50px); opacity: 0; }
  60% { transform: scale(1.05) translateY(-5px); }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}

/* 顶部装饰 */
.top-decor { position: absolute; top: -10px; left: 0; right: 0; height: 30px; }
.sparkle {
  position: absolute;
  font-size: 16px;
  animation: twinkle 1s ease-in-out infinite;
}
.s1 { left: 20%; top: 5px; animation-delay: 0s; }
.s2 { left: 50%; top: 0; animation-delay: 0.3s; font-size: 20px; }
.s3 { left: 75%; top: 8px; animation-delay: 0.6s; }

@keyframes twinkle {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.7); }
}

/* 成就标签 */
.achievement-badge {
  display: inline-block;
  padding: 4px 16px;
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  border-radius: 20px;
  margin-bottom: 20px;
  animation: badge-in 0.4s 0.2s both;
}
.badge-text {
  font-size: 12px;
  font-weight: bold;
  color: #1a1a2e;
  letter-spacing: 2px;
}
@keyframes badge-in {
  0% { transform: translateY(-20px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}

/* 图标包装 */
.achievement-icon-wrapper {
  position: relative;
  width: 100px;
  height: 100px;
  margin: 0 auto 20px;
}

.icon-ring {
  position: absolute;
  inset: 0;
  border: 3px solid var(--accent, #ffd700);
  border-radius: 50%;
  animation: ring-spin 3s linear infinite;
  border-top-color: transparent;
  border-bottom-color: transparent;
}

@keyframes ring-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.icon-glow {
  position: absolute;
  inset: 10px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,215,0,0.4) 0%, transparent 70%);
  animation: icon-glow-pulse 1.5s ease-in-out infinite;
}

@keyframes icon-glow-pulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.1); }
}

.achievement-icon {
  position: absolute;
  inset: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  animation: icon-bounce 0.6s 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes icon-bounce {
  0% { transform: scale(0); }
  60% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

/* 粒子环 */
.icon-particles {
  position: absolute;
  inset: -5px;
  border-radius: 50%;
}

.particle {
  position: absolute;
  width: var(--size, 6px);
  height: var(--size, 6px);
  background: var(--accent, #ffd700);
  border-radius: 50%;
  top: 50%;
  left: 50%;
  transform: rotate(var(--angle, 0deg)) translateX(48px);
  animation: particle-orbit 2s linear infinite;
  animation-delay: calc(var(--i, 1) * -0.15s);
  opacity: 0;
}

@keyframes particle-orbit {
  0% { opacity: 1; transform: rotate(var(--angle, 0deg)) translateX(48px) scale(1); }
  100% { opacity: 0; transform: rotate(calc(var(--angle, 0deg) + 360deg)) translateX(48px) scale(0.3); }
}

/* 文字 */
.achievement-name {
  font-size: 22px;
  font-weight: bold;
  color: var(--accent, #ffd700);
  margin: 0 0 8px;
  text-shadow: 0 0 20px rgba(255,215,0,0.5);
  animation: name-in 0.4s 0.4s both;
}

@keyframes name-in {
  0% { transform: translateX(-20px); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
}

.achievement-desc {
  font-size: 13px;
  color: #aaa;
  margin: 0 0 16px;
  animation: desc-in 0.4s 0.5s both;
}

@keyframes desc-in {
  0% { transform: translateX(20px); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
}

/* 奖励预览 */
.rewards-preview {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
  animation: rewards-in 0.4s 0.6s both;
}

@keyframes rewards-in {
  0% { transform: translateY(10px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}

.reward-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(255,215,0,0.1);
  border: 1px solid rgba(255,215,0,0.3);
  border-radius: 20px;
}

.reward-icon { font-size: 14px; }
.reward-text { font-size: 12px; color: #ffd700; }

/* 底部进度点 */
.bottom-decor {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
  animation: dots-in 0.4s 0.7s both;
}

@keyframes dots-in {
  0% { transform: scale(0); }
  100% { transform: scale(1); }
}

.progress-dots {
  display: flex;
  gap: 8px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  transition: background 0.3s;
}

.dot.active {
  background: var(--accent, #ffd700);
  box-shadow: 0 0 8px var(--accent, #ffd700);
}

.tap-hint {
  font-size: 11px;
  color: rgba(255,255,255,0.3);
  margin: 0;
  animation: hint-fade 2s 1.5s both;
}

@keyframes hint-fade {
  0% { opacity: 0; }
  50% { opacity: 1; }
  100% { opacity: 0.3; }
}

/* 背景粒子 */
.bg-particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.bg-particle {
  position: absolute;
  bottom: -10px;
  width: var(--size, 6px);
  height: var(--size, 6px);
  background: var(--accent, #ffd700);
  border-radius: 50%;
  opacity: 0;
  animation: float-up 3s ease-in infinite;
  animation-delay: var(--delay, 0s);
}

/* 过渡动画 */
.achievement-fx-enter-active {
  transition: opacity 0.3s ease;
}
.achievement-fx-leave-active {
  transition: opacity 0.5s ease;
}
.achievement-fx-enter-from,
.achievement-fx-leave-to {
  opacity: 0;
}

@keyframes float-up {
  0% { transform: translateY(0) translateX(0); opacity: 0; }
  10% { opacity: 0.8; }
  90% { opacity: 0.6; }
  100% { transform: translateY(-100vh) translateX(20px); opacity: 0; }
}
</style>
