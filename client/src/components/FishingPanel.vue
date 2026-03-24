<template>
  <div class="fishing-panel">
    <div class="panel-header">
      <h2>🎣 悠闲钓鱼</h2>
      <div class="header-stats">
        <span class="stat-item">💠 {{ fishingPoints }} 钓分</span>
        <span class="stat-item">⚡ {{ energy }}/{{ maxEnergy }}</span>
      </div>
      <button class="close-btn" @click="close">×</button>
    </div>

    <div class="fishing-tabs">
      <button v-for="tab in tabs" :key="tab.key" :class="['fishing-tab', { active: activeTab === tab.key }]" @click="activeTab = tab.key">
        {{ tab.icon }} {{ tab.label }}
      </button>
    </div>

    <!-- 钓鱼主界面 -->
    <div class="tab-content" v-if="activeTab === 'fish'">
      <div class="section-title">🌊 选择水域</div>
      <div class="pond-list">
        <div v-for="pond in ponds" :key="pond.id" :class="['pond-card', { selected: selectedPond?.id === pond.id, locked: !pond.unlocked }]" @click="selectPond(pond)">
          <div class="pond-icon">{{ pond.icon }}</div>
          <div class="pond-info">
            <div class="pond-name">
              {{ pond.name }}
              <span v-if="pond.unlocked" class="unlocked-chip">已解锁</span>
              <span v-else class="locked-chip">🔒</span>
            </div>
            <div class="pond-desc">{{ pond.desc }}</div>
            <div class="pond-rarities">
              <span v-for="r in pond.availableRarities" :key="r" :class="['rarity-chip', r]">{{ rarityLabel[r] }}</span>
            </div>
            <div v-if="!pond.unlocked">
              <button class="unlock-btn" :disabled="!canUnlockPond(pond)" @click.stop="unlockPond(pond)">
                解锁 {{ pond.unlockCost }}💠
              </button>
            </div>
          </div>
          <div class="pond-bonus" v-if="pond.unlocked">
            <div class="bonus-label">倍率</div>
            <div class="bonus-num">×{{ pond.pointMultiplier }}</div>
          </div>
        </div>
      </div>

      <!-- 钓鱼场景 -->
      <div class="fishing-area" v-if="selectedPond?.unlocked">
        <div class="section-title">🎯 开始钓鱼</div>
        <div class="fishing-scene">
          <div class="scene-bg">{{ selectedPond.icon }} {{ selectedPond.name }}</div>
          <div class="scene-waves">
            <div class="wave w1"></div><div class="wave w2"></div><div class="wave w3"></div>
          </div>
          <div class="rod-area">
            <div class="fish-rod" :class="{ casting: isCasting, waiting: isWaiting, reeling: isReeling }">🎣</div>
            <div class="line" :class="{ tension: isWaiting }"></div>
            <div class="bobber" :class="{ bobbing: isWaiting, bite: biteDetected }">⚪</div>
          </div>
          <transition name="fish-in">
            <div v-if="fishAppeared && currentFish" class="fish-on-water" @click="reel">
              <div class="approaching">{{ currentFish.icon }}</div>
              <div class="bite-tip" v-if="biteDetected">🐟 点击提竿！</div>
            </div>
          </transition>
          <div class="scene-hint" v-if="!isFishing">选择水域后点击「抛竿」</div>
          <div class="scene-hint casting-hint" v-if="isCasting">抛竿中...</div>
          <div class="scene-hint wait-hint" v-if="isWaiting && !biteDetected">等待中 ⏳</div>
        </div>

        <div class="fishing-controls">
          <div class="ctrl-info">
            <span>体力-{{ selectedPond.energyCost }}</span>
            <span>倍率×{{ selectedPond.pointMultiplier }}</span>
            <span>咬钩{{ Math.round(selectedPond.biteRate*100) }}%</span>
          </div>
          <div class="ctrl-btns">
            <button class="cast-btn" :class="{ active: isCasting || isWaiting }" :disabled="isFishing || !canFish(selectedPond)" @click="castLine">
              {{ isCasting ? '抛竿...' : isWaiting ? '等待...' : isReeling ? '收竿...' : '🎣 抛竿' }}
            </button>
            <button class="reel-btn" :class="{ ready: biteDetected }" :disabled="!biteDetected" @click="reel">
              🪝 提竿！
            </button>
          </div>
          <div class="cooldown-row" v-if="cooldown > 0">
            <div class="cd-track"><div class="cd-fill" :style="{ width: ((maxCooldown-cooldown)/maxCooldown*100)+'%' }"></div></div>
            <span class="cd-text">冷却 {{ cooldown }}s</span>
          </div>
        </div>

        <div class="recent-section" v-if="lastCatch">
          <div class="section-title">📖 最近鱼获</div>
          <div :class="['catch-card', lastCatch.rarity]">
            <div class="catch-icon">{{ lastCatch.icon }}</div>
            <div class="catch-info">
              <div class="catch-name">{{ lastCatch.name }}</div>
              <div :class="['catch-rarity', lastCatch.rarity]">{{ rarityLabel[lastCatch.rarity] }}</div>
              <div class="catch-pts">+{{ lastCatch.points }}💠</div>
            </div>
            <div class="catch-time">{{ lastCatch.caughtAt }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 鱼获图鉴 -->
    <div class="tab-content" v-if="activeTab === 'collection'">
      <div class="section-title">📖 鱼获图鉴 ({{ collectedFish.length }}/{{ allFish.length }})</div>
      <div class="rarity-summary">
        <span v-for="(cnt, r) in collectionByRarity" :key="r" :class="['rarity-chip', r]">{{ rarityLabel[r] }}:{{ cnt }}</span>
      </div>
      <div class="fish-grid">
        <div v-for="fish in allFish" :key="fish.id" :class="['fish-card', fish.rarity, { collected: hasFish(fish.id) }]">
          <div class="fi">{{ hasFish(fish.id) ? fish.icon : '❓' }}</div>
          <div class="fn">{{ hasFish(fish.id) ? fish.name : '???' }}</div>
          <div :class="['ftag', fish.rarity]" v-if="hasFish(fish.id)">{{ rarityLabel[fish.rarity] }}</div>
          <div class="ftag unknown" v-else>未发现</div>
          <div class="fpts" v-if="hasFish(fish.id)">+{{ fish.points }}</div>
        </div>
      </div>
    </div>

    <!-- 积分商店 -->
    <div class="tab-content" v-if="activeTab === 'shop'">
      <div class="section-title">💠 钓鱼积分商店</div>
      <div class="shop-balance">余额: <strong>{{ fishingPoints }}</strong>💠</div>
      <div class="shop-grid">
        <div v-for="item in shopItems" :key="item.id" :class="['shop-item', { owned: item.owned, canbuy: canAfford(item) && !item.owned }]">
          <div class="si">{{ item.icon }}</div>
          <div class="sname">{{ item.name }}</div>
          <div class="sdesc">{{ item.desc }}</div>
          <div class="seffect">{{ item.effectText }}</div>
          <div class="sprice" :class="{ costly: !canAfford(item) && !item.owned }">{{ item.price }}💠</div>
          <button class="buy-btn" :disabled="!canAfford(item) || item.owned" @click="buyItem(item)">
            {{ item.owned ? '已拥有' : canAfford(item) ? '购买' : '不足' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 钓鱼比赛 -->
    <div class="tab-content" v-if="activeTab === 'contest'">
      <div class="section-title">🏆 钓鱼比赛</div>
      <div v-if="!currentContest">
        <div class="next-contest">
          <div class="next-label">下一场</div>
          <div class="next-time">📅 每周六 20:00</div>
          <div class="next-reward">🏆 冠军: 500💠</div>
        </div>
        <div class="sub-title">📜 历史</div>
        <div class="history-list">
          <div class="hist-item" v-for="r in contestHistory" :key="r.id">
            <span>{{ r.date }}</span>
            <span :class="['rbadge', 'r'+r.rank]">第{{ r.rank }}</span>
            <span class="rpts">+{{ r.reward }}</span>
          </div>
        </div>
      </div>
      <div v-if="currentContest">
        <div class="contest-hdr">
          <div class="ctitle">🌊 {{ currentContest.name }}</div>
          <div class="ctimer">⏱️ {{ contestRemaining }}</div>
        </div>
        <div class="cprogress">
          <div class="plabel">进度</div>
          <div class="ptrack"><div class="pfill" :style="{ width: (currentContest.fishCount/currentContest.goal*100)+'%' }"></div></div>
          <div class="ptext">{{ currentContest.fishCount }}/{{ currentContest.goal }}鱼</div>
        </div>
        <div class="crank-section">
          <div class="crlabel">实时排名</div>
          <div class="crlist">
            <div v-for="(e, idx) in currentContest.leaderboard" :key="e.playerId" :class="['cr-entry', { me: e.isMe, top3: idx<3 }]">
              <span class="crnum">{{ idx+1 }}</span>
              <span class="crname">{{ e.name }}</span>
              <span class="crfish">{{ e.fishCount }}鱼</span>
            </div>
          </div>
        </div>
        <button class="join-btn" :disabled="!canJoinContest" @click="joinContest">
          {{ canJoinContest ? '🎣 进入比赛' : '已参赛' }}
        </button>
      </div>
    </div>

    <!-- 钓鱼成就 -->
    <div class="tab-content" v-if="activeTab === 'achievement'">
      <div class="section-title">🎯 钓鱼成就</div>
      <div class="ach-list">
        <div v-for="ach in fishingAchievements" :key="ach.id" :class="['ach-card', { done: ach.completed }]">
          <div class="achi">{{ ach.icon }}</div>
          <div class="ach-info">
            <div class="ach-name">{{ ach.name }}</div>
            <div class="ach-desc">{{ ach.desc }}</div>
            <div class="ach-prog">
              <div class="aptrack"><div class="apfill" :style="{ width: Math.min(100, ach.progress/ach.target*100)+'%' }"></div></div>
              <span class="aptext">{{ ach.progress }}/{{ ach.target }}</span>
            </div>
          </div>
          <div class="ach-rew" v-if="!ach.completed">+{{ ach.reward }}💠</div>
          <div class="ach-done" v-else>✅</div>
        </div>
      </div>
    </div>

    <!-- 提竿成功 -->
    <transition name="pop-in">
      <div v-if="showSuccess" class="success-ov">
        <div class="success-box">
          <div class="sicon">{{ successFish?.icon }}</div>
          <div class="sname">{{ successFish?.name }}</div>
          <div :class="['srarity', successFish?.rarity]">{{ rarityLabel[successFish?.rarity] }}</div>
          <div class="spts">+{{ successFish?.points }}💠</div>
        </div>
      </div>
    </transition>

    <!-- 空竿 -->
    <transition name="pop-in">
      <div v-if="showMiss" class="miss-ov">
        <div class="miss-box">空竿！鱼跑了... 😢</div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'

const emit = defineEmits(['close'])

const energy = ref(42), maxEnergy = ref(50), fishingPoints = ref(1280)
const activeTab = ref('fish'), cooldown = ref(0), maxCooldown = 5
let cooldownTimer = null

const tabs = [
  { key: 'fish', label: '钓鱼', icon: '🎣' },
  { key: 'collection', label: '图鉴', icon: '📖' },
  { key: 'contest', label: '比赛', icon: '🏆' },
  { key: 'shop', label: '商店', icon: '💠' },
  { key: 'achievement', label: '成就', icon: '🎯' },
]

const rarityLabel = { common:'普通', uncommon:'稀有', rare:'珍稀', epic:'史诗', legendary:'传说' }

const ponds = ref([
  { id:'shallow', name:'浅滩', icon:'🏖️', desc:'新手水域', unlocked:true, unlockCost:0, pointMultiplier:1, availableRarities:['common','uncommon'], energyCost:1, biteRate:0.8, rareRate:0.1 },
  { id:'lake', name:'湖泊', icon:'🏞️', desc:'静谧湖泊', unlocked:false, unlockCost:200, pointMultiplier:1.5, availableRarities:['common','uncommon','rare'], energyCost:2, biteRate:0.7, rareRate:0.15 },
  { id:'deep', name:'深海', icon:'🌊', desc:'大鱼出没', unlocked:false, unlockCost:500, pointMultiplier:2, availableRarities:['uncommon','rare','epic'], energyCost:3, biteRate:0.6, rareRate:0.2 },
  { id:'fairy', name:'仙池', icon:'✨', desc:'传奇鱼出没', unlocked:false, unlockCost:1000, pointMultiplier:3, availableRarities:['rare','epic','legendary'], energyCost:5, biteRate:0.5, rareRate:0.25 },
])
const selectedPond = ref(ponds.value[0])

const allFish = [
  { id:1, name:'小鲫鱼', icon:'🐟', rarity:'common', points:5, pond:'shallow' },
  { id:2, name:'草鱼', icon:'🐟', rarity:'common', points:8, pond:'shallow' },
  { id:3, name:'青鱼', icon:'🐟', rarity:'common', points:10, pond:'lake' },
  { id:4, name:'鲤鱼', icon:'🐟', rarity:'common', points:12, pond:'lake' },
  { id:5, name:'鳊鱼', icon:'🐟', rarity:'common', points:8, pond:'shallow' },
  { id:6, name:'金鳙', icon:'🐠', rarity:'uncommon', points:25, pond:'lake' },
  { id:7, name:'锦鲤', icon:'🐠', rarity:'uncommon', points:30, pond:'lake' },
  { id:8, name:'银鲫', icon:'🐠', rarity:'uncommon', points:20, pond:'shallow' },
  { id:9, name:'彩鳜', icon:'🐠', rarity:'uncommon', points:35, pond:'deep' },
  { id:10, name:'龙鳗', icon:'🐡', rarity:'rare', points:80, pond:'deep' },
  { id:11, name:'娃娃鱼', icon:'🐡', rarity:'rare', points:100, pond:'deep' },
  { id:12, name:'金枪鱼', icon:'🐡', rarity:'rare', points:90, pond:'lake' },
  { id:13, name:'海龟', icon:'🦈', rarity:'epic', points:200, pond:'deep' },
  { id:14, name:'鲸鱼', icon:'🦈', rarity:'epic', points:250, pond:'deep' },
  { id:15, name:'海豚', icon:'🦈', rarity:'epic', points:220, pond:'fairy' },
  { id:16, name:'东海龙王', icon:'🐋', rarity:'legendary', points:500, pond:'fairy' },
  { id:17, name:'鲲鹏巨鱼', icon:'🐋', rarity:'legendary', points:800, pond:'fairy' },
  { id:18, name:'龙宫神龟', icon:'🐋', rarity:'legendary', points:600, pond:'fairy' },
]

const collectedFish = ref([1,2,6,7])
const lastCatch = ref(null)

const isCasting = ref(false), isWaiting = ref(false), isReeling = ref(false)
const fishOnHook = ref(false), biteDetected = ref(false), fishAppeared = ref(false)
const currentFish = ref(null)
const showSuccess = ref(false), showMiss = ref(false), successFish = ref(null)
let fishTimer = null, biteTimer = null

const shopItems = ref([
  { id:'bait1', name:'普通鱼饵', icon:'🪤', desc:'提升上钩率', effectText:'+10%咬钩', price:50, owned:false },
  { id:'bait2', name:'高级鱼饵', icon:'🪤', desc:'提升上钩率', effectText:'+25%咬钩', price:150, owned:false },
  { id:'bait3', name:'传说鱼饵', icon:'🪤', desc:'提升上钩率', effectText:'+50%咬钩', price:500, owned:false },
  { id:'rod1', name:'精钢鱼竿', icon:'🎣', desc:'积分增加', effectText:'+20%钓分', price:300, owned:false },
  { id:'exp1', name:'经验加倍符', icon:'💊', desc:'钓鱼经验', effectText:'1h双倍', price:100, owned:false },
  { id:'charm1', name:'魅力鱼饵', icon:'🪤', desc:'稀有概率', effectText:'+10%稀有', price:200, owned:false },
  { id:'stamina1', name:'体力恢复', icon:'⚡', desc:'消耗降低', effectText:'-1体力', price:80, owned:false },
  { id:'luck1', name:'幸运符', icon:'🍀', desc:'传说概率', effectText:'+5%传说', price:800, owned:false },
])

const currentContest = ref(null), contestRemaining = ref('30:00'), canJoinContest = ref(true)
const contestHistory = ref([
  { id:1, date:'03-21', rank:3, reward:200 },
  { id:2, date:'03-14', rank:7, reward:80 },
  { id:3, date:'03-07', rank:1, reward:500 },
])

const fishingAchievements = ref([
  { id:'a1', name:'初出茅庐', icon:'🎣', desc:'累计钓10条', target:10, progress:7, reward:50, completed:false },
  { id:'a2', name:'小有所成', icon:'🐟', desc:'累计钓100条', target:100, progress:43, reward:200, completed:false },
  { id:'a3', name:'钓鱼大师', icon:'🏆', desc:'累计钓1000条', target:1000, progress:143, reward:800, completed:false },
  { id:'a4', name:'稀有猎手', icon:'🐠', desc:'集齐稀有鱼', target:4, progress:2, reward:300, completed:false },
  { id:'a5', name:'珍稀收藏家', icon:'🐡', desc:'集齐珍稀鱼', target:3, progress:1, reward:500, completed:false },
  { id:'a6', name:'深海探险', icon:'🌊', desc:'深海钓1条', target:1, progress:0, reward:200, completed:false },
  { id:'a7', name:'仙池垂钓', icon:'✨', desc:'仙池钓传说', target:1, progress:0, reward:1000, completed:false },
  { id:'a8', name:'积分达人', icon:'💠', desc:'累计5000分', target:5000, progress:1280, reward:300, completed:false },
])

const collectionByRarity = computed(() => {
  const r = {}
  for (const f of allFish) { if (hasFish(f.id)) r[f.rarity] = (r[f.rarity]||0)+1 }
  return r
})

function close() { emit('close') }
function hasFish(id) { return collectedFish.value.includes(id) }
function canFish(p) { return energy.value >= p.energyCost && cooldown.value <= 0 }
function canUnlockPond(p) { return fishingPoints.value >= p.unlockCost }
function canAfford(item) { return fishingPoints.value >= item.price }

function selectPond(p) { if (!p.unlocked) return; selectedPond.value = p }
function unlockPond(p) { if (!canUnlockPond(p)) return; fishingPoints.value -= p.unlockCost; p.unlocked = true; selectedPond.value = p }

function getRandomFish(pond) {
  const av = allFish.filter(f => f.pond === pond.id || pond.availableRarities.includes(f.rarity))
  if (!av.length) return null
  const roll = Math.random()
  let target = 'common'
  if (roll < pond.rareRate*0.5 && pond.availableRarities.includes('legendary')) target = 'legendary'
  else if (roll < pond.rareRate && pond.availableRarities.includes('epic')) target = 'epic'
  else if (roll < pond.rareRate*2 && pond.availableRarities.includes('rare')) target = 'rare'
  else if (roll < pond.rareRate*4 && pond.availableRarities.includes('uncommon')) target = 'uncommon'
  const cand = av.filter(f => f.rarity === target)
  return cand.length ? cand[Math.floor(Math.random()*cand.length)] : av[Math.floor(Math.random()*av.length)]
}

function castLine() {
  if (isCasting.value || isWaiting.value || isReeling.value || !canFish(selectedPond.value)) return
  energy.value -= selectedPond.value.energyCost
  isCasting.value = true; currentFish.value = null; fishAppeared.value = false; biteDetected.value = false; fishOnHook.value = false
  fishTimer = setTimeout(() => {
    isCasting.value = false; isWaiting.value = true; fishOnHook.value = true
    const hasBite = Math.random() < selectedPond.value.biteRate
    if (hasBite) {
      biteTimer = setTimeout(() => {
        isWaiting.value = false; biteDetected.value = true; fishAppeared.value = true
        currentFish.value = getRandomFish(selectedPond.value)
      }, 1000 + Math.random()*3000)
    } else {
      biteTimer = setTimeout(() => { isWaiting.value = false; fishOnHook.value = false; showMissMsg(); startCooldown() }, 2000+Math.random()*3000)
    }
  }, 1500)
}

function reel() {
  if (!biteDetected.value) return
  isReeling.value = true; biteDetected.value = false; clearTimeout(biteTimer)
  setTimeout(() => {
    isReeling.value = false; fishAppeared.value = false; fishOnHook.value = false
    if (currentFish.value) catchFish(currentFish.value)
    startCooldown()
  }, 800)
}

function catchFish(fish) {
  const pts = Math.round(fish.points * selectedPond.value.pointMultiplier)
  fishingPoints.value += pts
  if (!collectedFish.value.includes(fish.id)) collectedFish.value.push(fish.id)
  lastCatch.value = { ...fish, points: pts, caughtAt: new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}) }
  successFish.value = { ...fish, points: pts }
  showSuccess.value = true; setTimeout(() => { showSuccess.value = false }, 2500)
}

function showMissMsg() { showMiss.value = true; setTimeout(() => { showMiss.value = false }, 1500) }

function startCooldown() {
  cooldown.value = maxCooldown
  if (cooldownTimer) clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => { cooldown.value--; if (cooldown.value <= 0) { clearInterval(cooldownTimer); cooldownTimer = null } }, 1000)
}

