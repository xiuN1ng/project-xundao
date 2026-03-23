<template>
  <div class="guild-panel" v-if="visible">
    <div class="panel-header">
      <h2>🏛️ 仙盟</h2>
      <button class="close-btn" @click="close">×</button>
    </div>
    
    <div class="panel-tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        :class="['tab-btn', { active: currentTab === tab.id }]"
        @click="currentTab = tab.id"
      >
        {{ tab.icon }} {{ tab.name }}
      </button>
    </div>
    
    <div class="panel-content">
      <!-- 未加入仙盟 -->
      <div v-if="!hasGuild && currentTab === 'info'" class="no-guild">
        <div class="no-guild-icon">🏛️</div>
        <div class="no-guild-text">您还没有加入仙盟</div>
        <div class="no-guild-actions">
          <button class="action-btn primary" @click="showCreateGuild">
            创建仙盟
          </button>
          <button class="action-btn" @click="currentTab = 'join'">
            加入仙盟
          </button>
        </div>
      </div>
      
      <!-- 创建仙盟 -->
      <div v-if="currentTab === 'create'" class="create-guild">
        <h3>✨ 创建仙盟</h3>
        <div class="form-group">
          <label>仙盟名称</label>
          <input 
            type="text" 
            v-model="createForm.name" 
            placeholder="请输入仙盟名称"
            maxlength="10"
          />
        </div>
        <div class="form-group">
          <label>仙盟宣言</label>
          <textarea 
            v-model="createForm.description" 
            placeholder="请输入仙盟宣言"
            maxlength="50"
            rows="2"
          ></textarea>
        </div>
        <div class="form-group">
          <label>创建费用</label>
          <div class="cost-info">💰 10000 灵石</div>
        </div>
        <button 
          class="create-btn" 
          :disabled="!canCreate"
          @click="createGuild"
        >
          🏛️ 创建仙盟
        </button>
      </div>
      
      <!-- 加入仙盟 -->
      <div v-if="currentTab === 'join'" class="join-guild">
        <h3>🔍 加入仙盟</h3>
        <div class="guild-list">
          <div 
            v-for="guild in availableGuilds" 
            :key="guild.id" 
            class="guild-item"
          >
            <div class="guild-emblem">{{ guild.icon }}</div>
            <div class="guild-details">
              <div class="guild-name">{{ guild.name }}</div>
              <div class="guild-info">
                等级 {{ guild.level }} · {{ guild.memberCount }}/{{ guild.maxMembers }}人
              </div>
              <div class="guild-desc">{{ guild.description }}</div>
            </div>
            <button 
              class="join-btn" 
              :disabled="guild.memberCount >= guild.maxMembers"
              @click="joinGuild(guild)"
            >
              加入
            </button>
          </div>
        </div>
      </div>
      
      <!-- 仙盟信息 -->
      <div v-if="hasGuild && currentTab === 'info'" class="guild-info">
        <div class="guild-emblem">{{ guildData.icon || '🏛️' }}</div>
        <div class="guild-name">{{ guildData.name }}</div>
        <div class="guild-level">等级: {{ guildData.level }}</div>
        <div class="guild-members">成员: {{ guildData.memberCount }}/{{ guildData.maxMembers }}</div>
        <div class="guild-resources">
          <div class="resource-item">
            <span class="label">灵石:</span>
            <span class="value">{{ formatNumber(guildData.resources?.gold || 0) }}</span>
          </div>
          <div class="resource-item">
            <span class="label">贡献:</span>
            <span class="value">{{ formatNumber(guildData.contribution || 0) }}</span>
          </div>
        </div>
        <div class="guild-actions">
          <button class="guild-action-btn" @click="currentTab = 'build'">
            建设仙盟
          </button>
          <button class="guild-action-btn" @click="currentTab = 'members'">
            成员管理
          </button>
        </div>
      </div>
      
      <!-- 建设/升级 -->
      <div v-if="hasGuild && currentTab === 'build'" class="guild-build">
        <h3>🏗️ 仙盟建设</h3>
        <div class="build-items">
          <div v-for="building in buildings" :key="building.id" class="build-item">
            <div class="building-icon">{{ building.icon }}</div>
            <div class="building-info">
              <div class="building-name">{{ building.name }}</div>
              <div class="building-level">等级 {{ building.level }} / {{ building.maxLevel }}</div>
              <div class="building-progress">
                <div class="progress-bar" :style="{ width: (building.level / building.maxLevel * 100) + '%' }"></div>
              </div>
            </div>
            <button 
              class="upgrade-btn" 
              :disabled="building.level >= building.maxLevel || !canUpgrade(building)"
              @click="upgradeBuilding(building)"
            >
              升级
            </button>
          </div>
        </div>
      </div>
      
      <!-- 成员列表 -->
      <div v-if="hasGuild && currentTab === 'members'" class="guild-members-list">
        <h3>👥 仙盟成员</h3>
        <div class="member-list">
          <div v-for="member in members" :key="member.id" class="member-item">
            <div class="member-avatar">{{ member.avatar }}</div>
            <div class="member-info">
              <div class="member-name">
                {{ member.name }}
                <span v-if="member.isLeader" class="leader-badge">盟主</span>
              </div>
              <div class="member-title">{{ member.title }}</div>
              <div class="member-contribution">贡献: {{ formatNumber(member.contribution) }}</div>
            </div>
            <div class="member-actions" v-if="isLeader && !member.isLeader">
              <button @click="kickMember(member)" class="kick-btn">踢出</button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 活动 -->
      <div v-if="hasGuild && currentTab === 'activity'" class="guild-activity">
        <h3>🎯 仙盟活动</h3>
        <div class="activity-list">
          <div v-for="activity in activities" :key="activity.id" class="activity-item">
            <div class="activity-icon">{{ activity.icon }}</div>
            <div class="activity-info">
              <div class="activity-name">{{ activity.name }}</div>
              <div class="activity-time">{{ formatTime(activity.time) }}</div>
              <div class="activity-reward">奖励: {{ activity.reward }}</div>
            </div>
            <button class="join-btn" @click="joinActivity(activity)">参加</button>
          </div>
        </div>
      </div>
      
      <!-- 仓库 -->
      <div v-if="hasGuild && currentTab === 'warehouse'" class="guild-warehouse">
        <h3>📦 仙盟仓库</h3>
        <div class="warehouse-tabs">
          <button 
            v-for="tab in warehouseTabs" 
            :key="tab"
            :class="['warehouse-tab', { active: currentWarehouseTab === tab }]"
            @click="currentWarehouseTab = tab"
          >
            {{ tab }}
          </button>
        </div>
        <div class="warehouse-items">
          <div v-for="item in filteredWarehouseItems" :key="item.id" class="warehouse-item">
            <div class="item-icon">{{ item.icon }}</div>
            <div class="item-info">
              <div class="item-name">{{ item.name }}</div>
              <div class="item-quality" :class="'quality-' + item.quality">{{ item.quality }}</div>
            </div>
            <button class="request-btn" @click="requestItem(item)">申请</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

