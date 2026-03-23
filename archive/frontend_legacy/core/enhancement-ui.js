// ==================== 强化系统 UI ====================
let selectedEnhanceArtifact = null;

function renderEnhanceUI() {
  const selectContainer = document.getElementById('enhanceSelect');
  const infoContainer = document.getElementById('enhanceInfo');
  const artifacts = gameState.player.owned_artifacts || [];
  
  if (artifacts.length === 0) {
    selectContainer.innerHTML = '<div style="color:#666;padding:10px">还没有法宝</div>';
    return;
  }
  
  // 渲染可强化的法宝列表
  let html = '';
  for (const art of artifacts) {
    const data = ARTIFACT_DATA[art.id];
    if (!data) continue;
    
    const isSelected = selectedEnhanceArtifact && selectedEnhanceArtifact.id === art.id;
    const canEnhance = (art.level || 1) < 15; // 最高+15
    
    html += `<div class="enhance-item ${isSelected ? 'selected' : ''}" onclick="selectEnhanceArtifact('${art.id}')" ${!canEnhance ? 'style="opacity:0.5"' : ''}>
      <div class="enhance-item-name">${data.name}</div>
      <div class="enhance-item-level">+${art.level || 1} ${!canEnhance ? '(满级)' : ''}</div>
    </div>`;
  }
  selectContainer.innerHTML = html;
  
  // 渲染强化信息
  if (selectedEnhanceArtifact) {
    renderEnhanceInfo(selectedEnhanceArtifact);
  } else {
    infoContainer.innerHTML = '<div style="color:#666;text-align:center;padding:20px">选择一个法宝进行强化</div>';
  }
}

function selectEnhanceArtifact(artifactId) {
  const artifacts = gameState.player.owned_artifacts || [];
  selectedEnhanceArtifact = artifacts.find(a => a.id === artifactId);
  renderEnhanceUI();
}

function renderEnhanceInfo(artifact) {
  const container = document.getElementById('enhanceInfo');
  const data = ARTIFACT_DATA[artifact.id];
  const level = artifact.level || 1;
  const nextLevel = level + 1;
  
  if (level >= 15) {
    container.innerHTML = `<div class="enhance-result success">
      <div class="enhance-result-text">⚭� 法宝已达满级 +15</div>
    </div>`;
    return;
  }
  
  // 计算强化费用
  const baseCost = Math.floor(50 * Math.pow(1.5, level));
  const stoneCost = baseCost;
  const oreCost = Math.floor(10 * Math.pow(1.3, level));
  
  // 获取保底信息
  const pityInfo = getEnhancePityInfo(artifact);
  
  // 成功率计算
  let successRate = 1.0;
  if (level >= 4) {
    successRate = Math.max(0.02, 1 - level * 0.1); // +4=60%, +5=50%, ...
  }
  if (pityInfo && pityInfo.isPityTriggered) {
    successRate = 1.0; // 保底触发，100%成功
  }
  
  const inv = gameState.player.artifacts_inventory || {};
  const hasStones = gameState.player.spiritStones >= stoneCost;
  const hasOre = (inv.enhance_stone || 0) >= oreCost;
  const canEnhance = hasStones && hasOre;
  
  // 渲染保底进度条
  let pityHtml = '';
  if (pityInfo) {
    const pityPercent = (pityInfo.currentCount / pityInfo.pityCount) * 100;
    pityHtml = `<div class="enhance-pity-bar">
      <div class="enhance-pity-fill" style="width:${pityPercent}%"></div>
    </div>
    <div class="enhance-pity-text">
      <span>保底进度: ${pityInfo.currentCount}/${pityInfo.pityCount}</span>
      <span class="${pityInfo.isPityTriggered ? 'enhance-pity-active' : ''}">${pityInfo.isPityTriggered ? '🎉 保底已触发！' : `距离保底 ${pityInfo.remainingCount} 次`}</span>
    </div>`;
    if (pityInfo.isPityTriggered) {
      pityHtml += `<div class="enhance-pity-notice">✨ 本次强化必定成功！</div>`;
    }
  }
  
  container.innerHTML = `
    <div class="enhance-info-row">
      <span class="enhance-info-label">当前等级</span>
      <span class="enhance-info-value">+${level}</span>
    </div>
    <div class="enhance-info-row">
      <span class="enhance-info-label">目标等级</span>
      <span class="enhance-info-value" style="color:#ffd700">+${nextLevel}</span>
    </div>
    <div class="enhance-info-row">
      <span class="enhance-info-label">成功率</span>
      <span class="enhance-success-rate">${(successRate * 100).toFixed(0)}%</span>
    </div>
    ${pityHtml}
    <div class="enhance-cost">
      <div class="enhance-cost-item ${hasStones ? 'affordable' : 'not-affordable'}">
        🪙 灵石: ${stoneCost} ${hasStones ? '✓' : '✗'}
      </div>
      <div class="enhance-cost-item ${hasOre ? 'affordable' : 'not-affordable'}">
        💎 强化石: ${oreCost} ${hasOre ? '✓' : '✗'}
      </div>
    </div>
    <button class="enhance-btn" onclick="enhanceArtifactUI()" ${canEnhance ? '' : 'disabled'}>
      ⚡ 强化到 +${nextLevel}
    </button>
  `;
}

