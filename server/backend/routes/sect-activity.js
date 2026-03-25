const express = require('express');
const router = express.Router();
const path = require('path');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

function getDb() { return new Database(DB_PATH); }

// 初始化活跃积分表
function initSectActivityTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sect_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL UNIQUE,
      daily_score INTEGER NOT NULL DEFAULT 0,
      weekly_score INTEGER NOT NULL DEFAULT 0,
      total_score INTEGER NOT NULL DEFAULT 0,
      last_daily_reset TEXT,
      last_weekly_reset TEXT,
      updated_at INTEGER DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS sect_activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      activity_key TEXT NOT NULL,
      score INTEGER NOT NULL,
      description TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );
  `);

  // 活跃奖励配置（每日）
  db.exec(`
    CREATE TABLE IF NOT EXISTS sect_activity_rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,  -- 'daily' | 'weekly'
      score_threshold INTEGER NOT NULL,
      reward_type TEXT NOT NULL,
      reward_id TEXT,
      reward_count INTEGER NOT NULL DEFAULT 1,
      claimed INTEGER NOT NULL DEFAULT 0,
      UNIQUE(type, score_threshold)
    );
  `);

  const rewardCount = db.prepare('SELECT COUNT(*) as c FROM sect_activity_rewards').get();
  if (rewardCount.c === 0) {
    const rewards = [
      // 每日奖励
      { type: 'daily', score: 100, reward_type: 'contribution', reward_count: 20 },
      { type: 'daily', score: 200, reward_type: 'spirit_stones', reward_count: 100 },
      { type: 'daily', score: 300, reward_type: 'contribution', reward_count: 50 },
      { type: 'daily', score: 500, reward_type: 'spirit_stones', reward_count: 300 },
      { type: 'daily', score: 1000, reward_type: 'contribution', reward_count: 200 },
      // 每周奖励
      { type: 'weekly', score: 1000, reward_type: 'contribution', reward_count: 200 },
      { type: 'weekly', score: 3000, reward_type: 'spirit_stones', reward_count: 1000 },
      { type: 'weekly', score: 5000, reward_type: 'material', reward_id: 'dragon_scale', reward_count: 1 },
      { type: 'weekly', score: 10000, reward_type: 'material', reward_id: 'heart_essence', reward_count: 1 },
    ];
    const insert = db.prepare('INSERT OR IGNORE INTO sect_activity_rewards (type, score_threshold, reward_type, reward_id, reward_count) VALUES (?,?,?,?,?)');
    for (const r of rewards) {
      insert.run(r.type, r.score, r.reward_type, r.reward_id || null, r.reward_count);
    }
  }
}

try {
  const db = getDb();
  initSectActivityTables(db);
  db.close();
} catch(e) {
  console.log('[sect-activity] init:', e.message);
}

// 活跃积分任务配置
const ACTIVITY_TASKS = [
  { key: 'sect_dungeon', name: '挑战宗门副本', score: 10, daily: true },
  { key: 'sect_donate', name: '捐献资源', score: 20, daily: true },
  { key: 'sect_chat', name: '宗门聊天', score: 5, daily: true },
  { key: 'sect_bless', name: '宗门祈福', score: 15, daily: true },
  { key: 'sect_war_attend', name: '参加宗门战', score: 50, daily: false },
  { key: 'sect_skill_upgrade', name: '升级宗门技能', score: 30, daily: true },
  { key: 'sect_help_member', name: '帮助宗门成员', score: 15, daily: true },
  { key: 'arena_challenge', name: '竞技场挑战', score: 10, daily: true },
  { key: 'chapter_complete', name: '通关章节', score: 20, daily: true },
  { key: 'dungeon_complete', name: '完成副本', score: 15, daily: true },
];

function getPlayerId(req) {
  return parseInt(req.headers['x-player-id'] || req.query.player_id || req.body?.player_id || 1);
}

// GET /api/sect-activity/info?player_id=X
router.get('/info', (req, res) => {
  const playerId = getPlayerId(req);
  const db = getDb();
  try {
    const row = db.prepare('SELECT * FROM sect_activity WHERE player_id=?').get(playerId);
    const today = new Date().toISOString().slice(0, 10);
    const weekKey = getWeekKey();
    let daily = row || { daily_score: 0, weekly_score: 0, total_score: 0 };

    // 重置每日
    if (!row || row.last_daily_reset !== today) {
      db.prepare('INSERT INTO sect_activity (player_id, daily_score, last_daily_reset, updated_at) VALUES (?,0,?,strftime("%s","now")) ON CONFLICT(player_id) DO UPDATE SET daily_score=0, last_daily_reset=?').run(playerId, today, today);
      daily.daily_score = 0;
    }
    // 重置每周
    if (!row || row.last_weekly_reset !== weekKey) {
      db.prepare('INSERT INTO sect_activity (player_id, weekly_score, last_weekly_reset, updated_at) VALUES (?,0,?,strftime("%s","now")) ON CONFLICT(player_id) DO UPDATE SET weekly_score=0, last_weekly_reset=?').run(playerId, weekKey, weekKey);
      daily.weekly_score = 0;
    }

    const activity = db.prepare('SELECT * FROM sect_activity WHERE player_id=?').get(playerId);
    const rewards = db.prepare('SELECT * FROM sect_activity_rewards').all();
    const dailyRewards = rewards.filter(r => r.type === 'daily').map(r => ({
      threshold: r.score_threshold, reward_type: r.reward_type, reward_id: r.reward_id, reward_count: r.reward_count
    }));
    const weeklyRewards = rewards.filter(r => r.type === 'weekly').map(r => ({
      threshold: r.score_threshold, reward_type: r.reward_type, reward_id: r.reward_id, reward_count: r.reward_count
    }));

    res.json({ success: true, data: {
      player_id: playerId,
      daily_score: activity?.daily_score || 0,
      weekly_score: activity?.weekly_score || 0,
      total_score: activity?.total_score || 0,
      daily_rewards: dailyRewards,
      weekly_rewards: weeklyRewards,
      tasks: ACTIVITY_TASKS
    }});
  } catch(e) {
    res.json({ success: false, message: e.message });
  } finally {
    db.close();
  }
});

// POST /api/sect-activity/score - 增加活跃积分
router.post('/score', (req, res) => {
  const playerId = getPlayerId(req);
  const { activity_key, description } = req.body;
  const db = getDb();
  try {
    const task = ACTIVITY_TASKS.find(t => t.key === activity_key);
    if (!task) return res.json({ success: false, message: '无效的活跃任务' });

    const score = task.score;
    const today = new Date().toISOString().slice(0, 10);
    const weekKey = getWeekKey();

    // 更新活跃积分
    const existing = db.prepare('SELECT * FROM sect_activity WHERE player_id=?').get(playerId);
    if (!existing) {
      db.prepare('INSERT INTO sect_activity (player_id, daily_score, weekly_score, total_score, last_daily_reset, last_weekly_reset) VALUES (?,?,?,?,?,?)').run(playerId, score, score, score, today, weekKey);
    } else {
      db.prepare('UPDATE sect_activity SET daily_score=daily_score+?, weekly_score=weekly_score+?, total_score=total_score+?, updated_at=strftime("%s","now") WHERE player_id=?').run(score, score, score, playerId);
    }

    // 记录日志
    db.prepare('INSERT INTO sect_activity_log (player_id, activity_key, score, description) VALUES (?,?,?,?)').run(playerId, activity_key, score, description || task.name);

    const updated = db.prepare('SELECT daily_score, weekly_score, total_score FROM sect_activity WHERE player_id=?').get(playerId);
    res.json({ success: true, score_added: score, total_score: updated?.total_score || 0, daily_score: updated?.daily_score || 0, weekly_score: updated?.weekly_score || 0 });
  } catch(e) {
    res.json({ success: false, message: e.message });
  } finally {
    db.close();
  }
});

// POST /api/sect-activity/claim - 领取活跃奖励
router.post('/claim', (req, res) => {
  const playerId = getPlayerId(req);
  const { reward_type, score_threshold } = req.body;  // reward_type='daily'|'weekly', score_threshold=number
  const db = getDb();
  try {
    const activity = db.prepare('SELECT daily_score, weekly_score FROM sect_activity WHERE player_id=?').get(playerId);
    if (!activity) return res.json({ success: false, message: '无活跃数据' });

    const currentScore = reward_type === 'weekly' ? activity.weekly_score : activity.daily_score;
    if (currentScore < score_threshold) {
      return res.json({ success: false, message: `活跃积分不足，需要${score_threshold}，当前${currentScore}` });
    }

    const reward = db.prepare('SELECT * FROM sect_activity_rewards WHERE type=? AND score_threshold=? AND claimed=0').get(reward_type, score_threshold);
    if (!reward) return res.json({ success: false, message: '奖励不存在或已领取' });

    // 发放奖励
    if (reward.reward_type === 'contribution') {
      db.prepare('UPDATE player SET sect_contribution=sect_contribution+? WHERE id=?').run(reward.reward_count, playerId);
    } else if (reward.reward_type === 'spirit_stones') {
      // 灵石奖励写入 Users.lingshi（权威数据源）
      db.prepare('UPDATE Users SET lingshi=lingshi+? WHERE id=?').run(reward.reward_count, playerId);
    } else if (reward.reward_type === 'material') {
      const existing = db.prepare('SELECT * FROM player_items WHERE player_id=? AND item_id=? AND equipped=0').get(playerId, reward.reward_id);
      if (existing) {
        db.prepare('UPDATE player_items SET quantity=quantity+? WHERE id=?').run(reward.reward_count, existing.id);
      } else {
        db.prepare('INSERT INTO player_items (player_id, item_id, quantity, equipped) VALUES (?,?,?,0)').run(playerId, reward.reward_id, reward.reward_count);
      }
    }

    db.prepare('UPDATE sect_activity_rewards SET claimed=1 WHERE id=?').run(reward.id);
    res.json({ success: true, message: `领取成功: ${reward.reward_type}×${reward.reward_count}`, remaining_score: currentScore });
  } catch(e) {
    res.json({ success: false, message: e.message });
  } finally {
    db.close();
  }
});

function getWeekKey() {
  const now = new Date();
  return `${now.getFullYear()}-W${getWeekNumber(now)}`;
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

module.exports = router;
