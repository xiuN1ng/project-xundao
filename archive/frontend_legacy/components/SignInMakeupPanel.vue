<template>
  <div class="signin-makeup-panel">
    <div class="panel-header">
      <h2>📅 每日签到</h2>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>
    
    <div class="panel-content">
      <!-- 签到状态 -->
      <div class="sign-status">
        <div class="streak-info">
          <div class="streak-icon">🔥</div>
          <div class="streak-value">{{ streak }}</div>
          <div class="streak-label">连续签到</div>
        </div>
        
        <div class="today-status" :class="{ signed: todaySigned }">
          <span v-if="todaySigned">✅ 今日已签到</span>
          <span v-else>📝 今日未签到</span>
        </div>
      </div>
      
      <!-- 签到按钮 -->
      <button 
        v-if="!todaySigned"
        class="sign-btn"
        @click="doSignIn"
        :disabled="signing"
      >
        {{ signing ? '签到中...' : '📝 立即签到' }}
      </button>
      
      <!-- 补签区域 -->
      <div class="makeup-section" v-if="canMakeup || daysMissed > 0">
        <div class="makeup-header">
          <h4>📍 补签功能</h4>
        </div>
        
        <div class="makeup-info" v-if="daysMissed > 0">
          <div class="missed-days">
            <span class="label">漏签天数：</span>
            <span class="value">{{ daysMissed }} 天</span>
          </div>
          <div class="makeup-cost">
            <span class="label">补签费用：</span>
            <span class="value" :class="{ insufficient: !canMakeup }">
              {{ makeupCost }} 灵石/天
            </span>
          </div>
        </div>
        
        <div class="no-makeup" v-else-if="!canMakeup && daysMissed === 0">
          <span>✅ 没有可补签的天数</span>
        </div>
        
        <div class="makeup-options" v-if="daysMissed > 0">
          <div class="option-label">选择补签天数：</div>
          <div class="option-buttons">
            <button 
              v-for="n in Math.min(daysMissed, 7)" 
              :key="n"
              class="option-btn"
              :class="{ active: makeupDays === n }"
              @click="makeupDays = n"
            >
              {{ n }}天
            </button>
          </div>
          
          <div class="total-cost">
            总计：<span class="cost-value">{{ makeupDays * makeupCost }} 灵石</span>
          </div>
          
          <button 
            class="makeup-btn"
            @click="doMakeup"
            :disabled="!canMakeup || makeupDays === 0"
          >
            💰 立即补签
          </button>
        </div>
      </div>
      
      <!-- 签到奖励预览 -->
      <div class="rewards-preview">
        <h4>🎁 签到奖励</h4>
        <div class="reward-list">
          <div class="reward-item" v-for="(reward, idx) in rewards" :key="idx">
            <span class="day">第{{ idx + 1 }}天</span>
            <span class="reward-value">
              <template v-if="reward.spirit_stones">{{ reward.spirit_stones }}灵石</template>
              <template v-else-if="reward.exp_pill_small">经验丹x{{ reward.exp_pill_small }}</template>
              <template v-else>随机</template>
            </span>
          </div>
        </div>
      </div>
      
      <!-- 累计签到奖励 -->
      <div class="cumulative-rewards">
        <h4>🏆 累计签到奖励</h4>
        <div class="cumulative-list">
          <div 
            v-for="(cumReward, idx) in cumulativeRewards" 
            :key="idx"
            class="cumulative-item"
            :class="{ claimed: streak >= cumReward.days }"
          >
            <span class="days">{{ cumReward.days }}天</span>
            <span class="reward">{{ cumReward.reward }}</span>
            <span class="status" v-if="streak >= cumReward.days">✅</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SignInMakeupPanel',
  emits: ['close'],
  data() {
    return {
      streak: 0,
      todaySigned: false,
      canMakeup: false,
      daysMissed: 0,
      makeupCost: 50,
      makeupDays: 1,
      signing: false,
      rewards: [
        { spirit_stones: 50 },
        { spirit_stones: 80 },
        { spirit_stones: 100 },
        { exp_pill_small: 3 },
        { spirit_stones: 150 },
        { spirit_stones: 200 },
        { spirit_stones: 300 }
      ],
      cumulativeRewards: [
        { days: 7, reward: '100灵石' },
        { days: 14, reward: '中级经验丹x3' },
        { days: 21, reward: '500灵石' },
        { days: 30, reward: '稀有装备箱' }
      ]
    };
  },
  async mounted() {
    await this.loadSignInfo();
  },
  methods: {
    async loadSignInfo() {
      try {
        const playerId = window.gamePlayerId || 1;
        
        // 模拟数据
        const playerData = JSON.parse(localStorage.getItem('playerData') || '{}');
        const now = Date.now();
        const lastClaim = playerData.last_daily_claim || 0;
        
        // 计算签到状态
        const today = new Date(now).setHours(0, 0, 0, 0);
        const lastClaimDay = new Date(lastClaim).setHours(0, 0, 0, 0);
        
        this.streak = playerData.daily_streak || 0;
        this.todaySigned = today === lastClaimDay;
        
        // 计算漏签天数
        const daysDiff = Math.floor((today - lastClaimDay) / (24 * 60 * 60 * 1000));
        this.daysMissed = daysDiff > 1 ? Math.min(daysDiff - 1, 7) : 0;
        this.canMakeup = this.daysMissed > 0 && this.daysMissed <= 7;
        this.makeupCost = 50;
        
        // 尝试从API获取补签信息
        try {
          const response = await fetch(`/api/signin/makeup-info?playerId=${playerId}`);
          const result = await response.json();
          
          if (result.success) {
            this.canMakeup = result.data.canMakeup;
            this.daysMissed = result.data.daysMissed;
            this.makeupCost = result.data.makeupCost;
          }
        } catch (e) {
          // 使用本地计算
        }
      } catch (e) {
        console.error('加载签到信息失败:', e);
      }
    },
    async doSignIn() {
      if (this.signing || this.todaySigned) return;
      
      this.signing = true;
      
      try {
        const playerId = window.gamePlayerId || 1;
        
        // 模拟签到
        const playerData = JSON.parse(localStorage.getItem('playerData') || '{}');
        const now = Date.now();
        const lastClaim = playerData.last_daily_claim || 0;
        
        const today = new Date(now).setHours(0, 0, 0, 0);
        const lastClaimDay = new Date(lastClaim).setHours(0, 0, 0, 0);
        const dayDiff = Math.floor((today - lastClaimDay) / (24 * 60 * 60 * 1000));
        
        // 更新连续签到
        playerData.daily_streak = dayDiff <= 1 ? (playerData.daily_streak || 0) + 1 : 1;
        playerData.last_daily_claim = now;
        
        // 发放奖励
        const dayOfWeek = new Date().getDay();
        const reward = this.rewards[Math.min(dayOfWeek, 6)];
        
        playerData.spirit_stones = (playerData.spirit_stones || 0) + (reward.spirit_stones || 0);
        
        localStorage.setItem('playerData', JSON.stringify(playerData));
        
        this.streak = playerData.daily_streak;
        this.todaySigned = true;
        
        alert('✅ 签到成功！连续签到' + this.streak + '天，获得' + (reward.spirit_stones || 0) + '灵石');
        
        // 刷新页面显示
        if (typeof updatePlayerDisplay === 'function') {
          updatePlayerDisplay();
        }
      } catch (e) {
        console.error('签到失败:', e);
        alert('❌ 签到失败，请重试');
      } finally {
        this.signing = false;
      }
    },
    async doMakeup() {
      if (!this.canMakeup || this.makeupDays === 0) return;
      
      const cost = this.makeupDays * this.makeupCost;
      const confirmMsg = `确定要补签${this.makeupDays}天吗？\n将消耗${cost}灵石`;
      
      if (!confirm(confirmMsg)) return;
      
      try {
        const playerId = window.gamePlayerId || 1;
        
        // 模拟补签
        const playerData = JSON.parse(localStorage.getItem('playerData') || '{}');
        
        if ((playerData.spirit_stones || 0) < cost) {
          alert('❌ 灵石不足');
          return;
        }
        
        playerData.spirit_stones -= cost;
        playerData.daily_streak = (playerData.daily_streak || 0) + this.makeupDays;
        playerData.last_daily_claim = Date.now();
        
        // 发放补签奖励
        const reward = this.makeupDays * 30;
        playerData.spirit_stones += reward;
        
        localStorage.setItem('playerData', JSON.stringify(playerData));
        
        this.streak = playerData.daily_streak;
        this.daysMissed = 0;
        this.canMakeup = false;
        
        alert('✅ 补签成功！补签' + this.makeupDays + '天，消耗' + cost + '灵石，获得' + reward + '灵石奖励');
        
        if (typeof updatePlayerDisplay === 'function') {
          updatePlayerDisplay();
        }
      } catch (e) {
        console.error('补签失败:', e);
        alert('❌ 补签失败，请重试');
      }
    }
  }
};
</script>

