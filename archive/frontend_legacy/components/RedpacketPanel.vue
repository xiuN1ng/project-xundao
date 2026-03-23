<template>
  <div class="redpacket-panel" v-if="visible">
    <div class="panel-header">
      <h2>🧧 红包大厅</h2>
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
      <!-- 红包列表 -->
      <div v-if="currentTab === 'list'" class="redpacket-list">
        <div 
          v-for="redpacket in redpacketList" 
          :key="redpacket.id" 
          class="redpacket-item"
          :class="{ 'taken': redpacket.taken }"
        >
          <div class="redpacket-icon">🧧</div>
          <div class="redpacket-info">
            <div class="sender-name">{{ redpacket.senderName }}</div>
            <div class="redpacket-amount">
              <span v-if="redpacket.type === 'fixed'">{{ redpacket.amount }}灵石</span>
              <span v-else>随机红包</span>
            </div>
            <div class="redpacket-time">{{ formatTime(redpacket.createdAt) }}</div>
          </div>
          <div class="redpacket-status">
            <div v-if="redpacket.taken" class="taken-text">已抢</div>
            <div v-else-if="redpacket.remaining > 0" class="remaining-text">
              剩余 {{ redpacket.remaining }}/{{ redpacket.total }}
            </div>
            <button 
              v-if="!redpacket.taken && redpacket.remaining > 0" 
              class="grab-btn"
              @click="grabRedpacket(redpacket)"
            >
              抢
            </button>
          </div>
        </div>
        
        <div v-if="redpacketList.length === 0" class="empty-state">
          <div class="empty-icon">📭</div>
          <div class="empty-text">暂无红包</div>
        </div>
      </div>
      
      <!-- 发放红包 -->
      <div v-if="currentTab === 'send'" class="send-redpacket">
        <div class="form-group">
          <label>红包类型</label>
          <div class="type-selector">
            <button 
              :class="['type-btn', { active: sendForm.type === 'fixed' }]"
              @click="sendForm.type = 'fixed'"
            >
              固定金额
            </button>
            <button 
              :class="['type-btn', { active: sendForm.type === 'random' }]"
              @click="sendForm.type = 'random'"
            >
              拼手气
            </button>
          </div>
        </div>
        
        <div class="form-group">
          <label>红包金额 (灵石)</label>
          <input 
            type="number" 
            v-model.number="sendForm.amount" 
            placeholder="请输入金额"
            min="100"
          />
        </div>
        
        <div class="form-group">
          <label>红包个数</label>
          <input 
            type="number" 
            v-model.number="sendForm.count" 
            placeholder="请输入个数"
            min="1"
            max="100"
          />
        </div>
        
        <div class="form-group">
          <label>祝福语</label>
          <input 
            type="text" 
            v-model="sendForm.message" 
            placeholder="恭喜发财，大吉大利"
            maxlength="20"
          />
        </div>
        
        <div class="form-group" v-if="sendForm.type === 'random'">
          <label>单个红包</label>
          <div class="preview-range">
            约 {{ Math.floor(sendForm.amount / sendForm.count / 2) }} - {{ Math.floor(sendForm.amount / sendForm.count * 2) }} 灵石
          </div>
        </div>
        
        <div class="total-preview">
          <span>总计:</span>
          <span class="total-amount">{{ sendForm.amount || 0 }} 灵石</span>
        </div>
        
        <button 
          class="send-btn" 
          :disabled="!canSend"
          @click="sendRedpacket"
        >
          🧧 发送红包
        </button>
      </div>
      
      <!-- 我的红包 -->
      <div v-if="currentTab === 'mine'" class="my-redpackets">
        <div class="stats-cards">
          <div class="stat-card">
            <div class="stat-icon">📤</div>
            <div class="stat-value">{{ myStats.sent }}</div>
            <div class="stat-label">已发出</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">📥</div>
            <div class="stat-value">{{ myStats.received }}</div>
            <div class="stat-label">已抢到</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">💰</div>
            <div class="stat-value">{{ myStats.totalAmount }}</div>
            <div class="stat-label">总金额</div>
          </div>
        </div>
        
        <div class="history-section">
          <h3>发送记录</h3>
          <div class="history-list">
            <div v-for="item in sentHistory" :key="item.id" class="history-item">
              <div class="history-icon">🧧</div>
              <div class="history-info">
                <div class="history-amount">{{ item.amount }}灵石 × {{ item.count }}个</div>
                <div class="history-time">{{ formatTime(item.createdAt) }}</div>
              </div>
              <div class="history-status">
                {{ item.taken }}/{{ item.count }}已抢
              </div>
            </div>
            <div v-if="sentHistory.length === 0" class="empty-text">暂无发送记录</div>
          </div>
        </div>
        
        <div class="history-section">
          <h3>抢红包记录</h3>
          <div class="history-list">
            <div v-for="item in receivedHistory" :key="item.id" class="history-item">
              <div class="history-icon">💫</div>
              <div class="history-info">
                <div class="history-amount">来自 {{ item.senderName }}</div>
                <div class="history-amount">{{ item.amount }}灵石</div>
                <div class="history-time">{{ formatTime(item.createdAt) }}</div>
              </div>
            </div>
            <div v-if="receivedHistory.length === 0" class="empty-text">暂无抢红包记录</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 抢红包结果弹窗 -->
    <div v-if="showGrabResult" class="grab-result-overlay" @click="showGrabResult = false">
      <div class="grab-result" @click.stop>
        <div class="result-icon">{{ grabResult.isMax ? '🎉' : '👏' }}</div>
        <div class="result-title">{{ grabResult.isMax ? '手气最佳！' : '抢到了！' }}</div>
        <div class="result-amount">{{ grabResult.amount }} 灵石</div>
        <div class="result-message">{{ grabResult.message }}</div>
        <button class="close-result-btn" @click="showGrabResult = false">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

