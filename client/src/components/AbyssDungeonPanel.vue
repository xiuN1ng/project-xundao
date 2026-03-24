<template>
  <div class="abyss-panel" :style="bgStyle">
    <!-- Tab 导航 -->
    <div class="abyss-tabs">
      <button v-for="tab in tabs" :key="tab.id" :class="{ active: activeTab === tab.id }" @click="switchTab(tab.id)">
        {{ tab.icon }} {{ tab.name }}
      </button>
    </div>

    <!-- 副本列表 Tab -->
    <div v-if="activeTab === 'dungeons'" class="tab-content">
      <div class="panel-header">
        <h3>🌀 心魔幻境</h3>
        <div class="spirit-stones-info">💎 灵石: <span class="spirit-count">{{ spiritStones }}</span></div>
      </div>

      <!-- 星空裂缝状态 -->
      <div class="star-rift-banner" v-if="starRiftInfo" @click="openStarRiftModal">
        <div class="rift-icon">🌌</div>
        <div class="rift-info">
          <div class="rift-title">星空裂缝</div>
          <div class="rift-desc">免费入场！今日剩余 {{ starRiftInfo.remainingFree }} / {{ starRiftInfo.freePerDay }} 次</div>
        </div>
        <button class="rift-enter-btn">进入</button>
      </div>

      <!-- 副本卡片列表 -->
      <div class="dungeon-list">
        <div v-for="dungeon in dungeons" :key="dungeon.id" class="dungeon-card" :class="'difficulty-' + dungeon.difficulty">
          <div class="dungeon-header">
            <span class="dungeon-icon">{{ dungeon.icon }}</span>
            <div class="dungeon-title">
              <div class="dungeon-name">{{ dungeon.name }}</div>
              <div class="dungeon-difficulty" :class="'diff-' + dungeon.difficulty">{{ difficultyName[dungeon.difficulty] }}</div>
            </div>
            <div class="dungeon-level-req"><span class="level-badge">境界 {{ dungeon.reqLevel }}</span></div>
          </div>
          <div class="dungeon-desc">{{ dungeon.desc }}</div>
          <div class="dungeon-info-row">
            <span>🪜 {{ dungeon.layers }}层</span>
            <span>💀 {{ dungeon.monstersPerLayer }}只/层</span>
            <span>💎 {{ dungeon.cost.spiritStones }}</span>
          </div>
          <div class="dungeon-progress" v-if="dungeon.currentLayer > 0">
            <div class="progress-label">进度：第 {{ dungeon.currentLayer }} / {{ dungeon.layers }} 层</div>
            <div class="progress-bar"><div class="progress-fill" :style="{ width: (dungeon.currentLayer / dungeon.layers * 100) + '%' }"></div></div>
          </div>
          <div class="dungeon-rewards-preview">
            <div class="reward-label">奖励预览：</div>
            <div class="reward-tags">
              <span class="reward-tag base">普通 {{ dungeon.rewards?.base?.spiritStones }}灵石</span>
              <span class="reward-tag rare">稀有 {{ dungeon.rewards?.rare?.spiritStoneBonus }}灵石</span>
              <span class="reward-tag epic">史诗 {{ dungeon.rewards?.epic?.spiritStoneBonus }}灵石</span>
              <span class="reward-tag legend">传说 装备</span>
            </div>
          </div>
          <div class="dungeon-actions">
            <button class="btn-enter" @click="enterDungeon(dungeon)" :disabled="loading">{{ dungeon.currentLayer > 0 ? '继续' : '入场' }}</button>
            <button class="btn-detail" @click="showDungeonDetail(dungeon)">详情</button>
          </div>
          <div v-if="dungeon.error" class="dungeon-error">{{ dungeon.error }}</div>
        </div>
      </div>
    </div>

    <!-- 战斗中 Tab -->
    <div v-if="activeTab === 'battle'" class="tab-content battle-area">
      <div class="panel-header">
        <h3>⚔️ 深渊战斗中</h3>
        <button class="btn-back" @click="activeTab = 'dungeons'">返回</button>
      </div>
      <div v-if="!currentSession" class="no-session">
        <p>暂无进行中的副本</p>
        <button class="btn-primary" @click="activeTab = 'dungeons'">选择副本</button>
      </div>
      <div v-else class="battle-session">

        <!-- 战斗Arena可视化区域 -->
        <div class="battle-arena" :class="{ 'boss-arena': isBossLayer, 'star-rift-arena': currentSession.isStarRift }">
          <!-- 背景层 -->
          <div class="arena-bg">
            <div class="arena-floor"></div>
            <div class="arena-particles">
              <div v-for="n in 12" :key="n" class="particle" :style="particleStyle(n)"></div>
            </div>
          </div>

          <!-- 玩家区域 -->
          <div class="arena-side player-side" :class="{ attacking: playerAttacking, hit: playerHit }">
            <div class="combatant player">
              <div class="combatant-avatar">🧘</div>
              <div class="combatant-name">修仙者</div>
              <div class="combatant-hp-bar">
                <div class="chp-fill" :style="{ width: (playerBattleHp / playerBattleMaxHp * 100) + '%' }"></div>
                <div class="chp-glow"></div>
              </div>
              <div class="combatant-hp-text">{{ Math.floor(playerBattleHp) }} / {{ playerBattleMaxHp }}</div>
            </div>
          </div>

          <!-- VS 区域 -->
          <div class="arena-center">
            <div class="vs-text" v-if="!allEncountersDefeated">VS</div>
            <div class="layer-badge" v-if="!isBossLayer">第{{ currentSession.currentLayer }}层</div>
            <div class="layer-badge boss-badge" v-else>👹 BOSS</div>
          </div>

          <!-- 怪物区域 -->
          <div class="arena-side monster-side">
            <div v-for="(enc, idx) in currentSession.encounters" :key="enc.demonId"
              class="combatant monster"
              :class="{
                'is-boss': enc.isBoss,
                'defeated': enc.defeated,
                'active-target': currentEncounterIndex === idx && !enc.defeated,
                'attacked': attackedMonsterIdx === idx,
                'hit-shake': attackedMonsterIdx === idx && !enc.defeated
              }">
              <div class="combatant-avatar" :class="{ 'avatar-boss': enc.isBoss }">
                {{ enc.isBoss ? '👹' : '💀' }}
              </div>
              <div class="combatant-name" :style="{ color: enc.demonType.color }">{{ enc.demonType.name }}</div>
              <div class="combatant-hp-bar" :class="{ 'boss-hp': enc.isBoss }">
                <div class="mhp-fill" :class="{ 'boss-hp-fill': enc.isBoss }"
                  :style="{ width: ((enc.currentHp || enc.hp) / enc.hp * 100) + '%' }"></div>
                <div class="chp-glow" v-if="enc.isBoss"></div>
              </div>
              <div class="combatant-hp-text">{{ Math.floor(enc.currentHp || enc.hp) }} / {{ enc.hp }}</div>
            </div>
          </div>

          <!-- 战斗飘字效果 -->
          <TransitionGroup name="float-text" tag="div" class="float-text-container">
            <div v-for="ft in floatTexts" :key="ft.id"
              class="float-text"
              :class="[ft.type, { 'crit-text': ft.isCrit }]"
              :style="{ left: ft.x + 'px', top: ft.y + 'px' }">
              {{ ft.isCrit ? '💥 ' : '' }}{{ ft.isHeal ? '+' : '-' }}{{ ft.value }}
            </div>
          </TransitionGroup>

          <!-- 攻击动画效果 -->
          <div v-if="playerAttacking" class="attack-effect attack-to-monster">
            <div class="slash-line"></div>
            <div class="slash-sparkles">
              <span v-for="n in 5" :key="n" class="sparkle">✦</span>
            </div>
          </div>

          <!-- 怪物反击效果 -->
          <div v-if="monsterRetaliating" class="attack-effect attack-to-player">
            <div class="retaliate-ball"></div>
          </div>

          <!-- 层数切换动画 -->
          <Transition name="layer-transition">
            <div v-if="showLayerTransition" class="layer-transition-overlay">
              <div class="layer-transition-text">{{ transitionText }}</div>
            </div>
          </Transition>

          <!-- 胜利动画 -->
          <Transition name="victory-fade">
            <div v-if="showVictory" class="victory-overlay">
              <div class="victory-content">
                <div class="victory-icon">🏆</div>
                <div class="victory-text">通关成功！</div>
                <div class="victory-sub">即将获得奖励...</div>
              </div>
            </div>
          </Transition>
        </div>

        <!-- 层数指示器 -->
        <div class="layer-indicator">
          <div class="layer-info">
            <span class="current-layer">第 {{ currentSession.currentLayer }} / {{ currentSession.maxLayers }} 层</span>
            <span class="bonus-multiplier" v-if="currentSession.isStarRift">🌌 裂缝+50%</span>
          </div>
          <div class="layer-progress"><div class="layer-fill" :style="{ width: (currentSession.currentLayer / currentSession.maxLayers * 100) + '%' }"></div></div>
          <div class="boss-warning" v-if="isBossLayer">👹 BOSS层：{{ currentDungeon?.boss?.name }}</div>
        </div>

        <!-- 怪物详细列表（折叠） -->
        <div class="encounters-list">
          <div v-for="(encounter, idx) in currentSession.encounters" :key="encounter.demonId"
            class="encounter-card" :class="{ 'is-boss': encounter.isBoss, 'defeated': encounter.defeated, 'active': currentEncounterIndex === idx }"
            @click="selectEncounter(idx)">
            <div class="encounter-header">
              <span class="demon-name" :style="{ color: encounter.demonType.color }">{{ encounter.isBoss ? '👹' : '💀' }} {{ encounter.demonType.name }}</span>
              <span class="layer-tag">第{{ encounter.layer }}层</span>
            </div>
            <div class="encounter-hp-bar">
              <div class="hp-fill" :class="{ 'boss-fill': encounter.isBoss }" :style="{ width: ((encounter.currentHp || encounter.hp) / encounter.hp * 100) + '%' }"></div>
              <span class="hp-text">{{ Math.floor(encounter.currentHp || encounter.hp) }} / {{ encounter.hp }}</span>
            </div>
            <div class="encounter-skill">🎯 {{ encounter.demonType.effect }}</div>
            <div v-if="encounter.defeated" class="defeated-overlay">✓ 已击败</div>
          </div>
        </div>

        <!-- 攻击按钮 -->
        <div class="attack-area" v-if="!allEncountersDefeated">
          <button class="btn-attack" @click="attackCurrent" :disabled="battleLoading || currentEncounterIndex < 0">
            {{ battleLoading ? '⚔️ 战斗中...': '⚔️ 攻击当前心魔' }}
          </button>
          <button class="btn-auto-attack" @click="autoAttack" :disabled="battleLoading">
            {{ autoAttackInterval ? '⏸ 停止自动' : '🔄 自动攻击' }}
          </button>
        </div>
        <!-- 下一层 -->
        <div v-if="allEncountersDefeated && !isBossLayer" class="next-layer-area">
          <button class="btn-next-layer" @click="nextLayer" :disabled="loading">{{ loading ? '进入中...': '➡️ 进入下一层' }}</button>
        </div>
        <!-- 领取奖励 -->
        <div v-if="allEncountersDefeated && isBossLayer" class="claim-area">
          <button class="btn-claim" @click="claimRewards" :disabled="loading">{{ loading ? '领取中...': '🎁 领取奖励' }}</button>
        </div>
        <div class="give-up-area">
          <button class="btn-give-up" @click="giveUp" :disabled="loading">放弃挑战</button>
        </div>
      </div>
    </div>

    <!-- 奖励 Tab -->
    <div v-if="activeTab === 'rewards'" class="tab-content">
      <div class="panel-header"><h3>🎁 深渊奖励</h3></div>
      <div class="drop-rates-section">
        <h4>📊 掉落概率（地狱难度）</h4>
        <div class="drop-rate-table">
          <div class="rate-row"><span class="rate-quality base">普通</span><div class="rate-bar-wrap"><div class="rate-bar base" style="width:60%"></div></div><span class="rate-percent">60%</span></div>
          <div class="rate-row"><span class="rate-quality rare">稀有</span><div class="rate-bar-wrap"><div class="rate-bar rare" style="width:25%"></div></div><span class="rate-percent">25%</span></div>
          <div class="rate-row"><span class="rate-quality epic">史诗</span><div class="rate-bar-wrap"><div class="rate-bar epic" style="width:12%"></div></div><span class="rate-percent">12%</span></div>
          <div class="rate-row"><span class="rate-quality legend">传说</span><div class="rate-bar-wrap"><div class="rate-bar legend" style="width:3%"></div></div><span class="rate-percent">3%</span></div>
        </div>
      </div>
      <div class="equipment-drops-section">
        <h4>⚔️ 深渊装备</h4>
        <div class="equipment-grid">
          <div v-for="equip in configData.equipmentDrops" :key="equip.id" class="equip-card" :class="'rarity-' + equip.rarity">
            <div class="equip-icon">{{ equipIconMap[equip.type] }}</div>
            <div class="equip-name">{{ equip.name }}</div>
            <div class="equip-rarity-tag">{{ rarityName[equip.rarity] }}</div>
          </div>
        </div>
      </div>
      <div class="pieces-section" v-if="collectedPieces.length > 0">
        <h4>🧩 心魔碎片</h4>
        <div class="pieces-list">
          <div v-for="piece in collectedPieces" :key="piece.name + piece.obtainedAt" class="piece-item">
            <span class="piece-color" :style="{ background: piece.color }"></span>{{ piece.name }}
          </div>
        </div>
      </div>
    </div>

    <!-- 排行 Tab -->
    <div v-if="activeTab === 'rankings'" class="tab-content">
      <div class="panel-header"><h3>🏆 深渊排行榜</h3></div>
      <div class="rankings-list">
        <div v-for="rank in rankings" :key="rank.rank" class="rank-item" :class="'rank-' + rank.rank">
          <div class="rank-number">{{ rank.rank <= 3 ? ['🥇','🥈','🥉'][rank.rank-1] : '#'+rank.rank }}</div>
          <div class="rank-info">
            <div class="rank-player">{{ rank.playerId }}</div>
            <div class="rank-detail">{{ rank.bestDungeon }} · {{ rank.victories }}次通关</div>
          </div>
          <div class="rank-stones">💎 {{ rank.totalSpiritStones.toLocaleString() }}</div>
        </div>
      </div>
    </div>

    <!-- 星空裂缝 Modal -->
    <div v-if="showStarRiftModal" class="modal-overlay" @click.self="showStarRiftModal = false">
      <div class="modal star-rift-modal">
        <div class="modal-header"><h3>🌌 星空裂缝</h3><button class="modal-close" @click="showStarRiftModal = false">✕</button></div>
        <div class="modal-body">
          <p class="rift-desc">星空裂缝是深渊副本的快速入场通道，可享受<span class="highlight">伤害+50%</span>加成！</p>
          <div class="rift-uses">今日剩余：{{ starRiftInfo?.remainingFree }} / {{ starRiftInfo?.freePerDay }} 次</div>
          <div class="rift-select">
            <label>选择副本：</label>
            <select v-model="selectedRiftDungeon">
              <option value="">-- 选择副本 --</option>
              <option v-for="d in dungeons" :key="d.id" :value="d.id">{{ d.icon }} {{ d.name }}</option>
            </select>
          </div>
          <button class="btn-star-rift" @click="enterViaStarRift" :disabled="!selectedRiftDungeon || loading">{{ loading ? '开启中...': '🌌 免费进入' }}</button>
        </div>
      </div>
    </div>

    <!-- 奖励弹窗 -->
    <div v-if="showRewardModal" class="modal-overlay" @click.self="closeRewardModal">
      <div class="modal reward-modal" :class="'quality-' + rewardModalData.quality">
        <div class="modal-header"><h3>{{ rewardModalData.qualityName }}奖励</h3></div>
        <div class="modal-body reward-body">
          <div class="quality-big-icon">{{ qualityBigIcon[rewardModalData.quality] }}</div>
          <div class="reward-message">{{ rewardModalData.message }}</div>
          <div class="reward-details" v-if="rewardModalData.rewards">
            <div v-if="rewardModalData.rewards.spiritStones" class="reward-item">💎 {{ rewardModalData.rewards.spiritStones }} 灵石</div>
            <div v-if="rewardModalData.rewards.exp" class="reward-item">✨ {{ rewardModalData.rewards.exp }} 经验</div>
            <div v-if="rewardModalData.rewards.epicEquipment" class="reward-item epic">⚔️ {{ rewardModalData.rewards.epicEquipment.name }}</div>
            <div v-if="rewardModalData.rewards.rareEquipment" class="reward-item rare">🛡️ {{ rewardModalData.rewards.rareEquipment.name }}</div>
          </div>
          <button class="btn-confirm" @click="closeRewardModal">确定</button>
        </div>
      </div>
    </div>

    <!-- Loading 遮罩 -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner">⚔️</div>
      <div class="loading-text">{{ loadingText }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const tabs = [
  { id: 'dungeons', name: '副本', icon: '🌀' },
  { id: 'battle', name: '战斗', icon: '⚔️' },
  { id: 'rewards', name: '奖励', icon: '🎁' },
  { id: 'rankings', name: '排行', icon: '🏆' }
]

const activeTab = ref('dungeons')
const spiritStones = ref(1000)
const playerLevel = ref(30)
const loading = ref(false)
const loadingText = ref('')
const battleLoading = ref(false)
const showStarRiftModal = ref(false)
const showRewardModal = ref(false)
const selectedRiftDungeon = ref('')
const currentEncounterIndex = ref(-1)
const collectedPieces = ref([])
const autoAttackInterval = ref(null)

const dungeons = ref([])
const configData = ref({ dungeons: [], equipmentDrops: [] })
const starRiftInfo = ref(null)
const rankings = ref([])
const currentSession = ref(null)
const rewardModalData = ref({})
const playerBattleHp = ref(1000)
const playerBattleMaxHp = ref(1000)
const playerAttacking = ref(false)
const playerHit = ref(false)
const monsterRetaliating = ref(false)
const attackedMonsterIdx = ref(-1)
const floatTexts = ref([])
const showLayerTransition = ref(false)
const transitionText = ref('')
const showVictory = ref(false)
let floatTextId = 0

const difficultyName = { normal: '普通', hard: '困难', nightmare: '噩梦' }
const rarityName = { base: '普通', rare: '稀有', epic: '史诗', legend: '传说' }
const typeName = { weapon: '武器', armor: '护甲', ring: '戒指', accessory: '饰品' }
const equipIconMap = { weapon: '⚔️', armor: '🛡️', ring: '💍', accessory: '🔮' }
const qualityBigIcon = { base: '📦', rare: '💎', epic: '💜', legend: '👑' }

const bgStyle = {
  background: 'linear-gradient(135deg, rgba(26,10,46,0.95) 0%, rgba(15,15,35,0.9) 50%, rgba(26,10,46,0.95) 100%), url(/assets/bg-abyss-20260322.png) center/cover no-repeat fixed',
  minHeight: '100vh',
  padding: '15px'
}

const currentDungeon = computed(() => {
  if (!currentSession.value) return null
  return configData.value.dungeons?.find(d => d.id === currentSession.value.dungeonId)
})

const isBossLayer = computed(() => {
  return currentSession.value?.currentLayer === currentSession.value?.maxLayers
})

const allEncountersDefeated = computed(() => {
  if (!currentSession.value?.encounters) return false
  return currentSession.value.encounters.every(e => e.defeated)
})

const API_BASE = '/api/abyssDungeon'

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
  if (id === 'rankings') loadRankings()
  if (id === 'rewards') loadStats()
}

