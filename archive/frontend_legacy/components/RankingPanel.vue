<template>
  <div class="ranking-panel">
    <div class="ranking-header">
      <div class="ranking-title">📊 排行榜</div>
    </div>
    
    <!-- 排行榜切换标签 -->
    <div class="ranking-tabs">
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
    
    <!-- 排行榜内容 -->
    <div class="ranking-content">
      <!-- 玩家自己的排名 -->
      <div class="my-ranking" v-if="myRank">
        <div class="my-rank-label">我的排名</div>
        <div class="my-rank-info">
          <span class="rank-number">#{{ myRank.rank }}</span>
          <span class="rank-value">{{ myRank.value.toLocaleString() }} {{ myRank.unit }}</span>
        </div>
      </div>
      
      <!-- 排行榜列表 -->
      <div class="ranking-list">
        <div 
          v-for="(player, index) in currentRanking" 
          :key="player.id"
          class="ranking-item"
          :class="{ 
            'top-1': index === 0, 
            'top-2': index === 1, 
            'top-3': index === 2,
            'highlight': player.id === currentPlayerId 
          }"
        >
          <div class="rank-position">
            <span v-if="index < 3" class="medal">{{ medals[index] }}</span>
            <span v-else class="position-num">{{ index + 1 }}</span>
          </div>
          <div class="player-avatar">
            <img v-if="player.avatar" :src="player.avatar" :alt="player.name">
            <span v-else class="avatar-placeholder">{{ player.name.charAt(0) }}</span>
          </div>
          <div class="player-info">
            <div class="player-name">{{ player.name }}</div>
            <div class="player-level">{{ player.level }}转{{ player.phase }}</div>
          </div>
          <div class="player-value">
            <span class="value-num">{{ player.value.toLocaleString() }}</span>
            <span class="value-unit">{{ currentUnit }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 刷新按钮 -->
    <div class="ranking-footer">
      <button class="refresh-btn" @click="refreshRanking" :disabled="refreshing">
        <span v-if="refreshing">🔄 刷新中...</span>
        <span v-else>🔄 刷新排行榜</span>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'RankingPanel',
  data() {
    // 尝试从 localStorage 获取玩家ID
    let playerId = '1';
    try {
      const savedData = localStorage.getItem('xundao_player');
      if (savedData) {
        const playerData = JSON.parse(savedData);
        playerId = playerData.id || '1';
      }
    } catch (e) {
      console.warn('无法获取玩家ID，使用默认值');
    }
    
    return {
      activeTab: 'power',
      refreshing: false,
      currentPlayerId: playerId,
      tabs: [
        { id: 'power', name: '战力榜', icon: '⚔️', unit: '战力', api: 'power' },
        { id: 'level', name: '等级榜', icon: '🧘', unit: '境界', api: 'level' },
        { id: 'wealth', name: '灵石榜', icon: '💰', unit: '灵石', api: 'wealth' }
      ],
      medals: ['🥇', '🥈', '🥉'],
      rankings: {
        combat: [
          { id: 'player_002', name: '剑仙李逍遥', level: 8, phase: '大乘', value: 2586470, avatar: null },
          { id: 'player_003', name: '丹帝叶凡', level: 8, phase: '大乘', value: 2341560, avatar: null },
          { id: 'player_004', name: '魔君陈北玄', level: 7, phase: '合体', value: 1987560, avatar: null },
          { id: 'player_005', name: '神王辰东', level: 7, phase: '合体', value: 1754320, avatar: null },
          { id: 'player_006', name: '荒天帝', level: 7, phase: '合体', value: 1654320, avatar: null },
          { id: 'player_007', name: '斗帝萧炎', level: 6, phase: '炼虚', value: 1456780, avatar: null },
          { id: 'player_008', name: '龙傲天', level: 6, phase: '炼虚', value: 1234560, avatar: null },
          { id: 'player_009', name: '叶天帝', level: 5, phase: '化神', value: 987650, avatar: null },
          { id: 'player_010', name: '秦时明月', level: 5, phase: '化神', value: 876540, avatar: null },
          { id: 'player_001', name: '我', level: 4, phase: '元婴', value: 654320, avatar: null }
        ],
        wealth: [
          { id: 'player_011', name: '富甲天下', level: 8, phase: '大乘', value: 15864230, avatar: null },
          { id: 'player_012', name: '灵石大亨', level: 7, phase: '合体', value: 9876540, avatar: null },
          { id: 'player_013', name: '商会会长', level: 7, phase: '合体', value: 7654320, avatar: null },
          { id: 'player_014', name: '炼丹宗师', level: 6, phase: '炼虚', value: 5432100, avatar: null },
          { id: 'player_015', name: '炼器大师', level: 6, phase: '炼虚', value: 4321000, avatar: null },
          { id: 'player_016', name: '符箓仙人', level: 5, phase: '化神', value: 3210000, avatar: null },
          { id: 'player_017', name: '阵法宗师', level: 5, phase: '化神', value: 2100000, avatar: null },
          { id: 'player_018', name: '灵兽商贩', level: 4, phase: '元婴', value: 1500000, avatar: null },
          { id: 'player_019', name: '药材商人', level: 4, phase: '元婴', value: 1000000, avatar: null },
          { id: 'player_001', name: '我', level: 4, phase: '元婴', value: 568000, avatar: null }
        ],
        level: [
          { id: 'player_020', name: '飞升者001', level: 9, phase: '真仙', value: 1, avatar: null },
          { id: 'player_021', name: '大能者', level: 8, phase: '大乘', value: 2, avatar: null },
          { id: 'player_022', name: '绝世强者', level: 8, phase: '大乘', value: 3, avatar: null },
          { id: 'player_023', name: '顶尖高手', level: 7, phase: '合体', value: 4, avatar: null },
          { id: 'player_024', name: '宗门长老', level: 7, phase: '合体', value: 5, avatar: null },
          { id: 'player_025', name: '宗门护法', level: 6, phase: '炼虚', value: 6, avatar: null },
          { id: 'player_026', name: '核心弟子', level: 6, phase: '炼虚', value: 7, avatar: null },
          { id: 'player_027', name: '内门弟子', level: 5, phase: '化神', value: 8, avatar: null },
          { id: 'player_028', name: '外门弟子', level: 4, phase: '元婴', value: 9, avatar: null },
          { id: 'player_001', name: '我', level: 4, phase: '元婴', value: 10, avatar: null }
        ],
        pvp: [
          { id: 'player_029', name: '斗战胜佛', level: 8, phase: '大乘', value: '王者', avatar: null },
          { id: 'player_030', name: '至尊王者', level: 8, phase: '大乘', value: '王者', avatar: null },
          { id: 'player_031', name: '钻石选手', level: 7, phase: '合体', value: '钻石', avatar: null },
          { id: 'player_032', name: '钻石强者', level: 7, phase: '合体', value: '钻石', avatar: null },
          { id: 'player_033', name: '铂金侠客', level: 6, phase: '炼虚', value: '铂金', avatar: null },
          { id: 'player_034', name: '铂金修士', level: 6, phase: '炼虚', value: '铂金', avatar: null },
          { id: 'player_035', name: '黄金斗士', level: 5, phase: '化神', value: '黄金', avatar: null },
          { id: 'player_036', name: '白银战士', level: 5, phase: '化神', value: '白银', avatar: null },
          { id: 'player_037', name: '青铜修士', level: 4, phase: '元婴', value: '青铜', avatar: null },
          { id: 'player_001', name: '我', level: 4, phase: '元婴', value: '青铜', avatar: null }
        ]
      },
      myRank: null
    };
  },
  computed: {
    currentRanking() {
      return this.rankings[this.activeTab] || [];
    },
    currentUnit() {
      const tab = this.tabs.find(t => t.id === this.activeTab);
      return tab ? tab.unit : '';
    }
  },
  watch: {
    activeTab: {
      immediate: false,
      handler() {
        this.loadRankingData(this.activeTab);
      }
    }
  },
  methods: {
    // 加载排行榜数据
    async loadRankingData(tabId) {
      const tab = this.tabs.find(t => t.id === tabId);
      if (!tab || !tab.api) return;
      
      // 直接从API获取数据，传入当前玩家ID
      try {
        const playerIdParam = this.currentPlayerId ? `?player_id=${this.currentPlayerId}` : '';
        const res = await fetch(`/api/ranking/${tab.api}${playerIdParam}`);
        const json = await res.json();
        if (json.success && json.data) {
          this.rankings[tabId] = json.data.list || [];
          this.myRank = json.data.myRank || null;
          return;
        }
      } catch (err) {
        console.error(`加载${tab.name}失败:`, err);
      }
      
      // 降级处理：使用空数据
      this.rankings[tabId] = [];
      this.myRank = { rank: '--', value: 0, unit: tab.unit };
    },
    updateMyRank() {
      const ranking = this.currentRanking;
      const myIndex = ranking.findIndex(p => p.id === this.currentPlayerId);
      if (myIndex !== -1) {
        const player = ranking[myIndex];
        this.myRank = {
          rank: myIndex + 1,
          value: player.value,
          unit: this.currentUnit
        };
      } else {
        // 如果没有找到，设置为未上榜
        this.myRank = {
          rank: '--',
          value: 0,
          unit: this.currentUnit
        };
      }
    },
    refreshRanking() {
      this.refreshing = true;
      // 加载排行榜数据
      this.loadRankingData(this.activeTab).then(() => {
        this.refreshing = false;
      });
      
      // 超时处理
      setTimeout(() => {
        if (this.refreshing) {
          this.refreshing = false;
        }
      }, 3000);
    }
  },
  mounted() {
    // 初始加载当前标签页的排行榜
    this.loadRankingData(this.activeTab);
  }
};
</script>

