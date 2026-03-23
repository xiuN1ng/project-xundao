<template>
  <div class="month-card-panel">
    <!-- 顶部标题栏 -->
    <div class="panel-header">
      <div class="header-left">
        <span class="back-btn" @click="$emit('close')">←</span>
        <div class="panel-title">
          <span class="title-icon">💎</span>
          <span>月卡订阅</span>
        </div>
      </div>
      <div class="header-right">
        <div class="user-currency">
          <span class="currency-icon">💰</span>
          <span class="currency-value">{{ playerInfo.spirit_stones?.toLocaleString() || 0 }}</span>
        </div>
        <div class="user-currency diamonds">
          <span class="currency-icon">💎</span>
          <span class="currency-value">{{ playerInfo.diamonds?.toLocaleString() || 0 }}</span>
        </div>
      </div>
    </div>

    <!-- 会员状态横幅 -->
    <div class="membership-banner" v-if="hasAnyMembership">
      <div class="banner-content">
        <div class="banner-title">🎉 尊贵的会员大人</div>
        <div class="banner-status">
          <span v-if="membershipStatus.lifetime?.owned" class="status-badge lifetime">终身月卡</span>
          <span v-if="membershipStatus.monthly?.owned" class="status-badge monthly">贵族月卡{{ membershipStatus.monthly?.daysRemaining ? `·${membershipStatus.monthly.daysRemaining}天` : '' }}</span>
          <span v-if="membershipStatus.daily?.owned" class="status-badge daily">每日特惠</span>
        </div>
      </div>
    </div>

    <!-- 标签页 -->
    <div class="tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-name">{{ tab.name }}</span>
      </button>
    </div>

    <!-- 终身月卡 -->
    <div class="tab-content" v-if="activeTab === 'lifetime'">
      <div class="card-section">
        <div class="card-hero lifetime-card">
          <div class="hero-bg"></div>
          <div class="card-content">
            <div class="card-badge-area">
              <span class="card-tag">永久有效</span>
            </div>
            <div class="card-header">
              <div class="card-icon">👑</div>
              <div class="card-title">
                <span class="name">终身月卡</span>
                <span class="subtitle">一次购买 · 永久享受</span>
              </div>
            </div>
            
            <div class="card-rewards">
              <div class="rewards-title">🎁 每日可领取</div>
              <div class="rewards-list">
                <div class="reward-item" v-for="(benefit, idx) in membershipStatus.benefits?.lifetime" :key="idx">
                  <span class="benefit-icon">{{ benefit.icon }}</span>
                  <span class="benefit-name">{{ benefit.name }}</span>
                  <span class="benefit-amount" v-if="benefit.amount">{{ benefit.amount }}</span>
                  <span class="benefit-desc">{{ benefit.desc }}</span>
                </div>
              </div>
            </div>

            <div class="card-price">
              <div class="price-label">售价</div>
              <div class="price-value">
                <span class="icon">💎</span>
                <span class="amount">{{ membershipStatus.products?.lifetime?.price || 300 }}</span>
              </div>
            </div>

            <!-- 已购买状态 -->
            <div v-if="membershipStatus.lifetime?.owned" class="card-owned">
              <div class="owned-info">
                <span class="owned-badge">✓ 已购买</span>
                <span class="owned-days">已累计领取 {{ membershipStatus.lifetime?.totalDays || 0 }} 天</span>
              </div>
              <div class="claim-section">
                <button 
                  class="claim-btn"
                  :class="{ disabled: membershipStatus.lifetime?.claimedToday }"
                  :disabled="membershipStatus.lifetime?.claimedToday"
                  @click="claimReward('lifetime')"
                >
                  {{ membershipStatus.lifetime?.claimedToday ? '✓ 今日已领取' : '立即领取' }}
                </button>
              </div>
            </div>
            
            <!-- 未购买 -->
            <button v-else class="buy-btn" @click="purchaseMembership('lifetime')">
              <span>立即购买</span>
            </button>
          </div>
        </div>

        <!-- 专属特权 -->
        <div class="privilege-section">
          <div class="section-title">✨ 专属特权</div>
          <div class="privilege-list">
            <div class="privilege-item">
              <span class="p-icon">⚡</span>
              <span class="p-text">修炼速度+30%</span>
            </div>
            <div class="privilege-item">
              <span class="p-icon">🎁</span>
              <span class="p-text">每周专属礼包</span>
            </div>
            <div class="privilege-item">
              <span class="p-icon">💎</span>
              <span class="p-text">专属交易行</span>
            </div>
            <div class="privilege-item">
              <span class="p-icon">👑</span>
              <span class="p-text">尊贵身份标识</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 贵族月卡 -->
    <div class="tab-content" v-if="activeTab === 'monthly'">
      <div class="card-section">
        <div class="card-hero monthly-card">
          <div class="hero-bg"></div>
          <div class="card-content">
            <div class="card-badge-area">
              <span class="card-tag">30天有效期</span>
            </div>
            <div class="card-header">
              <div class="card-icon">🏆</div>
              <div class="card-title">
                <span class="name">贵族月卡</span>
                <span class="subtitle">高额回报 · 每日可领</span>
              </div>
            </div>
            
            <div class="card-rewards">
              <div class="rewards-title">🎁 每日可领取</div>
              <div class="rewards-list">
                <div class="reward-item" v-for="(benefit, idx) in membershipStatus.benefits?.monthly" :key="idx">
                  <span class="benefit-icon">{{ benefit.icon }}</span>
                  <span class="benefit-name">{{ benefit.name }}</span>
                  <span class="benefit-amount" v-if="benefit.amount">{{ benefit.amount }}</span>
                  <span class="benefit-desc">{{ benefit.desc }}</span>
                </div>
              </div>
            </div>

            <div class="card-price">
              <div class="price-label">售价</div>
              <div class="price-value">
                <span class="icon">💎</span>
                <span class="amount">{{ membershipStatus.products?.monthly?.price || 98 }}</span>
              </div>
            </div>

            <!-- 已购买状态 -->
            <div v-if="membershipStatus.monthly?.owned" class="card-owned">
              <div class="owned-info">
                <span class="owned-badge">✓ 已购买</span>
                <span class="owned-days" v-if="membershipStatus.monthly?.daysRemaining">
                  剩余 {{ membershipStatus.monthly.daysRemaining }} 天
                </span>
              </div>
              <div class="claim-section">
                <button 
                  class="claim-btn"
                  :class="{ disabled: membershipStatus.monthly?.claimedToday }"
                  :disabled="membershipStatus.monthly?.claimedToday"
                  @click="claimReward('monthly')"
                >
                  {{ membershipStatus.monthly?.claimedToday ? '✓ 今日已领取' : '立即领取' }}
                </button>
              </div>
            </div>
            
            <!-- 未购买 -->
            <button v-else class="buy-btn" @click="purchaseMembership('monthly')">
              <span>立即购买</span>
            </button>
          </div>
        </div>

        <!-- 特权说明 -->
        <div class="privilege-section">
          <div class="section-title">✨ 会员特权</div>
          <div class="privilege-list">
            <div class="privilege-item">
              <span class="p-icon">⚡</span>
              <span class="p-text">修炼速度+15%</span>
            </div>
            <div class="privilege-item">
              <span class="p-icon">🏆</span>
              <span class="p-text">排行榜头像框</span>
            </div>
            <div class="privilege-item">
              <span class="p-icon">📦</span>
              <span class="p-text">专属仓库格子</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 每日特惠 -->
    <div class="tab-content" v-if="activeTab === 'daily'">
      <div class="card-section">
        <div class="card-hero daily-card">
          <div class="hero-bg"></div>
          <div class="card-content">
            <div class="card-badge-area">
              <span class="card-tag">限时特惠</span>
            </div>
            <div class="card-header">
              <div class="card-icon">⚡</div>
              <div class="card-title">
                <span class="name">每日特惠</span>
                <span class="subtitle">低至冰点 · 限时抢购</span>
              </div>
            </div>
            
            <div class="card-rewards">
              <div class="rewards-title">🎁 今日可领取</div>
              <div class="rewards-list">
                <div class="reward-item" v-for="(benefit, idx) in membershipStatus.benefits?.daily" :key="idx">
                  <span class="benefit-icon">{{ benefit.icon }}</span>
                  <span class="benefit-name">{{ benefit.name }}</span>
                  <span class="benefit-amount" v-if="benefit.amount">{{ benefit.amount }}</span>
                  <span class="benefit-desc">{{ benefit.desc }}</span>
                </div>
              </div>
            </div>

            <div class="card-price">
              <div class="price-label">售价</div>
              <div class="price-value">
                <span class="icon">💎</span>
                <span class="amount">{{ membershipStatus.products?.daily?.price || 18 }}</span>
              </div>
            </div>

            <!-- 已购买状态 -->
            <div v-if="membershipStatus.daily?.owned" class="card-owned">
              <div class="owned-info">
                <span class="owned-badge">✓ 今日已购买</span>
                <span class="owned-days" v-if="membershipStatus.daily?.daysRemaining">
                  剩余 {{ membershipStatus.daily.daysRemaining }} 天
                </span>
              </div>
              <div class="claim-section">
                <button 
                  class="claim-btn"
                  :class="{ disabled: membershipStatus.daily?.claimedToday }"
                  :disabled="membershipStatus.daily?.claimedToday"
                  @click="claimReward('daily')"
                >
                  {{ membershipStatus.daily?.claimedToday ? '✓ 今日已领取' : '立即领取' }}
                </button>
              </div>
            </div>
            
            <!-- 未购买 -->
            <button v-else class="buy-btn" @click="purchaseMembership('daily')">
              <span>立即购买</span>
            </button>
          </div>
        </div>

        <!-- 优惠对比 -->
        <div class="compare-section">
          <div class="section-title">📊 性价比对比</div>
          <div class="compare-table">
            <div class="compare-header">
              <span></span>
              <span>终身月卡</span>
              <span>贵族月卡</span>
              <span>每日特惠</span>
            </div>
            <div class="compare-row">
              <span>每日钻石</span>
              <span>50</span>
              <span>30</span>
              <span>10</span>
            </div>
            <div class="compare-row">
              <span>30天总计</span>
              <span>1500</span>
              <span>900</span>
              <span>300</span>
            </div>
            <div class="compare-row highlight">
              <span>单钻价格</span>
              <span class="best">≈0.2元</span>
              <span>≈0.11元</span>
              <span>≈0.06元</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 购买确认弹窗 -->
    <div class="modal-overlay" v-if="showPurchaseModal" @click.self="showPurchaseModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <div class="modal-title">确认购买</div>
          <button class="modal-close" @click="showPurchaseModal = false">×</button>
        </div>
        <div class="purchase-info">
          <div class="purchase-item">
            <span class="item-label">商品</span>
            <span class="item-value">{{ currentProduct?.name }}</span>
          </div>
          <div class="purchase-item">
            <span class="item-label">价格</span>
            <span class="item-value price">{{ currentProduct?.price }} 💎</span>
          </div>
          <div class="purchase-item">
            <span class="item-label">当前钻石</span>
            <span class="item-value">{{ playerInfo.diamonds || 0 }}</span>
          </div>
        </div>
        <div class="purchase-result" v-if="purchaseResult">
          <div :class="['result-message', purchaseResult.success ? 'success' : 'error']">
            {{ purchaseResult.message || purchaseResult.error }}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="showPurchaseModal = false">取消</button>
          <button class="btn btn-primary" @click="confirmPurchase" :disabled="purchasing">
            {{ purchasing ? '购买中...' : `确认购买 ${currentProduct?.price}💎` }}
          </button>
        </div>
      </div>
    </div>

    <!-- Toast提示 -->
    <div class="toast" :class="{ show: toast.show }">
      {{ toast.message }}
    </div>
  </div>