async function loadConfig() {
  loading.value = true
  loadingText.value = '加载配置...'
  try {
    const [config, list, rift] = await Promise.all([
      apiGet('/config'),
      apiGet('/list'),
      apiGet('/starRift')
    ])
    if (config.success) configData.value = config
    if (list.success) dungeons.value = list.dungeons.map(d => ({ ...d, error: '' }))
    if (rift.success) starRiftInfo.value = rift
  } finally { loading.value = false }
}

async function loadStats() {
  const data = await apiGet('/stats')
  if (data.success) {
    collectedPieces.value = data.collectedPieces || []
  }
}

async function loadRankings() {
  const data = await apiGet('/rankings')
  if (data.success) rankings.value = data.rankings
}

async function showDungeonDetail(dungeon) {
  const data = await apiGet(`/info/${dungeon.id}`)
  if (data.success) {
    const idx = dungeons.value.findIndex(d => d.id === dungeon.id)
    if (idx !== -1) dungeons.value[idx] = { ...dungeons.value[idx], ...data.dungeon }
  }
}

async function enterDungeon(dungeon) {
  loading.value = true
  loadingText.value = '进入深渊...'
  try {
    const data = await apiPost('/enter', {
      dungeonId: dungeon.id, playerId: 'test_player', playerLevel: playerLevel.value, spiritStones: spiritStones.value
    })
    if (data.success) {
      currentSession.value = data.session
      currentEncounterIndex.value = -1
      // 初始化玩家战斗HP
      playerBattleMaxHp.value = 1000 + playerLevel.value * 50
      playerBattleHp.value = playerBattleMaxHp.value
      // 层数切换动画
      await triggerLayerTransition(data.session.currentLayer)
      activeTab.value = 'battle'
    } else {
      const idx = dungeons.value.findIndex(d => d.id === dungeon.id)
      if (idx !== -1) dungeons.value[idx].error = data.error || '进入失败'
    }
  } finally { loading.value = false }
}

