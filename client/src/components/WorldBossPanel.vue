<template>
  <div class="worldboss-panel">
    <!-- 顶部标题栏 -->
    <div class="panel-header">
      <div class="title-section">
        <span class="title-icon">💀</span>
        <h2>世界BOSS</h2>
        <span class="boss-status-badge" :class="bossActive ? 'active' : 'inactive'">
          {{ bossActive ? '🔥 进行中' : '⚪ 未刷新' }}
        </span>
      </div>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading && !bossData" class="loading-state">
      <div class="loading-spinner">⚔️</div>
      <span>BOSS正在降临...</span>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMsg" class="error-toast">
      <span>⚠️ {{ errorMsg }}</span>
      <button @click="errorMsg = ''">✕</button>
    </div>

    <!-- 世界BOSS区域 -->
    <div class="boss-main-area" v-if="bossData">
      <!-- BOSS信息卡 -->
      <div class="boss-card" :class="{ 'boss-enraged': isEnraged }">
        <div class="boss-avatar-section">
          <div class="boss-avatar" :class="{ shaking: isAttacking }">👹</div>
          <div class="boss-crown" v-if="bossData.kills > 0">👑</div>
        </div>
        
        <div class="boss-info">
          <div class="boss-name">{{ bossData.name || '上古凶兽' }}</div>
          <div class="boss-level">Lv.{{ bossData.level || 1 }} 世界BOSS</div>
          
          <!-- 血条 -->
          <div class="boss-hp-container">
            <div class="boss-hp-label">
              <span>💀 HP</span>
              <span class="hp-numbers">{{ formatNumber(bossCurrentHp) }} / {{ formatNumber(bossMaxHp) }}</span>
            </div>
            <div class="boss-hp-bar">
              <div 
                class="boss-hp-fill" 
                :class="{ 'low': hpPercent < 30, 'critical': hpPercent < 10 }"
                :style="{ width: Math.max(0, hpPercent) + '%' }"
              ></div>
              <div class="boss-hp-glow" :style="{ width: Math.max(0, hpPercent) + '%' }"></div>
            </div>
            <div class="boss-hp-percent">{{ hpPercent.toFixed(1) }}%</div>
          </div>
          
          <!-- 愤怒条(血量低时触发) -->
          <div class="enrage-bar" v-if="hpPercent < 30">
            <div class="enrage-label">⚡ 狂暴中</div>
            <div class="enrage-effect">攻击力和防御力大幅提升！</div>
          </div>
        </div>
      </div>

      <!-- 操作区 -->
      <div class="action-section">
        <div class="damage-to-boss">
          <div class="damage-label">今日总伤害</div>
          <div class="damage-value">{{ formatNumber(bossData.damage || 0) }}</div>
        </div>
        
        <button 
          class="attack-btn" 
          :class="{ attacking: isAttacking, cooldown: attackCooldown }"
          :disabled="isAttacking || attackCooldown"
          @click="attackBoss"
        >
          <span class="attack-icon">⚔️</span>
          <span class="attack-text">{{ attackCooldown ? '冷却中...' : isAttacking ? '攻击中...' : '发起攻击' }}</span>
          <span class="attack-damage" v-if="lastDamage > 0">-{{ formatNumber(lastDamage) }}</span>
        </button>
        
        <div class="attack-tip" v-if="!attackCooldown && !isAttacking">
          点击攻击BOSS，每次攻击造成 {{ formatNumber(playerAttackPower) }} 伤害
        </div>
        <div class="attack-tip cooldown-tip" v-else-if="attackCooldown">
          {{ cooldownRemaining }}秒后可再次攻击
        </div>
      </div>

      <!-- 伤害飘字层 -->
      <div class="damage-floats">
        <div 
          v-for="(float, idx) in damageFloats" 
          :key="float.id"
          class="damage-float"
          :style="float.style"
        >{{ float.text }}</div>
      </div>
    </div>

    <!-- 伤害排名区 -->
    <div class="ranking-section">
      <div class="section-title">
        <span>🏆</span> 伤害排行榜
      </div>
      
      <div class="ranking-list" v-if="bossData?.rank?.length > 0">
        <div 
          v-for="(entry, idx) in bossData.rank" 
          :key="entry.playerId || idx"
          class="rank-item"
          :class="{
            'rank-1': idx === 0,
            'rank-2': idx === 1,
            'rank-3': idx === 2,
            'is-me': entry.isMe
          }"
        >
          <div class="rank-medal">
            <span v-if="idx === 0" class="medal">🥇</span>
            <span v-else-if="idx === 1" class="medal">🥈</span>
            <span v-else-if="idx === 2" class="medal">🥉</span>
            <span v-else class="rank-num">{{ idx + 1 }}</span>
          </div>
          <div class="rank-player">
            <span class="player-name">{{ entry.name || '神秘修士' }}</span>
            <span class="player-tag" v-if="entry.isMe">你</span>
          </div>
          <div class="rank-damage">
            <span class="damage-num">{{ formatNumber(entry.damage || 0) }}</span>
            <span class="damage-unit">伤害</span>
          </div>
        </div>
      </div>
      
      <div class="empty-ranking" v-else>
        <div class="empty-icon">📋</div>
        <div class="empty-text">暂无排名记录</div>
        <div class="empty-sub">击败BOSS即可上榜！</div>
      </div>
    </div>

    <!-- 奖励预览 -->
    <div class="rewards-section">
      <div class="section-title">
        <span>🎁</span> BOSS奖励
      </div>
      <div class="rewards-grid">
        <div class="reward-item">
          <span class="reward-icon">💰</span>
          <span class="reward-name">灵石</span>
          <span class="reward-amount">+{{ bossData?.rewards?.spiritStones || '???' }}</span>
        </div>
        <div class="reward-item" v-if="bossData?.rewards?.experience">
          <span class="reward-icon">✨</span>
          <span class="reward-name">经验</span>
          <span class="reward-amount">+{{ bossData.rewards.experience }}</span>
        </div>
        <div class="reward-item" v-if="bossData?.rewards?.item">
          <span class="reward-icon">📦</span>
          <span class="reward-name">稀有掉落</span>
          <span class="reward-amount">{{ bossData.rewards.item }}</span>
        </div>
        <div class="reward-item top-damage">
          <span class="reward-icon">👑</span>
          <span class="reward-name">首刀奖励</span>
          <span class="reward-amount">3倍灵石</span>
        </div>
      </div>
    </div>

    <!-- 无BOSS时显示 -->
    <div class="no-boss-state" v-if="!bossData && !loading">
      <div class="no-boss-icon">🌙</div>
      <div class="no-boss-title">BOSS尚未降临</div>
      <div class="no-boss-desc">每日12:00、18:00、21:00世界BOSS将出现</div>
      <div class="no-boss-tip">击杀BOSS可获得大量灵石和稀有道具</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const emit = defineEmits(['close', 'boss-killed'])

