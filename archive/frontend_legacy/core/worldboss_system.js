/**
 * 世界BOSS系统 v4.0
 * 全服挑战/排名奖励/击杀掉落
 */

const WORLD_BOSS_DATA = {
  // 世界BOSS列表
  'demon_lord': {
    name: '魔尊', quality: 'legendary',
    base_hp: 100000, base_atk: 5000, base_def: 2000,
    respawn_time: 86400, // 24小时
    rewards: { exp: 50000, stones: 10000, items: ['world_dust', 'divine_ore'] },
    description: '上古魔尊复苏'
  },
  'dragon_king': {
    name: '东海龙王', quality: 'legendary',
    base_hp: 80000, base_atk: 4000, base_def: 1500,
    respawn_time: 43200, // 12小时
    rewards: { exp: 40000, stones: 8000, items: ['dragon_scale', 'divine_ore'] },
    description: '统御四海的真龙'
  },
  'ancient_god': {
    name: '古神', quality: 'mythical',
    base_hp: 500000, base_atk: 20000, base_def: 10000,
    respawn_time: 172800, // 48小时
    rewards: { exp: 200000, stones: 50000, items: ['world_frag', 'chaos_heart'] },
    description: '混沌初开时的古老神灵'
  },
  'void_beast': {
    name: '虚空巨兽', quality: 'epic',
    base_hp: 30000, base_atk: 2000, base_def: 800,
    respawn_time: 21600, // 6小时
    rewards: { exp: 20000, stones: 5000, items: ['void_essence'] },
    description: '来自虚空的恐怖存在'
  },
  'immortal_sage': {
    name: '散仙', quality: 'rare',
    base_hp: 15000, base_atk: 1000, base_def: 500,
    respawn_time: 10800, // 3小时
    rewards: { exp: 10000, stones: 3000, items: ['immortal_iron'] },
    description: '渡劫失败的仙人'
  }
};

const BOSS_QUALITY = {
  rare: { name: '稀有', color: '#1E90FF', scale: 1 },
  epic: { name: '史诗', color: '#9932CC', scale: 1.5 },
  legendary: { name: '传说', color: '#FFD700', scale: 2 },
  mythical: { name: '神话', color: '#FF4500', scale: 5 }
};

// BOSS技能
const BOSS_SKILLS = {
  'smash': { name: '重力碾压', damage: 2.0, description: '造成200%伤害' },
  'roar': { name: '震天怒吼', damage: 1.5, effect: 'stun', description: '眩晕所有玩家' },
  'dark_cloud': { name: '黑云压城', damage: 0.5, effect: 'dot', description: '持续伤害' },
  'teleport': { name: '瞬间移动', effect: 'dodge', description: '闪避下一次攻击' },
  'enrage': { name: '狂怒', damage: 3.0, description: '血量低于30%时触发' }
};

// ============ 世界BOSS状态 ============
let worldBossState = {
  currentBoss: null,
  hp: 0,
  maxHp: 0,
  participants: [],  // { playerId, damage, lastAttack }
  status: 'dead',    // dead, alive, fighting
  spawnTime: 0,
  lastKill: null,
  synced: false       // 是否已从后端同步
};

// ============ 从后端同步BOSS状态 ============
async function syncWorldBossFromBackend() {
  try {
    const res = await fetch('/api/worldBoss/status');
    if (!res.ok) return;
    const data = await res.json();
    
    if (data.status === 'alive' && data.boss) {
      worldBossState.currentBoss = data.boss.id;
      worldBossState.hp = data.hp;
      worldBossState.maxHp = data.maxHp;
      worldBossState.participants = (data.damageRecords || []).map(r => ({
        playerId: r.name || r.userId,
        damage: r.damage,
        lastAttack: r.time
      }));
      worldBossState.status = 'alive';
      worldBossState.spawnTime = data.boss.lastRefresh || Date.now();
    } else {
      worldBossState.status = 'dead';
      worldBossState.currentBoss = null;
    }
    worldBossState.synced = true;
  } catch(e) {
    console.warn('世界BOSS后端同步失败，使用本地状态', e);
    worldBossState.synced = true;
  }
}

