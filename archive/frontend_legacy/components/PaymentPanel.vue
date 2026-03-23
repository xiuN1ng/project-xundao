<template>
  <div class="payment-panel">
    <!-- 顶部 -->
    <div class="panel-header">
      <div class="panel-title">
        <span class="title-icon">💎</span>
        <span>充值中心</span>
      </div>
      <div class="user-balance">
        <span class="balance-icon">💰</span>
        <span class="balance-value">{{ balance }}</span>
        <span class="balance-label">灵石</span>
      </div>
    </div>

    <!-- 首充礼包 -->
    <div class="first-recharge" v-if="!firstRechargeClaimed">
      <div class="recharge-banner">
        <div class="banner-content">
          <div class="banner-title">🎉 首充特惠</div>
          <div class="banner-subtitle">首充任意金额，即可领取超值礼包！</div>
        </div>
        <div class="banner-glow"></div>
      </div>
      <div class="first-reward-card">
        <div class="reward-header">
          <span class="reward-icon">🎁</span>
          <span class="reward-title">首充礼包</span>
        </div>
        <div class="reward-items">
          <div class="reward-item" v-for="(item, index) in firstRechargeRewards" :key="index">
            <span class="item-icon">{{ item.icon }}</span>
            <span class="item-name">{{ item.name }}</span>
            <span class="item-count">x{{ item.count }}</span>
          </div>
        </div>
        <div class="reward-action">
          <button class="btn btn-gold btn-large" @click="handleFirstRecharge">
            <span class="btn-text">首充任意金额</span>
            <span class="btn-glow"></span>
          </button>
        </div>
      </div>
    </div>

    <!-- 已首充状态 -->
    <div class="first-recharged" v-else>
      <div class="recharged-badge">
        <span class="badge-icon">✅</span>
        <span class="badge-text">首充礼包已领取</span>
      </div>
    </div>

    <!-- 充值套餐 -->
    <div class="recharge-section">
      <div class="section-title">
        <span>💎 灵石充值</span>
      </div>
      <div class="recharge-packages">
        <div 
          v-for="pkg in rechargePackages" 
          :key="pkg.id"
          class="package-card"
          :class="{ 
            selected: selectedPackage?.id === pkg.id,
            popular: pkg.popular 
          }"
          @click="selectPackage(pkg)"
        >
          <div class="popular-tag" v-if="pkg.popular">最受欢迎</div>
          <div class="package-icon">
            <span>💎</span>
          </div>
          <div class="package-amount">
            <span class="diamond-count">{{ pkg.diamonds }}</span>
            <span class="diamond-label">灵石</span>
          </div>
          <div class="package-price">
            <span class="currency">¥</span>
            <span class="price-value">{{ pkg.price }}</span>
          </div>
          <div class="package-bonus" v-if="pkg.bonus > 0">
            <span class="bonus-tag">送{{ pkg.bonus }}灵石</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 月卡 -->
    <div class="month-card-section">
      <div class="section-title">
        <span>📅 订阅特权</span>
      </div>
      <div class="month-cards">
        <div 
          class="month-card"
          :class="{ owned: monthlyCards.basic.owned }"
        >
          <div class="card-header">
            <span class="card-icon">🌟</span>
            <span class="card-name">月卡</span>
          </div>
          <div class="card-price">
            <span class="currency">¥</span>
            <span class="price">{{ monthlyCards.basic.price }}</span>
          </div>
          <div class="card-benefits">
            <div class="benefit-item">
              <span>每日{{ monthlyCards.basic.dailyDiamonds }}灵石</span>
            </div>
            <div class="benefit-item">
              <span>专属称号</span>
            </div>
          </div>
          <button 
            class="btn"
            :class="monthlyCards.basic.owned ? 'btn-disabled' : 'btn-primary'"
            :disabled="monthlyCards.basic.owned"
            @click="buyMonthlyCard('basic')"
          >
            {{ monthlyCards.basic.owned ? '已购买' : '立即购买' }}
          </button>
        </div>

        <div 
          class="month-card premium"
          :class="{ owned: monthlyCards.premium.owned }"
        >
          <div class="card-header">
            <span class="card-icon">👑</span>
            <span class="card-name">年卡</span>
          </div>
          <div class="card-price">
            <span class="currency">¥</span>
            <span class="price">{{ monthlyCards.premium.price }}</span>
          </div>
          <div class="card-benefits">
            <div class="benefit-item">
              <span>每日{{ monthlyCards.premium.dailyDiamonds }}灵石</span>
            </div>
            <div class="benefit-item">
              <span>专属坐骑</span>
            </div>
            <div class="benefit-item">
              <span>全道具8折</span>
            </div>
          </div>
          <button 
            class="btn"
            :class="monthlyCards.premium.owned ? 'btn-disabled' : 'btn-gold'"
            :disabled="monthlyCards.premium.owned"
            @click="buyMonthlyCard('premium')"
          >
            {{ monthlyCards.premium.owned ? '已购买' : '立即购买' }}
          </button>
        </div>
      </div>
    </div>

    <!-- VIP特权 -->
    <div class="vip-section">
      <div class="section-title">
        <span>👑 VIP特权</span>
      </div>
      <div class="vip-info" v-if="vipLevel > 0">
        <div class="vip-current">
          <span class="vip-badge">VIP{{ vipLevel }}</span>
          <span class="vip-expire">有效期至: {{ vipExpireDate }}</span>
        </div>
        <div class="vip-benefits-preview">
          <div class="vip-benefit-item" v-for="(benefit, index) in vipBenefits.slice(0, 3)" :key="index">
            <span class="benefit-icon">{{ benefit.icon }}</span>
            <span class="benefit-text">{{ benefit.name }}</span>
          </div>
        </div>
      </div>
      <div class="vip-levels">
        <div 
          v-for="level in vipLevels" 
          :key="level.level"
          class="vip-level-card"
          :class="{ current: vipLevel >= level.level }"
        >
          <div class="level-badge" :class="`vip${level.level}`">
            <span>VIP{{ level.level }}</span>
          </div>
          <div class="level-name">{{ level.name }}</div>
          <div class="level-price">¥{{ level.price }}</div>
          <button 
            class="btn btn-sm"
            :class="vipLevel >= level.level ? 'btn-disabled' : 'btn-primary'"
            :disabled="vipLevel >= level.level"
            @click="buyVip(level)"
          >
            {{ vipLevel >= level.level ? '已开通' : '开通' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 充值记录 -->
    <div class="recharge-history">
      <button class="btn btn-small" @click="showHistory = true">
        📋 充值记录
      </button>
    </div>

    <!-- 支付弹窗 -->
    <div class="modal-overlay" v-if="showPaymentModal" @click.self="closePaymentModal">
      <div class="modal-content">
        <div class="modal-header">
          <div class="modal-title">确认充值</div>
          <button class="modal-close" @click="closePaymentModal">×</button>
        </div>
        <div class="payment-details">
          <div class="payment-item">
            <span class="item-label">充值商品</span>
            <span class="item-value">{{ selectedPackage?.diamonds }} 灵石</span>
          </div>
          <div class="payment-item" v-if="selectedPackage?.bonus > 0">
            <span class="item-label">赠送</span>
            <span class="item-value bonus">+{{ selectedPackage?.bonus }} 灵石</span>
          </div>
          <div class="payment-divider"></div>
          <div class="payment-total">
            <span class="total-label">实付</span>
            <span class="total-value">¥{{ selectedPackage?.price }}</span>
          </div>
        </div>
        <div class="payment-methods">
          <div class="method-title">选择支付方式</div>
          <div class="methods-grid">
            <div 
              v-for="method in paymentMethods" 
              :key="method.id"
              class="method-item"
              :class="{ selected: selectedMethod?.id === method.id }"
              @click="selectedMethod = method"
            >
              <span class="method-icon">{{ method.icon }}</span>
              <span class="method-name">{{ method.name }}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="closePaymentModal">取消</button>
          <button class="btn btn-primary" @click="confirmPayment">
            确认支付 ¥{{ selectedPackage?.price }}
          </button>
        </div>
      </div>
    </div>

    <!-- 充值记录弹窗 -->
    <div class="modal-overlay" v-if="showHistory" @click.self="showHistory = false">
      <div class="modal-content">
        <div class="modal-header">
          <div class="modal-title">充值记录</div>
          <button class="modal-close" @click="showHistory = false">×</button>
        </div>
        <div class="history-list">
          <div 
            v-for="record in rechargeHistory" 
            :key="record.id"
            class="history-item"
          >
            <div class="history-info">
              <span class="history-type">{{ record.type }}</span>
              <span class="history-date">{{ record.date }}</span>
            </div>
            <div class="history-amount">
              <span class="amount-value">+{{ record.amount }}</span>
              <span class="amount-label">灵石</span>
            </div>
            <div class="history-price">
              ¥{{ record.price }}
            </div>
          </div>
          <div class="empty-state" v-if="rechargeHistory.length === 0">
            <span>暂无充值记录</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  playerId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['recharge', 'purchase', 'claim'])

const balance = ref(0)
const firstRechargeClaimed = ref(false)
const selectedPackage = ref(null)
const selectedMethod = ref(null)
const showPaymentModal = ref(false)
const showHistory = ref(false)
const vipLevel = ref(0)
const vipExpireDate = ref('2025-12-31')

const monthlyCards = ref({
  basic: { 
    id: 'monthly', 
    price: 30, 
    dailyDiamonds: 100,
    owned: false 
  },
  premium: { 
    id: 'yearly', 
    price: 360, 
    dailyDiamonds: 500,
    owned: false 
  }
})

const firstRechargeRewards = [
  { icon: '💰', name: '双倍灵石', count: 1200 },
  { icon: '📚', name: '紫色功法箱', count: 1 },
  { icon: '💎', name: '强化石', count: 50 },
  { icon: '🍎', name: '灵根果', count: 3 },
  { icon: '👑', name: '首充豪侠', count: 1 }
]

const rechargePackages = ref([
  { id: 1, diamonds: 60, price: 6, bonus: 0 },
  { id: 2, diamonds: 300, price: 30, bonus: 30 },
  { id: 3, diamonds: 980, price: 98, bonus: 98 },
  { id: 4, diamonds: 1980, price: 198, bonus: 298 },
  { id: 5, diamonds: 3280, price: 328, bonus: 598 },
  { id: 6, diamonds: 6480, price: 648, bonus: 1480 }
])

const paymentMethods = ref([
  { id: 'wechat', icon: '💬', name: '微信支付' },
  { id: 'alipay', icon: '💳', name: '支付宝' },
  { id: 'ios', icon: '🍎', name: '苹果支付' }
])

const vipLevels = ref([
  { level: 1, name: '凡VIP', price: 6 },
  { level: 2, name: '灵VIP', price: 30 },
  { level: 3, name: '仙VIP', price: 98 },
  { level: 4, name: '神VIP', price: 298 },
  { level: 5, name: '天VIP', price: 648 }
])

const vipBenefits = ref([
  { icon: '💎', name: '每日领取灵石' },
  { icon: '⚡', name: '修炼速度+10%' },
  { icon: '🎁', name: '专属礼包' },
  { icon: '🌟', name: '装备强化概率+5%' },
  { icon: '👑', name: '尊贵称号' }
])

const rechargeHistory = ref([
  { id: 1, type: '灵石充值', date: '2024-01-15', amount: 300, price: 30 },
  { id: 2, type: '月卡', date: '2024-01-10', amount: 100, price: 30 }
])

const selectPackage = (pkg) => {
  selectedPackage.value = pkg
  showPaymentModal.value = true
}

const handleFirstRecharge = () => {
  // 跳转支付
  selectPackage(rechargePackages.value[0])
}

const buyMonthlyCard = (type) => {
  emit('purchase', { type: 'monthlyCard', card: type })
  monthlyCards.value[type].owned = true
}

const buyVip = (level) => {
  emit('purchase', { type: 'vip', level: level.level })
  vipLevel.value = level.level
}

const closePaymentModal = () => {
  showPaymentModal.value = false
  selectedMethod.value = null
}

const confirmPayment = () => {
  if (!selectedPackage.value || !selectedMethod.value) return
  
  emit('recharge', {
    package: selectedPackage.value,
    method: selectedMethod.value
  })
  
  // 模拟充值成功
  balance.value += selectedPackage.value.diamonds + (selectedPackage.value.bonus || 0)
  
  closePaymentModal()
}

defineExpose({
  balance,
  selectPackage
})
</script>

<style scoped>
.payment-panel {
  background: linear-gradient(180deg, rgba(18, 18, 32, 0.98), rgba(10, 10, 18, 0.98));
  border: 1px solid rgba(184, 134, 11, 0.25);
  border-radius: 16px;
  padding: 20px;
  color: #e8e8f0;
  max-height: 700px;
  overflow-y: auto;
}

/* 顶部 */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.panel-title {
  font-size: 20px;
  font-weight: bold;
  color: #ffd700;
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  font-size: 24px;
}

.user-balance {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 15px;
  background: rgba(255, 215, 0, 0.1);
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 20px;
}

.balance-icon {
  font-size: 16px;
}

.balance-value {
  font-size: 18px;
  font-weight: bold;
  color: #ffd700;
}

.balance-label {
  font-size: 12px;
  color: #aaa;
}

/* 首充 */
.first-recharge {
  margin-bottom: 25px;
}

.recharge-banner {
  position: relative;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(245, 158, 11, 0.2));
  border: 1px solid rgba(255, 215, 0, 0.4);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 15px;
  overflow: hidden;
}

