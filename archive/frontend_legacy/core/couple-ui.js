// ==================== 仙侣系统 ====================
// 仙侣相关数据
let partnerData = {
  partner: null,
  intimacy: 0,
  intimacyLevel: '萍水',
  skills: [],
  marriageDate: null,
  dailyDualCultivate: 0,
  lastDualCultivate: 0,
  dailyDate: 0,
  heartList: [],
  matchRequests: []
};

// 亲密度等级配置
const INTIMACY_LEVELS = {
  '萍水': { min: 0, max: 499, title: '初识', bonus: { spirit: 0.05, exp: 0.05 } },
  '知己': { min: 500, max: 1999, title: '知己', bonus: { spirit: 0.10, exp: 0.10 } },
  '伴侣': { min: 2000, max: 4999, title: '道侣', bonus: { spirit: 0.15, exp: 0.15 } },
  '神仙眷侣': { min: 5000, max: 9999, title: '神仙眷侣', bonus: { spirit: 0.25, exp: 0.25 } },
  '天作之合': { min: 10000, max: Infinity, title: '天作之合', bonus: { spirit: 0.40, exp: 0.40 } }
};

// 仙侣技能配置
const PARTNER_SKILLS = {
  '心有灵犀': { minIntimacy: 500, desc: '伴侣修炼速度+5%', passive: true },
  '同心协力': { minIntimacy: 1000, desc: '战斗时双方伤害+10%', passive: true },
  '阴阳调和': { minIntimacy: 2000, desc: '双修获得灵气+20%', passive: true },
  '生死与共': { minIntimacy: 3000, desc: '死亡时伴侣可豁免一次', passive: true },
  '天道共鸣': { minIntimacy: 5000, desc: '渡劫时成功率+5%', passive: true },
  '仙侣连心': { minIntimacy: 8000, desc: '可查看伴侣实时位置', passive: true }
};

// 双修状态
let dualCultivateState = {
  active: false,
  startTime: 0,
  duration: 30000,
  cooldown: 300000,
  maxDaily: 10
};

// 显示仙侣面板
function showPartnerPanel() {
  updatePartnerPanel();
  document.getElementById('partnerModal').classList.add('active');
}

// 关闭仙侣面板
function closePartnerPanel() {
  closeModal('partnerModal');
}

