const express = require('express');
const router = express.Router();
const { AbyssStorage } = require('../abyss_storage');

const storage = new AbyssStorage();

// =====================
// 封魔渊层配置（修正：每层增加 crystals 区间字段）
// =====================
const FLOOR_CONFIG = [
  { floor: 1,  name: '封印入口',    reqLevel: 1,   energy: 10, crystals: [10, 25],  demonTypes: ['shadow_rat', 'ghost_wolf'],    boss: 'shadow_beast'   },
  { floor: 2,  name: '封印一层',    reqLevel: 5,   energy: 15, crystals: [20, 50],  demonTypes: ['ghost_wolf', 'poison_spider'], boss: 'abyss_scorpion' },
  { floor: 3,  name: '封印二层',    reqLevel: 10,  energy: 20, crystals: [35, 80],  demonTypes: ['poison_spider', 'flame_imp'],  boss: 'flame_demon'    },
  { floor: 4,  name: '封印三层',    reqLevel: 15,  energy: 25, crystals: [55, 130], demonTypes: ['flame_imp', 'frost_wraith'],   boss: 'frost_giant'    },
  { floor: 5,  name: '封印四层',    reqLevel: 20,  energy: 30, crystals: [80, 200], demonTypes: ['frost_wraith', 'thunder_beast'], boss: 'thunder_dragon' },
  { floor: 6,  name: '封印五层',    reqLevel: 25,  energy: 35, crystals: [120, 300], demonTypes: ['thunder_beast', 'bone_golem'], boss: 'bone_lord'    },
  { floor: 7,  name: '封印六层',    reqLevel: 30,  energy: 40, crystals: [160, 400], demonTypes: ['bone_golem', 'demon_knight'], boss: 'demon_king'    },
  { floor: 8,  name: '封印七层',    reqLevel: 35,  energy: 45, crystals: [220, 550], demonTypes: ['demon_knight', 'abyss_specter'], boss: 'specter_lord'  },
  { floor: 9,  name: '封印八层',    reqLevel: 40,  energy: 50, crystals: [300, 750], demonTypes: ['abyss_specter', 'chaos_beast'], boss: 'chaos_overlord' },
  { floor: 10, name: '封魔渊深处',  reqLevel: 50,  energy: 60, crystals: [400, 1000], demonTypes: ['chaos_beast', 'doom_dragon'], boss: 'doom_overlord'  },
];

// 魔兽图鉴
const DEMON_BESTIARY = {
  shadow_rat:     { id: 'shadow_rat',     name: '暗影鼠',      icon: '🐀', hp: 50,   attack: 8,   defense: 3,   crystals: [1,3],    exp: 10  },
  ghost_wolf:     { id: 'ghost_wolf',     name: '幽冥狼',      icon: '🐺', hp: 120,  attack: 18,  defense: 8,   crystals: [3,8],    exp: 30  },
  poison_spider:  { id: 'poison_spider',  name: '毒岩蛛',      icon: '🕷️', hp: 200,  attack: 30,  defense: 12,  crystals: [5,12],   exp: 60  },
  flame_imp:      { id: 'flame_imp',      name: '焰魔',        icon: '👹', hp: 350,  attack: 55,  defense: 20,  crystals: [8,20],   exp: 100 },
  frost_wraith:   { id: 'frost_wraith',   name: '霜魂',        icon: '👻', hp: 500,  attack: 80,  defense: 35,  crystals: [12,30],  exp: 180 },
  thunder_beast:  { id: 'thunder_beast',  name: '雷兽',        icon: '⚡', hp: 800,  attack: 120, defense: 55,  crystals: [20,50],  exp: 300 },
  bone_golem:     { id: 'bone_golem',     name: '骨魔像',      icon: '💀', hp: 1200, attack: 160, defense: 90,  crystals: [30,80],  exp: 500 },
  demon_knight:   { id: 'demon_knight',   name: '魔将',        icon: '⚔️', hp: 1800, attack: 220, defense: 140, crystals: [50,120], exp: 800 },
  abyss_specter:  { id: 'abyss_specter',  name: '深渊幽灵',    icon: '👤', hp: 2500, attack: 300, defense: 200, crystals: [80,180], exp: 1200 },
  chaos_beast:    { id: 'chaos_beast',    name: '混沌兽',      icon: '🐉', hp: 3500, attack: 400, defense: 280, crystals: [120,260],exp: 1800 },
  doom_dragon:    { id: 'doom_dragon',    name: '末日龙',      icon: '🔴', hp: 5000, attack: 550, defense: 400, crystals: [180,400],exp: 2500 },
  shadow_beast:   { id: 'shadow_beast',   name: '暗影兽',      icon: '🌑', hp: 800,  attack: 100, defense: 50,  crystals: [30,80],  exp: 500,  isBoss: true },
  abyss_scorpion: { id: 'abyss_scorpion', name: '深渊毒蝎',    icon: '🦂', hp: 1500, attack: 150, defense: 80,  crystals: [50,120], exp: 800,  isBoss: true },
  flame_demon:    { id: 'flame_demon',    name: '烈焰魔',      icon: '🔥', hp: 2500, attack: 200, defense: 130, crystals: [80,200], exp: 1200, isBoss: true },
  frost_giant:    { id: 'frost_giant',    name: '寒霜巨人',    icon: '❄️', hp: 4000, attack: 280, defense: 200, crystals: [120,300],exp: 1800, isBoss: true },
  thunder_dragon: { id: 'thunder_dragon',name: '雷龙',        icon: '🐲', hp: 6000, attack: 380, defense: 280, crystals: [180,450],exp: 2500, isBoss: true },
  bone_lord:      { id: 'bone_lord',      name: '骨王',        icon: '💀', hp: 8000, attack: 450, defense: 350, crystals: [250,600],exp: 3500, isBoss: true },
  demon_king:     { id: 'demon_king',     name: '魔王',        icon: '👑', hp: 12000,attack: 600, defense: 480, crystals: [350,800],exp: 5000, isBoss: true },
  specter_lord:   { id: 'specter_lord',   name: '幽灵王',      icon: '👻', hp: 16000,attack: 750, defense: 600, crystals: [450,1000],exp: 6500,isBoss: true },
  chaos_overlord: { id: 'chaos_overlord',name: '混沌魔君',    icon: '🌀', hp: 22000,attack: 900, defense: 750, crystals: [600,1400],exp: 9000,isBoss: true },
  doom_overlord:  { id: 'doom_overlord',  name: '末日领主',    icon: '☠️', hp: 30000,attack: 1100,defense: 900, crystals: [800,2000],exp:12000,isBoss: true },
};

