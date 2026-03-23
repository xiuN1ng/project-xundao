<template>
  <div class="settings-panel">
    <h2>⚙️ 设置</h2>
    <div class="settings-group">
      <h3>画面</h3>
      <div class="setting-item"><span>画质</span><select><option>高</option><option>中</option></select></div>
      <div class="setting-item"><span>特效</span><input type="checkbox" checked /></div>
    </div>
    <div class="settings-group">
      <h3>声音</h3>
      <div class="setting-item"><span>音乐</span><input type="range" /></div>
      <div class="setting-item"><span>音效</span><input type="range" /></div>
    </div>
    <div class="settings-group">
      <h3>其他</h3>
      <div class="setting-item"><span>震动</span><input type="checkbox" /></div>
      <div class="setting-item"><span>省流量模式</span><input type="checkbox" /></div>
    </div>
    <button class="logout-btn">退出登录</button>
  </div>
</template>
<script setup>
</script>
<style scoped>
.settings-panel { padding: 20px; }
h2 { color: #f093fb; font-size: 24px; margin-bottom: 20px; }
.settings-group { margin-bottom: 25px; }
.settings-group h3 { color: #667eea; font-size: 16px; margin-bottom: 15px; }
.setting-item { display: flex; justify-content: space-between; align-items: center; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 12px; margin-bottom: 10px; }
.setting-item span { color: #fff; }
.setting-item select { padding: 8px 15px; background: rgba(255,255,255,0.1); border: none; border-radius: 8px; color: #fff; }
.logout-btn { width: 100%; padding: 18px; background: rgba(244,67,54,0.2); border: 1px solid rgba(244,67,54,0.5); border-radius: 15px; color: #f44336; font-weight: bold; cursor: pointer; }
</style>
