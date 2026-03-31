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

// 高战力AI池（用于填充空白名次）
const FAKE_AI_PLAYERS = [
  { userId: -1, name: '天机阁主', level: 95, realm: 9, combatPower: 158000 },
  { userId: -2, name: '青云剑仙', level: 88, realm: 9, combatPower: 142000 },
  { userId: -3, name: '混元魔尊', level: 82, realm: 8, combatPower: 128000 },
  { userId: -4, name: '万妖女帝', level: 75, realm: 8, combatPower: 105000 },
  { userId: -5, name: '太虚真人', level: 68, realm: 7, combatPower: 88000 },
];

// 计算战斗力的公式（与 arena.js 保持一致）
function calcCombatPower(p) {
  if (!p) return 0;
  const level = p.level || 1;
  const realm = p.realm || 1;
  const atk = p.attack || 100;
  const def = p.defense || 50;
  const hp = p.hp || 1000;
  return Math.floor(atk * 10 + def * 5 + hp / 10 + level * 500 + realm * 2000);
}

// 获取玩家在战力榜的当前排名
function getPlayerCombatRank(uid) {
  if (!db) return null;
  try {
    const player = db.prepare(`
      SELECT FLOOR(attack * 10 + defense * 5 + hp / 10 + level * 50 + realm * 500) as combatPower
      FROM Users WHERE id = ? AND id > 0
    `).get(uid);
    if (!player) return null;
    const power = player.combatPower;
    const rank = db.prepare(`
      SELECT COUNT(*) + 1 as myRank
      FROM Users
      WHERE id > 0 AND FLOOR(attack * 10 + defense * 5 + hp / 10 + level * 50 + realm * 500) > ?
    `).get(power);
    return { myRank: rank.myRank, combatPower: power };
  } catch (e) {
    console.error('[rank] myRank查询失败:', e.message);
    return null;
  }
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
    const realPlayers = rows.map((r, i) => ({
      rank: i + 1,
      userId: r.userId,
      name: r.name,
      level: r.level,
      realm: r.realm,
      combatPower: Math.floor(r.combatPower),
      isAI: false
    }));

    // 真实玩家数量少于5时，补充AI填充前5名
    if (realPlayers.length < 5) {
      const needed = 5 - realPlayers.length;
      const topAI = FAKE_AI_PLAYERS.slice(0, needed).map((ai, i) => ({
        rank: realPlayers.length + i + 1,
        userId: ai.userId,
        name: ai.name,
        level: ai.level,
        realm: ai.realm,
        combatPower: ai.combatPower,
        isAI: true
      }));
      return [...realPlayers, ...topAI];
    }
    return realPlayers;
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

// 获取玩家境界榜排名
function getPlayerRealmRank(uid) {
  if (!db) return null;
  try {
    const player = db.prepare(`SELECT realm, level FROM Users WHERE id = ? AND id > 0`).get(uid);
    if (!player) return null;
    const rank = db.prepare(`
      SELECT COUNT(*) + 1 as myRank
      FROM Users
      WHERE id > 0 AND (realm > ? OR (realm = ? AND level > ?))
    `).get(player.realm, player.realm, player.level);
    return { myRank: rank.myRank, realm: player.realm, level: player.level };
  } catch (e) {
    console.error('[rank] realmRank查询失败:', e.message);
    return null;
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

// 获取各类排行榜（支持 ?player_id=X 查询当前玩家排名）
// ============ 排行榜周报奖励系统 ============

// 周报奖励配置
const WEEKLY_REWARDS = [
  { minRank: 1,  maxRank: 1,  lingshi: 5000, title: '傲视群雄', titleIcon: '👑', desc: '战力榜第1名' },
  { minRank: 2,  maxRank: 3,  lingshi: 3000, title: '登堂入室', titleIcon: '🏆', desc: '战力榜第2-3名' },
  { minRank: 4,  maxRank: 10, lingshi: 1500, title: null,       titleIcon: '🥈', desc: '战力榜第4-10名' },
  { minRank: 11, maxRank: 50, lingshi: 800,  title: null,       titleIcon: '🥉', desc: '战力榜第11-50名' },
  { minRank: 51, maxRank: 100,lingshi: 300,  title: null,       titleIcon: '🎖️', desc: '战力榜第51-100名' },
];

// 初始化周报奖励表
if (db) {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS rank_weekly_rewards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        week_key TEXT NOT NULL,
        rank_type TEXT NOT NULL DEFAULT 'combat',
        rank INTEGER NOT NULL,
        lingshi_awarded INTEGER DEFAULT 0,
        title_awarded TEXT,
        claimed_at TEXT DEFAULT (datetime('now', '+8 hours')),
        UNIQUE(player_id, week_key, rank_type)
      )
    `);
  } catch (e) {
    console.error('[rank] weekly_rewards表初始化失败:', e.message);
  }
}

// 获取本周 week_key (格式: 2026-W13)
function getWeekKey() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

// 获取玩家在战力榜的排名
function getPlayerCombatRankNum(uid) {
  if (!db) return null;
  try {
    const player = db.prepare(`
      SELECT FLOOR(attack * 10 + defense * 5 + hp / 10 + level * 50 + realm * 500) as combatPower
      FROM Users WHERE id = ? AND id > 0
    `).get(uid);
    if (!player) return null;
    const power = player.combatPower;
    const rank = db.prepare(`
      SELECT COUNT(*) + 1 as myRank
      FROM Users
      WHERE id > 0 AND FLOOR(attack * 10 + defense * 5 + hp / 10 + level * 50 + realm * 500) > ?
    `).get(power);
    return rank.myRank;
  } catch (e) {
    return null;
  }
}

// GET /api/rank/weekly-status - 获取本周排名和可领取奖励
router.get('/weekly-status', (req, res) => {
  const playerId = parseInt(req.query.player_id) || 1;
  const weekKey = getWeekKey();
  if (!db) return res.json({ success: false, message: '数据库不可用' });

  try {
    const rankNum = getPlayerCombatRankNum(playerId);
    if (rankNum === null) return res.json({ success: false, message: '玩家不存在' });

    const claimed = db.prepare(
      'SELECT * FROM rank_weekly_rewards WHERE player_id = ? AND week_key = ? AND rank_type = ?'
    ).get(playerId, weekKey, 'combat');

    const reward = WEEKLY_REWARDS.find(r => rankNum >= r.minRank && rankNum <= r.maxRank) || null;
    res.json({
      success: true,
      data: {
        weekKey,
        rank: rankNum,
        reward,
        claimed: !!claimed,
        claimedAt: claimed ? claimed.claimed_at : null,
        tiers: WEEKLY_REWARDS.map(r => ({
          range: r.maxRank === r.minRank ? `#${r.minRank}` : `#${r.minRank}-${r.maxRank}`,
          lingshi: r.lingshi,
          title: r.title ? `${r.titleIcon} ${r.title}` : null,
          desc: r.desc
        }))
      }
    });
  } catch (e) {
    console.error('[rank] GET /weekly-status error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// POST /api/rank/claim-weekly - 领取周报奖励
router.post('/claim-weekly', (req, res) => {
  const { player_id } = req.body;
  const uid = parseInt(player_id);
  if (!uid) return res.json({ success: false, message: '缺少 player_id' });
  const weekKey = getWeekKey();
  if (!db) return res.json({ success: false, message: '数据库不可用' });

  try {
    const existing = db.prepare(
      'SELECT * FROM rank_weekly_rewards WHERE player_id = ? AND week_key = ? AND rank_type = ?'
    ).get(uid, weekKey, 'combat');
    if (existing) return res.json({ success: false, message: '本周奖励已领取，请勿重复领取' });

    const rankNum = getPlayerCombatRankNum(uid);
    if (rankNum === null) return res.json({ success: false, message: '玩家不存在' });
    if (rankNum > 100) return res.json({ success: false, message: `当前排名#${rankNum}，需进入前100名才能领取奖励` });

    const reward = WEEKLY_REWARDS.find(r => rankNum >= r.minRank && rankNum <= r.maxRank);
    if (!reward) return res.json({ success: false, message: '未获得本周奖励' });

    const transaction = db.transaction(() => {
      if (reward.lingshi > 0) {
        db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(reward.lingshi, uid);
      }
      db.prepare(`
        INSERT INTO rank_weekly_rewards (player_id, week_key, rank_type, rank, lingshi_awarded, title_awarded, claimed_at)
        VALUES (?, ?, 'combat', ?, ?, ?, datetime('now', '+8 hours'))
      `).run(uid, weekKey, rankNum, reward.lingshi || 0, reward.title || null);
    });
    transaction();

    res.json({
      success: true,
      message: `恭喜！获得第${rankNum}名奖励：💰 ${reward.lingshi || 0} 灵石${reward.title ? ` + ${reward.titleIcon} ${reward.title} 称号` : ''}`,
      data: { rank: rankNum, lingshiAwarded: reward.lingshi || 0, titleAwarded: reward.title }
    });
  } catch (e) {
    console.error('[rank] POST /claim-weekly error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

router.get('/:type', (req, res) => {
  const { type } = req.params;
  const { limit, player_id } = req.query;
  const n = Math.min(parseInt(limit) || 50, 100);
  const uid = parseInt(player_id) || 0;

  // player_id 校验：无效时返回错误而非空响应
  if (player_id && uid <= 0) {
    return res.status(400).json({ success: false, error: '无效的 player_id' });
  }

  let result;
  switch (type) {
    case 'combat': result = getCombatRank(n); break;
    case 'level':  result = getLevelRank(n);  break;
    case 'wealth': result = getWealthRank(n); break;
    case 'chapter': result = getChapterRank(n); break;
    default:
      return res.json({ success: false, error: '未知排行榜类型', types: ['combat', 'level', 'wealth', 'chapter'] });
  }

  // 附加当前玩家排名（仅当 uid > 0 时）
  if (uid > 0) {
    let myRankInfo = null;
    if (type === 'combat') myRankInfo = getPlayerCombatRank(uid);
    if (type === 'level') {
      try {
        const rank = db.prepare(`SELECT COUNT(*) + 1 as r FROM Users WHERE id > 0 AND (level > (SELECT level FROM Users WHERE id = ?) OR (level = (SELECT level FROM Users WHERE id = ?) AND realm > (SELECT realm FROM Users WHERE id = ?)))`).get(uid, uid, uid);
        myRankInfo = { myRank: rank.r };
      } catch (e) {}
    }
    if (type === 'wealth') {
      try {
        const rank = db.prepare(`SELECT COUNT(*) + 1 as r FROM Users WHERE id > 0 AND lingshi > (SELECT lingshi FROM Users WHERE id = ?)`).get(uid);
        myRankInfo = { myRank: rank.r };
      } catch (e) {}
    }
    return res.json({ success: true, data: result, myRank: myRankInfo });
  }

  // 无 player_id 时返回统一格式 { success: true, data: [...] }
  res.json({ success: true, data: result });
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
