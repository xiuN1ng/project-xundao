<template>
  <Teleport to="body">
    <Transition name="reward-popup">
      <div v-if="visible" class="reward-overlay" @click.self="close">
        <div class="reward-card" :class="[`reward-${rank}`, { 'with-crit': isCrit }]">
          <!-- Particle effects for special rewards -->
          <div v-if="rank !== 'normal'" class="particles">
            <span v-for="i in 12" :key="i" class="particle" :style="{ '--i': i }">✨</span>
          </div>

          <div class="reward-header">
            <div class="reward-title">
              <span v-if="isCrit" class="crit-badge">💥 大丰收！</span>
              <span v-else class="normal-badge">{{ title || '获得奖励' }}</span>
            </div>
            <button class="reward-close" @click="close">×</button>
          </div>

          <div class="reward-items">
            <div v-for="item in items" :key="item.icon" class="reward-item" :class="{ 'item-rare': item.rare }">
              <div class="item-icon">{{ item.icon }}</div>
              <div class="item-info">
                <div class="item-name">{{ item.name }}</div>
                <div class="item-count" v-if="item.count">×{{ item.count.toLocaleString() }}</div>
              </div>
              <div v-if="item.sub" class="item-sub">{{ item.sub }}</div>
            </div>
          </div>

          <div class="reward-footer" v-if="showCloseBtn">
            <button class="btn-ok" @click="close">{{ confirmText || '确定' }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'

const visible = ref(false)
const items = ref([])
const rank = ref('normal') // normal | rare | epic | legendary
const title = ref('')
const isCrit = ref(false)
const showCloseBtn = ref(true)
const confirmText = ref('')

let closeTimer = null

function show(opts = {}) {
  items.value = opts.items || [{ icon: '🎁', name: opts.message || '奖励', count: opts.count }]
  rank.value = opts.rank || 'normal'
  title.value = opts.title || ''
  isCrit.value = opts.isCrit || false
  showCloseBtn.value = opts.showCloseBtn !== false
  confirmText.value = opts.confirmText || ''
  visible.value = true

  if (opts.autoClose !== 0) {
    if (closeTimer) clearTimeout(closeTimer)
    closeTimer = setTimeout(close, opts.autoClose ?? (rank.value === 'legendary' ? 6000 : 3500))
  }
}

function close() {
  visible.value = false
  if (closeTimer) { clearTimeout(closeTimer); closeTimer = null }
}

defineExpose({ show, close })
</script>

<style scoped>
.reward-overlay {
  position: fixed; inset: 0; z-index: 99998;
  background: rgba(0,0,0,0.6);
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(4px);
}
.reward-card {
  background: rgba(15,15,40,0.97);
  border-radius: 20px;
  border: 2px solid rgba(102,126,234,0.5);
  padding: 24px; min-width: 300px; max-width: 420px;
  position: relative; overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.7), 0 0 40px rgba(102,126,234,0.2);
  animation: rewardPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.reward-rare { border-color: rgba(138,43,226,0.7); box-shadow: 0 20px 60px rgba(0,0,0,0.7), 0 0 40px rgba(138,43,226,0.3); }
.reward-epic { border-color: rgba(255,165,0,0.7); box-shadow: 0 20px 60px rgba(0,0,0,0.7), 0 0 40px rgba(255,165,0,0.3); }
.reward-legendary { border-color: rgba(255,215,0,0.8); box-shadow: 0 20px 60px rgba(0,0,0,0.7), 0 0 60px rgba(255,215,0,0.4); animation: rewardPop 0.4s cubic-bezier(0.34,1.56,0.64,1), legendaryGlow 2s infinite; }

@keyframes rewardPop {
  from { opacity: 0; transform: scale(0.6) translateY(30px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes legendaryGlow {
  0%,100% { box-shadow: 0 20px 60px rgba(0,0,0,0.7), 0 0 40px rgba(255,215,0,0.3); }
  50% { box-shadow: 0 20px 60px rgba(0,0,0,0.7), 0 0 80px rgba(255,215,0,0.6); }
}

/* Particles */
.particles { position: absolute; inset: 0; pointer-events: none; }
.particle {
  position: absolute;
  animation: particleFloat 2s ease-out infinite;
  animation-delay: calc(var(--i) * 0.15s);
  left: calc(10% + (var(--i) * 7%));
}
@keyframes particleFloat {
  0% { top: 90%; opacity: 1; font-size: 12px; }
  100% { top: -10%; opacity: 0; font-size: 20px; }
}

.reward-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.crit-badge, .normal-badge { font-size: 18px; font-weight: bold; color: #ffd700; text-shadow: 0 0 12px rgba(255,215,0,0.5); }
.normal-badge { color: #f093fb; text-shadow: 0 0 12px rgba(240,147,251,0.4); }
.reward-close { background: none; border: none; color: rgba(255,255,255,0.4); font-size: 24px; cursor: pointer; }
.reward-close:hover { color: #fff; }

.reward-items { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
.reward-item { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: rgba(255,255,255,0.05); border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); }
.item-rare { background: rgba(138,43,226,0.15); border-color: rgba(138,43,226,0.3); }
.item-icon { font-size: 28px; }
.item-info { flex: 1; }
.item-name { font-size: 14px; color: #fff; font-weight: 500; }
.item-count { font-size: 16px; color: #ffd700; font-weight: bold; }
.item-sub { font-size: 11px; color: #888; }

.btn-ok { width: 100%; padding: 12px; background: linear-gradient(135deg, #667eea, #764ba2); border: none; border-radius: 12px; color: #fff; font-size: 15px; font-weight: bold; cursor: pointer; transition: transform 0.2s; }
.btn-ok:hover { transform: translateY(-2px); }

.reward-popup-enter-active { transition: all 0.3s ease; }
.reward-popup-leave-active { transition: all 0.2s ease; }
.reward-popup-enter-from { opacity: 0; }
.reward-popup-leave-to { opacity: 0; transform: scale(0.9); }
</style>
