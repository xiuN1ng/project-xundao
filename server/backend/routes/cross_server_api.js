/**
 * 跨服战/王者挑战系统 API路由
 * P88-4: 赛季制64人淘汰赛
 * 端点: /api/cross-server/*
 */
const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');

const router = express.Router();

// ─── Database ───────────────────────────────────────────────────────────────
const DB_PATH = path.join(__dirname, '..', 'data', 'game.db');

function getDb() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  return db;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const ENTRY_FEE = 5000;           // 报名费灵石
const MIN_COMBAT_POWER = 50000;   // 最低战力门槛
const MIN_REALM_LEVEL = 7;        // 最低境界：金丹 (假设 realm_level >= 7 为金丹)

// 境界名称映射
const REALM_NAMES = ['凡人', '炼气', '筑基', '金丹', '元婴', '化神', '炼虚', '大乘', '渡劫', '真仙'];
const REALM_ICONS = ['👤', '🌬️', '🪨', '🌟', '🌙', '☀️', '✨', '🚀', '⚡', '🔱'];

// 赛季奖励配置
const SEASON_REWARDS = {
  champion: {
    title: '王者',
    icon: '👑',
    spiritStones: 50000,
    description: '跨服战冠军专属称号',
    exclusiveAppearance: '王者光环'
  },
  runnerUp: {
    title: '亚军',
    icon: '🥈',
    spiritStones: 30000,
    description: '跨服战亚军'
  },
  semiFinalist: {
    title: '四强',
    icon: '🏅',
    spiritStones: 15000,
    description: '跨服战四强'
  },
  quarterFinalist: {
    title: '八强',
    icon: '🎖️',
    spiritStones: 8000,
    description: '跨服战八强'
  },
  participant: {
    title: '参赛者',
    icon: '⚔️',
    spiritStones: 2000,
    description: '参与跨服战'
  }
};

