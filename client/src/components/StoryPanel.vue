<template>
  <div class="story-panel">
    <!-- 章节选择视图 -->
    <div v-if="view === 'chapters'" class="chapters-view">
      <h2>📖 剧情故事</h2>
      <div class="chapter-list">
        <div 
          v-for="chapter in chapters" 
          :key="chapter.id"
          class="chapter-card"
          :class="{ completed: chapter.is_completed, locked: !chapter.is_unlocked }"
          @click="selectChapter(chapter)"
        >
          <div class="chapter-icon">
            {{ chapter.is_completed ? '✅' : (chapter.is_unlocked ? '📜' : '🔒') }}
          </div>
          <div class="chapter-info">
            <h3>{{ chapter.title }}</h3>
            <p>{{ chapter.description }}</p>
            <span class="chapter-requirement" v-if="!chapter.is_unlocked">
              需求: 等级{{ chapter.required_level }} 境界{{ chapter.required_realm }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 剧情进行视图 -->
    <div v-else-if="view === 'story'" class="story-view">
      <div class="story-header">
        <button @click="backToChapters" class="back-btn">← 返回</button>
        <h3>{{ currentChapter?.title }}</h3>
      </div>

      <!-- 对话框 -->
      <div v-if="currentNode" class="story-content">
        <!-- 背景 -->
        <div class="story-bg" :class="currentNode.bg || 'default'">
          <!-- 角色立绘区 -->
          <div class="character-area">
            <div v-if="currentNode.speaker" class="character-portrait">
              <img :src="characterPortrait" class="portrait-img" :alt="currentNode.speaker" />
            </div>
          </div>

          <!-- 对话框 -->
          <div class="dialogue-box" :class="{ 'has-choices': currentNode.type === 'choice' }">
            <div class="speaker-name" v-if="currentNode.speaker">
              {{ currentNode.speaker }}
            </div>
            <div class="dialogue-content">
              {{ currentNode.content }}
            </div>

            <!-- 选择按钮 -->
            <div v-if="currentNode.type === 'choice'" class="choices">
              <button 
                v-for="(choice, index) in currentNode.choices" 
                :key="index"
                class="choice-btn"
                @click="makeChoice(index)"
              >
                {{ choice.text }}
              </button>
            </div>

            <!-- 继续按钮 -->
            <button 
              v-else-if="!currentNode.is_ending" 
              class="continue-btn"
              @click="continueStory"
            >
              继续 →
            </button>

            <!-- 结束按钮 -->
            <button 
              v-if="currentNode.is_ending" 
              class="finish-btn"
              @click="finishChapter"
            >
              章节结束
            </button>
          </div>
        </div>

        <!-- 战斗场景 -->
        <div v-if="currentNode.type === 'battle'" class="battle-scene">
          <h3>{{ currentNode.title }}</h3>
          <p>{{ currentNode.content }}</p>
          <div class="enemy-info">
            <div class="enemy-avatar">👹</div>
            <div class="enemy-stats">
              <h4>{{ currentNode.enemy?.name }}</h4>
              <div class="hp-bar">
                <div class="hp-fill" :style="{ width: battleProgress + '%' }"></div>
              </div>
              <p>HP: {{ currentNode.enemy?.hp || '???' }}</p>
            </div>
          </div>
          <button class="fight-btn" @click="startBattle">开始战斗</button>
        </div>
      </div>

      <!-- 奖励展示 -->
      <div v-if="showReward" class="reward-modal">
        <div class="reward-content">
          <h3>🎉 获得奖励</h3>
          <div class="reward-items">
            <div v-if="lastReward.spirit_stones" class="reward-item">
              💎 灵石 +{{ lastReward.spirit_stones }}
            </div>
            <div v-if="lastReward.exp" class="reward-item">
              ✨ 经验 +{{ lastReward.exp }}
            </div>
            <div v-if="lastReward.gongfa" class="reward-item">
              📚 功法: {{ lastReward.gongfa }}
            </div>
            <div v-if="lastReward.sect" class="reward-item">
              🏛️ 宗门: {{ lastReward.sect }}
            </div>
            <div v-if="lastReward.realm" class="reward-item">
              ⬆️ 境界提升至: {{ lastReward.realm }}
            </div>
            <div v-if="lastReward.title" class="reward-item">
              🏅 称号: {{ lastReward.title }}
            </div>
          </div>
          <button @click="closeReward">收下</button>
        </div>
      </div>
    </div>

    <!-- 章节完成视图 -->
    <div v-else-if="view === 'completed'" class="completed-view">
      <div class="completed-content">
        <h2>🎊 章节完成!</h2>
        <p>{{ currentChapter?.title }} 已完成</p>
        <div v-if="chapterReward" class="chapter-reward">
          <h4>章节奖励</h4>
          <p>💎 灵石 +{{ chapterReward.spirit_stones }}</p>
        </div>
        <button @click="backToChapters">返回章节列表</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { usePlayerStore } from '../stores/player'
import characterPortrait from '../assets/images/player/character-portrait-new.png'

const playerStore = usePlayerStore()
const player = playerStore.player

const view = ref('chapters') // chapters | story | completed
const chapters = ref([])
const currentChapter = ref(null)
const currentNode = ref(null)
const showReward = ref(false)
const lastReward = ref({})
const chapterReward = ref(null)
const battleProgress = ref(100)

// 加载章节列表
async function loadChapters() {
  try {
    const res = await fetch(`/api/story/chapters?player_id=${player.id}`)
    const data = await res.json()
    if (data.success) {
      chapters.value = data.data
    }
  } catch (e) {
    console.error('加载章节失败:', e)
  }
}

// 选择章节
async function selectChapter(chapter) {
  if (!chapter.is_unlocked) return
  
  currentChapter.value = chapter
  await loadStory(chapter.id)
  view.value = 'story'
}

// 加载剧情
async function loadStory(chapterId) {
  try {
    const res = await fetch(`/api/story/current?player_id=${player.id}&chapter_id=${chapterId}`)
    const data = await res.json()
    if (data.success) {
      currentNode.value = data.data
    }
  } catch (e) {
    console.error('加载剧情失败:', e)
  }
}

// 继续剧情
async function continueStory() {
  await advanceStory(null)
}

// 选择分支
async function makeChoice(index) {
  await advanceStory(index)
}

// 推进剧情
async function advanceStory(choiceIndex) {
  try {
    const res = await fetch('/api/story/advance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player_id: player.id,
        chapter_id: currentChapter.value.id,
        choice_index: choiceIndex
      })
    })
    const data = await res.json()
    
    if (data.success) {
      // 显示奖励
      if (data.data.reward && Object.keys(data.data.reward).length > 0) {
        lastReward.value = data.data.reward
        showReward.value = true
        return
      }
      
      // 检查是否章节结束
      if (data.data.chapter_completed) {
        chapterReward.value = data.data.reward
        view.value = 'completed'
        return
      }
      
      // 加载下一节点
      if (data.data.next_node) {
        currentNode.value = data.data.next_node
      } else {
        view.value = 'completed'
      }
    }
  } catch (e) {
    console.error('推进剧情失败:', e)
  }
}

