<template>
  <div class="welfare-panel">
    <div class="panel-header">
      <div class="title-section">
        <span class="title-icon">🎁</span>
        <h2>福利中心</h2>
      </div>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>
    
    <!-- 一键领取按钮 -->
    <div class="claim-all-section" v-if="canClaimAny">
      <button class="claim-all-btn" @click="claimAll">
        <span class="btn-icon">✨</span>
        <span class="btn-text">一键领取</span>
        <span class="claim-count" v-if="totalCanClaim > 0">{{ totalCanClaim }}</span>
      </button>
    </div>
    
    <!-- 标签页 -->
    <div class="welfare-tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-name">{{ tab.name }}</span>
        <span class="tab-badge" v-if="getTabClaimCount(tab.id) > 0">{{ getTabClaimCount(tab.id) }}</span>
      </button>
    </div>
    
    <!-- 每日签到 -->
    <div class="tab-content" v-if="activeTab === 'daily'">
      <div class="daily-sign-section">
        <div class="sign-header">
          <div class="sign-info">
            <span class="streak-icon">🔥</span>
            <span class="streak-text">连续签到 <strong>{{ dailySign.currentStreak }}</strong> 天</span>
          </div>
          <div class="sign-status" :class="{ signed: dailySign.todaySigned }">
            {{ dailySign.todaySigned ? '✅ 今日已签到' : '📝 今日未签到' }}
          </div>
        </div>
        
        <!-- 签到按钮 -->
        <button 
          v-if="!dailySign.todaySigned"
          class="sign-now-btn"
          @click="doDailySign"
          :class="{ signing: isSigning }"
          :disabled="isSigning"
        >
          <span class="sign-btn-icon">{{ isSigning ? '⏳' : '✨' }}</span>
          <span class="sign-btn-text">{{ isSigning ? '签到中...' : '立即签到' }}</span>
          <span class="sign-btn-reward">+{{ todayReward }}灵石</span>
        </button>
        
        <!-- 已签到状态 -->
        <div v-else class="signed-status">
          <div class="signed-badge">
            <span class="badge-icon">🎉</span>
            <span class="badge-text">今日已签到</span>
          </div>
          <div class="signed-reward-hint">明天再来领取更多奖励吧~</div>
        </div>
        
        <!-- 签到日历 -->
        <div class="sign-calendar">
          <div class="calendar-title">📅 本月签到</div>
          <div class="calendar-days">
            <div 
              v-for="day in dailySign.rewards" 
              :key="day.day"
              class="calendar-day"
              :class="{ 
                signed: day.signed, 
                today: day.isToday,
                future: day.isFuture 
              }"
            >
              <div class="day-number">{{ day.day }}日</div>
              <div class="day-reward">
                <span class="reward-icon">{{ day.icon }}</span>
                <span class="reward-amount">{{ day.amount }}</span>
              </div>
              <div class="day-status">
                <span v-if="day.signed">✓</span>
                <span v-else-if="day.isToday && !dailySign.todaySigned" class="today-dot"></span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 累计签到奖励 -->
        <div class="cumulative-section">
          <div class="section-title">🏆 累计签到奖励</div>
          <div class="cumulative-rewards">
            <div 
              v-for="reward in dailySign.cumulativeRewards" 
              :key="reward.days"
              class="cumulative-item"
              :class="{ claimed: dailySign.currentStreak >= reward.days, claimable: dailySign.currentStreak >= reward.days && !reward.claimed }"
              @click="claimCumulativeReward(reward)"
            >
              <div class="cum-days">{{ reward.days }}天</div>
              <div class="cum-reward">
                <span class="cum-icon">{{ reward.icon }}</span>
                <span class="cum-name">{{ reward.name }}</span>
              </div>
              <div class="cum-action">
                <span v-if="reward.claimed || dailySign.currentStreak < reward.days">✓</span>
                <span v-else class="claim-dot">领</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 月卡 -->
    <div class="tab-content" v-if="activeTab === 'month-card'">
      <div class="month-card-section">
        <div class="month-cards">
          <!-- 终身月卡 -->
          <div class="month-card" :class="{ owned: monthCardStatus.lifetime }">
            <div class="card-badge" v-if="monthCardStatus.lifetime">✓ 已购买</div>
            
            <div class="card-header">
              <div class="card-icon">👑</div>
              <div class="card-title">
                <span class="name">终身月卡</span>
                <span class="tag">永久有效</span>
              </div>
            </div>
            
            <div class="card-rewards">
              <div class="reward-title">每日奖励</div>
              <div class="reward-items">
                <div class="reward-item">
                  <span class="reward-icon">💰</span>
                  <span class="reward-amount">+10,000</span>
                  <span class="reward-label">灵石</span>
                </div>
                <div class="reward-item">
                  <span class="reward-icon">💎</span>
                  <span class="reward-amount">+50</span>
                  <span class="reward-label">钻石</span>
                </div>
              </div>
            </div>
            
            <div class="card-price">
              <span class="price-label">售价</span>
              <span class="price-value">
                <span class="icon">💎</span>
                300
              </span>
            </div>
            
            <!-- 领取状态 -->
            <div v-if="monthCardStatus.lifetime" class="claim-section">
              <div class="claim-info">
                <span class="claim-status" :class="{ claimed: monthCardStatus.lifetimeClaimed }">
                  {{ monthCardStatus.lifetimeClaimed ? '✓ 今日已领取' : '可领取' }}
                </span>
                <span class="claim-days">已领取 {{ monthCardStatus.lifetimeDays || 0 }} 天</span>
              </div>
              <button 
                class="claim-btn" 
                :class="{ disabled: monthCardStatus.lifetimeClaimed }"
                :disabled="monthCardStatus.lifetimeClaimed"
                @click="claimMonthCardReward('lifetime')">
                {{ monthCardStatus.lifetimeClaimed ? '已领取' : '立即领取' }}
              </button>
            </div>
            
            <button v-else class="buy-btn" @click="buyMonthCard('lifetime')">
              <span>立即购买</span>
            </button>
          </div>
          
          <!-- 贵族月卡 -->
          <div class="month-card noble" :class="{ owned: monthCardStatus.noble }">
            <div class="card-badge" v-if="monthCardStatus.noble">✓ 已购买</div>
            
            <div class="card-header">
              <div class="card-icon">🏆</div>
              <div class="card-title">
                <span class="name">贵族月卡</span>
                <span class="tag">30天有效期</span>
              </div>
            </div>
            
            <div class="card-rewards">
              <div class="reward-title">每日奖励</div>
              <div class="reward-items">
                <div class="reward-item">
                  <span class="reward-icon">💰</span>
                  <span class="reward-amount">+50,000</span>
                  <span class="reward-label">灵石</span>
                </div>
                <div class="reward-item">
                  <span class="reward-icon">💎</span>
                  <span class="reward-amount">+100</span>
                  <span class="reward-label">钻石</span>
                </div>
                <div class="reward-item special">
                  <span class="reward-icon">🎁</span>
                  <span class="reward-amount">+10</span>
                  <span class="reward-label">灵玉</span>
                </div>
              </div>
            </div>
            
            <div class="card-price">
              <span class="price-label">售价</span>
              <span class="price-value">
                <span class="icon">💎</span>
                98
              </span>
            </div>
            
            <!-- 领取状态 -->
            <div v-if="monthCardStatus.noble" class="claim-section">
              <div class="claim-info">
                <span class="claim-status" :class="{ claimed: monthCardStatus.nobleClaimed }">
                  {{ monthCardStatus.nobleClaimed ? '✓ 今日已领取' : '可领取' }}
                </span>
                <span class="claim-days" v-if="monthCardStatus.nobleDays">
                  剩余 {{ monthCardStatus.nobleDays }} 天
                </span>
              </div>
              <button 
                class="claim-btn" 
                :class="{ disabled: monthCardStatus.nobleClaimed }"
                :disabled="monthCardStatus.nobleClaimed"
                @click="claimMonthCardReward('noble')">
                {{ monthCardStatus.nobleClaimed ? '已领取' : '立即领取' }}
              </button>
            </div>
            
            <button v-else class="buy-btn" @click="buyMonthCard('noble')">
              <span>立即购买</span>
            </button>
          </div>
        </div>
        
        <!-- 特权说明 -->
        <div class="privilege-info">
          <h4>💡 特权说明</h4>
          <ul>
            <li>终身月卡：一次性购买，永久享受每日奖励</li>
            <li>贵族月卡：30天有效期内每日领取高额奖励</li>
            <li>两种月卡奖励可叠加领取</li>
            <li>月卡每日0点刷新领取状态</li>
          </ul>
        </div>
      </div>
    </div>
    
    <!-- 等级礼包 -->
    <div class="tab-content" v-if="activeTab === 'level'">
      <div class="level-rewards-section">
        <div class="section-header">
          <span class="section-icon">📦</span>
          <span class="section-title">等级礼包</span>
          <span class="current-level">当前境界: {{ playerLevel }}级</span>
        </div>
        
        <div class="level-rewards-list">
          <div 
            v-for="reward in levelRewards" 
            :key="reward.level"
            class="level-reward-item"
            :class="{ 
              available: playerLevel >= reward.level && !reward.claimed,
              claimed: reward.claimed,
              locked: playerLevel < reward.level
            }"
            @click="claimLevelReward(reward)"
          >
            <div class="level-badge">
              <span class="level-num">{{ reward.level }}</span>
              <span class="level-unit">级</span>
            </div>
            <div class="level-reward-content">
              <div class="reward-items">
                <span v-for="(item, idx) in reward.items" :key="idx" class="reward-item">
                  {{ item.icon }} {{ item.name }}x{{ item.amount }}
                </span>
              </div>
              <div class="level-status">
                <span v-if="reward.claimed" class="status-claimed">已领取</span>
                <span v-else-if="playerLevel >= reward.level" class="status-available">可领取</span>
                <span v-else class="status-locked">等级不足</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 成就奖励 -->
    <div class="tab-content" v-if="activeTab === 'achievement'">
      <div class="achievement-rewards-section">
        <div class="section-header">
          <span class="section-icon">🏅</span>
          <span class="section-title">成就奖励</span>
        </div>
        
        <div class="achievement-categories">
          <button 
            v-for="cat in achievementCategories" 
            :key="cat.id"
            class="category-btn"
            :class="{ active: activeCategory === cat.id }"
            @click="activeCategory = cat.id"
          >
            {{ cat.icon }} {{ cat.name }}
          </button>
        </div>
        
        <div class="achievement-list">
          <div 
            v-for="achievement in filteredAchievements" 
            :key="achievement.id"
            class="achievement-item"
            :class="{ completed: achievement.completed, claimable: achievement.canClaim }"
          >
            <div class="achievement-icon">
              <span :class="achievement.iconClass">{{ achievement.icon }}</span>
            </div>
            <div class="achievement-info">
              <div class="achievement-name">{{ achievement.name }}</div>
              <div class="achievement-desc">{{ achievement.description }}</div>
              <div class="achievement-progress" v-if="!achievement.completed">
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: achievement.progress + '%' }"></div>
                </div>
                <span class="progress-text">{{ achievement.current }}/{{ achievement.target }}</span>
              </div>
            </div>
            <div class="achievement-reward">
              <span v-for="(item, idx) in achievement.rewards" :key="idx" class="reward-icon">
                {{ item.icon }}
              </span>
            </div>
            <button 
              v-if="achievement.canClaim"
              class="claim-btn"
              @click="claimAchievementReward(achievement)"
            >
              领取
            </button>
            <span v-else-if="achievement.completed" class="completed-badge">✓</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 登录奖励 -->
    <div class="tab-content" v-if="activeTab === 'login'">
      <div class="login-rewards-section">
        <div class="section-header">
          <span class="section-icon">🎉</span>
          <span class="section-title">登录奖励</span>
        </div>
        
        <!-- 首充双倍 -->
        <div class="first-recharge-section" v-if="!loginRewards.firstRecharge.claimed">
          <div class="first-recharge-card" :class="{ 'countdown-active': loginRewards.firstRecharge.isActive }">
            <div class="recharge-banner">
              <span class="banner-icon">💎</span>
              <span class="banner-text">首充特惠</span>
              <span class="banner-tag" v-if="loginRewards.firstRecharge.isActive">限时{{ formatCountdown(loginRewards.firstRecharge.countdown) }}</span>
              <span class="banner-tag" v-else>双倍返还</span>
            </div>
            <div class="recharge-content">
              <div class="recharge-info">
                <div class="recharge-amount">
                  <span v-if="firstRechargeConfig.enabled">充值{{ firstRechargeConfig.originalAmount }}元</span>
                  <span v-else>充值任意金额</span>
                </div>
                <!-- 奖励详情 -->
                <div class="recharge-reward-detail" v-if="firstRechargeConfig.enabled">
                  <div class="reward-title">🎁 奖励内容：</div>
                  <div class="reward-list">
                    <span class="reward-item">
                      <span class="item-icon">💰</span>
                      <span class="item-text">双倍灵石 <strong>{{ firstRechargeConfig.rewards?.spirit_stones || 1200 }}</strong></span>
                    </span>
                    <span class="reward-item" v-if="firstRechargeConfig.rewards?.skill_book_purple">
                      <span class="item-icon">📚</span>
                      <span class="item-text">紫色功法箱 <strong>×{{ firstRechargeConfig.rewards.skill_book_purple }}</strong></span>
                    </span>
                    <span class="reward-item" v-if="firstRechargeConfig.rewards?.strengthening_stone">
                      <span class="item-icon">💎</span>
                      <span class="item-text">强化石 <strong>×{{ firstRechargeConfig.rewards.strengthening_stone }}</strong></span>
                    </span>
                    <span class="reward-item" v-if="firstRechargeConfig.rewards?.linggen_fruit">
                      <span class="item-icon">🍎</span>
                      <span class="item-text">灵根果 <strong>×{{ firstRechargeConfig.rewards.linggen_fruit }}</strong></span>
                    </span>
                    <span class="reward-item title-reward" v-if="firstRechargeConfig.title">
                      <span class="item-icon">👑</span>
                      <span class="item-text">专属称号 <strong>{{ firstRechargeConfig.title }}</strong></span>
                    </span>
                  </div>
                </div>
                <div class="recharge-reward" v-else>
                  <span class="diamond-icon">💎</span>
                  <span class="reward-text">额外获得 <strong>100%</strong> 灵石</span>
                </div>
              </div>
              <button class="recharge-btn" @click="goToRecharge">
                前往充值 🎯
              </button>
            </div>
          </div>
        </div>
        
        <!-- 领取首充奖励按钮 -->
        <div class="first-recharge-claim" v-else-if="loginRewards.firstRecharge.claimed">
          <div class="already-claimed">
            <span class="check-icon">✅</span>
            <span class="claimed-text">首充奖励已领取</span>
          </div>
        </div>
        
        <!-- 次日登录礼包 -->
        <div class="login-day-reward-section" v-if="loginRewards.secondDay && (loginRewards.secondDay.canClaim || loginRewards.secondDay.claimed)">
          <div class="section-subtitle">🎁 次日登录礼包</div>
          <div class="day-reward-card" :class="{ claimed: loginRewards.secondDay.claimed, claimable: loginRewards.secondDay.canClaim }">
            <div class="day-reward-items">
              <span v-for="(item, idx) in loginRewards.secondDay.items" :key="idx" class="day-reward-item">
                {{ item.icon }} {{ item.name }}x{{ item.amount }}
              </span>
            </div>
            <button v-if="loginRewards.secondDay.canClaim" class="day-reward-claim-btn" @click="claimSecondDayReward">
              领取
            </button>
            <span v-else-if="loginRewards.secondDay.claimed" class="claimed-badge">✓ 已领取</span>
          </div>
        </div>
        
        <!-- 三日登录礼包 -->
        <div class="login-day-reward-section" v-if="loginRewards.thirdDay && (loginRewards.thirdDay.canClaim || loginRewards.thirdDay.claimed)">
          <div class="section-subtitle">🎁 三日登录礼包</div>
          <div class="day-reward-card" :class="{ claimed: loginRewards.thirdDay.claimed, claimable: loginRewards.thirdDay.canClaim }">
            <div class="day-reward-items">
              <span v-for="(item, idx) in loginRewards.thirdDay.items" :key="idx" class="day-reward-item">
                {{ item.icon }} {{ item.name }}x{{ item.amount }}
              </span>
            </div>
            <button v-if="loginRewards.thirdDay.canClaim" class="day-reward-claim-btn" @click="claimThirdDayReward">
              领取
            </button>
            <span v-else-if="loginRewards.thirdDay.claimed" class="claimed-badge">✓ 已领取</span>
          </div>
        </div>
        
        <!-- 7日登录 -->
        <div class="seven-day-section">
          <div class="section-subtitle">📅 7日登录礼包</div>
          <div class="seven-day-calendar">
            <div 
              v-for="(day, idx) in loginRewards.sevenDay" 
              :key="idx"
              class="seven-day-item"
              :class="{ claimed: day.claimed, today: day.isToday, claimable: day.canClaim }"
            >
              <div class="day-label">第{{ day.day }}天</div>
              <div class="day-rewards">
                <span v-for="(item, i) in day.items" :key="i" class="day-item">
                  {{ item.icon }}
                </span>
              </div>
              <div class="day-status">
                <button v-if="day.canClaim" class="day-claim-btn" @click="claimSevenDayReward(day)">
                  领
                </button>
                <span v-else-if="day.claimed" class="claimed-icon">✓</span>
                <span v-else class="locked-icon">🔒</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 限时登录 -->
        <div class="limited-login-section" v-if="loginRewards.limited">
          <div class="limited-banner">
            <span class="limited-icon">⚡</span>
            <span class="limited-title">{{ loginRewards.limited.title }}</span>
            <span class="limited-time">剩余: {{ loginRewards.limited.remainTime }}</span>
          </div>
          <div class="limited-rewards">
            <div 
              v-for="reward in loginRewards.limited.rewards" 
              :key="reward.day"
              class="limited-item"
              :class="{ claimed: reward.claimed, today: reward.isToday }"
            >
              <div class="limited-day">Day{{ reward.day }}</div>
              <div class="limited-icon">{{ reward.icon }}</div>
              <div class="limited-status">
                <span v-if="reward.claimed">✓</span>
                <span v-else-if="reward.canClaim" class="can-claim">领</span>
                <span v-else>-</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 新手任务 -->
    <div class="tab-content" v-if="activeTab === 'newbie'">
      <div class="newbie-tasks-section">
        <div class="section-header">
          <span class="section-icon">🌱</span>
          <span class="section-title">新手任务</span>
          <span class="task-progress" v-if="newbieTasks.length > 0">
            完成 {{ completedTaskCount }}/{{ newbieTasks.length }}
          </span>
        </div>
        
        <div class="newbie-tasks-list" v-if="newbieTasks.length > 0">
          <div 
            v-for="task in newbieTasks" 
            :key="task.id"
            class="newbie-task-item"
            :class="{ 
              completed: task.completed, 
              claimable: task.canClaim,
              locked: task.locked
            }"
          >
            <div class="task-icon">
              <span>{{ task.icon || '📋' }}</span>
            </div>
            <div class="task-info">
              <div class="task-name">{{ task.name }}</div>
              <div class="task-desc">{{ task.description }}</div>
              <div class="task-progress-bar" v-if="!task.completed && task.target > 0">
                <div class="progress-fill" :style="{ width: (task.current / task.target * 100) + '%' }"></div>
              </div>
              <div class="task-progress-text" v-if="!task.completed && task.target > 0">
                {{ task.current }}/{{ task.target }}
              </div>
            </div>
            <div class="task-rewards">
              <span v-for="(reward, idx) in task.rewards" :key="idx" class="reward-icon">
                {{ reward.icon }} {{ reward.amount }}
              </span>
            </div>
            <button 
              v-if="task.canClaim"
              class="task-claim-btn"
              @click="claimNewbieTask(task.id)"
            >
              领取
            </button>
            <span v-else-if="task.completed" class="completed-icon">✓</span>
            <span v-else-if="task.locked" class="locked-icon">🔒</span>
          </div>
        </div>
        
        <div class="newbie-empty" v-else>
          <div class="empty-icon">🌱</div>
          <div class="empty-text">暂无可用任务</div>
        </div>
        
        <!-- 新手任务说明 -->
        <div class="newbie-tips">
          <h4>💡 任务说明</h4>
          <ul>
            <li>完成新手任务可获得丰厚奖励</li>
            <li>任务进度自动更新</li>
            <li>记得及时领取任务奖励</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'WelfarePanel',
  emits: ['close'],
  data() {
    return {
      activeTab: 'daily',
      activeCategory: 'combat',
      playerLevel: 25,
      isSigning: false,
      todayReward: 0,
      monthCardStatus: {
        lifetime: false,
        lifetimeClaimed: false,
        lifetimeDays: 0,
        noble: false,
        nobleClaimed: false,
        nobleDays: 0
      },
      tabs: [
        { id: 'daily', icon: '📝', name: '每日签到' },
        { id: 'month-card', icon: '💎', name: '月卡' },
        { id: 'level', icon: '📦', name: '等级礼包' },
        { id: 'achievement', icon: '🏅', name: '成就奖励' },
        { id: 'login', icon: '🎁', name: '登录奖励' },
        { id: 'newbie', icon: '🌱', name: '新手任务' }
      ],
      dailySign: {
        currentStreak: 12,
        todaySigned: false,
        rewards: [
          { day: 1, icon: '💰', amount: 100, signed: true, isToday: false, isFuture: false },
          { day: 2, icon: '💰', amount: 150, signed: true, isToday: false, isFuture: false },
          { day: 3, icon: '🎁', amount: 1, signed: true, isToday: false, isFuture: false },
          { day: 4, icon: '💰', amount: 200, signed: true, isToday: false, isFuture: false },
          { day: 5, icon: '⚗️', amount: 5, signed: true, isToday: false, isFuture: false },
          { day: 6, icon: '💰', amount: 250, signed: true, isToday: false, isFuture: false },
          { day: 7, icon: '💎', amount: 10, signed: true, isToday: false, isFuture: false },
          { day: 8, icon: '💰', amount: 300, signed: true, isToday: false, isFuture: false },
          { day: 9, icon: '🎁', amount: 2, signed: true, isToday: false, isFuture: false },
          { day: 10, icon: '💰', amount: 350, signed: true, isToday: false, isFuture: false },
          { day: 11, icon: '📚', amount: 3, signed: true, isToday: false, isFuture: false },
          { day: 12, icon: '💰', amount: 400, signed: true, isToday: false, isFuture: false },
          { day: 13, icon: '💎', amount: 20, signed: false, isToday: true, isFuture: false },
          { day: 14, icon: '💰', amount: 500, signed: false, isToday: false, isFuture: false },
          { day: 15, icon: '🎁', amount: 3, signed: false, isToday: false, isFuture: false },
          { day: 16, icon: '💰', amount: 550, signed: false, isToday: false, isFuture: false },
          { day: 17, icon: '⚗️', amount: 10, signed: false, isToday: false, isFuture: false },
          { day: 18, icon: '💰', amount: 600, signed: false, isToday: false, isFuture: false },
          { day: 19, icon: '💎', amount: 30, signed: false, isToday: false, isFuture: false },
          { day: 20, icon: '🎁', amount: 5, signed: false, isToday: false, isFuture: false },
          { day: 21, icon: '💰', amount: 800, signed: false, isToday: false, isFuture: false },
          { day: 22, icon: '📚', amount: 5, signed: false, isToday: false, isFuture: false },
          { day: 23, icon: '💰', amount: 900, signed: false, isToday: false, isFuture: false },
          { day: 24, icon: '💎', amount: 50, signed: false, isToday: false, isFuture: false },
          { day: 25, icon: '🎁', amount: 10, signed: false, isToday: false, isFuture: false },
          { day: 26, icon: '💰', amount: 1000, signed: false, isToday: false, isFuture: false },
          { day: 27, icon: '⚗️', amount: 15, signed: false, isToday: false, isFuture: false },
          { day: 28, icon: '💰', amount: 1200, signed: false, isToday: false, isFuture: false },
          { day: 29, icon: '💎', amount: 100, signed: false, isToday: false, isFuture: false },
          { day: 30, icon: '👑', amount: 1, signed: false, isToday: false, isFuture: false }
        ],
        cumulativeRewards: [
          { days: 7, icon: '💰', name: '500灵石', claimed: true },
          { days: 14, icon: '⚗️', name: '中级经验丹x3', claimed: true },
          { days: 21, icon: '💎', name: '50钻石', claimed: true },
          { days: 30, icon: '🎁', name: '豪华礼包', claimed: false }
        ]
      },
      levelRewards: [
        { level: 1, items: [{ icon: '💰', name: '灵石', amount: 100 }], claimed: true },
        { level: 5, items: [{ icon: '💰', name: '灵石', amount: 500 }, { icon: '⚗️', name: '经验丹', amount: 3 }], claimed: true },
        { level: 10, items: [{ icon: '💎', name: '钻石', amount: 10 }, { icon: '🎁', name: '新手礼包', amount: 1 }], claimed: true },
        { level: 15, items: [{ icon: '💰', name: '灵石', amount: 2000 }, { icon: '⚗️', name: '中级经验丹', amount: 5 }], claimed: true },
        { level: 20, items: [{ icon: '💎', name: '钻石', amount: 30 }, { icon: '🎁', name: '进阶礼包', amount: 1 }], claimed: false },
        { level: 25, items: [{ icon: '💰', name: '灵石', amount: 5000 }, { icon: '⚗️', name: '高级经验丹', amount: 10 }, { icon: '📚', name: '技能书', amount: 1 }], claimed: false },
        { level: 30, items: [{ icon: '💎', name: '钻石', amount: 50 }, { icon: '🎁', name: '豪华礼包', amount: 1 }], claimed: false },
        { level: 40, items: [{ icon: '👑', name: '称号', amount: 1 }, { icon: '💎', name: '钻石', amount: 100 }], claimed: false },
        { level: 50, items: [{ icon: '🐎', name: '坐骑', amount: 1 }, { icon: '💎', name: '钻石', amount: 200 }], claimed: false }
      ],
      achievementCategories: [
        { id: 'combat', icon: '⚔️', name: '战斗' },
        { id: 'collection', icon: '📦', name: '收集' },
        { id: 'social', icon: '👥', name: '社交' },
        { id: 'explore', icon: '🗺️', name: '探索' }
      ],
      achievements: [
        {
          id: 1,
          category: 'combat',
          name: '初出茅庐',
          description: '击败10只怪物',
          icon: '⚔️',
          iconClass: 'icon-combat',
          current: 10,
          target: 10,
          progress: 100,
          completed: true,
          canClaim: true,
          rewards: [{ icon: '💰', name: '灵石', amount: 100 }]
        },
        {
          id: 2,
          category: 'combat',
          name: '小有名气',
          description: '击败100只怪物',
          icon: '⚔️',
          iconClass: 'icon-combat',
          current: 75,
          target: 100,
          progress: 75,
          completed: false,
          canClaim: false,
          rewards: [{ icon: '💰', name: '灵石', amount: 500 }]
        },
        {
          id: 3,
          category: 'combat',
          name: '名震天下',
          description: '击败1000只怪物',
          icon: '🏆',
          iconClass: 'icon-combat',
          current: 200,
          target: 1000,
          progress: 20,
          completed: false,
          canClaim: false,
          rewards: [{ icon: '💎', name: '钻石', amount: 50 }]
        },
        {
          id: 4,
          category: 'collection',
          name: '收藏家',
          description: '收集10件装备',
          icon: '📦',
          iconClass: 'icon-collection',
          current: 10,
          target: 10,
          progress: 100,
          completed: true,
          canClaim: true,
          rewards: [{ icon: '⚗️', name: '经验丹', amount: 5 }]
        },
        {
          id: 5,
          category: 'collection',
          name: '富甲一方',
          description: '拥有10000灵石',
          icon: '💰',
          iconClass: 'icon-collection',
          current: 15000,
          target: 10000,
          progress: 100,
          completed: true,
          canClaim: true,
          rewards: [{ icon: '💎', name: '钻石', amount: 20 }]
        },
        {
          id: 6,
          category: 'social',
          name: '广结善缘',
          description: '添加10个好友',
          icon: '👥',
          iconClass: 'icon-social',
          current: 8,
          target: 10,
          progress: 80,
          completed: false,
          canClaim: false,
          rewards: [{ icon: '💰', name: '灵石', amount: 300 }]
        },
        {
          id: 7,
          category: 'explore',
          name: '探索者',
          description: '探索5张地图',
          icon: '🗺️',
          iconClass: 'icon-explore',
          current: 5,
          target: 5,
          progress: 100,
          completed: true,
          canClaim: true,
          rewards: [{ icon: '📚', name: '技能书', amount: 1 }]
        }
      ],
      loginRewards: {
        firstRecharge: {
          claimed: false,
          bonus: 100,
          countdown: 0,  // 倒计时（秒）
          isActive: false  // 是否在活动期间
        },
        secondDay: {
          claimed: false,
          canClaim: false,
          items: []
        },
        thirdDay: {
          claimed: false,
          canClaim: false,
          items: []
        },
        sevenDay: [
          { day: 1, items: [{ icon: '💰', name: '灵石', amount: 100 }], claimed: true, canClaim: false, isToday: false },
          { day: 2, items: [{ icon: '💰', name: '灵石', amount: 200 }], claimed: true, canClaim: false, isToday: false },
          { day: 3, items: [{ icon: '⚗️', name: '经验丹', amount: 3 }], claimed: true, canClaim: false, isToday: false },
          { day: 4, items: [{ icon: '💰', name: '灵石', amount: 300 }], claimed: true, canClaim: false, isToday: false },
          { day: 5, items: [{ icon: '💎', name: '钻石', amount: 10 }], claimed: true, canClaim: false, isToday: false },
          { day: 6, items: [{ icon: '💰', name: '灵石', amount: 500 }, { icon: '⚗️', name: '经验丹', amount: 5 }], claimed: false, canClaim: true, isToday: true },
          { day: 7, items: [{ icon: '🎁', name: '豪华礼包', amount: 1 }], claimed: false, canClaim: false, isToday: false }
        ],
        limited: {
          title: '周末登录礼包',
          remainTime: '2天12时',
          rewards: [
            { day: 1, icon: '💰', amount: 1000, claimed: true, canClaim: false },
            { day: 2, icon: '💎', amount: 20, claimed: false, canClaim: true }
          ]
        }
      },
      // 首充配置
      firstRechargeConfig: {
        enabled: false,
        originalAmount: 6,
        bonusMultiplier: 2,
        extraGem: 0,
        skillBookBox: false,
        title: '',
        rewards: {
          spirit_stones: 1200,
          skill_book_purple: 1,
          strengthening_stone: 50,
          linggen_fruit: 3
        }
      },
      // 新手任务
      newbieTasks: [],
      // 倒计时定时器
      countdownTimer: null
    };
  },
  computed: {
    completedTaskCount() {
      return this.newbieTasks.filter(t => t.completed).length;
    },
    canClaimAny() {
      if (!this.dailySign.todaySigned) return true;
      if (this.dailySign.cumulativeRewards.some(r => this.dailySign.currentStreak >= r.days && !r.claimed)) return true;
      if (this.levelRewards.some(r => this.playerLevel >= r.level && !r.claimed)) return true;
      if (this.achievements.some(a => a.canClaim)) return true;
      if (this.loginRewards.sevenDay.some(d => d.canClaim)) return true;
      return false;
    },
    totalCanClaim() {
      let count = 0;
      if (!this.dailySign.todaySigned) count++;
      count += this.dailySign.cumulativeRewards.filter(r => this.dailySign.currentStreak >= r.days && !r.claimed).length;
      count += this.levelRewards.filter(r => this.playerLevel >= r.level && !r.claimed).length;
      count += this.achievements.filter(a => a.canClaim).length;
      count += this.loginRewards.sevenDay.filter(d => d.canClaim).length;
      return count;
    },
    filteredAchievements() {
      return this.achievements.filter(a => a.category === this.activeCategory);
    }
  },
  mounted() {
    // 加载所有福利数据
    this.loadSigninStatus();
    this.loadLoginRewards();
    this.loadFirstRechargeConfig();
    this.loadNewbieTasks();
    this.startCountdown();
  },
  beforeUnmount() {
    // 清理定时器
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
  },
  methods: {
    // 月卡相关方法
    buyMonthCard(cardType) {
      // 调用购买月卡API
      fetch('/api/vip/buy-month-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardType })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          this.monthCardStatus[cardType] = true;
          if (cardType === 'noble') {
            this.monthCardStatus.nobleDays = 30;
          }
          console.log('购买月卡成功');
        } else {
          console.log('购买失败:', data.message);
        }
      })
      .catch(err => {
        console.log('购买月卡出错:', err);
      });
    },
    claimMonthCardReward(cardType) {
      if (this.monthCardStatus[cardType + 'Claimed']) return;
      
      // 调用领取月卡奖励API
      fetch('/api/vip/claim-daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardType })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          this.monthCardStatus[cardType + 'Claimed'] = true;
          if (cardType === 'lifetime') {
            this.monthCardStatus.lifetimeDays++;
          }
          console.log('领取月卡奖励成功');
        } else {
          console.log('领取失败:', data.message);
        }
      })
      .catch(err => {
        console.log('领取月卡奖励出错:', err);
      });
    },
    
    getTabClaimCount(tabId) {
      switch(tabId) {
        case 'daily':
          let count = 0;
          if (!this.dailySign.todaySigned) count++;
          count += this.dailySign.cumulativeRewards.filter(r => this.dailySign.currentStreak >= r.days && !r.claimed).length;
          return count;
        case 'month-card':
          let mcCount = 0;
          if (this.monthCardStatus.lifetime && !this.monthCardStatus.lifetimeClaimed) mcCount++;
          if (this.monthCardStatus.noble && !this.monthCardStatus.nobleClaimed) mcCount++;
          return mcCount;
        case 'level':
          return this.levelRewards.filter(r => this.playerLevel >= r.level && !r.claimed).length;
        case 'achievement':
          return this.achievements.filter(a => a.canClaim).length;
        case 'login':
          return this.loginRewards.sevenDay.filter(d => d.canClaim).length;
        default:
          return 0;
      }
    },
    doDailySign() {
      if (!this.dailySign.todaySigned && !this.isSigning) {
        this.isSigning = true;
        
        // 获取今日奖励
        const todayRewardItem = this.dailySign.rewards.find(r => r.isToday);
        this.todayReward = todayRewardItem ? todayRewardItem.amount : 100;
        
        // 调用签到API
        if (typeof welfareAPI !== 'undefined') {
          welfareAPI.signin().then(res => {
            this.isSigning = false;
            if (res.success) {
              this.dailySign.todaySigned = true;
              this.dailySign.currentStreak = res.data.currentStreak || this.dailySign.currentStreak + 1;
              // 更新签到状态
              if (res.data.rewards) {
                res.data.rewards.forEach(r => {
                  const day = this.dailySign.rewards.find(d => d.day === r.day);
                  if (day) day.signed = true;
                });
              }
              showToast(`签到成功！连续签到${this.dailySign.currentStreak}天`, 'success');
            }
          }).catch(err => {
            this.isSigning = false;
            console.error('签到失败:', err);
            // 降级处理
            this.localSignin();
          });
        } else {
          this.localSignin();
        }
      }
    },
    // 本地签到（无API时使用）
    localSignin() {
      this.isSigning = false;
      const today = this.dailySign.rewards.find(r => r.isToday);
      if (today) {
        today.signed = true;
      }
      this.dailySign.todaySigned = true;
      this.dailySign.currentStreak++;
      console.log('签到成功');
      showToast('签到成功！', 'success');
    },
    // 加载签到状态
    async loadSigninStatus() {
      if (typeof welfareAPI !== 'undefined') {
        try {
          const res = await welfareAPI.getSigninStatus();
          if (res.success && res.data) {
            this.dailySign.currentStreak = res.data.currentStreak || 0;
            this.dailySign.todaySigned = res.data.todaySigned || false;
            if (res.data.rewards) {
              this.dailySign.rewards = res.data.rewards.map(r => ({
                day: r.day,
                icon: r.icon || '💰',
                amount: r.amount,
                signed: r.signed,
                isToday: r.isToday,
                isFuture: r.isFuture
              }));
            }
            if (res.data.cumulativeRewards) {
              this.dailySign.cumulativeRewards = res.data.cumulativeRewards;
            }
          }
        } catch (err) {
          console.error('加载签到状态失败:', err);
        }
      }
    },
    // 加载登录奖励数据
    async loadLoginRewards() {
      if (typeof welfareAPI !== 'undefined') {
        try {
          // 加载次日奖励
          const secondDayRes = await welfareAPI.getSecondDayReward();
          if (secondDayRes.success && secondDayRes.data) {
            this.loginRewards.secondDay = secondDayRes.data;
          }
          
          // 加载三日奖励
          const thirdDayRes = await welfareAPI.getThirdDayReward();
          if (thirdDayRes.success && thirdDayRes.data) {
            this.loginRewards.thirdDay = thirdDayRes.data;
          }
        } catch (err) {
          console.error('加载登录奖励失败:', err);
        }
      }
    },
    // 领取次日登录奖励
    async claimSecondDayReward() {
      if (typeof welfareAPI !== 'undefined') {
        try {
          const res = await welfareAPI.claimSecondDayReward();
          if (res.success) {
            this.loginRewards.secondDay.claimed = true;
            this.loginRewards.secondDay.canClaim = false;
            showToast('次日礼包领取成功！', 'success');
          }
        } catch (err) {
          console.error('领取次日奖励失败:', err);
        }
      }
    },
    // 领取三日登录奖励
    async claimThirdDayReward() {
      if (typeof welfareAPI !== 'undefined') {
        try {
          const res = await welfareAPI.claimThirdDayReward();
          if (res.success) {
            this.loginRewards.thirdDay.claimed = true;
            this.loginRewards.thirdDay.canClaim = false;
            showToast('三日礼包领取成功！', 'success');
          }
        } catch (err) {
          console.error('领取三日奖励失败:', err);
        }
      }
    },
    // 加载首充配置
    async loadFirstRechargeConfig() {
      if (typeof firstRechargeAPI !== 'undefined') {
        try {
          const res = await firstRechargeAPI.getConfig();
          if (res.success && res.data) {
            this.firstRechargeConfig = res.data;
            this.loginRewards.firstRecharge.claimed = res.data.claimed || false;
            this.loginRewards.firstRecharge.isActive = res.data.isActive || false;
            this.loginRewards.firstRecharge.countdown = res.data.countdown || 0;
            // 启动倒计时
            this.startCountdown();
          }
        } catch (err) {
          console.error('加载首充配置失败:', err);
        }
      }
    },
    // 首充领取
    async claimFirstRecharge() {
      if (typeof firstRechargeAPI !== 'undefined') {
        try {
          const res = await firstRechargeAPI.claimV2();
          if (res.success) {
            this.loginRewards.firstRecharge.claimed = true;
            this.firstRechargeConfig.claimed = true;
            showToast('首充奖励领取成功！', 'success');
          }
        } catch (err) {
          console.error('领取首充奖励失败:', err);
        }
      }
    },
    // 开始倒计时
    startCountdown() {
      if (this.countdownTimer) {
        clearInterval(this.countdownTimer);
      }
      if (this.loginRewards.firstRecharge.isActive && !this.loginRewards.firstRecharge.claimed) {
        this.countdownTimer = setInterval(() => {
          if (this.loginRewards.firstRecharge.countdown > 0) {
            this.loginRewards.firstRecharge.countdown--;
          } else {
            clearInterval(this.countdownTimer);
          }
        }, 1000);
      }
    },
    // 格式化倒计时
    formatCountdown(seconds) {
      if (seconds <= 0) return '';
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      if (hours > 24) {
        const days = Math.floor(hours / 24);
        return `${days}天`;
      }
      return `${hours}时${minutes.toString().padStart(2, '0')}分`;
    },
    // 加载新手任务
    async loadNewbieTasks() {
      if (typeof newbieAPI !== 'undefined') {
        try {
          const res = await newbieAPI.getTasks();
          if (res.success && res.data) {
            this.newbieTasks = res.data;
          }
        } catch (err) {
          console.error('加载新手任务失败:', err);
        }
      }
    },
    // 领取新手任务奖励
    async claimNewbieTask(taskId) {
      if (typeof newbieAPI !== 'undefined') {
        try {
          const res = await newbieAPI.claim(taskId);
          if (res.success) {
            const task = this.newbieTasks.find(t => t.id === taskId);
            if (task) {
              task.claimed = true;
              task.canClaim = false;
            }
            showToast('任务奖励领取成功！', 'success');
          }
        } catch (err) {
          console.error('领取任务奖励失败:', err);
        }
      }
    },
    claimCumulativeReward(reward) {
      if (this.dailySign.currentStreak >= reward.days && !reward.claimed) {
        reward.claimed = true;
        console.log('领取累计签到奖励:', reward.name);
      }
    },
    claimLevelReward(reward) {
      if (this.playerLevel >= reward.level && !reward.claimed) {
        reward.claimed = true;
        console.log('领取等级礼包:', reward.level);
      }
    },
    claimAchievementReward(achievement) {
      if (achievement.canClaim) {
        achievement.canClaim = false;
        console.log('领取成就奖励:', achievement.name);
      }
    },
    claimSevenDayReward(day) {
      if (day.canClaim) {
        day.canClaim = false;
        day.claimed = true;
        console.log('领取7日奖励第' + day.day + '天');
      }
    },
    claimAll() {
      if (!this.dailySign.todaySigned) {
        this.doDailySign();
      }
      this.dailySign.cumulativeRewards.forEach(r => {
        if (this.dailySign.currentStreak >= r.days && !r.claimed) {
          r.claimed = true;
        }
      });
      this.levelRewards.forEach(r => {
        if (this.playerLevel >= r.level && !r.claimed) {
          r.claimed = true;
        }
      });
      this.achievements.forEach(a => {
        if (a.canClaim) {
          a.canClaim = false;
        }
      });
      this.loginRewards.sevenDay.forEach(d => {
        if (d.canClaim) {
          d.canClaim = false;
          d.claimed = true;
        }
      });
      console.log('一键领取完成');
    },
    goToRecharge() {
      console.log('跳转到充值页面');
    }
  }
};
</script>