</template>

<script>
export default {
  name: 'MonthCardPanel',
  props: {
    playerId: {
      type: [String, Number],
      default: '1'
    }
  },
  emits: ['close', 'purchase', 'claim'],
  data() {
    return {
      activeTab: 'lifetime',
      tabs: [
        { id: 'lifetime', icon: '👑', name: '终身月卡' },
        { id: 'monthly', icon: '🏆', name: '贵族月卡' },
        { id: 'daily', icon: '⚡', name: '每日特惠' }
      ],
      playerInfo: {},
      membershipStatus: {
        lifetime: { owned: false, claimedToday: false, totalDays: 0 },
        monthly: { owned: false, claimedToday: false, daysRemaining: 0 },
        daily: { owned: false, claimedToday: false, daysRemaining: 0 },
        benefits: {
          lifetime: [],
          monthly: [],
          daily: []
        },
        products: {
          lifetime: { price: 300 },
          monthly: { price: 98 },
          daily: { price: 18 }
        }
      },
      showPurchaseModal: false,
      currentProduct: null,
      purchasing: false,
      purchaseResult: null,
      toast: {
        show: false,
        message: ''
      }
    };
  },
  computed: {
    hasAnyMembership() {
      return this.membershipStatus.lifetime?.owned || 
             this.membershipStatus.monthly?.owned || 
             this.membershipStatus.daily?.owned;
    }
  },
  mounted() {
    this.loadMembershipStatus();
  },
  methods: {
    async loadMembershipStatus() {
      try {
        const response = await fetch(`/api/membership/status?player_id=${this.playerId}`);
        const result = await response.json();
        
        if (result.success) {
          this.membershipStatus = result.data;
          await this.loadPlayerInfo();
        }
      } catch (err) {
        console.error('加载会员状态失败:', err);
        this.showToast('加载失败，请稍后重试');
      }
    },
    
    async loadPlayerInfo() {
      try {
        const playerData = JSON.parse(localStorage.getItem('playerData') || '{}');
        this.playerInfo = playerData;
      } catch (err) {
        console.error('获取玩家信息失败:', err);
      }
    },
    
    purchaseMembership(type) {
      this.currentProduct = this.membershipStatus.products?.[type];
      this.purchaseResult = null;
      this.showPurchaseModal = true;
    },
    
    async confirmPurchase() {
      if (!this.currentProduct || this.purchasing) return;
      
      this.purchasing = true;
      this.purchaseResult = null;
      
      try {
        const response = await fetch('/api/membership/purchase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            player_id: this.playerId,
            type: this.currentProduct.type
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          this.purchaseResult = {
            success: true,
            message: result.message
          };
          
          if (result.data) {
            this.playerInfo.diamonds = result.data.remainingDiamonds;
          }
          
          await this.loadMembershipStatus();
          this.showToast(result.message);
          
          setTimeout(() => {
            this.showPurchaseModal = false;
          }, 1500);
          
          this.$emit('purchase', { type: this.currentProduct.type });
        } else {
          this.purchaseResult = {
            success: false,
            error: result.error
          };
        }
      } catch (err) {
        console.error('购买失败:', err);
        this.purchaseResult = {
          success: false,
          error: '网络错误，请稍后重试'
        };
      } finally {
        this.purchasing = false;
      }
    },
    
    async claimReward(type) {
      try {
        const response = await fetch('/api/membership/claim', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            player_id: this.playerId,
            type
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          this.showToast(result.message);
          
          if (result.data?.rewards) {
            this.playerInfo.spirit_stones = (this.playerInfo.spirit_stones || 0) + result.data.rewards.spirit_stones;
            this.playerInfo.diamonds = (this.playerInfo.diamonds || 0) + result.data.rewards.diamonds;
          }
          
          await this.loadMembershipStatus();
          this.$emit('claim', { type, rewards: result.data?.rewards });
        } else {
          this.showToast(result.error || '领取失败');
        }
      } catch (err) {
        console.error('领取奖励失败:', err);
        this.showToast('网络错误，请稍后重试');
      }
    },
    
    showToast(message) {
      this.toast.message = message;
      this.toast.show = true;
      
      setTimeout(() => {
        this.toast.show = false;
      }, 2000);
    }
  }
};
</script>

