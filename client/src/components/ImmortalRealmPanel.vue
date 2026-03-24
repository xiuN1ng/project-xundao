<template>
  <div class="immortal-realm-panel" :style="bgStyle">
    <div class="panel-header">
      <div class="header-left">
        <div class="panel-title">☁️ 仙界地图</div>
        <div class="panel-subtitle">六大仙域 · 挂机修炼 · 仙气产出</div>
      </div>
      <button class="close-btn" @click="closePanel">×</button>
    </div>

    <div class="spirit-energy-bar">
      <div class="energy-icon">✨</div>
      <div class="energy-info">
        <span class="energy-label">仙气</span>
        <span class="energy-value">{{ formatNumber(immortalEnergy) }}</span>
      </div>
      <div class="energy-rate"><span>+{{ formatNumber(energyPerHour) }}/时</span></div>
      <button class="collect-btn" @click="collectEnergy" :disabled="collecting">
        {{ collecting ? '收集中...' : '收取' }}
      </button>
    </div>

    <div class="realm-tabs">
      <button v-for="tab in tabs" :key="tab.id" class="realm-tab-btn"
        :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">
        {{ tab.icon }} {{ tab.name }}
      </button>
    </div>

    <div v-if="activeTab === 'map'" class="tab-content">
      <div class="section-desc">💡 选择区域挂机击杀怪物，获取仙气与珍稀奖励</div>
      <div class="regions-grid">
        <div v-for="region in regions" :key="region.id" class="region-card"
          :class="{ 'region-locked': !region.unlocked, 'region-selected': selectedRegion && selectedRegion.id === region.id, 'region-active': region.id === activeRegionId }"
          @click="region.unlocked && selectRegion(region)">
          <div class="region-icon">{{ region.icon }}</div>
          <div class="region-info">
            <div class="region-name">{{ region.name }}</div>
            <div class="region-level" v-if="region.unlocked">进度: {{ region.myProgress }}/{{ region.totalFloors }}层 · 境界 {{ region.reqRealm }}</div>
            <div class="region-locked-text" v-else>🔒 境界达到 {{ region.reqRealm }} 解锁</div>
          </div>
          <div class="region-rewards">
            <div class="reward-line"><span class="reward-icon">✨</span><span>{{ region.energyRate }}/时</span></div>
            <div class="reward-line" v-for="r in region.dropItems" :key="r.name"><span class="reward-icon">{{ r.icon }}</span><span>{{ r.name }} {{ r.rate }}</span></div>
          </div>
          <div class="hanging-badge" v-if="region.id === activeRegionId"><span class="hanging-dot"></span>挂机中</div>
          <div class="locked-overlay" v-if="!region.unlocked"></div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'battle'" class="tab-content">
      <div v-if="!selectedRegion" class="no-selection">
        <p>请先在地图中选择一个区域</p>
        <button class="btn-primary" @click="activeTab = 'map'">前往地图</button>
      </div>
      <div v-else class="battle-section">
        <div class="current-hang-info">
          <div class="hang-region-title">
            <span class="region-icon-lg">{{ selectedRegion.icon }}</span>
            <div>
              <div class="hang-name">{{ selectedRegion.name }}</div>
              <div class="hang-progress-text">第 {{ hangState.currentFloor }} 层 · 已击杀 {{ hangState.killedCount }} 只</div>
            </div>
          </div>
          <div class="hang-status">
            <span class="status-badge" :class="hangState.running ? 'running' : 'paused'">
              {{ hangState.running ? '🟢 挂机中' : '⏸️ 已暂停' }}
            </span>
            <button class="toggle-hang-btn" @click="toggleHang">{{ hangState.running ? '暂停' : '开始' }}</button>
          </div>
        </div>

        <div class="monster-showcase">
          <div class="monster-card">
            <div class="monster-avatar">{{ hangState.currentMonster.icon }}</div>
            <div class="monster-details">
              <div class="monster-name">{{ hangState.currentMonster.name }}</div>
              <div class="monster-level">Lv.{{ hangState.currentMonster.level }}</div>
              <div class="monster-stats">
                <div class="stat"><span class="stat-icon">❤️</span><span>{{ formatNumber(hangState.currentMonster.hp) }}</span></div>
                <div class="stat"><span class="stat-icon">⚔️</span><span>{{ formatNumber(hangState.currentMonster.atk) }}</span></div>
                <div class="stat"><span class="stat-icon">🛡️</span><span>{{ formatNumber(hangState.currentMonster.def) }}</span></div>
              </div>
            </div>
            <div class="monster-hp-bar"><div class="mhp-fill" :style="{ width: monsterHpPercent + '%' }"></div></div>
            <div class="monster-hp-text">{{ formatNumber(Math.floor(hangState.currentMonster.hp)) }} / {{ formatNumber(hangState.currentMonster.maxHp) }}</div>
          </div>
        </div>

        <div class="player-hang-info">
          <div class="player-mini">
            <div class="player-avatar">🧘</div>
            <div class="player-stats-hang">
              <div>攻击: {{ formatNumber(playerStats.atk) }}</div>
              <div>防御: {{ formatNumber(playerStats.def) }}</div>
              <div>境界: {{ playerStats.realm }}</div>
            </div>
          </div>
          <div class="hang-rewards-preview">
            <div class="preview-title">预计掉落</div>
            <div class="preview-items">
              <div class="preview-item" v-for="item in selectedRegion.dropItems" :key="item.name">
                <span>{{ item.icon }}</span><span>{{ item.name }} {{ item.rate }}</span>
              </div>
              <div class="preview-item energy"><span>✨</span><span>仙气 +{{ selectedRegion.floorEnergy }}</span></div>
            </div>
          </div>
        </div>

        <div class="damage-floats">
          <transition-group name="float-up">
            <div v-for="dmg in damageFloats" :key="dmg.id" class="damage-float" :class="dmg.type">
              {{ dmg.type === 'crit' ? '💥' : '' }}-{{ formatNumber(dmg.value) }}
            </div>
          </transition-group>
        </div>

        <div class="hang-actions">
          <button class="btn-start-hang" @click="startHang" v-if="!hangState.running">🚀 开始挂机</button>
          <button class="btn-pause-hang" @click="toggleHang" v-else>⏸️ 暂停挂机</button>
          <button class="btn-speed" @click="cycleSpeed" :disabled="!hangState.running">速度: {{ hangState.speed }}x</button>
          <button class="btn-boost" @click="boostHang">⚡ 加速</button>
        </div>

        <div class="kill-log">
          <div class="log-title">📜 击杀记录</div>
          <div class="log-entries">
            <div v-for="entry in killLog" :key="entry.id" class="log-entry" :class="'rarity-' + entry.rarity">
              <span class="log-icon">{{ entry.icon }}</span>
              <span class="log-name">{{ entry.name }}</span>
              <span class="log-reward">+{{ entry.energy }}✨</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'output'" class="tab-content">
      <div class="section-desc">💡 挂机产出仙气，仙气可用于兑换珍稀道具与境界突破</div>

      <div class="energy-warehouse">
        <div class="warehouse-header">
          <span class="warehouse-icon">✨</span>
          <span class="warehouse-title">仙气仓库</span>
          <span class="warehouse-total">{{ formatNumber(immortalEnergy) }}</span>
        </div>
        <div class="warehouse-progress"><div class="wp-fill" :style="{ width: Math.min(immortalEnergy / energyCap * 100, 100) + '%' }"></div></div>
        <div class="warehouse-cap-text">容量: {{ formatNumber(immortalEnergy) }} / {{ formatNumber(energyCap) }}</div>
      </div>

      <div class="output-stats">
        <div class="output-title">📊 各域产出统计</div>
        <div class="output-list">
          <div v-for="region in regions.filter(r => r.unlocked)" :key="region.id" class="output-item" :class="{ 'output-active': region.id === activeRegionId }">
            <div class="output-region-info">
              <span class="output-icon">{{ region.icon }}</span>
              <span class="output-name">{{ region.name }}</span>
              <span class="output-rate" v-if="region.id === activeRegionId">✨ {{ region.energyRate }}/时</span>
              <span class="output-idle" v-else>空闲</span>
            </div>
            <div class="output-bar-bg"><div class="output-bar-fill" :style="{ width: (region.id === activeRegionId ? 100 : 0) + '%' }"></div></div>
          </div>
        </div>
      </div>

      <div class="total-output">
        <div class="total-item" v-for="t in totalStats" :key="t.label">
          <span class="total-label">{{ t.label }}</span>
          <span class="total-value" :class="t.cls">{{ t.value }}</span>
        </div>
      </div>

      <div class="energy-shop">
        <div class="shop-title">🏪 仙气商店</div>
        <div class="shop-items">
          <div v-for="item in shopItems" :key="item.id" class="shop-item">
            <div class="shop-item-icon">{{ item.icon }}</div>
            <div class="shop-item-info">
              <div class="shop-item-name">{{ item.name }}</div>
              <div class="shop-item-desc">{{ item.desc }}</div>
            </div>
            <div class="shop-item-price"><span class="price-icon">✨</span><span class="price-value">{{ formatNumber(item.price) }}</span></div>
            <button class="shop-buy-btn" @click="buyItem(item)" :disabled="immortalEnergy < item.price">购买</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue'

