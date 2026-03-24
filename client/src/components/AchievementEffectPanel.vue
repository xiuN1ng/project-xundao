<template>
  <!-- 全屏遮罩 + 成就解锁弹窗 -->
  <Teleport to="body">
    <Transition name="fx">
      <div v-if="showEffect" class="ach-overlay" @click="dismiss">
        <!-- 屏幕闪光 -->
        <div class="screen-flash" :class="flashClass"></div>

        <!-- 主体弹窗 -->
        <div class="ach-popup" @click.stop>
          <!-- 光晕背景 -->
          <div class="glow-bg"></div>

          <!-- 粒子系统 -->
          <div class="particle-field" aria-hidden="true">
            <span
              v-for="p in particles"
              :key="p.id"
              class="p"
              :style="p.style"
            >{{ p.char }}</span>
          </div>

          <!-- 成就徽章 -->
          <div class="badge-ring">
            <div class="badge-inner" :class="tierClass">
              <span class="badge-icon">{{ current.icon || '🏆' }}</span>
            </div>
          </div>

          <!-- 成就名称 -->
          <div class="ach-name" :class="tierClass">{{ current.name || '成就达成' }}</div>

          <!-- 成就描述 -->
          <div class="ach-desc">{{ current.description || '恭喜达成里程碑' }}</div>

          <!-- 奖励 -->
          <div class="ach-reward" :class="tierClass">
            <span class="r-lbl">奖励</span>
            <span class="r-val">+{{ current.reward || '—' }}</span>
          </div>

          <!-- 分类标签 -->
          <div class="ach-tags">
            <span v-for="t in current.tags || []" :key="t" class="ach-tag">{{ t }}</span>
          </div>

          <!-- 关闭 -->
          <button class="ach-close" @click="dismiss">✕</button>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- 成就预览列表（在面板中使用） -->
  <div v-if="showList" class="ach-list">
    <div class="ach-list-title">🎯 成就效果预览</div>
    <div
      v-for="e in effectList" :key="e.id"
      class="ach-list-item"
      :class="{ playing: e.playing }"
      @click="replayEffect(e)"
    >
      <span class="ach-list-icon">{{ e.icon }}</span>
      <span class="ach-list-name">{{ e.name }}</span>
      <span class="ach-list-play">{{ e.playing ? '🔊' : '▶️' }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'

// ── Props / Emits ──────────────────────────────────────
const props = defineProps({
  achievement: { type: Object, default: null },
  showList:   { type: Boolean, default: true },
})
const emit = defineEmits(['close'])

// ── State ─────────────────────────────────────────────
const showEffect  = ref(false)
const flashClass  = ref('')
const current     = ref({ icon: '🏆', name: '成就解锁', description: '恭喜达成里程碑', reward: '1000 灵石', tags: [] })

// 粒子配置（40个粒子，4种emoji）
const PARTICLE_CHARS = ['✨', '⭐', '🌟', '💫']
const particles = ref([])

function buildParticles() {
  particles.value = Array.from({ length: 40 }, (_, i) => {
    const angle = (i / 40) * 360
    const dist  = 90 + Math.random() * 70
    const char  = PARTICLE_CHARS[i % PARTICLE_CHARS.length]
    return {
      id: i,
      char,
      style: {
        '--angle':    `${angle}deg`,
        '--dist':     `${dist}px`,
        '--delay':    `${(i * 0.06).toFixed(2)}s`,
        '--duration': `${(1.2 + Math.random() * 0.8).toFixed(2)}s`,
        '--size':     `${12 + Math.random() * 10}px`,
        '--x':        `${(Math.random() - 0.5) * 80}px`,
        '--y':        `${(Math.random() - 0.5) * 80}px`,
      }
    }
  })
}

// ── Tier ──────────────────────────────────────────────
const TIER_MAP = {
  bronze:  { cls: 'tier-bronze',  glow: 'rgba(205,127,50,0.6)',  sound: 'fanfare' },
  silver: { cls: 'tier-silver',  glow: 'rgba(192,192,192,0.6)', sound: 'fanfare' },
  gold:   { cls: 'tier-gold',    glow: 'rgba(255,215,0,0.7)',   sound: 'fanfare' },
  purple: { cls: 'tier-purple',  glow: 'rgba(147,51,234,0.7)',  sound: 'fanfare' },
  mythic: { cls: 'tier-mythic',  glow: 'rgba(255,0,128,0.7)',   sound: 'fanfare2' },
}
const DEFAULT_TIER = 'gold'

const tierClass = computed(() => TIER_MAP[current.value.tier]?.cls || DEFAULT_TIER)
const tierGlow  = computed(() => TIER_MAP[current.value.tier]?.glow || TIER_MAP[DEFAULT_TIER].glow)

// ── Sound ──────────────────────────────────────────────
function playSound(type = 'fanfare') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()

    const notes = type === 'fanfare2'
      ? [523.25, 659.25, 783.99, 1046.50, 1318.51]
      : [523.25, 659.25, 783.99, 1046.50]

    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      const t    = ctx.currentTime + i * 0.13

      osc.type = i % 2 === 0 ? 'triangle' : 'sine'
      osc.frequency.value = freq

      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.18, t + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.6)
    })

    // 额外的和弦
    const chordOsc  = ctx.createOscillator()
    const chordGain = ctx.createGain()
    chordOsc.type = 'sine'
    chordOsc.frequency.value = 261.63
    chordGain.gain.setValueAtTime(0.06, ctx.currentTime)
    chordGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5)
    chordOsc.connect(chordGain)
    chordGain.connect(ctx.destination)
    chordOsc.start(ctx.currentTime)
    chordOsc.stop(ctx.currentTime + 1.5)
  } catch (e) {
    // Audio not available
  }
}

