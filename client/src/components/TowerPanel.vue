<template>
  <div class="tower-panel">
    <h2>🗼 无尽塔</h2>
    
    <!-- 当前进度 -->
    <div class="tower-status">
      <div class="status-item">
        <span>当前层数</span>
        <span class="big">{{ currentFloor }}</span>
      </div>
      <div class="status-item">
        <span>最高层数</span>
        <span>{{ maxFloor }}</span>
      </div>
    </div>
    
    <!-- 塔层展示 -->
    <div class="tower-view">
      <div v-for="floor in visibleFloors" :key="floor" 
           class="floor-item"
           :class="{ current: floor === currentFloor, passed: floor < currentFloor }">
        {{ floor }}
      </div>
    </div>
    
    <!-- 挑战 -->
    <div class="challenge-section">
      <div class="current-enemy">
        <span class="enemy-name">{{ currentEnemy.name }}</span>
        <div class="enemy-stats">
          <span>HP: {{ currentEnemy.hp }}</span>
          <span>ATK: {{ currentEnemy.atk }}</span>
        </div>
      </div>
      <button @click="startChallenge" class="challenge-btn">
        开始挑战
      </button>
    </div>
    
    <!-- 排行榜 -->
    <div class="tower-rank">
      <h3>排行榜</h3>
      <div class="rank-list">
        <div v-for="player in ranking" :key="player.id" class="rank-item">
          <span class="rank-num">{{ player.rank }}</span>
          <span class="player-name">{{ player.name }}</span>
          <span class="floor-num">{{ player.floor }}层</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const currentFloor = ref(15)
const maxFloor = ref(18)
const visibleFloors = [15, 16, 17, 18, 19, 20]

const currentEnemy = ref({ name: '魔兽', hp: 10000, atk: 500 })

const ranking = ref([
  { rank: 1, name: '剑仙', floor: 65 },
  { rank: 2, name: '丹帝', floor: 58 },
  { rank: 3, name: '阵法师', floor: 42 }
])

function startChallenge() {
  currentFloor.value++
}
</script>

<style scoped>
.tower-panel { padding: 20px; }
h2 { color: #f093fb; margin-bottom: 20px; }
h3 { color: #667eea; margin: 20px 0 15px; }

.tower-status { display: flex; justify-content: space-around; padding: 25px; background: linear-gradient(135deg, rgba(102,126,234,0.2), rgba(118,75,162,0.2)); border-radius: 15px; margin-bottom: 20px; }
.status-item { text-align: center; }
.status-item span:first-child { display: block; opacity: 0.7; font-size: 14px; }
.big { font-size: 40px; color: #f093fb; font-weight: bold; }

.tower-view { display: flex; gap: 10px; overflow-x: auto; padding: 15px; background: rgba(255,255,255,0.03); border-radius: 10px; margin-bottom: 20px; }
.floor-item { min-width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); border-radius: 10px; color: #fff; }
.floor-item.current { background: #667eea; }
.floor-item.passed { background: rgba(76,175,80,0.3); color: #4caf50; }

.challenge-section { background: rgba(255,255,255,0.05); padding: 20px; border-radius: 15px; margin-bottom: 20px; text-align: center; }
.enemy-name { font-size: 24px; color: #fff; display: block; margin-bottom: 10px; }
.enemy-stats { display: flex; justify-content: center; gap: 30px; margin-bottom: 20px; opacity: 0.7; }
.challenge-btn { padding: 15px 50px; font-size: 18px; background: linear-gradient(90deg, #f093fb, #f5576c); border: none; border-radius: 25px; color: #fff; cursor: pointer; }

.rank-list { display: flex; flex-direction: column; gap: 10px; }
.rank-item { display: flex; align-items: center; gap: 15px; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 10px; }
.rank-num { width: 30px; height: 30px; background: #667eea; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: bold; }
.player-name { flex: 1; color: #fff; }
.floor-num { color: #f093fb; }
</style>