// 关闭奖励弹窗
function closeReward() {
  showReward.value = false
  
  // 继续到下一节点
  if (currentNode.value && !currentNode.value.is_ending) {
    loadStory(currentChapter.value.id)
  } else if (currentNode.value?.is_ending) {
    view.value = 'completed'
  }
}

// 开始战斗
function startBattle() {
  battleProgress.value = 0
  // 模拟战斗
  const interval = setInterval(() => {
    battleProgress.value += 20
    if (battleProgress.value >= 100) {
      clearInterval(interval)
      continueStory()
    }
  }, 200)
}

// 完成章节
function finishChapter() {
  view.value = 'completed'
}

// 返回章节列表
function backToChapters() {
  view.value = 'chapters'
  currentChapter.value = null
  currentNode.value = null
  chapterReward.value = null
  loadChapters()
}

onMounted(() => {
  loadChapters()
})
</script>

<style scoped>
.story-panel {
  padding: 15px;
  background: #1a1a2e;
  border-radius: 12px;
  min-height: 500px;
}

.story-panel h2 {
  color: #f093fb;
  margin-bottom: 20px;
}

/* 章节列表 */
.chapter-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chapter-card {
  display: flex;
  gap: 15px;
  padding: 15px;
  background: rgba(255,255,255,0.05);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid rgba(102,126,234,0.2);
}

.chapter-card:hover:not(.locked) {
  background: rgba(102,126,234,0.15);
  border-color: #667eea;
}

.chapter-card.completed {
  border-color: #4ade80;
}

.chapter-card.locked {
  opacity: 0.5;
  cursor: not-allowed;
}

