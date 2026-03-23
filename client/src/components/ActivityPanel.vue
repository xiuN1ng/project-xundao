<template>
  <div class="activity-panel">
    <h2>🎁 活动中心</h2>
    
    <!-- 签到 -->
    <div class="signin-section">
      <div class="signin-header">
        <span class="title">📅 每日签到</span>
        <span class="tips">签到7天获得豪华大奖</span>
      </div>
      
      <div class="signin-calendar">
        <div v-for="(day, index) in 7" :key="index" 
             class="signin-day"
             :class="{ 
               claimed: index < signedDays, 
               today: index === today - 1,
               tomorrow: index === today
             }"
             @click="signIn(index)">
          <span class="day-num">Day{{ index + 1 }}</span>
          <span class="day-reward">{{ rewards[index] }}</span>
          <div v-if="index < signedDays" class="check-mark">✓</div>
        </div>
      </div>
      
      <button v-if="!todaySigned" class="signin-btn" @click="doSignIn">
        <span>✨</span> 立即签到
      </button>
      <div v-else class="signed-badge">
        <span>✓</span> 今日已签到
      </div>
    </div>
    
    <!-- 限时活动 -->
    <div class="events-section">
      <h3>⏰ 限时活动</h3>
      <div class="event-list">
        <div v-for="event in events" :key="event.id" class="event-card" :class="{ urgent: event.urgent }">
          <div class="event-badge" v-if="event.urgent">🔥</div>
          
          <div class="event-header">
            <span class="event-name">{{ event.name }}</span>
            <span class="event-time">{{ event.remainTime }}</span>
          </div>
          
          <p class="event-desc">{{ event.desc }}</p>
          
          <div class="event-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: event.progress + '%' }"></div>
            </div>
            <span class="progress-text">{{ event.progress }}%</span>
          </div>
          
          <button v-if="event.progress >= 100 && !event.claimed" class="claim-btn" @click="claimEvent(event)">
            领取奖励
          </button>
          <span v-else-if="event.claimed" class="claimed">✓ 已完成</span>
        </div>
      </div>
    </div>
    
    <!-- 节日活动 -->
    <div class="festival-section">
      <h3>🎉 节日活动</h3>
      <div class="festival-card">
        <div class="festival-icon">🧧</div>
        <div class="festival-info">
          <span class="name">春节活动</span>
          <span class="desc">双倍灵石收益</span>
        </div>
        <button class="join-btn">参加</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { activityApi } from '../api'
import axios from 'axios'

const signedDays = ref(3)
const today = ref(4)
const todaySigned = ref(true)
const rewards = ['💰100', '💰200', '💰300', '💰500', '🥚灵兽蛋', '💰800', '📜功法']

const events = ref([
  { id: 1, name: '首充礼包', desc: '累计充值达到指定金额', progress: 100, claimed: false, remainTime: '长期', urgent: false },
  { id: 2, name: '等级冲刺', desc: '达到50级', progress: 65, claimed: false, remainTime: '3天', urgent: true },
  { id: 3, name: '累计登录', desc: '登录7天', progress: 100, claimed: true, remainTime: '2天', urgent: false }
])

function signIn(index) {}

function doSignIn() {
  todaySigned.value = true
  signedDays.value++
  axios.post('/api/activity/signin')
}

function claimEvent(event) {
  event.claimed = true
}
</script>

<style scoped>
.activity-panel { padding: 20px; }

h2 { color: #f093fb; font-size: 24px; margin-bottom: 25px; }
h3 { color: #667eea; font-size: 16px; margin-bottom: 15px; }

/* 签到 */
.signin-section {
  background: linear-gradient(135deg, rgba(102,126,234,0.15), rgba(118,75,162,0.15));
  border-radius: 20px; padding: 25px; margin-bottom: 25px;
}

.signin-header { margin-bottom: 20px; }
.title { display: block; color: #fff; font-size: 18px; font-weight: bold; margin-bottom: 5px; }
.tips { font-size: 12px; opacity: 0.7; }

.signin-calendar { display: flex; gap: 10px; margin-bottom: 20px; }

.signin-day {
  flex: 1; position: relative;
  padding: 15px 8px; background: rgba(255,255,255,0.05);
  border-radius: 12px; text-align: center; cursor: pointer;
  transition: all 0.3s;
}

.signin-day:hover { background: rgba(255,255,255,0.1); }
.signin-day.today { border: 2px solid #667eea; }
.signin-day.claimed { background: rgba(76,175,80,0.2); }

.day-num { display: block; font-size: 12px; opacity: 0.7; margin-bottom: 8px; }
.day-reward { display: block; color: #ffd700; font-size: 13px; font-weight: bold; }

.check-mark {
  position: absolute; top: 5px; right: 5px;
  width: 20px; height: 20px; background: #4caf50;
  border-radius: 50%; color: #fff; font-size: 12px;
  display: flex; align-items: center; justify-content: center;
}

.signin-btn {
  width: 100%; padding: 18px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none; border-radius: 15px; color: #fff;
  font-size: 18px; font-weight: bold; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  transition: all 0.3s;
}

.signin-btn:hover { transform: translateY(-3px); box-shadow: 0 10px 30px rgba(102,126,234,0.4); }

.signed-badge {
  text-align: center; padding: 15px;
  background: rgba(76,175,80,0.2); border-radius: 15px;
  color: #4caf50; font-weight: bold;
}

/* 活动 */
.event-list { display: flex; flex-direction: column; gap: 15px; margin-bottom: 25px; }

.event-card {
  position: relative;
  background: rgba(255,255,255,0.05); padding: 20px; border-radius: 15px;
  border: 1px solid transparent;
}

.event-card.urgent { border-color: rgba(244,67,54,0.5); }

.event-badge { position: absolute; top: 10px; right: 10px; font-size: 20px; }

.event-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
.event-name { color: #fff; font-weight: bold; }
.event-time { color: #f093fb; font-size: 13px; }

.event-desc { font-size: 13px; opacity: 0.7; margin-bottom: 15px; }

.event-progress { display: flex; align-items: center; gap: 12px; margin-bottom: 15px; }
.progress-bar { flex: 1; height: 10px; background: rgba(255,255,255,0.1); border-radius: 5px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); }
.progress-text { color: #f093fb; font-size: 13px; font-weight: bold; }

.claim-btn {
  width: 100%; padding: 14px;
  background: linear-gradient(135deg, #f093fb, #f5576c);
  border: none; border-radius: 12px; color: #fff; font-weight: bold; cursor: pointer;
}

.claimed { text-align: center; color: #4caf50; font-weight: bold; }

/* 节日 */
.festival-card {
  display: flex; align-items: center; gap: 20px;
  background: linear-gradient(135deg, rgba(244,67,54,0.15), rgba(255,152,0,0.15));
  padding: 25px; border-radius: 15px;
}

.festival-icon { font-size: 50px; }
.festival-info { flex: 1; }
.festival-info .name { display: block; color: #fff; font-size: 18px; font-weight: bold; }
.festival-info .desc { font-size: 13px; opacity: 0.7; }

.join-btn {
  padding: 12px 30px;
  background: linear-gradient(135deg, #ff9800, #ff5722);
  border: none; border-radius: 25px; color: #fff; font-weight: bold; cursor: pointer;
}
</style>
