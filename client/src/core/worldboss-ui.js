// ==================== 世界BOSS UI ====================
let bossCurrentTab = 'fight';

function showBossPanel() {
  document.getElementById('bossModal').classList.add('active');
  bossCurrentTab = 'fight';
  renderBossUI();
}

function switchBossTab(tab) {
  bossCurrentTab = tab;
  renderBossUI();
}

function renderBossUI() {
  const container = document.getElementById('bossInfo');
  const hp = getBossHP();
  
  // 没有活跃BOSS显示召唤界面
  if (!hp || hp.hp <= 0) {
    container.innerHTML = renderBossSummonUI();
    return;
  }
  
  // 有BOSS显示战斗界面
  const tabs = [
    { id: 'fight', name: '⚔️ 战斗', icon: '⚔️' },
    { id: 'ranking', name: '📊 排行', icon: '📊' },
    { id: 'reward', name: '🎁 奖励', icon: '🎁' }
  ];
  
  let tabHtml = '<div class="boss-tabs">';
  for (const t of tabs) {
    tabHtml += `<button class="boss-tab-btn ${bossCurrentTab === t.id ? 'active' : ''}" onclick="switchBossTab('${t.id}')">${t.icon} ${t.name}</button>`;
  }
  tabHtml += '</div>';
  
  let contentHtml = '';
  switch (bossCurrentTab) {
    case 'fight':
      contentHtml = renderBossFightUI(hp);
      break;
    case 'ranking':
      contentHtml = renderBossRankingUI();
      break;
    case 'reward':
      contentHtml = renderBossRewardUI(hp);
      break;
  }
  
  container.innerHTML = tabHtml + contentHtml;
}

function renderBossSummonUI() {
  const bosses = Object.entries(WORLD_BOSS_DATA);
  let html = `<div class="boss-empty">
    <div class="boss-empty-icon">👹</div>
    <div class="boss-empty-text">当前没有活跃的世界BOSS</div>
    <button class="btn" style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 12px 30px;" onclick="summonBossUI()">🎲 随机召唤</button>
  </div>
  <div class="boss-summon-title" style="text-align:center;color:#aaa;margin:25px 0 15px;font-size:15px;">选择BOSS</div>
  <div class="boss-summon-list">`;
  
  for (const [id, boss] of bosses) {
    const quality = BOSS_QUALITY[boss.quality];
    html += `<div class="boss-summon-card" onclick="summonBossByIdUI('${id}')">
      <div class="boss-summon-icon">👹</div>
      <div class="boss-summon-name">${boss.name}</div>
      <div class="boss-summon-desc">${boss.description}</div>
      <div class="boss-summon-reward">${quality.name} | 奖励: ${boss.rewards.exp}经验</div>
    </div>`;
  }
  
  html += '</div>';
  return html;
}

function renderBossFightUI(hp) {
  const boss = WORLD_BOSS_DATA[hp.boss];
  const quality = BOSS_QUALITY[boss.quality];
  
  return `<div class="boss-arena">
    <div class="boss-header">
      <div class="boss-avatar">👹</div>
      <div class="boss-name">${hp.bossName}</div>
      <div class="boss-quality" style="background:${quality.color}">${quality.name}</div>
      <div class="boss-desc">${boss.description}</div>
    </div>
    
    <div class="boss-hp-section">
      <div class="boss-hp-bar">
        <div class="boss-hp-fill" style="width: ${hp.percent}%"></div>
        <div class="boss-hp-text">${Math.floor(hp.current).toLocaleString()} / ${Math.floor(hp.max).toLocaleString()}</div>
      </div>
      <div class="boss-hp-details">
        <span>${hp.percent}% HP</span>
        <span>👥 ${hp.participantCount} 人参与</span>
      </div>
    </div>
    
    <div class="boss-stats-grid">
      <div class="boss-stat-item">
        <div class="boss-stat-icon">⚔️</div>
        <div class="boss-stat-value">${boss.base_atk.toLocaleString()}</div>
        <div class="boss-stat-label">攻击力</div>
      </div>
      <div class="boss-stat-item">
        <div class="boss-stat-icon">🛡️</div>
        <div class="boss-stat-value">${boss.base_def.toLocaleString()}</div>
        <div class="boss-stat-label">防御力</div>
      </div>
      <div class="boss-stat-item">
        <div class="boss-stat-icon">💀</div>
        <div class="boss-stat-value">${Math.floor(boss.base_hp / 1000)}K</div>
        <div class="boss-stat-label">生命值</div>
      </div>
    </div>
    
    <button class="boss-attack-btn" onclick="attackBossUI()">⚔️ 攻击BOSS</button>
    
    <div class="boss-ranking">
      <div class="boss-ranking-title">🏆 伤害排行</div>
      <div class="boss-ranking-list">${renderBossRankingList()}</div>
    </div>
  </div>`;
}

