<template>
  <div class="skill-tree-panel">
    <div class="skill-tree-header">
      <div class="header-title">
        <span class="title-icon">🌲</span>
        <span>技能树</span>
      </div>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>
    
    <!-- 技能点/灵石显示 -->
    <div class="resource-bar">
      <div class="resource-item">
        <span class="resource-icon">💎</span>
        <span class="resource-label">可用技能点:</span>
        <span class="resource-value skill-points">{{ availableSkillPoints }}</span>
      </div>
      <div class="resource-item">
        <span class="resource-icon">🪙</span>
        <span class="resource-label">灵石:</span>
        <span class="resource-value">{{ playerData.spiritStones || 0 }}</span>
      </div>
    </div>
    
    <!-- 技能树导航 -->
    <div class="skill-tree-tabs">
      <button 
        v-for="tab in skillCategories" 
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeCategory === tab.id }"
        @click="activeCategory = tab.id"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-name">{{ tab.name }}</span>
      </button>
    </div>
    
    <!-- 技能树视图 -->
    <div class="skill-tree-container">
      <div class="skill-tree">
        <!-- 技能节点 -->
        <div 
          v-for="skill in filteredSkills" 
          :key="skill.id"
          class="skill-node"
          :class="{ 
            'locked': !skill.unlocked,
            'available': skill.unlocked && !skill.maxed,
            'activated': skill.unlocked,
            'maxed': skill.maxed
          }"
          :style="skill.position"
          @click="handleSkillClick(skill)"
        >
          <!-- 技能图标 -->
          <div class="skill-icon" :class="'rarity-' + skill.rarity">
            <span class="skill-emoji">{{ skill.icon }}</span>
            <div class="skill-level-badge" v-if="skill.unlocked && skill.level > 0">
              {{ skill.level }}
            </div>
          </div>
          
          <!-- 技能名称 -->
          <div class="skill-name">{{ skill.name }}</div>
          
          <!-- 连接线 -->
          <svg class="connection-svg" v-if="skill.requires.length > 0">
            <line 
              v-for="reqId in skill.requires" 
              :key="reqId"
              :x1="getConnectionPoint(reqId).x" 
              :y1="getConnectionPoint(reqId).y"
              :x2="getConnectionPoint(skill.id).x"
              :y2="getConnectionPoint(skill.id).y"
              :class="{ active: isConnectionActive(skill, reqId) }"
            />
          </svg>
          
          <!-- 锁定遮罩 -->
          <div class="lock-overlay" v-if="!skill.unlocked">
            <span class="lock-icon">🔒</span>
          </div>
          
          <!-- 可用提示 -->
          <div class="available-indicator" v-if="canUnlock(skill) || canUpgrade(skill)"></div>
        </div>
      </div>
    </div>
    
    <!-- 技能详情面板 -->
    <div class="skill-detail" v-if="selectedSkill">
      <div class="detail-header">
        <div class="detail-icon" :class="'rarity-' + selectedSkill.rarity">
          {{ selectedSkill.icon }}
        </div>
        <div class="detail-info">
          <div class="detail-name">{{ selectedSkill.name }}</div>
          <div class="detail-type">{{ getTypeLabel(selectedSkill.type) }}</div>
        </div>
      </div>
      
      <div class="detail-desc">{{ selectedSkill.description }}</div>
      
      <!-- 等级进度 -->
      <div class="level-progress" v-if="selectedSkill.unlocked">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: (selectedSkill.level / selectedSkill.maxLevel * 100) + '%' }"></div>
        </div>
        <div class="progress-text">等级 {{ selectedSkill.level }} / {{ selectedSkill.maxLevel }}</div>
      </div>
      
      <!-- 技能效果 -->
      <div class="detail-effects" v-if="selectedSkill.unlocked">
        <div class="effects-title">技能效果 (每级)</div>
        <div class="effect-list">
          <div 
            v-for="(effect, key) in selectedSkill.effects" 
            :key="key"
            class="effect-item"
          >
            <span class="effect-name">{{ getEffectLabel(key) }}</span>
            <span class="effect-value">+{{ formatEffectValue(key, effect) }}</span>
          </div>
        </div>
        <div class="total-effect" v-if="selectedSkill.level > 0">
          <span>当前总效果:</span>
          <span class="total-value">{{ getTotalEffectText(selectedSkill) }}</span>
        </div>
      </div>
      
      <!-- 解锁要求 -->
      <div class="detail-requirement" v-if="!selectedSkill.unlocked">
        <div class="req-title">解锁条件</div>
        <div class="req-item" v-if="selectedSkill.realmReq > 0">
          <span class="req-icon">{{ playerData.realmLevel >= selectedSkill.realmReq ? '✅' : '❌' }}</span>
          <span>境界要求:</span>
          <span class="req-value">{{ getRealmLabel(selectedSkill.realmReq) }}</span>
        </div>
        <div class="req-item" v-if="selectedSkill.levelReq > 0">
          <span class="req-icon">{{ playerData.level >= selectedSkill.levelReq ? '✅' : '❌' }}</span>
          <span>等级要求:</span>
          <span class="req-value">{{ selectedSkill.levelReq }}级</span>
        </div>
        <div class="req-item" v-for="reqId in selectedSkill.requires" :key="reqId">
          <span class="req-icon">{{ isPrerequisiteMet(reqId) ? '✅' : '❌' }}</span>
          <span>前置技能:</span>
          <span class="req-value">{{ getSkillName(reqId) }}</span>
        </div>
      </div>
      
      <!-- 升级/解锁按钮 -->
      <div class="detail-actions">
        <button 
          v-if="!selectedSkill.unlocked"
          class="action-btn unlock-btn"
          :disabled="!canUnlock(selectedSkill)"
          @click="unlockSkill(selectedSkill)"
        >
          <span class="btn-icon">🔓</span>
          <span>解锁 ({{ selectedSkill.unlockCost }}灵石)</span>
        </button>
        
        <button 
          v-else-if="!selectedSkill.maxed"
          class="action-btn upgrade-btn"
          :disabled="!canUpgrade(selectedSkill)"
          @click="upgradeSkill(selectedSkill)"
        >
          <span class="btn-icon">⬆️</span>
          <span>升级 ({{ getUpgradeCost(selectedSkill) }}灵石)</span>
        </button>
        
        <button 
          v-else
          class="action-btn max-btn"
          disabled
        >
          <span class="btn-icon">⭐</span>
          <span>已满级</span>
        </button>
      </div>
    </div>
    
    <!-- 总属性加成 -->
    <div class="total-bonus">
      <div class="bonus-title">📊 当前技能加成</div>
      <div class="bonus-grid">
        <div 
          v-for="(value, key) in totalSkillBonuses" 
          :key="key"
          class="bonus-item"
          v-show="value !== 0"
        >
          <span class="bonus-icon">{{ getBonusIcon(key) }}</span>
          <span class="bonus-label">{{ getEffectLabel(key) }}</span>
          <span class="bonus-value">{{ formatEffectValue(key, value) }}</span>
        </div>
      </div>
    </div>
    
    <!-- 玩家信息 -->
    <div class="player-info">
      <div class="info-item">
        <span class="info-label">境界:</span>
        <span class="info-value realm">{{ playerData.realmName || '凡人' }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">等级:</span>
        <span class="info-value level">{{ playerData.level || 1 }}</span>
      </div>
    </div>
  </div>
</template>

<script>
const { ref, computed, onMounted, watch } = Vue;

export default {
  name: 'SkillTreePanel',
  emits: ['close', 'skill-unlocked', 'skill-upgraded', 'skills-updated'],
  setup(props, { emit }) {
    const activeCategory = ref('cultivation');
    const selectedSkill = ref(null);
    
    // 从游戏状态获取玩家数据
    const getPlayerData = () => {
      try {
        const saveData = localStorage.getItem('cultivation_save_v2');
        if (saveData) {
          const parsed = JSON.parse(saveData);
          const p = parsed.gameState?.player || {};
          return {
            spiritStones: p.spiritStones || 0,
            realmLevel: p.realmLevel || 0,
            realmName: p.realm || '凡人',
            level: p.level || 1,
            skillPoints: p.skillPoints || 0,
            techniquePoints: p.techniquePoints || 0
          };
        }
      } catch (e) {
        console.error('获取玩家数据失败:', e);
      }
      return {
        spiritStones: 100000,
        realmLevel: 1,
        realmName: '练气期',
        level: 1,
        skillPoints: 0,
        techniquePoints: 0
      };
    };
    
    const playerData = ref(getPlayerData());
    
    // 可用技能点
    const availableSkillPoints = computed(() => {
      return playerData.value.skillPoints || 0;
    });
    
    // 技能分类
    const skillCategories = [
      { id: 'cultivation', name: '修炼', icon: '🧘' },
      { id: 'attack', name: '攻击', icon: '⚔️' },
      { id: 'defense', name: '防御', icon: '🛡️' },
      { id: 'auxiliary', name: '辅助', icon: '🌿' },
      { id: 'passive', name: '被动', icon: '✨' }
    ];
    
    // 从存档加载技能状态
    const loadSkillsFromSave = () => {
      try {
        const saveData = localStorage.getItem('cultivation_save_v2');
        if (saveData) {
          const parsed = JSON.parse(saveData);
          return parsed.gameState?.player?.skills || {};
        }
      } catch (e) {
        console.error('加载技能状态失败:', e);
      }
      return {};
    };
    
    // 技能数据结构
    const skills = ref([
      // 修炼类技能
      {
        id: 'basic_breath',
        name: '引气术',
        type: 'cultivation',
        description: '最简单的呼吸吐纳之法，提升修炼效率',
        rarity: 1,
        icon: '🌬️',
        realmReq: 0,
        levelReq: 1,
        unlockCost: 0,
        level: 0,
        maxLevel: 5,
        unlocked: false,
        position: { left: '50%', top: '10%' },
        requires: [],
        effects: { spirit_rate: 0.1 }
      },
      {
        id: 'spirit_absorption',
        name: '聚气诀',
        type: 'cultivation',
        description: '聚集周围灵气的法门，大幅提升修炼速度',
        rarity: 2,
        icon: '🌀',
        realmReq: 2,
        levelReq: 10,
        unlockCost: 500,
        level: 0,
        maxLevel: 5,
        unlocked: false,
        position: { left: '30%', top: '28%' },
        requires: ['basic_breath'],
        effects: { spirit_rate: 0.15 }
      },
      {
        id: 'celestial_breath',
        name: '先天混元功',
        type: 'cultivation',
        description: '沟通天地元气的无上功法',
        rarity: 4,
        icon: '✨',
        realmReq: 5,
        levelReq: 50,
        unlockCost: 50000,
        level: 0,
        maxLevel: 5,
        unlocked: false,
        position: { left: '50%', top: '46%' },
        requires: ['spirit_absorption'],
        effects: { spirit_rate: 0.35 }
      },
      {
        id: 'immortal_cultivation',
        name: '仙道篇',
        type: 'cultivation',
        description: '成仙之道，蕴含无上奥秘',
        rarity: 5,
        icon: '🏔️',
        realmReq: 7,
        levelReq: 80,
        unlockCost: 500000,
        level: 0,
        maxLevel: 3,
        unlocked: false,
        position: { left: '50%', top: '70%' },
        requires: ['celestial_breath'],
        effects: { spirit_rate: 0.5, exp_rate: 0.2 }
      },
      // 攻击类技能
      {
        id: 'sword_manifesto',
        name: '剑诀',
        type: 'attack',
        description: '基础剑修法门，提升攻击力',
        rarity: 1,
        icon: '⚔️',
        realmReq: 0,
        levelReq: 1,
        unlockCost: 0,
        level: 0,
        maxLevel: 5,
        unlocked: false,
        position: { left: '20%', top: '15%' },
        requires: [],
        effects: { atk: 0.1 }
      },
      {
        id: 'flame_sword',
        name: '赤焰剑诀',
        type: 'attack',
        description: '蕴含火焰之力的剑技，附带灼烧伤害',
        rarity: 3,
        icon: '🔥',
        realmReq: 3,
        levelReq: 20,
        unlockCost: 2000,
        level: 0,
        maxLevel: 5,
        unlocked: false,
        position: { left: '15%', top: '35%' },
        requires: ['sword_manifesto'],
        effects: { atk: 0.25, fire_dmg: 0.15 }
      },
      {
        id: 'thunder_sword',
        name: '奔雷剑诀',
        type: 'attack',
        description: '引动天雷的剑技，附带雷电伤害和暴击率',
        rarity: 4,
        icon: '⚡',
        realmReq: 5,
        levelReq: 50,
        unlockCost: 50000,
        level: 0,
        maxLevel: 5,
        unlocked: false,
        position: { left: '25%', top: '55%' },
        requires: ['flame_sword'],
        effects: { atk: 0.4, thunder_dmg: 0.2, crit_rate: 0.05 }
      },
      {
        id: 'void_slash',
        name: '虚空斩',
        type: 'attack',
        description: '斩断虚空的终极剑技',
        rarity: 5,
        icon: '🌑',
        realmReq: 7,
        levelReq: 80,
        unlockCost: 500000,
        level: 0,
        maxLevel: 3,
        unlocked: false,
        position: { left: '20%', top: '80%' },
        requires: ['thunder_sword'],
        effects: { atk: 0.6, void_dmg: 0.3, crit_damage: 0.2 }
      },
      // 防御类技能
      {
        id: 'iron_body',
        name: '铁布衫',
        type: 'defense',
        description: '基础的护体功法，提升防御力',
        rarity: 1,
        icon: '🛡️',
        realmReq: 0,
        levelReq: 1,
        unlockCost: 0,
        level: 0,
        maxLevel: 5,
        unlocked: false,
        position: { left: '80%', top: '15%' },
        requires: [],
        effects: { def: 0.1 }
      },
      {
        id: 'jade_shield',
        name: '玉清护体',
        type: 'defense',
        description: '玉石俱焚的防御绝技，减免伤害',
        rarity: 3,
        icon: '💎',
        realmReq: 3,
        levelReq: 20,
        unlockCost: 2000,
        level: 0,
        maxLevel: 5,
        unlocked: false,
        position: { left: '85%', top: '35%' },
        requires: ['iron_body'],
        effects: { def: 0.25, damage_reduction: 0.1 }
      },
      {
        id: 'golden_body',
        name: '金身不坏',
        type: 'defense',
        description: '金刚不坏之身，免疫部分伤害',
        rarity: 5,
        icon: '🧘',
        realmReq: 7,
        levelReq: 80,
        unlockCost: 500000,
        level: 0,
        maxLevel: 3,
        unlocked: false,
        position: { left: '80%', top: '60%' },
        requires: ['jade_shield'],
        effects: { def: 0.4, damage_reduction: 0.2, max_hp: 0.2 }
      },
      // 辅助类技能
      {
        id: 'healing_arts',
        name: '长春功',
        type: 'auxiliary',
        description: '恢复生命力的法门，提升生命恢复',
        rarity: 2,
        icon: '🌿',
        realmReq: 1,
        levelReq: 5,
        unlockCost: 300,
        level: 0,
        maxLevel: 5,
        unlocked: false,
        position: { left: '65%', top: '25%' },
        requires: [],
        effects: { hp_regen: 0.1 }
      },
      {
        id: 'spirit_heal',
        name: '灵气疗伤',
        type: 'auxiliary',
        description: '以灵气疗愈伤势，大幅提升恢复效果',
        rarity: 3,
        icon: '💚',
        realmReq: 3,
        levelReq: 25,
        unlockCost: 3000,
        level: 0,
        maxLevel: 5,
        unlocked: false,
        position: { left: '60%', top: '45%' },
        requires: ['healing_arts'],
        effects: { hp_regen: 0.2, heal_bonus: 0.15 }
      },
      // 被动类技能
      {
        id: 'spirit_root_awakening',
        name: '灵根觉醒',
        type: 'passive',
        description: '激发灵根潜力，全面提升属性',
        rarity: 3,
        icon: '🌟',
        realmReq: 2,
        levelReq: 15,
        unlockCost: 1500,
        level: 0,
        maxLevel: 5,
        unlocked: false,
        position: { left: '50%', top: '55%' },
        requires: ['spirit_absorption'],
        effects: { all_stats: 0.08 }
      },
      {
        id: 'destiny_star',
        name: '命星指引',
        type: 'passive',
        description: '星辰之力加身，提升悟性和气运',
        rarity: 4,
        icon: '⭐',
        realmReq: 5,
        levelReq: 55,
        unlockCost: 80000,
        level: 0,
        maxLevel: 3,
        unlocked: false,
        position: { left: '70%', top: '70%' },
        requires: ['spirit_root_awakening', 'jade_shield'],
        effects: { all_stats: 0.15, drop_rate: 0.1 }
      }
    ]);
    
    // 计算属性
    const filteredSkills = computed(() => {
      return skills.value.filter(s => s.type === activeCategory.value);
    });
    
    // 计算总技能加成
    const totalSkillBonuses = computed(() => {
      const bonuses = {
        spirit_rate: 0,
        atk: 0,
        def: 0,
        max_hp: 0,
        hp_regen: 0,
        heal_bonus: 0,
        crit_rate: 0,
        crit_damage: 0,
        fire_dmg: 0,
        thunder_dmg: 0,
        void_dmg: 0,
        all_stats: 0,
        exp_rate: 0,
        drop_rate: 0,
        damage_reduction: 0
      };
      
      skills.value.forEach(skill => {
        if (skill.unlocked && skill.level > 0) {
          Object.keys(skill.effects).forEach(key => {
            if (bonuses[key] !== undefined) {
              bonuses[key] += skill.effects[key] * skill.level;
            }
          });
        }
      });
      
      return bonuses;
    });
    
    // 获取连接线位置
    const getConnectionPoint = (skillId) => {
      const skill = skills.value.find(s => s.id === skillId);
      if (!skill) return { x: 0, y: 0 };
      
      const container = document.querySelector('.skill-tree-container');
      if (!container) return { x: 0, y: 0 };
      
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      
      return {
        x: (parseFloat(skill.position.left) / 100) * containerWidth,
        y: (parseFloat(skill.position.top) / 100) * containerHeight
      };
    };
    
    // 辅助方法
    const getTypeLabel = (type) => {
      const labels = {
        cultivation: '修炼',
        attack: '攻击',
        defense: '防御',
        auxiliary: '辅助',
        passive: '被动'
      };
      return labels[type] || type;
    };
    
    const getRealmLabel = (realm) => {
      const realms = ['凡人', '练气期', '筑基期', '金丹期', '元婴期', '化神期', '炼虚期', '合体期', '大乘期', '渡劫期', '仙人'];
      return realms[realm] || `境界${realm}`;
    };
    
    const getEffectLabel = (key) => {
      const labels = {
        spirit_rate: '修炼效率',
        atk: '攻击力',
        def: '防御力',
        max_hp: '生命上限',
        hp_regen: '生命恢复',
        heal_bonus: '治疗效果',
        crit_rate: '暴击率',
        crit_damage: '暴击伤害',
        fire_dmg: '火焰伤害',
        thunder_dmg: '雷电伤害',
        void_dmg: '虚空伤害',
        all_stats: '全属性',
        exp_rate: '经验加成',
        drop_rate: '掉落率',
        damage_reduction: '伤害减免'
      };
      return labels[key] || key;
    };
    
    const formatEffectValue = (key, value) => {
      const percentageKeys = ['spirit_rate', 'atk', 'def', 'max_hp', 'hp_regen', 'heal_bonus', 
        'crit_rate', 'crit_damage', 'fire_dmg', 'thunder_dmg', 'void_dmg', 'all_stats', 
        'exp_rate', 'drop_rate', 'damage_reduction'];
      
      if (percentageKeys.includes(key)) {
        return (value * 100).toFixed(0) + '%';
      }
      return value.toString();
    };
    
    const getBonusIcon = (key) => {
      const icons = {
        spirit_rate: '🧘',
        atk: '⚔️',
        def: '🛡️',
        max_hp: '❤️',
        hp_regen: '💖',
        heal_bonus: '💚',
        crit_rate: '🎯',
        crit_damage: '💥',
        fire_dmg: '🔥',
        thunder_dmg: '⚡',
        void_dmg: '🌑',
        all_stats: '⭐',
        exp_rate: '📈',
        drop_rate: '📦',
        damage_reduction: '💪'
      };
      return icons[key] || '✨';
    };
    
    const getSkillName = (skillId) => {
      const skill = skills.value.find(s => s.id === skillId);
      return skill ? skill.name : skillId;
    };
    
    const isPrerequisiteMet = (reqId) => {
      const reqSkill = skills.value.find(s => s.id === reqId);
      return reqSkill && reqSkill.unlocked;
    };
    
    const isConnectionActive = (skill, reqId) => {
      const reqSkill = skills.value.find(s => s.id === reqId);
      return reqSkill && reqSkill.unlocked && skill.unlocked;
    };
    
    // 检查是否可以解锁
    const canUnlock = (skill) => {
      if (skill.unlocked) return false;
      if (playerData.value.spiritStones < skill.unlockCost) return false;
      if (playerData.value.realmLevel < skill.realmReq) return false;
      if (playerData.value.level < skill.levelReq) return false;
      
      for (const reqId of skill.requires) {
        const reqSkill = skills.value.find(s => s.id === reqId);
        if (!reqSkill || !reqSkill.unlocked) return false;
      }
      
      return true;
    };
    
    // 检查是否可以升级
    const canUpgrade = (skill) => {
      if (!skill.unlocked) return false;
      if (skill.level >= skill.maxLevel) return false;
      if (playerData.value.spiritStones < getUpgradeCost(skill)) return false;
      return true;
    };
    
    // 获取升级成本
    const getUpgradeCost = (skill) => {
      if (!skill.unlocked || skill.level >= skill.maxLevel) return 0;
      return Math.floor(skill.unlockCost * Math.pow(1.8, skill.level));
    };
    
    // 点击技能
    const handleSkillClick = (skill) => {
      selectedSkill.value = skill;
    };
    
    // 解锁技能
    const unlockSkill = (skill) => {
      if (!canUnlock(skill)) return;
      
      playerData.value.spiritStones -= skill.unlockCost;
      skill.unlocked = true;
      skill.level = 1;
      
      saveSkillsToSave();
      applySkillEffects();
      
      emit('skill-unlocked', skill);
      emit('skills-updated', getSkillStates());
      
      if (typeof showToast === 'function') {
        showToast(`解锁 ${skill.name} 成功!`, 'success');
      }
    };
    
    // 升级技能
    const upgradeSkill = (skill) => {
      if (!canUpgrade(skill)) return;
      
      const cost = getUpgradeCost(skill);
      playerData.value.spiritStones -= cost;
      skill.level++;
      
      saveSkillsToSave();
      applySkillEffects();
      
      emit('skill-upgraded', skill);
      emit('skills-updated', getSkillStates());
      
      if (typeof showToast === 'function') {
        showToast(`${skill.name} 升级到 ${skill.level} 级!`, 'success');
      }
    };
    
    // 保存技能状态到存档
    const saveSkillsToSave = () => {
      try {
        const saveData = localStorage.getItem('cultivation_save_v2');
        if (saveData) {
          const parsed = JSON.parse(saveData);
          if (!parsed.gameState.player.skills) {
            parsed.gameState.player.skills = {};
          }
          
          skills.value.forEach(skill => {
            parsed.gameState.player.skills[skill.id] = {
              level: skill.level,
              unlocked: skill.unlocked
            };
          });
          
          parsed.gameState.player.spiritStones = playerData.value.spiritStones;
          
          localStorage.setItem('cultivation_save_v2', JSON.stringify(parsed));
        }
      } catch (e) {
        console.error('保存技能状态失败:', e);
      }
    };
    
    // 应用技能效果到游戏
    const applySkillEffects = () => {
      try {
        const saveData = localStorage.getItem('cultivation_save_v2');
        if (saveData) {
          const parsed = JSON.parse(saveData);
          parsed.gameState.player.skillBonuses = totalSkillBonuses.value;
          localStorage.setItem('cultivation_save_v2', JSON.stringify(parsed));
        }
      } catch (e) {
        console.error('应用技能效果失败:', e);
      }
    };
    
    // 获取技能状态
    const getSkillStates = () => {
      const states = {};
      skills.value.forEach(skill => {
        states[skill.id] = {
          level: skill.level,
          unlocked: skill.unlocked
        };
      });
      return states;
    };
    
    // 获取总效果文本
    const getTotalEffectText = (skill) => {
      const parts = [];
      Object.keys(skill.effects).forEach(key => {
        const total = skill.effects[key] * skill.level;
        parts.push(`${getEffectLabel(key)}+${formatEffectValue(key, total)}`);
      });
      return parts.join(', ');
    };
    
    // 初始化技能状态
    const initializeSkills = () => {
      const savedSkills = loadSkillsFromSave();
      if (Object.keys(savedSkills).length > 0) {
        skills.value.forEach(skill => {
          if (savedSkills[skill.id]) {
            skill.level = savedSkills[skill.id].level || 0;
            skill.unlocked = savedSkills[skill.id].unlocked || false;
          }
        });
      }
    };
    
    // 组件挂载时刷新数据
    onMounted(() => {
      playerData.value = getPlayerData();
      initializeSkills();
      applySkillEffects();
    });
    
    return {
      activeCategory,
      selectedSkill,
      playerData,
      availableSkillPoints,
      skillCategories,
      skills,
      filteredSkills,
      totalSkillBonuses,
      getConnectionPoint,
      getTypeLabel,
      getRealmLabel,
      getEffectLabel,
      formatEffectValue,
      getBonusIcon,
      getSkillName,
      isPrerequisiteMet,
      isConnectionActive,
      canUnlock,
      canUpgrade,
      getUpgradeCost,
      handleSkillClick,
      unlockSkill,
      upgradeSkill,
      getTotalEffectText
    };
  }
};
</script>

<style scoped>
.skill-tree-panel {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 20px;
  color: #fff;
  max-width: 900px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.skill-tree-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 24px;
  font-weight: bold;
}

.title-icon {
  font-size: 28px;
}

.close-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #fff;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  transition: all 0.3s;
}