const props = defineProps({ visible: { type: Boolean, default: true } })
const emit = defineEmits(['close'])

const activeTab = ref('map')
const tabs = [
  { id: 'map', name: '地图', icon: '🗺️' },
  { id: 'battle', name: '挂机', icon: '⚔️' },
  { id: 'output', name: '产出', icon: '✨' }
]

const regions = ref([
  { id: 'celestial', icon: '🌤️', name: '天界云宫', reqRealm: 1, unlocked: true, myProgress: 45, totalFloors: 100, energyRate: 120, floorEnergy: 5, dropItems: [{ icon: '💫', name: '云晶', rate: '30%' }, { icon: '📜', name: '天书残卷', rate: '10%' }] },
  { id: 'nine-heavens', icon: '🔱', name: '九重天阙', reqRealm: 5, unlocked: true, myProgress: 22, totalFloors: 100, energyRate: 380, floorEnergy: 15, dropItems: [{ icon: '⚡', name: '九天玄雷', rate: '25%' }, { icon: '🎋', name: '天材', rate: '12%' }] },
  { id: 'paradise', icon: '🏯', name: '瑶池仙境', reqRealm: 10, unlocked: true, myProgress: 8, totalFloors: 100, energyRate: 950, floorEnergy: 38, dropItems: [{ icon: '🌸', name: '瑶池灵液', rate: '20%' }, { icon: '💎', name: '仙玉', rate: '8%' }] },
  { id: 'divine-mountain', icon: '⛰️', name: '昆仑神山', reqRealm: 15, unlocked: false, myProgress: 0, totalFloors: 100, energyRate: 2100, floorEnergy: 85, dropItems: [{ icon: '🌿', name: '神草', rate: '18%' }, { icon: '🗡️', name: '仙剑碎片', rate: '5%' }] },
  { id: 'empyrean', icon: '🌌', name: '太虚幻境', reqRealm: 20, unlocked: false, myProgress: 0, totalFloors: 100, energyRate: 5200, floorEnergy: 200, dropItems: [{ icon: '🌙', name: '月华精华', rate: '15%' }, { icon: '☀️', name: '日光神露', rate: '15%' }] },
  { id: 'ultimate', icon: '🔥', name: '大罗天域', reqRealm: 25, unlocked: false, myProgress: 0, totalFloors: 100, energyRate: 12000, floorEnergy: 500, dropItems: [{ icon: '👑', name: '大罗金丹', rate: '10%' }, { icon: '📿', name: '天道法则碎片', rate: '3%' }] }
])

