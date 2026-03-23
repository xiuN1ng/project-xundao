<template>
  <div class="chat-panel">
    <div class="chat-header">
      <h2>💬 世界频道</h2>
      <span class="online">{{ onlineCount }}人在线</span>
    </div>
    <div class="chat-messages">
      <div v-for="msg in messages" :key="msg.id" class="message" :class="{self:msg.isSelf}">
        <span class="sender">{{ msg.sender }}:</span>
        <span class="text">{{ msg.text }}</span>
      </div>
    </div>
    <div class="chat-input">
      <input v-model="inputText" placeholder="发送消息..." @keyup.enter="send" />
      <button @click="send">发送</button>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue'
const inputText = ref('')
const onlineCount = ref(1250)
const messages = ref([
  {id:1,sender:'剑仙',text:'有人组队刷副本吗？',isSelf:false},
  {id:2,sender:'丹帝',text:'求购灵气丹',isSelf:false}
])
function send(){if(inputText.value.trim()){messages.value.push({id:Date.now(),sender:'我',text:inputText.value,isSelf:true});inputText.value=''}}
</script>
<style scoped>
.chat-panel { padding: 20px; display: flex; flex-direction: column; height: 100%; }
.chat-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.chat-header h2 { color: #f093fb; font-size: 20px; margin: 0; }
.online { color: #4caf50; font-size: 12px; }
.chat-messages { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; margin-bottom: 15px; }
.message { padding: 10px 15px; background: rgba(255,255,255,0.05); border-radius: 12px; }
.message.self { background: rgba(102,126,234,0.2); align-self: flex-end; }
.sender { color: #667eea; font-weight: bold; margin-right: 8px; }
.text { color: #fff; }
.chat-input { display: flex; gap: 10px; }
.chat-input input { flex: 1; padding: 15px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 25px; color: #fff; }
.chat-input button { padding: 15px 25px; background: linear-gradient(135deg,#667eea,#764ba2); border: none; border-radius: 25px; color: #fff; cursor: pointer; }
</style>
