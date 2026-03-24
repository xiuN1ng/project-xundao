<template>
  <BasePanel
    title="福利中心"
    icon="🎁"
    variant="special"
    :tab-items="tabItems"
    :default-tab="activeTab"
    @tab-change="activeTab = $event"
    @close="$emit('close')"
  >
    <template #actions>
      <BaseButton v-if="canClaimAny" variant="gold" size="sm" block @click="claimAll">
        ✨ 一键领取<span v-if="totalCanClaim > 0" class="claim-badge">{{ totalCanClaim }}</span>
      </BaseButton>
    </template>

    <!-- 每日签到 -->
    <div v-if="activeTab === 'daily'" class="tab-content">
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

        <BaseButton v-if="!dailySign.todaySigned" variant="gold" size="lg" block @click="doDailySign" :loading="isSigning">
          <template #icon>{{ isSigning ? '⏳' : '✨' }}</template>
          {{ isSigning ? '签到中...' : '立即签到' }}
          <span class="sign-btn-reward">+{{ todayReward }}灵石</span>
        </BaseButton>

        <div v-else class="signed-status">
          <div class="signed-badge">
            <span class="badge-icon">🎉</span>
            <span class="badge-text">今日已签到</span>
          </div>
          <div class="signed-reward-hint">明天再来领取更多奖励吧~</div>
        </div>

        <div class="sign-calendar">
          <div class="calendar-title">📅 本月签到</div>
          <div class="calendar-days">
            <div v-for="day in dailySign.rewards" :key="day.day" class="calendar-day"
              :class="{ signed: day.signed, today: day.isToday, future: day.isFuture }">
              <div class="day-number">{{ day.day }}日</div>
              <div class="day-reward"><span class="reward-icon">{{ day.icon }}</span><span class="reward-amount">{{ day.amount }}</span></div>
              <div class="day-status">
                <span v-if="day.signed">✓</span>
                <span v-else-if="day.isToday && !dailySign.todaySigned" class="today-dot"></span>
              </div>
            </div>
          </div>
        </div>

        <div class="cumulative-section">
          <div class="section-title">🏆 累计签到奖励</div>
          <div class="cumulative-rewards">
            <div v-for="reward in dailySign.cumulativeRewards" :key="reward.days" class="cumulative-item"
              :class="{ claimed: dailySign.currentStreak >= reward.days, claimable: dailySign.currentStreak >= reward.days && !reward.claimed }"
              @click="claimCumulativeReward(reward)">
              <div class="cum-days">{{ reward.days }}天</div>
              <div class="cum-reward"><span class="cum-icon">{{ reward.icon }}</span><span class="cum-name">{{ reward.name }}</span></div>
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
    <div v-if="activeTab === 'month-card'" class="tab-content">
      <div class="month-card-section">
        <div class="month-cards">
          <div class="month-card" :class="{ owned: monthCardStatus.lifetime }">
            <div class="card-badge" v-if="monthCardStatus.lifetime">✓ 已购买</div>
            <div class="card-header">
              <div class="card-icon">👑</div>
              <div class="card-title"><span class="name">终身月卡</span><span class="tag">永久有效</span></div>
            </div>
            <div class="card-rewards">
              <div class="reward-title">每日奖励</div>
              <div class="reward-items">
                <div class="reward-item"><span class="reward-icon">💰</span><span class="reward-amount">+10,000</span><span class="reward-label">灵石</span></div>
                <div class="reward-item"><span class="reward-icon">💎</span><span class="reward-amount">+50</span><span class="reward-label">钻石</span></div>
              </div>
            </div>
            <div class="card-price"><span class="price-label">售价</span><span class="price-value"><span class="icon">💎</span> 300</span></div>
            <div v-if="monthCardStatus.lifetime" class="claim-section">
              <div class="claim-info">
                <span class="claim-status" :class="{ claimed: monthCardStatus.lifetimeClaimed }">
                  {{ monthCardStatus.lifetimeClaimed ? '✓ 今日已领取' : '可领取' }}
                </span>
                <span class="claim-days">已领取 {{ monthCardStatus.lifetimeDays || 0 }} 天</span>
              </div>
              <BaseButton variant="primary" size="md" block :disabled="monthCardStatus.lifetimeClaimed" @click="claimMonthCardReward('lifetime')">
                {{ monthCardStatus.lifetimeClaimed ? '已领取' : '立即领取' }}
              </BaseButton>
            </div>
            <BaseButton v-else variant="primary" size="lg" block @click="buyMonthCard('lifetime')">立即购买</BaseButton>
          </div>

          <div class="month-card noble" :class="{ owned: monthCardStatus.noble }">
            <div class="card-badge" v-if="monthCardStatus.noble">✓ 已购买</div>
            <div class="card-header">
              <div class="card-icon">🏆</div>
              <div class="card-title"><span class="name">贵族月卡</span><span class="tag">30天有效期</span></div>
            </div>
            <div class="card-rewards">
              <div class="reward-title">每日奖励</div>
              <div class="reward-items">
                <div class="reward-item"><span class="reward-icon">💰</span><span class="reward-amount">+50,000</span><span class="reward-label">灵石</span></div>
                <div class="reward-item"><span class="reward-icon">💎</span><span class="reward-amount">+100</span><span class="reward-label">钻石</span></div>
                <div class="reward-item special"><span class="reward-icon">🎁</span><span class="reward-amount">+10</span><span class="reward-label">灵玉</span></div>
              </div>
            </div>
            <div class="card-price"><span class="price-label">售价</span><span class="price-value"><span class="icon">💎</span> 98</span></div>
            <div v-if="monthCardStatus.noble" class="claim-section">
              <div class="claim-info">
                <span class="claim-status" :class="{ claimed: monthCardStatus.nobleClaimed }">
                  {{ monthCardStatus.nobleClaimed ? '✓ 今日已领取' : '可领取' }}
                </span>
                <span class="claim-days" v-if="monthCardStatus.nobleDays">剩余 {{ monthCardStatus.nobleDays }} 天</span>
              </div>
              <BaseButton variant="primary" size="md" block :disabled="monthCardStatus.nobleClaimed" @click="claimMonthCardReward('noble')">
                {{ monthCardStatus.nobleClaimed ? '已领取' : '立即领取' }}
              </BaseButton>
            </div>
            <BaseButton v-else variant="primary" size="lg" block @click="buyMonthCard('noble')">立即购买</BaseButton>
          </div>
        </div>

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
    <div v-if="activeTab === 'level'" class="tab-content">
      <div class="level-rewards-section">
        <div class="section-header">
          <span class="section-icon">📦</span><span class="section-title">等级礼包</span>
          <span class="current-level">当前境界: {{ playerLevel }}级</span>
        </div>
        <div class="level-rewards-list">
          <div v-for="reward in levelRewards" :key="reward.level" class="level-reward-item"
            :class="{ available: playerLevel >= reward.level && !reward.claimed, claimed: reward.claimed, locked: playerLevel < reward.level }"
            @click="claimLevelReward(reward)">
            <div class="level-badge"><span class="level-num">{{ reward.level }}</span><span class="level-unit">级</span></div>
            <div class="level-reward-content">
              <div class="reward-items">
                <span v-for="(item, idx) in reward.items" :key="idx" class="reward-item">{{ item.icon }} {{ item.name }}x{{ item.amount }}</span>
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
    <div v-if="activeTab === 'achievement'" class="tab-content">
      <div class="achievement-rewards-section">
        <div class="section-header"><span class="section-icon">🏅</span><span class="section-title">成就奖励</span></div>
        <div class="achievement-categories">
          <button v-for="cat in achievementCategories" :key="cat.id" class="category-btn"
            :class="{ active: activeCategory === cat.id }" @click="activeCategory = cat.id">
            {{ cat.icon }} {{ cat.name }}
          </button>
        </div>
        <div class="achievement-list">
          <div v-for="achievement in filteredAchievements" :key="achievement.id" class="achievement-item"
            :class="{ completed: achievement.completed, claimable: achievement.canClaim }">
            <div class="achievement-icon"><span :class="achievement.iconClass">{{ achievement.icon }}</span></div>
            <div class="achievement-info">
              <div class="achievement-name">{{ achievement.name }}</div>
              <div class="achievement-desc">{{ achievement.description }}</div>
              <div class="achievement-progress" v-if="!achievement.completed">
                <div class="progress-bar"><div class="progress-fill" :style="{ width: achievement.progress + '%' }"></div></div>
                <span class="progress-text">{{ achievement.current }}/{{ achievement.target }}</span>
              </div>
            </div>
            <div class="achievement-reward">
              <span v-for="(item, idx) in achievement.rewards" :key="idx" class="reward-icon">{{ item.icon }}</span>
            </div>
            <BaseButton v-if="achievement.canClaim" variant="primary" size="sm" @click="claimAchievementReward(achievement)">领取</BaseButton>
            <span v-else-if="achievement.completed" class="completed-badge">✓</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 登录奖励 -->
    <div v-if="activeTab === 'login'" class="tab-content">
      <div class="login-rewards-section">
        <div class="section-header"><span class="section-icon">🎉</span><span class="section-title">登录奖励</span></div>

        <div class="first-recharge-section" v-if="!loginRewards.firstRecharge.claimed">
          <div class="first-recharge-card" :class="{ 'countdown-active': loginRewards.firstRecharge.isActive }">
            <div class="recharge-banner">
              <span class="banner-icon">💎</span><span class="banner-text">首充特惠</span>
              <span class="banner-tag" v-if="loginRewards.firstRecharge.isActive">限时{{ formatCountdown(loginRewards.firstRecharge.countdown) }}</span>
              <span class="banner-tag" v-else>双倍返还</span>
            </div>
            <div class="recharge-content">
              <div class="recharge-info">
                <div class="recharge-amount">
                  <span v-if="firstRechargeConfig.enabled">充值{{ firstRechargeConfig.originalAmount }}元</span>
                  <span v-else>充值任意金额</span>
                </div>
                <div class="recharge-reward-detail" v-if="firstRechargeConfig.enabled">
                  <div class="reward-title">🎁 奖励内容：</div>
                  <div class="reward-list">
                    <span class="reward-item" v-if="firstRechargeConfig.rewards?.spirit_stones"><span class="item-icon">💰</span><span class="item-text">双倍灵石 <strong>{{ firstRechargeConfig.rewards.spirit_stones }}</strong></span></span>
                    <span class="reward-item" v-if="firstRechargeConfig.rewards?.skill_book_purple"><span class="item-icon">📚</span><span class="item-text">紫色功法箱 <strong>×{{ firstRechargeConfig.rewards.skill_book_purple }}</strong></span></span>
                    <span class="reward-item" v-if="firstRechargeConfig.rewards?.strengthening_stone"><span class="item-icon">💎</span><span class="item-text">强化石 <strong>×{{ firstRechargeConfig.rewards.strengthening_stone }}</strong></span></span>
                    <span class="reward-item" v-if="firstRechargeConfig.rewards?.linggen_fruit"><span class="item-icon">🍎</span><span class="item-text">灵根果 <strong>×{{ firstRechargeConfig.rewards.linggen_fruit }}</strong></span></span>
                    <span class="reward-item title-reward" v-if="firstRechargeConfig.title"><span class="item-icon">👑</span><span class="item-text">专属称号 <strong>{{ firstRechargeConfig.title }}</strong></span></span>
                  </div>
                </div>
                <div class="recharge-reward" v-else><span class="diamond-icon">💎</span><span class="reward-text">额外获得 <strong>100%</strong> 灵石</span></div>
              </div>
              <BaseButton variant="primary" size="md" @click="goToRecharge">前往充值 🎯</BaseButton>
            </div>
          </div>
        </div>

        <div class="first-recharge-claim" v-else>
          <div class="already-claimed"><span class="check-icon">✅</span><span class="claimed-text">首充奖励已领取</span></div>
        </div>

        <div class="login-day-reward-section" v-if="loginRewards.secondDay && (loginRewards.secondDay.canClaim || loginRewards.secondDay.claimed)">
          <div class="section-subtitle">🎁 次日登录礼包</div>
          <div class="day-reward-card" :class="{ claimed: loginRewards.secondDay.claimed, claimable: loginRewards.secondDay.canClaim }">
            <div class="day-reward-items">
              <span v-for="(item, idx) in loginRewards.secondDay.items" :key="idx" class="day-reward-item">{{ item.icon }} {{ item.name }}x{{ item.amount }}</span>
            </div>
            <BaseButton v-if="loginRewards.secondDay.canClaim" variant="gold" size="sm" @click="claimSecondDayReward">领取</BaseButton>
            <span v-else-if="loginRewards.secondDay.claimed" class="claimed-badge">✓ 已领取</span>
          </div>
        </div>

        <div class="login-day-reward-section" v-if="loginRewards.thirdDay && (loginRewards.thirdDay.canClaim || loginRewards.thirdDay.claimed)">
          <div class="section-subtitle">🎁 三日登录礼包</div>
          <div class="day-reward-card" :class="{ claimed: loginRewards.thirdDay.claimed, claimable: loginRewards.thirdDay.canClaim }">
            <div class="day-reward-items">
              <span v-for="(item, idx) in loginRewards.thirdDay.items" :key="idx" class="day-reward-item">{{ item.icon }} {{ item.name }}x{{ item.amount }}</span>
            </div>
            <BaseButton v-if="loginRewards.thirdDay.canClaim" variant="gold" size="sm" @click="claimThirdDayReward">领取</BaseButton>
            <span v-else-if="loginRewards.thirdDay.claimed" class="claimed-badge">✓ 已领取</span>
          </div>
        </div>

        <div class="seven-day-section">
          <div class="section-subtitle">📅 7日登录礼包</div>
          <div class="seven-day-calendar">
            <div v-for="(day, idx) in loginRewards.sevenDay" :key="idx" class="seven-day-item"
              :class="{ claimed: day.claimed, today: day.isToday, claimable: day.canClaim }">
              <div class="day-label">第{{ day.day }}天</div>
              <div class="day-rewards"><span v-for="(item, i) in day.items" :key="i" class="day-item">{{ item.icon }}</span></div>
              <div class="day-status">
                <BaseButton v-if="day.canClaim" variant="gold" size="sm" @click="claimSevenDayReward(day)">领</BaseButton>
                <span v-else-if="day.claimed" class="claimed-icon">✓</span>
                <span v-else class="locked-icon">🔒</span>
              </div>
            </div>
          </div>
        </div>

        <div class="limited-login-section" v-if="loginRewards.limited">
          <div class="limited-banner">
            <span class="limited-icon">⚡</span><span class="limited-title">{{ loginRewards.limited.title }}</span>
            <span class="limited-time">剩余: {{ loginRewards.limited.remainTime }}</span>
          </div>
          <div class="limited-rewards">
            <div v-for="reward in loginRewards.limited.rewards" :key="reward.day" class="limited-item"
              :class="{ claimed: reward.claimed, today: reward.isToday }">
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
    <div v-if="activeTab === 'newbie'" class="tab-content">
      <div class="newbie-tasks-section">
        <div class="section-header">
          <span class="section-icon">🌱</span><span class="section-title">新手任务</span>
          <span class="task-progress" v-if="newbieTasks.length > 0">完成 {{ completedTaskCount }}/{{ newbieTasks.length }}</span>
        </div>

        <div class="newbie-tasks-list" v-if="newbieTasks.length > 0">
          <div v-for="task in newbieTasks" :key="task.id" class="newbie-task-item"
            :class="{ completed: task.completed, claimable: task.canClaim, locked: task.locked }">
            <div class="task-icon"><span>{{ task.icon || '📋' }}</span></div>
            <div class="task-info">
              <div class="task-name">{{ task.name }}</div>
              <div class="task-desc">{{ task.description }}</div>
              <div class="task-progress-bar" v-if="!task.completed && task.target > 0">
                <div class="progress-fill" :style="{ width: (task.current / task.target * 100) + '%' }"></div>
              </div>
              <div class="task-progress-text" v-if="!task.completed && task.target > 0">{{ task.current }}/{{ task.target }}</div>
            </div>
            <div class="task-rewards">
              <span v-for="(reward, idx) in task.rewards" :key="idx" class="reward-icon">{{ reward.icon }} {{ reward.amount }}</span>
            </div>
            <BaseButton v-if="task.canClaim" variant="primary" size="sm" @click="claimNewbieTask(task.id)">领取</BaseButton>
            <span v-else-if="task.completed" class="completed-icon">✓</span>
            <span v-else-if="task.locked" class="locked-icon">🔒</span>
          </div>
        </div>

        <div class="newbie-empty" v-else>
          <div class="empty-icon">🌱</div>
          <div class="empty-text">暂无可用任务</div>
        </div>

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
  </BasePanel>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import BasePanel from './base/BasePanel.vue'