// ─── DB初始化 ────────────────────────────────────────────────────────────────
function initTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cross_server_seasons (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      season_name     TEXT    NOT NULL,
      season_number   INTEGER NOT NULL,
      start_date      TEXT    NOT NULL,
      end_date        TEXT    NOT NULL,
      is_active       INTEGER DEFAULT 1,
      status          TEXT    DEFAULT 'registration',  -- registration | ongoing | finished
      winner_id       INTEGER DEFAULT NULL,
      created_at      INTEGER DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS cross_server_players (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      season_id       INTEGER NOT NULL,
      player_id       INTEGER NOT NULL,
      username        TEXT    NOT NULL,
      combat_power    INTEGER NOT NULL,
      realm_level     INTEGER NOT NULL,
      registered_at   INTEGER DEFAULT (strftime('%s','now')),
      eliminated_at   INTEGER DEFAULT NULL,
      final_rank      INTEGER DEFAULT NULL,
      UNIQUE(season_id, player_id)
    );

    CREATE TABLE IF NOT EXISTS cross_server_matches (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      season_id       INTEGER NOT NULL,
      round           INTEGER NOT NULL,  -- 1=64强, 2=32强, 3=16强, 4=8强, 5=4强, 6=决赛
      match_index     INTEGER NOT NULL,
      player1_id      INTEGER,
      player2_id      INTEGER,
      player1_name    TEXT,
      player2_name    TEXT,
      winner_id       INTEGER DEFAULT NULL,
      loser_id        INTEGER DEFAULT NULL,
      fight_time      INTEGER DEFAULT NULL,
      status          TEXT    DEFAULT 'pending',  -- pending | ready | fighting | finished
      created_at      INTEGER DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS cross_server_battles (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id        INTEGER NOT NULL,
      season_id       INTEGER NOT NULL,
      player1_id      INTEGER NOT NULL,
      player2_id      INTEGER NOT NULL,
      winner_id       INTEGER NOT NULL,
      loser_id        INTEGER NOT NULL,
      player1_power   INTEGER NOT NULL,
      player2_power   INTEGER NOT NULL,
      battle_log      TEXT,
      rewards_distributed INTEGER DEFAULT 0,
      created_at      INTEGER DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS cross_server_rewards_log (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      season_id       INTEGER NOT NULL,
      player_id       INTEGER NOT NULL,
      reward_type     TEXT    NOT NULL,
      reward_amount   INTEGER NOT NULL,
      granted_at      INTEGER DEFAULT (strftime('%s','now'))
    );
  `);
}

// ─── 辅助函数 ────────────────────────────────────────────────────────────────
function getPlayerId(req) {
  return parseInt(req.query.player_id || req.body?.player_id || req.userId || 1);
}

function getCurrentSeasonNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return year * 100 + month;
}

function getSeasonName(seasonNumber) {
  const year = Math.floor(seasonNumber / 100);
  const month = seasonNumber % 100;
  return `${year}年${month}月跨服战`;
}

function getNextSeasonDates() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  // 赛季：每月1号开始
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
  return { startDate, endDate };
}

function isMatchDay() {
  const now = new Date();
  const day = now.getDay(); // 0=周日, 6=周六
  return day === 0 || day === 6;
}

function getSeasonStatus() {
  const now = new Date();
  const day = now.getDate();
  const dayOfWeek = now.getDay();
  // 报名期：每月1-25日
  // 比赛日：每月最后一个周六日 (25日后)
  if (day <= 25) return 'registration';
  if (isMatchDay()) return 'ongoing';
  return 'finished';
}

function simulateBattle(player1Power, player2Power) {
  // 战力差影响胜率，每5000战力约+5%胜率
  const powerDiff = player1Power - player2Power;
  const winRate = 0.5 + (powerDiff / 100000);
  const clampedRate = Math.max(0.1, Math.min(0.9, winRate));
  const rand = Math.random();
  return rand < clampedRate ? 'player1' : 'player2';
}

// ─── GET /api/cross-server/seasons ──────────────────────────────────────────
router.get('/seasons', (req, res) => {
  try {
    const db = getDb();
    initTables(db);
    const playerId = getPlayerId(req);

    const currentSeasonNumber = getCurrentSeasonNumber();
    const { startDate, endDate } = getNextSeasonDates();

    // 确保当前赛季存在
    let currentSeason = db.prepare(
      'SELECT * FROM cross_server_seasons WHERE season_number = ?'
    ).get(currentSeasonNumber);

    if (!currentSeason) {
      const status = getSeasonStatus();
      const info = db.prepare(
        'INSERT INTO cross_server_seasons (season_name, season_number, start_date, end_date, is_active, status) VALUES (?, ?, ?, ?, 1, ?)'
      ).run(getSeasonName(currentSeasonNumber), currentSeasonNumber, startDate, endDate, status);
      currentSeason = db.prepare('SELECT * FROM cross_server_seasons WHERE id = ?').get(info.lastInsertRowid);
    }

    // 玩家参赛历史
    const history = db.prepare(`
      SELECT cs.season_name, cs.season_number, csp.final_rank, csp.combat_power, csp.registered_at
      FROM cross_server_players csp
      JOIN cross_server_seasons cs ON cs.id = csp.season_id
      WHERE csp.player_id = ?
      ORDER BY cs.season_number DESC
      LIMIT 12
    `).all(playerId);

    res.json({
      code: 0,
      data: {
        currentSeason: {
          seasonId: currentSeason.id,
          seasonNumber: currentSeason.season_number,
          seasonName: currentSeason.season_name,
          status: currentSeason.status,
          startDate: currentSeason.start_date,
          endDate: currentSeason.end_date,
          isMatchDay: isMatchDay()
        },
        history: history.map(h => ({
          seasonName: h.season_name,
          seasonNumber: h.season_number,
          rank: h.final_rank,
          combatPower: h.combat_power,
          participatedAt: h.registered_at * 1000
        }))
      }
    });
  } catch (err) {
    console.error('cross-server/seasons error:', err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

// ─── POST /api/cross-server/register ─────────────────────────────────────────
router.post('/register', (req, res) => {
  try {
    const db = getDb();
    initTables(db);
    const playerId = getPlayerId(req);

    const currentSeasonNumber = getCurrentSeasonNumber();
    let currentSeason = db.prepare(
      'SELECT * FROM cross_server_seasons WHERE season_number = ?'
    ).get(currentSeasonNumber);

    if (!currentSeason) {
      return res.json({ code: 400, msg: '当前无开放赛季' });
    }

    if (currentSeason.status !== 'registration') {
      return res.json({ code: 400, msg: '报名已截止，比赛进行中或已结束' });
    }

    // 检查是否已报名
    const existing = db.prepare(
      'SELECT id FROM cross_server_players WHERE season_id = ? AND player_id = ?'
    ).get(currentSeason.id, playerId);

    if (existing) {
      return res.json({ code: 400, msg: '您已报名本届跨服战' });
    }

    // 获取玩家信息（Users表有username/combat_power，player表有spirit_stones/realm_level）
    let player = null;
    let username = '玩家' + playerId;
    let combatPower = 0;
    let realmLevel = 0;
    let spiritStones = 0;

    try {
      const usersRow = db.prepare('SELECT username, combat_power FROM Users WHERE id = ?').get(playerId);
      if (usersRow) { username = usersRow.username || username; combatPower = usersRow.combat_power || 0; }
    } catch (e) { /* ignore */ }

    try {
      const playerRow = db.prepare('SELECT spirit_stones, realm_level FROM player WHERE id = ?').get(playerId);
      if (playerRow) { spiritStones = playerRow.spirit_stones || 0; realmLevel = playerRow.realm_level || 0; }
    } catch (e) { /* ignore */ }

    if (combatPower === 0) {
      try {
        const altRow = db.prepare('SELECT combat_power, realm_level FROM players WHERE id = ?').get(playerId);
        if (altRow) { combatPower = altRow.combat_power || 0; realmLevel = altRow.realm_level || realmLevel; }
      } catch (e) { /* ignore */ }
    }

    if (combatPower === 0 && spiritStones === 0) {
      return res.json({ code: 404, msg: '玩家不存在' });
    }

    // 验证门槛
    if (combatPower < MIN_COMBAT_POWER) {
      return res.json({
        code: 400,
        msg: `战力不足，需要 ${MIN_COMBAT_POWER}，当前 ${combatPower}`
      });
    }

    if (realmLevel < MIN_REALM_LEVEL) {
      const realmName = REALM_NAMES[realmLevel] || '未知';
      return res.json({
        code: 400,
        msg: `境界不足，需要 ${REALM_NAMES[MIN_REALM_LEVEL]}，当前 ${realmName}`
      });
    }

    // 验证灵石
    if (spiritStones < ENTRY_FEE) {
      return res.json({
        code: 400,
        msg: `灵石不足，需要 ${ENTRY_FEE}，当前 ${spiritStones}`
      });
    }

    // 扣灵石
    try {
      db.prepare('UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?').run(ENTRY_FEE, playerId);
    } catch (e) {
      try {
        db.prepare('UPDATE players SET spirit_stones = spirit_stones - ? WHERE id = ?').run(ENTRY_FEE, playerId);
      } catch (e2) { /* ignore */ }
    }

    // 写入报名
    db.prepare(`
      INSERT INTO cross_server_players (season_id, player_id, username, combat_power, realm_level)
      VALUES (?, ?, ?, ?, ?)
    `).run(currentSeason.id, playerId, username, combatPower, realmLevel);

    // 记录奖励日志
    db.prepare(`
      INSERT INTO cross_server_rewards_log (season_id, player_id, reward_type, reward_amount)
      VALUES (?, ?, 'entry_fee_refund', 0)
    `).run(currentSeason.id, playerId);

    res.json({
      code: 0,
      data: {
        success: true,
        entryFee: ENTRY_FEE,
        remainingSpiritStones: spiritStones - ENTRY_FEE,
        seasonName: currentSeason.season_name,
        seasonStatus: currentSeason.status
      }
    });
  } catch (err) {
    console.error('cross-server/register error:', err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

// ─── GET /api/cross-server/match ─────────────────────────────────────────────
router.get('/match', (req, res) => {
  try {
    const db = getDb();
    initTables(db);
    const playerId = getPlayerId(req);

    const currentSeasonNumber = getCurrentSeasonNumber();
    const currentSeason = db.prepare(
      'SELECT * FROM cross_server_seasons WHERE season_number = ?'
    ).get(currentSeasonNumber);

    if (!currentSeason) {
      return res.json({ code: 400, msg: '当前无开放赛季' });
    }

    // 检查玩家是否报名
    const myRegistration = db.prepare(
      'SELECT * FROM cross_server_players WHERE season_id = ? AND player_id = ?'
    ).get(currentSeason.id, playerId);

    // 获取所有已报名玩家（用于构建对阵表）
    const players = db.prepare(`
      SELECT csp.*, cs.season_name
      FROM cross_server_players csp
      JOIN cross_server_seasons cs ON cs.id = csp.season_id
      WHERE csp.season_id = ?
      ORDER BY csp.combat_power DESC
    `).all(currentSeason.id);

    // 获取所有比赛
    const matches = db.prepare(
      'SELECT * FROM cross_server_matches WHERE season_id = ? ORDER BY round, match_index'
    ).all(currentSeason.id);

    // 获取我参与的比赛
    let myMatches = [];
    if (myRegistration) {
      myMatches = matches.filter(m =>
        m.player1_id === playerId || m.player2_id === playerId
      ).map(m => ({
        matchId: m.id,
        round: m.round,
        matchIndex: m.match_index,
        myOpponent: m.player1_id === playerId ? {
          playerId: m.player2_id,
          name: m.player2_name,
          power: null
        } : {
          playerId: m.player1_id,
          name: m.player1_name,
          power: null
        },
        status: m.status,
        winnerId: m.winner_id,
        isWinner: m.winner_id === playerId,
        isLoser: m.winner_id && m.winner_id !== playerId && (m.player1_id === playerId || m.player2_id === playerId)
      }));
    }

    // 构建对阵表（64强到决赛）
    const bracket = {
      seasonId: currentSeason.id,
      seasonName: currentSeason.season_name,
      status: currentSeason.status,
      totalPlayers: players.length,
      rounds: {}
    };

    const roundNames = {
      1: { name: '64强', size: 64 },
      2: { name: '32强', size: 32 },
      3: { name: '16强', size: 16 },
      4: { name: '8强', size: 8 },
      5: { name: '半决赛', size: 4 },
      6: { name: '决赛', size: 2 }
    };

    for (let r = 1; r <= 6; r++) {
      const roundMatches = matches.filter(m => m.round === r);
      bracket.rounds[r] = {
        name: roundNames[r].name,
        size: roundNames[r].size,
        matches: roundMatches.map(m => ({
          matchId: m.id,
          index: m.match_index,
          player1: m.player1_id ? { id: m.player1_id, name: m.player1_name } : null,
          player2: m.player2_id ? { id: m.player2_id, name: m.player2_name } : null,
          status: m.status,
          winnerId: m.winner_id,
          fightTime: m.fight_time ? m.fight_time * 1000 : null
        }))
      };
    }

    res.json({
      code: 0,
      data: {
        bracket,
        myMatch: myRegistration ? {
          registered: true,
          currentRound: myRegistration.eliminated_at ? null : getCurrentRound(matches, playerId),
          rank: myRegistration.final_rank,
          registration: {
            playerId: myRegistration.player_id,
            username: myRegistration.username,
            combatPower: myRegistration.combat_power,
            realmLevel: myRegistration.realm_level,
            realmName: REALM_NAMES[myRegistration.realm_level] || '未知',
            realmIcon: REALM_ICONS[myRegistration.realm_level] || '👤'
          },
          matches: myMatches
        } : { registered: false }
      }
    });
  } catch (err) {
    console.error('cross-server/match error:', err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

// ─── 辅助: 获取当前轮次 ──────────────────────────────────────────────────────
function getCurrentRound(matches, playerId) {
  for (let r = 6; r >= 1; r--) {
    const match = matches.find(m =>
      m.status !== 'finished' &&
      (m.player1_id === playerId || m.player2_id === playerId)
    );
    if (match) return match.round;
    const lost = matches.find(m =>
      m.winner_id && m.winner_id !== playerId &&
      (m.player1_id === playerId || m.player2_id === playerId)
    );
    if (lost) return null;
  }
  return 1;
}

// ─── POST /api/cross-server/battle ───────────────────────────────────────────
router.post('/battle', (req, res) => {
  try {
    const db = getDb();
    initTables(db);
    const playerId = getPlayerId(req);
    const { matchId, round } = req.body;

    if (!matchId || round === undefined) {
      return res.json({ code: 400, msg: '缺少参数 matchId 或 round' });
    }

    const currentSeasonNumber = getCurrentSeasonNumber();
    const currentSeason = db.prepare(
      'SELECT * FROM cross_server_seasons WHERE season_number = ?'
    ).get(currentSeasonNumber);

    if (!currentSeason) {
      return res.json({ code: 400, msg: '当前无开放赛季' });
    }

    if (!isMatchDay()) {
      return res.json({ code: 400, msg: '今日非比赛日' });
    }

    // 获取比赛信息
    const match = db.prepare(
      'SELECT * FROM cross_server_matches WHERE id = ? AND season_id = ?'
    ).get(matchId, currentSeason.id);

    if (!match) {
      return res.json({ code: 404, msg: '比赛不存在' });
    }

    // 检查玩家是否参与此比赛
    if (match.player1_id !== playerId && match.player2_id !== playerId) {
      return res.json({ code: 403, msg: '您不参与此比赛' });
    }

    if (match.status === 'finished') {
      return res.json({ code: 400, msg: '比赛已结束' });
    }

    // 获取双方玩家信息
    const player1 = db.prepare('SELECT * FROM cross_server_players WHERE id = ?').get(match.player1_id);
    const player2 = db.prepare('SELECT * FROM cross_server_players WHERE id = ?').get(match.player2_id);

    if (!player1 || !player2) {
      return res.json({ code: 400, msg: '参赛者信息异常' });
    }

    // 模拟战斗
    const battleResult = simulateBattle(player1.combat_power, player2.combat_power);
    const winner = battleResult === 'player1' ? player1 : player2;
    const loser = battleResult === 'player1' ? player2 : player1;

    const now = Math.floor(Date.now() / 1000);

    // 更新比赛结果
    db.prepare(`
      UPDATE cross_server_matches
      SET winner_id = ?, loser_id = ?, status = 'finished', fight_time = ?
      WHERE id = ?
    `).run(winner.player_id, loser.player_id, now, matchId);

    // 标记失败者淘汰
    db.prepare(`
      UPDATE cross_server_players
      SET eliminated_at = ?, final_rank = ?
      WHERE id = ?
    `).run(now, getRankForRound(match.round, false), loser.id);

    // 记录战斗
    db.prepare(`
      INSERT INTO cross_server_battles (match_id, season_id, player1_id, player2_id, winner_id, loser_id, player1_power, player2_power, battle_log)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(matchId, currentSeason.id, player1.player_id, player2.player_id, winner.player_id, loser.player_id, player1.combat_power, player2.combat_power,
      JSON.stringify({ result: battleResult, timestamp: now }));

    // 检查是否需要晋级到下一轮
    const nextRound = match.round + 1;
    if (nextRound <= 6) {
      const nextMatchIndex = Math.ceil(match.match_index / 2);
      let nextMatch = db.prepare(
        'SELECT * FROM cross_server_matches WHERE season_id = ? AND round = ? AND match_index = ?'
      ).get(currentSeason.id, nextRound, nextMatchIndex);

      if (!nextMatch) {
        // 创建下一轮比赛
        const newMatch = db.prepare(`
          INSERT INTO cross_server_matches (season_id, round, match_index, status)
          VALUES (?, ?, ?, 'ready')
        `).run(currentSeason.id, nextRound, nextMatchIndex);
        nextMatch = db.prepare('SELECT * FROM cross_server_matches WHERE id = ?').get(newMatch.lastInsertRowid);
      }

      // 将胜者填入下一轮
      const slot = match.match_index % 2 === 1 ? 'player1' : 'player2';
      const slotId = slot === 'player1' ? 'player1_id' : 'player2_id';
      const slotName = slot === 'player1' ? 'player1_name' : 'player2_name';

      db.prepare(`UPDATE cross_server_matches SET ${slotId} = ?, ${slotName} = ? WHERE id = ?`)
        .run(winner.player_id, winner.username, nextMatch.id);
    } else {
      // 决赛结束，更新赛季
      db.prepare(`
        UPDATE cross_server_seasons SET status = 'finished', winner_id = ? WHERE id = ?
      `).run(winner.player_id, currentSeason.id);

      // 冠军获得奖励
      grantSeasonRewards(db, currentSeason.id, winner.player_id, 1);
      // 亚军奖励
      grantSeasonRewards(db, currentSeason.id, loser.player_id, 2);
    }

    // 当前轮其他选手奖励
    const myRank = match.round === 6 ? 1 : getRankForRound(match.round, true);
    if (match.round < 6) {
      grantRoundRewards(db, currentSeason.id, winner.player_id, match.round);
    }

    res.json({
      code: 0,
      data: {
        success: true,
        matchId: parseInt(matchId),
        round: match.round,
        winner: {
          playerId: winner.player_id,
          name: winner.username,
          combatPower: winner.combat_power
        },
        loser: {
          playerId: loser.player_id,
          name: loser.username
        },
        isWinner: winner.player_id === playerId,
        nextRound: nextRound <= 6 ? nextRound : null,
        myRank,
        rewards: winner.player_id === playerId ? getRoundRewardPreview(match.round) : null
      }
    });
  } catch (err) {
    console.error('cross-server/battle error:', err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

function getRankForRound(round, isWinner) {
  const ranks = { 1: 32, 2: 16, 3: 8, 4: 4, 5: 2, 6: 1 };
  return isWinner ? (ranks[round - 1] || 64) : (ranks[round] || 64);
}

function getRoundRewardPreview(round) {
  const previews = {
    1: { name: '64强', reward: 2000 },
    2: { name: '32强', reward: 2000 },
    3: { name: '16强', reward: 3000 },
    4: { name: '8强', reward: 5000 },
    5: { name: '半决赛', reward: 10000 },
    6: { name: '冠军', reward: 50000 }
  };
  return previews[round] || { name: '参赛', reward: 2000 };
}

function grantRoundRewards(db, seasonId, playerId, round) {
  const rewards = { 1: 2000, 2: 2000, 3: 3000, 4: 5000, 5: 10000 };
  const amount = rewards[round] || 2000;
  try {
    db.prepare('UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?').run(amount, playerId);
  } catch (e) {
    try {
      db.prepare('UPDATE players SET spirit_stones = spirit_stones + ? WHERE id = ?').run(amount, playerId);
    } catch (e2) { /* ignore */ }
  }
  db.prepare(`INSERT INTO cross_server_rewards_log (season_id, player_id, reward_type, reward_amount) VALUES (?, ?, 'round_reward', ?)`).run(seasonId, playerId, amount);
}

function grantSeasonRewards(db, seasonId, playerId, rank) {
  let reward = SEASON_REWARDS.participant;
  if (rank === 1) reward = SEASON_REWARDS.champion;
  else if (rank === 2) reward = SEASON_REWARDS.runnerUp;
  else if (rank === 4) reward = SEASON_REWARDS.semiFinalist;
  else if (rank === 8) reward = SEASON_REWARDS.quarterFinalist;

  try {
    db.prepare('UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?').run(reward.spiritStones, playerId);
  } catch (e) {
    try {
      db.prepare('UPDATE players SET spirit_stones = spirit_stones + ? WHERE id = ?').run(reward.spiritStones, playerId);
    } catch (e2) { /* ignore */ }
  }
  db.prepare(`INSERT INTO cross_server_rewards_log (season_id, player_id, reward_type, reward_amount) VALUES (?, ?, ?, ?)`)
    .run(seasonId, playerId, `rank_${rank}`, reward.spiritStones);
}

// ─── GET /api/cross-server/rewards ──────────────────────────────────────────
router.get('/rewards', (req, res) => {
  try {
    const db = getDb();
    initTables(db);
    const playerId = getPlayerId(req);

    const currentSeasonNumber = getCurrentSeasonNumber();
    const currentSeason = db.prepare(
      'SELECT * FROM cross_server_seasons WHERE season_number = ?'
    ).get(currentSeasonNumber);

    const seasonRewards = [
      {
        rank: 1,
        title: '冠军',
        icon: '👑',
        spiritStones: 50000,
        description: '跨服战冠军',
        bonus: '🏆 王者专属称号 + 至尊外观'
      },
      {
        rank: 2,
        title: '亚军',
        icon: '🥈',
        spiritStones: 30000,
        description: '跨服战亚军'
      },
      {
        rank: 4,
        title: '四强',
        icon: '🏅',
        spiritStones: 15000,
        description: '跨服战四强'
      },
      {
        rank: 8,
        title: '八强',
        icon: '🎖️',
        spiritStones: 8000,
        description: '跨服战八强'
      },
      {
        rank: 16,
        title: '16强',
        icon: '🛡️',
        spiritStones: 5000,
        description: '晋级16强'
      },
      {
        rank: 32,
        title: '32强',
        icon: '⚔️',
        spiritStones: 3000,
        description: '晋级32强'
      },
      {
        rank: 64,
        title: '64强',
        icon: '🎽',
        spiritStones: 2000,
        description: '参与64强淘汰赛'
      }
    ];

    // 获取当前赛季参赛玩家的排名信息
    let myBestRank = null;
    let totalEarned = 0;
    if (currentSeason) {
      const myRecord = db.prepare(
        'SELECT final_rank FROM cross_server_players WHERE season_id = ? AND player_id = ?'
      ).get(currentSeason.id, playerId);
      if (myRecord && myRecord.final_rank) {
        myBestRank = myRecord.final_rank;
      }

      const rewardsLog = db.prepare(
        'SELECT SUM(reward_amount) as total FROM cross_server_rewards_log WHERE season_id = ? AND player_id = ? AND reward_amount > 0'
      ).get(currentSeason.id, playerId);
      totalEarned = rewardsLog?.total || 0;
    }

    res.json({
      code: 0,
      data: {
        seasonRewards,
        myBestRank,
        totalEarned,
        currentSeasonName: currentSeason?.season_name || null
      }
    });
  } catch (err) {
    console.error('cross-server/rewards error:', err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

// ─── GET /api/cross-server/leaderboard ───────────────────────────────────────
router.get('/leaderboard', (req, res) => {
  try {
    const db = getDb();
    initTables(db);

    // 获取历届冠军
    const champions = db.prepare(`
      SELECT cs.season_name, cs.season_number, cs.winner_id, csp.username, csp.combat_power
      FROM cross_server_seasons cs
      JOIN cross_server_players csp ON csp.player_id = cs.winner_id AND csp.season_id = cs.id
      WHERE cs.winner_id IS NOT NULL
      ORDER BY cs.season_number DESC
      LIMIT 20
    `).all();

    // 获取当前赛季8强
    const currentSeasonNumber = getCurrentSeasonNumber();
    const currentSeason = db.prepare(
      'SELECT * FROM cross_server_seasons WHERE season_number = ?'
    ).get(currentSeasonNumber);

    let topPlayers = [];
    if (currentSeason) {
      topPlayers = db.prepare(`
        SELECT csp.player_id, csp.username, csp.combat_power, csp.realm_level,
               cs.season_name, cs.season_number,
               CASE WHEN csp.eliminated_at IS NULL THEN 'ongoing' ELSE 'eliminated' END as status
        FROM cross_server_players csp
        JOIN cross_server_seasons cs ON cs.id = csp.season_id
        WHERE csp.season_id = ?
        ORDER BY
          CASE WHEN csp.final_rank IS NOT NULL THEN csp.final_rank ELSE 999 END ASC,
          csp.combat_power DESC
        LIMIT 20
      `).all(currentSeason.id);

      topPlayers = topPlayers.map(p => ({
        playerId: p.player_id,
        username: p.username,
        combatPower: p.combat_power,
        realmLevel: p.realm_level,
        realmName: REALM_NAMES[p.realm_level] || '未知',
        realmIcon: REALM_ICONS[p.realm_level] || '👤',
        status: p.status,
        rank: p.status === 'ongoing' ? '比赛中' : p.final_rank
      }));
    }

    res.json({
      code: 0,
      data: {
        champions: champions.map(c => ({
          seasonName: c.season_name,
          seasonNumber: c.season_number,
          playerId: c.winner_id,
          username: c.username,
          combatPower: c.combat_power
        })),
        topPlayers,
        currentSeasonName: currentSeason?.season_name || null
      }
    });
  } catch (err) {
    console.error('cross-server/leaderboard error:', err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

module.exports = router;
