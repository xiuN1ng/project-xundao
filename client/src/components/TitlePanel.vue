<template>
  <div class="title-panel">
    <!-- 顶部标题栏 -->
    <div class="panel-header">
      <h2>📜 称号系统</h2>
      <div class="header-stats">
        <span class="stat">拥有 {{ ownedCount }} 个</span>
        <span class="stat">可装备 1 个</span>
      </div>
    </div>

    <!-- 当前装备的称号展示（带特效） -->
    <div class="equipped-section" v-if="equippedTitle">
      <div class="equipped-title-wrapper">
        <!-- 特效层 -->
        <div class="title-effect-layer" :style="getEffectLayerStyle(equippedTitle)">
          <!-- 粒子效果 -->
          <div class="particles-container" v-if="equippedEffect?.specialEffects?.hasParticles">
            <div v-for="i in equippedEffect.particles.count" :key="i"
                 class="particle"
                 :style="getParticleStyle(i)">
            </div>
          </div>
          <!-- 光环效果 -->
          <div class="aura-container" v-if="equippedEffect?.specialEffects?.hasAura">
            <div v-for="layer in equippedEffect.aura.layers" :key="layer"
                 class="aura-ring"
                 :style="getAuraStyle(layer)">
            </div>
          </div>
          <!-- 火焰效果 -->
          <div class="fire-container" v-if="equippedEffect?.specialEffects?.hasFire">
            <div v-for="i in 8" :key="i" class="flame" :style="getFlameStyle(i)"></div>
          </div>
          <!-- 凤凰特效 -->
          <div class="phoenix-container" v-if="equippedEffect?.specialEffects?.hasPhoenix">
            <div class="phoenix-wings">
              <div v-for="i in 2" :key="i" class="wing" :class="i === 1 ? 'left' : 'right'">
                <div v-for="f in equippedEffect.phoenix.featherCount" :key="f" class="feather"></div>
              </div>
            </div>
          </div>
          <!-- 彩虹特效 -->
          <div class="rainbow-container" v-if="equippedEffect?.specialEffects?.hasRainbow">
            <div class="rainbow-arc" :style="getRainbowStyle()"></div>
          </div>
        </div>

        <!-- 称号主体 -->
        <div class="equipped-title-badge" :style="getBadgeStyle(equippedTitle)">
          <span class="badge-icon">{{ equippedTitle.icon }}</span>
          <span class="badge-name">{{ equippedTitle.name }}</span>
          <span class="badge-rarity" :style="{ color: equippedTitle.rarity.color }">
            {{ equippedTitle.rarity.name }}
          </span>
        </div>
      </div>

      <!-- 卸下按钮 -->
      <button class="btn-unequip" @click="unequipTitle">卸下称号</button>

      <!-- 属性加成 -->
      <div class="equipped-attrs" v-if="equippedTitle.attributes">
        <span class="attr-label">属性加成：</span>
        <span v-for="(val, key) in equippedTitle.attributes" :key="key" class="attr-tag">
          {{ getAttrName(key) }}+{{ formatAttr(val) }}
        </span>
      </div>
    </div>

    <!-- 无装备提示 -->
    <div class="no-equip-hint" v-else>
      <span>未装备称号</span>
      <span class="hint-sub">选择一个称号装备以获得属性加成和特效</span>
    </div>

    <!-- Tab切换 -->
    <div class="tab-bar">
      <button v-for="tab in tabs" :key="tab.key"
              class="tab-btn"
              :class="{ active: currentTab === tab.key }"
              @click="currentTab = tab.key">
        {{ tab.icon }} {{ tab.name }}
        <span class="tab-count">{{ getTabCount(tab.key) }}</span>
      </button>
    </div>

    <!-- 称号列表 -->
    <div class="title-list">
      <div v-for="title in filteredTitles" :key="title.id"
           class="title-card"
           :class="{
             equipped: title.isEquipped,
             owned: title.isOwned && !title.isEquipped,
             available: title.isAvailable && !title.isOwned,
             locked: !title.isOwned && !title.isAvailable
           }">

        <!-- 稀有度边框 -->
        <div class="rarity-border" :style="{ borderColor: title.rarity.color }"></div>

        <!-- 称号图标区 -->
        <div class="title-icon-area">
          <span class="title-icon">{{ title.icon }}</span>
          <!-- 小型特效预览 -->
          <div class="icon-effect" v-if="title.isOwned && title.isEquipped" :style="{ background: title.rarity.color }"></div>
        </div>

        <!-- 称号信息 -->
        <div class="title-info">
          <div class="title-name-row">
            <span class="title-name" :style="{ color: title.rarity.color }">{{ title.name }}</span>
            <span class="rarity-badge" :style="{ background: title.rarity.color + '33', color: title.rarity.color }">
              {{ title.rarity.name }}
            </span>
          </div>
          <p class="title-desc">{{ title.description }}</p>

          <!-- 属性预览 -->
          <div class="attr-preview" v-if="title.isOwned && title.attributes">
            <span v-for="(val, key) in title.attributes" :key="key" class="attr-mini">
              {{ getAttrName(key) }}+{{ formatAttr(val) }}
            </span>
          </div>

          <!-- 解锁条件 -->
          <div class="unlock-req" v-if="!title.isOwned">
            <span class="req-label">解锁条件：</span>
            <span class="req-text">{{ title.description }}</span>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="title-actions">
          <button v-if="title.isOwned && !title.isEquipped"
                  class="btn-equip"
                  :style="{ background: title.rarity.color }"
                  @click="equipTitle(title)">
            装备
          </button>
          <span v-if="title.isEquipped" class="equipped-badge">已装备</span>
          <span v-if="!title.isOwned && !title.isAvailable" class="locked-badge">未解锁</span>
          <span v-if="title.isAvailable && !title.isOwned" class="new-badge">可获取</span>
        </div>

        <!-- 特效类型标签 -->
        <div class="effect-tag" v-if="title.effectType && title.effectType !== 'none'">
          {{ getEffectTypeName(title.effectType) }}
        </div>
      </div>
    </div>

    <!-- 特效预览弹窗 -->
    <div class="effect-preview-modal" v-if="previewTitle" @click.self="previewTitle = null">
      <div class="preview-card" :style="getPreviewCardStyle(previewTitle)">
        <button class="preview-close" @click="previewTitle = null">×</button>
        <h3>{{ previewTitle.name }}</h3>
        <div class="preview-effect">
          <div class="effect-layer" :style="getEffectLayerStyle(previewTitle)">
            <div class="particles-container" v-if="previewEffect?.specialEffects?.hasParticles">
              <div v-for="i in previewEffect.particles.count" :key="i" class="particle" :style="getParticleStyle(i)"></div>
            </div>
            <div class="aura-container" v-if="previewEffect?.specialEffects?.hasAura">
              <div v-for="layer in previewEffect.aura.layers" :key="layer" class="aura-ring" :style="getAuraStyle(layer)"></div>
            </div>
            <div class="fire-container" v-if="previewEffect?.specialEffects?.hasFire">
              <div v-for="i in 8" :key="i" class="flame" :style="getFlameStyle(i)"></div>
            </div>
            <div class="phoenix-container" v-if="previewEffect?.specialEffects?.hasPhoenix">
              <div class="phoenix-wings">
                <div v-for="i in 2" :key="i" class="wing" :class="i === 1 ? 'left' : 'right'">
                  <div v-for="f in previewEffect.phoenix.featherCount" :key="f" class="feather"></div>
                </div>
              </div>
            </div>
          </div>
          <div class="preview-badge" :style="getBadgeStyle(previewTitle)">
            <span class="badge-icon">{{ previewTitle.icon }}</span>
            <span class="badge-name">{{ previewTitle.name }}</span>
          </div>
        </div>
        <div class="preview-attrs" v-if="previewTitle.attributes">
          <div class="attr-title">属性加成</div>
          <div class="attr-row">
            <span v-for="(val, key) in previewTitle.attributes" :key="key" class="attr-tag">
              {{ getAttrName(key) }}+{{ formatAttr(val) }}
            </span>
          </div>
        </div>
        <div class="preview-effect-info">
          <div class="effect-title">特效信息</div>
          <div class="effect-desc">{{ getEffectDesc(previewTitle.effectType) }}</div>
        </div>
        <button v-if="previewTitle.isOwned && !previewTitle.isEquipped"
                class="btn-equip-preview"
                :style="{ background: previewTitle.rarity.color }"
                @click="equipTitle(previewTitle); previewTitle = null">
          装备此称号
        </button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div class="loading-overlay" v-if="loading">
      <div class="loading-spinner"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { titleApi } from '../api/index.js'

