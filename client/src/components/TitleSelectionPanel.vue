<template>
  <div class="title-selection-panel">
    <div class="panel-header">
      <div class="panel-title">🏅 称号选择</div>
      <button class="close-btn" @click="$emit('close')">×</button>
    </div>
    
    <!-- 当前装备的称号 -->
    <div class="current-title-section" v-if="equippedTitle">
      <div class="section-label">当前装备</div>
      <div class="current-title-card">
        <div class="current-title-icon">{{ equippedTitle.icon }}</div>
        <div class="current-title-info">
          <div class="current-title-name">{{ equippedTitle.name }}</div>
          <div class="current-title-bonus">
            <span v-if="equippedTitle.bonus.atk">⚔️ 攻击+{{ equippedTitle.bonus.atk }}</span>
            <span v-if="equippedTitle.bonus.def">🛡️ 防御+{{ equippedTitle.bonus.def }}</span>
            <span v-if="equippedTitle.bonus.hp">❤️ 生命+{{ equippedTitle.bonus.hp }}</span>
            <span v-if="equippedTitle.bonus.crit">💥 暴击+{{ equippedTitle.bonus.crit }}%</span>
          </div>
        </div>
        <button class="unequip-btn" @click="unequipTitle">卸下</button>
      </div>
    </div>
    
    <!-- 称号属性预览 -->
    <div class="preview-section" v-if="previewTitle">
      <div class="section-label">属性预览</div>
      <div class="preview-card">
        <div class="preview-icon">{{ previewTitle.icon }}</div>
        <div class="preview-name">{{ previewTitle.name }}</div>
        <div class="preview-bonus">
          <div class="bonus-title">获得属性:</div>
          <div class="bonus-list">
            <span v-if="previewTitle.bonus.atk" class="bonus-item atk">⚔️ 攻击 +{{ previewTitle.bonus.atk }}</span>
            <span v-if="previewTitle.bonus.def" class="bonus-item def">🛡️ 防御 +{{ previewTitle.bonus.def }}</span>
            <span v-if="previewTitle.bonus.hp" class="bonus-item hp">❤️ 生命 +{{ previewTitle.bonus.hp }}</span>
            <span v-if="previewTitle.bonus.crit" class="bonus-item crit">💥 暴击 +{{ previewTitle.bonus.crit }}%</span>
            <span v-if="previewTitle.bonus.speed" class="bonus-item speed">⚡ 速度 +{{ previewTitle.bonus.speed }}</span>
          </div>
        </div>
        <button v-if="previewTitle.owned && !previewTitle.equipped" class="equip-btn" @click="equipTitle(previewTitle)">装备称号</button>
        <div v-else-if="previewTitle.owned && previewTitle.equipped" class="equipped-badge">已装备</div>
        <div v-else class="locked-hint">🔒 解锁条件: {{ previewTitle.unlockDesc }}</div>
      </div>
    </div>
    
    <!-- 称号列表 -->
    <div class="title-list-section">
      <div class="section-label">已解锁称号 ({{ unlockedCount }}/{{ titles.length }})</div>
      <div class="title-grid">
        <div 
          v-for="title in titles" 
          :key="title.id"
          class="title-card"
          :class="{ 
            owned: title.owned, 
            equipped: title.equipped,
            locked: !title.owned,
            selected: previewTitle?.id === title.id
          }"
          @click="previewTitle = title"
        >
          <div class="title-icon">{{ title.icon }}</div>
          <div class="title-name">{{ title.name }}</div>
          <div class="title-status">
            <span v-if="title.equipped" class="status-equipped">✅</span>
            <span v-else-if="title.owned" class="status-owned">✓</span>
            <span v-else class="status-locked">🔒</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 进度信息 -->
    <div class="progress-section">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
      <div class="progress-info">
        <span>累计灵气: {{ formatNumber(playerExp) }}</span>
        <span v-if="nextTitle">距离「{{ nextTitle.name }}」还需 {{ formatNumber(nextTitle.requirement - playerExp) }}</span>
        <span v-else>🌟 已解锁全部称号!</span>
      </div>
    </div>
  </div>
</template>

<script>
const { ref, computed, onMounted } = Vue;

