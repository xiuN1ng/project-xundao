<template>
  <button
    class="base-btn"
    :class="[`btn-${variant}`, `btn-${size}`, { disabled, loading, 'btn-block': block }]"
    :disabled="disabled || loading"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="btn-spinner">⟳</span>
    <span v-if="icon && !loading" class="btn-icon">{{ icon }}</span>
    <slot />
    <span v-if="iconRight && !loading" class="btn-icon-right">{{ iconRight }}</span>
  </button>
</template>

<script setup>
defineProps({
  variant: { type: String, default: 'primary' }, // primary | secondary | danger | ghost | gold
  size: { type: String, default: 'md' }, // sm | md | lg
  icon: { type: String, default: '' },
  iconRight: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  block: { type: Boolean, default: false },
})
defineEmits(['click'])
</script>

<style scoped>
.base-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  border: none; border-radius: 10px; cursor: pointer; font-weight: 600;
  transition: all 0.22s ease; white-space: nowrap;
  font-family: inherit;
}
.base-btn:active:not(.disabled) { transform: translateY(1px); }

/* Sizes */
.btn-sm { padding: 7px 14px; font-size: 12px; border-radius: 8px; }
.btn-md { padding: 10px 22px; font-size: 14px; }
.btn-lg { padding: 14px 30px; font-size: 16px; border-radius: 14px; }
.btn-block { width: 100%; }

/* Variants */
.btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; box-shadow: 0 4px 15px rgba(102,126,234,0.35); }
.btn-primary:hover:not(.disabled) { box-shadow: 0 6px 20px rgba(102,126,234,0.55); transform: translateY(-1px); }

.btn-secondary { background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.15); }
.btn-secondary:hover:not(.disabled) { background: rgba(255,255,255,0.14); }

.btn-danger { background: linear-gradient(135deg, #f44336, #e91e63); color: #fff; box-shadow: 0 4px 15px rgba(244,67,54,0.35); }
.btn-danger:hover:not(.disabled) { box-shadow: 0 6px 20px rgba(244,67,54,0.55); transform: translateY(-1px); }

.btn-ghost { background: transparent; color: #a0aec0; border: 1px solid rgba(255,255,255,0.1); }
.btn-ghost:hover:not(.disabled) { background: rgba(255,255,255,0.06); color: #fff; }

.btn-gold { background: linear-gradient(135deg, #ffd700, #ff8c00); color: #1a1a2e; font-weight: 700; box-shadow: 0 4px 15px rgba(255,215,0,0.3); }
.btn-gold:hover:not(.disabled) { box-shadow: 0 6px 20px rgba(255,215,0,0.5); transform: translateY(-1px); }

/* States */
.disabled { opacity: 0.45; cursor: not-allowed; }
.loading { opacity: 0.8; cursor: wait; }
.btn-spinner { animation: spin 0.8s linear infinite; font-size: 16px; }
@keyframes spin { to { transform: rotate(360deg); } }
.btn-icon, .btn-icon-right { font-size: 1.1em; }
</style>
