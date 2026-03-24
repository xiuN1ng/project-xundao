<template>
  <div class="art-panel">
    <div class="panel-header">
      <h2>🎨 琴棋书画</h2>
      <div class="header-stats">
        <span class="stat-item">🏅 雅趣 {{ artPoints }}</span>
        <span class="stat-item">📜 修养 {{ cultivation }}</span>
        <span class="stat-item">✏️ 熟练 {{ totalMastery }}%</span>
      </div>
      <button class="close-btn" @click="emit('close')">×</button>
    </div>

    <div class="art-tabs">
      <button v-for="tab in artTabs" :key="tab.key" :class="['art-tab', { active: activeArt === tab.key }]" @click="activeArt = tab.key">
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-name">{{ tab.name }}</span>
        <span class="tab-level" v-if="artLevels[tab.key]">Lv.{{ artLevels[tab.key] }}</span>
      </button>
    </div>

    <!-- 琴 -->
    <div class="tab-content" v-if="activeArt === 'qin'">
      <div class="section-title">🎵 选择乐器</div>
      <div class="instrument-list">
        <div v-for="inst in instruments" :key="inst.id" :class="['instrument-card', { selected: selectedInstrument?.id === inst.id, locked: !inst.unlocked }]" @click="selectInstrument(inst)">
          <div class="inst-icon">{{ inst.icon }}</div>
          <div class="inst-info">
            <div class="inst-name">{{ inst.name }}</div>
            <div class="inst-desc">{{ inst.desc }}</div>
            <div class="inst-bonus">修养+{{ inst.cultivationBonus }}/次</div>
          </div>
          <div class="inst-lock" v-if="!inst.unlocked">🔒</div>
          <div class="inst-check" v-else-if="selectedInstrument?.id === inst.id">✓</div>
        </div>
      </div>

      <div class="section-title">🎼 演奏模式</div>
      <div class="play-modes">
        <div v-for="mode in playModes" :key="mode.id" :class="['mode-card', { selected: selectedMode?.id === mode.id, locked: mode.levelRequired > (artLevels['qin'] || 0) }]" @click="selectMode(mode)">
          <div class="mode-icon">{{ mode.icon }}</div>
          <div class="mode-info">
            <div class="mode-name">{{ mode.name }}</div>
            <div class="mode-desc">{{ mode.desc }}</div>
            <div class="mode-reward">雅趣+{{ mode.pointsReward }} 修养+{{ mode.cultivationReward }}</div>
          </div>
          <div class="level-req" v-if="mode.levelRequired > (artLevels['qin'] || 0)">需{{ mode.levelRequired }}级</div>
        </div>
      </div>

      <div class="performance-scene" v-if="selectedInstrument && selectedMode">
        <div class="scene-bg-art">
          <div class="moon"></div>
          <div class="mountains"><div class="mountain m1"></div><div class="mountain m2"></div></div>
          <div class="performer">{{ selectedInstrument.icon }}</div>
        </div>
        <div class="music-track">
          <div class="track-label">🎵</div>
          <div class="notes-container" ref="notesContainer">
            <div v-for="note in visibleNotes" :key="note.id" :class="['note', note.type, { hit: note.hit }]" :style="{ top: note.lane * 55 + 'px' }" @click="hitNote(note)">
              {{ note.symbol }}
            </div>
          </div>
          <div class="hit-zone">
            <div v-for="lane in 4" :key="lane" class="hit-target" :class="{ active: activeLanes.includes(lane - 1) }" @click="hitLane(lane - 1)">
              {{ laneKeys[lane - 1] }}
            </div>
          </div>
        </div>
        <div class="performance-controls">
          <div class="perf-stats">
            <span>连击: {{ combo }}x</span>
            <span>准确: {{ accuracy }}%</span>
            <span>得分: {{ Math.round(currentScore) }}</span>
          </div>
          <button v-if="!isPlaying" class="perform-btn" @click="startPerformance">🎵 开始演奏</button>
          <button v-else class="stop-btn" @click="stopPerformance">⏹ 停止</button>
        </div>
        <div class="performance-result" v-if="performanceDone">
          <div class="result-grade" :class="gradeClass">{{ gradeClass }}</div>
          <div class="result-stats">
            <div class="result-item">🎵 得分: {{ Math.round(currentScore) }}</div>
            <div class="result-item">🔥 连击: {{ maxCombo }}x</div>
            <div class="result-item">🎯 准确率: {{ accuracy }}%</div>
          </div>
          <div class="result-rewards">
            <span>🏅 雅趣 +{{ selectedMode.pointsReward }}</span>
            <span>📜 修养 +{{ selectedMode.cultivationReward }}</span>
            <span v-if="masteryGain > 0">✏️ 熟练 +{{ masteryGain }}%</span>
          </div>
          <button class="replay-btn" @click="startPerformance">🔄 再演一次</button>
        </div>
      </div>

      <div class="history-section">
        <div class="section-title">📜 演奏记录</div>
        <div class="history-list">
          <div v-for="rec in qinHistory" :key="rec.id" class="history-item">
            <span class="rec-grade" :class="rec.grade">{{ rec.grade }}</span>
            <span class="rec-info">{{ rec.instrument }} · {{ rec.mode }} · {{ rec.score }}分</span>
            <span class="rec-time">{{ rec.time }}</span>
          </div>
          <div v-if="qinHistory.length === 0" class="empty-hint">暂无记录，开始你的首演吧！</div>
        </div>
      </div>
    </div>

    <!-- 棋 -->
    <div class="tab-content" v-if="activeArt === 'qi'">
      <div class="section-title">⚫ 选择对局</div>
      <div class="match-list">
        <div v-for="match in qiMatches" :key="match.id" :class="['match-card', { locked: match.levelRequired > (artLevels['qi'] || 0) }]" @click="startMatch(match)">
          <div class="match-icon">{{ match.icon }}</div>
          <div class="match-info">
            <div class="match-name">{{ match.name }}</div>
            <div class="match-desc">{{ match.desc }}</div>
            <div class="match-reward">雅趣+{{ match.points }} 修养+{{ match.cultivation }}</div>
          </div>
          <div class="level-req" v-if="match.levelRequired > (artLevels['qi'] || 0)">需{{ match.levelRequired }}级</div>
          <div class="match-btn" v-else>对弈</div>
        </div>
      </div>

      <div class="go-board-container" v-if="matchOngoing">
        <div class="board-header">
          <div class="board-info">
            <span>⚫ 你 (黑)</span>
            <span>⚪ {{ opponentName }}</span>
          </div>
          <div class="turn-indicator" :class="{ yourTurn: isYourTurn }">
            {{ isYourTurn ? '⚫ 你的回合' : '⚪ 对手思考中' }}
          </div>
          <button class="resign-btn" @click="resignMatch">认输</button>
        </div>
        <div class="go-board">
          <div class="board-grid">
            <div v-for="r in 9" :key="r" class="grid-row">
              <div v-for="c in 9" :key="c" class="grid-cell" @click="placeStone(r - 1, c - 1)">
                <div class="cell-dot" v-if="[2,4,6].includes(r-1) && [2,4,6].includes(c-1)"></div>
                <div v-if="board[r-1]?.[c-1]" :class="['stone', board[r-1]?.[c-1] === 'B' ? 'black' : 'white']">
                  <div class="stone-shine"></div>
                </div>
              </div>
            </div>
          </div>
          <transition name="stone-pop">
            <div v-if="lastMove" class="last-move-marker" :style="{ top: lastMove.row * 44 + 10 + 'px', left: lastMove.col * 44 + 10 + 'px' }"></div>
          </transition>
        </div>
        <div class="board-footer">
          <div class="captured-info">
            <span>🏴 你的俘虏: {{ yourCaptured }}</span>
            <span>⚪ 对手俘虏: {{ opponentCaptured }}</span>
          </div>
          <button class="pass-btn" @click="passTurn">PASS 停一手</button>
        </div>
      </div>

      <div class="match-result" v-if="matchEnded">
        <div class="result-title">{{ matchResult === 'win' ? '🎉 胜利！' : matchResult === 'lose' ? '😢 失败' : '🤝 和棋' }}</div>
        <div class="result-detail">{{ matchResultMsg }}</div>
        <div class="result-rewards">
          <span v-if="matchResult === 'win'">🏅 雅趣 +{{ selectedMatch?.points }}</span>
          <span v-if="matchResult === 'win'">📜 修养 +{{ selectedMatch?.cultivation }}</span>
          <span v-if="matchResult === 'win' && masteryGain > 0">✏️ 熟练 +{{ masteryGain }}%</span>
        </div>
        <button class="replay-btn" @click="endMatch">返回选局</button>
      </div>
    </div>

    <!-- 书 -->
    <div class="tab-content" v-if="activeArt === 'shu'">
      <div class="section-title">🖌️ 选择书体</div>
      <div class="style-list">
        <div v-for="style in calligraphyStyles" :key="style.id" :class="['style-card', { selected: selectedStyle?.id === style.id, locked: style.levelRequired > (artLevels['shu'] || 0) }]" @click="selectCalligraphyStyle(style)">
          <div class="style-icon">{{ style.icon }}</div>
          <div class="style-info">
            <div class="style-name">{{ style.name }}</div>
            <div class="style-desc">{{ style.desc }}</div>
            <div class="style-char" :style="{ fontFamily: style.fontFamily, color: style.color }">{{ style.sampleChar }}</div>
          </div>
          <div class="level-req" v-if="style.levelRequired > (artLevels['shu'] || 0)">需{{ style.levelRequired }}级</div>
        </div>
      </div>

      <div class="calligraphy-area" v-if="selectedStyle">
        <div class="section-title">✒️ 输入文字</div>
        <div class="text-input-row">
          <input v-model="calligraphyText" class="calligraphy-input" placeholder="输入1-7个字，如：道法自然" maxlength="7" />
          <span class="char-count">{{ calligraphyText.length }}/7</span>
        </div>
        <div class="brush-preview">
          <div class="paper-scroll">
            <div class="calligraphy-text" :style="{ fontFamily: selectedStyle.fontFamily, color: selectedStyle.color }">
              {{ calligraphyText || '道法自然' }}
            </div>
          </div>
        </div>
        <div class="brush-effects">
          <div class="brush-param">
            <label>墨色浓度</label>
            <input type="range" min="0.5" max="1.5" step="0.1" v-model="inkDensity" />
            <span>{{ inkDensity }}</span>
          </div>
          <div class="brush-param">
            <label>笔触粗细</label>
            <input type="range" min="1" max="5" step="0.5" v-model="brushSize" />
            <span>{{ brushSize }}</span>
          </div>
        </div>
        <button class="create-btn" @click="createCalligraphy" :disabled="calligraphyText.length === 0">✒️ 挥毫创作</button>
      </div>

      <div class="calligraphy-result" v-if="calligraphyCreated">
        <div class="result-scroll">
          <div class="finished-calligraphy" :style="{ fontFamily: selectedStyle.fontFamily, color: selectedStyle.color }">
            {{ calligraphyText }}
          </div>
        </div>
        <div class="result-judgement">
          <div class="judgment-label">{{ judgment.label }}</div>
          <div class="judgment-stars">{{ judgment.stars }}</div>
          <div class="judgment-desc">{{ judgment.desc }}</div>
        </div>
        <div class="result-rewards">
          <span>🏅 雅趣 +{{ styleReward }}</span>
          <span>📜 修养 +{{ cultivationReward }}</span>
          <span v-if="masteryGain > 0">✏️ 熟练 +{{ masteryGain }}%</span>
        </div>
        <button class="replay-btn" @click="resetCalligraphy">再写一幅</button>
      </div>

      <div class="gallery-section">
        <div class="section-title">🖼️ 书法作品</div>
        <div class="gallery-grid">
          <div v-for="work in calligraphyGallery" :key="work.id" class="gallery-item">
            <div class="gallery-scroll" :style="{ fontFamily: work.fontFamily, color: work.color }">{{ work.text }}</div>
            <div class="gallery-meta"><span>{{ work.style }} · {{ work.judgment }}</span></div>
          </div>
          <div v-if="calligraphyGallery.length === 0" class="empty-hint">暂无作品，开始你的创作吧！</div>
        </div>
      </div>
    </div>

    <!-- 画 -->
    <div class="tab-content" v-if="activeArt === 'hua'">
      <div class="section-title">🎨 选择画种</div>
      <div class="paint-style-list">
        <div v-for="ps in paintingStyles" :key="ps.id" :class="['paint-style-card', { selected: selectedPaintingStyle?.id === ps.id, locked: ps.levelRequired > (artLevels['hua'] || 0) }]" @click="selectPaintingStyle(ps)">
          <div class="paint-style-icon">{{ ps.icon }}</div>
          <div class="paint-style-info">
            <div class="paint-style-name">{{ ps.name }}</div>
            <div class="paint-style-desc">{{ ps.desc }}</div>
            <div class="paint-style-reward">雅趣+{{ ps.points }} 修养+{{ ps.cultivation }}</div>
          </div>
          <div class="level-req" v-if="ps.levelRequired > (artLevels['hua'] || 0)">需{{ ps.levelRequired }}级</div>
        </div>
      </div>

      <div class="painting-area" v-if="selectedPaintingStyle">
        <div class="canvas-toolbar">
          <div class="tool-group">
            <button v-for="color in paintingColors" :key="color" :class="['color-btn', { active: selectedColor === color }]" :style="{ background: color }" @click="selectedColor = color"></button>
          </div>
          <div class="tool-group">
            <button v-for="brush in paintingBrushes" :key="brush.id" :class="['brush-btn', { active: selectedBrush?.id === brush.id }]" @click="selectedBrush = brush">{{ brush.icon }}</button>
          </div>
          <input type="range" min="2" max="20" v-model="paintingBrushSize" class="brush-size-slider" />
        </div>
        <div class="canvas-container">
          <canvas ref="paintingCanvas" class="painting-canvas" width="320" height="240" @mousedown="startPaint" @mousemove="paint" @mouseup="stopPaint" @mouseleave="stopPaint"></canvas>
          <div class="canvas-overlay" v-if="paintingInProgress">
            <div class="painting-progress"><div class="progress-bar" :style="{ width: paintingProgress + '%' }"></div></div>
            <div class="progress-label">创作中... {{ Math.round(paintingProgress) }}%</div>
          </div>
        </div>
        <div class="painting-controls">
          <button class="clear-canvas-btn" @click="clearCanvas">🗑️ 清空</button>
          <button class="submit-painting-btn" @click="submitPainting" :disabled="!canvasHasContent">📜 提交作品</button>
        </div>
      </div>

      <div class="painting-result" v-if="paintingCreated">
        <div class="result-judgment">
          <div class="judgment-label">{{ paintingJudgment.label }}</div>
          <div class="judgment-stars">{{ paintingJudgment.stars }}</div>
        </div>
        <div class="result-rewards">
          <span>🏅 雅趣 +{{ paintingReward }}</span>
          <span>📜 修养 +{{ paintingCultivation }}</span>
          <span v-if="masteryGain > 0">✏️ 熟练 +{{ masteryGain }}%</span>
        </div>
        <button class="replay-btn" @click="resetPainting">再画一幅</button>
      </div>

      <div class="gallery-section">
        <div class="section-title">🖼️ 绘画作品</div>
        <div class="gallery-grid painting-gallery">
          <div v-for="work in paintingGallery" :key="work.id" class="gallery-item painting-item">
            <canvas :ref="el => setPaintingRef(el, work.id)" class="gallery-canvas" width="80" height="60"></canvas>
            <div class="gallery-meta"><span>{{ work.style }} · {{ work.judgment }}</span></div>
          </div>
          <div v-if="paintingGallery.length === 0" class="empty-hint">暂无作品，开始你的创作吧！</div>
        </div>
      </div>
    </div>

    <!-- 底部总览 -->
    <div class="art-overview">
      <div v-for="art in artTabs" :key="art.key" class="overview-item">
        <span class="overview-icon">{{ art.icon }}</span>
        <span class="overview-name">{{ art.name }}</span>
        <span class="overview-level">Lv.{{ artLevels[art.key] || 0 }}</span>
        <div class="overview-bar">
          <div class="overview-fill" :style="{ width: (artExp[art.key] || 0) + '%', background: art.color }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted, onUnmounted } from 'vue'