export default {
  name: 'TitleSelectionPanel',
  emits: ['close'],
  setup(props, { emit }) {
    const titles = ref([]);
    const equippedTitle = ref(null);
    const previewTitle = ref(null);
    const playerExp = ref(0);
    
    const unlockedCount = computed(() => titles.value.filter(t => t.owned).length);
    const progressPercent = computed(() => Math.min(100, (unlockedCount.value / titles.value.length) * 100));
    const nextTitle = computed(() => titles.value.find(t => !t.owned));
    
    const formatNumber = (num) => {
      if (num >= 100000000) return (num / 100000000).toFixed(1) + '亿';
      if (num >= 10000) return (num / 10000).toFixed(1) + '万';
      return num.toString();
    };
    
    const loadTitles = async () => {
      try {
        const playerData = JSON.parse(localStorage.getItem('playerData') || '{}');
        playerExp.value = playerData.total_exp || 150000;
        const equippedId = playerData.equipped_title || null;
        
        const titleData = [
          { id: 'newbie', name: '初入仙途', requirement: 0, unlockDesc: '暂无', bonus: { atk: 5 }, icon: '🌱' },
          { id: 'cultivator', name: '修士', requirement: 1000, unlockDesc: '累计1000灵气', bonus: { atk: 15, hp: 50 }, icon: '🌿' },
          { id: 'qi_refiner', name: '练气期', requirement: 5000, unlockDesc: '累计5000灵气', bonus: { atk: 30, hp: 100 }, icon: '🔥' },
          { id: 'foundation_builder', name: '筑基期', requirement: 20000, unlockDesc: '累计20000灵气', bonus: { atk: 60, hp: 200, def: 20 }, icon: '💎' },
          { id: 'core_former', name: '金丹期', requirement: 50000, unlockDesc: '累计50000灵气', bonus: { atk: 120, hp: 500, def: 50 }, icon: '🌟' },
          { id: 'nascent_soul', name: '元婴期', requirement: 150000, unlockDesc: '累计150000灵气', bonus: { atk: 250, hp: 1000, def: 100, crit: 5 }, icon: '👼' },
          { id: 'immortal', name: '化神期', requirement: 500000, unlockDesc: '累计500000灵气', bonus: { atk: 500, hp: 2000, def: 200, crit: 10 }, icon: '🧘' },
          { id: 'legend', name: '炼虚期', requirement: 1500000, unlockDesc: '累计1500000灵气', bonus: { atk: 1000, hp: 5000, def: 400, crit: 15 }, icon: '🏆' },
          { id: 'demigod', name: '大乘期', requirement: 5000000, unlockDesc: '累计5000000灵气', bonus: { atk: 2000, hp: 10000, def: 800, crit: 20, speed: 50 }, icon: '👑' },
          { id: 'god', name: '仙人', requirement: 20000000, unlockDesc: '累计20000000灵气', bonus: { atk: 5000, hp: 25000, def: 2000, crit: 30, speed: 100 }, icon: '✨' }
        ];
        
        titles.value = titleData.map(title => ({
          ...title,
          owned: playerExp.value >= title.requirement,
          equipped: equippedId === title.id
        }));
        
        if (equippedId) {
          equippedTitle.value = titles.value.find(t => t.id === equippedId);
          previewTitle.value = equippedTitle.value;
        } else {
          previewTitle.value = titles.value.find(t => t.owned) || titles.value[0];
        }
      } catch (e) {
        console.error('加载称号失败:', e);
      }
    };
    
    const equipTitle = async (title) => {
      if (!title.owned) return;
      try {
        const playerData = JSON.parse(localStorage.getItem('playerData') || '{}');
        playerData.equipped_title = title.id;
        localStorage.setItem('playerData', JSON.stringify(playerData));
        
        titles.value.forEach(t => t.equipped = false);
        title.equipped = true;
        equippedTitle.value = title;
        alert('✅ 装备称号「' + title.name + '」成功');
      } catch (e) {
        console.error('装备称号失败:', e);
      }
    };
    
    const unequipTitle = async () => {
      try {
        const playerData = JSON.parse(localStorage.getItem('playerData') || '{}');
        playerData.equipped_title = null;
        localStorage.setItem('playerData', JSON.stringify(playerData));
        
        if (equippedTitle.value) equippedTitle.value.equipped = false;
        equippedTitle.value = null;
        alert('✅ 卸下称号成功');
      } catch (e) {
        console.error('卸下称号失败:', e);
      }
    };
    
    onMounted(() => { loadTitles(); });
    
    return { titles, equippedTitle, previewTitle, playerExp, unlockedCount, progressPercent, nextTitle, formatNumber, equipTitle, unequipTitle };
  }
};
</script>