<style>
.signin-makeup-panel {
  background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  width: 90%;
  max-width: 400px;
  max-height: 80vh;
  overflow: hidden;
  color: #e8e8f0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(90deg, rgba(0, 255, 136, 0.1), transparent);
  border-bottom: 1px solid rgba(0, 255, 136, 0.2);
}

.panel-header h2 {
  margin: 0;
  font-size: 18px;
  color: #00ff88;
}

.close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 20px;
  cursor: pointer;
}

.panel-content {
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
}

.sign-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
}

.streak-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.streak-icon {
  font-size: 24px;
}

.streak-value {
  font-size: 28px;
  font-weight: bold;
  color: #ffd700;
}

.streak-label {
  font-size: 12px;
  color: #888;
}

.today-status {
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 13px;
  background: rgba(255, 68, 68, 0.2);
  color: #ff4444;
}

.today-status.signed {
  background: rgba(0, 255, 136, 0.2);
  color: #00ff88;
}

.sign-btn {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #00ff88, #00cc6a);
  border: none;
  border-radius: 12px;
  color: #000;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 20px;
}

.sign-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 255, 136, 0.4);
}

.sign-btn:disabled {
  background: #444;
  color: #888;
  cursor: not-allowed;
}

.makeup-section {
  background: rgba(255, 215, 0, 0.1);
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
}

