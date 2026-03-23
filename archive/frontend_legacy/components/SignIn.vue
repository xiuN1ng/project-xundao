<template>
  <div class="signin-panel">
    <div class="panel-header">
      <div class="title-section">
        <span class="title-icon">📝</span>
        <h2>每日签到</h2>
      </div>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>

    <!-- 签到状态 -->
    <div class="sign-status-section">
      <div class="streak-info">
        <div class="streak-icon">🔥</div>
        <div class="streak-text">
          连续签到 <strong>{{ signInData.currentStreak || 0 }}</strong> 天
        </div>
      </div>
      <div class="today-status" :class="{ signed: signInData.todaySigned }">
        {{ signInData.todaySigned ? '✅ 今日已签到' : '📝 今日未签到' }}
      </div>
    </div>

    <!-- 签到按钮 -->
    <div class="sign-action">
      <button 
        v-if="!signInData.todaySigned"
        class="sign-btn"
        @click="doSignIn"
        :disabled="isSigning"
      >
        <span class="btn-icon">{{ isSigning ? '⏳' : '✨' }}</span>
        <span class="btn-text">{{ isSigning ? '签到中...' : '立即签到' }}</span>
        <span class="btn-reward" v-if="todayReward">+{{ todayReward }}</span>
      </button>
      <div v-else class="signed-badge">
        <span class="badge-icon">🎉</span>
        <span class="badge-text">今日已签到</span>
        <div class="signed-hint">明天再来领取更多奖励吧~</div>
      </div>
    </div>

    <!-- 7天签到奖励列表 -->
    <div class="rewards-section">
      <div class="section-title">
        <span>🎁</span> 7天签到奖励
      </div>
      <div class="rewards-grid">
        <div 
          v-for="(reward, index) in signInData.rewards" 
          :key="index"
          class="reward-item"
          :class="{ 
            signed: reward.signed,
            today: reward.isToday && !signInData.todaySigned,
            claimable: reward.canClaim
          }"
          @click="claimReward(reward)"
        >
          <div class="day-label">第{{ index + 1 }}天</div>
          <div class="reward-content">
            <span class="reward-icon">{{ reward.icon || '💰' }}</span>
            <span class="reward-amount">{{ reward.amount }}</span>
            <span class="reward-unit">{{ reward.unit || '灵石' }}</span>
          </div>
          <div class="reward-status">
            <span v-if="reward.signed" class="status-signed">✓</span>
            <span v-else-if="reward.canClaim" class="status-claim">领</span>
            <span v-else-if="reward.isToday && !signInData.todaySigned" class="status-today"></span>
          </div>
        </div>
      </div>
    </div>

    <!-- 累计签到奖励 -->
    <div class="cumulative-section" v-if="signInData.cumulativeRewards && signInData.cumulativeRewards.length > 0">
      <div class="section-title">
        <span>🏆</span> 累计签到奖励
      </div>
      <div class="cumulative-list">
        <div 
          v-for="(cumReward, index) in signInData.cumulativeRewards" 
          :key="index"
          class="cumulative-item"
          :class="{ 
            claimed: cumReward.claimed,
            claimable: signInData.currentStreak >= cumReward.days && !cumReward.claimed
          }"
          @click="claimCumulativeReward(cumReward)"
        >
          <div class="cum-days">{{ cumReward.days }}天</div>
          <div class="cum-reward">
            <span class="cum-icon">{{ cumReward.icon }}</span>
            <span class="cum-name">{{ cumReward.name }}</span>
          </div>
          <div class="cum-action">
            <span v-if="cumReward.claimed || signInData.currentStreak < cumReward.days">✓</span>
            <span v-else class="claim-btn">领</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SignInPanel',
  emits: ['close'],
  data() {
    return {
      loading: false,
      isSigning: false,
      playerId: null,
      signInData: {
        currentStreak: 0,
        todaySigned: false,
        rewards: [],
        cumulativeRewards: []
      },
      todayReward: 0
    };
  },
  async mounted() {
    // 获取玩家ID
    this.playerId = window.gamePlayerId || 1;
    
    // 加载签到配置和状态
    await this.loadConfig();
    await this.loadSignInStatus();
  },
  methods: {
    // 加载签到配置
    async loadConfig() {
      try {
        const response = await fetch('/api/welfare/config');
        const result = await response.json();
        
        if (result.success && result.data) {
          // 设置7天签到奖励
          if (result.data.rewards) {
            const today = new Date().getDay();
            this.signInData.rewards = result.data.rewards.map((r, index) => ({
              ...r,
              isToday: index === today,
              signed: false,
              canClaim: false
            }));
          }
          
          // 设置累计签到奖励
          if (result.data.cumulativeRewards) {
            this.signInData.cumulativeRewards = result.data.cumulativeRewards.map(r => ({
              ...r,
              claimed: false
            }));
          }
          
          // 今日奖励
          this.todayReward = result.data.todayReward || 0;
        }
      } catch (error) {
        console.error('加载签到配置失败:', error);
        // 使用默认配置
        this.setDefaultRewards();
      }
    },
    
    // 设置默认奖励
    setDefaultRewards() {
      const defaultRewards = [
        { amount: 100, unit: '灵石', icon: '💰' },
        { amount: 150, unit: '灵石', icon: '💰' },
        { amount: 200, unit: '灵石', icon: '💰' },
        { amount: 5, unit: '经验丹', icon: '⚗️' },
        { amount: 250, unit: '灵石', icon: '💰' },
        { amount: 300, unit: '灵石', icon: '💰' },
        { amount: 10, unit: '钻石', icon: '💎' }
      ];
      
      const today = new Date().getDay();
      this.signInData.rewards = defaultRewards.map((r, index) => ({
        ...r,
        isToday: index === today,
        signed: false,
        canClaim: false
      }));
      
      this.signInData.cumulativeRewards = [
        { days: 7, icon: '💰', name: '500灵石', claimed: false },
        { days: 14, icon: '⚗️', name: '中级经验丹x3', claimed: false },
        { days: 21, icon: '💎', name: '50钻石', claimed: false },
        { days: 30, icon: '🎁', name: '豪华礼包', claimed: false }
      ];
      
      this.todayReward = defaultRewards[today]?.amount || 100;
    },
    
    // 加载签到状态
    async loadSignInStatus() {
      this.loading = true;
      try {
        const response = await fetch(`/api/welfare/sign-in?player_id=${this.playerId}`);
        const result = await response.json();
        
        if (result.success && result.data) {
          this.signInData.currentStreak = result.data.currentStreak || 0;
          this.signInData.todaySigned = result.data.todaySigned || false;
          
          // 更新奖励签到状态
          if (result.data.signedDays && this.signInData.rewards.length > 0) {
            this.signInData.rewards = this.signInData.rewards.map((r, index) => ({
              ...r,
              signed: result.data.signedDays.includes(index + 1)
            }));
          }
          
          // 更新累计奖励状态
          if (result.data.cumulativeClaimed) {
            this.signInData.cumulativeRewards = this.signInData.cumulativeRewards.map(r => ({
              ...r,
              claimed: result.data.cumulativeClaimed.includes(r.days)
            }));
          }
          
          // 检查哪些奖励可以领取
          this.updateClaimableRewards();
        }
      } catch (error) {
        console.error('加载签到状态失败:', error);
      } finally {
        this.loading = false;
      }
    },
    
    // 更新可领取的奖励
    updateClaimableRewards() {
      // 今天还没签到，当日奖励可领取
      const today = new Date().getDay();
      if (!this.signInData.todaySigned && this.signInData.rewards[today]) {
        this.signInData.rewards[today].canClaim = true;
      }
      
      // 累计奖励
      this.signInData.cumulativeRewards = this.signInData.cumulativeRewards.map(r => ({
        ...r,
        canClaim: this.signInData.currentStreak >= r.days && !r.claimed
      }));
    },
    
    // 签到
    async doSignIn() {
      if (this.isSigning || this.signInData.todaySigned) return;
      
      this.isSigning = true;
      try {
        const response = await fetch('/api/welfare/claim-sign-in', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            player_id: this.playerId
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          this.signInData.todaySigned = true;
          this.signInData.currentStreak = result.data?.streak || this.signInData.currentStreak + 1;
          
          // 更新签到状态
          const today = new Date().getDay();
          if (this.signInData.rewards[today]) {
            this.signInData.rewards[today].signed = true;
            this.signInData.rewards[today].canClaim = false;
          }
          
          // 显示奖励提示
          const reward = result.data?.reward || this.todayReward;
          this.showToast(`签到成功！连续签到${this.signInData.currentStreak}天，获得${reward}灵石`, 'success');
          
          // 更新可领取状态
          this.updateClaimableRewards();
          
          // 刷新玩家数据
          if (typeof updatePlayerDisplay === 'function') {
            updatePlayerDisplay();
          }
        } else {
          this.showToast(result.message || '签到失败', 'error');
        }
      } catch (error) {
        console.error('签到失败:', error);
        this.showToast('签到失败，请重试', 'error');
      } finally {
        this.isSigning = false;
      }
    },
    
    // 领取单日奖励
    async claimReward(reward) {
      if (!reward.canClaim || this.signInData.todaySigned) return;
      
      // 如果今日未签到，触发签到
      if (!this.signInData.todaySigned) {
        await this.doSignIn();
      }
    },
    
    // 领取累计签到奖励
    async claimCumulativeReward(cumReward) {
      if (this.signInData.currentStreak < cumReward.days || cumReward.claimed) return;
      
      try {
        const response = await fetch('/api/welfare/claim-sign-in', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            player_id: this.playerId,
            type: 'cumulative',
            days: cumReward.days
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          cumReward.claimed = true;
          cumReward.canClaim = false;
          this.showToast(`累计${cumReward.days}天奖励领取成功！`, 'success');
          
          // 刷新玩家数据
          if (typeof updatePlayerDisplay === 'function') {
            updatePlayerDisplay();
          }
        } else {
          this.showToast(result.message || '领取失败', 'error');
        }
      } catch (error) {
        console.error('领取累计奖励失败:', error);
        this.showToast('领取失败，请重试', 'error');
      }
    },
    
    // 显示提示
    showToast(message, type = 'info') {
      if (typeof showToast === 'function') {
        showToast(message, type);
      } else {
        alert(message);
      }
    }
  }
};
</script>

