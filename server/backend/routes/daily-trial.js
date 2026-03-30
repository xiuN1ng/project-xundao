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
    db.pragma('journal_mode=WAL');
    db.pragma('busy_timeout=5000');
  }
  return db;
}

// 初始化每日试炼表
function initDailyTrialTables() {
  const database = getDb();
  try {
    database.exec(`
      CREATE TABLE IF NOT EXISTS daily_trials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        trial_key TEXT NOT NULL,
        trial_name TEXT NOT NULL,
        target INTEGER NOT NULL DEFAULT 1,
        progress INTEGER NOT NULL DEFAULT 0,
        completed INTEGER NOT NULL DEFAULT 0,
        claimed INTEGER NOT NULL DEFAULT 0,
        last_reset TEXT NOT NULL,
        updated_at INTEGER DEFAULT (strftime('%s','now')),
        UNIQUE(player_id, trial_key)
      )
    `);

    // 每日试炼配置（5个试炼任务）
    const TRIALS = [
      { key: 'cultivate', name: '修炼试炼', desc: '完成修炼次数', target: 10, reward_type: 'spirit_stones', reward_count: 200 },
      { key: 'dungeon', name: '副本试炼', desc: '通关副本次数', target: 3, reward_type: 'spirit_stones', reward_count: 300 },
      { key: 'arena', name: '竞技试炼', desc: '完成竞技场挑战', target: 5, reward_type: 'spirit_stones', reward_count: 250 },
      { key: 'tower', name: '闯塔试炼', desc: '通关塔层数', target: 5, reward_type: 'spirit_stones', reward_count: 350 },
      { key: 'chapter', name: '章节试炼', desc: '通关章节数', target: 2, reward_type: 'spirit_stones', reward_count: 400 },
    ];

    const existing = database.prepare('SELECT COUNT(*) as c FROM daily_trials WHERE player_id = ?').get(999999);
    // 确保玩家首次加载时能初始化
  } catch (e) {
    console.log('[daily-trial] init error:', e.message);
  }
}

try {
  initDailyTrialTables();
} catch (e) {
  console.log('[daily-trial] init:', e.message);
}

// 事件总线
let eventBus = null;
try {
  eventBus = require('../../game/eventBus');
} catch (e) {
  // eventBus not available
}

// 监听各系统事件更新试炼进度
if (eventBus) {
  eventBus.on('cultivation:start', ({ userId }) => {
    updateTrialProgress(userId, 'cultivate', 1);
  });
  eventBus.on('cultivation:breakthrough', ({ userId }) => {
    updateTrialProgress(userId, 'cultivate', 1);
  });
  eventBus.on('dungeon:complete', ({ userId }) => {
    updateTrialProgress(userId, 'dungeon', 1);
  });
  eventBus.on('arena:challenge', ({ userId }) => {
    updateTrialProgress(userId, 'arena', 1);
  });
  eventBus.on('tower:complete', ({ userId, floorsCleared }) => {
    updateTrialProgress(userId, 'tower', floorsCleared || 1);
  });
  eventBus.on('chapter:complete', ({ userId }) => {
    updateTrialProgress(userId, 'chapter', 1);
  });
}

// 试炼配置
const TRIALS_CONFIG = [
  { key: 'cultivate', name: '修炼试炼', desc: '完成修炼', target: 10, target_label: '次', reward_type: 'spirit_stones', reward_count: 200, reward_label: '灵石×200' },
  { key: 'dungeon', name: '副本试炼', desc: '通关副本', target: 3, target_label: '次', reward_type: 'spirit_stones', reward_count: 300, reward_label: '灵石×300' },
  { key: 'arena', name: '竞技试炼', desc: '挑战竞技场', target: 5, target_label: '次', reward_type: 'spirit_stones', reward_count: 250, reward_label: '灵石×250' },
  { key: 'tower', name: '闯塔试炼', desc: '通关塔层', target: 5, target_label: '层', reward_type: 'spirit_stones', reward_count: 350, reward_label: '灵石×350' },
  { key: 'chapter', name: '章节试炼', desc: '通关章节', target: 2, target_label: '章', reward_type: 'spirit_stones', reward_count: 400, reward_label: '灵石×400' },
];