import BaseButton from './base/BaseButton.vue'
import { useToast } from './common/toastComposable.js'

const emit = defineEmits(['close'])
const toast = useToast()

const tabItems = [
  { id: 'daily', icon: '📝', name: '每日签到' },
  { id: 'month-card', icon: '💎', name: '月卡' },
  { id: 'level', icon: '📦', name: '等级礼包' },
  { id: 'achievement', icon: '🏅', name: '成就奖励' },
  { id: 'login', icon: '🎁', name: '登录奖励' },
  { id: 'newbie', icon: '🌱', name: '新手任务' },
]

const activeTab = ref('daily')
const activeCategory = ref('combat')
const playerLevel = ref(25)
const isSigning = ref(false)
const todayReward = ref(0)
const countdownTimer = ref(null)

const monthCardStatus = ref({ lifetime: false, lifetimeClaimed: false, lifetimeDays: 0, noble: false, nobleClaimed: false, nobleDays: 0 })

const dailySign = ref({
  currentStreak: 12, todaySigned: false,
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
    { day: 30, icon: '👑', amount: 1, signed: false, isToday: false, isFuture: false },
  ],
  cumulativeRewards: [
    { days: 7, icon: '💰', name: '500灵石', claimed: true },
    { days: 14, icon: '⚗️', name: '中级经验丹x3', claimed: true },
    { days: 21, icon: '💎', name: '50钻石', claimed: true },
    { days: 30, icon: '🎁', name: '豪华礼包', claimed: false },
  ],
})

