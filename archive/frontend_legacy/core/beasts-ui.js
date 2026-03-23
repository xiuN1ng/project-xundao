// ==================== 灵兽系统 UI ====================
// ==================== 灵兽系统 UI ====================
let beastCurrentTab = 'list';

function showBeastPanel() {
  document.getElementById('beastModal').classList.add('active');
  beastCurrentTab = 'list';
  renderBeastUI();
}

// 打开新灵兽界面 (Vue组件)
function showPetPanel() {
  if (window.UIComponents && window.UIComponents.showPanel) {
    window.UIComponents.showPanel('PetPanel', {});
  } else {
    // 如果Vue组件未加载,使用旧界面
    showBeastPanel();
  }
}

function switchBeastTab(tab) {
  beastCurrentTab = tab;
  renderBeastUI();
}

function renderBeastUI() {
  const container = document.getElementById('beastList');
  const beasts = gameState.player.beasts || [];
  
  // Tab 切换
  const tabs = [
    { id: 'list', name: '📋 灵兽', icon: '📋' },
    { id: 'skill', name: '⚡ 技能', icon: '⚡' },
    { id: 'capture', name: '🎯 捕捉', icon: '🎯' }
  ];
  
  let tabHtml = '<div class="beast-tabs">';
  for (const t of tabs) {
    tabHtml += `<button class="beast-tab-btn ${beastCurrentTab === t.id ? 'active' : ''}" onclick="switchBeastTab('${t.id}')">${t.icon} ${t.name}</button>`;
  }
  tabHtml += '</div>';
  
  let contentHtml = '';
  switch (beastCurrentTab) {
    case 'list':
      contentHtml = renderBeastListTab(beasts);
      break;
    case 'skill':
      contentHtml = renderBeastSkillTab(beasts);
      break;
    case 'capture':
      contentHtml = renderBeastCaptureTab();
      break;
  }
  
  container.innerHTML = tabHtml + contentHtml;
}

// 灵兽列表标签页
function renderBeastListTab(beasts) {
  const container = document.getElementById('beastList');
  
  if (beasts.length === 0) {
    return '<div style="text-align:center;padding:30px;color:#888">还没有灵兽，去捕捉吧！<br><button class="btn" style="margin-top:10px" onclick="switchBeastTab(\'capture\')">去捕捉</button></div>';
  }
  
  let html = '';
  for (let i = 0; i < beasts.length; i++) {
    const b = beasts[i];
    const data = BEAST_DATA[b.id];
    if (!data) continue;
    const stats = calculateBeastStats(i);
    const moodEmo = { happy: '😊', normal: '😐', sad: '😢', angry: '😠' };
    const qualityColor = BEAST_QUALITY[data.quality]?.color || '#888';
    
    html += `<div class="beast-detail-card" style="border-left: 3px solid ${qualityColor}">
      <div class="beast-detail-header">
        <div class="beast-detail-icon">${getBeastIcon(b.id)}</div>
        <div class="beast-detail-info">
          <div class="beast-detail-name" style="color:${qualityColor}">${data.name}</div>
          <span class="beast-detail-quality" style="background:${qualityColor}20;color:${qualityColor}">${BEAST_QUALITY[data.quality]?.name || ''}</span>
        </div>
        <div style="text-align:right">
          <div style="font-size:18px;font-weight:bold">Lv.${b.level}</div>
          <div style="font-size:20px">${moodEmo[b.mood] || '😐'}</div>
        </div>
      </div>
      
      <div class="beast-detail-stats">
        <div class="beast-stat-box">
          <div class="beast-stat-value">${stats?.atk || 0}</div>
          <div class="beast-stat-label">攻击</div>
        </div>
        <div class="beast-stat-box">
          <div class="beast-stat-value">${stats?.hp || 0}</div>
          <div class="beast-stat-label">生命</div>
        </div>
      </div>
      
      <div class="beast-skill-display">
        <div class="beast-skill-title">自带技能</div>
        <div class="beast-skill-name">${data.skill_name}</div>
        <div class="beast-skill-desc">${data.description}</div>
      </div>
      
      <div class="beast-mood-affection">
        <div class="beast-mood">
          <span class="beast-mood-icon">${moodEmo[b.mood] || '😐'}</span>
          <span class="beast-mood-text">${BEAST_MOOD[b.mood]?.name || '普通'}</span>
        </div>
        <div class="beast-affection">
          <span style="font-size:12px;color:#aaa">亲密度</span>
          <div class="beast-affection-bar">
            <div class="beast-affection-fill" style="width:${b.affection}%"></div>
          </div>
          <span style="font-size:12px;color:#ffd700">${b.affection}</span>
        </div>
      </div>
      
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn" onclick="feedBeastUI(${i})">🍖 喂食</button>
        <button class="btn" style="background:#667eea" onclick="switchBeastTab('skill')">⚡ 查看技能</button>
        <button class="btn" style="background:#ef4444" onclick="releaseBeastUI(${i})">🗑️ 放生</button>
      </div>
    </div>`;
  }
  return html;
}

