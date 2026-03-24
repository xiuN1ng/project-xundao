<template>
  <BasePanel title="月卡特权" icon="💎" variant="gold" @close="$emit('close')">
    <!-- 加载中 -->
    <div v-if="loading" class="loading-state">
      <span class="loading-icon">⏳</span>
      <span>加载中...</span>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMsg" class="error-banner">
      <span>⚠️ {{ errorMsg }}</span>
      <button class="dismiss-btn" @click="errorMsg = ''">✕</button>
    </div>

    <!-- 会员状态概览 -->
    <div class="member-overview" v-if="!loading">
      <div class="overview-left">
        <span class="overview-icon">👑</span>
        <div class="overview-text">
          <span class="overview-title">{{ activePackage ? activePackage.name : '普通玩家' }}</span>
          <span class="overview-sub" v-if="activePackage">{{ activePackage.expire_at ? `到期: ${formatDate(activePackage.expire_at)}` : '永久有效' }}</span>
          <span class="overview-sub" v-else>开通月卡/周卡/终身卡享特权</span>
        </div>
      </div>
      <div class="overview-right" v-if="activePackage">
        <div class="daily-status" :class="{ claimed: dailyClaimed }">
          <span class="daily-label">今日奖励</span>
          <span class="daily-val">{{ dailyClaimed ? '✓ 已领' : '可领' }}</span>
        </div>
      </div>
    </div>

    <!-- 每日灵石领取（已开通时） -->
    <div v-if="activePackage && !loading" class="daily-claim-section">
      <div class="daily-claim-card">
        <div class="daily-info">
          <span class="daily-icon">💰</span>
          <div class="daily-text">
            <span class="daily-title">每日灵石</span>
            <span class="daily-amount">+{{ activePackage.daily_gold || 0 }} 灵石</span>
          </div>
        </div>
        <BaseButton
          :variant="dailyClaimed ? 'ghost' : 'gold'"
          :disabled="dailyClaimed || claiming"
          :loading="claiming"
          @click="claimDaily"
        >
          {{ dailyClaimed ? '已领取' : '立即领取' }}
        </BaseButton>
      </div>
    </div>

    <!-- 套餐卡片列表 -->
    <div class="packages-grid" v-if="!loading">
      <div
        v-for="pkg in packages"
        :key="pkg.id"
        class="package-card"
        :class="{
          active: isActive(pkg.id),
          popular: pkg.popular,
          lifetime: pkg.type === 'lifetime'
        }"
        :style="{ '--pkg-color': getPkgColor(pkg.type) }"
      >
        <!-- 热销标识 -->
        <div v-if="pkg.popular" class="popular-tag">🔥 热销</div>
        <div v-if="pkg.type === 'lifetime'" class="popular-tag lifetime-tag">👑 永久</div>

        <div class="pkg-header">
          <span class="pkg-icon">{{ getPkgIcon(pkg.type) }}</span>
          <div class="pkg-title-wrap">
            <span class="pkg-name">{{ pkg.name }}</span>
            <span class="pkg-duration">{{ pkg.duration_desc }}</span>
          </div>
          <div class="pkg-price">
            <span class="price-symbol">¥</span>
            <span class="price-num">{{ pkg.price }}</span>
          </div>
        </div>

        <div class="pkg-benefits">
          <div v-for="benefit in (pkg.benefits || [])" :key="benefit" class="benefit-item">
            <span class="benefit-check">✓</span>
            <span class="benefit-text">{{ benefit }}</span>
          </div>
        </div>

        <div class="pkg-actions">
          <BaseButton
            v-if="isActive(pkg.id)"
            variant="ghost"
            size="sm"
            disabled
          >
            {{ getActiveStatus(pkg.id) }}
          </BaseButton>
          <BaseButton
            v-else
            :variant="pkg.popular ? 'gold' : 'primary'"
            size="sm"
            :loading="purchasing === pkg.id"
            @click="purchasePackage(pkg)"
          >
            立即开通
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- 特权说明 -->
    <div class="privilege-legend" v-if="!loading">
      <h4 class="legend-title">💡 特权说明</h4>
      <ul class="legend-list">
        <li>购买后立即生效，到期后自动失效</li>
        <li>每日灵石可在任意时间领取，次日重置</li>
        <li>多卡可叠加，时长自动累加</li>
        <li>，终身卡一次购买，永久有效</li>
      </ul>
    </div>
  </BasePanel>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import BasePanel from './base/BasePanel.vue'
import BaseButton from './base/BaseButton.vue'
import { useToast } from './common/toastComposable.js'
import { paymentApi } from '../api/index.js'

const emit = defineEmits(['close'])

const toast = useToast()

// State
const loading = ref(true)
const errorMsg = ref('')
const packages = ref([])
const myPackages = ref([])
const dailyClaimed = ref(false)
const purchasing = ref(null)
const claiming = ref(false)