.close-btn:hover {
  background: rgba(255, 100, 100, 0.3);
  transform: rotate(90deg);
}

/* 资源栏 */
.resource-bar {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  margin-bottom: 16px;
}

.resource-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.resource-icon {
  font-size: 18px;
}

.resource-label {
  color: #aaa;
  font-size: 13px;
}

.resource-value {
  font-size: 16px;
  font-weight: bold;
}

.resource-value.skill-points {
  color: #9f7aea;
}

/* 技能树导航 */
.skill-tree-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #aaa;
  padding: 8px 14px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 13px;
}

.tab-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.tab-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: transparent;
  color: #fff;
}

.tab-icon {
  font-size: 14px;
}

/* 技能树容器 */
.skill-tree-container {
  flex: 1;
  min-height: 280px;
  max-height: 350px;
  overflow-y: auto;
  position: relative;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 20px;
}

.skill-tree {
  position: relative;
  min-height: 300px;
}

/* 连接线 */
.connection-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.connection-svg line {
  stroke: rgba(255, 255, 255, 0.15);
  stroke-width: 2;
  transition: stroke 0.3s;
}

.connection-svg line.active {
  stroke: #667eea;
}

/* 技能节点 */
.skill-node {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transform: translateX(-50%);
  transition: all 0.3s;
  z-index: 1;
}

