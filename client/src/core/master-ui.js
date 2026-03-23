// ==================== 师徒系统 UI ====================
// 师徒任务数据
let masterTasks = {
  daily: [],
  weekly: []
};

// 师徒任务配置
const MASTER_TASK_CONFIG = {
  daily: [
    { id: 'daily_1', name: '请教功法', desc: '向师父请教一次功法', target: 1, reward: { exp: 100, contribution: 10 } },
    { id: 'daily_2', name: '师徒同心', desc: '与师父组队战斗1次', target: 1, reward: { spiritStones: 200, reputation: 5 } },
    { id: 'daily_3', name: '汇报修炼', desc: '向师父汇报修炼进度', target: 1, reward: { exp: 150, spiritStones: 100 } }
  ],
  weekly: [
    { id: 'weekly_1', name: '师徒传承', desc: '完成5次功法学习', target: 5, reward: { rareSkill: 1, reputation: 20 } },
    { id: 'weekly_2', name: '桃李满天下', desc: '指导3名徒弟', target: 3, reward: { spiritStones: 1000, contribution: 50 } }
  ]
};

function showMasterPanel() {
  document.getElementById('masterModal').classList.add('active');
  renderMasterUI();
}

function renderMasterUI() {
  const container = document.getElementById('masterInfo');
  const info = getMasterInfo();
  
  if (!info) {
    container.innerHTML = `<div style="text-align:center;padding:30px;color:#888">
      还没有师徒关系<br>
      <button class="btn" style="margin-top:15px" onclick="becomeApprenticeUI('师父')">拜师</button>
    </div>`;
    return;
  }
  
  // 初始化师徒任务
  initMasterTasks();
  
  let html = `<div style="padding:15px;background:rgba(30,144,255,0.2);border-radius:8px">
    <div>身份: <span style="color:${MASTER_QUALITY[info.role]?.color}">${MASTER_QUALITY[info.role]?.name}</span></div>
    <div>声望: ${info.reputation}</div>
    ${info.master ? `<div>师父: ${info.master}</div>` : ''}
    ${info.apprentices?.length ? `<div>徒弟: ${info.apprentices.join(', ')}</div>` : ''}
  </div>`;
  
  // 添加师徒任务界面
  html += renderMasterTaskUI();
  
  if (info.role === 'apprentice' && info.master) {
    html += `<div style="margin-top:15px">
      <button class="btn" onclick="learnFromMasterUI()">请教功法</button>
    </div>`;
  }
  
  if (info.role === 'master') {
    html += `<div style="margin-top:15px">
      <button class="btn" onclick="teachTechniqueUI()">传授功法</button>
    </div>`;
  }
  
  container.innerHTML = html;
}

// 初始化师徒任务
function initMasterTasks() {
  const today = new Date().toDateString();
  if (!masterTasks.lastDate || masterTasks.lastDate !== today) {
    // 重置每日任务
    masterTasks.daily = MASTER_TASK_CONFIG.daily.map(task => ({
      ...task,
      progress: 0,
      completed: false,
      claimed: false
    }));
    masterTasks.weekly = MASTER_TASK_CONFIG.weekly.map(task => ({
      ...task,
      progress: 0,
      completed: false,
      claimed: false
    }));
    masterTasks.lastDate = today;
  }
}

// 渲染师徒任务UI
function renderMasterTaskUI() {
  initMasterTasks();
  let html = '<div class="master-task-section" style="margin-top:20px;">';
  
  // 任务标题和操作按钮
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">';
  html += '<div style="font-size:16px;font-weight:bold;color:#ffd700;">📋 师徒任务</div>';
  html += '<div>';
  html += '<button class="btn btn-sm" style="background:#3b82f6;margin-right:5px;" onclick="refreshMasterTasks()">🔄 刷新</button>';
  html += '<button class="btn btn-sm" style="background:#f59e0b;" onclick="speedUpMasterTasks()">⚡ 加速</button>';
  html += '</div>';
  html += '</div>';
  
  // 每日任务
  html += '<div style="margin-bottom:15px;"><div style="font-size:14px;color:#fff;margin-bottom:10px;">📅 每日任务</div>';
  for (const task of masterTasks.daily) {
    html += renderMasterTaskCard(task);
  }
  html += '</div>';
  
  // 每周任务
  html += '<div><div style="font-size:14px;color:#fff;margin-bottom:10px;">📆 每周任务</div>';
  for (const task of masterTasks.weekly) {
    html += renderMasterTaskCard(task);
  }
  html += '</div>';
  
  html += '</div>';
  return html;
}

