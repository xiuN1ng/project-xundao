<template>
  <div class="wisdom-panel">
    <div class="wisdom-header">
      <div class="wisdom-title">🧠 悟性加点</div>
      <button class="close-btn" @click="$emit('close')">×</button>
    </div>
    
    <!-- 悟性等级和可用点数 -->
    <div class="wisdom-stats">
      <div class="stat-item">
        <span class="stat-icon">📊</span>
        <span class="stat-label">悟性等级</span>
        <span class="stat-value level">{{ wisdomLevel }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-icon">⭐</span>
        <span class="stat-label">可用点数</span>
        <span class="stat-value points">{{ availablePoints }}</span>
      </div>
    </div>
    
    <!-- 悟性属性列表 -->
    <div class="wisdom-attributes">
      <div 
        v-for="attr in attributes" 
        :key="attr.id"
        class="attribute-item"
      >
        <div class="attr-header">
          <span class="attr-icon">{{ attr.icon }}</span>
          <span class="attr-name">{{ attr.name }}</span>
          <span class="attr-value">{{ attr.current }}/{{ attr.max }}</span>
        </div>
        
        <!-- 属性进度条 -->
        <div class="attr-progress">
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: (attr.current / attr.max * 100) + '%' }"
              :class="'fill-' + attr.id"
            ></div>
          </div>
        </div>
        
        <!-- 加点控制 -->
        <div class="attr-controls">
          <button 
            class="control-btn minus" 
            @click="decreasePoint(attr)"
            :disabled="attr.allocated <= 0"
          >
            −
          </button>
          <span class="allocated-points">{{ attr.allocated }}</span>
          <button 
            class="control-btn plus" 
            @click="increasePoint(attr)"
            :disabled="availablePoints <= 0 || attr.current + attr.allocated >= attr.max"
          >
            +
          </button>
        </div>
        
        <!-- 属性效果描述 -->
        <div class="attr-effect">{{ attr.effect }}</div>
      </div>
    </div>
    
    <!-- 确认分配按钮 -->
    <button 
      class="confirm-btn" 
      :class="{ disabled: totalAllocated === 0 }"
      :disabled="totalAllocated === 0"
      @click="confirmAllocation"
    >
      ✅ 确认分配 ({{ totalAllocated }} 点)
    </button>
  </div>
</template>

<script>
const { ref, computed, onMounted } = Vue;

export default {
  name: 'WisdomPanel',
  emits: ['close', 'confirm'],
  setup(props, { emit }) {
    const wisdomLevel = ref(5);
    const availablePoints = ref(10);
    
    // 悟性属性模拟数据
    const attributes = ref([
      {
        id: 'bone',
        name: '悟性根骨',
        icon: '🦴',
        current: 20,
        max: 100,
        allocated: 0,
        effect: '提升修炼效率 +5%/级'
      },
      {
        id: 'agility',
        name: '悟性灵巧',
        icon: '⚡',
        current: 15,
        max: 100,
        allocated: 0,
        effect: '提升闪避几率 +3%/级'
      },
      {
        id: 'luck',
        name: '悟性运气',
        icon: '🍀',
        current: 10,
        max: 100,
        allocated: 0,
        effect: '提升暴击几率 +2%/级'
      }
    ]);
    
    const totalAllocated = computed(() => {
      return attributes.value.reduce((sum, attr) => sum + attr.allocated, 0);
    });
    
    const increasePoint = (attr) => {
      if (availablePoints.value > 0 && attr.current + attr.allocated < attr.max) {
        attr.allocated++;
        availablePoints.value--;
      }
    };
    
    const decreasePoint = (attr) => {
      if (attr.allocated > 0) {
        attr.allocated--;
        availablePoints.value++;
      }
    };
    
    const confirmAllocation = () => {
      if (totalAllocated.value === 0) return;
      
      const allocationData = {
        totalPoints: totalAllocated.value,
        attributes: attributes.value.map(attr => ({
          id: attr.id,
          name: attr.name,
          allocated: attr.allocated,
          newTotal: attr.current + attr.allocated
        }))
      };
      
      // 更新属性当前值
      attributes.value.forEach(attr => {
        attr.current += attr.allocated;
        attr.allocated = 0;
      });
      
      emit('confirm', allocationData);
      console.log('悟性分配确认:', allocationData);
    };
    
    return {
      wisdomLevel,
      availablePoints,
      attributes,
      totalAllocated,
      increasePoint,
      decreasePoint,
      confirmAllocation
    };
  }
};
</script>

<style scoped>
.wisdom-panel {
  width: 420px;
  max-height: 600px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 20px;
  color: #fff;
}

.wisdom-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.wisdom-title {
  font-size: 22px;
  font-weight: bold;
}

.close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #fff;
}

/* 悟性等级和可用点数 */
.wisdom-stats {
  display: flex;
  gap: 20px;
  margin-bottom: 25px;
  padding: 15px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.stat-icon {
  font-size: 20px;
}

.stat-label {
  font-size: 12px;
  color: #aaa;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
}

.stat-value.level {
  color: #a78bfa;
}

.stat-value.points {
  color: #ffd700;
}

/* 悟性属性列表 */
.wisdom-attributes {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 25px;
}

.attribute-item {
  padding: 15px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.attr-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.attr-icon {
  font-size: 20px;
}

.attr-name {
  flex: 1;
  font-size: 14px;
  font-weight: bold;
}

.attr-value {
  font-size: 14px;
  color: #aaa;
}

/* 属性进度条 */
.attr-progress {
  margin-bottom: 12px;
}

.progress-bar {
  height: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 5px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.3s ease;
}

.fill-bone {
  background: linear-gradient(90deg, #a78bfa 0%, #8b5cf6 100%);
}

.fill-agility {
  background: linear-gradient(90deg, #60a5fa 0%, #3b82f6 100%);
}

.fill-luck {
  background: linear-gradient(90deg, #4ade80 0%, #22c55e 100%);
}

/* 加点控制 */
.attr-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin-bottom: 10px;
}

.control-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.control-btn:hover:not(:disabled) {
  transform: scale(1.1);
}

.control-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.control-btn.minus {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.control-btn.plus {
  background: linear-gradient(135deg, #ffd700 0%, #ff9900 100%);
  color: #333;
}

.allocated-points {
  font-size: 20px;
  font-weight: bold;
  color: #ffd700;
  min-width: 40px;
  text-align: center;
}

/* 属性效果描述 */
.attr-effect {
  font-size: 11px;
  color: #888;
  text-align: center;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

/* 确认分配按钮 */
.confirm-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #a78bfa 0%, #6366f1 100%);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.confirm-btn:hover:not(.disabled) {
  transform: scale(1.02);
  box-shadow: 0 4px 15px rgba(167, 139, 250, 0.4);
}

.confirm-btn.disabled {
  background: rgba(255, 255, 255, 0.1);
  color: #888;
  cursor: not-allowed;
}
</style>
