// ==================== 宗门系统 UI ====================
let sectCurrentTab = 'info';

function showSectPanel() {
  document.getElementById('sectModal').classList.add('active');
  sectCurrentTab = 'info';
  renderSectUI();
}

function showSectRecruit() {
  const panel = document.getElementById('sectRecruitPanel');
  if (panel) {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'block';
  }
}

function switchSectTab(tab) {
  sectCurrentTab = tab;
  renderSectUI();
}

function renderSectUI() {
  const container = document.getElementById('sectInfo');
  const sect = gameState.player.sect;
  
  // 没有宗门显示创建界面
  if (!sect) {
    container.innerHTML = renderSectCreateUI();
    return;
  }
  
  // 标签页
  const tabs = [
    { id: 'info', name: '📜 宗门', icon: '📜' },
    { id: 'building', name: '🏛️ 建筑', icon: '🏛️' },
    { id: 'disciple', name: '👥 弟子', icon: '👥' },
    { id: 'quest', name: '📋 任务', icon: '📋' },
    { id: 'tech', name: '📖 技能', icon: '📖' },
    { id: 'donate', name: '💝 捐献', icon: '💝' }
  ];
  
  let tabHtml = '<div class="sect-tabs">';
  for (const t of tabs) {
    tabHtml += `<button class="sect-tab-btn ${sectCurrentTab === t.id ? 'active' : ''}" onclick="switchSectTab('${t.id}')">${t.icon} ${t.name}</button>`;
  }
  tabHtml += '</div>';
  
  let contentHtml = '';
  switch (sectCurrentTab) {
    case 'info':
      contentHtml = renderSectInfoTab(sect);
      break;
    case 'building':
      contentHtml = renderSectBuildingTab(sect);
      break;
    case 'disciple':
      contentHtml = renderSectDiscipleTab(sect);
      break;
    case 'quest':
      contentHtml = renderSectQuestTab(sect);
      break;
    case 'tech':
      contentHtml = renderSectTechTab(sect);
      break;
    case 'donate':
      contentHtml = renderSectDonateTab(sect);
      break;
  }
  
  container.innerHTML = tabHtml + contentHtml;
}

// 宗门创建界面
function renderSectCreateUI() {
  const sectTypes = Object.entries(SECT_DATA);
  let html = `<div class="sect-create-title">🏛️ 创建您的宗门</div>
    <div class="sect-create-desc">选择一个宗门类型，开始您的修仙之路</div>
    <div class="sect-types-grid">`;
  
  for (const [type, data] of sectTypes) {
    const typeIcons = { sword: '⚔️', dao: '☯️', buddha: '🙏', demon: '👹', immortal: '✨' };
    const typeIcon = typeIcons[data.type] || '🏛️';
    html += `<div class="sect-type-card" onclick="createSectUI('${type}')">
      <div class="sect-type-icon">${typeIcon}</div>
      <div class="sect-type-name">${data.name}</div>
      <div class="sect-type-desc">${data.description}</div>
      <div class="sect-type-bonus">
        <span>攻击+${Math.round(data.bonus_atk * 100)}%</span>
        <span>防御+${Math.round(data.bonus_def * 100)}%</span>
        <span>灵气+${Math.round(data.bonus_spirit * 100)}%</span>
      </div>
      <div class="sect-type-cost">🪙 1000 灵石</div>
    </div>`;
  }
  
  html += '</div>';
  return html;
}