// 获取今日日期字符串
function getTodayStr() {
  const now = new Date();
  const offset = 8 * 60 * 60 * 1000; // UTC+8
  const shanghai = new Date(now.getTime() + offset);
  return `${shanghai.getFullYear()}-${String(shanghai.getMonth()+1).padStart(2,'0')}-${String(shanghai.getDate()).padStart(2,'0')}`;
}

function getPlayerId(req) {
  return parseInt(req.headers['x-player-id'] || req.query.player_id || req.body?.player_id || 1);
}

// 初始化玩家今日试炼（如需）
function initPlayerTrials(playerId) {
  const database = getDb();
  const today = getTodayStr();

  for (const trial of TRIALS_CONFIG) {
    const existing = database.prepare('SELECT * FROM daily_trials WHERE player_id=? AND trial_key=?').get(playerId, trial.key);
    if (!existing) {
      database.prepare(`
        INSERT OR IGNORE INTO daily_trials (player_id, trial_key, trial_name, target, progress, completed, claimed, last_reset)
        VALUES (?, ?, ?, ?, 0, 0, 0, ?)
      `).run(playerId, trial.key, trial.name, trial.target, today);
    } else if (existing.last_reset !== today) {
      // 新的一天，重置进度
      database.prepare(`
        UPDATE daily_trials SET progress=0, completed=0, claimed=0, last_reset=?
        WHERE player_id=? AND trial_key=?
      `).run(today, playerId, trial.key);
    }
  }
}

// 更新试炼进度
function updateTrialProgress(playerId, trialKey, delta) {
  if (!TRIALS_CONFIG.find(t => t.key === trialKey)) return;
  const database = getDb();
  const today = getTodayStr();

  try {
    const existing = database.prepare('SELECT * FROM daily_trials WHERE player_id=? AND trial_key=?').get(playerId, trialKey);
    if (!existing) {
      initPlayerTrials(playerId);
    }

    // 检查是否需要重置
    if (existing && existing.last_reset !== today) {
      database.prepare('UPDATE daily_trials SET progress=0, completed=0, claimed=0, last_reset=? WHERE player_id=? AND trial_key=?')
        .run(today, playerId, trialKey);
    }

    const trial = TRIALS_CONFIG.find(t => t.key === trialKey);
    const current = existing && existing.last_reset === today ? existing.progress : 0;
    const newProgress = Math.min(current + delta, trial.target);

    database.prepare(`
      INSERT INTO daily_trials (player_id, trial_key, trial_name, target, progress, completed, claimed, last_reset, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, strftime('%s','now'))
      ON CONFLICT(player_id, trial_key) DO UPDATE SET
        progress = MIN(progress + ?, ?),
        completed = CASE WHEN progress + ? >= target THEN 1 ELSE 0 END,
        updated_at = strftime('%s','now')
    `).run(playerId, trialKey, trial.name, trial.target, newProgress, today, delta, trial.target, delta);
  } catch (e) {
    console.log('[daily-trial] update error:', e.message);
  }
}

