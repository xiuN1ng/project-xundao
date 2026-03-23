<template>
  <div class="lundao-panel">
    <div class="panel-header">
      <h2>📜 论道台</h2>
      <button class="close-btn" @click="closePanel">×</button>
    </div>
    
    <!-- 论道标签页 -->
    <div class="lundao-tabs">
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
    
    <!-- 论道切磋 -->
    <div v-if="activeTab === 'fight'" class="lundao-content">
      <div class="section-title">道友切磋</div>
      
      <!-- 挑战对手选择 -->
      <div class="opponent-section">
        <div class="section-desc">选择对手进行论道切磋</div>
        <div class="opponent-list">
          <div 
            v-for="opponent in opponents" 
            :key="opponent.id"
            class="opponent-card"
            :class="{ selected: selectedOpponent?.id === opponent.id }"
            @click="selectOpponent(opponent)"
          >
            <div class="opponent-avatar">{{ opponent.icon }}</div>
            <div class="opponent-info">
              <div class="opponent-name">{{ opponent.name }}</div>
              <div class="opponent-realm">{{ opponent.level }}转 {{ opponent.phase }}</div>
            </div>
            <div class="opponent-power">
              <span class="power-value">{{ opponent.power.toLocaleString() }}</span>
              <span class="power-label">战力</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 论道结果 -->
      <div v-if="battleResult" class="battle-result">
        <div class="result-header" :class="battleResult.win ? 'win' : 'lose'">
          {{ battleResult.win ? '🎉 论道胜利！' : '😔 论道失败' }}
        </div>
        <div class="result-content">
          <div class="result-stats">
            <div class="stat-item">
              <span class="stat-label">造成伤害</span>
              <span class="stat-value damage">{{ battleResult.myDamage }}</span>
            </div>
            <div class="stat-vs">VS</div>
            <div class="stat-item">
              <span class="stat-label">受到伤害</span>
              <span class="stat-value">{{ battleResult.enemyDamage }}</span>
            </div>
          </div>
          <div class="result-rewards" v-if="battleResult.win">
            <div class="reward-title">论道奖励</div>
            <div class="reward-items">
              <span class="reward-item" v-if="battleResult.rewards.spirit">💎 灵气 +{{ battleResult.rewards.spirit }}</span>
              <span class="reward-item" v-if="battleResult.rewards.stones">💰 灵石 +{{ battleResult.rewards.stones }}</span>
              <span class="reward-item" v-if="battleResult.rewards.exp">📚 经验 +{{ battleResult.rewards.exp }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 开始论道按钮 -->
      <div class="action-section">
        <button 
          class="btn btn-gold lundao-btn"
          :disabled="!selectedOpponent || fighting"
          @click="startBattle"
        >
          {{ fighting ? '⏳ 论道中...' : '⚔️ 开始论道' }}
        </button>
      </div>
    </div>
    
    <!-- 功法对决 -->
    <div v-if="activeTab === 'gongfa'" class="lundao-content">
      <div class="section-title">功法对决</div>
      
      <div class="gongfa-section">
        <div class="gongfa-desc">选择功法与对手进行法理争锋</div>
        
        <!-- 我的功法 -->
        <div class="gongfa-my">
          <div class="gongfa-label">我的功法</div>
          <div class="gongfa-list">
            <div 
              v-for="gongfa in myGongfa" 
              :key="gongfa.id"
              class="gongfa-card"
              :class="{ selected: selectedGongfa?.id === gongfa.id, locked: !gongfa.unlocked }"
              @click="gongfa.unlocked && selectGongfa(gongfa)"
            >
              <div class="gongfa-icon">{{ gongfa.icon }}</div>
              <div class="gongfa-name">{{ gongfa.name }}</div>
              <div class="gongfa-level">Lv.{{ gongfa.level }}</div>
              <div class="gongfa-power">+{{ gongfa.power }}</div>
              <div v-if="!gongfa.unlocked" class="gongfa-lock">🔒</div>
            </div>
          </div>
        </div>
        
        <!-- 对手功法 -->
        <div class="gongfa-opponent">
          <div class="gongfa-label">对手功法</div>
          <div class="gongfa-list">
            <div 
              v-for="gongfa in opponentGongfa" 
              :key="gongfa.id"
              class="gongfa-card opponent"
              :class="{ selected: selectedOpponentGongfa?.id === gongfa.id }"
              @click="selectOpponentGongfa(gongfa)"
            >
              <div class="gongfa-icon">{{ gongfa.icon }}</div>
              <div class="gongfa-name">{{ gongfa.name }}</div>
              <div class="gongfa-power">+{{ gongfa.power }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 对决结果 -->
      <div v-if="gongfaResult" class="battle-result">
        <div class="result-header" :class="gongfaResult.win ? 'win' : 'lose'">
          {{ gongfaResult.win ? '✨ 功法胜出！' : '📉 功法落败' }}
        </div>
        <div class="result-content">
          <div class="gongfa-comparison">
            <div class="compare-item my">
              <div class="compare-name">{{ selectedGongfa?.name }}</div>
              <div class="compare-power">{{ selectedGongfa?.power }} 威力</div>
            </div>
            <div class="compare-vs">VS</div>
            <div class="compare-item opp">
              <div class="compare-name">{{ selectedOpponentGongfa?.name }}</div>
              <div class="compare-power">{{ selectedOpponentGongfa?.power }} 威力</div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="action-section">
        <button 
          class="btn btn-gold lundao-btn"
          :disabled="!selectedGongfa || !selectedOpponentGongfa || fighting"
          @click="startGongfaBattle"
        >
          {{ fighting ? '⏳ 对决中...' : '✨ 功法对决' }}
        </button>
      </div>
    </div>
    
    <!-- 论道排行榜 -->
    <div v-if="activeTab === 'rank'" class="lundao-content">
      <div class="section-title">论道排行榜</div>
      
      <!-- 我的排名 -->
      <div class="my-rank-card" v-if="myLundaoRank">
        <div class="my-rank-label">我的排名</div>
        <div class="my-rank-value">#{{ myLundaoRank.rank }}</div>
        <div class="my-rank-score">胜场: {{ myLundaoRank.wins }} | 积分: {{ myLundaoRank.score }}</div>
      </div>
      
      <!-- 排行榜列表 -->
      <div class="rank-list">
        <div 
          v-for="(player, index) in lundaoRanking" 
          :key="player.id"
          class="rank-item"
          :class="{ 'top-3': index < 3, highlight: player.id === currentPlayerId }"
        >
          <div class="rank-position">
            <span v-if="index === 0" class="medal">🥇</span>
            <span v-else-if="index === 1" class="medal">🥈</span>
            <span v-else-if="index === 2" class="medal">🥉</span>
            <span v-else class="position">{{ index + 1 }}</span>
          </div>
          <div class="rank-avatar">{{ player.icon || player.name.charAt(0) }}</div>
          <div class="rank-info">
            <div class="rank-name">{{ player.name }}</div>
            <div class="rank-realm">{{ player.phase }}</div>
          </div>
          <div class="rank-stats">
            <div class="rank-wins">胜 {{ player.wins }}</div>
            <div class="rank-score">{{ player.score }} 积分</div>
          </div>
        </div>
      </div>
      
      <div class="action-section">
        <button class="btn btn-small" @click="refreshRanking" :disabled="refreshing">
          {{ refreshing ? '刷新中...' : '🔄 刷新排名' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LundaoPanel',
  emits: ['close'],
  setup(props, { emit }) {
    const activeTab = ref('fight');
    const fighting = ref(false);
    const refreshing = ref(false);
    const selectedOpponent = ref(null);
    const selectedGongfa = ref(null);
    const selectedOpponentGongfa = ref(null);
    const battleResult = ref(null);
    const gongfaResult = ref(null);
    
    // 获取玩家ID
    let currentPlayerId = '1';
    try {
      const savedData = localStorage.getItem('xundao_player');
      if (savedData) {
        const playerData = JSON.parse(savedData);
        currentPlayerId = playerData.id || '1';
      }
    } catch (e) {
      console.warn('无法获取玩家ID');
    }
    
    const tabs = [
      { id: 'fight', name: '道友切磋', icon: '⚔️' },
      { id: 'gongfa', name: '功法对决', icon: '✨' },
      { id: 'rank', name: '排行榜', icon: '🏆' }
    ];
    
    // 对手列表
    const opponents = ref([
      { id: 'opp_001', name: '剑痴', icon: '⚔️', level: 5, phase: '化神', power: 520000 },
      { id: 'opp_002', name: '丹王', icon: '🧪', level: 5, phase: '化神', power: 480000 },
      { id: 'opp_003', name: '阵皇', icon: '📐', level: 4, phase: '元婴', power: 420000 },
      { id: 'opp_004', name: '符魔', icon: '📜', level: 4, phase: '元婴', power: 380000 },
      { id: 'opp_005', name: '器神', icon: '🔨', level: 4, phase: '元婴', power: 350000 }
    ]);
    
    // 我的功法
    const myGongfa = ref([
      { id: 'gf_001', name: '太极玄清道', icon: '☯️', level: 5, power: 1200, unlocked: true },
      { id: 'gf_002', name: '九转玄功', icon: '🔥', level: 4, power: 980, unlocked: true },
      { id: 'gf_003', name: '天剑诀', icon: '🗡️', level: 3, power: 750, unlocked: true },
      { id: 'gf_004', name: '神农百草经', icon: '🌿', level: 2, power: 520, unlocked: false },
      { id: 'gf_005', name: '万灵诀', icon: '🦋', level: 1, power: 300, unlocked: false }
    ]);
    
    // 对手功法
    const opponentGongfa = ref([
      { id: 'ogf_001', name: '太上洞玄经', icon: '📿', power: 1150 },
      { id: 'ogf_002', name: '大日如来经', icon: '☀️', power: 1080 },
      { id: 'ogf_003', name: '天魔妙法', icon: '👹', power: 960 },
      { id: 'ogf_004', name: '青莲剑典', icon: '⚜️', power: 850 }
    ]);
    
    // 排行榜
    const lundaoRanking = ref([
      { id: 'rank_001', name: '剑圣', icon: '⚔️', phase: '大乘', wins: 158, score: 4800 },
      { id: 'rank_002', name: '道君', icon: '☯️', phase: '大乘', wins: 145, score: 4350 },
      { id: 'rank_003', name: '魔尊', icon: '👹', phase: '合体', wins: 132, score: 3960 },
      { id: 'rank_004', name: '丹圣', icon: '🧪', phase: '合体', wins: 128, score: 3840 },
      { id: 'rank_005', name: '阵仙', icon: '📐', phase: '炼虚', wins: 115, score: 3450 },
      { id: 'rank_006', name: '符神', icon: '📜', phase: '炼虚', wins: 108, score: 3240 },
      { id: 'rank_007', name: '器皇', icon: '🔨', phase: '化神', wins: 95, score: 2850 },
      { id: 'current', name: '我', icon: '🧘', phase: '元婴', wins: 45, score: 1350 }
    ]);
    
    const myLundaoRank = ref({ rank: 28, wins: 45, score: 1350 });
    
    // 选择对手
    const selectOpponent = (opponent) => {
      selectedOpponent.value = opponent;
      battleResult.value = null;
    };
    
    // 选择我的功法
    const selectGongfa = (gongfa) => {
      selectedGongfa.value = gongfa;
      gongfaResult.value = null;
    };
    
    // 选择对手功法
    const selectOpponentGongfa = (gongfa) => {
      selectedOpponentGongfa.value = gongfa;
      gongfaResult.value = null;
    };
    
    // 开始论道战斗
    const startBattle = async () => {
      if (!selectedOpponent.value || fighting.value) return;
      
      fighting.value = true;
      
      try {
        // 调用API
        const res = await fetch('/api/lundao', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            player_id: currentPlayerId,
            opponent_id: selectedOpponent.value.id,
            type: 'fight'
          })
        });
        
        const json = await res.json();
        
        if (json.success && json.data) {
          battleResult.value = json.data;
        } else {
          // 模拟结果
          const myPower = 500000 + Math.random() * 200000;
          const enemyPower = selectedOpponent.value.power;
          const win = myPower > enemyPower;
          
          battleResult.value = {
            win: win,
            myDamage: Math.floor(myPower * (0.8 + Math.random() * 0.4)),
            enemyDamage: Math.floor(enemyPower * (0.8 + Math.random() * 0.4)),
            rewards: win ? {
              spirit: Math.floor(Math.random() * 500) + 200,
              stones: Math.floor(Math.random() * 1000) + 500,
              exp: Math.floor(Math.random() * 2000) + 1000
            } : null
          };
        }
      } catch (err) {
        console.error('论道失败:', err);
        // 模拟结果
        const myPower = 500000 + Math.random() * 200000;
        const enemyPower = selectedOpponent.value.power;
        const win = myPower > enemyPower;
        
        battleResult.value = {
          win: win,
          myDamage: Math.floor(myPower * (0.8 + Math.random() * 0.4)),
          enemyDamage: Math.floor(enemyPower * (0.8 + Math.random() * 0.4)),
          rewards: win ? {
            spirit: Math.floor(Math.random() * 500) + 200,
            stones: Math.floor(Math.random() * 1000) + 500,
            exp: Math.floor(Math.random() * 2000) + 1000
          } : null
        };
      }
      
      fighting.value = false;
    };
    
    // 开始功法对决
    const startGongfaBattle = async () => {
      if (!selectedGongfa.value || !selectedOpponentGongfa.value || fighting.value) return;
      
      fighting.value = true;
      
      try {
        // 调用API
        const res = await fetch('/api/lundao-classic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            player_id: currentPlayerId,
            my_gongfa_id: selectedGongfa.value.id,
            opponent_gongfa_id: selectedOpponentGongfa.value.id,
            type: 'gongfa'
          })
        });
        
        const json = await res.json();
        
        if (json.success && json.data) {
          gongfaResult.value = json.data;
        } else {
          // 模拟结果
          const myPower = selectedGongfa.value.power * (0.9 + Math.random() * 0.3);
          const oppPower = selectedOpponentGongfa.value.power * (0.9 + Math.random() * 0.3);
          
          gongfaResult.value = {
            win: myPower > oppPower
          };
        }
      } catch (err) {
        console.error('功法对决失败:', err);
        // 模拟结果
        const myPower = selectedGongfa.value.power * (0.9 + Math.random() * 0.3);
        const oppPower = selectedOpponentGongfa.value.power * (0.9 + Math.random() * 0.3);
        
        gongfaResult.value = {
          win: myPower > oppPower
        };
      }
      
      fighting.value = false;
    };
    
    // 刷新排行榜
    const refreshRanking = async () => {
      refreshing.value = true;
      
      try {
        const res = await fetch('/api/lundao/ranking');
        const json = await res.json();
        
        if (json.success && json.data) {
          lundaoRanking.value = json.data.list || lundaoRanking.value;
          myLundaoRank.value = json.data.myRank || myLundaoRank.value;
        }
      } catch (err) {
        console.error('刷新排行榜失败:', err);
      }
      
      refreshing.value = false;
    };
    
    // 关闭面板
    const closePanel = () => {
      emit('close');
    };
    
    // 加载数据
    onMounted(() => {
      refreshRanking();
    });
    
    return {
      activeTab,
      tabs,
      fighting,
      refreshing,
      opponents,
      selectedOpponent,
      selectedGongfa,
      selectedOpponentGongfa,
      myGongfa,
      opponentGongfa,
      lundaoRanking,
      myLundaoRank,
      battleResult,
      gongfaResult,
      currentPlayerId,
      selectOpponent,
      selectGongfa,
      selectOpponentGongfa,
      startBattle,
      startGongfaBattle,
      refreshRanking,
      closePanel
    };
  }
};
</script>

