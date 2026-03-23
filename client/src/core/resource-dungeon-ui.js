// ==================== 资源副本系统 ====================
async function showResourceDungeonPanel() {
  if (!authToken) { showAuthModal(); return; }
  let html = `<div class="modal active" style="display:flex;align-items:center;justify-content:center;z-index:9999;">
    <div style="background:linear-gradient(135deg,#1a1a3a,#2d2d5a);padding:30px;border-radius:15px;max-width:500px;width:90%;">
      <h2 style="color:#8b5cf6;margin-bottom:20px;">📦 资源副本</h2>
      <div id="dungeonList">加载中...</div>
      <button onclick="this.closest('.modal').remove()" style="margin-top:20px;padding:10px 20px;background:#666;border:none;border-radius:5px;color:#fff;">关闭</button>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  
  // 调用 API 获取数据
  try {
    const res = await fetch('/api/dungeon/resource', { headers: { 'Authorization': 'Bearer ' + authToken } });
    const data = await res.json();
    // 显示副本列表
  } catch(e) { console.error(e); }
}

function renderRealmDungeonUI() {
  const container = document.getElementById('realmDungeonInfo');
  const status = getRealmDungeonStatus();
  
  // 如果正在进行副本战斗，显示战斗界面
  if (status.inDungeon || status.status === 'victory' || status.status === 'defeated') {
    renderRealmDungeonBattleUI(container, status);
    return;
  }
  
  // 显示副本列表
  const dungeons = getAvailableRealmDungeons();
  const progress = status.progress;
  
  let html = `<div style="margin-bottom:15px;color:#888;font-size:14px">选择要挑战的境界副本</div>`;
  html += `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">`;
  
  for (const dungeon of dungeons) {
    const p = progress[dungeon.id] || { highestFloor: 0, cleared: false };
    const isUnlocked = true; // 在getAvailableRealmDungeons中已经检查过
    
    html += `<div style="padding:15px;background:${p.cleared ? 'rgba(0,255,0,0.15)' : 'rgba(50,50,80,0.5)'};border:1px solid ${p.cleared ? '#00ff00' : '#444'};border-radius:8px;cursor:pointer" onclick="enterRealmDungeonUI('${dungeon.id}')">
      <div style="font-size:16px;font-weight:bold;color:${getRealmColor(dungeon.id)}">${dungeon.name}</div>
      <div style="font-size:12px;color:#888;margin:5px 0">${dungeon.desc}</div>
      <div style="font-size:12px">
        ${p.cleared ? '<span style="color:#00ff00">✅ 已通关</span>' : `<span style="color:#ffa500">进度: ${p.highestFloor}/${dungeon.floors.length + 1}</span>`}
      </div>
    </div>`;
  }
  
  html += `</div>`;
  container.innerHTML = html;
}

function getRealmColor(realm) {
  const colors = {
    '练气期': '#4CAF50',
    '筑基期': '#2196F3',
    '金丹期': '#9C27B0',
    '元婴期': '#FF9800',
    '化神期': '#E91E63',
    '炼虚期': '#00BCD4',
    '合体期': '#FF5722',
    '大乘期': '#FFD700',
    '渡劫期': '#FFFFFF'
  };
  return colors[realm] || '#fff';
}

function enterRealmDungeonUI(realmId) {
  const result = enterRealmDungeon(realmId);
  if (!result.success) {
    addLog(result.message, 'error');
    return;
  }
  addLog(result.message, 'success');
  renderRealmDungeonUI();
}