const visible = ref(false);
const currentTab = ref('list');
const showGrabResult = ref(false);
const grabResult = ref({ amount: 0, message: '', isMax: false });

const tabs = [
  { id: 'list', name: '红包列表', icon: '📋' },
  { id: 'send', name: '发放红包', icon: '📤' },
  { id: 'mine', name: '我的红包', icon: '📦' }
];

const sendForm = ref({
  type: 'fixed',
  amount: 1000,
  count: 5,
  message: '恭喜发财，大吉大利'
});

const redpacketList = ref([
  { id: 1, senderName: '盟主大人', type: 'random', amount: 10000, total: 10, remaining: 3, createdAt: Date.now() - 60000 },
  { id: 2, senderName: '长老张三', type: 'fixed', amount: 5000, total: 5, remaining: 5, createdAt: Date.now() - 120000 },
  { id: 3, senderName: '弟子李四', type: 'random', amount: 3000, total: 8, remaining: 0, taken: true, createdAt: Date.now() - 300000 },
  { id: 4, senderName: '仙子王五', type: 'fixed', amount: 8000, total: 10, remaining: 7, createdAt: Date.now() - 600000 }
]);

const myStats = ref({
  sent: 12,
  received: 28,
  totalAmount: 45600
});

const sentHistory = ref([
  { id: 1, amount: 5000, count: 5, taken: 5, createdAt: Date.now() - 3600000 },
  { id: 2, amount: 10000, count: 10, taken: 8, createdAt: Date.now() - 7200000 },
  { id: 3, amount: 3000, count: 5, taken: 5, createdAt: Date.now() - 86400000 }
]);

const receivedHistory = ref([
  { id: 1, senderName: '盟主大人', amount: 1580, createdAt: Date.now() - 60000 },
  { id: 2, senderName: '长老张三', amount: 880, createdAt: Date.now() - 120000 },
  { id: 3, senderName: '弟子李四', amount: 200, createdAt: Date.now() - 300000 }
]);

const canSend = computed(() => {
  return sendForm.value.amount >= 100 && 
         sendForm.value.count >= 1 && 
         sendForm.value.count <= 100;
});

function show() {
  visible.value = true;
  loadRedpackets();
}

