/**
 * 运营活动系统 - 完整实现
 * 支持: 活动列表/详情/参与/奖励领取/状态自动更新
 */
const express = require('express');
const path = require('path');
const router = express.Router();

const Logger = {
  info: (...args) => console.log('[activity]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[activity:error]', new Date().toISOString(), ...args),
  warn: (...args) => console.warn('[activity:warn]', new Date().toISOString(), ...args)
};

// DB初始化（复用共享db实例）
let db;
function getDb(req) {
  if (db) return db;
  if (req && req.app && req.app.locals && req.app.locals.db) {
    db = req.app.locals.db;
    return db;
  }
  // 降级独立连接
  try {
    const Database = require('better-sqlite3');
    const dbPath = path.join(__dirname, '..', 'data', 'game.db');
    db = new Database(dbPath);
    return db;
  } catch (err) {
    Logger.error('DB连接失败:', err.message);
    return null;
  }
}

// ============ 5个核心活动配置 ============
const CORE_ACTIVITIES = [
  {
    id: 'daily_sign',
    name: '每日签到',
    description: '每日签到领取灵石和经验奖励，连续签到额外奖励翻倍',
    type: 'daily',
    icon: '📅',
    color: '#4ecdc4',
    start_time: '2026-01-01 00:00:00',
    end_time: '2026-12-31 23:59:59',
    rewards: JSON.stringify([
      { type: 'spirit_stones', amount: 100, description: '签到灵石' },
      { type: 'exp', amount: 500, description: '经验' }
    ]),
    condition: null,
    status: 'active'
  },
  {
    id: 'level_up',
    name: '等级冲刺',
    description: '冲级奖励，达到指定等级领取灵石礼包',
    type: 'level_goal',
    icon: '⬆️',
    color: '#a855f7',
    start_time: '2026-01-01 00:00:00',
    end_time: '2026-12-31 23:59:59',
    rewards: JSON.stringify([
      { level: 10, spirit_stones: 200, description: '达到10级' },
      { level: 20, spirit_stones: 500, description: '达到20级' },
      { level: 30, spirit_stones: 1000, description: '达到30级' },
      { level: 50, spirit_stones: 3000, description: '达到50级' },
      { level: 100, spirit_stones: 10000, description: '达到100级' }
    ]),
    condition: null,
    status: 'active'
  },
  {
    id: 'first_charge',
    name: '首充礼包',
    description: '首次充值获得双倍灵石返还',
    type: 'recharge',
    icon: '💎',
    color: '#ffd700',
    start_time: '2026-01-01 00:00:00',
    end_time: '2026-12-31 23:59:59',
    rewards: JSON.stringify([
      { amount: 60, bonus: 120, description: '充值60灵石得120' },
      { amount: 300, bonus: 660, description: '充值300灵石得660' },
      { amount: 980, bonus: 1960, description: '充值980灵石得1960' }
    ]),
    condition: null,
    status: 'active'
  },
  {
    id: 'combat_challenge',
    name: '战斗挑战',
    description: '每日完成指定次数战斗，领取丰厚奖励',
    type: 'daily_goal',
    icon: '⚔️',
    color: '#ef4444',
    start_time: '2026-01-01 00:00:00',
    end_time: '2026-12-31 23:59:59',
    rewards: JSON.stringify([
      { target: 10, spirit_stones: 100, exp: 300, description: '完成10次战斗' },
      { target: 30, spirit_stones: 300, exp: 800, description: '完成30次战斗' },
      { target: 50, spirit_stones: 800, exp: 2000, description: '完成50次战斗' }
    ]),
    condition: null,
    status: 'active'
  },
  {
    id: 'festival_bonus',
    name: '节日狂欢',
    description: '全服修炼效率提升，掉落加成',
    type: 'server_buff',
    icon: '🎊',
    color: '#ff6b6b',
    start_time: '2026-01-01 00:00:00',
    end_time: '2026-12-31 23:59:59',
    rewards: JSON.stringify([
      { buff: 'exp_rate', value: 1.5, description: '经验获取+50%' },
      { buff: 'spirit_rate', value: 1.3, description: '灵石获取+30%' },
      { buff: 'drop_rate', value: 1.2, description: '掉落概率+20%' }
    ]),
    condition: null,
    status: 'active'
  }
];

