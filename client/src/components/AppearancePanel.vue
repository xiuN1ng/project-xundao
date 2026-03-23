<template>
  <div class="appearance-panel">
    <div class="panel-header">
      <h2>✨ 外观系统</h2>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>
    
    <div class="panel-content">
      <!-- 左侧分类导航 -->
      <div class="category-nav">
        <div 
          class="nav-item"
          :class="{ active: activeCategory === 'fashion' }"
          @click="activeCategory = 'fashion'"
        >
          <span class="nav-icon">👘</span>
          <span class="nav-label">时装</span>
        </div>
        <div 
          class="nav-item"
          :class="{ active: activeCategory === 'wings' }"
          @click="activeCategory = 'wings'"
        >
          <span class="nav-icon">🪽</span>
          <span class="nav-label">翅膀</span>
        </div>
        <div 
          class="nav-item"
          :class="{ active: activeCategory === 'effects' }"
          @click="activeCategory = 'effects'"
        >
          <span class="nav-icon">✨</span>
          <span class="nav-label">特效</span>
        </div>
      </div>
      
      <!-- 中间预览区域 -->
      <div class="preview-area">
        <div class="character-preview">
          <!-- AI生成角色立绘背景 -->
          <img src="../assets/character-portrait-new.png" alt="角色立绘" class="character-portrait-bg" />
          <!-- 时装展示 -->
          <div class="fashion-preview" v-if="activeCategory === 'fashion'">
            <div class="character-model">
              <span class="character-icon">{{ currentFashion?.icon || '👤' }}</span>
              <div class="fashion-name" v-if="currentFashion">
                {{ currentFashion.name }}
              </div>
            </div>
            <!-- 时装特效层 -->
            <div class="fashion-effect" v-if="currentFashion && currentFashion.effect">
              <span class="effect-particle">{{ currentFashion.effect }}</span>
            </div>
          </div>
          
          <!-- 翅膀展示 -->
          <div class="wings-preview" v-if="activeCategory === 'wings'">
            <div class="wings-display" :class="'wings-level-' + (currentWings?.level || 0)">
              <div class="wing wing-left" :style="{ opacity: currentWings ? 1 : 0.3 }">
                <span class="wing-icon">{{ currentWings?.icon || '🪽' }}</span>
              </div>
              <div class="wing wing-right" :style="{ opacity: currentWings ? 1 : 0.3 }">
                <span class="wing-icon">{{ currentWings?.icon || '🪽' }}</span>
              </div>
            </div>
            <div class="character-model">
              <span class="character-icon">🧑</span>
            </div>
            <div class="wings-name" v-if="currentWings">
              {{ currentWings.name }}
            </div>
          </div>
          
          <!-- 特效展示 -->
          <div class="effects-preview" v-if="activeCategory === 'effects'">
            <div class="character-model">
              <span class="character-icon">🧑</span>
            </div>
            <div class="effect-display" v-if="activeEffect">
              <span class="effect-particle">{{ activeEffect.particle }}</span>
              <div class="effect-name">{{ activeEffect.name }}</div>
            </div>
          </div>
          
          <!-- 属性加成显示 -->
          <div class="preview-stats">
            <div class="stat-row" v-if="totalBonus.atk > 0">
              <span class="stat-icon">⚔️</span>
              <span class="stat-label">攻击</span>
              <span class="stat-value">+{{ totalBonus.atk }}</span>
            </div>
            <div class="stat-row" v-if="totalBonus.def > 0">
              <span class="stat-icon">🛡️</span>
              <span class="stat-label">防御</span>
              <span class="stat-value">+{{ totalBonus.def }}</span>
            </div>
            <div class="stat-row" v-if="totalBonus.hp > 0">
              <span class="stat-icon">❤️</span>
              <span class="stat-label">生命</span>
              <span class="stat-value">+{{ totalBonus.hp }}</span>
            </div>
            <div class="stat-row" v-if="totalBonus.speed > 0">
              <span class="stat-icon">⚡</span>
              <span class="stat-label">速度</span>
              <span class="stat-value">+{{ totalBonus.speed }}</span>
            </div>
            <div class="stat-row" v-if="totalBonus.charm > 0">
              <span class="stat-icon">💖</span>
              <span class="stat-label">魅力</span>
              <span class="stat-value">+{{ totalBonus.charm }}</span>
            </div>
          </div>
        </div>
        
        <!-- 试穿/穿戴按钮 -->
        <div class="preview-actions">
          <button 
            class="preview-btn"
            @click="previewAppearance"
            :disabled="!selectedItem"
          >
            👁️ 预览
          </button>
          <button 
            class="equip-btn"
            @click="equipAppearance"
            :disabled="!selectedItem || isEquipped"
          >
            {{ isEquipped ? '✅ 已装备' : '✨ 穿戴' }}
          </button>
          <button 
            class="unequip-btn"
            @click="unequipAppearance"
            :disabled="!isEquipped"
          >
            ❌ 卸下
          </button>
        </div>
      </div>
      
      <!-- 右侧物品列表 -->
      <div class="item-list">
        <div class="list-header">
          <span>{{ categoryTitle }}</span>
          <span class="item-count">{{ ownedCount }}/{{ categoryItems.length }}</span>
        </div>
        
        <div class="items-grid">
          <div 
            v-for="item in categoryItems" 
            :key="item.id"
            class="item-card"
            :class="{ 
              owned: item.owned, 
              equipped: item.equipped,
              selected: selectedItem && selectedItem.id === item.id
            }"
            @click="item.owned && selectItem(item)"
          >
            <div class="item-icon" :style="{ background: getRarityColor(item.rarity) }">
              {{ item.icon }}
            </div>
            <div class="item-name">{{ item.name }}</div>
            <div class="item-rarity">{{ getRarityName(item.rarity) }}</div>
            <div class="item-bonus" v-if="item.owned">
              <span v-if="item.bonus_atk">⚔️{{ item.bonus_atk }}</span>
              <span v-if="item.bonus_def">🛡️{{ item.bonus_def }}</span>
              <span v-if="item.bonus_hp">❤️{{ item.bonus_hp }}</span>
            </div>
            <div class="equipped-badge" v-if="item.equipped">已装备</div>
            <div class="locked-overlay" v-if="!item.owned">
              <span>🔒</span>
            </div>
          </div>
          
          <div v-if="categoryItems.length === 0" class="empty-tip">
            暂无{{ categoryTitle }}
          </div>
        </div>
        
        <!-- 获取途径 -->
        <div class="obtain-tip" v-if="selectedItem && !selectedItem.owned">
          <span class="tip-icon">💡</span>
          <span>获取途径: {{ selectedItem.obtain }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AppearancePanel',
  emits: ['close'],
  data() {
    return {
      activeCategory: 'fashion',
      selectedItem: null,
      // 时装数据
      fashionList: [
        { id: 'fashion_1', type: 'fashion', name: '新手布衣', icon: '👕', rarity: 'common', owned: true, equipped: false, bonus_atk: 0, bonus_def: 5, bonus_hp: 20, obtain: '系统赠送', effect: '✨' },
        { id: 'fashion_2', type: 'fashion', name: '侠客服', icon: '🥋', rarity: 'rare', owned: true, equipped: false, bonus_atk: 10, bonus_def: 15, bonus_hp: 50, obtain: '商城购买', effect: '💫' },
        { id: 'fashion_3', type: 'fashion', name: '玄冰袍', icon: '🧊', rarity: 'rare', owned: true, equipped: false, bonus_atk: 15, bonus_def: 20, bonus_hp: 80, obtain: '活动奖励', effect: '❄️' },
        { id: 'fashion_4', type: 'fashion', name: '烈焰甲', icon: '🔥', rarity: 'epic', owned: true, equipped: false, bonus_atk: 25, bonus_def: 25, bonus_hp: 120, obtain: '副本掉落', effect: '🔥' },
        { id: 'fashion_5', type: 'fashion', name: '紫霞仙衣', icon: '👗', rarity: 'epic', owned: true, equipped: false, bonus_atk: 30, bonus_def: 30, bonus_hp: 150, obtain: '仙侣赠送', effect: '🌸' },
        { id: 'fashion_6', type: 'fashion', name: '天帝战袍', icon: '👘', rarity: 'legendary', owned: false, equipped: false, bonus_atk: 50, bonus_def: 50, bonus_hp: 300, obtain: '限时活动', effect: '⭐' },
        { id: 'fashion_7', type: 'fashion', name: '混沌神甲', icon: '🛡️', rarity: 'legendary', owned: false, equipped: false, bonus_atk: 80, bonus_def: 80, bonus_hp: 500, obtain: '巅峰对决', effect: '🌟' },
      ],
      // 翅膀数据
      wingsList: [
        { id: 'wings_1', type: 'wings', name: '无翅膀', icon: '🪽', rarity: 'common', owned: true, equipped: false, level: 0, bonus_atk: 0, bonus_def: 0, bonus_hp: 0, bonus_speed: 0, obtain: '默认' },
        { id: 'wings_2', type: 'wings', name: '轻盈羽翼', icon: '🪶', rarity: 'rare', owned: true, equipped: false, level: 1, bonus_atk: 5, bonus_def: 5, bonus_hp: 30, bonus_speed: 10, obtain: '商城购买', effect: '💨' },
        { id: 'wings_3', type: 'wings', name: '烈焰之翼', icon: '🔥', rarity: 'epic', owned: true, equipped: false, level: 2, bonus_atk: 15, bonus_def: 10, bonus_hp: 80, bonus_speed: 20, obtain: '副本掉落', effect: '🔥' },
        { id: 'wings_4', type: 'wings', name: '冰晶之翼', icon: '❄️', rarity: 'epic', owned: true, equipped: false, level: 2, bonus_atk: 10, bonus_def: 20, bonus_hp: 100, bonus_speed: 15, obtain: '活动奖励', effect: '🧊' },
        { id: 'wings_5', type: 'wings', name: '神圣光翼', icon: '✨', rarity: 'legendary', owned: false, equipped: false, level: 3, bonus_atk: 30, bonus_def: 30, bonus_hp: 200, bonus_speed: 40, obtain: 'VIP奖励', effect: '🌟' },
        { id: 'wings_6', type: 'wings', name: '混沌魔翼', icon: '🖤', rarity: 'legendary', owned: false, equipped: false, level: 3, bonus_atk: 40, bonus_def: 25, bonus_hp: 250, bonus_speed: 35, obtain: '巅峰对决', effect: '⚫' },
      ],
      // 特效数据
      effectsList: [
        { id: 'effect_1', type: 'effects', name: '无特效', icon: '✨', rarity: 'common', owned: true, equipped: false, particle: '', bonus_atk: 0, bonus_def: 0, bonus_hp: 0, bonus_charm: 0, obtain: '默认' },
        { id: 'effect_2', type: 'effects', name: '灵气环绕', icon: '🌬️', rarity: 'rare', owned: true, equipped: false, particle: '💫', bonus_atk: 5, bonus_def: 5, bonus_hp: 20, bonus_charm: 10, obtain: '修炼突破', particle: '🌀' },
        { id: 'effect_3', type: 'effects', name: '金光护体', icon: '🟡', rarity: 'rare', owned: true, equipped: false, particle: '✨', bonus_atk: 10, bonus_def: 10, bonus_hp: 40, bonus_charm: 15, obtain: '境界提升', particle: '🌟' },
        { id: 'effect_4', type: 'effects', name: '花瓣飘落', icon: '🌸', rarity: 'epic', owned: true, equipped: false, particle: '🌸', bonus_atk: 15, bonus_def: 15, bonus_hp: 60, bonus_charm: 30, obtain: '仙侣互动', particle: '💮' },
        { id: 'effect_5', type: 'effects', name: '雷霆万钧', icon: '⚡', rarity: 'epic', owned: false, equipped: false, particle: '⚡', bonus_atk: 25, bonus_def: 20, bonus_hp: 100, bonus_charm: 20, obtain: '雷劫考验', particle: '🌩️' },
        { id: 'effect_6', type: 'effects', name: '龙魂附体', icon: '🐲', rarity: 'legendary', owned: false, equipped: false, particle: '🐉', bonus_atk: 50, bonus_def: 40, bonus_hp: 200, bonus_charm: 50, obtain: '真龙试炼', particle: '🌈' },
      ],
      // 当前穿戴的外观
      equippedFashion: null,
      equippedWings: null,
      equippedEffect: null,
      // 预览状态
      isPreview: false,
      previewItem: null
    };
  },
  computed: {
    categoryItems() {
      switch (this.activeCategory) {
        case 'fashion': return this.fashionList;
        case 'wings': return this.wingsList;
        case 'effects': return this.effectsList;
        default: return [];
      }
    },
    categoryTitle() {
      switch (this.activeCategory) {
        case 'fashion': return '时装';
        case 'wings': return '翅膀';
        case 'effects': return '特效';
        default: return '';
      }
    },
    ownedCount() {
      return this.categoryItems.filter(item => item.owned).length;
    },
    currentFashion() {
      return this.previewItem || this.equippedFashion || this.fashionList.find(f => f.equipped);
    },
    currentWings() {
      return this.previewItem || this.equippedWings || this.wingsList.find(w => w.equipped);
    },
    activeEffect() {
      const effect = this.previewItem || this.equippedEffect || this.effectsList.find(e => e.equipped);
      return effect && effect.particle ? effect : null;
    },
    isEquipped() {
      if (!this.selectedItem) return false;
      return this.selectedItem.equipped;
    },
    totalBonus() {
      let atk = 0, def = 0, hp = 0, speed = 0, charm = 0;
      
      // 累加所有已装备的加成
      if (this.equippedFashion) {
        atk += this.equippedFashion.bonus_atk || 0;
        def += this.equippedFashion.bonus_def || 0;
        hp += this.equippedFashion.bonus_hp || 0;
      }
      if (this.equippedWings) {
        atk += this.equippedWings.bonus_atk || 0;
        def += this.equippedWings.bonus_def || 0;
        hp += this.equippedWings.bonus_hp || 0;
        speed += this.equippedWings.bonus_speed || 0;
      }
      if (this.equippedEffect) {
        atk += this.equippedEffect.bonus_atk || 0;
        def += this.equippedEffect.bonus_def || 0;
        hp += this.equippedEffect.bonus_hp || 0;
        charm += this.equippedEffect.bonus_charm || 0;
      }
      
      return { atk, def, hp, speed, charm };
    }
  },
  mounted() {
    this.loadAppearance();
  },
  methods: {
    loadAppearance() {
      const player = window.gameData?.player || {};
      
      // 从游戏数据加载已装备的外观
      this.equippedFashion = this.fashionList.find(f => f.equipped) || null;
      this.equippedWings = this.wingsList.find(w => w.equipped) || this.wingsList[0];
      this.equippedEffect = this.effectsList.find(e => e.equipped) || this.effectsList[0];
      
      // 设置默认选中第一个已拥有的物品
      const ownedItems = this.categoryItems.filter(item => item.owned);
      if (ownedItems.length > 0) {
        this.selectedItem = ownedItems[0];
      }
    },
    selectItem(item) {
      this.selectedItem = item;
    },
    previewAppearance() {
      if (!this.selectedItem) return;
      
      this.isPreview = true;
      this.previewItem = this.selectedItem;
      this.showMessage('预览中...');
      
      // 5秒后自动取消预览
      setTimeout(() => {
        this.cancelPreview();
      }, 5000);
    },
    cancelPreview() {
      this.isPreview = false;
      this.previewItem = null;
    },
    equipAppearance() {
      if (!this.selectedItem || this.selectedItem.equipped) return;
      
      // 卸下同类型已装备的物品
      const category = this.selectedItem.type;
      if (category === 'fashion') {
        if (this.equippedFashion) {
          this.equippedFashion.equipped = false;
        }
        this.equippedFashion = this.selectedItem;
      } else if (category === 'wings') {
        if (this.equippedWings) {
          this.equippedWings.equipped = false;
        }
        this.equippedWings = this.selectedItem;
      } else if (category === 'effects') {
        if (this.equippedEffect) {
          this.equippedEffect.equipped = false;
        }
        this.equippedEffect = this.selectedItem;
      }
      
      // 更新装备状态
      this.selectedItem.equipped = true;
      
      // 更新游戏数据
      this.updatePlayerBonus();
      
      this.showMessage(`已穿戴 ${this.selectedItem.name}！`);
    },
    unequipAppearance() {
      if (!this.selectedItem || !this.selectedItem.equipped) return;
      
      this.selectedItem.equipped = false;
      
      const category = this.selectedItem.type;
      if (category === 'fashion') {
        this.equippedFashion = null;
      } else if (category === 'wings') {
        this.equippedWings = this.wingsList[0]; // 重置为无翅膀
      } else if (category === 'effects') {
        this.equippedEffect = this.effectsList[0]; // 重置为无特效
      }
      
      this.updatePlayerBonus();
      this.showMessage(`已卸下 ${this.selectedItem.name}`);
    },
    updatePlayerBonus() {
      if (window.gameData?.player) {
        const player = window.gameData.player;
        player.bonus_atk = this.totalBonus.atk;
        player.bonus_def = this.totalBonus.def;
        player.bonus_hp = this.totalBonus.hp;
        player.bonus_speed = this.totalBonus.speed;
        player.bonus_charm = this.totalBonus.charm;
      }
    },
    getRarityColor(rarity) {
      const colors = {
        common: 'linear-gradient(135deg, #718096, #4a5568)',
        rare: 'linear-gradient(135deg, #4299e1, #3182ce)',
        epic: 'linear-gradient(135deg, #9f7aea, #805ad5)',
        legendary: 'linear-gradient(135deg, #ed8936, #dd6b20)'
      };
      return colors[rarity] || colors.common;
    },
    getRarityName(rarity) {
      const names = {
        common: '普通',
        rare: '稀有',
        epic: '史诗',
        legendary: '传说'
      };
      return names[rarity] || '普通';
    },
    showMessage(msg) {
      if (window.showMessage) {
        window.showMessage(msg);
      } else {
        alert(msg);
      }
    }
  }
};
</script>

