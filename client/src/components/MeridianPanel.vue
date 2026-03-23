<template>
  <div class="meridian-panel" v-if="visible">
    <div class="panel-header">
      <h2>🔮 经脉系统</h2>
      <button class="close-btn" @click="close">×</button>
    </div>
    
    <div class="panel-content">
      <!-- 突破弹窗 -->
      <div class="breakthrough-modal" v-if="showBreakthroughModal">
        <div class="modal-backdrop" @click="cancelBreakthrough"></div>
        <div class="modal-content">
          <!-- 突破中动画 -->
          <div class="breakthrough-animation" v-if="breakthroughState === 'processing'">
            <div class="energy-ring"></div>
            <div class="energy-ring delay-1"></div>
            <div class="energy-ring delay-2"></div>
            <div class="acupoint-glow">
              <span class="glow-icon">{{ breakthroughTarget?.icon }}</span>
            </div>
            <div class="processing-text">突破中...</div>
            <div class="progress-dots">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
            </div>
          </div>
          
          <!-- 突破成功 -->
          <div class="breakthrough-success" v-else-if="breakthroughState === 'success'">
            <div class="success-icon">🎉</div>
            <div class="success-title">突破成功!</div>
            <div class="success-acupoint">{{ breakthroughTarget?.name }}</div>
            <div class="success-level">等级 {{ breakthroughTarget?.level }}</div>
            <div class="success-effect">{{ breakthroughTarget?.effect }}</div>
            <div class="reward-items">
              <div class="reward-item" v-for="(reward, idx) in breakthroughRewards" :key="idx">
                <span class="reward-icon">{{ reward.icon }}</span>
                <span class="reward-text">+{{ reward.value }}</span>
              </div>
            </div>
            <button class="confirm-btn" @click="confirmBreakthrough">确定</button>
          </div>
          
          <!-- 突破失败 -->
          <div class="breakthrough-fail" v-else-if="breakthroughState === 'failed'">
            <div class="fail-icon">💔</div>
            <div class="fail-title">突破失败</div>
            <div class="fail-acupoint">{{ breakthroughTarget?.name }}</div>
            <div class="fail-hint">境界不稳，能量逸散</div>
            <div class="fail-effect">
              <span class="lost-icon">📉</span>
              <span>损失 {{ failedPoints }} 点穴位点</span>
            </div>
            <div class="fail-suggestion">
              <div class="suggestion-title">💡 建议</div>
              <div class="suggestion-text">{{ getSuggestion() }}</div>
            </div>
            <button class="confirm-btn fail" @click="confirmBreakthrough">确定</button>
          </div>
          
          <!-- 突破确认 -->
          <div class="breakthrough-confirm" v-else>
            <div class="confirm-title">确认突破</div>
            <div class="confirm-acupoint">
              <span class="acupoint-icon">{{ breakthroughTarget?.icon }}</span>
              <span class="acupoint-name">{{ breakthroughTarget?.name }}</span>
            </div>
            <div class="confirm-details">
              <div class="detail-row">
                <span class="detail-label">当前等级</span>
                <span class="detail-value">{{ breakthroughTarget?.level }}级</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">目标等级</span>
                <span class="detail-value highlight">{{ breakthroughTarget?.level + 1 }}级</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">突破消耗</span>
                <span class="detail-value">1 穴位点</span>
              </div>
            </div>
            
            <!-- 成功率显示 -->
            <div class="success-rate-section">
              <div class="rate-label">突破成功率</div>
              <div class="rate-bar">
                <div class="rate-fill" :style="{ width: successRate + '%' }" 
                     :class="getRateClass()"></div>
              </div>
              <div class="rate-value" :class="getRateClass()">{{ successRate }}%</div>
            </div>
            
            <!-- 突破加成 -->
            <div class="breakthrough-bonus" v-if="breakthroughBonus > 0">
              <span class="bonus-icon">✨</span>
              <span class="bonus-text">突破祝福: +{{ breakthroughBonus }}% 成功率</span>
            </div>
            
            <div class="modal-actions">
              <button class="cancel-btn" @click="cancelBreakthrough">取消</button>
              <button class="confirm-action-btn" @click="executeBreakthrough">
                确认突破
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div class="meridian-overview">
        <div class=" cultivation-level">
          <span class="label">修炼境界</span>
          <span class="value">{{ cultivation.realm }}</span>
        </div>
        <div class="power-boost">
          <span class="label">战力加成</span>
          <span class="value">+{{ cultivation.powerBonus }}%</span>
        </div>
        <div class="exp-bar">
          <span class="exp-label">修炼经验</span>
          <div class="progress-bar">
            <div class="progress" :style="{ width: cultivation.expPercent + '%' }"></div>
          </div>
          <span class="exp-value">{{ cultivation.exp }}/{{ cultivation.maxExp }}</span>
        </div>
      </div>
      
      <div class="meridian-map">
        <h3>🗺️ 经脉图</h3>
        <div class="channels">
          <div 
            v-for="channel in channels" 
            :key="channel.id"
            class="channel"
            :class="{ active: channel.unlocked, selected: selectedChannel === channel.id }"
            @click="selectChannel(channel)"
          >
            <div class="channel-icon">{{ channel.icon }}</div>
            <div class="channel-name">{{ channel.name }}</div>
            <div class="channel-level">Lv.{{ channel.level }}</div>
          </div>
        </div>
      </div>
      
      <div class="points-section">
        <div class="available-points">
          <span>可用穴位点: <strong>{{ availablePoints }}</strong></span>
          <button class="buy-btn" @click="buyPoints">购买</button>
        </div>
      </div>
      
      <div class="acupoints-section" v-if="selectedChannel">
        <h3>💫 穴位详情 - {{ getChannelName(selectedChannel) }}</h3>
        <div class="acupoints-grid">
          <div 
            v-for="acupoint in getAcupoints(selectedChannel)" 
            :key="acupoint.id"
            class="acupoint"
            :class="{ 
              unlocked: acupoint.unlocked,
              available: acupoint.available && availablePoints > 0,
              max: acupoint.level >= acupoint.maxLevel,
              processing: acupoint.processing
            }"
            @click="handleAcupointClick(acupoint)"
          >
            <div class="acupoint-icon" :class="{ glow: acupoint.available && availablePoints > 0 }">
              {{ acupoint.icon }}
            </div>
            <div class="acupoint-name">{{ acupoint.name }}</div>
            <div class="acupoint-level">
              <span class="level-text">等级 {{ acupoint.level }}/{{ acupoint.maxLevel }}</span>
              <div class="level-bar">
                <div class="level-fill" :style="{ width: (acupoint.level / acupoint.maxLevel * 100) + '%' }"></div>
              </div>
            </div>
            <div class="acupoint-effect">{{ acupoint.effect }}</div>
            <div class="acupoint-bonus" v-if="getAcupointBonus(acupoint) > 0">
              祝福: +{{ getAcupointBonus(acupoint) }}%
            </div>
            <button 
              v-if="acupoint.available && availablePoints > 0 && !acupoint.max" 
              class="upgrade-btn"
              @click.stop="initiateBreakthrough(acupoint)"
            >
              突破
            </button>
            <div class="max-badge" v-if="acupoint.level >= acupoint.maxLevel">已满</div>
          </div>
        </div>
      </div>
      
      <div class="tips-section">
        <h4>💡 修炼提示</h4>
        <ul>
          <li>每个穴位最高可突破至第{{ maxAcupointLevel }}层</li>
          <li>穴位突破有成功率，境界越高成功率越低</li>
          <li>使用突破保护道具可避免失败损失</li>
          <li>打通全部穴位可激活经脉共鸣</li>
          <li>经脉等级提升增加角色战力</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MeridianPanel',
  data() {
    return {
      visible: false,
      selectedChannel: null,
      availablePoints: 5,
      maxAcupointLevel: 10,
      
      // 突破相关状态
      showBreakthroughModal: false,
      breakthroughState: 'confirm', // confirm, processing, success, failed
      breakthroughTarget: null,
      successRate: 0,
      breakthroughBonus: 0,
      breakthroughRewards: [],
      failedPoints: 0,
      breakthroughStreak: 0, // 连击加成
      
      // 玩家属性（用于计算成功率）
      playerStats: {
        realmLevel: 5,        // 境界等级
        totalPower: 5000,     // 总战力
        cultivationTime: 100,  // 修炼时长（小时）
        luck: 10              // 运气值
      },
      
      cultivation: {
        realm: '金丹中期',
        powerBonus: 35,
        exp: 15800,
        maxExp: 20000,
        expPercent: 79
      },
      
      channels: [
        { id: 'ren', name: '任脉', icon: '🌊', level: 5, unlocked: true },
        { id: 'du', name: '督脉', icon: '🔥', level: 4, unlocked: true },
        { id: 'chong', name: '冲脉', icon: '⚡', level: 3, unlocked: true },
        { id: 'dai', name: '带脉', icon: '🌀', level: 2, unlocked: true },
        { id: 'yinwei', name: '阴维脉', icon: '🌙', level: 1, unlocked: true },
        { id: 'yangwei', name: '阳维脉', icon: '☀️', level: 0, unlocked: false }
      ],
      
      acupointsData: {
        ren: [
          { id: 'ren1', name: '承浆穴', icon: '💧', level: 5, maxLevel: 10, effect: '生命+500', unlocked: true, available: false, processing: false, bonus: 5 },
          { id: 'ren2', name: '膻中穴', icon: '❤️', level: 4, maxLevel: 10, effect: '气血+800', unlocked: true, available: true, processing: false, bonus: 8 },
          { id: 'ren3', name: '中脘穴', icon: '🍚', level: 3, maxLevel: 10, effect: '防御+200', unlocked: true, available: true, processing: false, bonus: 10 },
          { id: 'ren4', name: '神阙穴', icon: '🌟', level: 2, maxLevel: 10, effect: '闪避+5%', unlocked: true, available: true, processing: false, bonus: 12 },
          { id: 'ren5', name: '关元穴', icon: '🔮', level: 1, maxLevel: 10, effect: '经验+10%', unlocked: true, available: true, processing: false, bonus: 15 }
        ],
        du: [
          { id: 'du1', name: '长强穴', icon: '🏔️', level: 4, maxLevel: 10, effect: '攻击+300', unlocked: true, available: true, processing: false, bonus: 6 },
          { id: 'du2', name: '腰阳关', icon: '🗡️', level: 3, maxLevel: 10, effect: '暴击+8%', unlocked: true, available: true, processing: false, bonus: 9 },
          { id: 'du3', name: '命门穴', icon: '🌲', level: 2, maxLevel: 10, effect: '韧性+5%', unlocked: true, available: true, processing: false, bonus: 11 },
          { id: 'du4', name: '至阳穴', icon: '☀️', level: 1, maxLevel: 10, effect: '免伤+3%', unlocked: true, available: true, processing: false, bonus: 14 },
          { id: 'du5', name: '大椎穴', icon: '🦅', level: 0, maxLevel: 10, effect: '全属性+50', unlocked: false, available: false, processing: false, bonus: 20 }
        ],
        chong: [
          { id: 'chong1', name: '气穴', icon: '💨', level: 3, maxLevel: 10, effect: '速度+50', unlocked: true, available: true, processing: false, bonus: 7 },
          { id: 'chong2', name: '阴交穴', icon: '🌫️', level: 2, maxLevel: 10, effect: '命中+10%', unlocked: true, available: true, processing: false, bonus: 10 },
          { id: 'chong3', name: '横骨穴', icon: '🦴', level: 1, maxLevel: 10, effect: '生命+300', unlocked: true, available: true, processing: false, bonus: 13 }
        ],
        dai: [
          { id: 'dai1', name: '带脉穴', icon: '⭕', level: 2, maxLevel: 10, effect: '闪避+8%', unlocked: true, available: true, processing: false, bonus: 8 },
          { id: 'dai2', name: '五枢穴', icon: '🔄', level: 1, maxLevel: 10, effect: '防御+150', unlocked: true, available: true, processing: false, bonus: 12 }
        ],
        yinwei: [
          { id: 'yinwei1', name: '内关穴', icon: '🛡️', level: 1, maxLevel: 10, effect: '格挡+5%', unlocked: true, available: true, processing: false, bonus: 10 }
        ],
        yangwei: [
          { id: 'yangwei1', name: '外关穴', icon: '⚔️', level: 0, maxLevel: 10, effect: '反击+5%', unlocked: false, available: false, processing: false, bonus: 15 }
        ]
      }
    };
  },
  methods: {
    show() {
      this.visible = true;
      if (!this.selectedChannel && this.channels[0].unlocked) {
        this.selectedChannel = this.channels[0].id;
      }
    },
    close() {
      this.visible = false;
    },
    selectChannel(channel) {
      if (channel.unlocked) {
        this.selectedChannel = channel.id;
      }
    },
    getChannelName(id) {
      const channel = this.channels.find(c => c.id === id);
      return channel ? channel.name : '';
    },
    getAcupoints(channelId) {
      return this.acupointsData[channelId] || [];
    },
    
    // 计算突破成功率
    calculateSuccessRate(acupoint) {
      const baseRate = 80; // 基础成功率80%
      const levelPenalty = acupoint.level * 3; // 每级减少3%
      const realmBonus = this.playerStats.realmLevel * 2; // 境界每级增加2%
      const luckBonus = this.playerStats.luck; // 运气值直接加成
      const streakBonus = this.breakthroughStreak * 5; // 连击每成功一次增加5%
      const acupointBonus = acupoint.bonus || 0; // 穴位自带的祝福加成
      
      // 计算最终成功率
      let rate = baseRate - levelPenalty + realmBonus + luckBonus + streakBonus + acupointBonus;
      
      // 限制在10%-95%之间
      return Math.max(10, Math.min(95, rate));
    },
    
    // 获取穴位祝福加成
    getAcupointBonus(acupoint) {
      return acupoint.bonus || 0;
    },
    
    // 获取成功率样式
    getRateClass() {
      if (this.successRate >= 70) return 'high';
      if (this.successRate >= 40) return 'medium';
      return 'low';
    },
    
    // 发起突破
    initiateBreakthrough(acupoint) {
      if (!acupoint.unlocked) {
        this.$root.showMessage('该穴位未解锁', 'error');
        return;
      }
      if (acupoint.level >= acupoint.maxLevel) {
        this.$root.showMessage('已达到最高等级', 'error');
        return;
      }
      if (this.availablePoints <= 0) {
        this.$root.showMessage('穴位点不足', 'error');
        return;
      }
      
      this.breakthroughTarget = acupoint;
      this.successRate = this.calculateSuccessRate(acupoint);
      this.breakthroughBonus = acupoint.bonus || 0;
      this.breakthroughState = 'confirm';
      this.showBreakthroughModal = true;
    },
    
    // 取消突破
    cancelBreakthrough() {
      this.showBreakthroughModal = false;
      this.breakthroughTarget = null;
      this.breakthroughState = 'confirm';
    },
    
    // 执行突破
    executeBreakthrough() {
      if (!this.breakthroughTarget) return;
      
      // 开始突破动画
      this.breakthroughState = 'processing';
      
      // 模拟突破过程 (2秒)
      setTimeout(() => {
        // 随机判定成功失败
        const random = Math.random() * 100;
        
        if (random <= this.successRate) {
          // 突破成功
          this.breakthroughSuccess();
        } else {
          // 突破失败
          this.breakthroughFailed();
        }
      }, 2000);
    },
    
    // 突破成功处理
    breakthroughSuccess() {
      this.breakthroughState = 'success';
      this.breakthroughTarget.level++;
      this.availablePoints--;
      this.breakthroughStreak++; // 增加连击
      
      // 计算奖励
      this.breakthroughRewards = [
        { icon: '⚔️', value: Math.floor(50 + this.breakthroughTarget.level * 10) },
        { icon: '🛡️', value: Math.floor(30 + this.breakthroughTarget.level * 8) },
        { icon: '✨', value: Math.floor(10 + this.breakthroughTarget.level * 2) }
      ];
      
      // 更新战力加成
      this.cultivation.powerBonus += Math.floor(2 + this.breakthroughTarget.level * 0.5);
      
      this.$root.showMessage(`${this.breakthroughTarget.name}突破至${this.breakthroughTarget.level}级!`, 'success');
    },
    
    // 突破失败处理
    breakthroughFailed() {
      this.breakthroughState = 'failed';
      this.failedPoints = 1;
      this.availablePoints = Math.max(0, this.availablePoints - 1);
      this.breakthroughStreak = 0; // 重置连击
      
      this.$root.showMessage(`${this.breakthroughTarget.name}突破失败!`, 'error');
    },
    
    // 确认突破结果
    confirmBreakthrough() {
      this.showBreakthroughModal = false;
      this.breakthroughTarget = null;
      this.breakthroughState = 'confirm';
      this.breakthroughRewards = [];
    },
    
    // 获取失败建议
    getSuggestion() {
      const suggestions = [
        '提升境界等级可增加突破成功率',
        '积累更多修炼时长有助于突破',
        '提升战力可提高突破稳定性',
        '使用突破保护符可避免损失',
        '等待运气好时再进行突破'
      ];
      return suggestions[Math.floor(Math.random() * suggestions.length)];
    },
    
    // 处理穴位点击
    handleAcupointClick(acupoint) {
      if (acupoint.available && this.availablePoints > 0 && !acupoint.max && acupoint.unlocked) {
        this.initiateBreakthrough(acupoint);
      }
    },
    
    upgradeAcupoint(acupoint) {
      if (!acupoint.unlocked) {
        this.$root.showMessage('该穴位未解锁', 'error');
        return;
      }
      if (acupoint.level >= acupoint.maxLevel) {
        this.$root.showMessage('已达到最高等级', 'error');
        return;
      }
      if (this.availablePoints <= 0) {
        this.$root.showMessage('穴位点不足', 'error');
        return;
      }
      
      acupoint.level++;
      this.availablePoints--;
      this.$root.showMessage(`${acupoint.name}突破至${acupoint.level}级!`, 'success');
    },
    buyPoints() {
      if (this.availablePoints >= 20) {
        this.$root.showMessage('已达购买上限', 'error');
        return;
      }
      this.availablePoints += 5;
      this.$root.showMessage('购买成功，消耗1000灵石', 'success');
    }
  }
};
</script>

