<template>
  <BasePanel
    title="VIP系统"
    icon="👑"
    variant="boss"
    @close="$emit('close')"
  >
    <template #actions>
      <span class="vip-badge" v-if="currentVip">VIP{{ currentVip.level }}</span>
      <span class="vip-badge vip-0" v-else>普通玩家</span>
    </template>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner">⏳</div>
      <span>加载中...</span>
    </div>

    <!-- VIP状态卡 -->
    <div class="vip-status-card" :class="{ 'is-vip': currentVip, 'no-vip': !currentVip }">
      <div class="vip-info" v-if="currentVip">
        <div class="vip-level-display">
          <span class="level-num">{{ currentVip.level }}</span>
          <span class="level-name">{{ currentVip.name }}</span>
        </div>
        <div class="vip-expire" v-if="currentVip.expire_at">
          <span class="expire-label">到期时间</span>
          <span class="expire-date">{{ formatDate(currentVip.expire_at) }}</span>
        </div>
        <div class="vip-privileges-summary">
          <span class="priv-item" v-if="currentVip.daily_sign_bonus">📝 签到+{{ (currentVip.daily_sign_bonus * 100).toFixed(0) }}%</span>
          <span class="priv-item" v-if="currentVip.idle_earn_bonus">⏰ 挂机+{{ (currentVip.idle_earn_bonus * 100).toFixed(0) }}%</span>
          <span class="priv-item" v-if="currentVip.enhance_bonus">⚗️ 强化+{{ (currentVip.enhance_bonus * 100).toFixed(0) }}%</span>
        </div>
      </div>
      <div class="vip-info no-vip-info" v-else>
        <div class="no-vip-text">
          <span class="no-vip-icon">👑</span>
          <span>开通VIP享受更多特权</span>
        </div>
      </div>

      <!-- 每日礼包领取 -->
      <div class="daily-gift-section" v-if="currentVip">
        <div class="daily-gift-header">
          <span class="gift-icon">🎁</span>
          <span class="gift-title">每日VIP礼包</span>
          <span class="gift-status" :class="{ claimed: dailyClaimed }">
            {{ dailyClaimed ? '✓ 已领取' : '可领取' }}
          </span>
        </div>
        <div class="daily-gift-content">
          <div class="gift-rewards">
            <div class="gift-reward-item">
              <span class="gift-icon-small">💰</span>
              <span class="gift-amount">+{{ Math.floor((currentVip.daily_sign_bonus || 0) * 1000) }}</span>
              <span class="gift-label">灵石</span>
            </div>
            <div class="gift-reward-item" v-if="currentVip.level >= 2">
              <span class="gift-icon-small">💎</span>
              <span class="gift-amount">+{{ currentVip.level * 10 }}</span>
              <span class="gift-label">钻石</span>
            </div>
          </div>
          <BaseButton
            variant="gold"
            size="sm"
            :loading="isClaiming"
            :disabled="dailyClaimed"
            @click="claimDailyGift"
          >
            {{ isClaiming ? '领取中...' : dailyClaimed ? '已领取' : '立即领取' }}
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- VIP等级列表 -->
    <div class="vip-levels-section">
      <div class="section-title">
        <span>💎</span> VIP等级
      </div>

      <div class="vip-levels-list">
        <div
          v-for="vip in vipLevels"
          :key="vip.level"
          class="vip-level-card"
          :class="{
            'current': currentVip && currentVip.level === vip.level,
            'can-buy': canBuyLevel(vip.level),
            'locked': !canBuyLevel(vip.level) && (!currentVip || vip.level > currentVip.level)
          }"
          @click="selectVipLevel(vip)"
        >
          <div class="level-header">
            <div class="level-badge-large" :class="`vip-${vip.level}`">
              VIP{{ vip.level }}
            </div>
            <div class="level-title">
              <span class="level-name-text">{{ vip.name }}</span>
              <span class="level-price" v-if="!isOwned(vip.level)">
                <span class="price-icon">💰</span>
                {{ formatNumber(vip.price) }}
              </span>
              <span class="level-owned" v-else>✓ 已激活</span>
            </div>
          </div>

          <div class="level-benefits">
            <div class="benefit-item">
              <span class="benefit-icon">📝</span>
              <span class="benefit-text">签到加成: +{{ (vip.daily_sign_bonus * 100).toFixed(0) }}%</span>
            </div>
            <div class="benefit-item">
              <span class="benefit-icon">⏰</span>
              <span class="benefit-text">挂机收益: +{{ (vip.idle_earn_bonus * 100).toFixed(0) }}%</span>
            </div>
            <div class="benefit-item">
              <span class="benefit-icon">⚗️</span>
              <span class="benefit-text">强化成功率: +{{ (vip.enhance_bonus * 100).toFixed(0) }}%</span>
            </div>
            <div class="benefit-item" v-if="vip.level >= 3">
              <span class="benefit-icon">🎨</span>
              <span class="benefit-text">专属时装</span>
            </div>
            <div class="benefit-item" v-if="vip.level >= 5">
              <span class="benefit-icon">⚡</span>
              <span class="benefit-text">跳过战斗</span>
            </div>
          </div>

          <div class="level-action">
            <BaseButton
              v-if="!isOwned(vip.level) && canAfford(vip)"
              variant="primary"
              size="sm"
              :loading="buying && selectedLevel === vip.level"
              @click.stop="buyVip(vip)"
            >
              {{ buying && selectedLevel === vip.level ? '购买中...' : '立即开通' }}
            </BaseButton>
            <BaseButton
              v-else-if="!isOwned(vip.level) && !canAfford(vip)"
              variant="ghost"
              size="sm"
              disabled
            >
              灵石不足
            </BaseButton>
            <span v-else-if="isOwned(vip.level) && (!currentVip || vip.level === currentVip.level)" class="current-badge">
              当前等级
            </span>
            <span v-else-if="isOwned(vip.level) && currentVip && vip.level < currentVip.level" class="lower-badge">
              已过期
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 购买确认弹窗 -->
    <div class="buy-modal-overlay" v-if="showBuyModal" @click.self="showBuyModal = false">
      <div class="buy-modal">
        <div class="modal-header">
          <span>开通VIP{{ selectedVipLevel?.level }}</span>
          <button class="modal-close" @click="showBuyModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="modal-vip-info">
            <span class="modal-level">VIP{{ selectedVipLevel?.level }}</span>
            <span class="modal-name">{{ selectedVipLevel?.name }}</span>
          </div>
          <div class="modal-price">
            <span class="price-icon">💰</span>
            <span class="price-num">{{ formatNumber(selectedVipLevel?.price || 0) }}</span>
            <span class="price-label">灵石</span>
          </div>
          <div class="modal-balance">
            当前余额: {{ formatNumber(playerSpiritStones) }} 灵石
          </div>
          <div class="modal-benefits">
            <div class="modal-benefit" v-for="(b, idx) in getVipBenefits(selectedVipLevel)" :key="idx">
              {{ b }}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <BaseButton variant="ghost" @click="showBuyModal = false">取消</BaseButton>
          <BaseButton
            variant="gold"
            :disabled="!canAfford(selectedVipLevel)"
            :loading="buying"
            @click="confirmBuy"
          >
            确认开通
          </BaseButton>
        </div>
      </div>
    </div>
  </BasePanel>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import BasePanel from './base/BasePanel.vue'
