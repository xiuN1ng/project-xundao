let newbieTipIndex = 0;
const newbieTips = [
  { icon: '💡', text: '点击「修炼」按钮开始挂机获得灵气' },
  { icon: '⚔️', text: '灵气足够后可以挑战怪物获得经验' },
  { icon: '💰', text: '击败怪物会掉落灵石和装备' },
  { icon: '🧘', text: '境界突破需要足够的灵气和灵气上限' },
  { icon: '🏠', text: '建设洞府可以提升修炼效率' },
  { icon: '📦', text: '背包里有可以获得的东西哦' }
];

function showNewbieTip(forceIndex = -1) {
  // 检查是否需要显示提示
  const state = game.getState();
  if (!state || !state.player) return;
  
  // 移除现有提示
  const existingTip = document.querySelector('.newbie-tip');
  if (existingTip) existingTip.remove();
  
  // 根据玩家进度决定显示哪个提示
  let tipIndex = forceIndex;
  if (tipIndex < 0) {
    // 根据玩家状态自动选择提示
    if (state.player.spiritStones < 100) {
      tipIndex = 0; // 提示修炼
    } else if (state.stats.monstersKilled < 3) {
      tipIndex = 1; // 提示战斗
    } else if (!state.player.equipment.weapon && state.player.spiritStones > 500) {
      tipIndex = 3; // 提示境界
    } else {
      return; // 不再显示提示
    }
  }
  
  if (tipIndex >= newbieTips.length) return;
  
  const tip = newbieTips[tipIndex];
  const el = document.createElement('div');
  el.className = 'newbie-tip';
  el.innerHTML = `
    <span class="tip-icon">${tip.icon}</span>
    <span class="tip-text">${tip.text}</span>
    <span class="tip-close" onclick="this.parentElement.remove()">×</span>
  `;
  
  document.body.appendChild(el);
  
  // 10秒后自动隐藏
  setTimeout(() => {
    if (el.parentElement) el.remove();
  }, 10000);
}

// 定期显示新手提示
let newbieTipInterval = null;
function startNewbieTips() {
  if (newbieTipInterval) clearInterval(newbieTipInterval);
  
  // 首次提示延迟5秒
  setTimeout(() => showNewbieTip(0), 5000);
  
  // 之后每30秒检查一次
  newbieTipInterval = setInterval(() => {
    showNewbieTip(-1);
  }, 30000);
}

// 停止新手提示
function stopNewbieTips() {
  if (newbieTipInterval) {
    clearInterval(newbieTipInterval);
    newbieTipInterval = null;
  }
  const existingTip = document.querySelector('.newbie-tip');
  if (existingTip) existingTip.remove();
}

