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
  initDB();
  loadFromDB();
} catch (e) {
  console.log('[dailyQuest] DB连接失败:', e.message);
  db = null;
}

function initDB() {
  if (!db) return;
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS daily_quest_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        quest_id INTEGER NOT NULL,
        progress INTEGER DEFAULT 0,
        completed INTEGER DEFAULT 0,
        claimed INTEGER DEFAULT 0,
        quest_date TEXT NOT NULL,
        UNIQUE(user_id, quest_id, quest_date)
      )
    `);
    console.log('[dailyQuest] daily_quest_progress 表初始化完成');
  } catch (e) {
    console.error('[dailyQuest] 建表失败:', e.message);
  }
}

function loadFromDB() {
  if (!db) return;
  try {
    const today = getShanghaiDate();
    const rows = db.prepare('SELECT * FROM daily_quest_progress WHERE quest_date = ?').all(today);
    rows.forEach(row => {
      if (!userQuests[row.user_id]) userQuests[row.user_id] = { date: today, quests: {} };
      userQuests[row.user_id].quests[row.quest_id] = {
        progress: row.progress,
        completed: !!row.completed,
        claimed: !!row.claimed
      };
    });
    console.log(`[dailyQuest] 从DB加载了 ${rows.length} 条每日任务进度`);
  } catch (e) {
    console.error('[dailyQuest] 加载失败:', e.message);
  }
}

function saveQuestToDB(userId, questId, progress, completed, claimed) {
  if (!db) return;
  try {
    const today = getShanghaiDate();
    db.prepare(`
      INSERT OR REPLACE INTO daily_quest_progress (user_id, quest_id, progress, completed, claimed, quest_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, questId, progress, completed ? 1 : 0, claimed ? 1 : 0, today);
  } catch (e) {
    console.error('[dailyQuest] 保存失败:', e.message);
  }
}

// 每日任务配置（奖励提升3-5倍）
const questTemplates = [
  // 修炼类（target改为次数，delta=1对应1次修炼）
  { id: 1, type: 'cultivate', name: '修炼时长', desc: '完成1次修炼', target: 1, unit: '次', reward: { lingshi: 500, exp: 200 }, difficulty: 1 },
  { id: 2, type: 'cultivate', name: '专注修炼', desc: '完成3次修炼', target: 3, unit: '次', reward: { lingshi: 1500, exp: 600 }, difficulty: 2 },
  { id: 3, type: 'cultivate', name: '刻苦修炼', desc: '完成6次修炼', target: 6, unit: '次', reward: { lingshi: 3000, exp: 1200 }, difficulty: 3 },

  // 战斗类
  { id: 4, type: 'battle', name: '初战告捷', desc: '完成1次战斗', target: 1, unit: '次', reward: { lingshi: 200, exp: 100 }, difficulty: 1 },
  { id: 5, type: 'battle', name: '战斗达人', desc: '完成10次战斗', target: 10, unit: '次', reward: { lingshi: 2000, exp: 800 }, difficulty: 2 },
  { id: 6, type: 'battle', name: '战斗大师', desc: '完成30次战斗', target: 30, unit: '次', reward: { lingshi: 6000, exp: 2400 }, difficulty: 3 },

  // 副本类
  { id: 7, type: 'chapter', name: '初试身手', desc: '通关第1章', target: 1, unit: '章', reward: { lingshi: 500, exp: 300 }, difficulty: 1 },
  { id: 8, type: 'chapter', name: '小试牛刀', desc: '通关第5章', target: 5, unit: '章', reward: { lingshi: 2500, exp: 1500 }, difficulty: 2 },
  { id: 9, type: 'chapter', name: '章节通关', desc: '通关第10章', target: 10, unit: '章', reward: { lingshi: 5000, exp: 3000 }, difficulty: 3 },

  // 消费类
  { id: 10, type: 'shop', name: '消费达人', desc: '消费100灵石', target: 100, unit: '灵石', reward: { diamonds: 30 }, difficulty: 1 },
  { id: 11, type: 'shop', name: '购物狂人', desc: '消费500灵石', target: 500, unit: '灵石', reward: { diamonds: 150 }, difficulty: 2 },

  // 社交类
  { id: 12, type: 'friend', name: '结识好友', desc: '添加1个好友', target: 1, unit: '人', reward: { lingshi: 200 }, difficulty: 1 },

  // 装备类
  { id: 13, type: 'equipment', name: '装备强化', desc: '强化装备1次', target: 1, unit: '次', reward: { lingshi: 300, exp: 150 }, difficulty: 1 },
  { id: 14, type: 'equipment', name: '装备进阶', desc: '强化装备5次', target: 5, unit: '次', reward: { lingshi: 1500, exp: 750 }, difficulty: 2 }
];

