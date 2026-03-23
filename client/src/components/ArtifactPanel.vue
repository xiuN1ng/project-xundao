<template>
  <div class="artifact-panel">
    <div class="panel-header">
      <h2>神器系统</h2>
      <button class="close-btn" @click="close">×</button>
    </div>
    
    <div class="panel-content">
      <div class="artifact-showcase">
        <div class="showcase-stage">
          <div class="stage-glow"></div>
          <div class="artifact-display" :class="{ active: selectedArtifact }">
            <div v-if="selectedArtifact" class="artifact-model">
              <div class="artifact-icon" :style="{ background: selectedArtifact.color }">
                <span class="icon-symbol">{{ selectedArtifact.icon }}</span>
              </div>
              <div class="artifact-particles">
                <div v-for="n in 12" :key="n" class="particle"></div>
              </div>
            </div>
            <div v-else class="empty-slot">
              <span>?</span>
            </div>
          </div>
        </div>
        
        <div class="artifact-name" v-if="selectedArtifact">
          <h3>{{ selectedArtifact.name }}</h3>
          <div class="artifact-quality" :class="selectedArtifact.quality">
            {{ selectedArtifact.quality }}神器
          </div>
        </div>
      </div>
      
      <div class="artifact-list">
        <h3>我的神器</h3>
        <div class="artifact-grid">
          <div 
            v-for="artifact in artifacts" 
            :key="artifact.id"
            class="artifact-card"
            :class="{ 
              equipped: artifact.equipped,
              selected: selectedId === artifact.id 
            }"
            @click="selectArtifact(artifact)"
          >
            <div class="card-icon" :style="{ background: artifact.color }">
              <span class="icon-symbol">{{ artifact.icon }}</span>
            </div>
            <div class="card-info">
              <span class="card-name">{{ artifact.name }}</span>
              <span class="card-level">Lv.{{ artifact.level }}</span>
            </div>
            <div v-if="artifact.equipped" class="equipped-badge">已装备</div>
          </div>
        </div>
      </div>
      
      <div class="artifact-details" v-if="selectedArtifact">
        <div class="details-section">
          <h3>基础属性</h3>
          <div class="attribute-list">
            <div v-for="(attr, key) in selectedArtifact.attributes" :key="key" class="attribute-row">
              <span class="attr-name">{{ attrNames[key] }}</span>
              <span class="attr-value">{{ attr > 0 ? '+' : '' }}{{ attr }}</span>
            </div>
          </div>
        </div>
        
        <div class="details-section">
          <h3>特殊效果</h3>
          <div class="skill-list">
            <div v-for="(skill, index) in selectedArtifact.skills" :key="index" class="skill-item">
              <span class="skill-name">{{ skill.name }}</span>
              <span class="skill-desc">{{ skill.desc }}</span>
            </div>
          </div>
        </div>
        
        <div class="details-section">
          <h3>强化等级</h3>
          <div class="enhance-info">
            <div class="enhance-level">
              <span class="level-label">强化等级</span>
              <span class="level-value">{{ selectedArtifact.enhanceLevel }}/15</span>
            </div>
            <div class="enhance-progress">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: enhanceProgress + '%' }"></div>
              </div>
            </div>
            <div class="enhance-bonus">
              <span>强化加成: +{{ enhanceBonus }}%</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="action-buttons">
        <button 
          v-if="selectedArtifact && !selectedArtifact.equipped"
          class="equip-btn"
          @click="equipArtifact"
        >
          装备
        </button>
        <button 
          v-if="selectedArtifact && selectedArtifact.equipped"
          class="unequip-btn"
          @click="unequipArtifact"
        >
          卸下
        </button>
        <button 
          class="enhance-btn"
          :disabled="!canEnhance"
          @click="enhanceArtifact"
        >
          强化
        </button>
        <button 
          class="awaken-btn"
          :disabled="!canAwaken"
          @click="awakenArtifact"
        >
          觉醒
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ArtifactPanel',
  data() {
    return {
      selectedId: null,
      attrNames: {
        attack: '攻击力',
        defense: '防御力',
        health: '生命值',
        crit: '暴击率',
        critDamage: '暴击伤害',
        speed: '速度'
      },
      artifacts: [
        {
          id: 1,
          name: '东皇钟',
          icon: '🔔',
          color: 'linear-gradient(135deg, #ffd700, #ff8c00)',
          quality: '传说',
          level: 10,
          enhanceLevel: 8,
          equipped: true,
          attributes: {
            attack: 5000,
            defense: 3000,
            health: 20000,
            crit: 15,
            critDamage: 50,
            speed: 100
          },
          skills: [
            { name: '天地无极', desc: '攻击时附加20%真实伤害' },
            { name: '万劫不复', desc: '暴击伤害提升50%' }
          ]
        },
        {
          id: 2,
          name: '盘古斧',
          icon: '🪓',
          color: 'linear-gradient(135deg, #ff6b6b, #c0392b)',
          quality: '史诗',
          level: 8,
          enhanceLevel: 5,
          equipped: false,
          attributes: {
            attack: 4000,
            defense: 2500,
            health: 15000,
            crit: 12,
            critDamage: 40,
            speed: 80
          },
          skills: [
            { name: '开天辟地', desc: '技能伤害提升25%' }
          ]
        },
        {
          id: 3,
          name: '女娲石',
          icon: '💎',
          color: 'linear-gradient(135deg, #9b59b6, #8e44ad)',
          quality: '史诗',
          level: 6,
          enhanceLevel: 3,
          equipped: false,
          attributes: {
            attack: 2000,
            defense: 4000,
            health: 30000,
            crit: 8,
            critDamage: 30,
            speed: 50
          },
          skills: [
            { name: '起死回生', desc: '死亡时30%概率复活' }
          ]
        },
        {
          id: 4,
          name: '昊天塔',
          icon: '🏰',
          color: 'linear-gradient(135deg, #3498db, #2980b9)',
          quality: '稀有',
          level: 5,
          enhanceLevel: 2,
          equipped: false,
          attributes: {
            attack: 1500,
            defense: 3500,
            health: 25000,
            crit: 10,
            critDamage: 25,
            speed: 60
          },
          skills: [
            { name: '绝对防御', desc: '受到伤害降低15%' }
          ]
        },
        {
          id: 5,
          name: '昆仑镜',
          icon: '🪞',
          color: 'linear-gradient(135deg, #1abc9c, #16a085)',
          quality: '稀有',
          level: 4,
          enhanceLevel: 1,
          equipped: false,
          attributes: {
            attack: 2500,
            defense: 1500,
            health: 10000,
            crit: 20,
            critDamage: 35,
            speed: 120
          },
          skills: [
            { name: '时空穿梭', desc: '闪避率提升15%' }
          ]
        }
      ]
    }
  },
  computed: {
    selectedArtifact() {
      return this.artifacts.find(a => a.id === this.selectedId)
    },
    enhanceProgress() {
      if (!this.selectedArtifact) return 0
      return (this.selectedArtifact.enhanceLevel / 15) * 100
    },
    enhanceBonus() {
      if (!this.selectedArtifact) return 0
      return this.selectedArtifact.enhanceLevel * 5
    },
    canEnhance() {
      return this.selectedArtifact && this.selectedArtifact.enhanceLevel < 15
    },
    canAwaken() {
      return this.selectedArtifact && this.selectedArtifact.enhanceLevel >= 10
    }
  },
  mounted() {
    const equipped = this.artifacts.find(a => a.equipped)
    if (equipped) {
      this.selectedId = equipped.id
    }
  },
  methods: {
    close() {
      this.$emit('close')
    },
    selectArtifact(artifact) {
      this.selectedId = artifact.id
    },
    equipArtifact() {
      this.artifacts.forEach(a => {
        a.equipped = false
      })
      const artifact = this.artifacts.find(a => a.id === this.selectedId)
      if (artifact) {
        artifact.equipped = true
      }
    },
    unequipArtifact() {
      const artifact = this.artifacts.find(a => a.id === this.selectedId)
      if (artifact) {
        artifact.equipped = false
      }
    },
    enhanceArtifact() {
      const artifact = this.artifacts.find(a => a.id === this.selectedId)
      if (artifact && artifact.enhanceLevel < 15) {
        artifact.enhanceLevel++
        artifact.level += 2
        for (let key in artifact.attributes) {
          artifact.attributes[key] = Math.floor(artifact.attributes[key] * 1.1)
        }
      }
    },
    awakenArtifact() {
      const artifact = this.artifacts.find(a => a.id === this.selectedId)
      if (artifact && artifact.enhanceLevel >= 10) {
        artifact.skills.push({
          name: '觉醒之力',
          desc: '全属性提升30%'
        })
      }
    }
  }
}
</script>

