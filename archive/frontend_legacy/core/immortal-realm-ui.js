// ==================== 仙界展示函数 ====================
function showImmortalRealmPanel() {
  document.getElementById('immortalRealmModal').classList.add('active');
  renderImmortalRealmUI();
}

function renderImmortalRealmUI() {
  const realmDisplay = document.getElementById('immortalRealmDisplay');
  const questList = document.getElementById('immortalQuests');
  if (realmDisplay) realmDisplay.innerHTML = `<div style="text-align:center;padding:20px"><div style="font-size:24px;color:#daa520;margin-bottom:10px">凡间</div><div style="color:#888;font-size:14px">当前境界: 筑基期</div><div style="margin-top:15px"><button class="btn btn-primary" onclick="ascendToImmortal()">渡劫飞升</button></div></div>`;
  if (questList) questList.innerHTML = `<div class="immortal-quest-item"><div><div style="font-weight:bold">真仙试炼</div><div style="font-size:12px;color:#888">击败真仙守卫</div></div><button class="btn btn-sm btn-primary">挑战</button></div>`;
}

function selectImmortalRealm(realm) { showToast(`进入${realm}域探索`, 'info'); }
function ascendToImmortal() { showToast('需要达到渡劫期巅峰方可飞升！', 'warning'); }

