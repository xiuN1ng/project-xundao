<template>
  <div class="trade-panel">
    <h2>🏪 交易市场</h2>
    <div class="trade-tabs">
      <button>出售</button>
      <button>购买</button>
    </div>
    <div class="trade-list">
      <div v-for="i in 5" :key="i" class="trade-item">
        <span>物品</span>
        <span>¥100</span>
        <button>购买</button>
      </div>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.trade-panel { padding: 20px; }
h2 { color: #f093fb; }
.trade-tabs { display: flex; gap: 10px; margin-bottom: 20px; }
.trade-tabs button { flex: 1; padding: 10px; background: transparent; border: 1px solid #667eea; color: #fff; border-radius: 10px; }
.trade-item { display: flex; justify-content: space-between; align-items: center; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 10px; margin-bottom: 10px; }
.trade-item button { padding: 8px 20px; background: #667eea; border: none; border-radius: 5px; color: #fff; }
</style>
