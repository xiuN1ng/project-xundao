import { createRouter, createWebHistory } from 'vue-router'
import Login from './views/Login.vue'
import Game from './views/Game.vue'

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: Login },
  { path: '/game', component: Game }
]

export default createRouter({
  history: createWebHistory(),
  routes
})
