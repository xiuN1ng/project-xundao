<template>
  <div class="week-panel">
    <h2>📅 周卡/月卡</h2>
    <div class="card-list">
      <div class="card">
        <span>周卡</span>
        <span>¥30</span>
      </div>
      <div class="card">
        <span>月卡</span>
        <span>¥98</span>
      </div>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.card-list { display: flex; gap: 15px; }
.card { flex: 1; padding: 30px; background: rgba(255,215,0,0.1); border-radius: 15px; text-align: center; }
</style>