const levelRewards = ref([
  { level: 1, items: [{ icon: '💰', name: '灵石', amount: 100 }], claimed: true },
  { level: 5, items: [{ icon: '💰', name: '灵石', amount: 500 }, { icon: '⚗️', name: '经验丹', amount: 3 }], claimed: true },
  { level: 10, items: [{ icon: '💎', name: '钻石', amount: 10 }, { icon: '🎁', name: '新手礼包', amount: 1 }], claimed: true },
  { level: 15, items: [{ icon: '💰', name: '灵石', amount: 2000 }, { icon: '⚗️', name: '中级经验丹', amount: 5 }], claimed: true },
  { level: 20, items: [{ icon: '💎', name: '钻石', amount: 30 }, { icon: '🎁', name: '进阶礼包', amount: 1 }], claimed: false },
  { level: 25, items: [{ icon: '💰', name: '灵石', amount: 5000 }, { icon: '⚗️', name: '高级经验丹', amount: 10 }, { icon: '📚', name: '技能书', amount: 1 }], claimed: false },
  { level: 30, items: [{ icon: '💎', name: '钻石', amount: 50 }, { icon: '🎁', name: '豪华礼包', amount: 1 }], claimed: false },
  { level: 40, items: [{ icon: '👑', name: '称号', amount: 1 }, { icon: '💎', name: '钻石', amount: 100 }], claimed: false },
  { level: 50, items: [{ icon: '🐎', name: '坐骑', amount: 1 }, { icon: '💎', name: '钻石', amount: 200 }], claimed: false },
])