function renderBossRankingUI() {
  const ranking = getBossRanking();
  return `<div class="boss-arena">
    <div class="boss-ranking-title" style="font-size:18px;margin-bottom:20px;">🏆 伤害排行</div>
    ${renderBossRankingList()}
  </div>`;
}

function renderBossRankingList() {
  const ranking = getBossRanking();
  if (ranking.length === 0) {
    return '<div style="text-align:center;color:#666;padding:20px;">暂无排行数据</div>';
  }
  
  let html = '';
  for (const r of ranking) {
    const rankClass = r.rank <= 3 ? `boss-ranking-rank-${r.rank}` : 'boss-ranking-rank-other';
    html += `<div class="boss-ranking-item">
      <div class="boss-ranking-rank ${rankClass}">${r.rank}</div>
      <div class="boss-ranking-name">${r.name}</div>
      <div class="boss-ranking-damage">${r.damage.toLocaleString()}</div>
    </div>`;
  }
  return html;
}

function renderBossRewardUI(hp) {
  const boss = WORLD_BOSS_DATA[hp.boss];
  return `<div class="boss-arena">
    <div class="boss-rewards">
      <div class="boss-rewards-title">🎁 击杀奖励</div>
      <div class="boss-rewards-grid">
        <div class="boss-reward-item">
          <div class="boss-reward-icon">✨</div>
          <div class="boss-reward-value">+${boss.rewards.exp.toLocaleString()}</div>
          <div class="boss-reward-label">经验</div>
        </div>
        <div class="boss-reward-item">
          <div class="boss-reward-icon">🪙</div>
          <div class="boss-reward-value">+${boss.rewards.stones.toLocaleString()}</div>
          <div class="boss-reward-label">灵石</div>
        </div>
        <div class="boss-reward-item">
          <div class="boss-reward-icon">📦</div>
          <div class="boss-reward-value">${boss.rewards.items?.join(', ') || '无'}</div>
          <div class="boss-reward-label">物品</div>
        </div>
      </div>
    </div>
    <div style="margin-top:20px;color:#888;font-size:13px;text-align:center;">
      参与伤害越多，获得的奖励越丰厚！<br>
      最后一击者额外获得物品奖励！
    </div>
  </div>`;
}

function summonBossUI() {
  spawnDailyBoss().then(result => {
    addLog(result.message, result.success ? 'success' : 'error');
    renderBossUI();
  });
}

async function summonBossByIdUI(bossId) {
  const result = await summonWorldBoss(bossId);
  addLog(result.message, result.success ? 'success' : 'error');
  renderBossUI();
}

async function attackBossUI() {
  const result = await attackWorldBoss();
  addLog(result.message, result.success ? 'success' : 'error');
  if (result.success && result.crit) {
    // 显示暴击伤害飘字
    showDamagePopup(result.damage, true);
  } else if (result.success) {
    showDamagePopup(result.damage, false);
  }
  if (result.hp !== undefined && result.hp <= 0) {
    addLog('🎉 BOSS被击杀了！', 'success');
  }
  renderBossUI();
}

function showDamagePopup(damage, isCrit) {
  const popup = document.createElement('div');
  popup.className = 'boss-damage-popup' + (isCrit ? ' boss-damage-crit' : '');
  popup.textContent = '-' + damage.toLocaleString() + (isCrit ? ' CRIT!' : '');
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 1000);
}