<style scoped>
.welfare-panel {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 20px;
  color: #fff;
  max-height: 85vh;
  overflow-y: auto;
  min-width: 600px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-icon {
  font-size: 28px;
}

.panel-header h2 {
  font-size: 24px;
  font-weight: bold;
  margin: 0;
  background: linear-gradient(135deg, #ffd700 0%, #ff9900 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.close-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s;
}

.close-btn:hover {
  background: rgba(255, 0, 0, 0.3);
  border-color: rgba(255, 0, 0, 0.5);
}

.claim-all-section {
  margin-bottom: 16px;
}

.claim-all-btn {
  width: 100%;
  padding: 14px 20px;
  background: linear-gradient(135deg, #ffd700 0%, #ff9900 100%);
  border: none;
  border-radius: 12px;
  color: #333;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
}

.claim-all-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 215, 0, 0.5);
}

.btn-icon {
  font-size: 22px;
}

.claim-count {
  background: #ff4757;
  color: #fff;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 14px;
}

.welfare-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 12px;
}

.tab-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid transparent;
  border-radius: 10px;
  color: #aaa;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.tab-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.tab-btn.active {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 153, 0, 0.2) 100%);
  border-color: rgba(255, 215, 0, 0.3);
  color: #ffd700;
}

.tab-icon {
  font-size: 20px;
}

