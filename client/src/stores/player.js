import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

const api = axios.create({ 
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器 - 添加认证 token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.hash = '#/'
    }
    return Promise.reject(error.response?.data || error)
  }
)

export const usePlayerStore = defineStore('player', () => {
  const player = ref(null)
  const loading = ref(false)
  const error = ref(null)
  
  const isLoggedIn = computed(() => !!player.value)
  
  async function login(username, password) {
    loading.value = true
    error.value = null
    
    try {
      const data = await api.post('/auth/login', { username, password })
      player.value = data
      // 保存 token
      if (data.token) {
        localStorage.setItem('token', data.token)
      }
      return data
    } catch (e) {
      error.value = e.message || '登录失败'
      throw e
    } finally {
      loading.value = false
    }
  }
  
  async function register(username, password) {
    loading.value = true
    error.value = null
    
    try {
      const data = await api.post('/auth/register', { username, password })
      player.value = data
      if (data.token) {
        localStorage.setItem('token', data.token)
      }
      return data
    } catch (e) {
      error.value = e.message || '注册失败'
      throw e
    } finally {
      loading.value = false
    }
  }
  
  async function fetchPlayer() {
    loading.value = true
    error.value = null
    
    try {
      const data = await api.get('/auth/me')
      player.value = data
      return data
    } catch (e) {
      error.value = e.message || '获取玩家信息失败'
      throw e
    } finally {
      loading.value = false
    }
  }
  
  // 修炼相关
  async function startCultivation() {
    try {
      const data = await api.post('/cultivation/start')
      return data
    } catch (e) {
      console.error('开始修炼失败:', e)
      throw e
    }
  }
  
  async function stopCultivation() {
    try {
      const data = await api.post('/cultivation/stop')
      return data
    } catch (e) {
      console.error('停止修炼失败:', e)
      throw e
    }
  }
  
  async function breakthrough() {
    try {
      const data = await api.post('/cultivation/breakthrough')
      // 更新玩家数据
      if (player.value) {
        player.value.realm = data.newRealm
        player.value.cultivation = data.remainingCultivation
        player.value.combatPower = data.combatPower
      }
      return data
    } catch (e) {
      console.error('突破失败:', e)
      throw e
    }
  }
  
  // 宗门相关
  async function createSect(name) {
    try {
      const data = await api.post('/sect/create', { name })
      return data
    } catch (e) {
      throw e
    }
  }
  
  async function joinSect(name) {
    try {
      const data = await api.post('/sect/join', { name })
      return data
    } catch (e) {
      throw e
    }
  }
  
  function logout() {
    player.value = null
    localStorage.removeItem('token')
  }
  
  function clearError() {
    error.value = null
  }
  
  return { 
    player, 
    loading, 
    error,
    isLoggedIn, 
    login, 
    register,
    fetchPlayer, 
    logout,
    clearError,
    startCultivation,
    stopCultivation,
    breakthrough,
    createSect,
    joinSect
  }
})