.banner-content {
  position: relative;
  z-index: 1;
}

.banner-title {
  font-size: 24px;
  font-weight: bold;
  color: #ffd700;
  margin-bottom: 8px;
}

.banner-subtitle {
  font-size: 14px;
  color: #e8e8f0;
}

.banner-glow {
  position: absolute;
  top: -50%;
  right: -50%;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.3), transparent);
  animation: bannerGlow 3s ease-in-out infinite;
}

@keyframes bannerGlow {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.1); }
}

.first-reward-card {
  background: rgba(0, 0, 0, 0.4);
  border-radius: 12px;
  padding: 20px;
}

.reward-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 15px;
}

.reward-icon {
  font-size: 24px;
}

.reward-title {
  font-size: 18px;
  font-weight: bold;
  color: #ffd700;
}

.reward-items {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}

.reward-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.item-icon {
  font-size: 20px;
}

.item-name {
  flex: 1;
  font-size: 13px;
  color: #aaa;
}

.item-count {
  font-size: 14px;
  color: #ffd700;
  font-weight: bold;
}

.reward-action {
  text-align: center;
}

/* 按钮样式 */
.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
}

.btn-gold {
  background: linear-gradient(135deg, #ffd700, #f59e0b);
  color: #000;
}

.btn-gold:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(255, 215, 0, 0.4);
}