function buyItem(item) { if (!canAfford(item) || item.owned) return; fishingPoints.value -= item.price; item.owned = true }

function joinContest() {
  // 打开完整的钓鱼比赛面板
  if (window.showFishingCompetitionPanel) {
    window.showFishingCompetitionPanel()
    return
  }
  // Fallback: 原有内嵌比赛逻辑
  if (!currentContest.value) {
    currentContest.value = { name:'春日钓鱼大赛', goal:20, fishCount:0, leaderboard:[
      { playerId:'p1', name:'逍遥子', fishCount:12, isMe:false },
      { playerId:'p2', name:'小鱼儿', fishCount:10, isMe:false },
      { playerId:'me', name:'我', fishCount:8, isMe:true },
      { playerId:'p3', name:'东海王', fishCount:6, isMe:false },
    ]}
    canJoinContest.value = false
    let rem = 1800
    setInterval(() => { rem--; const m=Math.floor(rem/60),s=rem%60; contestRemaining.value=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; if(rem<=0) rem=0 }, 1000)
  }
}

onUnmounted(() => { if(cooldownTimer) clearInterval(cooldownTimer); if(fishTimer) clearTimeout(fishTimer); if(biteTimer) clearTimeout(biteTimer) })
</script>

<style scoped>
.fishing-panel { width:680px; max-height:85vh; overflow-y:auto; background:linear-gradient(160deg,#0c1445 0%,#1a0a30 100%); border-radius:20px; padding:20px; color:#fff; font-family:'Microsoft YaHei',sans-serif; position:relative; scrollbar-width:thin; scrollbar-color:#667eea transparent; }
.fishing-panel::-webkit-scrollbar { width:6px; }
.fishing-panel::-webkit-scrollbar-thumb { background:#667eea; border-radius:3px; }
.panel-header { display:flex; align-items:center; gap:15px; margin-bottom:15px; padding-bottom:15px; border-bottom:1px solid rgba(255,255,255,0.1); }
.panel-header h2 { margin:0; font-size:22px; color:#f093fb; flex:1; }
.header-stats { display:flex; gap:10px; font-size:13px; }
.stat-item { background:rgba(255,255,255,0.08); padding:4px 10px; border-radius:20px; }
.close-btn { background:rgba(255,255,255,0.1); border:none; color:#fff; width:32px; height:32px; border-radius:50%; font-size:18px; cursor:pointer; }
.close-btn:hover { background:rgba(255,100,100,0.3); }
.fishing-tabs { display:flex; gap:6px; margin-bottom:18px; background:rgba(255,255,255,0.05); padding:6px; border-radius:14px; }
.fishing-tab { flex:1; padding:8px; background:transparent; border:none; border-radius:10px; color:rgba(255,255,255,0.6); cursor:pointer; font-size:13px; transition:all 0.2s; }
.fishing-tab.active { background:rgba(102,126,234,0.4); color:#fff; }
.fishing-tab:hover:not(.active) { background:rgba(255,255,255,0.05); }
.section-title { font-size:14px; color:#a78bfa; margin-bottom:10px; margin-top:18px; font-weight:bold; }
.section-title:first-of-type { margin-top:0; }

/* 水域 */
.pond-list { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.pond-card { display:flex; gap:10px; padding:12px; border-radius:14px; background:rgba(255,255,255,0.05); border:2px solid transparent; cursor:pointer; transition:all 0.2s; align-items:flex-start; }
.pond-card:hover:not(.locked) { background:rgba(255,255,255,0.08); }
.pond-card.selected { border-color:#f093fb; background:rgba(240,147,251,0.1); }
.pond-card.locked { opacity:0.55; cursor:default; }
.pond-icon { font-size:30px; flex-shrink:0; }
.pond-info { flex:1; }
.pond-name { font-size:14px; font-weight:bold; margin-bottom:3px; display:flex; align-items:center; gap:5px; }
.unlocked-chip { font-size:10px; background:rgba(52,211,153,0.2); color:#34d399; padding:1px 6px; border-radius:10px; font-weight:normal; }
.pond-desc { font-size:11px; color:rgba(255,255,255,0.5); margin-bottom:5px; }
.pond-rarities { display:flex; gap:4px; flex-wrap:wrap; margin-bottom:5px; }
.rarity-chip { font-size:10px; padding:1px 6px; border-radius:8px; }
.rarity-chip.common { background:rgba(156,163,175,0.2); color:#9ca3af; }
.rarity-chip.uncommon { background:rgba(96,165,250,0.2); color:#60a5fa; }
.rarity-chip.rare { background:rgba(129,140,248,0.2); color:#a78bfa; }
.rarity-chip.epic { background:rgba(240,100,150,0.2); color:#f472b6; }
.rarity-chip.legendary { background:rgba(251,191,36,0.2); color:#fbbf24; }
.unlock-btn { background:linear-gradient(135deg,#667eea,#764ba2); border:none; color:#fff; padding:4px 12px; border-radius:10px; font-size:11px; cursor:pointer; }
.unlock-btn:disabled { opacity:0.4; }
.pond-bonus { text-align:center; }
.bonus-label { font-size:10px; color:rgba(255,255,255,0.4); }
.bonus-num { font-size:18px; color:#fbbf24; font-weight:bold; }

/* 钓鱼场景 */
.fishing-area { margin-top:10px; }
.fishing-scene { height:200px; background:linear-gradient(to bottom,#1e3c72,#0d1b3e); border-radius:16px; position:relative; overflow:hidden; display:flex; align-items:center; justify-content:center; margin-bottom:12px; }
.scene-bg { position:absolute; top:10px; left:15px; font-size:14px; color:rgba(255,255,255,0.4); }
.scene-waves { position:absolute; bottom:0; left:0; right:0; height:60px; display:flex; flex-direction:column; gap:0; }
.wave { height:20px; background:rgba(255,255,255,0.05); border-radius:50% 50% 0 0; }
.rod-area { position:absolute; top:30px; right:60px; display:flex; flex-direction:column; align-items:center; z-index:2; }
.fish-rod { font-size:40px; transition:transform 0.3s; }
.fish-rod.casting { animation:swing 0.8s ease-in-out infinite; }
.fish-rod.waiting { transform:rotate(-15deg); }
.fish-rod.reeling { animation:reelin 0.4s ease-out; }
@keyframes swing { 0%,100%{transform:rotate(-10deg)} 50%{transform:rotate(10deg)} }
@keyframes reelin { 0%{transform:rotate(-15deg) scale(1)} 50%{transform:rotate(5deg) scale(1.1)} 100%{transform:rotate(0) scale(1)} }
.line { width:2px; height:60px; background:rgba(255,255,255,0.3); opacity:0; transition:opacity 0.3s; }
.line.tension { opacity:1; background:rgba(255,255,255,0.6); }
.bobber { width:12px; height:12px; background:#fff; border-radius:50%; margin-top:-2px; opacity:0; transition:opacity 0.3s; }
.bobber.bobbing { opacity:1; animation:bob 1s ease-in-out infinite; }
.bobber.bite { background:#ff6b6b; animation:none; }
@keyframes bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(8px)} }
.scene-hint { position:absolute; bottom:15px; left:50%; transform:translateX(-50%); font-size:12px; color:rgba(255,255,255,0.4); }
.casting-hint { color:#ffd700; }
.wait-hint { color:#60a5fa; }
.fish-on-water { position:absolute; bottom:50px; left:50%; transform:translateX(-50%); text-align:center; cursor:pointer; z-index:3; animation:fishBounce 0.5s ease-out; }
.approaching { font-size:50px; animation:fishWiggle 0.6s ease-in-out infinite; }
.bite-tip { background:rgba(255,107,107,0.9); color:#fff; font-size:12px; padding:4px 10px; border-radius:10px; margin-top:5px; animation:pulse 0.4s infinite; }
@keyframes fishBounce { 0%{transform:translateX(-50%) translateY(20px); opacity:0} 100%{transform:translateX(-50%) translateY(0); opacity:1} }
@keyframes fishWiggle { 0%,100%{transform:rotate(-5deg)} 50%{transform:rotate(5deg)} }
@keyframes pulse { 0%,100%{transform:scale(1

1);} 50%{transform:scale(1.1);} }
.fish-in-enter-active { animation:fishBounce 0.5s ease-out; }
.fish-in-leave-active { animation:fishFade 0.3s ease-in; }
@keyframes fishFade { 0%{opacity:1} 100%{opacity:0} }
.fishing-controls { background:rgba(255,255,255,0.05); border-radius:14px; padding:14px; margin-bottom:12px; }
.ctrl-info { display:flex; gap:15px; font-size:12px; color:rgba(255,255,255,0.6); margin-bottom:10px; }
.ctrl-btns { display:flex; gap:10px; }
.cast-btn { flex:1; padding:10px; background:linear-gradient(135deg,#667eea,#764ba2); border:none; border-radius:12px; color:#fff; font-weight:bold; cursor:pointer; transition:opacity 0.2s; }
.cast-btn:disabled { opacity:0.4; cursor:not-allowed; }
.cast-btn.active { background:linear-gradient(135deg,#9333ea,#c026d3); }
.reel-btn { flex:1; padding:10px; background:linear-gradient(135deg,#f093fb,#f5576c); border:none; border-radius:12px; color:#fff; font-weight:bold; cursor:pointer; }
.reel-btn:disabled { opacity:0.4; cursor:not-allowed; }
.reel-btn.ready { animation:readyPulse 0.5s infinite; }
@keyframes readyPulse { 0%,100%{box-shadow:0 0 0 0 rgba(240,147,251,0.5)} 50%{box-shadow:0 0 0 8px rgba(240,147,251,0)} }
.cooldown-row { display:flex; align-items:center; gap:8px; margin-top:8px; }
.cd-track { flex:1; height:6px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden; }
.cd-fill { height:100%; background:linear-gradient(90deg,#667eea,#764ba2); border-radius:3px; transition:width 1s linear; }
.cd-text { font-size:11px; color:rgba(255,255,255,0.5); min-width:50px; }
.recent-section { margin-top:10px; }
.catch-card { display:flex; align-items:center; gap:12px; padding:12px; background:rgba(255,255,255,0.05); border-radius:12px; border-left:4px solid; }
.catch-card.common { border-color:#9ca3af; }
.catch-card.uncommon { border-color:#60a5fa; }
.catch-card.rare { border-color:#a78bfa; }
.catch-card.epic { border-color:#f472b6; }
.catch-card.legendary { border-color:#fbbf24; }
.catch-icon { font-size:36px; }
.catch-info { flex:1; }
.catch-name { font-size:15px; font-weight:bold; margin-bottom:3px; }
.catch-rarity { font-size:11px; }
.catch-rarity.common { color:#9ca3af; }
.catch-rarity.uncommon { color:#60a5fa; }
.catch-rarity.rare { color:#a78bfa; }
.catch-rarity.epic { color:#f472b6; }
.catch-rarity.legendary { color:#fbbf24; }
.catch-pts { font-size:13px; color:#fbbf24; margin-top:2px; }
.catch-time { font-size:11px; color:rgba(255,255,255,0.4); }
.rarity-summary { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px; }
.fish-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
.fish-card { text-align:center; padding:12px 6px; background:rgba(255,255,255,0.04); border-radius:12px; border:1px solid rgba(255,255,255,0.06); transition:all 0.2s; }
.fish-card.collected { border-color:rgba(255,255,255,0.1); }
.fish-card.common.collected { border-color:rgba(156,163,175,0.3); background:rgba(156,163,175,0.05); }
.fish-card.uncommon.collected { border-color:rgba(96,165,250,0.3); background:rgba(96,165,250,0.05); }
.fish-card.rare.collected { border-color:rgba(129,140,248,0.3); background:rgba(129,140,248,0.05); }
.fish-card.epic.collected { border-color:rgba(240,100,150,0.3); background:rgba(240,100,150,0.05); }
.fish-card.legendary.collected { border-color:rgba(251,191,36,0.3); background:rgba(251,191,36,0.05); }
.fi { font-size:28px; margin-bottom:4px; }
.fn { font-size:11px; color:#fff; margin-bottom:4px; }
.ftag { font-size:9px; padding:1px 5px; border-radius:6px; margin-bottom:2px; display:inline-block; }
.ftag.common { background:rgba(156,163,175,0.2); color:#9ca3af; }
.ftag.uncommon { background:rgba(96,165,250,0.2); color:#60a5fa; }
.ftag.rare { background:rgba(129,140,248,0.2); color:#a78bfa; }
.ftag.epic { background:rgba(240,100,150,0.2); color:#f472b6; }
.ftag.legendary { background:rgba(251,191,36,0.2); color:#fbbf24; }
.ftag.unknown { background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.3); }
.fpts { font-size:10px; color:#fbbf24; }
.shop-balance { background:rgba(255,255,255,0.06); padding:8px 14px; border-radius:10px; font-size:13px; margin-bottom:14px; }
.shop-balance strong { color:#fbbf24; }
.shop-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
.shop-item { padding:12px; background:rgba(255,255,255,0.04); border-radius:12px; text-align:center; border:1px solid rgba(255,255,255,0.06); }
.shop-item.owned { opacity:0.5; }
.shop-item.canbuy { border-color:rgba(102,126,234,0.4); }
.si { font-size:26px; margin-bottom:5px; }
.sname { font-size:12px; font-weight:bold; margin-bottom:3px; }
.sdesc { font-size:10px; color:rgba(255,255,255,0.4); margin-bottom:3px; }
.seffect { font-size:10px; color:#a78bfa; margin-bottom:5px; }
.sprice { font-size:12px; color:#fbbf24; }
.sprice.costly { color:#f87171; }
.buy-btn { width:100%; padding:6px; background:linear-gradient(135deg,#667eea,#764ba2); border:none; border-radius:8px; color:#fff; font-size:11px; cursor:pointer; }
.buy-btn:disabled { opacity:0.4; cursor:not-allowed; }
.next-contest { background:linear-gradient(135deg,rgba(102,126,234,0.2),rgba(118,75,162,0.2)); border-radius:14px; padding:16px; text-align:center; margin-bottom:14px; border:1px solid rgba(102,126,234,0.3); }
.next-label { font-size:11px; color:rgba(255,255,255,0.5); margin-bottom:6px; }
.next-time { font-size:16px; font-weight:bold; margin-bottom:4px; }
.next-reward { font-size:13px; color:#fbbf24; }
.sub-title { font-size:12px; color:rgba(255,255,255,0.5); margin-bottom:8px; }
.history-list { }
.hist-item { display:flex; align-items:center; gap:10px; padding:8px; background:rgba(255,255,255,0.04); border-radius:8px; margin-bottom:5px; font-size:12px; }
.rbadge { padding:2px 8px; border-radius:10px; font-size:11px; }
.rbadge.r1 { background:rgba(251,191,36,0.2); color:#fbbf24; }
.rbadge.r2 { background:rgba(192,192,192,0.2); color:#c0c0c0; }
.rbadge.r3 { background:rgba(205,127,50,0.2); color:#cd7f32; }
.rbadge.r4,.rbadge.r5,.rbadge.r6,.rbadge.r7,.rbadge.r8 { background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.5); }
.rpts { color:#fbbf24; margin-left:auto; }
.contest-hdr { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
.ctitle { font-size:16px; font-weight:bold; }
.ctimer { font-size:14px; color:#ffd700; }
.cprogress { margin-bottom:12px; }
.plabel { font-size:12px; color:rgba(255,255,255,0.6); margin-bottom:5px; }
.ptrack { height:8px; background:rgba(255,255,255,0.1); border-radius:4px; overflow:hidden; margin-bottom:4px; }
.pfill { height:100%; background:linear-gradient(90deg,#34d399,#667eea); border-radius:4px; transition:width 0.5s; }
.ptext { font-size:12px; color:rgba(255,255,255,0.6); text-align:center; }
.crank-section { margin-bottom:12px; }
.crlabel { font-size:12px; color:rgba(255,255,255,0.6); margin-bottom:6px; }
.crlist { }
.cr-entry { display:flex; align-items:center; gap:10px; padding:7px 10px; border-radius:8px; margin-bottom:4px; font-size:12px; }
.cr-entry:nth-child(1) { background:rgba(251,191,36,0.1); }
.cr-entry:nth-child(2) { background:rgba(192,192,192,0.08); }
.cr-entry:nth-child(3) { background:rgba(205,127,50,0.08); }
.cr-entry.mine { background:rgba(102,126,234,0.2); border:1px solid rgba(102,126,234,0.4); }
.cr-entry.top3 .crnum { font-weight:bold; }
.crnum { min-width:20px; color:rgba(255,255,255,0.5); }
.crname { flex:1; }
.crfish { color:#a78bfa; }
.join-btn { width:100%; padding:12px; background:linear-gradient(135deg,#f093fb,#f5576c); border:none; border-radius:12px; color:#fff; font-weight:bold; cursor:pointer; font-size:14px; }
.join-btn:disabled { opacity:0.5; cursor:not-allowed; }
.ach-list { display:flex; flex-direction:column; gap:8px; }
.ach-card { display:flex; align-items:center; gap:12px; padding:12px; background:rgba(255,255,255,0.04); border-radius:12px; }
.ach-card.done { opacity:0.5; }
.achi { font-size:28px; }
.ach-info { flex:1; }
.ach-name { font-size:13px; font-weight:bold; margin-bottom:3px; }
.ach-desc { font-size:11px; color:rgba(255,255,255,0.5); margin-bottom:5px; }
.ach-prog { display:flex; align-items:center; gap:6px; }
.aptrack { flex:1; height:5px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden; }
.apfill { height:100%; background:linear-gradient(90deg,#667eea,#f093fb); border-radius:3px; }
.aptext { font-size:10px; color:rgba(255,255,255,0.5); min-width:50px; }
.ach-rew { font-size:12px; color:#fbbf24; min-width:50px; text-align:right; }
.ach-done { font-size:18px; }
.success-ov { position:absolute; top:0; left:0; right:0; bottom:0; display:flex; align-items:center; justify-content:center; z-index:100; pointer-events:none; }
.miss-ov { position:absolute; top:0; left:0; right:0; bottom:0; display:flex; align-items:center; justify-content:center; z-index:100; pointer-events:none; }
.success-box { background:linear-gradient(135deg,rgba(16,20,60,0.98),rgba(26,10,48,0.98)); border:2px solid #f093fb; border-radius:20px; padding:24px 36px; text-align:center; box-shadow:0 0 40px rgba(240,147,251,0.4); }
.miss-box { background:rgba(16,20,60,0.95); border:1px solid rgba(255,255,255,0.2); border-radius:16px; padding:16px 28px; color:rgba(255,255,255,0.7); font-size:14px; }
.sicon { font-size:56px; margin-bottom:8px; }
.sname { font-size:20px; font-weight:bold; margin-bottom:4px; }
.srarity { font-size:12px; margin-bottom:4px; }
.srarity.common { color:#9ca3af; }
.srarity.uncommon { color:#60a5fa; }
.srarity.rare { color:#a78bfa; }
.srarity.epic { color:#f472b6; }
.srarity.legendary { color:#fbbf24; }
.spts { font-size:16px; color:#fbbf24; }
.pop-in-enter-active { animation:popIn 0.4s ease-out; }
.pop-in-leave-active { animation:popOut 0.3s ease-in; }
@keyframes popIn { 0%{transform:scale(0.5); opacity:0} 70%{transform:scale(1.1)} 100%{transform:scale(1); opacity:1} }
@keyframes popOut { 0%{transform:scale(1); opacity:1} 100%{transform:scale(0.8); opacity:0} }
.tab-content { }