const selectedRegion = ref(null)
const activeRegionId = ref('celestial')
const immortalEnergy = ref(38540)
const energyCap = ref(100000)
const energyPerHour = computed(() => { const a = regions.value.find(r => r.id === activeRegionId.value); return a ? a.energyRate : 0 })
const todayEnergy = ref(128400)
const totalEnergyEarned = ref(2847000)
const collecting = ref(false)
const playerStats = ref({ atk: 12500, def: 8200, realm: 12 })

const hangState = reactive({
  running: false, currentFloor: 1, killedCount: 0, speed: 1,
  currentMonster: { icon: '👹', name: '云游仙兽', level: 15, hp: 5000, maxHp: 5000, atk: 800, def: 400 }
})

const monsterHpPercent = computed(() => { if (!hangState.currentMonster.maxHp) return 0; return Math.max(0, (hangState.currentMonster.hp / hangState.currentMonster.maxHp) * 100) })
const damageFloats = ref([])
let dmgIdCounter = 0
const killLog = ref([
  { id: 1, icon: '👾', name: '玄天妖兽', energy: 38, rarity: 'rare' },
  { id: 2, icon: '👹', name: '云游仙兽', energy: 15, rarity: 'common' },
  { id: 3, icon: '👹', name: '云游仙兽', energy: 12, rarity: 'common' },
  { id: 4, icon: '👹', name: '云游仙兽', energy: 18, rarity: 'common' }
])

