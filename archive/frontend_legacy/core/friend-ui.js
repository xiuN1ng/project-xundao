// ==================== 好友系统 UI ====================
let friendCurrentTab = 'friends';

function showFriendPanel() {
  document.getElementById('friendModal').classList.add('active');
  friendCurrentTab = 'friends';
  renderFriendUI();
}

function switchFriendTab(tab) {
  friendCurrentTab = tab;
  renderFriendUI();
}

function renderFriendUI() {
  const container = document.getElementById('friendContent');
  const friends = getFriends();
  const pending = getPendingList();
  
  let html = `<div class="friend-header">
    <div class="friend-header-title">👥 好友系统</div>
    <div class="friend-header-stats">已有 ${friends.length} 位好友</div>
  </div>`;
  
  // 添加好友
  html += `<div class="friend-add-section">
    <div class="friend-add-title">➕ 添加好友</div>
    <div class="friend-add-form">
      <input type="text" id="friendAddInput" class="friend-add-input" placeholder="输入玩家名称">
      <button class="btn" style="background: linear-gradient(135deg, #3b82f6, #2563eb)" onclick="addFriendUI()">添加</button>
    </div>
  </div>`;
  
  // 标签页
  const tabs = [
    { id: 'friends', name: '好友', icon: '👥', count: friends.length },
    { id: 'pending', name: '申请', icon: '📨', count: pending.length }
  ];
  
  html += '<div class="friend-tabs">';
  for (const t of tabs) {
    const badge = t.count > 0 ? `<span class="friend-tab-badge">${t.count}</span>` : '';
    html += `<button class="friend-tab ${friendCurrentTab === t.id ? 'active' : ''}" onclick="switchFriendTab('${t.id}')">${t.icon} ${t.name}${badge}</button>`;
  }
  html += '</div>';
  
  // 内容
  if (friendCurrentTab === 'friends') {
    html += renderFriendList(friends);
  } else {
    html += renderPendingList(pending);
  }
  
  container.innerHTML = html;
}

function renderFriendList(friends) {
  if (friends.length === 0) {
    return `<div class="friend-empty">
      <div class="friend-empty-icon">😔</div>
      <div>还没有好友，快去添加吧！</div>
    </div>`;
  }
  
  let html = '<div class="friend-list">';
  for (const f of friends) {
    html += `<div class="friend-card">
      <div class="friend-avatar">🧑</div>
      <div class="friend-info">
        <div class="friend-name">${f.name}</div>
        <div class="friend-level">等级 ${f.level || 1}</div>
        <div class="friend-realm">${f.realm || '练气'}</div>
      </div>
      <div class="friend-actions">
        <button class="friend-btn friend-btn-gift" onclick="showGiftPanel('${f.name}')">🎁 送礼</button>
        <button class="friend-btn friend-btn-delete" onclick="removeFriendUI('${f.name}')">删除</button>
      </div>
    </div>`;
  }
  html += '</div>';
  return html;
}

function renderPendingList(pending) {
  if (pending.length === 0) {
    return `<div class="friend-empty">
      <div class="friend-empty-icon">📭</div>
      <div>没有待处理的好友申请</div>
    </div>`;
  }
  
  let html = '<div class="friend-list">';
  for (const p of pending) {
    html += `<div class="friend-pending-card">
      <div class="friend-avatar">🧑</div>
      <div class="friend-pending-info">
        <div class="friend-name">${p.name}</div>
        <div class="friend-level">等级 ${p.level || 1}</div>
      </div>
      <div class="friend-pending-actions">
        <button class="friend-btn friend-btn-accept" onclick="acceptFriendUI('${p.name}')">接受</button>
        <button class="friend-btn friend-btn-reject" onclick="rejectFriendUI('${p.name}')">拒绝</button>
      </div>
    </div>`;
  }
  html += '</div>';
  return html;
}

function addFriendUI() {
  const input = document.getElementById('friendAddInput');
  const name = input.value.trim();
  if (!name) {
    addLog('请输入玩家名称', 'error');
    return;
  }
  const result = addFriend(name);
  addLog(result.message, result.success ? 'success' : 'error');
  if (result.success) {
    input.value = '';
    renderFriendUI();
  }
}

function acceptFriendUI(name) {
  const result = acceptFriend(name);
  addLog(result.message, result.success ? 'success' : 'error');
  if (result.success) renderFriendUI();
}