function enhanceArtifactUI() {
  if (!selectedEnhanceArtifact) {
    addLog('请先选择一个法宝', 'error');
    return;
  }
  
  const artifact = selectedEnhanceArtifact;
  const level = artifact.level || 1;
  
  if (level >= 15) {
    addLog('法宝已达满级', 'error');
    return;
  }
  
  const baseCost = Math.floor(50 * Math.pow(1.5, level));
  const stoneCost = baseCost;
  const oreCost = Math.floor(10 * Math.pow(1.3, level));
  
  if (gameState.player.spiritStones < stoneCost) {
    addLog('灵石不足', 'error');
    return;
  }
  
  const inv = gameState.player.artifacts_inventory || {};
  if ((inv.enhance_stone || 0) < oreCost) {
    addLog('强化石不足', 'error');
    return;
  }
  
  // 扣除材料
  gameState.player.spiritStones -= stoneCost;
  inv.enhance_stone = (inv.enhance_stone || 0) - oreCost;
  
  // 获取保底信息
  const pityInfo = getEnhancePityInfo(artifact);
  
  // 计算成功概率
  let successRate = 1.0;
  if (level >= 4) {
    successRate = Math.max(0.02, 1 - level * 0.1);
  }
  
  // 检查是否触发保底
  const isPity = pityInfo && pityInfo.isPityTriggered;
  if (isPity) {
    successRate = 1.0;
  }
  
  // 执行强化
  const success = Math.random() < successRate;
  
  const infoContainer = document.getElementById('enhanceInfo');
  
  if (success) {
    artifact.level = (artifact.level || 1) + 1;
    // 重置保底
    if (level >= 4) {
      resetEnhancePity(artifact);
    }
    
    infoContainer.innerHTML = `<div class="enhance-result success">
      <div class="enhance-result-text">🎉 强化成功！法宝升级到 +${artifact.level} 级！</div>
    </div>`;
    addLog(`🎉 法宝强化成功！升级到 +${artifact.level} 级！`, 'success');
  } else {
    // 增加保底计数
    if (level >= 4) {
      const player = gameState.player;
      if (!player.enhance_pity) player.enhance_pity = {};
      const pityKey = `artifact_pity_${artifact.id}_${level}`;
      player.enhance_pity[pityKey] = (player.enhance_pity[pityKey] || 0) + 1;
      
      const newPityInfo = getEnhancePityInfo(artifact);
      infoContainer.innerHTML = `<div class="enhance-result fail">
        <div class="enhance-result-text">💔 强化失败...${newPityInfo ? `距离保底还需${newPityInfo.remainingCount}次` : ''}</div>
      </div>`;
    } else {
      infoContainer.innerHTML = `<div class="enhance-result fail">
        <div class="enhance-result-text">💔 强化失败...</div>
      </div>`;
    }
    addLog('💔 强化失败...', 'error');
  }
  
  // 刷新UI
  renderEnhanceUI();
  renderOwnedArtifacts();
  updateArtifactSlots();
}
  const container = document.getElementById('materialInventory');
  const inv = gameState.player.artifacts_inventory || {};
  const materials = ['forging_ore', 'refined_gold', 'spirit_essence', 'fire_essence', 'thunder_essence', 'jade_essence', 'void_essence', 'dragon_scale', 'immortal_iron'];
  
  let html = '';
  for (const mat of materials) {
    const data = HEAVEN_TREASURE_DATA[mat];
    const count = inv[mat] || 0;
    if (count > 0 || mat === 'forging_ore' || mat === 'refined_gold' || mat === 'spirit_essence') {
      const color = data?.quality === 'divine' ? '#FF4500' : data?.quality === 'immortal' ? '#FFD700' : data?.quality === 'treasure' ? '#1E90FF' : '#888';
      html += `<div style="padding:6px 10px;background:rgba(0,0,0,0.4);border-radius:6px;border:1px solid ${color};font-size:12px;transition:all 0.2s;cursor:default" title="${data?.desc || ''}">
        ${data?.name || mat} x${count}
      </div>`;
    }
  }
  container.innerHTML = html || '<div style="color:#666;font-size:12px">暂无材料</div>';
}

