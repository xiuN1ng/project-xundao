<template>
  <div class="interaction-button-panel">
    <div class="panel-header">
      <h2>🎮 互动动作按钮</h2>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>
    
    <div class="panel-content">
      <!-- 动作预览区 -->
      <div class="preview-section">
        <div class="character-display">
          <div class="character-avatar" :class="{ 'playing': isPlaying }">
            <span class="avatar-emoji">{{ currentAction.emoji }}</span>
          </div>
          <div class="action-label">{{ currentAction.name }}</div>
        </div>
        
        <!-- 快捷动作栏 -->
        <div class="quick-actions">
          <button 
            v-for="action in quickActions" 
            :key="action.id"
            class="quick-btn"
            :class="{ active: selectedQuickAction === action.id }"
            @click="triggerQuickAction(action)"
          >
            {{ action.emoji }}
          </button>
        </div>
      </div>
      
      <!-- 动作分类 -->
      <div class="action-tabs">
        <button 
          v-for="tab in actionTabs" 
          :key="tab.id"
          class="tab-btn"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          {{ tab.icon }} {{ tab.name }}
        </button>
      </div>
      
      <!-- 基础动作 -->
      <div class="actions-grid" v-if="activeTab === 'basic'">
        <div 
          v-for="action in basicActions" 
          :key="action.id"
          class="action-card"
          @click="playAction(action)"
        >
          <div class="action-icon" :style="{ background: action.color }">
            {{ action.emoji }}
          </div>
          <div class="action-info">
            <div class="action-name">{{ action.name }}</div>
            <div class="action-desc">{{ action.desc }}</div>
            <div class="action-cooldown" v-if="action.cooldown > 0">
              ⏱️ {{ action.cooldown }}秒
            </div>
          </div>
          <button class="play-btn" @click.stop="playAction(action)">▶</button>
        </div>
      </div>
      
      <!-- 社交动作 -->
      <div class="actions-grid" v-if="activeTab === 'social'">
        <div 
          v-for="action in socialActions" 
          :key="action.id"
          class="action-card"
          @click="playAction(action)"
        >
          <div class="action-icon" :style="{ background: action.color }">
            {{ action.emoji }}
          </div>
          <div class="action-info">
            <div class="action-name">{{ action.name }}</div>
            <div class="action-desc">{{ action.desc }}</div>
            <div class="action-cost" v-if="action.cost">{{ action.cost }}</div>
          </div>
          <button class="play-btn" @click.stop="playAction(action)">▶</button>
        </div>
      </div>
      
      <!-- 战斗动作 -->
      <div class="actions-grid" v-if="activeTab === 'combat'">
        <div 
          v-for="action in combatActions" 
          :key="action.id"
          class="action-card combat"
          @click="playAction(action)"
        >
          <div class="action-icon" :style="{ background: action.color }">
            {{ action.emoji }}
          </div>
          <div class="action-info">
            <div class="action-name">{{ action.name }}</div>
            <div class="action-desc">{{ action.desc }}</div>
            <div class="action-power" v-if="action.power">
              ⚔️ 威力: {{ action.power }}
            </div>
          </div>
          <button class="play-btn" @click.stop="playAction(action)">▶</button>
        </div>
      </div>
      
      <!-- 表情动作 -->
      <div class="emote-grid" v-if="activeTab === 'emote'">
        <button 
          v-for="emote in emoteActions" 
          :key="emote.id"
          class="emote-btn"
          :class="{ playing: currentEmote === emote.id }"
          @click="playEmote(emote)"
        >
          <span class="emote-emoji">{{ emote.emoji }}</span>
          <span class="emote-name">{{ emote.name }}</span>
        </button>
      </div>
      
      <!-- 动作设置 -->
      <div class="effect-section">
        <h3>⚙️ 动作设置</h3>
        <div class="settings-group">
          <div class="setting-row">
            <label>动作时长</label>
            <input type="range" v-model="settings.duration" min="0.5" max="5" step="0.5" />
            <span>{{ settings.duration }}秒</span>
          </div>
          <div class="setting-row">
            <label>动画效果</label>
            <select v-model="settings.animation">
              <option value="bounce">弹跳</option>
              <option value="shake">摇晃</option>
              <option value="spin">旋转</option>
              <option value="pulse">脉冲</option>
            </select>
          </div>
          <div class="setting-row">
            <label>音效</label>
            <input type="checkbox" v-model="settings.sound" />
            <span>启用动作音效</span>
          </div>
          <div class="setting-row">
            <label>屏幕特效</label>
            <input type="checkbox" v-model="settings.screenEffect" />
            <span>启用全屏特效</span>
          </div>
        </div>
      </div>
      
      <!-- 快捷键设置 -->
      <div class="effect-section">
        <h3>⌨️ 快捷键设置</h3>
        <div class="hotkey-list">
          <div class="hotkey-item" v-for="(action, idx) in hotkeyActions" :key="idx">
            <span class="hotkey-action">{{ action.emoji }} {{ action.name }}</span>
            <input 
              type="text" 
              class="hotkey-input" 
              :value="action.hotkey"
              @keydown="setHotkey($event, idx)"
              placeholder="点击设置"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'InteractionButtonPanel',
  emits: ['close'],
  data() {
    return {
      activeTab: 'basic',
      selectedQuickAction: null,
      currentAction: { emoji: '🧍', name: '站立' },
      currentEmote: null,
      isPlaying: false,
      settings: {
        duration: 1.5,
        animation: 'bounce',
        sound: true,
        screenEffect: true
      },
      actionTabs: [
        { id: 'basic', name: '基础', icon: '🏃' },
        { id: 'social', name: '社交', icon: '👋' },
        { id: 'combat', name: '战斗', icon: '⚔️' },
        { id: 'emote', name: '表情', icon: '😀' }
      ],
      quickActions: [
        { id: 'wave', emoji: '👋', name: '挥手' },
        { id: 'clap', emoji: '👏', name: '鼓掌' },
        { id: 'dance', emoji: '💃', name: '跳舞' },
        { id: 'fight', emoji: '🥊', name: '战斗' },
        { id: 'cheer', emoji: '🎉', name: '欢呼' },
        { id: 'pray', emoji: '🙏', name: '祈福' }
      ],
      basicActions: [
        { id: 'walk', name: '行走', emoji: '🏃', desc: '移动角色', color: 'linear-gradient(135deg, #3498db, #2980b9)', cooldown: 0 },
        { id: 'run', name: '奔跑', emoji: '🏃‍♂️', desc: '快速移动', color: 'linear-gradient(135deg, #e74c3c, #c0392b)', cooldown: 0 },
        { id: 'jump', name: '跳跃', emoji: '🦘', desc: '跳跃动作', color: 'linear-gradient(135deg, #9b59b6, #8e44ad)', cooldown: 2 },
        { id: 'sit', name: '坐下', emoji: '🧘', desc: '打坐修炼', color: 'linear-gradient(135deg, #1abc9c, #16a085)', cooldown: 0 },
        { id: 'sleep', name: '睡觉', emoji: '😴', desc: '休息恢复', color: 'linear-gradient(135deg, #34495e, #2c3e50)', cooldown: 0 },
        { id: 'stand', name: '站立', emoji: '🧍', desc: '默认站立', color: 'linear-gradient(135deg, #95a5a6, #7f8c8d)', cooldown: 0 }
      ],
      socialActions: [
        { id: 'wave', name: '挥手', emoji: '👋', desc: '向他人挥手', color: 'linear-gradient(135deg, #f39c12, #e67e22)', cost: '免费' },
        { id: 'hug', name: '拥抱', emoji: '🤗', desc: '拥抱他人', color: 'linear-gradient(135deg, #e91e63, #c2185b)', cost: '5元宝' },
        { id: 'bow', name: '鞠躬', emoji: '🙇', desc: '礼貌问候', color: 'linear-gradient(135deg, #00bcd4, #0097a7)', cost: '免费' },
        { id: 'shake', name: '握手', emoji: '🤝', desc: '友好示意', color: 'linear-gradient(135deg, #8bc34a, #689f38)', cost: '免费' },
        { id: 'kiss', name: '飞吻', emoji: '😘', desc: '表达喜爱', color: 'linear-gradient(135deg, #ff5722, #e64a19)', cost: '10元宝' },
        { id: 'poke', name: '戳一下', emoji: '👉', desc: '引起注意', color: 'linear-gradient(135deg, #673ab7, #512da8)', cost: '免费' }
      ],
      combatActions: [
        { id: 'attack', name: '攻击', emoji: '⚔️', desc: '普通攻击', color: 'linear-gradient(135deg, #c0392b, #a93226)', power: 100, cooldown: 1 },
        { id: 'defend', name: '防御', emoji: '🛡️', desc: '举起防御', color: 'linear-gradient(135deg, #2980b9, #1a5276)', power: 0, cooldown: 0 },
        { id: 'charge', name: '冲锋', emoji: '🏇', desc: '冲锋陷阵', color: 'linear-gradient(135deg, #d35400, #ba4a00)', power: 150, cooldown: 3 },
        { id: 'dodge', name: '闪避', emoji: '💨', desc: '躲避攻击', color: 'linear-gradient(135deg, #27ae60, #1e8449)', power: 0, cooldown: 2 },
        { id: 'special', name: '必杀技', emoji: '💥', desc: '强力技能', color: 'linear-gradient(135deg, #8e44ad, #6c3483)', power: 300, cooldown: 10 },
        { id: 'ultimate', name: '终极技', emoji: '🌟', desc: '终极奥义', color: 'linear-gradient(135deg, #f1c40f, #d4ac0d)', power: 500, cooldown: 30 }
      ],
      emoteActions: [
        { id: 'happy', name: '开心', emoji: '😊' },
        { id: 'sad', name: '伤心', emoji: '😢' },
        { id: 'angry', name: '生气', emoji: '😠' },
        { id: 'surprised', name: '惊讶', emoji: '😲' },
        { id: 'love', name: '爱心', emoji: '😍' },
        { id: 'cool', name: '酷', emoji: '😎' },
        { id: 'laugh', name: '大笑', emoji: '😂' },
        { id: 'cry', name: '哭泣', emoji: '😭' },
        { id: 'think', name: '思考', emoji: '🤔' },
        { id: 'sleepy', name: '困', emoji: '😪' },
        { id: 'dizzy', name: '晕', emoji: '😵' },
        { id: 'rich', name: '有钱', emoji: '🤑' }
      ],
      hotkeyActions: [
        { name: '挥手', emoji: '👋', hotkey: '1' },
        { name: '鼓掌', emoji: '👏', hotkey: '2' },
        { name: '跳舞', emoji: '💃', hotkey: '3' },
        { name: '攻击', emoji: '⚔️', hotkey: 'Q' },
        { name: '防御', emoji: '🛡️', hotkey: 'W' },
        { name: '必杀', emoji: '💥', hotkey: 'E' }
      ]
    };
  },
  methods: {
    triggerQuickAction(action) {
      this.selectedQuickAction = action.id;
      this.playAction({
        emoji: action.emoji,
        name: action.name,
        color: 'linear-gradient(135deg, #e94560, #c73e54)'
      });
    },
    playAction(action) {
      this.currentAction = { emoji: action.emoji, name: action.name };
      this.isPlaying = true;
      
      // 播放动画
      setTimeout(() => {
        this.isPlaying = false;
      }, this.settings.duration * 1000);
      
      console.log('播放动作:', action.name);
    },
    playEmote(emote) {
      this.currentEmote = emote.id;
      this.currentAction = { emoji: emote.emoji, name: emote.name };
      this.isPlaying = true;
      
      setTimeout(() => {
        this.currentEmote = null;
        this.isPlaying = false;
      }, 2000);
    },
    setHotkey(event, idx) {
      event.preventDefault();
      const key = event.key;
      if (key !== 'Backspace' && key !== 'Delete') {
        this.hotkeyActions[idx].hotkey = key.toUpperCase();
      }
    }
  }
};
</script>

