/**
 * 挂机修仙 - 星图 API (Starmap API)
 * 星图解锁、点亮、属性加成
 */
const express = require('express');
const router = express.Router();
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db = null;
function getDb() {
  if (!db) {
    const Database = require('better-sqlite3');
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
  }
  return db;
}

// 延迟初始化表
function initTables() {
  const database = getDb();
  try {
    database.exec(`
      CREATE TABLE IF NOT EXISTS player_starmap (
        player_id INTEGER PRIMARY KEY,
        unlocked_nodes TEXT DEFAULT '[]',
        lit_nodes TEXT DEFAULT '[]',
        total_bonus TEXT DEFAULT '{}',
        updated_at TEXT DEFAULT (datetime('now', '+8 hours'))
      )
    `);
    database.exec(`
      CREATE TABLE IF NOT EXISTS player_soul_essence (
        player_id INTEGER PRIMARY KEY,
        essence INTEGER DEFAULT 0,
        updated_at TEXT DEFAULT (datetime('now', '+8 hours'))
      )
    `);
    // 初始化星魂表
    database.exec(`
      CREATE TABLE IF NOT EXISTS player_souls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        soul_type TEXT NOT NULL,
        quality TEXT NOT NULL DEFAULT 'white',
        level INTEGER DEFAULT 1,
        is_equipped INTEGER DEFAULT 0,
        slot_index INTEGER,
        obtained_at TEXT DEFAULT (datetime('now', '+8 hours')),
        created_at TEXT DEFAULT (datetime('now', '+8 hours'))
      )
    `);
    // 初始化星魂碎片表
    database.exec(`
      CREATE TABLE IF NOT EXISTS player_soul_fragments (
        player_id INTEGER,
        soul_type TEXT,
        count INTEGER DEFAULT 0,
        PRIMARY KEY(player_id, soul_type)
      )
    `);
  } catch (e) {
    console.error('[starmap] initTables error:', e.message);
  }
}
initTables();

// 引入配置
let starmapConfig;
let soulConfig;
try {
  starmapConfig = require('../../game/starmap_config');
  soulConfig = require('../../game/soul_config');
} catch (e) {
  console.error('[starmap] config load error:', e.message);
  starmapConfig = {};
  soulConfig = {};
}

function extractPlayerId(req) {
  return parseInt(req.body?.player_id || req.query?.player_id || req.userId || 1) || 1;
}

// 确保玩家星图数据存在
function ensurePlayerStarmap(playerId) {
  const database = getDb();
  const existing = database.prepare('SELECT * FROM player_starmap WHERE player_id = ?').get(playerId);
  if (!existing) {
    database.prepare('INSERT INTO player_starmap (player_id) VALUES (?)').run(playerId);
    // 初始给100星魂精华
    database.prepare('INSERT OR IGNORE INTO player_soul_essence (player_id, essence) VALUES (?, ?)').run(playerId, 100);
  }
  return database.prepare('SELECT * FROM player_starmap WHERE player_id = ?').get(playerId);
}

// 确保玩家星魂精华存在
function ensureSoulEssence(playerId) {
  const database = getDb();
  const existing = database.prepare('SELECT * FROM player_soul_essence WHERE player_id = ?').get(playerId);
  if (!existing) {
    database.prepare('INSERT OR IGNORE INTO player_soul_essence (player_id, essence) VALUES (?, ?)').run(playerId, 100);
  }
  return database.prepare('SELECT essence FROM player_soul_essence WHERE player_id = ?').get(playerId);
}

// 获取玩家境界等级
function getPlayerRealmLevel(playerId) {
  const database = getDb();
  const player = database.prepare('SELECT realm_level FROM player WHERE id = ?').get(playerId);
  return player?.realm_level || 1;
}

// 计算某区域是否解锁
function isRegionUnlocked(regionKey, realmLevel) {
  const unlock = starmapConfig.STARMAP_UNLOCK?.[regionKey];
  if (!unlock) return false;
  return realmLevel >= unlock.realmLevel;
}

// 获取玩家的境界名称
function getPlayerRealmName(playerId) {
  const database = getDb();
  const player = database.prepare('SELECT realm_level FROM player WHERE id = ?').get(playerId);
  const rl = player?.realm_level || 1;
  return getRealmNameByLevel(rl);
}