function rejectFriendUI(name) {
  const result = rejectFriend(name);
  if (result.success) renderFriendUI();
}

function removeFriendUI(name) {
  if (confirm(`确定要删除好友 ${name} 吗？`)) {
    const result = removeFriend(name);
    addLog(result.message, result.success ? 'success' : 'error');
    if (result.success) renderFriendUI();
  }
}

function showGiftPanel(friendName) {
  const container = document.getElementById('friendContent');
  let html = `<div class="friend-gift-panel">
    <div class="friend-gift-title">🎁 选择礼物送给 ${friendName}</div>
    <div class="friend-gift-list">
      <div class="friend-gift-item" onclick="sendGiftUI('${friendName}', 'stone_10')">
        <span class="friend-gift-icon">🪙</span>
        <span class="friend-gift-name">10灵石</span>
      </div>
      <div class="friend-gift-item" onclick="sendGiftUI('${friendName}', 'stone_100')">
        <span class="friend-gift-icon">💰</span>
        <span class="friend-gift-name">100灵石</span>
      </div>
      <div class="friend-gift-item" onclick="sendGiftUI('${friendName}', 'stone_1000')">
        <span class="friend-gift-icon">💎</span>
        <span class="friend-gift-name">1000灵石</span>
      </div>
      <div class="friend-gift-item" onclick="sendGiftUI('${friendName}', 'herb')">
        <span class="friend-gift-icon">🌿</span>
        <span class="friend-gift-name">灵草</span>
      </div>
      <div class="friend-gift-item" onclick="sendGiftUI('${friendName}', 'pill')">
        <span class="friend-gift-icon">💊</span>
        <span class="friend-gift-name">丹药</span>
      </div>
    </div>
  </div>`;
  
  container.innerHTML += html;
}

function sendGiftUI(friendName, giftId) {
  const result = sendGift(friendName, giftId);
  addLog(result.message, result.success ? 'success' : 'error');
  if (result.success) renderFriendUI();
}

// 显示排行榜面板
async function showRankingPanel() {
  const modal = document.getElementById('rankingModal');
  const content = document.getElementById('rankingContent');
  modal.classList.add('active');
  
  // 默认显示境界排行
  currentRankingType = 'realm';
  await loadRankingData('realm');
}

// 加载排行榜数据
async function loadRankingData(type) {
  const content = document.getElementById('rankingContent');
  const config = RANKING_TYPES[type];
  currentRankingType = type;
  
  // 显示加载状态
  content.innerHTML = '<div style="text-align:center;padding:30px;color:#888">加载排行榜数据中...</div>';
  
  try {
    // 调用 API 获取排行榜数据
    const response = await fetch(`${API_BASE}/api/ranking/${config.api}`);
    const result = await response.json();
    
    if (result.success) {
      renderRankingList(type, result.data);
    } else {
      // API 失败时使用模拟数据
      renderRankingList(type, generateMockRankingData(type));
    }
  } catch (error) {
    console.error('获取排行榜数据失败:', error);
    // 使用模拟数据
    renderRankingList(type, generateMockRankingData(type));
  }
}

