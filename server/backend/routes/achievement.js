const express = require('express');
const router = express.Router();
const path = require('path');

// 数据库连接
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

// 用户成就进度（必须在模块加载时初始化，用于 initAchievementTable → loadAchievementsFromDB 调用链）
let userAchievements = {};

let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  initAchievementTable();
  loadAchievementsFromDB();
} catch (e) {
  console.log('[achievement] DB连接失败:', e.message);
  db = null;
}

function initAchievementTable() {
  if (!db) return;
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS achievement_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        achievement_id INTEGER NOT NULL,
        progress INTEGER DEFAULT 0,
        completed INTEGER DEFAULT 0,
        claimed INTEGER DEFAULT 0,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, achievement_id)
      );
    `);
    console.log('[achievement] achievement_progress 表初始化完成');
  } catch (e) {
    console.error('[achievement] 建表失败:', e.message);
  }
}

function loadAchievementsFromDB() {
  if (!db) return;
  try {
    const rows = db.prepare('SELECT * FROM achievement_progress').all();
    rows.forEach(row => {
      if (!userAchievements[row.user_id]) userAchievements[row.user_id] = {};
      userAchievements[row.user_id][row.achievement_id] = {
        progress: row.progress,
        completed: !!row.completed,
        claimed: !!row.claimed
      };
    });
    console.log(`[achievement] 从DB加载了 ${rows.length} 条成就进度`);
  } catch (e) {
    console.error('[achievement] 加载成就进度失败:', e.message);
  }
}

/**
 * 将 DB 加载的成就数据同步到 achievement_trigger_service
 * 解决服务器重启后 trigger service 内存为空导致成就被错误覆盖的问题
 */
function syncAchievementsToTriggerService() {
  if (!achievementTrigger || !achievementTrigger.loadUserProgressFromExternal) return;
  for (const [userIdStr, achData] of Object.entries(userAchievements)) {
    achievementTrigger.loadUserProgressFromExternal(Number(userIdStr), achData);
  }
  console.log(`[achievement] 已将 ${Object.keys(userAchievements).length} 个用户的成就数据同步到 trigger service`);
}

function saveAchievementToDB(userId, achievementId, progress, completed, claimed) {
  if (!db) return;
  try {
    db.prepare(`
      INSERT OR REPLACE INTO achievement_progress (user_id, achievement_id, progress, completed, claimed, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(userId, achievementId, progress, completed ? 1 : 0, claimed ? 1 : 0);

    // 同步更新内存缓存（解决 save 后 GET 仍返回旧数据的 bug）
    if (!userAchievements[userId]) userAchievements[userId] = {};
    userAchievements[userId][achievementId] = { progress, completed: !!completed, claimed: !!claimed };
  } catch (e) {
    console.error('[achievement] 保存成就进度失败:', e.message);
  }
}

// 共享玩家数据引用
let playerRef = null;
router.setPlayerRef = (ref) => { playerRef = ref; };
router.getPlayerRef = () => playerRef;

// 成就触发服务（后端埋点检测）
let achievementTrigger;
try {
  achievementTrigger = require('../../game/achievement_trigger_service');
  // 注册持久化回调：每次成就进度更新自动写入 DB
  achievementTrigger.setSaveProgressCallback(saveAchievementToDB);
  // 将 DB 已加载的成就数据同步到 trigger service（解决重启后内存为空的问题）
  syncAchievementsToTriggerService();
} catch (e) {
  console.log('[achievement] 成就触发服务加载:', e.message);
  achievementTrigger = null;
}

// 事件总线监听器（可选：作为直接调用的补充）
let eventBus;
try {
  eventBus = require('../../game/eventBus');
} catch (e) {
  console.log('[achievement] eventBus加载失败:', e.message);
  eventBus = null;
}

