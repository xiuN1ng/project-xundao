/**
 * 师徒系统 v4.0 (API版)
 * 拜师收徒/传承加成
 */

const MASTER_QUALITY = {
  apprentice: { name: '徒弟', color: '#1E90FF' },
  master: { name: '师父', color: '#FFD700' }
};

// 师徒加成
const MASTER_BONUS = {
  master: {
    spirit_rate: 0.1,    // 师父灵气+10%
    exp_rate: 0.15,     // 经验+15%
    drop_rate: 0.2      // 掉落+20%
  },
  apprentice: {
    spirit_rate: 0.2,   // 徒弟灵气+20%
    exp_rate: 0.25,     // 经验+25%
    drop_rate: 0.1      // 掉落+10%
  }
};

// 传承类型
const INHERITANCE_TYPE = {
  'technique': { name: '功法传承', bonus_exp: 0.3, cost: 5000 },
  'realm': { name: '境界传承', bonus_exp: 0.5, cost: 10000 },
  'artifact': { name: '法宝传承', bonus_exp: 0.2, cost: 3000 },
  'spirit': { name: '灵气传承', bonus_exp: 0.4, cost: 8000 }
};

// 徒弟评分
const APPRENTICE_RATING = {
  excellent: { name: '优秀', bonus: 1.5 },
  good: { name: '良好', bonus: 1.2 },
  average: { name: '一般', bonus: 1.0 },
  poor: { name: '差劲', bonus: 0.8 }
};

// ============ 师徒数据 (本地缓存) ============
let masterData = {
  players: {} // playerId: { role, master, apprentices: [], reputation, teachCount, learnCount }
};

// ============ 拜师 ============
async function becomeApprentice(masterId) {
  const player = gameState.player;
  
  if (masterData.players[player.name]) {
    return { success: false, message: '你已有师徒关系' };
  }
  
  // 检查境界要求
  if (player.realmLevel >= 10) {
    return { success: false, message: '境界太高，无法拜师' };
  }
  
  // 调用后端API
  const result = await masterAPI.becomeApprentice(masterId);
  
  if (result.success) {
    masterData.players[player.name] = {
      role: 'apprentice',
      master: masterId,
      apprentices: [],
      reputation: 50,
      teachCount: 0,
      learnCount: 0,
      joinedAt: Date.now()
    };
    
    // 师父收徒
    if (!masterData.players[masterId]) {
      masterData.players[masterId] = {
        role: 'master',
        master: null,
        apprentices: [],
        reputation: 50,
        teachCount: 0,
        learnCount: 0
      };
    }
    masterData.players[masterId].apprentices.push(player.name);
    
    gameState.stats.timesApprenticed = (gameState.stats.timesApprenticed || 0) + 1;
  }
  
  return result;
}

// ============ 收徒 ============
async function acceptApprentice(apprenticeId) {
  const player = gameState.player;
  
  if (!masterData.players[player.name]) {
    masterData.players[player.name] = {
      role: 'master',
      master: null,
      apprentices: [],
      reputation: 50,
      teachCount: 0,
      learnCount: 0
    };
  }
  
  const data = masterData.players[player.name];
  
  if (data.apprentices.length >= 5) {
    return { success: false, message: '最多收5名徒弟' };
  }
  
  // 调用后端API
  const result = await masterAPI.acceptApprentice(apprenticeId);
  
  if (result.success) {
    // 创建徒弟数据
    masterData.players[apprenticeId] = {
      role: 'apprentice',
      master: player.name,
      apprentices: [],
      reputation: 50,
      teachCount: 0,
      learnCount: 0,
      joinedAt: Date.now()
    };
    
    data.apprentices.push(apprenticeId);
    data.teachCount++;
  }
  
  return result;
}

// ============ 逐出徒弟 ============
async function expelApprentice(apprenticeId) {
  const player = gameState.player;
  const data = masterData.players[player.name];
  
  if (!data || data.role !== 'master') {
    return { success: false, message: '你没有徒弟' };
  }
  
  const idx = data.apprentices.indexOf(apprenticeId);
  if (idx < 0) {
    return { success: false, message: '这不是你的徒弟' };
  }
  
  // 调用后端API
  const result = await masterAPI.expelApprentice(apprenticeId);
  
  if (result.success) {
    // 徒弟除名
    if (masterData.players[apprenticeId]) {
      masterData.players[apprenticeId].master = null;
    }
    
    data.apprentices.splice(idx, 1);
  }
  
  return result;
}

// ============ 离开师门 ============
async function leaveMaster() {
  const player = gameState.player;
  const data = masterData.players[player.name];
  
  if (!data || data.role !== 'apprentice' || !data.master) {
    return { success: false, message: '你没有师父' };
  }
  
  // 调用后端API
  const result = await masterAPI.leave();
  
  if (result.success) {
    // 通知师父
    const master = masterData.players[data.master];
    if (master) {
      master.apprentices = master.apprentices.filter(a => a !== player.name);
    }
    
    data.master = null;
    data.role = null;
  }
  
  return result;
}

