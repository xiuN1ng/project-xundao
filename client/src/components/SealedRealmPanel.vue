<template>
  <div class="sealed-realm-panel" :style="bgStyle">
    <!-- Tab 导航 -->
    <div class="realm-tabs">
      <button v-for="tab in tabs" :key="tab.id" :class="{ active: activeTab === tab.id }" @click="switchTab(tab.id)">
        {{ tab.icon }} {{ tab.name }}
      </button>
    </div>

    <!-- 魔晶货币显示 -->
    <div class="magic-crystal-bar">
      <span class="crystal-icon">💠</span>
      <span class="crystal-label">魔晶:</span>
      <span class="crystal-value">{{ magicCrystal.toLocaleString() }}</span>
      <button class="crystal-help" @click="showCrystalInfo = true">ℹ️</button>
    </div>

    <!-- 封魔渊副本 Tab -->
    <div v-if="activeTab === 'dungeon'" class="tab-content">
      <div class="panel-header">
        <h3>⚫ 封魔渊</h3>
      </div>

      <!-- 封魔渊简介 -->
      <div class="realm-intro">
        <div class="intro-icon">🌀</div>
        <div class="intro-text">
          <div class="intro-title">封印魔域 · 镇杀魔兽</div>
          <div class="intro-desc">击败魔兽可获得魔晶，用于兑换稀有魔器装备</div>
        </div>
      </div>

      <!-- 封魔渊副本卡片 -->
      <div class="realm-list">
        <div v-for="realm in sealedRealms" :key="realm.id" class="realm-card" :class="'tier-' + realm.tier">
          <div class="realm-header">
            <span class="realm-icon">{{ realm.icon }}</span>
            <div class="realm-title">
              <div class="realm-name">{{ realm.name }}</div>
              <div class="realm-tier" :class="'tier-' + realm.tier">{{ tierName[realm.tier] }}</div>
            </div>
            <div class="realm-level-req"><span class="level-badge">境界 {{ realm.reqLevel }}</span></div>
          </div>
          <div class="realm-desc">{{ realm.desc }}</div>
          <div class="realm-info-row">
            <span>💀 {{ realm.monsters }}只魔兽</span>
            <span>⏱️ {{ realm.cooldownText }}</span>
            <span>💠 {{ realm.magicCrystalReward }}魔晶</span>
          </div>
          <div class="realm-rewards-preview">
            <div class="reward-label">魔器碎片概率：</div>
            <div class="reward-tags">
              <span class="reward-tag rare">稀有魔器 {{ realm.dropRates.rare }}%</span>
              <span class="reward-tag epic">史诗魔器 {{ realm.dropRates.epic }}%</span>
              <span class="reward-tag legend">传说魔器 {{ realm.dropRates.legend }}%</span>
            </div>
          </div>
          <div class="realm-actions">
            <button class="btn-enter" @click="enterRealm(realm)" :disabled="loading || realm.cooldown > 0">
              {{ realm.cooldown > 0 ? `冷却${realm.cooldownText}` : '进入挑战' }}
            </button>
            <button class="btn-sweep" @click="sweepRealm(realm)" :disabled="loading || !realm.sweepTimes">
              一键扫荡{{ realm.sweepTimes ? `(${realm.sweepTimes}次)` : '' }}
            </button>
          </div>
          <div v-if="realm.error" class="realm-error">{{ realm.error }}</div>
        </div>
      </div>

      <!-- 已获得的魔器碎片 -->
      <div class="fragments-section" v-if="collectedFragments.length > 0">
        <h4>🧩 魔器碎片</h4>
        <div class="fragments-grid">
          <div v-for="frag in collectedFragments" :key="frag.id" class="fragment-item" :class="'rarity-' + frag.rarity">
            <div class="frag-icon">{{ frag.icon }}</div>
            <div class="frag-name">{{ frag.name }}</div>
            <div class="frag-count">{{ frag.count }}/{{ frag.needed }}</div>
            <button v-if="frag.count >= frag.needed" class="btn-compose" @click="composeArtifact(frag)">合成</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 魔晶商店 Tab -->
    <div v-if="activeTab === 'shop'" class="tab-content">
      <div class="panel-header"><h3>💠 魔晶商店</h3></div>
      <div class="shop-grid">
        <div v-for="item in shopItems" :key="item.id" class="shop-item" :class="'rarity-' + item.rarity">
          <div class="item-icon">{{ item.icon }}</div>
          <div class="item-name">{{ item.name }}</div>
          <div class="item-desc">{{ item.desc }}</div>
          <div class="item-price">
            <span class="price-icon">💠</span>
            <span class="price-value">{{ item.price }}</span>
          </div>
          <button class="btn-buy" @click="buyItem(item)" :disabled="loading || magicCrystal < item.price">
            购买
          </button>
        </div>
      </div>
    </div>

    <!-- 魔器装备 Tab -->
    <div v-if="activeTab === 'equipment'" class="tab-content">
      <div class="panel-header"><h3>⚔️ 魔器装备</h3></div>
      
      <!-- 我的魔器 -->
      <div class="equipment-section">
        <h4>📦 我的魔器</h4>
        <div v-if="myArtifacts.length === 0" class="empty-state">
          <div class="empty-icon">⚔️</div>
          <p>暂无魔器</p>
          <p class="hint">在封魔渊中击败魔兽可获得魔器碎片，合成后获得魔器</p>
        </div>
        <div v-else class="equipment-grid">
          <div v-for="artifact in myArtifacts" :key="artifact.id" class="equip-card" :class="['rarity-' + artifact.rarity, { equipped: artifact.equipped }]" @click="selectArtifact(artifact)">
            <div class="equip-icon">{{ artifact.icon }}</div>
            <div class="equip-name">{{ artifact.name }}</div>
            <div class="equip-rarity-tag" :style="{ color: rarityColor[artifact.rarity] }">{{ rarityName[artifact.rarity] }}</div>
            <div class="equip-level">Lv.{{ artifact.level }}</div>
            <div v-if="artifact.equipped" class="equipped-badge">已装备</div>
          </div>
        </div>
      </div>

      <!-- 魔器详情 -->
      <div class="artifact-detail" v-if="selectedArtifact">
        <h4>📋 {{ selectedArtifact.name }}</h4>
        <div class="detail-header">
          <div class="detail-icon" :style="{ color: rarityColor[selectedArtifact.rarity] }">{{ selectedArtifact.icon }}</div>
          <div class="detail-info">
            <div class="detail-name">{{ selectedArtifact.name }}</div>
            <div class="detail-rarity" :style="{ color: rarityColor[selectedArtifact.rarity] }">{{ rarityName[selectedArtifact.rarity] }}魔器 · Lv.{{ selectedArtifact.level }}</div>
          </div>
        </div>
        <div class="detail-attrs">
          <div v-for="(val, key) in selectedArtifact.attrs" :key="key" class="attr-row">
            <span class="attr-name">{{ attrName[key] || key }}</span>
            <span class="attr-value">+{{ val }}</span>
          </div>
        </div>
        <div class="detail-set" v-if="selectedArtifact.setName">
          <div class="set-label">套装: {{ selectedArtifact.setName }}</div>
          <div class="set-effect">{{ selectedArtifact.setEffect }}</div>
        </div>
        <div class="detail-actions">
          <button class="btn-equip" @click="toggleEquip(selectedArtifact)" :disabled="loading">
            {{ selectedArtifact.equipped ? '卸下' : '装备' }}
          </button>
          <button class="btn-upgrade" @click="upgradeArtifact(selectedArtifact)" :disabled="loading || magicCrystal < selectedArtifact.upgradeCost">
            升级 💠{{ selectedArtifact.upgradeCost }}
          </button>
        </div>
      </div>

      <!-- 魔器图鉴 -->
      <div class="catalog-section">
        <h4>📖 魔器图鉴</h4>
        <div class="catalog-grid">
          <div v-for="entry in artifactCatalog" :key="entry.id" class="catalog-item" :class="[entry.rarity, { unlocked: entry.unlocked }]">
            <div class="catalog-icon">{{ entry.unlocked ? entry.icon : '❓' }}</div>
            <div class="catalog-name">{{ entry.unlocked ? entry.name : '???' }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 魔晶说明弹窗 -->
    <div v-if="showCrystalInfo" class="modal-overlay" @click.self="showCrystalInfo = false">
      <div class="modal info-modal">
        <div class="modal-header"><h3>💠 魔晶说明</h3><button class="modal-close" @click="showCrystalInfo = false">✕</button></div>
        <div class="modal-body">
          <p>魔晶是封魔渊中魔兽体内凝结的神秘晶体，具有强大的魔力。</p>
          <ul>
            <li>击败封魔渊中的魔兽可获得魔晶</li>
            <li>魔晶可在魔晶商店兑换稀有道具</li>
            <li>魔晶可用于升级魔器装备</li>
            <li>收集足够魔器碎片可合成魔器</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Loading 遮罩 -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner">⚫</div>
      <div class="loading-text">{{ loadingText }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'

const tabs = [
  { id: 'dungeon', name: '封魔渊', icon: '🌀' },
  { id: 'shop', name: '魔晶商店', icon: '💠' },
  { id: 'equipment', name: '魔器', icon: '⚔️' }
]

const activeTab = ref('dungeon')
const magicCrystal = ref(0)
const loading = ref(false)
const loadingText = ref('')
const showCrystalInfo = ref(false)
const selectedArtifact = ref(null)

const tierName = { 1: '初级', 2: '中级', 3: '高级', 4: '顶级', 5: '禁忌' }
const rarityName = { common: '普通', rare: '稀有', epic: '史诗', legend: '传说' }
const rarityColor = { common: '#aaa', rare: '#4d7fff', epic: '#a855f7', legend: '#ff6b35' }
const attrName = { attack: '攻击', defense: '防御', hp: '生命', crit: '暴击', speed: '速度' }

const bgStyle = {
  background: 'linear-gradient(135deg, rgba(10,5,30,0.95) 0%, rgba(20,10,40,0.9) 50%, rgba(10,5,30,0.95) 100%)',
  minHeight: '100vh',
  padding: '15px',
  color: '#fff'
}

const sealedRealms = ref([
  {
    id: 'abyss_1', name: '封魔渊·一层', icon: '🌑', tier: 1, reqLevel: 1,
    desc: '封印薄弱之地，低阶魔兽出没',
    monsters: 10, cooldownText: '无', magicCrystalReward: '50-100',
    dropRates: { rare: 15, epic: 5, legend: 1 },
    cooldown: 0, sweepTimes: 3, error: ''
  },
  {
    id: 'abyss_2', name: '封魔渊·三层', icon: '🌒', tier: 2, reqLevel: 30,
    desc: '魔气渐浓，中阶魔兽盘踞',
    monsters: 15, cooldownText: '无', magicCrystalReward: '150-300',
    dropRates: { rare: 20, epic: 10, legend: 2 },
    cooldown: 0, sweepTimes: 2, error: ''
  },
  {
    id: 'abyss_3', name: '封魔渊·五层', icon: '🌓', tier: 3, reqLevel: 60,
    desc: '魔域深处，高阶魔兽蛰伏',
    monsters: 20, cooldownText: '无', magicCrystalReward: '400-800',
    dropRates: { rare: 25, epic: 15, legend: 3 },
    cooldown: 0, sweepTimes: 1, error: ''
  },
  {
    id: 'abyss_4', name: '封魔渊·七层', icon: '🌔', tier: 4, reqLevel: 90,
    desc: '魔气滔天，顶级魔兽守护',
    monsters: 25, cooldownText: '无', magicCrystalReward: '1000-2000',
    dropRates: { rare: 30, epic: 20, legend: 5 },
    cooldown: 0, sweepTimes: 0, error: ''
  },
  {
    id: 'abyss_5', name: '封魔渊·禁忌', icon: '🌕', tier: 5, reqLevel: 120,
    desc: '禁忌领域，魔王本尊沉睡',
    monsters: 1, cooldownText: '每日1次', magicCrystalReward: '5000-10000',
    dropRates: { rare: 50, epic: 30, legend: 10 },
    cooldown: 0, sweepTimes: 0, error: ''
  }
])

const collectedFragments = ref([
  { id: 'frag_1', name: '魔剑碎片', icon: '⚔️', rarity: 'epic', count: 3, needed: 5 },
  { id: 'frag_2', name: '魔盾碎片', icon: '🛡️', rarity: 'rare', count: 5, needed: 5 },
  { id: 'frag_3', name: '魔戒碎片', icon: '💍', rarity: 'legend', count: 1, needed: 10 }
])

const shopItems = ref([
  { id: 'shop_1', name: '强化石', icon: '💎', desc: '装备强化材料', price: 100, rarity: 'common' },
  { id: 'shop_2', name: '魔兽精魄', icon: '👹', desc: '用于升级魔器', price: 200, rarity: 'rare' },
  { id: 'shop_3', name: '魔器图纸', icon: '📜', desc: '可制作稀有魔器', price: 500, rarity: 'epic' },
  { id: 'shop_4', name: '魔王之魂', icon: '👑', desc: '传说级制作材料', price: 2000, rarity: 'legend' },
  { id: 'shop_5', name: '封魔令', icon: '📿', desc: '增加一次封魔渊挑战次数', price: 300, rarity: 'rare' },
  { id: 'shop_6', name: '魔晶礼包', icon: '🎁', desc: '内含500魔晶', price: 450, rarity: 'rare' }
])

const myArtifacts = ref([
  { id: 'art_1', name: '魔渊剑', icon: '⚔️', rarity: 'epic', level: 5, equipped: true, attrs: { attack: 500, crit: 15 }, setName: '魔渊套装', setEffect: '2件: 攻击+10%', upgradeCost: 300 },
  { id: 'art_2', name: '魔渊甲', icon: '🛡️', rarity: 'epic', level: 3, equipped: false, attrs: { defense: 400, hp: 2000 }, setName: '魔渊套装', setEffect: '2件: 攻击+10%', upgradeCost: 300 }
])

const artifactCatalog = ref([
  { id: 'cat_1', name: '魔渊剑', icon: '⚔️', rarity: 'epic', unlocked: true },
  { id: 'cat_2', name: '魔渊甲', icon: '🛡️', rarity: 'epic', unlocked: true },
  { id: 'cat_3', name: '魔渊戒', icon: '💍', rarity: 'rare', unlocked: false },
  { id: 'cat_4', name: '魔王冠', icon: '👑', rarity: 'legend', unlocked: false }
])

const API_BASE = '/api/sealedRealm'

async function apiGet(path) {
  try {
    const res = await fetch(`${API_BASE}${path}`)
    return res.json()
  } catch { return { success: false } }
}

async function apiPost(path, body) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    return res.json()
  } catch { return { success: false } }
}

