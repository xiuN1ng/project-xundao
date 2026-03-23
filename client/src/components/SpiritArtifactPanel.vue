<template>
  <div class="spirit-artifact-panel">
    <h2>🔮 器灵系统</h2>
    
    <!-- 总属性加成 -->
    <div v-if="Object.keys(totalBonus).length > 0" class="total-bonus-card">
      <h3>📊 器灵总加成</h3>
      <div class="bonus-grid">
        <div v-for="(value, key) in totalBonus" :key="key" class="bonus-item">
          <span class="bonus-icon">{{ getAttrIcon(key) }}</span>
          <span class="bonus-value">+{{ value }}</span>
        </div>
      </div>
    </div>
    
    <!-- 标签页 -->
    <div class="tabs">
      <button 
        :class="{ active: activeTab === 'owned' }" 
        @click="activeTab = 'owned'"
      >
        我的器灵
      </button>
      <button 
        :class="{ active: activeTab === 'all' }" 
        @click="activeTab = 'all'"
      >
        器灵商店
      </button>
    </div>
    
    <!-- 我的器灵 -->
    <div v-if="activeTab === 'owned'" class="owned-section">
      <div v-if="myArtifacts.length === 0" class="empty-state">
        <span class="empty-icon">🔮</span>
        <p>暂无器灵</p>
        <p class="hint">前往器灵商店获取</p>
      </div>
      
      <div v-else class="artifact-list">
        <div 
          v-for="artifact in myArtifacts" 
          :key="artifact.id"
          class="artifact-card"
          :class="[artifact.rarity, { equipped: artifact.is_equipped }]"
        >
          <div class="artifact-icon">
            {{ getArtifactIcon(artifact.type) }}
          </div>
          <div class="artifact-info">
            <div class="artifact-name">
              {{ artifact.name }}
              <span class="artifact-level">Lv.{{ artifact.level }}</span>
            </div>
            <div class="artifact-rarity" :style="{ color: getRarityColor(artifact.rarity) }">
              {{ getRarityText(artifact.rarity) }}
            </div>
            <div class="artifact-attrs">
              <span v-for="(val, key) in getArtifactAttrs(artifact)" :key="key" class="attr-tag">
                {{ getAttrName(key) }}+{{ val }}
              </span>
            </div>
          </div>
          <div class="artifact-actions">
            <button 
              v-if="!artifact.is_equipped" 
              class="equip-btn"
              @click="equipArtifact(artifact.artifact_id)"
            >
              装备
            </button>
            <button 
              v-else 
              class="unequip-btn"
              @click="unequipArtifact(artifact.artifact_id)"
            >
              卸下
            </button>
            <button class="upgrade-btn" @click="upgradeArtifact(artifact.artifact_id)">
              升级
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 器灵商店 -->
    <div v-if="activeTab === 'all'" class="shop-section">
      <div class="artifact-list">
        <div 
          v-for="artifact in allArtifacts" 
          :key="artifact.id"
          class="artifact-card"
          :class="[artifact.rarity, { owned: artifact.is_owned }]"
        >
          <div class="artifact-icon">
            {{ getArtifactIcon(artifact.type) }}
          </div>
          <div class="artifact-info">
            <div class="artifact-name">{{ artifact.name }}</div>
            <div class="artifact-rarity" :style="{ color: getRarityColor(artifact.rarity) }">
              {{ getRarityText(artifact.rarity) }}
            </div>
            <div class="artifact-desc">{{ artifact.description }}</div>
            <div class="artifact-attrs">
              <span v-for="(val, key) in artifact.base_attributes" :key="key" class="attr-tag">
                {{ getAttrName(key) }}+{{ val }}
              </span>
            </div>
            <div class="unlock-req">
              解锁条件: 等级{{ artifact.unlock_level }} 境界{{ artifact.unlock_realm }}
            </div>
          </div>
          <div class="artifact-actions">
            <button 
              v-if="artifact.is_owned" 
              class="owned-btn"
              disabled
            >
              已拥有
            </button>
            <button 
              v-else 
              class="acquire-btn"
              @click="acquireArtifact(artifact.id)"
            >
              激活
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { usePlayerStore } from '../stores/player'