// ============ 传授功法 ============
async function teachTechnique(apprenticeId) {
  const player = gameState.player;
  const data = masterData.players[player.name];
  
  if (!data || data.role !== 'master') {
    return { success: false, message: '你没有徒弟' };
  }
  
  if (!data.apprentices.includes(apprenticeId)) {
    return { success: false, message: '这不是你的徒弟' };
  }
  
  // 检查CD
  if (player.lastTeach && Date.now() - player.lastTeach < 3600000) {
    return { success: false, message: '1小时只能传授一次' };
  }
  
  const apprentice = masterData.players[apprenticeId];
  if (!apprentice) return { success: false, message: '徒弟不存在' };
  
  // 调用后端API
  const result = await masterAPI.teachTechnique(apprenticeId);
  
  if (result.success) {
    // 传授成功
    player.lastTeach = Date.now();
    data.teachCount++;
    data.reputation = Math.min(100, data.reputation + 5);
    apprentice.reputation = Math.min(100, apprentice.reputation + 3);
    
    // 获得传承经验
    const expGain = 1000 * (1 + data.reputation / 100);
    player.experience += expGain;
  }
  
  return result;
}

// ============ 请教功法 ============
async function learnFromMaster() {
  const player = gameState.player;
  const data = masterData.players[player.name];
  
  if (!data || data.role !== 'apprentice' || !data.master) {
    return { success: false, message: '你没有师父' };
  }
  
  // 检查CD
  if (player.lastLearn && Date.now() - player.lastLearn < 3600000) {
    return { success: false, message: '1小时只能请教一次' };
  }
  
  // 调用后端API
  const result = await masterAPI.learnFromMaster();
  
  if (result.success) {
    player.lastLearn = Date.now();
    data.learnCount++;
    
    // 获得经验加成
    const expGain = 2000;
    player.experience += expGain;
  }
  
  return result;
}

// ============ 师徒加成计算 ============
function getMasterBonus() {
  const player = gameState.player;
  const data = masterData.players[player.name];
  
  if (!data) return { spirit_rate: 1, exp_rate: 1, drop_rate: 1 };
  
  let bonus = { spirit_rate: 1, exp_rate: 1, drop_rate: 1 };
  
  if (data.role === 'apprentice' && data.master) {
    const b = MASTER_BONUS.apprentice;
    bonus.spirit_rate *= (1 + b.spirit_rate);
    bonus.exp_rate *= (1 + b.exp_rate);
    bonus.drop_rate *= (1 + b.drop_rate);
  }
  
  if (data.role === 'master' && data.apprentices.length > 0) {
    const b = MASTER_BONUS.master;
    const count = Math.min(data.apprentices.length, 3);
    bonus.spirit_rate *= (1 + b.spirit_rate * count);
    bonus.exp_rate *= (1 + b.exp_rate * count);
    bonus.drop_rate *= (1 + b.drop_rate * count);
  }
  
  return bonus;
}

// ============ 师徒信息 ============
async function getMasterInfo() {
  const player = gameState.player;
  
  // 从API获取最新数据
  const result = await masterAPI.getInfo();
  if (result.success && result.data) {
    masterData.players[player.name] = result.data;
  }
  
  const data = masterData.players[player.name];
  
  if (!data) return null;
  
  return {
    role: data.role,
    master: data.master,
    apprentices: data.apprentices,
    reputation: data.reputation,
    teachCount: data.teachCount,
    learnCount: data.learnCount
  };
}

// ============ 传承 ============
async function inheritFromMaster(type) {
  const player = gameState.player;
  const data = masterData.players[player.name];
  const inherit = INHERITANCE_TYPE[type];
  
  if (!data || data.role !== 'apprentice' || !data.master) {
    return { success: false, message: '你没有师父' };
  }
  
  if (!inherit) return { success: false, message: '传承类型不存在' };
  
  if (player.spiritStones < inherit.cost) {
    return { success: false, message: `需要 ${inherit.cost} 灵石` };
  }
  
  // 调用后端API
  const result = await masterAPI.inherit(type);
  
  if (result.success) {
    player.spiritStones -= inherit.cost;
    
    // 一次性加成
    const expGain = 10000 * inherit.bonus_exp;
    player.experience += expGain;
  }
  
  return result;
}

// ============ 获取可拜师的师父列表 ============
async function getAvailableMasters() {
  const result = await masterAPI.getAvailableMasters();
  return result;
}

// ============ 获取我的徒弟列表 ============
async function getApprentices() {
  const result = await masterAPI.getApprentices();
  return result;
}

// 导出
window.MASTER_QUALITY = MASTER_QUALITY;
window.INHERITANCE_TYPE = INHERITANCE_TYPE;
window.masterData = masterData;
window.becomeApprentice = becomeApprentice;
window.acceptApprentice = acceptApprentice;
window.expelApprentice = expelApprentice;
window.leaveMaster = leaveMaster;
window.teachTechnique = teachTechnique;
window.learnFromMaster = learnFromMaster;
window.getMasterBonus = getMasterBonus;
window.getMasterInfo = getMasterInfo;
window.inheritFromMaster = inheritFromMaster;
window.getAvailableMasters = getAvailableMasters;
window.getApprentices = getApprentices;

console.log('🎓 师徒系统 v4.0 (API版) 已加载');
