/**
 * 排行榜系统 API - 扩展版
 * 支持: combat, level, wealth, chapter, realm, sect_contrib, total_recharge
 */
const express = require('express');
const router = express.Router();
const path = require('path');

// DB path: server/backend/data/game.db
const DB_PATH = path.join(__dirname, '..', 'data', 'game.db');
let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
} catch (e) {
  console.error('[ranking] DB连接失败:', e.message);
}

// 排行榜配置
const RANKING_CONFIGS = {
  combat: {
    title: '战力排行',
    icon: '⚔️',
    description: '战斗力排行',
    orderBy: 'combat',
    order: 'DESC',
  },
  level: {
    title: '等级排行',
    icon: '📊',
    description: '等级越高，排名越高',
    orderBy: 'level',
    order: 'DESC',
  },
  wealth: {
    title: '财富排行',
    icon: '💎',
    description: '灵石排行',
    orderBy: 'lingshi',
    order: 'DESC',
  },
  chapter: {
    title: '章节排行',
    icon: '🏰',
    description: '章节进度排行',
    orderBy: 'floor',
    order: 'DESC',
  },
  realm: {
    title: '境界排行',
    icon: '🧘',
    description: '境界越高，排名越高',
    orderBy: 'realm',
    order: 'DESC',
  },
  sect_contrib: {
    title: '贡献排行',
    icon: '🏯',
    description: '宗门贡献排行',
    orderBy: 'contribution',
    order: 'DESC',
  },
  total_recharge: {
    title: '氪金排行',
    icon: '💰',
    description: '累计充值排行',
    orderBy: 'total_recharge',
    order: 'DESC',
  },
};

// 计算战斗力的公式（与 rank.js / arena.js 保持一致）
function calcCombatPower(p) {
  if (!p) return 0;
  const level = p.level || 1;
  const realm = p.realm || 1;
  const atk = p.attack || 100;
  const def = p.defense || 50;
  const hp = p.hp || 1000;
  return Math.floor(atk * 10 + def * 5 + hp / 10 + level * 50 + realm * 500);
}

// 获取战力榜（真实计算 combatPower，排除 id <= 0）
function getCombatRank(limit = 50) {
  if (!db) return [];
  try {
    const rows = db.prepare(`
      SELECT u.id as userId,
             COALESCE(u.nickname, u.username, '玩家') as name,
             u.level,
             u.realm,
             u.attack,
             u.defense,
             u.hp,
             FLOOR(u.attack * 10 + u.defense * 5 + u.hp / 10 + u.level * 50 + u.realm * 500) as combatPower
      FROM Users u
      WHERE u.id > 0
      ORDER BY combatPower DESC
      LIMIT ?
    `).all(limit);
    return rows.map((r, i) => ({
      rank: i + 1,
      userId: r.userId,
      name: r.name,
      level: r.level,
      realm: r.realm,
      combatPower: Math.floor(r.combatPower),
    }));
  } catch (e) {
    console.error('[ranking] combat查询失败:', e.message);
    return [];
  }
}

// 获取等级榜
function getLevelRank(limit = 50) {
  if (!db) return [];
  try {
    const rows = db.prepare(`
      SELECT u.id as userId,
             COALESCE(u.nickname, u.username, '玩家') as name,
             u.level,
             u.realm
      FROM Users u
      WHERE u.id > 0
      ORDER BY u.level DESC, u.realm DESC
      LIMIT ?
    `).all(limit);
    return rows.map((r, i) => ({
      rank: i + 1,
      userId: r.userId,
      name: r.name,
      level: r.level,
      realm: r.realm,
      value: r.level,
    }));
  } catch (e) {
    console.error('[ranking] level查询失败:', e.message);
    return [];
  }
}

// 获取财富榜
function getWealthRank(limit = 50) {
  if (!db) return [];
  try {
    const rows = db.prepare(`
      SELECT id as userId,
             COALESCE(nickname, username, '玩家') as name,
             lingshi as spiritStones,
             diamonds
      FROM Users
      WHERE id > 0
      ORDER BY lingshi DESC
      LIMIT ?
    `).all(limit);
    return rows.map((r, i) => ({
      rank: i + 1,
      userId: r.userId,
      name: r.name,
      value: r.spiritStones,
      spiritStones: r.spiritStones,
      diamonds: r.diamonds || 0,
    }));
  } catch (e) {
    console.error('[ranking] wealth查询失败:', e.message);
    return [];
  }
}

