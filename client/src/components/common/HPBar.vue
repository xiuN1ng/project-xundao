<template>
  <div class="hp-bar-wrapper" :class="{ inline }">
    <div v-if="!inline" class="hp-label-row">
      <span class="hp-label">{{ label }}</span>
      <span class="hp-numbers">{{ Math.max(0, Math.floor(current)) }} / {{ Math.floor(max) }}</span>
    </div>
    <div class="hp-track" :style="{ height: height + 'px' }">
      <div
        class="hp-fill"
        :class="[`hp-${color}`, { 'hp-animated': animated }]"
        :style="{ width: pct + '%', height: height + 'px' }"
      >
        <div v-if="showShine" class="hp-shine"></div>
      </div>
      <!-- Low HP warning pulse -->
      <div v-if="pct < 20" class="hp-low-pulse" :style="{ width: pct + '%', height: height + 'px' }"></div>
    </div>
    <div v-if="inline" class="hp-inline-label">{{ Math.floor(current) }} / {{ Math.floor(max) }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({
  current: { type: Number, default: 100 },
  max: { type: Number, default: 100 },
  color: { type: String, default: 'hp' }, // hp | mp | exp | boss | gold
  height: { type: Number, default: 8 },
  animated: { type: Boolean, default: true },
  showShine: { type: Boolean, default: false },
  inline: { type: Boolean, default: false },
  label: { type: String, default: '' },
})
const pct = computed(() => props.max > 0 ? Math.min(100, Math.max(0, (props.current / props.max) * 100)) : 0)
</script>

<style scoped>
.hp-bar-wrapper { display: flex; flex-direction: column; gap: 3px; }
.hp-bar-wrapper.inline { flex-direction: row; align-items: center; gap: 6px; }
.hp-label-row { display: flex; justify-content: space-between; align-items: center; }
.hp-label { font-size: 12px; color: #aaa; }
.hp-numbers { font-size: 12px; color: #fff; font-weight: 600; }
.hp-track { background: rgba(0,0,0,0.5); border-radius: 999px; overflow: hidden; position: relative; }
.hp-fill { border-radius: 999px; transition: width 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94); position: relative; overflow: hidden; }
.hp-animated { transition: width 0.5s ease; }

.hp-hp { background: linear-gradient(90deg, #4caf50, #8bc34a); }
.hp-mp { background: linear-gradient(90deg, #2196f3, #03a9f4); }
.hp-exp { background: linear-gradient(90deg, #9c27b0, #e91e63); }
.hp-boss { background: linear-gradient(90deg, #f44336, #ff5722); }
.hp-gold { background: linear-gradient(90deg, #ffd700, #ff8c00); }

.hp-shine { position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent); animation: hpShine 2.5s infinite; }
@keyframes hpShine { 0%{left:-100%} 50%,100%{left:200%} } }

.hp-low-pulse { position: absolute; top: 0; left: 0; background: rgba(255,0,0,0.3); border-radius: 999px; animation: lowPulse 0.8s ease-in-out infinite alternate; }
@keyframes lowPulse { from {opacity:0.3} to {opacity:0.7} }

.hp-inline-label { font-size: 11px; color: #aaa; white-space: nowrap; }
</style>