// 魔器图鉴
const DEMON_ARTIFACTS = {
  shadow_claw: {
    id: 'shadow_claw', name: '暗影之爪', icon: '🪝', type: 'weapon',
    stats: { attack: 50, critRate: 5 }, cost: 200,
    desc: '暗影凝聚的利爪，攻击附带暴击'
  },
  demon_shield: {
    id: 'demon_shield', name: '魔盾', icon: '🛡️', type: 'armor',
    stats: { defense: 40, hp: 200 }, cost: 200,
    desc: '魔兽鳞片打造的护盾'
  },
  crystal_ring: {
    id: 'crystal_ring', name: '魔晶戒指', icon: '💍', type: 'accessory',
    stats: { attack: 20, crystalGain: 10 }, cost: 150,
    desc: '增加魔晶获取量10%'
  },
  beast_eye: {
    id: 'beast_eye', name: '魔兽之眼', icon: '👁️', type: 'accessory',
    stats: { critDamage: 20, attack: 15 }, cost: 180,
    desc: '洞察敌人弱点，提升暴击伤害'
  },
  demon_horn: {
    id: 'demon_horn', name: '魔角', icon: '🦄', type: 'material',
    cost: 100, count: 1,
    desc: '炼制魔器的材料'
  },
  soul_flame: {
    id: 'soul_flame', name: '魂焰', icon: '🔥', type: 'material',
    cost: 120, count: 1,
    desc: '蕴含强大灵魂力量的火焰'
  },
  abyss_core: {
    id: 'abyss_core', name: '深渊核心', icon: '💠', type: 'material',
    cost: 300, count: 1,
    desc: '封魔渊深处的神秘晶石'
  },
  demon_sword: {
    id: 'demon_sword', name: '魔剑·炼狱', icon: '⚔️', type: 'weapon',
    stats: { attack: 150, critRate: 10, critDamage: 30 }, cost: 800,
    desc: '传说级魔剑，附带灵魂收割效果'
  },
  demon_armor: {
    id: 'demon_armor', name: '魔甲·不灭', icon: '🛡️', type: 'armor',
    stats: { defense: 120, hp: 800, reflect: 5 }, cost: 800,
    desc: '魔王级护甲，反射5%伤害'
  },
  demon_crown: {
    id: 'demon_crown', name: '魔冠·主宰', icon: '👑', type: 'accessory',
    stats: { attack: 80, defense: 60, crystalGain: 20 }, cost: 1200,
    desc: '魔君专属，攻防兼备，魔晶+20%'
  }
};

// 魔晶商店兑换
const CRYSTAL_SHOP = [
  { id: 'crystal_to_lingshi', name: '魔晶兑换灵石', icon: '💰', cost: 10, reward: { lingshi: 100 }, limit: -1 },
  { id: 'crystal_to_diamond', name: '魔晶兑换钻石', icon: '💎', cost: 100, reward: { diamonds: 10 }, limit: 50 },
  { id: 'demon_horn_box',     name: '魔角礼包',     icon: '📦', cost: 50,  reward: { demon_horn: 3 }, limit: 10 },
  { id: 'soul_flame_box',     name: '魂焰礼包',     icon: '🎁', cost: 80,  reward: { soul_flame: 2 }, limit: 10 },
  { id: 'abyss_core_box',     name: '深渊核心礼包', icon: '🎀', cost: 200, reward: { abyss_core: 1 }, limit: 5 },
  { id: 'shadow_claw',        name: '暗影之爪',     icon: '🪝', cost: 200, reward: { artifact: 'shadow_claw' }, limit: 1 },
  { id: 'demon_shield',       name: '魔盾',         icon: '🛡️', cost: 200, reward: { artifact: 'demon_shield' }, limit: 1 },
  { id: 'crystal_ring',       name: '魔晶戒指',     icon: '💍', cost: 150, reward: { artifact: 'crystal_ring' }, limit: 1 },
  { id: 'beast_eye',          name: '魔兽之眼',     icon: '👁️', cost: 180, reward: { artifact: 'beast_eye' }, limit: 1 },
  { id: 'demon_sword',        name: '魔剑·炼狱',   icon: '⚔️', cost: 800, reward: { artifact: 'demon_sword' }, limit: 1 },
  { id: 'demon_armor',        name: '魔甲·不灭',   icon: '🛡️', cost: 800, reward: { artifact: 'demon_armor' }, limit: 1 },
  { id: 'demon_crown',        name: '魔冠·主宰',   icon: '👑', cost: 1200, reward: { artifact: 'demon_crown' }, limit: 1 },
];

// =====================
// 辅助函数
// =====================

// 同步版本的玩家获取（仅用于只读场景，性能关键处用缓存）
const playerCache = new Map();
const CACHE_TTL = 5000; // 5秒缓存