import BaseButton from './base/BaseButton.vue'
import { useToast } from './common/toastComposable.js'
import { api } from '../core/api.js'

const emit = defineEmits(['close', 'vip-updated'])

const toast = useToast()
const loading = ref(false)
const buying = ref(false)
const isClaiming = ref(false)
const dailyClaimed = ref(false)

const currentVip = ref(null)
const vipLevels = ref([])
const playerSpiritStones = ref(0)
const showBuyModal = ref(false)
const selectedVipLevel = ref(null)
const selectedLevel = ref(null)

function getPlayerId() {
  try {
    const playerStore = window.playerStore
    if (playerStore && playerStore.player && playerStore.player.id) {
      return playerStore.player.id
    }
    if (window.localStorage) {
      const playerData = localStorage.getItem('player')
      if (playerData) {
        const p = JSON.parse(playerData)
        return p.id
      }
    }
  } catch (e) {
    console.warn('获取playerId失败:', e)
  }
  return null
}

function formatNumber(num) {
  if (!num) return '0'
  if (num >= 100000000) return (num / 100000000).toFixed(1) + '亿'
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  return num.toLocaleString()
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isOwned(level) {
  if (!currentVip.value) return false
  return currentVip.value.level >= level
}

function canBuyLevel(level) {
  if (!currentVip.value) return true
  return level > currentVip.value.level
}

function canAfford(vip) {
  if (!vip) return false
  return playerSpiritStones.value >= vip.price
}

function getVipBenefits(vip) {
  if (!vip) return []
  const benefits = []
  if (vip.daily_sign_bonus > 0) benefits.push(`📝 签到加成 +${(vip.daily_sign_bonus * 100).toFixed(0)}%`)
  if (vip.idle_earn_bonus > 0) benefits.push(`⏰ 挂机收益 +${(vip.idle_earn_bonus * 100).toFixed(0)}%`)
  if (vip.enhance_bonus > 0) benefits.push(`⚗️ 强化成功率 +${(vip.enhance_bonus * 100).toFixed(0)}%`)
  if (vip.level >= 3) benefits.push('🎨 专属时装')
  if (vip.level >= 5) benefits.push('⚡ 跳过战斗')
  benefits.push(`⏱️ 有效期 ${vip.duration_days} 天`)
  return benefits
}

function selectVipLevel(vip) {
  selectedVipLevel.value = vip
}

async function loadVipInfo() {
  const playerId = getPlayerId()
  if (!playerId) {
    toast.error('无法获取玩家信息')
    return
  }

  loading.value = true
  try {
    const res = await api.get(`/api/vip/info?player_id=${playerId}`)

    if (res.success) {
      currentVip.value = res.data?.current_vip || null
      vipLevels.value = res.data?.vip_levels || []
      playerSpiritStones.value = res.data?.player?.spirit_stones || 0

      const today = new Date().toDateString()
      const lastClaim = localStorage.getItem('vip_daily_claim_date')
      dailyClaimed.value = lastClaim === today
    } else {
      toast.error(res.error || '加载VIP信息失败')
    }
  } catch (err) {
    toast.error('网络错误，请稍后重试')
    console.error('加载VIP信息失败:', err)
  } finally {
    loading.value = false
  }
}

async function buyVip(vip) {
  if (buying.value) return
  selectedVipLevel.value = vip
  showBuyModal.value = true
}

async function confirmBuy() {
  const playerId = getPlayerId()
  if (!playerId || !selectedVipLevel.value) return

  buying.value = true
  try {
    const res = await api.post('/api/vip/activate', {
      player_id: playerId,
      vip_level: selectedVipLevel.value.level
    })

    if (res.success) {
      toast.success(res.message || `VIP${selectedVipLevel.value.level}开通成功！`)
      showBuyModal.value = false
      await loadVipInfo()
      emit('vip-updated', res.data)
      if (res.data?.remaining_spirit_stones !== undefined) {
        playerSpiritStones.value = res.data.remaining_spirit_stones
      }
    } else {
      toast.error(res.error || '购买失败')
    }
  } catch (err) {
    toast.error('网络错误，购买失败')
  } finally {
    buying.value = false
  }
}

async function claimDailyGift() {
  if (dailyClaimed.value || isClaiming.value) return

  isClaiming.value = true
  try {
    const res = await api.post('/api/shop/buy', { item_id: 'vip_daily_gift' })

    if (res.success) {
      dailyClaimed.value = true
      localStorage.setItem('vip_daily_claim_date', new Date().toDateString())
      toast.reward('每日礼包领取成功！')
    } else {
      if (res.message?.includes('已') || res.message?.includes('领取')) {
        dailyClaimed.value = true
        localStorage.setItem('vip_daily_claim_date', new Date().toDateString())
      }
      toast.error(res.message || '领取失败')
    }
  } catch (err) {
    dailyClaimed.value = true
    localStorage.setItem('vip_daily_claim_date', new Date().toDateString())
  } finally {
    isClaiming.value = false
  }
}

onMounted(() => {
  loadVipInfo()
})
</script>

<style scoped>
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  color: #888;
}

