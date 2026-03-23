<template>
  <div class="action-panel">
    <div class="panel-header">
      <h2>🎭 快捷动作</h2>
      <button class="close-btn" @click="closePanel">×</button>
    </div>
    
    <div class="panel-content">
      <!-- 常用动作 -->
      <div class="actions-section">
        <h3>✨ 常用动作</h3>
        <div class="action-grid">
          <button 
            v-for="action in commonActions" 
            :key="action.id"
            class="action-btn"
            :class="{ active: action.playing }"
            @click="playAction(action)"
          >
            <span class="action-icon">{{ action.icon }}</span>
            <span class="action-name">{{ action.name }}</span>
            <span v-if="action.playing" class="playing-indicator">▶️</span>
          </button>
        </div>
      </div>
      
      <!-- 表情包 -->
      <div class="emotes-section">
        <h3>😀 表情包</h3>
        <div class="emote-grid">
          <button 
            v-for="emote in emotes" 
            :key="emote.id"
            class="emote-btn"
            @click="sendEmote(emote)"
          >
            {{ emote.icon }}
          </button>
        </div>
      </div>
      
      <!-- 互动动作 -->
      <div class="interaction-section">
        <h3>🤝 互动动作</h3>
        <div class="interaction-list">
          <button 
            v-for="interaction in interactions" 
            :key="interaction.id"
            class="interaction-btn"
            :disabled="interaction.cooldown > 0"
            @click="doInteraction(interaction)"
          >
            <span class="interaction-icon">{{ interaction.icon }}</span>
            <span class="interaction-name">{{ interaction.name }}</span>
            <span v-if="interaction.cooldown > 0" class="cooldown">
              {{ interaction.cooldown }}s
            </span>
          </button>
        </div>
      </div>
      
      <!-- 动作特效展示 -->
      <div v-if="currentEffect" class="action-effect">
        <div class="effect-container" :class="currentEffect.type">
          <span class="effect-avatar">{{ currentEffect.icon }}</span>
          <span class="effect-text">{{ currentEffect.text }}</span>
        </div>
      </div>
      
      <!-- 快捷栏配置 -->
      <div class="quickbar-section">
        <h3>⚡ 快捷栏</h3>
        <div class="quickbar">
          <div 
            v-for="(slot, index) in quickbarSlots" 
            :key="index"
            class="quickbar-slot"
            :class="{ empty: !slot, filled: slot }"
            @click="removeFromQuickbar(index)"
          >
            <span v-if="slot" class="slot-icon">{{ slot.icon }}</span>
            <span v-else class="slot-number">{{ index + 1 }}</span>
          </div>
        </div>
        <p class="hint">点击动作添加到快捷栏，使用1-5键快速发送</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const emit = defineEmits(['close']);

// 常用动作
const commonActions = ref([
  { id: 1, name: '打招呼', icon: '👋', playing: false },
  { id: 2, name: '加油', icon: '💪', playing: false },
  { id: 3, name: '感谢', icon: '🙏', playing: false },
  { id: 4, name: '抱歉', icon: '😔', playing: false },
  { id: 5, name: '得意', icon: '😎', playing: false },
  { id: 6, name: '惊讶', icon: '😱', playing: false },
  { id: 7, name: '害羞', icon: '😊', playing: false },
  { id: 8, name: '愤怒', icon: '😠', playing: false },
  { id: 9, name: '大笑', icon: '😂', playing: false },
  { id: 10, name: '哭泣', icon: '😭', playing: false },
]);

// 表情包
const emotes = ref([
  { id: 1, icon: '👍' },
  { id: 2, icon: '👎' },
  { id: 3, icon: '❤️' },
  { id: 4, icon: '🎉' },
  { id: 5, icon: '🔥' },
  { id: 6, icon: '💯' },
  { id: 7, icon: '✨' },
  { id: 8, icon: '🌟' },
  { id: 9, icon: '💪' },
  { id: 10, icon: '🙌' },
  { id: 11, icon: '🤔' },
  { id: 12, icon: '🤣' },
]);

// 互动动作 - 包含拥抱和亲吻
const interactions = ref([
  { id: 1, name: '拥抱', icon: '🤗', cooldown: 30, maxCooldown: 30 },
  { id: 2, name: '亲吻', icon: '💋', cooldown: 45, maxCooldown: 45 },
  { id: 3, name: '握手', icon: '🤝', cooldown: 10, maxCooldown: 10 },
  { id: 4, name: '鼓掌', icon: '👏', cooldown: 5, maxCooldown: 5 },
  { id: 5, name: '比心', icon: '💕', cooldown: 15, maxCooldown: 15 },
  { id: 6, name: '摸头', icon: '👋', cooldown: 20, maxCooldown: 20 },
  { id: 7, name: '壁咚', icon: '💒', cooldown: 60, maxCooldown: 60 },
  { id: 8, name: '贴贴', icon: '🥰', cooldown: 30, maxCooldown: 30 },
  { id: 9, name: '么么哒', icon: '😘', cooldown: 40, maxCooldown: 40 },
]);

