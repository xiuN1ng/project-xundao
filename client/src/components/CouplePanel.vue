<template>
  <div class="couple-panel">
    <div class="panel-header">
      <h3>仙侣双修</h3>
      <button class="close-btn" @click="closePanel">×</button>
    </div>
    
    <div class="panel-content">
      <!-- 已婚状态 -->
      <div v-if="coupleInfo" class="couple-status">
        <div class="partner-info">
          <div class="partner-avatar">
            <span>{{ coupleInfo.partner.avatar || '👫' }}</span>
          </div>
          <div class="partner-details">
            <div class="partner-name">{{ coupleInfo.partner.name }}</div>
            <div class="partner-level">境界: {{ coupleInfo.partner.realm }}</div>
            <div class="partner-combat">战力: {{ formatNumber(coupleInfo.partner.combat) }}</div>
          </div>
        </div>
        
        <div class="couple-stats">
          <div class="stat-item">
            <span class="stat-label">亲密度</span>
            <div class="stat-bar">
              <div class="stat-fill" :style="{ width: coupleInfo.intimacy + '%' }"></div>
            </div>
            <span class="stat-value">{{ coupleInfo.intimacy }} / 10000</span>
          </div>
          
          <div class="couple-skills">
            <h4>仙侣技能</h4>
            <div class="skill-list">
              <div v-for="skill in coupleSkills" :key="skill.id" class="skill-item">
                <span class="skill-icon">{{ skill.icon }}</span>
                <div class="skill-info">
                  <span class="skill-name">{{ skill.name }}</span>
                  <span class="skill-desc">{{ skill.description }}</span>
                </div>
                <button class="skill-btn" @click="activateSkill(skill.id)" :disabled="skill.cooldown">
                  {{ skill.cooldown ? `${skill.cooldown}s` : '激活' }}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="cultivate-section">
          <h4>双修</h4>
          <div class="cultivate-options">
            <button class="cultivate-btn" @click="startCultivate('normal')" :disabled="cultivating">
              普通双修
            </button>
            <button class="cultivate-btn premium" @click="startCultivate('premium')" :disabled="cultivating">
              高级双修 ✨
            </button>
          </div>
          <div class="cultivate-result" v-if="cultivateResult">
            <span class="result-exp">+{{ cultivateResult.exp }} 经验</span>
            <span class="result-intimacy">+{{ cultivateResult.intimacy }} 亲密</span>
          </div>
        </div>
      </div>
      
      <!-- 未婚状态 -->
      <div v-else class="no-couple">
        <div class="no-couple-icon">💑</div>
        <p>还没有找到仙侣</p>
        <button class="find-btn" @click="findPartner">寻找仙侣</button>
        
        <div class="proposals" v-if="proposals.length > 0">
          <h4>收到的求婚</h4>
          <div class="proposal-list">
            <div v-for="proposal in proposals" :key="proposal.id" class="proposal-item">
              <div class="proposer-info">
                <span class="proposer-avatar">{{ proposal.avatar }}</span>
                <div class="proposer-details">
                  <span class="proposer-name">{{ proposal.name }}</span>
                  <span class="proposer-combat">战力: {{ formatNumber(proposal.combat) }}</span>
                </div>
              </div>
              <div class="proposal-actions">
                <button class="accept-btn" @click="respondProposal(proposal.id, true)">接受</button>
                <button class="reject-btn" @click="respondProposal(proposal.id, false)">拒绝</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CouplePanel',
  emits: ['close'],
  setup(props, { emit }) {
    const coupleInfo = ref(null);
    const proposals = ref([]);
    const cultivating = ref(false);
    const cultivateResult = ref(null);
    
    const coupleSkills = ref([
      {
        id: 'double_exp',
        name: '双倍修炼',
        icon: '✨',
        description: '双方获得经验翻倍',
        cooldown: 0
      },
      {
        id: 'heal',
        name: '灵犀回复',
        icon: '💚',
        description: '回复双方生命值',
        cooldown: 0
      },
      {
        id: 'shield',
        name: '同心护盾',
        icon: '🛡️',
        description: '为双方添加护盾',
        cooldown: 0
      }
    ]);
    
    const formatNumber = (num) => {
      if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万';
      }
      return num.toString();
    };
    
    const loadCoupleInfo = async () => {
      try {
        const response = await fetch('/api/couple/info');
        const data = await response.json();
        
        if (data.success) {
          coupleInfo.value = data.info;
          proposals.value = data.proposals || [];
        }
      } catch (error) {
        console.error('加载仙侣信息失败:', error);
      }
    };
    
    const findPartner = async () => {
      try {
        const response = await fetch('/api/couple/find', { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
          // 打开求婚面板或显示结果
          alert('已向 ' + data.targetName + ' 发送求婚请求');
        } else {
          alert(data.message || '寻找失败');
        }
      } catch (error) {
        console.error('寻找仙侣失败:', error);
      }
    };
    
    const respondProposal = async (proposalId, accept) => {
      try {
        const response = await fetch('/api/couple/respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proposalId, accept })
        });
        
        const data = await response.json();
        
        if (data.success) {
          if (accept) {
            coupleInfo.value = data.coupleInfo;
          }
          proposals.value = proposals.value.filter(p => p.id !== proposalId);
        } else {
          alert(data.message || '操作失败');
        }
      } catch (error) {
        console.error('响应求婚失败:', error);
      }
    };
    
    const activateSkill = async (skillId) => {
      const skill = coupleSkills.value.find(s => s.id === skillId);
      if (!skill || skill.cooldown > 0) return;
      
      try {
        const response = await fetch('/api/couple/skill/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skillId })
        });
        
        const data = await response.json();
        
        if (data.success) {
          skill.cooldown = data.cooldown || 60;
          
          // 倒计时
          const interval = setInterval(() => {
            if (skill.cooldown > 0) {
              skill.cooldown--;
            } else {
              clearInterval(interval);
            }
          }, 1000);
        }
      } catch (error) {
        console.error('激活技能失败:', error);
      }
    };
    
    const startCultivate = async (type) => {
      cultivating.value = true;
      cultivateResult.value = null;
      
      try {
        const response = await fetch('/api/couple/cultivate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type })
        });
        
        const data = await response.json();
        
        if (data.success) {
          cultivateResult.value = data.result;
          
          // 更新亲密度
          if (coupleInfo.value) {
            coupleInfo.value.intimacy += data.result.intimacy;
          }
        }
      } catch (error) {
        console.error('双修失败:', error);
      } finally {
        cultivating.value = false;
      }
    };
    
    const closePanel = () => {
      emit('close');
    };
    
    onMounted(() => {
      loadCoupleInfo();
    });
    
    return {
      coupleInfo,
      proposals,
      coupleSkills,
      cultivating,
      cultivateResult,
      formatNumber,
      findPartner,
      respondProposal,
      activateSkill,
      startCultivate,
      closePanel
    };
  }
};
</script>