const visible = ref(false);
const currentTab = ref('info');
const currentWarehouseTab = ref('全部');
const hasGuild = ref(true);
const isLeader = ref(true);

const tabs = [
  { id: 'info', name: '仙盟信息', icon: '🏛️' },
  { id: 'create', name: '创建', icon: '✨' },
  { id: 'join', name: '加入', icon: '🔍' },
  { id: 'build', name: '建设', icon: '🏗️' },
  { id: 'members', name: '成员', icon: '👥' },
  { id: 'activity', name: '活动', icon: '🎯' },
  { id: 'warehouse', name: '仓库', icon: '📦' }
];

const warehouseTabs = ['全部', '装备', '材料', '道具'];

const createForm = ref({
  name: '',
  description: ''
});

const guildData = ref({
  name: '青云仙盟',
  level: 5,
  memberCount: 28,
  maxMembers: 50,
  icon: '🏛️',
  resources: {
    gold: 125000,
    contribution: 5600
  }
});

const buildings = ref([
  { id: 'hall', name: '议事大厅', icon: '🏛️', level: 5, maxLevel: 10, cost: { gold: 50000, contribution: 1000 } },
  { id: 'depot', name: '资源仓库', icon: '🏭', level: 4, maxLevel: 10, cost: { gold: 30000, contribution: 600 } },
  { id: 'training', name: '修炼室', icon: '⚔️', level: 3, maxLevel: 10, cost: { gold: 20000, contribution: 400 } },
  { id: 'shop', name: '仙盟商店', icon: '🏪', level: 4, maxLevel: 10, cost: { gold: 25000, contribution: 500 } }
]);

const members = ref([
  { id: 1, name: '盟主大人', title: '盟主', contribution: 15000, avatar: '👑', isLeader: true },
  { id: 2, name: '副盟主A', title: '副盟主', contribution: 12000, avatar: '⚔️', isLeader: false },
  { id: 3, name: '长老B', title: '长老', contribution: 8000, avatar: '🛡️', isLeader: false },
  { id: 4, name: '弟子C', title: '核心弟子', contribution: 5000, avatar: '🎯', isLeader: false },
  { id: 5, name: '弟子D', title: '普通弟子', contribution: 2000, avatar: '🌟', isLeader: false }
]);