// GET /api/daily-trial — 获取当日试炼状态
router.get('/', (req, res) => {
  const playerId = getPlayerId(req);
  const database = getDb();

  try {
    initPlayerTrials(playerId);
    const today = getTodayStr();
    const rows = database.prepare('SELECT * FROM daily_trials WHERE player_id=? AND last_reset=?').all(playerId, today);

    const trials = TRIALS_CONFIG.map(trial => {
      const row = rows.find(r => r.trial_key === trial.key);
      return {
        key: trial.key,
        name: trial.name,
        desc: trial.desc,
        target: trial.target,
        target_label: trial.target_label,
        progress: row ? row.progress : 0,
        completed: row ? row.completed === 1 : false,
        claimed: row ? row.claimed === 1 : false,
        reward_label: trial.reward_label,
        reward_type: trial.reward_type,
        reward_count: trial.reward_count,
        canClaim: row ? (row.completed === 1 && row.claimed === 0) : false
      };
    });

    const allCompleted = trials.filter(t => t.completed).length;
    const allClaimed = trials.filter(t => t.claimed).length;
    const bonusClaimed = allCompleted === TRIALS_CONFIG.length ? rows.find(r => r.trial_key === 'bonus')?.claimed === 1 : false;

    res.json({
      success: true,
      data: {
        player_id: playerId,
        date: today,
        trials,
        summary: {
          total: TRIALS_CONFIG.length,
          completed: allCompleted,
          claimed: allClaimed,
          allCompleted: allCompleted === TRIALS_CONFIG.length,
          bonusReward: allCompleted === TRIALS_CONFIG.length ? { reward_type: 'spirit_stones', reward_count: 1000, reward_label: '灵石×1000', claimed: bonusClaimed, canClaim: allCompleted === TRIALS_CONFIG.length && !bonusClaimed } : null
        }
      }
    });
  } catch (e) {
    console.error('[daily-trial] GET / error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/daily-trial/info — 别名
router.get('/info', (req, res) => {
  return router(req, res, () => {
    req.url = '/';
    router.handle(req, res);
  });
});

// POST /api/daily-trial/claim — 领取试炼奖励
router.post('/claim', (req, res) => {
  const playerId = getPlayerId(req);
  const { trial_key } = req.body;
  const database = getDb();

  try {
    const today = getTodayStr();
    const trial = TRIALS_CONFIG.find(t => t.key === trial_key);
    if (!trial) return res.json({ success: false, message: '无效的试炼' });

    const row = database.prepare('SELECT * FROM daily_trials WHERE player_id=? AND trial_key=? AND last_reset=?')
      .get(playerId, trial_key, today);

    if (!row) return res.json({ success: false, message: '试炼未初始化' });
    if (row.completed !== 1) return res.json({ success: false, message: '试炼未完成，无法领取' });
    if (row.claimed === 1) return res.json({ success: false, message: '奖励已领取' });

    // 发放奖励
    if (trial.reward_type === 'spirit_stones') {
      try {
        database.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(trial.reward_count, playerId);
      } catch (e) {
        console.log('[daily-trial] lingshi reward error:', e.message);
      }
    }

    // 标记已领取
    database.prepare('UPDATE daily_trials SET claimed=1, updated_at=strftime("%s","now") WHERE player_id=? AND trial_key=?')
      .run(playerId, trial_key);

    // 触发成就
    try {
      const achievementTrigger = require('../../game/achievement_trigger_service');
      if (achievementTrigger?.triggerAchievement) {
        achievementTrigger.triggerAchievement(playerId, 'trial_complete', 1);
      }
    } catch (e) {
      // achievement trigger not available
    }

    res.json({
      success: true,
      message: `领取成功: ${trial.reward_label}`,
      reward: { type: trial.reward_type, count: trial.reward_count }
    });
  } catch (e) {
    console.error('[daily-trial] POST /claim error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/daily-trial/event — 外部事件更新进度（供其他系统调用）
router.post('/event', (req, res) => {
  const playerId = getPlayerId(req);
  const { event_type, value } = req.body;
  const delta = parseInt(value) || 1;

  if (!event_type) return res.json({ success: false, message: '缺少 event_type 参数' });

  updateTrialProgress(playerId, event_type, delta);
  res.json({ success: true, message: `试炼进度 +${delta}` });
});

// 手动更新进度端点
router.post('/progress', (req, res) => {
  const playerId = getPlayerId(req);
  const { trial_key, delta } = req.body;
  const d = parseInt(delta) || 1;

  if (!trial_key) return res.json({ success: false, message: '缺少 trial_key' });
  if (!TRIALS_CONFIG.find(t => t.key === trial_key)) return res.json({ success: false, message: '无效的试炼类型' });

  updateTrialProgress(playerId, trial_key, d);
  res.json({ success: true, message: `${trial_key} +${d}` });
});

module.exports = router;
module.exports.updateTrialProgress = updateTrialProgress;
