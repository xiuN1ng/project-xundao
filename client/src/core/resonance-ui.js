// ==================== 共鸣效果展示函数 ====================
function showResonancePanel() {
  document.getElementById('resonanceModal').classList.add('active');
  renderResonanceEffects();
}

function renderResonanceEffects() {
  const techniques = ['混元功', '九转丹诀', '青云决'];
  const artifacts = ['青虹剑', '太极图', '玲珑塔'];
  const techRes = document.getElementById('techniqueResonance');
  const artRes = document.getElementById('artifactResonance');
  if (techRes) techRes.innerHTML = techniques.map(t => `<div class="resonance-item active"><span class="icon">📜</span><span class="name">${t}</span></div>`).join('');
  if (artRes) artRes.innerHTML = artifacts.map(a => `<div class="resonance-item active"><span class="icon">🔮</span><span class="name">${a}</span></div>`).join('');
  document.getElementById('atkBonus').textContent = '+15%';
  document.getElementById('defBonus').textContent = '+10%';
  document.getElementById('spiritBonus').textContent = '+20%';
}

