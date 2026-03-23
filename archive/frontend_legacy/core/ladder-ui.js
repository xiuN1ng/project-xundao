// ==================== 天梯 UI ====================
let ladderSearching = false;
let currentLadderDivision = 2;
let ladderStars = 3;

const LADDER_DIVISIONS = [
  { name: '青铜', icon: '🥉', color: '#CD7F32' },
  { name: '白银', icon: '🥈', color: '#C0C0C0' },
  { name: '黄金', icon: '🥇', color: '#FFD700' },
  { name: '钻石', icon: '💎', color: '#667eea' }
];

function showLadderPanel() {
  document.getElementById('ladderModal').classList.add('active');
  renderLadderUI();
}

function renderLadderUI() {
  const container = document.getElementById('ladderContent');
  const division = LADDER_DIVISIONS[currentLadderDivision];
  const progress = (ladderStars / 5) * 100;
  
  let html = `
    <div class="ladder-header">
      <div class="ladder-header-title">⚔️ 天梯竞技</div>
      <div class="ladder-header-subtitle">实时匹配，争夺最高段位</div>
    </div>
    
    <div class="ladder-current-rank">
      <div class="ladder-rank-icon">${division.icon}</div>
      <div class="ladder-rank-name">${division.name}${ladderStars}星</div>
      <div class="ladder-rank-score">积分: ${1200 + ladderStars * 200}</div>
      <div class="ladder-rank-progress">
        <div class="ladder-rank-progress-bar" style="width: ${progress}%"></div>
      </div>
    </div>
    
    <button class="ladder-match-btn ${ladderSearching ? 'searching' : ''}" 
            id="ladderMatchBtn" 
            onclick="startLadderMatch()">
      ${ladderSearching ? '🔍 匹配中...' : '⚔️ 开始匹配'}
    </button>
    
    <div class="ladder-seasons">
      <div class="ladder-seasons-title">📜 历史赛季</div>
      <div class="ladder-season-item">
        <div class="ladder-season-rank ladder-season-rank-gold">1</div>
        <div class="ladder-season-name">第1赛季</div>
        <div class="ladder-season-reward">🥇 黄金</div>
      </div>
      <div class="ladder-season-item">
        <div class="ladder-season-rank ladder-season-rank-silver">2</div>
        <div class="ladder-season-name">第2赛季</div>
        <div class="ladder-season-reward">🥈 白银</div>
      </div>
    </div>
    
    <div class="ladder-divisions">
      ${LADDER_DIVISIONS.map((d, i) => `
        <div class="ladder-division ${i === currentLadderDivision ? 'active' : ''}" onclick="selectLadderDivision(${i})">
          <div class="ladder-division-icon">${d.icon}</div>
          <div class="ladder-division-name">${d.name}</div>
          <div class="ladder-division-stars">${i === currentLadderDivision ? '★'.repeat(ladderStars) : ''}</div>
        </div>
      `).join('')}
    </div>
  `;
  
  container.innerHTML = html;
}

function selectLadderDivision(divisionIndex) {
  currentLadderDivision = divisionIndex;
  ladderStars = 1;
  renderLadderUI();
}

function startLadderMatch() {
  if (ladderSearching) return;
  
  ladderSearching = true;
  renderLadderUI();
  
  // 模拟匹配时间
  setTimeout(() => {
    const win = Math.random() > 0.5;
    
    if (win) {
      ladderStars = Math.min(5, ladderStars + 1);
      showMessage(`🎉 匹配战斗胜利！获得${LADDER_DIVISIONS[currentLadderDivision].name}${ladderStars}星`, 'success');
      
      // 升级段位
      if (ladderStars >= 5 && currentLadderDivision < 3) {
        currentLadderDivision++;
        ladderStars = 1;
        showMessage(`🏆 恭喜升段至${LADDER_DIVISIONS[currentLadderDivision].name}！`, 'success');
      }
    } else {
      ladderStars = Math.max(1, ladderStars - 1);
      showMessage(`💀 匹配战斗失败...`, 'error');
      
      // 降段位
      if (ladderStars === 1 && currentLadderDivision > 0) {
        currentLadderDivision--;
        ladderStars = 5;
        showMessage(`📉 降至${LADDER_DIVISIONS[currentLadderDivision].name}段位`, 'error');
      }
    }
    
    ladderSearching = false;
    renderLadderUI();
  }, 3000);
}

