/**
 * 新手引导系统 API (7-day Guide)
 * 挂机修仙游戏 - 新手引导路由
 */

const express = require('express');
const path = require('path');
const router = express.Router();

// 数据库路径
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

// 数据库连接
let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  console.log('[guide_api] 数据库连接成功');
} catch (err) {
  console.error('[guide_api] 数据库连接失败:', err.message);
  db = {
    _data: {},
    prepare: () => ({ get: () => null, all: () => [], run: () => ({}) }),
    exec: () => {}
  };
}

// 引导步骤配置 - 7天引导，每天4个任务
const GUIDE_CONFIG = [
  {
    day: 1,
    title: '修仙入门',
    tasks: [
      { key: 'cultivate', name: '修炼一次', description: '完成一次修炼', target: 1 },
      { key: 'dungeon', name: '挑战一次副本', description: '通关一次副本', target: 1 },
      { key: 'get_equipment', name: '获得一件装备', description: '获得一件装备', target: 1 },
      { key: 'advance_realm', name: '升级一次境界', description: '突破一次境界', target: 1 }
    ],
    rewards: { spirit_stone: 100, exp: 500, items: [{ id: 1001, name: '新手礼包', count: 1 }] }
  },
  {
    day: 2,
    title: '磨砺自身',
    tasks: [
      { key: 'enhance_equipment', name: '强化一次装备', description: '强化一件装备', target: 1 },
      { key: 'embed_gem', name: '镶嵌一颗宝石', description: '镶嵌一颗宝石', target: 1 },
      { key: 'wear_fashion', name: '穿戴一件外观', description: '穿戴一件外观', target: 1 },
      { key: 'cultivate_10', name: '完成10次修炼', description: '累计修炼10次', target: 10 }
    ],
    rewards: { spirit_stone: 200, exp: 1000, items: [{ id: 2001, name: '强化石', count: 5 }] }
  },
  {
    day: 3,
    title: '江湖历练',
    tasks: [
      { key: 'arena_battle', name: '完成一次竞技场', description: '参与一次竞技场', target: 1 },
      { key: 'defeat_worldboss', name: '击败一只世界BOSS', description: '击败世界BOSS', target: 1 },
      { key: 'accumulate_1000_lingshi', name: '获得1000灵石', description: '累计获得1000灵石', target: 1000 },
      { key: 'equip_wings', name: '穿戴一件翅膀', description: '装备一件翅膀', target: 1 }
    ],
    rewards: { spirit_stone: 300, exp: 1500, items: [{ id: 3001, name: '翅膀宝箱', count: 1 }] }
  },
  {
    day: 4,
    title: '炼丹制药',
    tasks: [
      { key: 'brew_pill', name: '炼制一颗丹药', description: '炼制一颗丹药', target: 1 },
      { key: 'upgrade_gongfa', name: '升级一次功法', description: '升级一次功法', target: 1 },
      { key: 'clear_exp_dungeon', name: '通关一次经验副本', description: '通关经验副本', target: 1 },
      { key: 'view_leaderboard', name: '查看一次排行榜', description: '查看排行榜', target: 1 }
    ],
    rewards: { spirit_stone: 400, exp: 2000, items: [{ id: 4001, name: '炼丹秘籍', count: 1 }] }
  },
  {
    day: 5,
    title: '社交达人',
    tasks: [
      { key: 'add_friend', name: '添加一位好友', description: '添加一位好友', target: 1 },
      { key: 'join_sect', name: '加入一个宗门', description: '加入一个宗门', target: 1 },
      { key: 'send_energy', name: '赠送好友体力', description: '赠送好友体力', target: 1 },
      { key: 'apply_master', name: '发起一次师徒申请', description: '发起师徒申请', target: 1 }
    ],
    rewards: { spirit_stone: 500, exp: 2500, items: [{ id: 5001, name: '好友令牌', count: 1 }] }
  },
  {
    day: 6,
    title: '深度修炼',
    tasks: [
      { key: 'activate_meridian', name: '激活一个经脉穴位', description: '激活一个穴位', target: 1 },
      { key: 'breakthrough', name: '突破一次境界', description: '完成境界突破', target: 1 },
      { key: 'attempt_tribulation', name: '完成一次渡劫', description: '完成渡劫', target: 1 },
      { key: 'upgrade_furnace', name: '升级一次炉鼎', description: '升级炉鼎', target: 1 }
    ],
    rewards: { spirit_stone: 600, exp: 3000, items: [{ id: 6001, name: '渡劫丹', count: 1 }] }
  },
  {
    day: 7,
    title: '修仙小成',
    tasks: [
      { key: 'reach_jindan', name: '达到金丹期', description: '境界达到金丹期', target: 1 },
      { key: 'combat_power_10000', name: '战力达到10000', description: '战力达到10000', target: 10000 },
      { key: 'participate_auction', name: '参与一次拍卖', description: '参与拍卖', target: 1 },
      { key: 'claim_all_rewards', name: '领取全部奖励', description: '领取所有奖励', target: 1 }
    ],
    rewards: { spirit_stone: 1000, exp: 5000, items: [{ id: 7001, name: '金丹大礼包', count: 1 }] }
  }
];

