<template>
  <div class="fishing-panel">
    <h2>🎣 悠闲钓鱼</h2>
    <div class="fishing-pond">
      <div class="pond-bg"></div>
      <span class="fish-rod" :class="{casting:isFishing}">🎣</span>
      <div v-if="fishOnHook" class="fish-alert">🐟 咬钩了！</div>
    </div>
    <div class="fishing-status">
      <span>体力: {{ energy }}/50</span>
      <button @click="cast" :disabled="isFishing || energy<1">{{ isFishing ? '等待中...' : '抛竿' }}</button>
    </div>
    <div class="fish-collection">
      <h3>鱼获 ({{ fishes.length }})</h3>
      <div class="fish-grid">
        <div v-for="f in fishes" :key="f.id" class="fish-item"><span>{{ f.icon }}</span><span>{{ f.name }}</span></div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue'
const energy = ref(30), isFishing = ref(false), fishOnHook = ref(false)
const fishes = ref([{id:1,icon:'🐟',name:'锦鲤'}])
function cast(){isFishing.value=true;setTimeout(()=>{fishOnHook.value=true;isFishing.value=false},3000)}
</script>
<style scoped>
.fishing-panel { padding: 20px; }
h2 { color: #f093fb; font-size: 24px; margin-bottom: 20px; }
.fishing-pond { height: 200px; background: linear-gradient(to bottom,#1e3c72,#2a5298); border-radius: 20px; position: relative; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; overflow: hidden; }
.fish-rod { font-size: 60px; }
.fish-rod.casting { animation: swing 1s infinite; }
@keyframes swing { 0%,100%{transform:rotate(-10deg);}50%{transform:rotate(10deg);} }
.fish-alert { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); background: rgba(0,0,0,0.8); padding: 20px 40px; border-radius: 15px; color: #fff; font-size: 20px; animation: pulse 0.5s infinite; }
@keyframes pulse { 0%,100%{transform:translate(-50%,-50%)scale(1);}50%{transform:translate(-50%,-50%)scale(1.1);} }
.fishing-status { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.fishing-status span { color: #fff; }
.fishing-status button { padding: 12px 30px; background: linear-gradient(135deg,#667eea,#764ba2); border: none; border-radius: 25px; color: #fff; font-weight: bold; cursor: pointer; }
.fishing-status button:disabled { opacity: 0.5; }
.fish-collection h3 { color: #667eea; font-size: 16px; margin-bottom: 15px; }
.fish-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; }
.fish-item { text-align: center; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 12px; }
.fish-item span { display: block; }
.fish-item span:first-child { font-size: 30px; }
.fish-item span:last-child { color: #fff; font-size: 12px; }
</style>