const emit = defineEmits(['close', 'artComplete'])

const artPoints = ref(3280)
const cultivation = ref(156)
const artLevels = reactive({ qin: 3, qi: 2, shu: 1, hua: 1 })
const artExp = reactive({ qin: 65, qi: 30, shu: 0, hua: 0 })
const masteryGain = ref(0)

const totalMastery = computed(() => Math.round((artLevels.qin + artLevels.qi + artLevels.shu + artLevels.hua) / 4 * 20))

const activeArt = ref('qin')
const artTabs = [
  { key: 'qin', name: '琴', icon: '🎵', color: '#f093fb' },
  { key: 'qi', name: '棋', icon: '⚫', color: '#ffd700' },
  { key: 'shu', name: '书', icon: '✒️', color: '#74b9ff' },
  { key: 'hua', name: '画', icon: '🎨', color: '#55efc4' }
]
artTabs.forEach(t => { if (!artLevels[t.key]) artLevels[t.key] = 0; if (!artExp[t.key]) artExp[t.key] = 0 })

function gainArtPoints(key, amount) {
  artPoints.value += amount
  artExp[key] = Math.min(100, (artExp[key] || 0) + amount / 10)
  if ((artExp[key] || 0) >= 100) {
    artLevels[key] = (artLevels[key] || 0) + 1
    artExp[key] = 0
  }
}
function gainCultivation(amount) { cultivation.value += amount }

