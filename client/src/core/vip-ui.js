// ==================== VIP系统 ====================
let vipData = {
  level: 0,
  expireDate: null,
  dailyClaimed: false,
  totalRecharge: 0
};

// VIP等级配置
const VIP_LEVELS = {
  1: { name: 'VIP1', icon: '🌟', price: 6, color: '#c0c0c0', benefits: ['每日领取100灵石', '修炼速度+5%', '灵兽属性+5%'] },
  2: { name: 'VIP2', icon: '⭐', price: 30, color: '#4ecdc4', benefits: ['每日领取300灵石', '修炼速度+10%', '灵兽属性+10%', '战斗掉落+5%'] },
  3: { name: 'VIP3', icon: '🌟', price: 98, color: '#667eea', benefits: ['每日领取500灵石', '修炼速度+15%', '灵兽属性+15%', '战斗掉落+10%', '专属称号'] },
  4: { name: 'VIP4', icon: '✨', price: 298, color: '#9b59b6', benefits: ['每日领取1000灵石', '修炼速度+20%', '灵兽属性+20%', '战斗掉落+15%', '专属法宝'] },
  5: { name: 'VIP5', icon: '💫', price: 588, color: '#e74c3c', benefits: ['每日领取2000灵石', '修炼速度+25%', '灵兽属性+25%', '战斗掉落+20%', '专属灵兽'] },
  6: { name: 'VIP6', icon: '🔥', price: 998, color: '#f39c12', benefits: ['每日领取5000灵石', '修炼速度+30%', '灵兽属性+30%', '战斗掉落+25%', '仙侣技能全开'] },
  7: { name: 'VIP7', icon: '👑', price: 1998, color: '#ffd700', benefits: ['每日领取10000灵石', '修炼速度+40%', '灵兽属性+40%', '战斗掉落+30%', '渡劫成功率+5%'] },
  8: { name: 'VIP8', icon: '💎', price: 4998, color: '#ff4500', benefits: ['每日领取50000灵石', '修炼速度+50%', '灵兽属性+50%', '战斗掉落+50%', '渡劫成功率+10%', '全服特效'] }
};

// 显示VIP面板
function showVipPanel() {
  document.getElementById('vipModal').classList.add('active');
  renderVipUI();
}

// 渲染VIP UI
function renderVipUI() {
  const container = document.getElementById('vipContent');
  const state = game ? game.getState() : gameState;
  const playerVip = state.player.vip || { level: 0, expireDate: null, dailyClaimed: false };
  
  // 检查VIP是否过期
  if (playerVip.expireDate && new Date(playerVip.expireDate) < new Date()) {
    playerVip.level = 0;
    playerVip.expireDate = null;
  }
  
  if (playerVip.level === 0) {
    // 非VIP或已过期
    container.innerHTML = `
      <div class="vip-not-member">
        <div class="vip-not-member-icon">💎</div>
        <h3>开通VIP会员</h3>
        <p>尊享特权，修炼快人一步！</p>
        <div class="vip-grade-list">
          ${renderVipGradeList(0)}
        </div>
      </div>
    `;
  } else {
    // VIP会员
    const vipInfo = VIP_LEVELS[playerVip.level];
    const expireText = playerVip.expireDate ? new Date(playerVip.expireDate).toLocaleDateString() : '永久';
    
    container.innerHTML = `
      <div class="vip-info-card">
        <div class="vip-level-display">${vipInfo.icon}</div>
        <div class="vip-level-name">${vipInfo.name}</div>
        <div class="vip-expire">有效期至: <strong>${expireText}</strong></div>
      </div>
      
      <div class="vip-benefits">
        <div class="vip-benefit-title">⭐ 您的特权</div>
        ${vipInfo.benefits.map(b => `
          <div class="vip-benefit-item">
            <span class="vip-benefit-icon">✓</span>
            <span class="vip-benefit-name">${b}</span>
          </div>
        `).join('')}
      </div>
      
      <div class="vip-daily-rewards">
        <div class="vip-daily-title">🎁 每日奖励</div>
        <div class="vip-daily-item">
          <span>每日灵石</span>
          <span class="${playerVip.dailyClaimed ? 'vip-claimed' : ''}">${playerVip.dailyClaimed ? '✅ 已领取' : `+${playerVip.level * 100}`}</span>
        </div>
        ${!playerVip.dailyClaimed ? `
          <button class="vip-claim-btn" style="width:100%;margin-top:10px" onclick="claimVipDaily()">领取今日奖励</button>
        ` : ''}
      </div>
      
      <div class="vip-grade-list" style="margin-top:15px">
        <div class="vip-benefit-title" style="margin-bottom:10px">升级VIP</div>
        ${renderVipGradeList(playerVip.level)}
      </div>
    `;
  }
}