// 注册事件总线监听器（松耦合方式）
if (eventBus && achievementTrigger) {
  eventBus.on('cultivation:breakthrough', ({ userId, newRealm }) => {
    try {
      achievementTrigger.onRealmBreakthrough(userId, newRealm);
      const notifications = achievementTrigger.popNotifications(userId);
      if (notifications && notifications.length > 0) {
        console.log(`[成就通知] 用户${userId}境界突破达成:`, notifications.map(n => n.achievementName).join(', '));
      }
    } catch (e) {
      console.warn('[achievement] cultivation:breakthrough 事件处理失败:', e.message);
    }
  });

  eventBus.on('chapter:complete', ({ userId, chapterId }) => {
    try {
      achievementTrigger.onChapterClear(userId, chapterId);
      const notifications = achievementTrigger.popNotifications(userId);
      if (notifications && notifications.length > 0) {
        console.log(`[成就通知] 用户${userId}章节通关达成:`, notifications.map(n => n.achievementName).join(', '));
      }
    } catch (e) {
      console.warn('[achievement] chapter:complete 事件处理失败:', e.message);
    }
  });

  eventBus.on('chapter:battle', ({ userId, chapterId }) => {
    try {
      achievementTrigger.onChapterClear(userId, chapterId);
    } catch (e) {
      console.warn('[achievement] chapter:battle 事件处理失败:', e.message);
    }
  });

  eventBus.on('arena:challenge', ({ userId, win, combatPower }) => {
    if (!win) return;
    try {
      achievementTrigger.onCombatWin(userId, combatPower);
      const notifications = achievementTrigger.popNotifications(userId);
      if (notifications && notifications.length > 0) {
        console.log(`[成就通知] 用户${userId}竞技场战斗达成:`, notifications.map(n => n.achievementName).join(', '));
      }
    } catch (e) {
      console.warn('[achievement] arena:challenge 事件处理失败:', e.message);
    }
  });

  eventBus.on('forge:make', ({ userId, recipeId, quality }) => {
    try {
      achievementTrigger.onEquipmentObtain(userId, recipeId, quality);
      const notifications = achievementTrigger.popNotifications(userId);
      if (notifications && notifications.length > 0) {
        console.log(`[成就通知] 用户${userId}锻造装备达成:`, notifications.map(n => n.achievementName).join(', '));
      }
    } catch (e) {
      console.warn('[achievement] forge:make 事件处理失败:', e.message);
    }
  });

  eventBus.on('forge:strengthen', ({ userId, equipId, newLevel }) => {
    try {
      achievementTrigger.onEquipmentObtain(userId, equipId, null);
    } catch (e) {
      console.warn('[achievement] forge:strengthen 事件处理失败:', e.message);
    }
  });

  console.log('[achievement] 事件总线监听器注册完成');
}