<style scoped>
.month-card-panel {
  background: linear-gradient(180deg, rgba(18, 18, 32, 0.98), rgba(10, 10, 18, 0.98));
  border: 1px solid rgba(184, 134, 11, 0.25);
  border-radius: 16px;
  padding: 0;
  color: #e8e8f0;
  max-height: 700px;
  overflow-y: auto;
  position: relative;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: rgba(0, 0, 0, 0.3);
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  font-size: 20px;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 8px;
  transition: background 0.2s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.panel-title {
  font-size: 18px;
  font-weight: bold;
  color: #ffd700;
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  font-size: 22px;
}

.header-right {
  display: flex;
  gap: 12px;
}

.user-currency {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.user-currency.diamonds {
  border-color: rgba(78, 205, 196, 0.3);
}

.currency-icon {
  font-size: 14px;
}

.currency-value {
  font-size: 14px;
  font-weight: 600;
}

.user-currency .currency-value {
  color: #ffd700;
}

.user-currency.diamonds .currency-value {
  color: #4ecdc4;
}

.membership-banner {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(245, 158, 11, 0.15));
  border-bottom: 1px solid rgba(255, 215, 0, 0.3);
  padding: 12px 20px;
}

.banner-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.banner-title {
  font-size: 14px;
  color: #ffd700;
  font-weight: 600;
}

.banner-status {
  display: flex;
  gap: 8px;
}

.status-badge {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 10px;
  font-weight: 500;
}

.status-badge.lifetime {
  background: linear-gradient(135deg, #ffd700, #b8860b);
  color: #000;
}

.status-badge.monthly {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
}

.status-badge.daily {
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  color: #fff;
}

.tabs {
  display: flex;
  padding: 10px 20px;
  gap: 10px;
  background: rgba(0, 0, 0, 0.2);
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid transparent;
  border-radius: 10px;
  color: #aaa;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.tab-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #e8e8f0;
}

.tab-btn.active {
  background: rgba(255, 215, 0, 0.1);
  border-color: rgba(255, 215, 0, 0.5);
  color: #ffd700;
}

.tab-icon {
  font-size: 18px;
}

.tab-content {
  padding: 20px;
}

.card-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card-hero {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  padding: 20px;
}

.hero-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
}

.lifetime-card .hero-bg {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(184, 134, 11, 0.3));
  border: 2px solid rgba(255, 215, 0, 0.4);
}

