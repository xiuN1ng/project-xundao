// ==================== 游戏初始化 ====================
let game;

function initGame() {
  // 隐藏初始加载遮罩
  const loadingOverlay = document.getElementById('initialLoading');
  if (loadingOverlay) {
    loadingOverlay.classList.add('hidden');
    setTimeout(() => loadingOverlay.remove(), 500);
  }
  
  initElements();
  game = new CultivationGame();
  
  // 初始化活动系统
  if (typeof initEventSystem === 'function') {
    initEventSystem();
  }
  
  // 初始化好友系统
  if (typeof initFriendSystem === 'function') {
    initFriendSystem();
  }
  
  // 新玩家赠送初始法宝和材料
  const state = game.getState();
  if (!state.player.owned_artifacts || state.player.owned_artifacts.length === 0) {
    game.addArtifact('iron_sword');
    game.addArtifact('iron_armor');
    game.addArtifact('jade_ring');
    game.addArtifact('spirit_bead');
    state.player.artifacts_inventory = {
      'forging_ore': 200,
      'refined_gold': 20,
      'spirit_essence': 50,
      'jade_ore': 100,
      'enhance_stone': 50
    };
  }
  
  // 新玩家赠送初始功法
  if (!state.player.techniques || state.player.techniques.length === 0) {
    if (typeof learnTechnique === 'function') {
      learnTechnique('basic_breathing');
      learnTechnique('basic_sword');
    }
  }
  
  // 新玩家赠送初始灵兽
  if (!state.player.beasts || state.player.beasts.length === 0) {
    state.player.beasts = [
      { id: 'spirit_beast', level: 1, exp: 0, affection: 50, mood: 'normal', mood_timer: 0, obtainedAt: Date.now() }
    ];
  }
  
  // 初始灵石
  if (state.player.spiritStones < 2000) {
    state.player.spiritStones = 2000;
  }
  
  // 初始灵气
  if (state.player.cultivation < 100) {
    state.player.cultivation = 100;
  }
  
  // 初始化境界副本数据
  if (typeof initRealmDungeonData === 'function') {
    initRealmDungeonData();
  }
  
  game.subscribe(updateUI);
  game.start();
  updateUI(game.getState());
  
  // 渲染UI
  renderEnemies();
  renderDungeons();
  renderBuildings();
  renderTechniques();
  
  // 初始化仙界展示系统
  if (typeof initImmortalRealmDisplay === 'function') {
    initImmortalRealmDisplay();
    updateImmortalRealmDisplay();
    updateImmortalQuestDisplay();
    updateSharedBossDisplay();
  }
  
  // 欢迎信息
  addLog('🎮 欢迎来到寻道修仙世界！', 'important');
  addLog('💡 提示1：点击「修炼」开始挂机获得灵气', 'tip');
  addLog('💡 提示2：灵气足够后挑战「战斗」获得经验', 'tip');
  addLog('💡 提示3：加入宗门可获得属性加成', 'tip');
  addLog('💡 提示4：灵兽会跟随你修炼并提升属性', 'tip');
  
  // 首次玩家显示欢迎弹窗
  setTimeout(() => {
    const state = game.getState();
    if (state && state.stats && state.stats.totalCultivateTime < 30) {
      const welcomeModal = document.getElementById('welcomeModal');
      if (welcomeModal) welcomeModal.classList.add('active');
    }
  }, 1500);
  
  // 检查离线收益
  setTimeout(() => {
    const state = game.getState();
    if (state.stats.offlineEarnings > 0) {
      addLog('🌙 离线收益: +' + fmt(state.stats.offlineEarnings) + ' 灵气', 'success');
      showFloatText('+' + fmt(state.stats.offlineEarnings) + ' 灵气', 'spirit');
    }
  }, 500);
  
  // 启动新手提示系统
  if (typeof startNewbieTips === 'function') startNewbieTips();
  
  // 初始化离线收益跟踪
  if (typeof initOfflineTracking === 'function') initOfflineTracking();
  
  // 启动离线信息定时刷新
  if (typeof startOfflineInfoRefresh === 'function') startOfflineInfoRefresh();
  
  // 加载存档数据
  if (window.authToken && window.playerId) {
    setTimeout(async () => {
      const loaded = await loadGame();
      if (loaded) {
        updateUI(game.getState());
        addLog('📥 存档加载成功', 'success');
      }
    }, 500);
  }
  
  // 启动自动保存
  startAutoSave();
  
  // 启动API健康检查
  if (typeof startApiHealthCheck === 'function') startApiHealthCheck();
}
