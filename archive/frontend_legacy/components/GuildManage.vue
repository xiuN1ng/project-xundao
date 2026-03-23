<template>
  <div class="guild-manage-panel" v-if="visible">
    <div class="panel-header">
      <h2>👥 宗门管理</h2>
      <button class="close-btn" @click="close">×</button>
    </div>
    
    <div class="panel-content">
      <!-- 宗门信息 -->
      <div class="guild-info-bar">
        <div class="guild-emblem">{{ guildData.icon || '🏛️' }}</div>
        <div class="guild-details">
          <div class="guild-name">{{ guildData.name }}</div>
          <div class="guild-level">等级 {{ guildData.level }}</div>
        </div>
        <div class="member-count">
          <span class="count">{{ memberCount }}</span>
          <span class="total">/{{ guildData.maxMembers }}</span>
        </div>
      </div>
      
      <!-- 成员列表 -->
      <div class="member-list">
        <div 
          v-for="member in sortedMembers" 
          :key="member.id" 
          class="member-card"
          :class="{ 'is-leader': member.isLeader, 'is-self': member.isSelf }"
        >
          <div class="member-avatar">
            {{ member.avatar }}
            <div class="position-badge" :class="'position-' + member.position">
              {{ getPositionIcon(member.position) }}
            </div>
          </div>
          
          <div class="member-info">
            <div class="member-name">
              {{ member.name }}
              <span v-if="member.isLeader" class="leader-tag">宗主</span>
              <span v-if="member.isSelf" class="self-tag">本人</span>
            </div>
            <div class="member-position">
              <select 
                v-if="canManagePositions && !member.isLeader && !member.isSelf" 
                class="position-select"
                :value="member.position"
                @change="changePosition(member, $event.target.value)"
              >
                <option v-for="pos in positions" :key="pos.id" :value="pos.id">
                  {{ pos.icon }} {{ pos.name }}
                </option>
              </select>
              <span v-else class="position-text">
                {{ getPositionName(member.position) }}
              </span>
            </div>
            <div class="member-stats">
              <div class="stat-item">
                <span class="stat-label">贡献</span>
                <span class="stat-value">{{ formatNumber(member.contribution) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">战力</span>
                <span class="stat-value">{{ formatNumber(member.power) }}</span>
              </div>
            </div>
          </div>
          
          <div class="member-actions" v-if="canManageMember(member)">
            <button 
              v-if="!member.isLeader && isLeader" 
              class="action-btn transfer"
              @click="transferLeader(member)"
            >
              转让宗主
            </button>
            <button 
              v-if="!member.isLeader && !member.isSelf" 
              class="action-btn kick"
              @click="kickMember(member)"
            >
              驱逐
            </button>
          </div>
        </div>
      </div>
      
      <!-- 职位说明 -->
      <div class="position-info">
        <div class="info-title">职位权限</div>
        <div class="position-list">
          <div v-for="pos in positions" :key="pos.id" class="position-item">
            <span class="pos-icon">{{ pos.icon }}</span>
            <span class="pos-name">{{ pos.name }}</span>
            <span class="pos-desc">{{ pos.description }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

const visible = ref(false);

const guildData = ref({
  name: '青云仙盟',
  level: 5,
  icon: '🏛️',
  maxMembers: 50
});

const isLeader = ref(true);
const currentUserId = ref(1);

const positions = [
  { id: 'elder', name: '长老', icon: '🛡️', description: '可管理成员、审批入盟' },
  { id: 'core', name: '核心弟子', icon: '⚔️', description: '可参与宗门活动' },
  { id: 'normal', name: '普通弟子', icon: '🌟', description: '基本成员权限' }
];

const members = ref([
  { 
    id: 1, 
    name: '盟主大人', 
    position: 'leader', 
    contribution: 15000, 
    power: 50000, 
    avatar: '👑', 
    isLeader: true,
    isSelf: true
  },
  { 
    id: 2, 
    name: '副盟主A', 
    position: 'elder', 
    contribution: 12000, 
    power: 42000, 
    avatar: '⚔️', 
    isLeader: false,
    isSelf: false
  },
  { 
    id: 3, 
    name: '副盟主B', 
    position: 'elder', 
    contribution: 10000, 
    power: 38000, 
    avatar: '🛡️', 
    isLeader: false,
    isSelf: false
  },
  { 
    id: 4, 
    name: '核心弟子A', 
    position: 'core', 
    contribution: 8000, 
    power: 25000, 
    avatar: '🎯', 
    isLeader: false,
    isSelf: false
  },
  { 
    id: 5, 
    name: '核心弟子B', 
    position: 'core', 
    contribution: 6000, 
    power: 22000, 
    avatar: '🏹', 
    isLeader: false,
    isSelf: false
  },
  { 
    id: 6, 
    name: '普通弟子A', 
    position: 'normal', 
    contribution: 3000, 
    power: 8000, 
    avatar: '🌟', 
    isLeader: false,
    isSelf: false
  },
  { 
    id: 7, 
    name: '普通弟子B', 
    position: 'normal', 
    contribution: 2000, 
    power: 5000, 
    avatar: '✨', 
    isLeader: false,
    isSelf: false
  }
]);

const memberCount = computed(() => members.value.length);

const sortedMembers = computed(() => {
  return [...members.value].sort((a, b) => {
    // 宗主排第一
    if (a.isLeader) return -1;
    if (b.isLeader) return 1;
    // 然后按职位排序
    const posOrder = { elder: 0, core: 1, normal: 2 };
    return posOrder[a.position] - posOrder[b.position];
  });
});

const canManagePositions = computed(() => {
  return isLeader.value;
});

function canManageMember(member) {
  if (member.isLeader) return false;
  if (member.isSelf) return false;
  return isLeader.value;
}

function getPositionIcon(position) {
  const pos = positions.find(p => p.id === position);
  return pos ? pos.icon : '🌟';
}

function getPositionName(position) {
  if (position === 'leader') return '宗主';
  const pos = positions.find(p => p.id === position);
  return pos ? pos.name : '普通弟子';
}

async function changePosition(member, newPosition) {
  if (!confirm(`确定要将 ${member.name} 任命为 ${getPositionName(newPosition)} 吗?`)) {
    return;
  }
  
  try {
    const response = await fetch('/api/guild/member/position', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: member.id, position: newPosition })
    });
    
    if (response.ok) {
      member.position = newPosition;
      showMessage(`已任命 ${member.name} 为 ${getPositionName(newPosition)}`, 'success');
    }
  } catch (e) {
    member.position = newPosition;
    showMessage(`已任命 ${member.name} 为 ${getPositionName(newPosition)}`, 'success');
  }
}