// 获取章节/爬塔榜（基于 tower_progress.highest_floor）
function getChapterRank(limit = 50) {
  if (!db) return [];
  try {
    const rows = db.prepare(`
      SELECT tp.player_id as userId,
             COALESCE(u.nickname, u.username, '玩家') as name,
             tp.highest_floor as floor,
             tp.total_wins as wins
      FROM tower_progress tp
      LEFT JOIN Users u ON u.id = tp.player_id
      WHERE tp.player_id > 0
      ORDER BY tp.highest_floor DESC, tp.total_wins DESC
      LIMIT ?
    `).all(limit);
    return rows.map((r, i) => ({
      rank: i + 1,
      userId: parseInt(r.userId),
      name: r.name,
      floor: r.floor,
      value: r.floor,
      wins: r.wins,
    }));
  } catch (e) {
    console.error('[ranking] chapter查询失败:', e.message);
    return [];
  }
}

// 获取境界榜（基于 Users.realm + level 作为次级排序）
function getRealmRank(limit = 50) {
  if (!db) return [];
  try {
    const rows = db.prepare(`
      SELECT u.id as userId,
             COALESCE(u.nickname, u.username, '玩家') as name,
             u.realm,
             u.level
      FROM Users u
      WHERE u.id > 0
      ORDER BY u.realm DESC, u.level DESC
      LIMIT ?
    `).all(limit);
    return rows.map((r, i) => ({
      rank: i + 1,
      userId: r.userId,
      name: r.name,
      realm: r.realm,
      level: r.level,
      value: r.realm,
    }));
  } catch (e) {
    console.error('[ranking] realm查询失败:', e.message);
    return [];
  }
}

// 获取宗门贡献榜（基于 SectMembers.contribution，JOIN Users 获取昵称）
function getSectContribRank(limit = 50) {
  if (!db) return [];
  try {
    const rows = db.prepare(`
      SELECT sm.userId,
             COALESCE(u.nickname, u.username, '玩家') as name,
             sm.contribution,
             sm.role
      FROM SectMembers sm
      LEFT JOIN Users u ON u.id = sm.userId
      WHERE sm.userId > 0
      ORDER BY sm.contribution DESC
      LIMIT ?
    `).all(limit);
    return rows.map((r, i) => ({
      rank: i + 1,
      userId: parseInt(r.userId),
      name: r.name,
      contribution: r.contribution,
      role: r.role,
      value: r.contribution,
    }));
  } catch (e) {
    console.error('[ranking] sect_contrib查询失败:', e.message);
    return [];
  }
}

// 获取累计充值榜（基于 payment_orders，status = 'paid'）
function getTotalRechargeRank(limit = 50) {
  if (!db) return [];
  try {
    const rows = db.prepare(`
      SELECT po.user_id as userId,
             COALESCE(u.nickname, u.username, '玩家') as name,
             SUM(po.amount) as total_recharge
      FROM payment_orders po
      LEFT JOIN Users u ON u.id = po.user_id
      WHERE po.status = 'paid' AND po.user_id > 0
      GROUP BY po.user_id
      ORDER BY total_recharge DESC
      LIMIT ?
    `).all(limit);
    return rows.map((r, i) => ({
      rank: i + 1,
      userId: parseInt(r.userId),
      name: r.name,
      totalRecharge: Math.floor(r.total_recharge || 0),
      value: Math.floor(r.total_recharge || 0),
    }));
  } catch (e) {
    console.error('[ranking] total_recharge查询失败:', e.message);
    return [];
  }
}