<style>
.signin-panel {
  background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  width: 90%;
  max-width: 480px;
  max-height: 85vh;
  overflow: hidden;
  color: #e8e8f0;
  position: relative;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(90deg, rgba(0, 255, 136, 0.1), transparent);
  border-bottom: 1px solid rgba(0, 255, 136, 0.2);
}

.title-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  font-size: 24px;
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
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

/* 签到状态 */
.sign-status-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.05);
  margin: 16px;
  border-radius: 12px;
}

.streak-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.streak-icon {
  font-size: 28px;
}

.streak-text {
  font-size: 14px;
  color: #aaa;
}

.streak-text strong {
  color: #ffd700;
  font-size: 20px;
}

.today-status {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  background: rgba(255, 68, 68, 0.2);
  color: #ff4444;
}

.today-status.signed {
  background: rgba(0, 255, 136, 0.2);
  color: #00ff88;
}

/* 签到按钮 */
.sign-action {
  padding: 0 16px;
  margin-bottom: 16px;
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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
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

.btn-icon {
  font-size: 20px;
}

.btn-reward {
  color: #006633;
  font-size: 14px;
}

.signed-badge {
  text-align: center;
  padding: 20px;
  background: linear-gradient(135deg, rgba(0, 255, 136, 0.1), rgba(0, 204, 106, 0.1));
  border-radius: 12px;
  border: 1px solid rgba(0, 255, 136, 0.3);
}

.badge-icon {
  font-size: 32px;
  display: block;
  margin-bottom: 8px;
}

.badge-text {
  font-size: 18px;
  color: #00ff88;
  font-weight: bold;
}

.signed-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #888;
}