<style scoped>
.artifact-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 700px;
  max-height: 85vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%);
  border-radius: 16px;
  border: 2px solid #ffd700;
  box-shadow: 0 0 40px rgba(255, 215, 0, 0.3);
  z-index: 1000;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: linear-gradient(90deg, #ffd700, #ff8c00);
  color: #1a1a2e;
}

.panel-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: bold;
}

.close-btn {
  background: none;
  border: none;
  color: #1a1a2e;
  font-size: 28px;
  cursor: pointer;
  line-height: 1;
}

.panel-content {
  padding: 20px;
  max-height: calc(85vh - 60px);
  overflow-y: auto;
}

.artifact-showcase {
  text-align: center;
  margin-bottom: 24px;
}

.showcase-stage {
  position: relative;
  width: 200px;
  height: 200px;
  margin: 0 auto 16px;
}

.stage-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 180px;
  height: 180px;
  background: radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%);
  border-radius: 50%;
}

.artifact-display {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 140px;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.artifact-model {
  position: relative;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.artifact-icon {
  width: 100px;
  height: 100px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
}

.icon-symbol {
  font-size: 48px;
}

.artifact-particles {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 150px;
  height: 150px;
}

.particle {
  position: absolute;
  width: 6px;
  height: 6px;
  background: #ffd700;
  border-radius: 50%;
  animation: orbit 4s linear infinite;
}

.particle:nth-child(1) { animation-delay: 0s; --angle: 0deg; }
.particle:nth-child(2) { animation-delay: 0.3s; --angle: 30deg; }
.particle:nth-child(3) { animation-delay: 0.6s; --angle: 60deg; }
.particle:nth-child(4) { animation-delay: 0.9s; --angle: 90deg; }
.particle:nth-child(5) { animation-delay: 1.2s; --angle: 120deg; }
.particle:nth-child(6) { animation-delay: 1.5s; --angle: 150deg; }
.particle:nth-child(7) { animation-delay: 1.8s; --angle: 180deg; }
.particle:nth-child(8) { animation-delay: 2.1s; --angle: 210deg; }
.particle:nth-child(9) { animation-delay: 2.4s; --angle: 240deg; }
.particle:nth-child(10) { animation-delay: 2.7s; --angle: 270deg; }
.particle:nth-child(11) { animation-delay: 3s; --angle: 300deg; }
.particle:nth-child(12) { animation-delay: 3.3s; --angle: 330deg; }

@keyframes orbit {
  0% { 
    transform: rotate(var(--angle)) translateX(60px) rotate(calc(-1 * var(--angle)));
    opacity: 1;
  }
  100% { 
    transform: rotate(calc(var(--angle) + 360deg)) translateX(60px) rotate(calc(-1 * var(--angle) - 360deg));
    opacity: 0;
  }
}

.empty-slot {
  width: 100px;
  height: 100px;
  border: 3px dashed #666;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 48px;
}

.artifact-name h3 {
  color: #ffd700;
  margin: 0 0 8px 0;
  font-size: 24px;
}

.artifact-quality {
  display: inline-block;
  padding: 4px 16px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: bold;
}

.artifact-quality.传说 { background: linear-gradient(90deg, #ffd700, #ff8c00); color: #1a1a2e; }
.artifact-quality.史诗 { background: linear-gradient(90deg, #9b59b6, #8e44ad); color: white; }
.artifact-quality.稀有 { background: linear-gradient(90deg, #3498db, #2980b9); color: white; }

.artifact-list {
  margin-bottom: 20px;
}

.artifact-list h3 {
  color: #aaa;
  margin: 0 0 12px 0;
  font-size: 16px;
}

.artifact-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.artifact-card {
  position: relative;
  padding: 8px;
  background: #2a2a4a;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.artifact-card:hover {
  background: #3a3a5a;
}

.artifact-card.selected {
  border-color: #ffd700;
}

.artifact-card.equipped {
  border-color: #00ff88;
}

.card-icon {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 8px;
}

.card-icon .icon-symbol {
  font-size: 24px;
}

.card-info {
  text-align: center;
}

.card-name {
  display: block;
  color: white;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-level {
  color: #888;
  font-size: 11px;
}

.equipped-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #00ff88;
  color: #1a1a2e;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 8px;
  font-weight: bold;
}

.artifact-details {
  margin-bottom: 20px;
}

.details-section {
  margin-bottom: 16px;
}

.details-section h3 {
  color: #ffd700;
  margin: 0 0 10px 0;
  font-size: 14px;
}

.attribute-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.attribute-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: #2a2a4a;
  border-radius: 6px;
}

.attr-name { color: #aaa; }
.attr-value { color: #00ff88; font-weight: bold; }

.skill-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skill-item {
  padding: 10px;
  background: #2a2a4a;
  border-radius: 8px;
}

.skill-name {
  display: block;
  color: #ffd700;
  font-weight: bold;
  margin-bottom: 4px;
}

.skill-desc {
  color: #aaa;
  font-size: 12px;
}

.enhance-info {
  background: #2a2a4a;
  padding: 12px;
  border-radius: 8px;
}

.enhance-level {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.level-label { color: #aaa; }
.level-value { color: #ffd700; font-weight: bold; }

.enhance-progress {
  margin-bottom: 8px;
}

.progress-bar {
  height: 12px;
  background: #1a1a2e;
  border-radius: 6px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ffd700, #ff8c00);
  transition: width 0.5s;
}

.enhance-bonus {
  text-align: center;
  color: #00ff88;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.equip-btn, .unequip-btn, .enhance-btn, .awaken-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: bold;
}

.equip-btn {
  background: linear-gradient(135deg, #00ff88, #00cc6a);
  color: #1a1a2e;
}

.unequip-btn {
  background: linear-gradient(135deg, #ff6b6b, #ee5a5a);
  color: white;
}

.enhance-btn {
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  color: #1a1a2e;
}

.enhance-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.awaken-btn {
  background: linear-gradient(135deg, #9b59b6, #8e44ad);
  color: white;
}

.awaken-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
</style>