function renderRealmDungeonBattleUI(container, status) {
  const dungeonData = REALM_DUNGEON_DATA[status.currentRealm];
  if (!dungeonData) {
    container.innerHTML = `<div style="text-align:center;padding:30px">副本数据错误</div>`;
    return;
  }
  
  let html = `<div style="padding:15px;background:rgba(80,30,30,0.5);border-radius:8px;margin-bottom:15px">
    <div style="font-size:18px;font-weight:bold;color:${getRealmColor(status.currentRealm)}">${dungeonData.name}</div>
    <div style="color:#888;margin-top:5px">当前关卡: ${status.currentFloor} / ${dungeonData.floors.length + 1}</div>
  </div>`;
  
  // 战斗状态
  if (status.status === 'fighting' && status.enemy) {
    const enemy = status.enemy;
    const hpPercent = (status.enemyHp / status.enemyMaxHp) * 100;
    
    html += `<div style="text-align:center;padding:20px;background:rgba(60,30,30,0.5);border-radius:8px;margin-bottom:15px">
      <div style="font-size:20px;margin-bottom:10px">⚔️ ${enemy.name}</div>
      <div style="background:#333;height:20px;border-radius:10px;overflow:hidden;margin-bottom:10px">
        <div style="background:linear-gradient(90deg,#ff4444,#ff0000);height:100%;width:${hpPercent}%"></div>
      </div>
      <div style="color:#ff6666">HP: ${formatNumber(status.enemyHp)} / ${formatNumber(status.enemyMaxHp)}</div>
      <div style="color:#888;margin-top:5px">攻击力: ${formatNumber(enemy.atk)} | 防御力: ${formatNumber(enemy.def)}</div>
    </div>`;
    
    // 攻击按钮
    html += `<div style="text-align:center">
      <button class="btn btn-danger" style="font-size:18px;padding:15px 40px" onclick="attackRealmDungeonUI()">⚔️ 攻击</button>
    </div>`;
  } else if (status.status === 'victory') {
    html += `<div style="text-align:center;padding:30px;background:rgba(0,100,0,0.3);border-radius:8px">
      <div style="font-size:24px;color:#00ff00;margin-bottom:15px">🎉 副本通关！</div>
      <div style="color:#aaa">恭喜你击败了${dungeonData.boss.name}！</div>
      <div style="color:#888;margin-top:10px">获得通关奖励</div>
      <button class="btn" style="margin-top:20px" onclick="exitRealmDungeonUI()">返回副本列表</button>
    </div>`;
  } else if (status.status === 'defeated') {
    html += `<div style="text-align:center;padding:30px;background:rgba(100,0,0,0.3);border-radius:8px">
      <div style="font-size:24px;color:#ff4444;margin-bottom:15px">💀 挑战失败</div>
      <div style="color:#aaa">你被击败了，请提升实力后再来</div>
      <button class="btn" style="margin-top:20px" onclick="exitRealmDungeonUI()">返回副本列表</button>
    </div>`;
  } else if (status.status === 'ready') {
    // 准备下一关
    const nextFloor = status.currentFloor + 1;
    const isBoss = nextFloor > dungeonData.floors.length;
    
    html += `<div style="text-align:center;padding:30px;background:rgba(50,50,80,0.5);border-radius:8px">
      <div style="font-size:18px;margin-bottom:10px">${isBoss ? '👹 BOSS关卡' : '第 ' + nextFloor + ' 关'}</div>
      <div style="color:#888">准备挑战</div>
      <button class="btn btn-primary" style="margin-top:20px" onclick="startBattleRealmDungeonUI()">开始战斗</button>
    </div>`;
  }
  
  // 退出按钮
  if (status.status !== 'fighting') {
    // 已经处理了
  } else {
    html += `<div style="text-align:center;margin-top:15px">
      <button class="btn" style="background:#666" onclick="exitRealmDungeonUI()">退出副本</button>
    </div>`;
  }
  
  container.innerHTML = html;
}

function startBattleRealmDungeonUI() {
  const result = startRealmDungeonBattle();
  if (!result.success) {
    addLog(result.message, 'error');
  }
  renderRealmDungeonUI();
}

function attackRealmDungeonUI() {
  const result = attackRealmDungeonEnemy();
  
  if (result.success) {
    if (result.defeated) {
      addLog(result.message, result.cleared ? 'success' : 'warning');
    } else {
      // 战斗继续
    }
  } else {
    addLog(result.message, 'error');
  }
  
  renderRealmDungeonUI();
}

function exitRealmDungeonUI() {
  exitRealmDungeon();
  renderRealmDungeonUI();
}

function formatNumber(num) {
  if (num >= 100000000) return (num / 100000000).toFixed(1) + '亿';
  if (num >= 10000) return (num / 10000).toFixed(1) + '万';
  return num.toString();
}

