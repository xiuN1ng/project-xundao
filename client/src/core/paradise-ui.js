// ==================== 福地UI扩展函数 ====================
function showRealmUpgradePanel() {
  document.getElementById('realmUpgradeModal').classList.add('active');
  renderRealmUpgradeUI();
}

function renderRealmUpgradeUI() {
  const upgradeContent = document.getElementById('realmUpgradeContent');
  const questContent = document.getElementById('realmQuestContent');
  if (upgradeContent) upgradeContent.innerHTML = `<div class="upgrade-item"><div><div style="font-weight:bold">灵气泉眼</div><div style="font-size:12px;color:#888">提升灵气产出</div></div><button class="btn btn-sm" onclick="upgradeRealm('spring')">升级</button></div><div class="upgrade-item"><div><div style="font-weight:bold">聚灵阵</div><div style="font-size:12px;color:#888">提升修炼速度</div></div><button class="btn btn-sm" onclick="upgradeRealm('array')">升级</button></div>`;
  if (questContent) questContent.innerHTML = `<div class="quest-item"><div><div style="font-weight:bold">探索灵山</div><div style="font-size:12px;color:#888">发现天材地宝</div></div><button class="btn btn-sm btn-primary">前往</button></div>`;
  document.getElementById('baseOutput').textContent = '+10/s';
  document.getElementById('upgradeBonus').textContent = '+50%';
  document.getElementById('totalOutput').textContent = '+15/s';
}

function upgradeRealm(type) { showToast(`${type}升级成功！`, 'success'); }