// ── Flash ──────────────────────────────────────────────
function triggerFlash(tier) {
  const map = { bronze: 'flash-bronze', silver: 'flash-silver', gold: 'flash-gold', purple: 'flash-purple', mythic: 'flash-mythic' }
  flashClass.value = map[tier] || 'flash-gold'
  setTimeout(() => { flashClass.value = '' }, 600)
}

// ── Unlock ─────────────────────────────────────────────
let dismissTimer = null

function playUnlock(ach) {
  if (dismissTimer) clearTimeout(dismissTimer)

  // Normalize achievement data
  let rewardText = '奖励'
  if (ach.rewardText) {
    rewardText = ach.rewardText
  } else if (ach.reward) {
    if (typeof ach.reward === 'object') {
      rewardText = Object.entries(ach.reward)
        .map(([k, v]) => `${v}${k === 'diamonds' ? '💎' : '灵石'}`)
        .join(' ')
    } else {
      rewardText = String(ach.reward)
    }
  }

  current.value = {
    icon:        ach.icon        || '🏆',
    name:        ach.name        || '成就达成',
    description: ach.desc        || ach.description || '恭喜达成里程碑',
    reward:      rewardText,
    tags:        ach.tags        || [ach.tier || '普通'].filter(Boolean),
    tier:        ach.tier        || DEFAULT_TIER,
  }

  buildParticles()
  showEffect.value = true
  triggerFlash(current.value.tier)

  const soundType = TIER_MAP[current.value.tier]?.sound || 'fanfare'
  playSound(soundType)

  dismissTimer = setTimeout(dismiss, 3800)
}

function dismiss() {
  if (dismissTimer) { clearTimeout(dismissTimer); dismissTimer = null }
  showEffect.value = false
}

// ── Effect list (replay) ───────────────────────────────
const effectList = ref([
  { id: 1, name: '首次登录',     icon: '🎮', tier: 'bronze',  playing: false },
  { id: 2, name: '等级突破',     icon: '⬆️', tier: 'silver',  playing: false },
  { id: 3, name: '装备强化',     icon: '⚔️', tier: 'gold',    playing: false },
  { id: 4, name: '战力提升',     icon: '💪', tier: 'gold',    playing: false },
  { id: 5, name: '副本通关',     icon: '🗺️', tier: 'silver',  playing: false },
  { id: 6, name: '社交互动',     icon: '👥', tier: 'bronze',  playing: false },
  { id: 7, name: '天劫渡虚',     icon: '⛈️', tier: 'purple',  playing: false },
  { id: 8, name: '万古第一',     icon: '👑', tier: 'mythic',  playing: false },
])

function replayEffect(e) {
  e.playing = true
  playUnlock({
    icon: e.icon,
    name: e.name,
    description: `解锁成就: ${e.name}`,
    reward: `${Math.floor(Math.random() * 2000 + 500)} 灵石`,
    tier: e.tier,
    tags: [e.tier],
  })
  setTimeout(() => { e.playing = false }, 3500)
}

// ── Watch prop ─────────────────────────────────────────
watch(() => props.achievement, (ach) => {
  if (ach && ach.name) playUnlock(ach)
}, { immediate: true })
</script>

<style scoped>
/* ── Overlay ─────────────────────────────────────────── */
.ach-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999;
  perspective: 900px;
}

