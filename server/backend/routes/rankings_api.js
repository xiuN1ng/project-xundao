/**
 * 排行榜 API (P89-1)
 * 挂机修仙游戏 - 排行榜系统
 *
 * API端点:
 * 1. GET  /api/rankings/power        - 战力排行榜
 * 2. GET  /api/rankings/wealth       - 财富排行榜
 * 3. GET  /api/rankings/sect         - 宗门排行榜
 * 4. GET  /api/rankings/achievement  - 成就排行榜
 * 5. GET  /api/rankings/arena        - 竞技场排行榜
 * 6. GET  /api/rankings/level        - 等级排行榜
 */

const express = require('express');
const router = express.Router();
const path = require('path');

const Logger = {
  info: (...args) => console.log('[rankings]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[rankings:error]', new Date().toISOString(), ...args)
};

const DB_PATH = path.join(__dirname, '..', 'data', 'game.db');

let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  Logger.info('数据库连接成功');
} catch (err) {
  Logger.error('数据库连接失败:', err.message);
  db = {
    prepare: () => ({ run: () => {}, get: () => null, all: () => [] }),
    exec: () => {}
  };
}

function getPlayerId(req) {
  const pid = parseInt(req.headers['x-player-id'] || req.body?.playerId || 1);
  return isNaN(pid) ? 1 : pid;
}

// ============================================================
// 5分钟缓存
// ============================================================
const CACHE_TTL = 5 * 60 * 1000;
const cache = {};
function isValid(key) { return Date.now() - (cache[key + '_t'] || 0) < CACHE_TTL; }

// ============================================================
// 境界名称
// ============================================================
function getRealmName(realmLevel) {
  const realms = [
    '筑基期','金丹期','元婴期','化神期','炼虚期','大乘期','渡劫期',
    '地仙境','天仙境','金仙境','太乙境','大罗境','混元大罗境',
    '圣人境','天道境','主宰境','永恒境','造化境','归一境','真我境'
  ];
  return realms[Math.min(realmLevel - 1, realms.length - 1)] || `第${realmLevel}境`;
}

// ============================================================
// 端点1: 战力排行榜
// ============================================================
router.get('/power', (req, res) => {
  const playerId = getPlayerId(req);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = parseInt(req.query.offset) || 0;

  try {
    const players = db.prepare(`
      SELECT u.id as playerId, u.username as playerName, u.level, u.realm,
             u.attack, u.defense, u.speed, u.vipLevel, COALESCE(u.combat_power, 0) as combatPower
      FROM Users u WHERE u.id > 0
    `).all();

    const rankings = players.map(p => ({
      playerId: p.playerId,
      playerName: p.playerName || `玩家${p.playerId}`,
      level: p.level || 1,
      realm: p.realm || 1,
      realmName: getRealmName(p.realm || 1),
      combatPower: p.combatPower || 0,
      attack: p.attack || 0,
      defense: p.defense || 0,
      speed: p.speed || 0,
      vipLevel: p.vipLevel || 0
    }));

    rankings.sort((a, b) => b.combatPower - a.combatPower);

    const myRank = rankings.findIndex(e => e.playerId === playerId) + 1;

    res.json({
      success: true,
      data: {
        rankings: rankings.slice(offset, offset + limit).map((r, i) => ({ ...r, rank: offset + i + 1 })),
        myRank: myRank || null,
        myPower: myRank ? rankings[myRank - 1].combatPower : 0,
        total: rankings.length
      }
    });
  } catch (e) {
    Logger.error('战力排行榜错误:', e.message);
    res.json({ success: false, error: '获取战力排行榜失败: ' + e.message });
  }
});

