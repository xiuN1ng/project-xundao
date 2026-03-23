<template>
  <div class="gacha-panel">
    <div class="panel-header">
      <h2>🎰 抽奖系统 - 转盘与列表</h2>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>
    
    <div class="panel-content">
      <!-- 抽奖模式切换 -->
      <div class="gacha-modes">
        <button 
          class="mode-btn"
          :class="{ active: gachaMode === 'wheel' }"
          @click="gachaMode = 'wheel'"
        >
          🎡 转盘抽奖
        </button>
        <button 
          class="mode-btn"
          :class="{ active: gachaMode === 'list' }"
          @click="gachaMode = 'list'"
        >
          📋 列表抽奖
        </button>
        <button 
          class="mode-btn"
          :class="{ active: gachaMode === 'card' }"
          @click="gachaMode = 'card'"
        >
          🃏 卡片抽奖
        </button>
      </div>
      
      <!-- 转盘抽奖 -->
      <div class="wheel-section" v-if="gachaMode === 'wheel'">
        <div class="wheel-container">
          <div class="wheel" :style="wheelStyle">
            <div 
              v-for="(item, idx) in wheelItems" 
              :key="idx"
              class="wheel-item"
              :style="getWheelItemStyle(idx)"
            >
              <span class="wheel-icon">{{ item.icon }}</span>
              <span class="wheel-name">{{ item.name }}</span>
            </div>
          </div>
          <div class="wheel-pointer" :style="pointerStyle">▼</div>
        </div>
        
        <!-- 奖项展示 -->
        <div class="wheel-rewards">
          <div class="reward-item" v-for="reward in wheelRewards" :key="reward.level">
            <span class="reward-icon" :style="{ color: reward.color }">{{ reward.icon }}</span>
            <span class="reward-name">{{ reward.name }}</span>
            <span class="reward-rate">{{ reward.rate }}%</span>
          </div>
        </div>
        
        <!-- 抽奖按钮 -->
        <div class="gacha-buttons">
          <button class="gacha-btn once" @click="spinWheel(1)" :disabled="isSpinning">
            🎯 单抽 ({{ onceCost }}元宝)
          </button>
          <button class="gacha-btn ten" @click="spinWheel(10)" :disabled="isSpinning">
            🎰 十连抽 ({{ tenCost }}元宝)
          </button>
        </div>
      </div>
      
      <!-- 列表抽奖 -->
      <div class="list-section" v-if="gachaMode === 'list'">
        <div class="pool-selector">
          <button 
            v-for="pool in gachaPools" 
            :key="pool.id"
            class="pool-btn"
            :class="{ active: selectedPool === pool.id }"
            @click="selectedPool = pool.id"
          >
            {{ pool.icon }} {{ pool.name }}
          </button>
        </div>
        
        <!-- 奖池列表 -->
        <div class="prize-list">
          <div 
            v-for="item in currentPoolItems" 
            :key="item.id"
            class="prize-item"
            :class="item rarity"
          >
            <div class="prize-icon">{{ item.icon }}</div>
            <div class="prize-info">
              <div class="prize-name">{{ item.name }}</div>
              <div class="prize-rarity">{{ item.rarity.toUpperCase() }}</div>
            </div>
            <div class="prize-rate">{{ item.rate }}%</div>
          </div>
        </div>
        
        <!-- 抽奖操作 -->
        <div class="gacha-buttons">
          <button class="gacha-btn once" @click="drawList(1)" :disabled="isDrawing">
            🎯 单抽
          </button>
          <button class="gacha-btn ten" @click="drawList(10)" :disabled="isDrawing">
            🎰 十连抽
          </button>
        </div>
      </div>
      
      <!-- 卡片抽奖 -->
      <div class="card-section" v-if="gachaMode === 'card'">
        <div class="card-stage">
          <div 
            v-for="(card, idx) in cardPool"" 
            :key="card.id"
            class="card-item"
            :class="{ flipped: flippedCards.includes(card.id), revealed: revealedCards.includes(card.id) }"
            @click="flipCard(card)"
          >
            <div class="card-front">❓</div>
            <div class="card-back" :class="card.rarity">
              <span class="card-icon">{{ card.icon }}</span>
              <span class="card-name">{{ card.name }}</span>
            </div>
          </div>
        </div>
        
        <div class="card-info">
          <p>点击卡片揭示奖励，每次抽奖随机翻开 {{ drawCount }} 张卡片</p>
        </div>
        
        <div class="gacha-buttons">
          <button class="gacha-btn once" @click="startCardDraw" :disabled="isDrawing">
            🎯 开始抽卡
          </button>
          <button class="gacha-btn reset" @click="resetCards">
            🔄 重置
          </button>
        </div>
      </div>
      
      <!-- 抽奖记录 -->
      <div class="history-section">
        <h3>📜 抽奖记录</h3>
        <div class="history-list">
          <div 
            v-for="(record, idx) in history" 
            :key="idx"
            class="history-item"
            :class="record.rarity"
          >
            <span class="history-icon">{{ record.icon }}</span>
            <span class="history-name">{{ record.name }}</span>
            <span class="history-time">{{ record.time }}</span>
          </div>
        </div>
      </div>
      
      <!-- 奖励展示弹窗 -->
      <div class="reward-modal" v-if="showReward" @click="showReward = false">
        <div class="reward-content" :class="latestReward.rarity">
          <div class="reward-celebration">
            <span v-for="n in 20" :key="n" class="confetti" :style="getConfettiStyle(n)">⭐</span>
          </div>
          <div class="reward-icon-large">{{ latestReward.icon }}</div>
          <div class="reward-name-large">{{ latestReward.name }}</div>
          <div class="reward-rarity-large">{{ latestReward.rarity.toUpperCase() }}</div>
          <button class="reward-confirm" @click="showReward = false">收下奖励</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'GachaPanel',
  emits: ['close'],
  data() {
    return {
      gachaMode: 'wheel',
      isSpinning: false,
      isDrawing: false,
      selectedPool: 'normal',
      wheelRotation: 0,
      drawCount: 3,
      showReward: false,
      latestReward: {},
      flippedCards: [],
      revealedCards: [],
      onceCost: 100,
      tenCost: 900,
      wheelItems: [
        { id: 1, name: '谢谢参与', icon: '😢', rate: 30 },
        { id: 2, name: '100元宝', icon: '💰', rate: 25 },
        { id: 3, name: '蓝色装备', icon: '🔵', rate: 20 },
        { id: 4, name: '紫色装备', icon: '🟣', rate: 12 },
        { id: 5, name: '橙色装备', icon: '🟠', rate: 8 },
        { id: 6, name: '红色神器', icon: '🔴', rate: 4 },
        { id: 7, name: '限定时装', icon: '👘', rate: 0.8 },
        { id: 8, name: '超级大奖', icon: '👑', rate: 0.2 }
      ],
      wheelRewards: [
        { level: 's', name: '超级大奖', icon: '👑', color: '#ffd700', rate: 0.2 },
        { level: 'a', name: '限定时装', icon: '👘', color: '#ff6b6b', rate: 0.8 },
        { level: 'b', name: '红色神器', icon: '🔴', color: '#e74c3c', rate: 4 },
        { level: 'c', name: '橙色装备', icon: '🟠', color: '#f39c12', rate: 8 }
      ],
      gachaPools: [
        { id: 'normal', name: '普通奖池', icon: '📦' },
        { id: 'advanced', name: '进阶奖池', icon: '💎' },
        { id: 'limited', name: '限定奖池', icon: '🎆' }
      ],
      poolItems: {
        normal: [
          { id: 1, name: '100元宝', icon: '💰', rarity: 'common', rate: 40 },
          { id: 2, name: '500元宝', icon: '💎', rarity: 'rare', rate: 25 },
          { id: 3, name: '蓝色装备', icon: '🔵', rarity: 'common', rate: 20 },
          { id: 4, name: '紫色装备', icon: '🟣', rarity: 'rare', rate: 10 },
          { id: 5, name: '橙色装备', icon: '🟠', rarity: 'epic', rate: 4 },
          { id: 6, name: '红色神器', icon: '🔴', rarity: 'legend', rate: 1 }
        ],
        advanced: [
          { id: 1, name: '1000元宝', icon: '💎', rarity: 'rare', rate: 30 },
          { id: 2, name: '紫色装备', icon: '🟣', rarity: 'rare', rate: 25 },
          { id: 3, name: '橙色装备', icon: '🟠', rarity: 'epic', rate: 20 },
          { id: 4, name: '红色神器', icon: '🔴', rarity: 'legend', rate: 15 },
          { id: 5, name: '限定时装', icon: '👘', rarity: 'mythic', rate: 8 },
          { id: 6, name: '神话装备', icon: '🌟', rarity: 'mythic', rate: 2 }
        ],
        limited: [
          { id: 1, name: '春节红包', icon: '🧧', rarity: 'rare', rate: 25 },
          { id: 2, name: '限定时装', icon: '👘', rarity: 'epic', rate: 20 },
          { id: 3, name: '神话武器', icon: '⚔️', rarity: 'mythic', rate: 15 },
          { id: 4, name: '神级宠物', icon: '🐲', rarity: 'mythic', rate: 10 },
          { id: 5, name: '超级大奖', icon: '👑', rarity: 'legend', rate: 5 },
          { id: 6, name: '全服称号', icon: '🏆', rarity: 'legend', rate: 5 }
        ]
      },
      cardPool: [
        { id: 1, name: '神秘宝箱', icon: '🎁', rarity: 'common' },
        { id: 2, name: '元宝袋', icon: '💰', rarity: 'rare' },
        { id: 3, name: '装备箱', icon: '📦', rarity: 'common' },
        { id: 4, name: '稀有道具', icon: '✨', rarity: 'rare' },
        { id: 5, name: '史诗装备', icon: '💎', rarity: 'epic' },
        { id: 6, name: '传说物品', icon: '🌟', rarity: 'legend' }
      ],
      history: [
        { name: '红色神器', icon: '🔴', rarity: 'legend', time: '刚刚' },
        { name: '橙色装备', icon: '🟠', rarity: 'epic', time: '2分钟前' },
        { name: '紫色装备', icon: '🟣', rarity: 'rare', time: '5分钟前' },
        { name: '100元宝', icon: '💰', rarity: 'common', time: '10分钟前' }
      ]
    };
  },
  computed: {
    currentPoolItems() {
      return this.poolItems[this.selectedPool] || [];
    },
    wheelStyle() {
      return {
        transform: `rotate(${this.wheelRotation}deg)`
      };
    },
    pointerStyle() {
      return {};
    }
  },
  methods: {
    getWheelItemStyle(idx) {
      const angle = (360 / this.wheelItems.length) * idx;
      return {
        transform: `rotate(${angle}deg) translateY(-90px) rotate(${-angle}deg)`
      };
    },
    spinWheel(count) {
      if (this.isSpinning) return;
      this.isSpinning = true;
      
      // 计算中奖结果
      const rand = Math.random() * 100;
      let winIndex = 0;
      let cumulative = 0;
      
      for (let i = 0; i < this.wheelItems.length; i++) {
        cumulative += this.wheelItems[i].rate;
        if (rand <= cumulative) {
          winIndex = i;
          break;
        }
      }
      
      // 计算旋转角度
      const itemAngle = 360 / this.wheelItems.length;
      const targetAngle = 360 * 5 + (360 - winIndex * itemAngle - itemAngle / 2);
      
      this.wheelRotation = targetAngle;
      
      setTimeout(() => {
        this.isSpinning = false;
        this.latestReward = this.wheelItems[winIndex];
        this.showReward = true;
        this.history.unshift({
          ...this.wheelItems[winIndex],
          time: '刚刚'
        });
      }, 3000);
    },
    drawList(count) {
      if (this.isDrawing) return;
      this.isDrawing = true;
      
      setTimeout(() => {
        for (let i = 0; i < count; i++) {
          const rand = Math.random() * 100;
          let cumulative = 0;
          let winItem = this.currentPoolItems[0];
          
          for (const item of this.currentPoolItems) {
            cumulative += item.rate;
            if (rand <= cumulative) {
              winItem = item;
              break;
            }
          }
          
          this.history.unshift({
            ...winItem,
            time: i === 0 ? '刚刚' : `${i * 2}秒前`
          });
          
          if (i === 0) {
            this.latestReward = winItem;
            this.showReward = true;
          }
        }
        this.isDrawing = false;
      }, 500);
    },
    startCardDraw() {
      this.isDrawing = true;
      this.flippedCards = [];
      this.revealedCards = [];
      
      // 随机选择卡片
      const shuffled = [...this.cardPool].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, this.drawCount);
      
      selected.forEach((card, idx) => {
        setTimeout(() => {
          this.flippedCards.push(card.id);
          setTimeout(() => {
            this.revealedCards.push(card.id);
            this.latestReward = card;
            
            if (idx === selected.length - 1) {
              this.showReward = true;
              this.isDrawing = false;
            }
          }, 300);
        }, idx * 500);
      });
    },
    flipCard(card) {
      if (!this.flippedCards.includes(card.id)) {
        this.flippedCards.push(card.id);
        setTimeout(() => {
          this.revealedCards.push(card.id);
        }, 300);
      }
    },
    resetCards() {
      this.flippedCards = [];
      this.revealedCards = [];
      this.isDrawing = false;
    },
    getConfettiStyle(n) {
      const left = Math.random() * 100;
      const delay = Math.random() * 2;
      const duration = 1 + Math.random();
      return {
        left: `${left}%`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`
      };
    }
  }
};
</script>

<style>
.gacha-panel {
  background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  width: 90%;
  max-width: 700px;
  max-height: 85vh;
  overflow: hidden;
  color: #e8e8f0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(90deg, rgba(255, 215, 0, 0.1), transparent);
  border-bottom: 1px solid rgba(255, 215, 0, 0.2);
}

.panel-header h2 {
  margin: 0;
  font-size: 18px;
  color: #ffd700;
}

.panel-content {
  padding: 20px;
  max-height: 70vh;
  overflow-y: auto;
}

.gacha-modes {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.mode-btn {
  flex: 1;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 8px;
  color: #aaa;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.3s ease;
}

.mode-btn:hover {
  background: rgba(255, 215, 0, 0.1);
}

.mode-btn.active {
  background: linear-gradient(135deg, #ffd700, #ffb700);
  color: #1a1a2e;
  border-color: transparent;
  font-weight: bold;
}

/* 转盘样式 */
.wheel-section {
  text-align: center;
}

.wheel-container {
  position: relative;
  width: 280px;
  height: 280px;
  margin: 0 auto 20px;
}

.wheel {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: conic-gradient(
    #ff6b6b 0deg 45deg,
    #feca57 45deg 90deg,
    #48dbfb 90deg 135deg,
    #ff9ff3 135deg 180deg,
    #54a0ff 180deg 225deg,
    #5f27cd 225deg 270deg,
    #00d2d3 270deg 315deg,
    #ff9f43 315deg 360deg
  );
  position: relative;
  transition: transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99);
  box-shadow: 0 0 30px rgba(255, 215, 0, 0.3);
}

.wheel-item {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 80px;
  text-align: center;
  transform-origin: center center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.wheel-icon {
  font-size: 24px;
}

.wheel-name {
  font-size: 10px;
  color: #fff;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

.wheel-pointer {
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 30px;
  color: #ffd700;
  text-shadow: 0 0 10px #ffd700;
  z-index: 10;
}

.wheel-rewards {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.reward-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  font-size: 11px;
}

.reward-icon {
  font-size: 16px;
}

.reward-name {
  color: #aaa;
}

.reward-rate {
  color: #ffd700;
}

/* 列表样式 */
.list-section {
  margin-bottom: 20px;
}

.pool-selector {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.pool-btn {
  flex: 1;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #aaa;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s ease;
}

.pool-btn:hover {
  background: rgba(255, 215, 0, 0.1);
}

.pool-btn.active {
  background: rgba(255, 215, 0, 0.2);
  border-color: #ffd700;
  color: #ffd700;
}

.prize-list {
  max-height: 250px;
  overflow-y: auto;
  margin-bottom: 15px;
}

.prize-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  margin-bottom: 8px;
  border-left: 3px solid #888;
}

.prize-item.common {
  border-left-color: #888;
}

.prize-item.rare {
  border-left-color: #3498db;
}

.prize-item.epic {
  border-left-color: #9b59b6;
}

.prize-item.legend {
  border-left-color: #e74c3c;
}

.prize-item.mythic {
  border-left-color: #ffd700;
}

.prize-icon {
  font-size: 24px;
  width: 40px;
  text-align: center;
}

.prize-info {
  flex: 1;
}

.prize-name {
  font-size: 13px;
  color: #e8e8f0;
}

.prize-rarity {
  font-size: 10px;
  color: #888;
}

.prize-rate {
  font-size: 12px;
  color: #ffd700;
}

/* 卡片样式 */
.card-section {
  margin-bottom: 20px;
}

.card-stage {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 15px;
}

.card-item {
  aspect-ratio: 0.7;
  perspective: 1000px;
  cursor: pointer;
}

.card-front, .card-back {
  width: 100%;
  height: 100%;
  position: absolute;
  backface-visibility: hidden;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: transform 0.6s;
}

.card-front {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-size: 32px;
}

.card-back {
  transform: rotateY(180deg);
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid #888;
}

.card-back.common { border-color: #888; }
.card-back.rare { border-color: #3498db; }
.card-back.epic { border-color: #9b59b6; }
.card-back.legend { border-color: #e74c3c; }

.card-item.flipped .card-front {
  transform: rotateY(180deg);
}

.card-item.revealed .card-back {
  transform: rotateY(0deg);
}

.card-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.card-name {
  font-size: 11px;
  color: #aaa;
}

.card-info {
  text-align: center;
  margin-bottom: 15px;
}

.card-info p {
  font-size: 12px;
  color: #888;
  margin: 0;
}

/* 按钮样式 */
.gacha-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.gacha-btn {
  padding: 14px 28px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.gacha-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.gacha-btn.once {
  background: linear-gradient(135deg, #ffd700, #ffb700);
  color: #1a1a2e;
}

.gacha-btn.ten {
  background: linear-gradient(135deg, #ff6b6b, #ee5a24);
  color: #fff;
}

.gacha-btn.reset {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
}

.gacha-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

/* 历史记录 */
.history-section {
  border-top: 1px solid rgba(255, 215, 0, 0.1);
  padding-top: 15px;
}

.history-section h3 {
  font-size: 14px;
  color: #ffd700;
  margin-bottom: 12px;
}

.history-list {
  max-height: 150px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  margin-bottom: 6px;
}

.history-item.common { border-left: 2px solid #888; }
.history-item.rare { border-left: 2px solid #3498db; }
.history-item.epic { border-left: 2px solid #9b59b6; }
.history-item.legend { border-left: 2px solid #e74c3c; }

.history-icon {
  font-size: 18px;
}

.history-name {
  flex: 1;
  font-size: 12px;
  color: #e8e8f0;
}

.history-time {
  font-size: 10px;
  color: #666;
}

/* 奖励弹窗 */
.reward-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.reward-content {
  background: linear-gradient(145deg, #1a1a2e, #16213e);
  border-radius: 20px;
  padding: 40px;
  text-align: center;
  position: relative;
  border: 3px solid #ffd700;
  animation: rewardPop 0.5s ease;
}

@keyframes rewardPop {
  0% { transform: scale(0); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.reward-content.common { border-color: #888; }
.reward-content.rare { border-color: #3498db; }
.reward-content.epic { border-color: #9b59b6; }
.reward-content.legend { border-color: #e74c3c; }
.reward-content.mythic { border-color: #ffd700; }

.reward-celebration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
}

.confetti {
  position: absolute;
  top: -20px;
  animation: confettiFall 2s ease-out forwards;
}

@keyframes confettiFall {
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(400px) rotate(720deg); opacity: 0; }
}

.reward-icon-large {
  font-size: 80px;
  margin-bottom: 15px;
}

.reward-name-large {
  font-size: 24px;
  font-weight: bold;
  color: #ffd700;
  margin-bottom: 10px;
}

.reward-rarity-large {
  font-size: 16px;
  color: #aaa;
  margin-bottom: 20px;
}

.reward-confirm {
  padding: 12px 40px;
  background: linear-gradient(135deg, #ffd700, #ffb700);
  border: none;
  border-radius: 25px;
  color: #1a1a2e;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.reward-confirm:hover {
  transform: scale(1.05);
}
</style>
