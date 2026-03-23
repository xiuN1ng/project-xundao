<template>
  <div class="cave-dwelling-panel" v-if="visible">
    <div class="panel-header">
      <h2>🏔️ 洞府</h2>
      <button class="close-btn" @click="close">×</button>
    </div>

    <div class="panel-content">
      <!-- 洞府资源显示 -->
      <div class="resources-bar">
        <div class="resource-item">
          <span class="resource-icon">💎</span>
          <span class="resource-label">灵石:</span>
          <span class="resource-value">{{ formatNumber(caveData.resources.spiritStones) }}</span>
        </div>
        <div class="resource-item">
          <span class="resource-icon">🌟</span>
          <span class="resource-label">灵气:</span>
          <span class="resource-value">{{ formatNumber(caveData.resources.spirit) }}</span>
        </div>
        <div class="resource-item">
          <span class="resource-icon">🏠</span>
          <span class="resource-label">繁荣度:</span>
          <span class="resource-value prosperity">{{ caveData.prosperity }}/{{ caveData.maxProsperity }}</span>
        </div>
      </div>

      <!-- Tab 切换 -->
      <div class="cave-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="cave-tab"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-label">{{ tab.label }}</span>
        </button>
      </div>

      <!-- 修炼场所 -->
      <div class="cave-section" v-if="activeTab === 'cultivation'">
        <div class="section-title">🧘 修炼场所</div>
        <div class="cultivation-list">
          <div
            v-for="site in caveData.cultivationSites"
            :key="site.id"
            class="cultivation-card"
            :class="{ active: site.active, locked: !site.unlocked }"
          >
            <div class="site-icon">{{ site.icon }}</div>
            <div class="site-info">
              <div class="site-name">
                {{ site.name }}
                <span v-if="site.unlocked" class="unlocked-badge">已解锁</span>
                <span v-else class="locked-badge">🔒</span>
              </div>
              <div class="site-desc">{{ site.desc }}</div>
              <div class="site-effect">
                效果: {{ site.effect }}
              </div>
              <div class="site-bonus" v-if="site.unlocked">
                修炼效率: <span class="bonus-value">×{{ site.cultivationRate }}</span>
              </div>
              <div class="site-unlock-req" v-if="!site.unlocked">
                解锁条件: {{ site.unlockCondition }}
              </div>
            </div>
            <div class="site-action" v-if="site.unlocked">
              <button
                class="enter-btn"
                :class="{ selected: activeCultivation === site.id }"
                @click="toggleCultivation(site)"
              >
                {{ activeCultivation === site.id ? '退出修炼' : '进入修炼' }}
              </button>
              <div class="site-time" v-if="activeCultivation === site.id">
                修炼中... ⏳
              </div>
            </div>
            <div class="site-action" v-else>
              <button
                class="unlock-btn"
                :disabled="!canUnlock(site)"
                @click="unlockSite(site)"
              >
                解锁
              </button>
              <div class="unlock-cost" v-if="!canUnlock(site)">
                需: {{ site.unlockCost }} 繁荣度
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 资源采集 -->
      <div class="cave-section" v-if="activeTab === 'collection'">
        <div class="section-title">⛏️ 资源采集</div>
        <div class="collection-info">
          <div class="collection-status">
            <div class="status-icon">🌍</div>
            <div class="status-text">
              <div class="status-title">洞府产出</div>
              <div class="status-desc">在洞府中可以进行资源采集，获得灵石、灵草、矿石等</div>
            </div>
          </div>
          <div class="collection-timer" v-if="collectionCooldown > 0">
            <span class="timer-icon">⏱️</span>
            <span>采集冷却: {{ collectionCooldown }}秒</span>
          </div>
        </div>

        <div class="collection-list">
          <div
            v-for="spot in caveData.collectionSpots"
            :key="spot.id"
            class="collection-card"
            :class="{ exhausted: spot.remaining <= 0 }"
          >
            <div class="spot-icon">{{ spot.icon }}</div>
            <div class="spot-info">
              <div class="spot-name">{{ spot.name }}</div>
              <div class="spot-desc">{{ spot.desc }}</div>
              <div class="spot-remaining">
                剩余次数: <span :class="{ zero: spot.remaining <= 0 }">{{ spot.remaining }}/{{ spot.maxRemaining }}</span>
              </div>
              <div class="spot-yield">
                产出: <span v-for="(yield_item, idx) in spot.yield" :key="idx" class="yield-tag">{{ yield_item.icon }}{{ yield_item.amount }}</span>
              </div>
            </div>
            <button
              class="collect-btn"
              :disabled="spot.remaining <= 0 || collectionCooldown > 0"
              @click="collectResource(spot)"
            >
              {{ spot.remaining <= 0 ? '已耗尽' : '采集' }}
            </button>
          </div>
        </div>

        <!-- 采集历史 -->
        <div class="collection-log" v-if="collectionLog.length > 0">
          <div class="log-title">📜 采集记录</div>
          <div class="log-list">
            <div class="log-item" v-for="(log, idx) in collectionLog.slice(0, 5)" :key="idx">
              <span class="log-icon">{{ log.icon }}</span>
              <span class="log-text">{{ log.text }}</span>
              <span class="log-time">{{ log.time }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 装饰升级 -->
      <div class="cave-section" v-if="activeTab === 'decoration'">
        <div class="section-title">🏗️ 洞府装饰与升级</div>

        <div class="decoration-list">
          <div
            v-for="deco in caveData.decorations"
            :key="deco.id"
            class="decoration-card"
            :class="{ 'max-level': deco.level >= deco.maxLevel }"
          >
            <div class="deco-icon">{{ deco.icon }}</div>
            <div class="deco-info">
              <div class="deco-name">
                {{ deco.name }}
                <span v-if="deco.level >= deco.maxLevel" class="max-badge">满级</span>
                <span v-else class="level-badge">Lv.{{ deco.level }}</span>
              </div>
              <div class="deco-desc">{{ deco.desc }}</div>
              <div class="deco-effect">
                效果: {{ deco.effect }}
              </div>
              <div class="deco-progress">
                <div class="progress-track">
                  <div class="progress-fill" :style="{ width: (deco.level / deco.maxLevel * 100) + '%' }"></div>
                </div>
                <span class="progress-text">{{ deco.level }}/{{ deco.maxLevel }}</span>
              </div>
            </div>
            <div class="deco-action">
              <div class="upgrade-cost" v-if="deco.level < deco.maxLevel">
                <div
                  class="cost-item"
                  :class="{ insufficient: caveData.resources.spiritStones < deco.upgradeCost.stones }"
                >
                  <span>💎</span>
                  <span>{{ formatNumber(deco.upgradeCost.stones) }}</span>
                </div>
                <div
                  class="cost-item"
                  :class="{ insufficient: caveData.resources.spirit < deco.upgradeCost.spirit }"
                >
                  <span>🌟</span>
                  <span>{{ formatNumber(deco.upgradeCost.spirit) }}</span>
                </div>
              </div>
              <button
                class="upgrade-btn"
                :disabled="deco.level >= deco.maxLevel || !canUpgradeDeco(deco)"
                @click="upgradeDeco(deco)"
              >
                {{ deco.level >= deco.maxLevel ? '已满级' : '升级' }}
              </button>
            </div>
          </div>
        </div>

        <!-- 繁荣度提升说明 -->
        <div class="prosperity-tip">
          💡 升级装饰可提升洞府繁荣度，繁荣度越高可解锁更多修炼场所
        </div>
      </div>
    </div>

    <!-- 操作提示 -->
    <div class="cave-tip" v-if="actionMessage">
      <span>{{ actionMessage }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';

const visible = ref(false);
const activeTab = ref('cultivation');
const activeCultivation = ref(null);
const collectionCooldown = ref(0);
const collectionLog = ref([]);
const actionMessage = ref('');

const tabs = [
  { key: 'cultivation', label: '修炼', icon: '🧘' },
  { key: 'collection', label: '采集', icon: '⛏️' },
  { key: 'decoration', label: '装饰', icon: '🏗️' },
];

const caveData = reactive({
  resources: {
    spiritStones: 85600,
    spirit: 4200,
  },
  prosperity: 120,
  maxProsperity: 500,
  cultivationSites: [
    {
      id: 'meditation_room',
      name: '静心阁',
      icon: '🧘',
      desc: '洞府核心修炼场所，灵气充沛',
      effect: '基础修炼效率+20%',
      cultivationRate: 1.2,
      unlocked: true,
      active: false,
      unlockCost: 0,
      unlockCondition: '',
    },
    {
      id: 'spirit_cave',
      name: '灵洞',
      icon: '🌌',
      desc: '天然形成的灵穴，灵气浓郁',
      effect: '修炼效率+35%，额外灵气产出',
      cultivationRate: 1.35,
      unlocked: true,
      active: false,
      unlockCost: 0,
      unlockCondition: '',
    },
    {
      id: 'thunder_chamber',
      name: '雷霆室',
      icon: '⚡',
      desc: '以天雷淬体，修炼攻击类功法有奇效',
      effect: '攻击修炼+50%',
      cultivationRate: 1.5,
      unlocked: false,
      active: false,
      unlockCost: 200,
      unlockCondition: '繁荣度达到200',
    },
    {
      id: 'elixir_garden',
      name: '丹药园',
      icon: '🌿',
      desc: '灵药种植园，可同时修炼和炼制丹药',
      effect: '修炼效率+25%，丹药效果+10%',
      cultivationRate: 1.25,
      unlocked: false,
      active: false,
      unlockCost: 300,
      unlockCondition: '繁荣度达到300',
    },
    {
      id: 'dragon_vein',
      name: '龙脉之地',
      icon: '🐉',
      desc: '传说中真龙陨落之地，蕴含无上力量',
      effect: '全属性修炼+100%',
      cultivationRate: 2.0,
      unlocked: false,
      active: false,
      unlockCost: 500,
      unlockCondition: '繁荣度达到500',
    },
  ],
  collectionSpots: [
    {
      id: 'spirit_mine',
      name: '灵石矿脉',
      icon: '💎',
      desc: '洞府中天然形成的灵石矿脉',
      remaining: 5,
      maxRemaining: 10,
      yield: [
        { icon: '💎', amount: '+500~2000 灵石' },
      ],
    },
    {
      id: 'spirit_herb',
      name: '灵草田',
      icon: '🌿',
      desc: '灵气充沛的药田',
      remaining: 3,
      maxRemaining: 5,
      yield: [
        { icon: '🌿', amount: '+1~3 灵草' },
        { icon: '💎', amount: '+200 灵石' },
      ],
    },
    {
      id: 'spirit_ore',
      name: '灵矿',
      icon: '🪨',
      desc: '蕴含灵气的矿石',
      remaining: 8,
      maxRemaining: 15,
      yield: [
        { icon: '🔩', amount: '+1~5 灵矿' },
        { icon: '💎', amount: '+100 灵石' },
      ],
    },
    {
      id: 'ancient_wood',
      name: '古木林',
      icon: '🌳',
      desc: '生长千年的古树群',
      remaining: 4,
      maxRemaining: 8,
      yield: [
        { icon: '🪵', amount: '+2~6 古木' },
        { icon: '🌟', amount: '+50 灵气' },
      ],
    },
  ],
  decorations: [
    {
      id: 'altar',
      name: '祭台',
      icon: '🏺',
      desc: '供奉天地灵气，提升洞府根基',
      effect: '繁荣度上限+50，灵气回复+5%/小时',
      level: 3,
      maxLevel: 10,
      upgradeCost: { stones: 5000, spirit: 200 },
    },
    {
      id: 'spirit_pool',
      name: '灵池',
      icon: '💧',
      desc: '汇聚天地灵气，浸泡其中可提升修炼速度',
      effect: '修炼效率+10%（可叠加）',
      level: 2,
      maxLevel: 10,
      upgradeCost: { stones: 8000, spirit: 300 },
    },
    {
      id: 'spirit_beacon',
      name: '灵炬',
      icon: '🔥',
      desc: '点燃后可汇聚灵气，提升灵石产出',
      effect: '灵石产出+15%（可叠加）',
      level: 1,
      maxLevel: 10,
      upgradeCost: { stones: 6000, spirit: 250 },
    },
    {
      id: 'ancient_tree',
      name: '古树',
      icon: '🌳',
      desc: '千年古树有灵，护佑洞府安宁',
      effect: '采集资源额外+10%，繁荣度+20',
      level: 4,
      maxLevel: 10,
      upgradeCost: { stones: 10000, spirit: 400 },
    },
    {
      id: 'dragon_statue',
      name: '龙柱',
      icon: '🐉',
      desc: '以真龙之魂铸就的雕像，震慑四方邪祟',
      effect: '修炼时减少心魔干扰，渡劫成功率+5%',
      level: 0,
      maxLevel: 5,
      upgradeCost: { stones: 20000, spirit: 1000 },
    },
  ],
});

function formatNumber(num) {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万';
  }
  return num.toString();
}

function canUnlock(site) {
  return caveData.prosperity >= site.unlockCost;
}

function canUpgradeDeco(deco) {
  return caveData.resources.spiritStones >= deco.upgradeCost.stones &&
         caveData.resources.spirit >= deco.upgradeCost.spirit;
}

function toggleCultivation(site) {
  if (activeCultivation.value === site.id) {
    activeCultivation.value = null;
    showMessage('已退出修炼场所');
  } else {
    activeCultivation.value = site.id;
    showMessage(`已进入「${site.name}」修炼`);
  }
}

async function unlockSite(site) {
  if (!canUnlock(site)) {
    showMessage('繁荣度不足，无法解锁', 'error');
    return;
  }
  try {
    const response = await fetch('/api/cave/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId: site.id }),
    });
    if (response.ok) {
      site.unlocked = true;
      caveData.prosperity -= site.unlockCost;
      showMessage(`「${site.name}」解锁成功！`);
    }
  } catch (e) {
    // 模拟成功
    site.unlocked = true;
    caveData.prosperity -= site.unlockCost;
    showMessage(`「${site.name}」解锁成功！`);
  }
}