<style scoped>
.appearance-panel {
  width: 900px;
  max-height: 650px;
  background: linear-gradient(145deg, #1a1a2e, #16213e);
  border-radius: 16px;
  border: 2px solid #4a5568;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(90deg, #2d3748, #4a5568);
  border-bottom: 2px solid #4a5568;
}

.panel-header h2 {
  margin: 0;
  color: #f6e05e;
  font-size: 1.4em;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.close-btn {
  background: #e53e3e;
  color: white;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s;
}

.close-btn:hover {
  background: #c53030;
  transform: scale(1.1);
}

.panel-content {
  display: flex;
  height: 560px;
  overflow: hidden;
}

/* 左侧分类导航 */
.category-nav {
  width: 80px;
  background: rgba(0, 0, 0, 0.3);
  padding: 16px 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.nav-item.active {
  background: rgba(246, 224, 94, 0.15);
  border-color: #f6e05e;
}

.nav-icon {
  font-size: 28px;
  margin-bottom: 4px;
}

.nav-label {
  color: #a0aec0;
  font-size: 0.8em;
}

.nav-item.active .nav-label {
  color: #f6e05e;
}

/* 中间预览区域 */
.preview-area {
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-left: 1px solid #4a5568;
  border-right: 1px solid #4a5568;
}

.character-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  min-height: 300px;
}

/* AI生成角色立绘背景 */
.character-portrait-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.35;
  border-radius: 12px;
  z-index: 1;
  pointer-events: none;
}

.character-model {
  position: relative;
  z-index: 10;
}

.character-icon {
  font-size: 80px;
  display: block;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5));
}