// 成就配置
const achievementTemplates = [
  // 修炼成就
  { id: 1, category: 'cultivate', name: '初入修仙', desc: '达到练气期', target: 2, reward: { diamonds: 10 }, icon: '🧘' },
  { id: 2, category: 'cultivate', name: '筑基成功', desc: '达到筑基期', target: 3, reward: { diamonds: 50 }, icon: '🧘' },
  { id: 3, category: 'cultivate', name: '金丹大道', desc: '达到金丹期', target: 4, reward: { diamonds: 100 }, icon: '🧘' },
  { id: 4, category: 'cultivate', name: '元婴期', desc: '达到元婴期', target: 5, reward: { diamonds: 200 }, icon: '🧘' },
  { id: 5, category: 'cultivate', name: '化神期', desc: '达到化神期', target: 6, reward: { diamonds: 500 }, icon: '🧘' },
  { id: 6, category: 'cultivate', name: '渡劫飞升', desc: '达到渡劫期', target: 7, reward: { diamonds: 1000 }, icon: '🧘' },
  
  // 战力成就
  { id: 10, category: 'combat', name: '初战告捷', desc: '战力达到1000', target: 1000, reward: { lingshi: 100 }, icon: '⚔️' },
  { id: 11, category: 'combat', name: '小有名气', desc: '战力达到5000', target: 5000, reward: { lingshi: 500 }, icon: '⚔️' },
  { id: 12, category: 'combat', name: '一方强者', desc: '战力达到20000', target: 20000, reward: { lingshi: 2000 }, icon: '⚔️' },
  { id: 13, category: 'combat', name: '威震天下', desc: '战力达到100000', target: 100000, reward: { lingshi: 10000 }, icon: '⚔️' },
  
  // 装备成就
  { id: 20, category: 'equipment', name: '初具装备', desc: '强化装备到+5', target: 5, reward: { diamonds: 20 }, icon: '🗡️' },
  { id: 21, category: 'equipment', name: '装备小成', desc: '强化装备到+10', target: 10, reward: { diamonds: 50 }, icon: '🗡️' },
  { id: 22, category: 'equipment', name: '装备大成', desc: '强化装备到+15', target: 15, reward: { diamonds: 100 }, icon: '🗡️' },
  
  // 灵兽成就
  { id: 30, category: 'beast', name: '捕获灵兽', desc: '拥有1只灵兽', target: 1, reward: { diamonds: 10 }, icon: '🦊' },
  { id: 31, category: 'beast', name: '灵兽伙伴', desc: '拥有5只灵兽', target: 5, reward: { diamonds: 50 }, icon: '🦊' },
  { id: 32, category: 'beast', name: '神兽环绕', desc: '拥有神兽', target: 1, reward: { diamonds: 100 }, icon: '🦊' },
  
  // 章节成就
  { id: 40, category: 'chapter', name: '初窥门径', desc: '通关第5章', target: 5, reward: { lingshi: 100 }, icon: '📖' },
  { id: 41, category: 'chapter', name: '小有所成', desc: '通关第10章', target: 10, reward: { lingshi: 500 }, icon: '📖' },
  { id: 42, category: 'chapter', name: '登堂入室', desc: '通关第30章', target: 30, reward: { lingshi: 2000 }, icon: '📖' },
  { id: 43, category: 'chapter', name: '登峰造极', desc: '通关第50章', target: 50, reward: { lingshi: 5000 }, icon: '📖' },
  { id: 44, category: 'chapter', name: '证道成仙', desc: '通关第100章', target: 100, reward: { diamonds: 1000 }, icon: '📖' },
  
  // 社交成就
  { id: 50, category: 'social', name: '结交朋友', desc: '拥有5个好友', target: 5, reward: { lingshi: 50 }, icon: '👥' },
  { id: 51, category: 'social', name: '人脉广泛', desc: '拥有20个好友', target: 20, reward: { lingshi: 200 }, icon: '👥' },
  { id: 52, category: 'social', name: '加入仙盟', desc: '加入仙盟', target: 1, reward: { diamonds: 20 }, icon: '🏛️' },
  
  // 消费成就
  { id: 60, category: 'spend', name: '初次充值', desc: '首次充值任意金额', target: 1, reward: { diamonds: 10 }, icon: '💎' },
  { id: 61, category: 'spend', name: '累计充值', desc: '累计充值100元', target: 100, reward: { diamonds: 100 }, icon: '💎' },
  { id: 62, category: 'spend', name: '充值大户', desc: '累计充值1000元', target: 1000, reward: { diamonds: 1000 }, icon: '💎' },
  
  // 在线成就
  { id: 70, category: 'online', name: '每日登录', desc: '累计登录1天', target: 1, reward: { lingshi: 10 }, icon: '📅' },
  { id: 71, category: 'online', name: '持续修炼', desc: '累计登录7天', target: 7, reward: { diamonds: 50 }, icon: '📅' },
  { id: 72, category: 'online', name: '持之以恒', desc: '累计登录30天', target: 30, reward: { diamonds: 200 }, icon: '📅' },
  { id: 73, category: 'online', name: '修仙达人', desc: '累计登录100天', target: 100, reward: { diamonds: 1000 }, icon: '📅' }
];

