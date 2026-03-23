<template>
  <div class="title-panel">
    <div class="panel-header">
      <h2>👑 成就称号</h2>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>
    
    <div class="panel-content">
      <!-- 当前装备的称号 -->
      <div class="current-title" v-if="equippedTitle">
        <div class="current-label">当前装备</div>
        <div class="current-display">
          <span class="title-icon">{{ equippedTitle.icon }}</span>
          <span class="title-name">{{ equippedTitle.name }}</span>
        </div>
        <div class="current-bonus">
          <span v-if="equippedTitle.bonus.atk">攻击+{{ equippedTitle.bonus.atk }}</span>
          <span v-if="equippedTitle.bonus.def">防御+{{ equippedTitle.bonus.def }}</span>
          <span v-if="equippedTitle.bonus.hp">生命+{{ equippedTitle.bonus.hp }}</span>
        </div>
        <button class="unequip-btn" @click="unequipTitle">卸下称号</button>
      </div>
      
      <!-- 成就进度 -->
      <div class="achievement-progress">
        <div class="progress-header">
          <span>累计灵气</span>
          <span class="progress-value">{{ formatNumber(totalExp) }}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <div class="next-title" v-if="nextTitle">
          距离「{{ nextTitle.name }}」还需 {{ formatNumber(nextTitle.requirement - totalExp) }} 灵气
        </div>
        <div class="next-title" v-else>
          🌟 已达最高称号！
        </div>
      </div>
      
      <!-- 称号列表 -->
      <div class="title-list">
        <div 
          v-for="title in titles" 
          :key="title.id"
          class="title-card"
          :class="{ 
            owned: title.owned, 
            equipped: title.equipped,
            locked: !title.owned
          }"
          @click="title.owned && selectTitle(title)"
        >
          <div class="title-icon-area">
            <span class="title-icon">{{ title.icon }}</span>
            <span v-if="title.equipped" class="equipped-badge">已装备</span>
          </div>
          
          <div class="title-info">
            <div class="title-name">{{ title.name }}</div>
            <div class="title-requirement">
              <span v-if="title.owned">✅ 已解锁</span>
              <span v-else>🔒 需要 {{ formatNumber(title.requirement) }} 灵气</span>
            </div>
            <div class="title-bonus" v-if="title.owned">
              <span v-if="title.bonus.atk">⚔️ 攻击+{{ title.bonus.atk }}</span>
              <span v-if="title.bonus.def">🛡️ 防御+{{ title.bonus.def }}</span>
              <span v-if="title.bonus.hp">❤️ 生命+{{ title.bonus.hp }}</span>
            </div>
          </div>
          
          <button 
            v-if="title.owned && !title.equipped"
            class="equip-btn"
            @click.stop="equipTitle(title)"
          >
            装备
          </button>
        </div>
      </div>
      
      <div class="title-tips">
        💡 称号根据累计灵气解锁，装备称号可获得属性加成。境界越高，可解锁的称号越强力！
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TitlePanel',
  emits: ['close'],
  data() {
    return {
      titles: [],
      equippedTitle: null,
      totalExp: 0
    };
  },
  computed: {
    progressPercent() {
      if (this.titles.length === 0) return 0;
      const ownedTitles = this.titles.filter(t => t.owned);
      if (ownedTitles.length === 0) return 0;
      return (ownedTitles.length / this.titles.length) * 100;
    },
    nextTitle() {
      return this.titles.find(t => !t.owned);
    }
  },
  async mounted() {
    await this.loadTitles();
  },
  methods: {
    async loadTitles() {
      try {
        const playerId = window.gamePlayerId || 1;
        
        // 模拟数据
        const playerData = JSON.parse(localStorage.getItem('playerData') || '{}');
        this.totalExp = playerData.total_exp || 0;
        const equippedId = playerData.equipped_title || null;
        
        const titleData = [
          { id: 'newbie', name: '初入仙途', requirement: 0, bonus: { atk: 5 }, icon: '🌱' },
          { id: 'cultivator', name: '修士', requirement: 1000, bonus: { atk: 15 }, icon: '🌿' },
          { id: 'qi_refiner', name: '练气期', requirement: 5000, bonus: { atk: 30 }, icon: '🔥' },
          { id: 'foundation_builder', name: '筑基期', requirement: 20000, bonus: { atk: 60, hp: 200 }, icon: '💎' },
          { id: 'core_former', name: '金丹期', requirement: 50000, bonus: { atk: 120, hp: 500 }, icon: '🌟' },
          { id: 'nascent_soul', name: '元婴期', requirement: 150000, bonus: { atk: 250, hp: 1000 }, icon: '👼' },
          { id: 'immortal', name: '化神期', requirement: 500000, bonus: { atk: 500, hp: 2000 }, icon: '🧘' },
          { id: 'legend', name: '炼虚期', requirement: 1500000, bonus: { atk: 1000, hp: 5000 }, icon: '🏆' },
          { id: 'demigod', name: '大乘期', requirement: 5000000, bonus: { atk: 2000, hp: 10000 }, icon: '👑' },
          { id: 'god', name: '仙人', requirement: 20000000, bonus: { atk: 5000, hp: 25000 }, icon: '✨' }
        ];
        
        this.titles = titleData.map(title => ({
          ...title,
          owned: this.totalExp >= title.requirement,
          equipped: equippedId === title.id
        }));
        
        if (equippedId) {
          this.equippedTitle = this.titles.find(t => t.id === equippedId);
        }
      } catch (e) {
        console.error('加载称号失败:', e);
      }
    },
    selectTitle(title) {
      if (!title.owned) return;
      this.equipTitle(title);
    },
    async equipTitle(title) {
      if (!title.owned) return;
      
      try {
        const playerId = window.gamePlayerId || 1;
        const response = await fetch('/api/title/equip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, titleId: title.id })
        });
        
        const result = await response.json();
        
        if (result.success) {
          alert('✅ ' + result.message);
          await this.loadTitles();
        } else {
          alert('❌ ' + result.message);
        }
      } catch (e) {
        // 模拟装备
        const playerData = JSON.parse(localStorage.getItem('playerData') || '{}');
        playerData.equipped_title = title.id;
        localStorage.setItem('playerData', JSON.stringify(playerData));
        
        alert('✅ 装备称号「' + title.name + '」成功');
        await this.loadTitles();
      }
    },
    async unequipTitle() {
      try {
        const playerId = window.gamePlayerId || 1;
        const response = await fetch('/api/title/unequip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId })
        });
        
        const result = await response.json();
        
        if (result.success) {
          alert('✅ ' + result.message);
          await this.loadTitles();
        }
      } catch (e) {
        const playerData = JSON.parse(localStorage.getItem('playerData') || '{}');
        playerData.equipped_title = null;
        localStorage.setItem('playerData', JSON.stringify(playerData));
        
        alert('✅ 卸下称号成功');
        await this.loadTitles();
      }
    },
    formatNumber(num) {
      if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万';
      }
      return num.toString();
    }
  }
};
</script>