const achievementCategories = ref([
  { id: 'combat', icon: '⚔️', name: '战斗' },
  { id: 'collection', icon: '📦', name: '收集' },
  { id: 'social', icon: '👥', name: '社交' },
  { id: 'explore', icon: '🗺️', name: '探索' },
])

const achievements = ref([
  { id: 1, category: 'combat', name: '初出茅庐', description: '击败10只怪物', icon: '⚔️', iconClass: 'icon-combat', current: 10, target: 10, progress: 100, completed: true, canClaim: true, rewards: [{ icon: '💰', name: '灵石', amount: 100 }] },
  { id: 2, category: 'combat', name: '小有名气', description: '击败100只怪物', icon: '⚔️', iconClass: 'icon-combat', current: 75, target: 100, progress: 75, completed: false, canClaim: false, rewards: [{ icon: '💰', name: '灵石', amount: 500 }] },
  { id: 3, category: 'combat', name: '名震天下', description: '击败1000只怪物', icon: '🏆', iconClass: 'icon-combat', current: 200, target: 1000, progress: 20, completed: false, canClaim: false, rewards: [{ icon: '💎', name: '钻石', amount: 50 }] },
  { id: 4, category: 'collection', name: '收藏家', description: '收集10件装备', icon: '📦', iconClass: 'icon-collection', current: 10, target: 10, progress: 100, completed: true, canClaim: true, rewards: [{ icon: '⚗️', name: '经验丹', amount: 5 }] },
  { id: 5, category: 'collection', name: '富甲一方', description: '拥有10000灵石', icon: '💰', iconClass: 'icon-collection', current: 15000, target: 10000, progress: 100, completed: true, canClaim: true, rewards: [{ icon: '💎', name: '钻石', amount: 20 }] },
  { id: 6, category: 'social', name: '广结善缘', description: '添加10个好友', icon: '👥', iconClass: 'icon-social', current: 8, target: 10, progress: 80, completed: false, canClaim: false, rewards: [{ icon: '💰', name: '灵石', amount: 300 }] },
  { id: 7, category: 'explore', name: '探索者', description: '探索5张地图', icon: '🗺️', iconClass: 'icon-explore', current: 5, target: 5, progress: 100, completed: true, canClaim: true, rewards: [{ icon: '📚', name: '技能书', amount: 1 }] },
])

const loginRewards = ref({
  firstRecharge: { claimed: false, bonus: 100, countdown: 0, isActive: false },
  secondDay: { claimed: false, canClaim: false, items: [] },
  thirdDay: { claimed: false, canClaim: false, items: [] },
  sevenDay: [
    { day: 1, items: [{ icon: '💰', name: '灵石', amount: 100 }], claimed: true, canClaim: false, isToday: false },
    { day: 2, items: [{ icon: '💰', name: '灵石', amount: 200 }], claimed: true, canClaim: false, isToday: false },
    { day: 3, items: [{ icon: '⚗️', name: '经验丹', amount: 3 }], claimed: true, canClaim: false, isToday: false },
    { day: 4, items: [{ icon: '💰', name: '灵石', amount: 300 }], claimed: true, canClaim: false, isToday: false },
    { day: 5, items: [{ icon: '💎', name: '钻石', amount: 10 }], claimed: true, canClaim: false, isToday: false },
    { day: 6, items: [{ icon: '💰', name: '灵石', amount: 500 }, { icon: '⚗️', name: '经验丹', amount: 5 }], claimed: false, canClaim: true, isToday: true },
    { day: 7, items: [{ icon: '🎁', name: '豪华礼包', amount: 1 }], claimed: false, canClaim: false, isToday: false },
  ],
  limited: {
    title: '周末登录礼包',
    remainTime: '2天12时',
    rewards: [
      { day: 1, icon: '💰', amount: 1000, claimed: true, canClaim: false },
      { day: 2, icon: '💎', amount: 20, claimed: false, canClaim: true },
    ],
  },
}

const firstRechargeConfig = ref({
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
    linggen_fruit: 3,
  },
})

const newbieTasks = ref([])

// Computed
const completedTaskCount = computed(() => newbieTasks.value.filter(t => t.completed).length)

const canClaimAny = computed(() => {
  if (!dailySign.value.todaySigned) return true
  if (dailySign.value.cumulativeRewards.some(r => dailySign.value.currentStreak >= r.days && !r.claimed)) return true
  if (levelRewards.value.some(r => playerLevel.value >= r.level && !r.claimed)) return true
  if (achievements.value.some(a => a.canClaim)) return true
  if (loginRewards.value.sevenDay.some(d => d.canClaim)) return true
  return false
})

const totalCanClaim = computed(() => {
  let count = 0
  if (!dailySign.value.todaySigned) count++
  count += dailySign.value.cumulativeRewards.filter(r => dailySign.value.currentStreak >= r.days && !r.claimed).length
  count += levelRewards.value.filter(r => playerLevel.value >= r.level && !r.claimed).length
  count += achievements.value.filter(a => a.canClaim).length
  count += loginRewards.value.sevenDay.filter(d => d.canClaim).length
  return count
})

const filteredAchievements = computed(() => achievements.value.filter(a => a.category === activeCategory.value))

// Lifecycle
onMounted(() => {
  loadSigninStatus()
  loadLoginRewards()
  loadFirstRechargeConfig()
  loadNewbieTasks()
  startCountdown()
})

onUnmounted(() => {
  if (countdownTimer.value) clearInterval(countdownTimer.value)
})

// Methods
async function buyMonthCard(cardType) {
  try {
    const res = await window.apiRequest('/api/vip/buy-month-card', 'POST', { cardType })
    if (res.success) {
      monthCardStatus.value[cardType] = true
      if (cardType === 'noble') monthCardStatus.value.nobleDays = 30
      toast.success('购买月卡成功')
    }
  } catch (err) {
    toast.error('购买月卡失败')
  }
}

async function claimMonthCardReward(cardType) {
  if (monthCardStatus.value[cardType + 'Claimed']) return
  try {
    const res = await window.apiRequest('/api/vip/claim-daily', 'POST', { cardType })
    if (res.success) {
      monthCardStatus.value[cardType + 'Claimed'] = true
      if (cardType === 'lifetime') monthCardStatus.value.lifetimeDays++
      toast.success('领取月卡奖励成功')
    }
  } catch (err) {
    toast.error('领取月卡奖励失败')
  }
}