<style scoped>
.lundao-panel {
  background: linear-gradient(rgba(26, 26, 46, 0.85), rgba(22, 33, 62, 0.9)), url('../assets/bg-lundao.png') center/cover no-repeat;
  border-radius: 16px;
  animation: panelFadeIn 0.3s ease;
  border: 2px solid #b8860b;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(184, 134, 11, 0.2);
  color: #e2e8f0;
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(184, 134, 11, 0.3);
  background: linear-gradient(90deg, rgba(184, 134, 11, 0.15) 0%, transparent 100%);
}

.panel-header h2 {
  margin: 0;
  font-size: 20px;
  color: #ffd700;
  text-shadow: 0 0 15px rgba(255, 215, 0, 0.4);
}

.close-btn {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #a0aec0;
  font-size: 24px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #ff4444;
  background: rgba(255, 68, 68, 0.15);
  border-color: rgba(255, 68, 68, 0.3);
  transform: rotate(90deg);
}

.lundao-tabs {
  display: flex;
  gap: 8px;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-wrap: wrap;
}

.tab-btn {
  flex: 1;
  min-width: 100px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #a0aec0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
  font-weight: 500;
}

.tab-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.tab-btn.active {
  background: linear-gradient(135deg, #b8860b 0%, #daa520 100%);
  color: #1a1a2e;
  border-color: transparent;
  font-weight: bold;
  box-shadow: 0 4px 15px rgba(184, 134, 11, 0.3);
}

.lundao-content {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.section-title {
  font-size: 18px;
  color: #ffd700;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 215, 0, 0.2);
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
}

/* 对手选择 */
.opponent-section {
  margin-bottom: 20px;
}

.section-desc {
  color: #888;
  font-size: 13px;
  margin-bottom: 12px;
}

.opponent-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.opponent-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.opponent-card:hover {
  background: rgba(184, 134, 11, 0.1);
  border-color: rgba(184, 134, 11, 0.3);
  transform: translateX(5px);
}

.opponent-card.selected {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.15);
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.2);
}

