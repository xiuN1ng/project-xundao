// ==================== BOSS血量共享系统 ====================

// 更新BOSS共享血量显示
async function updateSharedBossDisplay() {
  try {
    const result = await sharedBossAPI.getInfo();
    if (!result.success || !result.data) return;
    
    const boss = result.data;
    const bossHpBar = document.getElementById('bossHpBar');
    const bossInfo = document.getElementById('bossInfo');
    
    if (bossHpBar) {
      bossHpBar.style.width = boss.hpPercent + '%';
    }
    
    if (bossInfo) {
      bossInfo.innerHTML = `
        <div style="text-align:center">
          <div style="font-size:36px;margin-bottom:5px">${boss.icon}</div>
          <div style="font-size:18px;font-weight:bold;color:${boss.color}">${boss.name}</div>
          <div style="color:#aaa;font-size:12px">${boss.description}</div>
          <div style="margin-top:10px">
            <div style="background:rgba(255,0,0,0.3);height:20px;border-radius:10px;overflow:hidden">
              <div style="background:linear-gradient(90deg,red,${boss.color});height:100%;width:${boss.hpPercent}%"></div>
            </div>
            <div style="color:#fff;font-size:14px;margin-top:5px">
              ${formatNumber(boss.currentHp)} / ${formatNumber(boss.maxHp)} (${boss.hpPercent}%)
            </div>
            <div style="color:#aaa;font-size:12px;margin-top:5px">
              参与玩家: ${boss.participantCount}人
            </div>
          </div>
        </div>`;
    }
  } catch (e) {
    console.error('更新BOSS显示失败:', e);
  }
}

// 获取BOSS排名
async function updateBossRanking() {
  try {
    const result = await sharedBossAPI.getRanking(10);
    if (!result.success) return;
    
    const ranking = result.data;
    // 可以更新到对应的DOM元素
    console.log('BOSS排名:', ranking);
  } catch (e) {
    console.error('获取BOSS排名失败:', e);
  }
}

// 攻击BOSS
async function attackSharedBoss() {
  try {
    // 计算玩家伤害
    const stats = game ? game.calculatePlayerStats() : { atk: 10 };
    const damage = Math.floor(stats.atk * (1 + Math.random() * 0.5));
    
    const result = await sharedBossAPI.attack(damage);
    if (result.success) {
      // 显示伤害
      showDamageNumber(result.damage, false, 'bossInfo');
      // 更新BOSS血量
      updateSharedBossDisplay();
      
      if (result.message) {
        addLog(result.message, 'boss');
      }
      
      // 如果BOSS被击杀
      if (result.rewards) {
        showToast(`🎉 BOSS被击杀！`, 'success');
        setTimeout(() => updateSharedBossDisplay(), 1000);
      }
    } else {
      showToast(result.message, 'error');
    }
  } catch (e) {
    console.error('攻击BOSS失败:', e);
  }
}

// 格式化数字
function formatNumber(num) {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万';
  }
  return num.toString();
}