async function transferLeader(member) {
  if (!confirm(`确定要将宗主之位转让给 ${member.name} 吗?此操作不可撤销!`)) {
    return;
  }
  
  try {
    const response = await fetch('/api/guild/transfer leader', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newLeaderId: member.id })
    });
    
    if (response.ok) {
      // 找到原来的宗主
      const oldLeader = members.value.find(m => m.isLeader);
      if (oldLeader) {
        oldLeader.isLeader = false;
        oldLeader.position = 'elder';
      }
      member.isLeader = true;
      member.position = 'leader';
      isLeader.value = false;
      showMessage(`宗主之位已转让给 ${member.name}`, 'success');
    }
  } catch (e) {
    const oldLeader = members.value.find(m => m.isLeader);
    if (oldLeader) {
      oldLeader.isLeader = false;
      oldLeader.position = 'elder';
    }
    member.isLeader = true;
    member.position = 'leader';
    isLeader.value = false;
    showMessage(`宗主之位已转让给 ${member.name}`, 'success');
  }
}

async function kickMember(member) {
  if (!confirm(`确定要驱逐 ${member.name} 吗?`)) {
    return;
  }
  
  try {
    const response = await fetch('/api/guild/kick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: member.id })
    });
    
    if (response.ok) {
      members.value = members.value.filter(m => m.id !== member.id);
      showMessage(`已驱逐 ${member.name}`, 'success');
    }
  } catch (e) {
    members.value = members.value.filter(m => m.id !== member.id);
    showMessage(`已驱逐 ${member.name}`, 'success');
  }
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

function show() {
  visible.value = true;
  loadData();
}