.opponent-avatar {
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, rgba(184, 134, 11, 0.3), rgba(218, 165, 32, 0.2));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.opponent-info {
  flex: 1;
}

.opponent-name {
  font-size: 16px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 4px;
}

.opponent-realm {
  font-size: 12px;
  color: #888;
}

.opponent-power {
  text-align: right;
}

.power-value {
  display: block;
  font-size: 18px;
  font-weight: bold;
  color: #ffd700;
}

.power-label {
  font-size: 11px;
  color: #888;
}

/* 战斗结果 */
.battle-result {
  background: rgba(0, 0, 0, 0.4);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 20px;
}

.result-header {
  padding: 16px;
  text-align: center;
  font-size: 18px;
  font-weight: bold;
}

.result-header.win {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(5, 150, 105, 0.2));
  color: #4ecdc4;
}

.result-header.lose {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(220, 38, 38, 0.2));
  color: #ef4444;
}

.result-content {
  padding: 16px;
}

.result-stats {
  display: flex;
  align-items: center;
  justify-content: space-around;
  margin-bottom: 16px;
}

.stat-item {
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: #888;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #ffd700;
}

.stat-value.damage {
  color: #ef4444;
}

.stat-vs {
  font-size: 20px;
  font-weight: bold;
  color: #666;
}