const playerStore = usePlayerStore()
const player = playerStore.player

const activeTab = ref('owned')
const myArtifacts = ref([])
const allArtifacts = ref([])
const totalBonus = ref({})

// 属性图标映射
const ATTR_ICONS = {
  attack: '⚔️',
  defense: '🛡️',
  hp: '❤️',
  crit: '💥',
  crit_damage: '💢',
  speed: '⚡',
  dodge: '💨'
}

const ATTR_NAMES = {
  attack: '攻击',
  defense: '防御',
  hp: '生命',
  crit: '暴击',
  crit_damage: '暴伤',
  speed: '速度',
  dodge: '闪避'
}

// 加载我的器灵
async function loadMyArtifacts() {
  try {
    const res = await fetch(`/api/spirit-artifact/my?player_id=${player.id}`)
    const data = await res.json()
    if (data.success) {
      myArtifacts.value = data.data.artifacts || []
      totalBonus.value = data.data.total_bonus || {}
    }
  } catch (e) {
    console.error('加载器灵失败:', e)
  }
}

// 加载所有器灵
async function loadAllArtifacts() {
  try {
    const res = await fetch(`/api/spirit-artifact/list?player_id=${player.id}`)
    const data = await res.json()
    if (data.success) {
      allArtifacts.value = data.data || []
    }
  } catch (e) {
    console.error('加载器灵列表失败:', e)
  }
}

// 激活器灵
async function acquireArtifact(artifactId) {
  try {
    const res = await fetch('/api/spirit-artifact/acquire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: player.id, artifact_id: artifactId })
    })
    const data = await res.json()
    if (data.success) {
      alert('激活成功！')
      loadMyArtifacts()
      loadAllArtifacts()
    } else {
      alert(data.error || '激活失败')
    }
  } catch (e) {
    console.error('激活失败:', e)
  }
}

// 装备器灵
async function equipArtifact(artifactId) {
  try {
    const res = await fetch('/api/spirit-artifact/equip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: player.id, artifact_id: artifactId })
    })
    const data = await res.json()
    if (data.success) {
      loadMyArtifacts()
    }
  } catch (e) {
    console.error('装备失败:', e)
  }
}

// 卸下器灵
async function unequipArtifact(artifactId) {
  try {
    const res = await fetch('/api/spirit-artifact/unequip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: player.id, artifact_id: artifactId })
    })
    const data = await res.json()
    if (data.success) {
      loadMyArtifacts()
    }
  } catch (e) {
    console.error('卸下失败:', e)
  }
}

// 升级器灵
async function upgradeArtifact(artifactId) {
  if (!confirm('确定要升级该器灵吗？')) return
  
  try {
    const res = await fetch('/api/spirit-artifact/upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: player.id, artifact_id: artifactId })
    })
    const data = await res.json()
    if (data.success) {
      alert(`升级成功！等级 ${data.data.old_level} → ${data.data.new_level}`)
      loadMyArtifacts()
    } else {
      alert(data.error || '升级失败')
    }
  } catch (e) {
    console.error('升级失败:', e)
  }
}

// 获取器灵图标
function getArtifactIcon(type) {
  const icons = {
    fire: '🔥',
    ice: '❄️',
    thunder: '⚡',
    wind: '💨',
    dragon: '🐉',
    metal: '🗡️',
    chaos: '🔮'
  }
  return icons[type] || '🔮'
}

// 获取稀有度颜色
function getRarityColor(rarity) {
  const colors = {
    common: '#94a3b8',
    uncommon: '#22c55e',
    rare: '#3b82f6',
    epic: '#a855f7',
    legendary: '#f59e0b',
    mythic: '#ef4444'
  }
  return colors[rarity] || '#94a3b8'
}