// Computed
const activePackage = computed(() => {
  if (!myPackages.value.length) return null
  // 优先返回终身卡，否则返回最近到期的
  const lifetime = myPackages.value.find(p => p.type === 'lifetime')
  if (lifetime) return lifetime
  const active = myPackages.value.filter(p => !p.expire_at || new Date(p.expire_at) > new Date())
  return active[0] || null
})

// Helpers
function getPkgIcon(type) {
  const icons = { week: '📅', month: '🗓️', lifetime: '♾️' }
  return icons[type] || '📦'
}

function getPkgColor(type) {
  const colors = { week: '#667eea', month: '#f093fb', lifetime: '#ffd700' }
  return colors[type] || '#667eea'
}

function isActive(pkgId) {
  const pkg = packages.value.find(p => p.id === pkgId)
  if (!pkg) return false
  const myPkg = myPackages.value.find(m => m.type === pkg.type)
  if (!myPkg) return false
  if (pkg.type === 'lifetime') return true
  return !myPkg.expire_at || new Date(myPkg.expire_at) > new Date()
}

function getActiveStatus(pkgId) {
  const pkg = packages.value.find(p => p.id === pkgId)
  if (!pkg) return '已开通'
  const myPkg = myPackages.value.find(m => m.type === pkg.type)
  if (pkg.type === 'lifetime') return '永久有效'
  if (myPkg?.expire_at) return `到期 ${formatDate(myPkg.expire_at)}`
  return '已开通'
}

function formatDate(dateStr) {
  if (!dateStr) return '永久'
  const d = new Date(dateStr)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

async function loadData() {
  loading.value = true
  errorMsg.value = ''
  try {
    const [pkgsRes, myPkgsRes] = await Promise.all([
      paymentApi.getPackages(),
      paymentApi.getMyPackages().catch(() => ({ data: [] })),
    ])

    packages.value = pkgsRes.data?.packages || getDefaultPackages()
    myPackages.value = myPkgsRes.data?.packages || []
    dailyClaimed.value = myPkgsRes.data?.daily_claimed || false
  } catch (e) {
    console.error('加载套餐数据失败', e)
    errorMsg.value = '加载失败，使用本地数据'
    packages.value = getDefaultPackages()
    myPackages.value = []
  }
  loading.value = false
}

async function purchasePackage(pkg) {
  purchasing.value = pkg.id
  try {
    const res = await paymentApi.purchase(pkg.id)
    if (res.data?.success) {
      toast.success(`${pkg.name} 开通成功！`)
      await loadData()
    } else {
      toast.error(res.data?.error || '购买失败')
    }
  } catch (e) {
    console.error('购买失败', e)
    toast.error('购买失败，请稍后重试')
  }
  purchasing.value = null
}

async function claimDaily() {
  if (dailyClaimed.value || !activePackage.value) return
  claiming.value = true
  try {
    const res = await paymentApi.claimDaily()
    if (res.data?.success) {
      dailyClaimed.value = true
      toast.reward(`领取成功！+${activePackage.value.daily_gold} 灵石`)
    } else {
      toast.error(res.data?.error || '领取失败')
    }
  } catch (e) {
    console.error('领取失败', e)
    toast.error('领取失败，请稍后重试')
  }
  claiming.value = false
}

// Demo fallback packages
function getDefaultPackages() {
  return [
    {
      id: 'week_card',
      type: 'week',
      name: '周卡',
      price: 30,
      duration_desc: '7天',
      popular: false,
      daily_gold: 100,
      benefits: [
        '每日领取 100 灵石',
        '修炼速度 +5%',
        '宗门捐献次数 +1',
      ],
    },
    {
      id: 'month_card',
      type: 'month',
      name: '月卡',
      price: 98,
      duration_desc: '30天',
      popular: true,
      daily_gold: 500,
      benefits: [
        '每日领取 500 灵石',
        '修炼速度 +15%',
        '挂机收益 +20%',
        '专属月卡称号',
      ],
    },
    {
      id: 'lifetime_card',
      type: 'lifetime',
      name: '终身卡',
      price: 398,
      duration_desc: '永久',
      popular: false,
      daily_gold: 2000,
      benefits: [
        '每日领取 2000 灵石',
        '修炼速度 +30%',
        '所有战斗掉落 +25%',
        '专属传说称号',
        '客服优先响应',
      ],
    },
  ]
}

onMounted(loadData)
</script>

<style scoped>
/* Loading */
.loading-state {
  display: flex; align-items: center; gap: 8px;
  justify-content: center; padding: 30px;
  color: rgba(255,255,255,0.5);
}
.loading-icon { font-size: 20px; }

/* Error */
.error-banner {
  display: flex; align-items: center; justify-content: space-between;
  background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3);
  border-radius: 10px; padding: 10px 14px; margin-bottom: 12px;
  color: #fca5a5; font-size: 13px;
}
.dismiss-btn {
  background: none; border: none; color: #fca5a5; cursor: pointer; font-size: 14px;
}

