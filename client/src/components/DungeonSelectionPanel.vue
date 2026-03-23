<template>
  <div class="dungeon-panel" v-if="visible">
    <div class="panel-header">
      <h2>🗝️ 副本挑战</h2>
      <button class="close-btn" @click="close">×</button>
    </div>
    
    <div class="panel-tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        :class="['tab-btn', { active: currentTab === tab.id }]"
        @click="currentTab = tab.id"
      >
        {{ tab.name }}
      </button>
    </div>
    
    <div class="panel-content">
      <!-- 副本列表 -->
      <div v-if="currentTab === 'dungeons'" class="dungeon-list">
        <div v-for="dungeon in dungeons" :key="dungeon.id" class="dungeon-item" @click="selectDungeon(dungeon)">
          <div class="dungeon-icon">{{ dungeon.icon }}</div>
          <div class="dungeon-info">
            <div class="dungeon-name">{{ dungeon.name }}</div>
            <div class="dungeon-level">推荐境界: {{ dungeon.realm }}</div>
            <div class="dungeon-desc">{{ dungeon.description }}</div>
          </div>
          <div class="dungeon-status">
            <span v-if="dungeon.unlocked" class="unlocked">已解锁</span>
            <span v-else class="locked">未解锁</span>
          </div>
        </div>
      </div>
      
      <!-- 副本详情 -->
      <div v-if="currentTab === 'detail'" class="dungeon-detail">
        <button class="back-btn" @click="currentTab = 'dungeons'">← 返回</button>
        
        <div v-if="selectedDungeon" class="detail-content">
          <div class="detail-header">
            <span class="detail-icon">{{ selectedDungeon.icon }}</span>
            <span class="detail-name">{{ selectedDungeon.name }}</span>
          </div>
          
          <div class="detail-info">
            <div class="info-row">
              <span class="label">推荐境界</span>
              <span class="value">{{ selectedDungeon.realm }}</span>
            </div>
            <div class="info-row">
              <span class="label">建议战力</span>
              <span class="value">{{ selectedDungeon.reqPower }}</span>
            </div>
            <div class="info-row">
              <span class="label">剩余次数</span>
              <span class="value">{{ selectedDungeon.remainingTimes }}/{{ selectedDungeon.maxTimes }}</span>
            </div>
          </div>

          <!-- 章节难度对比 -->
          <div class="difficulty-section" v-if="playerStats">
            <h4>⚔️ 战力分析</h4>
            <div class="diff-bar-wrap">
              <div class="diff-label-row">
                <span class="diff-player-label">👤 你的战力</span>
                <span class="diff-ratio">{{ difficultyRatioLabel }}</span>
                <span class="diff-dungeon-label">🗝️ 副本要求</span>
              </div>
              <div class="diff-bar">
                <div class="diff-fill" :class="difficultyClass" :style="{ width: difficultyBarWidth }"></div>
                <div class="diff-marker" :style="{ left: difficultyMarkerPos }">⚔️</div>
              </div>
              <div class="diff-numbers">
                <span class="player-power">{{ playerStats.atk }} 攻击</span>
                <span class="req-power">{{ selectedDungeon.reqPower }} 要求</span>
              </div>
            </div>

            <!-- 怪物属性 vs 玩家属性 -->
            <div class="monster-compare">
              <div class="compare-title">👹 怪物 vs 👤 玩家 属性对比</div>
              <div class="compare-rows">
                <div class="compare-row">
                  <span class="compare-label">攻击</span>
                  <div class="compare-bar-wrap">
                    <div class="compare-bar">
                      <div class="compare-fill monster-fill" :style="{ width: monsterAtkPercent + '%' }"></div>
                      <div class="compare-fill player-fill" :style="{ width: playerAtkPercent + '%' }"></div>
                    </div>
                  </div>
                  <span class="compare-val monster-val">{{ selectedDungeon.boss.atk || monsterAvgAtk }}</span>
                  <span class="compare-sep">/</span>
                  <span class="compare-val player-val">{{ playerStats.atk }}</span>
                </div>
                <div class="compare-row">
                  <span class="compare-label">防御</span>
                  <div class="compare-bar-wrap">
                    <div class="compare-bar">
                      <div class="compare-fill monster-fill" :style="{ width: monsterDefPercent + '%' }"></div>
                      <div class="compare-fill player-fill" :style="{ width: playerDefPercent + '%' }"></div>
                    </div>
                  </div>
                  <span class="compare-val monster-val">{{ selectedDungeon.boss.def || monsterAvgDef }}</span>
                  <span class="compare-sep">/</span>
                  <span class="compare-val player-val">{{ playerStats.def }}</span>
                </div>
                <div class="compare-row">
                  <span class="compare-label">血量</span>
                  <div class="compare-bar-wrap">
                    <div class="compare-bar">
                      <div class="compare-fill monster-fill" :style="{ width: monsterHpPercent + '%' }"></div>
                      <div class="compare-fill player-fill" :style="{ width: playerHpPercent + '%' }"></div>
                    </div>
                  </div>
                  <span class="compare-val monster-val">{{ selectedDungeon.boss.hp || monsterAvgHp }}</span>
                  <span class="compare-sep">/</span>
                  <span class="compare-val player-val">{{ playerStats.maxHp }}</span>
                </div>
              </div>
              <div class="compare-legend">
                <span class="legend-item"><span class="legend-dot monster-dot"></span>怪物</span>
                <span class="legend-item"><span class="legend-dot player-dot"></span>玩家</span>
              </div>
            </div>
          </div>
          
          <div class="boss-section">
            <h4>🏆 BOSS信息</h4>
            <div class="boss-info">
              <div class="boss-icon">{{ selectedDungeon.boss.icon }}</div>
              <div class="boss-name">{{ selectedDungeon.boss.name }}</div>
              <div class="boss HP">血量: {{ selectedDungeon.boss.hp }}</div>
              <div class="boss-attacks">技能: {{ selectedDungeon.boss.skills.join(', ') }}</div>
            </div>
          </div>
          
          <div class="rewards-section">
            <h4>🎁 通关奖励</h4>
            <div class="rewards-list">
              <div v-for="reward in selectedDungeon.rewards" :key="reward.type" class="reward-item">
                <span class="reward-icon">{{ reward.icon }}</span>
                <span class="reward-name">{{ reward.name }}</span>
                <span class="reward-amount">x{{ reward.amount }}</span>
              </div>
            </div>
          </div>
          
          <div class="sweep-section">
            <h4>⚡ 一键扫荡</h4>
            <div class="sweep-options">
              <button 
                v-for="count in [1, 3, 5]" 
                :key="count"
                :class="['sweep-btn', { selected: sweepCount === count }]"
                @click="sweepCount = count"
              >
                扫荡{{ count }}次
              </button>
            </div>
          </div>
          
          <div class="action-buttons">
            <button 
              class="challenge-btn"
              :disabled="!selectedDungeon.unlocked || selectedDungeon.remainingTimes <= 0"
              @click="startChallenge"
            >
              开始挑战
            </button>
            <button 
              class="sweep-action-btn"
              :disabled="!selectedDungeon.unlocked || selectedDungeon.remainingTimes < sweepCount || !selectedDungeon.cleared"
              @click="startSweep"
            >
              一键扫荡
            </button>
          </div>
        </div>
      </div>
      
      <!-- 扫荡结果 -->
      <div v-if="currentTab === 'sweep'" class="sweep-result">
        <button class="back-btn" @click="currentTab = 'dungeons'">← 返回</button>
        
        <div class="sweep-summary">
          <div class="sweep-icon">⚡</div>
          <h3>扫荡完成</h3>
          
          <div class="sweep-count">扫荡次数: {{ sweepResults.count }}</div>
          
          <div class="sweep-rewards">
            <h4>获得奖励</h4>
            <div v-for="reward in sweepResults.rewards" :key="reward.type" class="reward-row">
              <span>{{ reward.icon }} {{ reward.name }}</span>
              <span class="amount">x{{ reward.amount }}</span>
            </div>
          </div>
          
          <button class="confirm-btn" @click="currentTab = 'dungeons'">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DungeonSelectionPanel',
  data() {
    return {
      visible: false,
      currentTab: 'dungeons',
      tabs: [
        { id: 'dungeons', name: '副本列表' },
        { id: 'detail', name: '副本详情' },
        { id: 'sweep', name: '扫荡结果' }
      ],
      selectedDungeon: null,
      sweepCount: 1,
      sweepResults: {
        count: 0,
        rewards: []
      },
      dungeons: [
        {
          id: 1,
          name: '青云洞府',
          icon: '☁️',
          realm: '炼气期',
          reqPower: '5000',
          description: '青云子留下的修炼洞府',
          unlocked: true,
          remainingTimes: 5,
          maxTimes: 5,
          cleared: true,
          boss: { icon: '🧙', name: '青云子残魂', hp: '50000', skills: ['青云剑诀', '云雾术', '御剑飞行'] },
          rewards: [
            { type: 'gold', icon: '💰', name: '灵石', amount: 1000 },
            { type: 'exp', icon: '✨', name: '经验', amount: 500 },
            { type: 'item', icon: '📜', name: '青云心法', amount: 1 }
          ]
        },
        {
          id: 2,
          name: '万魔深渊',
          icon: '👹',
          realm: '筑基期',
          reqPower: '20000',
          description: '群魔乱舞的深渊之地',
          unlocked: true,
          remainingTimes: 3,
          maxTimes: 3,
          cleared: false,
          boss: { icon: '😈', name: '深渊魔王', hp: '200000', skills: ['魔焰滔天', '万魔噬心', '黑暗侵蚀'] },
          rewards: [
            { type: 'gold', icon: '💰', name: '灵石', amount: 5000 },
            { type: 'exp', icon: '✨', name: '经验', amount: 2000 },
            { type: 'item', icon: '⚔️', name: '魔器部件', amount: 1 }
          ]
        },
        {
          id: 3,
          name: '神龙遗迹',
          icon: '🐉',
          realm: '金丹期',
          reqPower: '100000',
          description: '神龙陨落留下的传承之地',
          unlocked: false,
          remainingTimes: 0,
          maxTimes: 3,
          cleared: false,
          boss: { icon: '🐲', name: '神龙残魂', hp: '1000000', skills: ['龙息', '龙吟九天', '行云布雨'] },
          rewards: [
            { type: 'gold', icon: '💰', name: '灵石', amount: 20000 },
            { type: 'exp', icon: '✨', name: '经验', amount: 10000 },
            { type: 'item', icon: '🐉', name: '龙珠', amount: 1 }
          ]
        },
        {
          id: 4,
          name: '仙府探险',
          icon: '🏰',
          realm: '元婴期',
          reqPower: '500000',
          description: '上古仙人的府邸',
          unlocked: false,
          remainingTimes: 0,
          maxTimes: 2,
          cleared: false,
          boss: { icon: '👑', name: '仙府守护', hp: '5000000', skills: ['仙法无边', '乾坤逆转', '天地同寿'] },
          rewards: [
            { type: 'gold', icon: '💰', name: '灵石', amount: 100000 },
            { type: 'exp', icon: '✨', name: '经验', amount: 50000 },
            { type: 'item', icon: '👑', name: '仙器图纸', amount: 1 }
          ]
        }
      ]
    };
  },
  computed: {
    playerStats() {
      const gs = window.gameState;
      if (!gs || !gs.player) return null;
      const p = gs.player;
      return {
        atk: p.atk || 0,
        def: p.def || 0,
        maxHp: p.maxHp || p.hp || 0,
        hp: p.hp || 0,
        realm: p.realm || '炼气期',
        level: p.level || 1
      };
    },
    playerPower() {
      const s = this.playerStats;
      if (!s) return 0;
      // 战力 = 攻击*2 + 防御 + 血量/10
      return Math.floor(s.atk * 2 + s.def + s.maxHp / 10);
    },
    dungeonPower() {
      if (!this.selectedDungeon) return 0;
      return parseInt(this.selectedDungeon.reqPower) || 0;
    },
    difficultyRatio() {
      if (!this.playerPower || !this.dungeonPower) return 0;
      return this.playerPower / this.dungeonPower;
    },
    difficultyClass() {
      const r = this.difficultyRatio;
      if (r >= 1.5) return 'diff-easy';
      if (r >= 1.0) return 'diff-normal';
      if (r >= 0.6) return 'diff-hard';
      return 'diff-dangerous';
    },
    difficultyRatioLabel() {
      const r = this.difficultyRatio;
      if (r >= 1.5) return '🟢 简单';
      if (r >= 1.0) return '🟡 适中';
      if (r >= 0.6) return '🟠 困难';
      return '🔴 危险';
    },
    difficultyBarWidth() {
      const r = Math.min(this.difficultyRatio, 2.0);
      return Math.max(10, (r / 2) * 100) + '%';
    },
    difficultyMarkerPos() {
      const r = Math.min(this.difficultyRatio, 2.0);
      return Math.max(5, Math.min(95, (r / 2) * 100)) + '%';
    },
    monsterAvgAtk() {
      const boss = this.selectedDungeon?.boss;
      if (!boss) return 0;
      return parseInt(boss.atk) || Math.floor(parseInt(boss.hp || 0) * 0.05);
    },
    monsterAvgDef() {
      const boss = this.selectedDungeon?.boss;
      if (!boss) return 0;
      return parseInt(boss.def) || Math.floor((parseInt(boss.hp || 0) * 0.02));
    },
    monsterAvgHp() {
      if (!this.selectedDungeon?.boss) return 0;
      return parseInt(this.selectedDungeon.boss.hp) || 0;
    },
    maxCompareValue() {
      const s = this.playerStats;
      if (!s) return 1;
      return Math.max(s.atk, s.def, s.maxHp, this.monsterAvgAtk, this.monsterAvgDef, this.monsterAvgHp, 1);
    },
    monsterAtkPercent() { return (this.monsterAvgAtk / this.maxCompareValue) * 100; },
    playerAtkPercent() { return (this.playerStats?.atk / this.maxCompareValue) * 100; },
    monsterDefPercent() { return (this.monsterAvgDef / this.maxCompareValue) * 100; },
    playerDefPercent() { return (this.playerStats?.def / this.maxCompareValue) * 100; },
    monsterHpPercent() { return (this.monsterAvgHp / this.maxCompareValue) * 100; },
    playerHpPercent() { return (this.playerStats?.maxHp / this.maxCompareValue) * 100; }
  },
  methods: {
    show() {
      this.visible = true;
      this.currentTab = 'dungeons';
    },
    close() {
      this.visible = false;
    },
    selectDungeon(dungeon) {
      this.selectedDungeon = dungeon;
      this.currentTab = 'detail';
    },
    startChallenge() {
      if (!this.selectedDungeon.unlocked) {
        this.$root.showMessage('该副本未解锁', 'error');
        return;
      }
      if (this.selectedDungeon.remainingTimes <= 0) {
        this.$root.showMessage('挑战次数已用尽', 'error');
        return;
      }
      this.$root.showMessage(`开始挑战: ${this.selectedDungeon.name}`, 'success');
      this.selectedDungeon.remainingTimes--;
    },
    startSweep() {
      if (!this.selectedDungeon.cleared) {
        this.$root.showMessage('请先通关一次', 'error');
        return;
      }
      if (this.selectedDungeon.remainingTimes < this.sweepCount) {
        this.$root.showMessage('剩余次数不足', 'error');
        return;
      }
      
      this.sweepResults = {
        count: this.sweepCount,
        rewards: [
          { type: 'gold', icon: '💰', name: '灵石', amount: 1000 * this.sweepCount },
          { type: 'exp', icon: '✨', name: '经验', amount: 500 * this.sweepCount },
          { type: 'item', icon: '📜', name: '副本掉落', amount: this.sweepCount }
        ]
      };
      
      this.selectedDungeon.remainingTimes -= this.sweepCount;
      this.currentTab = 'sweep';
    }
  }
};
</script>