// ============================================================
// 端点2: 财富排行榜
// ============================================================
router.get('/wealth', (req, res) => {
  const playerId = getPlayerId(req);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = parseInt(req.query.offset) || 0;

  try {
    const users = db.prepare(`
      SELECT u.id as playerId, u.username as playerName, u.lingshi, u.diamonds,
             u.vipLevel, COALESCE(u.spirit_stone_reserve, 0) as spiritReserve
      FROM Users u WHERE u.id > 0
    `).all();

    const rankings = users.map(u => ({
      playerId: u.playerId,
      playerName: u.playerName || `玩家${u.playerId}`,
      lingshi: u.lingshi || 0,
      diamonds: u.diamonds || 0,
      spiritReserve: u.spiritReserve || 0,
      totalWealth: (u.lingshi || 0) + (u.diamonds || 0) * 100 + (u.spiritReserve || 0) * 10,
      vipLevel: u.vipLevel || 0
    }));

    rankings.sort((a, b) => b.totalWealth - a.totalWealth);

    const myRank = rankings.findIndex(e => e.playerId === playerId) + 1;

    res.json({
      success: true,
      data: {
        rankings: rankings.slice(offset, offset + limit).map((r, i) => ({ ...r, rank: offset + i + 1 })),
        myRank: myRank || null,
        myWealth: myRank ? rankings[myRank - 1].totalWealth : 0,
        total: rankings.length
      }
    });
  } catch (e) {
    Logger.error('财富排行榜错误:', e.message);
    res.json({ success: false, error: '获取财富排行榜失败: ' + e.message });
  }
});

// ============================================================
// 端点3: 宗门排行榜
// ============================================================
router.get('/sect', (req, res) => {
  const playerId = getPlayerId(req);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = parseInt(req.query.offset) || 0;

  try {
    const sects = db.prepare(`
      SELECT s.*, COUNT(sm.id) as memberCount
      FROM Sects s
      LEFT JOIN SectMembers sm ON sm.sectId = s.id
      GROUP BY s.id
      ORDER BY s.rank ASC, s.contribution DESC, s.level DESC
    `).all();

    const rankings = sects.map(s => ({
      sectId: s.id,
      sectName: s.name,
      icon: s.icon || '🏯',
      level: s.level || 1,
      leaderId: s.leaderId,
      memberCount: s.memberCount || 1,
      maxMembers: s.max_members || 50,
      contribution: s.contribution || 0,
      funds: s.funds || 0,
      rank: s.rank || 999,
      construction: s.construction || 0
    }));

    rankings.sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return b.contribution - a.contribution;
    });

    const myMember = db.prepare('SELECT sectId FROM SectMembers WHERE userId = ?').get(playerId);
    const myRank = myMember ? rankings.findIndex(e => e.sectId === myMember.sectId) + 1 : null;

    res.json({
      success: true,
      data: {
        rankings: rankings.slice(offset, offset + limit).map((r, i) => ({ ...r, rank: offset + i + 1 })),
        myRank,
        mySectId: myMember?.sectId || null,
        total: rankings.length
      }
    });
  } catch (e) {
    Logger.error('宗门排行榜错误:', e.message);
    res.json({ success: false, error: '获取宗门排行榜失败: ' + e.message });
  }
});