// ============ 召唤BOSS ============
async function summonWorldBoss(bossId) {
  const data = WORLD_BOSS_DATA[bossId];
  if (!data) return { success: false, message: 'BOSS不存在' };
  
  // 检查冷却
  if (worldBossState.currentBoss === bossId && worldBossState.status === 'alive') {
    return { success: false, message: `BOSS正在活跃中，请先击杀！` };
  }
  
  try {
    const res = await fetch('/api/worldBoss/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bossId, userId: 1 })
    });
    const result = await res.json();
    
    if (result.success || result.status === 'alive') {
      // 从后端获取真实BOSS数据
      await syncWorldBossFromBackend();
      addLog(`⚠️ 世界BOSS ${data.name} 已降临！`, 'boss');
      return { success: true, message: `召唤 ${data.name} 成功！` };
    } else {
      return { success: false, message: result.message || '召唤失败' };
    }
  } catch(e) {
    // 后端不可用，使用本地模拟
    const scale = BOSS_QUALITY[data.quality]?.scale || 1;
    worldBossState = {
      currentBoss: bossId,
      hp: Math.floor(data.base_hp * scale),
      maxHp: Math.floor(data.base_hp * scale),
      participants: [],
      status: 'alive',
      spawnTime: Date.now(),
      lastKill: null,
      synced: false
    };
    addLog(`⚠️ 世界BOSS ${data.name} 已降临！(本地模式)`, 'boss');
    return { success: true, message: `召唤 ${data.name} 成功！` };
  }
}

// ============ 攻击BOSS ============
async function attackWorldBoss() {
  if (worldBossState.status !== 'alive') {
    return { success: false, message: '当前没有活跃的BOSS' };
  }
  
  const player = gameState.player;
  
  try {
    const res = await fetch('/api/worldBoss/attack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId: 1, 
        playerName: player.name || '修仙者',
        damage: Math.floor(game.calculatePlayerStats().atk)
      })
    });
    const result = await res.json();
    
    if (result.success) {
      // 更新本地状态
      if (result.remainingHp !== undefined) {
        worldBossState.hp = result.remainingHp;
      } else if (result.hp !== undefined) {
        worldBossState.hp = result.hp;
      }
      if (result.maxHp !== undefined) {
        worldBossState.maxHp = result.maxHp;
      }
      
      // 添加伤害记录
      let participant = worldBossState.participants.find(p => p.playerId === (player.name || '修仙者'));
      if (!participant) {
        participant = { playerId: player.name || '修仙者', damage: 0, lastAttack: Date.now() };
        worldBossState.participants.push(participant);
      }
      participant.damage += result.damage || 0;
      participant.lastAttack = Date.now();
      
      const crit = result.crit || false;
      const message = result.message || `对BOSS造成 ${result.damage} 伤害${crit ? ' (暴击!)' : ''}`;
      addLog(message, 'boss');
      
      if ((result.remainingHp !== undefined ? result.remainingHp : result.hp) <= 0 || result.killed) {
        return await killWorldBoss();
      }
      
      return { 
        success: true, 
        damage: result.damage || 0,
        crit,
        hp: result.remainingHp !== undefined ? result.remainingHp : worldBossState.hp,
        maxHp: worldBossState.maxHp,
        message
      };
    } else {
      return { success: false, message: result.message || '攻击失败' };
    }
  } catch(e) {
    // 后端不可用，使用本地模拟
    const boss = WORLD_BOSS_DATA[worldBossState.currentBoss];
    const s = game.calculatePlayerStats();
    let damage = Math.max(1, s.atk - (boss?.base_def || 0) * 0.1);
    const crit = Math.random() < 0.1;
    if (crit) damage *= 2;
    
    let participant = worldBossState.participants.find(p => p.playerId === (player.name || '修仙者'));
    if (!participant) {
      participant = { playerId: player.name || '修仙者', damage: 0, lastAttack: Date.now() };
      worldBossState.participants.push(participant);
    }
    participant.damage += damage;
    participant.lastAttack = Date.now();
    
    worldBossState.hp -= damage;
    
    if (worldBossState.hp <= 0) {
      return await killWorldBoss();
    }
    
    return { 
      success: true, 
      damage: Math.floor(damage),
      crit,
      hp: worldBossState.hp,
      maxHp: worldBossState.maxHp,
      message: `对BOSS造成 ${Math.floor(damage)} 伤害${crit ? ' (暴击!)' : ''} (本地模式)`
    };
  }
}

