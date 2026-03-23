<template>
  <div class="mail-panel">
    <h2>📧 邮件系统</h2>
    
    <!-- 操作栏 -->
    <div class="mail-actions">
      <button @click="refresh" class="action-btn">
        🔄 刷新
      </button>
      <button @click="markAllRead" class="action-btn">
        ✓ 全部已读
      </button>
    </div>
    
    <!-- 邮件列表 -->
    <div class="mail-list">
      <div v-for="mail in mails" :key="mail.id" 
           class="mail-card"
           :class="{ unread: !mail.read, hasAttachment: mail.attachments?.length }"
           @click="openMail(mail)">
        
        <!-- 发件人头像 -->
        <div class="sender-avatar">
          {{ mail.sender[0] }}
        </div>
        
        <!-- 邮件内容 -->
        <div class="mail-content">
          <div class="mail-header">
            <span class="sender-name">{{ mail.sender }}</span>
            <span class="mail-time">{{ formatTime(mail.time) }}</span>
          </div>
          <div class="mail-title">{{ mail.title }}</div>
        </div>
        
        <!-- 附件标识 -->
        <div v-if="mail.attachments?.length" class="attachment-badge">
          📎 {{ mail.attachments.length }}
        </div>
        
        <!-- 未读标识 -->
        <div v-if="!mail.read" class="unread-dot"></div>
      </div>
    </div>
    
    <!-- 详情弹窗 -->
    <div v-if="selectedMail" class="mail-modal" @click.self="selectedMail = null">
      <div class="modal-content">
        <div class="modal-header">
          <div class="sender-info">
            <div class="sender-avatar large">{{ selectedMail.sender[0] }}</div>
            <div>
              <span class="sender-name">{{ selectedMail.sender }}</span>
              <span class="mail-time">{{ formatTime(selectedMail.time) }}</span>
            </div>
          </div>
          <button class="close-btn" @click="selectedMail = null">✕</button>
        </div>
        
        <div class="modal-body">
          <h3>{{ selectedMail.title }}</h3>
          <p>{{ selectedMail.content }}</p>
        </div>
        
        <!-- 附件 -->
        <div v-if="selectedMail.attachments?.length" class="attachments">
          <h4>📎 附件</h4>
          <div class="attachment-list">
            <div v-for="att in selectedMail.attachments" :key="att.id" class="attachment-item">
              <span class="att-icon">💰</span>
              <span class="att-name">{{ att.name }}</span>
              <button v-if="!att.claimed" @click="claim(att)" class="claim-btn">
                领取
              </button>
              <span v-else class="claimed">已领取</span>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="delete-btn" @click="deleteMail(selectedMail)">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { mailApi } from '../api'
import axios from 'axios'

const mails = ref([
  { id: 1, sender: '系统', title: '欢迎来到修仙世界', content: '恭喜你踏入修仙之路！', time: Date.now() - 3600000, read: false, attachments: [{ id: 1, name: '灵石x100', claimed: false }] },
  { id: 2, sender: '掌门', title: '宗门任务', content: '请完成宗门贡献任务', time: Date.now() - 86400000, read: true, attachments: [] }
])

const selectedMail = ref(null)

function openMail(mail) {
  mail.read = true
  selectedMail.value = mail
}

function formatTime(timestamp) {
  const diff = Date.now() - timestamp
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
  return Math.floor(diff / 86400000) + '天前'
}

async function refresh() {
  await axios.get('/api/mail/list')
}

async function markAllRead() {
  mails.value.forEach(m => m.read = true)
}

async function claim(att) {
  att.claimed = true
}

async function deleteMail(mail) {
  mails.value = mails.value.filter(m => m.id !== mail.id)
  selectedMail.value = null
}
</script>

<style scoped>
.mail-panel { padding: 20px; }

h2 { color: #f093fb; font-size: 24px; margin-bottom: 20px; }

/* 操作栏 */
.mail-actions { display: flex; gap: 12px; margin-bottom: 20px; }

.action-btn {
  padding: 10px 20px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px; color: #fff; cursor: pointer;
  transition: all 0.3s;
}

.action-btn:hover { background: rgba(255,255,255,0.1); }

/* 邮件列表 */
.mail-list { display: flex; flex-direction: column; gap: 12px; }

.mail-card {
  display: flex; align-items: center; gap: 15px;
  background: rgba(255,255,255,0.05); padding: 18px; border-radius: 15px;
  cursor: pointer; transition: all 0.3s; position: relative;
}

.mail-card:hover { background: rgba(255,255,255,0.08); transform: translateX(5px); }
.mail-card.unread { border-left: 3px solid #667eea; background: rgba(102,126,234,0.1); }

.sender-avatar {
  width: 45px; height: 45px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: bold; font-size: 18px;
}

.sender-avatar.large { width: 60px; height: 60px; font-size: 24px; }

.mail-content { flex: 1; }
.mail-header { display: flex; justify-content: space-between; margin-bottom: 5px; }
.sender-name { color: #667eea; font-weight: bold; }
.mail-time { font-size: 12px; opacity: 0.6; }
.mail-title { color: #fff; font-size: 15px; }

.attachment-badge {
  padding: 5px 12px; background: rgba(240,147,251,0.2);
  border-radius: 15px; color: #f093fb; font-size: 12px;
}

.unread-dot {
  position: absolute; top: 15px; right: 15px;
  width: 10px; height: 10px; background: #667eea;
  border-radius: 50%;
}

/* 弹窗 */
.mail-modal {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 90%; max-width: 500px;
  background: #1a1a2e; border-radius: 20px; overflow: hidden;
}

.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 20px; background: rgba(255,255,255,0.05);
}

.sender-info { display: flex; align-items: center; gap: 15px; }
.sender-info .sender-name { display: block; }

.close-btn {
  width: 35px; height: 35px;
  background: rgba(255,255,255,0.1); border: none; border-radius: 50%;
  color: #fff; font-size: 18px; cursor: pointer;
}

.modal-body { padding: 25px; }
.modal-body h3 { color: #fff; margin-bottom: 15px; }
.modal-body p { color: rgba(255,255,255,0.8); line-height: 1.6; }

.attachments { padding: 0 25px; }
.attachments h4 { color: #f093fb; margin-bottom: 15px; }

.attachment-list { display: flex; flex-direction: column; gap: 10px; }

.attachment-item {
  display: flex; align-items: center; gap: 12px;
  padding: 15px; background: rgba(255,255,255,0.05); border-radius: 12px;
}

.att-icon { font-size: 24px; }
.att-name { flex: 1; color: #fff; }

.claim-btn {
  padding: 8px 20px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none; border-radius: 20px; color: #fff; cursor: pointer;
}

.claimed { color: #4caf50; }

.modal-footer { padding: 20px; border-top: 1px solid rgba(255,255,255,0.1); }

.delete-btn {
  width: 100%; padding: 15px;
  background: rgba(244,67,54,0.2); border: 1px solid rgba(244,67,54,0.5);
  border-radius: 12px; color: #f44336; cursor: pointer;
}
</style>