<style>
.interaction-button-panel {
  background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  width: 90%;
  max-width: 650px;
  max-height: 85vh;
  overflow: hidden;
  color: #e8e8f0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(90deg, rgba(78, 205, 196, 0.1), transparent);
  border-bottom: 1px solid rgba(78, 205, 196, 0.2);
}

.panel-header h2 {
  margin: 0;
  font-size: 18px;
  color: #4ecdc4;
}

.panel-content {
  padding: 20px;
  max-height: 70vh;
  overflow-y: auto;
}

.preview-section {
  background: linear-gradient(180deg, #0f0f23 0%, #1a1a2e 100%);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid rgba(78, 205, 196, 0.2);
}

.character-display {
  text-align: center;
  margin-bottom: 15px;
}

.character-avatar {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #4ecdc4, #44a08d);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 10px;
  font-size: 40px;
  transition: all 0.3s ease;
}

.character-avatar.playing {
  animation: actionBounce 0.5s ease infinite;
}

@keyframes actionBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.action-label {
  font-size: 14px;
  color: #4ecdc4;
}

.quick-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.quick-btn {
  width: 45px;
  height: 45px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(78, 205, 196, 0.3);
  border-radius: 12px;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.quick-btn:hover {
  background: rgba(78, 205, 196, 0.2);
  transform: scale(1.1);
}

.quick-btn.active {
  background: rgba(78, 205, 196, 0.3);
  border-color: #4ecdc4;
}

.action-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  color: #aaa;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s ease;
}

.tab-btn:hover {
  background: rgba(78, 205, 196, 0.1);
}

.tab-btn.active {
  background: linear-gradient(135deg, #4ecdc4, #44a08d);
  color: #fff;
  border-color: transparent;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.action-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.action-card:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(78, 205, 196, 0.3);
}

.action-card.combat {
  border-color: rgba(192, 57, 43, 0.3);
}

.action-card.combat:hover {
  border-color: #c0392b;
}

.action-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.action-info {
  flex: 1;
  min-width: 0;
}

.action-name {
  font-size: 14px;
  font-weight: bold;
  color: #e8e8f0;
  margin-bottom: 2px;
}

.action-desc {
  font-size: 11px;
  color: #888;
  margin-bottom: 4px;
}

.action-cooldown, .action-cost, .action-power {
  font-size: 10px;
  color: #4ecdc4;
}

.play-btn {
  width: 36px;
  height: 36px;
  background: rgba(78, 205, 196, 0.2);
  border: none;
  border-radius: 50%;
  color: #4ecdc4;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.play-btn:hover {
  background: #4ecdc4;
  color: #fff;
}

.emote-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 20px;
}

.emote-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.emote-btn:hover {
  background: rgba(78, 205, 196, 0.1);
}

.emote-btn.playing {
  background: rgba(78, 205, 196, 0.2);
  border-color: #4ecdc4;
}

.emote-emoji {
  font-size: 24px;
  display: block;
  margin-bottom: 4px;
}

.emote-name {
  font-size: 10px;
  color: #aaa;
}

.effect-section {
  margin-bottom: 20px;
}

.effect-section h3 {
  font-size: 14px;
  color: #4ecdc4;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(78, 205, 196, 0.1);
}

.settings-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setting-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.setting-row label {
  min-width: 60px;
  font-size: 12px;
  color: #aaa;
}

.setting-row input[type="range"] {
  flex: 1;
}

.setting-row select {
  flex: 1;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
}

.setting-row span {
  min-width: 60px;
  font-size: 12px;
  color: #888;
}

.hotkey-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hotkey-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
}

.hotkey-action {
  font-size: 12px;
  color: #aaa;
}

.hotkey-input {
  width: 60px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(78, 205, 196, 0.3);
  color: #4ecdc4;
  padding: 4px 8px;
  border-radius: 4px;
  text-align: center;
  font-size: 12px;
}

.hotkey-input:focus {
  outline: none;
  border-color: #4ecdc4;
}
</style>
