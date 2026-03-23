<template>
  <div class="mount-panel">
    <h2>🦄 坐骑系统</h2>

    <!-- 当前激活坐骑展示 -->
    <div class="mount-stage" v-if="activeMount">
      <div class="stage-glow" :style="{ background: qualityColor }"></div>
      <div class="mount-display" :class="activeMount.quality">
        <span class="mount-emoji">{{ activeMount.icon }}</span>
      </div>
      <div class="mount-name">{{ activeMount.icon }} {{ activeMount.name }}</div>
      <div class="mount-quality-badge" :class="activeMount.quality">{{ qualityName }}</div>
      <div class="mount-speed">
        <span class="speed-icon">⚡</span>
        <span>速度 +{{ activeMount.speed }}</span>
      </div>
      <!-- 属性条 -->
      <div class="stats-row" v-if="activeMount.stats">
        <div class="stat-item">
          <span class="stat-label">攻击</span>
          <span class="stat-val">{{ activeMount.stats.attack }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">生命</span>
          <span class="stat-val">{{ activeMount.stats.hp }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">防御</span>
          <span class="stat-val">{{ activeMount.stats.defense }}</span>
        </div>
      </div>
    </div>

    <!-- Tab 导航 -->
    <div class="tab-nav">
      <button class="tab-btn" :class="{ active: activeTab === 'list' }" @click="activeTab = 'list'">
        🐎 骑宠列表
      </button>
      <button class="tab-btn" :class="{ active: activeTab === 'detail' }" @click="switchToDetail">
        📋 骑宠详情
      </button>
      <button class="tab-btn" :class="{ active: activeTab === 'shop' }" @click="loadMarket">
        🏪 坐骑商店
      </button>
      <button class="tab-btn" :class="{ active: activeTab === 'skills' }" @click="switchToSkills">
        ✨ 骑宠技能
      </button>
    </div>

    <!-- Tab: 骑宠列表 -->
    <div class="tab-content" v-if="activeTab === 'list'">
      <div class="mount-grid">
        <div
          v-for="mount in mounts"
          :key="mount.mountedId"
          class="mount-card"
          :class="{ active: selectedMount?.mountedId === mount.mountedId, owned: true, [mount.quality]: true }"
          @click="selectMount(mount)"
        >
          <div class="card-glow" :style="{ background: getQualityColor(mount.quality) }"></div>
          <div class="mount-card-icon" :class="mount.quality">{{ mount.icon }}</div>
          <div class="mount-card-info">
            <span class="mount-card-name">{{ mount.name }}</span>
            <span class="mount-card-level">Lv.{{ mount.level }}</span>
          </div>
          <div class="mount-card-speed">⚡+{{ mount.speed }}</div>
          <div class="active-indicator" v-if="activeMountId === mount.mountedId">✅</div>
          <div class="quality-border" :class="mount.quality"></div>
        </div>
      </div>

      <!-- 选中坐骑操作 -->
      <div class="mount-actions" v-if="selectedMount">
        <button class="action-btn activate" @click="doActivate" :disabled="activeMountId === selectedMount.mountedId">
          <span>{{ activeMountId === selectedMount.mountedId ? '已激活' : '🚀 激活骑行' }}</span>
        </button>
        <button class="action-btn feed" @click="doFeed('normal')">
          <span>🍖 普通喂养 (+100exp)</span>
        </button>
        <button class="action-btn feed-premium" @click="doFeed('premium')">
          <span>🌟 高级喂养 (+500exp)</span>
        </button>
      </div>
    </div>

    <!-- Tab: 骑宠详情 -->
    <div class="tab-content" v-if="activeTab === 'detail'">
      <div v-if="selectedMount" class="detail-panel">
        <div class="detail-header">
          <div class="detail-icon" :class="selectedMount.quality">{{ selectedMount.icon }}</div>
          <div class="detail-title">
            <h3>{{ selectedMount.name }}</h3>
            <div class="detail-quality" :class="selectedMount.quality">{{ qualityName }}</div>
          </div>
        </div>

        <!-- 等级进度 -->
        <div class="level-progress">
          <div class="level-label">等级 Lv.{{ selectedMount.level }} / 15</div>
          <div class="exp-bar">
            <div class="exp-fill" :style="{ width: expPercent + '%' }"></div>
          </div>
          <div class="exp-text">{{ selectedMount.exp || 0 }} / {{ expNeeded }} 经验</div>
        </div>

        <!-- 属性 -->
        <div class="detail-stats" v-if="selectedMount.stats">
          <div class="stats-title">📊 基础属性</div>
          <div class="stats-grid">
            <div class="stat-box" v-for="(val, key) in selectedMount.stats" :key="key">
              <span class="stat-key">{{ statName(key) }}</span>
              <span class="stat-value">{{ val }}</span>
              <span class="stat-growth" v-if="selectedMount.growth">+{{ selectedMount.growth[key] }}/级</span>
            </div>
          </div>
        </div>

        <!-- 速度 -->
        <div class="speed-info">
          <span class="speed-label">⚡ 骑行速度</span>
          <span class="speed-value">+{{ selectedMount.speed }}</span>
          <span class="speed-desc">当前移动速度加成</span>
        </div>

        <!-- 喂养操作 -->
        <div class="feed-section">
          <div class="feed-title">🍖 喂养培养</div>
          <div class="feed-options">
            <button class="feed-btn normal" @click="doFeed('normal')">
              <span class="feed-cost">💰 50灵石</span>
              <span class="feed-exp">+100 经验</span>
            </button>
            <button class="feed-btn premium" @click="doFeed('premium')">
              <span class="feed-cost">💰 200灵石</span>
              <span class="feed-exp">+500 经验</span>
            </button>
          </div>
          <div class="feed-note">* 喂养可使坐骑升级，提升属性</div>
        </div>
      </div>
      <div v-else class="empty-state">
        <p>请先在【骑宠列表】选择一个坐骑查看详情</p>
      </div>
    </div>

    <!-- Tab: 坐骑商店 -->
    <div class="tab-content" v-if="activeTab === 'shop'">
      <div class="shop-header">
        <div class="spirit-stones-balance">
          💎 我的灵石: <strong>{{ spiritStones.toLocaleString() }}</strong>
        </div>
      </div>

      <div class="market-grid" v-if="marketMounts.length">
        <div
          v-for="m in marketMounts"
          :key="m.id"
          class="market-card"
          :class="m.quality"
        >
          <div class="market-icon" :class="m.quality">{{ m.icon }}</div>
          <div class="market-info">
            <span class="market-name">{{ m.name }}</span>
            <span class="market-quality" :class="m.quality">{{ m.quality === 'white' ? '普通' : qualityNameMap[m.quality] || m.quality }}</span>
            <span class="market-speed">⚡+{{ m.speed }}</span>
            <span class="market-level">需要 Lv.{{ m.unlock_level }}</span>
          </div>
          <div class="market-skills">
            <span v-for="s in m.skills.slice(0,2)" :key="s" class="skill-tag">{{ s }}</span>
          </div>
          <button
            class="buy-btn"
            :class="m.quality"
            @click="doBuy(m)"
            :disabled="spiritStones < m.price"
          >
            💰 {{ m.price.toLocaleString() }}
          </button>
        </div>
      </div>
      <div v-else class="empty-state">
        <p>🎉 已拥有所有可购买坐骑！</p>
      </div>
    </div>

    <!-- Tab: 骑宠技能 -->
    <div class="tab-content" v-if="activeTab === 'skills'">
      <div v-if="selectedMount" class="skills-panel">
        <div class="skills-header">
          <span class="skills-mount-icon">{{ selectedMount.icon }}</span>
          <span class="skills-mount-name">{{ selectedMount.name }} 的技能</span>
        </div>
        <div class="skills-list">
          <div
            v-for="skill in selectedMount.skills"
            :key="skill"
            class="skill-card"
          >
            <div class="skill-icon">{{ skillIcons[skill] || '✨' }}</div>
            <div class="skill-info">
              <span class="skill-name">{{ skill }}</span>
              <span class="skill-desc">{{ skillDescs[skill] || '神秘力量' }}</span>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <p>请先在【骑宠列表】选择一个坐骑查看技能</p>
      </div>
    </div>

    <!-- 消息提示 -->
    <transition name="fade">
      <div class="toast" v-if="toast.show" :class="toast.type">
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { mountApi } from '../api'

const PLAYER_ID = 1
const activeTab = ref('list')
const mounts = ref([])
const activeMountId = ref(1)
const selectedMount = ref(null)
const marketMounts = ref([])
const spiritStones = ref(0)
const toast = ref({ show: false, message: '', type: 'info' })

const activeMount = computed(() => mounts.value.find(m => m.mountedId === activeMountId.value))

const qualityNameMap = {
  white: '普通', green: '优秀', blue: '稀有',
  purple: '史诗', orange: '传说', red: '神话', gold: '至宝', limit: '限定'
}

const qualityColors = {
  white: '#b0b0b0', green: '#50c878', blue: '#4169e1',
  purple: '#9370db', orange: '#ff8c00', red: '#dc143c', gold: '#ffd700', limit: '#ff69b4'
}

const qualityName = computed(() => {
  if (!selectedMount.value && !activeMount.value) return ''
  const q = selectedMount.value?.quality || activeMount.value?.quality
  return qualityNameMap[q] || q
})

const qualityColor = computed(() => {
  const q = selectedMount.value?.quality || activeMount.value?.quality
  return qualityColors[q] || '#b0b0b0'
})

const expNeeded = computed(() => {
  const lvl = selectedMount.value?.level || 1
  const costs = [100, 200, 350, 550, 800, 1200, 1700, 2500, 3500, 5000, 7000, 10000, 14000, 20000, 28000]
  return costs[lvl - 1] || 28000
})

const expPercent = computed(() => {
  if (!selectedMount.value) return 0
  return Math.min(100, Math.round(((selectedMount.value.exp || 0) / expNeeded.value) * 100))
})

const skillIcons = {
  疾行: '💨', 沙漠行: '🏜️', 狐火: '🔥', 狼嚎: '🐺', 凌空: '⬆️', 疾风: '🌪️',
  圣光: '✨', 龙息: '🔥', 腾云: '☁️', 幻光: '🌈', 迷香: '🌸', 天狐火: '🌟',
  幻化: '🔮', 应龙震: '⚡', 龙威: '🐉', 狮吼: '🦁', 王威: '👑', 金刚: '🛡️',
  南明离火: '🔥', 涅槃: '🦜', 天羽: '🪶', 祖龙诀: '🐲', 天罚: '⚡', 星霜: '❄️',
  月华: '🌙', 净化: '💫', 太极: '☯️', 道法: '🍃', 自然: '🌿', 轮回: '🔄'
}

const skillDescs = {
  疾行: '移动速度+20%', 沙漠行: '沙漠地形速度+50%', 狐火: '攻击时有几率释放狐火',
  狼嚎: '提升主人攻击力10%', 疾风: '闪避率+15%', 圣光: '受到治疗效果+20%',
  龙息: '攻击附带火属性伤害', 腾云: '免疫地形减益', 幻光: '隐匿身形,怪物发现率-30%',
  迷香: '使周围敌人减速', 天狐火: '造成大量火属性伤害', 幻化: '可变幻形态',
  应龙震: '震退周围敌人', 龙威: '对敌方有威慑效果,伤害+15%', 狮吼: '范围恐惧效果',
  王威: '增加主人防御15%', 金刚: '受到的伤害-10%', 涅槃: '死亡时触发复活',
  祖龙诀: '全属性大幅提升', 天罚: '对BOSS伤害+30%', 太极: '阴阳调和,所有属性+50%',
  道法: '每10秒回血5%', 净化: '免疫负面状态', 轮回: '额外一条命'
}

function getQualityColor(q) {
  return qualityColors[q] || '#b0b0b0'
}

function statName(key) {
  return { hp: '生命', attack: '攻击', defense: '防御', speed: '速度' }[key] || key
}

function showToast(message, type = 'info') {
  toast.value = { show: true, message, type }
  setTimeout(() => { toast.value.show = false }, 2500)
}

async function loadMounts() {
  try {
    const res = await mountApi.get(PLAYER_ID)
    if (res.data.success) {
      mounts.value = res.data.mounts || []
      activeMountId.value = res.data.activeMountId || 1
      if (mounts.value.length > 0 && !selectedMount.value) {
        selectedMount.value = mounts.value[0]
      }
    }
  } catch (e) {
    // fallback 静态数据
    mounts.value = [
      { mountedId: 1, id: 1, icon: '🐴', name: '凡马', quality: 'white', level: 1, exp: 0, speed: 30, skills: ['疾行'], stats: { hp: 50, attack: 10, defense: 5 } },
      { mountedId: 2, id: 3, icon: '🦊', name: '灵狐', quality: 'green', level: 1, exp: 0, speed: 55, skills: ['狐火', '疾行'], stats: { hp: 120, attack: 25, defense: 12 } }
    ]
    activeMountId.value = 1
    selectedMount.value = mounts.value[0]
  }
}

async function loadMarket() {
  activeTab.value = 'shop'
  try {
    const res = await mountApi.getMarket(PLAYER_ID)
    if (res.data.success) {
      marketMounts.value = res.data.market || []
      spiritStones.value = res.data.playerSpiritStones || 0
    }
  } catch (e) {
    marketMounts.value = []
  }
}

function selectMount(mount) {
  selectedMount.value = mount
}

function switchToDetail() {
  activeTab.value = 'detail'
}

function switchToSkills() {
  activeTab.value = 'skills'
}

async function doActivate() {
  if (!selectedMount.value) return
  try {
    const res = await mountApi.activate(PLAYER_ID, selectedMount.value.mountedId)
    if (res.data.success) {
      activeMountId.value = selectedMount.value.mountedId
      showToast(res.data.message || '🚀 坐骑已激活！', 'success')
    } else {
      showToast(res.data.error || '激活失败', 'error')
    }
  } catch (e) {
    showToast('激活失败: ' + e.message, 'error')
  }
}

async function doFeed(type) {
  if (!selectedMount.value) return
  if (selectedMount.value.level >= 15) {
    showToast('坐骑已达最高等级 Lv.15！', 'warn')
    return
  }
  try {
    const res = await mountApi.feed(PLAYER_ID, selectedMount.value.mountedId, type)
    if (res.data.success) {
      if (res.data.leveledUp) {
        showToast('🎉 坐骑升级成功！等级提升至 Lv.' + (selectedMount.value.level + 1) + '！', 'success')
      } else {
        showToast(`+100 经验 (${type === 'premium' ? '高级' : '普通'}喂养)`, 'info')
      }
      // 更新本地数据
      selectedMount.value = res.data.mount
      await loadMounts()
    } else {
      showToast(res.data.error || '喂养失败', 'error')
    }
  } catch (e) {
    showToast('喂养失败: ' + e.message, 'error')
  }
}

async function doBuy(marketItem) {
  if (spiritStones.value < marketItem.price) {
    showToast('灵石不足！需要 ' + marketItem.price.toLocaleString() + ' 灵石', 'error')
    return
  }
  try {
    const res = await mountApi.buy(PLAYER_ID, marketItem.id)
    if (res.data.success) {
      showToast(res.data.message || `成功购买【${marketItem.icon}${marketItem.name}】！`, 'success')
      spiritStones.value = res.data.remainingSpiritStones
      await loadMounts()
      await loadMarket()
    } else {
      showToast(res.data.error || '购买失败', 'error')
    }
  } catch (e) {
    showToast('购买失败: ' + e.message, 'error')
  }
}

onMounted(() => {
  loadMounts()
})
</script>

<style scoped>
.mount-panel { padding: 16px; color: #e0e0e0; font-size: 14px; }
h2 { color: #f093fb; font-size: 22px; margin-bottom: 16px; text-align: center; }

/* 坐骑展示台 */
.mount-stage {
  position: relative; text-align: center;
  padding: 24px 20px; margin-bottom: 16px;
  background: rgba(255,255,255,0.03);
  border-radius: 20px; border: 1px solid rgba(255,255,255,0.06);
  overflow: hidden;
}
.stage-glow {
  position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
  opacity: 0.08; border-radius: 50%;
  animation: pulse 3s ease-in-out infinite;
}
@keyframes pulse { 0%,100%{transform:scale(0.9);}50%{transform:scale(1.1);} }

.mount-display {
  position: relative; display: inline-block; margin-bottom: 10px;
}
.mount-emoji {
  font-size: 80px; display: block;
  animation: float 3s ease-in-out infinite;
  filter: drop-shadow(0 0 20px currentColor);
}
@keyframes float { 0%,100%{transform:translateY(0);}50%{transform:translateY(-12px);} }

.mount-name { color: #fff; font-size: 20px; font-weight: bold; margin-bottom: 4px; }
.mount-quality-badge {
  display: inline-block; padding: 3px 14px; border-radius: 20px;
  font-size: 12px; margin-bottom: 8px;
}
.mount-quality-badge.white { background: rgba(176,176,176,0.2); color: #b0b0b0; }
.mount-quality-badge.green { background: rgba(80,200,120,0.2); color: #50c878; }
.mount-quality-badge.blue { background: rgba(65,105,225,0.2); color: #4169e1; }
.mount-quality-badge.purple { background: rgba(147,112,219,0.2); color: #9370db; }
.mount-quality-badge.orange { background: rgba(255,140,0,0.2); color: #ff8c00; }
.mount-quality-badge.red { background: rgba(220,20,60,0.2); color: #dc143c; }
.mount-quality-badge.gold { background: rgba(255,215,0,0.2); color: #ffd700; }
.mount-quality-badge.limit { background: rgba(255,105,180,0.2); color: #ff69b4; }

.mount-speed { color: #f093fb; font-size: 15px; margin-bottom: 12px; }
.speed-icon { margin-right: 4px; }

.stats-row {
  display: flex; justify-content: center; gap: 24px; margin-top: 10px;
}
.stat-item { text-align: center; }
.stat-label { display: block; color: #888; font-size: 11px; }
.stat-val { display: block; color: #fff; font-size: 16px; font-weight: bold; }

/* Tab 导航 */
.tab-nav {
  display: flex; gap: 4px; margin-bottom: 14px;
  background: rgba(255,255,255,0.03); border-radius: 12px; padding: 4px;
}
.tab-btn {
  flex: 1; padding: 8px 4px; background: none; border: none;
  color: #888; font-size: 12px; cursor: pointer; border-radius: 8px;
  transition: all 0.2s;
}
.tab-btn.active { background: rgba(102,126,234,0.25); color: #a78bfa; font-weight: bold; }
.tab-btn:hover:not(.active) { color: #ccc; background: rgba(255,255,255,0.03); }

/* 坐骑列表 */
.mount-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px;
}
.mount-card {
  position: relative; text-align: center; padding: 14px 8px;
  background: rgba(255,255,255,0.04); border-radius: 14px;
  cursor: pointer; border: 2px solid transparent;
  transition: all 0.2s;
}
.mount-card:hover { background: rgba(255,255,255,0.07); transform: translateY(-2px); }
.mount-card.active { border-color: #667eea; background: rgba(102,126,234,0.12); }
.mount-card.white { border-color: rgba(176,176,176,0.3); }
.mount-card.green { border-color: rgba(80,200,120,0.4); }
.mount-card.blue { border-color: rgba(65,105,225,0.4); }
.mount-card.purple { border-color: rgba(147,112,219,0.4); }
.mount-card.orange { border-color: rgba(255,140,0,0.4); }
.mount-card.red { border-color: rgba(220,20,60,0.4); }
.mount-card.gold { border-color: rgba(255,215,0,0.4); }
.mount-card.limit { border-color: rgba(255,105,180,0.4); }

.card-glow {
  position: absolute; top: 0; left: 0; right: 0; height: 3px;
  border-radius: 14px 14px 0 0; opacity: 0.7;
}
.mount-card-icon { font-size: 36px; margin-bottom: 6px; }
.mount-card-info { display: flex; flex-direction: column; gap: 2px; }
.mount-card-name { color: #fff; font-size: 12px; font-weight: bold; }
.mount-card-level { color: #888; font-size: 10px; }
.mount-card-speed { color: #f093fb; font-size: 11px; margin-top: 4px; }
.active-indicator { position: absolute; top: 6px; right: 6px; font-size: 14px; }
.quality-border { display: none; }

/* 操作按钮 */
.mount-actions {
  display: flex; gap: 8px; flex-wrap: wrap;
}
.action-btn {
  flex: 1; min-width: 120px; padding: 10px 12px;
  border: none; border-radius: 12px; font-size: 13px;
  cursor: pointer; transition: all 0.2s; font-weight: bold;
}
.action-btn.activate {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
}
.action-btn.activate:disabled { opacity: 0.5; cursor: not-allowed; }
.action-btn.feed { background: rgba(80,200,120,0.15); color: #50c878; border: 1px solid rgba(80,200,120,0.3); }
.action-btn.feed-premium { background: rgba(255,215,0,0.15); color: #ffd700; border: 1px solid rgba(255,215,0,0.3); }
.action-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.1); }

/* 详情面板 */
.detail-panel { padding: 8px 0; }
.detail-header { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.detail-icon { font-size: 60px; }
.detail-title h3 { color: #fff; font-size: 20px; margin-bottom: 4px; }
.detail-quality { font-size: 13px; padding: 2px 10px; border-radius: 10px; display: inline-block; }

.level-progress { margin-bottom: 16px; }
.level-label { color: #888; font-size: 12px; margin-bottom: 6px; }
.exp-bar { height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; margin-bottom: 4px; }
.exp-fill { height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 4px; transition: width 0.3s; }
.exp-text { color: #888; font-size: 11px; text-align: right; }

.stats-title { color: #888; font-size: 12px; margin-bottom: 8px; }
.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; }
.stat-box {
  background: rgba(255,255,255,0.04); padding: 10px 8px;
  border-radius: 10px; text-align: center;
}
.stat-key { display: block; color: #888; font-size: 11px; }
.stat-value { display: block; color: #fff; font-size: 18px; font-weight: bold; }
.stat-growth { display: block; color: #50c878; font-size: 10px; }

.speed-info {
  display: flex; align-items: center; gap: 8px;
  background: rgba(240,147,251,0.1); padding: 10px 14px;
  border-radius: 10px; margin-bottom: 14px;
}
.speed-label { color: #888; font-size: 12px; }
.speed-value { color: #f093fb; font-size: 16px; font-weight: bold; }
.speed-desc { color: #666; font-size: 11px; margin-left: auto; }

.feed-section { background: rgba(255,255,255,0.03); padding: 14px; border-radius: 12px; }
.feed-title { color: #888; font-size: 12px; margin-bottom: 10px; }
.feed-options { display: flex; gap: 8px; margin-bottom: 8px; }
.feed-btn {
  flex: 1; padding: 10px 8px; border-radius: 10px;
  border: 1px solid; cursor: pointer; font-size: 12px;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
}
.feed-btn.normal { background: rgba(80,200,120,0.1); border-color: rgba(80,200,120,0.3); color: #50c878; }
.feed-btn.premium { background: rgba(255,215,0,0.1); border-color: rgba(255,215,0,0.3); color: #ffd700; }
.feed-btn:hover { transform: translateY(-1px); }
.feed-cost { font-weight: bold; }
.feed-exp { font-size: 11px; }
.feed-note { color: #555; font-size: 11px; }

/* 商店 */
.shop-header { margin-bottom: 12px; }
.spirit-stones-balance { color: #ffd700; font-size: 14px; }
.market-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
.market-card {
  display: flex; align-items: center; gap: 12px;
  padding: 12px; background: rgba(255,255,255,0.04);
  border-radius: 12px; border: 1px solid rgba(255,255,255,0.06);
}
.market-icon { font-size: 40px; flex-shrink: 0; }
.market-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.market-name { color: #fff; font-size: 14px; font-weight: bold; }
.market-quality { font-size: 11px; }
.market-quality.white { color: #b0b0b0; } .market-quality.green { color: #50c878; }
.market-quality.blue { color: #4169e1; } .market-quality.purple { color: #9370db; }
.market-quality.orange { color: #ff8c00; } .market-quality.red { color: #dc143c; }
.market-quality.gold { color: #ffd700; } .market-quality.limit { color: #ff69b4; }
.market-speed { color: #f093fb; font-size: 12px; }
.market-level { color: #666; font-size: 11px; }
.market-skills { display: flex; gap: 4px; flex-wrap: wrap; }
.skill-tag {
  background: rgba(255,255,255,0.06); padding: 2px 6px;
  border-radius: 6px; font-size: 10px; color: #aaa;
}
.buy-btn {
  padding: 8px 16px; border: none; border-radius: 10px;
  font-size: 13px; font-weight: bold; cursor: pointer;
  white-space: nowrap;
}
.buy-btn.white { background: rgba(176,176,176,0.2); color: #b0b0b0; }
.buy-btn.green { background: rgba(80,200,120,0.2); color: #50c878; }
.buy-btn.blue { background: rgba(65,105,225,0.2); color: #4169e1; }
.buy-btn.purple { background: rgba(147,112,219,0.2); color: #9370db; }
.buy-btn.orange { background: rgba(255,140,0,0.2); color: #ff8c00; }
.buy-btn.red { background: rgba(220,20,60,0.2); color: #dc143c; }
.buy-btn.gold { background: rgba(255,215,0,0.2); color: #ffd700; }
.buy-btn.limit { background: rgba(255,105,180,0.2); color: #ff69b4; }
.buy-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.buy-btn:hover:not(:disabled) { filter: brightness(1.2); }

/* 技能面板 */
.skills-panel {}
.skills-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.skills-mount-icon { font-size: 40px; }
.skills-mount-name { color: #fff; font-size: 16px; font-weight: bold; }
.skills-list { display: grid; grid-template-columns: 1fr; gap: 8px; }
.skill-card {
  display: flex; align-items: center; gap: 12px;
  padding: 12px; background: rgba(255,255,255,0.04);
  border-radius: 10px;
}
.skill-icon { font-size: 28px; flex-shrink: 0; }
.skill-name { display: block; color: #fff; font-size: 14px; font-weight: bold; }
.skill-desc { display: block; color: #888; font-size: 12px; margin-top: 2px; }

/* 空状态 */
.empty-state { text-align: center; padding: 30px; color: #555; font-size: 13px; }

/* Toast */
.toast {
  position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
  padding: 10px 24px; border-radius: 20px; font-size: 13px; z-index: 9999;
  background: rgba(102,126,234,0.9); color: #fff; white-space: nowrap;
}
.toast.success { background: rgba(80,200,120,0.9); }
.toast.error { background: rgba(220,20,60,0.9); }
.toast.warn { background: rgba(255,140,0,0.9); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