// 宗门信息标签页
function renderSectInfoTab(sect) {
  const data = SECT_DATA[sect.type];
  const expNeeded = sect.level * 5000;
  const expPercent = Math.min(100, (sect.exp / expNeeded) * 100);
  const bonus = getSectBonus();
  
  return `<div class="sect-info-card">
    <div class="sect-header">
      <div class="sect-icon-large">🏛️</div>
      <div class="sect-name-level">
        <div class="sect-name">${sect.name}</div>
        <div class="sect-level">等级 ${sect.level}</div>
      </div>
    </div>
    
    <div class="sect-exp-bar">
      <div class="sect-exp-label">
        <span>升级进度</span>
        <span>${sect.exp} / ${expNeeded}</span>
      </div>
      <div class="sect-exp-progress">
        <div class="sect-exp-fill" style="width: ${expPercent}%"></div>
      </div>
    </div>
    
    <div class="sect-bonus-display">
      <div class="sect-bonus-title">宗门加成</div>
      <div class="sect-bonus-grid">
        <div class="sect-bonus-item">
          <span class="sect-bonus-icon">⚔️</span>
          <span class="sect-bonus-value">${Math.round((bonus.atk - 1) * 100)}%</span>
          <span class="sect-bonus-label">攻击</span>
        </div>
        <div class="sect-bonus-item">
          <span class="sect-bonus-icon">🛡️</span>
          <span class="sect-bonus-value">${Math.round((bonus.def - 1) * 100)}%</span>
          <span class="sect-bonus-label">防御</span>
        </div>
        <div class="sect-bonus-item">
          <span class="sect-bonus-icon">✨</span>
          <span class="sect-bonus-value">${Math.round((bonus.spirit - 1) * 100)}%</span>
          <span class="sect-bonus-label">灵气</span>
        </div>
        <div class="sect-bonus-item">
          <span class="sect-bonus-icon">📈</span>
          <span class="sect-bonus-value">${Math.round((bonus.exp - 1) * 100)}%</span>
          <span class="sect-bonus-label">经验</span>
        </div>
        <div class="sect-bonus-item">
          <span class="sect-bonus-icon">💎</span>
          <span class="sect-bonus-value">${Math.round((bonus.drop - 1) * 100)}%</span>
          <span class="sect-bonus-label">掉落</span>
        </div>
      </div>
    </div>
    
    <div class="sect-stats">
      <div class="sect-stat-item">
        <span class="sect-stat-icon">👥</span>
        <span class="sect-stat-value">${sect.disciples?.length || 0}</span>
        <span class="sect-stat-label">弟子数</span>
      </div>
      <div class="sect-stat-item">
        <span class="sect-stat-icon">🏗️</span>
        <span class="sect-stat-value">${Object.keys(sect.buildings || {}).length}</span>
        <span class="sect-stat-label">建筑数</span>
      </div>
      <div class="sect-stat-item">
        <span class="sect-stat-icon">📚</span>
        <span class="sect-stat-value">${sect.techs?.length || 0}</span>
        <span class="sect-stat-label">技能数</span>
      </div>
      <div class="sect-stat-item">
        <span class="sect-stat-icon">💝</span>
        <span class="sect-stat-value">${sect.contribution || 0}</span>
        <span class="sect-stat-label">贡献度</span>
      </div>
    </div>
    
    <div class="sect-actions">
      <button class="sect-btn sect-btn-primary" onclick="upgradeSectUI()">
        🚀 升级宗门
      </button>
      <button class="sect-btn sect-btn-danger" onclick="leaveSectUI()">
        🚪 离开宗门
      </button>
    </div>
  </div>`;
}

// 建筑标签页
function renderSectBuildingTab(sect) {
  const buildings = Object.entries(SECT_BUILDINGS);
  let html = '<div class="sect-building-list">';
  
  for (const [id, building] of buildings) {
    const currentLevel = sect.buildings?.[id] || 0;
    const isMax = currentLevel >= building.max_level;
    const cost = Math.floor(500 * Math.pow(building.cost_factor, currentLevel));
    
    html += `<div class="sect-building-card ${isMax ? 'max-level' : ''}">
      <div class="sect-building-info">
        <div class="sect-building-name">${building.name}</div>
        <div class="sect-building-effect">${getBuildingEffectDesc(building.effect)}</div>
      </div>
      <div class="sect-building-level">
        <div class="sect-building-level-num">Lv.${currentLevel}</div>
        <div class="sect-building-level-max">/${building.max_level}</div>
      </div>
      <div class="sect-building-action">
        ${isMax 
          ? '<span class="sect-building-max-tag">满级</span>' 
          : `<button class="sect-btn sect-btn-sm" onclick="upgradeBuildingUI('${id}')">
              🪙 ${cost}
            </button>`}
      </div>
    </div>`;
  }
  
  html += '</div>';
  return html;
}