async function attackCurrent() {
  // 找到第一个未击败的遭遇
  const idx = currentSession.value.encounters.findIndex(e => !e.defeated)
  if (idx < 0) return
  await attackEncounter(idx)
}

async function attackEncounter(idx) {
  if (battleLoading.value) return
  stopAutoAttack()
  battleLoading.value = true
  currentEncounterIndex.value = idx
  attackedMonsterIdx.value = idx
  try {
    const encounter = currentSession.value.encounters[idx]
    const data = await apiPost('/battle', {
      sessionId: currentSession.value.sessionId,
      encounterIndex: idx,
      demonId: encounter.demonId,
      playerDamage: 100 + playerLevel.value * 5,
      playerDefense: 50 + playerLevel.value * 2,
      playerHp: playerBattleHp.value
    })
    if (data.success && data.battleResult) {
      const result = data.battleResult
      const newHp = Math.max(0, (encounter.currentHp || encounter.hp) - result.damageDealt)
      currentSession.value.encounters[idx].currentHp = newHp
      if (newHp <= 0 || result.victory) {
        currentSession.value.encounters[idx].defeated = true
      }
      // 玩家攻击动画
      await triggerAttackAnimation()
      // 伤害飘字
      spawnFloatText(result.damageDealt, false, result.crit, idx)
      // 怪物反击
      if (result.damageTaken > 0 && playerBattleHp.value > 0) {
        await delay(600)
        await triggerMonsterRetaliate(result.damageTaken)
        playerBattleHp.value = Math.max(0, playerBattleHp.value - result.damageTaken)
        spawnFloatText(result.damageTaken, false, false, -1, true)
        if (playerBattleHp.value <= 0) {
          await triggerDefeat()
        }
      }
    }
  } finally {
    battleLoading.value = false
    attackedMonsterIdx.value = -1
  }
}