// ===== 琴 =====
const instruments = ref([
  { id: 'guqin', name: '古琴', icon: '🪕', desc: '上古雅乐,清远悠长', cultivationBonus: 3, unlocked: true },
  { id: 'pipa', name: '琵琶', icon: '🎸', desc: '金石之声,铿锵有力', cultivationBonus: 2, unlocked: true },
  { id: 'guzheng', name: '古筝', icon: '🎻', desc: '流水之声,婉转动听', cultivationBonus: 2, unlocked: artLevels.qin >= 2 },
  { id: 'xiao', name: '洞箫', icon: '🎺', desc: '空谷幽兰,清雅脱俗', cultivationBonus: 4, unlocked: artLevels.qin >= 4 },
])
const selectedInstrument = ref(instruments.value[0])
const playModes = ref([
  { id: 'free', name: '自由演奏', desc: '随心而弹,陶冶性情', icon: '🎶', pointsReward: 20, cultivationReward: 2, levelRequired: 0 },
  { id: 'melody', name: '曲谱演奏', desc: '按谱弹奏,考验技艺', icon: '🎼', pointsReward: 50, cultivationReward: 5, levelRequired: 2 },
  { id: 'compos', name: '即兴作曲', desc: '灵感迸发,创作名曲', icon: '✨', pointsReward: 120, cultivationReward: 12, levelRequired: 5 },
  { id: 'duet', name: '合奏', desc: '与他人共奏,声动梁尘', icon: '🎹', pointsReward: 200, cultivationReward: 20, levelRequired: 8 },
])
const selectedMode = ref(playModes.value[0])
const isPlaying = ref(false)
const combo = ref(0)
const maxCombo = ref(0)
const currentScore = ref(0)
const accuracy = ref(100)
const performanceDone = ref(false)
const qinHistory = ref([
  { id: 1, grade: 'S', instrument: '古琴', mode: '曲谱演奏', score: 9820, time: '2小时前' },
  { id: 2, grade: 'A', instrument: '琵琶', mode: '自由演奏', score: 7840, time: '昨天' },
])
const visibleNotes = ref([])
const activeLanes = ref([])
const laneKeys = ['D', 'F', 'J', 'K']
let noteTimer = null
let noteId = 0
const notesContainer = ref(null)

function selectInstrument(inst) { if (!inst.unlocked) return; selectedInstrument.value = inst }
function selectMode(mode) { if (mode.levelRequired > (artLevels['qin'] || 0)) return; selectedMode.value = mode }

function startPerformance() {
  isPlaying.value = true; combo.value = 0; maxCombo.value = 0
  currentScore.value = 0; accuracy.value = 100; performanceDone.value = false
  visibleNotes.value = []; masteryGain.value = 0
  const speed = Math.max(1, 2.5 - (artLevels['qin'] || 0) * 0.1)
  let totalNotes = 0, hitNotes = 0

  noteTimer = setInterval(() => {
    if (!isPlaying.value) return
    const lane = Math.floor(Math.random() * 4)
    const type = Math.random() < 0.15 ? 'special' : 'normal'
    const symbols = ['♪', '♫', '♬', '🎵', '🎶']
    visibleNotes.value.push({ id: ++noteId, lane, type, symbol: symbols[Math.floor(Math.random() * symbols.length)], speed, hit: false })
    totalNotes++
    // 自动miss检测
    setTimeout(() => {
      const note = visibleNotes.value.find(n => n.id === noteId && !n.hit)
      if (note) { note.missed = true; combo.value = 0; accuracy.value = Math.max(0, accuracy.value - 3) }
    }, speed * 1000 - 200)
    visibleNotes.value = visibleNotes.value.filter(n => n.id > noteId - 20)
  }, 600)

  setTimeout(() => { stopPerformance(); isPlaying.value = false }, 30000)
}

