<template>
  <div class="adventure-panel" :class="{ 'panel-enter': show }">
    <div class="panel-backdrop" @click="$emit('close')"></div>
    <div class="adventure-content" :class="{ 'content-enter': show }">
      <!-- 事件类型标签 -->
      <div class="event-type">
        <span class="type-icon">{{ currentEvent.icon }}</span>
        <span class="type-label">{{ currentEvent.typeLabel }}</span>
      </div>
      
      <!-- 事件标题 -->
      <div class="event-title">{{ currentEvent.title }}</div>
      
      <!-- 事件描述 -->
      <div class="event-description">
        <p>{{ currentEvent.description }}</p>
      </div>
      
      <!-- 事件插图 -->
      <div class="event-illustration" v-if="currentEvent.illustration">
        <span class="illustration-icon">{{ currentEvent.illustration }}</span>
      </div>
      
      <!-- 事件奖励预览 -->
      <div class="event-rewards" v-if="currentEvent.rewards && currentEvent.rewards.length">
        <div class="rewards-title">🎁 可能的奖励</div>
        <div class="rewards-list">
          <div v-for="(reward, idx) in currentEvent.rewards" :key="idx" class="reward-item">
            <span class="reward-icon">{{ reward.icon }}</span>
            <span class="reward-name">{{ reward.name }}</span>
            <span class="reward-amount">x{{ reward.amount }}</span>
          </div>
        </div>
      </div>
      
      <!-- 事件选项按钮 -->
      <div class="event-options">
        <button class="option-btn accept" @click="handleOption('accept')" v-if="currentEvent.showAccept">
          ✅ 接受
        </button>
        <button class="option-btn reject" @click="handleOption('reject')" v-if="currentEvent.showReject">
          ❌ 拒绝
        </button>
        <button class="option-btn detail" @click="handleOption('detail')">
          📖 查看详情
        </button>
      </div>
      
      <!-- 关闭按钮 -->
      <button class="close-btn" @click="$emit('close')">×</button>
    </div>
  </div>
</template>

<script>
const { ref, computed, onMounted } = Vue;

export default {
  name: 'AdventureEventPanel',
  emits: ['close', 'accept', 'reject', 'viewDetail'],
  props: {
    eventId: {
      type: Number,
      default: 1
    }
  },
  setup(props, { emit }) {
    const show = ref(false);
    
    // 奇遇事件模拟数据
    const events = [
      {
        id: 1,
        type: 'treasure',
        typeLabel: '获得宝物',
        icon: '💎',
        title: '山洞奇遇',
        description: '你在山间漫步时，意外发现了一个隐蔽的山洞。洞口散发着微弱的光芒，似乎有什么宝物在其中...',
        illustration: '🏔️',
        showAccept: true,
        showReject: true,
        rewards: [
          { icon: '💰', name: '灵石', amount: 1000 },
          { icon: '⚔️', name: '玄铁剑', amount: 1 },
          { icon: '🌿', name: '灵草', amount: 10 }
        ]
      },
      {
        id: 2,
        type: 'plot',
        typeLabel: '触发剧情',
        icon: '📖',
        title: '仙人指路',
        description: '一位白发仙人突然出现在你面前，表示与你有一面之缘，决定传授你一套修炼功法...',
        illustration: '🧓',
        showAccept: true,
        showReject: true,
        rewards: [
          { icon: '📜', name: '仙人功法', amount: 1 },
          { icon: '💎', name: '元宝', amount: 100 }
        ]
      },
      {
        id: 3,
        type: 'opportunity',
        typeLabel: '遇到机遇',
        icon: '✨',
        title: '天降横财',
        description: '天空突然降下一道金光，你发现前方有一箱金银珠宝散落在地上，似乎是某位仙人遗落的...',
        illustration: '💰',
        showAccept: true,
        showReject: false,
        rewards: [
          { icon: '💰', name: '灵石', amount: 5000 },
          { icon: '💎', name: '元宝', amount: 50 }
        ]
      },
      {
        id: 4,
        type: 'danger',
        typeLabel: '危险降临',
        icon: '⚠️',
        title: '妖兽来袭',
        description: '一只强大的妖兽突然出现在你面前，眼神中透露着凶光...
        </div>',
        illustration: '👹',
        showAccept: true,
        showReject: true,
        rewards: [
          { icon: '🪵', name: '妖兽材料', amount: 5 },
          { icon: '⚔️', name: '妖丹', amount: 1 }
        ]
      },
      {
        id: 5,
        type: 'mystery',
        typeLabel: '神秘事件',
        icon: '🔮',
        title: '神秘遗迹',
        description: '你发现了一处古老的修仙遗迹，入口处刻着古老的符文，看起来已经尘封多年...',
        illustration: '🏛️',
        showAccept: true,
        showReject: true,
        rewards: [
          { icon: '📚', name: '古老功法', amount: 1 },
          { icon: '💎', name: '神秘宝箱', amount: 1 }
        ]
      }
    ];
    
    // 根据eventId获取当前事件
    const currentEvent = computed(() => {
      return events.find(e => e.id === props.eventId) || events[0];
    });
    
    const handleOption = (option) => {
      if (option === 'accept') {
        emit('accept', currentEvent.value);
      } else if (option === 'reject') {
        emit('reject', currentEvent.value);
      } else if (option === 'detail') {
        emit('viewDetail', currentEvent.value);
      }
      // 关闭面板
      emit('close');
    };
    
    onMounted(() => {
      // 延迟显示动画
      setTimeout(() => {
        show.value = true;
      }, 100);
    });
    
    return {
      show,
      currentEvent,
      handleOption
    };
  }
};
</script>

