function renderEnemies() {
  const state = game.getState();
  elements.enemyList.innerHTML = '';
  state.monsters.forEach(m => {
    if (m.realm > state.player.realm) return;
    const div = document.createElement('div');
    div.className = 'enemy-card';
    div.innerHTML = `
      <div class="enemy-icon">👹</div>
      <div class="enemy-name">${m.name}</div>
      <div class="enemy-req">HP:${m.hp} ATK:${m.atk}</div>
      <button class="btn btn-small btn-danger" style="margin-top:4px" onclick="startBattle('${m.id}')">挑战</button>
    `;
    elements.enemyList.appendChild(div);
  });
}

function renderDungeons() {
  const state = game.getState();
  elements.dungeonList.innerHTML = '';
  state.dungeons.forEach(d => {
    const locked = state.player.realm < d.minRealm;
    const div = document.createElement('div');
    div.className = 'dungeon-card';
    div.innerHTML = `
      <div style="font-size:16px">🏆</div>
      <div class="enemy-name">${d.name}</div>
      <button class="btn btn-small ${locked?'':'btn-danger'}" style="margin-top:4px" onclick="${locked?'':`challengeDungeon('${d.id}')`}" ${locked?'disabled':''}>${locked?'🔒':'挑战'}</button>
    `;
    elements.dungeonList.appendChild(div);
  });
}

function renderBuildings() {
  const state = game.getState();
  elements.buildingList.innerHTML = '';
  for (const [id, cfg] of Object.entries(state.buildings)) {
    const lvl = state.caveBuildings[id] || 0;
    const cost = Math.floor(cfg.baseCost * Math.pow(cfg.costMultiplier, lvl));
    const maxed = lvl >= cfg.maxLevel;
    elements.buildingList.innerHTML += `
      <div class="building-card">
        <div class="building-name">${cfg.name}</div>
        <div class="building-lvl">Lv.${lvl}/${cfg.maxLevel}</div>
        <button class="btn btn-small" onclick="handleUpgradeBuilding(this, '${id}')" ${maxed?'disabled':''}>${maxed?'MAX':cost+'💎'}</button>
      </div>
    `;
  }
}

function renderTechniques() {
  const state = game.getState();
  elements.techniquePanels.innerHTML = '';
  for (const [cat, data] of Object.entries(state.techniques)) {
    const current = state.playerTechniques[cat];
    let btns = data.techniques.map(t => {
      const active = current === t.id;
      const locked = state.player.realm < t.realmReq;
      return `<button class="tech-btn ${active?'active':''} ${locked?'locked':''}" onclick="handleLearnTechnique(this,'${cat}','${t.id}')" ${locked?'disabled':''}>${t.name}</button>`;
    }).join('');
    const currentName = current ? data.techniques.find(t=>t.id===current)?.name : '未选择';
    elements.techniquePanels.innerHTML += `
      <div class="tech-category">
        <div class="tech-cat-name">${data.name}</div>
        <div class="tech-current">当前: ${currentName}</div>
        <div class="tech-btns">${btns}</div>
      </div>
    `;
  }
}