.skill-node:hover {
  transform: translateX(-50%) scale(1.1);
  z-index: 10;
}

.skill-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid rgba(255, 255, 255, 0.2);
  position: relative;
  transition: all 0.3s;
}

.skill-icon.rarity-1 { border-color: #aaa; }
.skill-icon.rarity-2 { border-color: #4ecdc4; box-shadow: 0 0 10px rgba(78, 205, 196, 0.3); }
.skill-icon.rarity-3 { border-color: #9b59b6; box-shadow: 0 0 15px rgba(155, 89, 182, 0.4); }
.skill-icon.rarity-4 { border-color: #f39c12; box-shadow: 0 0 20px rgba(243, 156, 18, 0.5); }
.skill-icon.rarity-5 { border-color: #e74c3c; box-shadow: 0 0 25px rgba(231, 76, 60, 0.6); }

.skill-emoji {
  font-size: 26px;
}

.skill-level-badge {
  position: absolute;
  bottom: -6px;
  right: -6px;
  background: linear-gradient(135deg, #ffd700, #ff9900);
  color: #333;
  font-size: 11px;
  font-weight: bold;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.skill-name {
  margin-top: 6px;
  font-size: 11px;
  color: #ccc;
  text-align: center;
  white-space: nowrap;
}

/* 锁定状态 */
.skill-node.locked .skill-icon {
  filter: grayscale(80%);
  opacity: 0.6;
}

.lock-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 12px;
}

.lock-icon {
  font-size: 18px;
}

/* 可用状态 */
.skill-node.available .skill-icon {
  border-color: #ffd700;
  box-shadow: 0 0 15px rgba(255, 215, 0, 0.4);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 15px rgba(255, 215, 0, 0.4); }
  50% { box-shadow: 0 0 25px rgba(255, 215, 0, 0.6); }
}

/* 激活状态 */
.skill-node.activated .skill-icon {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.3), rgba(118, 75, 162, 0.3));
}

.skill-node.activated .skill-name {
  color: #fff;
}

/* 满级状态 */
.skill-node.maxed .skill-icon {
  border-color: #ffd700;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
}

.available-indicator {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 12px;
  height: 12px;
  background: #48bb78;
  border-radius: 50%;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 技能详情面板 */
.skill-detail {
  margin-top: 16px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.detail-icon {
  width: 46px;
  height: 46px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  border: 2px solid #aaa;
}

.detail-icon.rarity-1 { border-color: #aaa; }
.detail-icon.rarity-2 { border-color: #4ecdc4; }
.detail-icon.rarity-3 { border-color: #9b59b6; }
.detail-icon.rarity-4 { border-color: #f39c12; }
.detail-icon.rarity-5 { border-color: #e74c3c; }

.detail-name {
  font-size: 16px;
  font-weight: bold;
}

.detail-type {
  font-size: 11px;
  color: #aaa;
}

.detail-desc {
  font-size: 12px;
  color: #ccc;
  margin-bottom: 12px;
  line-height: 1.5;
}

/* 等级进度 */
.level-progress {
  margin-bottom: 12px;
}

.progress-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  transition: width 0.3s;
}

.progress-text {
  text-align: center;
  font-size: 11px;
  color: #aaa;
  margin-top: 4px;
}

.detail-effects {
  margin-bottom: 12px;
}

.effects-title, .req-title {
  font-size: 12px;
  color: #aaa;
  margin-bottom: 8px;
}

.effect-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.effect-item {
  display: flex;
  justify-content: space-between;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  font-size: 12px;
}

.effect-value {
  color: #4ecdc4;
  font-weight: bold;
}

.total-effect {
  margin-top: 8px;
  padding: 8px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 6px;
  font-size: 11px;
  color: #aaa;
}

.total-value {
  color: #667eea;
  font-weight: bold;
}

.detail-requirement {
  margin-bottom: 12px;
}

.req-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  margin-bottom: 6px;
  font-size: 12px;
}

.req-icon {
  font-size: 12px;
}

.req-value {
  margin-left: auto;
  color: #ffd700;
}

.detail-actions {
  display: flex;
  gap: 10px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: bold;
  transition: all 0.3s;
}

.unlock-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.upgrade-btn {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: #fff;
}

.max-btn {
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
  cursor: not-allowed;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

/* 总属性加成 */
.total-bonus {
  margin-top: 16px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
}

.bonus-title {
  font-size: 13px;
  color: #aaa;
  margin-bottom: 10px;
}

.bonus-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.bonus-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  font-size: 10px;
}

.bonus-icon {
  font-size: 12px;
}

.bonus-label {
  color: #aaa;
  flex: 1;
}

.bonus-value {
  color: #48bb78;
  font-weight: bold;
}

/* 玩家信息 */
.player-info {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-top: 16px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
}

.info-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.info-label {
  font-size: 11px;
  color: #aaa;
}

.info-value {
  font-size: 14px;
  font-weight: bold;
}

.info-value.realm {
  color: #9b59b6;
}

.info-value.level {
  color: #4ecdc4;
}
</style>