function getTabClaimCount(tabId) {
  switch (tabId) {
    case 'daily': {
      let count = 0
      if (!dailySign.value.todaySigned) count++
      count += dailySign.value.cumulativeRewards.filter(r => dailySign.value.currentStreak >= r.days && !r.claimed).length
      return count
    }
    case 'month-card': {
      let mcCount = 0
      if (monthCardStatus.value.lifetime && !monthCardStatus.value.lifetimeClaimed) mcCount++
      if (monthCardStatus.value.noble && !monthCardStatus.value.nobleClaimed) mcCount++
      return mcCount
    }
    case 'level':
      return levelRewards.value.filter(r => playerLevel.value >= r.level && !r.claimed).length
    case 'achievement':
      return achievements.value.filter(a => a.canClaim).length
    case 'login':
      return loginRewards.value.sevenDay.filter(d => d.canClaim).length
    default:
      return 0
  }
}

function doDailySign() {
  if (dailySign.value.todaySigned || isSigning.value) return
  isSigning.value = true
  const todayRewardItem = dailySign.value.rewards.find(r => r.isToday)
  todayReward.value = todayRewardItem ? todayRewardItem.amount : 100

  if (typeof window.welfareAPI !== 'undefined') {
    window.welfareAPI.signin().then(res => {
      isSigning.value = false
      if (res.success) {
        dailySign.value.todaySigned = true
        dailySign.value.currentStreak = res.data?.currentStreak || dailySign.value.currentStreak + 1
        toast.success(`签到成功！连续签到${dailySign.value.currentStreak}天`)
      }
    }).catch(() => {
      isSigning.value = false
      localSignin()
    })
  } else {
    localSignin()
  }
}

function localSignin() {
  isSigning.value = false
  const today = dailySign.value.rewards.find(r => r.isToday)
  if (today) today.signed = true
  dailySign.value.todaySigned = true
  dailySign.value.currentStreak++
  toast.success('签到成功！')
}

async function loadSigninStatus() {
  if (typeof window.welfareAPI !== 'undefined') {
    try {
      const res = await window.welfareAPI.getSigninStatus()
      if (res.success && res.data) {
        dailySign.value.currentStreak = res.data.currentStreak || 0
        dailySign.value.todaySigned = res.data.todaySigned || false
      }
    } catch (err) {
      console.error('加载签到状态失败:', err)
    }
  }
}

async function loadLoginRewards() {
  if (typeof window.welfareAPI !== 'undefined') {
    try {
      const secondDayRes = await window.welfareAPI.getSecondDayReward()
      if (secondDayRes.success && secondDayRes.data) {
        loginRewards.value.secondDay = secondDayRes.data
      }
      const thirdDayRes = await window.welfareAPI.getThirdDayReward()
      if (thirdDayRes.success && thirdDayRes.data) {
        loginRewards.value.thirdDay = thirdDayRes.data
      }
    } catch (err) {
      console.error('加载登录奖励失败:', err)
    }
  }
}

async function claimSecondDayReward() {
  if (typeof window.welfareAPI !== 'undefined') {
    try {
      const res = await window.welfareAPI.claimSecondDayReward()
      if (res.success) {
        loginRewards.value.secondDay.claimed = true
        loginRewards.value.secondDay.canClaim = false
        toast.success('次日礼包领取成功！')
      }
    } catch (err) {
      console.error('领取次日奖励失败:', err)
    }
  }
}

async function claimThirdDayReward() {
  if (typeof window.welfareAPI !== 'undefined') {
    try {
      const res = await window.welfareAPI.claimThirdDayReward()
      if (res.success) {
        loginRewards.value.thirdDay.claimed = true
        loginRewards.value.thirdDay.canClaim = false
        toast.success('三日礼包领取成功！')
      }
    } catch (err) {
      console.error('领取三日奖励失败:', err)
    }
  }
}

async function loadFirstRechargeConfig() {
  if (typeof window.firstRechargeAPI !== 'undefined') {
    try {
      const res = await window.firstRechargeAPI.getConfig()
      if (res.success && res.data) {
        firstRechargeConfig.value = res.data
        loginRewards.value.firstRecharge.claimed = res.data.claimed || false
        loginRewards.value.firstRecharge.isActive = res.data.isActive || false
        loginRewards.value.firstRecharge.countdown = res.data.countdown || 0
        startCountdown()
      }
    } catch (err) {
      console.error('加载首充配置失败:', err)
    }
  }
}

async function claimFirstRecharge() {
  if (typeof window.firstRechargeAPI !== 'undefined') {
    try {
      const res = await window.firstRechargeAPI.claimV2()
      if (res.success) {
        loginRewards.value.firstRecharge.claimed = true
        firstRechargeConfig.value.claimed = true
        toast.success('首充奖励领取成功！')
      }
    } catch (err) {
      console.error('领取首充奖励失败:', err)
    }
  }
}

function startCountdown() {
  if (countdownTimer.value) clearInterval(countdownTimer.value)
  if (loginRewards.value.firstRecharge.isActive && !loginRewards.value.firstRecharge.claimed) {
    countdownTimer.value = setInterval(() => {
      if (loginRewards.value.firstRecharge.countdown > 0) {
        loginRewards.value.firstRecharge.countdown--
      } else {
        clearInterval(countdownTimer.value)
      }
    }, 1000)
  }
}

function formatCountdown(seconds) {
  if (seconds <= 0) return ''
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return days + '天'
  }
  return hours + '时' + minutes.toString().padStart(2, '0') + '分'
}

async function loadNewbieTasks() {
  if (typeof window.newbieAPI !== 'undefined') {
    try {
      const res = await window.newbieAPI.getTasks()
      if (res.success && res.data) {
        newbieTasks.value = res.data
      }
    } catch (err) {
      console.error('加载新手任务失败:', err)
    }
  }
}

async function claimNewbieTask(taskId) {
  if (typeof window.newbieAPI !== 'undefined') {
    try {
      const res = await window.newbieAPI.claim(taskId)
      if (res.success) {
        const task = newbieTasks.value.find(t => t.id === taskId)
        if (task) {
          task.claimed = true
          task.canClaim = false
        }
        toast.success('任务奖励领取成功！')
      }
    } catch (err) {
      console.error('领取任务奖励失败:', err)
    }
  }
}

function claimCumulativeReward(reward) {
  if (dailySign.value.currentStreak >= reward.days && !reward.claimed) {
    reward.claimed = true
    toast.reward('领取累计签到奖励：' + reward.name)
  }
}

function claimLevelReward(reward) {
  if (playerLevel.value >= reward.level && !reward.claimed) {
    reward.claimed = true
    toast.reward('领取等级礼包：' + reward.level + '级')
  }
}

function claimAchievementReward(achievement) {
  if (achievement.canClaim) {
    achievement.canClaim = false
    toast.reward('领取成就奖励：' + achievement.name)
  }
}