// 渲染师徒任务卡片
function renderMasterTaskCard(task) {
  const progress = task.progress || 0;
  const target = task.target || 1;
  const percent = Math.min(100, (progress / target) * 100);
  const isCompleted = task.completed;
  const isClaimed = task.claimed;
  
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
  if (task.reward?.exp) rewardText.push(`✨${task.reward.exp}经验`);
  if (task.reward?.spiritStones) rewardText.push(`💰${task.reward.spiritStones}`);
  if (task.reward?.contribution) rewardText.push(`⭐${task.reward.contribution}贡献`);
  if (task.reward?.reputation) rewardText.push(`🎖️${task.reward.reputation}声望`);
  
  return `<div class="master-task-card" style="background:rgba(0,0,0,0.3);border-radius:10px;padding:12px;margin-bottom:10px;border-left:3px solid ${isCompleted ? '#ffd700' : '#3b82f6'};">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <div style="font-weight:bold;color:#fff;">${task.name}</div>
      <div style="font-size:12px;padding:2px 8px;border-radius:10px;background:${statusClass === 'ready' ? '#ffd700' : statusClass === 'claimed' ? '#666' : '#3b82f6'};color:${statusClass === 'claimed' ? '#888' : '#fff'};">${statusText}</div>
    </div>
    <div style="font-size:12px;color:#888;margin-bottom:8px;">${task.desc}</div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
      <div style="flex:1;height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;">
        <div style="width:${percent}%;height:100%;background:linear-gradient(90deg,#3b82f6,#60a5fa);transition:width 0.3s;"></div>
      </div>
      <div style="font-size:11px;color:#aaa;">${progress}/${target}</div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <div style="font-size:11px;color:#ffd700;">🎁 ${rewardText.join(' ')}</div>
      ${isClaimed 
        ? '<button class="btn btn-sm" style="background:#333;color:#666" disabled>已领取</button>'
        : isCompleted 
          ? `<button class="btn btn-sm" style="background:linear-gradient(135deg,#ffd700,#f59e0b);" onclick="claimMasterTaskReward('${task.id}')">🎁 领取</button>`
          : `<button class="btn btn-sm" style="opacity:0.5" disabled>进行中</button>`
      }
    </div>
  </div>`;
}

// 刷新师徒任务
function refreshMasterTasks() {
  const cost = 100;
  if (gameState.player.spiritStones < cost) {
    addLog('灵石不足，无法刷新任务', 'error');
    return;
  }
  
  gameState.player.spiritStones -= cost;
  
  // 重新生成任务
  masterTasks.daily = MASTER_TASK_CONFIG.daily.map(task => ({
    ...task,
    progress: 0,
    completed: false,
    claimed: false
  }));
  
  addLog(`消耗${cost}灵石，任务刷新成功！`, 'success');
  renderMasterUI();
}

// 加速师徒任务
function speedUpMasterTasks() {
  let canSpeedUp = false;
  for (const task of [...masterTasks.daily, ...masterTasks.weekly]) {
    if (!task.completed && !task.claimed) {
      canSpeedUp = true;
      break;
    }
  }
  
  if (!canSpeedUp) {
    addLog('没有可以进行加速的任务', 'warning');
    return;
  }
  
  const cost = 200;
  if (gameState.player.spiritStones < cost) {
    addLog('灵石不足，无法加速任务', 'error');
    return;
  }
  
  gameState.player.spiritStones -= cost;
  
  // 完成所有进行中的任务
  for (const task of [...masterTasks.daily, ...masterTasks.weekly]) {
    if (!task.completed && !task.claimed) {
      task.progress = task.target;
      task.completed = true;
    }
  }
  
  addLog(`消耗${cost}灵石，任务加速完成！`, 'success');
  renderMasterUI();
}

// 领取师徒任务奖励
function claimMasterTaskReward(taskId) {
  const task = [...masterTasks.daily, ...masterTasks.weekly].find(t => t.id === taskId);
  if (!task || !task.completed || task.claimed) {
    addLog('无法领取奖励', 'error');
    return;
  }
  
  task.claimed = true;
  
  // 发放奖励
  if (task.reward.exp) gameState.player.exp += task.reward.exp;
  if (task.reward.spiritStones) gameState.player.spiritStones += task.reward.spiritStones;
  if (task.reward.contribution) {
    if (!gameState.sect) gameState.sect = {};
    gameState.sect.contribution = (gameState.sect.contribution || 0) + task.reward.contribution;
  }
  
  addLog(`领取任务奖励: ${task.name}`, 'success');
  updateUI();
  renderMasterUI();
}

function becomeApprenticeUI(masterId) {
  const result = becomeApprentice(masterId);
  addLog(result.message, result.success ? 'success' : 'error');
  if (result.success) renderMasterUI();
}
function learnFromMasterUI() {
  const result = learnFromMaster();
  addLog(result.message, result.success ? 'success' : 'error');
}
function teachTechniqueUI() {
  const info = getMasterInfo();
  if (info.apprentices?.length > 0) {
    const result = teachTechnique(info.apprentices[0]);
    addLog(result.message, result.success ? 'success' : 'error');
  }
}