.tab-name {
  font-size: 12px;
}

.tab-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  background: #ff4757;
  color: #fff;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 16px;
  text-align: center;
}

.tab-content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.daily-sign-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sign-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 165, 0, 0.1) 100%);
  padding: 16px 20px;
  border-radius: 12px;
  border: 1px solid rgba(255, 215, 0, 0.2);
}

.sign-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.streak-icon {
  font-size: 32px;
  animation: flame 1.5s infinite alternate;
}

@keyframes flame {
  0% { transform: scale(1); filter: brightness(1); }
  100% { transform: scale(1.1); filter: brightness(1.2); }
}
}

.streak-icon {
  font-size: 24px;
}

.streak-text {
  font-size: 15px;
  color: #ccc;
  background: rgba(0, 0, 0, 0.3);
  padding: 6px 14px;
  border-radius: 20px;
}

.streak-text strong {
  color: #ffd700;
  font-size: 22px;
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
}

.sign-status {
  font-size: 14px;
  padding: 6px 12px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.1);
}

.sign-status.signed {
  background: rgba(0, 255, 0, 0.2);
  color: #7bed9f;
}

.sign-now-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
}

.sign-now-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  100% { left: 100%; }
}

.sign-now-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.5);
}

.sign-now-btn:active:not(:disabled) {
  transform: translateY(0);
}