const loading = ref(false)
const titles = ref([])
const equippedTitle = ref(null)
const equippedEffect = ref(null)
const currentTab = ref('all')
const previewTitle = ref(null)
const previewEffect = ref(null)
const playerId = ref(1)

// Tab配置
const tabs = [
  { key: 'all', name: '全部', icon: '📋' },
  { key: 'realm', name: '境界', icon: '🧘' },
  { key: 'rank', name: '爵位', icon: '🏅' },
  { key: 'dungeon', name: '副本', icon: '🏆' },
  { key: 'arena', name: '竞技', icon: '⚔️' },
  { key: 'sect', name: '宗门', icon: '🏛️' },
  { key: 'event', name: '活动', icon: '🎉' },
  { key: 'special', name: '特殊', icon: '⭐' }
]

// 计算属性
const ownedCount = computed(() => titles.value.filter(t => t.isOwned).length)

const filteredTitles = computed(() => {
  if (currentTab.value === 'all') return titles.value
  return titles.value.filter(t => t.type === currentTab.value)
})

function getTabCount(tabKey) {
  if (tabKey === 'all') return titles.value.length
  return titles.value.filter(t => t.type === tabKey).length
}

// 属性名称映射
const attrNames = {
  atk: '攻击', def: '防御', hp: '生命', crit: '暴击率', dodge: '闪避率',
  spiritRate: '灵根倍率', cultivationEfficiency: '修炼效率', dropRate: '掉落倍率',
  spiritStoneRate: '灵石倍率', damageRate: '伤害倍率', damageReduction: '免伤率',
  hpRegen: '生命恢复', spiritRegen: '灵力恢复', expRate: '经验倍率',
  beastPower: '宠物战力', enchantRate: '强化成功率', comprehension: '悟道加成'
}