// 初始化数据库表
function initTables() {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS player_guide (
        player_id INTEGER PRIMARY KEY,
        current_day INTEGER DEFAULT 1,
        total_tasks_completed INTEGER DEFAULT 0,
        last_task_date TEXT,
        updated_at TEXT
      );
      
      CREATE TABLE IF NOT EXISTS player_guide_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER,
        day INTEGER,
        task_key TEXT,
        progress INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT 0,
        completed_at TEXT,
        UNIQUE(player_id, day, task_key)
      );
      
      CREATE TABLE IF NOT EXISTS player_guide_rewards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER,
        day INTEGER,
        claimed BOOLEAN DEFAULT 0,
        claimed_at TEXT,
        UNIQUE(player_id, day)
      );
    `);
    console.log('[guide_api] 数据表初始化成功');
  } catch (err) {
    console.error('[guide_api] 数据表初始化失败:', err.message);
  }
}

// 初始化玩家引导数据
function initPlayerGuide(playerId) {
  try {
    // 插入玩家引导记录
    const stmt1 = db.prepare(`
      INSERT OR IGNORE INTO player_guide (player_id, current_day, total_tasks_completed, updated_at)
      VALUES (?, 1, 0, datetime('now'))
    `);
    stmt1.run(playerId);
    
    // 初始化每天的任务
    for (const dayConfig of GUIDE_CONFIG) {
      for (const task of dayConfig.tasks) {
        const stmt2 = db.prepare(`
          INSERT OR IGNORE INTO player_guide_tasks (player_id, day, task_key, progress, completed)
          VALUES (?, ?, ?, 0, 0)
        `);
        stmt2.run(playerId, dayConfig.day, task.key);
      }
      
      // 初始化奖励记录
      const stmt3 = db.prepare(`
        INSERT OR IGNORE INTO player_guide_rewards (player_id, day, claimed)
        VALUES (?, ?, 0)
      `);
      stmt3.run(playerId, dayConfig.day);
    }
  } catch (err) {
    console.error('[guide_api] 初始化玩家引导失败:', err.message);
  }
}

// 获取玩家当前引导天数（基于完成进度自动推进）
function getPlayerCurrentDay(playerId) {
  try {
    const player = db.prepare('SELECT * FROM player_guide WHERE player_id = ?').get(playerId);
    if (!player) return 1;
    
    // 检查前一天是否全部完成，如果完成则推进到下一天
    let currentDay = player.current_day;
    if (currentDay < 7) {
      const allPrevCompleted = checkAllTasksCompleted(playerId, currentDay);
      if (allPrevCompleted) {
        // 推进到下一天
        const nextDay = currentDay + 1;
        db.prepare('UPDATE player_guide SET current_day = ?, updated_at = datetime("now") WHERE player_id = ?')
          .run(nextDay, playerId);
        return nextDay;
      }
    }
    return currentDay;
  } catch (err) {
    console.error('[guide_api] 获取玩家当前天数失败:', err.message);
    return 1;
  }
}

// 检查某天所有任务是否完成
function checkAllTasksCompleted(playerId, day) {
  try {
    const tasks = db.prepare(`
      SELECT * FROM player_guide_tasks WHERE player_id = ? AND day = ?
    `).all(playerId, day);
    
    if (tasks.length === 0) return false;
    return tasks.every(t => t.completed);
  } catch (err) {
    return false;
  }
}

// ========== API 端点 ==========

/**
 * GET /api/guide/tasks
 * 获取玩家今日的引导任务
 */
router.get('/tasks', (req, res) => {
  try {
    const { playerId } = req.query;
    if (!playerId) {
      return res.json({ code: 400, message: '缺少 playerId 参数' });
    }
    
    const pid = parseInt(playerId);
    
    // 初始化玩家数据
    initPlayerGuide(pid);
    
    // 获取玩家当前天数
    const currentDay = getPlayerCurrentDay(pid);
    
    // 获取当天的任务
    const dayConfig = GUIDE_CONFIG.find(d => d.day === currentDay);
    if (!dayConfig) {
      return res.json({ code: 404, message: '引导数据不存在' });
    }
    
    // 获取任务完成状态
    const taskRows = db.prepare(`
      SELECT task_key, progress, completed, completed_at 
      FROM player_guide_tasks 
      WHERE player_id = ? AND day = ?
    `).all(pid, currentDay);
    
    const taskMap = {};
    taskRows.forEach(row => {
      taskMap[row.task_key] = row;
    });
    
    const tasks = dayConfig.tasks.map(task => {
      const progress = taskMap[task.key] || { progress: 0, completed: false, completed_at: null };
      return {
        key: task.key,
        name: task.name,
        description: task.description,
        target: task.target,
        progress: progress.progress || 0,
        completed: !!progress.completed,
        completedAt: progress.completed_at
      };
    });
    
    res.json({
      code: 200,
      data: {
        currentDay,
        dayTitle: dayConfig.title,
        tasks
      }
    });
  } catch (err) {
    console.error('[guide_api] /tasks 错误:', err.message);
    res.json({ code: 500, message: '服务器错误: ' + err.message });
  }
});

/**
 * GET /api/guide/progress
 * 获取玩家引导总体进度
 */
router.get('/progress', (req, res) => {
  try {
    const { playerId } = req.query;
    if (!playerId) {
      return res.json({ code: 400, message: '缺少 playerId 参数' });
    }
    
    const pid = parseInt(playerId);
    
    // 初始化玩家数据
    initPlayerGuide(pid);
    
    // 获取玩家当前天数
    const currentDay = getPlayerCurrentDay(pid);
    
    // 计算已完成的奖励天数
    const claimedRewards = db.prepare(`
      SELECT day FROM player_guide_rewards WHERE player_id = ? AND claimed = 1
    `).all(pid);
    const claimedDays = claimedRewards.map(r => r.day);
    
    // 计算总体进度
    let totalTasksCompleted = 0;
    let totalTasks = 0;
    
    for (let day = 1; day <= 7; day++) {
      const tasks = GUIDE_CONFIG.find(d => d.day === day)?.tasks || [];
      totalTasks += tasks.length;
      
      if (day < currentDay || (day === currentDay && claimedDays.includes(day))) {
        // 之前的天数全部算完成
        totalTasksCompleted += tasks.length;
      } else if (day === currentDay) {
        // 当天任务
        const completedCount = db.prepare(`
          SELECT COUNT(*) as cnt FROM player_guide_tasks 
          WHERE player_id = ? AND day = ? AND completed = 1
        `).get(pid, day);
        totalTasksCompleted += completedCount?.cnt || 0;
      }
    }
    
    res.json({
      code: 200,
      data: {
        currentDay,
        totalTasksCompleted,
        totalTasks,
        claimedDays,
        progressPercent: totalTasks > 0 ? Math.round((totalTasksCompleted / totalTasks) * 100) : 0
      }
    });
  } catch (err) {
    console.error('[guide_api] /progress 错误:', err.message);
    res.json({ code: 500, message: '服务器错误: ' + err.message });
  }
});

/**
 * GET /api/guide/rewards
 * 获取每日引导奖励配置
 */
router.get('/rewards', (req, res) => {
  try {
    const { playerId } = req.query;
    if (!playerId) {
      return res.json({ code: 400, message: '缺少 playerId 参数' });
    }
    
    const pid = parseInt(playerId);
    
    // 初始化玩家数据
    initPlayerGuide(pid);
    
    // 获取奖励领取状态
    const rewardRows = db.prepare(`
      SELECT day, claimed, claimed_at FROM player_guide_rewards WHERE player_id = ?
    `).all(pid);
    
    const rewardMap = {};
    rewardRows.forEach(row => {
      rewardMap[row.day] = row;
    });
    
    // 获取玩家当前天数
    const currentDay = getPlayerCurrentDay(pid);
    
    const rewards = GUIDE_CONFIG.map(dayConfig => {
      const status = rewardMap[dayConfig.day] || { claimed: false, claimed_at: null };
      // 判断是否可以领取（需要前一天全部完成，或者当天任务全部完成）
      let claimable = false;
      if (dayConfig.day < currentDay) {
        // 之前的天数，完成即可领取
        const allCompleted = checkAllTasksCompleted(pid, dayConfig.day);
        claimable = allCompleted && !status.claimed;
      } else if (dayConfig.day === currentDay) {
        // 当天需要全部完成
        const allCompleted = checkAllTasksCompleted(pid, dayConfig.day);
        claimable = allCompleted && !status.claimed;
      }
      
      return {
        day: dayConfig.day,
        title: dayConfig.title,
        rewards: dayConfig.rewards,
        claimed: !!status.claimed,
        claimedAt: status.claimed_at,
        claimable
      };
    });
    
    res.json({
      code: 200,
      data: { rewards }
    });
  } catch (err) {
    console.error('[guide_api] /rewards 错误:', err.message);
    res.json({ code: 500, message: '服务器错误: ' + err.message });
  }
});

/**
 * POST /api/guide/claim
 * 领取某日引导奖励
 */
router.post('/claim', (req, res) => {
  try {
    const { playerId, day } = req.body;
    if (!playerId || !day) {
      return res.json({ code: 400, message: '缺少 playerId 或 day 参数' });
    }
    
    const pid = parseInt(playerId);
    const targetDay = parseInt(day);
    
    if (targetDay < 1 || targetDay > 7) {
      return res.json({ code: 400, message: 'day 参数无效' });
    }
    
    // 初始化玩家数据
    initPlayerGuide(pid);
    
    // 检查任务是否全部完成
    const allCompleted = checkAllTasksCompleted(pid, targetDay);
    if (!allCompleted) {
      return res.json({ code: 400, message: '该日引导任务未全部完成，无法领取奖励' });
    }
    
    // 检查奖励是否已领取
    const reward = db.prepare(`
      SELECT * FROM player_guide_rewards WHERE player_id = ? AND day = ?
    `).get(pid, targetDay);
    
    if (reward?.claimed) {
      return res.json({ code: 400, message: '该日奖励已领取' });
    }
    
    // 领取奖励
    db.prepare(`
      UPDATE player_guide_rewards SET claimed = 1, claimed_at = datetime('now')
      WHERE player_id = ? AND day = ?
    `).run(pid, targetDay);
    
    // 获取奖励配置
    const dayConfig = GUIDE_CONFIG.find(d => d.day === targetDay);
    
    res.json({
      code: 200,
      message: '奖励领取成功',
      data: {
        day: targetDay,
        rewards: dayConfig?.rewards || {}
      }
    });
  } catch (err) {
    console.error('[guide_api] /claim 错误:', err.message);
    res.json({ code: 500, message: '服务器错误: ' + err.message });
  }
});

/**
 * POST /api/guide/complete-task
 * 标记任务完成（玩家执行某个动作时调用）
 */
router.post('/complete-task', (req, res) => {
  try {
    const { playerId, taskKey, progress } = req.body;
    if (!playerId || !taskKey) {
      return res.json({ code: 400, message: '缺少 playerId 或 taskKey 参数' });
    }
    
    const pid = parseInt(playerId);
    const taskProgress = parseInt(progress) || 1;
    
    // 初始化玩家数据
    initPlayerGuide(pid);
    
    // 找到任务对应的天数
    let taskDay = 0;
    let taskConfig = null;
    for (const dayConfig of GUIDE_CONFIG) {
      const task = dayConfig.tasks.find(t => t.key === taskKey);
      if (task) {
        taskDay = dayConfig.day;
        taskConfig = task;
        break;
      }
    }
    
    if (!taskConfig) {
      return res.json({ code: 404, message: '任务不存在' });
    }
    
    // 获取玩家当前天数
    const currentDay = getPlayerCurrentDay(pid);
    
    // 不能提前完成后面天数的任务
    if (taskDay > currentDay) {
      return res.json({ code: 400, message: '请先完成之前的引导任务' });
    }
    
    // 更新任务进度
    const existingTask = db.prepare(`
      SELECT * FROM player_guide_tasks WHERE player_id = ? AND day = ? AND task_key = ?
    `).get(pid, taskDay, taskKey);
    
    if (existingTask?.completed) {
      return res.json({ code: 200, message: '任务已完成', data: { completed: true } });
    }
    
    const currentProgress = existingTask?.progress || 0;
    const newProgress = currentProgress + taskProgress;
    const isCompleted = newProgress >= taskConfig.target;
    
    if (isCompleted) {
      db.prepare(`
        UPDATE player_guide_tasks 
        SET progress = ?, completed = 1, completed_at = datetime('now')
        WHERE player_id = ? AND day = ? AND task_key = ?
      `).run(taskConfig.target, pid, taskDay, taskKey);
    } else {
      db.prepare(`
        UPDATE player_guide_tasks 
        SET progress = ?
        WHERE player_id = ? AND day = ? AND task_key = ?
      `).run(newProgress, pid, taskDay, taskKey);
    }
    
    // 检查是否当天所有任务都完成了，如果完成则推进到下一天
    if (isCompleted) {
      const allCompleted = checkAllTasksCompleted(pid, taskDay);
      if (allCompleted && taskDay < 7) {
        db.prepare(`
          UPDATE player_guide SET current_day = ?, total_tasks_completed = total_tasks_completed + 1, updated_at = datetime('now')
          WHERE player_id = ?
        `).run(taskDay + 1, pid);
      }
    }
    
    res.json({
      code: 200,
      message: isCompleted ? '任务完成' : '进度已更新',
      data: {
        taskKey,
        day: taskDay,
        progress: isCompleted ? taskConfig.target : newProgress,
        target: taskConfig.target,
        completed: isCompleted
      }
    });
  } catch (err) {
    console.error('[guide_api] /complete-task 错误:', err.message);
    res.json({ code: 500, message: '服务器错误: ' + err.message });
  }
});

// 初始化数据库表
initTables();

module.exports = router;