.sign-now-btn:disabled, .sign-now-btn.signing {
  background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
  cursor: not-allowed;
}

.sign-now-btn:disabled::before, .sign-now-btn.signing::before {
  display: none;
}

.sign-btn-icon {
  font-size: 20px;
}

.sign-btn-text {
  flex: 1;
}

.sign-btn-reward {
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  font-size: 14px;
}

/* 已签到状态 */
.signed-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, rgba(0, 255, 136, 0.1) 0%, rgba(0, 210, 211, 0.1) 100%);
  border-radius: 12px;
  border: 1px solid rgba(0, 255, 136, 0.3);
}

.signed-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #00ff88 0%, #00d2d3 100%);
  border-radius: 25px;
  color: #1a1a2e;
  font-weight: bold;
  font-size: 16px;
}

.badge-icon {
  font-size: 20px;
  animation: bounce 1s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

.signed-reward-hint {
  margin-top: 12px;
  color: #888;
  font-size: 13px;
}

.sign-calendar {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
}

.calendar-title {
  font-size: 16px;
  margin-bottom: 12px;
  color: #ffd700;
}

.calendar-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}

.calendar-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  position: relative;
  transition: all 0.3s;
}

.calendar-day.signed {
  background: rgba(0, 255, 0, 0.15);
  border: 1px solid rgba(0, 255, 0, 0.3);
}

