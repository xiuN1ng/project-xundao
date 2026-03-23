<template>
  <div class="appearance-preview-panel">
    <div class="panel-header">
      <h2>👘 外观试穿与预览</h2>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>
    
    <div class="panel-content">
      <!-- 角色预览区 -->
      <div class="preview-section">
        <div class="character-preview">
          <div class="character-model">
            <div class="character-body" :class="previewData.bodyType">
              <div class="head" :style="headStyle">
                <div class="face" :style="faceStyle"></div>
                <div class="hair" :style="hairStyle"></div>
                <div class="eyes" :style="eyesStyle"></div>
              </div>
              <div class="torso" :style="torsoStyle">
                <div class="clothes" :style="clothesStyle"></div>
              </div>
              <div class="legs" :style="legsStyle">
                <div class="pants" :style="pantsStyle"></div>
              </div>
              <div class="weapon" :style="weaponStyle">{{ previewData.weapon ? weaponIcon : '' }}</div>
              <div class="wings" :style="wingsStyle">{{ previewData.wings ? '🪽' : '' }}</div>
              <div class="aura" :style="auraStyle">{{ auraIcon }}</div>
            </div>
          </div>
          <div class="preview-controls">
            <button @click="rotateCharacter('left')">↺</button>
            <button @click="rotateCharacter('right')">↻</button>
            <button @click="resetView">重置</button>
          </div>
        </div>
      </div>
      
      <!-- 外观分类 -->
      <div class="tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          class="tab-btn"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          {{ tab.icon }} {{ tab.name }}
        </button>
      </div>
      
      <!-- 时装选择 -->
      <div class="items-grid" v-if="activeTab === 'costume'">
        <div 
          v-for="item in costumes" 
          :key="item.id"
          class="item-card"
          :class="{ selected: selectedItems.costume === item.id, owned: item.owned }"
          @click="selectItem('costume', item)"
        >
          <div class="item-icon" :style="{ background: item.preview }">{{ item.icon }}</div>
          <div class="item-name">{{ item.name }}</div>
          <div class="item-status" :class="{ owned: item.owned }">{{ item.owned ? '已拥有' : item.price }}</div>
        </div>
      </div>
      
      <!-- 发型选择 -->
      <div class="items-grid" v-if="activeTab === 'hair'">
        <div 
          v-for="item in hairstyles" 
          :key="item.id"
          class="item-card"
          :class="{ selected: selectedItems.hair === item.id }"
          @click="selectItem('hair', item)"
        >
          <div class="item-icon" :style="{ background: item.preview }">{{ item.icon }}</div>
          <div class="item-name">{{ item.name }}</div>
          <div class="item-status">{{ item.price }}</div>
        </div>
      </div>
      
      <!-- 武器外观 -->
      <div class="items-grid" v-if="activeTab === 'weapon'">
        <div 
          v-for="item in weapons" 
          :key="item.id"
          class="item-card"
          :class="{ selected: selectedItems.weapon === item.id }"
          @click="selectItem('weapon', item)"
        >
          <div class="item-icon" :style="{ background: item.preview }">{{ item.icon }}</div>
          <div class="item-name">{{ item.name }}</div>
          <div class="item-status">{{ item.price }}</div>
        </div>
      </div>
      
      <!-- 翅膀外观 -->
      <div class="items-grid" v-if="activeTab === 'wings'">
        <div 
          v-for="item in wings" 
          :key="item.id"
          class="item-card"
          :class="{ selected: selectedItems.wings === item.id }"
          @click="selectItem('wings', item)"
        >
          <div class="item-icon" :style="{ background: item.preview }">{{ item.icon }}</div>
          <div class="item-name">{{ item.name }}</div>
          <div class="item-status">{{ item.price }}</div>
        </div>
      </div>
      
      <!-- 光效外观 -->
      <div class="items-grid" v-if="activeTab === 'aura'">
        <div 
          v-for="item in auras" 
          :key="item.id"
          class="item-card"
          :class="{ selected: selectedItems.aura === item.id }"
          @click="selectItem('aura', item)"
        >
          <div class="item-icon" :style="{ background: item.preview }">{{ item.icon }}</div>
          <div class="item-name">{{ item.name }}</div>
          <div class="item-status">{{ item.price }}</div>
        </div>
      </div>
      
      <!-- 动作按钮 -->
      <div class="action-buttons">
        <button class="action-btn apply" @click="applyAppearance">✨ 应用外观</button>
        <button class="action-btn save" @click="savePreset">💾 保存预设</button>
        <button class="action-btn random" @click="randomAppearance">🎲 随机外观</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AppearancePreviewPanel',
  emits: ['close'],
  data() {
    return {
      activeTab: 'costume',
      rotation: 0,
      selectedItems: {
        costume: 'default',
        hair: 'default',
        weapon: null,
        wings: null,
        aura: null
      },
      previewData: {
        bodyType: 'male',
        costumeColor: '#3498db',
        hairColor: '#2c3e50',
        skinColor: '#f5d0b0'
      },
      tabs: [
        { id: 'costume', name: '时装', icon: '👘' },
        { id: 'hair', name: '发型', icon: '💇' },
        { id: 'weapon', name: '武器', icon: '⚔️' },
        { id: 'wings', name: '翅膀', icon: '🪽' },
        { id: 'aura', name: '光效', icon: '✨' }
      ],
      costumes: [
        { id: 'default', name: '初始服装', icon: '👕', price: '免费', owned: true, preview: 'linear-gradient(135deg, #3498db, #2980b9)' },
        { id: 'fire', name: '烈焰时装', icon: '🔥', price: '288元宝', owned: false, preview: 'linear-gradient(135deg, #e74c3c, #c0392b)', color: '#e74c3c' },
        { id: 'ice', name: '寒冰时装', icon: '❄️', price: '288元宝', owned: false, preview: 'linear-gradient(135deg, #74b9ff, #0984e3)', color: '#74b9ff' },
        { id: 'thunder', name: '雷鸣时装', icon: '⚡', price: '388元宝', owned: false, preview: 'linear-gradient(135deg, #f9ca24, #f0932b)', color: '#f9ca24' },
        { id: 'jade', name: '玉清时装', icon: '💚', price: '588元宝', owned: false, preview: 'linear-gradient(135deg, #6ab04c, #badc58)', color: '#6ab04c' },
        { id: 'golden', name: '金鳞时装', icon: '👑', price: '888元宝', owned: false, preview: 'linear-gradient(135deg, #f8c291, #e58e26)', color: '#f8c291' }
      ],
      hairstyles: [
        { id: 'default', name: '默认发型', icon: '👤', price: '免费', preview: 'linear-gradient(135deg, #2c3e50, #34495e)' },
        { id: 'long', name: '长发飘逸', icon: '💇‍♀️', price: '128元宝', preview: 'linear-gradient(135deg, #8e44ad, #9b59b6)', color: '#8e44ad' },
        { id: 'spiky', name: '刺发', icon: '🦔', price: '88元宝', preview: 'linear-gradient(135deg, #e67e22, #d35400)', color: '#e67e22' },
        { id: 'braid', name: '辫子', icon: '🎀', price: '158元宝', preview: 'linear-gradient(135deg, #e91e63, #ff5722)', color: '#e91e63' }
      ],
      weapons: [
        { id: 'sword', name: '利剑', icon: '🗡️', price: '免费', preview: 'linear-gradient(135deg, #bdc3c7, #95a5a6)', iconChar: '⚔️' },
        { id: 'blade', name: '大刀', icon: '🔪', price: '188元宝', preview: 'linear-gradient(135deg, #7f8c8d, #2c3e50)', iconChar: '🔪' },
        { id: 'staff', name: '法杖', icon: '🪄', price: '288元宝', preview: 'linear-gradient(135deg, #9b59b6, #8e44ad)', iconChar: '🪄' },
        { id: 'fan', name: '羽扇', icon: '🪶', price: '168元宝', preview: 'linear-gradient(135deg, #1abc9c, #16a085)', iconChar: '🪶' }
      ],
      wings: [
        { id: 'none', name: '无翅膀', icon: '🚫', price: '免费', preview: 'linear-gradient(135deg, #95a5a6, #7f8c8d)' },
        { id: 'feather', name: '羽翼', icon: '🪶', price: '388元宝', preview: 'linear-gradient(135deg, #fff, #ecf0f1)', iconChar: '🪶' },
        { id: 'dragon', name: '龙翼', icon: '🐉', price: '688元宝', preview: 'linear-gradient(135deg, #e74c3c, #c0392b)', iconChar: '🐉' },
        { id: 'angel', name: '天使', icon: '👼', price: '888元宝', preview: 'linear-gradient(135deg, #f1c40f, #f39c12)', iconChar: '👼' }
      ],
      auras: [
        { id: 'none', name: '无光效', icon: '🚫', price: '免费', preview: 'linear-gradient(135deg, #95a5a6, #7f8c8d)', iconChar: '' },
        { id: 'flame', name: '火焰光环', icon: '🔥', price: '288元宝', preview: 'linear-gradient(135deg, #e74c3c, #c0392b)', iconChar: '🔥' },
        { id: 'ice', name: '冰晶光环', icon: '❄️', price: '288元宝', preview: 'linear-gradient(135deg, #74b9ff, #0984e3)', iconChar: '❄️' },
        { id: 'thunder', name: '雷电网', icon: '⚡', price: '388元宝', preview: 'linear-gradient(135deg, #f9ca24, #f0932b)', iconChar: '⚡' },
        { id: 'golden', name: '金光罩', icon: '✨', price: '588元宝', preview: 'linear-gradient(135deg, #f8c291, #e58e26)', iconChar: '✨' }
      ]
    };
  },
  computed: {
    headStyle() {
      const hair = this.hairstyles.find(h => h.id === this.selectedItems.hair);
      return { 
        backgroundColor: this.previewData.skinColor,
        boxShadow: hair && hair.color ? `0 -5px 15px ${hair.color}40` : 'none'
      };
    },
    hairStyle() {
      const hair = this.hairstyles.find(h => h.id === this.selectedItems.hair);
      return hair && hair.color ? { background: hair.color } : { display: 'none' };
    },
    faceStyle() {
      return {};
    },
    eyesStyle() {
      return {};
    },
    torsoStyle() {
      const costume = this.costumes.find(c => c.id === this.selectedItems.costume);
      return { 
        backgroundColor: costume && costume.color ? costume.color : this.previewData.costumeColor 
      };
    },
    clothesStyle() {
      return {};
    },
    legsStyle() {
      return {};
    },
    pantsStyle() {
      const costume = this.costumes.find(c => c.id === this.selectedItems.costume);
      return costume && costume.color ? { backgroundColor: this.adjustColor(costume.color, -20) } : {};
    },
    weaponStyle() {
      return this.selectedItems.weapon ? { opacity: 1 } : { opacity: 0 };
    },
    wingsStyle() {
      return this.selectedItems.wings && this.selectedItems.wings !== 'none' 
        ? { opacity: 1 } : { opacity: 0 };
    },
    auraStyle() {
      return this.selectedItems.aura && this.selectedItems.aura !== 'none'
        ? { opacity: 1 } : { opacity: 0 };
    },
    weaponIcon() {
      const weapon = this.weapons.find(w => w.id === this.selectedItems.weapon);
      return weapon ? weapon.iconChar : '';
    },
    auraIcon() {
      const aura = this.auras.find(a => a.id === this.selectedItems.aura);
      return aura ? aura.iconChar : '';
    }
  },
  methods: {
    selectItem(category, item) {
      this.selectedItems[category] = item.id;
    },
    rotateCharacter(direction) {
      this.rotation += direction === 'left' ? -45 : 45;
    },
    resetView() {
      this.rotation = 0;
    },
    applyAppearance() {
      console.log('应用外观:', this.selectedItems);
      this.$emit('close');
    },
    savePreset() {
      console.log('保存预设:', this.selectedItems);
    },
    randomAppearance() {
      const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
      this.selectedItems.costume = randomItem(this.costumes).id;
      this.selectedItems.hair = randomItem(this.hairstyles).id;
      this.selectedItems.weapon = randomItem(this.weapons).id;
      this.selectedItems.wings = randomItem(this.wings).id;
      this.selectedItems.aura = randomItem(this.auras).id;
    },
    adjustColor(color, amount) {
      // 简单的颜色调整
      return color;
    }
  }
};
</script>