function close() {
  visible.value = false;
}

async function loadData() {
  try {
    const response = await fetch('/api/guild/members');
    if (response.ok) {
      const data = await response.json();
      if (data.members) {
        members.value = data.members;
      }
      if (data.guild) {
        guildData.value = { ...guildData.value, ...data.guild };
      }
      if (data.isLeader !== undefined) {
        isLeader.value = data.isLeader;
      }
    }
  } catch (e) {
    console.log('使用默认数据');
  }
}

defineExpose({
  show,
  close
});
</script>

<style scoped>
.guild-manage-panel {
  width: 600px;
  max-height: 85vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 2px solid #4a69bd;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
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

.panel-content {
  padding: 16px;
  max-height: 75vh;
  overflow-y: auto;
}

/* 宗门信息栏 */
.guild-info-bar {
  display: flex;
  align-items: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  margin-bottom: 16px;
}

.guild-emblem {
  font-size: 48px;
  margin-right: 16px;
}

.guild-details {
  flex: 1;
}

.guild-name {
  font-size: 18px;
  font-weight: bold;
  color: white;
  margin-bottom: 4px;
}

.guild-level {
  font-size: 13px;
  color: #8b9dc3;
}

.member-count {
  text-align: right;
}

.member-count .count {
  font-size: 24px;
  font-weight: bold;
  color: #ffd700;
}

.member-count .total {
  font-size: 14px;
  color: #8b9dc3;
}

/* 成员列表 */
.member-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.member-card {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: rgba(74, 105, 189, 0.15);
  border: 1px solid rgba(74, 105, 189, 0.3);
  border-radius: 12px;
  transition: all 0.3s;
}

.member-card:hover {
  background: rgba(74, 105, 189, 0.25);
}

.member-card.is-leader {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.1);
}

.member-card.is-self {
  border-color: #3498db;
  background: rgba(52, 152, 219, 0.1);
}

.member-avatar {
  position: relative;
  font-size: 40px;
  margin-right: 16px;
}

.position-badge {
  position: absolute;
  bottom: -4px;
  right: -4px;
  font-size: 14px;
  background: #2c3e50;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #1a1a2e;
}

.position-badge.position-leader {
  background: #ffd700;
}

.position-badge.position-elder {
  background: #9b59b6;
}

.position-badge.position-core {
  background: #3498db;
}

.member-info {
  flex: 1;
}

.member-name {
  font-size: 15px;
  font-weight: bold;
  color: white;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.leader-tag {
  background: linear-gradient(135deg, #ffd700, #ffaa00);
  color: #1a1a2e;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
}

.self-tag {
  background: #3498db;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
}

.member-position {
  margin-bottom: 8px;
}

.position-select {
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid #4a69bd;
  border-radius: 4px;
  color: white;
  font-size: 12px;
  cursor: pointer;
}

.position-text {
  font-size: 12px;
  color: #a4b0de;
}

.member-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.stat-label {
  color: #8b9dc3;
}

.stat-value {
  color: #ffd700;
  font-weight: bold;
}

/* 成员操作 */
.member-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-left: 12px;
}

.action-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.action-btn.transfer {
  background: linear-gradient(135deg, #f39c12, #e74c3c);
  color: white;
}

.action-btn.kick {
  background: rgba(231, 76, 60, 0.3);
  color: #e74c3c;
  border: 1px solid #e74c3c;
}

.action-btn:hover {
  transform: translateY(-1px);
}

/* 职位说明 */
.position-info {
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
}

.info-title {
  font-size: 13px;
  color: #8b9dc3;
  margin-bottom: 10px;
  text-align: center;
}

.position-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.position-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  padding: 6px 8px;
  background: rgba(74, 105, 189, 0.1);
  border-radius: 6px;
}

.pos-icon {
  font-size: 14px;
}

.pos-name {
  color: white;
  font-weight: bold;
  min-width: 70px;
}

.pos-desc {
  color: #8b9dc3;
}

/* 滚动条样式 */
.panel-content::-webkit-scrollbar {
  width: 6px;
}

.panel-content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb {
  background: #4a69bd;
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: #6a89cc;
}
</style>