/* 奖励列表 */
.rewards-section, .cumulative-section {
  padding: 0 16px;
  margin-bottom: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #ffd700;
  margin-bottom: 12px;
  padding-left: 4px;
}

.rewards-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.reward-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 10px 6px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s;
  cursor: pointer;
  position: relative;
}

.reward-item.signed {
  background: rgba(0, 255, 136, 0.1);
  border-color: rgba(0, 255, 136, 0.3);
}

.reward-item.today {
  border-color: #ffd700;
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
}

.reward-item.claimable {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

.day-label {
  font-size: 11px;
  color: #888;
  margin-bottom: 4px;
}

.reward-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.reward-icon {
  font-size: 18px;
}

.reward-amount {
  font-size: 14px;
  font-weight: bold;
  color: #fff;
}

.reward-unit {
  font-size: 10px;
  color: #aaa;
}

.reward-status {
  position: absolute;
  top: 4px;
  right: 4px;
}

.status-signed {
  color: #00ff88;
  font-size: 12px;
  font-weight: bold;
}

.status-claim {
  display: inline-block;
  width: 16px;
  height: 16px;
  line-height: 16px;
  text-align: center;
  background: #ffd700;
  color: #000;
  border-radius: 50%;
  font-size: 10px;
  font-weight: bold;
}

.status-today {
  display: inline-block;
  width: 8px;
  height: 8px;
  background: #ffd700;
  border-radius: 50%;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* 累计奖励 */
.cumulative-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cumulative-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.3s;
}

.cumulative-item.claimed {
  background: rgba(0, 255, 136, 0.1);
  border-color: rgba(0, 255, 136, 0.3);
}

.cumulative-item.claimable {
  border-color: #ffd700;
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.2);
}

.cum-days {
  font-size: 14px;
  font-weight: bold;
  color: #ffd700;
  min-width: 50px;
}

.cum-reward {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
}

.cum-icon {
  font-size: 20px;
}

.cum-name {
  font-size: 13px;
  color: #fff;
}

.cum-action {
  min-width: 40px;
  text-align: center;
}

.cum-action span {
  color: #888;
}

.claim-btn {
  display: inline-block;
  padding: 4px 12px;
  background: #ffd700;
  color: #000;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

/* 加载状态 */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #00ff88;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
