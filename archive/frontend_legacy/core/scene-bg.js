// ==================== 场景背景图切换 ====================
function setSceneBackground(bgKey) {
  const bgImg = document.getElementById('scene-bg');
  if (!bgImg) return;
  const src = (window.RESOURCES && window.RESOURCES.backgrounds && window.RESOURCES.backgrounds[bgKey])
    || (window.BACKGROUNDS && window.BACKGROUNDS[bgKey])
    || (window.NEW_BACKGROUNDS && window.NEW_BACKGROUNDS[bgKey]);
  if (src) {
    bgImg.src = src;
    bgImg.style.display = 'block';
    bgImg.style.opacity = '0.85';
  } else {
    bgImg.style.display = 'none';
  }
}

// 场景背景切换钩子：在主要面板打开时自动切换背景
// 监听 showPanel 调用，自动切换场景背景
const __originalShowPanel = window.__UIComponents ? window.__UIComponents.showPanel : null;
window.__UIComponents = window.__UIComponents || {};
window.__UIComponents.showPanel = function(name, props) {
  // 根据面板名称切换场景背景
  if (name === 'TutorialPanel') {
    setSceneBackground('tutorial');
  } else if (name === 'TribulationPanel') {
    setSceneBackground('tribulationStorm');
  } else if (name === 'GuildPanel' || name === 'MasterPanel' || name === 'MasterDisciplePanel') {
    setSceneBackground('sectHall');
  } else if (name === 'ShopPanel' || name === 'TradePanel' || name === 'AuctionPanel') {
    setSceneBackground('shop');
  } else if (name === 'DungeonSelectionPanel' || name === 'BattleEffectPanel') {
    setSceneBackground('dungeon');
  } else if (name === 'EnhancementPanel' || name === 'EquipmentRefinePanel' ||
             name === 'GongfaPanel' || name === 'SpiritRootPanel') {
    setSceneBackground('cave');
  } else if (name === 'GachaPanel' || name === 'PetPanel' || name === 'PetEvolutionPanel') {
    setSceneBackground('alchemy');
  } else if (name === 'OfflineCultivationPanel') {
    setSceneBackground('offline');
  }
  // 调用原始 showPanel
  if (__originalShowPanel) {
    __originalShowPanel.call(window.__UIComponents, name, props);
  }
};

// 也直接暴露到全局
window.setSceneBackground = setSceneBackground;
  </script>
