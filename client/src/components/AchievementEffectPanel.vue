<template>
  <div class="achievement-effect-panel" :class="{ active: showEffect }" @click="dismiss">
    <!-- 成就解锁特效 -->
    <div v-if="showEffect" class="effect-container">
      <div class="effect-background"></div>
      <div class="achievement-badge">
        <span class="badge-icon">{{ currentAchievement.icon }}</span>
      </div>
      <div class="achievement-name">{{ currentAchievement.name }}</div>
      <div class="achievement-desc">{{ currentAchievement.description }}</div>
      <div class="reward-info">
        <span class="reward-label">奖励:</span>
        <span class="reward-value">+{{ currentAchievement.reward }}</span>
      </div>
      <div class="particles">
        <span v-for="n in 20" :key="n" class="particle" :style="getParticleStyle(n)">✨</span>
      </div>
    </div>
    
    <!-- 成就动画列表 -->
    <div class="effect-list">
      <div 
        v-for="effect in achievementEffects" 
        :key="effect.id"
        class="effect-item"
        :class="{ playing: effect.playing }"
        @click="replayEffect(effect)"
      >
        <span class="effect-icon">{{ effect.icon }}</span>
        <span class="effect-name">{{ effect.name }}</span>
        <span class="effect-status">{{ effect.playing ? '🔊' : '▶️' }}</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AchievementEffectPanel',
  props: {
    achievement: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      showEffect: false,
      currentAchievement: {
        icon: '🏆',
        name: '成就解锁',
        description: '恭喜达成里程碑',
        reward: '1000 灵石',
      },
      achievementEffects: [
        { id: 1, name: '首次登录', icon: '🎮', playing: false },
        { id: 2, name: '等级突破', icon: '⬆️', playing: false },
        { id: 3, name: '装备强化', icon: '⚔️', playing: false },
        { id: 4, name: '战力提升', icon: '💪', playing: false },
        { id: 5, name: '副本通关', icon: '🗺️', playing: false },
        { id: 6, name: '社交互动', icon: '👥', playing: false },
      ],
    };
  },
  watch: {
    achievement: {
      handler(newVal) {
        if (newVal && newVal.name) {
          this.playUnlockEffect(newVal);
        }
      },
      immediate: true
    }
  },
  methods: {
    getParticleStyle(n) {
      const angle = (n / 20) * 360;
      const distance = 100 + Math.random() * 50;
      return {
        transform: `rotate(${angle}deg) translateY(-${distance}px)`,
        animationDelay: `${n * 0.1}s`,
      };
    },
    replayEffect(effect) {
      effect.playing = true;
      this.showEffect = true;
      this.currentAchievement = {
        icon: effect.icon,
        name: effect.name + '成就',
        description: '解锁成就: ' + effect.name,
        reward: Math.floor(Math.random() * 1000 + 500) + ' 灵石',
      };
      
      setTimeout(() => {
        effect.playing = false;
        this.showEffect = false;
      }, 3000);
    },
    playUnlockEffect(achievement) {
      this.currentAchievement = {
        icon: achievement.icon || '🏆',
        name: achievement.name || '成就达成',
        description: achievement.desc || achievement.description || '恭喜达成里程碑',
        reward: achievement.rewardText || (typeof achievement.reward === 'object'
          ? Object.entries(achievement.reward).map(([k, v]) => `${v}${k === 'diamonds' ? '💎' : '灵石'}`).join(', ')
          : (achievement.reward || '奖励')),
      };
      this.showEffect = true;
      this.playSound();
      setTimeout(() => {
        this.showEffect = false;
      }, 3500);
    },
    playSound() {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const frequencies = [523.25, 659.25, 783.99, 1046.50];
        frequencies.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.12);
          osc.stop(ctx.currentTime + i * 0.12 + 0.4);
        });
      } catch (e) {
        // Audio not supported
      }
    },
    dismiss() {
      this.showEffect = false;
    }
  },
};
</script>

<style scoped>
.achievement-effect-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 400px;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  border-radius: 20px;
  padding: 20px;
  color: white;
  z-index: 1000;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}

.effect-container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  overflow: hidden;
}

.effect-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%);
  animation: bgPulse 1s ease-in-out infinite;
}

@keyframes bgPulse {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.1); }
}

.achievement-badge {
  width: 100px;
  height: 100px;
  background: linear-gradient(135deg, #ffd700, #ffaa00);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 50px;
  box-shadow: 0 0 30px rgba(255, 215, 0, 0.8);
  animation: badgePop 0.5s ease-out;
  z-index: 1;
}

@keyframes badgePop {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.achievement-name {
  font-size: 28px;
  font-weight: bold;
  margin-top: 20px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.5s ease-out 0.2s both;
}

.achievement-desc {
  font-size: 16px;
  margin-top: 10px;
  opacity: 0.9;
  animation: slideUp 0.5s ease-out 0.3s both;
}

.reward-info {
  margin-top: 20px;
  padding: 10px 20px;
  background: rgba(255, 215, 0, 0.3);
  border-radius: 20px;
  animation: slideUp 0.5s ease-out 0.4s both;
}

.reward-value {
  color: #ffd700;
  font-weight: bold;
  font-size: 18px;
}

.particles {
  position: absolute;
  top: 50%;
  left: 50%;
}

.particle {
  position: absolute;
  font-size: 20px;
  animation: particleFloat 2s ease-in-out infinite;
}

@keyframes particleFloat {
  0%, 100% { opacity: 0; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(-20px); }
}

.effect-list {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.effect-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.effect-item:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateX(5px);
}

.effect-item.playing {
  background: rgba(255, 215, 0, 0.3);
  border: 1px solid rgba(255, 215, 0, 0.5);
}

.effect-icon {
  font-size: 24px;
}

.effect-name {
  flex: 1;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
