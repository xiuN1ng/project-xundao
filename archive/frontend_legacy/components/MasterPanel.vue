<template>
  <div class="master-panel">
    <!-- 顶部导航 -->
    <div class="panel-header">
      <div class="panel-title">
        <span class="title-icon">👨‍🏫</span>
        <span>师徒系统</span>
      </div>
      <div class="panel-tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          class="tab-btn"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          {{ tab.icon }} {{ tab.name }}
        </button>
      </div>
    </div>

    <!-- 拜师面板 -->
    <div class="tab-content" v-if="activeTab === 'masters'">
      <!-- 拜师条件 -->
      <div class="master-requirements" v-if="!hasMaster">
        <div class="req-title">
          <span>🎯 拜师条件</span>
        </div>
        <div class="req-list">
          <div class="req-item" :class="{ fulfilled: player.level >= 10 }">
            <span class="req-icon">{{ player.level >= 10 ? '✅' : '❌' }}</span>
            <span class="req-label">角色等级 ≥ 10级</span>
            <span class="req-value">当前: {{ player.level }}级</span>
          </div>
          <div class="req-item" :class="{ fulfilled: player.realmLevel >= 2 }">
            <span class="req-icon">{{ player.realmLevel >= 2 ? '✅' : '❌' }}</span>
            <span class="req-label">境界 ≥ 筑基期</span>
            <span class="req-value">{{ player.realm }}</span>
          </div>
        </div>
        <div class="req-action">
          <button 
            class="btn btn-primary"
            :disabled="player.level < 10"
            @click="showMasterList = true"
          >
            寻找师父
          </button>
        </div>
      </div>

      <!-- 当前师父 -->
      <div class="current-master" v-else>
        <div class="master-card">
          <div class="master-avatar">
            <span>{{ currentMaster.avatar }}</span>
          </div>
          <div class="master-info">
            <div class="master-name">{{ currentMaster.name }}</div>
            <div class="master-realm">{{ currentMaster.realm }}</div>
            <div class="master-level">等级: {{ currentMaster.level }}</div>
          </div>
          <div class="master-relation">
            <div class="relation-label">师徒等级</div>
            <div class="relation-value">{{ masterRelation.level }}级</div>
          </div>
        </div>
        
        <div class="master-bonus">
          <div class="bonus-title">师徒加成</div>
          <div class="bonus-list">
            <div class="bonus-item">
              <span class="bonus-icon">⚔️</span>
              <span class="bonus-label">修炼效率</span>
              <span class="bonus-value">+{{ masterRelation.cultivationBonus }}%</span>
            </div>
            <div class="bonus-item">
              <span class="bonus-icon">✨</span>
              <span class="bonus-label">经验加成</span>
              <span class="bonus-value">+{{ masterRelation.expBonus }}%</span>
            </div>
            <div class="bonus-item">
              <span class="bonus-icon">💰</span>
              <span class="bonus-label">灵石掉落</span>
              <span class="bonus-value">+{{ masterRelation.stoneBonus }}%</span>
            </div>
          </div>
        </div>

        <div class="master-actions">
          <button class="btn btn-small" @click="showGiftPanel = true">
            🎁 赠送礼物
          </button>
          <button class="btn btn-small btn-danger" @click="showApprenticeList = true">
            查看徒弟
          </button>
        </div>
      </div>

      <!-- 师父列表弹窗 -->
      <div class="modal-overlay" v-if="showMasterList" @click.self="showMasterList = false">
        <div class="modal-content">
          <div class="modal-header">
            <div class="modal-title">选择师父</div>
            <button class="modal-close" @click="showMasterList = false">×</button>
          </div>
          <div class="master-list">
            <div 
              v-for="master in availableMasters" 
              :key="master.id"
              class="master-list-item"
              :class="{ selected: selectedMaster?.id === master.id }"
              @click="selectedMaster = master"
            >
              <div class="master-avatar">
                <span>{{ master.avatar }}</span>
              </div>
              <div class="master-info">
                <div class="master-name">{{ master.name }}</div>
                <div class="master-realm">{{ master.realm }}</div>
                <div class="master-stats">
                  <span>等级: {{ master.level }}</span>
                  <span>收徒: {{ master.apprenticeCount }}/{{ master.maxApprentices }}</span>
                </div>
              </div>
              <div class="master-teach">
                <div class="teach-skill" v-if="master.teachSkills">
                  传授: {{ master.teachSkills }}
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn" @click="showMasterList = false">取消</button>
            <button 
              class="btn btn-primary" 
              :disabled="!selectedMaster"
              @click="applyToMaster"
            >
              申请拜师
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 徒弟面板 -->
    <div class="tab-content" v-if="activeTab === 'apprentices'">
      <div class="apprentices-header">
        <div class="header-info">
          <span class="info-label">我的徒弟</span>
          <span class="info-value">{{ apprentices.length }}/{{ maxApprentices }}</span>
        </div>
        <button class="btn btn-small" @click="recruitApprentice">
          招收徒弟
        </button>
      </div>

      <div class="apprentices-list" v-if="apprentices.length > 0">
        <div 
          v-for="apprentice in apprentices" 
          :key="apprentice.id"
          class="apprentice-card"
        >
          <div class="apprentice-avatar">
            <span>{{ apprentice.avatar }}</span>
          </div>
          <div class="apprentice-info">
            <div class="apprentice-name">{{ apprentice.name }}</div>
            <div class="apprentice-realm">{{ apprentice.realm }}</div>
            <div class="apprentice-level">等级: {{ apprentice.level }}</div>
          </div>
          <div class="apprentice-loyalty">
            <div class="loyalty-label">亲密度</div>
            <div class="loyalty-bar">
              <div 
                class="loyalty-fill" 
                :style="{ width: apprentice.loyalty + '%' }"
              ></div>
            </div>
            <div class="loyalty-value">{{ apprentice.loyalty }}%</div>
          </div>
          <div class="apprentice-actions">
            <button class="btn btn-sm" @click="teachApprentice(apprentice)">
              传授
            </button>
            <button class="btn btn-sm" @click="kickApprentice(apprentice)">
              逐出
            </button>
          </div>
        </div>
      </div>

      <div class="empty-state" v-else>
        <div class="empty-icon">📚</div>
        <div class="empty-text">还没有徒弟</div>
        <button class="btn btn-primary" @click="recruitApprentice">
          招收徒弟
        </button>
      </div>
    </div>

    <!-- 申请列表 -->
    <div class="tab-content" v-if="activeTab === 'requests'">
      <div class="requests-header">
        <div class="header-info">
          <span class="info-label">拜师申请</span>
          <span class="info-badge" v-if="pendingRequests.length > 0">
            {{ pendingRequests.length }}
          </span>
        </div>
      </div>

      <div class="requests-list" v-if="pendingRequests.length > 0">
        <div 
          v-for="request in pendingRequests" 
          :key="request.id"
          class="request-card"
        >
          <div class="request-avatar">
            <span>{{ request.avatar }}</span>
          </div>
          <div class="request-info">
            <div class="request-name">{{ request.name }}</div>
            <div class="request-realm">{{ request.realm }}</div>
            <div class="request-level">等级: {{ request.level }}</div>
          </div>
          <div class="request-actions">
            <button 
              class="btn btn-sm btn-success"
              @click="acceptRequest(request)"
            >
              同意
            </button>
            <button 
              class="btn btn-sm btn-danger"
              @click="rejectRequest(request)"
            >
              拒绝
            </button>
          </div>
        </div>
      </div>

      <div class="empty-state" v-else>
        <div class="empty-icon">📭</div>
        <div class="empty-text">暂无拜师申请</div>
      </div>
    </div>

    <!-- 赠送礼物弹窗 -->
    <div class="modal-overlay" v-if="showGiftPanel" @click.self="showGiftPanel = false">
      <div class="modal-content">
        <div class="modal-header">
          <div class="modal-title">赠送礼物</div>
          <button class="modal-close" @click="showGiftPanel = false">×</button>
        </div>
        <div class="gift-list">
          <div 
            v-for="gift in gifts" 
            :key="gift.id"
            class="gift-item"
            :class="{ selected: selectedGift?.id === gift.id }"
            @click="selectedGift = gift"
          >
            <div class="gift-icon">{{ gift.icon }}</div>
            <div class="gift-name">{{ gift.name }}</div>
            <div class="gift-loyalty">+{{ gift.loyalty }}亲密度</div>
            <div class="gift-price">💰 {{ gift.price }}</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="showGiftPanel = false">取消</button>
          <button 
            class="btn btn-primary"
            :disabled="!selectedGift"
            @click="sendGift"
          >
            赠送
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  player: {
    type: Object,
    default: () => ({
      name: '修士',
      level: 1,
      realm: '练气期',
      realmLevel: 1
    })
  }
})

