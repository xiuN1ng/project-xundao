// ==================== 渡劫系统 ====================
let tribulationData = {
  selectedType: null,
  bonuses: {},
  currentRealm: '金丹',
  targetRealm: '元婴',
  spiritRequired: 50000,
  baseSuccessRate: 70
};

// 渡劫类型映射 (用于 API)
const tribulationTypeMap = {
  'metal': '金劫',
  'wood': '木劫',
  'water': '水劫',
  'fire': '火劫',
  'earth': '土劫',
  'heart_demon': '心魔劫',
  'heavenly_thunder': '九天雷劫'
};

// API 基础地址
const API_BASE = 'http://localhost:3001';

// 打开渡劫面板
function openTribulationModal() {
  const state = game.getState();
  tribulationData.currentRealm = state.player.realm;
  tribulationData.targetRealm = getNextRealm(state.player.realm);
  tribulationData.spiritRequired = getSpiritRequired(state.player.realm);
  
  // 获取天劫类型和成功率
  fetchTribulationTypes();
  document.getElementById('tribulationModal').classList.add('active');
}

// 获取下一境界
function getNextRealm(realm) {
  const realmNext = {
    '凡人': '炼气',
    '炼气': '筑基',
    '筑基': '金丹',
    '金丹': '元婴',
    '元婴': '化神',
    '化神': '炼虚',
    '炼虚': '合体',
    '合体': '大乘',
    '大乘': '飞升',
    '飞升': null
  };
  return realmNext[realm] || null;
}

// 获取突破所需灵气
function getSpiritRequired(realm) {
  const spiritRequired = {
    '凡人': 1000,
    '炼气': 10000,
    '筑基': 50000,
    '金丹': 200000,
    '元婴': 800000,
    '化神': 3000000,
    '炼虚': 10000000,
    '合体': 50000000,
    '大乘': 100000000,
    '飞升': 0
  };
  return spiritRequired[realm] || 0;
}

// 获取天劫类型列表
async function fetchTribulationTypes() {
  try {
    const response = await fetch(`${API_BASE}/api/tribulation/types?realm=${encodeURIComponent(tribulationData.currentRealm)}`);
    const result = await response.json();
    
    if (result.success) {
      tribulationData.types = result.data;
      renderTribulationUI();
    } else {
      // 如果 API 失败，使用默认数据
      tribulationData.types = [
        { id: 'water', name: '水劫', element: '水', icon: '💧', color: '#1E90FF', description: '水属性雷劫', baseSuccessRate: 0.7 },
        { id: 'fire', name: '火劫', element: '火', icon: '🔥', color: '#FF4500', description: '火属性雷劫', baseSuccessRate: 0.6 }
      ];
      tribulationData.selectedType = tribulationData.types[0];
      renderTribulationUI();
    }
  } catch (error) {
    console.error('获取天劫类型失败:', error);
    // 使用默认数据
    tribulationData.types = [
      { id: 'water', name: '水劫', element: '水', icon: '💧', color: '#1E90FF', description: '水属性雷劫', baseSuccessRate: 0.7 },
      { id: 'fire', name: '火劫', element: '火', icon: '🔥', color: '#FF4500', description: '火属性雷劫', baseSuccessRate: 0.6 }
    ];
    tribulationData.selectedType = tribulationData.types[0];
    renderTribulationUI();
  }
}

