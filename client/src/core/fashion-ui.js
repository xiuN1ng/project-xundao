// ==================== 时装系统 UI ====================
let fashionCurrentTab = 'owned';

// 时装数据
const FASHION_DATA = {
  // 时装类型：头部、身体、武器、外观
  head: {
    'tianluo': { name: '天罗束发', quality: 'epic', atk: 50, def: 30, spirit: 20, desc: '天蚕丝编织的发饰，散发仙气', price: 5000 },
    'crown': { name: '白玉冠', quality: 'legend', atk: 100, def: 60, spirit: 50, desc: '上古玉髓制成的头冠', price: 20000 },
    'turban': { name: '青纱斗笠', quality: 'rare', atk: 25, def: 15, spirit: 10, desc: '江湖侠客常用', price: 1500 }
  },
  body: {
    'yixin': { name: '道心法袍', quality: 'legend', atk: 150, def: 120, spirit: 80, desc: '蕴含道之法则的法袍', price: 35000 },
    'yueru': { name: '月华裙', quality: 'epic', atk: 80, def: 70, spirit: 60, desc: '月精华织成的仙裙', price: 12000 },
    'heigu': { name: '玄铁甲', quality: 'rare', atk: 40, def: 50, spirit: 20, desc: '玄铁打造的护甲', price: 3000 },
    'suxie': { name: '素色长衫', quality: 'common', atk: 10, def: 15, spirit: 5, desc: '普通修士穿的长衫', price: 500 }
  },
  weapon: {
    'feijian': { name: '飞仙剑', quality: 'legend', atk: 200, def: 80, spirit: 100, desc: '仙人飞升时遗落的仙剑', price: 50000 },
    'yuxu': { name: '玉虚拂尘', quality: 'epic', atk: 120, def: 60, spirit: 80, desc: '道教至宝拂尘', price: 18000 },
    'bagua': { name: '八卦盘', quality: 'rare', atk: 60, def: 40, spirit: 30, desc: '推演天机的法宝', price: 5000 },
    'fan': { name: '山水折扇', quality: 'common', atk: 20, def: 10, spirit: 10, desc: '文人雅士的折扇', price: 800 }
  },
  aura: {
    'longwei': { name: '龙威气场', quality: 'legend', atk: 180, def: 150, spirit: 120, desc: '真龙之威形成的可怕气场', price: 45000 },
    'fenglin': { name: '凤舞九天', quality: 'epic', atk: 100, def: 90, spirit: 100, desc: '凤凰涅槃的绚烂光华', price: 15000 },
    'hanyue': { name: '寒月霜华', quality: 'rare', atk: 50, def: 60, spirit: 40, desc: '寒冷月华形成的保护气场', price: 4000 },
    'lingshi': { name: '灵气外放', quality: 'common', atk: 15, def: 20, spirit: 25, desc: '最简单的灵气外放形态', price: 600 }
  }
};

const FASHION_QUALITY = {
  common: { color: '#a0a0a0', name: '普通', bg: 'rgba(160,160,160,0.2)' },
  rare: { color: '#40a0ff', name: '稀有', bg: 'rgba(64,160,255,0.2)' },
  epic: { name: '史诗', color: '#a855f7', bg: 'rgba(168,85,247,0.2)' },
  legend: { name: '传说', color: '#ffd700', bg: 'rgba(255,215,0,0.2)' }
};

function showFashionPanel() {
  document.getElementById('fashionModal').classList.add('active');
  fashionCurrentTab = 'owned';
  renderFashionUI();
}