// 生成模拟排行榜数据
function generateMockRankingData(type) {
  const mockNames = ['青云子', '紫霞仙子', '逍遥散人', '凌波仙子', '太乙真人', '九尾灵狐', '天璇星君', '玄冥上人', '东皇太一', '西王母'];
  const mockRealms = ['大乘期', '合体期', '炼虚期', '化神期', '元婴期', '金丹期', '筑基期'];
  
  let data = [];
  for (let i = 0; i < 10; i++) {
    if (type === 'realm') {
      data.push({
        rank: i + 1,
        playerId: `player_${i}`,
        name: mockNames[i],
        value: mockRealms[Math.min(i, mockRealms.length - 1)],
        realm: mockRealms[Math.min(i, mockRealms.length - 1)],
        level: 50 + Math.floor(Math.random() * 50)
      });
    } else if (type === 'spiritStones') {
      data.push({
        rank: i + 1,
        playerId: `player_${i}`,
        name: mockNames[i],
        value: Math.floor(10000000 * (10 - i) * (1 + Math.random() * 0.5)),
        realm: mockRealms[Math.min(i, mockRealms.length - 1)]
      });
    } else if (type === 'level') {
      data.push({
        rank: i + 1,
        playerId: `player_${i}`,
        name: mockNames[i],
        value: 100 - i * 5,
        realm: mockRealms[Math.min(i, mockRealms.length - 1)]
      });
    } else if (type === 'achievement') {
      data.push({
        rank: i + 1,
        playerId: `player_${i}`,
        name: mockNames[i],
        value: 50 - i * 3,
        realm: mockRealms[Math.min(i, mockRealms.length - 1)]
      });
    }
  }
  
  // 获取当前玩家数据
  const state = game ? game.getState() : gameState;
  const playerName = state.player?.name || '未知';
  let playerRank = -1;
  
  for (let i = 0; i < data.length; i++) {
    if (data[i].name === playerName) {
      playerRank = i + 1;
      break;
    }
  }
  
  // 如果当前玩家不在榜单中，添加玩家数据
  if (playerRank === -1) {
    let playerValue = 0;
    if (type === 'realm') {
      playerValue = state.player?.realm || '筑基期';
    } else if (type === 'spiritStones') {
      playerValue = state.player?.spiritStones || 0;
    } else if (type === 'level') {
      playerValue = state.player?.level || 1;
    } else if (type === 'achievement') {
      playerValue = state.player?.achievementPoints || 0;
    }
    
    // 估算玩家排名
    for (let i = 0; i < data.length; i++) {
      let playerHigher = false;
      if (type === 'spiritStones' && playerValue > data[i].value) playerHigher = true;
      else if (type === 'level' && playerValue > data[i].value) playerHigher = true;
      else if (type === 'achievement' && playerValue > data[i].value) playerHigher = true;
      else if (type === 'realm') playerHigher = true; // 简化处理
      
      if (playerHigher) {
        data.splice(i, 0, {
          rank: i + 1,
          playerId: 'player_self',
          name: playerName,
          value: playerValue,
          realm: state.player?.realm || '筑基期',
          isSelf: true
        });
        playerRank = i + 1;
        break;
      }
    }
    
    if (playerRank === -1) {
      playerRank = data.length + 1;
      data.push({
        rank: data.length + 1,
        playerId: 'player_self',
        name: playerName,
        value: playerValue,
        realm: state.player?.realm || '筑基期',
        isSelf: true
      });
    }
  }
  
  return { list: data, playerRank };
}

// 渲染排行榜列表
function renderRankingList(type, data) {
  const content = document.getElementById('rankingContent');
  const config = RANKING_TYPES[type];
  const list = data.list || [];
  const playerRank = data.playerRank || -1;
  
  // 排行榜类型切换按钮
  let typeButtons = '';
  for (const [key, conf] of Object.entries(RANKING_TYPES)) {
    const isActive = key === type ? 'active' : '';
    typeButtons += `<button class="tab-btn ${isActive}" onclick="loadRankingData('${key}')">${conf.icon} ${conf.name}</button>`;
  }
  
  // 榜单内容
  let listHtml = '';
  for (const item of list) {
    const isSelf = item.isSelf;
    const rank = item.rank;
    let rankDisplay = rank;
    let rankStyle = '';
    
    if (rank === 1) {
      rankDisplay = '🥇';
      rankStyle = 'color:#FFD700';
    } else if (rank === 2) {
      rankDisplay = '🥈';
      rankStyle = 'color:#C0C0C0';
    } else if (rank === 3) {
      rankDisplay = '🥉';
      rankStyle = 'color:#CD7F32';
    }
    
    let valueDisplay = item.value;
    if (type === 'spiritStones') {
      valueDisplay = fmt(item.value) + ' 💎';
    } else if (type === 'level') {
      valueDisplay = 'Lv.' + item.value;
    } else if (type === 'achievement') {
      valueDisplay = item.value + ' 成就点';
    }
    
    listHtml += `
      <div style="display:flex;align-items:center;padding:12px;margin:6px 0;background:${isSelf ? 'rgba(102,126,234,0.3)' : 'rgba(0,0,0,0.3)'};border-radius:8px;border:1px solid ${isSelf ? '#667eea' : 'transparent'};${isSelf ? 'box-shadow:0 0 10px rgba(102,126,234,0.3)' : ''}">
        <div style="width:40px;font-size:18px;text-align:center;${rankStyle}">${rankDisplay}</div>
        <div style="flex:1;margin-left:10px">
          <div style="font-weight:bold;color:${isSelf ? '#667eea' : '#fff'}">${item.name} ${isSelf ? '(你)' : ''}</div>
          <div style="font-size:12px;color:#888">${item.realm || '凡人'}</div>
        </div>
        <div style="color:${config.color};font-weight:bold">${valueDisplay}</div>
      </div>
    `;
  }
  
  // 玩家当前排名提示
  let playerRankHtml = '';
  if (playerRank > 0) {
    playerRankHtml = `
      <div style="margin-top:15px;padding:12px;background:rgba(102,126,234,0.2);border-radius:8px;text-align:center">
        <div style="color:#667eea;font-weight:bold">我的排名</div>
        <div style="font-size:24px;color:#FFD700;font-weight:bold;margin-top:5px">第 ${playerRank} 名</div>
      </div>
    `;
  }
  
  content.innerHTML = `
    <div style="margin-bottom:15px">
      <div class="partner-tabs" style="flex-wrap:wrap">${typeButtons}</div>
    </div>
    <div style="max-height:400px;overflow-y:auto">
      ${listHtml}
    </div>
    ${playerRankHtml}
  `;
}