function getAttrName(key) {
  return attrNames[key] || key
}

function formatAttr(val) {
  if (typeof val === 'number') {
    return val >= 1 ? val : (val * 100).toFixed(1) + '%'
  }
  return val
}

// 特效类型名称
function getEffectTypeName(effectType) {
  const names = {
    none: '', sparkle: '✨闪烁', float: '🌊漂浮', orbit: '🔄环绕',
    pulse: '💫脉冲', aura: '🌟光环', fire: '🔥火焰', phoenix: '🦅凤凰', rainbow: '🌈彩虹'
  }
  return names[effectType] || ''
}

function getEffectDesc(effectType) {
  const descs = {
    none: '无特效',
    sparkle: '普通粒子闪烁，轻微光效',
    float: '粒子向上漂浮，轻盈飘逸',
    orbit: '粒子环绕旋转，动态光环',
    pulse: '光环脉冲扩散，节奏感强',
    aura: '多层光环叠加，华丽耀眼',
    fire: '火焰特效，炽热奔放',
    phoenix: '凤凰展翅，尊贵奢华',
    rainbow: '彩虹环绕，七彩斑斓'
  }
  return descs[effectType] || ''
}

// 特效样式生成
function getEffectLayerStyle(title) {
  const colors = title.rarity || { color: '#888888', particleColor: '#AAAAAA', glowColor: 'rgba(136,136,136,0.5)' }
  return {
    '--primary': colors.color,
    '--particle': colors.particleColor || colors.color,
    '--glow': colors.glowColor || 'rgba(136,136,136,0.5)'
  }
}

