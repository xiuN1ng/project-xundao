/**
 * 论道系统 (Lundao) - 修炼论道，后端API
 * 玩家参与论道挑战，通过答题获得积分和奖励
 */
const express = require('express');
const path = require('path');
const router = express.Router();

const Logger = {
  info: (...args) => console.log('[lundao]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[lundao:error]', new Date().toISOString(), ...args),
  warn: (...args) => console.warn('[lundao:warn]', new Date().toISOString(), ...args)
};

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  Logger.info('论道数据库连接成功');
} catch (err) {
  Logger.error('数据库连接失败:', err.message);
  db = {
    _data: {},
    prepare() { return this; },
    get() { return null; },
    all() { return []; },
    run() { return { changes: 0 }; }
  };
}

// ============ 数据库初始化 ============
function initLundaoTables() {
  if (!db) return;
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS lundao_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_id INTEGER NOT NULL UNIQUE,
        question TEXT NOT NULL,
        option_a TEXT NOT NULL,
        option_b TEXT NOT NULL,
        option_c TEXT,
        option_d TEXT,
        correct_answer TEXT NOT NULL,
        difficulty INTEGER DEFAULT 1,
        category TEXT DEFAULT 'cultivation',
        explanation TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS lundao_player (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL UNIQUE,
        total_score INTEGER DEFAULT 0,
        current_streak INTEGER DEFAULT 0,
        highest_streak INTEGER DEFAULT 0,
        total_challenges INTEGER DEFAULT 0,
        correct_answers INTEGER DEFAULT 0,
        season TEXT DEFAULT 'season_1',
        rank TEXT DEFAULT '凡人',
        rank_score INTEGER DEFAULT 0,
        daily_challenges_used INTEGER DEFAULT 0,
        last_daily_reset TEXT,
        weekly_challenges INTEGER DEFAULT 0,
        last_weekly_reset TEXT,
        total_wins INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS lundao_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        question_id INTEGER NOT NULL,
        selected_answer TEXT,
        correct_answer TEXT,
        is_correct INTEGER DEFAULT 0,
        score_earned INTEGER DEFAULT 0,
        difficulty INTEGER DEFAULT 1,
        answered_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS lundao_challenge (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        challenge_type TEXT DEFAULT 'daily',
        questions_count INTEGER DEFAULT 5,
        correct_count INTEGER DEFAULT 0,
        total_score INTEGER DEFAULT 0,
        start_time TEXT,
        end_time TEXT,
        status TEXT DEFAULT 'active',
        season TEXT DEFAULT 'season_1',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS lundao_rewards_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        reward_type TEXT NOT NULL,
        reward_amount INTEGER NOT NULL,
        claimed_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    Logger.info('论道数据表初始化完成');
  } catch (err) {
    Logger.error('论道数据表初始化失败:', err.message);
  }
}

// ============ 题库初始化 ============
const LUDAO_QUESTIONS = [
  // 炼气期题目 (difficulty=1)
  { question_id: 1, question: '修真第一步是什么？', option_a: '筑基', option_b: '炼气', option_c: '金丹', option_d: '元婴', correct_answer: 'B', difficulty: 1, category: 'cultivation', explanation: '炼气是修真的第一步，吸收天地灵气入体。' },
  { question_id: 2, question: '天地灵气主要存在于哪里？', option_a: '深海', option_b: '高空', option_c: '名山大川', option_d: '都市', correct_answer: 'C', difficulty: 1, category: 'cultivation', explanation: '名山大川灵气充沛，适合修炼。' },
  { question_id: 3, question: '下列哪个不是五行元素？', option_a: '金', option_b: '木', option_c: '风', option_d: '水', correct_answer: 'C', difficulty: 1, category: 'element', explanation: '金木水火土为五行，风不在其中。' },
  { question_id: 4, question: '筑基丹的主要作用是？', option_a: '提升战力', option_b: '辅助筑基', option_c: '治疗伤病', option_d: '延长寿命', correct_answer: 'B', difficulty: 1, category: 'pills', explanation: '筑基丹帮助炼气期修士突破到筑基境。' },
  { question_id: 5, question: '经脉运行的方向是？', option_a: '单向循环', option_b: '双向循环', option_c: '无规律', option_d: '随机', correct_answer: 'A', difficulty: 1, category: 'meridian', explanation: '灵气沿经脉单向运行，不可逆行。' },
  { question_id: 6, question: '丹田位于人体哪个部位？', option_a: '胸口', option_b: '头顶', option_c: '下腹', option_d: '背部', correct_answer: 'C', difficulty: 1, category: 'anatomy', explanation: '丹田位于下腹部，是存储灵气的核心。' },
  { question_id: 7, question: '练气功法不包括以下哪种？', option_a: '吐纳法', option_b: '导引术', option_c: '飞剑术', option_d: '静坐法', correct_answer: 'C', difficulty: 1, category: 'technique', explanation: '飞剑术是筑基期以后的战斗技法。' },
  { question_id: 8, question: '突破筑基需要什么条件？', option_a: '灵石足够多', option_b: '灵气充盈且经脉通畅', option_c: '服用筑基丹即可', option_d: '战力达到一定值', correct_answer: 'B', difficulty: 1, category: 'breakthrough', explanation: '突破需要灵气充盈和经脉通畅两个条件。' },

  // 筑基期题目 (difficulty=2)
  { question_id: 9, question: '筑基期修士体内灵气形态是？', option_a: '气态', option_b: '液态', option_c: '固态', option_d: '等离子态', correct_answer: 'B', difficulty: 2, category: 'cultivation', explanation: '筑基期灵气凝结为液态，质量更高。' },
  { question_id: 10, question: '下列哪种体质最适合修炼？', option_a: '凡人体质', option_b: '空灵体质', option_c: '浊体', option_d: '病体', correct_answer: 'B', difficulty: 2, category: 'constitution', explanation: '空灵体质与天地灵气亲和力最强。' },
  { question_id: 11, question: '金丹期修士的丹是什么形态？', option_a: '气态', option_b: '液态', option_c: '固态圆丹', option_d: '无形', correct_answer: 'C', difficulty: 2, category: 'realm', explanation: '金丹是修士精气神凝结的固态圆丹。' },
  { question_id: 12, question: '元婴期最显著的特征是？', option_a: '金丹碎裂', option_b: '元婴出窍', option_c: '灵气暴涨', option_d: '战力飞升', correct_answer: 'B', difficulty: 2, category: 'realm', explanation: '元婴出窍是元婴期的标志，可神游体外。' },
  { question_id: 13, question: '心魔主要产生于？', option_a: '战斗外伤', option_b: '修炼瓶颈', option_c: '负面情绪和执念', option_d: '服用丹药', correct_answer: 'C', difficulty: 2, category: 'heart_demon', explanation: '心魔源于内心负面情绪和执念。' },
  { question_id: 14, question: '炼丹三要素不包括？', option_a: '火候', option_b: '药材', option_c: '丹炉', option_d: '阵法', correct_answer: 'D', difficulty: 2, category: 'alchemy', explanation: '炼丹需要火候、药材、丹炉三要素。' },
  { question_id: 15, question: '飞剑术属于哪种类型的功法？', option_a: '炼体功法', option_b: '御剑功法', option_c: '炼丹功法', option_d: '阵法功法', correct_answer: 'B', difficulty: 2, category: 'technique', explanation: '飞剑术属于御剑战斗功法。' },

  // 金丹期题目 (difficulty=3)
  { question_id: 16, question: '金丹期经历几重劫难？', option_a: '一重', option_b: '二重', option_c: '三重', option_d: '无劫', correct_answer: 'C', difficulty: 3, category: 'tribulation', explanation: '金丹期需度雷、火、灾三劫。' },
  { question_id: 17, question: '元婴期的元婴是怎么形成的？', option_a: '金丹直接转化', option_b: '金丹碎开后重新凝聚', option_c: '吸收天地精华自然形成', option_d: '师门传承', correct_answer: 'B', difficulty: 3, category: 'realm', explanation: '金丹碎开后，精气神重新凝聚成元婴。' },
  { question_id: 18, question: '化神期的核心突破是？', option_a: '元婴化神', option_b: '神识暴涨', option_c: '灵气液化', option_d: '肉身成圣', correct_answer: 'A', difficulty: 3, category: 'realm', explanation: '化神期核心是元婴化为神识。' },
  { question_id: 19, question: '炼虚期的"虚"指的是？', option_a: '虚无体质', option_b: '虚实转化', option_c: '虚空行走', option_d: '虚假修为', correct_answer: 'B', difficulty: 3, category: 'realm', explanation: '炼虚期掌握虚实转化之道。' },
  { question_id: 20, question: '合体期需要合体的是？', option_a: '灵气与肉身', option_b: '元婴与肉身', option_c: '神识与灵气', option_d: '多个元婴', correct_answer: 'B', difficulty: 3, category: 'realm', explanation: '合体期元婴与肉身彻底合一。' },

  // 高难度题 (difficulty=4/5)
  { question_id: 21, question: '大乘期距离飞升还差什么？', option_a: '修为', option_b: '渡过天劫', option_c: '法宝', option_d: '灵兽', correct_answer: 'B', difficulty: 4, category: 'breakthrough', explanation: '大乘期后需渡天劫方可飞升。' },
  { question_id: 22, question: '仙界飞升后的境界是？', option_a: '人仙', option_b: '地仙', option_c: '天仙', option_d: '真仙', correct_answer: 'A', difficulty: 4, category: 'immortal', explanation: '飞升仙界后初为天仙或人仙。' },
  { question_id: 23, question: '混沌天体属于什么级别的体质？', option_a: '普通体质', option_b: '特殊体质', option_c: '逆天体质', option_d: '后天体质', correct_answer: 'C', difficulty: 5, category: 'constitution', explanation: '混沌天体是传说级逆天体质。' },
  { question_id: 24, question: '三千大道不包括以下哪种？', option_a: '剑道', option_b: '丹道', option_c: '霸道', option_d: '阵法之道', correct_answer: 'C', difficulty: 5, category: 'philosophy', explanation: '三千大道包括剑道、丹道、阵道等。' },
  { question_id: 25, question: '天劫中威力最大的是？', option_a: '雷劫', option_b: '心魔劫', option_c: '天火劫', option_d: '混沌劫', correct_answer: 'D', difficulty: 5, category: 'tribulation', explanation: '混沌劫是天劫中威力最强的。' },
];

function seedQuestions() {
  if (!db) return;
  try {
    const existing = db.prepare('SELECT COUNT(*) as cnt FROM lundao_questions').get();
    if (existing.cnt > 0) {
      Logger.info(`论道题库已有 ${existing.cnt} 题，跳过初始化`);
      return;
    }
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO lundao_questions
      (question_id, question, option_a, option_b, option_c, option_d, correct_answer, difficulty, category, explanation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const q of LUDAO_QUESTIONS) {
      stmt.run(q.question_id, q.question, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer, q.difficulty, q.category, q.explanation);
    }
    Logger.info(`论道题库初始化完成，共 ${LUDAO_QUESTIONS.length} 题`);
  } catch (err) {
    Logger.error('论道题库初始化失败:', err.message);
  }
}

// ============ 辅助函数 ============
function getSeason() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return `season_${year}_${Math.floor(month / 3) + 1}`;
}

function getTodayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getWeeklyStr() {
  const now = new Date();
  const year = now.getFullYear();
  const week = Math.ceil((now.getDate()) / 7);
  return `${year}-W${week}`;
}

function getPlayerRecord(playerId) {
  if (!db) return null;
  const today = getTodayStr();
  const weekly = getWeeklyStr();
  const season = getSeason();
  let player = db.prepare('SELECT * FROM lundao_player WHERE player_id = ?').get(playerId);
  if (!player) {
    try {
      db.prepare(`
        INSERT INTO lundao_player (player_id, season, last_daily_reset, last_weekly_reset)
        VALUES (?, ?, ?, ?)
      `).run(playerId, season, today, weekly);
      player = db.prepare('SELECT * FROM lundao_player WHERE player_id = ?').get(playerId);
    } catch (err) {
      Logger.error('创建论道玩家记录失败:', err.message);
      return null;
    }
  }
  // 重置每日次数
  if (player.last_daily_reset !== today) {
    db.prepare('UPDATE lundao_player SET daily_challenges_used = 0, last_daily_reset = ? WHERE player_id = ?').run(today, playerId);
    player.daily_challenges_used = 0;
    player.last_daily_reset = today;
  }
  // 重置每周次数
  if (player.last_weekly_reset !== weekly) {
    db.prepare('UPDATE lundao_player SET weekly_challenges = 0, last_weekly_reset = ? WHERE player_id = ?').run(weekly, playerId);
    player.weekly_challenges = 0;
    player.last_weekly_reset = weekly;
  }
  // 更新赛季
  if (player.season !== season) {
    db.prepare('UPDATE lundao_player SET season = ?, rank_score = 0 WHERE player_id = ?').run(season, playerId);
    player.season = season;
    player.rank_score = 0;
  }
  return player;
}