// GET /api/achievement/list?player_id=X - 正确的成就列表接口（解决 /list 被 /:userId 路由错误捕获的问题）
router.get('/list', (req, res) => {
  const userId = parseInt(req.query.player_id || req.query.userId);
  if (!userId || isNaN(userId)) {
    return res.json({ achievements: [], categories: {}, stats: { total: 0, completed: 0, claimed: 0 } });
  }

  // 确保 in-memory 数据与 DB 同步
  if (!userAchievements[userId]) {
    userAchievements[userId] = {};
  }
  if (db) {
    try {
      const rows = db.prepare('SELECT achievement_id, progress, completed, claimed FROM achievement_progress WHERE user_id = ?').all(userId);
      rows.forEach(row => {
        const achId = Number(row.achievement_id);
        if (!userAchievements[userId][achId] || userAchievements[userId][achId].progress === 0) {
          userAchievements[userId][achId] = {
            progress: row.progress,
            completed: !!row.completed,
            claimed: !!row.claimed
          };
        }
      });
    } catch (e) {
      console.warn('[achievement] DB同步失败:', e.message);
    }
  }

  const achievements = achievementTemplates.map(ach => {
    const userAch = userAchievements[userId][ach.id];
    return {
      ...ach,
      progress: userAch?.progress || 0,
      completed: userAch?.completed || false,
      claimed: userAch?.claimed || false
    };
  });

  const categories = {};
  achievements.forEach(ach => {
    if (!categories[ach.category]) categories[ach.category] = [];
    categories[ach.category].push(ach);
  });

  res.json({
    achievements,
    categories,
    stats: {
      total: achievements.length,
      completed: achievements.filter(a => a.completed).length,
      claimed: achievements.filter(a => a.claimed).length
    }
  });
});

// 获取用户成就列表（/:userId 路由）
router.get('/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  
  if (!userAchievements[userId]) {
    userAchievements[userId] = {};
  }
  
  // 确保 in-memory 数据与 DB 同步（解决直接 DB 更新后 in-memory 仍为 0 的问题）
  if (db) {
    try {
      const rows = db.prepare('SELECT achievement_id, progress, completed, claimed FROM achievement_progress WHERE user_id = ?').all(userId);
      rows.forEach(row => {
        const achId = Number(row.achievement_id);
        if (!userAchievements[userId][achId] || userAchievements[userId][achId].progress === 0) {
          userAchievements[userId][achId] = {
            progress: row.progress,
            completed: !!row.completed,
            claimed: !!row.claimed
          };
        }
      });
    } catch (e) {
      console.warn('[achievement] DB同步失败:', e.message);
    }
  }
  
  const achievements = achievementTemplates.map(ach => {
    const userAch = userAchievements[userId][ach.id];
    return {
      ...ach,
      progress: userAch?.progress || 0,
      completed: userAch?.completed || false,
      claimed: userAch?.claimed || false
    };
  });
  
  // 按分类
  const categories = {};
  achievements.forEach(ach => {
    if (!categories[ach.category]) {
      categories[ach.category] = [];
    }
    categories[ach.category].push(ach);
  });
  
  const totalCompleted = achievements.filter(a => a.completed).length;
  const totalClaimed = achievements.filter(a => a.claimed).length;
  
  res.json({
    achievements,
    categories,
    stats: {
      total: achievements.length,
      completed: totalCompleted,
      claimed: totalClaimed
    }
  });
});

// 更新成就进度
router.post('/update', (req, res) => {
  const { userId, category, value } = req.body;
  
  if (!userAchievements[userId]) {
    userAchievements[userId] = {};
  }
  
  // 找出该分类下所有相关成就
  const related = achievementTemplates.filter(a => a.category === category);
  
  related.forEach(ach => {
    if (!userAchievements[userId][ach.id]) {
      userAchievements[userId][ach.id] = { progress: 0, completed: false, claimed: false };
    }
    
    // 使用max确保进度只进不退
    const current = userAchievements[userId][ach.id].progress;
    const newProgress = Math.max(current, value);
    userAchievements[userId][ach.id].progress = newProgress;
    
    const wasCompleted = userAchievements[userId][ach.id].completed;
    if (newProgress >= ach.target) {
      userAchievements[userId][ach.id].completed = true;
    }
    
    // 持久化到DB
    saveAchievementToDB(userId, ach.id, newProgress, userAchievements[userId][ach.id].completed, userAchievements[userId][ach.id].claimed);
  });
  
  res.json({ success: true });
});

// ==================== 后端成就触发 API ====================