.result-rewards {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 16px;
}

.reward-title {
  font-size: 14px;
  color: #888;
  margin-bottom: 10px;
}

.reward-items {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.reward-item {
  padding: 6px 12px;
  background: rgba(255, 215, 0, 0.15);
  border-radius: 20px;
  font-size: 13px;
  color: #ffd700;
}

/* 功法对决 */
.gongfa-section {
  margin-bottom: 20px;
}

.gongfa-desc {
  color: #888;
  font-size: 13px;
  margin-bottom: 16px;
}

.gongfa-my, .gongfa-opponent {
  margin-bottom: 20px;
}

.gongfa-label {
  font-size: 14px;
  color: #b8860b;
  margin-bottom: 10px;
  font-weight: bold;
}

.gongfa-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 10px;
}

.gongfa-card {
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.gongfa-card:hover:not(.locked) {
  border-color: rgba(184, 134, 11, 0.5);
  transform: translateY(-3px);
}

.gongfa-card.selected {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.15);
  box-shadow: 0 0 15px rgba(255, 215, 0, 0.3);
}

.gongfa-card.locked {
  opacity: 0.5;
  cursor: not-allowed;
}

.gongfa-card.opponent {
  border-color: rgba(139, 43, 226, 0.3);
}

.gongfa-card.opponent.selected {
  border-color: #9b59b6;
  background: rgba(155, 89, 182, 0.15);
}