// 获取稀有度文本
function getRarityText(rarity) {
  const texts = {
    common: '普通',
    uncommon: '优秀',
    rare: '稀有',
    epic: '史诗',
    legendary: '传说',
    mythic: '神话'
  }
  return texts[rarity] || '普通'
}

// 获取属性图标
function getAttrIcon(key) {
  return ATTR_ICONS[key] || '📊'
}

// 获取属性名称
function getAttrName(key) {
  return ATTR_NAMES[key] || key
}

// 获取器灵属性
function getArtifactAttrs(artifact) {
  const levelBonus = 1 + (artifact.level - 1) * 0.1
  const attrs = {}
  if (artifact.base_attributes) {
    Object.entries(artifact.base_attributes).forEach(([key, val]) => {
      attrs[key] = Math.floor(val * levelBonus)
    })
  }
  return attrs
}

onMounted(() => {
  loadMyArtifacts()
  loadAllArtifacts()
})
</script>

<style scoped>
.spirit-artifact-panel {
  padding: 20px;
  background: #1a1a2e;
  border-radius: 12px;
}

.spirit-artifact-panel h2 {
  color: #f093fb;
  font-size: 24px;
  margin-bottom: 20px;
}

.spirit-artifact-panel h3 {
  color: #667eea;
  font-size: 16px;
  margin-bottom: 15px;
}

/* 总加成 */
.total-bonus-card {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 20px;
  border: 1px solid rgba(102, 126, 234, 0.3);
}

.bonus-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
}

.bonus-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 15px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 20px;
}

.bonus-icon {
  font-size: 18px;
}

.bonus-value {
  color: #4ade80;
  font-weight: bold;
}

/* 标签页 */
.tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.tabs button {
  flex: 1;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(102, 126, 234, 0.3);
  color: #fff;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.tabs button.active {
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-color: transparent;
}

/* 器灵列表 */
.artifact-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.artifact-card {
  display: flex;
  gap: 15px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 2px solid transparent;
  transition: all 0.3s;
}

.artifact-card.owned {
  opacity: 0.7;
}

.artifact-card.equipped {
  border-color: #4ade80;
}

.artifact-card.rare { border-left: 3px solid #3b82f6; }
.artifact-card.epic { border-left: 3px solid #a855f7; }
.artifact-card.legendary { border-left: 3px solid #f59e0b; }
.artifact-card.mythic { border-left: 3px solid #ef4444; }

.artifact-icon {
  font-size: 48px;
}

.artifact-info {
  flex: 1;
}

.artifact-name {
  color: #fff;
  font-weight: bold;
  font-size: 16px;
  margin-bottom: 5px;
}

.artifact-level {
  color: #f093fb;
  font-size: 12px;
  margin-left: 8px;
}

.artifact-rarity {
  font-size: 12px;
  margin-bottom: 8px;
}

.artifact-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 8px;
}

.artifact-attrs {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.attr-tag {
  font-size: 11px;
  padding: 3px 8px;
  background: rgba(102, 126, 234, 0.2);
  border-radius: 10px;
  color: #667eea;
}

.unlock-req {
  font-size: 11px;
  color: #fbbf24;
  margin-top: 8px;
}

.artifact-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.artifact-actions button {
  padding: 8px 15px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s;
}

.equip-btn {
  background: #22c55e;
  color: #fff;
}

.unequip-btn {
  background: #64748b;
  color: #fff;
}

.upgrade-btn {
  background: #f59e0b;
  color: #fff;
}

.acquire-btn {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
}

.owned-btn {
  background: #374151;
  color: #94a3b8;
  cursor: not-allowed;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 64px;
  opacity: 0.5;
}

.empty-state p {
  color: rgba(255, 255, 255, 0.6);
  margin: 10px 0;
}

.empty-state .hint {
  font-size: 12px;
  opacity: 0.5;
}
</style>