function switchTab(id) {
  activeTab.value = id
  if (id === 'equipment') loadArtifacts()
}

async function loadData() {
  loading.value = true
  loadingText.value = '加载中...'
  try {
    const [crystal, realms] = await Promise.all([
      apiGet('/crystal'),
      apiGet('/realms')
    ])
    if (crystal.success) magicCrystal.value = crystal.amount
    if (realms.success) {
      realms.data?.forEach(r => {
        const idx = sealedRealms.value.findIndex(sr => sr.id === r.id)
        if (idx !== -1) sealedRealms.value[idx] = { ...sealedRealms.value[idx], ...r }
      })
    }
  } finally { loading.value = false }
}

async function loadArtifacts() {
  const data = await apiGet('/artifacts')
  if (data.success) myArtifacts.value = data.artifacts || []
}

async function enterRealm(realm) {
  loading.value = true
  loadingText.value = '进入封魔渊...'
  try {
    const data = await apiPost('/enter', { realmId: realm.id, playerId: 'test_player' })
    if (data.success) {
      const parts = realm.magicCrystalReward.split('-')
      const reward = Math.floor(Math.random() * (parseInt(parts[1]) - parseInt(parts[0])) + parseInt(parts[0]))
      magicCrystal.value += reward
      realm.cooldown = realm.cooldownText === '每日1次' ? 1 : 0
      if (realm.sweepTimes > 0) realm.sweepTimes--
    } else {
      const idx = sealedRealms.value.findIndex(sr => sr.id === realm.id)
      if (idx !== -1) sealedRealms.value[idx].error = data.error || '挑战失败'
    }
  } finally { loading.value = false }
}