async function collectResource(spot) {
  if (spot.remaining <= 0 || collectionCooldown.value > 0) return;

  try {
    const response = await fetch('/api/cave/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spotId: spot.id }),
    });
    if (response.ok) {
      const data = await response.json();
      spot.remaining--;
      caveData.resources.spiritStones += data.rewards.spiritStones || 0;
      caveData.resources.spirit += data.rewards.spirit || 0;
      collectionLog.value.unshift({
        icon: spot.icon,
        text: `采集「${spot.name}」获得: ${spot.yield.map(y => y.amount).join(', ')}`,
        time: new Date().toLocaleTimeString(),
      });
      showMessage('采集成功！');
    }
  } catch (e) {
    // 模拟采集成功
    spot.remaining--;
    const randomYield = spot.yield[Math.floor(Math.random() * spot.yield.length)];
    collectionLog.value.unshift({
      icon: spot.icon,
      text: `采集「${spot.name}」获得: ${randomYield.amount}`,
      time: new Date().toLocaleTimeString(),
    });
    showMessage('采集成功！');
  }

  // 冷却
  collectionCooldown.value = 5;
  const timer = setInterval(() => {
    collectionCooldown.value--;
    if (collectionCooldown.value <= 0) clearInterval(timer);
  }, 1000);
}

