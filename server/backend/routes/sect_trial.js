/**
 * 宗门试炼赛系统 - sect_trial.js
 * 赛季制宗门试炼赛，支持赛季管理+积分系统+奖励发放
 *
 * 端点:
 * GET  /                    - 宗门试炼赛概览
 * GET  /seasons             - 赛季列表
 * POST /seasons             - 创建赛季 (admin)
 * GET  /seasons/:id         - 赛季详情
 * GET  /scores              - 宗门积分排行
 * GET  /scores/:sectId      - 特定宗门积分
 * GET  /ranking             - 宗门排行榜
 * GET  /my                  - 我的宗门试炼赛状态
 * POST /join                - 加入试炼赛（宗门报名）
 * POST /battle              - 战斗结束，录入积分
 * GET  /rewards             - 奖励列表
 * POST /claim               - 领取奖励
 */

const express = require('express');
const router = express.Router();
const path = require('path');

// 数据库连接
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');
let db = null;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  initDB();
} catch (e) {
  console.log('[sect_trial] DB连接失败:', e.message);
}

// ============================================================
// 初始化：建表
// ============================================================
function initDB() {
  if (!db) return;
  try {
    // 宗门试炼赛赛季表
    db.exec(`
      CREATE TABLE IF NOT EXISTS sect_trial_seasons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        status TEXT DEFAULT 'active' CHECK(status IN ('upcoming', 'active', 'ended')),
        max_participants INTEGER DEFAULT 64,
        entry_requirement TEXT DEFAULT '{}',
        reward_pool TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // 宗门试炼赛积分表（每个宗门每个赛季的积分）
    db.exec(`
      CREATE TABLE IF NOT EXISTS sect_trial_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        season_id INTEGER NOT NULL,
        sect_id INTEGER NOT NULL,
        sect_name TEXT NOT NULL DEFAULT '',
        sect_icon TEXT DEFAULT '',
        score INTEGER DEFAULT 0,
        rank INTEGER DEFAULT 0,
        kills INTEGER DEFAULT 0,
        deaths INTEGER DEFAULT 0,
        battles INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        total_damage INTEGER DEFAULT 0,
        participated INTEGER DEFAULT 0,
        joined_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(season_id, sect_id)
      )
    `);

    // 宗门试炼赛个人参与表
    db.exec(`
      CREATE TABLE IF NOT EXISTS sect_trial_players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        season_id INTEGER NOT NULL,
        sect_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        player_name TEXT NOT NULL DEFAULT '',
        kills INTEGER DEFAULT 0,
        deaths INTEGER DEFAULT 0,
        damage_dealt INTEGER DEFAULT 0,
        battles INTEGER DEFAULT 0,
        contribution INTEGER DEFAULT 0,
        joined_at TEXT DEFAULT (datetime('now')),
        UNIQUE(season_id, sect_id, player_id)
      )
    `);

    // 宗门试炼赛奖励表
    db.exec(`
      CREATE TABLE IF NOT EXISTS sect_trial_rewards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        season_id INTEGER NOT NULL,
        rank_min INTEGER NOT NULL,
        rank_max INTEGER NOT NULL,
        reward_type TEXT NOT NULL,
        reward_key TEXT NOT NULL,
        reward_count INTEGER DEFAULT 1,
        reward_name TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // 宗门试炼赛奖励领取记录
    db.exec(`
      CREATE TABLE IF NOT EXISTS sect_trial_claims (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        season_id INTEGER NOT NULL,
        sect_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        rank INTEGER NOT NULL,
        reward_type TEXT NOT NULL,
        reward_key TEXT NOT NULL,
        reward_count INTEGER DEFAULT 1,
        claimed_at TEXT DEFAULT (datetime('now')),
        UNIQUE(season_id, sect_id, player_id, reward_key)
      )
    `);

    // 宗门试炼赛报名表
    db.exec(`
      CREATE TABLE IF NOT EXISTS sect_trial_registrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        season_id INTEGER NOT NULL,
        sect_id INTEGER NOT NULL,
        sect_name TEXT NOT NULL DEFAULT '',
        status TEXT DEFAULT 'registered' CHECK(status IN ('registered', 'active', 'eliminated', 'qualified')),
        registered_at TEXT DEFAULT (datetime('now')),
        UNIQUE(season_id, sect_id)
      )
    `);

    // 索引
    db.exec(`CREATE INDEX IF NOT EXISTS idx_trial_scores_season ON sect_trial_scores(season_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_trial_scores_rank ON sect_trial_scores(season_id, rank)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_trial_players_season ON sect_trial_players(season_id, sect_id)`);

    // 初始化默认赛季和奖励
    initDefaultSeason();

  } catch (e) {
    console.log('[sect_trial] 建表失败:', e.message);
  }
}