// ============ 击杀BOSS ============
async function killWorldBoss() {
  const boss = WORLD_BOSS_DATA[worldBossState.currentBoss];
  worldBossState.status = 'dead';
  worldBossState.lastKill = {
    killer: gameState.player.name,
    time: Date.now()
  };
  
  // 奖励分配
  const rewards = boss?.rewards || { exp: 10000, stones: 1000, items: [] };
  
  // 最后一击者额外奖励
  const killer = worldBossState.participants.sort((a, b) => b.damage - a.damage)[0];
  
  // 参与奖
  const myDamage = worldBossState.participants.find(p => p.playerId === (gameState.player.name || '修仙者'))?.damage || 0;
  const damageRatio = worldBossState.maxHp > 0 ? myDamage / worldBossState.maxHp : 0;
  const expReward = Math.floor(rewards.exp * damageRatio * 0.5);
  const stoneReward = Math.floor(rewards.stones * damageRatio * 0.5);
  
  gameState.player.experience = (gameState.player.experience || 0) + expReward;
  gameState.player.spiritStones = (gameState.player.spiritStones || 0) + stoneReward;
  
  const isKiller = killer?.playerId === (gameState.player.name || '修仙者');
  if (isKiller && rewards.items?.length > 0) {
    for (const item of rewards.items) {
      gameState.player.artifacts_inventory = gameState.player.artifacts_inventory || {};
      gameState.player.artifacts_inventory[item] = (gameState.player.artifacts_inventory[item] || 0) + 1;
    }
  }
  
  gameState.stats.worldBossKills = (gameState.stats.worldBossKills || 0) + 1;
  
  addLog(`🎉 ${killer?.playerId || '未知'} 击杀 ${boss?.name || 'BOSS'}！`, 'boss');
  
  return { 
    success: true, 
    message: `🏆 击杀 ${boss?.name || 'BOSS'}！`, 
    rewards: { exp: expReward, stones: stoneReward, items: isKiller ? rewards.items : [] }
  };
}

// ============ BOSS排名 ============
async function getBossRanking() {
  try {
    const res = await fetch('/api/worldBoss/ranks');
    if (res.ok) {
      const data = await res.json();
      return (data.ranks || []).slice(0, 10).map((r, i) => ({ 
        rank: i + 1, 
        name: r.name || r.playerName, 
        damage: Math.floor(r.damage || r.totalDamage || 0) 
      }));
    }
  } catch(e) {}
  
  // Fallback to local
  return worldBossState.participants
    .sort((a, b) => b.damage - a.damage)
    .slice(0, 10)
    .map((p, i) => ({ rank: i + 1, name: p.playerId, damage: Math.floor(p.damage) }));
}

// ============ BOSS血量百分比 ============
function getBossHP() {
  if (worldBossState.status !== 'alive') return null;
  return {
    current: worldBossState.hp,
    max: worldBossState.maxHp,
    percent: (worldBossState.hp / worldBossState.maxHp * 100).toFixed(1),
    boss: worldBossState.currentBoss,
    bossName: WORLD_BOSS_DATA[worldBossState.currentBoss]?.name,
    participantCount: worldBossState.participants.length
  };
}

// ============ 每日BOSS ============
async function spawnDailyBoss() {
  const bosses = Object.keys(WORLD_BOSS_DATA);
  const randomBoss = bosses[Math.floor(Math.random() * bosses.length)];
  return summonWorldBoss(randomBoss);
}

// 导出
window.WORLD_BOSS_DATA = WORLD_BOSS_DATA;
window.BOSS_QUALITY = BOSS_QUALITY;
window.BOSS_SKILLS = BOSS_SKILLS;
window.worldBossState = worldBossState;
window.summonWorldBoss = summonWorldBoss;
window.attackWorldBoss = attackWorldBoss;
window.getBossRanking = getBossRanking;
window.getBossHP = getBossHP;
window.spawnDailyBoss = spawnDailyBoss;
window.syncWorldBossFromBackend = syncWorldBossFromBackend;

// 初始同步（延迟执行，等游戏状态加载完成）
setTimeout(() => { syncWorldBossFromBackend(); }, 3000);

console.log('👹 世界BOSS系统 v4.0 已加载 (后端集成版)');