function close() {
  visible.value = false;
}

async function loadRedpackets() {
  try {
    const response = await fetch('/api/redpacket/list');
    if (response.ok) {
      const data = await response.json();
      if (data.data) {
        redpacketList.value = data.data;
      }
    }
  } catch (e) {
    console.log('使用默认红包数据');
  }
}

async function grabRedpacket(redpacket) {
  try {
    const response = await fetch('/api/redpacket/grab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ redpacketId: redpacket.id })
    });
    
    const data = await response.json();
    
    if (data.success) {
      const amount = data.amount || Math.floor(redpacket.amount / redpacket.total);
      const isMax = data.isMax || false;
      
      grabResult.value = {
        amount: amount,
        message: isMax ? '你是本轮手气最佳！' : redpacket.message || '恭喜发财',
        isMax: isMax
      };
      showGrabResult.value = true;
      
      redpacket.remaining--;
      if (redpacket.remaining <= 0) {
        redpacket.taken = true;
      }
    } else {
      alert(data.message || '抢红包失败');
    }
  } catch (e) {
    // 模拟抢红包
    const amount = Math.floor(redpacket.amount / redpacket.total * (0.5 + Math.random()));
    grabResult.value = {
      amount: amount,
      message: redpacket.message || '恭喜发财',
      isMax: false
    };
    showGrabResult.value = true;
    
    redpacket.remaining--;
    if (redpacket.remaining <= 0) {
      redpacket.taken = true;
    }
  }
}

async function sendRedpacket() {
  if (!canSend.value) {
    alert('请填写正确的红包信息');
    return;
  }
  
  try {
    const response = await fetch('/api/redpacket/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: sendForm.value.type,
        amount: sendForm.value.amount,
        count: sendForm.value.count,
        message: sendForm.value.message
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('红包发送成功！');
      myStats.value.sent++;
      
      // 添加到列表
      redpacketList.value.unshift({
        id: Date.now(),
        senderName: '我',
        type: sendForm.value.type,
        amount: sendForm.value.amount,
        total: sendForm.value.count,
        remaining: sendForm.value.count,
        message: sendForm.value.message,
        createdAt: Date.now()
      });
      
      // 重置表单
      sendForm.value = {
        type: 'fixed',
        amount: 1000,
        count: 5,
        message: '恭喜发财，大吉大利'
      };
      
      currentTab.value = 'list';
    } else {
      alert(data.message || '发送失败');
    }
  } catch (e) {
    // 模拟发送成功
    alert('红包发送成功！');
    myStats.value.sent++;
    
    redpacketList.value.unshift({
      id: Date.now(),
      senderName: '我',
      type: sendForm.value.type,
      amount: sendForm.value.amount,
      total: sendForm.value.count,
      remaining: sendForm.value.count,
      message: sendForm.value.message,
      createdAt: Date.now()
    });
    
    sendForm.value = {
      type: 'fixed',
      amount: 1000,
      count: 5,
      message: '恭喜发财，大吉大利'
    };
    
    currentTab.value = 'list';
  }
}

function formatTime(timestamp) {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return `${Math.floor(diff / 86400000)}天前`;
}

// 暴露方法
defineExpose({
  show,
  close
});
</script>

<style scoped>
.redpacket-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 520px;
  max-height: 85vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #c0392b 100%);
  border: 2px solid #e74c3c;
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
  background: linear-gradient(90deg, #c0392b, #e74c3c);
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
}

.tab-btn {
  flex: 1;
  padding: 10px 8px;
  background: transparent;
  border: none;
  color: #8b9dc3;
  cursor: pointer;
  border-radius: 8px;
  font-size: 12px;
  transition: all 0.3s;
}

.tab-btn.active {
  background: linear-gradient(135deg, #c0392b, #e74c3c);
  color: white;
}

.panel-content {
  padding: 16px;
  max-height: 65vh;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.3);
}

/* 红包列表 */
.redpacket-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.redpacket-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: linear-gradient(135deg, #c0392b, #e74c3c);
  border-radius: 12px;
  color: white;
}

