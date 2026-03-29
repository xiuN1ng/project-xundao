const express = require('express');
const router = express.Router();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'game.db');

function getDb() {
  const Database = require('better-sqlite3');
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  return db;
}

function getShanghaiDateStr() {
  const now = new Date(Date.now() + 8 * 3600000);
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ========== Commission Templates ==========
const COMMISSION_TEMPLATES = [
  // Easy
  {
    id: 1, difficulty: 'easy', title: '采集灵草',
    description: '前往灵田采集10株灵草',
    target_type: 'gather_herb', target: 10,
    reward_lingshi: 100, reward_exp: 50,
    duration: 1800, minRealm: 1,
  },
  {
    id: 2, difficulty: 'easy', title: '清理小妖',
    description: '在野外击杀10只小妖',
    target_type: 'kill_monster', target: 10,
    reward_lingshi: 120, reward_exp: 60,
    duration: 1800, minRealm: 1,
  },
  {
    id: 3, difficulty: 'easy', title: '护送商队',
    description: '护送商队安全抵达目的地',
    target_type: 'escort', target: 1,
    reward_lingshi: 150, reward_exp: 80,
    duration: 1200, minRealm: 1,
  },
  // Medium
  {
    id: 4, difficulty: 'medium', title: '探索古墓',
    description: '探索古墓遗迹，寻找宝物',
    target_type: 'explore', target: 3,
    reward_lingshi: 300, reward_exp: 200,
    duration: 3600, minRealm: 3,
  },
  {
    id: 5, difficulty: 'medium', title: '挑战副本',
    description: '通关任意副本一次',
    target_type: 'complete_dungeon', target: 1,
    reward_lingshi: 350, reward_exp: 250,
    duration: 3600, minRealm: 3,
  },
  {
    id: 6, difficulty: 'medium', title: '修炼突破',
    description: '完成一次境界突破',
    target_type: 'realm_breakthrough', target: 1,
    reward_lingshi: 400, reward_exp: 300,
    duration: 7200, minRealm: 5,
  },
  // Hard
  {
    id: 7, difficulty: 'hard', title: '击杀世界BOSS',
    description: '对世界BOSS造成有效伤害',
    target_type: 'worldboss_damage', target: 10000,
    reward_lingshi: 800, reward_exp: 500,
    duration: 7200, minRealm: 7,
  },
  {
    id: 8, difficulty: 'hard', title: '竞技场连胜',
    description: '在竞技场获得3场胜利',
    target_type: 'arena_win', target: 3,
    reward_lingshi: 1000, reward_exp: 600,
    duration: 7200, minRealm: 5,
  },
  {
    id: 9, difficulty: 'hard', title: '通关无尽塔',
    description: '通关无尽塔第10层',
    target_type: 'tower_floor', target: 10,
    reward_lingshi: 1200, reward_exp: 800,
    duration: 14400, minRealm: 8,
  },
];

// ========== DB Tables ==========
function initCommissionTables() {
  const db = getDb();
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS commission_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        template_id INTEGER NOT NULL,
        difficulty TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        target_type TEXT NOT NULL,
        target INTEGER NOT NULL,
        progress INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        accepted_at TEXT DEFAULT (datetime('now')),
        expires_at TEXT,
        completed_at TEXT,
        UNIQUE(player_id, template_id, status)
      );

      CREATE TABLE IF NOT EXISTS commission_rewards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        task_id INTEGER NOT NULL,
        reward_lingshi INTEGER NOT NULL,
        reward_exp INTEGER NOT NULL,
        claimed_at TEXT DEFAULT (datetime('now'))
      );
    `);
  } finally {
    db.close();
  }
}

initCommissionTables();

// ========== Middleware: get player id ==========
function extractUserId(req) {
  return req.userId || parseInt(req.body?.player_id || req.body?.userId || req.query?.player_id || req.query?.userId || 1);
}

function getPlayerRealm(db, userId) {
  try {
    const row = db.prepare('SELECT realm FROM Users WHERE id = ?').get(userId);
    return row ? row.realm : 1;
  } catch {
    return 1;
  }
}

function getShanghaiNow() {
  const now = new Date(Date.now() + 8 * 3600000);
  return now.toISOString().replace('T', ' ').substring(0, 19);
}

// ========== GET /commission/list — available commissions ==========
router.get('/list', (req, res) => {
  const db = getDb();
  try {
    const userId = extractUserId(req);
    const realm = getPlayerRealm(db, userId);

    // Get active tasks for this player
    const activeTasks = db.prepare(`
      SELECT * FROM commission_tasks
      WHERE player_id = ? AND status = 'active'
    `).all(userId);

    // Get completed tasks
    const completedTasks = db.prepare(`
      SELECT * FROM commission_tasks
      WHERE player_id = ? AND status = 'completed'
      ORDER BY completed_at DESC LIMIT 5
    `).all(userId);

    // Available templates (filtered by realm)
    const available = COMMISSION_TEMPLATES
      .filter(t => t.minRealm <= realm)
      .map(t => {
        const active = activeTasks.find(at => at.template_id === t.id);
        return {
          ...t,
          hasActive: !!active,
          activeId: active?.id || null,
          progress: active?.progress || 0,
          status: active?.status || null,
        };
      });

    res.json({
      success: true,
      available,
      activeTasks,
      completedTasks,
      dailyLimit: 3,
      todayCompleted: completedTasks.filter(t => {
        const d = getShanghaiDateStr();
        return t.completed_at && t.completed_at.startsWith(d);
      }).length,
    });
  } catch (err) {
    console.error('[Commission] GET /list error:', err.message);
    res.json({ success: false, error: err.message });
  } finally {
    db.close();
  }
});

// ========== POST /commission/accept — accept a commission ==========
router.post('/accept', (req, res) => {
  const db = getDb();
  try {
    const { template_id, player_id, userId: bodyUserId } = req.body;
    const userId = bodyUserId || player_id || extractUserId(req);

    const template = COMMISSION_TEMPLATES.find(t => t.id === template_id);
    if (!template) {
      return res.json({ success: false, error: '无效的委托任务' });
    }

    const realm = getPlayerRealm(db, userId);
    if (realm < template.minRealm) {
      return res.json({ success: false, error: `需要境界${template.minRealm}以上才能接取此任务` });
    }

    // Check if already has this task active
    const existing = db.prepare(`
      SELECT * FROM commission_tasks
      WHERE player_id = ? AND template_id = ? AND status = 'active'
    `).get(userId, template_id);

    if (existing) {
      return res.json({ success: false, error: '该任务已在进行中' });
    }

    const now = getShanghaiNow();
    const expires = new Date(Date.now() + template.duration * 1000 + 8 * 3600000)
      .toISOString().replace('T', ' ').substring(0, 19);

    const info = db.prepare(`
      INSERT INTO commission_tasks (player_id, template_id, difficulty, title, description,
        target_type, target, progress, status, accepted_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'active', ?, ?)
    `).run(userId, template_id, template.difficulty, template.title, template.description,
      template.target_type, template.target, now, expires);

    res.json({
      success: true,
      message: `已接受委托：${template.title}`,
      taskId: info.lastInsertRowid,
    });
  } catch (err) {
    console.error('[Commission] POST /accept error:', err.message);
    res.json({ success: false, error: err.message });
  } finally {
    db.close();
  }
});

// ========== POST /commission/update-progress — update task progress ==========
router.post('/update-progress', (req, res) => {
  const db = getDb();
  try {
    const { target_type, delta, player_id, userId: bodyUserId } = req.body;
    const userId = bodyUserId || player_id || extractUserId(req);

    if (!target_type || delta === undefined) {
      return res.json({ success: false, error: '缺少参数' });
    }

    // Find active tasks matching this target_type
    const tasks = db.prepare(`
      SELECT * FROM commission_tasks
      WHERE player_id = ? AND target_type = ? AND status = 'active'
    `).all(userId, target_type);

    if (tasks.length === 0) {
      return res.json({ success: true, message: '无相关进行中任务' });
    }

    const updated = [];
    for (const task of tasks) {
      const newProgress = Math.min(task.progress + delta, task.target);
      const newStatus = newProgress >= task.target ? 'completed' : 'active';

      db.prepare(`
        UPDATE commission_tasks SET progress = ?, status = ?,
        completed_at = CASE WHEN ? = 'completed' THEN datetime('now') ELSE completed_at END
        WHERE id = ?
      `).run(newProgress, newStatus, newStatus, task.id);

      updated.push({ id: task.id, title: task.title, progress: newProgress, target: task.target, status: newStatus });
    }

    res.json({ success: true, updated });
  } catch (err) {
    console.error('[Commission] POST /update-progress error:', err.message);
    res.json({ success: false, error: err.message });
  } finally {
    db.close();
  }
});

// ========== POST /commission/claim — claim reward ==========
router.post('/claim', (req, res) => {
  const db = getDb();
  try {
    const { task_id, player_id, userId: bodyUserId } = req.body;
    const userId = bodyUserId || player_id || extractUserId(req);

    if (!task_id) {
      return res.json({ success: false, error: '缺少task_id' });
    }

    const task = db.prepare(`
      SELECT * FROM commission_tasks WHERE id = ? AND player_id = ?
    `).get(task_id, userId);

    if (!task) {
      return res.json({ success: false, error: '任务不存在' });
    }

    if (task.status !== 'completed') {
      return res.json({ success: false, error: '任务尚未完成，无法领取奖励' });
    }

    if (task.progress < task.target) {
      return res.json({ success: false, error: '任务进度不足' });
    }

    // Check if already claimed
    const claimed = db.prepare(`
      SELECT * FROM commission_rewards WHERE task_id = ?
    `).get(task_id);

    if (claimed) {
      return res.json({ success: false, error: '奖励已领取' });
    }

    // Get reward from template
    const template = COMMISSION_TEMPLATES.find(t => t.id === task.template_id);
    const rewardLingshi = template?.reward_lingshi || task.reward_lingshi || 0;
    const rewardExp = template?.reward_exp || task.reward_exp || 0;

    // Mark as done and give rewards
    db.prepare(`
      UPDATE commission_tasks SET status = 'claimed' WHERE id = ?
    `).run(task_id);

    db.prepare(`
      INSERT INTO commission_rewards (player_id, task_id, reward_lingshi, reward_exp)
      VALUES (?, ?, ?, ?)
    `).run(userId, task_id, rewardLingshi, rewardExp);

    // Add to player
    try {
      db.prepare(`UPDATE Users SET lingshi = lingshi + ? WHERE id = ?`).run(rewardLingshi, userId);
    } catch (e) {
      console.error('[Commission] Failed to add lingshi:', e.message);
    }

    // Add exp (update Users level/exp)
    try {
      const user = db.prepare('SELECT exp, level FROM Users WHERE id = ?').get(userId);
      if (user) {
        const newExp = (user.exp || 0) + rewardExp;
        const expNeeded = user.level * 100;
        if (newExp >= expNeeded) {
          db.prepare('UPDATE Users SET exp = ?, level = level + 1 WHERE id = ?').run(newExp - expNeeded, userId);
        } else {
          db.prepare('UPDATE Users SET exp = ? WHERE id = ?').run(newExp, userId);
        }
      }
    } catch (e) {
      console.error('[Commission] Failed to add exp:', e.message);
    }

    res.json({
      success: true,
      message: `领取成功！获得 ${rewardLingshi} 灵石，${rewardExp} 经验`,
      rewards: { lingshi: rewardLingshi, exp: rewardExp },
    });
  } catch (err) {
    console.error('[Commission] POST /claim error:', err.message);
    res.json({ success: false, error: err.message });
  } finally {
    db.close();
  }
});

// ========== POST /commission/refresh — refresh available tasks ==========
router.post('/refresh', (req, res) => {
  const db = getDb();
  try {
    const userId = extractUserId(req);
    const realm = getPlayerRealm(db, userId);

    // Expire old tasks
    const now = getShanghaiNow();
    db.prepare(`
      UPDATE commission_tasks SET status = 'expired'
      WHERE player_id = ? AND status = 'active' AND expires_at < ?
    `).run(userId, now);

    res.json({
      success: true,
      message: '过期任务已清除',
      availableCount: COMMISSION_TEMPLATES.filter(t => t.minRealm <= realm).length,
    });
  } catch (err) {
    console.error('[Commission] POST /refresh error:', err.message);
    res.json({ success: false, error: err.message });
  } finally {
    db.close();
  }
});

// ========== GET /commission/tasks — alias for /list ==========
router.get('/tasks', (req, res) => {
  const db = getDb();
  try {
    const userId = extractUserId(req);
    const realm = getPlayerRealm(db, userId);

    const activeTasks = db.prepare(`
      SELECT * FROM commission_tasks
      WHERE player_id = ? AND status = 'active'
    `).all(userId);

    const completedTasks = db.prepare(`
      SELECT * FROM commission_tasks
      WHERE player_id = ? AND status = 'completed'
      ORDER BY completed_at DESC LIMIT 5
    `).all(userId);

    const available = COMMISSION_TEMPLATES
      .filter(t => t.minRealm <= realm)
      .map(t => {
        const active = activeTasks.find(at => at.template_id === t.id);
        return {
          ...t,
          hasActive: !!active,
          activeId: active?.id || null,
          progress: active?.progress || 0,
          status: active?.status || null,
        };
      });

    res.json({
      success: true,
      available,
      activeTasks,
      completedTasks,
      dailyLimit: 3,
      todayCompleted: completedTasks.filter(t => {
        const d = getShanghaiDateStr();
        return t.completed_at && t.completed_at.startsWith(d);
      }).length,
    });
  } catch (err) {
    console.error('[Commission] GET /tasks error:', err.message);
    res.json({ success: false, error: err.message });
  } finally {
    db.close();
  }
});

// ========== POST /commission/complete — alias for /claim ==========
router.post('/complete', (req, res) => {
  const db = getDb();
  try {
    const { task_id, player_id, userId: bodyUserId } = req.body;
    const userId = bodyUserId || player_id || extractUserId(req);

    if (!task_id) {
      return res.json({ success: false, error: '缺少task_id' });
    }

    const task = db.prepare(`
      SELECT * FROM commission_tasks WHERE id = ? AND player_id = ?
    `).get(task_id, userId);

    if (!task) {
      return res.json({ success: false, error: '任务不存在' });
    }

    if (task.status !== 'completed') {
      return res.json({ success: false, error: '任务尚未完成，无法领取奖励' });
    }

    if (task.progress < task.target) {
      return res.json({ success: false, error: '任务进度不足' });
    }

    const claimed = db.prepare(`
      SELECT * FROM commission_rewards WHERE task_id = ?
    `).get(task_id);

    if (claimed) {
      return res.json({ success: false, error: '奖励已领取' });
    }

    const template = COMMISSION_TEMPLATES.find(t => t.id === task.template_id);
    const rewardLingshi = template?.reward_lingshi || task.reward_lingshi || 0;
    const rewardExp = template?.reward_exp || task.reward_exp || 0;

    db.prepare(`
      UPDATE commission_tasks SET status = 'claimed' WHERE id = ?
    `).run(task_id);

    db.prepare(`
      INSERT INTO commission_rewards (player_id, task_id, reward_lingshi, reward_exp)
      VALUES (?, ?, ?, ?)
    `).run(userId, task_id, rewardLingshi, rewardExp);

    try {
      db.prepare(`UPDATE Users SET lingshi = lingshi + ? WHERE id = ?`).run(rewardLingshi, userId);
    } catch (e) {
      console.error('[Commission] Failed to add lingshi:', e.message);
    }

    try {
      const user = db.prepare('SELECT exp, level FROM Users WHERE id = ?').get(userId);
      if (user) {
        const newExp = (user.exp || 0) + rewardExp;
        const expNeeded = user.level * 100;
        if (newExp >= expNeeded) {
          db.prepare('UPDATE Users SET exp = ?, level = level + 1 WHERE id = ?').run(newExp - expNeeded, userId);
        } else {
          db.prepare('UPDATE Users SET exp = ? WHERE id = ?').run(newExp, userId);
        }
      }
    } catch (e) {
      console.error('[Commission] Failed to add exp:', e.message);
    }

    res.json({
      success: true,
      message: `领取成功！获得 ${rewardLingshi} 灵石，${rewardExp} 经验`,
      rewards: { lingshi: rewardLingshi, exp: rewardExp },
    });
  } catch (err) {
    console.error('[Commission] POST /complete error:', err.message);
    res.json({ success: false, error: err.message });
  } finally {
    db.close();
  }
});

module.exports = router;
