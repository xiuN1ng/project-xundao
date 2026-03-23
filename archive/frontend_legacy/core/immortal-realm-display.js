// ==================== 仙界展示系统 ====================

// 仙界境界特效
const REALM_EFFECTS = {
  '真仙': { aura: '✨', color: '#00FFFF', animation: 'glow-cyan' },
  '金仙': { aura: '🌟', color: '#FFD700', animation: 'glow-gold' },
  '大罗金仙': { aura: '👑', color: '#FF1493', animation: 'glow-rainbow' },
  '准圣': { aura: '⚡', color: '#FF0000', animation: 'glow-red' },
  '圣人': { aura: '🏛️', color: '#FFFFFF', animation: 'glow-white' }
};

// 更新仙界境界显示
async function updateImmortalRealmDisplay() {
  try {
    const result = await immortalRealmAPI.getInfo();
    if (!result.success) return;
    
    const data = result.data;
    const display = document.getElementById('immortalRealmDisplay');
    if (!display) return;
    
    const effect = REALM_EFFECTS[data.realm] || { aura: '🧑', color: '#888888', animation: '' };
    
    let html = `
      <div class="realm-info" style="text-align:center;padding:15px">
        <div class="realm-icon" style="font-size:48px;margin-bottom:10px;${effect.animation ? `animation:${effect.animation} 2s infinite` : ''}">
          ${effect.aura}
        </div>
        <div class="realm-name" style="font-size:24px;font-weight:bold;color:${effect.color};margin-bottom:5px">
          ${data.realm}
        </div>
        <div class="realm-level" style="color:#aaa;font-size:14px">
          境界等级: ${data.realmLevel} | 境界经验: ${data.realmExp}/${data.expToNextLevel}
        </div>
        <div class="realm-progress" style="background:rgba(255,255,255,0.1);height:10px;border-radius:5px;margin-top:10px;overflow:hidden">
          <div style="background:linear-gradient(90deg,${effect.color},#fff);height:100%;width:${(data.realmExp / data.expToNextLevel * 100).toFixed(1)}%"></div>
        </div>
    </div>`;
    
    // 显示仙界技能
    if (data.abilities && data.abilities.length > 0) {
      html += `<div class="realm-abilities" style="margin-top:15px"><div style="color:#aaa;font-size:12px;margin-bottom:8px">仙界神通：</div>`;
      for (const ability of data.abilities) {
        html += `<div class="ability-tag" style="display:inline-block;background:rgba(255,255,255,0.1);padding:5px 10px;border-radius:15px;margin:3px;font-size:12px;color:${effect.color}">${ability.name}</div>`;
      }
      html += '</div>';
    }
    
    // 显示是否可以突破
    if (data.canAdvance && data.nextRealmData) {
      html += `
        <div class="realm-advance" style="margin-top:15px">
          <button class="btn btn-primary" style="width:100%;background:linear-gradient(135deg,${effect.color},#667eea)" onclick="advanceRealm()">
            🚀 突破到 ${data.nextRealmData.name}
          </button>
        </div>`;
    }
    
    display.innerHTML = html;
  } catch (e) {
    console.error('更新仙界境界显示失败:', e);
  }
}

// 突破境界
async function advanceRealm() {
  const result = await immortalRealmAPI.advance();
  if (result.success) {
    showToast(`🎉 ${result.message}`, 'success');
    updateImmortalRealmDisplay();
    // 刷新主界面
    if (typeof loadGame === 'function') loadGame();
  } else {
    showToast(result.message, 'error');
  }
}

// 选择仙界地图区域
function selectImmortalRealm(realm) {
  const realms = {
    'xian': { name: '真仙域', realm: '真仙', color: '#00FFFF' },
    'jin': { name: '金仙阁', realm: '金仙', color: '#FFD700' },
    'daluo': { name: '大罗天', realm: '大罗金仙', color: '#FF1493' }
  };
  
  const selected = realms[realm];
  if (!selected) return;
  
  // 显示区域信息
  showToast(`进入${selected.name}，当前需要${selected.realm}境界`, 'info');
}

// 更新仙界任务显示
async function updateImmortalQuestDisplay() {
  try {
    const result = await immortalQuestAPI.getMy();
    if (!result.success) return;
    
    const container = document.getElementById('immortalQuests');
    if (!container) return;
    
    const { in_progress, completed, available } = result.data;
    
    let html = '';
    
    // 进行中的任务
    if (in_progress && in_progress.length > 0) {
      html += '<div class="quest-section"><div style="color:#FFD700;margin-bottom:10px">进行中：</div>';
      for (const quest of in_progress.slice(0, 3)) {
        const progress = quest.objectives.map(o => `${o.target}: ${o.progress}/${o.count}`).join(', ');
        html += `
          <div class="quest-item" style="background:rgba(255,255,255,0.05);padding:10px;border-radius:8px;margin-bottom:8px">
            <div style="font-weight:bold">${quest.icon} ${quest.name}</div>
            <div style="color:#aaa;font-size:12px">${progress}</div>
          </div>`;
      }
      html += '</div>';
    }
    
    // 可接任务
    if (available && available.length > 0) {
      html += '<div class="quest-section"><div style="color:#00FFFF;margin-bottom:10px;margin-top:15px">可接任务：</div>';
      for (const quest of available.slice(0, 3)) {
        html += `
          <div class="quest-item" style="background:rgba(255,255,255,0.05);padding:10px;border-radius:8px;margin-bottom:8px;cursor:pointer" onclick="acceptImmortalQuest('${quest.id}')">
            <div style="font-weight:bold">${quest.icon} ${quest.name}</div>
            <div style="color:#aaa;font-size:12px">${quest.description}</div>
          </div>`;
      }
      html += '</div>';
    }
    
    if (!html) {
      html = '<div style="color:#aaa;text-align:center;padding:20px">暂无任务</div>';
    }
    
    container.innerHTML = html;
  } catch (e) {
    console.error('更新仙界任务显示失败:', e);
  }
}

// 接受仙界任务
async function acceptImmortalQuest(questId) {
  const result = await immortalQuestAPI.accept(questId);
  if (result.success) {
    showToast(`接受任务: ${result.quest.name}`, 'success');
    updateImmortalQuestDisplay();
  } else {
    showToast(result.message, 'error');
  }
}