const loading = ref(false)
const errorMsg = ref('')
const bossData = ref(null)
const bossCurrentHp = ref(0)
const bossMaxHp = ref(1)
const isAttacking = ref(false)
const attackCooldown = ref(false)
const cooldownRemaining = ref(0)
const lastDamage = ref(0)
const damageFloats = ref([])
const playerAttackPower = ref(1000)
const cooldownTimer = ref(null)
const floatIdCounter = ref(0)

let cooldownInterval = null

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

function getPlayerName() {
  try {
    const playerStore = window.playerStore
    if (playerStore && playerStore.player && playerStore.player.username) {
      return playerStore.player.username
    }
    if (window.localStorage) {
      const playerData = localStorage.getItem('player')
      if (playerData) {
        const p = JSON.parse(playerData)
        return p.username || '神秘修士'
      }
    }
  } catch (e) {}
  return '神秘修士'
}

function formatNumber(num) {
  if (!num && num !== 0) return '0'
  num = Number(num)
  if (num >= 100000000) return (num / 100000000).toFixed(1) + '亿'
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  return num.toLocaleString()
}

const hpPercent = computed(() => {
  if (!bossMaxHp.value) return 0
  return (bossCurrentHp.value / bossMaxHp.value) * 100
})

const bossActive = computed(() => {
  return bossData.value && bossCurrentHp.value > 0
})

const isEnraged = computed(() => hpPercent.value < 30)