// ============================================================
// 初始化默认赛季
// ============================================================
function initDefaultSeason() {
  if (!db) return;
  try {
    // 检查是否已有赛季
    const count = db.prepare('SELECT COUNT(*) as c FROM sect_trial_seasons').get().c;
    if (count === 0) {
      const now = new Date();
      const season1End = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30天后

      db.prepare(`
        INSERT INTO sect_trial_seasons (name, start_time, end_time, status, max_participants, reward_pool)
        VALUES (?, ?, ?, 'active', 64, ?)
      `).run(
        '第一赛季·宗门试炼',
        now.toISOString().slice(0, 19).replace('T', ' '),
        season1End.toISOString().slice(0, 19).replace('T', ' '),
        JSON.stringify({ rank1: ['龙鳞×5', '顶级心法×1'], rank2_3: ['龙鳞×3'], rank4_10: ['龙鳞×1'] })
      );

      console.log('[sect_trial] 默认赛季初始化完成');

      // 初始化排行榜奖励
      initRewards(1);
    }
  } catch (e) {
    console.log('[sect_trial] 默认赛季初始化:', e.message);
  }
}

// ============================================================
// 初始化赛季奖励配置
// ============================================================
function initRewards(seasonId) {
  if (!db) return;
  try {
    const rewards = [
      { rank_min: 1, rank_max: 1, reward_type: 'item', reward_key: 'dragon_scale', reward_count: 5, reward_name: '龙鳞×5' },
      { rank_min: 1, rank_max: 1, reward_type: 'item', reward_key: 'top_gongfa', reward_count: 1, reward_name: '顶级心法×1' },
      { rank_min: 2, rank_max: 3, reward_type: 'item', reward_key: 'dragon_scale', reward_count: 3, reward_name: '龙鳞×3' },
      { rank_min: 4, rank_max: 10, reward_type: 'item', reward_key: 'dragon_scale', reward_count: 1, reward_name: '龙鳞×1' },
      { rank_min: 11, rank_max: 20, reward_type: 'item', reward_key: 'thunder_crystal', reward_count: 3, reward_name: '雷晶×3' },
      { rank_min: 21, rank_max: 50, reward_type: 'item', reward_key: 'thunder_crystal', reward_count: 1, reward_name: '雷晶×1' },
    ];

    const insert = db.prepare(`
      INSERT OR IGNORE INTO sect_trial_rewards (season_id, rank_min, rank_max, reward_type, reward_key, reward_count, reward_name)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const r of rewards) {
      insert.run(seasonId, r.rank_min, r.rank_max, r.reward_type, r.reward_key, r.reward_count, r.reward_name);
    }
  } catch (e) {
    console.log('[sect_trial] 奖励初始化:', e.message);
  }
}

// ============================================================
// 辅助函数：获取当前赛季
// ============================================================
function getCurrentSeason() {
  if (!db) return null;
  try {
    const now = new Date().toISOString();
    return db.prepare(`
      SELECT * FROM sect_trial_seasons WHERE status = 'active' AND start_time <= ? AND end_time >= ? LIMIT 1
    `).get(now, now) || db.prepare('SELECT * FROM sect_trial_seasons ORDER BY id DESC LIMIT 1').get();
  } catch (e) {
    return null;
  }
}

// ============================================================
// 辅助函数：获取或创建宗门积分记录
// ============================================================
function getOrCreateScore(seasonId, sectId, sectName, sectIcon) {
  if (!db) return null;
  try {
    const existing = db.prepare('SELECT * FROM sect_trial_scores WHERE season_id = ? AND sect_id = ?').get(seasonId, sectId);
    if (existing) return existing;

    db.prepare(`
      INSERT INTO sect_trial_scores (season_id, sect_id, sect_name, sect_icon, score, rank, participated)
      VALUES (?, ?, ?, ?, 0, 0, 1)
    `).run(seasonId, sectId, sectName, sectIcon || '');

    return db.prepare('SELECT * FROM sect_trial_scores WHERE season_id = ? AND sect_id = ?').get(seasonId, sectId);
  } catch (e) {
    return null;
  }
}

// ============================================================
// 辅助函数：更新排行榜
// ============================================================
function updateRanking(seasonId) {
  if (!db) return;
  try {
    // 按积分降序更新排名
    const scores = db.prepare(`
      SELECT id, RANK() OVER (ORDER BY score DESC, kills DESC) as new_rank
      FROM sect_trial_scores WHERE season_id = ?
    `).all(seasonId);

    const update = db.prepare('UPDATE sect_trial_scores SET rank = ? WHERE id = ?');
    for (const s of scores) {
      update.run(s.new_rank, s.id);
    }
  } catch (e) {
    console.log('[sect_trial] 排名更新失败:', e.message);
  }
}

// ============================================================
// 辅助函数：获取玩家宗门ID
// ============================================================
function getPlayerSect(playerId) {
  if (!db) return null;
  try {
    return db.prepare(`
      SELECT sm.sectId as sect_id, s.name as sect_name, s.icon as sect_icon, sm.role
      FROM SectMembers sm
      JOIN sects s ON s.id = sm.sectId
      WHERE sm.userId = ?
      LIMIT 1
    `).get(playerId);
  } catch (e) {
    return null;
  }
}

// ============================================================
// 辅助函数：统一JSON响应
// ============================================================
function json(res, data, message, code) {
  const success = code === undefined || code === 0;
  res.json({ success, code: code || 0, message: message || '', data: data || null });
}

// ============================================================
// 中间件：获取当前赛季
// ============================================================
function requireSeason(req, res, next) {
  const season = getCurrentSeason();
  if (!season) {
    return json(res, null, '当前无进行中的赛季', 404);
  }
  req.season = season;
  next();
}

// ============================================================
// 中间件：获取玩家信息
// ============================================================
function requireAuth(req, res, next) {
  const playerId = req.headers['x-player-id'] || req.query.player_id;
  if (!playerId) {
    return json(res, null, '缺少玩家ID', 401);
  }
  req.playerId = parseInt(playerId);
  next();
}

// ============================================================
// API: 宗门试炼赛概览
// GET /api/sect-trial
// ============================================================
router.get('/', requireSeason, (req, res) => {
  try {
    const season = req.season;

    // 统计数据
    const stats = {
      total_sects: 0,
      total_battles: 0,
      total_kills: 0,
    };

    try {
      const countResult = db.prepare('SELECT COUNT(*) as c FROM sect_trial_scores WHERE season_id = ?').get(season.id);
      stats.total_sects = countResult ? countResult.c : 0;
    } catch (e) {}

    try {
      const killResult = db.prepare('SELECT SUM(kills) as total FROM sect_trial_scores WHERE season_id = ?').get(season.id);
      stats.total_kills = killResult ? killResult.total || 0 : 0;
    } catch (e) {}

    json(res, {
      season,
      stats,
      my_sect: req.playerId ? getPlayerSect(req.playerId) : null
    });
  } catch (e) {
    json(res, null, '获取概览失败: ' + e.message, 500);
  }
});

// ============================================================
// API: 赛季列表
// GET /api/sect-trial/seasons
// ============================================================
router.get('/seasons', (req, res) => {
  try {
    const seasons = db.prepare('SELECT * FROM sect_trial_seasons ORDER BY id DESC').all();
    json(res, seasons);
  } catch (e) {
    json(res, null, '获取赛季列表失败: ' + e.message, 500);
  }
});

// ============================================================
// API: 赛季详情
// GET /api/sect-trial/seasons/:id
// ============================================================
router.get('/seasons/:id', (req, res) => {
  try {
    const season = db.prepare('SELECT * FROM sect_trial_seasons WHERE id = ?').get(req.params.id);
    if (!season) {
      return json(res, null, '赛季不存在', 404);
    }

    // 获取该赛季前10名
    const top10 = db.prepare(`
      SELECT * FROM sect_trial_scores WHERE season_id = ? AND rank > 0 ORDER BY rank ASC LIMIT 10
    `).all(season.id);

    json(res, { season, top10 });
  } catch (e) {
    json(res, null, '获取赛季详情失败: ' + e.message, 500);
  }
});

// ============================================================
// API: 宗门积分排行
// GET /api/sect-trial/scores
// ============================================================
router.get('/scores', requireSeason, (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    const scores = db.prepare(`
      SELECT * FROM sect_trial_scores WHERE season_id = ? ORDER BY rank ASC, score DESC LIMIT ? OFFSET ?
    `).all(req.season.id, parseInt(pageSize), offset);

    const total = db.prepare('SELECT COUNT(*) as c FROM sect_trial_scores WHERE season_id = ?').get(req.season.id).c;

    json(res, {
      list: scores,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (e) {
    json(res, null, '获取积分排行失败: ' + e.message, 500);
  }
});

// ============================================================
// API: 特定宗门积分
// GET /api/sect-trial/scores/:sectId
// ============================================================
router.get('/scores/:sectId', requireSeason, (req, res) => {
  try {
    const score = db.prepare(`
      SELECT * FROM sect_trial_scores WHERE season_id = ? AND sect_id = ?
    `).get(req.season.id, req.params.sectId);

    if (!score) {
      return json(res, null, '宗门未参与试炼赛', 404);
    }

    // 获取该宗门参与者列表
    const players = db.prepare(`
      SELECT * FROM sect_trial_players WHERE season_id = ? AND sect_id = ? ORDER BY contribution DESC
    `).all(req.season.id, req.params.sectId);

    json(res, { ...score, players });
  } catch (e) {
    json(res, null, '获取宗门积分失败: ' + e.message, 500);
  }
});

// ============================================================
// API: 宗门排行榜
// GET /api/sect-trial/ranking
// ============================================================
router.get('/ranking', requireSeason, (req, res) => {
  try {
    const ranking = db.prepare(`
      SELECT rank, sect_id, sect_name, sect_icon, score, kills, deaths, wins, losses, battles
      FROM sect_trial_scores WHERE season_id = ? AND rank > 0 ORDER BY rank ASC LIMIT 100
    `).all(req.season.id);

    json(res, ranking);
  } catch (e) {
    json(res, null, '获取排行榜失败: ' + e.message, 500);
  }
});

// ============================================================
// API: 我的宗门试炼赛状态
// GET /api/sect-trial/my
// ============================================================
router.get('/my', requireAuth, requireSeason, (req, res) => {
  try {
    const playerSect = getPlayerSect(req.playerId);
    if (!playerSect) {
      return json(res, null, '您还未加入宗门', 404);
    }

    const score = db.prepare(`
      SELECT * FROM sect_trial_scores WHERE season_id = ? AND sect_id = ?
    `).get(req.season.id, playerSect.sect_id);

    const playerStats = db.prepare(`
      SELECT * FROM sect_trial_players WHERE season_id = ? AND sect_id = ? AND player_id = ?
    `).get(req.season.id, playerSect.sect_id, req.playerId);

    const myClaims = db.prepare(`
      SELECT * FROM sect_trial_claims WHERE season_id = ? AND sect_id = ? AND player_id = ?
    `).all(req.season.id, playerSect.sect_id, req.playerId);

    json(res, {
      season: req.season,
      sect: playerSect,
      score,
      player: playerStats,
      claims: myClaims
    });
  } catch (e) {
    json(res, null, '获取状态失败: ' + e.message, 500);
  }
});

// ============================================================
// API: 加入试炼赛（宗门报名）
// POST /api/sect-trial/join
// ============================================================
router.post('/join', requireAuth, requireSeason, (req, res) => {
  try {
    const playerSect = getPlayerSect(req.playerId);
    if (!playerSect) {
      return json(res, null, '您还未加入宗门', 404);
    }

    // 掌门或长老才能报名
    if (!['掌门', '长老'].includes(playerSect.role)) {
      return json(res, null, '只有掌门或长老才能报名试炼赛', 403);
    }

    // 检查是否已报名
    const existing = db.prepare(`
      SELECT * FROM sect_trial_registrations WHERE season_id = ? AND sect_id = ?
    `).get(req.season.id, playerSect.sect_id);

    if (existing) {
      return json(res, null, '宗门已报名试炼赛', 400);
    }

    // 报名
    db.prepare(`
      INSERT INTO sect_trial_registrations (season_id, sect_id, sect_name, status)
      VALUES (?, ?, ?, 'registered')
    `).run(req.season.id, playerSect.sect_id, playerSect.sect_name);

    // 创建积分记录
    getOrCreateScore(req.season.id, playerSect.sect_id, playerSect.sect_name, playerSect.sect_icon);

    // 更新参与者
    db.prepare(`
      INSERT OR REPLACE INTO sect_trial_players (season_id, sect_id, player_id, player_name, contribution)
      VALUES (?, ?, ?, ?, 0)
    `).run(req.season.id, playerSect.sect_id, req.playerId, req.headers['x-player-name'] || `玩家${req.playerId}`);

    json(res, { registered: true, sect: playerSect }, '报名成功');
  } catch (e) {
    json(res, null, '报名失败: ' + e.message, 500);
  }
});

// ============================================================
// API: 战斗结束，录入积分
// POST /api/sect-trial/battle
// ============================================================
router.post('/battle', requireAuth, requireSeason, (req, res) => {
  try {
    const { sect_id, kills = 0, deaths = 0, damage_dealt = 0, is_win = false } = req.body;

    if (!sect_id) {
      return json(res, null, '缺少宗门ID', 400);
    }

    // 获取本宗门信息
    const mySect = getPlayerSect(req.playerId);
    if (!mySect) {
      return json(res, null, '您还未加入宗门', 404);
    }

    // 检查是否是同一宗门
    if (mySect.sect_id !== parseInt(sect_id)) {
      return json(res, null, '只能录入自己宗门的战斗', 403);
    }

    // 获取或创建积分记录
    const score = getOrCreateScore(req.season.id, mySect.sect_id, mySect.sect_name, mySect.sect_icon);

    // 计算积分变化
    const baseScore = is_win ? 30 : 10;
    const killBonus = kills * 5;
    const damageBonus = Math.floor(damage_dealt / 100);
    const scoreDelta = baseScore + killBonus + damageBonus;

    // 更新宗门积分
    db.prepare(`
      UPDATE sect_trial_scores SET
        score = score + ?,
        kills = kills + ?,
        deaths = deaths + ?,
        battles = battles + 1,
        wins = wins + ?,
        losses = losses + ?,
        total_damage = total_damage + ?,
        updated_at = datetime('now')
      WHERE season_id = ? AND sect_id = ?
    `).run(scoreDelta, kills, deaths, is_win ? 1 : 0, is_win ? 0 : 1, damage_dealt, req.season.id, mySect.sect_id);

    // 更新个人参与
    const playerContribution = is_win ? 20 : 5 + kills * 3;
    db.prepare(`
      INSERT INTO sect_trial_players (season_id, sect_id, player_id, player_name, kills, deaths, damage_dealt, battles, contribution)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
      ON CONFLICT(season_id, sect_id, player_id) DO UPDATE SET
        kills = kills + excluded.kills,
        deaths = deaths + excluded.deaths,
        damage_dealt = damage_dealt + excluded.damage_dealt,
        battles = battles + 1,
        contribution = contribution + excluded.contribution
    `).run(
      req.season.id,
      mySect.sect_id,
      req.playerId,
      req.headers['x-player-name'] || `玩家${req.playerId}`,
      kills,
      deaths,
      damage_dealt,
      playerContribution
    );

    // 更新排名
    updateRanking(req.season.id);

    // 获取更新后的积分
    const updatedScore = db.prepare(`
      SELECT * FROM sect_trial_scores WHERE season_id = ? AND sect_id = ?
    `).get(req.season.id, mySect.sect_id);

    json(res, {
      score_delta: scoreDelta,
      current_score: updatedScore
    }, '战斗记录已录入');
  } catch (e) {
    json(res, null, '录入失败: ' + e.message, 500);
  }
});

// ============================================================
// API: 奖励列表
// GET /api/sect-trial/rewards
// ============================================================
router.get('/rewards', requireSeason, (req, res) => {
  try {
    const rewards = db.prepare(`
      SELECT * FROM sect_trial_rewards WHERE season_id = ? ORDER BY rank_min ASC
    `).all(req.season.id);

    // 按排名段分组
    const grouped = {};
    for (const r of rewards) {
      const key = `${r.rank_min}-${r.rank_max}`;
      if (!grouped[key]) {
        grouped[key] = { rank_min: r.rank_min, rank_max: r.rank_max, items: [] };
      }
      grouped[key].items.push({
        type: r.reward_type,
        key: r.reward_key,
        count: r.reward_count,
        name: r.reward_name
      });
    }

    json(res, Object.values(grouped));
  } catch (e) {
    json(res, null, '获取奖励列表失败: ' + e.message, 500);
  }
});

// ============================================================
// API: 领取奖励
// POST /api/sect-trial/claim
// ============================================================
router.post('/claim', requireAuth, requireSeason, (req, res) => {
  try {
    const playerSect = getPlayerSect(req.playerId);
    if (!playerSect) {
      return json(res, null, '您还未加入宗门', 404);
    }

    // 获取宗门排名
    const score = db.prepare(`
      SELECT * FROM sect_trial_scores WHERE season_id = ? AND sect_id = ?
    `).get(req.season.id, playerSect.sect_id);

    if (!score || score.rank === 0) {
      return json(res, null, '宗门未参与试炼赛或无有效排名', 400);
    }

    // 检查赛季是否结束
    if (req.season.status !== 'ended') {
      const now = new Date();
      const endTime = new Date(req.season.end_time);
      if (now < endTime) {
        return json(res, null, '赛季尚未结束，无法领取奖励', 400);
      }
    }

    // 获取该排名可领取的奖励
    const rewards = db.prepare(`
      SELECT * FROM sect_trial_rewards
      WHERE season_id = ? AND rank_min <= ? AND rank_max >= ?
    `).all(req.season.id, score.rank, score.rank);

    if (rewards.length === 0) {
      return json(res, null, '该排名无奖励可领取', 400);
    }

    const claimed = [];
    const errors = [];

    for (const reward of rewards) {
      // 检查是否已领取
      const existing = db.prepare(`
        SELECT * FROM sect_trial_claims
        WHERE season_id = ? AND sect_id = ? AND player_id = ? AND reward_key = ?
      `).get(req.season.id, playerSect.sect_id, req.playerId, reward.reward_key);

      if (existing) {
        errors.push(`${reward.reward_name} 已领取`);
        continue;
      }

      // 标记为已领取
      db.prepare(`
        INSERT INTO sect_trial_claims (season_id, sect_id, player_id, rank, reward_type, reward_key, reward_count)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(req.season.id, playerSect.sect_id, req.playerId, score.rank, reward.reward_type, reward.reward_key, reward.reward_count);

      // TODO: 实际发放道具（调用物品系统）
      claimed.push({
        name: reward.reward_name,
        count: reward.reward_count
      });
    }

    json(res, {
      rank: score.rank,
      claimed,
      errors
    }, claimed.length > 0 ? '奖励领取成功' : '无可领取的奖励');
  } catch (e) {
    json(res, null, '领取失败: ' + e.message, 500);
  }
});