const emit = defineEmits(['apply', 'accept', 'reject', 'teach', 'gift'])

const activeTab = ref('masters')
const showMasterList = ref(false)
const showGiftPanel = ref(false)
const showApprenticeList = ref(false)
const selectedMaster = ref(null)
const selectedGift = ref(null)
const hasMaster = ref(false)
const maxApprentices = ref(5)

const currentMaster = ref({
  id: 1,
  name: '玄清真人',
  avatar: '🧙',
  realm: '化神期',
  level: 50
})

const masterRelation = ref({
  level: 3,
  cultivationBonus: 15,
  expBonus: 10,
  stoneBonus: 5
})

const tabs = [
  { id: 'masters', name: '拜师', icon: '👨‍🏫' },
  { id: 'apprentices', name: '徒弟', icon: '📚' },
  { id: 'requests', name: '申请', icon: '📝' }
]

const availableMasters = ref([
  { 
    id: 1, 
    name: '青云子', 
    avatar: '🧙‍♂️', 
    realm: '化神期', 
    level: 55,
    apprenticeCount: 2,
    maxApprentices: 5,
    teachSkills: '青云诀'
  },
  { 
    id: 2, 
    name: '玉清仙子', 
    avatar: '🧙‍♀️', 
    realm: '炼虚期', 
    level: 60,
    apprenticeCount: 4,
    maxApprentices: 5,
    teachSkills: '玉清心法'
  },
  { 
    id: 3, 
    name: '天机老人', 
    avatar: '👴', 
    realm: '大乘期', 
    level: 70,
    apprenticeCount: 1,
    maxApprentices: 3,
    teachSkills: '天机算术'
  }
])