const activities = ref([
  { id: 1, name: '仙盟战', icon: '⚔️', time: Date.now() + 3600000, reward: '大量贡献' },
  { id: 2, name: '副本挑战', icon: '🗝️', time: Date.now() + 7200000, reward: '稀有装备' },
  { id: 3, name: '资源采集', icon: '⛏️', time: Date.now() + 10800000, reward: '灵石' }
]);

const warehouseItems = ref([
  { id: 1, name: '极品飞剑', quality: '史诗', category: '装备', icon: '🗡️' },
  { id: 2, name: '灵草', quality: '稀有', category: '材料', icon: '🌿' },
  { id: 3, name: '突破丹', quality: '稀有', category: '道具', icon: '💊' },
  { id: 4, name: '黄金战甲', quality: '传说', category: '装备', icon: '🛡️' }
]);

const availableGuilds = ref([
  { id: 1, name: '天剑宗', level: 8, memberCount: 45, maxMembers: 50, icon: '⚔️', description: '剑修第一宗门' },
  { id: 2, name: '灵兽山', level: 6, memberCount: 30, maxMembers: 50, icon: '🐉', description: '御兽之道' },
  { id: 3, name: '丹霞派', level: 5, memberCount: 20, maxMembers: 40, icon: '🧪', description: '炼丹炼器' },
  { id: 4, name: '青云观', level: 3, memberCount: 10, maxMembers: 30, icon: '☁️', description: '道法自然' }
]);

const canCreate = computed(() => {
  return createForm.value.name.length >= 2;
});

const filteredWarehouseItems = computed(() => {
  if (currentWarehouseTab.value === '全部') {
    return warehouseItems.value;
  }
  return warehouseItems.value.filter(item => item.category === currentWarehouseTab.value);
});

function show() {
  visible.value = true;
  loadGuildData();
}

function close() {
  visible.value = false;
}

async function loadGuildData() {
  try {
    const response = await fetch('/api/guild/info', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (response.ok) {
      const data = await response.json();
      if (data.hasGuild) {
        hasGuild.value = true;
        guildData.value = { ...guildData.value, ...data.guild };
      } else {
        hasGuild.value = false;
      }
    }
  } catch (e) {
    console.log('使用默认数据');
  }
}

function showCreateGuild() {
  currentTab.value = 'create';
}

async function createGuild() {
  if (!canCreate.value) return;
  
  try {
    const response = await fetch('/api/guild/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: createForm.value.name,
        description: createForm.value.description
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        hasGuild.value = true;
        guildData.value.name = createForm.value.name;
        currentTab.value = 'info';
        showMessage('仙盟创建成功！', 'success');
      }
    }
  } catch (e) {
    // 模拟创建成功
    hasGuild.value = true;
    guildData.value.name = createForm.value.name;
    currentTab.value = 'info';
    showMessage('仙盟创建成功！', 'success');
  }
}

async function joinGuild(guild) {
  try {
    const response = await fetch('/api/guild/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId: guild.id })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        hasGuild.value = true;
        guildData.value.name = guild.name;
        guildData.value.level = guild.level;
        currentTab.value = 'info';
        showMessage(`成功加入 ${guild.name}！`, 'success');
      }
    }
  } catch (e) {
    hasGuild.value = true;
    guildData.value.name = guild.name;
    currentTab.value = 'info';
    showMessage(`成功加入 ${guild.name}！`, 'success');
  }
}

function canUpgrade(building) {
  return (guildData.value.resources?.gold || 0) >= building.cost.gold &&
         (guildData.value.resources?.contribution || 0) >= building.cost.contribution;
}

async function upgradeBuilding(building) {
  if (!canUpgrade(building)) {
    showMessage('资源不足', 'error');
    return;
  }
  
  try {
    const response = await fetch('/api/guild/upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buildingId: building.id })
    });
    
    if (response.ok) {
      building.level++;
      guildData.value.resources.gold -= building.cost.gold;
      guildData.value.resources.contribution -= building.cost.contribution;
      showMessage(`${building.name}升级成功!`, 'success');
    }
  } catch (e) {
    building.level++;
    guildData.value.resources.gold -= building.cost.gold;
    guildData.value.resources.contribution -= building.cost.contribution;
    showMessage(`${building.name}升级成功!`, 'success');
  }
}