function getRandomQuestions(count = 5, maxDifficulty = 3) {
  if (!db) return [];
  const questions = db.prepare(`
    SELECT * FROM lundao_questions
    WHERE difficulty <= ?
    ORDER BY RANDOM()
    LIMIT ?
  `).all(maxDifficulty, count);
  return questions;
}

function updatePlayerScore(playerId, correctCount, totalQuestions, challengeType = 'daily') {
  if (!db) return;
  const baseScore = correctCount * 10;
  const streakBonus = Math.min(correctCount, 5) * 5;
  const difficultyBonus = correctCount * 2;
  const totalScore = baseScore + streakBonus + difficultyBonus;

  const player = getPlayerRecord(playerId);
  const newStreak = correctCount >= 3 ? (player.current_streak || 0) + 1 : 0;
  const highestStreak = Math.max(newStreak, player.highest_streak || 0);
  const newRankScore = (player.rank_score || 0) + totalScore;

  db.prepare(`
    UPDATE lundao_player SET
      total_score = total_score + ?,
      current_streak = ?,
      highest_streak = ?,
      total_challenges = total_challenges + 1,
      correct_answers = correct_answers + ?,
      rank_score = ?,
      daily_challenges_used = daily_challenges_used + 1,
      total_wins = total_wins + ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE player_id = ?
  `).run(totalScore, newStreak, highestStreak, correctCount, newRankScore, correctCount >= 3 ? 1 : 0, playerId);

  // 更新段位
  updatePlayerRank(playerId, newRankScore);

  return totalScore;
}