// ============================================================
// API: 管理员 - 创建赛季
// POST /api/sect-trial/seasons (admin)
// ============================================================
router.post('/seasons', (req, res) => {
  try {
    const { name, start_time, end_time, max_participants = 64 } = req.body;

    if (!name || !start_time || !end_time) {
      return json(res, null, '缺少必填字段', 400);
    }

    // 将当前active赛季改为ended
    db.prepare(`UPDATE sect_trial_seasons SET status = 'ended' WHERE status = 'active'`).run();

    // 创建新赛季
    const result = db.prepare(`
      INSERT INTO sect_trial_seasons (name, start_time, end_time, status, max_participants)
      VALUES (?, ?, ?, 'active', ?)
    `).run(name, start_time, end_time, max_participants);

    const newSeason = db.prepare('SELECT * FROM sect_trial_seasons WHERE id = ?').get(result.lastInsertRowid);

    // 初始化新赛季奖励
    initRewards(newSeason.id);

    json(res, newSeason, '赛季创建成功');
  } catch (e) {
    json(res, null, '创建赛季失败: ' + e.message, 500);
  }
});

// ============================================================
// API: 管理员 - 结束赛季
// POST /api/sect-trial/seasons/:id/end
// ============================================================
router.post('/seasons/:id/end', (req, res) => {
  try {
    const season = db.prepare('SELECT * FROM sect_trial_seasons WHERE id = ?').get(req.params.id);
    if (!season) {
      return json(res, null, '赛季不存在', 404);
    }

    db.prepare(`UPDATE sect_trial_seasons SET status = 'ended' WHERE id = ?`).run(req.params.id);

    // 最终排名
    updateRanking(req.params.id);

    const finalRanking = db.prepare(`
      SELECT * FROM sect_trial_scores WHERE season_id = ? ORDER BY rank ASC LIMIT 20
    `).all(req.params.id);

    json(res, { season_id: req.params.id, final_ranking: finalRanking }, '赛季已结束');
  } catch (e) {
    json(res, null, '操作失败: ' + e.message, 500);
  }
});

// ============================================================
// 兼容旧路由：自动挂载到 /api/sect-trial
// ============================================================
module.exports = router;
module.exports.router = router;
module.exports.setDb = (newDb) => {
  db = newDb;
  initDB();
};