.fashion-name, .wings-name {
  text-align: center;
  color: #f7fafc;
  font-size: 1.1em;
  margin-top: 8px;
  font-weight: bold;
}

/* 时装特效层 */
.fashion-effect {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 60px;
  animation: float 2s ease-in-out infinite;
  z-index: 5;
}

@keyframes float {
  0%, 100% { transform: translate(-50%, -60%); }
  50% { transform: translate(-50%, -40%); }
}

/* 翅膀展示 */
.wings-display {
  position: absolute;
  top: 20%;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 60px;
  z-index: 5;
}

.wing {
  font-size: 50px;
  transition: all 0.5s ease;
}

.wings-level-1 .wing {
  animation: flap 1s ease-in-out infinite;
}

.wings-level-2 .wing {
  animation: flap 0.7s ease-in-out infinite;
}

.wings-level-3 .wing {
  animation: flap 0.5s ease-in-out infinite;
  filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.5));
}

@keyframes flap {
  0%, 100% { transform: translateY(0) rotate(-5deg); }
  50% { transform: translateY(-10px) rotate(5deg); }
}

.wing-left {
  transform: scaleX(-1);
}

/* 特效展示 */
.effect-display {
  position: absolute;
  top: 30%;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  z-index: 5;
}

.effect-particle {
  font-size: 60px;
  display: block;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.2); opacity: 1; }
}