function renderOwnedArtifacts() {
  const container = document.getElementById('ownedArtifacts');
  const artifacts = gameState.player.owned_artifacts || [];
  const equip = gameState.player.artifact_equipment || {};
  
  if (artifacts.length === 0) {
    container.innerHTML = '<div style="color:#666;text-align:center;padding:20px">还没有法宝，快去获取吧！</div>';
    return;
  }
  
  let html = '';
  for (const art of artifacts) {
    const data = ARTIFACT_DATA[art.id];
    if (!data) continue;
    
    const isEquipped = Object.values(equip).some(e => e && e.id === art.id);
    const qualityColor = ARTIFACT_QUALITY[data.quality]?.color || '#888';
    
    html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px;background:rgba(0,0,0,0.3);border-radius:8px;border:1px solid ${qualityColor};transition:all 0.2s" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.3)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
      <div>
        <span style="color:${qualityColor};font-weight:bold">${data.name}</span>
        <span style="color:#ffd700;font-size:12px;margin-left:8px">Lv.${art.level || 1}</span>
        ${isEquipped ? '<span style="color:#00FF7F;font-size:11px;margin-left:8px">已装备</span>' : ''}
      </div>
      <div style="display:flex;gap:6px">
        ${!isEquipped ? `<button class="btn btn-sm" style="padding:4px 10px;font-size:11px" onclick="equipArtifactById('${art.id}')">装备</button>` : ''}
        <button class="btn btn-sm" style="padding:4px 10px;font-size:11px;background:#ef4444" onclick="recycleArtifactById('${art.id}')">回收</button>
      </div>
    </div>`;
  }
  container.innerHTML = html;
}

function renderForgeRecipes() {
  const container = document.getElementById('forgeRecipes');
  const recipes = Object.entries(FORGING_RECIPES).filter(([k,v]) => v.quality !== 'material');
  const inv = gameState.player.artifacts_inventory || {};
  
  let html = '';
  for (const [id, recipe] of recipes) {
    const targetData = ARTIFACT_DATA[id];
    if (!targetData) continue;
    
    const canForge = Object.entries(recipe.materials).every(([mat, need]) => (inv[mat] || 0) >= need);
    const qualityColor = ARTIFACT_QUALITY[recipe.quality]?.color || '#888';
    
    let matStr = Object.entries(recipe.materials).map(([mat, need]) => {
      const matData = HEAVEN_TREASURE_DATA[mat] || {name: mat};
      const has = inv[mat] || 0;
      const color = has >= need ? '#00FF7F' : '#ef4444';
      return `<span style="color:${color}">${matData.name}x${need}</span>`;
    }).join(', ');
    
    html += `<div style="flex:1;min-width:200px;padding:10px;background:rgba(0,0,0,0.3);border-radius:8px;border:1px solid ${qualityColor};transition:all 0.2s" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.3)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
      <div style="color:${qualityColor};font-weight:bold">${targetData.name}</div>
      <div style="font-size:11px;color:#888;margin:6px 0">${matStr}</div>
      <div style="font-size:11px;color:#666">成功率: ${Math.floor(recipe.success_rate*100)}%</div>
      <button class="btn btn-sm" style="width:100%;margin-top:6px;${canForge ? '' : 'opacity:0.5'}" 
        onclick="forgeArtifactById('${id}')" ${canForge ? '' : 'disabled'}>
        ${canForge ? '🔨 炼器' : '材料不足'}
      </button>
    </div>`;
  }
  container.innerHTML = html || '<div style="color:#666;font-size:12px">暂无可用配方</div>';
}

function renderHeavenTreasures() {
  const container = document.getElementById('heavenTreasures');
  const treasures = Object.entries(HEAVEN_TREASURE_DATA).filter(([k,v]) => v.effect && v.type !== 'material');
  const inv = gameState.player.artifacts_inventory || {};
  const cooldowns = gameState.player.treasure_cooldowns || {};
  
  let html = '';
  for (const [id, data] of treasures) {
    const count = inv[id] || 0;
    const lastUse = cooldowns[id] || 0;
    const now = Date.now();
    const cd = data.cooldown || 0;
    const onCd = now - lastUse < cd * 1000;
    const remaining = onCd ? Math.ceil((cd * 1000 - (now - lastUse)) / 1000) : 0;
    
    if (count > 0 || data.rarity > 0.3) {
      const qualityColor = data.quality === 'divine' ? '#FF4500' : data.quality === 'immortal' ? '#FFD700' : data.quality === 'treasure' ? '#1E90FF' : '#888';
      html += `<div style="flex:1;min-width:140px;padding:8px;background:rgba(0,0,0,0.3);border-radius:6px;border:1px solid ${qualityColor};transition:all 0.2s" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.3)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
        <div style="color:${qualityColor};font-size:12px;font-weight:bold">${data.name}</div>
        <div style="font-size:10px;color:#888">${data.description}</div>
        <div style="font-size:11px;margin:4px 0">${count > 0 ? `持有: ${count}` : '可掉落'}</div>
        ${onCd ? `<div style="color:#ef4444;font-size:10px">冷却: ${remaining}秒</div>` : 
          count > 0 ? `<button class="btn btn-sm" style="width:100%;padding:4px" onclick="useTreasureById('${id}')">使用</button>` :
          `<div style="color:#666;font-size:10px">打怪掉落</div>`}
      </div>`;
    }
  }
  container.innerHTML = html || '<div style="color:#666;font-size:12px">暂无天材地宝</div>';
}

function updateArtifactSlots() {
  const equip = gameState.player.artifact_equipment || {};
  const slots = ['weapon', 'armor', 'accessory', 'companion'];
  
  for (const slot of slots) {
    const el = document.getElementById('artifactSlot' + slot.charAt(0).toUpperCase() + slot.slice(1));
    if (!el) continue;
    
    const art = equip[slot];
    if (art && art.id) {
      const data = ARTIFACT_DATA[art.id];
      if (data) {
        el.innerHTML = `<span>${ARTIFACT_SLOTS[slot]?.icon || '🔮'}</span><div class="artifact-level">${art.level || 1}</div>`;
        el.className = `artifact-slot ${slot} equipped artifact-quality-${data.quality}`;
      }
    } else {
      el.innerHTML = `<span class="slot-icon">${ARTIFACT_SLOTS[slot]?.icon || '🔮'}</span>`;
      el.className = `artifact-slot ${slot} empty`;
    }
  }
}

// 法宝操作函数
function equipArtifactById(artifactId) {
  const result = game.equipArtifact(artifactId, currentArtifactSlot);
  addLog(result.message, result.success ? 'success' : 'error');
  if (result.success) renderArtifactUI();
}

function recycleArtifactById(artifactId) {
  if (!confirm('确定要回收这个法宝吗？')) return;
  const result = game.recycleArtifact(artifactId);
  addLog(result.message, result.success ? 'success' : 'error');
  if (result.success) renderArtifactUI();
}

function forgeArtifactById(recipeId) {
  const result = game.forgeArtifact(recipeId);
  addLog(result.message, result.success ? 'success' : 'error');
  if (result.success) renderArtifactUI();
}

function useTreasureById(treasureId) {
  const result = game.useHeavenTreasure(treasureId);
  addLog(result.message, result.success ? 'success' : 'error');
  if (result.success) renderArtifactUI();
}