function hitLane(lane) {
  if (!isPlaying.value) return
  activeLanes.value = [lane]; setTimeout(() => { activeLanes.value = [] }, 100)
  const note = visibleNotes.value.find(n => n.lane === lane && !n.hit)
  if (note) {
    note.hit = true; combo.value++; maxCombo.value = Math.max(maxCombo.value, combo.value)
    const base = note.type === 'special' ? 200 : 100
    currentScore.value += base * (1 + combo.value * 0.1)
    setTimeout(() => { visibleNotes.value = visibleNotes.value.filter(n => n.id !== note.id) }, 200)
  } else {
    combo.value = 0; accuracy.value = Math.max(0, accuracy.value - 5)
  }
}

function hitNote(note) {
  if (!isPlaying.value || note.hit) return
  note.hit = true; combo.value++; maxCombo.value = Math.max(maxCombo.value, combo.value)
  const base = note.type === 'special' ? 200 : 100
  currentScore.value += base * (1 + combo.value * 0.1)
  setTimeout(() => { visibleNotes.value = visibleNotes.value.filter(n => n.id !== note.id) }, 200)
}

function stopPerformance() {
  isPlaying.value = false
  if (noteTimer) { clearInterval(noteTimer); noteTimer = null }
  performanceDone.value = true
  accuracy.value = Math.max(0, Math.min(100, accuracy.value))
  const grade = currentScore.value >= 8000 ? 'S' : currentScore.value >= 6000 ? 'A' : currentScore.value >= 4000 ? 'B' : 'C'
  gainArtPoints('qin', selectedMode.value.pointsReward)
  gainCultivation(selectedMode.value.cultivationReward)
  masteryGain.value = Math.round(accuracy.value / 20)
  artExp['qin'] = Math.min(100, (artExp['qin'] || 0) + masteryGain.value * 5)
  qinHistory.value.unshift({ id: Date.now(), grade, instrument: selectedInstrument.value.name, mode: selectedMode.value.name, score: Math.round(currentScore.value), time: '刚刚' })
  if (qinHistory.value.length > 10) qinHistory.value.pop()
  emit('artComplete', { art: 'qin', grade })
}

const gradeClass = computed(() => {
  if (currentScore.value >= 8000) return 'S'
  if (currentScore.value >= 6000) return 'A'
  if (currentScore.value >= 4000) return 'B'
  return 'C'
})

// ===== 棋 =====
const qiMatches = ref([
  { id: 'novice', name: '初段对局', desc: '新手棋客,适合入门', icon: '⚫⚪', points: 30, cultivation: 3, levelRequired: 0, aiLevel: 1 },
  { id: 'amateur', name: '业余三段', desc: '颇具实力,需深思熟虑', icon: '⚫⚪', points: 60, cultivation: 6, levelRequired: 2, aiLevel: 2 },
  { id: 'expert', name: '高手对弈', desc: '高手如云,步步惊心', icon: '⚫⚪', points: 120, cultivation: 12, levelRequired: 5, aiLevel: 3 },
])
const matchOngoing = ref(false)
const matchEnded = ref(false)
const matchResult = ref('')
const matchResultMsg = ref('')
const selectedMatch = ref(null)
const board = ref(Array(9).fill(null).map(() => Array(9).fill(null)))
const isYourTurn = ref(true)
const yourCaptured = ref(0)
const opponentCaptured = ref(0)
const lastMove = ref(null)
const opponentName = ref('AI棋手')
let consecutivePasses = 0
let aiTimer = null

function startMatch(match) {
  if (match.levelRequired > (artLevels['qi'] || 0)) return
  selectedMatch.value = match
  board.value = Array(9).fill(null).map(() => Array(9).fill(null))
  isYourTurn.value = true; yourCaptured.value = 0; opponentCaptured.value = 0
  lastMove.value = null; matchOngoing.value = true; matchEnded.value = false; consecutivePasses = 0
  opponentName.value = { novice: '初段棋手', amateur: '业余三段', expert: '高手棋手' }[match.id]
}

function placeStone(row, col) {
  if (!matchOngoing.value || !isYourTurn.value || board.value[row][col]) return
  board.value[row][col] = 'B'; lastMove.value = { row, col }; isYourTurn.value = false; consecutivePasses = 0
  const cap = captureStones(row, col, 'B'); opponentCaptured.value += cap
  if (cap > 0) { if (checkWinCondition()) return }
  aiTimer = setTimeout(() => aiMove(), 800)
}

function captureStones(row, col, color) {
  const opponent = color === 'B' ? 'W' : 'B'
  let captured = 0
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]]
  for (const [dr, dc] of dirs) {
    const nr = row + dr, nc = col + dc
    if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9 && board.value[nr][nc] === opponent) {
      if (!hasLiberty(nr, nc)) {
        const group = getGroup(nr, nc)
        group.forEach(([r, c]) => { board.value[r][c] = null; captured++ })
      }
    }
  }
  return captured
}

function hasLiberty(row, col) {
  const color = board.value[row][col]; if (!color) return false
  const visited = new Set(); const stack = [[row, col]]
  while (stack.length) {
    const [r, c] = stack.pop(); const key = `${r},${c}`
    if (visited.has(key)) continue; visited.add(key)
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr = r + dr, nc = c + dc
      if (nr < 0 || nr >= 9 || nc < 0 || nc >= 9) continue
      if (board.value[nr][nc] === null) return true
      else if (board.value[nr][nc] === color && !visited.has(`${nr},${nc}`)) stack.push([nr, nc])
    }
  }
  return false
}

function getGroup(row, col) {
  const color = board.value[row][col]; if (!color) return []
  const visited = new Set(); const group = []; const stack = [[row, col]]
  while (stack.length) {
    const [r, c] = stack.pop(); const key = `${r},${c}`
    if (visited.has(key)) continue; visited.add(key)
    if (board.value[r][c] === color) {
      group.push([r, c])
      for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const nr = r + dr, nc = c + dc
        if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9 && !visited.has(`${nr},${nc}`)) stack.push([nr, nc])
      }
    }
  }
  return group
}

