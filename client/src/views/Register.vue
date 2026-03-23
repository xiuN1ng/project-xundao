<template>
  <div class="login-container">
    <div class="login-box">
      <div class="logo">
        <span class="logo-icon">🧘</span>
        <h1>挂机修仙</h1>
      </div>
      <form @submit.prevent="handleRegister">
        <div class="input-group">
          <input 
            v-model="username" 
            placeholder="用户名" 
            required 
            minlength="3"
            maxlength="20"
            :disabled="loading"
          />
        </div>
        <div class="input-group">
          <input 
            v-model="password" 
            type="password" 
            placeholder="密码" 
            required 
            minlength="6"
            :disabled="loading"
          />
        </div>
        <div class="input-group">
          <input 
            v-model="confirmPassword" 
            type="password" 
            placeholder="确认密码" 
            required 
            :disabled="loading"
          />
        </div>
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
        <div v-if="success" class="success-message">
          {{ success }}
        </div>
        <button type="submit" :disabled="loading" class="register-btn">
          <span v-if="loading" class="loading-spinner"></span>
          {{ loading ? '注册中...' : '注册' }}
        </button>
      </form>
      <p class="switch" @click="emit('switch')">
        已有账号？<span class="highlight">立即登录</span>
      </p>
    </div>
    <div class="decoration">
      <div class="circle circle-1"></div>
      <div class="circle circle-2"></div>
      <div class="circle circle-3"></div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '../stores/player'

const emit = defineEmits(['switch'])
const router = useRouter()
const playerStore = usePlayerStore()

const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')

async function handleRegister() {
  error.value = ''
  success.value = ''
  
  if (!username.value || !password.value) {
    error.value = '请输入用户名和密码'
    return
  }
  
  if (username.value.length < 3) {
    error.value = '用户名至少需要3个字符'
    return
  }
  
  if (password.value.length < 6) {
    error.value = '密码至少需要6个字符'
    return
  }
  
  if (password.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致'
    return
  }
  
  loading.value = true
  
  try {
    await playerStore.register(username.value, password.value)
    success.value = '注册成功！正在跳转...'
    setTimeout(() => {
      router.push('/game')
    }, 1000)
  } catch (err) {
    error.value = err.response?.data?.message || '注册失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%);
  position: relative;
  overflow: hidden;
}

.login-box {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  padding: 50px 40px;
  border-radius: 20px;
  text-align: center;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 380px;
}

.logo {
  margin-bottom: 30px;
}

.logo-icon {
  font-size: 60px;
  display: block;
  margin-bottom: 10px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

h1 {
  font-size: 32px;
  font-weight: 300;
  background: linear-gradient(90deg, #f093fb, #667eea);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}

.input-group {
  margin-bottom: 15px;
}

input {
  display: block;
  width: 100%;
  padding: 15px 20px;
  margin: 0 auto;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-size: 16px;
  transition: all 0.3s;
  box-sizing: border-box;
}

input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

input:focus {
  outline: none;
  border-color: #667eea;
  background: rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 20px rgba(102, 126, 234, 0.3);
}

input:disabled {
  opacity: 0.6;
}

.error-message {
  color: #f5576c;
  font-size: 14px;
  margin-bottom: 15px;
  padding: 10px;
  background: rgba(245, 87, 108, 0.1);
  border-radius: 8px;
}

.success-message {
  color: #4ade80;
  font-size: 14px;
  margin-bottom: 15px;
  padding: 10px;
  background: rgba(74, 222, 128, 0.1);
  border-radius: 8px;
}

.register-btn {
  width: 100%;
  padding: 15px;
  margin-top: 10px;
  background: linear-gradient(90deg, #f093fb 0%, #667eea 100%);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 18px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
}

.register-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(240, 147, 251, 0.4);
}

.register-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.switch {
  margin-top: 25px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: opacity 0.3s;
}

.switch:hover {
  opacity: 0.8;
}

.highlight {
  color: #667eea;
  font-weight: 500;
}

.decoration {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
}

.circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.1;
}

.circle-1 {
  width: 400px;
  height: 400px;
  background: #667eea;
  top: -100px;
  right: -100px;
  animation: pulse 8s ease-in-out infinite;
}

.circle-2 {
  width: 300px;
  height: 300px;
  background: #f093fb;
  bottom: -50px;
  left: -50px;
  animation: pulse 6s ease-in-out infinite reverse;
}

.circle-3 {
  width: 200px;
  height: 200px;
  background: #764ba2;
  top: 50%;
  left: 20%;
  animation: pulse 10s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.1; }
  50% { transform: scale(1.1); opacity: 0.15; }
}
</style>