const shopItems = ref([
  { id: 1, icon: '⚗️', name: '境界突破丹', desc: '用于境界突破', price: 5000 },
  { id: 2, icon: '💫', name: '云晶礼包', desc: '打开获得100云晶', price: 2000 },
  { id: 3, icon: '🚀', name: '挂机加速卡(1小时)', desc: '挂机速度+100%', price: 3000 },
  { id: 4, icon: '📦', name: '随机仙宝袋', desc: '随机获得一件仙界装备', price: 15000 },
  { id: 5, icon: '✨', name: '仙气储存符', desc: '仙气仓库上限+20000', price: 8000 }
])

const bgStyle = { background: 'linear-gradient(135deg, #0a0a2e 0%, #1a1a4e 50%, #0f0f3e 100%)' }
const totalStats = computed(() => [
  { label: '当前仙气', value: formatNumber(immortalEnergy.value), cls: '' },
  { label: '每小时产出', value: '+' + formatNumber(energyPerHour.value), cls: 'rate' },
  { label: '今日累计', value: formatNumber(todayEnergy.value), cls: '' },
  { label: '历史累计', value: formatNumber(totalEnergyEarned.value), cls: '' }
])

function closePanel() { emit('close') }
function selectRegion(region) { selectedRegion.value = region; activeTab.value = 'battle' }
function formatNumber(n) { if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'; if (n >= 1000) return (n / 1000).toFixed(1) + 'K'; return n.toString() }

function collectEnergy() {
  collecting.value = true
  setTimeout(() => { immortalEnergy.value = 0; collecting.value = false }, 800)
}

function startHang() {
  if (!selectedRegion.value) return
  hangState.running = true
  if (activeRegionId.value !== selectedRegion.value.id) activeRegionId.value = selectedRegion.value.id
  startAutoBattle()
}

function toggleHang() { hangState.running = !hangState.running; if (hangState.running) startAutoBattle() }
function cycleSpeed() { const speeds = [1, 2, 5, 10]; const idx = speeds.indexOf(hangState.speed); hangState.speed = speeds[(idx + 1) % speeds.length] }
function boostHang() { hangState.speed = Math.min(hangState.speed + 2, 10) }
let battleInterval = null

function startAutoBattle() {
  if (battleInterval) clearInterval(battleInterval)
  const tickMs = 1000 / hangState.speed
  battleInterval = setInterval(() => {
    if (!hangState.running) { clearInterval(battleInterval); return }
    const playerDmg = Math.max(1, playerStats.value.atk - hangState.currentMonster.def * 0.5)
    const isCrit = Math.random() < 0.15
    const finalDmg = isCrit ? Math.floor(playerDmg * 2.5) : Math.floor(playerDmg)
    hangState.currentMonster.hp -= finalDmg
    addDamageFloat(finalDmg, isCrit ? 'crit' : 'normal')
    if (hangState.currentMonster.hp <= 0) {
      const floorEnergy = selectedRegion.value ? selectedRegion.value.floorEnergy : 5
      immortalEnergy.value += floorEnergy
      hangState.killedCount++
      killLog.value.unshift({ id: Date.now(), icon: hangState.currentMonster.icon, name: hangState.currentMonster.name, energy: floorEnergy, rarity: 'common' })
      if (killLog.value.length > 10) killLog.value.pop()
      spawnNextMonster()
    }
  }, tickMs)
}

function spawnNextMonster() {
  hangState.currentFloor++
  const monsters = [
    { icon: '👹', name: '云游仙兽', level: 15, hp: 5000, atk: 800, def: 400 },
    { icon: '👾', name: '玄天妖兽', level: 18, hp: 6800, atk: 1100, def: 550 },
    { icon: '🐉', name: '下品妖龙', level: 22, hp: 9000, atk: 1500, def: 700 },
    { icon: '🦅', name: '九天雷鹏', level: 25, hp: 12000, atk: 1900, def: 900 },
    { icon: '👿', name: '堕仙之魂', level: 30, hp: 18000, atk: 2500, def: 1200 }
  ]
  const monster = monsters[Math.floor(Math.random() * monsters.length)]
  hangState.currentMonster = { ...monster, maxHp: monster.hp }
}

function addDamageFloat(value, type) {
  const id = dmgIdCounter++
  damageFloats.value.push({ id, value, type })
  setTimeout(() => { damageFloats.value = damageFloats.value.filter(d => d.id !== id) }, 1000)
}

function buyItem(item) { if (immortalEnergy.value >= item.price) immortalEnergy.value -= item.price }
onUnmounted(() => { if (battleInterval) clearInterval(battleInterval) })
onMounted(() => { selectedRegion.value = regions.value.find(r => r.id === activeRegionId.value) || regions.value[0] })
</script>

<style scoped>
.immortal-realm-panel {
  position: relative; width: 680px; max-height: 85vh;
  overflow-y: auto; border-radius: 16px; color: #fff;
  font-family: 'Microsoft YaHei', sans-serif;
  scrollbar-width: thin; scrollbar-color: rgba(167,139,250,0.3) transparent;
}
.immortal-realm-panel::-webkit-scrollbar { width: 6px; }
.immortal-realm-panel::-webkit-scrollbar-track { background: transparent; }
.immortal-realm-panel::-webkit-scrollbar-thumb { background: rgba(167,139,250,0.3); border-radius: 3px; }
.panel-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px 0; }
.header-left { flex: 1; }
.panel-title { font-size: 26px; font-weight: bold; background: linear-gradient(90deg, #a78bfa, #818cf8, #60a5fa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.panel-subtitle { font-size: 12px; opacity: 0.6; margin-top: 2px; }
.close-btn { width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.1); border: none; color: #fff; font-size: 20px; cursor: pointer; line-height: 32px; }
.close-btn:hover { background: rgba(255,255,255,0.2); }
.spirit-energy-bar { display: flex; align-items: center; gap: 12px; margin: 16px 24px; padding: 12px 18px; background: rgba(167,139,250,0.15); border: 1px solid rgba(167,139,250,0.3); border-radius: 12px; }
.energy-icon { font-size: 28px; }
.energy-info { flex: 1; }
.energy-label { display: block; font-size: 11px; opacity: 0.7; }
.energy-value { font-size: 22px; font-weight: bold; color: #a78bfa; }
.energy-rate { font-size: 13px; color: #4ade80; }
.collect-btn { padding: 8px 18px; border-radius: 20px; background: linear-gradient(90deg, #a78bfa, #818cf8); border: none; color: #fff; font-weight: bold; cursor: pointer; }
.collect-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.realm-tabs { display: flex; gap: 4px; padding: 0 24px; border-bottom: 1px solid rgba(255,255,255,0.08); }
.realm-tab-btn { padding: 10px 20px; border: none; background: none; color: rgba(255,255,255,0.5); cursor: pointer; border-bottom: 2px solid transparent; font-size: 14px; transition: all 0.2s; }
.realm-tab-btn.active { color: #a78bfa; border-bottom-color: #a78bfa; }
.tab-content { padding: 16px 24px 24px; }
.section-desc { font-size: 13px; opacity: 0.7; margin-bottom: 16px; }
.regions-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.region-card { position: relative; padding: 16px; border-radius: 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); cursor: pointer; transition: all 0.3s; overflow: hidden; }
.region-card:hover:not(.region-locked) { background: rgba(167,139,250,0.1); border-color: rgba(167,139,250,0.3); transform: translateY(-2px); }
.region-selected { border-color: #a78bfa !important; background: rgba(167,139,250,0.15) !important; }
.region-locked { cursor: not-allowed; opacity: 0.7; }
.region-icon { font-size: 36px; margin-bottom: 8px; }
.region-name { font-size: 14px; font-weight: bold; margin-bottom: 4px; }
.region-level { font-size: 11px; opacity: 0.6; }
.region-locked-text { font-size: 11px; color: #ef4444; }
.region-rewards { margin-top: 10px; }
.reward-line { display: flex; align-items: center; gap: 4px; font-size: 11px; opacity: 0.8; margin-top: 2px; }
.reward-icon { font-size: 12px; }
.hanging-badge { position: absolute; top: 8px; right: 8px; display: flex; align-items: center; gap: 4px; font-size: 10px; padding: 3px 8px; background: rgba(74,222,128,0.2); border-radius: 10px; color: #4ade80; }
.hanging-dot { width: 6px; height: 6px; border-radius: 50%; background: #4ade80; animation: pulse 1.5s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
.locked-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.4); border-radius: 14px; }
.no-selection { text-align: center; padding: 40px; opacity: 0.7; }
.no-selection p { margin-bottom: 16px; }
.btn-primary { padding: 10px 24px; border-radius: 20px; background: linear-gradient(90deg, #a78bfa, #818cf8); border: none; color: #fff; cursor: pointer; font-weight: bold; }
.current-hang-info { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; background: rgba(255,255,255,0.04); border-radius: 12px; margin-bottom: 16px; }
.hang-region-title { display: flex; align-items: center; gap: 12px; }
.region-icon-lg { font-size: 40px; }
.hang-name { font-size: 18px; font-weight: bold; color: #a78bfa; }
.hang-progress-text { font-size: 12px; opacity: 0.7; margin-top: 4px; }
.hang-status { display: flex; align-items: center; gap: 10px; }
.status-badge { padding: 4px 12px; border-radius: 12px; font-size: 13px; }
.status-badge.running { background: rgba(74,222,128,0.2); color: #4ade80; }
.status-badge.paused { background: rgba(251,191,36,0.2); color: #fbbf24; }
.toggle-hang-btn { padding: 6px 16px; border-radius: 12px; background: rgba(167,139,250,0.2); border: 1px solid rgba(167,139,250,0.4); color: #a78bfa; cursor: pointer; font-size: 13px; }
.monster-showcase { display: flex; justify-content: center; margin-bottom: 16px; }
.monster-card { width: 100%; padding: 16px; border-radius: 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); text-align: center; position: relative; }
.monster-avatar { font-size: 56px; margin-bottom: 8px; }
.monster-name { font-size: 18px; font-weight: bold; }
.monster-level { font-size: 12px; opacity: 0.6; }
.monster-stats { display: flex; justify-content: center; gap: 20px; margin-top: 8px; }
.stat { display: flex; align-items: center; gap: 4px; font-size: 13px; }
.stat-icon { font-size: 14px; }
.monster-hp-bar { height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; margin: 10px 0 4px; overflow: hidden; }
.mhp-fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, #ef4444, #f97316); transition: width 0.3s; }
.monster-hp-text { font-size: 12px; opacity: 0.7; }
.player-hang-info { display: flex; gap: 16px; margin-bottom: 16px; }
.player-mini { flex: 1; padding: 12px; border-radius: 12px; background: rgba(167,139,250,0.08); border: 1px solid rgba(167,139,250,0.2); display: flex; align-items: center; gap: 10px; }
.player-avatar { font-size: 32px; }
.player-stats-hang { font-size: 12px; line-height: 1.8; }
.hang-rewards-preview { flex: 2; padding: 12px; border-radius: 12px; background: rgba(255,255,255,0.03); }
.preview-title { font-size: 12px; opacity: 0.6; margin-bottom: 6px; }
.preview-items { display: flex; flex-wrap: wrap; gap: 6px; }
.preview-item { display: flex; align-items: center; gap: 4px; font-size: 12px; padding: 4px 8px; background: rgba(255,255,255,0.05); border-radius: 8px; }
.preview-item.energy { color: #a78bfa; }
.damage-floats { position: relative; height: 0; }
.damage-float { position: absolute; top: -60px; left: 50%; transform: translateX(-50%); font-size: 18px; font-weight: bold; color: #fbbf24; text-shadow: 0 0 8px rgba(251,191,36,0.8); pointer-events: none; }
.damage-float.crit { color: #f97316; font-size: 24px; text-shadow: 0 0 12px rgba(249,115,22,0.9); }
.float-up-enter-active { animation: floatUp 1s ease-out forwards; }
.float-up-leave-active { display: none; }
@keyframes floatUp { 0% { opacity: 1; transform: translateX(-50%) translateY(0); } 100% { opacity: 0; transform: translateX(-50%) translateY(-60px); } }
.hang-actions { display: flex; gap: 10px; justify-content: center; margin: 16px 0; }
.btn-start-hang, .btn-pause-hang { padding: 12px 28px; border-radius: 25px; border: none; font-size: 15px; font-weight: bold; cursor: pointer; color: #fff; }
.btn-start-hang { background: linear-gradient(90deg, #4ade80, #22c55e); }
.btn-pause-hang { background: linear-gradient(90deg, #fbbf24, #f59e0b); }
.btn-speed { padding: 10px 18px; border-radius: 20px; border: 1px solid rgba(167,139,250,0.4); background: rgba(167,139,250,0.1); color: #a78bfa; cursor: pointer; font-size: 13px; }
.btn-speed:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-boost { padding: 10px 18px; border-radius: 20px; border: none; background: linear-gradient(90deg, #a78bfa, #818cf8); color: #fff; cursor: pointer; font-size: 13px; }
.kill-log { margin-top: 16px; }
.log-title { font-size: 14px; font-weight: bold; margin-bottom: 10px; opacity: 0.8; }
.log-entries { display: flex; flex-direction: column; gap: 6px; }
.log-entry { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: 8px; font-size: 13px; }
.log-icon { font-size: 16px; }
.log-name { flex: 1; opacity: 0.8; }
.log-reward { color: #a78bfa; font-weight: bold; }
.log-entry.rarity-rare { border-left: 2px solid #f59e0b; }
.log-entry.rarity-epic { border-left: 2px solid #a78bfa; }
.energy-warehouse { padding: 16px; background: rgba(167,139,250,0.1); border-radius: 12px; margin-bottom: 16px; }
.warehouse-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.warehouse-icon { font-size: 24px; }
.warehouse-title { flex: 1; font-weight: bold; }
.warehouse-total { font-size: 20px; color: #a78bfa; font-weight: bold; }
.warehouse-progress { height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; margin-bottom: 6px; overflow: hidden;
.wp-fill { height: 100%; border-radius: 3px; background: linear-gradient(90deg, #a78bfa, #818cf8); transition: width 0.5s; }
.warehouse-cap-text { font-size: 11px; opacity: 0.6; }
.output-stats { margin-bottom: 16px; }
.output-title { font-size: 14px; font-weight: bold; margin-bottom: 10px; opacity: 0.8; }
.output-list { display: flex; flex-direction: column; gap: 8px; }
.output-item { padding: 10px 14px; background: rgba(255,255,255,0.03); border-radius: 10px; }
.output-item.output-active { background: rgba(167,139,250,0.1); border: 1px solid rgba(167,139,250,0.2); }
.output-region-info { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.output-icon { font-size: 18px; }
.output-name { flex: 1; font-size: 13px; }
.output-rate { font-size: 12px; color: #a78bfa; font-weight: bold; }
.output-idle { font-size: 12px; color: rgba(255,255,255,0.3); }
.output-bar-bg { height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden; }
.output-bar-fill { height: 100%; border-radius: 2px; background: linear-gradient(90deg, #a78bfa, #818cf8); transition: width 0.5s; }
.total-output { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
.total-item { padding: 12px; background: rgba(255,255,255,0.03); border-radius: 10px; text-align: center; }
.total-label { display: block; font-size: 11px; opacity: 0.6; margin-bottom: 4px; }
.total-value { font-size: 16px; font-weight: bold; }
.total-value.rate { color: #4ade80; }
.energy-shop { }
.shop-title { font-size: 14px; font-weight: bold; margin-bottom: 10px; opacity: 0.8; }
.shop-items { display: flex; flex-direction: column; gap: 8px; }
.shop-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: rgba(255,255,255,0.03); border-radius: 10px; }
.shop-item-icon { font-size: 24px; }
.shop-item-info { flex: 1; }
.shop-item-name { font-size: 13px; font-weight: bold; }
.shop-item-desc { font-size: 11px; opacity: 0.6; }
.shop-item-price { display: flex; align-items: center; gap: 4px; }
.price-icon { font-size: 12px; }
.price-value { font-size: 14px; color: #a78bfa; font-weight: bold; }
.shop-buy-btn { padding: 6px 14px; border-radius: 14px; background: linear-gradient(90deg, #a78bfa, #818cf8); border: none; color: #fff; font-size: 12px; cursor: pointer; font-weight: bold; }
.shop-buy-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.battle-section { position: relative; }
</style>