function updatePlayerRank(playerId, rankScore) {
  let rank = '凡人';
  if (rankScore >= 5000) rank = '大能';
  else if (rankScore >= 2000) rank = '长老';
  else if (rankScore >= 1000) rank = '执事';
  else if (rankScore >= 500) rank = '精英';
  else if (rankScore >= 200) rank = '入门';
  else if (rankScore >= 50) rank = '学徒';

  try {
    db.prepare('UPDATE lundao_player SET rank = ? WHERE player_id = ?').run(rank, playerId);
  } catch (err) {
    // ignore
  }
  return rank;
}

// ============ 路由 ============

// GET /api/lundao - 论道概览
router.get('/', (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId || req.query.player_id || 1;
    const player = getPlayerRecord(userId);
    const today = getTodayStr();
    const todayChallenges = db.prepare('SELECT COUNT(*) as cnt FROM lundao_challenge WHERE player_id = ? AND DATE(created_at) = ? AND status = ?').get(userId, today, 'completed');

    res.json({
      success: true,
      player: player ? {
        totalScore: player.total_score,
        currentStreak: player.current_streak,
        highestStreak: player.highest_streak,
        totalChallenges: player.total_challenges,
        correctRate: player.total_challenges > 0 ? Math.min(100, Math.round(player.correct_answers / player.total_challenges * 100)) : 0,
        rank: player.rank,
        rankScore: player.rank_score,
        season: player.season,
        dailyRemaining: Math.max(0, 5 - (player.daily_challenges_used || 0)),
        weeklyRemaining: Math.max(0, 20 - (player.weekly_challenges || 0)),
      } : null,
      todayChallenges: todayChallenges?.cnt || 0,
      maxDaily: 5,
      maxWeekly: 20,
    });
  } catch (err) {
    Logger.error('GET /lundao 错误:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/lundao/opponents - 获取AI对手列表（前端论道匹配界面用）
router.get('/opponents', (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId || req.query.player_id || 1;
    const player = getPlayerRecord(userId);

    // AI对手池（名号/境界/擅长领域）
    const aiPool = [
      { name: '青云子', title: '金丹真人', realm: '金丹境', realmLevel: 4, specialty: '功法', difficulty: 1, atk: 200, def: 150, hp: 2000, winRate: 0.35 },
      { name: '天璇师姐', title: '元婴长老', realm: '元婴境', realmLevel: 5, specialty: '丹药', difficulty: 1, atk: 300, def: 200, hp: 3000, winRate: 0.40 },
      { name: '灵虚子', title: '筑基修士', realm: '筑基境', realmLevel: 2, specialty: '阵法', difficulty: 1, atk: 120, def: 180, hp: 1200, winRate: 0.55 },
      { name: '清虚子', title: '炼气弟子', realm: '炼气境', realmLevel: 1, specialty: '医术', difficulty: 0, atk: 80, def: 100, hp: 800, winRate: 0.70 },
      { name: '天机老人', title: '化神大能', realm: '化神境', realmLevel: 6, specialty: '炼器', difficulty: 2, atk: 500, def: 400, hp: 5000, winRate: 0.20 },
      { name: '玉清子', title: '金丹真人', realm: '金丹境', realmLevel: 4, specialty: '符箓', difficulty: 1, atk: 250, def: 220, hp: 2500, winRate: 0.38 },
      { name: '玄明师姐', title: '元婴长老', realm: '元婴境', realmLevel: 5, specialty: '御兽', difficulty: 1, atk: 320, def: 280, hp: 3200, winRate: 0.32 },
      { name: '悟真子', title: '筑基修士', realm: '筑基境', realmLevel: 2, specialty: '剑道', difficulty: 1, atk: 180, def: 120, hp: 1500, winRate: 0.52 },
      { name: '飞霞子', title: '炼气弟子', realm: '炼气境', realmLevel: 1, specialty: '轻功', difficulty: 0, atk: 90, def: 110, hp: 900, winRate: 0.68 },
      { name: '紫霄真人', title: '化神大能', realm: '化神境', realmLevel: 6, specialty: '雷法', difficulty: 2, atk: 550, def: 380, hp: 4800, winRate: 0.18 },
      { name: '静虚子', title: '炼虚长老', realm: '炼虚境', realmLevel: 7, specialty: '心法', difficulty: 2, atk: 600, def: 500, hp: 6000, winRate: 0.12 },
      { name: '流云子', title: '筑基修士', realm: '筑基境', realmLevel: 2, specialty: '奇门', difficulty: 1, atk: 150, def: 160, hp: 1400, winRate: 0.58 },
    ];

    // 根据玩家境界动态选择对手（±1个境界范围内）
    const playerRealm = player ? player.rank_score || 0 : 0;
    let targetDifficulty = 1;
    if (playerRealm >= 2000) targetDifficulty = 2;
    else if (playerRealm >= 500) targetDifficulty = 1;
    else targetDifficulty = 0;

    // 按难度分组
    const easy = aiPool.filter(a => a.difficulty === 0);
    const medium = aiPool.filter(a => a.difficulty === 1);
    const hard = aiPool.filter(a => a.difficulty === 2);

    const opponents = [];
    // 优先取目标难度的AI，不够3个则从相邻难度补充
    let primaryPool, secondaryPool;
    if (targetDifficulty === 2) {
      primaryPool = hard; secondaryPool = medium;
    } else if (targetDifficulty === 1) {
      primaryPool = medium; secondaryPool = hard;
    } else {
      primaryPool = easy; secondaryPool = medium;
    }

    const shuffled = [...primaryPool].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(3, shuffled.length));
    // 不足3个则从相邻难度补
    if (selected.length < 3) {
      const extra = [...secondaryPool].sort(() => Math.random() - 0.5);
      for (const ai of extra) {
        if (selected.length >= 3) break;
        if (!selected.includes(ai)) selected.push(ai);
      }
    }
    for (const ai of selected) {
      opponents.push({
        playerId: -aiPool.indexOf(ai) - 1, // 负数AI ID
        name: ai.name,
        title: ai.title,
        realm: ai.realm,
        realmLevel: ai.realmLevel,
        specialty: ai.specialty,
        stats: { attack: ai.atk, defense: ai.def, hp: ai.hp },
        winRate: ai.winRate, // 玩家对此AI的胜率参考
        difficulty: ai.difficulty,
        isAI: true,
      });
    }

    res.json({
      success: true,
      opponents,
      playerRealm,
      matchedDifficulty: targetDifficulty,
    });
  } catch (err) {
    Logger.error('GET /lundao/opponents 错误:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/lundao/questions - 获取今日论道题目
router.get('/questions', (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId || req.query.player_id || 1;
    const difficulty = parseInt(req.query.difficulty || '2');
    const player = getPlayerRecord(userId);
    const remaining = Math.max(0, 5 - (player?.daily_challenges_used || 0));

    if (remaining <= 0) {
      return res.json({
        success: false,
        error: '今日论道次数已用完',
        dailyRemaining: 0,
        resetAt: '明天 00:00'
      });
    }

    const questions = getRandomQuestions(5, difficulty);
    const masked = questions.map(q => ({
      questionId: q.question_id,
      question: q.question,
      optionA: q.option_a,
      optionB: q.option_b,
      optionC: q.option_c,
      optionD: q.option_d,
      difficulty: q.difficulty,
      category: q.category,
    }));

    res.json({
      success: true,
      questions: masked,
      dailyRemaining: remaining - 1,
      expiresAt: `${getTodayStr()} 23:59:59`
    });
  } catch (err) {
    Logger.error('GET /lundao/questions 错误:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/lundao/challenge - 开始一轮论道挑战
router.post('/challenge', (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId || req.body.player_id || 1;
    const difficulty = parseInt(req.body.difficulty || '2');
    const player = getPlayerRecord(userId);

    if (!player) {
      return res.status(400).json({ success: false, error: '玩家记录不存在' });
    }

    const remaining = Math.max(0, 5 - (player.daily_challenges_used || 0));
    if (remaining <= 0) {
      return res.status(400).json({ success: false, error: '今日论道次数已用完' });
    }

    const questions = getRandomQuestions(5, Math.min(difficulty, 3));

    // 记录挑战
    let challengeId;
    try {
      const result = db.prepare(`
        INSERT INTO lundao_challenge (player_id, challenge_type, questions_count, start_time, status, season)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, 'active', ?)
      `).run(userId, 'daily', questions.length, getSeason());
      challengeId = result.lastInsertRowid;
    } catch (err) {
      Logger.error('创建论道挑战失败:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }

    // 返回题目（隐藏答案）
    const masked = questions.map(q => ({
      questionId: q.question_id,
      question: q.question,
      optionA: q.option_a,
      optionB: q.option_b,
      optionC: q.option_c,
      optionD: q.option_d,
      difficulty: q.difficulty,
      category: q.category,
    }));

    res.json({
      success: true,
      challengeId,
      questions: masked,
      dailyRemaining: remaining - 1,
    });
  } catch (err) {
    Logger.error('POST /lundao/challenge 错误:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/lundao/answer - 提交答案
router.post('/answer', (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId || req.body.player_id || 1;
    const { challengeId, answers } = req.body;

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ success: false, error: '答案格式错误' });
    }

    let correctCount = 0;
    let totalScore = 0;
    const results = [];

    for (const ans of answers) {
      const { questionId, selectedAnswer } = ans;
      const question = db.prepare('SELECT * FROM lundao_questions WHERE question_id = ?').get(questionId);
      if (!question) continue;

      const isCorrect = question.correct_answer.toUpperCase() === (selectedAnswer || '').toUpperCase();
      if (isCorrect) correctCount++;

      const scoreEarned = isCorrect ? (question.difficulty * 10 + 5) : 0;
      totalScore += scoreEarned;

      // 记录历史
      try {
        db.prepare(`
          INSERT INTO lundao_history (player_id, question_id, selected_answer, correct_answer, is_correct, score_earned, difficulty)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(userId, questionId, selectedAnswer, question.correct_answer, isCorrect ? 1 : 0, scoreEarned, question.difficulty);
      } catch (err) {
        Logger.warn('记录答案历史失败:', err.message);
      }

      results.push({
        questionId,
        selectedAnswer,
        correctAnswer: question.correct_answer,
        isCorrect,
        scoreEarned,
        explanation: question.explanation,
      });
    }

    // 更新挑战状态
    if (challengeId) {
      db.prepare(`
        UPDATE lundao_challenge SET
          correct_count = ?,
          total_score = ?,
          end_time = CURRENT_TIMESTAMP,
          status = 'completed'
        WHERE id = ? AND player_id = ?
      `).run(correctCount, totalScore, challengeId, userId);
    }

    // 更新玩家积分
    const gainedScore = updatePlayerScore(userId, correctCount, answers.length);

    res.json({
      success: true,
      correctCount,
      totalQuestions: answers.length,
      scoreEarned: totalScore,
      totalGained: gainedScore,
      results,
    });
  } catch (err) {
    Logger.error('POST /lundao/answer 错误:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/lundao/ranking - 论道排行榜
router.get('/ranking', (req, res) => {
  try {
    const season = req.query.season || getSeason();
    const limit = Math.min(parseInt(req.query.limit || '20'), 100);

    const rankings = db.prepare(`
      SELECT lp.player_id, lp.total_score, lp.rank, lp.rank_score, lp.current_streak, lp.highest_streak,
             COALESCE(u.nickname, '修士') as nickname
      FROM lundao_player lp
      LEFT JOIN Users u ON u.id = lp.player_id
      WHERE lp.season = ?
      ORDER BY lp.rank_score DESC, lp.total_score DESC
      LIMIT ?
    `).all(season, limit);

    const globalRankings = rankings.map((r, i) => ({
      rank: i + 1,
      playerId: r.player_id,
      nickname: r.nickname,
      rankScore: r.rank_score,
      rank: r.rank,
      totalScore: r.total_score,
      currentStreak: r.current_streak,
    }));

    res.json({
      success: true,
      season,
      rankings: globalRankings,
    });
  } catch (err) {
    Logger.error('GET /lundao/ranking 错误:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/lundao/history - 论道历史记录
router.get('/history', (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId || req.query.player_id || 1;
    const limit = Math.min(parseInt(req.query.limit || '20'), 100);

    const history = db.prepare(`
      SELECT ch.id, ch.correct_count, ch.total_score, ch.start_time, ch.end_time, ch.status,
             ch.questions_count
      FROM lundao_challenge ch
      WHERE ch.player_id = ?
      ORDER BY ch.created_at DESC
      LIMIT ?
    `).all(userId, limit);

    res.json({
      success: true,
      history: history.map(h => ({
        challengeId: h.id,
        correctCount: h.correct_count,
        totalScore: h.total_score,
        questionsCount: h.questions_count,
        startTime: h.start_time,
        endTime: h.end_time,
        status: h.status,
      })),
    });
  } catch (err) {
    Logger.error('GET /lundao/history 错误:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/lundao/daily-claim - 领取每日奖励
router.post('/daily-claim', (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId || req.body.player_id || 1;
    const player = getPlayerRecord(userId);

    if (!player) {
      return res.status(400).json({ success: false, error: '玩家记录不存在' });
    }

    // 检查是否已领取
    const today = getTodayStr();
    const claimedToday = db.prepare(`
      SELECT * FROM lundao_rewards_log
      WHERE player_id = ? AND reward_type = 'daily_login' AND DATE(claimed_at) = ?
    `).get(userId, today);

    if (claimedToday) {
      return res.status(400).json({ success: false, error: '今日已领取，请明天再来' });
    }

    // 计算奖励：连胜越高奖励越多
    const streakBonus = Math.min(player.current_streak || 0, 10) * 20;
    const baseReward = 50;
    const totalReward = baseReward + streakBonus;

    // 发放灵石
    try {
      const user = db.prepare('SELECT lingshi FROM Users WHERE id = ?').get(userId);
      if (user) {
        db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(totalReward, userId);
      }
    } catch (err) {
      Logger.warn('灵石发放失败:', err.message);
    }

    // 记录领取
    db.prepare(`
      INSERT INTO lundao_rewards_log (player_id, reward_type, reward_amount)
      VALUES (?, 'daily_login', ?)
    `).run(userId, totalReward);

    res.json({
      success: true,
      reward: totalReward,
      message: `获得${totalReward}灵石（基础50 + 连胜加成${streakBonus}）`,
    });
  } catch (err) {
    Logger.error('POST /lundao/daily-claim 错误:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/lundao/season - 获取赛季信息
router.get('/season', (req, res) => {
  try {
    const season = getSeason();
    const totalPlayers = db.prepare('SELECT COUNT(*) as cnt FROM lundao_player WHERE season = ?').get(season);

    res.json({
      success: true,
      currentSeason: season,
      totalPlayers: totalPlayers?.cnt || 0,
      seasonStart: `${season.replace('season_', '')}-01`,
      rewards: {
        '凡人': { minScore: 0, reward: 0 },
        '学徒': { minScore: 50, reward: 100 },
        '入门': { minScore: 200, reward: 300 },
        '精英': { minScore: 500, reward: 800 },
        '执事': { minScore: 1000, reward: 1500 },
        '长老': { minScore: 2000, reward: 3000 },
        '大能': { minScore: 5000, reward: 5000 },
      }
    });
  } catch (err) {
    Logger.error('GET /lundao/season 错误:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============ 初始化 ============
initLundaoTables();
seedQuestions();

// GET /status - 别名：获取玩家论道状态（与 GET / 相同）
router.get('/status', (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId || req.query.player_id || 1;
    const player = getPlayerRecord(userId);
    const today = getTodayStr();
    const todayChallenges = db.prepare('SELECT COUNT(*) as cnt FROM lundao_challenge WHERE player_id = ? AND DATE(created_at) = ? AND status = ?').get(userId, today, 'completed');

    res.json({
      success: true,
      player: player ? {
        totalScore: player.total_score,
        currentStreak: player.current_streak,
        highestStreak: player.highest_streak,
        totalChallenges: player.total_challenges,
        correctRate: player.total_challenges > 0 ? Math.min(100, Math.round(player.correct_answers / player.total_challenges * 100)) : 0,
        rank: player.rank,
        rankScore: player.rank_score,
        season: player.season,
        dailyRemaining: Math.max(0, 5 - (player.daily_challenges_used || 0)),
        weeklyRemaining: Math.max(0, 20 - (player.weekly_challenges || 0)),
      } : null,
      todayChallenges: todayChallenges?.cnt || 0,
      maxDaily: 5,
      maxWeekly: 20,
    });
  } catch (err) {
    Logger.error('GET /lundao/status 错误:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /fight - 别名：发起论道挑战（与 POST /challenge 相同）
router.post('/fight', (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId || req.body.player_id || 1;
    const difficulty = parseInt(req.body.difficulty || '2');
    const player = getPlayerRecord(userId);

    if (!player) {
      return res.status(400).json({ success: false, error: '玩家记录不存在' });
    }

    const remaining = Math.max(0, 5 - (player.daily_challenges_used || 0));
    if (remaining <= 0) {
      return res.status(400).json({ success: false, error: '今日论道次数已用完' });
    }

    const questions = getRandomQuestions(5, Math.min(difficulty, 3));

    let challengeId;
    try {
      const result = db.prepare(`
        INSERT INTO lundao_challenge (player_id, challenge_type, questions_count, start_time, status, season)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, 'active', ?)
      `).run(userId, 'daily', questions.length, getSeason());
      challengeId = result.lastInsertRowid;
    } catch (err) {
      Logger.error('创建论道挑战失败:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }

    const masked = questions.map(q => ({
      questionId: q.question_id,
      question: q.question,
      optionA: q.option_a,
      optionB: q.option_b,
      optionC: q.option_c,
      optionD: q.option_d,
      difficulty: q.difficulty,
      category: q.category,
    }));

    res.json({
      success: true,
      challengeId,
      questions: masked,
      dailyRemaining: remaining - 1,
    });
  } catch (err) {
    Logger.error('POST /lundao/fight 错误:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