<style>
.appearance-preview-panel {
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
  background: linear-gradient(90deg, rgba(233, 69, 96, 0.1), transparent);
  border-bottom: 1px solid rgba(233, 69, 96, 0.2);
}

.panel-header h2 {
  margin: 0;
  font-size: 18px;
  color: #e94560;
}

.panel-content {
  padding: 20px;
  max-height: 70vh;
  overflow-y: auto;
}

.preview-section {
  margin-bottom: 20px;
}

.character-preview {
  background: linear-gradient(180deg, #0f0f23 0%, #1a1a2e 100%);
  border-radius: 12px;
  padding: 20px;
  position: relative;
  border: 1px solid rgba(233, 69, 96, 0.2);
}

.character-model {
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.character-body {
  position: relative;
  width: 80px;
  height: 160px;
  transition: transform 0.5s ease;
  transform-style: preserve-3d;
}

.character-body .head {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
}

.character-body .hair {
  width: 44px;
  height: 20px;
  border-radius: 20px 20px 0 0;
  position: absolute;
  top: -2px;
  left: 50%;
  transform: translateX(-50%);
}

.character-body .face {
  width: 30px;
  height: 20px;
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
}

.character-body .eyes {
  width: 20px;
  height: 6px;
  position: absolute;
  top: 15px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  justify-content: space-between;
}

.character-body .torso {
  width: 50px;
  height: 60px;
  position: absolute;
  top: 40px;
  left: 50%;
  transform: translateX(-50%);
  border-radius: 8px 8px 4px 4px;
}

.character-body .legs {
  width: 40px;
  height: 60px;
  position: absolute;
  top: 100px;
  left: 50%;
  transform: translateX(-50%);
}

.character-body .pants {
  width: 18px;
  height: 60px;
  position: absolute;
  border-radius: 4px;
  background: #2c3e50;
}

.character-body .pants:first-child {
  left: 0;
}

.character-body .pants:last-child {
  right: 0;
}

.character-body .weapon {
  position: absolute;
  right: -30px;
  top: 50px;
  font-size: 32px;
  transition: all 0.3s ease;
}

.character-body .wings {
  position: absolute;
  left: -40px;
  top: 30px;
  font-size: 40px;
  transition: all 0.3s ease;
}

.character-body .aura {
  position: absolute;
  left: 50%;
  top: 20px;
  transform: translateX(-50%);
  font-size: 60px;
  filter: blur(2px);
  animation: auraPulse 2s ease-in-out infinite;
}

@keyframes auraPulse {
  0%, 100% { opacity: 0.6; transform: translateX(-50%) scale(1); }
  50% { opacity: 1; transform: translateX(-50%) scale(1.1); }
}

.preview-controls {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 15px;
}

.preview-controls button {
  width: 40px;
  height: 32px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(233, 69, 96, 0.3);
  border-radius: 6px;
  color: #e94560;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s ease;
}

.preview-controls button:hover {
  background: rgba(233, 69, 96, 0.2);
}

.tabs {
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
  background: rgba(233, 69, 96, 0.1);
}

.tab-btn.active {
  background: linear-gradient(135deg, #e94560, #c73e54);
  color: #fff;
  border-color: transparent;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}

.item-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.item-card:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.item-card.selected {
  border-color: #e94560;
  background: rgba(233, 69, 96, 0.15);
}

.item-card.owned .item-status {
  color: #00ff88;
}

.item-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  margin: 0 auto 6px;
}

.item-name {
  font-size: 11px;
  color: #e8e8f0;
  margin-bottom: 4px;
}

.item-status {
  font-size: 10px;
  color: #888;
}

.action-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.action-btn {
  flex: 1;
  min-width: 100px;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-btn.apply {
  background: linear-gradient(135deg, #e94560, #c73e54);
  color: #fff;
}

.action-btn.save {
  background: linear-gradient(135deg, #6c5ce7, #5b4cdb);
  color: #fff;
}

.action-btn.random {
  background: linear-gradient(135deg, #00b894, #00a383);
  color: #fff;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}
</style>