function getRealmNameByLevel(level) {
  const realms = [
    { level: 1, name: '炼气期' }, { level: 5, name: '筑基期' },
    { level: 10, name: '金丹期' }, { level: 15, name: '元婴期' },
    { level: 20, name: '化神期' }, { level: 25, name: '炼虚期' },
    { level: 30, name: '合体期' }, { level: 35, name: '大乘期' },
    { level: 40, name: '渡劫期' }, { level: 50, name: '地仙' },
    { level: 60, name: '天仙' }, { level: 70, name: '金仙' },
    { level: 80, name: '太乙' }, { level: 90, name: '大罗' },
    { level: 100, name: '混元大罗' },
  ];
  let name = '凡人';
  for (const r of realms) {
    if (level >= r.level) name = r.name;
  }
  return name;
}

// ============ 星图 API ============

// GET /api/starmap/info - 星图全览
router.get('/info', (req, res) => {
  const playerId = extractPlayerId(req);
  const starmap = ensurePlayerStarmap(playerId);
  const realmLevel = getPlayerRealmLevel(playerId);
  const realmName = getPlayerRealmName(playerId);
  const essence = ensureSoulEssence(playerId);

  const unlockedNodes = JSON.parse(starmap.unlocked_nodes || '[]');
  const litNodes = JSON.parse(starmap.lit_nodes || '[]');
  const totalBonus = JSON.parse(starmap.total_bonus || '{}');

  // 计算各区域解锁状态
  const regions = {};
  for (const [key, region] of Object.entries(starmapConfig.STARMAP_UNLOCK || {})) {
    const unlocked = realmLevel >= region.realmLevel;
    const litCount = (region.nodes || []).filter(n => litNodes.includes(n)).length;
    const totalCount = (region.nodes || []).length;
    regions[key] = {
      key,
      name: region.realmName,
      unlocked,
      realmRequired: region.realmLevel,
      litCount,
      totalCount,
      progress: totalCount > 0 ? Math.round(litCount / totalCount * 100) : 0,
    };
  }

  // 总属性加成
  const bonus = starmapConfig.calcNodeStats ? totalBonus : {};

  res.json({
    success: true,
    playerId,
    realmLevel,
    realmName,
    essence: essence?.essence || 0,
    regions,
    totalLitNodes: litNodes.length,
    totalUnlockedNodes: unlockedNodes.length,
    totalBonus,
  });
});

// GET /api/starmap/nodes - 星宿节点列表
router.get('/nodes', (req, res) => {
  const playerId = extractPlayerId(req);
  const starmap = ensurePlayerStarmap(playerId);
  const realmLevel = getPlayerRealmLevel(playerId);
  const unlockedNodes = JSON.parse(starmap.unlocked_nodes || '[]');
  const litNodes = JSON.parse(starmap.lit_nodes || '[]');

  // 合并28星宿 + 四象星魂
  const allNodes = [];
  
  // 28星宿
  for (const [key, xiu] of Object.entries(starmapConfig.TWENTY_EIGHT_XIU || {})) {
    const unlockInfo = starmapConfig.getUnlockInfo?.(key);
    const regionUnlocked = unlockInfo ? realmLevel >= unlockInfo.realmLevel : true;
    const nodeLit = litNodes.includes(key);
    const nodeUnlocked = unlockInfo ? realmLevel >= unlockInfo.realmLevel : true;
    allNodes.push({
      id: key,
      name: xiu.name,
      type: 'xiu',
      symbol: xiu.symbol,
      element: xiu.element,
      coord: xiu.coord,
      quality: 'blue', // 默认蓝色品质
      lit: nodeLit,
      unlocked: nodeUnlocked,
      regionUnlocked,
      unlockRealm: unlockInfo?.realmLevel,
      unlockRealmName: unlockInfo?.realmName,
      description: xiu.description,
      stats: nodeLit ? starmapConfig.calcNodeStats?.(key, 'blue') : null,
    });
  }

  // 四象星魂
  for (const [key, soul] of Object.entries(starmapConfig.SYMBOL_SOULS || {})) {
    const unlockInfo = starmapConfig.getUnlockInfo?.(key);
    const regionUnlocked = unlockInfo ? realmLevel >= unlockInfo.realmLevel : true;
    const nodeLit = litNodes.includes(key);
    const nodeUnlocked = regionUnlocked;
    allNodes.push({
      id: key,
      name: soul.name,
      type: 'symbol',
      symbol: soul.symbol,
      element: soul.element || soulConfig.QUALITIES?.includes('red') ? 'red' : 'orange',
      coord: { x: 250, y: 180 }, // 中心位置
      quality: soul.quality,
      lit: nodeLit,
      unlocked: nodeUnlocked,
      regionUnlocked,
      unlockRealm: unlockInfo?.realmLevel,
      unlockRealmName: unlockInfo?.realmName,
      description: soul.description,
      stats: nodeLit ? starmapConfig.calcNodeStats?.(key, soul.quality) : null,
    });
  }

  res.json({ success: true, nodes: allNodes, count: allNodes.length });
});