.loading-spinner {
  font-size: 24px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.vip-status-card {
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  position: relative;
  overflow: hidden;
}

.vip-status-card.is-vip {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 153, 0, 0.1) 50%, rgba(255, 215, 0, 0.05) 100%);
  border: 2px solid rgba(255, 215, 0, 0.3);
  box-shadow: 0 4px 20px rgba(255, 215, 0, 0.15);
}

.vip-status-card.no-vip {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
  border: 2px solid rgba(255, 255, 255, 0.1);
}

.vip-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.vip-level-display {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.level-num {
  font-size: 56px;
  font-weight: bold;
  color: #ffd700;
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
  line-height: 1;
}

.level-name {
  font-size: 20px;
  color: #ffd700;
  opacity: 0.9;
}

.vip-expire {
  display: flex;
  gap: 8px;
  align-items: center;
}

.expire-label {
  font-size: 12px;
  color: #888;
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 20px;
}

.expire-date {
  font-size: 13px;
  color: #ffd700;
}

.vip-privileges-summary {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.priv-item {
  padding: 6px 12px;
  background: rgba(255, 215, 0, 0.1);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 20px;
  font-size: 13px;
  color: #ffd700;
}

.no-vip-info { align-items: center; text-align: center; }

.no-vip-text {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #888;
  font-size: 16px;
}

.no-vip-icon {
  font-size: 40px;
  opacity: 0.5;
}

.daily-gift-section {
  margin-top: 20px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
}

.daily-gift-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.gift-icon { font-size: 20px; }

.gift-title {
  font-size: 15px;
  font-weight: bold;
  color: #fff;
}

.gift-status {
  margin-left: auto;
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 20px;
  background: rgba(0, 255, 136, 0.2);
  color: #7bed9f;
}

.gift-status.claimed {
  background: rgba(255, 255, 255, 0.1);
  color: #888;
}

.daily-gift-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.gift-rewards { display: flex; gap: 20px; }

.gift-reward-item { display: flex; align-items: center; gap: 6px; }

.gift-icon-small { font-size: 18px; }

.gift-amount {
  font-size: 18px;
  font-weight: bold;
  color: #ffd700;
}

.gift-label { font-size: 12px; color: #888; }

.vip-levels-section { margin-top: 8px; }

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 16px;
  color: #ffd700;
}

.vip-levels-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.vip-level-card {
  background: rgba(255, 255, 255, 0.04);
  border: 2px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s;
}

.vip-level-card:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-2px);
}

