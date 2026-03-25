const express = require('express');
const router = express.Router();

// 每日任务配置（奖励提升3-5倍）
const questTemplates = [
  // 修炼类
  { id: 1, type: 'cultivate', name: '修炼时长', desc: '修炼10分钟', target: 10, unit: '分钟', reward: { lingshi: 500, exp: 200 }, difficulty: 1 },
  { id: 2, type: 'cultivate', name: '专注修炼', desc: '修炼30分钟', target: 30, unit: '分钟', reward: { lingshi: 1500, exp: 600 }, difficulty: 2 },
  { id: 3, type: 'cultivate', name: '刻苦修炼', desc: '修炼60分钟', target: 60, unit: '分钟', reward: { lingshi: 3000, exp: 1200 }, difficulty: 3 },
  
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

// 用户任务进度
let userQuests = {};

// 初始化用户每日任务
function initDailyQuests(userId) {
  const today = new Date().toDateString();
  
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
  const data = initDailyQuests(userId);
  
  // 找出所有相关任务
  const relatedQuests = questTemplates.filter(q => q.type === type);
  
  relatedQuests.forEach(quest => {
    if (data.quests[quest.id] && !data.quests[quest.id].claimed) {
      data.quests[quest.id].progress += amount;
      
      if (data.quests[quest.id].progress >= quest.target) {
        data.quests[quest.id].completed = true;
      }
    }
  });
  
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

module.exports = router;