.monthly-card .hero-bg {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.3));
  border: 2px solid rgba(102, 126, 234, 0.4);
}

.daily-card .hero-bg {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(239, 68, 68, 0.3));
  border: 2px solid rgba(245, 158, 11, 0.4);
}

.card-content {
  position: relative;
  z-index: 1;
}

.card-badge-area {
  margin-bottom: 15px;
}

.card-tag {
  font-size: 11px;
  padding: 4px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.lifetime-card .card-tag {
  background: rgba(255, 215, 0, 0.3);
}

.monthly-card .card-tag {
  background: rgba(102, 126, 234, 0.3);
}

.daily-card .card-tag {
  background: rgba(245, 158, 11, 0.3);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
}

.card-icon {
  font-size: 48px;
  filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.3));
}

.card-title {
  display: flex;
  flex-direction: column;
}

.card-title .name {
  font-size: 24px;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

.card-title .subtitle {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 4px;
}

.card-rewards {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 20px;
}

.rewards-title {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 12px;
}

.rewards-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reward-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.benefit-icon {
  font-size: 20px;
}

.benefit-name {
  flex: 1;
  font-size: 14px;
  color: #fff;
}

.benefit-amount {
  font-size: 16px;
  font-weight: bold;
  color: #ffd700;
}

.benefit-desc {
  font-size: 12px;
  color: #888;
}

.card-price {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.price-label {
  font-size: 14px;
  color: #aaa;
}

.price-value {
  display: flex;
  align-items: center;
  gap: 5px;
}

.price-value .icon {
  font-size: 24px;
}

.price-value .amount {
  font-size: 32px;
  font-weight: bold;
  color: #ffd700;
}

.card-owned {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 12px;
}

.owned-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.owned-badge {
  font-size: 14px;
  color: #10b981;
  font-weight: 600;
}

.owned-days {
  font-size: 12px;
  color: #888;
}

.claim-section {
  flex-shrink: 0;
}

.buy-btn {
  width: 100%;
  padding: 15px;
  background: linear-gradient(135deg, #ffd700, #f59e0b);
  border: none;
  border-radius: 12px;
  color: #000;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
}

.buy-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 215, 0, 0.4);
}

.claim-btn {
  padding: 12px 25px;
  background: linear-gradient(135deg, #10b981, #059669);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.claim-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
}

.claim-btn.disabled {
  background: rgba(255, 255, 255, 0.1);
  color: #666;
  cursor: not-allowed;
}

.privilege-section, .compare-section {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 15px;
}

.section-title {
  font-size: 14px;
  color: #aaa;
  margin-bottom: 12px;
}

.privilege-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.privilege-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.p-icon {
  font-size: 16px;
}

.p-text {
  font-size: 13px;
  color: #ccc;
}

.compare-table {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  overflow: hidden;
}

.compare-header, .compare-row {
  display: grid;
  grid-template-columns: 1fr repeat(3, 1fr);
  padding: 12px 15px;
  text-align: center;
  font-size: 13px;
}

.compare-header {
  background: rgba(255, 215, 0, 0.1);
  color: #ffd700;
  font-weight: 600;
}

.compare-row {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  color: #aaa;
}

.compare-row:last-child {
  border-bottom: none;
}

.compare-row.highlight {
  background: rgba(255, 215, 0, 0.05);
}

.compare-row .best {
  color: #10b981;
  font-weight: bold;
}

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
  min-width: 320px;
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

.purchase-info {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  padding: 15px;
  margin-bottom: 15px;
}

.purchase-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.purchase-item:last-child {
  margin-bottom: 0;
}

.item-label {
  color: #aaa;
}

.item-value {
  color: #fff;
  font-weight: 600;
}

.item-value.price {
  color: #ffd700;
}

.purchase-result {
  margin-bottom: 15px;
}

.result-message {
  padding: 12px;
  border-radius: 8px;
  text-align: center;
  font-size: 14px;
}

.result-message.success {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.result-message.error {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  background: rgba(255, 255, 255, 0.1);
  color: #aaa;
}

.btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.toast {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%) translateY(100px);
  background: rgba(0, 0, 0, 0.9);
  color: #fff;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  z-index: 2000;
  transition: transform 0.3s ease;
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.toast.show {
  transform: translateX(-50%) translateY(0);
}
</style>