const express = require('express');
const router = express.Router();

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

// 用户成就进度
let userAchievements = {};

// 获取用户成就列表
router.get('/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  
  if (!userAchievements[userId]) {
    userAchievements[userId] = {};
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
    
    userAchievements[userId][ach.id].progress = value;
    
    if (value >= ach.target) {
      userAchievements[userId][ach.id].completed = true;
    }
  });
  
  res.json({ success: true });
});

// 领取成就奖励
router.post('/claim', (req, res) => {
  const { userId, achievementId } = req.body;
  
  if (!userAchievements[userId]) {
    userAchievements[userId] = {};
  }
  
  const achievement = achievementTemplates.find(a => a.id === achievementId);
  const userAch = userAchievements[userId][achievementId];
  
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
  
  res.json({
    success: true,
    reward: achievement.reward,
    message: `成就达成！获得${achievement.reward.diamonds || 0}钻石, ${achievement.reward.lingshi || 0}灵石`
  });
});

module.exports = router;
