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
  lastKill: null
};

// ============ 召唤BOSS ============
function summonWorldBoss(bossId) {
  const data = WORLD_BOSS_DATA[bossId];
  if (!data) return { success: false, message: 'BOSS不存在' };
  
  // 检查冷却
  if (worldBossState.currentBoss === bossId) {
    const remaining = data.respawn_time - (Date.now() - worldBossState.spawnTime) / 1000;
    if (remaining > 0) return { success: false, message: `BOSS还在休息，${Math.ceil(remaining/3600)}小时后刷新` };
  }
  
  const scale = BOSS_QUALITY[data.quality]?.scale || 1;
  
  worldBossState = {
    currentBoss: bossId,
    hp: Math.floor(data.base_hp * scale),
    maxHp: Math.floor(data.base_hp * scale),
    participants: [],
    status: 'alive',
    spawnTime: Date.now(),
    lastKill: null
  };
  
  // 公告
  addLog(`⚠️ 世界BOSS ${data.name} 已降临！`, 'boss');
  
  return { success: true, message: `召唤 ${data.name} 成功！` };
}

// ============ 攻击BOSS ============
function attackWorldBoss() {
  if (worldBossState.status !== 'alive') {
    return { success: false, message: '当前没有活跃的BOSS' };
  }
  
  const player = gameState.player;
  const boss = WORLD_BOSS_DATA[worldBossState.currentBoss];
  const s = game.calculatePlayerStats();
  const skill = game.getSkillBonus(); // 获取功法加成
  
  // 闪避判定 (应用闪避功法加成)
  const dodgeChance = skill.dodge_rate || 0;
  if (Math.random() < dodgeChance) {
    return { success: true, message: '💨 躲避了BOSS的攻击!', dodged: true };
  }
  
  // 计算伤害
  let damage = Math.max(1, s.atk - boss.base_def * 0.1);
  
  // 暴击 (应用暴击功法加成)
  const critChance = s.crit_rate || 0;
  const crit = Math.random() < critChance;
  if (crit) damage *= 2;
  
  // 应用攻击功法加成
  damage *= (1 + (skill.atk_bonus || 0));
  
  // 记录伤害
  let participant = worldBossState.participants.find(p => p.playerId === player.name);
  if (!participant) {
    participant = { playerId: player.name, damage: 0, lastAttack: Date.now() };
    worldBossState.participants.push(participant);
  }
  participant.damage += damage;
  participant.lastAttack = Date.now();
  
  // 扣除BOSS血量
  worldBossState.hp -= damage;
  
  // 检查是否击杀
  if (worldBossState.hp <= 0) {
    return killWorldBoss();
  }
  
  const critMsg = crit ? ' (暴击!)' : '';
  return { 
    success: true, 
    damage: Math.floor(damage),
    crit,
    hp: worldBossState.hp,
    maxHp: worldBossState.maxHp,
    message: `对BOSS造成 ${Math.floor(damage)} 伤害${critMsg}`
  };
}

// ============ 击杀BOSS ============
function killWorldBoss() {
  const boss = WORLD_BOSS_DATA[worldBossState.currentBoss];
  const skill = game.getSkillBonus(); // 获取功法加成
  worldBossState.status = 'dead';
  worldBossState.lastKill = {
    killer: gameState.player.name,
    time: Date.now()
  };
  
  // 奖励分配
  const rewards = boss.rewards;
  
  // 最后一击者额外奖励
  const killer = worldBossState.participants.sort((a, b) => b.damage - a.damage)[0];
  
  // 参与奖
  for (const p of worldBossState.participants) {
    const damageRatio = p.damage / worldBossState.maxHp;
    // 应用经验功法加成
    const expMultiplier = 1 + (skill.exp_bonus || 0);
    const expReward = Math.floor(rewards.exp * damageRatio * 0.5 * expMultiplier);
    const stoneReward = Math.floor(rewards.stones * damageRatio * 0.5);
    
    // 只有自己收到奖励（单机模拟）
    if (p.playerId === gameState.player.name) {
      gameState.player.experience += expReward;
      gameState.player.spiritStones += stoneReward;
      
      if (p.playerId === killer?.playerId && rewards.items) {
        // 击杀者获得物品
        for (const item of rewards.items) {
          gameState.player.artifacts_inventory = gameState.player.artifacts_inventory || {};
          gameState.player.artifacts_inventory[item] = (gameState.player.artifacts_inventory[item] || 0) + 1;
        }
      }
    }
  }
  
  gameState.stats.worldBossKills = (gameState.stats.worldBossKills || 0) + 1;
  
  addLog(`🎉 ${killer?.playerId || '未知'} 击杀 ${boss.name}！`, 'boss');
  
  return { 
    success: true, 
    message: `🏆 击杀 ${boss.name}！`, 
    rewards: { exp: rewards.exp, stones: rewards.stones, items: killer?.playerId === gameState.player.name ? rewards.items : [] }
  };
}

// ============ BOSS排名 ============
function getBossRanking() {
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
function spawnDailyBoss() {
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

console.log('👹 世界BOSS系统 v4.0 已加载');
