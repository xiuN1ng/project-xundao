/**
 * 天梯赛季系统 API
 * 封装 ladder_storage.js 的赛季数据
 *
 * 端点:
 * GET  /season/info        - 当前赛季信息
 * GET  /season/rankings    - 赛季排行榜
 * POST /season/reward      - 领取赛季奖励
 * GET  /season/player      - 获取玩家赛季数据
 */

const express = require('express');
const router = express.Router();
const path = require('path');

// 数据库连接
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');
let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  initTables();
} catch (e) {
  console.log('[ladder_season] DB连接失败:', e.message);
  db = {
    prepare() { return this; },
    get() { return null; },
    all() { return []; },
    run() { return { changes: 0 }; }
  };
}

// 段位配置
const DIVISION_CONFIG = [
  { id: 0, name: '青铜Ⅰ', icon: '🥉', color: '#CD7F32', minScore: 0, reward: 500 },
  { id: 1, name: '青铜Ⅱ', icon: '🥉', color: '#CD7F32', minScore: 1000, reward: 600 },
  { id: 2, name: '白银Ⅰ', icon: '🥈', color: '#C0C0C0', minScore: 1200, reward: 800 },
  { id: 3, name: '白银Ⅱ', icon: '🥈', color: '#C0C0C0', minScore: 1400, reward: 1000 },
  { id: 4, name: '黄金Ⅰ', icon: '🥇', color: '#FFD700', minScore: 1600, reward: 1500 },
  { id: 5, name: '黄金Ⅱ', icon: '🥇', color: '#FFD700', minScore: 1800, reward: 2000 },
  { id: 6, name: '白金Ⅰ', icon: '💎', color: '#38bdf8', minScore: 2000, reward: 3000 },
  { id: 7, name: '白金Ⅱ', icon: '💎', color: '#38bdf8', minScore: 2200, reward: 4000 },
  { id: 8, name: '钻石Ⅰ', icon: '💠', color: '#667eea', minScore: 2400, reward: 6000 },
  { id: 9, name: '钻石Ⅱ', icon: '💠', color: '#667eea', minScore: 2600, reward: 8000 },
  { id: 10, name: '宗师', icon: '🏆', color: '#f472b6', minScore: 2800, reward: 12000 },
  { id: 11, name: '王者', icon: '👑', color: '#ffd700', minScore: 3000, reward: 20000 }
];

// 赛季奖励配置
const SEASON_REWARDS = {
  rank1: { stones: 50000, title: '天梯冠军', frame: 'champion_frame' },
  rank2: { stones: 30000, title: '天梯亚军', frame: 'silver_frame' },
  rank3: { stones: 20000, title: '天梯季军', frame: 'bronze_frame' },
  default: { stones: 1000, title: null, frame: null }
};

