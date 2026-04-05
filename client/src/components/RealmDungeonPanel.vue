<template>
  <div class="realm-dungeon-panel" :style="bgStyle">
    <div class="panel-header">
      <h2>🏔️ 境界副本</h2>
      <button class="btn-close" @click="$emit('close')">×</button>
    </div>

    <!-- 玩家境界信息 -->
    <div class="player-realm-bar" v-if="playerInfo">
      <span class="realm-badge">{{ playerInfo.realmName || '凡人' }}</span>
      <span class="realm-desc">境界副本试炼</span>
    </div>

    <!-- 境界标签页 -->
    <div class="realm-tabs">
      <button
        v-for="realm in realms"
        :key="realm.id"
        :class="['realm-tab', { active: currentRealm === realm.id, locked: !isRealmUnlocked(realm.id) }]"
        @click="switchRealm(realm.id)"
      >
        <span class="tab-icon">{{ realm.icon }}</span>
        <span class="tab-name">{{ realm.name }}</span>
        <span v-if="!isRealmUnlocked(realm.id)" class="lock-icon">🔒</span>
        <span v-else-if="getRealmProgress(realm.id) === 5" class="complete-icon">✅</span>
      </button>
    </div>

    <!-- 副本内容区 -->
    <div class="dungeon-content" v-if="currentDungeon">
      <div class="dungeon-header">
        <div class="dungeon-title">
          <span class="dungeon-name">{{ currentDungeon.name }}</span>
          <span class="dungeon-boss">👹 {{ currentDungeon.boss }}</span>
        </div>
        <div class="dungeon-progress-info">
          <span>进度: {{ getRealmProgress(currentRealm) }} / {{ currentDungeon.floors }}</span>
          <div class="mini-progress-bar">
            <div class="mini-fill" :style="{ width: (getRealmProgress(currentRealm) / currentDungeon.floors * 100) + '%' }"></div>
          </div>
        </div>
      </div>

      <!-- 楼层列表 -->
      <div class="floor-list">
        <div
          v-for="floor in currentDungeon.floorList"
          :key="floor.floorId"
          :class="['floor-card', floorStatusClass(floor)]"
        >
          <div class="floor-header">
            <span class="floor-num">第 {{ floor.floorId }} 层</span>
            <span v-if="floor.status === 'cleared'" class="floor-cleared">✅ 已通关</span>
            <span v-else-if="floor.status === 'current'" class="floor-current">⚔️ 挑战中</span>
            <span v-else class="floor-locked">🔒 未解锁</span>
          </div>

          <div class="floor-enemy" v-if="floor.enemy">
            <div class="enemy-info">
              <span class="enemy-name">{{ floor.enemy.name }}</span>
              <span class="enemy-type">{{ floor.enemy.type }}</span>
            </div>
            <div class="enemy-stats">
              <span class="stat hp">❤️ {{ floor.enemy.hp }}</span>
              <span class="stat atk">⚔️ {{ floor.enemy.atk }}</span>
            </div>
            <div class="floor-reward" v-if="floor.reward">
              <span class="reward-label">奖励:</span>
              <span class="reward-item" v-for="r in floor.reward" :key="r.type">{{ r.icon }} {{ r.amount }}</span>
            </div>
          </div>

          <!-- 战斗操作 -->
          <div class="floor-action">
            <button
              v-if="floor.status === 'current'"
              class="btn-battle"
              :disabled="battleLoading"
              @click="challengeFloor(floor)"
            >
              <span v-if="battleLoading && battleTarget === floor.floorId" class="battle-loader">⚔️ 战斗中...</span>
              <span v-else>⚔️ 挑战</span>
            </button>
            <button
              v-else-if="floor.status === 'locked'"
              class="btn-locked"
              disabled
            >需要先通关第 {{ floor.floorId - 1 }} 层</button>
            <span v-else class="floor-done-text">已通关</span>
          </div>

          <!-- 战斗动画遮罩 -->
          <div v-if="battleLoading && battleTarget === floor.floorId" class="battle-overlay">
            <div class="battle-effect">
              <div class="player-avatar">🧑</div>
              <div class="battle-sparks">
                <span v-for="n in 5" :key="n" class="spark">✨</span>
              </div>
              <div class="enemy-avatar">{{ floor.enemy?.icon || '👹' }}</div>
            </div>
            <div class="battle-text">战斗结算中...</div>
          </div>
        </div>
      </div>

      <!-- 奖励领取 -->
      <div v-if="allFloorsCleared && !rewardClaimed" class="reward-claim-area">
        <div class="reward-preview">
          <h4>🎁 通关奖励</h4>
          <div class="reward-items">
            <div v-for="item in currentDungeon.rewards" :key="item.type" class="reward-item-card">
              <span class="item-icon">{{ item.icon }}</span>
              <span class="item-name">{{ item.name }}</span>
              <span class="item-count">×{{ item.amount }}</span>
            </div>
          </div>
        </div>
        <button class="btn-claim" @click="claimReward" :disabled="claimLoading">
          <span v-if="claimLoading">领取中...</span>
          <span v-else>🎁 领取全部奖励</span>
        </button>
      </div>

      <div v-if="rewardClaimed" class="reward-claimed">
        <span>✅ 奖励已领取</span>
      </div>
    </div>

    <!-- 锁定状态提示 -->
    <div v-else-if="!isRealmUnlocked(currentRealm)" class="locked-notice">
      <div class="lock-content">
        <span class="lock-icon-big">🔒</span>
        <h3>境界未达到</h3>
        <p>需要达到 <strong>{{ getRealmName(currentRealm) }}</strong> 才能挑战此副本</p>
        <p class="current-realm">你当前的境界: {{ playerInfo?.realmName || '凡人' }}</p>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner">🌀 加载中...</div>
    </div>

    <!-- 战斗结果弹窗 -->
    <div v-if="battleResult" class="battle-result-modal" @click.self="battleResult = null">
      <div class="result-content" :class="battleResult.win ? 'win' : 'lose'">
        <h3>{{ battleResult.win ? '🎉 挑战胜利!' : '💀 挑战失败' }}</h3>
        <div class="result-details">
          <p v-if="battleResult.damage">造成伤害: {{ battleResult.damage }}</p>
          <p v-if="battleResult.rewards && battleResult.win">获得: {{ formatRewards(battleResult.rewards) }}</p>
        </div>
        <button class="btn-result-close" @click="battleResult = null">确定</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