function getParticleStyle(index) {
  const total = 12
  const angle = (index / total) * 360
  const delay = (index / total) * 2
  return {
    '--angle': angle + 'deg',
    '--delay': delay + 's',
    '--size': (3 + (index % 3) * 2) + 'px'
  }
}

function getAuraStyle(layer) {
  const radius = 40 + layer * 20
  const opacity = 0.4 - layer * 0.1
  const delay = layer * 0.3
  return {
    '--radius': radius + 'px',
    '--opacity': opacity,
    '--delay': delay + 's'
  }
}

function getFlameStyle(index) {
  const height = 20 + (index % 3) * 10
  const delay = index * 0.1
  const left = (index / 8) * 100
  return {
    '--height': height + 'px',
    '--delay': delay + 's',
    '--left': left + '%'
  }
}

function getRainbowStyle() {
  return { '--rotation': '0deg' }
}

function getBadgeStyle(title) {
  return {
    '--rarity-color': title.rarity.color,
    '--rarity-bg': title.rarity.bgColor || 'rgba(136,136,136,0.2)'
  }
}

function getPreviewCardStyle(title) {
  return {
    '--rarity-color': title.rarity.color,
    '--rarity-bg': title.rarity.bgColor || 'rgba(136,136,136,0.2)'
  }
}

// API调用
async function loadTitles() {
  loading.value = true
  try {
    const res = await titleApi.get(playerId.value)
    if (res.data.success) {
      titles.value = res.data.titles
    }
  } catch (e) {
    console.error('加载称号失败', e)
  } finally {
    loading.value = false
  }
}

async function loadEquippedTitle() {
  try {
    const res = await titleApi.getMy(playerId.value)
    if (res.data.success && res.data.equipped) {
      equippedTitle.value = res.data.equipped
      equippedEffect.value = res.data.equipped.effect
    }
  } catch (e) {
    console.error('加载装备称号失败', e)
  }
}

async function loadTitleEffect(titleId) {
  try {
    const res = await titleApi.getEffect(titleId)
    return res.data.effect
  } catch (e) {
    return null
  }
}

async function equipTitle(title) {
  try {
    const res = await titleApi.equip(playerId.value, title.id)
    if (res.data.success) {
      equippedTitle.value = res.data.equippedTitle
      equippedEffect.value = res.data.effect
      // 更新列表中的装备状态
      titles.value.forEach(t => t.isEquipped = t.id === title.id)
    }
  } catch (e) {
    console.error('装备称号失败', e)
  }
}

async function unequipTitle() {
  try {
    const res = await titleApi.unequip(playerId.value)
    if (res.data.success) {
      titles.value.forEach(t => t.isEquipped = false)
      equippedTitle.value = null
      equippedEffect.value = null
    }
  } catch (e) {
    console.error('卸下称号失败', e)
  }
}

async function showPreview(title) {
  previewTitle.value = title
  previewEffect.value = await loadTitleEffect(title.id)
}

onMounted(() => {
  loadTitles()
  loadEquippedTitle()
})
</script>

<style scoped>
.title-panel {
  padding: 16px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  min-height: 100vh;
  color: #e0e0e0;
  position: relative;
}

