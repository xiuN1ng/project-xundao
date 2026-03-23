const express = require('express');
const router = express.Router();

// =====================
// 封魔渊数据存储
// =====================

// 封魔渊全局数据
const abyssData = {
  // 每周重置
  weeklyReset: Date.now(),
  
  // 玩家数据 map: userId -> playerAbyssData
  players: {},
  
  // 全服排行榜
  rankings: [],
  
  // 击杀排行榜（每周）
  killRankings: []
};

// 封魔渊层配置
const FLOOR_CONFIG = [
  { floor: 1,  name: '封印入口',     reqLevel: 1,   energy: 10, demonTypes: ['shadow_rat', 'ghost_wolf'], boss: 'shadow_beast' },
  { floor: 2,  name: '封印一层',     reqLevel: 5,   energy: 15, demonTypes: ['ghost_wolf', 'poison_spider'], boss: 'abyss_scorpion' },
  { floor: 3,  name: '封印二层',     reqLevel: 10,  energy: 20, demonTypes: ['poison_spider', 'flame_imp'], boss: 'flame_demon' },
  { floor: 4,  name: '封印三层',     reqLevel: 15,  energy: 25, demonTypes: ['flame_imp', 'frost_wraith'], boss: 'frost_giant' },
  { floor: 5,  name: '封印四层',     reqLevel: 20,  energy: 30, demonTypes: ['frost_wraith', 'thunder_beast'], boss: 'thunder_dragon' },
  { floor: 6,  name: '封印五层',     reqLevel: 25,  energy: 35, demonTypes: ['thunder_beast', 'bone_golem'], boss: 'bone_lord' },
  { floor: 7,  name: '封印六层',     reqLevel: 30,  energy: 40, demonTypes: ['bone_golem', 'demon_knight'], boss: 'demon_king' },
  { floor: 8,  name: '封印七层',     reqLevel: 35,  energy: 45, demonTypes: ['demon_knight', 'abyss_specter'], boss: 'specter_lord' },
  { floor: 9,  name: '封印八层',     reqLevel: 40,  energy: 50, demonTypes: ['abyss_specter', 'chaos_beast'], boss: 'chaos_overlord' },
  { floor: 10, name: '封魔渊深处',   reqLevel: 50,  energy: 60, demonTypes: ['chaos_beast', 'doom_dragon'], boss: 'doom_overlord' },
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

function getOrCreatePlayer(userId) {
  if (!abyssData.players[userId]) {
    abyssData.players[userId] = {
      userId,
      currentFloor: 1,
      maxFloor: 1,
      todayEnterCount: 0,
      totalKillCount: 0,
      totalCrystals: 0,
      crystals: 0,
      artifacts: [],
      materials: {},
      weeklyKillCount: 0,
      weeklyCrystals: 0,
      lastReset: Date.now(),
      weeklyRewardClaimed: false
    };
  }
  return abyssData.players[userId];
}

function checkWeeklyReset() {
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  if (now - abyssData.weeklyReset > weekMs) {
    abyssData.weeklyReset = now;
    for (const pid of Object.keys(abyssData.players)) {
      abyssData.players[pid].weeklyKillCount = 0;
      abyssData.players[pid].weeklyCrystals = 0;
      abyssData.players[pid].weeklyRewardClaimed = false;
      abyssData.players[pid].todayEnterCount = 0;
    }
  }
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

// =====================
// 路由接口
// =====================

router.get('/info', (req, res) => {
  const { userId } = req.query;
  checkWeeklyReset();
  const player = getOrCreatePlayer(userId);
  const floorConfig = FLOOR_CONFIG[player.currentFloor - 1] || FLOOR_CONFIG[0];
  
  res.json({
    currentFloor: player.currentFloor,
    maxFloor: player.maxFloor,
    crystals: player.crystals,
    totalCrystals: player.totalCrystals,
    artifacts: player.artifacts,
    todayEnterCount: player.todayEnterCount,
    weeklyKillCount: player.weeklyKillCount,
    weeklyCrystals: player.weeklyCrystals,
    floorName: floorConfig.name,
    energyCost: floorConfig.energy
  });
});

router.get('/floors', (req, res) => {
  const { userId } = req.query;
  const player = getOrCreatePlayer(userId);
  const floors = FLOOR_CONFIG.map(f => ({
    ...f,
    unlocked: f.floor <= player.maxFloor
  }));
  res.json(floors);
});

router.get('/bestiary', (req, res) => {
  const bestiary = Object.values(DEMON_BESTIARY).map(d => ({
    id: d.id, name: d.name, icon: d.icon,
    hp: d.hp, attack: d.attack, defense: d.defense,
    crystals: d.crystals, exp: d.exp, isBoss: d.isBoss || false
  }));
  res.json(bestiary);
});

router.post('/enter', (req, res) => {
  const { userId, floor, playerLevel, playerAtk, playerDef, playerHp, energy } = req.body;
  checkWeeklyReset();
  const player = getOrCreatePlayer(userId);
  const floorConfig = FLOOR_CONFIG[floor - 1];
  
  if (!floorConfig) return res.json({ success: false, message: '无效的层数' });
  if (floor > player.maxFloor + 1) return res.json({ success: false, message: '该层尚未解锁' });
  if (playerLevel < floorConfig.reqLevel) return res.json({ success: false, message: `需要${floorConfig.reqLevel}级才能进入` });
  if (energy < floorConfig.energy) return res.json({ success: false, message: `体力不足，需要${floorConfig.energy}体力` });
  if (player.todayEnterCount >= 10) return res.json({ success: false, message: '今日已进入次数用完，明日再来' });
  
  player.currentFloor = floor;
  player.todayEnterCount++;
  
  const encounters = [];
  for (let i = 0; i < 3; i++) {
    const type = floorConfig.demonTypes[Math.floor(Math.random() * floorConfig.demonTypes.length)];
    encounters.push({ ...DEMON_BESTIARY[type], uid: `m${i}` });
  }
  encounters.push({ ...DEMON_BESTIARY[floorConfig.boss], uid: 'boss', isBoss: true });
  
  res.json({
    success: true,
    energySpent: floorConfig.energy,
    encounters,
    message: `进入${floorConfig.name}，遭遇${encounters.length}只魔兽`
  });
});

router.post('/battle', (req, res) => {
  const { userId, demonId, playerAtk, playerDef, playerHp, playerLevel } = req.body;
  const demon = DEMON_BESTIARY[demonId];
  if (!demon) return res.json({ success: false, message: '不存在的魔兽' });
  
  const player = getOrCreatePlayer(userId);
  const levelBonus = 1 + (playerLevel - 1) * 0.05;
  const finalPlayerAtk = Math.floor(playerAtk * levelBonus);
  const finalPlayerDef = Math.floor(playerDef * levelBonus);
  
  const result = simpleBattle(finalPlayerAtk, finalPlayerDef, playerHp, demon);
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
  }
  
  res.json({
    success: true,
    win: result.win,
    playerHpLeft: result.playerHp,
    demonHpLeft: result.demonHp,
    rounds: result.rounds,
    rewards,
    totalCrystals: player.crystals,
    totalKills: player.totalKillCount
  });
});

router.post('/explore', (req, res) => {
  const { userId, floor, playerLevel, playerAtk, playerDef, playerHp, energy } = req.body;
  checkWeeklyReset();
  const player = getOrCreatePlayer(userId);
  const floorConfig = FLOOR_CONFIG[floor - 1];
  
  if (!floorConfig) return res.json({ success: false, message: '无效的层数' });
  if (floor > player.maxFloor + 1) return res.json({ success: false, message: '该层尚未解锁' });
  if (playerLevel < floorConfig.reqLevel) return res.json({ success: false, message: `需要${floorConfig.reqLevel}级` });
  if (energy < floorConfig.energy) return res.json({ success: false, message: `体力不足，需要${floorConfig.energy}体力` });
  if (player.todayEnterCount >= 10) return res.json({ success: false, message: '今日已进入次数用完' });
  
  player.todayEnterCount++;
  
  const levelBonus = 1 + (playerLevel - 1) * 0.05;
  const finalAtk = Math.floor(playerAtk * levelBonus);
  const finalDef = Math.floor(playerDef * levelBonus);
  
  let totalCrystals = 0;
  let totalExp = 0;
  let battles = [];
  let floorCleared = true;
  
  for (const demonType of floorConfig.demonTypes) {
    const demon = DEMON_BESTIARY[demonType];
    const result = simpleBattle(finalAtk, finalDef, playerHp, demon);
    if (!result.win) { floorCleared = false; break; }
    const crystals = dropCrystals(demon);
    totalCrystals += crystals;
    totalExp += demon.exp;
    battles.push({ demon: demon.name, win: true, crystals, exp: demon.exp });
  }
  
  if (floorCleared) {
    const boss = DEMON_BESTIARY[floorConfig.boss];
    const result = simpleBattle(finalAtk, finalDef, playerHp, boss);
    if (!result.win) {
      floorCleared = false;
    } else {
      const crystals = dropCrystals(boss);
      totalCrystals += crystals;
      totalExp += boss.exp;
      battles.push({ demon: boss.name, win: true, crystals, exp: demon.exp, isBoss: true });
    }
  }
  
  player.totalKillCount += battles.length;
  player.weeklyKillCount += battles.length;
  player.totalCrystals += totalCrystals;
  player.crystals += totalCrystals;
  player.weeklyCrystals += totalCrystals;
  
  let unlockNext = false;
  if (floorCleared && floor >= player.maxFloor) {
    player.maxFloor = Math.max(player.maxFloor, floor + 1);
    unlockNext = true;
  }
  
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
});

router.get('/shop', (req, res) => {
  const { userId } = req.query;
  const player = getOrCreatePlayer(userId);
  
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
});

router.post('/shop/buy', (req, res) => {
  const { userId, itemId } = req.body;
  const item = CRYSTAL_SHOP.find(i => i.id === itemId);
  if (!item) return res.json({ success: false, message: '商品不存在' });
  
  const player = getOrCreatePlayer(userId);
  if (player.crystals < item.cost) return res.json({ success: false, message: '魔晶不足' });
  
  if (item.limit > 0) {
    const playerKey = `shop_${item.id}`;
    if ((player[playerKey] || 0) >= item.limit) return res.json({ success: false, message: '已达购买上限' });
  }
  if (item.reward && item.reward.artifact) {
    if (player.artifacts.includes(item.reward.artifact)) return res.json({ success: false, message: '已拥有该魔器' });
  }
  
  player.crystals -= item.cost;
  const rewardKey = `shop_${item.id}`;
  player[rewardKey] = (player[rewardKey] || 0) + 1;
  
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
  
  res.json({
    success: true,
    crystals: player.crystals,
    reward: reward,
    rewardDesc,
    message: `消耗${item.cost}魔晶，获得${rewardDesc}`
  });
});

router.get('/artifacts', (req, res) => {
  const { userId } = req.query;
  const player = getOrCreatePlayer(userId);
  const artifacts = Object.values(DEMON_ARTIFACTS).map(a => ({
    ...a, owned: player.artifacts.includes(a.id)
  }));
  res.json({ artifacts, ownedArtifacts: player.artifacts });
});

router.get('/materials', (req, res) => {
  const { userId } = req.query;
  const player = getOrCreatePlayer(userId);
  res.json({ materials: player.materials, crystals: player.crystals });
});

router.get('/rankings', (req, res) => {
  const { type } = req.query;
  let rankings = [];
  if (type === 'kills') {
    rankings = Object.values(abyssData.players)
      .sort((a, b) => b.weeklyKillCount - a.weeklyKillCount)
      .slice(0, 50)
      .map((p, i) => ({ rank: i + 1, userId: p.userId, weeklyKills: p.weeklyKillCount }));
  } else if (type === 'crystals') {
    rankings = Object.values(abyssData.players)
      .sort((a, b) => b.weeklyCrystals - a.weeklyCrystals)
      .slice(0, 50)
      .map((p, i) => ({ rank: i + 1, userId: p.userId, weeklyCrystals: p.weeklyCrystals }));
  } else {
    rankings = Object.values(abyssData.players)
      .sort((a, b) => b.maxFloor - a.maxFloor)
      .slice(0, 50)
      .map((p, i) => ({ rank: i + 1, userId: p.userId, maxFloor: p.maxFloor }));
  }
  res.json(rankings);
});

router.get('/weekly-reward', (req, res) => {
  const { userId } = req.query;
  checkWeeklyReset();
  const player = getOrCreatePlayer(userId);
  const rewards = [
    { minKills: 10,  minCrystals: 100,  reward: { lingshi: 500 } },
    { minKills: 30,  minCrystals: 300,  reward: { lingshi: 1000, diamonds: 20 } },
    { minKills: 50,  minCrystals: 500,  reward: { lingshi: 2000, diamonds: 50 } },
    { minKills: 100, minCrystals: 1000, reward: { lingshi: 5000, diamonds: 100, artifact: 'demon_crown' } }
  ];
  const qualified = rewards.filter(r =>
    player.weeklyKillCount >= r.minKills && player.weeklyCrystals >= r.minCrystals
  );
  let nextReward = null;
  for (const r of rewards) {
    if (player.weeklyKillCount < r.minKills || player.weeklyCrystals < r.minCrystals) {
      nextReward = r; break;
    }
  }
  res.json({
    weeklyKillCount: player.weeklyKillCount,
    weeklyCrystals: player.weeklyCrystals,
    weeklyRewardClaimed: player.weeklyRewardClaimed,
    qualifiedRewards: qualified,
    nextReward
  });
});

router.post('/weekly-reward/claim', (req, res) => {
  const { userId, rewardLevel } = req.body;
  checkWeeklyReset();
  const player = getOrCreatePlayer(userId);
  const rewards = [
    { minKills: 10,  minCrystals: 100,  reward: { lingshi: 500 }, level: 0 },
    { minKills: 30,  minCrystals: 300,  reward: { lingshi: 1000, diamonds: 20 }, level: 1 },
    { minKills: 50,  minCrystals: 500,  reward: { lingshi: 2000, diamonds: 50 }, level: 2 },
    { minKills: 100, minCrystals: 1000, reward: { lingshi: 5000, diamonds: 100, artifact: 'demon_crown' }, level: 3 }
  ];
  const targetReward = rewards[rewardLevel];
  if (!targetReward) return res.json({ success: false, message: '无效奖励档位' });
  if (player.weeklyKillCount < targetReward.minKills || player.weeklyCrystals < targetReward.minCrystals) {
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
  res.json({ success: true, reward: targetReward.reward, rewardDesc });
});

module.exports = router;