import { usePlayerStore } from '../stores/player'

const API_BASE = '/api'

const REALMS = [
  { id: 1, name: '练气期', icon: '🔥' },
  { id: 2, name: '筑基期', icon: '💎' },
  { id: 3, name: '金丹期', icon: '🌟' },
  { id: 4, name: '元婴期', icon: '🌙' },
  { id: 5, name: '化神期', icon: '☀️' },
]

const REALM_NAME_MAP = {
  '凡人': 0, '练气期': 1, '筑基期': 2, '金丹期': 3, '元婴期': 4,
  '化神期': 5, '炼虚期': 6, '合体期': 7, '大乘期': 8, '渡劫期': 9, '仙人': 10
}

const DUNGEONS = {
  1: { id: 1, name: '练气期试炼', boss: '试炼长老', floors: 5, realmRequired: 1,
    rewards: [
      { type: 'spirit', icon: '💎', name: '灵石', amount: 1000 },
      { type: 'exp', icon: '✨', name: '经验', amount: 500 }
    ]
  },
  2: { id: 2, name: '筑基期挑战', boss: '金丹真人', floors: 5, realmRequired: 2,
    rewards: [
      { type: 'spirit', icon: '💎', name: '灵石', amount: 3000 },
      { type: 'exp', icon: '✨', name: '经验', amount: 1500 }
    ]
  },
  3: { id: 3, name: '金丹期历练', boss: '元婴老怪', floors: 5, realmRequired: 3,
    rewards: [
      { type: 'spirit', icon: '💎', name: '灵石', amount: 8000 },
      { type: 'exp', icon: '✨', name: '经验', amount: 4000 }
    ]
  },
  4: { id: 4, name: '元婴期劫难', boss: '化神大能', floors: 5, realmRequired: 4,
    rewards: [
      { type: 'spirit', icon: '💎', name: '灵石', amount: 20000 },
      { type: 'exp', icon: '✨', name: '经验', amount: 10000 }
    ]
  },
  5: { id: 5, name: '化神期飞升', boss: '大乘尊者', floors: 5, realmRequired: 5,
    rewards: [
      { type: 'spirit', icon: '💎', name: '灵石', amount: 50000 },
      { type: 'exp', icon: '✨', name: '经验', amount: 25000 }
    ]
  },
}

