<template>
  <div class="progress-wrapper" :class="{ 'show-label': showLabel }">
    <div class="progress-bar" :style="{ height: height + 'px' }">
      <div
        class="progress-fill"
        :class="[`fill-${color}`, { 'with-glow': glow }]"
        :style="{ width: percentage + '%' }"
      ></div>
      <!-- Animated shine effect -->
      <div v-if="animated" class="progress-shine"></div>
    </div>
    <div class="progress-label" v-if="showLabel">
      <span class="label-text">{{ label || `${current} / ${total}` }}</span>
      <span v-if="showPct" class="label-pct">{{ Math.round(percentage) }}%</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  current: { type: Number, default: 0 },
  total: { type: Number, default: 100 },
  color: { type: String, default: 'primary' }, // primary | success | warning | danger | gold | boss
  height: { type: Number, default: 10 },
  animated: { type: Boolean, default: true },
  glow: { type: Boolean, default: false },
  showLabel: { type: Boolean, default: false },
  showPct: { type: Boolean, default: true },
  label: { type: String, default: '' },
})

const percentage = computed(() => {
  if (props.total === 0) return 0
  return Math.min(100, Math.max(0, (props.current / props.total) * 100))
})
</script>

<style scoped>
.progress-wrapper { display: flex; flex-direction: column; gap: 4px; }
.progress-bar {
  background: rgba(0,0,0,0.4);
  border-radius: 999px; overflow: hidden;
  position: relative;
}
.progress-fill {
  height: 100%; border-radius: 999px;
  transition: width 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.fill-primary { background: linear-gradient(90deg, #667eea, #764ba2); }
.fill-success { background: linear-gradient(90deg, #4caf50, #8bc34a); }
.fill-warning { background: linear-gradient(90deg, #ff9800, #ffc107); }
.fill-danger { background: linear-gradient(90deg, #f44336, #ff5722); }
.fill-gold { background: linear-gradient(90deg, #ffd700, #ff8c00); }
.fill-boss { background: linear-gradient(90deg, #f093fb, #f5576c); }

.fill-primary.with-glow { box-shadow: 0 0 12px rgba(102,126,234,0.6); }
.fill-success.with-glow { box-shadow: 0 0 12px rgba(76,175,80,0.6); }
.fill-gold.with-glow { box-shadow: 0 0 12px rgba(255,215,0,0.6); }

.progress-shine {
  position: absolute; top: 0; left: -100%;
  width: 100%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  animation: shine 2s infinite;
}
@keyframes shine {
  0% { left: -100%; }
  100% { left: 200%; }
}

.progress-label { display: flex; justify-content: space-between; align-items: center; }
.label-text { font-size: 12px; color: #aaa; }
.label-pct { font-size: 12px; color: #fff; font-weight: bold; }
</style>
