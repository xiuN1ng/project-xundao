// ==================== 炼丹交互UI函数 ====================
let alchemyState = { temp: 50, herbs: [], timing: 0 };

function showAlchemyPanel() {
  document.getElementById('alchemyModal').classList.add('active');
  alchemyState = { temp: 50, herbs: [], timing: 0 };
  updateAlchemyUI();
  startTimingRotation();
}

function adjustTemp(delta) {
  alchemyState.temp = Math.max(0, Math.min(100, alchemyState.temp + delta));
  updateAlchemyUI();
}

function updateAlchemyUI() {
  const tempFill = document.getElementById('tempFill');
  const tempMarker = document.getElementById('tempMarker');
  const tempValue = document.getElementById('tempValue');
  if (tempFill) tempFill.style.width = alchemyState.temp + '%';
  if (tempMarker) tempMarker.style.left = alchemyState.temp + '%';
  if (tempValue) tempValue.textContent = alchemyState.temp + '°C';
}

function startTimingRotation() {
  const indicator = document.getElementById('timingIndicator');
  if (indicator) indicator.style.animation = 'rotateIndicator 3s linear infinite';
}

function addHerb() {
  const timing = Math.random() * 100;
  let quality = '生';
  if (timing > 70) quality = '熟';
  if (timing > 85) quality = '金丹';
  if (timing > 95) quality = '完美';
  alchemyState.herbs.push({ quality, temp: alchemyState.temp, time: Date.now() });
  const result = document.getElementById('alchemyResult');
  if (result) result.innerHTML = `<div class="alchemy-result-item"><span class="quality-${quality}">${quality}</span> - 火候: ${alchemyState.temp}°C</div>`;
}