<style>
.title-panel {
  background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
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

.close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 20px;
  cursor: pointer;
}

.panel-content {
  padding: 16px;
  max-height: 60vh;
  overflow-y: auto;
}

.current-title {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.05));
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  text-align: center;
}

.current-label {
  font-size: 12px;
  color: #888;
  margin-bottom: 8px;
}

.current-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 8px;
}

.current-display .title-icon {
  font-size: 32px;
}

.current-display .title-name {
  font-size: 20px;
  color: #ffd700;
  font-weight: bold;
}

.current-bonus {
  font-size: 12px;
  color: #aaa;
  margin-bottom: 12px;
}

.current-bonus span {
  margin: 0 8px;
}

.unequip-btn {
  padding: 6px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: #aaa;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.unequip-btn:hover {
  background: rgba(255, 68, 68, 0.2);
  border-color: rgba(255, 68, 68, 0.3);
  color: #ff4444;
}

.achievement-progress {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #aaa;
  margin-bottom: 8px;
}

.progress-value {
  color: #ffd700;
}

.progress-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ffd700, #ff8c00);
  border-radius: 4px;
  transition: width 0.5s;
}

.next-title {
  font-size: 11px;
  color: #666;
  text-align: center;
}

.title-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.title-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.3s;
}

.title-card:hover:not(.locked) {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 215, 0, 0.3);
}

.title-card.owned {
  border-color: rgba(0, 255, 136, 0.2);
}

.title-card.equipped {
  background: rgba(255, 215, 0, 0.1);
  border-color: rgba(255, 215, 0, 0.4);
}

.title-card.locked {
  opacity: 0.6;
  cursor: not-allowed;
}

.title-icon-area {
  position: relative;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.title-icon-area .title-icon {
  font-size: 24px;
}

.equipped-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: #ffd700;
  color: #000;
  font-size: 8px;
  padding: 2px 4px;
  border-radius: 4px;
}

.title-info {
  flex: 1;
}

.title-name {
  font-size: 14px;
  color: #fff;
  margin-bottom: 4px;
}

.title-requirement {
  font-size: 11px;
  color: #888;
  margin-bottom: 4px;
}

.title-bonus {
  font-size: 10px;
  color: #00ff88;
}

.title-bonus span {
  margin-right: 8px;
}

.equip-btn {
  padding: 6px 12px;
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  border: none;
  border-radius: 4px;
  color: #000;
  font-size: 11px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.equip-btn:hover {
  transform: translateY(-1px);
}

.title-tips {
  font-size: 11px;
  color: #666;
  text-align: center;
  margin-top: 16px;
}
</style>