function getBuildingEffectDesc(effect) {
  const descMap = {
    disciple_cap: `弟子上限 +${effect.value * 2}`,
    all_bonus: `全属性 +${Math.round(effect.value * 100)}%`,
    exp_bonus: `经验加成 +${Math.round(effect.value * 100)}%`,
    spirit_bonus: `灵气加成 +${Math.round(effect.value * 100)}%`,
    drop_bonus: `掉落加成 +${Math.round(effect.value * 100)}%`,
    pvp_bonus: `PVP加成 +${Math.round(effect.value * 100)}%`
  };
  return descMap[effect.type] || '';
}

// 弟子标签页
function renderSectDiscipleTab(sect) {
  const discipleCap = 5 + (sect.buildings?.mountain_gate || 0) * 2;
  const discipleCount = sect.disciples?.length || 0;
  const canRecruit = discipleCount < discipleCap;
  
  let html = `<div class="sect-disciple-header">
    <div class="sect-disciple-count">弟子: ${discipleCount} / ${discipleCap}</div>
    <button class="sect-btn sect-btn-primary ${!canRecruit ? 'disabled' : ''}" 
            onclick="showRecruitDiscipleUI()" ${!canRecruit ? 'disabled' : ''}>
      ➕ 招收弟子
    </button>
  </div>`;
  
  if (sect.disciples?.length > 0) {
    html += '<div class="sect-disciple-list">';
    
    const classIcons = { sword_disciple: '⚔️', dao_disciple: '🔮', body_disciple: '💪', healer: '🌿' };
    
    for (let i = 0; i < sect.disciples.length; i++) {
      const d = sect.disciples[i];
      const classData = DISCIPLE_CLASS[d.class];
      const icon = classIcons[d.class] || '👤';
      const expToLevel = d.level * 100;
      const expPercent = (d.cultivation / expToLevel) * 100;
      
      html += `<div class="sect-disciple-card">
        <div class="sect-disciple-avatar">${icon}</div>
        <div class="sect-disciple-info">
          <div class="sect-disciple-name">${d.name}</div>
          <div class="sect-disciple-class">${classData?.name || '弟子'}</div>
          <div class="sect-disciple-exp">
            <div class="sect-disciple-exp-bar">
              <div class="sect-disciple-exp-fill" style="width: ${expPercent}%"></div>
            </div>
            <span class="sect-disciple-exp-text">${d.cultivation} / ${expToLevel}</span>
          </div>
        </div>
        <div class="sect-disciple-actions">
          <div class="sect-disciple-level">Lv.${d.level}</div>
          <div class="sect-disciple-loyalty">忠诚: ${d.loyalty}%</div>
          <button class="sect-btn sect-btn-sm sect-btn-train" onclick="trainDiscipleUI(${i})">
            🎓 修炼
          </button>
        </div>
      </div>`;
    }
    
    html += '</div>';
  } else {
    html += '<div class="sect-disciple-empty"><div class="sect-disciple-empty-icon">👶</div><div class="sect-disciple-empty-text">还没有弟子，快去招收吧！</div><button class="sect-disciple-empty-btn" onclick="showSectRecruit()">去招收</button></div>';
  }
  
  // 弟子招募面板
  html += '<div class="sect-recruit-panel" id="sectRecruitPanel" style="display:none">';
  html += '<div class="sect-recruit-title">选择弟子类型</div>';
  
  for (const [type, classData] of Object.entries(DISCIPLE_CLASS)) {
    const typeIcons = { sword_disciple: '⚔️', dao_disciple: '🔮', body_disciple: '💪', healer: '🌿' };
    const recruitCost = Math.floor(500 * Math.pow(1.5, discipleCount));
    
    html += `<div class="sect-recruit-card" onclick="recruitDiscipleUI('${type}')">
      <div class="sect-recruit-icon">${typeIcons[type] || '👤'}</div>
      <div class="sect-recruit-info">
        <div class="sect-recruit-name">${classData.name}</div>
        <div class="sect-recruit-stats">
          攻击: ${Math.round(classData.atk_ratio * 100)}% | 
          防御: ${Math.round(classData.def_ratio * 100)}% | 
          灵气: ${Math.round(classData.spirit_ratio * 100)}%
        </div>
      </div>
      <div class="sect-recruit-cost">🪙 ${recruitCost}</div>
    </div>`;
  }
  
  html += '</div>';
  return html;
}