// ============ 数据库初始化 ============
function initActivityTables(database) {
  const d = database || db;
  if (!d) return;
  try {
    d.exec(`
      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        icon TEXT,
        color TEXT,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        rewards TEXT,
        condition TEXT,
        status TEXT DEFAULT 'active'
      )
    `);

    d.exec(`
      CREATE TABLE IF NOT EXISTS activity_participation (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        activity_id TEXT NOT NULL,
        progress INTEGER DEFAULT 0,
        claimed INTEGER DEFAULT 0,
        claimed_rewards TEXT,
        last_update TEXT,
        UNIQUE(player_id, activity_id)
      )
    `);

    d.exec(`
      CREATE TABLE IF NOT EXISTS activity_sign (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        sign_date TEXT NOT NULL,
        streak INTEGER DEFAULT 1,
        UNIQUE(player_id, sign_date)
      )
    `);

    // 初始化5个核心活动（不存在才插入）
    const insertActivity = d.prepare(`
      INSERT OR IGNORE INTO activities
      (id, name, description, type, icon, color, start_time, end_time, rewards, condition, status)
      VALUES (@id, @name, @description, @type, @icon, @color, @start_time, @end_time, @rewards, @condition, @status)
    `);
    for (const act of CORE_ACTIVITIES) {
      insertActivity.run(act);
    }

    Logger.info('活动数据表初始化完成');
  } catch (err) {
    Logger.error('活动数据表初始化失败:', err.message);
  }
}

// ============ 辅助函数 ============
function getActivityStatus(activity) {
  const now = new Date();
  const start = new Date(activity.start_time);
  const end = new Date(activity.end_time);
  if (now < start) return 'upcoming';
  if (now > end) return 'ended';
  return 'active';
}

// 获取当前用户ID（兼容多种方式）
function getUserId(req) {
  return req.userId || req.user?.id ||
    req.body?.player_id || req.body?.userId ||
    req.query?.player_id || req.query?.userId || 1;
}

// ============ 路由 ============