const apprentices = ref([
  { 
    id: 1, 
    name: '小修士A', 
    avatar: '🧑', 
    realm: '练气期', 
    level: 5,
    loyalty: 80 
  }
])

const pendingRequests = ref([
  { 
    id: 1, 
    name: '新人B', 
    avatar: '👨', 
    realm: '练气期', 
    level: 3 
  }
])

const gifts = ref([
  { id: 1, icon: '🍑', name: '蟠桃', price: 100, loyalty: 10 },
  { id: 2, icon: '💎', name: '灵石', price: 50, loyalty: 5 },
  { id: 3, icon: '📜', name: '功法', price: 200, loyalty: 20 },
  { id: 4, icon: '🏺', name: '灵酒', price: 80, loyalty: 8 }
])

const applyToMaster = () => {
  if (!selectedMaster.value) return
  emit('apply', selectedMaster.value)
  showMasterList.value = false
  hasMaster.value = true
}

const acceptRequest = (request) => {
  emit('accept', request)
  pendingRequests.value = pendingRequests.value.filter(r => r.id !== request.id)
}

const rejectRequest = (request) => {
  emit('reject', request)
  pendingRequests.value = pendingRequests.value.filter(r => r.id !== request.id)
}

const teachApprentice = (apprentice) => {
  emit('teach', apprentice)
}

const kickApprentice = (apprentice) => {
  apprentices.value = apprentices.value.filter(a => a.id !== apprentice.id)
}

const recruitApprentice = () => {
  // 模拟招收徒弟
}

const sendGift = () => {
  if (!selectedGift.value || !hasMaster.value) return
  emit('gift', { master: currentMaster.value, gift: selectedGift.value })
  showGiftPanel.value = false
  selectedGift.value = null
}

defineExpose({
  activeTab,
  hasMaster,
  applyToMaster
})
</script>

<style scoped>
.master-panel {
  background: linear-gradient(180deg, rgba(18, 18, 32, 0.98), rgba(10, 10, 18, 0.98));
  border: 1px solid rgba(184, 134, 11, 0.25);
  border-radius: 16px;
  padding: 20px;
  color: #e8e8f0;
  max-height: 600px;
  overflow-y: auto;
}

/* 顶部导航 */
.panel-header {
  margin-bottom: 20px;
}

.panel-title {
  font-size: 20px;
  font-weight: bold;
  color: #ffd700;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 15px;
}

.title-icon {
  font-size: 24px;
}

.panel-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: #aaa;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.tab-btn.active {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  border-color: transparent;
}

/* 拜师条件 */
.master-requirements {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 15px;
}

.req-title {
  font-size: 14px;
  color: #ffd700;
  margin-bottom: 12px;
}

.req-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 15px;
}

.req-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  font-size: 13px;
}

.req-item.fulfilled {
  color: #10b981;
}

.req-item:not(.fulfilled) {
  color: #888;
}

.req-icon {
  font-size: 14px;
}

.req-label {
  flex: 1;
}