// 更新仙侣面板内容
function updatePartnerPanel() {
  const container = document.getElementById('partnerContent');
  const intimacy = partnerData.intimacy;
  
  let currentLevel = '萍水';
  let nextLevel = null;
  let progress = 0;
  
  for (const [level, data] of Object.entries(INTIMACY_LEVELS)) {
    if (intimacy >= data.min && intimacy <= data.max) {
      currentLevel = level;
      progress = ((intimacy - data.min) / (data.max - data.min + 1)) * 100;
      break;
    }
  }
  
  const levels = Object.keys(INTIMACY_LEVELS);
  const currentIndex = levels.indexOf(currentLevel);
  if (currentIndex < levels.length - 1) {
    nextLevel = levels[currentIndex + 1];
  }

  if (!partnerData.partner) {
    container.innerHTML = `
      <div class="partner-no-partner">
        <div class="partner-heart-icon">💕</div>
        <h3>寻觅道侣</h3>
        <p>等级达到炼气三层且灵石达到1000可结缘</p>
        <div class="partner-requirements">
          <div class="req-item ${gameState.player.realmLevel >= 3 ? 'fulfilled' : ''}">
            <span>等级要求</span>
            <span>炼气${gameState.player.realmLevel}层 / 3层</span>
          </div>
          <div class="req-item ${gameState.player.spiritStones >= 1000 ? 'fulfilled' : ''}">
            <span>灵石要求</span>
            <span>${gameState.player.spiritStones} / 1000</span>
          </div>
        </div>
        <button class="btn btn-primary" onclick="showPartnerSearch()">🔍 寻找道侣</button>
        <div class="partner-tabs" style="margin-top:20px">
          <button class="tab-btn active" onclick="switchPartnerTab('proposals')">结缘申请</button>
          <button class="tab-btn" onclick="switchPartnerTab('heart')">心动名单</button>
        </div>
        <div id="partnerTabContent"></div>
      </div>
    `;
    switchPartnerTab('proposals');
  } else {
    const partner = partnerData.partner;
    const bonus = INTIMACY_LEVELS[currentLevel].bonus;
    
    container.innerHTML = `
      <div class="partner-info-card">
        <div class="partner-avatar-large">👫</div>
        <h3>我的${INTIMACY_LEVELS[currentLevel].title}</h3>
        <div class="partner-details">
          <div class="detail-row">
            <span class="label">道侣:</span>
            <span class="value">${partner.name}</span>
            <span class="online-status ${partner.online ? 'online' : 'offline'}">${partner.online ? '🟢 在线' : '⚫ 离线'}</span>
          </div>
          <div class="detail-row">
            <span class="label">境界:</span>
            <span class="value">${partner.realm} Lv.${partner.level}</span>
          </div>
          <div class="detail-row">
            <span class="label">结缘日期:</span>
            <span class="value">${partnerData.marriageDate || '未知'}</span>
          </div>
        </div>
        <div class="intimacy-display">
          <div class="intimacy-title">亲密度: ${currentLevel}</div>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${progress}%;background:linear-gradient(90deg,#ff6b9d,#c44569)"></div>
          </div>
          <div class="intimacy-numbers">
            <span>${intimacy}</span>
            ${nextLevel ? `<span> / ${INTIMACY_LEVELS[nextLevel].min} 升级</span>` : '<span> (满级)</span>'}
          </div>
        </div>
        <div class="partner-bonus">
          <div class="bonus-title">亲密度加成</div>
          <div class="bonus-items">
            <div class="bonus-item">
              <span>灵石产出</span>
              <span class="bonus-value">+${(bonus.spirit * 100).toFixed(0)}%</span>
            </div>
            <div class="bonus-item">
              <span>经验加成</span>
              <span class="bonus-value">+${(bonus.exp * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </div>
      <div class="partner-tabs">
        <button class="tab-btn active" onclick="switchPartnerTab('main')">我的仙侣</button>
        <button class="tab-btn" onclick="switchPartnerTab('skills')">仙侣技能</button>
        <button class="tab-btn" onclick="switchPartnerTab('activities')">活动</button>
      </div>
      <div id="partnerTabContent">${renderPartnerMainTab()}</div>
      <div class="partner-actions">
        <button class="btn btn-primary" onclick="sendPartnerMessage()">💬 发送消息</button>
        <button class="btn btn-warning" onclick="startDualCultivate()" ${!partner.online || dualCultivateState.active ? 'disabled' : ''}>🧘 双修${dualCultivateState.active ? '(进行中)' : ''}</button>
        <button class="btn btn-secondary" onclick="showGiftPanel()">🎁 赠送礼物</button>
        <button class="btn btn-danger" onclick="showPartnerSettings()">⚙️ 设置</button>
      </div>
      <div class="dual-cultivate-status">
        <span>今日双修: ${partnerData.dailyDualCultivate} / ${dualCultivateState.maxDaily}</span>
        ${partnerData.dailyDate > 0 ? `<span style="margin-left:15px">今日约会: 已完成</span>` : `<span style="margin-left:15px"><button class="btn btn-sm" onclick="startDate()">🌸 约会</button></span>`}
      </div>
    `;
  }
}