.redpacket-item.taken {
  background: #636e72;
  opacity: 0.7;
}

.redpacket-icon {
  font-size: 40px;
  margin-right: 12px;
}

.redpacket-info {
  flex: 1;
}

.sender-name {
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 4px;
}

.redpacket-amount {
  font-size: 16px;
  font-weight: bold;
}

.redpacket-time {
  font-size: 11px;
  opacity: 0.8;
}

.redpacket-status {
  text-align: center;
}

.remaining-text {
  font-size: 11px;
  color: #ffd700;
}

.taken-text {
  font-size: 12px;
  color: #bdc3c7;
}

.grab-btn {
  padding: 8px 20px;
  background: #ffd700;
  border: none;
  border-radius: 20px;
  color: #c0392b;
  font-weight: bold;
  cursor: pointer;
  font-size: 14px;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

/* 发放红包 */
.send-redpacket {
  padding: 10px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  color: #ecf0f1;
  font-size: 13px;
  margin-bottom: 8px;
}

.type-selector {
  display: flex;
  gap: 10px;
}

.type-btn {
  flex: 1;
  padding: 10px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid transparent;
  border-radius: 8px;
  color: #bdc3c7;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.3s;
}

.type-btn.active {
  border-color: #ffd700;
  color: #ffd700;
  background: rgba(255, 215, 0, 0.1);
}

.form-group input {
  width: 100%;
  padding: 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  font-size: 14px;
}

.form-group input::placeholder {
  color: #95a5a6;
}

.preview-range {
  padding: 10px;
  background: rgba(255, 215, 0, 0.1);
  border-radius: 6px;
  color: #ffd700;
  font-size: 12px;
  text-align: center;
}

.total-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  margin-bottom: 16px;
  color: #ecf0f1;
}

.total-amount {
  color: #ffd700;
  font-weight: bold;
  font-size: 18px;
}

.send-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #f1c40f, #f39c12);
  border: none;
  border-radius: 8px;
  color: #c0392b;
  font-weight: bold;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(241, 196, 15, 0.4);
}

.send-btn:disabled {
  background: #636e72;
  cursor: not-allowed;
}

/* 我的红包 */
.stats-cards {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.stat-card {
  flex: 1;
  padding: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  text-align: center;
}

.stat-icon {
  font-size: 24px;
  margin-bottom: 4px;
}

.stat-value {
  color: #ffd700;
  font-size: 20px;
  font-weight: bold;
}

.stat-label {
  color: #bdc3c7;
  font-size: 11px;
}

.history-section {
  margin-bottom: 16px;
}

.history-section h3 {
  color: white;
  font-size: 14px;
  margin-bottom: 10px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  display: flex;
  align-items: center;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.history-icon {
  font-size: 24px;
  margin-right: 10px;
}

.history-info {
  flex: 1;
}

.history-amount {
  color: white;
  font-size: 13px;
}

.history-time {
  color: #95a5a6;
  font-size: 11px;
}

.history-status {
  color: #bdc3c7;
  font-size: 12px;
}

.empty-text {
  text-align: center;
  color: #636e72;
  padding: 20px;
  font-size: 13px;
}

.empty-state {
  text-align: center;
  padding: 40px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-text {
  color: #8b9dc3;
}

/* 抢红包结果弹窗 */
.grab-result-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.grab-result {
  background: linear-gradient(135deg, #c0392b, #e74c3c);
  padding: 30px 40px;
  border-radius: 20px;
  text-align: center;
  color: white;
  animation: popIn 0.3s ease;
}

.result-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.result-title {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 12px;
  color: #ffd700;
}

.result-amount {
  font-size: 36px;
  font-weight: bold;
  margin-bottom: 12px;
}

.result-message {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 20px;
}

.close-result-btn {
  padding: 10px 40px;
  background: #ffd700;
  border: none;
  border-radius: 20px;
  color: #c0392b;
  font-weight: bold;
  cursor: pointer;
  font-size: 14px;
}

@keyframes popIn {
  from {
    transform: scale(0.5);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