// POST /api/starmap/lightup/:nodeId - 点亮星宿节点
router.post('/lightup/:nodeId', (req, res) => {
  const playerId = extractPlayerId(req);
  const { nodeId } = req.params;
  const starmap = ensurePlayerStarmap(playerId);
  const essenceData = ensureSoulEssence(playerId);
  const realmLevel = getPlayerRealmLevel(playerId);

  const unlockedNodes = JSON.parse(starmap.unlocked_nodes || '[]');
  const litNodes = JSON.parse(starmap.lit_nodes || '[]');

  // 检查节点是否存在
  const xiu = starmapConfig.TWENTY_EIGHT_XIU?.[nodeId];
  const symbolSoul = starmapConfig.SYMBOL_SOULS?.[nodeId];
  const nodeConfig = xiu || symbolSoul;
  if (!nodeConfig) {
    return res.json({ success: false, message: '星宿节点不存在' });
  }

  // 检查是否已点亮
  if (litNodes.includes(nodeId)) {
    return res.json({ success: false, message: '该星宿已点亮' });
  }

  // 检查是否解锁
  const unlockInfo = starmapConfig.getUnlockInfo?.(nodeId);
  if (unlockInfo && realmLevel < unlockInfo.realmLevel) {
    return res.json({ success: false, message: `需要境界达到${unlockInfo.realmName}才能解锁该星宿` });
  }

  // 计算消耗（根据品质）
  const quality = nodeConfig.quality || 'blue';
  const cost = starmapConfig.LIGHTUP_COSTS?.[quality] || 200;
  const currentEssence = essenceData?.essence || 0;

  if (currentEssence < cost) {
    return res.json({ success: false, message: `星魂精华不足，需要${cost}，当前${currentEssence}` });
  }

  // 扣除精华并点亮
  const database = getDb();
  const tx = database.transaction(() => {
    database.prepare('UPDATE player_soul_essence SET essence = essence - ? WHERE player_id = ?').run(cost, playerId);
    litNodes.push(nodeId);
    if (!unlockedNodes.includes(nodeId)) unlockedNodes.push(nodeId);
    database.prepare("UPDATE player_starmap SET lit_nodes = ?, unlocked_nodes = ?, updated_at = datetime('now', '+8 hours') WHERE player_id = ?")
      .run(JSON.stringify(litNodes), JSON.stringify(unlockedNodes), playerId);
  });
  tx();

  const newEssence = ensureSoulEssence(playerId);
  res.json({
    success: true,
    message: `${nodeConfig.name}已点亮！`,
    nodeId,
    cost,
    remainingEssence: newEssence?.essence || 0,
    stats: starmapConfig.calcNodeStats?.(nodeId, quality),
  });
});

// GET /api/starmap/bonus - 星图套装属性加成
router.get('/bonus', (req, res) => {
  const playerId = extractPlayerId(req);
  const starmap = ensurePlayerStarmap(playerId);
  const litNodes = JSON.parse(starmap.lit_nodes || '[]');

  // 按四象分组统计
  const symbolCounts = { qinglong: 0, baihu: 0, zhuque: 0, xuanwu: 0 };
  for (const nodeId of litNodes) {
    const xiu = starmapConfig.TWENTY_EIGHT_XIU?.[nodeId];
    if (xiu) symbolCounts[xiu.symbol]++;
  }

  // 计算各四象的套装加成
  const bonuses = {};
  for (const [symbol, count] of Object.entries(symbolCounts)) {
    const suit = starmapConfig.SUIT_BONUS || {};
    let activeBonus = null;
    if (count >= 6) activeBonus = suit[6];
    else if (count >= 4) activeBonus = suit[4];
    else if (count >= 2) activeBonus = suit[2];
    bonuses[symbol] = {
      symbol,
      litCount: count,
      activeSet: activeBonus?.name || null,
      bonus: activeBonus || null,
    };
  }

  // 总属性
  const totalStats = {
    attackBonus: 0,
    defenseBonus: 0,
    hpBonus: 0,
  };
  for (const b of Object.values(bonuses)) {
    if (b.bonus) {
      totalStats.attackBonus += b.bonus.attackBonus || 0;
      totalStats.defenseBonus += b.bonus.defenseBonus || 0;
      totalStats.hpBonus += b.bonus.hpBonus || 0;
    }
  }

  res.json({
    success: true,
    litCount: litNodes.length,
    bonuses,
    totalStats,
  });
});

module.exports = router;