async function loadBossInfo() {
  loading.value = true
  try {
    const res = await fetch('/api/worldboss')
    const data = await res.json()
    
    if (data) {
      bossData.value = {
        ...data,
        name: data.name || '上古凶兽',
        level: data.level || 1,
        kills: data.kills || 0,
        rewards: data.rewards || {
          spiritStones: '???',
          experience: '???',
          item: '稀有装备'
        }
      }
      bossMaxHp.value = data.hp || 1000000
      bossCurrentHp.value = Math.max(0, (data.hp || 1000000) - (data.damage || 0))
      playerAttackPower.value = data.playerAttack || 1000
      
      // Enrich rank with isMe flag
      if (bossData.value.rank && Array.isArray(bossData.value.rank)) {
        const myId = getPlayerId()
        bossData.value.rank = bossData.value.rank.map(e => ({
          ...e,
          isMe: e.playerId === myId
        }))
      } else {
        bossData.value.rank = []
      }
    }
  } catch (err) {
    errorMsg.value = '加载BOSS信息失败，请稍后重试'
    console.error('加载世界BOSS信息失败:', err)
  } finally {
    loading.value = false
  }
}

async function attackBoss() {
  if (isAttacking.value || attackCooldown.value) return
  
  isAttacking.value = true
  const damage = playerAttackPower.value
  
  try {
    const res = await fetch('/api/worldboss/attack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ damage })
    })
    const data = await res.json()
    
    if (data.success) {
      lastDamage.value = damage
      bossCurrentHp.value = Math.max(0, data.hp || 0)
      
      // Add damage float
      addDamageFloat(damage)
      
      // Update my rank entry
      const myId = getPlayerId()
      const myName = getPlayerName()
      if (bossData.value) {
        bossData.value.damage = (bossData.value.damage || 0) + damage
        if (!bossData.value.rank) bossData.value.rank = []
        const existingEntry = bossData.value.rank.find(e => e.isMe)
        if (existingEntry) {
          existingEntry.damage = (existingEntry.damage || 0) + damage
        } else {
          bossData.value.rank.push({ playerId: myId, name: myName, damage, isMe: true })
        }
        // Re-sort by damage
        bossData.value.rank.sort((a, b) => (b.damage || 0) - (a.damage || 0))
        bossData.value.rank = bossData.value.rank.slice(0, 20)
      }
      
      // Check if boss killed
      if (bossCurrentHp.value <= 0) {
        emit('boss-killed', { totalDamage: bossData.value?.damage })
      }
    }
  } catch (err) {
    errorMsg.value = '攻击失败'
    console.error('攻击BOSS失败:', err)
  } finally {
    setTimeout(() => { isAttacking.value = false }, 600)
    startCooldown()
  }
}

function addDamageFloat(damage) {
  const id = floatIdCounter.value++
  const style = {
    left: (30 + Math.random() * 40) + '%',
    animationDelay: (Math.random() * 0.3) + 's'
  }
  damageFloats.value.push({
    id,
    text: `-${formatNumber(damage)}`,
    style
  })
  
  setTimeout(() => {
    damageFloats.value = damageFloats.value.filter(f => f.id !== id)
  }, 1500)
}

function startCooldown() {
  attackCooldown.value = true
  cooldownRemaining.value = 5
  
  if (cooldownInterval) clearInterval(cooldownInterval)
  cooldownInterval = setInterval(() => {
    cooldownRemaining.value--
    if (cooldownRemaining.value <= 0) {
      attackCooldown.value = false
      clearInterval(cooldownInterval)
    }
  }, 1000)
}

// Poll for boss HP updates
let pollInterval = null