/* ── Screen flash ────────────────────────────────────── */
.screen-flash {
  position: absolute; inset: 0; pointer-events: none;
  opacity: 0; border-radius: 0;
}
.flash-gold   { background: radial-gradient(circle at center, rgba(255,215,0,0.7) 0%, transparent 70%); animation: flashFade 0.6s ease-out forwards; }
.flash-bronze { background: radial-gradient(circle at center, rgba(205,127,50,0.6) 0%, transparent 70%); animation: flashFade 0.6s ease-out forwards; }
.flash-silver { background: radial-gradient(circle at center, rgba(192,192,192,0.6) 0%, transparent 70%); animation: flashFade 0.6s ease-out forwards; }
.flash-purple { background: radial-gradient(circle at center, rgba(147,51,234,0.7) 0%, transparent 70%); animation: flashFade 0.6s ease-out forwards; }
.flash-mythic { background: radial-gradient(circle at center, rgba(255,0,128,0.7) 0%, transparent 70%); animation: flashFade 0.6s ease-out forwards; }
@keyframes flashFade { 0%{opacity:1} 100%{opacity:0} }

/* ── Popup ───────────────────────────────────────────── */
.ach-popup {
  position: relative; width: 340px; max-width: 90vw;
  background: linear-gradient(145deg, #1a1040 0%, #2d1b69 100%);
  border-radius: 24px; padding: 48px 28px 32px;
  display: flex; flex-direction: column; align-items: center;
  box-shadow: 0 0 60px rgba(102,126,234,0.4), 0 20px 60px rgba(0,0,0,0.7);
  animation: popIn 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards;
  overflow: hidden;
}
@keyframes popIn {
  0%  { opacity:0; transform: scale(0.4) rotateX(20deg); }
  60% { transform: scale(1.06) rotateX(0deg); }
  100%{ opacity:1; transform: scale(1); }
}

/* ── Glow ────────────────────────────────────────────── */
.glow-bg {
  position: absolute; inset: 0; pointer-events: none; border-radius: 24px;
  background: radial-gradient(circle at 50% 30%, rgba(255,215,0,0.18) 0%, transparent 65%);
  animation: glowPulse 2s ease-in-out infinite;
}
@keyframes glowPulse { 0%,100%{opacity:0.7;transform:scale(1)} 50%{opacity:1;transform:scale(1.04)} }

/* ── Particles ───────────────────────────────────────── */
.particle-field {
  position: absolute; inset: 0; pointer-events: none; overflow: hidden;
}
.p {
  position: absolute;
  top: 38%; left: 50%;
  font-size: var(--size);
  animation: particleBurst var(--duration) ease-out var(--delay) both infinite;
  transform-origin: center;
}
@keyframes particleBurst {
  0%   { opacity:0;   transform: rotate(var(--angle)) translateY(0px) scale(0.5); }
  15%  { opacity:1; }
  80%  { opacity:0.8; transform: rotate(var(--angle)) translateY(calc(-1 * var(--dist))) scale(1.2); }
  100% { opacity:0;   transform: rotate(var(--angle)) translateY(calc(-1 * var(--dist) * 1.4)) scale(0.8); }
}

/* ── Badge ───────────────────────────────────────────── */
.badge-ring {
  width: 110px; height: 110px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 18px;
  background: conic-gradient(from 0deg, rgba(255,215,0,0.4), rgba(255,215,0,0.1), rgba(255,215,0,0.4));
  animation: ringSpin 3s linear infinite;
  box-shadow: 0 0 30px rgba(255,215,0,0.4);
  position: relative; z-index: 1;
}
.badge-ring::before {
  content: '';
  position: absolute; inset: 4px; border-radius: 50%;
  background: linear-gradient(145deg, #1a1040, #2d1b69);
}
@keyframes ringSpin { to{ transform: rotate(360deg); } }

.badge-inner {
  position: relative; z-index: 1;
  width: 88px; height: 88px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 42px;
  animation: badgePop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both;
  box-shadow: 0 0 30px rgba(255,215,0,0.6);
}
@keyframes badgePop {
  0%  { transform: scale(0) rotate(-20deg); opacity:0; }
  60% { transform: scale(1.15) rotate(5deg); }
  100%{ transform: scale(1) rotate(0deg); opacity:1; }
}
.tier-bronze .badge-inner { background: linear-gradient(135deg, #cd7f32, #a0522d); box-shadow: 0 0 25px rgba(205,127,50,0.7); }
.tier-silver .badge-inner { background: linear-gradient(135deg, #c0c0c0, #808080); box-shadow: 0 0 25px rgba(192,192,192,0.7); }
.tier-gold   .badge-inner { background: linear-gradient(135deg, #ffd700, #ff8c00); box-shadow: 0 0 35px rgba(255,215,0,0.8); }
.tier-purple .badge-inner { background: linear-gradient(135deg, #9333ea, #6b21a8); box-shadow: 0 0 35px rgba(147,51,234,0.8); }
.tier-mythic .badge-inner { background: linear-gradient(135deg, #ff0080, #ff4500); box-shadow: 0 0 45px rgba(255,0,128,0.9); animation: badgePop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both, mythicGlow 1.5s ease-in-out infinite 0.6s; }

@keyframes mythicGlow { 0%,100%{box-shadow: 0 0 35px rgba(255,0,128,0.7)} 50%{box-shadow: 0 0 60px rgba(255,0,128,1)} }

/* ── Name & desc ─────────────────────────────────────── */
.ach-name {
  font-size: 26px; font-weight: bold; text-align: center;
  margin-bottom: 6px;
  text-shadow: 0 2px 12px rgba(0,0,0,0.8);
  animation: textIn 0.4s ease-out 0.2s both;
}
.ach-name.tier-bronze { color: #cd7f32; }
.ach-name.tier-silver { color: #c0c0c0; }
.ach-name.tier-gold   { color: #ffd700; text-shadow: 0 0 20px rgba(255,215,0,0.6); }
.ach-name.tier-purple { color: #d8b4fe; text-shadow: 0 0 20px rgba(147,51,234,0.6); }
.ach-name.tier-mythic { color: #ff69b4; text-shadow: 0 0 25px rgba(255,0,128,0.8); }

.ach-desc {
  font-size: 14px; color: #c9a0dc; text-align: center; margin-bottom: 14px;
  animation: textIn 0.4s ease-out 0.3s both;
}

/* ── Reward ───────────────────────────────────────────── */
.ach-reward {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 18px; border-radius: 20px; margin-bottom: 10px;
  animation: textIn 0.4s ease-out 0.4s both;
}
.ach-reward.tier-bronze { background: rgba(205,127,50,0.25); border: 1px solid rgba(205,127,50,0.5); }
.ach-reward.tier-silver { background: rgba(192,192,192,0.2); border: 1px solid rgba(192,192,192,0.4); }
.ach-reward.tier-gold   { background: rgba(255,215,0,0.2); border: 1px solid rgba(255,215,0,0.5); }
.ach-reward.tier-purple { background: rgba(147,51,234,0.2); border: 1px solid rgba(147,51,234,0.5); }
.ach-reward.tier-mythic { background: rgba(255,0,128,0.2); border: 1px solid rgba(255,0,128,0.5); }

.r-lbl { font-size: 12px; color: #a89cc8; }
.r-val  { font-size: 16px; font-weight: bold; color: #ffd700; }

/* ── Tags ────────────────────────────────────────────── */
.ach-tags { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
.ach-tag {
  font-size: 11px; padding: 2px 8px; border-radius: 10px;
  background: rgba(147,51,234,0.2); color: #c9a0dc;
  border: 1px solid rgba(147,51,234,0.3);
}

/* ── Close ───────────────────────────────────────────── */
.ach-close {
  position: absolute; top: 12px; right: 12px;
  width: 28px; height: 28px; border-radius: 50%;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  color: #a0aec0; font-size: 16px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.ach-close:hover { background: rgba(255,68,68,0.2); color: #ff4444; border-color: rgba(255,68,68,0.3); }

@keyframes textIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }

/* ── List (panel version) ─────────────────────────────── */
.ach-list { display: flex; flex-direction: column; gap: 8px; }
.ach-list-title { font-size: 14px; color: #c9a0dc; margin-bottom: 6px; border-bottom: 1px solid rgba(147,51,234,0.3); padding-bottom: 4px; }
.ach-list-item {
  display: flex; align-items: center; gap: 10px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(147,51,234,0.2);
  border-radius: 10px; padding: 10px 12px; cursor: pointer; transition: all 0.2s;
}
.ach-list-item:hover { background: rgba(102,126,234,0.2); transform: translateX(4px); }
.ach-list-item.playing { background: rgba(255,215,0,0.15); border-color: rgba(255,215,0,0.4); }
.ach-list-icon { font-size: 22px; }
.ach-list-name { flex: 1; font-size: 13px; color: #e9d5ff; }
.ach-list-play { font-size: 14px; }

/* ── Transition ───────────────────────────────────────── */
.fx-enter-active { animation: popIn 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards; }
.fx-leave-active { animation: popOut 0.3s ease-in forwards; }
@keyframes popOut { to{opacity:0;transform:scale(0.7)} }
</style>