async function upgradeDeco(deco) {
  if (deco.level >= deco.maxLevel || !canUpgradeDeco(deco)) return;

  try {
    const response = await fetch('/api/cave/upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decorationId: deco.id }),
    });
    if (response.ok) {
      deco.level++;
      caveData.resources.spiritStones -= deco.upgradeCost.stones;
      caveData.resources.spirit -= deco.upgradeCost.spirit;
      // 升级后费用递增
      deco.upgradeCost.stones = Math.floor(deco.upgradeCost.stones * 1.5);
      deco.upgradeCost.spirit = Math.floor(deco.upgradeCost.spirit * 1.5);
      // 繁荣度提升
      caveData.prosperity += Math.floor(deco.level * 5);
      showMessage(`「${deco.name}」升级成功！等级提升至${deco.level}`);
    }
  } catch (e) {
    // 模拟成功
    deco.level++;
    caveData.resources.spiritStones -= deco.upgradeCost.stones;
    caveData.resources.spirit -= deco.upgradeCost.spirit;
    deco.upgradeCost.stones = Math.floor(deco.upgradeCost.stones * 1.5);
    deco.upgradeCost.spirit = Math.floor(deco.upgradeCost.spirit * 1.5);
    caveData.prosperity += Math.floor(deco.level * 5);
    showMessage(`「${deco.name}」升级成功！等级提升至${deco.level}`);
  }
}