// 获取灵兽图标
function getBeastIcon(beastId) {
  const icons = {
    'spirit_beast': '🦊',
    'thunder_beast': '🦅',
    'flame_beast': '🦄',
    'ice_beast': '🦅',
    'divine_beast': '🐉',
    'primordial_beast': '👹'
  };
  return icons[beastId] || '🐾';
}

// 灵兽技能标签页
function renderBeastSkillTab(beasts) {
  if (beasts.length === 0) {
    return '<div style="text-align:center;padding:30px;color:#888">还没有灵兽，无法查看技能</div>';
  }
  
  let html = '<div style="font-size:14px;color:#aaa;margin-bottom:12px">您的灵兽已解锁以下技能：</div>';
  
  const skillsShown = new Set();
  
  for (let i = 0; i < beasts.length; i++) {
    const b = beasts[i];
    const data = BEAST_DATA[b.id];
    if (!data) continue;
    
    if (skillsShown.has(data.skill)) continue;
    skillsShown.add(data.skill);
    
    const skillInfo = BEAST_SKILLS[data.skill];
    const effectDesc = {
      'stun': '眩晕敌人',
      'burn': '灼烧敌人',
      'freeze': '冰冻敌人',
      'fear': '恐惧敌人',
      'chaos': '混乱敌人',
      'null': '无特殊效果'
    };
    
    html += `<div class="beast-skill-display">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div class="beast-skill-name">${skillInfo?.name || data.skill_name}</div>
          <div class="beast-skill-desc">${data.name} - ${data.description}</div>
        </div>
        <div style="font-size:24px">${getBeastIcon(b.id)}</div>
      </div>
      <div style="display:flex;gap:20px;margin-top:10px;font-size:12px">
        <div><span style="color:#888">伤害倍率:</span> <span style="color:#ef4444">${skillInfo?.damage || 1.0}x</span></div>
        <div><span style="color:#888">特殊效果:</span> <span style="color:#667eea">${effectDesc[skillInfo?.effect] || '无'}</span></div>
      </div>
    </div>`;
  }
  
  return html;
}

// 灵兽捕捉标签页
function renderBeastCaptureTab() {
  const player = gameState.player;
  const beastSlots = player.beast_slots || 5;
  const currentBeasts = player.beasts?.length || 0;
  
  let html = `<div style="margin-bottom:12px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <span style="font-size:14px;color:#fff">灵兽栏</span>
      <span style="font-size:12px;color:#888">${currentBeasts} / ${beastSlots}</span>
    </div>
    <div style="background:rgba(0,0,0,0.3);border-radius:6px;height:6px">
      <div style="background:linear-gradient(90deg,#667eea,#764ba2);height:100%;width:${(currentBeasts/beastSlots)*100}%"></div>
    </div>
  </div>`;
  
  html += '<div class="beast-capture-grid">';
  
  for (const [id, data] of Object.entries(BEAST_DATA)) {
    const qualityColor = BEAST_QUALITY[data.quality]?.color || '#888';
    const captureRate = Math.round((data.capture_rate || 0.3) * 100);
    
    html += `<div class="beast-capture-card" onclick="captureBeastUI('${id}')">
      <div class="beast-capture-icon">${getBeastIcon(id)}</div>
      <div class="beast-capture-name" style="color:${qualityColor}">${data.name}</div>
      <span class="beast-capture-quality" style="background:${qualityColor}20;color:${qualityColor}">${BEAST_QUALITY[data.quality]?.name || ''}</span>
      <div class="beast-capture-rate">捕捉率: ${captureRate}%</div>
      <button class="beast-capture-btn" onclick="event.stopPropagation();captureBeastUI('${id}')">🎯 捕捉</button>
    </div>`;
  }
  
  html += '</div>';
  return html;
}

function feedBeastUI(i) {
  const result = feedBeast(i, 'beast_food');
  addLog(result.message, result.success ? 'success' : 'error');
  if (result.success) renderBeastUI();
}

function releaseBeastUI(i) {
  if (confirm('确定放生这个灵兽吗？')) {
    const result = releaseBeast(i);
    addLog(result.message, result.success ? 'success' : 'error');
    if (result.success) renderBeastUI();
  }
}

async function captureBeastUI(beastId) {
  const player = gameState.player;
  const beastSlots = player.beast_slots || 5;
  const currentBeasts = player.beasts?.length || 0;
  
  if (currentBeasts >= beastSlots) {
    addLog('灵兽栏已满！', 'error');
    return;
  }
  
  const result = await captureBeast(beastId);
  addLog(result.message, result.success ? 'success' : 'error');
  if (result.success) renderBeastUI();
}