// 添加CSS动画样式
function addRealmEffectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes glow-cyan {
      0%, 100% { text-shadow: 0 0 10px #00FFFF, 0 0 20px #00FFFF; }
      50% { text-shadow: 0 0 20px #00FFFF, 0 0 40px #00FFFF, 0 0 60px #00FFFF; }
    }
    @keyframes glow-gold {
      0%, 100% { text-shadow: 0 0 10px #FFD700, 0 0 20px #FFD700; }
      50% { text-shadow: 0 0 20px #FFD700, 0 0 40px #FFD700, 0 0 60px #FFA500; }
    }
    @keyframes glow-rainbow {
      0% { text-shadow: 0 0 10px #FF1493, 0 0 20px #FF1493; }
      33% { text-shadow: 0 0 10px #00FFFF, 0 0 20px #00FFFF; }
      66% { text-shadow: 0 0 10px #FFD700, 0 0 20px #FFD700; }
      100% { text-shadow: 0 0 10px #FF1493, 0 0 20px #FF1493; }
    }
    @keyframes glow-red {
      0%, 100% { text-shadow: 0 0 10px #FF0000, 0 0 20px #FF0000; }
      50% { text-shadow: 0 0 20px #FF0000, 0 0 40px #FF0000, 0 0 60px #FF4500; }
    }
    @keyframes glow-white {
      0%, 100% { text-shadow: 0 0 10px #FFFFFF, 0 0 20px #FFFFFF; }
      50% { text-shadow: 0 0 20px #FFFFFF, 0 0 40px #FFFFFF, 0 0 60px #AAAAAA; }
    }
    .immortal-map {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      padding: 15px;
    }
    .map-realm {
      background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
      border: 2px solid rgba(255,255,255,0.2);
      border-radius: 15px;
      padding: 20px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s;
    }
    .map-realm:hover {
      transform: scale(1.05);
      border-color: rgba(255,255,255,0.5);
      box-shadow: 0 0 20px rgba(255,255,255,0.3);
    }
    .realm-display {
      padding: 15px;
    }
    .immortal-quest-list {
      max-height: 300px;
      overflow-y: auto;
    }
    .quest-item {
      transition: all 0.2s;
    }
    .quest-item:hover {
      background: rgba(255,255,255,0.1) !important;
    }
  `;
  document.head.appendChild(style);
}

// 初始化仙界展示系统
function initImmortalRealmDisplay() {
  addRealmEffectStyles();
  // 定期更新
  setInterval(() => {
    updateImmortalRealmDisplay();
    updateSharedBossDisplay();
  }, 5000);
}

// 成就解锁动画函数
function showAchievementUnlockAnimation(achievement) {
  const container = document.createElement('div');
  container.className = 'achievement-unlock-overlay';
  
  const rewards = [];
  if (achievement.reward) {
    if (achievement.reward.spiritStones) rewards.push({ icon: '💰', name: '灵石', value: achievement.reward.spiritStones });
    if (achievement.reward.exp) rewards.push({ icon: '✨', name: '经验', value: achievement.reward.exp });
    if (achievement.reward.items) achievement.reward.items.forEach(item => rewards.push({ icon: item.icon || '🎁', name: item.name, value: item.count }));
  }
  
  container.innerHTML = `
    <div class="achievement-unlock-modal">
      <div class="achievement-particles">
        ${Array(15).fill(0).map(() => `<div class="achievement-particle" style="left:${Math.random()*100}%;bottom:0;">${['🏅','✨','⭐','💫','🌟'][Math.floor(Math.random()*5)]}</div>`).join('')}
      </div>
      <div class="achievement-unlock-icon">${achievement.icon || '🏅'}</div>
      <div class="achievement-unlock-title">🎉 成就解锁！</div>
      <div class="achievement-unlock-name">${achievement.name}</div>
      <div class="achievement-unlock-desc">${achievement.desc || '恭喜完成成就'}</div>
      ${rewards.length > 0 ? `
        <div class="achievement-unlock-rewards">
          <div class="achievement-unlock-rewards-title">🎁 奖励</div>
          ${rewards.map(r => `<div class="achievement-unlock-reward-item"><span>${r.icon}</span><span>${r.name}</span><span>x${r.value}</span></div>`).join('')}
        </div>
      ` : ''}
      <button class="achievement-unlock-btn" onclick="this.parentElement.parentElement.remove()">太棒了！</button>
    </div>
  `;
  
  document.body.appendChild(container);
  
  // 5秒后自动关闭
  setTimeout(() => {
    if (container.parentElement) {
      container.style.transition = 'opacity 0.5s';
      container.style.opacity = '0';
      setTimeout(() => container.remove(), 500);
    }
  }, 5000);
}

// 剧情面板
async function showPlotPanel() {
  if (!authToken) {
    showAuthModal();
    return;
  }
  
  // 使用 Vue 组件方式打开面板
  if (window.VueComponentLoader) {
    await window.VueComponentLoader.load('./components/PlotPanel.vue');
  }
  
  if (window.UIComponents && window.UIComponents.showPanel) {
    window.UIComponents.showPanel('PlotPanel', {});
  }
}

// 成就面板
let achievementCurrentTab = 'achievements';

async function showAchievementPanel() {
  if(!authToken){showAuthModal();return;}
  document.getElementById('achievementModal').classList.add('active');
  achievementCurrentTab = 'achievements';
  renderAchievementUI();
}

function switchAchievementTab(tab) {
  achievementCurrentTab = tab;
  renderAchievementUI();
}

function renderAchievementUI() {
  const container = document.getElementById('achievementContent');
  
  // Tab 切换
  const tabs = [
    { id: 'achievements', name: '🏅 成就', icon: '🏅' },
    { id: 'milestones', name: '🎯 里程碑', icon: '🎯' }
  ];
  
  let tabHtml = '<div class="beast-tabs">';
  for (const t of tabs) {
    tabHtml += `<button class="beast-tab-btn ${achievementCurrentTab === t.id ? 'active' : ''}" onclick="switchAchievementTab('${t.id}')">${t.icon} ${t.name}</button>`;
  }
  tabHtml += '</div>';
  
  let contentHtml = '';
  switch (achievementCurrentTab) {
    case 'achievements':
      contentHtml = renderAchievementsList();
      break;
    case 'milestones':
      contentHtml = renderAchievementMilestones();
      break;
  }
  
  container.innerHTML = tabHtml + contentHtml;
}

// 成就列表
function renderAchievementsList() {
  let html = '<div style="max-height:400px;overflow-y:auto">';
  
  // 按类型分组显示成就
  const types = ACHIEVEMENT_TYPES || {};
  const achievements = achievementSystem?.achievements || {};
  
  for (const [typeId, typeData] of Object.entries(types)) {
    const typeAchievements = [];
    for (const [id, data] of Object.entries(achievements)) {
      const achData = ACHIEVEMENT_DATA[id];
      if (achData?.type === typeId) {
        typeAchievements.push({ id, ...achData, ...data });
      }
    }
    
    if (typeAchievements.length === 0) continue;
    
    html += `<div style="margin-bottom:16px">
      <div style="font-size:14px;font-weight:bold;color:${typeData?.color || '#fff'};margin-bottom:8px">${typeData?.icon || ''} ${typeData?.name || typeId}</div>`;
    
    for (const ach of typeAchievements) {
      const isUnlocked = ach.unlocked;
      const progress = ach.progress || 0;
      const target = ach.requirement?.value || 1;
      const percent = Math.min(100, (progress / target) * 100);
      
      html += `<div style="padding:10px;margin:6px 0;background:rgba(0,0,0,0.3);border-radius:8px;opacity:${isUnlocked ? 1 : 0.7}">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:13px;font-weight:bold;color:${isUnlocked ? '#ffd700' : '#fff'}">${ach.name}</div>
          <div style="font-size:11px;color:${isUnlocked ? '#10b981' : '#888'}">${isUnlocked ? '✅ 已完成' : '🔄 进行中'}</div>
        </div>
        <div style="font-size:11px;color:#888;margin:4px 0">${ach.desc}</div>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="flex:1;height:6px;background:rgba(0,0,0,0.3);border-radius:3px">
            <div style="height:100%;width:${percent}%;background:${isUnlocked ? '#10b981' : 'linear-gradient(90deg,#667eea,#764ba2)'};border-radius:3px"></div>
          </div>
          <div style="font-size:10px;color:#aaa;min-width:50px;text-align:right">${progress}/${target}</div>
        </div>
      </div>`;
    }
    
    html += '</div>';
  }
  
  html += '</div>';
  return html;
}

// 里程碑展示
function renderAchievementMilestones() {
  // 检查并更新进度
  if (typeof checkMilestoneProgress === 'function') {
    checkMilestoneProgress();
  }
  
  const milestones = getMilestoneData() || {};
  const achievementCount = getUnlockedAchievementCount();
  
  // 按类型分组
  const milestoneGroups = {
    'count': { name: '成就数量', icon: '🏅', milestones: [] },
    'collect': { name: '收集成就', icon: '📦', milestones: [] },
    'combat': { name: '战斗成就', icon: '⚔️', milestones: [] },
    'wealth': { name: '财富成就', icon: '💰', milestones: [] },
    'realm': { name: '境界成就', icon: '🧘', milestones: [] }
  };
  
  for (const [id, milestone] of Object.entries(ACHIEVEMENT_MILESTONES || {})) {
    if (milestoneGroups[milestone.type]) {
      milestoneGroups[milestone.type].milestones.push({
        id,
        ...milestone,
        progress: milestones[id]?.progress || 0,
        claimed: milestones[id]?.claimed || false
      });
    }
  }
  
  let html = '<div style="max-height:400px;overflow-y:auto">';
  
  // 总成就统计
  html += `<div style="background:linear-gradient(135deg,rgba(102,126,234,0.2),rgba(118,75,162,0.2));padding:12px;border-radius:10px;margin-bottom:16px;text-align:center">
    <div style="font-size:12px;color:#aaa">已完成成就</div>
    <div style="font-size:28px;font-weight:bold;color:#ffd700">${achievementCount}</div>
  </div>`;
  
  for (const [groupId, group] of Object.entries(milestoneGroups)) {
    if (group.milestones.length === 0) continue;
    
    html += `<div style="margin-bottom:16px">
      <div style="font-size:14px;font-weight:bold;color:#fff;margin-bottom:8px">${group.icon} ${group.name}</div>`;
    
    for (const m of group.milestones) {
      const percent = Math.min(100, (m.progress / m.target) * 100);
      const isCompleted = m.progress >= m.target;
      const isClaimed = m.claimed;
      
      // 奖励描述
      const rewardTexts = [];
      if (m.rewards?.spiritStones) rewardTexts.push(`💰${m.rewards.spiritStones}`);
      if (m.rewards?.atkBonus) rewardTexts.push(`⚔️+${Math.round(m.rewards.atkBonus*100)}%`);
      if (m.rewards?.defBonus) rewardTexts.push(`🛡️+${Math.round(m.rewards.defBonus*100)}%`);
      if (m.rewards?.spiritRateBonus) rewardTexts.push(`✨+${Math.round(m.rewards.spiritRateBonus*100)}%`);
      if (m.rewards?.dropBonus) rewardTexts.push(`📦+${Math.round(m.rewards.dropBonus*100)}%`);
      if (m.rewards?.stoneBonus) rewardTexts.push(`💎+${Math.round(m.rewards.stoneBonus*100)}%`);
      if (m.rewards?.realmExpBonus) rewardTexts.push(`🧘+${Math.round(m.rewards.realmExpBonus*100)}%`);
      if (m.rewards?.title) rewardTexts.push(`👑 ${m.rewards.title}`);
      
      html += `<div class="achievement-milestone">
        <div class="milestone-header">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="font-size:24px">${m.icon}</div>
            <div>
              <div class="milestone-title">${m.name}</div>
              <div style="font-size:11px;color:#888">${m.desc}</div>
            </div>
          </div>
          <div class="milestone-level" style="background:${isClaimed ? '#10b981' : isCompleted ? '#ffd700' : '#666'}">
            ${isClaimed ? '已领取' : isCompleted ? '可领取' : `${Math.round(percent)}%`}
          </div>
        </div>
        
        <div class="milestone-progress">
          <div class="milestone-progress-bar">
            <div class="milestone-progress-fill" style="width:${percent}%"></div>
          </div>
          <div class="milestone-markers">
            <div class="milestone-marker ${percent >= 25 ? 'active' : 'locked'}">
              <div class="milestone-marker-icon">${percent >= 25 ? '🌟' : '⭐'}</div>
              <div>25%</div>
            </div>
            <div class="milestone-marker ${percent >= 50 ? 'active' : 'locked'}">
              <div class="milestone-marker-icon">${percent >= 50 ? '🌟' : '⭐'}</div>
              <div>50%</div>
            </div>
            <div class="milestone-marker ${percent >= 75 ? 'active' : 'locked'}">
              <div class="milestone-marker-icon">${percent >= 75 ? '🌟' : '⭐'}</div>
              <div>75%</div>
            </div>
            <div class="milestone-marker ${percent >= 100 ? 'active' : 'locked'}">
              <div class="milestone-marker-icon">${percent >= 100 ? '🌟' : '⭐'}</div>
              <div>100%</div>
            </div>
          </div>
        </div>
        
        <div class="milestone-rewards">
          <span style="font-size:11px;color:#aaa;margin-right:8px">奖励:</span>
          ${rewardTexts.map(r => `<div class="milestone-reward-item ${isClaimed ? 'milestone-claimed' : ''}">${r}</div>`).join('')}
        </div>
        
        <div style="font-size:11px;color:#666;margin-top:8px">
          进度: ${m.progress} / ${m.target}
        </div>
        
        ${isCompleted && !isClaimed 
          ? `<button class="milestone-claim-btn" onclick="claimMilestoneRewardUI('${m.id}')">🎁 领取奖励</button>`
          : isClaimed
            ? `<button class="milestone-claim-btn" disabled style="background:#333;color:#666">已领取</button>`
            : `<button class="milestone-claim-btn" disabled>未达成</button>`
        }
      </div>`;
    }
    
    html += '</div>';
  }
  
  html += '</div>';
  return html;
}

function claimMilestoneRewardUI(milestoneId) {
  const result = claimMilestoneReward(milestoneId);
  addLog(result.message, result.success ? 'success' : 'error');
  if (result.success) renderAchievementUI();
}