function buildFloorList(dungeonId, progress = {}) {
  const dungeon = DUNGEONS[dungeonId]
  if (!dungeon) return []
  const cleared = progress[`dungeon_${dungeonId}`] || 0
  const floors = []
  for (let i = 1; i <= dungeon.floors; i++) {
    const enemyTypes = ['小妖', '妖兽', '魔修', '散修', '长老']
    const enemyIcons = ['👾', '🐉', '🦇', '🧟', '👹']
    floors.push({
      floorId: i,
      status: i <= cleared ? 'cleared' : i === cleared + 1 ? 'current' : 'locked',
      enemy: {
        name: `第${i}层守护者`,
        type: enemyTypes[(i - 1) % enemyTypes.length],
        icon: enemyIcons[(i - 1) % enemyIcons.length],
        hp: 500 + (dungeonId - 1) * 300 + (i - 1) * 100,
        atk: 50 + (dungeonId - 1) * 40 + (i - 1) * 20,
      },
      reward: [
        { icon: '💎', type: 'spirit', amount: 100 * dungeonId * i },
        { icon: '✨', type: 'exp', amount: 50 * dungeonId * i }
      ]
    })
  }
  return floors
}

export default {
  name: 'RealmDungeonPanel',
  emits: ['close'],
  setup() {
    const playerStore = usePlayerStore()
    const playerInfo = ref(null)
    const currentRealm = ref(1)
    const realms = REALMS
    const loading = ref(false)
    const battleLoading = ref(false)
    const battleTarget = ref(null)
    const claimLoading = ref(false)
    const battleResult = ref(null)

    // 进度数据: dungeonId -> clearedFloorCount
    const progress = reactive({})
    // 各境界副本的楼层列表
    const floorLists = reactive({})
    // 各境界是否已领取奖励
    const claimed = reactive({})

    const bgStyle = {
      backgroundImage: "url('@/assets/images/bg-battle-dungeon.png')",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      position: 'relative'
    }

    const currentDungeon = computed(() => {
      const dungeon = DUNGEONS[currentRealm.value]
      if (!dungeon) return null
      return {
        ...dungeon,
        floorList: floorLists[currentRealm.value] || []
      }
    })

    const allFloorsCleared = computed(() => {
      return getRealmProgress(currentRealm.value) >= 5
    })

    const rewardClaimed = computed(() => {
      return !!claimed[currentRealm.value]
    })

    function getRealmProgress(realmId) {
      return progress[`dungeon_${realmId}`] || 0
    }

    function getPlayerRealmIndex() {
      if (!playerInfo.value?.realm) return 0
      return REALM_NAME_MAP[playerInfo.value.realm] ?? 0
    }

    function isRealmUnlocked(realmId) {
      return getPlayerRealmIndex() >= realmId
    }

    function getRealmName(realmId) {
      const r = REALMS.find(r => r.id === realmId)
      return r ? r.name : '未知'
    }

    function floorStatusClass(floor) {
      if (floor.status === 'cleared') return 'floor-cleared-card'
      if (floor.status === 'current') return 'floor-current-card'
      return 'floor-locked-card'
    }

    async function loadPlayerInfo() {
      try {
        const res = await fetch(`${API_BASE}/player`)
        const data = await res.json()
        playerInfo.value = data.player || data
      } catch {
        // 使用默认值
        playerInfo.value = { realm: '练气期', realmName: '练气期' }
      }
    }

    async function loadStatus() {
      if (!playerInfo.value?.id) return
      try {
        const res = await fetch(`${API_BASE}/realm_dungeon/status/${playerInfo.value.id}`)
        const data = await res.json()
        if (data.progress) {
          Object.assign(progress, data.progress)
        }
        if (data.claimed) {
          Object.assign(claimed, data.claimed)
        }
      } catch {}
      // 初始化所有楼层的floorLists
      REALMS.forEach(r => {
        floorLists[r.id] = buildFloorList(r.id, progress)
      })
    }

    async function loadDungeonList() {
      if (!playerInfo.value?.id) return
      try {
        const res = await fetch(`${API_BASE}/realm_dungeon/list/${playerInfo.value.id}`)
        const data = await res.json()
        if (data.dungeons) {
          data.dungeons.forEach(d => {
            progress[`dungeon_${d.id}`] = d.currentFloor - 1
            floorLists[d.id] = buildFloorList(d.id, progress)
          })
        }
      } catch {}
    }

    function switchRealm(realmId) {
      if (!isRealmUnlocked(realmId)) return
      currentRealm.value = realmId
    }

    async function challengeFloor(floor) {
      if (battleLoading.value || !playerInfo.value?.id) return
      battleLoading.value = true
      battleTarget.value = floor.floorId
      battleResult.value = null

      try {
        const res = await fetch(`${API_BASE}/realm_dungeon/battle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: playerInfo.value.id,
            dungeonId: currentRealm.value,
            floorId: floor.floorId
          })
        })
        const data = await res.json()
        if (data.success || data.win) {
          // 更新进度
          const dungeonProgress = getRealmProgress(currentRealm.value)
          if (floor.floorId > dungeonProgress) {
            progress[`dungeon_${currentRealm.value}`] = floor.floorId
          }
          floorLists[currentRealm.value] = buildFloorList(currentRealm.value, progress)
          battleResult.value = {
            win: data.win ?? true,
            damage: data.damage,
            rewards: data.rewards
          }
        } else {
          battleResult.value = { win: false, damage: data.damage }
        }
      } catch (err) {
        battleResult.value = { win: false }
      } finally {
        battleLoading.value = false
        battleTarget.value = null
      }
    }

    async function claimReward() {
      if (!playerInfo.value?.id || claimLoading.value) return
      claimLoading.value = true
      try {
        const res = await fetch(`${API_BASE}/realm_dungeon/claim`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: playerInfo.value.id,
            dungeonId: currentRealm.value
          })
        })
        const data = await res.json()
        if (data.success) {
          claimed[currentRealm.value] = true
          battleResult.value = {
            win: true,
            rewards: data.rewards || DUNGEONS[currentRealm.value]?.rewards
          }
        }
      } catch {}
      claimLoading.value = false
    }

    function formatRewards(rewards) {
      if (!rewards) return ''
      if (typeof rewards === 'string') return rewards
      return rewards.map(r => `${r.icon || ''}${r.name || r.type}: ${r.amount}`).join(', ')
    }

    onMounted(async () => {
      loading.value = true
      await loadPlayerInfo()
      await loadStatus()
      await loadDungeonList()
      loading.value = false
      // 默认选中最先可达的境界
      const playerRealmIdx = getPlayerRealmIndex()
      for (let i = 5; i >= 1; i--) {
        if (i <= playerRealmIdx) {
          currentRealm.value = i
          break
        }
      }
    })

    return {
      playerInfo,
      currentRealm,
      realms,
      loading,
      battleLoading,
      battleTarget,
      claimLoading,
      battleResult,
      currentDungeon,
      allFloorsCleared,
      rewardClaimed,
      bgStyle,
      isRealmUnlocked,
      getRealmProgress,
      getRealmName,
      floorStatusClass,
      switchRealm,
      challengeFloor,
      claimReward,
      formatRewards,
    }
  }
}
</script>

<style scoped>
.realm-dungeon-panel {
  background: #1a1a2e;
  color: #fff;
  padding: 20px;
  height: 100%;
  overflow-y: auto;
  min-height: 100vh;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.panel-header h2 {
  font-size: 24px;
  color: #ffd700;
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
}
.btn-close {
  background: none;
  border: none;
  color: #fff;
  font-size: 28px;
  cursor: pointer;
  opacity: 0.7;
}
.btn-close:hover { opacity: 1; }

.player-realm-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #16213e, #0f3460);
  border-radius: 8px;
  margin-bottom: 16px;
}
.realm-badge {
  background: linear-gradient(135deg, #667eea, #764ba2);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: bold;
  color: #fff;
}
.realm-desc {
  color: #aaa;
  font-size: 14px;
}

.realm-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.realm-tab {
  flex: 1;
  min-width: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  background: #16213e;
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  color: #aaa;
  position: relative;
  transition: all 0.3s;
}
.realm-tab.active {
  background: #0f3460;
  border-color: #ffd700;
  color: #ffd700;
}
.realm-tab.locked {
  opacity: 0.5;
  cursor: not-allowed;
}
.tab-icon { font-size: 24px; }
.tab-name { font-size: 12px; font-weight: bold; }
.lock-icon, .complete-icon { font-size: 12px; }

.dungeon-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.dungeon-header {
  background: linear-gradient(135deg, #16213e, #0f3460);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.dungeon-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dungeon-name {
  font-size: 18px;
  font-weight: bold;
  color: #ffd700;
}
.dungeon-boss {
  font-size: 13px;
  color: #ff6b6b;
}
.dungeon-progress-info {
  text-align: right;
  font-size: 13px;
  color: #aaa;
}
.mini-progress-bar {
  width: 80px;
  height: 6px;
  background: rgba(255,255,255,0.1);
  border-radius: 3px;
  margin-top: 6px;
}
.mini-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 3px;
  transition: width 0.3s;
}

.floor-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.floor-card {
  background: rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid transparent;
  position: relative;
  overflow: hidden;
  transition: all 0.3s;
}
.floor-current-card {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.05);
}
.floor-cleared-card {
  border-color: #00ff00;
  opacity: 0.7;
}
.floor-locked-card {
  opacity: 0.5;
}

.floor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.floor-num {
  font-size: 16px;
  font-weight: bold;
  color: #e0e0e0;
}
.floor-cleared { color: #00ff00; font-size: 13px; }
.floor-current { color: #ffd700; font-size: 13px; animation: pulse 1.5s infinite; }
.floor-locked { color: #888; font-size: 13px; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.floor-enemy {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}
.enemy-info {
  display: flex;
  align-items: center;
  gap: 8px;
}
.enemy-name {
  font-size: 15px;
  font-weight: bold;
  color: #e0e0e0;
}
.enemy-type {
  font-size: 12px;
  color: #888;
  background: rgba(255,255,255,0.1);
  padding: 2px 8px;
  border-radius: 10px;
}
.enemy-stats {
  display: flex;
  gap: 12px;
}
.stat {
  font-size: 13px;
  color: #aaa;
}
.stat.hp { color: #ff6b6b; }
.stat.atk { color: #ffd700; }

.floor-reward {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.reward-label { font-size: 12px; color: #888; }
.reward-item { font-size: 12px; color: #aaa; }

.floor-action {
  display: flex;
  justify-content: flex-end;
}
.btn-battle {
  padding: 8px 24px;
  background: linear-gradient(135deg, #ff6b6b, #ffd700);
  border: none;
  border-radius: 20px;
  color: #000;
  font-weight: bold;
  cursor: pointer;
  font-size: 14px;
  transition: transform 0.2s, box-shadow 0.2s;
}
.btn-battle:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 0 15px rgba(255, 107, 107, 0.5);
}
.btn-battle:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn-locked {
  padding: 8px 16px;
  background: #333;
  border: none;
  border-radius: 20px;
  color: #888;
  font-size: 12px;
  cursor: not-allowed;
}
.floor-done-text {
  color: #00ff00;
  font-size: 14px;
}

.battle-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  z-index: 10;
}
.battle-effect {
  display: flex;
  align-items: center;
  gap: 20px;
}
.player-avatar, .enemy-avatar {
  font-size: 40px;
  animation: shake 0.3s infinite alternate;
}
.enemy-avatar { animation-delay: 0.15s; }
@keyframes shake {
  from { transform: translateX(-3px); }
  to { transform: translateX(3px); }
}
.battle-sparks {
  display: flex;
  gap: 4px;
}
.spark {
  font-size: 18px;
  animation: sparkle 0.5s infinite alternate;
}
.spark:nth-child(2) { animation-delay: 0.1s; }
.spark:nth-child(3) { animation-delay: 0.2s; }
.spark:nth-child(4) { animation-delay: 0.3s; }
.spark:nth-child(5) { animation-delay: 0.4s; }
@keyframes sparkle {
  from { opacity: 0; transform: scale(0.5); }
  to { opacity: 1; transform: scale(1.2); }
}
.battle-text {
  color: #ffd700;
  font-size: 14px;
}

.reward-claim-area {
  background: linear-gradient(135deg, #16213e, #0f3460);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  border: 2px solid #ffd700;
}
.reward-preview h4 {
  color: #ffd700;
  margin-bottom: 12px;
}
.reward-items {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.reward-item-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: rgba(255,255,255,0.05);
  padding: 10px 16px;
  border-radius: 10px;
}
.item-icon { font-size: 28px; }
.item-name { font-size: 12px; color: #aaa; }
.item-count { font-size: 14px; color: #ffd700; font-weight: bold; }
.btn-claim {
  padding: 12px 36px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  border-radius: 25px;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: transform 0.2s;
}
.btn-claim:hover:not(:disabled) {
  transform: scale(1.05);
}
.btn-claim:disabled { opacity: 0.6; cursor: not-allowed; }
.reward-claimed {
  text-align: center;
  padding: 16px;
  color: #00ff00;
  font-size: 16px;
}

.locked-notice {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}
.lock-content {
  text-align: center;
}
.lock-icon-big { font-size: 60px; display: block; margin-bottom: 20px; }
.lock-content h3 { color: #ffd700; margin-bottom: 12px; }
.lock-content p { color: #aaa; margin-bottom: 8px; }
.current-realm { color: #667eea !important; font-size: 14px; }

.loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
}
.loading-spinner { color: #ffd700; font-size: 18px; }

.battle-result-modal {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.result-content {
  background: #1a1a2e;
  border-radius: 16px;
  padding: 30px;
  text-align: center;
  min-width: 280px;
  border: 2px solid;
}
.result-content.win { border-color: #00ff00; }
.result-content.lose { border-color: #ff6b6b; }
.result-content h3 { font-size: 22px; margin-bottom: 16px; }
.win h3 { color: #00ff00; }
.lose h3 { color: #ff6b6b; }
.result-details { margin-bottom: 20px; }
.result-details p { color: #aaa; margin-bottom: 6px; font-size: 14px; }
.btn-result-close {
  padding: 10px 30px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  border-radius: 20px;
  color: #fff;
  font-weight: bold;
  cursor: pointer;
}

/* 响应式 */
@media (max-width: 480px) {
  .realm-tabs { gap: 6px; }
  .realm-tab { min-width: 60px; padding: 10px 6px; }
  .tab-name { font-size: 11px; }
  .floor-card { padding: 12px; }
  .reward-items { gap: 8px; }
}
</style>