// 用户任务进度（内存）
let userQuests = {};

// 初始化用户每日任务
// 获取上海时间日期字符串
function getShanghaiDate() {
  const d = new Date(Date.now() + 8 * 3600000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function initDailyQuests(userId) {
  const today = getShanghaiDate();

  if (!userQuests[userId]) {
    userQuests[userId] = {
      date: today,
      quests: {}
    };
  }

  // 新的一天，重置任务
  if (userQuests[userId].date !== today) {
    userQuests[userId] = {
      date: today,
      quests: {}
    };
  }

  // 初始化未完成的每日任务
  questTemplates.forEach(quest => {
    if (!userQuests[userId].quests[quest.id]) {
      userQuests[userId].quests[quest.id] = {
        questId: quest.id,
        progress: 0,
        completed: false,
        claimed: false
      };
    }
  });

  return userQuests[userId];
}

// 事件驱动：更新任务进度（供外部调用）
function updateDailyQuestProgress(userId, type, delta) {
  const data = initDailyQuests(userId);
  const relatedQuests = questTemplates.filter(q => q.type === type);
  let updated = false;

  relatedQuests.forEach(quest => {
    const userQ = data.quests[quest.id];
    if (userQ && !userQ.claimed) {
      userQ.progress = Math.min(userQ.progress + delta, quest.target);
      if (userQ.progress >= quest.target) {
        userQ.completed = true;
      }
      saveQuestToDB(userId, quest.id, userQ.progress, userQ.completed, userQ.claimed);
      updated = true;
    }
  });

  return updated;
}

// 获取每日任务概览（根路径）
router.get('/', (req, res) => {
  const quests = questTemplates;

  // 按难度分类统计
  const daily = quests.filter(q => q.difficulty === 1);
  const weekly = quests.filter(q => q.difficulty === 2);
  const challenge = quests.filter(q => q.difficulty === 3);

  res.json({
    success: true,
    data: {
      totalQuests: quests.length,
      categories: {
        daily: { name: '每日任务', count: daily.length, rewards: daily.map(q => ({ id: q.id, name: q.name, desc: q.desc, target: q.target, unit: q.unit, reward: q.reward })) },
        weekly: { name: '每周任务', count: weekly.length, rewards: weekly.map(q => ({ id: q.id, name: q.name, desc: q.desc, target: q.target, unit: q.unit, reward: q.reward })) },
        challenge: { name: '挑战任务', count: challenge.length, rewards: challenge.map(q => ({ id: q.id, name: q.name, desc: q.desc, target: q.target, unit: q.unit, reward: q.reward })) }
      }
    }
  });
});

// 获取每日任务列表
router.get('/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  const data = initDailyQuests(userId);
  
  const quests = questTemplates.map(quest => {
    const userQuest = data.quests[quest.id] || { progress: 0, completed: false, claimed: false };
    return {
      ...quest,
      progress: userQuest.progress,
      completed: userQuest.completed,
      claimed: userQuest.claimed
    };
  });
  
  // 按难度分类
  const daily = quests.filter(q => q.difficulty === 1);
  const weekly = quests.filter(q => q.difficulty === 2);
  const challenge = quests.filter(q => q.difficulty === 3);
  
  res.json({
    date: data.date,
    daily,
    weekly,
    challenge,
    totalProgress: quests.filter(q => q.completed && q.claimed).length,
    totalQuests: quests.length
  });
});

// 更新任务进度
router.post('/update', (req, res) => {
  const { userId, type, amount } = req.body;
  updateDailyQuestProgress(userId, type, amount);
  const data = initDailyQuests(userId);
  res.json({ success: true, quests: data.quests });
});

// 统一事件入口：将游戏事件映射到任务进度
router.post('/event', (req, res) => {
  const { userId, event, value } = req.body;
  if (!userId || !event) {
    return res.json({ success: false, message: '缺少 userId 或 event 参数' });
  }

  // 事件 → 任务类型 + delta 映射表
  const eventMap = {
    'cultivation_complete': { type: 'cultivate', delta: 1 },
    'battle_win':           { type: 'battle',    delta: 1 },
    'chapter_complete':     { type: 'chapter',   delta: 1 },
    'shop_buy':             { type: 'shop',      delta: value || 1 },
    'equipment_enhance':    { type: 'equipment', delta: 1 },
    'friend_add':           { type: 'friend',     delta: 1 },
  };

  const mapping = eventMap[event];
  if (!mapping) {
    return res.json({ success: false, message: `未知事件: ${event}` });
  }

  const updated = updateDailyQuestProgress(userId, mapping.type, mapping.delta);
  const data = initDailyQuests(userId);

  // 返回当前事件相关的任务进度
  const relatedQuests = questTemplates
    .filter(q => q.type === mapping.type)
    .map(q => {
      const uq = data.quests[q.id] || { progress: 0, completed: false, claimed: false };
      return { id: q.id, name: q.name, progress: uq.progress, target: q.target, completed: uq.completed, claimed: uq.claimed };
    });

  res.json({ success: true, event, type: mapping.type, delta: mapping.delta, updated, relatedQuests });
});

// 更新任务进度 (update-progress 别名)
router.post('/update-progress', (req, res) => {
  const { userId, type, amount } = req.body;
  updateDailyQuestProgress(userId, type, amount);
  const data = initDailyQuests(userId);
  res.json({ success: true, quests: data.quests });
});

// 领取任务奖励
router.post('/claim', (req, res) => {
  const { userId, questId } = req.body;
  const data = initDailyQuests(userId);

  const quest = questTemplates.find(q => q.id === questId);
  const userQuest = data.quests[questId];
  
  if (!quest || !userQuest) {
    return res.json({ success: false, message: '任务不存在' });
  }
  
  if (!userQuest.completed) {
    return res.json({ success: false, message: '任务未完成' });
  }
  
  if (userQuest.claimed) {
    return res.json({ success: false, message: '奖励已领取' });
  }
  
  userQuest.claimed = true;
  saveQuestToDB(userId, questId, userQuest.progress, userQuest.completed, userQuest.claimed);

  res.json({
    success: true,
    reward: quest.reward,
    message: `获得${quest.reward.lingshi || 0}灵石, ${quest.reward.exp || 0}经验`
  });
});

// 快速完成所有任务(测试用)
router.post('/complete-all', (req, res) => {
  const { userId } = req.body;
  const data = initDailyQuests(userId);
  
  questTemplates.forEach(quest => {
    if (data.quests[quest.id]) {
      data.quests[quest.id].progress = quest.target;
      data.quests[quest.id].completed = true;
    }
  });
  
  res.json({ success: true, message: '所有任务已完成' });
});

// 导出 updateDailyQuestProgress 供其他模块调用
router.updateDailyQuestProgress = updateDailyQuestProgress;

module.exports = router;