// 显示每日奖励面板
async function showDailyBonusPanel() {
  const modal = document.getElementById('dailyBonusModal');
  const content = document.getElementById('dailyBonusContent');
  modal.classList.add('active');

  // 先尝试从API获取状态
  let apiData = null;
  try {
    const response = await fetch(`${API_BASE}/api/bonus/daily`);
    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        apiData = result.data;
      }
    }
  } catch (error) {
    console.log('使用本地数据');
  }

  // 渲染奖励面板
  renderDailyBonusPanel(content, apiData);
}

// 显示商城面板
async function showShopPanel(){
  if(!authToken){showAuthModal();return;}
  let html='<div class="modal active" style="display:flex;z-index:9999"><div style="background:#1a1a3a;padding:20px;border-radius:10px;max-width:400px"><h2>🛒 商城</h2><div id="shopList">加载中...</div><button onclick="this.closest(\'.modal\').remove()">关闭</button></div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
  try{
    let res=await fetch('/api/shop/list',{headers:{'Authorization':'Bearer '+authToken}});
    let data=await res.json();
    document.getElementById('shopList').innerHTML=data.map(i=>'<div>'+i.name+' - '+i.price+'灵石 <button>购买</button></div>').join('');
  }catch(e){}
}

  // 调用 API 获取商品列表
  try {
    const response = await fetch('/api/shop/list');
    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        renderShopPanel(content, result.data);
        return;
      }
    }
  } catch (error) {
    console.log('商城API不可用，使用模拟数据');
  }

  // 如果API不可用，使用模拟数据
  renderShopPanel(content, getMockShopItems());
}

// 渲染商城面板
function renderShopPanel(container, items) {
  const state = game ? game.getState() : gameState;
  const playerSpiritStones = state.player.spiritStones || 0;

  let html = `
    <div style="margin-bottom:15px;padding:10px;background:rgba(255,215,0,0.1);border-radius:8px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="color:#ffd700;font-weight:bold">💎 我的灵石</span>
        <span style="color:#fff;font-size:18px;font-weight:bold">${fmt(playerSpiritStones)}</span>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;max-height:400px;overflow-y:auto">
  `;

  for (const item of items) {
    const canBuy = playerSpiritStones >= item.price;
    const itemColor = getItemQualityColor(item.quality);

    html += `
      <div style="padding:12px;background:rgba(0,0,0,0.3);border-radius:8px;border:1px solid ${itemColor}">
        <div style="text-align:center;margin-bottom:8px">
          <span style="font-size:32px">${item.icon || '📦'}</span>
        </div>
        <div style="text-align:center;font-weight:bold;color:${itemColor};margin-bottom:4px">${item.name}</div>
        <div style="text-align:center;font-size:11px;color:#888;margin-bottom:8px">${item.description || ''}</div>
        <div style="text-align:center;margin-bottom:8px">
          <span style="color:#ffd700;font-weight:bold">${item.price}</span> <span style="color:#aaa">灵石</span>
        </div>
        <button class="btn btn-sm" style="width:100%;${canBuy ? '' : 'opacity:0.5'}" 
                onclick="buyShopItem('${item.id}')" ${canBuy ? '' : 'disabled'}>
          ${canBuy ? '购买' : '灵石不足'}
        </button>
      </div>
    `;
  }

  html += '</div>';
  container.innerHTML = html;
}