function aiMove() {
  if (!matchOngoing.value) return
  const empty = []
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    if (!board.value[r][c]) {
      const priority = (r === 0 || r === 8 || c === 0 || c === 8) ? 2 : 1
      empty.push({ r, c, priority })
    }
  }
  if (empty.length === 0) { passTurn(); return }
  const weighted = empty.flatMap(e => Array(e.priority).fill(e))
  const move = weighted[Math.floor(Math.random() * weighted.length)]
  board.value[move.r][move.c] = 'W'; lastMove.value = { row: move.r, col: move.c }
  isYourTurn.value = true; consecutivePasses = 0
  const cap = captureStones(move.r, move.c, 'W'); yourCaptured.value += cap
  if (cap > 0) checkWinCondition()
}

function passTurn() {
  consecutivePasses++
  if (consecutivePasses >= 2) { endGameByPass(); return }
  isYourTurn.value = !isYourTurn.value
  if (!isYourTurn.value) aiTimer = setTimeout(() => aiMove(), 800)
}

function resignMatch() {
  clearTimeout(aiTimer)
  matchResult.value = 'lose'; matchResultMsg.value = '你已认输'
  matchEnded.value = true; matchOngoing.value = false
}

function checkWinCondition() {
  let blackStones = 0, whiteStones = 0
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    if (board.value[r][c] === 'B') blackStones++
    else if (board.value[r][c] === 'W') whiteStones++
  }
  if (blackStones + whiteStones >= 81 || (blackStones === 0 || whiteStones === 0)) {
    endGameByArea()
    return true
  }
  return false
}

function endGameByArea() {
  let blackStones = 0, whiteStones = 0, blackTerritory = 0, whiteTerritory = 0
  const visited = new Set()
  for (let r = 0; r < 9; r++) for (let c = 0; c  9; c++) {
    if (board.value[r][c] === 'B') blackStones++
    else if (board.value[r][c] === 'W') whiteStones++
    else {
      // BFS to determine territory
      let territoryOwner = null
      const stack = [[r, c]]; const terrVisited = new Set([`${r},${c}`])
      let isBorder = false
      while (stack.length) {
        const [tr, tc] = stack.pop()
        for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
          const nr = tr + dr, nc = tc + dc
          const nk = `${nr},${nc}`
          if (nr < 0 || nr >= 9 || nc < 0 || nc >= 9) { isBorder = true; continue }
          if (board.value[nr][nc] === null && !terrVisited.has(nk)) { terrVisited.add(nk); stack.push([nr, nc]) }
          else if (board.value[nr][nc] === 'B') territoryOwner = 'B'
          else if (board.value[nr][nc] === 'W') territoryOwner = 'W'
        }
      }
      if (territoryOwner === 'B') blackTerritory++
      else if (territoryOwner === 'W') whiteTerritory++
    }
  }
  const blackTotal = blackStones + blackTerritory
  const whiteTotal = whiteStones + whiteTerritory + 6.5 // komi
  if (blackTotal > whiteTotal) { matchResult.value = 'win'; matchResultMsg.value = `黑子获胜 (黑${blackTotal} vs 白${whiteTotal})` }
  else if (whiteTotal > blackTotal) { matchResult.value = 'lose'; matchResultMsg.value = `白子获胜 (黑${blackTotal} vs 白${whiteTotal})` }
  else { matchResult.value = 'draw'; matchResultMsg.value = '和棋' }
  settleMatch()
}

function endGameByPass() {
  endGameByArea()
}

function settleMatch() {
  clearTimeout(aiTimer)
  matchEnded.value = true; matchOngoing.value = false
  if (matchResult.value === 'win') {
    gainArtPoints('qi', selectedMatch.value.points)
    gainCultivation(selectedMatch.value.cultivation)
    masteryGain.value = 5
    artExp['qi'] = Math.min(100, (artExp['qi'] || 0) + 10)
  }
  emit('artComplete', { art: 'qi', result: matchResult.value })
}

function endMatch() {
  matchEnded.value = false; matchOngoing.value = false; selectedMatch.value = null
}

// ===== 书 =====
const calligraphyStyles = ref([
  { id: 'cao', name: '草书', icon: '✴️', desc: '龙飞凤舞,一气呵成', sampleChar: '龙', fontFamily: ' cursive, kai, serif', color: '#2c2c2c', points: 20, cultivation: 2, levelRequired: 0 },
  { id: 'kai', name: '楷书', icon: '📜', desc: '端正严谨,一丝不苟', sampleChar: '道', fontFamily: 'serif, kai, simsun', color: '#1a1a1a', points: 30, cultivation: 3, levelRequired: 0 },
  { id: 'xing', name: '行书', icon: '🖌️', desc: '行云流水,自然洒脱', sampleChar: '法', fontFamily: 'serif, kai', color: '#333333', points: 50, cultivation: 5, levelRequired: 2 },
  { id: 'lishu', name: '隶书', icon: '⚜️', desc: '古朴典雅,厚重大气', sampleChar: '自', fontFamily: 'serif, kai', color: '#2a2a2a', points: 40, cultivation: 4, levelRequired: 1 },
])
const selectedStyle = ref(calligraphyStyles.value[0])
const calligraphyText = ref('')
const inkDensity = ref('1.0')
const brushSize = ref('2.5')
const calligraphyCreated = ref(false)
const calligraphyGallery = ref([
  { id: 1, text: '道法自然', style: '楷书', fontFamily: 'serif, kai, simsun', color: '#1a1a1a', judgment: '⭐⭐⭐' },
])
const judgment = ref({})
const styleReward = ref(0)
const cultivationReward = ref(0)

function selectCalligraphyStyle(style) { if (style.levelRequired > (artLevels['shu'] || 0)) return; selectedStyle.value = style }

function createCalligraphy() {
  if (!calligraphyText.value.length) return
  calligraphyCreated.value = true
  const textLen = calligraphyText.value.length
  const score = Math.round(70 + textLen * 5 + Math.random() * 30)
  if (score >= 95) judgment.value = { label: '神品', stars: '⭐⭐⭐⭐⭐', desc: '旷世之作,惊艳全场' }
  else if (score >= 85) judgment.value = { label: '精品', stars: '⭐⭐⭐⭐', desc: '笔走龙蛇,意境深远' }
  else if (score >= 75) judgment.value = { label: '佳作', stars: '⭐⭐⭐', desc: '形神兼备,韵味十足' }
  else judgment.value = { label: '习作', stars: '⭐⭐', desc: '初具雏形,尚可精进' }
  styleReward.value = Math.round(selectedStyle.value.points * (score / 100))
  cultivationReward.value = Math.round(selectedStyle.value.cultivation * (score / 100))
  gainArtPoints('shu', styleReward.value)
  gainCultivation(cultivationReward.value)
  masteryGain.value = Math.round(score / 30)
  artExp['shu'] = Math.min(100, (artExp['shu'] || 0) + masteryGain.value * 3)
  calligraphyGallery.value.unshift({ id: Date.now(), text: calligraphyText.value, style: selectedStyle.value.name, fontFamily: selectedStyle.value.fontFamily, color: selectedStyle.value.color, judgment: judgment.value.stars })
  if (calligraphyGallery.value.length > 12) calligraphyGallery.value.pop()
  emit('artComplete', { art: 'shu', judgment: judgment.value.label })
}