// GET /api/activity - 活动概览（根路径）
router.get('/', (req, res) => {
  const database = getDb(req);
  if (!database) return res.status(500).json({ success: false, error: '数据库未连接' });

  try {
    initActivityTables(database);

    const userId = getUserId(req);
    const rows = database.prepare('SELECT * FROM activities').all();

    const now = new Date();
    const activities = rows.map(a => {
      const status = getActivityStatus(a);
      // 获取玩家参与进度
      let participation = null;
      try {
        participation = database.prepare(
          'SELECT * FROM activity_participation WHERE player_id = ? AND activity_id = ?'
        ).get(userId, a.id);
      } catch (e) { /* ignore */ }

      let rewards = [];
      try { rewards = JSON.parse(a.rewards || '[]'); } catch (e) { rewards = []; }

      return {
        id: a.id,
        name: a.name,
        description: a.description,
        type: a.type,
        icon: a.icon,
        color: a.color,
        start_time: a.start_time,
        end_time: a.end_time,
        status,
        rewards,
        progress: participation?.progress || 0,
        claimed: !!participation?.claimed,
      };
    });

    res.json({ success: true, data: activities, total: activities.length });
  } catch (err) {
    Logger.error('GET /activity 错误:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/activity/list - 活动列表（带过滤）
router.get('/list', (req, res) => {
  const database = getDb(req);
  if (!database) return res.status(500).json({ success: false, error: '数据库未连接' });

  try {
    const { type, status } = req.query;
    let rows = database.prepare('SELECT * FROM activities').all();

    // 按类型筛选
    if (type) {
      rows = rows.filter(a => a.type === type);
    }

    // 按状态筛选（需要动态计算）
    if (status) {
      rows = rows.filter(a => getActivityStatus(a) === status);
    }

    const result = rows.map(a => {
      let rewards = [];
      try { rewards = JSON.parse(a.rewards || '[]'); } catch (e) {}
      return {
        id: a.id,
        name: a.name,
        description: a.description,
        type: a.type,
        icon: a.icon,
        color: a.color,
        start_time: a.start_time,
        end_time: a.end_time,
        status: getActivityStatus(a),
        rewards_count: rewards.length,
      };
    });

    res.json({ success: true, data: result, total: result.length });
  } catch (err) {
    Logger.error('GET /activity/list 错误:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/activity/:id - 活动详情
router.get('/:id', (req, res) => {
  const database = getDb(req);
  if (!database) return res.status(500).json({ success: false, error: '数据库未连接' });

  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const activity = database.prepare('SELECT * FROM activities WHERE id = ?').get(id);
    if (!activity) {
      return res.status(404).json({ success: false, error: '活动不存在' });
    }

    let participation = null;
    try {
      participation = database.prepare(
        'SELECT * FROM activity_participation WHERE player_id = ? AND activity_id = ?'
      ).get(userId, id);
    } catch (e) { /* ignore */ }

    let rewards = [];
    try { rewards = JSON.parse(activity.rewards || '[]'); } catch (e) {}

    res.json({
      success: true,
      data: {
        id: activity.id,
        name: activity.name,
        description: activity.description,
        type: activity.type,
        icon: activity.icon,
        color: activity.color,
        start_time: activity.start_time,
        end_time: activity.end_time,
        status: getActivityStatus(activity),
        rewards,
        progress: participation?.progress || 0,
        claimed: !!participation?.claimed,
      }
    });
  } catch (err) {
    Logger.error('GET /activity/:id 错误:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/activity/sign - 每日签到
router.post('/sign', (req, res) => {
  const database = getDb(req);
  if (!database) return res.status(500).json({ success: false, error: '数据库未连接' });

  try {
    const userId = getUserId(req);
    const today = new Date();
    const signDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // 检查今天是否已签到
    const existing = database.prepare(
      'SELECT * FROM activity_sign WHERE player_id = ? AND sign_date = ?'
    ).get(userId, signDate);

    if (existing) {
      return res.json({
        success: false,
        error: '今天已经签到过了',
        signed: true,
        streak: existing.streak
      });
    }

    // 获取昨日签到连续天数
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    const lastSign = database.prepare(
      'SELECT streak FROM activity_sign WHERE player_id = ? ORDER BY id DESC LIMIT 1'
    ).get(userId);

    let streak = 1;
    if (lastSign) {
      streak = Math.min(lastSign.streak + 1, 30); // 最多30天连续
    }

    // 写入签到记录
    database.prepare(
      'INSERT INTO activity_sign (player_id, sign_date, streak) VALUES (?, ?, ?)'
    ).run(userId, signDate, streak);

    // 计算签到奖励
    const signActivity = CORE_ACTIVITIES.find(a => a.id === 'daily_sign');
    let signRewards = [{ type: 'spirit_stones', amount: 100 }, { type: 'exp', amount: 500 }];
    try { signRewards = JSON.parse(signActivity?.rewards || '[{"type":"spirit_stones","amount":100}]'); } catch (e) {}

    const streakBonus = Math.floor(1 + Math.min(streak, 7) * 0.1); // 连续签到最多+70%
    const stoneReward = Math.floor((signRewards.find(r => r.type === 'spirit_stones')?.amount || 100) * streakBonus);
    const expReward = Math.floor((signRewards.find(r => r.type === 'exp')?.amount || 500) * streakBonus);

    // 发放灵石
    try {
      database.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(stoneReward, userId);
    } catch (e) {
      Logger.warn('灵石发放失败:', e.message);
    }

    res.json({
      success: true,
      data: {
        signed: true,
        streak,
        date: signDate,
        rewards: {
          spirit_stones: stoneReward,
          exp: expReward
        },
        message: `签到成功！连续签到${streak}天，获得${stoneReward}灵石+${expReward}经验`
      }
    });
  } catch (err) {
    Logger.error('POST /activity/sign 错误:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/activity/sign-status - 签到状态查询
router.get('/sign/status', (req, res) => {
  const database = getDb(req);
  if (!database) return res.status(500).json({ success: false, error: '数据库未连接' });

  try {
    const userId = getUserId(req);
    const today = new Date();
    const signDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const todaySign = database.prepare(
      'SELECT * FROM activity_sign WHERE player_id = ? AND sign_date = ?'
    ).get(userId, signDate);

    const lastSign = database.prepare(
      'SELECT streak, sign_date FROM activity_sign WHERE player_id = ? ORDER BY id DESC LIMIT 1'
    ).get(userId);

    // 获取最近7天签到情况
    const recentSigns = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const signed = database.prepare(
        'SELECT streak FROM activity_sign WHERE player_id = ? AND sign_date = ?'
      ).get(userId, dateStr);
      recentSigns.push({
        date: dateStr,
        signed: !!signed,
        streak: signed?.streak || 0
      });
    }

    res.json({
      success: true,
      data: {
        todaySigned: !!todaySign,
        currentStreak: lastSign?.streak || 0,
        lastSignDate: lastSign?.sign_date || null,
        recentSigns,
      }
    });
  } catch (err) {
    Logger.error('GET /activity/sign/status 错误:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/activity/update-progress - 更新活动进度
router.post('/update-progress', (req, res) => {
  const database = getDb(req);
  if (!database) return res.status(500).json({ success: false, error: '数据库未连接' });

  try {
    const userId = getUserId(req);
    const { activity_id, delta } = req.body;

    if (!activity_id) {
      return res.status(400).json({ success: false, error: '缺少activity_id' });
    }

    const activity = database.prepare('SELECT * FROM activities WHERE id = ?').get(activity_id);
    if (!activity) {
      return res.status(404).json({ success: false, error: '活动不存在' });
    }

    const now = new Date().toISOString();
    database.prepare(`
      INSERT INTO activity_participation (player_id, activity_id, progress, last_update)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(player_id, activity_id) DO UPDATE SET
        progress = progress + excluded.progress,
        last_update = excluded.last_update
    `).run(userId, activity_id, delta || 1, now);

    const updated = database.prepare(
      'SELECT progress FROM activity_participation WHERE player_id = ? AND activity_id = ?'
    ).get(userId, activity_id);

    res.json({
      success: true,
      activity_id,
      progress: updated?.progress || 0
    });
  } catch (err) {
    Logger.error('POST /activity/update-progress 错误:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/activity/claim - 领取活动奖励
router.post('/claim', (req, res) => {
  const database = getDb(req);
  if (!database) return res.status(500).json({ success: false, error: '数据库未连接' });

  try {
    const userId = getUserId(req);
    const { activity_id, reward_index } = req.body;

    if (!activity_id) {
      return res.status(400).json({ success: false, error: '缺少activity_id' });
    }

    const activity = database.prepare('SELECT * FROM activities WHERE id = ?').get(activity_id);
    if (!activity) {
      return res.status(404).json({ success: false, error: '活动不存在' });
    }

    // 检查状态
    const status = getActivityStatus(activity);
    if (status === 'upcoming') {
      return res.status(400).json({ success: false, error: '活动尚未开始' });
    }
    if (status === 'ended') {
      return res.status(400).json({ success: false, error: '活动已结束' });
    }

    // 获取参与进度
    const participation = database.prepare(
      'SELECT * FROM activity_participation WHERE player_id = ? AND activity_id = ?'
    ).get(userId, activity_id);

    let rewards = [];
    try { rewards = JSON.parse(activity.rewards || '[]'); } catch (e) {}

    // 检查是否已领取（针对整活动类奖励）
    if (participation?.claimed) {
      return res.status(400).json({ success: false, error: '奖励已领取' });
    }

    // 根据活动类型处理奖励
    let reward = null;
    let rewardDesc = '';

    if (activity.type === 'level_goal' && reward_index !== undefined) {
      // 等级目标：按档位领取
      const idx = parseInt(reward_index);
      if (idx < 0 || idx >= rewards.length) {
        return res.status(400).json({ success: false, error: '无效的奖励档位' });
      }
      reward = rewards[idx];
      rewardDesc = reward.description;

      // 获取玩家当前等级
      const player = database.prepare('SELECT level FROM Users WHERE id = ?').get(userId);
      if (!player || player.level < (reward.level || 0)) {
        return res.status(400).json({ success: false, error: `需要达到${reward.level}级才能领取` });
      }
    } else if (participation?.progress >= (activity.condition?.count || 1)) {
      // 其他类型：进度满足即可领取
      reward = rewards[0] || { spirit_stones: 100, description: '活动奖励' };
      rewardDesc = reward.description || '活动奖励';
    } else {
      return res.status(400).json({
        success: false,
        error: `进度不足，需要${activity.condition?.count || 1}，当前${participation?.progress || 0}`
      });
    }

    // 发放奖励
    const granted = {};
    if (reward.spirit_stones) {
      database.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(reward.spirit_stones, userId);
      granted.spirit_stones = reward.spirit_stones;
    }
    if (reward.exp) {
      try {
        database.prepare('UPDATE Users SET exp = exp + ? WHERE id = ?').run(reward.exp, userId);
        granted.exp = reward.exp;
      } catch (e) { /* Users表可能没有exp列 */ }
    }

    // 标记已领取
    database.prepare(
      'INSERT INTO activity_participation (player_id, activity_id, progress, claimed, claimed_rewards, last_update) VALUES (?, ?, ?, 1, ?, ?)'
    ).run(userId, activity_id, participation?.progress || 0, JSON.stringify(reward), new Date().toISOString());

    res.json({
      success: true,
      data: {
        activity_id,
        reward: { ...reward, granted },
        message: `领取成功！${rewardDesc}，获得${reward.spirit_stones || 0}灵石`
      }
    });
  } catch (err) {
    Logger.error('POST /activity/claim 错误:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/activity/bonuses - 获取当前活动加成（给战斗/修炼等模块调用）
router.get('/status/bonuses', (req, res) => {
  const database = getDb(req);
  if (!database) return res.status(500).json({ success: false, error: '数据库未连接' });

  try {
    initActivityTables(database);
    const rows = database.prepare("SELECT * FROM activities WHERE status = 'active' OR status = 'upcoming'").all();
    const bonuses = { exp: 1, spirit_stones: 1, drop: 1, boss_rewards: 1 };

    for (const a of rows) {
      if (a.type === 'server_buff') {
        let rewards = [];
        try { rewards = JSON.parse(a.rewards || '[]'); } catch (e) {}
        for (const r of rewards) {
          if (r.buff === 'exp_rate') bonuses.exp *= (r.value || 1);
          if (r.buff === 'spirit_rate') bonuses.spirit_stones *= (r.value || 1);
          if (r.buff === 'drop_rate') bonuses.drop *= (r.value || 1);
        }
      }
    }

    res.json({ success: true, bonuses });
  } catch (err) {
    Logger.error('GET /activity/bonuses 错误:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============ 启动时初始化 ============
setTimeout(() => {
  const database = getDb(null);
  if (database) {
    initActivityTables(database);
    // 更新所有活动状态
    try {
      const rows = database.prepare('SELECT * FROM activities').all();
      const now = new Date();
      for (const a of rows) {
        const newStatus = getActivityStatus(a);
        if (a.status !== newStatus && a.id !== 'daily_sign') {
          database.prepare('UPDATE activities SET status = ? WHERE id = ?').run(newStatus, a.id);
        }
      }
      Logger.info(`活动状态更新完成，共${rows.length}个活动`);
    } catch (e) {
      Logger.warn('活动状态更新失败:', e.message);
    }
  }
}, 2000);

module.exports = router;