.calendar-day.today {
  border: 2px solid #ffd700;
  box-shadow: 0 0 15px rgba(255, 215, 0, 0.4);
}

.calendar-day.today .day-number {
  color: #ffd700;
}

.calendar-day.future {
  opacity: 0.5;
}

.day-number {
  font-size: 12px;
  color: #aaa;
  margin-bottom: 4px;
}

.day-reward {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 11px;
}

.reward-icon {
  font-size: 14px;
}

.reward-amount {
  color: #fff;
}

.day-status {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 10px;
  color: #7bed9f;
}

.today-dot {
  display: block;
  width: 8px;
  height: 8px;
  background: #ffd700;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}

.cumulative-section {
  margin-top: 8px;
}

.section-title {
  font-size: 16px;
  margin-bottom: 12px;
  color: #ffd700;
}

.cumulative-rewards {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.cumulative-item {
  flex: 1;
  min-width: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.3s;
}

.cumulative-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.cumulative-item.claimed {
  border-color: rgba(0, 255, 0, 0.3);
  opacity: 0.7;
}

.cumulative-item.claimable {
  border-color: rgba(255, 215, 0, 0.5);
  background: rgba(255, 215, 0, 0.1);
  animation: glow 2s infinite;
}

@keyframes glow {
  0%, 100% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.3); }
  50% { box-shadow: 0 0 15px rgba(255, 215, 0, 0.5); }
}