.btn-large {
  padding: 15px 40px;
  font-size: 16px;
}

.btn-disabled {
  background: rgba(255, 255, 255, 0.1);
  color: #666;
  cursor: not-allowed;
}

.btn-small {
  padding: 8px 16px;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.1);
  color: #aaa;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-glow {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: btnShine 2s infinite;
}

@keyframes btnShine {
  0% { left: -100%; }
  100% { left: 100%; }
}

/* 已首充 */
.first-recharged {
  margin-bottom: 25px;
}

.recharged-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 15px;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 10px;
}

.badge-icon {
  font-size: 20px;
}

.badge-text {
  font-size: 14px;
  color: #10b981;
}

/* 充值套餐 */
.recharge-section {
  margin-bottom: 25px;
}

.section-title {
  font-size: 16px;
  color: #aaa;
  margin-bottom: 15px;
}

.recharge-packages {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.package-card {
  position: relative;
  background: rgba(0, 0, 0, 0.4);
  border: 2px solid transparent;
  border-radius: 12px;
  padding: 15px 10px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.package-card:hover {
  border-color: rgba(255, 215, 0, 0.3);
  transform: translateY(-2px);
}

.package-card.selected {
  border-color: #ffd700;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
}

.package-card.popular {
  border-color: rgba(239, 68, 68, 0.5);
}

.popular-tag {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: #fff;
  font-size: 10px;
  padding: 3px 10px;
  border-radius: 10px;
  white-space: nowrap;
}

.package-icon {
  font-size: 28px;
  margin-bottom: 8px;
}

.diamond-count {
  font-size: 24px;
  font-weight: bold;
  color: #4ecdc4;
}

.diamond-label {
  font-size: 12px;
  color: #888;
}

.package-price {
  margin: 8px 0;
}

.currency {
  font-size: 14px;
  color: #ffd700;
}

.price-value {
  font-size: 20px;
  font-weight: bold;
  color: #ffd700;
}

.package-bonus {
  margin-top: 5px;
}

.bonus-tag {
  font-size: 11px;
  color: #10b981;
  padding: 3px 8px;
  background: rgba(16, 185, 129, 0.15);
  border-radius: 4px;
}

/* 月卡 */
.month-card-section {
  margin-bottom: 25px;
}

.month-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

.month-card {
  background: rgba(0, 0, 0, 0.4);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  transition: all 0.3s;
}

.month-card:hover {
  border-color: rgba(255, 215, 0, 0.3);
}

.month-card.premium {
  background: linear-gradient(180deg, rgba(255, 215, 0, 0.1), rgba(0, 0, 0, 0.4));
  border-color: rgba(255, 215, 0, 0.3);
}

.month-card.owned {
  opacity: 0.7;
}

.card-header {
  margin-bottom: 10px;
}

.card-icon {
  font-size: 32px;
  display: block;
  margin-bottom: 5px;
}

.card-name {
  font-size: 18px;
  font-weight: bold;
  color: #fff;
}

.card-price {
  margin-bottom: 15px;
}

.card-price .price {
  font-size: 28px;
  font-weight: bold;
  color: #ffd700;
}

.card-benefits {
  margin-bottom: 15px;
}

.benefit-item {
  font-size: 12px;
  color: #aaa;
  padding: 5px 0;
}

/* VIP */
.vip-section {
  margin-bottom: 20px;
}

.vip-info {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  padding: 15px;
  margin-bottom: 15px;
}

.vip-current {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 12px;
}

.vip-badge {
  background: linear-gradient(135deg, #ffd700, #b8860b);
  color: #000;
  font-size: 14px;
  font-weight: bold;
  padding: 5px 15px;
  border-radius: 15px;
}

.vip-expire {
  font-size: 12px;
  color: #888;
}

.vip-benefits-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.vip-benefit-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #aaa;
}

.benefit-icon {
  font-size: 14px;
}

.vip-levels {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 10px;
}

.vip-level-card {
  min-width: 80px;
  background: rgba(0, 0, 0, 0.4);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 12px 8px;
  text-align: center;
  transition: all 0.3s;
}

.vip-level-card.current {
  border-color: rgba(255, 215, 0, 0.5);
}

.level-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 8px;
}

.level-badge.vip1 { background: #c0c0c0; }
.level-badge.vip2 { background: #4ecdc4; }
.level-badge.vip3 { background: #667eea; }
.level-badge.vip4 { background: #9b59b6; }
.level-badge.vip5 { background: #ffd700; }

.level-name {
  font-size: 12px;
  color: #aaa;
  margin-bottom: 5px;
}

.level-price {
  font-size: 12px;
  color: #ffd700;
  margin-bottom: 8px;
}

/* 充值记录 */
.recharge-history {
  text-align: center;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: linear-gradient(180deg, #1a1a2e, #151530);
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 16px;
  padding: 20px;
  min-width: 350px;
  max-width: 90vw;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-title {
  font-size: 18px;
  font-weight: bold;
  color: #ffd700;
}

.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  color: #aaa;
  font-size: 20px;
  cursor: pointer;
}

.modal-close:hover {
  background: rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

/* 支付详情 */
.payment-details {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  padding: 15px;
  margin-bottom: 20px;
}

.payment-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.item-label {
  color: #aaa;
}

.item-value {
  color: #fff;
  font-weight: bold;
}

.item-value.bonus {
  color: #10b981;
}

.payment-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 15px 0;
}

.payment-total {
  display: flex;
  justify-content: space-between;
}

.total-label {
  color: #aaa;
}

.total-value {
  font-size: 24px;
  font-weight: bold;
  color: #ffd700;
}

/* 支付方式 */
.payment-methods {
  margin-bottom: 20px;
}

.method-title {
  font-size: 14px;
  color: #aaa;
  margin-bottom: 12px;
}

.methods-grid {
  display: flex;
  gap: 10px;
}

.method-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 15px 10px;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
}

.method-item:hover {
  border-color: rgba(255, 215, 0, 0.3);
}

.method-item.selected {
  border-color: #ffd700;
}

.method-icon {
  font-size: 24px;
}

.method-name {
  font-size: 12px;
  color: #aaa;
}

/* 历史记录 */
.history-list {
  max-height: 300px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  margin-bottom: 8px;
}

.history-info {
  flex: 1;
}

.history-type {
  display: block;
  color: #fff;
  font-size: 13px;
}

.history-date {
  font-size: 11px;
  color: #666;
}

.history-amount {
  text-align: right;
  margin-right: 15px;
}

.amount-value {
  color: #10b981;
  font-weight: bold;
}

.amount-label {
  font-size: 11px;
  color: #888;
}

.history-price {
  color: #ffd700;
  font-weight: bold;
}

.empty-state {
  text-align: center;
  padding: 30px;
  color: #666;
}

/* 响应式 */
@media (max-width: 480px) {
  .recharge-packages {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .month-cards {
    grid-template-columns: 1fr;
  }
}
</style>