function initTables() {
  if (!db) return;
  try {
    // 赛季表
    db.exec(`
      CREATE TABLE IF NOT EXISTS ladder_season (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        season_num INTEGER NOT NULL,
        name TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        is_active INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // 玩家赛季数据
    db.exec(`
      CREATE TABLE IF NOT EXISTS ladder_season_player (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        season_id INTEGER NOT NULL,
        score INTEGER DEFAULT 0,
        rank_level INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        reward_claimed INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(player_id, season_id)
      )
    `);

    // 赛季历史记录
    db.exec(`
      CREATE TABLE IF NOT EXISTS ladder_season_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        season_id INTEGER NOT NULL,
        final_rank INTEGER,
        final_score INTEGER,
        reward_stones INTEGER DEFAULT 0,
        reward_title TEXT,
        claimed INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(player_id, season_id)
      )
    `);

    // 确保有当前赛季
    const active = db.prepare('SELECT * FROM ladder_season WHERE is_active = 1').get();
    if (!active) {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000); // 2周后
      db.prepare(`
        INSERT INTO ladder_season (season_num, name, start_date, end_date, is_active)
        VALUES (?, ?, ?, ?, 1)
      `).run(1, `第1赛季`, startDate.toISOString(), endDate.toISOString());
    }

    console.log('[ladder_season] 表初始化完成');
  } catch (e) {
    console.error('[ladder_season] 建表失败:', e.message);
  }
}

function getCurrentSeason() {
  try {
    return db.prepare('SELECT * FROM ladder_season WHERE is_active = 1').get() || null;
  } catch (e) {
    return null;
  }
}

function getPlayerSeasonData(playerId, seasonId) {
  try {
    return db.prepare('SELECT * FROM ladder_season_player WHERE player_id = ? AND season_id = ?').get(playerId, seasonId);
  } catch (e) {
    return null;
  }
}

function getSeasonRankings(seasonId, limit = 100) {
  try {
    return db.prepare('SELECT * FROM ladder_season_player WHERE season_id = ? ORDER BY score DESC LIMIT ?').all(seasonId, limit);
  } catch (e) {
    return [];
  }
}

function getRankConfig(score) {
  for (let i = DIVISION_CONFIG.length - 1; i >= 0; i--) {
    if (score >= DIVISION_CONFIG[i].minScore) return DIVISION_CONFIG[i];
  }
  return DIVISION_CONFIG[0];
}

// GET /season/info - 当前赛季信息
router.get('/info', (req, res) => {
  try {
    const season = getCurrentSeason();
    if (!season) {
      return res.json({ success: false, message: '暂无进行中的赛季' });
    }

    const startDate = new Date(season.start_date);
    const endDate = new Date(season.end_date);
    const now = new Date();
    const daysLeft = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));

    res.json({
      success: true,
      data: {
        seasonId: season.id,
        seasonNum: season.season_num,
        seasonName: season.name || `第${season.season_num}赛季`,
        startTime: season.start_date,
        endTime: season.end_date,
        daysLeft,
        totalPlayers: db.prepare('SELECT COUNT(*) as count FROM ladder_season_player WHERE season_id = ?').get(season.id)?.count || 0
      }
    });
  } catch (e) {
    console.error('[ladder_season/info]', e.message);
    res.json({ success: false, message: e.message });
  }
});

// GET /season/rankings - 赛季排行榜
router.get('/rankings', (req, res) => {
  try {
    const { limit, season_id } = req.query;
    const season = getCurrentSeason();
    const sid = parseInt(season_id) || season?.id || 1;

    const rankings = getSeasonRankings(sid, parseInt(limit) || 50);

    // 获取玩家名称
    const result = rankings.map((r, i) => {
      const rankCfg = getRankConfig(r.score);
      let playerName = `修士${r.player_id}`;
      try {
        const user = db.prepare('SELECT username FROM Users WHERE id = ?').get(r.player_id);
        if (user) playerName = user.username;
      } catch (e) { /* ignore */ }

      return {
        rank: i + 1,
        playerId: r.player_id,
        playerName,
        score: r.score,
        rankName: rankCfg.name,
        rankIcon: rankCfg.icon,
        wins: r.wins,
        losses: r.losses
      };
    });

    res.json({ success: true, data: result });
  } catch (e) {
    console.error('[ladder_season/rankings]', e.message);
    res.json({ success: false, message: e.message });
  }
});

// GET /season/player - 获取玩家赛季数据
router.get('/player', (req, res) => {
  try {
    const { player_id } = req.query;
    if (!player_id) return res.status(400).json({ success: false, error: '缺少玩家ID' });

    const playerId = parseInt(player_id);
    const season = getCurrentSeason();
    if (!season) return res.json({ success: false, message: '暂无进行中的赛季' });

    let data = getPlayerSeasonData(playerId, season.id);

    // 如果没有记录，创建初始数据
    if (!data) {
      db.prepare(`
        INSERT INTO ladder_season_player (player_id, season_id, score, rank_level, wins, losses)
        VALUES (?, ?, 1000, 1, 0, 0)
      `).run(playerId, season.id);
      data = getPlayerSeasonData(playerId, season.id);
    }

    const rankCfg = getRankConfig(data.score);

    res.json({
      success: true,
      data: {
        seasonId: season.id,
        seasonName: season.name || `第${season.season_num}赛季`,
        startTime: season.start_date,
        endTime: season.end_date,
        playerId,
        score: data.score,
        playerRank: data.rank_level,
        playerRankName: rankCfg.name,
        playerRankIcon: rankCfg.icon,
        wins: data.wins,
        losses: data.losses,
        rewardClaimed: !!data.reward_claimed,
        winRate: data.wins + data.losses > 0 ? Math.round(data.wins / (data.wins + data.losses) * 100) : 0
      }
    });
  } catch (e) {
    console.error('[ladder_season/player]', e.message);
    res.json({ success: false, message: e.message });
  }
});

// POST /season/reward - 领取赛季奖励
router.post('/reward', (req, res) => {
  try {
    const { player_id } = req.body;
    if (!player_id) return res.status(400).json({ success: false, error: '缺少玩家ID' });

    const playerId = parseInt(player_id);
    const season = getCurrentSeason();
    if (!season) return res.json({ success: false, message: '赛季已结束或不存在' });

    const data = getPlayerSeasonData(playerId, season.id);
    if (!data) return res.json({ success: false, message: '无赛季数据' });
    if (data.reward_claimed) return res.json({ success: false, message: '奖励已领取' });

    const rankCfg = getRankConfig(data.score);
    const reward = SEASON_REWARDS.default;
    reward.stones = rankCfg.reward;

    // 发放灵石奖励
    if (reward.stones > 0) {
      try {
        db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(reward.stones, playerId);
      } catch (e) { /* ignore */ }
    }

    // 标记已领取
    db.prepare('UPDATE ladder_season_player SET reward_claimed = 1 WHERE player_id = ? AND season_id = ?').run(playerId, season.id);

    // 记录历史
    db.prepare(`
      INSERT OR REPLACE INTO ladder_season_history (player_id, season_id, final_score, reward_stones, reward_title)
      VALUES (?, ?, ?, ?, ?)
    `).run(playerId, season.id, data.score, reward.stones, reward.title);

    res.json({
      success: true,
      message: `奖励领取成功！获得${reward.stones}灵石${reward.title ? `和称号【${reward.title}】` : ''}`,
      rewards: reward
    });
  } catch (e) {
    console.error('[ladder_season/reward]', e.message);
    res.json({ success: false, message: e.message });
  }
});

// POST /season/update - 更新赛季积分（天梯战斗后调用）
router.post('/update', (req, res) => {
  try {
    const { player_id, score_change, is_win } = req.body;
    if (!player_id) return res.status(400).json({ success: false, error: '缺少玩家ID' });

    const playerId = parseInt(player_id);
    const season = getCurrentSeason();
    if (!season) return res.json({ success: false, message: '赛季不存在' });

    let data = getPlayerSeasonData(playerId, season.id);
    if (!data) {
      db.prepare(`
        INSERT INTO ladder_season_player (player_id, season_id, score, rank_level, wins, losses)
        VALUES (?, ?, 1000, 1, 0, 0)
      `).run(playerId, season.id);
      data = getPlayerSeasonData(playerId, season.id);
    }

    const newScore = Math.max(0, Math.min(5000, data.score + (score_change || 0)));
    const newWins = data.wins + (is_win ? 1 : 0);
    const newLosses = data.losses + (is_win ? 0 : 1);
    const newRank = getRankConfig(newScore).id;

    db.prepare(`
      UPDATE ladder_season_player SET score = ?, rank_level = ?, wins = ?, losses = ?, updated_at = datetime('now')
      WHERE player_id = ? AND season_id = ?
    `).run(newScore, newRank, newWins, newLosses, playerId, season.id);

    res.json({
      success: true,
      data: {
        score: newScore,
        rankLevel: newRank,
        rankName: getRankConfig(newScore).name,
        wins: newWins,
        losses: newLosses
      }
    });
  } catch (e) {
    console.error('[ladder_season/update]', e.message);
    res.json({ success: false, message: e.message });
  }
});

module.exports = router;
