import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './assets/mobile.css'

const routes = [
  { path: '/', component: () => import('./components/MainLayout.vue') },
  { path: '/cultivation', component: () => import('./components/CultivationPanel.vue') },
  { path: '/sect', component: () => import('./components/SectPanel.vue') },
  { path: '/battle', component: () => import('./components/ArenaPanel.vue') },
  { path: '/profile', component: () => import('./components/SettingsPanel.vue') },
  { path: '/more', component: () => import('./components/MorePanel.vue') },
  { path: '/beast', component: () => import('./components/BeastPanel.vue') },
  { path: '/alchemy', component: () => import('./components/AlchemyPanel.vue') },
  { path: '/artifact', component: () => import('./components/ArtifactPanel.vue') },
  { path: '/dungeon', component: () => import('./components/DungeonPanel.vue') },
  { path: '/worldboss', component: () => import('./components/WorldBossPanel.vue') },
  { path: '/tower', component: () => import('./components/TowerPanel.vue') },
  { path: '/bag', component: () => import('./components/EquipmentPanel.vue') },
  { path: '/mount', component: () => import('./components/MountPanel.vue') },
  { path: '/wing', component: () => import('./components/WingPanel.vue') },
  { path: '/gem', component: () => import('./components/GemPanel.vue') },
  { path: '/fashion', component: () => import('./components/FashionPanel.vue') },
  { path: '/title', component: () => import('./components/TitlePanel.vue') },
  { path: '/vip', component: () => import('./components/VipPanel.vue') },
  { path: '/rank', component: () => import('./components/RankPanel.vue') },
  { path: '/friend', component: () => import('./components/FriendPanel.vue') },
  { path: '/mail', component: () => import('./components/MailPanel.vue') },
  { path: '/achievement', component: () => import('./components/AchievementPanel.vue') },
  { path: '/quest', component: () => import('./components/QuestPanel.vue') },
  { path: '/activity', component: () => import('./components/ActivityPanel.vue') },
  { path: '/mall', component: () => import('./components/MallPanel.vue') },
  { path: '/lottery', component: () => import('./components/LotteryPanel.vue') },
  { path: '/auction', component: () => import('./components/AuctionPanel.vue') },
  { path: '/cave', component: () => import('./components/CavePanel.vue') },
  { path: '/fishing', component: () => import('./components/FishingPanel.vue') },
  { path: '/secret', component: () => import('./components/SecretPanel.vue') },
  { path: '/marriage', component: () => import('./components/MarriagePanel.vue') },
]

const router = createRouter({ history: createWebHistory(), routes })
const app = createApp(App)
app.use(router)
app.mount('#app')