.cum-days {
  font-size: 14px;
  color: #aaa;
  margin-bottom: 8px;
}

.cum-reward {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #fff;
}

.cum-icon {
  font-size: 18px;
}

.cum-action {
  margin-top: 8px;
  font-size: 12px;
  color: #7bed9f;
}

.claim-dot {
  display: inline-block;
  padding: 2px 8px;
  background: linear-gradient(135deg, #ffd700 0%, #ff9900 100%);
  color: #333;
  border-radius: 10px;
  font-weight: bold;
}

/* 等级礼包样式 */
.level-rewards-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.section-icon {
  font-size: 20px;
}

.section-title {
  font-size: 18px;
  font-weight: bold;
}

.current-level {
  margin-left: auto;
  font-size: 14px;
  color: #ffd700;
  background: rgba(255, 215, 0, 0.1);
  padding: 4px 12px;
  border-radius: 20px;
}

.level-rewards-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.level-reward-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.3s;
}

.level-reward-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.level-reward-item.available {
  border-color: rgba(255, 215, 0, 0.3);
  background: rgba(255, 215, 0, 0.05);
}

.level-reward-item.claimed {
  opacity: 0.6;
}

.level-reward-item.locked {
  opacity: 0.5;
}

.level-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
}

.level-num {
  font-size: 24px;
  font-weight: bold;
  color: #fff;
}

