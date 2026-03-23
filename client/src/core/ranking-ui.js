// ==================== 封神榜 UI ====================
let currentFengshenTab = 'ranking';

function showFengshenPanel() {
  document.getElementById('fengshenModal').classList.add('active');
  currentFengshenTab = 'ranking';
  renderFengshenUI();
}

function switchFengshenTab(tab) {
  currentFengshenTab = tab;
  renderFengshenUI();
}

function renderFengshenUI() {
  const container = document.getElementById('fengshenContent');
  
  // 获取模拟封神榜数据
  const fengshenData = generateMockFengshenData();
  const myRank = Math.floor(Math.random() * 50) + 1;
  
  let html = `
    <div class="fengshen-header">
      <div class="fengshen-header-title">🔱 封神榜</div>
      <div class="fengshen-header-subtitle">挑战群仙，争夺封神之名</div>
    </div>
    
    <div class="fengshen-season">
      <div class="fengshen-season-label">第${fengshenData.season}赛季</div>
      <div class="fengshen-season-time">剩余 ${fengshenData.remainTime}</div>
    </div>
    
    <div class="fengshen-my-rank">
      <div class="fengshen-my-rank-label">我的排名</div>
      <div class="fengshen-my-rank-value">第 ${myRank} 名</div>
    </div>
    
    <div class="fengshen-tabs">
      <div class="fengshen-tab ${currentFengshenTab === 'ranking' ? 'active' : ''}" onclick="switchFengshenTab('ranking')">📊 排行榜</div>
      <div class="fengshen-tab ${currentFengshenTab === 'rewards' ? 'active' : ''}" onclick="switchFengshenTab('rewards')">🎁 奖励</div>
    </div>
  `;
  
  if (currentFengshenTab === 'ranking') {
    html += `<div class="fengshen-list">`;
    
    fengshenData.list.forEach((item, index) => {
      const rankClass = index < 3 ? `fengshen-rank-${index + 1}` : 'fengshen-rank-other';
      const rankIcon = index === 0 ? '👑' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : ''));
      
      html += `
        <div class="fengshen-item">
          <div class="fengshen-rank ${rankClass}">${rankIcon || (index + 1)}</div>
          <div class="fengshen-info">
            <div class="fengshen-name">${item.name}</div>
            <div class="fengshen-realm">${item.realm}</div>
          </div>
          <div class="fengshen-power">${formatNumber(item.power)}</div>
          <button class="fengshen-challenge-btn" onclick="challengeFengshen('${item.playerId}', '${item.name}')">挑战</button>
        </div>
      `;
    });
    
    html += `</div>`;
  } else if (currentFengshenTab === 'rewards') {
    html += `
      <div class="fengshen-rewards">
        <div class="fengshen-rewards-title">🏆 赛季奖励</div>
        <div class="fengshen-rewards-grid">
          <div class="fengshen-reward-item">
            <div class="fengshen-reward-rank">👑</div>
            <div class="fengshen-reward-name">第1名</div>
          </div>
          <div class="fengshen-reward-item">
            <div class="fengshen-reward-rank">🥇</div>
            <div class="fengshen-reward-name">至臻称号</div>
          </div>
          <div class="fengshen-reward-item">
            <div class="fengshen-reward-rank">💎</div>
            <div class="fengshen-reward-name">10万灵石</div>
          </div>
          <div class="fengshen-reward-item">
            <div class="fengshen-reward-rank">🥈</div>
            <div class="fengshen-reward-name">第2-3名</div>
          </div>
          <div class="fengshen-reward-item">
            <div class="fengshen-reward-rank">🥉</div>
            <div class="fengshen-reward-name">稀有称号</div>
          </div>
          <div class="fengshen-reward-item">
            <div class="fengshen-reward-rank">💎</div>
            <div class="fengshen-reward-name">5万灵石</div>
          </div>
          <div class="fengshen-reward-item">
            <div class="fengshen-reward-rank">4-10</div>
            <div class="fengshen-reward-name">第4-10名</div>
          </div>
          <div class="fengshen-reward-item">
            <div class="fengshen-reward-rank">🎖️</div>
            <div class="fengshen-reward-name">精英称号</div>
          </div>
          <div class="fengshen-reward-item">
            <div class="fengshen-reward-rank">💎</div>
            <div class="fengshen-reward-name">2万灵石</div>
          </div>
        </div>
      </div>
    `;
  }
  
  container.innerHTML = html;
}

function generateMockFengshenData() {
  const names = ['东皇太一', '昊天上帝', '女娲娘娘', '伏羲圣皇', '神农氏', '轩辕黄帝', '蚩尤', '后羿', '嫦娥', '太乙真人'];
  const realms = ['大乘期圆满', '大乘期', '合体期圆满', '合体期', '炼虚期圆满'];
  
  const list = [];
  for (let i = 0; i < 10; i++) {
    list.push({
      playerId: `fengshen_${i}`,
      name: names[i],
      realm: realms[i],
      power: Math.floor(10000000 * (10 - i) * (1 + Math.random() * 0.3))
    });
  }
  
  return {
    season: 1,
    remainTime: '5天12时',
    list: list
  };
}

function challengeFengshen(playerId, playerName) {
  // 模拟挑战逻辑
  const win = Math.random() > 0.4;
  
  if (win) {
    showMessage(`🎉 挑战成功！击败了 ${playerName}`, 'success');
  } else {
    showMessage(`💀 挑战失败... ${playerName} 实力太强`, 'error');
  }
  
  // 刷新排行榜
  renderFengshenUI();
}

