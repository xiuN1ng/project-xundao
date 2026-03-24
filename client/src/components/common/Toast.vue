<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast-item"
          :class="`toast-${toast.type}`"
        >
          <span class="toast-icon">{{ toastIcons[toast.type] }}</span>
          <div class="toast-content">
            <div class="toast-msg">{{ toast.message }}</div>
            <div v-if="toast.sub" class="toast-sub">{{ toast.sub }}</div>
          </div>
          <button class="toast-close" @click="remove(toast.id)">×</button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'

const toasts = ref([])
let nextId = 1

const toastIcons = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: '💡',
  reward: '🎁',
  battle: '⚔️',
}

function add(message, opts = {}) {
  const id = nextId++
  toasts.value.push({
    id,
    message,
    sub: opts.sub || '',
    type: opts.type || 'info',
    duration: opts.duration ?? 3000,
  })
  if (opts.duration !== 0) {
    setTimeout(() => remove(id), opts.duration ?? 3000)
  }
  return id
}

function remove(id) {
  const idx = toasts.value.findIndex(t => t.id === id)
  if (idx !== -1) toasts.value.splice(idx, 1)
}

function success(msg, opts = {}) { return add(msg, { ...opts, type: 'success' }) }
function error(msg, opts = {}) { return add(msg, { ...opts, type: 'error', duration: opts.duration ?? 5000 }) }
function warning(msg, opts = {}) { return add(msg, { ...opts, type: 'warning' }) }
function info(msg, opts = {}) { return add(msg, { ...opts, type: 'info' }) }
function reward(msg, opts = {}) { return add(msg, { ...opts, type: 'reward' }) }
function battle(msg, opts = {}) { return add(msg, { ...opts, type: 'battle' }) }

defineExpose({ add, remove, success, error, warning, info, reward, battle })
</script>

<style scoped>
.toast-container {
  position: fixed; top: 20px; right: 20px; z-index: 99999;
  display: flex; flex-direction: column; gap: 8px;
  max-width: 320px; width: 100%;
}
.toast-item {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  cursor: pointer;
  transition: all 0.25s;
}
.toast-item:hover { transform: translateX(-4px); }

.toast-success { background: rgba(46,125,50,0.9); border: 1px solid rgba(76,175,80,0.4); }
.toast-error { background: rgba(183,28,28,0.9); border: 1px solid rgba(244,67,54,0.4); }
.toast-warning { background: rgba(230,81,0,0.9); border: 1px solid rgba(255,152,0,0.4); }
.toast-info { background: rgba(21,101,192,0.9); border: 1px solid rgba(66,165,245,0.4); }
.toast-reward { background: rgba(49,27,79,0.95); border: 1px solid rgba(255,215,0,0.4); }
.toast-battle { background: rgba(30,15,45,0.95); border: 1px solid rgba(240,147,251,0.4); }

.toast-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
.toast-content { flex: 1; }
.toast-msg { font-size: 14px; color: #fff; font-weight: 500; line-height: 1.4; }
.toast-sub { font-size: 12px; color: rgba(255,255,255,0.7); margin-top: 2px; }
.toast-close { background: none; border: none; color: rgba(255,255,255,0.5); cursor: pointer; font-size: 18px; padding: 0; line-height: 1; }
.toast-close:hover { color: #fff; }

/* Transitions */
.toast-enter-active { transition: all 0.3s ease; }
.toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from { opacity: 0; transform: translateX(100%); }
.toast-leave-to { opacity: 0; transform: translateX(100%); }
</style>