function switchFashionTab(tab) {
  fashionCurrentTab = tab;
  document.querySelectorAll('#fashionTabs .tab-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  renderFashionUI();
}

function renderFashionUI() {
  const container = document.getElementById('fashionContent');
  const owned = gameState.player.fashion || { head: null, body: null, weapon: null, aura: null };
  const inventory = gameState.player.fashion_inventory || {};
  
  if (fashionCurrentTab === 'owned') {
    // 已拥有时装
    let html = '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">';
    const slots = { head: '头部', body: '身体', weapon: '武器', aura: '外观' };
    
    for (const [slot, name] of Object.entries(slots)) {
      const equipped = owned[slot];
      const q = FASHION_QUALITY[equipped ? FASHION_DATA[slot][equipped]?.quality : 'common'];
      
      html += `<div style="padding:15px;background:${equipped ? q.bg : 'rgba(0,0,0,0.3)'};border-radius:8px;border:1px solid ${equipped ? q.color : '#444'}">
        <div style="font-weight:bold;margin-bottom:8px">${name}</div>
        ${equipped ? `
          <div style="color:${q.color};font-weight:bold">${FASHION_DATA[slot][equipped].name}</div>
          <div style="font-size:12px;color:#888;margin:5px 0">
            攻击+${FASHION_DATA[slot][equipped].atk} | 防御+${FASHION_DATA[slot][equipped].def} | 灵气+${FASHION_DATA[slot][equipped].spirit}
          </div>
          <button class="btn btn-sm" style="background:#666" onclick="unequipFashion('${slot}')">卸下</button>
        ` : '<div style="color:#666;font-size:12px">未装备</div>'}
      </div>`;
    }
    html += '</div>';
    
    // 显示时装加成总计
    let totalAtk = 0, totalDef = 0, totalSpirit = 0;
    for (const [slot, id] of Object.entries(owned)) {
      if (id && FASHION_DATA[slot]?.[id]) {
        totalAtk += FASHION_DATA[slot][id].atk;
        totalDef += FASHION_DATA[slot][id].def;
        totalSpirit += FASHION_DATA[slot][id].spirit;
      }
    }
    if (totalAtk > 0) {
      html += `<div style="margin-top:15px;padding:12px;background:rgba(255,215,0,0.1);border-radius:8px;border:1px solid rgba(255,215,0,0.3)">
        <div style="color:var(--accent-gold);font-weight:bold;margin-bottom:5px">时装加成汇总</div>
        <div style="font-size:13px;color:#ddd">
          攻击+${totalAtk} | 防御+${totalDef} | 灵气+${totalSpirit}
        </div>
      </div>`;
    }
    container.innerHTML = html;
    
  } else if (fashionCurrentTab === 'wear') {
    // 穿戴界面 - 选择要穿戴的时装
    let html = '';
    const slots = { head: '头部', body: '身体', weapon: '武器', aura: '外观' };
    
    for (const [slot, name] of Object.entries(slots)) {
      const slotData = FASHION_DATA[slot] || {};
      const ownedItems = Object.keys(inventory).filter(id => slotData[id]);
      
      html += `<div style="margin-bottom:15px">
        <div style="font-weight:bold;margin-bottom:8px;color:var(--accent-gold)">${name}</div>
        ${ownedItems.length === 0 ? '<div style="color:#666;font-size:12px">还没有该部位时装</div>' : ''}
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">`;
      
      for (const id of ownedItems) {
        const item = slotData[id];
        const q = FASHION_QUALITY[item.quality];
        const isEquipped = owned[slot] === id;
        
        html += `<div style="padding:10px;background:${isEquipped ? q.bg : 'rgba(0,0,0,0.3)'};border-radius:6px;border:1px solid ${isEquipped ? q.color : q.color + '66'};cursor:pointer" onclick="equipFashion('${slot}','${id}')">
          <div style="color:${q.color};font-size:13px;font-weight:bold">${item.name}</div>
          <div style="font-size:11px;color:#888;margin:3px 0">${item.quality === 'legend' ? '传说' : item.quality === 'epic' ? '史诗' : item.quality === 'rare' ? '稀有' : '普通'}</div>
          <div style="font-size:10px;color:#666">攻击+${item.atk} 防御+${item.def} 灵气+${item.spirit}</div>
          ${isEquipped ? '<div style="color:#4ade80;font-size:11px;margin-top:5px">已穿戴 ✓</div>' : ''}
        </div>`;
      }
      html += '</div></div>';
    }
    container.innerHTML = html;
    
  } else if (fashionCurrentTab === 'shop') {
    // 时装商店
    let html = '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">';
    
    for (const [slot, items] of Object.entries(FASHION_DATA)) {
      for (const [id, item] of Object.entries(items)) {
        const q = FASHION_QUALITY[item.quality];
        const isOwned = inventory[id];
        
        html += `<div style="padding:12px;background:${isOwned ? 'rgba(0,255,0,0.1)' : 'rgba(0,0,0,0.3)'};border-radius:8px;border:1px solid ${q.color}">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="color:${q.color};font-weight:bold">${item.name}</span>
            <span style="font-size:11px;color:${q.color}">${q.name}</span>
          </div>
          <div style="font-size:11px;color:#888;margin:5px 0">${item.desc}</div>
          <div style="font-size:11px;color:#aaa;margin-bottom:8px">
            攻击+${item.atk} | 防御+${item.def} | 灵气+${item.spirit}
          </div>
          ${isOwned ? 
            '<div style="color:#4ade80;font-size:12px">已拥有 ✓</div>' : 
            `<button class="btn btn-sm" style="background:linear-gradient(135deg,#ffd700,#ff8c00)" onclick="buyFashion('${id}','${slot}')">购买 ¥${item.price}</button>`
          }
        </div>`;
      }
    }
    html += '</div>';
    container.innerHTML = html;
  }
}

function equipFashion(slot, id) {
  const inventory = gameState.player.fashion_inventory || {};
  if (!inventory[id]) {
    showToast('你还没有这个时装', 'error');
    return;
  }
  
  if (!gameState.player.fashion) gameState.player.fashion = { head: null, body: null, weapon: null, aura: null };
  gameState.player.fashion[slot] = id;
  
  showToast(`已穿戴 ${FASHION_DATA[slot][id].name}`, 'success');
  renderFashionUI();
  updateStatsDisplay();
}

function unequipFashion(slot) {
  if (!gameState.player.fashion) return;
  
  const oldFashion = gameState.player.fashion[slot];
  gameState.player.fashion[slot] = null;
  
  showToast(`已卸下 ${FASHION_DATA[slot][oldFashion].name}`, 'info');
  renderFashionUI();
  updateStatsDisplay();
}

function buyFashion(id, slot) {
  const item = FASHION_DATA[slot]?.[id];
  if (!item) {
    showToast('时装不存在', 'error');
    return;
  }
  
  if (!gameState.player.fashion_inventory) gameState.player.fashion_inventory = {};
  if (gameState.player.fashion_inventory[id]) {
    showToast('已经拥有该时装', 'error');
    return;
  }
  
  if (gameState.player.spiritStones < item.price) {
    showToast('灵石不足', 'error');
    return;
  }
  
  gameState.player.spiritStones -= item.price;
  gameState.player.fashion_inventory[id] = true;
  
  showToast(`购买成功！获得 ${item.name}`, 'success');
  renderFashionUI();
  updateStatsDisplay();
}

// 获取时装加成
function getFashionBonus() {
  const f = gameState.player.fashion || {};
  let bonus = { atk: 0, def: 0, spirit: 0 };
  
  for (const [slot, id] of Object.entries(f)) {
    if (id && FASHION_DATA[slot]?.[id]) {
      bonus.atk += FASHION_DATA[slot][id].atk;
      bonus.def += FASHION_DATA[slot][id].def;
      bonus.spirit += FASHION_DATA[slot][id].spirit;
    }
  }
  return bonus;
}

