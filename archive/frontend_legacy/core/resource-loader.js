/**
 * 资源加载器
 */
const ResourceLoader = {
  config: {
    backgrounds: {},
    avatars: {},
    icons: {}
  },
  
  async load() {
    const loadingEl = document.getElementById('loadingOverlay');
    await new Promise(r => setTimeout(r, 500));
    this.applyResources();
    
    // 设置所有可用背景到全局变量
    window.NEW_BACKGROUNDS = {
      main: '/assets/bg-main-cultivation.png',
      cultivation: '/assets/bg-main-cultivation.png',
      dungeon: '/assets/bg-dungeon-gate.png',
      dungeonBattle: '/assets/bg-dungeon-battle.png',
      sectHall: '/assets/bg-sect-grand-hall.png',
      sectWar: '/assets/bg-sect-war.png',
      tribulation: '/assets/bg-tribulation-storm.png',
      equipment: '/assets/bg-equipment-panel.png',
      achievement: '/assets/bg-achievement-hall.png',
      adventure: '/assets/bg-adventure-mystery.png',
      enhance: '/assets/bg-enhance-forge.png',
      forge: '/assets/bg-enhance-forge.png',
      alchemy: '/assets/bg-cultivation-20260321-050042.png',
      offline: '/assets/bg-offline-cultivation.png',
      lundao: '/assets/bg-lundao.png',
      marriage: '/assets/bg-couple-cultivation.png',
      tutorial: '/assets/bg-tutorial-guide.png',
    };
    
    // 初始化默认背景
    if (window.setSceneBackground) {
      window.setSceneBackground('cultivation');
    }
    
    if (loadingEl) loadingEl.classList.add('hidden');
  },
  
  applyResources() {
    const root = document.documentElement;
    const bgSrc = (this.config.backgrounds && this.config.backgrounds.main)
      || (window.BACKGROUNDS && window.BACKGROUNDS.main)
      || (window.NEW_BACKGROUNDS && window.NEW_BACKGROUNDS.tutorial)
      || 'assets/bg-main-menu.png';
    root.style.setProperty('--bg-main', `url(${bgSrc})`);
    if (this.config.avatars.player) {
      root.style.setProperty('--avatar-player', `url(${this.config.avatars.player})`);
    }
    if (this.config.avatars.realm) {
      root.style.setProperty('--realm-icon', `url(${this.config.avatars.realm})`);
    }
  },
  
  setResource(type, key, url) {
    this.config[type] = this.config[type] || {};
    this.config[type][key] = url;
    this.applyResources();
  }
};
