/**
 * 琴棋书画 Art System - routes/art.js
 * 琴/棋/书/画 四大艺术系统后端 API
 * 
 * Endpoints:
 * POST /api/art/performance  - 演奏（古琴/琵琶/笛/筝）
 * POST /api/art/chess/start   - 开始棋局
 * POST /api/art/chess/move    - 落子
 * POST /api/art/chess/status  - 棋局状态
 * POST /api/art/calligraphy   - 书法
 * POST /api/art/painting      - 绘画
 * GET  /api/art/player/:playerId  - 玩家艺术数据
 * GET  /api/art/history/:playerId - 历史记录
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Database path
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db = null;
function getDb() {
  if (!db) {
    try {
      const Database = require('better-sqlite3');
      db = new Database(DB_PATH);
      db.pragma('journal_mode=WAL');
      db.pragma('busy_timeout=5000');
    } catch (e) {
      return null;
    }
  }
  return db;
}

// ─── Database Initialization ─────────────────────────────────────────────────
function initArtTables() {
  const database = getDb();
  if (!database) return;

  try {
    database.exec(`
      CREATE TABLE IF NOT EXISTS player_art_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        music_exp INTEGER DEFAULT 0,
        music_level INTEGER DEFAULT 1,
        chess_exp INTEGER DEFAULT 0,
        chess_level INTEGER DEFAULT 1,
        calligraphy_exp INTEGER DEFAULT 0,
        calligraphy_level INTEGER DEFAULT 1,
        painting_exp INTEGER DEFAULT 0,
        painting_level INTEGER DEFAULT 1,
        total_score INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(user_id)
      );

      CREATE TABLE IF NOT EXISTS art_performance_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        art_type TEXT NOT NULL,
        score INTEGER DEFAULT 0,
        grade TEXT DEFAULT 'C',
        duration INTEGER DEFAULT 0,
        metadata TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS art_chess_games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        board_state TEXT NOT NULL,
        current_turn TEXT DEFAULT 'player',
        move_history TEXT DEFAULT '[]',
        status TEXT DEFAULT 'active',
        winner TEXT DEFAULT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // Seed initial data if empty
    const count = database.prepare('SELECT COUNT(*) as c FROM player_art_stats').get();
    if (count.c === 0) {
      console.log('[Art] Tables initialized');
    }
  } catch (e) {
    console.error('[Art] initArtTables error:', e.message);
  }
}

// ─── Grade Calculation ───────────────────────────────────────────────────────
function calculateGrade(score) {
  if (score >= 95) return 'S';
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  return 'C';
}

// ─── Experience & Level Calculation ──────────────────────────────────────────
function expForLevel(level) {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

function addExpAndLevelUp(database, userId, artType, gainedExp) {
  const colExp = `${artType}_exp`;
  const colLevel = `${artType}_level`;
  
  const stats = database.prepare(
    `SELECT ${colExp} as exp, ${colLevel} as level FROM player_art_stats WHERE user_id = ?`
  ).get(userId);

  if (!stats) return { leveledUp: false, newLevel: 1, newExp: gainedExp };

  let newExp = stats.exp + gainedExp;
  let newLevel = stats.level;
  let leveledUp = false;

  while (newExp >= expForLevel(newLevel)) {
    newExp -= expForLevel(newLevel);
    newLevel++;
    leveledUp = true;
  }

  database.prepare(
    `UPDATE player_art_stats SET ${colExp} = ?, ${colLevel} = ?, total_score = total_score + ?, updated_at = datetime('now') WHERE user_id = ?`
  ).run(newExp, newLevel, gainedExp, userId);

  return { leveledUp, newLevel, newExp };
}

// ─── Art Stat Bonuses ────────────────────────────────────────────────────────
function getArtBonus(level, artType) {
  const bonuses = {
    music:       { atk: level * 2,    def: 0,      hp: level * 5,   critRate: level * 0.1 },
    chess:      { atk: level * 1,    def: level * 1.5, hp: level * 3, critRate: level * 0.2 },
    calligraphy:{ atk: level * 1.5, def: level * 2,   hp: level * 4, critRate: level * 0.1 },
    painting:   { atk: level * 1,  def: level * 1,   hp: level * 8, critRate: level * 0.05 }
  };
  return bonuses[artType] || bonuses.music;
}

// ─── Get or Create Player Art Stats ─────────────────────────────────────────
function getOrCreateArtStats(database, userId) {
  let stats = database.prepare('SELECT * FROM player_art_stats WHERE user_id = ?').get(userId);
  if (!stats) {
    database.prepare(
      'INSERT OR IGNORE INTO player_art_stats (user_id) VALUES (?)'
    ).run(userId);
    stats = database.prepare('SELECT * FROM player_art_stats WHERE user_id = ?').get(userId);
  }
  return stats;
}

// ─── extractUserId helper ───────────────────────────────────────────────────
function extractUserId(req) {
  return parseInt(req.body?.userId || req.body?.player_id || req.params?.playerId || req.params?.userId || req.query?.player_id || req.query?.userId || 1);
}

// ─── Initialize tables on load ───────────────────────────────────────────────
initArtTables();

// ═══════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// POST /api/art/performance
// Body: { playerId, type: 'guqin'|'pipa'|'flute'|'guzheng', mode: 'practice'|'performance', score, combo, accuracy, duration }
router.post('/performance', (req, res) => {
  const database = getDb();
  if (!database) return res.status(500).json({ success: false, error: 'Database unavailable' });

  const userId = extractUserId(req);
  const { type, mode = 'practice', score = 0, combo = 0, accuracy = 0, duration = 0 } = req.body;

  const validTypes = ['guqin', 'pipa', 'flute', 'guzheng'];
  const artType = validTypes.includes(type) ? type : 'guqin';
  const grade = calculateGrade(score);
  
  // Base exp + grade bonus
  const gradeBonus = { S: 50, A: 30, B: 15, C: 5 }[grade] || 5;
  const modeBonus = mode === 'performance' ? 2 : 1;
  const gainedExp = Math.floor((score / 10 + gradeBonus) * modeBonus);

  try {
    getOrCreateArtStats(database, userId);
    const levelResult = addExpAndLevelUp(database, userId, 'music', gainedExp);

    // Record performance
    database.prepare(
      'INSERT INTO art_performance_records (user_id, art_type, score, grade, duration, metadata) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(userId, `music_${artType}`, score, grade, duration, JSON.stringify({ combo, accuracy, mode }));

    const stats = getOrCreateArtStats(database, userId);
    const bonus = getArtBonus(stats.music_level, 'music');

    res.json({
      success: true,
      performance: { score, grade, gainedExp, artType },
      cultivation: gainedExp,
      leveledUp: levelResult.leveledUp,
      newLevel: levelResult.newLevel,
      artBonus: bonus
    });
  } catch (e) {
    console.error('[Art/performance] error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/art/chess/start
// Body: { playerId }
router.post('/chess/start', (req, res) => {
  const database = getDb();
  if (!database) return res.status(500).json({ success: false, error: 'Database unavailable' });

  const userId = extractUserId(req);

  try {
    // Close any existing active game
    database.prepare(
      "UPDATE art_chess_games SET status = 'abandoned' WHERE user_id = ? AND status = 'active'"
    ).run(userId);

    // Standard 8x8 board, 0=empty, 1=red, 2=black
    // Initial placement: rows 0,1=black(2), rows 6,7=red(1)
    const initBoard = [];
    for (let r = 0; r < 8; r++) {
      initBoard[r] = [];
      for (let c = 0; c < 8; c++) {
        if (r < 2) initBoard[r][c] = 2; // black
        else if (r > 5) initBoard[r][c] = 1; // red
        else initBoard[r][c] = 0;
      }
    }

    const result = database.prepare(
      'INSERT INTO art_chess_games (user_id, board_state, current_turn, move_history, status) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, JSON.stringify(initBoard), 'player', '[]', 'active');

    res.json({
      success: true,
      gameId: result.lastInsertRowid,
      board: initBoard,
      currentTurn: 'player',
      message: '棋局开始，红方先行'
    });
  } catch (e) {
    console.error('[Art/chess/start] error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/art/chess/move
// Body: { playerId, gameId, fromRow, fromCol, toRow, toCol }
router.post('/chess/move', (req, res) => {
  const database = getDb();
  if (!database) return res.status(500).json({ success: false, error: 'Database unavailable' });

  const userId = extractUserId(req);
  const { gameId, fromRow, fromCol, toRow, toCol } = req.body;

  try {
    const game = database.prepare(
      "SELECT * FROM art_chess_games WHERE id = ? AND user_id = ? AND status = 'active'"
    ).get(gameId, userId);

    if (!game) {
      return res.status(400).json({ success: false, error: '无进行中的棋局，请先开始新棋局' });
    }

    let board = JSON.parse(game.board_state);
    const piece = board[fromRow]?.[fromCol];

    if (!piece || piece !== 1) {
      return res.status(400).json({ success: false, error: '只能移动己方棋子(红方)' });
    }

    // Basic move validation (simple: not same color target, destination valid)
    const targetPiece = board[toRow]?.[toCol];
    if (targetPiece === 1) {
      return res.status(400).json({ success: false, error: '目标位置有己方棋子' });
    }

    // Move piece
    board[fromRow][fromCol] = 0;
    board[toRow][toCol] = piece;

    // Record move
    const moves = JSON.parse(game.move_history);
    moves.push({ from: [fromRow, fromCol], to: [toRow, toCol], player: 'red' });

    // AI response: move a black piece (simple random valid move)
    let aiMoved = false;
    const blackPieces = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c] === 2) blackPieces.push([r, c]);
      }
    }

    if (blackPieces.length > 0) {
      // Pick random black piece and move toward player side
      const [aiRow, aiCol] = blackPieces[Math.floor(Math.random() * blackPieces.length)];
      const possibleMoves = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = aiRow + dr, nc = aiCol + dc;
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] !== 2) {
            possibleMoves.push([nr, nc]);
          }
        }
      }
      if (possibleMoves.length > 0) {
        const [toAr, toAc] = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        board[aiRow][aiCol] = 0;
        if (board[toAr][toAc] === 1) {
          // AI captured red piece - game over, AI wins
          board[toAr][toAc] = 2;
          moves.push({ from: [aiRow, aiCol], to: [toAr, toAc], player: 'black' });
          database.prepare(
            "UPDATE art_chess_games SET board_state = ?, move_history = ?, current_turn = ?, status = ?, winner = ?, updated_at = datetime('now') WHERE id = ?"
          ).run(JSON.stringify(board), JSON.stringify(moves), 'player', 'finished', 'black', gameId);

          const playerStats = getOrCreateArtStats(database, userId);
          const gainedExp = 5;
          addExpAndLevelUp(database, userId, 'chess', gainedExp);

          return res.json({
            success: true,
            board,
            moveRecorded: { from: [fromRow, fromCol], to: [toRow, toCol] },
            aiMove: { from: [aiRow, aiCol], to: [toAr, toAc], captured: true },
            gameOver: true,
            winner: 'AI(黑方)',
            message: '你输了！AI吃掉了你的帅',
            gainedExp
          });
        } else {
          board[toAr][toAc] = 2;
          moves.push({ from: [aiRow, aiCol], to: [toAr, toAc], player: 'black' });
          aiMoved = true;
        }
      }
    }

    // Check win: AI general reached row 7
    let gameOver = false;
    let winner = null;
    let message = '继续';
    let gainedExp = 3;

    // Check if player captured AI general (AI has no pieces left)
    if (blackPieces.length === 0 || !board.some(row => row.includes(2))) {
      gameOver = true;
      winner = 'player';
      gainedExp = 20;
      message = '恭喜获胜！将死AI';
    } else {
      // AI general always exists, check if AI has any pieces
      const remainingAI = board.flat().filter(v => v === 2).length;
      if (remainingAI === 0) {
        gameOver = true;
        winner = 'player';
        gainedExp = 20;
        message = '恭喜获胜！吃光AI所有棋子';
      }
    }

    if (gameOver) {
      database.prepare(
        "UPDATE art_chess_games SET board_state = ?, move_history = ?, current_turn = ?, status = ?, winner = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(JSON.stringify(board), JSON.stringify(moves), 'player', 'finished', winner, gameId);
    } else {
      database.prepare(
        "UPDATE art_chess_games SET board_state = ?, move_history = ?, current_turn = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(JSON.stringify(board), JSON.stringify(moves), 'player', gameId);
    }

    const levelResult = addExpAndLevelUp(database, userId, 'chess', gainedExp);
    const stats = getOrCreateArtStats(database, userId);
    const bonus = getArtBonus(stats.chess_level, 'chess');

    res.json({
      success: true,
      board,
      moveRecorded: { from: [fromRow, fromCol], to: [toRow, toCol] },
      aiMove: aiMoved ? moves[moves.length - 1] : null,
      gameOver,
      winner,
      message,
      gainedExp,
      leveledUp: levelResult.leveledUp,
      newLevel: levelResult.newLevel,
      artBonus: bonus
    });
  } catch (e) {
    console.error('[Art/chess/move] error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/art/chess/status?gameId=X
router.get('/chess/status', (req, res) => {
  const database = getDb();
  if (!database) return res.status(500).json({ success: false, error: 'Database unavailable' });

  const userId = extractUserId(req);
  const gameId = parseInt(req.query.gameId);

  try {
    const game = database.prepare(
      "SELECT * FROM art_chess_games WHERE id = ? AND user_id = ?"
    ).get(gameId, userId);

    if (!game) {
      return res.status(404).json({ success: false, error: '棋局不存在' });
    }

    res.json({
      success: true,
      gameId: game.id,
      board: JSON.parse(game.board_state),
      currentTurn: game.current_turn,
      moveHistory: JSON.parse(game.move_history),
      status: game.status,
      winner: game.winner
    });
  } catch (e) {
    console.error('[Art/chess/status] error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/art/calligraphy
// Body: { playerId, style: 'seal'|'cursive'|'regular'|'running', content, quality }
router.post('/calligraphy', (req, res) => {
  const database = getDb();
  if (!database) return res.status(500).json({ success: false, error: 'Database unavailable' });

  const userId = extractUserId(req);
  const { style = 'regular', content = '', quality = 0 } = req.body;

  const validStyles = ['seal', 'cursive', 'regular', 'running'];
  const artStyle = validStyles.includes(style) ? style : 'regular';

  const score = Math.min(100, Math.max(0, quality));
  const grade = calculateGrade(score);

  const styleBonus = { seal: 1.5, cursive: 1.3, regular: 1.0, running: 1.2 }[artStyle] || 1.0;
  const gradeBonus = { S: 50, A: 30, B: 15, C: 5 }[grade] || 5;
  const gainedExp = Math.floor((score / 10 + gradeBonus) * styleBonus);

  try {
    getOrCreateArtStats(database, userId);
    const levelResult = addExpAndLevelUp(database, userId, 'calligraphy', gainedExp);

    database.prepare(
      'INSERT INTO art_performance_records (user_id, art_type, score, grade, metadata) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, `calligraphy_${artStyle}`, score, grade, JSON.stringify({ content, style: artStyle }));

    const stats = getOrCreateArtStats(database, userId);
    const bonus = getArtBonus(stats.calligraphy_level, 'calligraphy');

    res.json({
      success: true,
      calligraphy: { style: artStyle, score, grade, gainedExp },
      cultivation: gainedExp,
      leveledUp: levelResult.leveledUp,
      newLevel: levelResult.newLevel,
      artBonus: bonus
    });
  } catch (e) {
    console.error('[Art/calligraphy] error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/art/painting
// Body: { playerId, genre: 'landscape'|'bird_flower'|'figure'|'animal', theme, creativity }
router.post('/painting', (req, res) => {
  const database = getDb();
  if (!database) return res.status(500).json({ success: false, error: 'Database unavailable' });

  const userId = extractUserId(req);
  const { genre = 'landscape', theme = '', creativity = 0 } = req.body;

  const validGenres = ['landscape', 'bird_flower', 'figure', 'animal'];
  const artGenre = validGenres.includes(genre) ? genre : 'landscape';

  const score = Math.min(100, Math.max(0, creativity));
  const grade = calculateGrade(score);

  const genreBonus = { landscape: 1.5, bird_flower: 1.2, figure: 1.3, animal: 1.2 }[artGenre] || 1.0;
  const gradeBonus = { S: 60, A: 35, B: 18, C: 8 }[grade] || 8;
  const gainedExp = Math.floor((score / 10 + gradeBonus) * genreBonus);

  try {
    getOrCreateArtStats(database, userId);
    const levelResult = addExpAndLevelUp(database, userId, 'painting', gainedExp);

    database.prepare(
      'INSERT INTO art_performance_records (user_id, art_type, score, grade, metadata) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, `painting_${artGenre}`, score, grade, JSON.stringify({ theme, genre: artGenre }));

    const stats = getOrCreateArtStats(database, userId);
    const bonus = getArtBonus(stats.painting_level, 'painting');

    res.json({
      success: true,
      painting: { genre: artGenre, score, grade, gainedExp },
      cultivation: gainedExp,
      leveledUp: levelResult.leveledUp,
      newLevel: levelResult.newLevel,
      artBonus: bonus
    });
  } catch (e) {
    console.error('[Art/painting] error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/art/player/:playerId
router.get('/player/:playerId', (req, res) => {
  const database = getDb();
  if (!database) return res.status(500).json({ success: false, error: 'Database unavailable' });

  const userId = parseInt(req.params.playerId) || extractUserId(req);

  try {
    const stats = getOrCreateArtStats(database, userId);
    if (!stats) {
      return res.json({
        success: true,
        player: {
          userId,
          music: { level: 1, exp: 0, nextExp: expForLevel(1) },
          chess: { level: 1, exp: 0, nextExp: expForLevel(1) },
          calligraphy: { level: 1, exp: 0, nextExp: expForLevel(1) },
          painting: { level: 1, exp: 0, nextExp: expForLevel(1) },
          totalScore: 0,
          artBonus: getArtBonus(1, 'music')
        }
      });
    }

    const musicBonus = getArtBonus(stats.music_level, 'music');
    const chessBonus = getArtBonus(stats.chess_level, 'chess');
    const calligraphyBonus = getArtBonus(stats.calligraphy_level, 'calligraphy');
    const paintingBonus = getArtBonus(stats.painting_level, 'painting');

    // Combined bonuses
    const totalAtk = musicBonus.atk + chessBonus.atk + calligraphyBonus.atk + paintingBonus.atk;
    const totalDef = musicBonus.def + chessBonus.def + calligraphyBonus.def + paintingBonus.def;
    const totalHp = musicBonus.hp + chessBonus.hp + calligraphyBonus.hp + paintingBonus.hp;
    const totalCrit = musicBonus.critRate + chessBonus.critRate + calligraphyBonus.critRate + paintingBonus.critRate;

    res.json({
      success: true,
      player: {
        userId,
        music: {
          level: stats.music_level,
          exp: stats.music_exp,
          nextExp: expForLevel(stats.music_level + 1),
          ...musicBonus
        },
        chess: {
          level: stats.chess_level,
          exp: stats.chess_exp,
          nextExp: expForLevel(stats.chess_level + 1),
          ...chessBonus
        },
        calligraphy: {
          level: stats.calligraphy_level,
          exp: stats.calligraphy_exp,
          nextExp: expForLevel(stats.calligraphy_level + 1),
          ...calligraphyBonus
        },
        painting: {
          level: stats.painting_level,
          exp: stats.painting_exp,
          nextExp: expForLevel(stats.painting_level + 1),
          ...paintingBonus
        },
        totalScore: stats.total_score,
        combinedBonus: {
          atk: Math.round(totalAtk * 10) / 10,
          def: Math.round(totalDef * 10) / 10,
          hp: Math.round(totalHp * 10) / 10,
          critRate: Math.round(totalCrit * 100) / 100 + '%'
        }
      }
    });
  } catch (e) {
    console.error('[Art/player] error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/art/history/:playerId
router.get('/history/:playerId', (req, res) => {
  const database = getDb();
  if (!database) return res.status(500).json({ success: false, error: 'Database unavailable' });

  const userId = parseInt(req.params.playerId) || extractUserId(req);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);

  try {
    const records = database.prepare(
      'SELECT * FROM art_performance_records WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(userId, limit);

    res.json({
      success: true,
      records: records.map(r => ({
        id: r.id,
        artType: r.art_type,
        score: r.score,
        grade: r.grade,
        duration: r.duration,
        metadata: JSON.parse(r.metadata || '{}'),
        createdAt: r.created_at
      }))
    });
  } catch (e) {
    console.error('[Art/history] error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/art/ (root - info)
router.get('/', (req, res) => {
  const database = getDb();
  if (!database) return res.status(500).json({ success: false, error: 'Database unavailable' });

  const userId = extractUserId(req);
  const stats = getOrCreateArtStats(database, userId);

  res.json({
    success: true,
    message: '琴棋书画艺术系统 API',
    endpoints: {
      'POST /performance': '演奏 (guqin/pipa/flute/guzheng)',
      'POST /chess/start': '开始棋局',
      'POST /chess/move': '落子 {gameId, fromRow, fromCol, toRow, toCol}',
      'POST /chess/status': '棋局状态 {gameId}',
      'POST /calligraphy': '书法 (seal/cursive/regular/running)',
      'POST /painting': '绘画 (landscape/bird_flower/figure/animal)',
      'GET /player/:playerId': '玩家艺术数据',
      'GET /history/:playerId': '历史记录'
    },
    player: {
      musicLevel: stats?.music_level || 1,
      chessLevel: stats?.chess_level || 1,
      calligraphyLevel: stats?.calligraphy_level || 1,
      paintingLevel: stats?.painting_level || 1
    }
  });
});

module.exports = router;