// 购买商城商品
async function buyShopItem(itemId) {
  const state = game ? game.getState() : gameState;

  // 先尝试从API购买
  try {
    const response = await fetch('/api/shop/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId })
    });
    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        addLog(result.message || '购买成功！', 'success');
        // 刷新商城面板
        showShopPanel();
        // 更新UI
        if (game) updateUI(game.getState());
        return;
      }
    }
  } catch (error) {
    console.log('商城API购买不可用，使用本地购买');
  }

  // 本地购买逻辑
  const items = getMockShopItems();
  const item = items.find(i => i.id === itemId);
  if (!item) {
    addLog('商品不存在', 'error');
    return;
  }

  if (state.player.spiritStones < item.price) {
    addLog('灵石不足', 'error');
    return;
  }

  // 扣除灵石
  state.player.spiritStones -= item.price;

  // 添加物品到背包
  const inventory = state.player.artifacts_inventory || {};
  inventory[item.name] = (inventory[item.name] || 0) + 1;
  state.player.artifacts_inventory = inventory;

  addLog(`购买成功！${item.name} x1`, 'success');

  // 刷新商城面板
  showShopPanel();

  // 更新UI
  if (game) {
    updateUI(game.getState());
  } else {
    updateUI(state);
  }

  // 保存数据
  if (typeof saveGameData === 'function') {
    saveGameData();
  }
}

// 获取模拟商城商品
function getMockShopItems() {
  return [
    { id: 'spirit_pill', name: '灵气丹', price: 100, icon: '💊', description: '增加1000灵气', quality: 'common' },
    { id: 'exp_pill', name: '经验丹', price: 200, icon: '📈', description: '增加500经验', quality: 'common' },
    { id: 'beast_food', name: '灵兽口粮', price: 50, icon: '🍖', description: '灵兽饱食度+50', quality: 'common' },
    { id: 'forging_ore', name: '锻造矿石', price: 80, icon: '🪨', description: '炼器材料', quality: 'common' },
    { id: 'realm_boost', name: '境界突破符', price: 500, icon: '⚡', description: '提升渡劫成功率5%', quality: 'rare' },
    { id: 'spirit_boost', name: '修炼加速', price: 300, icon: '🚀', description: '修炼速度+10%持续1小时', quality: 'rare' },
    { id: 'lucky_charm', name: '幸运符', price: 800, icon: '🍀', description: '战斗掉落+20%', quality: 'rare' },
    { id: 'treasure_box', name: '珍宝箱', price: 1000, icon: '🎁', description: '随机获得天材地宝', quality: 'epic' }
  ];
}

// 获取物品品质颜色
function getItemQualityColor(quality) {
  const colors = {
    'common': '#888',
    'uncommon': '#00FF7F',
    'rare': '#1E90FF',
    'epic': '#9B59B6',
    'legendary': '#FFD700'
  };
  return colors[quality] || '#888';
}

