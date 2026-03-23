function updateUI(state) {
  // 更新移动端顶部状态栏
  updateMobileTopBar();
  
  const { player, realm, nextRealm, stats, playerStats } = state;
  
  elements.playerRealm.textContent = realm.name;
  elements.playerLevel.textContent = `Lv.${player.level}`;
  elements.currentRealm.textContent = realm.name;
  elements.nextRealmText.textContent = nextRealm ? `下一境界: ${nextRealm.name}` : '已达最高境界';
  
  // 更新境界进度条
  const realmProgressFill = document.getElementById('realmProgressFill');
  const realmProgressText = document.getElementById('realmProgressText');
  if (realmProgressFill && realmProgressText && nextRealm) {
    const requiredSpirit = realm.baseCultivation * 10;
    const progressPercent = Math.min((player.spirit / requiredSpirit * 100), 100).toFixed(1);
    realmProgressFill.style.width = progressPercent + '%';
    realmProgressText.textContent = `${fmt(Math.floor(player.spirit))} / ${fmt(requiredSpirit)} 灵气`;
    
    // 根据进度设置不同的颜色
    realmProgressFill.classList.remove('high', 'medium');
    if (progressPercent >= 90) {
      realmProgressFill.classList.add('high');
    } else if (progressPercent >= 50) {
      realmProgressFill.classList.add('medium');
    }
  } else if (realmProgressText) {
    realmProgressText.textContent = '已达最高境界';
    realmProgressFill.style.width = '100%';
  }
  
  const canBreakthrough = nextRealm && player.spirit >= realm.baseCultivation * 10;
  elements.btnBreakthrough.disabled = !canBreakthrough;
  // 添加/移除准备就绪动画
  if (canBreakthrough) {
    elements.btnBreakthrough.classList.add('btn-breakthrough-ready');
  } else {
    elements.btnBreakthrough.classList.remove('btn-breakthrough-ready');
  }
  
  // 战斗属性
  elements.playerHp.textContent = Math.floor(playerStats.hp);
  elements.playerMaxHp.textContent = playerStats.maxHp;
  elements.playerHpBar.style.width = (playerStats.hp / playerStats.maxHp * 100) + '%';
  elements.playerAtk.textContent = playerStats.atk;
  elements.playerDef.textContent = playerStats.def;
  
  // 资源
  const spiritPct = (player.spirit / player.maxSpirit * 100).toFixed(1);
  elements.spiritText.textContent = `${fmt(player.spirit)}/${fmt(player.maxSpirit)}`;
  elements.spiritBar.style.width = spiritPct + '%';
  elements.spiritPercent.textContent = spiritPct + '%';
  
  // 境界就绪状态（灵气达到90%以上时显示动画）
  if (spiritPct >= 90 && nextRealm) {
    elements.currentRealm.classList.add('ready');
  } else {
    elements.currentRealm.classList.remove('ready');
  }
  
  const expPct = (player.experience / player.requiredExp * 100).toFixed(1);
  elements.expText.textContent = `Lv.${player.level}`;
  elements.expBar.style.width = expPct + '%';
  elements.expPercent.textContent = expPct + '%';
  
  // 灵石变化动画
  const oldStones = elements.spiritStones.textContent;
  elements.spiritStones.textContent = fmt(player.spiritStones);
  if (oldStones !== elements.spiritStones.textContent) {
    elements.spiritStones.classList.add('pulse');
    setTimeout(() => elements.spiritStones.classList.remove('pulse'), 400);
  }
  
  elements.manualGain.textContent = fmt(Math.floor(player.spiritRate * realm.multiplier * 5));
  elements.upgradeCost.textContent = fmt(Math.floor(10 * Math.pow(1.5, player.level)));
  
  elements.totalSpirit.textContent = fmt(stats.totalSpirit);
  elements.combatWins.textContent = stats.combatWins;
  elements.spiritRate.textContent = fmt(state.currentSpiritRate);
  
  // 数值变化动画
  ['totalSpirit', 'combatWins', 'spiritRate'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('pulse');
      void el.offsetWidth; // 触发重绘
      el.classList.add('pulse');
      setTimeout(() => el.classList.remove('pulse'), 400);
    }
  });
  
  // 更新法宝槽位
  if (typeof updateArtifactSlots === 'function') {
    updateArtifactSlots();
  }
  elements.techniquePoints.textContent = player.techniquePoints;
  
  // 洞府资源
  elements.resHerbs.textContent = Math.floor(state.caveResources.herbs);
  elements.resPills.textContent = Math.floor(state.caveResources.pills);
  elements.resMaterials.textContent = Math.floor(state.caveResources.materials);
  elements.resEquipment.textContent = Math.floor(state.caveResources.equipment);
}

