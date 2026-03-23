function handleCultivate(btn) {
  setButtonLoading(btn, true);
  AudioManager.playCultivate(); // 播放修炼音效
  setTimeout(() => {
    try {
      game.manualCultivate();
      // 显示修炼飘字
      const state = game.getState();
      showFloatText('+' + fmt(Math.floor(state.player.spiritRate * state.realm.multiplier * 5)) + ' 灵气', 'spirit');
      // 保存到服务器（失败不影响UI更新）
      saveGame(false).catch(err => console.warn('保存失败:', err));
    } catch (e) {
      console.error('修炼出错:', e);
    } finally {
      setButtonLoading(btn, false);
    }
  }, 100);
}

// 收集资源按钮处理
function handleCollectResources(btn) {
  setButtonLoading(btn, true);
  setTimeout(() => {
    const r = game.collectCaveResources();
    if (typeof showToast === 'function') {
      showToast(r.message, r.success ? 'success' : 'warning');
    }
    saveGame(false); // 保存到服务器
    setButtonLoading(btn, false);
  }, 200);
}

// 渡劫按钮处理
function handleTribulation(btn) {
  setButtonLoading(btn, true);
  setTimeout(() => {
    openTribulationModal();
    setButtonLoading(btn, false);
  }, 100);
}

// 突破境界按钮处理
function handleBreakthrough(btn) {
  setButtonLoading(btn, true);
  AudioManager.playSuccess(); // 播放突破成功音效
  setTimeout(() => {
    try {
      const result = game.breakRealm();
      if (result.success) {
        showToast('🎉 ' + result.message, 'success');
        updatePlayerInfo();
        renderRealmProgress();
        // 显示境界提升飘字
        showFloatText('境界突破！', 'bonus');
        saveGame(false).catch(err => console.warn('保存失败:', err));
      } else {
        showToast(result.message, 'warning');
      }
    } catch (e) {
      console.error('突破出错:', e);
      showToast('操作失败', 'error');
    } finally {
      setButtonLoading(btn, false);
    }
  }, 100);
}

// 逃跑按钮处理
function handleFlee(btn) {
  setButtonLoading(btn, true);
  setTimeout(() => {
    const result = game.flee();
    if (typeof renderEnemies === 'function') renderEnemies();
    saveGame(false); // 保存到服务器
    setButtonLoading(btn, false);
  }, 100);
}

// 升级建筑按钮处理
function handleUpgradeBuilding(btn, buildingId) {
  setButtonLoading(btn, true);
  AudioManager.playUpgrade(); // 播放升级音效
  setTimeout(() => {
    const result = game.upgradeBuilding(buildingId);
    if (result.success) {
      showToast(result.message, 'success');
      if (typeof renderBuildingList === 'function') renderBuildingList();
    } else {
      showToast(result.message, 'error');
      AudioManager.playError();
    }
    saveGame(false); // 保存到服务器
    setButtonLoading(btn, false);
  }, 100);
}

// 学习功法按钮处理
function handleLearnTechnique(btn, cat, techId) {
  setButtonLoading(btn, true);
  AudioManager.playUpgrade(); // 播放学习音效
  setTimeout(() => {
    const result = game.learnTechnique(cat, techId);
    if (result.success) {
      showToast(result.message, 'success');
      if (typeof renderTechniques === 'function') renderTechniques();
    } else {
      showToast(result.message, 'warning');
    }
    saveGame(false); // 保存到服务器
    setButtonLoading(btn, false);
  }, 100);
}

// 升级灵气上限按钮处理
function handleUpgradeSpiritCap(btn) {
  setButtonLoading(btn, true);
  AudioManager.playUpgrade(); // 播放升级音效
  setTimeout(() => {
    const state = game.getState();
    const cost = Math.floor(10 * Math.pow(1.5, state.player.level));
    
    if (state.player.spiritStones < cost) {
      showToast('灵石不足！需要 ' + cost + ' 灵石', 'error');
      AudioManager.playError();
      setButtonLoading(btn, false);
      return;
    }
    
    const result = game.upgradeSpiritCap();
    if (result.success) {
      state.player.spiritStones -= cost;
      showToast('✅ 灵气上限提升至 ' + state.player.maxSpirit, 'success');
      showFloatText('🔮 灵气上限+' + Math.floor(state.player.maxSpirit * 0.5), 'spirit');
      AudioManager.playSuccess();
      updateUI(game.getState());
    } else {
      showToast(result.message, 'error');
      AudioManager.playError();
    }
    saveGame(false); // 保存到服务器
    setButtonLoading(btn, false);
  }, 100);
}

function addLog(msg, type = '') {
  const c = elements.logContainer;
  const t = new Date().toTimeString().slice(0, 5);
  const e = document.createElement('div');
  e.className = `log-entry ${type}`;
  e.innerHTML = `<span class="log-time">${t}</span>${msg}`;
  c.insertBefore(e, c.firstChild);
  while (c.children.length > 50) c.removeChild(c.lastChild);
  // 更新日志数量
  if (elements.logCount) {
    elements.logCount.textContent = c.children.length + '条';
  }
}