function spawnFloatText(value, isHeal, isCrit, monsterIdx, isToPlayer) {
  const id = ++floatTextId
  let x = isToPlayer ? 80 : 240
  let y = 30 + (monsterIdx % 3) * 55
  floatTexts.value.push({ id, value: Math.floor(value), isHeal, isCrit, x, y, type: isCrit ? 'crit' : (isToPlayer ? 'damage-to-player' : 'damage-to-monster') })
  setTimeout(() => {
    floatTexts.value = floatTexts.value.filter(ft => ft.id !== id)
  }, 1200)
}

async function triggerAttackAnimation() {
  playerAttacking.value = true
  await delay(300)
  playerAttacking.value = false
}

async function triggerMonsterRetaliate(damage) {
  monsterRetaliating.value = true
  playerHit.value = true
  await delay(400)
  monsterRetaliating.value = false
  playerHit.value = false
}

async function triggerLayerTransition(layer) {
  transitionText.value = `第 ${layer} 层`
  showLayerTransition.value = true
  await delay(1500)
  showLayerTransition.value = false
}

async function triggerDefeat() {
  await delay(500)
  activeTab.value = 'dungeons'
  currentSession.value = null
}

function selectEncounter(idx) {
  const enc = currentSession.value.encounters[idx]
  if (!enc.defeated) currentEncounterIndex.value = idx
}