// 技能标签页
function renderSectTechTab(sect) {
  const techs = Object.entries(SECT_TECH);
  let html = '<div class="sect-tech-list">';
  
  for (const [id, tech] of techs) {
    const learned = sect.techs?.includes(id);
    const canLearn = sect.level >= tech.req_sect_level && !learned;
    
    html += `<div class="sect-tech-card ${learned ? 'learned' : ''}">
      <div class="sect-tech-info">
        <div class="sect-tech-name">${tech.name}</div>
        <div class="sect-tech-effect">${getTechEffectDesc(tech)}</div>
        <div class="sect-tech-req">需要宗门等级 ${tech.req_sect_level}</div>
      </div>
      <div class="sect-tech-action">
        ${learned 
          ? '<span class="sect-tech-learned-tag">已学会</span>' 
          : `<button class="sect-btn sect-btn-sm ${!canLearn ? 'disabled' : ''}" 
              onclick="learnTechUI('${id}')" ${!canLearn ? 'disabled' : ''}>
              🪙 ${tech.cost}
            </button>`}
      </div>
    </div>`;
  }
  
  html += '</div>';
  return html;
}

function getTechEffectDesc(tech) {
  const typeDesc = {
    atk: '攻击',
    def: '防御',
    spirit: '灵气',
    luck: '幸运',
    realm_speed: '境界领悟'
  };
  return `${typeDesc[tech.type] || ''}+${Math.round(tech.value * 100)}%`;
}

// 宗门任务标签页
function renderSectQuestTab(sect) {
  // 初始化任务
  if (typeof initSectQuests === 'function') {
    initSectQuests();
  }
  
  const quests = sect.quests || {};
  const dailyQuests = [];
  const weeklyQuests = [];
  
  // 分类任务
  for (const [id, questData] of Object.entries(quests)) {
    const quest = SECT_QUESTS[id];
    if (!quest) continue;
    
    if (quest.type === 'daily') {
      dailyQuests.push({ ...quest, ...questData });
    } else if (quest.type === 'weekly') {
      weeklyQuests.push({ ...quest, ...questData });
    }
  }
  
  let html = '<div class="sect-quest-section">';
  
  // 任务操作按钮
  html += '<div class="quest-action-buttons">';
  html += '<button class="quest-refresh-btn" onclick="refreshSectQuests()" title="刷新任务">🔄 刷新任务</button>';
  html += '<button class="quest-speed-btn" onclick="speedUpQuests()" title="加速任务">⚡ 加速完成</button>';
  html += '</div>';
  
  // 每日任务
  html += '<div style="margin-bottom:20px"><div style="font-size:14px;font-weight:bold;color:#fff;margin-bottom:10px">📅 每日任务</div>';
  
  if (dailyQuests.length === 0) {
    html += '<div style="text-align:center;padding:20px;color:#666">暂无每日任务</div>';
  } else {
    for (const quest of dailyQuests) {
      html += renderSectQuestCard(quest);
    }
  }
  html += '</div>';
  
  // 每周任务
  html += '<div><div style="font-size:14px;font-weight:bold;color:#fff;margin-bottom:10px">📆 每周任务</div>';
  
  if (weeklyQuests.length === 0) {
    html += '<div style="text-align:center;padding:20px;color:#666">暂无每周任务</div>';
  } else {
    for (const quest of weeklyQuests) {
      html += renderSectQuestCard(quest);
    }
  }
  html += '</div>';
  
  html += '</div>';
  return html;
}

