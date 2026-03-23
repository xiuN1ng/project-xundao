<template>
  <div class="mount-panel">
    <div class="panel-header">
      <h2>🦄 坐骑系统</h2>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>
    
    <div class="panel-content">
      <!-- 坐骑列表 -->
      <div class="mount-list">
        <div 
          v-for="mount in mountList" 
          :key="mount.id"
          class="mount-card"
          :class="{ active: selectedMount && selectedMount.id === mount.id, equipped: mount.equipped }"
          @click="selectMount(mount)"
        >
          <div class="mount-avatar" :style="{ background: getMountColor(mount rarity) }">
            {{ getMountIcon(mount.type) }}
          </div>
          <div class="mount-info">
            <div class="mount-name">{{ mount.name || getDefaultName(mount.type) }}</div>
            <div class="mount-level">等级 {{ mount.level || 1 }}</div>
            <div class="mount-rarity">{{ getRarityName(mount.rarity) }}</div>
            <div class="mount-equipped" v-if="mount.equipped">✅ 已装备</div>
          </div>
        </div>
        
        <div v-if="mountList.length === 0" class="empty-tip">
          还没有坐骑，去捕捉灵兽吧！
        </div>
      </div>
      
      <!-- 坐骑详情 -->
      <div class="mount-detail" v-if="selectedMount">
        <div class="detail-header">
          <div class="mount-avatar large" :style="{ background: getMountColor(selectedMount.rarity) }">
            {{ getMountIcon(selectedMount.type) }}
          </div>
          <div class="detail-info">
            <h3>{{ selectedMount.name || getDefaultName(selectedMount.type) }}</h3>
            <div class="mount-stats">
              <span>等级: {{ selectedMount.level || 1 }}</span>
              <span>品质: {{ getRarityName(selectedMount.rarity) }}</span>
            </div>
            <div class="mount-attributes" v-if="selectedMount.bonus_atk || selectedMount.bonus_def || selectedMount.bonus_hp">
              <span v-if="selectedMount.bonus_atk">攻击+{{ selectedMount.bonus_atk }}</span>
              <span v-if="selectedMount.bonus_def">防御+{{ selectedMount.bonus_def }}</span>
              <span v-if="selectedMount.bonus_hp">生命+{{ selectedMount.bonus_hp }}</span>
            </div>
          </div>
        </div>
        
        <!-- 进化路线 -->
        <div class="evolution-path" v-if="evolutionPath.length > 0">
          <h4>进化路线</h4>
          <div class="path-nodes">
            <div 
              v-for="(evo, index) in evolutionPath" 
              :key="index"
              class="path-node"
              :class="{ current: evo.id === selectedMount.id, unlocked: evo.unlocked }"
            >
              <div class="node-icon">{{ evo.icon }}</div>
              <div class="node-name">{{ evo.name }}</div>
            </div>
          </div>
        </div>
        
        <!-- 操作按钮 -->
        <div class="action-buttons">
          <button 
            class="equip-btn" 
            @click="equipMount"
            :disabled="selectedMount.equipped"
          >
            {{ selectedMount.equipped ? '✅ 已装备' : '📦 装备坐骑' }}
          </button>
          <button 
            class="ride-btn"
            @click="rideMount"
            :disabled="!selectedMount.equipped || isRiding"
          >
            {{ isRiding ? '🦄 骑行中' : '🏇 骑行' }}
          </button>
          <button 
            class="evolve-btn" 
            @click="evolveMount"
            :disabled="!canEvolve"
          >
            ⬆️ 进化
          </button>
        </div>
        
        <!-- 骑行状态 -->
        <div class="riding-status" v-if="isRiding">
          <div class="status-icon">🏃</div>
          <div class="status-info">
            <span class="status-label">当前骑行:</span>
            <span class="status-value">{{ selectedMount.name || getDefaultName(selectedMount.type) }}</span>
          </div>
          <div class="speed-bonus" v-if="selectedMount.speed_bonus">
            ⚡ 速度+{{ selectedMount.speed_bonus }}
          </div>
          <button class="dismount-btn" @click="dismount">下骑</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MountPanel',
  data() {
    return {
      mountList: [],
      selectedMount: null,
      evolutionPath: [],
      isRiding: false,
      ridingMountId: null
    };
  },
  computed: {
    canEvolve() {
      if (!this.selectedMount) return false;
      return this.selectedMount.evolution && !this.selectedMount.maxEvolution;
    }
  },
  mounted() {
    this.loadMounts();
  },
  methods: {
    loadMounts() {
      const player = window.gameData?.player || {};
      let mounts = player.mounts || [];
      
      // 如果没有坐骑，添加示例坐骑
      if (mounts.length === 0) {
        mounts = [
          { id: 'mount_1', type: 'horse', name: '赤兔马', level: 5, rarity: 'rare', bonus_atk: 10, bonus_def: 15, bonus_hp: 100, speed_bonus: 30, equipped: false },
          { id: 'mount_2', type: 'dragon', name: '青龙', level: 1, rarity: 'epic', bonus_atk: 20, bonus_def: 20, bonus_hp: 200, speed_bonus: 50, equipped: false },
          { id: 'mount_3', type: 'unicorn', name: '独角兽', level: 1, rarity: 'common', bonus_atk: 5, bonus_def: 10, bonus_hp: 50, speed_bonus: 20, equipped: false }
        ];
      }
      
      this.mountList = mounts;
      
      // 加载骑行状态
      this.isRiding = player.isRiding || false;
      this.ridingMountId = player.ridingMountId || null;
      
      if (mounts.length > 0) {
        // 优先选中正在骑行的坐骑
        if (this.ridingMountId) {
          const ridingMount = mounts.find(m => m.id === this.ridingMountId);
          if (ridingMount) {
            this.selectMount(ridingMount);
            return;
          }
        }
        this.selectMount(mounts[0]);
      }
    },
    selectMount(mount) {
      this.selectedMount = mount;
      this.loadEvolutionPath(mount);
    },
    loadEvolutionPath(mount) {
      // 模拟进化路线
      this.evolutionPath = [
        { id: mount.id, name: mount.name || this.getDefaultName(mount.type), icon: this.getMountIcon(mount.type), unlocked: true },
        { id: mount.id + '_evo1', name: '初级进化', icon: '🌟', unlocked: mount.level >= 10 },
        { id: mount.id + '_evo2', name: '中级进化', icon: '⭐', unlocked: mount.level >= 30 },
        { id: mount.id + '_evo3', name: '高级进化', icon: '💫', unlocked: mount.level >= 50 }
      ];
    },
    equipMount() {
      if (!this.selectedMount || this.selectedMount.equipped) return;
      
      // 装备坐骑
      this.mountList.forEach(m => m.equipped = false);
      this.selectedMount.equipped = true;
      
      // 更新玩家属性
      if (window.gameData?.player) {
        const mount = this.selectedMount;
        window.gameData.player.bonus_atk = (window.gameData.player.bonus_atk || 0) + (mount.bonus_atk || 0);
        window.gameData.player.bonus_def = (window.gameData.player.bonus_def || 0) + (mount.bonus_def || 0);
        window.gameData.player.bonus_hp = (window.gameData.player.bonus_hp || 0) + (mount.bonus_hp || 0);
      }
      
      this.showMessage('坐骑装备成功！');
    },
    evolveMount() {
      if (!this.canEvolve) return;
      
      const cost = this.selectedMount.level * 100;
      const player = window.gameData?.player || {};
      
      if ((player.currency || 0) < cost) {
        this.showMessage('灵石不足！');
        return;
      }
      
      player.currency -= cost;
      this.selectedMount.level++;
      this.selectedMount.bonus_atk = (this.selectedMount.bonus_atk || 0) + 5;
      this.selectedMount.bonus_def = (this.selectedMount.bonus_def || 0) + 5;
      this.selectedMount.bonus_hp = (this.selectedMount.bonus_hp || 0) + 50;
      
      this.loadEvolutionPath(this.selectedMount);
      this.showMessage('坐骑进化成功！');
    },
    rideMount() {
      if (!this.selectedMount || !this.selectedMount.equipped || this.isRiding) return;
      
      this.isRiding = true;
      this.ridingMountId = this.selectedMount.id;
      
      // 计算骑行速度加成
      const speedBonus = this.selectedMount.speed_bonus || (this.selectedMount.level * 2);
      
      // 更新玩家速度属性
      if (window.gameData?.player) {
        window.gameData.player.bonus_speed = (window.gameData.player.bonus_speed || 0) + speedBonus;
        window.gameData.player.isRiding = true;
        window.gameData.player.ridingMountId = this.ridingMountId;
      }
      
      this.showMessage(`骑乘 ${this.selectedMount.name || this.getDefaultName(this.selectedMount.type)} 出发！`);
    },
    dismount() {
      if (!this.isRiding) return;
      
      const speedBonus = this.selectedMount?.speed_bonus || (this.selectedMount?.level * 2) || 0;
      
      this.isRiding = false;
      
      // 移除骑行速度加成
      if (window.gameData?.player) {
        window.gameData.player.bonus_speed = Math.max(0, (window.gameData.player.bonus_speed || 0) - speedBonus);
        window.gameData.player.isRiding = false;
        window.gameData.player.ridingMountId = null;
      }
      
      this.showMessage('已下骑');
    },
    getMountIcon(type) {
      const icons = {
        horse: '🐎',
        dragon: '🐉',
        phoenix: '🦅',
        tiger: '🐯',
        lion: '🦁',
        unicorn: '🦄',
        default: '🐴'
      };
      return icons[type] || icons.default;
    },
    getMountColor(rarity) {
      const colors = {
        common: 'linear-gradient(135deg, #8B4513, #A0522D)',
        rare: 'linear-gradient(135deg, #4169E1, #6495ED)',
        epic: 'linear-gradient(135deg, #9932CC, #BA55D3)',
        legendary: 'linear-gradient(135deg, #FFD700, #FFA500)'
      };
      return colors[rarity] || colors.common;
    },
    getDefaultName(type) {
      const names = {
        horse: '赤兔马',
        dragon: '青龙',
        phoenix: '朱雀',
        tiger: '白虎',
        lion: '麒麟',
        unicorn: '独角兽'
      };
      return names[type] || '未知坐骑';
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
.mount-panel {
  width: 800px;
  max-height: 600px;
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
  height: 480px;
  overflow: hidden;
}

.mount-list {
  width: 280px;
  overflow-y: auto;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
}

.mount-card {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.mount-card:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateX(4px);
}

.mount-card.active {
  border-color: #f6e05e;
  background: rgba(246, 224, 94, 0.1);
}

.mount-card.equipped {
  border-color: #48bb78;
}

.mount-avatar {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  margin-right: 12px;
}

.mount-avatar.large {
  width: 100px;
  height: 100px;
  font-size: 48px;
}

.mount-info {
  flex: 1;
}

.mount-name {
  color: #f7fafc;
  font-weight: bold;
  font-size: 1.1em;
}

.mount-level {
  color: #a0aec0;
  font-size: 0.9em;
}

.mount-rarity {
  color: #9f7aea;
  font-size: 0.85em;
}

.mount-equipped {
  color: #48bb78;
  font-size: 0.85em;
}

.mount-detail {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.detail-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #4a5568;
}

.detail-info {
  margin-left: 20px;
}

.detail-info h3 {
  color: #f7fafc;
  margin: 0 0 8px 0;
  font-size: 1.5em;
}

.mount-stats {
  color: #a0aec0;
  font-size: 0.95em;
}

.mount-stats span {
  margin-right: 16px;
}

.mount-attributes {
  margin-top: 8px;
}

.mount-attributes span {
  display: inline-block;
  margin-right: 12px;
  padding: 4px 10px;
  background: rgba(246, 224, 94, 0.2);
  color: #f6e05e;
  border-radius: 6px;
  font-size: 0.9em;
}

.evolution-path {
  margin-bottom: 20px;
}

.evolution-path h4 {
  color: #f7fafc;
  margin: 0 0 12px 0;
}

.path-nodes {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.path-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  opacity: 0.4;
}

.path-node.unlocked {
  opacity: 1;
}

.path-node.current {
  opacity: 1;
  transform: scale(1.2);
}

.node-icon {
  font-size: 32px;
  margin-bottom: 4px;
}

.node-name {
  color: #a0aec0;
  font-size: 0.85em;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.equip-btn, .evolve-btn, .ride-btn {
  flex: 1;
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  font-size: 1em;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
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

.evolve-btn {
  background: linear-gradient(135deg, #9f7aea, #805ad5);
  color: white;
}

.evolve-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(159, 122, 234, 0.4);
}

.evolve-btn:disabled {
  background: #4a5568;
  cursor: not-allowed;
}

.ride-btn {
  flex: 1;
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  font-size: 1em;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  background: linear-gradient(135deg, #ed8936, #dd6b20);
  color: white;
}

.ride-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(237, 137, 54, 0.4);
}

.ride-btn:disabled {
  background: #4a5568;
  cursor: not-allowed;
}

/* 骑行状态 */
.riding-status {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(237, 137, 54, 0.2), rgba(221, 107, 32, 0.1));
  border: 2px solid #ed8936;
  border-radius: 12px;
  animation: riding-pulse 2s ease-in-out infinite;
}

@keyframes riding-pulse {
  0%, 100% { box-shadow: 0 0 10px rgba(237, 137, 54, 0.3); }
  50% { box-shadow: 0 0 20px rgba(237, 137, 54, 0.6); }
}

.status-icon {
  font-size: 32px;
  animation: run 0.5s ease-in-out infinite;
}

@keyframes run {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(5px); }
}

.status-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.status-label {
  color: #a0aec0;
  font-size: 0.85em;
}

.status-value {
  color: #f7fafc;
  font-weight: bold;
}

.speed-bonus {
  color: #48bb78;
  font-size: 0.9em;
  font-weight: bold;
}

.dismount-btn {
  padding: 8px 16px;
  background: #e53e3e;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9em;
  transition: all 0.3s;
}

.dismount-btn:hover {
  background: #c53030;
  transform: scale(1.05);
}

.empty-tip {
  color: #718096;
  text-align: center;
  padding: 40px 20px;
}
</style>
