// ==================== 轮回转生系统 UI ====================

let reincarnationState = {
  info: null,
  talents: null,
  shop: null,
  loading: false,
};

const TALENT_ICONS = {
  eye_of_heaven: '👁️',
  pure_land: '🏔️',
  soul_feedback: '🔮',
  body_refined: '🛡️',
  spirit_root_plus: '🌿',
  life_extend: '⏳',
  fighting_soul: '⚔️',
  rebirth_blessing: '✨',
  heaven_step: '🪜',
  destiny_overload: '⭐',
};

const REALM_NAMES = {
  1: '练气期', 2: '筑基期', 3: '金丹期', 4: '元婴期',
  5: '化神期', 6: '炼虚期', 7: '大乘期', 8: '渡劫期', 9: '飞升期'
};

function showReincarnationPanel() {
  document.getElementById('reincarnationModal').classList.add('active');
  loadReincarnationData();
}

async function loadReincarnationData() {
  if (reincarnationState.loading) return;
  reincarnationState.loading = true;
  try {
    const [infoRes, talentsRes, shopRes] = await Promise.all([
      reincarnationAPI.getInfo(),
      reincarnationAPI.getTalents(),
      reincarnationAPI.getShop(),
    ]);

    if (infoRes.code === 0) reincarnationState.info = infoRes.data;
    if (talentsRes.code === 0) reincarnationState.talents = talentsRes.data;
    if (shopRes.code === 0) reincarnationState.shop = shopRes.data;

    renderReincarnationPanel();
  } catch (e) {
    console.error('加载轮回数据失败:', e);
    renderReincarnationPanelError(e.message);
  } finally {
    reincarnationState.loading = false;
  }
}