function getCachedPlayer(userId) {
  const cached = playerCache.get(userId);
  if (cached && (Date.now() - cached.ts) < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedPlayer(userId, data) {
  playerCache.set(userId, { data, ts: Date.now() });
}

function invalidateCache(userId) {
  playerCache.delete(userId);
}

function dropCrystalsByFloor(floor) {
  const cfg = FLOOR_CONFIG[floor - 1];
  if (!cfg || !cfg.crystals) return floor * 15;
  const [min, max] = cfg.crystals;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function dropCrystals(demon) {
  const [min, max] = demon.crystals;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function simpleBattle(playerAtk, playerDef, playerHp, demon) {
  let remainingDemonHp = demon.hp;
  let remainingPlayerHp = playerHp;
  let round = 0;
  
  while (remainingDemonHp > 0 && remainingPlayerHp > 0 && round < 50) {
    round++;
    const playerDmg = Math.max(1, playerAtk - demon.defense);
    remainingDemonHp -= playerDmg;
    if (remainingDemonHp <= 0) break;
    
    const demonDmg = Math.max(1, demon.attack - playerDef);
    remainingPlayerHp -= demonDmg;
  }
  
  return {
    win: remainingDemonHp <= 0,
    playerHp: remainingPlayerHp,
    demonHp: remainingDemonHp,
    rounds: round
  };
}

// 计算扫荡奖励（固定值，不触发战斗）
function calcSweepReward(floor) {
  const cfg = FLOOR_CONFIG[floor - 1];
  if (!cfg) return { crystals: 0, exp: 0 };
  
  // 扫荡奖励 = 该层怪物总魔晶 * 0.8（略低于手动通关）
  let totalCrystals = 0;
  let totalExp = 0;
  
  for (const demonType of cfg.demonTypes) {
    const demon = DEMON_BESTIARY[demonType];
    if (demon) {
      const avg = Math.floor((demon.crystals[0] + demon.crystals[1]) / 2);
      totalCrystals += avg;
      totalExp += demon.exp;
    }
  }
  
  const boss = DEMON_BESTIARY[cfg.boss];
  if (boss) {
    const avg = Math.floor((boss.crystals[0] + boss.crystals[1]) / 2);
    totalCrystals += avg;
    totalExp += boss.exp;
  }
  
  return {
    crystals: Math.floor(totalCrystals * 0.8),
    exp: Math.floor(totalExp * 0.8)
  };
}

// =====================
// 路由接口
// =====================

// GET /config - 获取封魔渊完整配置（兼容前端 loadConfig）
router.get('/config', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.json({ success: false, message: 'userId 不能为空' });
  
  try {
    const player = await storage.getOrCreatePlayer(userId);
    setCachedPlayer(userId, player);
    
    const dungeons = FLOOR_CONFIG.map(f => {
      const difficulty = f.floor <= 3 ? 'normal' : f.floor <= 6 ? 'hard' : 'nightmare';
      const [cMin, cMax] = f.crystals || [f.floor * 20, f.floor * 30];
      return {
        id: `abyss_floor_${f.floor}`,
        name: f.name,
        floor: f.floor,
        difficulty,
        difficultyLabel: f.floor <= 3 ? '普通' : f.floor <= 6 ? '困难' : '噩梦',
        reqLevel: f.reqLevel,
        energy: f.energy,
        rewardPreview: { crystals: [cMin, cMax], exp: f.floor * 50 },
        maxProgress: player.maxFloor >= f.floor,
        currentProgress: player.currentFloor >= f.floor,
        bossName: DEMON_BESTIARY[f.boss]?.name || f.boss,
        bossIcon: DEMON_BESTIARY[f.boss]?.icon || '👹'
      };
    });
    
    res.json({
      success: true,
      dungeons,
      crystals: player.crystals,
      currentFloor: player.currentFloor,
      maxFloor: player.maxFloor,
      todayEnterCount: player.todayEnterCount,
      todaySweepCount: player.todaySweepCount || 0,
      weeklyKillCount: player.weeklyKillCount,
      weeklyCrystals: player.weeklyCrystals
    });
  } catch (err) {
    console.error('abyss /config error:', err);
    res.json({ success: false, message: '服务器错误' });
  }
});

// GET /list - 获取封魔渊副本列表
router.get('/list', async (req, res) => {
  const { userId } = req.query;
  try {
    const player = getCachedPlayer(userId) || await storage.getOrCreatePlayer(userId);
    const dungeons = FLOOR_CONFIG.map(f => {
      const difficulty = f.floor <= 3 ? 'normal' : f.floor <= 6 ? 'hard' : 'nightmare';
      return {
        id: `abyss_floor_${f.floor}`,
        name: f.name,
        floor: f.floor,
        difficulty,
        difficultyLabel: f.floor <= 3 ? '普通' : f.floor <= 6 ? '困难' : '噩梦',
        reqLevel: f.reqLevel,
        energy: f.energy,
        maxProgress: player.maxFloor >= f.floor,
        crystals: f.crystals
      };
    });
    res.json({ success: true, dungeons });
  } catch (err) {
    res.json({ success: false, message: '服务器错误' });
  }
});

router.get('/info', async (req, res) => {
  const { userId } = req.query;
  try {
    const player = await storage.getOrCreatePlayer(userId);
    setCachedPlayer(userId, player);
    const floorConfig = FLOOR_CONFIG[player.currentFloor - 1] || FLOOR_CONFIG[0];
    
    res.json({
      currentFloor: player.currentFloor,
      maxFloor: player.maxFloor,
      crystals: player.crystals,
      totalCrystals: player.totalCrystals,
      artifacts: player.artifacts,
      materials: player.materials,
      todayEnterCount: player.todayEnterCount,
      todaySweepCount: player.todaySweepCount || 0,
      sweptFloorsToday: player.sweptFloorsToday || [],
      weeklyKillCount: player.weeklyKillCount,
      weeklyCrystals: player.weeklyCrystals,
      weeklyRewardClaimed: player.weeklyRewardClaimed,
      floorName: floorConfig.name,
      energyCost: floorConfig.energy
    });
  } catch (err) {
    res.json({ success: false, message: '服务器错误' });
  }
});

router.get('/floors', async (req, res) => {
  const { userId } = req.query;
  try {
    const player = getCachedPlayer(userId) || await storage.getOrCreatePlayer(userId);
    const floors = FLOOR_CONFIG.map(f => ({
      floor: f.floor,
      name: f.name,
      reqLevel: f.reqLevel,
      energy: f.energy,
      crystals: f.crystals,
      unlocked: f.floor <= player.maxFloor,
      swept: (player.sweptFloorsToday || []).includes(f.floor)
    }));
    res.json({ success: true, floors });
  } catch (err) {
    res.json({ success: false, message: '服务器错误' });
  }
});

router.get('/bestiary', (req, res) => {
  const bestiary = Object.values(DEMON_BESTIARY).map(d => ({
    id: d.id, name: d.name, icon: d.icon,
    hp: d.hp, attack: d.attack, defense: d.defense,
    crystals: d.crystals, exp: d.exp, isBoss: d.isBoss || false
  }));
  res.json(bestiary);
});

router.post('/enter', async (req, res) => {
  const { userId, floor, playerLevel, playerAtk, playerDef, playerHp, energy, dungeonId } = req.body;
  
  let targetFloor = floor;
  if (!targetFloor && dungeonId && dungeonId.startsWith('abyss_floor_')) {
    targetFloor = parseInt(dungeonId.replace('abyss_floor_', ''));
  }
  if (!targetFloor || targetFloor < 1) return res.json({ success: false, message: '无效的层数' });
  
  try {
    const player = await storage.getOrCreatePlayer(userId);
    const floorConfig = FLOOR_CONFIG[targetFloor - 1];
    
    if (!floorConfig) return res.json({ success: false, message: '无效的层数' });
    if (targetFloor > player.maxFloor + 1) return res.json({ success: false, message: '该层尚未解锁' });
    if (playerLevel < floorConfig.reqLevel) return res.json({ success: false, message: `需要${floorConfig.reqLevel}级才能进入` });
    if ((energy || 0) < floorConfig.energy) return res.json({ success: false, message: `体力不足，需要${floorConfig.energy}体力` });
    if (player.todayEnterCount >= 10) return res.json({ success: false, message: '今日进入次数用完，明日再来' });
    
    // 更新玩家数据
    player.currentFloor = targetFloor;
    player.todayEnterCount += 1;
    await storage.savePlayer(userId, player);
    setCachedPlayer(userId, player);
    
    const sessionId = `abyss_${targetFloor}_${Date.now()}`;
    const encounters = floorConfig.demonTypes.map((type, i) => ({
      ...DEMON_BESTIARY[type], uid: `m${i}`, defeated: false, currentHp: DEMON_BESTIARY[type].hp
    }));
    encounters.push({
      ...DEMON_BESTIARY[floorConfig.boss], uid: 'boss', isBoss: true,
      defeated: false, currentHp: DEMON_BESTIARY[floorConfig.boss].hp
    });
    
    res.json({
      success: true,
      session: { sessionId, dungeonId: dungeonId || `abyss_floor_${targetFloor}`, currentLayer: targetFloor, encounters },
      energySpent: floorConfig.energy,
      encounters,
      message: `进入${floorConfig.name}，遭遇${encounters.length}只魔兽`
    });
  } catch (err) {
    console.error('abyss /enter error:', err);
    res.json({ success: false, message: '服务器错误' });
  }
});

router.post('/battle', async (req, res) => {
  const { userId, demonId, playerAtk, playerDef, playerHp, playerLevel,
          playerDamage, playerDefense, sessionId, encounterIndex } = req.body;
  
  const demon = DEMON_BESTIARY[demonId];
  if (!demon) return res.json({ success: false, message: '不存在的魔兽' });
  
  try {
    const player = await storage.getOrCreatePlayer(userId);
    
    const finalAtk = playerAtk || playerDamage || 100;
    const finalDef = playerDef || playerDefense || 50;
    const finalLevel = playerLevel || 1;
    const finalHp = playerHp || 1000;
    
    const levelBonus = 1 + (finalLevel - 1) * 0.05;
    const finalPlayerAtk = Math.floor(finalAtk * levelBonus);
    const finalPlayerDef = Math.floor(finalDef * levelBonus);
    
    const result = simpleBattle(finalPlayerAtk, finalPlayerDef, finalHp, demon);
    const rewards = {
      exp: result.win ? demon.exp : 0,
      crystals: result.win ? dropCrystals(demon) : 0
    };
    
    if (result.win) {
      player.totalKillCount++;
      player.weeklyKillCount++;
      player.totalCrystals += rewards.crystals;
      player.crystals += rewards.crystals;
      player.weeklyCrystals += rewards.crystals;
      await storage.savePlayer(userId, player);
      setCachedPlayer(userId, player);
    }
    
    res.json({
      success: true,
      battleResult: {
        victory: result.win,
        damageDealt: Math.max(0, demon.hp - result.demonHp),
        playerHpLeft: result.playerHp,
        demonHpLeft: result.demonHp,
        rounds: result.rounds,
        rewards
      },
      win: result.win,
      playerHpLeft: result.playerHp,
      demonHpLeft: result.demonHp,
      rounds: result.rounds,
      rewards,
      totalCrystals: player.crystals,
      totalKills: player.totalKillCount
    });
  } catch (err) {
    console.error('abyss /battle error:', err);
    res.json({ success: false, message: '服务器错误' });
  }
});

router.post('/explore', async (req, res) => {
  const { userId, floor, playerLevel, playerAtk, playerDef, playerHp, energy } = req.body;
  
  try {
    const player = await storage.getOrCreatePlayer(userId);
    const floorConfig = FLOOR_CONFIG[floor - 1];
    
    if (!floorConfig) return res.json({ success: false, message: '无效的层数' });
    if (floor > player.maxFloor + 1) return res.json({ success: false, message: '该层尚未解锁' });
    if ((playerLevel || 1) < floorConfig.reqLevel) return res.json({ success: false, message: `需要${floorConfig.reqLevel}级` });
    if ((energy || 0) < floorConfig.energy) return res.json({ success: false, message: `体力不足，需要${floorConfig.energy}体力` });
    if (player.todayEnterCount >= 10) return res.json({ success: false, message: '今日已进入次数用完' });
    
    player.todayEnterCount += 1;
    
    const levelBonus = 1 + ((playerLevel || 1) - 1) * 0.05;
    const finalAtk = Math.floor((playerAtk || 100) * levelBonus);
    const finalDef = Math.floor((playerDef || 50) * levelBonus);
    const hp = playerHp || 1000;
    
    let totalCrystals = 0;
    let totalExp = 0;
    let battles = [];
    let floorCleared = true;
    
    for (const demonType of floorConfig.demonTypes) {
      const demon = DEMON_BESTIARY[demonType];
      const result = simpleBattle(finalAtk, finalDef, hp, demon);
      if (!result.win) { floorCleared = false; break; }
      const crystals = dropCrystals(demon);
      totalCrystals += crystals;
      totalExp += demon.exp;
      battles.push({ demon: demon.name, win: true, crystals, exp: demon.exp });
    }
    
    if (floorCleared) {
      const boss = DEMON_BESTIARY[floorConfig.boss];
      const result = simpleBattle(finalAtk, finalDef, hp, boss);
      if (!result.win) {
        floorCleared = false;
      } else {
        const crystals = dropCrystals(boss);
        totalCrystals += crystals;
        totalExp += boss.exp;
        battles.push({ demon: boss.name, win: true, crystals, exp: boss.exp, isBoss: true });
      }
    }
    
    player.totalKillCount += battles.length;
    player.weeklyKillCount += battles.length;
    player.totalCrystals += totalCrystals;
    player.crystals += totalCrystals;
    player.weeklyCrystals += totalCrystals;
    
    let unlockNext = false;
    if (floorCleared && floor >= player.maxFloor) {
      const nextFloor = floor + 1;
      player.maxFloor = nextFloor;
      await storage.unlockFloor(userId, nextFloor);
      unlockNext = true;
    }
    
    await storage.savePlayer(userId, player);
    setCachedPlayer(userId, player);
    
    res.json({
      success: true,
      energySpent: floorConfig.energy,
      floorCleared,
      battles,
      totalCrystals,
      totalExp,
      crystals: player.crystals,
      maxFloor: player.maxFloor,
      unlockNext,
      nextFloorName: FLOOR_CONFIG[floor] ? FLOOR_CONFIG[floor].name : '已达顶层'
    });
  } catch (err) {
    console.error('abyss /explore error:', err);
    res.json({ success: false, message: '服务器错误' });
  }
});

router.get('/shop', async (req, res) => {
  const { userId } = req.query;
  try {
    const player = await storage.getOrCreatePlayer(userId);
    setCachedPlayer(userId, player);
    
    const shopItems = CRYSTAL_SHOP.map(item => {
      let canBuy = true;
      let reason = '';
      if (item.limit > 0) {
        const playerKey = `shop_${item.id}`;
        const purchased = (player[playerKey] || 0);
        if (purchased >= item.limit) { canBuy = false; reason = '已达购买上限'; }
      }
      if (item.reward && item.reward.artifact) {
        if (player.artifacts.includes(item.reward.artifact)) { canBuy = false; reason = '已拥有该魔器'; }
      }
      return { ...item, canBuy, reason: canBuy ? '' : reason };
    });
    
    res.json({ crystals: player.crystals, items: shopItems });
  } catch (err) {
    res.json({ success: false, message: '服务器错误' });
  }
});

router.post('/shop/buy', async (req, res) => {
  const { userId, itemId } = req.body;
  const item = CRYSTAL_SHOP.find(i => i.id === itemId);
  if (!item) return res.json({ success: false, message: '商品不存在' });
  
  try {
    const player = await storage.getOrCreatePlayer(userId);
    
    if (player.crystals < item.cost) return res.json({ success: false, message: '魔晶不足' });
    
    if (item.limit > 0) {
      const playerKey = `shop_${item.id}`;
      if ((player[playerKey] || 0) >= item.limit) return res.json({ success: false, message: '已达购买上限' });
    }
    if (item.reward && item.reward.artifact) {
      if (player.artifacts.includes(item.reward.artifact)) return res.json({ success: false, message: '已拥有该魔器' });
    }
    
    // 消耗魔晶
    const result = await storage.spendCrystals(userId, item.cost);
    if (!result) return res.json({ success: false, message: '魔晶不足' });
    
    // 记录购买次数
    const rewardKey = `shop_${item.id}`;
    player[rewardKey] = (player[rewardKey] || 0) + 1;
    
    //发放奖励
    let rewardDesc = '';
    const reward = { ...item.reward };
    if (reward.artifact) {
      player.artifacts.push(reward.artifact);
      const artifactInfo = DEMON_ARTIFACTS[reward.artifact];
      rewardDesc = `${artifactInfo.icon}${artifactInfo.name}`;
    } else if (reward.demon_horn) {
      player.materials.demon_horn = (player.materials.demon_horn || 0) + reward.demon_horn;
      rewardDesc = `魔角×${reward.demon_horn}`;
    } else if (reward.soul_flame) {
      player.materials.soul_flame = (player.materials.soul_flame || 0) + reward.soul_flame;
      rewardDesc = `魂焰×${reward.soul_flame}`;
    } else if (reward.abyss_core) {
      player.materials.abyss_core = (player.materials.abyss_core || 0) + reward.abyss_core;
      rewardDesc = `深渊核心×${reward.abyss_core}`;
    } else if (reward.lingshi) {
      rewardDesc = `灵石×${reward.lingshi}`;
    } else if (reward.diamonds) {
      rewardDesc = `钻石×${reward.diamonds}`;
    }
    
    await storage.savePlayer(userId, player);
    setCachedPlayer(userId, player);
    
    res.json({
      success: true,
      crystals: Number(result.crystals),
      reward: reward,
      rewardDesc,
      message: `消耗${item.cost}魔晶，获得${rewardDesc}`
    });
  } catch (err) {
    console.error('abyss /shop/buy error:', err);
    res.json({ success: false, message: '服务器错误' });
  }
});

router.get('/artifacts', async (req, res) => {
  const { userId } = req.query;
  try {
    const player = await storage.getOrCreatePlayer(userId);
    setCachedPlayer(userId, player);
    const artifacts = Object.values(DEMON_ARTIFACTS).map(a => ({
      ...a, owned: player.artifacts.includes(a.id)
    }));
    res.json({ artifacts, ownedArtifacts: player.artifacts });
  } catch (err) {
    res.json({ success: false, message: '服务器错误' });
  }
});

router.get('/materials', async (req, res) => {
  const { userId } = req.query;
  try {
    const player = await storage.getOrCreatePlayer(userId);
    setCachedPlayer(userId, player);
    res.json({ materials: player.materials, crystals: player.crystals });
  } catch (err) {
    res.json({ success: false, message: '服务器错误' });
  }
});

router.get('/rankings', async (req, res) => {
  const { type } = req.query;
  try {
    // 从数据库获取所有玩家数据用于排行
    const { AbyssPlayer } = require('../abyss_storage');
    await require('../abyss_storage').initDatabase();
    const players = await AbyssPlayer.findAll({ raw: true });
    
    let sorted;
    if (type === 'kills') {
      sorted = players.sort((a, b) => (b.weeklyKillCount || 0) - (a.weeklyKillCount || 0));
    } else if (type === 'crystals') {
      sorted = players.sort((a, b) => Number(b.weeklyCrystals || 0) - Number(a.weeklyCrystals || 0));
    } else {
      sorted = players.sort((a, b) => (b.maxFloor || 0) - (a.maxFloor || 0));
    }
    
    const rankings = sorted.slice(0, 50).map((p, i) => ({
      rank: i + 1,
      userId: p.userId,
      weeklyKills: p.weeklyKillCount || 0,
      weeklyCrystals: Number(p.weeklyCrystals || 0),
      maxFloor: p.maxFloor || 1
    }));
    res.json(rankings);
  } catch (err) {
    console.error('rankings error:', err);
    res.json([]);
  }
});

router.get('/weekly-reward', async (req, res) => {
  const { userId } = req.query;
  try {
    const player = await storage.getOrCreatePlayer(userId);
    setCachedPlayer(userId, player);
    const rewards = [
      { minKills: 10,  minCrystals: 100,  reward: { lingshi: 500 } },
      { minKills: 30,  minCrystals: 300,  reward: { lingshi: 1000, diamonds: 20 } },
      { minKills: 50,  minCrystals: 500,  reward: { lingshi: 2000, diamonds: 50 } },
      { minKills: 100, minCrystals: 1000, reward: { lingshi: 5000, diamonds: 100, artifact: 'demon_crown' } }
    ];
    const qualified = rewards.filter(r =>
      player.weeklyKillCount >= r.minKills && Number(player.weeklyCrystals) >= r.minCrystals
    );
    let nextReward = null;
    for (const r of rewards) {
      if (player.weeklyKillCount < r.minKills || Number(player.weeklyCrystals) < r.minCrystals) {
        nextReward = r; break;
      }
    }
    res.json({
      weeklyKillCount: player.weeklyKillCount,
      weeklyCrystals: Number(player.weeklyCrystals),
      weeklyRewardClaimed: player.weeklyRewardClaimed,
      qualifiedRewards: qualified,
      nextReward
    });
  } catch (err) {
    res.json({ success: false, message: '服务器错误' });
  }
});

router.post('/weekly-reward/claim', async (req, res) => {
  const { userId, rewardLevel } = req.body;
  try {
    const player = await storage.getOrCreatePlayer(userId);
    const rewards = [
      { minKills: 10,  minCrystals: 100,  reward: { lingshi: 500 }, level: 0 },
      { minKills: 30,  minCrystals: 300,  reward: { lingshi: 1000, diamonds: 20 }, level: 1 },
      { minKills: 50,  minCrystals: 500,  reward: { lingshi: 2000, diamonds: 50 }, level: 2 },
      { minKills: 100, minCrystals: 1000, reward: { lingshi: 5000, diamonds: 100, artifact: 'demon_crown' }, level: 3 }
    ];
    const targetReward = rewards[rewardLevel];
    if (!targetReward) return res.json({ success: false, message: '无效奖励档位' });
    if (player.weeklyKillCount < targetReward.minKills || Number(player.weeklyCrystals) < targetReward.minCrystals) {
      return res.json({ success: false, message: '未满足领取条件' });
    }
    if (player.weeklyRewardClaimed) return res.json({ success: false, message: '本周奖励已领取' });
    if (targetReward.reward.artifact && player.artifacts.includes(targetReward.reward.artifact)) {
      return res.json({ success: false, message: '已拥有该魔器' });
    }
    player.weeklyRewardClaimed = true;
    let rewardDesc = '';
    if (targetReward.reward.artifact) {
      player.artifacts.push(targetReward.reward.artifact);
      const artifactInfo = DEMON_ARTIFACTS[targetReward.reward.artifact];
      rewardDesc = artifactInfo.name;
    }
    await storage.savePlayer(userId, player);
    setCachedPlayer(userId, player);
    res.json({ success: true, reward: targetReward.reward, rewardDesc });
  } catch (err) {
    console.error('weekly-reward/claim error:', err);
    res.json({ success: false, message: '服务器错误' });
  }
});

// =====================
// 额外路由：nextLayer / claim / defeat / starRift / sweep
// =====================

// POST /nextLayer - 进入下一层
router.post('/nextLayer', async (req, res) => {
  const { userId, currentLayer, playerLevel, playerAtk, playerDef, playerHp, energy } = req.body;
  const nextFloor = currentLayer + 1;
  const floorConfig = FLOOR_CONFIG[nextFloor - 1];
  
  if (!floorConfig) return res.json({ success: false, message: '已达到最高层' });
  
  try {
    const player = await storage.getOrCreatePlayer(userId);
    
    if (nextFloor > player.maxFloor + 1) return res.json({ success: false, message: '该层尚未解锁，请先通关当前层' });
    if ((playerLevel || 1) < floorConfig.reqLevel) return res.json({ success: false, message: `需要${floorConfig.reqLevel}级才能进入` });
    if ((energy || 0) < floorConfig.energy) return res.json({ success: false, message: `体力不足，需要${floorConfig.energy}体力` });
    if (player.todayEnterCount >= 10) return res.json({ success: false, message: '今日进入次数用完，明日再来' });
    
    player.currentFloor = nextFloor;
    player.todayEnterCount += 1;
    await storage.savePlayer(userId, player);
    setCachedPlayer(userId, player);
    
    const encounters = floorConfig.demonTypes.map((type, i) => ({
      ...DEMON_BESTIARY[type], uid: `m${i}`, defeated: false, currentHp: DEMON_BESTIARY[type].hp
    }));
    encounters.push({
      ...DEMON_BESTIARY[floorConfig.boss], uid: 'boss', isBoss: true,
      defeated: false, currentHp: DEMON_BESTIARY[floorConfig.boss].hp
    });
    
    res.json({
      success: true,
      layer: nextFloor,
      floorName: floorConfig.name,
      energySpent: floorConfig.energy,
      encounters,
      message: `进入${floorConfig.name}，遭遇${encounters.length}只魔兽`
    });
  } catch (err) {
    console.error('abyss /nextLayer error:', err);
    res.json({ success: false, message: '服务器错误' });
  }
});

// POST /claim - 领取层通关奖励
router.post('/claim', async (req, res) => {
  const { userId, layer, playerLevel } = req.body;
  try {
    const player = await storage.getOrCreatePlayer(userId);
    
    if (layer !== player.currentFloor) return res.json({ success: false, message: '当前不在该层' });
    
    const cfg = FLOOR_CONFIG[layer - 1];
    if (!cfg) return res.json({ success: false, message: '无效层数' });
    
    // 奖励：通关该层稳定获得魔晶
    const [cMin, cMax] = cfg.crystals || [layer * 20, layer * 30];
    const baseCrystals = Math.floor((cMin + cMax) / 2);
    const expReward = layer * 50;
    
    // 增加魔晶（可能已通关，这里累加）
    const addResult = await storage.addCrystals(userId, baseCrystals);
    
    // 解锁下一层（如果需要）
    let unlocked = false;
    if (player.maxFloor < layer + 1) {
      await storage.unlockFloor(userId, layer + 1);
      player.maxFloor = layer + 1;
      unlocked = true;
    }
    
    // 更新击杀数（通关 = 3只小怪 + 1只boss = 4）
    player.totalKillCount += 4;
    player.weeklyKillCount += 4;
    await storage.savePlayer(userId, player);
    setCachedPlayer(userId, player);
    
    res.json({
      success: true,
      session: null,
      rewards: {
        crystals: baseCrystals,
        exp: expReward
      },
      crystals: addResult ? Number(addResult.crystals) : player.crystals,
      maxFloor: player.maxFloor,
      unlocked,
      message: `通关第${layer}层，获得魔晶×${baseCrystals}，经验×${expReward}${unlocked ? '，解锁第' + (layer + 1) + '层！' : ''}`
    });
  } catch (err) {
    console.error('abyss /claim error:', err);
    res.json({ success: false, message: '服务器错误' });
  }
});

// POST /defeat - 放弃当前层
router.post('/defeat', async (req, res) => {
  const { userId, defeatLayer } = req.body;
  try {
    const player = await storage.getOrCreatePlayer(userId);
    const resetFloor = Math.min(player.currentFloor, player.maxFloor);
    player.currentFloor = resetFloor;
    await storage.savePlayer(userId, player);
    setCachedPlayer(userId, player);
    res.json({ success: true, currentFloor: resetFloor, message: `已退出第${defeatLayer}层` });
  } catch (err) {
    res.json({ success: false, message: '服务器错误' });
  }
});

// 星渊裂缝
router.get('/starRift', async (req, res) => {
  const { userId } = req.query;
  try {
    const player = getCachedPlayer(userId) || await storage.getOrCreatePlayer(userId);
    const floors = FLOOR_CONFIG.map(f => ({
      floor: f.floor,
      name: f.name,
      reqLevel: f.reqLevel,
      energy: f.energy,
      crystals: f.crystals,
      available: f.floor <= player.maxFloor
    }));
    res.json({ success: true, floors, message: '星渊裂缝可直达任意已解锁层' });
  } catch (err) {
    res.json({ success: false, message: '服务器错误' });
  }
});

router.post('/starRift/enter', async (req, res) => {
  const { userId, floor, playerLevel, playerAtk, playerDef, playerHp, energy } = req.body;
  try {
    const player = await storage.getOrCreatePlayer(userId);
    const floorConfig = FLOOR_CONFIG[floor - 1];
    
    if (!floorConfig) return res.json({ success: false, message: '无效的层数' });
    if (floor > player.maxFloor) return res.json({ success: false, message: '该层尚未通关，请先通关后再使用星渊裂缝' });
    if ((playerLevel || 1) < floorConfig.reqLevel) return res.json({ success: false, message: `需要${floorConfig.reqLevel}级才能使用` });
    if ((energy || 0) < floorConfig.energy) return res.json({ success: false, message: `体力不足，需要${floorConfig.energy}体力` });
    if (player.todayEnterCount >= 10) return res.json({ success: false, message: '今日进入次数用完' });
    
    player.currentFloor = floor;
    player.todayEnterCount += 1;
    await storage.savePlayer(userId, player);
    setCachedPlayer(userId, player);
    
    const encounters = floorConfig.demonTypes.map((type, i) => ({
      ...DEMON_BESTIARY[type], uid: `m${i}`, defeated: false, currentHp: DEMON_BESTIARY[type].hp
    }));
    encounters.push({
      ...DEMON_BESTIARY[floorConfig.boss], uid: 'boss', isBoss: true,
      defeated: false, currentHp: DEMON_BESTIARY[floorConfig.boss].hp
    });
    
    res.json({
      success: true,
      session: {
        dungeonId: `abyss_${floor}_${Date.now()}`,
        currentLayer: floor,
        encounters
      },
      encounters,
      message: `通过星渊裂缝进入${floorConfig.name}`
    });
  } catch (err) {
    console.error('abyss /starRift/enter error:', err);
    res.json({ success: false, message: '服务器错误' });
  }
});

// =====================
// 扫荡功能
// =====================

// GET /sweep - 获取扫荡信息（可扫荡层、已扫荡层）
router.get('/sweep', async (req, res) => {
  const { userId } = req.query;
  try {
    const player = await storage.getOrCreatePlayer(userId);
    setCachedPlayer(userId, player);
    
    // 可扫荡层 = 已通关的最高层 - 1（至少第1层可扫荡），但不超过今天已扫荡
    const maxSweepable = Math.max(1, player.maxFloor - 1);
    const availableFloors = [];
    for (let f = 1; f <= maxSweepable; f++) {
      if (!(player.sweptFloorsToday || []).includes(f)) {
        const cfg = FLOOR_CONFIG[f - 1];
        const reward = calcSweepReward(f);
        availableFloors.push({
          floor: f,
          name: cfg.name,
          crystals: reward.crystals,
          exp: reward.exp
        });
      }
    }
    
    const sweptFloors = (player.sweptFloorsToday || []).map(f => ({
      floor: f,
      name: FLOOR_CONFIG[f - 1]?.name || `第${f}层`
    }));
    
    res.json({
      success: true,
      todaySweepCount: player.todaySweepCount || 0,
      maxSweepable,
      availableFloors,
      sweptFloors,
      message: `今日已扫荡${player.todaySweepCount || 0}次，最多可扫荡${maxSweepable}层`
    });
  } catch (err) {
    console.error('abyss /sweep error:', err);
    res.json({ success: false, message: '服务器错误' });
  }
});

// POST /sweep - 单层扫荡
router.post('/sweep', async (req, res) => {
  const { userId, floor } = req.body;
  if (!floor || floor < 1) return res.json({ success: false, message: '无效层数' });
  
  try {
    const player = await storage.getOrCreatePlayer(userId);
    
    // 验证：必须已通关该层（maxFloor > floor），才能扫荡
    if (floor >= player.maxFloor) {
      return res.json({ success: false, message: '该层尚未通关，无法扫荡' });
    }
    
    // 验证：今日尚未扫荡过该层
    if ((player.sweptFloorsToday || []).includes(floor)) {
      return res.json({ success: false, message: '该层今日已扫荡，明日再来' });
    }
    
    // 验证：已达今日扫荡上限（3次）
    const MAX_SWEEP_PER_DAY = 3;
    if ((player.todaySweepCount || 0) >= MAX_SWEEP_PER_DAY) {
      return res.json({ success: false, message: `今日扫荡次数已用完（${MAX_SWEEP_PER_DAY}次/日），明日再来` });
    }
    
    const reward = calcSweepReward(floor);
    const cfg = FLOOR_CONFIG[floor - 1];
    
    // 发放奖励
    await storage.addCrystals(userId, reward.crystals);
    await storage.recordSweep(userId, floor, reward.crystals, reward.exp);
    
    // 刷新缓存
    const updated = await storage.getOrCreatePlayer(userId);
    setCachedPlayer(userId, updated);
    
    res.json({
      success: true,
      floor,
      floorName: cfg.name,
      rewards: reward,
      todaySweepCount: updated.todaySweepCount,
      crystals: updated.crystals,
      sweptFloorsToday: updated.sweptFloorsToday,
      message: `扫荡第${floor}层「${cfg.name}」成功，获得魔晶×${reward.crystals}，经验×${reward.exp}`
    });
  } catch (err) {
    console.error('abyss /sweep POST error:', err);
    res.json({ success: false, message: '服务器错误' });
  }
});

// POST /sweep/batch - 批量扫荡（扫荡到指定最高层）
router.post('/sweep/batch', async (req, res) => {
  const { userId, maxFloor } = req.body;
  if (!maxFloor || maxFloor < 1) return res.json({ success: false, message: '无效层数' });
  
  try {
    const player = await storage.getOrCreatePlayer(userId);
    
    const sweepableMax = Math.max(1, player.maxFloor - 1);
    const actualMax = Math.min(maxFloor, sweepableMax);
    const alreadySwept = player.sweptFloorsToday || [];
    
    // 找出还未扫荡的层
    const toSweep = [];
    for (let f = 1; f <= actualMax; f++) {
      if (!alreadySwept.includes(f)) toSweep.push(f);
    }
    
    const MAX_SWEEP_PER_DAY = 3;
    const remainingSweep = MAX_SWEEP_PER_DAY - (player.todaySweepCount || 0);
    if (remainingSweep <= 0) {
      return res.json({ success: false, message: `今日扫荡次数已用完（${MAX_SWEEP_PER_DAY}次/日），明日再来` });
    }
    
    const toSweepActual = toSweep.slice(0, remainingSweep);
    
    if (toSweepActual.length === 0) {
      return res.json({ success: false, message: '无可扫荡的层（均已扫荡或无法扫荡）' });
    }
    
    // 计算总奖励
    let totalCrystals = 0;
    let totalExp = 0;
    const results = [];
    
    for (const floor of toSweepActual) {
      const reward = calcSweepReward(floor);
      totalCrystals += reward.crystals;
      totalExp += reward.exp;
      results.push({ floor, reward });
    }
    
    // 发放奖励并记录
    if (totalCrystals > 0) {
      await storage.addCrystals(userId, totalCrystals);
    }
    for (const { floor, reward } of results) {
      await storage.recordSweep(userId, floor, reward.crystals, reward.exp);
    }
    
    const updated = await storage.getOrCreatePlayer(userId);
    setCachedPlayer(userId, updated);
    
    const sweptNames = toSweepActual.map(f => FLOOR_CONFIG[f - 1]?.name || `第${f}层`).join('、');
    
    res.json({
      success: true,
      floorsSwept: toSweepActual,
      floorsSweepNames: sweptNames,
      totalCrystals,
      totalExp,
      todaySweepCount: updated.todaySweepCount,
      crystals: updated.crystals,
      sweptFloorsToday: updated.sweptFloorsToday,
      skippedFloors: toSweep.length - toSweepActual.length,
      message: `批量扫荡${toSweepActual.length}层（${sweptNames}），获得魔晶×${totalCrystals}，经验×${totalExp}`
    });
  } catch (err) {
    console.error('abyss /sweep/batch error:', err);
    res.json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