<style scoped>
.meridian-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 520px;
  max-height: 85vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #2d3436 100%);
  border: 2px solid #a29bfe;
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
  background: linear-gradient(90deg, #6c5ce7, #a29bfe);
  color: white;
}

.panel-header h2 { margin: 0; font-size: 20px; }

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 28px;
  cursor: pointer;
}

.panel-content {
  padding: 16px;
  max-height: 75vh;
  overflow-y: auto;
}

.meridian-overview {
  background: rgba(162, 155, 254, 0.15);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.cultivation-level, .power-boost {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.cultivation-level .label, .power-boost .label { color: #8b9dc3; }
.cultivation-level .value { color: #a29bfe; font-weight: bold; font-size: 18px; }
.power-boost .value { color: #00cec9; font-weight: bold; font-size: 18px; }

.exp-bar { margin-top: 12px; }

.exp-label {
  display: block;
  color: #8b9dc3;
  font-size: 12px;
  margin-bottom: 6px;
}

.progress-bar {
  height: 10px;
  background: #2d3436;
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 4px;
}

.progress {
  height: 100%;
  background: linear-gradient(90deg, #6c5ce7, #a29bfe);
  border-radius: 5px;
  transition: width 0.3s;
}

.exp-value { color: #a29bfe; font-size: 12px; }

.meridian-map h3, .acupoints-section h3 {
  color: white;
  margin: 0 0 12px 0;
  font-size: 14px;
}

.channels {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.channel {
  padding: 12px;
  background: rgba(255,255,255,0.05);
  border: 2px solid #636e72;
  border-radius: 10px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.channel.active { border-color: #a29bfe; background: rgba(162, 155, 254, 0.15); }
.channel.selected { border-color: #fdcb6e; background: rgba(253, 203, 110, 0.2); }

.channel-icon { font-size: 28px; margin-bottom: 4px; }
.channel-name { color: white; font-weight: bold; font-size: 14px; }
.channel-level { color: #a29bfe; font-size: 12px; }

.points-section { margin-bottom: 16px; }

.available-points {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: rgba(162, 155, 254, 0.1);
  border-radius: 8px;
}

.available-points span { color: white; }
.available-points strong { color: #fdcb6e; font-size: 20px; }

.buy-btn {
  padding: 8px 16px;
  background: linear-gradient(135deg, #fdcb6e, #f39c12);
  border: none;
  border-radius: 6px;
  color: #333;
  cursor: pointer;
  font-weight: bold;
}

.acupoints-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.acupoint {
  position: relative;
  padding: 12px;
  background: rgba(255,255,255,0.05);
  border: 2px solid #636e72;
  border-radius: 10px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.acupoint.unlocked { border-color: #a29bfe; }
.acupoint.available { border-color: #00cec9; animation: pulse 1.5s infinite; }
.acupoint.max { border-color: #ffd700; }
.acupoint.processing { animation: shake 0.5s infinite; }

@keyframes pulse {
  50% { box-shadow: 0 0 10px rgba(0, 206, 201, 0.5); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
}

.acupoint-icon {
  font-size: 28px;
  margin-bottom: 4px;
  transition: all 0.3s;
}

.acupoint-icon.glow {
  animation: iconGlow 1s ease-in-out infinite;
}

@keyframes iconGlow {
  0%, 100% { filter: drop-shadow(0 0 5px #00cec9); }
  50% { filter: drop-shadow(0 0 15px #00cec9); }
}

.acupoint-name { color: white; font-weight: bold; font-size: 14px; margin-bottom: 2px; }

.acupoint-level {
  margin-bottom: 4px;
}

.level-text { color: #a29bfe; font-size: 11px; }

.level-bar {
  height: 4px;
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 2px;
}

.level-fill {
  height: 100%;
  background: linear-gradient(90deg, #a29bfe, #fdcb6e);
  border-radius: 2px;
  transition: width 0.3s;
}

.acupoint-effect { color: #8b9dc3; font-size: 11px; margin-bottom: 8px; }

.acupoint-bonus {
  color: #ffd700;
  font-size: 10px;
  margin-bottom: 4px;
}

.upgrade-btn {
  padding: 4px 12px;
  background: linear-gradient(135deg, #00b894, #00cec9);
  border: none;
  border-radius: 4px;
  color: white;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.3s;
}

.upgrade-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 0 10px rgba(0, 206, 201, 0.5);
}

.max-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 8px;
  background: #ffd700;
  color: #333;
  font-size: 10px;
  font-weight: bold;
  border-radius: 10px;
}

.tips-section {
  margin-top: 16px;
  padding: 12px;
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
}

.tips-section h4 {
  color: #fdcb6e;
  margin: 0 0 8px 0;
  font-size: 13px;
}

.tips-section ul {
  margin: 0;
  padding-left: 20px;
  color: #8b9dc3;
  font-size: 12px;
}

.tips-section li { margin-bottom: 4px; }

/* 突破弹窗样式 */
.breakthrough-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
}

.modal-content {
  position: relative;
  width: 360px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 2px solid #a29bfe;
  border-radius: 20px;
  padding: 24px;
  color: white;
  animation: modalIn 0.3s ease;
}

@keyframes modalIn {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* 突破确认 */
.confirm-title {
  text-align: center;
  font-size: 22px;
  font-weight: bold;
  margin-bottom: 20px;
  background: linear-gradient(135deg, #ffd700, #ff9900);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.confirm-acupoint {
  text-align: center;
  margin-bottom: 20px;
}

.confirm-acupoint .acupoint-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 8px;
}

.confirm-acupoint .acupoint-name {
  font-size: 20px;
  font-weight: bold;
}

.confirm-details {
  background: rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.detail-row:last-child { border-bottom: none; }

.detail-label { color: #8b9dc3; }
.detail-value { font-weight: bold; }
.detail-value.highlight { color: #ffd700; }

/* 成功率显示 */
.success-rate-section {
  margin-bottom: 16px;
}

.rate-label {
  font-size: 14px;
  color: #8b9dc3;
  margin-bottom: 8px;
}

.rate-bar {
  height: 20px;
  background: rgba(255,255,255,0.1);
  border-radius: 10px;
  overflow: hidden;
  position: relative;
}

.rate-fill {
  height: 100%;
  border-radius: 10px;
  transition: width 0.5s ease;
}

.rate-fill.high { background: linear-gradient(90deg, #00b894, #00cec9); }
.rate-fill.medium { background: linear-gradient(90deg, #fdcb6e, #f39c12); }
.rate-fill.low { background: linear-gradient(90deg, #e17055, #d63031); }

.rate-value {
  text-align: center;
  font-size: 24px;
  font-weight: bold;
  margin-top: 8px;
}

.rate-value.high { color: #00cec9; }
.rate-value.medium { color: #fdcb6e; }
.rate-value.low { color: #e17055; }

.breakthrough-bonus {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  background: rgba(255, 215, 0, 0.1);
  border-radius: 8px;
  margin-bottom: 16px;
}

.bonus-icon { font-size: 16px; }
.bonus-text { color: #ffd700; font-size: 12px; }

.modal-actions {
  display: flex;
  gap: 12px;
}

.cancel-btn, .confirm-action-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.cancel-btn {
  background: rgba(255,255,255,0.1);
  color: #aaa;
}

.confirm-action-btn {
  background: linear-gradient(135deg, #ffd700, #ff9900);
  color: #333;
}

.confirm-action-btn:hover {
  transform: scale(1.02);
  box-shadow: 0 0 15px rgba(255, 215, 0, 0.4);
}

/* 突破动画 */
.breakthrough-animation {
  text-align: center;
  padding: 40px 0;
  position: relative;
  overflow: hidden;
}

.energy-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80px;
  height: 80px;
  border: 3px solid #a29bfe;
  border-radius: 50%;
  animation: expandRing 2s ease-out infinite;
}

.energy-ring.delay-1 { animation-delay: 0.5s; }
.energy-ring.delay-2 { animation-delay: 1s; opacity: 0; }

@keyframes expandRing {
  0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
}

.acupoint-glow {
  position: relative;
  display: inline-block;
  margin: 20px 0;
}

.glow-icon {
  font-size: 64px;
  animation: glowPulse 1s ease-in-out infinite;
}

@keyframes glowPulse {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 10px #a29bfe); }
  50% { transform: scale(1.1); filter: drop-shadow(0 0 20px #ffd700); }
}

.processing-text {
  font-size: 18px;
  color: #a29bfe;
  margin-top: 20px;
  animation: textPulse 1s ease-in-out infinite;
}

@keyframes textPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.progress-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 10px;
}

.dot {
  width: 8px;
  height: 8px;
  background: #a29bfe;
  border-radius: 50%;
  animation: dotPulse 1s ease-in-out infinite;
}

.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes dotPulse {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.3); opacity: 1; }
}

/* 突破成功 */
.breakthrough-success {
  text-align: center;
  padding: 20px 0;
}

.success-icon {
  font-size: 64px;
  animation: successBounce 0.5s ease;
}

@keyframes successBounce {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.success-title {
  font-size: 28px;
  font-weight: bold;
  color: #00cec9;
  margin: 16px 0;
  animation: successFadeIn 0.5s ease 0.3s both;
}

@keyframes successFadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.success-acupoint {
  font-size: 20px;
  color: #ffd700;
  margin-bottom: 8px;
  animation: successFadeIn 0.5s ease 0.4s both;
}

.success-level {
  font-size: 16px;
  color: #a29bfe;
  margin-bottom: 16px;
  animation: successFadeIn 0.5s ease 0.5s both;
}

.success-effect {
  font-size: 14px;
  color: #8b9dc3;
  margin-bottom: 20px;
  animation: successFadeIn 0.5s ease 0.6s both;
}

.reward-items {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 20px;
  animation: successFadeIn 0.5s ease 0.7s both;
}

.reward-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  background: rgba(0, 206, 201, 0.2);
  border-radius: 8px;
}

.reward-icon { font-size: 18px; }
.reward-text { color: #00cec9; font-weight: bold; }

.confirm-btn {
  padding: 12px 40px;
  background: linear-gradient(135deg, #00b894, #00cec9);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  animation: successFadeIn 0.5s ease 0.8s both;
}

.confirm-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 0 20px rgba(0, 206, 201, 0.5);
}

/* 突破失败 */
.breakthrough-fail {
  text-align: center;
  padding: 20px 0;
}

.fail-icon {
  font-size: 64px;
  animation: failShake 0.5s ease;
}

@keyframes failShake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-10px); }
  40% { transform: translateX(10px); }
  60% { transform: translateX(-10px); }
  80% { transform: translateX(10px); }
}

.fail-title {
  font-size: 28px;
  font-weight: bold;
  color: #e17055;
  margin: 16px 0;
  animation: failFadeIn 0.5s ease 0.2s both;
}

@keyframes failFadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.fail-acupoint {
  font-size: 20px;
  color: #ffd700;
  margin-bottom: 8px;
  animation: failFadeIn 0.5s ease 0.3s both;
}

.fail-hint {
  font-size: 14px;
  color: #8b9dc3;
  margin-bottom: 16px;
  animation: failFadeIn 0.5s ease 0.4s both;
}

.fail-effect {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: rgba(225, 112, 85, 0.2);
  border-radius: 8px;
  margin-bottom: 16px;
  animation: failFadeIn 0.5s ease 0.5s both;
}

.lost-icon { font-size: 18px; }
.fail-effect span { color: #e17055; }

.fail-suggestion {
  padding: 12px;
  background: rgba(255, 215, 0, 0.1);
  border-radius: 8px;
  margin-bottom: 20px;
  animation: failFadeIn 0.5s ease 0.6s both;
}

.suggestion-title {
  font-size: 14px;
  color: #ffd700;
  margin-bottom: 8px;
}

.suggestion-text {
  font-size: 12px;
  color: #8b9dc3;
}

.confirm-btn.fail {
  background: linear-gradient(135deg, #e17055, #d63031);
}

.confirm-btn.fail:hover {
  box-shadow: 0 0 20px rgba(225, 112, 85, 0.5);
}
</style>