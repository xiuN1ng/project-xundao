<template>
  <div class="master-disciple-panel">
    <div class="panel-header">
      <h2>👨‍🏫 师徒传承</h2>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>
    
    <div class="panel-content">
      <!-- 切换标签 -->
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
      
      <!-- 师徒关系显示 -->
      <div class="relationship-section" v-if="hasRelationship">
        <div class="relationship-card">
          <div class="relationship-icon">{{ isMaster ? '📚' : '🎓' }}</div>
          <div class="relationship-info">
            <div class="relationship-type">{{ isMaster ? '我的师父' : '我的徒弟' }}</div>
            <div class="relationship-name">{{ relatedPerson.name }}</div>
            <div class="relationship-detail">
              <span>{{ relatedPerson.realm }}</span>
              <span>Lv.{{ relatedPerson.level }}</span>
            </div>
          </div>
          <div class="relationship-level">
            <div class="level-label">亲密度</div>
            <div class="level-progress">
              <div class="progress-fill" :style="{ width: intimacy + '%' }"></div>
            </div>
            <div class="level-value">{{ intimacy }}%</div>
          </div>
        </div>
        
        <!-- 传承进度 -->
        <div class="inheritance-progress">
          <h4>📈 传承进度</h4>
          <div class="progress-item">
            <div class="progress-label">
              <span>修炼心得</span>
              <span>{{ inheritance.cultivation }}/100</span>
            </div>
            <div class="progress-bar">
              <div class="bar-fill cultivation" :style="{ width: inheritance.cultivation + '%' }"></div>
            </div>
          </div>
          <div class="progress-item">
            <div class="progress-label">
              <span>战斗技巧</span>
              <span>{{ inheritance.combat }}/100</span>
            </div>
            <div class="progress-bar">
              <div class="bar-fill combat" :style="{ width: inheritance.combat + '%' }"></div>
            </div>
          </div>
          <div class="progress-item">
            <div class="progress-label">
              <span>功法奥秘</span>
              <span>{{ inheritance.technique }}/100</span>
            </div>
            <div class="progress-bar">
              <div class="bar-fill technique" :style="{ width: inheritance.technique + '%' }"></div>
            </div>
          </div>
          <div class="progress-item">
            <div class="progress-label">
              <span>境界感悟</span>
              <span>{{ inheritance.realm }}/100</span>
            </div>
            <div class="progress-bar">
              <div class="bar-fill realm" :style="{ width: inheritance.realm + '%' }"></div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 拜师/收徒入口 -->
      <div class="no-relationship" v-else>
        <div class="empty-icon">{{ activeTab === 'master' ? '👨‍🏫' : '👨‍🎓' }}</div>
        <div class="empty-text">{{ activeTab === 'master' ? '还没有师父' : '还没有徒弟' }}</div>
        <button class="action-btn-primary" @click="showListPanel = true">
          {{ activeTab === 'master' ? '寻找师父' : '招收徒弟' }}
        </button>
      </div>
      
      <!-- 传承操作按钮 -->
      <div class="actions-section" v-if="hasRelationship">
        <div class="actions-title">🎯 传承操作</div>
        <div class="actions-grid">
          <button 
            class="action-card"
            :class="{ disabled: !canTeach }"
            :disabled="!canTeach"
            @click="startTeaching"
          >
            <span class="action-icon">📖</span>
            <span class="action-name">传授功法</span>
            <span class="action-desc" v-if="!canTeach">需要亲密度≥50%</span>
            <span class="action-desc" v-else>消耗: 修炼点数</span>
          </button>
          
          <button 
            class="action-card"
            :class="{ disabled: !canInherit }"
            :disabled="!canInherit"
            @click="startInheritance"
          >
            <span class="action-icon">✨</span>
            <span class="action-name">传承技能</span>
            <span class="action-desc" v-if="!canInherit">需要亲密度≥80%</span>
            <span class="action-desc" v-else>解锁弟子技能</span>
          </button>
          
          <button 
            class="action-card"
            @click="sendGift"
          >
            <span class="action-icon">🎁</span>
            <span class="action-name">赠送礼物</span>
            <span class="action-desc">提升亲密度</span>
          </button>
          
          <button 
            class="action-card"
            :class="{ disabled: !canBreakRelation }"
            :disabled="!canBreakRelation"
            @click="breakRelation"
          >
            <span class="action-icon">💔</span>
            <span class="action-name">解除关系</span>
            <span class="action-desc">需要7天后</span>
          </button>
        </div>
      </div>
      
      <!-- 传承奖励预览 -->
      <div class="rewards-section" v-if="hasRelationship">
        <div class="rewards-title">🎁 传承奖励</div>
        <div class="rewards-list">
          <div 
            v-for="reward in inheritanceRewards" 
            :key="reward.level"
            class="reward-item"
            :class="{ unlocked: inheritanceTotal >= reward.required }"
          >
            <div class="reward-level">{{ reward.level }}级</div>
            <div class="reward-icon">{{ reward.icon }}</div>
            <div class="reward-name">{{ reward.name }}</div>
            <div class="reward-requirement">{{ reward.required }}传承值</div>
          </div>
        </div>
      </div>
      
      <!-- 师父列表弹窗 -->
      <div class="modal-overlay" v-if="showListPanel" @click.self="showListPanel = false">
        <div class="modal-content">
          <div class="modal-header">
            <div class="modal-title">{{ activeTab === 'master' ? '选择师父' : '选择徒弟' }}</div>
            <button class="modal-close" @click="showListPanel = false">×</button>
          </div>
          
          <div class="person-list">
            <div 
              v-for="person in personList" 
              :key="person.id"
              class="person-item"
              :class="{ selected: selectedPerson?.id === person.id }"
              @click="selectedPerson = person"
            >
              <div class="person-avatar">
                <span>{{ person.avatar }}</span>
              </div>
              <div class="person-info">
                <div class="person-name">{{ person.name }}</div>
                <div class="person-detail">
                  <span>{{ person.realm }}</span>
                  <span>Lv.{{ person.level }}</span>
                </div>
                <div class="person-stats">
                  <span>传承: {{ person.inheritancePower }}</span>
                </div>
              </div>
              <div class="person-status">
                <span class="status-badge" :class="person.status">
                  {{ person.status === 'available' ? '可拜师' : '已满员' }}
                </span>
              </div>
            </div>
          </div>
          
          <div class="modal-footer">
            <button class="btn-secondary" @click="showListPanel = false">取消</button>
            <button 
              class="btn-primary" 
              :disabled="!selectedPerson"
              @click="confirmRelation"
            >
              {{ activeTab === 'master' ? '申请拜师' : '收为徒弟' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const { ref, computed, onMounted } = Vue;

export default {
  name: 'MasterDisciplePanel',
  emits: ['close', 'start-teaching', 'start-inheritance', 'send-gift', 'break-relation'],
  setup(props, { emit }) {
    const activeTab = ref('master');
    const hasRelationship = ref(true);
    const isMaster = ref(false);
    const intimacy = ref(65);
    const showListPanel = ref(false);
    const selectedPerson = ref(null);
    const relationshipDays = ref(15);
    
    const tabs = [
      { id: 'master', name: '拜师', icon: '👨‍🏫' },
      { id: 'disciple', name: '收徒', icon: '👨‍🎓' }
    ];
    
    const relatedPerson = ref({
      name: '青云子',
      realm: '元婴期',
      level: 85
    });
    
    const inheritance = ref({
      cultivation: 45,
      combat: 30,
      technique: 20,
      realm: 15
    });
    
    const personList = ref([
      {
        id: 1,
        name: '太乙真人',
        avatar: '🧙',
        realm: '大乘期',
        level: 120,
        inheritancePower: 9500,
        status: 'available'
      },
      {
        id: 2,
        name: '玉清天尊',
        avatar: '👼',
        realm: '大乘期',
        level: 118,
        inheritancePower: 9200,
        status: 'full'
      },
      {
        id: 3,
        name: '东华帝君',
        avatar: '👑',
        realm: '炼虚期',
        level: 105,
        inheritancePower: 8500,
        status: 'available'
      },
      {
        id: 4,
        name: '南极仙翁',
        avatar: '🎅',
        realm: '合体期',
        level: 98,
        inheritancePower: 7800,
        status: 'available'
      }
    ]);
    
    const inheritanceRewards = ref([
      { level: 1, required: 50, icon: '📚', name: '修炼心得' },
      { level: 2, required: 100, icon: '⚔️', name: '战斗技巧' },
      { level: 3, required: 200, icon: '📖', name: '功法奥秘' },
      { level: 4, required: 350, icon: '🏔️', name: '境界感悟' },
      { level: 5, required: 500, icon: '👑', name: '终极传承' }
    ]);
    
    const inheritanceTotal = computed(() => {
      return Object.values(inheritance.value).reduce((a, b) => a + b, 0);
    });
    
    const canTeach = computed(() => intimacy.value >= 50);
    const canInherit = computed(() => intimacy.value >= 80);
    const canBreakRelation = computed(() => relationshipDays.value >= 7);
    
    const startTeaching = () => {
      if (!canTeach.value) return;
      
      // 增加传承进度
      inheritance.value.cultivation = Math.min(100, inheritance.value.cultivation + 10);
      inheritance.value.combat = Math.min(100, inheritance.value.combat + 8);
      
      // 减少亲密度
      intimacy.value = Math.max(0, intimacy.value - 5);
      
      emit('start-teaching', { type: 'teaching', gains: 18 });
    };
    
    const startInheritance = () => {
      if (!canInherit.value) return;
      
      // 传承技能
      inheritance.value.technique = Math.min(100, inheritance.value.technique + 15);
      inheritance.value.realm = Math.min(100, inheritance.value.realm + 12);
      
      intimacy.value = Math.max(0, intimacy.value - 10);
      
      emit('start-inheritance', { type: 'inheritance', gains: 27 });
    };
    
    const sendGift = () => {
      // 赠送礼物增加亲密度
      intimacy.value = Math.min(100, intimacy.value + 10);
      
      emit('send-gift', { intimacyGain: 10 });
    };
    
    const breakRelation = () => {
      if (!canBreakRelation.value) return;
      
      if (confirm('确定要解除师徒关系吗？')) {
        hasRelationship.value = false;
        emit('break-relation');
      }
    };
    
    const confirmRelation = () => {
      if (!selectedPerson.value) return;
      
      relatedPerson.value = {
        name: selectedPerson.value.name,
        realm: selectedPerson.value.realm,
        level: selectedPerson.value.level
      };
      
      hasRelationship.value = true;
      isMaster.value = activeTab.value === 'master';
      intimacy.value = 30;
      relationshipDays.value = 0;
      
      showListPanel.value = false;
      selectedPerson.value = null;
    };
    
    onMounted(() => {
      // 模拟亲密度和传承进度变化
      setInterval(() => {
        if (intimacy.value < 100) {
          intimacy.value = Math.min(100, intimacy.value + 0.1);
        }
      }, 5000);
    });
    
    return {
      activeTab,
      tabs,
      hasRelationship,
      isMaster,
      relatedPerson,
      intimacy,
      inheritance,
      showListPanel,
      selectedPerson,
      personList,
      inheritanceRewards,
      inheritanceTotal,
      canTeach,
      canInherit,
      canBreakRelation,
      startTeaching,
      startInheritance,
      sendGift,
      breakRelation,
      confirmRelation
    };
  }
};
</script>

<style scoped>
.master-disciple-panel {
  width: 620px;
  max-height: 720px;
  background: linear-gradient(145deg, #1a1a2e, #16213e);
  border-radius: 16px;
  border: 2px solid #4a5568;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(90deg, #2d3748, #4a5568);
  border-bottom: 2px solid #4a5568;
}

.panel-header h2 {
  margin: 0;
  color: #48bb78;
  font-size: 1.4em;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.close-btn {
  background: #e53e3e;
  color: white;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s;
}

.close-btn:hover {
  background: #c53030;
}

.panel-content {
  padding: 16px;
  max-height: 640px;
  overflow-y: auto;
}

/* 标签切换 */
.panel-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid transparent;
  border-radius: 10px;
  color: #a0aec0;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
}

.tab-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.tab-btn.active {
  background: rgba(72, 187, 120, 0.2);
  border-color: #48bb78;
  color: #48bb78;
}

/* 关系卡片 */
.relationship-section {
  margin-bottom: 16px;
}

.relationship-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  margin-bottom: 16px;
}

.relationship-icon {
  font-size: 48px;
}

.relationship-info {
  flex: 1;
}

.relationship-type {
  font-size: 12px;
  color: #a0aec0;
  margin-bottom: 4px;
}

.relationship-name {
  font-size: 20px;
  font-weight: bold;
  color: #fff;
}

.relationship-detail {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: #718096;
  margin-top: 4px;
}

.relationship-level {
  width: 120px;
  text-align: center;
}

.level-label {
  font-size: 12px;
  color: #a0aec0;
  margin-bottom: 8px;
}

.level-progress {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 4px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #48bb78, #38a169);
  transition: width 0.3s;
}

.level-value {
  font-size: 14px;
  font-weight: bold;
  color: #48bb78;
}

/* 传承进度 */
.inheritance-progress {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 16px;
}

.inheritance-progress h4 {
  margin: 0 0 12px 0;
  color: #f7fafc;
  font-size: 14px;
}

.progress-item {
  margin-bottom: 12px;
}

.progress-item:last-child {
  margin-bottom: 0;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #a0aec0;
  margin-bottom: 6px;
}

.progress-bar {
  height: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 5px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.5s;
}

.bar-fill.cultivation {
  background: linear-gradient(90deg, #667eea, #764ba2);
}

.bar-fill.combat {
  background: linear-gradient(90deg, #f093fb, #f5576c);
}

.bar-fill.technique {
  background: linear-gradient(90deg, #f6e05e, #ed8936);
}

.bar-fill.realm {
  background: linear-gradient(90deg, #48bb78, #38a169);
}

/* 无关系状态 */
.no-relationship {
  text-align: center;
  padding: 40px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
  color: #a0aec0;
  margin-bottom: 20px;
}

.action-btn-primary {
  padding: 12px 32px;
  background: linear-gradient(135deg, #48bb78, #38a169);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.action-btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(72, 187, 120, 0.4);
}

/* 操作按钮 */
.actions-section {
  margin-bottom: 16px;
}

.actions-title {
  font-size: 14px;
  color: #f7fafc;
  margin-bottom: 12px;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
}

.action-card:hover:not(.disabled) {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.action-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-icon {
  font-size: 28px;
}

.action-name {
  font-size: 14px;
  font-weight: bold;
  color: #fff;
}

.action-desc {
  font-size: 11px;
  color: #718096;
}

/* 传承奖励 */
.rewards-section {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 16px;
}

.rewards-title {
  font-size: 14px;
  color: #f7fafc;
  margin-bottom: 12px;
}

.rewards-list {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.reward-item {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid transparent;
  border-radius: 10px;
  width: 80px;
  transition: all 0.3s;
}

.reward-item.unlocked {
  border-color: #f6e05e;
  background: rgba(246, 224, 94, 0.1);
}

.reward-level {
  font-size: 10px;
  color: #718096;
  margin-bottom: 4px;
}

.reward-icon {
  font-size: 24px;
  margin-bottom: 4px;
}

.reward-name {
  font-size: 11px;
  color: #a0aec0;
  text-align: center;
}

.reward-requirement {
  font-size: 10px;
  color: #e53e3e;
  margin-top: 4px;
}

.reward-item.unlocked .reward-requirement {
  color: #48bb78;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 500px;
  max-height: 600px;
  background: linear-gradient(145deg, #1a1a2e, #16213e);
  border-radius: 16px;
  border: 2px solid #4a5568;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: rgba(0, 0, 0, 0.2);
}

.modal-title {
  font-size: 18px;
  font-weight: bold;
  color: #fff;
}

.modal-close {
  background: none;
  border: none;
  color: #a0aec0;
  font-size: 24px;
  cursor: pointer;
}

.person-list {
  max-height: 400px;
  overflow-y: auto;
  padding: 16px;
}

.person-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid transparent;
  border-radius: 10px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.3s;
}

.person-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.person-item.selected {
  border-color: #48bb78;
  background: rgba(72, 187, 120, 0.1);
}

.person-avatar {
  font-size: 36px;
}

.person-info {
  flex: 1;
}

.person-name {
  font-size: 16px;
  font-weight: bold;
  color: #fff;
}

.person-detail {
  display: flex;
  gap: 10px;
  font-size: 12px;
  color: #718096;
}

.person-stats {
  font-size: 12px;
  color: #f6e05e;
  margin-top: 4px;
}

.status-badge {
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 10px;
}

.status-badge.available {
  background: rgba(72, 187, 120, 0.2);
  color: #48bb78;
}

.status-badge.full {
  background: rgba(229, 62, 62, 0.2);
  color: #e53e3e;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  background: rgba(0, 0, 0, 0.2);
}

.btn-secondary {
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 8px;
  color: #a0aec0;
  cursor: pointer;
}

.btn-primary {
  padding: 10px 20px;
  background: linear-gradient(135deg, #48bb78, #38a169);
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