// 快捷栏
const quickbarSlots = ref([
  { id: 1, name: '打招呼', icon: '👋' },
  { id: 2, name: '加油', icon: '💪' },
  null,
  { id: 4, name: '感谢', icon: '🙏' },
  null,
]);

// 当前特效
const currentEffect = ref(null);

const closePanel = () => {
  emit('close');
};

const playAction = (action) => {
  action.playing = true;
  showActionEffect({
    type: 'common',
    icon: action.icon,
    text: action.name,
  });
  
  setTimeout(() => {
    action.playing = false;
  }, 2000);
};

const showActionEffect = (effect) => {
  currentEffect.value = effect;
  
  setTimeout(() => {
    currentEffect.value = null;
  }, 1500);
};

const sendEmote = (emote) => {
  showActionEffect({
    type: 'emote',
    icon: emote.icon,
    text: '表情',
  });
};

const doInteraction = (interaction) => {
  if (interaction.cooldown > 0) return;
  
  interaction.cooldown = interaction.maxCooldown || 60;
  
  showActionEffect({
    type: 'interaction',
    icon: interaction.icon,
    text: interaction.name,
  });
  
  // 冷却计时
  const timer = setInterval(() => {
    interaction.cooldown--;
    if (interaction.cooldown <= 0) {
      clearInterval(timer);
    }
  }, 1000);
};

const removeFromQuickbar = (index) => {
  quickbarSlots.value[index] = null;
};

const handleKeydown = (e) => {
  const num = parseInt(e.key);
  if (num >= 1 && num <= 5 && quickbarSlots.value[num - 1]) {
    const slot = quickbarSlots.value[num - 1];
    const action = commonActions.value.find(a => a.id === slot.id);
    if (action) {
      playAction(action);
    }
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.action-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 500px;
  max-height: 80vh;
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  color: white;
  z-index: 1000;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.panel-content {
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
}

.actions-section, .emotes-section, .interaction-section, .quickbar-section {
  margin-bottom: 20px;
}

h3 {
  margin-bottom: 15px;
  font-size: 18px;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 15px 10px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: white;
  position: relative;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-3px);
}

.action-btn.active {
  background: rgba(255, 215, 0, 0.4);
  border: 2px solid rgba(255, 215, 0, 0.6);
}

.action-icon {
  font-size: 28px;
}

.action-name {
  font-size: 12px;
}

.playing-indicator {
  position: absolute;
  top: 5px;
  right: 5px;
  font-size: 12px;
  animation: pulse 0.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.emote-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
}

.emote-btn {
  font-size: 28px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.emote-btn:hover {
  background: rgba(255, 255, 255, 0.4);
  transform: scale(1.1);
}

.interaction-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.interaction-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: white;
  position: relative;
}

.interaction-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-3px);
}

.interaction-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.interaction-icon {
  font-size: 32px;
}

.cooldown {
  position: absolute;
  top: 5px;
  right: 5px;
  font-size: 12px;
  background: rgba(0, 0, 0, 0.5);
  padding: 2px 6px;
  border-radius: 5px;
}

.action-effect {
  position: fixed;
  top: 30%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1001;
  pointer-events: none;
}

.effect-container {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px 30px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 20px;
  animation: effectPop 1.5s ease-out forwards;
}

.effect-avatar {
  font-size: 48px;
}

.effect-text {
  font-size: 24px;
  font-weight: bold;
}

@keyframes effectPop {
  0% { transform: scale(0); opacity: 0; }
  20% { transform: scale(1.2); opacity: 1; }
  80% { transform: scale(1); opacity: 1; }
  100% { transform: scale(0.8); opacity: 0; }
}

.quickbar {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.quickbar-slot {
  width: 60px;
  height: 60px;
  background: rgba(0, 0, 0, 0.3);
  border: 2px dashed rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.quickbar-slot.filled {
  border: 2px solid rgba(255, 215, 0, 0.5);
  background: rgba(255, 215, 0, 0.2);
}

.quickbar-slot:hover {
  border-color: rgba(255, 255, 255, 0.6);
}

.slot-icon {
  font-size: 32px;
}

.slot-number {
  font-size: 18px;
  opacity: 0.5;
}

.hint {
  font-size: 12px;
  opacity: 0.7;
  text-align: center;
}
</style>
