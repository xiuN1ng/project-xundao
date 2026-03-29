/**
 * 心魔幻境深渊副本 API
 * 副本生成逻辑 + 怪物数据配置 + 奖励公式
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const Database = require('better-sqlite3');
const { HeartDemonStorage } = require('../heart_demon_storage');
const { playerStorage } = require('../../game/storage');

const storage = new HeartDemonStorage();

// 使用共享 game.db 获取玩家等级
const GAME_DB_PATH = path.join(__dirname, '..', 'data', 'game.db');
let _gameDb = null;
function getGameDb() {
  if (!_gameDb) {
    _gameDb = new Database(GAME_DB_PATH);
    _gameDb.pragma('busy_timeout=5000');
  }
  return _gameDb;
}

// 获取玩家等级（从 Users 表）
function getPlayerLevel(userId) {
  try {
    const row = getGameDb().prepare('SELECT level FROM Users WHERE id = ?').get(userId);
    return row ? (row.level || 1) : 1;
  } catch {
    return 1;
  }
}

// =====================
// 心魔幻境层配置
// =====================
const FLOOR_CONFIG = [
  { floor: 1,  name: '初心之境',    reqLevel: 1,   energy: 8,  soulCrystals: [8, 20],   demonTypes: ['noob_demon', 'fear_wisp'],      boss: 'shadow_heart',       difficulty: 'normal'    },
  { floor: 2,  name: '执念回廊',    reqLevel: 5,   energy: 12, soulCrystals: [15, 40],  demonTypes: ['fear_wisp', 'greed_shade'],      boss: 'obsession_lord',    difficulty: 'normal'    },
  { floor: 3,  name: '欲望深渊',    reqLevel: 10,  energy: 16, soulCrystals: [25, 65],  demonTypes: ['greed_shade', 'wrath_specter'],  boss: 'desire_fiend',      difficulty: 'normal'    },
  { floor: 4,  name: '嗔心迷宫',    reqLevel: 15,  energy: 20, soulCrystals: [40, 100], demonTypes: ['wrath_specter', 'pride_wraith'],  boss: 'wrath_lord',        difficulty: 'hard'      },
  { floor: 5,  name: '傲慢领域',    reqLevel: 20,  energy: 25, soulCrystals: [60, 150], demonTypes: ['pride_wraith', 'envy_ghost'],      boss: 'pride_overlord',    difficulty: 'hard'      },
  { floor: 6,  name: '嫉妒炼狱',    reqLevel: 25,  energy: 30, soulCrystals: [90, 220], demonTypes: ['envy_ghost', 'sloth_abyss'],      boss: 'envy_titan',        difficulty: 'hard'      },
  { floor: 7,  name: '懒惰幽冥',    reqLevel: 30,  energy: 36, soulCrystals: [130, 320], demonTypes: ['sloth_abyss', 'blood_moon'],     boss: 'sloth_demon',       difficulty: 'nightmare'},
  { floor: 8,  name: '血月魔域',    reqLevel: 35,  energy: 42, soulCrystals: [180, 450], demonTypes: ['blood_moon', 'true_heart_demon'], boss: 'blood_moon_lord', difficulty: 'nightmare'},
  { floor: 9,  name: '真我之殇',    reqLevel: 40,  energy: 50, soulCrystals: [250, 620], demonTypes: ['true_heart_demon', 'soul_eater'], boss: 'heart_demon_king',  difficulty: 'nightmare'},
  { floor: 10, name: '心魔深渊',   reqLevel: 50,  energy: 60, soulCrystals: [350, 880], demonTypes: ['soul_eater', 'doom_heart'],      boss: 'heart_demon_overlord', difficulty: 'abyss'  },
];

// 心魔图鉴（怪物数据）
const DEMON_BESTIARY = {
  // === 普通心魔 ===
  noob_demon:      { id: 'noob_demon',       name: '初心魔',       icon: '😈', hp: 60,    attack: 10,  defense: 4,   soulCrystals: [1,4],    exp: 12,   heartDemon: 2  },
  fear_wisp:       { id: 'fear_wisp',        name: '恐惧幽魂',     icon: '👻', hp: 140,   attack: 22,  defense: 10,  soulCrystals: [3,9],   exp: 35,   heartDemon: 5  },
  greed_shade:     { id: 'greed_shade',      name: '贪婪暗影',     icon: '💀', hp: 280,   attack: 40,  defense: 18,  soulCrystals: [6,15],  exp: 70,   heartDemon: 8  },
  wrath_specter:   { id: 'wrath_specter',    name: '嗔念怨魂',     icon: '⚡', hp: 450,   attack: 65,  defense: 30,  soulCrystals: [10,25], exp: 120,  heartDemon: 12 },
  pride_wraith:    { id: 'pride_wraith',     name: '傲慢怨灵',     icon: '👑', hp: 650,   attack: 90,  defense: 48,  soulCrystals: [16,40], exp: 200,  heartDemon: 18 },
  envy_ghost:      { id: 'envy_ghost',       name: '嫉妒鬼魅',     icon: '🐍', hp: 900,   attack: 125, defense: 72,  soulCrystals: [24,60], exp: 320,  heartDemon: 25 },
  sloth_abyss:     { id: 'sloth_abyss',      name: '懒惰深渊魔',   icon: '🦥', hp: 1200,  attack: 165, defense: 100, soulCrystals: [35,85], exp: 480,  heartDemon: 35 },
  blood_moon:      { id: 'blood_moon',       name: '血月魔影',     icon: '🌙', hp: 1600,  attack: 220, defense: 140, soulCrystals: [50,120],exp: 680,  heartDemon: 50 },
  true_heart_demon:{ id: 'true_heart_demon', name: '真·心魔',     icon: '😱', hp: 2100,  attack: 290, defense: 190, soulCrystals: [70,165],exp: 900,  heartDemon: 70 },
  soul_eater:      { id: 'soul_eater',       name: '噬魂魔',       icon: '💠', hp: 2800,  attack: 370, defense: 260, soulCrystals: [95,230],exp: 1200, heartDemon: 95 },
  doom_heart:      { id: 'doom_heart',       name: '末日心魔',     icon: '☠️', hp: 3600,  attack: 460, defense: 340, soulCrystals: [130,320],exp: 1600, heartDemon:130 },

  // === BOSS心魔 ===
  shadow_heart:         { id: 'shadow_heart',         name: '暗影心魔',      icon: '🌑', hp: 1000,  attack: 130,  defense: 65,  soulCrystals: [25,60],   exp: 500,   heartDemon: 40,  isBoss: true },
  obsession_lord:       { id: 'obsession_lord',        name: '执念之主',       icon: '🎭', hp: 1800,  attack: 200,  defense: 110, soulCrystals: [45,110],  exp: 900,   heartDemon: 70,  isBoss: true },
  desire_fiend:         { id: 'desire_fiend',           name: '欲望邪魔',       icon: '🔥', hp: 2800,  attack: 270,  defense: 160, soulCrystals: [70,175],  exp: 1400,  heartDemon: 100, isBoss: true },
  wrath_lord:           { id: 'wrath_lord',             name: '嗔怒之王',       icon: '⚔️', hp: 4200,  attack: 360,  defense: 240, soulCrystals: [100,250], exp: 2000,  heartDemon: 140, isBoss: true },
  pride_overlord:      { id: 'pride_overlord',         name: '傲慢魔君',       icon: '👑', hp: 6000,  attack: 460,  defense: 320, soulCrystals: [140,350], exp: 2800,  heartDemon: 190, isBoss: true },
  envy_titan:          { id: 'envy_titan',             name: '嫉妒泰坦',       icon: '🦄', hp: 8500,  attack: 580,  defense: 420, soulCrystals: [190,470], exp: 3800,  heartDemon: 250, isBoss: true },
  sloth_demon:          { id: 'sloth_demon',             name: '懒惰大魔',       icon: '🦧', hp: 11500, attack: 720,  defense: 540, soulCrystals: [250,620], exp: 5000,  heartDemon: 320, isBoss: true },
  blood_moon_lord:     { id: 'blood_moon_lord',         name: '血月之主',       icon: '🌕', hp: 15000, attack: 880,  defense: 680, soulCrystals: [320,800], exp: 6500,  heartDemon: 400, isBoss: true },
  heart_demon_king:    { id: 'heart_demon_king',        name: '心魔之王',       icon: '👿', hp: 20000, attack: 1050, defense: 840, soulCrystals: [420,1050],exp: 8800,  heartDemon: 500, isBoss: true },
  heart_demon_overlord:{ id: 'heart_demon_overlord',    name: '心魔深渊领主',   icon: '💀', hp: 28000, attack: 1280, defense: 1020,soulCrystals: [550,1380],exp: 12000, heartDemon: 650, isBoss: true },
};

// 心魔商店兑换表（魂晶货币）
const HEART_DEMON_SHOP = [
  { id: 'sc_to_lingshi',    name: '魂晶兑换灵石',   icon: '💰', cost: 10,  reward: { lingshi: 120 },   limit: -1 },
  { id: 'sc_to_diamond',    name: '魂晶兑换钻石',   icon: '💎', cost: 100, reward: { diamonds: 10 },  limit: 50 },
  { id: 'heart_pearl_box',  name: '心魔珠礼包',     icon: '📦', cost: 80,  reward: { heart_pearl: 2 }, limit: 10 },
  { id: 'soul_essence_box', name: '魂精华礼包',     icon: '🎁', cost: 120, reward: { soul_essence: 2 },limit: 10 },
  { id: 'demon_heart_box',  name: '魔心礼包',       icon: '🎀', cost: 300, reward: { demon_heart: 1 }, limit: 5  },
  { id: 'shadow_cloak',     name: '暗影披风',       icon: '🧥', cost: 300, reward: { artifact: 'shadow_cloak' }, limit: 1 },
  { id: 'heart_medallion',  name: '心魔徽章',       icon: '🏅', cost: 500, reward: { artifact: 'heart_medallion' }, limit: 1 },
  { id: 'demon_eye_amulet', name: '心眼项链',       icon: '👁️', cost: 400, reward: { artifact: 'demon_eye_amulet' }, limit: 1 },
  { id: 'soul_absorber',    name: '噬魂铃',         icon: '🔔', cost: 600, reward: { artifact: 'soul_absorber' }, limit: 1 },
  { id: 'heart_demon_crown',name: '心魔皇冠',       icon: '👑', cost: 1200, reward: { artifact: 'heart_demon_crown' }, limit: 1 },
];

// 心魔装备图鉴
const HEART_ARTIFACTS = {
  shadow_cloak:        { id: 'shadow_cloak',         name: '暗影披风',    icon: '🧥', type: 'armor',      stats: { defense: 60, heartResist: 15 }, cost: 300,  desc: '抵抗心魔侵蚀，防御+60' },
  heart_medallion:     { id: 'heart_medallion',      name: '心魔徽章',    icon: '🏅', type: 'accessory',  stats: { attack: 40, heartDemonDamage: 20 }, cost: 500, desc: '心魔伤害+20%，攻击+40' },
  demon_eye_amulet:   { id: 'demon_eye_amulet',    name: '心眼项链',    icon: '👁️', type: 'accessory',  stats: { critRate: 8, critDamage: 25 }, cost: 400,  desc: '暴击率+8%，暴击伤害+25%' },
  soul_absorber:       { id: 'soul_absorber',        name: '噬魂铃',      icon: '🔔', type: 'weapon',     stats: { attack: 100, soulCrystalGain: 15 }, cost: 600, desc: '攻击+100，魂晶获取+15%' },
  heart_demon_crown:  { id: 'heart_demon_crown',   name: '心魔皇冠',    icon: '👑', type: 'accessory',  stats: { attack: 80, defense: 60, heartResist: 25 }, cost: 1200, desc: '全属性提升，心魔抗性+25%' },
};

// =====================
// 辅助函数
// =====================

const playerCache = new Map();
const CACHE_TTL = 5000;

// 统一从请求中提取 userId（兼容 userId / playerId 参数）
function extractUserId(req) {
  const raw = req.query?.userId || req.query?.playerId || req.body?.userId || req.body?.playerId;
  return parseInt(raw) || 1;
}

function getCachedPlayer(userId) {
  const cached = playerCache.get(userId);
  if (cached && (Date.now() - cached.ts) < CACHE_TTL) return cached.data;
  return null;
}

function setCachedPlayer(userId, data) {
  playerCache.set(userId, { data, ts: Date.now() });
}

function invalidateCache(userId) {
  playerCache.delete(userId);
}

function randomRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function simpleBattle(playerAtk, playerDef, playerHp, demon, heartDemonBonus = 0) {
  const demonDmgMultiplier = 1 + (heartDemonBonus / 500);
  let remainingDemonHp = demon.hp;
  let remainingPlayerHp = playerHp;
  let round = 0;

  while (remainingDemonHp > 0 && remainingPlayerHp > 0 && round < 50) {
    round++;
    const playerDmg = Math.max(1, Math.floor(playerAtk - demon.defense));
    remainingDemonHp -= playerDmg;
    if (remainingDemonHp <= 0) break;
    const demonDmg = Math.max(1, Math.floor((demon.attack * demonDmgMultiplier) - playerDef));
    remainingPlayerHp -= demonDmg;
  }

  return {
    win: remainingDemonHp <= 0,
    playerHp: remainingPlayerHp,
    demonHp: remainingDemonHp,
    rounds: round
  };
}

function calcSweepReward(floor) {
  const cfg = FLOOR_CONFIG[floor - 1];
  if (!cfg) return { soulCrystals: 0, exp: 0 };
  let totalSc = 0, totalExp = 0;
  for (const demonType of cfg.demonTypes) {
    const d = DEMON_BESTIARY[demonType];
    if (d) {
      totalSc += Math.floor((d.soulCrystals[0] + d.soulCrystals[1]) / 2);
      totalExp += d.exp;
    }
  }
  const boss = DEMON_BESTIARY[cfg.boss];
  if (boss) {
    totalSc += Math.floor((boss.soulCrystals[0] + boss.soulCrystals[1]) / 2);
    totalExp += boss.exp;
  }
  return { soulCrystals: Math.floor(totalSc * 0.8), exp: Math.floor(totalExp * 0.8) };
}

function generateEncounters(floorConfig, heartDemonEnergy = 0) {
  const encounters = floorConfig.demonTypes.map((type, i) => ({
    ...DEMON_BESTIARY[type], uid: `m${i}`, defeated: false, currentHp: DEMON_BESTIARY[type].hp
  }));
  encounters.push({
    ...DEMON_BESTIARY[floorConfig.boss], uid: 'boss', isBoss: true,
    defeated: false, currentHp: DEMON_BESTIARY[floorConfig.boss].hp
  });
  return encounters;
}

// =====================
// 路由接口
// =====================

// GET / - 心魔幻境概览
router.get('/', async (req, res) => {
  const userId = extractUserId(req);
  try {
    const player = await storage.getOrCreatePlayer(userId);
    const playerLevel = getPlayerLevel(userId);
    setCachedPlayer(userId, player);
    res.json({
      success: true,
      soulCrystals: player.soulCrystals,
      totalSoulCrystals: player.totalSoulCrystals,
      currentFloor: player.currentFloor,
      maxFloor: player.maxFloor,
      todayEnterCount: player.todayEnterCount,
      todaySweepCount: player.todaySweepCount,
      weeklyKillCount: player.weeklyKillCount,
      weeklySoulCrystals: Number(player.weeklySoulCrystals),
      weeklyRewardClaimed: player.weeklyRewardClaimed,
      heartDemonEnergy: player.heartDemonEnergy,
      materials: player.materials,
      playerLevel,
      floors: FLOOR_CONFIG.map(f => ({
        floor: f.floor, name: f.name, reqLevel: f.reqLevel,
        energy: f.energy, difficulty: f.difficulty,
        unlocked: f.floor <= player.maxFloor && playerLevel >= f.reqLevel,
        soulCrystals: f.soulCrystals
      }))
    });
  } catch (err) {
    console.error('heart_demon / error:', err);
    res.json({ success: false, message: '服务器错误' });
  }
});

// GET /config - 获取完整配置
router.get('/config', async (req, res) => {
  const userId = extractUserId(req);
  try {
    const player = await storage.getOrCreatePlayer(userId);
    const playerLevel = getPlayerLevel(userId);
    setCachedPlayer(userId, player);
    const difficultyLabels = { normal: '普通', hard: '困难', nightmare: '噩梦', abyss: '深渊' };
    const dungeons = FLOOR_CONFIG.map(f => ({
      id: `heart_demon_floor_${f.floor}`,
      name: f.name, floor: f.floor,
      difficulty: f.difficulty,
      difficultyLabel: difficultyLabels[f.difficulty] || f.difficulty,
      reqLevel: f.reqLevel, energy: f.energy,
      rewardPreview: { soulCrystals: f.soulCrystals, exp: f.floor * 60 },
      maxProgress: player.maxFloor >= f.floor,
      currentProgress: player.currentFloor >= f.floor,
      bossName: DEMON_BESTIARY[f.boss]?.name || f.boss,
      bossIcon: DEMON_BESTIARY[f.boss]?.icon || '😈',
      unlocked: player.maxFloor >= f.floor && playerLevel >= f.reqLevel
    }));
    res.json({
      success: true, dungeons,
      soulCrystals: player.soulCrystals,
      currentFloor: player.currentFloor, maxFloor: player.maxFloor,
      todayEnterCount: player.todayEnterCount, todaySweepCount: player.todaySweepCount,
      weeklyKillCount: player.weeklyKillCount, weeklySoulCrystals: Number(player.weeklySoulCrystals)
    });
  } catch (err) {
    console.error('heart_demon /config error:', err);
    res.json({ success: false, message: '服务器错误' });
  }
});

// GET /list - 副本列表
router.get('/list', async (req, res) => {
  const userId = extractUserId(req);
  try {
    const player = getCachedPlayer(userId) || await storage.getOrCreatePlayer(userId);
    const playerLevel = getPlayerLevel(userId);
    const dungeons = FLOOR_CONFIG.map(f => ({
      id: `heart_demon_floor_${f.floor}`, name: f.name, floor: f.floor,
      difficulty: f.difficulty, reqLevel: f.reqLevel, energy: f.energy,
      unlocked: f.floor <= player.maxFloor && playerLevel >= f.reqLevel,
      soulCrystals: f.soulCrystals
    }));
    res.json({ success: true, dungeons });
  } catch (err) {
    res.json({ success: false, message: '服务器错误' });
  }
});

// GET /info - 玩家进度详情
router.get('/info', async (req, res) => {
  const userIdRaw = req.query.userId || req.headers['x-user-id'] || 1;
  const userId = parseInt(userIdRaw) || 1;
  try {
    const player = await storage.getOrCreatePlayer(userId);
    setCachedPlayer(userId, player);
    const floorConfig = FLOOR_CONFIG[player.currentFloor - 1] || FLOOR_CONFIG[0];
    res.json({
      success: true,
      currentFloor: player.currentFloor, maxFloor: player.maxFloor,
      soulCrystals: Number(player.soulCrystals) || 0, totalSoulCrystals: Number(player.totalSoulCrystals) || 0,
      materials: player.materials || {},
      todayEnterCount: player.todayEnterCount || 0, todaySweepCount: player.todaySweepCount || 0,
      sweptFloorsToday: player.sweptFloorsToday || [],
      weeklyKillCount: player.weeklyKillCount || 0, weeklySoulCrystals: Number(player.weeklySoulCrystals) || 0,
      weeklyRewardClaimed: player.weeklyRewardClaimed || false,
      heartDemonEnergy: player.heartDemonEnergy || 0,
      floorName: floorConfig?.name || '初心之境', energyCost: floorConfig?.energy || 8
    });
  } catch (err) {
    console.error('heartDemon/info error:', err.message);
    res.json({ success: false, message: '服务器错误: ' + err.message });
  }
});

// GET /floors - 楼层详情
router.get('/floors', async (req, res) => {
  const userId = extractUserId(req);
  try {
    const player = getCachedPlayer(userId) || await storage.getOrCreatePlayer(userId);
    const playerLevel = getPlayerLevel(userId);
    const floors = FLOOR_CONFIG.map(f => ({
      floor: f.floor, name: f.name, reqLevel: f.reqLevel, energy: f.energy,
      soulCrystals: f.soulCrystals, difficulty: f.difficulty,
      unlocked: f.floor <= player.maxFloor && playerLevel >= f.reqLevel,
      swept: (player.sweptFloorsToday || []).includes(f.floor),
      bossName: DEMON_BESTIARY[f.boss]?.name,
      bossIcon: DEMON_BESTIARY[f.boss]?.icon
    }));
    res.json({ success: true, floors });
  } catch (err) {
    res.json({ success: false, message: '服务器错误' });
  }
});

// GET /bestiary - 心魔图鉴
router.get('/bestiary', (req, res) => {
  const bestiary = Object.values(DEMON_BESTIARY).map(d => ({
    id: d.id, name: d.name, icon: d.icon,
    hp: d.hp, attack: d.attack, defense: d.defense,
    soulCrystals: d.soulCrystals, exp: d.exp,
    heartDemon: d.heartDemon, isBoss: d.isBoss || false
  }));
  res.json(bestiary);
});

// POST /enter - 进入副本
router.post('/enter', async (req, res) => {
  const { userId, floor, playerLevel, playerAtk, playerDef, playerHp, energy, dungeonId } = req.body;

  let targetFloor = floor;
  if (!targetFloor && dungeonId && dungeonId.startsWith('heart_demon_floor_')) {
    targetFloor = parseInt(dungeonId.replace('heart_demon_floor_', ''));
  }
  if (!targetFloor || targetFloor < 1) return res.json({ success: false, message: '无效的层数' });

  try {
    const player = await storage.getOrCreatePlayer(userId);
    const floorConfig = FLOOR_CONFIG[targetFloor - 1];
    if (!floorConfig) return res.json({ success: false, message: '无效的层数' });
    if (targetFloor > player.maxFloor + 1) return res.json({ success: false, message: '该层尚未解锁' });
    if ((playerLevel || 1) < floorConfig.reqLevel) return res.json({ success: false, message: `需要${floorConfig.reqLevel}级才能进入` });
    if ((energy || 0) < floorConfig.energy) return res.json({ success: false, message: `体力不足，需要${floorConfig.energy}体力` });
    if (player.todayEnterCount >= 10) return res.json({ success: false, message: '今日进入次数用完，明日再来' });

    player.currentFloor = targetFloor;
    player.todayEnterCount += 1;
    player.heartDemonEnergy = Math.min((player.heartDemonEnergy || 0) + 2, 300);
    await storage.savePlayer(userId, player);
    setCachedPlayer(userId, player);

    const sessionId = `heart_demon_${targetFloor}_${Date.now()}`;
    const encounters = generateEncounters(floorConfig, player.heartDemonEnergy);

    res.json({
      success: true,
      session: { sessionId, dungeonId: dungeonId || `heart_demon_floor_${targetFloor}`, currentLayer: targetFloor, encounters },
      energySpent: floorConfig.energy, encounters,
      heartDemonEnergy: player.heartDemonEnergy,
      message: `进入「${floorConfig.name}」，遭遇${encounters.length}只心魔`
    });
  } catch (err) {
    console.error('heart_demon /enter error:', err);
    res.json({ success: false, message: '服务器错误' });
  }
});

// POST /battle - 战斗
router.post('/battle', async (req, res) => {
  const { userId, demonId, playerAtk, playerDef, playerHp, playerLevel, playerDamage, playerDefense } = req.body;

  const demon = DEMON_BESTIARY[demonId];
  if (!demon) return res.json({ success: false, message: '不存在的心魔' });

  try {
    const player = await storage.getOrCreatePlayer(userId);
    const finalAtk = playerAtk || playerDamage || 100;
    const finalDef = playerDef || playerDefense || 50;
    const finalLevel = playerLevel || 1;
    const finalHp = playerHp || 1000;

    const levelBonus = 1 + (finalLevel - 1) * 0.05;
    const finalPlayerAtk = Math.floor(finalAtk * levelBonus);
    const finalPlayerDef = Math.floor(finalDef * levelBonus);
    const heartDemonBonus = player.heartDemonEnergy || 0;

    const result = simpleBattle(finalPlayerAtk, finalPlayerDef, finalHp, demon, heartDemonBonus);
    const scReward = result.win ? randomRange(demon.soulCrystals[0], demon.soulCrystals[1]) : 0;
    const expReward = result.win ? demon.exp : 0;
    const heartDemonReduce = result.win ? Math.floor(demon.heartDemon / 2) : 0;

    if (result.win) {
      player.totalKillCount++;
      player.weeklyKillCount++;
      await storage.addSoulCrystals(userId, scReward);
      player.heartDemonEnergy = Math.max(0, player.heartDemonEnergy - heartDemonReduce);
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
        rewards: { exp: expReward, soulCrystals: scReward, heartDemon: heartDemonReduce }
      },
      win: result.win,
      playerHpLeft: result.playerHp,
      demonHpLeft: result.demonHp,
      rounds: result.rounds,
      rewards: { exp: expReward, soulCrystals: scReward, heartDemon: heartDemonReduce },
      totalSoulCrystals: player.soulCrystals,
      heartDemonEnergy: player.heartDemonEnergy
    });
  } catch (err) {
    console.error('heart_demon /battle error:', err);
    res.json({ success: false, message: '服务器错误' });
  }
});

// POST /explore - 快速探索（自动打完所有怪物）
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
    player.heartDemonEnergy = Math.min((player.heartDemonEnergy || 0) + 2, 300);

    const levelBonus = 1 + ((playerLevel || 1) - 1) * 0.05;
    const finalAtk = Math.floor((playerAtk || 100) * levelBonus);
    const finalDef = Math.floor((playerDef || 50) * levelBonus);
    const hp = playerHp || 1000;
    const heartDemonBonus = player.heartDemonEnergy;

    let totalSc = 0, totalExp = 0;
    let battles = [];
    let floorCleared = true;
    let heartDemonReduced = 0;

    for (const demonType of floorConfig.demonTypes) {
      const demon = DEMON_BESTIARY[demonType];
      const result = simpleBattle(finalAtk, finalDef, hp, demon, heartDemonBonus);
      if (!result.win) { floorCleared = false; break; }
      const sc = randomRange(demon.soulCrystals[0], demon.soulCrystals[1]);
      totalSc += sc;
      totalExp += demon.exp;
      heartDemonReduced += Math.floor(demon.heartDemon / 2);
      battles.push({ demon: demon.name, win: true, sc, exp: demon.exp, icon: demon.icon });
    }

    if (floorCleared) {
      const boss = DEMON_BESTIARY[floorConfig.boss];
      const result = simpleBattle(finalAtk, finalDef, hp, boss, heartDemonBonus);
      if (!result.win) {
        floorCleared = false;
      } else {
        const sc = randomRange(boss.soulCrystals[0], boss.soulCrystals[1]);
        totalSc += sc;
        totalExp += boss.exp;
        heartDemonReduced += Math.floor(boss.heartDemon / 2);
        battles.push({ demon: boss.name, win: true, sc, exp: boss.exp, icon: boss.icon, isBoss: true });
      }
    }

    if (floorCleared) {
      await storage.addSoulCrystals(userId, totalSc);
      player.heartDemonEnergy = Math.max(0, player.heartDemonEnergy - heartDemonReduced);

      let unlockNext = false;
      if (floor >= player.maxFloor) {
        const nextFloor = floor + 1;
        player.maxFloor = nextFloor;
        await storage.unlockFloor(userId, nextFloor);
        unlockNext = true;
      }
      player.totalKillCount += battles.length;
      player.weeklyKillCount += battles.length;
      await storage.savePlayer(userId, player);
      setCachedPlayer(userId, player);

      res.json({
        success: true,
        energySpent: floorConfig.energy, floorCleared, battles,
        totalSoulCrystals: totalSc, totalExp,
        soulCrystals: player.soulCrystals, maxFloor: player.maxFloor,
        heartDemonEnergy: player.heartDemonEnergy,
        unlockNext,
        nextFloorName: FLOOR_CONFIG[floor] ? FLOOR_CONFIG[floor].name : '已达顶层'
      });
    } else {
      player.heartDemonEnergy = Math.min(player.heartDemonEnergy + 5, 300);
      await storage.savePlayer(userId, player);
      setCachedPlayer(userId, player);
      res.json({ success: true, energySpent: 0, floorCleared: false, battles, heartDemonEnergy: player.heartDemonEnergy, message: '心魔抵抗失败，下次再挑战！' });
    }
  } catch (err) {
    console.error('heart_demon /explore error:', err);
    res.json({ success: false, message: '服务器错误' });
  }
});

// POST /claim - 领取通关奖励
router.post('/claim', async (req, res) => {
  const { userId, layer } = req.body;
  try {
    const player = await storage.getOrCreatePlayer(userId);
    if (layer !== player.currentFloor) return res.json({ success: false, message: '当前不在该层' });
    const cfg = FLOOR_CONFIG[layer - 1];
    if (!cfg) return res.json({ success: false, message: '无效层数' });

    const baseSc = Math.floor((cfg.soulCrystals[0] + cfg.soulCrystals[1]) / 2);
    const expReward = layer * 60;
    await storage.addSoulCrystals(userId, baseSc);

    let unlocked = false;
    if (player.maxFloor < layer + 1) {
      await storage.unlockFloor(userId, layer + 1);
      player.maxFloor = layer + 1;
      unlocked = true;
    }
    player.totalKillCount += (cfg.demonTypes.length + 1);
    player.weeklyKillCount += (cfg.demonTypes.length + 1);
    player.heartDemonEnergy = Math.max(0, player.heartDemonEnergy - 15);
    await storage.savePlayer(userId, player);
    setCachedPlayer(userId, player);

    res.json({
      success: true, session: null,
      rewards: { soulCrystals: baseSc, exp: expReward },
      soulCrystals: player.soulCrystals, maxFloor: player.maxFloor,
      heartDemonEnergy: player.heartDemonEnergy, unlocked,
      message: `通关第${layer}层「${cfg.name}」，获得魂晶×${baseSc}，经验×${expReward}${unlocked ? `，解锁第${layer + 1}层「${FLOOR_CONFIG[layer]?.name}」！` : ''}`
    });
  } catch (err) {
    console.error('heart_demon /claim error:', err);
    res.json({ success: false, message: '服务器错误' });
  }
});

// POST /defeat - 退出副本
router.post('/defeat', async (req, res) => {
  const userId = extractUserId(req);
  try {
    const player = await storage.getOrCreatePlayer(userId);
    player.currentFloor = Math.min(player.currentFloor, player.maxFloor);
    await storage.savePlayer(userId, player);
    setCachedPlayer(userId, player);
    res.json({ success: true, currentFloor: player.currentFloor, message: '已退出副本' });
  } catch (err) {
    res.json({ success: false, message: '服务器错误' });
  }
});

// POST /clear - 清除心魔（消耗灵石或道具）
router.post('/clear', async (req, res) => {
  const userId = extractUserId(req);
  const { method } = req.body;
  // method: 'spirit_stones' (灵石清除) | 'purify_charm' (心魔净化符道具) | 'heart_pearl' (心魔珠道具)
  if (!method) return res.json({ success: false, message: '请指定清除方式 method(spirit_stones/purify_charm/heart_pearl)' });

  try {
    const player = await storage.getOrCreatePlayer(userId);
    const currentEnergy = player.heartDemonEnergy || 0;

    if (currentEnergy <= 0) return res.json({ success: false, message: '当前无心魔可清除' });

    // 灵石清除：每点心魔消耗 50 灵石，最低消耗 100
    if (method === 'spirit_stones') {
      const cost = Math.max(100, Math.floor(currentEnergy * 50));
      // 使用 playerStorage 扣除灵石
      try {
        if (playerStorage && playerStorage.hasEnoughSpiritStones) {
          const enough = await playerStorage.hasEnoughSpiritStones(userId, cost);
          if (!enough) return res.json({ success: false, message: `灵石不足，需要${cost}灵石` });
          await playerStorage.deductSpiritStones(userId, cost);
        }
      } catch (e) {
        console.warn('heart_demon /clear: playerStorage 灵石扣除失败', e.message);
      }
      const cleared = Math.min(currentEnergy, Math.ceil(cost / 50));
      player.heartDemonEnergy = Math.max(0, currentEnergy - cleared);
      await storage.savePlayer(userId, player);
      setCachedPlayer(userId, player);
      return res.json({
        success: true,
        heartDemonEnergy: player.heartDemonEnergy,
        cleared,
        cost,
        message: `消耗${cost}灵石，清除${cleared}点心魔能量，当前心魔能量：${player.heartDemonEnergy}`
      });
    }

    // 心魔净化符道具清除：消耗1个道具，清除50点心魔
    if (method === 'purify_charm') {
      const materials = player.materials || {};
      if ((materials.purify_charm || 0) < 1) return res.json({ success: false, message: '没有心魔净化符，可在心魔商店购买' });
      materials.purify_charm = (materials.purify_charm || 0) - 1;
      player.materials = materials;
      player.heartDemonEnergy = Math.max(0, currentEnergy - 50);
      await storage.savePlayer(userId, player);
      setCachedPlayer(userId, player);
      return res.json({
        success: true,
        heartDemonEnergy: player.heartDemonEnergy,
        cleared: 50,
        message: `使用心魔净化符，清除50点心魔能量，当前心魔能量：${player.heartDemonEnergy}`
      });
    }

    // 心魔珠道具清除：消耗1个道具，清除全部心魔
    if (method === 'heart_pearl') {
      const materials = player.materials || {};
      if ((materials.heart_pearl || 0) < 1) return res.json({ success: false, message: '没有心魔珠，可在心魔商店购买' });
      materials.heart_pearl = (materials.heart_pearl || 0) - 1;
      player.materials = materials;
      player.heartDemonEnergy = 0;
      await storage.savePlayer(userId, player);
      setCachedPlayer(userId, player);
      return res.json({
        success: true,
        heartDemonEnergy: 0,
        cleared: currentEnergy,
        message: `使用心魔珠，彻底清除全部${currentEnergy}点心魔能量！`
      });
    }

    return res.json({ success: false, message: '无效的清除方式' });
  } catch (err) {
    console.error('heart_demon /clear error:', err);
    res.json({ success: false, message: '服务器错误' });
  }
});

// GET /clear - 获取清除心魔的选项和消耗
router.get('/clear', async (req, res) => {
  const userId = extractUserId(req);
  try {
    const player = await storage.getOrCreatePlayer(userId);
    const energy = player.heartDemonEnergy || 0;
    const spiritStoneCost = Math.max(100, Math.floor(energy * 50));
    const materials = player.materials || {};
    res.json({
      success: true,
      heartDemonEnergy: energy,
      options: [
        {
          method: 'spirit_stones',
          name: '灵石净化',
          icon: '💰',
          desc: `消耗${spiritStoneCost}灵石清除${Math.ceil(spiritStoneCost / 50)}点心魔`,
          hasEnough: true, // 灵石由前端检查
          cost: spiritStoneCost
        },
        {
          method: 'purify_charm',
          name: '心魔净化符',
          icon: '📜',
          desc: '消耗1个净化符，清除50点心魔',
          hasEnough: (materials.purify_charm || 0) >= 1,
          count: materials.purify_charm || 0
        },
        {
          method: 'heart_pearl',
          name: '心魔珠',
          icon: '🔮',
          desc: `消耗1个心魔珠，清除全部${energy}点心魔`,
          hasEnough: (materials.heart_pearl || 0) >= 1,
          count: materials.heart_pearl || 0
        }
      ]
    });
  } catch (err) {
    res.json({ success: false, message: '服务器错误' });
  }
});

// =====================
// 扫荡功能
// =====================

// GET /sweep - 获取扫荡信息
router.get('/sweep', async (req, res) => {
  const userId = extractUserId(req);
  try {
    const player = await storage.getOrCreatePlayer(userId);
    setCachedPlayer(userId, player);
    const maxSweepable = Math.max(1, player.maxFloor - 1);
    const availableFloors = [];
    for (let f = 1; f <= maxSweepable; f++) {
      if (!(player.sweptFloorsToday || []).includes(f)) {
        const cfg = FLOOR_CONFIG[f - 1];
        const reward = calcSweepReward(f);
        availableFloors.push({ floor: f, name: cfg.name, soulCrystals: reward.soulCrystals, exp: reward.exp });
      }
    }
    const sweptFloors = (player.sweptFloorsToday || []).map(f => ({
      floor: f, name: FLOOR_CONFIG[f - 1]?.name || `第${f}层`
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
    console.error('heart_demon /sweep error:', err);
    res.json({ success: false, message: '服务器错误' });
  }
});

// POST /sweep - 单层扫荡
router.post('/sweep', async (req, res) => {
  const { userId, floor } = req.body;
  if (!floor || floor < 1) return res.json({ success: false, message: '无效层数' });
  try {
    const player = await storage.getOrCreatePlayer(userId);
    if (floor >= player.maxFloor) return res.json({ success: false, message: '该层尚未通关，无法扫荡' });
    if ((player.sweptFloorsToday || []).includes(floor)) return res.json({ success: false, message: '该层今日已扫荡，明日再来' });
    const MAX_SWEEP = 3;
    if ((player.todaySweepCount || 0) >= MAX_SWEEP) return res.json({ success: false, message: `今日扫荡次数已用完（${MAX_SWEEP}次/日）` });

    const reward = calcSweepReward(floor);
    const cfg = FLOOR_CONFIG[floor - 1];
    await storage.addSoulCrystals(userId, reward.soulCrystals);
    await storage.recordSweep(userId, floor, reward.soulCrystals, reward.exp);

    const updated = await storage.getOrCreatePlayer(userId);
    setCachedPlayer(userId, updated);

    res.json({
      success: true, floor, floorName: cfg.name,
      rewards: reward,
      todaySweepCount: updated.todaySweepCount,
      soulCrystals: updated.soulCrystals,
      sweptFloorsToday: updated.sweptFloorsToday,
      message: `扫荡第${floor}层「${cfg.name}」成功，获得魂晶×${reward.soulCrystals}，经验×${reward.exp}`
    });
  } catch (err) {
    console.error('heart_demon /sweep POST error:', err);
    res.json({ success: false, message: '服务器错误' });
  }
});

// POST /sweep/batch - 批量扫荡
router.post('/sweep/batch', async (req, res) => {
  const { userId, maxFloor } = req.body;
  if (!maxFloor || maxFloor < 1) return res.json({ success: false, message: '无效层数' });
  try {
    const player = await storage.getOrCreatePlayer(userId);
    const sweepableMax = Math.max(1, player.maxFloor - 1);
    const actualMax = Math.min(maxFloor, sweepableMax);
    const alreadySwept = player.sweptFloorsToday || [];
    const toSweep = [];
    for (let f = 1; f <= actualMax; f++) {
      if (!alreadySwept.includes(f)) toSweep.push(f);
    }
    const MAX_SWEEP = 3;
    const remainingSweep = MAX_SWEEP - (player.todaySweepCount || 0);
    if (remainingSweep <= 0) return res.json({ success: false, message: `今日扫荡次数已用完（${MAX_SWEEP}次/日）` });
    const toSweepActual = toSweep.slice(0, remainingSweep);
    if (toSweepActual.length === 0) return res.json({ success: false, message: '无可扫荡的层（均已扫荡或无法扫荡）' });

    let totalSc = 0, totalExp = 0;
    const results = [];
    for (const f of toSweepActual) {
      const reward = calcSweepReward(f);
      totalSc += reward.soulCrystals;
      totalExp += reward.exp;
      results.push({ floor: f, reward });
    }
    if (totalSc > 0) await storage.addSoulCrystals(userId, totalSc);
    for (const { floor, reward } of results) {
      await storage.recordSweep(userId, floor, reward.soulCrystals, reward.exp);
    }
    const updated = await storage.getOrCreatePlayer(userId);
    setCachedPlayer(userId, updated);

    const sweptNames = toSweepActual.map(f => FLOOR_CONFIG[f - 1]?.name || `第${f}层`).join('、');
    res.json({
      success: true,
      floorsSwept: toSweepActual, floorsSweepNames: sweptNames,
      totalSoulCrystals: totalSc, totalExp,
      todaySweepCount: updated.todaySweepCount, soulCrystals: updated.soulCrystals,
      sweptFloorsToday: updated.sweptFloorsToday,
      skippedFloors: toSweep.length - toSweepActual.length,
      message: `批量扫荡${toSweepActual.length}层（${sweptNames}），获得魂晶×${totalSc}，经验×${totalExp}`
    });
  } catch (err) {
    console.error('heart_demon /sweep/batch error:', err);
    res.json({ success: false, message: '服务器错误' });
  }
});

// =====================
// 商店系统
// =====================

// GET /shop - 心魔商店
router.get('/shop', async (req, res) => {
  const userId = extractUserId(req);
  try {
    const player = await storage.getOrCreatePlayer(userId);
    setCachedPlayer(userId, player);
    const shopItems = HEART_DEMON_SHOP.map(item => {
      let canBuy = true, reason = '';
      if (item.limit > 0) {
        const purchased = (player[`shop_${item.id}`] || 0);
        if (purchased >= item.limit) { canBuy = false; reason = '已达购买上限'; }
      }
      if (item.reward && item.reward.artifact) {
        if ((player.materials?.artifacts || []).includes(item.reward.artifact)) { canBuy = false; reason = '已拥有该装备'; }
      }
      return { ...item, canBuy, reason: canBuy ? '' : reason };
    });
    res.json({ soulCrystals: player.soulCrystals, items: shopItems });
  } catch (err) {
    res.json({ success: false, message: '服务器错误' });
  }
});

// POST /shop/buy - 购买商品
router.post('/shop/buy', async (req, res) => {
  const { userId, itemId } = req.body;
  const item = HEART_DEMON_SHOP.find(i => i.id === itemId);
  if (!item) return res.json({ success: false, message: '商品不存在' });
  try {
    const player = await storage.getOrCreatePlayer(userId);
    if (player.soulCrystals < item.cost) return res.json({ success: false, message: '魂晶不足' });
    if (item.limit > 0 && (player[`shop_${item.id}`] || 0) >= item.limit) return res.json({ success: false, message: '已达购买上限' });

    const result = await storage.spendSoulCrystals(userId, item.cost);
    if (!result) return res.json({ success: false, message: '魂晶不足' });

    player[`shop_${item.id}`] = (player[`shop_${item.id}`] || 0) + 1;

    let rewardDesc = '';
    const reward = { ...item.reward };
    if (reward.artifact) {
      player.materials = player.materials || {};
      player.materials.artifacts = player.materials.artifacts || [];
      player.materials.artifacts.push(reward.artifact);
      const artifactInfo = HEART_ARTIFACTS[reward.artifact];
      rewardDesc = `${artifactInfo?.icon || ''}${artifactInfo?.name || reward.artifact}`;
    } else if (reward.heart_pearl) {
      player.materials = player.materials || {};
      player.materials.heart_pearl = (player.materials.heart_pearl || 0) + reward.heart_pearl;
      rewardDesc = `心魔珠×${reward.heart_pearl}`;
    } else if (reward.soul_essence) {
      player.materials = player.materials || {};
      player.materials.soul_essence = (player.materials.soul_essence || 0) + reward.soul_essence;
      rewardDesc = `魂精华×${reward.soul_essence}`;
    } else if (reward.demon_heart) {
      player.materials = player.materials || {};
      player.materials.demon_heart = (player.materials.demon_heart || 0) + reward.demon_heart;
      rewardDesc = `魔心×${reward.demon_heart}`;
    } else if (reward.lingshi) {
      rewardDesc = `灵石×${reward.lingshi}`;
    } else if (reward.diamonds) {
      rewardDesc = `钻石×${reward.diamonds}`;
    }

    await storage.savePlayer(userId, player);
    setCachedPlayer(userId, player);
    res.json({ success: true, soulCrystals: Number(result.soulCrystals), reward: reward, rewardDesc, message: `消耗${item.cost}魂晶，获得${rewardDesc}` });
  } catch (err) {
    console.error('heart_demon /shop/buy error:', err);
    res.json({ success: false, message: '服务器错误' });
  }
});

// GET /artifacts - 心魔装备图鉴
router.get('/artifacts', async (req, res) => {
  const userId = extractUserId(req);
  try {
    const player = await storage.getOrCreatePlayer(userId);
    setCachedPlayer(userId, player);
    const artifacts = Object.values(HEART_ARTIFACTS).map(a => ({
      ...a, owned: (player.materials?.artifacts || []).includes(a.id)
    }));
    res.json({ artifacts, ownedArtifacts: player.materials?.artifacts || [] });
  } catch (err) {
    res.json({ success: false, message: '服务器错误' });
  }
});

// GET /materials - 材料背包
router.get('/materials', async (req, res) => {
  const userId = extractUserId(req);
  try {
    const player = await storage.getOrCreatePlayer(userId);
    setCachedPlayer(userId, player);
    res.json({ materials: player.materials, soulCrystals: player.soulCrystals });
  } catch (err) {
    res.json({ success: false, message: '服务器错误' });
  }
});

// =====================
// 周奖励
// =====================

// GET /weekly-reward - 周奖励信息
router.get('/weekly-reward', async (req, res) => {
  const userId = extractUserId(req);
  try {
    const player = await storage.getOrCreatePlayer(userId);
    setCachedPlayer(userId, player);
    const rewards = [
      { minKills: 10,  minSc: 100,  reward: { lingshi: 500 } },
      { minKills: 30,  minSc: 300,  reward: { lingshi: 1000, diamonds: 20 } },
      { minKills: 50,  minSc: 500,  reward: { lingshi: 2000, diamonds: 50 } },
      { minKills: 100, minSc: 1000, reward: { lingshi: 5000, diamonds: 100, artifact: 'heart_demon_crown' } }
    ];
    const qualified = rewards.filter(r => player.weeklyKillCount >= r.minKills && Number(player.weeklySoulCrystals) >= r.minSc);
    let nextReward = null;
    for (const r of rewards) {
      if (player.weeklyKillCount < r.minKills || Number(player.weeklySoulCrystals) < r.minSc) { nextReward = r; break; }
    }
    res.json({
      weeklyKillCount: player.weeklyKillCount, weeklySoulCrystals: Number(player.weeklySoulCrystals),
      weeklyRewardClaimed: player.weeklyRewardClaimed, qualifiedRewards: qualified, nextReward
    });
  } catch (err) {
    res.json({ success: false, message: '服务器错误' });
  }
});

// POST /weekly-reward/claim - 领取周奖励
router.post('/weekly-reward/claim', async (req, res) => {
  const { userId, rewardLevel } = req.body;
  try {
    const player = await storage.getOrCreatePlayer(userId);
    const rewards = [
      { minKills: 10,  minSc: 100,  reward: { lingshi: 500 }, level: 0 },
      { minKills: 30,  minSc: 300,  reward: { lingshi: 1000, diamonds: 20 }, level: 1 },
      { minKills: 50,  minSc: 500,  reward: { lingshi: 2000, diamonds: 50 }, level: 2 },
      { minKills: 100, minSc: 1000, reward: { lingshi: 5000, diamonds: 100, artifact: 'heart_demon_crown' }, level: 3 }
    ];
    const targetReward = rewards[rewardLevel];
    if (!targetReward) return res.json({ success: false, message: '无效奖励档位' });
    if (player.weeklyKillCount < targetReward.minKills || Number(player.weeklySoulCrystals) < targetReward.minSc) return res.json({ success: false, message: '未满足领取条件' });
    if (player.weeklyRewardClaimed) return res.json({ success: false, message: '本周奖励已领取' });

    player.weeklyRewardClaimed = true;
    let rewardDesc = '';
    if (targetReward.reward.artifact) {
      player.materials = player.materials || {};
      player.materials.artifacts = player.materials.artifacts || [];
      if (!player.materials.artifacts.includes(targetReward.reward.artifact)) {
        player.materials.artifacts.push(targetReward.reward.artifact);
      }
      const artifactInfo = HEART_ARTIFACTS[targetReward.reward.artifact];
      rewardDesc = `${artifactInfo?.icon || ''}${artifactInfo?.name || targetReward.reward.artifact}`;
    }
    await storage.savePlayer(userId, player);
    setCachedPlayer(userId, player);
    res.json({ success: true, reward: targetReward.reward, rewardDesc });
  } catch (err) {
    console.error('heart_demon /weekly-reward/claim error:', err);
    res.json({ success: false, message: '服务器错误' });
  }
});

// =====================
// 排行榜
// =====================

// GET /rankings - 心魔幻境排行榜
router.get('/rankings', async (req, res) => {
  const { type } = req.query;
  try {
    const { HeartDemonPlayer } = require('../heart_demon_storage');
    await require('../heart_demon_storage').initDatabase();
    const players = await HeartDemonPlayer.findAll({ raw: true });
    let sorted;
    if (type === 'kills') {
      sorted = players.sort((a, b) => (b.weeklyKillCount || 0) - (a.weeklyKillCount || 0));
    } else if (type === 'soulCrystals') {
      sorted = players.sort((a, b) => Number(b.weeklySoulCrystals || 0) - Number(a.weeklySoulCrystals || 0));
    } else {
      sorted = players.sort((a, b) => (b.maxFloor || 0) - (a.maxFloor || 0));
    }
    const rankings = sorted.slice(0, 50).map((p, i) => ({
      rank: i + 1, userId: p.userId,
      weeklyKills: p.weeklyKillCount || 0,
      weeklySoulCrystals: Number(p.weeklySoulCrystals || 0),
      maxFloor: p.maxFloor || 1
    }));
    res.json(rankings);
  } catch (err) {
    console.error('heart_demon rankings error:', err);
    res.json([]);
  }
});

module.exports = router;
