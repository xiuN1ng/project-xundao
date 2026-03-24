<template>
  <div class="base-panel" :class="[`panel-${variant}`, { 'panel-open': visible }]" @click.self="$emit('click-bg')">
    <!-- Header -->
    <div class="panel-header" :class="[`header-${headerStyle}`]">
      <div class="header-left" v-if="$slots.icon || icon">
        <slot name="icon">
          <span class="header-icon">{{ icon }}</span>
        </slot>
      </div>
      <div class="header-title">
        <slot name="title">
          <span class="title-text">{{ title }}</span>
        </slot>
        <slot name="subtitle">
          <span v-if="subtitle" class="title-sub">{{ subtitle }}</span>
        </slot>
      </div>
      <div class="header-right">
        <slot name="actions" />
        <button v-if="closable" class="close-btn" @click="$emit('close')" :title="closeTitle">×</button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="panel-tabs" v-if="$slots.tabs || tabItems?.length" v-show="!hideTabs">
      <slot name="tabs">
        <button
          v-for="tab in tabItems"
          :key="tab.id"
          class="tab-btn"
          :class="{ active: activeTab === tab.id }"
          @click="$emit('tab-change', tab.id); activeTab = tab.id"
        >
          <span v-if="tab.icon" class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-name">{{ tab.name }}</span>
        </button>
      </slot>
    </div>

    <!-- Content -->
    <div class="panel-body" :class="bodyClass">
      <slot :active-tab="activeTab" />
    </div>

    <!-- Footer -->
    <div class="panel-footer" v-if="$slots.footer" v-show="!hideFooter">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  icon: { type: String, default: '' },
  closable: { type: Boolean, default: true },
  closeTitle: { type: String, default: '关闭' },
  visible: { type: Boolean, default: true },
  variant: { type: String, default: 'default' }, // default | primary | boss | special
  headerStyle: { type: String, default: 'normal' }, // normal | compact | none
  hideTabs: { type: Boolean, default: false },
  hideFooter: { type: Boolean, default: false },
  bodyClass: { type: String, default: '' },
  tabItems: { type: Array, default: null }, // [{ id, name, icon }]
  defaultTab: { type: String, default: '' },
})

const emit = defineEmits(['close', 'click-bg', 'tab-change'])

const activeTab = ref(props.defaultTab || (props.tabItems?.[0]?.id ?? ''))

watch(() => props.defaultTab, v => { if (v) activeTab.value = v })
</script>

<style scoped>
.base-panel {
  border-radius: 16px;
  border: 2px solid rgba(102, 126, 234, 0.4);
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
  color: #e2e8f0;
  max-height: 88vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: panelFadeIn 0.3s ease;
}

.panel-default { background: rgba(15, 15, 40, 0.95); }
.panel-primary { background: linear-gradient(rgba(20, 15, 50, 0.97), rgba(25, 20, 55, 0.95)); }
.panel-boss { background: linear-gradient(rgba(40, 10, 30, 0.97), rgba(30, 15, 45, 0.95)); border-color: rgba(240, 147, 251, 0.5); }
.panel-special { background: linear-gradient(rgba(10, 25, 50, 0.97), rgba(15, 30, 60, 0.95)); border-color: rgba(255, 215, 0, 0.4); }

/* Header */
.panel-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(102, 126, 234, 0.2);
}
.header-compact { padding: 12px 16px; }
.header-none { display: none; }

.header-left { display: flex; align-items: center; }
.header-icon { font-size: 24px; }

.header-title { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.title-text { font-size: 18px; font-weight: bold; color: #f093fb; text-shadow: 0 0 12px rgba(240, 147, 251, 0.4); }
.title-sub { font-size: 11px; color: #667eea; }

.header-right { display: flex; align-items: center; gap: 8px; }

.close-btn {
  width: 32px; height: 32px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
  color: #a0aec0; border-radius: 50%; cursor: pointer;
  font-size: 20px; display: flex; align-items: center; justify-content: center;
  transition: all 0.25s;
}
.close-btn:hover { color: #ff4444; background: rgba(255,68,68,0.15); border-color: rgba(255,68,68,0.3); transform: rotate(90deg); }

/* Tabs */
.panel-tabs {
  display: flex; gap: 6px; padding: 12px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.08); flex-wrap: wrap;
}
.tab-btn {
  flex: 1; min-width: 70px; display: flex; align-items: center; justify-content: center;
  gap: 6px; padding: 9px 12px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(102,126,234,0.2);
  color: #a0aec0; border-radius: 8px; cursor: pointer;
  transition: all 0.25s; font-size: 13px;
}
.tab-btn:hover { background: rgba(102,126,234,0.15); color: #fff; }
.tab-btn.active { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border-color: transparent; font-weight: bold; box-shadow: 0 3px 12px rgba(102,126,234,0.35); }
.tab-icon { font-size: 15px; }

/* Body */
.panel-body { padding: 16px; overflow-y: auto; flex: 1; }

/* Footer */
.panel-footer { padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.08); }

@keyframes panelFadeIn {
  from { opacity: 0; transform: translateY(-15px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