<style scoped>
.adventure-panel {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.panel-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
}

.adventure-content {
  position: relative;
  width: 480px;
  max-height: 80vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  border-radius: 20px;
  padding: 30px;
  color: #fff;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(165, 94, 234, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow-y: auto;
}

/* 进入动画 */
.panel-enter .adventure-content {
  animation: none;
}

.content-enter {
  animation: slideIn 0.5s ease-out forwards;
}

@keyframes slideIn {
  0% {
    opacity: 0;
    transform: scale(0.8) translateY(20px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* 事件类型标签 */
.event-type {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 15px;
}

.type-icon {
  font-size: 24px;
}

.type-label {
  font-size: 14px;
  padding: 4px 12px;
  background: linear-gradient(135deg, #a855f7 0%, #6366f1 100%);
  border-radius: 15px;
  font-weight: bold;
}

/* 事件标题 */
.event-title {
  font-size: 28px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 20px;
  background: linear-gradient(135deg, #ffd700 0%, #ff9900 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 事件描述 */
.event-description {
  text-align: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  margin-bottom: 20px;
  line-height: 1.8;
  font-size: 15px;
  color: #e0e0e0;
}

/* 事件插图 */
.event-illustration {
  text-align: center;
  margin-bottom: 20px;
}

.illustration-icon {
  font-size: 80px;
  display: inline-block;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

/* 事件奖励 */
.event-rewards {
  margin-bottom: 25px;
}

.rewards-title {
  font-size: 14px;
  color: #aaa;
  margin-bottom: 10px;
  text-align: center;
}

.rewards-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

.reward-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 12px;
  background: rgba(255, 215, 0, 0.1);
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 8px;
  font-size: 12px;
}

.reward-icon {
  font-size: 16px;
}

.reward-name {
  color: #fff;
}

.reward-amount {
  color: #ffd700;
  font-weight: bold;
}

/* 事件选项按钮 */
.event-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.option-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.option-btn:hover {
  transform: scale(1.02);
}

.option-btn.accept {
  background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
  color: #fff;
}

.option-btn.reject {
  background: rgba(255, 255, 255, 0.1);
  color: #aaa;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.option-btn.detail {
  background: rgba(255, 255, 255, 0.1);
  color: #60a5fa;
  border: 1px solid rgba(96, 165, 250, 0.3);
}

/* 关闭按钮 */
.close-btn {
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  color: #888;
  font-size: 28px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color 0.3s;
}

.close-btn:hover {
  color: #fff;
}
</style>