// 获取待推送的通知（成就达成通知，客户端轮询）
router.get('/notifications/:userId', (req, res) => {
  const userId = parseInt(req.params.userId) || 1;
  
  if (!achievementTrigger) {
    return res.json({ success: false, message: '成就触发服务不可用', notifications: [] });
  }
  
  const notifications = achievementTrigger.popNotifications(userId);
  res.json({ success: true, notifications, count: notifications.length });
});

// 获取用户成就状态摘要（包含所有成就进度）
router.get('/summary/:userId', (req, res) => {
  const userId = parseInt(req.params.userId) || 1;
  
  if (!achievementTrigger) {
    return res.json({ success: false, message: '成就触发服务不可用' });
  }
  
  const summary = achievementTrigger.getUserAchievementSummary(userId);
  
  // 统计
  const total = summary.length;
  const completed = summary.filter(a => a.completed).length;
  const claimed = summary.filter(a => a.claimed).length;
  const pending = summary.filter(a => a.completed && !a.claimed).length;
  
  res.json({
    success: true,
    achievements: summary,
    stats: { total, completed, claimed, pending }
  });
});

// 手动触发成就检测（供其他后端服务调用）
router.post('/trigger', (req, res) => {
  const { userId, trigger, value, extra } = req.body;
  
  if (!achievementTrigger) {
    return res.json({ success: false, message: '成就触发服务不可用' });
  }
  
  if (!userId || !trigger) {
    return res.json({ success: false, message: '缺少必要参数 userId 或 trigger' });
  }
  
  const results = achievementTrigger.triggerAchievement(userId, trigger, value || 0, extra || {});
  const notifications = achievementTrigger.popNotifications(userId);
  
  res.json({
    success: true,
    newlyCompleted: results.map(a => ({ id: a.id, name: a.name, desc: a.desc, reward: a.reward })),
    notifications
  });
});

// 领取奖励（新版，支持后端触发服务）
router.post('/claim', (req, res) => {
  const { userId, achievementId } = req.body;
  
  // 优先使用后端触发服务
  if (achievementTrigger) {
    const claimed = achievementTrigger.claimAchievement(userId, achievementId);
    if (!claimed) {
      return res.json({ success: false, message: '成就未完成或奖励已领取' });
    }
    
    // 查找成就定义获取奖励
    const def = achievementTrigger.ACHIEVEMENT_DEFINITIONS[achievementId];
    if (def && playerRef) {
      if (def.reward.spiritStones) playerRef.lingshi = (playerRef.lingshi || 0) + def.reward.spiritStones;
      if (def.reward.diamonds) playerRef.diamonds = (playerRef.diamonds || 0) + def.reward.diamonds;
    }
    
    return res.json({
      success: true,
      reward: def?.reward || {},
      message: `领取成功！奖励：${def?.reward?.spiritStones || 0}灵石，${def?.reward?.diamonds || 0}钻石`
    });
  }
  
  // 回退到原有逻辑
  const achievement = achievementTemplates.find(a => a.id === achievementId);
  const userAch = userAchievements[userId]?.[achievementId];
  
  if (!achievement || !userAch) {
    return res.json({ success: false, message: '成就不存在' });
  }
  if (!userAch.completed) {
    return res.json({ success: false, message: '成就未完成' });
  }
  if (userAch.claimed) {
    return res.json({ success: false, message: '奖励已领取' });
  }
  
  userAch.claimed = true;
  saveAchievementToDB(userId, achievementId, userAch.progress, userAch.completed, true);
  
  if (playerRef) {
    if (achievement.reward.diamonds) playerRef.diamonds += achievement.reward.diamonds;
    if (achievement.reward.lingshi) playerRef.lingshi += achievement.reward.lingshi;
  }
  
  res.json({
    success: true,
    reward: achievement.reward,
    diamonds: playerRef ? playerRef.diamonds : null,
    lingshi: playerRef ? playerRef.lingshi : null,
    message: `成就达成！获得${achievement.reward.diamonds || 0}钻石, ${achievement.reward.lingshi || 0}灵石`
  });
});

module.exports = router;