function particleStyle(n) {
  const colors = ['#6c3ce9', '#764ba2', '#f093fb', '#667eea', '#ff6b35']
  return {
    left: Math.random() * 100 + '%',
    animationDelay: (n * 0.4) + 's',
    background: colors[n % colors.length],
    width: (3 + (n % 4)) + 'px',
    height: (3 + (n % 4)) + 'px',
    opacity: 0.3 + (n % 3) * 0.2
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function autoAttack() {
  if (autoAttackInterval.value) {
    stopAutoAttack()
    return
  }
  autoAttackInterval.value = setInterval(async () => {
    const idx = currentSession.value.encounters.findIndex(e => !e.defeated)
    if (idx < 0) { stopAutoAttack(); return }
    await attackEncounter(idx)
    if (allEncountersDefeated.value) stopAutoAttack()
  }, 1500)
}

function stopAutoAttack() {
  if (autoAttackInterval.value) {
    clearInterval(autoAttackInterval.value)
    autoAttackInterval.value = null
  }
}

async function nextLayer() {
  loading.value = true
  loadingText.value = '进入下一层...'
  try {
    const data = await apiPost('/nextLayer', {
      sessionId: currentSession.value.sessionId,
      dungeonId: currentSession.value.dungeonId,
      currentLayer: currentSession.value.currentLayer,
      playerId: 'test_player', playerLevel: playerLevel.value
    })
    if (data.success) {
      currentSession.value.currentLayer = data.layer
      currentSession.value.encounters = data.encounters.map(e => ({ ...e, defeated: false, currentHp: e.hp }))
      currentEncounterIndex.value = -1
      await triggerLayerTransition(data.layer)
    }
  } finally { loading.value = false }
}

async function claimRewards() {
  loading.value = true
  loadingText.value = '领取奖励...'
  try {
    const data = await apiPost('/claim', {
      sessionId: currentSession.value.sessionId,
      dungeonId: currentSession.value.dungeonId,
      playerId: 'test_player', playerLevel: playerLevel.value
    })
    if (data.success) {
      rewardModalData.value = data
      showRewardModal.value = true
      showVictory.value = true
      await delay(2000)
      showVictory.value = false
      currentSession.value = null
      await loadStats()
      await loadConfig()
    }
  } finally { loading.value = false }
}

async function giveUp() {
  if (!currentSession.value) return
  stopAutoAttack()
  loading.value = true
  try {
    await apiPost('/defeat', {
      dungeonId: currentSession.value.dungeonId,
      playerId: 'test_player', defeatLayer: currentSession.value.currentLayer
    })
    currentSession.value = null
    activeTab.value = 'dungeons'
    await loadStats()
    await loadConfig()
  } finally { loading.value = false }
}

function openStarRiftModal() {
  selectedRiftDungeon.value = ''
  showStarRiftModal.value = true
}

function closeRewardModal() {
  showRewardModal.value = false
  activeTab.value = 'dungeons'
}

async function enterViaStarRift() {
  if (!selectedRiftDungeon.value) return
  loading.value = true
  loadingText.value = '开启裂缝...'
  try {
    const data = await apiPost('/starRift/enter', {
      dungeonId: selectedRiftDungeon.value, playerId: 'test_player'
    })
    if (data.success) {
      currentSession.value = data.session
      playerBattleMaxHp.value = 1000 + playerLevel.value * 50
      playerBattleHp.value = playerBattleMaxHp.value
      showStarRiftModal.value = false
      activeTab.value = 'battle'
      currentEncounterIndex.value = -1
      await triggerLayerTransition(data.session.currentLayer)
      await loadConfig()
    }
  } finally { loading.value = false }
}

onMounted(() => loadConfig())
</script>

<style scoped>
.abyss-panel { color: #fff; position: relative; font-family: 'Microsoft YaHei', sans-serif; }
.abyss-tabs { display: flex; gap: 8px; margin-bottom: 15px; flex-wrap: wrap; }
.abyss-tabs button { padding: 8px 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(102,126,234,0.3); color: #aaa; border-radius: 20px; cursor: pointer; font-size: 13px; transition: all 0.2s; }
.abyss-tabs button:hover { background: rgba(102,126,234,0.15); color: #fff; }
.abyss-tabs button.active { background: linear-gradient(90deg, #667eea, #764ba2); color: #fff; border-color: transparent; }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.panel-header h3 { margin: 0; color: #f093fb; font-size: 18px; }
.spirit-count { color: #ffd700; font-weight: bold; }
.tab-content { animation: fadeIn 0.2s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

/* ========== 战斗Arena动画区域 ========== */
.battle-arena {
  position: relative;
  height: 180px;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 10px;
  background: linear-gradient(180deg, rgba(15,10,40,0.9) 0%, rgba(30,15,60,0.85) 100%);
  border: 1px solid rgba(102,126,234,0.3);
  display: flex;
  align-items: center;
}
.battle-arena.boss-arena {
  border-color: rgba(255,107,53,0.6);
  background: linear-gradient(180deg, rgba(40,10,10,0.9) 0%, rgba(60,20,20,0.85) 100%);
  height: 200px;
}
.battle-arena.star-rift-arena {
  border-color: rgba(107,95,255,0.6);
  background: linear-gradient(180deg, rgba(20,10,60,0.9) 0%, rgba(40,20,80,0.85) 100%);
}

/* Arena 背景 */
.arena-bg { position: absolute; inset: 0; pointer-events: none; }
.arena-floor {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50px;
  background: linear-gradient(180deg, transparent 0%, rgba(102,126,234,0.08) 100%);
  border-top: 1px solid rgba(102,126,234,0.15);
}
.arena-particles { position: absolute; inset: 0; }
.particle {
  position: absolute;
  border-radius: 50%;
  animation: float-particle 4s ease-in-out infinite;
}
@keyframes float-particle {
  0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.3; }
  50% { transform: translateY(-20px) translateX(10px); opacity: 0.6; }
}

/* 玩家侧 */
.arena-side { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 10px; }
.player-side { animation: none; }
.player-side.attacking { animation: player-attack-pulse 0.3s ease-out; }
.player-side.hit { animation: player-hit-shake 0.4s ease-out; }
@keyframes player-attack-pulse {
  0% { transform: translateX(0); }
  30% { transform: translateX(30px) scale(1.05); }
  60% { transform: translateX(20px); }
  100% { transform: translateX(0); }
}
@keyframes player-hit-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-5px); }
  80% { transform: translateX(5px); }
}

/* Combatant (玩家/怪物) */
.combatant {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px;
  border-radius: 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(102,126,234,0.2);
  transition: transform 0.2s, border-color 0.2s;
  min-width: 80px;
}
.combatant.active-target {
  border-color: #667eea;
  background: rgba(102,126,234,0.12);
  transform: scale(1.05);
  box-shadow: 0 0 12px rgba(102,126,234,0.3);
}
.combatant.is-boss {
  border-color: rgba(255,107,53,0.5);
  background: rgba(255,107,53,0.06);
  min-width: 100px;
}
.combatant.defeated { opacity: 0.35; filter: grayscale(0.8); transform: scale(0.9); }
.combatant.attacked { animation: monster-hit-shake 0.35s ease-out; }
.combatant.hit-shake { animation: monster-hit-shake 0.35s ease-out; }
@keyframes monster-hit-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(6px) rotate(1deg); }
  40% { transform: translateX(-6px) rotate(-1deg); }
  60% { transform: translateX(4px); }
  80% { transform: translateX(-4px); }
}
.combatant-avatar { font-size: 32px; line-height: 1; }
.avatar-boss { font-size: 40px; animation: boss-breathe 2s ease-in-out infinite; }
@keyframes boss-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
.combatant-name { font-size: 11px; font-weight: bold; color: #fff; text-align: center; }
.combatant-hp-bar {
  width: 70px;
  height: 6px;
  background: rgba(0,0,0,0.4);
  border-radius: 3px;
  overflow: hidden;
  position: relative;
}
.combatant-hp-bar.boss-hp { height: 8px; width: 90px; }
.chp-fill, .mhp-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff4d4f, #ff7875);
  border-radius: 3px;
  transition: width 0.4s ease;
  position: relative;
}
.boss-hp-fill { background: linear-gradient(90deg, #ff6b35, #ffa940); }
.chp-glow { position: absolute; inset: 0; background: linear-gradient(90deg, transparent 60%, rgba(255,255,255,0.15)); }
.combatant-hp-text { font-size: 9px; color: #aaa; }

/* 中央 VS 区域 */
.arena-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 12px;
  position: relative;
  z-index: 2;
}
.vs-text { font-size: 18px; font-weight: bold; color: rgba(240,147,251,0.7); text-shadow: 0 0 10px rgba(240,147,251,0.4); }
.layer-badge {
  font-size: 10px;
  padding: 2px 8px;
  background: rgba(102,126,234,0.2);
  border: 1px solid rgba(102,126,234,0.3);
  border-radius: 10px;
  color: #9fb3ff;
}
.layer-badge.boss-badge {
  background: rgba(255,107,53,0.2);
  border-color: rgba(255,107,53,0.4);
  color: #ff9a76;
  font-size: 11px;
  animation: boss-pulse-badge 1.5s ease-in-out infinite;
}
@keyframes boss-pulse-badge {
  0%, 100% { box-shadow: 0 0 0 rgba(255,107,53,0); }
  50% { box-shadow: 0 0 8px rgba(255,107,53,0.4); }
}

/* 飘字效果 */
.float-text-container { position: absolute; inset: 0; pointer-events: none; z-index: 10; }
.float-text {
  position: absolute;
  font-weight: bold;
  font-size: 16px;
  color: #ff4d4f;
  text-shadow: 0 0 6px rgba(255,77,79,0.8), 0 1px 2px rgba(0,0,0,0.8);
  animation: float-up 1.2s ease-out forwards;
  white-space: nowrap;
}
.float-text.crit-text {
  font-size: 22px;
  color: #ffd700;
  text-shadow: 0 0 10px rgba(255,215,0,0.8), 0 1px 2px rgba(0,0,0,0.8);
}
.float-text.damage-to-player {
  color: #ff7875;
  text-shadow: 0 0 6px rgba(255,120,120,0.8), 0 1px 2px rgba(0,0,0,0.8);
}
@keyframes float-up {
  0% { opacity: 1; transform: translateY(0) scale(1); }
  20% { transform: translateY(-10px) scale(1.1); }
  100% { opacity: 0; transform: translateY(-50px) scale(0.8); }
}
.float-text-enter-active { animation: float-up 1.2s ease-out forwards; }
.float-text-leave-active { display: none; }

/* 攻击动画效果 */
.attack-effect {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 8;
  pointer-events: none;
}
.attack-to-monster { left: 25%; }
.attack-to-player { right: 25%; }
.slash-line {
  width: 60px;
  height: 4px;
  background: linear-gradient(90deg, transparent, #fff, #667eea, transparent);
  border-radius: 2px;
  animation: slash-anim 0.3s ease-out forwards;
  box-shadow: 0 0 10px rgba(102,126,234,0.8);
}
@keyframes slash-anim {
  0% { width: 0; opacity: 1; transform: scaleX(0); }
  50% { width: 60px; opacity: 1; transform: scaleX(1); }
  100% { width: 60px; opacity: 0; transform: scaleX(1); }
}
.slash-sparkles { display: flex; gap: 4px; margin-top: 4px; }
.sparkle {
  font-size: 12px;
  color: #667eea;
  animation: sparkle-pop 0.3s ease-out forwards;
}
@keyframes sparkle-pop {
  0% { opacity: 1; transform: scale(0); }
  50% { opacity: 1; transform: scale(1.3); }
  100% { opacity: 0; transform: scale(0.8) translateY(-8px); }
}
.retaliate-ball {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: radial-gradient(circle, #ff6b35, #ff4d4f);
  box-shadow: 0 0 15px rgba(255,77,79,0.8);
  animation: ball-fly 0.4s ease-out forwards;
}
@keyframes ball-fly {
  0% { opacity: 1; transform: scale(0.5); }
  50% { opacity: 1; transform: scale(1.2); }
  100% { opacity: 0; transform: scale(0.5); }
}

/* 层数切换动画 */
.layer-transition-overlay {
  position: absolute;
  inset: 0;
  background: rgba(10,5,30,0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
  border-radius: 16px;
}
.layer-transition-text {
  font-size: 28px;
  font-weight: bold;
  color: #f093fb;
  text-shadow: 0 0 20px rgba(240,147,251,0.6);
  animation: layer-text-pulse 1.5s ease-in-out;
}
@keyframes layer-text-pulse {
  0% { opacity: 0; transform: scale(0.5); }
  30% { opacity: 1; transform: scale(1.1); }
  70% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(0.9); }
}
.layer-transition-enter-active { animation: layer-fade-in 0.3s ease; }
.layer-transition-leave-active { animation: layer-fade-out 0.5s ease; }
@keyframes layer-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes layer-fade-out { from { opacity: 1; } to { opacity: 0; } }

/* 胜利动画 */
.victory-overlay {
  position: absolute;
  inset: 0;
  background: rgba(10,5,30,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 25;
  border-radius: 16px;
}
.victory-content { text-align: center; }
.victory-icon { font-size: 48px; animation: victory-bounce 0.8s ease-out; }
@keyframes victory-bounce {
  0% { transform: scale(0) rotate(-20deg); opacity: 0; }
  50% { transform: scale(1.3) rotate(10deg); opacity: 1; }
  70% { transform: scale(0.9) rotate(-5deg); }
  100% { transform: scale(1) rotate(0deg); }
}
.victory-text { font-size: 24px; font-weight: bold; color: #ffd700; margin-top: 8px; text-shadow: 0 0 15px rgba(255,215,0,0.6); }
.victory-sub { font-size: 12px; color: #aaa; margin-top: 4px; }
.victory-fade-enter-active { animation: victory-appear 0.5s ease; }
.victory-fade-leave-active { animation: victory-disappear 0.5s ease; }
@keyframes victory-appear { from { opacity: 0; } to { opacity: 1; } }
@keyframes victory-disappear { from { opacity: 1; } to { opacity: 0; } }

/* ========== 原有Battle区域 ========== */

/* Star Rift Banner */
.star-rift-banner { display: flex; align-items: center; gap: 12px; background: linear-gradient(135deg, #1a0a3e, #2d1b69); border: 1px solid #6b5fff; border-radius: 12px; padding: 12px; margin-bottom: 15px; cursor: pointer; transition: transform 0.2s; }
.star-rift-banner:hover { transform: scale(1.01); }
.rift-icon { font-size: 28px; }
.rift-info { flex: 1; }
.rift-title { font-weight: bold; color: #a78bfa; }
.rift-desc { font-size: 12px; color: #aaa; }
.rift-enter-btn { background: linear-gradient(135deg, #667eea, #764ba2); border: none; padding: 8px 16px; border-radius: 20px; color: #fff; cursor: pointer; font-weight: bold; }

/* Dungeon Cards */
.dungeon-list { display: flex; flex-direction: column; gap: 12px; }
.dungeon-card { background: rgba(255,255,255,0.05); border-radius: 12px; padding: 15px; border: 1px solid rgba(102,126,234,0.2); transition: transform 0.2s; }
.dungeon-card:hover { transform: translateY(-2px); border-color: rgba(102,126,234,0.4); }
.dungeon-card.difficulty-nightmare { border-color: rgba(255,107,53,0.5); background: rgba(255,107,53,0.03); }
.dungeon-card.difficulty-hard { border-color: rgba(255,77,79,0.4); background: rgba(255,77,79,0.03); }
.dungeon-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.dungeon-icon { font-size: 24px; }
.dungeon-title { flex: 1; }
.dungeon-name { font-weight: bold; font-size: 15px; }
.dungeon-difficulty { font-size: 11px; padding: 2px 8px; border-radius: 10px; display: inline-block; margin-top: 2px; }
.diff-normal { background: rgba(76,175,80,0.2); color: #81c784; }
.diff-hard { background: rgba(255,77,79,0.2); color: #ff7875; }
.diff-nightmare { background: rgba(255,107,53,0.2); color: #ff9a76; }
.level-badge { background: rgba(102,126,234,0.2); padding: 2px 8px; border-radius: 10px; font-size: 12px; color: #9fb3ff; }
.dungeon-desc { font-size: 12px; color: #aaa; margin-bottom: 8px; }
.dungeon-info-row { display: flex; gap: 12px; font-size: 12px; color: #888; margin-bottom: 8px; flex-wrap: wrap; }
.dungeon-progress { margin-bottom: 8px; }
.progress-label { font-size: 12px; color: #aaa; margin-bottom: 4px; }
.progress-bar { height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); transition: width 0.3s; }
.dungeon-rewards-preview { margin-bottom: 10px; }
.reward-label { font-size: 12px; color: #888; margin-bottom: 4px; }
.reward-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.reward-tag { font-size: 11px; padding: 2px 8px; border-radius: 10px; }
.reward-tag.base { background: rgba(150,150,150,0.2); color: #aaa; }
.reward-tag.rare { background: rgba(77,127,255,0.2); color: #4d7fff; }
.reward-tag.epic { background: rgba(168,85,247,0.2); color: #a855f7; }
.reward-tag.legend { background: rgba(255,107,53,0.2); color: #ff6b35; }
.dungeon-actions { display: flex; gap: 8px; }
.btn-enter { flex: 1; padding: 8px; background: linear-gradient(135deg, #667eea, #764ba2); border: none; border-radius: 8px; color: #fff; cursor: pointer; font-weight: bold; font-size: 13px; }
.btn-enter:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-detail { padding: 8px 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(102,126,234,0.3); border-radius: 8px; color: #aaa; cursor: pointer; font-size: 13px; }
.dungeon-error { margin-top: 8px; padding: 6px; background: rgba(255,77,79,0.1); border: 1px solid rgba(255,77,79,0.3); border-radius: 6px; color: #ff7875; font-size: 12px; text-align: center; }

/* Battle Area */
.battle-session { display: flex; flex-direction: column; gap: 12px; }
.btn-back { background: rgba(255,255,255,0.05); border: 1px solid rgba(102,126,234,0.3); color: #aaa; padding: 6px 14px; border-radius: 15px; cursor: pointer; font-size: 12px; }
.no-session { text-align: center; padding: 40px; color: #888; }
.btn-primary { padding: 10px 24px; background: linear-gradient(135deg, #667eea, #764ba2); border: none; border-radius: 8px; color: #fff; cursor: pointer; font-weight: bold; margin-top: 12px; }
.layer-indicator { background: rgba(255,255,255,0.05); border-radius: 10px; padding: 12px; }
.layer-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.current-layer { font-size: 16px; font-weight: bold; color: #f093fb; }
.bonus-multiplier { background: rgba(107,95,255,0.2); color: #a78bfa; padding: 2px 8px; border-radius: 10px; font-size: 12px; }
.layer-progress { height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; }
.layer-fill { height: 100%; background: linear-gradient(90deg, #f093fb, #667eea); transition: width 0.3s; }
.boss-warning { text-align: center; margin-top: 8px; color: #ff6b35; font-weight: bold; font-size: 14px; }
.encounters-list { display: flex; flex-direction: column; gap: 8px; }
.encounter-card { background: rgba(255,255,255,0.05); border-radius: 10px; padding: 12px; border: 1px solid rgba(102,126,234,0.2); position: relative; cursor: pointer; transition: border-color 0.2s; }
.encounter-card:hover { border-color: rgba(102,126,234,0.5); }
.encounter-card.active { border-color: #667eea; background: rgba(102,126,234,0.08); }
.encounter-card.is-boss { border-color: rgba(255,107,53,0.5); background: rgba(255,107,53,0.05); }
.encounter-card.defeated { opacity: 0.4; cursor: default; }
.encounter-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.demon-name { font-weight: bold; }
.layer-tag { font-size: 11px; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 8px; color: #aaa; }
.encounter-hp-bar { height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; position: relative; margin-bottom: 4px; }
.hp-fill { height: 100%; background: linear-gradient(90deg, #ff4d4f, #ff7875); transition: width 0.3s; }
.hp-fill.boss-fill { background: linear-gradient(90deg, #ff6b35, #ffa940); }
.hp-text { font-size: 10px; color: #aaa; position: absolute; right: 4px; top: -1px; }
.encounter-skill { font-size: 11px; color: #888; }
.defeated-overlay { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #4caf50; font-size: 18px; font-weight: bold; }
.battle-loading { text-align: center; color: #f093fb; font-size: 12px; margin-top: 4px; animation: pulse 1s infinite; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
.attack-area { display: flex; gap: 8px; margin-top: 4px; }
.btn-attack { flex: 2; padding: 10px; background: linear-gradient(135deg, #667eea, #764ba2); border: none; border-radius: 8px; color: #fff; cursor: pointer; font-weight: bold; font-size: 14px; }
.btn-attack:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-auto-attack { flex: 1; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(102,126,234,0.3); border-radius: 8px; color: #aaa; cursor: pointer; font-size: 14px; }
.btn-auto-attack:disabled { opacity: 0.5; cursor: not-allowed; }
.next-layer-area, .claim-area { text-align: center; margin-top: 8px; }
.btn-next-layer, .btn-claim { width: 100%; padding: 12px; border: none; border-radius: 10px; font-size: 16px; font-weight: bold; cursor: pointer; }
.btn-next-layer { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; }
.btn-claim { background: linear-gradient(135deg, #ff6b35, #ffa940); color: #fff; }
.give-up-area { text-align: center; margin-top: 8px; }
.btn-give-up { padding: 6px 16px; background: transparent; border: 1px solid rgba(255,77,79,0.3); border-radius: 6px; color: #ff7875; cursor: pointer; font-size: 12px; }
.btn-give-up:disabled { opacity: 0.5; cursor: not-allowed; }

/* Rewards Tab */
.drop-rates-section, .equipment-drops-section, .pieces-section { margin-bottom: 20px; }
.drop-rates-section h4, .equipment-drops-section h4, .pieces-section h4 { color: #f093fb; margin-bottom: 10px; font-size: 14px; }
.drop-rate-table { display: flex; flex-direction: column; gap: 6px; }
.rate-row { display: flex; align-items: center; gap: 8px; }
.rate-quality { width: 45px; font-size: 12px; font-weight: bold; }
.rate-quality.base { color: #aaa; }
.rate-quality.rare { color: #4d7fff; }
.rate-quality.epic { color: #a855f7; }
.rate-quality.legend { color: #ff6b35; }
.rate-bar-wrap { flex: 1; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; }
.rate-bar { height: 100%; border-radius: 4px; }
.rate-bar.base { background: #aaa; }
.rate-bar.rare { background: #4d7fff; }
.rate-bar.epic { background: #a855f7; }
.rate-bar.legend { background: linear-gradient(90deg, #ff6b35, #ffa940); }
.rate-percent { width: 35px; font-size: 11px; color: #888; text-align: right; }
.equipment-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
.equip-card { background: rgba(255,255,255,0.05); border-radius: 10px; padding: 12px; text-align: center; border: 1px solid; }
.equip-card.rarity-rare { border-color: rgba(77,127,255,0.4); }
.equip-card.rarity-epic { border-color: rgba(168,85,247,0.4); }
.equip-card.rarity-legend { border-color: rgba(255,107,53,0.5); background: rgba(255,107,53,0.05); }
.equip-icon { font-size: 24px; margin-bottom: 4px; }
.equip-name { font-size: 12px; font-weight: bold; color: #fff; margin-bottom: 4px; }
.equip-rarity-tag { font-size: 10px; padding: 2px 6px; border-radius: 8px; display: inline-block; }
.rarity-rare .equip-rarity-tag { background: rgba(77,127,255,0.2); color: #4d7fff; }
.rarity-epic .equip-rarity-tag { background: rgba(168,85,247,0.2); color: #a855f7; }
.rarity-legend .equip-rarity-tag { background: rgba(255,107,53,0.2); color: #ff6b35; }
.pieces-list { display: flex; flex-wrap: wrap; gap: 6px; }
.piece-item { display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.05); padding: 6px 12px; border-radius: 20px; font-size: 12px; }
.piece-color { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }

/* Rankings */
.rankings-list { display: flex; flex-direction: column; gap: 8px; }
.rank-item { display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.05); border-radius: 10px; padding: 12px; }
.rank-item.rank-1 { background: rgba(255,215,0,0.08); border: 1px solid rgba(255,215,0,0.3); }
.rank-item.rank-2 { background: rgba(192,192,192,0.05); border: 1px solid rgba(192,192,192,0.3); }
.rank-item.rank-3 { background: rgba(205,127,50,0.05); border: 1px solid rgba(205,127,50,0.3); }
.rank-number { font-size: 20px; width: 40px; text-align: center; }
.rank-info { flex: 1; }
.rank-player { font-weight: bold; font-size: 14px; }
.rank-detail { font-size: 11px; color: #888; margin-top: 2px; }
.rank-stones { font-size: 13px; color: #ffd700; font-weight: bold; }

/* Modal */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 1000; display: flex; align-items: center; justify-content: center; }
.modal { background: #1a1a3e; border-radius: 16px; padding: 20px; max-width: 400px; width: 90%; border: 1px solid rgba(102,126,234,0.3); }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.modal-header h3 { margin: 0; color: #f093fb; font-size: 16px; }
.modal-close { background: transparent; border: none; color: #888; font-size: 18px; cursor: pointer; }
.modal-body { color: #ddd; }
.rift-desc { color: #aaa; font-size: 13px; margin-bottom: 10px; }
.rift-desc .highlight { color: #a78bfa; font-weight: bold; }
.rift-uses { font-size: 14px; color: #ffd700; margin-bottom: 12px; }
.rift-select { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.rift-select label { font-size: 13px; color: #aaa; }
.rift-select select { padding: 8px; border-radius: 8px; border: 1px solid rgba(102,126,234,0.3); background: rgba(255,255,255,0.05); color: #fff; font-size: 14px; }
.btn-star-rift { width: 100%; padding: 12px; background: linear-gradient(135deg, #667eea, #764ba2); border: none; border-radius: 10px; color: #fff; font-size: 15px; font-weight: bold; cursor: pointer; }
.btn-star-rift:disabled { opacity: 0.5; cursor: not-allowed; }
.reward-modal.quality-legend { border-color: rgba(255,107,53,0.5); }
.reward-modal.quality-epic { border-color: rgba(168,85,247,0.4); }
.reward-body { text-align: center; }
.quality-big-icon { font-size: 48px; margin-bottom: 10px; }
.reward-message { font-size: 14px; color: #fff; margin-bottom: 12px; line-height: 1.5; }
.reward-details { display: flex; flex-direction: column; gap: 6px; margin-bottom: 15px; }
.reward-item { padding: 8px; background: rgba(255,255,255,0.05); border-radius: 8px; font-size: 14px; }
.reward-item.epic { color: #a855f7; }
.reward-item.rare { color: #4d7fff; }
.btn-confirm { width: 100%; padding: 10px; background: linear-gradient(135deg, #667eea, #764ba2); border: none; border-radius: 8px; color: #fff; font-weight: bold; cursor: pointer; font-size: 14px; }

/* Loading */
.loading-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 999; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.loading-spinner { font-size: 36px; animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.loading-text { color: #aaa; margin-top: 10px; font-size: 14px; }
</style>
