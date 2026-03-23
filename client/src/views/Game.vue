<template>
  <div class="game-container">
    <header class="game-header">
      <div class="player-info">
        <span class="username">{{ player?.username || '游客' }}</span>
        <span class="level">境界 {{ player?.realm || 1 }}</span>
      </div>
      <div class="resources">
        <span>灵石: {{ player?.lingshi || 0 }}</span>
      </div>
    </header>
    
    <nav class="game-nav">
      <button v-for="tab in tabs" :key="tab.id" 
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id">
        {{ tab.icon }} {{ tab.name }}
      </button>
    </nav>
    
    <main class="game-content">
      <CultivationPanel v-if="activeTab === 'cultivation'" />
      <SectPanel v-if="activeTab === 'sect'" />
      <BeastPanel v-if="activeTab === 'beast'" />
      <AlchemyPanel v-if="activeTab === 'alchemy'" />
      <ArenaPanel v-if="activeTab === 'arena'" />
      <EquipmentPanel v-if="activeTab === 'equipment'" />
      <TaskPanel v-if="activeTab === 'task'" />
      <MailPanel v-if="activeTab === 'mail'" />
      <ActivityPanel v-if="activeTab === 'activity'" />
      <FriendPanel v-if="activeTab === 'friend'" />
      <RankPanel v-if="activeTab === 'rank'" />
      <ShopPanel v-if="activeTab === 'shop'" />
      <StoryPanel v-if="activeTab === 'story'" />
      <GongfaEffectsPanel v-if="activeTab === 'gongfa-effects'" />
      <SpiritArtifactPanel v-if="activeTab === 'spirit-artifact'" />
      <LadderPanel v-if="activeTab === 'ladder'" />
      <DeityPanel v-if="activeTab === 'deity'" />
      <ForgePanel v-if="activeTab === 'forge'" />
    </main>

    <!-- 全局动画组件 -->
    <UpgradeAnimation />
    <EquipmentAnimation />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { usePlayerStore } from '../stores/player'
import CultivationPanel from '../components/CultivationPanel.vue'
import SectPanel from '../components/SectPanel.vue'
import BeastPanel from '../components/BeastPanel.vue'
import AlchemyPanel from '../components/AlchemyPanel.vue'
import ArenaPanel from '../components/ArenaPanel.vue'
import EquipmentPanel from '../components/EquipmentPanel.vue'
import TaskPanel from '../components/TaskPanel.vue'
import MailPanel from '../components/MailPanel.vue'
import ActivityPanel from '../components/ActivityPanel.vue'
import FriendPanel from '../components/FriendPanel.vue'
import RankPanel from '../components/RankPanel.vue'
import ShopPanel from '../components/ShopPanel.vue'
import StoryPanel from '../components/StoryPanel.vue'
import GongfaEffectsPanel from '../components/GongfaEffectsPanel.vue'
import SpiritArtifactPanel from '../components/SpiritArtifactPanel.vue'
import LadderPanel from '../components/LadderPanel.vue'
import DeityPanel from '../components/DeityPanel.vue'
import ForgePanel from '../components/ForgePanel.vue'
import UpgradeAnimation from '../components/UpgradeAnimation.vue'
import EquipmentAnimation from '../components/EquipmentAnimation.vue'

const playerStore = usePlayerStore()
const player = playerStore.player
const activeTab = ref('cultivation')

const tabs = [
  { id: 'cultivation', name: '修炼', icon: '🧘' },
  { id: 'sect', name: '宗门', icon: '🏛️' },
  { id: 'beast', name: '灵兽', icon: '🦊' },
  { id: 'alchemy', name: '炼丹', icon: '⚗️' },
  { id: 'equipment', name: '装备', icon: '⚔️' },
  { id: 'forge', name: '炼器', icon: '🔨' },
  { id: 'spirit-artifact', name: '器灵', icon: '🔮' },
  { id: 'gongfa-effects', name: '功法', icon: '📚' },
  { id: 'arena', name: '竞技', icon: '⚔️' },
  { id: 'ladder', name: '天梯', icon: '🏆' },
  { id: 'deity', name: '封神', icon: '🎭' },
  { id: 'task', name: '任务', icon: '📋' },
  { id: 'story', name: '剧情', icon: '📖' },
  { id: 'mail', name: '邮件', icon: '📧' },
  { id: 'activity', name: '活动', icon: '🎁' },
  { id: 'friend', name: '好友', icon: '👥' },
  { id: 'rank', name: '排行', icon: '📊' },
  { id: 'shop', name: '商店', icon: '🛒' }
]
</script>

<style scoped>
.game-container { min-height: 100vh; background: #0f0f23; color: #fff; }
.game-header { display: flex; justify-content: space-between; padding: 15px 20px; background: rgba(255,255,255,0.05); }
.player-info { display: flex; gap: 15px; align-items: center; }
.username { color: #f093fb; font-weight: bold; }
.level { background: rgba(102,126,234,0.3); padding: 3px 10px; border-radius: 15px; font-size: 12px; }
.resources span { opacity: 0.8; }
.game-nav { display: flex; gap: 8px; padding: 12px 15px; background: rgba(255,255,255,0.03); overflow-x: auto; flex-wrap: wrap; }
.game-nav button { padding: 8px 15px; background: transparent; border: 1px solid rgba(102,126,234,0.3); color: #fff; border-radius: 20px; cursor: pointer; white-space: nowrap; font-size: 13px; }
.game-nav button.active { background: linear-gradient(90deg, #667eea, #764ba2); border-color: transparent; }
.game-content { padding: 15px; }
</style>