// ============================================================
// 端点4: 成就排行榜
// ============================================================
router.get('/achievement', (req, res) => {
  const playerId = getPlayerId(req);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = parseInt(req.query.offset) || 0;

  try {
    // 检查achievement_progress表结构
    const cols = db.prepare("PRAGMA table_info(achievement_progress)").all();
    const colNames = cols.map(c => c.name);
    
    let query;
    if (colNames.includes('points')) {
      query = `
        SELECT u.id as playerId, u.username as playerName,
               COALESCE(SUM(ap.points), 0) as totalPoints,
               COUNT(CASE WHEN ap.completed = 1 THEN 1 END) as completedCount
        FROM Users u
        LEFT JOIN achievement_progress ap ON ap.user_id = u.id
        WHERE u.id > 0
        GROUP BY u.id
        ORDER BY totalPoints DESC, completedCount DESC
      `;
    } else {
      // 没有points列，用completed count作为分数
      query = `
        SELECT u.id as playerId, u.username as playerName,
               COUNT(CASE WHEN ap.completed = 1 THEN 1 END) as completedCount,
               COUNT(ap.id) as totalCount
        FROM Users u
        LEFT JOIN achievement_progress ap ON ap.user_id = u.id
        WHERE u.id > 0
        GROUP BY u.id
        ORDER BY completedCount DESC, totalCount DESC
      `;
    }

    const players = db.prepare(query).all();
    const rankings = players.map(p => ({
      playerId: p.playerId,
      playerName: p.playerName || `玩家${p.playerId}`,
      score: p.totalPoints || p.completedCount || 0,
      completedCount: p.completedCount || 0,
      totalCount: p.totalCount || 0
    }));

    const myRank = rankings.findIndex(e => e.playerId === playerId) + 1;

    res.json({
      success: true,
      data: {
        rankings: rankings.slice(offset, offset + limit).map((r, i) => ({ ...r, rank: offset + i + 1 })),
        myRank: myRank || null,
        myScore: myRank ? rankings[myRank - 1].score : 0,
        total: rankings.length
      }
    });
  } catch (e) {
    Logger.error('成就排行榜错误:', e.message);
    res.json({ success: false, error: '获取成就排行榜失败: ' + e.message });
  }
});

// ============================================================
// 端点5: 竞技场排行榜
// ============================================================
router.get('/arena', (req, res) => {
  const playerId = getPlayerId(req);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = parseInt(req.query.offset) || 0;

  try {
    const players = db.prepare(`
      SELECT ap.player_id as playerId, ap.arena_points as arenaPoints, ap.win_count, ap.lose_count,
             ap.rank_name, u.username as playerName, u.level
      FROM arena_player ap
      JOIN Users u ON u.id = ap.player_id
      WHERE ap.player_id > 0
      ORDER BY ap.arena_points DESC, ap.win_count DESC
    `).all();

    const rankings = players.map((p, idx) => ({
      rank: idx + 1,
      playerId: p.playerId,
      playerName: p.playerName || `玩家${p.playerId}`,
      level: p.level || 1,
      arenaPoints: p.arenaPoints || 0,
      winCount: p.win_count || 0,
      loseCount: p.lose_count || 0,
      rankName: p.rank_name || '凡人'
    }));

    const myRank = rankings.findIndex(e => e.playerId === playerId) + 1;

    res.json({
      success: true,
      data: {
        rankings: rankings.slice(offset, offset + limit),
        myRank: myRank || null,
        myPoints: myRank ? rankings[myRank - 1].arenaPoints : 0,
        total: rankings.length
      }
    });
  } catch (e) {
    Logger.error('竞技场排行榜错误:', e.message);
    res.json({ success: false, error: '获取竞技场排行榜失败: ' + e.message });
  }
});

// ============================================================
// 端点6: 等级排行榜
// ============================================================
router.get('/level', (req, res) => {
  const playerId = getPlayerId(req);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = parseInt(req.query.offset) || 0;

  try {
    const players = db.prepare(`
      SELECT u.id as playerId, u.username as playerName, u.level, u.realm, u.vipLevel
      FROM Users u WHERE u.id > 0
      ORDER BY u.realm DESC, u.level DESC
    `).all();

    const rankings = players.map((p, idx) => ({
      rank: idx + 1,
      playerId: p.playerId,
      playerName: p.playerName || `玩家${p.playerId}`,
      level: p.level || 1,
      realm: p.realm || 1,
      realmName: getRealmName(p.realm || 1),
      vipLevel: p.vipLevel || 0
    }));

    const myRank = rankings.findIndex(e => e.playerId === playerId) + 1;

    res.json({
      success: true,
      data: {
        rankings: rankings.slice(offset, offset + limit),
        myRank: myRank || null,
        total: rankings.length
      }
    });
  } catch (e) {
    Logger.error('等级排行榜错误:', e.message);
    res.json({ success: false, error: '获取等级排行榜失败: ' + e.message });
  }
});

module.exports = router;
Logger.info('排行榜模块加载完成');