async function sweepRealm(realm) {
  if (!realm.sweepTimes) return
  loading.value = true
  loadingText.value = '扫荡中...'
  try {
    const data = await apiPost('/sweep', { realmId: realm.id, playerId: 'test_player' })
    if (data.success) {
      magicCrystal.value += data.reward || 0
      realm.sweepTimes = Math.max(0, realm.sweepTimes - 1)
    }
  } finally { loading.value = false }
}

async function buyItem(item) {
  if (magicCrystal.value < item.price) return
  loading.value = true
  try {
    const data = await apiPost('/buy', { itemId: item.id })
    if (data.success) magicCrystal.value -= item.price
  } finally { loading.value = false }
}

async function composeArtifact(frag) {
  loading.value = true
  try {
    const data = await apiPost('/compose', { fragmentId: frag.id })
    if (data.success) {
      frag.count = 0
      myArtifacts.value.push(data.artifact)
    }
  } finally { loading.value = false }
}

function selectArtifact(artifact) {
  selectedArtifact.value = selectedArtifact.value?.id === artifact.id ? null : artifact
}

async function toggleEquip(artifact) {
  loading.value = true
  try {
    const data = await apiPost('/equip', { artifactId: artifact.id })
    if (data.success) artifact.equipped = data.equipped
  } finally { loading.value = false }
}