.gongfa-icon {
  font-size: 28px;
  margin-bottom: 6px;
}

.gongfa-name {
  font-size: 12px;
  color: #fff;
  font-weight: bold;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gongfa-level {
  font-size: 11px;
  color: #ffd700;
}

.gongfa-power {
  font-size: 11px;
  color: #4ecdc4;
}

.gongfa-lock {
  position: absolute;
  top: 5px;
  right: 5px;
  font-size: 14px;
}

/* 功法对比结果 */
.gongfa-comparison {
  display: flex;
  align-items: center;
  justify-content: space-around;
}

.compare-item {
  text-align: center;
}

.compare-name {
  font-size: 14px;
  color: #fff;
  margin-bottom: 4px;
}

.compare-power {
  font-size: 20px;
  font-weight: bold;
  color: #ffd700;
}

.compare-item.opp .compare-power {
  color: #9b59b6;
}

.compare-vs {
  font-size: 24px;
  font-weight: bold;
  color: #666;
}

/* 排行榜 */
.my-rank-card {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(184, 134, 11, 0.1));
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  margin-bottom: 20px;
}

.my-rank-label {
  font-size: 12px;
  color: #888;
  margin-bottom: 6px;
}

.my-rank-value {
  font-size: 36px;
  font-weight: bold;
  color: #ffd700;
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
}