<style scoped>
.couple-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 450px;
  max-height: 80vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  border: 2px solid #ed64a6;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  color: #e2e8f0;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #ed64a6;
  background: linear-gradient(90deg, #2d3748 0%, #1a202c 100%);
}

.panel-header h3 {
  margin: 0;
  font-size: 18px;
  color: #ed64a6;
}

.close-btn {
  background: none;
  border: none;
  color: #a0aec0;
  font-size: 24px;
  cursor: pointer;
  transition: color 0.3s;
}

.close-btn:hover {
  color: #fff;
}

.panel-content {
  padding: 20px;
  max-height: calc(80vh - 60px);
  overflow-y: auto;
}

.couple-status {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.partner-info {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(237, 100, 166, 0.2) 0%, rgba(237, 100, 166, 0.1) 100%);
  border-radius: 12px;
  border: 1px solid #ed64a6;
}

.partner-avatar {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a202c;
  border-radius: 50%;
  font-size: 32px;
}

.partner-details {
  flex: 1;
}

.partner-name {
  font-size: 18px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 4px;
}

.partner-level, .partner-combat {
  font-size: 13px;
  color: #a0aec0;
}

.couple-stats {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-label {
  font-size: 13px;
  color: #a0aec0;
}

.stat-bar {
  height: 8px;
  background: #2d3748;
  border-radius: 4px;
  overflow: hidden;
}

.stat-fill {
  height: 100%;
  background: linear-gradient(90deg, #ed64a6 0%, #f687b3 100%);
  border-radius: 4px;
  transition: width 0.3s;
}

.stat-value {
  font-size: 12px;
  color: #ed64a6;
}

.couple-skills h4, .cultivate-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #cbd5e0;
}

.skill-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skill-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: #2d3748;
  border-radius: 8px;
}

.skill-icon {
  font-size: 24px;
}

.skill-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.skill-name {
  font-size: 14px;
  color: #fff;
}

.skill-desc {
  font-size: 11px;
  color: #718096;
}

.skill-btn {
  padding: 6px 12px;
  background: linear-gradient(135deg, #ed64a6 0%, #d53f8c 100%);
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.skill-btn:hover:not(:disabled) {
  transform: scale(1.05);
}

.skill-btn:disabled {
  background: #4a5568;
  cursor: not-allowed;
}

.cultivate-options {
  display: flex;
  gap: 12px;
}

.cultivate-btn {
  flex: 1;
  padding: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.cultivate-btn.premium {
  background: linear-gradient(135deg, #ed64a6 0%, #d53f8c 100%);
}

.cultivate-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.cultivate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cultivate-result {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 12px;
  padding: 12px;
  background: #2d3748;
  border-radius: 8px;
}

.result-exp {
  color: #68d391;
}

.result-intimacy {
  color: #ed64a6;
}

.no-couple {
  text-align: center;
  padding: 20px;
}

.no-couple-icon {
  font-size: 64px;
  margin-bottom: 12px;
}

.no-couple p {
  color: #a0aec0;
  margin-bottom: 20px;
}

.find-btn {
  padding: 12px 32px;
  background: linear-gradient(135deg, #ed64a6 0%, #d53f8c 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.find-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(237, 100, 166, 0.4);
}

.proposals {
  margin-top: 24px;
  text-align: left;
}

.proposals h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #cbd5e0;
}

.proposal-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.proposal-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #2d3748;
  border-radius: 8px;
}

.proposer-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.proposer-avatar {
  font-size: 32px;
}

.proposer-details {
  display: flex;
  flex-direction: column;
}

.proposer-name {
  font-size: 14px;
  color: #fff;
}

.proposer-combat {
  font-size: 12px;
  color: #a0aec0;
}

.proposal-actions {
  display: flex;
  gap: 8px;
}

.accept-btn {
  padding: 6px 12px;
  background: #48bb78;
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 12px;
  cursor: pointer;
}

.reject-btn {
  padding: 6px 12px;
  background: #4a5568;
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 12px;
  cursor: pointer;
}
</style>