async function upgradeArtifact(artifact) {
  if (magicCrystal.value < artifact.upgradeCost) return
  loading.value = true
  try {
    const data = await apiPost('/upgrade', { artifactId: artifact.id })
    if (data.success) {
      magicCrystal.value -= artifact.upgradeCost
      artifact.level++
      artifact.upgradeCost = Math.floor(artifact.upgradeCost * 1.5)
      Object.keys(artifact.attrs).forEach(k => { artifact.attrs[k] = Math.floor(artifact.attrs[k] * 1.1) })
    }
  } finally { loading.value = false }
}

onMounted(() => loadData())
</script>

<style scoped>
.sealed-realm-panel { color: #fff; font-family: 'Microsoft YaHei', sans-serif; }
.realm-tabs { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.realm-tabs button { padding: 8px 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(108,58,210,0.3); color: #aaa; border-radius: 20px; cursor: pointer; font-size: 13px; transition: all 0.2s; }
.realm-tabs button:hover { background: rgba(108,58,210,0.15); color: #fff; }
.realm-tabs button.active { background: linear-gradient(90deg, #6c3ce9, #8b5cf6); color: #fff; border-color: transparent; }
.magic-crystal-bar { display: flex; align-items: center; gap: 8px; background: rgba(108,58,210,0.15); border: 1px solid rgba(108,58,210,0.3); border-radius: 20px; padding: 8px 16px; margin-bottom: 15px; }
.crystal-icon { font-size: 18px; }
.crystal-label { color: #a78bfa; font-size: 13px; }
.crystal-value { color: #c4b5fd; font-weight: bold; font-size: 15px; }
.crystal-help { background: none; border: none; color: #a78bfa; cursor: pointer; font-size: 14px; margin-left: auto; }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.panel-header h3 { margin: 0; color: #c4b5fd; font-size: 18px; }
.tab-content { animation: fadeIn 0.2s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
.realm-intro { display: flex; align-items: center; gap: 12px; background: rgba(108,58,210,0.1); border: 1px solid rgba(108,58,210,0.2); border-radius: 12px; padding: 12px; margin-bottom: 15px; }
.intro-icon { font-size: 32px; }
.intro-title { font-weight: bold; color: #c4b5fd; margin-bottom: 4px; }
.intro-desc { font-size: 12px; color: #888; }
.realm-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
.realm-card { background: rgba(255,255,255,0.05); border-radius: 12px; padding: 15px; border: 1px solid rgba(108,58,210,0.2); transition: transform 0.2s; }
.realm-card:hover { transform: translateY(-2px); border-color: rgba(108,58,210,0.4); }
.realm-card.tier-5 { border-color: rgba(255,107,53,0.5); background: rgba(255,107,53,0.05); }
.realm-card.tier-4 { border-color: rgba(168,85,247,0.4); }
.realm-card.tier-3 { border-color: rgba(77,127,255,0.4); }
.realm-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.realm-icon { font-size: 28px; }
.realm-title { flex: 1; }
.realm-name { font-weight: bold; font-size: 15px; }
.realm-tier { font-size: 11px; padding: 2px 8px; border-radius: 10px; display: inline-block; margin-top: 2px; }
.tier-1 { background: rgba(150,150,150,0.2); color: #aaa; }
.tier-2 { background: rgba(76,175,80,0.2); color: #81c784; }
.tier-3 { background: rgba(77,127,255,0.2); color: #4d7fff; }
.tier-4 { background: rgba(168,85,247,0.2); color: #a855f7; }
.tier-5 { background: rgba(255,107,53,0.2); color: #ff6b35; }
.level-badge { background: rgba(108,58,210,0.2); padding: 2px 8px; border-radius: 10px; font-size: 12px; color: #a78bfa; }
.realm-desc { font-size: 12px; color: #aaa; margin-bottom: 8px; }
.realm-info-row { display: flex; gap: 12px; font-size: 12px; color: #888; margin-bottom: 8px; flex-wrap: wrap; }
.realm-rewards-preview { margin-bottom: 10px; }
.reward-label { font-size: 12px; color: #888; margin-bottom: 4px; }
.reward-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.reward-tag { font-size: 11px; padding: 2px 8px; border-radius: 10px; }
.reward-tag.rare { background: rgba(77,127,255,0.2); color: #4d7fff; }
.reward-tag.epic { background: rgba(168,85,247,0.2); color: #a855f7; }
.reward-tag.legend { background: rgba(255,107,53,0.2); color: #ff6b35; }
.realm-actions { display: flex; gap: 8px; }
.btn-enter { flex: 2; padding: 8px; background: linear-gradient(135deg, #6c3ce9, #8b5cf6); border: none; border-radius: 8px; color: #fff; cursor: pointer; font-weight: bold; font-size: 13px; }
.btn-enter:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-sweep { flex: 1; padding: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(108,58,210,0.3); border-radius: 8px; color: #aaa; cursor: pointer; font-size: 13px; }
.btn-sweep:disabled { opacity: 0.5; cursor: not-allowed; }
.realm-error { margin-top: 8px; padding: 6px; background: rgba(255,77,79,0.1); border: 1px solid rgba(255,77,79,0.3); border-radius: 6px; color: #ff7875; font-size: 12px; text-align: center; }
.fragments-section { margin-top: 20px; }
.fragments-section h4 { color: #c4b5fd; margin-bottom: 10px; font-size: 14px; }
.fragments-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
.fragment-item { background: rgba(255,255,255,0.05); border-radius: 10px; padding: 12px; text-align: center; border: 1px solid rgba(108,58,210,0.2); }
.frag-icon { font-size: 28px; margin-bottom: 4px; }
.frag-name { font-size: 13px; font-weight: bold; margin-bottom: 4px; }
.frag-count { font-size: 11px; color: #888; margin-bottom: 6px; }
.btn-compose { padding: 4px 12px; background: linear-gradient(135deg, #6c3ce9, #8b5cf6); border: none; border-radius: 12px; color: #fff; font-size: 12px; cursor: pointer; }
.shop-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
.shop-item { background: rgba(255,255,255,0.05); border-radius: 12px; padding: 15px; text-align: center; border: 1px solid rgba(108,58,210,0.2); transition: transform 0.2s; }
.shop-item:hover { transform: translateY(-2px); border-color: rgba(108,58,210,0.4); }
.shop-item.rarity-legend { border-color: rgba(255,107,53,0.4); background: rgba(255,107,53,0.05); }
.shop-item.rarity-epic { border-color: rgba(168,85,247,0.3); }
.item-icon { font-size: 32px; margin-bottom: 6px; }
.item-name { font-size: 13px; font-weight: bold; margin-bottom: 4px; }
.item-desc { font-size: 11px; color: #888; margin-bottom: 8px; }
.item-price { display: flex; align-items: center; justify-content: center; gap: 4px; margin-bottom: 8px; }
.price-icon { font-size: 14px; }
.price-value { color: #c4b5fd; font-weight: bold; }
.btn-buy { padding: 6px 20px; background: linear-gradient(135deg, #6c3ce9, #8b5cf6); border: none; border-radius: 12px; color: #fff; font-size: 12px; cursor: pointer; }
.btn-buy:disabled { opacity: 0.5; cursor: not-allowed; }
.equipment-section { margin-bottom: 20px; }
.equipment-section h4 { color: #c4b5fd; margin-bottom: 10px; font-size: 14px; }
.empty-state { text-align: center; padding: 40px; background: rgba(255,255,255,0.03); border-radius: 12px; }
.empty-icon { font-size: 48px; margin-bottom: 10px; }
.empty-state p { margin: 0; color: #888; }
.empty-state .hint { font-size: 12px; margin-top: 8px; }
.equipment-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; }
.equip-card { background: rgba(255,255,255,0.05); border-radius: 10px; padding: 12px; text-align: center; border: 1px solid rgba(108,58,210,0.2); cursor: pointer; transition: all 0.2s; position: relative; }
.equip-card:hover { border-color: rgba(108,58,210,0.5); transform: translateY(-2px); }
.equip-card.equipped { border-color: rgba(0,255,127,0.4); background: rgba(0,255,127,0.05); }
.equip-card.rarity-legend { border-color: rgba(255,107,53,0.4); }
.equip-card.rarity-epic { border-color: rgba(168,85,247,0.4); }
.equip-card.rarity-rare { border-color: rgba(77,127,255,0.4); }
.equip-icon { font-size: 28px; margin-bottom: 4px; }
.equip-name { font-size: 12px; font-weight: bold; margin-bottom: 2px; }
.equip-rarity-tag { font-size: 10px; font-weight: bold; }
.equip-level { font-size: 10px; color: #888; margin-top: 2px; }
.equipped-badge { position: absolute; top: 4px; right: 4px; background: rgba(0,255,127,0.2); color: #00ff7f; font-size: 9px; padding: 1px 4px; border-radius: 4px; }
.artifact-detail { background: rgba(255,255,255,0.05); border-radius: 12px; padding: 15px; margin-bottom: 20px; border: 1px solid rgba(108,58,210,0.2); }
.artifact-detail h4 { margin: 0 0 10px 0; color: #c4b5fd; }
.detail-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.detail-icon { font-size: 36px; }
.detail-name { font-weight: bold; font-size: 16px; }
.detail-rarity { font-size: 12px; }
.detail-attrs { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.attr-row { display: flex; justify-content: space-between; padding: 6px 10px; background: rgba(0,0,0,0.2); border-radius: 6px; font-size: 13px; }
.attr-name { color: #aaa; }
.attr-value { color: #ffd700; font-weight: bold; }
.detail-set { background: rgba(108,58,210,0.1); border-radius: 8px; padding: 10px; margin-bottom: 12px; }
.set-label { color: #a78bfa; font-size: 13px; margin-bottom: 4px; }
.set-effect { font-size: 12px; color: #888; }
.detail-actions { display: flex; gap: 8px; }
.btn-equip { flex: 1; padding: 8px; background: rgba(108,58,210,0.3); border: 1px solid rgba(108,58,210,0.4); border-radius: 8px; color: #c4b5fd; cursor: pointer; font-size: 13px; }
.btn-equip:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-upgrade { flex: 2; padding: 8px; background: linear-gradient(135deg, #6c3ce9, #8b5cf6); border: none; border-radius: 8px; color: #fff; cursor: pointer; font-size: 13px; }
.btn-upgrade:disabled { opacity: 0.5; cursor: not-allowed; }
.catalog-section { margin-top: 20px; }
.catalog-section h4 { color: #c4b5fd; margin-bottom: 10px; font-size: 14px; }
.catalog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px; }
.catalog-item { background: rgba(255,255,255,0.05); border-radius: 10px; padding: 12px; text-align: center; border: 1px solid rgba(108,58,210,0.2); }
.catalog-item.unlocked { border-color: rgba(108,58,210,0.4); }
.catalog-item.rarity-legend.unlocked { border-color: rgba(255,107,53,0.4); }
.catalog-item.rarity-epic.unlocked { border-color: rgba(168,85,247,0.4); }
.catalog-icon { font-size: 24px; margin-bottom: 4px; }
.catalog-name { font-size: 11px; color: #888; }
.catalog-item.unlocked .catalog-name { color: #fff; }
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 1000; display: flex; align-items: center; justify-content: center; }
.modal { background: #1a1a3e; border-radius: 16px; padding: 20px; max-width: 400px; width: 90%; border: 1px solid rgba(108,58,210,0.3); }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.modal-header h3 { margin: 0; color: #c4b5fd; font-size: 16px; }
.modal-close { background: transparent; border: none; color: #888; font-size: 18px; cursor: pointer; }
.modal-body { color: #ddd; }
.modal-body p { color: #aaa; font-size: 13px; line-height: 1.6; }
.modal-body ul { color: #aaa; font-size: 13px; padding-left: 20px; }
.modal-body li { margin-bottom: 6px; }
.loading-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 999; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.loading-spinner { font-size: 36px; animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.loading-text { color: #aaa; margin-top: 10px; font-size: 14px; }