function resetCalligraphy() { calligraphyCreated.value = false; calligraphyText.value = '' }

// ===== 画 =====
const paintingStyles = ref([
  { id: 'shanshui', name: '山水画', icon: '🏔️', desc: '山川河流,意境悠远', points: 30, cultivation: 3, levelRequired: 0 },
  { id: 'hua', name: '花鸟画', icon: '🌸', desc: '花团锦簇,鸟语花香', points: 30, cultivation: 3, levelRequired: 0 },
  { id: 'ren', name: '人物画', icon: '👤', desc: '形神兼备,栩栩如生', points: 50, cultivation: 5, levelRequired: 2 },
  { id: 'guohua', name: '写意国画', icon: '🖌️', desc: '大写意,墨分五色', points: 80, cultivation: 8, levelRequired: 4 },
])
const selectedPaintingStyle = ref(paintingStyles.value[0])
const paintingColors = ['#1a1a1a', '#c0392b', '#e67e22', '#f1c40f', '#27ae60', '#2980b9', '#8e44ad', '#ffffff']
const selectedColor = ref('#1a1a1a')
const paintingBrushes = [
  { id: 'round', icon: '🖌️' }, { id: 'spray', icon: '💨' }, { id: 'marker', icon: '🖊️' }
]
const selectedBrush = ref(paintingBrushes[0])
const paintingBrushSize = ref(6)
const paintingCanvas = ref(null)
const paintingInProgress = ref(false)
const paintingProgress = ref(0)
const paintingCreated = ref(false)
const paintingJudgment = ref({})
const paintingReward = ref(0)
const paintingCultivation = ref(0)
const paintingGallery = ref([])
const canvasHasContent = ref(false)
let paintingCtx = null
let isDrawing = false
let paintingData = null
const paintingRefs = {}

function selectPaintingStyle(style) { if (style.levelRequired > (artLevels['hua'] || 0)) return; selectedPaintingStyle.value = style }

function initCanvas() {
  if (!paintingCanvas.value) return
  paintingCtx = paintingCanvas.value.getContext('2d')
  paintingCtx.fillStyle = '#faf8f0'
  paintingCtx.fillRect(0, 0, 320, 240)
  canvasHasContent.value = false
}

onMounted(() => { nextTick(() => initCanvas()) })

function startPaint(e) {
  isDrawing = true; paint(e)
}

function paint(e) {
  if (!isDrawing || !paintingCtx) return
  const rect = paintingCanvas.value.getBoundingClientRect()
  const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left
  const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top
  const size = Number(paintingBrushSize.value)
  paintingCtx.globalAlpha = 0.8
  if (selectedBrush.value.id === 'spray') {
    for (let i = 0; i < 8; i++) {
      const ox = (Math.random() - 0.5) * size * 3
      const oy = (Math.random() - 0.5) * size * 3
      paintingCtx.beginPath()
      paintingCtx.arc(x + ox, y + oy, 1, 0, Math.PI * 2)
      paintingCtx.fillStyle = selectedColor.value
      paintingCtx.fill()
    }
  } else {
    paintingCtx.beginPath()
    paintingCtx.arc(x, y, size, 0, Math.PI * 2)
    paintingCtx.fillStyle = selectedColor.value
    paintingCtx.fill()
  }
  canvasHasContent.value = true
}

function stopPaint() { isDrawing = false }

function clearCanvas() { initCanvas(); canvasHasContent.value = false }

function submitPainting() {
  if (!paintingCtx) return
  paintingInProgress.value = true; paintingProgress.value = 0
  paintingData = paintingCanvas.value.toDataURL()
  let prog = 0
  const interval = setInterval(() => {
    prog += 10; paintingProgress.value = prog
    if (prog >= 100) {
      clearInterval(interval); paintingInProgress.value = false; paintingCreated.value = true
      const score = Math.round(60 + Math.random() * 40)
      if (score >= 90) paintingJudgment.value = { label: '神品', stars: '⭐⭐⭐⭐⭐' }
      else if (score >= 78) paintingJudgment.value = { label: '精品', stars: '⭐⭐⭐⭐' }
      else if (score >= 65) paintingJudgment.value = { label: '佳作', stars: '⭐⭐⭐' }
      else paintingJudgment.value = { label: '习作', stars: '⭐⭐' }
      paintingReward.value = Math.round(selectedPaintingStyle.value.points * (score / 100))
      paintingCultivation.value = Math.round(selectedPaintingStyle.value.cultivation * (score / 100))
      gainArtPoints('hua', paintingReward.value)
      gainCultivation(paintingCultivation.value)
      masteryGain.value = Math.round(score / 30)
      artExp['hua'] = Math.min(100, (artExp['hua'] || 0) + masteryGain.value * 3)
      paintingGallery.value.unshift({ id: Date.now(), style: selectedPaintingStyle.value.name, judgment: paintingJudgment.value.stars, data: paintingData })
      if (paintingGallery.value.length > 12) paintingGallery.value.pop()
      nextTick(() => renderGallery())
      emit('artComplete', { art: 'hua', judgment: paintingJudgment.value.label })
    }
  }, 100)
}

function resetPainting() { paintingCreated.value = false; clearCanvas() }

function setPaintingRef(el, id) {
  if (el) paintingRefs[id] = el
}

function renderGallery() {
  for (const work of paintingGallery.value) {
    const canvas = paintingRefs[work.id]
    if (canvas && work.data) {
      const ctx = canvas.getContext('2d')
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0, 80, 60)
      img.src = work.data
    }
  }
}

onUnmounted(() => { if (noteTimer) clearInterval(noteTimer); if (aiTimer) clearTimeout(aiTimer) })
</script>

