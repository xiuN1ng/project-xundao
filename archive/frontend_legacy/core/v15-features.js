// ==================== V15 版本新增功能 ====================

// 战斗历史记录存储
let battleHistory = [];

// 任务追踪数据
let currentTasks = [];

// 显示任务追踪面板
function showTaskTrackerPanel() {
  const existingPanel = document.getElementById('taskTrackerPanel');
  if (existingPanel) {
    existingPanel.classList.toggle('active');
    if (existingPanel.classList.contains('active')) {
      renderTaskTracker();
    }
    return;
  }
  
  // 创建面板
  const panel = document.createElement('div');
  panel.id = 'taskTrackerPanel';
  panel.className = 'task-tracker-panel active';
  panel.innerHTML = `
    <div class="task-tracker-header">
      <div class="task-tracker-title">📋 当前任务</div>
      <button class="task-tracker-close" onclick="showTaskTrackerPanel()">✕</button>
    </div>
    <div class="task-tracker-list" id="taskTrackerList"></div>
  `;
  document.body.appendChild(panel);
  renderTaskTracker();
  
  // 点击外部关闭
  panel.addEventListener('click', function(e) {
    if (e.target === panel) {
      panel.classList.remove('active');
    }
  });
}

// 渲染任务追踪列表
function renderTaskTracker() {
  const listEl = document.getElementById('taskTrackerList');
  if (!listEl) return;
  
  // 收集当前进行中的任务
  const tasks = [];
  
  // 从游戏状态获取任务
  try {
    const gameState = typeof game !== 'undefined' ? game.getState() : null;
    if (gameState && gameState.player) {
      // 每日任务
      if (gameState.player.dailyQuests) {
        for (const [id, q] of Object.entries(gameState.player.dailyQuests)) {
          if (q && !q.completed) {
            tasks.push({
              id: 'daily_' + id,
              title: q.name || id,
              progress: q.progress || 0,
              target: q.target || 1,
              type: 'daily',
              desc: q.desc || ''
            });
          }
        }
      }
      
      // 每周任务
      if (gameState.player.weeklyQuests) {
        for (const [id, q] of Object.entries(gameState.player.weeklyQuests)) {
          if (q && !q.completed) {
            tasks.push({
              id: 'weekly_' + id,
              title: q.name || id,
              progress: q.progress || 0,
              target: q.target || 1,
              type: 'weekly',
              desc: q.desc || ''
            });
          }
        }
      }
      
      // 宗门任务
      if (gameState.player.sect) {
        const sect = gameState.player.sect;
        if (sect.quests) {
          for (const [id, q] of Object.entries(sect.quests)) {
            if (q && q.status === 'active') {
              tasks.push({
                id: 'sect_' + id,
                title: q.name || id,
                progress: q.progress || 0,
                target: q.target || 1,
                type: 'sect',
                desc: q.desc || ''
              });
            }
          }
        }
      }
    }
  } catch (e) {
    console.log('获取任务数据失败:', e);
  }
  
  // 如果没有任务，显示提示
  if (tasks.length === 0) {
    listEl.innerHTML = `
      <div class="task-tracker-empty">
        <div style="font-size: 40px; margin-bottom: 10px;">📋</div>
        <div>暂无进行中的任务</div>
        <div style="font-size: 12px; color: #666; margin-top: 10px;">请前往宗门或仙界接取任务</div>
      </div>
    `;
    return;
  }
  
  // 渲染任务列表
  let html = '';
  for (const task of tasks) {
    const progressPercent = Math.min(100, (task.progress / task.target) * 100);
    const isActive = progressPercent > 0 && progressPercent < 100;
    
    html += `
      <div class="task-tracker-item ${isActive ? 'active' : ''}">
        <div class="task-tracker-item-title">${task.title}</div>
        <div class="task-tracker-item-progress">
          <div class="task-tracker-progress-fill ${isActive ? 'active' : ''}" style="width: ${progressPercent}%"></div>
        </div>
        <div class="task-tracker-item-desc">${task.progress} / ${task.target} ${task.desc || ''}</div>
      </div>
    `;
  }
  
  listEl.innerHTML = html;
}