function claimSevenDayReward(day) {
  if (day.canClaim) {
    day.canClaim = false
    day.claimed = true
    toast.reward('领取7日奖励第' + day.day + '天')
  }
}

function claimAll() {
  if (!dailySign.value.todaySigned) doDailySign()
  dailySign.value.cumulativeRewards.forEach(r => {
    if (dailySign.value.currentStreak >= r.days && !r.claimed) r.claimed = true
  })
  levelRewards.value.forEach(r => {
    if (playerLevel.value >= r.level && !r.claimed) r.claimed = true
  })
  achievements.value.forEach(a => {
    if (a.canClaim) a.canClaim = false
  })
  loginRewards.value.sevenDay.forEach(d => {
    if (d.canClaim) {
      d.canClaim = false
      d.claimed = true
    }
  })
  toast.success('一键领取完成！')
}

function goToRecharge() {
  console.log('跳转到充值页面')
}
</script>

<style scoped>
.tab-content { animation: fadeIn 0.3s ease; }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.sign-header {
  display: flex; justify-content: space-between; align-items: center;
  background: linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,165,0,0.1));
  padding: 16px 20px; border-radius: 12px; border: 1px solid rgba(255,215,0,0.2);
}

.sign-info { display: flex; align-items: center; gap: 12px; }

.streak-icon { font-size: 32px; animation: flame 1.5s infinite alternate; }

@keyframes flame {
  0% { transform: scale(1); filter: brightness(1); }
  100% { transform: scale(1.1); filter: brightness(1.2); }
}