onMounted(() => {
  loadBossInfo()
  pollInterval = setInterval(loadBossInfo, 8000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
  if (cooldownInterval) clearInterval(cooldownInterval)
})
</script>

<style scoped>
.worldboss-panel {
  background: linear-gradient(135deg, #1a0a0a 0%, #2d1010 50%, #1a0505 100%);
  border-radius: 16px;
  padding: 20px;
  color: #fff;
  max-height: 85vh;
  overflow-y: auto;
  min-width: 560px;
  position: relative;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-icon { font-size: 28px; }

.panel-header h2 {
  font-size: 24px;
  font-weight: bold;
  margin: 0;
  background: linear-gradient(135deg, #ff4444 0%, #ff8800 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.boss-status-badge {
  padding: 4px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: bold;
}

.boss-status-badge.active {
  background: linear-gradient(135deg, #ff4444, #ff8800);
  color: #fff;
  animation: pulse-badge 2s ease infinite;
}

.boss-status-badge.inactive {
  background: rgba(255, 255, 255, 0.1);
  color: #888;
}

@keyframes pulse-badge {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
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

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px;
  color: #888;
}

.loading-spinner {
  font-size: 48px;
  animation: shake 0.5s ease infinite;
}

@keyframes shake {
  0%, 100% { transform: rotate(-5deg); }
  50% { transform: rotate(5deg); }
}

.error-toast {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 71, 87, 0.2);
  border: 1px solid rgba(255, 71, 87, 0.4);
  border-radius: 10px;
  color: #ff4757;
  margin-bottom: 16px;
}

/* BOSS主区域 */
.boss-main-area {
  position: relative;
  margin-bottom: 20px;
}

.boss-card {
  background: linear-gradient(135deg, rgba(80, 0, 0, 0.6) 0%, rgba(40, 0, 0, 0.8) 100%);
  border: 2px solid rgba(255, 60, 60, 0.3);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  gap: 24px;
  margin-bottom: 20px;
  transition: all 0.3s;
}

.boss-card.boss-enraged {
  border-color: rgba(255, 100, 0, 0.8);
  box-shadow: 0 0 30px rgba(255, 80, 0, 0.3);
  animation: enrage-glow 1s ease infinite alternate;
}

@keyframes enrage-glow {
  from { box-shadow: 0 0 20px rgba(255, 80, 0, 0.3); }
  to { box-shadow: 0 0 40px rgba(255, 80, 0, 0.6); }
}

.boss-avatar-section {
  position: relative;
  flex-shrink: 0;
}

.boss-avatar {
  width: 80px;
  height: 80px;
  background: radial-gradient(circle, #8B0000, #4a0000);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  border: 3px solid rgba(255, 80, 0, 0.5);
  box-shadow: 0 0 20px rgba(255, 0, 0, 0.3);
}

.boss-avatar.shaking {
  animation: boss-hit 0.4s ease;
}

@keyframes boss-hit {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-8px); }
  75% { transform: translateX(8px); }
}

.boss-crown {
  position: absolute;
  top: -10px;
  right: -5px;
  font-size: 24px;
}

.boss-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.boss-name {
  font-size: 22px;
  font-weight: bold;
  color: #ff6b6b;
  text-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
}

.boss-level {
  font-size: 13px;
  color: #888;
}

.boss-hp-container {
  margin-top: 4px;
}

.boss-hp-label {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #aaa;
  margin-bottom: 6px;
}

.hp-numbers {
  color: #ff6b6b;
  font-weight: bold;
}

.boss-hp-bar {
  height: 24px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  border: 1px solid rgba(255, 60, 60, 0.3);
}

.boss-hp-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff4444, #ff6b6b, #ff8888);
  border-radius: 12px;
  transition: width 0.5s ease;
  position: relative;
}

.boss-hp-fill.low {
  background: linear-gradient(90deg, #ff6600, #ff8833);
}

.boss-hp-fill.critical {
  background: linear-gradient(90deg, #cc0000, #ff3300);
  animation: critical-pulse 0.5s ease infinite alternate;
}

@keyframes critical-pulse {
  from { opacity: 0.8; }
  to { opacity: 1; }
}

.boss-hp-glow {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.3), transparent);
  border-radius: 12px;
  transition: width 0.5s ease;
}

.boss-hp-percent {
  text-align: right;
  font-size: 12px;
  color: #ff6b6b;
  margin-top: 4px;
}

.enrage-bar {
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(255, 100, 0, 0.15);
  border: 1px solid rgba(255, 100, 0, 0.3);
  border-radius: 8px;
}

.enrage-label {
  font-size: 13px;
  color: #ff8800;
  font-weight: bold;
}

.enrage-effect {
  font-size: 11px;
  color: #ff6600;
  margin-top: 2px;
}

/* 操作区 */
.action-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.damage-to-boss {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.damage-label {
  font-size: 12px;
  color: #888;
}

.damage-value {
  font-size: 28px;
  font-weight: bold;
  color: #ff4444;
  text-shadow: 0 0 15px rgba(255, 0, 0, 0.5);
}

.attack-btn {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 48px;
  background: linear-gradient(135deg, #cc0000, #ff4400, #cc0000);
  border: 3px solid rgba(255, 100, 0, 0.6);
  border-radius: 40px;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  overflow: hidden;
}

.attack-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transform: translateX(-100%);
  transition: transform 0.5s;
}

.attack-btn:hover:not(:disabled)::before {
  transform: translateX(100%);
}

.attack-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 6px 25px rgba(255, 50, 0, 0.6);
  border-color: rgba(255, 150, 0, 0.8);
}

.attack-btn:disabled {
  background: linear-gradient(135deg, #444, #333);
  border-color: rgba(255, 255, 255, 0.1);
  cursor: not-allowed;
}

.attack-btn.attacking {
  animation: attack-pulse 0.4s ease;
}

@keyframes attack-pulse {
  0% { transform: scale(1); }
  50% { transform: scale(0.95); }
  100% { transform: scale(1); }
}

.attack-btn.cooldown {
  opacity: 0.7;
}

.attack-icon { font-size: 22px; }

.attack-damage {
  position: absolute;
  right: -8px;
  top: -8px;
  background: #ff4400;
  border-radius: 20px;
  padding: 2px 8px;
  font-size: 12px;
  color: #fff;
}

.attack-tip {
  font-size: 12px;
  color: #888;
  text-align: center;
}

.attack-tip.cooldown-tip {
  color: #ff8800;
}

/* 伤害飘字 */
.damage-floats {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
}

.damage-float {
  position: absolute;
  top: 30%;
  font-size: 24px;
  font-weight: bold;
  color: #ff4400;
  text-shadow: 0 0 10px rgba(255, 0, 0, 0.8), 2px 2px 0 rgba(0,0,0,0.5);
  animation: floatUp 1.2s ease forwards;
  white-space: nowrap;
}

@keyframes floatUp {
  0% { opacity: 1; transform: translateY(0) scale(1); }
  50% { opacity: 1; transform: translateY(-40px) scale(1.2); }
  100% { opacity: 0; transform: translateY(-80px) scale(0.8); }
}

/* 排行榜 */
.ranking-section {
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: bold;
  margin-bottom: 12px;
  color: #ffd700;
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rank-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  transition: all 0.2s;
}

.rank-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.rank-item.rank-1 {
  background: rgba(255, 215, 0, 0.1);
  border-color: rgba(255, 215, 0, 0.4);
}

.rank-item.rank-2 {
  background: rgba(192, 192, 192, 0.08);
  border-color: rgba(192, 192, 192, 0.3);
}

.rank-item.rank-3 {
  background: rgba(205, 127, 50, 0.08);
  border-color: rgba(205, 127, 50, 0.3);
}

.rank-item.is-me {
  background: rgba(102, 126, 234, 0.15);
  border-color: rgba(102, 126, 234, 0.4);
}

.rank-medal {
  width: 28px;
  text-align: center;
  font-size: 16px;
}

.rank-num {
  font-size: 14px;
  color: #888;
}

.rank-player {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.player-name {
  font-size: 14px;
  color: #fff;
}

.player-tag {
  padding: 1px 6px;
  background: rgba(102, 126, 234, 0.3);
  border-radius: 10px;
  font-size: 10px;
  color: #667eea;
}

.rank-damage {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.damage-num {
  font-size: 15px;
  font-weight: bold;
  color: #ff6b6b;
}

.damage-unit {
  font-size: 11px;
  color: #666;
}

.empty-ranking {
  text-align: center;
  padding: 30px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
}

.empty-icon { font-size: 40px; margin-bottom: 8px; }
.empty-text { font-size: 15px; color: #888; }
.empty-sub { font-size: 12px; color: #555; margin-top: 4px; }

/* 奖励区 */
.rewards-section { margin-bottom: 12px; }

.rewards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
}

.reward-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
}

.reward-item.top-damage {
  background: rgba(255, 215, 0, 0.08);
  border-color: rgba(255, 215, 0, 0.3);
}

.reward-icon { font-size: 22px; }
.reward-name { font-size: 11px; color: #888; }
.reward-amount { font-size: 13px; color: #ffd700; font-weight: bold; }

/* 无BOSS */
.no-boss-state {
  text-align: center;
  padding: 60px 20px;
}

.no-boss-icon { font-size: 64px; margin-bottom: 16px; }
.no-boss-title {
  font-size: 22px;
  font-weight: bold;
  color: #888;
  margin-bottom: 8px;
}
.no-boss-desc { font-size: 14px; color: #666; margin-bottom: 6px; }
.no-boss-tip { font-size: 12px; color: #555; }
</style>
