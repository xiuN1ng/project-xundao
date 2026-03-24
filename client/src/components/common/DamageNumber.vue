<template>
  <div class="damage-layer">
    <TransitionGroup name="dmg">
      <div
        v-for="(dmg, i) in damages"
        :key="dmg.id"
        class="damage-text"
        :class="[`dmg-${dmg.type}`, `anim-${i % 3}`]"
        :style="{ left: dmg.x + 'px', top: dmg.y + 'px', color: dmgColor(dmg.type) }"
        @animationend="remove(dmg.id)"
      >
        {{ dmg.type === 'heal' ? '+' : '' }}{{ dmg.value }}
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const damages = ref([])
let nextId = 1

function add(value, opts = {}) {
  const id = nextId++
  damages.value.push({
    id,
    value,
    type: opts.type || 'normal', // normal | crit | heal | miss | buff | debuff
    x: opts.x ?? (80 + Math.random() * 60),
    y: opts.y ?? (30 + Math.random() * 40),
  })
  return id
}

function remove(id) {
  const idx = damages.value.findIndex(d => d.id === id)
  if (idx !== -1) damages.value.splice(idx, 1)
}

function crit(value, opts = {}) { return add(value, { ...opts, type: 'crit' }) }
function heal(value, opts = {}) { return add(value, { ...opts, type: 'heal' }) }
function miss(opts = {}) { return add('MISS', { ...opts, type: 'miss' }) }
function buff(text, opts = {}) { return add(text, { ...opts, type: 'buff' }) }
function debuff(text, opts = {}) { return add(text, { ...opts, type: 'debuff' }) }

const dmgColor = (type) => ({
  normal: '#ff4444',
  crit: '#ffd700',
  heal: '#4caf50',
  miss: '#888',
  buff: '#4caf50',
  debuff: '#ff4444',
}[type] || '#fff')

defineExpose({ add, crit, heal, miss, buff, debuff })
</script>

<style scoped>
.damage-layer {
  position: absolute; inset: 0;
  pointer-events: none; overflow: hidden;
}
.damage-text {
  position: absolute; font-weight: bold;
  font-size: 18px; text-shadow: 0 2px 6px rgba(0,0,0,0.8);
  animation: floatUp 0.9s ease-out forwards;
  white-space: nowrap;
}
.dmg-crit { font-size: 26px !important; font-weight: 900 !important; }
.dmg-heal { color: #4caf50 !important; }
.dmg-miss { font-size: 14px !important; color: #888 !important; }
.dmg-buff { color: #4caf50 !important; }
.dmg-debuff { color: #ff4444 !important; }

/* Stagger animation positions */
.anim-0 { animation-name: floatUp0; }
.anim-1 { animation-name: floatUp1; }
.anim-2 { animation-name: floatUp2; }

@keyframes floatUp0 {
  0% { opacity: 1; transform: translateY(0) scale(1); }
  40% { opacity: 1; transform: translateY(-30px) scale(1.3); }
  100% { opacity: 0; transform: translateY(-60px) scale(0.8); }
}
@keyframes floatUp1 {
  0% { opacity: 1; transform: translateY(0) scale(1) translateX(0); }
  40% { opacity: 1; transform: translateY(-25px) scale(1.2) translateX(15px); }
  100% { opacity: 0; transform: translateY(-55px) scale(0.8) translateX(25px); }
}
@keyframes floatUp2 {
  0% { opacity: 1; transform: translateY(0) scale(1) translateX(0); }
  40% { opacity: 1; transform: translateY(-35px) scale(1.2) translateX(-15px); }
  100% { opacity: 0; transform: translateY(-65px) scale(0.8) translateX(-25px); }
}

.dmg-enter-active { transition: all 0.15s ease; }
.dmg-leave-active { transition: all 0.1s ease; }
.dmg-enter-from { opacity: 0; transform: scale(0.5); }
</style>