// 获取玩家在指定排行榜的当前排名
function getPlayerMyRank(uid, type) {
  if (!db || uid <= 0) return null;
  try {
    if (type === 'combat') {
      const p = db.prepare(`SELECT attack, defense, hp, level, realm FROM Users WHERE id = ? AND id > 0`).get(uid);
      if (!p) return null;
      const power = calcCombatPower(p);
      const rank = db.prepare(`SELECT COUNT(*) + 1 as r FROM Users WHERE id > 0 AND FLOOR(attack * 10 + defense * 5 + hp / 10 + level * 50 + realm * 500) > ?`).get(power);
      return { myRank: rank.r, value: power };
    }
    if (type === 'level') {
      const player = db.prepare(`SELECT level, realm FROM Users WHERE id = ? AND id > 0`).get(uid);
      if (!player) return null;
      const rank = db.prepare(`SELECT COUNT(*) + 1 as r FROM Users WHERE id > 0 AND (level > ? OR (level = ? AND realm > ?))`).get(player.level, player.level, player.realm);
      return { myRank: rank.r, value: player.level };
    }
    if (type === 'wealth') {
      const player = db.prepare(`SELECT lingshi FROM Users WHERE id = ? AND id > 0`).get(uid);
      if (!player) return null;
      const rank = db.prepare(`SELECT COUNT(*) + 1 as r FROM Users WHERE id > 0 AND lingshi > ?`).get(player.lingshi);
      return { myRank: rank.r, value: player.lingshi };
    }
    if (type === 'realm') {
      const player = db.prepare(`SELECT realm, level FROM Users WHERE id = ? AND id > 0`).get(uid);
      if (!player) return null;
      const rank = db.prepare(`SELECT COUNT(*) + 1 as r FROM Users WHERE id > 0 AND (realm > ? OR (realm = ? AND level > ?))`).get(player.realm, player.realm, player.level);
      return { myRank: rank.r, value: player.realm };
    }
    if (type === 'sect_contrib') {
      const member = db.prepare(`SELECT contribution FROM SectMembers WHERE userId = ?`).get(uid);
      if (!member) return null;
      const rank = db.prepare(`SELECT COUNT(*) + 1 as r FROM SectMembers WHERE userId > 0 AND contribution > ?`).get(member.contribution);
      return { myRank: rank.r, value: member.contribution };
    }
    if (type === 'total_recharge') {
      const row = db.prepare(`SELECT SUM(amount) as total FROM payment_orders WHERE user_id = ? AND status = 'paid'`).get(uid);
      const total = row ? (row.total || 0) : 0;
      const rank = db.prepare(`SELECT COUNT(*) + 1 as r FROM (SELECT user_id, SUM(amount) as total FROM payment_orders WHERE status = 'paid' AND user_id > 0 GROUP BY user_id HAVING total > ?)`).get(total);
      return { myRank: rank.r, value: Math.floor(total) };
    }
  } catch (e) {
    console.error('[ranking] myRank查询失败:', e.message);
  }
  return null;
}

// GET /api/ranking - 排行榜概览
router.get('/', (req, res) => {
  const available = Object.keys(RANKING_CONFIGS);
  res.json({
    success: true,
    types: available.map(t => ({
      type: t,
      ...RANKING_CONFIGS[t],
    })),
  });
});

// GET /api/ranking/:type - 获取指定排行榜
router.get('/:type', (req, res) => {
  const { type } = req.params;
  const { limit, player_id } = req.query;
  const n = Math.min(parseInt(limit) || 10, 100);
  const uid = parseInt(player_id) || 0;

  if (!RANKING_CONFIGS[type]) {
    return res.json({
      success: false,
      error: '未知排行榜类型',
      types: Object.keys(RANKING_CONFIGS),
    });
  }

  let result;
  switch (type) {
    case 'combat':       result = getCombatRank(n);        break;
    case 'level':        result = getLevelRank(n);          break;
    case 'wealth':       result = getWealthRank(n);         break;
    case 'chapter':      result = getChapterRank(n);        break;
    case 'realm':        result = getRealmRank(n);          break;
    case 'sect_contrib': result = getSectContribRank(n);    break;
    case 'total_recharge': result = getTotalRechargeRank(n); break;
    default:
      return res.json({ success: false, error: '未实现的排行榜' });
  }

  // 附加当前玩家排名
  if (uid > 0) {
    const myRank = getPlayerMyRank(uid, type);
    return res.json({ success: true, data: result, myRank });
  }

  res.json({ success: true, data: result });
});

module.exports = router;