<style scoped>
.art-panel { padding: 20px; max-height: 85vh; overflow-y: auto; background: #0f0f23; color: #fff; }
.panel-header { display: flex; align-items: center; gap: 15px; margin-bottom: 15px; position: relative; }
.panel-header h2 { color: #f093fb; font-size: 22px; margin: 0; }
.header-stats { display: flex; gap: 12px; flex: 1; }
.stat-item { background: rgba(255,255,255,0.08); padding: 4px 12px; border-radius: 15px; font-size: 12px; }
.close-btn { position: absolute; right: 0; top: 0; background: rgba(255,255,255,0.1); border: none; color: #fff; font-size: 20px; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; }
.art-tabs { display: flex; gap: 8px; margin-bottom: 20px; }
.art-tab { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; cursor: pointer; color: #aaa; transition: all 0.2s; font-size: 13px; }
.art-tab.active { background: rgba(240,147,251,0.2); border-color: #f093fb; color: #f093fb; }
.tab-icon { font-size: 18px; }
.tab-level { background: rgba(255,255,255,0.15); padding: 1px 6px; border-radius: 8px; font-size: 10px; }
.tab-content { min-height: 400px; }
.section-title { color: #f093fb; font-size: 14px; margin: 15px 0 10px; opacity: 0.9; }

/* 乐器卡片 */
.instrument-list, .play-modes, .match-list, .style-list, .paint-style-list { display: flex; flex-direction: column; gap: 10px; }
.instrument-card, .mode-card, .match-card, .style-card, .paint-style-card { display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.05); padding: 14px; border-radius: 12px; cursor: pointer; border: 1px solid transparent; transition: all 0.2s; }
.instrument-card:hover, .mode-card:hover, .match-card:hover, .style-card:hover, .paint-style-card:hover { background: rgba(255,255,255,0.08); }
.instrument-card.selected, .mode-card.selected, .match-card.selected, .style-card.selected, .paint-style-card.selected { border-color: #f093fb; background: rgba(240,147,251,0.1); }
.instrument-card.locked, .mode-card.locked, .match-card.locked, .style-card.locked, .paint-style-card.locked { opacity: 0.5; cursor: not-allowed; }
.inst-icon, .mode-icon, .match-icon, .paint-style-icon { font-size: 32px; }
.inst-info, .mode-info, .match-info, .style-info, .paint-style-info { flex: 1; }
.inst-name, .mode-name, .match-name, .style-name, .paint-style-name { color: #fff; font-weight: bold; font-size: 14px; }
.inst-desc, .mode-desc, .match-desc, .style-desc, .paint-style-desc { font-size: 11px; color: #888; margin: 3px 0; }
.inst-bonus, .mode-reward, .match-reward, .paint-style-reward { font-size: 11px; color: #55efc4; }
.inst-lock { font-size: 18px; }
.inst-check { color: #55efc4; font-size: 20px; }
.level-req { font-size: 11px; color: #e74c3c; background: rgba(231,76,60,0.2); padding: 3px 8px; border-radius: 8px; }
.match-btn { background: linear-gradient(135deg,#9b59b6,#8e44ad); padding: 6px 16px; border-radius: 15px; font-size: 12px; color: #fff; }

/* 演奏场景 */
.performance-scene { margin-top: 15px; }
.scene-bg-art { height: 100px; background: linear-gradient(to bottom, #1a1a2e 0%, #16213e 40%, #0f3460 100%); border-radius: 15px; position: relative; overflow: hidden; margin-bottom: 15px; }
.moon { width: 40px; height: 40px; background: radial-gradient(circle, #fdfd96, #f0e68c); border-radius: 50%; position: absolute; top: 15px; right: 30px; box-shadow: 0 0 20px #fdfd96; }
.mountains { position: absolute; bottom: 0; width: 100%; height: 60px; }
.mountain { position: absolute; bottom: 0; width: 0; height: 0; border-style: solid; }
.m1 { left: 10%; border-width: 0 60px 50px 60px; border-color: transparent transparent #1a1a3e transparent; }
.m2 { right: 20%; border-width: 0 80px 40px 80px; border-color: transparent transparent #16213e transparent; }
.performer { position: absolute; bottom: 15px; left: 30px; font-size: 36px; filter: drop-shadow(0 0 8px rgba(240,147,251,0.5)); }

/* 音乐轨道 */
.music-track { display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.3); border-radius: 12px; padding: 10px; margin-bottom: 12px; }
.track-label { font-size: 20px; writing-mode: vertical-rl; }
.notes-container { flex: 1; height: 220px; position: relative; overflow: hidden; background: rgba(0,0,0,0.2); border-radius: 8px; }
.note { position: absolute; left: 50%; transform: translateX(-50%); font-size: 24px; animation: noteFall linear forwards; opacity: 0.9; cursor: pointer; filter: drop-shadow(0 0 5px rgba(240,147,251,0.5)); }
.note.special { font-size: 30px; filter: drop-shadow(0 0 10px #ffd700); }
.note.hit { opacity: 0.3; transform: translateX(-50%) scale(1.5); }
@keyframes noteFall { 0% { top: -40px; opacity: 1; } 90% { opacity: 1; } 100% { top: 220px; opacity: 0; } }
.hit-zone { display: flex; flex-direction: column; gap: 4px; }
.hit-target { width: 40px; height: 40px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px; cursor: pointer; transition: all 0.1s; }
.hit-target.active { background: rgba(240,147,251,0.4); border-color: #f093fb; transform: scale(1.1); }

/* 演奏控制 */
.performance-controls { display: flex; align-items: center; gap: 15px; margin-bottom: 15px; }
.perf-stats { display: flex; gap: 12px; font-size: 13px; color: #aaa; flex: 1; }
.perform-btn { padding: 12px 30px; background: linear-gradient(135deg,#f093fb,#e94057); border: none; border-radius: 25px; color: #fff; font-weight: bold; font-size: 15px; cursor: pointer; }
.stop-btn { padding: 12px 30px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 25px; color: #fff; font-size: 14px; cursor: pointer; }

/* 结果 */
.performance-result, .match-result, .calligraphy-result, .painting-result { background: rgba(255,255,255,0.05); border-radius: 15px; padding: 20px; text-align: center; margin-top: 15px; }
.result-grade { font-size: 60px; font-weight: bold; margin-bottom: 10px; }
.result-grade.S { background: linear-gradient(135deg, #f093fb, #e94057); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.result-grade.A { color: #ffd700; }
.result-grade.B { color: #74b9ff; }
.result-grade.C { color: #888; }
.result-stats { display: flex; justify-content: center; gap: 20px; margin: 15px 0; }
.result-item { font-size: 13px; color: #aaa; }
.result-rewards { display: flex; justify-content: center; gap: 15px; font-size: 13px; color: #55efc4; margin: 15px 0; }
.replay-btn { padding: 10px 30px; background: linear-gradient(135deg,#9b59b6,#8e44ad); border: none; border-radius: 20px; color: #fff; font-size: 14px; cursor: pointer; margin-top: 10px; }

/* 历史记录 */
.history-list { display: flex; flex-direction: column; gap: 8px; }
.history-item { display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.03); padding: 10px 14px; border-radius: 10px; font-size: 13px; }
.rec-grade { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-weight: bold; font-size: 14px; }
.rec-grade.S { background: linear-gradient(135deg,#f093fb,#e94057); color: #fff; }
.rec-grade.A { background: #ffd700; color: #000; }
.rec-grade.B { background: #74b9ff; color: #fff; }
.rec-grade.C { background: #555; color: #fff; }
.rec-info { flex: 1; color: #ddd; }
.rec-time { color: #888; font-size: 11px; }

/* 棋盘 */
.go-board-container { margin-top: 15px; }
.board-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; background: rgba(255,255,255,0.05); padding: 10px 15px; border-radius: 12px; }
.board-info { display: flex; gap: 15px; font-size: 13px; }
.turn-indicator { font-size: 13px; padding: 5px 14px; border-radius: 15px; background: rgba(255,255,255,0.1); color: #aaa; }
.turn-indicator.yourTurn { background: rgba(240,147,251,0.2); color: #f093fb; }
.resign-btn { padding: 5px 14px; background: rgba(231,76,60,0.3); border: 1px solid rgba(231,76,60,0.5); border-radius: 15px; color: #e74c3c; font-size: 12px; cursor: pointer; }
.go-board { position: relative; width: fit-content; margin: 0 auto; }
.board-grid { display: grid; grid-template-columns: repeat(9, 44px); grid-template-rows: repeat(9, 44px); background: #deb887; border: 3px solid #8b4513; border-radius: 4px; }
.grid-row { display: contents; }
.grid-cell { width: 44px; height: 44px; position: relative; cursor: pointer; }
.grid-cell::before { content: ''; position: absolute; top: 0; left: 50%; width: 1px; height: 100%; background: rgba(0,0,0,0.2); transform: translateX(-50%); }
.grid-row:first-child .grid-cell::before { top: 50%; }
.grid-row:last-child .grid-cell::before { height: 50%; }
.grid-cell::after { content: ''; position: absolute; top: 50%; left: 0; height: 1px; width: 100%; background: rgba(0,0,0,0.2); transform: translateY(-50%); }
.grid-row:first-child .grid-cell::after { top: 50%; }
.grid-row:last-child .grid-cell::after { height: 50%; }
.cell-dot { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 8px; height: 8px; background: #333; border-radius: 50%; z-index: 1; }
.stone { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 36px; height: 36px; border-radius: 50%; z-index: 2; }
.stone.black { background: radial-gradient(circle at 35% 35%, #555, #111); box-shadow: 2px 2px 5px rgba(0,0,0,0.5); }
.stone.white { background: radial-gradient(circle at 35% 35%, #fff, #ddd); box-shadow: 2px 2px 5px rgba(0,0,0,0.3); }
.stone-shine { position: absolute; top: 6px; left: 8px; width: 8px; height: 8px; background: rgba(255,255,255,0.4); border-radius: 50%; }
.last-move-marker { position: absolute; width: 12px; height: 12px; background: rgba(231,76,60,0.8); border-radius: 50%; z-index: 3; transform: translate(-50%, -50%); }
.stone-pop-enter-active { animation: popIn 0.15s ease-out; }
@keyframes popIn { 0% { transform: translate(-50%,-50%) scale(0); } 70% { transform: translate(-50%,-50%) scale(1.2); } 100% { transform: translate(-50%,-50%) scale(1); } }
.board-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; background: rgba(255,255,255,0.05); padding: 10px 15px; border-radius: 12px; }
.captured-info { display: flex; gap: 15px; font-size: 12px; color: #aaa; }
.pass-btn { padding: 8px 20px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 15px; color: #fff; font-size: 13px; cursor: pointer; }
.result-title { font-size: 28px; margin-bottom: 10px; }
.result-detail { font-size: 14px; color: #aaa; margin-bottom: 15px; }

/* 书法 */
.calligraphy-area, .painting-area { margin-top: 15px; }
.text-input-row { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; }
.calligraphy-input { flex: 1; padding: 10px 15px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; color: #fff; font-size: 16px; outline: none; }
.calligraphy-input:focus { border-color: #f093fb; }
.char-count { color: #888; font-size: 12px; }
.brush-preview { margin-bottom: 15px; }
.paper-scroll { background: linear-gradient(135deg,#faf8f0,#f0e8d0); border-radius: 12px; padding: 30px 20px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.3); }
.calligraphy-text { font-size: 48px; line-height: 1.4; letter-spacing: 8px; }
.brush-effects { display: flex; gap: 20px; margin-bottom: 15px; }
.brush-param { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #aaa; flex: 1; }
.brush-param input[type="range"] { flex: 1; accent-color: #f093fb; }
.create-btn { width: 100%; padding: 14px; background: linear-gradient(135deg,#f093fb,#e94057); border: none; border-radius: 12px; color: #fff; font-size: 16px; font-weight: bold; cursor: pointer; }
.create-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.result-scroll { background: linear-gradient(135deg,#faf8f0,#f0e8d0); border-radius: 12px; padding: 30px 20px; text-align: center; margin-bottom: 15px; }
.finished-calligraphy { font-size: 52px; letter-spacing: 10px; line-height: 1.4; }
.result-judgement { margin-bottom: 15px; }
.judgment-label { font-size: 24px; font-weight: bold; color: #ffd700; margin-bottom: 5px; }
.judgment-stars { font-size: 20px; color: #ffd700; margin-bottom: 5px; }
.judgment-desc { font-size: 13px; color: #aaa; }

/* 画廊 */
.gallery-section { margin-top: 20px; }
.gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; }
.gallery-item { background: rgba(255,255,255,0.03); border-radius: 10px; overflow: hidden; }
.gallery-scroll { padding: 15px; text-align: center; font-size: 28px; letter-spacing: 4px; background: linear-gradient(135deg,#faf8f0,#f0e8d0); color: #1a1a1a; }
.gallery-canvas { width: 100%; display: block; background: #faf8f0; }
.gallery-meta { padding: 8px; font-size: 11px; color: #888; text-align: center; }
.painting-gallery .gallery-item { padding: 0; }
.painting-item { padding: 0 !important; background: transparent !important; }
.empty-hint { text-align: center; color: #555; font-size: 13px; padding: 20px; }

/* 画布 */
.canvas-toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 10px; }
.tool-group { display: flex; gap: 5px; }
.color-btn { width: 24px; height: 24px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; }
.color-btn.active { border-color: #fff; transform: scale(1.2); }
.brush-btn { width: 32px; height: 32px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; cursor: pointer; font-size: 16px; }
.brush-btn.active { background: rgba(240,147,251,0.3); border-color: #f093fb; }
.brush-size-slider { width: 80px; accent-color: #f093fb; }
.canvas-container { position: relative; display: flex; justify-content: center; margin-bottom: 10px; }
.painting-canvas { border-radius: 8px; cursor: crosshair; box-shadow: 0 4px 15px rgba(0,0,0,0.4); }
.canvas-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.7); border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; }
.painting-progress { width: 200px; height: 8px; background: rgba(255,255,255,0.2); border-radius: 4px; overflow: hidden; }
.progress-bar { height: 100%; background: linear-gradient(90deg,#f093fb,#e94057); border-radius: 4px; transition: width 0.3s; }
.progress-label { color: #fff; font-size: 14px; }
.painting-controls { display: flex; gap: 10px; }
.clear-canvas-btn { flex: 1; padding: 10px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); border-radius: 10px; color: #fff; cursor: pointer; font-size: 13px; }
.submit-painting-btn { flex: 2; padding: 10px; background: linear-gradient(135deg,#f093fb,#e94057); border: none; border-radius: 10px; color: #fff; font-weight: bold; font-size: 14px; cursor: pointer; }
.submit-painting-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* 底部总览 */
.art-overview { display: flex; gap: 8px; margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.03); border-radius: 12


.art-overview { display: flex; gap: 8px; margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.03); border-radius: 12px; }
.overview-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; }
.overview-icon { font-size: 20px; }
.overview-name { font-size: 12px; color: #aaa; }
.overview-level { font-size: 11px; color: #f093fb; }
.overview-bar { width: 100%; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; }
.overview-fill { height: 100%; border-radius: 2px; transition: width 0.5s; }
