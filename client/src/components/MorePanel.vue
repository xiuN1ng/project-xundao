<template>
  <div class="more-panel">
    <h2>📱 更多功能</h2>
    <div class="grid">
      <div class="grid-item" v-for="item in items" :key="item.path" @click="go(item.path)">
        <span class="icon">{{ item.icon }}</span>
        <span class="label">{{ item.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
const items = [
  {path:'/bag',icon:'🎒',label:'背包'},
  {path:'/mount',icon:'🦄',label:'坐骑'},
  {path:'/wing',icon:'👼',label:'翅膀'},
  {path:'/gem',icon:'💎',label:'宝石'},
  {path:'/fashion',icon:'👗',label:'时装'},
  {path:'/title',icon:'🏅',label:'称号'},
  {path:'/vip',icon:'👑',label:'VIP'},
  {path:'/rank',icon:'📊',label:'排行'},
  {path:'/friend',icon:'👥',label:'好友'},
  {path:'/mail',icon:'📧',label:'邮件'},
  {path:'/achievement',icon:'🏆',label:'成就'},
  {path:'/quest',icon:'📜',label:'任务'},
  {path:'/activity',icon:'🎁',label:'活动'},
  {path:'/mall',icon:'🛒',label:'商城'},
  {path:'/lottery',icon:'🎰',label:'抽奖'},
  {path:'/auction',icon:'🔨',label:'拍卖'},
  {path:'/cave',icon:'⛏️',label:'矿洞'},
  {path:'/fishing',icon:'🎣',label:'钓鱼'},
  {path:'/secret',icon:'🔐',label:'密室'},
]
function go(path) { router.push(path) }
</script>

<style scoped>
.more-panel { padding: 20px; }
h2 { color: #f093fb; font-size: 20px; margin-bottom: 20px; }
.grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; }
.grid-item { display: flex; flex-direction: column; align-items: center; padding: 15px 8px; background: rgba(255,255,255,0.05); border-radius: 12px; cursor: pointer; transition: all 0.2s; }
.grid-item:active { transform: scale(0.95); background: rgba(255,255,255,0.1); }
.icon { font-size: 28px; margin-bottom: 8px; }
.label { font-size: 11px; color: #fff; }
</style>
