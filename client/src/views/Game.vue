<template>
  <div class="game-container">
    <header class="game-header">
      <div class="player-info">
        <span class="username">{{ player?.username || '游客' }}</span>
        <span class="level">境界 {{ player?.realm || 1 }}</span>
      </div>
      <div class="resources">
        <span>灵石: {{ player?.lingshi || 0 }}</span>
        <span class="magic-crystal" v-if="player?.magicCrystal > 0">💠 魔晶: {{ player?.magicCrystal || 0 }}</span>
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
      <TribulationPanel v-if="activeTab === 'tribulation'" />
      <AdventurePanel v-if="activeTab === 'adventure'" />
      <AbyssDungeonPanel v-if="activeTab === 'abyss'" />
      <SealedRealmPanel v-if="activeTab === 'sealed-realm'" />
      <ClanPanel v-if="activeTab === 'clan'" />
      <EquipmentEnhancePanel v-if="activeTab === 'equipment-enhance'" />
      <FishingPanel v-if="activeTab === 'fishing'" />
      <MarriagePanel v-if="activeTab === 'marriage'" />
      <MasterDisciplePanel v-if="activeTab === 'master-disciple'" />
      <CaveDwellingPanel v-if="activeTab === 'cave-dwelling'" />
      <FishingCompetitionPanel v-if="showFishingCompetition" @close="showFishingCompetition=false" @go-fishing="switchToFishing" />
      <ArtSystemPanel v-if="activeTab === 'art'" />
      <AscensionPrePanel v-if="showAscensionPre" @close="showAscensionPre=false" />
      <ImmortalRealmPanel v-if="activeTab === 'immortal-realm'" @close="activeTab = 'cultivation'" />
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
import TribulationPanel from '../components/TribulationPanel.vue'
import UpgradeAnimation from '../components/UpgradeAnimation.vue'
import EquipmentAnimation from '../components/EquipmentAnimation.vue'
import AdventurePanel from '../components/AdventurePanel.vue'
import AbyssDungeonPanel from '../components/AbyssDungeonPanel.vue'
import SealedRealmPanel from '../components/SealedRealmPanel.vue'
import ClanPanel from '../components/ClanPanel.vue'
import EquipmentEnhancePanel from '../components/EquipmentEnhancePanel.vue'
import FishingPanel from '../components/FishingPanel.vue'
import MarriagePanel from '../components/MarriagePanel.vue'
import MasterDisciplePanel from '../components/MasterDisciplePanel.vue'
import CaveDwellingPanel from '../components/CaveDwellingPanel.vue'
import FishingCompetitionPanel from '../components/FishingCompetitionPanel.vue'
import ArtSystemPanel from '../components/ArtSystemPanel.vue'
import AscensionPrePanel from '../components/AscensionPrePanel.vue'
import ImmortalRealmPanel from '../components/ImmortalRealmPanel.vue'

const playerStore = usePlayerStore()
const player = playerStore.player
const activeTab = ref('cultivation')
const showFishingCompetition = ref(false)
const showAscensionPre = ref(false)
const showImmortalRealm = ref(false)

function switchToFishing() {
  showFishingCompetition.value = false
  activeTab.value = 'fishing'
}

// 暴露全局函数供其他组件调用
window.showFishingCompetitionPanel = () => {
  showFishingCompetition.value = true
}
window.closeFishingCompetitionPanel = () => {
  showFishingCompetition.value = false
}

window.showAscensionPrePanel = () => {
  showAscensionPre.value = true
}
window.closeAscensionPrePanel = () => {
  showAscensionPre.value = false
}

window.showImmortalRealmPanel = () => {
  showImmortalRealm.value = true
}
window.closeImmortalRealmPanel = () => {
  showImmortalRealm.value = false
}

const tabs = [
  { id: 'cultivation', name: '修炼', icon: '🧘' },
  { id: 'sect', name: '宗门', icon: '🏛️' },
  { id: 'clan', name: '家族', icon: '🏯' },
  { id: 'beast', name: '灵兽', icon: '🦊' },
  { id: 'alchemy', name: '炼丹', icon: '⚗️' },
  { id: 'equipment', name: '装备', icon: '⚔️' },
  { id: 'equipment-enhance', name: '强化', icon: '⚔️' },
  { id: 'adventure', name: '奇遇', icon: '✨' },
  { id: 'abyss', name: '深渊', icon: '🌀' },
  { id: 'sealed-realm', name: '封魔渊', icon: '⚫' },
  { id: 'spirit-artifact', name: '器灵', icon: '🔮' },
  { id: 'gongfa-effects', name: '功法', icon: '📚' },
  { id: 'arena', name: '竞技', icon: '⚔️' },
  { id: 'ladder', name: '天梯', icon: '🏆' },
  { id: 'tribulation', name: '渡劫', icon: '⚡' },
  { id: 'deity', name: '封神', icon: '🎭' },
  { id: 'task', name: '任务', icon: '📋' },
  { id: 'story', name: '剧情', icon: '📖' },
  { id: 'mail', name: '邮件', icon: '📧' },
  { id: 'activity', name: '活动', icon: '🎁' },
  { id: 'friend', name: '好友', icon: '👥' },
  { id: 'cave-dwelling', name: '洞府', icon: '🏠' },
  { id: 'fishing', name: '钓鱼', icon: '🎣' },
  { id: 'art', name: '琴棋书画', icon: '🎨' },
  { id: 'marriage', name: '婚姻', icon: '💍' },
  { id: 'master-disciple', name: '师徒', icon: '👨‍🏫' },
  { id: 'rank', name: '排行', icon: '📊' },
  { id: 'shop', name: '商店', icon: '🛒' },
  { id: 'immortal-realm', name: '仙界', icon: '☁️' }
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