<style scoped>
.dungeon-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 540px;
  max-height: 80vh;
  background: linear-gradient(rgba(26, 26, 46, 0.88), rgba(22, 33, 62, 0.92)), url('../assets/bg-battle-intense-20260322.png') center/cover no-repeat;
  border: 2px solid #e17055;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(90deg, #d63031, #e17055);
  color: white;
}

.panel-header h2 { margin: 0; font-size: 20px; }

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 28px;
  cursor: pointer;
}

.panel-tabs {
  display: flex;
  background: #0f0f23;
  padding: 8px;
  gap: 4px;
}

.tab-btn {
  flex: 1;
  padding: 10px 8px;
  background: transparent;
  border: none;
  color: #8b9dc3;
  cursor: pointer;
  border-radius: 8px;
  font-size: 13px;
}

.tab-btn.active {
  background: linear-gradient(135deg, #d63031, #e17055);
  color: white;
}

.panel-content {
  padding: 16px;
  max-height: 65vh;
  overflow-y: auto;
}

.dungeon-list { display: flex; flex-direction: column; gap: 12px; }

.dungeon-item {
  display: flex;
  align-items: center;
  padding: 14px;
  background: rgba(225, 112, 85, 0.1);
  border: 1px solid rgba(225, 112, 85, 0.3);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.dungeon-item:hover { background: rgba(225, 112, 85, 0.2); }

.dungeon-icon { font-size: 40px; margin-right: 14px; }

.dungeon-info { flex: 1; }
.dungeon-name { color: white; font-weight: bold; font-size: 16px; margin-bottom: 4px; }
.dungeon-level { color: #fdcb6e; font-size: 12px; margin-bottom: 4px; }
.dungeon-desc { color: #8b9dc3; font-size: 12px; }

.dungeon-status .unlocked { color: #00b894; font-size: 12px; }
.dungeon-status .locked { color: #636e72; font-size: 12px; }

.back-btn {
  padding: 8px 16px;
  background: transparent;
  border: 1px solid #e17055;
  border-radius: 6px;
  color: #e17055;
  cursor: pointer;
  margin-bottom: 16px;
}

.detail-header {
  text-align: center;
  margin-bottom: 20px;
}

.detail-icon { font-size: 64px; display: block; margin-bottom: 8px; }
.detail-name { color: white; font-size: 24px; font-weight: bold; }

.detail-info {
  background: rgba(225, 112, 85, 0.1);
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 16px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.info-row:last-child { border-bottom: none; }
.info-row .label { color: #8b9dc3; }
.info-row .value { color: #fdcb6e; font-weight: bold; }

.boss-section, .rewards-section, .sweep-section, .difficulty-section {
  margin-bottom: 16px;
}

.difficulty-section h4 {
  color: white;
  margin: 0 0 12px 0;
  font-size: 14px;
}

.diff-bar-wrap {
  background: rgba(255,255,255,0.05);
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 12px;
}

.diff-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.diff-player-label { color: #74b9ff; font-size: 12px; }
.diff-dungeon-label { color: #fab1a0; font-size: 12px; }
.diff-ratio { color: #fdcb6e; font-size: 13px; font-weight: bold; }

.diff-bar {
  position: relative;
  height: 16px;
  background: rgba(255,255,255,0.1);
  border-radius: 8px;
  overflow: visible;
  margin-bottom: 6px;
}

.diff-fill {
  height: 100%;
  border-radius: 8px;
  transition: width 0.4s ease;
}

.diff-easy { background: linear-gradient(90deg, #00b894, #55efc4); }
.diff-normal { background: linear-gradient(90deg, #fdcb6e, #ffeaa7); }
.diff-hard { background: linear-gradient(90deg, #e17055, #fab1a0); }
.diff-dangerous { background: linear-gradient(90deg, #d63031, #e74c3c); }

.diff-marker {
  position: absolute;
  top: -8px;
  transform: translateX(-50%);
  font-size: 18px;
  transition: left 0.4s ease;
}

.diff-numbers {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
}

.player-power { color: #74b9ff; }
.req-power { color: #fab1a0; }

/* 怪物属性对比 */
.monster-compare {
  background: rgba(255,255,255,0.05);
  border-radius: 10px;
  padding: 14px;
}

.compare-title {
  color: #8b9dc3;
  font-size: 12px;
  margin-bottom: 12px;
  text-align: center;
}

.compare-rows { display: flex; flex-direction: column; gap: 10px; }

.compare-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.compare-label {
  color: #8b9dc3;
  font-size: 12px;
  width: 30px;
  flex-shrink: 0;
}

.compare-bar-wrap { flex: 1; }

.compare-bar {
  position: relative;
  height: 10px;
  background: rgba(255,255,255,0.1);
  border-radius: 5px;
  overflow: hidden;
}

.compare-fill {
  position: absolute;
  top: 0;
  height: 100%;
  border-radius: 5px;
  transition: width 0.4s ease;
}

.monster-fill { left: 0; background: rgba(214, 48, 49, 0.7); }
.player-fill { left: 0; background: rgba(116, 185, 255, 0.7); }

.compare-val {
  font-size: 11px;
  width: 50px;
  text-align: right;
  flex-shrink: 0;
}

.monster-val { color: #e74c3c; }
.player-val { color: #74b9ff; }
.compare-sep { color: #636e72; font-size: 11px; }

.compare-legend {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 10px;
}

.legend-item { color: #8b9dc3; font-size: 11px; display: flex; align-items: center; gap: 4px; }
.legend-dot { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
.monster-dot { background: rgba(214, 48, 49, 0.7); }
.player-dot { background: rgba(116, 185, 255, 0.7); }

.boss-section h4, .rewards-section h4, .sweep-section h4 {
  color: white;
  margin: 0 0 12px 0;
  font-size: 14px;
}

.boss-info {
  background: rgba(214, 48, 49, 0.2);
  border-radius: 10px;
  padding: 14px;
  text-align: center;
}

.boss-icon { font-size: 48px; }
.boss-name { color: white; font-weight: bold; margin: 8px 0; }
.boss-hp { color: #d63031; }
.boss-attacks { color: #8b9dc3; font-size: 12px; margin-top: 8px; }

.rewards-list { display: flex; flex-direction: column; gap: 8px; }

.reward-item {
  display: flex;
  align-items: center;
  padding: 10px;
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
}

.reward-icon { font-size: 24px; margin-right: 10px; }
.reward-name { flex: 1; color: white; }
.reward-amount { color: #fdcb6e; }

.sweep-options { display: flex; gap: 10px; }

.sweep-btn {
  flex: 1;
  padding: 10px;
  background: rgba(255,255,255,0.05);
  border: 2px solid #636e72;
  border-radius: 8px;
  color: #8b9dc3;
  cursor: pointer;
}

.sweep-btn.selected {
  border-color: #e17055;
  background: rgba(225, 112, 85, 0.2);
  color: white;
}

.action-buttons { display: flex; gap: 12px; margin-top: 20px; }

.challenge-btn, .sweep-action-btn {
  flex: 1;
  padding: 14px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
}

.challenge-btn {
  background: linear-gradient(135deg, #d63031, #e17055);
  color: white;
}

.sweep-action-btn {
  background: linear-gradient(135deg, #fdcb6e, #f39c12);
  color: #333;
}

.challenge-btn:disabled, .sweep-action-btn:disabled {
  background: #636e72;
  cursor: not-allowed;
}

.sweep-result { text-align: center; }

.sweep-summary { padding: 20px; }

.sweep-icon { font-size: 80px; }
.sweep-summary h3 { color: white; font-size: 24px; margin: 12px 0; }
.sweep-count { color: #fdcb6e; font-size: 18px; margin-bottom: 20px; }

.sweep-rewards {
  background: rgba(225, 112, 85, 0.1);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
  text-align: left;
}

.sweep-rewards h4 { color: white; margin: 0 0 12px 0; font-size: 14px; }

.reward-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  color: white;
}

.reward-row .amount { color: #fdcb6e; }

.confirm-btn {
  padding: 12px 40px;
  background: linear-gradient(135deg, #d63031, #e17055);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 16px;
  cursor: pointer;
}
</style>
