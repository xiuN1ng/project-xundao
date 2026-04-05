<template>
  <div class="guide-panel">
    <div class="guide-panel-inner">
      <button class="btn-close" @click="$emit('close')">✕</button>

      <div class="panel-header">
        <h3>🌟 新手引导</h3>
        <div class="guide-progress-bar">
          <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <span class="progress-text">{{ currentStep }}/{{ STEPS.length }} 步</span>
      </div>

      <div class="guide-steps">
        <div
          v-for="step in localSteps"
          :key="step.id"
          class="guide-step-card"
          :class="{
            'step-active': step.step === currentStep,
            'step-completed': step.completed,
            'step-locked': step.step > currentStep
          }"
        >
          <div class="step-icon">
            <span v-if="step.completed && step.claimed">✅</span>
            <span v-else-if="step.completed && !step.claimed" class="pulse">🔔</span>
            <span v-else-if="step.step === currentStep" class="pulse">🔔</span>
            <span v-else>🔒</span>
          </div>

          <div class="step-content">
            <div class="step-title">{{ step.title }}</div>
            <div class="step-desc">{{ step.description }}</div>
            <div class="step-rewards" v-if="step.reward">
              <span v-for="(val, key) in step.reward" :key="key" class="reward-tag">
                {{ formatReward(key, val) }}
              </span>
            </div>
            <div v-if="step.step === currentStep && !step.completed" class="step-action-hint">
              <span>👉</span> {{ getActionHint(step.id) }}
            </div>
          </div>

          <div class="step-reward-btn">
            <button
              v-if="step.completed && !step.claimed && step.step === currentStep"
              class="btn-claim"
              @click="claimReward(step)"
            >
              领取奖励
            </button>
            <span v-else-if="step.claimed" class="claimed-badge">已领取</span>
            <span v-else-if="step.step > currentStep" class="locked-text">未解锁</span>
          </div>
        </div>
      </div>

      <div v-if="isComplete" class="guide-complete-section">
        <div class="complete-card">
          <h4>🎉 恭喜完成新手引导！</h4>
          <p>你已解锁全部游戏功能，继续你的修仙之路吧！</p>
          <button class="btn-start" @click="$emit('close')">开始冒险</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({ playerId: { type: Number, default: 1 } })
const emit = defineEmits(['close', 'navigate'])

const STEPS = [
  { step: 1, id: 'create_character', title: '创建角色', description: '创建你的修仙角色', reward: { spirit_stone: 100, exp: 50 } },
  { step: 2, id: 'first_explore', title: '初探仙门', description: '熟悉游戏界面', reward: { spirit_stone: 50, exp: 30 } },
  { step: 3, id: 'first_battle', title: '初战告捷', description: '完成第一次战斗', reward: { spirit_stone: 80, exp: 100, item: '疗伤丹×2' } },
  { step: 4, id: 'first_cultivate', title: '初次修炼', description: '进行第一次功法修炼', reward: { spirit_stone: 60, exp: 80 } },
  { step: 5, id: 'equip_item', title: '装备强化', description: '强化你的第一件装备', reward: { spirit_stone: 100, exp: 120, item: '强化石×5' } },
  { step: 6, id: 'complete_quest', title: '完成任务', description: '完成第一个任务', reward: { spirit_stone: 150, exp: 200 } },
  { step: 7, id: 'visit_shop', title: '逛逛商店', description: '访问商店了解资源', reward: { spirit_stone: 200, exp: 50 } },
  { step: 8, id: 'join_sect', title: '加入宗门', description: '加入或创建宗门', reward: { spirit_stone: 300, exp: 300, item: '宗门令牌×1' } },
  { step: 9, id: 'try_dungeon', title: '挑战副本', description: '尝试挑战副本', reward: { spirit_stone: 500, exp: 500, item: '金丹×1' } },
  { step: 10, id: 'guide_complete', title: '引导完成', description: '恭喜完成新手引导', reward: { spirit_stone: 1000, exp: 1000, item: '橙色装备×1' } }
]

const localSteps = ref(STEPS.map(s => ({ ...s, completed: false, claimed: false })))
const currentStep = ref(1)
const isComplete = ref(false)

const progressPercent = computed(() =>
  Math.round(((currentStep.value - 1) / STEPS.length) * 100)
)