.level-unit {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}

.level-reward-content {
  flex: 1;
}

.reward-items {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.reward-item {
  font-size: 13px;
  padding: 4px 10px;
  background: rgba(255, 215, 0, 0.1);
  border-radius: 15px;
  color: #ffd700;
}

.level-status {
  font-size: 12px;
}

.status-claimed {
  color: #7bed9f;
}

.status-available {
  color: #ffd700;
}

.status-locked {
  color: #aaa;
}

/* 成就奖励样式 */
.achievement-rewards-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.achievement-categories {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.category-btn {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid transparent;
  border-radius: 20px;
  color: #aaa;
  cursor: pointer;
  transition: all 0.3s;
}

.category-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.category-btn.active {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%);
  border-color: rgba(102, 126, 234, 0.5);
  color: #fff;
}

.achievement-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.achievement-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid transparent;
  transition: all 0.3s;
}

.achievement-item.claimable {
  border-color: rgba(255, 215, 0, 0.3);
  background: rgba(255, 215, 0, 0.05);
}

.achievement-icon {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
}

.achievement-info {
  flex: 1;
}

.achievement-name {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 4px;
}

.achievement-desc {
  font-size: 12px;
  color: #aaa;
  margin-bottom: 8px;
}

.achievement-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
}

.progress-text {
  font-size: 11px;
  color: #aaa;
}

.achievement-reward {
  display: flex;
  gap: 8px;
}

.reward-icon {
  font-size: 24px;
}

.claim-btn {
  padding: 8px 16px;
  background: linear-gradient(135deg, #ffd700 0%, #ff9900 100%);
  border: none;
  border-radius: 8px;
  color: #333;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.claim-btn:hover {
  transform: scale(1.05);
}

.completed-badge {
  color: #7bed9f;
  font-size: 20px;
}

/* 登录奖励样式 */
.login-rewards-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.first-recharge-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  overflow: hidden;
}

.recharge-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.2);
}

.banner-icon {
  font-size: 36px;
}

.banner-text {
  font-size: 24px;
  font-weight: bold;
}

.banner-tag {
  padding: 4px 12px;
  background: #ffd700;
  color: #333;
  border-radius: 20px;
  font-size: 14px;
  font-weight: bold;
}

.recharge-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
}

.recharge-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recharge-amount {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.9);
}

.recharge-reward {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 首充奖励详情样式 */
.recharge-reward-detail {
  margin-top: 8px;
}

.reward-title {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 8px;
}

.reward-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.reward-list .reward-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(255, 215, 0, 0.15);
  border-radius: 15px;
  font-size: 12px;
  color: #ffd700;
}

.reward-list .item-icon {
  font-size: 14px;
}

.reward-list .item-text strong {
  color: #fff;
  font-weight: bold;
}

.reward-list .title-reward {
  background: rgba(255, 152, 0, 0.2);
  border: 1px solid rgba(255, 152, 0, 0.4);
}

.diamond-icon {
  font-size: 24px;
}

.reward-text {
  font-size: 14px;
  color: #ffd700;
}

.reward-text strong {
  font-size: 20px;
}

.recharge-btn {
  padding: 12px 24px;
  background: #ffd700;
  border: none;
  border-radius: 25px;
  color: #333;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.recharge-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
}

.section-subtitle {
  font-size: 16px;
  margin-bottom: 12px;
  color: #ffd700;
}

.seven-day-calendar {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}

.seven-day-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  transition: all 0.3s;
}

.seven-day-item.claimed {
  background: rgba(0, 255, 0, 0.1);
  border: 1px solid rgba(0, 255, 0, 0.2);
}

.seven-day-item.today {
  border: 2px solid #ffd700;
}

.seven-day-item.claimable {
  border: 2px solid #00d2d3;
  animation: glow-cyan 2s infinite;
}

@keyframes glow-cyan {
  0%, 100% { box-shadow: 0 0 5px rgba(0, 210, 211, 0.3); }
  50% { box-shadow: 0 0 15px rgba(0, 210, 211, 0.5); }
}

.day-label {
  font-size: 12px;
  color: #aaa;
  margin-bottom: 8px;
}

.day-rewards {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
}

.day-item {
  font-size: 20px;
}

.day-status {
  font-size: 12px;
}

.day-claim-btn {
  padding: 4px 12px;
  background: linear-gradient(135deg, #00d2d3 0%, #3a7bd5 100%);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 11px;
  font-weight: bold;
  cursor: pointer;
}

.claimed-icon {
  color: #7bed9f;
}

.locked-icon {
  opacity: 0.3;
}

.limited-login-section {
  margin-top: 16px;
}

.limited-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
  border-radius: 10px;
  margin-bottom: 12px;
}

.limited-icon {
  font-size: 20px;
}

.limited-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.limited-time {
  margin-left: auto;
  font-size: 14px;
  color: #333;
  font-weight: bold;
}

.limited-rewards {
  display: flex;
  gap: 12px;
}

.limited-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  border: 1px solid transparent;
}