// 显示战报面板（战斗回放）
function showBattleReportPanel() {
  const backdrop = document.getElementById('battleReportBackdrop');
  const panel = document.getElementById('battleReportPanel');
  
  if (panel) {
    panel.classList.toggle('active');
    if (backdrop) backdrop.classList.toggle('active');
    if (panel.classList.contains('active')) {
      renderBattleReport();
    }
    return;
  }
  
  // 创建遮罩层
  const newBackdrop = document.createElement('div');
  newBackdrop.id = 'battleReportBackdrop';
  newBackdrop.className = 'battle-report-backdrop active';
  newBackdrop.onclick = function() {
    showBattleReportPanel();
  };
  
  // 创建面板
  const newPanel = document.createElement('div');
  newPanel.id = 'battleReportPanel';
  newPanel.className = 'battle-report-panel active';
  newPanel.innerHTML = `
    <div class="battle-report-header">
      <div class="battle-report-title">📜 战报 - 战斗回放</div>
      <button class="battle-report-close" onclick="showBattleReportPanel()">✕</button>
    </div>
    <div class="battle-report-tabs">
      <button class="battle-report-tab active" onclick="switchBattleReportTab('all', this)">全部</button>
      <button class="battle-report-tab" onclick="switchBattleReportTab('victory', this)">胜利</button>
      <button class="battle-report-tab" onclick="switchBattleReportTab('defeat', this)">失败</button>
    </div>
    <div class="battle-report-list" id="battleReportList"></div>
  `;
  
  document.body.appendChild(newBackdrop);
  document.body.appendChild(newPanel);
  renderBattleReport();
}