async function kickMember(member) {
  if (!confirm(`确定要踢出 ${member.name} 吗?`)) return;
  
  try {
    const response = await fetch('/api/guild/kick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: member.id })
    });
    
    if (response.ok) {
      members.value = members.value.filter(m => m.id !== member.id);
      showMessage(`已踢出 ${member.name}`, 'success');
    }
  } catch (e) {
    members.value = members.value.filter(m => m.id !== member.id);
    showMessage(`已踢出 ${member.name}`, 'success');
  }
}

async function joinActivity(activity) {
  try {
    const response = await fetch('/api/guild/activity/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activityId: activity.id })
    });
    
    if (response.ok) {
      showMessage(`已参加 ${activity.name}`, 'success');
    }
  } catch (e) {
    showMessage(`已参加 ${activity.name}`, 'success');
  }
}

async function requestItem(item) {
  try {
    const response = await fetch('/api/guild/warehouse/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: item.id })
    });
    
    if (response.ok) {
      showMessage(`已申请 ${item.name}`, 'success');
    }
  } catch (e) {
    showMessage(`已申请 ${item.name}`, 'success');
  }
}

function formatTime(timestamp) {
  const diff = timestamp - Date.now();
  if (diff < 0) return '已开始';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}分钟后`;
  const hours = Math.floor(minutes / 60);
  return `${hours}小时后`;
}

function formatNumber(num) {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万';
  }
  return num.toString();
}

function showMessage(msg, type = 'info') {
  if (window.showMessage) {
    window.showMessage(msg, type);
  } else {
    console.log(`[${type}] ${msg}`);
  }
}

defineExpose({
  show,
  close
});
</script>

<style scoped>
.guild-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 500px;
  max-height: 80vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 2px solid #4a69bd;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(90deg, #4a69bd, #6a89cc);
  color: white;
}

.panel-header h2 {
  margin: 0;
  font-size: 20px;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 28px;
  cursor: pointer;
  line-height: 1;
}

.panel-tabs {
  display: flex;
  background: #0f0f23;
  padding: 8px;
  gap: 4px;
  flex-wrap: wrap;
}

.tab-btn {
  flex: 1;
  min-width: 60px;
  padding: 8px 4px;
  background: transparent;
  border: none;
  color: #8b9dc3;
  cursor: pointer;
  border-radius: 8px;
  font-size: 11px;
  transition: all 0.3s;
}

.tab-btn.active {
  background: linear-gradient(135deg, #4a69bd, #6a89cc);
  color: white;
}

.panel-content {
  padding: 16px;
  max-height: 60vh;
  overflow-y: auto;
}

/* 未加入仙盟 */
.no-guild {
  text-align: center;
  padding: 30px 20px;
}

.no-guild-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.no-guild-text {
  color: #8b9dc3;
  font-size: 16px;
  margin-bottom: 20px;
}

.no-guild-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.action-btn {
  padding: 12px 24px;
  background: rgba(74, 105, 189, 0.3);
  border: 1px solid #4a69bd;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.action-btn.primary {
  background: linear-gradient(135deg, #4a69bd, #6a89cc);
}

.action-btn:hover {
  transform: translateY(-2px);
}

/* 创建仙盟 */
.create-guild h3, .join-guild h3 {
  color: white;
  margin: 0 0 16px 0;
  font-size: 16px;
  text-align: center;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  color: #8b9dc3;
  font-size: 13px;
  margin-bottom: 8px;
}

.form-group input, .form-group textarea {
  width: 100%;
  padding: 12px;
  background: rgba(74, 105, 189, 0.2);
  border: 1px solid #4a69bd;
  border-radius: 8px;
  color: white;
  font-size: 14px;
}

.form-group input::placeholder, .form-group textarea::placeholder {
  color: #636e72;
}

.cost-info {
  padding: 12px;
  background: rgba(255, 215, 0, 0.1);
  border-radius: 8px;
  color: #ffd700;
  text-align: center;
}

.create-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #4a69bd, #6a89cc);
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: bold;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.create-btn:hover:not(:disabled) {
  transform: translateY(-2px);
}

.create-btn:disabled {
  background: #636e72;
  cursor: not-allowed;
}

/* 加入仙盟 */
.guild-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.guild-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: rgba(74, 105, 189, 0.15);
  border-radius: 10px;
}

.guild-emblem {
  font-size: 36px;
  margin-right: 12px;
}

.guild-details {
  flex: 1;
}

.guild-details .guild-name {
  color: white;
  font-weight: bold;
  font-size: 15px;
}

.guild-info {
  color: #8b9dc3;
  font-size: 12px;
}

.guild-desc {
  color: #636e72;
  font-size: 11px;
  margin-top: 4px;
}

.join-btn {
  padding: 8px 16px;
  background: linear-gradient(135deg, #00b894, #00cec9);
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-size: 12px;
}

.join-btn:disabled {
  background: #636e72;
  cursor: not-allowed;
}

/* 仙盟信息 */
.guild-info {
  text-align: center;
}

.guild-emblem {
  font-size: 64px;
  margin-bottom: 12px;
}

.guild-name {
  font-size: 24px;
  color: #ffd700;
  margin-bottom: 8px;
}

.guild-level, .guild-members {
  color: #8b9dc3;
  margin-bottom: 8px;
}

.guild-resources {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 16px;
  padding: 12px;
  background: rgba(74, 105, 189, 0.2);
  border-radius: 8px;
}

.resource-item {
  text-align: center;
}

.resource-item .label {
  color: #8b9dc3;
  font-size: 12px;
}

.resource-item .value {
  display: block;
  color: #ffd700;
  font-size: 18px;
  font-weight: bold;
}

.guild-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 16px;
}

.guild-action-btn {
  padding: 10px 20px;
  background: rgba(74, 105, 189, 0.3);
  border: 1px solid #4a69bd;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.3s;
}

.guild-action-btn:hover {
  background: #4a69bd;
}

/* 建设 */
.guild-build h3, .guild-members-list h3, .guild-activity h3, .guild-warehouse h3 {
  color: white;
  margin: 0 0 16px 0;
  font-size: 16px;
}

.build-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: rgba(74, 105, 189, 0.15);
  border-radius: 8px;
  margin-bottom: 12px;
}

.building-icon {
  font-size: 32px;
  margin-right: 12px;
}

.building-info {
  flex: 1;
}

.building-name {
  color: white;
  font-weight: bold;
}

.building-level {
  color: #8b9dc3;
  font-size: 12px;
}

.building-progress {
  width: 100%;
  height: 6px;
  background: #2d3436;
  border-radius: 3px;
  margin-top: 6px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #00b894, #00cec9);
  border-radius: 3px;
  transition: width 0.3s;
}

.upgrade-btn, .request-btn {
  padding: 8px 16px;
  background: linear-gradient(135deg, #00b894, #00cec9);
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-size: 12px;
}

.upgrade-btn:disabled {
  background: #636e72;
  cursor: not-allowed;
}

/* 成员 */
.member-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: rgba(74, 105, 189, 0.15);
  border-radius: 8px;
  margin-bottom: 8px;
}

.member-avatar {
  font-size: 32px;
  margin-right: 12px;
}

.member-info {
  flex: 1;
}

.member-name {
  color: white;
  font-weight: bold;
}

.leader-badge {
  background: #ffd700;
  color: #c0392b;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  margin-left: 6px;
}

.member-title {
  color: #fdcb6e;
  font-size: 12px;
}

.member-contribution {
  color: #8b9dc3;
  font-size: 11px;
}

.kick-btn {
  padding: 6px 12px;
  background: #d63031;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  font-size: 11px;
}

/* 活动 */
.activity-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: rgba(74, 105, 189, 0.15);
  border-radius: 8px;
  margin-bottom: 8px;
}

.activity-icon {
  font-size: 32px;
  margin-right: 12px;
}

.activity-info {
  flex: 1;
}

.activity-name {
  color: white;
  font-weight: bold;
}

.activity-time {
  color: #fdcb6e;
  font-size: 12px;
}

.activity-reward {
  color: #8b9dc3;
  font-size: 11px;
}

/* 仓库 */
.warehouse-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.warehouse-tab {
  padding: 6px 12px;
  background: rgba(74, 105, 189, 0.2);
  border: none;
  border-radius: 4px;
  color: #8b9dc3;
  cursor: pointer;
  font-size: 12px;
}

.warehouse-tab.active {
  background: #4a69bd;
  color: white;
}

.warehouse-item {
  display: flex;
  align-items: center;
  padding: 10px;
  background: rgba(74, 105, 189, 0.15);
  border-radius: 6px;
  margin-bottom: 6px;
}

.item-icon {
  font-size: 28px;
  margin-right: 10px;
}

.item-info {
  flex: 1;
}

.item-name {
  color: white;
  font-size: 14px;
}

.item-quality {
  font-size: 11px;
}

.item-quality.quality-普通 {
  color: #95a5a6;
}

.item-quality.quality-稀有 {
  color: #3498db;
}

.item-quality.quality-史诗 {
  color: #9b59b6;
}

.item-quality.quality-传说 {
  color: #f39c12;
}
</style>