.vip-level-card.current {
  border-color: rgba(255, 215, 0, 0.5);
  background: rgba(255, 215, 0, 0.05);
}

.vip-level-card.can-buy {
  border-color: rgba(102, 126, 234, 0.5);
}

.vip-level-card.locked { opacity: 0.6; }

.level-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 14px;
}

.level-badge-large {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  font-size: 16px;
  font-weight: bold;
  color: #fff;
}

.level-badge-large.vip-1 {
  background: linear-gradient(135deg, #667eea, #764ba2);
}

.level-badge-large.vip-2 {
  background: linear-gradient(135deg, #f093fb, #f5576c);
}

.level-badge-large.vip-3 {
  background: linear-gradient(135deg, #ffd700, #ff9900);
  color: #1a1a2e;
}

.level-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.level-name-text {
  font-size: 18px;
  font-weight: bold;
  color: #fff;
}

.level-price {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #ffd700;
}

.price-icon { font-size: 14px; }

.level-owned {
  font-size: 14px;
  color: #7bed9f;
  font-weight: bold;
}

.level-benefits {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}

.benefit-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
}

.benefit-icon {
  font-size: 16px;
  width: 24px;
  text-align: center;
}

.level-action { display: flex; justify-content: flex-end; }

.current-badge {
  padding: 8px 20px;
  background: rgba(0, 255, 136, 0.15);
  border: 1px solid rgba(0, 255, 136, 0.3);
  border-radius: 25px;
  color: #7bed9f;
  font-size: 13px;
  font-weight: bold;
}

.lower-badge {
  padding: 8px 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 25px;
  color: #888;
  font-size: 13px;
}

/* VIP badge in header */
.vip-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: bold;
  background: linear-gradient(135deg, #ffd700, #ff9900);
  color: #1a1a2e;
}

.vip-badge.vip-0 {
  background: rgba(255, 255, 255, 0.1);
  color: #888;
}

/* 购买确认弹窗 */
.buy-modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.buy-modal {
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  border: 2px solid rgba(255, 215, 0, 0.3);
  border-radius: 20px;
  width: 400px;
  overflow: hidden;
  animation: modalIn 0.3s ease;
}

@keyframes modalIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: rgba(255, 215, 0, 0.1);
  font-size: 18px;
  font-weight: bold;
  color: #ffd700;
}

.modal-close {
  background: transparent;
  border: none;
  color: #888;
  font-size: 18px;
  cursor: pointer;
}

.modal-body { padding: 24px; }

.modal-vip-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.modal-level {
  font-size: 32px;
  font-weight: bold;
  color: #ffd700;
  text-shadow: 0 0 15px rgba(255, 215, 0, 0.5);
}

.modal-name {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
}

.modal-price {
  display: flex;
  align-items: baseline;
  gap: 8px;
  justify-content: center;
  padding: 20px;
  background: rgba(255, 215, 0, 0.1);
  border-radius: 12px;
  margin-bottom: 12px;
}

.modal-price .price-icon { font-size: 28px; }

.modal-price .price-num {
  font-size: 36px;
  font-weight: bold;
  color: #ffd700;
}

.modal-price .price-label { font-size: 14px; color: #888; }

.modal-balance {
  text-align: center;
  font-size: 13px;
  color: #888;
  margin-bottom: 20px;
}

.modal-benefits {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.modal-benefit {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 16px 24px 24px;
}
</style>