.streak-text { font-size: 15px; color: #ccc; background: rgba(0,0,0,0.3); padding: 6px 14px; border-radius: 20px; }
.streak-text strong { color: #ffd700; font-size: 22px; text-shadow: 0 0 10px rgba(255,215,0,0.5); }

.sign-status { font-size: 14px; padding: 6px 12px; border-radius: 20px; background: rgba(255,255,255,0.1); }
.sign-status.signed { background: rgba(0,255,0,0.2); color: #7bed9f; }

.sign-btn-reward { padding: 4px 12px; background: rgba(255,255,255,0.2); border-radius: 20px; font-size: 14px; }

.signed-status {
  display: flex; flex-direction: column; align-items: center; padding: 20px;
  background: linear-gradient(135deg, rgba(0,255,136,0.1), rgba(0,210,211,0.1));
  border-radius: 12px; border: 1px solid rgba(0,255,136,0.3);
}

.signed-badge {
  display: flex; align-items: center; gap: 8px; padding: 10px 20px;
  background: linear-gradient(135deg, #00ff88, #00d2d3); border-radius: 25px;
  color: #1a1a2e; font-weight: bold; font-size: 16px;
}

.badge-icon { font-size: 20px; animation: bounce 1s infinite; }

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

.signed-reward-hint { margin-top: 12px; color: #888; font-size: 13px; }

.sign-calendar { background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; }

.calendar-title { font-size: 16px; margin-bottom: 12px; color: #ffd700; }

.calendar-days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }

.calendar-day {
  display: flex; flex-direction: column; align-items: center; padding: 8px 4px;
  background: rgba(255,255,255,0.05); border-radius: 8px; position: relative; transition: all 0.3s;
}

.calendar-day.signed { background: rgba(0,255,0,0.15); border: 1px solid rgba(0,255,0,0.3); }

.calendar-day.today { border: 2px solid #ffd700; box-shadow: 0 0 15px rgba(255,215,0,0.4); }
.calendar-day.today .day-number { color: #ffd700; }

.calendar-day.future { opacity: 0.5; }

.day-number { font-size: 12px; color: #aaa; margin-bottom: 4px; }

.day-reward { display: flex; align-items: center; gap: 2px; font-size: 11px; }
.reward-icon { font-size: 14px; }
.reward-amount { color: #fff; }

.day-status { position: absolute; top: 4px; right: 4px; font-size: 10px; color: #7bed9f; }

.today-dot { display: block; width: 8px; height: 8px; background: #ffd700; border-radius: 50%; animation: pulse 1.5s infinite; }

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}

.cumulative-section { margin-top: 8px; }

.section-title { font-size: 16px; margin-bottom: 12px; color: #ffd700; }

.cumulative-rewards { display: flex; gap: 12px; flex-wrap: wrap; }

.cumulative-item {
  flex: 1; min-width: 120px; display: flex; flex-direction: column; align-items: center;
  padding: 12px; background: rgba(255,255,255,0.05); border-radius: 10px; border: 1px solid transparent; cursor: pointer; transition: all 0.3s;
}

.cumulative-item:hover { background: rgba(255,255,255,0.1); }
.cumulative-item.claimed { border-color: rgba(0,255,0,0.3); opacity: 0.7; }
.cumulative-item.claimable { border-color: rgba(255,215,0,0.5); background: rgba(255,215,0,0.1); animation: glow 2s infinite; }

@keyframes glow {
  0%, 100% { box-shadow: 0 0 5px rgba(255,215,0,0.3); }
  50% { box-shadow: 0 0 15px rgba(255,215,0,0.5); }
}

.cum-days { font-size: 14px; color: #aaa; margin-bottom: 8px; }
.cum-reward { display: flex; align-items: center; gap: 6px; font-size: 14px; color: #fff; }
.cum-icon { font-size: 18px; }
.cum-action { margin-top: 8px; font-size: 12px; color: #7bed9f; }

.claim-dot { display: inline-block; padding: 2px 8px; background: linear-gradient(135deg, #ffd700, #ff9900); color: #333; border-radius: 10px; font-weight: bold; }

.claim-badge { background: #ff4757; color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 12px; margin-left: 6px; }

/* 月卡样式 */
.month-card-section { display: flex; flex-direction: column; gap: 20px; }
.month-cards { display: flex; flex-direction: column; gap: 20px; }

.month-card {
  position: relative; background: linear-gradient(135deg, rgba(102,126,234,0.2), rgba(118,75,162,0.2));
  border-radius: 20px; padding: 25px; border: 2px solid transparent; transition: all 0.3s;
}

.month-card:hover { transform: translateY(-5px); box-shadow: 0 15px 35px rgba(102,126,234,0.3); }
.month-card.owned { background: linear-gradient(135deg, rgba(76,175,80,0.2), rgba(56,142,60,0.2)); border-color: rgba(76,175,80,0.5); }
.month-card.noble { background: linear-gradient(135deg, rgba(255,152,0,0.2), rgba(244,67,54,0.2)); }
.month-card.noble.owned { background: linear-gradient(135deg, rgba(255,152,0,0.25), rgba(244,67,54,0.25)); }

.card-badge { position: absolute; top: 15px; right: 15px; padding: 5px 15px; background: #4caf50; border-radius: 20px; color: #fff; font-size: 12px; font-weight: bold; }

.card-header { display: flex; align-items: center; gap: 15px; margin-bottom: 20px; }
.card-icon { font-size: 48px; }
.card-title .name { display: block; color: #fff; font-size: 22px; font-weight: bold; }
.card-title .tag { display: block; font-size: 12px; opacity: 0.7; margin-top: 3px; }

.card-rewards { background: rgba(0,0,0,0.2); border-radius: 15px; padding: 20px; margin-bottom: 20px; }
.reward-title { color: #ffd700; font-size: 14px; font-weight: bold; margin-bottom: 15px; }
.reward-items { display: flex; gap: 20px; }

.reward-item { display: flex; flex-direction: column; align-items: center; gap: 5px; flex: 1; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 12px; }
.reward-item.special { background: rgba(255,152,0,0.15); border: 1px solid rgba(255,152,0,0.3); }

.reward-icon { font-size: 28px; }
.reward-amount { color: #ffd700; font-size: 20px; font-weight: bold; }
.reward-label { font-size: 12px; opacity: 0.7; }

.card-price { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.price-label { color: #fff; font-size: 14px; }
.price-value { display: flex; align-items: center; gap: 5px; color: #f093fb; font-size: 28px; font-weight: bold; }
.price-value .icon { font-size: 24px; }

.claim-section { display: flex; flex-direction: column; gap: 15px; }
.claim-info { display: flex; justify-content: space-between; align-items: center; }
.claim-status { color: #4caf50; font-weight: bold; font-size: 14px; }
.claim-status.claimed { color: rgba(255,255,255,0.5); }
.claim-days { font-size: 12px; opacity: 0.7; }

.privilege-info { background: rgba(255,255,255,0.03); border-radius: 15px; padding: 20px; }
.privilege-info h4 { color: #667eea; font-size: 16px; margin-bottom: 15px; }
.privilege-info ul { list-style: none; padding: 0; margin: 0; }
.privilege-info li { color: rgba(255,255,255,0.7); font-size: 13px; padding: 8px 0; padding-left: 20px; position: relative; }
.privilege-info li::before { content: '•'; position: absolute; left: 0; color: #667eea; }

/* 等级礼包样式 */
.level-rewards-section { display: flex; flex-direction: column; gap: 16px; }

.section-header { display: flex; align-items: center; gap: 10px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); }
.section-icon { font-size: 20px; }
.section-title { font-size: 18px; font-weight: bold; }
.current-level { margin-left: auto; font-size: 14px; color: #ffd700; background: rgba(255,215,0,0.1); padding: 4px 12px; border-radius: 20px; }

.level-rewards-list { display: flex; flex-direction: column; gap: 12px; }

.level-reward-item {
  display: flex; align-items: center; gap: 16px; padding: 16px;
  background: rgba(255,255,255,0.05); border-radius: 12px; border: 1px solid transparent; cursor: pointer; transition: all 0.3s;
}

.level-reward-item:hover { background: rgba(255,255,255,0.1); }
.level-reward-item.available { border-color: rgba(255,215,0,0.3); background: rgba(255,215,0,0.05); }
.level-reward-item.claimed { opacity: 0.6; }
.level-reward-item.locked { opacity: 0.5; }

.level-badge { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 60px; height: 60px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 12px; }
.level-num { font-size: 24px; font-weight: bold; color: #fff; }
.level-unit { font-size: 12px; color: rgba(255,255,255,0.8); }

.level-reward-content { flex: 1; }

.reward-items { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
.reward-items .reward-item { font-size: 13px; padding: 4px 10px; background: rgba(255,215,0,0.1); border-radius: 15px; color: #ffd700; }

.level-status { font-size: 12px; }
.status-claimed { color: #7bed9f; }
.status-available { color: #ffd700; }
.status-locked { color: #aaa; }

/* 成就奖励样式 */
.achievement-rewards-section { display: flex; flex-direction: column; gap: 16px; }

.achievement-categories { display: flex; gap: 8px; flex-wrap: wrap; }

.category-btn { padding: 8px 16px; background: rgba(255,255,255,0.05); border: 1px solid transparent; border-radius: 20px; color: #aaa; cursor: pointer; transition: all 0.3s; }
.category-btn:hover { background: rgba(255,255,255,0.1); }
.category-btn.active { background: linear-gradient(135deg, rgba(102,126,234,0.3), rgba(118,75,162,0.3)); border-color: rgba(102,126,234,0.5); color: #fff; }

.achievement-list { display: flex; flex-direction: column; gap: 12px; }

.achievement-item { display: flex; align-items: center; gap: 16px; padding: 16px; background: rgba(255,255,255,0.05); border-radius: 12px; border: 1px solid transparent; transition: all 0.3s; }
.achievement-item.claimable { border-color: rgba(255,215,0,0.3); background: rgba(255,215,0,0.05); }

.achievement-icon { width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; font-size: 28px; background: rgba(255,255,255,0.1); border-radius: 50%; }

.achievement-info { flex: 1; }
.achievement-name { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
.achievement-desc { font-size: 12px; color: #aaa; margin-bottom: 8px; }

.achievement-progress { display: flex; align-items: center; gap: 8px; }
.progress-bar { flex: 1; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); }
.progress-text { font-size: 11px; color: #aaa; }

.achievement-reward { display: flex; gap: 8px; }
.achievement-reward .reward-icon { font-size: 24px; }

.completed-badge { color: #7bed9f; font-size: 20px; }

/* 登录奖励样式 */
.login-rewards-section { display: flex; flex-direction: column; gap: 20px; }

.first-recharge-card { background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 16px; overflow: hidden; }

.recharge-banner { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 20px; background: rgba(0,0,0,0.2); }
.banner-icon { font-size: 36px; }
.banner-text { font-size: 24px; font-weight: bold; }
.banner-tag { padding: 4px 12px; background: #ffd700; color: #333; border-radius: 20px; font-size: 14px; font-weight: bold; }

.recharge-content { display: flex; align-items: center; justify-content: space-between; padding: 20px; }
.recharge-info { display: flex; flex-direction: column; gap: 8px; }
.recharge-amount { font-size: 16px; color: rgba(255,255,255,0.9); }

.recharge-reward-detail { margin-top: 8px; }
.reward-list-title { font-size: 14px; color: rgba(255,255,255,0.8); margin-bottom: 8px; }
.reward-list { display: flex; flex-wrap: wrap; gap: 8px; }
.reward-list .reward-item { display: flex; align-items: center; gap: 4px; padding: 4px 10px; background: rgba(255,215,0,0.15); border-radius: 15px; font-size: 12px; color: #ffd700; }
.reward-list .item-icon { font-size: 14px; }
.reward-list .item-text strong { color: #fff; font-weight: bold; }
.reward-list .title-reward { background: rgba(255,152,0,0.2); border: 1px solid rgba(255,152,0,0.4); }

.recharge-reward { display: flex; align-items: center; gap: 8px; }
.diamond-icon { font-size: 24px; }
.reward-text { font-size: 14px; color: #ffd700; }
.reward-text strong { font-size: 20px; }

.section-subtitle { font-size: 16px; margin-bottom: 12px; color: #ffd700; }

.seven-day-calendar { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }

.seven-day-item { display: flex; flex-direction: column; align-items: center; padding: 12px 8px; background: rgba(255,255,255,0.05); border-radius: 10px; transition: all 0.3s; }
.seven-day-item.claimed { background: rgba(0,255,0,0.1); border: 1px solid rgba(0,255,0,0.2); }
.seven-day-item.today { border: 2px solid #ffd700; }
.seven-day-item.claimable { border: 2px solid #00d2d3; animation: glow-cyan 2s infinite; }

@keyframes glow-cyan {
  0%, 100% { box-shadow: 0 0 5px rgba(0,210,211,0.3); }
  50% { box-shadow: 0 0 15px rgba(0,210,211,0.5); }
}

.day-label { font-size: 12px; color: #aaa; margin-bottom: 8px; }
.day-rewards { display: flex; gap: 4px; margin-bottom: 8px; }
.day-item { font-size: 20px; }
.day-status { font-size: 12px; }
.claimed-icon { color: #7bed9f; }
.locked-icon { opacity: 0.3; }

.limited-login-section { margin-top: 16px; }
.limited-banner { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: linear-gradient(135deg, #fa709a, #fee140); border-radius: 10px; margin-bottom: 12px; }
.limited-icon { font-size: 20px; }
.limited-title { font-size: 16px; font-weight: bold; color: #333; }
.limited-time { margin-left: auto; font-size: 14px; color: #333; font-weight: bold; }

.limited-rewards { display: flex; gap: 12px; }
.limited-item { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 16px; background: rgba(255,255,255,0.05); border-radius: 10px; border: 1px solid transparent; }
.limited-item.claimed { border-color: rgba(0,255,0,0.3); opacity: 0.7; }
.limited-item.today { border-color: rgba(255,215,0,0.5); }
.limited-day { font-size: 12px; color: #aaa; margin-bottom: 8px; }
.limited-icon { font-size: 28px; margin-bottom: 8px; }
.limited-status { font-size: 12px; }
.can-claim { display: inline-block; padding: 2px 10px; background: linear-gradient(135deg, #fa709a, #fee140); color: #333; border-radius: 10px; font-weight: bold; }

.first-recharge-claim { margin: 16px 0; }
.already-claimed { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 16px; background: rgba(76,175,80,0.15); border: 1px solid rgba(76,175,80,0.3); border-radius: 12px; }
.already-claimed .check-icon { font-size: 24px; }
.already-claimed .claimed-text { color: #4caf50; font-size: 16px; font-weight: bold; }

.login-day-reward-section { margin: 16px 0; }
.day-reward-card { display: flex; align-items: center; justify-content: space-between; padding: 16px; background: rgba(255,255,255,0.05); border-radius: 12px; border: 2px solid transparent; }
.day-reward-card.claimable { border-color: rgba(0,210,211,0.5); background: rgba(0,210,211,0.1); animation: glow-cyan 2s infinite; }
.day-reward-card.claimed { border-color: rgba(0,255,0,0.3); opacity: 0.7; }

.day-reward-items { display: flex; gap: 12px; flex-wrap: wrap; }
.day-reward-item { padding: 6px 12px; background: rgba(255,215,0,0.1); border-radius: 20px; color: #ffd700; font-size: 14px; }

.claimed-badge { color: #7bed9f; font-size: 14px; }

/* 新手任务样式 */
.newbie-tasks-section { display: flex; flex-direction: column; gap: 16px
.task-progress { margin-left: auto; font-size: 14px; color: #ffd700; background: rgba(255,215,0,0.1); padding: 4px 12px; border-radius: 20px; }

.newbie-tasks-list { display: flex; flex-direction: column; gap: 12px; }

.newbie-task-item { display: flex; align-items: center; gap: 16px; padding: 16px; background: rgba(255,255,255,0.05); border-radius: 12px; border: 1px solid transparent; transition: all 0.3s; }
.newbie-task-item:hover { background: rgba(255,255,255,0.1); }
.newbie-task-item.claimable { border-color: rgba(0,210,211,0.5); background: rgba(0,210,211,0.1); }
.newbie-task-item.completed { opacity: 0.7; }
.newbie-task-item.locked { opacity: 0.5; }

.task-icon { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; font-size: 28px; background: rgba(255,255,255,0.1); border-radius: 12px; }

.task-info { flex: 1; }
.task-name { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
.task-desc { font-size: 12px; color: #aaa; margin-bottom: 8px; }

.task-progress-bar { height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; margin-bottom: 4px; }
.task-progress-bar .progress-fill { height: 100%; background: linear-gradient(90deg, #00d2d3, #3a7bd5); }

.task-progress-text { font-size: 11px; color: #aaa; }

.task-rewards { display: flex; gap: 8px; flex-wrap: wrap; }
.task-rewards .reward-icon { padding: 4px 10px; background: rgba(255,215,0,0.1); border-radius: 15px; font-size: 12px; color: #ffd700; }

.completed-icon { color: #7bed9f; font-size: 20px; }

.newbie-empty { text-align: center; padding: 40px 20px; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-text { color: #aaa; font-size: 14px; }

.newbie-tips { background: rgba(255,255,255,0.03); border-radius: 12px; padding: 16px; margin-top: 8px; }
.newbie-tips h4 { color: #667eea; font-size: 14px; margin-bottom: 12px; }
.newbie-tips ul { list-style: none; padding: 0; margin: 0; }
.newbie-tips li { color: rgba(255,255,255,0.6); font-size: 12px; padding: 6px 0; padding-left: 16px; position: relative; }
.newbie-tips li::before { content: '•'; position: absolute; left: 0; color: #667eea; }

/* 首充倒计时 */
.first-recharge-card.countdown-active { animation: countdown-glow 2s infinite; }

@keyframes countdown-glow {
  0%, 100% { box-shadow: 0 0 10px rgba(255,215,0,0.3); }
  50% { box-shadow: 0 0 25px rgba(255,215,0,0.6); }
}