async function loadProgress() {
  try {
    const userId = props.playerId || 1
    const res = await fetch(`/api/guide/progress/${userId}`)
    const data = await res.json()
    if (data.code === 0 && data.data) {
      const prog = data.data
      currentStep.value = prog.currentStep || 1
      ;(prog.completedSteps || []).forEach(id => {
        const s = localSteps.value.find(x => x.id === id)
        if (s) s.completed = true
      })
      ;(prog.claimedRewards || []).forEach(id => {
        const s = localSteps.value.find(x => x.id === id)
        if (s) s.claimed = true
      })
      isComplete.value = !!(prog.completedTime)
    }
  } catch (e) {
    console.error('[GuidePanel] 加载引导进度失败:', e)
  }
}

async function claimReward(step) {
  try {
    const userId = props.playerId || 1
    const res = await fetch('/api/guide/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, stepId: step.id })
    })
    const data = await res.json()
    if (data.code === 0) {
      step.claimed = true
    }
  } catch (e) {
    console.error('[GuidePanel] 领取奖励失败:', e)
  }
}

function getActionHint(id) {
  const map = {
    create_character: '前往创建角色',
    first_explore: '点击各个功能按钮了解界面',
    first_battle: '前往冒险开始战斗',
    first_cultivate: '打开修炼面板开始修炼',
    equip_item: '打开装备面板进行强化',
    complete_quest: '前往任务面板接受任务',
    visit_shop: '打开商店查看商品',
    join_sect: '打开宗门面板加入宗门',
    try_dungeon: '打开副本面板挑战副本',
    guide_complete: '恭喜！所有引导已完成'
  }
  return map[id] || '请完成此步骤'
}

function formatReward(key, val) {
  const map = { spirit_stone: '灵石', exp: '经验', item: '' }
  return (map[key] || key) ? `${map[key]}×${val}` : val
}

onMounted(loadProgress)
</script>

<style scoped>
.guide-panel {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.75);
  z-index: 9000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.guide-panel-inner {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 1px solid rgba(201,169,110,0.3);
  border-radius: 12px;
  width: 100%; max-width: 480px;
  max-height: 85vh;
  overflow-y: auto;
  position: relative;
  padding: 20px;
}
.btn-close {
  position: absolute; top: 12px; right: 12px;
  background: rgba(255,255,255,0.1); border: none;
  color: #a09880; width: 28px; height: 28px;
  border-radius: 50%; cursor: pointer; font-size: 14px;
}
.panel-header h3 { color: #c9a96e; margin: 0 0 8px 0; font-size: 18px; }
.guide-progress-bar { height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #c9a96e, #e8a87c); border-radius: 4px; transition: width 0.3s ease; }
.progress-text { display: block; text-align: right; color: #a09880; font-size: 12px; margin-top: 4px; }
.guide-steps { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }
.guide-step-card {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 12px; background: rgba(255,255,255,0.05);
  border-radius: 8px; border: 1px solid rgba(201,169,110,0.15);
}
.guide-step-card.step-active { border-color: #c9a96e; background: rgba(201,169,110,0.1); box-shadow: 0 0 12px rgba(201,169,110,0.2); }
.guide-step-card.step-completed { opacity: 0.7; border-color: rgba(110,198,202,0.3); }
.guide-step-card.step-locked { opacity: 0.4; }
.step-icon { font-size: 24px; flex-shrink: 0; width: 36px; text-align: center; }
.step-icon .pulse { animation: guide-pulse 1s infinite; display: inline-block; }
@keyframes guide-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.2)} }
.step-content { flex: 1; min-width: 0; }
.step-title { color: #e8e0d0; font-weight: bold; font-size: 14px; }
.step-desc { color: #a09880; font-size: 12px; margin-top: 2px; }
.step-rewards { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
.reward-tag { background: rgba(110,198,202,0.15); color: #6ec6ca; font-size: 11px; padding: 2px 6px; border-radius: 4px; }
.step-action-hint { margin-top: 6px; color: #e8a87c; font-size: 12px; }
.step-reward-btn { flex-shrink: 0; }
.btn-claim { background: linear-gradient(135deg, #c9a96e, #8b6914); color: #fff; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; }
.claimed-badge { color: #6ec6ca; font-size: 12px; }
.locked-text { color: #666; font-size: 12px; }
.guide-complete-section { margin-top: 16px; }
.complete-card { background: linear-gradient(135deg, rgba(201,169,110,0.2), rgba(232,168,124,0.2)); border: 1px solid rgba(201,169,110,0.4); border-radius: 12px; padding: 20px; text-align: center; }
.complete-card h4 { color: #c9a96e; margin: 0 0 8px 0; }
.complete-card p { color: #a09880; font-size: 13px; margin: 0 0 16px 0; }
.btn-start { background: linear-gradient(135deg, #c9a96e, #8b6914); color: #fff; border: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; cursor: pointer; }
</style>