// 渲染渡劫UI
function renderTribulationUI() {
  const state = game.getState();
  const container = document.getElementById('tribulationInfo');
  const spiritPercent = Math.min(100, (state.player.spirit / tribulationData.spiritRequired) * 100);
  const canBreakthrough = state.player.spirit >= tribulationData.spiritRequired;
  
  const selectedType = tribulationData.selectedType || tribulationData.types?.[0];
  const successRate = selectedType ? Math.round(selectedType.baseSuccessRate * 100) : 70;
  
  let html = `
    <div class="tribulation-container">
      <div class="tribulation-header">
        <div class="tribulation-current-realm">当前境界</div>
        <div class="tribulation-realm-name">${state.player.realm}</div>
        <div class="tribulation-arrow">⬇️</div>
        <div class="tribulation-target-realm">突破目标: ${tribulationData.targetRealm || '无'}</div>
      </div>
      
      <div class="tribulation-spirit">
        <div class="tribulation-spirit-label">
          <span>灵气</span>
          <span>${fmt(state.player.spirit)} / ${fmt(tribulationData.spiritRequired)}</span>
        </div>
        <div class="tribulation-spirit-bar">
          <div class="tribulation-spirit-fill ${canBreakthrough ? 'ready' : ''}" style="width: ${spiritPercent}%"></div>
        </div>
      </div>
      
      <div class="tribulation-section">
        <div class="tribulation-section-title">🌩️ 选择天劫类型</div>
        <div class="tribulation-types">
          ${(tribulationData.types || []).map(type => `
            <div class="tribulation-type-card ${selectedType?.id === type.id ? 'selected' : ''}" 
                 onclick="selectTribulationType('${type.id}')">
              <div class="tribulation-type-icon">${type.icon}</div>
              <div class="tribulation-type-name">${type.name}</div>
              <div class="tribulation-type-element">${type.description || type.element + '属性'}</div>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div class="tribulation-success-rate">
        <div class="tribulation-success-label">渡劫成功率</div>
        <div class="tribulation-success-value">${successRate}%</div>
      </div>
      
      <div class="tribulation-actions">
        <button class="tribulation-btn tribulation-btn-start" 
                onclick="startTribulation()" 
                ${!canBreakthrough || !tribulationData.targetRealm ? 'disabled' : ''}>
          ${!tribulationData.targetRealm ? '已达最高境界' : (!canBreakthrough ? '灵气不足' : '开始渡劫 ⚡')}
        </button>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

// 选择天劫类型
function selectTribulationType(typeId) {
  tribulationData.selectedType = tribulationData.types.find(t => t.id === typeId);
  renderTribulationUI();
}

// 开始渡劫
async function startTribulation() {
  const state = game.getState();
  const selectedType = tribulationData.selectedType;
  
  if (!selectedType || !tribulationData.targetRealm) {
    return;
  }
  
  // 显示渡劫动画
  showTribulationAnimation();
  
  try {
    const response = await fetch(`${API_BASE}/api/tribulation/attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        realm: tribulationData.currentRealm,
        tribulationType: selectedType.id,
        bonuses: tribulationData.bonuses || {}
      })
    });
    
    const result = await response.json();
    
    // 隐藏动画
    hideTribulationAnimation();
    
    if (result.success && result.data) {
      handleTribulationResult(result.data);
    } else {
      // API 失败时模拟结果
      simulateTribulation();
    }
  } catch (error) {
    console.error('渡劫请求失败:', error);
    hideTribulationAnimation();
    // 模拟渡劫
    simulateTribulation();
  }
}

// 模拟渡劫结果 (当 API 不可用时)
function simulateTribulation() {
  const state = game.getState();
  const selectedType = tribulationData.selectedType;
  const successRate = selectedType?.baseSuccessRate || 0.7;
  const random = Math.random();
  const success = random < successRate;
  
  const result = {
    success,
    currentRealm: tribulationData.currentRealm,
    targetRealm: tribulationData.targetRealm,
    tribulationType: selectedType,
    successRate: Math.round(successRate * 100),
    rewards: success ? {
      spirit: tribulationData.spiritRequired * 4,
      spiritStones: tribulationData.spiritRequired / 10,
      item: getRewardItem(tribulationData.targetRealm)
    } : null,
    penalty: success ? null : { spiritLoss: 0.3, message: '重伤' },
    message: success ? `🎊 渡劫成功！恭喜突破至${tribulationData.targetRealm}！` : `💀 渡劫失败！损失30%当前灵气`
  };
  
  handleTribulationResult(result);
}

// 获取奖励物品
function getRewardItem(realm) {
  const items = {
    '筑基': '筑基丹',
    '金丹': '金丹',
    '元婴': '元婴丹',
    '化神': '化神果',
    '炼虚': '炼虚丹',
    '合体': '合体期功法碎片',
    '大乘': '大乘期功法碎片',
    '飞升': '仙品装备'
  };
  return items[realm] || '境界突破奖励';
}

// 处理渡劫结果
function handleTribulationResult(result) {
  const state = game.getState();
  
  if (result.success) {
    // 渡劫成功
    const oldRealm = state.player.realm;
    state.player.realm = result.targetRealm;
    state.player.spirit = state.player.spirit - tribulationData.spiritRequired;
    state.stats.realmBreaks = (state.stats.realmBreaks || 0) + 1;
    
    // 添加奖励
    if (result.rewards) {
      state.player.spirit += result.rewards.spirit || 0;
      state.player.spiritStones += result.rewards.spiritStones || 0;
      
      // 添加物品到背包
      if (result.rewards.item) {
        const inventory = state.player.artifacts_inventory || {};
        const itemName = result.rewards.item;
        inventory[itemName] = (inventory[itemName] || 0) + (result.rewards.itemCount || 1);
        state.player.artifacts_inventory = inventory;
      }
    }
    
    addLog(`🎊 渡劫成功！恭喜突破至${result.targetRealm}！`, 'success');
    
    // 更新 UI
    updateUI(game.getState());
  } else {
    // 渡劫失败
    const spiritLoss = result.penalty?.spiritLoss || 0.3;
    state.player.spirit = Math.floor(state.player.spirit * (1 - spiritLoss));
    
    addLog(`💀 渡劫失败！${result.penalty?.message || '重伤'}，损失${Math.round(spiritLoss * 100)}%当前灵气`, 'error');
    
    updateUI(game.getState());
  }
  
  // 重新渲染渡劫 UI
  tribulationData.currentRealm = result.success ? result.targetRealm : tribulationData.currentRealm;
  tribulationData.targetRealm = getNextRealm(tribulationData.currentRealm);
  tribulationData.spiritRequired = getSpiritRequired(tribulationData.currentRealm);
  renderTribulationResult(result);
}

// 渲染渡劫结果
function renderTribulationResult(result) {
  const container = document.getElementById('tribulationInfo');
  
  let html = `
    <div class="tribulation-result">
      <div class="tribulation-result-icon">${result.success ? '🎊' : '💀'}</div>
      <div class="tribulation-result-title ${result.success ? 'success' : 'fail'}">
        ${result.success ? '渡劫成功!' : '渡劫失败'}
      </div>
      <div class="tribulation-result-message">${result.message}</div>
  `;
  
  if (result.success && result.rewards) {
    html += `
      <div class="tribulation-rewards">
        <div style="color:#ffd700;margin-bottom:10px;font-weight:bold;">🎁 突破奖励</div>
        <div class="tribulation-reward-item">
          <span class="tribulation-reward-icon">⚡</span>
          <span class="tribulation-reward-name">灵气</span>
          <span class="tribulation-reward-value">+${fmt(result.rewards.spirit)}</span>
        </div>
        <div class="tribulation-reward-item">
          <span class="tribulation-reward-icon">💰</span>
          <span class="tribulation-reward-name">灵石</span>
          <span class="tribulation-reward-value">+${fmt(result.rewards.spiritStones)}</span>
        </div>
        ${result.rewards.item ? `
        <div class="tribulation-reward-item">
          <span class="tribulation-reward-icon">🎁</span>
          <span class="tribulation-reward-name">${result.rewards.item}</span>
          <span class="tribulation-reward-value">x${result.rewards.itemCount || 1}</span>
        </div>
        ` : ''}
      </div>
    `;
  }
  
  html += `
    <div class="tribulation-actions">
      <button class="tribulation-btn tribulation-btn-start" onclick="closeTribulationAndContinue()">
        ${result.success ? '继续修炼 🚀' : '继续努力 💪'}
      </button>
    </div>
    </div>
  `;
  
  container.innerHTML = html;
}

// 关闭渡劫并继续
function closeTribulationAndContinue() {
  closeModal('tribulationModal');
  tribulationData.selectedType = null;
  tribulationData.bonuses = {};
}

// 显示渡劫动画
function showTribulationAnimation() {
  let thunderEl = document.getElementById('tribulationThunder');
  if (!thunderEl) {
    thunderEl = document.createElement('div');
    thunderEl.id = 'tribulationThunder';
    thunderEl.className = 'tribulation-thunder';
    thunderEl.innerHTML = `
      <div class="tribulation-thunder-content">
        <div class="tribulation-thunder-icon">⚡</div>
        <div class="tribulation-thunder-text">天劫降临中...</div>
      </div>
    `;
    document.body.appendChild(thunderEl);
  }
  thunderEl.classList.add('active');
}

// 隐藏渡劫动画
function hideTribulationAnimation() {
  const thunderEl = document.getElementById('tribulationThunder');
  if (thunderEl) {
    thunderEl.classList.remove('active');
  }
}