function renderPartnerMainTab() {
  if (!partnerData.partner) return '';
  return `
    <div class="partner-main-tab">
      <div class="partner-status-grid">
        <div class="status-card">
          <div class="status-icon">🧘</div>
          <div class="status-label">双修状态</div>
          <div class="status-value">${dualCultivateState.active ? '双修中' : '可双修'}</div>
        </div>
        <div class="status-card">
          <div class="status-icon">💕</div>
          <div class="status-label">亲密度</div>
          <div class="status-value">${partnerData.intimacy}</div>
        </div>
        <div class="status-card">
          <div class="status-icon">🎁</div>
          <div class="status-label">今日礼物</div>
          <div class="status-value">${getTodayGiftCount()} / 5</div>
        </div>
        <div class="status-card">
          <div class="status-icon">📅</div>
          <div class="status-label">约会</div>
          <div class="status-value">${partnerData.dailyDate > 0 ? '已完成' : '未约会'}</div>
        </div>
      </div>
    </div>
  `;
}

function renderPartnerSkillsTab() {
  let html = '<div class="partner-skills-tab"><div class="skills-title">仙侣技能</div><div class="skills-grid">';
  for (const [skillName, skillData] of Object.entries(PARTNER_SKILLS)) {
    const unlocked = partnerData.skills.includes(skillName);
    const canUnlock = partnerData.intimacy >= skillData.minIntimacy && !unlocked;
    html += `
      <div class="skill-card ${unlocked ? 'unlocked' : 'locked'}">
        <div class="skill-icon">${unlocked ? '✨' : '🔒'}</div>
        <div class="skill-name">${skillName}</div>
        <div class="skill-desc">${skillData.desc}</div>
        <div class="skill-req">需要亲密度: ${skillData.minIntimacy}</div>
        ${canUnlock ? `<button class="btn btn-sm btn-primary" onclick="unlockPartnerSkill('${skillName}')">解锁</button>` : ''}
      </div>
    `;
  }
  html += '</div></div>';
  return html;
}

function renderPartnerActivitiesTab() {
  return `
    <div class="partner-activities-tab">
      <div class="activities-title">仙侣活动</div>
      <div class="activity-list">
        <div class="activity-item"><div class="activity-icon">🎵</div><div class="activity-info"><div class="activity-name">琴瑟和鸣</div><div class="activity-desc">双方同时在线30分钟</div></div><div class="activity-reward">500灵石</div></div>
        <div class="activity-item"><div class="activity-icon">🧘</div><div class="activity-info"><div class="activity-name">形影不离</div><div class="activity-desc">连续3天双修</div></div><div class="activity-reward">1000灵石+姻缘结</div></div>
        <div class="activity-item"><div class="activity-icon">👑</div><div class="activity-info"><div class="activity-name">神仙眷侣</div><div class="activity-desc">亲密度达到5000</div></div><div class="activity-reward">随机红色功法</div></div>
      </div>
    </div>
  `;
}