// 渲染每日奖励面板
function renderDailyBonusPanel(container, apiData) {
  const bonusData = apiData || getDailyBonusData();
  const canClaim = apiData?.canClaim ?? canClaimToday(bonusData);
  const todayClaimDay = apiData?.todayClaimDay ?? getTodayClaimDay(bonusData);
  const totalDays = apiData?.totalDays ?? bonusData.totalDays;
  const claimedDays = apiData?.claimedDays ?? bonusData.claimedDays;
  const currentCycle = apiData?.currentCycle ?? bonusData.currentCycle;

  let html = `
    <div class="daily-bonus-container">
      <div class="daily-bonus-header">
        <div class="cycle-info">第 ${currentCycle} 期</div>
        <div class="total-days">累计登录: <span class="highlight">${totalDays}</span> 天</div>
      </div>
  `;

  // 奖励列表
  html += `<div class="daily-bonus-list">`;
  for (let i = 0; i < dailyBonusConfig.days.length; i++) {
    const day = i + 1;
    const reward = dailyBonusConfig.days[i];
    const isClaimed = claimedDays.includes(day);
    const isToday = todayClaimDay === day;
    const canClaimThis = canClaim && isToday;

    let statusClass = '';
    let statusText = '';
    let buttonHtml = '';

    if (isClaimed) {
      statusClass = 'claimed';
      statusText = '<span class="claimed-badge">✓ 已领取</span>';
      buttonHtml = `<button class="btn btn-sm" disabled style="background:#333;color:#666">已领取</button>`;
    } else if (isToday && canClaim) {
      statusClass = 'claimable';
      statusText = '<span class="today-badge">今日可领</span>';
      buttonHtml = `<button class="btn btn-sm btn-success" onclick="claimDailyBonus(${day})">领取</button>`;
    } else if (totalDays >= day) {
      statusClass = 'available';
      statusText = '<span class="available-badge">可补领</span>';
      buttonHtml = `<button class="btn btn-sm btn-warning" onclick="claimDailyBonus(${day})">补领</button>`;
    } else {
      statusClass = 'locked';
      statusText = `第 ${day} 天`;
      buttonHtml = `<button class="btn btn-sm" disabled style="background:#333;color:#666">未解锁</button>`;
    }

    html += `
      <div class="daily-bonus-item ${statusClass}">
        <div class="day-badge">第${day}天</div>
        <div class="reward-details">
          <div class="reward-items">
            ${reward.spiritStones > 0 ? `<span class="reward-item"><span class="icon">💎</span> ${reward.spiritStones} 灵石</span>` : ''}
            ${reward.spirit > 0 ? `<span class="reward-item"><span class="icon">⚡</span> ${fmt(reward.spirit)} 灵气</span>` : ''}
            ${reward.items.map(item => `<span class="reward-item"><span class="icon">🎁</span> ${item.name}x${item.count}</span>`).join('')}
          </div>
          ${statusText}
        </div>
        <div class="claim-btn">${buttonHtml}</div>
      </div>
    `;
  }
  html += `</div>`;

  // 底部说明
  html += `
    <div class="daily-bonus-footer">
      <p>📅 每日凌晨0点刷新奖励</p>
      <p>🔄 7天为一个周期，周期结束后重置</p>
    </div>
  </div>
  `;

  container.innerHTML = html;
}

// 领取每日奖励
async function claimDailyBonus(day) {
  const reward = dailyBonusConfig.days[day - 1];
  if (!reward) return;

  let success = false;
  let message = '';

  // 尝试调用API
  try {
    const response = await fetch(`${API_BASE}/api/bonus/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ day: day })
    });
    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        success = true;
        message = result.message || '';
      }
    }
  } catch (error) {
    console.log('使用本地领取逻辑');
  }

  // 如果API调用失败，使用本地逻辑
  if (!success) {
    const bonusData = getDailyBonusData();

    // 检查是否已领取
    if (bonusData.claimedDays.includes(day)) {
      addLog('今日奖励已领取', 'warning');
      return;
    }

    // 标记为已领取
    bonusData.claimedDays.push(day);
    bonusData.totalDays = day;
    bonusData.lastClaimDate = new Date().toISOString();

    // 满7天重置周期
    if (bonusData.claimedDays.length >= 7) {
      bonusData.currentCycle = (bonusData.currentCycle || 1) + 1;
      bonusData.claimedDays = [];
      bonusData.totalDays = 0;
    }

    saveDailyBonusData(bonusData);
    success = true;
  }

  // 发放奖励
  const state = game.getState();
  state.player.spiritStones += reward.spiritStones;
  state.player.spirit += reward.spirit;

  // 添加物品
  if (reward.items && reward.items.length > 0) {
    const inventory = state.player.artifacts_inventory || {};
    for (const item of reward.items) {
      inventory[item.name] = (inventory[item.name] || 0) + item.count;
    }
    state.player.artifacts_inventory = inventory;
  }

  // 提示信息
  let rewardText = [];
  if (reward.spiritStones > 0) rewardText.push(`${reward.spiritStones}灵石`);
  if (reward.spirit > 0) rewardText.push(`${fmt(reward.spirit)}灵气`);
  for (const item of reward.items) {
    rewardText.push(`${item.name}x${item.count}`);
  }

  addLog(`🎁 领取第${day}天奖励成功！获得: ${rewardText.join(', ')}`, 'success');

  // 更新UI
  updateUI(state);
  saveGameData();

  // 刷新面板
  showDailyBonusPanel();
}