<style scoped>
.title-selection-panel { width: 520px; max-height: 700px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 20px; color: #fff; }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.panel-title { font-size: 20px; font-weight: bold; }
.close-btn { background: none; border: none; color: #888; font-size: 24px; cursor: pointer; }
.section-label { font-size: 13px; color: #aaa; margin-bottom: 10px; }
.current-title-section { margin-bottom: 20px; }
.current-title-card { display: flex; align-items: center; gap: 15px; padding: 15px; background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.05)); border: 1px solid rgba(255, 215, 0, 0.3); border-radius: 12px; }
.current-title-icon { font-size: 36px; }
.current-title-info { flex: 1; }
.current-title-name { font-size: 16px; font-weight: bold; color: #ffd700; margin-bottom: 5px; }
.current-title-bonus { font-size: 11px; color: #aaa; }
.current-title-bonus span { margin-right: 10px; }
.unequip-btn { padding: 8px 16px; background: rgba(255, 107, 107, 0.2); border: 1px solid rgba(255, 107, 107, 0.3); border-radius: 8px; color: #ff6b6b; font-size: 12px; cursor: pointer; transition: all 0.2s; }
.unequip-btn:hover { background: rgba(255, 107, 107, 0.3); }
.preview-section { margin-bottom: 20px; }
.preview-card { padding: 15px; background: rgba(255, 255, 255, 0.05); border-radius: 12px; text-align: center; }
.preview-icon { font-size: 48px; margin-bottom: 10px; }
.preview-name { font-size: 18px; font-weight: bold; color: #ffd700; margin-bottom: 12px; }
.preview-bonus { margin-bottom: 15px; }
.bonus-title { font-size: 12px; color: #888; margin-bottom: 8px; }
.bonus-list { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
.bonus-item { padding: 4px 10px; border-radius: 12px; font-size: 11px; }
.bonus-item.atk { background: rgba(255, 107, 107, 0.2); color: #ff6b6b; }
.bonus-item.def { background: rgba(96, 165, 250, 0.2); color: #60a5fa; }
.bonus-item.hp { background: rgba(74, 222, 128, 0.2); color: #4ade80; }
.bonus-item.crit { background: rgba(255, 215, 0, 0.2); color: #ffd700; }
.bonus-item.speed { background: rgba(167, 139, 250, 0.2); color: #a78bfa; }
.equip-btn { padding: 10px 24px; background: linear-gradient(135deg, #ffd700, #ff8c00); border: none; border-radius: 8px; color: #000; font-size: 13px; font-weight: bold; cursor: pointer; transition: all 0.3s; }
.equip-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4); }
.equipped-badge { padding: 10px 24px; background: rgba(74, 222, 128, 0.2); border-radius: 8px; color: #4ade80; font-size: 13px; font-weight: bold; }
.locked-hint { padding: 10px; background: rgba(255, 255, 255, 0.05); border-radius: 8px; color: #888; font-size: 12px; }
.title-list-section { margin-bottom: 20px; }
.title-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; max-height: 200px; overflow-y: auto; }
.title-card { display: flex; flex-direction: column; align-items: center; padding: 12px 8px; background: rgba(255, 255, 255, 0.05); border-radius: 10px; border: 2px solid transparent; cursor: pointer; transition: all 0.3s; }
.title-card:hover { background: rgba(255, 255, 255, 0.1); }
.title-card.owned { border-color: rgba(0, 255, 136, 0.2); }
.title-card.equipped { background: rgba(255, 215, 0, 0.1); border-color: rgba(255, 215, 0, 0.4); }
.title-card.selected { border-color: #ffd700; box-shadow: 0 0 10px rgba(255, 215, 0, 0.3); }
.title-card.locked { opacity: 0.5; cursor: not-allowed; }
.title-icon { font-size: 24px; margin-bottom: 5px; }
.title-name { font-size: 10px; color: #aaa; text-align: center; }
.title-card.owned .title-name { color: #fff; }
.title-status { font-size: 10px; margin-top: 5px; }
.status-equipped { color: #ffd700; }
.status-owned { color: #4ade80; }
.status-locked { color: #666; }
.progress-section { padding-top: 15px; border-top: 1px solid rgba(255, 255, 255, 0.1); }
.progress-bar { height: 10px; background: rgba(255, 255, 255, 0.1); border-radius: 5px; overflow: hidden; margin-bottom: 10px; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #ffd700, #ff8c00); border-radius: 5px; transition: width 0.5s; }
.progress-info { display: flex; justify-content: space-between; font-size: 11px; color: #888; }
</style>