// 切换战报标签
function switchBattleReportTab(type, btn) {
  document.querySelectorAll('.battle-report-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderBattleReport(type);
}

// 渲染战报列表
function renderBattleReport(filterType = 'all') {
  const listEl = document.getElementById('battleReportList');
  if (!listEl) return;
  
  // 过滤战斗记录
  let filtered = battleHistory;
  if (filterType === 'victory') {
    filtered = battleHistory.filter(b => b.result === 'victory');
  } else if (filterType === 'defeat') {
    filtered = battleHistory.filter(b => b.result === 'defeat');
  }
  
  // 只显示最近20条
  filtered = filtered.slice(-20).reverse();
  
  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="battle-report-empty">
        <div style="font-size: 40px; margin-bottom: 10px;">📜</div>
        <div>暂无战斗记录</div>
        <div style="font-size: 12px; color: #666; margin-top: 10px;">挑战怪物后会记录战报</div>
      </div>
    `;
    return;
  }
  
  let html = '';
  for (const battle of filtered) {
    const resultClass = battle.result === 'victory' ? 'victory' : 'defeat';
    const resultText = battle.result === 'victory' ? '胜利' : '失败';
    const time = new Date(battle.time).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    
    html += `
      <div class="battle-report-item" onclick="toggleBattleReportDetail('${battle.id}', this)">
        <div class="battle-report-item-header">
          <div class="battle-report-item-title">${battle.monsterName || '怪物'}</div>
          <div class="battle-report-item-result ${resultClass}">${resultText}</div>
        </div>
        <div class="battle-report-item-info">
          ${time} | 造成伤害: ${battle.damage || 0} | 获得经验: ${battle.exp || 0}
        </div>
        <div class="battle-report-detail" id="detail_${battle.id}">
          <div class="battle-report-detail-title">战斗详情</div>
          <div class="battle-report-detail-content">
            ${battle.details || '战斗详情已丢失'}
          </div>
        </div>
      </div>
    `;
  }
  
  listEl.innerHTML = html;
}

// 切换战报详情显示
function toggleBattleReportDetail(id, el) {
  const detail = document.getElementById('detail_' + id);
  if (detail) {
    detail.classList.toggle('active');
  }
}

// 添加战斗记录
function addBattleRecord(battleData) {
  const record = {
    id: 'battle_' + Date.now(),
    time: Date.now(),
    result: battleData.result || 'victory',
    monsterName: battleData.monsterName || '怪物',
    damage: battleData.damage || 0,
    exp: battleData.exp || 0,
    spirit: battleData.spirit || 0,
    drops: battleData.drops || [],
    details: battleData.details || ''
  };
  
  battleHistory.push(record);
  
  // 最多保留100条记录
  if (battleHistory.length > 100) {
    battleHistory = battleHistory.slice(-100);
  }
  
  // 显示掉落提示
  if (record.drops && record.drops.length > 0) {
    showDropNotification(record.drops);
  }
}

// 显示掉落提示
function showDropNotification(drops) {
  const container = document.getElementById('dropNotificationContainer');
  if (!container) {
    const newContainer = document.createElement('div');
    newContainer.id = 'dropNotificationContainer';
    newContainer.className = 'drop-notification';
    document.body.appendChild(newContainer);
  }
  
  const dropContainer = document.getElementById('dropNotificationContainer');
  
  for (const drop of drops) {
    const qualityClass = getQualityClass(drop.quality || 'common');
    const icon = getDropIcon(drop.type);
    
    const dropEl = document.createElement('div');
    dropEl.className = 'drop-item';
    dropEl.innerHTML = `
      <div class="drop-glow"></div>
      <div class="drop-item-icon">${icon}</div>
      <div class="drop-item-info">
        <div class="drop-item-name">${drop.name || '物品'}</div>
        <div class="drop-item-quality ${qualityClass}">${getQualityText(drop.quality || 'common')}</div>
      </div>
      <div class="drop-item-count">x${drop.count || 1}</div>
    `;
    
    dropContainer.appendChild(dropEl);
    
    // 3秒后移除
    setTimeout(() => {
      dropEl.style.animation = 'dropPop 0.3s ease reverse';
      setTimeout(() => dropEl.remove(), 300);
    }, 3000);
  }
}

// 获取品质样式类
function getQualityClass(quality) {
  const map = {
    'common': 'common',
    'uncommon': 'uncommon',
    'rare': 'rare',
    'epic': 'epic',
    'legendary': 'legendary'
  };
  return map[quality] || 'common';
}

// 获取品质文本
function getQualityText(quality) {
  const map = {
    'common': '普通',
    'uncommon': '优秀',
    'rare': '稀有',
    'epic': '史诗',
    'legendary': '传说'
  };
  return map[quality] || '普通';
}

// 获取掉落图标
function getDropIcon(type) {
  const map = {
    'equipment': '⚔️',
    'material': '🧪',
    'spirit': '✨',
    'item': '📦',
    'fashion': '👗',
    'artifact': '🔮'
  };
  return map[type] || '📦';
}

// 更新任务追踪徽章
function updateTaskBadge() {
  try {
    const gameState = typeof game !== 'undefined' ? game.getState() : null;
    let taskCount = 0;
    
    if (gameState && gameState.player) {
      if (gameState.player.dailyQuests) {
        taskCount += Object.values(gameState.player.dailyQuests || {}).filter(q => q && !q.completed).length;
      }
      if (gameState.player.weeklyQuests) {
        taskCount += Object.values(gameState.player.weeklyQuests || {}).filter(q => q && !q.completed).length;
      }
      if (gameState.player.sect && gameState.player.sect.quests) {
        taskCount += Object.values(gameState.player.sect.quests || {}).filter(q => q && q.status === 'active').length;
      }
    }
    
    const btn = document.getElementById('taskTrackerBtn');
    if (btn) {
      let badge = btn.querySelector('.task-badge');
      if (taskCount > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'task-badge';
          btn.style.position = 'relative';
          btn.appendChild(badge);
        }
        badge.textContent = taskCount > 9 ? '9+' : taskCount;
      } else if (badge) {
        badge.remove();
      }
    }
  } catch (e) {}
}

// 更新战报徽章
function updateReportBadge() {
  const unreadCount = battleHistory.length > 0 ? Math.min(9, battleHistory.length) : 0;
  const btn = document.querySelector('button[onclick="showBattleReportPanel()"]');
  if (btn) {
    let badge = btn.querySelector('.report-badge');
    if (unreadCount > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'report-badge';
        btn.style.position = 'relative';
        btn.appendChild(badge);
      }
      badge.textContent = unreadCount;
    } else if (badge) {
      badge.remove();
    }
  }
}

