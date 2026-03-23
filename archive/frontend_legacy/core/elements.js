/**
 * DOM元素引用模块
 */
const elements = {};

function initElements() {
  const ids = [
    'playerName','playerRealm','playerLevel','currentRealm','nextRealmText',
    'playerAvatar','realmIcon','btnBreakthrough',
    'playerHp','playerMaxHp','playerHpBar','playerAtk','playerDef',
    'enemyList','dungeonList',
    'resHerbs','resPills','resMaterials','resEquipment',
    'buildingList','techniquePanels','techniquePoints',
    'spiritText','spiritBar','spiritPercent','expText','expBar','expPercent',
    'spiritStones','manualGain','upgradeCost','totalSpirit','combatWins',
    'spiritRate','logContainer','logCount'
  ];
  ids.forEach(id => { elements[id] = document.getElementById(id); });
  
  if (elements.playerAvatar) {
    elements.playerAvatar.addEventListener('click', function() {
      this.classList.add('clicked');
      showFloatText('🧘 修炼中...', 'spirit');
      setTimeout(() => this.classList.remove('clicked'), 300);
    });
  }
}

export { elements, initElements };