/* Member Overview */
.member-overview {
  display: flex; align-items: center; justify-content: space-between;
  background: linear-gradient(135deg, rgba(102,126,234,0.2), rgba(168,85,247,0.2));
  border: 1px solid rgba(168,85,247,0.3); border-radius: 14px;
  padding: 14px 16px; margin-bottom: 14px;
}
.overview-left { display: flex; align-items: center; gap: 10px; }
.overview-icon { font-size: 32px; }
.overview-text { display: flex; flex-direction: column; gap: 2px; }
.overview-title { color: #fff; font-weight: bold; font-size: 15px; }
.overview-sub { color: rgba(255,255,255,0.5); font-size: 12px; }

.overview-right {}
.daily-status {
  display: flex; flex-direction: column; align-items: center;
  background: rgba(74,222,128,0.15); border: 1px solid rgba(74,222,128,0.3);
  border-radius: 10px; padding: 6px 14px;
}
.daily-status.claimed {
  background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1);
}
.daily-label { font-size: 10px; color: rgba(255,255,255,0.5); }
.daily-val { font-size: 13px; font-weight: bold; color: #4ade80; }
.daily-status.claimed .daily-val { color: rgba(255,255,255,0.4); }

/* Daily Claim */
.daily-claim-section { margin-bottom: 14px; }
.daily-claim-card {
  display: flex; align-items: center; justify-content: space-between;
  background: linear-gradient(135deg, rgba(253,224,71,0.1), rgba(251,146,60,0.1));
  border: 1px solid rgba(253,224,71,0.25); border-radius: 14px; padding: 14px 16px;
}
.daily-info { display: flex; align-items: center; gap: 10px; }
.daily-icon { font-size: 28px; }
.daily-text { display: flex; flex-direction: column; gap: 2px; }
.daily-title { color: rgba(255,255,255,0.6); font-size: 12px; }
.daily-amount { color: #fbbf24; font-weight: bold; font-size: 15px; }

/* Packages Grid */
.packages-grid {
  display: flex; flex-direction: column; gap: 12px;
  max-height: 55vh; overflow-y: auto; padding-right: 4px;
}

.package-card {
  position: relative;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px; padding: 16px;
  transition: all 0.3s;
}
.package-card:hover { background: rgba(255,255,255,0.07); }
.package-card.active {
  border-color: var(--pkg-color, #667eea);
  box-shadow: 0 0 16px rgba(102,126,234,0.2);
}
.package-card.popular {
  border-color: rgba(251,146,60,0.5);
  background: rgba(251,146,60,0.05);
}
.package-card.lifetime {
  border-color: rgba(253,224,71,0.4);
  background: linear-gradient(135deg, rgba(253,224,71,0.05), rgba(251,146,60,0.03));
}

.popular-tag {
  position: absolute; top: -1px; right: 14px;
  background: linear-gradient(135deg, #f97316, #ef4444);
  color: #fff; font-size: 10px; font-weight: bold;
  padding: 3px 10px; border-radius: 0 0 8px 8px;
}
.lifetime-tag {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.pkg-header {
  display: flex; align-items: center; gap: 10px; margin-bottom: 10px;
}
.pkg-icon { font-size: 32px; }
.pkg-title-wrap { flex: 1; }
.pkg-name { display: block; color: #fff; font-weight: bold; font-size: 16px; }
.pkg-duration { color: rgba(255,255,255,0.4); font-size: 12px; }
.pkg-price {
  display: flex; align-items: baseline;
  background: rgba(255,255,255,0.08); border-radius: 10px; padding: 4px 12px;
}
.price-symbol { color: rgba(255,255,255,0.5); font-size: 12px; }
.price-num { color: #fbbf24; font-weight: bold; font-size: 20px; }

.pkg-benefits { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
.benefit-item { display: flex; align-items: center; gap: 6px; }
.benefit-check { color: #4ade80; font-size: 12px; }
.benefit-text { color: rgba(255,255,255,0.65); font-size: 12px; }

.pkg-actions { display: flex; gap: 8px; }
.pkg-actions > * { flex: 1; }

/* Privilege Legend */
.privilege-legend {
  margin-top: 14px; padding: 12px 14px;
  background: rgba(255,255,255,0.03); border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.06);
}
.legend-title { color: rgba(255,255,255,0.5); font-size: 12px; font-weight: bold; margin: 0 0 8px; }
.legend-list { margin: 0; padding-left: 16px; }
.legend-list li { color: rgba(255,255,255,0.35); font-size: 11px; line-height: 1.8; }

/* Scrollbar */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 2px; }
::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.4); border-radius: 2px; }
</style>