// 渲染单个任务卡片
function renderSectQuestCard(quest) {
  const progress = quest.progress || 0;
  const target = quest.target || 1;
  const percent = Math.min(100, (progress / target) * 100);
  const isCompleted = quest.completed;
  const isClaimed = quest.claimed;
  
  let statusClass = '';
  let statusText = '进行中';
  if (isClaimed) {
    statusClass = 'claimed';
    statusText = '已领取';
  } else if (isCompleted) {
    statusClass = 'ready';
    statusText = '可领取';
  }
  
  const rewardText = [];
  if (quest.reward?.spiritStones) rewardText.push(`💰${quest.reward.spiritStones}`);
  if (quest.reward?.contribution) rewardText.push(`✨${quest.reward.contribution}`);
  
  return `<div class="sect-quest-card ${isCompleted ? 'completed' : ''}">
    <div class="sect-quest-header">
      <div class="sect-quest-name">${quest.name}</div>
      <div class="sect-quest-status ${statusClass}">${statusText}</div>
    </div>
    <div class="sect-quest-desc">${quest.desc || ''}</div>
    <div class="sect-quest-progress">
      <div class="sect-quest-progress-bar">
        <div class="sect-quest-progress-fill" style="width:${percent}%"></div>
      </div>
      <div class="sect-quest-progress-text">${progress} / ${target}</div>
    </div>
    <div class="sect-quest-reward">🎁 奖励: ${rewardText.join(' ')}</div>
    <div class="sect-quest-actions">
      ${isClaimed 
        ? '<button class="btn" style="background:#333;color:#666" disabled>已领取</button>'
        : isCompleted 
          ? `<button class="btn" style="background:linear-gradient(135deg,#ffd700,#f59e0b)" onclick="claimSectQuestRewardUI('${quest.id}')">🎁 领取奖励</button>`
          : `<button class="btn" disabled style="opacity:0.5">${getQuestHint(quest.progressType)}</button>`
      }
    </div>
  </div>`;
}

// 获取任务提示
function getQuestHint(progressType) {
  const hints = {
    'spirit': '修炼收集灵气',
    'disciple_train': '让弟子修炼',
    'enemy_defeat': '击退敌人',
    'donate': '向宗门捐献灵石',
    'building_upgrade': '升级建筑',
    'disciple_recruit': '招收弟子',
    'battle': '参与宗门战斗'
  };
  return hints[progressType] || '进行中';
}

function claimSectQuestRewardUI(questId) {
  const result = claimSectQuestReward(questId);
  addLog(result.message, result.success ? 'success' : 'error');
  if (result.success) renderSectUI();
}

// 刷新任务功能
function refreshSectQuests() {
  const cost = 100; // 刷新消耗灵石
  if (gameState.player.spiritStones < cost) {
    addLog('灵石不足，无法刷新任务', 'error');
    return;
  }
  
  gameState.player.spiritStones -= cost;
  
  // 重新随机生成任务
  const sect = gameState.sect || { quests: {} };
  const dailyQuestIds = ['quest_daily_1', 'quest_daily_2', 'quest_daily_3'];
  const weeklyQuestIds = ['quest_weekly_1', 'quest_weekly_2'];
  
  dailyQuestIds.forEach(id => {
    const quest = SECT_QUESTS[id];
    if (quest) {
      sect.quests[id] = {
        id: id,
        progress: 0,
        completed: false,
        claimed: false
      };
    }
  });
  
  weeklyQuestIds.forEach(id => {
    const quest = SECT_QUESTS[id];
    if (quest) {
      sect.quests[id] = {
        id: id,
        progress: 0,
        completed: false,
        claimed: false
      };
    }
  });
  
  gameState.sect = sect;
  saveGameState();
  
  addLog(`消耗${cost}灵石，任务刷新成功！`, 'success');
  renderSectUI();
}

