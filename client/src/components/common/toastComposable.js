// composables/useToast.js
// 用法: import { useToast } from '../components/common/toastComposable.js'
// 注意: 需要在 App.vue 中注册 Toast.vue 全局组件
import { ref } from 'vue'

const toasts = ref([])
let nextId = 1

export function useToast() {
  function add(message, opts = {}) {
    const id = nextId++
    const toast = { id, message, type: opts.type || 'info', sub: opts.sub || '', duration: opts.duration ?? 3000 }
    toasts.value.push(toast)
    if (toast.duration !== 0) {
      setTimeout(() => remove(id), toast.duration)
    }
    return id
  }

  function remove(id) {
    const idx = toasts.value.findIndex(t => t.id === id)
    if (idx !== -1) toasts.value.splice(idx, 1)
  }

  return {
    toasts,
    success: (msg, opts) => add(msg, { ...opts, type: 'success' }),
    error: (msg, opts) => add(msg, { ...opts, type: 'error', duration: opts?.duration ?? 5000 }),
    warning: (msg, opts) => add(msg, { ...opts, type: 'warning' }),
    info: (msg, opts) => add(msg, { ...opts, type: 'info' }),
    reward: (msg, opts) => add(msg, { ...opts, type: 'reward' }),
    battle: (msg, opts) => add(msg, { ...opts, type: 'battle' }),
    add,
    remove,
  }
}