<style scoped>
.ranking-panel {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 12px;
  padding: 20px;
  color: #fff;
  max-height: 80vh;
  overflow-y: auto;
}

.ranking-header {
  margin-bottom: 20px;
}

.ranking-title {
  font-size: 24px;
  font-weight: bold;
  text-align: center;
}

.ranking-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  justify-content: center;
}

.tab-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s;
}

.tab-btn.active {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border-color: transparent;
}

.ranking-content {
  margin-bottom: 20px;
}

.my-ranking {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
  text-align: center;
}

.my-rank-label {
  font-size: 12px;
  opacity: 0.8;
  margin-bottom: 8px;
}

.my-rank-info {
  display: flex;
  justify-content: center;
  align-items: baseline;
  gap: 12px;
}

.rank-number {
  font-size: 32px;
  font-weight: bold;
}

.rank-value {
  font-size: 16px;
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  transition: all 0.3s;
}

.ranking-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.ranking-item.highlight {
  background: rgba(102, 126, 234, 0.3);
  border: 1px solid rgba(102, 126, 234, 0.5);
}

.ranking-item.top-1 {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 215, 0, 0.1) 100%);
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.ranking-item.top-2 {
  background: linear-gradient(135deg, rgba(192, 192, 192, 0.2) 0%, rgba(192, 192, 192, 0.1) 100%);
  border: 1px solid rgba(192, 192, 192, 0.3);
}

.ranking-item.top-3 {
  background: linear-gradient(135deg, rgba(205, 127, 50, 0.2) 0%, rgba(205, 127, 50, 0.1) 100%);
  border: 1px solid rgba(205, 127, 50, 0.3);
}

.rank-position {
  width: 36px;
  text-align: center;
  font-weight: bold;
}

.medal {
  font-size: 24px;
}

.position-num {
  font-size: 16px;
  color: #aaa;
}

.player-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.player-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 18px;
  font-weight: bold;
}

.player-info {
  flex: 1;
}

.player-name {
  font-size: 14px;
  font-weight: bold;
}

.player-level {
  font-size: 12px;
  color: #aaa;
}

.player-value {
  text-align: right;
}

.value-num {
  font-size: 16px;
  font-weight: bold;
  color: #ffd700;
}

.value-unit {
  font-size: 12px;
  color: #aaa;
  margin-left: 4px;
}

.ranking-footer {
  text-align: center;
}

.refresh-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: #fff;
  padding: 12px 32px;
  border-radius: 24px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.refresh-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.refresh-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