async function loadData() {
  try {
    const response = await fetch('/api/cave/data');
    if (response.ok) {
      const data = await response.json();
      if (data.resources) caveData.resources = data.resources;
      if (data.prosperity !== undefined) caveData.prosperity = data.prosperity;
      if (data.cultivationSites) caveData.cultivationSites = data.cultivationSites;
      if (data.collectionSpots) caveData.collectionSpots = data.collectionSpots;
      if (data.decorations) caveData.decorations = data.decorations;
    }
  } catch (e) {
    console.log('洞府数据加载失败，使用默认数据');
  }
}

function showMessage(msg, type = 'info') {
  actionMessage.value = msg;
  if (window.showMessage) {
    window.showMessage(msg, type);
  }
  setTimeout(() => {
    actionMessage.value = '';
  }, 3000);
}

function show() {
  visible.value = true;
  loadData();
}

function close() {
  visible.value = false;
}

onMounted(() => {
  // 被动加载
});

defineExpose({
  show,
  close,
});
</script>

<style scoped>
.cave-dwelling-panel {
  width: 620px;
  max-height: 85vh;
  background: linear-gradient(rgba(26, 26, 46, 0.88), rgba(22, 33, 62, 0.92)), url('../assets/bg-cave-dwelling.png') center/cover no-repeat;
  border: 2px solid #b8860b;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(184, 134, 11, 0.15);
  overflow: hidden;
  position: relative;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(90deg, #b8860b, #daa520, #b8860b);
  color: white;
}

.panel-header h2 {
  margin: 0;
  font-size: 20px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 28px;
  cursor: pointer;
  line-height: 1;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.panel-content {
  padding: 16px;
  max-height: 75vh;
  overflow-y: auto;
}

/* 资源栏 */
.resources-bar {
  display: flex;
  justify-content: center;
  gap: 24px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  margin-bottom: 16px;
  border: 1px solid rgba(184, 134, 11, 0.2);
}

.resource-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}

.resource-icon {
  font-size: 16px;
}

.resource-label {
  color: #a0a0b8;
}

.resource-value {
  color: #ffd700;
  font-weight: bold;
}

.resource-value.prosperity {
  color: #40e0d0;
}

/* Tab 切换 */
.cave-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  background: rgba(0, 0, 0, 0.2);
  padding: 8px;
  border-radius: 10px;
}

