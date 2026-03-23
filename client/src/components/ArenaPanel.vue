<template>
  <div class="panel arena">
    <div class="panel-header">
      <h2>竞技场</h2>
      <button class="btn-close" @click="$emit('close')">×</button>
    </div>
    
    <div class="arena-rank">
      <div class="rank-info">
        <span class="rank-label">我的排名</span>
        <span class="rank-value">#{{ myRank }}</span>
      </div>
    </div>
    
    <div class="arena-tabs">
      <button :class="['tab-btn', { active: currentTab === 'rank' }]" @click="currentTab = 'rank'">排行榜</button>
      <button :class="['tab-btn', { active: currentTab === 'challenge' }]" @click="currentTab = 'challenge'">挑战</button>
      <button :class="['tab-btn', { active: currentTab === 'record' }]" @click="currentTab = 'record'">战报</button>
    </div>
    
    <div v-if="currentTab === 'rank'" class="rank-list">
      <div v-for="r in ranks" :key="r.rank" :class="['rank-item', { top3: r.rank <= 3 }]">
        <span class="rank-num">#{{ r.rank }}</span>
        <span class="rank-name">{{ r.name }}</span>
        <span class="rank-combat">{{ r.combat }}战力</span>
      </div>
    </div>
    
    <div v-if="currentTab === 'challenge'" class="challenge-list">
      <div v-for="op in opponents" :key="op.userId" class="opponent-item">
        <div class="opponent-info">
          <div class="opponent-name">{{ op.name }}</div>
          <div class="opponent-combat">{{ op.combat }}战力</div>
        </div>
        <button class="btn-challenge" @click="challenge(op)">挑战</button>
      </div>
    </div>
    
    <div v-if="currentTab === 'record'" class="record-list">
      <div v-for="rec in records" :key="rec.id" :class="['record-item', rec.result]">
        <span class="record-result">{{ rec.result === 'win' ? '胜' : '负' }}</span>
        <span class="record-vs">{{ rec.challengerName }} vs {{ rec.targetName }}</span>
        <span class="record-time">{{ formatTime(rec.time) }}</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ArenaPanel',
  data() {
    return {
      currentTab: 'rank',
      myRank: 0,
      ranks: [],
      opponents: [],
      records: []
    }
  },
  mounted() {
    this.loadRank()
    this.loadMyRank()
    this.loadOpponents()
    this.loadRecords()
  },
  methods: {
    async loadRank() {
      const res = await fetch('http://localhost:3001/api/arena/ranks?limit=20')
      this.ranks = await res.json()
    },
    async loadMyRank() {
      const res = await fetch('http://localhost:3001/api/arena/rank/1')
      const data = await res.json()
      this.myRank = data.rank
    },
    async loadOpponents() {
      const res = await fetch('http://localhost:3001/api/arena/opponents/1')
      this.opponents = await res.json()
    },
    async loadRecords() {
      const res = await fetch('http://localhost:3001/api/arena/records/1')
      this.records = await res.json()
    },
    async challenge(opponent) {
      const res = await fetch('http://localhost:3001/api/arena/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 1,
          targetId: opponent.userId,
          userName: 'test',
          targetName: opponent.name,
          targetCombat: opponent.combat
        })
      })
      const data = await res.json()
      if (data.success) {
        alert(data.win ? '挑战胜利！' : '挑战失败')
        this.loadOpponents()
        this.loadRecords()
      }
    },
    formatTime(ts) {
      return new Date(ts).toLocaleTimeString()
    }
  }
}
</script>

<style scoped>
.panel {
  background: #1a1a2e;
  background-image: url('@/assets/images/bg-arena-battle-new.png');
  background-size: cover;
  background-position: center;
  color: #fff;
  padding: 20px;
  height: 100%;
  overflow-y: auto;
  position: relative;
}
.panel::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(26, 26, 46, 0.75);
  pointer-events: none;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.panel-header h2 {
  font-size: 24px;
  color: #ffd700;
}
.btn-close {
  background: none;
  border: none;
  color: #fff;
  font-size: 30px;
  cursor: pointer;
}
.arena-rank {
  text-align: center;
  padding: 20px;
  background: linear-gradient(135deg, #16213e, #0f3460);
  border-radius: 8px;
  margin-bottom: 20px;
}
.rank-info {
  display: flex;
  flex-direction: column;
}
.rank-label {
  font-size: 14px;
  color: #888;
}
.rank-value {
  font-size: 36px;
  color: #ffd700;
  font-weight: bold;
}
.arena-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}
.tab-btn {
  flex: 1;
  padding: 12px;
  background: #16213e;
  border: none;
  color: #aaa;
  cursor: pointer;
}
.tab-btn.active {
  background: #0f3460;
  color: #ffd700;
}
.rank-list, .challenge-list, .record-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.rank-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 12px;
  background: #16213e;
  border-radius: 8px;
}
.rank-item.top3 {
  border: 1px solid #ffd700;
}
.rank-num {
  font-size: 18px;
  font-weight: bold;
  color: #ffd700;
  width: 40px;
}
.rank-name {
  flex: 1;
}
.rank-combat {
  color: #00d4ff;
  font-size: 12px;
}
.opponent-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: #16213e;
  border-radius: 8px;
}
.opponent-name {
  font-weight: bold;
}
.opponent-combat {
  font-size: 12px;
  color: #888;
}
.btn-challenge {
  padding: 8px 20px;
  background: linear-gradient(135deg, #ff6b6b, #ffd700);
  border: none;
  border-radius: 20px;
  color: #000;
  font-weight: bold;
  cursor: pointer;
}
.record-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #16213e;
  border-radius: 8px;
}
.record-result {
  width: 30px;
  font-weight: bold;
}
.record-item.win .record-result { color: #00ff00; }
.record-item.lose .record-result { color: #ff0000; }
.record-vs { flex: 1; }
.record-time { font-size: 12px; color: #888; }
</style>