.makeup-header h4 {
  margin: 0 0 12px;
  color: #ffd700;
  font-size: 14px;
}

.makeup-info {
  margin-bottom: 16px;
}

.missed-days, .makeup-cost {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  margin-bottom: 8px;
}

.label {
  color: #aaa;
}

.value {
  color: #fff;
}

.value.insufficient {
  color: #ff4444;
}

.no-makeup {
  text-align: center;
  padding: 12px;
  color: #00ff88;
  font-size: 13px;
}

.option-label {
  font-size: 12px;
  color: #aaa;
  margin-bottom: 8px;
}

.option-buttons {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.option-btn {
  flex: 1;
  padding: 8px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: #aaa;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.option-btn.active {
  background: rgba(255, 215, 0, 0.2);
  border-color: #ffd700;
  color: #ffd700;
}

.total-cost {
  text-align: center;
  font-size: 14px;
  margin-bottom: 12px;
  color: #aaa;
}

.cost-value {
  color: #ffd700;
  font-weight: bold;
}

.makeup-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  border: none;
  border-radius: 8px;
  color: #000;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.makeup-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.makeup-btn:disabled {
  background: #444;
  color: #888;
  cursor: not-allowed;
}

.rewards-preview, .cumulative-rewards {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
}

.rewards-preview h4, .cumulative-rewards h4 {
  margin: 0 0 12px;
  font-size: 13px;
  color: #ffd700;
}

.reward-list, .cumulative-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.reward-item, .cumulative-item {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  padding: 6px 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.reward-item .day, .cumulative-item .days {
  color: #888;
}

.reward-item .reward-value, .cumulative-item .reward {
  color: #00ff88;
}

.cumulative-item.claimed {
  background: rgba(0, 255, 136, 0.1);
}

.cumulative-item .status {
  color: #00ff88;
}
</style>