.cave-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid transparent;
  border-radius: 8px;
  color: #a0a0b8;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.cave-tab:hover {
  background: rgba(184, 134, 11, 0.1);
  color: #e8e8f0;
}

.cave-tab.active {
  background: linear-gradient(135deg, rgba(184, 134, 11, 0.3), rgba(218, 165, 32, 0.3));
  border-color: rgba(218, 165, 32, 0.5);
  color: #ffd700;
  font-weight: bold;
}

/* Section */
.cave-section {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.section-title {
  font-size: 15px;
  color: #daa520;
  margin-bottom: 12px;
  font-weight: bold;
  padding-left: 4px;
  border-left: 3px solid #daa520;
}

/* 修炼场所 */
.cultivation-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cultivation-card {
  display: flex;
  align-items: stretch;
  padding: 14px;
  background: rgba(74, 105, 189, 0.12);
  border: 1px solid rgba(74, 105, 189, 0.25);
  border-radius: 12px;
  transition: all 0.3s;
}

.cultivation-card:hover {
  background: rgba(74, 105, 189, 0.2);
  transform: translateY(-2px);
}

.cultivation-card.active {
  border-color: rgba(0, 255, 255, 0.4);
  background: rgba(0, 255, 255, 0.05);
}

.cultivation-card.locked {
  opacity: 0.7;
}

.site-icon {
  font-size: 38px;
  margin-right: 14px;
  display: flex;
  align-items: center;
}

.site-info {
  flex: 1;
}

.site-name {
  font-size: 15px;
  font-weight: bold;
  color: #e8e8f0;
  margin-bottom: 4px;
}

.unlocked-badge {
  font-size: 10px;
  background: linear-gradient(135deg, #00ff88, #00cc66);
  color: #0a0a12;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 8px;
  font-weight: bold;
}

.locked-badge {
  margin-left: 8px;
}

.site-desc {
  font-size: 12px;
  color: #8b9dc3;
  margin-bottom: 6px;
}

.site-effect {
  font-size: 12px;
  color: #40e0d0;
  margin-bottom: 4px;
}

.site-bonus {
  font-size: 12px;
  color: #a0a0b8;
}

.bonus-value {
  color: #ffd700;
  font-weight: bold;
}

.site-unlock-req {
  font-size: 11px;
  color: #ff8c00;
}

.site-action {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  margin-left: 14px;
  min-width: 100px;
  gap: 6px;
}

.enter-btn {
  padding: 8px 16px;
  background: linear-gradient(135deg, #40e0d0, #00ffff);
  border: none;
  border-radius: 8px;
  color: #0a0a12;
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.enter-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(64, 224, 208, 0.4);
}

.enter-btn.selected {
  background: linear-gradient(135deg, #ff8c00, #ff6600);
  color: white;
}

.unlock-btn {
  padding: 8px 16px;
  background: linear-gradient(135deg, #b8860b, #daa520);
  border: none;
  border-radius: 8px;
  color: #0a0a12;
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.unlock-btn:disabled {
  background: #636e72;
  cursor: not-allowed;
  color: #a0a0b8;
}

.unlock-cost {
  font-size: 11px;
  color: #ff8c00;
}

.site-time {
  font-size: 12px;
  color: #40e0d0;
}

/* 资源采集 */
.collection-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  margin-bottom: 16px;
}

.collection-status {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-icon {
  font-size: 32px;
}

.status-title {
  font-size: 14px;
  color: #e8e8f0;
  font-weight: bold;
}

.status-desc {
  font-size: 12px;
  color: #8b9dc3;
}

.collection-timer {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #ff8c00;
}

.timer-icon {
  font-size: 16px;
}

.collection-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.collection-card {
  display: flex;
  align-items: center;
  padding: 14px;
  background: rgba(74, 105, 189, 0.12);
  border: 1px solid rgba(74, 105, 189, 0.25);
  border-radius: 12px;
  transition: all 0.3s;
}

.collection-card:hover {
  background: rgba(74, 105, 189, 0.2);
  transform: translateY(-2px);
}

.collection-card.exhausted {
  opacity: 0.5;
}

.spot-icon {
  font-size: 32px;
  margin-right: 10px;
}

.spot-info {
  flex: 1;
  min-width: 0;
}

.spot-name {
  font-size: 13px;
  font-weight: bold;
  color: #e8e8f0;
  margin-bottom: 3px;
}

.spot-desc {
  font-size: 11px;
  color: #8b9dc3;
  margin-bottom: 4px;
}

.spot-remaining {
  font-size: 11px;
  color: #a0a0b8;
  margin-bottom: 4px;
}

.spot-remaining .zero {
  color: #ff4444;
}

.spot-yield {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.yield-tag {
  font-size: 11px;
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 6px;
  border-radius: 4px;
  color: #a0a0b8;
}

.collect-btn {
  margin-left: 8px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #b8860b, #daa520);
  border: none;
  border-radius: 8px;
  color: #0a0a12;
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
}

.collect-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(184, 134, 11, 0.4);
}

.collect-btn:disabled {
  background: #636e72;
  cursor: not-allowed;
  color: #a0a0b8;
}

/* 采集日志 */
.collection-log {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  padding: 12px;
}

.log-title {
  font-size: 13px;
  color: #daa520;
  margin-bottom: 8px;
  font-weight: bold;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.log-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #a0a0b8;
}

.log-icon {
  font-size: 14px;
}

.log-text {
  flex: 1;
}

.log-time {
  font-size: 11px;
  color: #606080;
}

/* 装饰升级 */
.decoration-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.decoration-card {
  display: flex;
  align-items: stretch;
  padding: 14px;
  background: rgba(184, 134, 11, 0.08);
  border: 1px solid rgba(184, 134, 11, 0.2);
  border-radius: 12px;
  transition: all 0.3s;
}

.decoration-card:hover {
  background: rgba(184, 134, 11, 0.15);
  transform: translateY(-2px);
}

.decoration-card.max-level {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.08);
}

.deco-icon {
  font-size: 38px;
  margin-right: 14px;
  display: flex;
  align-items: center;
}

.deco-info {
  flex: 1;
}

.deco-name {
  font-size: 15px;
  font-weight: bold;
  color: #e8e8f0;
  margin-bottom: 4px;
}

.max-badge {
  font-size: 10px;
  background: linear-gradient(135deg, #ffd700, #ffaa00);
  color: #1a1a2e;
  padding: 2px 8px;
  border-radius: 4px;
  margin-left: 8px;
  font-weight: bold;
}

.level-badge {
  font-size: 10px;
  background: linear-gradient(135deg, #b8860b, #daa520);
  color: #0a0a12;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 8px;
  font-weight: bold;
}

.deco-desc {
  font-size: 12px;
  color: #8b9dc3;
  margin-bottom: 6px;
}

.deco-effect {
  font-size: 12px;
  color: #40e0d0;
  margin-bottom: 6px;
}

.deco-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.progress-track {
  flex: 1;
  height: 6px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #b8860b, #daa520);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 11px;
  color: #a0a0b8;
  white-space: nowrap;
}

/* 装饰操作区 */
.deco-action {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  margin-left: 14px;
  min-width: 120px;
}

.upgrade-cost {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.cost-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #a4b0de;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.cost-item.insufficient {
  color: #e74c3c;
  background: rgba(231, 76, 60, 0.2);
}

.upgrade-btn {
  padding: 10px 20px;
  background: linear-gradient(135deg, #b8860b, #daa520);
  border: none;
  border-radius: 8px;
  color: #0a0a12;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.upgrade-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(184, 134, 11, 0.4);
}

.upgrade-btn:disabled {
  background: #636e72;
  cursor: not-allowed;
  color: #a0a0b8;
}

/* 繁荣度提示 */
.prosperity-tip {
  text-align: center;
  color: #8b9dc3;
  font-size: 12px;
  margin-top: 16px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
}

/* 操作提示 */
.cave-tip {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.85);
  color: #ffd700;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 13px;
  border: 1px solid rgba(218, 165, 32, 0.4);
  white-space: nowrap;
  z-index: 10;
  animation: tipFade 3s forwards;
}

@keyframes tipFade {
  0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
  10% { opacity: 1; transform: translateX(-50%) translateY(0); }
  80% { opacity: 1; }
  100% { opacity: 0; }
}

/* 滚动条 */
.panel-content::-webkit-scrollbar {
  width: 6px;
}

.panel-content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb {
  background: #b8860b;
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: #daa520;
}

/* 响应式 */
@media (max-width: 640px) {
  .cave-dwelling-panel {
    width: 95vw;
    max-height: 90vh;
  }

  .resources-bar {
    gap: 12px;
    flex-wrap: wrap;
  }

  .collection-list {
    grid-template-columns: 1fr;
  }

  .cultivation-card,
  .decoration-card {
    flex-wrap: wrap;
  }

  .site-action,
  .deco-action {
    width: 100%;
    flex-direction: row;
    align-items: center;
    margin-left: 0;
    margin-top: 8px;
    justify-content: space-between;
  }
}
</style>