function renderReincarnationPanel() {
  const info = reincarnationState.info || {};
  const talents = reincarnationState.talents?.talents || [];
  const shop = reincarnationState.shop?.items || [];
  const bonus = info.permanent_bonus || {};

  const container = document.getElementById('reincarnationContent');
  if (!container) return;

  const rebirthUnlocked = info.rebirth_unlocked;
  const cyclePoints = (info.cycles || 0) * 100 + (info.insight_points || 0);

  container.innerHTML = `
    <div class="reincarnation-panel">
      <!-- 轮回概览 -->
      <div class="card" style="margin-bottom:15px;background:linear-gradient(135deg,rgba(138,43,226,0.3),rgba(75,0,130,0.3))">
        <div class="card-title">🔮 轮回印记</div>
        <div class="reinc-overview">
          <div class="reinc-cycle-badge">
            <span class="cycle-num">${info.cycles || 0}</span>
            <span class="cycle-label">轮回层数</span>
          </div>
          <div class="reinc-stats">
            <div class="reinc-stat">
              <span class="stat-label">天道感悟</span>
              <span class="stat-value">${info.insight_points || 0}</span>
              ${info.insight_to_next > 0 ? `<div class="insight-bar-wrap"><div class="insight-bar" style="width:${Math.min(100, ((info.insight_points||0) % 1000) / 10)}%"></div></div><small>距下一层: ${info.insight_to_next}</small>` : '<small>已达下一层！</small>'}
            </div>
            <div class="reinc-stat">
              <span class="stat-label">累计轮回</span>
              <span class="stat-value">${info.rebirth_count || 0} 次</span>
            </div>
            <div class="reinc-stat">
              <span class="stat-label">历史最高</span>
              <span class="stat-value">${REALM_NAMES[info.highest_realm] || '练气期'} Lv.${info.highest_layer || 0}</span>
            </div>
          </div>
        </div>

        <!-- 永久加成 -->
        <div class="reinc-bonus-section">
          <div class="bonus-title">⚡ 轮回永久加成</div>
          <div class="reinc-bonus-grid">
            <div class="reinc-bonus-item">
              <span>攻击</span>
              <span class="bonus-val">+${bonus.atk_pct || 0}%</span>
            </div>
            <div class="reinc-bonus-item">
              <span>防御</span>
              <span class="bonus-val">+${bonus.def_pct || 0}%</span>
            </div>
            <div class="reinc-bonus-item">
              <span>生命</span>
              <span class="bonus-val">+${bonus.hp_pct || 0}%</span>
            </div>
            <div class="reinc-bonus-item">
              <span>修炼</span>
              <span class="bonus-val">+${bonus.cult_speed_pct || 0}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 当前境界 -->
      <div class="card" style="margin-bottom:15px;background:rgba(255,215,0,0.1)">
        <div class="card-title">🧘 当前境界</div>
        <div class="current-realm-info">
          <span class="realm-name-tag">${info.current_realm_name || '凡人'}</span>
          <span style="color:#aaa">第${info.current_layer || 0}层</span>
          ${rebirthUnlocked
            ? '<span class="rebirth-ready-badge">可轮回！</span>'
            : `<span style="color:#888;font-size:11px">需达飞升期解锁轮回 (${REALM_NAMES[info.current_realm] || ''})</span>`
          }
        </div>
      </div>

      <!-- 轮回天赋 -->
      <div class="card" style="margin-bottom:15px;background:rgba(0,255,255,0.05)">
        <div class="card-title">🌟 轮回天赋 (${talents.filter(t=>t.unlocked).length}/${talents.length})</div>
        <div class="talent-tree">
          ${talents.map(t => `
            <div class="talent-item ${t.unlocked ? 'talent-unlocked' : t.can_unlock ? 'talent-can-unlock' : 'talent-locked'}"
                 title="${t.desc}\n解锁条件: 第${t.layer}层轮回">
              <div class="talent-icon">${TALENT_ICONS[t.id] || '✨'}</div>
              <div class="talent-name">${t.name}</div>
              <div class="talent-layer">第${t.layer}层</div>
              ${t.unlocked ? '<div class="talent-unlock-mark">✓</div>' : ''}
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 轮回商店 -->
      <div class="card" style="margin-bottom:15px;background:rgba(255,165,0,0.05)">
        <div class="card-title">🏪 轮回商店 <span style="color:#ffd700;font-size:12px">🔮 积分: ${cyclePoints}</span></div>
        <div class="reinc-shop-grid">
          ${shop.map(item => `
            <div class="shop-item ${item.usable ? 'shop-item-usable' : 'shop-item-locked'}"
                 onclick="${item.usable ? `buyReincItem('${item.id}')` : ''}">
              <div class="shop-item-icon">${item.icon}</div>
              <div class="shop-item-name">${item.name}</div>
              <div class="shop-item-desc">${item.desc}</div>
              <div class="shop-item-cost">🔮 ${item.cost}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 轮回操作 -->
      <div class="reinc-action-section">
        ${rebirthUnlocked
          ? `<button class="btn btn-rebirth" onclick="confirmRebirth()">☸️ 选择轮回</button>
             <p style="color:#888;font-size:11px;text-align:center;margin-top:8px">轮回后境界重置为练气期，保留部分天道感悟</p>`
          : `<button class="btn" disabled style="opacity:0.5;width:100%">☸️ 需达飞升期</button>`
        }
      </div>
    </div>

    <style>
      .reinc-overview { display: flex; gap: 15px; align-items: center; margin-bottom: 10px; }
      .reinc-cycle-badge { display: flex; flex-direction: column; align-items: center; background: rgba(138,43,226,0.3); border-radius: 12px; padding: 10px 15px; min-width: 70px; }
      .cycle-num { font-size: 28px; font-weight: bold; color: #da70d6; line-height: 1; }
      .cycle-label { font-size: 10px; color: #bbb; }
      .reinc-stats { flex: 1; }
      .reinc-stat { margin-bottom: 6px; }
      .stat-label { color: #888; font-size: 12px; margin-right: 6px; }
      .stat-value { color: #ffd700; font-weight: bold; font-size: 14px; }
      .insight-bar-wrap { height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; margin-top: 3px; }
      .insight-bar { height: 100%; background: linear-gradient(90deg, #8a2be2, #da70d6); border-radius: 2px; transition: width 0.3s; }
      .reinc-bonus-section { margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); }
      .bonus-title { color: #da70d6; font-size: 12px; margin-bottom: 6px; }
      .reinc-bonus-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; }
      .reinc-bonus-item { background: rgba(0,0,0,0.2); border-radius: 6px; padding: 6px 4px; text-align: center; }
      .reinc-bonus-item span:first-child { display: block; font-size: 10px; color: #888; }
      .bonus-val { color: #7cfc00 !important; font-size: 13px !important; font-weight: bold; }
      .current-realm-info { display: flex; align-items: center; gap: 10px; }
      .realm-name-tag { background: linear-gradient(135deg, #8a2be2, #da70d6); padding: 4px 12px; border-radius: 20px; font-weight: bold; }
      .rebirth-ready-badge { background: linear-gradient(135deg, #ffd700, #ff8c00); padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; color: #000; animation: pulse 2s infinite; }
      @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.7; } }
      .talent-tree { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 8px; }
      .talent-item { background: rgba(0,0,0,0.3); border-radius: 8px; padding: 8px 4px; text-align: center; cursor: default; position: relative; transition: all 0.3s; }
      .talent-unlocked { background: rgba(138,43,226,0.4); border: 1px solid #da70d6; box-shadow: 0 0 10px rgba(218,112,214,0.3); }
      .talent-can-unlock { background: rgba(0,255,0,0.1); border: 1px dashed #7cfc00; }
      .talent-locked { opacity: 0.4; }
      .talent-icon { font-size: 22px; }
      .talent-name { font-size: 11px; color: #fff; margin-top: 2px; }
      .talent-layer { font-size: 10px; color: #888; }
      .talent-unlock-mark { position: absolute; top: 2px; right: 4px; color: #7cfc00; font-size: 10px; }
      .reinc-shop-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; }
      .shop-item { background: rgba(0,0,0,0.2); border-radius: 8px; padding: 8px; cursor: pointer; transition: all 0.2s; }
      .shop-item:hover { background: rgba(255,215,0,0.15); transform: translateY(-2px); }
      .shop-item-locked { opacity: 0.5; cursor: not-allowed; }
      .shop-item-icon { font-size: 20px; }
      .shop-item-name { font-size: 12px; color: #ffd700; font-weight: bold; margin-top: 2px; }
      .shop-item-desc { font-size: 10px; color: #aaa; margin: 3px 0; line-height: 1.3; }
      .shop-item-cost { color: #da70d6; font-size: 11px; }
      .btn-rebirth { width: 100%; background: linear-gradient(135deg, #8a2be2, #da70d6); color: #fff; font-size: 16px; padding: 12px; border-radius: 10px; border: none; cursor: pointer; font-weight: bold; transition: all 0.3s; }
      .btn-rebirth:hover { background: linear-gradient(135deg, #9932cc, #ff00ff); box-shadow: 0 0 20px rgba(218,112,214,0.5); transform: scale(1.02); }
    </style>
  `;
}

function renderReincarnationPanelError(msg) {
  const container = document.getElementById('reincarnationContent');
  if (container) {
    container.innerHTML = `<div style="text-align:center;padding:40px;color:#ff6b6b">加载失败: ${msg}</div>`;
  }
}

async function confirmRebirth() {
  const info = reincarnationState.info;
  if (!info) return;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay active';
  modal.id = 'rebirthConfirmModal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:400px">
      <div class="modal-header">
        <div class="modal-title">☸️ 确认轮回重修</div>
        <div class="modal-close" onclick="closeRebirthConfirm()">×</div>
      </div>
      <div style="padding:15px;text-align:center">
        <div style="font-size:48px;margin-bottom:15px">☸️</div>
        <p style="color:#ffd700;font-size:16px;margin-bottom:10px">确定要进行轮回重修吗？</p>
        <div style="background:rgba(0,0,0,0.3);border-radius:8px;padding:12px;text-align:left;margin-bottom:15px">
          <p style="color:#aaa;font-size:12px;margin-bottom:6px">📜 轮回须知:</p>
          <p style="color:#fff;font-size:12px;margin-bottom:4px">• 境界将重置为 <b style="color:#7cfc00">练气期 第1层</b></p>
          <p style="color:#fff;font-size:12px;margin-bottom:4px">• 本世天道感悟: <b style="color:#ffd700">+${Math.floor(Math.random()*500+200)}</b></p>
          <p style="color:#fff;font-size:12px;margin-bottom:4px">• 保留 <b style="color:#da70d6">${info.unlocked_talents?.includes('rebirth_blessing') ? '50%' : '10%'}</b> 天道感悟</p>
          <p style="color:#fff;font-size:12px">• 轮回加成: <b style="color:#7cfc00">全属性+${(info.cycles||0)+1}×3%+${(info.highest_layer||0)+1}×2%</b></p>
        </div>
        <div style="display:flex;gap:10px">
          <button class="btn" style="flex:1;opacity:0.7" onclick="closeRebirthConfirm()">取消</button>
          <button class="btn" style="flex:1;background:linear-gradient(135deg,#8a2be2,#da70d6);color:#fff" onclick="doRebirth()">☸️ 确认轮回</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function closeRebirthConfirm() {
  const m = document.getElementById('rebirthConfirmModal');
  if (m) m.remove();
}

async function doRebirth() {
  closeRebirthConfirm();
  try {
    const res = await reincarnationAPI.rebirth(true);
    if (res.code === 0) {
      showReincarnationSuccess(res.data);
      // 触发全屏特效
      triggerRebirthEffect();
      // 刷新玩家数据
      if (typeof refreshPlayerData === 'function') refreshPlayerData();
    } else {
      alert('轮回失败: ' + res.msg);
    }
  } catch (e) {
    alert('轮回请求失败: ' + e.message);
  }
}

function showReincarnationSuccess(data) {
  reincarnationState.info = { ...reincarnationState.info, ...data };
  const modal = document.createElement('div');
  modal.className = 'modal-overlay active';
  modal.id = 'rebirthSuccessModal';
  const newTalents = (data.new_talents || []).map(id => TALENT_ICONS[id] || '✨').join(' ');
  modal.innerHTML = `
    <div class="modal-content" style="max-width:380px;text-align:center">
      <div style="font-size:60px;margin-bottom:10px">☸️</div>
      <h2 style="color:#ffd700;margin-bottom:15px">轮回成功！</h2>
      <div style="background:rgba(0,0,0,0.3);border-radius:8px;padding:15px;text-align:left;margin-bottom:15px">
        <p style="color:#fff;font-size:13px;margin-bottom:6px">• 新轮回层数: <b style="color:#da70d6">第 ${data.new_cycles} 层</b></p>
        <p style="color:#fff;font-size:13px;margin-bottom:6px">• 保留感悟: <b style="color:#ffd700">${data.kept_insight}</b></p>
        <p style="color:#fff;font-size:13px;margin-bottom:6px">• 永久攻击: <b style="color:#7cfc00">+${data.permanent_bonus?.atk_pct || 0}%</b></p>
        <p style="color:#fff;font-size:13px;margin-bottom:6px">• 永久防御: <b style="color:#7cfc00">+${data.permanent_bonus?.def_pct || 0}%</b></p>
        ${newTalents ? `<p style="color:#fff;font-size:13px">• 解锁天赋: <b style="color:#da70d6">${newTalents}</b></p>` : ''}
      </div>
      <button class="btn" style="width:100%;background:linear-gradient(135deg,#8a2be2,#da70d6);color:#fff" onclick="closeRebirthSuccess()">踏入新世</button>
    </div>
  `;
  document.body.appendChild(modal);
}

function closeRebirthSuccess() {
  const m = document.getElementById('rebirthSuccessModal');
  if (m) m.remove();
  closeModal('reincarnationModal');
}

async function buyReincItem(itemId) {
  try {
    const res = await reincarnationAPI.buy(itemId);
    if (res.code === 0) {
      alert(res.msg);
      loadReincarnationData();
    } else {
      alert('购买失败: ' + res.msg);
    }
  } catch (e) {
    alert('购买请求失败: ' + e.message);
  }
}

function triggerRebirthEffect() {
  // 创建全屏金色光芒特效
  const overlay = document.createElement('div');
  overlay.id = 'reincarnationEffectOverlay';
  overlay.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;
    background: radial-gradient(ellipse at center, rgba(218,112,214,0.8) 0%, rgba(138,43,226,0.4) 40%, transparent 70%);
    animation: reincarnationFlash 2s ease-out forwards;
    pointer-events:none;
  `;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes reincarnationFlash {
      0% { opacity: 0; transform: scale(0.5); }
      20% { opacity: 1; transform: scale(1.1); }
      60% { opacity: 1; transform: scale(1); }
      100% { opacity: 0; transform: scale(1.5); }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(overlay);
  setTimeout(() => {
    overlay.remove();
    style.remove();
  }, 2500);
}