.my-rank-score {
  font-size: 13px;
  color: #aaa;
  margin-top: 8px;
}

.rank-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.rank-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.3s;
}

.rank-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.rank-item.top-3 {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(184, 134, 11, 0.05));
  border-color: rgba(255, 215, 0, 0.2);
}

.rank-item.highlight {
  background: rgba(102, 126, 234, 0.2);
  border-color: rgba(102, 126, 234, 0.4);
}

.rank-position {
  width: 36px;
  text-align: center;
}

.medal {
  font-size: 24px;
}

.position {
  font-size: 16px;
  color: #888;
  font-weight: bold;
}

.rank-avatar {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, rgba(184, 134, 11, 0.3), rgba(218, 165, 32, 0.2));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.rank-info {
  flex: 1;
}

.rank-name {
  font-size: 14px;
  font-weight: bold;
  color: #fff;
}

.rank-realm {
  font-size: 11px;
  color: #888;
}

.rank-stats {
  text-align: right;
}

.rank-wins {
  font-size: 13px;
  color: #4ecdc4;
}

.rank-score {
  font-size: 11px;
  color: #ffd700;
}

/* 操作区域 */
.action-section {
  text-align: center;
  padding-top: 10px;
}

.lundao-btn {
  min-width: 200px;
  padding: 14px 32px;
  font-size: 16px;
  font-weight: bold;
}

/* 响应式 */
@media (max-width: 480px) {
  .lundao-panel {
    max-height: 90vh;
    border-radius: 12px 12px 0 0;
  }
  
  .lundao-tabs {
    padding: 12px;
    gap: 6px;
  }
  
  .tab-btn {
    min-width: auto;
    padding: 8px 12px;
    font-size: 13px;
  }
  
  .lundao-content {
    padding: 16px;
  }
  
  .gongfa-list {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .opponent-card {
    padding: 12px;
  }
}

@keyframes panelFadeIn {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
