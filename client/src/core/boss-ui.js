// ==================== BOSS战斗UI增强函数 ====================
let bossBattleState = { countdown: 3600, hp: 10000, maxHp: 10000, damage: 0 };

function showBossBattlePanel() {
  document.getElementById('bossBattleModal').classList.add('active');
  bossBattleState = { countdown: 3600, hp: 10000, maxHp: 10000, damage: 0 };
  startBossCountdown();
  renderBossInfo();
}

function startBossCountdown() {
  setInterval(() => { if (bossBattleState.countdown > 0) { bossBattleState.countdown--; updateCountdownDisplay(); } }, 1000);
}

function updateCountdownDisplay() {
  const timer = document.getElementById('countdownTimer');
  if (timer) { const h = Math.floor(bossBattleState.countdown/3600), m = Math.floor((bossBattleState.countdown%3600)/60), s = bossBattleState.countdown%60; timer.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }
}

function renderBossInfo() {
  const nameEl = document.getElementById('bossName'), hpFill = document.getElementById('bossHpFill'), hpText = document.getElementById('bossHpText');
  if (nameEl) nameEl.textContent = '混沌魔尊';
  if (hpFill) hpFill.style.width = (bossBattleState.hp/bossBattleState.maxHp*100)+'%';
  if (hpText) hpText.textContent = `${bossBattleState.hp}/${bossBattleState.maxHp}`;
  renderDamageRanking();
}

function renderDamageRanking() {
  const ranking = document.getElementById('damageRanking');
  if (ranking) ranking.innerHTML = `<div class="ranking-item"><div class="ranking-position top3">1</div><div style="flex:1">修仙大佬</div><div style="color:#ffd700">50000</div></div><div class="ranking-item"><div class="ranking-position top3">2</div><div style="flex:1">剑仙</div><div style="color:#c0c0c0">35000</div></div><div class="ranking-item"><div class="ranking-position top3">3</div><div style="flex:1">丹帝</div><div style="color:#cd7f32">20000</div></div>`;
}

function attackBoss() {
  const dmg = Math.floor(Math.random()*1000)+500;
  bossBattleState.damage += dmg;
  bossBattleState.hp = Math.max(0, bossBattleState.hp - dmg);
  document.getElementById('myDamage').textContent = bossBattleState.damage.toLocaleString();
  document.getElementById('totalContribution').textContent = (bossBattleState.damage/bossBattleState.maxHp*100).toFixed(1)+'%';
  renderBossInfo();
  showToast(`对BOSS造成 ${dmg} 伤害！`, 'success');
}