.effect-name {
  color: #f7fafc;
  margin-top: 8px;
  font-size: 1em;
}

/* 预览属性 */
.preview-stats {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 20px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  max-width: 300px;
}

.stat-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9em;
}

.stat-icon {
  font-size: 1.1em;
}

.stat-label {
  color: #a0aec0;
}

.stat-value {
  color: #48bb78;
  font-weight: bold;
}

/* 预览按钮 */
.preview-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  width: 100%;
}

.preview-btn, .equip-btn, .unequip-btn {
  flex: 1;
  padding: 12px 16px;
  border: none;
  border-radius: 10px;
  font-size: 0.95em;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.preview-btn {
  background: linear-gradient(135deg, #4299e1, #3182ce);
  color: white;
}

.preview-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(66, 153, 225, 0.4);
}

.equip-btn {
  background: linear-gradient(135deg, #48bb78, #38a169);
  color: white;
}

.equip-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(72, 187, 120, 0.4);
}

.equip-btn:disabled {
  background: #4a5568;
  cursor: not-allowed;
}

.unequip-btn {
  background: linear-gradient(135deg, #e53e3e, #c53030);
  color: white;
}

.unequip-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(229, 62, 62, 0.4);
}

.unequip-btn:disabled {
  background: #4a5568;
  cursor: not-allowed;
}

/* 右侧物品列表 */
.item-list {
  width: 320px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
  overflow-y: auto;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #4a5568;
}

.list-header span {
  color: #f7fafc;
  font-size: 1.1em;
  font-weight: bold;
}

.item-count {
  color: #a0aec0;
  font-size: 0.9em;
  font-weight: normal;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.item-card {
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.item-card:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.item-card.selected {
  border-color: #f6e05e;
  background: rgba(246, 224, 94, 0.1);
}

.item-card.equipped {
  border-color: #48bb78;
}

.item-card.owned {
  opacity: 1;
}

.item-card:not(.owned) {
  opacity: 0.6;
}

.item-icon {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin: 0 auto 8px;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.item-name {
  color: #f7fafc;
  font-size: 0.9em;
  font-weight: bold;
  margin-bottom: 4px;
}

.item-rarity {
  color: #9f7aea;
  font-size: 0.75em;
  margin-bottom: 4px;
}

.item-bonus {
  display: flex;
  justify-content: center;
  gap: 4px;
  flex-wrap: wrap;
}

.item-bonus span {
  font-size: 0.7em;
  color: #48bb78;
}

.equipped-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  background: #48bb78;
  color: white;
  font-size: 0.65em;
  padding: 2px 6px;
  border-radius: 4px;
}

.locked-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.obtain-tip {
  margin-top: 16px;
  padding: 12px;
  background: rgba(246, 224, 94, 0.1);
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #f6e05e;
  font-size: 0.85em;
}

.tip-icon {
  font-size: 1.2em;
}

.empty-tip {
  grid-column: span 2;
  color: #718096;
  text-align: center;
  padding: 40px 20px;
}
</style>