.chapter-icon {
  font-size: 32px;
}

.chapter-info h3 {
  margin: 0 0 5px;
  color: #fff;
}

.chapter-info p {
  margin: 0;
  font-size: 13px;
  color: rgba(255,255,255,0.6);
}

.chapter-requirement {
  font-size: 12px;
  color: #fbbf24;
}

/* 剧情视图 */
.story-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
}

.back-btn {
  padding: 8px 16px;
  background: rgba(255,255,255,0.1);
  border: none;
  color: #fff;
  border-radius: 6px;
  cursor: pointer;
}

.story-content {
  position: relative;
}

.story-bg {
  min-height: 350px;
  background: linear-gradient(180deg, #2d1b4e 0%, #1a1a2e 100%);
  border-radius: 12px;
  padding: 20px;
  position: relative;
}

.story-bg.mountain {
  background: linear-gradient(180deg, #374151 0%, #1f2937 100%);
}

/* 对话框 */
.dialogue-box {
  position: absolute;
  bottom: 20px;
  left: 20px;
  right: 20px;
  background: rgba(0,0,0,0.8);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(102,126,234,0.3);
}

.speaker-name {
  color: #f093fb;
  font-weight: bold;
  margin-bottom: 10px;
}

.dialogue-content {
  color: #fff;
  line-height: 1.6;
  margin-bottom: 15px;
}

/* 选择按钮 */
.choices {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.choice-btn {
  padding: 12px;
  background: rgba(102,126,234,0.3);
  border: 1px solid rgba(102,126,234,0.5);
  color: #fff;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  text-align: left;
}

.choice-btn:hover {
  background: rgba(102,126,234,0.5);
}

/* 继续/结束按钮 */
.continue-btn, .finish-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border: none;
  color: #fff;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
}

.finish-btn {
  background: linear-gradient(90deg, #4ade80, #22c55e);
}

/* 战斗场景 */
.battle-scene {
  background: rgba(0,0,0,0.6);
  padding: 20px;
  border-radius: 12px;
  text-align: center;
}

.enemy-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin: 20px 0;
}

.enemy-avatar {
  font-size: 64px;
}

.enemy-stats {
  text-align: left;
}

.hp-bar {
  width: 150px;
  height: 20px;
  background: rgba(255,255,255,0.1);
  border-radius: 10px;
  overflow: hidden;
  margin: 10px 0;
}

.hp-fill {
  height: 100%;
  background: linear-gradient(90deg, #ef4444, #dc2626);
  transition: width 0.3s;
}

.fight-btn {
  padding: 15px 40px;
  background: linear-gradient(90deg, #ef4444, #dc2626);
  border: none;
  color: #fff;
  border-radius: 8px;
  cursor: pointer;
  font-size: 18px;
}

/* 奖励弹窗 */
.reward-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.reward-content {
  background: linear-gradient(180deg, #2d1b4e 0%, #1a1a2e 100%);
  padding: 30px;
  border-radius: 16px;
  text-align: center;
  border: 2px solid #f093fb;
}

.reward-content h3 {
  color: #f093fb;
  font-size: 24px;
  margin-bottom: 20px;
}

.reward-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.reward-item {
  color: #fbbf24;
  font-size: 16px;
}

.reward-content button {
  padding: 12px 30px;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border: none;
  color: #fff;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
}

/* 完成视图 */
.completed-view {
  text-align: center;
  padding: 40px;
}

.completed-content {
  background: rgba(255,255,255,0.05);
  padding: 30px;
  border-radius: 16px;
}

.completed-content h2 {
  font-size: 28px;
}

.chapter-reward {
  margin: 20px 0;
  padding: 15px;
  background: rgba(74,222,128,0.1);
  border-radius: 8px;
}

.completed-content button {
  margin-top: 20px;
  padding: 12px 30px;
  background: linear-gradient(90deg, #4ade80, #22c55e);
  border: none;
  color: #fff;
  border-radius: 8px;
  cursor: pointer;
}

/* 角色立绘区 */
.character-area {
  position: absolute;
  bottom: 120px;
  right: 20px;
  width: 200px;
  height: 280px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.character-portrait {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.portrait-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 0 20px rgba(240,147,251,0.4)) drop-shadow(0 10px 30px rgba(0,0,0,0.5));
  animation: portraitFloat 3s infinite ease-in-out;
}

@keyframes portraitFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
</style>
