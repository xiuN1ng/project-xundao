<template>
  <div class="login-container">
    <div class="login-box">
      <div class="logo">
        <span class="logo-icon">🧘</span>
        <h1>挂机修仙</h1>
      </div>
      <form @submit.prevent="handleLogin">
        <div class="input-group">
          <input 
            v-model="username" 
            placeholder="用户名" 
            required 
            :disabled="loading"
          />
        </div>
        <div class="input-group">
          <input 
            v-model="password" 
            type="password" 
            placeholder="密码" 
            required 
            :disabled="loading"
          />
        </div>
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
        <button type="submit" :disabled="loading" class="login-btn">
          <span v-if="loading" class="loading-spinner"></span>
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>
      <p class="switch" @click="goToRegister">
        还没有账号？<span class="highlight">立即注册</span>
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

const router = useRouter()
const playerStore = usePlayerStore()

const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  if (!username.value || !password.value) {
    error.value = '请输入用户名和密码'
    return
  }
  
  loading.value = true
  error.value = ''
  
  try {
    await playerStore.login(username.value, password.value)
    router.push('/game')
  } catch (err) {
    error.value = err.response?.data?.message || '登录失败，请检查用户名和密码'
  } finally {
    loading.value = false
  }
}

function goToRegister() {
  router.push('/register')
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
  margin-bottom: 40px;
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
  margin-bottom: 20px;
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

.login-btn {
  width: 100%;
  padding: 15px;
  margin-top: 10px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
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

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
}

.login-btn:disabled {
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
  color: #f093fb;
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
