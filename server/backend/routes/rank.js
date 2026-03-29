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
  console.error('[rank] DB连接失败:', e.message);
}

// 计算战斗力的公式（与 arena.js 保持一致）
function calcCombatPower(p) {
  if (!p) return 0;
  // 基于等级/境界/属性综合计算
  const level = p.level || 1;
  const realm = p.realm || 1;
  const atk = p.attack || 100;
  const def = p.defense || 50;
  const hp = p.hp || 1000;
  return Math.floor(atk * 10 + def * 5 + hp / 10 + level * 500 + realm * 2000);
}

// 获取战力榜（从 Users 表实时查询，排除 fake AI，真实计算 combatPower）
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
      combatPower: Math.floor(r.combatPower)
    }));
  } catch (e) {
    console.error('[rank] combat查询失败:', e.message);
    return [];
  }
}

// 获取等级榜（从 Users 表，排除 fake AI）
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
      value: r.level
    }));
  } catch (e) {
    console.error('[rank] level查询失败:', e.message);
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
      ORDER BY lingshi DESC
      LIMIT ?
    `).all(limit);
    return rows.map((r, i) => ({
      rank: i + 1,
      userId: r.userId,
      name: r.name,
      value: r.spiritStones,
      spiritStones: r.spiritStones,
      diamonds: r.diamonds || 0
    }));
  } catch (e) {
    console.error('[rank] wealth查询失败:', e.message);
    return [];
  }
}

// 获取章节/爬塔榜（基于 tower_progress.highest_floor，排除 fake AI）
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
      wins: r.wins
    }));
  } catch (e) {
    console.error('[rank] chapter查询失败:', e.message);
    return [];
  }
}

// 获取所有排行榜概览（根路径）
router.get('/', (req, res) => {
  try {
    const combat = getCombatRank(100);
    const level = getLevelRank(100);
    const wealth = getWealthRank(100);
    const chapter = getChapterRank(100);
    res.json({
      combat: { type: 'combat', label: '战力榜', count: combat.length },
      level: { type: 'level', label: '等级榜', count: level.length },
      wealth: { type: 'wealth', label: '财富榜', count: wealth.length },
      chapter: { type: 'chapter', label: '章节榜', count: chapter.length }
    });
  } catch (e) {
    console.error('[rank] / 错误:', e.message);
    res.json({ combat: { type: 'combat', label: '战力榜', count: 0 }, level: { type: 'level', label: '等级榜', count: 0 }, wealth: { type: 'wealth', label: '财富榜', count: 0 }, chapter: { type: 'chapter', label: '章节榜', count: 0 } });
  }
});

// 获取各类排行榜
router.get('/:type', (req, res) => {
  const { type } = req.params;
  const { limit } = req.query;
  const n = Math.min(parseInt(limit) || 50, 100);

  let result;
  switch (type) {
    case 'combat': result = getCombatRank(n); break;
    case 'level':  result = getLevelRank(n);  break;
    case 'wealth': result = getWealthRank(n); break;
    case 'chapter': result = getChapterRank(n); break;
    default:
      return res.json({ error: '未知排行榜类型', types: ['combat', 'level', 'wealth', 'chapter'] });
  }

  res.json(result);
});

// 获取玩家在指定排行榜的排名
router.get('/:type/:userId', (req, res) => {
  const { type, userId } = req.params;
  const uid = parseInt(userId);

  let list;
  switch (type) {
    case 'combat': list = getCombatRank(200); break;
    case 'level':  list = getLevelRank(200);  break;
    case 'wealth': list = getWealthRank(200); break;
    case 'chapter': list = getChapterRank(200); break;
    default:
      return res.json({ error: '未知排行榜类型' });
  }

  const player = list.find(r => r.userId === uid);
  if (!player) {
    return res.json({ rank: list.length + 1, userId: uid, type });
  }
  res.json(player);
});

module.exports = router;