function switchPartnerTab(tab) {
  const buttons = document.querySelectorAll('.partner-tabs .tab-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  const content = document.getElementById('partnerTabContent');
  if (tab === 'main') content.innerHTML = renderPartnerMainTab();
  else if (tab === 'skills') content.innerHTML = renderPartnerSkillsTab();
  else if (tab === 'activities') content.innerHTML = renderPartnerActivitiesTab();
  else if (tab === 'proposals') content.innerHTML = renderProposalsTab();
  else if (tab === 'heart') content.innerHTML = renderHeartTab();
}

function renderProposalsTab() {
  const requests = partnerData.matchRequests;
  if (requests.length === 0) return '<div class="empty-state"><div class="empty-icon">💌</div><div class="empty-text">暂无结缘申请</div></div>';
  let html = '<div class="proposals-list">';
  for (const req of requests) {
    html += `<div class="proposal-item"><div class="proposal-avatar">👤</div><div class="proposal-info"><div class="proposal-name">${req.name}</div><div class="proposal-realm">${req.realm} Lv.${req.level}</div><div class="proposal-intimacy">友好度: ${req.intimacy}</div></div><div class="proposal-actions"><button class="btn btn-sm btn-primary" onclick="acceptProposal('${req.id}')">同意</button><button class="btn btn-sm btn-danger" onclick="rejectProposal('${req.id}')">拒绝</button></div></div>`;
  }
  html += '</div>';
  return html;
}

function renderHeartTab() {
  const hearts = partnerData.heartList;
  if (hearts.length === 0) return '<div class="empty-state"><div class="empty-icon">💘</div><div class="empty-text">暂无心动对象</div></div>';
  let html = '<div class="heart-list">';
  for (const heart of hearts) {
    html += `<div class="heart-item"><div class="heart-avatar">👤</div><div class="heart-info"><div class="heart-name">${heart.name}</div><div class="heart-realm">${heart.realm} Lv.${heart.level}</div><div class="heart-status">${heart.online ? '🟢 在线' : '⚫ 离线'}</div></div><div class="heart-actions"><button class="btn btn-sm btn-primary" onclick="proposeToPartner('${heart.id}')">求婚</button><button class="btn btn-sm btn-danger" onclick="removeFromHeart('${heart.id}')">取消</button></div></div>`;
  }
  html += '</div>';
  return html;
}

function showPartnerSearch() {
  const container = document.getElementById('partnerContent');
  const onlinePlayers = generateMockPlayers();
  container.innerHTML = `
    <div class="partner-search">
      <div class="search-header"><h3>寻找道侣</h3><button class="btn btn-sm" onclick="updatePartnerPanel()">返回</button></div>
      <div class="player-list">
        ${onlinePlayers.map(p => `<div class="player-card-item"><div class="player-avatar">👤</div><div class="player-info"><div class="player-name">${p.name}</div><div class="player-realm">${p.realm} Lv.${p.level}</div></div><div class="player-actions"><button class="btn btn-sm btn-primary" onclick="addToHeart('${p.id}', '${p.name}')">心动</button><button class="btn btn-sm btn-warning" onclick="sendProposal('${p.id}', '${p.name}')">求婚</button></div></div>`).join('')}
      </div>
    </div>
  `;
}

function generateMockPlayers() {
  const names = ['青云子', '紫霞仙子', '逍遥散人', '凌波仙子', '太乙真人', '九尾灵狐', '天璇星君', '玄冥上人'];
  const realms = ['筑基期', '金丹期', '元婴期', '化神期'];
  return names.map((name, i) => ({ id: `player_${i}`, name, avatar: '👤', realm: realms[Math.floor(Math.random() * realms.length)], level: 20 + Math.floor(Math.random() * 80), online: Math.random() > 0.3 }));
}

function addToHeart(playerId, playerName) {
  if (partnerData.heartList.find(h => h.id === playerId)) { addLog('你已经在心动名单中了', 'warning'); return; }
  partnerData.heartList.push({ id: playerId, name: playerName, avatar: '👤', realm: '筑基期', level: 30, online: true });
  addLog(`已将 ${playerName} 添加到心动名单`, 'success');
  saveGameData();
}

function removeFromHeart(playerId) {
  partnerData.heartList = partnerData.heartList.filter(h => h.id !== playerId);
  switchPartnerTab('heart');
  saveGameData();
}

function sendProposal(playerId, playerName) {
  if (gameState.player.realmLevel < 3) { addLog('等级未达到炼气三层，无法结缘', 'error'); return; }
  if (gameState.player.spiritStones < 1000) { addLog('灵石不足1000，无法结缘', 'error'); return; }
  if (partnerData.partner) { addLog('你已经有仙侣了', 'warning'); return; }
  gameState.player.spiritStones -= 1000;
  updateUI();
  addLog(`已向 ${playerName} 发送结缘请求...`, 'success');
  setTimeout(() => {
    if (Math.random() > 0.3) { acceptProposalInternal({ id: playerId, name: playerName, realm: '金丹期', level: 45 }); }
    else { addLog(`${playerName} 拒绝了你的结缘请求`, 'warning'); }
  }, 2000);
}

function acceptProposalInternal(partner) {
  partnerData.partner = { id: partner.id, name: partner.name, realm: partner.realm, level: partner.level, online: true };
  partnerData.marriageDate = new Date().toLocaleDateString('zh-CN');
  partnerData.intimacy = 100;
  addLog(`恭喜！你与 ${partner.name} 结为道侣！`, 'success');
  updatePartnerPanel();
  saveGameData();
}

function acceptProposal(requestId) {
  const request = partnerData.matchRequests.find(r => r.id === requestId);
  if (request) { acceptProposalInternal(request); partnerData.matchRequests = partnerData.matchRequests.filter(r => r.id !== requestId); }
}

function rejectProposal(requestId) {
  partnerData.matchRequests = partnerData.matchRequests.filter(r => r.id !== requestId);
  switchPartnerTab('proposals');
  addLog('已拒绝结缘申请', 'info');
}

function proposeToPartner(playerId) {
  const heart = partnerData.heartList.find(h => h.id === playerId);
  if (heart) sendProposal(playerId, heart.name);
}

function getTodayGiftCount() { return 0; }

function sendPartnerMessage() {
  if (!partnerData.partner) return;
  addIntimacy(5);
  addLog(`发送消息给 ${partnerData.partner.name}，亲密度+5`, 'success');
  updatePartnerPanel();
}

function addIntimacy(amount) {
  partnerData.intimacy += amount;
  for (const skillName of Object.keys(PARTNER_SKILLS)) {
    if (partnerData.intimacy >= PARTNER_SKILLS[skillName].minIntimacy && !partnerData.skills.includes(skillName)) {
      partnerData.skills.push(skillName);
      addLog(`解锁仙侣技能: ${skillName}！`, 'success');
    }
  }
  updatePartnerPanel();
  saveGameData();
}

function startDualCultivate() {
  if (!partnerData.partner) { addLog('你没有仙侣', 'warning'); return; }
  if (!partnerData.partner.online) { addLog('伴侣不在线，无法双修', 'warning'); return; }
  if (partnerData.dailyDualCultivate >= dualCultivateState.maxDaily) { addLog('今日双修次数已用完', 'warning'); return; }
  const now = Date.now();
  if (now - partnerData.lastDualCultivate < dualCultivateState.cooldown) { const remaining = Math.ceil((dualCultivateState.cooldown - (now - partnerData.lastDualCultivate)) / 1000); addLog(`双修冷却中，请等待 ${remaining} 秒`, 'warning'); return; }
  dualCultivateState.active = true;
  dualCultivateState.startTime = now;
  partnerData.dailyDualCultivate++;
  partnerData.lastDualCultivate = now;
  showDualCultivateUI();
  setTimeout(() => { completeDualCultivate(); }, dualCultivateState.duration);
  addLog('开始双修！', 'success');
  saveGameData();
}

function showDualCultivateUI() {
  let modal = document.getElementById('dualCultivateModal');
  if (!modal) {
    const html = `<div class="modal-overlay" id="dualCultivateModal"><div class="modal-content dual-cultivate-modal"><div class="modal-header"><div class="modal-title">🧘 双修中...</div></div><div class="dual-cultivate-content"><div class="dual-cultivate-timer"><span id="dualCultivateTime">30</span>秒</div><div class="dual-cultivate-anim"><div class="cultivator left">🧘‍♂️</div><div class="dual-symbol">⇄</div><div class="cultivator right">🧘‍♀️</div></div><div class="dual-cultivate-partners"><span>${gameState.player.name}</span><span class="partner-name">${partnerData.partner.name}</span></div><div class="dual-cultivate-rewards" id="dualCultivateRewards" style="display:none"><div class="reward-title">双修奖励</div><div class="reward-item">基础灵气: <span id="baseReward">+0</span></div><div class="reward-item">境界加成: <span id="realmBonus">+0%</span></div><div class="reward-item">亲密度加成: <span id="intimacyBonus">+0%</span></div><div class="reward-item">亲密度: <span id="intimacyGain">+50</span></div></div><button class="btn btn-secondary" id="endDualCultivateBtn" onclick="endDualCultivateEarly()" style="display:none">提前结束</button></div></div></div>`;
    document.body.insertAdjacentHTML('beforeend', html);
  }
  document.getElementById('dualCultivateModal').classList.add('active');
  let timeLeft = 30;
  const timerEl = document.getElementById('dualCultivateTime');
  const timer = setInterval(() => { timeLeft--; if (timerEl) timerEl.textContent = timeLeft; if (timeLeft <= 0) clearInterval(timer); }, 1000);
}

function completeDualCultivate() {
  if (!dualCultivateState.active) return;
  dualCultivateState.active = false;
  const baseReward = gameState.player.maxSpirit * 10;
  const realmBonus = 0.5;
  const intimacyBonus = Math.floor(partnerData.intimacy / 1000) * 0.1;
  const skillBonus = partnerData.skills.includes('阴阳调和') ? 0.2 : 0;
  const totalBonus = realmBonus + intimacyBonus + skillBonus;
  const totalReward = Math.floor(baseReward * (1 + totalBonus));
  gameState.player.spirit += totalReward;
  gameState.stats.totalSpirit += totalReward;
  addIntimacy(50);
  document.getElementById('dualCultivateRewards').style.display = 'block';
  document.getElementById('endDualCultivateBtn').style.display = 'block';
  document.getElementById('baseReward').textContent = `+${totalReward}`;
  document.getElementById('realmBonus').textContent = `+${(realmBonus * 100).toFixed(0)}%`;
  document.getElementById('intimacyBonus').textContent = `+${(intimacyBonus * 100).toFixed(0)}%`;
  addLog(`双修完成！获得 ${totalReward} 灵气，亲密度+50`, 'success');
  updateUI();
  saveGameData();
}

function endDualCultivateEarly() { completeDualCultivate(); setTimeout(() => { closeModal('dualCultivateModal'); updatePartnerPanel(); }, 1500); }

function startDate() {
  if (!partnerData.partner) { addLog('你没有仙侣', 'warning'); return; }
  if (partnerData.dailyDate > 0) { addLog('今日已经约会过了', 'warning'); return; }
  partnerData.dailyDate = 1;
  const intimacyGain = 200;
  const spiritStonesGain = Math.floor(Math.random() * 100) + 50;
  gameState.player.spiritStones += spiritStonesGain;
  addIntimacy(intimacyGain);
  addLog(`约会完成！亲密度+${intimacyGain}，获得${spiritStonesGain}灵石`, 'success');
  updatePartnerPanel();
  updateUI();
  saveGameData();
}

function showGiftPanel() {
  const gifts = [
    { id: 'flower', name: '玫瑰花', price: 10, intimacy: 10 },
    { id: 'jade', name: '玉佩', price: 100, intimacy: 50 },
    { id: 'pill', name: '驻颜丹', price: 500, intimacy: 100 },
    { id: 'weapon', name: '同心剑', price: 2000, intimacy: 300 }
  ];
  let html = '<div class="gift-panel"><div class="gift-title">选择礼物</div><div class="gift-grid">';
  for (const gift of gifts) {
    html += `<div class="gift-item" onclick="sendGift('${gift.id}')"><div class="gift-icon">🎁</div><div class="gift-name">${gift.name}</div><div class="gift-price">${gift.price}灵石</div><div class="gift-intimacy">+${gift.intimacy}亲密度</div></div>`;
  }
  html += '</div></div>';
  const content = document.getElementById('partnerContent');
  const originalContent = content.innerHTML;
  content.innerHTML = html;
  const backBtn = document.createElement('button');
  backBtn.className = 'btn btn-sm';
  backBtn.textContent = '返回';
  backBtn.style.marginTop = '10px';
  backBtn.onclick = () => { content.innerHTML = originalContent; switchPartnerTab('main'); };
  content.appendChild(backBtn);
}

function sendGift(giftId) {
  const gifts = { 'flower': { name: '玫瑰花', price: 10, intimacy: 10 }, 'jade': { name: '玉佩', price: 100, intimacy: 50 }, 'pill': { name: '驻颜丹', price: 500, intimacy: 100 }, 'weapon': { name: '同心剑', price: 2000, intimacy: 300 } };
  const gift = gifts[giftId];
  if (!gift) return;
  if (gameState.player.spiritStones < gift.price) { addLog('灵石不足', 'error'); return; }
  gameState.player.spiritStones -= gift.price;
  addIntimacy(gift.intimacy);
  addLog(`赠送${gift.name}给${partnerData.partner.name}，亲密度+${gift.intimacy}`, 'success');
  updateUI();
  saveGameData();
  showGiftPanel();
}

function showPartnerSettings() {
  let html = `<div class="partner-settings"><h3>仙侣设置</h3><div class="setting-item"><button class="btn btn-danger" onclick="divorcePartner()">💔 离婚</button></div><div class="setting-item"><button class="btn btn-secondary" onclick="updatePartnerPanel()">返回</button></div></div>`;
  document.getElementById('partnerContent').innerHTML = html;
}

function divorcePartner() {
  if (!partnerData.partner) return;
  if (!confirm(`确定要与 ${partnerData.partner.name} 离婚吗？`)) return;
  if (gameState.player.spiritStones >= 1000) gameState.player.spiritStones -= 1000;
  else { addLog('离婚需要1000灵石', 'error'); return; }
  partnerData.partner = null;
  partnerData.marriageDate = null;
  partnerData.intimacy = 0;
  partnerData.skills = [];
  partnerData.dailyDualCultivate = 0;
  partnerData.dailyDate = 0;
  addLog('已离婚，7天后可再次结缘', 'warning');
  updatePartnerPanel();
  updateUI();
  saveGameData();
}

function unlockPartnerSkill(skillName) {
  const skill = PARTNER_SKILLS[skillName];
  if (!skill) return;
  if (partnerData.skills.includes(skillName)) { addLog('技能已解锁', 'warning'); return; }
  if (partnerData.intimacy < skill.minIntimacy) { addLog('亲密度不足', 'error'); return; }
  partnerData.skills.push(skillName);
  addLog(`✨ 解锁仙侣技能: ${skillName}！技能效果: ${skill.desc}`, 'success');
  
  // 显示解锁动画
  showSkillUnlockAnimation(skillName);
  
  updatePartnerPanel();
  saveGameData();
}

// 技能解锁动画
function showSkillUnlockAnimation(skillName) {
  const container = document.createElement('div');
  container.className = 'skill-unlock-animation';
  container.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.9);padding:30px;border-radius:20px;border:2px solid #ffd700;z-index:10000;text-align:center;';
  container.innerHTML = `
    <div style="font-size:48px;margin-bottom:15px;">✨</div>
    <div style="color:#ffd700;font-size:20px;font-weight:bold;margin-bottom:10px;">技能解锁成功!</div>
    <div style="color:#fff;font-size:16px;">${skillName}</div>
  `;
  document.body.appendChild(container);
  
  // 3秒后移除
  setTimeout(() => {
    container.style.transition = 'opacity 0.5s';
    container.style.opacity = '0';
    setTimeout(() => container.remove(), 500);
  }, 2000);
}

// 结缘动画
function showMarriageAnimation() {
  const container = document.createElement('div');
  container.className = 'marriage-animation';
  container.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:9999;';
  
  // 生成多个爱心
  for (let i = 0; i < 20; i++) {
    const heart = document.createElement('div');
    heart.className = 'marriage-heart';
    heart.textContent = '💕';
    heart.style.left = Math.random() * 100 + 'vw';
    heart.style.animationDelay = Math.random() * 2 + 's';
    heart.style.animationDuration = (2 + Math.random() * 2) + 's';
    container.appendChild(heart);
  }
  
  document.body.appendChild(container);
  
  // 5秒后移除
  setTimeout(() => container.remove(), 5000);
}