// 渲染VIP等级列表
function renderVipGradeList(currentLevel) {
  let html = '';
  for (let i = 1; i <= 8; i++) {
    const vip = VIP_LEVELS[i];
    const isCurrent = currentLevel === i;
    const isNext = currentLevel === i - 1;
    
    html += `
      <div class="vip-grade-card vip${i} ${isCurrent ? 'current' : ''}" 
           onclick="selectVipGrade(${i})">
        <div class="vip-grade-icon">${vip.icon}</div>
        <div class="vip-grade-info">
          <div class="vip-grade-name-text" style="color:${vip.color}">${vip.name}</div>
          <div class="vip-grade-price">¥${vip.price}</div>
          <div class="vip-grade-benefits">${vip.benefits[0]}</div>
        </div>
        ${isNext ? '<button class="btn btn-sm" style="background:linear-gradient(135deg,#ffd700,#ff8c00)">升级</button>' : ''}
        ${isCurrent ? '<span style="color:#4ecdc4;font-weight:bold">当前</span>' : ''}
      </div>
    `;
  }
  return html;
}

// 选择VIP等级
let selectedVipGrade = 1;
function selectVipGrade(grade) {
  selectedVipGrade = grade;
  const container = document.getElementById('vipContent');
  const state = game ? game.getState() : gameState;
  const playerVip = state.player.vip || { level: 0 };
  const currentLevel = playerVip.level;
  
  if (grade <= currentLevel) {
    addLog('您已拥有此VIP等级', 'warning');
    return;
  }
  
  const vipInfo = VIP_LEVELS[grade];
  
  // 显示确认购买弹窗
  if (confirm(`确定要开通${vipInfo.name}吗？\n价格: ¥${vipInfo.price}\n有效期: 30天`)) {
    // 模拟购买（实际应该调用支付接口）
    purchaseVip(grade, vipInfo.price);
  }
}

// 购买VIP
function purchaseVip(grade, price) {
  const state = game ? game.getState() : gameState;
  
  // 检查玩家灵石是否足够
  const costSpiritStones = price * 1000; // 假设1元=1000灵石
  if (state.player.spiritStones < costSpiritStones) {
    addLog(`灵石不足，需要 ${costSpiritStones} 灵石`, 'error');
    return;
  }
  
  // 扣除灵石
  state.player.spiritStones -= costSpiritStones;
  
  // 更新VIP状态
  if (!state.player.vip) {
    state.player.vip = { level: 0, expireDate: null, dailyClaimed: false };
  }
  
  const oldLevel = state.player.vip.level;
  state.player.vip.level = grade;
  
  // 计算过期时间（30天）
  const expireDate = new Date();
  expireDate.setDate(expireDate.getDate() + 30);
  state.player.vip.expireDate = expireDate.toISOString();
  state.player.vip.dailyClaimed = false;
  
  addLog(`🎉 恭喜开通${VIP_LEVELS[grade].name}！有效期30天`, 'success');
  
  // 更新UI
  if (game) {
    updateUI(game.getState());
  } else {
    updateUI(state);
  }
  
  renderVipUI();
  saveGameData();
}

// 领取VIP每日奖励
function claimVipDaily() {
  const state = game ? game.getState() : gameState;
  const playerVip = state.player.vip;
  
  if (!playerVip || playerVip.level === 0) {
    addLog('您还不是VIP会员', 'error');
    return;
  }
  
  if (playerVip.dailyClaimed) {
    addLog('今日奖励已领取', 'warning');
    return;
  }
  
  // 发放奖励
  const reward = playerVip.level * 100;
  state.player.spiritStones += reward;
  playerVip.dailyClaimed = true;
  
  addLog(`🎁 领取VIP每日奖励成功！+${reward}灵石`, 'success');
  
  if (game) {
    updateUI(game.getState());
  } else {
    updateUI(state);
  }
  
  renderVipUI();
  saveGameData();
}