.req-value {
  font-size: 12px;
  opacity: 0.7;
}

.req-action {
  text-align: center;
}

/* 当前师父 */
.current-master {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.master-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
  border-radius: 12px;
  border: 1px solid rgba(102, 126, 234, 0.3);
}

.master-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(184, 134, 11, 0.3));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.master-info {
  flex: 1;
}

.master-name {
  font-size: 18px;
  font-weight: bold;
  color: #fff;
}

.master-realm {
  font-size: 13px;
  color: #4ecdc4;
}

.master-level {
  font-size: 12px;
  color: #888;
}

.master-relation {
  text-align: center;
  padding: 10px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
}

.relation-label {
  font-size: 11px;
  color: #888;
}

.relation-value {
  font-size: 20px;
  font-weight: bold;
  color: #ffd700;
}

/* 师徒加成 */
.master-bonus {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 15px;
}

.bonus-title {
  font-size: 14px;
  color: #aaa;
  margin-bottom: 12px;
}

.bonus-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bonus-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
}

.bonus-icon {
  font-size: 18px;
}

.bonus-label {
  flex: 1;
  font-size: 13px;
  color: #aaa;
}

.bonus-value {
  color: #10b981;
  font-weight: bold;
}

/* 操作按钮 */
.master-actions {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-small {
  padding: 8px 14px;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-small:hover {
  background: rgba(255, 255, 255, 0.2);
}

.btn-success {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
}

.btn-danger {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  border: 1px solid #ef4444;
}

.btn-danger:hover {
  background: rgba(239, 68, 68, 0.3);
}

.btn-sm {
  padding: 6px 12px;
  font-size: 11px;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: linear-gradient(180deg, #1a1a2e, #151530);
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 16px;
  padding: 20px;
  min-width: 400px;
  max-width: 90vw;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-title {
  font-size: 18px;
  font-weight: bold;
  color: #ffd700;
}

.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  color: #aaa;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.3s;
}

.modal-close:hover {
  background: rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

/* 师父列表 */
.master-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.master-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
}

.master-list-item:hover {
  border-color: rgba(255, 215, 0, 0.3);
}

.master-list-item.selected {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.1);
}

.master-stats {
  display: flex;
  gap: 15px;
  font-size: 11px;
  color: #888;
  margin-top: 4px;
}

.master-teach {
  margin-left: auto;
}

.teach-skill {
  font-size: 11px;
  color: #4ecdc4;
  padding: 4px 8px;
  background: rgba(78, 205, 196, 0.15);
  border-radius: 4px;
}

/* 徒弟列表 */
.apprentices-header,
.requests-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.info-label {
  font-size: 14px;
  color: #aaa;
}

.info-value {
  font-size: 16px;
  color: #ffd700;
  font-weight: bold;
}

.info-badge {
  background: #ef4444;
  color: #fff;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
}

.apprentices-list,
.requests-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.apprentice-card,
.request-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
}

.apprentice-avatar,
.request-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.3), rgba(118, 75, 162, 0.3));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.apprentice-info,
.request-info {
  flex: 1;
}

.apprentice-name,
.request-name {
  font-weight: bold;
  color: #fff;
}

.apprentice-realm,
.request-realm {
  font-size: 12px;
  color: #4ecdc4;
}

.apprentice-level,
.request-level {
  font-size: 11px;
  color: #888;
}

.apprentice-loyalty {
  min-width: 100px;
  text-align: center;
}

.loyalty-label {
  font-size: 11px;
  color: #888;
  margin-bottom: 4px;
}

.loyalty-bar {
  height: 6px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 3px;
  overflow: hidden;
}

.loyalty-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 3px;
  transition: width 0.3s;
}

.loyalty-value {
  font-size: 11px;
  color: #aaa;
  margin-top: 4px;
}

.apprentice-actions,
.request-actions {
  display: flex;
  gap: 8px;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #666;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 15px;
}

.empty-text {
  font-size: 14px;
  margin-bottom: 20px;
}

/* 礼物列表 */
.gift-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.gift-item {
  padding: 15px;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid transparent;
  border-radius: 10px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.gift-item:hover {
  border-color: rgba(255, 215, 0, 0.3);
}

.gift-item.selected {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.1);
}

.gift-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.gift-name {
  font-size: 14px;
  color: #fff;
  margin-bottom: 4px;
}

.gift-loyalty {
  font-size: 11px;
  color: #10b981;
  margin-bottom: 4px;
}

.gift-price {
  font-size: 12px;
  color: #ffd700;
}
</style>