/* 头部 */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.panel-header h2 { margin: 0; color: #f093fb; font-size: 20px; }
.header-stats { display: flex; gap: 12px; }
.stat { font-size: 12px; color: #aaa; background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 4px; }

/* 装备区 */
.equipped-section {
  background: linear-gradient(135deg, rgba(240,147,251,0.1), rgba(147,112,219,0.1));
  border: 1px solid rgba(240,147,251,0.3);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  text-align: center;
}
.equipped-title-wrapper {
  position: relative;
  display: inline-block;
  margin-bottom: 12px;
}
.equipped-title-badge {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 24px;
  background: var(--rarity-bg, rgba(136,136,136,0.2));
  border: 2px solid var(--rarity-color, #888);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}
.badge-icon { font-size: 32px; }
.badge-name { font-size: 18px; font-weight: bold; margin: 4px 0; }
.badge-rarity { font-size: 12px; }

/* 特效层 */
.title-effect-layer {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 200px;
  height: 200px;
  pointer-events: none;
}
.particles-container { position: absolute; inset: 0; }
.particle {
  position: absolute;
  width: var(--size);
  height: var(--size);
  background: var(--particle);
  border-radius: 50%;
  top: 50%;
  left: 50%;
  transform: rotate(var(--angle)) translateX(60px);
  animation: particleFloat 2s ease-in-out infinite;
  animation-delay: var(--delay);
  box-shadow: 0 0 6px var(--particle);
}
@keyframes particleFloat {
  0%, 100% { transform: rotate(var(--angle)) translateX(60px) translateY(0); opacity: 1; }
  50% { transform: rotate(var(--angle)) translateX(60px) translateY(-20px); opacity: 0.5; }
}
.aura-container { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.aura-ring {
  position: absolute;
  width: calc(var(--radius) * 2);
  height: calc(var(--radius) * 2);
  border: 2px solid var(--primary);
  border-radius: 50%;
  opacity: var(--opacity);
  animation: auraPulse 3s ease-in-out infinite;
  animation-delay: var(--delay);
}
@keyframes auraPulse {
  0%, 100% { transform: scale(1); opacity: var(--opacity); }
  50% { transform: scale(1.1); opacity: calc(var(--opacity) * 0.6); }
}
.fire-container {
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 100px;
  height: 60px;
}
.flame {
  position: absolute;
  bottom: 0;
  left: var(--left);
  width: 12px;
  height: var(--height);
  background: linear-gradient(to top, #FF6600, #FF3300, transparent);
  border-radius: 50% 50% 20% 20%;
  animation: flicker 0.3s ease-in-out infinite alternate;
  animation-delay: var(--delay);
  transform-origin: bottom center;
}
@keyframes flicker {
  0% { transform: scaleY(1) scaleX(1); }
  100% { transform: scaleY(1.2) scaleX(0.8); }
}
.phoenix-container { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.phoenix-wings { display: flex; gap: 20px; }
.wing { display: flex; gap: 4px; }
.wing.left { transform: scaleX(-1); }
.feather {
  width: 8px;
  height: 30px;
  background: linear-gradient(135deg, #FF6600, #FF0000);
  border-radius: 4px 4px 50% 50%;
  animation: wingFlap 0.5s ease-in-out infinite alternate;
}
.feather:nth-child(2) { animation-delay: 0.1s; height: 25px; }
.feather:nth-child(3) { animation-delay: 0.2s; height: 20px; }
@keyframes wingFlap {
  0% { transform: rotate(-10deg); }
  100% { transform: rotate(10deg); }
}
.rainbow-container { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.rainbow-arc {
  width: 120px;
  height: 60px;
  border-radius: 120px 120px 0 0;
  background: conic-gradient(from 0deg, #FF0000, #FF7F00, #FFFF00, #00FF00, #0000FF, #8B00FF, #FF0000);
  animation: rainbowSpin 4s linear infinite;
  opacity: 0.7;
}
@keyframes rainbowSpin {
  0% { filter: hue-rotate(0deg); }
  100% { filter: hue-rotate(360deg); }
}

/* 按钮 */
.btn-unequip {
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  color: #e0e0e0;
  padding: 6px 16px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 12px;
}
.btn-unequip:hover { background: rgba(255,255,255,0.2); }

/* 属性 */
.equipped-attrs { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
.attr-label { font-size: 12px; color: #aaa; }
.attr-tag {
  font-size: 11px;
  background: rgba(255,255,255,0.08);
  padding: 2px 8px;
  border-radius: 4px;
  color: #7FDD56;
}

/* 无装备提示 */
.no-equip-hint {
  background: rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  margin-bottom: 16px;
  color: #888;
}
.hint-sub { display: block; font-size: 12px; margin-top: 4px; }

/* Tab栏 */
.tab-bar {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  padding-bottom: 8px;
  margin-bottom: 12px;
}
.tab-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px;
  color: #aaa;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.tab-btn:hover { background: rgba(255,255,255,0.1); }
.tab-btn.active { background: rgba(240,147,251,0.2); border-color: rgba(240,147,251,0.5); color: #f093fb; }
.tab-count { background: rgba(255,255,255,0.1); padding: 1px 5px; border-radius: 3px; font-size: 10px; }

/* 称号列表 */
.title-list { display: flex; flex-direction: column; gap: 8px; }
.title-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  position: relative;
  transition: all 0.2s;
}
.title-card:hover { background: rgba(255,255,255,0.06); }
.title-card.equipped { border-color: rgba(240,147,251,0.4); background: rgba(240,147,251,0.05); }
.title-card.owned { border-color: rgba(30,255,0,0.2); }
.title-card.available { border-color: rgba(0,112,221,0.3); }
.title-card.locked { opacity: 0.5; }
.rarity-border {
  position: absolute;
  inset: 0;
  border-radius: 10px;
  border: 1px solid;
  pointer-events: none;
}
.title-icon-area {
  position: relative;
  font-size: 28px;
  width: 48px;
  text-align: center;
}
.icon-effect {
  position: absolute;
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: iconPulse 1s ease-in-out infinite;
}
@keyframes iconPulse {
  0%, 100% { transform: translateX(-50%) scale(1); opacity: 1; }
  50% { transform: translateX(-50%) scale(1.5); opacity: 0.5; }
}
.title-info { flex: 1; min-width: 0; }
.title-name-row { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
.title-name { font-size: 14px; font-weight: bold; }
.rarity-badge { font-size: 10px; padding: 1px 6px; border-radius: 3px; }
.title-desc { font-size: 11px; color: #888; margin: 2px 0; }
.attr-preview { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.attr-mini { font-size: 10px; color: #7FDD56; background: rgba(127,221,86,0.1); padding: 1px 5px; border-radius: 3px; }
.unlock-req { font-size: 10px; color: #666; margin-top: 2px; }
.req-label { color: #888; }
.title-actions { flex-shrink: 0; }
.btn-equip {
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  font-weight: bold;
  transition: transform 0.2s;
}
.btn-equip:hover { transform: scale(1.05); }
.btn-equip:active { transform: scale(0.95); }
.equipped-badge { font-size: 11px; color: #f093fb; }
.locked-badge { font-size: 11px; color: #666; }
.new-badge { font-size: 11px; color: #00DD77; background: rgba(0,221,119,0.1); padding: 2px 6px; border-radius: 3px; }
.effect-tag {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 10px;
  color: #FFD700;
  background: rgba(255,215,0,0.1);
  padding: 1px 6px;
  border-radius: 3px;
}

/* 预览弹窗 */
.effect-preview-modal {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.preview-card {
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  border: 2px solid var(--rarity-color);
  border-radius: 16px;
  padding: 24px;
  max-width: 360px;
  width: 90%;
  text-align: center;
  position: relative;
}
.preview-close {
  position: absolute;
  top: 8px;
  right: 12px;
  background: none;
  border: none;
  color: #888;
  font-size: 24px;
  cursor: pointer;
}
.preview-card h3 { margin: 0 0 16px; color: var(--rarity-color); }
.preview-effect {
  position: relative;
  height: 200px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.preview-badge {
  position: relative;
  z-index: 2;
  padding: 12px 20px;
  background: var(--rarity-bg);
  border: 2px solid var(--rarity-color);
  border-radius: 10px;
}
.preview-attrs { margin-bottom: 16px; }
.attr-title { font-size: 12px; color: #888; margin-bottom: 8px; }
.attr-row { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
.preview-effect-info { margin-bottom: 16px; }
.effect-title { font-size: 12px; color: #888; margin-bottom: 4px; }
.effect-desc { font-size: 12px; color: #aaa; }
.btn-equip-preview {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  width: 100%;
}

/* 加载 */
.loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}
.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255,255,255,0.1);
  border-top-color: #f093fb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