.limited-item.claimed {
  border-color: rgba(0, 255, 0, 0.3);
  opacity: 0.7;
}

.limited-item.today {
  border-color: rgba(255, 215, 0, 0.5);
}

.limited-day {
  font-size: 12px;
  color: #aaa;
  margin-bottom: 8px;
}

.limited-icon {
  font-size: 28px;
  margin-bottom: 8px;
}

.limited-status {
  font-size: 12px;
}

.can-claim {
  display: inline-block;
  padding: 2px 10px;
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
  color: #333;
  border-radius: 10px;
  font-weight: bold;
}

/* 月卡样式 */
.month-card-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.month-cards {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.month-card {
  position: relative;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
  border-radius: 20px;
  padding: 25px;
  border: 2px solid transparent;
  transition: all 0.3s;
}

.month-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 35px rgba(102, 126, 234, 0.3);
}

.month-card.owned {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(56, 142, 60, 0.2));
  border-color: rgba(76, 175, 80, 0.5);
}

.month-card.noble {
  background: linear-gradient(135deg, rgba(255, 152, 0, 0.2), rgba(244, 67, 54, 0.2));
}

.month-card.noble.owned {
  background: linear-gradient(135deg, rgba(255, 152, 0, 0.25), rgba(244, 67, 54, 0.25));
}

.card-badge {
  position: absolute;
  top: 15px;
  right: 15px;
  padding: 5px 15px;
  background: #4caf50;
  border-radius: 20px;
  color: #fff;
  font-size: 12px;
  font-weight: bold;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
}

.card-icon {
  font-size: 48px;
}

.card-title .name {
  display: block;
  color: #fff;
  font-size: 22px;
  font-weight: bold;
}

.card-title .tag {
  display: block;
  font-size: 12px;
  opacity: 0.7;
  margin-top: 3px;
}

.card-rewards {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 15px;
  padding: 20px;
  margin-bottom: 20px;
}

.reward-title {
  color: #ffd700;
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 15px;
}

.reward-items {
  display: flex;
  gap: 20px;
}

.reward-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  flex: 1;
  padding: 15px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
}

.reward-item.special {
  background: rgba(255, 152, 0, 0.15);
  border: 1px solid rgba(255, 152, 0, 0.3);
}

.reward-icon {
  font-size: 28px;
}

.reward-amount {
  color: #ffd700;
  font-size: 20px;
  font-weight: bold;
}

.reward-label {
  font-size: 12px;
  opacity: 0.7;
}

.card-price {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.price-label {
  color: #fff;
  font-size: 14px;
}

.price-value {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #f093fb;
  font-size: 28px;
  font-weight: bold;
}

.price-value .icon {
  font-size: 24px;
}

.buy-btn {
  width: 100%;
  padding: 18px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  border-radius: 15px;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.buy-btn:hover {
  transform: scale(1.02);
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
}

.claim-section {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.claim-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.claim-status {
  color: #4caf50;
  font-weight: bold;
  font-size: 14px;
}

.claim-status.claimed {
  color: rgba(255, 255, 255, 0.5);
}

.claim-days {
  font-size: 12px;
  opacity: 0.7;
}

.claim-btn {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #4caf50, #2e7d32);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.claim-btn:hover:not(.disabled) {
  transform: scale(1.02);
  box-shadow: 0 8px 25px rgba(76, 175, 80, 0.4);
}

.claim-btn.disabled {
  background: rgba(255, 255, 255, 0.1);
  cursor: not-allowed;
}

.privilege-info {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 15px;
  padding: 20px;
}

.privilege-info h4 {
  color: #667eea;
  font-size: 16px;
  margin-bottom: 15px;
}

.privilege-info ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.privilege-info li {
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  padding: 8px 0;
  padding-left: 20px;
  position: relative;
}

.privilege-info li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: #667eea;
}

/* 首充倒计时样式 */
.first-recharge-card.countdown-active {
  animation: countdown-glow 2s infinite;
}

@keyframes countdown-glow {
  0%, 100% { box-shadow: 0 0 10px rgba(255, 215, 0, 0.3); }
  50% { box-shadow: 0 0 25px rgba(255, 215, 0, 0.6); }
}

.first-recharge-claim {
  margin: 16px 0;
}

.already-claimed {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px;
  background: rgba(76, 175, 80, 0.15);
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 12px;
}

.already-claimed .check-icon {
  font-size: 24px;
}

.already-claimed .claimed-text {
  color: #4caf50;
  font-size: 16px;
  font-weight: bold;
}

.claim-first-recharge-btn {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #ffd700 0%, #ff9900 100%);
  border: none;
  border-radius: 12px;
  color: #333;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.claim-first-recharge-btn:hover {
  transform: scale(1.02);
  box-shadow: 0 8px 25px rgba(255, 215, 0, 0.4);
}

/* 次日/三日登录礼包样式 */
.login-day-reward-section {
  margin: 16px 0;
}

.day-reward-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 2px solid transparent;
}

.day-reward-card.claimable {
  border-color: rgba(0, 210, 211, 0.5);
  background: rgba(0, 210, 211, 0.1);
  animation: glow-cyan 2s infinite;
}

.day-reward-card.claimed {
  border-color: rgba(0, 255, 0, 0.3);
  opacity: 0.7;
}

.day-reward-items {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.day-reward-item {
  padding: 6px 12px;
  background: rgba(255, 215, 0, 0.1);
  border-radius: 20px;
  color: #ffd700;
  font-size: 14px;
}

.day-reward-claim-btn {
  padding: 10px 24px;
  background: linear-gradient(135deg, #00d2d3 0%, #3a7bd5 100%);
  border: none;
  border-radius: 20px;
  color: #fff;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.day-reward-claim-btn:hover {
  transform: scale(1.05);
}

.claimed-badge {
  color: #7bed9f;
  font-size: 14px;
}

/* 新手任务样式 */
.newbie-tasks-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.task-progress {
  margin-left: auto;
  font-size: 14px;
  color: #ffd700;
  background: rgba(255, 215, 0, 0.1);
  padding: 4px 12px;
  border-radius: 20px;
}

.newbie-tasks-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.newbie-task-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid transparent;
  transition: all 0.3s;
}

.newbie-task-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.newbie-task-item.claimable {
  border-color: rgba(0, 210, 211, 0.5);
  background: rgba(0, 210, 211, 0.1);
}

.newbie-task-item.completed {
  opacity: 0.7;
}

.newbie-task-item.locked {
  opacity: 0.5;
}

.task-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}

.task-info {
  flex: 1;
}

.task-name {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 4px;
}

.task-desc {
  font-size: 12px;
  color: #aaa;
  margin-bottom: 8px;
}

.task-progress-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 4px;
}

.task-progress-bar .progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00d2d3 0%, #3a7bd5 100%);
}

.task-progress-text {
  font-size: 11px;
  color: #aaa;
}

.task-rewards {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.task-rewards .reward-icon {
  padding: 4px 10px;
  background: rgba(255, 215, 0, 0.1);
  border-radius: 15px;
  font-size: 12px;
  color: #ffd700;
}

.task-claim-btn {
  padding: 8px 20px;
  background: linear-gradient(135deg, #00d2d3 0%, #3a7bd5 100%);
  border: none;
  border-radius: 20px;
  color: #fff;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.task-claim-btn:hover {
  transform: scale(1.05);
}

.completed-icon {
  color: #7bed9f;
  font-size: 20px;
}

.newbie-empty {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-text {
  color: #aaa;
  font-size: 14px;
}

.newbie-tips {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  padding: 16px;
  margin-top: 8px;
}

.newbie-tips h4 {
  color: #667eea;
  font-size: 14px;
  margin-bottom: 12px;
}

.newbie-tips ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.newbie-tips li {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  padding: 6px 0;
  padding-left: 16px;
  position: relative;
}

.newbie-tips li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: #667eea;
}
</style>px