// 加速任务功能
function speedUpQuests() {
  const sect = gameState.sect || { quests: {} };
  let canSpeedUp = false;
  
  // 检查是否有进行中的任务
  for (const [id, questData] of Object.entries(sect.quests || {})) {
    if (!questData.completed && !questData.claimed) {
      canSpeedUp = true;
      break;
    }
  }
  
  if (!canSpeedUp) {
    addLog('没有可以进行加速的任务', 'warning');
    return;
  }
  
  const cost = 200; // 加速消耗灵石
  if (gameState.player.spiritStones < cost) {
    addLog('灵石不足，无法加速任务', 'error');
    return;
  }
  
  gameState.player.spiritStones -= cost;
  
  // 完成所有进行中的任务
  for (const [id, questData] of Object.entries(sect.quests || {})) {
    const quest = SECT_QUESTS[id];
    if (quest && !questData.completed && !questData.claimed) {
      questData.progress = quest.target || 1;
      questData.completed = true;
    }
  }
  
  gameState.sect = sect;
  saveGameState();
  
  addLog(`消耗${cost}灵石，任务加速完成！`, 'success');
  renderSectUI();
}

// 捐献标签页
function renderSectDonateTab(sect) {
  return `<div class="sect-donate-panel">
    <div class="sect-donate-header">
      <div class="sect-donate-icon">💝</div>
      <div class="sect-donate-title">宗门捐献</div>
      <div class="sect-donate-contribution">当前贡献度: <span>${sect.contribution || 0}</span></div>
    </div>
    
    <div class="sect-donate-options">
      <div class="sect-donate-option" onclick="donateToSectUI(100)">
        <div class="sect-donate-amount">100</div>
        <div class="sect-donate-gain">+10 贡献</div>
      </div>
      <div class="sect-donate-option" onclick="donateToSectUI(500)">
        <div class="sect-donate-amount">500</div>
        <div class="sect-donate-gain">+50 贡献</div>
      </div>
      <div class="sect-donate-option" onclick="donateToSectUI(1000)">
        <div class="sect-donate-amount">1000</div>
        <div class="sect-donate-gain">+100 贡献</div>
      </div>
      <div class="sect-donate-option" onclick="donateToSectUI(5000)">
        <div class="sect-donate-amount">5000</div>
        <div class="sect-donate-gain">+500 贡献</div>
      </div>
    </div>
    
    <div class="sect-donate-custom">
      <input type="number" id="sectDonateAmount" class="sect-donate-input" placeholder="输入数量" min="1">
      <button class="sect-btn sect-btn-primary" onclick="donateToSectCustomUI()">
        捐献
      </button>
    </div>
  </div>`;
}

// UI操作函数
function createSectUI(type) {
  const result = createSect(type);
  addLog(result.message, result.success ? 'success' : 'error');
  if (result.success) renderSectUI();
}

function upgradeSectUI() {
  const result = upgradeSect();
  addLog(result.message, result.success ? 'success' : 'error');
  if (result.success) renderSectUI();
}

function leaveSectUI() {
  if (confirm('确定要离开宗门吗？')) {
    const result = leaveSect();
    addLog(result.message, result.success ? 'success' : 'error');
    if (result.success) renderSectUI();
  }
}

function upgradeBuildingUI(buildingId) {
  const result = upgradeSectBuilding(buildingId);
  addLog(result.message, result.success ? 'success' : 'error');
  if (result.success) renderSectUI();
}

function showRecruitDiscipleUI() {
  const panel = document.getElementById('sectRecruitPanel');
  if (panel) {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  }
}

function recruitDiscipleUI(type) {
  const result = recruitSectDisciple(type);
  addLog(result.message, result.success ? 'success' : 'error');
  if (result.success) renderSectUI();
}

function trainDiscipleUI(index) {
  const result = trainDisciple(index);
  addLog(result.message, result.success ? 'success' : 'error');
  if (result.success) renderSectUI();
}

function learnTechUI(techId) {
  const result = learnSectTech(techId);
  addLog(result.message, result.success ? 'success' : 'error');
  if (result.success) renderSectUI();
}

function donateToSectUI(amount) {
  const result = donateToSect(amount);
  addLog(result.message, result.success ? 'success' : 'error');
  if (result.success) renderSectUI();
}

function donateToSectCustomUI() {
  const input = document.getElementById('sectDonateAmount');
  const amount = parseInt(input?.value || '0');
  if (amount <= 0) {
    addLog('请输入有效的数量', 'error');
    return;
  }
  const result = donateToSect(amount);
  addLog(result.message, result.success ? 'success' : 'error');
  if (result.success) {
    input.value = '';
    renderSectUI();
  }
}

